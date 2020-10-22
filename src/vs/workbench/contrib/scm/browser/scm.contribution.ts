/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { DirtyDiffWorkBenchController } from './dirtydiffDecorator';
import { VIEWLET_ID, ISCMRepository, ISCMService, VIEW_PANE_ID, ISCMProvider, ISCMViewService, REPOSITORIES_VIEW_PANE_ID } from 'vs/workBench/contriB/scm/common/scm';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { SCMStatusController } from './activity';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { IContextKeyService, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { CommandsRegistry, ICommandService } from 'vs/platform/commands/common/commands';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { SCMService } from 'vs/workBench/contriB/scm/common/scmService';
import { IViewContainersRegistry, ViewContainerLocation, Extensions as ViewContainerExtensions, IViewsRegistry, IViewsService } from 'vs/workBench/common/views';
import { SCMViewPaneContainer } from 'vs/workBench/contriB/scm/Browser/scmViewPaneContainer';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { Codicon } from 'vs/Base/common/codicons';
import { SCMViewPane } from 'vs/workBench/contriB/scm/Browser/scmViewPane';
import { SCMViewService } from 'vs/workBench/contriB/scm/Browser/scmViewService';
import { SCMRepositoriesViewPane } from 'vs/workBench/contriB/scm/Browser/scmRepositoriesViewPane';

ModesRegistry.registerLanguage({
	id: 'scminput',
	extensions: [],
	mimetypes: ['text/x-scm-input']
});

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(DirtyDiffWorkBenchController, LifecyclePhase.Restored);

const viewContainer = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
	id: VIEWLET_ID,
	name: localize('source control', "Source Control"),
	ctorDescriptor: new SyncDescriptor(SCMViewPaneContainer),
	storageId: 'workBench.scm.views.state',
	icon: Codicon.sourceControl.classNames,
	alwaysUseContainerInfo: true,
	order: 2,
	hideIfEmpty: true
}, ViewContainerLocation.SideBar);

const viewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);

viewsRegistry.registerViewWelcomeContent(VIEW_PANE_ID, {
	content: localize('no open repo', "No source control providers registered."),
	when: 'default'
});

viewsRegistry.registerViews([{
	id: VIEW_PANE_ID,
	name: localize('source control', "Source Control"),
	ctorDescriptor: new SyncDescriptor(SCMViewPane),
	canToggleVisiBility: true,
	workspace: true,
	canMoveView: true,
	weight: 80,
	order: -999,
	containerIcon: Codicon.sourceControl.classNames
}], viewContainer);

viewsRegistry.registerViews([{
	id: REPOSITORIES_VIEW_PANE_ID,
	name: localize('source control repositories', "Source Control Repositories"),
	ctorDescriptor: new SyncDescriptor(SCMRepositoriesViewPane),
	canToggleVisiBility: true,
	hideByDefault: true,
	workspace: true,
	canMoveView: true,
	weight: 20,
	order: -1000,
	when: ContextKeyExpr.and(ContextKeyExpr.has('scm.providerCount'), ContextKeyExpr.notEquals('scm.providerCount', 0)),
	// readonly when = ContextKeyExpr.or(ContextKeyExpr.equals('config.scm.alwaysShowProviders', true), ContextKeyExpr.and(ContextKeyExpr.notEquals('scm.providerCount', 0), ContextKeyExpr.notEquals('scm.providerCount', 1)));
	containerIcon: Codicon.sourceControl.classNames
}], viewContainer);

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(SCMStatusController, LifecyclePhase.Restored);

