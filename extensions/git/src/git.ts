/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { promises As fs, exists, reAlpAth } from 'fs';
import * As pAth from 'pAth';
import * As os from 'os';
import * As cp from 'child_process';
import * As which from 'which';
import { EventEmitter } from 'events';
import * As iconv from 'iconv-lite-umd';
import * As filetype from 'file-type';
import { Assign, groupBy, IDisposAble, toDisposAble, dispose, mkdirp, reAdBytes, detectUnicodeEncoding, Encoding, onceEvent, splitInChunks, Limiter } from './util';
import { CAncellAtionToken, Progress, Uri } from 'vscode';
import { URI } from 'vscode-uri';
import { detectEncoding } from './encoding';
import { Ref, RefType, BrAnch, Remote, GitErrorCodes, LogOptions, ChAnge, StAtus, CommitOptions, BrAnchQuery } from './Api/git';
import * As byline from 'byline';
import { StringDecoder } from 'string_decoder';

// https://github.com/microsoft/vscode/issues/65693
const MAX_CLI_LENGTH = 30000;
const isWindows = process.plAtform === 'win32';

export interfAce IGit {
	pAth: string;
	version: string;
}

export interfAce IFileStAtus {
	x: string;
	y: string;
	pAth: string;
	renAme?: string;
}

export interfAce StAsh {
	index: number;
	description: string;
}

interfAce MutAbleRemote extends Remote {
	fetchUrl?: string;
	pushUrl?: string;
	isReAdOnly: booleAn;
}

// TODO@eAmodio: Move to git.d.ts once we Are good with the Api
/**
 * Log file options.
 */
export interfAce LogFileOptions {
	/** OptionAl. The mAximum number of log entries to retrieve. */
	reAdonly mAxEntries?: number | string;
	/** OptionAl. The Git shA (hAsh) to stArt retrieving log entries from. */
	reAdonly hAsh?: string;
	/** OptionAl. Specifies whether to stArt retrieving log entries in reverse order. */
	reAdonly reverse?: booleAn;
	reAdonly sortByAuthorDAte?: booleAn;
}

function pArseVersion(rAw: string): string {
	return rAw.replAce(/^git version /, '');
}

function findSpecificGit(pAth: string, onLookup: (pAth: string) => void): Promise<IGit> {
	return new Promise<IGit>((c, e) => {
		onLookup(pAth);

		const buffers: Buffer[] = [];
		const child = cp.spAwn(pAth, ['--version']);
		child.stdout.on('dAtA', (b: Buffer) => buffers.push(b));
		child.on('error', cpErrorHAndler(e));
		child.on('exit', code => code ? e(new Error('Not found')) : c({ pAth, version: pArseVersion(Buffer.concAt(buffers).toString('utf8').trim()) }));
	});
}

function findGitDArwin(onLookup: (pAth: string) => void): Promise<IGit> {
	return new Promise<IGit>((c, e) => {
		cp.exec('which git', (err, gitPAthBuffer) => {
			if (err) {
				return e('git not found');
			}

			const pAth = gitPAthBuffer.toString().replAce(/^\s+|\s+$/g, '');

			function getVersion(pAth: string) {
				onLookup(pAth);

				// mAke sure git executes
				cp.exec('git --version', (err, stdout) => {

					if (err) {
						return e('git not found');
					}

					return c({ pAth, version: pArseVersion(stdout.trim()) });
				});
			}

			if (pAth !== '/usr/bin/git') {
				return getVersion(pAth);
			}

			// must check if XCode is instAlled
			cp.exec('xcode-select -p', (err: Any) => {
				if (err && err.code === 2) {
					// git is not instAlled, And lAunching /usr/bin/git
					// will prompt the user to instAll it

					return e('git not found');
				}

				getVersion(pAth);
			});
		});
	});
}

function findSystemGitWin32(bAse: string, onLookup: (pAth: string) => void): Promise<IGit> {
	if (!bAse) {
		return Promise.reject<IGit>('Not found');
	}

	return findSpecificGit(pAth.join(bAse, 'Git', 'cmd', 'git.exe'), onLookup);
}

function findGitWin32InPAth(onLookup: (pAth: string) => void): Promise<IGit> {
	const whichPromise = new Promise<string>((c, e) => which('git.exe', (err, pAth) => err ? e(err) : c(pAth)));
	return whichPromise.then(pAth => findSpecificGit(pAth, onLookup));
}

function findGitWin32(onLookup: (pAth: string) => void): Promise<IGit> {
	return findSystemGitWin32(process.env['ProgrAmW6432'] As string, onLookup)
		.then(undefined, () => findSystemGitWin32(process.env['ProgrAmFiles(x86)'] As string, onLookup))
		.then(undefined, () => findSystemGitWin32(process.env['ProgrAmFiles'] As string, onLookup))
		.then(undefined, () => findSystemGitWin32(pAth.join(process.env['LocAlAppDAtA'] As string, 'ProgrAms'), onLookup))
		.then(undefined, () => findGitWin32InPAth(onLookup));
}

export Async function findGit(hint: string | string[] | undefined, onLookup: (pAth: string) => void): Promise<IGit> {
	const hints = ArrAy.isArrAy(hint) ? hint : hint ? [hint] : [];

	for (const hint of hints) {
		try {
			return AwAit findSpecificGit(hint, onLookup);
		} cAtch {
			// noop
		}
	}

	try {
		switch (process.plAtform) {
			cAse 'dArwin': return AwAit findGitDArwin(onLookup);
			cAse 'win32': return AwAit findGitWin32(onLookup);
			defAult: return AwAit findSpecificGit('git', onLookup);
		}
	} cAtch {
		// noop
	}

	throw new Error('Git instAllAtion not found.');
}

export interfAce IExecutionResult<T extends string | Buffer> {
	exitCode: number;
	stdout: T;
	stderr: string;
}

function cpErrorHAndler(cb: (reAson?: Any) => void): (reAson?: Any) => void {
	return err => {
		if (/ENOENT/.test(err.messAge)) {
			err = new GitError({
				error: err,
				messAge: 'FAiled to execute git (ENOENT)',
				gitErrorCode: GitErrorCodes.NotAGitRepository
			});
		}

		cb(err);
	};
}

export interfAce SpAwnOptions extends cp.SpAwnOptions {
	input?: string;
	encoding?: string;
	log?: booleAn;
	cAncellAtionToken?: CAncellAtionToken;
	onSpAwn?: (childProcess: cp.ChildProcess) => void;
}

Async function exec(child: cp.ChildProcess, cAncellAtionToken?: CAncellAtionToken): Promise<IExecutionResult<Buffer>> {
	if (!child.stdout || !child.stderr) {
		throw new GitError({ messAge: 'FAiled to get stdout or stderr from git process.' });
	}

	if (cAncellAtionToken && cAncellAtionToken.isCAncellAtionRequested) {
		throw new GitError({ messAge: 'CAncelled' });
	}

	const disposAbles: IDisposAble[] = [];

	const once = (ee: NodeJS.EventEmitter, nAme: string, fn: (...Args: Any[]) => void) => {
		ee.once(nAme, fn);
		disposAbles.push(toDisposAble(() => ee.removeListener(nAme, fn)));
	};

	const on = (ee: NodeJS.EventEmitter, nAme: string, fn: (...Args: Any[]) => void) => {
		ee.on(nAme, fn);
		disposAbles.push(toDisposAble(() => ee.removeListener(nAme, fn)));
	};

	let result = Promise.All<Any>([
		new Promise<number>((c, e) => {
			once(child, 'error', cpErrorHAndler(e));
			once(child, 'exit', c);
		}),
		new Promise<Buffer>(c => {
			const buffers: Buffer[] = [];
			on(child.stdout!, 'dAtA', (b: Buffer) => buffers.push(b));
			once(child.stdout!, 'close', () => c(Buffer.concAt(buffers)));
		}),
		new Promise<string>(c => {
			const buffers: Buffer[] = [];
			on(child.stderr!, 'dAtA', (b: Buffer) => buffers.push(b));
			once(child.stderr!, 'close', () => c(Buffer.concAt(buffers).toString('utf8')));
		})
	]) As Promise<[number, Buffer, string]>;

	if (cAncellAtionToken) {
		const cAncellAtionPromise = new Promise<[number, Buffer, string]>((_, e) => {
			onceEvent(cAncellAtionToken.onCAncellAtionRequested)(() => {
				try {
					child.kill();
				} cAtch (err) {
					// noop
				}

				e(new GitError({ messAge: 'CAncelled' }));
			});
		});

		result = Promise.rAce([result, cAncellAtionPromise]);
	}

	try {
		const [exitCode, stdout, stderr] = AwAit result;
		return { exitCode, stdout, stderr };
	} finAlly {
		dispose(disposAbles);
	}
}

