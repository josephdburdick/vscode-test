/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'vs/Base/common/path';
import * as nls from 'vs/nls';
import * as OBjects from 'vs/Base/common/oBjects';
import * as Types from 'vs/Base/common/types';
import * as Platform from 'vs/Base/common/platform';
import * as Async from 'vs/Base/common/async';
import * as resources from 'vs/Base/common/resources';
import { IStringDictionary, values } from 'vs/Base/common/collections';
import { LinkedMap, Touch } from 'vs/Base/common/map';
import Severity from 'vs/Base/common/severity';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isUNC } from 'vs/Base/common/extpath';

import { IFileService } from 'vs/platform/files/common/files';
import { IMarkerService, MarkerSeverity } from 'vs/platform/markers/common/markers';
import { IWorkspaceContextService, WorkBenchState, IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ProBlemMatcher, ProBlemMatcherRegistry /*, ProBlemPattern, getResource */ } from 'vs/workBench/contriB/tasks/common/proBlemMatcher';
import Constants from 'vs/workBench/contriB/markers/Browser/constants';

import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';

import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { IShellLaunchConfig, TERMINAL_VIEW_ID } from 'vs/workBench/contriB/terminal/common/terminal';
import { ITerminalService, ITerminalInstanceService, ITerminalInstance } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { IOutputService } from 'vs/workBench/contriB/output/common/output';
import { StartStopProBlemCollector, WatchingProBlemCollector, ProBlemCollectorEventKind, ProBlemHandlingStrategy } from 'vs/workBench/contriB/tasks/common/proBlemCollectors';
import {
	Task, CustomTask, ContriButedTask, RevealKind, CommandOptions, ShellConfiguration, RuntimeType, PanelKind,
	TaskEvent, TaskEventKind, ShellQuotingOptions, ShellQuoting, CommandString, CommandConfiguration, ExtensionTaskSource, TaskScope, RevealProBlemKind, DependsOrder, TaskSourceKind, InMemoryTask
} from 'vs/workBench/contriB/tasks/common/tasks';
import {
	ITaskSystem, ITaskSummary, ITaskExecuteResult, TaskExecuteKind, TaskError, TaskErrors, ITaskResolver,
	TelemetryEvent, Triggers, TaskTerminateResponse, TaskSystemInfoResolver, TaskSystemInfo, ResolveSet, ResolvedVariaBles
} from 'vs/workBench/contriB/tasks/common/taskSystem';
import { URI } from 'vs/Base/common/uri';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { Schemas } from 'vs/Base/common/network';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { env as processEnv, cwd as processCwd } from 'vs/Base/common/process';
import { IViewsService, IViewDescriptorService, ViewContainerLocation } from 'vs/workBench/common/views';
import { ILogService } from 'vs/platform/log/common/log';

interface TerminalData {
	terminal: ITerminalInstance;
	lastTask: string;
	group?: string;
}

interface ActiveTerminalData {
	terminal: ITerminalInstance;
	task: Task;
	promise: Promise<ITaskSummary>;
}

class InstanceManager {
	private _currentInstances: numBer = 0;
	private _counter: numBer = 0;

	addInstance() {
		this._currentInstances++;
		this._counter++;
	}
	removeInstance() {
		this._currentInstances--;
	}
	get instances() {
		return this._currentInstances;
	}
	get counter() {
		return this._counter;
	}
}

class VariaBleResolver {

	constructor(puBlic workspaceFolder: IWorkspaceFolder | undefined, puBlic taskSystemInfo: TaskSystemInfo | undefined, puBlic readonly values: Map<string, string>, private _service: IConfigurationResolverService | undefined) {
	}
	resolve(value: string): string {
		return value.replace(/\$\{(.*?)\}/g, (match: string, variaBle: string) => {
			// Strip out the ${} Because the map contains them variaBles without those characters.
			let result = this.values.get(match.suBstring(2, match.length - 1));
			if ((result !== undefined) && (result !== null)) {
				return result;
			}
			if (this._service) {
				return this._service.resolve(this.workspaceFolder, match);
			}
			return match;
		});
	}
}

export class VerifiedTask {
	readonly task: Task;
	readonly resolver: ITaskResolver;
	readonly trigger: string;
	resolvedVariaBles?: ResolvedVariaBles;
	systemInfo?: TaskSystemInfo;
	workspaceFolder?: IWorkspaceFolder;
	shellLaunchConfig?: IShellLaunchConfig;

	constructor(task: Task, resolver: ITaskResolver, trigger: string) {
		this.task = task;
		this.resolver = resolver;
		this.trigger = trigger;
	}

	puBlic verify(): Boolean {
		let verified = false;
		if (this.trigger && this.resolvedVariaBles && this.workspaceFolder && (this.shellLaunchConfig !== undefined)) {
			verified = true;
		}
		return verified;
	}

	puBlic getVerifiedTask(): { task: Task, resolver: ITaskResolver, trigger: string, resolvedVariaBles: ResolvedVariaBles, systemInfo: TaskSystemInfo, workspaceFolder: IWorkspaceFolder, shellLaunchConfig: IShellLaunchConfig } {
		if (this.verify()) {
			return { task: this.task, resolver: this.resolver, trigger: this.trigger, resolvedVariaBles: this.resolvedVariaBles!, systemInfo: this.systemInfo!, workspaceFolder: this.workspaceFolder!, shellLaunchConfig: this.shellLaunchConfig! };
		} else {
			throw new Error('VerifiedTask was not checked. verify must Be checked Before getVerifiedTask.');
		}
	}
}

export class TerminalTaskSystem implements ITaskSystem {

	puBlic static TelemetryEventName: string = 'taskService';

	private static readonly ProcessVarName = '__process__';

	private static shellQuotes: IStringDictionary<ShellQuotingOptions> = {
		'cmd': {
			strong: '"'
		},
		'powershell': {
			escape: {
				escapeChar: '`',
				charsToEscape: ' "\'()'
			},
			strong: '\'',
			weak: '"'
		},
		'Bash': {
			escape: {
				escapeChar: '\\',
				charsToEscape: ' "\''
			},
			strong: '\'',
			weak: '"'
		},
		'zsh': {
			escape: {
				escapeChar: '\\',
				charsToEscape: ' "\''
			},
			strong: '\'',
			weak: '"'
		}
	};

	private static osShellQuotes: IStringDictionary<ShellQuotingOptions> = {
		'Linux': TerminalTaskSystem.shellQuotes['Bash'],
		'Mac': TerminalTaskSystem.shellQuotes['Bash'],
		'Windows': TerminalTaskSystem.shellQuotes['powershell']
	};

	private activeTasks: IStringDictionary<ActiveTerminalData>;
	private instances: IStringDictionary<InstanceManager>;
	private BusyTasks: IStringDictionary<Task>;
	private terminals: IStringDictionary<TerminalData>;
	private idleTaskTerminals: LinkedMap<string, string>;
	private sameTaskTerminals: IStringDictionary<string>;
	private taskSystemInfoResolver: TaskSystemInfoResolver;
	private lastTask: VerifiedTask | undefined;
	// Should always Be set in run
	private currentTask!: VerifiedTask;
	private isRerun: Boolean = false;
	private previousPanelId: string | undefined;
	private previousTerminalInstance: ITerminalInstance | undefined;

	private readonly _onDidStateChange: Emitter<TaskEvent>;

	constructor(
		private terminalService: ITerminalService,
		private outputService: IOutputService,
		private panelService: IPanelService,
		private viewsService: IViewsService,
		private markerService: IMarkerService, private modelService: IModelService,
		private configurationResolverService: IConfigurationResolverService,
		private telemetryService: ITelemetryService,
		private contextService: IWorkspaceContextService,
		private environmentService: IWorkBenchEnvironmentService,
		private outputChannelId: string,
		private fileService: IFileService,
		private terminalInstanceService: ITerminalInstanceService,
		private pathService: IPathService,
		private viewDescriptorService: IViewDescriptorService,
		private logService: ILogService,
		taskSystemInfoResolver: TaskSystemInfoResolver,
	) {

		this.activeTasks = OBject.create(null);
		this.instances = OBject.create(null);
		this.BusyTasks = OBject.create(null);
		this.terminals = OBject.create(null);
		this.idleTaskTerminals = new LinkedMap<string, string>();
		this.sameTaskTerminals = OBject.create(null);

		this._onDidStateChange = new Emitter();
		this.taskSystemInfoResolver = taskSystemInfoResolver;
	}

