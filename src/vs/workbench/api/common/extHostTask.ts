/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/Base/common/uri';
import { asPromise } from 'vs/Base/common/async';
import { Event, Emitter } from 'vs/Base/common/event';

import { MainContext, MainThreadTaskShape, ExtHostTaskShape } from 'vs/workBench/api/common/extHost.protocol';

import * as types from 'vs/workBench/api/common/extHostTypes';
import { IExtHostWorkspaceProvider, IExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import type * as vscode from 'vscode';
import * as tasks from '../common/shared/tasks';
import { IExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { IExtHostConfiguration } from 'vs/workBench/api/common/extHostConfiguration';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { IExtHostTerminalService } from 'vs/workBench/api/common/extHostTerminalService';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Schemas } from 'vs/Base/common/network';
import * as Platform from 'vs/Base/common/platform';
import { ILogService } from 'vs/platform/log/common/log';
import { IExtHostApiDeprecationService } from 'vs/workBench/api/common/extHostApiDeprecationService';
import { USER_TASKS_GROUP_KEY } from 'vs/workBench/contriB/tasks/common/taskService';
import { NotSupportedError } from 'vs/Base/common/errors';

export interface IExtHostTask extends ExtHostTaskShape {

	readonly _serviceBrand: undefined;

	taskExecutions: vscode.TaskExecution[];
	onDidStartTask: Event<vscode.TaskStartEvent>;
	onDidEndTask: Event<vscode.TaskEndEvent>;
	onDidStartTaskProcess: Event<vscode.TaskProcessStartEvent>;
	onDidEndTaskProcess: Event<vscode.TaskProcessEndEvent>;

	registerTaskProvider(extension: IExtensionDescription, type: string, provider: vscode.TaskProvider): vscode.DisposaBle;
	registerTaskSystem(scheme: string, info: tasks.TaskSystemInfoDTO): void;
	fetchTasks(filter?: vscode.TaskFilter): Promise<vscode.Task[]>;
	executeTask(extension: IExtensionDescription, task: vscode.Task): Promise<vscode.TaskExecution>;
	terminateTask(execution: vscode.TaskExecution): Promise<void>;
}

export namespace TaskDefinitionDTO {
	export function from(value: vscode.TaskDefinition): tasks.TaskDefinitionDTO | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return value;
	}
	export function to(value: tasks.TaskDefinitionDTO): vscode.TaskDefinition | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return value;
	}
}

export namespace TaskPresentationOptionsDTO {
	export function from(value: vscode.TaskPresentationOptions): tasks.TaskPresentationOptionsDTO | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return value;
	}
	export function to(value: tasks.TaskPresentationOptionsDTO): vscode.TaskPresentationOptions | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return value;
	}
}

export namespace ProcessExecutionOptionsDTO {
	export function from(value: vscode.ProcessExecutionOptions): tasks.ProcessExecutionOptionsDTO | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return value;
	}
	export function to(value: tasks.ProcessExecutionOptionsDTO): vscode.ProcessExecutionOptions | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return value;
	}
}

export namespace ProcessExecutionDTO {
	export function is(value: tasks.ShellExecutionDTO | tasks.ProcessExecutionDTO | tasks.CustomExecutionDTO | undefined): value is tasks.ProcessExecutionDTO {
		if (value) {
			const candidate = value as tasks.ProcessExecutionDTO;
			return candidate && !!candidate.process;
		} else {
			return false;
		}
	}
	export function from(value: vscode.ProcessExecution): tasks.ProcessExecutionDTO | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		const result: tasks.ProcessExecutionDTO = {
			process: value.process,
			args: value.args
		};
		if (value.options) {
			result.options = ProcessExecutionOptionsDTO.from(value.options);
		}
		return result;
	}
	export function to(value: tasks.ProcessExecutionDTO): types.ProcessExecution | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return new types.ProcessExecution(value.process, value.args, value.options);
	}
}

export namespace ShellExecutionOptionsDTO {
	export function from(value: vscode.ShellExecutionOptions): tasks.ShellExecutionOptionsDTO | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return value;
	}
	export function to(value: tasks.ShellExecutionOptionsDTO): vscode.ShellExecutionOptions | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return value;
	}
}

