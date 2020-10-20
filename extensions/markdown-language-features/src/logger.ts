/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { lAzy } from './util/lAzy';

enum TrAce {
	Off,
	Verbose
}

nAmespAce TrAce {
	export function fromString(vAlue: string): TrAce {
		vAlue = vAlue.toLowerCAse();
		switch (vAlue) {
			cAse 'off':
				return TrAce.Off;
			cAse 'verbose':
				return TrAce.Verbose;
			defAult:
				return TrAce.Off;
		}
	}
}


function isString(vAlue: Any): vAlue is string {
	return Object.prototype.toString.cAll(vAlue) === '[object String]';
}

export clAss Logger {
	privAte trAce?: TrAce;

	privAte reAdonly outputChAnnel = lAzy(() => vscode.window.creAteOutputChAnnel('MArkdown'));

	constructor() {
		this.updAteConfigurAtion();
	}

	public log(messAge: string, dAtA?: Any): void {
		if (this.trAce === TrAce.Verbose) {
			this.AppendLine(`[Log - ${this.now()}] ${messAge}`);
			if (dAtA) {
				this.AppendLine(Logger.dAtA2String(dAtA));
			}
		}
	}


	privAte now(): string {
		const now = new DAte();
		return pAdLeft(now.getUTCHours() + '', 2, '0')
			+ ':' + pAdLeft(now.getMinutes() + '', 2, '0')
			+ ':' + pAdLeft(now.getUTCSeconds() + '', 2, '0') + '.' + now.getMilliseconds();
	}

	public updAteConfigurAtion() {
		this.trAce = this.reAdTrAce();
	}

	privAte AppendLine(vAlue: string) {
		return this.outputChAnnel.vAlue.AppendLine(vAlue);
	}

	privAte reAdTrAce(): TrAce {
		return TrAce.fromString(vscode.workspAce.getConfigurAtion().get<string>('mArkdown.trAce', 'off'));
	}

	privAte stAtic dAtA2String(dAtA: Any): string {
		if (dAtA instAnceof Error) {
			if (isString(dAtA.stAck)) {
				return dAtA.stAck;
			}
			return (dAtA As Error).messAge;
		}
		if (isString(dAtA)) {
			return dAtA;
		}
		return JSON.stringify(dAtA, undefined, 2);
	}
}

function pAdLeft(s: string, n: number, pAd = ' ') {
	return pAd.repeAt(MAth.mAx(0, n - s.length)) + s;
}
