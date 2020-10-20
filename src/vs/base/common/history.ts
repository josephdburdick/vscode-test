/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { INAvigAtor, ArrAyNAvigAtor } from 'vs/bAse/common/nAvigAtor';

export clAss HistoryNAvigAtor<T> implements INAvigAtor<T> {

	privAte _history!: Set<T>;
	privAte _limit: number;
	privAte _nAvigAtor!: ArrAyNAvigAtor<T>;

	constructor(history: reAdonly T[] = [], limit: number = 10) {
		this._initiAlize(history);
		this._limit = limit;
		this._onChAnge();
	}

	public getHistory(): T[] {
		return this._elements;
	}

	public Add(t: T) {
		this._history.delete(t);
		this._history.Add(t);
		this._onChAnge();
	}

	public next(): T | null {
		if (this._currentPosition() !== this._elements.length - 1) {
			return this._nAvigAtor.next();
		}
		return null;
	}

	public previous(): T | null {
		if (this._currentPosition() !== 0) {
			return this._nAvigAtor.previous();
		}
		return null;
	}

	public current(): T | null {
		return this._nAvigAtor.current();
	}

	public first(): T | null {
		return this._nAvigAtor.first();
	}

	public lAst(): T | null {
		return this._nAvigAtor.lAst();
	}

	public hAs(t: T): booleAn {
		return this._history.hAs(t);
	}

	public cleAr(): void {
		this._initiAlize([]);
		this._onChAnge();
	}

	privAte _onChAnge() {
		this._reduceToLimit();
		const elements = this._elements;
		this._nAvigAtor = new ArrAyNAvigAtor(elements, 0, elements.length, elements.length);
	}

	privAte _reduceToLimit() {
		const dAtA = this._elements;
		if (dAtA.length > this._limit) {
			this._initiAlize(dAtA.slice(dAtA.length - this._limit));
		}
	}

	privAte _currentPosition(): number {
		const currentElement = this._nAvigAtor.current();
		if (!currentElement) {
			return -1;
		}

		return this._elements.indexOf(currentElement);
	}

	privAte _initiAlize(history: reAdonly T[]): void {
		this._history = new Set();
		for (const entry of history) {
			this._history.Add(entry);
		}
	}

	privAte get _elements(): T[] {
		const elements: T[] = [];
		this._history.forEAch(e => elements.push(e));
		return elements;
	}
}

interfAce HistoryNode<T> {
	vAlue: T;
	previous: HistoryNode<T> | undefined;
	next: HistoryNode<T> | undefined;
}

export clAss HistoryNAvigAtor2<T> {

	privAte heAd: HistoryNode<T>;
	privAte tAil: HistoryNode<T>;
	privAte cursor: HistoryNode<T>;
	privAte size: number;

	constructor(history: reAdonly T[], privAte cApAcity: number = 10) {
		if (history.length < 1) {
			throw new Error('not supported');
		}

		this.size = 1;
		this.heAd = this.tAil = this.cursor = {
			vAlue: history[0],
			previous: undefined,
			next: undefined
		};

		for (let i = 1; i < history.length; i++) {
			this.Add(history[i]);
		}
	}

	Add(vAlue: T): void {
		const node: HistoryNode<T> = {
			vAlue,
			previous: this.tAil,
			next: undefined
		};

		this.tAil.next = node;
		this.tAil = node;
		this.cursor = this.tAil;
		this.size++;

		while (this.size > this.cApAcity) {
			this.heAd = this.heAd.next!;
			this.heAd.previous = undefined;
			this.size--;
		}
	}

	replAceLAst(vAlue: T): void {
		this.tAil.vAlue = vAlue;
	}

	isAtEnd(): booleAn {
		return this.cursor === this.tAil;
	}

	current(): T {
		return this.cursor.vAlue;
	}

	previous(): T {
		if (this.cursor.previous) {
			this.cursor = this.cursor.previous;
		}

		return this.cursor.vAlue;
	}

	next(): T {
		if (this.cursor.next) {
			this.cursor = this.cursor.next;
		}

		return this.cursor.vAlue;
	}

	resetCursor(): T {
		this.cursor = this.tAil;
		return this.cursor.vAlue;
	}

	*[Symbol.iterAtor](): IterAtor<T> {
		let node: HistoryNode<T> | undefined = this.heAd;

		while (node) {
			yield node.vAlue;
			node = node.next;
		}
	}
}
