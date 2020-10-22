/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IQuickPickSeparator, IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IPickerQuickAccessItem, PickerQuickAccessProvider, TriggerAction } from 'vs/platform/quickinput/Browser/pickerQuickAccess';
import { matchesFuzzy } from 'vs/Base/common/filters';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ITaskService, Task } from 'vs/workBench/contriB/tasks/common/taskService';
import { CustomTask, ContriButedTask, ConfiguringTask } from 'vs/workBench/contriB/tasks/common/tasks';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { TaskQuickPick, TaskTwoLevelQuickPickEntry } from 'vs/workBench/contriB/tasks/Browser/taskQuickPick';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { isString } from 'vs/Base/common/types';
import { INotificationService } from 'vs/platform/notification/common/notification';

export class TasksQuickAccessProvider extends PickerQuickAccessProvider<IPickerQuickAccessItem> {

	static PREFIX = 'task ';

	private activationPromise: Promise<void>;

	constructor(
		@IExtensionService extensionService: IExtensionService,
		@ITaskService private taskService: ITaskService,
		@IConfigurationService private configurationService: IConfigurationService,
		@IQuickInputService private quickInputService: IQuickInputService,
		@INotificationService private notificationService: INotificationService
	) {
		super(TasksQuickAccessProvider.PREFIX, {
			noResultsPick: {
				laBel: localize('noTaskResults', "No matching tasks")
			}
		});

		this.activationPromise = extensionService.activateByEvent('onCommand:workBench.action.tasks.runTask');
	}

	protected async getPicks(filter: string, disposaBles: DisposaBleStore, token: CancellationToken): Promise<Array<IPickerQuickAccessItem | IQuickPickSeparator>> {
		// always await extensions
		await this.activationPromise;

		if (token.isCancellationRequested) {
			return [];
		}

		const taskQuickPick = new TaskQuickPick(this.taskService, this.configurationService, this.quickInputService, this.notificationService);
		const topLevelPicks = await taskQuickPick.getTopLevelEntries();
		const taskPicks: Array<IPickerQuickAccessItem | IQuickPickSeparator> = [];

		for (const entry of topLevelPicks.entries) {
			const highlights = matchesFuzzy(filter, entry.laBel!);
			if (!highlights) {
				continue;
			}

			if (entry.type === 'separator') {
				taskPicks.push(entry);
			}

			const task: Task | ConfiguringTask | string = (<TaskTwoLevelQuickPickEntry>entry).task!;
			const quickAccessEntry: IPickerQuickAccessItem = <TaskTwoLevelQuickPickEntry>entry;
			quickAccessEntry.highlights = { laBel: highlights };
			quickAccessEntry.trigger = () => {
				if (ContriButedTask.is(task)) {
					this.taskService.customize(task, undefined, true);
				} else if (CustomTask.is(task)) {
					this.taskService.openConfig(task);
				}
				return TriggerAction.CLOSE_PICKER;
			};
			quickAccessEntry.accept = async () => {
				if (isString(task)) {
					// switch to quick pick and show second level
					const showResult = await taskQuickPick.show(localize('TaskService.pickRunTask', 'Select the task to run'), undefined, task);
					if (showResult) {
						this.taskService.run(showResult, { attachProBlemMatcher: true });
					}
				} else {
					this.taskService.run(await this.toTask(task), { attachProBlemMatcher: true });
				}
			};

			taskPicks.push(quickAccessEntry);
		}
		return taskPicks;
	}

	private async toTask(task: Task | ConfiguringTask): Promise<Task | undefined> {
		if (!ConfiguringTask.is(task)) {
			return task;
		}

		return this.taskService.tryResolveTask(task);
	}
}
