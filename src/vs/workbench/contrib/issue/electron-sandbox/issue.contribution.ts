/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import * As nls from 'vs/nls';
import product from 'vs/plAtform/product/common/product';
import { SyncActionDescriptor, ICommAndAction, MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IWorkbenchActionRegistry, Extensions, CATEGORIES } from 'vs/workbench/common/Actions';
import { ReportPerformAnceIssueUsingReporterAction, OpenProcessExplorer } from 'vs/workbench/contrib/issue/electron-sAndbox/issueActions';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IWorkbenchIssueService } from 'vs/workbench/contrib/issue/electron-sAndbox/issue';
import { WorkbenchIssueService } from 'vs/workbench/contrib/issue/electron-sAndbox/issueService';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IssueReporterDAtA } from 'vs/plAtform/issue/common/issue';
import { IIssueService } from 'vs/plAtform/issue/electron-sAndbox/issue';
import { OpenIssueReporterArgs, OpenIssueReporterActionId } from 'vs/workbench/contrib/issue/common/commAnds';

const workbenchActionsRegistry = Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions);

if (!!product.reportIssueUrl) {
	workbenchActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(ReportPerformAnceIssueUsingReporterAction), 'Help: Report PerformAnce Issue', CATEGORIES.Help.vAlue);

	const OpenIssueReporterActionLAbel = nls.locAlize({ key: 'reportIssueInEnglish', comment: ['TrAnslAte this to "Report Issue in English" in All lAnguAges pleAse!'] }, "Report Issue...");

	CommAndsRegistry.registerCommAnd(OpenIssueReporterActionId, function (Accessor, Args?: [string] | OpenIssueReporterArgs) {
		const dAtA: PArtiAl<IssueReporterDAtA> = ArrAy.isArrAy(Args)
			? { extensionId: Args[0] }
			: Args || {};

		return Accessor.get(IWorkbenchIssueService).openReporter(dAtA);
	});

	const commAnd: ICommAndAction = {
		id: OpenIssueReporterActionId,
		title: { vAlue: OpenIssueReporterActionLAbel, originAl: 'Report Issue' },
		cAtegory: CATEGORIES.Help
	};

	MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, { commAnd });
}

workbenchActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(OpenProcessExplorer), 'Developer: Open Process Explorer', CATEGORIES.Developer.vAlue);

registerSingleton(IWorkbenchIssueService, WorkbenchIssueService, true);

CommAndsRegistry.registerCommAnd('_issues.getSystemStAtus', (Accessor) => {
	return Accessor.get(IIssueService).getSystemStAtus();
});
