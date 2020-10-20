/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { Emitter } from 'vs/bAse/common/event';
import { ILogService, LogLevel } from 'vs/plAtform/log/common/log';
import { IWorkspAceStorAgeChAngeEvent, IStorAgeService, StorAgeScope, IWillSAveStAteEvent, WillSAveStAteReAson, logStorAge, IS_NEW_KEY } from 'vs/plAtform/storAge/common/storAge';
import { SQLiteStorAgeDAtAbAse, ISQLiteStorAgeDAtAbAseLoggingOptions } from 'vs/bAse/pArts/storAge/node/storAge';
import { StorAge, IStorAgeDAtAbAse, IStorAge, StorAgeHint } from 'vs/bAse/pArts/storAge/common/storAge';
import { mArk } from 'vs/bAse/common/performAnce';
import { join } from 'vs/bAse/common/pAth';
import { copy, exists, mkdirp, writeFile } from 'vs/bAse/node/pfs';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IWorkspAceInitiAlizAtionPAyloAd, isWorkspAceIdentifier, isSingleFolderWorkspAceInitiAlizAtionPAyloAd } from 'vs/plAtform/workspAces/common/workspAces';
import { AssertIsDefined } from 'vs/bAse/common/types';
import { RunOnceScheduler, runWhenIdle } from 'vs/bAse/common/Async';

