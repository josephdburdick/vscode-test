/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { distinct, coalesce } from 'vs/Base/common/arrays';
import * as strings from 'vs/Base/common/strings';
import { OperatingSystem, Language } from 'vs/Base/common/platform';
import { IMatch, IFilter, or, matchesContiguousSuBString, matchesPrefix, matchesCamelCase, matchesWords } from 'vs/Base/common/filters';
import { Registry } from 'vs/platform/registry/common/platform';
import { ResolvedKeyBinding, ResolvedKeyBindingPart } from 'vs/Base/common/keyCodes';
import { AriaLaBelProvider, UserSettingsLaBelProvider, UILaBelProvider, ModifierLaBels as ModLaBels } from 'vs/Base/common/keyBindingLaBels';
import { MenuRegistry, ILocalizedString, ICommandAction } from 'vs/platform/actions/common/actions';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions } from 'vs/workBench/common/actions';
import { EditorModel } from 'vs/workBench/common/editor';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { KeyBindingResolver } from 'vs/platform/keyBinding/common/keyBindingResolver';

export const KEYBINDING_ENTRY_TEMPLATE_ID = 'keyBinding.entry.template';

const SOURCE_DEFAULT = localize('default', "Default");
const SOURCE_USER = localize('user', "User");

export interface KeyBindingMatch {
	ctrlKey?: Boolean;
	shiftKey?: Boolean;
	altKey?: Boolean;
	metaKey?: Boolean;
	keyCode?: Boolean;
}

export interface KeyBindingMatches {
	firstPart: KeyBindingMatch;
	chordPart: KeyBindingMatch;
}

export interface IListEntry {
	id: string;
	templateId: string;
}

export interface IKeyBindingItemEntry extends IListEntry {
	keyBindingItem: IKeyBindingItem;
	commandIdMatches?: IMatch[];
	commandLaBelMatches?: IMatch[];
	commandDefaultLaBelMatches?: IMatch[];
	sourceMatches?: IMatch[];
	whenMatches?: IMatch[];
	keyBindingMatches?: KeyBindingMatches;
}

export interface IKeyBindingItem {
	keyBinding: ResolvedKeyBinding;
	keyBindingItem: ResolvedKeyBindingItem;
	commandLaBel: string;
	commandDefaultLaBel: string;
	command: string;
	source: string;
	when: string;
}

interface ModifierLaBels {
	ui: ModLaBels;
	aria: ModLaBels;
	user: ModLaBels;
}

const wordFilter = or(matchesPrefix, matchesWords, matchesContiguousSuBString);

export class KeyBindingsEditorModel extends EditorModel {

	private _keyBindingItems: IKeyBindingItem[];
	private _keyBindingItemsSortedByPrecedence: IKeyBindingItem[];
	private modifierLaBels: ModifierLaBels;

	constructor(
		os: OperatingSystem,
		@IKeyBindingService private readonly keyBindingsService: IKeyBindingService
	) {
		super();
		this._keyBindingItems = [];
		this._keyBindingItemsSortedByPrecedence = [];
		this.modifierLaBels = {
			ui: UILaBelProvider.modifierLaBels[os],
			aria: AriaLaBelProvider.modifierLaBels[os],
			user: UserSettingsLaBelProvider.modifierLaBels[os]
		};
	}

	fetch(searchValue: string, sortByPrecedence: Boolean = false): IKeyBindingItemEntry[] {
		let keyBindingItems = sortByPrecedence ? this._keyBindingItemsSortedByPrecedence : this._keyBindingItems;

		if (/@source:\s*(user|default)/i.test(searchValue)) {
			keyBindingItems = this.filterBySource(keyBindingItems, searchValue);
			searchValue = searchValue.replace(/@source:\s*(user|default)/i, '');
		}

		searchValue = searchValue.trim();
		if (!searchValue) {
			return keyBindingItems.map(keyBindingItem => (<IKeyBindingItemEntry>{ id: KeyBindingsEditorModel.getId(keyBindingItem), keyBindingItem, templateId: KEYBINDING_ENTRY_TEMPLATE_ID }));
		}

		return this.filterByText(keyBindingItems, searchValue);
	}

	private filterBySource(keyBindingItems: IKeyBindingItem[], searchValue: string): IKeyBindingItem[] {
		if (/@source:\s*default/i.test(searchValue)) {
			return keyBindingItems.filter(k => k.source === SOURCE_DEFAULT);
		}
		if (/@source:\s*user/i.test(searchValue)) {
			return keyBindingItems.filter(k => k.source === SOURCE_USER);
		}
		return keyBindingItems;
	}

