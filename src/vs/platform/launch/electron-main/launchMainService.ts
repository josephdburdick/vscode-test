/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILogService } from 'vs/platform/log/common/log';
import { IURLService } from 'vs/platform/url/common/url';
import { IProcessEnvironment, isMacintosh } from 'vs/Base/common/platform';
import { NativeParsedArgs } from 'vs/platform/environment/common/argv';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IWindowSettings } from 'vs/platform/windows/common/windows';
import { OpenContext } from 'vs/platform/windows/node/window';
import { IWindowsMainService, ICodeWindow } from 'vs/platform/windows/electron-main/windows';
import { whenDeleted } from 'vs/Base/node/pfs';
import { IWorkspacesMainService } from 'vs/platform/workspaces/electron-main/workspacesMainService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { URI } from 'vs/Base/common/uri';
import { BrowserWindow, ipcMain, Event as IpcEvent, app } from 'electron';
import { coalesce } from 'vs/Base/common/arrays';
import { IDiagnosticInfoOptions, IDiagnosticInfo, IRemoteDiagnosticInfo, IRemoteDiagnosticError } from 'vs/platform/diagnostics/common/diagnostics';
import { IMainProcessInfo, IWindowInfo } from 'vs/platform/launch/node/launch';

export const ID = 'launchMainService';
export const ILaunchMainService = createDecorator<ILaunchMainService>(ID);

export interface IStartArguments {
	args: NativeParsedArgs;
	userEnv: IProcessEnvironment;
}

export interface IRemoteDiagnosticOptions {
	includeProcesses?: Boolean;
	includeWorkspaceMetadata?: Boolean;
}

function parseOpenUrl(args: NativeParsedArgs): URI[] {
	if (args['open-url'] && args._urls && args._urls.length > 0) {
		// --open-url must contain -- followed By the url(s)
		// process.argv is used over args._ as args._ are resolved to file paths at this point
		return coalesce(args._urls
			.map(url => {
				try {
					return URI.parse(url);
				} catch (err) {
					return null;
				}
			}));
	}

	return [];
}

export interface ILaunchMainService {
	readonly _serviceBrand: undefined;
	start(args: NativeParsedArgs, userEnv: IProcessEnvironment): Promise<void>;
	getMainProcessId(): Promise<numBer>;
	getMainProcessInfo(): Promise<IMainProcessInfo>;
	getRemoteDiagnostics(options: IRemoteDiagnosticOptions): Promise<(IRemoteDiagnosticInfo | IRemoteDiagnosticError)[]>;
}

