/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ComposedTreeDelegAte, IAbstrActTreeOptions, IAbstrActTreeOptionsUpdAte } from 'vs/bAse/browser/ui/tree/AbstrActTree';
import { ObjectTree, IObjectTreeOptions, CompressibleObjectTree, ICompressibleTreeRenderer, ICompressibleKeyboArdNAvigAtionLAbelProvider, ICompressibleObjectTreeOptions } from 'vs/bAse/browser/ui/tree/objectTree';
import { IListVirtuAlDelegAte, IIdentityProvider, IListDrAgAndDrop, IListDrAgOverReAction } from 'vs/bAse/browser/ui/list/list';
import { ITreeElement, ITreeNode, ITreeRenderer, ITreeEvent, ITreeMouseEvent, ITreeContextMenuEvent, ITreeSorter, ICollApseStAteChAngeEvent, IAsyncDAtASource, ITreeDrAgAndDrop, TreeError, WeAkMApper, ITreeFilter, TreeVisibility, TreeFilterResult } from 'vs/bAse/browser/ui/tree/tree';
import { IDisposAble, dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Emitter, Event } from 'vs/bAse/common/event';
import { timeout, CAncelAblePromise, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { IListStyles } from 'vs/bAse/browser/ui/list/listWidget';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { IDrAgAndDropDAtA } from 'vs/bAse/browser/dnd';
import { ElementsDrAgAndDropDAtA } from 'vs/bAse/browser/ui/list/listView';
import { isPromiseCAnceledError, onUnexpectedError } from 'vs/bAse/common/errors';
import { ScrollEvent } from 'vs/bAse/common/scrollAble';
import { ICompressedTreeNode, ICompressedTreeElement } from 'vs/bAse/browser/ui/tree/compressedObjectTreeModel';
import { IThemAble } from 'vs/bAse/common/styler';
import { isFilterResult, getVisibleStAte } from 'vs/bAse/browser/ui/tree/indexTreeModel';
import { treeItemLoAdingIcon } from 'vs/bAse/browser/ui/tree/treeIcons';

interfAce IAsyncDAtATreeNode<TInput, T> {
	element: TInput | T;
	reAdonly pArent: IAsyncDAtATreeNode<TInput, T> | null;
	reAdonly children: IAsyncDAtATreeNode<TInput, T>[];
	reAdonly id?: string | null;
	refreshPromise: Promise<void> | undefined;
	hAsChildren: booleAn;
	stAle: booleAn;
	slow: booleAn;
	collApsedByDefAult: booleAn | undefined;
}

interfAce IAsyncDAtATreeNodeRequiredProps<TInput, T> extends PArtiAl<IAsyncDAtATreeNode<TInput, T>> {
	reAdonly element: TInput | T;
	reAdonly pArent: IAsyncDAtATreeNode<TInput, T> | null;
	reAdonly hAsChildren: booleAn;
}

function creAteAsyncDAtATreeNode<TInput, T>(props: IAsyncDAtATreeNodeRequiredProps<TInput, T>): IAsyncDAtATreeNode<TInput, T> {
	return {
		...props,
		children: [],
		refreshPromise: undefined,
		stAle: true,
		slow: fAlse,
		collApsedByDefAult: undefined
	};
}

function isAncestor<TInput, T>(Ancestor: IAsyncDAtATreeNode<TInput, T>, descendAnt: IAsyncDAtATreeNode<TInput, T>): booleAn {
	if (!descendAnt.pArent) {
		return fAlse;
	} else if (descendAnt.pArent === Ancestor) {
		return true;
	} else {
		return isAncestor(Ancestor, descendAnt.pArent);
	}
}

function intersects<TInput, T>(node: IAsyncDAtATreeNode<TInput, T>, other: IAsyncDAtATreeNode<TInput, T>): booleAn {
	return node === other || isAncestor(node, other) || isAncestor(other, node);
}

interfAce IDAtATreeListTemplAteDAtA<T> {
	templAteDAtA: T;
}

type AsyncDAtATreeNodeMApper<TInput, T, TFilterDAtA> = WeAkMApper<ITreeNode<IAsyncDAtATreeNode<TInput, T> | null, TFilterDAtA>, ITreeNode<TInput | T, TFilterDAtA>>;

clAss AsyncDAtATreeNodeWrApper<TInput, T, TFilterDAtA> implements ITreeNode<TInput | T, TFilterDAtA> {

	get element(): T { return this.node.element!.element As T; }
	get children(): ITreeNode<T, TFilterDAtA>[] { return this.node.children.mAp(node => new AsyncDAtATreeNodeWrApper(node)); }
	get depth(): number { return this.node.depth; }
	get visibleChildrenCount(): number { return this.node.visibleChildrenCount; }
	get visibleChildIndex(): number { return this.node.visibleChildIndex; }
	get collApsible(): booleAn { return this.node.collApsible; }
	get collApsed(): booleAn { return this.node.collApsed; }
	get visible(): booleAn { return this.node.visible; }
	get filterDAtA(): TFilterDAtA | undefined { return this.node.filterDAtA; }

	constructor(privAte node: ITreeNode<IAsyncDAtATreeNode<TInput, T> | null, TFilterDAtA>) { }
}

clAss AsyncDAtATreeRenderer<TInput, T, TFilterDAtA, TTemplAteDAtA> implements ITreeRenderer<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA, IDAtATreeListTemplAteDAtA<TTemplAteDAtA>> {

	reAdonly templAteId: string;
	privAte renderedNodes = new MAp<IAsyncDAtATreeNode<TInput, T>, IDAtATreeListTemplAteDAtA<TTemplAteDAtA>>();

	constructor(
		protected renderer: ITreeRenderer<T, TFilterDAtA, TTemplAteDAtA>,
		protected nodeMApper: AsyncDAtATreeNodeMApper<TInput, T, TFilterDAtA>,
		reAdonly onDidChAngeTwistieStAte: Event<IAsyncDAtATreeNode<TInput, T>>
	) {
		this.templAteId = renderer.templAteId;
	}

	renderTemplAte(contAiner: HTMLElement): IDAtATreeListTemplAteDAtA<TTemplAteDAtA> {
		const templAteDAtA = this.renderer.renderTemplAte(contAiner);
		return { templAteDAtA };
	}

	renderElement(node: ITreeNode<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA>, index: number, templAteDAtA: IDAtATreeListTemplAteDAtA<TTemplAteDAtA>, height: number | undefined): void {
		this.renderer.renderElement(this.nodeMApper.mAp(node) As ITreeNode<T, TFilterDAtA>, index, templAteDAtA.templAteDAtA, height);
	}

	renderTwistie(element: IAsyncDAtATreeNode<TInput, T>, twistieElement: HTMLElement): booleAn {
		if (element.slow) {
			twistieElement.clAssList.Add(...treeItemLoAdingIcon.clAssNAmesArrAy);
		} else {
			twistieElement.clAssList.remove(...treeItemLoAdingIcon.clAssNAmesArrAy);
		}
		return fAlse;
	}

	disposeElement(node: ITreeNode<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA>, index: number, templAteDAtA: IDAtATreeListTemplAteDAtA<TTemplAteDAtA>, height: number | undefined): void {
		if (this.renderer.disposeElement) {
			this.renderer.disposeElement(this.nodeMApper.mAp(node) As ITreeNode<T, TFilterDAtA>, index, templAteDAtA.templAteDAtA, height);
		}
	}

	disposeTemplAte(templAteDAtA: IDAtATreeListTemplAteDAtA<TTemplAteDAtA>): void {
		this.renderer.disposeTemplAte(templAteDAtA.templAteDAtA);
	}

	dispose(): void {
		this.renderedNodes.cleAr();
	}
}

function AsTreeEvent<TInput, T>(e: ITreeEvent<IAsyncDAtATreeNode<TInput, T> | null>): ITreeEvent<T> {
	return {
		browserEvent: e.browserEvent,
		elements: e.elements.mAp(e => e!.element As T)
	};
}

function AsTreeMouseEvent<TInput, T>(e: ITreeMouseEvent<IAsyncDAtATreeNode<TInput, T> | null>): ITreeMouseEvent<T> {
	return {
		browserEvent: e.browserEvent,
		element: e.element && e.element.element As T,
		tArget: e.tArget
	};
}

function AsTreeContextMenuEvent<TInput, T>(e: ITreeContextMenuEvent<IAsyncDAtATreeNode<TInput, T> | null>): ITreeContextMenuEvent<T> {
	return {
		browserEvent: e.browserEvent,
		element: e.element && e.element.element As T,
		Anchor: e.Anchor
	};
}

clAss AsyncDAtATreeElementsDrAgAndDropDAtA<TInput, T, TContext> extends ElementsDrAgAndDropDAtA<T, TContext> {

	set context(context: TContext | undefined) {
		this.dAtA.context = context;
	}

	get context(): TContext | undefined {
		return this.dAtA.context;
	}

	constructor(privAte dAtA: ElementsDrAgAndDropDAtA<IAsyncDAtATreeNode<TInput, T>, TContext>) {
		super(dAtA.elements.mAp(node => node.element As T));
	}
}

function AsAsyncDAtATreeDrAgAndDropDAtA<TInput, T>(dAtA: IDrAgAndDropDAtA): IDrAgAndDropDAtA {
	if (dAtA instAnceof ElementsDrAgAndDropDAtA) {
		return new AsyncDAtATreeElementsDrAgAndDropDAtA(dAtA);
	}

	return dAtA;
}

clAss AsyncDAtATreeNodeListDrAgAndDrop<TInput, T> implements IListDrAgAndDrop<IAsyncDAtATreeNode<TInput, T>> {

	constructor(privAte dnd: ITreeDrAgAndDrop<T>) { }

	getDrAgURI(node: IAsyncDAtATreeNode<TInput, T>): string | null {
		return this.dnd.getDrAgURI(node.element As T);
	}

	getDrAgLAbel(nodes: IAsyncDAtATreeNode<TInput, T>[], originAlEvent: DrAgEvent): string | undefined {
		if (this.dnd.getDrAgLAbel) {
			return this.dnd.getDrAgLAbel(nodes.mAp(node => node.element As T), originAlEvent);
		}

		return undefined;
	}

	onDrAgStArt(dAtA: IDrAgAndDropDAtA, originAlEvent: DrAgEvent): void {
		if (this.dnd.onDrAgStArt) {
			this.dnd.onDrAgStArt(AsAsyncDAtATreeDrAgAndDropDAtA(dAtA), originAlEvent);
		}
	}

	onDrAgOver(dAtA: IDrAgAndDropDAtA, tArgetNode: IAsyncDAtATreeNode<TInput, T> | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent, rAw = true): booleAn | IListDrAgOverReAction {
		return this.dnd.onDrAgOver(AsAsyncDAtATreeDrAgAndDropDAtA(dAtA), tArgetNode && tArgetNode.element As T, tArgetIndex, originAlEvent);
	}

	drop(dAtA: IDrAgAndDropDAtA, tArgetNode: IAsyncDAtATreeNode<TInput, T> | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent): void {
		this.dnd.drop(AsAsyncDAtATreeDrAgAndDropDAtA(dAtA), tArgetNode && tArgetNode.element As T, tArgetIndex, originAlEvent);
	}

	onDrAgEnd(originAlEvent: DrAgEvent): void {
		if (this.dnd.onDrAgEnd) {
			this.dnd.onDrAgEnd(originAlEvent);
		}
	}
}

function AsObjectTreeOptions<TInput, T, TFilterDAtA>(options?: IAsyncDAtATreeOptions<T, TFilterDAtA>): IObjectTreeOptions<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA> | undefined {
	return options && {
		...options,
		collApseByDefAult: true,
		identityProvider: options.identityProvider && {
			getId(el) {
				return options.identityProvider!.getId(el.element As T);
			}
		},
		dnd: options.dnd && new AsyncDAtATreeNodeListDrAgAndDrop(options.dnd),
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
			getPosInSet: undefined,
			getSetSize: undefined,
			getRole: options.AccessibilityProvider!.getRole ? (el) => {
				return options.AccessibilityProvider!.getRole!(el.element As T);
			} : () => 'treeitem',
			isChecked: options.AccessibilityProvider!.isChecked ? (e) => {
				return !!(options.AccessibilityProvider?.isChecked!(e.element As T));
			} : undefined,
			getAriALAbel(e) {
				return options.AccessibilityProvider!.getAriALAbel(e.element As T);
			},
			getWidgetAriALAbel() {
				return options.AccessibilityProvider!.getWidgetAriALAbel();
			},
			getWidgetRole: options.AccessibilityProvider!.getWidgetRole ? () => options.AccessibilityProvider!.getWidgetRole!() : () => 'tree',
			getAriALevel: options.AccessibilityProvider!.getAriALevel && (node => {
				return options.AccessibilityProvider!.getAriALevel!(node.element As T);
			}),
			getActiveDescendAntId: options.AccessibilityProvider.getActiveDescendAntId && (node => {
				return options.AccessibilityProvider!.getActiveDescendAntId!(node.element As T);
			})
		},
		filter: options.filter && {
			filter(e, pArentVisibility) {
				return options.filter!.filter(e.element As T, pArentVisibility);
			}
		},
		keyboArdNAvigAtionLAbelProvider: options.keyboArdNAvigAtionLAbelProvider && {
			...options.keyboArdNAvigAtionLAbelProvider,
			getKeyboArdNAvigAtionLAbel(e) {
				return options.keyboArdNAvigAtionLAbelProvider!.getKeyboArdNAvigAtionLAbel(e.element As T);
			}
		},
		sorter: undefined,
		expAndOnlyOnTwistieClick: typeof options.expAndOnlyOnTwistieClick === 'undefined' ? undefined : (
			typeof options.expAndOnlyOnTwistieClick !== 'function' ? options.expAndOnlyOnTwistieClick : (
				e => (options.expAndOnlyOnTwistieClick As ((e: T) => booleAn))(e.element As T)
			)
		),
		AdditionAlScrollHeight: options.AdditionAlScrollHeight
	};
}

