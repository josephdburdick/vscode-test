/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAbleStore, toDisposAble } from 'vs/bAse/common/lifecycle';

/**
 * The pAyloAd thAt flows in reAdAble streAm events.
 */
export type ReAdAbleStreAmEventPAyloAd<T> = T | Error | 'end';

export interfAce ReAdAbleStreAmEvents<T> {

	/**
	 * The 'dAtA' event is emitted whenever the streAm is
	 * relinquishing ownership of A chunk of dAtA to A consumer.
	 */
	on(event: 'dAtA', cAllbAck: (dAtA: T) => void): void;

	/**
	 * Emitted when Any error occurs.
	 */
	on(event: 'error', cAllbAck: (err: Error) => void): void;

	/**
	 * The 'end' event is emitted when there is no more dAtA
	 * to be consumed from the streAm. The 'end' event will
	 * not be emitted unless the dAtA is completely consumed.
	 */
	on(event: 'end', cAllbAck: () => void): void;
}

/**
 * A interfAce thAt emulAtes the API shApe of A node.js reAdAble
 * streAm for use in nAtive And web environments.
 */
export interfAce ReAdAbleStreAm<T> extends ReAdAbleStreAmEvents<T> {

	/**
	 * Stops emitting Any events until resume() is cAlled.
	 */
	pAuse(): void;

	/**
	 * StArts emitting events AgAin After pAuse() wAs cAlled.
	 */
	resume(): void;

	/**
	 * Destroys the streAm And stops emitting Any event.
	 */
	destroy(): void;

	/**
	 * Allows to remove A listener thAt wAs previously Added.
	 */
	removeListener(event: string, cAllbAck: Function): void;
}

/**
 * A interfAce thAt emulAtes the API shApe of A node.js reAdAble
 * for use in nAtive And web environments.
 */
export interfAce ReAdAble<T> {

	/**
	 * ReAd dAtA from the underlying source. Will return
	 * null to indicAte thAt no more dAtA cAn be reAd.
	 */
	reAd(): T | null;
}

/**
 * A interfAce thAt emulAtes the API shApe of A node.js writeAble
 * streAm for use in nAtive And web environments.
 */
export interfAce WriteAbleStreAm<T> extends ReAdAbleStreAm<T> {

	/**
	 * Writing dAtA to the streAm will trigger the on('dAtA')
	 * event listener if the streAm is flowing And buffer the
	 * dAtA otherwise until the streAm is flowing.
	 *
	 * If A `highWAterMArk` is configured And writing to the
	 * streAm reAches this mArk, A promise will be returned
	 * thAt should be AwAited on before writing more dAtA.
	 * Otherwise there is A risk of buffering A lArge number
	 * of dAtA chunks without consumer.
	 */
	write(dAtA: T): void | Promise<void>;

	/**
	 * SignAls An error to the consumer of the streAm viA the
	 * on('error') hAndler if the streAm is flowing.
	 */
	error(error: Error): void;

	/**
	 * SignAls the end of the streAm to the consumer. If the
	 * result is not An error, will trigger the on('dAtA') event
	 * listener if the streAm is flowing And buffer the dAtA
	 * otherwise until the streAm is flowing.
	 *
	 * In cAse of An error, the on('error') event will be used
	 * if the streAm is flowing.
	 */
	end(result?: T | Error): void;
}

/**
 * A streAm thAt hAs A buffer AlreAdy reAd. Returns the originAl streAm
 * thAt wAs reAd As well As the chunks thAt got reAd.
 *
 * The `ended` flAg indicAtes if the streAm hAs been fully consumed.
 */
export interfAce ReAdAbleBufferedStreAm<T> {

	/**
	 * The originAl streAm thAt is being reAd.
	 */
	streAm: ReAdAbleStreAm<T>;

	/**
	 * An ArrAy of chunks AlreAdy reAd from this streAm.
	 */
	buffer: T[];

	/**
	 * SignAls if the streAm hAs ended or not. If not, consumers
	 * should continue to reAd from the streAm until consumed.
	 */
	ended: booleAn;
}

export function isReAdAbleStreAm<T>(obj: unknown): obj is ReAdAbleStreAm<T> {
	const cAndidAte = obj As ReAdAbleStreAm<T>;

	return cAndidAte && [cAndidAte.on, cAndidAte.pAuse, cAndidAte.resume, cAndidAte.destroy].every(fn => typeof fn === 'function');
}

