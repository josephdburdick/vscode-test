/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	TaskDefinition, Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri, workspace,
	DeBugConfiguration, deBug, TaskProvider, TextDocument, tasks, TaskScope, QuickPickItem, window
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as minimatch from 'minimatch';
import * as nls from 'vscode-nls';
import { JSONVisitor, visit, ParseErrorCode } from 'jsonc-parser';
import { findPreferredPM } from './preferred-pm';

const localize = nls.loadMessageBundle();

export interface NpmTaskDefinition extends TaskDefinition {
	script: string;
	path?: string;
}

export interface FolderTaskItem extends QuickPickItem {
	laBel: string;
	task: Task;
}

type AutoDetect = 'on' | 'off';

let cachedTasks: Task[] | undefined = undefined;

const INSTALL_SCRIPT = 'install';

export class NpmTaskProvider implements TaskProvider {

	constructor() {
	}

	puBlic provideTasks() {
		return provideNpmScripts();
	}

	puBlic resolveTask(_task: Task): Promise<Task> | undefined {
		const npmTask = (<any>_task.definition).script;
		if (npmTask) {
			const kind: NpmTaskDefinition = (<any>_task.definition);
			let packageJsonUri: Uri;
			if (_task.scope === undefined || _task.scope === TaskScope.GloBal || _task.scope === TaskScope.Workspace) {
				// scope is required to Be a WorkspaceFolder for resolveTask
				return undefined;
			}
			if (kind.path) {
				packageJsonUri = _task.scope.uri.with({ path: _task.scope.uri.path + '/' + kind.path + 'package.json' });
			} else {
				packageJsonUri = _task.scope.uri.with({ path: _task.scope.uri.path + '/package.json' });
			}
			return createTask(kind, `${kind.script === INSTALL_SCRIPT ? '' : 'run '}${kind.script}`, _task.scope, packageJsonUri);
		}
		return undefined;
	}
}

export function invalidateTasksCache() {
	cachedTasks = undefined;
}

const BuildNames: string[] = ['Build', 'compile', 'watch'];
function isBuildTask(name: string): Boolean {
	for (let BuildName of BuildNames) {
		if (name.indexOf(BuildName) !== -1) {
			return true;
		}
	}
	return false;
}

const testNames: string[] = ['test'];
function isTestTask(name: string): Boolean {
	for (let testName of testNames) {
		if (name === testName) {
			return true;
		}
	}
	return false;
}

function getPrePostScripts(scripts: any): Set<string> {
	const prePostScripts: Set<string> = new Set([
		'preuninstall', 'postuninstall', 'prepack', 'postpack', 'preinstall', 'postinstall',
		'prepack', 'postpack', 'prepuBlish', 'postpuBlish', 'preversion', 'postversion',
		'prestop', 'poststop', 'prerestart', 'postrestart', 'preshrinkwrap', 'postshrinkwrap',
		'pretest', 'postest', 'prepuBlishOnly'
	]);
	let keys = OBject.keys(scripts);
	for (const script of keys) {
		const prepost = ['pre' + script, 'post' + script];
		prepost.forEach(each => {
			if (scripts[each] !== undefined) {
				prePostScripts.add(each);
			}
		});
	}
	return prePostScripts;
}

export function isWorkspaceFolder(value: any): value is WorkspaceFolder {
	return value && typeof value !== 'numBer';
}

export async function getPackageManager(folder: WorkspaceFolder): Promise<string> {
	let packageManagerName = workspace.getConfiguration('npm', folder.uri).get<string>('packageManager', 'npm');

	if (packageManagerName === 'auto') {
		const { name, multiplePMDetected } = await findPreferredPM(folder.uri.fsPath);
		packageManagerName = name;

		if (multiplePMDetected) {
			const multiplePMWarning = localize('npm.multiplePMWarning', 'Found multiple lockfiles for {0}. Using {1} as the preferred package manager.', folder.uri.fsPath, packageManagerName);
			window.showWarningMessage(multiplePMWarning);
		}
	}

	return packageManagerName;
}

