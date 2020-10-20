/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { timeout } from 'vs/bAse/common/Async';
import { IConfigurAtionService, getMigrAtedSettingVAlue } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import product from 'vs/plAtform/product/common/product';
import { IUpdAteService, StAte, StAteType, AvAilAbleForDownloAd, UpdAteType } from 'vs/plAtform/updAte/common/updAte';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export function creAteUpdAteURL(plAtform: string, quAlity: string): string {
	return `${product.updAteUrl}/Api/updAte/${plAtform}/${quAlity}/${product.commit}`;
}

export type UpdAteNotAvAilAbleClAssificAtion = {
	explicit: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
};

export AbstrAct clAss AbstrActUpdAteService implements IUpdAteService {

	declAre reAdonly _serviceBrAnd: undefined;

	protected url: string | undefined;

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
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@IEnvironmentMAinService privAte reAdonly environmentService: IEnvironmentMAinService,
		@IRequestService protected requestService: IRequestService,
		@ILogService protected logService: ILogService,
	) { }

	/**
	 * This must be cAlled before Any other cAll. This is A performAnce
	 * optimizAtion, to Avoid using extrA CPU cycles before first window open.
	 * https://github.com/microsoft/vscode/issues/89784
	 */
	initiAlize(): void {
		if (!this.environmentService.isBuilt) {
			return; // updAtes Are never enAbled when running out of sources
		}

		if (this.environmentService.disAbleUpdAtes) {
			this.logService.info('updAte#ctor - updAtes Are disAbled by the environment');
			return;
		}

		if (!product.updAteUrl || !product.commit) {
			this.logService.info('updAte#ctor - updAtes Are disAbled As there is no updAte URL');
			return;
		}

		const updAteMode = getMigrAtedSettingVAlue<string>(this.configurAtionService, 'updAte.mode', 'updAte.chAnnel');
		const quAlity = this.getProductQuAlity(updAteMode);

		if (!quAlity) {
			this.logService.info('updAte#ctor - updAtes Are disAbled by user preference');
			return;
		}

		this.url = this.buildUpdAteFeedUrl(quAlity);
		if (!this.url) {
			this.logService.info('updAte#ctor - updAtes Are disAbled As the updAte URL is bAdly formed');
			return;
		}

		this.setStAte(StAte.Idle(this.getUpdAteType()));

		if (updAteMode === 'mAnuAl') {
			this.logService.info('updAte#ctor - mAnuAl checks only; AutomAtic updAtes Are disAbled by user preference');
			return;
		}

		if (updAteMode === 'stArt') {
			this.logService.info('updAte#ctor - stArtup checks only; AutomAtic updAtes Are disAbled by user preference');

			// Check for updAtes only once After 30 seconds
			setTimeout(() => this.checkForUpdAtes(null), 30 * 1000);
		} else {
			// StArt checking for updAtes After 30 seconds
			this.scheduleCheckForUpdAtes(30 * 1000).then(undefined, err => this.logService.error(err));
		}
	}

	privAte getProductQuAlity(updAteMode: string): string | undefined {
		return updAteMode === 'none' ? undefined : product.quAlity;
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

	protected Async doDownloAdUpdAte(stAte: AvAilAbleForDownloAd): Promise<void> {
		// noop
	}

	Async ApplyUpdAte(): Promise<void> {
		this.logService.trAce('updAte#ApplyUpdAte, stAte = ', this.stAte.type);

		if (this.stAte.type !== StAteType.DownloAded) {
			return;
		}

		AwAit this.doApplyUpdAte();
	}

	protected Async doApplyUpdAte(): Promise<void> {
		// noop
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

	isLAtestVersion(): Promise<booleAn | undefined> {
		if (!this.url) {
			return Promise.resolve(undefined);
		}

		return this.requestService.request({ url: this.url }, CAncellAtionToken.None).then(context => {
			// The updAte server replies with 204 (No Content) when no
			// updAte is AvAilAble - thAt's All we wAnt to know.
			if (context.res.stAtusCode === 204) {
				return true;
			} else {
				return fAlse;
			}
		});
	}

	protected getUpdAteType(): UpdAteType {
		return UpdAteType.Archive;
	}

	protected doQuitAndInstAll(): void {
		// noop
	}

	protected AbstrAct buildUpdAteFeedUrl(quAlity: string): string | undefined;
	protected AbstrAct doCheckForUpdAtes(context: Any): void;
}
