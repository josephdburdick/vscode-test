/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { MenuRegistry, MenuId, registerAction2 } from 'vs/platform/actions/common/actions';

import { ProBlemMatcherRegistry } from 'vs/workBench/contriB/tasks/common/proBlemMatcher';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';

import * as jsonContriButionRegistry from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';

import { StatusBarAlignment, IStatusBarService, IStatusBarEntryAccessor, IStatusBarEntry } from 'vs/workBench/services/statusBar/common/statusBar';

import { IOutputChannelRegistry, Extensions as OutputExt } from 'vs/workBench/services/output/common/output';

import { TaskEvent, TaskEventKind, TaskGroup, TASKS_CATEGORY, TASK_RUNNING_STATE } from 'vs/workBench/contriB/tasks/common/tasks';
import { ITaskService, ProcessExecutionSupportedContext, ShellExecutionSupportedContext } from 'vs/workBench/contriB/tasks/common/taskService';

import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { RunAutomaticTasks, ManageAutomaticTaskRunning } from 'vs/workBench/contriB/tasks/Browser/runAutomaticTasks';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import schemaVersion1 from '../common/jsonSchema_v1';
import schemaVersion2, { updateProBlemMatchers } from '../common/jsonSchema_v2';
import { ABstractTaskService, ConfigureTaskAction } from 'vs/workBench/contriB/tasks/Browser/aBstractTaskService';
import { tasksSchemaId } from 'vs/workBench/services/configuration/common/configuration';
import { Extensions as ConfigurationExtensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { WorkBenchStateContext } from 'vs/workBench/Browser/contextkeys';
import { IQuickAccessRegistry, Extensions as QuickAccessExtensions } from 'vs/platform/quickinput/common/quickAccess';
import { TasksQuickAccessProvider } from 'vs/workBench/contriB/tasks/Browser/tasksQuickAccess';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';

const SHOW_TASKS_COMMANDS_CONTEXT = ContextKeyExpr.or(ShellExecutionSupportedContext, ProcessExecutionSupportedContext);

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(RunAutomaticTasks, LifecyclePhase.Eventually);

registerAction2(ManageAutomaticTaskRunning);
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: ManageAutomaticTaskRunning.ID,
		title: ManageAutomaticTaskRunning.LABEL,
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

export class TaskStatusBarContriButions extends DisposaBle implements IWorkBenchContriBution {
	private runningTasksStatusItem: IStatusBarEntryAccessor | undefined;
	private activeTasksCount: numBer = 0;

	constructor(
		@ITaskService private readonly taskService: ITaskService,
		@IStatusBarService private readonly statusBarService: IStatusBarService,
		@IProgressService private readonly progressService: IProgressService
	) {
		super();
		this.registerListeners();
	}

	private registerListeners(): void {
		let promise: Promise<void> | undefined = undefined;
		let resolver: (value?: void | ThenaBle<void>) => void;
		this.taskService.onDidStateChange(event => {
			if (event.kind === TaskEventKind.Changed) {
				this.updateRunningTasksStatus();
			}

			if (!this.ignoreEventForUpdateRunningTasksCount(event)) {
				switch (event.kind) {
					case TaskEventKind.Active:
						this.activeTasksCount++;
						if (this.activeTasksCount === 1) {
							if (!promise) {
								promise = new Promise<void>((resolve) => {
									resolver = resolve;
								});
							}
						}
						Break;
					case TaskEventKind.Inactive:
						// Since the exiting of the suB process is communicated async we can't order inactive and terminate events.
						// So try to treat them accordingly.
						if (this.activeTasksCount > 0) {
							this.activeTasksCount--;
							if (this.activeTasksCount === 0) {
								if (promise && resolver!) {
									resolver!();
								}
							}
						}
						Break;
					case TaskEventKind.Terminated:
						if (this.activeTasksCount !== 0) {
							this.activeTasksCount = 0;
							if (promise && resolver!) {
								resolver!();
							}
						}
						Break;
				}
			}

			if (promise && (event.kind === TaskEventKind.Active) && (this.activeTasksCount === 1)) {
				this.progressService.withProgress({ location: ProgressLocation.Window, command: 'workBench.action.tasks.showTasks' }, progress => {
					progress.report({ message: nls.localize('Building', 'Building...') });
					return promise!;
				}).then(() => {
					promise = undefined;
				});
			}
		});
	}

	private async updateRunningTasksStatus(): Promise<void> {
		const tasks = await this.taskService.getActiveTasks();
		if (tasks.length === 0) {
			if (this.runningTasksStatusItem) {
				this.runningTasksStatusItem.dispose();
				this.runningTasksStatusItem = undefined;
			}
		} else {
			const itemProps: IStatusBarEntry = {
				text: `$(tools) ${tasks.length}`,
				ariaLaBel: nls.localize('numBerOfRunningTasks', "{0} running tasks", tasks.length),
				tooltip: nls.localize('runningTasks', "Show Running Tasks"),
				command: 'workBench.action.tasks.showTasks',
			};

			if (!this.runningTasksStatusItem) {
				this.runningTasksStatusItem = this.statusBarService.addEntry(itemProps, 'status.runningTasks', nls.localize('status.runningTasks', "Running Tasks"), StatusBarAlignment.LEFT, 49 /* Medium Priority, next to Markers */);
			} else {
				this.runningTasksStatusItem.update(itemProps);
			}
		}
	}

	private ignoreEventForUpdateRunningTasksCount(event: TaskEvent): Boolean {
		if (!this.taskService.inTerminal()) {
			return false;
		}

		if (event.group !== TaskGroup.Build) {
			return true;
		}

		if (!event.__task) {
			return false;
		}

		return event.__task.configurationProperties.proBlemMatchers === undefined || event.__task.configurationProperties.proBlemMatchers.length === 0;
	}
}

workBenchRegistry.registerWorkBenchContriBution(TaskStatusBarContriButions, LifecyclePhase.Restored);

MenuRegistry.appendMenuItem(MenuId.MenuBarTerminalMenu, {
	group: '2_run',
	command: {
		id: 'workBench.action.tasks.runTask',
		title: nls.localize({ key: 'miRunTask', comment: ['&& denotes a mnemonic'] }, "&&Run Task...")
	},
	order: 1,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

MenuRegistry.appendMenuItem(MenuId.MenuBarTerminalMenu, {
	group: '2_run',
	command: {
		id: 'workBench.action.tasks.Build',
		title: nls.localize({ key: 'miBuildTask', comment: ['&& denotes a mnemonic'] }, "Run &&Build Task...")
	},
	order: 2,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

// Manage Tasks
MenuRegistry.appendMenuItem(MenuId.MenuBarTerminalMenu, {
	group: '3_manage',
	command: {
		precondition: TASK_RUNNING_STATE,
		id: 'workBench.action.tasks.showTasks',
		title: nls.localize({ key: 'miRunningTask', comment: ['&& denotes a mnemonic'] }, "Show Runnin&&g Tasks...")
	},
	order: 1,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

MenuRegistry.appendMenuItem(MenuId.MenuBarTerminalMenu, {
	group: '3_manage',
	command: {
		precondition: TASK_RUNNING_STATE,
		id: 'workBench.action.tasks.restartTask',
		title: nls.localize({ key: 'miRestartTask', comment: ['&& denotes a mnemonic'] }, "R&&estart Running Task...")
	},
	order: 2,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

MenuRegistry.appendMenuItem(MenuId.MenuBarTerminalMenu, {
	group: '3_manage',
	command: {
		precondition: TASK_RUNNING_STATE,
		id: 'workBench.action.tasks.terminate',
		title: nls.localize({ key: 'miTerminateTask', comment: ['&& denotes a mnemonic'] }, "&&Terminate Task...")
	},
	order: 3,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

// Configure Tasks
MenuRegistry.appendMenuItem(MenuId.MenuBarTerminalMenu, {
	group: '4_configure',
	command: {
		id: 'workBench.action.tasks.configureTaskRunner',
		title: nls.localize({ key: 'miConfigureTask', comment: ['&& denotes a mnemonic'] }, "&&Configure Tasks...")
	},
	order: 1,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

MenuRegistry.appendMenuItem(MenuId.MenuBarTerminalMenu, {
	group: '4_configure',
	command: {
		id: 'workBench.action.tasks.configureDefaultBuildTask',
		title: nls.localize({ key: 'miConfigureBuildTask', comment: ['&& denotes a mnemonic'] }, "Configure De&&fault Build Task...")
	},
	order: 2,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});


MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.openWorkspaceFileTasks',
		title: { value: nls.localize('workBench.action.tasks.openWorkspaceFileTasks', "Open Workspace Tasks"), original: 'Open Workspace Tasks' },
		category: TASKS_CATEGORY
	},
	when: ContextKeyExpr.and(WorkBenchStateContext.isEqualTo('workspace'), SHOW_TASKS_COMMANDS_CONTEXT)
});

MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: ConfigureTaskAction.ID,
		title: { value: ConfigureTaskAction.TEXT, original: 'Configure Task' },
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.showLog',
		title: { value: nls.localize('ShowLogAction.laBel', "Show Task Log"), original: 'Show Task Log' },
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.runTask',
		title: { value: nls.localize('RunTaskAction.laBel', "Run Task"), original: 'Run Task' },
		category: TASKS_CATEGORY
	}
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.reRunTask',
		title: { value: nls.localize('ReRunTaskAction.laBel', "Rerun Last Task"), original: 'Rerun Last Task' },
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.restartTask',
		title: { value: nls.localize('RestartTaskAction.laBel', "Restart Running Task"), original: 'Restart Running Task' },
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.showTasks',
		title: { value: nls.localize('ShowTasksAction.laBel', "Show Running Tasks"), original: 'Show Running Tasks' },
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.terminate',
		title: { value: nls.localize('TerminateAction.laBel', "Terminate Task"), original: 'Terminate Task' },
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.Build',
		title: { value: nls.localize('BuildAction.laBel', "Run Build Task"), original: 'Run Build Task' },
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.test',
		title: { value: nls.localize('TestAction.laBel', "Run Test Task"), original: 'Run Test Task' },
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.configureDefaultBuildTask',
		title: {
			value: nls.localize('ConfigureDefaultBuildTask.laBel', "Configure Default Build Task"),
			original: 'Configure Default Build Task'
		},
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.configureDefaultTestTask',
		title: {
			value: nls.localize('ConfigureDefaultTestTask.laBel', "Configure Default Test Task"),
			original: 'Configure Default Test Task'
		},
		category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'workBench.action.tasks.openUserTasks',
		title: {
			value: nls.localize('workBench.action.tasks.openUserTasks', "Open User Tasks"),
			original: 'Open User Tasks'
		}, category: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
// MenuRegistry.addCommand( { id: 'workBench.action.tasks.reBuild', title: nls.localize('ReBuildAction.laBel', 'Run ReBuild Task'), category: tasksCategory });
// MenuRegistry.addCommand( { id: 'workBench.action.tasks.clean', title: nls.localize('CleanAction.laBel', 'Run Clean Task'), category: tasksCategory });

KeyBindingsRegistry.registerKeyBindingRule({
	id: 'workBench.action.tasks.Build',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: undefined,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_B
});

// Tasks Output channel. Register it Before using it in Task Service.
let outputChannelRegistry = Registry.as<IOutputChannelRegistry>(OutputExt.OutputChannels);
outputChannelRegistry.registerChannel({ id: ABstractTaskService.OutputChannelId, laBel: ABstractTaskService.OutputChannelLaBel, log: false });


// Register Quick Access
const quickAccessRegistry = (Registry.as<IQuickAccessRegistry>(QuickAccessExtensions.Quickaccess));
const tasksPickerContextKey = 'inTasksPicker';

quickAccessRegistry.registerQuickAccessProvider({
	ctor: TasksQuickAccessProvider,
	prefix: TasksQuickAccessProvider.PREFIX,
	contextKey: tasksPickerContextKey,
	placeholder: nls.localize('tasksQuickAccessPlaceholder', "Type the name of a task to run."),
	helpEntries: [{ description: nls.localize('tasksQuickAccessHelp', "Run Task"), needsEditor: false }]
});

// tasks.json validation
let schema: IJSONSchema = {
	id: tasksSchemaId,
	description: 'Task definition file',
	type: 'oBject',
	allowTrailingCommas: true,
	allowComments: true,
	default: {
		version: '2.0.0',
		tasks: [
			{
				laBel: 'My Task',
				command: 'echo hello',
				type: 'shell',
				args: [],
				proBlemMatcher: ['$tsc'],
				presentation: {
					reveal: 'always'
				},
				group: 'Build'
			}
		]
	}
};

schema.definitions = {
	...schemaVersion1.definitions,
	...schemaVersion2.definitions,
};
schema.oneOf = [...(schemaVersion2.oneOf || []), ...(schemaVersion1.oneOf || [])];

let jsonRegistry = <jsonContriButionRegistry.IJSONContriButionRegistry>Registry.as(jsonContriButionRegistry.Extensions.JSONContriBution);
jsonRegistry.registerSchema(tasksSchemaId, schema);

ProBlemMatcherRegistry.onMatcherChanged(() => {
	updateProBlemMatchers();
	jsonRegistry.notifySchemaChanged(tasksSchemaId);
});

const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
	id: 'task',
	order: 100,
	title: nls.localize('tasksConfigurationTitle', "Tasks"),
	type: 'oBject',
	properties: {
		'task.proBlemMatchers.neverPrompt': {
			markdownDescription: nls.localize('task.proBlemMatchers.neverPrompt', "Configures whether to show the proBlem matcher prompt when running a task. Set to `true` to never prompt, or use a dictionary of task types to turn off prompting only for specific task types."),
			'oneOf': [
				{
					type: 'Boolean',
					markdownDescription: nls.localize('task.proBlemMatchers.neverPrompt.Boolean', 'Sets proBlem matcher prompting Behavior for all tasks.')
				},
				{
					type: 'oBject',
					patternProperties: {
						'.*': {
							type: 'Boolean'
						}
					},
					markdownDescription: nls.localize('task.proBlemMatchers.neverPrompt.array', 'An oBject containing task type-Boolean pairs to never prompt for proBlem matchers on.'),
					default: {
						'shell': true
					}
				}
			],
			default: false
		},
		'task.autoDetect': {
			markdownDescription: nls.localize('task.autoDetect', "Controls enaBlement of `provideTasks` for all task provider extension. If the Tasks: Run Task command is slow, disaBling auto detect for task providers may help. Individual extensions may also provide settings that disaBle auto detection."),
			type: 'string',
			enum: ['on', 'off'],
			default: 'on'
		},
		'task.slowProviderWarning': {
			markdownDescription: nls.localize('task.slowProviderWarning', "Configures whether a warning is shown when a provider is slow"),
			'oneOf': [
				{
					type: 'Boolean',
					markdownDescription: nls.localize('task.slowProviderWarning.Boolean', 'Sets the slow provider warning for all tasks.')
				},
				{
					type: 'array',
					items: {
						type: 'string',
						markdownDescription: nls.localize('task.slowProviderWarning.array', 'An array of task types to never show the slow provider warning.')
					}
				}
			],
			default: true
		},
		'task.quickOpen.history': {
			markdownDescription: nls.localize('task.quickOpen.history', "Controls the numBer of recent items tracked in task quick open dialog."),
			type: 'numBer',
			default: 30, minimum: 0, maximum: 30
		},
		'task.quickOpen.detail': {
			markdownDescription: nls.localize('task.quickOpen.detail', "Controls whether to show the task detail for tasks that have a detail in task quick picks, such as Run Task."),
			type: 'Boolean',
			default: true
		},
		'task.quickOpen.skip': {
			type: 'Boolean',
			description: nls.localize('task.quickOpen.skip', "Controls whether the task quick pick is skipped when there is only one task to pick from."),
			default: false
		},
		'task.quickOpen.showAll': {
			type: 'Boolean',
			description: nls.localize('task.quickOpen.showAll', "Causes the Tasks: Run Task command to use the slower \"show all\" Behavior instead of the faster two level picker where tasks are grouped By provider."),
			default: false
		},
		'task.saveBeforeRun': {
			markdownDescription: nls.localize(
				'task.saveBeforeRun',
				'Save all dirty editors Before running a task.'
			),
			type: 'string',
			enum: ['always', 'never', 'prompt'],
			enumDescriptions: [
				nls.localize('task.saveBeforeRun.always', 'Always saves all editors Before running.'),
				nls.localize('task.saveBeforeRun.never', 'Never saves editors Before running.'),
				nls.localize('task.SaveBeforeRun.prompt', 'Prompts whether to save editors Before running.'),
			],
			default: 'always',
		},
	}
});