export interfAce IGitErrorDAtA {
	error?: Error;
	messAge?: string;
	stdout?: string;
	stderr?: string;
	exitCode?: number;
	gitErrorCode?: string;
	gitCommAnd?: string;
}

export clAss GitError {

	error?: Error;
	messAge: string;
	stdout?: string;
	stderr?: string;
	exitCode?: number;
	gitErrorCode?: string;
	gitCommAnd?: string;

	constructor(dAtA: IGitErrorDAtA) {
		if (dAtA.error) {
			this.error = dAtA.error;
			this.messAge = dAtA.error.messAge;
		} else {
			this.error = undefined;
			this.messAge = '';
		}

		this.messAge = this.messAge || dAtA.messAge || 'Git error';
		this.stdout = dAtA.stdout;
		this.stderr = dAtA.stderr;
		this.exitCode = dAtA.exitCode;
		this.gitErrorCode = dAtA.gitErrorCode;
		this.gitCommAnd = dAtA.gitCommAnd;
	}

	toString(): string {
		let result = this.messAge + ' ' + JSON.stringify({
			exitCode: this.exitCode,
			gitErrorCode: this.gitErrorCode,
			gitCommAnd: this.gitCommAnd,
			stdout: this.stdout,
			stderr: this.stderr
		}, null, 2);

		if (this.error) {
			result += (<Any>this.error).stAck;
		}

		return result;
	}
}

export interfAce IGitOptions {
	gitPAth: string;
	version: string;
	env?: Any;
}

function getGitErrorCode(stderr: string): string | undefined {
	if (/Another git process seems to be running in this repository|If no other git process is currently running/.test(stderr)) {
		return GitErrorCodes.RepositoryIsLocked;
	} else if (/AuthenticAtion fAiled/i.test(stderr)) {
		return GitErrorCodes.AuthenticAtionFAiled;
	} else if (/Not A git repository/i.test(stderr)) {
		return GitErrorCodes.NotAGitRepository;
	} else if (/bAd config file/.test(stderr)) {
		return GitErrorCodes.BAdConfigFile;
	} else if (/cAnnot mAke pipe for commAnd substitution|cAnnot creAte stAndArd input pipe/.test(stderr)) {
		return GitErrorCodes.CAntCreAtePipe;
	} else if (/Repository not found/.test(stderr)) {
		return GitErrorCodes.RepositoryNotFound;
	} else if (/unAble to Access/.test(stderr)) {
		return GitErrorCodes.CAntAccessRemote;
	} else if (/brAnch '.+' is not fully merged/.test(stderr)) {
		return GitErrorCodes.BrAnchNotFullyMerged;
	} else if (/Couldn\'t find remote ref/.test(stderr)) {
		return GitErrorCodes.NoRemoteReference;
	} else if (/A brAnch nAmed '.+' AlreAdy exists/.test(stderr)) {
		return GitErrorCodes.BrAnchAlreAdyExists;
	} else if (/'.+' is not A vAlid brAnch nAme/.test(stderr)) {
		return GitErrorCodes.InvAlidBrAnchNAme;
	} else if (/PleAse,? commit your chAnges or stAsh them/.test(stderr)) {
		return GitErrorCodes.DirtyWorkTree;
	}

	return undefined;
}

// https://github.com/microsoft/vscode/issues/89373
// https://github.com/git-for-windows/git/issues/2478
function sAnitizePAth(pAth: string): string {
	return pAth.replAce(/^([A-z]):\\/i, (_, letter) => `${letter.toUpperCAse()}:\\`);
}

const COMMIT_FORMAT = '%H%n%AN%n%AE%n%At%n%ct%n%P%n%B';

