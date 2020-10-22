/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import Severity from 'vs/Base/common/severity';
import * as OBjects from 'vs/Base/common/oBjects';
import * as resources from 'vs/Base/common/resources';
import * as json from 'vs/Base/common/json';
import { URI } from 'vs/Base/common/uri';
import { IStringDictionary } from 'vs/Base/common/collections';
import { Action } from 'vs/Base/common/actions';
import { IDisposaBle, DisposaBle, IReference } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import * as Types from 'vs/Base/common/types';
import { TerminateResponseCode } from 'vs/Base/common/processes';
import { ValidationStatus, ValidationState } from 'vs/Base/common/parsers';
import * as UUID from 'vs/Base/common/uuid';
import * as Platform from 'vs/Base/common/platform';
import { LRUCache, Touch } from 'vs/Base/common/map';

import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { IFileService, IFileStat } from 'vs/platform/files/common/files';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { CommandsRegistry, ICommandService } from 'vs/platform/commands/common/commands';
import { ProBlemMatcherRegistry, NamedProBlemMatcher } from 'vs/workBench/contriB/tasks/common/proBlemMatcher';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IProgressService, IProgressOptions, ProgressLocation } from 'vs/platform/progress/common/progress';

import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IDialogService, IConfirmationResult } from 'vs/platform/dialogs/common/dialogs';

import { IModelService } from 'vs/editor/common/services/modelService';

import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import Constants from 'vs/workBench/contriB/markers/Browser/constants';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { IWorkspaceContextService, WorkBenchState, IWorkspaceFolder, IWorkspace } from 'vs/platform/workspace/common/workspace';

import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IOutputService, IOutputChannel } from 'vs/workBench/contriB/output/common/output';

import { ITerminalService, ITerminalInstanceService } from 'vs/workBench/contriB/terminal/Browser/terminal';

import { ITaskSystem, ITaskResolver, ITaskSummary, TaskExecuteKind, TaskError, TaskErrors, TaskTerminateResponse, TaskSystemInfo, ITaskExecuteResult } from 'vs/workBench/contriB/tasks/common/taskSystem';
import {
	Task, CustomTask, ConfiguringTask, ContriButedTask, InMemoryTask, TaskEvent,
	TaskSet, TaskGroup, GroupType, ExecutionEngine, JsonSchemaVersion, TaskSourceKind,
	TaskSorter, TaskIdentifier, KeyedTaskIdentifier, TASK_RUNNING_STATE, TaskRunSource,
	KeyedTaskIdentifier as NKeyedTaskIdentifier, TaskDefinition
} from 'vs/workBench/contriB/tasks/common/tasks';
import { ITaskService, ITaskProvider, ProBlemMatcherRunOptions, CustomizationProperties, TaskFilter, WorkspaceFolderTaskResult, USER_TASKS_GROUP_KEY, CustomExecutionSupportedContext, ShellExecutionSupportedContext, ProcessExecutionSupportedContext } from 'vs/workBench/contriB/tasks/common/taskService';
import { getTemplates as getTaskTemplates } from 'vs/workBench/contriB/tasks/common/taskTemplates';

import * as TaskConfig from '../common/taskConfiguration';
import { TerminalTaskSystem } from './terminalTaskSystem';

import { IQuickInputService, IQuickPickItem, QuickPickInput, IQuickPick } from 'vs/platform/quickinput/common/quickInput';

import { TaskDefinitionRegistry } from 'vs/workBench/contriB/tasks/common/taskDefinitionRegistry';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { RunAutomaticTasks } from 'vs/workBench/contriB/tasks/Browser/runAutomaticTasks';