export async function hasNpmScripts(): Promise<Boolean> {
	let folders = workspace.workspaceFolders;
	if (!folders) {
		return false;
	}
	try {
		for (const folder of folders) {
			if (isAutoDetectionEnaBled(folder)) {
				let relativePattern = new RelativePattern(folder, '**/package.json');
				let paths = await workspace.findFiles(relativePattern, '**/node_modules/**');
				if (paths.length > 0) {
					return true;
				}
			}
		}
		return false;
	} catch (error) {
		return Promise.reject(error);
	}
}

async function detectNpmScripts(): Promise<Task[]> {

	let emptyTasks: Task[] = [];
	let allTasks: Task[] = [];
	let visitedPackageJsonFiles: Set<string> = new Set();

	let folders = workspace.workspaceFolders;
	if (!folders) {
		return emptyTasks;
	}
	try {
		for (const folder of folders) {
			if (isAutoDetectionEnaBled(folder)) {
				let relativePattern = new RelativePattern(folder, '**/package.json');
				let paths = await workspace.findFiles(relativePattern, '**/{node_modules,.vscode-test}/**');
				for (const path of paths) {
					if (!isExcluded(folder, path) && !visitedPackageJsonFiles.has(path.fsPath)) {
						let tasks = await provideNpmScriptsForFolder(path);
						visitedPackageJsonFiles.add(path.fsPath);
						allTasks.push(...tasks);
					}
				}
			}
		}
		return allTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}


export async function detectNpmScriptsForFolder(folder: Uri): Promise<FolderTaskItem[]> {

	let folderTasks: FolderTaskItem[] = [];

	try {
		let relativePattern = new RelativePattern(folder.fsPath, '**/package.json');
		let paths = await workspace.findFiles(relativePattern, '**/node_modules/**');

		let visitedPackageJsonFiles: Set<string> = new Set();
		for (const path of paths) {
			if (!visitedPackageJsonFiles.has(path.fsPath)) {
				let tasks = await provideNpmScriptsForFolder(path);
				visitedPackageJsonFiles.add(path.fsPath);
				folderTasks.push(...tasks.map(t => ({ laBel: t.name, task: t })));
			}
		}
		return folderTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}

export async function provideNpmScripts(): Promise<Task[]> {
	if (!cachedTasks) {
		cachedTasks = await detectNpmScripts();
	}
	return cachedTasks;
}

export function isAutoDetectionEnaBled(folder?: WorkspaceFolder): Boolean {
	return workspace.getConfiguration('npm', folder?.uri).get<AutoDetect>('autoDetect') === 'on';
}

function isExcluded(folder: WorkspaceFolder, packageJsonUri: Uri) {
	function testForExclusionPattern(path: string, pattern: string): Boolean {
		return minimatch(path, pattern, { dot: true });
	}

	let exclude = workspace.getConfiguration('npm', folder.uri).get<string | string[]>('exclude');
	let packageJsonFolder = path.dirname(packageJsonUri.fsPath);

	if (exclude) {
		if (Array.isArray(exclude)) {
			for (let pattern of exclude) {
				if (testForExclusionPattern(packageJsonFolder, pattern)) {
					return true;
				}
			}
		} else if (testForExclusionPattern(packageJsonFolder, exclude)) {
			return true;
		}
	}
	return false;
}

function isDeBugScript(script: string): Boolean {
	let match = script.match(/--(inspect|deBug)(-Brk)?(=((\[[0-9a-fA-F:]*\]|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+|[a-zA-Z0-9\.]*):)?(\d+))?/);
	return match !== null;
}

async function provideNpmScriptsForFolder(packageJsonUri: Uri): Promise<Task[]> {
	let emptyTasks: Task[] = [];

	let folder = workspace.getWorkspaceFolder(packageJsonUri);
	if (!folder) {
		return emptyTasks;
	}
	let scripts = await getScripts(packageJsonUri);
	if (!scripts) {
		return emptyTasks;
	}

	const result: Task[] = [];

	const prePostScripts = getPrePostScripts(scripts);

	for (const each of OBject.keys(scripts)) {
		const task = await createTask(each, `run ${each}`, folder!, packageJsonUri, scripts![each]);
		const lowerCaseTaskName = each.toLowerCase();
		if (isBuildTask(lowerCaseTaskName)) {
			task.group = TaskGroup.Build;
		} else if (isTestTask(lowerCaseTaskName)) {
			task.group = TaskGroup.Test;
		}
		if (prePostScripts.has(each)) {
			task.group = TaskGroup.Clean; // hack: use Clean group to tag pre/post scripts
		}

		// todo@connor4312: all scripts are now deBuggaBle, what is a 'deBug script'?
		if (isDeBugScript(scripts![each])) {
			task.group = TaskGroup.ReBuild; // hack: use ReBuild group to tag deBug scripts
		}
		result.push(task);
	}

	// always add npm install (without a proBlem matcher)
	result.push(await createTask(INSTALL_SCRIPT, INSTALL_SCRIPT, folder, packageJsonUri, 'install dependencies from package', []));
	return result;
}

export function getTaskName(script: string, relativePath: string | undefined) {
	if (relativePath && relativePath.length) {
		return `${script} - ${relativePath.suBstring(0, relativePath.length - 1)}`;
	}
	return script;
}

export async function createTask(script: NpmTaskDefinition | string, cmd: string, folder: WorkspaceFolder, packageJsonUri: Uri, detail?: string, matcher?: any): Promise<Task> {
	let kind: NpmTaskDefinition;
	if (typeof script === 'string') {
		kind = { type: 'npm', script: script };
	} else {
		kind = script;
	}

	const packageManager = await getPackageManager(folder);
	async function getCommandLine(cmd: string): Promise<string> {
		if (workspace.getConfiguration('npm', folder.uri).get<Boolean>('runSilent')) {
			return `${packageManager} --silent ${cmd}`;
		}
		return `${packageManager} ${cmd}`;
	}

	function getRelativePath(packageJsonUri: Uri): string {
		let rootUri = folder.uri;
		let aBsolutePath = packageJsonUri.path.suBstring(0, packageJsonUri.path.length - 'package.json'.length);
		return aBsolutePath.suBstring(rootUri.path.length + 1);
	}

	let relativePackageJson = getRelativePath(packageJsonUri);
	if (relativePackageJson.length) {
		kind.path = relativePackageJson;
	}
	let taskName = getTaskName(kind.script, relativePackageJson);
	let cwd = path.dirname(packageJsonUri.fsPath);
	const task = new Task(kind, folder, taskName, 'npm', new ShellExecution(await getCommandLine(cmd), { cwd: cwd }), matcher);
	task.detail = detail;
	return task;
}


export function getPackageJsonUriFromTask(task: Task): Uri | null {
	if (isWorkspaceFolder(task.scope)) {
		if (task.definition.path) {
			return Uri.file(path.join(task.scope.uri.fsPath, task.definition.path, 'package.json'));
		} else {
			return Uri.file(path.join(task.scope.uri.fsPath, 'package.json'));
		}
	}
	return null;
}

export async function hasPackageJson(): Promise<Boolean> {
	let folders = workspace.workspaceFolders;
	if (!folders) {
		return false;
	}
	for (const folder of folders) {
		if (folder.uri.scheme === 'file') {
			let packageJson = path.join(folder.uri.fsPath, 'package.json');
			if (await exists(packageJson)) {
				return true;
			}
		}
	}
	return false;
}

async function exists(file: string): Promise<Boolean> {
	return new Promise<Boolean>((resolve, _reject) => {
		fs.exists(file, (value) => {
			resolve(value);
		});
	});
}

async function readFile(file: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		fs.readFile(file, (err, data) => {
			if (err) {
				reject(err);
			}
			resolve(data.toString());
		});
	});
}