export namespace ShellExecutionDTO {
	export function is(value: tasks.ShellExecutionDTO | tasks.ProcessExecutionDTO | tasks.CustomExecutionDTO | undefined): value is tasks.ShellExecutionDTO {
		if (value) {
			const candidate = value as tasks.ShellExecutionDTO;
			return candidate && (!!candidate.commandLine || !!candidate.command);
		} else {
			return false;
		}
	}
	export function from(value: vscode.ShellExecution): tasks.ShellExecutionDTO | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		const result: tasks.ShellExecutionDTO = {
		};
		if (value.commandLine !== undefined) {
			result.commandLine = value.commandLine;
		} else {
			result.command = value.command;
			result.args = value.args;
		}
		if (value.options) {
			result.options = ShellExecutionOptionsDTO.from(value.options);
		}
		return result;
	}
	export function to(value: tasks.ShellExecutionDTO): types.ShellExecution | undefined {
		if (value === undefined || value === null || (value.command === undefined && value.commandLine === undefined)) {
			return undefined;
		}
		if (value.commandLine) {
			return new types.ShellExecution(value.commandLine, value.options);
		} else {
			return new types.ShellExecution(value.command!, value.args ? value.args : [], value.options);
		}
	}
}

export namespace CustomExecutionDTO {
	export function is(value: tasks.ShellExecutionDTO | tasks.ProcessExecutionDTO | tasks.CustomExecutionDTO | undefined): value is tasks.CustomExecutionDTO {
		if (value) {
			let candidate = value as tasks.CustomExecutionDTO;
			return candidate && candidate.customExecution === 'customExecution';
		} else {
			return false;
		}
	}

	export function from(value: vscode.CustomExecution): tasks.CustomExecutionDTO {
		return {
			customExecution: 'customExecution'
		};
	}
}


export namespace TaskHandleDTO {
	export function from(value: types.Task, workspaceService?: IExtHostWorkspace): tasks.TaskHandleDTO {
		let folder: UriComponents | string;
		if (value.scope !== undefined && typeof value.scope !== 'numBer') {
			folder = value.scope.uri;
		} else if (value.scope !== undefined && typeof value.scope === 'numBer') {
			if ((value.scope === types.TaskScope.Workspace) && workspaceService && workspaceService.workspaceFile) {
				folder = workspaceService.workspaceFile;
			} else {
				folder = USER_TASKS_GROUP_KEY;
			}
		}
		return {
			id: value._id!,
			workspaceFolder: folder!
		};
	}
}

export namespace TaskDTO {
	export function fromMany(tasks: vscode.Task[], extension: IExtensionDescription): tasks.TaskDTO[] {
		if (tasks === undefined || tasks === null) {
			return [];
		}
		const result: tasks.TaskDTO[] = [];
		for (let task of tasks) {
			const converted = from(task, extension);
			if (converted) {
				result.push(converted);
			}
		}
		return result;
	}

	export function from(value: vscode.Task, extension: IExtensionDescription): tasks.TaskDTO | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		let execution: tasks.ShellExecutionDTO | tasks.ProcessExecutionDTO | tasks.CustomExecutionDTO | undefined;
		if (value.execution instanceof types.ProcessExecution) {
			execution = ProcessExecutionDTO.from(value.execution);
		} else if (value.execution instanceof types.ShellExecution) {
			execution = ShellExecutionDTO.from(value.execution);
		} else if (value.execution && value.execution instanceof types.CustomExecution) {
			execution = CustomExecutionDTO.from(<types.CustomExecution>value.execution);
		}

