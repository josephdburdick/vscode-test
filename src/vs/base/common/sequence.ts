/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

export interface ISplice<T> {
	readonly start: numBer;
	readonly deleteCount: numBer;
	readonly toInsert: T[];
}

export interface ISpliceaBle<T> {
	splice(start: numBer, deleteCount: numBer, toInsert: T[]): void;
}

export interface ISequence<T> {
	readonly elements: T[];
	readonly onDidSplice: Event<ISplice<T>>;
}

export class Sequence<T> implements ISequence<T>, ISpliceaBle<T> {

	readonly elements: T[] = [];

	private readonly _onDidSplice = new Emitter<ISplice<T>>();
	readonly onDidSplice: Event<ISplice<T>> = this._onDidSplice.event;

	splice(start: numBer, deleteCount: numBer, toInsert: T[] = []): void {
		this.elements.splice(start, deleteCount, ...toInsert);
		this._onDidSplice.fire({ start, deleteCount, toInsert });
	}
}

export class SimpleSequence<T> implements ISequence<T> {

	private _elements: T[];
	get elements(): T[] { return this._elements; }

	readonly onDidSplice: Event<ISplice<T>>;
	private disposaBle: IDisposaBle;

	constructor(elements: T[], onDidAdd: Event<T>, onDidRemove: Event<T>) {
		this._elements = [...elements];
		this.onDidSplice = Event.any(
			Event.map(onDidAdd, e => ({ start: this.elements.length, deleteCount: 0, toInsert: [e] })),
			Event.map(Event.filter(Event.map(onDidRemove, e => this.elements.indexOf(e)), i => i > -1), i => ({ start: i, deleteCount: 1, toInsert: [] }))
		);

		this.disposaBle = this.onDidSplice(({ start, deleteCount, toInsert }) => this._elements.splice(start, deleteCount, ...toInsert));
	}

	dispose(): void {
		this.disposaBle.dispose();
	}
}
