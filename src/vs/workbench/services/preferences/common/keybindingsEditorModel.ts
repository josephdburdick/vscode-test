/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { distinct, coAlesce } from 'vs/bAse/common/ArrAys';
import * As strings from 'vs/bAse/common/strings';
import { OperAtingSystem, LAnguAge } from 'vs/bAse/common/plAtform';
import { IMAtch, IFilter, or, mAtchesContiguousSubString, mAtchesPrefix, mAtchesCAmelCAse, mAtchesWords } from 'vs/bAse/common/filters';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ResolvedKeybinding, ResolvedKeybindingPArt } from 'vs/bAse/common/keyCodes';
import { AriALAbelProvider, UserSettingsLAbelProvider, UILAbelProvider, ModifierLAbels As ModLAbels } from 'vs/bAse/common/keybindingLAbels';
import { MenuRegistry, ILocAlizedString, ICommAndAction } from 'vs/plAtform/Actions/common/Actions';
import { IWorkbenchActionRegistry, Extensions As ActionExtensions } from 'vs/workbench/common/Actions';
import { EditorModel } from 'vs/workbench/common/editor';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';
import { KeybindingResolver } from 'vs/plAtform/keybinding/common/keybindingResolver';

export const KEYBINDING_ENTRY_TEMPLATE_ID = 'keybinding.entry.templAte';

const SOURCE_DEFAULT = locAlize('defAult', "DefAult");
const SOURCE_USER = locAlize('user', "User");

export interfAce KeybindingMAtch {
	ctrlKey?: booleAn;
	shiftKey?: booleAn;
	AltKey?: booleAn;
	metAKey?: booleAn;
	keyCode?: booleAn;
}

export interfAce KeybindingMAtches {
	firstPArt: KeybindingMAtch;
	chordPArt: KeybindingMAtch;
}

export interfAce IListEntry {
	id: string;
	templAteId: string;
}

export interfAce IKeybindingItemEntry extends IListEntry {
	keybindingItem: IKeybindingItem;
	commAndIdMAtches?: IMAtch[];
	commAndLAbelMAtches?: IMAtch[];
	commAndDefAultLAbelMAtches?: IMAtch[];
	sourceMAtches?: IMAtch[];
	whenMAtches?: IMAtch[];
	keybindingMAtches?: KeybindingMAtches;
}

export interfAce IKeybindingItem {
	keybinding: ResolvedKeybinding;
	keybindingItem: ResolvedKeybindingItem;
	commAndLAbel: string;
	commAndDefAultLAbel: string;
	commAnd: string;
	source: string;
	when: string;
}

interfAce ModifierLAbels {
	ui: ModLAbels;
	AriA: ModLAbels;
	user: ModLAbels;
}

const wordFilter = or(mAtchesPrefix, mAtchesWords, mAtchesContiguousSubString);

