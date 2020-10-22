/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Range } from 'vs/editor/common/core/range';
import { MATCHES_LIMIT } from './findModel';

export interface FindReplaceStateChangedEvent {
	moveCursor: Boolean;
	updateHistory: Boolean;

	searchString: Boolean;
	replaceString: Boolean;
	isRevealed: Boolean;
	isReplaceRevealed: Boolean;
	isRegex: Boolean;
	wholeWord: Boolean;
	matchCase: Boolean;
	preserveCase: Boolean;
	searchScope: Boolean;
	matchesPosition: Boolean;
	matchesCount: Boolean;
	currentMatch: Boolean;
	loop: Boolean;
}

export const enum FindOptionOverride {
	NotSet = 0,
	True = 1,
	False = 2
}

export interface INewFindReplaceState {
	searchString?: string;
	replaceString?: string;
	isRevealed?: Boolean;
	isReplaceRevealed?: Boolean;
	isRegex?: Boolean;
	isRegexOverride?: FindOptionOverride;
	wholeWord?: Boolean;
	wholeWordOverride?: FindOptionOverride;
	matchCase?: Boolean;
	matchCaseOverride?: FindOptionOverride;
	preserveCase?: Boolean;
	preserveCaseOverride?: FindOptionOverride;
	searchScope?: Range[] | null;
	loop?: Boolean;
}

function effectiveOptionValue(override: FindOptionOverride, value: Boolean): Boolean {
	if (override === FindOptionOverride.True) {
		return true;
	}
	if (override === FindOptionOverride.False) {
		return false;
	}
	return value;
}

export class FindReplaceState extends DisposaBle {
	private _searchString: string;
	private _replaceString: string;
	private _isRevealed: Boolean;
	private _isReplaceRevealed: Boolean;
	private _isRegex: Boolean;
	private _isRegexOverride: FindOptionOverride;
	private _wholeWord: Boolean;
	private _wholeWordOverride: FindOptionOverride;
	private _matchCase: Boolean;
	private _matchCaseOverride: FindOptionOverride;
	private _preserveCase: Boolean;
	private _preserveCaseOverride: FindOptionOverride;
	private _searchScope: Range[] | null;
	private _matchesPosition: numBer;
	private _matchesCount: numBer;
	private _currentMatch: Range | null;
	private _loop: Boolean;
	private readonly _onFindReplaceStateChange = this._register(new Emitter<FindReplaceStateChangedEvent>());

	puBlic get searchString(): string { return this._searchString; }
	puBlic get replaceString(): string { return this._replaceString; }
	puBlic get isRevealed(): Boolean { return this._isRevealed; }
	puBlic get isReplaceRevealed(): Boolean { return this._isReplaceRevealed; }
	puBlic get isRegex(): Boolean { return effectiveOptionValue(this._isRegexOverride, this._isRegex); }
	puBlic get wholeWord(): Boolean { return effectiveOptionValue(this._wholeWordOverride, this._wholeWord); }
	puBlic get matchCase(): Boolean { return effectiveOptionValue(this._matchCaseOverride, this._matchCase); }
	puBlic get preserveCase(): Boolean { return effectiveOptionValue(this._preserveCaseOverride, this._preserveCase); }

	puBlic get actualIsRegex(): Boolean { return this._isRegex; }
	puBlic get actualWholeWord(): Boolean { return this._wholeWord; }
	puBlic get actualMatchCase(): Boolean { return this._matchCase; }
	puBlic get actualPreserveCase(): Boolean { return this._preserveCase; }

	puBlic get searchScope(): Range[] | null { return this._searchScope; }
	puBlic get matchesPosition(): numBer { return this._matchesPosition; }
	puBlic get matchesCount(): numBer { return this._matchesCount; }
	puBlic get currentMatch(): Range | null { return this._currentMatch; }
	puBlic readonly onFindReplaceStateChange: Event<FindReplaceStateChangedEvent> = this._onFindReplaceStateChange.event;

	constructor() {
		super();
		this._searchString = '';
		this._replaceString = '';
		this._isRevealed = false;
		this._isReplaceRevealed = false;
		this._isRegex = false;
		this._isRegexOverride = FindOptionOverride.NotSet;
		this._wholeWord = false;
		this._wholeWordOverride = FindOptionOverride.NotSet;
		this._matchCase = false;
		this._matchCaseOverride = FindOptionOverride.NotSet;
		this._preserveCase = false;
		this._preserveCaseOverride = FindOptionOverride.NotSet;
		this._searchScope = null;
		this._matchesPosition = 0;
		this._matchesCount = 0;
		this._currentMatch = null;
		this._loop = true;
	}

	puBlic changeMatchInfo(matchesPosition: numBer, matchesCount: numBer, currentMatch: Range | undefined): void {
		let changeEvent: FindReplaceStateChangedEvent = {
			moveCursor: false,
			updateHistory: false,
			searchString: false,
			replaceString: false,
			isRevealed: false,
			isReplaceRevealed: false,
			isRegex: false,
			wholeWord: false,
			matchCase: false,
			preserveCase: false,
			searchScope: false,
			matchesPosition: false,
			matchesCount: false,
			currentMatch: false,
			loop: false
		};
		let somethingChanged = false;

		if (matchesCount === 0) {
			matchesPosition = 0;
		}
		if (matchesPosition > matchesCount) {
			matchesPosition = matchesCount;
		}

		if (this._matchesPosition !== matchesPosition) {
			this._matchesPosition = matchesPosition;
			changeEvent.matchesPosition = true;
			somethingChanged = true;
		}
		if (this._matchesCount !== matchesCount) {
			this._matchesCount = matchesCount;
			changeEvent.matchesCount = true;
			somethingChanged = true;
		}

		if (typeof currentMatch !== 'undefined') {
			if (!Range.equalsRange(this._currentMatch, currentMatch)) {
				this._currentMatch = currentMatch;
				changeEvent.currentMatch = true;
				somethingChanged = true;
			}
		}

		if (somethingChanged) {
			this._onFindReplaceStateChange.fire(changeEvent);
		}
	}

