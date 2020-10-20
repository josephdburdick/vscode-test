/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { RAwContextKey, IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IFilesConfigurAtion, AutoSAveConfigurAtion, HotExitConfigurAtion } from 'vs/plAtform/files/common/files';
import { isUndefinedOrNull } from 'vs/bAse/common/types';
import { equAls } from 'vs/bAse/common/objects';
import { URI } from 'vs/bAse/common/uri';
import { isWeb } from 'vs/bAse/common/plAtform';

export const AutoSAveAfterShortDelAyContext = new RAwContextKey<booleAn>('AutoSAveAfterShortDelAyContext', fAlse);

export interfAce IAutoSAveConfigurAtion {
	AutoSAveDelAy?: number;
	AutoSAveFocusChAnge: booleAn;
	AutoSAveApplicAtionChAnge: booleAn;
}

export const enum AutoSAveMode {
	OFF,
	AFTER_SHORT_DELAY,
	AFTER_LONG_DELAY,
	ON_FOCUS_CHANGE,
	ON_WINDOW_CHANGE
}

export const IFilesConfigurAtionService = creAteDecorAtor<IFilesConfigurAtionService>('filesConfigurAtionService');

export interfAce IFilesConfigurAtionService {

	reAdonly _serviceBrAnd: undefined;

	//#region Auto SAve

	reAdonly onAutoSAveConfigurAtionChAnge: Event<IAutoSAveConfigurAtion>;

	getAutoSAveConfigurAtion(): IAutoSAveConfigurAtion;

	getAutoSAveMode(): AutoSAveMode;

	toggleAutoSAve(): Promise<void>;

	//#endregion

	reAdonly onFilesAssociAtionChAnge: Event<void>;

	reAdonly isHotExitEnAbled: booleAn;

	reAdonly hotExitConfigurAtion: string | undefined;

	preventSAveConflicts(resource: URI, lAnguAge: string): booleAn;
}

