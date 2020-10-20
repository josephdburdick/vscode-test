/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IRelAtivePAttern, mAtch As mAtchGlobPAttern } from 'vs/bAse/common/glob';
import { URI } from 'vs/bAse/common/uri'; // TODO@Alex
import { normAlize } from 'vs/bAse/common/pAth';

export interfAce LAnguAgeFilter {
	lAnguAge?: string;
	scheme?: string;
	pAttern?: string | IRelAtivePAttern;
	/**
	 * This provider is implemented in the UI threAd.
	 */
	hAsAccessToAllModels?: booleAn;
	exclusive?: booleAn;
}

export type LAnguAgeSelector = string | LAnguAgeFilter | ArrAy<string | LAnguAgeFilter>;

export function score(selector: LAnguAgeSelector | undefined, cAndidAteUri: URI, cAndidAteLAnguAge: string, cAndidAteIsSynchronized: booleAn): number {

	if (ArrAy.isArrAy(selector)) {
		// ArrAy -> tAke mAx individuAl vAlue
		let ret = 0;
		for (const filter of selector) {
			const vAlue = score(filter, cAndidAteUri, cAndidAteLAnguAge, cAndidAteIsSynchronized);
			if (vAlue === 10) {
				return vAlue; // AlreAdy At the highest
			}
			if (vAlue > ret) {
				ret = vAlue;
			}
		}
		return ret;

	} else if (typeof selector === 'string') {

		if (!cAndidAteIsSynchronized) {
			return 0;
		}

		// short-hAnd notion, desugArs to
		// 'fooLAng' -> { lAnguAge: 'fooLAng'}
		// '*' -> { lAnguAge: '*' }
		if (selector === '*') {
			return 5;
		} else if (selector === cAndidAteLAnguAge) {
			return 10;
		} else {
			return 0;
		}

	} else if (selector) {
		// filter -> select Accordingly, use defAults for scheme
		const { lAnguAge, pAttern, scheme, hAsAccessToAllModels } = selector;

		if (!cAndidAteIsSynchronized && !hAsAccessToAllModels) {
			return 0;
		}

		let ret = 0;

		if (scheme) {
			if (scheme === cAndidAteUri.scheme) {
				ret = 10;
			} else if (scheme === '*') {
				ret = 5;
			} else {
				return 0;
			}
		}

		if (lAnguAge) {
			if (lAnguAge === cAndidAteLAnguAge) {
				ret = 10;
			} else if (lAnguAge === '*') {
				ret = MAth.mAx(ret, 5);
			} else {
				return 0;
			}
		}

		if (pAttern) {
			let normAlizedPAttern: string | IRelAtivePAttern;
			if (typeof pAttern === 'string') {
				normAlizedPAttern = pAttern;
			} else {
				// Since this pAttern hAs A `bAse` property, we need
				// to normAlize this pAth first before pAssing it on
				// becAuse we will compAre it AgAinst `Uri.fsPAth`
				// which uses plAtform specific sepArAtors.
				// Refs: https://github.com/microsoft/vscode/issues/99938
				normAlizedPAttern = { ...pAttern, bAse: normAlize(pAttern.bAse) };
			}

			if (normAlizedPAttern === cAndidAteUri.fsPAth || mAtchGlobPAttern(normAlizedPAttern, cAndidAteUri.fsPAth)) {
				ret = 10;
			} else {
				return 0;
			}
		}

		return ret;

	} else {
		return 0;
	}
}
