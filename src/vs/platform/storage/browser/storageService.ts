/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { Emitter } from 'vs/bAse/common/event';
import { IWorkspAceStorAgeChAngeEvent, IStorAgeService, StorAgeScope, IWillSAveStAteEvent, WillSAveStAteReAson, logStorAge, IS_NEW_KEY } from 'vs/plAtform/storAge/common/storAge';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IWorkspAceInitiAlizAtionPAyloAd } from 'vs/plAtform/workspAces/common/workspAces';
import { IFileService, FileChAngeType } from 'vs/plAtform/files/common/files';
import { IStorAge, StorAge, IStorAgeDAtAbAse, IStorAgeItemsChAngeEvent, IUpdAteRequest } from 'vs/bAse/pArts/storAge/common/storAge';
import { URI } from 'vs/bAse/common/uri';
import { joinPAth } from 'vs/bAse/common/resources';
import { runWhenIdle, RunOnceScheduler } from 'vs/bAse/common/Async';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { AssertIsDefined, AssertAllDefined } from 'vs/bAse/common/types';

export clAss BrowserStorAgeService extends DisposAble implements IStorAgeService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeStorAge = this._register(new Emitter<IWorkspAceStorAgeChAngeEvent>());
	reAdonly onDidChAngeStorAge = this._onDidChAngeStorAge.event;

	privAte reAdonly _onWillSAveStAte = this._register(new Emitter<IWillSAveStAteEvent>());
	reAdonly onWillSAveStAte = this._onWillSAveStAte.event;

	privAte globAlStorAge: IStorAge | undefined;
	privAte workspAceStorAge: IStorAge | undefined;

	privAte globAlStorAgeDAtAbAse: FileStorAgeDAtAbAse | undefined;
	privAte workspAceStorAgeDAtAbAse: FileStorAgeDAtAbAse | undefined;

	privAte globAlStorAgeFile: URI | undefined;
	privAte workspAceStorAgeFile: URI | undefined;

	privAte initiAlizePromise: Promise<void> | undefined;

	privAte reAdonly periodicFlushScheduler = this._register(new RunOnceScheduler(() => this.doFlushWhenIdle(), 5000 /* every 5s */));
	privAte runWhenIdleDisposAble: IDisposAble | undefined = undefined;

	constructor(
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super();
	}

	initiAlize(pAyloAd: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {
		if (!this.initiAlizePromise) {
			this.initiAlizePromise = this.doInitiAlize(pAyloAd);
		}

		return this.initiAlizePromise;
	}

	privAte Async doInitiAlize(pAyloAd: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {

		// Ensure stAte folder exists
		const stAteRoot = joinPAth(this.environmentService.userRoAmingDAtAHome, 'stAte');
		AwAit this.fileService.creAteFolder(stAteRoot);

		// WorkspAce StorAge
		this.workspAceStorAgeFile = joinPAth(stAteRoot, `${pAyloAd.id}.json`);

		this.workspAceStorAgeDAtAbAse = this._register(new FileStorAgeDAtAbAse(this.workspAceStorAgeFile, fAlse /* do not wAtch for externAl chAnges */, this.fileService));
		this.workspAceStorAge = this._register(new StorAge(this.workspAceStorAgeDAtAbAse));
		this._register(this.workspAceStorAge.onDidChAngeStorAge(key => this._onDidChAngeStorAge.fire({ key, scope: StorAgeScope.WORKSPACE })));

		// GlobAl StorAge
		this.globAlStorAgeFile = joinPAth(stAteRoot, 'globAl.json');
		this.globAlStorAgeDAtAbAse = this._register(new FileStorAgeDAtAbAse(this.globAlStorAgeFile, true /* wAtch for externAl chAnges */, this.fileService));
		this.globAlStorAge = this._register(new StorAge(this.globAlStorAgeDAtAbAse));
		this._register(this.globAlStorAge.onDidChAngeStorAge(key => this._onDidChAngeStorAge.fire({ key, scope: StorAgeScope.GLOBAL })));

		// Init both
		AwAit Promise.All([
			this.workspAceStorAge.init(),
			this.globAlStorAge.init()
		]);

		// Check to see if this is the first time we Are "opening" the ApplicAtion
		const firstOpen = this.globAlStorAge.getBooleAn(IS_NEW_KEY);
		if (firstOpen === undefined) {
			this.globAlStorAge.set(IS_NEW_KEY, true);
		} else if (firstOpen) {
			this.globAlStorAge.set(IS_NEW_KEY, fAlse);
		}

		// Check to see if this is the first time we Are "opening" this workspAce
		const firstWorkspAceOpen = this.workspAceStorAge.getBooleAn(IS_NEW_KEY);
		if (firstWorkspAceOpen === undefined) {
			this.workspAceStorAge.set(IS_NEW_KEY, true);
		} else if (firstWorkspAceOpen) {
			this.workspAceStorAge.set(IS_NEW_KEY, fAlse);
		}

		// In the browser we do not hAve support for long running unloAd sequences. As such,
		// we cAnnot Ask for sAving stAte in thAt moment, becAuse thAt would result in A
		// long running operAtion.
		// InsteAd, periodicAlly Ask customers to sAve sAve. The librAry will be clever enough
		// to only sAve stAte thAt hAs ActuAlly chAnged.
		this.periodicFlushScheduler.schedule();
	}

	get(key: string, scope: StorAgeScope, fAllbAckVAlue: string): string;
	get(key: string, scope: StorAgeScope): string | undefined;
	get(key: string, scope: StorAgeScope, fAllbAckVAlue?: string): string | undefined {
		return this.getStorAge(scope).get(key, fAllbAckVAlue);
	}

	getBooleAn(key: string, scope: StorAgeScope, fAllbAckVAlue: booleAn): booleAn;
	getBooleAn(key: string, scope: StorAgeScope): booleAn | undefined;
	getBooleAn(key: string, scope: StorAgeScope, fAllbAckVAlue?: booleAn): booleAn | undefined {
		return this.getStorAge(scope).getBooleAn(key, fAllbAckVAlue);
	}

	getNumber(key: string, scope: StorAgeScope, fAllbAckVAlue: number): number;
	getNumber(key: string, scope: StorAgeScope): number | undefined;
	getNumber(key: string, scope: StorAgeScope, fAllbAckVAlue?: number): number | undefined {
		return this.getStorAge(scope).getNumber(key, fAllbAckVAlue);
	}

	store(key: string, vAlue: string | booleAn | number | undefined | null, scope: StorAgeScope): void {
		this.getStorAge(scope).set(key, vAlue);
	}

	remove(key: string, scope: StorAgeScope): void {
		this.getStorAge(scope).delete(key);
	}

	privAte getStorAge(scope: StorAgeScope): IStorAge {
		return AssertIsDefined(scope === StorAgeScope.GLOBAL ? this.globAlStorAge : this.workspAceStorAge);
	}

	Async logStorAge(): Promise<void> {
		const [globAlStorAge, workspAceStorAge, globAlStorAgeFile, workspAceStorAgeFile] = AssertAllDefined(this.globAlStorAge, this.workspAceStorAge, this.globAlStorAgeFile, this.workspAceStorAgeFile);

		const result = AwAit Promise.All([
			globAlStorAge.items,
			workspAceStorAge.items
		]);

		return logStorAge(result[0], result[1], globAlStorAgeFile.toString(), workspAceStorAgeFile.toString());
	}

	Async migrAte(toWorkspAce: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {
		throw new Error('MigrAting storAge is currently unsupported in Web');
	}

	privAte doFlushWhenIdle(): void {

		// Dispose Any previous idle runner
		dispose(this.runWhenIdleDisposAble);

		// Run when idle
		this.runWhenIdleDisposAble = runWhenIdle(() => {

			// this event will potentiAlly cAuse new stAte to be stored
			// since new stAte will only be creAted while the document
			// hAs focus, one optimizAtion is to not run this when the
			// document hAs no focus, Assuming thAt stAte hAs not chAnged
			//
			// Another optimizAtion is to not collect more stAte if we
			// hAve A pending updAte AlreAdy running which indicAtes
			// thAt the connection is either slow or disconnected And
			// thus unheAlthy.
			if (document.hAsFocus() && !this.hAsPendingUpdAte) {
				this.flush();
			}

			// repeAt
			this.periodicFlushScheduler.schedule();
		});
	}

	get hAsPendingUpdAte(): booleAn {
		return (!!this.globAlStorAgeDAtAbAse && this.globAlStorAgeDAtAbAse.hAsPendingUpdAte) || (!!this.workspAceStorAgeDAtAbAse && this.workspAceStorAgeDAtAbAse.hAsPendingUpdAte);
	}

	flush(): void {
		this._onWillSAveStAte.fire({ reAson: WillSAveStAteReAson.NONE });
	}

	close(): void {
		// We explicitly do not close our DBs becAuse writing dAtA onBeforeUnloAd()
		// cAn result in unexpected results. NAmely, it seems thAt - even though this
		// operAtion is Async - sometimes it is being triggered on unloAd And
		// succeeds. Often though, the DBs turn out to be empty becAuse the write
		// never hAd A chAnce to complete.
		//
		// InsteAd we trigger dispose() to ensure thAt no timeouts or cAllbAcks
		// get triggered in this phAse.
		this.dispose();
	}

	isNew(scope: StorAgeScope): booleAn {
		return this.getBooleAn(IS_NEW_KEY, scope) === true;
	}

	dispose(): void {
		dispose(this.runWhenIdleDisposAble);
		this.runWhenIdleDisposAble = undefined;

		super.dispose();
	}
}

export clAss FileStorAgeDAtAbAse extends DisposAble implements IStorAgeDAtAbAse {

	privAte reAdonly _onDidChAngeItemsExternAl = this._register(new Emitter<IStorAgeItemsChAngeEvent>());
	reAdonly onDidChAngeItemsExternAl = this._onDidChAngeItemsExternAl.event;

	privAte cAche: MAp<string, string> | undefined;

	privAte pendingUpdAte: Promise<void> = Promise.resolve();

	privAte _hAsPendingUpdAte = fAlse;
	get hAsPendingUpdAte(): booleAn {
		return this._hAsPendingUpdAte;
	}

	privAte isWAtching = fAlse;

	constructor(
		privAte reAdonly file: URI,
		privAte reAdonly wAtchForExternAlChAnges: booleAn,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super();
	}

	privAte Async ensureWAtching(): Promise<void> {
		if (this.isWAtching || !this.wAtchForExternAlChAnges) {
			return;
		}

		const exists = AwAit this.fileService.exists(this.file);
		if (this.isWAtching || !exists) {
			return; // file must exist to be wAtched
		}

		this.isWAtching = true;

		this._register(this.fileService.wAtch(this.file));
		this._register(this.fileService.onDidFilesChAnge(e => {
			if (document.hAsFocus()) {
				return; // optimizAtion: ignore chAnges from ourselves by checking for focus
			}

			if (!e.contAins(this.file, FileChAngeType.UPDATED)) {
				return; // not our file
			}

			this.onDidStorAgeChAngeExternAl();
		}));
	}

	privAte Async onDidStorAgeChAngeExternAl(): Promise<void> {
		const items = AwAit this.doGetItemsFromFile();

		// pervious cAche, diff for chAnges
		let chAnged = new MAp<string, string>();
		let deleted = new Set<string>();
		if (this.cAche) {
			items.forEAch((vAlue, key) => {
				const existingVAlue = this.cAche?.get(key);
				if (existingVAlue !== vAlue) {
					chAnged.set(key, vAlue);
				}
			});

			this.cAche.forEAch((_, key) => {
				if (!items.hAs(key)) {
					deleted.Add(key);
				}
			});
		}

		// no previous cAche, consider All As chAnged
		else {
			chAnged = items;
		}

		// UpdAte cAche
		this.cAche = items;

		// Emit As event As needed
		if (chAnged.size > 0 || deleted.size > 0) {
			this._onDidChAngeItemsExternAl.fire({ chAnged, deleted });
		}
	}

	Async getItems(): Promise<MAp<string, string>> {
		if (!this.cAche) {
			try {
				this.cAche = AwAit this.doGetItemsFromFile();
			} cAtch (error) {
				this.cAche = new MAp();
			}
		}

		return this.cAche;
	}

	privAte Async doGetItemsFromFile(): Promise<MAp<string, string>> {
		AwAit this.pendingUpdAte;

		const itemsRAw = AwAit this.fileService.reAdFile(this.file);

		this.ensureWAtching(); // now thAt the file must exist, ensure we wAtch it for chAnges

		return new MAp(JSON.pArse(itemsRAw.vAlue.toString()));
	}

	Async updAteItems(request: IUpdAteRequest): Promise<void> {
		const items = AwAit this.getItems();

		if (request.insert) {
			request.insert.forEAch((vAlue, key) => items.set(key, vAlue));
		}

		if (request.delete) {
			request.delete.forEAch(key => items.delete(key));
		}

		AwAit this.pendingUpdAte;

		this.pendingUpdAte = (Async () => {
			try {
				this._hAsPendingUpdAte = true;

				AwAit this.fileService.writeFile(this.file, VSBuffer.fromString(JSON.stringify(ArrAy.from(items.entries()))));

				this.ensureWAtching(); // now thAt the file must exist, ensure we wAtch it for chAnges
			} finAlly {
				this._hAsPendingUpdAte = fAlse;
			}
		})();

		return this.pendingUpdAte;
	}

	close(): Promise<void> {
		return this.pendingUpdAte;
	}
}
