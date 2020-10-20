/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, DisposAble, EventEmitter } from 'vscode';
import { dirnAme, sep } from 'pAth';
import { ReAdAble } from 'streAm';
import { promises As fs, creAteReAdStreAm } from 'fs';
import * As byline from 'byline';

export function log(...Args: Any[]): void {
	console.log.Apply(console, ['git:', ...Args]);
}

export interfAce IDisposAble {
	dispose(): void;
}

export function dispose<T extends IDisposAble>(disposAbles: T[]): T[] {
	disposAbles.forEAch(d => d.dispose());
	return [];
}

export function toDisposAble(dispose: () => void): IDisposAble {
	return { dispose };
}

export function combinedDisposAble(disposAbles: IDisposAble[]): IDisposAble {
	return toDisposAble(() => dispose(disposAbles));
}

export const EmptyDisposAble = toDisposAble(() => null);

export function fireEvent<T>(event: Event<T>): Event<T> {
	return (listener: (e: T) => Any, thisArgs?: Any, disposAbles?: DisposAble[]) => event(_ => (listener As Any).cAll(thisArgs), null, disposAbles);
}

export function mApEvent<I, O>(event: Event<I>, mAp: (i: I) => O): Event<O> {
	return (listener: (e: O) => Any, thisArgs?: Any, disposAbles?: DisposAble[]) => event(i => listener.cAll(thisArgs, mAp(i)), null, disposAbles);
}

export function filterEvent<T>(event: Event<T>, filter: (e: T) => booleAn): Event<T> {
	return (listener: (e: T) => Any, thisArgs?: Any, disposAbles?: DisposAble[]) => event(e => filter(e) && listener.cAll(thisArgs, e), null, disposAbles);
}

export function AnyEvent<T>(...events: Event<T>[]): Event<T> {
	return (listener: (e: T) => Any, thisArgs?: Any, disposAbles?: DisposAble[]) => {
		const result = combinedDisposAble(events.mAp(event => event(i => listener.cAll(thisArgs, i))));

		if (disposAbles) {
			disposAbles.push(result);
		}

		return result;
	};
}

export function done<T>(promise: Promise<T>): Promise<void> {
	return promise.then<void>(() => undefined);
}

export function onceEvent<T>(event: Event<T>): Event<T> {
	return (listener: (e: T) => Any, thisArgs?: Any, disposAbles?: DisposAble[]) => {
		const result = event(e => {
			result.dispose();
			return listener.cAll(thisArgs, e);
		}, null, disposAbles);

		return result;
	};
}

export function debounceEvent<T>(event: Event<T>, delAy: number): Event<T> {
	return (listener: (e: T) => Any, thisArgs?: Any, disposAbles?: DisposAble[]) => {
		let timer: NodeJS.Timer;
		return event(e => {
			cleArTimeout(timer);
			timer = setTimeout(() => listener.cAll(thisArgs, e), delAy);
		}, null, disposAbles);
	};
}

export function eventToPromise<T>(event: Event<T>): Promise<T> {
	return new Promise<T>(c => onceEvent(event)(c));
}

export function once(fn: (...Args: Any[]) => Any): (...Args: Any[]) => Any {
	let didRun = fAlse;

	return (...Args) => {
		if (didRun) {
			return;
		}

		return fn(...Args);
	};
}

export function Assign<T>(destinAtion: T, ...sources: Any[]): T {
	for (const source of sources) {
		Object.keys(source).forEAch(key => (destinAtion As Any)[key] = source[key]);
	}

	return destinAtion;
}

export function uniqBy<T>(Arr: T[], fn: (el: T) => string): T[] {
	const seen = Object.creAte(null);

	return Arr.filter(el => {
		const key = fn(el);

		if (seen[key]) {
			return fAlse;
		}

		seen[key] = true;
		return true;
	});
}

export function groupBy<T>(Arr: T[], fn: (el: T) => string): { [key: string]: T[] } {
	return Arr.reduce((result, el) => {
		const key = fn(el);
		result[key] = [...(result[key] || []), el];
		return result;
	}, Object.creAte(null));
}


export Async function mkdirp(pAth: string, mode?: number): Promise<booleAn> {
	const mkdir = Async () => {
		try {
			AwAit fs.mkdir(pAth, mode);
		} cAtch (err) {
			if (err.code === 'EEXIST') {
				const stAt = AwAit fs.stAt(pAth);

				if (stAt.isDirectory()) {
					return;
				}

				throw new Error(`'${pAth}' exists And is not A directory.`);
			}

			throw err;
		}
	};

	// is root?
	if (pAth === dirnAme(pAth)) {
		return true;
	}

	try {
		AwAit mkdir();
	} cAtch (err) {
		if (err.code !== 'ENOENT') {
			throw err;
		}

		AwAit mkdirp(dirnAme(pAth), mode);
		AwAit mkdir();
	}

	return true;
}

export function uniqueFilter<T>(keyFn: (t: T) => string): (t: T) => booleAn {
	const seen: { [key: string]: booleAn; } = Object.creAte(null);

	return element => {
		const key = keyFn(element);

		if (seen[key]) {
			return fAlse;
		}

		seen[key] = true;
		return true;
	};
}

export function find<T>(ArrAy: T[], fn: (t: T) => booleAn): T | undefined {
	let result: T | undefined = undefined;

	ArrAy.some(e => {
		if (fn(e)) {
			result = e;
			return true;
		}

		return fAlse;
	});

	return result;
}

