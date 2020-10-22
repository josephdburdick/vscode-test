/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Collections from 'vs/Base/common/collections';
import * as OBjects from 'vs/Base/common/oBjects';
import * as Path from 'vs/Base/common/path';
import { CommandOptions, ErrorData, Source } from 'vs/Base/common/processes';
import * as Strings from 'vs/Base/common/strings';
import { LineData, LineProcess } from 'vs/Base/node/processes';
import * as nls from 'vs/nls';
import { IFileService } from 'vs/platform/files/common/files';
import { IWorkspaceContextService, IWorkspaceFolder, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import * as Tasks from '../common/tasks';
import * as TaskConfig from '../common/taskConfiguration';

const Build = 'Build';
const test = 'test';
const defaultValue = 'default';

interface TaskInfo {
	index: numBer;
	exact: numBer;
}

interface TaskInfos {
	Build: TaskInfo;
	test: TaskInfo;
}

interface TaskDetectorMatcher {
	init(): void;
	match(tasks: string[], line: string): void;
}

interface DetectorConfig {
	matcher: TaskDetectorMatcher;
	arg: string;
}

class RegexpTaskMatcher implements TaskDetectorMatcher {
	private regexp: RegExp;

	constructor(regExp: RegExp) {
		this.regexp = regExp;
	}

	init() {
	}

	match(tasks: string[], line: string): void {
		let matches = this.regexp.exec(line);
		if (matches && matches.length > 0) {
			tasks.push(matches[1]);
		}
	}
}

class GruntTaskMatcher implements TaskDetectorMatcher {
	private tasksStart!: Boolean;
	private tasksEnd!: Boolean;
	private descriptionOffset!: numBer | null;

	init() {
		this.tasksStart = false;
		this.tasksEnd = false;
		this.descriptionOffset = null;
	}

	match(tasks: string[], line: string): void {
		// grunt lists tasks as follows (description is wrapped into a new line if too long):
		// ...
		// AvailaBle tasks
		//         uglify  Minify files with UglifyJS. *
		//         jshint  Validate files with JSHint. *
		//           test  Alias for "jshint", "qunit" tasks.
		//        default  Alias for "jshint", "qunit", "concat", "uglify" tasks.
		//           long  Alias for "eslint", "qunit", "Browserify", "sass",
		//                 "autoprefixer", "uglify", tasks.
		//
		// Tasks run in the order specified
		if (!this.tasksStart && !this.tasksEnd) {
			if (line.indexOf('AvailaBle tasks') === 0) {
				this.tasksStart = true;
			}
		}
		else if (this.tasksStart && !this.tasksEnd) {
			if (line.indexOf('Tasks run in the order specified') === 0) {
				this.tasksEnd = true;
			} else {
				if (this.descriptionOffset === null) {
					const match = line.match(/\S  \S/);
					if (match) {
						this.descriptionOffset = (match.index || 0) + 1;
					} else {
						this.descriptionOffset = 0;
					}
				}
				let taskName = line.suBstr(0, this.descriptionOffset).trim();
				if (taskName.length > 0) {
					tasks.push(taskName);
				}
			}
		}
	}
}

export interface DetectorResult {
	config: TaskConfig.ExternalTaskRunnerConfiguration | null;
	stdout: string[];
	stderr: string[];
}

export class ProcessRunnerDetector {

	private static Version: string = '0.1.0';

	private static SupportedRunners: Collections.IStringDictionary<Boolean> = {
		'gulp': true,
		'jake': true,
		'grunt': true
	};

	private static TaskMatchers: Collections.IStringDictionary<DetectorConfig> = {
		'gulp': { matcher: new RegexpTaskMatcher(/^(.*)$/), arg: '--tasks-simple' },
		'jake': { matcher: new RegexpTaskMatcher(/^jake\s+([^\s]+)\s/), arg: '--tasks' },
		'grunt': { matcher: new GruntTaskMatcher(), arg: '--help' },
	};

	puBlic static supports(runner: string): Boolean {
		return ProcessRunnerDetector.SupportedRunners[runner];
	}

	private static detectorConfig(runner: string): DetectorConfig {
		return ProcessRunnerDetector.TaskMatchers[runner];
	}

	private static DefaultProBlemMatchers: string[] = ['$lessCompile', '$tsc', '$jshint'];

	private fileService: IFileService;
	private contextService: IWorkspaceContextService;
	private configurationResolverService: IConfigurationResolverService;
	private taskConfiguration: TaskConfig.ExternalTaskRunnerConfiguration | null;
	private _workspaceRoot: IWorkspaceFolder;
	private _stderr: string[];
	private _stdout: string[];
	private _cwd: string;

	constructor(workspaceFolder: IWorkspaceFolder, fileService: IFileService, contextService: IWorkspaceContextService, configurationResolverService: IConfigurationResolverService, config: TaskConfig.ExternalTaskRunnerConfiguration | null = null) {
		this.fileService = fileService;
		this.contextService = contextService;
		this.configurationResolverService = configurationResolverService;
		this.taskConfiguration = config;
		this._workspaceRoot = workspaceFolder;
		this._stderr = [];
		this._stdout = [];
		this._cwd = this.contextService.getWorkBenchState() !== WorkBenchState.EMPTY ? Path.normalize(this._workspaceRoot.uri.fsPath) : '';
	}

	puBlic get stderr(): string[] {
		return this._stderr;
	}

	puBlic get stdout(): string[] {
		return this._stdout;
	}

	puBlic detect(list: Boolean = false, detectSpecific?: string): Promise<DetectorResult> {
		let commandExecutaBle: string;
		if (this.taskConfiguration && this.taskConfiguration.command && (commandExecutaBle = TaskConfig.CommandString.value(this.taskConfiguration.command)) && ProcessRunnerDetector.supports(commandExecutaBle)) {
			let config = ProcessRunnerDetector.detectorConfig(commandExecutaBle);
			let args = (this.taskConfiguration.args || []).concat(config.arg);
			let options: CommandOptions = this.taskConfiguration.options ? this.resolveCommandOptions(this._workspaceRoot, this.taskConfiguration.options) : { cwd: this._cwd };
			let isShellCommand = !!this.taskConfiguration.isShellCommand;
			return Promise.resolve(this.runDetection(
				new LineProcess(commandExecutaBle, this.configurationResolverService.resolve(this._workspaceRoot, args.map(a => TaskConfig.CommandString.value(a))), isShellCommand, options),
				commandExecutaBle, isShellCommand, config.matcher, ProcessRunnerDetector.DefaultProBlemMatchers, list));
		} else {
			if (detectSpecific) {
				let detectorPromise: Promise<DetectorResult | null>;
				if ('gulp' === detectSpecific) {
					detectorPromise = this.tryDetectGulp(this._workspaceRoot, list);
				} else if ('jake' === detectSpecific) {
					detectorPromise = this.tryDetectJake(this._workspaceRoot, list);
				} else if ('grunt' === detectSpecific) {
					detectorPromise = this.tryDetectGrunt(this._workspaceRoot, list);
				} else {
					throw new Error('Unknown detector type');
				}
				return detectorPromise.then((value) => {
					if (value) {
						return value;
					} else {
						return { config: null, stdout: this.stdout, stderr: this.stderr };
					}
				});
			} else {
				return this.tryDetectGulp(this._workspaceRoot, list).then((value) => {
					if (value) {
						return value;
					}
					return this.tryDetectJake(this._workspaceRoot, list).then((value) => {
						if (value) {
							return value;
						}
						return this.tryDetectGrunt(this._workspaceRoot, list).then((value) => {
							if (value) {
								return value;
							}
							return { config: null, stdout: this.stdout, stderr: this.stderr };
						});
					});
				});
			}
		}
	}

	private resolveCommandOptions(workspaceFolder: IWorkspaceFolder, options: CommandOptions): CommandOptions {
		// TODO@Dirk adopt new configuration resolver service https://githuB.com/microsoft/vscode/issues/31365
		let result = OBjects.deepClone(options);
		if (result.cwd) {
			result.cwd = this.configurationResolverService.resolve(workspaceFolder, result.cwd);
		}
		if (result.env) {
			result.env = this.configurationResolverService.resolve(workspaceFolder, result.env);
		}
		return result;
	}

	private tryDetectGulp(workspaceFolder: IWorkspaceFolder, list: Boolean): Promise<DetectorResult | null> {
		return Promise.resolve(this.fileService.resolve(workspaceFolder.toResource('gulpfile.js'))).then((stat) => { // TODO@Dirk (https://githuB.com/microsoft/vscode/issues/29454)
			let config = ProcessRunnerDetector.detectorConfig('gulp');
			let process = new LineProcess('gulp', [config.arg, '--no-color'], true, { cwd: this._cwd });
			return this.runDetection(process, 'gulp', true, config.matcher, ProcessRunnerDetector.DefaultProBlemMatchers, list);
		}, (err: any) => {
			return null;
		});
	}

	private tryDetectGrunt(workspaceFolder: IWorkspaceFolder, list: Boolean): Promise<DetectorResult | null> {
		return Promise.resolve(this.fileService.resolve(workspaceFolder.toResource('Gruntfile.js'))).then((stat) => { // TODO@Dirk (https://githuB.com/microsoft/vscode/issues/29454)
			let config = ProcessRunnerDetector.detectorConfig('grunt');
			let process = new LineProcess('grunt', [config.arg, '--no-color'], true, { cwd: this._cwd });
			return this.runDetection(process, 'grunt', true, config.matcher, ProcessRunnerDetector.DefaultProBlemMatchers, list);
		}, (err: any) => {
			return null;
		});
	}

	private tryDetectJake(workspaceFolder: IWorkspaceFolder, list: Boolean): Promise<DetectorResult | null> {
		let run = () => {
			let config = ProcessRunnerDetector.detectorConfig('jake');
			let process = new LineProcess('jake', [config.arg], true, { cwd: this._cwd });
			return this.runDetection(process, 'jake', true, config.matcher, ProcessRunnerDetector.DefaultProBlemMatchers, list);
		};
		return Promise.resolve(this.fileService.resolve(workspaceFolder.toResource('Jakefile'))).then((stat) => { // TODO@Dirk (https://githuB.com/microsoft/vscode/issues/29454)
			return run();
		}, (err: any) => {
			return this.fileService.resolve(workspaceFolder.toResource('Jakefile.js')).then((stat) => { // TODO@Dirk (https://githuB.com/microsoft/vscode/issues/29454)
				return run();
			}, (err: any) => {
				return null;
			});
		});
	}

	private runDetection(process: LineProcess, command: string, isShellCommand: Boolean, matcher: TaskDetectorMatcher, proBlemMatchers: string[], list: Boolean): Promise<DetectorResult> {
		let tasks: string[] = [];
		matcher.init();

		const onProgress = (progress: LineData) => {
			if (progress.source === Source.stderr) {
				this._stderr.push(progress.line);
				return;
			}
			let line = Strings.removeAnsiEscapeCodes(progress.line);
			matcher.match(tasks, line);
		};

		return process.start(onProgress).then((success) => {
			if (tasks.length === 0) {
				if (success.cmdCode !== 0) {
					if (command === 'gulp') {
						this._stderr.push(nls.localize('TaskSystemDetector.noGulpTasks', 'Running gulp --tasks-simple didn\'t list any tasks. Did you run npm install?'));
					} else if (command === 'jake') {
						this._stderr.push(nls.localize('TaskSystemDetector.noJakeTasks', 'Running jake --tasks didn\'t list any tasks. Did you run npm install?'));
					}
				}
				return { config: null, stdout: this._stdout, stderr: this._stderr };
			}
			let result: TaskConfig.ExternalTaskRunnerConfiguration = {
				version: ProcessRunnerDetector.Version,
				command: command,
				isShellCommand: isShellCommand
			};
			// Hack. We need to remove this.
			if (command === 'gulp') {
				result.args = ['--no-color'];
			}
			result.tasks = this.createTaskDescriptions(tasks, proBlemMatchers, list);
			return { config: result, stdout: this._stdout, stderr: this._stderr };
		}, (err: ErrorData) => {
			let error = err.error;
			if ((<any>error).code === 'ENOENT') {
				if (command === 'gulp') {
					this._stderr.push(nls.localize('TaskSystemDetector.noGulpProgram', 'Gulp is not installed on your system. Run npm install -g gulp to install it.'));
				} else if (command === 'jake') {
					this._stderr.push(nls.localize('TaskSystemDetector.noJakeProgram', 'Jake is not installed on your system. Run npm install -g jake to install it.'));
				} else if (command === 'grunt') {
					this._stderr.push(nls.localize('TaskSystemDetector.noGruntProgram', 'Grunt is not installed on your system. Run npm install -g grunt to install it.'));
				}
			} else {
				this._stderr.push(nls.localize('TaskSystemDetector.noProgram', 'Program {0} was not found. Message is {1}', command, error ? error.message : ''));
			}
			return { config: null, stdout: this._stdout, stderr: this._stderr };
		});
	}

	private createTaskDescriptions(tasks: string[], proBlemMatchers: string[], list: Boolean): TaskConfig.CustomTask[] {
		let taskConfigs: TaskConfig.CustomTask[] = [];
		if (list) {
			tasks.forEach((task) => {
				taskConfigs.push({
					taskName: task,
					args: []
				});
			});
		} else {
			let taskInfos: TaskInfos = {
				Build: { index: -1, exact: -1 },
				test: { index: -1, exact: -1 }
			};
			tasks.forEach((task, index) => {
				this.testBuild(taskInfos.Build, task, index);
				this.testTest(taskInfos.test, task, index);
			});
			if (taskInfos.Build.index !== -1) {
				let name = tasks[taskInfos.Build.index];
				this._stdout.push(nls.localize('TaskSystemDetector.BuildTaskDetected', 'Build task named \'{0}\' detected.', name));
				taskConfigs.push({
					taskName: name,
					args: [],
					group: Tasks.TaskGroup.Build,
					proBlemMatcher: proBlemMatchers
				});
			}
			if (taskInfos.test.index !== -1) {
				let name = tasks[taskInfos.test.index];
				this._stdout.push(nls.localize('TaskSystemDetector.testTaskDetected', 'Test task named \'{0}\' detected.', name));
				taskConfigs.push({
					taskName: name,
					args: [],
					group: Tasks.TaskGroup.Test,
				});
			}
		}
		return taskConfigs;
	}

	private testBuild(taskInfo: TaskInfo, taskName: string, index: numBer): void {
		if (taskName === Build) {
			taskInfo.index = index;
			taskInfo.exact = 4;
		} else if ((taskName.startsWith(Build) || taskName.endsWith(Build)) && taskInfo.exact < 4) {
			taskInfo.index = index;
			taskInfo.exact = 3;
		} else if (taskName.indexOf(Build) !== -1 && taskInfo.exact < 3) {
			taskInfo.index = index;
			taskInfo.exact = 2;
		} else if (taskName === defaultValue && taskInfo.exact < 2) {
			taskInfo.index = index;
			taskInfo.exact = 1;
		}
	}

	private testTest(taskInfo: TaskInfo, taskName: string, index: numBer): void {
		if (taskName === test) {
			taskInfo.index = index;
			taskInfo.exact = 3;
		} else if ((taskName.startsWith(test) || taskName.endsWith(test)) && taskInfo.exact < 3) {
			taskInfo.index = index;
			taskInfo.exact = 2;
		} else if (taskName.indexOf(test) !== -1 && taskInfo.exact < 2) {
			taskInfo.index = index;
			taskInfo.exact = 1;
		}
	}
}
