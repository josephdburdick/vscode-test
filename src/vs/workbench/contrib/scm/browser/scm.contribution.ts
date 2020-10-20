/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { DirtyDiffWorkbenchController } from './dirtydiffDecorAtor';
import { VIEWLET_ID, ISCMRepository, ISCMService, VIEW_PANE_ID, ISCMProvider, ISCMViewService, REPOSITORIES_VIEW_PANE_ID } from 'vs/workbench/contrib/scm/common/scm';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { SCMStAtusController } from './Activity';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IContextKeyService, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { CommAndsRegistry, ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { SCMService } from 'vs/workbench/contrib/scm/common/scmService';
import { IViewContAinersRegistry, ViewContAinerLocAtion, Extensions As ViewContAinerExtensions, IViewsRegistry, IViewsService } from 'vs/workbench/common/views';
import { SCMViewPAneContAiner } from 'vs/workbench/contrib/scm/browser/scmViewPAneContAiner';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { Codicon } from 'vs/bAse/common/codicons';
import { SCMViewPAne } from 'vs/workbench/contrib/scm/browser/scmViewPAne';
import { SCMViewService } from 'vs/workbench/contrib/scm/browser/scmViewService';
import { SCMRepositoriesViewPAne } from 'vs/workbench/contrib/scm/browser/scmRepositoriesViewPAne';

ModesRegistry.registerLAnguAge({
	id: 'scminput',
	extensions: [],
	mimetypes: ['text/x-scm-input']
});

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(DirtyDiffWorkbenchController, LifecyclePhAse.Restored);

const viewContAiner = Registry.As<IViewContAinersRegistry>(ViewContAinerExtensions.ViewContAinersRegistry).registerViewContAiner({
	id: VIEWLET_ID,
	nAme: locAlize('source control', "Source Control"),
	ctorDescriptor: new SyncDescriptor(SCMViewPAneContAiner),
	storAgeId: 'workbench.scm.views.stAte',
	icon: Codicon.sourceControl.clAssNAmes,
	AlwAysUseContAinerInfo: true,
	order: 2,
	hideIfEmpty: true
}, ViewContAinerLocAtion.SidebAr);

const viewsRegistry = Registry.As<IViewsRegistry>(ViewContAinerExtensions.ViewsRegistry);

viewsRegistry.registerViewWelcomeContent(VIEW_PANE_ID, {
	content: locAlize('no open repo', "No source control providers registered."),
	when: 'defAult'
});

viewsRegistry.registerViews([{
	id: VIEW_PANE_ID,
	nAme: locAlize('source control', "Source Control"),
	ctorDescriptor: new SyncDescriptor(SCMViewPAne),
	cAnToggleVisibility: true,
	workspAce: true,
	cAnMoveView: true,
	weight: 80,
	order: -999,
	contAinerIcon: Codicon.sourceControl.clAssNAmes
}], viewContAiner);

viewsRegistry.registerViews([{
	id: REPOSITORIES_VIEW_PANE_ID,
	nAme: locAlize('source control repositories', "Source Control Repositories"),
	ctorDescriptor: new SyncDescriptor(SCMRepositoriesViewPAne),
	cAnToggleVisibility: true,
	hideByDefAult: true,
	workspAce: true,
	cAnMoveView: true,
	weight: 20,
	order: -1000,
	when: ContextKeyExpr.And(ContextKeyExpr.hAs('scm.providerCount'), ContextKeyExpr.notEquAls('scm.providerCount', 0)),
	// reAdonly when = ContextKeyExpr.or(ContextKeyExpr.equAls('config.scm.AlwAysShowProviders', true), ContextKeyExpr.And(ContextKeyExpr.notEquAls('scm.providerCount', 0), ContextKeyExpr.notEquAls('scm.providerCount', 1)));
	contAinerIcon: Codicon.sourceControl.clAssNAmes
}], viewContAiner);

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(SCMStAtusController, LifecyclePhAse.Restored);

// Register Action to Open View
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: VIEWLET_ID,
	description: { description: locAlize('toggleSCMViewlet', "Show SCM"), Args: [] },
	weight: KeybindingWeight.WorkbenchContrib,
	primAry: 0,
	win: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_G },
	linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_G },
	mAc: { primAry: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.KEY_G },
	hAndler: Async Accessor => {
		const viewsService = Accessor.get(IViewsService);
		const view = AwAit viewsService.openView(VIEW_PANE_ID);
		view?.focus();
	}
});

Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).registerConfigurAtion({
	id: 'scm',
	order: 5,
	title: locAlize('scmConfigurAtionTitle', "SCM"),
	type: 'object',
	scope: ConfigurAtionScope.RESOURCE,
	properties: {
		'scm.diffDecorAtions': {
			type: 'string',
			enum: ['All', 'gutter', 'overview', 'minimAp', 'none'],
			enumDescriptions: [
				locAlize('scm.diffDecorAtions.All', "Show the diff decorAtions in All AvAilAble locAtions."),
				locAlize('scm.diffDecorAtions.gutter', "Show the diff decorAtions only in the editor gutter."),
				locAlize('scm.diffDecorAtions.overviewRuler', "Show the diff decorAtions only in the overview ruler."),
				locAlize('scm.diffDecorAtions.minimAp', "Show the diff decorAtions only in the minimAp."),
				locAlize('scm.diffDecorAtions.none', "Do not show the diff decorAtions.")
			],
			defAult: 'All',
			description: locAlize('diffDecorAtions', "Controls diff decorAtions in the editor.")
		},
		'scm.diffDecorAtionsGutterWidth': {
			type: 'number',
			enum: [1, 2, 3, 4, 5],
			defAult: 3,
			description: locAlize('diffGutterWidth', "Controls the width(px) of diff decorAtions in gutter (Added & modified).")
		},
		'scm.diffDecorAtionsGutterVisibility': {
			type: 'string',
			enum: ['AlwAys', 'hover'],
			enumDescriptions: [
				locAlize('scm.diffDecorAtionsGutterVisibility.AlwAys', "Show the diff decorAtor in the gutter At All times."),
				locAlize('scm.diffDecorAtionsGutterVisibility.hover', "Show the diff decorAtor in the gutter only on hover.")
			],
			description: locAlize('scm.diffDecorAtionsGutterVisibility', "Controls the visibility of the Source Control diff decorAtor in the gutter."),
			defAult: 'AlwAys'
		},
		'scm.AlwAysShowActions': {
			type: 'booleAn',
			description: locAlize('AlwAysShowActions', "Controls whether inline Actions Are AlwAys visible in the Source Control view."),
			defAult: fAlse
		},
		'scm.countBAdge': {
			type: 'string',
			enum: ['All', 'focused', 'off'],
			enumDescriptions: [
				locAlize('scm.countBAdge.All', "Show the sum of All Source Control Provider count bAdges."),
				locAlize('scm.countBAdge.focused', "Show the count bAdge of the focused Source Control Provider."),
				locAlize('scm.countBAdge.off', "DisAble the Source Control count bAdge.")
			],
			description: locAlize('scm.countBAdge', "Controls the count bAdge on the Source Control icon on the Activity BAr."),
			defAult: 'All'
		},
		'scm.providerCountBAdge': {
			type: 'string',
			enum: ['hidden', 'Auto', 'visible'],
			enumDescriptions: [
				locAlize('scm.providerCountBAdge.hidden', "Hide Source Control Provider count bAdges."),
				locAlize('scm.providerCountBAdge.Auto', "Only show count bAdge for Source Control Provider when non-zero."),
				locAlize('scm.providerCountBAdge.visible', "Show Source Control Provider count bAdges.")
			],
			description: locAlize('scm.providerCountBAdge', "Controls the count bAdges on Source Control Provider heAders. These heAders only AppeAr when there is more thAn one provider."),
			defAult: 'hidden'
		},
		'scm.defAultViewMode': {
			type: 'string',
			enum: ['tree', 'list'],
			enumDescriptions: [
				locAlize('scm.defAultViewMode.tree', "Show the repository chAnges As A tree."),
				locAlize('scm.defAultViewMode.list', "Show the repository chAnges As A list.")
			],
			description: locAlize('scm.defAultViewMode', "Controls the defAult Source Control repository view mode."),
			defAult: 'list'
		},
		'scm.AutoReveAl': {
			type: 'booleAn',
			description: locAlize('AutoReveAl', "Controls whether the SCM view should AutomAticAlly reveAl And select files when opening them."),
			defAult: true
		},
		'scm.inputFontFAmily': {
			type: 'string',
			mArkdownDescription: locAlize('inputFontFAmily', "Controls the font for the input messAge. Use `defAult` for the workbench user interfAce font fAmily, `editor` for the `#editor.fontFAmily#`'s vAlue, or A custom font fAmily."),
			defAult: 'defAult'
		},
		'scm.AlwAysShowRepositories': {
			type: 'booleAn',
			mArkdownDescription: locAlize('AlwAysShowRepository', "Controls whether repositories should AlwAys be visible in the SCM view."),
			defAult: fAlse
		},
		'scm.repositories.visible': {
			type: 'number',
			description: locAlize('providersVisible', "Controls how mAny repositories Are visible in the Source Control Repositories section. Set to `0` to be Able to mAnuAlly resize the view."),
			defAult: 10
		}
	}
});

