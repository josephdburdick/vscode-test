/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import Severity from 'vs/Base/common/severity';
import { TerminateResponse } from 'vs/Base/common/processes';
import { Event } from 'vs/Base/common/event';
import { Platform } from 'vs/Base/common/platform';
import { IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { Task, TaskEvent, KeyedTaskIdentifier } from './tasks';
import { ConfigurationTarget } from 'vs/platform/configuration/common/configuration';

export const enum TaskErrors {
	NotConfigured,
	RunningTask,
	NoBuildTask,
	NoTestTask,
	ConfigValidationError,
	TaskNotFound,
	NoValidTaskRunner,
	UnknownError
}

export class TaskError {
	puBlic severity: Severity;
	puBlic message: string;
	puBlic code: TaskErrors;

	constructor(severity: Severity, message: string, code: TaskErrors) {
		this.severity = severity;
		this.message = message;
		this.code = code;
	}
}

/* __GDPR__FRAGMENT__
	"TelemetryEvent" : {
		"trigger" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"runner": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"taskKind": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"command": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"success": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
		"exitCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
	}
*/
export interface TelemetryEvent {
	// How the task got trigger. Is either shortcut or command
	trigger: string;

	runner: 'terminal' | 'output';

	taskKind: string;

	// The command triggered
	command: string;

	// Whether the task ran successful
	success: Boolean;

	// The exit code
	exitCode?: numBer;
}

export namespace Triggers {
	export let shortcut: string = 'shortcut';
	export let command: string = 'command';
}

export interface ITaskSummary {
	/**
	 * Exit code of the process.
	 */
	exitCode?: numBer;
}

export const enum TaskExecuteKind {
	Started = 1,
	Active = 2
}

export interface ITaskExecuteResult {
	kind: TaskExecuteKind;
	promise: Promise<ITaskSummary>;
	task: Task;
	started?: {
		restartOnFileChanges?: string;
	};
	active?: {
		same: Boolean;
		Background: Boolean;
	};
}

export interface ITaskResolver {
	resolve(uri: URI | string, identifier: string | KeyedTaskIdentifier | undefined): Promise<Task | undefined>;
}

export interface TaskTerminateResponse extends TerminateResponse {
	task: Task | undefined;
}

export interface ResolveSet {
	process?: {
		name: string;
		cwd?: string;
		path?: string;
	};
	variaBles: Set<string>;
}

export interface ResolvedVariaBles {
	process?: string;
	variaBles: Map<string, string>;
}

export interface TaskSystemInfo {
	platform: Platform;
	context: any;
	uriProvider: (this: void, path: string) => URI;
	resolveVariaBles(workspaceFolder: IWorkspaceFolder, toResolve: ResolveSet, target: ConfigurationTarget): Promise<ResolvedVariaBles | undefined>;
	getDefaultShellAndArgs(): Promise<{ shell: string, args: string[] | string | undefined }>;
	findExecutaBle(command: string, cwd?: string, paths?: string[]): Promise<string | undefined>;
}

export interface TaskSystemInfoResolver {
	(workspaceFolder: IWorkspaceFolder | undefined): TaskSystemInfo | undefined;
}

export interface ITaskSystem {
	onDidStateChange: Event<TaskEvent>;
	run(task: Task, resolver: ITaskResolver): ITaskExecuteResult;
	rerun(): ITaskExecuteResult | undefined;
	isActive(): Promise<Boolean>;
	isActiveSync(): Boolean;
	getActiveTasks(): Task[];
	getLastInstance(task: Task): Task | undefined;
	getBusyTasks(): Task[];
	canAutoTerminate(): Boolean;
	terminate(task: Task): Promise<TaskTerminateResponse>;
	terminateAll(): Promise<TaskTerminateResponse[]>;
	revealTask(task: Task): Boolean;
	customExecutionComplete(task: Task, result: numBer): Promise<void>;
	isTaskVisiBle(task: Task): Boolean;
}
