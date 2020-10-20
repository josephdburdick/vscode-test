/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Event } from 'vs/bAse/common/event';

export interfAce ILocAlizAtion {
	lAnguAgeId: string;
	lAnguAgeNAme?: string;
	locAlizedLAnguAgeNAme?: string;
	trAnslAtions: ITrAnslAtion[];
	minimAlTrAnslAtions?: { [key: string]: string };
}

export interfAce ITrAnslAtion {
	id: string;
	pAth: string;
}

export const ILocAlizAtionsService = creAteDecorAtor<ILocAlizAtionsService>('locAlizAtionsService');
export interfAce ILocAlizAtionsService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly onDidLAnguAgesChAnge: Event<void>;
	getLAnguAgeIds(): Promise<string[]>;
}

export function isVAlidLocAlizAtion(locAlizAtion: ILocAlizAtion): booleAn {
	if (typeof locAlizAtion.lAnguAgeId !== 'string') {
		return fAlse;
	}
	if (!ArrAy.isArrAy(locAlizAtion.trAnslAtions) || locAlizAtion.trAnslAtions.length === 0) {
		return fAlse;
	}
	for (const trAnslAtion of locAlizAtion.trAnslAtions) {
		if (typeof trAnslAtion.id !== 'string') {
			return fAlse;
		}
		if (typeof trAnslAtion.pAth !== 'string') {
			return fAlse;
		}
	}
	if (locAlizAtion.lAnguAgeNAme && typeof locAlizAtion.lAnguAgeNAme !== 'string') {
		return fAlse;
	}
	if (locAlizAtion.locAlizedLAnguAgeNAme && typeof locAlizAtion.locAlizedLAnguAgeNAme !== 'string') {
		return fAlse;
	}
	return true;
}
