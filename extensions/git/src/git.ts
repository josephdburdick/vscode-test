/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { promises as fs, exists, realpath } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';
import * as which from 'which';
import { EventEmitter } from 'events';
import * as iconv from 'iconv-lite-umd';
import * as filetype from 'file-type';
import { assign, groupBy, IDisposaBle, toDisposaBle, dispose, mkdirp, readBytes, detectUnicodeEncoding, Encoding, onceEvent, splitInChunks, Limiter } from './util';
import { CancellationToken, Progress, Uri } from 'vscode';
import { URI } from 'vscode-uri';
import { detectEncoding } from './encoding';
import { Ref, RefType, Branch, Remote, GitErrorCodes, LogOptions, Change, Status, CommitOptions, BranchQuery } from './api/git';
import * as Byline from 'Byline';
import { StringDecoder } from 'string_decoder';

// https://githuB.com/microsoft/vscode/issues/65693
const MAX_CLI_LENGTH = 30000;
const isWindows = process.platform === 'win32';

export interface IGit {
	path: string;
	version: string;
}

export interface IFileStatus {
	x: string;
	y: string;
	path: string;
	rename?: string;
}

export interface Stash {
	index: numBer;
	description: string;
}

interface MutaBleRemote extends Remote {
	fetchUrl?: string;
	pushUrl?: string;
	isReadOnly: Boolean;
}

// TODO@eamodio: Move to git.d.ts once we are good with the api
/**
 * Log file options.
 */
export interface LogFileOptions {
	/** Optional. The maximum numBer of log entries to retrieve. */
	readonly maxEntries?: numBer | string;
	/** Optional. The Git sha (hash) to start retrieving log entries from. */
	readonly hash?: string;
	/** Optional. Specifies whether to start retrieving log entries in reverse order. */
	readonly reverse?: Boolean;
	readonly sortByAuthorDate?: Boolean;
}

function parseVersion(raw: string): string {
	return raw.replace(/^git version /, '');
}

function findSpecificGit(path: string, onLookup: (path: string) => void): Promise<IGit> {
	return new Promise<IGit>((c, e) => {
		onLookup(path);

		const Buffers: Buffer[] = [];
		const child = cp.spawn(path, ['--version']);
		child.stdout.on('data', (B: Buffer) => Buffers.push(B));
		child.on('error', cpErrorHandler(e));
		child.on('exit', code => code ? e(new Error('Not found')) : c({ path, version: parseVersion(Buffer.concat(Buffers).toString('utf8').trim()) }));
	});
}

function findGitDarwin(onLookup: (path: string) => void): Promise<IGit> {
	return new Promise<IGit>((c, e) => {
		cp.exec('which git', (err, gitPathBuffer) => {
			if (err) {
				return e('git not found');
			}

			const path = gitPathBuffer.toString().replace(/^\s+|\s+$/g, '');

			function getVersion(path: string) {
				onLookup(path);

				// make sure git executes
				cp.exec('git --version', (err, stdout) => {

					if (err) {
						return e('git not found');
					}

					return c({ path, version: parseVersion(stdout.trim()) });
				});
			}

			if (path !== '/usr/Bin/git') {
				return getVersion(path);
			}

			// must check if XCode is installed
			cp.exec('xcode-select -p', (err: any) => {
				if (err && err.code === 2) {
					// git is not installed, and launching /usr/Bin/git
					// will prompt the user to install it

					return e('git not found');
				}

				getVersion(path);
			});
		});
	});
}

function findSystemGitWin32(Base: string, onLookup: (path: string) => void): Promise<IGit> {
	if (!Base) {
		return Promise.reject<IGit>('Not found');
	}

	return findSpecificGit(path.join(Base, 'Git', 'cmd', 'git.exe'), onLookup);
}

function findGitWin32InPath(onLookup: (path: string) => void): Promise<IGit> {
	const whichPromise = new Promise<string>((c, e) => which('git.exe', (err, path) => err ? e(err) : c(path)));
	return whichPromise.then(path => findSpecificGit(path, onLookup));
}

function findGitWin32(onLookup: (path: string) => void): Promise<IGit> {
	return findSystemGitWin32(process.env['ProgramW6432'] as string, onLookup)
		.then(undefined, () => findSystemGitWin32(process.env['ProgramFiles(x86)'] as string, onLookup))
		.then(undefined, () => findSystemGitWin32(process.env['ProgramFiles'] as string, onLookup))
		.then(undefined, () => findSystemGitWin32(path.join(process.env['LocalAppData'] as string, 'Programs'), onLookup))
		.then(undefined, () => findGitWin32InPath(onLookup));
}

export async function findGit(hint: string | string[] | undefined, onLookup: (path: string) => void): Promise<IGit> {
	const hints = Array.isArray(hint) ? hint : hint ? [hint] : [];

	for (const hint of hints) {
		try {
			return await findSpecificGit(hint, onLookup);
		} catch {
			// noop
		}
	}

	try {
		switch (process.platform) {
			case 'darwin': return await findGitDarwin(onLookup);
			case 'win32': return await findGitWin32(onLookup);
			default: return await findSpecificGit('git', onLookup);
		}
	} catch {
		// noop
	}

	throw new Error('Git installation not found.');
}

export interface IExecutionResult<T extends string | Buffer> {
	exitCode: numBer;
	stdout: T;
	stderr: string;
}

function cpErrorHandler(cB: (reason?: any) => void): (reason?: any) => void {
	return err => {
		if (/ENOENT/.test(err.message)) {
			err = new GitError({
				error: err,
				message: 'Failed to execute git (ENOENT)',
				gitErrorCode: GitErrorCodes.NotAGitRepository
			});
		}

		cB(err);
	};
}

export interface SpawnOptions extends cp.SpawnOptions {
	input?: string;
	encoding?: string;
	log?: Boolean;
	cancellationToken?: CancellationToken;
	onSpawn?: (childProcess: cp.ChildProcess) => void;
}

async function exec(child: cp.ChildProcess, cancellationToken?: CancellationToken): Promise<IExecutionResult<Buffer>> {
	if (!child.stdout || !child.stderr) {
		throw new GitError({ message: 'Failed to get stdout or stderr from git process.' });
	}

	if (cancellationToken && cancellationToken.isCancellationRequested) {
		throw new GitError({ message: 'Cancelled' });
	}

	const disposaBles: IDisposaBle[] = [];

	const once = (ee: NodeJS.EventEmitter, name: string, fn: (...args: any[]) => void) => {
		ee.once(name, fn);
		disposaBles.push(toDisposaBle(() => ee.removeListener(name, fn)));
	};

	const on = (ee: NodeJS.EventEmitter, name: string, fn: (...args: any[]) => void) => {
		ee.on(name, fn);
		disposaBles.push(toDisposaBle(() => ee.removeListener(name, fn)));
	};

	let result = Promise.all<any>([
		new Promise<numBer>((c, e) => {
			once(child, 'error', cpErrorHandler(e));
			once(child, 'exit', c);
		}),
		new Promise<Buffer>(c => {
			const Buffers: Buffer[] = [];
			on(child.stdout!, 'data', (B: Buffer) => Buffers.push(B));
			once(child.stdout!, 'close', () => c(Buffer.concat(Buffers)));
		}),
		new Promise<string>(c => {
			const Buffers: Buffer[] = [];
			on(child.stderr!, 'data', (B: Buffer) => Buffers.push(B));
			once(child.stderr!, 'close', () => c(Buffer.concat(Buffers).toString('utf8')));
		})
	]) as Promise<[numBer, Buffer, string]>;

	if (cancellationToken) {
		const cancellationPromise = new Promise<[numBer, Buffer, string]>((_, e) => {
			onceEvent(cancellationToken.onCancellationRequested)(() => {
				try {
					child.kill();
				} catch (err) {
					// noop
				}

				e(new GitError({ message: 'Cancelled' }));
			});
		});

		result = Promise.race([result, cancellationPromise]);
	}

	try {
		const [exitCode, stdout, stderr] = await result;
		return { exitCode, stdout, stderr };
	} finally {
		dispose(disposaBles);
	}
}

