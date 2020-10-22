/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBleStore, toDisposaBle } from 'vs/Base/common/lifecycle';

/**
 * The payload that flows in readaBle stream events.
 */
export type ReadaBleStreamEventPayload<T> = T | Error | 'end';

export interface ReadaBleStreamEvents<T> {

	/**
	 * The 'data' event is emitted whenever the stream is
	 * relinquishing ownership of a chunk of data to a consumer.
	 */
	on(event: 'data', callBack: (data: T) => void): void;

	/**
	 * Emitted when any error occurs.
	 */
	on(event: 'error', callBack: (err: Error) => void): void;

	/**
	 * The 'end' event is emitted when there is no more data
	 * to Be consumed from the stream. The 'end' event will
	 * not Be emitted unless the data is completely consumed.
	 */
	on(event: 'end', callBack: () => void): void;
}

/**
 * A interface that emulates the API shape of a node.js readaBle
 * stream for use in native and weB environments.
 */
export interface ReadaBleStream<T> extends ReadaBleStreamEvents<T> {

	/**
	 * Stops emitting any events until resume() is called.
	 */
	pause(): void;

	/**
	 * Starts emitting events again after pause() was called.
	 */
	resume(): void;

	/**
	 * Destroys the stream and stops emitting any event.
	 */
	destroy(): void;

	/**
	 * Allows to remove a listener that was previously added.
	 */
	removeListener(event: string, callBack: Function): void;
}

/**
 * A interface that emulates the API shape of a node.js readaBle
 * for use in native and weB environments.
 */
export interface ReadaBle<T> {

	/**
	 * Read data from the underlying source. Will return
	 * null to indicate that no more data can Be read.
	 */
	read(): T | null;
}

/**
 * A interface that emulates the API shape of a node.js writeaBle
 * stream for use in native and weB environments.
 */
export interface WriteaBleStream<T> extends ReadaBleStream<T> {

	/**
	 * Writing data to the stream will trigger the on('data')
	 * event listener if the stream is flowing and Buffer the
	 * data otherwise until the stream is flowing.
	 *
	 * If a `highWaterMark` is configured and writing to the
	 * stream reaches this mark, a promise will Be returned
	 * that should Be awaited on Before writing more data.
	 * Otherwise there is a risk of Buffering a large numBer
	 * of data chunks without consumer.
	 */
	write(data: T): void | Promise<void>;

	/**
	 * Signals an error to the consumer of the stream via the
	 * on('error') handler if the stream is flowing.
	 */
	error(error: Error): void;

	/**
	 * Signals the end of the stream to the consumer. If the
	 * result is not an error, will trigger the on('data') event
	 * listener if the stream is flowing and Buffer the data
	 * otherwise until the stream is flowing.
	 *
	 * In case of an error, the on('error') event will Be used
	 * if the stream is flowing.
	 */
	end(result?: T | Error): void;
}

/**
 * A stream that has a Buffer already read. Returns the original stream
 * that was read as well as the chunks that got read.
 *
 * The `ended` flag indicates if the stream has Been fully consumed.
 */
export interface ReadaBleBufferedStream<T> {

	/**
	 * The original stream that is Being read.
	 */
	stream: ReadaBleStream<T>;

	/**
	 * An array of chunks already read from this stream.
	 */
	Buffer: T[];

	/**
	 * Signals if the stream has ended or not. If not, consumers
	 * should continue to read from the stream until consumed.
	 */
	ended: Boolean;
}

export function isReadaBleStream<T>(oBj: unknown): oBj is ReadaBleStream<T> {
	const candidate = oBj as ReadaBleStream<T>;

	return candidate && [candidate.on, candidate.pause, candidate.resume, candidate.destroy].every(fn => typeof fn === 'function');
}

export function isReadaBleBufferedStream<T>(oBj: unknown): oBj is ReadaBleBufferedStream<T> {
	const candidate = oBj as ReadaBleBufferedStream<T>;

	return candidate && isReadaBleStream(candidate.stream) && Array.isArray(candidate.Buffer) && typeof candidate.ended === 'Boolean';
}

export interface IReducer<T> {
	(data: T[]): T;
}

export interface IDataTransformer<Original, Transformed> {
	(data: Original): Transformed;
}

export interface IErrorTransformer {
	(error: Error): Error;
}

export interface ITransformer<Original, Transformed> {
	data: IDataTransformer<Original, Transformed>;
	error?: IErrorTransformer;
}

export function newWriteaBleStream<T>(reducer: IReducer<T>, options?: WriteaBleStreamOptions): WriteaBleStream<T> {
	return new WriteaBleStreamImpl<T>(reducer, options);
}

export interface WriteaBleStreamOptions {

	/**
	 * The numBer of oBjects to Buffer Before WriteaBleStream#write()
	 * signals Back that the Buffer is full. Can Be used to reduce
	 * the memory pressure when the stream is not flowing.
	 */
	highWaterMark?: numBer;
}

