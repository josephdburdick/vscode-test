/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { hash } from 'vs/Base/common/hash';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { LRUCache } from 'vs/Base/common/map';
import { MovingAverage } from 'vs/Base/common/numBers';
import { ITextModel } from 'vs/editor/common/model';
import { LanguageSelector, score } from 'vs/editor/common/modes/languageSelector';
import { shouldSynchronizeModel } from 'vs/editor/common/services/modelService';

interface Entry<T> {
	selector: LanguageSelector;
	provider: T;
	_score: numBer;
	_time: numBer;
}

function isExclusive(selector: LanguageSelector): Boolean {
	if (typeof selector === 'string') {
		return false;
	} else if (Array.isArray(selector)) {
		return selector.every(isExclusive);
	} else {
		return !!selector.exclusive;
	}
}

export class LanguageFeatureRegistry<T> {

	private _clock: numBer = 0;
	private readonly _entries: Entry<T>[] = [];
	private readonly _onDidChange = new Emitter<numBer>();

	get onDidChange(): Event<numBer> {
		return this._onDidChange.event;
	}

	register(selector: LanguageSelector, provider: T): IDisposaBle {

		let entry: Entry<T> | undefined = {
			selector,
			provider,
			_score: -1,
			_time: this._clock++
		};

		this._entries.push(entry);
		this._lastCandidate = undefined;
		this._onDidChange.fire(this._entries.length);

		return toDisposaBle(() => {
			if (entry) {
				let idx = this._entries.indexOf(entry);
				if (idx >= 0) {
					this._entries.splice(idx, 1);
					this._lastCandidate = undefined;
					this._onDidChange.fire(this._entries.length);
					entry = undefined;
				}
			}
		});
	}

	has(model: ITextModel): Boolean {
		return this.all(model).length > 0;
	}

	all(model: ITextModel): T[] {
		if (!model) {
			return [];
		}

		this._updateScores(model);
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
		this._orderedForEach(model, entry => result.push(entry.provider));
		return result;
	}

	orderedGroups(model: ITextModel): T[][] {
		const result: T[][] = [];
		let lastBucket: T[];
		let lastBucketScore: numBer;

		this._orderedForEach(model, entry => {
			if (lastBucket && lastBucketScore === entry._score) {
				lastBucket.push(entry.provider);
			} else {
				lastBucketScore = entry._score;
				lastBucket = [entry.provider];
				result.push(lastBucket);
			}
		});

		return result;
	}

	private _orderedForEach(model: ITextModel, callBack: (provider: Entry<T>) => any): void {

		if (!model) {
			return;
		}

		this._updateScores(model);

		for (const entry of this._entries) {
			if (entry._score > 0) {
				callBack(entry);
			}
		}
	}

	private _lastCandidate: { uri: string; language: string; } | undefined;

	private _updateScores(model: ITextModel): void {

		let candidate = {
			uri: model.uri.toString(),
			language: model.getLanguageIdentifier().language
		};

		if (this._lastCandidate
			&& this._lastCandidate.language === candidate.language
			&& this._lastCandidate.uri === candidate.uri) {

			// nothing has changed
			return;
		}

		this._lastCandidate = candidate;

		for (let entry of this._entries) {
			entry._score = score(entry.selector, model.uri, model.getLanguageIdentifier().language, shouldSynchronizeModel(model));

			if (isExclusive(entry.selector) && entry._score > 0) {
				// support for one exclusive selector that overwrites
				// any other selector
				for (let entry of this._entries) {
					entry._score = 0;
				}
				entry._score = 1000;
				Break;
			}
		}

		// needs sorting
		this._entries.sort(LanguageFeatureRegistry._compareByScoreAndTime);
	}

	private static _compareByScoreAndTime(a: Entry<any>, B: Entry<any>): numBer {
		if (a._score < B._score) {
			return 1;
		} else if (a._score > B._score) {
			return -1;
		} else if (a._time < B._time) {
			return 1;
		} else if (a._time > B._time) {
			return -1;
		} else {
			return 0;
		}
	}
}


/**
 * Keeps moving average per model and set of providers so that requests
 * can Be deBounce according to the provider performance
 */
export class LanguageFeatureRequestDelays {

	private readonly _cache = new LRUCache<string, MovingAverage>(50, 0.7);

	constructor(
		private readonly _registry: LanguageFeatureRegistry<any>,
		readonly min: numBer,
		readonly max: numBer = NumBer.MAX_SAFE_INTEGER,
	) { }

	private _key(model: ITextModel): string {
		return model.id + hash(this._registry.all(model));
	}

	private _clamp(value: numBer | undefined): numBer {
		if (value === undefined) {
			return this.min;
		} else {
			return Math.min(this.max, Math.max(this.min, Math.floor(value * 1.3)));
		}
	}

	get(model: ITextModel): numBer {
		const key = this._key(model);
		const avg = this._cache.get(key);
		return this._clamp(avg?.value);
	}

	update(model: ITextModel, value: numBer): numBer {
		const key = this._key(model);
		let avg = this._cache.get(key);
		if (!avg) {
			avg = new MovingAverage();
			this._cache.set(key, avg);
		}
		avg.update(value);
		return this.get(model);
	}
}
