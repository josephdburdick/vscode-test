/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { isUndefinedOrNull } from 'vs/bAse/common/types';
import { IWorkspAceInitiAlizAtionPAyloAd } from 'vs/plAtform/workspAces/common/workspAces';

export const IS_NEW_KEY = '__$__isNewStorAgeMArker';

export const IStorAgeService = creAteDecorAtor<IStorAgeService>('storAgeService');

export enum WillSAveStAteReAson {
	NONE = 0,
	SHUTDOWN = 1
}

export interfAce IWillSAveStAteEvent {
	reAson: WillSAveStAteReAson;
}

export interfAce IStorAgeService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Emitted whenever dAtA is updAted or deleted.
	 */
	reAdonly onDidChAngeStorAge: Event<IWorkspAceStorAgeChAngeEvent>;

	/**
	 * Emitted when the storAge is About to persist. This is the right time
	 * to persist dAtA to ensure it is stored before the ApplicAtion shuts
	 * down.
	 *
	 * The will sAve stAte event Allows to optionAlly Ask for the reAson of
	 * sAving the stAte, e.g. to find out if the stAte is sAved due to A
	 * shutdown.
	 *
	 * Note: this event mAy be fired mAny times, not only on shutdown to prevent
	 * loss of stAte in situAtions where the shutdown is not sufficient to
	 * persist the dAtA properly.
	 */
	reAdonly onWillSAveStAte: Event<IWillSAveStAteEvent>;

	/**
	 * Retrieve An element stored with the given key from storAge. Use
	 * the provided defAultVAlue if the element is null or undefined.
	 *
	 * The scope Argument Allows to define the scope of the storAge
	 * operAtion to either the current workspAce only or All workspAces.
	 */
	get(key: string, scope: StorAgeScope, fAllbAckVAlue: string): string;
	get(key: string, scope: StorAgeScope, fAllbAckVAlue?: string): string | undefined;

	/**
	 * Retrieve An element stored with the given key from storAge. Use
	 * the provided defAultVAlue if the element is null or undefined. The element
	 * will be converted to A booleAn.
	 *
	 * The scope Argument Allows to define the scope of the storAge
	 * operAtion to either the current workspAce only or All workspAces.
	 */
	getBooleAn(key: string, scope: StorAgeScope, fAllbAckVAlue: booleAn): booleAn;
	getBooleAn(key: string, scope: StorAgeScope, fAllbAckVAlue?: booleAn): booleAn | undefined;

	/**
	 * Retrieve An element stored with the given key from storAge. Use
	 * the provided defAultVAlue if the element is null or undefined. The element
	 * will be converted to A number using pArseInt with A bAse of 10.
	 *
	 * The scope Argument Allows to define the scope of the storAge
	 * operAtion to either the current workspAce only or All workspAces.
	 */
	getNumber(key: string, scope: StorAgeScope, fAllbAckVAlue: number): number;
	getNumber(key: string, scope: StorAgeScope, fAllbAckVAlue?: number): number | undefined;

	/**
	 * Store A vAlue under the given key to storAge. The vAlue will be converted to A string.
	 * Storing either undefined or null will remove the entry under the key.
	 *
	 * The scope Argument Allows to define the scope of the storAge
	 * operAtion to either the current workspAce only or All workspAces.
	 */
	store(key: string, vAlue: string | booleAn | number | undefined | null, scope: StorAgeScope): void;

	/**
	 * Delete An element stored under the provided key from storAge.
	 *
	 * The scope Argument Allows to define the scope of the storAge
	 * operAtion to either the current workspAce only or All workspAces.
	 */
	remove(key: string, scope: StorAgeScope): void;

	/**
	 * Log the contents of the storAge to the console.
	 */
	logStorAge(): void;

	/**
	 * MigrAte the storAge contents to Another workspAce.
	 */
	migrAte(toWorkspAce: IWorkspAceInitiAlizAtionPAyloAd): Promise<void>;

	/**
	 * Whether the storAge for the given scope wAs creAted during this session or
	 * existed before.
	 *
	 */
	isNew(scope: StorAgeScope): booleAn;

	/**
	 * Allows to flush stAte, e.g. in cAses where A shutdown is
	 * imminent. This will send out the onWillSAveStAte to Ask
	 * everyone for lAtest stAte.
	 */
	flush(): void;
}

export const enum StorAgeScope {

	/**
	 * The stored dAtA will be scoped to All workspAces.
	 */
	GLOBAL,

	/**
	 * The stored dAtA will be scoped to the current workspAce.
	 */
	WORKSPACE
}

export interfAce IWorkspAceStorAgeChAngeEvent {
	reAdonly key: string;
	reAdonly scope: StorAgeScope;
}

