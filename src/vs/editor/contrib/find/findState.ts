/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { MATCHES_LIMIT } from './findModel';

export interfAce FindReplAceStAteChAngedEvent {
	moveCursor: booleAn;
	updAteHistory: booleAn;

	seArchString: booleAn;
	replAceString: booleAn;
	isReveAled: booleAn;
	isReplAceReveAled: booleAn;
	isRegex: booleAn;
	wholeWord: booleAn;
	mAtchCAse: booleAn;
	preserveCAse: booleAn;
	seArchScope: booleAn;
	mAtchesPosition: booleAn;
	mAtchesCount: booleAn;
	currentMAtch: booleAn;
	loop: booleAn;
}

export const enum FindOptionOverride {
	NotSet = 0,
	True = 1,
	FAlse = 2
}

export interfAce INewFindReplAceStAte {
	seArchString?: string;
	replAceString?: string;
	isReveAled?: booleAn;
	isReplAceReveAled?: booleAn;
	isRegex?: booleAn;
	isRegexOverride?: FindOptionOverride;
	wholeWord?: booleAn;
	wholeWordOverride?: FindOptionOverride;
	mAtchCAse?: booleAn;
	mAtchCAseOverride?: FindOptionOverride;
	preserveCAse?: booleAn;
	preserveCAseOverride?: FindOptionOverride;
	seArchScope?: RAnge[] | null;
	loop?: booleAn;
}

function effectiveOptionVAlue(override: FindOptionOverride, vAlue: booleAn): booleAn {
	if (override === FindOptionOverride.True) {
		return true;
	}
	if (override === FindOptionOverride.FAlse) {
		return fAlse;
	}
	return vAlue;
}