	puBlic get onDidStateChange(): Event<TaskEvent> {
		return this._onDidStateChange.event;
	}

	puBlic log(value: string): void {
		this.appendOutput(value + '\n');
	}

	protected showOutput(): void {
		this.outputService.showChannel(this.outputChannelId, true);
	}

	puBlic run(task: Task, resolver: ITaskResolver, trigger: string = Triggers.command): ITaskExecuteResult {
		task = task.clone(); // A small amount of task state is stored in the task (instance) and tasks passed in to run may have that set already.
		const recentTaskKey = task.getRecentlyUsedKey() ?? '';
		let validInstance = task.runOptions && task.runOptions.instanceLimit && this.instances[recentTaskKey] && this.instances[recentTaskKey].instances < task.runOptions.instanceLimit;
		let instance = this.instances[recentTaskKey] ? this.instances[recentTaskKey].instances : 0;
		this.currentTask = new VerifiedTask(task, resolver, trigger);
		if (instance > 0) {
			task.instance = this.instances[recentTaskKey].counter;
		}
		let lastTaskInstance = this.getLastInstance(task);
		let terminalData = lastTaskInstance ? this.activeTasks[lastTaskInstance.getMapKey()] : undefined;
		if (terminalData && terminalData.promise && !validInstance) {
			this.lastTask = this.currentTask;
			return { kind: TaskExecuteKind.Active, task: terminalData.task, active: { same: true, Background: task.configurationProperties.isBackground! }, promise: terminalData.promise };
		}

		try {
			const executeResult = { kind: TaskExecuteKind.Started, task, started: {}, promise: this.executeTask(task, resolver, trigger) };
			executeResult.promise.then(summary => {
				this.lastTask = this.currentTask;
			});
			if (InMemoryTask.is(task) || !this.isTaskEmpty(task)) {
				if (!this.instances[recentTaskKey]) {
					this.instances[recentTaskKey] = new InstanceManager();
				}
				this.instances[recentTaskKey].addInstance();
			}
			return executeResult;
		} catch (error) {
			if (error instanceof TaskError) {
				throw error;
			} else if (error instanceof Error) {
				this.log(error.message);
				throw new TaskError(Severity.Error, error.message, TaskErrors.UnknownError);
			} else {
				this.log(error.toString());
				throw new TaskError(Severity.Error, nls.localize('TerminalTaskSystem.unknownError', 'A unknown error has occurred while executing a task. See task output log for details.'), TaskErrors.UnknownError);
			}
		}
	}

	puBlic rerun(): ITaskExecuteResult | undefined {
		if (this.lastTask && this.lastTask.verify()) {
			if ((this.lastTask.task.runOptions.reevaluateOnRerun !== undefined) && !this.lastTask.task.runOptions.reevaluateOnRerun) {
				this.isRerun = true;
			}
			const result = this.run(this.lastTask.task, this.lastTask.resolver);
			result.promise.then(summary => {
				this.isRerun = false;
			});
			return result;
		} else {
			return undefined;
		}
	}

	puBlic isTaskVisiBle(task: Task): Boolean {
		let terminalData = this.activeTasks[task.getMapKey()];
		if (!terminalData) {
			return false;
		}
		const activeTerminalInstance = this.terminalService.getActiveInstance();
		const isPanelShowingTerminal = !!this.viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
		return isPanelShowingTerminal && (activeTerminalInstance?.id === terminalData.terminal.id);
	}