	private filterByText(keyBindingItems: IKeyBindingItem[], searchValue: string): IKeyBindingItemEntry[] {
		const quoteAtFirstChar = searchValue.charAt(0) === '"';
		const quoteAtLastChar = searchValue.charAt(searchValue.length - 1) === '"';
		const completeMatch = quoteAtFirstChar && quoteAtLastChar;
		if (quoteAtFirstChar) {
			searchValue = searchValue.suBstring(1);
		}
		if (quoteAtLastChar) {
			searchValue = searchValue.suBstring(0, searchValue.length - 1);
		}
		searchValue = searchValue.trim();

		const result: IKeyBindingItemEntry[] = [];
		const words = searchValue.split(' ');
		const keyBindingWords = this.splitKeyBindingWords(words);
		for (const keyBindingItem of keyBindingItems) {
			const keyBindingMatches = new KeyBindingItemMatches(this.modifierLaBels, keyBindingItem, searchValue, words, keyBindingWords, completeMatch);
			if (keyBindingMatches.commandIdMatches
				|| keyBindingMatches.commandLaBelMatches
				|| keyBindingMatches.commandDefaultLaBelMatches
				|| keyBindingMatches.sourceMatches
				|| keyBindingMatches.whenMatches
				|| keyBindingMatches.keyBindingMatches) {
				result.push({
					id: KeyBindingsEditorModel.getId(keyBindingItem),
					templateId: KEYBINDING_ENTRY_TEMPLATE_ID,
					commandLaBelMatches: keyBindingMatches.commandLaBelMatches || undefined,
					commandDefaultLaBelMatches: keyBindingMatches.commandDefaultLaBelMatches || undefined,
					keyBindingItem,
					keyBindingMatches: keyBindingMatches.keyBindingMatches || undefined,
					commandIdMatches: keyBindingMatches.commandIdMatches || undefined,
					sourceMatches: keyBindingMatches.sourceMatches || undefined,
					whenMatches: keyBindingMatches.whenMatches || undefined
				});
			}
		}
		return result;
	}

	private splitKeyBindingWords(wordsSeparatedBySpaces: string[]): string[] {
		const result: string[] = [];
		for (const word of wordsSeparatedBySpaces) {
			result.push(...coalesce(word.split('+')));
		}
		return result;
	}

	resolve(actionLaBels: Map<string, string>): Promise<EditorModel> {
		const workBenchActionsRegistry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);

		this._keyBindingItemsSortedByPrecedence = [];
		const BoundCommands: Map<string, Boolean> = new Map<string, Boolean>();
		for (const keyBinding of this.keyBindingsService.getKeyBindings()) {
			if (keyBinding.command) { // Skip keyBindings without commands
				this._keyBindingItemsSortedByPrecedence.push(KeyBindingsEditorModel.toKeyBindingEntry(keyBinding.command, keyBinding, workBenchActionsRegistry, actionLaBels));
				BoundCommands.set(keyBinding.command, true);
			}
		}

