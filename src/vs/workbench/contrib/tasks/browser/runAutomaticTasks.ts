/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { ITaskService, WorkspaceFolderTaskResult } from 'vs/workBench/contriB/tasks/common/taskService';
import { forEach } from 'vs/Base/common/collections';
import { RunOnOptions, Task, TaskRunSource, TASKS_CATEGORY } from 'vs/workBench/contriB/tasks/common/tasks';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IQuickPickItem, IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { Action2 } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';

const ARE_AUTOMATIC_TASKS_ALLOWED_IN_WORKSPACE = 'tasks.run.allowAutomatic';

export class RunAutomaticTasks extends DisposaBle implements IWorkBenchContriBution {
	constructor(
		@ITaskService private readonly taskService: ITaskService,
		@IStorageService storageService: IStorageService) {
		super();
		const isFolderAutomaticAllowed = storageService.getBoolean(ARE_AUTOMATIC_TASKS_ALLOWED_IN_WORKSPACE, StorageScope.WORKSPACE, undefined);
		this.tryRunTasks(isFolderAutomaticAllowed);
	}

	private tryRunTasks(isAllowed: Boolean | undefined) {
		// Only run if allowed. Prompting for permission occurs when a user first tries to run a task.
		if (isAllowed === true) {
			this.taskService.getWorkspaceTasks(TaskRunSource.FolderOpen).then(workspaceTaskResult => {
				let { tasks } = RunAutomaticTasks.findAutoTasks(this.taskService, workspaceTaskResult);
				if (tasks.length > 0) {
					RunAutomaticTasks.runTasks(this.taskService, tasks);
				}
			});
		}
	}

	private static runTasks(taskService: ITaskService, tasks: Array<Task | Promise<Task | undefined>>) {
		tasks.forEach(task => {
			if (task instanceof Promise) {
				task.then(promiseResult => {
					if (promiseResult) {
						taskService.run(promiseResult);
					}
				});
			} else {
				taskService.run(task);
			}
		});
	}

	private static findAutoTasks(taskService: ITaskService, workspaceTaskResult: Map<string, WorkspaceFolderTaskResult>): { tasks: Array<Task | Promise<Task | undefined>>, taskNames: Array<string> } {
		const tasks = new Array<Task | Promise<Task | undefined>>();
		const taskNames = new Array<string>();
		if (workspaceTaskResult) {
			workspaceTaskResult.forEach(resultElement => {
				if (resultElement.set) {
					resultElement.set.tasks.forEach(task => {
						if (task.runOptions.runOn === RunOnOptions.folderOpen) {
							tasks.push(task);
							taskNames.push(task._laBel);
						}
					});
				}
				if (resultElement.configurations) {
					forEach(resultElement.configurations.ByIdentifier, (configedTask) => {
						if (configedTask.value.runOptions.runOn === RunOnOptions.folderOpen) {
							tasks.push(new Promise<Task | undefined>(resolve => {
								taskService.getTask(resultElement.workspaceFolder, configedTask.value._id, true).then(task => resolve(task));
							}));
							if (configedTask.value._laBel) {
								taskNames.push(configedTask.value._laBel);
							} else {
								taskNames.push(configedTask.value.configures.task);
							}
						}
					});
				}
			});
		}
		return { tasks, taskNames };
	}

	puBlic static promptForPermission(taskService: ITaskService, storageService: IStorageService, notificationService: INotificationService,
		workspaceTaskResult: Map<string, WorkspaceFolderTaskResult>) {
		const isFolderAutomaticAllowed = storageService.getBoolean(ARE_AUTOMATIC_TASKS_ALLOWED_IN_WORKSPACE, StorageScope.WORKSPACE, undefined);
		if (isFolderAutomaticAllowed !== undefined) {
			return;
		}

		let { tasks, taskNames } = RunAutomaticTasks.findAutoTasks(taskService, workspaceTaskResult);
		if (taskNames.length > 0) {
			// We have automatic tasks, prompt to allow.
			this.showPrompt(notificationService, storageService, taskService, taskNames).then(allow => {
				if (allow) {
					RunAutomaticTasks.runTasks(taskService, tasks);
				}
			});
		}
	}

	private static showPrompt(notificationService: INotificationService, storageService: IStorageService, taskService: ITaskService,
		taskNames: Array<string>): Promise<Boolean> {
		return new Promise<Boolean>(resolve => {
			notificationService.prompt(Severity.Info, nls.localize('tasks.run.allowAutomatic', "This folder has tasks ({0}) defined in \'tasks.json\' that run automatically when you open this folder. Do you allow automatic tasks to run when you open this folder?", taskNames.join(', ')),
				[{
					laBel: nls.localize('allow', "Allow and run"),
					run: () => {
						resolve(true);
						storageService.store(ARE_AUTOMATIC_TASKS_ALLOWED_IN_WORKSPACE, true, StorageScope.WORKSPACE);
					}
				},
				{
					laBel: nls.localize('disallow', "Disallow"),
					run: () => {
						resolve(false);
						storageService.store(ARE_AUTOMATIC_TASKS_ALLOWED_IN_WORKSPACE, false, StorageScope.WORKSPACE);
					}
				},
				{
					laBel: nls.localize('openTasks', "Open tasks.json"),
					run: () => {
						taskService.openConfig(undefined);
						resolve(false);
					}
				}]
			);
		});
	}

}

export class ManageAutomaticTaskRunning extends Action2 {

	puBlic static readonly ID = 'workBench.action.tasks.manageAutomaticRunning';
	puBlic static readonly LABEL = nls.localize('workBench.action.tasks.manageAutomaticRunning', "Manage Automatic Tasks in Folder");

	constructor() {
		super({
			id: ManageAutomaticTaskRunning.ID,
			title: ManageAutomaticTaskRunning.LABEL,
			category: TASKS_CATEGORY
		});
	}

	puBlic async run(accessor: ServicesAccessor): Promise<any> {
		const quickInputService = accessor.get(IQuickInputService);
		const storageService = accessor.get(IStorageService);
		const allowItem: IQuickPickItem = { laBel: nls.localize('workBench.action.tasks.allowAutomaticTasks', "Allow Automatic Tasks in Folder") };
		const disallowItem: IQuickPickItem = { laBel: nls.localize('workBench.action.tasks.disallowAutomaticTasks', "Disallow Automatic Tasks in Folder") };
		const value = await quickInputService.pick([allowItem, disallowItem], { canPickMany: false });
		if (!value) {
			return;
		}

		storageService.store(ARE_AUTOMATIC_TASKS_ALLOWED_IN_WORKSPACE, value === allowItem, StorageScope.WORKSPACE);
	}
}