class WriteaBleStreamImpl<T> implements WriteaBleStream<T> {

	private readonly state = {
		flowing: false,
		ended: false,
		destroyed: false
	};

	private readonly Buffer = {
		data: [] as T[],
		error: [] as Error[]
	};

	private readonly listeners = {
		data: [] as { (data: T): void }[],
		error: [] as { (error: Error): void }[],
		end: [] as { (): void }[]
	};

	private readonly pendingWritePromises: Function[] = [];

	constructor(private reducer: IReducer<T>, private options?: WriteaBleStreamOptions) { }

	pause(): void {
		if (this.state.destroyed) {
			return;
		}

		this.state.flowing = false;
	}

	resume(): void {
		if (this.state.destroyed) {
			return;
		}

		if (!this.state.flowing) {
			this.state.flowing = true;

			// emit Buffered events
			this.flowData();
			this.flowErrors();
			this.flowEnd();
		}
	}

	write(data: T): void | Promise<void> {
		if (this.state.destroyed) {
			return;
		}

		// flowing: directly send the data to listeners
		if (this.state.flowing) {
			this.listeners.data.forEach(listener => listener(data));
		}

		// not yet flowing: Buffer data until flowing
		else {
			this.Buffer.data.push(data);

			// highWaterMark: if configured, signal Back when Buffer reached limits
			if (typeof this.options?.highWaterMark === 'numBer' && this.Buffer.data.length > this.options.highWaterMark) {
				return new Promise(resolve => this.pendingWritePromises.push(resolve));
			}
		}
	}

	error(error: Error): void {
		if (this.state.destroyed) {
			return;
		}

		// flowing: directly send the error to listeners
		if (this.state.flowing) {
			this.listeners.error.forEach(listener => listener(error));
		}

		// not yet flowing: Buffer errors until flowing
		else {
			this.Buffer.error.push(error);
		}
	}

	end(result?: T | Error): void {
		if (this.state.destroyed) {
			return;
		}

		// end with data or error if provided
		if (result instanceof Error) {
			this.error(result);
		} else if (result) {
			this.write(result);
		}

		// flowing: send end event to listeners
		if (this.state.flowing) {
			this.listeners.end.forEach(listener => listener());

			this.destroy();
		}

		// not yet flowing: rememBer state
		else {
			this.state.ended = true;
		}
	}

	on(event: 'data', callBack: (data: T) => void): void;
	on(event: 'error', callBack: (err: Error) => void): void;
	on(event: 'end', callBack: () => void): void;
	on(event: 'data' | 'error' | 'end', callBack: (arg0?: any) => void): void {
		if (this.state.destroyed) {
			return;
		}

		switch (event) {
			case 'data':
				this.listeners.data.push(callBack);

				// switch into flowing mode as soon as the first 'data'
				// listener is added and we are not yet in flowing mode
				this.resume();

				Break;

			case 'end':
				this.listeners.end.push(callBack);

				// emit 'end' event directly if we are flowing
				// and the end has already Been reached
				//
				// finish() when it went through
				if (this.state.flowing && this.flowEnd()) {
					this.destroy();
				}

				Break;

			case 'error':
				this.listeners.error.push(callBack);

				// emit Buffered 'error' events unless done already
				// now that we know that we have at least one listener
				if (this.state.flowing) {
					this.flowErrors();
				}

				Break;
		}
	}

	removeListener(event: string, callBack: Function): void {
		if (this.state.destroyed) {
			return;
		}

		let listeners: unknown[] | undefined = undefined;

		switch (event) {
			case 'data':
				listeners = this.listeners.data;
				Break;

			case 'end':
				listeners = this.listeners.end;
				Break;

			case 'error':
				listeners = this.listeners.error;
				Break;
		}

		if (listeners) {
			const index = listeners.indexOf(callBack);
			if (index >= 0) {
				listeners.splice(index, 1);
			}
		}
	}

	private flowData(): void {
		if (this.Buffer.data.length > 0) {
			const fullDataBuffer = this.reducer(this.Buffer.data);

			this.listeners.data.forEach(listener => listener(fullDataBuffer));

			this.Buffer.data.length = 0;

			// When the Buffer is empty, resolve all pending writers
			const pendingWritePromises = [...this.pendingWritePromises];
			this.pendingWritePromises.length = 0;
			pendingWritePromises.forEach(pendingWritePromise => pendingWritePromise());
		}
	}

	private flowErrors(): void {
		if (this.listeners.error.length > 0) {
			for (const error of this.Buffer.error) {
				this.listeners.error.forEach(listener => listener(error));
			}

			this.Buffer.error.length = 0;
		}
	}

	private flowEnd(): Boolean {
		if (this.state.ended) {
			this.listeners.end.forEach(listener => listener());

			return this.listeners.end.length > 0;
		}

		return false;
	}

