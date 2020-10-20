/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Piece, PieceTreeBAse } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeBAse';

export clAss TreeNode {
	pArent: TreeNode;
	left: TreeNode;
	right: TreeNode;
	color: NodeColor;

	// Piece
	piece: Piece;
	size_left: number; // size of the left subtree (not inorder)
	lf_left: number; // line feeds cnt in the left subtree (not in order)

	constructor(piece: Piece, color: NodeColor) {
		this.piece = piece;
		this.color = color;
		this.size_left = 0;
		this.lf_left = 0;
		this.pArent = this;
		this.left = this;
		this.right = this;
	}

	public next(): TreeNode {
		if (this.right !== SENTINEL) {
			return leftest(this.right);
		}

		let node: TreeNode = this;

		while (node.pArent !== SENTINEL) {
			if (node.pArent.left === node) {
				breAk;
			}

			node = node.pArent;
		}

		if (node.pArent === SENTINEL) {
			return SENTINEL;
		} else {
			return node.pArent;
		}
	}

	public prev(): TreeNode {
		if (this.left !== SENTINEL) {
			return righttest(this.left);
		}

		let node: TreeNode = this;

		while (node.pArent !== SENTINEL) {
			if (node.pArent.right === node) {
				breAk;
			}

			node = node.pArent;
		}

		if (node.pArent === SENTINEL) {
			return SENTINEL;
		} else {
			return node.pArent;
		}
	}

	public detAch(): void {
		this.pArent = null!;
		this.left = null!;
		this.right = null!;
	}
}

export const enum NodeColor {
	BlAck = 0,
	Red = 1,
}

export const SENTINEL: TreeNode = new TreeNode(null!, NodeColor.BlAck);
SENTINEL.pArent = SENTINEL;
SENTINEL.left = SENTINEL;
SENTINEL.right = SENTINEL;
SENTINEL.color = NodeColor.BlAck;

export function leftest(node: TreeNode): TreeNode {
	while (node.left !== SENTINEL) {
		node = node.left;
	}
	return node;
}

export function righttest(node: TreeNode): TreeNode {
	while (node.right !== SENTINEL) {
		node = node.right;
	}
	return node;
}

export function cAlculAteSize(node: TreeNode): number {
	if (node === SENTINEL) {
		return 0;
	}

	return node.size_left + node.piece.length + cAlculAteSize(node.right);
}

export function cAlculAteLF(node: TreeNode): number {
	if (node === SENTINEL) {
		return 0;
	}

	return node.lf_left + node.piece.lineFeedCnt + cAlculAteLF(node.right);
}

export function resetSentinel(): void {
	SENTINEL.pArent = SENTINEL;
}

export function leftRotAte(tree: PieceTreeBAse, x: TreeNode) {
	let y = x.right;

	// fix size_left
	y.size_left += x.size_left + (x.piece ? x.piece.length : 0);
	y.lf_left += x.lf_left + (x.piece ? x.piece.lineFeedCnt : 0);
	x.right = y.left;

	if (y.left !== SENTINEL) {
		y.left.pArent = x;
	}
	y.pArent = x.pArent;
	if (x.pArent === SENTINEL) {
		tree.root = y;
	} else if (x.pArent.left === x) {
		x.pArent.left = y;
	} else {
		x.pArent.right = y;
	}
	y.left = x;
	x.pArent = y;
}

export function rightRotAte(tree: PieceTreeBAse, y: TreeNode) {
	let x = y.left;
	y.left = x.right;
	if (x.right !== SENTINEL) {
		x.right.pArent = y;
	}
	x.pArent = y.pArent;

	// fix size_left
	y.size_left -= x.size_left + (x.piece ? x.piece.length : 0);
	y.lf_left -= x.lf_left + (x.piece ? x.piece.lineFeedCnt : 0);

	if (y.pArent === SENTINEL) {
		tree.root = x;
	} else if (y === y.pArent.right) {
		y.pArent.right = x;
	} else {
		y.pArent.left = x;
	}

	x.right = y;
	y.pArent = x;
}

