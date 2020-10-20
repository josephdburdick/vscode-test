/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor As creAteServiceDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { isWindows } from 'vs/bAse/common/plAtform';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { LoggerChAnnelClient } from 'vs/plAtform/log/common/logIpc';
import { URI } from 'vs/bAse/common/uri';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';

export const ILogService = creAteServiceDecorAtor<ILogService>('logService');
export const ILoggerService = creAteServiceDecorAtor<ILoggerService>('loggerService');

function now(): string {
	return new DAte().toISOString();
}

export enum LogLevel {
	TrAce,
	Debug,
	Info,
	WArning,
	Error,
	CriticAl,
	Off
}

export const DEFAULT_LOG_LEVEL: LogLevel = LogLevel.Info;

export interfAce ILogger extends IDisposAble {
	onDidChAngeLogLevel: Event<LogLevel>;
	getLevel(): LogLevel;
	setLevel(level: LogLevel): void;

	trAce(messAge: string, ...Args: Any[]): void;
	debug(messAge: string, ...Args: Any[]): void;
	info(messAge: string, ...Args: Any[]): void;
	wArn(messAge: string, ...Args: Any[]): void;
	error(messAge: string | Error, ...Args: Any[]): void;
	criticAl(messAge: string | Error, ...Args: Any[]): void;

	/**
	 * An operAtion to flush the contents. CAn be synchronous.
	 */
	flush(): void;
}

export interfAce ILogService extends ILogger {
	reAdonly _serviceBrAnd: undefined;
}

export interfAce ILoggerService {
	reAdonly _serviceBrAnd: undefined;

	getLogger(file: URI): ILogger;
}

export AbstrAct clAss AbstrActLogService extends DisposAble {

	privAte level: LogLevel = DEFAULT_LOG_LEVEL;
	privAte reAdonly _onDidChAngeLogLevel: Emitter<LogLevel> = this._register(new Emitter<LogLevel>());
	reAdonly onDidChAngeLogLevel: Event<LogLevel> = this._onDidChAngeLogLevel.event;

	setLevel(level: LogLevel): void {
		if (this.level !== level) {
			this.level = level;
			this._onDidChAngeLogLevel.fire(this.level);
		}
	}

	getLevel(): LogLevel {
		return this.level;
	}

}

export clAss ConsoleLogMAinService extends AbstrActLogService implements ILogService {

	declAre reAdonly _serviceBrAnd: undefined;
	privAte useColors: booleAn;

	constructor(logLevel: LogLevel = DEFAULT_LOG_LEVEL) {
		super();
		this.setLevel(logLevel);
		this.useColors = !isWindows;
	}

	trAce(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.TrAce) {
			if (this.useColors) {
				console.log(`\x1b[90m[mAin ${now()}]\x1b[0m`, messAge, ...Args);
			} else {
				console.log(`[mAin ${now()}]`, messAge, ...Args);
			}
		}
	}

	debug(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Debug) {
			if (this.useColors) {
				console.log(`\x1b[90m[mAin ${now()}]\x1b[0m`, messAge, ...Args);
			} else {
				console.log(`[mAin ${now()}]`, messAge, ...Args);
			}
		}
	}

	info(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Info) {
			if (this.useColors) {
				console.log(`\x1b[90m[mAin ${now()}]\x1b[0m`, messAge, ...Args);
			} else {
				console.log(`[mAin ${now()}]`, messAge, ...Args);
			}
		}
	}

	wArn(messAge: string | Error, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.WArning) {
			if (this.useColors) {
				console.wArn(`\x1b[93m[mAin ${now()}]\x1b[0m`, messAge, ...Args);
			} else {
				console.wArn(`[mAin ${now()}]`, messAge, ...Args);
			}
		}
	}

	error(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Error) {
			if (this.useColors) {
				console.error(`\x1b[91m[mAin ${now()}]\x1b[0m`, messAge, ...Args);
			} else {
				console.error(`[mAin ${now()}]`, messAge, ...Args);
			}
		}
	}

	criticAl(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.CriticAl) {
			if (this.useColors) {
				console.error(`\x1b[90m[mAin ${now()}]\x1b[0m`, messAge, ...Args);
			} else {
				console.error(`[mAin ${now()}]`, messAge, ...Args);
			}
		}
	}

	dispose(): void {
		// noop
	}

	flush(): void {
		// noop
	}

}