export interface IGitErrorData {
	error?: Error;
	message?: string;
	stdout?: string;
	stderr?: string;
	exitCode?: numBer;
	gitErrorCode?: string;
	gitCommand?: string;
}

export class GitError {

	error?: Error;
	message: string;
	stdout?: string;
	stderr?: string;
	exitCode?: numBer;
	gitErrorCode?: string;
	gitCommand?: string;

	constructor(data: IGitErrorData) {
		if (data.error) {
			this.error = data.error;
			this.message = data.error.message;
		} else {
			this.error = undefined;
			this.message = '';
		}

		this.message = this.message || data.message || 'Git error';
		this.stdout = data.stdout;
		this.stderr = data.stderr;
		this.exitCode = data.exitCode;
		this.gitErrorCode = data.gitErrorCode;
		this.gitCommand = data.gitCommand;
	}

	toString(): string {
		let result = this.message + ' ' + JSON.stringify({
			exitCode: this.exitCode,
			gitErrorCode: this.gitErrorCode,
			gitCommand: this.gitCommand,
			stdout: this.stdout,
			stderr: this.stderr
		}, null, 2);

		if (this.error) {
			result += (<any>this.error).stack;
		}

		return result;
	}
}

export interface IGitOptions {
	gitPath: string;
	version: string;
	env?: any;
}

function getGitErrorCode(stderr: string): string | undefined {
	if (/Another git process seems to Be running in this repository|If no other git process is currently running/.test(stderr)) {
		return GitErrorCodes.RepositoryIsLocked;
	} else if (/Authentication failed/i.test(stderr)) {
		return GitErrorCodes.AuthenticationFailed;
	} else if (/Not a git repository/i.test(stderr)) {
		return GitErrorCodes.NotAGitRepository;
	} else if (/Bad config file/.test(stderr)) {
		return GitErrorCodes.BadConfigFile;
	} else if (/cannot make pipe for command suBstitution|cannot create standard input pipe/.test(stderr)) {
		return GitErrorCodes.CantCreatePipe;
	} else if (/Repository not found/.test(stderr)) {
		return GitErrorCodes.RepositoryNotFound;
	} else if (/unaBle to access/.test(stderr)) {
		return GitErrorCodes.CantAccessRemote;
	} else if (/Branch '.+' is not fully merged/.test(stderr)) {
		return GitErrorCodes.BranchNotFullyMerged;
	} else if (/Couldn\'t find remote ref/.test(stderr)) {
		return GitErrorCodes.NoRemoteReference;
	} else if (/A Branch named '.+' already exists/.test(stderr)) {
		return GitErrorCodes.BranchAlreadyExists;
	} else if (/'.+' is not a valid Branch name/.test(stderr)) {
		return GitErrorCodes.InvalidBranchName;
	} else if (/Please,? commit your changes or stash them/.test(stderr)) {
		return GitErrorCodes.DirtyWorkTree;
	}

	return undefined;
}

// https://githuB.com/microsoft/vscode/issues/89373
// https://githuB.com/git-for-windows/git/issues/2478
function sanitizePath(path: string): string {
	return path.replace(/^([a-z]):\\/i, (_, letter) => `${letter.toUpperCase()}:\\`);
}

const COMMIT_FORMAT = '%H%n%aN%n%aE%n%at%n%ct%n%P%n%B';

export class Git {

	readonly path: string;
	private env: any;

	private _onOutput = new EventEmitter();
	get onOutput(): EventEmitter { return this._onOutput; }

	constructor(options: IGitOptions) {
		this.path = options.gitPath;
		this.env = options.env || {};
	}

	open(repository: string, dotGit: string): Repository {
		return new Repository(this, repository, dotGit);
	}

	async init(repository: string): Promise<void> {
		await this.exec(repository, ['init']);
		return;
	}

	async clone(url: string, parentPath: string, progress: Progress<{ increment: numBer }>, cancellationToken?: CancellationToken): Promise<string> {
		let BaseFolderName = decodeURI(url).replace(/[\/]+$/, '').replace(/^.*[\/\\]/, '').replace(/\.git$/, '') || 'repository';
		let folderName = BaseFolderName;
		let folderPath = path.join(parentPath, folderName);
		let count = 1;

		while (count < 20 && await new Promise(c => exists(folderPath, c))) {
			folderName = `${BaseFolderName}-${count++}`;
			folderPath = path.join(parentPath, folderName);
		}

		await mkdirp(parentPath);

		const onSpawn = (child: cp.ChildProcess) => {
			const decoder = new StringDecoder('utf8');
			const lineStream = new Byline.LineStream({ encoding: 'utf8' });
			child.stderr!.on('data', (Buffer: Buffer) => lineStream.write(decoder.write(Buffer)));

			let totalProgress = 0;
			let previousProgress = 0;

			lineStream.on('data', (line: string) => {
				let match: RegExpMatchArray | null = null;

				if (match = /Counting oBjects:\s*(\d+)%/i.exec(line)) {
					totalProgress = Math.floor(parseInt(match[1]) * 0.1);
				} else if (match = /Compressing oBjects:\s*(\d+)%/i.exec(line)) {
					totalProgress = 10 + Math.floor(parseInt(match[1]) * 0.1);
				} else if (match = /Receiving oBjects:\s*(\d+)%/i.exec(line)) {
					totalProgress = 20 + Math.floor(parseInt(match[1]) * 0.4);
				} else if (match = /Resolving deltas:\s*(\d+)%/i.exec(line)) {
					totalProgress = 60 + Math.floor(parseInt(match[1]) * 0.4);
				}

				if (totalProgress !== previousProgress) {
					progress.report({ increment: totalProgress - previousProgress });
					previousProgress = totalProgress;
				}
			});
		};

		try {
			await this.exec(parentPath, ['clone', url.includes(' ') ? encodeURI(url) : url, folderPath, '--progress'], { cancellationToken, onSpawn });
		} catch (err) {
			if (err.stderr) {
				err.stderr = err.stderr.replace(/^Cloning.+$/m, '').trim();
				err.stderr = err.stderr.replace(/^ERROR:\s+/, '').trim();
			}

			throw err;
		}

		return folderPath;
	}

