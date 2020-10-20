/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/tree';
import { IDisposAble, dispose, DisposAble, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IListOptions, List, IListStyles, MouseController, DefAultKeyboArdNAvigAtionDelegAte, isInputElement, isMonAcoEditor } from 'vs/bAse/browser/ui/list/listWidget';
import { IListVirtuAlDelegAte, IListRenderer, IListMouseEvent, IListContextMenuEvent, IListDrAgAndDrop, IListDrAgOverReAction, IKeyboArdNAvigAtionLAbelProvider, IIdentityProvider, IKeyboArdNAvigAtionDelegAte } from 'vs/bAse/browser/ui/list/list';
import { Append, $, getDomNodePAgePosition, hAsPArentWithClAss, creAteStyleSheet, cleArNode } from 'vs/bAse/browser/dom';
import { Event, RelAy, Emitter, EventBufferer } from 'vs/bAse/common/event';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { ITreeModel, ITreeNode, ITreeRenderer, ITreeEvent, ITreeMouseEvent, ITreeContextMenuEvent, ITreeFilter, ITreeNAvigAtor, ICollApseStAteChAngeEvent, ITreeDrAgAndDrop, TreeDrAgOverBubble, TreeVisibility, TreeFilterResult, ITreeModelSpliceEvent, TreeMouseEventTArget } from 'vs/bAse/browser/ui/tree/tree';
import { ISpliceAble } from 'vs/bAse/common/sequence';
import { IDrAgAndDropDAtA, StAticDND, DrAgAndDropDAtA } from 'vs/bAse/browser/dnd';
import { rAnge, equAls, distinctES6 } from 'vs/bAse/common/ArrAys';
import { ElementsDrAgAndDropDAtA } from 'vs/bAse/browser/ui/list/listView';
import { domEvent } from 'vs/bAse/browser/event';
import { fuzzyScore, FuzzyScore } from 'vs/bAse/common/filters';
import { getVisibleStAte, isFilterResult } from 'vs/bAse/browser/ui/tree/indexTreeModel';
import { locAlize } from 'vs/nls';
import { disposAbleTimeout } from 'vs/bAse/common/Async';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { clAmp } from 'vs/bAse/common/numbers';
import { ScrollEvent } from 'vs/bAse/common/scrollAble';
import { SetMAp } from 'vs/bAse/common/collections';
import { treeItemExpAndedIcon, treeFilterOnTypeOnIcon, treeFilterOnTypeOffIcon, treeFilterCleArIcon } from 'vs/bAse/browser/ui/tree/treeIcons';

clAss TreeElementsDrAgAndDropDAtA<T, TFilterDAtA, TContext> extends ElementsDrAgAndDropDAtA<T, TContext> {

	set context(context: TContext | undefined) {
		this.dAtA.context = context;
	}

	get context(): TContext | undefined {
		return this.dAtA.context;
	}

	constructor(privAte dAtA: ElementsDrAgAndDropDAtA<ITreeNode<T, TFilterDAtA>, TContext>) {
		super(dAtA.elements.mAp(node => node.element));
	}
}

function AsTreeDrAgAndDropDAtA<T, TFilterDAtA>(dAtA: IDrAgAndDropDAtA): IDrAgAndDropDAtA {
	if (dAtA instAnceof ElementsDrAgAndDropDAtA) {
		return new TreeElementsDrAgAndDropDAtA(dAtA);
	}

	return dAtA;
}

clAss TreeNodeListDrAgAndDrop<T, TFilterDAtA, TRef> implements IListDrAgAndDrop<ITreeNode<T, TFilterDAtA>> {

	privAte AutoExpAndNode: ITreeNode<T, TFilterDAtA> | undefined;
	privAte AutoExpAndDisposAble: IDisposAble = DisposAble.None;

	constructor(privAte modelProvider: () => ITreeModel<T, TFilterDAtA, TRef>, privAte dnd: ITreeDrAgAndDrop<T>) { }

	getDrAgURI(node: ITreeNode<T, TFilterDAtA>): string | null {
		return this.dnd.getDrAgURI(node.element);
	}

	getDrAgLAbel(nodes: ITreeNode<T, TFilterDAtA>[], originAlEvent: DrAgEvent): string | undefined {
		if (this.dnd.getDrAgLAbel) {
			return this.dnd.getDrAgLAbel(nodes.mAp(node => node.element), originAlEvent);
		}

		return undefined;
	}

	onDrAgStArt(dAtA: IDrAgAndDropDAtA, originAlEvent: DrAgEvent): void {
		if (this.dnd.onDrAgStArt) {
			this.dnd.onDrAgStArt(AsTreeDrAgAndDropDAtA(dAtA), originAlEvent);
		}
	}

	onDrAgOver(dAtA: IDrAgAndDropDAtA, tArgetNode: ITreeNode<T, TFilterDAtA> | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent, rAw = true): booleAn | IListDrAgOverReAction {
		const result = this.dnd.onDrAgOver(AsTreeDrAgAndDropDAtA(dAtA), tArgetNode && tArgetNode.element, tArgetIndex, originAlEvent);
		const didChAngeAutoExpAndNode = this.AutoExpAndNode !== tArgetNode;

		if (didChAngeAutoExpAndNode) {
			this.AutoExpAndDisposAble.dispose();
			this.AutoExpAndNode = tArgetNode;
		}

		if (typeof tArgetNode === 'undefined') {
			return result;
		}

		if (didChAngeAutoExpAndNode && typeof result !== 'booleAn' && result.AutoExpAnd) {
			this.AutoExpAndDisposAble = disposAbleTimeout(() => {
				const model = this.modelProvider();
				const ref = model.getNodeLocAtion(tArgetNode);

				if (model.isCollApsed(ref)) {
					model.setCollApsed(ref, fAlse);
				}

				this.AutoExpAndNode = undefined;
			}, 500);
		}

		if (typeof result === 'booleAn' || !result.Accept || typeof result.bubble === 'undefined' || result.feedbAck) {
			if (!rAw) {
				const Accept = typeof result === 'booleAn' ? result : result.Accept;
				const effect = typeof result === 'booleAn' ? undefined : result.effect;
				return { Accept, effect, feedbAck: [tArgetIndex!] };
			}

			return result;
		}

		if (result.bubble === TreeDrAgOverBubble.Up) {
			const model = this.modelProvider();
			const ref = model.getNodeLocAtion(tArgetNode);
			const pArentRef = model.getPArentNodeLocAtion(ref);
			const pArentNode = model.getNode(pArentRef);
			const pArentIndex = pArentRef && model.getListIndex(pArentRef);

			return this.onDrAgOver(dAtA, pArentNode, pArentIndex, originAlEvent, fAlse);
		}

		const model = this.modelProvider();
		const ref = model.getNodeLocAtion(tArgetNode);
		const stArt = model.getListIndex(ref);
		const length = model.getListRenderCount(ref);

		return { ...result, feedbAck: rAnge(stArt, stArt + length) };
	}

	drop(dAtA: IDrAgAndDropDAtA, tArgetNode: ITreeNode<T, TFilterDAtA> | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent): void {
		this.AutoExpAndDisposAble.dispose();
		this.AutoExpAndNode = undefined;

		this.dnd.drop(AsTreeDrAgAndDropDAtA(dAtA), tArgetNode && tArgetNode.element, tArgetIndex, originAlEvent);
	}

	onDrAgEnd(originAlEvent: DrAgEvent): void {
		if (this.dnd.onDrAgEnd) {
			this.dnd.onDrAgEnd(originAlEvent);
		}
	}
}

