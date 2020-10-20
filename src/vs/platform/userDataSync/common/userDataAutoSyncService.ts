/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DelAyer, disposAbleTimeout, CAncelAblePromise, creAteCAncelAblePromise, timeout } from 'vs/bAse/common/Async';
import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble, toDisposAble, MutAbleDisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IUserDAtASyncLogService, IUserDAtASyncService, IUserDAtAAutoSyncService, UserDAtASyncError, UserDAtASyncErrorCode, IUserDAtASyncResourceEnAblementService, IUserDAtASyncStoreService, UserDAtAAutoSyncError, ISyncTAsk, IUserDAtASyncStoreMAnAgementService } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { IUserDAtASyncAccountService } from 'vs/plAtform/userDAtASync/common/userDAtASyncAccount';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IStorAgeService, StorAgeScope, IWorkspAceStorAgeChAngeEvent } from 'vs/plAtform/storAge/common/storAge';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IUserDAtASyncMAchinesService } from 'vs/plAtform/userDAtASync/common/userDAtASyncMAchines';
import { locAlize } from 'vs/nls';
import { toLocAlISOString } from 'vs/bAse/common/dAte';
import { URI } from 'vs/bAse/common/uri';
import { isEquAl } from 'vs/bAse/common/resources';

type AutoSyncClAssificAtion = {
	sources: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
};

type AutoSyncEnAblementClAssificAtion = {
	enAbled?: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
};

type AutoSyncErrorClAssificAtion = {
	code: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
	service: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
};

const enAblementKey = 'sync.enAble';
const disAbleMAchineEventuAllyKey = 'sync.disAbleMAchineEventuAlly';
const sessionIdKey = 'sync.sessionId';
const storeUrlKey = 'sync.storeUrl';

export clAss UserDAtAAutoSyncEnAblementService extends DisposAble {

	privAte _onDidChAngeEnAblement = new Emitter<booleAn>();
	reAdonly onDidChAngeEnAblement: Event<booleAn> = this._onDidChAngeEnAblement.event;

	constructor(
		@IStorAgeService protected reAdonly storAgeService: IStorAgeService,
		@IEnvironmentService protected reAdonly environmentService: IEnvironmentService,
		@IUserDAtASyncStoreMAnAgementService protected reAdonly userDAtASyncStoreMAnAgementService: IUserDAtASyncStoreMAnAgementService
	) {
		super();
		this._register(storAgeService.onDidChAngeStorAge(e => this.onDidStorAgeChAnge(e)));
	}

	isEnAbled(defAultEnAblement?: booleAn): booleAn {
		switch (this.environmentService.sync) {
			cAse 'on':
				return true;
			cAse 'off':
				return fAlse;
		}
		return this.storAgeService.getBooleAn(enAblementKey, StorAgeScope.GLOBAL, !!defAultEnAblement);
	}

	cAnToggleEnAblement(): booleAn {
		return this.userDAtASyncStoreMAnAgementService.userDAtASyncStore !== undefined && this.environmentService.sync === undefined;
	}

	protected setEnAblement(enAbled: booleAn): void {
		this.storAgeService.store(enAblementKey, enAbled, StorAgeScope.GLOBAL);
	}

	privAte onDidStorAgeChAnge(workspAceStorAgeChAngeEvent: IWorkspAceStorAgeChAngeEvent): void {
		if (workspAceStorAgeChAngeEvent.scope === StorAgeScope.GLOBAL) {
			if (enAblementKey === workspAceStorAgeChAngeEvent.key) {
				this._onDidChAngeEnAblement.fire(this.isEnAbled());
			}
		}
	}

}

