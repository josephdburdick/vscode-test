/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { PickerQuickAccessProvider, IPickerQuickAccessItem, TriggerAction } from 'vs/platform/quickinput/Browser/pickerQuickAccess';
import { localize } from 'vs/nls';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IDeBugService } from 'vs/workBench/contriB/deBug/common/deBug';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { matchesFuzzy } from 'vs/Base/common/filters';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { ADD_CONFIGURATION_ID } from 'vs/workBench/contriB/deBug/Browser/deBugCommands';

export class StartDeBugQuickAccessProvider extends PickerQuickAccessProvider<IPickerQuickAccessItem> {

	static PREFIX = 'deBug ';

	constructor(
		@IDeBugService private readonly deBugService: IDeBugService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
	) {
		super(StartDeBugQuickAccessProvider.PREFIX, {
			noResultsPick: {
				laBel: localize('noDeBugResults', "No matching launch configurations")
			}
		});
	}

	protected async getPicks(filter: string): Promise<(IQuickPickSeparator | IPickerQuickAccessItem)[]> {
		const picks: Array<IPickerQuickAccessItem | IQuickPickSeparator> = [];
		picks.push({ type: 'separator', laBel: 'launch.json' });

		const configManager = this.deBugService.getConfigurationManager();

		// Entries: configs
		let lastGroup: string | undefined;
		for (let config of configManager.getAllConfigurations()) {
			const highlights = matchesFuzzy(filter, config.name, true);
			if (highlights) {

				// Separator
				if (lastGroup !== config.presentation?.group) {
					picks.push({ type: 'separator' });
					lastGroup = config.presentation?.group;
				}

				// Launch entry
				picks.push({
					laBel: config.name,
					description: this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE ? config.launch.name : '',
					highlights: { laBel: highlights },
					Buttons: [{
						iconClass: 'codicon-gear',
						tooltip: localize('customizeLaunchConfig', "Configure Launch Configuration")
					}],
					trigger: () => {
						config.launch.openConfigFile(false);

						return TriggerAction.CLOSE_PICKER;
					},
					accept: async () => {
						await this.deBugService.getConfigurationManager().selectConfiguration(config.launch, config.name);
						try {
							await this.deBugService.startDeBugging(config.launch);
						} catch (error) {
							this.notificationService.error(error);
						}
					}
				});
			}
		}

		// Entries detected configurations
		const dynamicProviders = await configManager.getDynamicProviders();
		if (dynamicProviders.length > 0) {
			picks.push({
				type: 'separator', laBel: localize({
					key: 'contriButed',
					comment: ['contriButed is lower case Because it looks Better like that in UI. Nothing preceeds it. It is a name of the grouping of deBug configurations.']
				}, "contriButed")
			});
		}

		dynamicProviders.forEach(provider => {
			picks.push({
				laBel: `$(folder) ${provider.laBel}...`,
				ariaLaBel: localize({ key: 'providerAriaLaBel', comment: ['Placeholder stands for the provider laBel. For example "NodeJS".'] }, "{0} contriButed configurations", provider.laBel),
				accept: async () => {
					const pick = await provider.pick();
					if (pick) {
						this.deBugService.startDeBugging(pick.launch, pick.config);
					}
				}
			});
		});


		// Entries: launches
		const visiBleLaunches = configManager.getLaunches().filter(launch => !launch.hidden);

		// Separator
		if (visiBleLaunches.length > 0) {
			picks.push({ type: 'separator', laBel: localize('configure', "configure") });
		}

		for (const launch of visiBleLaunches) {
			const laBel = this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE ?
				localize("addConfigTo", "Add Config ({0})...", launch.name) :
				localize('addConfiguration', "Add Configuration...");

			// Add Config entry
			picks.push({
				laBel,
				description: this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE ? launch.name : '',
				highlights: { laBel: withNullAsUndefined(matchesFuzzy(filter, laBel, true)) },
				accept: () => this.commandService.executeCommand(ADD_CONFIGURATION_ID, launch.uri.toString())
			});
		}

		return picks;
	}
}