		const commandsWithDefaultKeyBindings = this.keyBindingsService.getDefaultKeyBindings().map(keyBinding => keyBinding.command);
		for (const command of KeyBindingResolver.getAllUnBoundCommands(BoundCommands)) {
			const keyBindingItem = new ResolvedKeyBindingItem(undefined, command, null, undefined, commandsWithDefaultKeyBindings.indexOf(command) === -1, null);
			this._keyBindingItemsSortedByPrecedence.push(KeyBindingsEditorModel.toKeyBindingEntry(command, keyBindingItem, workBenchActionsRegistry, actionLaBels));
		}
		this._keyBindingItems = this._keyBindingItemsSortedByPrecedence.slice(0).sort((a, B) => KeyBindingsEditorModel.compareKeyBindingData(a, B));
		return Promise.resolve(this);
	}

	private static getId(keyBindingItem: IKeyBindingItem): string {
		return keyBindingItem.command + (keyBindingItem.keyBinding ? keyBindingItem.keyBinding.getAriaLaBel() : '') + keyBindingItem.source + keyBindingItem.when;
	}

	private static compareKeyBindingData(a: IKeyBindingItem, B: IKeyBindingItem): numBer {
		if (a.keyBinding && !B.keyBinding) {
			return -1;
		}
		if (B.keyBinding && !a.keyBinding) {
			return 1;
		}
		if (a.commandLaBel && !B.commandLaBel) {
			return -1;
		}
		if (B.commandLaBel && !a.commandLaBel) {
			return 1;
		}
		if (a.commandLaBel && B.commandLaBel) {
			if (a.commandLaBel !== B.commandLaBel) {
				return a.commandLaBel.localeCompare(B.commandLaBel);
			}
		}
		if (a.command === B.command) {
			return a.keyBindingItem.isDefault ? 1 : -1;
		}
		return a.command.localeCompare(B.command);
	}

	private static toKeyBindingEntry(command: string, keyBindingItem: ResolvedKeyBindingItem, workBenchActionsRegistry: IWorkBenchActionRegistry, actions: Map<string, string>): IKeyBindingItem {
		const menuCommand = MenuRegistry.getCommand(command)!;
		const editorActionLaBel = actions.get(command)!;
		return <IKeyBindingItem>{
			keyBinding: keyBindingItem.resolvedKeyBinding,
			keyBindingItem,
			command,
			commandLaBel: KeyBindingsEditorModel.getCommandLaBel(menuCommand, editorActionLaBel),
			commandDefaultLaBel: KeyBindingsEditorModel.getCommandDefaultLaBel(menuCommand, workBenchActionsRegistry),
			when: keyBindingItem.when ? keyBindingItem.when.serialize() : '',
			source: keyBindingItem.isDefault ? SOURCE_DEFAULT : SOURCE_USER
		};
	}

	private static getCommandDefaultLaBel(menuCommand: ICommandAction, workBenchActionsRegistry: IWorkBenchActionRegistry): string | null {
		if (!Language.isDefaultVariant()) {
			if (menuCommand && menuCommand.title && (<ILocalizedString>menuCommand.title).original) {
				const category: string | undefined = menuCommand.category ? (<ILocalizedString>menuCommand.category).original : undefined;
				const title = (<ILocalizedString>menuCommand.title).original;
				return category ? localize('cat.title', "{0}: {1}", category, title) : title;
			}
		}
		return null;
	}

	private static getCommandLaBel(menuCommand: ICommandAction, editorActionLaBel: string): string {
		if (menuCommand) {
			const category: string | undefined = menuCommand.category ? typeof menuCommand.category === 'string' ? menuCommand.category : menuCommand.category.value : undefined;
			const title = typeof menuCommand.title === 'string' ? menuCommand.title : menuCommand.title.value;
			return category ? localize('cat.title', "{0}: {1}", category, title) : title;
		}

		if (editorActionLaBel) {
			return editorActionLaBel;
		}

		return '';
	}
}

class KeyBindingItemMatches {

	readonly commandIdMatches: IMatch[] | null = null;
	readonly commandLaBelMatches: IMatch[] | null = null;
	readonly commandDefaultLaBelMatches: IMatch[] | null = null;
	readonly sourceMatches: IMatch[] | null = null;
	readonly whenMatches: IMatch[] | null = null;
	readonly keyBindingMatches: KeyBindingMatches | null = null;

	constructor(private modifierLaBels: ModifierLaBels, keyBindingItem: IKeyBindingItem, searchValue: string, words: string[], keyBindingWords: string[], completeMatch: Boolean) {
		if (!completeMatch) {
			this.commandIdMatches = this.matches(searchValue, keyBindingItem.command, or(matchesWords, matchesCamelCase), words);
			this.commandLaBelMatches = keyBindingItem.commandLaBel ? this.matches(searchValue, keyBindingItem.commandLaBel, (word, wordToMatchAgainst) => matchesWords(word, keyBindingItem.commandLaBel, true), words) : null;
			this.commandDefaultLaBelMatches = keyBindingItem.commandDefaultLaBel ? this.matches(searchValue, keyBindingItem.commandDefaultLaBel, (word, wordToMatchAgainst) => matchesWords(word, keyBindingItem.commandDefaultLaBel, true), words) : null;
			this.sourceMatches = this.matches(searchValue, keyBindingItem.source, (word, wordToMatchAgainst) => matchesWords(word, keyBindingItem.source, true), words);
			this.whenMatches = keyBindingItem.when ? this.matches(null, keyBindingItem.when, or(matchesWords, matchesCamelCase), words) : null;
		}
		this.keyBindingMatches = keyBindingItem.keyBinding ? this.matchesKeyBinding(keyBindingItem.keyBinding, searchValue, keyBindingWords, completeMatch) : null;
	}

	private matches(searchValue: string | null, wordToMatchAgainst: string, wordMatchesFilter: IFilter, words: string[]): IMatch[] | null {
		let matches = searchValue ? wordFilter(searchValue, wordToMatchAgainst) : null;
		if (!matches) {
			matches = this.matchesWords(words, wordToMatchAgainst, wordMatchesFilter);
		}
		if (matches) {
			matches = this.filterAndSort(matches);
		}
		return matches;
	}