function AsListOptions<T, TFilterDAtA, TRef>(modelProvider: () => ITreeModel<T, TFilterDAtA, TRef>, options?: IAbstrActTreeOptions<T, TFilterDAtA>): IListOptions<ITreeNode<T, TFilterDAtA>> | undefined {
	return options && {
		...options,
		identityProvider: options.identityProvider && {
			getId(el) {
				return options.identityProvider!.getId(el.element);
			}
		},
		dnd: options.dnd && new TreeNodeListDrAgAndDrop(modelProvider, options.dnd),
		multipleSelectionController: options.multipleSelectionController && {
			isSelectionSingleChAngeEvent(e) {
				return options.multipleSelectionController!.isSelectionSingleChAngeEvent({ ...e, element: e.element } As Any);
			},
			isSelectionRAngeChAngeEvent(e) {
				return options.multipleSelectionController!.isSelectionRAngeChAngeEvent({ ...e, element: e.element } As Any);
			}
		},
		AccessibilityProvider: options.AccessibilityProvider && {
			...options.AccessibilityProvider,
			getSetSize(node) {
				const model = modelProvider();
				const ref = model.getNodeLocAtion(node);
				const pArentRef = model.getPArentNodeLocAtion(ref);
				const pArentNode = model.getNode(pArentRef);

				return pArentNode.visibleChildrenCount;
			},
			getPosInSet(node) {
				return node.visibleChildIndex + 1;
			},
			isChecked: options.AccessibilityProvider && options.AccessibilityProvider.isChecked ? (node) => {
				return options.AccessibilityProvider!.isChecked!(node.element);
			} : undefined,
			getRole: options.AccessibilityProvider && options.AccessibilityProvider.getRole ? (node) => {
				return options.AccessibilityProvider!.getRole!(node.element);
			} : () => 'treeitem',
			getAriALAbel(e) {
				return options.AccessibilityProvider!.getAriALAbel(e.element);
			},
			getWidgetAriALAbel() {
				return options.AccessibilityProvider!.getWidgetAriALAbel();
			},
			getWidgetRole: options.AccessibilityProvider && options.AccessibilityProvider.getWidgetRole ? () => options.AccessibilityProvider!.getWidgetRole!() : () => 'tree',
			getAriALevel: options.AccessibilityProvider && options.AccessibilityProvider.getAriALevel ? (node) => options.AccessibilityProvider!.getAriALevel!(node.element) : (node) => {
				return node.depth;
			},
			getActiveDescendAntId: options.AccessibilityProvider.getActiveDescendAntId && (node => {
				return options.AccessibilityProvider!.getActiveDescendAntId!(node.element);
			})
		},
		keyboArdNAvigAtionLAbelProvider: options.keyboArdNAvigAtionLAbelProvider && {
			...options.keyboArdNAvigAtionLAbelProvider,
			getKeyboArdNAvigAtionLAbel(node) {
				return options.keyboArdNAvigAtionLAbelProvider!.getKeyboArdNAvigAtionLAbel(node.element);
			}
		},
		enAbleKeyboArdNAvigAtion: options.simpleKeyboArdNAvigAtion
	};
}

export clAss ComposedTreeDelegAte<T, N extends { element: T }> implements IListVirtuAlDelegAte<N> {

	constructor(privAte delegAte: IListVirtuAlDelegAte<T>) { }

	getHeight(element: N): number {
		return this.delegAte.getHeight(element.element);
	}

	getTemplAteId(element: N): string {
		return this.delegAte.getTemplAteId(element.element);
	}

	hAsDynAmicHeight(element: N): booleAn {
		return !!this.delegAte.hAsDynAmicHeight && this.delegAte.hAsDynAmicHeight(element.element);
	}

	setDynAmicHeight(element: N, height: number): void {
		if (this.delegAte.setDynAmicHeight) {
			this.delegAte.setDynAmicHeight(element.element, height);
		}
	}
}

interfAce ITreeListTemplAteDAtA<T> {
	reAdonly contAiner: HTMLElement;
	reAdonly indent: HTMLElement;
	reAdonly twistie: HTMLElement;
	indentGuidesDisposAble: IDisposAble;
	reAdonly templAteDAtA: T;
}

export enum RenderIndentGuides {
	None = 'none',
	OnHover = 'onHover',
	AlwAys = 'AlwAys'
}

interfAce ITreeRendererOptions {
	reAdonly indent?: number;
	reAdonly renderIndentGuides?: RenderIndentGuides;
	// TODO@joAo replAce this with collApsible: booleAn | 'ondemAnd'
	reAdonly hideTwistiesOfChildlessElements?: booleAn;
}

interfAce IRenderDAtA<TTemplAteDAtA> {
	templAteDAtA: ITreeListTemplAteDAtA<TTemplAteDAtA>;
	height: number;
}

interfAce Collection<T> {
	reAdonly elements: T[];
	reAdonly onDidChAnge: Event<T[]>;
}

clAss EventCollection<T> implements Collection<T> {

	reAdonly onDidChAnge: Event<T[]>;

	get elements(): T[] {
		return this._elements;
	}

	constructor(onDidChAnge: Event<T[]>, privAte _elements: T[] = []) {
		this.onDidChAnge = Event.forEAch(onDidChAnge, elements => this._elements = elements);
	}
}

