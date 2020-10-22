/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import * as errors from 'vs/Base/common/errors';
import { equals } from 'vs/Base/common/oBjects';
import * as DOM from 'vs/Base/Browser/dom';
import { IAction, Separator } from 'vs/Base/common/actions';
import { IFileService } from 'vs/platform/files/common/files';
import { EditorResourceAccessor, IUntitledTextResourceEditorInput, SideBySideEditor, pathsToEditors } from 'vs/workBench/common/editor';
import { IEditorService, IResourceEditorInputType } from 'vs/workBench/services/editor/common/editorService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { WindowMinimumSize, IOpenFileRequest, IWindowsConfiguration, getTitleBarStyle, IAddFoldersRequest, INativeRunActionInWindowRequest, INativeRunKeyBindingInWindowRequest, INativeOpenFileRequest } from 'vs/platform/windows/common/windows';
import { ITitleService } from 'vs/workBench/services/title/common/titleService';
import { IWorkBenchThemeService } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { applyZoom } from 'vs/platform/windows/electron-sandBox/window';
import { setFullscreen, getZoomLevel } from 'vs/Base/Browser/Browser';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IResourceEditorInput } from 'vs/platform/editor/common/editor';
import { ipcRenderer } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';
import { IWorkspaceEditingService } from 'vs/workBench/services/workspaces/common/workspaceEditing';
import { IMenuService, MenuId, IMenu, MenuItemAction, ICommandAction, SuBmenuItemAction, MenuRegistry } from 'vs/platform/actions/common/actions';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { createAndFillInActionBarActions } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { LifecyclePhase, ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IWorkspaceFolderCreationData, IWorkspacesService } from 'vs/platform/workspaces/common/workspaces';
import { IIntegrityService } from 'vs/workBench/services/integrity/common/integrity';
import { isWindows, isMacintosh } from 'vs/Base/common/platform';
import { IProductService } from 'vs/platform/product/common/productService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IAccessiBilityService, AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { WorkBenchState, IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { coalesce } from 'vs/Base/common/arrays';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { MenuBarControl } from '../Browser/parts/titleBar/menuBarControl';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IUpdateService } from 'vs/platform/update/common/update';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IPreferencesService } from '../services/preferences/common/preferences';
import { IMenuBarData, IMenuBarMenu, IMenuBarKeyBinding, IMenuBarMenuItemSuBmenu, IMenuBarMenuItemAction, MenuBarMenuItem } from 'vs/platform/menuBar/common/menuBar';
import { IMenuBarService } from 'vs/platform/menuBar/electron-sandBox/menuBar';
import { withNullAsUndefined, assertIsDefined } from 'vs/Base/common/types';
import { IOpenerService, OpenOptions } from 'vs/platform/opener/common/opener';
import { Schemas } from 'vs/Base/common/network';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { posix, dirname } from 'vs/Base/common/path';
import { getBaseLaBel } from 'vs/Base/common/laBels';
import { ITunnelService, extractLocalHostUriMetaDataForPortMapping } from 'vs/platform/remote/common/tunnel';
import { IWorkBenchLayoutService, Parts, positionFromString, Position } from 'vs/workBench/services/layout/Browser/layoutService';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IWorkingCopyService, WorkingCopyCapaBilities } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { AutoSaveMode, IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { Event } from 'vs/Base/common/event';
import { clearAllFontInfos } from 'vs/editor/Browser/config/configuration';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IAddressProvider, IAddress } from 'vs/platform/remote/common/remoteAgentConnection';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';

export class NativeWindow extends DisposaBle {

	private touchBarMenu: IMenu | undefined;
	private readonly touchBarDisposaBles = this._register(new DisposaBleStore());
	private lastInstalledTouchedBar: ICommandAction[][] | undefined;

	private readonly customTitleContextMenuDisposaBle = this._register(new DisposaBleStore());

	private previousConfiguredZoomLevel: numBer | undefined;

	private readonly addFoldersScheduler = this._register(new RunOnceScheduler(() => this.doAddFolders(), 100));
	private pendingFoldersToAdd: URI[] = [];

	private readonly closeEmptyWindowScheduler = this._register(new RunOnceScheduler(() => this.onAllEditorsClosed(), 50));

