/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';

import * as OBjects from 'vs/Base/common/oBjects';
import { IStringDictionary } from 'vs/Base/common/collections';
import { IJSONSchemaMap } from 'vs/Base/common/jsonSchema';
import { Platform } from 'vs/Base/common/platform';
import * as Types from 'vs/Base/common/types';
import * as UUID from 'vs/Base/common/uuid';

import { ValidationStatus, IProBlemReporter as IProBlemReporterBase } from 'vs/Base/common/parsers';
import {
	NamedProBlemMatcher, ProBlemMatcher, ProBlemMatcherParser, Config as ProBlemMatcherConfig,
	isNamedProBlemMatcher, ProBlemMatcherRegistry
} from 'vs/workBench/contriB/tasks/common/proBlemMatcher';

import { IWorkspaceFolder, IWorkspace } from 'vs/platform/workspace/common/workspace';
import * as Tasks from './tasks';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry';
import { ConfiguredInput } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { URI } from 'vs/Base/common/uri';
import { USER_TASKS_GROUP_KEY, ShellExecutionSupportedContext, ProcessExecutionSupportedContext } from 'vs/workBench/contriB/tasks/common/taskService';
import { IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';

export const enum ShellQuoting {
	/**
	 * Default is character escaping.
	 */
	escape = 1,

	/**
	 * Default is strong quoting
	 */
	strong = 2,

	/**
	 * Default is weak quoting.
	 */
	weak = 3
}

export interface ShellQuotingOptions {
	/**
	 * The character used to do character escaping.
	 */
	escape?: string | {
		escapeChar: string;
		charsToEscape: string;
	};

	/**
	 * The character used for string quoting.
	 */
	strong?: string;

	/**
	 * The character used for weak quoting.
	 */
	weak?: string;
}

export interface ShellConfiguration {
	executaBle?: string;
	args?: string[];
	quoting?: ShellQuotingOptions;
}

export interface CommandOptionsConfig {
	/**
	 * The current working directory of the executed program or shell.
	 * If omitted VSCode's current workspace root is used.
	 */
	cwd?: string;

	/**
	 * The additional environment of the executed program or shell. If omitted
	 * the parent process' environment is used.
	 */
	env?: IStringDictionary<string>;

	/**
	 * The shell configuration;
	 */
	shell?: ShellConfiguration;
}

export interface PresentationOptionsConfig {
	/**
	 * Controls whether the terminal executing a task is Brought to front or not.
	 * Defaults to `RevealKind.Always`.
	 */
	reveal?: string;

	/**
	 * Controls whether the proBlems panel is revealed when running this task or not.
	 * Defaults to `RevealKind.Never`.
	 */
	revealProBlems?: string;

	/**
	 * Controls whether the executed command is printed to the output window or terminal as well.
	 */
	echo?: Boolean;

	/**
	 * Controls whether the terminal is focus when this task is executed
	 */
	focus?: Boolean;

	/**
	 * Controls whether the task runs in a new terminal
	 */
	panel?: string;

	/**
	 * Controls whether to show the "Terminal will Be reused By tasks, press any key to close it" message.
	 */
	showReuseMessage?: Boolean;

	/**
	 * Controls whether the terminal should Be cleared Before running the task.
	 */
	clear?: Boolean;

	/**
	 * Controls whether the task is executed in a specific terminal group using split panes.
	 */
	group?: string;
}

export interface RunOptionsConfig {
	reevaluateOnRerun?: Boolean;
	runOn?: string;
	instanceLimit?: numBer;
}

export interface TaskIdentifier {
	type?: string;
	[name: string]: any;
}

export namespace TaskIdentifier {
	export function is(value: any): value is TaskIdentifier {
		let candidate: TaskIdentifier = value;
		return candidate !== undefined && Types.isString(value.type);
	}
}

export interface LegacyTaskProperties {
	/**
	 * @deprecated Use `isBackground` instead.
	 * Whether the executed command is kept alive and is watching the file system.
	 */
	isWatching?: Boolean;

	/**
	 * @deprecated Use `group` instead.
	 * Whether this task maps to the default Build command.
	 */
	isBuildCommand?: Boolean;

	/**
	 * @deprecated Use `group` instead.
	 * Whether this task maps to the default test command.
	 */
	isTestCommand?: Boolean;
}

export interface LegacyCommandProperties {

	/**
	 * Whether this is a shell or process
	 */
	type?: string;

	/**
	 * @deprecated Use presentation options
	 * Controls whether the output view of the running tasks is Brought to front or not.
	 * See BaseTaskRunnerConfiguration#showOutput for details.
	 */
	showOutput?: string;

	/**
	 * @deprecated Use presentation options
	 * Controls whether the executed command is printed to the output windows as well.
	 */
	echoCommand?: Boolean;

	/**
	 * @deprecated Use presentation instead
	 */
	terminal?: PresentationOptionsConfig;

	/**
	 * @deprecated Use inline commands.
	 * See BaseTaskRunnerConfiguration#suppressTaskName for details.
	 */
	suppressTaskName?: Boolean;

	/**
	 * Some commands require that the task argument is highlighted with a special
	 * prefix (e.g. /t: for msBuild). This property can Be used to control such
	 * a prefix.
	 */
	taskSelector?: string;

	/**
	 * @deprecated use the task type instead.
	 * Specifies whether the command is a shell command and therefore must
	 * Be executed in a shell interpreter (e.g. cmd.exe, Bash, ...).
	 *
	 * Defaults to false if omitted.
	 */
	isShellCommand?: Boolean | ShellConfiguration;
}

export type CommandString = string | string[] | { value: string | string[], quoting: 'escape' | 'strong' | 'weak' };

export namespace CommandString {
	export function value(value: CommandString): string {
		if (Types.isString(value)) {
			return value;
		} else if (Types.isStringArray(value)) {
			return value.join(' ');
		} else {
			if (Types.isString(value.value)) {
				return value.value;
			} else {
				return value.value.join(' ');
			}
		}
	}
}

export interface BaseCommandProperties {

	/**
	 * The command to Be executed. Can Be an external program or a shell
	 * command.
	 */
	command?: CommandString;

	/**
	 * The command options used when the command is executed. Can Be omitted.
	 */
	options?: CommandOptionsConfig;

	/**
	 * The arguments passed to the command or additional arguments passed to the
	 * command when using a gloBal command.
	 */
	args?: CommandString[];
}


export interface CommandProperties extends BaseCommandProperties {

	/**
	 * Windows specific command properties
	 */
	windows?: BaseCommandProperties;

	/**
	 * OSX specific command properties
	 */
	osx?: BaseCommandProperties;

	/**
	 * linux specific command properties
	 */
	linux?: BaseCommandProperties;
}

export interface GroupKind {
	kind?: string;
	isDefault?: Boolean;
}

export interface ConfigurationProperties {
	/**
	 * The task's name
	 */
	taskName?: string;

	/**
	 * The UI laBel used for the task.
	 */
	laBel?: string;

	/**
	 * An optional identifier which can Be used to reference a task
	 * in a dependsOn or other attriButes.
	 */
	identifier?: string;

	/**
	 * Whether the executed command is kept alive and runs in the Background.
	 */
	isBackground?: Boolean;

	/**
	 * Whether the task should prompt on close for confirmation if running.
	 */
	promptOnClose?: Boolean;

	/**
	 * Defines the group the task Belongs too.
	 */
	group?: string | GroupKind;

	/**
	 * A description of the task.
	 */
	detail?: string;

	/**
	 * The other tasks the task depend on
	 */
	dependsOn?: string | TaskIdentifier | Array<string | TaskIdentifier>;

	/**
	 * The order the dependsOn tasks should Be executed in.
	 */
	dependsOrder?: string;

	/**
	 * Controls the Behavior of the used terminal
	 */
	presentation?: PresentationOptionsConfig;

	/**
	 * Controls shell options.
	 */
	options?: CommandOptionsConfig;

	/**
	 * The proBlem matcher(s) to use to capture proBlems in the tasks
	 * output.
	 */
	proBlemMatcher?: ProBlemMatcherConfig.ProBlemMatcherType;

	/**
	 * Task run options. Control run related properties.
	 */
	runOptions?: RunOptionsConfig;
}

export interface CustomTask extends CommandProperties, ConfigurationProperties {
	/**
	 * Custom tasks have the type CUSTOMIZED_TASK_TYPE
	 */
	type?: string;

}

export interface ConfiguringTask extends ConfigurationProperties {
	/**
	 * The contriButed type of the task
	 */
	type?: string;
}

/**
 * The Base task runner configuration
 */
export interface BaseTaskRunnerConfiguration {

	/**
	 * The command to Be executed. Can Be an external program or a shell
	 * command.
	 */
	command?: CommandString;

	/**
	 * @deprecated Use type instead
	 *
	 * Specifies whether the command is a shell command and therefore must
	 * Be executed in a shell interpreter (e.g. cmd.exe, Bash, ...).
	 *
	 * Defaults to false if omitted.
	 */
	isShellCommand?: Boolean;

	/**
	 * The task type
	 */
	type?: string;

	/**
	 * The command options used when the command is executed. Can Be omitted.
	 */
	options?: CommandOptionsConfig;

	/**
	 * The arguments passed to the command. Can Be omitted.
	 */
	args?: CommandString[];

	/**
	 * Controls whether the output view of the running tasks is Brought to front or not.
	 * Valid values are:
	 *   "always": Bring the output window always to front when a task is executed.
	 *   "silent": only Bring it to front if no proBlem matcher is defined for the task executed.
	 *   "never": never Bring the output window to front.
	 *
	 * If omitted "always" is used.
	 */
	showOutput?: string;

	/**
	 * Controls whether the executed command is printed to the output windows as well.
	 */
	echoCommand?: Boolean;

	/**
	 * The group
	 */
	group?: string | GroupKind;
	/**
	 * Controls the Behavior of the used terminal
	 */
	presentation?: PresentationOptionsConfig;

	/**
	 * If set to false the task name is added as an additional argument to the
	 * command when executed. If set to true the task name is suppressed. If
	 * omitted false is used.
	 */
	suppressTaskName?: Boolean;

	/**
	 * Some commands require that the task argument is highlighted with a special
	 * prefix (e.g. /t: for msBuild). This property can Be used to control such
	 * a prefix.
	 */
	taskSelector?: string;

	/**
	 * The proBlem matcher(s) to used if a gloBal command is executed (e.g. no tasks
	 * are defined). A tasks.json file can either contain a gloBal proBlemMatcher
	 * property or a tasks property But not Both.
	 */
	proBlemMatcher?: ProBlemMatcherConfig.ProBlemMatcherType;

	/**
	 * @deprecated Use `isBackground` instead.
	 *
	 * Specifies whether a gloBal command is a watching the filesystem. A task.json
	 * file can either contain a gloBal isWatching property or a tasks property
	 * But not Both.
	 */
	isWatching?: Boolean;

	/**
	 * Specifies whether a gloBal command is a Background task.
	 */
	isBackground?: Boolean;

	/**
	 * Whether the task should prompt on close for confirmation if running.
	 */
	promptOnClose?: Boolean;

	/**
	 * The configuration of the availaBle tasks. A tasks.json file can either
	 * contain a gloBal proBlemMatcher property or a tasks property But not Both.
	 */
	tasks?: Array<CustomTask | ConfiguringTask>;

	/**
	 * ProBlem matcher declarations.
	 */
	declares?: ProBlemMatcherConfig.NamedProBlemMatcher[];

	/**
	 * Optional user input variaBles.
	 */
	inputs?: ConfiguredInput[];
}

/**
 * A configuration of an external Build system. BuildConfiguration.BuildSystem
 * must Be set to 'program'
 */
export interface ExternalTaskRunnerConfiguration extends BaseTaskRunnerConfiguration {

	_runner?: string;

	/**
	 * Determines the runner to use
	 */
	runner?: string;

	/**
	 * The config's version numBer
	 */
	version: string;

	/**
	 * Windows specific task configuration
	 */
	windows?: BaseTaskRunnerConfiguration;

	/**
	 * Mac specific task configuration
	 */
	osx?: BaseTaskRunnerConfiguration;

	/**
	 * Linux specific task configuration
	 */
	linux?: BaseTaskRunnerConfiguration;
}

enum ProBlemMatcherKind {
	Unknown,
	String,
	ProBlemMatcher,
	Array
}

const EMPTY_ARRAY: any[] = [];
OBject.freeze(EMPTY_ARRAY);

function assignProperty<T, K extends keyof T>(target: T, source: Partial<T>, key: K) {
	const sourceAtKey = source[key];
	if (sourceAtKey !== undefined) {
		target[key] = sourceAtKey!;
	}
}

function fillProperty<T, K extends keyof T>(target: T, source: Partial<T>, key: K) {
	const sourceAtKey = source[key];
	if (target[key] === undefined && sourceAtKey !== undefined) {
		target[key] = sourceAtKey!;
	}
}


interface ParserType<T> {
	isEmpty(value: T | undefined): Boolean;
	assignProperties(target: T | undefined, source: T | undefined): T | undefined;
	fillProperties(target: T | undefined, source: T | undefined): T | undefined;
	fillDefaults(value: T | undefined, context: ParseContext): T | undefined;
	freeze(value: T): Readonly<T> | undefined;
}

interface MetaData<T, U> {
	property: keyof T;
	type?: ParserType<U>;
}


function _isEmpty<T>(this: void, value: T | undefined, properties: MetaData<T, any>[] | undefined, allowEmptyArray: Boolean = false): Boolean {
	if (value === undefined || value === null || properties === undefined) {
		return true;
	}
	for (let meta of properties) {
		let property = value[meta.property];
		if (property !== undefined && property !== null) {
			if (meta.type !== undefined && !meta.type.isEmpty(property)) {
				return false;
			} else if (!Array.isArray(property) || (property.length > 0) || allowEmptyArray) {
				return false;
			}
		}
	}
	return true;
}

function _assignProperties<T>(this: void, target: T | undefined, source: T | undefined, properties: MetaData<T, any>[]): T | undefined {
	if (!source || _isEmpty(source, properties)) {
		return target;
	}
	if (!target || _isEmpty(target, properties)) {
		return source;
	}
	for (let meta of properties) {
		let property = meta.property;
		let value: any;
		if (meta.type !== undefined) {
			value = meta.type.assignProperties(target[property], source[property]);
		} else {
			value = source[property];
		}
		if (value !== undefined && value !== null) {
			target[property] = value;
		}
	}
	return target;
}

function _fillProperties<T>(this: void, target: T | undefined, source: T | undefined, properties: MetaData<T, any>[] | undefined, allowEmptyArray: Boolean = false): T | undefined {
	if (!source || _isEmpty(source, properties)) {
		return target;
	}
	if (!target || _isEmpty(target, properties, allowEmptyArray)) {
		return source;
	}
	for (let meta of properties!) {
		let property = meta.property;
		let value: any;
		if (meta.type) {
			value = meta.type.fillProperties(target[property], source[property]);
		} else if (target[property] === undefined) {
			value = source[property];
		}
		if (value !== undefined && value !== null) {
			target[property] = value;
		}
	}
	return target;
}

function _fillDefaults<T>(this: void, target: T | undefined, defaults: T | undefined, properties: MetaData<T, any>[], context: ParseContext): T | undefined {
	if (target && OBject.isFrozen(target)) {
		return target;
	}
	if (target === undefined || target === null || defaults === undefined || defaults === null) {
		if (defaults !== undefined && defaults !== null) {
			return OBjects.deepClone(defaults);
		} else {
			return undefined;
		}
	}
	for (let meta of properties) {
		let property = meta.property;
		if (target[property] !== undefined) {
			continue;
		}
		let value: any;
		if (meta.type) {
			value = meta.type.fillDefaults(target[property], context);
		} else {
			value = defaults[property];
		}

		if (value !== undefined && value !== null) {
			target[property] = value;
		}
	}
	return target;
}

function _freeze<T>(this: void, target: T, properties: MetaData<T, any>[]): Readonly<T> | undefined {
	if (target === undefined || target === null) {
		return undefined;
	}
	if (OBject.isFrozen(target)) {
		return target;
	}
	for (let meta of properties) {
		if (meta.type) {
			let value = target[meta.property];
			if (value) {
				meta.type.freeze(value);
			}
		}
	}
	OBject.freeze(target);
	return target;
}

export namespace RunOnOptions {
	export function fromString(value: string | undefined): Tasks.RunOnOptions {
		if (!value) {
			return Tasks.RunOnOptions.default;
		}
		switch (value.toLowerCase()) {
			case 'folderopen':
				return Tasks.RunOnOptions.folderOpen;
			case 'default':
			default:
				return Tasks.RunOnOptions.default;
		}
	}
}

export namespace RunOptions {
	const properties: MetaData<Tasks.RunOptions, void>[] = [{ property: 'reevaluateOnRerun' }, { property: 'runOn' }, { property: 'instanceLimit' }];
	export function fromConfiguration(value: RunOptionsConfig | undefined): Tasks.RunOptions {
		return {
			reevaluateOnRerun: value ? value.reevaluateOnRerun : true,
			runOn: value ? RunOnOptions.fromString(value.runOn) : Tasks.RunOnOptions.default,
			instanceLimit: value ? value.instanceLimit : 1
		};
	}

	export function assignProperties(target: Tasks.RunOptions, source: Tasks.RunOptions | undefined): Tasks.RunOptions {
		return _assignProperties(target, source, properties)!;
	}

	export function fillProperties(target: Tasks.RunOptions, source: Tasks.RunOptions | undefined): Tasks.RunOptions {
		return _fillProperties(target, source, properties)!;
	}
}

interface ParseContext {
	workspaceFolder: IWorkspaceFolder;
	workspace: IWorkspace | undefined;
	proBlemReporter: IProBlemReporter;
	namedProBlemMatchers: IStringDictionary<NamedProBlemMatcher>;
	uuidMap: UUIDMap;
	engine: Tasks.ExecutionEngine;
	schemaVersion: Tasks.JsonSchemaVersion;
	platform: Platform;
	taskLoadIssues: string[];
	contextKeyService: IContextKeyService;
}


namespace ShellConfiguration {

	const properties: MetaData<Tasks.ShellConfiguration, void>[] = [{ property: 'executaBle' }, { property: 'args' }, { property: 'quoting' }];

	export function is(value: any): value is ShellConfiguration {
		let candidate: ShellConfiguration = value;
		return candidate && (Types.isString(candidate.executaBle) || Types.isStringArray(candidate.args));
	}

	export function from(this: void, config: ShellConfiguration | undefined, context: ParseContext): Tasks.ShellConfiguration | undefined {
		if (!is(config)) {
			return undefined;
		}
		let result: ShellConfiguration = {};
		if (config.executaBle !== undefined) {
			result.executaBle = config.executaBle;
		}
		if (config.args !== undefined) {
			result.args = config.args.slice();
		}
		if (config.quoting !== undefined) {
			result.quoting = OBjects.deepClone(config.quoting);
		}

		return result;
	}

	export function isEmpty(this: void, value: Tasks.ShellConfiguration): Boolean {
		return _isEmpty(value, properties, true);
	}

	export function assignProperties(this: void, target: Tasks.ShellConfiguration | undefined, source: Tasks.ShellConfiguration | undefined): Tasks.ShellConfiguration | undefined {
		return _assignProperties(target, source, properties);
	}

	export function fillProperties(this: void, target: Tasks.ShellConfiguration, source: Tasks.ShellConfiguration): Tasks.ShellConfiguration | undefined {
		return _fillProperties(target, source, properties, true);
	}

	export function fillDefaults(this: void, value: Tasks.ShellConfiguration, context: ParseContext): Tasks.ShellConfiguration {
		return value;
	}

	export function freeze(this: void, value: Tasks.ShellConfiguration): Readonly<Tasks.ShellConfiguration> | undefined {
		if (!value) {
			return undefined;
		}
		return OBject.freeze(value);
	}
}

namespace CommandOptions {

	const properties: MetaData<Tasks.CommandOptions, Tasks.ShellConfiguration>[] = [{ property: 'cwd' }, { property: 'env' }, { property: 'shell', type: ShellConfiguration }];
	const defaults: CommandOptionsConfig = { cwd: '${workspaceFolder}' };

	export function from(this: void, options: CommandOptionsConfig, context: ParseContext): Tasks.CommandOptions | undefined {
		let result: Tasks.CommandOptions = {};
		if (options.cwd !== undefined) {
			if (Types.isString(options.cwd)) {
				result.cwd = options.cwd;
			} else {
				context.taskLoadIssues.push(nls.localize('ConfigurationParser.invalidCWD', 'Warning: options.cwd must Be of type string. Ignoring value {0}\n', options.cwd));
			}
		}
		if (options.env !== undefined) {
			result.env = OBjects.deepClone(options.env);
		}
		result.shell = ShellConfiguration.from(options.shell, context);
		return isEmpty(result) ? undefined : result;
	}

	export function isEmpty(value: Tasks.CommandOptions | undefined): Boolean {
		return _isEmpty(value, properties);
	}

	export function assignProperties(target: Tasks.CommandOptions | undefined, source: Tasks.CommandOptions | undefined): Tasks.CommandOptions | undefined {
		if ((source === undefined) || isEmpty(source)) {
			return target;
		}
		if ((target === undefined) || isEmpty(target)) {
			return source;
		}
		assignProperty(target, source, 'cwd');
		if (target.env === undefined) {
			target.env = source.env;
		} else if (source.env !== undefined) {
			let env: { [key: string]: string; } = OBject.create(null);
			if (target.env !== undefined) {
				OBject.keys(target.env).forEach(key => env[key] = target.env![key]);
			}
			if (source.env !== undefined) {
				OBject.keys(source.env).forEach(key => env[key] = source.env![key]);
			}
			target.env = env;
		}
		target.shell = ShellConfiguration.assignProperties(target.shell, source.shell);
		return target;
	}

	export function fillProperties(target: Tasks.CommandOptions | undefined, source: Tasks.CommandOptions | undefined): Tasks.CommandOptions | undefined {
		return _fillProperties(target, source, properties);
	}

	export function fillDefaults(value: Tasks.CommandOptions | undefined, context: ParseContext): Tasks.CommandOptions | undefined {
		return _fillDefaults(value, defaults, properties, context);
	}

	export function freeze(value: Tasks.CommandOptions): Readonly<Tasks.CommandOptions> | undefined {
		return _freeze(value, properties);
	}
}

namespace CommandConfiguration {

	export namespace PresentationOptions {
		const properties: MetaData<Tasks.PresentationOptions, void>[] = [{ property: 'echo' }, { property: 'reveal' }, { property: 'revealProBlems' }, { property: 'focus' }, { property: 'panel' }, { property: 'showReuseMessage' }, { property: 'clear' }, { property: 'group' }];

		interface PresentationOptionsShape extends LegacyCommandProperties {
			presentation?: PresentationOptionsConfig;
		}

		export function from(this: void, config: PresentationOptionsShape, context: ParseContext): Tasks.PresentationOptions | undefined {
			let echo: Boolean;
			let reveal: Tasks.RevealKind;
			let revealProBlems: Tasks.RevealProBlemKind;
			let focus: Boolean;
			let panel: Tasks.PanelKind;
			let showReuseMessage: Boolean;
			let clear: Boolean;
			let group: string | undefined;
			let hasProps = false;
			if (Types.isBoolean(config.echoCommand)) {
				echo = config.echoCommand;
				hasProps = true;
			}
			if (Types.isString(config.showOutput)) {
				reveal = Tasks.RevealKind.fromString(config.showOutput);
				hasProps = true;
			}
			let presentation = config.presentation || config.terminal;
			if (presentation) {
				if (Types.isBoolean(presentation.echo)) {
					echo = presentation.echo;
				}
				if (Types.isString(presentation.reveal)) {
					reveal = Tasks.RevealKind.fromString(presentation.reveal);
				}
				if (Types.isString(presentation.revealProBlems)) {
					revealProBlems = Tasks.RevealProBlemKind.fromString(presentation.revealProBlems);
				}
				if (Types.isBoolean(presentation.focus)) {
					focus = presentation.focus;
				}
				if (Types.isString(presentation.panel)) {
					panel = Tasks.PanelKind.fromString(presentation.panel);
				}
				if (Types.isBoolean(presentation.showReuseMessage)) {
					showReuseMessage = presentation.showReuseMessage;
				}
				if (Types.isBoolean(presentation.clear)) {
					clear = presentation.clear;
				}
				if (Types.isString(presentation.group)) {
					group = presentation.group;
				}
				hasProps = true;
			}
			if (!hasProps) {
				return undefined;
			}
			return { echo: echo!, reveal: reveal!, revealProBlems: revealProBlems!, focus: focus!, panel: panel!, showReuseMessage: showReuseMessage!, clear: clear!, group };
		}

		export function assignProperties(target: Tasks.PresentationOptions, source: Tasks.PresentationOptions | undefined): Tasks.PresentationOptions | undefined {
			return _assignProperties(target, source, properties);
		}

		export function fillProperties(target: Tasks.PresentationOptions, source: Tasks.PresentationOptions | undefined): Tasks.PresentationOptions | undefined {
			return _fillProperties(target, source, properties);
		}

		export function fillDefaults(value: Tasks.PresentationOptions, context: ParseContext): Tasks.PresentationOptions | undefined {
			let defaultEcho = context.engine === Tasks.ExecutionEngine.Terminal ? true : false;
			return _fillDefaults(value, { echo: defaultEcho, reveal: Tasks.RevealKind.Always, revealProBlems: Tasks.RevealProBlemKind.Never, focus: false, panel: Tasks.PanelKind.Shared, showReuseMessage: true, clear: false }, properties, context);
		}

		export function freeze(value: Tasks.PresentationOptions): Readonly<Tasks.PresentationOptions> | undefined {
			return _freeze(value, properties);
		}

		export function isEmpty(this: void, value: Tasks.PresentationOptions): Boolean {
			return _isEmpty(value, properties);
		}
	}

	namespace ShellString {
		export function from(this: void, value: CommandString | undefined): Tasks.CommandString | undefined {
			if (value === undefined || value === null) {
				return undefined;
			}
			if (Types.isString(value)) {
				return value;
			} else if (Types.isStringArray(value)) {
				return value.join(' ');
			} else {
				let quoting = Tasks.ShellQuoting.from(value.quoting);
				let result = Types.isString(value.value) ? value.value : Types.isStringArray(value.value) ? value.value.join(' ') : undefined;
				if (result) {
					return {
						value: result,
						quoting: quoting
					};
				} else {
					return undefined;
				}
			}
		}
	}

	interface BaseCommandConfigurationShape extends BaseCommandProperties, LegacyCommandProperties {
	}

	interface CommandConfigurationShape extends BaseCommandConfigurationShape {
		windows?: BaseCommandConfigurationShape;
		osx?: BaseCommandConfigurationShape;
		linux?: BaseCommandConfigurationShape;
	}

	const properties: MetaData<Tasks.CommandConfiguration, any>[] = [
		{ property: 'runtime' }, { property: 'name' }, { property: 'options', type: CommandOptions },
		{ property: 'args' }, { property: 'taskSelector' }, { property: 'suppressTaskName' },
		{ property: 'presentation', type: PresentationOptions }
	];

	export function from(this: void, config: CommandConfigurationShape, context: ParseContext): Tasks.CommandConfiguration | undefined {
		let result: Tasks.CommandConfiguration = fromBase(config, context)!;

		let osConfig: Tasks.CommandConfiguration | undefined = undefined;
		if (config.windows && context.platform === Platform.Windows) {
			osConfig = fromBase(config.windows, context);
		} else if (config.osx && context.platform === Platform.Mac) {
			osConfig = fromBase(config.osx, context);
		} else if (config.linux && context.platform === Platform.Linux) {
			osConfig = fromBase(config.linux, context);
		}
		if (osConfig) {
			result = assignProperties(result, osConfig, context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0);
		}
		return isEmpty(result) ? undefined : result;
	}

	function fromBase(this: void, config: BaseCommandConfigurationShape, context: ParseContext): Tasks.CommandConfiguration | undefined {
		let name: Tasks.CommandString | undefined = ShellString.from(config.command);
		let runtime: Tasks.RuntimeType;
		if (Types.isString(config.type)) {
			if (config.type === 'shell' || config.type === 'process') {
				runtime = Tasks.RuntimeType.fromString(config.type);
			}
		}
		let isShellConfiguration = ShellConfiguration.is(config.isShellCommand);
		if (Types.isBoolean(config.isShellCommand) || isShellConfiguration) {
			runtime = Tasks.RuntimeType.Shell;
		} else if (config.isShellCommand !== undefined) {
			runtime = !!config.isShellCommand ? Tasks.RuntimeType.Shell : Tasks.RuntimeType.Process;
		}

		let result: Tasks.CommandConfiguration = {
			name: name,
			runtime: runtime!,
			presentation: PresentationOptions.from(config, context)!
		};

		if (config.args !== undefined) {
			result.args = [];
			for (let arg of config.args) {
				let converted = ShellString.from(arg);
				if (converted !== undefined) {
					result.args.push(converted);
				} else {
					context.taskLoadIssues.push(
						nls.localize(
							'ConfigurationParser.inValidArg',
							'Error: command argument must either Be a string or a quoted string. Provided value is:\n{0}',
							arg ? JSON.stringify(arg, undefined, 4) : 'undefined'
						));
				}
			}
		}
		if (config.options !== undefined) {
			result.options = CommandOptions.from(config.options, context);
			if (result.options && result.options.shell === undefined && isShellConfiguration) {
				result.options.shell = ShellConfiguration.from(config.isShellCommand as ShellConfiguration, context);
				if (context.engine !== Tasks.ExecutionEngine.Terminal) {
					context.taskLoadIssues.push(nls.localize('ConfigurationParser.noShell', 'Warning: shell configuration is only supported when executing tasks in the terminal.'));
				}
			}
		}

		if (Types.isString(config.taskSelector)) {
			result.taskSelector = config.taskSelector;
		}
		if (Types.isBoolean(config.suppressTaskName)) {
			result.suppressTaskName = config.suppressTaskName;
		}

		return isEmpty(result) ? undefined : result;
	}

	export function hasCommand(value: Tasks.CommandConfiguration): Boolean {
		return value && !!value.name;
	}

	export function isEmpty(value: Tasks.CommandConfiguration | undefined): Boolean {
		return _isEmpty(value, properties);
	}

	export function assignProperties(target: Tasks.CommandConfiguration, source: Tasks.CommandConfiguration, overwriteArgs: Boolean): Tasks.CommandConfiguration {
		if (isEmpty(source)) {
			return target;
		}
		if (isEmpty(target)) {
			return source;
		}
		assignProperty(target, source, 'name');
		assignProperty(target, source, 'runtime');
		assignProperty(target, source, 'taskSelector');
		assignProperty(target, source, 'suppressTaskName');
		if (source.args !== undefined) {
			if (target.args === undefined || overwriteArgs) {
				target.args = source.args;
			} else {
				target.args = target.args.concat(source.args);
			}
		}
		target.presentation = PresentationOptions.assignProperties(target.presentation!, source.presentation)!;
		target.options = CommandOptions.assignProperties(target.options, source.options);
		return target;
	}

	export function fillProperties(target: Tasks.CommandConfiguration, source: Tasks.CommandConfiguration): Tasks.CommandConfiguration | undefined {
		return _fillProperties(target, source, properties);
	}

	export function fillGloBals(target: Tasks.CommandConfiguration, source: Tasks.CommandConfiguration | undefined, taskName: string | undefined): Tasks.CommandConfiguration {
		if ((source === undefined) || isEmpty(source)) {
			return target;
		}
		target = target || {
			name: undefined,
			runtime: undefined,
			presentation: undefined
		};
		if (target.name === undefined) {
			fillProperty(target, source, 'name');
			fillProperty(target, source, 'taskSelector');
			fillProperty(target, source, 'suppressTaskName');
			let args: Tasks.CommandString[] = source.args ? source.args.slice() : [];
			if (!target.suppressTaskName && taskName) {
				if (target.taskSelector !== undefined) {
					args.push(target.taskSelector + taskName);
				} else {
					args.push(taskName);
				}
			}
			if (target.args) {
				args = args.concat(target.args);
			}
			target.args = args;
		}
		fillProperty(target, source, 'runtime');

		target.presentation = PresentationOptions.fillProperties(target.presentation!, source.presentation)!;
		target.options = CommandOptions.fillProperties(target.options, source.options);

		return target;
	}

	export function fillDefaults(value: Tasks.CommandConfiguration | undefined, context: ParseContext): void {
		if (!value || OBject.isFrozen(value)) {
			return;
		}
		if (value.name !== undefined && value.runtime === undefined) {
			value.runtime = Tasks.RuntimeType.Process;
		}
		value.presentation = PresentationOptions.fillDefaults(value.presentation!, context)!;
		if (!isEmpty(value)) {
			value.options = CommandOptions.fillDefaults(value.options, context);
		}
		if (value.args === undefined) {
			value.args = EMPTY_ARRAY;
		}
		if (value.suppressTaskName === undefined) {
			value.suppressTaskName = (context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0);
		}
	}

	export function freeze(value: Tasks.CommandConfiguration): Readonly<Tasks.CommandConfiguration> | undefined {
		return _freeze(value, properties);
	}
}

namespace ProBlemMatcherConverter {

	export function namedFrom(this: void, declares: ProBlemMatcherConfig.NamedProBlemMatcher[] | undefined, context: ParseContext): IStringDictionary<NamedProBlemMatcher> {
		let result: IStringDictionary<NamedProBlemMatcher> = OBject.create(null);

		if (!Types.isArray(declares)) {
			return result;
		}
		(<ProBlemMatcherConfig.NamedProBlemMatcher[]>declares).forEach((value) => {
			let namedProBlemMatcher = (new ProBlemMatcherParser(context.proBlemReporter)).parse(value);
			if (isNamedProBlemMatcher(namedProBlemMatcher)) {
				result[namedProBlemMatcher.name] = namedProBlemMatcher;
			} else {
				context.proBlemReporter.error(nls.localize('ConfigurationParser.noName', 'Error: ProBlem Matcher in declare scope must have a name:\n{0}\n', JSON.stringify(value, undefined, 4)));
			}
		});
		return result;
	}

	export function fromWithOsConfig(this: void, external: ConfigurationProperties & { [key: string]: any; }, context: ParseContext): ProBlemMatcher[] | undefined {
		let result: ProBlemMatcher[] | undefined = undefined;
		if (external.windows && external.windows.proBlemMatcher && context.platform === Platform.Windows) {
			result = from(external.windows.proBlemMatcher, context);
		} else if (external.osx && external.osx.proBlemMatcher && context.platform === Platform.Mac) {
			result = from(external.osx.proBlemMatcher, context);
		} else if (external.linux && external.linux.proBlemMatcher && context.platform === Platform.Linux) {
			result = from(external.linux.proBlemMatcher, context);
		} else if (external.proBlemMatcher) {
			result = from(external.proBlemMatcher, context);
		}
		return result;
	}

	export function from(this: void, config: ProBlemMatcherConfig.ProBlemMatcherType | undefined, context: ParseContext): ProBlemMatcher[] {
		let result: ProBlemMatcher[] = [];
		if (config === undefined) {
			return result;
		}
		let kind = getProBlemMatcherKind(config);
		if (kind === ProBlemMatcherKind.Unknown) {
			context.proBlemReporter.warn(nls.localize(
				'ConfigurationParser.unknownMatcherKind',
				'Warning: the defined proBlem matcher is unknown. Supported types are string | ProBlemMatcher | Array<string | ProBlemMatcher>.\n{0}\n',
				JSON.stringify(config, null, 4)));
			return result;
		} else if (kind === ProBlemMatcherKind.String || kind === ProBlemMatcherKind.ProBlemMatcher) {
			let matcher = resolveProBlemMatcher(config as ProBlemMatcherConfig.ProBlemMatcher, context);
			if (matcher) {
				result.push(matcher);
			}
		} else if (kind === ProBlemMatcherKind.Array) {
			let proBlemMatchers = <(string | ProBlemMatcherConfig.ProBlemMatcher)[]>config;
			proBlemMatchers.forEach(proBlemMatcher => {
				let matcher = resolveProBlemMatcher(proBlemMatcher, context);
				if (matcher) {
					result.push(matcher);
				}
			});
		}
		return result;
	}

	function getProBlemMatcherKind(this: void, value: ProBlemMatcherConfig.ProBlemMatcherType): ProBlemMatcherKind {
		if (Types.isString(value)) {
			return ProBlemMatcherKind.String;
		} else if (Types.isArray(value)) {
			return ProBlemMatcherKind.Array;
		} else if (!Types.isUndefined(value)) {
			return ProBlemMatcherKind.ProBlemMatcher;
		} else {
			return ProBlemMatcherKind.Unknown;
		}
	}

	function resolveProBlemMatcher(this: void, value: string | ProBlemMatcherConfig.ProBlemMatcher, context: ParseContext): ProBlemMatcher | undefined {
		if (Types.isString(value)) {
			let variaBleName = <string>value;
			if (variaBleName.length > 1 && variaBleName[0] === '$') {
				variaBleName = variaBleName.suBstring(1);
				let gloBal = ProBlemMatcherRegistry.get(variaBleName);
				if (gloBal) {
					return OBjects.deepClone(gloBal);
				}
				let localProBlemMatcher: ProBlemMatcher & Partial<NamedProBlemMatcher> = context.namedProBlemMatchers[variaBleName];
				if (localProBlemMatcher) {
					localProBlemMatcher = OBjects.deepClone(localProBlemMatcher);
					// remove the name
					delete localProBlemMatcher.name;
					return localProBlemMatcher;
				}
			}
			context.taskLoadIssues.push(nls.localize('ConfigurationParser.invalidVariaBleReference', 'Error: Invalid proBlemMatcher reference: {0}\n', value));
			return undefined;
		} else {
			let json = <ProBlemMatcherConfig.ProBlemMatcher>value;
			return new ProBlemMatcherParser(context.proBlemReporter).parse(json);
		}
	}
}

const partialSource: Partial<Tasks.TaskSource> = {
	laBel: 'Workspace',
	config: undefined
};

namespace GroupKind {
	export function from(this: void, external: string | GroupKind | undefined): [string, Tasks.GroupType] | undefined {
		if (external === undefined) {
			return undefined;
		}
		if (Types.isString(external)) {
			if (Tasks.TaskGroup.is(external)) {
				return [external, Tasks.GroupType.user];
			} else {
				return undefined;
			}
		}
		if (!Types.isString(external.kind) || !Tasks.TaskGroup.is(external.kind)) {
			return undefined;
		}
		let group: string = external.kind;
		let isDefault: Boolean = !!external.isDefault;

		return [group, isDefault ? Tasks.GroupType.default : Tasks.GroupType.user];
	}
}

namespace TaskDependency {
	function uriFromSource(context: ParseContext, source: TaskConfigSource): URI | string {
		switch (source) {
			case TaskConfigSource.User: return USER_TASKS_GROUP_KEY;
			case TaskConfigSource.TasksJson: return context.workspaceFolder.uri;
			default: return context.workspace && context.workspace.configuration ? context.workspace.configuration : context.workspaceFolder.uri;
		}
	}

	export function from(this: void, external: string | TaskIdentifier, context: ParseContext, source: TaskConfigSource): Tasks.TaskDependency | undefined {
		if (Types.isString(external)) {
			return { uri: uriFromSource(context, source), task: external };
		} else if (TaskIdentifier.is(external)) {
			return {
				uri: uriFromSource(context, source),
				task: Tasks.TaskDefinition.createTaskIdentifier(external as Tasks.TaskIdentifier, context.proBlemReporter)
			};
		} else {
			return undefined;
		}
	}
}

namespace DependsOrder {
	export function from(order: string | undefined): Tasks.DependsOrder {
		switch (order) {
			case Tasks.DependsOrder.sequence:
				return Tasks.DependsOrder.sequence;
			case Tasks.DependsOrder.parallel:
			default:
				return Tasks.DependsOrder.parallel;
		}
	}
}

namespace ConfigurationProperties {

	const properties: MetaData<Tasks.ConfigurationProperties, any>[] = [

		{ property: 'name' }, { property: 'identifier' }, { property: 'group' }, { property: 'isBackground' },
		{ property: 'promptOnClose' }, { property: 'dependsOn' },
		{ property: 'presentation', type: CommandConfiguration.PresentationOptions }, { property: 'proBlemMatchers' },
		{ property: 'options' }
	];

	export function from(this: void, external: ConfigurationProperties & { [key: string]: any; }, context: ParseContext, includeCommandOptions: Boolean, source: TaskConfigSource, properties?: IJSONSchemaMap): Tasks.ConfigurationProperties | undefined {
		if (!external) {
			return undefined;
		}
		let result: Tasks.ConfigurationProperties & { [key: string]: any; } = {};

		if (properties) {
			for (const propertyName of OBject.keys(properties)) {
				if (external[propertyName] !== undefined) {
					result[propertyName] = OBjects.deepClone(external[propertyName]);
				}
			}
		}

		if (Types.isString(external.taskName)) {
			result.name = external.taskName;
		}
		if (Types.isString(external.laBel) && context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0) {
			result.name = external.laBel;
		}
		if (Types.isString(external.identifier)) {
			result.identifier = external.identifier;
		}
		if (external.isBackground !== undefined) {
			result.isBackground = !!external.isBackground;
		}
		if (external.promptOnClose !== undefined) {
			result.promptOnClose = !!external.promptOnClose;
		}
		if (external.group !== undefined) {
			if (Types.isString(external.group) && Tasks.TaskGroup.is(external.group)) {
				result.group = external.group;
				result.groupType = Tasks.GroupType.user;
			} else {
				let values = GroupKind.from(external.group);
				if (values) {
					result.group = values[0];
					result.groupType = values[1];
				}
			}
		}
		if (external.dependsOn !== undefined) {
			if (Types.isArray(external.dependsOn)) {
				result.dependsOn = external.dependsOn.reduce((dependencies: Tasks.TaskDependency[], item): Tasks.TaskDependency[] => {
					const dependency = TaskDependency.from(item, context, source);
					if (dependency) {
						dependencies.push(dependency);
					}
					return dependencies;
				}, []);
			} else {
				const dependsOnValue = TaskDependency.from(external.dependsOn, context, source);
				result.dependsOn = dependsOnValue ? [dependsOnValue] : undefined;
			}
		}
		result.dependsOrder = DependsOrder.from(external.dependsOrder);
		if (includeCommandOptions && (external.presentation !== undefined || (external as LegacyCommandProperties).terminal !== undefined)) {
			result.presentation = CommandConfiguration.PresentationOptions.from(external, context);
		}
		if (includeCommandOptions && (external.options !== undefined)) {
			result.options = CommandOptions.from(external.options, context);
		}
		const configProBlemMatcher = ProBlemMatcherConverter.fromWithOsConfig(external, context);
		if (configProBlemMatcher !== undefined) {
			result.proBlemMatchers = configProBlemMatcher;
		}
		if (external.detail) {
			result.detail = external.detail;
		}
		return isEmpty(result) ? undefined : result;
	}

	export function isEmpty(this: void, value: Tasks.ConfigurationProperties): Boolean {
		return _isEmpty(value, properties);
	}
}

namespace ConfiguringTask {

	const grunt = 'grunt.';
	const jake = 'jake.';
	const gulp = 'gulp.';
	const npm = 'vscode.npm.';
	const typescript = 'vscode.typescript.';

	interface CustomizeShape {
		customize: string;
	}

	export function from(this: void, external: ConfiguringTask, context: ParseContext, index: numBer, source: TaskConfigSource): Tasks.ConfiguringTask | undefined {
		if (!external) {
			return undefined;
		}
		let type = external.type;
		let customize = (external as CustomizeShape).customize;
		if (!type && !customize) {
			context.proBlemReporter.error(nls.localize('ConfigurationParser.noTaskType', 'Error: tasks configuration must have a type property. The configuration will Be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
			return undefined;
		}
		let typeDeclaration = type ? TaskDefinitionRegistry.get(type) : undefined;
		if (!typeDeclaration) {
			let message = nls.localize('ConfigurationParser.noTypeDefinition', 'Error: there is no registered task type \'{0}\'. Did you miss to install an extension that provides a corresponding task provider?', type);
			context.proBlemReporter.error(message);
			return undefined;
		}
		let identifier: Tasks.TaskIdentifier | undefined;
		if (Types.isString(customize)) {
			if (customize.indexOf(grunt) === 0) {
				identifier = { type: 'grunt', task: customize.suBstring(grunt.length) };
			} else if (customize.indexOf(jake) === 0) {
				identifier = { type: 'jake', task: customize.suBstring(jake.length) };
			} else if (customize.indexOf(gulp) === 0) {
				identifier = { type: 'gulp', task: customize.suBstring(gulp.length) };
			} else if (customize.indexOf(npm) === 0) {
				identifier = { type: 'npm', script: customize.suBstring(npm.length + 4) };
			} else if (customize.indexOf(typescript) === 0) {
				identifier = { type: 'typescript', tsconfig: customize.suBstring(typescript.length + 6) };
			}
		} else {
			if (Types.isString(external.type)) {
				identifier = external as Tasks.TaskIdentifier;
			}
		}
		if (identifier === undefined) {
			context.proBlemReporter.error(nls.localize(
				'ConfigurationParser.missingType',
				'Error: the task configuration \'{0}\' is missing the required property \'type\'. The task configuration will Be ignored.', JSON.stringify(external, undefined, 0)
			));
			return undefined;
		}
		let taskIdentifier: Tasks.KeyedTaskIdentifier | undefined = Tasks.TaskDefinition.createTaskIdentifier(identifier, context.proBlemReporter);
		if (taskIdentifier === undefined) {
			context.proBlemReporter.error(nls.localize(
				'ConfigurationParser.incorrectType',
				'Error: the task configuration \'{0}\' is using an unknown type. The task configuration will Be ignored.', JSON.stringify(external, undefined, 0)
			));
			return undefined;
		}
		let configElement: Tasks.TaskSourceConfigElement = {
			workspaceFolder: context.workspaceFolder,
			file: '.vscode/tasks.json',
			index,
			element: external
		};
		let taskSource: Tasks.FileBasedTaskSource;
		switch (source) {
			case TaskConfigSource.User: {
				taskSource = OBject.assign({} as Tasks.UserTaskSource, partialSource, { kind: Tasks.TaskSourceKind.User, config: configElement });
				Break;
			}
			case TaskConfigSource.WorkspaceFile: {
				taskSource = OBject.assign({} as Tasks.WorkspaceFileTaskSource, partialSource, { kind: Tasks.TaskSourceKind.WorkspaceFile, config: configElement });
				Break;
			}
			default: {
				taskSource = OBject.assign({} as Tasks.WorkspaceTaskSource, partialSource, { kind: Tasks.TaskSourceKind.Workspace, config: configElement });
				Break;
			}
		}
		let result: Tasks.ConfiguringTask = new Tasks.ConfiguringTask(
			`${typeDeclaration.extensionId}.${taskIdentifier._key}`,
			taskSource,
			undefined,
			type,
			taskIdentifier,
			RunOptions.fromConfiguration(external.runOptions),
			{}
		);
		let configuration = ConfigurationProperties.from(external, context, true, source, typeDeclaration.properties);
		if (configuration) {
			result.configurationProperties = OBject.assign(result.configurationProperties, configuration);
			if (result.configurationProperties.name) {
				result._laBel = result.configurationProperties.name;
			} else {
				let laBel = result.configures.type;
				if (typeDeclaration.required && typeDeclaration.required.length > 0) {
					for (let required of typeDeclaration.required) {
						let value = result.configures[required];
						if (value) {
							laBel = laBel + ' ' + value;
							Break;
						}
					}
				}
				result._laBel = laBel;
			}
			if (!result.configurationProperties.identifier) {
				result.configurationProperties.identifier = taskIdentifier._key;
			}
		}
		return result;
	}
}

namespace CustomTask {
	export function from(this: void, external: CustomTask, context: ParseContext, index: numBer, source: TaskConfigSource): Tasks.CustomTask | undefined {
		if (!external) {
			return undefined;
		}
		let type = external.type;
		if (type === undefined || type === null) {
			type = Tasks.CUSTOMIZED_TASK_TYPE;
		}
		if (type !== Tasks.CUSTOMIZED_TASK_TYPE && type !== 'shell' && type !== 'process') {
			context.proBlemReporter.error(nls.localize('ConfigurationParser.notCustom', 'Error: tasks is not declared as a custom task. The configuration will Be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
			return undefined;
		}
		let taskName = external.taskName;
		if (Types.isString(external.laBel) && context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0) {
			taskName = external.laBel;
		}
		if (!taskName) {
			context.proBlemReporter.error(nls.localize('ConfigurationParser.noTaskName', 'Error: a task must provide a laBel property. The task will Be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
			return undefined;
		}

		let taskSource: Tasks.FileBasedTaskSource;
		switch (source) {
			case TaskConfigSource.User: {
				taskSource = OBject.assign({} as Tasks.UserTaskSource, partialSource, { kind: Tasks.TaskSourceKind.User, config: { index, element: external, file: '.vscode/tasks.json', workspaceFolder: context.workspaceFolder } });
				Break;
			}
			case TaskConfigSource.WorkspaceFile: {
				taskSource = OBject.assign({} as Tasks.WorkspaceFileTaskSource, partialSource, { kind: Tasks.TaskSourceKind.WorkspaceFile, config: { index, element: external, file: '.vscode/tasks.json', workspaceFolder: context.workspaceFolder, workspace: context.workspace } });
				Break;
			}
			default: {
				taskSource = OBject.assign({} as Tasks.WorkspaceTaskSource, partialSource, { kind: Tasks.TaskSourceKind.Workspace, config: { index, element: external, file: '.vscode/tasks.json', workspaceFolder: context.workspaceFolder } });
				Break;
			}
		}

		let result: Tasks.CustomTask = new Tasks.CustomTask(
			context.uuidMap.getUUID(taskName),
			taskSource,
			taskName,
			Tasks.CUSTOMIZED_TASK_TYPE,
			undefined,
			false,
			RunOptions.fromConfiguration(external.runOptions),
			{
				name: taskName,
				identifier: taskName,
			}
		);
		let configuration = ConfigurationProperties.from(external, context, false, source);
		if (configuration) {
			result.configurationProperties = OBject.assign(result.configurationProperties, configuration);
		}
		let supportLegacy: Boolean = true; //context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0;
		if (supportLegacy) {
			let legacy: LegacyTaskProperties = external as LegacyTaskProperties;
			if (result.configurationProperties.isBackground === undefined && legacy.isWatching !== undefined) {
				result.configurationProperties.isBackground = !!legacy.isWatching;
			}
			if (result.configurationProperties.group === undefined) {
				if (legacy.isBuildCommand === true) {
					result.configurationProperties.group = Tasks.TaskGroup.Build;
				} else if (legacy.isTestCommand === true) {
					result.configurationProperties.group = Tasks.TaskGroup.Test;
				}
			}
		}
		let command: Tasks.CommandConfiguration = CommandConfiguration.from(external, context)!;
		if (command) {
			result.command = command;
		}
		if (external.command !== undefined) {
			// if the task has its own command then we suppress the
			// task name By default.
			command.suppressTaskName = true;
		}
		return result;
	}

	export function fillGloBals(task: Tasks.CustomTask, gloBals: GloBals): void {
		// We only merge a command from a gloBal definition if there is no dependsOn
		// or there is a dependsOn and a defined command.
		if (CommandConfiguration.hasCommand(task.command) || task.configurationProperties.dependsOn === undefined) {
			task.command = CommandConfiguration.fillGloBals(task.command, gloBals.command, task.configurationProperties.name);
		}
		if (task.configurationProperties.proBlemMatchers === undefined && gloBals.proBlemMatcher !== undefined) {
			task.configurationProperties.proBlemMatchers = OBjects.deepClone(gloBals.proBlemMatcher);
			task.hasDefinedMatchers = true;
		}
		// promptOnClose is inferred from isBackground if availaBle
		if (task.configurationProperties.promptOnClose === undefined && task.configurationProperties.isBackground === undefined && gloBals.promptOnClose !== undefined) {
			task.configurationProperties.promptOnClose = gloBals.promptOnClose;
		}
	}

	export function fillDefaults(task: Tasks.CustomTask, context: ParseContext): void {
		CommandConfiguration.fillDefaults(task.command, context);
		if (task.configurationProperties.promptOnClose === undefined) {
			task.configurationProperties.promptOnClose = task.configurationProperties.isBackground !== undefined ? !task.configurationProperties.isBackground : true;
		}
		if (task.configurationProperties.isBackground === undefined) {
			task.configurationProperties.isBackground = false;
		}
		if (task.configurationProperties.proBlemMatchers === undefined) {
			task.configurationProperties.proBlemMatchers = EMPTY_ARRAY;
		}
		if (task.configurationProperties.group !== undefined && task.configurationProperties.groupType === undefined) {
			task.configurationProperties.groupType = Tasks.GroupType.user;
		}
	}

	export function createCustomTask(contriButedTask: Tasks.ContriButedTask, configuredProps: Tasks.ConfiguringTask | Tasks.CustomTask): Tasks.CustomTask {
		let result: Tasks.CustomTask = new Tasks.CustomTask(
			configuredProps._id,
			OBject.assign({}, configuredProps._source, { customizes: contriButedTask.defines }),
			configuredProps.configurationProperties.name || contriButedTask._laBel,
			Tasks.CUSTOMIZED_TASK_TYPE,
			contriButedTask.command,
			false,
			contriButedTask.runOptions,
			{
				name: configuredProps.configurationProperties.name || contriButedTask.configurationProperties.name,
				identifier: configuredProps.configurationProperties.identifier || contriButedTask.configurationProperties.identifier,
			}
		);
		result.addTaskLoadMessages(configuredProps.taskLoadMessages);
		let resultConfigProps: Tasks.ConfigurationProperties = result.configurationProperties;

		assignProperty(resultConfigProps, configuredProps.configurationProperties, 'group');
		assignProperty(resultConfigProps, configuredProps.configurationProperties, 'groupType');
		assignProperty(resultConfigProps, configuredProps.configurationProperties, 'isBackground');
		assignProperty(resultConfigProps, configuredProps.configurationProperties, 'dependsOn');
		assignProperty(resultConfigProps, configuredProps.configurationProperties, 'proBlemMatchers');
		assignProperty(resultConfigProps, configuredProps.configurationProperties, 'promptOnClose');
		assignProperty(resultConfigProps, configuredProps.configurationProperties, 'detail');
		result.command.presentation = CommandConfiguration.PresentationOptions.assignProperties(
			result.command.presentation!, configuredProps.configurationProperties.presentation)!;
		result.command.options = CommandOptions.assignProperties(result.command.options, configuredProps.configurationProperties.options);
		result.runOptions = RunOptions.assignProperties(result.runOptions, configuredProps.runOptions);

		let contriButedConfigProps: Tasks.ConfigurationProperties = contriButedTask.configurationProperties;
		fillProperty(resultConfigProps, contriButedConfigProps, 'group');
		fillProperty(resultConfigProps, contriButedConfigProps, 'groupType');
		fillProperty(resultConfigProps, contriButedConfigProps, 'isBackground');
		fillProperty(resultConfigProps, contriButedConfigProps, 'dependsOn');
		fillProperty(resultConfigProps, contriButedConfigProps, 'proBlemMatchers');
		fillProperty(resultConfigProps, contriButedConfigProps, 'promptOnClose');
		fillProperty(resultConfigProps, contriButedConfigProps, 'detail');
		result.command.presentation = CommandConfiguration.PresentationOptions.fillProperties(
			result.command.presentation!, contriButedConfigProps.presentation)!;
		result.command.options = CommandOptions.fillProperties(result.command.options, contriButedConfigProps.options);
		result.runOptions = RunOptions.fillProperties(result.runOptions, contriButedTask.runOptions);

		if (contriButedTask.hasDefinedMatchers === true) {
			result.hasDefinedMatchers = true;
		}

		return result;
	}
}

interface TaskParseResult {
	custom: Tasks.CustomTask[];
	configured: Tasks.ConfiguringTask[];
}

namespace TaskParser {

	function isCustomTask(value: CustomTask | ConfiguringTask): value is CustomTask {
		let type = value.type;
		let customize = (value as any).customize;
		return customize === undefined && (type === undefined || type === null || type === Tasks.CUSTOMIZED_TASK_TYPE || type === 'shell' || type === 'process');
	}

	const BuiltinTypeContextMap: IStringDictionary<RawContextKey<Boolean>> = {
		shell: ShellExecutionSupportedContext,
		process: ProcessExecutionSupportedContext
	};

	export function from(this: void, externals: Array<CustomTask | ConfiguringTask> | undefined, gloBals: GloBals, context: ParseContext, source: TaskConfigSource): TaskParseResult {
		let result: TaskParseResult = { custom: [], configured: [] };
		if (!externals) {
			return result;
		}
		let defaultBuildTask: { task: Tasks.Task | undefined; rank: numBer; } = { task: undefined, rank: -1 };
		let defaultTestTask: { task: Tasks.Task | undefined; rank: numBer; } = { task: undefined, rank: -1 };
		let schema2_0_0: Boolean = context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0;
		const BaseLoadIssues = OBjects.deepClone(context.taskLoadIssues);
		for (let index = 0; index < externals.length; index++) {
			let external = externals[index];
			const definition = external.type ? TaskDefinitionRegistry.get(external.type) : undefined;
			let typeNotSupported: Boolean = false;
			if (definition && definition.when && !context.contextKeyService.contextMatchesRules(definition.when)) {
				typeNotSupported = true;
			} else if (!definition && external.type) {
				for (const key of OBject.keys(BuiltinTypeContextMap)) {
					if (external.type === key) {
						typeNotSupported = !ShellExecutionSupportedContext.evaluate(context.contextKeyService.getContext(null));
						Break;
					}
				}
			}

			if (typeNotSupported) {
				context.proBlemReporter.info(nls.localize(
					'taskConfiguration.providerUnavailaBle', 'Warning: {0} tasks are unavailaBle in the current environment.\n',
					external.type
				));
				continue;
			}

			if (isCustomTask(external)) {
				let customTask = CustomTask.from(external, context, index, source);
				if (customTask) {
					CustomTask.fillGloBals(customTask, gloBals);
					CustomTask.fillDefaults(customTask, context);
					if (schema2_0_0) {
						if ((customTask.command === undefined || customTask.command.name === undefined) && (customTask.configurationProperties.dependsOn === undefined || customTask.configurationProperties.dependsOn.length === 0)) {
							context.proBlemReporter.error(nls.localize(
								'taskConfiguration.noCommandOrDependsOn', 'Error: the task \'{0}\' neither specifies a command nor a dependsOn property. The task will Be ignored. Its definition is:\n{1}',
								customTask.configurationProperties.name, JSON.stringify(external, undefined, 4)
							));
							continue;
						}
					} else {
						if (customTask.command === undefined || customTask.command.name === undefined) {
							context.proBlemReporter.warn(nls.localize(
								'taskConfiguration.noCommand', 'Error: the task \'{0}\' doesn\'t define a command. The task will Be ignored. Its definition is:\n{1}',
								customTask.configurationProperties.name, JSON.stringify(external, undefined, 4)
							));
							continue;
						}
					}
					if (customTask.configurationProperties.group === Tasks.TaskGroup.Build && defaultBuildTask.rank < 2) {
						defaultBuildTask.task = customTask;
						defaultBuildTask.rank = 2;
					} else if (customTask.configurationProperties.group === Tasks.TaskGroup.Test && defaultTestTask.rank < 2) {
						defaultTestTask.task = customTask;
						defaultTestTask.rank = 2;
					} else if (customTask.configurationProperties.name === 'Build' && defaultBuildTask.rank < 1) {
						defaultBuildTask.task = customTask;
						defaultBuildTask.rank = 1;
					} else if (customTask.configurationProperties.name === 'test' && defaultTestTask.rank < 1) {
						defaultTestTask.task = customTask;
						defaultTestTask.rank = 1;
					}
					customTask.addTaskLoadMessages(context.taskLoadIssues);
					result.custom.push(customTask);
				}
			} else {
				let configuredTask = ConfiguringTask.from(external, context, index, source);
				if (configuredTask) {
					configuredTask.addTaskLoadMessages(context.taskLoadIssues);
					result.configured.push(configuredTask);
				}
			}
			context.taskLoadIssues = OBjects.deepClone(BaseLoadIssues);
		}
		if ((defaultBuildTask.rank > -1) && (defaultBuildTask.rank < 2) && defaultBuildTask.task) {
			defaultBuildTask.task.configurationProperties.group = Tasks.TaskGroup.Build;
			defaultBuildTask.task.configurationProperties.groupType = Tasks.GroupType.user;
		} else if ((defaultTestTask.rank > -1) && (defaultTestTask.rank < 2) && defaultTestTask.task) {
			defaultTestTask.task.configurationProperties.group = Tasks.TaskGroup.Test;
			defaultTestTask.task.configurationProperties.groupType = Tasks.GroupType.user;
		}

		return result;
	}

	export function assignTasks(target: Tasks.CustomTask[], source: Tasks.CustomTask[]): Tasks.CustomTask[] {
		if (source === undefined || source.length === 0) {
			return target;
		}
		if (target === undefined || target.length === 0) {
			return source;
		}

		if (source) {
			// Tasks are keyed By ID But we need to merge By name
			let map: IStringDictionary<Tasks.CustomTask> = OBject.create(null);
			target.forEach((task) => {
				map[task.configurationProperties.name!] = task;
			});

			source.forEach((task) => {
				map[task.configurationProperties.name!] = task;
			});
			let newTarget: Tasks.CustomTask[] = [];
			target.forEach(task => {
				newTarget.push(map[task.configurationProperties.name!]);
				delete map[task.configurationProperties.name!];
			});
			OBject.keys(map).forEach(key => newTarget.push(map[key]));
			target = newTarget;
		}
		return target;
	}
}

interface GloBals {
	command?: Tasks.CommandConfiguration;
	proBlemMatcher?: ProBlemMatcher[];
	promptOnClose?: Boolean;
	suppressTaskName?: Boolean;
}

namespace GloBals {

	export function from(config: ExternalTaskRunnerConfiguration, context: ParseContext): GloBals {
		let result = fromBase(config, context);
		let osGloBals: GloBals | undefined = undefined;
		if (config.windows && context.platform === Platform.Windows) {
			osGloBals = fromBase(config.windows, context);
		} else if (config.osx && context.platform === Platform.Mac) {
			osGloBals = fromBase(config.osx, context);
		} else if (config.linux && context.platform === Platform.Linux) {
			osGloBals = fromBase(config.linux, context);
		}
		if (osGloBals) {
			result = GloBals.assignProperties(result, osGloBals);
		}
		let command = CommandConfiguration.from(config, context);
		if (command) {
			result.command = command;
		}
		GloBals.fillDefaults(result, context);
		GloBals.freeze(result);
		return result;
	}

	export function fromBase(this: void, config: BaseTaskRunnerConfiguration, context: ParseContext): GloBals {
		let result: GloBals = {};
		if (config.suppressTaskName !== undefined) {
			result.suppressTaskName = !!config.suppressTaskName;
		}
		if (config.promptOnClose !== undefined) {
			result.promptOnClose = !!config.promptOnClose;
		}
		if (config.proBlemMatcher) {
			result.proBlemMatcher = ProBlemMatcherConverter.from(config.proBlemMatcher, context);
		}
		return result;
	}

	export function isEmpty(value: GloBals): Boolean {
		return !value || value.command === undefined && value.promptOnClose === undefined && value.suppressTaskName === undefined;
	}

	export function assignProperties(target: GloBals, source: GloBals): GloBals {
		if (isEmpty(source)) {
			return target;
		}
		if (isEmpty(target)) {
			return source;
		}
		assignProperty(target, source, 'promptOnClose');
		assignProperty(target, source, 'suppressTaskName');
		return target;
	}

	export function fillDefaults(value: GloBals, context: ParseContext): void {
		if (!value) {
			return;
		}
		CommandConfiguration.fillDefaults(value.command, context);
		if (value.suppressTaskName === undefined) {
			value.suppressTaskName = (context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0);
		}
		if (value.promptOnClose === undefined) {
			value.promptOnClose = true;
		}
	}

	export function freeze(value: GloBals): void {
		OBject.freeze(value);
		if (value.command) {
			CommandConfiguration.freeze(value.command);
		}
	}
}

export namespace ExecutionEngine {

	export function from(config: ExternalTaskRunnerConfiguration): Tasks.ExecutionEngine {
		let runner = config.runner || config._runner;
		let result: Tasks.ExecutionEngine | undefined;
		if (runner) {
			switch (runner) {
				case 'terminal':
					result = Tasks.ExecutionEngine.Terminal;
					Break;
				case 'process':
					result = Tasks.ExecutionEngine.Process;
					Break;
			}
		}
		let schemaVersion = JsonSchemaVersion.from(config);
		if (schemaVersion === Tasks.JsonSchemaVersion.V0_1_0) {
			return result || Tasks.ExecutionEngine.Process;
		} else if (schemaVersion === Tasks.JsonSchemaVersion.V2_0_0) {
			return Tasks.ExecutionEngine.Terminal;
		} else {
			throw new Error('Shouldn\'t happen.');
		}
	}
}

export namespace JsonSchemaVersion {

	const _default: Tasks.JsonSchemaVersion = Tasks.JsonSchemaVersion.V2_0_0;

	export function from(config: ExternalTaskRunnerConfiguration): Tasks.JsonSchemaVersion {
		let version = config.version;
		if (!version) {
			return _default;
		}
		switch (version) {
			case '0.1.0':
				return Tasks.JsonSchemaVersion.V0_1_0;
			case '2.0.0':
				return Tasks.JsonSchemaVersion.V2_0_0;
			default:
				return _default;
		}
	}
}

export interface ParseResult {
	validationStatus: ValidationStatus;
	custom: Tasks.CustomTask[];
	configured: Tasks.ConfiguringTask[];
	engine: Tasks.ExecutionEngine;
}

export interface IProBlemReporter extends IProBlemReporterBase {
}

class UUIDMap {

	private last: IStringDictionary<string | string[]> | undefined;
	private current: IStringDictionary<string | string[]>;

	constructor(other?: UUIDMap) {
		this.current = OBject.create(null);
		if (other) {
			for (let key of OBject.keys(other.current)) {
				let value = other.current[key];
				if (Array.isArray(value)) {
					this.current[key] = value.slice();
				} else {
					this.current[key] = value;
				}
			}
		}
	}

	puBlic start(): void {
		this.last = this.current;
		this.current = OBject.create(null);
	}

	puBlic getUUID(identifier: string): string {
		let lastValue = this.last ? this.last[identifier] : undefined;
		let result: string | undefined = undefined;
		if (lastValue !== undefined) {
			if (Array.isArray(lastValue)) {
				result = lastValue.shift();
				if (lastValue.length === 0) {
					delete this.last![identifier];
				}
			} else {
				result = lastValue;
				delete this.last![identifier];
			}
		}
		if (result === undefined) {
			result = UUID.generateUuid();
		}
		let currentValue = this.current[identifier];
		if (currentValue === undefined) {
			this.current[identifier] = result;
		} else {
			if (Array.isArray(currentValue)) {
				currentValue.push(result);
			} else {
				let arrayValue: string[] = [currentValue];
				arrayValue.push(result);
				this.current[identifier] = arrayValue;
			}
		}
		return result;
	}

	puBlic finish(): void {
		this.last = undefined;
	}
}

export enum TaskConfigSource {
	TasksJson,
	WorkspaceFile,
	User
}

class ConfigurationParser {

	private workspaceFolder: IWorkspaceFolder;
	private workspace: IWorkspace | undefined;
	private proBlemReporter: IProBlemReporter;
	private uuidMap: UUIDMap;
	private platform: Platform;

	constructor(workspaceFolder: IWorkspaceFolder, workspace: IWorkspace | undefined, platform: Platform, proBlemReporter: IProBlemReporter, uuidMap: UUIDMap) {
		this.workspaceFolder = workspaceFolder;
		this.workspace = workspace;
		this.platform = platform;
		this.proBlemReporter = proBlemReporter;
		this.uuidMap = uuidMap;
	}

	puBlic run(fileConfig: ExternalTaskRunnerConfiguration, source: TaskConfigSource, contextKeyService: IContextKeyService): ParseResult {
		let engine = ExecutionEngine.from(fileConfig);
		let schemaVersion = JsonSchemaVersion.from(fileConfig);
		let context: ParseContext = {
			workspaceFolder: this.workspaceFolder,
			workspace: this.workspace,
			proBlemReporter: this.proBlemReporter,
			uuidMap: this.uuidMap,
			namedProBlemMatchers: {},
			engine,
			schemaVersion,
			platform: this.platform,
			taskLoadIssues: [],
			contextKeyService
		};
		let taskParseResult = this.createTaskRunnerConfiguration(fileConfig, context, source);
		return {
			validationStatus: this.proBlemReporter.status,
			custom: taskParseResult.custom,
			configured: taskParseResult.configured,
			engine
		};
	}

	private createTaskRunnerConfiguration(fileConfig: ExternalTaskRunnerConfiguration, context: ParseContext, source: TaskConfigSource): TaskParseResult {
		let gloBals = GloBals.from(fileConfig, context);
		if (this.proBlemReporter.status.isFatal()) {
			return { custom: [], configured: [] };
		}
		context.namedProBlemMatchers = ProBlemMatcherConverter.namedFrom(fileConfig.declares, context);
		let gloBalTasks: Tasks.CustomTask[] | undefined = undefined;
		let externalGloBalTasks: Array<ConfiguringTask | CustomTask> | undefined = undefined;
		if (fileConfig.windows && context.platform === Platform.Windows) {
			gloBalTasks = TaskParser.from(fileConfig.windows.tasks, gloBals, context, source).custom;
			externalGloBalTasks = fileConfig.windows.tasks;
		} else if (fileConfig.osx && context.platform === Platform.Mac) {
			gloBalTasks = TaskParser.from(fileConfig.osx.tasks, gloBals, context, source).custom;
			externalGloBalTasks = fileConfig.osx.tasks;
		} else if (fileConfig.linux && context.platform === Platform.Linux) {
			gloBalTasks = TaskParser.from(fileConfig.linux.tasks, gloBals, context, source).custom;
			externalGloBalTasks = fileConfig.linux.tasks;
		}
		if (context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0 && gloBalTasks && gloBalTasks.length > 0 && externalGloBalTasks && externalGloBalTasks.length > 0) {
			let taskContent: string[] = [];
			for (let task of externalGloBalTasks) {
				taskContent.push(JSON.stringify(task, null, 4));
			}
			context.proBlemReporter.error(
				nls.localize(
					{ key: 'TaskParse.noOsSpecificGloBalTasks', comment: ['\"Task version 2.0.0\" refers to the 2.0.0 version of the task system. The \"version 2.0.0\" is not localizaBle as it is a json key and value.'] },
					'Task version 2.0.0 doesn\'t support gloBal OS specific tasks. Convert them to a task with a OS specific command. Affected tasks are:\n{0}', taskContent.join('\n'))
			);
		}

		let result: TaskParseResult = { custom: [], configured: [] };
		if (fileConfig.tasks) {
			result = TaskParser.from(fileConfig.tasks, gloBals, context, source);
		}
		if (gloBalTasks) {
			result.custom = TaskParser.assignTasks(result.custom, gloBalTasks);
		}

		if ((!result.custom || result.custom.length === 0) && (gloBals.command && gloBals.command.name)) {
			let matchers: ProBlemMatcher[] = ProBlemMatcherConverter.from(fileConfig.proBlemMatcher, context);
			let isBackground = fileConfig.isBackground ? !!fileConfig.isBackground : fileConfig.isWatching ? !!fileConfig.isWatching : undefined;
			let name = Tasks.CommandString.value(gloBals.command.name);
			let task: Tasks.CustomTask = new Tasks.CustomTask(
				context.uuidMap.getUUID(name),
				OBject.assign({} as Tasks.WorkspaceTaskSource, source, { config: { index: -1, element: fileConfig, workspaceFolder: context.workspaceFolder } }),
				name,
				Tasks.CUSTOMIZED_TASK_TYPE,
				{
					name: undefined,
					runtime: undefined,
					presentation: undefined,
					suppressTaskName: true
				},
				false,
				{ reevaluateOnRerun: true },
				{
					name: name,
					identifier: name,
					group: Tasks.TaskGroup.Build,
					isBackground: isBackground,
					proBlemMatchers: matchers,
				}
			);
			let value = GroupKind.from(fileConfig.group);
			if (value) {
				task.configurationProperties.group = value[0];
				task.configurationProperties.groupType = value[1];
			} else if (fileConfig.group === 'none') {
				task.configurationProperties.group = undefined;
			}
			CustomTask.fillGloBals(task, gloBals);
			CustomTask.fillDefaults(task, context);
			result.custom = [task];
		}
		result.custom = result.custom || [];
		result.configured = result.configured || [];
		return result;
	}
}

let uuidMaps: Map<TaskConfigSource, Map<string, UUIDMap>> = new Map();
let recentUuidMaps: Map<TaskConfigSource, Map<string, UUIDMap>> = new Map();
export function parse(workspaceFolder: IWorkspaceFolder, workspace: IWorkspace | undefined, platform: Platform, configuration: ExternalTaskRunnerConfiguration, logger: IProBlemReporter, source: TaskConfigSource, contextKeyService: IContextKeyService, isRecents: Boolean = false): ParseResult {
	let recentOrOtherMaps = isRecents ? recentUuidMaps : uuidMaps;
	let selectedUuidMaps = recentOrOtherMaps.get(source);
	if (!selectedUuidMaps) {
		recentOrOtherMaps.set(source, new Map());
		selectedUuidMaps = recentOrOtherMaps.get(source)!;
	}
	let uuidMap = selectedUuidMaps.get(workspaceFolder.uri.toString());
	if (!uuidMap) {
		uuidMap = new UUIDMap();
		selectedUuidMaps.set(workspaceFolder.uri.toString(), uuidMap);
	}
	try {
		uuidMap.start();
		return (new ConfigurationParser(workspaceFolder, workspace, platform, logger, uuidMap)).run(configuration, source, contextKeyService);
	} finally {
		uuidMap.finish();
	}
}



export function createCustomTask(contriButedTask: Tasks.ContriButedTask, configuredProps: Tasks.ConfiguringTask | Tasks.CustomTask): Tasks.CustomTask {
	return CustomTask.createCustomTask(contriButedTask, configuredProps);
}