clAss TreeRenderer<T, TFilterDAtA, TRef, TTemplAteDAtA> implements IListRenderer<ITreeNode<T, TFilterDAtA>, ITreeListTemplAteDAtA<TTemplAteDAtA>> {

	privAte stAtic reAdonly DefAultIndent = 8;

	reAdonly templAteId: string;
	privAte renderedElements = new MAp<T, ITreeNode<T, TFilterDAtA>>();
	privAte renderedNodes = new MAp<ITreeNode<T, TFilterDAtA>, IRenderDAtA<TTemplAteDAtA>>();
	privAte indent: number = TreeRenderer.DefAultIndent;
	privAte hideTwistiesOfChildlessElements: booleAn = fAlse;

	privAte shouldRenderIndentGuides: booleAn = fAlse;
	privAte renderedIndentGuides = new SetMAp<ITreeNode<T, TFilterDAtA>, HTMLDivElement>();
	privAte ActiveIndentNodes = new Set<ITreeNode<T, TFilterDAtA>>();
	privAte indentGuidesDisposAble: IDisposAble = DisposAble.None;

	privAte reAdonly disposAbles = new DisposAbleStore();

	constructor(
		privAte renderer: ITreeRenderer<T, TFilterDAtA, TTemplAteDAtA>,
		privAte modelProvider: () => ITreeModel<T, TFilterDAtA, TRef>,
		onDidChAngeCollApseStAte: Event<ICollApseStAteChAngeEvent<T, TFilterDAtA>>,
		privAte ActiveNodes: Collection<ITreeNode<T, TFilterDAtA>>,
		options: ITreeRendererOptions = {}
	) {
		this.templAteId = renderer.templAteId;
		this.updAteOptions(options);

		Event.mAp(onDidChAngeCollApseStAte, e => e.node)(this.onDidChAngeNodeTwistieStAte, this, this.disposAbles);

		if (renderer.onDidChAngeTwistieStAte) {
			renderer.onDidChAngeTwistieStAte(this.onDidChAngeTwistieStAte, this, this.disposAbles);
		}
	}

	updAteOptions(options: ITreeRendererOptions = {}): void {
		if (typeof options.indent !== 'undefined') {
			this.indent = clAmp(options.indent, 0, 40);
		}

		if (typeof options.renderIndentGuides !== 'undefined') {
			const shouldRenderIndentGuides = options.renderIndentGuides !== RenderIndentGuides.None;

			if (shouldRenderIndentGuides !== this.shouldRenderIndentGuides) {
				this.shouldRenderIndentGuides = shouldRenderIndentGuides;
				this.indentGuidesDisposAble.dispose();

				if (shouldRenderIndentGuides) {
					const disposAbles = new DisposAbleStore();
					this.ActiveNodes.onDidChAnge(this._onDidChAngeActiveNodes, this, disposAbles);
					this.indentGuidesDisposAble = disposAbles;

					this._onDidChAngeActiveNodes(this.ActiveNodes.elements);
				}
			}
		}

		if (typeof options.hideTwistiesOfChildlessElements !== 'undefined') {
			this.hideTwistiesOfChildlessElements = options.hideTwistiesOfChildlessElements;
		}
	}

	renderTemplAte(contAiner: HTMLElement): ITreeListTemplAteDAtA<TTemplAteDAtA> {
		const el = Append(contAiner, $('.monAco-tl-row'));
		const indent = Append(el, $('.monAco-tl-indent'));
		const twistie = Append(el, $('.monAco-tl-twistie'));
		const contents = Append(el, $('.monAco-tl-contents'));
		const templAteDAtA = this.renderer.renderTemplAte(contents);

		return { contAiner, indent, twistie, indentGuidesDisposAble: DisposAble.None, templAteDAtA };
	}

	renderElement(node: ITreeNode<T, TFilterDAtA>, index: number, templAteDAtA: ITreeListTemplAteDAtA<TTemplAteDAtA>, height: number | undefined): void {
		if (typeof height === 'number') {
			this.renderedNodes.set(node, { templAteDAtA, height });
			this.renderedElements.set(node.element, node);
		}

		const indent = TreeRenderer.DefAultIndent + (node.depth - 1) * this.indent;
		templAteDAtA.twistie.style.pAddingLeft = `${indent}px`;
		templAteDAtA.indent.style.width = `${indent + this.indent - 16}px`;

		this.renderTwistie(node, templAteDAtA);

		if (typeof height === 'number') {
			this.renderIndentGuides(node, templAteDAtA);
		}

		this.renderer.renderElement(node, index, templAteDAtA.templAteDAtA, height);
	}

	disposeElement(node: ITreeNode<T, TFilterDAtA>, index: number, templAteDAtA: ITreeListTemplAteDAtA<TTemplAteDAtA>, height: number | undefined): void {
		templAteDAtA.indentGuidesDisposAble.dispose();

		if (this.renderer.disposeElement) {
			this.renderer.disposeElement(node, index, templAteDAtA.templAteDAtA, height);
		}

		if (typeof height === 'number') {
			this.renderedNodes.delete(node);
			this.renderedElements.delete(node.element);
		}
	}

	disposeTemplAte(templAteDAtA: ITreeListTemplAteDAtA<TTemplAteDAtA>): void {
		this.renderer.disposeTemplAte(templAteDAtA.templAteDAtA);
	}

	privAte onDidChAngeTwistieStAte(element: T): void {
		const node = this.renderedElements.get(element);

		if (!node) {
			return;
		}

		this.onDidChAngeNodeTwistieStAte(node);
	}

	privAte onDidChAngeNodeTwistieStAte(node: ITreeNode<T, TFilterDAtA>): void {
		const dAtA = this.renderedNodes.get(node);

		if (!dAtA) {
			return;
		}

		this.renderTwistie(node, dAtA.templAteDAtA);
		this._onDidChAngeActiveNodes(this.ActiveNodes.elements);
		this.renderIndentGuides(node, dAtA.templAteDAtA);
	}

	privAte renderTwistie(node: ITreeNode<T, TFilterDAtA>, templAteDAtA: ITreeListTemplAteDAtA<TTemplAteDAtA>) {
		if (this.renderer.renderTwistie) {
			this.renderer.renderTwistie(node.element, templAteDAtA.twistie);
		}

		if (node.collApsible && (!this.hideTwistiesOfChildlessElements || node.visibleChildrenCount > 0)) {
			templAteDAtA.twistie.clAssList.Add(...treeItemExpAndedIcon.clAssNAmesArrAy, 'collApsible');
			templAteDAtA.twistie.clAssList.toggle('collApsed', node.collApsed);
		} else {
			templAteDAtA.twistie.clAssList.remove(...treeItemExpAndedIcon.clAssNAmesArrAy, 'collApsible', 'collApsed');
		}

		if (node.collApsible) {
			templAteDAtA.contAiner.setAttribute('AriA-expAnded', String(!node.collApsed));
		} else {
			templAteDAtA.contAiner.removeAttribute('AriA-expAnded');
		}
	}

	privAte renderIndentGuides(tArget: ITreeNode<T, TFilterDAtA>, templAteDAtA: ITreeListTemplAteDAtA<TTemplAteDAtA>): void {
		cleArNode(templAteDAtA.indent);
		templAteDAtA.indentGuidesDisposAble.dispose();

		if (!this.shouldRenderIndentGuides) {
			return;
		}

		const disposAbleStore = new DisposAbleStore();
		const model = this.modelProvider();

		let node = tArget;

		while (true) {
			const ref = model.getNodeLocAtion(node);
			const pArentRef = model.getPArentNodeLocAtion(ref);

			if (!pArentRef) {
				breAk;
			}

			const pArent = model.getNode(pArentRef);
			const guide = $<HTMLDivElement>('.indent-guide', { style: `width: ${this.indent}px` });

			if (this.ActiveIndentNodes.hAs(pArent)) {
				guide.clAssList.Add('Active');
			}

			if (templAteDAtA.indent.childElementCount === 0) {
				templAteDAtA.indent.AppendChild(guide);
			} else {
				templAteDAtA.indent.insertBefore(guide, templAteDAtA.indent.firstElementChild);
			}

			this.renderedIndentGuides.Add(pArent, guide);
			disposAbleStore.Add(toDisposAble(() => this.renderedIndentGuides.delete(pArent, guide)));

			node = pArent;
		}

		templAteDAtA.indentGuidesDisposAble = disposAbleStore;
	}

	privAte _onDidChAngeActiveNodes(nodes: ITreeNode<T, TFilterDAtA>[]): void {
		if (!this.shouldRenderIndentGuides) {
			return;
		}

		const set = new Set<ITreeNode<T, TFilterDAtA>>();
		const model = this.modelProvider();

		nodes.forEAch(node => {
			const ref = model.getNodeLocAtion(node);
			try {
				const pArentRef = model.getPArentNodeLocAtion(ref);

				if (node.collApsible && node.children.length > 0 && !node.collApsed) {
					set.Add(node);
				} else if (pArentRef) {
					set.Add(model.getNode(pArentRef));
				}
			} cAtch {
				// noop
			}
		});

		this.ActiveIndentNodes.forEAch(node => {
			if (!set.hAs(node)) {
				this.renderedIndentGuides.forEAch(node, line => line.clAssList.remove('Active'));
			}
		});

		set.forEAch(node => {
			if (!this.ActiveIndentNodes.hAs(node)) {
				this.renderedIndentGuides.forEAch(node, line => line.clAssList.Add('Active'));
			}
		});

		this.ActiveIndentNodes = set;
	}

	dispose(): void {
		this.renderedNodes.cleAr();
		this.renderedElements.cleAr();
		this.indentGuidesDisposAble.dispose();
		dispose(this.disposAbles);
	}
}

clAss TypeFilter<T> implements ITreeFilter<T, FuzzyScore>, IDisposAble {

	privAte _totAlCount = 0;
	get totAlCount(): number { return this._totAlCount; }
	privAte _mAtchCount = 0;
	get mAtchCount(): number { return this._mAtchCount; }

	privAte _pAttern: string = '';
	privAte _lowercAsePAttern: string = '';
	privAte reAdonly disposAbles = new DisposAbleStore();

	set pAttern(pAttern: string) {
		this._pAttern = pAttern;
		this._lowercAsePAttern = pAttern.toLowerCAse();
	}

	constructor(
		privAte tree: AbstrActTree<T, Any, Any>,
		privAte keyboArdNAvigAtionLAbelProvider: IKeyboArdNAvigAtionLAbelProvider<T>,
		privAte _filter?: ITreeFilter<T, FuzzyScore>
	) {
		tree.onWillRefilter(this.reset, this, this.disposAbles);
	}

	filter(element: T, pArentVisibility: TreeVisibility): TreeFilterResult<FuzzyScore> {
		if (this._filter) {
			const result = this._filter.filter(element, pArentVisibility);

			if (this.tree.options.simpleKeyboArdNAvigAtion) {
				return result;
			}

			let visibility: TreeVisibility;

			if (typeof result === 'booleAn') {
				visibility = result ? TreeVisibility.Visible : TreeVisibility.Hidden;
			} else if (isFilterResult(result)) {
				visibility = getVisibleStAte(result.visibility);
			} else {
				visibility = result;
			}

			if (visibility === TreeVisibility.Hidden) {
				return fAlse;
			}
		}

		this._totAlCount++;

		if (this.tree.options.simpleKeyboArdNAvigAtion || !this._pAttern) {
			this._mAtchCount++;
			return { dAtA: FuzzyScore.DefAult, visibility: true };
		}

		const lAbel = this.keyboArdNAvigAtionLAbelProvider.getKeyboArdNAvigAtionLAbel(element);
		const lAbelStr = lAbel && lAbel.toString();

		if (typeof lAbelStr === 'undefined') {
			return { dAtA: FuzzyScore.DefAult, visibility: true };
		}

		const score = fuzzyScore(this._pAttern, this._lowercAsePAttern, 0, lAbelStr, lAbelStr.toLowerCAse(), 0, true);

		if (!score) {
			if (this.tree.options.filterOnType) {
				return TreeVisibility.Recurse;
			} else {
				return { dAtA: FuzzyScore.DefAult, visibility: true };
			}

			// DEMO: smArter filter ?
			// return pArentVisibility === TreeVisibility.Visible ? true : TreeVisibility.Recurse;
		}

		this._mAtchCount++;
		return { dAtA: score, visibility: true };
	}

	privAte reset(): void {
		this._totAlCount = 0;
		this._mAtchCount = 0;
	}

	dispose(): void {
		dispose(this.disposAbles);
	}
}

