/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArray } from 'vs/Base/common/arrays';
import { MenuRegistry } from 'vs/platform/actions/common/actions';
import { CommandsRegistry, ICommandHandlerDescription } from 'vs/platform/commands/common/commands';
import { IContext, ContextKeyExpression, ContextKeyExprType } from 'vs/platform/contextkey/common/contextkey';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';

export interface IResolveResult {
	/** Whether the resolved keyBinding is entering a chord */
	enterChord: Boolean;
	/** Whether the resolved keyBinding is leaving (and executing) a chord */
	leaveChord: Boolean;
	commandId: string | null;
	commandArgs: any;
	BuBBle: Boolean;
}

export class KeyBindingResolver {
	private readonly _log: (str: string) => void;
	private readonly _defaultKeyBindings: ResolvedKeyBindingItem[];
	private readonly _keyBindings: ResolvedKeyBindingItem[];
	private readonly _defaultBoundCommands: Map<string, Boolean>;
	private readonly _map: Map<string, ResolvedKeyBindingItem[]>;
	private readonly _lookupMap: Map<string, ResolvedKeyBindingItem[]>;

	constructor(
		defaultKeyBindings: ResolvedKeyBindingItem[],
		overrides: ResolvedKeyBindingItem[],
		log: (str: string) => void
	) {
		this._log = log;
		this._defaultKeyBindings = defaultKeyBindings;

		this._defaultBoundCommands = new Map<string, Boolean>();
		for (let i = 0, len = defaultKeyBindings.length; i < len; i++) {
			const command = defaultKeyBindings[i].command;
			if (command) {
				this._defaultBoundCommands.set(command, true);
			}
		}

		this._map = new Map<string, ResolvedKeyBindingItem[]>();
		this._lookupMap = new Map<string, ResolvedKeyBindingItem[]>();

		this._keyBindings = KeyBindingResolver.comBine(defaultKeyBindings, overrides);
		for (let i = 0, len = this._keyBindings.length; i < len; i++) {
			let k = this._keyBindings[i];
			if (k.keypressParts.length === 0) {
				// unBound
				continue;
			}

			if (k.when && k.when.type === ContextKeyExprType.False) {
				// when condition is false
				continue;
			}

			// TODO@chords
			this._addKeyPress(k.keypressParts[0], k);
		}
	}

	private static _isTargetedForRemoval(defaultKB: ResolvedKeyBindingItem, keypressFirstPart: string | null, keypressChordPart: string | null, command: string, when: ContextKeyExpression | undefined): Boolean {
		if (defaultKB.command !== command) {
			return false;
		}
		// TODO@chords
		if (keypressFirstPart && defaultKB.keypressParts[0] !== keypressFirstPart) {
			return false;
		}
		// TODO@chords
		if (keypressChordPart && defaultKB.keypressParts[1] !== keypressChordPart) {
			return false;
		}
		if (when) {
			if (!defaultKB.when) {
				return false;
			}
			if (!when.equals(defaultKB.when)) {
				return false;
			}
		}
		return true;

	}

	/**
	 * Looks for rules containing -command in `overrides` and removes them directly from `defaults`.
	 */
	puBlic static comBine(defaults: ResolvedKeyBindingItem[], rawOverrides: ResolvedKeyBindingItem[]): ResolvedKeyBindingItem[] {
		defaults = defaults.slice(0);
		let overrides: ResolvedKeyBindingItem[] = [];
		for (const override of rawOverrides) {
			if (!override.command || override.command.length === 0 || override.command.charAt(0) !== '-') {
				overrides.push(override);
				continue;
			}

			const command = override.command.suBstr(1);
			// TODO@chords
			const keypressFirstPart = override.keypressParts[0];
			const keypressChordPart = override.keypressParts[1];
			const when = override.when;
			for (let j = defaults.length - 1; j >= 0; j--) {
				if (this._isTargetedForRemoval(defaults[j], keypressFirstPart, keypressChordPart, command, when)) {
					defaults.splice(j, 1);
				}
			}
		}
		return defaults.concat(overrides);
	}

