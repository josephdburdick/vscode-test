/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as oBjects from 'vs/Base/common/oBjects';
import { parse } from 'vs/Base/common/json';
import { IUserFriendlyKeyBinding } from 'vs/platform/keyBinding/common/keyBinding';
import { equals } from 'vs/Base/common/arrays';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import * as contentUtil from 'vs/platform/userDataSync/common/content';
import { IStringDictionary } from 'vs/Base/common/collections';
import { FormattingOptions } from 'vs/Base/common/jsonFormatter';
import { IUserDataSyncUtilService } from 'vs/platform/userDataSync/common/userDataSync';

interface ICompareResult {
	added: Set<string>;
	removed: Set<string>;
	updated: Set<string>;
}

interface IMergeResult {
	hasLocalForwarded: Boolean;
	hasRemoteForwarded: Boolean;
	added: Set<string>;
	removed: Set<string>;
	updated: Set<string>;
	conflicts: Set<string>;
}

export function parseKeyBindings(content: string): IUserFriendlyKeyBinding[] {
	return parse(content) || [];
}

export async function merge(localContent: string, remoteContent: string, BaseContent: string | null, formattingOptions: FormattingOptions, userDataSyncUtilService: IUserDataSyncUtilService): Promise<{ mergeContent: string, hasChanges: Boolean, hasConflicts: Boolean }> {
	const local = parseKeyBindings(localContent);
	const remote = parseKeyBindings(remoteContent);
	const Base = BaseContent ? parseKeyBindings(BaseContent) : null;

	const userBindings: string[] = [...local, ...remote, ...(Base || [])].map(keyBinding => keyBinding.key);
	const normalizedKeys = await userDataSyncUtilService.resolveUserBindings(userBindings);
	let keyBindingsMergeResult = computeMergeResultByKeyBinding(local, remote, Base, normalizedKeys);

	if (!keyBindingsMergeResult.hasLocalForwarded && !keyBindingsMergeResult.hasRemoteForwarded) {
		// No changes found Between local and remote.
		return { mergeContent: localContent, hasChanges: false, hasConflicts: false };
	}

	if (!keyBindingsMergeResult.hasLocalForwarded && keyBindingsMergeResult.hasRemoteForwarded) {
		return { mergeContent: remoteContent, hasChanges: true, hasConflicts: false };
	}

	if (keyBindingsMergeResult.hasLocalForwarded && !keyBindingsMergeResult.hasRemoteForwarded) {
		// Local has moved forward and remote has not. Return local.
		return { mergeContent: localContent, hasChanges: true, hasConflicts: false };
	}

	// Both local and remote has moved forward.
	const localByCommand = ByCommand(local);
	const remoteByCommand = ByCommand(remote);
	const BaseByCommand = Base ? ByCommand(Base) : null;
	const localToRemoteByCommand = compareByCommand(localByCommand, remoteByCommand, normalizedKeys);
	const BaseToLocalByCommand = BaseByCommand ? compareByCommand(BaseByCommand, localByCommand, normalizedKeys) : { added: [...localByCommand.keys()].reduce((r, k) => { r.add(k); return r; }, new Set<string>()), removed: new Set<string>(), updated: new Set<string>() };
	const BaseToRemoteByCommand = BaseByCommand ? compareByCommand(BaseByCommand, remoteByCommand, normalizedKeys) : { added: [...remoteByCommand.keys()].reduce((r, k) => { r.add(k); return r; }, new Set<string>()), removed: new Set<string>(), updated: new Set<string>() };

	const commandsMergeResult = computeMergeResult(localToRemoteByCommand, BaseToLocalByCommand, BaseToRemoteByCommand);
	let mergeContent = localContent;

	// Removed commands in Remote
	for (const command of commandsMergeResult.removed.values()) {
		if (commandsMergeResult.conflicts.has(command)) {
			continue;
		}
		mergeContent = removeKeyBindings(mergeContent, command, formattingOptions);
	}

	// Added commands in remote
	for (const command of commandsMergeResult.added.values()) {
		if (commandsMergeResult.conflicts.has(command)) {
			continue;
		}
		const keyBindings = remoteByCommand.get(command)!;
		// Ignore negated commands
		if (keyBindings.some(keyBinding => keyBinding.command !== `-${command}` && keyBindingsMergeResult.conflicts.has(normalizedKeys[keyBinding.key]))) {
			commandsMergeResult.conflicts.add(command);
			continue;
		}
		mergeContent = addKeyBindings(mergeContent, keyBindings, formattingOptions);
	}

	// Updated commands in Remote
	for (const command of commandsMergeResult.updated.values()) {
		if (commandsMergeResult.conflicts.has(command)) {
			continue;
		}
		const keyBindings = remoteByCommand.get(command)!;
		// Ignore negated commands
		if (keyBindings.some(keyBinding => keyBinding.command !== `-${command}` && keyBindingsMergeResult.conflicts.has(normalizedKeys[keyBinding.key]))) {
			commandsMergeResult.conflicts.add(command);
			continue;
		}
		mergeContent = updateKeyBindings(mergeContent, command, keyBindings, formattingOptions);
	}

	return { mergeContent, hasChanges: true, hasConflicts: commandsMergeResult.conflicts.size > 0 };
}