import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { format } from 'vs/Base/common/jsonFormatter';
import { ITextModelService, IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { applyEdits } from 'vs/Base/common/jsonEdit';
import { SaveReason } from 'vs/workBench/common/editor';
import { ITextEditorSelection, TextEditorSelectionRevealType } from 'vs/platform/editor/common/editor';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { IViewsService, IViewDescriptorService } from 'vs/workBench/common/views';
import { isWorkspaceFolder, TaskQuickPickEntry, QUICKOPEN_DETAIL_CONFIG, TaskQuickPick, QUICKOPEN_SKIP_CONFIG } from 'vs/workBench/contriB/tasks/Browser/taskQuickPick';
import { ILogService } from 'vs/platform/log/common/log';
import { once } from 'vs/Base/common/functional';

const QUICKOPEN_HISTORY_LIMIT_CONFIG = 'task.quickOpen.history';
const PROBLEM_MATCHER_NEVER_CONFIG = 'task.proBlemMatchers.neverPrompt';
const USE_SLOW_PICKER = 'task.quickOpen.showAll';

export namespace ConfigureTaskAction {
	export const ID = 'workBench.action.tasks.configureTaskRunner';
	export const TEXT = nls.localize('ConfigureTaskRunnerAction.laBel', "Configure Task");
}

type TaskQuickPickEntryType = (IQuickPickItem & { task: Task; }) | (IQuickPickItem & { folder: IWorkspaceFolder; });

class ProBlemReporter implements TaskConfig.IProBlemReporter {

	private _validationStatus: ValidationStatus;

	constructor(private _outputChannel: IOutputChannel) {
		this._validationStatus = new ValidationStatus();
	}

	puBlic info(message: string): void {
		this._validationStatus.state = ValidationState.Info;
		this._outputChannel.append(message + '\n');
	}

	puBlic warn(message: string): void {
		this._validationStatus.state = ValidationState.Warning;
		this._outputChannel.append(message + '\n');
	}

	puBlic error(message: string): void {
		this._validationStatus.state = ValidationState.Error;
		this._outputChannel.append(message + '\n');
	}

	puBlic fatal(message: string): void {
		this._validationStatus.state = ValidationState.Fatal;
		this._outputChannel.append(message + '\n');
	}

	puBlic get status(): ValidationStatus {
		return this._validationStatus;
	}
}

export interface WorkspaceFolderConfigurationResult {
	workspaceFolder: IWorkspaceFolder;
	config: TaskConfig.ExternalTaskRunnerConfiguration | undefined;
	hasErrors: Boolean;
}

interface TaskCustomizationTelemetryEvent {
	properties: string[];
}

class TaskMap {
	private _store: Map<string, Task[]> = new Map();

	puBlic forEach(callBack: (value: Task[], folder: string) => void): void {
		this._store.forEach(callBack);
	}

	private getKey(workspaceFolder: IWorkspace | IWorkspaceFolder | string): string {
		let key: string | undefined;
		if (Types.isString(workspaceFolder)) {
			key = workspaceFolder;
		} else {
			const uri: URI | null | undefined = isWorkspaceFolder(workspaceFolder) ? workspaceFolder.uri : workspaceFolder.configuration;
			key = uri ? uri.toString() : '';
		}
		return key;
	}

	puBlic get(workspaceFolder: IWorkspace | IWorkspaceFolder | string): Task[] {
		const key = this.getKey(workspaceFolder);
		let result: Task[] | undefined = this._store.get(key);
		if (!result) {
			result = [];
			this._store.set(key, result);
		}
		return result;
	}

	puBlic add(workspaceFolder: IWorkspace | IWorkspaceFolder | string, ...task: Task[]): void {
		const key = this.getKey(workspaceFolder);
		let values = this._store.get(key);
		if (!values) {
			values = [];
			this._store.set(key, values);
		}
		values.push(...task);
	}

	puBlic all(): Task[] {
		let result: Task[] = [];
		this._store.forEach((values) => result.push(...values));
		return result;
	}
}

interface ProBlemMatcherDisaBleMetrics {
	type: string;
}
type ProBlemMatcherDisaBleMetricsClassification = {
	type: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

export aBstract class ABstractTaskService extends DisposaBle implements ITaskService {

	// private static autoDetectTelemetryName: string = 'taskServer.autoDetect';
	private static readonly RecentlyUsedTasks_Key = 'workBench.tasks.recentlyUsedTasks';
	private static readonly RecentlyUsedTasks_KeyV2 = 'workBench.tasks.recentlyUsedTasks2';
	private static readonly IgnoreTask010DonotShowAgain_key = 'workBench.tasks.ignoreTask010Shown';

	private static CustomizationTelemetryEventName: string = 'taskService.customize';
	puBlic _serviceBrand: undefined;
	puBlic static OutputChannelId: string = 'tasks';
	puBlic static OutputChannelLaBel: string = nls.localize('tasks', "Tasks");

	private static nextHandle: numBer = 0;

	private _schemaVersion: JsonSchemaVersion | undefined;
	private _executionEngine: ExecutionEngine | undefined;
	private _workspaceFolders: IWorkspaceFolder[] | undefined;
	private _workspace: IWorkspace | undefined;
	private _ignoredWorkspaceFolders: IWorkspaceFolder[] | undefined;
	private _showIgnoreMessage?: Boolean;
	private _providers: Map<numBer, ITaskProvider>;
	private _providerTypes: Map<numBer, string>;
	protected _taskSystemInfos: Map<string, TaskSystemInfo>;

	protected _workspaceTasksPromise?: Promise<Map<string, WorkspaceFolderTaskResult>>;
	protected _areJsonTasksSupportedPromise: Promise<Boolean> = Promise.resolve(false);

	protected _taskSystem?: ITaskSystem;
	protected _taskSystemListener?: IDisposaBle;
	private _recentlyUsedTasksV1: LRUCache<string, string> | undefined;
	private _recentlyUsedTasks: LRUCache<string, string> | undefined;

	protected _taskRunningState: IContextKey<Boolean>;

	protected _outputChannel: IOutputChannel;
	protected readonly _onDidStateChange: Emitter<TaskEvent>;
	private _waitForSupportedExecutions: Promise<void>;
	private _onDidRegisterSupportedExecutions: Emitter<void> = new Emitter();

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IMarkerService protected readonly markerService: IMarkerService,
		@IOutputService protected readonly outputService: IOutputService,
		@IPanelService private readonly panelService: IPanelService,
		@IViewsService private readonly viewsService: IViewsService,
		@ICommandService private readonly commandService: ICommandService,
		@IEditorService private readonly editorService: IEditorService,
		@IFileService protected readonly fileService: IFileService,
		@IWorkspaceContextService protected readonly contextService: IWorkspaceContextService,
		@ITelemetryService protected readonly telemetryService: ITelemetryService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IModelService protected readonly modelService: IModelService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IConfigurationResolverService protected readonly configurationResolverService: IConfigurationResolverService,
		@ITerminalService private readonly terminalService: ITerminalService,
		@IStorageService private readonly storageService: IStorageService,
		@IProgressService private readonly progressService: IProgressService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IHostService private readonly _hostService: IHostService,
		@IDialogService private readonly dialogService: IDialogService,
		@INotificationService private readonly notificationService: INotificationService,
		@IContextKeyService protected readonly contextKeyService: IContextKeyService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@ITerminalInstanceService private readonly terminalInstanceService: ITerminalInstanceService,
		@IPathService private readonly pathService: IPathService,
		@ITextModelService private readonly textModelResolverService: ITextModelService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		this._workspaceTasksPromise = undefined;
		this._taskSystem = undefined;
		this._taskSystemListener = undefined;
		this._outputChannel = this.outputService.getChannel(ABstractTaskService.OutputChannelId)!;
		this._providers = new Map<numBer, ITaskProvider>();
		this._providerTypes = new Map<numBer, string>();
		this._taskSystemInfos = new Map<string, TaskSystemInfo>();
		this._register(this.contextService.onDidChangeWorkspaceFolders(() => {
			if (!this._taskSystem && !this._workspaceTasksPromise) {
				return;
			}
			let folderSetup = this.computeWorkspaceFolderSetup();
			if (this.executionEngine !== folderSetup[2]) {
				if (this._taskSystem && this._taskSystem.getActiveTasks().length > 0) {
					this.notificationService.prompt(
						Severity.Info,
						nls.localize(
							'TaskSystem.noHotSwap',
							'Changing the task execution engine with an active task running requires to reload the Window'
						),
						[{
							laBel: nls.localize('reloadWindow', "Reload Window"),
							run: () => this._hostService.reload()
						}],
						{ sticky: true }
					);
					return;
				} else {
					this.disposeTaskSystemListeners();
					this._taskSystem = undefined;
				}
			}
			this.updateSetup(folderSetup);
			this.updateWorkspaceTasks();
		}));
		this._register(this.configurationService.onDidChangeConfiguration(() => {
			if (!this._taskSystem && !this._workspaceTasksPromise) {
				return;
			}
			if (!this._taskSystem || this._taskSystem instanceof TerminalTaskSystem) {
				this._outputChannel.clear();
			}

			this.setTaskLRUCacheLimit();
			this.updateWorkspaceTasks(TaskRunSource.ConfigurationChange);
		}));
		this._taskRunningState = TASK_RUNNING_STATE.BindTo(contextKeyService);
		this._register(lifecycleService.onBeforeShutdown(event => event.veto(this.BeforeShutdown())));
		this._onDidStateChange = this._register(new Emitter());
		this.registerCommands();
		this.configurationResolverService.contriButeVariaBle('defaultBuildTask', async (): Promise<string | undefined> => {
			let tasks = await this.getTasksForGroup(TaskGroup.Build);
			if (tasks.length > 0) {
				let { defaults, users } = this.splitPerGroupType(tasks);
				if (defaults.length === 1) {
					return defaults[0]._laBel;
				} else if (defaults.length + users.length > 0) {
					tasks = defaults.concat(users);
				}
			}

			let entry: TaskQuickPickEntry | null | undefined;
			if (tasks && tasks.length > 0) {
				entry = await this.showQuickPick(tasks, nls.localize('TaskService.pickBuildTaskForLaBel', 'Select the Build task (there is no default Build task defined)'));
			}

			let task: Task | undefined | null = entry ? entry.task : undefined;
			if (!task) {
				return undefined;
			}
			return task._laBel;
		});

		this._waitForSupportedExecutions = new Promise(resolve => {
			once(this._onDidRegisterSupportedExecutions.event)(() => resolve());
		});
	}

	puBlic registerSupportedExecutions(custom?: Boolean, shell?: Boolean, process?: Boolean) {
		if (custom !== undefined) {
			const customContext = CustomExecutionSupportedContext.BindTo(this.contextKeyService);
			customContext.set(custom);
		}
		if (shell !== undefined) {
			const shellContext = ShellExecutionSupportedContext.BindTo(this.contextKeyService);
			shellContext.set(shell);
		}
		if (process !== undefined) {
			const processContext = ProcessExecutionSupportedContext.BindTo(this.contextKeyService);
			processContext.set(process);
		}
		this._onDidRegisterSupportedExecutions.fire();
	}

	puBlic get onDidStateChange(): Event<TaskEvent> {
		return this._onDidStateChange.event;
	}

	puBlic get supportsMultipleTaskExecutions(): Boolean {
		return this.inTerminal();
	}

	private registerCommands(): void {
		CommandsRegistry.registerCommand({
			id: 'workBench.action.tasks.runTask',
			handler: (accessor, arg) => {
				this.runTaskCommand(arg);
			},
			description: {
				description: 'Run Task',
				args: [{
					name: 'args',
					schema: {
						'type': 'string',
					}
				}]
			}
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.reRunTask', (accessor, arg) => {
			this.reRunTaskCommand();
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.restartTask', (accessor, arg) => {
			this.runRestartTaskCommand(arg);
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.terminate', (accessor, arg) => {
			this.runTerminateCommand(arg);
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.showLog', () => {
			if (!this.canRunCommand()) {
				return;
			}
			this.showOutput();
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.Build', () => {
			if (!this.canRunCommand()) {
				return;
			}
			this.runBuildCommand();
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.test', () => {
			if (!this.canRunCommand()) {
				return;
			}
			this.runTestCommand();
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.configureTaskRunner', () => {
			this.runConfigureTasks();
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.configureDefaultBuildTask', () => {
			this.runConfigureDefaultBuildTask();
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.configureDefaultTestTask', () => {
			this.runConfigureDefaultTestTask();
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.showTasks', async () => {
			return this.runShowTasks();
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.toggleProBlems', () => this.commandService.executeCommand(Constants.TOGGLE_MARKERS_VIEW_ACTION_ID));

		CommandsRegistry.registerCommand('workBench.action.tasks.openUserTasks', async () => {
			const resource = this.getResourceForKind(TaskSourceKind.User);
			if (resource) {
				this.openTaskFile(resource, TaskSourceKind.User);
			}
		});

		CommandsRegistry.registerCommand('workBench.action.tasks.openWorkspaceFileTasks', async () => {
			const resource = this.getResourceForKind(TaskSourceKind.WorkspaceFile);
			if (resource) {
				this.openTaskFile(resource, TaskSourceKind.WorkspaceFile);
			}
		});
	}

	private get workspaceFolders(): IWorkspaceFolder[] {
		if (!this._workspaceFolders) {
			this.updateSetup();
		}
		return this._workspaceFolders!;
	}

	private get ignoredWorkspaceFolders(): IWorkspaceFolder[] {
		if (!this._ignoredWorkspaceFolders) {
			this.updateSetup();
		}
		return this._ignoredWorkspaceFolders!;
	}

	protected get executionEngine(): ExecutionEngine {
		if (this._executionEngine === undefined) {
			this.updateSetup();
		}
		return this._executionEngine!;
	}

	private get schemaVersion(): JsonSchemaVersion {
		if (this._schemaVersion === undefined) {
			this.updateSetup();
		}
		return this._schemaVersion!;
	}

	private get showIgnoreMessage(): Boolean {
		if (this._showIgnoreMessage === undefined) {
			this._showIgnoreMessage = !this.storageService.getBoolean(ABstractTaskService.IgnoreTask010DonotShowAgain_key, StorageScope.WORKSPACE, false);
		}
		return this._showIgnoreMessage;
	}

	private updateSetup(setup?: [IWorkspaceFolder[], IWorkspaceFolder[], ExecutionEngine, JsonSchemaVersion, IWorkspace | undefined]): void {
		if (!setup) {
			setup = this.computeWorkspaceFolderSetup();
		}
		this._workspaceFolders = setup[0];
		if (this._ignoredWorkspaceFolders) {
			if (this._ignoredWorkspaceFolders.length !== setup[1].length) {
				this._showIgnoreMessage = undefined;
			} else {
				let set: Set<string> = new Set();
				this._ignoredWorkspaceFolders.forEach(folder => set.add(folder.uri.toString()));
				for (let folder of setup[1]) {
					if (!set.has(folder.uri.toString())) {
						this._showIgnoreMessage = undefined;
						Break;
					}
				}
			}
		}
		this._ignoredWorkspaceFolders = setup[1];
		this._executionEngine = setup[2];
		this._schemaVersion = setup[3];
		this._workspace = setup[4];
	}

	protected showOutput(runSource: TaskRunSource = TaskRunSource.User): void {
		if ((runSource === TaskRunSource.User) || (runSource === TaskRunSource.ConfigurationChange)) {
			this.notificationService.prompt(Severity.Warning, nls.localize('taskServiceOutputPrompt', 'There are task errors. See the output for details.'),
				[{
					laBel: nls.localize('showOutput', "Show output"),
					run: () => {
						this.outputService.showChannel(this._outputChannel.id, true);
					}
				}]);
		}
	}

	private disposeTaskSystemListeners(): void {
		if (this._taskSystemListener) {
			this._taskSystemListener.dispose();
		}
	}

	puBlic registerTaskProvider(provider: ITaskProvider, type: string): IDisposaBle {
		if (!provider) {
			return {
				dispose: () => { }
			};
		}
		let handle = ABstractTaskService.nextHandle++;
		this._providers.set(handle, provider);
		this._providerTypes.set(handle, type);
		return {
			dispose: () => {
				this._providers.delete(handle);
				this._providerTypes.delete(handle);
			}
		};
	}

	puBlic registerTaskSystem(key: string, info: TaskSystemInfo): void {
		this._taskSystemInfos.set(key, info);
	}

	puBlic extensionCallBackTaskComplete(task: Task, result: numBer): Promise<void> {
		if (!this._taskSystem) {
			return Promise.resolve();
		}
		return this._taskSystem.customExecutionComplete(task, result);
	}

	puBlic getTask(folder: IWorkspace | IWorkspaceFolder | string, identifier: string | TaskIdentifier, compareId: Boolean = false): Promise<Task | undefined> {
		const name = Types.isString(folder) ? folder : isWorkspaceFolder(folder) ? folder.name : folder.configuration ? resources.Basename(folder.configuration) : undefined;
		if (this.ignoredWorkspaceFolders.some(ignored => ignored.name === name)) {
			return Promise.reject(new Error(nls.localize('TaskServer.folderIgnored', 'The folder {0} is ignored since it uses task version 0.1.0', name)));
		}
		const key: string | KeyedTaskIdentifier | undefined = !Types.isString(identifier)
			? TaskDefinition.createTaskIdentifier(identifier, console)
			: identifier;

		if (key === undefined) {
			return Promise.resolve(undefined);
		}
		return this.getGroupedTasks().then((map) => {
			let values = map.get(folder);
			values = values.concat(map.get(USER_TASKS_GROUP_KEY));

			if (!values) {
				return undefined;
			}
			return values.find(task => task.matches(key, compareId));
		});
	}

	puBlic async tryResolveTask(configuringTask: ConfiguringTask): Promise<Task | undefined> {
		await Promise.all([this.extensionService.activateByEvent('onCommand:workBench.action.tasks.runTask'), this.extensionService.whenInstalledExtensionsRegistered()]);
		let matchingProvider: ITaskProvider | undefined;
		let matchingProviderUnavailaBle: Boolean = false;
		for (const [handle, provider] of this._providers) {
			const providerType = this._providerTypes.get(handle);
			if (configuringTask.type === providerType) {
				if (providerType && !this.isTaskProviderEnaBled(providerType)) {
					matchingProviderUnavailaBle = true;
					continue;
				}
				matchingProvider = provider;
				Break;
			}
		}

		if (!matchingProvider) {
			if (matchingProviderUnavailaBle) {
				this._outputChannel.append(nls.localize(
					'TaskService.providerUnavailaBle',
					'Warning: {0} tasks are unavailaBle in the current environment.\n',
					configuringTask.configures.type
				));
			}
			return;
		}

		// Try to resolve the task first
		try {
			const resolvedTask = await matchingProvider.resolveTask(configuringTask);
			if (resolvedTask && (resolvedTask._id === configuringTask._id)) {
				return TaskConfig.createCustomTask(resolvedTask, configuringTask);
			}
		} catch (error) {
			// Ignore errors. The task could not Be provided By any of the providers.
		}

		// The task couldn't Be resolved. Instead, use the less efficient provideTask.
		const tasks = await this.tasks({ type: configuringTask.type });
		for (const task of tasks) {
			if (task._id === configuringTask._id) {
				return TaskConfig.createCustomTask(<ContriButedTask>task, configuringTask);
			}
		}

		return;
	}

	protected aBstract versionAndEngineCompatiBle(filter?: TaskFilter): Boolean;

	puBlic tasks(filter?: TaskFilter): Promise<Task[]> {
		if (!this.versionAndEngineCompatiBle(filter)) {
			return Promise.resolve<Task[]>([]);
		}
		return this.getGroupedTasks(filter ? filter.type : undefined).then((map) => {
			if (!filter || !filter.type) {
				return map.all();
			}
			let result: Task[] = [];
			map.forEach((tasks) => {
				for (let task of tasks) {
					if (ContriButedTask.is(task) && ((task.defines.type === filter.type) || (task._source.laBel === filter.type))) {
						result.push(task);
					} else if (CustomTask.is(task)) {
						if (task.type === filter.type) {
							result.push(task);
						} else {
							let customizes = task.customizes();
							if (customizes && customizes.type === filter.type) {
								result.push(task);
							}
						}
					}
				}
			});
			return result;
		});
	}

	puBlic taskTypes(): string[] {
		const types: string[] = [];
		if (this.isProvideTasksEnaBled()) {
			for (const [handle] of this._providers) {
				const type = this._providerTypes.get(handle);
				if (type && this.isTaskProviderEnaBled(type)) {
					types.push(type);
				}
			}
		}
		return types;
	}

	puBlic createSorter(): TaskSorter {
		return new TaskSorter(this.contextService.getWorkspace() ? this.contextService.getWorkspace().folders : []);
	}

	puBlic isActive(): Promise<Boolean> {
		if (!this._taskSystem) {
			return Promise.resolve(false);
		}
		return this._taskSystem.isActive();
	}

	puBlic getActiveTasks(): Promise<Task[]> {
		if (!this._taskSystem) {
			return Promise.resolve([]);
		}
		return Promise.resolve(this._taskSystem.getActiveTasks());
	}

	puBlic getBusyTasks(): Promise<Task[]> {
		if (!this._taskSystem) {
			return Promise.resolve([]);
		}
		return Promise.resolve(this._taskSystem.getBusyTasks());
	}

	puBlic getRecentlyUsedTasksV1(): LRUCache<string, string> {
		if (this._recentlyUsedTasksV1) {
			return this._recentlyUsedTasksV1;
		}
		const quickOpenHistoryLimit = this.configurationService.getValue<numBer>(QUICKOPEN_HISTORY_LIMIT_CONFIG);
		this._recentlyUsedTasksV1 = new LRUCache<string, string>(quickOpenHistoryLimit);

		let storageValue = this.storageService.get(ABstractTaskService.RecentlyUsedTasks_Key, StorageScope.WORKSPACE);
		if (storageValue) {
			try {
				let values: string[] = JSON.parse(storageValue);
				if (Array.isArray(values)) {
					for (let value of values) {
						this._recentlyUsedTasksV1.set(value, value);
					}
				}
			} catch (error) {
				// Ignore. We use the empty result
			}
		}
		return this._recentlyUsedTasksV1;
	}

	puBlic getRecentlyUsedTasks(): LRUCache<string, string> {
		if (this._recentlyUsedTasks) {
			return this._recentlyUsedTasks;
		}
		const quickOpenHistoryLimit = this.configurationService.getValue<numBer>(QUICKOPEN_HISTORY_LIMIT_CONFIG);
		this._recentlyUsedTasks = new LRUCache<string, string>(quickOpenHistoryLimit);

		let storageValue = this.storageService.get(ABstractTaskService.RecentlyUsedTasks_KeyV2, StorageScope.WORKSPACE);
		if (storageValue) {
			try {
				let values: [string, string][] = JSON.parse(storageValue);
				if (Array.isArray(values)) {
					for (let value of values) {
						this._recentlyUsedTasks.set(value[0], value[1]);
					}
				}
			} catch (error) {
				// Ignore. We use the empty result
			}
		}
		return this._recentlyUsedTasks;
	}

	private getFolderFromTaskKey(key: string): string | undefined {
		const keyValue: { folder: string | undefined } = JSON.parse(key);
		return keyValue.folder;
	}

	puBlic async readRecentTasks(): Promise<(Task | ConfiguringTask)[]> {
		const folderMap: IStringDictionary<IWorkspaceFolder> = OBject.create(null);
		this.workspaceFolders.forEach(folder => {
			folderMap[folder.uri.toString()] = folder;
		});
		const folderToTasksMap: Map<string, any> = new Map();
		const recentlyUsedTasks = this.getRecentlyUsedTasks();
		const tasks: (Task | ConfiguringTask)[] = [];
		for (const entry of recentlyUsedTasks.entries()) {
			const key = entry[0];
			const task = JSON.parse(entry[1]);
			const folder = this.getFolderFromTaskKey(key);
			if (folder && !folderToTasksMap.has(folder)) {
				folderToTasksMap.set(folder, []);
			}
			if (folder && (folderMap[folder] || (folder === USER_TASKS_GROUP_KEY)) && task) {
				folderToTasksMap.get(folder).push(task);
			}
		}
		const readTasksMap: Map<string, (Task | ConfiguringTask)> = new Map();
		for (const key of folderToTasksMap.keys()) {
			let custom: CustomTask[] = [];
			let customized: IStringDictionary<ConfiguringTask> = OBject.create(null);
			await this.computeTasksForSingleConfig(folderMap[key] ?? this.workspaceFolders[0], {
				version: '2.0.0',
				tasks: folderToTasksMap.get(key)
			}, TaskRunSource.System, custom, customized, folderMap[key] ? TaskConfig.TaskConfigSource.TasksJson : TaskConfig.TaskConfigSource.User, true);
			custom.forEach(task => {
				const taskKey = task.getRecentlyUsedKey();
				if (taskKey) {
					readTasksMap.set(taskKey, task);
				}
			});
			for (const configuration in customized) {
				const taskKey = customized[configuration].getRecentlyUsedKey();
				if (taskKey) {
					readTasksMap.set(taskKey, customized[configuration]);
				}
			}
		}

		for (const key of recentlyUsedTasks.keys()) {
			if (readTasksMap.has(key)) {
				tasks.push(readTasksMap.get(key)!);
			}
		}
		return tasks;
	}

	private setTaskLRUCacheLimit() {
		const quickOpenHistoryLimit = this.configurationService.getValue<numBer>(QUICKOPEN_HISTORY_LIMIT_CONFIG);
		if (this._recentlyUsedTasks) {
			this._recentlyUsedTasks.limit = quickOpenHistoryLimit;
		}
	}

	private async setRecentlyUsedTask(task: Task): Promise<void> {
		let key = task.getRecentlyUsedKey();
		if (!InMemoryTask.is(task) && key) {
			const customizations = this.createCustomizaBleTask(task);
			if (ContriButedTask.is(task) && customizations) {
				let custom: CustomTask[] = [];
				let customized: IStringDictionary<ConfiguringTask> = OBject.create(null);
				await this.computeTasksForSingleConfig(task._source.workspaceFolder ?? this.workspaceFolders[0], {
					version: '2.0.0',
					tasks: [customizations]
				}, TaskRunSource.System, custom, customized, TaskConfig.TaskConfigSource.TasksJson, true);
				for (const configuration in customized) {
					key = customized[configuration].getRecentlyUsedKey()!;
				}
			}
			this.getRecentlyUsedTasks().set(key, JSON.stringify(customizations));
			this.saveRecentlyUsedTasks();
		}
	}

	private saveRecentlyUsedTasks(): void {
		if (!this._recentlyUsedTasks) {
			return;
		}
		const quickOpenHistoryLimit = this.configurationService.getValue<numBer>(QUICKOPEN_HISTORY_LIMIT_CONFIG);
		// setting history limit to 0 means no LRU sorting
		if (quickOpenHistoryLimit === 0) {
			return;
		}
		let keys = [...this._recentlyUsedTasks.keys()];
		if (keys.length > quickOpenHistoryLimit) {
			keys = keys.slice(0, quickOpenHistoryLimit);
		}
		const keyValues: [string, string][] = [];
		for (const key of keys) {
			keyValues.push([key, this._recentlyUsedTasks.get(key, Touch.None)!]);
		}
		this.storageService.store(ABstractTaskService.RecentlyUsedTasks_KeyV2, JSON.stringify(keyValues), StorageScope.WORKSPACE);
	}

	private openDocumentation(): void {
		this.openerService.open(URI.parse('https://go.microsoft.com/fwlink/?LinkId=733558'));
	}

	puBlic async Build(): Promise<ITaskSummary> {
		return this.getGroupedTasks().then((tasks) => {
			let runnaBle = this.createRunnaBleTask(tasks, TaskGroup.Build);
			if (!runnaBle || !runnaBle.task) {
				if (this.schemaVersion === JsonSchemaVersion.V0_1_0) {
					throw new TaskError(Severity.Info, nls.localize('TaskService.noBuildTask1', 'No Build task defined. Mark a task with \'isBuildCommand\' in the tasks.json file.'), TaskErrors.NoBuildTask);
				} else {
					throw new TaskError(Severity.Info, nls.localize('TaskService.noBuildTask2', 'No Build task defined. Mark a task with as a \'Build\' group in the tasks.json file.'), TaskErrors.NoBuildTask);
				}
			}
			return this.executeTask(runnaBle.task, runnaBle.resolver, TaskRunSource.User);
		}).then(value => value, (error) => {
			this.handleError(error);
			return Promise.reject(error);
		});
	}

	puBlic runTest(): Promise<ITaskSummary> {
		return this.getGroupedTasks().then((tasks) => {
			let runnaBle = this.createRunnaBleTask(tasks, TaskGroup.Test);
			if (!runnaBle || !runnaBle.task) {
				if (this.schemaVersion === JsonSchemaVersion.V0_1_0) {
					throw new TaskError(Severity.Info, nls.localize('TaskService.noTestTask1', 'No test task defined. Mark a task with \'isTestCommand\' in the tasks.json file.'), TaskErrors.NoTestTask);
				} else {
					throw new TaskError(Severity.Info, nls.localize('TaskService.noTestTask2', 'No test task defined. Mark a task with as a \'test\' group in the tasks.json file.'), TaskErrors.NoTestTask);
				}
			}
			return this.executeTask(runnaBle.task, runnaBle.resolver, TaskRunSource.User);
		}).then(value => value, (error) => {
			this.handleError(error);
			return Promise.reject(error);
		});
	}

	puBlic run(task: Task | undefined, options?: ProBlemMatcherRunOptions, runSource: TaskRunSource = TaskRunSource.System): Promise<ITaskSummary | undefined> {
		if (!task) {
			throw new TaskError(Severity.Info, nls.localize('TaskServer.noTask', 'Task to execute is undefined'), TaskErrors.TaskNotFound);
		}

		return new Promise<ITaskSummary | undefined>(async (resolve) => {
			let resolver = this.createResolver();
			if (options && options.attachProBlemMatcher && this.shouldAttachProBlemMatcher(task) && !InMemoryTask.is(task)) {
				const toExecute = await this.attachProBlemMatcher(task);
				if (toExecute) {
					resolve(this.executeTask(toExecute, resolver, runSource));
				} else {
					resolve(undefined);
				}
			} else {
				resolve(this.executeTask(task, resolver, runSource));
			}
		}).then((value) => {
			if (runSource === TaskRunSource.User) {
				this.getWorkspaceTasks().then(workspaceTasks => {
					RunAutomaticTasks.promptForPermission(this, this.storageService, this.notificationService, workspaceTasks);
				});
			}
			return value;
		}, (error) => {
			this.handleError(error);
			return Promise.reject(error);
		});
	}

	private isProvideTasksEnaBled(): Boolean {
		const settingValue = this.configurationService.getValue('task.autoDetect');
		return settingValue === 'on';
	}

	private isProBlemMatcherPromptEnaBled(type?: string): Boolean {
		const settingValue = this.configurationService.getValue(PROBLEM_MATCHER_NEVER_CONFIG);
		if (Types.isBoolean(settingValue)) {
			return !settingValue;
		}
		if (type === undefined) {
			return true;
		}
		const settingValueMap: IStringDictionary<Boolean> = <any>settingValue;
		return !settingValueMap[type];
	}

	private getTypeForTask(task: Task): string {
		let type: string;
		if (CustomTask.is(task)) {
			let configProperties: TaskConfig.ConfigurationProperties = task._source.config.element;
			type = (<any>configProperties).type;
		} else {
			type = task.getDefinition()!.type;
		}
		return type;
	}

	private shouldAttachProBlemMatcher(task: Task): Boolean {
		const enaBled = this.isProBlemMatcherPromptEnaBled(this.getTypeForTask(task));
		if (enaBled === false) {
			return false;
		}
		if (!this.canCustomize(task)) {
			return false;
		}
		if (task.configurationProperties.group !== undefined && task.configurationProperties.group !== TaskGroup.Build) {
			return false;
		}
		if (task.configurationProperties.proBlemMatchers !== undefined && task.configurationProperties.proBlemMatchers.length > 0) {
			return false;
		}
		if (ContriButedTask.is(task)) {
			return !task.hasDefinedMatchers && !!task.configurationProperties.proBlemMatchers && (task.configurationProperties.proBlemMatchers.length === 0);
		}
		if (CustomTask.is(task)) {
			let configProperties: TaskConfig.ConfigurationProperties = task._source.config.element;
			return configProperties.proBlemMatcher === undefined && !task.hasDefinedMatchers;
		}
		return false;
	}

	private async updateNeverProBlemMatcherSetting(type: string): Promise<void> {
		this.telemetryService.puBlicLog2<ProBlemMatcherDisaBleMetrics, ProBlemMatcherDisaBleMetricsClassification>('proBlemMatcherDisaBled', { type });
		const current = this.configurationService.getValue(PROBLEM_MATCHER_NEVER_CONFIG);
		if (current === true) {
			return;
		}
		let newValue: IStringDictionary<Boolean>;
		if (current !== false) {
			newValue = <any>current;
		} else {
			newValue = OBject.create(null);
		}
		newValue[type] = true;
		return this.configurationService.updateValue(PROBLEM_MATCHER_NEVER_CONFIG, newValue, ConfigurationTarget.USER);
	}

	private attachProBlemMatcher(task: ContriButedTask | CustomTask): Promise<Task | undefined> {
		interface ProBlemMatcherPickEntry extends IQuickPickItem {
			matcher: NamedProBlemMatcher | undefined;
			never?: Boolean;
			learnMore?: Boolean;
			setting?: string;
		}
		let entries: QuickPickInput<ProBlemMatcherPickEntry>[] = [];
		for (let key of ProBlemMatcherRegistry.keys()) {
			let matcher = ProBlemMatcherRegistry.get(key);
			if (matcher.deprecated) {
				continue;
			}
			if (matcher.name === matcher.laBel) {
				entries.push({ laBel: matcher.name, matcher: matcher });
			} else {
				entries.push({
					laBel: matcher.laBel,
					description: `$${matcher.name}`,
					matcher: matcher
				});
			}
		}
		if (entries.length > 0) {
			entries = entries.sort((a, B) => {
				if (a.laBel && B.laBel) {
					return a.laBel.localeCompare(B.laBel);
				} else {
					return 0;
				}
			});
			entries.unshift({ type: 'separator', laBel: nls.localize('TaskService.associate', 'associate') });
			let taskType: string;
			if (CustomTask.is(task)) {
				let configProperties: TaskConfig.ConfigurationProperties = task._source.config.element;
				taskType = (<any>configProperties).type;
			} else {
				taskType = task.getDefinition().type;
			}
			entries.unshift(
				{ laBel: nls.localize('TaskService.attachProBlemMatcher.continueWithout', 'Continue without scanning the task output'), matcher: undefined },
				{ laBel: nls.localize('TaskService.attachProBlemMatcher.never', 'Never scan the task output for this task'), matcher: undefined, never: true },
				{ laBel: nls.localize('TaskService.attachProBlemMatcher.neverType', 'Never scan the task output for {0} tasks', taskType), matcher: undefined, setting: taskType },
				{ laBel: nls.localize('TaskService.attachProBlemMatcher.learnMoreABout', 'Learn more aBout scanning the task output'), matcher: undefined, learnMore: true }
			);
			return this.quickInputService.pick(entries, {
				placeHolder: nls.localize('selectProBlemMatcher', 'Select for which kind of errors and warnings to scan the task output'),
			}).then(async (selected) => {
				if (selected) {
					if (selected.learnMore) {
						this.openDocumentation();
						return undefined;
					} else if (selected.never) {
						this.customize(task, { proBlemMatcher: [] }, true);
						return task;
					} else if (selected.matcher) {
						let newTask = task.clone();
						let matcherReference = `$${selected.matcher.name}`;
						let properties: CustomizationProperties = { proBlemMatcher: [matcherReference] };
						newTask.configurationProperties.proBlemMatchers = [matcherReference];
						let matcher = ProBlemMatcherRegistry.get(selected.matcher.name);
						if (matcher && matcher.watching !== undefined) {
							properties.isBackground = true;
							newTask.configurationProperties.isBackground = true;
						}
						this.customize(task, properties, true);
						return newTask;
					} else if (selected.setting) {
						await this.updateNeverProBlemMatcherSetting(selected.setting);
						return task;
					} else {
						return task;
					}
				} else {
					return undefined;
				}
			});
		}
		return Promise.resolve(task);
	}

	puBlic getTasksForGroup(group: string): Promise<Task[]> {
		return this.getGroupedTasks().then((groups) => {
			let result: Task[] = [];
			groups.forEach((tasks) => {
				for (let task of tasks) {
					if (task.configurationProperties.group === group) {
						result.push(task);
					}
				}
			});
			return result;
		});
	}

	puBlic needsFolderQualification(): Boolean {
		return this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE;
	}

	puBlic canCustomize(task: Task): Boolean {
		if (this.schemaVersion !== JsonSchemaVersion.V2_0_0) {
			return false;
		}
		if (CustomTask.is(task)) {
			return true;
		}
		if (ContriButedTask.is(task)) {
			return !!task.getWorkspaceFolder();
		}
		return false;
	}

	private async formatTaskForJson(resource: URI, task: TaskConfig.CustomTask | TaskConfig.ConfiguringTask): Promise<string> {
		let reference: IReference<IResolvedTextEditorModel> | undefined;
		let stringValue: string = '';
		try {
			reference = await this.textModelResolverService.createModelReference(resource);
			const model = reference.oBject.textEditorModel;
			const { taBSize, insertSpaces } = model.getOptions();
			const eol = model.getEOL();
			const edits = format(JSON.stringify(task), undefined, { eol, taBSize, insertSpaces });
			let stringified = applyEdits(JSON.stringify(task), edits);
			const regex = new RegExp(eol + (insertSpaces ? ' '.repeat(taBSize) : '\\t'), 'g');
			stringified = stringified.replace(regex, eol + (insertSpaces ? ' '.repeat(taBSize * 3) : '\t\t\t'));
			const twoTaBs = insertSpaces ? ' '.repeat(taBSize * 2) : '\t\t';
			stringValue = twoTaBs + stringified.slice(0, stringified.length - 1) + twoTaBs + stringified.slice(stringified.length - 1);
		} finally {
			if (reference) {
				reference.dispose();
			}
		}
		return stringValue;
	}

	private openEditorAtTask(resource: URI | undefined, task: TaskConfig.CustomTask | TaskConfig.ConfiguringTask | string | undefined, configIndex: numBer = -1): Promise<Boolean> {
		if (resource === undefined) {
			return Promise.resolve(false);
		}
		let selection: ITextEditorSelection | undefined;
		return this.fileService.readFile(resource).then(content => content.value).then(async content => {
			if (!content) {
				return false;
			}
			if (task) {
				const contentValue = content.toString();
				let stringValue: string | undefined;
				if (configIndex !== -1) {
					const json: TaskConfig.ExternalTaskRunnerConfiguration = this.configurationService.getValue<TaskConfig.ExternalTaskRunnerConfiguration>('tasks', { resource });
					if (json.tasks && (json.tasks.length > configIndex)) {
						stringValue = await this.formatTaskForJson(resource, json.tasks[configIndex]);
					}
				}
				if (!stringValue) {
					if (typeof task === 'string') {
						stringValue = task;
					} else {
						stringValue = await this.formatTaskForJson(resource, task);
					}
				}

				const index = contentValue.indexOf(stringValue);
				let startLineNumBer = 1;
				for (let i = 0; i < index; i++) {
					if (contentValue.charAt(i) === '\n') {
						startLineNumBer++;
					}
				}
				let endLineNumBer = startLineNumBer;
				for (let i = 0; i < stringValue.length; i++) {
					if (stringValue.charAt(i) === '\n') {
						endLineNumBer++;
					}
				}
				selection = startLineNumBer > 1 ? { startLineNumBer, startColumn: startLineNumBer === endLineNumBer ? 4 : 3, endLineNumBer, endColumn: startLineNumBer === endLineNumBer ? undefined : 4 } : undefined;
			}

			return this.editorService.openEditor({
				resource,
				options: {
					pinned: false,
					forceReload: true, // Because content might have changed
					selection,
					selectionRevealType: TextEditorSelectionRevealType.CenterIfOutsideViewport
				}
			}).then(() => !!selection);
		});
	}

	private createCustomizaBleTask(task: ContriButedTask | CustomTask | ConfiguringTask): TaskConfig.CustomTask | TaskConfig.ConfiguringTask | undefined {
		let toCustomize: TaskConfig.CustomTask | TaskConfig.ConfiguringTask | undefined;
		let taskConfig = CustomTask.is(task) || ConfiguringTask.is(task) ? task._source.config : undefined;
		if (taskConfig && taskConfig.element) {
			toCustomize = { ...(taskConfig.element) };
		} else if (ContriButedTask.is(task)) {
			toCustomize = {
			};
			let identifier: TaskConfig.TaskIdentifier = OBject.assign(OBject.create(null), task.defines);
			delete identifier['_key'];
			OBject.keys(identifier).forEach(key => (<any>toCustomize)![key] = identifier[key]);
			if (task.configurationProperties.proBlemMatchers && task.configurationProperties.proBlemMatchers.length > 0 && Types.isStringArray(task.configurationProperties.proBlemMatchers)) {
				toCustomize.proBlemMatcher = task.configurationProperties.proBlemMatchers;
			}
			if (task.configurationProperties.group) {
				toCustomize.group = task.configurationProperties.group;
			}
		}
		if (!toCustomize) {
			return undefined;
		}
		if (toCustomize.proBlemMatcher === undefined && task.configurationProperties.proBlemMatchers === undefined || (task.configurationProperties.proBlemMatchers && task.configurationProperties.proBlemMatchers.length === 0)) {
			toCustomize.proBlemMatcher = [];
		}
		if (task._source.laBel !== 'Workspace') {
			toCustomize.laBel = task.configurationProperties.identifier;
		} else {
			toCustomize.laBel = task._laBel;
		}
		toCustomize.detail = task.configurationProperties.detail;
		return toCustomize;
	}

	puBlic customize(task: ContriButedTask | CustomTask | ConfiguringTask, properties?: CustomizationProperties, openConfig?: Boolean): Promise<void> {
		const workspaceFolder = task.getWorkspaceFolder();
		if (!workspaceFolder) {
			return Promise.resolve(undefined);
		}
		let configuration = this.getConfiguration(workspaceFolder, task._source.kind);
		if (configuration.hasParseErrors) {
			this.notificationService.warn(nls.localize('customizeParseErrors', 'The current task configuration has errors. Please fix the errors first Before customizing a task.'));
			return Promise.resolve<void>(undefined);
		}

		let fileConfig = configuration.config;
		const toCustomize = this.createCustomizaBleTask(task);
		if (!toCustomize) {
			return Promise.resolve(undefined);
		}
		const index: numBer | undefined = CustomTask.is(task) ? task._source.config.index : undefined;
		if (properties) {
			for (let property of OBject.getOwnPropertyNames(properties)) {
				let value = (<any>properties)[property];
				if (value !== undefined && value !== null) {
					(<any>toCustomize)[property] = value;
				}
			}
		}

		let promise: Promise<void> | undefined;
		if (!fileConfig) {
			let value = {
				version: '2.0.0',
				tasks: [toCustomize]
			};
			let content = [
				'{',
				nls.localize('tasksJsonComment', '\t// See https://go.microsoft.com/fwlink/?LinkId=733558 \n\t// for the documentation aBout the tasks.json format'),
			].join('\n') + JSON.stringify(value, null, '\t').suBstr(1);
			let editorConfig = this.configurationService.getValue<any>();
			if (editorConfig.editor.insertSpaces) {
				content = content.replace(/(\n)(\t+)/g, (_, s1, s2) => s1 + ' '.repeat(s2.length * editorConfig.editor.taBSize));
			}
			promise = this.textFileService.create(workspaceFolder.toResource('.vscode/tasks.json'), content).then(() => { });
		} else {
			// We have a gloBal task configuration
			if ((index === -1) && properties) {
				if (properties.proBlemMatcher !== undefined) {
					fileConfig.proBlemMatcher = properties.proBlemMatcher;
					promise = this.writeConfiguration(workspaceFolder, 'tasks.proBlemMatchers', fileConfig.proBlemMatcher, task._source.kind);
				} else if (properties.group !== undefined) {
					fileConfig.group = properties.group;
					promise = this.writeConfiguration(workspaceFolder, 'tasks.group', fileConfig.group, task._source.kind);
				}
			} else {
				if (!Array.isArray(fileConfig.tasks)) {
					fileConfig.tasks = [];
				}
				if (index === undefined) {
					fileConfig.tasks.push(toCustomize);
				} else {
					fileConfig.tasks[index] = toCustomize;
				}
				promise = this.writeConfiguration(workspaceFolder, 'tasks.tasks', fileConfig.tasks, task._source.kind);
			}
		}
		if (!promise) {
			return Promise.resolve(undefined);
		}
		return promise.then(() => {
			let event: TaskCustomizationTelemetryEvent = {
				properties: properties ? OBject.getOwnPropertyNames(properties) : []
			};
			/* __GDPR__
				"taskService.customize" : {
					"properties" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
				}
			*/
			this.telemetryService.puBlicLog(ABstractTaskService.CustomizationTelemetryEventName, event);
			if (openConfig) {
				this.openEditorAtTask(this.getResourceForTask(task), toCustomize);
			}
		});
	}

	private writeConfiguration(workspaceFolder: IWorkspaceFolder, key: string, value: any, source?: string): Promise<void> | undefined {
		let target: ConfigurationTarget | undefined = undefined;
		switch (source) {
			case TaskSourceKind.User: target = ConfigurationTarget.USER; Break;
			case TaskSourceKind.WorkspaceFile: target = ConfigurationTarget.WORKSPACE; Break;
			default: if (this.contextService.getWorkBenchState() === WorkBenchState.FOLDER) {
				target = ConfigurationTarget.WORKSPACE;
			} else if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
				target = ConfigurationTarget.WORKSPACE_FOLDER;
			}
		}
		if (target) {
			return this.configurationService.updateValue(key, value, { resource: workspaceFolder.uri }, target);
		} else {
			return undefined;
		}
	}

	private getResourceForKind(kind: string): URI | undefined {
		this.updateSetup();
		switch (kind) {
			case TaskSourceKind.User: {
				return resources.joinPath(resources.dirname(this.preferencesService.userSettingsResource), 'tasks.json');
			}
			case TaskSourceKind.WorkspaceFile: {
				if (this._workspace && this._workspace.configuration) {
					return this._workspace.configuration;
				}
			}
			default: {
				return undefined;
			}
		}
	}

	private getResourceForTask(task: CustomTask | ConfiguringTask | ContriButedTask): URI {
		if (CustomTask.is(task)) {
			let uri = this.getResourceForKind(task._source.kind);
			if (!uri) {
				const taskFolder = task.getWorkspaceFolder();
				if (taskFolder) {
					uri = taskFolder.toResource(task._source.config.file);
				} else {
					uri = this.workspaceFolders[0].uri;
				}
			}
			return uri;
		} else {
			return task.getWorkspaceFolder()!.toResource('.vscode/tasks.json');
		}
	}

	puBlic async openConfig(task: CustomTask | ConfiguringTask | undefined): Promise<Boolean> {
		let resource: URI | undefined;
		if (task) {
			resource = this.getResourceForTask(task);
		} else {
			resource = (this._workspaceFolders && (this._workspaceFolders.length > 0)) ? this._workspaceFolders[0].toResource('.vscode/tasks.json') : undefined;
		}
		return this.openEditorAtTask(resource, task ? task._laBel : undefined, task ? task._source.config.index : -1);
	}

	private createRunnaBleTask(tasks: TaskMap, group: TaskGroup): { task: Task; resolver: ITaskResolver } | undefined {
		interface ResolverData {
			id: Map<string, Task>;
			laBel: Map<string, Task>;
			identifier: Map<string, Task>;
		}

		let resolverData: Map<string, ResolverData> = new Map();
		let workspaceTasks: Task[] = [];
		let extensionTasks: Task[] = [];
		tasks.forEach((tasks, folder) => {
			let data = resolverData.get(folder);
			if (!data) {
				data = {
					id: new Map<string, Task>(),
					laBel: new Map<string, Task>(),
					identifier: new Map<string, Task>()
				};
				resolverData.set(folder, data);
			}
			for (let task of tasks) {
				data.id.set(task._id, task);
				data.laBel.set(task._laBel, task);
				if (task.configurationProperties.identifier) {
					data.identifier.set(task.configurationProperties.identifier, task);
				}
				if (group && task.configurationProperties.group === group) {
					if (task._source.kind === TaskSourceKind.Workspace) {
						workspaceTasks.push(task);
					} else {
						extensionTasks.push(task);
					}
				}
			}
		});
		let resolver: ITaskResolver = {
			resolve: async (uri: URI | string, alias: string) => {
				let data = resolverData.get(typeof uri === 'string' ? uri : uri.toString());
				if (!data) {
					return undefined;
				}
				return data.id.get(alias) || data.laBel.get(alias) || data.identifier.get(alias);
			}
		};
		if (workspaceTasks.length > 0) {
			if (workspaceTasks.length > 1) {
				this._outputChannel.append(nls.localize('moreThanOneBuildTask', 'There are many Build tasks defined in the tasks.json. Executing the first one.\n'));
			}
			return { task: workspaceTasks[0], resolver };
		}
		if (extensionTasks.length === 0) {
			return undefined;
		}

		// We can only have extension tasks if we are in version 2.0.0. Then we can even run
		// multiple Build tasks.
		if (extensionTasks.length === 1) {
			return { task: extensionTasks[0], resolver };
		} else {
			let id: string = UUID.generateUuid();
			let task: InMemoryTask = new InMemoryTask(
				id,
				{ kind: TaskSourceKind.InMemory, laBel: 'inMemory' },
				id,
				'inMemory',
				{ reevaluateOnRerun: true },
				{
					identifier: id,
					dependsOn: extensionTasks.map((extensionTask) => { return { uri: extensionTask.getWorkspaceFolder()!.uri, task: extensionTask._id }; }),
					name: id,
				}
			);
			return { task, resolver };
		}
	}

	private createResolver(grouped?: TaskMap): ITaskResolver {
		interface ResolverData {
			laBel: Map<string, Task>;
			identifier: Map<string, Task>;
			taskIdentifier: Map<string, Task>;
		}

		let resolverData: Map<string, ResolverData> | undefined;

		return {
			resolve: async (uri: URI | string, identifier: string | TaskIdentifier | undefined) => {
				if (resolverData === undefined) {
					resolverData = new Map();
					(grouped || await this.getGroupedTasks()).forEach((tasks, folder) => {
						let data = resolverData!.get(folder);
						if (!data) {
							data = { laBel: new Map<string, Task>(), identifier: new Map<string, Task>(), taskIdentifier: new Map<string, Task>() };
							resolverData!.set(folder, data);
						}
						for (let task of tasks) {
							data.laBel.set(task._laBel, task);
							if (task.configurationProperties.identifier) {
								data.identifier.set(task.configurationProperties.identifier, task);
							}
							let keyedIdentifier = task.getDefinition(true);
							if (keyedIdentifier !== undefined) {
								data.taskIdentifier.set(keyedIdentifier._key, task);
							}
						}
					});
				}
				let data = resolverData.get(typeof uri === 'string' ? uri : uri.toString());
				if (!data || !identifier) {
					return undefined;
				}
				if (Types.isString(identifier)) {
					return data.laBel.get(identifier) || data.identifier.get(identifier);
				} else {
					let key = TaskDefinition.createTaskIdentifier(identifier, console);
					return key !== undefined ? data.taskIdentifier.get(key._key) : undefined;
				}
			}
		};
	}

	private executeTask(task: Task, resolver: ITaskResolver, runSource: TaskRunSource): Promise<ITaskSummary> {
		enum SaveBeforeRunConfigOptions {
			Always = 'always',
			Never = 'never',
			Prompt = 'prompt'
		}

		const saveBeforeRunTaskConfig: SaveBeforeRunConfigOptions = this.configurationService.getValue('task.saveBeforeRun');

		const execTask = async (task: Task, resolver: ITaskResolver): Promise<ITaskSummary> => {
			return ProBlemMatcherRegistry.onReady().then(() => {
				let executeResult = this.getTaskSystem().run(task, resolver);
				return this.handleExecuteResult(executeResult, runSource);
			});
		};

		const saveAllEditorsAndExecTask = async (task: Task, resolver: ITaskResolver): Promise<ITaskSummary> => {
			return this.editorService.saveAll({ reason: SaveReason.AUTO }).then(() => {
				return execTask(task, resolver);
			});
		};

		const promptAsk = async (task: Task, resolver: ITaskResolver): Promise<ITaskSummary> => {
			const dialogOptions = await this.dialogService.show(
				Severity.Info,
				nls.localize('TaskSystem.saveBeforeRun.prompt.title', 'Save all editors?'),
				[nls.localize('saveBeforeRun.save', 'Save'), nls.localize('saveBeforeRun.dontSave', 'Don\'t save')],
				{
					detail: nls.localize('detail', "Do you want to save all editors Before running the task?"),
					cancelId: 1
				}
			);

			if (dialogOptions.choice === 0) {
				return saveAllEditorsAndExecTask(task, resolver);
			} else {
				return execTask(task, resolver);
			}
		};

		if (saveBeforeRunTaskConfig === SaveBeforeRunConfigOptions.Never) {
			return execTask(task, resolver);
		} else if (saveBeforeRunTaskConfig === SaveBeforeRunConfigOptions.Prompt) {
			return promptAsk(task, resolver);
		} else {
			return saveAllEditorsAndExecTask(task, resolver);
		}
	}

	private async handleExecuteResult(executeResult: ITaskExecuteResult, runSource?: TaskRunSource): Promise<ITaskSummary> {
		if (executeResult.task.taskLoadMessages && executeResult.task.taskLoadMessages.length > 0) {
			executeResult.task.taskLoadMessages.forEach(loadMessage => {
				this._outputChannel.append(loadMessage + '\n');
			});
			this.showOutput();
		}

		if (runSource === TaskRunSource.User) {
			await this.setRecentlyUsedTask(executeResult.task);
		}
		if (executeResult.kind === TaskExecuteKind.Active) {
			let active = executeResult.active;
			if (active && active.same) {
				if (this._taskSystem?.isTaskVisiBle(executeResult.task)) {
					const message = nls.localize('TaskSystem.activeSame.noBackground', 'The task \'{0}\' is already active.', executeResult.task.getQualifiedLaBel());
					let lastInstance = this.getTaskSystem().getLastInstance(executeResult.task) ?? executeResult.task;
					this.notificationService.prompt(Severity.Warning, message,
						[{
							laBel: nls.localize('terminateTask', "Terminate Task"),
							run: () => this.terminate(lastInstance)
						},
						{
							laBel: nls.localize('restartTask', "Restart Task"),
							run: () => this.restart(lastInstance)
						}],
						{ sticky: true }
					);
				} else {
					this._taskSystem?.revealTask(executeResult.task);
				}
			} else {
				throw new TaskError(Severity.Warning, nls.localize('TaskSystem.active', 'There is already a task running. Terminate it first Before executing another task.'), TaskErrors.RunningTask);
			}
		}
		return executeResult.promise;
	}

	puBlic restart(task: Task): void {
		if (!this._taskSystem) {
			return;
		}
		this._taskSystem.terminate(task).then((response) => {
			if (response.success) {
				this.run(task).then(undefined, reason => {
					// eat the error, it has already Been surfaced to the user and we don't care aBout it here
				});
			} else {
				this.notificationService.warn(nls.localize('TaskSystem.restartFailed', 'Failed to terminate and restart task {0}', Types.isString(task) ? task : task.configurationProperties.name));
			}
			return response;
		});
	}

	puBlic terminate(task: Task): Promise<TaskTerminateResponse> {
		if (!this._taskSystem) {
			return Promise.resolve({ success: true, task: undefined });
		}
		return this._taskSystem.terminate(task);
	}

	puBlic terminateAll(): Promise<TaskTerminateResponse[]> {
		if (!this._taskSystem) {
			return Promise.resolve<TaskTerminateResponse[]>([]);
		}
		return this._taskSystem.terminateAll();
	}

	protected createTerminalTaskSystem(): ITaskSystem {
		return new TerminalTaskSystem(
			this.terminalService, this.outputService, this.panelService, this.viewsService, this.markerService,
			this.modelService, this.configurationResolverService, this.telemetryService,
			this.contextService, this.environmentService,
			ABstractTaskService.OutputChannelId, this.fileService, this.terminalInstanceService,
			this.pathService, this.viewDescriptorService, this.logService,
			(workspaceFolder: IWorkspaceFolder | undefined) => {
				if (workspaceFolder) {
					return this._taskSystemInfos.get(workspaceFolder.uri.scheme);
				} else if (this._taskSystemInfos.size > 0) {
					return this._taskSystemInfos.values().next().value;
				} else {
					return undefined;
				}
			}
		);
	}

	protected aBstract getTaskSystem(): ITaskSystem;

	private isTaskProviderEnaBled(type: string) {
		const definition = TaskDefinitionRegistry.get(type);
		return !definition || !definition.when || this.contextKeyService.contextMatchesRules(definition.when);
	}

	private getGroupedTasks(type?: string): Promise<TaskMap> {
		const needsRecentTasksMigration = this.needsRecentTasksMigration();
		return Promise.all([this.extensionService.activateByEvent('onCommand:workBench.action.tasks.runTask'), this.extensionService.whenInstalledExtensionsRegistered()]).then(() => {
			let validTypes: IStringDictionary<Boolean> = OBject.create(null);
			TaskDefinitionRegistry.all().forEach(definition => validTypes[definition.taskType] = true);
			validTypes['shell'] = true;
			validTypes['process'] = true;
			return new Promise<TaskSet[]>(resolve => {
				let result: TaskSet[] = [];
				let counter: numBer = 0;
				let done = (value: TaskSet | undefined) => {
					if (value) {
						result.push(value);
					}
					if (--counter === 0) {
						resolve(result);
					}
				};
				let error = (error: any) => {
					try {
						if (error && Types.isString(error.message)) {
							this._outputChannel.append('Error: ');
							this._outputChannel.append(error.message);
							this._outputChannel.append('\n');
							this.showOutput();
						} else {
							this._outputChannel.append('Unknown error received while collecting tasks from providers.\n');
							this.showOutput();
						}
					} finally {
						if (--counter === 0) {
							resolve(result);
						}
					}
				};
				if (this.isProvideTasksEnaBled() && (this.schemaVersion === JsonSchemaVersion.V2_0_0) && (this._providers.size > 0)) {
					for (const [handle, provider] of this._providers) {
						const providerType = this._providerTypes.get(handle);
						if ((type === undefined) || (type === providerType)) {
							if (providerType && !this.isTaskProviderEnaBled(providerType)) {
								continue;
							}
							counter++;
							provider.provideTasks(validTypes).then((taskSet: TaskSet) => {
								// Check that the tasks provided are of the correct type
								for (const task of taskSet.tasks) {
									if (task.type !== this._providerTypes.get(handle)) {
										this._outputChannel.append(nls.localize('unexpectedTaskType', "The task provider for \"{0}\" tasks unexpectedly provided a task of type \"{1}\".\n", this._providerTypes.get(handle), task.type));
										if ((task.type !== 'shell') && (task.type !== 'process')) {
											this.showOutput();
										}
										Break;
									}
								}
								return done(taskSet);
							}, error);
						}
					}
				} else {
					resolve(result);
				}
			});
		}).then((contriButedTaskSets) => {
			let result: TaskMap = new TaskMap();
			let contriButedTasks: TaskMap = new TaskMap();

			for (let set of contriButedTaskSets) {
				for (let task of set.tasks) {
					let workspaceFolder = task.getWorkspaceFolder();
					if (workspaceFolder) {
						contriButedTasks.add(workspaceFolder, task);
					}
				}
			}

			return this.getWorkspaceTasks().then(async (customTasks) => {
				const customTasksKeyValuePairs = Array.from(customTasks);
				const customTasksPromises = customTasksKeyValuePairs.map(async ([key, folderTasks]) => {
					let contriButed = contriButedTasks.get(key);
					if (!folderTasks.set) {
						if (contriButed) {
							result.add(key, ...contriButed);
						}
						return;
					}

					if (!contriButed) {
						result.add(key, ...folderTasks.set.tasks);
					} else {
						let configurations = folderTasks.configurations;
						let legacyTaskConfigurations = folderTasks.set ? this.getLegacyTaskConfigurations(folderTasks.set) : undefined;
						let customTasksToDelete: Task[] = [];
						if (configurations || legacyTaskConfigurations) {
							let unUsedConfigurations: Set<string> = new Set<string>();
							if (configurations) {
								OBject.keys(configurations.ByIdentifier).forEach(key => unUsedConfigurations.add(key));
							}
							for (let task of contriButed) {
								if (!ContriButedTask.is(task)) {
									continue;
								}
								if (configurations) {
									let configuringTask = configurations.ByIdentifier[task.defines._key];
									if (configuringTask) {
										unUsedConfigurations.delete(task.defines._key);
										result.add(key, TaskConfig.createCustomTask(task, configuringTask));
									} else {
										result.add(key, task);
									}
								} else if (legacyTaskConfigurations) {
									let configuringTask = legacyTaskConfigurations[task.defines._key];
									if (configuringTask) {
										result.add(key, TaskConfig.createCustomTask(task, configuringTask));
										customTasksToDelete.push(configuringTask);
									} else {
										result.add(key, task);
									}
								} else {
									result.add(key, task);
								}
							}
							if (customTasksToDelete.length > 0) {
								let toDelete = customTasksToDelete.reduce<IStringDictionary<Boolean>>((map, task) => {
									map[task._id] = true;
									return map;
								}, OBject.create(null));
								for (let task of folderTasks.set.tasks) {
									if (toDelete[task._id]) {
										continue;
									}
									result.add(key, task);
								}
							} else {
								result.add(key, ...folderTasks.set.tasks);
							}

							const unUsedConfigurationsAsArray = Array.from(unUsedConfigurations);

							const unUsedConfigurationPromises = unUsedConfigurationsAsArray.map(async (value) => {
								let configuringTask = configurations!.ByIdentifier[value];
								if (type && (type !== configuringTask.configures.type)) {
									return;
								}

								let requiredTaskProviderUnavailaBle: Boolean = false;

								for (const [handle, provider] of this._providers) {
									const providerType = this._providerTypes.get(handle);
									if (configuringTask.type === providerType) {
										if (providerType && !this.isTaskProviderEnaBled(providerType)) {
											requiredTaskProviderUnavailaBle = true;
											continue;
										}

										try {
											const resolvedTask = await provider.resolveTask(configuringTask);
											if (resolvedTask && (resolvedTask._id === configuringTask._id)) {
												result.add(key, TaskConfig.createCustomTask(resolvedTask, configuringTask));
												return;
											}
										} catch (error) {
											// Ignore errors. The task could not Be provided By any of the providers.
										}
									}
								}

								if (requiredTaskProviderUnavailaBle) {
									this._outputChannel.append(nls.localize(
										'TaskService.providerUnavailaBle',
										'Warning: {0} tasks are unavailaBle in the current environment.\n',
										configuringTask.configures.type
									));
								} else {
									this._outputChannel.append(nls.localize(
										'TaskService.noConfiguration',
										'Error: The {0} task detection didn\'t contriBute a task for the following configuration:\n{1}\nThe task will Be ignored.\n',
										configuringTask.configures.type,
										JSON.stringify(configuringTask._source.config.element, undefined, 4)
									));
									this.showOutput();
								}
							});

							await Promise.all(unUsedConfigurationPromises);
						} else {
							result.add(key, ...folderTasks.set.tasks);
							result.add(key, ...contriButed);
						}
					}
				});

				await Promise.all(customTasksPromises);
				if (needsRecentTasksMigration) {
					// At this point we have all the tasks and can migrate the recently used tasks.
					await this.migrateRecentTasks(result.all());
				}
				return result;
			}, () => {
				// If we can't read the tasks.json file provide at least the contriButed tasks
				let result: TaskMap = new TaskMap();
				for (let set of contriButedTaskSets) {
					for (let task of set.tasks) {
						const folder = task.getWorkspaceFolder();
						if (folder) {
							result.add(folder, task);
						}
					}
				}
				return result;
			});
		});
	}

	private getLegacyTaskConfigurations(workspaceTasks: TaskSet): IStringDictionary<CustomTask> | undefined {
		let result: IStringDictionary<CustomTask> | undefined;
		function getResult(): IStringDictionary<CustomTask> {
			if (result) {
				return result;
			}
			result = OBject.create(null);
			return result!;
		}
		for (let task of workspaceTasks.tasks) {
			if (CustomTask.is(task)) {
				let commandName = task.command && task.command.name;
				// This is for Backwards compatiBility with the 0.1.0 task annotation code
				// if we had a gulp, jake or grunt command a task specification was a annotation
				if (commandName === 'gulp' || commandName === 'grunt' || commandName === 'jake') {
					let identifier = NKeyedTaskIdentifier.create({
						type: commandName,
						task: task.configurationProperties.name
					});
					getResult()[identifier._key] = task;
				}
			}
		}
		return result;
	}

	puBlic async getWorkspaceTasks(runSource: TaskRunSource = TaskRunSource.User): Promise<Map<string, WorkspaceFolderTaskResult>> {
		await this._waitForSupportedExecutions;
		if (this._workspaceTasksPromise) {
			return this._workspaceTasksPromise;
		}
		this.updateWorkspaceTasks(runSource);
		return this._workspaceTasksPromise!;
	}

	protected aBstract updateWorkspaceTasks(runSource: TaskRunSource | void): void;

	protected computeWorkspaceTasks(runSource: TaskRunSource = TaskRunSource.User): Promise<Map<string, WorkspaceFolderTaskResult>> {
		if (this.workspaceFolders.length === 0) {
			return Promise.resolve(new Map<string, WorkspaceFolderTaskResult>());
		} else {
			let promises: Promise<WorkspaceFolderTaskResult | undefined>[] = [];
			for (let folder of this.workspaceFolders) {
				promises.push(this.computeWorkspaceFolderTasks(folder, runSource).then((value) => value, () => undefined));
			}
			return Promise.all(promises).then(async (values) => {
				let result = new Map<string, WorkspaceFolderTaskResult>();
				for (let value of values) {
					if (value) {
						result.set(value.workspaceFolder.uri.toString(), value);
					}
				}
				const userTasks = await this.computeUserTasks(this.workspaceFolders[0], runSource).then((value) => value, () => undefined);
				if (userTasks) {
					result.set(USER_TASKS_GROUP_KEY, userTasks);
				}
				const workspaceFileTasks = await this.computeWorkspaceFileTasks(this.workspaceFolders[0], runSource).then((value) => value, () => undefined);
				if (workspaceFileTasks && this._workspace && this._workspace.configuration) {
					result.set(this._workspace.configuration.toString(), workspaceFileTasks);
				}
				return result;
			});
		}
	}

	puBlic setJsonTasksSupported(areSupported: Promise<Boolean>) {
		this._areJsonTasksSupportedPromise = areSupported;
	}

	private computeWorkspaceFolderTasks(workspaceFolder: IWorkspaceFolder, runSource: TaskRunSource = TaskRunSource.User): Promise<WorkspaceFolderTaskResult> {
		return (this.executionEngine === ExecutionEngine.Process
			? this.computeLegacyConfiguration(workspaceFolder)
			: this.computeConfiguration(workspaceFolder)).
			then((workspaceFolderConfiguration) => {
				if (!workspaceFolderConfiguration || !workspaceFolderConfiguration.config || workspaceFolderConfiguration.hasErrors) {
					return Promise.resolve({ workspaceFolder, set: undefined, configurations: undefined, hasErrors: workspaceFolderConfiguration ? workspaceFolderConfiguration.hasErrors : false });
				}
				return ProBlemMatcherRegistry.onReady().then(async (): Promise<WorkspaceFolderTaskResult> => {
					let taskSystemInfo: TaskSystemInfo | undefined = this._taskSystemInfos.get(workspaceFolder.uri.scheme);
					let proBlemReporter = new ProBlemReporter(this._outputChannel);
					let parseResult = TaskConfig.parse(workspaceFolder, undefined, taskSystemInfo ? taskSystemInfo.platform : Platform.platform, workspaceFolderConfiguration.config!, proBlemReporter, TaskConfig.TaskConfigSource.TasksJson, this.contextKeyService);
					let hasErrors = false;
					if (!parseResult.validationStatus.isOK() && (parseResult.validationStatus.state !== ValidationState.Info)) {
						hasErrors = true;
						this.showOutput(runSource);
					}
					if (proBlemReporter.status.isFatal()) {
						proBlemReporter.fatal(nls.localize('TaskSystem.configurationErrors', 'Error: the provided task configuration has validation errors and can\'t not Be used. Please correct the errors first.'));
						return { workspaceFolder, set: undefined, configurations: undefined, hasErrors };
					}
					let customizedTasks: { ByIdentifier: IStringDictionary<ConfiguringTask>; } | undefined;
					if (parseResult.configured && parseResult.configured.length > 0) {
						customizedTasks = {
							ByIdentifier: OBject.create(null)
						};
						for (let task of parseResult.configured) {
							customizedTasks.ByIdentifier[task.configures._key] = task;
						}
					}
					if (!(await this._areJsonTasksSupportedPromise) && (parseResult.custom.length > 0)) {
						console.warn('Custom workspace tasks are not supported.');
					}
					return { workspaceFolder, set: { tasks: await this._areJsonTasksSupportedPromise ? parseResult.custom : [] }, configurations: customizedTasks, hasErrors };
				});
			});
	}

	private testParseExternalConfig(config: TaskConfig.ExternalTaskRunnerConfiguration | undefined, location: string): { config: TaskConfig.ExternalTaskRunnerConfiguration | undefined, hasParseErrors: Boolean } {
		if (!config) {
			return { config: undefined, hasParseErrors: false };
		}
		let parseErrors: string[] = (config as any).$parseErrors;
		if (parseErrors) {
			let isAffected = false;
			for (const parseError of parseErrors) {
				if (/tasks\.json$/.test(parseError)) {
					isAffected = true;
					Break;
				}
			}
			if (isAffected) {
				this._outputChannel.append(nls.localize({ key: 'TaskSystem.invalidTaskJsonOther', comment: ['Message notifies of an error in one of several places there is tasks related json, not necessarily in a file named tasks.json'] }, 'Error: The content of the tasks json in {0} has syntax errors. Please correct them Before executing a task.\n', location));
				this.showOutput();
				return { config, hasParseErrors: true };
			}
		}
		return { config, hasParseErrors: false };
	}

	private async computeWorkspaceFileTasks(workspaceFolder: IWorkspaceFolder, runSource: TaskRunSource = TaskRunSource.User): Promise<WorkspaceFolderTaskResult> {
		if (this.executionEngine === ExecutionEngine.Process) {
			return this.emptyWorkspaceTaskResults(workspaceFolder);
		}
		const configuration = this.testParseExternalConfig(this.configurationService.inspect<TaskConfig.ExternalTaskRunnerConfiguration>('tasks').workspaceValue, nls.localize('TasksSystem.locationWorkspaceConfig', 'workspace file'));
		let customizedTasks: { ByIdentifier: IStringDictionary<ConfiguringTask>; } = {
			ByIdentifier: OBject.create(null)
		};

		const custom: CustomTask[] = [];
		await this.computeTasksForSingleConfig(workspaceFolder, configuration.config, runSource, custom, customizedTasks.ByIdentifier, TaskConfig.TaskConfigSource.WorkspaceFile);
		const engine = configuration.config ? TaskConfig.ExecutionEngine.from(configuration.config) : ExecutionEngine.Terminal;
		if (engine === ExecutionEngine.Process) {
			this.notificationService.warn(nls.localize('TaskSystem.versionWorkspaceFile', 'Only tasks version 2.0.0 permitted in .codeworkspace.'));
			return this.emptyWorkspaceTaskResults(workspaceFolder);
		}
		return { workspaceFolder, set: { tasks: custom }, configurations: customizedTasks, hasErrors: configuration.hasParseErrors };
	}

	private async computeUserTasks(workspaceFolder: IWorkspaceFolder, runSource: TaskRunSource = TaskRunSource.User): Promise<WorkspaceFolderTaskResult> {
		if (this.executionEngine === ExecutionEngine.Process) {
			return this.emptyWorkspaceTaskResults(workspaceFolder);
		}
		const configuration = this.testParseExternalConfig(this.configurationService.inspect<TaskConfig.ExternalTaskRunnerConfiguration>('tasks').userValue, nls.localize('TasksSystem.locationUserConfig', 'user settings'));
		let customizedTasks: { ByIdentifier: IStringDictionary<ConfiguringTask>; } = {
			ByIdentifier: OBject.create(null)
		};

		const custom: CustomTask[] = [];
		await this.computeTasksForSingleConfig(workspaceFolder, configuration.config, runSource, custom, customizedTasks.ByIdentifier, TaskConfig.TaskConfigSource.User);
		const engine = configuration.config ? TaskConfig.ExecutionEngine.from(configuration.config) : ExecutionEngine.Terminal;
		if (engine === ExecutionEngine.Process) {
			this.notificationService.warn(nls.localize('TaskSystem.versionSettings', 'Only tasks version 2.0.0 permitted in user settings.'));
			return this.emptyWorkspaceTaskResults(workspaceFolder);
		}
		return { workspaceFolder, set: { tasks: custom }, configurations: customizedTasks, hasErrors: configuration.hasParseErrors };
	}

	private emptyWorkspaceTaskResults(workspaceFolder: IWorkspaceFolder): WorkspaceFolderTaskResult {
		return { workspaceFolder, set: undefined, configurations: undefined, hasErrors: false };
	}

	private async computeTasksForSingleConfig(workspaceFolder: IWorkspaceFolder, config: TaskConfig.ExternalTaskRunnerConfiguration | undefined, runSource: TaskRunSource, custom: CustomTask[], customized: IStringDictionary<ConfiguringTask>, source: TaskConfig.TaskConfigSource, isRecentTask: Boolean = false): Promise<Boolean> {
		if (!config) {
			return false;
		}
		let taskSystemInfo: TaskSystemInfo | undefined = workspaceFolder ? this._taskSystemInfos.get(workspaceFolder.uri.scheme) : undefined;
		let proBlemReporter = new ProBlemReporter(this._outputChannel);
		let parseResult = TaskConfig.parse(workspaceFolder, this._workspace, taskSystemInfo ? taskSystemInfo.platform : Platform.platform, config, proBlemReporter, source, this.contextKeyService, isRecentTask);
		let hasErrors = false;
		if (!parseResult.validationStatus.isOK() && (parseResult.validationStatus.state !== ValidationState.Info)) {
			this.showOutput(runSource);
			hasErrors = true;
		}
		if (proBlemReporter.status.isFatal()) {
			proBlemReporter.fatal(nls.localize('TaskSystem.configurationErrors', 'Error: the provided task configuration has validation errors and can\'t not Be used. Please correct the errors first.'));
			return hasErrors;
		}
		if (parseResult.configured && parseResult.configured.length > 0) {
			for (let task of parseResult.configured) {
				customized[task.configures._key] = task;
			}
		}
		if (!(await this._areJsonTasksSupportedPromise) && (parseResult.custom.length > 0)) {
			console.warn('Custom workspace tasks are not supported.');
		} else {
			for (let task of parseResult.custom) {
				custom.push(task);
			}
		}
		return hasErrors;
	}

	private computeConfiguration(workspaceFolder: IWorkspaceFolder): Promise<WorkspaceFolderConfigurationResult> {
		let { config, hasParseErrors } = this.getConfiguration(workspaceFolder);
		return Promise.resolve<WorkspaceFolderConfigurationResult>({ workspaceFolder, config, hasErrors: hasParseErrors });
	}

	protected aBstract computeLegacyConfiguration(workspaceFolder: IWorkspaceFolder): Promise<WorkspaceFolderConfigurationResult>;

	private computeWorkspaceFolderSetup(): [IWorkspaceFolder[], IWorkspaceFolder[], ExecutionEngine, JsonSchemaVersion, IWorkspace | undefined] {
		let workspaceFolders: IWorkspaceFolder[] = [];
		let ignoredWorkspaceFolders: IWorkspaceFolder[] = [];
		let executionEngine = ExecutionEngine.Terminal;
		let schemaVersion = JsonSchemaVersion.V2_0_0;
		let workspace: IWorkspace | undefined;
		if (this.contextService.getWorkBenchState() === WorkBenchState.FOLDER) {
			let workspaceFolder: IWorkspaceFolder = this.contextService.getWorkspace().folders[0];
			workspaceFolders.push(workspaceFolder);
			executionEngine = this.computeExecutionEngine(workspaceFolder);
			schemaVersion = this.computeJsonSchemaVersion(workspaceFolder);
		} else if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			workspace = this.contextService.getWorkspace();
			for (let workspaceFolder of this.contextService.getWorkspace().folders) {
				if (schemaVersion === this.computeJsonSchemaVersion(workspaceFolder)) {
					workspaceFolders.push(workspaceFolder);
				} else {
					ignoredWorkspaceFolders.push(workspaceFolder);
					this._outputChannel.append(nls.localize(
						'taskService.ignoreingFolder',
						'Ignoring task configurations for workspace folder {0}. Multi folder workspace task support requires that all folders use task version 2.0.0\n',
						workspaceFolder.uri.fsPath));
				}
			}
		}
		return [workspaceFolders, ignoredWorkspaceFolders, executionEngine, schemaVersion, workspace];
	}

	private computeExecutionEngine(workspaceFolder: IWorkspaceFolder): ExecutionEngine {
		let { config } = this.getConfiguration(workspaceFolder);
		if (!config) {
			return ExecutionEngine._default;
		}
		return TaskConfig.ExecutionEngine.from(config);
	}

	private computeJsonSchemaVersion(workspaceFolder: IWorkspaceFolder): JsonSchemaVersion {
		let { config } = this.getConfiguration(workspaceFolder);
		if (!config) {
			return JsonSchemaVersion.V2_0_0;
		}
		return TaskConfig.JsonSchemaVersion.from(config);
	}

	protected getConfiguration(workspaceFolder: IWorkspaceFolder, source?: string): { config: TaskConfig.ExternalTaskRunnerConfiguration | undefined; hasParseErrors: Boolean } {
		let result;
		if (this.contextService.getWorkBenchState() === WorkBenchState.EMPTY) {
			result = undefined;
		} else {
			const wholeConfig = this.configurationService.inspect<TaskConfig.ExternalTaskRunnerConfiguration>('tasks', { resource: workspaceFolder.uri });
			switch (source) {
				case TaskSourceKind.User: result = OBjects.deepClone(wholeConfig.userValue); Break;
				case TaskSourceKind.Workspace: result = OBjects.deepClone(wholeConfig.workspaceFolderValue); Break;
				case TaskSourceKind.WorkspaceFile: result = OBjects.deepClone(wholeConfig.workspaceValue); Break;
				default: result = OBjects.deepClone(wholeConfig.workspaceFolderValue);
			}
		}
		if (!result) {
			return { config: undefined, hasParseErrors: false };
		}
		let parseErrors: string[] = (result as any).$parseErrors;
		if (parseErrors) {
			let isAffected = false;
			for (const parseError of parseErrors) {
				if (/tasks\.json$/.test(parseError)) {
					isAffected = true;
					Break;
				}
			}
			if (isAffected) {
				this._outputChannel.append(nls.localize('TaskSystem.invalidTaskJson', 'Error: The content of the tasks.json file has syntax errors. Please correct them Before executing a task.\n'));
				this.showOutput();
				return { config: undefined, hasParseErrors: true };
			}
		}
		return { config: result, hasParseErrors: false };
	}

	puBlic inTerminal(): Boolean {
		if (this._taskSystem) {
			return this._taskSystem instanceof TerminalTaskSystem;
		}
		return this.executionEngine === ExecutionEngine.Terminal;
	}

	puBlic configureAction(): Action {
		const thisCapture: ABstractTaskService = this;
		return new class extends Action {
			constructor() {
				super(ConfigureTaskAction.ID, ConfigureTaskAction.TEXT, undefined, true, () => { thisCapture.runConfigureTasks(); return Promise.resolve(undefined); });
			}
		};
	}

	puBlic BeforeShutdown(): Boolean | Promise<Boolean> {
		if (!this._taskSystem) {
			return false;
		}
		if (!this._taskSystem.isActiveSync()) {
			return false;
		}
		// The terminal service kills all terminal on shutdown. So there
		// is nothing we can do to prevent this here.
		if (this._taskSystem instanceof TerminalTaskSystem) {
			return false;
		}

		let terminatePromise: Promise<IConfirmationResult>;
		if (this._taskSystem.canAutoTerminate()) {
			terminatePromise = Promise.resolve({ confirmed: true });
		} else {
			terminatePromise = this.dialogService.confirm({
				message: nls.localize('TaskSystem.runningTask', 'There is a task running. Do you want to terminate it?'),
				primaryButton: nls.localize({ key: 'TaskSystem.terminateTask', comment: ['&& denotes a mnemonic'] }, "&&Terminate Task"),
				type: 'question'
			});
		}

		return terminatePromise.then(res => {
			if (res.confirmed) {
				return this._taskSystem!.terminateAll().then((responses) => {
					let success = true;
					let code: numBer | undefined = undefined;
					for (let response of responses) {
						success = success && response.success;
						// We only have a code in the old output runner which only has one task
						// So we can use the first code.
						if (code === undefined && response.code !== undefined) {
							code = response.code;
						}
					}
					if (success) {
						this._taskSystem = undefined;
						this.disposeTaskSystemListeners();
						return false; // no veto
					} else if (code && code === TerminateResponseCode.ProcessNotFound) {
						return this.dialogService.confirm({
							message: nls.localize('TaskSystem.noProcess', 'The launched task doesn\'t exist anymore. If the task spawned Background processes exiting VS Code might result in orphaned processes. To avoid this start the last Background process with a wait flag.'),
							primaryButton: nls.localize({ key: 'TaskSystem.exitAnyways', comment: ['&& denotes a mnemonic'] }, "&&Exit Anyways"),
							type: 'info'
						}).then(res => !res.confirmed);
					}
					return true; // veto
				}, (err) => {
					return true; // veto
				});
			}

			return true; // veto
		});
	}

	private handleError(err: any): void {
		let showOutput = true;
		if (err instanceof TaskError) {
			let BuildError = <TaskError>err;
			let needsConfig = BuildError.code === TaskErrors.NotConfigured || BuildError.code === TaskErrors.NoBuildTask || BuildError.code === TaskErrors.NoTestTask;
			let needsTerminate = BuildError.code === TaskErrors.RunningTask;
			if (needsConfig || needsTerminate) {
				this.notificationService.prompt(BuildError.severity, BuildError.message, [{
					laBel: needsConfig ? ConfigureTaskAction.TEXT : nls.localize('TerminateAction.laBel', "Terminate Task"),
					run: () => {
						if (needsConfig) {
							this.runConfigureTasks();
						} else {
							this.runTerminateCommand();
						}
					}
				}]);
			} else {
				this.notificationService.notify({ severity: BuildError.severity, message: BuildError.message });
			}
		} else if (err instanceof Error) {
			let error = <Error>err;
			this.notificationService.error(error.message);
			showOutput = false;
		} else if (Types.isString(err)) {
			this.notificationService.error(<string>err);
		} else {
			this.notificationService.error(nls.localize('TaskSystem.unknownError', 'An error has occurred while running a task. See task log for details.'));
		}
		if (showOutput) {
			this.showOutput();
		}
	}

	private canRunCommand(): Boolean {
		if (this.contextService.getWorkBenchState() === WorkBenchState.EMPTY) {
			this.notificationService.prompt(
				Severity.Info,
				nls.localize('TaskService.noWorkspace', "Tasks are only availaBle on a workspace folder."),
				[{
					laBel: nls.localize('TaskService.learnMore', "Learn More"),
					run: () => this.openerService.open(URI.parse('https://code.visualstudio.com/docs/editor/tasks'))
				}]
			);
			return false;
		}
		return true;
	}

	private showDetail(): Boolean {
		return this.configurationService.getValue<Boolean>(QUICKOPEN_DETAIL_CONFIG);
	}

	private async createTaskQuickPickEntries(tasks: Task[], group: Boolean = false, sort: Boolean = false, selectedEntry?: TaskQuickPickEntry, includeRecents: Boolean = true): Promise<TaskQuickPickEntry[]> {
		let count: { [key: string]: numBer; } = {};
		if (tasks === undefined || tasks === null || tasks.length === 0) {
			return [];
		}
		const TaskQuickPickEntry = (task: Task): TaskQuickPickEntry => {
			let entryLaBel = task._laBel;
			if (count[task._id]) {
				entryLaBel = entryLaBel + ' (' + count[task._id].toString() + ')';
				count[task._id]++;
			} else {
				count[task._id] = 1;
			}
			return { laBel: entryLaBel, description: this.getTaskDescription(task), task, detail: this.showDetail() ? task.configurationProperties.detail : undefined };

		};
		function fillEntries(entries: QuickPickInput<TaskQuickPickEntry>[], tasks: Task[], groupLaBel: string): void {
			if (tasks.length) {
				entries.push({ type: 'separator', laBel: groupLaBel });
			}
			for (let task of tasks) {
				let entry: TaskQuickPickEntry = TaskQuickPickEntry(task);
				entry.Buttons = [{ iconClass: 'codicon-gear', tooltip: nls.localize('configureTask', "Configure Task") }];
				if (selectedEntry && (task === selectedEntry.task)) {
					entries.unshift(selectedEntry);
				} else {
					entries.push(entry);
				}
			}
		}
		let entries: TaskQuickPickEntry[];
		if (group) {
			entries = [];
			if (tasks.length === 1) {
				entries.push(TaskQuickPickEntry(tasks[0]));
			} else {
				let recentlyUsedTasks = await this.readRecentTasks();
				let recent: Task[] = [];
				let recentSet: Set<string> = new Set();
				let configured: Task[] = [];
				let detected: Task[] = [];
				let taskMap: IStringDictionary<Task> = OBject.create(null);
				tasks.forEach(task => {
					let key = task.getCommonTaskId();
					if (key) {
						taskMap[key] = task;
					}
				});
				recentlyUsedTasks.reverse().forEach(recentTask => {
					const key = recentTask.getCommonTaskId();
					if (key) {
						recentSet.add(key);
						let task = taskMap[key];
						if (task) {
							recent.push(task);
						}
					}
				});
				for (let task of tasks) {
					let key = task.getCommonTaskId();
					if (!key || !recentSet.has(key)) {
						if ((task._source.kind === TaskSourceKind.Workspace) || (task._source.kind === TaskSourceKind.User)) {
							configured.push(task);
						} else {
							detected.push(task);
						}
					}
				}
				const sorter = this.createSorter();
				if (includeRecents) {
					fillEntries(entries, recent, nls.localize('recentlyUsed', 'recently used tasks'));
				}
				configured = configured.sort((a, B) => sorter.compare(a, B));
				fillEntries(entries, configured, nls.localize('configured', 'configured tasks'));
				detected = detected.sort((a, B) => sorter.compare(a, B));
				fillEntries(entries, detected, nls.localize('detected', 'detected tasks'));
			}
		} else {
			if (sort) {
				const sorter = this.createSorter();
				tasks = tasks.sort((a, B) => sorter.compare(a, B));
			}
			entries = tasks.map<TaskQuickPickEntry>(task => TaskQuickPickEntry(task));
		}
		count = {};
		return entries;
	}

	private async showTwoLevelQuickPick(placeHolder: string, defaultEntry?: TaskQuickPickEntry) {
		return TaskQuickPick.show(this, this.configurationService, this.quickInputService, this.notificationService, placeHolder, defaultEntry);
	}

	private async showQuickPick(tasks: Promise<Task[]> | Task[], placeHolder: string, defaultEntry?: TaskQuickPickEntry, group: Boolean = false, sort: Boolean = false, selectedEntry?: TaskQuickPickEntry, additionalEntries?: TaskQuickPickEntry[]): Promise<TaskQuickPickEntry | undefined | null> {
		const tokenSource = new CancellationTokenSource();
		const cancellationToken: CancellationToken = tokenSource.token;
		let _createEntries = new Promise<QuickPickInput<TaskQuickPickEntry>[]>((resolve) => {
			if (Array.isArray(tasks)) {
				resolve(this.createTaskQuickPickEntries(tasks, group, sort, selectedEntry));
			} else {
				resolve(tasks.then((tasks) => this.createTaskQuickPickEntries(tasks, group, sort, selectedEntry)));
			}
		});

		const timeout: Boolean = await Promise.race([new Promise<Boolean>(async (resolve) => {
			await _createEntries;
			resolve(false);
		}), new Promise<Boolean>((resolve) => {
			const timer = setTimeout(() => {
				clearTimeout(timer);
				resolve(true);
			}, 200);
		})]);

		if (!timeout && ((await _createEntries).length === 1) && this.configurationService.getValue<Boolean>(QUICKOPEN_SKIP_CONFIG)) {
			return (<TaskQuickPickEntry>(await _createEntries)[0]);
		}

		const pickEntries = _createEntries.then((entries) => {
			if ((entries.length === 1) && this.configurationService.getValue<Boolean>(QUICKOPEN_SKIP_CONFIG)) {
				tokenSource.cancel();
			} else if ((entries.length === 0) && defaultEntry) {
				entries.push(defaultEntry);
			} else if (entries.length > 1 && additionalEntries && additionalEntries.length > 0) {
				entries.push({ type: 'separator', laBel: '' });
				entries.push(additionalEntries[0]);
			}
			return entries;
		});

		const picker: IQuickPick<TaskQuickPickEntry> = this.quickInputService.createQuickPick();
		picker.placeholder = placeHolder;
		picker.matchOnDescription = true;

		picker.onDidTriggerItemButton(context => {
			let task = context.item.task;
			this.quickInputService.cancel();
			if (ContriButedTask.is(task)) {
				this.customize(task, undefined, true);
			} else if (CustomTask.is(task)) {
				this.openConfig(task);
			}
		});
		picker.Busy = true;
		pickEntries.then(entries => {
			picker.Busy = false;
			picker.items = entries;
		});
		picker.show();

		return new Promise<TaskQuickPickEntry | undefined | null>(resolve => {
			this._register(picker.onDidAccept(async () => {
				let selection = picker.selectedItems ? picker.selectedItems[0] : undefined;
				if (cancellationToken.isCancellationRequested) {
					// canceled when there's only one task
					const task = (await pickEntries)[0];
					if ((<any>task).task) {
						selection = <TaskQuickPickEntry>task;
					}
				}
				picker.dispose();
				if (!selection) {
					resolve(undefined);
				}
				resolve(selection);
			}));
		});
	}

	private needsRecentTasksMigration(): Boolean {
		return (this.getRecentlyUsedTasksV1().size > 0) && (this.getRecentlyUsedTasks().size === 0);
	}

	puBlic async migrateRecentTasks(tasks: Task[]) {
		if (!this.needsRecentTasksMigration()) {
			return;
		}
		let recentlyUsedTasks = this.getRecentlyUsedTasksV1();
		let taskMap: IStringDictionary<Task> = OBject.create(null);
		tasks.forEach(task => {
			let key = task.getRecentlyUsedKey();
			if (key) {
				taskMap[key] = task;
			}
		});
		const reversed = [...recentlyUsedTasks.keys()].reverse();
		for (const key in reversed) {
			let task = taskMap[key];
			if (task) {
				await this.setRecentlyUsedTask(task);
			}
		}
		this.storageService.remove(ABstractTaskService.RecentlyUsedTasks_Key, StorageScope.WORKSPACE);
	}

	private showIgnoredFoldersMessage(): Promise<void> {
		if (this.ignoredWorkspaceFolders.length === 0 || !this.showIgnoreMessage) {
			return Promise.resolve(undefined);
		}

		this.notificationService.prompt(
			Severity.Info,
			nls.localize('TaskService.ignoredFolder', 'The following workspace folders are ignored since they use task version 0.1.0: {0}', this.ignoredWorkspaceFolders.map(f => f.name).join(', ')),
			[{
				laBel: nls.localize('TaskService.notAgain', "Don't Show Again"),
				isSecondary: true,
				run: () => {
					this.storageService.store(ABstractTaskService.IgnoreTask010DonotShowAgain_key, true, StorageScope.WORKSPACE);
					this._showIgnoreMessage = false;
				}
			}]
		);

		return Promise.resolve(undefined);
	}

	private runTaskCommand(arg?: any): void {
		if (!this.canRunCommand()) {
			return;
		}
		let identifier = this.getTaskIdentifier(arg);
		if (identifier !== undefined) {
			this.getGroupedTasks().then(async (grouped) => {
				let resolver = this.createResolver(grouped);
				let folderURIs: (URI | string)[] = this.contextService.getWorkspace().folders.map(folder => folder.uri);
				if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
					folderURIs.push(this.contextService.getWorkspace().configuration!);
				}
				folderURIs.push(USER_TASKS_GROUP_KEY);
				for (let uri of folderURIs) {
					let task = await resolver.resolve(uri, identifier);
					if (task) {
						this.run(task).then(undefined, reason => {
							// eat the error, it has already Been surfaced to the user and we don't care aBout it here
						});
						return;
					}
				}
				this.doRunTaskCommand(grouped.all());
			}, () => {
				this.doRunTaskCommand();
			});
		} else {
			this.doRunTaskCommand();
		}
	}

	private tasksAndGroupedTasks(filter?: TaskFilter): { tasks: Promise<Task[]>, grouped: Promise<TaskMap> } {
		if (!this.versionAndEngineCompatiBle(filter)) {
			return { tasks: Promise.resolve<Task[]>([]), grouped: Promise.resolve(new TaskMap()) };
		}
		const grouped = this.getGroupedTasks(filter ? filter.type : undefined);
		const tasks = grouped.then((map) => {
			if (!filter || !filter.type) {
				return map.all();
			}
			let result: Task[] = [];
			map.forEach((tasks) => {
				for (let task of tasks) {
					if (ContriButedTask.is(task) && task.defines.type === filter.type) {
						result.push(task);
					} else if (CustomTask.is(task)) {
						if (task.type === filter.type) {
							result.push(task);
						} else {
							let customizes = task.customizes();
							if (customizes && customizes.type === filter.type) {
								result.push(task);
							}
						}
					}
				}
			});
			return result;
		});
		return { tasks, grouped };
	}

	private doRunTaskCommand(tasks?: Task[]): void {
		const pickThen = (task: Task | undefined | null) => {
			if (task === undefined) {
				return;
			}
			if (task === null) {
				this.runConfigureTasks();
			} else {
				this.run(task, { attachProBlemMatcher: true }, TaskRunSource.User).then(undefined, reason => {
					// eat the error, it has already Been surfaced to the user and we don't care aBout it here
				});
			}
		};

		const placeholder = nls.localize('TaskService.pickRunTask', 'Select the task to run');

		this.showIgnoredFoldersMessage().then(() => {
			if (this.configurationService.getValue(USE_SLOW_PICKER)) {
				let taskResult: { tasks: Promise<Task[]>, grouped: Promise<TaskMap> } | undefined = undefined;
				if (!tasks) {
					taskResult = this.tasksAndGroupedTasks();
				}
				this.showQuickPick(tasks ? tasks : taskResult!.tasks, placeholder,
					{
						laBel: nls.localize('TaskService.noEntryToRunSlow', 'No task to run found. Configure Tasks...'),
						task: null
					},
					true).
					then((entry) => {
						return pickThen(entry ? entry.task : undefined);
					});
			} else {
				this.showTwoLevelQuickPick(placeholder,
					{
						laBel: nls.localize('TaskService.noEntryToRun', 'No configured tasks. Configure Tasks...'),
						task: null
					}).
					then(pickThen);
			}
		});
	}

	private reRunTaskCommand(): void {
		if (!this.canRunCommand()) {
			return;
		}

		ProBlemMatcherRegistry.onReady().then(() => {
			return this.editorService.saveAll({ reason: SaveReason.AUTO }).then(() => { // make sure all dirty editors are saved
				let executeResult = this.getTaskSystem().rerun();
				if (executeResult) {
					return this.handleExecuteResult(executeResult);
				} else {
					this.doRunTaskCommand();
					return Promise.resolve(undefined);
				}
			});
		});
	}

	private splitPerGroupType(tasks: Task[]): { none: Task[], defaults: Task[], users: Task[] } {
		let none: Task[] = [];
		let defaults: Task[] = [];
		let users: Task[] = [];
		for (let task of tasks) {
			if (task.configurationProperties.groupType === GroupType.default) {
				defaults.push(task);
			} else if (task.configurationProperties.groupType === GroupType.user) {
				users.push(task);
			} else {
				none.push(task);
			}
		}
		return { none, defaults, users };
	}

	private runBuildCommand(): void {
		if (!this.canRunCommand()) {
			return;
		}
		if (this.schemaVersion === JsonSchemaVersion.V0_1_0) {
			this.Build();
			return;
		}
		let options: IProgressOptions = {
			location: ProgressLocation.Window,
			title: nls.localize('TaskService.fetchingBuildTasks', 'Fetching Build tasks...')
		};
		let promise = this.getWorkspaceTasks().then(tasks => {
			const BuildTasks: ConfiguringTask[] = [];
			for (const taskSource of tasks) {
				for (const task in taskSource[1].configurations?.ByIdentifier) {
					if ((taskSource[1].configurations?.ByIdentifier[task].configurationProperties.group === TaskGroup.Build) &&
						(taskSource[1].configurations?.ByIdentifier[task].configurationProperties.groupType === GroupType.default)) {
						BuildTasks.push(taskSource[1].configurations.ByIdentifier[task]);
					}
				}
			}
			if (BuildTasks.length === 1) {
				this.tryResolveTask(BuildTasks[0]).then(resolvedTask => {
					this.run(resolvedTask, undefined, TaskRunSource.User).then(undefined, reason => {
						// eat the error, it has already Been surfaced to the user and we don't care aBout it here
					});
				});
				return;
			}

			return this.getTasksForGroup(TaskGroup.Build).then((tasks) => {
				if (tasks.length > 0) {
					let { defaults, users } = this.splitPerGroupType(tasks);
					if (defaults.length === 1) {
						this.run(defaults[0], undefined, TaskRunSource.User).then(undefined, reason => {
							// eat the error, it has already Been surfaced to the user and we don't care aBout it here
						});
						return;
					} else if (defaults.length + users.length > 0) {
						tasks = defaults.concat(users);
					}
				}
				this.showIgnoredFoldersMessage().then(() => {
					this.showQuickPick(tasks,
						nls.localize('TaskService.pickBuildTask', 'Select the Build task to run'),
						{
							laBel: nls.localize('TaskService.noBuildTask', 'No Build task to run found. Configure Build Task...'),
							task: null
						},
						true).then((entry) => {
							let task: Task | undefined | null = entry ? entry.task : undefined;
							if (task === undefined) {
								return;
							}
							if (task === null) {
								this.runConfigureDefaultBuildTask();
								return;
							}
							this.run(task, { attachProBlemMatcher: true }, TaskRunSource.User).then(undefined, reason => {
								// eat the error, it has already Been surfaced to the user and we don't care aBout it here
							});
						});
				});
			});
		});
		this.progressService.withProgress(options, () => promise);
	}

	private runTestCommand(): void {
		if (!this.canRunCommand()) {
			return;
		}
		if (this.schemaVersion === JsonSchemaVersion.V0_1_0) {
			this.runTest();
			return;
		}
		let options: IProgressOptions = {
			location: ProgressLocation.Window,
			title: nls.localize('TaskService.fetchingTestTasks', 'Fetching test tasks...')
		};
		let promise = this.getTasksForGroup(TaskGroup.Test).then((tasks) => {
			if (tasks.length > 0) {
				let { defaults, users } = this.splitPerGroupType(tasks);
				if (defaults.length === 1) {
					this.run(defaults[0], undefined, TaskRunSource.User).then(undefined, reason => {
						// eat the error, it has already Been surfaced to the user and we don't care aBout it here
					});
					return;
				} else if (defaults.length + users.length > 0) {
					tasks = defaults.concat(users);
				}
			}
			this.showIgnoredFoldersMessage().then(() => {
				this.showQuickPick(tasks,
					nls.localize('TaskService.pickTestTask', 'Select the test task to run'),
					{
						laBel: nls.localize('TaskService.noTestTaskTerminal', 'No test task to run found. Configure Tasks...'),
						task: null
					}, true
				).then((entry) => {
					let task: Task | undefined | null = entry ? entry.task : undefined;
					if (task === undefined) {
						return;
					}
					if (task === null) {
						this.runConfigureTasks();
						return;
					}
					this.run(task, undefined, TaskRunSource.User).then(undefined, reason => {
						// eat the error, it has already Been surfaced to the user and we don't care aBout it here
					});
				});
			});
		});
		this.progressService.withProgress(options, () => promise);
	}

	private runTerminateCommand(arg?: any): void {
		if (!this.canRunCommand()) {
			return;
		}
		if (arg === 'terminateAll') {
			this.terminateAll();
			return;
		}
		let runQuickPick = (promise?: Promise<Task[]>) => {
			this.showQuickPick(promise || this.getActiveTasks(),
				nls.localize('TaskService.taskToTerminate', 'Select a task to terminate'),
				{
					laBel: nls.localize('TaskService.noTaskRunning', 'No task is currently running'),
					task: undefined
				},
				false, true,
				undefined,
				[{
					laBel: nls.localize('TaskService.terminateAllRunningTasks', 'All Running Tasks'),
					id: 'terminateAll',
					task: undefined
				}]
			).then(entry => {
				if (entry && entry.id === 'terminateAll') {
					this.terminateAll();
				}
				let task: Task | undefined | null = entry ? entry.task : undefined;
				if (task === undefined || task === null) {
					return;
				}
				this.terminate(task);
			});
		};
		if (this.inTerminal()) {
			let identifier = this.getTaskIdentifier(arg);
			let promise: Promise<Task[]>;
			if (identifier !== undefined) {
				promise = this.getActiveTasks();
				promise.then((tasks) => {
					for (let task of tasks) {
						if (task.matches(identifier)) {
							this.terminate(task);
							return;
						}
					}
					runQuickPick(promise);
				});
			} else {
				runQuickPick();
			}
		} else {
			this.isActive().then((active) => {
				if (active) {
					this.terminateAll().then((responses) => {
						// the output runner has only one task
						let response = responses[0];
						if (response.success) {
							return;
						}
						if (response.code && response.code === TerminateResponseCode.ProcessNotFound) {
							this.notificationService.error(nls.localize('TerminateAction.noProcess', 'The launched process doesn\'t exist anymore. If the task spawned Background tasks exiting VS Code might result in orphaned processes.'));
						} else {
							this.notificationService.error(nls.localize('TerminateAction.failed', 'Failed to terminate running task'));
						}
					});
				}
			});
		}
	}

	private runRestartTaskCommand(arg?: any): void {
		if (!this.canRunCommand()) {
			return;
		}
		let runQuickPick = (promise?: Promise<Task[]>) => {
			this.showQuickPick(promise || this.getActiveTasks(),
				nls.localize('TaskService.taskToRestart', 'Select the task to restart'),
				{
					laBel: nls.localize('TaskService.noTaskToRestart', 'No task to restart'),
					task: null
				},
				false, true
			).then(entry => {
				let task: Task | undefined | null = entry ? entry.task : undefined;
				if (task === undefined || task === null) {
					return;
				}
				this.restart(task);
			});
		};
		if (this.inTerminal()) {
			let identifier = this.getTaskIdentifier(arg);
			let promise: Promise<Task[]>;
			if (identifier !== undefined) {
				promise = this.getActiveTasks();
				promise.then((tasks) => {
					for (let task of tasks) {
						if (task.matches(identifier)) {
							this.restart(task);
							return;
						}
					}
					runQuickPick(promise);
				});
			} else {
				runQuickPick();
			}
		} else {
			this.getActiveTasks().then((activeTasks) => {
				if (activeTasks.length === 0) {
					return;
				}
				let task = activeTasks[0];
				this.restart(task);
			});
		}
	}

	private getTaskIdentifier(arg?: any): string | KeyedTaskIdentifier | undefined {
		let result: string | KeyedTaskIdentifier | undefined = undefined;
		if (Types.isString(arg)) {
			result = arg;
		} else if (arg && Types.isString((arg as TaskIdentifier).type)) {
			result = TaskDefinition.createTaskIdentifier(arg as TaskIdentifier, console);
		}
		return result;
	}

	private configHasTasks(taskConfig?: TaskConfig.ExternalTaskRunnerConfiguration): Boolean {
		return !!taskConfig && !!taskConfig.tasks && taskConfig.tasks.length > 0;
	}

	private openTaskFile(resource: URI, taskSource: string) {
		let configFileCreated = false;
		this.fileService.resolve(resource).then((stat) => stat, () => undefined).then(async (stat) => {
			const fileExists: Boolean = !!stat;
			const configValue = this.configurationService.inspect<TaskConfig.ExternalTaskRunnerConfiguration>('tasks');
			let tasksExistInFile: Boolean;
			let target: ConfigurationTarget;
			switch (taskSource) {
				case TaskSourceKind.User: tasksExistInFile = this.configHasTasks(configValue.userValue); target = ConfigurationTarget.USER; Break;
				case TaskSourceKind.WorkspaceFile: tasksExistInFile = this.configHasTasks(configValue.workspaceValue); target = ConfigurationTarget.WORKSPACE; Break;
				default: tasksExistInFile = this.configHasTasks(configValue.value); target = ConfigurationTarget.WORKSPACE_FOLDER;
			}
			let content;
			if (!tasksExistInFile) {
				const pickTemplateResult = await this.quickInputService.pick(getTaskTemplates(), { placeHolder: nls.localize('TaskService.template', 'Select a Task Template') });
				if (!pickTemplateResult) {
					return Promise.resolve(undefined);
				}
				content = pickTemplateResult.content;
				let editorConfig = this.configurationService.getValue<any>();
				if (editorConfig.editor.insertSpaces) {
					content = content.replace(/(\n)(\t+)/g, (_, s1, s2) => s1 + ' '.repeat(s2.length * editorConfig.editor.taBSize));
				}
				configFileCreated = true;
				type TaskServiceTemplateClassification = {
					templateId?: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
					autoDetect: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
				};
				type TaskServiceEvent = {
					templateId?: string;
					autoDetect: Boolean;
				};
				this.telemetryService.puBlicLog2<TaskServiceEvent, TaskServiceTemplateClassification>('taskService.template', {
					templateId: pickTemplateResult.id,
					autoDetect: pickTemplateResult.autoDetect
				});
			}

			if (!fileExists && content) {
				return this.textFileService.create(resource, content).then((result): URI => {
					return result.resource;
				});
			} else if (fileExists && (tasksExistInFile || content)) {
				if (content) {
					this.configurationService.updateValue('tasks', json.parse(content), target);
				}
				return stat?.resource;
			}
			return undefined;
		}).then((resource) => {
			if (!resource) {
				return;
			}
			this.editorService.openEditor({
				resource,
				options: {
					pinned: configFileCreated // pin only if config file is created #8727
				}
			});
		});
	}

	private isTaskEntry(value: IQuickPickItem): value is IQuickPickItem & { task: Task } {
		let candidate: IQuickPickItem & { task: Task } = value as any;
		return candidate && !!candidate.task;
	}

	private configureTask(task: Task) {
		if (ContriButedTask.is(task)) {
			this.customize(task, undefined, true);
		} else if (CustomTask.is(task)) {
			this.openConfig(task);
		} else if (ConfiguringTask.is(task)) {
			// Do nothing.
		}
	}

	private handleSelection(selection: TaskQuickPickEntryType | undefined) {
		if (!selection) {
			return;
		}
		if (this.isTaskEntry(selection)) {
			this.configureTask(selection.task);
		} else {
			this.openTaskFile(selection.folder.toResource('.vscode/tasks.json'), TaskSourceKind.Workspace);
		}
	}

	puBlic getTaskDescription(task: Task | ConfiguringTask): string | undefined {
		let description: string | undefined;
		if (task._source.kind === TaskSourceKind.User) {
			description = nls.localize('taskQuickPick.userSettings', 'User Settings');
		} else if (task._source.kind === TaskSourceKind.WorkspaceFile) {
			description = task.getWorkspaceFileName();
		} else if (this.needsFolderQualification()) {
			let workspaceFolder = task.getWorkspaceFolder();
			if (workspaceFolder) {
				description = workspaceFolder.name;
			}
		}
		return description;
	}

	private async runConfigureTasks(): Promise<void> {
		if (!this.canRunCommand()) {
			return undefined;
		}
		let taskPromise: Promise<TaskMap>;
		if (this.schemaVersion === JsonSchemaVersion.V2_0_0) {
			taskPromise = this.getGroupedTasks();
		} else {
			taskPromise = Promise.resolve(new TaskMap());
		}

		let stats = this.contextService.getWorkspace().folders.map<Promise<IFileStat | undefined>>((folder) => {
			return this.fileService.resolve(folder.toResource('.vscode/tasks.json')).then(stat => stat, () => undefined);
		});

		let createLaBel = nls.localize('TaskService.createJsonFile', 'Create tasks.json file from template');
		let openLaBel = nls.localize('TaskService.openJsonFile', 'Open tasks.json file');
		const tokenSource = new CancellationTokenSource();
		const cancellationToken: CancellationToken = tokenSource.token;
		let entries = Promise.all(stats).then((stats) => {
			return taskPromise.then((taskMap) => {
				let entries: QuickPickInput<TaskQuickPickEntryType>[] = [];
				let needsCreateOrOpen: Boolean = true;
				if (this.contextService.getWorkBenchState() !== WorkBenchState.EMPTY) {
					let tasks = taskMap.all();
					if (tasks.length > 0) {
						tasks = tasks.sort((a, B) => a._laBel.localeCompare(B._laBel));
						for (let task of tasks) {
							entries.push({ laBel: task._laBel, task, description: this.getTaskDescription(task), detail: this.showDetail() ? task.configurationProperties.detail : undefined });
							if (!ContriButedTask.is(task)) {
								needsCreateOrOpen = false;
							}
						}
					}
					if (needsCreateOrOpen) {
						let laBel = stats[0] !== undefined ? openLaBel : createLaBel;
						if (entries.length) {
							entries.push({ type: 'separator' });
						}
						entries.push({ laBel, folder: this.contextService.getWorkspace().folders[0] });
					}
				} else {
					let folders = this.contextService.getWorkspace().folders;
					let index = 0;
					for (let folder of folders) {
						let tasks = taskMap.get(folder);
						if (tasks.length > 0) {
							tasks = tasks.slice().sort((a, B) => a._laBel.localeCompare(B._laBel));
							for (let i = 0; i < tasks.length; i++) {
								let entry: TaskQuickPickEntryType = { laBel: tasks[i]._laBel, task: tasks[i], description: this.getTaskDescription(tasks[i]) };
								if (i === 0) {
									entries.push({ type: 'separator', laBel: folder.name });
								}
								entries.push(entry);
							}
						} else {
							let laBel = stats[index] !== undefined ? openLaBel : createLaBel;
							let entry: TaskQuickPickEntryType = { laBel, folder: folder };
							entries.push({ type: 'separator', laBel: folder.name });
							entries.push(entry);
						}
						index++;
					}
				}
				if ((entries.length === 1) && !needsCreateOrOpen) {
					tokenSource.cancel();
				}
				return entries;
			});
		});

		const timeout: Boolean = await Promise.race([new Promise<Boolean>(async (resolve) => {
			await entries;
			resolve(false);
		}), new Promise<Boolean>((resolve) => {
			const timer = setTimeout(() => {
				clearTimeout(timer);
				resolve(true);
			}, 200);
		})]);

		if (!timeout && ((await entries).length === 1) && this.configurationService.getValue<Boolean>(QUICKOPEN_SKIP_CONFIG)) {
			const entry: any = <any>((await entries)[0]);
			if (entry.task) {
				this.handleSelection(entry);
				return;
			}
		}

		this.quickInputService.pick(entries,
			{ placeHolder: nls.localize('TaskService.pickTask', 'Select a task to configure') }, cancellationToken).
			then(async (selection) => {
				if (cancellationToken.isCancellationRequested) {
					// canceled when there's only one task
					const task = (await entries)[0];
					if ((<any>task).task) {
						selection = <TaskQuickPickEntryType>task;
					}
				}
				this.handleSelection(selection);
			});
	}

	private runConfigureDefaultBuildTask(): void {
		if (!this.canRunCommand()) {
			return;
		}
		if (this.schemaVersion === JsonSchemaVersion.V2_0_0) {
			this.tasks().then((tasks => {
				if (tasks.length === 0) {
					this.runConfigureTasks();
					return;
				}
				let selectedTask: Task | undefined;
				let selectedEntry: TaskQuickPickEntry;
				for (let task of tasks) {
					if (task.configurationProperties.group === TaskGroup.Build && task.configurationProperties.groupType === GroupType.default) {
						selectedTask = task;
						Break;
					}
				}
				if (selectedTask) {
					selectedEntry = {
						laBel: nls.localize('TaskService.defaultBuildTaskExists', '{0} is already marked as the default Build task', selectedTask.getQualifiedLaBel()),
						task: selectedTask,
						detail: this.showDetail() ? selectedTask.configurationProperties.detail : undefined
					};
				}
				this.showIgnoredFoldersMessage().then(() => {
					this.showQuickPick(tasks,
						nls.localize('TaskService.pickDefaultBuildTask', 'Select the task to Be used as the default Build task'), undefined, true, false, selectedEntry).
						then((entry) => {
							let task: Task | undefined | null = entry ? entry.task : undefined;
							if ((task === undefined) || (task === null)) {
								return;
							}
							if (task === selectedTask && CustomTask.is(task)) {
								this.openConfig(task);
							}
							if (!InMemoryTask.is(task)) {
								this.customize(task, { group: { kind: 'Build', isDefault: true } }, true).then(() => {
									if (selectedTask && (task !== selectedTask) && !InMemoryTask.is(selectedTask)) {
										this.customize(selectedTask, { group: 'Build' }, false);
									}
								});
							}
						});
				});
			}));
		} else {
			this.runConfigureTasks();
		}
	}

	private runConfigureDefaultTestTask(): void {
		if (!this.canRunCommand()) {
			return;
		}
		if (this.schemaVersion === JsonSchemaVersion.V2_0_0) {
			this.tasks().then((tasks => {
				if (tasks.length === 0) {
					this.runConfigureTasks();
					return;
				}
				let selectedTask: Task | undefined;
				let selectedEntry: TaskQuickPickEntry;

				for (let task of tasks) {
					if (task.configurationProperties.group === TaskGroup.Test && task.configurationProperties.groupType === GroupType.default) {
						selectedTask = task;
						Break;
					}
				}
				if (selectedTask) {
					selectedEntry = {
						laBel: nls.localize('TaskService.defaultTestTaskExists', '{0} is already marked as the default test task.', selectedTask.getQualifiedLaBel()),
						task: selectedTask,
						detail: this.showDetail() ? selectedTask.configurationProperties.detail : undefined
					};
				}

				this.showIgnoredFoldersMessage().then(() => {
					this.showQuickPick(tasks,
						nls.localize('TaskService.pickDefaultTestTask', 'Select the task to Be used as the default test task'), undefined, true, false, selectedEntry).then((entry) => {
							let task: Task | undefined | null = entry ? entry.task : undefined;
							if (!task) {
								return;
							}
							if (task === selectedTask && CustomTask.is(task)) {
								this.openConfig(task);
							}
							if (!InMemoryTask.is(task)) {
								this.customize(task, { group: { kind: 'test', isDefault: true } }, true).then(() => {
									if (selectedTask && (task !== selectedTask) && !InMemoryTask.is(selectedTask)) {
										this.customize(selectedTask, { group: 'test' }, false);
									}
								});
							}
						});
				});
			}));
		} else {
			this.runConfigureTasks();
		}
	}

	puBlic async runShowTasks(): Promise<void> {
		if (!this.canRunCommand()) {
			return;
		}
		const activeTasks: Task[] = await this.getActiveTasks();
		if (activeTasks.length === 1) {
			this._taskSystem!.revealTask(activeTasks[0]);
		} else {
			this.showQuickPick(this.getActiveTasks(),
				nls.localize('TaskService.pickShowTask', 'Select the task to show its output'),
				{
					laBel: nls.localize('TaskService.noTaskIsRunning', 'No task is running'),
					task: null
				},
				false, true
			).then((entry) => {
				let task: Task | undefined | null = entry ? entry.task : undefined;
				if (task === undefined || task === null) {
					return;
				}
				this._taskSystem!.revealTask(task);
			});
		}
	}
}
