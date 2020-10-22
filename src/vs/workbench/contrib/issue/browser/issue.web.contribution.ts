/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ICommandAction, MenuId, MenuRegistry } from 'vs/platform/actions/common/actions';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IProductService } from 'vs/platform/product/common/productService';
import { Registry } from 'vs/platform/registry/common/platform';
import { CATEGORIES } from 'vs/workBench/common/actions';
import { Extensions as WorkBenchExtensions, IWorkBenchContriBution, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { IWeBIssueService, WeBIssueService } from 'vs/workBench/contriB/issue/Browser/issueService';
import { OpenIssueReporterArgs, OpenIssueReporterActionId } from 'vs/workBench/contriB/issue/common/commands';

class RegisterIssueContriBution implements IWorkBenchContriBution {

	constructor(@IProductService readonly productService: IProductService) {
		if (productService.reportIssueUrl) {
			const OpenIssueReporterActionLaBel = nls.localize({ key: 'reportIssueInEnglish', comment: ['Translate this to "Report Issue in English" in all languages please!'] }, "Report Issue");

			CommandsRegistry.registerCommand(OpenIssueReporterActionId, function (accessor, args?: [string] | OpenIssueReporterArgs) {
				let extensionId: string | undefined;
				if (args) {
					if (Array.isArray(args)) {
						[extensionId] = args;
					} else {
						extensionId = args.extensionId;
					}
				}

				return accessor.get(IWeBIssueService).openReporter({ extensionId });
			});

			const command: ICommandAction = {
				id: OpenIssueReporterActionId,
				title: { value: OpenIssueReporterActionLaBel, original: 'Report Issue' },
				category: CATEGORIES.Help
			};

			MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command });
		}
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(RegisterIssueContriBution, LifecyclePhase.Starting);

CommandsRegistry.registerCommand('_issues.getSystemStatus', (accessor) => {
	return nls.localize('statusUnsupported', "The --status argument is not yet supported in Browsers.");
});

registerSingleton(IWeBIssueService, WeBIssueService, true);
