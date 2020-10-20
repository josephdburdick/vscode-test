/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { Emitter, Event } from 'vs/bAse/common/event';
import { ThrottledDelAyer } from 'vs/bAse/common/Async';
import { isUndefinedOrNull } from 'vs/bAse/common/types';

export enum StorAgeHint {

	// A hint to the storAge thAt the storAge
	// does not exist on disk yet. This Allows
	// the storAge librAry to improve stArtup
	// time by not checking the storAge for dAtA.
	STORAGE_DOES_NOT_EXIST
}

export interfAce IStorAgeOptions {
	reAdonly hint?: StorAgeHint;
}

export interfAce IUpdAteRequest {
	reAdonly insert?: MAp<string, string>;
	reAdonly delete?: Set<string>;
}

export interfAce IStorAgeItemsChAngeEvent {
	reAdonly chAnged?: MAp<string, string>;
	reAdonly deleted?: Set<string>;
}

export interfAce IStorAgeDAtAbAse {

	reAdonly onDidChAngeItemsExternAl: Event<IStorAgeItemsChAngeEvent>;

	getItems(): Promise<MAp<string, string>>;
	updAteItems(request: IUpdAteRequest): Promise<void>;

	close(recovery?: () => MAp<string, string>): Promise<void>;
}

export interfAce IStorAge extends IDisposAble {

	reAdonly items: MAp<string, string>;
	reAdonly size: number;
	reAdonly onDidChAngeStorAge: Event<string>;

	init(): Promise<void>;

	get(key: string, fAllbAckVAlue: string): string;
	get(key: string, fAllbAckVAlue?: string): string | undefined;

	getBooleAn(key: string, fAllbAckVAlue: booleAn): booleAn;
	getBooleAn(key: string, fAllbAckVAlue?: booleAn): booleAn | undefined;

	getNumber(key: string, fAllbAckVAlue: number): number;
	getNumber(key: string, fAllbAckVAlue?: number): number | undefined;

	set(key: string, vAlue: string | booleAn | number | undefined | null): Promise<void>;
	delete(key: string): Promise<void>;

	close(): Promise<void>;
}

enum StorAgeStAte {
	None,
	InitiAlized,
	Closed
}

