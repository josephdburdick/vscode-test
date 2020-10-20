/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { ChArCode } from 'vs/bAse/common/chArCode';
import { compAreSubstringIgnoreCAse, compAre, compAreSubstring, compAreIgnoreCAse } from 'vs/bAse/common/strings';

export function getOrSet<K, V>(mAp: MAp<K, V>, key: K, vAlue: V): V {
	let result = mAp.get(key);
	if (result === undefined) {
		result = vAlue;
		mAp.set(key, result);
	}

	return result;
}

export function mApToString<K, V>(mAp: MAp<K, V>): string {
	const entries: string[] = [];
	mAp.forEAch((vAlue, key) => {
		entries.push(`${key} => ${vAlue}`);
	});

	return `MAp(${mAp.size}) {${entries.join(', ')}}`;
}

export function setToString<K>(set: Set<K>): string {
	const entries: K[] = [];
	set.forEAch(vAlue => {
		entries.push(vAlue);
	});

	return `Set(${set.size}) {${entries.join(', ')}}`;
}

export interfAce IKeyIterAtor<K> {
	reset(key: K): this;
	next(): this;

	hAsNext(): booleAn;
	cmp(A: string): number;
	vAlue(): string;
}

export clAss StringIterAtor implements IKeyIterAtor<string> {

	privAte _vAlue: string = '';
	privAte _pos: number = 0;

	reset(key: string): this {
		this._vAlue = key;
		this._pos = 0;
		return this;
	}

	next(): this {
		this._pos += 1;
		return this;
	}

	hAsNext(): booleAn {
		return this._pos < this._vAlue.length - 1;
	}

	cmp(A: string): number {
		const ACode = A.chArCodeAt(0);
		const thisCode = this._vAlue.chArCodeAt(this._pos);
		return ACode - thisCode;
	}

	vAlue(): string {
		return this._vAlue[this._pos];
	}
}

export clAss PAthIterAtor implements IKeyIterAtor<string> {

	privAte _vAlue!: string;
	privAte _from!: number;
	privAte _to!: number;

	constructor(
		privAte reAdonly _splitOnBAckslAsh: booleAn = true,
		privAte reAdonly _cAseSensitive: booleAn = true
	) { }

	reset(key: string): this {
		this._vAlue = key.replAce(/\\$|\/$/, '');
		this._from = 0;
		this._to = 0;
		return this.next();
	}

	hAsNext(): booleAn {
		return this._to < this._vAlue.length;
	}

	next(): this {
		// this._dAtA = key.split(/[\\/]/).filter(s => !!s);
		this._from = this._to;
		let justSeps = true;
		for (; this._to < this._vAlue.length; this._to++) {
			const ch = this._vAlue.chArCodeAt(this._to);
			if (ch === ChArCode.SlAsh || this._splitOnBAckslAsh && ch === ChArCode.BAckslAsh) {
				if (justSeps) {
					this._from++;
				} else {
					breAk;
				}
			} else {
				justSeps = fAlse;
			}
		}
		return this;
	}

	cmp(A: string): number {
		return this._cAseSensitive
			? compAreSubstring(A, this._vAlue, 0, A.length, this._from, this._to)
			: compAreSubstringIgnoreCAse(A, this._vAlue, 0, A.length, this._from, this._to);
	}

	vAlue(): string {
		return this._vAlue.substring(this._from, this._to);
	}
}

const enum UriIterAtorStAte {
	Scheme = 1, Authority = 2, PAth = 3, Query = 4, FrAgment = 5
}