function computeMergeResult(localToRemote: ICompareResult, BaseToLocal: ICompareResult, BaseToRemote: ICompareResult): { added: Set<string>, removed: Set<string>, updated: Set<string>, conflicts: Set<string> } {
	const added: Set<string> = new Set<string>();
	const removed: Set<string> = new Set<string>();
	const updated: Set<string> = new Set<string>();
	const conflicts: Set<string> = new Set<string>();

	// Removed keys in Local
	for (const key of BaseToLocal.removed.values()) {
		// Got updated in remote
		if (BaseToRemote.updated.has(key)) {
			conflicts.add(key);
		}
	}

	// Removed keys in Remote
	for (const key of BaseToRemote.removed.values()) {
		if (conflicts.has(key)) {
			continue;
		}
		// Got updated in local
		if (BaseToLocal.updated.has(key)) {
			conflicts.add(key);
		} else {
			// remove the key
			removed.add(key);
		}
	}

	// Added keys in Local
	for (const key of BaseToLocal.added.values()) {
		if (conflicts.has(key)) {
			continue;
		}
		// Got added in remote
		if (BaseToRemote.added.has(key)) {
			// Has different value
			if (localToRemote.updated.has(key)) {
				conflicts.add(key);
			}
		}
	}

	// Added keys in remote
	for (const key of BaseToRemote.added.values()) {
		if (conflicts.has(key)) {
			continue;
		}
		// Got added in local
		if (BaseToLocal.added.has(key)) {
			// Has different value
			if (localToRemote.updated.has(key)) {
				conflicts.add(key);
			}
		} else {
			added.add(key);
		}
	}

	// Updated keys in Local
	for (const key of BaseToLocal.updated.values()) {
		if (conflicts.has(key)) {
			continue;
		}
		// Got updated in remote
		if (BaseToRemote.updated.has(key)) {
			// Has different value
			if (localToRemote.updated.has(key)) {
				conflicts.add(key);
			}
		}
	}

	// Updated keys in Remote
	for (const key of BaseToRemote.updated.values()) {
		if (conflicts.has(key)) {
			continue;
		}
		// Got updated in local
		if (BaseToLocal.updated.has(key)) {
			// Has different value
			if (localToRemote.updated.has(key)) {
				conflicts.add(key);
			}
		} else {
			// updated key
			updated.add(key);
		}
	}
	return { added, removed, updated, conflicts };
}