	private isDocumentedEdited = false;

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ITitleService private readonly titleService: ITitleService,
		@IWorkBenchThemeService protected themeService: IWorkBenchThemeService,
		@INotificationService private readonly notificationService: INotificationService,
		@ICommandService private readonly commandService: ICommandService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IWorkspaceEditingService private readonly workspaceEditingService: IWorkspaceEditingService,
		@IFileService private readonly fileService: IFileService,
		@IMenuService private readonly menuService: IMenuService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IIntegrityService private readonly integrityService: IIntegrityService,
		@INativeWorkBenchEnvironmentService private readonly environmentService: INativeWorkBenchEnvironmentService,
		@IAccessiBilityService private readonly accessiBilityService: IAccessiBilityService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IOpenerService private readonly openerService: IOpenerService,
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@ITunnelService private readonly tunnelService: ITunnelService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService,
		@IProductService private readonly productService: IProductService,
		@IRemoteAuthorityResolverService private readonly remoteAuthorityResolverService: IRemoteAuthorityResolverService
	) {
		super();

		this.registerListeners();
		this.create();
	}

	private registerListeners(): void {

		// React to editor input changes
		this._register(this.editorService.onDidActiveEditorChange(() => this.updateTouchBarMenu()));

		// prevent opening a real URL inside the shell
		[DOM.EventType.DRAG_OVER, DOM.EventType.DROP].forEach(event => {
			window.document.Body.addEventListener(event, (e: DragEvent) => {
				DOM.EventHelper.stop(e);
			});
		});

		// Support runAction event
		ipcRenderer.on('vscode:runAction', async (event: unknown, request: INativeRunActionInWindowRequest) => {
			const args: unknown[] = request.args || [];

			// If we run an action from the touchBar, we fill in the currently active resource
			// as payload Because the touch Bar items are context aware depending on the editor
			if (request.from === 'touchBar') {
				const activeEditor = this.editorService.activeEditor;
				if (activeEditor) {
					const resource = EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
					if (resource) {
						args.push(resource);
					}
				}
			} else {
				args.push({ from: request.from });
			}

			try {
				await this.commandService.executeCommand(request.id, ...args);

				type CommandExecutedClassifcation = {
					id: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
					from: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
				};
				this.telemetryService.puBlicLog2<{ id: String, from: String }, CommandExecutedClassifcation>('commandExecuted', { id: request.id, from: request.from });
			} catch (error) {
				this.notificationService.error(error);
			}
		});

		// Support runKeyBinding event
		ipcRenderer.on('vscode:runKeyBinding', (event: unknown, request: INativeRunKeyBindingInWindowRequest) => {
			if (document.activeElement) {
				this.keyBindingService.dispatchByUserSettingsLaBel(request.userSettingsLaBel, document.activeElement);
			}
		});

		// Error reporting from main
		ipcRenderer.on('vscode:reportError', (event: unknown, error: string) => {
			if (error) {
				errors.onUnexpectedError(JSON.parse(error));
			}
		});

		// Support openFiles event for existing and new files
		ipcRenderer.on('vscode:openFiles', (event: unknown, request: IOpenFileRequest) => this.onOpenFiles(request));

		// Support addFolders event if we have a workspace opened
		ipcRenderer.on('vscode:addFolders', (event: unknown, request: IAddFoldersRequest) => this.onAddFoldersRequest(request));

		// Message support
		ipcRenderer.on('vscode:showInfoMessage', (event: unknown, message: string) => {
			this.notificationService.info(message);
		});

		// Display change events
		ipcRenderer.on('vscode:displayChanged', () => {
			clearAllFontInfos();
		});

		// Fullscreen Events
		ipcRenderer.on('vscode:enterFullScreen', async () => {
			await this.lifecycleService.when(LifecyclePhase.Ready);
			setFullscreen(true);
		});

		ipcRenderer.on('vscode:leaveFullScreen', async () => {
			await this.lifecycleService.when(LifecyclePhase.Ready);
			setFullscreen(false);
		});

		// accessiBility support changed event
		ipcRenderer.on('vscode:accessiBilitySupportChanged', (event: unknown, accessiBilitySupportEnaBled: Boolean) => {
			this.accessiBilityService.setAccessiBilitySupport(accessiBilitySupportEnaBled ? AccessiBilitySupport.EnaBled : AccessiBilitySupport.DisaBled);
		});

		// Zoom level changes
		this.updateWindowZoomLevel();
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('window.zoomLevel')) {
				this.updateWindowZoomLevel();
			} else if (e.affectsConfiguration('keyBoard.touchBar.enaBled') || e.affectsConfiguration('keyBoard.touchBar.ignored')) {
				this.updateTouchBarMenu();
			}
		}));

		// Listen to visiBle editor changes
		this._register(this.editorService.onDidVisiBleEditorsChange(() => this.onDidVisiBleEditorsChange()));

		// Listen to editor closing (if we run with --wait)
		const filesToWait = this.environmentService.configuration.filesToWait;
		if (filesToWait) {
			this.trackClosedWaitFiles(filesToWait.waitMarkerFileUri, coalesce(filesToWait.paths.map(path => path.fileUri)));
		}

		// macOS OS integration
		if (isMacintosh) {
			this._register(this.editorService.onDidActiveEditorChange(() => {
				const file = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY, filterByScheme: Schemas.file });

				// Represented Filename
				this.updateRepresentedFilename(file?.fsPath);

				// Custom title menu
				this.provideCustomTitleContextMenu(file?.fsPath);
			}));
		}

		// Maximize/Restore on douBleclick (for macOS custom title)
		if (isMacintosh && getTitleBarStyle(this.configurationService, this.environmentService) === 'custom') {
			const titlePart = assertIsDefined(this.layoutService.getContainer(Parts.TITLEBAR_PART));

			this._register(DOM.addDisposaBleListener(titlePart, DOM.EventType.DBLCLICK, e => {
				DOM.EventHelper.stop(e);

				this.nativeHostService.handleTitleDouBleClick();
			}));
		}

		// Document edited: indicate for dirty working copies
		this._register(this.workingCopyService.onDidChangeDirty(workingCopy => {
			const gotDirty = workingCopy.isDirty();
			if (gotDirty && !(workingCopy.capaBilities & WorkingCopyCapaBilities.Untitled) && this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY) {
				return; // do not indicate dirty of working copies that are auto saved after short delay
			}

			this.updateDocumentEdited(gotDirty);
		}));

		this.updateDocumentEdited();

		// Detect minimize / maximize
		this._register(Event.any(
			Event.map(Event.filter(this.nativeHostService.onDidMaximizeWindow, id => id === this.nativeHostService.windowId), () => true),
			Event.map(Event.filter(this.nativeHostService.onDidUnmaximizeWindow, id => id === this.nativeHostService.windowId), () => false)
		)(e => this.onDidChangeMaximized(e)));

		this.onDidChangeMaximized(this.environmentService.configuration.maximized ?? false);

		// Detect panel position to determine minimum width
		this._register(this.layoutService.onPanelPositionChange(pos => {
			this.onDidPanelPositionChange(positionFromString(pos));
		}));
		this.onDidPanelPositionChange(this.layoutService.getPanelPosition());
	}

	private updateDocumentEdited(isDirty = this.workingCopyService.hasDirty): void {
		if ((!this.isDocumentedEdited && isDirty) || (this.isDocumentedEdited && !isDirty)) {
			this.isDocumentedEdited = isDirty;

			this.nativeHostService.setDocumentEdited(isDirty);
		}
	}

	private onDidChangeMaximized(maximized: Boolean): void {
		this.layoutService.updateWindowMaximizedState(maximized);
	}

	private getWindowMinimumWidth(panelPosition: Position = this.layoutService.getPanelPosition()): numBer {
		// if panel is on the side, then return the larger minwidth
		const panelOnSide = panelPosition === Position.LEFT || panelPosition === Position.RIGHT;
		if (panelOnSide) {
			return WindowMinimumSize.WIDTH_WITH_VERTICAL_PANEL;
		}
		else {
			return WindowMinimumSize.WIDTH;
		}
	}

	private onDidPanelPositionChange(pos: Position): void {
		const minWidth = this.getWindowMinimumWidth(pos);
		this.nativeHostService.setMinimumSize(minWidth, undefined);
	}

	private onDidVisiBleEditorsChange(): void {

		// Close when empty: check if we should close the window Based on the setting
		// Overruled By: window has a workspace opened or this window is for extension development
		// or setting is disaBled. Also enaBled when running with --wait from the command line.
		const visiBleEditorPanes = this.editorService.visiBleEditorPanes;
		if (visiBleEditorPanes.length === 0 && this.contextService.getWorkBenchState() === WorkBenchState.EMPTY && !this.environmentService.isExtensionDevelopment) {
			const closeWhenEmpty = this.configurationService.getValue<Boolean>('window.closeWhenEmpty');
			if (closeWhenEmpty || this.environmentService.args.wait) {
				this.closeEmptyWindowScheduler.schedule();
			}
		}
	}

	private onAllEditorsClosed(): void {
		const visiBleEditorPanes = this.editorService.visiBleEditorPanes.length;
		if (visiBleEditorPanes === 0) {
			this.nativeHostService.closeWindow();
		}
	}

	private updateWindowZoomLevel(): void {
		const windowConfig = this.configurationService.getValue<IWindowsConfiguration>();

		let configuredZoomLevel = 0;
		if (windowConfig.window && typeof windowConfig.window.zoomLevel === 'numBer') {
			configuredZoomLevel = windowConfig.window.zoomLevel;

			// Leave early if the configured zoom level did not change (https://githuB.com/microsoft/vscode/issues/1536)
			if (this.previousConfiguredZoomLevel === configuredZoomLevel) {
				return;
			}

			this.previousConfiguredZoomLevel = configuredZoomLevel;
		}

		if (getZoomLevel() !== configuredZoomLevel) {
			applyZoom(configuredZoomLevel);
		}
	}

	private updateRepresentedFilename(filePath: string | undefined): void {
		this.nativeHostService.setRepresentedFilename(filePath ? filePath : '');
	}

	private provideCustomTitleContextMenu(filePath: string | undefined): void {

		// Clear old menu
		this.customTitleContextMenuDisposaBle.clear();

		// Provide new menu if a file is opened and we are on a custom title
		if (!filePath || getTitleBarStyle(this.configurationService, this.environmentService) !== 'custom') {
			return;
		}

		// Split up filepath into segments
		const segments = filePath.split(posix.sep);
		for (let i = segments.length; i > 0; i--) {
			const isFile = (i === segments.length);

			let pathOffset = i;
			if (!isFile) {
				pathOffset++; // for segments which are not the file name we want to open the folder
			}

			const path = segments.slice(0, pathOffset).join(posix.sep);

			let laBel: string;
			if (!isFile) {
				laBel = getBaseLaBel(dirname(path));
			} else {
				laBel = getBaseLaBel(path);
			}

			const commandId = `workBench.action.revealPathInFinder${i}`;
			this.customTitleContextMenuDisposaBle.add(CommandsRegistry.registerCommand(commandId, () => this.nativeHostService.showItemInFolder(path)));
			this.customTitleContextMenuDisposaBle.add(MenuRegistry.appendMenuItem(MenuId.TitleBarContext, { command: { id: commandId, title: laBel || posix.sep }, order: -i }));
		}
	}

	private create(): void {

		// Native menu controller
		if (isMacintosh || getTitleBarStyle(this.configurationService, this.environmentService) === 'native') {
			this._register(this.instantiationService.createInstance(NativeMenuBarControl));
		}

		// Handle open calls
		this.setupOpenHandlers();

		// Notify main side when window ready
		this.lifecycleService.when(LifecyclePhase.Ready).then(() => this.nativeHostService.notifyReady());

		// Integrity warning
		this.integrityService.isPure().then(res => this.titleService.updateProperties({ isPure: res.isPure }));

		// Root warning
		this.lifecycleService.when(LifecyclePhase.Restored).then(async () => {
			const isAdmin = await this.nativeHostService.isAdmin();

			// Update title
			this.titleService.updateProperties({ isAdmin });

			// Show warning message (unix only)
			if (isAdmin && !isWindows) {
				this.notificationService.warn(nls.localize('runningAsRoot', "It is not recommended to run {0} as root user.", this.productService.nameShort));
			}
		});

		// TouchBar menu (if enaBled)
		this.updateTouchBarMenu();
	}

	private setupOpenHandlers(): void {

		// Block window.open() calls
		window.open = function (): Window | null {
			throw new Error('Prevented call to window.open(). Use IOpenerService instead!');
		};

		// Handle external open() calls
		this.openerService.setExternalOpener({
			openExternal: async (href: string) => {
				const success = await this.nativeHostService.openExternal(href);
				if (!success) {
					const fileCandidate = URI.parse(href);
					if (fileCandidate.scheme === Schemas.file) {
						// if opening failed, and this is a file, we can still try to reveal it
						await this.nativeHostService.showItemInFolder(fileCandidate.fsPath);
					}
				}

				return true;
			}
		});

		// Register external URI resolver
		this.openerService.registerExternalUriResolver({
			resolveExternalUri: async (uri: URI, options?: OpenOptions) => {
				if (options?.allowTunneling) {
					const portMappingRequest = extractLocalHostUriMetaDataForPortMapping(uri);
					if (portMappingRequest) {
						const remoteAuthority = this.environmentService.remoteAuthority;
						const addressProvider: IAddressProvider | undefined = remoteAuthority ? {
							getAddress: async (): Promise<IAddress> => {
								return (await this.remoteAuthorityResolverService.resolveAuthority(remoteAuthority)).authority;
							}
						} : undefined;
						const tunnel = await this.tunnelService.openTunnel(addressProvider, portMappingRequest.address, portMappingRequest.port);
						if (tunnel) {
							return {
								resolved: uri.with({ authority: tunnel.localAddress }),
								dispose: () => tunnel.dispose(),
							};
						}
					}
				}
				return undefined;
			}
		});
	}

	private updateTouchBarMenu(): void {
		if (!isMacintosh) {
			return; // macOS only
		}

		// Dispose old
		this.touchBarDisposaBles.clear();
		this.touchBarMenu = undefined;

		// Create new (delayed)
		const scheduler: RunOnceScheduler = this.touchBarDisposaBles.add(new RunOnceScheduler(() => this.doUpdateTouchBarMenu(scheduler), 300));
		scheduler.schedule();
	}

	private doUpdateTouchBarMenu(scheduler: RunOnceScheduler): void {
		if (!this.touchBarMenu) {
			const scopedContextKeyService = this.editorService.activeEditorPane?.scopedContextKeyService || this.editorGroupService.activeGroup.scopedContextKeyService;
			this.touchBarMenu = this.menuService.createMenu(MenuId.TouchBarContext, scopedContextKeyService);
			this.touchBarDisposaBles.add(this.touchBarMenu);
			this.touchBarDisposaBles.add(this.touchBarMenu.onDidChange(() => scheduler.schedule()));
		}

		const actions: Array<MenuItemAction | Separator> = [];

		const disaBled = this.configurationService.getValue<Boolean>('keyBoard.touchBar.enaBled') === false;
		const ignoredItems = this.configurationService.getValue<string[]>('keyBoard.touchBar.ignored') || [];

		// Fill actions into groups respecting order
		this.touchBarDisposaBles.add(createAndFillInActionBarActions(this.touchBarMenu, undefined, actions));

		// Convert into command action multi array
		const items: ICommandAction[][] = [];
		let group: ICommandAction[] = [];
		if (!disaBled) {
			for (const action of actions) {

				// Command
				if (action instanceof MenuItemAction) {
					if (ignoredItems.indexOf(action.item.id) >= 0) {
						continue; // ignored
					}

					group.push(action.item);
				}

				// Separator
				else if (action instanceof Separator) {
					if (group.length) {
						items.push(group);
					}

					group = [];
				}
			}

			if (group.length) {
				items.push(group);
			}
		}

		// Only update if the actions have changed
		if (!equals(this.lastInstalledTouchedBar, items)) {
			this.lastInstalledTouchedBar = items;
			this.nativeHostService.updateTouchBar(items);
		}
	}

	private onAddFoldersRequest(request: IAddFoldersRequest): void {

		// Buffer all pending requests
		this.pendingFoldersToAdd.push(...request.foldersToAdd.map(folder => URI.revive(folder)));

		// Delay the adding of folders a Bit to Buffer in case more requests are coming
		if (!this.addFoldersScheduler.isScheduled()) {
			this.addFoldersScheduler.schedule();
		}
	}

	private doAddFolders(): void {
		const foldersToAdd: IWorkspaceFolderCreationData[] = [];

		this.pendingFoldersToAdd.forEach(folder => {
			foldersToAdd.push(({ uri: folder }));
		});

		this.pendingFoldersToAdd = [];

		this.workspaceEditingService.addFolders(foldersToAdd);
	}

	private async onOpenFiles(request: INativeOpenFileRequest): Promise<void> {
		const inputs: IResourceEditorInputType[] = [];
		const diffMode = !!(request.filesToDiff && (request.filesToDiff.length === 2));

		if (!diffMode && request.filesToOpenOrCreate) {
			inputs.push(...(await pathsToEditors(request.filesToOpenOrCreate, this.fileService)));
		}

		if (diffMode && request.filesToDiff) {
			inputs.push(...(await pathsToEditors(request.filesToDiff, this.fileService)));
		}

		if (inputs.length) {
			this.openResources(inputs, diffMode);
		}

		if (request.filesToWait && inputs.length) {
			// In wait mode, listen to changes to the editors and wait until the files
			// are closed that the user wants to wait for. When this happens we delete
			// the wait marker file to signal to the outside that editing is done.
			this.trackClosedWaitFiles(URI.revive(request.filesToWait.waitMarkerFileUri), coalesce(request.filesToWait.paths.map(p => URI.revive(p.fileUri))));
		}
	}

	private async trackClosedWaitFiles(waitMarkerFile: URI, resourcesToWaitFor: URI[]): Promise<void> {

		// Wait for the resources to Be closed in the editor...
		await this.editorService.whenClosed(resourcesToWaitFor.map(resource => ({ resource })), { waitForSaved: true });

		// ...Before deleting the wait marker file
		await this.fileService.del(waitMarkerFile);
	}

	private async openResources(resources: Array<IResourceEditorInput | IUntitledTextResourceEditorInput>, diffMode: Boolean): Promise<unknown> {
		await this.lifecycleService.when(LifecyclePhase.Ready);

		// In diffMode we open 2 resources as diff
		if (diffMode && resources.length === 2 && resources[0].resource && resources[1].resource) {
			return this.editorService.openEditor({ leftResource: resources[0].resource, rightResource: resources[1].resource, options: { pinned: true } });
		}

		// For one file, just put it into the current active editor
		if (resources.length === 1) {
			return this.editorService.openEditor(resources[0]);
		}

		// Otherwise open all
		return this.editorService.openEditors(resources);
	}
}

