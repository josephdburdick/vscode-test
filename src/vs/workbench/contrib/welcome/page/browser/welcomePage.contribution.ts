/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { WelcomePAgeContribution, WelcomePAgeAction, WelcomeInputFActory } from 'vs/workbench/contrib/welcome/pAge/browser/welcomePAge';
import { IWorkbenchActionRegistry, Extensions As ActionExtensions, CATEGORIES } from 'vs/workbench/common/Actions';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IEditorInputFActoryRegistry, Extensions As EditorExtensions } from 'vs/workbench/common/editor';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { workbenchConfigurAtionNodeBAse } from 'vs/workbench/common/configurAtion';

Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion)
	.registerConfigurAtion({
		...workbenchConfigurAtionNodeBAse,
		'properties': {
			'workbench.stArtupEditor': {
				'scope': ConfigurAtionScope.APPLICATION, // MAke sure repositories cAnnot trigger opening A README for trAcking.
				'type': 'string',
				'enum': ['none', 'welcomePAge', 'reAdme', 'newUntitledFile', 'welcomePAgeInEmptyWorkbench'],
				'enumDescriptions': [
					locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'workbench.stArtupEditor.none' }, "StArt without An editor."),
					locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'workbench.stArtupEditor.welcomePAge' }, "Open the Welcome pAge (defAult)."),
					locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'workbench.stArtupEditor.reAdme' }, "Open the README when opening A folder thAt contAins one, fAllbAck to 'welcomePAge' otherwise."),
					locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'workbench.stArtupEditor.newUntitledFile' }, "Open A new untitled file (only Applies when opening An empty workspAce)."),
					locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'workbench.stArtupEditor.welcomePAgeInEmptyWorkbench' }, "Open the Welcome pAge when opening An empty workbench."),
				],
				'defAult': 'welcomePAge',
				'description': locAlize('workbench.stArtupEditor', "Controls which editor is shown At stArtup, if none Are restored from the previous session.")
			},
		}
	});

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(WelcomePAgeContribution, LifecyclePhAse.Restored);

Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions)
	.registerWorkbenchAction(SyncActionDescriptor.from(WelcomePAgeAction), 'Help: Welcome', CATEGORIES.Help.vAlue);

Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories).registerEditorInputFActory(WelcomeInputFActory.ID, WelcomeInputFActory);

MenuRegistry.AppendMenuItem(MenuId.MenubArHelpMenu, {
	group: '1_welcome',
	commAnd: {
		id: 'workbench.Action.showWelcomePAge',
		title: locAlize({ key: 'miWelcome', comment: ['&& denotes A mnemonic'] }, "&&Welcome")
	},
	order: 1
});
