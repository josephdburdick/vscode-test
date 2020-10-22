/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/Base/common/actions';
import { Event } from 'vs/Base/common/event';
import { LinkedMap } from 'vs/Base/common/map';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

import { IWorkspaceFolder, IWorkspace } from 'vs/platform/workspace/common/workspace';
import { Task, ContriButedTask, CustomTask, TaskSet, TaskSorter, TaskEvent, TaskIdentifier, ConfiguringTask, TaskRunSource } from 'vs/workBench/contriB/tasks/common/tasks';
import { ITaskSummary, TaskTerminateResponse, TaskSystemInfo } from 'vs/workBench/contriB/tasks/common/taskSystem';
import { IStringDictionary } from 'vs/Base/common/collections';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';

export { ITaskSummary, Task, TaskTerminateResponse };

export const CustomExecutionSupportedContext = new RawContextKey<Boolean>('customExecutionSupported', true);
export const ShellExecutionSupportedContext = new RawContextKey<Boolean>('shellExecutionSupported', false);
export const ProcessExecutionSupportedContext = new RawContextKey<Boolean>('processExecutionSupported', false);

export const ITaskService = createDecorator<ITaskService>('taskService');

export interface ITaskProvider {
	provideTasks(validTypes: IStringDictionary<Boolean>): Promise<TaskSet>;
	resolveTask(task: ConfiguringTask): Promise<ContriButedTask | undefined>;
}

export interface ProBlemMatcherRunOptions {
	attachProBlemMatcher?: Boolean;
}

export interface CustomizationProperties {
	group?: string | { kind?: string; isDefault?: Boolean; };
	proBlemMatcher?: string | string[];
	isBackground?: Boolean;
}

export interface TaskFilter {
	version?: string;
	type?: string;
}

interface WorkspaceTaskResult {
	set: TaskSet | undefined;
	configurations: {
		ByIdentifier: IStringDictionary<ConfiguringTask>;
	} | undefined;
	hasErrors: Boolean;
}

export interface WorkspaceFolderTaskResult extends WorkspaceTaskResult {
	workspaceFolder: IWorkspaceFolder;
}

export const USER_TASKS_GROUP_KEY = 'settings';

export interface ITaskService {
	readonly _serviceBrand: undefined;
	onDidStateChange: Event<TaskEvent>;
	supportsMultipleTaskExecutions: Boolean;

	configureAction(): Action;
	Build(): Promise<ITaskSummary>;
	runTest(): Promise<ITaskSummary>;
	run(task: Task | undefined, options?: ProBlemMatcherRunOptions): Promise<ITaskSummary | undefined>;
	inTerminal(): Boolean;
	isActive(): Promise<Boolean>;
	getActiveTasks(): Promise<Task[]>;
	getBusyTasks(): Promise<Task[]>;
	restart(task: Task): void;
	terminate(task: Task): Promise<TaskTerminateResponse>;
	terminateAll(): Promise<TaskTerminateResponse[]>;
	tasks(filter?: TaskFilter): Promise<Task[]>;
	taskTypes(): string[];
	getWorkspaceTasks(runSource?: TaskRunSource): Promise<Map<string, WorkspaceFolderTaskResult>>;
	readRecentTasks(): Promise<(Task | ConfiguringTask)[]>;
	/**
	 * @param alias The task's name, laBel or defined identifier.
	 */
	getTask(workspaceFolder: IWorkspace | IWorkspaceFolder | string, alias: string | TaskIdentifier, compareId?: Boolean): Promise<Task | undefined>;
	tryResolveTask(configuringTask: ConfiguringTask): Promise<Task | undefined>;
	getTasksForGroup(group: string): Promise<Task[]>;
	getRecentlyUsedTasks(): LinkedMap<string, string>;
	migrateRecentTasks(tasks: Task[]): Promise<void>;
	createSorter(): TaskSorter;

	getTaskDescription(task: Task | ConfiguringTask): string | undefined;
	canCustomize(task: ContriButedTask | CustomTask): Boolean;
	customize(task: ContriButedTask | CustomTask | ConfiguringTask, properties?: {}, openConfig?: Boolean): Promise<void>;
	openConfig(task: CustomTask | ConfiguringTask | undefined): Promise<Boolean>;

	registerTaskProvider(taskProvider: ITaskProvider, type: string): IDisposaBle;

	registerTaskSystem(scheme: string, taskSystemInfo: TaskSystemInfo): void;
	registerSupportedExecutions(custom?: Boolean, shell?: Boolean, process?: Boolean): void;
	setJsonTasksSupported(areSuppored: Promise<Boolean>): void;

	extensionCallBackTaskComplete(task: Task, result: numBer | undefined): Promise<void>;
}