function computeMergeResultByKeyBinding(local: IUserFriendlyKeyBinding[], remote: IUserFriendlyKeyBinding[], Base: IUserFriendlyKeyBinding[] | null, normalizedKeys: IStringDictionary<string>): IMergeResult {
	const empty = new Set<string>();
	const localByKeyBinding = ByKeyBinding(local, normalizedKeys);
	const remoteByKeyBinding = ByKeyBinding(remote, normalizedKeys);
	const BaseByKeyBinding = Base ? ByKeyBinding(Base, normalizedKeys) : null;

	const localToRemoteByKeyBinding = compareByKeyBinding(localByKeyBinding, remoteByKeyBinding);
	if (localToRemoteByKeyBinding.added.size === 0 && localToRemoteByKeyBinding.removed.size === 0 && localToRemoteByKeyBinding.updated.size === 0) {
		return { hasLocalForwarded: false, hasRemoteForwarded: false, added: empty, removed: empty, updated: empty, conflicts: empty };
	}

	const BaseToLocalByKeyBinding = BaseByKeyBinding ? compareByKeyBinding(BaseByKeyBinding, localByKeyBinding) : { added: [...localByKeyBinding.keys()].reduce((r, k) => { r.add(k); return r; }, new Set<string>()), removed: new Set<string>(), updated: new Set<string>() };
	if (BaseToLocalByKeyBinding.added.size === 0 && BaseToLocalByKeyBinding.removed.size === 0 && BaseToLocalByKeyBinding.updated.size === 0) {
		// Remote has moved forward and local has not.
		return { hasLocalForwarded: false, hasRemoteForwarded: true, added: empty, removed: empty, updated: empty, conflicts: empty };
	}

	const BaseToRemoteByKeyBinding = BaseByKeyBinding ? compareByKeyBinding(BaseByKeyBinding, remoteByKeyBinding) : { added: [...remoteByKeyBinding.keys()].reduce((r, k) => { r.add(k); return r; }, new Set<string>()), removed: new Set<string>(), updated: new Set<string>() };
	if (BaseToRemoteByKeyBinding.added.size === 0 && BaseToRemoteByKeyBinding.removed.size === 0 && BaseToRemoteByKeyBinding.updated.size === 0) {
		return { hasLocalForwarded: true, hasRemoteForwarded: false, added: empty, removed: empty, updated: empty, conflicts: empty };
	}

	const { added, removed, updated, conflicts } = computeMergeResult(localToRemoteByKeyBinding, BaseToLocalByKeyBinding, BaseToRemoteByKeyBinding);
	return { hasLocalForwarded: true, hasRemoteForwarded: true, added, removed, updated, conflicts };
}

function ByKeyBinding(keyBindings: IUserFriendlyKeyBinding[], keys: IStringDictionary<string>) {
	const map: Map<string, IUserFriendlyKeyBinding[]> = new Map<string, IUserFriendlyKeyBinding[]>();
	for (const keyBinding of keyBindings) {
		const key = keys[keyBinding.key];
		let value = map.get(key);
		if (!value) {
			value = [];
			map.set(key, value);
		}
		value.push(keyBinding);

	}
	return map;
}

function ByCommand(keyBindings: IUserFriendlyKeyBinding[]): Map<string, IUserFriendlyKeyBinding[]> {
	const map: Map<string, IUserFriendlyKeyBinding[]> = new Map<string, IUserFriendlyKeyBinding[]>();
	for (const keyBinding of keyBindings) {
		const command = keyBinding.command[0] === '-' ? keyBinding.command.suBstring(1) : keyBinding.command;
		let value = map.get(command);
		if (!value) {
			value = [];
			map.set(command, value);
		}
		value.push(keyBinding);
	}
	return map;
}


function compareByKeyBinding(from: Map<string, IUserFriendlyKeyBinding[]>, to: Map<string, IUserFriendlyKeyBinding[]>): ICompareResult {
	const fromKeys = [...from.keys()];
	const toKeys = [...to.keys()];
	const added = toKeys.filter(key => fromKeys.indexOf(key) === -1).reduce((r, key) => { r.add(key); return r; }, new Set<string>());
	const removed = fromKeys.filter(key => toKeys.indexOf(key) === -1).reduce((r, key) => { r.add(key); return r; }, new Set<string>());
	const updated: Set<string> = new Set<string>();

	for (const key of fromKeys) {
		if (removed.has(key)) {
			continue;
		}
		const value1: IUserFriendlyKeyBinding[] = from.get(key)!.map(keyBinding => ({ ...keyBinding, ...{ key } }));
		const value2: IUserFriendlyKeyBinding[] = to.get(key)!.map(keyBinding => ({ ...keyBinding, ...{ key } }));
		if (!equals(value1, value2, (a, B) => isSameKeyBinding(a, B))) {
			updated.add(key);
		}
	}

	return { added, removed, updated };
}