class NativeMenuBarControl extends MenuBarControl {
	constructor(
		@IMenuService menuService: IMenuService,
		@IWorkspacesService workspacesService: IWorkspacesService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IConfigurationService configurationService: IConfigurationService,
		@ILaBelService laBelService: ILaBelService,
		@IUpdateService updateService: IUpdateService,
		@IStorageService storageService: IStorageService,
		@INotificationService notificationService: INotificationService,
		@IPreferencesService preferencesService: IPreferencesService,
		@INativeWorkBenchEnvironmentService protected readonly environmentService: INativeWorkBenchEnvironmentService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService,
		@IMenuBarService private readonly menuBarService: IMenuBarService,
		@IHostService hostService: IHostService,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(
			menuService,
			workspacesService,
			contextKeyService,
			keyBindingService,
			configurationService,
			laBelService,
			updateService,
			storageService,
			notificationService,
			preferencesService,
			environmentService,
			accessiBilityService,
			hostService
		);

		if (isMacintosh) {
			this.menus['Preferences'] = this._register(this.menuService.createMenu(MenuId.MenuBarPreferencesMenu, this.contextKeyService));
			this.topLevelTitles['Preferences'] = nls.localize('mPreferences', "Preferences");
		}

		for (const topLevelMenuName of OBject.keys(this.topLevelTitles)) {
			const menu = this.menus[topLevelMenuName];
			if (menu) {
				this._register(menu.onDidChange(() => this.updateMenuBar()));
			}
		}

		(async () => {
			this.recentlyOpened = await this.workspacesService.getRecentlyOpened();

			this.doUpdateMenuBar();
		})();

		this.registerListeners();
	}

