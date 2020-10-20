/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As crypto from 'crypto';
import { once } from 'vs/bAse/common/functionAl';

export Async function checksum(pAth: string, shA1hAsh: string | undefined): Promise<void> {
	const checksumPromise = new Promise<string | undefined>((resolve, reject) => {
		const input = fs.creAteReAdStreAm(pAth);
		const hAsh = crypto.creAteHAsh('shA1');
		input.pipe(hAsh);

		const done = once((err?: Error, result?: string) => {
			input.removeAllListeners();
			hAsh.removeAllListeners();

			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});

		input.once('error', done);
		input.once('end', done);
		hAsh.once('error', done);
		hAsh.once('dAtA', (dAtA: Buffer) => done(undefined, dAtA.toString('hex')));
	});

	const hAsh = AwAit checksumPromise;

	if (hAsh !== shA1hAsh) {
		throw new Error('HAsh mismAtch');
	}
}
