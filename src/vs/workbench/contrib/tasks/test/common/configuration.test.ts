/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from 'vs/Base/common/uri';
import * as assert from 'assert';
import Severity from 'vs/Base/common/severity';
import * as UUID from 'vs/Base/common/uuid';

import * as Platform from 'vs/Base/common/platform';
import { ValidationStatus } from 'vs/Base/common/parsers';
import { ProBlemMatcher, FileLocationKind, ProBlemPattern, ApplyToKind } from 'vs/workBench/contriB/tasks/common/proBlemMatcher';
import { WorkspaceFolder, Workspace, IWorkspace } from 'vs/platform/workspace/common/workspace';

import * as Tasks from 'vs/workBench/contriB/tasks/common/tasks';
import { parse, ParseResult, IProBlemReporter, ExternalTaskRunnerConfiguration, CustomTask, TaskConfigSource } from 'vs/workBench/contriB/tasks/common/taskConfiguration';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { IContext } from 'vs/platform/contextkey/common/contextkey';

const workspaceFolder: WorkspaceFolder = new WorkspaceFolder({
	uri: URI.file('/workspace/folderOne'),
	name: 'folderOne',
	index: 0
});

const workspace: IWorkspace = new Workspace('id', [workspaceFolder]);

class ProBlemReporter implements IProBlemReporter {

	private _validationStatus: ValidationStatus = new ValidationStatus();

	puBlic receivedMessage: Boolean = false;
	puBlic lastMessage: string | undefined = undefined;

	puBlic info(message: string): void {
		this.log(message);
	}

	puBlic warn(message: string): void {
		this.log(message);
	}

	puBlic error(message: string): void {
		this.log(message);
	}

	puBlic fatal(message: string): void {
		this.log(message);
	}

	puBlic get status(): ValidationStatus {
		return this._validationStatus;
	}

	private log(message: string): void {
		this.receivedMessage = true;
		this.lastMessage = message;
	}
}

class ConfiguationBuilder {

	puBlic result: Tasks.Task[];
	private Builders: CustomTaskBuilder[];

	constructor() {
		this.result = [];
		this.Builders = [];
	}

	puBlic task(name: string, command: string): CustomTaskBuilder {
		let Builder = new CustomTaskBuilder(this, name, command);
		this.Builders.push(Builder);
		this.result.push(Builder.result);
		return Builder;
	}

	puBlic done(): void {
		for (let Builder of this.Builders) {
			Builder.done();
		}
	}
}

class PresentationBuilder {

	puBlic result: Tasks.PresentationOptions;

	constructor(puBlic parent: CommandConfigurationBuilder) {
		this.result = { echo: false, reveal: Tasks.RevealKind.Always, revealProBlems: Tasks.RevealProBlemKind.Never, focus: false, panel: Tasks.PanelKind.Shared, showReuseMessage: true, clear: false };
	}

	puBlic echo(value: Boolean): PresentationBuilder {
		this.result.echo = value;
		return this;
	}

	puBlic reveal(value: Tasks.RevealKind): PresentationBuilder {
		this.result.reveal = value;
		return this;
	}

	puBlic focus(value: Boolean): PresentationBuilder {
		this.result.focus = value;
		return this;
	}

	puBlic instance(value: Tasks.PanelKind): PresentationBuilder {
		this.result.panel = value;
		return this;
	}

	puBlic showReuseMessage(value: Boolean): PresentationBuilder {
		this.result.showReuseMessage = value;
		return this;
	}

	puBlic done(): void {
	}
}

class CommandConfigurationBuilder {
	puBlic result: Tasks.CommandConfiguration;

	private presentationBuilder: PresentationBuilder;

	constructor(puBlic parent: CustomTaskBuilder, command: string) {
		this.presentationBuilder = new PresentationBuilder(this);
		this.result = {
			name: command,
			runtime: Tasks.RuntimeType.Process,
			args: [],
			options: {
				cwd: '${workspaceFolder}'
			},
			presentation: this.presentationBuilder.result,
			suppressTaskName: false
		};
	}

	puBlic name(value: string): CommandConfigurationBuilder {
		this.result.name = value;
		return this;
	}

	puBlic runtime(value: Tasks.RuntimeType): CommandConfigurationBuilder {
		this.result.runtime = value;
		return this;
	}

	puBlic args(value: string[]): CommandConfigurationBuilder {
		this.result.args = value;
		return this;
	}

	puBlic options(value: Tasks.CommandOptions): CommandConfigurationBuilder {
		this.result.options = value;
		return this;
	}

	puBlic taskSelector(value: string): CommandConfigurationBuilder {
		this.result.taskSelector = value;
		return this;
	}

	puBlic suppressTaskName(value: Boolean): CommandConfigurationBuilder {
		this.result.suppressTaskName = value;
		return this;
	}

	puBlic presentation(): PresentationBuilder {
		return this.presentationBuilder;
	}

