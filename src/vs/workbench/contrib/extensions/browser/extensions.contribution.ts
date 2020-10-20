/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { KeyMod, KeyChord, KeyCode } from 'vs/bAse/common/keyCodes';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { MenuRegistry, MenuId, registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ExtensionsLAbel, ExtensionsLocAlizedLAbel, ExtensionsChAnnelId, IExtensionMAnAgementService, IExtensionGAlleryService, PreferencesLocAlizedLAbel } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IExtensionMAnAgementServerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { IExtensionRecommendAtionsService } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions, IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IOutputChAnnelRegistry, Extensions As OutputExtensions } from 'vs/workbench/services/output/common/output';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { VIEWLET_ID, IExtensionsWorkbenchService, IExtensionsViewPAneContAiner, TOGGLE_IGNORE_EXTENSION_ACTION_ID, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID } from 'vs/workbench/contrib/extensions/common/extensions';
import {
	OpenExtensionsViewletAction, InstAllExtensionsAction, ShowOutdAtedExtensionsAction, ShowRecommendedExtensionsAction, ShowRecommendedKeymApExtensionsAction, ShowPopulArExtensionsAction,
	ShowEnAbledExtensionsAction, ShowInstAlledExtensionsAction, ShowDisAbledExtensionsAction, ShowBuiltInExtensionsAction, UpdAteAllAction,
	EnAbleAllAction, EnAbleAllWorkspAceAction, DisAbleAllAction, DisAbleAllWorkspAceAction, CheckForUpdAtesAction, ShowLAnguAgeExtensionsAction, EnAbleAutoUpdAteAction, DisAbleAutoUpdAteAction, ConfigureRecommendedExtensionsCommAndsContributor, InstAllVSIXAction, ReinstAllAction, InstAllSpecificVersionOfExtensionAction, CleArExtensionsSeArchResultsAction
} from 'vs/workbench/contrib/extensions/browser/extensionsActions';
import { ExtensionsInput } from 'vs/workbench/contrib/extensions/common/extensionsInput';
import { ExtensionEditor } from 'vs/workbench/contrib/extensions/browser/extensionEditor';
import { StAtusUpdAter, MAliciousExtensionChecker, ExtensionsViewletViewsContribution, ExtensionsViewPAneContAiner } from 'vs/workbench/contrib/extensions/browser/extensionsViewlet';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import * As jsonContributionRegistry from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { ExtensionsConfigurAtionSchemA, ExtensionsConfigurAtionSchemAId } from 'vs/workbench/contrib/extensions/common/extensionsFileTemplAte';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeymApExtensions } from 'vs/workbench/contrib/extensions/common/extensionsUtils';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { EditorDescriptor, IEditorRegistry, Extensions As EditorExtensions } from 'vs/workbench/browser/editor';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { ExtensionActivAtionProgress } from 'vs/workbench/contrib/extensions/browser/extensionsActivAtionProgress';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { ExtensionDependencyChecker } from 'vs/workbench/contrib/extensions/browser/extensionsDependencyChecker';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { RemoteExtensionsInstAller } from 'vs/workbench/contrib/extensions/browser/remoteExtensionsInstAller';
import { IViewContAinersRegistry, ViewContAinerLocAtion, Extensions As ViewContAinerExtensions } from 'vs/workbench/common/views';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';
import { ContextKeyAndExpr, ContextKeyExpr, ContextKeyOrExpr, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IQuickAccessRegistry, Extensions } from 'vs/plAtform/quickinput/common/quickAccess';
import { InstAllExtensionQuickAccessProvider, MAnAgeExtensionsQuickAccessProvider } from 'vs/workbench/contrib/extensions/browser/extensionsQuickAccess';
import { ExtensionRecommendAtionsService } from 'vs/workbench/contrib/extensions/browser/extensionRecommendAtionsService';
import { CONTEXT_SYNC_ENABLEMENT } from 'vs/workbench/services/userDAtASync/common/userDAtASync';
import { CopyAction, CutAction, PAsteAction } from 'vs/editor/contrib/clipboArd/clipboArd';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { MultiCommAnd } from 'vs/editor/browser/editorExtensions';
import { Webview } from 'vs/workbench/contrib/webview/browser/webview';
import { ExtensionsWorkbenchService } from 'vs/workbench/contrib/extensions/browser/extensionsWorkbenchService';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { WorkbenchStAteContext } from 'vs/workbench/browser/contextkeys';
import { CATEGORIES } from 'vs/workbench/common/Actions';
import { IExtensionRecommendAtionNotificAtionService } from 'vs/plAtform/extensionRecommendAtions/common/extensionRecommendAtions';
import { ExtensionRecommendAtionNotificAtionService } from 'vs/workbench/contrib/extensions/browser/extensionRecommendAtionNotificAtionService';
import { IExtensionService, toExtensionDescription } from 'vs/workbench/services/extensions/common/extensions';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { ResourceContextKey } from 'vs/workbench/common/resources';

