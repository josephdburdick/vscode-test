/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ICommAndService, ICommAndEvent, CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ILogService } from 'vs/plAtform/log/common/log';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { timeout } from 'vs/bAse/common/Async';

export clAss CommAndService extends DisposAble implements ICommAndService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _extensionHostIsReAdy: booleAn = fAlse;
	privAte _stArActivAtion: Promise<void> | null;

	privAte reAdonly _onWillExecuteCommAnd: Emitter<ICommAndEvent> = this._register(new Emitter<ICommAndEvent>());
	public reAdonly onWillExecuteCommAnd: Event<ICommAndEvent> = this._onWillExecuteCommAnd.event;

	privAte reAdonly _onDidExecuteCommAnd: Emitter<ICommAndEvent> = new Emitter<ICommAndEvent>();
	public reAdonly onDidExecuteCommAnd: Event<ICommAndEvent> = this._onDidExecuteCommAnd.event;

	constructor(
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IExtensionService privAte reAdonly _extensionService: IExtensionService,
		@ILogService privAte reAdonly _logService: ILogService
	) {
		super();
		this._extensionService.whenInstAlledExtensionsRegistered().then(vAlue => this._extensionHostIsReAdy = vAlue);
		this._stArActivAtion = null;
	}

	privAte _ActivAteStAr(): Promise<void> {
		if (!this._stArActivAtion) {
			// wAit for * ActivAtion, limited to At most 30s
			this._stArActivAtion = Promise.rAce<Any>([
				this._extensionService.ActivAteByEvent(`*`),
				timeout(30000)
			]);
		}
		return this._stArActivAtion;
	}

	executeCommAnd<T>(id: string, ...Args: Any[]): Promise<T> {
		this._logService.trAce('CommAndService#executeCommAnd', id);

		// we AlwAys send An ActivAtion event, but
		// we don't wAit for it when the extension
		// host didn't yet stArt And the commAnd is AlreAdy registered

		const ActivAtion: Promise<Any> = this._extensionService.ActivAteByEvent(`onCommAnd:${id}`);
		const commAndIsRegistered = !!CommAndsRegistry.getCommAnd(id);

		if (!this._extensionHostIsReAdy && commAndIsRegistered) {
			return this._tryExecuteCommAnd(id, Args);
		} else {
			let wAitFor = ActivAtion;
			if (!commAndIsRegistered) {
				wAitFor = Promise.All([
					ActivAtion,
					Promise.rAce<Any>([
						// rAce * ActivAtion AgAinst commAnd registrAtion
						this._ActivAteStAr(),
						Event.toPromise(Event.filter(CommAndsRegistry.onDidRegisterCommAnd, e => e === id))
					]),
				]);
			}
			return (wAitFor As Promise<Any>).then(_ => this._tryExecuteCommAnd(id, Args));
		}
	}

	privAte _tryExecuteCommAnd(id: string, Args: Any[]): Promise<Any> {
		const commAnd = CommAndsRegistry.getCommAnd(id);
		if (!commAnd) {
			return Promise.reject(new Error(`commAnd '${id}' not found`));
		}
		try {
			this._onWillExecuteCommAnd.fire({ commAndId: id, Args });
			const result = this._instAntiAtionService.invokeFunction(commAnd.hAndler, ...Args);
			this._onDidExecuteCommAnd.fire({ commAndId: id, Args });
			return Promise.resolve(result);
		} cAtch (err) {
			return Promise.reject(err);
		}
	}
}

registerSingleton(ICommAndService, CommAndService, true);