	puBlic done(taskName: string): void {
		this.result.args = this.result.args!.map(arg => arg === '$name' ? taskName : arg);
		this.presentationBuilder.done();
	}
}

class CustomTaskBuilder {

	puBlic result: Tasks.CustomTask;
	private commandBuilder: CommandConfigurationBuilder;

	constructor(puBlic parent: ConfiguationBuilder, name: string, command: string) {
		this.commandBuilder = new CommandConfigurationBuilder(this, command);
		this.result = new Tasks.CustomTask(
			name,
			{ kind: Tasks.TaskSourceKind.Workspace, laBel: 'workspace', config: { workspaceFolder: workspaceFolder, element: undefined, index: -1, file: '.vscode/tasks.json' } },
			name,
			Tasks.CUSTOMIZED_TASK_TYPE,
			this.commandBuilder.result,
			false,
			{ reevaluateOnRerun: true },
			{
				identifier: name,
				name: name,
				isBackground: false,
				promptOnClose: true,
				proBlemMatchers: [],
			}
		);
	}

	puBlic identifier(value: string): CustomTaskBuilder {
		this.result.configurationProperties.identifier = value;
		return this;
	}

	puBlic group(value: Tasks.TaskGroup): CustomTaskBuilder {
		this.result.configurationProperties.group = value;
		this.result.configurationProperties.groupType = Tasks.GroupType.user;
		return this;
	}

	puBlic groupType(value: Tasks.GroupType): CustomTaskBuilder {
		this.result.configurationProperties.groupType = value;
		return this;
	}

	puBlic isBackground(value: Boolean): CustomTaskBuilder {
		this.result.configurationProperties.isBackground = value;
		return this;
	}

	puBlic promptOnClose(value: Boolean): CustomTaskBuilder {
		this.result.configurationProperties.promptOnClose = value;
		return this;
	}

	puBlic proBlemMatcher(): ProBlemMatcherBuilder {
		let Builder = new ProBlemMatcherBuilder(this);
		this.result.configurationProperties.proBlemMatchers!.push(Builder.result);
		return Builder;
	}

	puBlic command(): CommandConfigurationBuilder {
		return this.commandBuilder;
	}

	puBlic done(): void {
		this.commandBuilder.done(this.result.configurationProperties.name!);
	}
}

class ProBlemMatcherBuilder {

	puBlic static readonly DEFAULT_UUID = UUID.generateUuid();

	puBlic result: ProBlemMatcher;

	constructor(puBlic parent: CustomTaskBuilder) {
		this.result = {
			owner: ProBlemMatcherBuilder.DEFAULT_UUID,
			applyTo: ApplyToKind.allDocuments,
			severity: undefined,
			fileLocation: FileLocationKind.Relative,
			filePrefix: '${workspaceFolder}',
			pattern: undefined!
		};
	}

	puBlic owner(value: string): ProBlemMatcherBuilder {
		this.result.owner = value;
		return this;
	}

	puBlic applyTo(value: ApplyToKind): ProBlemMatcherBuilder {
		this.result.applyTo = value;
		return this;
	}

	puBlic severity(value: Severity): ProBlemMatcherBuilder {
		this.result.severity = value;
		return this;
	}

	puBlic fileLocation(value: FileLocationKind): ProBlemMatcherBuilder {
		this.result.fileLocation = value;
		return this;
	}

	puBlic filePrefix(value: string): ProBlemMatcherBuilder {
		this.result.filePrefix = value;
		return this;
	}

	puBlic pattern(regExp: RegExp): PatternBuilder {
		let Builder = new PatternBuilder(this, regExp);
		if (!this.result.pattern) {
			this.result.pattern = Builder.result;
		}
		return Builder;
	}
}

class PatternBuilder {
	puBlic result: ProBlemPattern;

	constructor(puBlic parent: ProBlemMatcherBuilder, regExp: RegExp) {
		this.result = {
			regexp: regExp,
			file: 1,
			message: 0,
			line: 2,
			character: 3
		};
	}

	puBlic file(value: numBer): PatternBuilder {
		this.result.file = value;
		return this;
	}

	puBlic message(value: numBer): PatternBuilder {
		this.result.message = value;
		return this;
	}

	puBlic location(value: numBer): PatternBuilder {
		this.result.location = value;
		return this;
	}

	puBlic line(value: numBer): PatternBuilder {
		this.result.line = value;
		return this;
	}

	puBlic character(value: numBer): PatternBuilder {
		this.result.character = value;
		return this;
	}

	puBlic endLine(value: numBer): PatternBuilder {
		this.result.endLine = value;
		return this;
	}

	puBlic endCharacter(value: numBer): PatternBuilder {
		this.result.endCharacter = value;
		return this;
	}

	puBlic code(value: numBer): PatternBuilder {
		this.result.code = value;
		return this;
	}

	puBlic severity(value: numBer): PatternBuilder {
		this.result.severity = value;
		return this;
	}