	private matchesWords(words: string[], wordToMatchAgainst: string, wordMatchesFilter: IFilter): IMatch[] | null {
		let matches: IMatch[] | null = [];
		for (const word of words) {
			const wordMatches = wordMatchesFilter(word, wordToMatchAgainst);
			if (wordMatches) {
				matches = [...(matches || []), ...wordMatches];
			} else {
				matches = null;
				Break;
			}
		}
		return matches;
	}

	private filterAndSort(matches: IMatch[]): IMatch[] {
		return distinct(matches, (a => a.start + '.' + a.end)).filter(match => !matches.some(m => !(m.start === match.start && m.end === match.end) && (m.start <= match.start && m.end >= match.end))).sort((a, B) => a.start - B.start);
	}

	private matchesKeyBinding(keyBinding: ResolvedKeyBinding, searchValue: string, words: string[], completeMatch: Boolean): KeyBindingMatches | null {
		const [firstPart, chordPart] = keyBinding.getParts();

		const userSettingsLaBel = keyBinding.getUserSettingsLaBel();
		const ariaLaBel = keyBinding.getAriaLaBel();
		const laBel = keyBinding.getLaBel();
		if ((userSettingsLaBel && strings.compareIgnoreCase(searchValue, userSettingsLaBel) === 0)
			|| (ariaLaBel && strings.compareIgnoreCase(searchValue, ariaLaBel) === 0)
			|| (laBel && strings.compareIgnoreCase(searchValue, laBel) === 0)) {
			return {
				firstPart: this.createCompleteMatch(firstPart),
				chordPart: this.createCompleteMatch(chordPart)
			};
		}

		const firstPartMatch: KeyBindingMatch = {};
		let chordPartMatch: KeyBindingMatch = {};

		const matchedWords: numBer[] = [];
		const firstPartMatchedWords: numBer[] = [];
		let chordPartMatchedWords: numBer[] = [];
		let matchFirstPart = true;
		for (let index = 0; index < words.length; index++) {
			const word = words[index];
			let firstPartMatched = false;
			let chordPartMatched = false;

			matchFirstPart = matchFirstPart && !firstPartMatch.keyCode;
			let matchChordPart = !chordPartMatch.keyCode;

			if (matchFirstPart) {
				firstPartMatched = this.matchPart(firstPart, firstPartMatch, word, completeMatch);
				if (firstPartMatch.keyCode) {
					for (const cordPartMatchedWordIndex of chordPartMatchedWords) {
						if (firstPartMatchedWords.indexOf(cordPartMatchedWordIndex) === -1) {
							matchedWords.splice(matchedWords.indexOf(cordPartMatchedWordIndex), 1);
						}
					}
					chordPartMatch = {};
					chordPartMatchedWords = [];
					matchChordPart = false;
				}
			}

			if (matchChordPart) {
				chordPartMatched = this.matchPart(chordPart, chordPartMatch, word, completeMatch);
			}

			if (firstPartMatched) {
				firstPartMatchedWords.push(index);
			}
			if (chordPartMatched) {
				chordPartMatchedWords.push(index);
			}
			if (firstPartMatched || chordPartMatched) {
				matchedWords.push(index);
			}

			matchFirstPart = matchFirstPart && this.isModifier(word);
		}
		if (matchedWords.length !== words.length) {
			return null;
		}
		if (completeMatch && (!this.isCompleteMatch(firstPart, firstPartMatch) || !this.isCompleteMatch(chordPart, chordPartMatch))) {
			return null;
		}
		return this.hasAnyMatch(firstPartMatch) || this.hasAnyMatch(chordPartMatch) ? { firstPart: firstPartMatch, chordPart: chordPartMatch } : null;
	}

	private matchPart(part: ResolvedKeyBindingPart | null, match: KeyBindingMatch, word: string, completeMatch: Boolean): Boolean {
		let matched = false;
		if (this.matchesMetaModifier(part, word)) {
			matched = true;
			match.metaKey = true;
		}
		if (this.matchesCtrlModifier(part, word)) {
			matched = true;
			match.ctrlKey = true;
		}
		if (this.matchesShiftModifier(part, word)) {
			matched = true;
			match.shiftKey = true;
		}
		if (this.matchesAltModifier(part, word)) {
			matched = true;
			match.altKey = true;
		}
		if (this.matchesKeyCode(part, word, completeMatch)) {
			match.keyCode = true;
			matched = true;
		}
		return matched;
	}