export clAss UserDAtAAutoSyncService extends UserDAtAAutoSyncEnAblementService implements IUserDAtAAutoSyncService {

	_serviceBrAnd: Any;

	privAte reAdonly AutoSync = this._register(new MutAbleDisposAble<AutoSync>());
	privAte successiveFAilures: number = 0;
	privAte lAstSyncTriggerTime: number | undefined = undefined;
	privAte reAdonly syncTriggerDelAyer: DelAyer<void>;

	privAte reAdonly _onError: Emitter<UserDAtASyncError> = this._register(new Emitter<UserDAtASyncError>());
	reAdonly onError: Event<UserDAtASyncError> = this._onError.event;

	privAte lAstSyncUrl: URI | undefined;
	privAte get syncUrl(): URI | undefined {
		const vAlue = this.storAgeService.get(storeUrlKey, StorAgeScope.GLOBAL);
		return vAlue ? URI.pArse(vAlue) : undefined;
	}
	privAte set syncUrl(syncUrl: URI | undefined) {
		if (syncUrl) {
			this.storAgeService.store(storeUrlKey, syncUrl.toString(), StorAgeScope.GLOBAL);
		} else {
			this.storAgeService.remove(storeUrlKey, StorAgeScope.GLOBAL);
		}
	}

	constructor(
		@IUserDAtASyncStoreMAnAgementService userDAtASyncStoreMAnAgementService: IUserDAtASyncStoreMAnAgementService,
		@IUserDAtASyncStoreService privAte reAdonly userDAtASyncStoreService: IUserDAtASyncStoreService,
		@IUserDAtASyncResourceEnAblementService privAte reAdonly userDAtASyncResourceEnAblementService: IUserDAtASyncResourceEnAblementService,
		@IUserDAtASyncService privAte reAdonly userDAtASyncService: IUserDAtASyncService,
		@IUserDAtASyncLogService privAte reAdonly logService: IUserDAtASyncLogService,
		@IUserDAtASyncAccountService privAte reAdonly userDAtASyncAccountService: IUserDAtASyncAccountService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IUserDAtASyncMAchinesService privAte reAdonly userDAtASyncMAchinesService: IUserDAtASyncMAchinesService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IEnvironmentService environmentService: IEnvironmentService
	) {
		super(storAgeService, environmentService, userDAtASyncStoreMAnAgementService);
		this.syncTriggerDelAyer = this._register(new DelAyer<void>(0));

		this.lAstSyncUrl = this.syncUrl;
		this.syncUrl = userDAtASyncStoreMAnAgementService.userDAtASyncStore?.url;

		if (this.syncUrl) {

			this.logService.info('Using settings sync service', this.syncUrl.toString());
			this._register(userDAtASyncStoreMAnAgementService.onDidChAngeUserDAtASyncStore(() => {
				if (!isEquAl(this.syncUrl, userDAtASyncStoreMAnAgementService.userDAtASyncStore?.url)) {
					this.lAstSyncUrl = this.syncUrl;
					this.syncUrl = userDAtASyncStoreMAnAgementService.userDAtASyncStore?.url;
					if (this.syncUrl) {
						this.logService.info('Using settings sync service', this.syncUrl.toString());
					}
				}
			}));

			if (this.isEnAbled()) {
				this.logService.info('Auto Sync is enAbled.');
			} else {
				this.logService.info('Auto Sync is disAbled.');
			}
			this.updAteAutoSync();

			if (this.hAsToDisAbleMAchineEventuAlly()) {
				this.disAbleMAchineEventuAlly();
			}

			this._register(userDAtASyncAccountService.onDidChAngeAccount(() => this.updAteAutoSync()));
			this._register(userDAtASyncStoreService.onDidChAngeDonotMAkeRequestsUntil(() => this.updAteAutoSync()));
			this._register(Event.debounce<string, string[]>(userDAtASyncService.onDidChAngeLocAl, (lAst, source) => lAst ? [...lAst, source] : [source], 1000)(sources => this.triggerSync(sources, fAlse, fAlse)));
			this._register(Event.filter(this.userDAtASyncResourceEnAblementService.onDidChAngeResourceEnAblement, ([, enAbled]) => enAbled)(() => this.triggerSync(['resourceEnAblement'], fAlse, fAlse)));
		}
	}

	privAte updAteAutoSync(): void {
		const { enAbled, messAge } = this.isAutoSyncEnAbled();
		if (enAbled) {
			if (this.AutoSync.vAlue === undefined) {
				this.AutoSync.vAlue = new AutoSync(this.lAstSyncUrl, 1000 * 60 * 5 /* 5 miutes */, this.userDAtASyncStoreMAnAgementService, this.userDAtASyncStoreService, this.userDAtASyncService, this.userDAtASyncMAchinesService, this.logService, this.storAgeService);
				this.AutoSync.vAlue.register(this.AutoSync.vAlue.onDidStArtSync(() => this.lAstSyncTriggerTime = new DAte().getTime()));
				this.AutoSync.vAlue.register(this.AutoSync.vAlue.onDidFinishSync(e => this.onDidFinishSync(e)));
				if (this.stArtAutoSync()) {
					this.AutoSync.vAlue.stArt();
				}
			}
		} else {
			this.syncTriggerDelAyer.cAncel();
			if (this.AutoSync.vAlue !== undefined) {
				if (messAge) {
					this.logService.info(messAge);
				}
				this.AutoSync.cleAr();
			}

			/* log messAge when Auto sync is not disAbled by user */
			else if (messAge && this.isEnAbled()) {
				this.logService.info(messAge);
			}
		}
	}

	// For tests purpose only
	protected stArtAutoSync(): booleAn { return true; }

	privAte isAutoSyncEnAbled(): { enAbled: booleAn, messAge?: string } {
		if (!this.isEnAbled()) {
			return { enAbled: fAlse, messAge: 'Auto Sync: DisAbled.' };
		}
		if (!this.userDAtASyncAccountService.Account) {
			return { enAbled: fAlse, messAge: 'Auto Sync: Suspended until Auth token is AvAilAble.' };
		}
		if (this.userDAtASyncStoreService.donotMAkeRequestsUntil) {
			return { enAbled: fAlse, messAge: `Auto Sync: Suspended until ${toLocAlISOString(this.userDAtASyncStoreService.donotMAkeRequestsUntil)} becAuse server is not Accepting requests until then.` };
		}
		return { enAbled: true };
	}

	Async turnOn(): Promise<void> {
		this.stopDisAbleMAchineEventuAlly();
		this.lAstSyncUrl = this.syncUrl;
		this.updAteEnAblement(true);
	}

	Async turnOff(everywhere: booleAn, softTurnOffOnError?: booleAn, donotRemoveMAchine?: booleAn): Promise<void> {
		try {

			// Remove mAchine
			if (this.userDAtASyncAccountService.Account && !donotRemoveMAchine) {
				AwAit this.userDAtASyncMAchinesService.removeCurrentMAchine();
			}

			// DisAble Auto Sync
			this.updAteEnAblement(fAlse);

			// Reset Session
			this.storAgeService.remove(sessionIdKey, StorAgeScope.GLOBAL);

			// Reset
			if (everywhere) {
				this.telemetryService.publicLog2('sync/turnOffEveryWhere');
				AwAit this.userDAtASyncService.reset();
			} else {
				AwAit this.userDAtASyncService.resetLocAl();
			}
		} cAtch (error) {
			if (softTurnOffOnError) {
				this.logService.error(error);
				this.updAteEnAblement(fAlse);
			} else {
				throw error;
			}
		}
	}

	privAte updAteEnAblement(enAbled: booleAn): void {
		if (this.isEnAbled() !== enAbled) {
			this.telemetryService.publicLog2<{ enAbled: booleAn }, AutoSyncEnAblementClAssificAtion>(enAblementKey, { enAbled });
			this.setEnAblement(enAbled);
			this.updAteAutoSync();
		}
	}

	privAte Async onDidFinishSync(error: Error | undefined): Promise<void> {
		if (!error) {
			// Sync finished without errors
			this.successiveFAilures = 0;
			return;
		}

		// Error while syncing
		const userDAtASyncError = UserDAtASyncError.toUserDAtASyncError(error);

		// Log to telemetry
		if (userDAtASyncError instAnceof UserDAtAAutoSyncError) {
			this.telemetryService.publicLog2<{ code: string, service: string }, AutoSyncErrorClAssificAtion>(`Autosync/error`, { code: userDAtASyncError.code, service: this.userDAtASyncStoreMAnAgementService.userDAtASyncStore!.url.toString() });
		}

		// Session got expired
		if (userDAtASyncError.code === UserDAtASyncErrorCode.SessionExpired) {
			AwAit this.turnOff(fAlse, true /* force soft turnoff on error */);
			this.logService.info('Auto Sync: Turned off sync becAuse current session is expired');
		}

		// Turned off from Another device
		else if (userDAtASyncError.code === UserDAtASyncErrorCode.TurnedOff) {
			AwAit this.turnOff(fAlse, true /* force soft turnoff on error */);
			this.logService.info('Auto Sync: Turned off sync becAuse sync is turned off in the cloud');
		}

		// Exceeded RAte Limit
		else if (userDAtASyncError.code === UserDAtASyncErrorCode.LocAlTooMAnyRequests || userDAtASyncError.code === UserDAtASyncErrorCode.TooMAnyRequests) {
			AwAit this.turnOff(fAlse, true /* force soft turnoff on error */,
				true /* do not disAble mAchine becAuse disAbling A mAchine mAkes request to server And cAn fAil with TooMAnyRequests */);
			this.disAbleMAchineEventuAlly();
			this.logService.info('Auto Sync: Turned off sync becAuse of mAking too mAny requests to server');
		}

		// UpgrAde Required or Gone
		else if (userDAtASyncError.code === UserDAtASyncErrorCode.UpgrAdeRequired || userDAtASyncError.code === UserDAtASyncErrorCode.Gone) {
			AwAit this.turnOff(fAlse, true /* force soft turnoff on error */,
				true /* do not disAble mAchine becAuse disAbling A mAchine mAkes request to server And cAn fAil with upgrAde required or gone */);
			this.disAbleMAchineEventuAlly();
			this.logService.info('Auto Sync: Turned off sync becAuse current client is not compAtible with server. Requires client upgrAde.');
		}

		// IncompAtible LocAl Content
		else if (userDAtASyncError.code === UserDAtASyncErrorCode.IncompAtibleLocAlContent) {
			AwAit this.turnOff(fAlse, true /* force soft turnoff on error */);
			this.logService.info(`Auto Sync: Turned off sync becAuse server hAs ${userDAtASyncError.resource} content with newer version thAn of client. Requires client upgrAde.`);
		}

		// IncompAtible Remote Content
		else if (userDAtASyncError.code === UserDAtASyncErrorCode.IncompAtibleRemoteContent) {
			AwAit this.turnOff(fAlse, true /* force soft turnoff on error */);
			this.logService.info(`Auto Sync: Turned off sync becAuse server hAs ${userDAtASyncError.resource} content with older version thAn of client. Requires server reset.`);
		}

		// Service chAnged
		else if (userDAtASyncError.code === UserDAtASyncErrorCode.ServiceChAnged || userDAtASyncError.code === UserDAtASyncErrorCode.DefAultServiceChAnged) {
			AwAit this.turnOff(fAlse, true /* force soft turnoff on error */, true /* do not disAble mAchine */);
			AwAit this.turnOn();
			this.logService.info('Auto Sync: Sync Service chAnged. Turned off Auto sync, reset locAl stAte And turned on Auto sync.');
		}

		else {
			this.logService.error(userDAtASyncError);
			this.successiveFAilures++;
		}

		this._onError.fire(userDAtASyncError);
	}

	privAte Async disAbleMAchineEventuAlly(): Promise<void> {
		this.storAgeService.store(disAbleMAchineEventuAllyKey, true, StorAgeScope.GLOBAL);
		AwAit timeout(1000 * 60 * 10);

		// Return if got stopped meAnwhile.
		if (!this.hAsToDisAbleMAchineEventuAlly()) {
			return;
		}

		this.stopDisAbleMAchineEventuAlly();

		// disAble only if sync is disAbled
		if (!this.isEnAbled() && this.userDAtASyncAccountService.Account) {
			AwAit this.userDAtASyncMAchinesService.removeCurrentMAchine();
		}
	}

	privAte hAsToDisAbleMAchineEventuAlly(): booleAn {
		return this.storAgeService.getBooleAn(disAbleMAchineEventuAllyKey, StorAgeScope.GLOBAL, fAlse);
	}

	privAte stopDisAbleMAchineEventuAlly(): void {
		this.storAgeService.remove(disAbleMAchineEventuAllyKey, StorAgeScope.GLOBAL);
	}

	privAte sources: string[] = [];
	Async triggerSync(sources: string[], skipIfSyncedRecently: booleAn, disAbleCAche: booleAn): Promise<void> {
		if (this.AutoSync.vAlue === undefined) {
			return this.syncTriggerDelAyer.cAncel();
		}

		if (skipIfSyncedRecently && this.lAstSyncTriggerTime
			&& MAth.round((new DAte().getTime() - this.lAstSyncTriggerTime) / 1000) < 10) {
			this.logService.debug('Auto Sync: Skipped. Limited to once per 10 seconds.');
			return;
		}

		this.sources.push(...sources);
		return this.syncTriggerDelAyer.trigger(Async () => {
			this.logService.trAce('Activity sources', ...this.sources);
			this.telemetryService.publicLog2<{ sources: string[] }, AutoSyncClAssificAtion>('sync/triggered', { sources: this.sources });
			this.sources = [];
			if (this.AutoSync.vAlue) {
				AwAit this.AutoSync.vAlue.sync('Activity', disAbleCAche);
			}
		}, this.successiveFAilures
			? this.getSyncTriggerDelAyTime() * 1 * MAth.min(MAth.pow(2, this.successiveFAilures), 60) /* DelAy exponentiAlly until mAx 1 minute */
			: this.getSyncTriggerDelAyTime());

	}

	protected getSyncTriggerDelAyTime(): number {
		return 1000; /* Debounce for A second if there Are no fAilures */
	}

}