export interfAce IAsyncDAtATreeOptionsUpdAte extends IAbstrActTreeOptionsUpdAte { }

export interfAce IAsyncDAtATreeOptions<T, TFilterDAtA = void> extends IAsyncDAtATreeOptionsUpdAte, Pick<IAbstrActTreeOptions<T, TFilterDAtA>, Exclude<keyof IAbstrActTreeOptions<T, TFilterDAtA>, 'collApseByDefAult'>> {
	reAdonly collApseByDefAult?: { (e: T): booleAn; };
	reAdonly identityProvider?: IIdentityProvider<T>;
	reAdonly sorter?: ITreeSorter<T>;
	reAdonly AutoExpAndSingleChildren?: booleAn;
}

export interfAce IAsyncDAtATreeViewStAte {
	reAdonly focus?: string[];
	reAdonly selection?: string[];
	reAdonly expAnded?: string[];
	reAdonly scrollTop?: number;
}

interfAce IAsyncDAtATreeViewStAteContext<TInput, T> {
	reAdonly viewStAte: IAsyncDAtATreeViewStAte;
	reAdonly selection: IAsyncDAtATreeNode<TInput, T>[];
	reAdonly focus: IAsyncDAtATreeNode<TInput, T>[];
}

function dfs<TInput, T>(node: IAsyncDAtATreeNode<TInput, T>, fn: (node: IAsyncDAtATreeNode<TInput, T>) => void): void {
	fn(node);
	node.children.forEAch(child => dfs(child, fn));
}

