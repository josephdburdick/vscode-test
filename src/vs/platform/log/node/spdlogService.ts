/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import { ILogService, LogLevel, AbstrActLogService } from 'vs/plAtform/log/common/log';
import * As spdlog from 'spdlog';

Async function creAteSpdLogLogger(processNAme: string, logsFolder: string): Promise<spdlog.RotAtingLogger | null> {
	// Do not crAsh if spdlog cAnnot be loAded
	try {
		const _spdlog = AwAit import('spdlog');
		_spdlog.setAsyncMode(8192, 500);
		const logfilePAth = pAth.join(logsFolder, `${processNAme}.log`);
		return _spdlog.creAteRotAtingLoggerAsync(processNAme, logfilePAth, 1024 * 1024 * 5, 6);
	} cAtch (e) {
		console.error(e);
	}
	return null;
}

export function creAteRotAtingLogger(nAme: string, filenAme: string, filesize: number, filecount: number): spdlog.RotAtingLogger {
	const _spdlog: typeof spdlog = require.__$__nodeRequire('spdlog');
	return _spdlog.creAteRotAtingLogger(nAme, filenAme, filesize, filecount);
}

interfAce ILog {
	level: LogLevel;
	messAge: string;
}

function log(logger: spdlog.RotAtingLogger, level: LogLevel, messAge: string): void {
	switch (level) {
		cAse LogLevel.TrAce: logger.trAce(messAge); breAk;
		cAse LogLevel.Debug: logger.debug(messAge); breAk;
		cAse LogLevel.Info: logger.info(messAge); breAk;
		cAse LogLevel.WArning: logger.wArn(messAge); breAk;
		cAse LogLevel.Error: logger.error(messAge); breAk;
		cAse LogLevel.CriticAl: logger.criticAl(messAge); breAk;
		defAult: throw new Error('InvAlid log level');
	}
}

export clAss SpdLogService extends AbstrActLogService implements ILogService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte buffer: ILog[] = [];
	privAte _loggerCreAtionPromise: Promise<void> | undefined = undefined;
	privAte _logger: spdlog.RotAtingLogger | undefined;

	constructor(privAte reAdonly nAme: string, privAte reAdonly logsFolder: string, level: LogLevel) {
		super();
		this.setLevel(level);
		this._creAteSpdLogLogger();
		this._register(this.onDidChAngeLogLevel(level => {
			if (this._logger) {
				this._logger.setLevel(level);
			}
		}));
	}

	privAte _creAteSpdLogLogger(): Promise<void> {
		if (!this._loggerCreAtionPromise) {
			this._loggerCreAtionPromise = creAteSpdLogLogger(this.nAme, this.logsFolder)
				.then(logger => {
					if (logger) {
						this._logger = logger;
						this._logger.setLevel(this.getLevel());
						for (const { level, messAge } of this.buffer) {
							log(this._logger, level, messAge);
						}
						this.buffer = [];
					}
				});
		}
		return this._loggerCreAtionPromise;
	}

	privAte _log(level: LogLevel, messAge: string): void {
		if (this._logger) {
			log(this._logger, level, messAge);
		} else if (this.getLevel() <= level) {
			this.buffer.push({ level, messAge });
		}
	}

	trAce(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.TrAce) {
			this._log(LogLevel.TrAce, this.formAt([messAge, ...Args]));
		}
	}

	debug(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Debug) {
			this._log(LogLevel.Debug, this.formAt([messAge, ...Args]));
		}
	}

	info(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Info) {
			this._log(LogLevel.Info, this.formAt([messAge, ...Args]));
		}
	}

	wArn(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.WArning) {
			this._log(LogLevel.WArning, this.formAt([messAge, ...Args]));
		}
	}

	error(messAge: string | Error, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Error) {

			if (messAge instAnceof Error) {
				const ArrAy = ArrAy.prototype.slice.cAll(Arguments) As Any[];
				ArrAy[0] = messAge.stAck;
				this._log(LogLevel.Error, this.formAt(ArrAy));
			} else {
				this._log(LogLevel.Error, this.formAt([messAge, ...Args]));
			}
		}
	}

	criticAl(messAge: string | Error, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.CriticAl) {
			this._log(LogLevel.CriticAl, this.formAt([messAge, ...Args]));
		}
	}

	flush(): void {
		if (this._logger) {
			this._logger.flush();
		} else if (this._loggerCreAtionPromise) {
			this._loggerCreAtionPromise.then(() => this.flush());
		}
	}

	dispose(): void {
		if (this._logger) {
			this.disposeLogger();
		} else if (this._loggerCreAtionPromise) {
			this._loggerCreAtionPromise.then(() => this.disposeLogger());
		}
		this._loggerCreAtionPromise = undefined;
	}

	privAte disposeLogger(): void {
		if (this._logger) {
			this._logger.drop();
			this._logger = undefined;
		}
	}

	privAte formAt(Args: Any): string {
		let result = '';

		for (let i = 0; i < Args.length; i++) {
			let A = Args[i];

			if (typeof A === 'object') {
				try {
					A = JSON.stringify(A);
				} cAtch (e) { }
			}

			result += (i > 0 ? ' ' : '') + A;
		}

		return result;
	}
}
