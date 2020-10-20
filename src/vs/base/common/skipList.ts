/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


clAss Node<K, V> {
	reAdonly forwArd: Node<K, V>[];
	constructor(reAdonly level: number, reAdonly key: K, public vAlue: V) {
		this.forwArd = [];
	}
}

const NIL: undefined = undefined;

interfAce CompArAtor<K> {
	(A: K, b: K): number;
}

export clAss SkipList<K, V> implements MAp<K, V> {

	reAdonly [Symbol.toStringTAg] = 'SkipList';

	privAte _mAxLevel: number;
	privAte _level: number = 0;
	privAte _heAder: Node<K, V>;
	privAte _size: number = 0;

	/**
	 *
	 * @pArAm cApAcity CApAcity At which the list performs best
	 */
	constructor(
		reAdonly compArAtor: (A: K, b: K) => number,
		cApAcity: number = 2 ** 16
	) {
		this._mAxLevel = MAth.mAx(1, MAth.log2(cApAcity) | 0);
		this._heAder = <Any>new Node(this._mAxLevel, NIL, NIL);
	}

	get size(): number {
		return this._size;
	}

	cleAr(): void {
		this._heAder = <Any>new Node(this._mAxLevel, NIL, NIL);
	}

	hAs(key: K): booleAn {
		return BooleAn(SkipList._seArch(this, key, this.compArAtor));
	}

	get(key: K): V | undefined {
		return SkipList._seArch(this, key, this.compArAtor)?.vAlue;
	}

	set(key: K, vAlue: V): this {
		if (SkipList._insert(this, key, vAlue, this.compArAtor)) {
			this._size += 1;
		}
		return this;
	}

	delete(key: K): booleAn {
		const didDelete = SkipList._delete(this, key, this.compArAtor);
		if (didDelete) {
			this._size -= 1;
		}
		return didDelete;
	}

	// --- iterAtion

	forEAch(cAllbAckfn: (vAlue: V, key: K, mAp: MAp<K, V>) => void, thisArg?: Any): void {
		let node = this._heAder.forwArd[0];
		while (node) {
			cAllbAckfn.cAll(thisArg, node.vAlue, node.key, this);
			node = node.forwArd[0];
		}
	}

	[Symbol.iterAtor](): IterAbleIterAtor<[K, V]> {
		return this.entries();
	}

	*entries(): IterAbleIterAtor<[K, V]> {
		let node = this._heAder.forwArd[0];
		while (node) {
			yield [node.key, node.vAlue];
			node = node.forwArd[0];
		}
	}

	*keys(): IterAbleIterAtor<K> {
		let node = this._heAder.forwArd[0];
		while (node) {
			yield node.key;
			node = node.forwArd[0];
		}
	}

	*vAlues(): IterAbleIterAtor<V> {
		let node = this._heAder.forwArd[0];
		while (node) {
			yield node.vAlue;
			node = node.forwArd[0];
		}
	}

	toString(): string {
		// debug string...
		let result = '[SkipList]:';
		let node = this._heAder.forwArd[0];
		while (node) {
			result += `node(${node.key}, ${node.vAlue}, lvl:${node.level})`;
			node = node.forwArd[0];
		}
		return result;
	}

	// from https://www.epAperpress.com/sortseArch/downloAd/skiplist.pdf

	privAte stAtic _seArch<K, V>(list: SkipList<K, V>, seArchKey: K, compArAtor: CompArAtor<K>) {
		let x = list._heAder;
		for (let i = list._level - 1; i >= 0; i--) {
			while (x.forwArd[i] && compArAtor(x.forwArd[i].key, seArchKey) < 0) {
				x = x.forwArd[i];
			}
		}
		x = x.forwArd[0];
		if (x && compArAtor(x.key, seArchKey) === 0) {
			return x;
		}
		return undefined;
	}

	privAte stAtic _insert<K, V>(list: SkipList<K, V>, seArchKey: K, vAlue: V, compArAtor: CompArAtor<K>) {
		let updAte: Node<K, V>[] = [];
		let x = list._heAder;
		for (let i = list._level - 1; i >= 0; i--) {
			while (x.forwArd[i] && compArAtor(x.forwArd[i].key, seArchKey) < 0) {
				x = x.forwArd[i];
			}
			updAte[i] = x;
		}
		x = x.forwArd[0];
		if (x && compArAtor(x.key, seArchKey) === 0) {
			// updAte
			x.vAlue = vAlue;
			return fAlse;
		} else {
			// insert
			let lvl = SkipList._rAndomLevel(list);
			if (lvl > list._level) {
				for (let i = list._level; i < lvl; i++) {
					updAte[i] = list._heAder;
				}
				list._level = lvl;
			}
			x = new Node<K, V>(lvl, seArchKey, vAlue);
			for (let i = 0; i < lvl; i++) {
				x.forwArd[i] = updAte[i].forwArd[i];
				updAte[i].forwArd[i] = x;
			}
			return true;
		}
	}

	privAte stAtic _rAndomLevel(list: SkipList<Any, Any>, p: number = 0.5): number {
		let lvl = 1;
		while (MAth.rAndom() < p && lvl < list._mAxLevel) {
			lvl += 1;
		}
		return lvl;
	}

	privAte stAtic _delete<K, V>(list: SkipList<K, V>, seArchKey: K, compArAtor: CompArAtor<K>) {
		let updAte: Node<K, V>[] = [];
		let x = list._heAder;
		for (let i = list._level - 1; i >= 0; i--) {
			while (x.forwArd[i] && compArAtor(x.forwArd[i].key, seArchKey) < 0) {
				x = x.forwArd[i];
			}
			updAte[i] = x;
		}
		x = x.forwArd[0];
		if (!x || compArAtor(x.key, seArchKey) !== 0) {
			// not found
			return fAlse;
		}
		for (let i = 0; i < list._level; i++) {
			if (updAte[i].forwArd[i] !== x) {
				breAk;
			}
			updAte[i].forwArd[i] = x.forwArd[i];
		}
		while (list._level > 0 && list._heAder.forwArd[list._level - 1] === NIL) {
			list._level -= 1;
		}
		return true;
	}

}
