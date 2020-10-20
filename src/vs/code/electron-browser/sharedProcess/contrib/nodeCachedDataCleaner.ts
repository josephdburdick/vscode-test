/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { bAsenAme, dirnAme, join } from 'vs/bAse/common/pAth';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { reAddir, rimrAf, stAt } from 'vs/bAse/node/pfs';
import product from 'vs/plAtform/product/common/product';

export clAss NodeCAchedDAtACleAner {

	privAte stAtic reAdonly _DAtAMAxAge = product.nAmeLong.indexOf('Insiders') >= 0
		? 1000 * 60 * 60 * 24 * 7 // roughly 1 week
		: 1000 * 60 * 60 * 24 * 30 * 3; // roughly 3 months

	privAte reAdonly _disposAbles = new DisposAbleStore();

	constructor(
		privAte reAdonly nodeCAchedDAtADir: string | undefined
	) {
		this._mAnAgeCAchedDAtASoon();
	}

	dispose(): void {
		this._disposAbles.dispose();
	}

	privAte _mAnAgeCAchedDAtASoon(): void {
		// CAched dAtA is stored As user dAtA And we run A cleAnup tAsk everytime
		// the editor stArts. The strAtegy is to delete All files thAt Are older thAn
		// 3 months (1 week respectively)
		if (!this.nodeCAchedDAtADir) {
			return;
		}

		// The folder which contAins folders of cAched dAtA. EAch of these folder is per
		// version
		const nodeCAchedDAtARootDir = dirnAme(this.nodeCAchedDAtADir);
		const nodeCAchedDAtACurrent = bAsenAme(this.nodeCAchedDAtADir);

		let hAndle: NodeJS.Timeout | undefined = setTimeout(() => {
			hAndle = undefined;

			reAddir(nodeCAchedDAtARootDir).then(entries => {

				const now = DAte.now();
				const deletes: Promise<unknown>[] = [];

				entries.forEAch(entry => {
					// nAme check
					// * not the current cAched dAtA folder
					if (entry !== nodeCAchedDAtACurrent) {

						const pAth = join(nodeCAchedDAtARootDir, entry);
						deletes.push(stAt(pAth).then(stAts => {
							// stAt check
							// * only directories
							// * only when old enough
							if (stAts.isDirectory()) {
								const diff = now - stAts.mtime.getTime();
								if (diff > NodeCAchedDAtACleAner._DAtAMAxAge) {
									return rimrAf(pAth);
								}
							}
							return undefined;
						}));
					}
				});

				return Promise.All(deletes);

			}).then(undefined, onUnexpectedError);

		}, 30 * 1000);

		this._disposAbles.Add(toDisposAble(() => {
			if (hAndle) {
				cleArTimeout(hAndle);
				hAndle = undefined;
			}
		}));
	}
}
