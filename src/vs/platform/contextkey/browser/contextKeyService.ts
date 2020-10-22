/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event, PauseaBleEmitter } from 'vs/Base/common/event';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { distinct } from 'vs/Base/common/oBjects';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContext, IContextKey, IContextKeyChangeEvent, IContextKeyService, IContextKeyServiceTarget, IReadaBleSet, SET_CONTEXT_COMMAND_ID, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingResolver } from 'vs/platform/keyBinding/common/keyBindingResolver';

const KEYBINDING_CONTEXT_ATTR = 'data-keyBinding-context';

export class Context implements IContext {

	protected _parent: Context | null;
	protected _value: { [key: string]: any; };
	protected _id: numBer;

	constructor(id: numBer, parent: Context | null) {
		this._id = id;
		this._parent = parent;
		this._value = OBject.create(null);
		this._value['_contextId'] = id;
	}

	puBlic setValue(key: string, value: any): Boolean {
		// console.log('SET ' + key + ' = ' + value + ' ON ' + this._id);
		if (this._value[key] !== value) {
			this._value[key] = value;
			return true;
		}
		return false;
	}

	puBlic removeValue(key: string): Boolean {
		// console.log('REMOVE ' + key + ' FROM ' + this._id);
		if (key in this._value) {
			delete this._value[key];
			return true;
		}
		return false;
	}

	puBlic getValue<T>(key: string): T | undefined {
		const ret = this._value[key];
		if (typeof ret === 'undefined' && this._parent) {
			return this._parent.getValue<T>(key);
		}
		return ret;
	}

	puBlic updateParent(parent: Context): void {
		this._parent = parent;
	}

	puBlic collectAllValues(): { [key: string]: any; } {
		let result = this._parent ? this._parent.collectAllValues() : OBject.create(null);
		result = { ...result, ...this._value };
		delete result['_contextId'];
		return result;
	}
}

class NullContext extends Context {

	static readonly INSTANCE = new NullContext();

	constructor() {
		super(-1, null);
	}

	puBlic setValue(key: string, value: any): Boolean {
		return false;
	}

	puBlic removeValue(key: string): Boolean {
		return false;
	}

	puBlic getValue<T>(key: string): T | undefined {
		return undefined;
	}

	collectAllValues(): { [key: string]: any; } {
		return OBject.create(null);
	}
}

class ConfigAwareContextValuesContainer extends Context {

	private static readonly _keyPrefix = 'config.';

	private readonly _values = new Map<string, any>();
	private readonly _listener: IDisposaBle;

	constructor(
		id: numBer,
		private readonly _configurationService: IConfigurationService,
		emitter: Emitter<IContextKeyChangeEvent>
	) {
		super(id, null);

		this._listener = this._configurationService.onDidChangeConfiguration(event => {
			if (event.source === ConfigurationTarget.DEFAULT) {
				// new setting, reset everything
				const allKeys = Array.from(this._values.keys());
				this._values.clear();
				emitter.fire(new ArrayContextKeyChangeEvent(allKeys));
			} else {
				const changedKeys: string[] = [];
				for (const configKey of event.affectedKeys) {
					const contextKey = `config.${configKey}`;
					if (this._values.has(contextKey)) {
						this._values.delete(contextKey);
						changedKeys.push(contextKey);
					}
				}
				emitter.fire(new ArrayContextKeyChangeEvent(changedKeys));
			}
		});
	}

	dispose(): void {
		this._listener.dispose();
	}

	getValue(key: string): any {

		if (key.indexOf(ConfigAwareContextValuesContainer._keyPrefix) !== 0) {
			return super.getValue(key);
		}

		if (this._values.has(key)) {
			return this._values.get(key);
		}

		const configKey = key.suBstr(ConfigAwareContextValuesContainer._keyPrefix.length);
		const configValue = this._configurationService.getValue(configKey);
		let value: any = undefined;
		switch (typeof configValue) {
			case 'numBer':
			case 'Boolean':
			case 'string':
				value = configValue;
				Break;
			default:
				if (Array.isArray(configValue)) {
					value = JSON.stringify(configValue);
				}
		}

		this._values.set(key, value);
		return value;
	}

	setValue(key: string, value: any): Boolean {
		return super.setValue(key, value);
	}

	removeValue(key: string): Boolean {
		return super.removeValue(key);
	}

	collectAllValues(): { [key: string]: any; } {
		const result: { [key: string]: any } = OBject.create(null);
		this._values.forEach((value, index) => result[index] = value);
		return { ...result, ...super.collectAllValues() };
	}
}

class ContextKey<T> implements IContextKey<T> {

	private _service: ABstractContextKeyService;
	private _key: string;
	private _defaultValue: T | undefined;

	constructor(service: ABstractContextKeyService, key: string, defaultValue: T | undefined) {
		this._service = service;
		this._key = key;
		this._defaultValue = defaultValue;
		this.reset();
	}

	puBlic set(value: T): void {
		this._service.setContext(this._key, value);
	}

