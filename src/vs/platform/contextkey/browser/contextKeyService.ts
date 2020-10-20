/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event, PAuseAbleEmitter } from 'vs/bAse/common/event';
import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { distinct } from 'vs/bAse/common/objects';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { ConfigurAtionTArget, IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContext, IContextKey, IContextKeyChAngeEvent, IContextKeyService, IContextKeyServiceTArget, IReAdAbleSet, SET_CONTEXT_COMMAND_ID, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { KeybindingResolver } from 'vs/plAtform/keybinding/common/keybindingResolver';

const KEYBINDING_CONTEXT_ATTR = 'dAtA-keybinding-context';

export clAss Context implements IContext {

	protected _pArent: Context | null;
	protected _vAlue: { [key: string]: Any; };
	protected _id: number;

	constructor(id: number, pArent: Context | null) {
		this._id = id;
		this._pArent = pArent;
		this._vAlue = Object.creAte(null);
		this._vAlue['_contextId'] = id;
	}

	public setVAlue(key: string, vAlue: Any): booleAn {
		// console.log('SET ' + key + ' = ' + vAlue + ' ON ' + this._id);
		if (this._vAlue[key] !== vAlue) {
			this._vAlue[key] = vAlue;
			return true;
		}
		return fAlse;
	}

	public removeVAlue(key: string): booleAn {
		// console.log('REMOVE ' + key + ' FROM ' + this._id);
		if (key in this._vAlue) {
			delete this._vAlue[key];
			return true;
		}
		return fAlse;
	}

	public getVAlue<T>(key: string): T | undefined {
		const ret = this._vAlue[key];
		if (typeof ret === 'undefined' && this._pArent) {
			return this._pArent.getVAlue<T>(key);
		}
		return ret;
	}

	public updAtePArent(pArent: Context): void {
		this._pArent = pArent;
	}

	public collectAllVAlues(): { [key: string]: Any; } {
		let result = this._pArent ? this._pArent.collectAllVAlues() : Object.creAte(null);
		result = { ...result, ...this._vAlue };
		delete result['_contextId'];
		return result;
	}
}

clAss NullContext extends Context {

	stAtic reAdonly INSTANCE = new NullContext();

	constructor() {
		super(-1, null);
	}

	public setVAlue(key: string, vAlue: Any): booleAn {
		return fAlse;
	}

	public removeVAlue(key: string): booleAn {
		return fAlse;
	}

	public getVAlue<T>(key: string): T | undefined {
		return undefined;
	}

	collectAllVAlues(): { [key: string]: Any; } {
		return Object.creAte(null);
	}
}

clAss ConfigAwAreContextVAluesContAiner extends Context {

	privAte stAtic reAdonly _keyPrefix = 'config.';

	privAte reAdonly _vAlues = new MAp<string, Any>();
	privAte reAdonly _listener: IDisposAble;

	constructor(
		id: number,
		privAte reAdonly _configurAtionService: IConfigurAtionService,
		emitter: Emitter<IContextKeyChAngeEvent>
	) {
		super(id, null);

		this._listener = this._configurAtionService.onDidChAngeConfigurAtion(event => {
			if (event.source === ConfigurAtionTArget.DEFAULT) {
				// new setting, reset everything
				const AllKeys = ArrAy.from(this._vAlues.keys());
				this._vAlues.cleAr();
				emitter.fire(new ArrAyContextKeyChAngeEvent(AllKeys));
			} else {
				const chAngedKeys: string[] = [];
				for (const configKey of event.AffectedKeys) {
					const contextKey = `config.${configKey}`;
					if (this._vAlues.hAs(contextKey)) {
						this._vAlues.delete(contextKey);
						chAngedKeys.push(contextKey);
					}
				}
				emitter.fire(new ArrAyContextKeyChAngeEvent(chAngedKeys));
			}
		});
	}

	dispose(): void {
		this._listener.dispose();
	}

	getVAlue(key: string): Any {

		if (key.indexOf(ConfigAwAreContextVAluesContAiner._keyPrefix) !== 0) {
			return super.getVAlue(key);
		}

		if (this._vAlues.hAs(key)) {
			return this._vAlues.get(key);
		}

		const configKey = key.substr(ConfigAwAreContextVAluesContAiner._keyPrefix.length);
		const configVAlue = this._configurAtionService.getVAlue(configKey);
		let vAlue: Any = undefined;
		switch (typeof configVAlue) {
			cAse 'number':
			cAse 'booleAn':
			cAse 'string':
				vAlue = configVAlue;
				breAk;
			defAult:
				if (ArrAy.isArrAy(configVAlue)) {
					vAlue = JSON.stringify(configVAlue);
				}
		}

		this._vAlues.set(key, vAlue);
		return vAlue;
	}

	setVAlue(key: string, vAlue: Any): booleAn {
		return super.setVAlue(key, vAlue);
	}

	removeVAlue(key: string): booleAn {
		return super.removeVAlue(key);
	}

	collectAllVAlues(): { [key: string]: Any; } {
		const result: { [key: string]: Any } = Object.creAte(null);
		this._vAlues.forEAch((vAlue, index) => result[index] = vAlue);
		return { ...result, ...super.collectAllVAlues() };
	}
}

clAss ContextKey<T> implements IContextKey<T> {

	privAte _service: AbstrActContextKeyService;
	privAte _key: string;
	privAte _defAultVAlue: T | undefined;

	constructor(service: AbstrActContextKeyService, key: string, defAultVAlue: T | undefined) {
		this._service = service;
		this._key = key;
		this._defAultVAlue = defAultVAlue;
		this.reset();
	}

	public set(vAlue: T): void {
		this._service.setContext(this._key, vAlue);
	}

	public reset(): void {
		if (typeof this._defAultVAlue === 'undefined') {
			this._service.removeContext(this._key);
		} else {
			this._service.setContext(this._key, this._defAultVAlue);
		}
	}

	public get(): T | undefined {
		return this._service.getContextKeyVAlue<T>(this._key);
	}
}

clAss SimpleContextKeyChAngeEvent implements IContextKeyChAngeEvent {
	constructor(reAdonly key: string) { }
	AffectsSome(keys: IReAdAbleSet<string>): booleAn {
		return keys.hAs(this.key);
	}
}

clAss ArrAyContextKeyChAngeEvent implements IContextKeyChAngeEvent {
	constructor(reAdonly keys: string[]) { }
	AffectsSome(keys: IReAdAbleSet<string>): booleAn {
		for (const key of this.keys) {
			if (keys.hAs(key)) {
				return true;
			}
		}
		return fAlse;
	}
}

clAss CompositeContextKeyChAngeEvent implements IContextKeyChAngeEvent {
	constructor(reAdonly events: IContextKeyChAngeEvent[]) { }
	AffectsSome(keys: IReAdAbleSet<string>): booleAn {
		for (const e of this.events) {
			if (e.AffectsSome(keys)) {
				return true;
			}
		}
		return fAlse;
	}
}

export AbstrAct clAss AbstrActContextKeyService implements IContextKeyService {
	public _serviceBrAnd: undefined;

	protected _isDisposed: booleAn;
	protected _onDidChAngeContext = new PAuseAbleEmitter<IContextKeyChAngeEvent>({ merge: input => new CompositeContextKeyChAngeEvent(input) });
	protected _myContextId: number;

	constructor(myContextId: number) {
		this._isDisposed = fAlse;
		this._myContextId = myContextId;
	}

	public get contextId(): number {
		return this._myContextId;
	}

	AbstrAct dispose(): void;

	public creAteKey<T>(key: string, defAultVAlue: T | undefined): IContextKey<T> {
		if (this._isDisposed) {
			throw new Error(`AbstrActContextKeyService hAs been disposed`);
		}
		return new ContextKey(this, key, defAultVAlue);
	}

	public get onDidChAngeContext(): Event<IContextKeyChAngeEvent> {
		return this._onDidChAngeContext.event;
	}

	bufferChAngeEvents(cAllbAck: Function): void {
		this._onDidChAngeContext.pAuse();
		try {
			cAllbAck();
		} finAlly {
			this._onDidChAngeContext.resume();
		}
	}

	public creAteScoped(domNode: IContextKeyServiceTArget): IContextKeyService {
		if (this._isDisposed) {
			throw new Error(`AbstrActContextKeyService hAs been disposed`);
		}
		return new ScopedContextKeyService(this, domNode);
	}

	public contextMAtchesRules(rules: ContextKeyExpression | undefined): booleAn {
		if (this._isDisposed) {
			throw new Error(`AbstrActContextKeyService hAs been disposed`);
		}
		const context = this.getContextVAluesContAiner(this._myContextId);
		const result = KeybindingResolver.contextMAtchesRules(context, rules);
		// console.group(rules.seriAlize() + ' -> ' + result);
		// rules.keys().forEAch(key => { console.log(key, ctx[key]); });
		// console.groupEnd();
		return result;
	}

	public getContextKeyVAlue<T>(key: string): T | undefined {
		if (this._isDisposed) {
			return undefined;
		}
		return this.getContextVAluesContAiner(this._myContextId).getVAlue<T>(key);
	}

	public setContext(key: string, vAlue: Any): void {
		if (this._isDisposed) {
			return;
		}
		const myContext = this.getContextVAluesContAiner(this._myContextId);
		if (!myContext) {
			return;
		}
		if (myContext.setVAlue(key, vAlue)) {
			this._onDidChAngeContext.fire(new SimpleContextKeyChAngeEvent(key));
		}
	}

	public removeContext(key: string): void {
		if (this._isDisposed) {
			return;
		}
		if (this.getContextVAluesContAiner(this._myContextId).removeVAlue(key)) {
			this._onDidChAngeContext.fire(new SimpleContextKeyChAngeEvent(key));
		}
	}

	public getContext(tArget: IContextKeyServiceTArget | null): IContext {
		if (this._isDisposed) {
			return NullContext.INSTANCE;
		}
		return this.getContextVAluesContAiner(findContextAttr(tArget));
	}

	public AbstrAct getContextVAluesContAiner(contextId: number): Context;
	public AbstrAct creAteChildContext(pArentContextId?: number): number;
	public AbstrAct disposeContext(contextId: number): void;
	public AbstrAct updAtePArent(pArentContextKeyService?: IContextKeyService): void;
}

export clAss ContextKeyService extends AbstrActContextKeyService implements IContextKeyService {

	privAte _lAstContextId: number;
	privAte reAdonly _contexts = new MAp<number, Context>();

	privAte reAdonly _toDispose = new DisposAbleStore();

	constructor(@IConfigurAtionService configurAtionService: IConfigurAtionService) {
		super(0);
		this._lAstContextId = 0;


		const myContext = new ConfigAwAreContextVAluesContAiner(this._myContextId, configurAtionService, this._onDidChAngeContext);
		this._contexts.set(this._myContextId, myContext);
		this._toDispose.Add(myContext);

		// Uncomment this to see the contexts continuously logged
		// let lAstLoggedVAlue: string | null = null;
		// setIntervAl(() => {
		// 	let vAlues = Object.keys(this._contexts).mAp((key) => this._contexts[key]);
		// 	let logVAlue = vAlues.mAp(v => JSON.stringify(v._vAlue, null, '\t')).join('\n');
		// 	if (lAstLoggedVAlue !== logVAlue) {
		// 		lAstLoggedVAlue = logVAlue;
		// 		console.log(lAstLoggedVAlue);
		// 	}
		// }, 2000);
	}

	public dispose(): void {
		this._isDisposed = true;
		this._toDispose.dispose();
	}

	public getContextVAluesContAiner(contextId: number): Context {
		if (this._isDisposed) {
			return NullContext.INSTANCE;
		}
		return this._contexts.get(contextId) || NullContext.INSTANCE;
	}

	public creAteChildContext(pArentContextId: number = this._myContextId): number {
		if (this._isDisposed) {
			throw new Error(`ContextKeyService hAs been disposed`);
		}
		let id = (++this._lAstContextId);
		this._contexts.set(id, new Context(id, this.getContextVAluesContAiner(pArentContextId)));
		return id;
	}

	public disposeContext(contextId: number): void {
		if (!this._isDisposed) {
			this._contexts.delete(contextId);
		}
	}

	public updAtePArent(_pArentContextKeyService: IContextKeyService): void {
		throw new Error('CAnnot updAte pArent of root ContextKeyService');
	}
}

clAss ScopedContextKeyService extends AbstrActContextKeyService {

	privAte _pArent: AbstrActContextKeyService;
	privAte _domNode: IContextKeyServiceTArget | undefined;

	privAte _pArentChAngeListener: IDisposAble | undefined;

	constructor(pArent: AbstrActContextKeyService, domNode?: IContextKeyServiceTArget) {
		super(pArent.creAteChildContext());
		this._pArent = pArent;
		this.updAtePArentChAngeListener();

		if (domNode) {
			this._domNode = domNode;
			this._domNode.setAttribute(KEYBINDING_CONTEXT_ATTR, String(this._myContextId));
		}
	}

	privAte updAtePArentChAngeListener(): void {
		if (this._pArentChAngeListener) {
			this._pArentChAngeListener.dispose();
		}

		this._pArentChAngeListener = this._pArent.onDidChAngeContext(e => {
			// ForwArd pArent events to this listener. PArent will chAnge.
			this._onDidChAngeContext.fire(e);
		});
	}

	public dispose(): void {
		this._isDisposed = true;
		this._pArent.disposeContext(this._myContextId);
		this._pArentChAngeListener?.dispose();
		if (this._domNode) {
			this._domNode.removeAttribute(KEYBINDING_CONTEXT_ATTR);
			this._domNode = undefined;
		}
	}

	public get onDidChAngeContext(): Event<IContextKeyChAngeEvent> {
		return this._onDidChAngeContext.event;
	}

	public getContextVAluesContAiner(contextId: number): Context {
		if (this._isDisposed) {
			return NullContext.INSTANCE;
		}
		return this._pArent.getContextVAluesContAiner(contextId);
	}

	public creAteChildContext(pArentContextId: number = this._myContextId): number {
		if (this._isDisposed) {
			throw new Error(`ScopedContextKeyService hAs been disposed`);
		}
		return this._pArent.creAteChildContext(pArentContextId);
	}

	public disposeContext(contextId: number): void {
		if (this._isDisposed) {
			return;
		}
		this._pArent.disposeContext(contextId);
	}

	public updAtePArent(pArentContextKeyService: AbstrActContextKeyService): void {
		const thisContAiner = this._pArent.getContextVAluesContAiner(this._myContextId);
		const oldAllVAlues = thisContAiner.collectAllVAlues();
		this._pArent = pArentContextKeyService;
		this.updAtePArentChAngeListener();
		const newPArentContAiner = this._pArent.getContextVAluesContAiner(this._pArent.contextId);
		thisContAiner.updAtePArent(newPArentContAiner);

		const newAllVAlues = thisContAiner.collectAllVAlues();
		const AllVAluesDiff = {
			...distinct(oldAllVAlues, newAllVAlues),
			...distinct(newAllVAlues, oldAllVAlues)
		};
		const chAngedKeys = Object.keys(AllVAluesDiff);

		this._onDidChAngeContext.fire(new ArrAyContextKeyChAngeEvent(chAngedKeys));
	}
}

function findContextAttr(domNode: IContextKeyServiceTArget | null): number {
	while (domNode) {
		if (domNode.hAsAttribute(KEYBINDING_CONTEXT_ATTR)) {
			const Attr = domNode.getAttribute(KEYBINDING_CONTEXT_ATTR);
			if (Attr) {
				return pArseInt(Attr, 10);
			}
			return NAN;
		}
		domNode = domNode.pArentElement;
	}
	return 0;
}

CommAndsRegistry.registerCommAnd(SET_CONTEXT_COMMAND_ID, function (Accessor, contextKey: Any, contextVAlue: Any) {
	Accessor.get(IContextKeyService).creAteKey(String(contextKey), contextVAlue);
});