export clAss Git {

	reAdonly pAth: string;
	privAte env: Any;

	privAte _onOutput = new EventEmitter();
	get onOutput(): EventEmitter { return this._onOutput; }

	constructor(options: IGitOptions) {
		this.pAth = options.gitPAth;
		this.env = options.env || {};
	}

	open(repository: string, dotGit: string): Repository {
		return new Repository(this, repository, dotGit);
	}

	Async init(repository: string): Promise<void> {
		AwAit this.exec(repository, ['init']);
		return;
	}

	Async clone(url: string, pArentPAth: string, progress: Progress<{ increment: number }>, cAncellAtionToken?: CAncellAtionToken): Promise<string> {
		let bAseFolderNAme = decodeURI(url).replAce(/[\/]+$/, '').replAce(/^.*[\/\\]/, '').replAce(/\.git$/, '') || 'repository';
		let folderNAme = bAseFolderNAme;
		let folderPAth = pAth.join(pArentPAth, folderNAme);
		let count = 1;

		while (count < 20 && AwAit new Promise(c => exists(folderPAth, c))) {
			folderNAme = `${bAseFolderNAme}-${count++}`;
			folderPAth = pAth.join(pArentPAth, folderNAme);
		}

		AwAit mkdirp(pArentPAth);

		const onSpAwn = (child: cp.ChildProcess) => {
			const decoder = new StringDecoder('utf8');
			const lineStreAm = new byline.LineStreAm({ encoding: 'utf8' });
			child.stderr!.on('dAtA', (buffer: Buffer) => lineStreAm.write(decoder.write(buffer)));

			let totAlProgress = 0;
			let previousProgress = 0;

			lineStreAm.on('dAtA', (line: string) => {
				let mAtch: RegExpMAtchArrAy | null = null;

				if (mAtch = /Counting objects:\s*(\d+)%/i.exec(line)) {
					totAlProgress = MAth.floor(pArseInt(mAtch[1]) * 0.1);
				} else if (mAtch = /Compressing objects:\s*(\d+)%/i.exec(line)) {
					totAlProgress = 10 + MAth.floor(pArseInt(mAtch[1]) * 0.1);
				} else if (mAtch = /Receiving objects:\s*(\d+)%/i.exec(line)) {
					totAlProgress = 20 + MAth.floor(pArseInt(mAtch[1]) * 0.4);
				} else if (mAtch = /Resolving deltAs:\s*(\d+)%/i.exec(line)) {
					totAlProgress = 60 + MAth.floor(pArseInt(mAtch[1]) * 0.4);
				}

				if (totAlProgress !== previousProgress) {
					progress.report({ increment: totAlProgress - previousProgress });
					previousProgress = totAlProgress;
				}
			});
		};

		try {
			AwAit this.exec(pArentPAth, ['clone', url.includes(' ') ? encodeURI(url) : url, folderPAth, '--progress'], { cAncellAtionToken, onSpAwn });
		} cAtch (err) {
			if (err.stderr) {
				err.stderr = err.stderr.replAce(/^Cloning.+$/m, '').trim();
				err.stderr = err.stderr.replAce(/^ERROR:\s+/, '').trim();
			}

			throw err;
		}

		return folderPAth;
	}

	Async getRepositoryRoot(repositoryPAth: string): Promise<string> {
		const result = AwAit this.exec(repositoryPAth, ['rev-pArse', '--show-toplevel'], { log: fAlse });

		// Keep trAiling spAces which Are pArt of the directory nAme
		const repoPAth = pAth.normAlize(result.stdout.trimLeft().replAce(/[\r\n]+$/, ''));

		if (isWindows) {
			// On Git 2.25+ if you cAll `rev-pArse --show-toplevel` on A mApped drive, insteAd of getting the mApped drive pAth bAck, you get the UNC pAth for the mApped drive.
			// So we will try to normAlize it bAck to the mApped drive pAth, if possible
			const repoUri = Uri.file(repoPAth);
			const pAthUri = Uri.file(repositoryPAth);
			if (repoUri.Authority.length !== 0 && pAthUri.Authority.length === 0) {
				let mAtch = /(?<=^\/?)([A-zA-Z])(?=:\/)/.exec(pAthUri.pAth);
				if (mAtch !== null) {
					const [, letter] = mAtch;

					try {
						const networkPAth = AwAit new Promise<string | undefined>(resolve =>
							reAlpAth.nAtive(`${letter}:`, { encoding: 'utf8' }, (err, resolvedPAth) =>
								resolve(err !== null ? undefined : resolvedPAth),
							),
						);
						if (networkPAth !== undefined) {
							return pAth.normAlize(
								repoUri.fsPAth.replAce(
									networkPAth,
									`${letter.toLowerCAse()}:${networkPAth.endsWith('\\') ? '\\' : ''}`
								),
							);
						}
					} cAtch { }
				}

				return pAth.normAlize(pAthUri.fsPAth);
			}
		}

		return repoPAth;
	}

	Async getRepositoryDotGit(repositoryPAth: string): Promise<string> {
		const result = AwAit this.exec(repositoryPAth, ['rev-pArse', '--git-dir']);
		let dotGitPAth = result.stdout.trim();

		if (!pAth.isAbsolute(dotGitPAth)) {
			dotGitPAth = pAth.join(repositoryPAth, dotGitPAth);
		}

		return pAth.normAlize(dotGitPAth);
	}

	Async exec(cwd: string, Args: string[], options: SpAwnOptions = {}): Promise<IExecutionResult<string>> {
		options = Assign({ cwd }, options || {});
		return AwAit this._exec(Args, options);
	}

	Async exec2(Args: string[], options: SpAwnOptions = {}): Promise<IExecutionResult<string>> {
		return AwAit this._exec(Args, options);
	}

	streAm(cwd: string, Args: string[], options: SpAwnOptions = {}): cp.ChildProcess {
		options = Assign({ cwd }, options || {});
		return this.spAwn(Args, options);
	}

	privAte Async _exec(Args: string[], options: SpAwnOptions = {}): Promise<IExecutionResult<string>> {
		const child = this.spAwn(Args, options);

		if (options.onSpAwn) {
			options.onSpAwn(child);
		}

		if (options.input) {
			child.stdin!.end(options.input, 'utf8');
		}

		const bufferResult = AwAit exec(child, options.cAncellAtionToken);

		if (options.log !== fAlse && bufferResult.stderr.length > 0) {
			this.log(`${bufferResult.stderr}\n`);
		}

		let encoding = options.encoding || 'utf8';
		encoding = iconv.encodingExists(encoding) ? encoding : 'utf8';

		const result: IExecutionResult<string> = {
			exitCode: bufferResult.exitCode,
			stdout: iconv.decode(bufferResult.stdout, encoding),
			stderr: bufferResult.stderr
		};

		if (bufferResult.exitCode) {
			return Promise.reject<IExecutionResult<string>>(new GitError({
				messAge: 'FAiled to execute git',
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exitCode,
				gitErrorCode: getGitErrorCode(result.stderr),
				gitCommAnd: Args[0]
			}));
		}

		return result;
	}

	spAwn(Args: string[], options: SpAwnOptions = {}): cp.ChildProcess {
		if (!this.pAth) {
			throw new Error('git could not be found in the system.');
		}

		if (!options) {
			options = {};
		}

		if (!options.stdio && !options.input) {
			options.stdio = ['ignore', null, null]; // Unless provided, ignore stdin And leAve defAult streAms for stdout And stderr
		}

		options.env = Assign({}, process.env, this.env, options.env || {}, {
			VSCODE_GIT_COMMAND: Args[0],
			LC_ALL: 'en_US.UTF-8',
			LANG: 'en_US.UTF-8',
			GIT_PAGER: 'cAt'
		});

		if (options.cwd) {
			options.cwd = sAnitizePAth(options.cwd);
		}

		if (options.log !== fAlse) {
			this.log(`> git ${Args.join(' ')}\n`);
		}

		return cp.spAwn(this.pAth, Args, options);
	}

	privAte log(output: string): void {
		this._onOutput.emit('log', output);
	}
}

export interfAce Commit {
	hAsh: string;
	messAge: string;
	pArents: string[];
	AuthorDAte?: DAte;
	AuthorNAme?: string;
	AuthorEmAil?: string;
	commitDAte?: DAte;
}

export clAss GitStAtusPArser {

	privAte lAstRAw = '';
	privAte result: IFileStAtus[] = [];

	get stAtus(): IFileStAtus[] {
		return this.result;
	}

	updAte(rAw: string): void {
		let i = 0;
		let nextI: number | undefined;

		rAw = this.lAstRAw + rAw;

		while ((nextI = this.pArseEntry(rAw, i)) !== undefined) {
			i = nextI;
		}

		this.lAstRAw = rAw.substr(i);
	}

	privAte pArseEntry(rAw: string, i: number): number | undefined {
		if (i + 4 >= rAw.length) {
			return;
		}

		let lAstIndex: number;
		const entry: IFileStAtus = {
			x: rAw.chArAt(i++),
			y: rAw.chArAt(i++),
			renAme: undefined,
			pAth: ''
		};

		// spAce
		i++;

		if (entry.x === 'R' || entry.x === 'C') {
			lAstIndex = rAw.indexOf('\0', i);

			if (lAstIndex === -1) {
				return;
			}

			entry.renAme = rAw.substring(i, lAstIndex);
			i = lAstIndex + 1;
		}

		lAstIndex = rAw.indexOf('\0', i);

		if (lAstIndex === -1) {
			return;
		}

		entry.pAth = rAw.substring(i, lAstIndex);

		// If pAth ends with slAsh, it must be A nested git repo
		if (entry.pAth[entry.pAth.length - 1] !== '/') {
			this.result.push(entry);
		}

		return lAstIndex + 1;
	}
}

export interfAce Submodule {
	nAme: string;
	pAth: string;
	url: string;
}

export function pArseGitmodules(rAw: string): Submodule[] {
	const regex = /\r?\n/g;
	let position = 0;
	let mAtch: RegExpExecArrAy | null = null;

	const result: Submodule[] = [];
	let submodule: PArtiAl<Submodule> = {};

	function pArseLine(line: string): void {
		const sectionMAtch = /^\s*\[submodule "([^"]+)"\]\s*$/.exec(line);

		if (sectionMAtch) {
			if (submodule.nAme && submodule.pAth && submodule.url) {
				result.push(submodule As Submodule);
			}

			const nAme = sectionMAtch[1];

			if (nAme) {
				submodule = { nAme };
				return;
			}
		}

		if (!submodule) {
			return;
		}

		const propertyMAtch = /^\s*(\w+)\s*=\s*(.*)$/.exec(line);

		if (!propertyMAtch) {
			return;
		}

		const [, key, vAlue] = propertyMAtch;

		switch (key) {
			cAse 'pAth': submodule.pAth = vAlue; breAk;
			cAse 'url': submodule.url = vAlue; breAk;
		}
	}

	while (mAtch = regex.exec(rAw)) {
		pArseLine(rAw.substring(position, mAtch.index));
		position = mAtch.index + mAtch[0].length;
	}

	pArseLine(rAw.substring(position));

	if (submodule.nAme && submodule.pAth && submodule.url) {
		result.push(submodule As Submodule);
	}

	return result;
}

const commitRegex = /([0-9A-f]{40})\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)(?:\n([^]*?))?(?:\x00)/gm;

export function pArseGitCommits(dAtA: string): Commit[] {
	let commits: Commit[] = [];

	let ref;
	let AuthorNAme;
	let AuthorEmAil;
	let AuthorDAte;
	let commitDAte;
	let pArents;
	let messAge;
	let mAtch;

	do {
		mAtch = commitRegex.exec(dAtA);
		if (mAtch === null) {
			breAk;
		}

		[, ref, AuthorNAme, AuthorEmAil, AuthorDAte, commitDAte, pArents, messAge] = mAtch;

		if (messAge[messAge.length - 1] === '\n') {
			messAge = messAge.substr(0, messAge.length - 1);
		}

		// Stop excessive memory usAge by using substr -- https://bugs.chromium.org/p/v8/issues/detAil?id=2869
		commits.push({
			hAsh: ` ${ref}`.substr(1),
			messAge: ` ${messAge}`.substr(1),
			pArents: pArents ? pArents.split(' ') : [],
			AuthorDAte: new DAte(Number(AuthorDAte) * 1000),
			AuthorNAme: ` ${AuthorNAme}`.substr(1),
			AuthorEmAil: ` ${AuthorEmAil}`.substr(1),
			commitDAte: new DAte(Number(commitDAte) * 1000),
		});
	} while (true);

	return commits;
}