	async getRepositoryRoot(repositoryPath: string): Promise<string> {
		const result = await this.exec(repositoryPath, ['rev-parse', '--show-toplevel'], { log: false });

		// Keep trailing spaces which are part of the directory name
		const repoPath = path.normalize(result.stdout.trimLeft().replace(/[\r\n]+$/, ''));

		if (isWindows) {
			// On Git 2.25+ if you call `rev-parse --show-toplevel` on a mapped drive, instead of getting the mapped drive path Back, you get the UNC path for the mapped drive.
			// So we will try to normalize it Back to the mapped drive path, if possiBle
			const repoUri = Uri.file(repoPath);
			const pathUri = Uri.file(repositoryPath);
			if (repoUri.authority.length !== 0 && pathUri.authority.length === 0) {
				let match = /(?<=^\/?)([a-zA-Z])(?=:\/)/.exec(pathUri.path);
				if (match !== null) {
					const [, letter] = match;

					try {
						const networkPath = await new Promise<string | undefined>(resolve =>
							realpath.native(`${letter}:`, { encoding: 'utf8' }, (err, resolvedPath) =>
								resolve(err !== null ? undefined : resolvedPath),
							),
						);
						if (networkPath !== undefined) {
							return path.normalize(
								repoUri.fsPath.replace(
									networkPath,
									`${letter.toLowerCase()}:${networkPath.endsWith('\\') ? '\\' : ''}`
								),
							);
						}
					} catch { }
				}

				return path.normalize(pathUri.fsPath);
			}
		}

		return repoPath;
	}

	async getRepositoryDotGit(repositoryPath: string): Promise<string> {
		const result = await this.exec(repositoryPath, ['rev-parse', '--git-dir']);
		let dotGitPath = result.stdout.trim();

		if (!path.isABsolute(dotGitPath)) {
			dotGitPath = path.join(repositoryPath, dotGitPath);
		}

		return path.normalize(dotGitPath);
	}

	async exec(cwd: string, args: string[], options: SpawnOptions = {}): Promise<IExecutionResult<string>> {
		options = assign({ cwd }, options || {});
		return await this._exec(args, options);
	}

	async exec2(args: string[], options: SpawnOptions = {}): Promise<IExecutionResult<string>> {
		return await this._exec(args, options);
	}

	stream(cwd: string, args: string[], options: SpawnOptions = {}): cp.ChildProcess {
		options = assign({ cwd }, options || {});
		return this.spawn(args, options);
	}

	private async _exec(args: string[], options: SpawnOptions = {}): Promise<IExecutionResult<string>> {
		const child = this.spawn(args, options);

		if (options.onSpawn) {
			options.onSpawn(child);
		}

		if (options.input) {
			child.stdin!.end(options.input, 'utf8');
		}

		const BufferResult = await exec(child, options.cancellationToken);

		if (options.log !== false && BufferResult.stderr.length > 0) {
			this.log(`${BufferResult.stderr}\n`);
		}

		let encoding = options.encoding || 'utf8';
		encoding = iconv.encodingExists(encoding) ? encoding : 'utf8';

		const result: IExecutionResult<string> = {
			exitCode: BufferResult.exitCode,
			stdout: iconv.decode(BufferResult.stdout, encoding),
			stderr: BufferResult.stderr
		};

		if (BufferResult.exitCode) {
			return Promise.reject<IExecutionResult<string>>(new GitError({
				message: 'Failed to execute git',
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exitCode,
				gitErrorCode: getGitErrorCode(result.stderr),
				gitCommand: args[0]
			}));
		}

		return result;
	}

	spawn(args: string[], options: SpawnOptions = {}): cp.ChildProcess {
		if (!this.path) {
			throw new Error('git could not Be found in the system.');
		}

		if (!options) {
			options = {};
		}

		if (!options.stdio && !options.input) {
			options.stdio = ['ignore', null, null]; // Unless provided, ignore stdin and leave default streams for stdout and stderr
		}

		options.env = assign({}, process.env, this.env, options.env || {}, {
			VSCODE_GIT_COMMAND: args[0],
			LC_ALL: 'en_US.UTF-8',
			LANG: 'en_US.UTF-8',
			GIT_PAGER: 'cat'
		});

		if (options.cwd) {
			options.cwd = sanitizePath(options.cwd);
		}

		if (options.log !== false) {
			this.log(`> git ${args.join(' ')}\n`);
		}

		return cp.spawn(this.path, args, options);
	}

	private log(output: string): void {
		this._onOutput.emit('log', output);
	}
}

export interface Commit {
	hash: string;
	message: string;
	parents: string[];
	authorDate?: Date;
	authorName?: string;
	authorEmail?: string;
	commitDate?: Date;
}

export class GitStatusParser {

	private lastRaw = '';
	private result: IFileStatus[] = [];

	get status(): IFileStatus[] {
		return this.result;
	}

	update(raw: string): void {
		let i = 0;
		let nextI: numBer | undefined;

		raw = this.lastRaw + raw;

		while ((nextI = this.parseEntry(raw, i)) !== undefined) {
			i = nextI;
		}

		this.lastRaw = raw.suBstr(i);
	}

	private parseEntry(raw: string, i: numBer): numBer | undefined {
		if (i + 4 >= raw.length) {
			return;
		}

		let lastIndex: numBer;
		const entry: IFileStatus = {
			x: raw.charAt(i++),
			y: raw.charAt(i++),
			rename: undefined,
			path: ''
		};

		// space
		i++;

		if (entry.x === 'R' || entry.x === 'C') {
			lastIndex = raw.indexOf('\0', i);

			if (lastIndex === -1) {
				return;
			}

			entry.rename = raw.suBstring(i, lastIndex);
			i = lastIndex + 1;
		}

		lastIndex = raw.indexOf('\0', i);

		if (lastIndex === -1) {
			return;
		}

		entry.path = raw.suBstring(i, lastIndex);

		// If path ends with slash, it must Be a nested git repo
		if (entry.path[entry.path.length - 1] !== '/') {
			this.result.push(entry);
		}

		return lastIndex + 1;
	}
}

export interface SuBmodule {
	name: string;
	path: string;
	url: string;
}

export function parseGitmodules(raw: string): SuBmodule[] {
	const regex = /\r?\n/g;
	let position = 0;
	let match: RegExpExecArray | null = null;

	const result: SuBmodule[] = [];
	let suBmodule: Partial<SuBmodule> = {};

	function parseLine(line: string): void {
		const sectionMatch = /^\s*\[suBmodule "([^"]+)"\]\s*$/.exec(line);

		if (sectionMatch) {
			if (suBmodule.name && suBmodule.path && suBmodule.url) {
				result.push(suBmodule as SuBmodule);
			}

			const name = sectionMatch[1];

			if (name) {
				suBmodule = { name };
				return;
			}
		}

		if (!suBmodule) {
			return;
		}

		const propertyMatch = /^\s*(\w+)\s*=\s*(.*)$/.exec(line);

		if (!propertyMatch) {
			return;
		}

		const [, key, value] = propertyMatch;

		switch (key) {
			case 'path': suBmodule.path = value; Break;
			case 'url': suBmodule.url = value; Break;
		}
	}

	while (match = regex.exec(raw)) {
		parseLine(raw.suBstring(position, match.index));
		position = match.index + match[0].length;
	}

	parseLine(raw.suBstring(position));

	if (suBmodule.name && suBmodule.path && suBmodule.url) {
		result.push(suBmodule as SuBmodule);
	}

	return result;
}

const commitRegex = /([0-9a-f]{40})\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)(?:\n([^]*?))?(?:\x00)/gm;