// Singletons
registerSingleton(IExtensionsWorkbenchService, ExtensionsWorkbenchService);
registerSingleton(IExtensionRecommendAtionNotificAtionService, ExtensionRecommendAtionNotificAtionService);
registerSingleton(IExtensionRecommendAtionsService, ExtensionRecommendAtionsService);

Registry.As<IOutputChAnnelRegistry>(OutputExtensions.OutputChAnnels)
	.registerChAnnel({ id: ExtensionsChAnnelId, lAbel: ExtensionsLAbel, log: fAlse });

// Quick Access
Registry.As<IQuickAccessRegistry>(Extensions.QuickAccess).registerQuickAccessProvider({
	ctor: MAnAgeExtensionsQuickAccessProvider,
	prefix: MAnAgeExtensionsQuickAccessProvider.PREFIX,
	plAceholder: locAlize('mAnAgeExtensionsQuickAccessPlAceholder', "Press Enter to mAnAge extensions."),
	helpEntries: [{ description: locAlize('mAnAgeExtensionsHelp', "MAnAge Extensions"), needsEditor: fAlse }]
});

// Explorer
MenuRegistry.AppendMenuItem(MenuId.ExplorerContext, {
	group: '4_extensions',
	commAnd: {
		id: INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID,
		title: locAlize('instAllVSIX', "InstAll VSIX"),
	},
	when: ResourceContextKey.Extension.isEquAlTo('.vsix')
});

// Editor
Registry.As<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.creAte(
		ExtensionEditor,
		ExtensionEditor.ID,
		locAlize('extension', "Extension")
	),
	[
		new SyncDescriptor(ExtensionsInput)
	]);

Registry.As<IViewContAinersRegistry>(ViewContAinerExtensions.ViewContAinersRegistry).registerViewContAiner(
	{
		id: VIEWLET_ID,
		nAme: locAlize('extensions', "Extensions"),
		ctorDescriptor: new SyncDescriptor(ExtensionsViewPAneContAiner),
		icon: 'codicon-extensions',
		order: 4,
		rejectAddedViews: true,
		AlwAysUseContAinerInfo: true
	}, ViewContAinerLocAtion.SidebAr);


Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion)
	.registerConfigurAtion({
		id: 'extensions',
		order: 30,
		title: locAlize('extensionsConfigurAtionTitle', "Extensions"),
		type: 'object',
		properties: {
			'extensions.AutoUpdAte': {
				type: 'booleAn',
				description: locAlize('extensionsAutoUpdAte', "When enAbled, AutomAticAlly instAlls updAtes for extensions. The updAtes Are fetched from A Microsoft online service."),
				defAult: true,
				scope: ConfigurAtionScope.APPLICATION,
				tAgs: ['usesOnlineServices']
			},
			'extensions.AutoCheckUpdAtes': {
				type: 'booleAn',
				description: locAlize('extensionsCheckUpdAtes', "When enAbled, AutomAticAlly checks extensions for updAtes. If An extension hAs An updAte, it is mArked As outdAted in the Extensions view. The updAtes Are fetched from A Microsoft online service."),
				defAult: true,
				scope: ConfigurAtionScope.APPLICATION,
				tAgs: ['usesOnlineServices']
			},
			'extensions.ignoreRecommendAtions': {
				type: 'booleAn',
				description: locAlize('extensionsIgnoreRecommendAtions', "When enAbled, the notificAtions for extension recommendAtions will not be shown."),
				defAult: fAlse
			},
			'extensions.showRecommendAtionsOnlyOnDemAnd': {
				type: 'booleAn',
				description: locAlize('extensionsShowRecommendAtionsOnlyOnDemAnd', "When enAbled, recommendAtions will not be fetched or shown unless specificAlly requested by the user. Some recommendAtions Are fetched from A Microsoft online service."),
				defAult: fAlse,
				tAgs: ['usesOnlineServices']
			},
			'extensions.closeExtensionDetAilsOnViewChAnge': {
				type: 'booleAn',
				description: locAlize('extensionsCloseExtensionDetAilsOnViewChAnge', "When enAbled, editors with extension detAils will be AutomAticAlly closed upon nAvigAting AwAy from the Extensions View."),
				defAult: fAlse
			},
			'extensions.confirmedUriHAndlerExtensionIds': {
				type: 'ArrAy',
				description: locAlize('hAndleUriConfirmedExtensions', "When An extension is listed here, A confirmAtion prompt will not be shown when thAt extension hAndles A URI."),
				defAult: []
			},
			'extensions.webWorker': {
				type: 'booleAn',
				description: locAlize('extensionsWebWorker', "EnAble web worker extension host."),
				defAult: fAlse
			}
		}
	});