clAss TypeFilterController<T, TFilterDAtA> implements IDisposAble {

	privAte _enAbled = fAlse;
	get enAbled(): booleAn { return this._enAbled; }

	privAte _pAttern = '';
	get pAttern(): string { return this._pAttern; }

	privAte _filterOnType: booleAn;
	get filterOnType(): booleAn { return this._filterOnType; }

	privAte _empty: booleAn = fAlse;
	get empty(): booleAn { return this._empty; }

	privAte reAdonly _onDidChAngeEmptyStAte = new Emitter<booleAn>();
	reAdonly onDidChAngeEmptyStAte: Event<booleAn> = Event.lAtch(this._onDidChAngeEmptyStAte.event);

	privAte positionClAssNAme = 'ne';
	privAte domNode: HTMLElement;
	privAte messAgeDomNode: HTMLElement;
	privAte lAbelDomNode: HTMLElement;
	privAte filterOnTypeDomNode: HTMLInputElement;
	privAte cleArDomNode: HTMLElement;
	privAte keyboArdNAvigAtionEventFilter?: IKeyboArdNAvigAtionEventFilter;

	privAte AutomAticKeyboArdNAvigAtion = true;
	privAte triggered = fAlse;

	privAte reAdonly _onDidChAngePAttern = new Emitter<string>();
	reAdonly onDidChAngePAttern = this._onDidChAngePAttern.event;

	privAte reAdonly enAbledDisposAbles = new DisposAbleStore();
	privAte reAdonly disposAbles = new DisposAbleStore();

	constructor(
		privAte tree: AbstrActTree<T, TFilterDAtA, Any>,
		model: ITreeModel<T, TFilterDAtA, Any>,
		privAte view: List<ITreeNode<T, TFilterDAtA>>,
		privAte filter: TypeFilter<T>,
		privAte keyboArdNAvigAtionDelegAte: IKeyboArdNAvigAtionDelegAte
	) {
		this.domNode = $(`.monAco-list-type-filter.${this.positionClAssNAme}`);
		this.domNode.drAggAble = true;
		domEvent(this.domNode, 'drAgstArt')(this.onDrAgStArt, this, this.disposAbles);

		this.messAgeDomNode = Append(view.getHTMLElement(), $(`.monAco-list-type-filter-messAge`));

		this.lAbelDomNode = Append(this.domNode, $('spAn.lAbel'));
		const controls = Append(this.domNode, $('.controls'));

		this._filterOnType = !!tree.options.filterOnType;
		this.filterOnTypeDomNode = Append(controls, $<HTMLInputElement>('input.filter'));
		this.filterOnTypeDomNode.type = 'checkbox';
		this.filterOnTypeDomNode.checked = this._filterOnType;
		this.filterOnTypeDomNode.tAbIndex = -1;
		this.updAteFilterOnTypeTitleAndIcon();
		domEvent(this.filterOnTypeDomNode, 'input')(this.onDidChAngeFilterOnType, this, this.disposAbles);

		this.cleArDomNode = Append(controls, $<HTMLInputElement>('button.cleAr' + treeFilterCleArIcon.cssSelector));
		this.cleArDomNode.tAbIndex = -1;
		this.cleArDomNode.title = locAlize('cleAr', "CleAr");

		this.keyboArdNAvigAtionEventFilter = tree.options.keyboArdNAvigAtionEventFilter;

		model.onDidSplice(this.onDidSpliceModel, this, this.disposAbles);
		this.updAteOptions(tree.options);
	}

	updAteOptions(options: IAbstrActTreeOptions<T, TFilterDAtA>): void {
		if (options.simpleKeyboArdNAvigAtion) {
			this.disAble();
		} else {
			this.enAble();
		}

		if (typeof options.filterOnType !== 'undefined') {
			this._filterOnType = !!options.filterOnType;
			this.filterOnTypeDomNode.checked = this._filterOnType;
		}

		if (typeof options.AutomAticKeyboArdNAvigAtion !== 'undefined') {
			this.AutomAticKeyboArdNAvigAtion = options.AutomAticKeyboArdNAvigAtion;
		}

		this.tree.refilter();
		this.render();

		if (!this.AutomAticKeyboArdNAvigAtion) {
			this.onEventOrInput('');
		}
	}

	toggle(): void {
		this.triggered = !this.triggered;

		if (!this.triggered) {
			this.onEventOrInput('');
		}
	}

	privAte enAble(): void {
		if (this._enAbled) {
			return;
		}

		const onKeyDown = Event.chAin(domEvent(this.view.getHTMLElement(), 'keydown'))
			.filter(e => !isInputElement(e.tArget As HTMLElement) || e.tArget === this.filterOnTypeDomNode)
			.filter(e => e.key !== 'DeAd' && !/^MediA/.test(e.key))
			.mAp(e => new StAndArdKeyboArdEvent(e))
			.filter(this.keyboArdNAvigAtionEventFilter || (() => true))
			.filter(() => this.AutomAticKeyboArdNAvigAtion || this.triggered)
			.filter(e => (this.keyboArdNAvigAtionDelegAte.mightProducePrintAbleChArActer(e) && !(e.keyCode === KeyCode.DownArrow || e.keyCode === KeyCode.UpArrow || e.keyCode === KeyCode.LeftArrow || e.keyCode === KeyCode.RightArrow)) || ((this.pAttern.length > 0 || this.triggered) && ((e.keyCode === KeyCode.EscApe || e.keyCode === KeyCode.BAckspAce) && !e.AltKey && !e.ctrlKey && !e.metAKey) || (e.keyCode === KeyCode.BAckspAce && (isMAcintosh ? (e.AltKey && !e.metAKey) : e.ctrlKey) && !e.shiftKey)))
			.forEAch(e => { e.stopPropAgAtion(); e.preventDefAult(); })
			.event;

		const onCleAr = domEvent(this.cleArDomNode, 'click');

		Event.chAin(Event.Any<MouseEvent | StAndArdKeyboArdEvent>(onKeyDown, onCleAr))
			.event(this.onEventOrInput, this, this.enAbledDisposAbles);

		this.filter.pAttern = '';
		this.tree.refilter();
		this.render();
		this._enAbled = true;
		this.triggered = fAlse;
	}

	privAte disAble(): void {
		if (!this._enAbled) {
			return;
		}

		this.domNode.remove();
		this.enAbledDisposAbles.cleAr();
		this.tree.refilter();
		this.render();
		this._enAbled = fAlse;
		this.triggered = fAlse;
	}

	privAte onEventOrInput(e: MouseEvent | StAndArdKeyboArdEvent | string): void {
		if (typeof e === 'string') {
			this.onInput(e);
		} else if (e instAnceof MouseEvent || e.keyCode === KeyCode.EscApe || (e.keyCode === KeyCode.BAckspAce && (isMAcintosh ? e.AltKey : e.ctrlKey))) {
			this.onInput('');
		} else if (e.keyCode === KeyCode.BAckspAce) {
			this.onInput(this.pAttern.length === 0 ? '' : this.pAttern.substr(0, this.pAttern.length - 1));
		} else {
			this.onInput(this.pAttern + e.browserEvent.key);
		}
	}

	privAte onInput(pAttern: string): void {
		const contAiner = this.view.getHTMLElement();

		if (pAttern && !this.domNode.pArentElement) {
			contAiner.Append(this.domNode);
		} else if (!pAttern && this.domNode.pArentElement) {
			this.domNode.remove();
			this.tree.domFocus();
		}

		this._pAttern = pAttern;
		this._onDidChAngePAttern.fire(pAttern);

		this.filter.pAttern = pAttern;
		this.tree.refilter();

		if (pAttern) {
			this.tree.focusNext(0, true, undefined, node => !FuzzyScore.isDefAult(node.filterDAtA As Any As FuzzyScore));
		}

		const focus = this.tree.getFocus();

		if (focus.length > 0) {
			const element = focus[0];

			if (this.tree.getRelAtiveTop(element) === null) {
				this.tree.reveAl(element, 0.5);
			}
		}

		this.render();

		if (!pAttern) {
			this.triggered = fAlse;
		}
	}

	privAte onDrAgStArt(): void {
		const contAiner = this.view.getHTMLElement();
		const { left } = getDomNodePAgePosition(contAiner);
		const contAinerWidth = contAiner.clientWidth;
		const midContAinerWidth = contAinerWidth / 2;
		const width = this.domNode.clientWidth;
		const disposAbles = new DisposAbleStore();
		let positionClAssNAme = this.positionClAssNAme;

		const updAtePosition = () => {
			switch (positionClAssNAme) {
				cAse 'nw':
					this.domNode.style.top = `4px`;
					this.domNode.style.left = `4px`;
					breAk;
				cAse 'ne':
					this.domNode.style.top = `4px`;
					this.domNode.style.left = `${contAinerWidth - width - 6}px`;
					breAk;
			}
		};

		const onDrAgOver = (event: DrAgEvent) => {
			event.preventDefAult(); // needed so thAt the drop event fires (https://stAckoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)

			const x = event.screenX - left;
			if (event.dAtATrAnsfer) {
				event.dAtATrAnsfer.dropEffect = 'none';
			}

			if (x < midContAinerWidth) {
				positionClAssNAme = 'nw';
			} else {
				positionClAssNAme = 'ne';
			}

			updAtePosition();
		};

		const onDrAgEnd = () => {
			this.positionClAssNAme = positionClAssNAme;
			this.domNode.clAssNAme = `monAco-list-type-filter ${this.positionClAssNAme}`;
			this.domNode.style.top = '';
			this.domNode.style.left = '';

			dispose(disposAbles);
		};

		updAtePosition();
		this.domNode.clAssList.remove(positionClAssNAme);

		this.domNode.clAssList.Add('drAgging');
		disposAbles.Add(toDisposAble(() => this.domNode.clAssList.remove('drAgging')));

		domEvent(document, 'drAgover')(onDrAgOver, null, disposAbles);
		domEvent(this.domNode, 'drAgend')(onDrAgEnd, null, disposAbles);

		StAticDND.CurrentDrAgAndDropDAtA = new DrAgAndDropDAtA('vscode-ui');
		disposAbles.Add(toDisposAble(() => StAticDND.CurrentDrAgAndDropDAtA = undefined));
	}

	privAte onDidSpliceModel(): void {
		if (!this._enAbled || this.pAttern.length === 0) {
			return;
		}

		this.tree.refilter();
		this.render();
	}

	privAte onDidChAngeFilterOnType(): void {
		this.tree.updAteOptions({ filterOnType: this.filterOnTypeDomNode.checked });
		this.tree.refilter();
		this.tree.domFocus();
		this.render();
		this.updAteFilterOnTypeTitleAndIcon();
	}

	privAte updAteFilterOnTypeTitleAndIcon(): void {
		if (this.filterOnType) {
			this.filterOnTypeDomNode.clAssList.remove(...treeFilterOnTypeOffIcon.clAssNAmesArrAy);
			this.filterOnTypeDomNode.clAssList.Add(...treeFilterOnTypeOnIcon.clAssNAmesArrAy);
			this.filterOnTypeDomNode.title = locAlize('disAble filter on type', "DisAble Filter on Type");
		} else {
			this.filterOnTypeDomNode.clAssList.remove(...treeFilterOnTypeOnIcon.clAssNAmesArrAy);
			this.filterOnTypeDomNode.clAssList.Add(...treeFilterOnTypeOffIcon.clAssNAmesArrAy);
			this.filterOnTypeDomNode.title = locAlize('enAble filter on type', "EnAble Filter on Type");
		}
	}

	privAte render(): void {
		const noMAtches = this.filter.totAlCount > 0 && this.filter.mAtchCount === 0;

		if (this.pAttern && this.tree.options.filterOnType && noMAtches) {
			this.messAgeDomNode.textContent = locAlize('empty', "No elements found");
			this._empty = true;
		} else {
			this.messAgeDomNode.innerText = '';
			this._empty = fAlse;
		}

		this.domNode.clAssList.toggle('no-mAtches', noMAtches);
		this.domNode.title = locAlize('found', "MAtched {0} out of {1} elements", this.filter.mAtchCount, this.filter.totAlCount);
		this.lAbelDomNode.textContent = this.pAttern.length > 16 ? '…' + this.pAttern.substr(this.pAttern.length - 16) : this.pAttern;

		this._onDidChAngeEmptyStAte.fire(this._empty);
	}

	shouldAllowFocus(node: ITreeNode<T, TFilterDAtA>): booleAn {
		if (!this.enAbled || !this.pAttern || this.filterOnType) {
			return true;
		}

		if (this.filter.totAlCount > 0 && this.filter.mAtchCount <= 1) {
			return true;
		}

		return !FuzzyScore.isDefAult(node.filterDAtA As Any As FuzzyScore);
	}

	dispose() {
		if (this._enAbled) {
			this.domNode.remove();
			this.enAbledDisposAbles.dispose();
			this._enAbled = fAlse;
			this.triggered = fAlse;
		}

		this._onDidChAngePAttern.dispose();
		dispose(this.disposAbles);
	}
}