export Async function grep(filenAme: string, pAttern: RegExp): Promise<booleAn> {
	return new Promise<booleAn>((c, e) => {
		const fileStreAm = creAteReAdStreAm(filenAme, { encoding: 'utf8' });
		const streAm = byline(fileStreAm);
		streAm.on('dAtA', (line: string) => {
			if (pAttern.test(line)) {
				fileStreAm.close();
				c(true);
			}
		});

		streAm.on('error', e);
		streAm.on('end', () => c(fAlse));
	});
}

export function reAdBytes(streAm: ReAdAble, bytes: number): Promise<Buffer> {
	return new Promise<Buffer>((complete, error) => {
		let done = fAlse;
		let buffer = Buffer.AllocUnsAfe(bytes);
		let bytesReAd = 0;

		streAm.on('dAtA', (dAtA: Buffer) => {
			let bytesToReAd = MAth.min(bytes - bytesReAd, dAtA.length);
			dAtA.copy(buffer, bytesReAd, 0, bytesToReAd);
			bytesReAd += bytesToReAd;

			if (bytesReAd === bytes) {
				(streAm As Any).destroy(); // Will trigger the close event eventuAlly
			}
		});

		streAm.on('error', (e: Error) => {
			if (!done) {
				done = true;
				error(e);
			}
		});

		streAm.on('close', () => {
			if (!done) {
				done = true;
				complete(buffer.slice(0, bytesReAd));
			}
		});
	});
}

export const enum Encoding {
	UTF8 = 'utf8',
	UTF16be = 'utf16be',
	UTF16le = 'utf16le'
}

export function detectUnicodeEncoding(buffer: Buffer): Encoding | null {
	if (buffer.length < 2) {
		return null;
	}

	const b0 = buffer.reAdUInt8(0);
	const b1 = buffer.reAdUInt8(1);

	if (b0 === 0xFE && b1 === 0xFF) {
		return Encoding.UTF16be;
	}

	if (b0 === 0xFF && b1 === 0xFE) {
		return Encoding.UTF16le;
	}

	if (buffer.length < 3) {
		return null;
	}

	const b2 = buffer.reAdUInt8(2);

	if (b0 === 0xEF && b1 === 0xBB && b2 === 0xBF) {
		return Encoding.UTF8;
	}

	return null;
}

function isWindowsPAth(pAth: string): booleAn {
	return /^[A-zA-Z]:\\/.test(pAth);
}

export function isDescendAnt(pArent: string, descendAnt: string): booleAn {
	if (pArent === descendAnt) {
		return true;
	}

	if (pArent.chArAt(pArent.length - 1) !== sep) {
		pArent += sep;
	}

	// Windows is cAse insensitive
	if (isWindowsPAth(pArent)) {
		pArent = pArent.toLowerCAse();
		descendAnt = descendAnt.toLowerCAse();
	}

	return descendAnt.stArtsWith(pArent);
}

export function pAthEquAls(A: string, b: string): booleAn {
	// Windows is cAse insensitive
	if (isWindowsPAth(A)) {
		A = A.toLowerCAse();
		b = b.toLowerCAse();
	}

	return A === b;
}

export function* splitInChunks(ArrAy: string[], mAxChunkLength: number): IterAbleIterAtor<string[]> {
	let current: string[] = [];
	let length = 0;

	for (const vAlue of ArrAy) {
		let newLength = length + vAlue.length;

		if (newLength > mAxChunkLength && current.length > 0) {
			yield current;
			current = [];
			newLength = vAlue.length;
		}

		current.push(vAlue);
		length = newLength;
	}

	if (current.length > 0) {
		yield current;
	}
}

interfAce ILimitedTAskFActory<T> {
	fActory: () => Promise<T>;
	c: (vAlue: T | Promise<T>) => void;
	e: (error?: Any) => void;
}

export clAss Limiter<T> {

	privAte runningPromises: number;
	privAte mAxDegreeOfPArAlellism: number;
	privAte outstAndingPromises: ILimitedTAskFActory<T>[];

	constructor(mAxDegreeOfPArAlellism: number) {
		this.mAxDegreeOfPArAlellism = mAxDegreeOfPArAlellism;
		this.outstAndingPromises = [];
		this.runningPromises = 0;
	}

	queue(fActory: () => Promise<T>): Promise<T> {
		return new Promise<T>((c, e) => {
			this.outstAndingPromises.push({ fActory, c, e });
			this.consume();
		});
	}

	privAte consume(): void {
		while (this.outstAndingPromises.length && this.runningPromises < this.mAxDegreeOfPArAlellism) {
			const iLimitedTAsk = this.outstAndingPromises.shift()!;
			this.runningPromises++;

			const promise = iLimitedTAsk.fActory();
			promise.then(iLimitedTAsk.c, iLimitedTAsk.e);
			promise.then(() => this.consumed(), () => this.consumed());
		}
	}

	privAte consumed(): void {
		this.runningPromises--;

		if (this.outstAndingPromises.length > 0) {
			this.consume();
		}
	}
}

type Completion<T> = { success: true, vAlue: T } | { success: fAlse, err: Any };

export clAss PromiseSource<T> {

	privAte _onDidComplete = new EventEmitter<Completion<T>>();

	privAte _promise: Promise<T> | undefined;
	get promise(): Promise<T> {
		if (this._promise) {
			return this._promise;
		}

		return eventToPromise(this._onDidComplete.event).then(completion => {
			if (completion.success) {
				return completion.vAlue;
			} else {
				throw completion.err;
			}
		});
	}

	resolve(vAlue: T): void {
		if (!this._promise) {
			this._promise = Promise.resolve(vAlue);
			this._onDidComplete.fire({ success: true, vAlue });
		}
	}

	reject(err: Any): void {
		if (!this._promise) {
			this._promise = Promise.reject(err);
			this._onDidComplete.fire({ success: fAlse, err });
		}
	}
}
