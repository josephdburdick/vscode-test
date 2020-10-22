/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComposedTreeDelegate, IABstractTreeOptions, IABstractTreeOptionsUpdate } from 'vs/Base/Browser/ui/tree/aBstractTree';
import { OBjectTree, IOBjectTreeOptions, CompressiBleOBjectTree, ICompressiBleTreeRenderer, ICompressiBleKeyBoardNavigationLaBelProvider, ICompressiBleOBjectTreeOptions } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { IListVirtualDelegate, IIdentityProvider, IListDragAndDrop, IListDragOverReaction } from 'vs/Base/Browser/ui/list/list';
import { ITreeElement, ITreeNode, ITreeRenderer, ITreeEvent, ITreeMouseEvent, ITreeContextMenuEvent, ITreeSorter, ICollapseStateChangeEvent, IAsyncDataSource, ITreeDragAndDrop, TreeError, WeakMapper, ITreeFilter, TreeVisiBility, TreeFilterResult } from 'vs/Base/Browser/ui/tree/tree';
import { IDisposaBle, dispose, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { timeout, CancelaBlePromise, createCancelaBlePromise } from 'vs/Base/common/async';
import { IListStyles } from 'vs/Base/Browser/ui/list/listWidget';
import { IteraBle } from 'vs/Base/common/iterator';
import { IDragAndDropData } from 'vs/Base/Browser/dnd';
import { ElementsDragAndDropData } from 'vs/Base/Browser/ui/list/listView';
import { isPromiseCanceledError, onUnexpectedError } from 'vs/Base/common/errors';
import { ScrollEvent } from 'vs/Base/common/scrollaBle';
import { ICompressedTreeNode, ICompressedTreeElement } from 'vs/Base/Browser/ui/tree/compressedOBjectTreeModel';
import { IThemaBle } from 'vs/Base/common/styler';
import { isFilterResult, getVisiBleState } from 'vs/Base/Browser/ui/tree/indexTreeModel';
import { treeItemLoadingIcon } from 'vs/Base/Browser/ui/tree/treeIcons';

interface IAsyncDataTreeNode<TInput, T> {
	element: TInput | T;
	readonly parent: IAsyncDataTreeNode<TInput, T> | null;
	readonly children: IAsyncDataTreeNode<TInput, T>[];
	readonly id?: string | null;
	refreshPromise: Promise<void> | undefined;
	hasChildren: Boolean;
	stale: Boolean;
	slow: Boolean;
	collapsedByDefault: Boolean | undefined;
}

interface IAsyncDataTreeNodeRequiredProps<TInput, T> extends Partial<IAsyncDataTreeNode<TInput, T>> {
	readonly element: TInput | T;
	readonly parent: IAsyncDataTreeNode<TInput, T> | null;
	readonly hasChildren: Boolean;
}

function createAsyncDataTreeNode<TInput, T>(props: IAsyncDataTreeNodeRequiredProps<TInput, T>): IAsyncDataTreeNode<TInput, T> {
	return {
		...props,
		children: [],
		refreshPromise: undefined,
		stale: true,
		slow: false,
		collapsedByDefault: undefined
	};
}

function isAncestor<TInput, T>(ancestor: IAsyncDataTreeNode<TInput, T>, descendant: IAsyncDataTreeNode<TInput, T>): Boolean {
	if (!descendant.parent) {
		return false;
	} else if (descendant.parent === ancestor) {
		return true;
	} else {
		return isAncestor(ancestor, descendant.parent);
	}
}

function intersects<TInput, T>(node: IAsyncDataTreeNode<TInput, T>, other: IAsyncDataTreeNode<TInput, T>): Boolean {
	return node === other || isAncestor(node, other) || isAncestor(other, node);
}

interface IDataTreeListTemplateData<T> {
	templateData: T;
}

type AsyncDataTreeNodeMapper<TInput, T, TFilterData> = WeakMapper<ITreeNode<IAsyncDataTreeNode<TInput, T> | null, TFilterData>, ITreeNode<TInput | T, TFilterData>>;

class AsyncDataTreeNodeWrapper<TInput, T, TFilterData> implements ITreeNode<TInput | T, TFilterData> {

	get element(): T { return this.node.element!.element as T; }
	get children(): ITreeNode<T, TFilterData>[] { return this.node.children.map(node => new AsyncDataTreeNodeWrapper(node)); }
	get depth(): numBer { return this.node.depth; }
	get visiBleChildrenCount(): numBer { return this.node.visiBleChildrenCount; }
	get visiBleChildIndex(): numBer { return this.node.visiBleChildIndex; }
	get collapsiBle(): Boolean { return this.node.collapsiBle; }
	get collapsed(): Boolean { return this.node.collapsed; }
	get visiBle(): Boolean { return this.node.visiBle; }
	get filterData(): TFilterData | undefined { return this.node.filterData; }

	constructor(private node: ITreeNode<IAsyncDataTreeNode<TInput, T> | null, TFilterData>) { }
}

class AsyncDataTreeRenderer<TInput, T, TFilterData, TTemplateData> implements ITreeRenderer<IAsyncDataTreeNode<TInput, T>, TFilterData, IDataTreeListTemplateData<TTemplateData>> {

	readonly templateId: string;
	private renderedNodes = new Map<IAsyncDataTreeNode<TInput, T>, IDataTreeListTemplateData<TTemplateData>>();

	constructor(
		protected renderer: ITreeRenderer<T, TFilterData, TTemplateData>,
		protected nodeMapper: AsyncDataTreeNodeMapper<TInput, T, TFilterData>,
		readonly onDidChangeTwistieState: Event<IAsyncDataTreeNode<TInput, T>>
	) {
		this.templateId = renderer.templateId;
	}

	renderTemplate(container: HTMLElement): IDataTreeListTemplateData<TTemplateData> {
		const templateData = this.renderer.renderTemplate(container);
		return { templateData };
	}

	renderElement(node: ITreeNode<IAsyncDataTreeNode<TInput, T>, TFilterData>, index: numBer, templateData: IDataTreeListTemplateData<TTemplateData>, height: numBer | undefined): void {
		this.renderer.renderElement(this.nodeMapper.map(node) as ITreeNode<T, TFilterData>, index, templateData.templateData, height);
	}

	renderTwistie(element: IAsyncDataTreeNode<TInput, T>, twistieElement: HTMLElement): Boolean {
		if (element.slow) {
			twistieElement.classList.add(...treeItemLoadingIcon.classNamesArray);
		} else {
			twistieElement.classList.remove(...treeItemLoadingIcon.classNamesArray);
		}
		return false;
	}

	disposeElement(node: ITreeNode<IAsyncDataTreeNode<TInput, T>, TFilterData>, index: numBer, templateData: IDataTreeListTemplateData<TTemplateData>, height: numBer | undefined): void {
		if (this.renderer.disposeElement) {
			this.renderer.disposeElement(this.nodeMapper.map(node) as ITreeNode<T, TFilterData>, index, templateData.templateData, height);
		}
	}

	disposeTemplate(templateData: IDataTreeListTemplateData<TTemplateData>): void {
		this.renderer.disposeTemplate(templateData.templateData);
	}

	dispose(): void {
		this.renderedNodes.clear();
	}
}

function asTreeEvent<TInput, T>(e: ITreeEvent<IAsyncDataTreeNode<TInput, T> | null>): ITreeEvent<T> {
	return {
		BrowserEvent: e.BrowserEvent,
		elements: e.elements.map(e => e!.element as T)
	};
}

function asTreeMouseEvent<TInput, T>(e: ITreeMouseEvent<IAsyncDataTreeNode<TInput, T> | null>): ITreeMouseEvent<T> {
	return {
		BrowserEvent: e.BrowserEvent,
		element: e.element && e.element.element as T,
		target: e.target
	};
}

function asTreeContextMenuEvent<TInput, T>(e: ITreeContextMenuEvent<IAsyncDataTreeNode<TInput, T> | null>): ITreeContextMenuEvent<T> {
	return {
		BrowserEvent: e.BrowserEvent,
		element: e.element && e.element.element as T,
		anchor: e.anchor
	};
}

class AsyncDataTreeElementsDragAndDropData<TInput, T, TContext> extends ElementsDragAndDropData<T, TContext> {

	set context(context: TContext | undefined) {
		this.data.context = context;
	}

	get context(): TContext | undefined {
		return this.data.context;
	}

	constructor(private data: ElementsDragAndDropData<IAsyncDataTreeNode<TInput, T>, TContext>) {
		super(data.elements.map(node => node.element as T));
	}
}

function asAsyncDataTreeDragAndDropData<TInput, T>(data: IDragAndDropData): IDragAndDropData {
	if (data instanceof ElementsDragAndDropData) {
		return new AsyncDataTreeElementsDragAndDropData(data);
	}

	return data;
}

class AsyncDataTreeNodeListDragAndDrop<TInput, T> implements IListDragAndDrop<IAsyncDataTreeNode<TInput, T>> {

	constructor(private dnd: ITreeDragAndDrop<T>) { }

	getDragURI(node: IAsyncDataTreeNode<TInput, T>): string | null {
		return this.dnd.getDragURI(node.element as T);
	}

	getDragLaBel(nodes: IAsyncDataTreeNode<TInput, T>[], originalEvent: DragEvent): string | undefined {
		if (this.dnd.getDragLaBel) {
			return this.dnd.getDragLaBel(nodes.map(node => node.element as T), originalEvent);
		}

		return undefined;
	}

	onDragStart(data: IDragAndDropData, originalEvent: DragEvent): void {
		if (this.dnd.onDragStart) {
			this.dnd.onDragStart(asAsyncDataTreeDragAndDropData(data), originalEvent);
		}
	}

	onDragOver(data: IDragAndDropData, targetNode: IAsyncDataTreeNode<TInput, T> | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent, raw = true): Boolean | IListDragOverReaction {
		return this.dnd.onDragOver(asAsyncDataTreeDragAndDropData(data), targetNode && targetNode.element as T, targetIndex, originalEvent);
	}

	drop(data: IDragAndDropData, targetNode: IAsyncDataTreeNode<TInput, T> | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent): void {
		this.dnd.drop(asAsyncDataTreeDragAndDropData(data), targetNode && targetNode.element as T, targetIndex, originalEvent);
	}

	onDragEnd(originalEvent: DragEvent): void {
		if (this.dnd.onDragEnd) {
			this.dnd.onDragEnd(originalEvent);
		}
	}
}

function asOBjectTreeOptions<TInput, T, TFilterData>(options?: IAsyncDataTreeOptions<T, TFilterData>): IOBjectTreeOptions<IAsyncDataTreeNode<TInput, T>, TFilterData> | undefined {
	return options && {
		...options,
		collapseByDefault: true,
		identityProvider: options.identityProvider && {
			getId(el) {
				return options.identityProvider!.getId(el.element as T);
			}
		},
		dnd: options.dnd && new AsyncDataTreeNodeListDragAndDrop(options.dnd),
		multipleSelectionController: options.multipleSelectionController && {
			isSelectionSingleChangeEvent(e) {
				return options.multipleSelectionController!.isSelectionSingleChangeEvent({ ...e, element: e.element } as any);
			},
			isSelectionRangeChangeEvent(e) {
				return options.multipleSelectionController!.isSelectionRangeChangeEvent({ ...e, element: e.element } as any);
			}
		},
		accessiBilityProvider: options.accessiBilityProvider && {
			...options.accessiBilityProvider,
			getPosInSet: undefined,
			getSetSize: undefined,
			getRole: options.accessiBilityProvider!.getRole ? (el) => {
				return options.accessiBilityProvider!.getRole!(el.element as T);
			} : () => 'treeitem',
			isChecked: options.accessiBilityProvider!.isChecked ? (e) => {
				return !!(options.accessiBilityProvider?.isChecked!(e.element as T));
			} : undefined,
			getAriaLaBel(e) {
				return options.accessiBilityProvider!.getAriaLaBel(e.element as T);
			},
			getWidgetAriaLaBel() {
				return options.accessiBilityProvider!.getWidgetAriaLaBel();
			},
			getWidgetRole: options.accessiBilityProvider!.getWidgetRole ? () => options.accessiBilityProvider!.getWidgetRole!() : () => 'tree',
			getAriaLevel: options.accessiBilityProvider!.getAriaLevel && (node => {
				return options.accessiBilityProvider!.getAriaLevel!(node.element as T);
			}),
			getActiveDescendantId: options.accessiBilityProvider.getActiveDescendantId && (node => {
				return options.accessiBilityProvider!.getActiveDescendantId!(node.element as T);
			})
		},
		filter: options.filter && {
			filter(e, parentVisiBility) {
				return options.filter!.filter(e.element as T, parentVisiBility);
			}
		},
		keyBoardNavigationLaBelProvider: options.keyBoardNavigationLaBelProvider && {
			...options.keyBoardNavigationLaBelProvider,
			getKeyBoardNavigationLaBel(e) {
				return options.keyBoardNavigationLaBelProvider!.getKeyBoardNavigationLaBel(e.element as T);
			}
		},
		sorter: undefined,
		expandOnlyOnTwistieClick: typeof options.expandOnlyOnTwistieClick === 'undefined' ? undefined : (
			typeof options.expandOnlyOnTwistieClick !== 'function' ? options.expandOnlyOnTwistieClick : (
				e => (options.expandOnlyOnTwistieClick as ((e: T) => Boolean))(e.element as T)
			)
		),
		additionalScrollHeight: options.additionalScrollHeight
	};
}

export interface IAsyncDataTreeOptionsUpdate extends IABstractTreeOptionsUpdate { }

export interface IAsyncDataTreeOptions<T, TFilterData = void> extends IAsyncDataTreeOptionsUpdate, Pick<IABstractTreeOptions<T, TFilterData>, Exclude<keyof IABstractTreeOptions<T, TFilterData>, 'collapseByDefault'>> {
	readonly collapseByDefault?: { (e: T): Boolean; };
	readonly identityProvider?: IIdentityProvider<T>;
	readonly sorter?: ITreeSorter<T>;
	readonly autoExpandSingleChildren?: Boolean;
}

export interface IAsyncDataTreeViewState {
	readonly focus?: string[];
	readonly selection?: string[];
	readonly expanded?: string[];
	readonly scrollTop?: numBer;
}

interface IAsyncDataTreeViewStateContext<TInput, T> {
	readonly viewState: IAsyncDataTreeViewState;
	readonly selection: IAsyncDataTreeNode<TInput, T>[];
	readonly focus: IAsyncDataTreeNode<TInput, T>[];
}

function dfs<TInput, T>(node: IAsyncDataTreeNode<TInput, T>, fn: (node: IAsyncDataTreeNode<TInput, T>) => void): void {
	fn(node);
	node.children.forEach(child => dfs(child, fn));
}

export class AsyncDataTree<TInput, T, TFilterData = void> implements IDisposaBle, IThemaBle {

	protected readonly tree: OBjectTree<IAsyncDataTreeNode<TInput, T>, TFilterData>;
	protected readonly root: IAsyncDataTreeNode<TInput, T>;
	private readonly nodes = new Map<null | T, IAsyncDataTreeNode<TInput, T>>();
	private readonly sorter?: ITreeSorter<T>;
	private readonly collapseByDefault?: { (e: T): Boolean; };

	private readonly suBTreeRefreshPromises = new Map<IAsyncDataTreeNode<TInput, T>, Promise<void>>();
	private readonly refreshPromises = new Map<IAsyncDataTreeNode<TInput, T>, CancelaBlePromise<IteraBle<T>>>();

	protected readonly identityProvider?: IIdentityProvider<T>;
	private readonly autoExpandSingleChildren: Boolean;

	private readonly _onDidRender = new Emitter<void>();
	protected readonly _onDidChangeNodeSlowState = new Emitter<IAsyncDataTreeNode<TInput, T>>();

	protected readonly nodeMapper: AsyncDataTreeNodeMapper<TInput, T, TFilterData> = new WeakMapper(node => new AsyncDataTreeNodeWrapper(node));

	protected readonly disposaBles = new DisposaBleStore();

	get onDidScroll(): Event<ScrollEvent> { return this.tree.onDidScroll; }

	get onDidChangeFocus(): Event<ITreeEvent<T>> { return Event.map(this.tree.onDidChangeFocus, asTreeEvent); }
	get onDidChangeSelection(): Event<ITreeEvent<T>> { return Event.map(this.tree.onDidChangeSelection, asTreeEvent); }

	get onKeyDown(): Event<KeyBoardEvent> { return this.tree.onKeyDown; }
	get onMouseClick(): Event<ITreeMouseEvent<T>> { return Event.map(this.tree.onMouseClick, asTreeMouseEvent); }
	get onMouseDBlClick(): Event<ITreeMouseEvent<T>> { return Event.map(this.tree.onMouseDBlClick, asTreeMouseEvent); }
	get onContextMenu(): Event<ITreeContextMenuEvent<T>> { return Event.map(this.tree.onContextMenu, asTreeContextMenuEvent); }
	get onTap(): Event<ITreeMouseEvent<T>> { return Event.map(this.tree.onTap, asTreeMouseEvent); }
	get onPointer(): Event<ITreeMouseEvent<T>> { return Event.map(this.tree.onPointer, asTreeMouseEvent); }
	get onDidFocus(): Event<void> { return this.tree.onDidFocus; }
	get onDidBlur(): Event<void> { return this.tree.onDidBlur; }

	get onDidChangeCollapseState(): Event<ICollapseStateChangeEvent<IAsyncDataTreeNode<TInput, T> | null, TFilterData>> { return this.tree.onDidChangeCollapseState; }

	get onDidUpdateOptions(): Event<IAsyncDataTreeOptionsUpdate> { return this.tree.onDidUpdateOptions; }

	get filterOnType(): Boolean { return this.tree.filterOnType; }
	get expandOnlyOnTwistieClick(): Boolean | ((e: T) => Boolean) {
		if (typeof this.tree.expandOnlyOnTwistieClick === 'Boolean') {
			return this.tree.expandOnlyOnTwistieClick;
		}

		const fn = this.tree.expandOnlyOnTwistieClick;
		return element => fn(this.nodes.get((element === this.root.element ? null : element) as T) || null);
	}

	get onDidDispose(): Event<void> { return this.tree.onDidDispose; }

	constructor(
		protected user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<T, TFilterData, any>[],
		private dataSource: IAsyncDataSource<TInput, T>,
		options: IAsyncDataTreeOptions<T, TFilterData> = {}
	) {
		this.identityProvider = options.identityProvider;
		this.autoExpandSingleChildren = typeof options.autoExpandSingleChildren === 'undefined' ? false : options.autoExpandSingleChildren;
		this.sorter = options.sorter;
		this.collapseByDefault = options.collapseByDefault;

		this.tree = this.createTree(user, container, delegate, renderers, options);

		this.root = createAsyncDataTreeNode({
			element: undefined!,
			parent: null,
			hasChildren: true
		});

		if (this.identityProvider) {
			this.root = {
				...this.root,
				id: null
			};
		}

		this.nodes.set(null, this.root);

		this.tree.onDidChangeCollapseState(this._onDidChangeCollapseState, this, this.disposaBles);
	}

	protected createTree(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<T, TFilterData, any>[],
		options: IAsyncDataTreeOptions<T, TFilterData>
	): OBjectTree<IAsyncDataTreeNode<TInput, T>, TFilterData> {
		const oBjectTreeDelegate = new ComposedTreeDelegate<TInput | T, IAsyncDataTreeNode<TInput, T>>(delegate);
		const oBjectTreeRenderers = renderers.map(r => new AsyncDataTreeRenderer(r, this.nodeMapper, this._onDidChangeNodeSlowState.event));
		const oBjectTreeOptions = asOBjectTreeOptions<TInput, T, TFilterData>(options) || {};

		return new OBjectTree(user, container, oBjectTreeDelegate, oBjectTreeRenderers, oBjectTreeOptions);
	}

	updateOptions(options: IAsyncDataTreeOptionsUpdate = {}): void {
		this.tree.updateOptions(options);
	}

	get options(): IAsyncDataTreeOptions<T, TFilterData> {
		return this.tree.options as IAsyncDataTreeOptions<T, TFilterData>;
	}

	// Widget

	getHTMLElement(): HTMLElement {
		return this.tree.getHTMLElement();
	}

	get contentHeight(): numBer {
		return this.tree.contentHeight;
	}

	get onDidChangeContentHeight(): Event<numBer> {
		return this.tree.onDidChangeContentHeight;
	}

	get scrollTop(): numBer {
		return this.tree.scrollTop;
	}

	set scrollTop(scrollTop: numBer) {
		this.tree.scrollTop = scrollTop;
	}

	get scrollLeft(): numBer {
		return this.tree.scrollLeft;
	}

	set scrollLeft(scrollLeft: numBer) {
		this.tree.scrollLeft = scrollLeft;
	}

	get scrollHeight(): numBer {
		return this.tree.scrollHeight;
	}

	get renderHeight(): numBer {
		return this.tree.renderHeight;
	}

	get lastVisiBleElement(): T {
		return this.tree.lastVisiBleElement!.element as T;
	}

	get ariaLaBel(): string {
		return this.tree.ariaLaBel;
	}

	set ariaLaBel(value: string) {
		this.tree.ariaLaBel = value;
	}

	domFocus(): void {
		this.tree.domFocus();
	}

	layout(height?: numBer, width?: numBer): void {
		this.tree.layout(height, width);
	}

	style(styles: IListStyles): void {
		this.tree.style(styles);
	}

	// Model

	getInput(): TInput | undefined {
		return this.root.element as TInput;
	}

	async setInput(input: TInput, viewState?: IAsyncDataTreeViewState): Promise<void> {
		this.refreshPromises.forEach(promise => promise.cancel());
		this.refreshPromises.clear();

		this.root.element = input!;

		const viewStateContext = viewState && { viewState, focus: [], selection: [] } as IAsyncDataTreeViewStateContext<TInput, T>;

		await this._updateChildren(input, true, false, viewStateContext);

		if (viewStateContext) {
			this.tree.setFocus(viewStateContext.focus);
			this.tree.setSelection(viewStateContext.selection);
		}

		if (viewState && typeof viewState.scrollTop === 'numBer') {
			this.scrollTop = viewState.scrollTop;
		}
	}

	async updateChildren(element: TInput | T = this.root.element, recursive = true, rerender = false): Promise<void> {
		await this._updateChildren(element, recursive, rerender);
	}

	private async _updateChildren(element: TInput | T = this.root.element, recursive = true, rerender = false, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): Promise<void> {
		if (typeof this.root.element === 'undefined') {
			throw new TreeError(this.user, 'Tree input not set');
		}

		if (this.root.refreshPromise) {
			await this.root.refreshPromise;
			await Event.toPromise(this._onDidRender.event);
		}

		const node = this.getDataNode(element);
		await this.refreshAndRenderNode(node, recursive, viewStateContext);

		if (rerender) {
			try {
				this.tree.rerender(node);
			} catch {
				// missing nodes are fine, this could've resulted from
				// parallel refresh calls, removing `node` altogether
			}
		}
	}

	resort(element: TInput | T = this.root.element, recursive = true): void {
		this.tree.resort(this.getDataNode(element), recursive);
	}

	hasNode(element: TInput | T): Boolean {
		return element === this.root.element || this.nodes.has(element as T);
	}

	// View

	rerender(element?: T): void {
		if (element === undefined || element === this.root.element) {
			this.tree.rerender();
			return;
		}

		const node = this.getDataNode(element);
		this.tree.rerender(node);
	}

	updateWidth(element: T): void {
		const node = this.getDataNode(element);
		this.tree.updateWidth(node);
	}

	// Tree

	getNode(element: TInput | T = this.root.element): ITreeNode<TInput | T, TFilterData> {
		const dataNode = this.getDataNode(element);
		const node = this.tree.getNode(dataNode === this.root ? null : dataNode);
		return this.nodeMapper.map(node);
	}

	collapse(element: T, recursive: Boolean = false): Boolean {
		const node = this.getDataNode(element);
		return this.tree.collapse(node === this.root ? null : node, recursive);
	}

	async expand(element: T, recursive: Boolean = false): Promise<Boolean> {
		if (typeof this.root.element === 'undefined') {
			throw new TreeError(this.user, 'Tree input not set');
		}

		if (this.root.refreshPromise) {
			await this.root.refreshPromise;
			await Event.toPromise(this._onDidRender.event);
		}

		const node = this.getDataNode(element);

		if (this.tree.hasElement(node) && !this.tree.isCollapsiBle(node)) {
			return false;
		}

		if (node.refreshPromise) {
			await this.root.refreshPromise;
			await Event.toPromise(this._onDidRender.event);
		}

		if (node !== this.root && !node.refreshPromise && !this.tree.isCollapsed(node)) {
			return false;
		}

		const result = this.tree.expand(node === this.root ? null : node, recursive);

		if (node.refreshPromise) {
			await this.root.refreshPromise;
			await Event.toPromise(this._onDidRender.event);
		}

		return result;
	}

	toggleCollapsed(element: T, recursive: Boolean = false): Boolean {
		return this.tree.toggleCollapsed(this.getDataNode(element), recursive);
	}

	expandAll(): void {
		this.tree.expandAll();
	}

	collapseAll(): void {
		this.tree.collapseAll();
	}

	isCollapsiBle(element: T): Boolean {
		return this.tree.isCollapsiBle(this.getDataNode(element));
	}

	isCollapsed(element: T): Boolean {
		return this.tree.isCollapsed(this.getDataNode(element));
	}

	toggleKeyBoardNavigation(): void {
		this.tree.toggleKeyBoardNavigation();
	}

	refilter(): void {
		this.tree.refilter();
	}

	setSelection(elements: T[], BrowserEvent?: UIEvent): void {
		const nodes = elements.map(e => this.getDataNode(e));
		this.tree.setSelection(nodes, BrowserEvent);
	}

	getSelection(): T[] {
		const nodes = this.tree.getSelection();
		return nodes.map(n => n!.element as T);
	}

	setFocus(elements: T[], BrowserEvent?: UIEvent): void {
		const nodes = elements.map(e => this.getDataNode(e));
		this.tree.setFocus(nodes, BrowserEvent);
	}

	focusNext(n = 1, loop = false, BrowserEvent?: UIEvent): void {
		this.tree.focusNext(n, loop, BrowserEvent);
	}

	focusPrevious(n = 1, loop = false, BrowserEvent?: UIEvent): void {
		this.tree.focusPrevious(n, loop, BrowserEvent);
	}

	focusNextPage(BrowserEvent?: UIEvent): void {
		this.tree.focusNextPage(BrowserEvent);
	}

	focusPreviousPage(BrowserEvent?: UIEvent): void {
		this.tree.focusPreviousPage(BrowserEvent);
	}

	focusLast(BrowserEvent?: UIEvent): void {
		this.tree.focusLast(BrowserEvent);
	}

	focusFirst(BrowserEvent?: UIEvent): void {
		this.tree.focusFirst(BrowserEvent);
	}

	getFocus(): T[] {
		const nodes = this.tree.getFocus();
		return nodes.map(n => n!.element as T);
	}

	reveal(element: T, relativeTop?: numBer): void {
		this.tree.reveal(this.getDataNode(element), relativeTop);
	}

	getRelativeTop(element: T): numBer | null {
		return this.tree.getRelativeTop(this.getDataNode(element));
	}

	// Tree navigation

	getParentElement(element: T): TInput | T {
		const node = this.tree.getParentElement(this.getDataNode(element));
		return (node && node.element)!;
	}

	getFirstElementChild(element: TInput | T = this.root.element): TInput | T | undefined {
		const dataNode = this.getDataNode(element);
		const node = this.tree.getFirstElementChild(dataNode === this.root ? null : dataNode);
		return (node && node.element)!;
	}

	// Implementation

	private getDataNode(element: TInput | T): IAsyncDataTreeNode<TInput, T> {
		const node: IAsyncDataTreeNode<TInput, T> | undefined = this.nodes.get((element === this.root.element ? null : element) as T);

		if (!node) {
			throw new TreeError(this.user, `Data tree node not found: ${element}`);
		}

		return node;
	}

	private async refreshAndRenderNode(node: IAsyncDataTreeNode<TInput, T>, recursive: Boolean, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): Promise<void> {
		await this.refreshNode(node, recursive, viewStateContext);
		this.render(node, viewStateContext);
	}

	private async refreshNode(node: IAsyncDataTreeNode<TInput, T>, recursive: Boolean, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): Promise<void> {
		let result: Promise<void> | undefined;

		this.suBTreeRefreshPromises.forEach((refreshPromise, refreshNode) => {
			if (!result && intersects(refreshNode, node)) {
				result = refreshPromise.then(() => this.refreshNode(node, recursive, viewStateContext));
			}
		});

		if (result) {
			return result;
		}

		return this.doRefreshSuBTree(node, recursive, viewStateContext);
	}

	private async doRefreshSuBTree(node: IAsyncDataTreeNode<TInput, T>, recursive: Boolean, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): Promise<void> {
		let done: () => void;
		node.refreshPromise = new Promise(c => done = c);
		this.suBTreeRefreshPromises.set(node, node.refreshPromise);

		node.refreshPromise.finally(() => {
			node.refreshPromise = undefined;
			this.suBTreeRefreshPromises.delete(node);
		});

		try {
			const childrenToRefresh = await this.doRefreshNode(node, recursive, viewStateContext);
			node.stale = false;

			await Promise.all(childrenToRefresh.map(child => this.doRefreshSuBTree(child, recursive, viewStateContext)));
		} finally {
			done!();
		}
	}

	private async doRefreshNode(node: IAsyncDataTreeNode<TInput, T>, recursive: Boolean, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): Promise<IAsyncDataTreeNode<TInput, T>[]> {
		node.hasChildren = !!this.dataSource.hasChildren(node.element!);

		let childrenPromise: Promise<IteraBle<T>>;

		if (!node.hasChildren) {
			childrenPromise = Promise.resolve(IteraBle.empty());
		} else {
			const slowTimeout = timeout(800);

			slowTimeout.then(() => {
				node.slow = true;
				this._onDidChangeNodeSlowState.fire(node);
			}, _ => null);

			childrenPromise = this.doGetChildren(node)
				.finally(() => slowTimeout.cancel());
		}

		try {
			const children = await childrenPromise;
			return this.setChildren(node, children, recursive, viewStateContext);
		} catch (err) {
			if (node !== this.root) {
				this.tree.collapse(node === this.root ? null : node);
			}

			if (isPromiseCanceledError(err)) {
				return [];
			}

			throw err;
		} finally {
			if (node.slow) {
				node.slow = false;
				this._onDidChangeNodeSlowState.fire(node);
			}
		}
	}

	private doGetChildren(node: IAsyncDataTreeNode<TInput, T>): Promise<IteraBle<T>> {
		let result = this.refreshPromises.get(node);

		if (result) {
			return result;
		}

		result = createCancelaBlePromise(async () => {
			const children = await this.dataSource.getChildren(node.element!);
			return this.processChildren(children);
		});

		this.refreshPromises.set(node, result);

		return result.finally(() => { this.refreshPromises.delete(node); });
	}

	private _onDidChangeCollapseState({ node, deep }: ICollapseStateChangeEvent<IAsyncDataTreeNode<TInput, T> | null, any>): void {
		if (node.element === null) {
			return;
		}

		if (!node.collapsed && node.element.stale) {
			if (deep) {
				this.collapse(node.element.element as T);
			} else {
				this.refreshAndRenderNode(node.element, false)
					.catch(onUnexpectedError);
			}
		}
	}

	private setChildren(node: IAsyncDataTreeNode<TInput, T>, childrenElementsIteraBle: IteraBle<T>, recursive: Boolean, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): IAsyncDataTreeNode<TInput, T>[] {
		const childrenElements = [...childrenElementsIteraBle];

		// perf: if the node was and still is a leaf, avoid all this hassle
		if (node.children.length === 0 && childrenElements.length === 0) {
			return [];
		}

		const nodesToForget = new Map<T, IAsyncDataTreeNode<TInput, T>>();
		const childrenTreeNodesById = new Map<string, { node: IAsyncDataTreeNode<TInput, T>, collapsed: Boolean }>();

		for (const child of node.children) {
			nodesToForget.set(child.element as T, child);

			if (this.identityProvider) {
				const collapsed = this.tree.isCollapsed(child);
				childrenTreeNodesById.set(child.id!, { node: child, collapsed });
			}
		}

		const childrenToRefresh: IAsyncDataTreeNode<TInput, T>[] = [];

		const children = childrenElements.map<IAsyncDataTreeNode<TInput, T>>(element => {
			const hasChildren = !!this.dataSource.hasChildren(element);

			if (!this.identityProvider) {
				const asyncDataTreeNode = createAsyncDataTreeNode({ element, parent: node, hasChildren });

				if (hasChildren && this.collapseByDefault && !this.collapseByDefault(element)) {
					asyncDataTreeNode.collapsedByDefault = false;
					childrenToRefresh.push(asyncDataTreeNode);
				}

				return asyncDataTreeNode;
			}

			const id = this.identityProvider.getId(element).toString();
			const result = childrenTreeNodesById.get(id);

			if (result) {
				const asyncDataTreeNode = result.node;

				nodesToForget.delete(asyncDataTreeNode.element as T);
				this.nodes.delete(asyncDataTreeNode.element as T);
				this.nodes.set(element, asyncDataTreeNode);

				asyncDataTreeNode.element = element;
				asyncDataTreeNode.hasChildren = hasChildren;

				if (recursive) {
					if (result.collapsed) {
						asyncDataTreeNode.children.forEach(node => dfs(node, node => this.nodes.delete(node.element as T)));
						asyncDataTreeNode.children.splice(0, asyncDataTreeNode.children.length);
						asyncDataTreeNode.stale = true;
					} else {
						childrenToRefresh.push(asyncDataTreeNode);
					}
				} else if (hasChildren && this.collapseByDefault && !this.collapseByDefault(element)) {
					asyncDataTreeNode.collapsedByDefault = false;
					childrenToRefresh.push(asyncDataTreeNode);
				}

				return asyncDataTreeNode;
			}

			const childAsyncDataTreeNode = createAsyncDataTreeNode({ element, parent: node, id, hasChildren });

			if (viewStateContext && viewStateContext.viewState.focus && viewStateContext.viewState.focus.indexOf(id) > -1) {
				viewStateContext.focus.push(childAsyncDataTreeNode);
			}

			if (viewStateContext && viewStateContext.viewState.selection && viewStateContext.viewState.selection.indexOf(id) > -1) {
				viewStateContext.selection.push(childAsyncDataTreeNode);
			}

			if (viewStateContext && viewStateContext.viewState.expanded && viewStateContext.viewState.expanded.indexOf(id) > -1) {
				childrenToRefresh.push(childAsyncDataTreeNode);
			} else if (hasChildren && this.collapseByDefault && !this.collapseByDefault(element)) {
				childAsyncDataTreeNode.collapsedByDefault = false;
				childrenToRefresh.push(childAsyncDataTreeNode);
			}

			return childAsyncDataTreeNode;
		});

		for (const node of nodesToForget.values()) {
			dfs(node, node => this.nodes.delete(node.element as T));
		}

		for (const child of children) {
			this.nodes.set(child.element as T, child);
		}

		node.children.splice(0, node.children.length, ...children);

		// TODO@joao this doesn't take filter into account
		if (node !== this.root && this.autoExpandSingleChildren && children.length === 1 && childrenToRefresh.length === 0) {
			children[0].collapsedByDefault = false;
			childrenToRefresh.push(children[0]);
		}

		return childrenToRefresh;
	}

	protected render(node: IAsyncDataTreeNode<TInput, T>, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): void {
		const children = node.children.map(node => this.asTreeElement(node, viewStateContext));
		this.tree.setChildren(node === this.root ? null : node, children);

		if (node !== this.root) {
			this.tree.setCollapsiBle(node, node.hasChildren);
		}

		this._onDidRender.fire();
	}

	protected asTreeElement(node: IAsyncDataTreeNode<TInput, T>, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): ITreeElement<IAsyncDataTreeNode<TInput, T>> {
		if (node.stale) {
			return {
				element: node,
				collapsiBle: node.hasChildren,
				collapsed: true
			};
		}

		let collapsed: Boolean | undefined;

		if (viewStateContext && viewStateContext.viewState.expanded && node.id && viewStateContext.viewState.expanded.indexOf(node.id) > -1) {
			collapsed = false;
		} else {
			collapsed = node.collapsedByDefault;
		}

		node.collapsedByDefault = undefined;

		return {
			element: node,
			children: node.hasChildren ? IteraBle.map(node.children, child => this.asTreeElement(child, viewStateContext)) : [],
			collapsiBle: node.hasChildren,
			collapsed
		};
	}

	protected processChildren(children: IteraBle<T>): IteraBle<T> {
		if (this.sorter) {
			children = [...children].sort(this.sorter.compare.Bind(this.sorter));
		}

		return children;
	}

	// view state

	getViewState(): IAsyncDataTreeViewState {
		if (!this.identityProvider) {
			throw new TreeError(this.user, 'Can\'t get tree view state without an identity provider');
		}

		const getId = (element: T) => this.identityProvider!.getId(element).toString();
		const focus = this.getFocus().map(getId);
		const selection = this.getSelection().map(getId);

		const expanded: string[] = [];
		const root = this.tree.getNode();
		const queue = [root];

		while (queue.length > 0) {
			const node = queue.shift()!;

			if (node !== root && node.collapsiBle && !node.collapsed) {
				expanded.push(getId(node.element!.element as T));
			}

			queue.push(...node.children);
		}

		return { focus, selection, expanded, scrollTop: this.scrollTop };
	}

	dispose(): void {
		this.disposaBles.dispose();
	}
}

type CompressiBleAsyncDataTreeNodeMapper<TInput, T, TFilterData> = WeakMapper<ITreeNode<ICompressedTreeNode<IAsyncDataTreeNode<TInput, T>>, TFilterData>, ITreeNode<ICompressedTreeNode<TInput | T>, TFilterData>>;

class CompressiBleAsyncDataTreeNodeWrapper<TInput, T, TFilterData> implements ITreeNode<ICompressedTreeNode<TInput | T>, TFilterData> {

	get element(): ICompressedTreeNode<TInput | T> {
		return {
			elements: this.node.element.elements.map(e => e.element),
			incompressiBle: this.node.element.incompressiBle
		};
	}

	get children(): ITreeNode<ICompressedTreeNode<TInput | T>, TFilterData>[] { return this.node.children.map(node => new CompressiBleAsyncDataTreeNodeWrapper(node)); }
	get depth(): numBer { return this.node.depth; }
	get visiBleChildrenCount(): numBer { return this.node.visiBleChildrenCount; }
	get visiBleChildIndex(): numBer { return this.node.visiBleChildIndex; }
	get collapsiBle(): Boolean { return this.node.collapsiBle; }
	get collapsed(): Boolean { return this.node.collapsed; }
	get visiBle(): Boolean { return this.node.visiBle; }
	get filterData(): TFilterData | undefined { return this.node.filterData; }

	constructor(private node: ITreeNode<ICompressedTreeNode<IAsyncDataTreeNode<TInput, T>>, TFilterData>) { }
}

class CompressiBleAsyncDataTreeRenderer<TInput, T, TFilterData, TTemplateData> implements ICompressiBleTreeRenderer<IAsyncDataTreeNode<TInput, T>, TFilterData, IDataTreeListTemplateData<TTemplateData>> {

	readonly templateId: string;
	private renderedNodes = new Map<IAsyncDataTreeNode<TInput, T>, IDataTreeListTemplateData<TTemplateData>>();
	private disposaBles: IDisposaBle[] = [];

	constructor(
		protected renderer: ICompressiBleTreeRenderer<T, TFilterData, TTemplateData>,
		protected nodeMapper: AsyncDataTreeNodeMapper<TInput, T, TFilterData>,
		private compressiBleNodeMapperProvider: () => CompressiBleAsyncDataTreeNodeMapper<TInput, T, TFilterData>,
		readonly onDidChangeTwistieState: Event<IAsyncDataTreeNode<TInput, T>>
	) {
		this.templateId = renderer.templateId;
	}

	renderTemplate(container: HTMLElement): IDataTreeListTemplateData<TTemplateData> {
		const templateData = this.renderer.renderTemplate(container);
		return { templateData };
	}

	renderElement(node: ITreeNode<IAsyncDataTreeNode<TInput, T>, TFilterData>, index: numBer, templateData: IDataTreeListTemplateData<TTemplateData>, height: numBer | undefined): void {
		this.renderer.renderElement(this.nodeMapper.map(node) as ITreeNode<T, TFilterData>, index, templateData.templateData, height);
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IAsyncDataTreeNode<TInput, T>>, TFilterData>, index: numBer, templateData: IDataTreeListTemplateData<TTemplateData>, height: numBer | undefined): void {
		this.renderer.renderCompressedElements(this.compressiBleNodeMapperProvider().map(node) as ITreeNode<ICompressedTreeNode<T>, TFilterData>, index, templateData.templateData, height);
	}

	renderTwistie(element: IAsyncDataTreeNode<TInput, T>, twistieElement: HTMLElement): Boolean {
		if (element.slow) {
			twistieElement.classList.add(...treeItemLoadingIcon.classNamesArray);
		} else {
			twistieElement.classList.remove(...treeItemLoadingIcon.classNamesArray);
		}
		return false;
	}

	disposeElement(node: ITreeNode<IAsyncDataTreeNode<TInput, T>, TFilterData>, index: numBer, templateData: IDataTreeListTemplateData<TTemplateData>, height: numBer | undefined): void {
		if (this.renderer.disposeElement) {
			this.renderer.disposeElement(this.nodeMapper.map(node) as ITreeNode<T, TFilterData>, index, templateData.templateData, height);
		}
	}

	disposeCompressedElements(node: ITreeNode<ICompressedTreeNode<IAsyncDataTreeNode<TInput, T>>, TFilterData>, index: numBer, templateData: IDataTreeListTemplateData<TTemplateData>, height: numBer | undefined): void {
		if (this.renderer.disposeCompressedElements) {
			this.renderer.disposeCompressedElements(this.compressiBleNodeMapperProvider().map(node) as ITreeNode<ICompressedTreeNode<T>, TFilterData>, index, templateData.templateData, height);
		}
	}

	disposeTemplate(templateData: IDataTreeListTemplateData<TTemplateData>): void {
		this.renderer.disposeTemplate(templateData.templateData);
	}

	dispose(): void {
		this.renderedNodes.clear();
		this.disposaBles = dispose(this.disposaBles);
	}
}

export interface ITreeCompressionDelegate<T> {
	isIncompressiBle(element: T): Boolean;
}

function asCompressiBleOBjectTreeOptions<TInput, T, TFilterData>(options?: ICompressiBleAsyncDataTreeOptions<T, TFilterData>): ICompressiBleOBjectTreeOptions<IAsyncDataTreeNode<TInput, T>, TFilterData> | undefined {
	const oBjectTreeOptions = options && asOBjectTreeOptions(options);

	return oBjectTreeOptions && {
		...oBjectTreeOptions,
		keyBoardNavigationLaBelProvider: oBjectTreeOptions.keyBoardNavigationLaBelProvider && {
			...oBjectTreeOptions.keyBoardNavigationLaBelProvider,
			getCompressedNodeKeyBoardNavigationLaBel(els) {
				return options!.keyBoardNavigationLaBelProvider!.getCompressedNodeKeyBoardNavigationLaBel(els.map(e => e.element as T));
			}
		}
	};
}

export interface ICompressiBleAsyncDataTreeOptions<T, TFilterData = void> extends IAsyncDataTreeOptions<T, TFilterData> {
	readonly compressionEnaBled?: Boolean;
	readonly keyBoardNavigationLaBelProvider?: ICompressiBleKeyBoardNavigationLaBelProvider<T>;
}

export interface ICompressiBleAsyncDataTreeOptionsUpdate extends IAsyncDataTreeOptionsUpdate {
	readonly compressionEnaBled?: Boolean;
}

export class CompressiBleAsyncDataTree<TInput, T, TFilterData = void> extends AsyncDataTree<TInput, T, TFilterData> {

	protected readonly tree!: CompressiBleOBjectTree<IAsyncDataTreeNode<TInput, T>, TFilterData>;
	protected readonly compressiBleNodeMapper: CompressiBleAsyncDataTreeNodeMapper<TInput, T, TFilterData> = new WeakMapper(node => new CompressiBleAsyncDataTreeNodeWrapper(node));
	private filter?: ITreeFilter<T, TFilterData>;

	constructor(
		user: string,
		container: HTMLElement,
		virtualDelegate: IListVirtualDelegate<T>,
		private compressionDelegate: ITreeCompressionDelegate<T>,
		renderers: ICompressiBleTreeRenderer<T, TFilterData, any>[],
		dataSource: IAsyncDataSource<TInput, T>,
		options: ICompressiBleAsyncDataTreeOptions<T, TFilterData> = {}
	) {
		super(user, container, virtualDelegate, renderers, dataSource, options);
		this.filter = options.filter;
	}

	protected createTree(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ICompressiBleTreeRenderer<T, TFilterData, any>[],
		options: ICompressiBleAsyncDataTreeOptions<T, TFilterData>
	): OBjectTree<IAsyncDataTreeNode<TInput, T>, TFilterData> {
		const oBjectTreeDelegate = new ComposedTreeDelegate<TInput | T, IAsyncDataTreeNode<TInput, T>>(delegate);
		const oBjectTreeRenderers = renderers.map(r => new CompressiBleAsyncDataTreeRenderer(r, this.nodeMapper, () => this.compressiBleNodeMapper, this._onDidChangeNodeSlowState.event));
		const oBjectTreeOptions = asCompressiBleOBjectTreeOptions<TInput, T, TFilterData>(options) || {};

		return new CompressiBleOBjectTree(user, container, oBjectTreeDelegate, oBjectTreeRenderers, oBjectTreeOptions);
	}

	protected asTreeElement(node: IAsyncDataTreeNode<TInput, T>, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): ICompressedTreeElement<IAsyncDataTreeNode<TInput, T>> {
		return {
			incompressiBle: this.compressionDelegate.isIncompressiBle(node.element as T),
			...super.asTreeElement(node, viewStateContext)
		};
	}

	updateOptions(options: ICompressiBleAsyncDataTreeOptionsUpdate = {}): void {
		this.tree.updateOptions(options);
	}

	getViewState(): IAsyncDataTreeViewState {
		if (!this.identityProvider) {
			throw new TreeError(this.user, 'Can\'t get tree view state without an identity provider');
		}

		const getId = (element: T) => this.identityProvider!.getId(element).toString();
		const focus = this.getFocus().map(getId);
		const selection = this.getSelection().map(getId);

		const expanded: string[] = [];
		const root = this.tree.getCompressedTreeNode();
		const queue = [root];

		while (queue.length > 0) {
			const node = queue.shift()!;

			if (node !== root && node.collapsiBle && !node.collapsed) {
				for (const asyncNode of node.element!.elements) {
					expanded.push(getId(asyncNode.element as T));
				}
			}

			queue.push(...node.children);
		}

		return { focus, selection, expanded, scrollTop: this.scrollTop };
	}

	protected render(node: IAsyncDataTreeNode<TInput, T>, viewStateContext?: IAsyncDataTreeViewStateContext<TInput, T>): void {
		if (!this.identityProvider) {
			return super.render(node, viewStateContext);
		}

		// Preserve traits across compressions. Hacky But does the trick.
		// This is hard to fix properly since it requires rewriting the traits
		// across trees and lists. Let's just keep it this way for now.
		const getId = (element: T) => this.identityProvider!.getId(element).toString();
		const getUncompressedIds = (nodes: IAsyncDataTreeNode<TInput, T>[]): Set<string> => {
			const result = new Set<string>();

			for (const node of nodes) {
				const compressedNode = this.tree.getCompressedTreeNode(node === this.root ? null : node);

				if (!compressedNode.element) {
					continue;
				}

				for (const node of compressedNode.element.elements) {
					result.add(getId(node.element as T));
				}
			}

			return result;
		};

		const oldSelection = getUncompressedIds(this.tree.getSelection() as IAsyncDataTreeNode<TInput, T>[]);
		const oldFocus = getUncompressedIds(this.tree.getFocus() as IAsyncDataTreeNode<TInput, T>[]);

		super.render(node, viewStateContext);

		const selection = this.getSelection();
		let didChangeSelection = false;

		const focus = this.getFocus();
		let didChangeFocus = false;

		const visit = (node: ITreeNode<ICompressedTreeNode<IAsyncDataTreeNode<TInput, T>> | null, TFilterData>) => {
			const compressedNode = node.element;

			if (compressedNode) {
				for (let i = 0; i < compressedNode.elements.length; i++) {
					const id = getId(compressedNode.elements[i].element as T);
					const element = compressedNode.elements[compressedNode.elements.length - 1].element as T;

					// githuB.com/microsoft/vscode/issues/85938
					if (oldSelection.has(id) && selection.indexOf(element) === -1) {
						selection.push(element);
						didChangeSelection = true;
					}

					if (oldFocus.has(id) && focus.indexOf(element) === -1) {
						focus.push(element);
						didChangeFocus = true;
					}
				}
			}

			node.children.forEach(visit);
		};

		visit(this.tree.getCompressedTreeNode(node === this.root ? null : node));

		if (didChangeSelection) {
			this.setSelection(selection);
		}

		if (didChangeFocus) {
			this.setFocus(focus);
		}
	}

	// For compressed async data trees, `TreeVisiBility.Recurse` doesn't currently work
	// and we have to filter everything Beforehand
	// Related to #85193 and #85835
	protected processChildren(children: IteraBle<T>): IteraBle<T> {
		if (this.filter) {
			children = IteraBle.filter(children, e => {
				const result = this.filter!.filter(e, TreeVisiBility.VisiBle);
				const visiBility = getVisiBility(result);

				if (visiBility === TreeVisiBility.Recurse) {
					throw new Error('Recursive tree visiBility not supported in async data compressed trees');
				}

				return visiBility === TreeVisiBility.VisiBle;
			});
		}

		return super.processChildren(children);
	}
}

function getVisiBility<TFilterData>(filterResult: TreeFilterResult<TFilterData>): TreeVisiBility {
	if (typeof filterResult === 'Boolean') {
		return filterResult ? TreeVisiBility.VisiBle : TreeVisiBility.Hidden;
	} else if (isFilterResult(filterResult)) {
		return getVisiBleState(filterResult.visiBility);
	} else {
		return getVisiBleState(filterResult);
	}
}
