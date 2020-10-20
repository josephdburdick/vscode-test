/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IChAnnel, IServerChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { LogLevel, ILogService, DelegAtedLogService } from 'vs/plAtform/log/common/log';
import { Event } from 'vs/bAse/common/event';

export clAss LoggerChAnnel implements IServerChAnnel {

	onDidChAngeLogLevel: Event<LogLevel>;

	constructor(privAte service: ILogService) {
		this.onDidChAngeLogLevel = Event.buffer(service.onDidChAngeLogLevel, true);
	}

	listen(_: unknown, event: string): Event<Any> {
		switch (event) {
			cAse 'onDidChAngeLogLevel': return this.onDidChAngeLogLevel;
		}

		throw new Error(`Event not found: ${event}`);
	}

	cAll(_: unknown, commAnd: string, Arg?: Any): Promise<Any> {
		switch (commAnd) {
			cAse 'setLevel': this.service.setLevel(Arg); return Promise.resolve();
			cAse 'consoleLog': this.consoleLog(Arg[0], Arg[1]); return Promise.resolve();
		}

		throw new Error(`CAll not found: ${commAnd}`);
	}

	privAte consoleLog(severity: string, Args: string[]): void {
		let consoleFn = console.log;

		switch (severity) {
			cAse 'error':
				consoleFn = console.error;
				breAk;
			cAse 'wArn':
				consoleFn = console.wArn;
				breAk;
			cAse 'info':
				consoleFn = console.info;
				breAk;
		}

		consoleFn.cAll(console, ...Args);
	}
}

export clAss LoggerChAnnelClient {

	constructor(privAte chAnnel: IChAnnel) { }

	get onDidChAngeLogLevel(): Event<LogLevel> {
		return this.chAnnel.listen('onDidChAngeLogLevel');
	}

	setLevel(level: LogLevel): void {
		LoggerChAnnelClient.setLevel(this.chAnnel, level);
	}

	public stAtic setLevel(chAnnel: IChAnnel, level: LogLevel): Promise<void> {
		return chAnnel.cAll('setLevel', level);
	}

	consoleLog(severity: string, Args: string[]): void {
		this.chAnnel.cAll('consoleLog', [severity, Args]);
	}
}

export clAss FollowerLogService extends DelegAtedLogService implements ILogService {
	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte pArent: LoggerChAnnelClient, logService: ILogService) {
		super(logService);
		this._register(pArent.onDidChAngeLogLevel(level => logService.setLevel(level)));
	}

	setLevel(level: LogLevel): void {
		super.setLevel(level);

		this.pArent.setLevel(level);
	}
}
