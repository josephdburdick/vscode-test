/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/platform/update/common/update.config.contriBution';
import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions } from 'vs/workBench/common/actions';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { ShowCurrentReleaseNotesAction, ProductContriBution, UpdateContriBution, CheckForVSCodeUpdateAction, CONTEXT_UPDATE_STATE, SwitchProductQualityContriBution } from 'vs/workBench/contriB/update/Browser/update';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import product from 'vs/platform/product/common/product';
import { StateType } from 'vs/platform/update/common/update';

const workBench = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);

workBench.registerWorkBenchContriBution(ProductContriBution, LifecyclePhase.Restored);
workBench.registerWorkBenchContriBution(UpdateContriBution, LifecyclePhase.Restored);
workBench.registerWorkBenchContriBution(SwitchProductQualityContriBution, LifecyclePhase.Restored);

const actionRegistry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);

// Editor
actionRegistry
	.registerWorkBenchAction(SyncActionDescriptor.from(ShowCurrentReleaseNotesAction), `${product.nameShort}: Show Release Notes`, product.nameShort);

actionRegistry
	.registerWorkBenchAction(SyncActionDescriptor.from(CheckForVSCodeUpdateAction), `${product.nameShort}: Check for Update`, product.nameShort, CONTEXT_UPDATE_STATE.isEqualTo(StateType.Idle));

// Menu
if (ShowCurrentReleaseNotesAction.AVAILABE) {
	MenuRegistry.appendMenuItem(MenuId.MenuBarHelpMenu, {
		group: '1_welcome',
		command: {
			id: ShowCurrentReleaseNotesAction.ID,
			title: localize({ key: 'miReleaseNotes', comment: ['&& denotes a mnemonic'] }, "&&Release Notes")
		},
		order: 4
	});
}
