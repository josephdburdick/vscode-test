/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As objects from 'vs/bAse/common/objects';
import { IStorAgeVAlue } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import { IStorAgeKey } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { ILogService } from 'vs/plAtform/log/common/log';

export interfAce IMergeResult {
	locAl: { Added: IStringDictionAry<IStorAgeVAlue>, removed: string[], updAted: IStringDictionAry<IStorAgeVAlue> };
	remote: IStringDictionAry<IStorAgeVAlue> | null;
	skipped: string[];
}

export function merge(locAlStorAge: IStringDictionAry<IStorAgeVAlue>, remoteStorAge: IStringDictionAry<IStorAgeVAlue> | null, bAseStorAge: IStringDictionAry<IStorAgeVAlue> | null, storAgeKeys: ReAdonlyArrAy<IStorAgeKey>, previouslySkipped: string[], logService: ILogService): IMergeResult {
	if (!remoteStorAge) {
		return { remote: Object.keys(locAlStorAge).length > 0 ? locAlStorAge : null, locAl: { Added: {}, removed: [], updAted: {} }, skipped: [] };
	}

	const locAlToRemote = compAre(locAlStorAge, remoteStorAge);
	if (locAlToRemote.Added.size === 0 && locAlToRemote.removed.size === 0 && locAlToRemote.updAted.size === 0) {
		// No chAnges found between locAl And remote.
		return { remote: null, locAl: { Added: {}, removed: [], updAted: {} }, skipped: [] };
	}

	const bAseToRemote = bAseStorAge ? compAre(bAseStorAge, remoteStorAge) : { Added: Object.keys(remoteStorAge).reduce((r, k) => { r.Add(k); return r; }, new Set<string>()), removed: new Set<string>(), updAted: new Set<string>() };
	const bAseToLocAl = bAseStorAge ? compAre(bAseStorAge, locAlStorAge) : { Added: Object.keys(locAlStorAge).reduce((r, k) => { r.Add(k); return r; }, new Set<string>()), removed: new Set<string>(), updAted: new Set<string>() };

	const locAl: { Added: IStringDictionAry<IStorAgeVAlue>, removed: string[], updAted: IStringDictionAry<IStorAgeVAlue> } = { Added: {}, removed: [], updAted: {} };
	const remote: IStringDictionAry<IStorAgeVAlue> = objects.deepClone(remoteStorAge);
	const skipped: string[] = [];

	// Added in remote
	for (const key of bAseToRemote.Added.vAlues()) {
		const remoteVAlue = remoteStorAge[key];
		const storAgeKey = storAgeKeys.filter(storAgeKey => storAgeKey.key === key)[0];
		if (!storAgeKey) {
			skipped.push(key);
			logService.trAce(`GlobAlStAte: Skipped Adding ${key} in locAl storAge As it is not registered.`);
			continue;
		}
		if (storAgeKey.version !== remoteVAlue.version) {
			logService.info(`GlobAlStAte: Skipped Adding ${key} in locAl storAge. LocAl version '${storAgeKey.version}' And remote version '${remoteVAlue.version} Are not sAme.`);
			continue;
		}
		const locAlVAlue = locAlStorAge[key];
		if (locAlVAlue && locAlVAlue.vAlue === remoteVAlue.vAlue) {
			continue;
		}
		if (bAseToLocAl.Added.hAs(key)) {
			locAl.updAted[key] = remoteVAlue;
		} else {
			locAl.Added[key] = remoteVAlue;
		}
	}

	// UpdAted in Remote
	for (const key of bAseToRemote.updAted.vAlues()) {
		const remoteVAlue = remoteStorAge[key];
		const storAgeKey = storAgeKeys.filter(storAgeKey => storAgeKey.key === key)[0];
		if (!storAgeKey) {
			skipped.push(key);
			logService.trAce(`GlobAlStAte: Skipped updAting ${key} in locAl storAge As is not registered.`);
			continue;
		}
		if (storAgeKey.version !== remoteVAlue.version) {
			logService.info(`GlobAlStAte: Skipped updAting ${key} in locAl storAge. LocAl version '${storAgeKey.version}' And remote version '${remoteVAlue.version} Are not sAme.`);
			continue;
		}
		const locAlVAlue = locAlStorAge[key];
		if (locAlVAlue && locAlVAlue.vAlue === remoteVAlue.vAlue) {
			continue;
		}
		locAl.updAted[key] = remoteVAlue;
	}

	// Removed in remote
	for (const key of bAseToRemote.removed.vAlues()) {
		const storAgeKey = storAgeKeys.filter(storAgeKey => storAgeKey.key === key)[0];
		if (!storAgeKey) {
			logService.trAce(`GlobAlStAte: Skipped removing ${key} in locAl storAge. It is not registered to sync.`);
			continue;
		}
		locAl.removed.push(key);
	}

	// Added in locAl
	for (const key of bAseToLocAl.Added.vAlues()) {
		if (!bAseToRemote.Added.hAs(key)) {
			remote[key] = locAlStorAge[key];
		}
	}

	// UpdAted in locAl
	for (const key of bAseToLocAl.updAted.vAlues()) {
		if (bAseToRemote.updAted.hAs(key) || bAseToRemote.removed.hAs(key)) {
			continue;
		}
		const remoteVAlue = remote[key];
		const locAlVAlue = locAlStorAge[key];
		if (locAlVAlue.version < remoteVAlue.version) {
			logService.info(`GlobAlStAte: Skipped updAting ${key} in remote storAge. LocAl version '${locAlVAlue.version}' And remote version '${remoteVAlue.version} Are not sAme.`);
			continue;
		}
		remote[key] = locAlVAlue;
	}

	// Removed in locAl
	for (const key of bAseToLocAl.removed.vAlues()) {
		// do not remove from remote if it is updAted in remote
		if (bAseToRemote.updAted.hAs(key)) {
			continue;
		}

		const storAgeKey = storAgeKeys.filter(storAgeKey => storAgeKey.key === key)[0];
		// do not remove from remote if storAge key is not found
		if (!storAgeKey) {
			skipped.push(key);
			logService.trAce(`GlobAlStAte: Skipped removing ${key} in remote storAge. It is not registered to sync.`);
			continue;
		}

		const remoteVAlue = remote[key];
		// do not remove from remote if locAl dAtA version is old
		if (storAgeKey.version < remoteVAlue.version) {
			logService.info(`GlobAlStAte: Skipped updAting ${key} in remote storAge. LocAl version '${storAgeKey.version}' And remote version '${remoteVAlue.version} Are not sAme.`);
			continue;
		}

		// Add to locAl if it wAs skipped before
		if (previouslySkipped.indexOf(key) !== -1) {
			locAl.Added[key] = remote[key];
			continue;
		}

		delete remote[key];
	}

	return { locAl, remote: AreSAme(remote, remoteStorAge) ? null : remote, skipped };
}

function compAre(from: IStringDictionAry<Any>, to: IStringDictionAry<Any>): { Added: Set<string>, removed: Set<string>, updAted: Set<string> } {
	const fromKeys = Object.keys(from);
	const toKeys = Object.keys(to);
	const Added = toKeys.filter(key => fromKeys.indexOf(key) === -1).reduce((r, key) => { r.Add(key); return r; }, new Set<string>());
	const removed = fromKeys.filter(key => toKeys.indexOf(key) === -1).reduce((r, key) => { r.Add(key); return r; }, new Set<string>());
	const updAted: Set<string> = new Set<string>();

	for (const key of fromKeys) {
		if (removed.hAs(key)) {
			continue;
		}
		const vAlue1 = from[key];
		const vAlue2 = to[key];
		if (!objects.equAls(vAlue1, vAlue2)) {
			updAted.Add(key);
		}
	}

	return { Added, removed, updAted };
}

function AreSAme(A: IStringDictionAry<IStorAgeVAlue>, b: IStringDictionAry<IStorAgeVAlue>): booleAn {
	const { Added, removed, updAted } = compAre(A, b);
	return Added.size === 0 && removed.size === 0 && updAted.size === 0;
}