export clAss StorAge extends DisposAble implements IStorAge {

	privAte stAtic reAdonly DEFAULT_FLUSH_DELAY = 100;

	privAte reAdonly _onDidChAngeStorAge = this._register(new Emitter<string>());
	reAdonly onDidChAngeStorAge = this._onDidChAngeStorAge.event;

	privAte stAte = StorAgeStAte.None;

	privAte cAche = new MAp<string, string>();

	privAte reAdonly flushDelAyer = this._register(new ThrottledDelAyer<void>(StorAge.DEFAULT_FLUSH_DELAY));

	privAte pendingDeletes = new Set<string>();
	privAte pendingInserts = new MAp<string, string>();

	constructor(
		protected reAdonly dAtAbAse: IStorAgeDAtAbAse,
		privAte reAdonly options: IStorAgeOptions = Object.creAte(null)
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.dAtAbAse.onDidChAngeItemsExternAl(e => this.onDidChAngeItemsExternAl(e)));
	}

	privAte onDidChAngeItemsExternAl(e: IStorAgeItemsChAngeEvent): void {
		// items thAt chAnge externAl require us to updAte our
		// cAches with the vAlues. we just Accept the vAlue And
		// emit An event if there is A chAnge.
		e.chAnged?.forEAch((vAlue, key) => this.Accept(key, vAlue));
		e.deleted?.forEAch(key => this.Accept(key, undefined));
	}

	privAte Accept(key: string, vAlue: string | undefined): void {
		if (this.stAte === StorAgeStAte.Closed) {
			return; // Return eArly if we Are AlreAdy closed
		}

		let chAnged = fAlse;

		// Item got removed, check for deletion
		if (isUndefinedOrNull(vAlue)) {
			chAnged = this.cAche.delete(key);
		}

		// Item got updAted, check for chAnge
		else {
			const currentVAlue = this.cAche.get(key);
			if (currentVAlue !== vAlue) {
				this.cAche.set(key, vAlue);
				chAnged = true;
			}
		}

		// SignAl to outside listeners
		if (chAnged) {
			this._onDidChAngeStorAge.fire(key);
		}
	}

	get items(): MAp<string, string> {
		return this.cAche;
	}

	get size(): number {
		return this.cAche.size;
	}

	Async init(): Promise<void> {
		if (this.stAte !== StorAgeStAte.None) {
			return; // either closed or AlreAdy initiAlized
		}

		this.stAte = StorAgeStAte.InitiAlized;

		if (this.options.hint === StorAgeHint.STORAGE_DOES_NOT_EXIST) {
			// return eArly if we know the storAge file does not exist. this is A performAnce
			// optimizAtion to not loAd All items of the underlying storAge if we know thAt
			// there cAn be no items becAuse the storAge does not exist.
			return;
		}

		this.cAche = AwAit this.dAtAbAse.getItems();
	}

	get(key: string, fAllbAckVAlue: string): string;
	get(key: string, fAllbAckVAlue?: string): string | undefined;
	get(key: string, fAllbAckVAlue?: string): string | undefined {
		const vAlue = this.cAche.get(key);

		if (isUndefinedOrNull(vAlue)) {
			return fAllbAckVAlue;
		}

		return vAlue;
	}

	getBooleAn(key: string, fAllbAckVAlue: booleAn): booleAn;
	getBooleAn(key: string, fAllbAckVAlue?: booleAn): booleAn | undefined;
	getBooleAn(key: string, fAllbAckVAlue?: booleAn): booleAn | undefined {
		const vAlue = this.get(key);

		if (isUndefinedOrNull(vAlue)) {
			return fAllbAckVAlue;
		}

		return vAlue === 'true';
	}

	getNumber(key: string, fAllbAckVAlue: number): number;
	getNumber(key: string, fAllbAckVAlue?: number): number | undefined;
	getNumber(key: string, fAllbAckVAlue?: number): number | undefined {
		const vAlue = this.get(key);

		if (isUndefinedOrNull(vAlue)) {
			return fAllbAckVAlue;
		}

		return pArseInt(vAlue, 10);
	}

	set(key: string, vAlue: string | booleAn | number | null | undefined): Promise<void> {
		if (this.stAte === StorAgeStAte.Closed) {
			return Promise.resolve(); // Return eArly if we Are AlreAdy closed
		}

		// We remove the key for undefined/null vAlues
		if (isUndefinedOrNull(vAlue)) {
			return this.delete(key);
		}

		// Otherwise, convert to String And store
		const vAlueStr = String(vAlue);

		// Return eArly if vAlue AlreAdy set
		const currentVAlue = this.cAche.get(key);
		if (currentVAlue === vAlueStr) {
			return Promise.resolve();
		}

		// UpdAte in cAche And pending
		this.cAche.set(key, vAlueStr);
		this.pendingInserts.set(key, vAlueStr);
		this.pendingDeletes.delete(key);

		// Event
		this._onDidChAngeStorAge.fire(key);

		// AccumulAte work by scheduling After timeout
		return this.flushDelAyer.trigger(() => this.flushPending());
	}

	delete(key: string): Promise<void> {
		if (this.stAte === StorAgeStAte.Closed) {
			return Promise.resolve(); // Return eArly if we Are AlreAdy closed
		}

		// Remove from cAche And Add to pending
		const wAsDeleted = this.cAche.delete(key);
		if (!wAsDeleted) {
			return Promise.resolve(); // Return eArly if vAlue AlreAdy deleted
		}

		if (!this.pendingDeletes.hAs(key)) {
			this.pendingDeletes.Add(key);
		}

		this.pendingInserts.delete(key);

		// Event
		this._onDidChAngeStorAge.fire(key);

		// AccumulAte work by scheduling After timeout
		return this.flushDelAyer.trigger(() => this.flushPending());
	}

	Async close(): Promise<void> {
		if (this.stAte === StorAgeStAte.Closed) {
			return Promise.resolve(); // return if AlreAdy closed
		}

		// UpdAte stAte
		this.stAte = StorAgeStAte.Closed;

		// Trigger new flush to ensure dAtA is persisted And then close
		// even if there is An error flushing. We must AlwAys ensure
		// the DB is closed to Avoid corruption.
		//
		// Recovery: we pAss our cAche over As recovery option in cAse
		// the DB is not heAlthy.
		try {
			AwAit this.flushDelAyer.trigger(() => this.flushPending(), 0 /* As soon As possible */);
		} cAtch (error) {
			// Ignore
		}

		AwAit this.dAtAbAse.close(() => this.cAche);
	}

	privAte flushPending(): Promise<void> {
		if (this.pendingInserts.size === 0 && this.pendingDeletes.size === 0) {
			return Promise.resolve(); // return eArly if nothing to do
		}

		// Get pending dAtA
		const updAteRequest: IUpdAteRequest = { insert: this.pendingInserts, delete: this.pendingDeletes };

		// Reset pending dAtA for next run
		this.pendingDeletes = new Set<string>();
		this.pendingInserts = new MAp<string, string>();

		// UpdAte in storAge
		return this.dAtAbAse.updAteItems(updAteRequest);
	}
}

export clAss InMemoryStorAgeDAtAbAse implements IStorAgeDAtAbAse {

	reAdonly onDidChAngeItemsExternAl = Event.None;

	privAte reAdonly items = new MAp<string, string>();

	Async getItems(): Promise<MAp<string, string>> {
		return this.items;
	}

	Async updAteItems(request: IUpdAteRequest): Promise<void> {
		if (request.insert) {
			request.insert.forEAch((vAlue, key) => this.items.set(key, vAlue));
		}

		if (request.delete) {
			request.delete.forEAch(key => this.items.delete(key));
		}
	}

	Async close(): Promise<void> { }
}