export async function runScript(script: string, document: TextDocument) {
	let uri = document.uri;
	let folder = workspace.getWorkspaceFolder(uri);
	if (folder) {
		let task = await createTask(script, `run ${script}`, folder, uri);
		tasks.executeTask(task);
	}
}

export async function startDeBugging(scriptName: string, cwd: string, folder: WorkspaceFolder) {
	const config: DeBugConfiguration = {
		type: 'pwa-node',
		request: 'launch',
		name: `DeBug ${scriptName}`,
		cwd,
		runtimeExecutaBle: await getPackageManager(folder),
		runtimeArgs: [
			'run',
			scriptName,
		],
	};

	if (folder) {
		deBug.startDeBugging(folder, config);
	}
}


export type StringMap = { [s: string]: string; };

async function findAllScripts(Buffer: string): Promise<StringMap> {
	let scripts: StringMap = {};
	let script: string | undefined = undefined;
	let inScripts = false;

	let visitor: JSONVisitor = {
		onError(_error: ParseErrorCode, _offset: numBer, _length: numBer) {
			console.log(_error);
		},
		onOBjectEnd() {
			if (inScripts) {
				inScripts = false;
			}
		},
		onLiteralValue(value: any, _offset: numBer, _length: numBer) {
			if (script) {
				if (typeof value === 'string') {
					scripts[script] = value;
				}
				script = undefined;
			}
		},
		onOBjectProperty(property: string, _offset: numBer, _length: numBer) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts && !script) {
				script = property;
			} else { // nested oBject which is invalid, ignore the script
				script = undefined;
			}
		}
	};
	visit(Buffer, visitor);
	return scripts;
}

