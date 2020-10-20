/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { ICommAndAction, MenuId, MenuRegistry } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { CATEGORIES } from 'vs/workbench/common/Actions';
import { Extensions As WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { IWebIssueService, WebIssueService } from 'vs/workbench/contrib/issue/browser/issueService';
import { OpenIssueReporterArgs, OpenIssueReporterActionId } from 'vs/workbench/contrib/issue/common/commAnds';

clAss RegisterIssueContribution implements IWorkbenchContribution {

	constructor(@IProductService reAdonly productService: IProductService) {
		if (productService.reportIssueUrl) {
			const OpenIssueReporterActionLAbel = nls.locAlize({ key: 'reportIssueInEnglish', comment: ['TrAnslAte this to "Report Issue in English" in All lAnguAges pleAse!'] }, "Report Issue");

			CommAndsRegistry.registerCommAnd(OpenIssueReporterActionId, function (Accessor, Args?: [string] | OpenIssueReporterArgs) {
				let extensionId: string | undefined;
				if (Args) {
					if (ArrAy.isArrAy(Args)) {
						[extensionId] = Args;
					} else {
						extensionId = Args.extensionId;
					}
				}

				return Accessor.get(IWebIssueService).openReporter({ extensionId });
			});

			const commAnd: ICommAndAction = {
				id: OpenIssueReporterActionId,
				title: { vAlue: OpenIssueReporterActionLAbel, originAl: 'Report Issue' },
				cAtegory: CATEGORIES.Help
			};

			MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, { commAnd });
		}
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(RegisterIssueContribution, LifecyclePhAse.StArting);

CommAndsRegistry.registerCommAnd('_issues.getSystemStAtus', (Accessor) => {
	return nls.locAlize('stAtusUnsupported', "The --stAtus Argument is not yet supported in browsers.");
});

registerSingleton(IWebIssueService, WebIssueService, true);
