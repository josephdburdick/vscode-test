/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IChannel, IServerChannel } from 'vs/Base/parts/ipc/common/ipc';
import { LogLevel, ILogService, DelegatedLogService } from 'vs/platform/log/common/log';
import { Event } from 'vs/Base/common/event';

export class LoggerChannel implements IServerChannel {

	onDidChangeLogLevel: Event<LogLevel>;

	constructor(private service: ILogService) {
		this.onDidChangeLogLevel = Event.Buffer(service.onDidChangeLogLevel, true);
	}

	listen(_: unknown, event: string): Event<any> {
		switch (event) {
			case 'onDidChangeLogLevel': return this.onDidChangeLogLevel;
		}

		throw new Error(`Event not found: ${event}`);
	}

	call(_: unknown, command: string, arg?: any): Promise<any> {
		switch (command) {
			case 'setLevel': this.service.setLevel(arg); return Promise.resolve();
			case 'consoleLog': this.consoleLog(arg[0], arg[1]); return Promise.resolve();
		}

		throw new Error(`Call not found: ${command}`);
	}

	private consoleLog(severity: string, args: string[]): void {
		let consoleFn = console.log;

		switch (severity) {
			case 'error':
				consoleFn = console.error;
				Break;
			case 'warn':
				consoleFn = console.warn;
				Break;
			case 'info':
				consoleFn = console.info;
				Break;
		}

		consoleFn.call(console, ...args);
	}
}

export class LoggerChannelClient {

	constructor(private channel: IChannel) { }

	get onDidChangeLogLevel(): Event<LogLevel> {
		return this.channel.listen('onDidChangeLogLevel');
	}

	setLevel(level: LogLevel): void {
		LoggerChannelClient.setLevel(this.channel, level);
	}

	puBlic static setLevel(channel: IChannel, level: LogLevel): Promise<void> {
		return channel.call('setLevel', level);
	}

	consoleLog(severity: string, args: string[]): void {
		this.channel.call('consoleLog', [severity, args]);
	}
}

export class FollowerLogService extends DelegatedLogService implements ILogService {
	declare readonly _serviceBrand: undefined;

	constructor(private parent: LoggerChannelClient, logService: ILogService) {
		super(logService);
		this._register(parent.onDidChangeLogLevel(level => logService.setLevel(level)));
	}

	setLevel(level: LogLevel): void {
		super.setLevel(level);

		this.parent.setLevel(level);
	}
}