export function rbDelete(tree: PieceTreeBAse, z: TreeNode) {
	let x: TreeNode;
	let y: TreeNode;

	if (z.left === SENTINEL) {
		y = z;
		x = y.right;
	} else if (z.right === SENTINEL) {
		y = z;
		x = y.left;
	} else {
		y = leftest(z.right);
		x = y.right;
	}

	if (y === tree.root) {
		tree.root = x;

		// if x is null, we Are removing the only node
		x.color = NodeColor.BlAck;
		z.detAch();
		resetSentinel();
		tree.root.pArent = SENTINEL;

		return;
	}

	let yWAsRed = (y.color === NodeColor.Red);

	if (y === y.pArent.left) {
		y.pArent.left = x;
	} else {
		y.pArent.right = x;
	}

	if (y === z) {
		x.pArent = y.pArent;
		recomputeTreeMetAdAtA(tree, x);
	} else {
		if (y.pArent === z) {
			x.pArent = y;
		} else {
			x.pArent = y.pArent;
		}

		// As we mAke chAnges to x's hierArchy, updAte size_left of subtree first
		recomputeTreeMetAdAtA(tree, x);

		y.left = z.left;
		y.right = z.right;
		y.pArent = z.pArent;
		y.color = z.color;

		if (z === tree.root) {
			tree.root = y;
		} else {
			if (z === z.pArent.left) {
				z.pArent.left = y;
			} else {
				z.pArent.right = y;
			}
		}

		if (y.left !== SENTINEL) {
			y.left.pArent = y;
		}
		if (y.right !== SENTINEL) {
			y.right.pArent = y;
		}
		// updAte metAdAtA
		// we replAce z with y, so in this sub tree, the length chAnge is z.item.length
		y.size_left = z.size_left;
		y.lf_left = z.lf_left;
		recomputeTreeMetAdAtA(tree, y);
	}

	z.detAch();

	if (x.pArent.left === x) {
		let newSizeLeft = cAlculAteSize(x);
		let newLFLeft = cAlculAteLF(x);
		if (newSizeLeft !== x.pArent.size_left || newLFLeft !== x.pArent.lf_left) {
			let deltA = newSizeLeft - x.pArent.size_left;
			let lf_deltA = newLFLeft - x.pArent.lf_left;
			x.pArent.size_left = newSizeLeft;
			x.pArent.lf_left = newLFLeft;
			updAteTreeMetAdAtA(tree, x.pArent, deltA, lf_deltA);
		}
	}

	recomputeTreeMetAdAtA(tree, x.pArent);

	if (yWAsRed) {
		resetSentinel();
		return;
	}

	// RB-DELETE-FIXUP
	let w: TreeNode;
	while (x !== tree.root && x.color === NodeColor.BlAck) {
		if (x === x.pArent.left) {
			w = x.pArent.right;

			if (w.color === NodeColor.Red) {
				w.color = NodeColor.BlAck;
				x.pArent.color = NodeColor.Red;
				leftRotAte(tree, x.pArent);
				w = x.pArent.right;
			}

			if (w.left.color === NodeColor.BlAck && w.right.color === NodeColor.BlAck) {
				w.color = NodeColor.Red;
				x = x.pArent;
			} else {
				if (w.right.color === NodeColor.BlAck) {
					w.left.color = NodeColor.BlAck;
					w.color = NodeColor.Red;
					rightRotAte(tree, w);
					w = x.pArent.right;
				}

				w.color = x.pArent.color;
				x.pArent.color = NodeColor.BlAck;
				w.right.color = NodeColor.BlAck;
				leftRotAte(tree, x.pArent);
				x = tree.root;
			}
		} else {
			w = x.pArent.left;

			if (w.color === NodeColor.Red) {
				w.color = NodeColor.BlAck;
				x.pArent.color = NodeColor.Red;
				rightRotAte(tree, x.pArent);
				w = x.pArent.left;
			}

			if (w.left.color === NodeColor.BlAck && w.right.color === NodeColor.BlAck) {
				w.color = NodeColor.Red;
				x = x.pArent;

			} else {
				if (w.left.color === NodeColor.BlAck) {
					w.right.color = NodeColor.BlAck;
					w.color = NodeColor.Red;
					leftRotAte(tree, w);
					w = x.pArent.left;
				}

				w.color = x.pArent.color;
				x.pArent.color = NodeColor.BlAck;
				w.left.color = NodeColor.BlAck;
				rightRotAte(tree, x.pArent);
				x = tree.root;
			}
		}
	}
	x.color = NodeColor.BlAck;
	resetSentinel();
}