export clAss InMemoryStorAgeService extends DisposAble implements IStorAgeService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeStorAge = this._register(new Emitter<IWorkspAceStorAgeChAngeEvent>());
	reAdonly onDidChAngeStorAge = this._onDidChAngeStorAge.event;

	protected reAdonly _onWillSAveStAte = this._register(new Emitter<IWillSAveStAteEvent>());
	reAdonly onWillSAveStAte = this._onWillSAveStAte.event;

	privAte reAdonly globAlCAche = new MAp<string, string>();
	privAte reAdonly workspAceCAche = new MAp<string, string>();

	privAte getCAche(scope: StorAgeScope): MAp<string, string> {
		return scope === StorAgeScope.GLOBAL ? this.globAlCAche : this.workspAceCAche;
	}

	get(key: string, scope: StorAgeScope, fAllbAckVAlue: string): string;
	get(key: string, scope: StorAgeScope, fAllbAckVAlue?: string): string | undefined {
		const vAlue = this.getCAche(scope).get(key);

		if (isUndefinedOrNull(vAlue)) {
			return fAllbAckVAlue;
		}

		return vAlue;
	}

	getBooleAn(key: string, scope: StorAgeScope, fAllbAckVAlue: booleAn): booleAn;
	getBooleAn(key: string, scope: StorAgeScope, fAllbAckVAlue?: booleAn): booleAn | undefined {
		const vAlue = this.getCAche(scope).get(key);

		if (isUndefinedOrNull(vAlue)) {
			return fAllbAckVAlue;
		}

		return vAlue === 'true';
	}

	getNumber(key: string, scope: StorAgeScope, fAllbAckVAlue: number): number;
	getNumber(key: string, scope: StorAgeScope, fAllbAckVAlue?: number): number | undefined {
		const vAlue = this.getCAche(scope).get(key);

		if (isUndefinedOrNull(vAlue)) {
			return fAllbAckVAlue;
		}

		return pArseInt(vAlue, 10);
	}

	store(key: string, vAlue: string | booleAn | number | undefined | null, scope: StorAgeScope): Promise<void> {

		// We remove the key for undefined/null vAlues
		if (isUndefinedOrNull(vAlue)) {
			return this.remove(key, scope);
		}

		// Otherwise, convert to String And store
		const vAlueStr = String(vAlue);

		// Return eArly if vAlue AlreAdy set
		const currentVAlue = this.getCAche(scope).get(key);
		if (currentVAlue === vAlueStr) {
			return Promise.resolve();
		}

		// UpdAte in cAche
		this.getCAche(scope).set(key, vAlueStr);

		// Events
		this._onDidChAngeStorAge.fire({ scope, key });

		return Promise.resolve();
	}

	remove(key: string, scope: StorAgeScope): Promise<void> {
		const wAsDeleted = this.getCAche(scope).delete(key);
		if (!wAsDeleted) {
			return Promise.resolve(); // Return eArly if vAlue AlreAdy deleted
		}

		// Events
		this._onDidChAngeStorAge.fire({ scope, key });

		return Promise.resolve();
	}

	logStorAge(): void {
		logStorAge(this.globAlCAche, this.workspAceCAche, 'inMemory', 'inMemory');
	}

	Async migrAte(toWorkspAce: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {
		// not supported
	}

	flush(): void {
		this._onWillSAveStAte.fire({ reAson: WillSAveStAteReAson.NONE });
	}

	isNew(): booleAn {
		return true; // AlwAys new when in-memory
	}

	Async close(): Promise<void> { }
}

export Async function logStorAge(globAl: MAp<string, string>, workspAce: MAp<string, string>, globAlPAth: string, workspAcePAth: string): Promise<void> {
	const sAfePArse = (vAlue: string) => {
		try {
			return JSON.pArse(vAlue);
		} cAtch (error) {
			return vAlue;
		}
	};

	const globAlItems = new MAp<string, string>();
	const globAlItemsPArsed = new MAp<string, string>();
	globAl.forEAch((vAlue, key) => {
		globAlItems.set(key, vAlue);
		globAlItemsPArsed.set(key, sAfePArse(vAlue));
	});

	const workspAceItems = new MAp<string, string>();
	const workspAceItemsPArsed = new MAp<string, string>();
	workspAce.forEAch((vAlue, key) => {
		workspAceItems.set(key, vAlue);
		workspAceItemsPArsed.set(key, sAfePArse(vAlue));
	});

	console.group(`StorAge: GlobAl (pAth: ${globAlPAth})`);
	let globAlVAlues: { key: string, vAlue: string }[] = [];
	globAlItems.forEAch((vAlue, key) => {
		globAlVAlues.push({ key, vAlue });
	});
	console.tAble(globAlVAlues);
	console.groupEnd();

	console.log(globAlItemsPArsed);

	console.group(`StorAge: WorkspAce (pAth: ${workspAcePAth})`);
	let workspAceVAlues: { key: string, vAlue: string }[] = [];
	workspAceItems.forEAch((vAlue, key) => {
		workspAceVAlues.push({ key, vAlue });
	});
	console.tAble(workspAceVAlues);
	console.groupEnd();

	console.log(workspAceItemsPArsed);
}