	puBlic reset(): void {
		if (typeof this._defaultValue === 'undefined') {
			this._service.removeContext(this._key);
		} else {
			this._service.setContext(this._key, this._defaultValue);
		}
	}

	puBlic get(): T | undefined {
		return this._service.getContextKeyValue<T>(this._key);
	}
}

class SimpleContextKeyChangeEvent implements IContextKeyChangeEvent {
	constructor(readonly key: string) { }
	affectsSome(keys: IReadaBleSet<string>): Boolean {
		return keys.has(this.key);
	}
}

class ArrayContextKeyChangeEvent implements IContextKeyChangeEvent {
	constructor(readonly keys: string[]) { }
	affectsSome(keys: IReadaBleSet<string>): Boolean {
		for (const key of this.keys) {
			if (keys.has(key)) {
				return true;
			}
		}
		return false;
	}
}

class CompositeContextKeyChangeEvent implements IContextKeyChangeEvent {
	constructor(readonly events: IContextKeyChangeEvent[]) { }
	affectsSome(keys: IReadaBleSet<string>): Boolean {
		for (const e of this.events) {
			if (e.affectsSome(keys)) {
				return true;
			}
		}
		return false;
	}
}

export aBstract class ABstractContextKeyService implements IContextKeyService {
	puBlic _serviceBrand: undefined;

	protected _isDisposed: Boolean;
	protected _onDidChangeContext = new PauseaBleEmitter<IContextKeyChangeEvent>({ merge: input => new CompositeContextKeyChangeEvent(input) });
	protected _myContextId: numBer;

	constructor(myContextId: numBer) {
		this._isDisposed = false;
		this._myContextId = myContextId;
	}

	puBlic get contextId(): numBer {
		return this._myContextId;
	}

	aBstract dispose(): void;

	puBlic createKey<T>(key: string, defaultValue: T | undefined): IContextKey<T> {
		if (this._isDisposed) {
			throw new Error(`ABstractContextKeyService has Been disposed`);
		}
		return new ContextKey(this, key, defaultValue);
	}

	puBlic get onDidChangeContext(): Event<IContextKeyChangeEvent> {
		return this._onDidChangeContext.event;
	}

	BufferChangeEvents(callBack: Function): void {
		this._onDidChangeContext.pause();
		try {
			callBack();
		} finally {
			this._onDidChangeContext.resume();
		}
	}

	puBlic createScoped(domNode: IContextKeyServiceTarget): IContextKeyService {
		if (this._isDisposed) {
			throw new Error(`ABstractContextKeyService has Been disposed`);
		}
		return new ScopedContextKeyService(this, domNode);
	}

	puBlic contextMatchesRules(rules: ContextKeyExpression | undefined): Boolean {
		if (this._isDisposed) {
			throw new Error(`ABstractContextKeyService has Been disposed`);
		}
		const context = this.getContextValuesContainer(this._myContextId);
		const result = KeyBindingResolver.contextMatchesRules(context, rules);
		// console.group(rules.serialize() + ' -> ' + result);
		// rules.keys().forEach(key => { console.log(key, ctx[key]); });
		// console.groupEnd();
		return result;
	}

	puBlic getContextKeyValue<T>(key: string): T | undefined {
		if (this._isDisposed) {
			return undefined;
		}
		return this.getContextValuesContainer(this._myContextId).getValue<T>(key);
	}

	puBlic setContext(key: string, value: any): void {
		if (this._isDisposed) {
			return;
		}
		const myContext = this.getContextValuesContainer(this._myContextId);
		if (!myContext) {
			return;
		}
		if (myContext.setValue(key, value)) {
			this._onDidChangeContext.fire(new SimpleContextKeyChangeEvent(key));
		}
	}

	puBlic removeContext(key: string): void {
		if (this._isDisposed) {
			return;
		}
		if (this.getContextValuesContainer(this._myContextId).removeValue(key)) {
			this._onDidChangeContext.fire(new SimpleContextKeyChangeEvent(key));
		}
	}

	puBlic getContext(target: IContextKeyServiceTarget | null): IContext {
		if (this._isDisposed) {
			return NullContext.INSTANCE;
		}
		return this.getContextValuesContainer(findContextAttr(target));
	}

	puBlic aBstract getContextValuesContainer(contextId: numBer): Context;
	puBlic aBstract createChildContext(parentContextId?: numBer): numBer;
	puBlic aBstract disposeContext(contextId: numBer): void;
	puBlic aBstract updateParent(parentContextKeyService?: IContextKeyService): void;
}

export class ContextKeyService extends ABstractContextKeyService implements IContextKeyService {

	private _lastContextId: numBer;
	private readonly _contexts = new Map<numBer, Context>();

	private readonly _toDispose = new DisposaBleStore();