const jsonRegistry = <jsonContributionRegistry.IJSONContributionRegistry>Registry.As(jsonContributionRegistry.Extensions.JSONContribution);
jsonRegistry.registerSchemA(ExtensionsConfigurAtionSchemAId, ExtensionsConfigurAtionSchemA);

// Register CommAnds
CommAndsRegistry.registerCommAnd('_extensions.mAnAge', (Accessor: ServicesAccessor, extensionId: string) => {
	const extensionService = Accessor.get(IExtensionsWorkbenchService);
	const extension = extensionService.locAl.filter(e => AreSAmeExtensions(e.identifier, { id: extensionId }));
	if (extension.length === 1) {
		extensionService.open(extension[0]);
	}
});

CommAndsRegistry.registerCommAnd('extension.open', (Accessor: ServicesAccessor, extensionId: string) => {
	const extensionService = Accessor.get(IExtensionsWorkbenchService);

	return extensionService.queryGAllery({ nAmes: [extensionId], pAgeSize: 1 }, CAncellAtionToken.None).then(pAger => {
		if (pAger.totAl !== 1) {
			return;
		}

		extensionService.open(pAger.firstPAge[0]);
	});
});

CommAndsRegistry.registerCommAnd({
	id: 'workbench.extensions.instAllExtension',
	description: {
		description: locAlize('workbench.extensions.instAllExtension.description', "InstAll the given extension"),
		Args: [
			{
				nAme: locAlize('workbench.extensions.instAllExtension.Arg.nAme', "Extension id or VSIX resource uri"),
				schemA: {
					'type': ['object', 'string']
				}
			}
		]
	},
	hAndler: Async (Accessor, Arg: string | UriComponents) => {
		const extensionMAnAgementService = Accessor.get(IExtensionMAnAgementService);
		const extensionGAlleryService = Accessor.get(IExtensionGAlleryService);
		try {
			if (typeof Arg === 'string') {
				const extension = AwAit extensionGAlleryService.getCompAtibleExtension({ id: Arg });
				if (extension) {
					AwAit extensionMAnAgementService.instAllFromGAllery(extension);
				} else {
					throw new Error(locAlize('notFound', "Extension '{0}' not found.", Arg));
				}
			} else {
				const vsix = URI.revive(Arg);
				AwAit extensionMAnAgementService.instAll(vsix);
			}
		} cAtch (e) {
			onUnexpectedError(e);
			throw e;
		}
	}
});

