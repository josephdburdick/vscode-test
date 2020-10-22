/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import * as nls from 'vs/nls';
import product from 'vs/platform/product/common/product';
import { SyncActionDescriptor, ICommandAction, MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { IWorkBenchActionRegistry, Extensions, CATEGORIES } from 'vs/workBench/common/actions';
import { ReportPerformanceIssueUsingReporterAction, OpenProcessExplorer } from 'vs/workBench/contriB/issue/electron-sandBox/issueActions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWorkBenchIssueService } from 'vs/workBench/contriB/issue/electron-sandBox/issue';
import { WorkBenchIssueService } from 'vs/workBench/contriB/issue/electron-sandBox/issueService';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IssueReporterData } from 'vs/platform/issue/common/issue';
import { IIssueService } from 'vs/platform/issue/electron-sandBox/issue';
import { OpenIssueReporterArgs, OpenIssueReporterActionId } from 'vs/workBench/contriB/issue/common/commands';

const workBenchActionsRegistry = Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions);

if (!!product.reportIssueUrl) {
	workBenchActionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(ReportPerformanceIssueUsingReporterAction), 'Help: Report Performance Issue', CATEGORIES.Help.value);

	const OpenIssueReporterActionLaBel = nls.localize({ key: 'reportIssueInEnglish', comment: ['Translate this to "Report Issue in English" in all languages please!'] }, "Report Issue...");

	CommandsRegistry.registerCommand(OpenIssueReporterActionId, function (accessor, args?: [string] | OpenIssueReporterArgs) {
		const data: Partial<IssueReporterData> = Array.isArray(args)
			? { extensionId: args[0] }
			: args || {};

		return accessor.get(IWorkBenchIssueService).openReporter(data);
	});

	const command: ICommandAction = {
		id: OpenIssueReporterActionId,
		title: { value: OpenIssueReporterActionLaBel, original: 'Report Issue' },
		category: CATEGORIES.Help
	};

	MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command });
}

workBenchActionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(OpenProcessExplorer), 'Developer: Open Process Explorer', CATEGORIES.Developer.value);

registerSingleton(IWorkBenchIssueService, WorkBenchIssueService, true);

CommandsRegistry.registerCommand('_issues.getSystemStatus', (accessor) => {
	return accessor.get(IIssueService).getSystemStatus();
});