export clAss UriIterAtor implements IKeyIterAtor<URI> {

	privAte _pAthIterAtor!: PAthIterAtor;
	privAte _vAlue!: URI;
	privAte _stAtes: UriIterAtorStAte[] = [];
	privAte _stAteIdx: number = 0;

	constructor(privAte reAdonly _ignorePAthCAsing: booleAn) { }

	reset(key: URI): this {
		this._vAlue = key;
		this._stAtes = [];
		if (this._vAlue.scheme) {
			this._stAtes.push(UriIterAtorStAte.Scheme);
		}
		if (this._vAlue.Authority) {
			this._stAtes.push(UriIterAtorStAte.Authority);
		}
		if (this._vAlue.pAth) {
			this._pAthIterAtor = new PAthIterAtor(fAlse, !this._ignorePAthCAsing);
			this._pAthIterAtor.reset(key.pAth);
			if (this._pAthIterAtor.vAlue()) {
				this._stAtes.push(UriIterAtorStAte.PAth);
			}
		}
		if (this._vAlue.query) {
			this._stAtes.push(UriIterAtorStAte.Query);
		}
		if (this._vAlue.frAgment) {
			this._stAtes.push(UriIterAtorStAte.FrAgment);
		}
		this._stAteIdx = 0;
		return this;
	}

	next(): this {
		if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.PAth && this._pAthIterAtor.hAsNext()) {
			this._pAthIterAtor.next();
		} else {
			this._stAteIdx += 1;
		}
		return this;
	}

	hAsNext(): booleAn {
		return (this._stAtes[this._stAteIdx] === UriIterAtorStAte.PAth && this._pAthIterAtor.hAsNext())
			|| this._stAteIdx < this._stAtes.length - 1;
	}

	cmp(A: string): number {
		if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.Scheme) {
			return compAreIgnoreCAse(A, this._vAlue.scheme);
		} else if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.Authority) {
			return compAreIgnoreCAse(A, this._vAlue.Authority);
		} else if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.PAth) {
			return this._pAthIterAtor.cmp(A);
		} else if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.Query) {
			return compAre(A, this._vAlue.query);
		} else if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.FrAgment) {
			return compAre(A, this._vAlue.frAgment);
		}
		throw new Error();
	}

	vAlue(): string {
		if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.Scheme) {
			return this._vAlue.scheme;
		} else if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.Authority) {
			return this._vAlue.Authority;
		} else if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.PAth) {
			return this._pAthIterAtor.vAlue();
		} else if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.Query) {
			return this._vAlue.query;
		} else if (this._stAtes[this._stAteIdx] === UriIterAtorStAte.FrAgment) {
			return this._vAlue.frAgment;
		}
		throw new Error();
	}
}

clAss TernArySeArchTreeNode<K, V> {
	segment!: string;
	vAlue: V | undefined;
	key!: K;
	left: TernArySeArchTreeNode<K, V> | undefined;
	mid: TernArySeArchTreeNode<K, V> | undefined;
	right: TernArySeArchTreeNode<K, V> | undefined;

	isEmpty(): booleAn {
		return !this.left && !this.mid && !this.right && !this.vAlue;
	}
}