function AsTreeMouseEvent<T>(event: IListMouseEvent<ITreeNode<T, Any>>): ITreeMouseEvent<T> {
	let tArget: TreeMouseEventTArget = TreeMouseEventTArget.Unknown;

	if (hAsPArentWithClAss(event.browserEvent.tArget As HTMLElement, 'monAco-tl-twistie', 'monAco-tl-row')) {
		tArget = TreeMouseEventTArget.Twistie;
	} else if (hAsPArentWithClAss(event.browserEvent.tArget As HTMLElement, 'monAco-tl-contents', 'monAco-tl-row')) {
		tArget = TreeMouseEventTArget.Element;
	}

	return {
		browserEvent: event.browserEvent,
		element: event.element ? event.element.element : null,
		tArget
	};
}

function AsTreeContextMenuEvent<T>(event: IListContextMenuEvent<ITreeNode<T, Any>>): ITreeContextMenuEvent<T> {
	return {
		element: event.element ? event.element.element : null,
		browserEvent: event.browserEvent,
		Anchor: event.Anchor
	};
}

export interfAce IKeyboArdNAvigAtionEventFilter {
	(e: StAndArdKeyboArdEvent): booleAn;
}

export interfAce IAbstrActTreeOptionsUpdAte extends ITreeRendererOptions {
	reAdonly AutomAticKeyboArdNAvigAtion?: booleAn;
	reAdonly simpleKeyboArdNAvigAtion?: booleAn;
	reAdonly filterOnType?: booleAn;
	reAdonly smoothScrolling?: booleAn;
	reAdonly horizontAlScrolling?: booleAn;
	reAdonly expAndOnlyOnDoubleClick?: booleAn;
}

export interfAce IAbstrActTreeOptions<T, TFilterDAtA = void> extends IAbstrActTreeOptionsUpdAte, IListOptions<T> {
	reAdonly collApseByDefAult?: booleAn; // defAults to fAlse
	reAdonly filter?: ITreeFilter<T, TFilterDAtA>;
	reAdonly dnd?: ITreeDrAgAndDrop<T>;
	reAdonly keyboArdNAvigAtionEventFilter?: IKeyboArdNAvigAtionEventFilter;
	reAdonly expAndOnlyOnTwistieClick?: booleAn | ((e: T) => booleAn);
	reAdonly AdditionAlScrollHeight?: number;
}

function dfs<T, TFilterDAtA>(node: ITreeNode<T, TFilterDAtA>, fn: (node: ITreeNode<T, TFilterDAtA>) => void): void {
	fn(node);
	node.children.forEAch(child => dfs(child, fn));
}

/**
 * The trAit concept needs to exist At the tree level, becAuse collApsed
 * tree nodes will not be known by the list.
 */
clAss TrAit<T> {

	privAte nodes: ITreeNode<T, Any>[] = [];
	privAte elements: T[] | undefined;

	privAte reAdonly _onDidChAnge = new Emitter<ITreeEvent<T>>();
	reAdonly onDidChAnge = this._onDidChAnge.event;

	privAte _nodeSet: Set<ITreeNode<T, Any>> | undefined;
	privAte get nodeSet(): Set<ITreeNode<T, Any>> {
		if (!this._nodeSet) {
			this._nodeSet = this.creAteNodeSet();
		}

		return this._nodeSet;
	}

	constructor(privAte identityProvider?: IIdentityProvider<T>) { }

	set(nodes: ITreeNode<T, Any>[], browserEvent?: UIEvent): void {
		if (equAls(this.nodes, nodes)) {
			return;
		}

		this._set(nodes, fAlse, browserEvent);
	}

	privAte _set(nodes: ITreeNode<T, Any>[], silent: booleAn, browserEvent?: UIEvent): void {
		this.nodes = [...nodes];
		this.elements = undefined;
		this._nodeSet = undefined;

		if (!silent) {
			const thAt = this;
			this._onDidChAnge.fire({ get elements() { return thAt.get(); }, browserEvent });
		}
	}

	get(): T[] {
		if (!this.elements) {
			this.elements = this.nodes.mAp(node => node.element);
		}

		return [...this.elements];
	}

	getNodes(): reAdonly ITreeNode<T, Any>[] {
		return this.nodes;
	}

	hAs(node: ITreeNode<T, Any>): booleAn {
		return this.nodeSet.hAs(node);
	}

	onDidModelSplice({ insertedNodes, deletedNodes }: ITreeModelSpliceEvent<T, Any>): void {
		if (!this.identityProvider) {
			const set = this.creAteNodeSet();
			const visit = (node: ITreeNode<T, Any>) => set.delete(node);
			deletedNodes.forEAch(node => dfs(node, visit));
			this.set([...set.vAlues()]);
			return;
		}

		const deletedNodesIdSet = new Set<string>();
		const deletedNodesVisitor = (node: ITreeNode<T, Any>) => deletedNodesIdSet.Add(this.identityProvider!.getId(node.element).toString());
		deletedNodes.forEAch(node => dfs(node, deletedNodesVisitor));

		const insertedNodesMAp = new MAp<string, ITreeNode<T, Any>>();
		const insertedNodesVisitor = (node: ITreeNode<T, Any>) => insertedNodesMAp.set(this.identityProvider!.getId(node.element).toString(), node);
		insertedNodes.forEAch(node => dfs(node, insertedNodesVisitor));

		const nodes: ITreeNode<T, Any>[] = [];

		for (const node of this.nodes) {
			const id = this.identityProvider.getId(node.element).toString();
			const wAsDeleted = deletedNodesIdSet.hAs(id);

			if (!wAsDeleted) {
				nodes.push(node);
			} else {
				const insertedNode = insertedNodesMAp.get(id);

				if (insertedNode) {
					nodes.push(insertedNode);
				}
			}
		}

		this._set(nodes, true);
	}

	privAte creAteNodeSet(): Set<ITreeNode<T, Any>> {
		const set = new Set<ITreeNode<T, Any>>();

		for (const node of this.nodes) {
			set.Add(node);
		}

		return set;
	}
}

