/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { isEmptyObject } from 'vs/bAse/common/types';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export interfAce ISeArchHistoryService {
	reAdonly _serviceBrAnd: undefined;
	onDidCleArHistory: Event<void>;
	cleArHistory(): void;
	loAd(): ISeArchHistoryVAlues;
	sAve(history: ISeArchHistoryVAlues): void;
}

export const ISeArchHistoryService = creAteDecorAtor<ISeArchHistoryService>('seArchHistoryService');

export interfAce ISeArchHistoryVAlues {
	seArch?: string[];
	replAce?: string[];
	include?: string[];
	exclude?: string[];
}

export clAss SeArchHistoryService implements ISeArchHistoryService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic reAdonly SEARCH_HISTORY_KEY = 'workbench.seArch.history';

	privAte reAdonly _onDidCleArHistory = new Emitter<void>();
	reAdonly onDidCleArHistory: Event<void> = this._onDidCleArHistory.event;

	constructor(
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService
	) { }

	cleArHistory(): void {
		this.storAgeService.remove(SeArchHistoryService.SEARCH_HISTORY_KEY, StorAgeScope.WORKSPACE);
		this._onDidCleArHistory.fire();
	}

	loAd(): ISeArchHistoryVAlues {
		let result: ISeArchHistoryVAlues | undefined;
		const rAw = this.storAgeService.get(SeArchHistoryService.SEARCH_HISTORY_KEY, StorAgeScope.WORKSPACE);

		if (rAw) {
			try {
				result = JSON.pArse(rAw);
			} cAtch (e) {
				// InvAlid dAtA
			}
		}

		return result || {};
	}

	sAve(history: ISeArchHistoryVAlues): void {
		if (isEmptyObject(history)) {
			this.storAgeService.remove(SeArchHistoryService.SEARCH_HISTORY_KEY, StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.store(SeArchHistoryService.SEARCH_HISTORY_KEY, JSON.stringify(history), StorAgeScope.WORKSPACE);
		}
	}
}
