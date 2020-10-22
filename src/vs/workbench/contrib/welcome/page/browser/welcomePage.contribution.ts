/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { WelcomePageContriBution, WelcomePageAction, WelcomeInputFactory } from 'vs/workBench/contriB/welcome/page/Browser/welcomePage';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { IEditorInputFactoryRegistry, Extensions as EditorExtensions } from 'vs/workBench/common/editor';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { workBenchConfigurationNodeBase } from 'vs/workBench/common/configuration';

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		...workBenchConfigurationNodeBase,
		'properties': {
			'workBench.startupEditor': {
				'scope': ConfigurationScope.APPLICATION, // Make sure repositories cannot trigger opening a README for tracking.
				'type': 'string',
				'enum': ['none', 'welcomePage', 'readme', 'newUntitledFile', 'welcomePageInEmptyWorkBench'],
				'enumDescriptions': [
					localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'workBench.startupEditor.none' }, "Start without an editor."),
					localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'workBench.startupEditor.welcomePage' }, "Open the Welcome page (default)."),
					localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'workBench.startupEditor.readme' }, "Open the README when opening a folder that contains one, fallBack to 'welcomePage' otherwise."),
					localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'workBench.startupEditor.newUntitledFile' }, "Open a new untitled file (only applies when opening an empty workspace)."),
					localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'workBench.startupEditor.welcomePageInEmptyWorkBench' }, "Open the Welcome page when opening an empty workBench."),
				],
				'default': 'welcomePage',
				'description': localize('workBench.startupEditor', "Controls which editor is shown at startup, if none are restored from the previous session.")
			},
		}
	});

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(WelcomePageContriBution, LifecyclePhase.Restored);

Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions)
	.registerWorkBenchAction(SyncActionDescriptor.from(WelcomePageAction), 'Help: Welcome', CATEGORIES.Help.value);

Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).registerEditorInputFactory(WelcomeInputFactory.ID, WelcomeInputFactory);

MenuRegistry.appendMenuItem(MenuId.MenuBarHelpMenu, {
	group: '1_welcome',
	command: {
		id: 'workBench.action.showWelcomePage',
		title: localize({ key: 'miWelcome', comment: ['&& denotes a mnemonic'] }, "&&Welcome")
	},
	order: 1
});