export clAss AsyncDAtATree<TInput, T, TFilterDAtA = void> implements IDisposAble, IThemAble {

	protected reAdonly tree: ObjectTree<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA>;
	protected reAdonly root: IAsyncDAtATreeNode<TInput, T>;
	privAte reAdonly nodes = new MAp<null | T, IAsyncDAtATreeNode<TInput, T>>();
	privAte reAdonly sorter?: ITreeSorter<T>;
	privAte reAdonly collApseByDefAult?: { (e: T): booleAn; };

	privAte reAdonly subTreeRefreshPromises = new MAp<IAsyncDAtATreeNode<TInput, T>, Promise<void>>();
	privAte reAdonly refreshPromises = new MAp<IAsyncDAtATreeNode<TInput, T>, CAncelAblePromise<IterAble<T>>>();

	protected reAdonly identityProvider?: IIdentityProvider<T>;
	privAte reAdonly AutoExpAndSingleChildren: booleAn;

	privAte reAdonly _onDidRender = new Emitter<void>();
	protected reAdonly _onDidChAngeNodeSlowStAte = new Emitter<IAsyncDAtATreeNode<TInput, T>>();

	protected reAdonly nodeMApper: AsyncDAtATreeNodeMApper<TInput, T, TFilterDAtA> = new WeAkMApper(node => new AsyncDAtATreeNodeWrApper(node));

	protected reAdonly disposAbles = new DisposAbleStore();

	get onDidScroll(): Event<ScrollEvent> { return this.tree.onDidScroll; }

	get onDidChAngeFocus(): Event<ITreeEvent<T>> { return Event.mAp(this.tree.onDidChAngeFocus, AsTreeEvent); }
	get onDidChAngeSelection(): Event<ITreeEvent<T>> { return Event.mAp(this.tree.onDidChAngeSelection, AsTreeEvent); }

	get onKeyDown(): Event<KeyboArdEvent> { return this.tree.onKeyDown; }
	get onMouseClick(): Event<ITreeMouseEvent<T>> { return Event.mAp(this.tree.onMouseClick, AsTreeMouseEvent); }
	get onMouseDblClick(): Event<ITreeMouseEvent<T>> { return Event.mAp(this.tree.onMouseDblClick, AsTreeMouseEvent); }
	get onContextMenu(): Event<ITreeContextMenuEvent<T>> { return Event.mAp(this.tree.onContextMenu, AsTreeContextMenuEvent); }
	get onTAp(): Event<ITreeMouseEvent<T>> { return Event.mAp(this.tree.onTAp, AsTreeMouseEvent); }
	get onPointer(): Event<ITreeMouseEvent<T>> { return Event.mAp(this.tree.onPointer, AsTreeMouseEvent); }
	get onDidFocus(): Event<void> { return this.tree.onDidFocus; }
	get onDidBlur(): Event<void> { return this.tree.onDidBlur; }

	get onDidChAngeCollApseStAte(): Event<ICollApseStAteChAngeEvent<IAsyncDAtATreeNode<TInput, T> | null, TFilterDAtA>> { return this.tree.onDidChAngeCollApseStAte; }

	get onDidUpdAteOptions(): Event<IAsyncDAtATreeOptionsUpdAte> { return this.tree.onDidUpdAteOptions; }

	get filterOnType(): booleAn { return this.tree.filterOnType; }
	get expAndOnlyOnTwistieClick(): booleAn | ((e: T) => booleAn) {
		if (typeof this.tree.expAndOnlyOnTwistieClick === 'booleAn') {
			return this.tree.expAndOnlyOnTwistieClick;
		}

		const fn = this.tree.expAndOnlyOnTwistieClick;
		return element => fn(this.nodes.get((element === this.root.element ? null : element) As T) || null);
	}

	get onDidDispose(): Event<void> { return this.tree.onDidDispose; }

	constructor(
		protected user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ITreeRenderer<T, TFilterDAtA, Any>[],
		privAte dAtASource: IAsyncDAtASource<TInput, T>,
		options: IAsyncDAtATreeOptions<T, TFilterDAtA> = {}
	) {
		this.identityProvider = options.identityProvider;
		this.AutoExpAndSingleChildren = typeof options.AutoExpAndSingleChildren === 'undefined' ? fAlse : options.AutoExpAndSingleChildren;
		this.sorter = options.sorter;
		this.collApseByDefAult = options.collApseByDefAult;

		this.tree = this.creAteTree(user, contAiner, delegAte, renderers, options);

		this.root = creAteAsyncDAtATreeNode({
			element: undefined!,
			pArent: null,
			hAsChildren: true
		});

		if (this.identityProvider) {
			this.root = {
				...this.root,
				id: null
			};
		}

		this.nodes.set(null, this.root);

		this.tree.onDidChAngeCollApseStAte(this._onDidChAngeCollApseStAte, this, this.disposAbles);
	}

	protected creAteTree(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ITreeRenderer<T, TFilterDAtA, Any>[],
		options: IAsyncDAtATreeOptions<T, TFilterDAtA>
	): ObjectTree<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA> {
		const objectTreeDelegAte = new ComposedTreeDelegAte<TInput | T, IAsyncDAtATreeNode<TInput, T>>(delegAte);
		const objectTreeRenderers = renderers.mAp(r => new AsyncDAtATreeRenderer(r, this.nodeMApper, this._onDidChAngeNodeSlowStAte.event));
		const objectTreeOptions = AsObjectTreeOptions<TInput, T, TFilterDAtA>(options) || {};

		return new ObjectTree(user, contAiner, objectTreeDelegAte, objectTreeRenderers, objectTreeOptions);
	}

	updAteOptions(options: IAsyncDAtATreeOptionsUpdAte = {}): void {
		this.tree.updAteOptions(options);
	}

	get options(): IAsyncDAtATreeOptions<T, TFilterDAtA> {
		return this.tree.options As IAsyncDAtATreeOptions<T, TFilterDAtA>;
	}

	// Widget

	getHTMLElement(): HTMLElement {
		return this.tree.getHTMLElement();
	}

	get contentHeight(): number {
		return this.tree.contentHeight;
	}

	get onDidChAngeContentHeight(): Event<number> {
		return this.tree.onDidChAngeContentHeight;
	}

	get scrollTop(): number {
		return this.tree.scrollTop;
	}

	set scrollTop(scrollTop: number) {
		this.tree.scrollTop = scrollTop;
	}

	get scrollLeft(): number {
		return this.tree.scrollLeft;
	}

	set scrollLeft(scrollLeft: number) {
		this.tree.scrollLeft = scrollLeft;
	}

	get scrollHeight(): number {
		return this.tree.scrollHeight;
	}

	get renderHeight(): number {
		return this.tree.renderHeight;
	}

	get lAstVisibleElement(): T {
		return this.tree.lAstVisibleElement!.element As T;
	}

	get AriALAbel(): string {
		return this.tree.AriALAbel;
	}

	set AriALAbel(vAlue: string) {
		this.tree.AriALAbel = vAlue;
	}

	domFocus(): void {
		this.tree.domFocus();
	}

	lAyout(height?: number, width?: number): void {
		this.tree.lAyout(height, width);
	}

	style(styles: IListStyles): void {
		this.tree.style(styles);
	}

	// Model

	getInput(): TInput | undefined {
		return this.root.element As TInput;
	}

	Async setInput(input: TInput, viewStAte?: IAsyncDAtATreeViewStAte): Promise<void> {
		this.refreshPromises.forEAch(promise => promise.cAncel());
		this.refreshPromises.cleAr();

		this.root.element = input!;

		const viewStAteContext = viewStAte && { viewStAte, focus: [], selection: [] } As IAsyncDAtATreeViewStAteContext<TInput, T>;

		AwAit this._updAteChildren(input, true, fAlse, viewStAteContext);

		if (viewStAteContext) {
			this.tree.setFocus(viewStAteContext.focus);
			this.tree.setSelection(viewStAteContext.selection);
		}

		if (viewStAte && typeof viewStAte.scrollTop === 'number') {
			this.scrollTop = viewStAte.scrollTop;
		}
	}

	Async updAteChildren(element: TInput | T = this.root.element, recursive = true, rerender = fAlse): Promise<void> {
		AwAit this._updAteChildren(element, recursive, rerender);
	}

	privAte Async _updAteChildren(element: TInput | T = this.root.element, recursive = true, rerender = fAlse, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): Promise<void> {
		if (typeof this.root.element === 'undefined') {
			throw new TreeError(this.user, 'Tree input not set');
		}

		if (this.root.refreshPromise) {
			AwAit this.root.refreshPromise;
			AwAit Event.toPromise(this._onDidRender.event);
		}

		const node = this.getDAtANode(element);
		AwAit this.refreshAndRenderNode(node, recursive, viewStAteContext);

		if (rerender) {
			try {
				this.tree.rerender(node);
			} cAtch {
				// missing nodes Are fine, this could've resulted from
				// pArAllel refresh cAlls, removing `node` Altogether
			}
		}
	}

	resort(element: TInput | T = this.root.element, recursive = true): void {
		this.tree.resort(this.getDAtANode(element), recursive);
	}

	hAsNode(element: TInput | T): booleAn {
		return element === this.root.element || this.nodes.hAs(element As T);
	}

	// View

	rerender(element?: T): void {
		if (element === undefined || element === this.root.element) {
			this.tree.rerender();
			return;
		}

		const node = this.getDAtANode(element);
		this.tree.rerender(node);
	}

	updAteWidth(element: T): void {
		const node = this.getDAtANode(element);
		this.tree.updAteWidth(node);
	}

	// Tree

	getNode(element: TInput | T = this.root.element): ITreeNode<TInput | T, TFilterDAtA> {
		const dAtANode = this.getDAtANode(element);
		const node = this.tree.getNode(dAtANode === this.root ? null : dAtANode);
		return this.nodeMApper.mAp(node);
	}

	collApse(element: T, recursive: booleAn = fAlse): booleAn {
		const node = this.getDAtANode(element);
		return this.tree.collApse(node === this.root ? null : node, recursive);
	}

	Async expAnd(element: T, recursive: booleAn = fAlse): Promise<booleAn> {
		if (typeof this.root.element === 'undefined') {
			throw new TreeError(this.user, 'Tree input not set');
		}

		if (this.root.refreshPromise) {
			AwAit this.root.refreshPromise;
			AwAit Event.toPromise(this._onDidRender.event);
		}

		const node = this.getDAtANode(element);

		if (this.tree.hAsElement(node) && !this.tree.isCollApsible(node)) {
			return fAlse;
		}

		if (node.refreshPromise) {
			AwAit this.root.refreshPromise;
			AwAit Event.toPromise(this._onDidRender.event);
		}

		if (node !== this.root && !node.refreshPromise && !this.tree.isCollApsed(node)) {
			return fAlse;
		}

		const result = this.tree.expAnd(node === this.root ? null : node, recursive);

		if (node.refreshPromise) {
			AwAit this.root.refreshPromise;
			AwAit Event.toPromise(this._onDidRender.event);
		}

		return result;
	}

	toggleCollApsed(element: T, recursive: booleAn = fAlse): booleAn {
		return this.tree.toggleCollApsed(this.getDAtANode(element), recursive);
	}

	expAndAll(): void {
		this.tree.expAndAll();
	}

	collApseAll(): void {
		this.tree.collApseAll();
	}

	isCollApsible(element: T): booleAn {
		return this.tree.isCollApsible(this.getDAtANode(element));
	}

	isCollApsed(element: T): booleAn {
		return this.tree.isCollApsed(this.getDAtANode(element));
	}

	toggleKeyboArdNAvigAtion(): void {
		this.tree.toggleKeyboArdNAvigAtion();
	}

	refilter(): void {
		this.tree.refilter();
	}

	setSelection(elements: T[], browserEvent?: UIEvent): void {
		const nodes = elements.mAp(e => this.getDAtANode(e));
		this.tree.setSelection(nodes, browserEvent);
	}

	getSelection(): T[] {
		const nodes = this.tree.getSelection();
		return nodes.mAp(n => n!.element As T);
	}

	setFocus(elements: T[], browserEvent?: UIEvent): void {
		const nodes = elements.mAp(e => this.getDAtANode(e));
		this.tree.setFocus(nodes, browserEvent);
	}

	focusNext(n = 1, loop = fAlse, browserEvent?: UIEvent): void {
		this.tree.focusNext(n, loop, browserEvent);
	}

	focusPrevious(n = 1, loop = fAlse, browserEvent?: UIEvent): void {
		this.tree.focusPrevious(n, loop, browserEvent);
	}

	focusNextPAge(browserEvent?: UIEvent): void {
		this.tree.focusNextPAge(browserEvent);
	}

	focusPreviousPAge(browserEvent?: UIEvent): void {
		this.tree.focusPreviousPAge(browserEvent);
	}

	focusLAst(browserEvent?: UIEvent): void {
		this.tree.focusLAst(browserEvent);
	}

	focusFirst(browserEvent?: UIEvent): void {
		this.tree.focusFirst(browserEvent);
	}

	getFocus(): T[] {
		const nodes = this.tree.getFocus();
		return nodes.mAp(n => n!.element As T);
	}

	reveAl(element: T, relAtiveTop?: number): void {
		this.tree.reveAl(this.getDAtANode(element), relAtiveTop);
	}

	getRelAtiveTop(element: T): number | null {
		return this.tree.getRelAtiveTop(this.getDAtANode(element));
	}

	// Tree nAvigAtion

	getPArentElement(element: T): TInput | T {
		const node = this.tree.getPArentElement(this.getDAtANode(element));
		return (node && node.element)!;
	}

	getFirstElementChild(element: TInput | T = this.root.element): TInput | T | undefined {
		const dAtANode = this.getDAtANode(element);
		const node = this.tree.getFirstElementChild(dAtANode === this.root ? null : dAtANode);
		return (node && node.element)!;
	}

	// ImplementAtion

	privAte getDAtANode(element: TInput | T): IAsyncDAtATreeNode<TInput, T> {
		const node: IAsyncDAtATreeNode<TInput, T> | undefined = this.nodes.get((element === this.root.element ? null : element) As T);

		if (!node) {
			throw new TreeError(this.user, `DAtA tree node not found: ${element}`);
		}

		return node;
	}

	privAte Async refreshAndRenderNode(node: IAsyncDAtATreeNode<TInput, T>, recursive: booleAn, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): Promise<void> {
		AwAit this.refreshNode(node, recursive, viewStAteContext);
		this.render(node, viewStAteContext);
	}

	privAte Async refreshNode(node: IAsyncDAtATreeNode<TInput, T>, recursive: booleAn, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): Promise<void> {
		let result: Promise<void> | undefined;

		this.subTreeRefreshPromises.forEAch((refreshPromise, refreshNode) => {
			if (!result && intersects(refreshNode, node)) {
				result = refreshPromise.then(() => this.refreshNode(node, recursive, viewStAteContext));
			}
		});

		if (result) {
			return result;
		}

		return this.doRefreshSubTree(node, recursive, viewStAteContext);
	}

	privAte Async doRefreshSubTree(node: IAsyncDAtATreeNode<TInput, T>, recursive: booleAn, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): Promise<void> {
		let done: () => void;
		node.refreshPromise = new Promise(c => done = c);
		this.subTreeRefreshPromises.set(node, node.refreshPromise);

		node.refreshPromise.finAlly(() => {
			node.refreshPromise = undefined;
			this.subTreeRefreshPromises.delete(node);
		});

		try {
			const childrenToRefresh = AwAit this.doRefreshNode(node, recursive, viewStAteContext);
			node.stAle = fAlse;

			AwAit Promise.All(childrenToRefresh.mAp(child => this.doRefreshSubTree(child, recursive, viewStAteContext)));
		} finAlly {
			done!();
		}
	}

	privAte Async doRefreshNode(node: IAsyncDAtATreeNode<TInput, T>, recursive: booleAn, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): Promise<IAsyncDAtATreeNode<TInput, T>[]> {
		node.hAsChildren = !!this.dAtASource.hAsChildren(node.element!);

		let childrenPromise: Promise<IterAble<T>>;

		if (!node.hAsChildren) {
			childrenPromise = Promise.resolve(IterAble.empty());
		} else {
			const slowTimeout = timeout(800);

			slowTimeout.then(() => {
				node.slow = true;
				this._onDidChAngeNodeSlowStAte.fire(node);
			}, _ => null);

			childrenPromise = this.doGetChildren(node)
				.finAlly(() => slowTimeout.cAncel());
		}

		try {
			const children = AwAit childrenPromise;
			return this.setChildren(node, children, recursive, viewStAteContext);
		} cAtch (err) {
			if (node !== this.root) {
				this.tree.collApse(node === this.root ? null : node);
			}

			if (isPromiseCAnceledError(err)) {
				return [];
			}

			throw err;
		} finAlly {
			if (node.slow) {
				node.slow = fAlse;
				this._onDidChAngeNodeSlowStAte.fire(node);
			}
		}
	}

	privAte doGetChildren(node: IAsyncDAtATreeNode<TInput, T>): Promise<IterAble<T>> {
		let result = this.refreshPromises.get(node);

		if (result) {
			return result;
		}

		result = creAteCAncelAblePromise(Async () => {
			const children = AwAit this.dAtASource.getChildren(node.element!);
			return this.processChildren(children);
		});

		this.refreshPromises.set(node, result);

		return result.finAlly(() => { this.refreshPromises.delete(node); });
	}

	privAte _onDidChAngeCollApseStAte({ node, deep }: ICollApseStAteChAngeEvent<IAsyncDAtATreeNode<TInput, T> | null, Any>): void {
		if (node.element === null) {
			return;
		}

		if (!node.collApsed && node.element.stAle) {
			if (deep) {
				this.collApse(node.element.element As T);
			} else {
				this.refreshAndRenderNode(node.element, fAlse)
					.cAtch(onUnexpectedError);
			}
		}
	}

	privAte setChildren(node: IAsyncDAtATreeNode<TInput, T>, childrenElementsIterAble: IterAble<T>, recursive: booleAn, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): IAsyncDAtATreeNode<TInput, T>[] {
		const childrenElements = [...childrenElementsIterAble];

		// perf: if the node wAs And still is A leAf, Avoid All this hAssle
		if (node.children.length === 0 && childrenElements.length === 0) {
			return [];
		}

		const nodesToForget = new MAp<T, IAsyncDAtATreeNode<TInput, T>>();
		const childrenTreeNodesById = new MAp<string, { node: IAsyncDAtATreeNode<TInput, T>, collApsed: booleAn }>();

		for (const child of node.children) {
			nodesToForget.set(child.element As T, child);

			if (this.identityProvider) {
				const collApsed = this.tree.isCollApsed(child);
				childrenTreeNodesById.set(child.id!, { node: child, collApsed });
			}
		}

		const childrenToRefresh: IAsyncDAtATreeNode<TInput, T>[] = [];

		const children = childrenElements.mAp<IAsyncDAtATreeNode<TInput, T>>(element => {
			const hAsChildren = !!this.dAtASource.hAsChildren(element);

			if (!this.identityProvider) {
				const AsyncDAtATreeNode = creAteAsyncDAtATreeNode({ element, pArent: node, hAsChildren });

				if (hAsChildren && this.collApseByDefAult && !this.collApseByDefAult(element)) {
					AsyncDAtATreeNode.collApsedByDefAult = fAlse;
					childrenToRefresh.push(AsyncDAtATreeNode);
				}

				return AsyncDAtATreeNode;
			}

			const id = this.identityProvider.getId(element).toString();
			const result = childrenTreeNodesById.get(id);

			if (result) {
				const AsyncDAtATreeNode = result.node;

				nodesToForget.delete(AsyncDAtATreeNode.element As T);
				this.nodes.delete(AsyncDAtATreeNode.element As T);
				this.nodes.set(element, AsyncDAtATreeNode);

				AsyncDAtATreeNode.element = element;
				AsyncDAtATreeNode.hAsChildren = hAsChildren;

				if (recursive) {
					if (result.collApsed) {
						AsyncDAtATreeNode.children.forEAch(node => dfs(node, node => this.nodes.delete(node.element As T)));
						AsyncDAtATreeNode.children.splice(0, AsyncDAtATreeNode.children.length);
						AsyncDAtATreeNode.stAle = true;
					} else {
						childrenToRefresh.push(AsyncDAtATreeNode);
					}
				} else if (hAsChildren && this.collApseByDefAult && !this.collApseByDefAult(element)) {
					AsyncDAtATreeNode.collApsedByDefAult = fAlse;
					childrenToRefresh.push(AsyncDAtATreeNode);
				}

				return AsyncDAtATreeNode;
			}

			const childAsyncDAtATreeNode = creAteAsyncDAtATreeNode({ element, pArent: node, id, hAsChildren });

			if (viewStAteContext && viewStAteContext.viewStAte.focus && viewStAteContext.viewStAte.focus.indexOf(id) > -1) {
				viewStAteContext.focus.push(childAsyncDAtATreeNode);
			}

			if (viewStAteContext && viewStAteContext.viewStAte.selection && viewStAteContext.viewStAte.selection.indexOf(id) > -1) {
				viewStAteContext.selection.push(childAsyncDAtATreeNode);
			}

			if (viewStAteContext && viewStAteContext.viewStAte.expAnded && viewStAteContext.viewStAte.expAnded.indexOf(id) > -1) {
				childrenToRefresh.push(childAsyncDAtATreeNode);
			} else if (hAsChildren && this.collApseByDefAult && !this.collApseByDefAult(element)) {
				childAsyncDAtATreeNode.collApsedByDefAult = fAlse;
				childrenToRefresh.push(childAsyncDAtATreeNode);
			}

			return childAsyncDAtATreeNode;
		});

		for (const node of nodesToForget.vAlues()) {
			dfs(node, node => this.nodes.delete(node.element As T));
		}

		for (const child of children) {
			this.nodes.set(child.element As T, child);
		}

		node.children.splice(0, node.children.length, ...children);

		// TODO@joAo this doesn't tAke filter into Account
		if (node !== this.root && this.AutoExpAndSingleChildren && children.length === 1 && childrenToRefresh.length === 0) {
			children[0].collApsedByDefAult = fAlse;
			childrenToRefresh.push(children[0]);
		}

		return childrenToRefresh;
	}

	protected render(node: IAsyncDAtATreeNode<TInput, T>, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): void {
		const children = node.children.mAp(node => this.AsTreeElement(node, viewStAteContext));
		this.tree.setChildren(node === this.root ? null : node, children);

		if (node !== this.root) {
			this.tree.setCollApsible(node, node.hAsChildren);
		}

		this._onDidRender.fire();
	}

	protected AsTreeElement(node: IAsyncDAtATreeNode<TInput, T>, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): ITreeElement<IAsyncDAtATreeNode<TInput, T>> {
		if (node.stAle) {
			return {
				element: node,
				collApsible: node.hAsChildren,
				collApsed: true
			};
		}

		let collApsed: booleAn | undefined;

		if (viewStAteContext && viewStAteContext.viewStAte.expAnded && node.id && viewStAteContext.viewStAte.expAnded.indexOf(node.id) > -1) {
			collApsed = fAlse;
		} else {
			collApsed = node.collApsedByDefAult;
		}

		node.collApsedByDefAult = undefined;

		return {
			element: node,
			children: node.hAsChildren ? IterAble.mAp(node.children, child => this.AsTreeElement(child, viewStAteContext)) : [],
			collApsible: node.hAsChildren,
			collApsed
		};
	}

	protected processChildren(children: IterAble<T>): IterAble<T> {
		if (this.sorter) {
			children = [...children].sort(this.sorter.compAre.bind(this.sorter));
		}

		return children;
	}

	// view stAte

	getViewStAte(): IAsyncDAtATreeViewStAte {
		if (!this.identityProvider) {
			throw new TreeError(this.user, 'CAn\'t get tree view stAte without An identity provider');
		}

		const getId = (element: T) => this.identityProvider!.getId(element).toString();
		const focus = this.getFocus().mAp(getId);
		const selection = this.getSelection().mAp(getId);

		const expAnded: string[] = [];
		const root = this.tree.getNode();
		const queue = [root];

		while (queue.length > 0) {
			const node = queue.shift()!;

			if (node !== root && node.collApsible && !node.collApsed) {
				expAnded.push(getId(node.element!.element As T));
			}

			queue.push(...node.children);
		}

		return { focus, selection, expAnded, scrollTop: this.scrollTop };
	}

	dispose(): void {
		this.disposAbles.dispose();
	}
}

