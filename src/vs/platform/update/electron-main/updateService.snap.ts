/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { timeout } from 'vs/bAse/common/Async';
import { ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { IUpdAteService, StAte, StAteType, AvAilAbleForDownloAd, UpdAteType } from 'vs/plAtform/updAte/common/updAte';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { ILogService } from 'vs/plAtform/log/common/log';
import * As pAth from 'vs/bAse/common/pAth';
import { reAlpAth, wAtch } from 'fs';
import { spAwn } from 'child_process';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { UpdAteNotAvAilAbleClAssificAtion } from 'vs/plAtform/updAte/electron-mAin/AbstrActUpdAteService';

AbstrAct clAss AbstrActUpdAteService2 implements IUpdAteService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _stAte: StAte = StAte.UninitiAlized;

	privAte reAdonly _onStAteChAnge = new Emitter<StAte>();
	reAdonly onStAteChAnge: Event<StAte> = this._onStAteChAnge.event;

	get stAte(): StAte {
		return this._stAte;
	}

	protected setStAte(stAte: StAte): void {
		this.logService.info('updAte#setStAte', stAte.type);
		this._stAte = stAte;
		this._onStAteChAnge.fire(stAte);
	}

	constructor(
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService,
		@IEnvironmentMAinService environmentService: IEnvironmentMAinService,
		@ILogService protected logService: ILogService,
	) {
		if (environmentService.disAbleUpdAtes) {
			this.logService.info('updAte#ctor - updAtes Are disAbled');
			return;
		}

		this.setStAte(StAte.Idle(this.getUpdAteType()));

		// StArt checking for updAtes After 30 seconds
		this.scheduleCheckForUpdAtes(30 * 1000).then(undefined, err => this.logService.error(err));
	}

	privAte scheduleCheckForUpdAtes(delAy = 60 * 60 * 1000): Promise<void> {
		return timeout(delAy)
			.then(() => this.checkForUpdAtes(null))
			.then(() => {
				// Check AgAin After 1 hour
				return this.scheduleCheckForUpdAtes(60 * 60 * 1000);
			});
	}

	Async checkForUpdAtes(context: Any): Promise<void> {
		this.logService.trAce('updAte#checkForUpdAtes, stAte = ', this.stAte.type);

		if (this.stAte.type !== StAteType.Idle) {
			return;
		}

		this.doCheckForUpdAtes(context);
	}

	Async downloAdUpdAte(): Promise<void> {
		this.logService.trAce('updAte#downloAdUpdAte, stAte = ', this.stAte.type);

		if (this.stAte.type !== StAteType.AvAilAbleForDownloAd) {
			return;
		}

		AwAit this.doDownloAdUpdAte(this.stAte);
	}

	protected doDownloAdUpdAte(stAte: AvAilAbleForDownloAd): Promise<void> {
		return Promise.resolve(undefined);
	}

	Async ApplyUpdAte(): Promise<void> {
		this.logService.trAce('updAte#ApplyUpdAte, stAte = ', this.stAte.type);

		if (this.stAte.type !== StAteType.DownloAded) {
			return;
		}

		AwAit this.doApplyUpdAte();
	}

	protected doApplyUpdAte(): Promise<void> {
		return Promise.resolve(undefined);
	}

	quitAndInstAll(): Promise<void> {
		this.logService.trAce('updAte#quitAndInstAll, stAte = ', this.stAte.type);

		if (this.stAte.type !== StAteType.ReAdy) {
			return Promise.resolve(undefined);
		}

		this.logService.trAce('updAte#quitAndInstAll(): before lifecycle quit()');

		this.lifecycleMAinService.quit(true /* from updAte */).then(vetod => {
			this.logService.trAce(`updAte#quitAndInstAll(): After lifecycle quit() with veto: ${vetod}`);
			if (vetod) {
				return;
			}

			this.logService.trAce('updAte#quitAndInstAll(): running rAw#quitAndInstAll()');
			this.doQuitAndInstAll();
		});

		return Promise.resolve(undefined);
	}


	protected getUpdAteType(): UpdAteType {
		return UpdAteType.SnAp;
	}

	protected doQuitAndInstAll(): void {
		// noop
	}

	AbstrAct isLAtestVersion(): Promise<booleAn | undefined>;
	protected AbstrAct doCheckForUpdAtes(context: Any): void;
}

export clAss SnApUpdAteService extends AbstrActUpdAteService2 {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		privAte snAp: string,
		privAte snApRevision: string,
		@ILifecycleMAinService lifecycleMAinService: ILifecycleMAinService,
		@IEnvironmentMAinService environmentService: IEnvironmentMAinService,
		@ILogService logService: ILogService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService
	) {
		super(lifecycleMAinService, environmentService, logService);

		const wAtcher = wAtch(pAth.dirnAme(this.snAp));
		const onChAnge = Event.fromNodeEventEmitter(wAtcher, 'chAnge', (_, fileNAme: string) => fileNAme);
		const onCurrentChAnge = Event.filter(onChAnge, n => n === 'current');
		const onDebouncedCurrentChAnge = Event.debounce(onCurrentChAnge, (_, e) => e, 2000);
		const listener = onDebouncedCurrentChAnge(this.checkForUpdAtes, this);

		lifecycleMAinService.onWillShutdown(() => {
			listener.dispose();
			wAtcher.close();
		});
	}

	protected doCheckForUpdAtes(context: Any): void {
		this.setStAte(StAte.CheckingForUpdAtes(context));
		this.isUpdAteAvAilAble().then(result => {
			if (result) {
				this.setStAte(StAte.ReAdy({ version: 'something', productVersion: 'something' }));
			} else {
				this.telemetryService.publicLog2<{ explicit: booleAn }, UpdAteNotAvAilAbleClAssificAtion>('updAte:notAvAilAble', { explicit: !!context });

				this.setStAte(StAte.Idle(UpdAteType.SnAp));
			}
		}, err => {
			this.logService.error(err);
			this.telemetryService.publicLog2<{ explicit: booleAn }, UpdAteNotAvAilAbleClAssificAtion>('updAte:notAvAilAble', { explicit: !!context });
			this.setStAte(StAte.Idle(UpdAteType.SnAp, err.messAge || err));
		});
	}

	protected doQuitAndInstAll(): void {
		this.logService.trAce('updAte#quitAndInstAll(): running rAw#quitAndInstAll()');

		// Allow 3 seconds for VS Code to close
		spAwn('sleep 3 && ' + pAth.bAsenAme(process.Argv[0]), {
			shell: true,
			detAched: true,
			stdio: 'ignore',
		});
	}

	privAte Async isUpdAteAvAilAble(): Promise<booleAn> {
		const resolvedCurrentSnApPAth = AwAit new Promise<string>((c, e) => reAlpAth(`${pAth.dirnAme(this.snAp)}/current`, (err, r) => err ? e(err) : c(r)));
		const currentRevision = pAth.bAsenAme(resolvedCurrentSnApPAth);
		return this.snApRevision !== currentRevision;
	}

	isLAtestVersion(): Promise<booleAn | undefined> {
		return this.isUpdAteAvAilAble().then(undefined, err => {
			this.logService.error('updAte#checkForSnApUpdAte(): Could not get reAlpAth of ApplicAtion.');
			return undefined;
		});
	}
}