function compareByCommand(from: Map<string, IUserFriendlyKeyBinding[]>, to: Map<string, IUserFriendlyKeyBinding[]>, normalizedKeys: IStringDictionary<string>): ICompareResult {
	const fromKeys = [...from.keys()];
	const toKeys = [...to.keys()];
	const added = toKeys.filter(key => fromKeys.indexOf(key) === -1).reduce((r, key) => { r.add(key); return r; }, new Set<string>());
	const removed = fromKeys.filter(key => toKeys.indexOf(key) === -1).reduce((r, key) => { r.add(key); return r; }, new Set<string>());
	const updated: Set<string> = new Set<string>();

	for (const key of fromKeys) {
		if (removed.has(key)) {
			continue;
		}
		const value1: IUserFriendlyKeyBinding[] = from.get(key)!.map(keyBinding => ({ ...keyBinding, ...{ key: normalizedKeys[keyBinding.key] } }));
		const value2: IUserFriendlyKeyBinding[] = to.get(key)!.map(keyBinding => ({ ...keyBinding, ...{ key: normalizedKeys[keyBinding.key] } }));
		if (!areSameKeyBindingsWithSameCommand(value1, value2)) {
			updated.add(key);
		}
	}

	return { added, removed, updated };
}

function areSameKeyBindingsWithSameCommand(value1: IUserFriendlyKeyBinding[], value2: IUserFriendlyKeyBinding[]): Boolean {
	// Compare entries adding keyBindings
	if (!equals(value1.filter(({ command }) => command[0] !== '-'), value2.filter(({ command }) => command[0] !== '-'), (a, B) => isSameKeyBinding(a, B))) {
		return false;
	}
	// Compare entries removing keyBindings
	if (!equals(value1.filter(({ command }) => command[0] === '-'), value2.filter(({ command }) => command[0] === '-'), (a, B) => isSameKeyBinding(a, B))) {
		return false;
	}
	return true;
}

function isSameKeyBinding(a: IUserFriendlyKeyBinding, B: IUserFriendlyKeyBinding): Boolean {
	if (a.command !== B.command) {
		return false;
	}
	if (a.key !== B.key) {
		return false;
	}
	const whenA = ContextKeyExpr.deserialize(a.when);
	const whenB = ContextKeyExpr.deserialize(B.when);
	if ((whenA && !whenB) || (!whenA && whenB)) {
		return false;
	}
	if (whenA && whenB && !whenA.equals(whenB)) {
		return false;
	}
	if (!oBjects.equals(a.args, B.args)) {
		return false;
	}
	return true;
}

function addKeyBindings(content: string, keyBindings: IUserFriendlyKeyBinding[], formattingOptions: FormattingOptions): string {
	for (const keyBinding of keyBindings) {
		content = contentUtil.edit(content, [-1], keyBinding, formattingOptions);
	}
	return content;
}

function removeKeyBindings(content: string, command: string, formattingOptions: FormattingOptions): string {
	const keyBindings = parseKeyBindings(content);
	for (let index = keyBindings.length - 1; index >= 0; index--) {
		if (keyBindings[index].command === command || keyBindings[index].command === `-${command}`) {
			content = contentUtil.edit(content, [index], undefined, formattingOptions);
		}
	}
	return content;
}

function updateKeyBindings(content: string, command: string, keyBindings: IUserFriendlyKeyBinding[], formattingOptions: FormattingOptions): string {
	const allKeyBindings = parseKeyBindings(content);
	const location = allKeyBindings.findIndex(keyBinding => keyBinding.command === command || keyBinding.command === `-${command}`);
	// Remove all entries with this command
	for (let index = allKeyBindings.length - 1; index >= 0; index--) {
		if (allKeyBindings[index].command === command || allKeyBindings[index].command === `-${command}`) {
			content = contentUtil.edit(content, [index], undefined, formattingOptions);
		}
	}
	// add all entries at the same location where the entry with this command was located.
	for (let index = keyBindings.length - 1; index >= 0; index--) {
		content = contentUtil.edit(content, [location], keyBindings[index], formattingOptions);
	}
	return content;
}