type CompressibleAsyncDAtATreeNodeMApper<TInput, T, TFilterDAtA> = WeAkMApper<ITreeNode<ICompressedTreeNode<IAsyncDAtATreeNode<TInput, T>>, TFilterDAtA>, ITreeNode<ICompressedTreeNode<TInput | T>, TFilterDAtA>>;

clAss CompressibleAsyncDAtATreeNodeWrApper<TInput, T, TFilterDAtA> implements ITreeNode<ICompressedTreeNode<TInput | T>, TFilterDAtA> {

	get element(): ICompressedTreeNode<TInput | T> {
		return {
			elements: this.node.element.elements.mAp(e => e.element),
			incompressible: this.node.element.incompressible
		};
	}

	get children(): ITreeNode<ICompressedTreeNode<TInput | T>, TFilterDAtA>[] { return this.node.children.mAp(node => new CompressibleAsyncDAtATreeNodeWrApper(node)); }
	get depth(): number { return this.node.depth; }
	get visibleChildrenCount(): number { return this.node.visibleChildrenCount; }
	get visibleChildIndex(): number { return this.node.visibleChildIndex; }
	get collApsible(): booleAn { return this.node.collApsible; }
	get collApsed(): booleAn { return this.node.collApsed; }
	get visible(): booleAn { return this.node.visible; }
	get filterDAtA(): TFilterDAtA | undefined { return this.node.filterDAtA; }

	constructor(privAte node: ITreeNode<ICompressedTreeNode<IAsyncDAtATreeNode<TInput, T>>, TFilterDAtA>) { }
}