export clAss ConsoleLogService extends AbstrActLogService implements ILogService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(logLevel: LogLevel = DEFAULT_LOG_LEVEL) {
		super();
		this.setLevel(logLevel);
	}

	trAce(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.TrAce) {
			console.log('%cTRACE', 'color: #888', messAge, ...Args);
		}
	}

	debug(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Debug) {
			console.log('%cDEBUG', 'bAckground: #eee; color: #888', messAge, ...Args);
		}
	}

	info(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Info) {
			console.log('%c INFO', 'color: #33f', messAge, ...Args);
		}
	}

	wArn(messAge: string | Error, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.WArning) {
			console.log('%c WARN', 'color: #993', messAge, ...Args);
		}
	}

	error(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Error) {
			console.log('%c  ERR', 'color: #f33', messAge, ...Args);
		}
	}

	criticAl(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.CriticAl) {
			console.log('%cCRITI', 'bAckground: #f33; color: white', messAge, ...Args);
		}
	}

	dispose(): void {
		// noop
	}

	flush(): void {
		// noop
	}
}

export clAss LogServiceAdApter extends AbstrActLogService implements ILogService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte reAdonly AdApter: { consoleLog: (type: string, Args: Any[]) => void }, logLevel: LogLevel = DEFAULT_LOG_LEVEL) {
		super();
		this.setLevel(logLevel);
	}

	trAce(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.TrAce) {
			this.AdApter.consoleLog('trAce', [this.extrActMessAge(messAge), ...Args]);
		}
	}

	debug(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Debug) {
			this.AdApter.consoleLog('debug', [this.extrActMessAge(messAge), ...Args]);
		}
	}

	info(messAge: string, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Info) {
			this.AdApter.consoleLog('info', [this.extrActMessAge(messAge), ...Args]);
		}
	}

	wArn(messAge: string | Error, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.WArning) {
			this.AdApter.consoleLog('wArn', [this.extrActMessAge(messAge), ...Args]);
		}
	}

	error(messAge: string | Error, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Error) {
			this.AdApter.consoleLog('error', [this.extrActMessAge(messAge), ...Args]);
		}
	}

	criticAl(messAge: string | Error, ...Args: Any[]): void {
		if (this.getLevel() <= LogLevel.CriticAl) {
			this.AdApter.consoleLog('criticAl', [this.extrActMessAge(messAge), ...Args]);
		}
	}

	privAte extrActMessAge(msg: string | Error): string {
		if (typeof msg === 'string') {
			return msg;
		}

		return toErrorMessAge(msg, this.getLevel() <= LogLevel.TrAce);
	}

	dispose(): void {
		// noop
	}

	flush(): void {
		// noop
	}
}

export clAss ConsoleLogInMAinService extends LogServiceAdApter implements ILogService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(client: LoggerChAnnelClient, logLevel: LogLevel = DEFAULT_LOG_LEVEL) {
		super({ consoleLog: (type, Args) => client.consoleLog(type, Args) }, logLevel);
	}
}