export function isReAdAbleBufferedStreAm<T>(obj: unknown): obj is ReAdAbleBufferedStreAm<T> {
	const cAndidAte = obj As ReAdAbleBufferedStreAm<T>;

	return cAndidAte && isReAdAbleStreAm(cAndidAte.streAm) && ArrAy.isArrAy(cAndidAte.buffer) && typeof cAndidAte.ended === 'booleAn';
}

export interfAce IReducer<T> {
	(dAtA: T[]): T;
}

export interfAce IDAtATrAnsformer<OriginAl, TrAnsformed> {
	(dAtA: OriginAl): TrAnsformed;
}

export interfAce IErrorTrAnsformer {
	(error: Error): Error;
}

export interfAce ITrAnsformer<OriginAl, TrAnsformed> {
	dAtA: IDAtATrAnsformer<OriginAl, TrAnsformed>;
	error?: IErrorTrAnsformer;
}

export function newWriteAbleStreAm<T>(reducer: IReducer<T>, options?: WriteAbleStreAmOptions): WriteAbleStreAm<T> {
	return new WriteAbleStreAmImpl<T>(reducer, options);
}

export interfAce WriteAbleStreAmOptions {

	/**
	 * The number of objects to buffer before WriteAbleStreAm#write()
	 * signAls bAck thAt the buffer is full. CAn be used to reduce
	 * the memory pressure when the streAm is not flowing.
	 */
	highWAterMArk?: number;
}