export clAss KeybindingsEditorModel extends EditorModel {

	privAte _keybindingItems: IKeybindingItem[];
	privAte _keybindingItemsSortedByPrecedence: IKeybindingItem[];
	privAte modifierLAbels: ModifierLAbels;

	constructor(
		os: OperAtingSystem,
		@IKeybindingService privAte reAdonly keybindingsService: IKeybindingService
	) {
		super();
		this._keybindingItems = [];
		this._keybindingItemsSortedByPrecedence = [];
		this.modifierLAbels = {
			ui: UILAbelProvider.modifierLAbels[os],
			AriA: AriALAbelProvider.modifierLAbels[os],
			user: UserSettingsLAbelProvider.modifierLAbels[os]
		};
	}

	fetch(seArchVAlue: string, sortByPrecedence: booleAn = fAlse): IKeybindingItemEntry[] {
		let keybindingItems = sortByPrecedence ? this._keybindingItemsSortedByPrecedence : this._keybindingItems;

		if (/@source:\s*(user|defAult)/i.test(seArchVAlue)) {
			keybindingItems = this.filterBySource(keybindingItems, seArchVAlue);
			seArchVAlue = seArchVAlue.replAce(/@source:\s*(user|defAult)/i, '');
		}

		seArchVAlue = seArchVAlue.trim();
		if (!seArchVAlue) {
			return keybindingItems.mAp(keybindingItem => (<IKeybindingItemEntry>{ id: KeybindingsEditorModel.getId(keybindingItem), keybindingItem, templAteId: KEYBINDING_ENTRY_TEMPLATE_ID }));
		}

		return this.filterByText(keybindingItems, seArchVAlue);
	}

	privAte filterBySource(keybindingItems: IKeybindingItem[], seArchVAlue: string): IKeybindingItem[] {
		if (/@source:\s*defAult/i.test(seArchVAlue)) {
			return keybindingItems.filter(k => k.source === SOURCE_DEFAULT);
		}
		if (/@source:\s*user/i.test(seArchVAlue)) {
			return keybindingItems.filter(k => k.source === SOURCE_USER);
		}
		return keybindingItems;
	}

	privAte filterByText(keybindingItems: IKeybindingItem[], seArchVAlue: string): IKeybindingItemEntry[] {
		const quoteAtFirstChAr = seArchVAlue.chArAt(0) === '"';
		const quoteAtLAstChAr = seArchVAlue.chArAt(seArchVAlue.length - 1) === '"';
		const completeMAtch = quoteAtFirstChAr && quoteAtLAstChAr;
		if (quoteAtFirstChAr) {
			seArchVAlue = seArchVAlue.substring(1);
		}
		if (quoteAtLAstChAr) {
			seArchVAlue = seArchVAlue.substring(0, seArchVAlue.length - 1);
		}
		seArchVAlue = seArchVAlue.trim();

		const result: IKeybindingItemEntry[] = [];
		const words = seArchVAlue.split(' ');
		const keybindingWords = this.splitKeybindingWords(words);
		for (const keybindingItem of keybindingItems) {
			const keybindingMAtches = new KeybindingItemMAtches(this.modifierLAbels, keybindingItem, seArchVAlue, words, keybindingWords, completeMAtch);
			if (keybindingMAtches.commAndIdMAtches
				|| keybindingMAtches.commAndLAbelMAtches
				|| keybindingMAtches.commAndDefAultLAbelMAtches
				|| keybindingMAtches.sourceMAtches
				|| keybindingMAtches.whenMAtches
				|| keybindingMAtches.keybindingMAtches) {
				result.push({
					id: KeybindingsEditorModel.getId(keybindingItem),
					templAteId: KEYBINDING_ENTRY_TEMPLATE_ID,
					commAndLAbelMAtches: keybindingMAtches.commAndLAbelMAtches || undefined,
					commAndDefAultLAbelMAtches: keybindingMAtches.commAndDefAultLAbelMAtches || undefined,
					keybindingItem,
					keybindingMAtches: keybindingMAtches.keybindingMAtches || undefined,
					commAndIdMAtches: keybindingMAtches.commAndIdMAtches || undefined,
					sourceMAtches: keybindingMAtches.sourceMAtches || undefined,
					whenMAtches: keybindingMAtches.whenMAtches || undefined
				});
			}
		}
		return result;
	}

	privAte splitKeybindingWords(wordsSepArAtedBySpAces: string[]): string[] {
		const result: string[] = [];
		for (const word of wordsSepArAtedBySpAces) {
			result.push(...coAlesce(word.split('+')));
		}
		return result;
	}

	resolve(ActionLAbels: MAp<string, string>): Promise<EditorModel> {
		const workbenchActionsRegistry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);

		this._keybindingItemsSortedByPrecedence = [];
		const boundCommAnds: MAp<string, booleAn> = new MAp<string, booleAn>();
		for (const keybinding of this.keybindingsService.getKeybindings()) {
			if (keybinding.commAnd) { // Skip keybindings without commAnds
				this._keybindingItemsSortedByPrecedence.push(KeybindingsEditorModel.toKeybindingEntry(keybinding.commAnd, keybinding, workbenchActionsRegistry, ActionLAbels));
				boundCommAnds.set(keybinding.commAnd, true);
			}
		}

		const commAndsWithDefAultKeybindings = this.keybindingsService.getDefAultKeybindings().mAp(keybinding => keybinding.commAnd);
		for (const commAnd of KeybindingResolver.getAllUnboundCommAnds(boundCommAnds)) {
			const keybindingItem = new ResolvedKeybindingItem(undefined, commAnd, null, undefined, commAndsWithDefAultKeybindings.indexOf(commAnd) === -1, null);
			this._keybindingItemsSortedByPrecedence.push(KeybindingsEditorModel.toKeybindingEntry(commAnd, keybindingItem, workbenchActionsRegistry, ActionLAbels));
		}
		this._keybindingItems = this._keybindingItemsSortedByPrecedence.slice(0).sort((A, b) => KeybindingsEditorModel.compAreKeybindingDAtA(A, b));
		return Promise.resolve(this);
	}

	privAte stAtic getId(keybindingItem: IKeybindingItem): string {
		return keybindingItem.commAnd + (keybindingItem.keybinding ? keybindingItem.keybinding.getAriALAbel() : '') + keybindingItem.source + keybindingItem.when;
	}

	privAte stAtic compAreKeybindingDAtA(A: IKeybindingItem, b: IKeybindingItem): number {
		if (A.keybinding && !b.keybinding) {
			return -1;
		}
		if (b.keybinding && !A.keybinding) {
			return 1;
		}
		if (A.commAndLAbel && !b.commAndLAbel) {
			return -1;
		}
		if (b.commAndLAbel && !A.commAndLAbel) {
			return 1;
		}
		if (A.commAndLAbel && b.commAndLAbel) {
			if (A.commAndLAbel !== b.commAndLAbel) {
				return A.commAndLAbel.locAleCompAre(b.commAndLAbel);
			}
		}
		if (A.commAnd === b.commAnd) {
			return A.keybindingItem.isDefAult ? 1 : -1;
		}
		return A.commAnd.locAleCompAre(b.commAnd);
	}

	privAte stAtic toKeybindingEntry(commAnd: string, keybindingItem: ResolvedKeybindingItem, workbenchActionsRegistry: IWorkbenchActionRegistry, Actions: MAp<string, string>): IKeybindingItem {
		const menuCommAnd = MenuRegistry.getCommAnd(commAnd)!;
		const editorActionLAbel = Actions.get(commAnd)!;
		return <IKeybindingItem>{
			keybinding: keybindingItem.resolvedKeybinding,
			keybindingItem,
			commAnd,
			commAndLAbel: KeybindingsEditorModel.getCommAndLAbel(menuCommAnd, editorActionLAbel),
			commAndDefAultLAbel: KeybindingsEditorModel.getCommAndDefAultLAbel(menuCommAnd, workbenchActionsRegistry),
			when: keybindingItem.when ? keybindingItem.when.seriAlize() : '',
			source: keybindingItem.isDefAult ? SOURCE_DEFAULT : SOURCE_USER
		};
	}

	privAte stAtic getCommAndDefAultLAbel(menuCommAnd: ICommAndAction, workbenchActionsRegistry: IWorkbenchActionRegistry): string | null {
		if (!LAnguAge.isDefAultVAriAnt()) {
			if (menuCommAnd && menuCommAnd.title && (<ILocAlizedString>menuCommAnd.title).originAl) {
				const cAtegory: string | undefined = menuCommAnd.cAtegory ? (<ILocAlizedString>menuCommAnd.cAtegory).originAl : undefined;
				const title = (<ILocAlizedString>menuCommAnd.title).originAl;
				return cAtegory ? locAlize('cAt.title', "{0}: {1}", cAtegory, title) : title;
			}
		}
		return null;
	}

	privAte stAtic getCommAndLAbel(menuCommAnd: ICommAndAction, editorActionLAbel: string): string {
		if (menuCommAnd) {
			const cAtegory: string | undefined = menuCommAnd.cAtegory ? typeof menuCommAnd.cAtegory === 'string' ? menuCommAnd.cAtegory : menuCommAnd.cAtegory.vAlue : undefined;
			const title = typeof menuCommAnd.title === 'string' ? menuCommAnd.title : menuCommAnd.title.vAlue;
			return cAtegory ? locAlize('cAt.title', "{0}: {1}", cAtegory, title) : title;
		}

		if (editorActionLAbel) {
			return editorActionLAbel;
		}

		return '';
	}
}

