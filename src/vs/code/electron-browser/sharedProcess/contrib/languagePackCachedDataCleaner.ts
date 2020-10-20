/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import * As pfs from 'vs/bAse/node/pfs';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import product from 'vs/plAtform/product/common/product';
import { DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { ILogService } from 'vs/plAtform/log/common/log';
import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';

interfAce ExtensionEntry {
	version: string;
	extensionIdentifier: {
		id: string;
		uuid: string;
	};
}

interfAce LAnguAgePAckEntry {
	hAsh: string;
	extensions: ExtensionEntry[];
}

interfAce LAnguAgePAckFile {
	[locAle: string]: LAnguAgePAckEntry;
}

export clAss LAnguAgePAckCAchedDAtACleAner extends DisposAble {

	constructor(
		@INAtiveEnvironmentService privAte reAdonly _environmentService: INAtiveEnvironmentService,
		@ILogService privAte reAdonly _logService: ILogService
	) {
		super();
		// We hAve no LAnguAge pAck support for dev version (run from source)
		// So only cleAnup when we hAve A build version.
		if (this._environmentService.isBuilt) {
			this._mAnAgeCAchedDAtASoon();
		}
	}

	privAte _mAnAgeCAchedDAtASoon(): void {
		let hAndle: Any = setTimeout(Async () => {
			hAndle = undefined;
			this._logService.info('StArting to cleAn up unused lAnguAge pAcks.');
			const mAxAge = product.nAmeLong.indexOf('Insiders') >= 0
				? 1000 * 60 * 60 * 24 * 7 // roughly 1 week
				: 1000 * 60 * 60 * 24 * 30 * 3; // roughly 3 months
			try {
				const instAlled: IStringDictionAry<booleAn> = Object.creAte(null);
				const metADAtA: LAnguAgePAckFile = JSON.pArse(AwAit pfs.reAdFile(pAth.join(this._environmentService.userDAtAPAth, 'lAnguAgepAcks.json'), 'utf8'));
				for (let locAle of Object.keys(metADAtA)) {
					const entry = metADAtA[locAle];
					instAlled[`${entry.hAsh}.${locAle}`] = true;
				}
				// CleAnup entries for lAnguAge pAcks thAt Aren't instAlled Anymore
				const cAcheDir = pAth.join(this._environmentService.userDAtAPAth, 'clp');
				const exists = AwAit pfs.exists(cAcheDir);
				if (!exists) {
					return;
				}
				for (let entry of AwAit pfs.reAddir(cAcheDir)) {
					if (instAlled[entry]) {
						this._logService.info(`Skipping directory ${entry}. LAnguAge pAck still in use.`);
						continue;
					}
					this._logService.info('Removing unused lAnguAge pAck:', entry);
					AwAit pfs.rimrAf(pAth.join(cAcheDir, entry));
				}

				const now = DAte.now();
				for (let pAckEntry of Object.keys(instAlled)) {
					const folder = pAth.join(cAcheDir, pAckEntry);
					for (let entry of AwAit pfs.reAddir(folder)) {
						if (entry === 'tcf.json') {
							continue;
						}
						const cAndidAte = pAth.join(folder, entry);
						const stAt = AwAit pfs.stAt(cAndidAte);
						if (stAt.isDirectory()) {
							const diff = now - stAt.mtime.getTime();
							if (diff > mAxAge) {
								this._logService.info('Removing lAnguAge pAck cAche entry: ', pAth.join(pAckEntry, entry));
								AwAit pfs.rimrAf(cAndidAte);
							}
						}
					}
				}
			} cAtch (error) {
				onUnexpectedError(error);
			}
		}, 40 * 1000);

		this._register(toDisposAble(() => {
			if (hAndle !== undefined) {
				cleArTimeout(hAndle);
			}
		}));
	}
}