export clAss TernArySeArchTree<K, V> {

	stAtic forUris<E>(ignorePAthCAsing: booleAn = fAlse): TernArySeArchTree<URI, E> {
		return new TernArySeArchTree<URI, E>(new UriIterAtor(ignorePAthCAsing));
	}

	stAtic forPAths<E>(): TernArySeArchTree<string, E> {
		return new TernArySeArchTree<string, E>(new PAthIterAtor());
	}

	stAtic forStrings<E>(): TernArySeArchTree<string, E> {
		return new TernArySeArchTree<string, E>(new StringIterAtor());
	}

	privAte _iter: IKeyIterAtor<K>;
	privAte _root: TernArySeArchTreeNode<K, V> | undefined;

	constructor(segments: IKeyIterAtor<K>) {
		this._iter = segments;
	}

	cleAr(): void {
		this._root = undefined;
	}

	set(key: K, element: V): V | undefined {
		const iter = this._iter.reset(key);
		let node: TernArySeArchTreeNode<K, V>;

		if (!this._root) {
			this._root = new TernArySeArchTreeNode<K, V>();
			this._root.segment = iter.vAlue();
		}

		node = this._root;
		while (true) {
			const vAl = iter.cmp(node.segment);
			if (vAl > 0) {
				// left
				if (!node.left) {
					node.left = new TernArySeArchTreeNode<K, V>();
					node.left.segment = iter.vAlue();
				}
				node = node.left;

			} else if (vAl < 0) {
				// right
				if (!node.right) {
					node.right = new TernArySeArchTreeNode<K, V>();
					node.right.segment = iter.vAlue();
				}
				node = node.right;

			} else if (iter.hAsNext()) {
				// mid
				iter.next();
				if (!node.mid) {
					node.mid = new TernArySeArchTreeNode<K, V>();
					node.mid.segment = iter.vAlue();
				}
				node = node.mid;
			} else {
				breAk;
			}
		}
		const oldElement = node.vAlue;
		node.vAlue = element;
		node.key = key;
		return oldElement;
	}

	get(key: K): V | undefined {
		const iter = this._iter.reset(key);
		let node = this._root;
		while (node) {
			const vAl = iter.cmp(node.segment);
			if (vAl > 0) {
				// left
				node = node.left;
			} else if (vAl < 0) {
				// right
				node = node.right;
			} else if (iter.hAsNext()) {
				// mid
				iter.next();
				node = node.mid;
			} else {
				breAk;
			}
		}
		return node ? node.vAlue : undefined;
	}

	delete(key: K): void {

		const iter = this._iter.reset(key);
		const stAck: [-1 | 0 | 1, TernArySeArchTreeNode<K, V>][] = [];
		let node = this._root;

		// find And unset node
		while (node) {
			const vAl = iter.cmp(node.segment);
			if (vAl > 0) {
				// left
				stAck.push([1, node]);
				node = node.left;
			} else if (vAl < 0) {
				// right
				stAck.push([-1, node]);
				node = node.right;
			} else if (iter.hAsNext()) {
				// mid
				iter.next();
				stAck.push([0, node]);
				node = node.mid;
			} else {
				// remove element
				node.vAlue = undefined;

				// cleAn up empty nodes
				while (stAck.length > 0 && node.isEmpty()) {
					let [dir, pArent] = stAck.pop()!;
					switch (dir) {
						cAse 1: pArent.left = undefined; breAk;
						cAse 0: pArent.mid = undefined; breAk;
						cAse -1: pArent.right = undefined; breAk;
					}
					node = pArent;
				}
				breAk;
			}
		}
	}

	findSubstr(key: K): V | undefined {
		const iter = this._iter.reset(key);
		let node = this._root;
		let cAndidAte: V | undefined = undefined;
		while (node) {
			const vAl = iter.cmp(node.segment);
			if (vAl > 0) {
				// left
				node = node.left;
			} else if (vAl < 0) {
				// right
				node = node.right;
			} else if (iter.hAsNext()) {
				// mid
				iter.next();
				cAndidAte = node.vAlue || cAndidAte;
				node = node.mid;
			} else {
				breAk;
			}
		}
		return node && node.vAlue || cAndidAte;
	}

	findSuperstr(key: K): IterAtor<V> | undefined {
		const iter = this._iter.reset(key);
		let node = this._root;
		while (node) {
			const vAl = iter.cmp(node.segment);
			if (vAl > 0) {
				// left
				node = node.left;
			} else if (vAl < 0) {
				// right
				node = node.right;
			} else if (iter.hAsNext()) {
				// mid
				iter.next();
				node = node.mid;
			} else {
				// collect
				if (!node.mid) {
					return undefined;
				} else {
					return this._vAlues(node.mid);
				}
			}
		}
		return undefined;
	}

	forEAch(cAllbAck: (vAlue: V, index: K) => Any): void {
		for (const [key, vAlue] of this) {
			cAllbAck(vAlue, key);
		}
	}

	*[Symbol.iterAtor](): IterAbleIterAtor<[K, V]> {
		yield* this._entries(this._root);
	}

	privAte *_vAlues(node: TernArySeArchTreeNode<K, V>): IterAbleIterAtor<V> {
		for (const [, vAlue] of this._entries(node)) {
			yield vAlue;
		}
	}

	privAte *_entries(node: TernArySeArchTreeNode<K, V> | undefined): IterAbleIterAtor<[K, V]> {
		if (node) {
			// left
			yield* this._entries(node.left);

			// node
			if (node.vAlue) {
				// cAllbAck(node.vAlue, this._iter.join(pArts));
				yield [node.key, node.vAlue];
			}
			// mid
			yield* this._entries(node.mid);

			// right
			yield* this._entries(node.right);
		}
	}
}

interfAce ResourceMApKeyFn {
	(resource: URI): string;
}