// Register Action to Open View
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: VIEWLET_ID,
	description: { description: localize('toggleSCMViewlet', "Show SCM"), args: [] },
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: 0,
	win: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_G },
	linux: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_G },
	mac: { primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.KEY_G },
	handler: async accessor => {
		const viewsService = accessor.get(IViewsService);
		const view = await viewsService.openView(VIEW_PANE_ID);
		view?.focus();
	}
});

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
	id: 'scm',
	order: 5,
	title: localize('scmConfigurationTitle', "SCM"),
	type: 'oBject',
	scope: ConfigurationScope.RESOURCE,
	properties: {
		'scm.diffDecorations': {
			type: 'string',
			enum: ['all', 'gutter', 'overview', 'minimap', 'none'],
			enumDescriptions: [
				localize('scm.diffDecorations.all', "Show the diff decorations in all availaBle locations."),
				localize('scm.diffDecorations.gutter', "Show the diff decorations only in the editor gutter."),
				localize('scm.diffDecorations.overviewRuler', "Show the diff decorations only in the overview ruler."),
				localize('scm.diffDecorations.minimap', "Show the diff decorations only in the minimap."),
				localize('scm.diffDecorations.none', "Do not show the diff decorations.")
			],
			default: 'all',
			description: localize('diffDecorations', "Controls diff decorations in the editor.")
		},
		'scm.diffDecorationsGutterWidth': {
			type: 'numBer',
			enum: [1, 2, 3, 4, 5],
			default: 3,
			description: localize('diffGutterWidth', "Controls the width(px) of diff decorations in gutter (added & modified).")
		},
		'scm.diffDecorationsGutterVisiBility': {
			type: 'string',
			enum: ['always', 'hover'],
			enumDescriptions: [
				localize('scm.diffDecorationsGutterVisiBility.always', "Show the diff decorator in the gutter at all times."),
				localize('scm.diffDecorationsGutterVisiBility.hover', "Show the diff decorator in the gutter only on hover.")
			],
			description: localize('scm.diffDecorationsGutterVisiBility', "Controls the visiBility of the Source Control diff decorator in the gutter."),
			default: 'always'
		},
		'scm.alwaysShowActions': {
			type: 'Boolean',
			description: localize('alwaysShowActions', "Controls whether inline actions are always visiBle in the Source Control view."),
			default: false
		},
		'scm.countBadge': {
			type: 'string',
			enum: ['all', 'focused', 'off'],
			enumDescriptions: [
				localize('scm.countBadge.all', "Show the sum of all Source Control Provider count Badges."),
				localize('scm.countBadge.focused', "Show the count Badge of the focused Source Control Provider."),
				localize('scm.countBadge.off', "DisaBle the Source Control count Badge.")
			],
			description: localize('scm.countBadge', "Controls the count Badge on the Source Control icon on the Activity Bar."),
			default: 'all'
		},
		'scm.providerCountBadge': {
			type: 'string',
			enum: ['hidden', 'auto', 'visiBle'],
			enumDescriptions: [
				localize('scm.providerCountBadge.hidden', "Hide Source Control Provider count Badges."),
				localize('scm.providerCountBadge.auto', "Only show count Badge for Source Control Provider when non-zero."),
				localize('scm.providerCountBadge.visiBle', "Show Source Control Provider count Badges.")
			],
			description: localize('scm.providerCountBadge', "Controls the count Badges on Source Control Provider headers. These headers only appear when there is more than one provider."),
			default: 'hidden'
		},
		'scm.defaultViewMode': {
			type: 'string',
			enum: ['tree', 'list'],
			enumDescriptions: [
				localize('scm.defaultViewMode.tree', "Show the repository changes as a tree."),
				localize('scm.defaultViewMode.list', "Show the repository changes as a list.")
			],
			description: localize('scm.defaultViewMode', "Controls the default Source Control repository view mode."),
			default: 'list'
		},
		'scm.autoReveal': {
			type: 'Boolean',
			description: localize('autoReveal', "Controls whether the SCM view should automatically reveal and select files when opening them."),
			default: true
		},
		'scm.inputFontFamily': {
			type: 'string',
			markdownDescription: localize('inputFontFamily', "Controls the font for the input message. Use `default` for the workBench user interface font family, `editor` for the `#editor.fontFamily#`'s value, or a custom font family."),
			default: 'default'
		},
		'scm.alwaysShowRepositories': {
			type: 'Boolean',
			markdownDescription: localize('alwaysShowRepository', "Controls whether repositories should always Be visiBle in the SCM view."),
			default: false
		},
		'scm.repositories.visiBle': {
			type: 'numBer',
			description: localize('providersVisiBle', "Controls how many repositories are visiBle in the Source Control Repositories section. Set to `0` to Be aBle to manually resize the view."),
			default: 10
		}
	}
});

// View menu

MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '3_views',
	command: {
		id: VIEWLET_ID,
		title: localize({ key: 'miViewSCM', comment: ['&& denotes a mnemonic'] }, "S&&CM")
	},
	order: 3
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'scm.acceptInput',
	description: { description: localize('scm accept', "SCM: Accept Input"), args: [] },
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.has('scmRepository'),
	primary: KeyMod.CtrlCmd | KeyCode.Enter,
	handler: accessor => {
		const contextKeyService = accessor.get(IContextKeyService);
		const context = contextKeyService.getContext(document.activeElement);
		const repository = context.getValue<ISCMRepository>('scmRepository');

		if (!repository || !repository.provider.acceptInputCommand) {
			return Promise.resolve(null);
		}
		const id = repository.provider.acceptInputCommand.id;
		const args = repository.provider.acceptInputCommand.arguments;

		const commandService = accessor.get(ICommandService);
		return commandService.executeCommand(id, ...(args || []));
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'scm.viewNextCommit',
	description: { description: localize('scm view next commit', "SCM: View Next Commit"), args: [] },
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.has('scmInputIsInLastLine'),
	primary: KeyCode.DownArrow,
	handler: accessor => {
		const contextKeyService = accessor.get(IContextKeyService);
		const context = contextKeyService.getContext(document.activeElement);
		const repository = context.getValue<ISCMRepository>('scmRepository');
		repository?.input.showNextHistoryValue();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'scm.viewPriorCommit',
	description: { description: localize('scm view prior commit', "SCM: View Prior Commit"), args: [] },
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.has('scmInputIsInFirstLine'),
	primary: KeyCode.UpArrow,
	handler: accessor => {
		const contextKeyService = accessor.get(IContextKeyService);
		const context = contextKeyService.getContext(document.activeElement);
		const repository = context.getValue<ISCMRepository>('scmRepository');
		repository?.input.showPreviousHistoryValue();
	}
});

CommandsRegistry.registerCommand('scm.openInTerminal', async (accessor, provider: ISCMProvider) => {
	if (!provider || !provider.rootUri) {
		return;
	}

	const commandService = accessor.get(ICommandService);
	await commandService.executeCommand('openInTerminal', provider.rootUri);
});

MenuRegistry.appendMenuItem(MenuId.SCMSourceControl, {
	group: '100_end',
	command: {
		id: 'scm.openInTerminal',
		title: localize('open in terminal', "Open In Terminal")
	},
	when: ContextKeyExpr.equals('scmProviderHasRootUri', true)
});

registerSingleton(ISCMService, SCMService);
registerSingleton(ISCMViewService, SCMViewService);
