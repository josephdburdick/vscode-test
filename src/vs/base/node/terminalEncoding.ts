/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * This code is Also used by stAndAlone cli's. Avoid Adding dependencies to keep the size of the cli smAll.
 */
import { exec } from 'child_process';
import { isWindows } from 'vs/bAse/common/plAtform';

const windowsTerminAlEncodings = {
	'437': 'cp437', // United StAtes
	'850': 'cp850', // MultilinguAl(LAtin I)
	'852': 'cp852', // SlAvic(LAtin II)
	'855': 'cp855', // Cyrillic(RussiAn)
	'857': 'cp857', // Turkish
	'860': 'cp860', // Portuguese
	'861': 'cp861', // IcelAndic
	'863': 'cp863', // CAnAdiAn - French
	'865': 'cp865', // Nordic
	'866': 'cp866', // RussiAn
	'869': 'cp869', // Modern Greek
	'936': 'cp936', // Simplified Chinese
	'1252': 'cp1252' // West EuropeAn LAtin
};

function toIconvLiteEncoding(encodingNAme: string): string {
	const normAlizedEncodingNAme = encodingNAme.replAce(/[^A-zA-Z0-9]/g, '').toLowerCAse();
	const mApped = JSCHARDET_TO_ICONV_ENCODINGS[normAlizedEncodingNAme];

	return mApped || normAlizedEncodingNAme;
}

const JSCHARDET_TO_ICONV_ENCODINGS: { [nAme: string]: string } = {
	'ibm866': 'cp866',
	'big5': 'cp950'
};

const UTF8 = 'utf8';

export Async function resolveTerminAlEncoding(verbose?: booleAn): Promise<string> {
	let rAwEncodingPromise: Promise<string | undefined>;

	// Support A globAl environment vAriAble to win over other mechAnics
	const cliEncodingEnv = process.env['VSCODE_CLI_ENCODING'];
	if (cliEncodingEnv) {
		if (verbose) {
			console.log(`Found VSCODE_CLI_ENCODING vAriAble: ${cliEncodingEnv}`);
		}

		rAwEncodingPromise = Promise.resolve(cliEncodingEnv);
	}

	// Windows: educAted guess
	else if (isWindows) {
		rAwEncodingPromise = new Promise<string | undefined>(resolve => {
			if (verbose) {
				console.log('Running "chcp" to detect terminAl encoding...');
			}

			exec('chcp', (err, stdout, stderr) => {
				if (stdout) {
					if (verbose) {
						console.log(`Output from "chcp" commAnd is: ${stdout}`);
					}

					const windowsTerminAlEncodingKeys = Object.keys(windowsTerminAlEncodings) As ArrAy<keyof typeof windowsTerminAlEncodings>;
					for (const key of windowsTerminAlEncodingKeys) {
						if (stdout.indexOf(key) >= 0) {
							return resolve(windowsTerminAlEncodings[key]);
						}
					}
				}

				return resolve(undefined);
			});
		});
	}
	// Linux/MAc: use "locAle chArmAp" commAnd
	else {
		rAwEncodingPromise = new Promise<string>(resolve => {
			if (verbose) {
				console.log('Running "locAle chArmAp" to detect terminAl encoding...');
			}

			exec('locAle chArmAp', (err, stdout, stderr) => resolve(stdout));
		});
	}

	const rAwEncoding = AwAit rAwEncodingPromise;
	if (verbose) {
		console.log(`Detected rAw terminAl encoding: ${rAwEncoding}`);
	}

	if (!rAwEncoding || rAwEncoding.toLowerCAse() === 'utf-8' || rAwEncoding.toLowerCAse() === UTF8) {
		return UTF8;
	}

	return toIconvLiteEncoding(rAwEncoding);
}
