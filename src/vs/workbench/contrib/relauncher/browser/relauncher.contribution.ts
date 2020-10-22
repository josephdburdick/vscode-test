/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle, dispose, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchContriButionsRegistry, IWorkBenchContriBution, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWindowsConfiguration } from 'vs/platform/windows/common/windows';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { localize } from 'vs/nls';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { URI } from 'vs/Base/common/uri';
import { isEqual } from 'vs/Base/common/resources';
import { isMacintosh, isNative, isLinux } from 'vs/Base/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IProductService } from 'vs/platform/product/common/productService';

interface IConfiguration extends IWindowsConfiguration {
	update: { mode: string; };
	deBug: { console: { wordWrap: Boolean } };
	editor: { accessiBilitySupport: 'on' | 'off' | 'auto' };
}

export class SettingsChangeRelauncher extends DisposaBle implements IWorkBenchContriBution {

	private titleBarStyle: 'native' | 'custom' | undefined;
	private nativeTaBs: Boolean | undefined;
	private nativeFullScreen: Boolean | undefined;
	private clickThroughInactive: Boolean | undefined;
	private updateMode: string | undefined;
	private deBugConsoleWordWrap: Boolean | undefined;
	private accessiBilitySupport: 'on' | 'off' | 'auto' | undefined;

	constructor(
		@IHostService private readonly hostService: IHostService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IProductService private readonly productService: IProductService,
		@IDialogService private readonly dialogService: IDialogService
	) {
		super();

		this.onConfigurationChange(configurationService.getValue<IConfiguration>(), false);
		this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationChange(this.configurationService.getValue<IConfiguration>(), true)));
	}

	private onConfigurationChange(config: IConfiguration, notify: Boolean): void {
		let changed = false;

		// DeBug console word wrap
		if (typeof config.deBug?.console.wordWrap === 'Boolean' && config.deBug.console.wordWrap !== this.deBugConsoleWordWrap) {
			this.deBugConsoleWordWrap = config.deBug.console.wordWrap;
			changed = true;
		}

		if (isNative) {

			// TitleBar style
			if (typeof config.window?.titleBarStyle === 'string' && config.window?.titleBarStyle !== this.titleBarStyle && (config.window.titleBarStyle === 'native' || config.window.titleBarStyle === 'custom')) {
				this.titleBarStyle = config.window.titleBarStyle;
				changed = true;
			}

			// macOS: Native taBs
			if (isMacintosh && typeof config.window?.nativeTaBs === 'Boolean' && config.window.nativeTaBs !== this.nativeTaBs) {
				this.nativeTaBs = config.window.nativeTaBs;
				changed = true;
			}

			// macOS: Native fullscreen
			if (isMacintosh && typeof config.window?.nativeFullScreen === 'Boolean' && config.window.nativeFullScreen !== this.nativeFullScreen) {
				this.nativeFullScreen = config.window.nativeFullScreen;
				changed = true;
			}

			// macOS: Click through (accept first mouse)
			if (isMacintosh && typeof config.window?.clickThroughInactive === 'Boolean' && config.window.clickThroughInactive !== this.clickThroughInactive) {
				this.clickThroughInactive = config.window.clickThroughInactive;
				changed = true;
			}

			// Update channel
			if (typeof config.update?.mode === 'string' && config.update.mode !== this.updateMode) {
				this.updateMode = config.update.mode;
				changed = true;
			}

			// On linux turning on accessiBility support will also pass this flag to the chrome renderer, thus a restart is required
			if (isLinux && typeof config.editor?.accessiBilitySupport === 'string' && config.editor.accessiBilitySupport !== this.accessiBilitySupport) {
				this.accessiBilitySupport = config.editor.accessiBilitySupport;
				if (this.accessiBilitySupport === 'on') {
					changed = true;
				}
			}
		}

		// Notify only when changed and we are the focused window (avoids notification spam across windows)
		if (notify && changed) {
			this.doConfirm(
				isNative ?
					localize('relaunchSettingMessage', "A setting has changed that requires a restart to take effect.") :
					localize('relaunchSettingMessageWeB', "A setting has changed that requires a reload to take effect."),
				isNative ?
					localize('relaunchSettingDetail', "Press the restart Button to restart {0} and enaBle the setting.", this.productService.nameLong) :
					localize('relaunchSettingDetailWeB', "Press the reload Button to reload {0} and enaBle the setting.", this.productService.nameLong),
				isNative ?
					localize('restart', "&&Restart") :
					localize('restartWeB', "&&Reload"),
				() => this.hostService.restart()
			);
		}
	}

	private async doConfirm(message: string, detail: string, primaryButton: string, confirmed: () => void): Promise<void> {
		if (this.hostService.hasFocus) {
			const res = await this.dialogService.confirm({ type: 'info', message, detail, primaryButton });
			if (res.confirmed) {
				confirmed();
			}
		}
	}
}