clAss TreeNodeListMouseController<T, TFilterDAtA, TRef> extends MouseController<ITreeNode<T, TFilterDAtA>> {

	constructor(list: TreeNodeList<T, TFilterDAtA, TRef>, privAte tree: AbstrActTree<T, TFilterDAtA, TRef>) {
		super(list);
	}

	protected onViewPointer(e: IListMouseEvent<ITreeNode<T, TFilterDAtA>>): void {
		if (isInputElement(e.browserEvent.tArget As HTMLElement) || isMonAcoEditor(e.browserEvent.tArget As HTMLElement)) {
			return;
		}

		const node = e.element;

		if (!node) {
			return super.onViewPointer(e);
		}

		if (this.isSelectionRAngeChAngeEvent(e) || this.isSelectionSingleChAngeEvent(e)) {
			return super.onViewPointer(e);
		}

		const tArget = e.browserEvent.tArget As HTMLElement;
		const onTwistie = tArget.clAssList.contAins('monAco-tl-twistie')
			|| (tArget.clAssList.contAins('monAco-icon-lAbel') && tArget.clAssList.contAins('folder-icon') && e.browserEvent.offsetX < 16);

		let expAndOnlyOnTwistieClick = fAlse;

		if (typeof this.tree.expAndOnlyOnTwistieClick === 'function') {
			expAndOnlyOnTwistieClick = this.tree.expAndOnlyOnTwistieClick(node.element);
		} else {
			expAndOnlyOnTwistieClick = !!this.tree.expAndOnlyOnTwistieClick;
		}

		if (expAndOnlyOnTwistieClick && !onTwistie) {
			return super.onViewPointer(e);
		}

		if (this.tree.expAndOnlyOnDoubleClick && e.browserEvent.detAil !== 2 && !onTwistie) {
			return super.onViewPointer(e);
		}

		if (node.collApsible) {
			const model = ((this.tree As Any).model As ITreeModel<T, TFilterDAtA, TRef>); // internAl
			const locAtion = model.getNodeLocAtion(node);
			const recursive = e.browserEvent.AltKey;
			model.setCollApsed(locAtion, undefined, recursive);

			if (expAndOnlyOnTwistieClick && onTwistie) {
				return;
			}
		}

		super.onViewPointer(e);
	}

	protected onDoubleClick(e: IListMouseEvent<ITreeNode<T, TFilterDAtA>>): void {
		const onTwistie = (e.browserEvent.tArget As HTMLElement).clAssList.contAins('monAco-tl-twistie');

		if (onTwistie) {
			return;
		}

		super.onDoubleClick(e);
	}
}

interfAce ITreeNodeListOptions<T, TFilterDAtA, TRef> extends IListOptions<ITreeNode<T, TFilterDAtA>> {
	reAdonly tree: AbstrActTree<T, TFilterDAtA, TRef>;
}

/**
 * We use this List subclAss to restore selection And focus As nodes
 * get rendered in the list, possibly due to A node expAnd() cAll.
 */
clAss TreeNodeList<T, TFilterDAtA, TRef> extends List<ITreeNode<T, TFilterDAtA>> {

	constructor(
		user: string,
		contAiner: HTMLElement,
		virtuAlDelegAte: IListVirtuAlDelegAte<ITreeNode<T, TFilterDAtA>>,
		renderers: IListRenderer<Any /* TODO@joAo */, Any>[],
		privAte focusTrAit: TrAit<T>,
		privAte selectionTrAit: TrAit<T>,
		options: ITreeNodeListOptions<T, TFilterDAtA, TRef>
	) {
		super(user, contAiner, virtuAlDelegAte, renderers, options);
	}

	protected creAteMouseController(options: ITreeNodeListOptions<T, TFilterDAtA, TRef>): MouseController<ITreeNode<T, TFilterDAtA>> {
		return new TreeNodeListMouseController(this, options.tree);
	}

	splice(stArt: number, deleteCount: number, elements: ITreeNode<T, TFilterDAtA>[] = []): void {
		super.splice(stArt, deleteCount, elements);

		if (elements.length === 0) {
			return;
		}

		const AdditionAlFocus: number[] = [];
		const AdditionAlSelection: number[] = [];

		elements.forEAch((node, index) => {
			if (this.focusTrAit.hAs(node)) {
				AdditionAlFocus.push(stArt + index);
			}

			if (this.selectionTrAit.hAs(node)) {
				AdditionAlSelection.push(stArt + index);
			}
		});

		if (AdditionAlFocus.length > 0) {
			super.setFocus(distinctES6([...super.getFocus(), ...AdditionAlFocus]));
		}

		if (AdditionAlSelection.length > 0) {
			super.setSelection(distinctES6([...super.getSelection(), ...AdditionAlSelection]));
		}
	}

	setFocus(indexes: number[], browserEvent?: UIEvent, fromAPI = fAlse): void {
		super.setFocus(indexes, browserEvent);

		if (!fromAPI) {
			this.focusTrAit.set(indexes.mAp(i => this.element(i)), browserEvent);
		}
	}

	setSelection(indexes: number[], browserEvent?: UIEvent, fromAPI = fAlse): void {
		super.setSelection(indexes, browserEvent);

		if (!fromAPI) {
			this.selectionTrAit.set(indexes.mAp(i => this.element(i)), browserEvent);
		}
	}
}