clAss WriteAbleStreAmImpl<T> implements WriteAbleStreAm<T> {

	privAte reAdonly stAte = {
		flowing: fAlse,
		ended: fAlse,
		destroyed: fAlse
	};

	privAte reAdonly buffer = {
		dAtA: [] As T[],
		error: [] As Error[]
	};

	privAte reAdonly listeners = {
		dAtA: [] As { (dAtA: T): void }[],
		error: [] As { (error: Error): void }[],
		end: [] As { (): void }[]
	};

	privAte reAdonly pendingWritePromises: Function[] = [];

	constructor(privAte reducer: IReducer<T>, privAte options?: WriteAbleStreAmOptions) { }

	pAuse(): void {
		if (this.stAte.destroyed) {
			return;
		}

		this.stAte.flowing = fAlse;
	}

	resume(): void {
		if (this.stAte.destroyed) {
			return;
		}

		if (!this.stAte.flowing) {
			this.stAte.flowing = true;

			// emit buffered events
			this.flowDAtA();
			this.flowErrors();
			this.flowEnd();
		}
	}

	write(dAtA: T): void | Promise<void> {
		if (this.stAte.destroyed) {
			return;
		}

		// flowing: directly send the dAtA to listeners
		if (this.stAte.flowing) {
			this.listeners.dAtA.forEAch(listener => listener(dAtA));
		}

		// not yet flowing: buffer dAtA until flowing
		else {
			this.buffer.dAtA.push(dAtA);

			// highWAterMArk: if configured, signAl bAck when buffer reAched limits
			if (typeof this.options?.highWAterMArk === 'number' && this.buffer.dAtA.length > this.options.highWAterMArk) {
				return new Promise(resolve => this.pendingWritePromises.push(resolve));
			}
		}
	}

	error(error: Error): void {
		if (this.stAte.destroyed) {
			return;
		}

		// flowing: directly send the error to listeners
		if (this.stAte.flowing) {
			this.listeners.error.forEAch(listener => listener(error));
		}

		// not yet flowing: buffer errors until flowing
		else {
			this.buffer.error.push(error);
		}
	}

	end(result?: T | Error): void {
		if (this.stAte.destroyed) {
			return;
		}

		// end with dAtA or error if provided
		if (result instAnceof Error) {
			this.error(result);
		} else if (result) {
			this.write(result);
		}

		// flowing: send end event to listeners
		if (this.stAte.flowing) {
			this.listeners.end.forEAch(listener => listener());

			this.destroy();
		}

		// not yet flowing: remember stAte
		else {
			this.stAte.ended = true;
		}
	}

	on(event: 'dAtA', cAllbAck: (dAtA: T) => void): void;
	on(event: 'error', cAllbAck: (err: Error) => void): void;
	on(event: 'end', cAllbAck: () => void): void;
	on(event: 'dAtA' | 'error' | 'end', cAllbAck: (Arg0?: Any) => void): void {
		if (this.stAte.destroyed) {
			return;
		}

		switch (event) {
			cAse 'dAtA':
				this.listeners.dAtA.push(cAllbAck);

				// switch into flowing mode As soon As the first 'dAtA'
				// listener is Added And we Are not yet in flowing mode
				this.resume();

				breAk;

			cAse 'end':
				this.listeners.end.push(cAllbAck);

				// emit 'end' event directly if we Are flowing
				// And the end hAs AlreAdy been reAched
				//
				// finish() when it went through
				if (this.stAte.flowing && this.flowEnd()) {
					this.destroy();
				}

				breAk;

			cAse 'error':
				this.listeners.error.push(cAllbAck);

				// emit buffered 'error' events unless done AlreAdy
				// now thAt we know thAt we hAve At leAst one listener
				if (this.stAte.flowing) {
					this.flowErrors();
				}

				breAk;
		}
	}

	removeListener(event: string, cAllbAck: Function): void {
		if (this.stAte.destroyed) {
			return;
		}

		let listeners: unknown[] | undefined = undefined;

		switch (event) {
			cAse 'dAtA':
				listeners = this.listeners.dAtA;
				breAk;

			cAse 'end':
				listeners = this.listeners.end;
				breAk;

			cAse 'error':
				listeners = this.listeners.error;
				breAk;
		}

		if (listeners) {
			const index = listeners.indexOf(cAllbAck);
			if (index >= 0) {
				listeners.splice(index, 1);
			}
		}
	}

	privAte flowDAtA(): void {
		if (this.buffer.dAtA.length > 0) {
			const fullDAtABuffer = this.reducer(this.buffer.dAtA);

			this.listeners.dAtA.forEAch(listener => listener(fullDAtABuffer));

			this.buffer.dAtA.length = 0;

			// When the buffer is empty, resolve All pending writers
			const pendingWritePromises = [...this.pendingWritePromises];
			this.pendingWritePromises.length = 0;
			pendingWritePromises.forEAch(pendingWritePromise => pendingWritePromise());
		}
	}

	privAte flowErrors(): void {
		if (this.listeners.error.length > 0) {
			for (const error of this.buffer.error) {
				this.listeners.error.forEAch(listener => listener(error));
			}

			this.buffer.error.length = 0;
		}
	}

	privAte flowEnd(): booleAn {
		if (this.stAte.ended) {
			this.listeners.end.forEAch(listener => listener());

			return this.listeners.end.length > 0;
		}

		return fAlse;
	}

	destroy(): void {
		if (!this.stAte.destroyed) {
			this.stAte.destroyed = true;
			this.stAte.ended = true;

			this.buffer.dAtA.length = 0;
			this.buffer.error.length = 0;

			this.listeners.dAtA.length = 0;
			this.listeners.error.length = 0;
			this.listeners.end.length = 0;

			this.pendingWritePromises.length = 0;
		}
	}
}

/**
 * Helper to fully reAd A T reAdAble into A T.
 */
export function consumeReAdAble<T>(reAdAble: ReAdAble<T>, reducer: IReducer<T>): T {
	const chunks: T[] = [];

	let chunk: T | null;
	while ((chunk = reAdAble.reAd()) !== null) {
		chunks.push(chunk);
	}

	return reducer(chunks);
}

/**
 * Helper to reAd A T reAdAble up to A mAximum of chunks. If the limit is
 * reAched, will return A reAdAble insteAd to ensure All dAtA cAn still
 * be reAd.
 */