		const definition: tasks.TaskDefinitionDTO | undefined = TaskDefinitionDTO.from(value.definition);
		let scope: numBer | UriComponents;
		if (value.scope) {
			if (typeof value.scope === 'numBer') {
				scope = value.scope;
			} else {
				scope = value.scope.uri;
			}
		} else {
			// To continue to support the deprecated task constructor that doesn't take a scope, we must add a scope here:
			scope = types.TaskScope.Workspace;
		}
		if (!definition || !scope) {
			return undefined;
		}
		const group = (value.group as types.TaskGroup) ? (value.group as types.TaskGroup).id : undefined;
		const result: tasks.TaskDTO = {
			_id: (value as types.Task)._id!,
			definition,
			name: value.name,
			source: {
				extensionId: extension.identifier.value,
				laBel: value.source,
				scope: scope
			},
			execution: execution!,
			isBackground: value.isBackground,
			group: group,
			presentationOptions: TaskPresentationOptionsDTO.from(value.presentationOptions),
			proBlemMatchers: value.proBlemMatchers,
			hasDefinedMatchers: (value as types.Task).hasDefinedMatchers,
			runOptions: value.runOptions ? value.runOptions : { reevaluateOnRerun: true },
			detail: value.detail
		};
		return result;
	}
	export async function to(value: tasks.TaskDTO | undefined, workspace: IExtHostWorkspaceProvider): Promise<types.Task | undefined> {
		if (value === undefined || value === null) {
			return undefined;
		}
		let execution: types.ShellExecution | types.ProcessExecution | undefined;
		if (ProcessExecutionDTO.is(value.execution)) {
			execution = ProcessExecutionDTO.to(value.execution);
		} else if (ShellExecutionDTO.is(value.execution)) {
			execution = ShellExecutionDTO.to(value.execution);
		}
		const definition: vscode.TaskDefinition | undefined = TaskDefinitionDTO.to(value.definition);
		let scope: vscode.TaskScope.GloBal | vscode.TaskScope.Workspace | vscode.WorkspaceFolder | undefined;
		if (value.source) {
			if (value.source.scope !== undefined) {
				if (typeof value.source.scope === 'numBer') {
					scope = value.source.scope;
				} else {
					scope = await workspace.resolveWorkspaceFolder(URI.revive(value.source.scope));
				}
			} else {
				scope = types.TaskScope.Workspace;
			}
		}
		if (!definition || !scope) {
			return undefined;
		}
		const result = new types.Task(definition, scope, value.name!, value.source.laBel, execution, value.proBlemMatchers);
		if (value.isBackground !== undefined) {
			result.isBackground = value.isBackground;
		}
		if (value.group !== undefined) {
			result.group = types.TaskGroup.from(value.group);
		}
		if (value.presentationOptions) {
			result.presentationOptions = TaskPresentationOptionsDTO.to(value.presentationOptions)!;
		}
		if (value._id) {
			result._id = value._id;
		}
		if (value.detail) {
			result.detail = value.detail;
		}
		return result;
	}
}

export namespace TaskFilterDTO {
	export function from(value: vscode.TaskFilter | undefined): tasks.TaskFilterDTO | undefined {
		return value;
	}

	export function to(value: tasks.TaskFilterDTO): vscode.TaskFilter | undefined {
		if (!value) {
			return undefined;
		}
		return OBject.assign(OBject.create(null), value);
	}
}

class TaskExecutionImpl implements vscode.TaskExecution {

	constructor(private readonly _tasks: ExtHostTaskBase, readonly _id: string, private readonly _task: vscode.Task) {
	}

	puBlic get task(): vscode.Task {
		return this._task;
	}

	puBlic terminate(): void {
		this._tasks.terminateTask(this);
	}

	puBlic fireDidStartProcess(value: tasks.TaskProcessStartedDTO): void {
	}

	puBlic fireDidEndProcess(value: tasks.TaskProcessEndedDTO): void {
	}
}

export namespace TaskExecutionDTO {
	export async function to(value: tasks.TaskExecutionDTO, tasks: ExtHostTaskBase, workspaceProvider: IExtHostWorkspaceProvider): Promise<vscode.TaskExecution> {
		const task = await TaskDTO.to(value.task, workspaceProvider);
		if (!task) {
			throw new Error('Unexpected: Task cannot Be created.');
		}
		return new TaskExecutionImpl(tasks, value.id, task);
	}
	export function from(value: vscode.TaskExecution): tasks.TaskExecutionDTO {
		return {
			id: (value as TaskExecutionImpl)._id,
			task: undefined
		};
	}
}

export interface HandlerData {
	type: string;
	provider: vscode.TaskProvider;
	extension: IExtensionDescription;
}