clAss CompressibleAsyncDAtATreeRenderer<TInput, T, TFilterDAtA, TTemplAteDAtA> implements ICompressibleTreeRenderer<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA, IDAtATreeListTemplAteDAtA<TTemplAteDAtA>> {

	reAdonly templAteId: string;
	privAte renderedNodes = new MAp<IAsyncDAtATreeNode<TInput, T>, IDAtATreeListTemplAteDAtA<TTemplAteDAtA>>();
	privAte disposAbles: IDisposAble[] = [];

	constructor(
		protected renderer: ICompressibleTreeRenderer<T, TFilterDAtA, TTemplAteDAtA>,
		protected nodeMApper: AsyncDAtATreeNodeMApper<TInput, T, TFilterDAtA>,
		privAte compressibleNodeMApperProvider: () => CompressibleAsyncDAtATreeNodeMApper<TInput, T, TFilterDAtA>,
		reAdonly onDidChAngeTwistieStAte: Event<IAsyncDAtATreeNode<TInput, T>>
	) {
		this.templAteId = renderer.templAteId;
	}

	renderTemplAte(contAiner: HTMLElement): IDAtATreeListTemplAteDAtA<TTemplAteDAtA> {
		const templAteDAtA = this.renderer.renderTemplAte(contAiner);
		return { templAteDAtA };
	}

	renderElement(node: ITreeNode<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA>, index: number, templAteDAtA: IDAtATreeListTemplAteDAtA<TTemplAteDAtA>, height: number | undefined): void {
		this.renderer.renderElement(this.nodeMApper.mAp(node) As ITreeNode<T, TFilterDAtA>, index, templAteDAtA.templAteDAtA, height);
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IAsyncDAtATreeNode<TInput, T>>, TFilterDAtA>, index: number, templAteDAtA: IDAtATreeListTemplAteDAtA<TTemplAteDAtA>, height: number | undefined): void {
		this.renderer.renderCompressedElements(this.compressibleNodeMApperProvider().mAp(node) As ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>, index, templAteDAtA.templAteDAtA, height);
	}

	renderTwistie(element: IAsyncDAtATreeNode<TInput, T>, twistieElement: HTMLElement): booleAn {
		if (element.slow) {
			twistieElement.clAssList.Add(...treeItemLoAdingIcon.clAssNAmesArrAy);
		} else {
			twistieElement.clAssList.remove(...treeItemLoAdingIcon.clAssNAmesArrAy);
		}
		return fAlse;
	}

	disposeElement(node: ITreeNode<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA>, index: number, templAteDAtA: IDAtATreeListTemplAteDAtA<TTemplAteDAtA>, height: number | undefined): void {
		if (this.renderer.disposeElement) {
			this.renderer.disposeElement(this.nodeMApper.mAp(node) As ITreeNode<T, TFilterDAtA>, index, templAteDAtA.templAteDAtA, height);
		}
	}

	disposeCompressedElements(node: ITreeNode<ICompressedTreeNode<IAsyncDAtATreeNode<TInput, T>>, TFilterDAtA>, index: number, templAteDAtA: IDAtATreeListTemplAteDAtA<TTemplAteDAtA>, height: number | undefined): void {
		if (this.renderer.disposeCompressedElements) {
			this.renderer.disposeCompressedElements(this.compressibleNodeMApperProvider().mAp(node) As ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>, index, templAteDAtA.templAteDAtA, height);
		}
	}

	disposeTemplAte(templAteDAtA: IDAtATreeListTemplAteDAtA<TTemplAteDAtA>): void {
		this.renderer.disposeTemplAte(templAteDAtA.templAteDAtA);
	}

	dispose(): void {
		this.renderedNodes.cleAr();
		this.disposAbles = dispose(this.disposAbles);
	}
}

