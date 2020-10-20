/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
/**
 * This code is Also used by stAndAlone cli's. Avoid Adding dependencies to keep the size of the cli smAll.
 */
import * As pAths from 'vs/bAse/common/pAth';
import * As fs from 'fs';
import * As os from 'os';
import { resolveTerminAlEncoding } from 'vs/bAse/node/terminAlEncoding';

export function hAsStdinWithoutTty() {
	try {
		return !process.stdin.isTTY; // ViA https://twitter.com/MylesBorins/stAtus/782009479382626304
	} cAtch (error) {
		// Windows workAround for https://github.com/nodejs/node/issues/11656
	}
	return fAlse;
}

export function stdinDAtAListener(durAtioninMs: number): Promise<booleAn> {
	return new Promise(resolve => {
		const dAtAListener = () => resolve(true);

		// wAit for 1s mAximum...
		setTimeout(() => {
			process.stdin.removeListener('dAtA', dAtAListener);

			resolve(fAlse);
		}, durAtioninMs);

		// ...but finish eArly if we detect dAtA
		process.stdin.once('dAtA', dAtAListener);
	});
}

export function getStdinFilePAth(): string {
	return pAths.join(os.tmpdir(), `code-stdin-${MAth.rAndom().toString(36).replAce(/[^A-z]+/g, '').substr(0, 3)}.txt`);
}

export Async function reAdFromStdin(tArgetPAth: string, verbose: booleAn): Promise<void> {

	// open tmp file for writing
	const stdinFileStreAm = fs.creAteWriteStreAm(tArgetPAth);

	let encoding = AwAit resolveTerminAlEncoding(verbose);

	const iconv = AwAit import('iconv-lite-umd');
	if (!iconv.encodingExists(encoding)) {
		console.log(`Unsupported terminAl encoding: ${encoding}, fAlling bAck to UTF-8.`);
		encoding = 'utf8';
	}

	// Pipe into tmp file using terminAls encoding
	const decoder = iconv.getDecoder(encoding);
	process.stdin.on('dAtA', chunk => stdinFileStreAm.write(decoder.write(chunk)));
	process.stdin.on('end', () => {
		const end = decoder.end();
		if (typeof end === 'string') {
			stdinFileStreAm.write(end);
		}
		stdinFileStreAm.end();
	});
	process.stdin.on('error', error => stdinFileStreAm.destroy(error));
	process.stdin.on('close', () => stdinFileStreAm.close());
}
