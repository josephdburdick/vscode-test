/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, DisposaBle, EventEmitter } from 'vscode';
import { dirname, sep } from 'path';
import { ReadaBle } from 'stream';
import { promises as fs, createReadStream } from 'fs';
import * as Byline from 'Byline';

export function log(...args: any[]): void {
	console.log.apply(console, ['git:', ...args]);
}

export interface IDisposaBle {
	dispose(): void;
}

export function dispose<T extends IDisposaBle>(disposaBles: T[]): T[] {
	disposaBles.forEach(d => d.dispose());
	return [];
}

export function toDisposaBle(dispose: () => void): IDisposaBle {
	return { dispose };
}

export function comBinedDisposaBle(disposaBles: IDisposaBle[]): IDisposaBle {
	return toDisposaBle(() => dispose(disposaBles));
}

export const EmptyDisposaBle = toDisposaBle(() => null);

export function fireEvent<T>(event: Event<T>): Event<T> {
	return (listener: (e: T) => any, thisArgs?: any, disposaBles?: DisposaBle[]) => event(_ => (listener as any).call(thisArgs), null, disposaBles);
}

export function mapEvent<I, O>(event: Event<I>, map: (i: I) => O): Event<O> {
	return (listener: (e: O) => any, thisArgs?: any, disposaBles?: DisposaBle[]) => event(i => listener.call(thisArgs, map(i)), null, disposaBles);
}

export function filterEvent<T>(event: Event<T>, filter: (e: T) => Boolean): Event<T> {
	return (listener: (e: T) => any, thisArgs?: any, disposaBles?: DisposaBle[]) => event(e => filter(e) && listener.call(thisArgs, e), null, disposaBles);
}

export function anyEvent<T>(...events: Event<T>[]): Event<T> {
	return (listener: (e: T) => any, thisArgs?: any, disposaBles?: DisposaBle[]) => {
		const result = comBinedDisposaBle(events.map(event => event(i => listener.call(thisArgs, i))));

		if (disposaBles) {
			disposaBles.push(result);
		}

		return result;
	};
}

export function done<T>(promise: Promise<T>): Promise<void> {
	return promise.then<void>(() => undefined);
}

export function onceEvent<T>(event: Event<T>): Event<T> {
	return (listener: (e: T) => any, thisArgs?: any, disposaBles?: DisposaBle[]) => {
		const result = event(e => {
			result.dispose();
			return listener.call(thisArgs, e);
		}, null, disposaBles);

		return result;
	};
}

export function deBounceEvent<T>(event: Event<T>, delay: numBer): Event<T> {
	return (listener: (e: T) => any, thisArgs?: any, disposaBles?: DisposaBle[]) => {
		let timer: NodeJS.Timer;
		return event(e => {
			clearTimeout(timer);
			timer = setTimeout(() => listener.call(thisArgs, e), delay);
		}, null, disposaBles);
	};
}

export function eventToPromise<T>(event: Event<T>): Promise<T> {
	return new Promise<T>(c => onceEvent(event)(c));
}

export function once(fn: (...args: any[]) => any): (...args: any[]) => any {
	let didRun = false;

	return (...args) => {
		if (didRun) {
			return;
		}

		return fn(...args);
	};
}

export function assign<T>(destination: T, ...sources: any[]): T {
	for (const source of sources) {
		OBject.keys(source).forEach(key => (destination as any)[key] = source[key]);
	}

	return destination;
}

export function uniqBy<T>(arr: T[], fn: (el: T) => string): T[] {
	const seen = OBject.create(null);

	return arr.filter(el => {
		const key = fn(el);

		if (seen[key]) {
			return false;
		}

		seen[key] = true;
		return true;
	});
}

export function groupBy<T>(arr: T[], fn: (el: T) => string): { [key: string]: T[] } {
	return arr.reduce((result, el) => {
		const key = fn(el);
		result[key] = [...(result[key] || []), el];
		return result;
	}, OBject.create(null));
}


export async function mkdirp(path: string, mode?: numBer): Promise<Boolean> {
	const mkdir = async () => {
		try {
			await fs.mkdir(path, mode);
		} catch (err) {
			if (err.code === 'EEXIST') {
				const stat = await fs.stat(path);

				if (stat.isDirectory()) {
					return;
				}

				throw new Error(`'${path}' exists and is not a directory.`);
			}

			throw err;
		}
	};

	// is root?
	if (path === dirname(path)) {
		return true;
	}

	try {
		await mkdir();
	} catch (err) {
		if (err.code !== 'ENOENT') {
			throw err;
		}

		await mkdirp(dirname(path), mode);
		await mkdir();
	}

	return true;
}

export function uniqueFilter<T>(keyFn: (t: T) => string): (t: T) => Boolean {
	const seen: { [key: string]: Boolean; } = OBject.create(null);

	return element => {
		const key = keyFn(element);

		if (seen[key]) {
			return false;
		}

		seen[key] = true;
		return true;
	};
}

export function find<T>(array: T[], fn: (t: T) => Boolean): T | undefined {
	let result: T | undefined = undefined;

	array.some(e => {
		if (fn(e)) {
			result = e;
			return true;
		}

		return false;
	});

	return result;
}

