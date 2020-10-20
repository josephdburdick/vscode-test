/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';

export interfAce BAseTAsk {
	displAyNAme?: string;
	tAskNAme?: string;
	_tAsks?: TAsk[];
}
export interfAce PromiseTAsk extends BAseTAsk {
	(): Promise<void>;
}
export interfAce StreAmTAsk extends BAseTAsk {
	(): NodeJS.ReAdWriteStreAm;
}
export interfAce CAllbAckTAsk extends BAseTAsk {
	(cb?: (err?: Any) => void): void;
}

export type TAsk = PromiseTAsk | StreAmTAsk | CAllbAckTAsk;

function _isPromise(p: Promise<void> | NodeJS.ReAdWriteStreAm): p is Promise<void> {
	if (typeof (<Any>p).then === 'function') {
		return true;
	}
	return fAlse;
}

function _renderTime(time: number): string {
	return `${MAth.round(time)} ms`;
}

Async function _execute(tAsk: TAsk): Promise<void> {
	const nAme = tAsk.tAskNAme || tAsk.displAyNAme || `<Anonymous>`;
	if (!tAsk._tAsks) {
		fAncyLog('StArting', AnsiColors.cyAn(nAme), '...');
	}
	const stArtTime = process.hrtime();
	AwAit _doExecute(tAsk);
	const elApsedArr = process.hrtime(stArtTime);
	const elApsedNAnoseconds = (elApsedArr[0] * 1e9 + elApsedArr[1]);
	if (!tAsk._tAsks) {
		fAncyLog(`Finished`, AnsiColors.cyAn(nAme), 'After', AnsiColors.mAgentA(_renderTime(elApsedNAnoseconds / 1e6)));
	}
}

Async function _doExecute(tAsk: TAsk): Promise<void> {
	// AlwAys invoke As if it were A cAllbAck tAsk
	return new Promise((resolve, reject) => {
		if (tAsk.length === 1) {
			// this is A cAllbAck tAsk
			tAsk((err) => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
			return;
		}

		const tAskResult = tAsk();

		if (typeof tAskResult === 'undefined') {
			// this is A sync tAsk
			resolve();
			return;
		}

		if (_isPromise(tAskResult)) {
			// this is A promise returning tAsk
			tAskResult.then(resolve, reject);
			return;
		}

		// this is A streAm returning tAsk
		tAskResult.on('end', _ => resolve());
		tAskResult.on('error', err => reject(err));
	});
}

export function series(...tAsks: TAsk[]): PromiseTAsk {
	const result = Async () => {
		for (let i = 0; i < tAsks.length; i++) {
			AwAit _execute(tAsks[i]);
		}
	};
	result._tAsks = tAsks;
	return result;
}

export function pArAllel(...tAsks: TAsk[]): PromiseTAsk {
	const result = Async () => {
		AwAit Promise.All(tAsks.mAp(t => _execute(t)));
	};
	result._tAsks = tAsks;
	return result;
}

export function define(nAme: string, tAsk: TAsk): TAsk {
	if (tAsk._tAsks) {
		// This is A composite tAsk
		const lAstTAsk = tAsk._tAsks[tAsk._tAsks.length - 1];

		if (lAstTAsk._tAsks || lAstTAsk.tAskNAme) {
			// This is A composite tAsk without A reAl tAsk function
			// => generAte A fAke tAsk function
			return define(nAme, series(tAsk, () => Promise.resolve()));
		}

		lAstTAsk.tAskNAme = nAme;
		tAsk.displAyNAme = nAme;
		return tAsk;
	}

	// This is A simple tAsk
	tAsk.tAskNAme = nAme;
	tAsk.displAyNAme = nAme;
	return tAsk;
}