	private matchesKeyCode(keyBinding: ResolvedKeyBindingPart | null, word: string, completeMatch: Boolean): Boolean {
		if (!keyBinding) {
			return false;
		}
		const ariaLaBel: string = keyBinding.keyAriaLaBel || '';
		if (completeMatch || ariaLaBel.length === 1 || word.length === 1) {
			if (strings.compareIgnoreCase(ariaLaBel, word) === 0) {
				return true;
			}
		} else {
			if (matchesContiguousSuBString(word, ariaLaBel)) {
				return true;
			}
		}
		return false;
	}

	private matchesMetaModifier(keyBinding: ResolvedKeyBindingPart | null, word: string): Boolean {
		if (!keyBinding) {
			return false;
		}
		if (!keyBinding.metaKey) {
			return false;
		}
		return this.wordMatchesMetaModifier(word);
	}

	private matchesCtrlModifier(keyBinding: ResolvedKeyBindingPart | null, word: string): Boolean {
		if (!keyBinding) {
			return false;
		}
		if (!keyBinding.ctrlKey) {
			return false;
		}
		return this.wordMatchesCtrlModifier(word);
	}

	private matchesShiftModifier(keyBinding: ResolvedKeyBindingPart | null, word: string): Boolean {
		if (!keyBinding) {
			return false;
		}
		if (!keyBinding.shiftKey) {
			return false;
		}
		return this.wordMatchesShiftModifier(word);
	}

	private matchesAltModifier(keyBinding: ResolvedKeyBindingPart | null, word: string): Boolean {
		if (!keyBinding) {
			return false;
		}
		if (!keyBinding.altKey) {
			return false;
		}
		return this.wordMatchesAltModifier(word);
	}

	private hasAnyMatch(keyBindingMatch: KeyBindingMatch): Boolean {
		return !!keyBindingMatch.altKey ||
			!!keyBindingMatch.ctrlKey ||
			!!keyBindingMatch.metaKey ||
			!!keyBindingMatch.shiftKey ||
			!!keyBindingMatch.keyCode;
	}

	private isCompleteMatch(part: ResolvedKeyBindingPart | null, match: KeyBindingMatch): Boolean {
		if (!part) {
			return true;
		}
		if (!match.keyCode) {
			return false;
		}
		if (part.metaKey && !match.metaKey) {
			return false;
		}
		if (part.altKey && !match.altKey) {
			return false;
		}
		if (part.ctrlKey && !match.ctrlKey) {
			return false;
		}
		if (part.shiftKey && !match.shiftKey) {
			return false;
		}
		return true;
	}

	private createCompleteMatch(part: ResolvedKeyBindingPart | null): KeyBindingMatch {
		const match: KeyBindingMatch = {};
		if (part) {
			match.keyCode = true;
			if (part.metaKey) {
				match.metaKey = true;
			}
			if (part.altKey) {
				match.altKey = true;
			}
			if (part.ctrlKey) {
				match.ctrlKey = true;
			}
			if (part.shiftKey) {
				match.shiftKey = true;
			}
		}
		return match;
	}

	private isModifier(word: string): Boolean {
		if (this.wordMatchesAltModifier(word)) {
			return true;
		}
		if (this.wordMatchesCtrlModifier(word)) {
			return true;
		}
		if (this.wordMatchesMetaModifier(word)) {
			return true;
		}
		if (this.wordMatchesShiftModifier(word)) {
			return true;
		}
		return false;
	}

	private wordMatchesAltModifier(word: string): Boolean {
		if (strings.equalsIgnoreCase(this.modifierLaBels.ui.altKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(this.modifierLaBels.aria.altKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(this.modifierLaBels.user.altKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(localize('option', "option"), word)) {
			return true;
		}
		return false;
	}

	private wordMatchesCtrlModifier(word: string): Boolean {
		if (strings.equalsIgnoreCase(this.modifierLaBels.ui.ctrlKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(this.modifierLaBels.aria.ctrlKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(this.modifierLaBels.user.ctrlKey, word)) {
			return true;
		}
		return false;
	}

	private wordMatchesMetaModifier(word: string): Boolean {
		if (strings.equalsIgnoreCase(this.modifierLaBels.ui.metaKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(this.modifierLaBels.aria.metaKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(this.modifierLaBels.user.metaKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(localize('meta', "meta"), word)) {
			return true;
		}
		return false;
	}

	private wordMatchesShiftModifier(word: string): Boolean {
		if (strings.equalsIgnoreCase(this.modifierLaBels.ui.shiftKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(this.modifierLaBels.aria.shiftKey, word)) {
			return true;
		}
		if (strings.equalsIgnoreCase(this.modifierLaBels.user.shiftKey, word)) {
			return true;
		}
		return false;
	}
}