CommAndsRegistry.registerCommAnd({
	id: INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID,
	hAndler: Async (Accessor: ServicesAccessor, resources: URI[] | URI) => {
		const extensionService = Accessor.get(IExtensionService);
		const extensionsWorkbenchService = Accessor.get(IExtensionsWorkbenchService);
		const instAntiAtionService = Accessor.get(IInstAntiAtionService);
		const hostService = Accessor.get(IHostService);
		const notificAtionService = Accessor.get(INotificAtionService);

		const viewletService = Accessor.get(IViewletService);
		const viewlet = AwAit viewletService.openViewlet(VIEWLET_ID, true);

		if (!viewlet) {
			return;
		}

		const extensions = ArrAy.isArrAy(resources) ? resources : [resources];
		AwAit Promise.All(extensions.mAp(Async (vsix) => AwAit extensionsWorkbenchService.instAll(vsix)))
			.then(Async (extensions) => {
				for (const extension of extensions) {
					const requireReloAd = !(extension.locAl && extensionService.cAnAddExtension(toExtensionDescription(extension.locAl)));
					const messAge = requireReloAd ? locAlize('InstAllVSIXAction.successReloAd', "PleAse reloAd VisuAl Studio Code to complete instAlling the extension {0}.", extension.displAyNAme || extension.nAme)
						: locAlize('InstAllVSIXAction.success', "Completed instAlling the extension {0}.", extension.displAyNAme || extension.nAme);
					const Actions = requireReloAd ? [{
						lAbel: locAlize('InstAllVSIXAction.reloAdNow', "ReloAd Now"),
						run: () => hostService.reloAd()
					}] : [];
					notificAtionService.prompt(
						Severity.Info,
						messAge,
						Actions,
						{ sticky: true }
					);
				}
				AwAit instAntiAtionService.creAteInstAnce(ShowInstAlledExtensionsAction, ShowInstAlledExtensionsAction.ID, ShowInstAlledExtensionsAction.LABEL).run(true);
			});
	}
});

CommAndsRegistry.registerCommAnd({
	id: 'workbench.extensions.uninstAllExtension',
	description: {
		description: locAlize('workbench.extensions.uninstAllExtension.description', "UninstAll the given extension"),
		Args: [
			{
				nAme: locAlize('workbench.extensions.uninstAllExtension.Arg.nAme', "Id of the extension to uninstAll"),
				schemA: {
					'type': 'string'
				}
			}
		]
	},
	hAndler: Async (Accessor, id: string) => {
		if (!id) {
			throw new Error(locAlize('id required', "Extension id required."));
		}
		const extensionMAnAgementService = Accessor.get(IExtensionMAnAgementService);
		const instAlled = AwAit extensionMAnAgementService.getInstAlled();
		const [extensionToUninstAll] = instAlled.filter(e => AreSAmeExtensions(e.identifier, { id }));
		if (!extensionToUninstAll) {
			throw new Error(locAlize('notInstAlled', "Extension '{0}' is not instAlled. MAke sure you use the full extension ID, including the publisher, e.g.: ms-dotnettools.cshArp.", id));
		}
		if (extensionToUninstAll.isBuiltin) {
			throw new Error(locAlize('builtin', "Extension '{0}' is A Built-in extension And cAnnot be instAlled", id));
		}

		try {
			AwAit extensionMAnAgementService.uninstAll(extensionToUninstAll, true);
		} cAtch (e) {
			onUnexpectedError(e);
			throw e;
		}
	}
});

CommAndsRegistry.registerCommAnd({
	id: 'workbench.extensions.seArch',
	description: {
		description: locAlize('workbench.extensions.seArch.description', "SeArch for A specific extension"),
		Args: [
			{
				nAme: locAlize('workbench.extensions.seArch.Arg.nAme', "Query to use in seArch"),
				schemA: { 'type': 'string' }
			}
		]
	},
	hAndler: Async (Accessor, query: string = '') => {
		const viewletService = Accessor.get(IViewletService);
		const viewlet = AwAit viewletService.openViewlet(VIEWLET_ID, true);

		if (!viewlet) {
			return;
		}

		(viewlet.getViewPAneContAiner() As IExtensionsViewPAneContAiner).seArch(query);
		viewlet.focus();
	}
});

// File menu registrAtion

MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
	group: '2_keybindings',
	commAnd: {
		id: ShowRecommendedKeymApExtensionsAction.ID,
		title: locAlize({ key: 'miOpenKeymApExtensions', comment: ['&& denotes A mnemonic'] }, "&&KeymAps")
	},
	order: 2
});

MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
	group: '2_keybindings',
	commAnd: {
		id: ShowRecommendedKeymApExtensionsAction.ID,
		title: locAlize('miOpenKeymApExtensions2', "KeymAps")
	},
	order: 2
});

MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
	group: '1_settings',
	commAnd: {
		id: VIEWLET_ID,
		title: locAlize({ key: 'miPreferencesExtensions', comment: ['&& denotes A mnemonic'] }, "&&Extensions")
	},
	order: 3
});

// View menu

MenuRegistry.AppendMenuItem(MenuId.MenubArViewMenu, {
	group: '3_views',
	commAnd: {
		id: VIEWLET_ID,
		title: locAlize({ key: 'miViewExtensions', comment: ['&& denotes A mnemonic'] }, "E&&xtensions")
	},
	order: 5
});

// GlobAl Activity Menu

MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
	group: '2_configurAtion',
	commAnd: {
		id: VIEWLET_ID,
		title: locAlize('showExtensions', "Extensions")
	},
	order: 3
});

function overrideActionForActiveExtensionEditorWebview(commAnd: MultiCommAnd | undefined, f: (webview: Webview) => void) {
	commAnd?.AddImplementAtion(105, (Accessor) => {
		const editorService = Accessor.get(IEditorService);
		const editor = editorService.ActiveEditorPAne;
		if (editor instAnceof ExtensionEditor) {
			if (editor.ActiveWebview?.isFocused) {
				f(editor.ActiveWebview);
				return true;
			}
		}
		return fAlse;
	});
}

overrideActionForActiveExtensionEditorWebview(CopyAction, webview => webview.copy());
overrideActionForActiveExtensionEditorWebview(CutAction, webview => webview.cut());
overrideActionForActiveExtensionEditorWebview(PAsteAction, webview => webview.pAste());

// Contexts
export const CONTEXT_HAS_GALLERY = new RAwContextKey<booleAn>('hAsGAllery', fAlse);
export const CONTEXT_HAS_LOCAL_SERVER = new RAwContextKey<booleAn>('hAsLocAlServer', fAlse);
export const CONTEXT_HAS_REMOTE_SERVER = new RAwContextKey<booleAn>('hAsRemoteServer', fAlse);
export const CONTEXT_HAS_WEB_SERVER = new RAwContextKey<booleAn>('hAsWebServer', fAlse);