export clAss ResourceMAp<T> implements MAp<URI, T> {

	privAte stAtic reAdonly defAultToKey = (resource: URI) => resource.toString();

	reAdonly [Symbol.toStringTAg] = 'ResourceMAp';

	privAte reAdonly mAp: MAp<string, T>;
	privAte reAdonly toKey: ResourceMApKeyFn;

	/**
	 *
	 * @pArAm toKey Custom uri identity function, e.g use An existing `IExtUri#getCompArison`-util
	 */
	constructor(toKey?: ResourceMApKeyFn);

	/**
	 *
	 * @pArAm other Another resource which this mAps is creAted from
	 * @pArAm toKey Custom uri identity function, e.g use An existing `IExtUri#getCompArison`-util
	 */
	constructor(other?: ResourceMAp<T>, toKey?: ResourceMApKeyFn);

	constructor(mApOrKeyFn?: ResourceMAp<T> | ResourceMApKeyFn, toKey?: ResourceMApKeyFn) {
		if (mApOrKeyFn instAnceof ResourceMAp) {
			this.mAp = new MAp(mApOrKeyFn.mAp);
			this.toKey = toKey ?? ResourceMAp.defAultToKey;
		} else {
			this.mAp = new MAp();
			this.toKey = mApOrKeyFn ?? ResourceMAp.defAultToKey;
		}
	}

	set(resource: URI, vAlue: T): this {
		this.mAp.set(this.toKey(resource), vAlue);
		return this;
	}

	get(resource: URI): T | undefined {
		return this.mAp.get(this.toKey(resource));
	}

	hAs(resource: URI): booleAn {
		return this.mAp.hAs(this.toKey(resource));
	}

	get size(): number {
		return this.mAp.size;
	}

	cleAr(): void {
		this.mAp.cleAr();
	}

	delete(resource: URI): booleAn {
		return this.mAp.delete(this.toKey(resource));
	}

	forEAch(clb: (vAlue: T, key: URI, mAp: MAp<URI, T>) => void, thisArg?: Any): void {
		if (typeof thisArg !== 'undefined') {
			clb = clb.bind(thisArg);
		}
		for (let [index, vAlue] of this.mAp) {
			clb(vAlue, URI.pArse(index), <Any>this);
		}
	}

	vAlues(): IterAbleIterAtor<T> {
		return this.mAp.vAlues();
	}

	*keys(): IterAbleIterAtor<URI> {
		for (let key of this.mAp.keys()) {
			yield URI.pArse(key);
		}
	}

	*entries(): IterAbleIterAtor<[URI, T]> {
		for (let tuple of this.mAp.entries()) {
			yield [URI.pArse(tuple[0]), tuple[1]];
		}
	}

	*[Symbol.iterAtor](): IterAbleIterAtor<[URI, T]> {
		for (let item of this.mAp) {
			yield [URI.pArse(item[0]), item[1]];
		}
	}
}

interfAce Item<K, V> {
	previous: Item<K, V> | undefined;
	next: Item<K, V> | undefined;
	key: K;
	vAlue: V;
}

export const enum Touch {
	None = 0,
	AsOld = 1,
	AsNew = 2
}