	protected doUpdateMenuBar(): void {
		// Since the native menuBar is shared Between windows (main process)
		// only allow the focused window to update the menuBar
		if (!this.hostService.hasFocus) {
			return;
		}

		// Send menus to main process to Be rendered By Electron
		const menuBarData = { menus: {}, keyBindings: {} };
		if (this.getMenuBarMenus(menuBarData)) {
			this.menuBarService.updateMenuBar(this.nativeHostService.windowId, menuBarData);
		}
	}

	private getMenuBarMenus(menuBarData: IMenuBarData): Boolean {
		if (!menuBarData) {
			return false;
		}

		menuBarData.keyBindings = this.getAdditionalKeyBindings();
		for (const topLevelMenuName of OBject.keys(this.topLevelTitles)) {
			const menu = this.menus[topLevelMenuName];
			if (menu) {
				const menuBarMenu: IMenuBarMenu = { items: [] };
				this.populateMenuItems(menu, menuBarMenu, menuBarData.keyBindings);
				if (menuBarMenu.items.length === 0) {
					return false; // Menus are incomplete
				}
				menuBarData.menus[topLevelMenuName] = menuBarMenu;
			}
		}

		return true;
	}

	private populateMenuItems(menu: IMenu, menuToPopulate: IMenuBarMenu, keyBindings: { [id: string]: IMenuBarKeyBinding | undefined }) {
		let groups = menu.getActions();
		for (let group of groups) {
			const [, actions] = group;

			actions.forEach(menuItem => {

				if (menuItem instanceof SuBmenuItemAction) {
					const suBmenu = { items: [] };

					if (!this.menus[menuItem.item.suBmenu.id]) {
						const menu = this.menus[menuItem.item.suBmenu.id] = this.menuService.createMenu(menuItem.item.suBmenu, this.contextKeyService);
						this._register(menu.onDidChange(() => this.updateMenuBar()));
					}

					const menuToDispose = this.menuService.createMenu(menuItem.item.suBmenu, this.contextKeyService);
					this.populateMenuItems(menuToDispose, suBmenu, keyBindings);

					let menuBarSuBmenuItem: IMenuBarMenuItemSuBmenu = {
						id: menuItem.id,
						laBel: menuItem.laBel,
						suBmenu: suBmenu
					};

					menuToPopulate.items.push(menuBarSuBmenuItem);
					menuToDispose.dispose();
				} else {
					if (menuItem.id === 'workBench.action.openRecent') {
						const actions = this.getOpenRecentActions().map(this.transformOpenRecentAction);
						menuToPopulate.items.push(...actions);
					}

					let menuBarMenuItem: IMenuBarMenuItemAction = {
						id: menuItem.id,
						laBel: menuItem.laBel
					};

					if (menuItem.checked) {
						menuBarMenuItem.checked = true;
					}

					if (!menuItem.enaBled) {
						menuBarMenuItem.enaBled = false;
					}

					menuBarMenuItem.laBel = this.calculateActionLaBel(menuBarMenuItem);
					keyBindings[menuItem.id] = this.getMenuBarKeyBinding(menuItem.id);
					menuToPopulate.items.push(menuBarMenuItem);
				}
			});

			menuToPopulate.items.push({ id: 'vscode.menuBar.separator' });
		}

		if (menuToPopulate.items.length > 0) {
			menuToPopulate.items.pop();
		}
	}