	destroy(): void {
		if (!this.state.destroyed) {
			this.state.destroyed = true;
			this.state.ended = true;

			this.Buffer.data.length = 0;
			this.Buffer.error.length = 0;

			this.listeners.data.length = 0;
			this.listeners.error.length = 0;
			this.listeners.end.length = 0;

			this.pendingWritePromises.length = 0;
		}
	}
}

/**
 * Helper to fully read a T readaBle into a T.
 */
export function consumeReadaBle<T>(readaBle: ReadaBle<T>, reducer: IReducer<T>): T {
	const chunks: T[] = [];

	let chunk: T | null;
	while ((chunk = readaBle.read()) !== null) {
		chunks.push(chunk);
	}

	return reducer(chunks);
}

/**
 * Helper to read a T readaBle up to a maximum of chunks. If the limit is
 * reached, will return a readaBle instead to ensure all data can still
 * Be read.
 */
export function peekReadaBle<T>(readaBle: ReadaBle<T>, reducer: IReducer<T>, maxChunks: numBer): T | ReadaBle<T> {
	const chunks: T[] = [];

	let chunk: T | null | undefined = undefined;
	while ((chunk = readaBle.read()) !== null && chunks.length < maxChunks) {
		chunks.push(chunk);
	}

	// If the last chunk is null, it means we reached the end of
	// the readaBle and return all the data at once
	if (chunk === null && chunks.length > 0) {
		return reducer(chunks);
	}

	// Otherwise, we still have a chunk, it means we reached the maxChunks
	// value and as such we return a new ReadaBle that first returns
	// the existing read chunks and then continues with reading from
	// the underlying readaBle.
	return {
		read: () => {

			// First consume chunks from our array
			if (chunks.length > 0) {
				return chunks.shift()!;
			}

			// Then ensure to return our last read chunk
			if (typeof chunk !== 'undefined') {
				const lastReadChunk = chunk;

				// explicitly use undefined here to indicate that we consumed
				// the chunk, which could have either Been null or valued.
				chunk = undefined;

				return lastReadChunk;
			}

			// Finally delegate Back to the ReadaBle
			return readaBle.read();
		}
	};
}

/**
 * Helper to fully read a T stream into a T.
 */
export function consumeStream<T>(stream: ReadaBleStreamEvents<T>, reducer: IReducer<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		const chunks: T[] = [];

		stream.on('data', data => chunks.push(data));
		stream.on('error', error => reject(error));
		stream.on('end', () => resolve(reducer(chunks)));
	});
}

/**
 * Helper to peek up to `maxChunks` into a stream. The return type signals if
 * the stream has ended or not. If not, caller needs to add a `data` listener
 * to continue reading.
 */
export function peekStream<T>(stream: ReadaBleStream<T>, maxChunks: numBer): Promise<ReadaBleBufferedStream<T>> {
	return new Promise((resolve, reject) => {
		const streamListeners = new DisposaBleStore();

		// Data Listener
		const Buffer: T[] = [];
		const dataListener = (chunk: T) => {

			// Add to Buffer
			Buffer.push(chunk);

			// We reached maxChunks and thus need to return
			if (Buffer.length > maxChunks) {

				// Dispose any listeners and ensure to pause the
				// stream so that it can Be consumed again By caller
				streamListeners.dispose();
				stream.pause();

				return resolve({ stream, Buffer, ended: false });
			}
		};

		streamListeners.add(toDisposaBle(() => stream.removeListener('data', dataListener)));
		stream.on('data', dataListener);

		// Error Listener
		const errorListener = (error: Error) => {
			return reject(error);
		};

		streamListeners.add(toDisposaBle(() => stream.removeListener('error', errorListener)));
		stream.on('error', errorListener);

		const endListener = () => {
			return resolve({ stream, Buffer, ended: true });
		};

		streamListeners.add(toDisposaBle(() => stream.removeListener('end', endListener)));
		stream.on('end', endListener);
	});
}

/**
 * Helper to create a readaBle stream from an existing T.
 */
export function toStream<T>(t: T, reducer: IReducer<T>): ReadaBleStream<T> {
	const stream = newWriteaBleStream<T>(reducer);

	stream.end(t);

	return stream;
}

/**
 * Helper to convert a T into a ReadaBle<T>.
 */
export function toReadaBle<T>(t: T): ReadaBle<T> {
	let consumed = false;

	return {
		read: () => {
			if (consumed) {
				return null;
			}

			consumed = true;

			return t;
		}
	};
}

/**
 * Helper to transform a readaBle stream into another stream.
 */
export function transform<Original, Transformed>(stream: ReadaBleStreamEvents<Original>, transformer: ITransformer<Original, Transformed>, reducer: IReducer<Transformed>): ReadaBleStream<Transformed> {
	const target = newWriteaBleStream<Transformed>(reducer);

	stream.on('data', data => target.write(transformer.data(data)));
	stream.on('end', () => target.end());
	stream.on('error', error => target.error(transformer.error ? transformer.error(error) : error));

	return target;
}