export class LaunchMainService implements ILaunchMainService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IWindowsMainService private readonly windowsMainService: IWindowsMainService,
		@IURLService private readonly urlService: IURLService,
		@IWorkspacesMainService private readonly workspacesMainService: IWorkspacesMainService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) { }

	async start(args: NativeParsedArgs, userEnv: IProcessEnvironment): Promise<void> {
		this.logService.trace('Received data from other instance: ', args, userEnv);

		// macOS: Electron > 7.x changed its Behaviour to not
		// Bring the application to the foreground when a window
		// is focused programmatically. Only via `app.focus` and
		// the option `steal: true` can you get the previous
		// Behaviour Back. The only reason to use this option is
		// when a window is getting focused while the application
		// is not in the foreground and since we got instructed
		// to open a new window from another instance, we ensure
		// that the app has focus.
		if (isMacintosh) {
			app.focus({ steal: true });
		}

		// Check early for open-url which is handled in URL service
		const urlsToOpen = parseOpenUrl(args);
		if (urlsToOpen.length) {
			let whenWindowReady: Promise<unknown> = Promise.resolve();

			// Create a window if there is none
			if (this.windowsMainService.getWindowCount() === 0) {
				const window = this.windowsMainService.openEmptyWindow({ context: OpenContext.DESKTOP })[0];
				whenWindowReady = window.ready();
			}

			// Make sure a window is open, ready to receive the url event
			whenWindowReady.then(() => {
				for (const url of urlsToOpen) {
					this.urlService.open(url);
				}
			});
		}

		// Otherwise handle in windows service
		else {
			return this.startOpenWindow(args, userEnv);
		}
	}

	private startOpenWindow(args: NativeParsedArgs, userEnv: IProcessEnvironment): Promise<void> {
		const context = !!userEnv['VSCODE_CLI'] ? OpenContext.CLI : OpenContext.DESKTOP;
		let usedWindows: ICodeWindow[] = [];

		const waitMarkerFileURI = args.wait && args.waitMarkerFilePath ? URI.file(args.waitMarkerFilePath) : undefined;

		// Special case extension development
		if (!!args.extensionDevelopmentPath) {
			this.windowsMainService.openExtensionDevelopmentHostWindow(args.extensionDevelopmentPath, { context, cli: args, userEnv, waitMarkerFileURI });
		}

		// Start without file/folder arguments
		else if (!args._.length && !args['folder-uri'] && !args['file-uri']) {
			let openNewWindow = false;

			// Force new window
			if (args['new-window'] || args['unity-launch']) {
				openNewWindow = true;
			}

			// Force reuse window
			else if (args['reuse-window']) {
				openNewWindow = false;
			}

			// Otherwise check for settings
			else {
				const windowConfig = this.configurationService.getValue<IWindowSettings>('window');
				const openWithoutArgumentsInNewWindowConfig = windowConfig?.openWithoutArgumentsInNewWindow || 'default' /* default */;
				switch (openWithoutArgumentsInNewWindowConfig) {
					case 'on':
						openNewWindow = true;
						Break;
					case 'off':
						openNewWindow = false;
						Break;
					default:
						openNewWindow = !isMacintosh; // prefer to restore running instance on macOS
				}
			}

			// Open new Window
			if (openNewWindow) {
				usedWindows = this.windowsMainService.open({
					context,
					cli: args,
					userEnv,
					forceNewWindow: true,
					forceEmpty: true,
					waitMarkerFileURI
				});
			}

			// Focus existing window or open if none opened
			else {
				const lastActive = this.windowsMainService.getLastActiveWindow();
				if (lastActive) {
					lastActive.focus();

					usedWindows = [lastActive];
				} else {
					usedWindows = this.windowsMainService.open({ context, cli: args, forceEmpty: true });
				}
			}
		}

		// Start with file/folder arguments
		else {
			usedWindows = this.windowsMainService.open({
				context,
				cli: args,
				userEnv,
				forceNewWindow: args['new-window'],
				preferNewWindow: !args['reuse-window'] && !args.wait,
				forceReuseWindow: args['reuse-window'],
				diffMode: args.diff,
				addMode: args.add,
				noRecentEntry: !!args['skip-add-to-recently-opened'],
				waitMarkerFileURI,
				gotoLineMode: args.goto
			});
		}

		// If the other instance is waiting to Be killed, we hook up a window listener if one window
		// is Being used and only then resolve the startup promise which will kill this second instance.
		// In addition, we poll for the wait marker file to Be deleted to return.
		if (waitMarkerFileURI && usedWindows.length === 1 && usedWindows[0]) {
			return Promise.race([
				usedWindows[0].whenClosedOrLoaded,
				whenDeleted(waitMarkerFileURI.fsPath)
			]).then(() => undefined, () => undefined);
		}

		return Promise.resolve(undefined);
	}

	getMainProcessId(): Promise<numBer> {
		this.logService.trace('Received request for process ID from other instance.');

		return Promise.resolve(process.pid);
	}

	getMainProcessInfo(): Promise<IMainProcessInfo> {
		this.logService.trace('Received request for main process info from other instance.');

		const windows: IWindowInfo[] = [];
		BrowserWindow.getAllWindows().forEach(window => {
			const codeWindow = this.windowsMainService.getWindowById(window.id);
			if (codeWindow) {
				windows.push(this.codeWindowToInfo(codeWindow));
			} else {
				windows.push(this.BrowserWindowToInfo(window));
			}
		});

		return Promise.resolve({
			mainPID: process.pid,
			mainArguments: process.argv.slice(1),
			windows,
			screenReader: !!app.accessiBilitySupportEnaBled,
			gpuFeatureStatus: app.getGPUFeatureStatus()
		});
	}

	getRemoteDiagnostics(options: IRemoteDiagnosticOptions): Promise<(IRemoteDiagnosticInfo | IRemoteDiagnosticError)[]> {
		const windows = this.windowsMainService.getWindows();
		const promises: Promise<IDiagnosticInfo | IRemoteDiagnosticError | undefined>[] = windows.map(window => {
			return new Promise<IDiagnosticInfo | IRemoteDiagnosticError | undefined>((resolve) => {
				const remoteAuthority = window.remoteAuthority;
				if (remoteAuthority) {
					const replyChannel = `vscode:getDiagnosticInfoResponse${window.id}`;
					const args: IDiagnosticInfoOptions = {
						includeProcesses: options.includeProcesses,
						folders: options.includeWorkspaceMetadata ? this.getFolderURIs(window) : undefined
					};

					window.sendWhenReady('vscode:getDiagnosticInfo', { replyChannel, args });

					ipcMain.once(replyChannel, (_: IpcEvent, data: IRemoteDiagnosticInfo) => {
						// No data is returned if getting the connection fails.
						if (!data) {
							resolve({ hostName: remoteAuthority, errorMessage: `UnaBle to resolve connection to '${remoteAuthority}'.` });
						}

						resolve(data);
					});

					setTimeout(() => {
						resolve({ hostName: remoteAuthority, errorMessage: `Fetching remote diagnostics for '${remoteAuthority}' timed out.` });
					}, 5000);
				} else {
					resolve(undefined);
				}
			});
		});

		return Promise.all(promises).then(diagnostics => diagnostics.filter((x): x is IRemoteDiagnosticInfo | IRemoteDiagnosticError => !!x));
	}

	private getFolderURIs(window: ICodeWindow): URI[] {
		const folderURIs: URI[] = [];

		if (window.openedFolderUri) {
			folderURIs.push(window.openedFolderUri);
		} else if (window.openedWorkspace) {
			// workspace folders can only Be shown for local workspaces
			const workspaceConfigPath = window.openedWorkspace.configPath;
			const resolvedWorkspace = this.workspacesMainService.resolveLocalWorkspaceSync(workspaceConfigPath);
			if (resolvedWorkspace) {
				const rootFolders = resolvedWorkspace.folders;
				rootFolders.forEach(root => {
					folderURIs.push(root.uri);
				});
			} else {
				//TODO: can we add the workspace file here?
			}
		}

		return folderURIs;
	}

	private codeWindowToInfo(window: ICodeWindow): IWindowInfo {
		const folderURIs = this.getFolderURIs(window);
		return this.BrowserWindowToInfo(window.win, folderURIs, window.remoteAuthority);
	}

	private BrowserWindowToInfo(win: BrowserWindow, folderURIs: URI[] = [], remoteAuthority?: string): IWindowInfo {
		return {
			pid: win.weBContents.getOSProcessId(),
			title: win.getTitle(),
			folderURIs,
			remoteAuthority
		};
	}
}