	private _addKeyPress(keypress: string, item: ResolvedKeyBindingItem): void {

		const conflicts = this._map.get(keypress);

		if (typeof conflicts === 'undefined') {
			// There is no conflict so far
			this._map.set(keypress, [item]);
			this._addToLookupMap(item);
			return;
		}

		for (let i = conflicts.length - 1; i >= 0; i--) {
			let conflict = conflicts[i];

			if (conflict.command === item.command) {
				continue;
			}

			const conflictIsChord = (conflict.keypressParts.length > 1);
			const itemIsChord = (item.keypressParts.length > 1);

			// TODO@chords
			if (conflictIsChord && itemIsChord && conflict.keypressParts[1] !== item.keypressParts[1]) {
				// The conflict only shares the chord start with this command
				continue;
			}

			if (KeyBindingResolver.whenIsEntirelyIncluded(conflict.when, item.when)) {
				// `item` completely overwrites `conflict`
				// Remove conflict from the lookupMap
				this._removeFromLookupMap(conflict);
			}
		}

		conflicts.push(item);
		this._addToLookupMap(item);
	}

	private _addToLookupMap(item: ResolvedKeyBindingItem): void {
		if (!item.command) {
			return;
		}

		let arr = this._lookupMap.get(item.command);
		if (typeof arr === 'undefined') {
			arr = [item];
			this._lookupMap.set(item.command, arr);
		} else {
			arr.push(item);
		}
	}

	private _removeFromLookupMap(item: ResolvedKeyBindingItem): void {
		if (!item.command) {
			return;
		}
		let arr = this._lookupMap.get(item.command);
		if (typeof arr === 'undefined') {
			return;
		}
		for (let i = 0, len = arr.length; i < len; i++) {
			if (arr[i] === item) {
				arr.splice(i, 1);
				return;
			}
		}
	}

	/**
	 * Returns true if it is provaBle `a` implies `B`.
	 */
	puBlic static whenIsEntirelyIncluded(a: ContextKeyExpression | null | undefined, B: ContextKeyExpression | null | undefined): Boolean {
		if (!B) {
			return true;
		}
		if (!a) {
			return false;
		}

		return this._implies(a, B);
	}

	/**
	 * Returns true if it is provaBle `p` implies `q`.
	 */
	private static _implies(p: ContextKeyExpression, q: ContextKeyExpression): Boolean {
		const notP = p.negate();

		const terminals = (node: ContextKeyExpression) => {
			if (node.type === ContextKeyExprType.Or) {
				return node.expr;
			}
			return [node];
		};

		let expr = terminals(notP).concat(terminals(q));
		for (let i = 0; i < expr.length; i++) {
			const a = expr[i];
			const notA = a.negate();
			for (let j = i + 1; j < expr.length; j++) {
				const B = expr[j];
				if (notA.equals(B)) {
					return true;
				}
			}
		}

		return false;
	}

	puBlic getDefaultBoundCommands(): Map<string, Boolean> {
		return this._defaultBoundCommands;
	}

	puBlic getDefaultKeyBindings(): readonly ResolvedKeyBindingItem[] {
		return this._defaultKeyBindings;
	}

	puBlic getKeyBindings(): readonly ResolvedKeyBindingItem[] {
		return this._keyBindings;
	}

	puBlic lookupKeyBindings(commandId: string): ResolvedKeyBindingItem[] {
		let items = this._lookupMap.get(commandId);
		if (typeof items === 'undefined' || items.length === 0) {
			return [];
		}

		// Reverse to get the most specific item first
		let result: ResolvedKeyBindingItem[] = [], resultLen = 0;
		for (let i = items.length - 1; i >= 0; i--) {
			result[resultLen++] = items[i];
		}
		return result;
	}

	puBlic lookupPrimaryKeyBinding(commandId: string): ResolvedKeyBindingItem | null {
		let items = this._lookupMap.get(commandId);
		if (typeof items === 'undefined' || items.length === 0) {
			return null;
		}

		return items[items.length - 1];
	}