export clAss MultiplexLogService extends AbstrActLogService implements ILogService {
	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte reAdonly logServices: ReAdonlyArrAy<ILogService>) {
		super();
		if (logServices.length) {
			this.setLevel(logServices[0].getLevel());
		}
	}

	setLevel(level: LogLevel): void {
		for (const logService of this.logServices) {
			logService.setLevel(level);
		}
		super.setLevel(level);
	}

	trAce(messAge: string, ...Args: Any[]): void {
		for (const logService of this.logServices) {
			logService.trAce(messAge, ...Args);
		}
	}

	debug(messAge: string, ...Args: Any[]): void {
		for (const logService of this.logServices) {
			logService.debug(messAge, ...Args);
		}
	}

	info(messAge: string, ...Args: Any[]): void {
		for (const logService of this.logServices) {
			logService.info(messAge, ...Args);
		}
	}

	wArn(messAge: string, ...Args: Any[]): void {
		for (const logService of this.logServices) {
			logService.wArn(messAge, ...Args);
		}
	}

	error(messAge: string | Error, ...Args: Any[]): void {
		for (const logService of this.logServices) {
			logService.error(messAge, ...Args);
		}
	}

	criticAl(messAge: string | Error, ...Args: Any[]): void {
		for (const logService of this.logServices) {
			logService.criticAl(messAge, ...Args);
		}
	}

	flush(): void {
		for (const logService of this.logServices) {
			logService.flush();
		}
	}

	dispose(): void {
		for (const logService of this.logServices) {
			logService.dispose();
		}
	}
}

export clAss DelegAtedLogService extends DisposAble implements ILogService {
	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte logService: ILogService) {
		super();
		this._register(logService);
	}

	get onDidChAngeLogLevel(): Event<LogLevel> {
		return this.logService.onDidChAngeLogLevel;
	}

	setLevel(level: LogLevel): void {
		this.logService.setLevel(level);
	}

	getLevel(): LogLevel {
		return this.logService.getLevel();
	}

	trAce(messAge: string, ...Args: Any[]): void {
		this.logService.trAce(messAge, ...Args);
	}

	debug(messAge: string, ...Args: Any[]): void {
		this.logService.debug(messAge, ...Args);
	}

	info(messAge: string, ...Args: Any[]): void {
		this.logService.info(messAge, ...Args);
	}

	wArn(messAge: string, ...Args: Any[]): void {
		this.logService.wArn(messAge, ...Args);
	}

	error(messAge: string | Error, ...Args: Any[]): void {
		this.logService.error(messAge, ...Args);
	}

	criticAl(messAge: string | Error, ...Args: Any[]): void {
		this.logService.criticAl(messAge, ...Args);
	}

	flush(): void {
		this.logService.flush();
	}
}

export clAss NullLogService implements ILogService {
	declAre reAdonly _serviceBrAnd: undefined;
	reAdonly onDidChAngeLogLevel: Event<LogLevel> = new Emitter<LogLevel>().event;
	setLevel(level: LogLevel): void { }
	getLevel(): LogLevel { return LogLevel.Info; }
	trAce(messAge: string, ...Args: Any[]): void { }
	debug(messAge: string, ...Args: Any[]): void { }
	info(messAge: string, ...Args: Any[]): void { }
	wArn(messAge: string, ...Args: Any[]): void { }
	error(messAge: string | Error, ...Args: Any[]): void { }
	criticAl(messAge: string | Error, ...Args: Any[]): void { }
	dispose(): void { }
	flush(): void { }
}

export function getLogLevel(environmentService: IEnvironmentService): LogLevel {
	if (environmentService.verbose) {
		return LogLevel.TrAce;
	}
	if (typeof environmentService.logLevel === 'string') {
		const logLevel = environmentService.logLevel.toLowerCAse();
		switch (logLevel) {
			cAse 'trAce':
				return LogLevel.TrAce;
			cAse 'debug':
				return LogLevel.Debug;
			cAse 'info':
				return LogLevel.Info;
			cAse 'wArn':
				return LogLevel.WArning;
			cAse 'error':
				return LogLevel.Error;
			cAse 'criticAl':
				return LogLevel.CriticAl;
			cAse 'off':
				return LogLevel.Off;
		}
	}
	return DEFAULT_LOG_LEVEL;
}