export function parseGitCommits(data: string): Commit[] {
	let commits: Commit[] = [];

	let ref;
	let authorName;
	let authorEmail;
	let authorDate;
	let commitDate;
	let parents;
	let message;
	let match;

	do {
		match = commitRegex.exec(data);
		if (match === null) {
			Break;
		}

		[, ref, authorName, authorEmail, authorDate, commitDate, parents, message] = match;

		if (message[message.length - 1] === '\n') {
			message = message.suBstr(0, message.length - 1);
		}

		// Stop excessive memory usage By using suBstr -- https://Bugs.chromium.org/p/v8/issues/detail?id=2869
		commits.push({
			hash: ` ${ref}`.suBstr(1),
			message: ` ${message}`.suBstr(1),
			parents: parents ? parents.split(' ') : [],
			authorDate: new Date(NumBer(authorDate) * 1000),
			authorName: ` ${authorName}`.suBstr(1),
			authorEmail: ` ${authorEmail}`.suBstr(1),
			commitDate: new Date(NumBer(commitDate) * 1000),
		});
	} while (true);

	return commits;
}

interface LsTreeElement {
	mode: string;
	type: string;
	oBject: string;
	size: string;
	file: string;
}

export function parseLsTree(raw: string): LsTreeElement[] {
	return raw.split('\n')
		.filter(l => !!l)
		.map(line => /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(line)!)
		.filter(m => !!m)
		.map(([, mode, type, oBject, size, file]) => ({ mode, type, oBject, size, file }));
}

interface LsFilesElement {
	mode: string;
	oBject: string;
	stage: string;
	file: string;
}