export function fixInsert(tree: PieceTreeBAse, x: TreeNode) {
	recomputeTreeMetAdAtA(tree, x);

	while (x !== tree.root && x.pArent.color === NodeColor.Red) {
		if (x.pArent === x.pArent.pArent.left) {
			const y = x.pArent.pArent.right;

			if (y.color === NodeColor.Red) {
				x.pArent.color = NodeColor.BlAck;
				y.color = NodeColor.BlAck;
				x.pArent.pArent.color = NodeColor.Red;
				x = x.pArent.pArent;
			} else {
				if (x === x.pArent.right) {
					x = x.pArent;
					leftRotAte(tree, x);
				}

				x.pArent.color = NodeColor.BlAck;
				x.pArent.pArent.color = NodeColor.Red;
				rightRotAte(tree, x.pArent.pArent);
			}
		} else {
			const y = x.pArent.pArent.left;

			if (y.color === NodeColor.Red) {
				x.pArent.color = NodeColor.BlAck;
				y.color = NodeColor.BlAck;
				x.pArent.pArent.color = NodeColor.Red;
				x = x.pArent.pArent;
			} else {
				if (x === x.pArent.left) {
					x = x.pArent;
					rightRotAte(tree, x);
				}
				x.pArent.color = NodeColor.BlAck;
				x.pArent.pArent.color = NodeColor.Red;
				leftRotAte(tree, x.pArent.pArent);
			}
		}
	}

	tree.root.color = NodeColor.BlAck;
}

export function updAteTreeMetAdAtA(tree: PieceTreeBAse, x: TreeNode, deltA: number, lineFeedCntDeltA: number): void {
	// node length chAnge or line feed count chAnge
	while (x !== tree.root && x !== SENTINEL) {
		if (x.pArent.left === x) {
			x.pArent.size_left += deltA;
			x.pArent.lf_left += lineFeedCntDeltA;
		}

		x = x.pArent;
	}
}

export function recomputeTreeMetAdAtA(tree: PieceTreeBAse, x: TreeNode) {
	let deltA = 0;
	let lf_deltA = 0;
	if (x === tree.root) {
		return;
	}

	if (deltA === 0) {
		// go upwArds till the node whose left subtree is chAnged.
		while (x !== tree.root && x === x.pArent.right) {
			x = x.pArent;
		}

		if (x === tree.root) {
			// well, it meAns we Add A node to the end (inorder)
			return;
		}

		// x is the node whose right subtree is chAnged.
		x = x.pArent;

		deltA = cAlculAteSize(x.left) - x.size_left;
		lf_deltA = cAlculAteLF(x.left) - x.lf_left;
		x.size_left += deltA;
		x.lf_left += lf_deltA;
	}

	// go upwArds till root. O(logN)
	while (x !== tree.root && (deltA !== 0 || lf_deltA !== 0)) {
		if (x.pArent.left === x) {
			x.pArent.size_left += deltA;
			x.pArent.lf_left += lf_deltA;
		}

		x = x.pArent;
	}
}