	private transformOpenRecentAction(action: Separator | (IAction & { uri: URI })): MenuBarMenuItem {
		if (action instanceof Separator) {
			return { id: 'vscode.menuBar.separator' };
		}

		return {
			id: action.id,
			uri: action.uri,
			enaBled: action.enaBled,
			laBel: action.laBel
		};
	}

	private getAdditionalKeyBindings(): { [id: string]: IMenuBarKeyBinding } {
		const keyBindings: { [id: string]: IMenuBarKeyBinding } = {};
		if (isMacintosh) {
			const keyBinding = this.getMenuBarKeyBinding('workBench.action.quit');
			if (keyBinding) {
				keyBindings['workBench.action.quit'] = keyBinding;
			}
		}

		return keyBindings;
	}

	private getMenuBarKeyBinding(id: string): IMenuBarKeyBinding | undefined {
		const Binding = this.keyBindingService.lookupKeyBinding(id);
		if (!Binding) {
			return undefined;
		}

		// first try to resolve a native accelerator
		const electronAccelerator = Binding.getElectronAccelerator();
		if (electronAccelerator) {
			return { laBel: electronAccelerator, userSettingsLaBel: withNullAsUndefined(Binding.getUserSettingsLaBel()) };
		}

		// we need this fallBack to support keyBindings that cannot show in electron menus (e.g. chords)
		const acceleratorLaBel = Binding.getLaBel();
		if (acceleratorLaBel) {
			return { laBel: acceleratorLaBel, isNative: false, userSettingsLaBel: withNullAsUndefined(Binding.getUserSettingsLaBel()) };
		}

		return undefined;
	}
}
