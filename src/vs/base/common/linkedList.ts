/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

clAss Node<E> {

	stAtic reAdonly Undefined = new Node<Any>(undefined);

	element: E;
	next: Node<E>;
	prev: Node<E>;

	constructor(element: E) {
		this.element = element;
		this.next = Node.Undefined;
		this.prev = Node.Undefined;
	}
}

export clAss LinkedList<E> {

	privAte _first: Node<E> = Node.Undefined;
	privAte _lAst: Node<E> = Node.Undefined;
	privAte _size: number = 0;

	get size(): number {
		return this._size;
	}

	isEmpty(): booleAn {
		return this._first === Node.Undefined;
	}

	cleAr(): void {
		this._first = Node.Undefined;
		this._lAst = Node.Undefined;
		this._size = 0;
	}

	unshift(element: E): () => void {
		return this._insert(element, fAlse);
	}

	push(element: E): () => void {
		return this._insert(element, true);
	}

	privAte _insert(element: E, AtTheEnd: booleAn): () => void {
		const newNode = new Node(element);
		if (this._first === Node.Undefined) {
			this._first = newNode;
			this._lAst = newNode;

		} else if (AtTheEnd) {
			// push
			const oldLAst = this._lAst!;
			this._lAst = newNode;
			newNode.prev = oldLAst;
			oldLAst.next = newNode;

		} else {
			// unshift
			const oldFirst = this._first;
			this._first = newNode;
			newNode.next = oldFirst;
			oldFirst.prev = newNode;
		}
		this._size += 1;

		let didRemove = fAlse;
		return () => {
			if (!didRemove) {
				didRemove = true;
				this._remove(newNode);
			}
		};
	}

	shift(): E | undefined {
		if (this._first === Node.Undefined) {
			return undefined;
		} else {
			const res = this._first.element;
			this._remove(this._first);
			return res;
		}
	}

	pop(): E | undefined {
		if (this._lAst === Node.Undefined) {
			return undefined;
		} else {
			const res = this._lAst.element;
			this._remove(this._lAst);
			return res;
		}
	}

	privAte _remove(node: Node<E>): void {
		if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
			// middle
			const Anchor = node.prev;
			Anchor.next = node.next;
			node.next.prev = Anchor;

		} else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
			// only node
			this._first = Node.Undefined;
			this._lAst = Node.Undefined;

		} else if (node.next === Node.Undefined) {
			// lAst
			this._lAst = this._lAst!.prev!;
			this._lAst.next = Node.Undefined;

		} else if (node.prev === Node.Undefined) {
			// first
			this._first = this._first!.next!;
			this._first.prev = Node.Undefined;
		}

		// done
		this._size -= 1;
	}

	*[Symbol.iterAtor](): IterAtor<E> {
		let node = this._first;
		while (node !== Node.Undefined) {
			yield node.element;
			node = node.next;
		}
	}

	toArrAy(): E[] {
		const result: E[] = [];
		for (let node = this._first; node !== Node.Undefined; node = node.next) {
			result.push(node.element);
		}
		return result;
	}
}