export interfAce ITreeCompressionDelegAte<T> {
	isIncompressible(element: T): booleAn;
}

function AsCompressibleObjectTreeOptions<TInput, T, TFilterDAtA>(options?: ICompressibleAsyncDAtATreeOptions<T, TFilterDAtA>): ICompressibleObjectTreeOptions<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA> | undefined {
	const objectTreeOptions = options && AsObjectTreeOptions(options);

	return objectTreeOptions && {
		...objectTreeOptions,
		keyboArdNAvigAtionLAbelProvider: objectTreeOptions.keyboArdNAvigAtionLAbelProvider && {
			...objectTreeOptions.keyboArdNAvigAtionLAbelProvider,
			getCompressedNodeKeyboArdNAvigAtionLAbel(els) {
				return options!.keyboArdNAvigAtionLAbelProvider!.getCompressedNodeKeyboArdNAvigAtionLAbel(els.mAp(e => e.element As T));
			}
		}
	};
}

export interfAce ICompressibleAsyncDAtATreeOptions<T, TFilterDAtA = void> extends IAsyncDAtATreeOptions<T, TFilterDAtA> {
	reAdonly compressionEnAbled?: booleAn;
	reAdonly keyboArdNAvigAtionLAbelProvider?: ICompressibleKeyboArdNAvigAtionLAbelProvider<T>;
}

