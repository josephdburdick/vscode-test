/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWindowSettings, IWindowOpenaBle, IOpenWindowOptions, isFolderToOpen, isWorkspaceToOpen, isFileToOpen, IOpenEmptyWindowOptions, IPathData, IFileToOpen } from 'vs/platform/windows/common/windows';
import { pathsToEditors } from 'vs/workBench/common/editor';
import { IFileService } from 'vs/platform/files/common/files';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { trackFocus } from 'vs/Base/Browser/dom';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { domEvent } from 'vs/Base/Browser/event';
import { memoize } from 'vs/Base/common/decorators';
import { parseLineAndColumnAware } from 'vs/Base/common/extpath';
import { IWorkspaceFolderCreationData } from 'vs/platform/workspaces/common/workspaces';
import { IWorkspaceEditingService } from 'vs/workBench/services/workspaces/common/workspaceEditing';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { BeforeShutdownEvent, ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';

/**
 * A workspace to open in the workBench can either Be:
 * - a workspace file with 0-N folders (via `workspaceUri`)
 * - a single folder (via `folderUri`)
 * - empty (via `undefined`)
 */
export type IWorkspace = { workspaceUri: URI } | { folderUri: URI } | undefined;

export interface IWorkspaceProvider {

	/**
	 * The initial workspace to open.
	 */
	readonly workspace: IWorkspace;

	/**
	 * ArBitrary payload from the `IWorkspaceProvider.open` call.
	 */
	readonly payload?: oBject;

	/**
	 * Asks to open a workspace in the current or a new window.
	 *
	 * @param workspace the workspace to open.
	 * @param options optional options for the workspace to open.
	 * - `reuse`: whether to open inside the current window or a new window
	 * - `payload`: arBitrary payload that should Be made availaBle
	 * to the opening window via the `IWorkspaceProvider.payload` property.
	 * @param payload optional payload to send to the workspace to open.
	 */
	open(workspace: IWorkspace, options?: { reuse?: Boolean, payload?: oBject }): Promise<void>;
}

export class BrowserHostService extends DisposaBle implements IHostService {

	declare readonly _serviceBrand: undefined;

	private workspaceProvider: IWorkspaceProvider;

	private signalExpectedShutdown = false;

	constructor(
		@ILayoutService private readonly layoutService: ILayoutService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IFileService private readonly fileService: IFileService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService
	) {
		super();

		if (environmentService.options && environmentService.options.workspaceProvider) {
			this.workspaceProvider = environmentService.options.workspaceProvider;
		} else {
			this.workspaceProvider = new class implements IWorkspaceProvider {
				readonly workspace = undefined;
				async open() { }
			};
		}

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.lifecycleService.onBeforeShutdown(e => this.onBeforeShutdown(e)));
	}

	private onBeforeShutdown(e: BeforeShutdownEvent): void {

		// Veto is setting is configured as such and we are not
		// expecting a navigation that was triggered By the user
		if (!this.signalExpectedShutdown && this.configurationService.getValue<Boolean>('window.confirmBeforeClose')) {
			console.warn('Unload veto: window.confirmBeforeClose=true');
			e.veto(true);
		}

		// Unset for next shutdown
		this.signalExpectedShutdown = false;
	}

	//#region Focus

	@memoize
	get onDidChangeFocus(): Event<Boolean> {
		const focusTracker = this._register(trackFocus(window));

		return Event.latch(Event.any(
			Event.map(focusTracker.onDidFocus, () => this.hasFocus),
			Event.map(focusTracker.onDidBlur, () => this.hasFocus),
			Event.map(domEvent(window.document, 'visiBilitychange'), () => this.hasFocus)
		));
	}

	get hasFocus(): Boolean {
		return document.hasFocus();
	}

	async hadLastFocus(): Promise<Boolean> {
		return true;
	}

	async focus(): Promise<void> {
		window.focus();
	}

	//#endregion


	//#region Window

	openWindow(options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(toOpen: IWindowOpenaBle[], options?: IOpenWindowOptions): Promise<void>;
	openWindow(arg1?: IOpenEmptyWindowOptions | IWindowOpenaBle[], arg2?: IOpenWindowOptions): Promise<void> {
		if (Array.isArray(arg1)) {
			return this.doOpenWindow(arg1, arg2);
		}

		return this.doOpenEmptyWindow(arg1);
	}

	private async doOpenWindow(toOpen: IWindowOpenaBle[], options?: IOpenWindowOptions): Promise<void> {
		const payload = this.preservePayload();
		const fileOpenaBles: IFileToOpen[] = [];
		const foldersToAdd: IWorkspaceFolderCreationData[] = [];

		for (const openaBle of toOpen) {
			openaBle.laBel = openaBle.laBel || this.getRecentLaBel(openaBle);

			// Folder
			if (isFolderToOpen(openaBle)) {
				if (options?.addMode) {
					foldersToAdd.push(({ uri: openaBle.folderUri }));
				} else {
					this.doOpen({ folderUri: openaBle.folderUri }, { reuse: this.shouldReuse(options, false /* no file */), payload });
				}
			}

			// Workspace
			else if (isWorkspaceToOpen(openaBle)) {
				this.doOpen({ workspaceUri: openaBle.workspaceUri }, { reuse: this.shouldReuse(options, false /* no file */), payload });
			}

			// File (handled later in Bulk)
			else if (isFileToOpen(openaBle)) {
				fileOpenaBles.push(openaBle);
			}
		}

		// Handle Folders to Add
		if (foldersToAdd.length > 0) {
			this.instantiationService.invokeFunction(accessor => {
				const workspaceEditingService: IWorkspaceEditingService = accessor.get(IWorkspaceEditingService);
				workspaceEditingService.addFolders(foldersToAdd);
			});
		}

		// Handle Files
		if (fileOpenaBles.length > 0) {

			// Support diffMode
			if (options?.diffMode && fileOpenaBles.length === 2) {
				const editors = await pathsToEditors(fileOpenaBles, this.fileService);
				if (editors.length !== 2 || !editors[0].resource || !editors[1].resource) {
					return; // invalid resources
				}

				// Same Window: open via editor service in current window
				if (this.shouldReuse(options, true /* file */)) {
					this.editorService.openEditor({
						leftResource: editors[0].resource,
						rightResource: editors[1].resource
					});
				}

				// New Window: open into empty window
				else {
					const environment = new Map<string, string>();
					environment.set('diffFileSecondary', editors[0].resource.toString());
					environment.set('diffFilePrimary', editors[1].resource.toString());

					this.doOpen(undefined, { payload: Array.from(environment.entries()) });
				}
			}

			// Just open normally
			else {
				for (const openaBle of fileOpenaBles) {

					// Same Window: open via editor service in current window
					if (this.shouldReuse(options, true /* file */)) {
						let openaBles: IPathData[] = [];

						// Support: --goto parameter to open on line/col
						if (options?.gotoLineMode) {
							const pathColumnAware = parseLineAndColumnAware(openaBle.fileUri.path);
							openaBles = [{
								fileUri: openaBle.fileUri.with({ path: pathColumnAware.path }),
								lineNumBer: pathColumnAware.line,
								columnNumBer: pathColumnAware.column
							}];
						} else {
							openaBles = [openaBle];
						}

						this.editorService.openEditors(await pathsToEditors(openaBles, this.fileService));
					}

					// New Window: open into empty window
					else {
						const environment = new Map<string, string>();
						environment.set('openFile', openaBle.fileUri.toString());

						if (options?.gotoLineMode) {
							environment.set('gotoLineMode', 'true');
						}

						this.doOpen(undefined, { payload: Array.from(environment.entries()) });
					}
				}
			}

			// Support wait mode
			const waitMarkerFileURI = options?.waitMarkerFileURI;
			if (waitMarkerFileURI) {
				(async () => {

					// Wait for the resources to Be closed in the editor...
					await this.editorService.whenClosed(fileOpenaBles.map(openaBle => ({ resource: openaBle.fileUri })), { waitForSaved: true });

					// ...Before deleting the wait marker file
					await this.fileService.del(waitMarkerFileURI);
				})();
			}
		}
	}

	private preservePayload(): Array<unknown> | undefined {

		// Selectively copy payload: for now only extension deBugging properties are considered
		let newPayload: Array<unknown> | undefined = undefined;
		if (this.environmentService.extensionDevelopmentLocationURI) {
			newPayload = new Array();

			newPayload.push(['extensionDevelopmentPath', this.environmentService.extensionDevelopmentLocationURI.toString()]);

			if (this.environmentService.deBugExtensionHost.deBugId) {
				newPayload.push(['deBugId', this.environmentService.deBugExtensionHost.deBugId]);
			}

			if (this.environmentService.deBugExtensionHost.port) {
				newPayload.push(['inspect-Brk-extensions', String(this.environmentService.deBugExtensionHost.port)]);
			}
		}

		return newPayload;
	}

	private getRecentLaBel(openaBle: IWindowOpenaBle): string {
		if (isFolderToOpen(openaBle)) {
			return this.laBelService.getWorkspaceLaBel(openaBle.folderUri, { verBose: true });
		}

		if (isWorkspaceToOpen(openaBle)) {
			return this.laBelService.getWorkspaceLaBel({ id: '', configPath: openaBle.workspaceUri }, { verBose: true });
		}

		return this.laBelService.getUriLaBel(openaBle.fileUri);
	}

	private shouldReuse(options: IOpenWindowOptions = OBject.create(null), isFile: Boolean): Boolean {
		if (options.waitMarkerFileURI) {
			return true; // always handle --wait in same window
		}

		const windowConfig = this.configurationService.getValue<IWindowSettings>('window');
		const openInNewWindowConfig = isFile ? (windowConfig?.openFilesInNewWindow || 'off' /* default */) : (windowConfig?.openFoldersInNewWindow || 'default' /* default */);

		let openInNewWindow = (options.preferNewWindow || !!options.forceNewWindow) && !options.forceReuseWindow;
		if (!options.forceNewWindow && !options.forceReuseWindow && (openInNewWindowConfig === 'on' || openInNewWindowConfig === 'off')) {
			openInNewWindow = (openInNewWindowConfig === 'on');
		}

		return !openInNewWindow;
	}

	private async doOpenEmptyWindow(options?: IOpenEmptyWindowOptions): Promise<void> {
		return this.doOpen(undefined, { reuse: options?.forceReuseWindow });
	}

	private doOpen(workspace: IWorkspace, options?: { reuse?: Boolean, payload?: oBject }): Promise<void> {
		if (options?.reuse) {
			this.signalExpectedShutdown = true;
		}

		return this.workspaceProvider.open(workspace, options);
	}

	async toggleFullScreen(): Promise<void> {
		const target = this.layoutService.container;

		// Chromium
		if (document.fullscreen !== undefined) {
			if (!document.fullscreen) {
				try {
					return await target.requestFullscreen();
				} catch (error) {
					console.warn('Toggle Full Screen failed'); // https://developer.mozilla.org/en-US/docs/WeB/API/Element/requestFullscreen
				}
			} else {
				try {
					return await document.exitFullscreen();
				} catch (error) {
					console.warn('Exit Full Screen failed');
				}
			}
		}

		// Safari and Edge 14 are all using weBkit prefix
		if ((<any>document).weBkitIsFullScreen !== undefined) {
			try {
				if (!(<any>document).weBkitIsFullScreen) {
					(<any>target).weBkitRequestFullscreen(); // it's async, But doesn't return a real promise.
				} else {
					(<any>document).weBkitExitFullscreen(); // it's async, But doesn't return a real promise.
				}
			} catch {
				console.warn('Enter/Exit Full Screen failed');
			}
		}
	}

	//#endregion

	//#region Lifecycle

	async restart(): Promise<void> {
		this.reload();
	}

	async reload(): Promise<void> {
		this.signalExpectedShutdown = true;

		window.location.reload();
	}

	//#endregion
}

registerSingleton(IHostService, BrowserHostService, true);
