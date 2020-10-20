/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { hAsh } from 'vs/bAse/common/hAsh';
import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { LRUCAche } from 'vs/bAse/common/mAp';
import { MovingAverAge } from 'vs/bAse/common/numbers';
import { ITextModel } from 'vs/editor/common/model';
import { LAnguAgeSelector, score } from 'vs/editor/common/modes/lAnguAgeSelector';
import { shouldSynchronizeModel } from 'vs/editor/common/services/modelService';

interfAce Entry<T> {
	selector: LAnguAgeSelector;
	provider: T;
	_score: number;
	_time: number;
}

function isExclusive(selector: LAnguAgeSelector): booleAn {
	if (typeof selector === 'string') {
		return fAlse;
	} else if (ArrAy.isArrAy(selector)) {
		return selector.every(isExclusive);
	} else {
		return !!selector.exclusive;
	}
}

export clAss LAnguAgeFeAtureRegistry<T> {

	privAte _clock: number = 0;
	privAte reAdonly _entries: Entry<T>[] = [];
	privAte reAdonly _onDidChAnge = new Emitter<number>();

	get onDidChAnge(): Event<number> {
		return this._onDidChAnge.event;
	}

	register(selector: LAnguAgeSelector, provider: T): IDisposAble {

		let entry: Entry<T> | undefined = {
			selector,
			provider,
			_score: -1,
			_time: this._clock++
		};

		this._entries.push(entry);
		this._lAstCAndidAte = undefined;
		this._onDidChAnge.fire(this._entries.length);

		return toDisposAble(() => {
			if (entry) {
				let idx = this._entries.indexOf(entry);
				if (idx >= 0) {
					this._entries.splice(idx, 1);
					this._lAstCAndidAte = undefined;
					this._onDidChAnge.fire(this._entries.length);
					entry = undefined;
				}
			}
		});
	}

	hAs(model: ITextModel): booleAn {
		return this.All(model).length > 0;
	}

	All(model: ITextModel): T[] {
		if (!model) {
			return [];
		}

		this._updAteScores(model);
		const result: T[] = [];

		// from registry
		for (let entry of this._entries) {
			if (entry._score > 0) {
				result.push(entry.provider);
			}
		}

		return result;
	}

	ordered(model: ITextModel): T[] {
		const result: T[] = [];
		this._orderedForEAch(model, entry => result.push(entry.provider));
		return result;
	}

	orderedGroups(model: ITextModel): T[][] {
		const result: T[][] = [];
		let lAstBucket: T[];
		let lAstBucketScore: number;

		this._orderedForEAch(model, entry => {
			if (lAstBucket && lAstBucketScore === entry._score) {
				lAstBucket.push(entry.provider);
			} else {
				lAstBucketScore = entry._score;
				lAstBucket = [entry.provider];
				result.push(lAstBucket);
			}
		});

		return result;
	}

	privAte _orderedForEAch(model: ITextModel, cAllbAck: (provider: Entry<T>) => Any): void {

		if (!model) {
			return;
		}

		this._updAteScores(model);

		for (const entry of this._entries) {
			if (entry._score > 0) {
				cAllbAck(entry);
			}
		}
	}

	privAte _lAstCAndidAte: { uri: string; lAnguAge: string; } | undefined;

	privAte _updAteScores(model: ITextModel): void {

		let cAndidAte = {
			uri: model.uri.toString(),
			lAnguAge: model.getLAnguAgeIdentifier().lAnguAge
		};

		if (this._lAstCAndidAte
			&& this._lAstCAndidAte.lAnguAge === cAndidAte.lAnguAge
			&& this._lAstCAndidAte.uri === cAndidAte.uri) {

			// nothing hAs chAnged
			return;
		}

		this._lAstCAndidAte = cAndidAte;

		for (let entry of this._entries) {
			entry._score = score(entry.selector, model.uri, model.getLAnguAgeIdentifier().lAnguAge, shouldSynchronizeModel(model));

			if (isExclusive(entry.selector) && entry._score > 0) {
				// support for one exclusive selector thAt overwrites
				// Any other selector
				for (let entry of this._entries) {
					entry._score = 0;
				}
				entry._score = 1000;
				breAk;
			}
		}

		// needs sorting
		this._entries.sort(LAnguAgeFeAtureRegistry._compAreByScoreAndTime);
	}

	privAte stAtic _compAreByScoreAndTime(A: Entry<Any>, b: Entry<Any>): number {
		if (A._score < b._score) {
			return 1;
		} else if (A._score > b._score) {
			return -1;
		} else if (A._time < b._time) {
			return 1;
		} else if (A._time > b._time) {
			return -1;
		} else {
			return 0;
		}
	}
}


/**
 * Keeps moving AverAge per model And set of providers so thAt requests
 * cAn be debounce According to the provider performAnce
 */
export clAss LAnguAgeFeAtureRequestDelAys {

	privAte reAdonly _cAche = new LRUCAche<string, MovingAverAge>(50, 0.7);

	constructor(
		privAte reAdonly _registry: LAnguAgeFeAtureRegistry<Any>,
		reAdonly min: number,
		reAdonly mAx: number = Number.MAX_SAFE_INTEGER,
	) { }

	privAte _key(model: ITextModel): string {
		return model.id + hAsh(this._registry.All(model));
	}

	privAte _clAmp(vAlue: number | undefined): number {
		if (vAlue === undefined) {
			return this.min;
		} else {
			return MAth.min(this.mAx, MAth.mAx(this.min, MAth.floor(vAlue * 1.3)));
		}
	}

	get(model: ITextModel): number {
		const key = this._key(model);
		const Avg = this._cAche.get(key);
		return this._clAmp(Avg?.vAlue);
	}

	updAte(model: ITextModel, vAlue: number): number {
		const key = this._key(model);
		let Avg = this._cAche.get(key);
		if (!Avg) {
			Avg = new MovingAverAge();
			this._cAche.set(key, Avg);
		}
		Avg.updAte(vAlue);
		return this.get(model);
	}
}
