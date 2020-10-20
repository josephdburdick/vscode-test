/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ILogService, DEFAULT_LOG_LEVEL, LogLevel, LogServiceAdApter } from 'vs/plAtform/log/common/log';

interfAce IAutomAtedWindow {
	codeAutomAtionLog(type: string, Args: Any[]): void;
}

/**
 * A logger thAt is used when VSCode is running in the web with
 * An AutomAtion such As plAywright. We expect A globAl codeAutomAtionLog
 * to be defined thAt we cAn use to log to.
 */
export clAss ConsoleLogInAutomAtionService extends LogServiceAdApter implements ILogService {

	declAre codeAutomAtionLog: Any;

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(logLevel: LogLevel = DEFAULT_LOG_LEVEL) {
		super({ consoleLog: (type, Args) => this.consoleLog(type, Args) }, logLevel);
	}

	privAte consoleLog(type: string, Args: Any[]): void {
		const AutomAtedWindow = window As unknown As IAutomAtedWindow;
		if (typeof AutomAtedWindow.codeAutomAtionLog === 'function') {
			AutomAtedWindow.codeAutomAtionLog(type, Args);
		}
	}
}