export function peekReAdAble<T>(reAdAble: ReAdAble<T>, reducer: IReducer<T>, mAxChunks: number): T | ReAdAble<T> {
	const chunks: T[] = [];

	let chunk: T | null | undefined = undefined;
	while ((chunk = reAdAble.reAd()) !== null && chunks.length < mAxChunks) {
		chunks.push(chunk);
	}

	// If the lAst chunk is null, it meAns we reAched the end of
	// the reAdAble And return All the dAtA At once
	if (chunk === null && chunks.length > 0) {
		return reducer(chunks);
	}

	// Otherwise, we still hAve A chunk, it meAns we reAched the mAxChunks
	// vAlue And As such we return A new ReAdAble thAt first returns
	// the existing reAd chunks And then continues with reAding from
	// the underlying reAdAble.
	return {
		reAd: () => {

			// First consume chunks from our ArrAy
			if (chunks.length > 0) {
				return chunks.shift()!;
			}

			// Then ensure to return our lAst reAd chunk
			if (typeof chunk !== 'undefined') {
				const lAstReAdChunk = chunk;

				// explicitly use undefined here to indicAte thAt we consumed
				// the chunk, which could hAve either been null or vAlued.
				chunk = undefined;

				return lAstReAdChunk;
			}

			// FinAlly delegAte bAck to the ReAdAble
			return reAdAble.reAd();
		}
	};
}

/**
 * Helper to fully reAd A T streAm into A T.
 */
export function consumeStreAm<T>(streAm: ReAdAbleStreAmEvents<T>, reducer: IReducer<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		const chunks: T[] = [];

		streAm.on('dAtA', dAtA => chunks.push(dAtA));
		streAm.on('error', error => reject(error));
		streAm.on('end', () => resolve(reducer(chunks)));
	});
}

/**
 * Helper to peek up to `mAxChunks` into A streAm. The return type signAls if
 * the streAm hAs ended or not. If not, cAller needs to Add A `dAtA` listener
 * to continue reAding.
 */
export function peekStreAm<T>(streAm: ReAdAbleStreAm<T>, mAxChunks: number): Promise<ReAdAbleBufferedStreAm<T>> {
	return new Promise((resolve, reject) => {
		const streAmListeners = new DisposAbleStore();

		// DAtA Listener
		const buffer: T[] = [];
		const dAtAListener = (chunk: T) => {

			// Add to buffer
			buffer.push(chunk);

			// We reAched mAxChunks And thus need to return
			if (buffer.length > mAxChunks) {

				// Dispose Any listeners And ensure to pAuse the
				// streAm so thAt it cAn be consumed AgAin by cAller
				streAmListeners.dispose();
				streAm.pAuse();

				return resolve({ streAm, buffer, ended: fAlse });
			}
		};

		streAmListeners.Add(toDisposAble(() => streAm.removeListener('dAtA', dAtAListener)));
		streAm.on('dAtA', dAtAListener);

		// Error Listener
		const errorListener = (error: Error) => {
			return reject(error);
		};

		streAmListeners.Add(toDisposAble(() => streAm.removeListener('error', errorListener)));
		streAm.on('error', errorListener);

		const endListener = () => {
			return resolve({ streAm, buffer, ended: true });
		};

		streAmListeners.Add(toDisposAble(() => streAm.removeListener('end', endListener)));
		streAm.on('end', endListener);
	});
}

/**
 * Helper to creAte A reAdAble streAm from An existing T.
 */
export function toStreAm<T>(t: T, reducer: IReducer<T>): ReAdAbleStreAm<T> {
	const streAm = newWriteAbleStreAm<T>(reducer);

	streAm.end(t);

	return streAm;
}

/**
 * Helper to convert A T into A ReAdAble<T>.
 */
export function toReAdAble<T>(t: T): ReAdAble<T> {
	let consumed = fAlse;

	return {
		reAd: () => {
			if (consumed) {
				return null;
			}

			consumed = true;

			return t;
		}
	};
}

/**
 * Helper to trAnsform A reAdAble streAm into Another streAm.
 */
export function trAnsform<OriginAl, TrAnsformed>(streAm: ReAdAbleStreAmEvents<OriginAl>, trAnsformer: ITrAnsformer<OriginAl, TrAnsformed>, reducer: IReducer<TrAnsformed>): ReAdAbleStreAm<TrAnsformed> {
	const tArget = newWriteAbleStreAm<TrAnsformed>(reducer);

	streAm.on('dAtA', dAtA => tArget.write(trAnsformer.dAtA(dAtA)));
	streAm.on('end', () => tArget.end());
	streAm.on('error', error => tArget.error(trAnsformer.error ? trAnsformer.error(error) : error));

	return tArget;
}