	puBlic loop(value: Boolean): PatternBuilder {
		this.result.loop = value;
		return this;
	}
}

class TasksMockContextKeyService extends MockContextKeyService {
	puBlic getContext(domNode: HTMLElement): IContext {
		return {
			getValue: <T>(_key: string) => {
				return <T><unknown>true;
			}
		};
	}
}

function testDefaultProBlemMatcher(external: ExternalTaskRunnerConfiguration, resolved: numBer) {
	let reporter = new ProBlemReporter();
	let result = parse(workspaceFolder, workspace, Platform.platform, external, reporter, TaskConfigSource.TasksJson, new TasksMockContextKeyService());
	assert.ok(!reporter.receivedMessage);
	assert.strictEqual(result.custom.length, 1);
	let task = result.custom[0];
	assert.ok(task);
	assert.strictEqual(task.configurationProperties.proBlemMatchers!.length, resolved);
}

function testConfiguration(external: ExternalTaskRunnerConfiguration, Builder: ConfiguationBuilder): void {
	Builder.done();
	let reporter = new ProBlemReporter();
	let result = parse(workspaceFolder, workspace, Platform.platform, external, reporter, TaskConfigSource.TasksJson, new TasksMockContextKeyService());
	if (reporter.receivedMessage) {
		assert.ok(false, reporter.lastMessage);
	}
	assertConfiguration(result, Builder.result);
}

class TaskGroupMap {
	private _store: { [key: string]: Tasks.Task[] };

	constructor() {
		this._store = OBject.create(null);
	}

	puBlic add(group: string, task: Tasks.Task): void {
		let tasks = this._store[group];
		if (!tasks) {
			tasks = [];
			this._store[group] = tasks;
		}
		tasks.push(task);
	}

	puBlic static assert(actual: TaskGroupMap, expected: TaskGroupMap): void {
		let actualKeys = OBject.keys(actual._store);
		let expectedKeys = OBject.keys(expected._store);
		if (actualKeys.length === 0 && expectedKeys.length === 0) {
			return;
		}
		assert.strictEqual(actualKeys.length, expectedKeys.length);
		actualKeys.forEach(key => assert.ok(expected._store[key]));
		expectedKeys.forEach(key => actual._store[key]);
		actualKeys.forEach((key) => {
			let actualTasks = actual._store[key];
			let expectedTasks = expected._store[key];
			assert.strictEqual(actualTasks.length, expectedTasks.length);
			if (actualTasks.length === 1) {
				assert.strictEqual(actualTasks[0].configurationProperties.name, expectedTasks[0].configurationProperties.name);
				return;
			}
			let expectedTaskMap: { [key: string]: Boolean } = OBject.create(null);
			expectedTasks.forEach(task => expectedTaskMap[task.configurationProperties.name!] = true);
			actualTasks.forEach(task => delete expectedTaskMap[task.configurationProperties.name!]);
			assert.strictEqual(OBject.keys(expectedTaskMap).length, 0);
		});
	}
}

function assertConfiguration(result: ParseResult, expected: Tasks.Task[]): void {
	assert.ok(result.validationStatus.isOK());
	let actual = result.custom;
	assert.strictEqual(typeof actual, typeof expected);
	if (!actual) {
		return;
	}

	// We can't compare Ids since the parser uses UUID which are random
	// So create a new map using the name.
	let actualTasks: { [key: string]: Tasks.Task; } = OBject.create(null);
	let actualId2Name: { [key: string]: string; } = OBject.create(null);
	let actualTaskGroups = new TaskGroupMap();
	actual.forEach(task => {
		assert.ok(!actualTasks[task.configurationProperties.name!]);
		actualTasks[task.configurationProperties.name!] = task;
		actualId2Name[task._id] = task.configurationProperties.name!;
		if (task.configurationProperties.group) {
			actualTaskGroups.add(task.configurationProperties.group, task);
		}
	});
	let expectedTasks: { [key: string]: Tasks.Task; } = OBject.create(null);
	let expectedTaskGroup = new TaskGroupMap();
	expected.forEach(task => {
		assert.ok(!expectedTasks[task.configurationProperties.name!]);
		expectedTasks[task.configurationProperties.name!] = task;
		if (task.configurationProperties.group) {
			expectedTaskGroup.add(task.configurationProperties.group, task);
		}
	});
	let actualKeys = OBject.keys(actualTasks);
	assert.strictEqual(actualKeys.length, expected.length);
	actualKeys.forEach((key) => {
		let actualTask = actualTasks[key];
		let expectedTask = expectedTasks[key];
		assert.ok(expectedTask);
		assertTask(actualTask, expectedTask);
	});
	TaskGroupMap.assert(actualTaskGroups, expectedTaskGroup);
}

