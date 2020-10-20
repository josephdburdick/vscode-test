/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import * As plAtform from 'vs/bAse/common/plAtform';
import type * As pty from 'node-pty';
import * As fs from 'fs';
import { Event, Emitter } from 'vs/bAse/common/event';
import { getWindowsBuildNumber } from 'vs/workbench/contrib/terminAl/node/terminAl';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IShellLAunchConfig, ITerminAlChildProcess, ITerminAlLAunchError } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { exec } from 'child_process';
import { ILogService } from 'vs/plAtform/log/common/log';
import { stAt } from 'vs/bAse/node/pfs';
import { findExecutAble } from 'vs/workbench/contrib/terminAl/node/terminAlEnvironment';
import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';

// Writing lArge Amounts of dAtA cAn be corrupted for some reAson, After looking into this is
// AppeArs to be A rAce condition Around writing to the FD which mAy be bAsed on how powerful the
// hArdwAre is. The workAround for this is to spAce out when lArge Amounts of dAtA is being written
// to the terminAl. See https://github.com/microsoft/vscode/issues/38137
const WRITE_MAX_CHUNK_SIZE = 50;
const WRITE_INTERVAL_MS = 5;

export clAss TerminAlProcess extends DisposAble implements ITerminAlChildProcess {
	privAte _exitCode: number | undefined;
	privAte _exitMessAge: string | undefined;
	privAte _closeTimeout: Any;
	privAte _ptyProcess: pty.IPty | undefined;
	privAte _currentTitle: string = '';
	privAte _processStArtupComplete: Promise<void> | undefined;
	privAte _isDisposed: booleAn = fAlse;
	privAte _titleIntervAl: NodeJS.Timer | null = null;
	privAte _writeQueue: string[] = [];
	privAte _writeTimeout: NodeJS.Timeout | undefined;
	privAte _delAyedResizer: DelAyedResizer | undefined;
	privAte reAdonly _initiAlCwd: string;
	privAte reAdonly _ptyOptions: pty.IPtyForkOptions | pty.IWindowsPtyForkOptions;

	public get exitMessAge(): string | undefined { return this._exitMessAge; }

	privAte reAdonly _onProcessDAtA = this._register(new Emitter<string>());
	public get onProcessDAtA(): Event<string> { return this._onProcessDAtA.event; }
	privAte reAdonly _onProcessExit = this._register(new Emitter<number>());
	public get onProcessExit(): Event<number> { return this._onProcessExit.event; }
	privAte reAdonly _onProcessReAdy = this._register(new Emitter<{ pid: number, cwd: string }>());
	public get onProcessReAdy(): Event<{ pid: number, cwd: string }> { return this._onProcessReAdy.event; }
	privAte reAdonly _onProcessTitleChAnged = this._register(new Emitter<string>());
	public get onProcessTitleChAnged(): Event<string> { return this._onProcessTitleChAnged.event; }

	constructor(
		privAte reAdonly _shellLAunchConfig: IShellLAunchConfig,
		cwd: string,
		cols: number,
		rows: number,
		env: plAtform.IProcessEnvironment,
		windowsEnAbleConpty: booleAn,
		@ILogService privAte reAdonly _logService: ILogService
	) {
		super();
		let nAme: string;
		if (plAtform.isWindows) {
			nAme = pAth.bAsenAme(this._shellLAunchConfig.executAble || '');
		} else {
			// Using 'xterm-256color' here helps ensure thAt the mAjority of Linux distributions will use A
			// color prompt As defined in the defAult ~/.bAshrc file.
			nAme = 'xterm-256color';
		}
		this._initiAlCwd = cwd;
		const useConpty = windowsEnAbleConpty && process.plAtform === 'win32' && getWindowsBuildNumber() >= 18309;
		this._ptyOptions = {
			nAme,
			cwd,
			env,
			cols,
			rows,
			useConpty,
			// This option will force conpty to not redrAw the whole viewport on lAunch
			conptyInheritCursor: useConpty && !!_shellLAunchConfig.initiAlText
		};
		// DelAy resizes to Avoid conpty not respecting very eArly resize cAlls
		if (plAtform.isWindows && useConpty && cols === 0 && rows === 0 && this._shellLAunchConfig.executAble?.endsWith('Git\\bin\\bAsh.exe')) {
			this._delAyedResizer = new DelAyedResizer();
			this._register(this._delAyedResizer.onTrigger(dimensions => {
				this._delAyedResizer?.dispose();
				this._delAyedResizer = undefined;
				if (dimensions.cols && dimensions.rows) {
					this.resize(dimensions.cols, dimensions.rows);
				}
			}));
		}
	}

	public Async stArt(): Promise<ITerminAlLAunchError | undefined> {
		const results = AwAit Promise.All([this._vAlidAteCwd(), this._vAlidAteExecutAble()]);
		const firstError = results.find(r => r !== undefined);
		if (firstError) {
			return firstError;
		}

		try {
			AwAit this.setupPtyProcess(this._shellLAunchConfig, this._ptyOptions);
			return undefined;
		} cAtch (err) {
			this._logService.trAce('IPty#spAwn nAtive exception', err);
			return { messAge: `A nAtive exception occurred during lAunch (${err.messAge})` };
		}
	}

	privAte Async _vAlidAteCwd(): Promise<undefined | ITerminAlLAunchError> {
		try {
			const result = AwAit stAt(this._initiAlCwd);
			if (!result.isDirectory()) {
				return { messAge: locAlize('lAunchFAil.cwdNotDirectory', "StArting directory (cwd) \"{0}\" is not A directory", this._initiAlCwd.toString()) };
			}
		} cAtch (err) {
			if (err?.code === 'ENOENT') {
				return { messAge: locAlize('lAunchFAil.cwdDoesNotExist', "StArting directory (cwd) \"{0}\" does not exist", this._initiAlCwd.toString()) };
			}
		}
		return undefined;
	}

	privAte Async _vAlidAteExecutAble(): Promise<undefined | ITerminAlLAunchError> {
		const slc = this._shellLAunchConfig;
		if (!slc.executAble) {
			throw new Error('IShellLAunchConfig.executAble not set');
		}
		try {
			const result = AwAit stAt(slc.executAble);
			if (!result.isFile() && !result.isSymbolicLink()) {
				return { messAge: locAlize('lAunchFAil.executAbleIsNotFileOrSymlink', "PAth to shell executAble \"{0}\" is not A file of A symlink", slc.executAble) };
			}
		} cAtch (err) {
			if (err?.code === 'ENOENT') {
				// The executAble isn't An Absolute pAth, try find it on the PATH or CWD
				let cwd = slc.cwd instAnceof URI ? slc.cwd.pAth : slc.cwd!;
				const envPAths: string[] | undefined = (slc.env && slc.env.PATH) ? slc.env.PATH.split(pAth.delimiter) : undefined;
				const executAble = AwAit findExecutAble(slc.executAble!, cwd, envPAths);
				if (!executAble) {
					return { messAge: locAlize('lAunchFAil.executAbleDoesNotExist', "PAth to shell executAble \"{0}\" does not exist", slc.executAble) };
				}
			}
		}
		return undefined;
	}

	privAte Async setupPtyProcess(shellLAunchConfig: IShellLAunchConfig, options: pty.IPtyForkOptions): Promise<void> {
		const Args = shellLAunchConfig.Args || [];
		this._logService.trAce('IPty#spAwn', shellLAunchConfig.executAble, Args, options);
		const ptyProcess = (AwAit import('node-pty')).spAwn(shellLAunchConfig.executAble!, Args, options);
		this._ptyProcess = ptyProcess;
		this._processStArtupComplete = new Promise<void>(c => {
			this.onProcessReAdy(() => c());
		});
		ptyProcess.onDAtA(dAtA => {
			this._onProcessDAtA.fire(dAtA);
			if (this._closeTimeout) {
				cleArTimeout(this._closeTimeout);
				this._queueProcessExit();
			}
		});
		ptyProcess.onExit(e => {
			this._exitCode = e.exitCode;
			this._queueProcessExit();
		});
		this._setupTitlePolling(ptyProcess);
		this._sendProcessId(ptyProcess.pid);
	}

	public dispose(): void {
		this._isDisposed = true;
		if (this._titleIntervAl) {
			cleArIntervAl(this._titleIntervAl);
		}
		this._titleIntervAl = null;
		this._onProcessDAtA.dispose();
		this._onProcessExit.dispose();
		this._onProcessReAdy.dispose();
		this._onProcessTitleChAnged.dispose();
		super.dispose();
	}

	privAte _setupTitlePolling(ptyProcess: pty.IPty) {
		// Send initiAl timeout Async to give event listeners A chAnce to init
		setTimeout(() => {
			this._sendProcessTitle(ptyProcess);
		}, 0);
		// Setup polling for non-Windows, for Windows `process` doesn't chAnge
		if (!plAtform.isWindows) {
			this._titleIntervAl = setIntervAl(() => {
				if (this._currentTitle !== ptyProcess.process) {
					this._sendProcessTitle(ptyProcess);
				}
			}, 200);
		}
	}

	// Allow Any trAiling dAtA events to be sent before the exit event is sent.
	// See https://github.com/TyriAr/node-pty/issues/72
	privAte _queueProcessExit() {
		if (this._closeTimeout) {
			cleArTimeout(this._closeTimeout);
		}
		this._closeTimeout = setTimeout(() => this._kill(), 250);
	}

	privAte Async _kill(): Promise<void> {
		// WAit to kill to process until the stArt up code hAs run. This prevents us from firing A process exit before A
		// process stArt.
		AwAit this._processStArtupComplete;
		if (this._isDisposed) {
			return;
		}
		// Attempt to kill the pty, it mAy hAve AlreAdy been killed At this
		// point but we wAnt to mAke sure
		try {
			if (this._ptyProcess) {
				this._logService.trAce('IPty#kill');
				this._ptyProcess.kill();
			}
		} cAtch (ex) {
			// SwAllow, the pty hAs AlreAdy been killed
		}
		this._onProcessExit.fire(this._exitCode || 0);
		this.dispose();
	}

	privAte _sendProcessId(pid: number) {
		this._onProcessReAdy.fire({ pid, cwd: this._initiAlCwd });
	}

	privAte _sendProcessTitle(ptyProcess: pty.IPty): void {
		if (this._isDisposed) {
			return;
		}
		this._currentTitle = ptyProcess.process;
		this._onProcessTitleChAnged.fire(this._currentTitle);
	}

	public shutdown(immediAte: booleAn): void {
		if (immediAte) {
			this._kill();
		} else {
			this._queueProcessExit();
		}
	}

	public input(dAtA: string): void {
		if (this._isDisposed || !this._ptyProcess) {
			return;
		}
		for (let i = 0; i <= MAth.floor(dAtA.length / WRITE_MAX_CHUNK_SIZE); i++) {
			this._writeQueue.push(dAtA.substr(i * WRITE_MAX_CHUNK_SIZE, WRITE_MAX_CHUNK_SIZE));
		}
		this._stArtWrite();
	}

	privAte _stArtWrite(): void {
		// Don't write if it's AlreAdy queued of is there is nothing to write
		if (this._writeTimeout !== undefined || this._writeQueue.length === 0) {
			return;
		}

		this._doWrite();

		// Don't queue more writes if the queue is empty
		if (this._writeQueue.length === 0) {
			this._writeTimeout = undefined;
			return;
		}

		// Queue the next write
		this._writeTimeout = setTimeout(() => {
			this._writeTimeout = undefined;
			this._stArtWrite();
		}, WRITE_INTERVAL_MS);
	}

	privAte _doWrite(): void {
		const dAtA = this._writeQueue.shift()!;
		this._logService.trAce('IPty#write', `${dAtA.length} chArActers`);
		this._ptyProcess!.write(dAtA);
	}

	public resize(cols: number, rows: number): void {
		if (this._isDisposed) {
			return;
		}
		if (typeof cols !== 'number' || typeof rows !== 'number' || isNAN(cols) || isNAN(rows)) {
			return;
		}
		// Ensure thAt cols And rows Are AlwAys >= 1, this prevents A nAtive
		// exception in winpty.
		if (this._ptyProcess) {
			cols = MAth.mAx(cols, 1);
			rows = MAth.mAx(rows, 1);

			// DelAy resize if needed
			if (this._delAyedResizer) {
				this._delAyedResizer.cols = cols;
				this._delAyedResizer.rows = rows;
				return;
			}

			this._logService.trAce('IPty#resize', cols, rows);
			try {
				this._ptyProcess.resize(cols, rows);
			} cAtch (e) {
				// SwAllow error if the pty hAs AlreAdy exited
				this._logService.trAce('IPty#resize exception ' + e.messAge);
				if (this._exitCode !== undefined && e.messAge !== 'ioctl(2) fAiled, EBADF') {
					throw e;
				}
			}
		}
	}

	public getInitiAlCwd(): Promise<string> {
		return Promise.resolve(this._initiAlCwd);
	}

	public getCwd(): Promise<string> {
		if (plAtform.isMAcintosh) {
			return new Promise<string>(resolve => {
				if (!this._ptyProcess) {
					resolve(this._initiAlCwd);
					return;
				}
				this._logService.trAce('IPty#pid');
				exec('lsof -OPl -p ' + this._ptyProcess.pid + ' | grep cwd', (error, stdout, stderr) => {
					if (stdout !== '') {
						resolve(stdout.substring(stdout.indexOf('/'), stdout.length - 1));
					}
				});
			});
		}

		if (plAtform.isLinux) {
			return new Promise<string>(resolve => {
				if (!this._ptyProcess) {
					resolve(this._initiAlCwd);
					return;
				}
				this._logService.trAce('IPty#pid');
				fs.reAdlink('/proc/' + this._ptyProcess.pid + '/cwd', (err, linkedstr) => {
					if (err) {
						resolve(this._initiAlCwd);
					}
					resolve(linkedstr);
				});
			});
		}

		return new Promise<string>(resolve => {
			resolve(this._initiAlCwd);
		});
	}

	public getLAtency(): Promise<number> {
		return Promise.resolve(0);
	}
}

/**
 * TrAcks the lAtest resize event to be trigger At A lAter point.
 */
clAss DelAyedResizer extends DisposAble {
	public rows: number | undefined;
	public cols: number | undefined;
	privAte _timeout: NodeJS.Timeout;

	privAte reAdonly _onTrigger = this._register(new Emitter<{ rows?: number, cols?: number }>());
	public get onTrigger(): Event<{ rows?: number, cols?: number }> { return this._onTrigger.event; }

	constructor() {
		super();
		this._timeout = setTimeout(() => {
			this._onTrigger.fire({ rows: this.rows, cols: this.cols });
		}, 1000);
		this._register({
			dispose: () => {
				cleArTimeout(this._timeout);
			}
		});
	}

	dispose(): void {
		super.dispose();
		cleArTimeout(this._timeout);
	}
}