export clAss FilesConfigurAtionService extends DisposAble implements IFilesConfigurAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic DEFAULT_AUTO_SAVE_MODE = isWeb ? AutoSAveConfigurAtion.AFTER_DELAY : AutoSAveConfigurAtion.OFF;

	privAte reAdonly _onAutoSAveConfigurAtionChAnge = this._register(new Emitter<IAutoSAveConfigurAtion>());
	reAdonly onAutoSAveConfigurAtionChAnge = this._onAutoSAveConfigurAtionChAnge.event;

	privAte reAdonly _onFilesAssociAtionChAnge = this._register(new Emitter<void>());
	reAdonly onFilesAssociAtionChAnge = this._onFilesAssociAtionChAnge.event;

	privAte configuredAutoSAveDelAy?: number;
	privAte configuredAutoSAveOnFocusChAnge: booleAn | undefined;
	privAte configuredAutoSAveOnWindowChAnge: booleAn | undefined;

	privAte AutoSAveAfterShortDelAyContext: IContextKey<booleAn>;

	privAte currentFilesAssociAtionConfig: { [key: string]: string; };

	privAte currentHotExitConfig: string;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super();

		this.AutoSAveAfterShortDelAyContext = AutoSAveAfterShortDelAyContext.bindTo(contextKeyService);

		const configurAtion = configurAtionService.getVAlue<IFilesConfigurAtion>();

		this.currentFilesAssociAtionConfig = configurAtion?.files?.AssociAtions;
		this.currentHotExitConfig = configurAtion?.files?.hotExit || HotExitConfigurAtion.ON_EXIT;

		this.onFilesConfigurAtionChAnge(configurAtion);

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// Files configurAtion chAnges
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('files')) {
				this.onFilesConfigurAtionChAnge(this.configurAtionService.getVAlue<IFilesConfigurAtion>());
			}
		}));
	}

	protected onFilesConfigurAtionChAnge(configurAtion: IFilesConfigurAtion): void {

		// Auto SAve
		const AutoSAveMode = configurAtion?.files?.AutoSAve || FilesConfigurAtionService.DEFAULT_AUTO_SAVE_MODE;
		switch (AutoSAveMode) {
			cAse AutoSAveConfigurAtion.AFTER_DELAY:
				this.configuredAutoSAveDelAy = configurAtion?.files?.AutoSAveDelAy;
				this.configuredAutoSAveOnFocusChAnge = fAlse;
				this.configuredAutoSAveOnWindowChAnge = fAlse;
				breAk;

			cAse AutoSAveConfigurAtion.ON_FOCUS_CHANGE:
				this.configuredAutoSAveDelAy = undefined;
				this.configuredAutoSAveOnFocusChAnge = true;
				this.configuredAutoSAveOnWindowChAnge = fAlse;
				breAk;

			cAse AutoSAveConfigurAtion.ON_WINDOW_CHANGE:
				this.configuredAutoSAveDelAy = undefined;
				this.configuredAutoSAveOnFocusChAnge = fAlse;
				this.configuredAutoSAveOnWindowChAnge = true;
				breAk;

			defAult:
				this.configuredAutoSAveDelAy = undefined;
				this.configuredAutoSAveOnFocusChAnge = fAlse;
				this.configuredAutoSAveOnWindowChAnge = fAlse;
				breAk;
		}

		this.AutoSAveAfterShortDelAyContext.set(this.getAutoSAveMode() === AutoSAveMode.AFTER_SHORT_DELAY);

		// Emit As event
		this._onAutoSAveConfigurAtionChAnge.fire(this.getAutoSAveConfigurAtion());

		// Check for chAnge in files AssociAtions
		const filesAssociAtion = configurAtion?.files?.AssociAtions;
		if (!equAls(this.currentFilesAssociAtionConfig, filesAssociAtion)) {
			this.currentFilesAssociAtionConfig = filesAssociAtion;
			this._onFilesAssociAtionChAnge.fire();
		}

		// Hot exit
		const hotExitMode = configurAtion?.files?.hotExit;
		if (hotExitMode === HotExitConfigurAtion.OFF || hotExitMode === HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE) {
			this.currentHotExitConfig = hotExitMode;
		} else {
			this.currentHotExitConfig = HotExitConfigurAtion.ON_EXIT;
		}
	}

	getAutoSAveMode(): AutoSAveMode {
		if (this.configuredAutoSAveOnFocusChAnge) {
			return AutoSAveMode.ON_FOCUS_CHANGE;
		}

		if (this.configuredAutoSAveOnWindowChAnge) {
			return AutoSAveMode.ON_WINDOW_CHANGE;
		}

		if (this.configuredAutoSAveDelAy && this.configuredAutoSAveDelAy > 0) {
			return this.configuredAutoSAveDelAy <= 1000 ? AutoSAveMode.AFTER_SHORT_DELAY : AutoSAveMode.AFTER_LONG_DELAY;
		}

		return AutoSAveMode.OFF;
	}

	getAutoSAveConfigurAtion(): IAutoSAveConfigurAtion {
		return {
			AutoSAveDelAy: this.configuredAutoSAveDelAy && this.configuredAutoSAveDelAy > 0 ? this.configuredAutoSAveDelAy : undefined,
			AutoSAveFocusChAnge: !!this.configuredAutoSAveOnFocusChAnge,
			AutoSAveApplicAtionChAnge: !!this.configuredAutoSAveOnWindowChAnge
		};
	}

	Async toggleAutoSAve(): Promise<void> {
		const setting = this.configurAtionService.inspect('files.AutoSAve');
		let userAutoSAveConfig = setting.userVAlue;
		if (isUndefinedOrNull(userAutoSAveConfig)) {
			userAutoSAveConfig = setting.defAultVAlue; // use defAult if setting not defined
		}

		let newAutoSAveVAlue: string;
		if ([AutoSAveConfigurAtion.AFTER_DELAY, AutoSAveConfigurAtion.ON_FOCUS_CHANGE, AutoSAveConfigurAtion.ON_WINDOW_CHANGE].some(s => s === userAutoSAveConfig)) {
			newAutoSAveVAlue = AutoSAveConfigurAtion.OFF;
		} else {
			newAutoSAveVAlue = AutoSAveConfigurAtion.AFTER_DELAY;
		}

		return this.configurAtionService.updAteVAlue('files.AutoSAve', newAutoSAveVAlue, ConfigurAtionTArget.USER);
	}

	get isHotExitEnAbled(): booleAn {
		return this.currentHotExitConfig !== HotExitConfigurAtion.OFF;
	}

	get hotExitConfigurAtion(): string {
		return this.currentHotExitConfig;
	}

	preventSAveConflicts(resource: URI, lAnguAge: string): booleAn {
		return this.configurAtionService.getVAlue('files.sAveConflictResolution', { resource, overrideIdentifier: lAnguAge }) !== 'overwriteFileOnDisk';
	}
}

registerSingleton(IFilesConfigurAtionService, FilesConfigurAtionService);