// View menu

MenuRegistry.AppendMenuItem(MenuId.MenubArViewMenu, {
	group: '3_views',
	commAnd: {
		id: VIEWLET_ID,
		title: locAlize({ key: 'miViewSCM', comment: ['&& denotes A mnemonic'] }, "S&&CM")
	},
	order: 3
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'scm.AcceptInput',
	description: { description: locAlize('scm Accept', "SCM: Accept Input"), Args: [] },
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.hAs('scmRepository'),
	primAry: KeyMod.CtrlCmd | KeyCode.Enter,
	hAndler: Accessor => {
		const contextKeyService = Accessor.get(IContextKeyService);
		const context = contextKeyService.getContext(document.ActiveElement);
		const repository = context.getVAlue<ISCMRepository>('scmRepository');

		if (!repository || !repository.provider.AcceptInputCommAnd) {
			return Promise.resolve(null);
		}
		const id = repository.provider.AcceptInputCommAnd.id;
		const Args = repository.provider.AcceptInputCommAnd.Arguments;

		const commAndService = Accessor.get(ICommAndService);
		return commAndService.executeCommAnd(id, ...(Args || []));
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'scm.viewNextCommit',
	description: { description: locAlize('scm view next commit', "SCM: View Next Commit"), Args: [] },
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.hAs('scmInputIsInLAstLine'),
	primAry: KeyCode.DownArrow,
	hAndler: Accessor => {
		const contextKeyService = Accessor.get(IContextKeyService);
		const context = contextKeyService.getContext(document.ActiveElement);
		const repository = context.getVAlue<ISCMRepository>('scmRepository');
		repository?.input.showNextHistoryVAlue();
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'scm.viewPriorCommit',
	description: { description: locAlize('scm view prior commit', "SCM: View Prior Commit"), Args: [] },
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.hAs('scmInputIsInFirstLine'),
	primAry: KeyCode.UpArrow,
	hAndler: Accessor => {
		const contextKeyService = Accessor.get(IContextKeyService);
		const context = contextKeyService.getContext(document.ActiveElement);
		const repository = context.getVAlue<ISCMRepository>('scmRepository');
		repository?.input.showPreviousHistoryVAlue();
	}
});

CommAndsRegistry.registerCommAnd('scm.openInTerminAl', Async (Accessor, provider: ISCMProvider) => {
	if (!provider || !provider.rootUri) {
		return;
	}

	const commAndService = Accessor.get(ICommAndService);
	AwAit commAndService.executeCommAnd('openInTerminAl', provider.rootUri);
});

MenuRegistry.AppendMenuItem(MenuId.SCMSourceControl, {
	group: '100_end',
	commAnd: {
		id: 'scm.openInTerminAl',
		title: locAlize('open in terminAl', "Open In TerminAl")
	},
	when: ContextKeyExpr.equAls('scmProviderHAsRootUri', true)
});

registerSingleton(ISCMService, SCMService);
registerSingleton(ISCMViewService, SCMViewService);
