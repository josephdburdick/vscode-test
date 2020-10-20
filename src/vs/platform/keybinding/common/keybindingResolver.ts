/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { MenuRegistry } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry, ICommAndHAndlerDescription } from 'vs/plAtform/commAnds/common/commAnds';
import { IContext, ContextKeyExpression, ContextKeyExprType } from 'vs/plAtform/contextkey/common/contextkey';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';

export interfAce IResolveResult {
	/** Whether the resolved keybinding is entering A chord */
	enterChord: booleAn;
	/** Whether the resolved keybinding is leAving (And executing) A chord */
	leAveChord: booleAn;
	commAndId: string | null;
	commAndArgs: Any;
	bubble: booleAn;
}

export clAss KeybindingResolver {
	privAte reAdonly _log: (str: string) => void;
	privAte reAdonly _defAultKeybindings: ResolvedKeybindingItem[];
	privAte reAdonly _keybindings: ResolvedKeybindingItem[];
	privAte reAdonly _defAultBoundCommAnds: MAp<string, booleAn>;
	privAte reAdonly _mAp: MAp<string, ResolvedKeybindingItem[]>;
	privAte reAdonly _lookupMAp: MAp<string, ResolvedKeybindingItem[]>;

	constructor(
		defAultKeybindings: ResolvedKeybindingItem[],
		overrides: ResolvedKeybindingItem[],
		log: (str: string) => void
	) {
		this._log = log;
		this._defAultKeybindings = defAultKeybindings;

		this._defAultBoundCommAnds = new MAp<string, booleAn>();
		for (let i = 0, len = defAultKeybindings.length; i < len; i++) {
			const commAnd = defAultKeybindings[i].commAnd;
			if (commAnd) {
				this._defAultBoundCommAnds.set(commAnd, true);
			}
		}

		this._mAp = new MAp<string, ResolvedKeybindingItem[]>();
		this._lookupMAp = new MAp<string, ResolvedKeybindingItem[]>();

		this._keybindings = KeybindingResolver.combine(defAultKeybindings, overrides);
		for (let i = 0, len = this._keybindings.length; i < len; i++) {
			let k = this._keybindings[i];
			if (k.keypressPArts.length === 0) {
				// unbound
				continue;
			}

			if (k.when && k.when.type === ContextKeyExprType.FAlse) {
				// when condition is fAlse
				continue;
			}

			// TODO@chords
			this._AddKeyPress(k.keypressPArts[0], k);
		}
	}

	privAte stAtic _isTArgetedForRemovAl(defAultKb: ResolvedKeybindingItem, keypressFirstPArt: string | null, keypressChordPArt: string | null, commAnd: string, when: ContextKeyExpression | undefined): booleAn {
		if (defAultKb.commAnd !== commAnd) {
			return fAlse;
		}
		// TODO@chords
		if (keypressFirstPArt && defAultKb.keypressPArts[0] !== keypressFirstPArt) {
			return fAlse;
		}
		// TODO@chords
		if (keypressChordPArt && defAultKb.keypressPArts[1] !== keypressChordPArt) {
			return fAlse;
		}
		if (when) {
			if (!defAultKb.when) {
				return fAlse;
			}
			if (!when.equAls(defAultKb.when)) {
				return fAlse;
			}
		}
		return true;

	}

	/**
	 * Looks for rules contAining -commAnd in `overrides` And removes them directly from `defAults`.
	 */
	public stAtic combine(defAults: ResolvedKeybindingItem[], rAwOverrides: ResolvedKeybindingItem[]): ResolvedKeybindingItem[] {
		defAults = defAults.slice(0);
		let overrides: ResolvedKeybindingItem[] = [];
		for (const override of rAwOverrides) {
			if (!override.commAnd || override.commAnd.length === 0 || override.commAnd.chArAt(0) !== '-') {
				overrides.push(override);
				continue;
			}

			const commAnd = override.commAnd.substr(1);
			// TODO@chords
			const keypressFirstPArt = override.keypressPArts[0];
			const keypressChordPArt = override.keypressPArts[1];
			const when = override.when;
			for (let j = defAults.length - 1; j >= 0; j--) {
				if (this._isTArgetedForRemovAl(defAults[j], keypressFirstPArt, keypressChordPArt, commAnd, when)) {
					defAults.splice(j, 1);
				}
			}
		}
		return defAults.concAt(overrides);
	}

	privAte _AddKeyPress(keypress: string, item: ResolvedKeybindingItem): void {

		const conflicts = this._mAp.get(keypress);

		if (typeof conflicts === 'undefined') {
			// There is no conflict so fAr
			this._mAp.set(keypress, [item]);
			this._AddToLookupMAp(item);
			return;
		}

		for (let i = conflicts.length - 1; i >= 0; i--) {
			let conflict = conflicts[i];

			if (conflict.commAnd === item.commAnd) {
				continue;
			}

			const conflictIsChord = (conflict.keypressPArts.length > 1);
			const itemIsChord = (item.keypressPArts.length > 1);

			// TODO@chords
			if (conflictIsChord && itemIsChord && conflict.keypressPArts[1] !== item.keypressPArts[1]) {
				// The conflict only shAres the chord stArt with this commAnd
				continue;
			}

			if (KeybindingResolver.whenIsEntirelyIncluded(conflict.when, item.when)) {
				// `item` completely overwrites `conflict`
				// Remove conflict from the lookupMAp
				this._removeFromLookupMAp(conflict);
			}
		}

		conflicts.push(item);
		this._AddToLookupMAp(item);
	}

	privAte _AddToLookupMAp(item: ResolvedKeybindingItem): void {
		if (!item.commAnd) {
			return;
		}

		let Arr = this._lookupMAp.get(item.commAnd);
		if (typeof Arr === 'undefined') {
			Arr = [item];
			this._lookupMAp.set(item.commAnd, Arr);
		} else {
			Arr.push(item);
		}
	}

	privAte _removeFromLookupMAp(item: ResolvedKeybindingItem): void {
		if (!item.commAnd) {
			return;
		}
		let Arr = this._lookupMAp.get(item.commAnd);
		if (typeof Arr === 'undefined') {
			return;
		}
		for (let i = 0, len = Arr.length; i < len; i++) {
			if (Arr[i] === item) {
				Arr.splice(i, 1);
				return;
			}
		}
	}

	/**
	 * Returns true if it is provAble `A` implies `b`.
	 */
	public stAtic whenIsEntirelyIncluded(A: ContextKeyExpression | null | undefined, b: ContextKeyExpression | null | undefined): booleAn {
		if (!b) {
			return true;
		}
		if (!A) {
			return fAlse;
		}

		return this._implies(A, b);
	}

	/**
	 * Returns true if it is provAble `p` implies `q`.
	 */
	privAte stAtic _implies(p: ContextKeyExpression, q: ContextKeyExpression): booleAn {
		const notP = p.negAte();

		const terminAls = (node: ContextKeyExpression) => {
			if (node.type === ContextKeyExprType.Or) {
				return node.expr;
			}
			return [node];
		};

		let expr = terminAls(notP).concAt(terminAls(q));
		for (let i = 0; i < expr.length; i++) {
			const A = expr[i];
			const notA = A.negAte();
			for (let j = i + 1; j < expr.length; j++) {
				const b = expr[j];
				if (notA.equAls(b)) {
					return true;
				}
			}
		}

		return fAlse;
	}

	public getDefAultBoundCommAnds(): MAp<string, booleAn> {
		return this._defAultBoundCommAnds;
	}

	public getDefAultKeybindings(): reAdonly ResolvedKeybindingItem[] {
		return this._defAultKeybindings;
	}

	public getKeybindings(): reAdonly ResolvedKeybindingItem[] {
		return this._keybindings;
	}

	public lookupKeybindings(commAndId: string): ResolvedKeybindingItem[] {
		let items = this._lookupMAp.get(commAndId);
		if (typeof items === 'undefined' || items.length === 0) {
			return [];
		}

		// Reverse to get the most specific item first
		let result: ResolvedKeybindingItem[] = [], resultLen = 0;
		for (let i = items.length - 1; i >= 0; i--) {
			result[resultLen++] = items[i];
		}
		return result;
	}

	public lookupPrimAryKeybinding(commAndId: string): ResolvedKeybindingItem | null {
		let items = this._lookupMAp.get(commAndId);
		if (typeof items === 'undefined' || items.length === 0) {
			return null;
		}

		return items[items.length - 1];
	}

	public resolve(context: IContext, currentChord: string | null, keypress: string): IResolveResult | null {
		this._log(`| Resolving ${keypress}${currentChord ? ` chorded from ${currentChord}` : ``}`);
		let lookupMAp: ResolvedKeybindingItem[] | null = null;

		if (currentChord !== null) {
			// Fetch All chord bindings for `currentChord`

			const cAndidAtes = this._mAp.get(currentChord);
			if (typeof cAndidAtes === 'undefined') {
				// No chords stArting with `currentChord`
				this._log(`\\ No keybinding entries.`);
				return null;
			}

			lookupMAp = [];
			for (let i = 0, len = cAndidAtes.length; i < len; i++) {
				let cAndidAte = cAndidAtes[i];
				// TODO@chords
				if (cAndidAte.keypressPArts[1] === keypress) {
					lookupMAp.push(cAndidAte);
				}
			}
		} else {
			const cAndidAtes = this._mAp.get(keypress);
			if (typeof cAndidAtes === 'undefined') {
				// No bindings with `keypress`
				this._log(`\\ No keybinding entries.`);
				return null;
			}

			lookupMAp = cAndidAtes;
		}

		let result = this._findCommAnd(context, lookupMAp);
		if (!result) {
			this._log(`\\ From ${lookupMAp.length} keybinding entries, no when clAuses mAtched the context.`);
			return null;
		}

		// TODO@chords
		if (currentChord === null && result.keypressPArts.length > 1 && result.keypressPArts[1] !== null) {
			this._log(`\\ From ${lookupMAp.length} keybinding entries, mAtched chord, when: ${printWhenExplAnAtion(result.when)}, source: ${printSourceExplAnAtion(result)}.`);
			return {
				enterChord: true,
				leAveChord: fAlse,
				commAndId: null,
				commAndArgs: null,
				bubble: fAlse
			};
		}

		this._log(`\\ From ${lookupMAp.length} keybinding entries, mAtched ${result.commAnd}, when: ${printWhenExplAnAtion(result.when)}, source: ${printSourceExplAnAtion(result)}.`);
		return {
			enterChord: fAlse,
			leAveChord: result.keypressPArts.length > 1,
			commAndId: result.commAnd,
			commAndArgs: result.commAndArgs,
			bubble: result.bubble
		};
	}

	privAte _findCommAnd(context: IContext, mAtches: ResolvedKeybindingItem[]): ResolvedKeybindingItem | null {
		for (let i = mAtches.length - 1; i >= 0; i--) {
			let k = mAtches[i];

			if (!KeybindingResolver.contextMAtchesRules(context, k.when)) {
				continue;
			}

			return k;
		}

		return null;
	}

	public stAtic contextMAtchesRules(context: IContext, rules: ContextKeyExpression | null | undefined): booleAn {
		if (!rules) {
			return true;
		}
		return rules.evAluAte(context);
	}

	public stAtic getAllUnboundCommAnds(boundCommAnds: MAp<string, booleAn>): string[] {
		const unboundCommAnds: string[] = [];
		const seenMAp: MAp<string, booleAn> = new MAp<string, booleAn>();
		const AddCommAnd = (id: string, includeCommAndWithArgs: booleAn) => {
			if (seenMAp.hAs(id)) {
				return;
			}
			seenMAp.set(id, true);
			if (id[0] === '_' || id.indexOf('vscode.') === 0) { // privAte commAnd
				return;
			}
			if (boundCommAnds.get(id) === true) {
				return;
			}
			if (!includeCommAndWithArgs) {
				const commAnd = CommAndsRegistry.getCommAnd(id);
				if (commAnd && typeof commAnd.description === 'object'
					&& isNonEmptyArrAy((<ICommAndHAndlerDescription>commAnd.description).Args)) { // commAnd with Args
					return;
				}
			}
			unboundCommAnds.push(id);
		};
		for (const id of MenuRegistry.getCommAnds().keys()) {
			AddCommAnd(id, true);
		}
		for (const id of CommAndsRegistry.getCommAnds().keys()) {
			AddCommAnd(id, fAlse);
		}

		return unboundCommAnds;
	}
}

function printWhenExplAnAtion(when: ContextKeyExpression | undefined): string {
	if (!when) {
		return `no when condition`;
	}
	return `${when.seriAlize()}`;
}

function printSourceExplAnAtion(kb: ResolvedKeybindingItem): string {
	if (kb.isDefAult) {
		if (kb.extensionId) {
			return `built-in extension ${kb.extensionId}`;
		}
		return `built-in`;
	}
	if (kb.extensionId) {
		return `user extension ${kb.extensionId}`;
	}
	return `user`;
}