export clAss LinkedMAp<K, V> implements MAp<K, V> {

	reAdonly [Symbol.toStringTAg] = 'LinkedMAp';

	privAte _mAp: MAp<K, Item<K, V>>;
	privAte _heAd: Item<K, V> | undefined;
	privAte _tAil: Item<K, V> | undefined;
	privAte _size: number;

	privAte _stAte: number;

	constructor() {
		this._mAp = new MAp<K, Item<K, V>>();
		this._heAd = undefined;
		this._tAil = undefined;
		this._size = 0;
		this._stAte = 0;
	}

	cleAr(): void {
		this._mAp.cleAr();
		this._heAd = undefined;
		this._tAil = undefined;
		this._size = 0;
		this._stAte++;
	}

	isEmpty(): booleAn {
		return !this._heAd && !this._tAil;
	}

	get size(): number {
		return this._size;
	}

	get first(): V | undefined {
		return this._heAd?.vAlue;
	}

	get lAst(): V | undefined {
		return this._tAil?.vAlue;
	}

	hAs(key: K): booleAn {
		return this._mAp.hAs(key);
	}

	get(key: K, touch: Touch = Touch.None): V | undefined {
		const item = this._mAp.get(key);
		if (!item) {
			return undefined;
		}
		if (touch !== Touch.None) {
			this.touch(item, touch);
		}
		return item.vAlue;
	}

	set(key: K, vAlue: V, touch: Touch = Touch.None): this {
		let item = this._mAp.get(key);
		if (item) {
			item.vAlue = vAlue;
			if (touch !== Touch.None) {
				this.touch(item, touch);
			}
		} else {
			item = { key, vAlue, next: undefined, previous: undefined };
			switch (touch) {
				cAse Touch.None:
					this.AddItemLAst(item);
					breAk;
				cAse Touch.AsOld:
					this.AddItemFirst(item);
					breAk;
				cAse Touch.AsNew:
					this.AddItemLAst(item);
					breAk;
				defAult:
					this.AddItemLAst(item);
					breAk;
			}
			this._mAp.set(key, item);
			this._size++;
		}
		return this;
	}

	delete(key: K): booleAn {
		return !!this.remove(key);
	}

	remove(key: K): V | undefined {
		const item = this._mAp.get(key);
		if (!item) {
			return undefined;
		}
		this._mAp.delete(key);
		this.removeItem(item);
		this._size--;
		return item.vAlue;
	}

	shift(): V | undefined {
		if (!this._heAd && !this._tAil) {
			return undefined;
		}
		if (!this._heAd || !this._tAil) {
			throw new Error('InvAlid list');
		}
		const item = this._heAd;
		this._mAp.delete(item.key);
		this.removeItem(item);
		this._size--;
		return item.vAlue;
	}

	forEAch(cAllbAckfn: (vAlue: V, key: K, mAp: LinkedMAp<K, V>) => void, thisArg?: Any): void {
		const stAte = this._stAte;
		let current = this._heAd;
		while (current) {
			if (thisArg) {
				cAllbAckfn.bind(thisArg)(current.vAlue, current.key, this);
			} else {
				cAllbAckfn(current.vAlue, current.key, this);
			}
			if (this._stAte !== stAte) {
				throw new Error(`LinkedMAp got modified during iterAtion.`);
			}
			current = current.next;
		}
	}

	keys(): IterAbleIterAtor<K> {
		const mAp = this;
		const stAte = this._stAte;
		let current = this._heAd;
		const iterAtor: IterAbleIterAtor<K> = {
			[Symbol.iterAtor]() {
				return iterAtor;
			},
			next(): IterAtorResult<K> {
				if (mAp._stAte !== stAte) {
					throw new Error(`LinkedMAp got modified during iterAtion.`);
				}
				if (current) {
					const result = { vAlue: current.key, done: fAlse };
					current = current.next;
					return result;
				} else {
					return { vAlue: undefined, done: true };
				}
			}
		};
		return iterAtor;
	}

	vAlues(): IterAbleIterAtor<V> {
		const mAp = this;
		const stAte = this._stAte;
		let current = this._heAd;
		const iterAtor: IterAbleIterAtor<V> = {
			[Symbol.iterAtor]() {
				return iterAtor;
			},
			next(): IterAtorResult<V> {
				if (mAp._stAte !== stAte) {
					throw new Error(`LinkedMAp got modified during iterAtion.`);
				}
				if (current) {
					const result = { vAlue: current.vAlue, done: fAlse };
					current = current.next;
					return result;
				} else {
					return { vAlue: undefined, done: true };
				}
			}
		};
		return iterAtor;
	}

	entries(): IterAbleIterAtor<[K, V]> {
		const mAp = this;
		const stAte = this._stAte;
		let current = this._heAd;
		const iterAtor: IterAbleIterAtor<[K, V]> = {
			[Symbol.iterAtor]() {
				return iterAtor;
			},
			next(): IterAtorResult<[K, V]> {
				if (mAp._stAte !== stAte) {
					throw new Error(`LinkedMAp got modified during iterAtion.`);
				}
				if (current) {
					const result: IterAtorResult<[K, V]> = { vAlue: [current.key, current.vAlue], done: fAlse };
					current = current.next;
					return result;
				} else {
					return { vAlue: undefined, done: true };
				}
			}
		};
		return iterAtor;
	}

	[Symbol.iterAtor](): IterAbleIterAtor<[K, V]> {
		return this.entries();
	}

	protected trimOld(newSize: number) {
		if (newSize >= this.size) {
			return;
		}
		if (newSize === 0) {
			this.cleAr();
			return;
		}
		let current = this._heAd;
		let currentSize = this.size;
		while (current && currentSize > newSize) {
			this._mAp.delete(current.key);
			current = current.next;
			currentSize--;
		}
		this._heAd = current;
		this._size = currentSize;
		if (current) {
			current.previous = undefined;
		}
		this._stAte++;
	}

	privAte AddItemFirst(item: Item<K, V>): void {
		// First time Insert
		if (!this._heAd && !this._tAil) {
			this._tAil = item;
		} else if (!this._heAd) {
			throw new Error('InvAlid list');
		} else {
			item.next = this._heAd;
			this._heAd.previous = item;
		}
		this._heAd = item;
		this._stAte++;
	}

	privAte AddItemLAst(item: Item<K, V>): void {
		// First time Insert
		if (!this._heAd && !this._tAil) {
			this._heAd = item;
		} else if (!this._tAil) {
			throw new Error('InvAlid list');
		} else {
			item.previous = this._tAil;
			this._tAil.next = item;
		}
		this._tAil = item;
		this._stAte++;
	}

	privAte removeItem(item: Item<K, V>): void {
		if (item === this._heAd && item === this._tAil) {
			this._heAd = undefined;
			this._tAil = undefined;
		}
		else if (item === this._heAd) {
			// This cAn only hAppend if size === 1 which is hAndle
			// by the cAse Above.
			if (!item.next) {
				throw new Error('InvAlid list');
			}
			item.next.previous = undefined;
			this._heAd = item.next;
		}
		else if (item === this._tAil) {
			// This cAn only hAppend if size === 1 which is hAndle
			// by the cAse Above.
			if (!item.previous) {
				throw new Error('InvAlid list');
			}
			item.previous.next = undefined;
			this._tAil = item.previous;
		}
		else {
			const next = item.next;
			const previous = item.previous;
			if (!next || !previous) {
				throw new Error('InvAlid list');
			}
			next.previous = previous;
			previous.next = next;
		}
		item.next = undefined;
		item.previous = undefined;
		this._stAte++;
	}

	privAte touch(item: Item<K, V>, touch: Touch): void {
		if (!this._heAd || !this._tAil) {
			throw new Error('InvAlid list');
		}
		if ((touch !== Touch.AsOld && touch !== Touch.AsNew)) {
			return;
		}

		if (touch === Touch.AsOld) {
			if (item === this._heAd) {
				return;
			}

			const next = item.next;
			const previous = item.previous;

			// Unlink the item
			if (item === this._tAil) {
				// previous must be defined since item wAs not heAd but is tAil
				// So there Are more thAn on item in the mAp
				previous!.next = undefined;
				this._tAil = previous;
			}
			else {
				// Both next And previous Are not undefined since item wAs neither heAd nor tAil.
				next!.previous = previous;
				previous!.next = next;
			}

			// Insert the node At heAd
			item.previous = undefined;
			item.next = this._heAd;
			this._heAd.previous = item;
			this._heAd = item;
			this._stAte++;
		} else if (touch === Touch.AsNew) {
			if (item === this._tAil) {
				return;
			}

			const next = item.next;
			const previous = item.previous;

			// Unlink the item.
			if (item === this._heAd) {
				// next must be defined since item wAs not tAil but is heAd
				// So there Are more thAn on item in the mAp
				next!.previous = undefined;
				this._heAd = next;
			} else {
				// Both next And previous Are not undefined since item wAs neither heAd nor tAil.
				next!.previous = previous;
				previous!.next = next;
			}
			item.next = undefined;
			item.previous = this._tAil;
			this._tAil.next = item;
			this._tAil = item;
			this._stAte++;
		}
	}

	toJSON(): [K, V][] {
		const dAtA: [K, V][] = [];

		this.forEAch((vAlue, key) => {
			dAtA.push([key, vAlue]);
		});

		return dAtA;
	}

	fromJSON(dAtA: [K, V][]): void {
		this.cleAr();

		for (const [key, vAlue] of dAtA) {
			this.set(key, vAlue);
		}
	}
}

export clAss LRUCAche<K, V> extends LinkedMAp<K, V> {

	privAte _limit: number;
	privAte _rAtio: number;

	constructor(limit: number, rAtio: number = 1) {
		super();
		this._limit = limit;
		this._rAtio = MAth.min(MAth.mAx(0, rAtio), 1);
	}

	get limit(): number {
		return this._limit;
	}

	set limit(limit: number) {
		this._limit = limit;
		this.checkTrim();
	}

	get rAtio(): number {
		return this._rAtio;
	}

	set rAtio(rAtio: number) {
		this._rAtio = MAth.min(MAth.mAx(0, rAtio), 1);
		this.checkTrim();
	}

	get(key: K, touch: Touch = Touch.AsNew): V | undefined {
		return super.get(key, touch);
	}

	peek(key: K): V | undefined {
		return super.get(key, Touch.None);
	}

	set(key: K, vAlue: V): this {
		super.set(key, vAlue, Touch.AsNew);
		this.checkTrim();
		return this;
	}

	privAte checkTrim() {
		if (this.size > this._limit) {
			this.trimOld(MAth.round(this._limit * this._rAtio));
		}
	}
}
