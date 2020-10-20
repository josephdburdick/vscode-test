/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import * As errors from 'vs/bAse/common/errors';
import { equAls } from 'vs/bAse/common/objects';
import * As DOM from 'vs/bAse/browser/dom';
import { IAction, SepArAtor } from 'vs/bAse/common/Actions';
import { IFileService } from 'vs/plAtform/files/common/files';
import { EditorResourceAccessor, IUntitledTextResourceEditorInput, SideBySideEditor, pAthsToEditors } from 'vs/workbench/common/editor';
import { IEditorService, IResourceEditorInputType } from 'vs/workbench/services/editor/common/editorService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { WindowMinimumSize, IOpenFileRequest, IWindowsConfigurAtion, getTitleBArStyle, IAddFoldersRequest, INAtiveRunActionInWindowRequest, INAtiveRunKeybindingInWindowRequest, INAtiveOpenFileRequest } from 'vs/plAtform/windows/common/windows';
import { ITitleService } from 'vs/workbench/services/title/common/titleService';
import { IWorkbenchThemeService } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { ApplyZoom } from 'vs/plAtform/windows/electron-sAndbox/window';
import { setFullscreen, getZoomLevel } from 'vs/bAse/browser/browser';
import { ICommAndService, CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IResourceEditorInput } from 'vs/plAtform/editor/common/editor';
import { ipcRenderer } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';
import { IWorkspAceEditingService } from 'vs/workbench/services/workspAces/common/workspAceEditing';
import { IMenuService, MenuId, IMenu, MenuItemAction, ICommAndAction, SubmenuItemAction, MenuRegistry } from 'vs/plAtform/Actions/common/Actions';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { creAteAndFillInActionBArActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { LifecyclePhAse, ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IWorkspAceFolderCreAtionDAtA, IWorkspAcesService } from 'vs/plAtform/workspAces/common/workspAces';
import { IIntegrityService } from 'vs/workbench/services/integrity/common/integrity';
import { isWindows, isMAcintosh } from 'vs/bAse/common/plAtform';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IAccessibilityService, AccessibilitySupport } from 'vs/plAtform/Accessibility/common/Accessibility';
import { WorkbenchStAte, IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { MenubArControl } from '../browser/pArts/titlebAr/menubArControl';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IUpdAteService } from 'vs/plAtform/updAte/common/updAte';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IPreferencesService } from '../services/preferences/common/preferences';
import { IMenubArDAtA, IMenubArMenu, IMenubArKeybinding, IMenubArMenuItemSubmenu, IMenubArMenuItemAction, MenubArMenuItem } from 'vs/plAtform/menubAr/common/menubAr';
import { IMenubArService } from 'vs/plAtform/menubAr/electron-sAndbox/menubAr';
import { withNullAsUndefined, AssertIsDefined } from 'vs/bAse/common/types';
import { IOpenerService, OpenOptions } from 'vs/plAtform/opener/common/opener';
import { SchemAs } from 'vs/bAse/common/network';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { posix, dirnAme } from 'vs/bAse/common/pAth';
import { getBAseLAbel } from 'vs/bAse/common/lAbels';
import { ITunnelService, extrActLocAlHostUriMetADAtAForPortMApping } from 'vs/plAtform/remote/common/tunnel';
import { IWorkbenchLAyoutService, PArts, positionFromString, Position } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IWorkingCopyService, WorkingCopyCApAbilities } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { AutoSAveMode, IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { Event } from 'vs/bAse/common/event';
import { cleArAllFontInfos } from 'vs/editor/browser/config/configurAtion';
import { IRemoteAuthorityResolverService } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { IAddressProvider, IAddress } from 'vs/plAtform/remote/common/remoteAgentConnection';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';

export clAss NAtiveWindow extends DisposAble {

	privAte touchBArMenu: IMenu | undefined;
	privAte reAdonly touchBArDisposAbles = this._register(new DisposAbleStore());
	privAte lAstInstAlledTouchedBAr: ICommAndAction[][] | undefined;

	privAte reAdonly customTitleContextMenuDisposAble = this._register(new DisposAbleStore());

	privAte previousConfiguredZoomLevel: number | undefined;

	privAte reAdonly AddFoldersScheduler = this._register(new RunOnceScheduler(() => this.doAddFolders(), 100));
	privAte pendingFoldersToAdd: URI[] = [];

	privAte reAdonly closeEmptyWindowScheduler = this._register(new RunOnceScheduler(() => this.onAllEditorsClosed(), 50));

	privAte isDocumentedEdited = fAlse;

	constructor(
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ITitleService privAte reAdonly titleService: ITitleService,
		@IWorkbenchThemeService protected themeService: IWorkbenchThemeService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IWorkspAceEditingService privAte reAdonly workspAceEditingService: IWorkspAceEditingService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@IIntegrityService privAte reAdonly integrityService: IIntegrityService,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly environmentService: INAtiveWorkbenchEnvironmentService,
		@IAccessibilityService privAte reAdonly AccessibilityService: IAccessibilityService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService,
		@ITunnelService privAte reAdonly tunnelService: ITunnelService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService,
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService,
		@IProductService privAte reAdonly productService: IProductService,
		@IRemoteAuthorityResolverService privAte reAdonly remoteAuthorityResolverService: IRemoteAuthorityResolverService
	) {
		super();

		this.registerListeners();
		this.creAte();
	}

	privAte registerListeners(): void {

		// ReAct to editor input chAnges
		this._register(this.editorService.onDidActiveEditorChAnge(() => this.updAteTouchbArMenu()));

		// prevent opening A reAl URL inside the shell
		[DOM.EventType.DRAG_OVER, DOM.EventType.DROP].forEAch(event => {
			window.document.body.AddEventListener(event, (e: DrAgEvent) => {
				DOM.EventHelper.stop(e);
			});
		});

		// Support runAction event
		ipcRenderer.on('vscode:runAction', Async (event: unknown, request: INAtiveRunActionInWindowRequest) => {
			const Args: unknown[] = request.Args || [];

			// If we run An Action from the touchbAr, we fill in the currently Active resource
			// As pAyloAd becAuse the touch bAr items Are context AwAre depending on the editor
			if (request.from === 'touchbAr') {
				const ActiveEditor = this.editorService.ActiveEditor;
				if (ActiveEditor) {
					const resource = EditorResourceAccessor.getOriginAlUri(ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
					if (resource) {
						Args.push(resource);
					}
				}
			} else {
				Args.push({ from: request.from });
			}

			try {
				AwAit this.commAndService.executeCommAnd(request.id, ...Args);

				type CommAndExecutedClAssifcAtion = {
					id: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
					from: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
				};
				this.telemetryService.publicLog2<{ id: String, from: String }, CommAndExecutedClAssifcAtion>('commAndExecuted', { id: request.id, from: request.from });
			} cAtch (error) {
				this.notificAtionService.error(error);
			}
		});

		// Support runKeybinding event
		ipcRenderer.on('vscode:runKeybinding', (event: unknown, request: INAtiveRunKeybindingInWindowRequest) => {
			if (document.ActiveElement) {
				this.keybindingService.dispAtchByUserSettingsLAbel(request.userSettingsLAbel, document.ActiveElement);
			}
		});

		// Error reporting from mAin
		ipcRenderer.on('vscode:reportError', (event: unknown, error: string) => {
			if (error) {
				errors.onUnexpectedError(JSON.pArse(error));
			}
		});

		// Support openFiles event for existing And new files
		ipcRenderer.on('vscode:openFiles', (event: unknown, request: IOpenFileRequest) => this.onOpenFiles(request));

		// Support AddFolders event if we hAve A workspAce opened
		ipcRenderer.on('vscode:AddFolders', (event: unknown, request: IAddFoldersRequest) => this.onAddFoldersRequest(request));

		// MessAge support
		ipcRenderer.on('vscode:showInfoMessAge', (event: unknown, messAge: string) => {
			this.notificAtionService.info(messAge);
		});

		// DisplAy chAnge events
		ipcRenderer.on('vscode:displAyChAnged', () => {
			cleArAllFontInfos();
		});

		// Fullscreen Events
		ipcRenderer.on('vscode:enterFullScreen', Async () => {
			AwAit this.lifecycleService.when(LifecyclePhAse.ReAdy);
			setFullscreen(true);
		});

		ipcRenderer.on('vscode:leAveFullScreen', Async () => {
			AwAit this.lifecycleService.when(LifecyclePhAse.ReAdy);
			setFullscreen(fAlse);
		});

		// Accessibility support chAnged event
		ipcRenderer.on('vscode:AccessibilitySupportChAnged', (event: unknown, AccessibilitySupportEnAbled: booleAn) => {
			this.AccessibilityService.setAccessibilitySupport(AccessibilitySupportEnAbled ? AccessibilitySupport.EnAbled : AccessibilitySupport.DisAbled);
		});

		// Zoom level chAnges
		this.updAteWindowZoomLevel();
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('window.zoomLevel')) {
				this.updAteWindowZoomLevel();
			} else if (e.AffectsConfigurAtion('keyboArd.touchbAr.enAbled') || e.AffectsConfigurAtion('keyboArd.touchbAr.ignored')) {
				this.updAteTouchbArMenu();
			}
		}));

		// Listen to visible editor chAnges
		this._register(this.editorService.onDidVisibleEditorsChAnge(() => this.onDidVisibleEditorsChAnge()));

		// Listen to editor closing (if we run with --wAit)
		const filesToWAit = this.environmentService.configurAtion.filesToWAit;
		if (filesToWAit) {
			this.trAckClosedWAitFiles(filesToWAit.wAitMArkerFileUri, coAlesce(filesToWAit.pAths.mAp(pAth => pAth.fileUri)));
		}

		// mAcOS OS integrAtion
		if (isMAcintosh) {
			this._register(this.editorService.onDidActiveEditorChAnge(() => {
				const file = EditorResourceAccessor.getOriginAlUri(this.editorService.ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY, filterByScheme: SchemAs.file });

				// Represented FilenAme
				this.updAteRepresentedFilenAme(file?.fsPAth);

				// Custom title menu
				this.provideCustomTitleContextMenu(file?.fsPAth);
			}));
		}

		// MAximize/Restore on doubleclick (for mAcOS custom title)
		if (isMAcintosh && getTitleBArStyle(this.configurAtionService, this.environmentService) === 'custom') {
			const titlePArt = AssertIsDefined(this.lAyoutService.getContAiner(PArts.TITLEBAR_PART));

			this._register(DOM.AddDisposAbleListener(titlePArt, DOM.EventType.DBLCLICK, e => {
				DOM.EventHelper.stop(e);

				this.nAtiveHostService.hAndleTitleDoubleClick();
			}));
		}

		// Document edited: indicAte for dirty working copies
		this._register(this.workingCopyService.onDidChAngeDirty(workingCopy => {
			const gotDirty = workingCopy.isDirty();
			if (gotDirty && !(workingCopy.cApAbilities & WorkingCopyCApAbilities.Untitled) && this.filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.AFTER_SHORT_DELAY) {
				return; // do not indicAte dirty of working copies thAt Are Auto sAved After short delAy
			}

			this.updAteDocumentEdited(gotDirty);
		}));

		this.updAteDocumentEdited();

		// Detect minimize / mAximize
		this._register(Event.Any(
			Event.mAp(Event.filter(this.nAtiveHostService.onDidMAximizeWindow, id => id === this.nAtiveHostService.windowId), () => true),
			Event.mAp(Event.filter(this.nAtiveHostService.onDidUnmAximizeWindow, id => id === this.nAtiveHostService.windowId), () => fAlse)
		)(e => this.onDidChAngeMAximized(e)));

		this.onDidChAngeMAximized(this.environmentService.configurAtion.mAximized ?? fAlse);

		// Detect pAnel position to determine minimum width
		this._register(this.lAyoutService.onPAnelPositionChAnge(pos => {
			this.onDidPAnelPositionChAnge(positionFromString(pos));
		}));
		this.onDidPAnelPositionChAnge(this.lAyoutService.getPAnelPosition());
	}

	privAte updAteDocumentEdited(isDirty = this.workingCopyService.hAsDirty): void {
		if ((!this.isDocumentedEdited && isDirty) || (this.isDocumentedEdited && !isDirty)) {
			this.isDocumentedEdited = isDirty;

			this.nAtiveHostService.setDocumentEdited(isDirty);
		}
	}

	privAte onDidChAngeMAximized(mAximized: booleAn): void {
		this.lAyoutService.updAteWindowMAximizedStAte(mAximized);
	}

	privAte getWindowMinimumWidth(pAnelPosition: Position = this.lAyoutService.getPAnelPosition()): number {
		// if pAnel is on the side, then return the lArger minwidth
		const pAnelOnSide = pAnelPosition === Position.LEFT || pAnelPosition === Position.RIGHT;
		if (pAnelOnSide) {
			return WindowMinimumSize.WIDTH_WITH_VERTICAL_PANEL;
		}
		else {
			return WindowMinimumSize.WIDTH;
		}
	}

	privAte onDidPAnelPositionChAnge(pos: Position): void {
		const minWidth = this.getWindowMinimumWidth(pos);
		this.nAtiveHostService.setMinimumSize(minWidth, undefined);
	}

	privAte onDidVisibleEditorsChAnge(): void {

		// Close when empty: check if we should close the window bAsed on the setting
		// Overruled by: window hAs A workspAce opened or this window is for extension development
		// or setting is disAbled. Also enAbled when running with --wAit from the commAnd line.
		const visibleEditorPAnes = this.editorService.visibleEditorPAnes;
		if (visibleEditorPAnes.length === 0 && this.contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY && !this.environmentService.isExtensionDevelopment) {
			const closeWhenEmpty = this.configurAtionService.getVAlue<booleAn>('window.closeWhenEmpty');
			if (closeWhenEmpty || this.environmentService.Args.wAit) {
				this.closeEmptyWindowScheduler.schedule();
			}
		}
	}

	privAte onAllEditorsClosed(): void {
		const visibleEditorPAnes = this.editorService.visibleEditorPAnes.length;
		if (visibleEditorPAnes === 0) {
			this.nAtiveHostService.closeWindow();
		}
	}

	privAte updAteWindowZoomLevel(): void {
		const windowConfig = this.configurAtionService.getVAlue<IWindowsConfigurAtion>();

		let configuredZoomLevel = 0;
		if (windowConfig.window && typeof windowConfig.window.zoomLevel === 'number') {
			configuredZoomLevel = windowConfig.window.zoomLevel;

			// LeAve eArly if the configured zoom level did not chAnge (https://github.com/microsoft/vscode/issues/1536)
			if (this.previousConfiguredZoomLevel === configuredZoomLevel) {
				return;
			}

			this.previousConfiguredZoomLevel = configuredZoomLevel;
		}

		if (getZoomLevel() !== configuredZoomLevel) {
			ApplyZoom(configuredZoomLevel);
		}
	}

	privAte updAteRepresentedFilenAme(filePAth: string | undefined): void {
		this.nAtiveHostService.setRepresentedFilenAme(filePAth ? filePAth : '');
	}

	privAte provideCustomTitleContextMenu(filePAth: string | undefined): void {

		// CleAr old menu
		this.customTitleContextMenuDisposAble.cleAr();

		// Provide new menu if A file is opened And we Are on A custom title
		if (!filePAth || getTitleBArStyle(this.configurAtionService, this.environmentService) !== 'custom') {
			return;
		}

		// Split up filepAth into segments
		const segments = filePAth.split(posix.sep);
		for (let i = segments.length; i > 0; i--) {
			const isFile = (i === segments.length);

			let pAthOffset = i;
			if (!isFile) {
				pAthOffset++; // for segments which Are not the file nAme we wAnt to open the folder
			}

			const pAth = segments.slice(0, pAthOffset).join(posix.sep);

			let lAbel: string;
			if (!isFile) {
				lAbel = getBAseLAbel(dirnAme(pAth));
			} else {
				lAbel = getBAseLAbel(pAth);
			}

			const commAndId = `workbench.Action.reveAlPAthInFinder${i}`;
			this.customTitleContextMenuDisposAble.Add(CommAndsRegistry.registerCommAnd(commAndId, () => this.nAtiveHostService.showItemInFolder(pAth)));
			this.customTitleContextMenuDisposAble.Add(MenuRegistry.AppendMenuItem(MenuId.TitleBArContext, { commAnd: { id: commAndId, title: lAbel || posix.sep }, order: -i }));
		}
	}

	privAte creAte(): void {

		// NAtive menu controller
		if (isMAcintosh || getTitleBArStyle(this.configurAtionService, this.environmentService) === 'nAtive') {
			this._register(this.instAntiAtionService.creAteInstAnce(NAtiveMenubArControl));
		}

		// HAndle open cAlls
		this.setupOpenHAndlers();

		// Notify mAin side when window reAdy
		this.lifecycleService.when(LifecyclePhAse.ReAdy).then(() => this.nAtiveHostService.notifyReAdy());

		// Integrity wArning
		this.integrityService.isPure().then(res => this.titleService.updAteProperties({ isPure: res.isPure }));

		// Root wArning
		this.lifecycleService.when(LifecyclePhAse.Restored).then(Async () => {
			const isAdmin = AwAit this.nAtiveHostService.isAdmin();

			// UpdAte title
			this.titleService.updAteProperties({ isAdmin });

			// Show wArning messAge (unix only)
			if (isAdmin && !isWindows) {
				this.notificAtionService.wArn(nls.locAlize('runningAsRoot', "It is not recommended to run {0} As root user.", this.productService.nAmeShort));
			}
		});

		// TouchbAr menu (if enAbled)
		this.updAteTouchbArMenu();
	}

	privAte setupOpenHAndlers(): void {

		// Block window.open() cAlls
		window.open = function (): Window | null {
			throw new Error('Prevented cAll to window.open(). Use IOpenerService insteAd!');
		};

		// HAndle externAl open() cAlls
		this.openerService.setExternAlOpener({
			openExternAl: Async (href: string) => {
				const success = AwAit this.nAtiveHostService.openExternAl(href);
				if (!success) {
					const fileCAndidAte = URI.pArse(href);
					if (fileCAndidAte.scheme === SchemAs.file) {
						// if opening fAiled, And this is A file, we cAn still try to reveAl it
						AwAit this.nAtiveHostService.showItemInFolder(fileCAndidAte.fsPAth);
					}
				}

				return true;
			}
		});

		// Register externAl URI resolver
		this.openerService.registerExternAlUriResolver({
			resolveExternAlUri: Async (uri: URI, options?: OpenOptions) => {
				if (options?.AllowTunneling) {
					const portMAppingRequest = extrActLocAlHostUriMetADAtAForPortMApping(uri);
					if (portMAppingRequest) {
						const remoteAuthority = this.environmentService.remoteAuthority;
						const AddressProvider: IAddressProvider | undefined = remoteAuthority ? {
							getAddress: Async (): Promise<IAddress> => {
								return (AwAit this.remoteAuthorityResolverService.resolveAuthority(remoteAuthority)).Authority;
							}
						} : undefined;
						const tunnel = AwAit this.tunnelService.openTunnel(AddressProvider, portMAppingRequest.Address, portMAppingRequest.port);
						if (tunnel) {
							return {
								resolved: uri.with({ Authority: tunnel.locAlAddress }),
								dispose: () => tunnel.dispose(),
							};
						}
					}
				}
				return undefined;
			}
		});
	}

	privAte updAteTouchbArMenu(): void {
		if (!isMAcintosh) {
			return; // mAcOS only
		}

		// Dispose old
		this.touchBArDisposAbles.cleAr();
		this.touchBArMenu = undefined;

		// CreAte new (delAyed)
		const scheduler: RunOnceScheduler = this.touchBArDisposAbles.Add(new RunOnceScheduler(() => this.doUpdAteTouchbArMenu(scheduler), 300));
		scheduler.schedule();
	}

	privAte doUpdAteTouchbArMenu(scheduler: RunOnceScheduler): void {
		if (!this.touchBArMenu) {
			const scopedContextKeyService = this.editorService.ActiveEditorPAne?.scopedContextKeyService || this.editorGroupService.ActiveGroup.scopedContextKeyService;
			this.touchBArMenu = this.menuService.creAteMenu(MenuId.TouchBArContext, scopedContextKeyService);
			this.touchBArDisposAbles.Add(this.touchBArMenu);
			this.touchBArDisposAbles.Add(this.touchBArMenu.onDidChAnge(() => scheduler.schedule()));
		}

		const Actions: ArrAy<MenuItemAction | SepArAtor> = [];

		const disAbled = this.configurAtionService.getVAlue<booleAn>('keyboArd.touchbAr.enAbled') === fAlse;
		const ignoredItems = this.configurAtionService.getVAlue<string[]>('keyboArd.touchbAr.ignored') || [];

		// Fill Actions into groups respecting order
		this.touchBArDisposAbles.Add(creAteAndFillInActionBArActions(this.touchBArMenu, undefined, Actions));

		// Convert into commAnd Action multi ArrAy
		const items: ICommAndAction[][] = [];
		let group: ICommAndAction[] = [];
		if (!disAbled) {
			for (const Action of Actions) {

				// CommAnd
				if (Action instAnceof MenuItemAction) {
					if (ignoredItems.indexOf(Action.item.id) >= 0) {
						continue; // ignored
					}

					group.push(Action.item);
				}

				// SepArAtor
				else if (Action instAnceof SepArAtor) {
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

		// Only updAte if the Actions hAve chAnged
		if (!equAls(this.lAstInstAlledTouchedBAr, items)) {
			this.lAstInstAlledTouchedBAr = items;
			this.nAtiveHostService.updAteTouchBAr(items);
		}
	}

	privAte onAddFoldersRequest(request: IAddFoldersRequest): void {

		// Buffer All pending requests
		this.pendingFoldersToAdd.push(...request.foldersToAdd.mAp(folder => URI.revive(folder)));

		// DelAy the Adding of folders A bit to buffer in cAse more requests Are coming
		if (!this.AddFoldersScheduler.isScheduled()) {
			this.AddFoldersScheduler.schedule();
		}
	}

	privAte doAddFolders(): void {
		const foldersToAdd: IWorkspAceFolderCreAtionDAtA[] = [];

		this.pendingFoldersToAdd.forEAch(folder => {
			foldersToAdd.push(({ uri: folder }));
		});

		this.pendingFoldersToAdd = [];

		this.workspAceEditingService.AddFolders(foldersToAdd);
	}

	privAte Async onOpenFiles(request: INAtiveOpenFileRequest): Promise<void> {
		const inputs: IResourceEditorInputType[] = [];
		const diffMode = !!(request.filesToDiff && (request.filesToDiff.length === 2));

		if (!diffMode && request.filesToOpenOrCreAte) {
			inputs.push(...(AwAit pAthsToEditors(request.filesToOpenOrCreAte, this.fileService)));
		}

		if (diffMode && request.filesToDiff) {
			inputs.push(...(AwAit pAthsToEditors(request.filesToDiff, this.fileService)));
		}

		if (inputs.length) {
			this.openResources(inputs, diffMode);
		}

		if (request.filesToWAit && inputs.length) {
			// In wAit mode, listen to chAnges to the editors And wAit until the files
			// Are closed thAt the user wAnts to wAit for. When this hAppens we delete
			// the wAit mArker file to signAl to the outside thAt editing is done.
			this.trAckClosedWAitFiles(URI.revive(request.filesToWAit.wAitMArkerFileUri), coAlesce(request.filesToWAit.pAths.mAp(p => URI.revive(p.fileUri))));
		}
	}

	privAte Async trAckClosedWAitFiles(wAitMArkerFile: URI, resourcesToWAitFor: URI[]): Promise<void> {

		// WAit for the resources to be closed in the editor...
		AwAit this.editorService.whenClosed(resourcesToWAitFor.mAp(resource => ({ resource })), { wAitForSAved: true });

		// ...before deleting the wAit mArker file
		AwAit this.fileService.del(wAitMArkerFile);
	}

	privAte Async openResources(resources: ArrAy<IResourceEditorInput | IUntitledTextResourceEditorInput>, diffMode: booleAn): Promise<unknown> {
		AwAit this.lifecycleService.when(LifecyclePhAse.ReAdy);

		// In diffMode we open 2 resources As diff
		if (diffMode && resources.length === 2 && resources[0].resource && resources[1].resource) {
			return this.editorService.openEditor({ leftResource: resources[0].resource, rightResource: resources[1].resource, options: { pinned: true } });
		}

		// For one file, just put it into the current Active editor
		if (resources.length === 1) {
			return this.editorService.openEditor(resources[0]);
		}

		// Otherwise open All
		return this.editorService.openEditors(resources);
	}
}

clAss NAtiveMenubArControl extends MenubArControl {
	constructor(
		@IMenuService menuService: IMenuService,
		@IWorkspAcesService workspAcesService: IWorkspAcesService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@ILAbelService lAbelService: ILAbelService,
		@IUpdAteService updAteService: IUpdAteService,
		@IStorAgeService storAgeService: IStorAgeService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IPreferencesService preferencesService: IPreferencesService,
		@INAtiveWorkbenchEnvironmentService protected reAdonly environmentService: INAtiveWorkbenchEnvironmentService,
		@IAccessibilityService AccessibilityService: IAccessibilityService,
		@IMenubArService privAte reAdonly menubArService: IMenubArService,
		@IHostService hostService: IHostService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) {
		super(
			menuService,
			workspAcesService,
			contextKeyService,
			keybindingService,
			configurAtionService,
			lAbelService,
			updAteService,
			storAgeService,
			notificAtionService,
			preferencesService,
			environmentService,
			AccessibilityService,
			hostService
		);

		if (isMAcintosh) {
			this.menus['Preferences'] = this._register(this.menuService.creAteMenu(MenuId.MenubArPreferencesMenu, this.contextKeyService));
			this.topLevelTitles['Preferences'] = nls.locAlize('mPreferences', "Preferences");
		}

		for (const topLevelMenuNAme of Object.keys(this.topLevelTitles)) {
			const menu = this.menus[topLevelMenuNAme];
			if (menu) {
				this._register(menu.onDidChAnge(() => this.updAteMenubAr()));
			}
		}

		(Async () => {
			this.recentlyOpened = AwAit this.workspAcesService.getRecentlyOpened();

			this.doUpdAteMenubAr();
		})();

		this.registerListeners();
	}

	protected doUpdAteMenubAr(): void {
		// Since the nAtive menubAr is shAred between windows (mAin process)
		// only Allow the focused window to updAte the menubAr
		if (!this.hostService.hAsFocus) {
			return;
		}

		// Send menus to mAin process to be rendered by Electron
		const menubArDAtA = { menus: {}, keybindings: {} };
		if (this.getMenubArMenus(menubArDAtA)) {
			this.menubArService.updAteMenubAr(this.nAtiveHostService.windowId, menubArDAtA);
		}
	}

	privAte getMenubArMenus(menubArDAtA: IMenubArDAtA): booleAn {
		if (!menubArDAtA) {
			return fAlse;
		}

		menubArDAtA.keybindings = this.getAdditionAlKeybindings();
		for (const topLevelMenuNAme of Object.keys(this.topLevelTitles)) {
			const menu = this.menus[topLevelMenuNAme];
			if (menu) {
				const menubArMenu: IMenubArMenu = { items: [] };
				this.populAteMenuItems(menu, menubArMenu, menubArDAtA.keybindings);
				if (menubArMenu.items.length === 0) {
					return fAlse; // Menus Are incomplete
				}
				menubArDAtA.menus[topLevelMenuNAme] = menubArMenu;
			}
		}

		return true;
	}

	privAte populAteMenuItems(menu: IMenu, menuToPopulAte: IMenubArMenu, keybindings: { [id: string]: IMenubArKeybinding | undefined }) {
		let groups = menu.getActions();
		for (let group of groups) {
			const [, Actions] = group;

			Actions.forEAch(menuItem => {

				if (menuItem instAnceof SubmenuItemAction) {
					const submenu = { items: [] };

					if (!this.menus[menuItem.item.submenu.id]) {
						const menu = this.menus[menuItem.item.submenu.id] = this.menuService.creAteMenu(menuItem.item.submenu, this.contextKeyService);
						this._register(menu.onDidChAnge(() => this.updAteMenubAr()));
					}

					const menuToDispose = this.menuService.creAteMenu(menuItem.item.submenu, this.contextKeyService);
					this.populAteMenuItems(menuToDispose, submenu, keybindings);

					let menubArSubmenuItem: IMenubArMenuItemSubmenu = {
						id: menuItem.id,
						lAbel: menuItem.lAbel,
						submenu: submenu
					};

					menuToPopulAte.items.push(menubArSubmenuItem);
					menuToDispose.dispose();
				} else {
					if (menuItem.id === 'workbench.Action.openRecent') {
						const Actions = this.getOpenRecentActions().mAp(this.trAnsformOpenRecentAction);
						menuToPopulAte.items.push(...Actions);
					}

					let menubArMenuItem: IMenubArMenuItemAction = {
						id: menuItem.id,
						lAbel: menuItem.lAbel
					};

					if (menuItem.checked) {
						menubArMenuItem.checked = true;
					}

					if (!menuItem.enAbled) {
						menubArMenuItem.enAbled = fAlse;
					}

					menubArMenuItem.lAbel = this.cAlculAteActionLAbel(menubArMenuItem);
					keybindings[menuItem.id] = this.getMenubArKeybinding(menuItem.id);
					menuToPopulAte.items.push(menubArMenuItem);
				}
			});

			menuToPopulAte.items.push({ id: 'vscode.menubAr.sepArAtor' });
		}

		if (menuToPopulAte.items.length > 0) {
			menuToPopulAte.items.pop();
		}
	}

	privAte trAnsformOpenRecentAction(Action: SepArAtor | (IAction & { uri: URI })): MenubArMenuItem {
		if (Action instAnceof SepArAtor) {
			return { id: 'vscode.menubAr.sepArAtor' };
		}

		return {
			id: Action.id,
			uri: Action.uri,
			enAbled: Action.enAbled,
			lAbel: Action.lAbel
		};
	}

	privAte getAdditionAlKeybindings(): { [id: string]: IMenubArKeybinding } {
		const keybindings: { [id: string]: IMenubArKeybinding } = {};
		if (isMAcintosh) {
			const keybinding = this.getMenubArKeybinding('workbench.Action.quit');
			if (keybinding) {
				keybindings['workbench.Action.quit'] = keybinding;
			}
		}

		return keybindings;
	}

	privAte getMenubArKeybinding(id: string): IMenubArKeybinding | undefined {
		const binding = this.keybindingService.lookupKeybinding(id);
		if (!binding) {
			return undefined;
		}

		// first try to resolve A nAtive AccelerAtor
		const electronAccelerAtor = binding.getElectronAccelerAtor();
		if (electronAccelerAtor) {
			return { lAbel: electronAccelerAtor, userSettingsLAbel: withNullAsUndefined(binding.getUserSettingsLAbel()) };
		}

		// we need this fAllbAck to support keybindings thAt cAnnot show in electron menus (e.g. chords)
		const AccelerAtorLAbel = binding.getLAbel();
		if (AccelerAtorLAbel) {
			return { lAbel: AccelerAtorLAbel, isNAtive: fAlse, userSettingsLAbel: withNullAsUndefined(binding.getUserSettingsLAbel()) };
		}

		return undefined;
	}
}