clAss ExtensionsContributions implements IWorkbenchContribution {

	constructor(
		@IExtensionMAnAgementServerService privAte reAdonly extensionMAnAgementServerService: IExtensionMAnAgementServerService,
		@IExtensionGAlleryService extensionGAlleryService: IExtensionGAlleryService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		const hAsGAlleryContext = CONTEXT_HAS_GALLERY.bindTo(contextKeyService);
		if (extensionGAlleryService.isEnAbled()) {
			hAsGAlleryContext.set(true);
		}

		const hAsLocAlServerContext = CONTEXT_HAS_LOCAL_SERVER.bindTo(contextKeyService);
		if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			hAsLocAlServerContext.set(true);
		}

		const hAsRemoteServerContext = CONTEXT_HAS_REMOTE_SERVER.bindTo(contextKeyService);
		if (this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			hAsRemoteServerContext.set(true);
		}

		const hAsWebServerContext = CONTEXT_HAS_WEB_SERVER.bindTo(contextKeyService);
		if (this.extensionMAnAgementServerService.webExtensionMAnAgementServer) {
			hAsWebServerContext.set(true);
		}

		this.registerGlobAlActions();
		this.registerContextMenuActions();
		this.registerQuickAccessProvider();
	}

	privAte registerQuickAccessProvider(): void {
		if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer
			|| this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer
			|| this.extensionMAnAgementServerService.webExtensionMAnAgementServer
		) {
			Registry.As<IQuickAccessRegistry>(Extensions.QuickAccess).registerQuickAccessProvider({
				ctor: InstAllExtensionQuickAccessProvider,
				prefix: InstAllExtensionQuickAccessProvider.PREFIX,
				plAceholder: locAlize('instAllExtensionQuickAccessPlAceholder', "Type the nAme of An extension to instAll or seArch."),
				helpEntries: [{ description: locAlize('instAllExtensionQuickAccessHelp', "InstAll or SeArch Extensions"), needsEditor: fAlse }]
			});
		}
	}

	// GlobAl Actions
	privAte registerGlobAlActions(): void {
		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: OpenExtensionsViewletAction.ID,
					title: { vAlue: OpenExtensionsViewletAction.LABEL, originAl: 'Show Extensions' },
					cAtegory: CATEGORIES.View,
					menu: {
						id: MenuId.CommAndPAlette,
					},
					keybinding: {
						primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_X,
						weight: KeybindingWeight.WorkbenchContrib
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(OpenExtensionsViewletAction, OpenExtensionsViewletAction.ID, OpenExtensionsViewletAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: InstAllExtensionsAction.ID,
					title: { vAlue: InstAllExtensionsAction.LABEL, originAl: 'InstAll Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyAndExpr.creAte([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(InstAllExtensionsAction, InstAllExtensionsAction.ID, InstAllExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowOutdAtedExtensionsAction.ID,
					title: { vAlue: ShowOutdAtedExtensionsAction.LABEL, originAl: 'Show OutdAted Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyAndExpr.creAte([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowOutdAtedExtensionsAction, ShowOutdAtedExtensionsAction.ID, ShowOutdAtedExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowRecommendedExtensionsAction.ID,
					title: { vAlue: ShowRecommendedExtensionsAction.LABEL, originAl: 'Show Recommended Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: CONTEXT_HAS_GALLERY
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowRecommendedExtensionsAction, ShowRecommendedExtensionsAction.ID, ShowRecommendedExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowRecommendedKeymApExtensionsAction.ID,
					title: { vAlue: ShowRecommendedKeymApExtensionsAction.LABEL, originAl: 'KeymAps' },
					cAtegory: PreferencesLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: CONTEXT_HAS_GALLERY
					},
					keybinding: {
						primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_M),
						weight: KeybindingWeight.WorkbenchContrib
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowRecommendedKeymApExtensionsAction, ShowRecommendedKeymApExtensionsAction.ID, ShowRecommendedKeymApExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowLAnguAgeExtensionsAction.ID,
					title: { vAlue: ShowLAnguAgeExtensionsAction.LABEL, originAl: 'LAnguAge Extensions' },
					cAtegory: PreferencesLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: CONTEXT_HAS_GALLERY
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowLAnguAgeExtensionsAction, ShowLAnguAgeExtensionsAction.ID, ShowLAnguAgeExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowPopulArExtensionsAction.ID,
					title: { vAlue: ShowPopulArExtensionsAction.LABEL, originAl: 'Show PopulAr Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: CONTEXT_HAS_GALLERY
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowPopulArExtensionsAction, ShowPopulArExtensionsAction.ID, ShowPopulArExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowEnAbledExtensionsAction.ID,
					title: { vAlue: ShowEnAbledExtensionsAction.LABEL, originAl: 'Show EnAbled Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowEnAbledExtensionsAction, ShowEnAbledExtensionsAction.ID, ShowEnAbledExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowInstAlledExtensionsAction.ID,
					title: { vAlue: ShowInstAlledExtensionsAction.LABEL, originAl: 'Show InstAlled Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowInstAlledExtensionsAction, ShowInstAlledExtensionsAction.ID, ShowInstAlledExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowDisAbledExtensionsAction.ID,
					title: { vAlue: ShowDisAbledExtensionsAction.LABEL, originAl: 'Show DisAbled Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowDisAbledExtensionsAction, ShowDisAbledExtensionsAction.ID, ShowDisAbledExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ShowBuiltInExtensionsAction.ID,
					title: { vAlue: ShowBuiltInExtensionsAction.LABEL, originAl: 'Show Built-in Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ShowBuiltInExtensionsAction, ShowBuiltInExtensionsAction.ID, ShowBuiltInExtensionsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: UpdAteAllAction.ID,
					title: { vAlue: UpdAteAllAction.LABEL, originAl: 'UpdAte All Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyAndExpr.creAte([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(UpdAteAllAction, UpdAteAllAction.ID, UpdAteAllAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: InstAllVSIXAction.ID,
					title: { vAlue: InstAllVSIXAction.LABEL, originAl: 'InstAll from VSIX...' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(InstAllVSIXAction, InstAllVSIXAction.ID, InstAllVSIXAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: DisAbleAllAction.ID,
					title: { vAlue: DisAbleAllAction.LABEL, originAl: 'DisAble All InstAlled Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(DisAbleAllAction, DisAbleAllAction.ID, DisAbleAllAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: DisAbleAllWorkspAceAction.ID,
					title: { vAlue: DisAbleAllWorkspAceAction.LABEL, originAl: 'DisAble All InstAlled Extensions for this WorkspAce' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyAndExpr.creAte([WorkbenchStAteContext.notEquAlsTo('empty'), ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(DisAbleAllWorkspAceAction, DisAbleAllWorkspAceAction.ID, DisAbleAllWorkspAceAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: EnAbleAllAction.ID,
					title: { vAlue: EnAbleAllAction.LABEL, originAl: 'EnAble All Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(EnAbleAllAction, EnAbleAllAction.ID, EnAbleAllAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: EnAbleAllWorkspAceAction.ID,
					title: { vAlue: EnAbleAllWorkspAceAction.LABEL, originAl: 'EnAble All Extensions for this WorkspAce' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyAndExpr.creAte([WorkbenchStAteContext.notEquAlsTo('empty'), ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(EnAbleAllWorkspAceAction, EnAbleAllWorkspAceAction.ID, EnAbleAllWorkspAceAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: CheckForUpdAtesAction.ID,
					title: { vAlue: CheckForUpdAtesAction.LABEL, originAl: 'Check for Extension UpdAtes' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyAndExpr.creAte([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(CheckForUpdAtesAction, CheckForUpdAtesAction.ID, CheckForUpdAtesAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: CleArExtensionsSeArchResultsAction.ID,
					title: { vAlue: CleArExtensionsSeArchResultsAction.LABEL, originAl: 'CleAr Extensions SeArch Results' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(CleArExtensionsSeArchResultsAction, CleArExtensionsSeArchResultsAction.ID, CleArExtensionsSeArchResultsAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: EnAbleAutoUpdAteAction.ID,
					title: { vAlue: EnAbleAutoUpdAteAction.LABEL, originAl: 'EnAble Auto UpdAting Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(EnAbleAutoUpdAteAction, EnAbleAutoUpdAteAction.ID, EnAbleAutoUpdAteAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: DisAbleAutoUpdAteAction.ID,
					title: { vAlue: DisAbleAutoUpdAteAction.LABEL, originAl: 'DisAble Auto UpdAting Extensions' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(DisAbleAutoUpdAteAction, DisAbleAutoUpdAteAction.ID, DisAbleAutoUpdAteAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: InstAllSpecificVersionOfExtensionAction.ID,
					title: { vAlue: InstAllSpecificVersionOfExtensionAction.LABEL, originAl: 'InstAll Specific Version of Extension...' },
					cAtegory: ExtensionsLocAlizedLAbel,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyAndExpr.creAte([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(InstAllSpecificVersionOfExtensionAction, InstAllSpecificVersionOfExtensionAction.ID, InstAllSpecificVersionOfExtensionAction.LABEL).run();
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: ReinstAllAction.ID,
					title: { vAlue: ReinstAllAction.LABEL, originAl: 'ReinstAll Extension...' },
					cAtegory: CATEGORIES.Developer,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyAndExpr.creAte([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.creAte([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER])])
					}
				});
			}
			run(Accessor: ServicesAccessor) {
				return Accessor.get(IInstAntiAtionService).creAteInstAnce(ReinstAllAction, ReinstAllAction.ID, ReinstAllAction.LABEL).run();
			}
		});
	}

	// Extension Context Menu
	privAte registerContextMenuActions(): void {
		registerAction2(clAss extends Action2 {

			constructor() {
				super({
					id: 'workbench.extensions.Action.copyExtension',
					title: { vAlue: locAlize('workbench.extensions.Action.copyExtension', "Copy"), originAl: 'Copy' },
					menu: {
						id: MenuId.ExtensionContext,
						group: '1_copy'
					}
				});
			}

			Async run(Accessor: ServicesAccessor, extensionId: string) {
				const extensionWorkbenchService = Accessor.get(IExtensionsWorkbenchService);
				let extension = extensionWorkbenchService.locAl.filter(e => AreSAmeExtensions(e.identifier, { id: extensionId }))[0]
					|| (AwAit extensionWorkbenchService.queryGAllery({ nAmes: [extensionId], pAgeSize: 1 }, CAncellAtionToken.None)).firstPAge[0];
				if (extension) {
					const nAme = locAlize('extensionInfoNAme', 'NAme: {0}', extension.displAyNAme);
					const id = locAlize('extensionInfoId', 'Id: {0}', extensionId);
					const description = locAlize('extensionInfoDescription', 'Description: {0}', extension.description);
					const verision = locAlize('extensionInfoVersion', 'Version: {0}', extension.version);
					const publisher = locAlize('extensionInfoPublisher', 'Publisher: {0}', extension.publisherDisplAyNAme);
					const link = extension.url ? locAlize('extensionInfoVSMArketplAceLink', 'VS MArketplAce Link: {0}', `${extension.url}`) : null;
					const clipboArdStr = `${nAme}\n${id}\n${description}\n${verision}\n${publisher}${link ? '\n' + link : ''}`;
					AwAit Accessor.get(IClipboArdService).writeText(clipboArdStr);
				}
			}
		});

		registerAction2(clAss extends Action2 {

			constructor() {
				super({
					id: 'workbench.extensions.Action.copyExtensionId',
					title: { vAlue: locAlize('workbench.extensions.Action.copyExtensionId', "Copy Extension Id"), originAl: 'Copy Extension Id' },
					menu: {
						id: MenuId.ExtensionContext,
						group: '1_copy'
					}
				});
			}

			Async run(Accessor: ServicesAccessor, id: string) {
				AwAit Accessor.get(IClipboArdService).writeText(id);
			}
		});

		registerAction2(clAss extends Action2 {

			constructor() {
				super({
					id: 'workbench.extensions.Action.configure',
					title: { vAlue: locAlize('workbench.extensions.Action.configure', "Extension Settings"), originAl: 'Extension Settings' },
					menu: {
						id: MenuId.ExtensionContext,
						group: '2_configure',
						when: ContextKeyExpr.And(ContextKeyExpr.equAls('extensionStAtus', 'instAlled'), ContextKeyExpr.hAs('extensionHAsConfigurAtion'))
					}
				});
			}

			Async run(Accessor: ServicesAccessor, id: string) {
				AwAit Accessor.get(IPreferencesService).openSettings(fAlse, `@ext:${id}`);
			}
		});

		registerAction2(clAss extends Action2 {

			constructor() {
				super({
					id: TOGGLE_IGNORE_EXTENSION_ACTION_ID,
					title: { vAlue: locAlize('workbench.extensions.Action.toggleIgnoreExtension', "Sync This Extension"), originAl: `Sync This Extension` },
					menu: {
						id: MenuId.ExtensionContext,
						group: '2_configure',
						when: CONTEXT_SYNC_ENABLEMENT
					},
				});
			}

			Async run(Accessor: ServicesAccessor, id: string) {
				const extensionsWorkbenchService = Accessor.get(IExtensionsWorkbenchService);
				const extension = extensionsWorkbenchService.locAl.find(e => AreSAmeExtensions({ id }, e.identifier));
				if (extension) {
					return extensionsWorkbenchService.toggleExtensionIgnoredToSync(extension);
				}
			}
		});
	}
}

const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExtensionsContributions, LifecyclePhAse.StArting);
workbenchRegistry.registerWorkbenchContribution(StAtusUpdAter, LifecyclePhAse.Restored);
workbenchRegistry.registerWorkbenchContribution(MAliciousExtensionChecker, LifecyclePhAse.EventuAlly);
workbenchRegistry.registerWorkbenchContribution(ConfigureRecommendedExtensionsCommAndsContributor, LifecyclePhAse.EventuAlly);
workbenchRegistry.registerWorkbenchContribution(KeymApExtensions, LifecyclePhAse.Restored);
workbenchRegistry.registerWorkbenchContribution(ExtensionsViewletViewsContribution, LifecyclePhAse.StArting);
workbenchRegistry.registerWorkbenchContribution(ExtensionActivAtionProgress, LifecyclePhAse.EventuAlly);
workbenchRegistry.registerWorkbenchContribution(ExtensionDependencyChecker, LifecyclePhAse.EventuAlly);
workbenchRegistry.registerWorkbenchContribution(RemoteExtensionsInstAller, LifecyclePhAse.EventuAlly);
