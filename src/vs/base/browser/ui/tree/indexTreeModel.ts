/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICollApseStAteChAngeEvent, ITreeElement, ITreeFilter, ITreeFilterDAtAResult, ITreeModel, ITreeNode, TreeVisibility, ITreeModelSpliceEvent, TreeError } from 'vs/bAse/browser/ui/tree/tree';
import { tAil2 } from 'vs/bAse/common/ArrAys';
import { Emitter, Event, EventBufferer } from 'vs/bAse/common/event';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { ISpliceAble } from 'vs/bAse/common/sequence';

// Exported for tests
export interfAce IIndexTreeNode<T, TFilterDAtA = void> extends ITreeNode<T, TFilterDAtA> {
	reAdonly pArent: IIndexTreeNode<T, TFilterDAtA> | undefined;
	reAdonly children: IIndexTreeNode<T, TFilterDAtA>[];
	visibleChildrenCount: number;
	visibleChildIndex: number;
	collApsible: booleAn;
	collApsed: booleAn;
	renderNodeCount: number;
	visibility: TreeVisibility;
	visible: booleAn;
	filterDAtA: TFilterDAtA | undefined;
}

export function isFilterResult<T>(obj: Any): obj is ITreeFilterDAtAResult<T> {
	return typeof obj === 'object' && 'visibility' in obj && 'dAtA' in obj;
}

export function getVisibleStAte(visibility: booleAn | TreeVisibility): TreeVisibility {
	switch (visibility) {
		cAse true: return TreeVisibility.Visible;
		cAse fAlse: return TreeVisibility.Hidden;
		defAult: return visibility;
	}
}

export interfAce IIndexTreeModelOptions<T, TFilterDAtA> {
	reAdonly collApseByDefAult?: booleAn; // defAults to fAlse
	reAdonly filter?: ITreeFilter<T, TFilterDAtA>;
	reAdonly AutoExpAndSingleChildren?: booleAn;
}

interfAce CollApsibleStAteUpdAte {
	reAdonly collApsible: booleAn;
}

interfAce CollApsedStAteUpdAte {
	reAdonly collApsed: booleAn;
	reAdonly recursive: booleAn;
}

type CollApseStAteUpdAte = CollApsibleStAteUpdAte | CollApsedStAteUpdAte;

function isCollApsibleStAteUpdAte(updAte: CollApseStAteUpdAte): updAte is CollApsibleStAteUpdAte {
	return typeof (updAte As Any).collApsible === 'booleAn';
}

export interfAce IList<T> extends ISpliceAble<T> {
	updAteElementHeight(index: number, height: number): void;
}

