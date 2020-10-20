/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/plAtform/updAte/common/updAte.config.contribution';
import { locAlize } from 'vs/nls';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { IWorkbenchActionRegistry, Extensions As ActionExtensions } from 'vs/workbench/common/Actions';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { ShowCurrentReleAseNotesAction, ProductContribution, UpdAteContribution, CheckForVSCodeUpdAteAction, CONTEXT_UPDATE_STATE, SwitchProductQuAlityContribution } from 'vs/workbench/contrib/updAte/browser/updAte';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import product from 'vs/plAtform/product/common/product';
import { StAteType } from 'vs/plAtform/updAte/common/updAte';

const workbench = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);

workbench.registerWorkbenchContribution(ProductContribution, LifecyclePhAse.Restored);
workbench.registerWorkbenchContribution(UpdAteContribution, LifecyclePhAse.Restored);
workbench.registerWorkbenchContribution(SwitchProductQuAlityContribution, LifecyclePhAse.Restored);

const ActionRegistry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);

// Editor
ActionRegistry
	.registerWorkbenchAction(SyncActionDescriptor.from(ShowCurrentReleAseNotesAction), `${product.nAmeShort}: Show ReleAse Notes`, product.nAmeShort);

ActionRegistry
	.registerWorkbenchAction(SyncActionDescriptor.from(CheckForVSCodeUpdAteAction), `${product.nAmeShort}: Check for UpdAte`, product.nAmeShort, CONTEXT_UPDATE_STATE.isEquAlTo(StAteType.Idle));

// Menu
if (ShowCurrentReleAseNotesAction.AVAILABE) {
	MenuRegistry.AppendMenuItem(MenuId.MenubArHelpMenu, {
		group: '1_welcome',
		commAnd: {
			id: ShowCurrentReleAseNotesAction.ID,
			title: locAlize({ key: 'miReleAseNotes', comment: ['&& denotes A mnemonic'] }, "&&ReleAse Notes")
		},
		order: 4
	});
}