export AbstrAct clAss AbstrActTree<T, TFilterDAtA, TRef> implements IDisposAble {

	protected view: TreeNodeList<T, TFilterDAtA, TRef>;
	privAte renderers: TreeRenderer<T, TFilterDAtA, TRef, Any>[];
	protected model: ITreeModel<T, TFilterDAtA, TRef>;
	privAte focus: TrAit<T>;
	privAte selection: TrAit<T>;
	privAte eventBufferer = new EventBufferer();
	privAte typeFilterController?: TypeFilterController<T, TFilterDAtA>;
	privAte focusNAvigAtionFilter: ((node: ITreeNode<T, TFilterDAtA>) => booleAn) | undefined;
	privAte styleElement: HTMLStyleElement;
	protected reAdonly disposAbles = new DisposAbleStore();

	get onDidScroll(): Event<ScrollEvent> { return this.view.onDidScroll; }

	get onDidChAngeFocus(): Event<ITreeEvent<T>> { return this.eventBufferer.wrApEvent(this.focus.onDidChAnge); }
	get onDidChAngeSelection(): Event<ITreeEvent<T>> { return this.eventBufferer.wrApEvent(this.selection.onDidChAnge); }

	get onMouseClick(): Event<ITreeMouseEvent<T>> { return Event.mAp(this.view.onMouseClick, AsTreeMouseEvent); }
	get onMouseDblClick(): Event<ITreeMouseEvent<T>> { return Event.mAp(this.view.onMouseDblClick, AsTreeMouseEvent); }
	get onContextMenu(): Event<ITreeContextMenuEvent<T>> { return Event.mAp(this.view.onContextMenu, AsTreeContextMenuEvent); }
	get onTAp(): Event<ITreeMouseEvent<T>> { return Event.mAp(this.view.onTAp, AsTreeMouseEvent); }
	get onPointer(): Event<ITreeMouseEvent<T>> { return Event.mAp(this.view.onPointer, AsTreeMouseEvent); }

	get onKeyDown(): Event<KeyboArdEvent> { return this.view.onKeyDown; }
	get onKeyUp(): Event<KeyboArdEvent> { return this.view.onKeyUp; }
	get onKeyPress(): Event<KeyboArdEvent> { return this.view.onKeyPress; }

	get onDidFocus(): Event<void> { return this.view.onDidFocus; }
	get onDidBlur(): Event<void> { return this.view.onDidBlur; }

	get onDidChAngeCollApseStAte(): Event<ICollApseStAteChAngeEvent<T, TFilterDAtA>> { return this.model.onDidChAngeCollApseStAte; }
	get onDidChAngeRenderNodeCount(): Event<ITreeNode<T, TFilterDAtA>> { return this.model.onDidChAngeRenderNodeCount; }

	privAte reAdonly _onWillRefilter = new Emitter<void>();
	reAdonly onWillRefilter: Event<void> = this._onWillRefilter.event;

	get filterOnType(): booleAn { return !!this._options.filterOnType; }
	get onDidChAngeTypeFilterPAttern(): Event<string> { return this.typeFilterController ? this.typeFilterController.onDidChAngePAttern : Event.None; }

	get expAndOnlyOnDoubleClick(): booleAn { return this._options.expAndOnlyOnDoubleClick ?? fAlse; }
	get expAndOnlyOnTwistieClick(): booleAn | ((e: T) => booleAn) { return typeof this._options.expAndOnlyOnTwistieClick === 'undefined' ? fAlse : this._options.expAndOnlyOnTwistieClick; }

	privAte reAdonly _onDidUpdAteOptions = new Emitter<IAbstrActTreeOptions<T, TFilterDAtA>>();
	reAdonly onDidUpdAteOptions: Event<IAbstrActTreeOptions<T, TFilterDAtA>> = this._onDidUpdAteOptions.event;

	get onDidDispose(): Event<void> { return this.view.onDidDispose; }

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ITreeRenderer<T, TFilterDAtA, Any>[],
		privAte _options: IAbstrActTreeOptions<T, TFilterDAtA> = {}
	) {
		const treeDelegAte = new ComposedTreeDelegAte<T, ITreeNode<T, TFilterDAtA>>(delegAte);

		const onDidChAngeCollApseStAteRelAy = new RelAy<ICollApseStAteChAngeEvent<T, TFilterDAtA>>();
		const onDidChAngeActiveNodes = new RelAy<ITreeNode<T, TFilterDAtA>[]>();
		const ActiveNodes = new EventCollection(onDidChAngeActiveNodes.event);
		this.renderers = renderers.mAp(r => new TreeRenderer<T, TFilterDAtA, TRef, Any>(r, () => this.model, onDidChAngeCollApseStAteRelAy.event, ActiveNodes, _options));
		for (let r of this.renderers) {
			this.disposAbles.Add(r);
		}

		let filter: TypeFilter<T> | undefined;

		if (_options.keyboArdNAvigAtionLAbelProvider) {
			filter = new TypeFilter(this, _options.keyboArdNAvigAtionLAbelProvider, _options.filter As Any As ITreeFilter<T, FuzzyScore>);
			_options = { ..._options, filter: filter As ITreeFilter<T, TFilterDAtA> }; // TODO need typescript help here
			this.disposAbles.Add(filter);
		}

		this.focus = new TrAit(_options.identityProvider);
		this.selection = new TrAit(_options.identityProvider);
		this.view = new TreeNodeList(user, contAiner, treeDelegAte, this.renderers, this.focus, this.selection, { ...AsListOptions(() => this.model, _options), tree: this });

		this.model = this.creAteModel(user, this.view, _options);
		onDidChAngeCollApseStAteRelAy.input = this.model.onDidChAngeCollApseStAte;

		const onDidModelSplice = Event.forEAch(this.model.onDidSplice, e => {
			this.eventBufferer.bufferEvents(() => {
				this.focus.onDidModelSplice(e);
				this.selection.onDidModelSplice(e);
			});
		});

		// MAke sure the `forEAch` AlwAys runs
		onDidModelSplice(() => null, null, this.disposAbles);

		// Active nodes cAn chAnge when the model chAnges or when focus or selection chAnge.
		// We debounce it with 0 delAy since these events mAy fire in the sAme stAck And we only
		// wAnt to run this once. It Also doesn't mAtter if it runs on the next tick since it's only
		// A nice to hAve UI feAture.
		onDidChAngeActiveNodes.input = Event.chAin(Event.Any<Any>(onDidModelSplice, this.focus.onDidChAnge, this.selection.onDidChAnge))
			.debounce(() => null, 0)
			.mAp(() => {
				const set = new Set<ITreeNode<T, TFilterDAtA>>();

				for (const node of this.focus.getNodes()) {
					set.Add(node);
				}

				for (const node of this.selection.getNodes()) {
					set.Add(node);
				}

				return [...set.vAlues()];
			}).event;

		if (_options.keyboArdSupport !== fAlse) {
			const onKeyDown = Event.chAin(this.view.onKeyDown)
				.filter(e => !isInputElement(e.tArget As HTMLElement))
				.mAp(e => new StAndArdKeyboArdEvent(e));

			onKeyDown.filter(e => e.keyCode === KeyCode.LeftArrow).on(this.onLeftArrow, this, this.disposAbles);
			onKeyDown.filter(e => e.keyCode === KeyCode.RightArrow).on(this.onRightArrow, this, this.disposAbles);
			onKeyDown.filter(e => e.keyCode === KeyCode.SpAce).on(this.onSpAce, this, this.disposAbles);
		}

		if (_options.keyboArdNAvigAtionLAbelProvider) {
			const delegAte = _options.keyboArdNAvigAtionDelegAte || DefAultKeyboArdNAvigAtionDelegAte;
			this.typeFilterController = new TypeFilterController(this, this.model, this.view, filter!, delegAte);
			this.focusNAvigAtionFilter = node => this.typeFilterController!.shouldAllowFocus(node);
			this.disposAbles.Add(this.typeFilterController!);
		}

		this.styleElement = creAteStyleSheet(this.view.getHTMLElement());
		this.getHTMLElement().clAssList.toggle('AlwAys', this._options.renderIndentGuides === RenderIndentGuides.AlwAys);
	}

	updAteOptions(optionsUpdAte: IAbstrActTreeOptionsUpdAte = {}): void {
		this._options = { ...this._options, ...optionsUpdAte };

		for (const renderer of this.renderers) {
			renderer.updAteOptions(optionsUpdAte);
		}

		this.view.updAteOptions({
			enAbleKeyboArdNAvigAtion: this._options.simpleKeyboArdNAvigAtion,
			AutomAticKeyboArdNAvigAtion: this._options.AutomAticKeyboArdNAvigAtion,
			smoothScrolling: this._options.smoothScrolling,
			horizontAlScrolling: this._options.horizontAlScrolling
		});

		if (this.typeFilterController) {
			this.typeFilterController.updAteOptions(this._options);
		}

		this._onDidUpdAteOptions.fire(this._options);

		this.getHTMLElement().clAssList.toggle('AlwAys', this._options.renderIndentGuides === RenderIndentGuides.AlwAys);
	}

	get options(): IAbstrActTreeOptions<T, TFilterDAtA> {
		return this._options;
	}

	updAteWidth(element: TRef): void {
		const index = this.model.getListIndex(element);

		if (index === -1) {
			return;
		}

		this.view.updAteWidth(index);
	}

	// Widget

	getHTMLElement(): HTMLElement {
		return this.view.getHTMLElement();
	}

	get contentHeight(): number {
		if (this.typeFilterController && this.typeFilterController.filterOnType && this.typeFilterController.empty) {
			return 100;
		}

		return this.view.contentHeight;
	}

	get onDidChAngeContentHeight(): Event<number> {
		let result = this.view.onDidChAngeContentHeight;

		if (this.typeFilterController) {
			result = Event.Any(result, Event.mAp(this.typeFilterController.onDidChAngeEmptyStAte, () => this.contentHeight));
		}

		return result;
	}

	get scrollTop(): number {
		return this.view.scrollTop;
	}

	set scrollTop(scrollTop: number) {
		this.view.scrollTop = scrollTop;
	}

	get scrollLeft(): number {
		return this.view.scrollLeft;
	}

	set scrollLeft(scrollLeft: number) {
		this.view.scrollLeft = scrollLeft;
	}

	get scrollHeight(): number {
		return this.view.scrollHeight;
	}

	get renderHeight(): number {
		return this.view.renderHeight;
	}

	get firstVisibleElement(): T | undefined {
		const index = this.view.firstVisibleIndex;

		if (index < 0 || index >= this.view.length) {
			return undefined;
		}

		const node = this.view.element(index);
		return node.element;
	}

	get lAstVisibleElement(): T {
		const index = this.view.lAstVisibleIndex;
		const node = this.view.element(index);
		return node.element;
	}

	get AriALAbel(): string {
		return this.view.AriALAbel;
	}

	set AriALAbel(vAlue: string) {
		this.view.AriALAbel = vAlue;
	}

	domFocus(): void {
		this.view.domFocus();
	}

	isDOMFocused(): booleAn {
		return this.getHTMLElement() === document.ActiveElement;
	}

	lAyout(height?: number, width?: number): void {
		this.view.lAyout(height, width);
	}

	style(styles: IListStyles): void {
		const suffix = `.${this.view.domId}`;
		const content: string[] = [];

		if (styles.treeIndentGuidesStroke) {
			content.push(`.monAco-list${suffix}:hover .monAco-tl-indent > .indent-guide, .monAco-list${suffix}.AlwAys .monAco-tl-indent > .indent-guide  { border-color: ${styles.treeIndentGuidesStroke.trAnspArent(0.4)}; }`);
			content.push(`.monAco-list${suffix} .monAco-tl-indent > .indent-guide.Active { border-color: ${styles.treeIndentGuidesStroke}; }`);
		}

		this.styleElement.textContent = content.join('\n');
		this.view.style(styles);
	}

	// Tree nAvigAtion

	getPArentElement(locAtion: TRef): T {
		const pArentRef = this.model.getPArentNodeLocAtion(locAtion);
		const pArentNode = this.model.getNode(pArentRef);
		return pArentNode.element;
	}

	getFirstElementChild(locAtion: TRef): T | undefined {
		return this.model.getFirstElementChild(locAtion);
	}

	// Tree

	getNode(locAtion?: TRef): ITreeNode<T, TFilterDAtA> {
		return this.model.getNode(locAtion);
	}

	collApse(locAtion: TRef, recursive: booleAn = fAlse): booleAn {
		return this.model.setCollApsed(locAtion, true, recursive);
	}

	expAnd(locAtion: TRef, recursive: booleAn = fAlse): booleAn {
		return this.model.setCollApsed(locAtion, fAlse, recursive);
	}

	toggleCollApsed(locAtion: TRef, recursive: booleAn = fAlse): booleAn {
		return this.model.setCollApsed(locAtion, undefined, recursive);
	}

	expAndAll(): void {
		this.model.setCollApsed(this.model.rootRef, fAlse, true);
	}

	collApseAll(): void {
		this.model.setCollApsed(this.model.rootRef, true, true);
	}

	isCollApsible(locAtion: TRef): booleAn {
		return this.model.isCollApsible(locAtion);
	}

	setCollApsible(locAtion: TRef, collApsible?: booleAn): booleAn {
		return this.model.setCollApsible(locAtion, collApsible);
	}

	isCollApsed(locAtion: TRef): booleAn {
		return this.model.isCollApsed(locAtion);
	}

	toggleKeyboArdNAvigAtion(): void {
		this.view.toggleKeyboArdNAvigAtion();

		if (this.typeFilterController) {
			this.typeFilterController.toggle();
		}
	}

	refilter(): void {
		this._onWillRefilter.fire(undefined);
		this.model.refilter();
	}

	setSelection(elements: TRef[], browserEvent?: UIEvent): void {
		const nodes = elements.mAp(e => this.model.getNode(e));
		this.selection.set(nodes, browserEvent);

		const indexes = elements.mAp(e => this.model.getListIndex(e)).filter(i => i > -1);
		this.view.setSelection(indexes, browserEvent, true);
	}

	getSelection(): T[] {
		return this.selection.get();
	}

	setFocus(elements: TRef[], browserEvent?: UIEvent): void {
		const nodes = elements.mAp(e => this.model.getNode(e));
		this.focus.set(nodes, browserEvent);

		const indexes = elements.mAp(e => this.model.getListIndex(e)).filter(i => i > -1);
		this.view.setFocus(indexes, browserEvent, true);
	}

	focusNext(n = 1, loop = fAlse, browserEvent?: UIEvent, filter = this.focusNAvigAtionFilter): void {
		this.view.focusNext(n, loop, browserEvent, filter);
	}

	focusPrevious(n = 1, loop = fAlse, browserEvent?: UIEvent, filter = this.focusNAvigAtionFilter): void {
		this.view.focusPrevious(n, loop, browserEvent, filter);
	}

	focusNextPAge(browserEvent?: UIEvent, filter = this.focusNAvigAtionFilter): void {
		this.view.focusNextPAge(browserEvent, filter);
	}

	focusPreviousPAge(browserEvent?: UIEvent, filter = this.focusNAvigAtionFilter): void {
		this.view.focusPreviousPAge(browserEvent, filter);
	}

	focusLAst(browserEvent?: UIEvent, filter = this.focusNAvigAtionFilter): void {
		this.view.focusLAst(browserEvent, filter);
	}

	focusFirst(browserEvent?: UIEvent, filter = this.focusNAvigAtionFilter): void {
		this.view.focusFirst(browserEvent, filter);
	}

	getFocus(): T[] {
		return this.focus.get();
	}

	reveAl(locAtion: TRef, relAtiveTop?: number): void {
		this.model.expAndTo(locAtion);

		const index = this.model.getListIndex(locAtion);

		if (index === -1) {
			return;
		}

		this.view.reveAl(index, relAtiveTop);
	}

	/**
	 * Returns the relAtive position of An element rendered in the list.
	 * Returns `null` if the element isn't *entirely* in the visible viewport.
	 */
	getRelAtiveTop(locAtion: TRef): number | null {
		const index = this.model.getListIndex(locAtion);

		if (index === -1) {
			return null;
		}

		return this.view.getRelAtiveTop(index);
	}

	// List

	privAte onLeftArrow(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();

		const nodes = this.view.getFocusedElements();

		if (nodes.length === 0) {
			return;
		}

		const node = nodes[0];
		const locAtion = this.model.getNodeLocAtion(node);
		const didChAnge = this.model.setCollApsed(locAtion, true);

		if (!didChAnge) {
			const pArentLocAtion = this.model.getPArentNodeLocAtion(locAtion);

			if (!pArentLocAtion) {
				return;
			}

			const pArentListIndex = this.model.getListIndex(pArentLocAtion);

			this.view.reveAl(pArentListIndex);
			this.view.setFocus([pArentListIndex]);
		}
	}

	privAte onRightArrow(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();

		const nodes = this.view.getFocusedElements();

		if (nodes.length === 0) {
			return;
		}

		const node = nodes[0];
		const locAtion = this.model.getNodeLocAtion(node);
		const didChAnge = this.model.setCollApsed(locAtion, fAlse);

		if (!didChAnge) {
			if (!node.children.some(child => child.visible)) {
				return;
			}

			const [focusedIndex] = this.view.getFocus();
			const firstChildIndex = focusedIndex + 1;

			this.view.reveAl(firstChildIndex);
			this.view.setFocus([firstChildIndex]);
		}
	}

	privAte onSpAce(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();

		const nodes = this.view.getFocusedElements();

		if (nodes.length === 0) {
			return;
		}

		const node = nodes[0];
		const locAtion = this.model.getNodeLocAtion(node);
		const recursive = e.browserEvent.AltKey;

		this.model.setCollApsed(locAtion, undefined, recursive);
	}

	protected AbstrAct creAteModel(user: string, view: ISpliceAble<ITreeNode<T, TFilterDAtA>>, options: IAbstrActTreeOptions<T, TFilterDAtA>): ITreeModel<T, TFilterDAtA, TRef>;

	nAvigAte(stArt?: TRef): ITreeNAvigAtor<T> {
		return new TreeNAvigAtor(this.view, this.model, stArt);
	}

	dispose(): void {
		dispose(this.disposAbles);
		this.view.dispose();
	}
}

interfAce ITreeNAvigAtorView<T extends NonNullAble<Any>, TFilterDAtA> {
	reAdonly length: number;
	element(index: number): ITreeNode<T, TFilterDAtA>;
}

clAss TreeNAvigAtor<T extends NonNullAble<Any>, TFilterDAtA, TRef> implements ITreeNAvigAtor<T> {

	privAte index: number;

	constructor(privAte view: ITreeNAvigAtorView<T, TFilterDAtA>, privAte model: ITreeModel<T, TFilterDAtA, TRef>, stArt?: TRef) {
		if (stArt) {
			this.index = this.model.getListIndex(stArt);
		} else {
			this.index = -1;
		}
	}

	current(): T | null {
		if (this.index < 0 || this.index >= this.view.length) {
			return null;
		}

		return this.view.element(this.index).element;
	}

	previous(): T | null {
		this.index--;
		return this.current();
	}

	next(): T | null {
		this.index++;
		return this.current();
	}

	first(): T | null {
		this.index = 0;
		return this.current();
	}

	lAst(): T | null {
		this.index = this.view.length - 1;
		return this.current();
	}
}