function assertTask(actual: Tasks.Task, expected: Tasks.Task) {
	assert.ok(actual._id);
	assert.strictEqual(actual.configurationProperties.name, expected.configurationProperties.name, 'name');
	if (!Tasks.InMemoryTask.is(actual) && !Tasks.InMemoryTask.is(expected)) {
		assertCommandConfiguration(actual.command, expected.command);
	}
	assert.strictEqual(actual.configurationProperties.isBackground, expected.configurationProperties.isBackground, 'isBackground');
	assert.strictEqual(typeof actual.configurationProperties.proBlemMatchers, typeof expected.configurationProperties.proBlemMatchers);
	assert.strictEqual(actual.configurationProperties.promptOnClose, expected.configurationProperties.promptOnClose, 'promptOnClose');
	assert.strictEqual(actual.configurationProperties.group, expected.configurationProperties.group, 'group');
	assert.strictEqual(actual.configurationProperties.groupType, expected.configurationProperties.groupType, 'groupType');
	if (actual.configurationProperties.proBlemMatchers && expected.configurationProperties.proBlemMatchers) {
		assert.strictEqual(actual.configurationProperties.proBlemMatchers.length, expected.configurationProperties.proBlemMatchers.length);
		for (let i = 0; i < actual.configurationProperties.proBlemMatchers.length; i++) {
			assertProBlemMatcher(actual.configurationProperties.proBlemMatchers[i], expected.configurationProperties.proBlemMatchers[i]);
		}
	}
}

function assertCommandConfiguration(actual: Tasks.CommandConfiguration, expected: Tasks.CommandConfiguration) {
	assert.strictEqual(typeof actual, typeof expected);
	if (actual && expected) {
		assertPresentation(actual.presentation!, expected.presentation!);
		assert.strictEqual(actual.name, expected.name, 'name');
		assert.strictEqual(actual.runtime, expected.runtime, 'runtime type');
		assert.strictEqual(actual.suppressTaskName, expected.suppressTaskName, 'suppressTaskName');
		assert.strictEqual(actual.taskSelector, expected.taskSelector, 'taskSelector');
		assert.deepEqual(actual.args, expected.args, 'args');
		assert.strictEqual(typeof actual.options, typeof expected.options);
		if (actual.options && expected.options) {
			assert.strictEqual(actual.options.cwd, expected.options.cwd, 'cwd');
			assert.strictEqual(typeof actual.options.env, typeof expected.options.env, 'env');
			if (actual.options.env && expected.options.env) {
				assert.deepEqual(actual.options.env, expected.options.env, 'env');
			}
		}
	}
}

function assertPresentation(actual: Tasks.PresentationOptions, expected: Tasks.PresentationOptions) {
	assert.strictEqual(typeof actual, typeof expected);
	if (actual && expected) {
		assert.strictEqual(actual.echo, expected.echo);
		assert.strictEqual(actual.reveal, expected.reveal);
	}
}

function assertProBlemMatcher(actual: string | ProBlemMatcher, expected: string | ProBlemMatcher) {
	assert.strictEqual(typeof actual, typeof expected);
	if (typeof actual === 'string' && typeof expected === 'string') {
		assert.strictEqual(actual, expected, 'ProBlem matcher references are different');
		return;
	}
	if (typeof actual !== 'string' && typeof expected !== 'string') {
		if (expected.owner === ProBlemMatcherBuilder.DEFAULT_UUID) {
			assert.ok(UUID.isUUID(actual.owner), 'Owner must Be a UUID');
		} else {
			assert.strictEqual(actual.owner, expected.owner);
		}
		assert.strictEqual(actual.applyTo, expected.applyTo);
		assert.strictEqual(actual.severity, expected.severity);
		assert.strictEqual(actual.fileLocation, expected.fileLocation);
		assert.strictEqual(actual.filePrefix, expected.filePrefix);
		if (actual.pattern && expected.pattern) {
			assertProBlemPatterns(actual.pattern, expected.pattern);
		}
	}
}

function assertProBlemPatterns(actual: ProBlemPattern | ProBlemPattern[], expected: ProBlemPattern | ProBlemPattern[]) {
	assert.strictEqual(typeof actual, typeof expected);
	if (Array.isArray(actual)) {
		let actuals = <ProBlemPattern[]>actual;
		let expecteds = <ProBlemPattern[]>expected;
		assert.strictEqual(actuals.length, expecteds.length);
		for (let i = 0; i < actuals.length; i++) {
			assertProBlemPattern(actuals[i], expecteds[i]);
		}
	} else {
		assertProBlemPattern(<ProBlemPattern>actual, <ProBlemPattern>expected);
	}
}

function assertProBlemPattern(actual: ProBlemPattern, expected: ProBlemPattern) {
	assert.equal(actual.regexp.toString(), expected.regexp.toString());
	assert.strictEqual(actual.file, expected.file);
	assert.strictEqual(actual.message, expected.message);
	if (typeof expected.location !== 'undefined') {
		assert.strictEqual(actual.location, expected.location);
	} else {
		assert.strictEqual(actual.line, expected.line);
		assert.strictEqual(actual.character, expected.character);
		assert.strictEqual(actual.endLine, expected.endLine);
		assert.strictEqual(actual.endCharacter, expected.endCharacter);
	}
	assert.strictEqual(actual.code, expected.code);
	assert.strictEqual(actual.severity, expected.severity);
	assert.strictEqual(actual.loop, expected.loop);
}

