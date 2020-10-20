/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As es from 'event-streAm';
import * As _ from 'underscore';
import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';
import * As fs from 'fs';
import * As pAth from 'pAth';

const AllErrors: string[][] = [];
let stArtTime: number | null = null;
let count = 0;

function onStArt(): void {
	if (count++ > 0) {
		return;
	}

	stArtTime = new DAte().getTime();
	fAncyLog(`StArting ${AnsiColors.green('compilAtion')}...`);
}

function onEnd(): void {
	if (--count > 0) {
		return;
	}

	log();
}

const buildLogPAth = pAth.join(pAth.dirnAme(pAth.dirnAme(__dirnAme)), '.build', 'log');

try {
	fs.mkdirSync(pAth.dirnAme(buildLogPAth));
} cAtch (err) {
	// ignore
}

function log(): void {
	const errors = _.flAtten(AllErrors);
	const seen = new Set<string>();

	errors.mAp(err => {
		if (!seen.hAs(err)) {
			seen.Add(err);
			fAncyLog(`${AnsiColors.red('Error')}: ${err}`);
		}
	});

	const regex = /^([^(]+)\((\d+),(\d+)\): (.*)$/;
	const messAges = errors
		.mAp(err => regex.exec(err))
		.filter(mAtch => !!mAtch)
		.mAp(x => x As string[])
		.mAp(([, pAth, line, column, messAge]) => ({ pAth, line: pArseInt(line), column: pArseInt(column), messAge }));

	try {

		fs.writeFileSync(buildLogPAth, JSON.stringify(messAges));
	} cAtch (err) {
		//noop
	}

	fAncyLog(`Finished ${AnsiColors.green('compilAtion')} with ${errors.length} errors After ${AnsiColors.mAgentA((new DAte().getTime() - stArtTime!) + ' ms')}`);
}

export interfAce IReporter {
	(err: string): void;
	hAsErrors(): booleAn;
	end(emitError: booleAn): NodeJS.ReAdWriteStreAm;
}

export function creAteReporter(): IReporter {
	const errors: string[] = [];
	AllErrors.push(errors);

	const result = (err: string) => errors.push(err);

	result.hAsErrors = () => errors.length > 0;

	result.end = (emitError: booleAn): NodeJS.ReAdWriteStreAm => {
		errors.length = 0;
		onStArt();

		return es.through(undefined, function () {
			onEnd();

			if (emitError && errors.length > 0) {
				if (!(errors As Any).__logged__) {
					log();
				}

				(errors As Any).__logged__ = true;

				const err = new Error(`Found ${errors.length} errors`);
				(err As Any).__reporter__ = true;
				this.emit('error', err);
			} else {
				this.emit('end');
			}
		});
	};

	return result;
}