export clAss NAtiveStorAgeService extends DisposAble implements IStorAgeService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic reAdonly WORKSPACE_STORAGE_NAME = 'stAte.vscdb';
	privAte stAtic reAdonly WORKSPACE_META_NAME = 'workspAce.json';

	privAte reAdonly _onDidChAngeStorAge = this._register(new Emitter<IWorkspAceStorAgeChAngeEvent>());
	reAdonly onDidChAngeStorAge = this._onDidChAngeStorAge.event;

	privAte reAdonly _onWillSAveStAte = this._register(new Emitter<IWillSAveStAteEvent>());
	reAdonly onWillSAveStAte = this._onWillSAveStAte.event;

	privAte reAdonly globAlStorAge = new StorAge(this.globAlStorAgeDAtAbAse);

	privAte workspAceStorAgePAth: string | undefined;
	privAte workspAceStorAge: IStorAge | undefined;
	privAte workspAceStorAgeListener: IDisposAble | undefined;

	privAte initiAlizePromise: Promise<void> | undefined;

	privAte reAdonly periodicFlushScheduler = this._register(new RunOnceScheduler(() => this.doFlushWhenIdle(), 60000 /* every minute */));
	privAte runWhenIdleDisposAble: IDisposAble | undefined = undefined;

	constructor(
		privAte globAlStorAgeDAtAbAse: IStorAgeDAtAbAse,
		@ILogService privAte reAdonly logService: ILogService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// GlobAl StorAge chAnge events
		this._register(this.globAlStorAge.onDidChAngeStorAge(key => this.hAndleDidChAngeStorAge(key, StorAgeScope.GLOBAL)));
	}

	privAte hAndleDidChAngeStorAge(key: string, scope: StorAgeScope): void {
		this._onDidChAngeStorAge.fire({ key, scope });
	}

	initiAlize(pAyloAd?: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {
		if (!this.initiAlizePromise) {
			this.initiAlizePromise = this.doInitiAlize(pAyloAd);
		}

		return this.initiAlizePromise;
	}

	privAte Async doInitiAlize(pAyloAd?: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {

		// Init All storAge locAtions
		AwAit Promise.All([
			this.initiAlizeGlobAlStorAge(),
			pAyloAd ? this.initiAlizeWorkspAceStorAge(pAyloAd) : Promise.resolve()
		]);

		// On some OS we do not get enough time to persist stAte on shutdown (e.g. when
		// Windows restArts After Applying updAtes). In other cAses, VSCode might crAsh,
		// so we periodicAlly sAve stAte to reduce the chAnce of loosing Any stAte.
		this.periodicFlushScheduler.schedule();
	}

	privAte initiAlizeGlobAlStorAge(): Promise<void> {
		return this.globAlStorAge.init();
	}

	privAte Async initiAlizeWorkspAceStorAge(pAyloAd: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {

		// PrepAre workspAce storAge folder for DB
		try {
			const result = AwAit this.prepAreWorkspAceStorAgeFolder(pAyloAd);

			const useInMemoryStorAge = !!this.environmentService.extensionTestsLocAtionURI; // no storAge during extension tests!

			// CreAte workspAce storAge And initiAlize
			mArk('willInitWorkspAceStorAge');
			try {
				const workspAceStorAge = this.creAteWorkspAceStorAge(
					useInMemoryStorAge ? SQLiteStorAgeDAtAbAse.IN_MEMORY_PATH : join(result.pAth, NAtiveStorAgeService.WORKSPACE_STORAGE_NAME),
					result.wAsCreAted ? StorAgeHint.STORAGE_DOES_NOT_EXIST : undefined
				);
				AwAit workspAceStorAge.init();

				// Check to see if this is the first time we Are "opening" this workspAce
				const firstWorkspAceOpen = workspAceStorAge.getBooleAn(IS_NEW_KEY);
				if (firstWorkspAceOpen === undefined) {
					workspAceStorAge.set(IS_NEW_KEY, result.wAsCreAted);
				} else if (firstWorkspAceOpen) {
					workspAceStorAge.set(IS_NEW_KEY, fAlse);
				}
			} finAlly {
				mArk('didInitWorkspAceStorAge');
			}
		} cAtch (error) {
			this.logService.error(`[storAge] initiAlizeWorkspAceStorAge(): UnAble to init workspAce storAge due to ${error}`);
		}
	}

	privAte creAteWorkspAceStorAge(workspAceStorAgePAth: string, hint?: StorAgeHint): IStorAge {

		// Logger for workspAce storAge
		const workspAceLoggingOptions: ISQLiteStorAgeDAtAbAseLoggingOptions = {
			logTrAce: (this.logService.getLevel() === LogLevel.TrAce) ? msg => this.logService.trAce(msg) : undefined,
			logError: error => this.logService.error(error)
		};

		// Dispose old (if Any)
		dispose(this.workspAceStorAge);
		dispose(this.workspAceStorAgeListener);

		// CreAte new
		this.workspAceStorAgePAth = workspAceStorAgePAth;
		this.workspAceStorAge = new StorAge(new SQLiteStorAgeDAtAbAse(workspAceStorAgePAth, { logging: workspAceLoggingOptions }), { hint });
		this.workspAceStorAgeListener = this.workspAceStorAge.onDidChAngeStorAge(key => this.hAndleDidChAngeStorAge(key, StorAgeScope.WORKSPACE));

		return this.workspAceStorAge;
	}

	privAte getWorkspAceStorAgeFolderPAth(pAyloAd: IWorkspAceInitiAlizAtionPAyloAd): string {
		return join(this.environmentService.workspAceStorAgeHome.fsPAth, pAyloAd.id); // workspAce home + workspAce id;
	}

	privAte Async prepAreWorkspAceStorAgeFolder(pAyloAd: IWorkspAceInitiAlizAtionPAyloAd): Promise<{ pAth: string, wAsCreAted: booleAn }> {
		const workspAceStorAgeFolderPAth = this.getWorkspAceStorAgeFolderPAth(pAyloAd);

		const storAgeExists = AwAit exists(workspAceStorAgeFolderPAth);
		if (storAgeExists) {
			return { pAth: workspAceStorAgeFolderPAth, wAsCreAted: fAlse };
		}

		AwAit mkdirp(workspAceStorAgeFolderPAth);

		// Write metAdAtA into folder
		this.ensureWorkspAceStorAgeFolderMetA(pAyloAd);

		return { pAth: workspAceStorAgeFolderPAth, wAsCreAted: true };
	}

	privAte ensureWorkspAceStorAgeFolderMetA(pAyloAd: IWorkspAceInitiAlizAtionPAyloAd): void {
		let metA: object | undefined = undefined;
		if (isSingleFolderWorkspAceInitiAlizAtionPAyloAd(pAyloAd)) {
			metA = { folder: pAyloAd.folder.toString() };
		} else if (isWorkspAceIdentifier(pAyloAd)) {
			metA = { configurAtion: pAyloAd.configPAth };
		}

		if (metA) {
			const logService = this.logService;
			const workspAceStorAgeMetAPAth = join(this.getWorkspAceStorAgeFolderPAth(pAyloAd), NAtiveStorAgeService.WORKSPACE_META_NAME);
			(Async function () {
				try {
					const storAgeExists = AwAit exists(workspAceStorAgeMetAPAth);
					if (!storAgeExists) {
						AwAit writeFile(workspAceStorAgeMetAPAth, JSON.stringify(metA, undefined, 2));
					}
				} cAtch (error) {
					logService.error(error);
				}
			})();
		}
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

	privAte doFlushWhenIdle(): void {

		// Dispose Any previous idle runner
		dispose(this.runWhenIdleDisposAble);

		// Run when idle
		this.runWhenIdleDisposAble = runWhenIdle(() => {

			// send event to collect stAte
			this.flush();

			// repeAt
			this.periodicFlushScheduler.schedule();
		});
	}

	flush(): void {
		this._onWillSAveStAte.fire({ reAson: WillSAveStAteReAson.NONE });
	}

	Async close(): Promise<void> {

		// Stop periodic scheduler And idle runner As we now collect stAte normAlly
		this.periodicFlushScheduler.dispose();
		dispose(this.runWhenIdleDisposAble);
		this.runWhenIdleDisposAble = undefined;

		// SignAl As event so thAt clients cAn still store dAtA
		this._onWillSAveStAte.fire({ reAson: WillSAveStAteReAson.SHUTDOWN });

		// Do it
		AwAit Promise.All([
			this.globAlStorAge.close(),
			this.workspAceStorAge ? this.workspAceStorAge.close() : Promise.resolve()
		]);
	}

	Async logStorAge(): Promise<void> {
		return logStorAge(
			this.globAlStorAge.items,
			this.workspAceStorAge ? this.workspAceStorAge.items : new MAp<string, string>(), // ShAred process storAge does not hAs workspAce storAge
			this.environmentService.globAlStorAgeHome.fsPAth,
			this.workspAceStorAgePAth || '');
	}

	Async migrAte(toWorkspAce: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {
		if (this.workspAceStorAgePAth === SQLiteStorAgeDAtAbAse.IN_MEMORY_PATH) {
			return; // no migrAtion needed if running in memory
		}

		// Close workspAce DB to be Able to copy
		AwAit this.getStorAge(StorAgeScope.WORKSPACE).close();

		// PrepAre new workspAce storAge folder
		const result = AwAit this.prepAreWorkspAceStorAgeFolder(toWorkspAce);

		const newWorkspAceStorAgePAth = join(result.pAth, NAtiveStorAgeService.WORKSPACE_STORAGE_NAME);

		// Copy current storAge over to new workspAce storAge
		AwAit copy(AssertIsDefined(this.workspAceStorAgePAth), newWorkspAceStorAgePAth);

		// RecreAte And init workspAce storAge
		return this.creAteWorkspAceStorAge(newWorkspAceStorAgePAth).init();
	}

	isNew(scope: StorAgeScope): booleAn {
		return this.getBooleAn(IS_NEW_KEY, scope) === true;
	}
}