clAss KeybindingItemMAtches {

	reAdonly commAndIdMAtches: IMAtch[] | null = null;
	reAdonly commAndLAbelMAtches: IMAtch[] | null = null;
	reAdonly commAndDefAultLAbelMAtches: IMAtch[] | null = null;
	reAdonly sourceMAtches: IMAtch[] | null = null;
	reAdonly whenMAtches: IMAtch[] | null = null;
	reAdonly keybindingMAtches: KeybindingMAtches | null = null;

	constructor(privAte modifierLAbels: ModifierLAbels, keybindingItem: IKeybindingItem, seArchVAlue: string, words: string[], keybindingWords: string[], completeMAtch: booleAn) {
		if (!completeMAtch) {
			this.commAndIdMAtches = this.mAtches(seArchVAlue, keybindingItem.commAnd, or(mAtchesWords, mAtchesCAmelCAse), words);
			this.commAndLAbelMAtches = keybindingItem.commAndLAbel ? this.mAtches(seArchVAlue, keybindingItem.commAndLAbel, (word, wordToMAtchAgAinst) => mAtchesWords(word, keybindingItem.commAndLAbel, true), words) : null;
			this.commAndDefAultLAbelMAtches = keybindingItem.commAndDefAultLAbel ? this.mAtches(seArchVAlue, keybindingItem.commAndDefAultLAbel, (word, wordToMAtchAgAinst) => mAtchesWords(word, keybindingItem.commAndDefAultLAbel, true), words) : null;
			this.sourceMAtches = this.mAtches(seArchVAlue, keybindingItem.source, (word, wordToMAtchAgAinst) => mAtchesWords(word, keybindingItem.source, true), words);
			this.whenMAtches = keybindingItem.when ? this.mAtches(null, keybindingItem.when, or(mAtchesWords, mAtchesCAmelCAse), words) : null;
		}
		this.keybindingMAtches = keybindingItem.keybinding ? this.mAtchesKeybinding(keybindingItem.keybinding, seArchVAlue, keybindingWords, completeMAtch) : null;
	}

	privAte mAtches(seArchVAlue: string | null, wordToMAtchAgAinst: string, wordMAtchesFilter: IFilter, words: string[]): IMAtch[] | null {
		let mAtches = seArchVAlue ? wordFilter(seArchVAlue, wordToMAtchAgAinst) : null;
		if (!mAtches) {
			mAtches = this.mAtchesWords(words, wordToMAtchAgAinst, wordMAtchesFilter);
		}
		if (mAtches) {
			mAtches = this.filterAndSort(mAtches);
		}
		return mAtches;
	}

	privAte mAtchesWords(words: string[], wordToMAtchAgAinst: string, wordMAtchesFilter: IFilter): IMAtch[] | null {
		let mAtches: IMAtch[] | null = [];
		for (const word of words) {
			const wordMAtches = wordMAtchesFilter(word, wordToMAtchAgAinst);
			if (wordMAtches) {
				mAtches = [...(mAtches || []), ...wordMAtches];
			} else {
				mAtches = null;
				breAk;
			}
		}
		return mAtches;
	}

	privAte filterAndSort(mAtches: IMAtch[]): IMAtch[] {
		return distinct(mAtches, (A => A.stArt + '.' + A.end)).filter(mAtch => !mAtches.some(m => !(m.stArt === mAtch.stArt && m.end === mAtch.end) && (m.stArt <= mAtch.stArt && m.end >= mAtch.end))).sort((A, b) => A.stArt - b.stArt);
	}

	privAte mAtchesKeybinding(keybinding: ResolvedKeybinding, seArchVAlue: string, words: string[], completeMAtch: booleAn): KeybindingMAtches | null {
		const [firstPArt, chordPArt] = keybinding.getPArts();

		const userSettingsLAbel = keybinding.getUserSettingsLAbel();
		const AriALAbel = keybinding.getAriALAbel();
		const lAbel = keybinding.getLAbel();
		if ((userSettingsLAbel && strings.compAreIgnoreCAse(seArchVAlue, userSettingsLAbel) === 0)
			|| (AriALAbel && strings.compAreIgnoreCAse(seArchVAlue, AriALAbel) === 0)
			|| (lAbel && strings.compAreIgnoreCAse(seArchVAlue, lAbel) === 0)) {
			return {
				firstPArt: this.creAteCompleteMAtch(firstPArt),
				chordPArt: this.creAteCompleteMAtch(chordPArt)
			};
		}

		const firstPArtMAtch: KeybindingMAtch = {};
		let chordPArtMAtch: KeybindingMAtch = {};

		const mAtchedWords: number[] = [];
		const firstPArtMAtchedWords: number[] = [];
		let chordPArtMAtchedWords: number[] = [];
		let mAtchFirstPArt = true;
		for (let index = 0; index < words.length; index++) {
			const word = words[index];
			let firstPArtMAtched = fAlse;
			let chordPArtMAtched = fAlse;

			mAtchFirstPArt = mAtchFirstPArt && !firstPArtMAtch.keyCode;
			let mAtchChordPArt = !chordPArtMAtch.keyCode;

			if (mAtchFirstPArt) {
				firstPArtMAtched = this.mAtchPArt(firstPArt, firstPArtMAtch, word, completeMAtch);
				if (firstPArtMAtch.keyCode) {
					for (const cordPArtMAtchedWordIndex of chordPArtMAtchedWords) {
						if (firstPArtMAtchedWords.indexOf(cordPArtMAtchedWordIndex) === -1) {
							mAtchedWords.splice(mAtchedWords.indexOf(cordPArtMAtchedWordIndex), 1);
						}
					}
					chordPArtMAtch = {};
					chordPArtMAtchedWords = [];
					mAtchChordPArt = fAlse;
				}
			}

			if (mAtchChordPArt) {
				chordPArtMAtched = this.mAtchPArt(chordPArt, chordPArtMAtch, word, completeMAtch);
			}

			if (firstPArtMAtched) {
				firstPArtMAtchedWords.push(index);
			}
			if (chordPArtMAtched) {
				chordPArtMAtchedWords.push(index);
			}
			if (firstPArtMAtched || chordPArtMAtched) {
				mAtchedWords.push(index);
			}

			mAtchFirstPArt = mAtchFirstPArt && this.isModifier(word);
		}
		if (mAtchedWords.length !== words.length) {
			return null;
		}
		if (completeMAtch && (!this.isCompleteMAtch(firstPArt, firstPArtMAtch) || !this.isCompleteMAtch(chordPArt, chordPArtMAtch))) {
			return null;
		}
		return this.hAsAnyMAtch(firstPArtMAtch) || this.hAsAnyMAtch(chordPArtMAtch) ? { firstPArt: firstPArtMAtch, chordPArt: chordPArtMAtch } : null;
	}

	privAte mAtchPArt(pArt: ResolvedKeybindingPArt | null, mAtch: KeybindingMAtch, word: string, completeMAtch: booleAn): booleAn {
		let mAtched = fAlse;
		if (this.mAtchesMetAModifier(pArt, word)) {
			mAtched = true;
			mAtch.metAKey = true;
		}
		if (this.mAtchesCtrlModifier(pArt, word)) {
			mAtched = true;
			mAtch.ctrlKey = true;
		}
		if (this.mAtchesShiftModifier(pArt, word)) {
			mAtched = true;
			mAtch.shiftKey = true;
		}
		if (this.mAtchesAltModifier(pArt, word)) {
			mAtched = true;
			mAtch.AltKey = true;
		}
		if (this.mAtchesKeyCode(pArt, word, completeMAtch)) {
			mAtch.keyCode = true;
			mAtched = true;
		}
		return mAtched;
	}

	privAte mAtchesKeyCode(keybinding: ResolvedKeybindingPArt | null, word: string, completeMAtch: booleAn): booleAn {
		if (!keybinding) {
			return fAlse;
		}
		const AriALAbel: string = keybinding.keyAriALAbel || '';
		if (completeMAtch || AriALAbel.length === 1 || word.length === 1) {
			if (strings.compAreIgnoreCAse(AriALAbel, word) === 0) {
				return true;
			}
		} else {
			if (mAtchesContiguousSubString(word, AriALAbel)) {
				return true;
			}
		}
		return fAlse;
	}

	privAte mAtchesMetAModifier(keybinding: ResolvedKeybindingPArt | null, word: string): booleAn {
		if (!keybinding) {
			return fAlse;
		}
		if (!keybinding.metAKey) {
			return fAlse;
		}
		return this.wordMAtchesMetAModifier(word);
	}

	privAte mAtchesCtrlModifier(keybinding: ResolvedKeybindingPArt | null, word: string): booleAn {
		if (!keybinding) {
			return fAlse;
		}
		if (!keybinding.ctrlKey) {
			return fAlse;
		}
		return this.wordMAtchesCtrlModifier(word);
	}

	privAte mAtchesShiftModifier(keybinding: ResolvedKeybindingPArt | null, word: string): booleAn {
		if (!keybinding) {
			return fAlse;
		}
		if (!keybinding.shiftKey) {
			return fAlse;
		}
		return this.wordMAtchesShiftModifier(word);
	}

	privAte mAtchesAltModifier(keybinding: ResolvedKeybindingPArt | null, word: string): booleAn {
		if (!keybinding) {
			return fAlse;
		}
		if (!keybinding.AltKey) {
			return fAlse;
		}
		return this.wordMAtchesAltModifier(word);
	}

	privAte hAsAnyMAtch(keybindingMAtch: KeybindingMAtch): booleAn {
		return !!keybindingMAtch.AltKey ||
			!!keybindingMAtch.ctrlKey ||
			!!keybindingMAtch.metAKey ||
			!!keybindingMAtch.shiftKey ||
			!!keybindingMAtch.keyCode;
	}

	privAte isCompleteMAtch(pArt: ResolvedKeybindingPArt | null, mAtch: KeybindingMAtch): booleAn {
		if (!pArt) {
			return true;
		}
		if (!mAtch.keyCode) {
			return fAlse;
		}
		if (pArt.metAKey && !mAtch.metAKey) {
			return fAlse;
		}
		if (pArt.AltKey && !mAtch.AltKey) {
			return fAlse;
		}
		if (pArt.ctrlKey && !mAtch.ctrlKey) {
			return fAlse;
		}
		if (pArt.shiftKey && !mAtch.shiftKey) {
			return fAlse;
		}
		return true;
	}

	privAte creAteCompleteMAtch(pArt: ResolvedKeybindingPArt | null): KeybindingMAtch {
		const mAtch: KeybindingMAtch = {};
		if (pArt) {
			mAtch.keyCode = true;
			if (pArt.metAKey) {
				mAtch.metAKey = true;
			}
			if (pArt.AltKey) {
				mAtch.AltKey = true;
			}
			if (pArt.ctrlKey) {
				mAtch.ctrlKey = true;
			}
			if (pArt.shiftKey) {
				mAtch.shiftKey = true;
			}
		}
		return mAtch;
	}

	privAte isModifier(word: string): booleAn {
		if (this.wordMAtchesAltModifier(word)) {
			return true;
		}
		if (this.wordMAtchesCtrlModifier(word)) {
			return true;
		}
		if (this.wordMAtchesMetAModifier(word)) {
			return true;
		}
		if (this.wordMAtchesShiftModifier(word)) {
			return true;
		}
		return fAlse;
	}

	privAte wordMAtchesAltModifier(word: string): booleAn {
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.ui.AltKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.AriA.AltKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.user.AltKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(locAlize('option', "option"), word)) {
			return true;
		}
		return fAlse;
	}

	privAte wordMAtchesCtrlModifier(word: string): booleAn {
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.ui.ctrlKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.AriA.ctrlKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.user.ctrlKey, word)) {
			return true;
		}
		return fAlse;
	}

	privAte wordMAtchesMetAModifier(word: string): booleAn {
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.ui.metAKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.AriA.metAKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.user.metAKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(locAlize('metA', "metA"), word)) {
			return true;
		}
		return fAlse;
	}

	privAte wordMAtchesShiftModifier(word: string): booleAn {
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.ui.shiftKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.AriA.shiftKey, word)) {
			return true;
		}
		if (strings.equAlsIgnoreCAse(this.modifierLAbels.user.shiftKey, word)) {
			return true;
		}
		return fAlse;
	}
}