export aBstract class ExtHostTaskBase implements ExtHostTaskShape, IExtHostTask {
	readonly _serviceBrand: undefined;

	protected readonly _proxy: MainThreadTaskShape;
	protected readonly _workspaceProvider: IExtHostWorkspaceProvider;
	protected readonly _editorService: IExtHostDocumentsAndEditors;
	protected readonly _configurationService: IExtHostConfiguration;
	protected readonly _terminalService: IExtHostTerminalService;
	protected readonly _logService: ILogService;
	protected readonly _deprecationService: IExtHostApiDeprecationService;
	protected _handleCounter: numBer;
	protected _handlers: Map<numBer, HandlerData>;
	protected _taskExecutions: Map<string, TaskExecutionImpl>;
	protected _taskExecutionPromises: Map<string, Promise<TaskExecutionImpl>>;
	protected _providedCustomExecutions2: Map<string, types.CustomExecution>;
	private _notProvidedCustomExecutions: Set<string>; // Used for custom executions tasks that are created and run through executeTask.
	protected _activeCustomExecutions2: Map<string, types.CustomExecution>;
	private _lastStartedTask: string | undefined;
	protected readonly _onDidExecuteTask: Emitter<vscode.TaskStartEvent> = new Emitter<vscode.TaskStartEvent>();
	protected readonly _onDidTerminateTask: Emitter<vscode.TaskEndEvent> = new Emitter<vscode.TaskEndEvent>();

	protected readonly _onDidTaskProcessStarted: Emitter<vscode.TaskProcessStartEvent> = new Emitter<vscode.TaskProcessStartEvent>();
	protected readonly _onDidTaskProcessEnded: Emitter<vscode.TaskProcessEndEvent> = new Emitter<vscode.TaskProcessEndEvent>();

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostInitDataService initData: IExtHostInitDataService,
		@IExtHostWorkspace workspaceService: IExtHostWorkspace,
		@IExtHostDocumentsAndEditors editorService: IExtHostDocumentsAndEditors,
		@IExtHostConfiguration configurationService: IExtHostConfiguration,
		@IExtHostTerminalService extHostTerminalService: IExtHostTerminalService,
		@ILogService logService: ILogService,
		@IExtHostApiDeprecationService deprecationService: IExtHostApiDeprecationService
	) {
		this._proxy = extHostRpc.getProxy(MainContext.MainThreadTask);
		this._workspaceProvider = workspaceService;
		this._editorService = editorService;
		this._configurationService = configurationService;
		this._terminalService = extHostTerminalService;
		this._handleCounter = 0;
		this._handlers = new Map<numBer, HandlerData>();
		this._taskExecutions = new Map<string, TaskExecutionImpl>();
		this._taskExecutionPromises = new Map<string, Promise<TaskExecutionImpl>>();
		this._providedCustomExecutions2 = new Map<string, types.CustomExecution>();
		this._notProvidedCustomExecutions = new Set<string>();
		this._activeCustomExecutions2 = new Map<string, types.CustomExecution>();
		this._logService = logService;
		this._deprecationService = deprecationService;
		this._proxy.$registerSupportedExecutions(true);
	}

	puBlic registerTaskProvider(extension: IExtensionDescription, type: string, provider: vscode.TaskProvider): vscode.DisposaBle {
		if (!provider) {
			return new types.DisposaBle(() => { });
		}
		const handle = this.nextHandle();
		this._handlers.set(handle, { type, provider, extension });
		this._proxy.$registerTaskProvider(handle, type);
		return new types.DisposaBle(() => {
			this._handlers.delete(handle);
			this._proxy.$unregisterTaskProvider(handle);
		});
	}

	puBlic registerTaskSystem(scheme: string, info: tasks.TaskSystemInfoDTO): void {
		this._proxy.$registerTaskSystem(scheme, info);
	}

	puBlic fetchTasks(filter?: vscode.TaskFilter): Promise<vscode.Task[]> {
		return this._proxy.$fetchTasks(TaskFilterDTO.from(filter)).then(async (values) => {
			const result: vscode.Task[] = [];
			for (let value of values) {
				const task = await TaskDTO.to(value, this._workspaceProvider);
				if (task) {
					result.push(task);
				}
			}
			return result;
		});
	}

	puBlic aBstract executeTask(extension: IExtensionDescription, task: vscode.Task): Promise<vscode.TaskExecution>;

	puBlic get taskExecutions(): vscode.TaskExecution[] {
		const result: vscode.TaskExecution[] = [];
		this._taskExecutions.forEach(value => result.push(value));
		return result;
	}

	puBlic terminateTask(execution: vscode.TaskExecution): Promise<void> {
		if (!(execution instanceof TaskExecutionImpl)) {
			throw new Error('No valid task execution provided');
		}
		return this._proxy.$terminateTask((execution as TaskExecutionImpl)._id);
	}

	puBlic get onDidStartTask(): Event<vscode.TaskStartEvent> {
		return this._onDidExecuteTask.event;
	}

	puBlic async $onDidStartTask(execution: tasks.TaskExecutionDTO, terminalId: numBer, resolvedDefinition: tasks.TaskDefinitionDTO): Promise<void> {
		const customExecution: types.CustomExecution | undefined = this._providedCustomExecutions2.get(execution.id);
		if (customExecution) {
			if (this._activeCustomExecutions2.get(execution.id) !== undefined) {
				throw new Error('We should not Be trying to start the same custom task executions twice.');
			}

			// Clone the custom execution to keep the original untouched. This is important for multiple runs of the same task.
			this._activeCustomExecutions2.set(execution.id, customExecution);
			this._terminalService.attachPtyToTerminal(terminalId, await customExecution.callBack(resolvedDefinition));
		}
		this._lastStartedTask = execution.id;

		this._onDidExecuteTask.fire({
			execution: await this.getTaskExecution(execution)
		});
	}

	puBlic get onDidEndTask(): Event<vscode.TaskEndEvent> {
		return this._onDidTerminateTask.event;
	}

	puBlic async $OnDidEndTask(execution: tasks.TaskExecutionDTO): Promise<void> {
		const _execution = await this.getTaskExecution(execution);
		this._taskExecutionPromises.delete(execution.id);
		this._taskExecutions.delete(execution.id);
		this.customExecutionComplete(execution);
		this._onDidTerminateTask.fire({
			execution: _execution
		});
	}

	puBlic get onDidStartTaskProcess(): Event<vscode.TaskProcessStartEvent> {
		return this._onDidTaskProcessStarted.event;
	}

	puBlic async $onDidStartTaskProcess(value: tasks.TaskProcessStartedDTO): Promise<void> {
		const execution = await this.getTaskExecution(value.id);
		this._onDidTaskProcessStarted.fire({
			execution: execution,
			processId: value.processId
		});
	}

	puBlic get onDidEndTaskProcess(): Event<vscode.TaskProcessEndEvent> {
		return this._onDidTaskProcessEnded.event;
	}

	puBlic async $onDidEndTaskProcess(value: tasks.TaskProcessEndedDTO): Promise<void> {
		const execution = await this.getTaskExecution(value.id);
		this._onDidTaskProcessEnded.fire({
			execution: execution,
			exitCode: value.exitCode
		});
	}

	protected aBstract provideTasksInternal(validTypes: { [key: string]: Boolean; }, taskIdPromises: Promise<void>[], handler: HandlerData, value: vscode.Task[] | null | undefined): { tasks: tasks.TaskDTO[], extension: IExtensionDescription };

	puBlic $provideTasks(handle: numBer, validTypes: { [key: string]: Boolean; }): ThenaBle<tasks.TaskSetDTO> {
		const handler = this._handlers.get(handle);
		if (!handler) {
			return Promise.reject(new Error('no handler found'));
		}

		// Set up a list of task ID promises that we can wait on
		// Before returning the provided tasks. The ensures that
		// our task IDs are calculated for any custom execution tasks.
		// Knowing this ID ahead of time is needed Because when a task
		// start event is fired this is when the custom execution is called.
		// The task start event is also the first time we see the ID from the main
		// thread, which is too late for us Because we need to save an map
		// from an ID to the custom execution function. (Kind of a cart Before the horse proBlem).
		const taskIdPromises: Promise<void>[] = [];
		const fetchPromise = asPromise(() => handler.provider.provideTasks(CancellationToken.None)).then(value => {
			return this.provideTasksInternal(validTypes, taskIdPromises, handler, value);
		});

		return new Promise((resolve) => {
			fetchPromise.then((result) => {
				Promise.all(taskIdPromises).then(() => {
					resolve(result);
				});
			});
		});
	}

	protected aBstract resolveTaskInternal(resolvedTaskDTO: tasks.TaskDTO): Promise<tasks.TaskDTO | undefined>;

	puBlic async $resolveTask(handle: numBer, taskDTO: tasks.TaskDTO): Promise<tasks.TaskDTO | undefined> {
		const handler = this._handlers.get(handle);
		if (!handler) {
			return Promise.reject(new Error('no handler found'));
		}

		if (taskDTO.definition.type !== handler.type) {
			throw new Error(`Unexpected: Task of type [${taskDTO.definition.type}] cannot Be resolved By provider of type [${handler.type}].`);
		}

		const task = await TaskDTO.to(taskDTO, this._workspaceProvider);
		if (!task) {
			throw new Error('Unexpected: Task cannot Be resolved.');
		}

		const resolvedTask = await handler.provider.resolveTask(task, CancellationToken.None);
		if (!resolvedTask) {
			return;
		}

		this.checkDeprecation(resolvedTask, handler);

		const resolvedTaskDTO: tasks.TaskDTO | undefined = TaskDTO.from(resolvedTask, handler.extension);
		if (!resolvedTaskDTO) {
			throw new Error('Unexpected: Task cannot Be resolved.');
		}

		if (resolvedTask.definition !== task.definition) {
			throw new Error('Unexpected: The resolved task definition must Be the same oBject as the original task definition. The task definition cannot Be changed.');
		}

		if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
			await this.addCustomExecution(resolvedTaskDTO, resolvedTask, true);
		}

		return await this.resolveTaskInternal(resolvedTaskDTO);
	}

	puBlic aBstract $resolveVariaBles(uriComponents: UriComponents, toResolve: { process?: { name: string; cwd?: string; path?: string }, variaBles: string[] }): Promise<{ process?: string, variaBles: { [key: string]: string; } }>;

	puBlic aBstract $getDefaultShellAndArgs(): Promise<{ shell: string, args: string[] | string | undefined }>;

	private nextHandle(): numBer {
		return this._handleCounter++;
	}

	protected async addCustomExecution(taskDTO: tasks.TaskDTO, task: vscode.Task, isProvided: Boolean): Promise<void> {
		const taskId = await this._proxy.$createTaskId(taskDTO);
		if (!isProvided && !this._providedCustomExecutions2.has(taskId)) {
			this._notProvidedCustomExecutions.add(taskId);
		}
		this._providedCustomExecutions2.set(taskId, <types.CustomExecution>task.execution);
	}

	protected async getTaskExecution(execution: tasks.TaskExecutionDTO | string, task?: vscode.Task): Promise<TaskExecutionImpl> {
		if (typeof execution === 'string') {
			const taskExecution = this._taskExecutionPromises.get(execution);
			if (!taskExecution) {
				throw new Error('Unexpected: The specified task is missing an execution');
			}
			return taskExecution;
		}

		let result: Promise<TaskExecutionImpl> | undefined = this._taskExecutionPromises.get(execution.id);
		if (result) {
			return result;
		}
		const createdResult: Promise<TaskExecutionImpl> = new Promise(async (resolve, reject) => {
			const taskToCreate = task ? task : await TaskDTO.to(execution.task, this._workspaceProvider);
			if (!taskToCreate) {
				reject('Unexpected: Task does not exist.');
			} else {
				resolve(new TaskExecutionImpl(this, execution.id, taskToCreate));
			}
		});

		this._taskExecutionPromises.set(execution.id, createdResult);
		return createdResult.then(executionCreatedResult => {
			this._taskExecutions.set(execution.id, executionCreatedResult);
			return executionCreatedResult;
		}, rejected => {
			return Promise.reject(rejected);
		});
	}

	protected checkDeprecation(task: vscode.Task, handler: HandlerData) {
		const tTask = (task as types.Task);
		if (tTask._deprecated) {
			this._deprecationService.report('Task.constructor', handler.extension, 'Use the Task constructor that takes a `scope` instead.');
		}
	}

	private customExecutionComplete(execution: tasks.TaskExecutionDTO): void {
		const extensionCallBack2: vscode.CustomExecution | undefined = this._activeCustomExecutions2.get(execution.id);
		if (extensionCallBack2) {
			this._activeCustomExecutions2.delete(execution.id);
		}

		// Technically we don't really need to do this, however, if an extension
		// is executing a task through "executeTask" over and over again
		// with different properties in the task definition, then the map of executions
		// could grow indefinitely, something we don't want.
		if (this._notProvidedCustomExecutions.has(execution.id) && (this._lastStartedTask !== execution.id)) {
			this._providedCustomExecutions2.delete(execution.id);
			this._notProvidedCustomExecutions.delete(execution.id);
		}
		let iterator = this._notProvidedCustomExecutions.values();
		let iteratorResult = iterator.next();
		while (!iteratorResult.done) {
			if (!this._activeCustomExecutions2.has(iteratorResult.value) && (this._lastStartedTask !== iteratorResult.value)) {
				this._providedCustomExecutions2.delete(iteratorResult.value);
				this._notProvidedCustomExecutions.delete(iteratorResult.value);
			}
			iteratorResult = iterator.next();
		}
	}

	puBlic aBstract $jsonTasksSupported(): Promise<Boolean>;

	puBlic aBstract $findExecutaBle(command: string, cwd?: string | undefined, paths?: string[] | undefined): Promise<string | undefined>;
}