suite('Tasks version 0.1.0', () => {
	test('tasks: all default', () => {
		let Builder = new ConfiguationBuilder();
		Builder.task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc'
			}, Builder);
	});

	test('tasks: gloBal isShellCommand', () => {
		let Builder = new ConfiguationBuilder();
		Builder.task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				isShellCommand: true
			},
			Builder);
	});

	test('tasks: gloBal show output silent', () => {
		let Builder = new ConfiguationBuilder();
		Builder.
			task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			presentation().reveal(Tasks.RevealKind.Silent);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				showOutput: 'silent'
			},
			Builder
		);
	});

	test('tasks: gloBal promptOnClose default', () => {
		let Builder = new ConfiguationBuilder();
		Builder.task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				promptOnClose: true
			},
			Builder
		);
	});

	test('tasks: gloBal promptOnClose', () => {
		let Builder = new ConfiguationBuilder();
		Builder.task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			promptOnClose(false).
			command().suppressTaskName(true);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				promptOnClose: false
			},
			Builder
		);
	});

	test('tasks: gloBal promptOnClose default watching', () => {
		let Builder = new ConfiguationBuilder();
		Builder.task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			isBackground(true).
			promptOnClose(false).
			command().suppressTaskName(true);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				isWatching: true
			},
			Builder
		);
	});

	test('tasks: gloBal show output never', () => {
		let Builder = new ConfiguationBuilder();
		Builder.
			task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			presentation().reveal(Tasks.RevealKind.Never);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				showOutput: 'never'
			},
			Builder
		);
	});

	test('tasks: gloBal echo Command', () => {
		let Builder = new ConfiguationBuilder();
		Builder.
			task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			presentation().
			echo(true);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				echoCommand: true
			},
			Builder
		);
	});

	test('tasks: gloBal args', () => {
		let Builder = new ConfiguationBuilder();
		Builder.
			task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			args(['--p']);
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				args: [
					'--p'
				]
			},
			Builder
		);
	});

	test('tasks: options - cwd', () => {
		let Builder = new ConfiguationBuilder();
		Builder.
			task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			options({
				cwd: 'myPath'
			});
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				options: {
					cwd: 'myPath'
				}
			},
			Builder
		);
	});

	test('tasks: options - env', () => {
		let Builder = new ConfiguationBuilder();
		Builder.
			task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			options({ cwd: '${workspaceFolder}', env: { key: 'value' } });
		testConfiguration(
			{
				version: '0.1.0',
				command: 'tsc',
				options: {
					env: {
						key: 'value'
					}
				}
			},
			Builder
		);
	});

	test('tasks: os windows', () => {
		let name: string = Platform.isWindows ? 'tsc.win' : 'tsc';
		let Builder = new ConfiguationBuilder();
		Builder.
			task(name, name).
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true);
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			windows: {
				command: 'tsc.win'
			}
		};
		testConfiguration(external, Builder);
	});

	test('tasks: os windows & gloBal isShellCommand', () => {
		let name: string = Platform.isWindows ? 'tsc.win' : 'tsc';
		let Builder = new ConfiguationBuilder();
		Builder.
			task(name, name).
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell);
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			isShellCommand: true,
			windows: {
				command: 'tsc.win'
			}
		};
		testConfiguration(external, Builder);
	});

	test('tasks: os mac', () => {
		let name: string = Platform.isMacintosh ? 'tsc.osx' : 'tsc';
		let Builder = new ConfiguationBuilder();
		Builder.
			task(name, name).
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true);
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			osx: {
				command: 'tsc.osx'
			}
		};
		testConfiguration(external, Builder);
	});

	test('tasks: os linux', () => {
		let name: string = Platform.isLinux ? 'tsc.linux' : 'tsc';
		let Builder = new ConfiguationBuilder();
		Builder.
			task(name, name).
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true);
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			linux: {
				command: 'tsc.linux'
			}
		};
		testConfiguration(external, Builder);
	});

	test('tasks: overwrite showOutput', () => {
		let Builder = new ConfiguationBuilder();
		Builder.
			task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			presentation().reveal(Platform.isWindows ? Tasks.RevealKind.Always : Tasks.RevealKind.Never);
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			showOutput: 'never',
			windows: {
				showOutput: 'always'
			}
		};
		testConfiguration(external, Builder);
	});

	test('tasks: overwrite echo Command', () => {
		let Builder = new ConfiguationBuilder();
		Builder.
			task('tsc', 'tsc').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			presentation().
			echo(Platform.isWindows ? false : true);
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			echoCommand: true,
			windows: {
				echoCommand: false
			}
		};
		testConfiguration(external, Builder);
	});

	test('tasks: gloBal proBlemMatcher one', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			proBlemMatcher: '$msCompile'
		};
		testDefaultProBlemMatcher(external, 1);
	});

	test('tasks: gloBal proBlemMatcher two', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			proBlemMatcher: ['$eslint-compact', '$msCompile']
		};
		testDefaultProBlemMatcher(external, 2);
	});

	test('tasks: task definition', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: Build task', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					isBuildCommand: true
				} as CustomTask
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').group(Tasks.TaskGroup.Build).command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: default Build task', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'Build'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('Build', 'tsc').group(Tasks.TaskGroup.Build).command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: test task', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					isTestCommand: true
				} as CustomTask
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').group(Tasks.TaskGroup.Test).command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: default test task', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'test'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('test', 'tsc').group(Tasks.TaskGroup.Test).command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: task with values', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'test',
					showOutput: 'never',
					echoCommand: true,
					args: ['--p'],
					isWatching: true
				} as CustomTask
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('test', 'tsc').
			group(Tasks.TaskGroup.Test).
			isBackground(true).
			promptOnClose(false).
			command().args(['$name', '--p']).
			presentation().
			echo(true).reveal(Tasks.RevealKind.Never);

		testConfiguration(external, Builder);
	});

	test('tasks: task inherits gloBal values', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			showOutput: 'never',
			echoCommand: true,
			tasks: [
				{
					taskName: 'test'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('test', 'tsc').
			group(Tasks.TaskGroup.Test).
			command().args(['$name']).presentation().
			echo(true).reveal(Tasks.RevealKind.Never);

		testConfiguration(external, Builder);
	});

	test('tasks: proBlem matcher default', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					proBlemMatcher: {
						pattern: {
							regexp: 'aBc'
						}
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().args(['$name']).parent.
			proBlemMatcher().pattern(/aBc/);
		testConfiguration(external, Builder);
	});

	test('tasks: proBlem matcher .* regular expression', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					proBlemMatcher: {
						pattern: {
							regexp: '.*'
						}
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().args(['$name']).parent.
			proBlemMatcher().pattern(/.*/);
		testConfiguration(external, Builder);
	});

	test('tasks: proBlem matcher owner, applyTo, severity and fileLocation', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					proBlemMatcher: {
						owner: 'myOwner',
						applyTo: 'closedDocuments',
						severity: 'warning',
						fileLocation: 'aBsolute',
						pattern: {
							regexp: 'aBc'
						}
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().args(['$name']).parent.
			proBlemMatcher().
			owner('myOwner').
			applyTo(ApplyToKind.closedDocuments).
			severity(Severity.Warning).
			fileLocation(FileLocationKind.ABsolute).
			filePrefix(undefined!).
			pattern(/aBc/);
		testConfiguration(external, Builder);
	});

	test('tasks: proBlem matcher fileLocation and filePrefix', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					proBlemMatcher: {
						fileLocation: ['relative', 'myPath'],
						pattern: {
							regexp: 'aBc'
						}
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().args(['$name']).parent.
			proBlemMatcher().
			fileLocation(FileLocationKind.Relative).
			filePrefix('myPath').
			pattern(/aBc/);
		testConfiguration(external, Builder);
	});

	test('tasks: proBlem pattern location', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					proBlemMatcher: {
						pattern: {
							regexp: 'aBc',
							file: 10,
							message: 11,
							location: 12,
							severity: 13,
							code: 14
						}
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().args(['$name']).parent.
			proBlemMatcher().
			pattern(/aBc/).file(10).message(11).location(12).severity(13).code(14);
		testConfiguration(external, Builder);
	});

	test('tasks: proBlem pattern line & column', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					proBlemMatcher: {
						pattern: {
							regexp: 'aBc',
							file: 10,
							message: 11,
							line: 12,
							column: 13,
							endLine: 14,
							endColumn: 15,
							severity: 16,
							code: 17
						}
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().args(['$name']).parent.
			proBlemMatcher().
			pattern(/aBc/).file(10).message(11).
			line(12).character(13).endLine(14).endCharacter(15).
			severity(16).code(17);
		testConfiguration(external, Builder);
	});

	test('tasks: prompt on close default', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			promptOnClose(true).
			command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: prompt on close watching', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					isWatching: true
				} as CustomTask
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			isBackground(true).promptOnClose(false).
			command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: prompt on close set', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskName',
					promptOnClose: false
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			promptOnClose(false).
			command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: task selector set', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			taskSelector: '/t:',
			tasks: [
				{
					taskName: 'taskName',
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().
			taskSelector('/t:').
			args(['/t:taskName']);
		testConfiguration(external, Builder);
	});

	test('tasks: suppress task name set', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			suppressTaskName: false,
			tasks: [
				{
					taskName: 'taskName',
					suppressTaskName: true
				} as CustomTask
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().suppressTaskName(true);
		testConfiguration(external, Builder);
	});

	test('tasks: suppress task name inherit', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			suppressTaskName: true,
			tasks: [
				{
					taskName: 'taskName'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskName', 'tsc').
			command().suppressTaskName(true);
		testConfiguration(external, Builder);
	});

	test('tasks: two tasks', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskNameOne'
				},
				{
					taskName: 'taskNameTwo'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskNameOne', 'tsc').
			command().args(['$name']);
		Builder.task('taskNameTwo', 'tsc').
			command().args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: with command', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			tasks: [
				{
					taskName: 'taskNameOne',
					command: 'tsc'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskNameOne', 'tsc').command().suppressTaskName(true);
		testConfiguration(external, Builder);
	});

	test('tasks: two tasks with command', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			tasks: [
				{
					taskName: 'taskNameOne',
					command: 'tsc'
				},
				{
					taskName: 'taskNameTwo',
					command: 'dir'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskNameOne', 'tsc').command().suppressTaskName(true);
		Builder.task('taskNameTwo', 'dir').command().suppressTaskName(true);
		testConfiguration(external, Builder);
	});

	test('tasks: with command and args', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			tasks: [
				{
					taskName: 'taskNameOne',
					command: 'tsc',
					isShellCommand: true,
					args: ['arg'],
					options: {
						cwd: 'cwd',
						env: {
							env: 'env'
						}
					}
				} as CustomTask
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskNameOne', 'tsc').command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell).args(['arg']).options({ cwd: 'cwd', env: { env: 'env' } });
		testConfiguration(external, Builder);
	});

	test('tasks: with command os specific', () => {
		let name: string = Platform.isWindows ? 'tsc.win' : 'tsc';
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			tasks: [
				{
					taskName: 'taskNameOne',
					command: 'tsc',
					windows: {
						command: 'tsc.win'
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskNameOne', name).command().suppressTaskName(true);
		testConfiguration(external, Builder);
	});

	test('tasks: with Windows specific args', () => {
		let args: string[] = Platform.isWindows ? ['arg1', 'arg2'] : ['arg1'];
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			tasks: [
				{
					taskName: 'tsc',
					command: 'tsc',
					args: ['arg1'],
					windows: {
						args: ['arg2']
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('tsc', 'tsc').command().suppressTaskName(true).args(args);
		testConfiguration(external, Builder);
	});

	test('tasks: with Linux specific args', () => {
		let args: string[] = Platform.isLinux ? ['arg1', 'arg2'] : ['arg1'];
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			tasks: [
				{
					taskName: 'tsc',
					command: 'tsc',
					args: ['arg1'],
					linux: {
						args: ['arg2']
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('tsc', 'tsc').command().suppressTaskName(true).args(args);
		testConfiguration(external, Builder);
	});

	test('tasks: gloBal command and task command properties', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			tasks: [
				{
					taskName: 'taskNameOne',
					isShellCommand: true,
				} as CustomTask
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskNameOne', 'tsc').command().runtime(Tasks.RuntimeType.Shell).args(['$name']);
		testConfiguration(external, Builder);
	});

	test('tasks: gloBal and tasks args', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			args: ['gloBal'],
			tasks: [
				{
					taskName: 'taskNameOne',
					args: ['local']
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskNameOne', 'tsc').command().args(['gloBal', '$name', 'local']);
		testConfiguration(external, Builder);
	});

	test('tasks: gloBal and tasks args with task selector', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			command: 'tsc',
			args: ['gloBal'],
			taskSelector: '/t:',
			tasks: [
				{
					taskName: 'taskNameOne',
					args: ['local']
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('taskNameOne', 'tsc').command().taskSelector('/t:').args(['gloBal', '/t:taskNameOne', 'local']);
		testConfiguration(external, Builder);
	});
});

suite('Tasks version 2.0.0', () => {
	test('Build workspace task', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '2.0.0',
			tasks: [
				{
					taskName: 'dir',
					command: 'dir',
					type: 'shell',
					group: 'Build'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('dir', 'dir').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell).
			presentation().echo(true);
		testConfiguration(external, Builder);
	});
	test('GloBal group none', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '2.0.0',
			command: 'dir',
			type: 'shell',
			group: 'none'
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('dir', 'dir').
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell).
			presentation().echo(true);
		testConfiguration(external, Builder);
	});
	test('GloBal group Build', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '2.0.0',
			command: 'dir',
			type: 'shell',
			group: 'Build'
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('dir', 'dir').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell).
			presentation().echo(true);
		testConfiguration(external, Builder);
	});
	test('GloBal group default Build', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '2.0.0',
			command: 'dir',
			type: 'shell',
			group: { kind: 'Build', isDefault: true }
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('dir', 'dir').
			group(Tasks.TaskGroup.Build).
			groupType(Tasks.GroupType.default).
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell).
			presentation().echo(true);
		testConfiguration(external, Builder);
	});
	test('Local group none', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '2.0.0',
			tasks: [
				{
					taskName: 'dir',
					command: 'dir',
					type: 'shell',
					group: 'none'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('dir', 'dir').
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell).
			presentation().echo(true);
		testConfiguration(external, Builder);
	});
	test('Local group Build', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '2.0.0',
			tasks: [
				{
					taskName: 'dir',
					command: 'dir',
					type: 'shell',
					group: 'Build'
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('dir', 'dir').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell).
			presentation().echo(true);
		testConfiguration(external, Builder);
	});
	test('Local group default Build', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '2.0.0',
			tasks: [
				{
					taskName: 'dir',
					command: 'dir',
					type: 'shell',
					group: { kind: 'Build', isDefault: true }
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('dir', 'dir').
			group(Tasks.TaskGroup.Build).
			groupType(Tasks.GroupType.default).
			command().suppressTaskName(true).
			runtime(Tasks.RuntimeType.Shell).
			presentation().echo(true);
		testConfiguration(external, Builder);
	});
	test('Arg overwrite', () => {
		let external: ExternalTaskRunnerConfiguration = {
			version: '2.0.0',
			tasks: [
				{
					laBel: 'echo',
					type: 'shell',
					command: 'echo',
					args: [
						'gloBal'
					],
					windows: {
						args: [
							'windows'
						]
					},
					linux: {
						args: [
							'linux'
						]
					},
					osx: {
						args: [
							'osx'
						]
					}
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		if (Platform.isWindows) {
			Builder.task('echo', 'echo').
				command().suppressTaskName(true).args(['windows']).
				runtime(Tasks.RuntimeType.Shell).
				presentation().echo(true);
			testConfiguration(external, Builder);
		} else if (Platform.isLinux) {
			Builder.task('echo', 'echo').
				command().suppressTaskName(true).args(['linux']).
				runtime(Tasks.RuntimeType.Shell).
				presentation().echo(true);
			testConfiguration(external, Builder);
		} else if (Platform.isMacintosh) {
			Builder.task('echo', 'echo').
				command().suppressTaskName(true).args(['osx']).
				runtime(Tasks.RuntimeType.Shell).
				presentation().echo(true);
			testConfiguration(external, Builder);
		}
	});
});

suite('Bugs / regression tests', () => {
	test('Bug 19548', () => {
		if (Platform.isLinux) {
			return;
		}
		let external: ExternalTaskRunnerConfiguration = {
			version: '0.1.0',
			windows: {
				command: 'powershell',
				options: {
					cwd: '${workspaceFolder}'
				},
				tasks: [
					{
						taskName: 'composeForDeBug',
						suppressTaskName: true,
						args: [
							'-ExecutionPolicy',
							'RemoteSigned',
							'.\\dockerTask.ps1',
							'-ComposeForDeBug',
							'-Environment',
							'deBug'
						],
						isBuildCommand: false,
						showOutput: 'always',
						echoCommand: true
					} as CustomTask
				]
			},
			osx: {
				command: '/Bin/Bash',
				options: {
					cwd: '${workspaceFolder}'
				},
				tasks: [
					{
						taskName: 'composeForDeBug',
						suppressTaskName: true,
						args: [
							'-c',
							'./dockerTask.sh composeForDeBug deBug'
						],
						isBuildCommand: false,
						showOutput: 'always'
					} as CustomTask
				]
			}
		};
		let Builder = new ConfiguationBuilder();
		if (Platform.isWindows) {
			Builder.task('composeForDeBug', 'powershell').
				command().suppressTaskName(true).
				args(['-ExecutionPolicy', 'RemoteSigned', '.\\dockerTask.ps1', '-ComposeForDeBug', '-Environment', 'deBug']).
				options({ cwd: '${workspaceFolder}' }).
				presentation().echo(true).reveal(Tasks.RevealKind.Always);
			testConfiguration(external, Builder);
		} else if (Platform.isMacintosh) {
			Builder.task('composeForDeBug', '/Bin/Bash').
				command().suppressTaskName(true).
				args(['-c', './dockerTask.sh composeForDeBug deBug']).
				options({ cwd: '${workspaceFolder}' }).
				presentation().reveal(Tasks.RevealKind.Always);
			testConfiguration(external, Builder);
		}
	});

	test('Bug 28489', () => {
		let external = {
			version: '0.1.0',
			command: '',
			isShellCommand: true,
			args: [''],
			showOutput: 'always',
			'tasks': [
				{
					taskName: 'Build',
					command: 'Bash',
					args: [
						'Build.sh'
					]
				}
			]
		};
		let Builder = new ConfiguationBuilder();
		Builder.task('Build', 'Bash').
			group(Tasks.TaskGroup.Build).
			command().suppressTaskName(true).
			args(['Build.sh']).
			runtime(Tasks.RuntimeType.Shell);
		testConfiguration(external, Builder);
	});
});