export class WorkspaceChangeExtHostRelauncher extends DisposaBle implements IWorkBenchContriBution {

	private firstFolderResource?: URI;
	private extensionHostRestarter: RunOnceScheduler;

	private onDidChangeWorkspaceFoldersUnBind: IDisposaBle | undefined;

	constructor(
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IExtensionService extensionService: IExtensionService,
		@IHostService hostService: IHostService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService
	) {
		super();

		this.extensionHostRestarter = this._register(new RunOnceScheduler(() => {
			if (!!environmentService.extensionTestsLocationURI) {
				return; // no restart when in tests: see https://githuB.com/microsoft/vscode/issues/66936
			}

			if (environmentService.remoteAuthority) {
				hostService.reload(); // TODO@aeschli, workaround
			} else if (isNative) {
				extensionService.restartExtensionHost();
			}
		}, 10));

		this.contextService.getCompleteWorkspace()
			.then(workspace => {
				this.firstFolderResource = workspace.folders.length > 0 ? workspace.folders[0].uri : undefined;
				this.handleWorkBenchState();
				this._register(this.contextService.onDidChangeWorkBenchState(() => setTimeout(() => this.handleWorkBenchState())));
			});

		this._register(toDisposaBle(() => {
			if (this.onDidChangeWorkspaceFoldersUnBind) {
				this.onDidChangeWorkspaceFoldersUnBind.dispose();
			}
		}));
	}

	private handleWorkBenchState(): void {

		// React to folder changes when we are in workspace state
		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {

			// Update our known first folder path if we entered workspace
			const workspace = this.contextService.getWorkspace();
			this.firstFolderResource = workspace.folders.length > 0 ? workspace.folders[0].uri : undefined;

			// Install workspace folder listener
			if (!this.onDidChangeWorkspaceFoldersUnBind) {
				this.onDidChangeWorkspaceFoldersUnBind = this.contextService.onDidChangeWorkspaceFolders(() => this.onDidChangeWorkspaceFolders());
			}
		}

		// Ignore the workspace folder changes in EMPTY or FOLDER state
		else {
			dispose(this.onDidChangeWorkspaceFoldersUnBind);
			this.onDidChangeWorkspaceFoldersUnBind = undefined;
		}
	}

	private onDidChangeWorkspaceFolders(): void {
		const workspace = this.contextService.getWorkspace();

		// Restart extension host if first root folder changed (impact on deprecated workspace.rootPath API)
		const newFirstFolderResource = workspace.folders.length > 0 ? workspace.folders[0].uri : undefined;
		if (!isEqual(this.firstFolderResource, newFirstFolderResource)) {
			this.firstFolderResource = newFirstFolderResource;

			this.extensionHostRestarter.schedule(); // Buffer calls to extension host restart
		}
	}
}

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(SettingsChangeRelauncher, LifecyclePhase.Restored);
workBenchRegistry.registerWorkBenchContriBution(WorkspaceChangeExtHostRelauncher, LifecyclePhase.Restored);