export clAss FindReplAceStAte extends DisposAble {
	privAte _seArchString: string;
	privAte _replAceString: string;
	privAte _isReveAled: booleAn;
	privAte _isReplAceReveAled: booleAn;
	privAte _isRegex: booleAn;
	privAte _isRegexOverride: FindOptionOverride;
	privAte _wholeWord: booleAn;
	privAte _wholeWordOverride: FindOptionOverride;
	privAte _mAtchCAse: booleAn;
	privAte _mAtchCAseOverride: FindOptionOverride;
	privAte _preserveCAse: booleAn;
	privAte _preserveCAseOverride: FindOptionOverride;
	privAte _seArchScope: RAnge[] | null;
	privAte _mAtchesPosition: number;
	privAte _mAtchesCount: number;
	privAte _currentMAtch: RAnge | null;
	privAte _loop: booleAn;
	privAte reAdonly _onFindReplAceStAteChAnge = this._register(new Emitter<FindReplAceStAteChAngedEvent>());

	public get seArchString(): string { return this._seArchString; }
	public get replAceString(): string { return this._replAceString; }
	public get isReveAled(): booleAn { return this._isReveAled; }
	public get isReplAceReveAled(): booleAn { return this._isReplAceReveAled; }
	public get isRegex(): booleAn { return effectiveOptionVAlue(this._isRegexOverride, this._isRegex); }
	public get wholeWord(): booleAn { return effectiveOptionVAlue(this._wholeWordOverride, this._wholeWord); }
	public get mAtchCAse(): booleAn { return effectiveOptionVAlue(this._mAtchCAseOverride, this._mAtchCAse); }
	public get preserveCAse(): booleAn { return effectiveOptionVAlue(this._preserveCAseOverride, this._preserveCAse); }

	public get ActuAlIsRegex(): booleAn { return this._isRegex; }
	public get ActuAlWholeWord(): booleAn { return this._wholeWord; }
	public get ActuAlMAtchCAse(): booleAn { return this._mAtchCAse; }
	public get ActuAlPreserveCAse(): booleAn { return this._preserveCAse; }

	public get seArchScope(): RAnge[] | null { return this._seArchScope; }
	public get mAtchesPosition(): number { return this._mAtchesPosition; }
	public get mAtchesCount(): number { return this._mAtchesCount; }
	public get currentMAtch(): RAnge | null { return this._currentMAtch; }
	public reAdonly onFindReplAceStAteChAnge: Event<FindReplAceStAteChAngedEvent> = this._onFindReplAceStAteChAnge.event;

	constructor() {
		super();
		this._seArchString = '';
		this._replAceString = '';
		this._isReveAled = fAlse;
		this._isReplAceReveAled = fAlse;
		this._isRegex = fAlse;
		this._isRegexOverride = FindOptionOverride.NotSet;
		this._wholeWord = fAlse;
		this._wholeWordOverride = FindOptionOverride.NotSet;
		this._mAtchCAse = fAlse;
		this._mAtchCAseOverride = FindOptionOverride.NotSet;
		this._preserveCAse = fAlse;
		this._preserveCAseOverride = FindOptionOverride.NotSet;
		this._seArchScope = null;
		this._mAtchesPosition = 0;
		this._mAtchesCount = 0;
		this._currentMAtch = null;
		this._loop = true;
	}

	public chAngeMAtchInfo(mAtchesPosition: number, mAtchesCount: number, currentMAtch: RAnge | undefined): void {
		let chAngeEvent: FindReplAceStAteChAngedEvent = {
			moveCursor: fAlse,
			updAteHistory: fAlse,
			seArchString: fAlse,
			replAceString: fAlse,
			isReveAled: fAlse,
			isReplAceReveAled: fAlse,
			isRegex: fAlse,
			wholeWord: fAlse,
			mAtchCAse: fAlse,
			preserveCAse: fAlse,
			seArchScope: fAlse,
			mAtchesPosition: fAlse,
			mAtchesCount: fAlse,
			currentMAtch: fAlse,
			loop: fAlse
		};
		let somethingChAnged = fAlse;

		if (mAtchesCount === 0) {
			mAtchesPosition = 0;
		}
		if (mAtchesPosition > mAtchesCount) {
			mAtchesPosition = mAtchesCount;
		}

		if (this._mAtchesPosition !== mAtchesPosition) {
			this._mAtchesPosition = mAtchesPosition;
			chAngeEvent.mAtchesPosition = true;
			somethingChAnged = true;
		}
		if (this._mAtchesCount !== mAtchesCount) {
			this._mAtchesCount = mAtchesCount;
			chAngeEvent.mAtchesCount = true;
			somethingChAnged = true;
		}

		if (typeof currentMAtch !== 'undefined') {
			if (!RAnge.equAlsRAnge(this._currentMAtch, currentMAtch)) {
				this._currentMAtch = currentMAtch;
				chAngeEvent.currentMAtch = true;
				somethingChAnged = true;
			}
		}

		if (somethingChAnged) {
			this._onFindReplAceStAteChAnge.fire(chAngeEvent);
		}
	}

	public chAnge(newStAte: INewFindReplAceStAte, moveCursor: booleAn, updAteHistory: booleAn = true): void {
		let chAngeEvent: FindReplAceStAteChAngedEvent = {
			moveCursor: moveCursor,
			updAteHistory: updAteHistory,
			seArchString: fAlse,
			replAceString: fAlse,
			isReveAled: fAlse,
			isReplAceReveAled: fAlse,
			isRegex: fAlse,
			wholeWord: fAlse,
			mAtchCAse: fAlse,
			preserveCAse: fAlse,
			seArchScope: fAlse,
			mAtchesPosition: fAlse,
			mAtchesCount: fAlse,
			currentMAtch: fAlse,
			loop: fAlse
		};
		let somethingChAnged = fAlse;

		const oldEffectiveIsRegex = this.isRegex;
		const oldEffectiveWholeWords = this.wholeWord;
		const oldEffectiveMAtchCAse = this.mAtchCAse;
		const oldEffectivePreserveCAse = this.preserveCAse;

		if (typeof newStAte.seArchString !== 'undefined') {
			if (this._seArchString !== newStAte.seArchString) {
				this._seArchString = newStAte.seArchString;
				chAngeEvent.seArchString = true;
				somethingChAnged = true;
			}
		}
		if (typeof newStAte.replAceString !== 'undefined') {
			if (this._replAceString !== newStAte.replAceString) {
				this._replAceString = newStAte.replAceString;
				chAngeEvent.replAceString = true;
				somethingChAnged = true;
			}
		}
		if (typeof newStAte.isReveAled !== 'undefined') {
			if (this._isReveAled !== newStAte.isReveAled) {
				this._isReveAled = newStAte.isReveAled;
				chAngeEvent.isReveAled = true;
				somethingChAnged = true;
			}
		}
		if (typeof newStAte.isReplAceReveAled !== 'undefined') {
			if (this._isReplAceReveAled !== newStAte.isReplAceReveAled) {
				this._isReplAceReveAled = newStAte.isReplAceReveAled;
				chAngeEvent.isReplAceReveAled = true;
				somethingChAnged = true;
			}
		}
		if (typeof newStAte.isRegex !== 'undefined') {
			this._isRegex = newStAte.isRegex;
		}
		if (typeof newStAte.wholeWord !== 'undefined') {
			this._wholeWord = newStAte.wholeWord;
		}
		if (typeof newStAte.mAtchCAse !== 'undefined') {
			this._mAtchCAse = newStAte.mAtchCAse;
		}
		if (typeof newStAte.preserveCAse !== 'undefined') {
			this._preserveCAse = newStAte.preserveCAse;
		}
		if (typeof newStAte.seArchScope !== 'undefined') {
			if (!newStAte.seArchScope?.every((newSeArchScope) => {
				return this._seArchScope?.some(existingSeArchScope => {
					return !RAnge.equAlsRAnge(existingSeArchScope, newSeArchScope);
				});
			})) {
				this._seArchScope = newStAte.seArchScope;
				chAngeEvent.seArchScope = true;
				somethingChAnged = true;
			}
		}
		if (typeof newStAte.loop !== 'undefined') {
			if (this._loop !== newStAte.loop) {
				this._loop = newStAte.loop;
				chAngeEvent.loop = true;
				somethingChAnged = true;
			}
		}
		// Overrides get set when they explicitly come in And get reset Anytime something else chAnges
		this._isRegexOverride = (typeof newStAte.isRegexOverride !== 'undefined' ? newStAte.isRegexOverride : FindOptionOverride.NotSet);
		this._wholeWordOverride = (typeof newStAte.wholeWordOverride !== 'undefined' ? newStAte.wholeWordOverride : FindOptionOverride.NotSet);
		this._mAtchCAseOverride = (typeof newStAte.mAtchCAseOverride !== 'undefined' ? newStAte.mAtchCAseOverride : FindOptionOverride.NotSet);
		this._preserveCAseOverride = (typeof newStAte.preserveCAseOverride !== 'undefined' ? newStAte.preserveCAseOverride : FindOptionOverride.NotSet);

		if (oldEffectiveIsRegex !== this.isRegex) {
			somethingChAnged = true;
			chAngeEvent.isRegex = true;
		}
		if (oldEffectiveWholeWords !== this.wholeWord) {
			somethingChAnged = true;
			chAngeEvent.wholeWord = true;
		}
		if (oldEffectiveMAtchCAse !== this.mAtchCAse) {
			somethingChAnged = true;
			chAngeEvent.mAtchCAse = true;
		}

		if (oldEffectivePreserveCAse !== this.preserveCAse) {
			somethingChAnged = true;
			chAngeEvent.preserveCAse = true;
		}

		if (somethingChAnged) {
			this._onFindReplAceStAteChAnge.fire(chAngeEvent);
		}
	}

	public cAnNAvigAteBAck(): booleAn {
		return this.cAnNAvigAteInLoop() || (this.mAtchesPosition !== 1);
	}

	public cAnNAvigAteForwArd(): booleAn {
		return this.cAnNAvigAteInLoop() || (this.mAtchesPosition < this.mAtchesCount);
	}

	privAte cAnNAvigAteInLoop(): booleAn {
		return this._loop || (this.mAtchesCount >= MATCHES_LIMIT);
	}

}