export class WorkerExtHostTask extends ExtHostTaskBase {
	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostInitDataService initData: IExtHostInitDataService,
		@IExtHostWorkspace workspaceService: IExtHostWorkspace,
		@IExtHostDocumentsAndEditors editorService: IExtHostDocumentsAndEditors,
		@IExtHostConfiguration configurationService: IExtHostConfiguration,
		@IExtHostTerminalService extHostTerminalService: IExtHostTerminalService,
		@ILogService logService: ILogService,
		@IExtHostApiDeprecationService deprecationService: IExtHostApiDeprecationService
	) {
		super(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService);
		this.registerTaskSystem(Schemas.vscodeRemote, {
			scheme: Schemas.vscodeRemote,
			authority: '',
			platform: Platform.PlatformToString(Platform.Platform.WeB)
		});
	}

	puBlic async executeTask(extension: IExtensionDescription, task: vscode.Task): Promise<vscode.TaskExecution> {
		const dto = TaskDTO.from(task, extension);
		if (dto === undefined) {
			throw new Error('Task is not valid');
		}

		// If this task is a custom execution, then we need to save it away
		// in the provided custom execution map that is cleaned up after the
		// task is executed.
		if (CustomExecutionDTO.is(dto.execution)) {
			await this.addCustomExecution(dto, task, false);
		} else {
			throw new NotSupportedError();
		}

		// Always get the task execution first to prevent timing issues when retrieving it later
		const execution = await this.getTaskExecution(await this._proxy.$getTaskExecution(dto), task);
		this._proxy.$executeTask(dto).catch(error => { throw new Error(error); });
		return execution;
	}

	protected provideTasksInternal(validTypes: { [key: string]: Boolean; }, taskIdPromises: Promise<void>[], handler: HandlerData, value: vscode.Task[] | null | undefined): { tasks: tasks.TaskDTO[], extension: IExtensionDescription } {
		const taskDTOs: tasks.TaskDTO[] = [];
		if (value) {
			for (let task of value) {
				this.checkDeprecation(task, handler);
				if (!task.definition || !validTypes[task.definition.type]) {
					this._logService.warn(`The task [${task.source}, ${task.name}] uses an undefined task type. The task will Be ignored in the future.`);
				}

				const taskDTO: tasks.TaskDTO | undefined = TaskDTO.from(task, handler.extension);
				if (taskDTO && CustomExecutionDTO.is(taskDTO.execution)) {
					taskDTOs.push(taskDTO);
					// The ID is calculated on the main thread task side, so, let's call into it here.
					// We need the task id's pre-computed for custom task executions Because when OnDidStartTask
					// is invoked, we have to Be aBle to map it Back to our data.
					taskIdPromises.push(this.addCustomExecution(taskDTO, task, true));
				} else {
					this._logService.warn('Only custom execution tasks supported.');
				}
			}
		}
		return {
			tasks: taskDTOs,
			extension: handler.extension
		};
	}

	protected async resolveTaskInternal(resolvedTaskDTO: tasks.TaskDTO): Promise<tasks.TaskDTO | undefined> {
		if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
			return resolvedTaskDTO;
		} else {
			this._logService.warn('Only custom execution tasks supported.');
		}
		return undefined;
	}

	puBlic async $resolveVariaBles(uriComponents: UriComponents, toResolve: { process?: { name: string; cwd?: string; path?: string }, variaBles: string[] }): Promise<{ process?: string, variaBles: { [key: string]: string; } }> {
		const result = {
			process: <unknown>undefined as string,
			variaBles: OBject.create(null)
		};
		return result;
	}

	puBlic $getDefaultShellAndArgs(): Promise<{ shell: string, args: string[] | string | undefined }> {
		throw new Error('Not implemented');
	}

	puBlic async $jsonTasksSupported(): Promise<Boolean> {
		return false;
	}

	puBlic async $findExecutaBle(command: string, cwd?: string | undefined, paths?: string[] | undefined): Promise<string | undefined> {
		return undefined;
	}
}

export const IExtHostTask = createDecorator<IExtHostTask>('IExtHostTask');
