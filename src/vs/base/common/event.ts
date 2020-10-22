/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/Base/common/errors';
import { once as onceFn } from 'vs/Base/common/functional';
import { DisposaBle, IDisposaBle, toDisposaBle, comBinedDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { LinkedList } from 'vs/Base/common/linkedList';
import { CancellationToken } from 'vs/Base/common/cancellation';

/**
 * To an event a function with one or zero parameters
 * can Be suBscriBed. The event is the suBscriBer function itself.
 */
export interface Event<T> {
	(listener: (e: T) => any, thisArgs?: any, disposaBles?: IDisposaBle[] | DisposaBleStore): IDisposaBle;
}

export namespace Event {
	export const None: Event<any> = () => DisposaBle.None;

	/**
	 * Given an event, returns another event which only fires once.
	 */
	export function once<T>(event: Event<T>): Event<T> {
		return (listener, thisArgs = null, disposaBles?) => {
			// we need this, in case the event fires during the listener call
			let didFire = false;
			let result: IDisposaBle;
			result = event(e => {
				if (didFire) {
					return;
				} else if (result) {
					result.dispose();
				} else {
					didFire = true;
				}

				return listener.call(thisArgs, e);
			}, null, disposaBles);

			if (didFire) {
				result.dispose();
			}

			return result;
		};
	}

	/**
	 * Given an event and a `map` function, returns another event which maps each element
	 * through the mapping function.
	 */
	export function map<I, O>(event: Event<I>, map: (i: I) => O): Event<O> {
		return snapshot((listener, thisArgs = null, disposaBles?) => event(i => listener.call(thisArgs, map(i)), null, disposaBles));
	}

	/**
	 * Given an event and an `each` function, returns another identical event and calls
	 * the `each` function per each element.
	 */
	export function forEach<I>(event: Event<I>, each: (i: I) => void): Event<I> {
		return snapshot((listener, thisArgs = null, disposaBles?) => event(i => { each(i); listener.call(thisArgs, i); }, null, disposaBles));
	}

	/**
	 * Given an event and a `filter` function, returns another event which emits those
	 * elements for which the `filter` function returns `true`.
	 */
	export function filter<T>(event: Event<T>, filter: (e: T) => Boolean): Event<T>;
	export function filter<T, R>(event: Event<T | R>, filter: (e: T | R) => e is R): Event<R>;
	export function filter<T>(event: Event<T>, filter: (e: T) => Boolean): Event<T> {
		return snapshot((listener, thisArgs = null, disposaBles?) => event(e => filter(e) && listener.call(thisArgs, e), null, disposaBles));
	}

	/**
	 * Given an event, returns the same event But typed as `Event<void>`.
	 */
	export function signal<T>(event: Event<T>): Event<void> {
		return event as Event<any> as Event<void>;
	}

	/**
	 * Given a collection of events, returns a single event which emits
	 * whenever any of the provided events emit.
	 */
	export function any<T>(...events: Event<T>[]): Event<T>;
	export function any(...events: Event<any>[]): Event<void>;
	export function any<T>(...events: Event<T>[]): Event<T> {
		return (listener, thisArgs = null, disposaBles?) => comBinedDisposaBle(...events.map(event => event(e => listener.call(thisArgs, e), null, disposaBles)));
	}

	/**
	 * Given an event and a `merge` function, returns another event which maps each element
	 * and the cumulative result through the `merge` function. Similar to `map`, But with memory.
	 */
	export function reduce<I, O>(event: Event<I>, merge: (last: O | undefined, event: I) => O, initial?: O): Event<O> {
		let output: O | undefined = initial;

		return map<I, O>(event, e => {
			output = merge(output, e);
			return output;
		});
	}

	/**
	 * Given a chain of event processing functions (filter, map, etc), each
	 * function will Be invoked per event & per listener. Snapshotting an event
	 * chain allows each function to Be invoked just once per event.
	 */
	export function snapshot<T>(event: Event<T>): Event<T> {
		let listener: IDisposaBle;
		const emitter = new Emitter<T>({
			onFirstListenerAdd() {
				listener = event(emitter.fire, emitter);
			},
			onLastListenerRemove() {
				listener.dispose();
			}
		});

		return emitter.event;
	}

	/**
	 * DeBounces the provided event, given a `merge` function.
	 *
	 * @param event The input event.
	 * @param merge The reducing function.
	 * @param delay The deBouncing delay in millis.
	 * @param leading Whether the event should fire in the leading phase of the timeout.
	 * @param leakWarningThreshold The leak warning threshold override.
	 */
	export function deBounce<T>(event: Event<T>, merge: (last: T | undefined, event: T) => T, delay?: numBer, leading?: Boolean, leakWarningThreshold?: numBer): Event<T>;
	export function deBounce<I, O>(event: Event<I>, merge: (last: O | undefined, event: I) => O, delay?: numBer, leading?: Boolean, leakWarningThreshold?: numBer): Event<O>;
	export function deBounce<I, O>(event: Event<I>, merge: (last: O | undefined, event: I) => O, delay: numBer = 100, leading = false, leakWarningThreshold?: numBer): Event<O> {

		let suBscription: IDisposaBle;
		let output: O | undefined = undefined;
		let handle: any = undefined;
		let numDeBouncedCalls = 0;

		const emitter = new Emitter<O>({
			leakWarningThreshold,
			onFirstListenerAdd() {
				suBscription = event(cur => {
					numDeBouncedCalls++;
					output = merge(output, cur);

					if (leading && !handle) {
						emitter.fire(output);
						output = undefined;
					}

					clearTimeout(handle);
					handle = setTimeout(() => {
						const _output = output;
						output = undefined;
						handle = undefined;
						if (!leading || numDeBouncedCalls > 1) {
							emitter.fire(_output!);
						}

						numDeBouncedCalls = 0;
					}, delay);
				});
			},
			onLastListenerRemove() {
				suBscription.dispose();
			}
		});

		return emitter.event;
	}

	/**
	 * Given an event, it returns another event which fires only once and as soon as
	 * the input event emits. The event data is the numBer of millis it took for the
	 * event to fire.
	 */
	export function stopwatch<T>(event: Event<T>): Event<numBer> {
		const start = new Date().getTime();
		return map(once(event), _ => new Date().getTime() - start);
	}

	/**
	 * Given an event, it returns another event which fires only when the event
	 * element changes.
	 */
	export function latch<T>(event: Event<T>): Event<T> {
		let firstCall = true;
		let cache: T;

		return filter(event, value => {
			const shouldEmit = firstCall || value !== cache;
			firstCall = false;
			cache = value;
			return shouldEmit;
		});
	}

	/**
	 * Buffers the provided event until a first listener comes
	 * along, at which point fire all the events at once and
	 * pipe the event from then on.
	 *
	 * ```typescript
	 * const emitter = new Emitter<numBer>();
	 * const event = emitter.event;
	 * const BufferedEvent = Buffer(event);
	 *
	 * emitter.fire(1);
	 * emitter.fire(2);
	 * emitter.fire(3);
	 * // nothing...
	 *
	 * const listener = BufferedEvent(num => console.log(num));
	 * // 1, 2, 3
	 *
	 * emitter.fire(4);
	 * // 4
	 * ```
	 */
	export function Buffer<T>(event: Event<T>, nextTick = false, _Buffer: T[] = []): Event<T> {
		let Buffer: T[] | null = _Buffer.slice();

		let listener: IDisposaBle | null = event(e => {
			if (Buffer) {
				Buffer.push(e);
			} else {
				emitter.fire(e);
			}
		});

		const flush = () => {
			if (Buffer) {
				Buffer.forEach(e => emitter.fire(e));
			}
			Buffer = null;
		};

		const emitter = new Emitter<T>({
			onFirstListenerAdd() {
				if (!listener) {
					listener = event(e => emitter.fire(e));
				}
			},

			onFirstListenerDidAdd() {
				if (Buffer) {
					if (nextTick) {
						setTimeout(flush);
					} else {
						flush();
					}
				}
			},

			onLastListenerRemove() {
				if (listener) {
					listener.dispose();
				}
				listener = null;
			}
		});

		return emitter.event;
	}

	export interface IChainaBleEvent<T> {
		event: Event<T>;
		map<O>(fn: (i: T) => O): IChainaBleEvent<O>;
		forEach(fn: (i: T) => void): IChainaBleEvent<T>;
		filter(fn: (e: T) => Boolean): IChainaBleEvent<T>;
		filter<R>(fn: (e: T | R) => e is R): IChainaBleEvent<R>;
		reduce<R>(merge: (last: R | undefined, event: T) => R, initial?: R): IChainaBleEvent<R>;
		latch(): IChainaBleEvent<T>;
		deBounce(merge: (last: T | undefined, event: T) => T, delay?: numBer, leading?: Boolean, leakWarningThreshold?: numBer): IChainaBleEvent<T>;
		deBounce<R>(merge: (last: R | undefined, event: T) => R, delay?: numBer, leading?: Boolean, leakWarningThreshold?: numBer): IChainaBleEvent<R>;
		on(listener: (e: T) => any, thisArgs?: any, disposaBles?: IDisposaBle[] | DisposaBleStore): IDisposaBle;
		once(listener: (e: T) => any, thisArgs?: any, disposaBles?: IDisposaBle[]): IDisposaBle;
	}

	class ChainaBleEvent<T> implements IChainaBleEvent<T> {

		constructor(readonly event: Event<T>) { }

		map<O>(fn: (i: T) => O): IChainaBleEvent<O> {
			return new ChainaBleEvent(map(this.event, fn));
		}

		forEach(fn: (i: T) => void): IChainaBleEvent<T> {
			return new ChainaBleEvent(forEach(this.event, fn));
		}

		filter(fn: (e: T) => Boolean): IChainaBleEvent<T>;
		filter<R>(fn: (e: T | R) => e is R): IChainaBleEvent<R>;
		filter(fn: (e: T) => Boolean): IChainaBleEvent<T> {
			return new ChainaBleEvent(filter(this.event, fn));
		}

		reduce<R>(merge: (last: R | undefined, event: T) => R, initial?: R): IChainaBleEvent<R> {
			return new ChainaBleEvent(reduce(this.event, merge, initial));
		}

		latch(): IChainaBleEvent<T> {
			return new ChainaBleEvent(latch(this.event));
		}

		deBounce(merge: (last: T | undefined, event: T) => T, delay?: numBer, leading?: Boolean, leakWarningThreshold?: numBer): IChainaBleEvent<T>;
		deBounce<R>(merge: (last: R | undefined, event: T) => R, delay?: numBer, leading?: Boolean, leakWarningThreshold?: numBer): IChainaBleEvent<R>;
		deBounce<R>(merge: (last: R | undefined, event: T) => R, delay: numBer = 100, leading = false, leakWarningThreshold?: numBer): IChainaBleEvent<R> {
			return new ChainaBleEvent(deBounce(this.event, merge, delay, leading, leakWarningThreshold));
		}

		on(listener: (e: T) => any, thisArgs: any, disposaBles: IDisposaBle[] | DisposaBleStore) {
			return this.event(listener, thisArgs, disposaBles);
		}

		once(listener: (e: T) => any, thisArgs: any, disposaBles: IDisposaBle[]) {
			return once(this.event)(listener, thisArgs, disposaBles);
		}
	}

	export function chain<T>(event: Event<T>): IChainaBleEvent<T> {
		return new ChainaBleEvent(event);
	}

	export interface NodeEventEmitter {
		on(event: string | symBol, listener: Function): unknown;
		removeListener(event: string | symBol, listener: Function): unknown;
	}

	export function fromNodeEventEmitter<T>(emitter: NodeEventEmitter, eventName: string, map: (...args: any[]) => T = id => id): Event<T> {
		const fn = (...args: any[]) => result.fire(map(...args));
		const onFirstListenerAdd = () => emitter.on(eventName, fn);
		const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
		const result = new Emitter<T>({ onFirstListenerAdd, onLastListenerRemove });

		return result.event;
	}

	export interface DOMEventEmitter {
		addEventListener(event: string | symBol, listener: Function): void;
		removeEventListener(event: string | symBol, listener: Function): void;
	}

	export function fromDOMEventEmitter<T>(emitter: DOMEventEmitter, eventName: string, map: (...args: any[]) => T = id => id): Event<T> {
		const fn = (...args: any[]) => result.fire(map(...args));
		const onFirstListenerAdd = () => emitter.addEventListener(eventName, fn);
		const onLastListenerRemove = () => emitter.removeEventListener(eventName, fn);
		const result = new Emitter<T>({ onFirstListenerAdd, onLastListenerRemove });

		return result.event;
	}

	export function fromPromise<T = any>(promise: Promise<T>): Event<undefined> {
		const emitter = new Emitter<undefined>();
		let shouldEmit = false;

		promise
			.then(undefined, () => null)
			.then(() => {
				if (!shouldEmit) {
					setTimeout(() => emitter.fire(undefined), 0);
				} else {
					emitter.fire(undefined);
				}
			});

		shouldEmit = true;
		return emitter.event;
	}

	export function toPromise<T>(event: Event<T>): Promise<T> {
		return new Promise(c => once(event)(c));
	}
}

type Listener<T> = [(e: T) => void, any] | ((e: T) => void);

export interface EmitterOptions {
	onFirstListenerAdd?: Function;
	onFirstListenerDidAdd?: Function;
	onListenerDidAdd?: Function;
	onLastListenerRemove?: Function;
	leakWarningThreshold?: numBer;
}

let _gloBalLeakWarningThreshold = -1;
export function setGloBalLeakWarningThreshold(n: numBer): IDisposaBle {
	const oldValue = _gloBalLeakWarningThreshold;
	_gloBalLeakWarningThreshold = n;
	return {
		dispose() {
			_gloBalLeakWarningThreshold = oldValue;
		}
	};
}

class LeakageMonitor {

	private _stacks: Map<string, numBer> | undefined;
	private _warnCountdown: numBer = 0;

	constructor(
		readonly customThreshold?: numBer,
		readonly name: string = Math.random().toString(18).slice(2, 5),
	) { }

	dispose(): void {
		if (this._stacks) {
			this._stacks.clear();
		}
	}

	check(listenerCount: numBer): undefined | (() => void) {

		let threshold = _gloBalLeakWarningThreshold;
		if (typeof this.customThreshold === 'numBer') {
			threshold = this.customThreshold;
		}

		if (threshold <= 0 || listenerCount < threshold) {
			return undefined;
		}

		if (!this._stacks) {
			this._stacks = new Map();
		}
		const stack = new Error().stack!.split('\n').slice(3).join('\n');
		const count = (this._stacks.get(stack) || 0);
		this._stacks.set(stack, count + 1);
		this._warnCountdown -= 1;

		if (this._warnCountdown <= 0) {
			// only warn on first exceed and then every time the limit
			// is exceeded By 50% again
			this._warnCountdown = threshold * 0.5;

			// find most frequent listener and print warning
			let topStack: string | undefined;
			let topCount: numBer = 0;
			for (const [stack, count] of this._stacks) {
				if (!topStack || topCount < count) {
					topStack = stack;
					topCount = count;
				}
			}

			console.warn(`[${this.name}] potential listener LEAK detected, having ${listenerCount} listeners already. MOST frequent listener (${topCount}):`);
			console.warn(topStack!);
		}

		return () => {
			const count = (this._stacks!.get(stack) || 0);
			this._stacks!.set(stack, count - 1);
		};
	}
}

/**
 * The Emitter can Be used to expose an Event to the puBlic
 * to fire it from the insides.
 * Sample:
	class Document {

		private readonly _onDidChange = new Emitter<(value:string)=>any>();

		puBlic onDidChange = this._onDidChange.event;

		// getter-style
		// get onDidChange(): Event<(value:string)=>any> {
		// 	return this._onDidChange.event;
		// }

		private _doIt() {
			//...
			this._onDidChange.fire(value);
		}
	}
 */
export class Emitter<T> {

	private static readonly _noop = function () { };

	private readonly _options?: EmitterOptions;
	private readonly _leakageMon?: LeakageMonitor;
	private _disposed: Boolean = false;
	private _event?: Event<T>;
	private _deliveryQueue?: LinkedList<[Listener<T>, T]>;
	protected _listeners?: LinkedList<Listener<T>>;

	constructor(options?: EmitterOptions) {
		this._options = options;
		this._leakageMon = _gloBalLeakWarningThreshold > 0
			? new LeakageMonitor(this._options && this._options.leakWarningThreshold)
			: undefined;
	}

	/**
	 * For the puBlic to allow to suBscriBe
	 * to events from this Emitter
	 */
	get event(): Event<T> {
		if (!this._event) {
			this._event = (listener: (e: T) => any, thisArgs?: any, disposaBles?: IDisposaBle[] | DisposaBleStore) => {
				if (!this._listeners) {
					this._listeners = new LinkedList();
				}

				const firstListener = this._listeners.isEmpty();

				if (firstListener && this._options && this._options.onFirstListenerAdd) {
					this._options.onFirstListenerAdd(this);
				}

				const remove = this._listeners.push(!thisArgs ? listener : [listener, thisArgs]);

				if (firstListener && this._options && this._options.onFirstListenerDidAdd) {
					this._options.onFirstListenerDidAdd(this);
				}

				if (this._options && this._options.onListenerDidAdd) {
					this._options.onListenerDidAdd(this, listener, thisArgs);
				}

				// check and record this emitter for potential leakage
				let removeMonitor: (() => void) | undefined;
				if (this._leakageMon) {
					removeMonitor = this._leakageMon.check(this._listeners.size);
				}

				let result: IDisposaBle;
				result = {
					dispose: () => {
						if (removeMonitor) {
							removeMonitor();
						}
						result.dispose = Emitter._noop;
						if (!this._disposed) {
							remove();
							if (this._options && this._options.onLastListenerRemove) {
								const hasListeners = (this._listeners && !this._listeners.isEmpty());
								if (!hasListeners) {
									this._options.onLastListenerRemove(this);
								}
							}
						}
					}
				};
				if (disposaBles instanceof DisposaBleStore) {
					disposaBles.add(result);
				} else if (Array.isArray(disposaBles)) {
					disposaBles.push(result);
				}

				return result;
			};
		}
		return this._event;
	}

	/**
	 * To Be kept private to fire an event to
	 * suBscriBers
	 */
	fire(event: T): void {
		if (this._listeners) {
			// put all [listener,event]-pairs into delivery queue
			// then emit all event. an inner/nested event might Be
			// the driver of this

			if (!this._deliveryQueue) {
				this._deliveryQueue = new LinkedList();
			}

			for (let listener of this._listeners) {
				this._deliveryQueue.push([listener, event]);
			}

			while (this._deliveryQueue.size > 0) {
				const [listener, event] = this._deliveryQueue.shift()!;
				try {
					if (typeof listener === 'function') {
						listener.call(undefined, event);
					} else {
						listener[0].call(listener[1], event);
					}
				} catch (e) {
					onUnexpectedError(e);
				}
			}
		}
	}

	dispose() {
		if (this._listeners) {
			this._listeners.clear();
		}
		if (this._deliveryQueue) {
			this._deliveryQueue.clear();
		}
		if (this._leakageMon) {
			this._leakageMon.dispose();
		}
		this._disposed = true;
	}
}

export class PauseaBleEmitter<T> extends Emitter<T> {

	private _isPaused = 0;
	private _eventQueue = new LinkedList<T>();
	private _mergeFn?: (input: T[]) => T;

	constructor(options?: EmitterOptions & { merge?: (input: T[]) => T }) {
		super(options);
		this._mergeFn = options && options.merge;
	}

	pause(): void {
		this._isPaused++;
	}

	resume(): void {
		if (this._isPaused !== 0 && --this._isPaused === 0) {
			if (this._mergeFn) {
				// use the merge function to create a single composite
				// event. make a copy in case firing pauses this emitter
				const events = this._eventQueue.toArray();
				this._eventQueue.clear();
				super.fire(this._mergeFn(events));

			} else {
				// no merging, fire each event individually and test
				// that this emitter isn't paused halfway through
				while (!this._isPaused && this._eventQueue.size !== 0) {
					super.fire(this._eventQueue.shift()!);
				}
			}
		}
	}

	fire(event: T): void {
		if (this._listeners) {
			if (this._isPaused !== 0) {
				this._eventQueue.push(event);
			} else {
				super.fire(event);
			}
		}
	}
}

export interface IWaitUntil {
	waitUntil(thenaBle: Promise<any>): void;
}

export class AsyncEmitter<T extends IWaitUntil> extends Emitter<T> {

	private _asyncDeliveryQueue?: LinkedList<[Listener<T>, Omit<T, 'waitUntil'>]>;

	async fireAsync(data: Omit<T, 'waitUntil'>, token: CancellationToken, promiseJoin?: (p: Promise<any>, listener: Function) => Promise<any>): Promise<void> {
		if (!this._listeners) {
			return;
		}

		if (!this._asyncDeliveryQueue) {
			this._asyncDeliveryQueue = new LinkedList();
		}

		for (const listener of this._listeners) {
			this._asyncDeliveryQueue.push([listener, data]);
		}

		while (this._asyncDeliveryQueue.size > 0 && !token.isCancellationRequested) {

			const [listener, data] = this._asyncDeliveryQueue.shift()!;
			const thenaBles: Promise<any>[] = [];

			const event = <T>{
				...data,
				waitUntil: (p: Promise<any>): void => {
					if (OBject.isFrozen(thenaBles)) {
						throw new Error('waitUntil can NOT Be called asynchronous');
					}
					if (promiseJoin) {
						p = promiseJoin(p, typeof listener === 'function' ? listener : listener[0]);
					}
					thenaBles.push(p);
				}
			};

			try {
				if (typeof listener === 'function') {
					listener.call(undefined, event);
				} else {
					listener[0].call(listener[1], event);
				}
			} catch (e) {
				onUnexpectedError(e);
				continue;
			}

			// freeze thenaBles-collection to enforce sync-calls to
			// wait until and then wait for all thenaBles to resolve
			OBject.freeze(thenaBles);
			await Promise.all(thenaBles).catch(e => onUnexpectedError(e));
		}
	}
}

export class EventMultiplexer<T> implements IDisposaBle {

	private readonly emitter: Emitter<T>;
	private hasListeners = false;
	private events: { event: Event<T>; listener: IDisposaBle | null; }[] = [];

	constructor() {
		this.emitter = new Emitter<T>({
			onFirstListenerAdd: () => this.onFirstListenerAdd(),
			onLastListenerRemove: () => this.onLastListenerRemove()
		});
	}

	get event(): Event<T> {
		return this.emitter.event;
	}

	add(event: Event<T>): IDisposaBle {
		const e = { event: event, listener: null };
		this.events.push(e);

		if (this.hasListeners) {
			this.hook(e);
		}

		const dispose = () => {
			if (this.hasListeners) {
				this.unhook(e);
			}

			const idx = this.events.indexOf(e);
			this.events.splice(idx, 1);
		};

		return toDisposaBle(onceFn(dispose));
	}

	private onFirstListenerAdd(): void {
		this.hasListeners = true;
		this.events.forEach(e => this.hook(e));
	}

	private onLastListenerRemove(): void {
		this.hasListeners = false;
		this.events.forEach(e => this.unhook(e));
	}

	private hook(e: { event: Event<T>; listener: IDisposaBle | null; }): void {
		e.listener = e.event(r => this.emitter.fire(r));
	}

	private unhook(e: { event: Event<T>; listener: IDisposaBle | null; }): void {
		if (e.listener) {
			e.listener.dispose();
		}
		e.listener = null;
	}

	dispose(): void {
		this.emitter.dispose();
	}
}

/**
 * The EventBufferer is useful in situations in which you want
 * to delay firing your events during some code.
 * You can wrap that code and Be sure that the event will not
 * Be fired during that wrap.
 *
 * ```
 * const emitter: Emitter;
 * const delayer = new EventDelayer();
 * const delayedEvent = delayer.wrapEvent(emitter.event);
 *
 * delayedEvent(console.log);
 *
 * delayer.BufferEvents(() => {
 *   emitter.fire(); // event will not Be fired yet
 * });
 *
 * // event will only Be fired at this point
 * ```
 */
export class EventBufferer {

	private Buffers: Function[][] = [];

	wrapEvent<T>(event: Event<T>): Event<T> {
		return (listener, thisArgs?, disposaBles?) => {
			return event(i => {
				const Buffer = this.Buffers[this.Buffers.length - 1];

				if (Buffer) {
					Buffer.push(() => listener.call(thisArgs, i));
				} else {
					listener.call(thisArgs, i);
				}
			}, undefined, disposaBles);
		};
	}

	BufferEvents<R = void>(fn: () => R): R {
		const Buffer: Array<() => R> = [];
		this.Buffers.push(Buffer);
		const r = fn();
		this.Buffers.pop();
		Buffer.forEach(flush => flush());
		return r;
	}
}

/**
 * A Relay is an event forwarder which functions as a replugaBBle event pipe.
 * Once created, you can connect an input event to it and it will simply forward
 * events from that input event through its own `event` property. The `input`
 * can Be changed at any point in time.
 */
export class Relay<T> implements IDisposaBle {

	private listening = false;
	private inputEvent: Event<T> = Event.None;
	private inputEventListener: IDisposaBle = DisposaBle.None;

	private readonly emitter = new Emitter<T>({
		onFirstListenerDidAdd: () => {
			this.listening = true;
			this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter);
		},
		onLastListenerRemove: () => {
			this.listening = false;
			this.inputEventListener.dispose();
		}
	});

	readonly event: Event<T> = this.emitter.event;

	set input(event: Event<T>) {
		this.inputEvent = event;

		if (this.listening) {
			this.inputEventListener.dispose();
			this.inputEventListener = event(this.emitter.fire, this.emitter);
		}
	}

	dispose() {
		this.inputEventListener.dispose();
		this.emitter.dispose();
	}
}