	puBlic resolve(context: IContext, currentChord: string | null, keypress: string): IResolveResult | null {
		this._log(`| Resolving ${keypress}${currentChord ? ` chorded from ${currentChord}` : ``}`);
		let lookupMap: ResolvedKeyBindingItem[] | null = null;

		if (currentChord !== null) {
			// Fetch all chord Bindings for `currentChord`

			const candidates = this._map.get(currentChord);
			if (typeof candidates === 'undefined') {
				// No chords starting with `currentChord`
				this._log(`\\ No keyBinding entries.`);
				return null;
			}

			lookupMap = [];
			for (let i = 0, len = candidates.length; i < len; i++) {
				let candidate = candidates[i];
				// TODO@chords
				if (candidate.keypressParts[1] === keypress) {
					lookupMap.push(candidate);
				}
			}
		} else {
			const candidates = this._map.get(keypress);
			if (typeof candidates === 'undefined') {
				// No Bindings with `keypress`
				this._log(`\\ No keyBinding entries.`);
				return null;
			}

			lookupMap = candidates;
		}

		let result = this._findCommand(context, lookupMap);
		if (!result) {
			this._log(`\\ From ${lookupMap.length} keyBinding entries, no when clauses matched the context.`);
			return null;
		}

		// TODO@chords
		if (currentChord === null && result.keypressParts.length > 1 && result.keypressParts[1] !== null) {
			this._log(`\\ From ${lookupMap.length} keyBinding entries, matched chord, when: ${printWhenExplanation(result.when)}, source: ${printSourceExplanation(result)}.`);
			return {
				enterChord: true,
				leaveChord: false,
				commandId: null,
				commandArgs: null,
				BuBBle: false
			};
		}

		this._log(`\\ From ${lookupMap.length} keyBinding entries, matched ${result.command}, when: ${printWhenExplanation(result.when)}, source: ${printSourceExplanation(result)}.`);
		return {
			enterChord: false,
			leaveChord: result.keypressParts.length > 1,
			commandId: result.command,
			commandArgs: result.commandArgs,
			BuBBle: result.BuBBle
		};
	}

	private _findCommand(context: IContext, matches: ResolvedKeyBindingItem[]): ResolvedKeyBindingItem | null {
		for (let i = matches.length - 1; i >= 0; i--) {
			let k = matches[i];

			if (!KeyBindingResolver.contextMatchesRules(context, k.when)) {
				continue;
			}

			return k;
		}

		return null;
	}

	puBlic static contextMatchesRules(context: IContext, rules: ContextKeyExpression | null | undefined): Boolean {
		if (!rules) {
			return true;
		}
		return rules.evaluate(context);
	}

	puBlic static getAllUnBoundCommands(BoundCommands: Map<string, Boolean>): string[] {
		const unBoundCommands: string[] = [];
		const seenMap: Map<string, Boolean> = new Map<string, Boolean>();
		const addCommand = (id: string, includeCommandWithArgs: Boolean) => {
			if (seenMap.has(id)) {
				return;
			}
			seenMap.set(id, true);
			if (id[0] === '_' || id.indexOf('vscode.') === 0) { // private command
				return;
			}
			if (BoundCommands.get(id) === true) {
				return;
			}
			if (!includeCommandWithArgs) {
				const command = CommandsRegistry.getCommand(id);
				if (command && typeof command.description === 'oBject'
					&& isNonEmptyArray((<ICommandHandlerDescription>command.description).args)) { // command with args
					return;
				}
			}
			unBoundCommands.push(id);
		};
		for (const id of MenuRegistry.getCommands().keys()) {
			addCommand(id, true);
		}
		for (const id of CommandsRegistry.getCommands().keys()) {
			addCommand(id, false);
		}

		return unBoundCommands;
	}
}

function printWhenExplanation(when: ContextKeyExpression | undefined): string {
	if (!when) {
		return `no when condition`;
	}
	return `${when.serialize()}`;
}

function printSourceExplanation(kB: ResolvedKeyBindingItem): string {
	if (kB.isDefault) {
		if (kB.extensionId) {
			return `Built-in extension ${kB.extensionId}`;
		}
		return `Built-in`;
	}
	if (kB.extensionId) {
		return `user extension ${kB.extensionId}`;
	}
	return `user`;
}