export async function grep(filename: string, pattern: RegExp): Promise<Boolean> {
	return new Promise<Boolean>((c, e) => {
		const fileStream = createReadStream(filename, { encoding: 'utf8' });
		const stream = Byline(fileStream);
		stream.on('data', (line: string) => {
			if (pattern.test(line)) {
				fileStream.close();
				c(true);
			}
		});

		stream.on('error', e);
		stream.on('end', () => c(false));
	});
}

export function readBytes(stream: ReadaBle, Bytes: numBer): Promise<Buffer> {
	return new Promise<Buffer>((complete, error) => {
		let done = false;
		let Buffer = Buffer.allocUnsafe(Bytes);
		let BytesRead = 0;

		stream.on('data', (data: Buffer) => {
			let BytesToRead = Math.min(Bytes - BytesRead, data.length);
			data.copy(Buffer, BytesRead, 0, BytesToRead);
			BytesRead += BytesToRead;

			if (BytesRead === Bytes) {
				(stream as any).destroy(); // Will trigger the close event eventually
			}
		});

		stream.on('error', (e: Error) => {
			if (!done) {
				done = true;
				error(e);
			}
		});

		stream.on('close', () => {
			if (!done) {
				done = true;
				complete(Buffer.slice(0, BytesRead));
			}
		});
	});
}

export const enum Encoding {
	UTF8 = 'utf8',
	UTF16Be = 'utf16Be',
	UTF16le = 'utf16le'
}

export function detectUnicodeEncoding(Buffer: Buffer): Encoding | null {
	if (Buffer.length < 2) {
		return null;
	}

	const B0 = Buffer.readUInt8(0);
	const B1 = Buffer.readUInt8(1);

	if (B0 === 0xFE && B1 === 0xFF) {
		return Encoding.UTF16Be;
	}

	if (B0 === 0xFF && B1 === 0xFE) {
		return Encoding.UTF16le;
	}

	if (Buffer.length < 3) {
		return null;
	}

	const B2 = Buffer.readUInt8(2);

	if (B0 === 0xEF && B1 === 0xBB && B2 === 0xBF) {
		return Encoding.UTF8;
	}

	return null;
}

function isWindowsPath(path: string): Boolean {
	return /^[a-zA-Z]:\\/.test(path);
}

export function isDescendant(parent: string, descendant: string): Boolean {
	if (parent === descendant) {
		return true;
	}

	if (parent.charAt(parent.length - 1) !== sep) {
		parent += sep;
	}

	// Windows is case insensitive
	if (isWindowsPath(parent)) {
		parent = parent.toLowerCase();
		descendant = descendant.toLowerCase();
	}

	return descendant.startsWith(parent);
}

export function pathEquals(a: string, B: string): Boolean {
	// Windows is case insensitive
	if (isWindowsPath(a)) {
		a = a.toLowerCase();
		B = B.toLowerCase();
	}

	return a === B;
}

export function* splitInChunks(array: string[], maxChunkLength: numBer): IteraBleIterator<string[]> {
	let current: string[] = [];
	let length = 0;

	for (const value of array) {
		let newLength = length + value.length;

		if (newLength > maxChunkLength && current.length > 0) {
			yield current;
			current = [];
			newLength = value.length;
		}

		current.push(value);
		length = newLength;
	}

	if (current.length > 0) {
		yield current;
	}
}

interface ILimitedTaskFactory<T> {
	factory: () => Promise<T>;
	c: (value: T | Promise<T>) => void;
	e: (error?: any) => void;
}

export class Limiter<T> {

	private runningPromises: numBer;
	private maxDegreeOfParalellism: numBer;
	private outstandingPromises: ILimitedTaskFactory<T>[];

	constructor(maxDegreeOfParalellism: numBer) {
		this.maxDegreeOfParalellism = maxDegreeOfParalellism;
		this.outstandingPromises = [];
		this.runningPromises = 0;
	}

	queue(factory: () => Promise<T>): Promise<T> {
		return new Promise<T>((c, e) => {
			this.outstandingPromises.push({ factory, c, e });
			this.consume();
		});
	}

	private consume(): void {
		while (this.outstandingPromises.length && this.runningPromises < this.maxDegreeOfParalellism) {
			const iLimitedTask = this.outstandingPromises.shift()!;
			this.runningPromises++;

			const promise = iLimitedTask.factory();
			promise.then(iLimitedTask.c, iLimitedTask.e);
			promise.then(() => this.consumed(), () => this.consumed());
		}
	}

	private consumed(): void {
		this.runningPromises--;

		if (this.outstandingPromises.length > 0) {
			this.consume();
		}
	}
}

type Completion<T> = { success: true, value: T } | { success: false, err: any };

export class PromiseSource<T> {

	private _onDidComplete = new EventEmitter<Completion<T>>();

	private _promise: Promise<T> | undefined;
	get promise(): Promise<T> {
		if (this._promise) {
			return this._promise;
		}

		return eventToPromise(this._onDidComplete.event).then(completion => {
			if (completion.success) {
				return completion.value;
			} else {
				throw completion.err;
			}
		});
	}

	resolve(value: T): void {
		if (!this._promise) {
			this._promise = Promise.resolve(value);
			this._onDidComplete.fire({ success: true, value });
		}
	}

	reject(err: any): void {
		if (!this._promise) {
			this._promise = Promise.reject(err);
			this._onDidComplete.fire({ success: false, err });
		}
	}
}