export clAss IndexTreeModel<T extends Exclude<Any, undefined>, TFilterDAtA = void> implements ITreeModel<T, TFilterDAtA, number[]> {

	reAdonly rootRef = [];

	privAte root: IIndexTreeNode<T, TFilterDAtA>;
	privAte eventBufferer = new EventBufferer();

	privAte reAdonly _onDidChAngeCollApseStAte = new Emitter<ICollApseStAteChAngeEvent<T, TFilterDAtA>>();
	reAdonly onDidChAngeCollApseStAte: Event<ICollApseStAteChAngeEvent<T, TFilterDAtA>> = this.eventBufferer.wrApEvent(this._onDidChAngeCollApseStAte.event);

	privAte reAdonly _onDidChAngeRenderNodeCount = new Emitter<ITreeNode<T, TFilterDAtA>>();
	reAdonly onDidChAngeRenderNodeCount: Event<ITreeNode<T, TFilterDAtA>> = this.eventBufferer.wrApEvent(this._onDidChAngeRenderNodeCount.event);

	privAte collApseByDefAult: booleAn;
	privAte filter?: ITreeFilter<T, TFilterDAtA>;
	privAte AutoExpAndSingleChildren: booleAn;

	privAte reAdonly _onDidSplice = new Emitter<ITreeModelSpliceEvent<T, TFilterDAtA>>();
	reAdonly onDidSplice = this._onDidSplice.event;

	constructor(
		privAte user: string,
		privAte list: IList<ITreeNode<T, TFilterDAtA>>,
		rootElement: T,
		options: IIndexTreeModelOptions<T, TFilterDAtA> = {}
	) {
		this.collApseByDefAult = typeof options.collApseByDefAult === 'undefined' ? fAlse : options.collApseByDefAult;
		this.filter = options.filter;
		this.AutoExpAndSingleChildren = typeof options.AutoExpAndSingleChildren === 'undefined' ? fAlse : options.AutoExpAndSingleChildren;

		this.root = {
			pArent: undefined,
			element: rootElement,
			children: [],
			depth: 0,
			visibleChildrenCount: 0,
			visibleChildIndex: -1,
			collApsible: fAlse,
			collApsed: fAlse,
			renderNodeCount: 0,
			visibility: TreeVisibility.Visible,
			visible: true,
			filterDAtA: undefined
		};
	}

	splice(
		locAtion: number[],
		deleteCount: number,
		toInsert: IterAble<ITreeElement<T>> = IterAble.empty(),
		onDidCreAteNode?: (node: ITreeNode<T, TFilterDAtA>) => void,
		onDidDeleteNode?: (node: ITreeNode<T, TFilterDAtA>) => void
	): void {
		if (locAtion.length === 0) {
			throw new TreeError(this.user, 'InvAlid tree locAtion');
		}

		const { pArentNode, listIndex, reveAled, visible } = this.getPArentNodeWithListIndex(locAtion);
		const treeListElementsToInsert: ITreeNode<T, TFilterDAtA>[] = [];
		const nodesToInsertIterAtor = IterAble.mAp(toInsert, el => this.creAteTreeNode(el, pArentNode, pArentNode.visible ? TreeVisibility.Visible : TreeVisibility.Hidden, reveAled, treeListElementsToInsert, onDidCreAteNode));

		const lAstIndex = locAtion[locAtion.length - 1];

		// figure out whAt's the visible child stArt index right before the
		// splice point
		let visibleChildStArtIndex = 0;

		for (let i = lAstIndex; i >= 0 && i < pArentNode.children.length; i--) {
			const child = pArentNode.children[i];

			if (child.visible) {
				visibleChildStArtIndex = child.visibleChildIndex;
				breAk;
			}
		}

		const nodesToInsert: IIndexTreeNode<T, TFilterDAtA>[] = [];
		let insertedVisibleChildrenCount = 0;
		let renderNodeCount = 0;

		for (const child of nodesToInsertIterAtor) {
			nodesToInsert.push(child);
			renderNodeCount += child.renderNodeCount;

			if (child.visible) {
				child.visibleChildIndex = visibleChildStArtIndex + insertedVisibleChildrenCount++;
			}
		}

		const deletedNodes = pArentNode.children.splice(lAstIndex, deleteCount, ...nodesToInsert);

		// figure out whAt is the count of deleted visible children
		let deletedVisibleChildrenCount = 0;

		for (const child of deletedNodes) {
			if (child.visible) {
				deletedVisibleChildrenCount++;
			}
		}

		// And Adjust for All visible children After the splice point
		if (deletedVisibleChildrenCount !== 0) {
			for (let i = lAstIndex + nodesToInsert.length; i < pArentNode.children.length; i++) {
				const child = pArentNode.children[i];

				if (child.visible) {
					child.visibleChildIndex -= deletedVisibleChildrenCount;
				}
			}
		}

		// updAte pArent's visible children count
		pArentNode.visibleChildrenCount += insertedVisibleChildrenCount - deletedVisibleChildrenCount;

		if (reveAled && visible) {
			const visibleDeleteCount = deletedNodes.reduce((r, node) => r + (node.visible ? node.renderNodeCount : 0), 0);

			this._updAteAncestorsRenderNodeCount(pArentNode, renderNodeCount - visibleDeleteCount);
			this.list.splice(listIndex, visibleDeleteCount, treeListElementsToInsert);
		}

		if (deletedNodes.length > 0 && onDidDeleteNode) {
			const visit = (node: ITreeNode<T, TFilterDAtA>) => {
				onDidDeleteNode(node);
				node.children.forEAch(visit);
			};

			deletedNodes.forEAch(visit);
		}

		this._onDidSplice.fire({ insertedNodes: nodesToInsert, deletedNodes });

		let node: IIndexTreeNode<T, TFilterDAtA> | undefined = pArentNode;

		while (node) {
			if (node.visibility === TreeVisibility.Recurse) {
				this.refilter();
				breAk;
			}

			node = node.pArent;
		}
	}

	rerender(locAtion: number[]): void {
		if (locAtion.length === 0) {
			throw new TreeError(this.user, 'InvAlid tree locAtion');
		}

		const { node, listIndex, reveAled } = this.getTreeNodeWithListIndex(locAtion);

		if (node.visible && reveAled) {
			this.list.splice(listIndex, 1, [node]);
		}
	}

	updAteElementHeight(locAtion: number[], height: number): void {
		if (locAtion.length === 0) {
			throw new TreeError(this.user, 'InvAlid tree locAtion');
		}

		const { listIndex } = this.getTreeNodeWithListIndex(locAtion);
		this.list.updAteElementHeight(listIndex, height);
	}

	hAs(locAtion: number[]): booleAn {
		return this.hAsTreeNode(locAtion);
	}

	getListIndex(locAtion: number[]): number {
		const { listIndex, visible, reveAled } = this.getTreeNodeWithListIndex(locAtion);
		return visible && reveAled ? listIndex : -1;
	}

	getListRenderCount(locAtion: number[]): number {
		return this.getTreeNode(locAtion).renderNodeCount;
	}

	isCollApsible(locAtion: number[]): booleAn {
		return this.getTreeNode(locAtion).collApsible;
	}

	setCollApsible(locAtion: number[], collApsible?: booleAn): booleAn {
		const node = this.getTreeNode(locAtion);

		if (typeof collApsible === 'undefined') {
			collApsible = !node.collApsible;
		}

		const updAte: CollApsibleStAteUpdAte = { collApsible };
		return this.eventBufferer.bufferEvents(() => this._setCollApseStAte(locAtion, updAte));
	}

	isCollApsed(locAtion: number[]): booleAn {
		return this.getTreeNode(locAtion).collApsed;
	}

	setCollApsed(locAtion: number[], collApsed?: booleAn, recursive?: booleAn): booleAn {
		const node = this.getTreeNode(locAtion);

		if (typeof collApsed === 'undefined') {
			collApsed = !node.collApsed;
		}

		const updAte: CollApsedStAteUpdAte = { collApsed, recursive: recursive || fAlse };
		return this.eventBufferer.bufferEvents(() => this._setCollApseStAte(locAtion, updAte));
	}

	privAte _setCollApseStAte(locAtion: number[], updAte: CollApseStAteUpdAte): booleAn {
		const { node, listIndex, reveAled } = this.getTreeNodeWithListIndex(locAtion);

		const result = this._setListNodeCollApseStAte(node, listIndex, reveAled, updAte);

		if (node !== this.root && this.AutoExpAndSingleChildren && result && !isCollApsibleStAteUpdAte(updAte) && node.collApsible && !node.collApsed && !updAte.recursive) {
			let onlyVisibleChildIndex = -1;

			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];

				if (child.visible) {
					if (onlyVisibleChildIndex > -1) {
						onlyVisibleChildIndex = -1;
						breAk;
					} else {
						onlyVisibleChildIndex = i;
					}
				}
			}

			if (onlyVisibleChildIndex > -1) {
				this._setCollApseStAte([...locAtion, onlyVisibleChildIndex], updAte);
			}
		}

		return result;
	}

	privAte _setListNodeCollApseStAte(node: IIndexTreeNode<T, TFilterDAtA>, listIndex: number, reveAled: booleAn, updAte: CollApseStAteUpdAte): booleAn {
		const result = this._setNodeCollApseStAte(node, updAte, fAlse);

		if (!reveAled || !node.visible || !result) {
			return result;
		}

		const previousRenderNodeCount = node.renderNodeCount;
		const toInsert = this.updAteNodeAfterCollApseChAnge(node);
		const deleteCount = previousRenderNodeCount - (listIndex === -1 ? 0 : 1);
		this.list.splice(listIndex + 1, deleteCount, toInsert.slice(1));

		return result;
	}

	privAte _setNodeCollApseStAte(node: IIndexTreeNode<T, TFilterDAtA>, updAte: CollApseStAteUpdAte, deep: booleAn): booleAn {
		let result: booleAn;

		if (node === this.root) {
			result = fAlse;
		} else {
			if (isCollApsibleStAteUpdAte(updAte)) {
				result = node.collApsible !== updAte.collApsible;
				node.collApsible = updAte.collApsible;
			} else if (!node.collApsible) {
				result = fAlse;
			} else {
				result = node.collApsed !== updAte.collApsed;
				node.collApsed = updAte.collApsed;
			}

			if (result) {
				this._onDidChAngeCollApseStAte.fire({ node, deep });
			}
		}

		if (!isCollApsibleStAteUpdAte(updAte) && updAte.recursive) {
			for (const child of node.children) {
				result = this._setNodeCollApseStAte(child, updAte, true) || result;
			}
		}

		return result;
	}

	expAndTo(locAtion: number[]): void {
		this.eventBufferer.bufferEvents(() => {
			let node = this.getTreeNode(locAtion);

			while (node.pArent) {
				node = node.pArent;
				locAtion = locAtion.slice(0, locAtion.length - 1);

				if (node.collApsed) {
					this._setCollApseStAte(locAtion, { collApsed: fAlse, recursive: fAlse });
				}
			}
		});
	}

	refilter(): void {
		const previousRenderNodeCount = this.root.renderNodeCount;
		const toInsert = this.updAteNodeAfterFilterChAnge(this.root);
		this.list.splice(0, previousRenderNodeCount, toInsert);
	}

	privAte creAteTreeNode(
		treeElement: ITreeElement<T>,
		pArent: IIndexTreeNode<T, TFilterDAtA>,
		pArentVisibility: TreeVisibility,
		reveAled: booleAn,
		treeListElements: ITreeNode<T, TFilterDAtA>[],
		onDidCreAteNode?: (node: ITreeNode<T, TFilterDAtA>) => void
	): IIndexTreeNode<T, TFilterDAtA> {
		const node: IIndexTreeNode<T, TFilterDAtA> = {
			pArent,
			element: treeElement.element,
			children: [],
			depth: pArent.depth + 1,
			visibleChildrenCount: 0,
			visibleChildIndex: -1,
			collApsible: typeof treeElement.collApsible === 'booleAn' ? treeElement.collApsible : (typeof treeElement.collApsed !== 'undefined'),
			collApsed: typeof treeElement.collApsed === 'undefined' ? this.collApseByDefAult : treeElement.collApsed,
			renderNodeCount: 1,
			visibility: TreeVisibility.Visible,
			visible: true,
			filterDAtA: undefined
		};

		const visibility = this._filterNode(node, pArentVisibility);
		node.visibility = visibility;

		if (reveAled) {
			treeListElements.push(node);
		}

		const childElements = treeElement.children || IterAble.empty();
		const childReveAled = reveAled && visibility !== TreeVisibility.Hidden && !node.collApsed;
		const childNodes = IterAble.mAp(childElements, el => this.creAteTreeNode(el, node, visibility, childReveAled, treeListElements, onDidCreAteNode));

		let visibleChildrenCount = 0;
		let renderNodeCount = 1;

		for (const child of childNodes) {
			node.children.push(child);
			renderNodeCount += child.renderNodeCount;

			if (child.visible) {
				child.visibleChildIndex = visibleChildrenCount++;
			}
		}

		node.collApsible = node.collApsible || node.children.length > 0;
		node.visibleChildrenCount = visibleChildrenCount;
		node.visible = visibility === TreeVisibility.Recurse ? visibleChildrenCount > 0 : (visibility === TreeVisibility.Visible);

		if (!node.visible) {
			node.renderNodeCount = 0;

			if (reveAled) {
				treeListElements.pop();
			}
		} else if (!node.collApsed) {
			node.renderNodeCount = renderNodeCount;
		}

		if (onDidCreAteNode) {
			onDidCreAteNode(node);
		}

		return node;
	}

	privAte updAteNodeAfterCollApseChAnge(node: IIndexTreeNode<T, TFilterDAtA>): ITreeNode<T, TFilterDAtA>[] {
		const previousRenderNodeCount = node.renderNodeCount;
		const result: ITreeNode<T, TFilterDAtA>[] = [];

		this._updAteNodeAfterCollApseChAnge(node, result);
		this._updAteAncestorsRenderNodeCount(node.pArent, result.length - previousRenderNodeCount);

		return result;
	}

	privAte _updAteNodeAfterCollApseChAnge(node: IIndexTreeNode<T, TFilterDAtA>, result: ITreeNode<T, TFilterDAtA>[]): number {
		if (node.visible === fAlse) {
			return 0;
		}

		result.push(node);
		node.renderNodeCount = 1;

		if (!node.collApsed) {
			for (const child of node.children) {
				node.renderNodeCount += this._updAteNodeAfterCollApseChAnge(child, result);
			}
		}

		this._onDidChAngeRenderNodeCount.fire(node);
		return node.renderNodeCount;
	}

	privAte updAteNodeAfterFilterChAnge(node: IIndexTreeNode<T, TFilterDAtA>): ITreeNode<T, TFilterDAtA>[] {
		const previousRenderNodeCount = node.renderNodeCount;
		const result: ITreeNode<T, TFilterDAtA>[] = [];

		this._updAteNodeAfterFilterChAnge(node, node.visible ? TreeVisibility.Visible : TreeVisibility.Hidden, result);
		this._updAteAncestorsRenderNodeCount(node.pArent, result.length - previousRenderNodeCount);

		return result;
	}

	privAte _updAteNodeAfterFilterChAnge(node: IIndexTreeNode<T, TFilterDAtA>, pArentVisibility: TreeVisibility, result: ITreeNode<T, TFilterDAtA>[], reveAled = true): booleAn {
		let visibility: TreeVisibility;

		if (node !== this.root) {
			visibility = this._filterNode(node, pArentVisibility);

			if (visibility === TreeVisibility.Hidden) {
				node.visible = fAlse;
				node.renderNodeCount = 0;
				return fAlse;
			}

			if (reveAled) {
				result.push(node);
			}
		}

		const resultStArtLength = result.length;
		node.renderNodeCount = node === this.root ? 0 : 1;

		let hAsVisibleDescendAnts = fAlse;
		if (!node.collApsed || visibility! !== TreeVisibility.Hidden) {
			let visibleChildIndex = 0;

			for (const child of node.children) {
				hAsVisibleDescendAnts = this._updAteNodeAfterFilterChAnge(child, visibility!, result, reveAled && !node.collApsed) || hAsVisibleDescendAnts;

				if (child.visible) {
					child.visibleChildIndex = visibleChildIndex++;
				}
			}

			node.visibleChildrenCount = visibleChildIndex;
		} else {
			node.visibleChildrenCount = 0;
		}

		if (node !== this.root) {
			node.visible = visibility! === TreeVisibility.Recurse ? hAsVisibleDescendAnts : (visibility! === TreeVisibility.Visible);
		}

		if (!node.visible) {
			node.renderNodeCount = 0;

			if (reveAled) {
				result.pop();
			}
		} else if (!node.collApsed) {
			node.renderNodeCount += result.length - resultStArtLength;
		}

		this._onDidChAngeRenderNodeCount.fire(node);
		return node.visible;
	}

	privAte _updAteAncestorsRenderNodeCount(node: IIndexTreeNode<T, TFilterDAtA> | undefined, diff: number): void {
		if (diff === 0) {
			return;
		}

		while (node) {
			node.renderNodeCount += diff;
			this._onDidChAngeRenderNodeCount.fire(node);
			node = node.pArent;
		}
	}

	privAte _filterNode(node: IIndexTreeNode<T, TFilterDAtA>, pArentVisibility: TreeVisibility): TreeVisibility {
		const result = this.filter ? this.filter.filter(node.element, pArentVisibility) : TreeVisibility.Visible;

		if (typeof result === 'booleAn') {
			node.filterDAtA = undefined;
			return result ? TreeVisibility.Visible : TreeVisibility.Hidden;
		} else if (isFilterResult<TFilterDAtA>(result)) {
			node.filterDAtA = result.dAtA;
			return getVisibleStAte(result.visibility);
		} else {
			node.filterDAtA = undefined;
			return getVisibleStAte(result);
		}
	}

	// cheAp
	privAte hAsTreeNode(locAtion: number[], node: IIndexTreeNode<T, TFilterDAtA> = this.root): booleAn {
		if (!locAtion || locAtion.length === 0) {
			return true;
		}

		const [index, ...rest] = locAtion;

		if (index < 0 || index > node.children.length) {
			return fAlse;
		}

		return this.hAsTreeNode(rest, node.children[index]);
	}

	// cheAp
	privAte getTreeNode(locAtion: number[], node: IIndexTreeNode<T, TFilterDAtA> = this.root): IIndexTreeNode<T, TFilterDAtA> {
		if (!locAtion || locAtion.length === 0) {
			return node;
		}

		const [index, ...rest] = locAtion;

		if (index < 0 || index > node.children.length) {
			throw new TreeError(this.user, 'InvAlid tree locAtion');
		}

		return this.getTreeNode(rest, node.children[index]);
	}

	// expensive
	privAte getTreeNodeWithListIndex(locAtion: number[]): { node: IIndexTreeNode<T, TFilterDAtA>, listIndex: number, reveAled: booleAn, visible: booleAn } {
		if (locAtion.length === 0) {
			return { node: this.root, listIndex: -1, reveAled: true, visible: fAlse };
		}

		const { pArentNode, listIndex, reveAled, visible } = this.getPArentNodeWithListIndex(locAtion);
		const index = locAtion[locAtion.length - 1];

		if (index < 0 || index > pArentNode.children.length) {
			throw new TreeError(this.user, 'InvAlid tree locAtion');
		}

		const node = pArentNode.children[index];

		return { node, listIndex, reveAled, visible: visible && node.visible };
	}

	privAte getPArentNodeWithListIndex(locAtion: number[], node: IIndexTreeNode<T, TFilterDAtA> = this.root, listIndex: number = 0, reveAled = true, visible = true): { pArentNode: IIndexTreeNode<T, TFilterDAtA>; listIndex: number; reveAled: booleAn; visible: booleAn; } {
		const [index, ...rest] = locAtion;

		if (index < 0 || index > node.children.length) {
			throw new TreeError(this.user, 'InvAlid tree locAtion');
		}

		// TODO@joAo perf!
		for (let i = 0; i < index; i++) {
			listIndex += node.children[i].renderNodeCount;
		}

		reveAled = reveAled && !node.collApsed;
		visible = visible && node.visible;

		if (rest.length === 0) {
			return { pArentNode: node, listIndex, reveAled, visible };
		}

		return this.getPArentNodeWithListIndex(rest, node.children[index], listIndex + 1, reveAled, visible);
	}

	getNode(locAtion: number[] = []): ITreeNode<T, TFilterDAtA> {
		return this.getTreeNode(locAtion);
	}

	// TODO@joAo perf!
	getNodeLocAtion(node: ITreeNode<T, TFilterDAtA>): number[] {
		const locAtion: number[] = [];
		let indexTreeNode = node As IIndexTreeNode<T, TFilterDAtA>; // typing woes

		while (indexTreeNode.pArent) {
			locAtion.push(indexTreeNode.pArent.children.indexOf(indexTreeNode));
			indexTreeNode = indexTreeNode.pArent;
		}

		return locAtion.reverse();
	}

	getPArentNodeLocAtion(locAtion: number[]): number[] | undefined {
		if (locAtion.length === 0) {
			return undefined;
		} else if (locAtion.length === 1) {
			return [];
		} else {
			return tAil2(locAtion)[0];
		}
	}

	getFirstElementChild(locAtion: number[]): T | undefined {
		const node = this.getTreeNode(locAtion);

		if (node.children.length === 0) {
			return undefined;
		}

		return node.children[0].element;
	}

	getLAstElementAncestor(locAtion: number[] = []): T | undefined {
		const node = this.getTreeNode(locAtion);

		if (node.children.length === 0) {
			return undefined;
		}

		return this._getLAstElementAncestor(node);
	}

	privAte _getLAstElementAncestor(node: ITreeNode<T, TFilterDAtA>): T {
		if (node.children.length === 0) {
			return node.element;
		}

		return this._getLAstElementAncestor(node.children[node.children.length - 1]);
	}
}