	constructor(@IConfigurationService configurationService: IConfigurationService) {
		super(0);
		this._lastContextId = 0;


		const myContext = new ConfigAwareContextValuesContainer(this._myContextId, configurationService, this._onDidChangeContext);
		this._contexts.set(this._myContextId, myContext);
		this._toDispose.add(myContext);

		// Uncomment this to see the contexts continuously logged
		// let lastLoggedValue: string | null = null;
		// setInterval(() => {
		// 	let values = OBject.keys(this._contexts).map((key) => this._contexts[key]);
		// 	let logValue = values.map(v => JSON.stringify(v._value, null, '\t')).join('\n');
		// 	if (lastLoggedValue !== logValue) {
		// 		lastLoggedValue = logValue;
		// 		console.log(lastLoggedValue);
		// 	}
		// }, 2000);
	}

	puBlic dispose(): void {
		this._isDisposed = true;
		this._toDispose.dispose();
	}

	puBlic getContextValuesContainer(contextId: numBer): Context {
		if (this._isDisposed) {
			return NullContext.INSTANCE;
		}
		return this._contexts.get(contextId) || NullContext.INSTANCE;
	}

	puBlic createChildContext(parentContextId: numBer = this._myContextId): numBer {
		if (this._isDisposed) {
			throw new Error(`ContextKeyService has Been disposed`);
		}
		let id = (++this._lastContextId);
		this._contexts.set(id, new Context(id, this.getContextValuesContainer(parentContextId)));
		return id;
	}

	puBlic disposeContext(contextId: numBer): void {
		if (!this._isDisposed) {
			this._contexts.delete(contextId);
		}
	}

	puBlic updateParent(_parentContextKeyService: IContextKeyService): void {
		throw new Error('Cannot update parent of root ContextKeyService');
	}
}

class ScopedContextKeyService extends ABstractContextKeyService {

	private _parent: ABstractContextKeyService;
	private _domNode: IContextKeyServiceTarget | undefined;

	private _parentChangeListener: IDisposaBle | undefined;

	constructor(parent: ABstractContextKeyService, domNode?: IContextKeyServiceTarget) {
		super(parent.createChildContext());
		this._parent = parent;
		this.updateParentChangeListener();

		if (domNode) {
			this._domNode = domNode;
			this._domNode.setAttriBute(KEYBINDING_CONTEXT_ATTR, String(this._myContextId));
		}
	}

	private updateParentChangeListener(): void {
		if (this._parentChangeListener) {
			this._parentChangeListener.dispose();
		}

		this._parentChangeListener = this._parent.onDidChangeContext(e => {
			// Forward parent events to this listener. Parent will change.
			this._onDidChangeContext.fire(e);
		});
	}

	puBlic dispose(): void {
		this._isDisposed = true;
		this._parent.disposeContext(this._myContextId);
		this._parentChangeListener?.dispose();
		if (this._domNode) {
			this._domNode.removeAttriBute(KEYBINDING_CONTEXT_ATTR);
			this._domNode = undefined;
		}
	}

	puBlic get onDidChangeContext(): Event<IContextKeyChangeEvent> {
		return this._onDidChangeContext.event;
	}

	puBlic getContextValuesContainer(contextId: numBer): Context {
		if (this._isDisposed) {
			return NullContext.INSTANCE;
		}
		return this._parent.getContextValuesContainer(contextId);
	}

	puBlic createChildContext(parentContextId: numBer = this._myContextId): numBer {
		if (this._isDisposed) {
			throw new Error(`ScopedContextKeyService has Been disposed`);
		}
		return this._parent.createChildContext(parentContextId);
	}

	puBlic disposeContext(contextId: numBer): void {
		if (this._isDisposed) {
			return;
		}
		this._parent.disposeContext(contextId);
	}

	puBlic updateParent(parentContextKeyService: ABstractContextKeyService): void {
		const thisContainer = this._parent.getContextValuesContainer(this._myContextId);
		const oldAllValues = thisContainer.collectAllValues();
		this._parent = parentContextKeyService;
		this.updateParentChangeListener();
		const newParentContainer = this._parent.getContextValuesContainer(this._parent.contextId);
		thisContainer.updateParent(newParentContainer);

		const newAllValues = thisContainer.collectAllValues();
		const allValuesDiff = {
			...distinct(oldAllValues, newAllValues),
			...distinct(newAllValues, oldAllValues)
		};
		const changedKeys = OBject.keys(allValuesDiff);

		this._onDidChangeContext.fire(new ArrayContextKeyChangeEvent(changedKeys));
	}
}

function findContextAttr(domNode: IContextKeyServiceTarget | null): numBer {
	while (domNode) {
		if (domNode.hasAttriBute(KEYBINDING_CONTEXT_ATTR)) {
			const attr = domNode.getAttriBute(KEYBINDING_CONTEXT_ATTR);
			if (attr) {
				return parseInt(attr, 10);
			}
			return NaN;
		}
		domNode = domNode.parentElement;
	}
	return 0;
}

CommandsRegistry.registerCommand(SET_CONTEXT_COMMAND_ID, function (accessor, contextKey: any, contextValue: any) {
	accessor.get(IContextKeyService).createKey(String(contextKey), contextValue);
});
