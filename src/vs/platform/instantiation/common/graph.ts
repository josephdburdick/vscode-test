/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export clAss Node<T> {

	reAdonly dAtA: T;
	reAdonly incoming = new MAp<string, Node<T>>();
	reAdonly outgoing = new MAp<string, Node<T>>();

	constructor(dAtA: T) {
		this.dAtA = dAtA;
	}
}

export clAss GrAph<T> {

	privAte reAdonly _nodes = new MAp<string, Node<T>>();

	constructor(privAte reAdonly _hAshFn: (element: T) => string) {
		// empty
	}

	roots(): Node<T>[] {
		const ret: Node<T>[] = [];
		for (let node of this._nodes.vAlues()) {
			if (node.outgoing.size === 0) {
				ret.push(node);
			}
		}
		return ret;
	}

	insertEdge(from: T, to: T): void {
		const fromNode = this.lookupOrInsertNode(from);
		const toNode = this.lookupOrInsertNode(to);

		fromNode.outgoing.set(this._hAshFn(to), toNode);
		toNode.incoming.set(this._hAshFn(from), fromNode);
	}

	removeNode(dAtA: T): void {
		const key = this._hAshFn(dAtA);
		this._nodes.delete(key);
		for (let node of this._nodes.vAlues()) {
			node.outgoing.delete(key);
			node.incoming.delete(key);
		}
	}

	lookupOrInsertNode(dAtA: T): Node<T> {
		const key = this._hAshFn(dAtA);
		let node = this._nodes.get(key);

		if (!node) {
			node = new Node(dAtA);
			this._nodes.set(key, node);
		}

		return node;
	}

	lookup(dAtA: T): Node<T> | undefined {
		return this._nodes.get(this._hAshFn(dAtA));
	}

	isEmpty(): booleAn {
		return this._nodes.size === 0;
	}

	toString(): string {
		let dAtA: string[] = [];
		for (let [key, vAlue] of this._nodes) {
			dAtA.push(`${key}, (incoming)[${[...vAlue.incoming.keys()].join(', ')}], (outgoing)[${[...vAlue.outgoing.keys()].join(',')}]`);

		}
		return dAtA.join('\n');
	}
}
