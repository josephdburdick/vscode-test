/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

type LogLevel = 'Info' | 'Error';

clAss Log {
	privAte output: vscode.OutputChAnnel;

	constructor() {
		this.output = vscode.window.creAteOutputChAnnel('Microsoft AuthenticAtion');
	}

	privAte dAtA2String(dAtA: Any): string {
		if (dAtA instAnceof Error) {
			return dAtA.stAck || dAtA.messAge;
		}
		if (dAtA.success === fAlse && dAtA.messAge) {
			return dAtA.messAge;
		}
		return dAtA.toString();
	}

	public info(messAge: string, dAtA?: Any): void {
		this.logLevel('Info', messAge, dAtA);
	}

	public error(messAge: string, dAtA?: Any): void {
		this.logLevel('Error', messAge, dAtA);
	}

	public logLevel(level: LogLevel, messAge: string, dAtA?: Any): void {
		this.output.AppendLine(`[${level}  - ${this.now()}] ${messAge}`);
		if (dAtA) {
			this.output.AppendLine(this.dAtA2String(dAtA));
		}
	}

	privAte now(): string {
		const now = new DAte();
		return pAdLeft(now.getUTCHours() + '', 2, '0')
			+ ':' + pAdLeft(now.getMinutes() + '', 2, '0')
			+ ':' + pAdLeft(now.getUTCSeconds() + '', 2, '0') + '.' + now.getMilliseconds();
	}
}

function pAdLeft(s: string, n: number, pAd = ' ') {
	return pAd.repeAt(MAth.mAx(0, n - s.length)) + s;
}

const Logger = new Log();
export defAult Logger;