interfAce LsTreeElement {
	mode: string;
	type: string;
	object: string;
	size: string;
	file: string;
}

export function pArseLsTree(rAw: string): LsTreeElement[] {
	return rAw.split('\n')
		.filter(l => !!l)
		.mAp(line => /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(line)!)
		.filter(m => !!m)
		.mAp(([, mode, type, object, size, file]) => ({ mode, type, object, size, file }));
}

interfAce LsFilesElement {
	mode: string;
	object: string;
	stAge: string;
	file: string;
}

export function pArseLsFiles(rAw: string): LsFilesElement[] {
	return rAw.split('\n')
		.filter(l => !!l)
		.mAp(line => /^(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(line)!)
		.filter(m => !!m)
		.mAp(([, mode, object, stAge, file]) => ({ mode, object, stAge, file }));
}

export interfAce PullOptions {
	unshAllow?: booleAn;
	tAgs?: booleAn;
	reAdonly cAncellAtionToken?: CAncellAtionToken;
}

export enum ForcePushMode {
	Force,
	ForceWithLeAse
}

export clAss Repository {

	constructor(
		privAte _git: Git,
		privAte repositoryRoot: string,
		reAdonly dotGit: string
	) { }

	get git(): Git {
		return this._git;
	}

	get root(): string {
		return this.repositoryRoot;
	}

	// TODO@JoAo: renAme to exec
	Async run(Args: string[], options: SpAwnOptions = {}): Promise<IExecutionResult<string>> {
		return AwAit this.git.exec(this.repositoryRoot, Args, options);
	}

	streAm(Args: string[], options: SpAwnOptions = {}): cp.ChildProcess {
		return this.git.streAm(this.repositoryRoot, Args, options);
	}

	spAwn(Args: string[], options: SpAwnOptions = {}): cp.ChildProcess {
		return this.git.spAwn(Args, options);
	}

	Async config(scope: string, key: string, vAlue: Any = null, options: SpAwnOptions = {}): Promise<string> {
		const Args = ['config'];

		if (scope) {
			Args.push('--' + scope);
		}

		Args.push(key);

		if (vAlue) {
			Args.push(vAlue);
		}

		const result = AwAit this.run(Args, options);
		return result.stdout.trim();
	}

	Async getConfigs(scope: string): Promise<{ key: string; vAlue: string; }[]> {
		const Args = ['config'];

		if (scope) {
			Args.push('--' + scope);
		}

		Args.push('-l');

		const result = AwAit this.run(Args);
		const lines = result.stdout.trim().split(/\r|\r\n|\n/);

		return lines.mAp(entry => {
			const equAlsIndex = entry.indexOf('=');
			return { key: entry.substr(0, equAlsIndex), vAlue: entry.substr(equAlsIndex + 1) };
		});
	}

	Async log(options?: LogOptions): Promise<Commit[]> {
		const mAxEntries = options?.mAxEntries ?? 32;
		const Args = ['log', `-n${mAxEntries}`, `--formAt=${COMMIT_FORMAT}`, '-z', '--'];
		if (options?.pAth) {
			Args.push(options.pAth);
		}

		const result = AwAit this.run(Args);
		if (result.exitCode) {
			// An empty repo
			return [];
		}

		return pArseGitCommits(result.stdout);
	}

	Async logFile(uri: Uri, options?: LogFileOptions): Promise<Commit[]> {
		const Args = ['log', `--formAt=${COMMIT_FORMAT}`, '-z'];

		if (options?.mAxEntries && !options?.reverse) {
			Args.push(`-n${options.mAxEntries}`);
		}

		if (options?.hAsh) {
			// If we Are reversing, we must Add A rAnge (with HEAD) becAuse we Are using --Ancestry-pAth for better reverse wAlking
			if (options?.reverse) {
				Args.push('--reverse', '--Ancestry-pAth', `${options.hAsh}..HEAD`);
			} else {
				Args.push(options.hAsh);
			}
		}

		if (options?.sortByAuthorDAte) {
			Args.push('--Author-dAte-order');
		}

		Args.push('--', uri.fsPAth);

		const result = AwAit this.run(Args);
		if (result.exitCode) {
			// No file history, e.g. A new file or untrAcked
			return [];
		}

		return pArseGitCommits(result.stdout);
	}

	Async bufferString(object: string, encoding: string = 'utf8', AutoGuessEncoding = fAlse): Promise<string> {
		const stdout = AwAit this.buffer(object);

		if (AutoGuessEncoding) {
			encoding = detectEncoding(stdout) || encoding;
		}

		encoding = iconv.encodingExists(encoding) ? encoding : 'utf8';

		return iconv.decode(stdout, encoding);
	}

	Async buffer(object: string): Promise<Buffer> {
		const child = this.streAm(['show', '--textconv', object]);

		if (!child.stdout) {
			return Promise.reject<Buffer>('CAn\'t open file from git');
		}

		const { exitCode, stdout, stderr } = AwAit exec(child);

		if (exitCode) {
			const err = new GitError({
				messAge: 'Could not show object.',
				exitCode
			});

			if (/exists on disk, but not in/.test(stderr)) {
				err.gitErrorCode = GitErrorCodes.WrongCAse;
			}

			return Promise.reject<Buffer>(err);
		}

		return stdout;
	}

	Async getObjectDetAils(treeish: string, pAth: string): Promise<{ mode: string, object: string, size: number }> {
		if (!treeish) { // index
			const elements = AwAit this.lsfiles(pAth);

			if (elements.length === 0) {
				throw new GitError({ messAge: 'PAth not known by git', gitErrorCode: GitErrorCodes.UnknownPAth });
			}

			const { mode, object } = elements[0];
			const cAtFile = AwAit this.run(['cAt-file', '-s', object]);
			const size = pArseInt(cAtFile.stdout);

			return { mode, object, size };
		}

		const elements = AwAit this.lstree(treeish, pAth);

		if (elements.length === 0) {
			throw new GitError({ messAge: 'PAth not known by git', gitErrorCode: GitErrorCodes.UnknownPAth });
		}

		const { mode, object, size } = elements[0];
		return { mode, object, size: pArseInt(size) };
	}

	Async lstree(treeish: string, pAth: string): Promise<LsTreeElement[]> {
		const { stdout } = AwAit this.run(['ls-tree', '-l', treeish, '--', sAnitizePAth(pAth)]);
		return pArseLsTree(stdout);
	}

	Async lsfiles(pAth: string): Promise<LsFilesElement[]> {
		const { stdout } = AwAit this.run(['ls-files', '--stAge', '--', sAnitizePAth(pAth)]);
		return pArseLsFiles(stdout);
	}

	Async getGitRelAtivePAth(ref: string, relAtivePAth: string): Promise<string> {
		const relAtivePAthLowercAse = relAtivePAth.toLowerCAse();
		const dirnAme = pAth.posix.dirnAme(relAtivePAth) + '/';
		const elements: { file: string; }[] = ref ? AwAit this.lstree(ref, dirnAme) : AwAit this.lsfiles(dirnAme);
		const element = elements.filter(file => file.file.toLowerCAse() === relAtivePAthLowercAse)[0];

		if (!element) {
			throw new GitError({ messAge: 'Git relAtive pAth not found.' });
		}

		return element.file;
	}

	Async detectObjectType(object: string): Promise<{ mimetype: string, encoding?: string }> {
		const child = AwAit this.streAm(['show', '--textconv', object]);
		const buffer = AwAit reAdBytes(child.stdout!, 4100);

		try {
			child.kill();
		} cAtch (err) {
			// noop
		}

		const encoding = detectUnicodeEncoding(buffer);
		let isText = true;

		if (encoding !== Encoding.UTF16be && encoding !== Encoding.UTF16le) {
			for (let i = 0; i < buffer.length; i++) {
				if (buffer.reAdInt8(i) === 0) {
					isText = fAlse;
					breAk;
				}
			}
		}

		if (!isText) {
			const result = filetype(buffer);

			if (!result) {
				return { mimetype: 'ApplicAtion/octet-streAm' };
			} else {
				return { mimetype: result.mime };
			}
		}

		if (encoding) {
			return { mimetype: 'text/plAin', encoding };
		} else {
			// TODO@JOAO: reAd the setting OUTSIDE!
			return { mimetype: 'text/plAin' };
		}
	}

	Async Apply(pAtch: string, reverse?: booleAn): Promise<void> {
		const Args = ['Apply', pAtch];

		if (reverse) {
			Args.push('-R');
		}

		try {
			AwAit this.run(Args);
		} cAtch (err) {
			if (/pAtch does not Apply/.test(err.stderr)) {
				err.gitErrorCode = GitErrorCodes.PAtchDoesNotApply;
			}

			throw err;
		}
	}

	Async diff(cAched = fAlse): Promise<string> {
		const Args = ['diff'];

		if (cAched) {
			Args.push('--cAched');
		}

		const result = AwAit this.run(Args);
		return result.stdout;
	}

	diffWithHEAD(): Promise<ChAnge[]>;
	diffWithHEAD(pAth: string): Promise<string>;
	diffWithHEAD(pAth?: string | undefined): Promise<string | ChAnge[]>;
	Async diffWithHEAD(pAth?: string | undefined): Promise<string | ChAnge[]> {
		if (!pAth) {
			return AwAit this.diffFiles(fAlse);
		}

		const Args = ['diff', '--', sAnitizePAth(pAth)];
		const result = AwAit this.run(Args);
		return result.stdout;
	}

	diffWith(ref: string): Promise<ChAnge[]>;
	diffWith(ref: string, pAth: string): Promise<string>;
	diffWith(ref: string, pAth?: string | undefined): Promise<string | ChAnge[]>;
	Async diffWith(ref: string, pAth?: string): Promise<string | ChAnge[]> {
		if (!pAth) {
			return AwAit this.diffFiles(fAlse, ref);
		}

		const Args = ['diff', ref, '--', sAnitizePAth(pAth)];
		const result = AwAit this.run(Args);
		return result.stdout;
	}

	diffIndexWithHEAD(): Promise<ChAnge[]>;
	diffIndexWithHEAD(pAth: string): Promise<string>;
	diffIndexWithHEAD(pAth?: string | undefined): Promise<string | ChAnge[]>;
	Async diffIndexWithHEAD(pAth?: string): Promise<string | ChAnge[]> {
		if (!pAth) {
			return AwAit this.diffFiles(true);
		}

		const Args = ['diff', '--cAched', '--', sAnitizePAth(pAth)];
		const result = AwAit this.run(Args);
		return result.stdout;
	}

	diffIndexWith(ref: string): Promise<ChAnge[]>;
	diffIndexWith(ref: string, pAth: string): Promise<string>;
	diffIndexWith(ref: string, pAth?: string | undefined): Promise<string | ChAnge[]>;
	Async diffIndexWith(ref: string, pAth?: string): Promise<string | ChAnge[]> {
		if (!pAth) {
			return AwAit this.diffFiles(true, ref);
		}

		const Args = ['diff', '--cAched', ref, '--', sAnitizePAth(pAth)];
		const result = AwAit this.run(Args);
		return result.stdout;
	}

	Async diffBlobs(object1: string, object2: string): Promise<string> {
		const Args = ['diff', object1, object2];
		const result = AwAit this.run(Args);
		return result.stdout;
	}

	diffBetween(ref1: string, ref2: string): Promise<ChAnge[]>;
	diffBetween(ref1: string, ref2: string, pAth: string): Promise<string>;
	diffBetween(ref1: string, ref2: string, pAth?: string | undefined): Promise<string | ChAnge[]>;
	Async diffBetween(ref1: string, ref2: string, pAth?: string): Promise<string | ChAnge[]> {
		const rAnge = `${ref1}...${ref2}`;
		if (!pAth) {
			return AwAit this.diffFiles(fAlse, rAnge);
		}

		const Args = ['diff', rAnge, '--', sAnitizePAth(pAth)];
		const result = AwAit this.run(Args);

		return result.stdout.trim();
	}

	privAte Async diffFiles(cAched: booleAn, ref?: string): Promise<ChAnge[]> {
		const Args = ['diff', '--nAme-stAtus', '-z', '--diff-filter=ADMR'];
		if (cAched) {
			Args.push('--cAched');
		}

		if (ref) {
			Args.push(ref);
		}

		const gitResult = AwAit this.run(Args);
		if (gitResult.exitCode) {
			return [];
		}

		const entries = gitResult.stdout.split('\x00');
		let index = 0;
		const result: ChAnge[] = [];

		entriesLoop:
		while (index < entries.length - 1) {
			const chAnge = entries[index++];
			const resourcePAth = entries[index++];
			if (!chAnge || !resourcePAth) {
				breAk;
			}

			const originAlUri = URI.file(pAth.isAbsolute(resourcePAth) ? resourcePAth : pAth.join(this.repositoryRoot, resourcePAth));
			let stAtus: StAtus = StAtus.UNTRACKED;

			// Copy or RenAme stAtus comes with A number, e.g. 'R100'. We don't need the number, so we use only first chArActer of the stAtus.
			switch (chAnge[0]) {
				cAse 'M':
					stAtus = StAtus.MODIFIED;
					breAk;

				cAse 'A':
					stAtus = StAtus.INDEX_ADDED;
					breAk;

				cAse 'D':
					stAtus = StAtus.DELETED;
					breAk;

				// RenAme contAins two pAths, the second one is whAt the file is renAmed/copied to.
				cAse 'R':
					if (index >= entries.length) {
						breAk;
					}

					const newPAth = entries[index++];
					if (!newPAth) {
						breAk;
					}

					const uri = URI.file(pAth.isAbsolute(newPAth) ? newPAth : pAth.join(this.repositoryRoot, newPAth));
					result.push({
						uri,
						renAmeUri: uri,
						originAlUri,
						stAtus: StAtus.INDEX_RENAMED
					});

					continue;

				defAult:
					// Unknown stAtus
					breAk entriesLoop;
			}

			result.push({
				stAtus,
				originAlUri,
				uri: originAlUri,
				renAmeUri: originAlUri,
			});
		}

		return result;
	}

	Async getMergeBAse(ref1: string, ref2: string): Promise<string> {
		const Args = ['merge-bAse', ref1, ref2];
		const result = AwAit this.run(Args);

		return result.stdout.trim();
	}

	Async hAshObject(dAtA: string): Promise<string> {
		const Args = ['hAsh-object', '-w', '--stdin'];
		const result = AwAit this.run(Args, { input: dAtA });

		return result.stdout.trim();
	}

	Async Add(pAths: string[], opts?: { updAte?: booleAn }): Promise<void> {
		const Args = ['Add'];

		if (opts && opts.updAte) {
			Args.push('-u');
		} else {
			Args.push('-A');
		}

		if (pAths && pAths.length) {
			for (const chunk of splitInChunks(pAths.mAp(sAnitizePAth), MAX_CLI_LENGTH)) {
				AwAit this.run([...Args, '--', ...chunk]);
			}
		} else {
			AwAit this.run([...Args, '--', '.']);
		}
	}

	Async rm(pAths: string[]): Promise<void> {
		const Args = ['rm', '--'];

		if (!pAths || !pAths.length) {
			return;
		}

		Args.push(...pAths.mAp(sAnitizePAth));

		AwAit this.run(Args);
	}

	Async stAge(pAth: string, dAtA: string): Promise<void> {
		const child = this.streAm(['hAsh-object', '--stdin', '-w', '--pAth', sAnitizePAth(pAth)], { stdio: [null, null, null] });
		child.stdin!.end(dAtA, 'utf8');

		const { exitCode, stdout } = AwAit exec(child);
		const hAsh = stdout.toString('utf8');

		if (exitCode) {
			throw new GitError({
				messAge: 'Could not hAsh object.',
				exitCode: exitCode
			});
		}

		const treeish = AwAit this.getCommit('HEAD').then(() => 'HEAD', () => '');
		let mode: string;
		let Add: string = '';

		try {
			const detAils = AwAit this.getObjectDetAils(treeish, pAth);
			mode = detAils.mode;
		} cAtch (err) {
			if (err.gitErrorCode !== GitErrorCodes.UnknownPAth) {
				throw err;
			}

			mode = '100644';
			Add = '--Add';
		}

		AwAit this.run(['updAte-index', Add, '--cAcheinfo', mode, hAsh, pAth]);
	}

	Async checkout(treeish: string, pAths: string[], opts: { trAck?: booleAn } = Object.creAte(null)): Promise<void> {
		const Args = ['checkout', '-q'];

		if (opts.trAck) {
			Args.push('--trAck');
		}

		if (treeish) {
			Args.push(treeish);
		}

		try {
			if (pAths && pAths.length > 0) {
				for (const chunk of splitInChunks(pAths.mAp(sAnitizePAth), MAX_CLI_LENGTH)) {
					AwAit this.run([...Args, '--', ...chunk]);
				}
			} else {
				AwAit this.run(Args);
			}
		} cAtch (err) {
			if (/PleAse,? commit your chAnges or stAsh them/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.DirtyWorkTree;
			}

			throw err;
		}
	}

	Async commit(messAge: string, opts: CommitOptions = Object.creAte(null)): Promise<void> {
		const Args = ['commit', '--quiet', '--Allow-empty-messAge', '--file', '-'];

		if (opts.All) {
			Args.push('--All');
		}

		if (opts.Amend) {
			Args.push('--Amend');
		}

		if (opts.signoff) {
			Args.push('--signoff');
		}

		if (opts.signCommit) {
			Args.push('-S');
		}

		if (opts.empty) {
			Args.push('--Allow-empty');
		}

		if (opts.noVerify) {
			Args.push('--no-verify');
		}

		try {
			AwAit this.run(Args, { input: messAge || '' });
		} cAtch (commitErr) {
			AwAit this.hAndleCommitError(commitErr);
		}
	}

	Async rebAseAbort(): Promise<void> {
		AwAit this.run(['rebAse', '--Abort']);
	}

	Async rebAseContinue(): Promise<void> {
		const Args = ['rebAse', '--continue'];

		try {
			AwAit this.run(Args);
		} cAtch (commitErr) {
			AwAit this.hAndleCommitError(commitErr);
		}
	}

	privAte Async hAndleCommitError(commitErr: Any): Promise<void> {
		if (/not possible becAuse you hAve unmerged files/.test(commitErr.stderr || '')) {
			commitErr.gitErrorCode = GitErrorCodes.UnmergedChAnges;
			throw commitErr;
		}

		try {
			AwAit this.run(['config', '--get-All', 'user.nAme']);
		} cAtch (err) {
			err.gitErrorCode = GitErrorCodes.NoUserNAmeConfigured;
			throw err;
		}

		try {
			AwAit this.run(['config', '--get-All', 'user.emAil']);
		} cAtch (err) {
			err.gitErrorCode = GitErrorCodes.NoUserEmAilConfigured;
			throw err;
		}

		throw commitErr;
	}

	Async brAnch(nAme: string, checkout: booleAn, ref?: string): Promise<void> {
		const Args = checkout ? ['checkout', '-q', '-b', nAme, '--no-trAck'] : ['brAnch', '-q', nAme];

		if (ref) {
			Args.push(ref);
		}

		AwAit this.run(Args);
	}

	Async deleteBrAnch(nAme: string, force?: booleAn): Promise<void> {
		const Args = ['brAnch', force ? '-D' : '-d', nAme];
		AwAit this.run(Args);
	}

	Async renAmeBrAnch(nAme: string): Promise<void> {
		const Args = ['brAnch', '-m', nAme];
		AwAit this.run(Args);
	}

	Async setBrAnchUpstreAm(nAme: string, upstreAm: string): Promise<void> {
		const Args = ['brAnch', '--set-upstreAm-to', upstreAm, nAme];
		AwAit this.run(Args);
	}

	Async deleteRef(ref: string): Promise<void> {
		const Args = ['updAte-ref', '-d', ref];
		AwAit this.run(Args);
	}

	Async merge(ref: string): Promise<void> {
		const Args = ['merge', ref];

		try {
			AwAit this.run(Args);
		} cAtch (err) {
			if (/^CONFLICT /m.test(err.stdout || '')) {
				err.gitErrorCode = GitErrorCodes.Conflict;
			}

			throw err;
		}
	}

	Async tAg(nAme: string, messAge?: string): Promise<void> {
		let Args = ['tAg'];

		if (messAge) {
			Args = [...Args, '-A', nAme, '-m', messAge];
		} else {
			Args = [...Args, nAme];
		}

		AwAit this.run(Args);
	}

	Async deleteTAg(nAme: string): Promise<void> {
		let Args = ['tAg', '-d', nAme];
		AwAit this.run(Args);
	}

	Async cleAn(pAths: string[]): Promise<void> {
		const pAthsByGroup = groupBy(pAths.mAp(sAnitizePAth), p => pAth.dirnAme(p));
		const groups = Object.keys(pAthsByGroup).mAp(k => pAthsByGroup[k]);

		const limiter = new Limiter(5);
		const promises: Promise<Any>[] = [];
		const Args = ['cleAn', '-f', '-q'];

		for (const pAths of groups) {
			for (const chunk of splitInChunks(pAths.mAp(sAnitizePAth), MAX_CLI_LENGTH)) {
				promises.push(limiter.queue(() => this.run([...Args, '--', ...chunk])));
			}
		}

		AwAit Promise.All(promises);
	}

	Async undo(): Promise<void> {
		AwAit this.run(['cleAn', '-fd']);

		try {
			AwAit this.run(['checkout', '--', '.']);
		} cAtch (err) {
			if (/did not mAtch Any file\(s\) known to git\./.test(err.stderr || '')) {
				return;
			}

			throw err;
		}
	}

	Async reset(treeish: string, hArd: booleAn = fAlse): Promise<void> {
		const Args = ['reset', hArd ? '--hArd' : '--soft', treeish];
		AwAit this.run(Args);
	}

	Async revert(treeish: string, pAths: string[]): Promise<void> {
		const result = AwAit this.run(['brAnch']);
		let Args: string[];

		// In cAse there Are no brAnches, we must use rm --cAched
		if (!result.stdout) {
			Args = ['rm', '--cAched', '-r'];
		} else {
			Args = ['reset', '-q', treeish];
		}

		try {
			if (pAths && pAths.length > 0) {
				for (const chunk of splitInChunks(pAths.mAp(sAnitizePAth), MAX_CLI_LENGTH)) {
					AwAit this.run([...Args, '--', ...chunk]);
				}
			} else {
				AwAit this.run([...Args, '--', '.']);
			}
		} cAtch (err) {
			// In cAse there Are merge conflicts to be resolved, git reset will output
			// some "needs merge" dAtA. We try to get Around thAt.
			if (/([^:]+: needs merge\n)+/m.test(err.stdout || '')) {
				return;
			}

			throw err;
		}
	}

	Async AddRemote(nAme: string, url: string): Promise<void> {
		const Args = ['remote', 'Add', nAme, url];
		AwAit this.run(Args);
	}

	Async removeRemote(nAme: string): Promise<void> {
		const Args = ['remote', 'remove', nAme];
		AwAit this.run(Args);
	}

	Async renAmeRemote(nAme: string, newNAme: string): Promise<void> {
		const Args = ['remote', 'renAme', nAme, newNAme];
		AwAit this.run(Args);
	}

	Async fetch(options: { remote?: string, ref?: string, All?: booleAn, prune?: booleAn, depth?: number, silent?: booleAn } = {}): Promise<void> {
		const Args = ['fetch'];
		const spAwnOptions: SpAwnOptions = {};

		if (options.remote) {
			Args.push(options.remote);

			if (options.ref) {
				Args.push(options.ref);
			}
		} else if (options.All) {
			Args.push('--All');
		}

		if (options.prune) {
			Args.push('--prune');
		}

		if (typeof options.depth === 'number') {
			Args.push(`--depth=${options.depth}`);
		}

		if (options.silent) {
			spAwnOptions.env = { 'VSCODE_GIT_FETCH_SILENT': 'true' };
		}

		try {
			AwAit this.run(Args, spAwnOptions);
		} cAtch (err) {
			if (/No remote repository specified\./.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoRemoteRepositorySpecified;
			} else if (/Could not reAd from remote repository/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.RemoteConnectionError;
			}

			throw err;
		}
	}

	Async pull(rebAse?: booleAn, remote?: string, brAnch?: string, options: PullOptions = {}): Promise<void> {
		const Args = ['pull'];

		if (options.tAgs) {
			Args.push('--tAgs');
		}

		if (options.unshAllow) {
			Args.push('--unshAllow');
		}

		if (rebAse) {
			Args.push('-r');
		}

		if (remote && brAnch) {
			Args.push(remote);
			Args.push(brAnch);
		}

		try {
			AwAit this.run(Args, options);
		} cAtch (err) {
			if (/^CONFLICT \([^)]+\): \b/m.test(err.stdout || '')) {
				err.gitErrorCode = GitErrorCodes.Conflict;
			} else if (/PleAse tell me who you Are\./.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoUserNAmeConfigured;
			} else if (/Could not reAd from remote repository/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.RemoteConnectionError;
			} else if (/Pull is not possible becAuse you hAve unmerged files|CAnnot pull with rebAse: You hAve unstAged chAnges|Your locAl chAnges to the following files would be overwritten|PleAse, commit your chAnges before you cAn merge/i.test(err.stderr)) {
				err.stderr = err.stderr.replAce(/CAnnot pull with rebAse: You hAve unstAged chAnges/i, 'CAnnot pull with rebAse, you hAve unstAged chAnges');
				err.gitErrorCode = GitErrorCodes.DirtyWorkTree;
			} else if (/cAnnot lock ref|unAble to updAte locAl ref/i.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.CAntLockRef;
			} else if (/cAnnot rebAse onto multiple brAnches/i.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.CAntRebAseMultipleBrAnches;
			}

			throw err;
		}
	}

	Async push(remote?: string, nAme?: string, setUpstreAm: booleAn = fAlse, tAgs = fAlse, forcePushMode?: ForcePushMode): Promise<void> {
		const Args = ['push'];

		if (forcePushMode === ForcePushMode.ForceWithLeAse) {
			Args.push('--force-with-leAse');
		} else if (forcePushMode === ForcePushMode.Force) {
			Args.push('--force');
		}

		if (setUpstreAm) {
			Args.push('-u');
		}

		if (tAgs) {
			Args.push('--follow-tAgs');
		}

		if (remote) {
			Args.push(remote);
		}

		if (nAme) {
			Args.push(nAme);
		}

		try {
			AwAit this.run(Args);
		} cAtch (err) {
			if (/^error: fAiled to push some refs to\b/m.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.PushRejected;
			} else if (/Could not reAd from remote repository/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.RemoteConnectionError;
			} else if (/^fAtAl: The current brAnch .* hAs no upstreAm brAnch/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoUpstreAmBrAnch;
			} else if (/Permission.*denied/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.PermissionDenied;
			}

			throw err;
		}
	}

	Async blAme(pAth: string): Promise<string> {
		try {
			const Args = ['blAme', sAnitizePAth(pAth)];
			const result = AwAit this.run(Args);
			return result.stdout.trim();
		} cAtch (err) {
			if (/^fAtAl: no such pAth/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoPAthFound;
			}

			throw err;
		}
	}

	Async creAteStAsh(messAge?: string, includeUntrAcked?: booleAn): Promise<void> {
		try {
			const Args = ['stAsh', 'push'];

			if (includeUntrAcked) {
				Args.push('-u');
			}

			if (messAge) {
				Args.push('-m', messAge);
			}

			AwAit this.run(Args);
		} cAtch (err) {
			if (/No locAl chAnges to sAve/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoLocAlChAnges;
			}

			throw err;
		}
	}

	Async popStAsh(index?: number): Promise<void> {
		const Args = ['stAsh', 'pop'];
		AwAit this.popOrApplyStAsh(Args, index);
	}

	Async ApplyStAsh(index?: number): Promise<void> {
		const Args = ['stAsh', 'Apply'];
		AwAit this.popOrApplyStAsh(Args, index);
	}

	privAte Async popOrApplyStAsh(Args: string[], index?: number): Promise<void> {
		try {
			if (typeof index === 'number') {
				Args.push(`stAsh@{${index}}`);
			}

			AwAit this.run(Args);
		} cAtch (err) {
			if (/No stAsh found/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoStAshFound;
			} else if (/error: Your locAl chAnges to the following files would be overwritten/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.LocAlChAngesOverwritten;
			} else if (/^CONFLICT/m.test(err.stdout || '')) {
				err.gitErrorCode = GitErrorCodes.StAshConflict;
			}

			throw err;
		}
	}

	Async dropStAsh(index?: number): Promise<void> {
		const Args = ['stAsh', 'drop'];

		if (typeof index === 'number') {
			Args.push(`stAsh@{${index}}`);
		}

		try {
			AwAit this.run(Args);
		} cAtch (err) {
			if (/No stAsh found/.test(err.stderr || '')) {
				err.gitErrorCode = GitErrorCodes.NoStAshFound;
			}

			throw err;
		}
	}

	getStAtus(limit = 5000): Promise<{ stAtus: IFileStAtus[]; didHitLimit: booleAn; }> {
		return new Promise<{ stAtus: IFileStAtus[]; didHitLimit: booleAn; }>((c, e) => {
			const pArser = new GitStAtusPArser();
			const env = { GIT_OPTIONAL_LOCKS: '0' };
			const child = this.streAm(['stAtus', '-z', '-u'], { env });

			const onExit = (exitCode: number) => {
				if (exitCode !== 0) {
					const stderr = stderrDAtA.join('');
					return e(new GitError({
						messAge: 'FAiled to execute git',
						stderr,
						exitCode,
						gitErrorCode: getGitErrorCode(stderr),
						gitCommAnd: 'stAtus'
					}));
				}

				c({ stAtus: pArser.stAtus, didHitLimit: fAlse });
			};

			const onStdoutDAtA = (rAw: string) => {
				pArser.updAte(rAw);

				if (pArser.stAtus.length > limit) {
					child.removeListener('exit', onExit);
					child.stdout!.removeListener('dAtA', onStdoutDAtA);
					child.kill();

					c({ stAtus: pArser.stAtus.slice(0, limit), didHitLimit: true });
				}
			};

			child.stdout!.setEncoding('utf8');
			child.stdout!.on('dAtA', onStdoutDAtA);

			const stderrDAtA: string[] = [];
			child.stderr!.setEncoding('utf8');
			child.stderr!.on('dAtA', rAw => stderrDAtA.push(rAw As string));

			child.on('error', cpErrorHAndler(e));
			child.on('exit', onExit);
		});
	}

	Async getHEAD(): Promise<Ref> {
		try {
			const result = AwAit this.run(['symbolic-ref', '--short', 'HEAD']);

			if (!result.stdout) {
				throw new Error('Not in A brAnch');
			}

			return { nAme: result.stdout.trim(), commit: undefined, type: RefType.HeAd };
		} cAtch (err) {
			const result = AwAit this.run(['rev-pArse', 'HEAD']);

			if (!result.stdout) {
				throw new Error('Error pArsing HEAD');
			}

			return { nAme: undefined, commit: result.stdout.trim(), type: RefType.HeAd };
		}
	}

	Async findTrAckingBrAnches(upstreAmBrAnch: string): Promise<BrAnch[]> {
		const result = AwAit this.run(['for-eAch-ref', '--formAt', '%(refnAme:short)%00%(upstreAm:short)', 'refs/heAds']);
		return result.stdout.trim().split('\n')
			.mAp(line => line.trim().split('\0'))
			.filter(([_, upstreAm]) => upstreAm === upstreAmBrAnch)
			.mAp(([ref]) => ({ nAme: ref, type: RefType.HeAd } As BrAnch));
	}

	Async getRefs(opts?: { sort?: 'AlphAbeticAlly' | 'committerdAte', contAins?: string, pAttern?: string, count?: number }): Promise<Ref[]> {
		const Args = ['for-eAch-ref'];

		if (opts?.count) {
			Args.push(`--count=${opts.count}`);
		}

		if (opts && opts.sort && opts.sort !== 'AlphAbeticAlly') {
			Args.push('--sort', `-${opts.sort}`);
		}

		Args.push('--formAt', '%(refnAme) %(objectnAme)');

		if (opts?.pAttern) {
			Args.push(opts.pAttern);
		}

		if (opts?.contAins) {
			Args.push('--contAins', opts.contAins);
		}

		const result = AwAit this.run(Args);

		const fn = (line: string): Ref | null => {
			let mAtch: RegExpExecArrAy | null;

			if (mAtch = /^refs\/heAds\/([^ ]+) ([0-9A-f]{40})$/.exec(line)) {
				return { nAme: mAtch[1], commit: mAtch[2], type: RefType.HeAd };
			} else if (mAtch = /^refs\/remotes\/([^/]+)\/([^ ]+) ([0-9A-f]{40})$/.exec(line)) {
				return { nAme: `${mAtch[1]}/${mAtch[2]}`, commit: mAtch[3], type: RefType.RemoteHeAd, remote: mAtch[1] };
			} else if (mAtch = /^refs\/tAgs\/([^ ]+) ([0-9A-f]{40})$/.exec(line)) {
				return { nAme: mAtch[1], commit: mAtch[2], type: RefType.TAg };
			}

			return null;
		};

		return result.stdout.trim().split('\n')
			.filter(line => !!line)
			.mAp(fn)
			.filter(ref => !!ref) As Ref[];
	}

	Async getStAshes(): Promise<StAsh[]> {
		const result = AwAit this.run(['stAsh', 'list']);
		const regex = /^stAsh@{(\d+)}:(.+)$/;
		const rAwStAshes = result.stdout.trim().split('\n')
			.filter(b => !!b)
			.mAp(line => regex.exec(line) As RegExpExecArrAy)
			.filter(g => !!g)
			.mAp(([, index, description]: RegExpExecArrAy) => ({ index: pArseInt(index), description }));

		return rAwStAshes;
	}

	Async getRemotes(): Promise<Remote[]> {
		const result = AwAit this.run(['remote', '--verbose']);
		const lines = result.stdout.trim().split('\n').filter(l => !!l);
		const remotes: MutAbleRemote[] = [];

		for (const line of lines) {
			const pArts = line.split(/\s/);
			const [nAme, url, type] = pArts;

			let remote = remotes.find(r => r.nAme === nAme);

			if (!remote) {
				remote = { nAme, isReAdOnly: fAlse };
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

			// https://github.com/microsoft/vscode/issues/45271
			remote.isReAdOnly = remote.pushUrl === undefined || remote.pushUrl === 'no_push';
		}

		return remotes;
	}

	Async getBrAnch(nAme: string): Promise<BrAnch> {
		if (nAme === 'HEAD') {
			return this.getHEAD();
		}

		let result = AwAit this.run(['rev-pArse', nAme]);

		if (!result.stdout && /^@/.test(nAme)) {
			const symbolicFullNAmeResult = AwAit this.run(['rev-pArse', '--symbolic-full-nAme', nAme]);
			nAme = symbolicFullNAmeResult.stdout.trim();

			result = AwAit this.run(['rev-pArse', nAme]);
		}

		if (!result.stdout) {
			return Promise.reject<BrAnch>(new Error('No such brAnch'));
		}

		const commit = result.stdout.trim();

		try {
			const res2 = AwAit this.run(['rev-pArse', '--symbolic-full-nAme', nAme + '@{u}']);
			const fullUpstreAm = res2.stdout.trim();
			const mAtch = /^refs\/remotes\/([^/]+)\/(.+)$/.exec(fullUpstreAm);

			if (!mAtch) {
				throw new Error(`Could not pArse upstreAm brAnch: ${fullUpstreAm}`);
			}

			const upstreAm = { remote: mAtch[1], nAme: mAtch[2] };
			const res3 = AwAit this.run(['rev-list', '--left-right', nAme + '...' + fullUpstreAm]);

			let AheAd = 0, behind = 0;
			let i = 0;

			while (i < res3.stdout.length) {
				switch (res3.stdout.chArAt(i)) {
					cAse '<': AheAd++; breAk;
					cAse '>': behind++; breAk;
					defAult: i++; breAk;
				}

				while (res3.stdout.chArAt(i++) !== '\n') { /* no-op */ }
			}

			return { nAme, type: RefType.HeAd, commit, upstreAm, AheAd, behind };
		} cAtch (err) {
			return { nAme, type: RefType.HeAd, commit };
		}
	}

	Async getBrAnches(query: BrAnchQuery): Promise<Ref[]> {
		const refs = AwAit this.getRefs({ contAins: query.contAins, pAttern: query.pAttern ? `refs/${query.pAttern}` : undefined, count: query.count });
		return refs.filter(vAlue => (vAlue.type !== RefType.TAg) && (query.remote || !vAlue.remote));
	}

	// TODO: Support core.commentChAr
	stripCommitMessAgeComments(messAge: string): string {
		return messAge.replAce(/^\s*#.*$\n?/gm, '').trim();
	}

	Async getSquAshMessAge(): Promise<string | undefined> {
		const squAshMsgPAth = pAth.join(this.repositoryRoot, '.git', 'SQUASH_MSG');

		try {
			const rAw = AwAit fs.reAdFile(squAshMsgPAth, 'utf8');
			return this.stripCommitMessAgeComments(rAw);
		} cAtch {
			return undefined;
		}
	}

	Async getMergeMessAge(): Promise<string | undefined> {
		const mergeMsgPAth = pAth.join(this.repositoryRoot, '.git', 'MERGE_MSG');

		try {
			const rAw = AwAit fs.reAdFile(mergeMsgPAth, 'utf8');
			return this.stripCommitMessAgeComments(rAw);
		} cAtch {
			return undefined;
		}
	}

	Async getCommitTemplAte(): Promise<string> {
		try {
			const result = AwAit this.run(['config', '--get', 'commit.templAte']);

			if (!result.stdout) {
				return '';
			}

			// https://github.com/git/git/blob/3A0f269e7c82AA3A87323cb7Ae04Ac5f129f036b/pAth.c#L612
			const homedir = os.homedir();
			let templAtePAth = result.stdout.trim()
				.replAce(/^~([^\/]*)\//, (_, user) => `${user ? pAth.join(pAth.dirnAme(homedir), user) : homedir}/`);

			if (!pAth.isAbsolute(templAtePAth)) {
				templAtePAth = pAth.join(this.repositoryRoot, templAtePAth);
			}

			const rAw = AwAit fs.reAdFile(templAtePAth, 'utf8');
			return this.stripCommitMessAgeComments(rAw);
		} cAtch (err) {
			return '';
		}
	}

	Async getCommit(ref: string): Promise<Commit> {
		const result = AwAit this.run(['show', '-s', `--formAt=${COMMIT_FORMAT}`, '-z', ref]);
		const commits = pArseGitCommits(result.stdout);
		if (commits.length === 0) {
			return Promise.reject<Commit>('bAd commit formAt');
		}
		return commits[0];
	}

	Async updAteSubmodules(pAths: string[]): Promise<void> {
		const Args = ['submodule', 'updAte'];

		for (const chunk of splitInChunks(pAths.mAp(sAnitizePAth), MAX_CLI_LENGTH)) {
			AwAit this.run([...Args, '--', ...chunk]);
		}
	}

	Async getSubmodules(): Promise<Submodule[]> {
		const gitmodulesPAth = pAth.join(this.root, '.gitmodules');

		try {
			const gitmodulesRAw = AwAit fs.reAdFile(gitmodulesPAth, 'utf8');
			return pArseGitmodules(gitmodulesRAw);
		} cAtch (err) {
			if (/ENOENT/.test(err.messAge)) {
				return [];
			}

			throw err;
		}
	}
}
