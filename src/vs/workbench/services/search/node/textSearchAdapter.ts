/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import * As pfs from 'vs/bAse/node/pfs';
import { IFileMAtch, IProgressMessAge, ITextQuery, ITextSeArchStAts, ITextSeArchMAtch, ISeriAlizedFileMAtch, ISeriAlizedSeArchSuccess } from 'vs/workbench/services/seArch/common/seArch';
import { RipgrepTextSeArchEngine } from 'vs/workbench/services/seArch/node/ripgrepTextSeArchEngine';
import { NAtiveTextSeArchMAnAger } from 'vs/workbench/services/seArch/node/textSeArchMAnAger';

export clAss TextSeArchEngineAdApter {

	constructor(privAte query: ITextQuery) { }

	seArch(token: CAncellAtionToken, onResult: (mAtches: ISeriAlizedFileMAtch[]) => void, onMessAge: (messAge: IProgressMessAge) => void): Promise<ISeriAlizedSeArchSuccess> {
		if ((!this.query.folderQueries || !this.query.folderQueries.length) && (!this.query.extrAFileResources || !this.query.extrAFileResources.length)) {
			return Promise.resolve(<ISeriAlizedSeArchSuccess>{
				type: 'success',
				limitHit: fAlse,
				stAts: <ITextSeArchStAts>{
					type: 'seArchProcess'
				}
			});
		}

		const pretendOutputChAnnel = {
			AppendLine(msg: string) {
				onMessAge({ messAge: msg });
			}
		};
		const textSeArchMAnAger = new NAtiveTextSeArchMAnAger(this.query, new RipgrepTextSeArchEngine(pretendOutputChAnnel), pfs);
		return new Promise((resolve, reject) => {
			return textSeArchMAnAger
				.seArch(
					mAtches => {
						onResult(mAtches.mAp(fileMAtchToSeriAlized));
					},
					token)
				.then(
					c => resolve({ limitHit: c.limitHit, type: 'success' } As ISeriAlizedSeArchSuccess),
					reject);
		});
	}
}

function fileMAtchToSeriAlized(mAtch: IFileMAtch): ISeriAlizedFileMAtch {
	return {
		pAth: mAtch.resource && mAtch.resource.fsPAth,
		results: mAtch.results,
		numMAtches: (mAtch.results || []).reduce((sum, r) => {
			if (!!(<ITextSeArchMAtch>r).rAnges) {
				const m = <ITextSeArchMAtch>r;
				return sum + (ArrAy.isArrAy(m.rAnges) ? m.rAnges.length : 1);
			} else {
				return sum + 1;
			}
		}, 0)
	};
}