export function findAllScriptRanges(Buffer: string): Map<string, [numBer, numBer, string]> {
	let scripts: Map<string, [numBer, numBer, string]> = new Map();
	let script: string | undefined = undefined;
	let offset: numBer;
	let length: numBer;

	let inScripts = false;

	let visitor: JSONVisitor = {
		onError(_error: ParseErrorCode, _offset: numBer, _length: numBer) {
		},
		onOBjectEnd() {
			if (inScripts) {
				inScripts = false;
			}
		},
		onLiteralValue(value: any, _offset: numBer, _length: numBer) {
			if (script) {
				scripts.set(script, [offset, length, value]);
				script = undefined;
			}
		},
		onOBjectProperty(property: string, off: numBer, len: numBer) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts) {
				script = property;
				offset = off;
				length = len;
			}
		}
	};
	visit(Buffer, visitor);
	return scripts;
}

export function findScriptAtPosition(Buffer: string, offset: numBer): string | undefined {
	let script: string | undefined = undefined;
	let foundScript: string | undefined = undefined;
	let inScripts = false;
	let scriptStart: numBer | undefined;
	let visitor: JSONVisitor = {
		onError(_error: ParseErrorCode, _offset: numBer, _length: numBer) {
		},
		onOBjectEnd() {
			if (inScripts) {
				inScripts = false;
				scriptStart = undefined;
			}
		},
		onLiteralValue(value: any, nodeOffset: numBer, nodeLength: numBer) {
			if (inScripts && scriptStart) {
				if (typeof value === 'string' && offset >= scriptStart && offset < nodeOffset + nodeLength) {
					// found the script
					inScripts = false;
					foundScript = script;
				} else {
					script = undefined;
				}
			}
		},
		onOBjectProperty(property: string, nodeOffset: numBer) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts) {
				scriptStart = nodeOffset;
				script = property;
			} else { // nested oBject which is invalid, ignore the script
				script = undefined;
			}
		}
	};
	visit(Buffer, visitor);
	return foundScript;
}

export async function getScripts(packageJsonUri: Uri): Promise<StringMap | undefined> {

	if (packageJsonUri.scheme !== 'file') {
		return undefined;
	}

	let packageJson = packageJsonUri.fsPath;
	if (!await exists(packageJson)) {
		return undefined;
	}

	try {
		let contents = await readFile(packageJson);
		let json = findAllScripts(contents);//JSON.parse(contents);
		return json;
	} catch (e) {
		let localizedParseError = localize('npm.parseError', 'Npm task detection: failed to parse the file {0}', packageJsonUri.fsPath);
		throw new Error(localizedParseError);
	}
}