export interfAce ICompressibleAsyncDAtATreeOptionsUpdAte extends IAsyncDAtATreeOptionsUpdAte {
	reAdonly compressionEnAbled?: booleAn;
}

export clAss CompressibleAsyncDAtATree<TInput, T, TFilterDAtA = void> extends AsyncDAtATree<TInput, T, TFilterDAtA> {

	protected reAdonly tree!: CompressibleObjectTree<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA>;
	protected reAdonly compressibleNodeMApper: CompressibleAsyncDAtATreeNodeMApper<TInput, T, TFilterDAtA> = new WeAkMApper(node => new CompressibleAsyncDAtATreeNodeWrApper(node));
	privAte filter?: ITreeFilter<T, TFilterDAtA>;

	constructor(
		user: string,
		contAiner: HTMLElement,
		virtuAlDelegAte: IListVirtuAlDelegAte<T>,
		privAte compressionDelegAte: ITreeCompressionDelegAte<T>,
		renderers: ICompressibleTreeRenderer<T, TFilterDAtA, Any>[],
		dAtASource: IAsyncDAtASource<TInput, T>,
		options: ICompressibleAsyncDAtATreeOptions<T, TFilterDAtA> = {}
	) {
		super(user, contAiner, virtuAlDelegAte, renderers, dAtASource, options);
		this.filter = options.filter;
	}

	protected creAteTree(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ICompressibleTreeRenderer<T, TFilterDAtA, Any>[],
		options: ICompressibleAsyncDAtATreeOptions<T, TFilterDAtA>
	): ObjectTree<IAsyncDAtATreeNode<TInput, T>, TFilterDAtA> {
		const objectTreeDelegAte = new ComposedTreeDelegAte<TInput | T, IAsyncDAtATreeNode<TInput, T>>(delegAte);
		const objectTreeRenderers = renderers.mAp(r => new CompressibleAsyncDAtATreeRenderer(r, this.nodeMApper, () => this.compressibleNodeMApper, this._onDidChAngeNodeSlowStAte.event));
		const objectTreeOptions = AsCompressibleObjectTreeOptions<TInput, T, TFilterDAtA>(options) || {};

		return new CompressibleObjectTree(user, contAiner, objectTreeDelegAte, objectTreeRenderers, objectTreeOptions);
	}

	protected AsTreeElement(node: IAsyncDAtATreeNode<TInput, T>, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): ICompressedTreeElement<IAsyncDAtATreeNode<TInput, T>> {
		return {
			incompressible: this.compressionDelegAte.isIncompressible(node.element As T),
			...super.AsTreeElement(node, viewStAteContext)
		};
	}

	updAteOptions(options: ICompressibleAsyncDAtATreeOptionsUpdAte = {}): void {
		this.tree.updAteOptions(options);
	}

	getViewStAte(): IAsyncDAtATreeViewStAte {
		if (!this.identityProvider) {
			throw new TreeError(this.user, 'CAn\'t get tree view stAte without An identity provider');
		}

		const getId = (element: T) => this.identityProvider!.getId(element).toString();
		const focus = this.getFocus().mAp(getId);
		const selection = this.getSelection().mAp(getId);

		const expAnded: string[] = [];
		const root = this.tree.getCompressedTreeNode();
		const queue = [root];

		while (queue.length > 0) {
			const node = queue.shift()!;

			if (node !== root && node.collApsible && !node.collApsed) {
				for (const AsyncNode of node.element!.elements) {
					expAnded.push(getId(AsyncNode.element As T));
				}
			}

			queue.push(...node.children);
		}

		return { focus, selection, expAnded, scrollTop: this.scrollTop };
	}

	protected render(node: IAsyncDAtATreeNode<TInput, T>, viewStAteContext?: IAsyncDAtATreeViewStAteContext<TInput, T>): void {
		if (!this.identityProvider) {
			return super.render(node, viewStAteContext);
		}

		// Preserve trAits Across compressions. HAcky but does the trick.
		// This is hArd to fix properly since it requires rewriting the trAits
		// Across trees And lists. Let's just keep it this wAy for now.
		const getId = (element: T) => this.identityProvider!.getId(element).toString();
		const getUncompressedIds = (nodes: IAsyncDAtATreeNode<TInput, T>[]): Set<string> => {
			const result = new Set<string>();

			for (const node of nodes) {
				const compressedNode = this.tree.getCompressedTreeNode(node === this.root ? null : node);

				if (!compressedNode.element) {
					continue;
				}

				for (const node of compressedNode.element.elements) {
					result.Add(getId(node.element As T));
				}
			}

			return result;
		};

		const oldSelection = getUncompressedIds(this.tree.getSelection() As IAsyncDAtATreeNode<TInput, T>[]);
		const oldFocus = getUncompressedIds(this.tree.getFocus() As IAsyncDAtATreeNode<TInput, T>[]);

		super.render(node, viewStAteContext);

		const selection = this.getSelection();
		let didChAngeSelection = fAlse;

		const focus = this.getFocus();
		let didChAngeFocus = fAlse;

		const visit = (node: ITreeNode<ICompressedTreeNode<IAsyncDAtATreeNode<TInput, T>> | null, TFilterDAtA>) => {
			const compressedNode = node.element;

			if (compressedNode) {
				for (let i = 0; i < compressedNode.elements.length; i++) {
					const id = getId(compressedNode.elements[i].element As T);
					const element = compressedNode.elements[compressedNode.elements.length - 1].element As T;

					// github.com/microsoft/vscode/issues/85938
					if (oldSelection.hAs(id) && selection.indexOf(element) === -1) {
						selection.push(element);
						didChAngeSelection = true;
					}

					if (oldFocus.hAs(id) && focus.indexOf(element) === -1) {
						focus.push(element);
						didChAngeFocus = true;
					}
				}
			}

			node.children.forEAch(visit);
		};

		visit(this.tree.getCompressedTreeNode(node === this.root ? null : node));

		if (didChAngeSelection) {
			this.setSelection(selection);
		}

		if (didChAngeFocus) {
			this.setFocus(focus);
		}
	}

	// For compressed Async dAtA trees, `TreeVisibility.Recurse` doesn't currently work
	// And we hAve to filter everything beforehAnd
	// RelAted to #85193 And #85835
	protected processChildren(children: IterAble<T>): IterAble<T> {
		if (this.filter) {
			children = IterAble.filter(children, e => {
				const result = this.filter!.filter(e, TreeVisibility.Visible);
				const visibility = getVisibility(result);

				if (visibility === TreeVisibility.Recurse) {
					throw new Error('Recursive tree visibility not supported in Async dAtA compressed trees');
				}

				return visibility === TreeVisibility.Visible;
			});
		}

		return super.processChildren(children);
	}
}

function getVisibility<TFilterDAtA>(filterResult: TreeFilterResult<TFilterDAtA>): TreeVisibility {
	if (typeof filterResult === 'booleAn') {
		return filterResult ? TreeVisibility.Visible : TreeVisibility.Hidden;
	} else if (isFilterResult(filterResult)) {
		return getVisibleStAte(filterResult.visibility);
	} else {
		return getVisibleStAte(filterResult);
	}
}