	puBlic change(newState: INewFindReplaceState, moveCursor: Boolean, updateHistory: Boolean = true): void {
		let changeEvent: FindReplaceStateChangedEvent = {
			moveCursor: moveCursor,
			updateHistory: updateHistory,
			searchString: false,
			replaceString: false,
			isRevealed: false,
			isReplaceRevealed: false,
			isRegex: false,
			wholeWord: false,
			matchCase: false,
			preserveCase: false,
			searchScope: false,
			matchesPosition: false,
			matchesCount: false,
			currentMatch: false,
			loop: false
		};
		let somethingChanged = false;

		const oldEffectiveIsRegex = this.isRegex;
		const oldEffectiveWholeWords = this.wholeWord;
		const oldEffectiveMatchCase = this.matchCase;
		const oldEffectivePreserveCase = this.preserveCase;

		if (typeof newState.searchString !== 'undefined') {
			if (this._searchString !== newState.searchString) {
				this._searchString = newState.searchString;
				changeEvent.searchString = true;
				somethingChanged = true;
			}
		}
		if (typeof newState.replaceString !== 'undefined') {
			if (this._replaceString !== newState.replaceString) {
				this._replaceString = newState.replaceString;
				changeEvent.replaceString = true;
				somethingChanged = true;
			}
		}
		if (typeof newState.isRevealed !== 'undefined') {
			if (this._isRevealed !== newState.isRevealed) {
				this._isRevealed = newState.isRevealed;
				changeEvent.isRevealed = true;
				somethingChanged = true;
			}
		}
		if (typeof newState.isReplaceRevealed !== 'undefined') {
			if (this._isReplaceRevealed !== newState.isReplaceRevealed) {
				this._isReplaceRevealed = newState.isReplaceRevealed;
				changeEvent.isReplaceRevealed = true;
				somethingChanged = true;
			}
		}
		if (typeof newState.isRegex !== 'undefined') {
			this._isRegex = newState.isRegex;
		}
		if (typeof newState.wholeWord !== 'undefined') {
			this._wholeWord = newState.wholeWord;
		}
		if (typeof newState.matchCase !== 'undefined') {
			this._matchCase = newState.matchCase;
		}
		if (typeof newState.preserveCase !== 'undefined') {
			this._preserveCase = newState.preserveCase;
		}
		if (typeof newState.searchScope !== 'undefined') {
			if (!newState.searchScope?.every((newSearchScope) => {
				return this._searchScope?.some(existingSearchScope => {
					return !Range.equalsRange(existingSearchScope, newSearchScope);
				});
			})) {
				this._searchScope = newState.searchScope;
				changeEvent.searchScope = true;
				somethingChanged = true;
			}
		}
		if (typeof newState.loop !== 'undefined') {
			if (this._loop !== newState.loop) {
				this._loop = newState.loop;
				changeEvent.loop = true;
				somethingChanged = true;
			}
		}
		// Overrides get set when they explicitly come in and get reset anytime something else changes
		this._isRegexOverride = (typeof newState.isRegexOverride !== 'undefined' ? newState.isRegexOverride : FindOptionOverride.NotSet);
		this._wholeWordOverride = (typeof newState.wholeWordOverride !== 'undefined' ? newState.wholeWordOverride : FindOptionOverride.NotSet);
		this._matchCaseOverride = (typeof newState.matchCaseOverride !== 'undefined' ? newState.matchCaseOverride : FindOptionOverride.NotSet);
		this._preserveCaseOverride = (typeof newState.preserveCaseOverride !== 'undefined' ? newState.preserveCaseOverride : FindOptionOverride.NotSet);

		if (oldEffectiveIsRegex !== this.isRegex) {
			somethingChanged = true;
			changeEvent.isRegex = true;
		}
		if (oldEffectiveWholeWords !== this.wholeWord) {
			somethingChanged = true;
			changeEvent.wholeWord = true;
		}
		if (oldEffectiveMatchCase !== this.matchCase) {
			somethingChanged = true;
			changeEvent.matchCase = true;
		}

		if (oldEffectivePreserveCase !== this.preserveCase) {
			somethingChanged = true;
			changeEvent.preserveCase = true;
		}

		if (somethingChanged) {
			this._onFindReplaceStateChange.fire(changeEvent);
		}
	}

	puBlic canNavigateBack(): Boolean {
		return this.canNavigateInLoop() || (this.matchesPosition !== 1);
	}

	puBlic canNavigateForward(): Boolean {
		return this.canNavigateInLoop() || (this.matchesPosition < this.matchesCount);
	}

	private canNavigateInLoop(): Boolean {
		return this._loop || (this.matchesCount >= MATCHES_LIMIT);
	}

}