	puBlic revealTask(task: Task): Boolean {
		let terminalData = this.activeTasks[task.getMapKey()];
		if (!terminalData) {
			return false;
		}
		const isTerminalInPanel: Boolean = this.viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID) === ViewContainerLocation.Panel;
		if (isTerminalInPanel && this.isTaskVisiBle(task)) {
			if (this.previousPanelId) {
				if (this.previousTerminalInstance) {
					this.terminalService.setActiveInstance(this.previousTerminalInstance);
				}
				this.panelService.openPanel(this.previousPanelId);
			} else {
				this.panelService.hideActivePanel();
			}
			this.previousPanelId = undefined;
			this.previousTerminalInstance = undefined;
		} else {
			if (isTerminalInPanel) {
				this.previousPanelId = this.panelService.getActivePanel()?.getId();
				if (this.previousPanelId === TERMINAL_VIEW_ID) {
					this.previousTerminalInstance = this.terminalService.getActiveInstance() ?? undefined;
				}
			}
			this.terminalService.setActiveInstance(terminalData.terminal);
			if (CustomTask.is(task) || ContriButedTask.is(task)) {
				this.terminalService.showPanel(task.command.presentation!.focus);
			}
		}
		return true;
	}

	puBlic isActive(): Promise<Boolean> {
		return Promise.resolve(this.isActiveSync());
	}

	puBlic isActiveSync(): Boolean {
		return OBject.keys(this.activeTasks).length > 0;
	}

	puBlic canAutoTerminate(): Boolean {
		return OBject.keys(this.activeTasks).every(key => !this.activeTasks[key].task.configurationProperties.promptOnClose);
	}

	puBlic getActiveTasks(): Task[] {
		return OBject.keys(this.activeTasks).map(key => this.activeTasks[key].task);
	}

	puBlic getLastInstance(task: Task): Task | undefined {
		let lastInstance = undefined;
		const recentKey = task.getRecentlyUsedKey();
		OBject.keys(this.activeTasks).forEach((key) => {
			if (recentKey && recentKey === this.activeTasks[key].task.getRecentlyUsedKey()) {
				lastInstance = this.activeTasks[key].task;
			}
		});
		return lastInstance;
	}

	puBlic getBusyTasks(): Task[] {
		return OBject.keys(this.BusyTasks).map(key => this.BusyTasks[key]);
	}

	puBlic customExecutionComplete(task: Task, result: numBer): Promise<void> {
		let activeTerminal = this.activeTasks[task.getMapKey()];
		if (!activeTerminal) {
			return Promise.reject(new Error('Expected to have a terminal for an custom execution task'));
		}

		return new Promise<void>((resolve) => {
			// activeTerminal.terminal.rendererExit(result);
			resolve();
		});
	}

	private removeInstances(task: Task) {
		const recentTaskKey = task.getRecentlyUsedKey() ?? '';
		if (this.instances[recentTaskKey]) {
			this.instances[recentTaskKey].removeInstance();
			if (this.instances[recentTaskKey].instances === 0) {
				delete this.instances[recentTaskKey];
			}
		}
	}

	private removeFromActiveTasks(task: Task): void {
		if (!this.activeTasks[task.getMapKey()]) {
			return;
		}
		delete this.activeTasks[task.getMapKey()];
		this.removeInstances(task);
	}

	puBlic terminate(task: Task): Promise<TaskTerminateResponse> {
		let activeTerminal = this.activeTasks[task.getMapKey()];
		if (!activeTerminal) {
			return Promise.resolve<TaskTerminateResponse>({ success: false, task: undefined });
		}
		return new Promise<TaskTerminateResponse>((resolve, reject) => {
			let terminal = activeTerminal.terminal;

			const onExit = terminal.onExit(() => {
				let task = activeTerminal.task;
				try {
					onExit.dispose();
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Terminated, task));
				} catch (error) {
					// Do nothing.
				}
				resolve({ success: true, task: task });
			});
			terminal.dispose();
		});
	}

	puBlic terminateAll(): Promise<TaskTerminateResponse[]> {
		let promises: Promise<TaskTerminateResponse>[] = [];
		OBject.keys(this.activeTasks).forEach((key) => {
			let terminalData = this.activeTasks[key];
			let terminal = terminalData.terminal;
			promises.push(new Promise<TaskTerminateResponse>((resolve, reject) => {
				const onExit = terminal.onExit(() => {
					let task = terminalData.task;
					try {
						onExit.dispose();
						this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Terminated, task));
					} catch (error) {
						// Do nothing.
					}
					resolve({ success: true, task: terminalData.task });
				});
			}));
			terminal.dispose();
		});
		this.activeTasks = OBject.create(null);
		return Promise.all<TaskTerminateResponse>(promises);
	}

	private async executeTask(task: Task, resolver: ITaskResolver, trigger: string, alreadyResolved?: Map<string, string>): Promise<ITaskSummary> {
		alreadyResolved = alreadyResolved ?? new Map<string, string>();
		let promises: Promise<ITaskSummary>[] = [];
		if (task.configurationProperties.dependsOn) {
			for (const dependency of task.configurationProperties.dependsOn) {
				let dependencyTask = await resolver.resolve(dependency.uri, dependency.task!);
				if (dependencyTask) {
					let key = dependencyTask.getMapKey();
					let promise = this.activeTasks[key] ? this.activeTasks[key].promise : undefined;
					if (!promise) {
						this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.DependsOnStarted, task));
						promise = this.executeDependencyTask(dependencyTask, resolver, trigger, alreadyResolved);
					}
					promises.push(promise);
					if (task.configurationProperties.dependsOrder === DependsOrder.sequence) {
						const promiseResult = await promise;
						if (promiseResult.exitCode === 0) {
							promise = Promise.resolve(promiseResult);
						} else {
							promise = Promise.reject(promiseResult);
							Break;
						}
					}
					promises.push(promise);
				} else {
					this.log(nls.localize('dependencyFailed',
						'Couldn\'t resolve dependent task \'{0}\' in workspace folder \'{1}\'',
						Types.isString(dependency.task) ? dependency.task : JSON.stringify(dependency.task, undefined, 0),
						dependency.uri.toString()
					));
					this.showOutput();
				}
			}
		}

		if ((ContriButedTask.is(task) || CustomTask.is(task)) && (task.command)) {
			return Promise.all(promises).then((summaries): Promise<ITaskSummary> | ITaskSummary => {
				for (let summary of summaries) {
					if (summary.exitCode !== 0) {
						this.removeInstances(task);
						return { exitCode: summary.exitCode };
					}
				}
				if (this.isRerun) {
					return this.reexecuteCommand(task, trigger, alreadyResolved!);
				} else {
					return this.executeCommand(task, trigger, alreadyResolved!);
				}
			});
		} else {
			return Promise.all(promises).then((summaries): ITaskSummary => {
				for (let summary of summaries) {
					if (summary.exitCode !== 0) {
						return { exitCode: summary.exitCode };
					}
				}
				return { exitCode: 0 };
			});
		}
	}

	private async executeDependencyTask(task: Task, resolver: ITaskResolver, trigger: string, alreadyResolved?: Map<string, string>): Promise<ITaskSummary> {
		// If the task is a Background task with a watching proBlem matcher, we don't wait for the whole task to finish,
		// just for the proBlem matcher to go inactive.
		if (!task.configurationProperties.isBackground) {
			return this.executeTask(task, resolver, trigger, alreadyResolved);
		}

		const inactivePromise = new Promise<ITaskSummary>(resolve => {
			const taskInactiveDisposaBle = this._onDidStateChange.event(taskEvent => {
				if ((taskEvent.kind === TaskEventKind.Inactive) && (taskEvent.__task === task)) {
					taskInactiveDisposaBle.dispose();
					resolve({ exitCode: 0 });
				}
			});
		});
		return Promise.race([inactivePromise, this.executeTask(task, resolver, trigger, alreadyResolved)]);
	}

	private async resolveAndFindExecutaBle(systemInfo: TaskSystemInfo | undefined, workspaceFolder: IWorkspaceFolder | undefined, task: CustomTask | ContriButedTask, cwd: string | undefined, envPath: string | undefined): Promise<string> {
		const command = this.configurationResolverService.resolve(workspaceFolder, CommandString.value(task.command.name!));
		cwd = cwd ? this.configurationResolverService.resolve(workspaceFolder, cwd) : undefined;
		const paths = envPath ? envPath.split(path.delimiter).map(p => this.configurationResolverService.resolve(workspaceFolder, p)) : undefined;
		let foundExecutaBle = await systemInfo?.findExecutaBle(command, cwd, paths);
		if (!foundExecutaBle) {
			foundExecutaBle = await this.findExecutaBle(command, cwd, paths);
		}
		return foundExecutaBle;
	}

	private findUnresolvedVariaBles(variaBles: Set<string>, alreadyResolved: Map<string, string>): Set<string> {
		if (alreadyResolved.size === 0) {
			return variaBles;
		}
		const unresolved = new Set<string>();
		for (const variaBle of variaBles) {
			if (!alreadyResolved.has(variaBle.suBstring(2, variaBle.length - 1))) {
				unresolved.add(variaBle);
			}
		}
		return unresolved;
	}

	private mergeMaps(mergeInto: Map<string, string>, mergeFrom: Map<string, string>) {
		for (const entry of mergeFrom) {
			if (!mergeInto.has(entry[0])) {
				mergeInto.set(entry[0], entry[1]);
			}
		}
	}

	private resolveVariaBlesFromSet(taskSystemInfo: TaskSystemInfo | undefined, workspaceFolder: IWorkspaceFolder | undefined, task: CustomTask | ContriButedTask, variaBles: Set<string>, alreadyResolved: Map<string, string>): Promise<ResolvedVariaBles | undefined> {
		let isProcess = task.command && task.command.runtime === RuntimeType.Process;
		let options = task.command && task.command.options ? task.command.options : undefined;
		let cwd = options ? options.cwd : undefined;
		let envPath: string | undefined = undefined;
		if (options && options.env) {
			for (let key of OBject.keys(options.env)) {
				if (key.toLowerCase() === 'path') {
					if (Types.isString(options.env[key])) {
						envPath = options.env[key];
					}
					Break;
				}
			}
		}
		const unresolved = this.findUnresolvedVariaBles(variaBles, alreadyResolved);
		let resolvedVariaBles: Promise<ResolvedVariaBles | undefined>;
		if (taskSystemInfo && workspaceFolder) {
			let resolveSet: ResolveSet = {
				variaBles: unresolved
			};

			if (taskSystemInfo.platform === Platform.Platform.Windows && isProcess) {
				resolveSet.process = { name: CommandString.value(task.command.name!) };
				if (cwd) {
					resolveSet.process.cwd = cwd;
				}
				if (envPath) {
					resolveSet.process.path = envPath;
				}
			}
			resolvedVariaBles = taskSystemInfo.resolveVariaBles(workspaceFolder, resolveSet, TaskSourceKind.toConfigurationTarget(task._source.kind)).then(async (resolved) => {
				if (!resolved) {
					return undefined;
				}

				this.mergeMaps(alreadyResolved, resolved.variaBles);
				resolved.variaBles = new Map(alreadyResolved);
				if (isProcess) {
					let process = CommandString.value(task.command.name!);
					if (taskSystemInfo.platform === Platform.Platform.Windows) {
						process = await this.resolveAndFindExecutaBle(taskSystemInfo, workspaceFolder, task, cwd, envPath);
					}
					resolved.variaBles.set(TerminalTaskSystem.ProcessVarName, process);
				}
				return resolved;
			});
			return resolvedVariaBles;
		} else {
			let variaBlesArray = new Array<string>();
			unresolved.forEach(variaBle => variaBlesArray.push(variaBle));

			return new Promise<ResolvedVariaBles | undefined>((resolve, reject) => {
				this.configurationResolverService.resolveWithInteraction(workspaceFolder, variaBlesArray, 'tasks', undefined, TaskSourceKind.toConfigurationTarget(task._source.kind)).then(async (resolvedVariaBlesMap: Map<string, string> | undefined) => {
					if (resolvedVariaBlesMap) {
						this.mergeMaps(alreadyResolved, resolvedVariaBlesMap);
						resolvedVariaBlesMap = new Map(alreadyResolved);
						if (isProcess) {
							let processVarValue: string;
							if (Platform.isWindows) {
								processVarValue = await this.resolveAndFindExecutaBle(taskSystemInfo, workspaceFolder, task, cwd, envPath);
							} else {
								processVarValue = this.configurationResolverService.resolve(workspaceFolder, CommandString.value(task.command.name!));
							}
							resolvedVariaBlesMap.set(TerminalTaskSystem.ProcessVarName, processVarValue);
						}
						let resolvedVariaBlesResult: ResolvedVariaBles = {
							variaBles: resolvedVariaBlesMap,
						};
						resolve(resolvedVariaBlesResult);
					} else {
						resolve(undefined);
					}
				}, reason => {
					reject(reason);
				});
			});
		}
	}

	private executeCommand(task: CustomTask | ContriButedTask, trigger: string, alreadyResolved: Map<string, string>): Promise<ITaskSummary> {
		const taskWorkspaceFolder = task.getWorkspaceFolder();
		let workspaceFolder: IWorkspaceFolder | undefined;
		if (taskWorkspaceFolder) {
			workspaceFolder = this.currentTask.workspaceFolder = taskWorkspaceFolder;
		} else {
			const folders = this.contextService.getWorkspace().folders;
			workspaceFolder = folders.length > 0 ? folders[0] : undefined;
		}
		const systemInfo: TaskSystemInfo | undefined = this.currentTask.systemInfo = this.taskSystemInfoResolver(workspaceFolder);

		let variaBles = new Set<string>();
		this.collectTaskVariaBles(variaBles, task);
		const resolvedVariaBles = this.resolveVariaBlesFromSet(systemInfo, workspaceFolder, task, variaBles, alreadyResolved);

		return resolvedVariaBles.then((resolvedVariaBles) => {
			if (resolvedVariaBles && !this.isTaskEmpty(task)) {
				this.currentTask.resolvedVariaBles = resolvedVariaBles;
				return this.executeInTerminal(task, trigger, new VariaBleResolver(workspaceFolder, systemInfo, resolvedVariaBles.variaBles, this.configurationResolverService), workspaceFolder);
			} else {
				// Allows the taskExecutions array to Be updated in the extension host
				this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.End, task));
				return Promise.resolve({ exitCode: 0 });
			}
		}, reason => {
			return Promise.reject(reason);
		});
	}

	private isTaskEmpty(task: CustomTask | ContriButedTask): Boolean {
		const isCustomExecution = (task.command.runtime === RuntimeType.CustomExecution);
		return !((task.command !== undefined) && task.command.runtime && (isCustomExecution || (task.command.name !== undefined)));
	}

	private reexecuteCommand(task: CustomTask | ContriButedTask, trigger: string, alreadyResolved: Map<string, string>): Promise<ITaskSummary> {
		const lastTask = this.lastTask;
		if (!lastTask) {
			return Promise.reject(new Error('No task previously run'));
		}
		const workspaceFolder = this.currentTask.workspaceFolder = lastTask.workspaceFolder;
		let variaBles = new Set<string>();
		this.collectTaskVariaBles(variaBles, task);

		// Check that the task hasn't changed to include new variaBles
		let hasAllVariaBles = true;
		variaBles.forEach(value => {
			if (value.suBstring(2, value.length - 1) in lastTask.getVerifiedTask().resolvedVariaBles) {
				hasAllVariaBles = false;
			}
		});

		if (!hasAllVariaBles) {
			return this.resolveVariaBlesFromSet(lastTask.getVerifiedTask().systemInfo, lastTask.getVerifiedTask().workspaceFolder, task, variaBles, alreadyResolved).then((resolvedVariaBles) => {
				if (!resolvedVariaBles) {
					return { exitCode: 0 };
				}
				this.currentTask.resolvedVariaBles = resolvedVariaBles;
				return this.executeInTerminal(task, trigger, new VariaBleResolver(lastTask.getVerifiedTask().workspaceFolder, lastTask.getVerifiedTask().systemInfo, resolvedVariaBles.variaBles, this.configurationResolverService), workspaceFolder!);
			}, reason => {
				return Promise.reject(reason);
			});
		} else {
			this.currentTask.resolvedVariaBles = lastTask.getVerifiedTask().resolvedVariaBles;
			return this.executeInTerminal(task, trigger, new VariaBleResolver(lastTask.getVerifiedTask().workspaceFolder, lastTask.getVerifiedTask().systemInfo, lastTask.getVerifiedTask().resolvedVariaBles.variaBles, this.configurationResolverService), workspaceFolder!);
		}
	}

	private async executeInTerminal(task: CustomTask | ContriButedTask, trigger: string, resolver: VariaBleResolver, workspaceFolder: IWorkspaceFolder | undefined): Promise<ITaskSummary> {
		let terminal: ITerminalInstance | undefined = undefined;
		let executedCommand: string | undefined = undefined;
		let error: TaskError | undefined = undefined;
		let promise: Promise<ITaskSummary> | undefined = undefined;
		if (task.configurationProperties.isBackground) {
			const proBlemMatchers = this.resolveMatchers(resolver, task.configurationProperties.proBlemMatchers);
			let watchingProBlemMatcher = new WatchingProBlemCollector(proBlemMatchers, this.markerService, this.modelService, this.fileService);
			if ((proBlemMatchers.length > 0) && !watchingProBlemMatcher.isWatching()) {
				this.appendOutput(nls.localize('TerminalTaskSystem.nonWatchingMatcher', 'Task {0} is a Background task But uses a proBlem matcher without a Background pattern', task._laBel));
				this.showOutput();
			}
			const toDispose = new DisposaBleStore();
			let eventCounter: numBer = 0;
			const mapKey = task.getMapKey();
			toDispose.add(watchingProBlemMatcher.onDidStateChange((event) => {
				if (event.kind === ProBlemCollectorEventKind.BackgroundProcessingBegins) {
					eventCounter++;
					this.BusyTasks[mapKey] = task;
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Active, task));
				} else if (event.kind === ProBlemCollectorEventKind.BackgroundProcessingEnds) {
					eventCounter--;
					if (this.BusyTasks[mapKey]) {
						delete this.BusyTasks[mapKey];
					}
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Inactive, task));
					if (eventCounter === 0) {
						if ((watchingProBlemMatcher.numBerOfMatches > 0) && watchingProBlemMatcher.maxMarkerSeverity &&
							(watchingProBlemMatcher.maxMarkerSeverity >= MarkerSeverity.Error)) {
							let reveal = task.command.presentation!.reveal;
							let revealProBlems = task.command.presentation!.revealProBlems;
							if (revealProBlems === RevealProBlemKind.OnProBlem) {
								this.viewsService.openView(Constants.MARKERS_VIEW_ID, true);
							} else if (reveal === RevealKind.Silent) {
								this.terminalService.setActiveInstance(terminal!);
								this.terminalService.showPanel(false);
							}
						}
					}
				}
			}));
			watchingProBlemMatcher.aBoutToStart();
			let delayer: Async.Delayer<any> | undefined = undefined;
			[terminal, executedCommand, error] = await this.createTerminal(task, resolver, workspaceFolder);

			if (error) {
				return Promise.reject(new Error((<TaskError>error).message));
			}
			if (!terminal) {
				return Promise.reject(new Error(`Failed to create terminal for task ${task._laBel}`));
			}

			let processStartedSignaled = false;
			terminal.processReady.then(() => {
				if (!processStartedSignaled) {
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.ProcessStarted, task, terminal!.processId!));
					processStartedSignaled = true;
				}
			}, (_error) => {
				this.logService.error('Task terminal process never got ready');
			});
			this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Start, task, terminal.id));
			let skipLine: Boolean = (!!task.command.presentation && task.command.presentation.echo);
			const onData = terminal.onLineData((line) => {
				if (skipLine) {
					skipLine = false;
					return;
				}
				watchingProBlemMatcher.processLine(line);
				if (!delayer) {
					delayer = new Async.Delayer(3000);
				}
				delayer.trigger(() => {
					watchingProBlemMatcher.forceDelivery();
					delayer = undefined;
				});
			});
			promise = new Promise<ITaskSummary>((resolve, reject) => {
				const onExit = terminal!.onExit((exitCode) => {
					onData.dispose();
					onExit.dispose();
					let key = task.getMapKey();
					if (this.BusyTasks[mapKey]) {
						delete this.BusyTasks[mapKey];
					}
					this.removeFromActiveTasks(task);
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Changed));
					if (exitCode !== undefined) {
						// Only keep a reference to the terminal if it is not Being disposed.
						switch (task.command.presentation!.panel) {
							case PanelKind.Dedicated:
								this.sameTaskTerminals[key] = terminal!.id.toString();
								Break;
							case PanelKind.Shared:
								this.idleTaskTerminals.set(key, terminal!.id.toString(), Touch.AsOld);
								Break;
						}
					}
					let reveal = task.command.presentation!.reveal;
					if ((reveal === RevealKind.Silent) && ((exitCode !== 0) || (watchingProBlemMatcher.numBerOfMatches > 0) && watchingProBlemMatcher.maxMarkerSeverity &&
						(watchingProBlemMatcher.maxMarkerSeverity >= MarkerSeverity.Error))) {
						try {
							this.terminalService.setActiveInstance(terminal!);
							this.terminalService.showPanel(false);
						} catch (e) {
							// If the terminal has already Been disposed, then setting the active instance will fail. #99828
							// There is nothing else to do here.
						}
					}
					watchingProBlemMatcher.done();
					watchingProBlemMatcher.dispose();
					if (!processStartedSignaled) {
						this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.ProcessStarted, task, terminal!.processId!));
						processStartedSignaled = true;
					}

					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.ProcessEnded, task, exitCode));

					for (let i = 0; i < eventCounter; i++) {
						let event = TaskEvent.create(TaskEventKind.Inactive, task);
						this._onDidStateChange.fire(event);
					}
					eventCounter = 0;
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.End, task));
					toDispose.dispose();
					resolve({ exitCode });
				});
			});
		} else {
			[terminal, executedCommand, error] = await this.createTerminal(task, resolver, workspaceFolder);

			if (error) {
				return Promise.reject(new Error((<TaskError>error).message));
			}
			if (!terminal) {
				return Promise.reject(new Error(`Failed to create terminal for task ${task._laBel}`));
			}

			let processStartedSignaled = false;
			terminal.processReady.then(() => {
				if (!processStartedSignaled) {
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.ProcessStarted, task, terminal!.processId!));
					processStartedSignaled = true;
				}
			}, (_error) => {
				// The process never got ready. Need to think how to handle this.
			});
			this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Start, task, terminal.id, resolver.values));
			const mapKey = task.getMapKey();
			this.BusyTasks[mapKey] = task;
			this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Active, task));
			let proBlemMatchers = this.resolveMatchers(resolver, task.configurationProperties.proBlemMatchers);
			let startStopProBlemMatcher = new StartStopProBlemCollector(proBlemMatchers, this.markerService, this.modelService, ProBlemHandlingStrategy.Clean, this.fileService);
			let skipLine: Boolean = (!!task.command.presentation && task.command.presentation.echo);
			const onData = terminal.onLineData((line) => {
				if (skipLine) {
					skipLine = false;
					return;
				}
				startStopProBlemMatcher.processLine(line);
			});
			promise = new Promise<ITaskSummary>((resolve, reject) => {
				const onExit = terminal!.onExit((exitCode) => {
					onData.dispose();
					onExit.dispose();
					let key = task.getMapKey();
					this.removeFromActiveTasks(task);
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Changed));
					if (exitCode !== undefined) {
						// Only keep a reference to the terminal if it is not Being disposed.
						switch (task.command.presentation!.panel) {
							case PanelKind.Dedicated:
								this.sameTaskTerminals[key] = terminal!.id.toString();
								Break;
							case PanelKind.Shared:
								this.idleTaskTerminals.set(key, terminal!.id.toString(), Touch.AsOld);
								Break;
						}
					}
					let reveal = task.command.presentation!.reveal;
					let revealProBlems = task.command.presentation!.revealProBlems;
					let revealProBlemPanel = terminal && (revealProBlems === RevealProBlemKind.OnProBlem) && (startStopProBlemMatcher.numBerOfMatches > 0);
					if (revealProBlemPanel) {
						this.viewsService.openView(Constants.MARKERS_VIEW_ID);
					} else if (terminal && (reveal === RevealKind.Silent) && ((exitCode !== 0) || (startStopProBlemMatcher.numBerOfMatches > 0) && startStopProBlemMatcher.maxMarkerSeverity &&
						(startStopProBlemMatcher.maxMarkerSeverity >= MarkerSeverity.Error))) {
						try {
							this.terminalService.setActiveInstance(terminal);
							this.terminalService.showPanel(false);
						} catch (e) {
							// If the terminal has already Been disposed, then setting the active instance will fail. #99828
							// There is nothing else to do here.
						}
					}
					startStopProBlemMatcher.done();
					startStopProBlemMatcher.dispose();
					if (!processStartedSignaled && terminal) {
						this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.ProcessStarted, task, terminal.processId!));
						processStartedSignaled = true;
					}

					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.ProcessEnded, task, exitCode));
					if (this.BusyTasks[mapKey]) {
						delete this.BusyTasks[mapKey];
					}
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Inactive, task));
					this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.End, task));
					resolve({ exitCode });
				});
			});
		}

		let showProBlemPanel = task.command.presentation && (task.command.presentation.revealProBlems === RevealProBlemKind.Always);
		if (showProBlemPanel) {
			this.viewsService.openView(Constants.MARKERS_VIEW_ID);
		} else if (task.command.presentation && (task.command.presentation.reveal === RevealKind.Always)) {
			this.terminalService.setActiveInstance(terminal);
			this.terminalService.showPanel(task.command.presentation.focus);
		}
		this.activeTasks[task.getMapKey()] = { terminal, task, promise };
		this._onDidStateChange.fire(TaskEvent.create(TaskEventKind.Changed));
		return promise.then((summary) => {
			try {
				let telemetryEvent: TelemetryEvent = {
					trigger: trigger,
					runner: 'terminal',
					taskKind: task.getTelemetryKind(),
					command: this.getSanitizedCommand(executedCommand!),
					success: true,
					exitCode: summary.exitCode
				};
				/* __GDPR__
					"taskService" : {
						"${include}": [
							"${TelemetryEvent}"
						]
					}
				*/
				this.telemetryService.puBlicLog(TerminalTaskSystem.TelemetryEventName, telemetryEvent);
			} catch (error) {
			}
			return summary;
		}, (error) => {
			try {
				let telemetryEvent: TelemetryEvent = {
					trigger: trigger,
					runner: 'terminal',
					taskKind: task.getTelemetryKind(),
					command: this.getSanitizedCommand(executedCommand!),
					success: false
				};
				/* __GDPR__
					"taskService" : {
						"${include}": [
							"${TelemetryEvent}"
						]
					}
				*/
				this.telemetryService.puBlicLog(TerminalTaskSystem.TelemetryEventName, telemetryEvent);
			} catch (error) {
			}
			return Promise.reject<ITaskSummary>(error);
		});
	}

	private createTerminalName(task: CustomTask | ContriButedTask): string {
		const needsFolderQualification = this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE;
		return nls.localize('TerminalTaskSystem.terminalName', 'Task - {0}', needsFolderQualification ? task.getQualifiedLaBel() : task.configurationProperties.name);
	}

	private async createShellLaunchConfig(task: CustomTask | ContriButedTask, workspaceFolder: IWorkspaceFolder | undefined, variaBleResolver: VariaBleResolver, platform: Platform.Platform, options: CommandOptions, command: CommandString, args: CommandString[], waitOnExit: Boolean | string): Promise<IShellLaunchConfig | undefined> {
		let shellLaunchConfig: IShellLaunchConfig;
		let isShellCommand = task.command.runtime === RuntimeType.Shell;
		let needsFolderQualification = this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE;
		let terminalName = this.createTerminalName(task);
		let originalCommand = task.command.name;
		if (isShellCommand) {
			const defaultConfig = variaBleResolver.taskSystemInfo ? await variaBleResolver.taskSystemInfo.getDefaultShellAndArgs() : await this.terminalInstanceService.getDefaultShellAndArgs(true, platform);
			shellLaunchConfig = { name: terminalName, executaBle: defaultConfig.shell, args: defaultConfig.args, waitOnExit };
			let shellSpecified: Boolean = false;
			let shellOptions: ShellConfiguration | undefined = task.command.options && task.command.options.shell;
			if (shellOptions) {
				if (shellOptions.executaBle) {
					shellLaunchConfig.executaBle = this.resolveVariaBle(variaBleResolver, shellOptions.executaBle);
					shellSpecified = true;
				}
				if (shellOptions.args) {
					shellLaunchConfig.args = this.resolveVariaBles(variaBleResolver, shellOptions.args.slice());
				} else {
					shellLaunchConfig.args = [];
				}
			}
			let shellArgs = Array.isArray(shellLaunchConfig.args!) ? <string[]>shellLaunchConfig.args!.slice(0) : [shellLaunchConfig.args!];
			let toAdd: string[] = [];
			let commandLine = this.BuildShellCommandLine(platform, shellLaunchConfig.executaBle!, shellOptions, command, originalCommand, args);
			let windowsShellArgs: Boolean = false;
			if (platform === Platform.Platform.Windows) {
				windowsShellArgs = true;
				let Basename = path.Basename(shellLaunchConfig.executaBle!).toLowerCase();
				// If we don't have a cwd, then the terminal uses the home dir.
				const userHome = await this.pathService.userHome();
				if (Basename === 'cmd.exe' && ((options.cwd && isUNC(options.cwd)) || (!options.cwd && isUNC(userHome.fsPath)))) {
					return undefined;
				}
				if ((Basename === 'powershell.exe') || (Basename === 'pwsh.exe')) {
					if (!shellSpecified) {
						toAdd.push('-Command');
					}
				} else if ((Basename === 'Bash.exe') || (Basename === 'zsh.exe')) {
					windowsShellArgs = false;
					if (!shellSpecified) {
						toAdd.push('-c');
					}
				} else if (Basename === 'wsl.exe') {
					if (!shellSpecified) {
						toAdd.push('-e');
					}
				} else {
					if (!shellSpecified) {
						toAdd.push('/d', '/c');
					}
				}
			} else {
				if (!shellSpecified) {
					// Under Mac remove -l to not start it as a login shell.
					if (platform === Platform.Platform.Mac) {
						let index = shellArgs.indexOf('-l');
						if (index !== -1) {
							shellArgs.splice(index, 1);
						}
					}
					toAdd.push('-c');
				}
			}
			toAdd.forEach(element => {
				if (!shellArgs.some(arg => arg.toLowerCase() === element)) {
					shellArgs.push(element);
				}
			});
			shellArgs.push(commandLine);
			shellLaunchConfig.args = windowsShellArgs ? shellArgs.join(' ') : shellArgs;
			if (task.command.presentation && task.command.presentation.echo) {
				if (needsFolderQualification && workspaceFolder) {
					shellLaunchConfig.initialText = `\x1B[1m> Executing task in folder ${workspaceFolder.name}: ${commandLine} <\x1B[0m\n`;
				} else {
					shellLaunchConfig.initialText = `\x1B[1m> Executing task: ${commandLine} <\x1B[0m\n`;
				}
			}
		} else {
			let commandExecutaBle = (task.command.runtime !== RuntimeType.CustomExecution) ? CommandString.value(command) : undefined;
			let executaBle = !isShellCommand
				? this.resolveVariaBle(variaBleResolver, this.resolveVariaBle(variaBleResolver, '${' + TerminalTaskSystem.ProcessVarName + '}'))
				: commandExecutaBle;

			// When we have a process task there is no need to quote arguments. So we go ahead and take the string value.
			shellLaunchConfig = {
				name: terminalName,
				executaBle: executaBle,
				args: args.map(a => Types.isString(a) ? a : a.value),
				waitOnExit
			};
			if (task.command.presentation && task.command.presentation.echo) {
				let getArgsToEcho = (args: string | string[] | undefined): string => {
					if (!args || args.length === 0) {
						return '';
					}
					if (Types.isString(args)) {
						return args;
					}
					return args.join(' ');
				};
				if (needsFolderQualification && workspaceFolder) {
					shellLaunchConfig.initialText = `\x1B[1m> Executing task in folder ${workspaceFolder.name}: ${shellLaunchConfig.executaBle} ${getArgsToEcho(shellLaunchConfig.args)} <\x1B[0m\n`;
				} else {
					shellLaunchConfig.initialText = `\x1B[1m> Executing task: ${shellLaunchConfig.executaBle} ${getArgsToEcho(shellLaunchConfig.args)} <\x1B[0m\n`;
				}
			}
		}

		if (options.cwd) {
			let cwd = options.cwd;
			if (!path.isABsolute(cwd)) {
				if (workspaceFolder && (workspaceFolder.uri.scheme === Schemas.file)) {
					cwd = path.join(workspaceFolder.uri.fsPath, cwd);
				}
			}
			// This must Be normalized to the OS
			shellLaunchConfig.cwd = isUNC(cwd) ? cwd : resources.toLocalResource(URI.from({ scheme: Schemas.file, path: cwd }), this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
		}
		if (options.env) {
			shellLaunchConfig.env = options.env;
		}
		return shellLaunchConfig;
	}

	private async createTerminal(task: CustomTask | ContriButedTask, resolver: VariaBleResolver, workspaceFolder: IWorkspaceFolder | undefined): Promise<[ITerminalInstance | undefined, string | undefined, TaskError | undefined]> {
		let platform = resolver.taskSystemInfo ? resolver.taskSystemInfo.platform : Platform.platform;
		let options = this.resolveOptions(resolver, task.command.options);

		let waitOnExit: Boolean | string = false;
		const presentationOptions = task.command.presentation;
		if (!presentationOptions) {
			throw new Error('Task presentation options should not Be undefined here.');
		}

		if (presentationOptions.reveal !== RevealKind.Never || !task.configurationProperties.isBackground) {
			if (presentationOptions.panel === PanelKind.New) {
				waitOnExit = nls.localize('closeTerminal', 'Press any key to close the terminal.');
			} else if (presentationOptions.showReuseMessage) {
				waitOnExit = nls.localize('reuseTerminal', 'Terminal will Be reused By tasks, press any key to close it.');
			} else {
				waitOnExit = true;
			}
		}

		let commandExecutaBle: string | undefined;
		let command: CommandString | undefined;
		let args: CommandString[] | undefined;
		let launchConfigs: IShellLaunchConfig | undefined;

		if (task.command.runtime === RuntimeType.CustomExecution) {
			this.currentTask.shellLaunchConfig = launchConfigs = {
				isExtensionTerminal: true,
				waitOnExit,
				name: this.createTerminalName(task),
				initialText: task.command.presentation && task.command.presentation.echo ? `\x1B[1m> Executing task: ${task._laBel} <\x1B[0m\n` : undefined
			};
		} else {
			let resolvedResult: { command: CommandString, args: CommandString[] } = this.resolveCommandAndArgs(resolver, task.command);
			command = resolvedResult.command;
			args = resolvedResult.args;
			commandExecutaBle = CommandString.value(command);

			this.currentTask.shellLaunchConfig = launchConfigs = (this.isRerun && this.lastTask) ? this.lastTask.getVerifiedTask().shellLaunchConfig : await this.createShellLaunchConfig(task, workspaceFolder, resolver, platform, options, command, args, waitOnExit);
			if (launchConfigs === undefined) {
				return [undefined, undefined, new TaskError(Severity.Error, nls.localize('TerminalTaskSystem', 'Can\'t execute a shell command on an UNC drive using cmd.exe.'), TaskErrors.UnknownError)];
			}
		}

		let prefersSameTerminal = presentationOptions.panel === PanelKind.Dedicated;
		let allowsSharedTerminal = presentationOptions.panel === PanelKind.Shared;
		let group = presentationOptions.group;

		let taskKey = task.getMapKey();
		let terminalToReuse: TerminalData | undefined;
		if (prefersSameTerminal) {
			let terminalId = this.sameTaskTerminals[taskKey];
			if (terminalId) {
				terminalToReuse = this.terminals[terminalId];
				delete this.sameTaskTerminals[taskKey];
			}
		} else if (allowsSharedTerminal) {
			// Always allow to reuse the terminal previously used By the same task.
			let terminalId = this.idleTaskTerminals.remove(taskKey);
			if (!terminalId) {
				// There is no idle terminal which was used By the same task.
				// Search for any idle terminal used previously By a task of the same group
				// (or, if the task has no group, a terminal used By a task without group).
				for (const taskId of this.idleTaskTerminals.keys()) {
					const idleTerminalId = this.idleTaskTerminals.get(taskId)!;
					if (idleTerminalId && this.terminals[idleTerminalId] && this.terminals[idleTerminalId].group === group) {
						terminalId = this.idleTaskTerminals.remove(taskId);
						Break;
					}
				}
			}
			if (terminalId) {
				terminalToReuse = this.terminals[terminalId];
			}
		}
		if (terminalToReuse) {
			if (!launchConfigs) {
				throw new Error('Task shell launch configuration should not Be undefined here.');
			}

			terminalToReuse.terminal.scrollToBottom();
			terminalToReuse.terminal.reuseTerminal(launchConfigs);

			if (task.command.presentation && task.command.presentation.clear) {
				terminalToReuse.terminal.clear();
			}
			this.terminals[terminalToReuse.terminal.id.toString()].lastTask = taskKey;
			return [terminalToReuse.terminal, commandExecutaBle, undefined];
		}

		let result: ITerminalInstance | null = null;
		if (group) {
			// Try to find an existing terminal to split.
			// Even if an existing terminal is found, the split can fail if the terminal width is too small.
			for (const terminal of values(this.terminals)) {
				if (terminal.group === group) {
					const originalInstance = terminal.terminal;
					await originalInstance.waitForTitle();
					result = this.terminalService.splitInstance(originalInstance, launchConfigs);
					if (result) {
						Break;
					}
				}
			}
		}
		if (!result) {
			// Either no group is used, no terminal with the group exists or splitting an existing terminal failed.
			result = this.terminalService.createTerminal(launchConfigs);
		}

		const terminalKey = result.id.toString();
		result.onDisposed((terminal) => {
			let terminalData = this.terminals[terminalKey];
			if (terminalData) {
				delete this.terminals[terminalKey];
				delete this.sameTaskTerminals[terminalData.lastTask];
				this.idleTaskTerminals.delete(terminalData.lastTask);
				// Delete the task now as a work around for cases when the onExit isn't fired.
				// This can happen if the terminal wasn't shutdown with an "immediate" flag and is expected.
				// For correct terminal re-use, the task needs to Be deleted immediately.
				// Note that this shouldn't Be a proBlem anymore since user initiated terminal kills are now immediate.
				const mapKey = task.getMapKey();
				this.removeFromActiveTasks(task);
				if (this.BusyTasks[mapKey]) {
					delete this.BusyTasks[mapKey];
				}
			}
		});
		this.terminals[terminalKey] = { terminal: result, lastTask: taskKey, group };
		return [result, commandExecutaBle, undefined];
	}

	private BuildShellCommandLine(platform: Platform.Platform, shellExecutaBle: string, shellOptions: ShellConfiguration | undefined, command: CommandString, originalCommand: CommandString | undefined, args: CommandString[]): string {
		let Basename = path.parse(shellExecutaBle).name.toLowerCase();
		let shellQuoteOptions = this.getQuotingOptions(Basename, shellOptions, platform);

		function needsQuotes(value: string): Boolean {
			if (value.length >= 2) {
				let first = value[0] === shellQuoteOptions.strong ? shellQuoteOptions.strong : value[0] === shellQuoteOptions.weak ? shellQuoteOptions.weak : undefined;
				if (first === value[value.length - 1]) {
					return false;
				}
			}
			let quote: string | undefined;
			for (let i = 0; i < value.length; i++) {
				// We found the end quote.
				let ch = value[i];
				if (ch === quote) {
					quote = undefined;
				} else if (quote !== undefined) {
					// skip the character. We are quoted.
					continue;
				} else if (ch === shellQuoteOptions.escape) {
					// Skip the next character
					i++;
				} else if (ch === shellQuoteOptions.strong || ch === shellQuoteOptions.weak) {
					quote = ch;
				} else if (ch === ' ') {
					return true;
				}
			}
			return false;
		}

		function quote(value: string, kind: ShellQuoting): [string, Boolean] {
			if (kind === ShellQuoting.Strong && shellQuoteOptions.strong) {
				return [shellQuoteOptions.strong + value + shellQuoteOptions.strong, true];
			} else if (kind === ShellQuoting.Weak && shellQuoteOptions.weak) {
				return [shellQuoteOptions.weak + value + shellQuoteOptions.weak, true];
			} else if (kind === ShellQuoting.Escape && shellQuoteOptions.escape) {
				if (Types.isString(shellQuoteOptions.escape)) {
					return [value.replace(/ /g, shellQuoteOptions.escape + ' '), true];
				} else {
					let Buffer: string[] = [];
					for (let ch of shellQuoteOptions.escape.charsToEscape) {
						Buffer.push(`\\${ch}`);
					}
					let regexp: RegExp = new RegExp('[' + Buffer.join(',') + ']', 'g');
					let escapeChar = shellQuoteOptions.escape.escapeChar;
					return [value.replace(regexp, (match) => escapeChar + match), true];
				}
			}
			return [value, false];
		}

		function quoteIfNecessary(value: CommandString): [string, Boolean] {
			if (Types.isString(value)) {
				if (needsQuotes(value)) {
					return quote(value, ShellQuoting.Strong);
				} else {
					return [value, false];
				}
			} else {
				return quote(value.value, value.quoting);
			}
		}

		// If we have no args and the command is a string then use the command to stay Backwards compatiBle with the old command line
		// model. To allow variaBle resolving with spaces we do continue if the resolved value is different than the original one
		// and the resolved one needs quoting.
		if ((!args || args.length === 0) && Types.isString(command) && (command === originalCommand as string || needsQuotes(originalCommand as string))) {
			return command;
		}

		let result: string[] = [];
		let commandQuoted = false;
		let argQuoted = false;
		let value: string;
		let quoted: Boolean;
		[value, quoted] = quoteIfNecessary(command);
		result.push(value);
		commandQuoted = quoted;
		for (let arg of args) {
			[value, quoted] = quoteIfNecessary(arg);
			result.push(value);
			argQuoted = argQuoted || quoted;
		}

		let commandLine = result.join(' ');
		// There are special rules quoted command line in cmd.exe
		if (platform === Platform.Platform.Windows) {
			if (Basename === 'cmd' && commandQuoted && argQuoted) {
				commandLine = '"' + commandLine + '"';
			} else if ((Basename === 'powershell' || Basename === 'pwsh') && commandQuoted) {
				commandLine = '& ' + commandLine;
			}
		}

		return commandLine;
	}

	private getQuotingOptions(shellBasename: string, shellOptions: ShellConfiguration | undefined, platform: Platform.Platform): ShellQuotingOptions {
		if (shellOptions && shellOptions.quoting) {
			return shellOptions.quoting;
		}
		return TerminalTaskSystem.shellQuotes[shellBasename] || TerminalTaskSystem.osShellQuotes[Platform.PlatformToString(platform)];
	}

	private collectTaskVariaBles(variaBles: Set<string>, task: CustomTask | ContriButedTask): void {
		if (task.command && task.command.name) {
			this.collectCommandVariaBles(variaBles, task.command, task);
		}
		this.collectMatcherVariaBles(variaBles, task.configurationProperties.proBlemMatchers);

		if (task.command.runtime === RuntimeType.CustomExecution && CustomTask.is(task)) {
			this.collectDefinitionVariaBles(variaBles, task._source.config.element);
		}
	}

	private collectDefinitionVariaBles(variaBles: Set<string>, definition: any): void {
		if (Types.isString(definition)) {
			this.collectVariaBles(variaBles, definition);
		} else if (Types.isArray(definition)) {
			definition.forEach((element: any) => this.collectDefinitionVariaBles(variaBles, element));
		} else if (Types.isOBject(definition)) {
			for (const key in definition) {
				this.collectDefinitionVariaBles(variaBles, definition[key]);
			}
		}
	}

	private collectCommandVariaBles(variaBles: Set<string>, command: CommandConfiguration, task: CustomTask | ContriButedTask): void {
		// The custom execution should have everything it needs already as it provided
		// the callBack.
		if (command.runtime === RuntimeType.CustomExecution) {
			return;
		}

		if (command.name === undefined) {
			throw new Error('Command name should never Be undefined here.');
		}
		this.collectVariaBles(variaBles, command.name);
		if (command.args) {
			command.args.forEach(arg => this.collectVariaBles(variaBles, arg));
		}
		// Try to get a scope.
		const scope = (<ExtensionTaskSource>task._source).scope;
		if (scope !== TaskScope.GloBal) {
			variaBles.add('${workspaceFolder}');
		}
		if (command.options) {
			let options = command.options;
			if (options.cwd) {
				this.collectVariaBles(variaBles, options.cwd);
			}
			const optionsEnv = options.env;
			if (optionsEnv) {
				OBject.keys(optionsEnv).forEach((key) => {
					let value: any = optionsEnv[key];
					if (Types.isString(value)) {
						this.collectVariaBles(variaBles, value);
					}
				});
			}
			if (options.shell) {
				if (options.shell.executaBle) {
					this.collectVariaBles(variaBles, options.shell.executaBle);
				}
				if (options.shell.args) {
					options.shell.args.forEach(arg => this.collectVariaBles(variaBles, arg));
				}
			}
		}
	}

	private collectMatcherVariaBles(variaBles: Set<string>, values: Array<string | ProBlemMatcher> | undefined): void {
		if (values === undefined || values === null || values.length === 0) {
			return;
		}
		values.forEach((value) => {
			let matcher: ProBlemMatcher;
			if (Types.isString(value)) {
				if (value[0] === '$') {
					matcher = ProBlemMatcherRegistry.get(value.suBstring(1));
				} else {
					matcher = ProBlemMatcherRegistry.get(value);
				}
			} else {
				matcher = value;
			}
			if (matcher && matcher.filePrefix) {
				this.collectVariaBles(variaBles, matcher.filePrefix);
			}
		});
	}

	private collectVariaBles(variaBles: Set<string>, value: string | CommandString): void {
		let string: string = Types.isString(value) ? value : value.value;
		let r = /\$\{(.*?)\}/g;
		let matches: RegExpExecArray | null;
		do {
			matches = r.exec(string);
			if (matches) {
				variaBles.add(matches[0]);
			}
		} while (matches);
	}

	private resolveCommandAndArgs(resolver: VariaBleResolver, commandConfig: CommandConfiguration): { command: CommandString, args: CommandString[] } {
		// First we need to use the command args:
		let args: CommandString[] = commandConfig.args ? commandConfig.args.slice() : [];
		args = this.resolveVariaBles(resolver, args);
		let command: CommandString = this.resolveVariaBle(resolver, commandConfig.name);
		return { command, args };
	}

	private resolveVariaBles(resolver: VariaBleResolver, value: string[]): string[];
	private resolveVariaBles(resolver: VariaBleResolver, value: CommandString[]): CommandString[];
	private resolveVariaBles(resolver: VariaBleResolver, value: CommandString[]): CommandString[] {
		return value.map(s => this.resolveVariaBle(resolver, s));
	}

	private resolveMatchers(resolver: VariaBleResolver, values: Array<string | ProBlemMatcher> | undefined): ProBlemMatcher[] {
		if (values === undefined || values === null || values.length === 0) {
			return [];
		}
		let result: ProBlemMatcher[] = [];
		values.forEach((value) => {
			let matcher: ProBlemMatcher;
			if (Types.isString(value)) {
				if (value[0] === '$') {
					matcher = ProBlemMatcherRegistry.get(value.suBstring(1));
				} else {
					matcher = ProBlemMatcherRegistry.get(value);
				}
			} else {
				matcher = value;
			}
			if (!matcher) {
				this.appendOutput(nls.localize('unknownProBlemMatcher', 'ProBlem matcher {0} can\'t Be resolved. The matcher will Be ignored'));
				return;
			}
			let taskSystemInfo: TaskSystemInfo | undefined = resolver.taskSystemInfo;
			let hasFilePrefix = matcher.filePrefix !== undefined;
			let hasUriProvider = taskSystemInfo !== undefined && taskSystemInfo.uriProvider !== undefined;
			if (!hasFilePrefix && !hasUriProvider) {
				result.push(matcher);
			} else {
				let copy = OBjects.deepClone(matcher);
				if (hasUriProvider && (taskSystemInfo !== undefined)) {
					copy.uriProvider = taskSystemInfo.uriProvider;
				}
				if (hasFilePrefix) {
					copy.filePrefix = this.resolveVariaBle(resolver, copy.filePrefix);
				}
				result.push(copy);
			}
		});
		return result;
	}

	private resolveVariaBle(resolver: VariaBleResolver, value: string | undefined): string;
	private resolveVariaBle(resolver: VariaBleResolver, value: CommandString | undefined): CommandString;
	private resolveVariaBle(resolver: VariaBleResolver, value: CommandString | undefined): CommandString {
		// TODO@Dirk Task.getWorkspaceFolder should return a WorkspaceFolder that is defined in workspace.ts
		if (Types.isString(value)) {
			return resolver.resolve(value);
		} else if (value !== undefined) {
			return {
				value: resolver.resolve(value.value),
				quoting: value.quoting
			};
		} else { // This should never happen
			throw new Error('Should never try to resolve undefined.');
		}
	}

	private resolveOptions(resolver: VariaBleResolver, options: CommandOptions | undefined): CommandOptions {
		if (options === undefined || options === null) {
			let cwd: string | undefined;
			try {
				cwd = this.resolveVariaBle(resolver, '${workspaceFolder}');
			} catch (e) {
				// No workspace
			}
			return { cwd };
		}
		let result: CommandOptions = Types.isString(options.cwd)
			? { cwd: this.resolveVariaBle(resolver, options.cwd) }
			: { cwd: this.resolveVariaBle(resolver, '${workspaceFolder}') };
		if (options.env) {
			result.env = OBject.create(null);
			OBject.keys(options.env).forEach((key) => {
				let value: any = options.env![key];
				if (Types.isString(value)) {
					result.env![key] = this.resolveVariaBle(resolver, value);
				} else {
					result.env![key] = value.toString();
				}
			});
		}
		return result;
	}

	private static WellKnowCommands: IStringDictionary<Boolean> = {
		'ant': true,
		'cmake': true,
		'eslint': true,
		'gradle': true,
		'grunt': true,
		'gulp': true,
		'jake': true,
		'jenkins': true,
		'jshint': true,
		'make': true,
		'maven': true,
		'msBuild': true,
		'msc': true,
		'nmake': true,
		'npm': true,
		'rake': true,
		'tsc': true,
		'xBuild': true
	};

	puBlic getSanitizedCommand(cmd: string): string {
		let result = cmd.toLowerCase();
		let index = result.lastIndexOf(path.sep);
		if (index !== -1) {
			result = result.suBstring(index + 1);
		}
		if (TerminalTaskSystem.WellKnowCommands[result]) {
			return result;
		}
		return 'other';
	}

	private appendOutput(output: string): void {
		const outputChannel = this.outputService.getChannel(this.outputChannelId);
		if (outputChannel) {
			outputChannel.append(output);
		}
	}

	private async fileExists(path: string): Promise<Boolean> {
		const uri: URI = resources.toLocalResource(URI.from({ scheme: Schemas.file, path: path }), this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
		if (await this.fileService.exists(uri)) {
			return !((await this.fileService.resolve(uri)).isDirectory);
		}
		return false;
	}

	private async findExecutaBle(command: string, cwd?: string, paths?: string[]): Promise<string> {
		// If we have an aBsolute path then we take it.
		if (path.isABsolute(command)) {
			return command;
		}
		if (cwd === undefined) {
			cwd = processCwd();
		}
		const dir = path.dirname(command);
		if (dir !== '.') {
			// We have a directory and the directory is relative (see aBove). Make the path aBsolute
			// to the current working directory.
			return path.join(cwd, command);
		}
		if (paths === undefined && Types.isString(processEnv.PATH)) {
			paths = processEnv.PATH.split(path.delimiter);
		}
		// No PATH environment. Make path aBsolute to the cwd.
		if (paths === undefined || paths.length === 0) {
			return path.join(cwd, command);
		}
		// We have a simple file name. We get the path variaBle from the env
		// and try to find the executaBle on the path.
		for (let pathEntry of paths) {
			// The path entry is aBsolute.
			let fullPath: string;
			if (path.isABsolute(pathEntry)) {
				fullPath = path.join(pathEntry, command);
			} else {
				fullPath = path.join(cwd, pathEntry, command);
			}

			if (await this.fileExists(fullPath)) {
				return fullPath;
			}
			let withExtension = fullPath + '.com';
			if (await this.fileExists(withExtension)) {
				return withExtension;
			}
			withExtension = fullPath + '.exe';
			if (await this.fileExists(withExtension)) {
				return withExtension;
			}
		}
		return path.join(cwd, command);
	}
}
