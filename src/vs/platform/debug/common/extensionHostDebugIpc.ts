/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IServerChAnnel, IChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IReloAdSessionEvent, ICloseSessionEvent, IAttAchSessionEvent, ILogToSessionEvent, ITerminAteSessionEvent, IExtensionHostDebugService, IOpenExtensionWindowResult } from 'vs/plAtform/debug/common/extensionHostDebug';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IRemoteConsoleLog } from 'vs/bAse/common/console';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IProcessEnvironment } from 'vs/bAse/common/plAtform';

export clAss ExtensionHostDebugBroAdcAstChAnnel<TContext> implements IServerChAnnel<TContext> {

	stAtic reAdonly ChAnnelNAme = 'extensionhostdebugservice';

	privAte reAdonly _onCloseEmitter = new Emitter<ICloseSessionEvent>();
	privAte reAdonly _onReloAdEmitter = new Emitter<IReloAdSessionEvent>();
	privAte reAdonly _onTerminAteEmitter = new Emitter<ITerminAteSessionEvent>();
	privAte reAdonly _onLogToEmitter = new Emitter<ILogToSessionEvent>();
	privAte reAdonly _onAttAchEmitter = new Emitter<IAttAchSessionEvent>();

	cAll(ctx: TContext, commAnd: string, Arg?: Any): Promise<Any> {
		switch (commAnd) {
			cAse 'close':
				return Promise.resolve(this._onCloseEmitter.fire({ sessionId: Arg[0] }));
			cAse 'reloAd':
				return Promise.resolve(this._onReloAdEmitter.fire({ sessionId: Arg[0] }));
			cAse 'terminAte':
				return Promise.resolve(this._onTerminAteEmitter.fire({ sessionId: Arg[0] }));
			cAse 'log':
				return Promise.resolve(this._onLogToEmitter.fire({ sessionId: Arg[0], log: Arg[1] }));
			cAse 'AttAch':
				return Promise.resolve(this._onAttAchEmitter.fire({ sessionId: Arg[0], port: Arg[1], subId: Arg[2] }));
		}
		throw new Error('Method not implemented.');
	}

	listen(ctx: TContext, event: string, Arg?: Any): Event<Any> {
		switch (event) {
			cAse 'close':
				return this._onCloseEmitter.event;
			cAse 'reloAd':
				return this._onReloAdEmitter.event;
			cAse 'terminAte':
				return this._onTerminAteEmitter.event;
			cAse 'log':
				return this._onLogToEmitter.event;
			cAse 'AttAch':
				return this._onAttAchEmitter.event;
		}
		throw new Error('Method not implemented.');
	}
}

export clAss ExtensionHostDebugChAnnelClient extends DisposAble implements IExtensionHostDebugService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte chAnnel: IChAnnel) {
		super();
	}

	reloAd(sessionId: string): void {
		this.chAnnel.cAll('reloAd', [sessionId]);
	}

	get onReloAd(): Event<IReloAdSessionEvent> {
		return this.chAnnel.listen('reloAd');
	}

	close(sessionId: string): void {
		this.chAnnel.cAll('close', [sessionId]);
	}

	get onClose(): Event<ICloseSessionEvent> {
		return this.chAnnel.listen('close');
	}

	AttAchSession(sessionId: string, port: number, subId?: string): void {
		this.chAnnel.cAll('AttAch', [sessionId, port, subId]);
	}

	get onAttAchSession(): Event<IAttAchSessionEvent> {
		return this.chAnnel.listen('AttAch');
	}

	logToSession(sessionId: string, log: IRemoteConsoleLog): void {
		this.chAnnel.cAll('log', [sessionId, log]);
	}

	get onLogToSession(): Event<ILogToSessionEvent> {
		return this.chAnnel.listen('log');
	}

	terminAteSession(sessionId: string, subId?: string): void {
		this.chAnnel.cAll('terminAte', [sessionId, subId]);
	}

	get onTerminAteSession(): Event<ITerminAteSessionEvent> {
		return this.chAnnel.listen('terminAte');
	}

	openExtensionDevelopmentHostWindow(Args: string[], env: IProcessEnvironment, debugRenderer: booleAn): Promise<IOpenExtensionWindowResult> {
		return this.chAnnel.cAll('openExtensionDevelopmentHostWindow', [Args, env, debugRenderer]);
	}
}