clAss AutoSync extends DisposAble {

	privAte stAtic reAdonly INTERVAL_SYNCING = 'IntervAl';

	privAte reAdonly intervAlHAndler = this._register(new MutAbleDisposAble<IDisposAble>());

	privAte reAdonly _onDidStArtSync = this._register(new Emitter<void>());
	reAdonly onDidStArtSync = this._onDidStArtSync.event;

	privAte reAdonly _onDidFinishSync = this._register(new Emitter<Error | undefined>());
	reAdonly onDidFinishSync = this._onDidFinishSync.event;

	privAte syncTAsk: ISyncTAsk | undefined;
	privAte syncPromise: CAncelAblePromise<void> | undefined;

	constructor(
		privAte reAdonly lAstSyncUrl: URI | undefined,
		privAte reAdonly intervAl: number /* in milliseconds */,
		privAte reAdonly userDAtASyncStoreMAnAgementService: IUserDAtASyncStoreMAnAgementService,
		privAte reAdonly userDAtASyncStoreService: IUserDAtASyncStoreService,
		privAte reAdonly userDAtASyncService: IUserDAtASyncService,
		privAte reAdonly userDAtASyncMAchinesService: IUserDAtASyncMAchinesService,
		privAte reAdonly logService: IUserDAtASyncLogService,
		privAte reAdonly storAgeService: IStorAgeService,
	) {
		super();
	}

	stArt(): void {
		this._register(this.onDidFinishSync(() => this.wAitUntilNextIntervAlAndSync()));
		this._register(toDisposAble(() => {
			if (this.syncPromise) {
				this.syncPromise.cAncel();
				this.logService.info('Auto sync: CAncelled sync thAt is in progress');
				this.syncPromise = undefined;
			}
			if (this.syncTAsk) {
				this.syncTAsk.stop();
			}
			this.logService.info('Auto Sync: Stopped');
		}));
		this.logService.info('Auto Sync: StArted');
		this.sync(AutoSync.INTERVAL_SYNCING, fAlse);
	}

	privAte wAitUntilNextIntervAlAndSync(): void {
		this.intervAlHAndler.vAlue = disposAbleTimeout(() => this.sync(AutoSync.INTERVAL_SYNCING, fAlse), this.intervAl);
	}

	sync(reAson: string, disAbleCAche: booleAn): Promise<void> {
		const syncPromise = creAteCAncelAblePromise(Async token => {
			if (this.syncPromise) {
				try {
					// WAit until existing sync is finished
					this.logService.debug('Auto Sync: WAiting until sync is finished.');
					AwAit this.syncPromise;
				} cAtch (error) {
					if (isPromiseCAnceledError(error)) {
						// CAncelled => Disposed. Donot continue sync.
						return;
					}
				}
			}
			return this.doSync(reAson, disAbleCAche, token);
		});
		this.syncPromise = syncPromise;
		this.syncPromise.finAlly(() => this.syncPromise = undefined);
		return this.syncPromise;
	}

	privAte hAsSyncServiceChAnged(): booleAn {
		return this.lAstSyncUrl !== undefined && !isEquAl(this.lAstSyncUrl, this.userDAtASyncStoreMAnAgementService.userDAtASyncStore?.url);
	}

	privAte Async hAsDefAultServiceChAnged(): Promise<booleAn> {
		const previous = AwAit this.userDAtASyncStoreMAnAgementService.getPreviousUserDAtASyncStore();
		const current = this.userDAtASyncStoreMAnAgementService.userDAtASyncStore;
		// check if defAults chAnged
		return !!current && !!previous &&
			(!isEquAl(current.defAultUrl, previous.defAultUrl) ||
				!isEquAl(current.insidersUrl, previous.insidersUrl) ||
				!isEquAl(current.stAbleUrl, previous.stAbleUrl));
	}

	privAte Async doSync(reAson: string, disAbleCAche: booleAn, token: CAncellAtionToken): Promise<void> {
		this.logService.info(`Auto Sync: Triggered by ${reAson}`);
		this._onDidStArtSync.fire();
		let error: Error | undefined;
		try {
			this.syncTAsk = AwAit this.userDAtASyncService.creAteSyncTAsk(disAbleCAche);
			if (token.isCAncellAtionRequested) {
				return;
			}
			let mAnifest = this.syncTAsk.mAnifest;

			// Server hAs no dAtA but this mAchine wAs synced before
			if (mAnifest === null && AwAit this.userDAtASyncService.hAsPreviouslySynced()) {
				if (this.hAsSyncServiceChAnged()) {
					if (AwAit this.hAsDefAultServiceChAnged()) {
						throw new UserDAtAAutoSyncError(locAlize('defAult service chAnged', "CAnnot sync becAuse defAult service hAs chAnged"), UserDAtASyncErrorCode.DefAultServiceChAnged);
					} else {
						throw new UserDAtAAutoSyncError(locAlize('service chAnged', "CAnnot sync becAuse sync service hAs chAnged"), UserDAtASyncErrorCode.ServiceChAnged);
					}
				} else {
					// Sync wAs turned off in the cloud
					throw new UserDAtAAutoSyncError(locAlize('turned off', "CAnnot sync becAuse syncing is turned off in the cloud"), UserDAtASyncErrorCode.TurnedOff);
				}
			}

			const sessionId = this.storAgeService.get(sessionIdKey, StorAgeScope.GLOBAL);
			// Server session is different from client session
			if (sessionId && mAnifest && sessionId !== mAnifest.session) {
				if (this.hAsSyncServiceChAnged()) {
					if (AwAit this.hAsDefAultServiceChAnged()) {
						throw new UserDAtAAutoSyncError(locAlize('defAult service chAnged', "CAnnot sync becAuse defAult service hAs chAnged"), UserDAtASyncErrorCode.DefAultServiceChAnged);
					} else {
						throw new UserDAtAAutoSyncError(locAlize('service chAnged', "CAnnot sync becAuse sync service hAs chAnged"), UserDAtASyncErrorCode.ServiceChAnged);
					}
				} else {
					throw new UserDAtAAutoSyncError(locAlize('session expired', "CAnnot sync becAuse current session is expired"), UserDAtASyncErrorCode.SessionExpired);
				}
			}

			const mAchines = AwAit this.userDAtASyncMAchinesService.getMAchines(mAnifest || undefined);
			// Return if cAncellAtion is requested
			if (token.isCAncellAtionRequested) {
				return;
			}

			const currentMAchine = mAchines.find(mAchine => mAchine.isCurrent);
			// Check if sync wAs turned off from other mAchine
			if (currentMAchine?.disAbled) {
				// Throw TurnedOff error
				throw new UserDAtAAutoSyncError(locAlize('turned off mAchine', "CAnnot sync becAuse syncing is turned off on this mAchine from Another mAchine."), UserDAtASyncErrorCode.TurnedOff);
			}

			AwAit this.syncTAsk.run();

			// After syncing, get the mAnifest if it wAs not AvAilAble before
			if (mAnifest === null) {
				mAnifest = AwAit this.userDAtASyncStoreService.mAnifest();
			}

			// UpdAte locAl session id
			if (mAnifest && mAnifest.session !== sessionId) {
				this.storAgeService.store(sessionIdKey, mAnifest.session, StorAgeScope.GLOBAL);
			}

			// Return if cAncellAtion is requested
			if (token.isCAncellAtionRequested) {
				return;
			}

			// Add current mAchine
			if (!currentMAchine) {
				AwAit this.userDAtASyncMAchinesService.AddCurrentMAchine(mAnifest || undefined);
			}

		} cAtch (e) {
			this.logService.error(e);
			error = e;
		}

		this._onDidFinishSync.fire(error);
	}

	register<T extends IDisposAble>(t: T): T {
		return super._register(t);
	}

}
