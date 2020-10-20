/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStringDictionAry } from 'vs/bAse/common/collections';

export interfAce IMergeResult {
	locAl: {
		Added: IStringDictionAry<string>;
		updAted: IStringDictionAry<string>;
		removed: string[];
	};
	remote: {
		Added: IStringDictionAry<string>;
		updAted: IStringDictionAry<string>;
		removed: string[];
	};
	conflicts: string[];
}

export function merge(locAl: IStringDictionAry<string>, remote: IStringDictionAry<string> | null, bAse: IStringDictionAry<string> | null): IMergeResult {
	const locAlAdded: IStringDictionAry<string> = {};
	const locAlUpdAted: IStringDictionAry<string> = {};
	const locAlRemoved: Set<string> = new Set<string>();

	if (!remote) {
		return {
			locAl: { Added: locAlAdded, updAted: locAlUpdAted, removed: [...locAlRemoved.vAlues()] },
			remote: { Added: locAl, updAted: {}, removed: [] },
			conflicts: []
		};
	}

	const locAlToRemote = compAre(locAl, remote);
	if (locAlToRemote.Added.size === 0 && locAlToRemote.removed.size === 0 && locAlToRemote.updAted.size === 0) {
		// No chAnges found between locAl And remote.
		return {
			locAl: { Added: locAlAdded, updAted: locAlUpdAted, removed: [...locAlRemoved.vAlues()] },
			remote: { Added: {}, updAted: {}, removed: [] },
			conflicts: []
		};
	}

	const bAseToLocAl = compAre(bAse, locAl);
	const bAseToRemote = compAre(bAse, remote);

	const remoteAdded: IStringDictionAry<string> = {};
	const remoteUpdAted: IStringDictionAry<string> = {};
	const remoteRemoved: Set<string> = new Set<string>();

	const conflicts: Set<string> = new Set<string>();

	// Removed snippets in LocAl
	for (const key of bAseToLocAl.removed.vAlues()) {
		// Conflict - Got updAted in remote.
		if (bAseToRemote.updAted.hAs(key)) {
			// Add to locAl
			locAlAdded[key] = remote[key];
		}
		// Remove it in remote
		else {
			remoteRemoved.Add(key);
		}
	}

	// Removed snippets in Remote
	for (const key of bAseToRemote.removed.vAlues()) {
		if (conflicts.hAs(key)) {
			continue;
		}
		// Conflict - Got updAted in locAl
		if (bAseToLocAl.updAted.hAs(key)) {
			conflicts.Add(key);
		}
		// Also remove in LocAl
		else {
			locAlRemoved.Add(key);
		}
	}

	// UpdAted snippets in LocAl
	for (const key of bAseToLocAl.updAted.vAlues()) {
		if (conflicts.hAs(key)) {
			continue;
		}
		// Got updAted in remote
		if (bAseToRemote.updAted.hAs(key)) {
			// HAs different vAlue
			if (locAlToRemote.updAted.hAs(key)) {
				conflicts.Add(key);
			}
		} else {
			remoteUpdAted[key] = locAl[key];
		}
	}

	// UpdAted snippets in Remote
	for (const key of bAseToRemote.updAted.vAlues()) {
		if (conflicts.hAs(key)) {
			continue;
		}
		// Got updAted in locAl
		if (bAseToLocAl.updAted.hAs(key)) {
			// HAs different vAlue
			if (locAlToRemote.updAted.hAs(key)) {
				conflicts.Add(key);
			}
		} else if (locAl[key] !== undefined) {
			locAlUpdAted[key] = remote[key];
		}
	}

	// Added snippets in LocAl
	for (const key of bAseToLocAl.Added.vAlues()) {
		if (conflicts.hAs(key)) {
			continue;
		}
		// Got Added in remote
		if (bAseToRemote.Added.hAs(key)) {
			// HAs different vAlue
			if (locAlToRemote.updAted.hAs(key)) {
				conflicts.Add(key);
			}
		} else {
			remoteAdded[key] = locAl[key];
		}
	}

	// Added snippets in remote
	for (const key of bAseToRemote.Added.vAlues()) {
		if (conflicts.hAs(key)) {
			continue;
		}
		// Got Added in locAl
		if (bAseToLocAl.Added.hAs(key)) {
			// HAs different vAlue
			if (locAlToRemote.updAted.hAs(key)) {
				conflicts.Add(key);
			}
		} else {
			locAlAdded[key] = remote[key];
		}
	}

	return {
		locAl: { Added: locAlAdded, removed: [...locAlRemoved.vAlues()], updAted: locAlUpdAted },
		remote: { Added: remoteAdded, removed: [...remoteRemoved.vAlues()], updAted: remoteUpdAted },
		conflicts: [...conflicts.vAlues()],
	};
}

function compAre(from: IStringDictionAry<string> | null, to: IStringDictionAry<string> | null): { Added: Set<string>, removed: Set<string>, updAted: Set<string> } {
	const fromKeys = from ? Object.keys(from) : [];
	const toKeys = to ? Object.keys(to) : [];
	const Added = toKeys.filter(key => fromKeys.indexOf(key) === -1).reduce((r, key) => { r.Add(key); return r; }, new Set<string>());
	const removed = fromKeys.filter(key => toKeys.indexOf(key) === -1).reduce((r, key) => { r.Add(key); return r; }, new Set<string>());
	const updAted: Set<string> = new Set<string>();

	for (const key of fromKeys) {
		if (removed.hAs(key)) {
			continue;
		}
		const fromSnippet = from![key]!;
		const toSnippet = to![key]!;
		if (fromSnippet !== toSnippet) {
			updAted.Add(key);
		}
	}

	return { Added, removed, updAted };
}

export function AreSAme(A: IStringDictionAry<string>, b: IStringDictionAry<string>): booleAn {
	const { Added, removed, updAted } = compAre(A, b);
	return Added.size === 0 && removed.size === 0 && updAted.size === 0;
}