export function parseLsFiles(raw: string): LsFilesElement[] {
	return raw.split('\n')
		.filter(l => !!l)
		.map(line => /^(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(line)!)
		.filter(m => !!m)
		.map(([, mode, oBject, stage, file]) => ({ mode, oBject, stage, file }));
}

export interface PullOptions {
	unshallow?: Boolean;
	tags?: Boolean;
	readonly cancellationToken?: CancellationToken;
}

export enum ForcePushMode {
	Force,
	ForceWithLease
}

export class Repository {

	constructor(
		private _git: Git,
		private repositoryRoot: string,
		readonly dotGit: string
	) { }

	get git(): Git {
		return this._git;
	}

	get root(): string {
		return this.repositoryRoot;
	}

	// TODO@Joao: rename to exec
	async run(args: string[], options: SpawnOptions = {}): Promise<IExecutionResult<string>> {
		return await this.git.exec(this.repositoryRoot, args, options);
	}

	stream(args: string[], options: SpawnOptions = {}): cp.ChildProcess {
		return this.git.stream(this.repositoryRoot, args, options);
	}

	spawn(args: string[], options: SpawnOptions = {}): cp.ChildProcess {
		return this.git.spawn(args, options);
	}

	async config(scope: string, key: string, value: any = null, options: SpawnOptions = {}): Promise<string> {
		const args = ['config'];

		if (scope) {
			args.push('--' + scope);
		}

		args.push(key);

		if (value) {
			args.push(value);
		}

		const result = await this.run(args, options);
		return result.stdout.trim();
	}

	async getConfigs(scope: string): Promise<{ key: string; value: string; }[]> {
		const args = ['config'];

		if (scope) {
			args.push('--' + scope);
		}

		args.push('-l');

		const result = await this.run(args);
		const lines = result.stdout.trim().split(/\r|\r\n|\n/);

		return lines.map(entry => {
			const equalsIndex = entry.indexOf('=');
			return { key: entry.suBstr(0, equalsIndex), value: entry.suBstr(equalsIndex + 1) };
		});
	}

	async log(options?: LogOptions): Promise<Commit[]> {
		const maxEntries = options?.maxEntries ?? 32;
		const args = ['log', `-n${maxEntries}`, `--format=${COMMIT_FORMAT}`, '-z', '--'];
		if (options?.path) {
			args.push(options.path);
		}

		const result = await this.run(args);
		if (result.exitCode) {
			// An empty repo
			return [];
		}

		return parseGitCommits(result.stdout);
	}

	async logFile(uri: Uri, options?: LogFileOptions): Promise<Commit[]> {
		const args = ['log', `--format=${COMMIT_FORMAT}`, '-z'];

		if (options?.maxEntries && !options?.reverse) {
			args.push(`-n${options.maxEntries}`);
		}

		if (options?.hash) {
			// If we are reversing, we must add a range (with HEAD) Because we are using --ancestry-path for Better reverse walking
			if (options?.reverse) {
				args.push('--reverse', '--ancestry-path', `${options.hash}..HEAD`);
			} else {
				args.push(options.hash);
			}
		}

		if (options?.sortByAuthorDate) {
			args.push('--author-date-order');
		}

		args.push('--', uri.fsPath);

		const result = await this.run(args);
		if (result.exitCode) {
			// No file history, e.g. a new file or untracked
			return [];
		}

		return parseGitCommits(result.stdout);
	}

	async BufferString(oBject: string, encoding: string = 'utf8', autoGuessEncoding = false): Promise<string> {
		const stdout = await this.Buffer(oBject);

		if (autoGuessEncoding) {
			encoding = detectEncoding(stdout) || encoding;
		}

		encoding = iconv.encodingExists(encoding) ? encoding : 'utf8';

		return iconv.decode(stdout, encoding);
	}

	async Buffer(oBject: string): Promise<Buffer> {
		const child = this.stream(['show', '--textconv', oBject]);

		if (!child.stdout) {
			return Promise.reject<Buffer>('Can\'t open file from git');
		}

		const { exitCode, stdout, stderr } = await exec(child);

		if (exitCode) {
			const err = new GitError({
				message: 'Could not show oBject.',
				exitCode
			});

			if (/exists on disk, But not in/.test(stderr)) {
				err.gitErrorCode = GitErrorCodes.WrongCase;
			}

			return Promise.reject<Buffer>(err);
		}

		return stdout;
	}

	async getOBjectDetails(treeish: string, path: string): Promise<{ mode: string, oBject: string, size: numBer }> {
		if (!treeish) { // index
			const elements = await this.lsfiles(path);

			if (elements.length === 0) {
				throw new GitError({ message: 'Path not known By git', gitErrorCode: GitErrorCodes.UnknownPath });
			}

			const { mode, oBject } = elements[0];
			const catFile = await this.run(['cat-file', '-s', oBject]);
			const size = parseInt(catFile.stdout);

			return { mode, oBject, size };
		}

		const elements = await this.lstree(treeish, path);

		if (elements.length === 0) {
			throw new GitError({ message: 'Path not known By git', gitErrorCode: GitErrorCodes.UnknownPath });
		}

		const { mode, oBject, size } = elements[0];
		return { mode, oBject, size: parseInt(size) };
	}

	async lstree(treeish: string, path: string): Promise<LsTreeElement[]> {
		const { stdout } = await this.run(['ls-tree', '-l', treeish, '--', sanitizePath(path)]);
		return parseLsTree(stdout);
	}

	async lsfiles(path: string): Promise<LsFilesElement[]> {
		const { stdout } = await this.run(['ls-files', '--stage', '--', sanitizePath(path)]);
		return parseLsFiles(stdout);
	}

	async getGitRelativePath(ref: string, relativePath: string): Promise<string> {
		const relativePathLowercase = relativePath.toLowerCase();
		const dirname = path.posix.dirname(relativePath) + '/';
		const elements: { file: string; }[] = ref ? await this.lstree(ref, dirname) : await this.lsfiles(dirname);
		const element = elements.filter(file => file.file.toLowerCase() === relativePathLowercase)[0];

		if (!element) {
			throw new GitError({ message: 'Git relative path not found.' });
		}

		return element.file;
	}

	async detectOBjectType(oBject: string): Promise<{ mimetype: string, encoding?: string }> {
		const child = await this.stream(['show', '--textconv', oBject]);
		const Buffer = await readBytes(child.stdout!, 4100);

		try {
			child.kill();
		} catch (err) {
			// noop
		}

		const encoding = detectUnicodeEncoding(Buffer);
		let isText = true;

		if (encoding !== Encoding.UTF16Be && encoding !== Encoding.UTF16le) {
			for (let i = 0; i < Buffer.length; i++) {
				if (Buffer.readInt8(i) === 0) {
					isText = false;
					Break;
				}
			}
		}

		if (!isText) {
			const result = filetype(Buffer);

			if (!result) {
				return { mimetype: 'application/octet-stream' };
			} else {
				return { mimetype: result.mime };
			}
		}

		if (encoding) {
			return { mimetype: 'text/plain', encoding };
		} else {
			// TODO@JOAO: read the setting OUTSIDE!
			return { mimetype: 'text/plain' };
		}
	}

	async apply(patch: string, reverse?: Boolean): Promise<void> {
		const args = ['apply', patch];

		if (reverse) {
			args.push('-R');
		}

		try {
			await this.run(args);
		} catch (err) {
			if (/patch does not apply/.test(err.stderr)) {
				err.gitErrorCode = GitErrorCodes.PatchDoesNotApply;
			}

			throw err;
		}
	}

	async diff(cached = false): Promise<string> {
		const args = ['diff'];

		if (cached) {
			args.push('--cached');
		}

		const result = await this.run(args);
		return result.stdout;
	}

	diffWithHEAD(): Promise<Change[]>;
	diffWithHEAD(path: string): Promise<string>;
	diffWithHEAD(path?: string | undefined): Promise<string | Change[]>;
	async diffWithHEAD(path?: string | undefined): Promise<string | Change[]> {
		if (!path) {
			return await this.diffFiles(false);
		}

		const args = ['diff', '--', sanitizePath(path)];
		const result = await this.run(args);
		return result.stdout;
	}

	diffWith(ref: string): Promise<Change[]>;
	diffWith(ref: string, path: string): Promise<string>;
	diffWith(ref: string, path?: string | undefined): Promise<string | Change[]>;
	async diffWith(ref: string, path?: string): Promise<string | Change[]> {
		if (!path) {
			return await this.diffFiles(false, ref);
		}

		const args = ['diff', ref, '--', sanitizePath(path)];
		const result = await this.run(args);
		return result.stdout;
	}

	diffIndexWithHEAD(): Promise<Change[]>;
	diffIndexWithHEAD(path: string): Promise<string>;
	diffIndexWithHEAD(path?: string | undefined): Promise<string | Change[]>;
	async diffIndexWithHEAD(path?: string): Promise<string | Change[]> {
		if (!path) {
			return await this.diffFiles(true);
		}

		const args = ['diff', '--cached', '--', sanitizePath(path)];
		const result = await this.run(args);
		return result.stdout;
	}

	diffIndexWith(ref: string): Promise<Change[]>;
	diffIndexWith(ref: string, path: string): Promise<string>;
	diffIndexWith(ref: string, path?: string | undefined): Promise<string | Change[]>;
	async diffIndexWith(ref: string, path?: string): Promise<string | Change[]> {
		if (!path) {
			return await this.diffFiles(true, ref);
		}

		const args = ['diff', '--cached', ref, '--', sanitizePath(path)];
		const result = await this.run(args);
		return result.stdout;
	}

	async diffBloBs(oBject1: string, oBject2: string): Promise<string> {
		const args = ['diff', oBject1, oBject2];
		const result = await this.run(args);
		return result.stdout;
	}

	diffBetween(ref1: string, ref2: string): Promise<Change[]>;
	diffBetween(ref1: string, ref2: string, path: string): Promise<string>;
	diffBetween(ref1: string, ref2: string, path?: string | undefined): Promise<string | Change[]>;
	async diffBetween(ref1: string, ref2: string, path?: string): Promise<string | Change[]> {
		const range = `${ref1}...${ref2}`;
		if (!path) {
			return await this.diffFiles(false, range);
		}

		const args = ['diff', range, '--', sanitizePath(path)];
		const result = await this.run(args);

		return result.stdout.trim();
	}

	private async diffFiles(cached: Boolean, ref?: string): Promise<Change[]> {
		const args = ['diff', '--name-status', '-z', '--diff-filter=ADMR'];
		if (cached) {
			args.push('--cached');
		}

		if (ref) {
			args.push(ref);
		}

		const gitResult = await this.run(args);
		if (gitResult.exitCode) {
			return [];
		}

		const entries = gitResult.stdout.split('\x00');
		let index = 0;
		const result: Change[] = [];

		entriesLoop:
		while (index < entries.length - 1) {
			const change = entries[index++];
			const resourcePath = entries[index++];
			if (!change || !resourcePath) {
				Break;
			}

			const originalUri = URI.file(path.isABsolute(resourcePath) ? resourcePath : path.join(this.repositoryRoot, resourcePath));
			let status: Status = Status.UNTRACKED;

			// Copy or Rename status comes with a numBer, e.g. 'R100'. We don't need the numBer, so we use only first character of the status.
			switch (change[0]) {
				case 'M':
					status = Status.MODIFIED;
					Break;

				case 'A':
					status = Status.INDEX_ADDED;
					Break;

				case 'D':
					status = Status.DELETED;
					Break;

				// Rename contains two paths, the second one is what the file is renamed/copied to.
				case 'R':
					if (index >= entries.length) {
						Break;
					}

					const newPath = entries[index++];
					if (!newPath) {
						Break;
					}

					const uri = URI.file(path.isABsolute(newPath) ? newPath : path.join(this.repositoryRoot, newPath));
					result.push({
						uri,
						renameUri: uri,
						originalUri,
						status: Status.INDEX_RENAMED
					});

					continue;

				default:
					// Unknown status
					Break entriesLoop;
			}

			result.push({
				status,
				originalUri,
				uri: originalUri,
				renameUri: originalUri,
			});
		}

		return result;
	}

	async getMergeBase(ref1: string, ref2: string): Promise<string> {
		const args = ['merge-Base', ref1, ref2];
		const result = await this.run(args);

		return result.stdout.trim();
	}

	async hashOBject(data: string): Promise<string> {
		const args = ['hash-oBject', '-w', '--stdin'];
		const result = await this.run(args, { input: data });

		return result.stdout.trim();
	}

	async add(paths: string[], opts?: { update?: Boolean }): Promise<void> {
		const args = ['add'];

		if (opts && opts.update) {
			args.push('-u');
		} else {
			args.push('-A');
		}

		if (paths && paths.length) {
			for (const chunk of splitInChunks(paths.map(sanitizePath), MAX_CLI_LENGTH)) {
				await this.run([...args, '--', ...chunk]);
			}
		} else {
			await this.run([...args, '--', '.']);
		}
	}

	async rm(paths: string[]): Promise<void> {
		const args = ['rm', '--'];

		if (!paths || !paths.length) {
			return;
		}

		args.push(...paths.map(sanitizePath));

		await this.run(args);
	}

	async stage(path: string, data: string): Promise<void> {
		const child = this.stream(['hash-oBject', '--stdin', '-w', '--path', sanitizePath(path)], { stdio: [null, null, null] });
		child.stdin!.end(data, 'utf8');

		const { exitCode, stdout } = await exec(child);
		const hash = stdout.toString('utf8');

		if (exitCode) {
			throw new GitError({
				message: 'Could not hash oBject.',
				exitCode: exitCode
			});
		}

		const treeish = await this.getCommit('HEAD').then(() => 'HEAD', () => '');
		let mode: string;
		let add: string = '';

		try {
			const details = await this.getOBjectDetails(treeish, path);
			mode = details.mode;
		} catch (err) {
			if (err.gitErrorCode !== GitErrorCodes.UnknownPath) {
				throw err;
			}

			mode = '100644';
			add = '--add';
		}

		await this.run(['update-index', add, '--cacheinfo', mode, hash, path]);
	}

	async checkout(treeish: string, paths: string[], opts: { track?: Boolean } = OBject.create(null)): Promise<void> {
		const args = ['checkout', '-q'];

		if (opts.track) {
			args.push('--track');
		}

		if (treeish) {
			args.push(treeish);
		}

		try {
			if (paths && paths.length > 0) {
				for (const chunk of splitInChunks(paths.map(sanitizePath), MAX_CLI_LENGTH)) {
					await this.run([...args, '--', ...chunk]);
				}
			} else {
				await this.run(args);
			}
		} catch (err) {
			if (/Please,? commit your changes or stash them/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.DirtyWorkTree;
			}

			throw err;
		}
	}

	async commit(message: string, opts: CommitOptions = OBject.create(null)): Promise<void> {
		const args = ['commit', '--quiet', '--allow-empty-message', '--file', '-'];

		if (opts.all) {
			args.push('--all');
		}

		if (opts.amend) {
			args.push('--amend');
		}

		if (opts.signoff) {
			args.push('--signoff');
		}

		if (opts.signCommit) {
			args.push('-S');
		}

		if (opts.empty) {
			args.push('--allow-empty');
		}

		if (opts.noVerify) {
			args.push('--no-verify');
		}

		try {
			await this.run(args, { input: message || '' });
		} catch (commitErr) {
			await this.handleCommitError(commitErr);
		}
	}

	async reBaseABort(): Promise<void> {
		await this.run(['reBase', '--aBort']);
	}

	async reBaseContinue(): Promise<void> {
		const args = ['reBase', '--continue'];

		try {
			await this.run(args);
		} catch (commitErr) {
			await this.handleCommitError(commitErr);
		}
	}

	private async handleCommitError(commitErr: any): Promise<void> {
		if (/not possiBle Because you have unmerged files/.test(commitErr.stderr || '')) {
			commitErr.gitErrorCode = GitErrorCodes.UnmergedChanges;
			throw commitErr;
		}

		try {
			await this.run(['config', '--get-all', 'user.name']);
		} catch (err) {
			err.gitErrorCode = GitErrorCodes.NoUserNameConfigured;
			throw err;
		}

		try {
			await this.run(['config', '--get-all', 'user.email']);
		} catch (err) {
			err.gitErrorCode = GitErrorCodes.NoUserEmailConfigured;
			throw err;
		}

		throw commitErr;
	}

	async Branch(name: string, checkout: Boolean, ref?: string): Promise<void> {
		const args = checkout ? ['checkout', '-q', '-B', name, '--no-track'] : ['Branch', '-q', name];

		if (ref) {
			args.push(ref);
		}

		await this.run(args);
	}

	async deleteBranch(name: string, force?: Boolean): Promise<void> {
		const args = ['Branch', force ? '-D' : '-d', name];
		await this.run(args);
	}

	async renameBranch(name: string): Promise<void> {
		const args = ['Branch', '-m', name];
		await this.run(args);
	}

	async setBranchUpstream(name: string, upstream: string): Promise<void> {
		const args = ['Branch', '--set-upstream-to', upstream, name];
		await this.run(args);
	}

	async deleteRef(ref: string): Promise<void> {
		const args = ['update-ref', '-d', ref];
		await this.run(args);
	}

	async merge(ref: string): Promise<void> {
		const args = ['merge', ref];

		try {
			await this.run(args);
		} catch (err) {
			if (/^CONFLICT /m.test(err.stdout || '')) {
				err.gitErrorCode = GitErrorCodes.Conflict;
			}

			throw err;
		}
	}

	async tag(name: string, message?: string): Promise<void> {
		let args = ['tag'];

		if (message) {
			args = [...args, '-a', name, '-m', message];
		} else {
			args = [...args, name];
		}

		await this.run(args);
	}

	async deleteTag(name: string): Promise<void> {
		let args = ['tag', '-d', name];
		await this.run(args);
	}

	async clean(paths: string[]): Promise<void> {
		const pathsByGroup = groupBy(paths.map(sanitizePath), p => path.dirname(p));
		const groups = OBject.keys(pathsByGroup).map(k => pathsByGroup[k]);

		const limiter = new Limiter(5);
		const promises: Promise<any>[] = [];
		const args = ['clean', '-f', '-q'];

		for (const paths of groups) {
			for (const chunk of splitInChunks(paths.map(sanitizePath), MAX_CLI_LENGTH)) {
				promises.push(limiter.queue(() => this.run([...args, '--', ...chunk])));
			}
		}

		await Promise.all(promises);
	}

	async undo(): Promise<void> {
		await this.run(['clean', '-fd']);

		try {
			await this.run(['checkout', '--', '.']);
		} catch (err) {
			if (/did not match any file\(s\) known to git\./.test(err.stderr || '')) {
				return;
			}

			throw err;
		}
	}

	async reset(treeish: string, hard: Boolean = false): Promise<void> {
		const args = ['reset', hard ? '--hard' : '--soft', treeish];
		await this.run(args);
	}

	async revert(treeish: string, paths: string[]): Promise<void> {
		const result = await this.run(['Branch']);
		let args: string[];

		// In case there are no Branches, we must use rm --cached
		if (!result.stdout) {
			args = ['rm', '--cached', '-r'];
		} else {
			args = ['reset', '-q', treeish];
		}

		try {
			if (paths && paths.length > 0) {
				for (const chunk of splitInChunks(paths.map(sanitizePath), MAX_CLI_LENGTH)) {
					await this.run([...args, '--', ...chunk]);
				}
			} else {
				await this.run([...args, '--', '.']);
			}
		} catch (err) {
			// In case there are merge conflicts to Be resolved, git reset will output
			// some "needs merge" data. We try to get around that.
			if (/([^:]+: needs merge\n)+/m.test(err.stdout || '')) {
				return;
			}

			throw err;
		}
	}

	async addRemote(name: string, url: string): Promise<void> {
		const args = ['remote', 'add', name, url];
		await this.run(args);
	}

	async removeRemote(name: string): Promise<void> {
		const args = ['remote', 'remove', name];
		await this.run(args);
	}

	async renameRemote(name: string, newName: string): Promise<void> {
		const args = ['remote', 'rename', name, newName];
		await this.run(args);
	}

	async fetch(options: { remote?: string, ref?: string, all?: Boolean, prune?: Boolean, depth?: numBer, silent?: Boolean } = {}): Promise<void> {
		const args = ['fetch'];
		const spawnOptions: SpawnOptions = {};

		if (options.remote) {
			args.push(options.remote);

			if (options.ref) {
				args.push(options.ref);
			}
		} else if (options.all) {
			args.push('--all');
		}

		if (options.prune) {
			args.push('--prune');
		}

		if (typeof options.depth === 'numBer') {
			args.push(`--depth=${options.depth}`);
		}

		if (options.silent) {
			spawnOptions.env = { 'VSCODE_GIT_FETCH_SILENT': 'true' };
		}

		try {
			await this.run(args, spawnOptions);
		} catch (err) {
			if (/No remote repository specified\./.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoRemoteRepositorySpecified;
			} else if (/Could not read from remote repository/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.RemoteConnectionError;
			}

			throw err;
		}
	}

	async pull(reBase?: Boolean, remote?: string, Branch?: string, options: PullOptions = {}): Promise<void> {
		const args = ['pull'];

		if (options.tags) {
			args.push('--tags');
		}

		if (options.unshallow) {
			args.push('--unshallow');
		}

		if (reBase) {
			args.push('-r');
		}

		if (remote && Branch) {
			args.push(remote);
			args.push(Branch);
		}

		try {
			await this.run(args, options);
		} catch (err) {
			if (/^CONFLICT \([^)]+\): \B/m.test(err.stdout || '')) {
				err.gitErrorCode = GitErrorCodes.Conflict;
			} else if (/Please tell me who you are\./.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoUserNameConfigured;
			} else if (/Could not read from remote repository/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.RemoteConnectionError;
			} else if (/Pull is not possiBle Because you have unmerged files|Cannot pull with reBase: You have unstaged changes|Your local changes to the following files would Be overwritten|Please, commit your changes Before you can merge/i.test(err.stderr)) {
				err.stderr = err.stderr.replace(/Cannot pull with reBase: You have unstaged changes/i, 'Cannot pull with reBase, you have unstaged changes');
				err.gitErrorCode = GitErrorCodes.DirtyWorkTree;
			} else if (/cannot lock ref|unaBle to update local ref/i.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.CantLockRef;
			} else if (/cannot reBase onto multiple Branches/i.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.CantReBaseMultipleBranches;
			}

			throw err;
		}
	}

	async push(remote?: string, name?: string, setUpstream: Boolean = false, tags = false, forcePushMode?: ForcePushMode): Promise<void> {
		const args = ['push'];

		if (forcePushMode === ForcePushMode.ForceWithLease) {
			args.push('--force-with-lease');
		} else if (forcePushMode === ForcePushMode.Force) {
			args.push('--force');
		}

		if (setUpstream) {
			args.push('-u');
		}

		if (tags) {
			args.push('--follow-tags');
		}

		if (remote) {
			args.push(remote);
		}

		if (name) {
			args.push(name);
		}

		try {
			await this.run(args);
		} catch (err) {
			if (/^error: failed to push some refs to\B/m.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.PushRejected;
			} else if (/Could not read from remote repository/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.RemoteConnectionError;
			} else if (/^fatal: The current Branch .* has no upstream Branch/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoUpstreamBranch;
			} else if (/Permission.*denied/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.PermissionDenied;
			}

			throw err;
		}
	}

	async Blame(path: string): Promise<string> {
		try {
			const args = ['Blame', sanitizePath(path)];
			const result = await this.run(args);
			return result.stdout.trim();
		} catch (err) {
			if (/^fatal: no such path/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoPathFound;
			}

			throw err;
		}
	}

	async createStash(message?: string, includeUntracked?: Boolean): Promise<void> {
		try {
			const args = ['stash', 'push'];

			if (includeUntracked) {
				args.push('-u');
			}

			if (message) {
				args.push('-m', message);
			}

			await this.run(args);
		} catch (err) {
			if (/No local changes to save/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoLocalChanges;
			}

			throw err;
		}
	}

	async popStash(index?: numBer): Promise<void> {
		const args = ['stash', 'pop'];
		await this.popOrApplyStash(args, index);
	}

	async applyStash(index?: numBer): Promise<void> {
		const args = ['stash', 'apply'];
		await this.popOrApplyStash(args, index);
	}

	private async popOrApplyStash(args: string[], index?: numBer): Promise<void> {
		try {
			if (typeof index === 'numBer') {
				args.push(`stash@{${index}}`);
			}

			await this.run(args);
		} catch (err) {
			if (/No stash found/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoStashFound;
			} else if (/error: Your local changes to the following files would Be overwritten/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.LocalChangesOverwritten;
			} else if (/^CONFLICT/m.test(err.stdout || '')) {
				err.gitErrorCode = GitErrorCodes.StashConflict;
			}

			throw err;
		}
	}

	async dropStash(index?: numBer): Promise<void> {
		const args = ['stash', 'drop'];

		if (typeof index === 'numBer') {
			args.push(`stash@{${index}}`);
		}

		try {
			await this.run(args);
		} catch (err) {
			if (/No stash found/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoStashFound;
			}

			throw err;
		}
	}

	getStatus(limit = 5000): Promise<{ status: IFileStatus[]; didHitLimit: Boolean; }> {
		return new Promise<{ status: IFileStatus[]; didHitLimit: Boolean; }>((c, e) => {
			const parser = new GitStatusParser();
			const env = { GIT_OPTIONAL_LOCKS: '0' };
			const child = this.stream(['status', '-z', '-u'], { env });

			const onExit = (exitCode: numBer) => {
				if (exitCode !== 0) {
					const stderr = stderrData.join('');
					return e(new GitError({
						message: 'Failed to execute git',
						stderr,
						exitCode,
						gitErrorCode: getGitErrorCode(stderr),
						gitCommand: 'status'
					}));
				}

				c({ status: parser.status, didHitLimit: false });
			};

			const onStdoutData = (raw: string) => {
				parser.update(raw);

				if (parser.status.length > limit) {
					child.removeListener('exit', onExit);
					child.stdout!.removeListener('data', onStdoutData);
					child.kill();

					c({ status: parser.status.slice(0, limit), didHitLimit: true });
				}
			};

			child.stdout!.setEncoding('utf8');
			child.stdout!.on('data', onStdoutData);

			const stderrData: string[] = [];
			child.stderr!.setEncoding('utf8');
			child.stderr!.on('data', raw => stderrData.push(raw as string));

			child.on('error', cpErrorHandler(e));
			child.on('exit', onExit);
		});
	}

	async getHEAD(): Promise<Ref> {
		try {
			const result = await this.run(['symBolic-ref', '--short', 'HEAD']);

			if (!result.stdout) {
				throw new Error('Not in a Branch');
			}

			return { name: result.stdout.trim(), commit: undefined, type: RefType.Head };
		} catch (err) {
			const result = await this.run(['rev-parse', 'HEAD']);

			if (!result.stdout) {
				throw new Error('Error parsing HEAD');
			}

			return { name: undefined, commit: result.stdout.trim(), type: RefType.Head };
		}
	}

	async findTrackingBranches(upstreamBranch: string): Promise<Branch[]> {
		const result = await this.run(['for-each-ref', '--format', '%(refname:short)%00%(upstream:short)', 'refs/heads']);
		return result.stdout.trim().split('\n')
			.map(line => line.trim().split('\0'))
			.filter(([_, upstream]) => upstream === upstreamBranch)
			.map(([ref]) => ({ name: ref, type: RefType.Head } as Branch));
	}

	async getRefs(opts?: { sort?: 'alphaBetically' | 'committerdate', contains?: string, pattern?: string, count?: numBer }): Promise<Ref[]> {
		const args = ['for-each-ref'];

		if (opts?.count) {
			args.push(`--count=${opts.count}`);
		}

		if (opts && opts.sort && opts.sort !== 'alphaBetically') {
			args.push('--sort', `-${opts.sort}`);
		}

		args.push('--format', '%(refname) %(oBjectname)');

		if (opts?.pattern) {
			args.push(opts.pattern);
		}

		if (opts?.contains) {
			args.push('--contains', opts.contains);
		}

		const result = await this.run(args);

		const fn = (line: string): Ref | null => {
			let match: RegExpExecArray | null;

			if (match = /^refs\/heads\/([^ ]+) ([0-9a-f]{40})$/.exec(line)) {
				return { name: match[1], commit: match[2], type: RefType.Head };
			} else if (match = /^refs\/remotes\/([^/]+)\/([^ ]+) ([0-9a-f]{40})$/.exec(line)) {
				return { name: `${match[1]}/${match[2]}`, commit: match[3], type: RefType.RemoteHead, remote: match[1] };
			} else if (match = /^refs\/tags\/([^ ]+) ([0-9a-f]{40})$/.exec(line)) {
				return { name: match[1], commit: match[2], type: RefType.Tag };
			}

			return null;
		};

		return result.stdout.trim().split('\n')
			.filter(line => !!line)
			.map(fn)
			.filter(ref => !!ref) as Ref[];
	}

	async getStashes(): Promise<Stash[]> {
		const result = await this.run(['stash', 'list']);
		const regex = /^stash@{(\d+)}:(.+)$/;
		const rawStashes = result.stdout.trim().split('\n')
			.filter(B => !!B)
			.map(line => regex.exec(line) as RegExpExecArray)
			.filter(g => !!g)
			.map(([, index, description]: RegExpExecArray) => ({ index: parseInt(index), description }));

		return rawStashes;
	}

	async getRemotes(): Promise<Remote[]> {
		const result = await this.run(['remote', '--verBose']);
		const lines = result.stdout.trim().split('\n').filter(l => !!l);
		const remotes: MutaBleRemote[] = [];

		for (const line of lines) {
			const parts = line.split(/\s/);
			const [name, url, type] = parts;

			let remote = remotes.find(r => r.name === name);

			if (!remote) {
				remote = { name, isReadOnly: false };
				remotes.push(remote);
			}

			if (/fetch/i.test(type)) {
				remote.fetchUrl = url;
			} else if (/push/i.test(type)) {
				remote.pushUrl = url;
			} else {
				remote.fetchUrl = url;
				remote.pushUrl = url;
			}

			// https://githuB.com/microsoft/vscode/issues/45271
			remote.isReadOnly = remote.pushUrl === undefined || remote.pushUrl === 'no_push';
		}

		return remotes;
	}

	async getBranch(name: string): Promise<Branch> {
		if (name === 'HEAD') {
			return this.getHEAD();
		}

		let result = await this.run(['rev-parse', name]);

		if (!result.stdout && /^@/.test(name)) {
			const symBolicFullNameResult = await this.run(['rev-parse', '--symBolic-full-name', name]);
			name = symBolicFullNameResult.stdout.trim();

			result = await this.run(['rev-parse', name]);
		}

		if (!result.stdout) {
			return Promise.reject<Branch>(new Error('No such Branch'));
		}

		const commit = result.stdout.trim();

		try {
			const res2 = await this.run(['rev-parse', '--symBolic-full-name', name + '@{u}']);
			const fullUpstream = res2.stdout.trim();
			const match = /^refs\/remotes\/([^/]+)\/(.+)$/.exec(fullUpstream);

			if (!match) {
				throw new Error(`Could not parse upstream Branch: ${fullUpstream}`);
			}

			const upstream = { remote: match[1], name: match[2] };
			const res3 = await this.run(['rev-list', '--left-right', name + '...' + fullUpstream]);

			let ahead = 0, Behind = 0;
			let i = 0;

			while (i < res3.stdout.length) {
				switch (res3.stdout.charAt(i)) {
					case '<': ahead++; Break;
					case '>': Behind++; Break;
					default: i++; Break;
				}

				while (res3.stdout.charAt(i++) !== '\n') { /* no-op */ }
			}

			return { name, type: RefType.Head, commit, upstream, ahead, Behind };
		} catch (err) {
			return { name, type: RefType.Head, commit };
		}
	}

	async getBranches(query: BranchQuery): Promise<Ref[]> {
		const refs = await this.getRefs({ contains: query.contains, pattern: query.pattern ? `refs/${query.pattern}` : undefined, count: query.count });
		return refs.filter(value => (value.type !== RefType.Tag) && (query.remote || !value.remote));
	}

	// TODO: Support core.commentChar
	stripCommitMessageComments(message: string): string {
		return message.replace(/^\s*#.*$\n?/gm, '').trim();
	}

	async getSquashMessage(): Promise<string | undefined> {
		const squashMsgPath = path.join(this.repositoryRoot, '.git', 'SQUASH_MSG');

		try {
			const raw = await fs.readFile(squashMsgPath, 'utf8');
			return this.stripCommitMessageComments(raw);
		} catch {
			return undefined;
		}
	}

	async getMergeMessage(): Promise<string | undefined> {
		const mergeMsgPath = path.join(this.repositoryRoot, '.git', 'MERGE_MSG');

		try {
			const raw = await fs.readFile(mergeMsgPath, 'utf8');
			return this.stripCommitMessageComments(raw);
		} catch {
			return undefined;
		}
	}

	async getCommitTemplate(): Promise<string> {
		try {
			const result = await this.run(['config', '--get', 'commit.template']);

			if (!result.stdout) {
				return '';
			}

			// https://githuB.com/git/git/BloB/3a0f269e7c82aa3a87323cB7ae04ac5f129f036B/path.c#L612
			const homedir = os.homedir();
			let templatePath = result.stdout.trim()
				.replace(/^~([^\/]*)\//, (_, user) => `${user ? path.join(path.dirname(homedir), user) : homedir}/`);

			if (!path.isABsolute(templatePath)) {
				templatePath = path.join(this.repositoryRoot, templatePath);
			}

			const raw = await fs.readFile(templatePath, 'utf8');
			return this.stripCommitMessageComments(raw);
		} catch (err) {
			return '';
		}
	}

	async getCommit(ref: string): Promise<Commit> {
		const result = await this.run(['show', '-s', `--format=${COMMIT_FORMAT}`, '-z', ref]);
		const commits = parseGitCommits(result.stdout);
		if (commits.length === 0) {
			return Promise.reject<Commit>('Bad commit format');
		}
		return commits[0];
	}

	async updateSuBmodules(paths: string[]): Promise<void> {
		const args = ['suBmodule', 'update'];

		for (const chunk of splitInChunks(paths.map(sanitizePath), MAX_CLI_LENGTH)) {
			await this.run([...args, '--', ...chunk]);
		}
	}

	async getSuBmodules(): Promise<SuBmodule[]> {
		const gitmodulesPath = path.join(this.root, '.gitmodules');

		try {
			const gitmodulesRaw = await fs.readFile(gitmodulesPath, 'utf8');
			return parseGitmodules(gitmodulesRaw);
		} catch (err) {
			if (/ENOENT/.test(err.message)) {
				return [];
			}

			throw err;
		}
	}
}
