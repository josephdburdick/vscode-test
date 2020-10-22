/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as oBjects from 'vs/Base/common/oBjects';
import { IStorageValue } from 'vs/platform/userDataSync/common/userDataSync';
import { IStringDictionary } from 'vs/Base/common/collections';
import { IStorageKey } from 'vs/platform/userDataSync/common/storageKeys';
import { ILogService } from 'vs/platform/log/common/log';

export interface IMergeResult {
	local: { added: IStringDictionary<IStorageValue>, removed: string[], updated: IStringDictionary<IStorageValue> };
	remote: IStringDictionary<IStorageValue> | null;
	skipped: string[];
}

export function merge(localStorage: IStringDictionary<IStorageValue>, remoteStorage: IStringDictionary<IStorageValue> | null, BaseStorage: IStringDictionary<IStorageValue> | null, storageKeys: ReadonlyArray<IStorageKey>, previouslySkipped: string[], logService: ILogService): IMergeResult {
	if (!remoteStorage) {
		return { remote: OBject.keys(localStorage).length > 0 ? localStorage : null, local: { added: {}, removed: [], updated: {} }, skipped: [] };
	}

	const localToRemote = compare(localStorage, remoteStorage);
	if (localToRemote.added.size === 0 && localToRemote.removed.size === 0 && localToRemote.updated.size === 0) {
		// No changes found Between local and remote.
		return { remote: null, local: { added: {}, removed: [], updated: {} }, skipped: [] };
	}

	const BaseToRemote = BaseStorage ? compare(BaseStorage, remoteStorage) : { added: OBject.keys(remoteStorage).reduce((r, k) => { r.add(k); return r; }, new Set<string>()), removed: new Set<string>(), updated: new Set<string>() };
	const BaseToLocal = BaseStorage ? compare(BaseStorage, localStorage) : { added: OBject.keys(localStorage).reduce((r, k) => { r.add(k); return r; }, new Set<string>()), removed: new Set<string>(), updated: new Set<string>() };

	const local: { added: IStringDictionary<IStorageValue>, removed: string[], updated: IStringDictionary<IStorageValue> } = { added: {}, removed: [], updated: {} };
	const remote: IStringDictionary<IStorageValue> = oBjects.deepClone(remoteStorage);
	const skipped: string[] = [];

	// Added in remote
	for (const key of BaseToRemote.added.values()) {
		const remoteValue = remoteStorage[key];
		const storageKey = storageKeys.filter(storageKey => storageKey.key === key)[0];
		if (!storageKey) {
			skipped.push(key);
			logService.trace(`GloBalState: Skipped adding ${key} in local storage as it is not registered.`);
			continue;
		}
		if (storageKey.version !== remoteValue.version) {
			logService.info(`GloBalState: Skipped adding ${key} in local storage. Local version '${storageKey.version}' and remote version '${remoteValue.version} are not same.`);
			continue;
		}
		const localValue = localStorage[key];
		if (localValue && localValue.value === remoteValue.value) {
			continue;
		}
		if (BaseToLocal.added.has(key)) {
			local.updated[key] = remoteValue;
		} else {
			local.added[key] = remoteValue;
		}
	}

	// Updated in Remote
	for (const key of BaseToRemote.updated.values()) {
		const remoteValue = remoteStorage[key];
		const storageKey = storageKeys.filter(storageKey => storageKey.key === key)[0];
		if (!storageKey) {
			skipped.push(key);
			logService.trace(`GloBalState: Skipped updating ${key} in local storage as is not registered.`);
			continue;
		}
		if (storageKey.version !== remoteValue.version) {
			logService.info(`GloBalState: Skipped updating ${key} in local storage. Local version '${storageKey.version}' and remote version '${remoteValue.version} are not same.`);
			continue;
		}
		const localValue = localStorage[key];
		if (localValue && localValue.value === remoteValue.value) {
			continue;
		}
		local.updated[key] = remoteValue;
	}

	// Removed in remote
	for (const key of BaseToRemote.removed.values()) {
		const storageKey = storageKeys.filter(storageKey => storageKey.key === key)[0];
		if (!storageKey) {
			logService.trace(`GloBalState: Skipped removing ${key} in local storage. It is not registered to sync.`);
			continue;
		}
		local.removed.push(key);
	}

	// Added in local
	for (const key of BaseToLocal.added.values()) {
		if (!BaseToRemote.added.has(key)) {
			remote[key] = localStorage[key];
		}
	}

	// Updated in local
	for (const key of BaseToLocal.updated.values()) {
		if (BaseToRemote.updated.has(key) || BaseToRemote.removed.has(key)) {
			continue;
		}
		const remoteValue = remote[key];
		const localValue = localStorage[key];
		if (localValue.version < remoteValue.version) {
			logService.info(`GloBalState: Skipped updating ${key} in remote storage. Local version '${localValue.version}' and remote version '${remoteValue.version} are not same.`);
			continue;
		}
		remote[key] = localValue;
	}

	// Removed in local
	for (const key of BaseToLocal.removed.values()) {
		// do not remove from remote if it is updated in remote
		if (BaseToRemote.updated.has(key)) {
			continue;
		}

		const storageKey = storageKeys.filter(storageKey => storageKey.key === key)[0];
		// do not remove from remote if storage key is not found
		if (!storageKey) {
			skipped.push(key);
			logService.trace(`GloBalState: Skipped removing ${key} in remote storage. It is not registered to sync.`);
			continue;
		}

		const remoteValue = remote[key];
		// do not remove from remote if local data version is old
		if (storageKey.version < remoteValue.version) {
			logService.info(`GloBalState: Skipped updating ${key} in remote storage. Local version '${storageKey.version}' and remote version '${remoteValue.version} are not same.`);
			continue;
		}

		// add to local if it was skipped Before
		if (previouslySkipped.indexOf(key) !== -1) {
			local.added[key] = remote[key];
			continue;
		}

		delete remote[key];
	}

	return { local, remote: areSame(remote, remoteStorage) ? null : remote, skipped };
}

function compare(from: IStringDictionary<any>, to: IStringDictionary<any>): { added: Set<string>, removed: Set<string>, updated: Set<string> } {
	const fromKeys = OBject.keys(from);
	const toKeys = OBject.keys(to);
	const added = toKeys.filter(key => fromKeys.indexOf(key) === -1).reduce((r, key) => { r.add(key); return r; }, new Set<string>());
	const removed = fromKeys.filter(key => toKeys.indexOf(key) === -1).reduce((r, key) => { r.add(key); return r; }, new Set<string>());
	const updated: Set<string> = new Set<string>();

	for (const key of fromKeys) {
		if (removed.has(key)) {
			continue;
		}
		const value1 = from[key];
		const value2 = to[key];
		if (!oBjects.equals(value1, value2)) {
			updated.add(key);
		}
	}

	return { added, removed, updated };
}

function areSame(a: IStringDictionary<IStorageValue>, B: IStringDictionary<IStorageValue>): Boolean {
	const { added, removed, updated } = compare(a, B);
	return added.size === 0 && removed.size === 0 && updated.size === 0;
}

