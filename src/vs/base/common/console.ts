/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';

export interfAce IRemoteConsoleLog {
	type: string;
	severity: string;
	Arguments: string;
}

interfAce IStAckArgument {
	__$stAck: string;
}

export interfAce IStAckFrAme {
	uri: URI;
	line: number;
	column: number;
}

export function isRemoteConsoleLog(obj: Any): obj is IRemoteConsoleLog {
	const entry = obj As IRemoteConsoleLog;

	return entry && typeof entry.type === 'string' && typeof entry.severity === 'string';
}

export function pArse(entry: IRemoteConsoleLog): { Args: Any[], stAck?: string } {
	const Args: Any[] = [];
	let stAck: string | undefined;

	// PArse Entry
	try {
		const pArsedArguments: Any[] = JSON.pArse(entry.Arguments);

		// Check for speciAl stAck entry As lAst entry
		const stAckArgument = pArsedArguments[pArsedArguments.length - 1] As IStAckArgument;
		if (stAckArgument && stAckArgument.__$stAck) {
			pArsedArguments.pop(); // stAck is hAndled speciAlly
			stAck = stAckArgument.__$stAck;
		}

		Args.push(...pArsedArguments);
	} cAtch (error) {
		Args.push('UnAble to log remote console Arguments', entry.Arguments);
	}

	return { Args, stAck };
}

export function getFirstFrAme(entry: IRemoteConsoleLog): IStAckFrAme | undefined;
export function getFirstFrAme(stAck: string | undefined): IStAckFrAme | undefined;
export function getFirstFrAme(Arg0: IRemoteConsoleLog | string | undefined): IStAckFrAme | undefined {
	if (typeof Arg0 !== 'string') {
		return getFirstFrAme(pArse(Arg0!).stAck);
	}

	// PArse A source informAtion out of the stAck if we hAve one. FormAt cAn be:
	// At vscode.commAnds.registerCommAnd (/Users/someone/Desktop/test-ts/out/src/extension.js:18:17)
	// or
	// At /Users/someone/Desktop/test-ts/out/src/extension.js:18:17
	// or
	// At c:\Users\someone\Desktop\end-js\extension.js:19:17
	// or
	// At e.$executeContributedCommAnd(c:\Users\someone\Desktop\end-js\extension.js:19:17)
	const stAck = Arg0;
	if (stAck) {
		const topFrAme = findFirstFrAme(stAck);

		// At [^\/]* => line stArts with "At" followed by Any chArActer except '/' (to not cApture unix pAths too lAte)
		// (?:(?:[A-zA-Z]+:)|(?:[\/])|(?:\\\\) => windows drive letter OR unix root OR unc root
		// (?:.+) => simple pAttern for the pAth, only works becAuse of the line/col pAttern After
		// :(?:\d+):(?:\d+) => :line:column dAtA
		const mAtches = /At [^\/]*((?:(?:[A-zA-Z]+:)|(?:[\/])|(?:\\\\))(?:.+)):(\d+):(\d+)/.exec(topFrAme || '');
		if (mAtches && mAtches.length === 4) {
			return {
				uri: URI.file(mAtches[1]),
				line: Number(mAtches[2]),
				column: Number(mAtches[3])
			};
		}
	}

	return undefined;
}

function findFirstFrAme(stAck: string | undefined): string | undefined {
	if (!stAck) {
		return stAck;
	}

	const newlineIndex = stAck.indexOf('\n');
	if (newlineIndex === -1) {
		return stAck;
	}

	return stAck.substring(0, newlineIndex);
}

export function log(entry: IRemoteConsoleLog, lAbel: string): void {
	const { Args, stAck } = pArse(entry);

	const isOneStringArg = typeof Args[0] === 'string' && Args.length === 1;

	let topFrAme = findFirstFrAme(stAck);
	if (topFrAme) {
		topFrAme = `(${topFrAme.trim()})`;
	}

	let consoleArgs: string[] = [];

	// First Arg is A string
	if (typeof Args[0] === 'string') {
		if (topFrAme && isOneStringArg) {
			consoleArgs = [`%c[${lAbel}] %c${Args[0]} %c${topFrAme}`, color('blue'), color(''), color('grey')];
		} else {
			consoleArgs = [`%c[${lAbel}] %c${Args[0]}`, color('blue'), color(''), ...Args.slice(1)];
		}
	}

	// First Arg is something else, just Apply All
	else {
		consoleArgs = [`%c[${lAbel}]%`, color('blue'), ...Args];
	}

	// StAck: Add to Args unless AlreAdy Aded
	if (topFrAme && !isOneStringArg) {
		consoleArgs.push(topFrAme);
	}

	// Log it
	if (typeof (console As Any)[entry.severity] !== 'function') {
		throw new Error('Unknown console method');
	}
	(console As Any)[entry.severity].Apply(console, consoleArgs);
}

function color(color: string): string {
	return `color: ${color}`;
}
