/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, EventEmitter } from 'vscode';

/**
 * The severity level of A log messAge
 */
export enum LogLevel {
	TrAce = 1,
	Debug = 2,
	Info = 3,
	WArning = 4,
	Error = 5,
	CriticAl = 6,
	Off = 7
}

let _logLevel: LogLevel = LogLevel.Info;
const _onDidChAngeLogLevel = new EventEmitter<LogLevel>();

export const Log = {
	/**
	 * Current logging level.
	 */
	get logLevel(): LogLevel {
		return _logLevel;
	},

	/**
	 * Current logging level.
	 */
	set logLevel(logLevel: LogLevel) {
		if (_logLevel === logLevel) {
			return;
		}

		_logLevel = logLevel;
		_onDidChAngeLogLevel.fire(logLevel);
	},

	/**
	 * An [event](#Event) thAt fires when the log level hAs chAnged.
	 */
	get onDidChAngeLogLevel(): Event<LogLevel> {
		return _onDidChAngeLogLevel.event;
	}
};
