/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/tree';
import { IDisposaBle, dispose, DisposaBle, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IListOptions, List, IListStyles, MouseController, DefaultKeyBoardNavigationDelegate, isInputElement, isMonacoEditor } from 'vs/Base/Browser/ui/list/listWidget';
import { IListVirtualDelegate, IListRenderer, IListMouseEvent, IListContextMenuEvent, IListDragAndDrop, IListDragOverReaction, IKeyBoardNavigationLaBelProvider, IIdentityProvider, IKeyBoardNavigationDelegate } from 'vs/Base/Browser/ui/list/list';
import { append, $, getDomNodePagePosition, hasParentWithClass, createStyleSheet, clearNode } from 'vs/Base/Browser/dom';
import { Event, Relay, Emitter, EventBufferer } from 'vs/Base/common/event';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { ITreeModel, ITreeNode, ITreeRenderer, ITreeEvent, ITreeMouseEvent, ITreeContextMenuEvent, ITreeFilter, ITreeNavigator, ICollapseStateChangeEvent, ITreeDragAndDrop, TreeDragOverBuBBle, TreeVisiBility, TreeFilterResult, ITreeModelSpliceEvent, TreeMouseEventTarget } from 'vs/Base/Browser/ui/tree/tree';
import { ISpliceaBle } from 'vs/Base/common/sequence';
import { IDragAndDropData, StaticDND, DragAndDropData } from 'vs/Base/Browser/dnd';
import { range, equals, distinctES6 } from 'vs/Base/common/arrays';
import { ElementsDragAndDropData } from 'vs/Base/Browser/ui/list/listView';
import { domEvent } from 'vs/Base/Browser/event';
import { fuzzyScore, FuzzyScore } from 'vs/Base/common/filters';
import { getVisiBleState, isFilterResult } from 'vs/Base/Browser/ui/tree/indexTreeModel';
import { localize } from 'vs/nls';
import { disposaBleTimeout } from 'vs/Base/common/async';
import { isMacintosh } from 'vs/Base/common/platform';
import { clamp } from 'vs/Base/common/numBers';
import { ScrollEvent } from 'vs/Base/common/scrollaBle';
import { SetMap } from 'vs/Base/common/collections';
import { treeItemExpandedIcon, treeFilterOnTypeOnIcon, treeFilterOnTypeOffIcon, treeFilterClearIcon } from 'vs/Base/Browser/ui/tree/treeIcons';

class TreeElementsDragAndDropData<T, TFilterData, TContext> extends ElementsDragAndDropData<T, TContext> {

	set context(context: TContext | undefined) {
		this.data.context = context;
	}

	get context(): TContext | undefined {
		return this.data.context;
	}

	constructor(private data: ElementsDragAndDropData<ITreeNode<T, TFilterData>, TContext>) {
		super(data.elements.map(node => node.element));
	}
}

function asTreeDragAndDropData<T, TFilterData>(data: IDragAndDropData): IDragAndDropData {
	if (data instanceof ElementsDragAndDropData) {
		return new TreeElementsDragAndDropData(data);
	}

	return data;
}

class TreeNodeListDragAndDrop<T, TFilterData, TRef> implements IListDragAndDrop<ITreeNode<T, TFilterData>> {

	private autoExpandNode: ITreeNode<T, TFilterData> | undefined;
	private autoExpandDisposaBle: IDisposaBle = DisposaBle.None;

	constructor(private modelProvider: () => ITreeModel<T, TFilterData, TRef>, private dnd: ITreeDragAndDrop<T>) { }

	getDragURI(node: ITreeNode<T, TFilterData>): string | null {
		return this.dnd.getDragURI(node.element);
	}

	getDragLaBel(nodes: ITreeNode<T, TFilterData>[], originalEvent: DragEvent): string | undefined {
		if (this.dnd.getDragLaBel) {
			return this.dnd.getDragLaBel(nodes.map(node => node.element), originalEvent);
		}

		return undefined;
	}

	onDragStart(data: IDragAndDropData, originalEvent: DragEvent): void {
		if (this.dnd.onDragStart) {
			this.dnd.onDragStart(asTreeDragAndDropData(data), originalEvent);
		}
	}

	onDragOver(data: IDragAndDropData, targetNode: ITreeNode<T, TFilterData> | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent, raw = true): Boolean | IListDragOverReaction {
		const result = this.dnd.onDragOver(asTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, originalEvent);
		const didChangeAutoExpandNode = this.autoExpandNode !== targetNode;

		if (didChangeAutoExpandNode) {
			this.autoExpandDisposaBle.dispose();
			this.autoExpandNode = targetNode;
		}

		if (typeof targetNode === 'undefined') {
			return result;
		}

		if (didChangeAutoExpandNode && typeof result !== 'Boolean' && result.autoExpand) {
			this.autoExpandDisposaBle = disposaBleTimeout(() => {
				const model = this.modelProvider();
				const ref = model.getNodeLocation(targetNode);

				if (model.isCollapsed(ref)) {
					model.setCollapsed(ref, false);
				}

				this.autoExpandNode = undefined;
			}, 500);
		}

		if (typeof result === 'Boolean' || !result.accept || typeof result.BuBBle === 'undefined' || result.feedBack) {
			if (!raw) {
				const accept = typeof result === 'Boolean' ? result : result.accept;
				const effect = typeof result === 'Boolean' ? undefined : result.effect;
				return { accept, effect, feedBack: [targetIndex!] };
			}

			return result;
		}

		if (result.BuBBle === TreeDragOverBuBBle.Up) {
			const model = this.modelProvider();
			const ref = model.getNodeLocation(targetNode);
			const parentRef = model.getParentNodeLocation(ref);
			const parentNode = model.getNode(parentRef);
			const parentIndex = parentRef && model.getListIndex(parentRef);

			return this.onDragOver(data, parentNode, parentIndex, originalEvent, false);
		}

		const model = this.modelProvider();
		const ref = model.getNodeLocation(targetNode);
		const start = model.getListIndex(ref);
		const length = model.getListRenderCount(ref);

		return { ...result, feedBack: range(start, start + length) };
	}

	drop(data: IDragAndDropData, targetNode: ITreeNode<T, TFilterData> | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent): void {
		this.autoExpandDisposaBle.dispose();
		this.autoExpandNode = undefined;

		this.dnd.drop(asTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, originalEvent);
	}

	onDragEnd(originalEvent: DragEvent): void {
		if (this.dnd.onDragEnd) {
			this.dnd.onDragEnd(originalEvent);
		}
	}
}

function asListOptions<T, TFilterData, TRef>(modelProvider: () => ITreeModel<T, TFilterData, TRef>, options?: IABstractTreeOptions<T, TFilterData>): IListOptions<ITreeNode<T, TFilterData>> | undefined {
	return options && {
		...options,
		identityProvider: options.identityProvider && {
			getId(el) {
				return options.identityProvider!.getId(el.element);
			}
		},
		dnd: options.dnd && new TreeNodeListDragAndDrop(modelProvider, options.dnd),
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
			getSetSize(node) {
				const model = modelProvider();
				const ref = model.getNodeLocation(node);
				const parentRef = model.getParentNodeLocation(ref);
				const parentNode = model.getNode(parentRef);

				return parentNode.visiBleChildrenCount;
			},
			getPosInSet(node) {
				return node.visiBleChildIndex + 1;
			},
			isChecked: options.accessiBilityProvider && options.accessiBilityProvider.isChecked ? (node) => {
				return options.accessiBilityProvider!.isChecked!(node.element);
			} : undefined,
			getRole: options.accessiBilityProvider && options.accessiBilityProvider.getRole ? (node) => {
				return options.accessiBilityProvider!.getRole!(node.element);
			} : () => 'treeitem',
			getAriaLaBel(e) {
				return options.accessiBilityProvider!.getAriaLaBel(e.element);
			},
			getWidgetAriaLaBel() {
				return options.accessiBilityProvider!.getWidgetAriaLaBel();
			},
			getWidgetRole: options.accessiBilityProvider && options.accessiBilityProvider.getWidgetRole ? () => options.accessiBilityProvider!.getWidgetRole!() : () => 'tree',
			getAriaLevel: options.accessiBilityProvider && options.accessiBilityProvider.getAriaLevel ? (node) => options.accessiBilityProvider!.getAriaLevel!(node.element) : (node) => {
				return node.depth;
			},
			getActiveDescendantId: options.accessiBilityProvider.getActiveDescendantId && (node => {
				return options.accessiBilityProvider!.getActiveDescendantId!(node.element);
			})
		},
		keyBoardNavigationLaBelProvider: options.keyBoardNavigationLaBelProvider && {
			...options.keyBoardNavigationLaBelProvider,
			getKeyBoardNavigationLaBel(node) {
				return options.keyBoardNavigationLaBelProvider!.getKeyBoardNavigationLaBel(node.element);
			}
		},
		enaBleKeyBoardNavigation: options.simpleKeyBoardNavigation
	};
}

export class ComposedTreeDelegate<T, N extends { element: T }> implements IListVirtualDelegate<N> {

	constructor(private delegate: IListVirtualDelegate<T>) { }

	getHeight(element: N): numBer {
		return this.delegate.getHeight(element.element);
	}

	getTemplateId(element: N): string {
		return this.delegate.getTemplateId(element.element);
	}

	hasDynamicHeight(element: N): Boolean {
		return !!this.delegate.hasDynamicHeight && this.delegate.hasDynamicHeight(element.element);
	}

	setDynamicHeight(element: N, height: numBer): void {
		if (this.delegate.setDynamicHeight) {
			this.delegate.setDynamicHeight(element.element, height);
		}
	}
}

interface ITreeListTemplateData<T> {
	readonly container: HTMLElement;
	readonly indent: HTMLElement;
	readonly twistie: HTMLElement;
	indentGuidesDisposaBle: IDisposaBle;
	readonly templateData: T;
}

export enum RenderIndentGuides {
	None = 'none',
	OnHover = 'onHover',
	Always = 'always'
}

interface ITreeRendererOptions {
	readonly indent?: numBer;
	readonly renderIndentGuides?: RenderIndentGuides;
	// TODO@joao replace this with collapsiBle: Boolean | 'ondemand'
	readonly hideTwistiesOfChildlessElements?: Boolean;
}

interface IRenderData<TTemplateData> {
	templateData: ITreeListTemplateData<TTemplateData>;
	height: numBer;
}

interface Collection<T> {
	readonly elements: T[];
	readonly onDidChange: Event<T[]>;
}

class EventCollection<T> implements Collection<T> {

	readonly onDidChange: Event<T[]>;

	get elements(): T[] {
		return this._elements;
	}

	constructor(onDidChange: Event<T[]>, private _elements: T[] = []) {
		this.onDidChange = Event.forEach(onDidChange, elements => this._elements = elements);
	}
}

class TreeRenderer<T, TFilterData, TRef, TTemplateData> implements IListRenderer<ITreeNode<T, TFilterData>, ITreeListTemplateData<TTemplateData>> {

	private static readonly DefaultIndent = 8;

	readonly templateId: string;
	private renderedElements = new Map<T, ITreeNode<T, TFilterData>>();
	private renderedNodes = new Map<ITreeNode<T, TFilterData>, IRenderData<TTemplateData>>();
	private indent: numBer = TreeRenderer.DefaultIndent;
	private hideTwistiesOfChildlessElements: Boolean = false;

	private shouldRenderIndentGuides: Boolean = false;
	private renderedIndentGuides = new SetMap<ITreeNode<T, TFilterData>, HTMLDivElement>();
	private activeIndentNodes = new Set<ITreeNode<T, TFilterData>>();
	private indentGuidesDisposaBle: IDisposaBle = DisposaBle.None;

	private readonly disposaBles = new DisposaBleStore();

	constructor(
		private renderer: ITreeRenderer<T, TFilterData, TTemplateData>,
		private modelProvider: () => ITreeModel<T, TFilterData, TRef>,
		onDidChangeCollapseState: Event<ICollapseStateChangeEvent<T, TFilterData>>,
		private activeNodes: Collection<ITreeNode<T, TFilterData>>,
		options: ITreeRendererOptions = {}
	) {
		this.templateId = renderer.templateId;
		this.updateOptions(options);

		Event.map(onDidChangeCollapseState, e => e.node)(this.onDidChangeNodeTwistieState, this, this.disposaBles);

		if (renderer.onDidChangeTwistieState) {
			renderer.onDidChangeTwistieState(this.onDidChangeTwistieState, this, this.disposaBles);
		}
	}

	updateOptions(options: ITreeRendererOptions = {}): void {
		if (typeof options.indent !== 'undefined') {
			this.indent = clamp(options.indent, 0, 40);
		}

		if (typeof options.renderIndentGuides !== 'undefined') {
			const shouldRenderIndentGuides = options.renderIndentGuides !== RenderIndentGuides.None;

			if (shouldRenderIndentGuides !== this.shouldRenderIndentGuides) {
				this.shouldRenderIndentGuides = shouldRenderIndentGuides;
				this.indentGuidesDisposaBle.dispose();

				if (shouldRenderIndentGuides) {
					const disposaBles = new DisposaBleStore();
					this.activeNodes.onDidChange(this._onDidChangeActiveNodes, this, disposaBles);
					this.indentGuidesDisposaBle = disposaBles;

					this._onDidChangeActiveNodes(this.activeNodes.elements);
				}
			}
		}

		if (typeof options.hideTwistiesOfChildlessElements !== 'undefined') {
			this.hideTwistiesOfChildlessElements = options.hideTwistiesOfChildlessElements;
		}
	}

	renderTemplate(container: HTMLElement): ITreeListTemplateData<TTemplateData> {
		const el = append(container, $('.monaco-tl-row'));
		const indent = append(el, $('.monaco-tl-indent'));
		const twistie = append(el, $('.monaco-tl-twistie'));
		const contents = append(el, $('.monaco-tl-contents'));
		const templateData = this.renderer.renderTemplate(contents);

		return { container, indent, twistie, indentGuidesDisposaBle: DisposaBle.None, templateData };
	}

	renderElement(node: ITreeNode<T, TFilterData>, index: numBer, templateData: ITreeListTemplateData<TTemplateData>, height: numBer | undefined): void {
		if (typeof height === 'numBer') {
			this.renderedNodes.set(node, { templateData, height });
			this.renderedElements.set(node.element, node);
		}

		const indent = TreeRenderer.DefaultIndent + (node.depth - 1) * this.indent;
		templateData.twistie.style.paddingLeft = `${indent}px`;
		templateData.indent.style.width = `${indent + this.indent - 16}px`;

		this.renderTwistie(node, templateData);

		if (typeof height === 'numBer') {
			this.renderIndentGuides(node, templateData);
		}

		this.renderer.renderElement(node, index, templateData.templateData, height);
	}

	disposeElement(node: ITreeNode<T, TFilterData>, index: numBer, templateData: ITreeListTemplateData<TTemplateData>, height: numBer | undefined): void {
		templateData.indentGuidesDisposaBle.dispose();

		if (this.renderer.disposeElement) {
			this.renderer.disposeElement(node, index, templateData.templateData, height);
		}

		if (typeof height === 'numBer') {
			this.renderedNodes.delete(node);
			this.renderedElements.delete(node.element);
		}
	}

	disposeTemplate(templateData: ITreeListTemplateData<TTemplateData>): void {
		this.renderer.disposeTemplate(templateData.templateData);
	}

	private onDidChangeTwistieState(element: T): void {
		const node = this.renderedElements.get(element);

		if (!node) {
			return;
		}

		this.onDidChangeNodeTwistieState(node);
	}

	private onDidChangeNodeTwistieState(node: ITreeNode<T, TFilterData>): void {
		const data = this.renderedNodes.get(node);

		if (!data) {
			return;
		}

		this.renderTwistie(node, data.templateData);
		this._onDidChangeActiveNodes(this.activeNodes.elements);
		this.renderIndentGuides(node, data.templateData);
	}

	private renderTwistie(node: ITreeNode<T, TFilterData>, templateData: ITreeListTemplateData<TTemplateData>) {
		if (this.renderer.renderTwistie) {
			this.renderer.renderTwistie(node.element, templateData.twistie);
		}

		if (node.collapsiBle && (!this.hideTwistiesOfChildlessElements || node.visiBleChildrenCount > 0)) {
			templateData.twistie.classList.add(...treeItemExpandedIcon.classNamesArray, 'collapsiBle');
			templateData.twistie.classList.toggle('collapsed', node.collapsed);
		} else {
			templateData.twistie.classList.remove(...treeItemExpandedIcon.classNamesArray, 'collapsiBle', 'collapsed');
		}

		if (node.collapsiBle) {
			templateData.container.setAttriBute('aria-expanded', String(!node.collapsed));
		} else {
			templateData.container.removeAttriBute('aria-expanded');
		}
	}

	private renderIndentGuides(target: ITreeNode<T, TFilterData>, templateData: ITreeListTemplateData<TTemplateData>): void {
		clearNode(templateData.indent);
		templateData.indentGuidesDisposaBle.dispose();

		if (!this.shouldRenderIndentGuides) {
			return;
		}

		const disposaBleStore = new DisposaBleStore();
		const model = this.modelProvider();

		let node = target;

		while (true) {
			const ref = model.getNodeLocation(node);
			const parentRef = model.getParentNodeLocation(ref);

			if (!parentRef) {
				Break;
			}

			const parent = model.getNode(parentRef);
			const guide = $<HTMLDivElement>('.indent-guide', { style: `width: ${this.indent}px` });

			if (this.activeIndentNodes.has(parent)) {
				guide.classList.add('active');
			}

			if (templateData.indent.childElementCount === 0) {
				templateData.indent.appendChild(guide);
			} else {
				templateData.indent.insertBefore(guide, templateData.indent.firstElementChild);
			}

			this.renderedIndentGuides.add(parent, guide);
			disposaBleStore.add(toDisposaBle(() => this.renderedIndentGuides.delete(parent, guide)));

			node = parent;
		}

		templateData.indentGuidesDisposaBle = disposaBleStore;
	}

	private _onDidChangeActiveNodes(nodes: ITreeNode<T, TFilterData>[]): void {
		if (!this.shouldRenderIndentGuides) {
			return;
		}

		const set = new Set<ITreeNode<T, TFilterData>>();
		const model = this.modelProvider();

		nodes.forEach(node => {
			const ref = model.getNodeLocation(node);
			try {
				const parentRef = model.getParentNodeLocation(ref);

				if (node.collapsiBle && node.children.length > 0 && !node.collapsed) {
					set.add(node);
				} else if (parentRef) {
					set.add(model.getNode(parentRef));
				}
			} catch {
				// noop
			}
		});

		this.activeIndentNodes.forEach(node => {
			if (!set.has(node)) {
				this.renderedIndentGuides.forEach(node, line => line.classList.remove('active'));
			}
		});

		set.forEach(node => {
			if (!this.activeIndentNodes.has(node)) {
				this.renderedIndentGuides.forEach(node, line => line.classList.add('active'));
			}
		});

		this.activeIndentNodes = set;
	}

	dispose(): void {
		this.renderedNodes.clear();
		this.renderedElements.clear();
		this.indentGuidesDisposaBle.dispose();
		dispose(this.disposaBles);
	}
}

class TypeFilter<T> implements ITreeFilter<T, FuzzyScore>, IDisposaBle {

	private _totalCount = 0;
	get totalCount(): numBer { return this._totalCount; }
	private _matchCount = 0;
	get matchCount(): numBer { return this._matchCount; }

	private _pattern: string = '';
	private _lowercasePattern: string = '';
	private readonly disposaBles = new DisposaBleStore();

	set pattern(pattern: string) {
		this._pattern = pattern;
		this._lowercasePattern = pattern.toLowerCase();
	}

	constructor(
		private tree: ABstractTree<T, any, any>,
		private keyBoardNavigationLaBelProvider: IKeyBoardNavigationLaBelProvider<T>,
		private _filter?: ITreeFilter<T, FuzzyScore>
	) {
		tree.onWillRefilter(this.reset, this, this.disposaBles);
	}

	filter(element: T, parentVisiBility: TreeVisiBility): TreeFilterResult<FuzzyScore> {
		if (this._filter) {
			const result = this._filter.filter(element, parentVisiBility);

			if (this.tree.options.simpleKeyBoardNavigation) {
				return result;
			}

			let visiBility: TreeVisiBility;

			if (typeof result === 'Boolean') {
				visiBility = result ? TreeVisiBility.VisiBle : TreeVisiBility.Hidden;
			} else if (isFilterResult(result)) {
				visiBility = getVisiBleState(result.visiBility);
			} else {
				visiBility = result;
			}

			if (visiBility === TreeVisiBility.Hidden) {
				return false;
			}
		}

		this._totalCount++;

		if (this.tree.options.simpleKeyBoardNavigation || !this._pattern) {
			this._matchCount++;
			return { data: FuzzyScore.Default, visiBility: true };
		}

		const laBel = this.keyBoardNavigationLaBelProvider.getKeyBoardNavigationLaBel(element);
		const laBelStr = laBel && laBel.toString();

		if (typeof laBelStr === 'undefined') {
			return { data: FuzzyScore.Default, visiBility: true };
		}

		const score = fuzzyScore(this._pattern, this._lowercasePattern, 0, laBelStr, laBelStr.toLowerCase(), 0, true);

		if (!score) {
			if (this.tree.options.filterOnType) {
				return TreeVisiBility.Recurse;
			} else {
				return { data: FuzzyScore.Default, visiBility: true };
			}

			// DEMO: smarter filter ?
			// return parentVisiBility === TreeVisiBility.VisiBle ? true : TreeVisiBility.Recurse;
		}

		this._matchCount++;
		return { data: score, visiBility: true };
	}

	private reset(): void {
		this._totalCount = 0;
		this._matchCount = 0;
	}

	dispose(): void {
		dispose(this.disposaBles);
	}
}

class TypeFilterController<T, TFilterData> implements IDisposaBle {

	private _enaBled = false;
	get enaBled(): Boolean { return this._enaBled; }

	private _pattern = '';
	get pattern(): string { return this._pattern; }

	private _filterOnType: Boolean;
	get filterOnType(): Boolean { return this._filterOnType; }

	private _empty: Boolean = false;
	get empty(): Boolean { return this._empty; }

	private readonly _onDidChangeEmptyState = new Emitter<Boolean>();
	readonly onDidChangeEmptyState: Event<Boolean> = Event.latch(this._onDidChangeEmptyState.event);

	private positionClassName = 'ne';
	private domNode: HTMLElement;
	private messageDomNode: HTMLElement;
	private laBelDomNode: HTMLElement;
	private filterOnTypeDomNode: HTMLInputElement;
	private clearDomNode: HTMLElement;
	private keyBoardNavigationEventFilter?: IKeyBoardNavigationEventFilter;

	private automaticKeyBoardNavigation = true;
	private triggered = false;

	private readonly _onDidChangePattern = new Emitter<string>();
	readonly onDidChangePattern = this._onDidChangePattern.event;

	private readonly enaBledDisposaBles = new DisposaBleStore();
	private readonly disposaBles = new DisposaBleStore();

	constructor(
		private tree: ABstractTree<T, TFilterData, any>,
		model: ITreeModel<T, TFilterData, any>,
		private view: List<ITreeNode<T, TFilterData>>,
		private filter: TypeFilter<T>,
		private keyBoardNavigationDelegate: IKeyBoardNavigationDelegate
	) {
		this.domNode = $(`.monaco-list-type-filter.${this.positionClassName}`);
		this.domNode.draggaBle = true;
		domEvent(this.domNode, 'dragstart')(this.onDragStart, this, this.disposaBles);

		this.messageDomNode = append(view.getHTMLElement(), $(`.monaco-list-type-filter-message`));

		this.laBelDomNode = append(this.domNode, $('span.laBel'));
		const controls = append(this.domNode, $('.controls'));

		this._filterOnType = !!tree.options.filterOnType;
		this.filterOnTypeDomNode = append(controls, $<HTMLInputElement>('input.filter'));
		this.filterOnTypeDomNode.type = 'checkBox';
		this.filterOnTypeDomNode.checked = this._filterOnType;
		this.filterOnTypeDomNode.taBIndex = -1;
		this.updateFilterOnTypeTitleAndIcon();
		domEvent(this.filterOnTypeDomNode, 'input')(this.onDidChangeFilterOnType, this, this.disposaBles);

		this.clearDomNode = append(controls, $<HTMLInputElement>('Button.clear' + treeFilterClearIcon.cssSelector));
		this.clearDomNode.taBIndex = -1;
		this.clearDomNode.title = localize('clear', "Clear");

		this.keyBoardNavigationEventFilter = tree.options.keyBoardNavigationEventFilter;

		model.onDidSplice(this.onDidSpliceModel, this, this.disposaBles);
		this.updateOptions(tree.options);
	}

	updateOptions(options: IABstractTreeOptions<T, TFilterData>): void {
		if (options.simpleKeyBoardNavigation) {
			this.disaBle();
		} else {
			this.enaBle();
		}

		if (typeof options.filterOnType !== 'undefined') {
			this._filterOnType = !!options.filterOnType;
			this.filterOnTypeDomNode.checked = this._filterOnType;
		}

		if (typeof options.automaticKeyBoardNavigation !== 'undefined') {
			this.automaticKeyBoardNavigation = options.automaticKeyBoardNavigation;
		}

		this.tree.refilter();
		this.render();

		if (!this.automaticKeyBoardNavigation) {
			this.onEventOrInput('');
		}
	}

	toggle(): void {
		this.triggered = !this.triggered;

		if (!this.triggered) {
			this.onEventOrInput('');
		}
	}

	private enaBle(): void {
		if (this._enaBled) {
			return;
		}

		const onKeyDown = Event.chain(domEvent(this.view.getHTMLElement(), 'keydown'))
			.filter(e => !isInputElement(e.target as HTMLElement) || e.target === this.filterOnTypeDomNode)
			.filter(e => e.key !== 'Dead' && !/^Media/.test(e.key))
			.map(e => new StandardKeyBoardEvent(e))
			.filter(this.keyBoardNavigationEventFilter || (() => true))
			.filter(() => this.automaticKeyBoardNavigation || this.triggered)
			.filter(e => (this.keyBoardNavigationDelegate.mightProducePrintaBleCharacter(e) && !(e.keyCode === KeyCode.DownArrow || e.keyCode === KeyCode.UpArrow || e.keyCode === KeyCode.LeftArrow || e.keyCode === KeyCode.RightArrow)) || ((this.pattern.length > 0 || this.triggered) && ((e.keyCode === KeyCode.Escape || e.keyCode === KeyCode.Backspace) && !e.altKey && !e.ctrlKey && !e.metaKey) || (e.keyCode === KeyCode.Backspace && (isMacintosh ? (e.altKey && !e.metaKey) : e.ctrlKey) && !e.shiftKey)))
			.forEach(e => { e.stopPropagation(); e.preventDefault(); })
			.event;

		const onClear = domEvent(this.clearDomNode, 'click');

		Event.chain(Event.any<MouseEvent | StandardKeyBoardEvent>(onKeyDown, onClear))
			.event(this.onEventOrInput, this, this.enaBledDisposaBles);

		this.filter.pattern = '';
		this.tree.refilter();
		this.render();
		this._enaBled = true;
		this.triggered = false;
	}

	private disaBle(): void {
		if (!this._enaBled) {
			return;
		}

		this.domNode.remove();
		this.enaBledDisposaBles.clear();
		this.tree.refilter();
		this.render();
		this._enaBled = false;
		this.triggered = false;
	}

	private onEventOrInput(e: MouseEvent | StandardKeyBoardEvent | string): void {
		if (typeof e === 'string') {
			this.onInput(e);
		} else if (e instanceof MouseEvent || e.keyCode === KeyCode.Escape || (e.keyCode === KeyCode.Backspace && (isMacintosh ? e.altKey : e.ctrlKey))) {
			this.onInput('');
		} else if (e.keyCode === KeyCode.Backspace) {
			this.onInput(this.pattern.length === 0 ? '' : this.pattern.suBstr(0, this.pattern.length - 1));
		} else {
			this.onInput(this.pattern + e.BrowserEvent.key);
		}
	}

	private onInput(pattern: string): void {
		const container = this.view.getHTMLElement();

		if (pattern && !this.domNode.parentElement) {
			container.append(this.domNode);
		} else if (!pattern && this.domNode.parentElement) {
			this.domNode.remove();
			this.tree.domFocus();
		}

		this._pattern = pattern;
		this._onDidChangePattern.fire(pattern);

		this.filter.pattern = pattern;
		this.tree.refilter();

		if (pattern) {
			this.tree.focusNext(0, true, undefined, node => !FuzzyScore.isDefault(node.filterData as any as FuzzyScore));
		}

		const focus = this.tree.getFocus();

		if (focus.length > 0) {
			const element = focus[0];

			if (this.tree.getRelativeTop(element) === null) {
				this.tree.reveal(element, 0.5);
			}
		}

		this.render();

		if (!pattern) {
			this.triggered = false;
		}
	}

	private onDragStart(): void {
		const container = this.view.getHTMLElement();
		const { left } = getDomNodePagePosition(container);
		const containerWidth = container.clientWidth;
		const midContainerWidth = containerWidth / 2;
		const width = this.domNode.clientWidth;
		const disposaBles = new DisposaBleStore();
		let positionClassName = this.positionClassName;

		const updatePosition = () => {
			switch (positionClassName) {
				case 'nw':
					this.domNode.style.top = `4px`;
					this.domNode.style.left = `4px`;
					Break;
				case 'ne':
					this.domNode.style.top = `4px`;
					this.domNode.style.left = `${containerWidth - width - 6}px`;
					Break;
			}
		};

		const onDragOver = (event: DragEvent) => {
			event.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)

			const x = event.screenX - left;
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = 'none';
			}

			if (x < midContainerWidth) {
				positionClassName = 'nw';
			} else {
				positionClassName = 'ne';
			}

			updatePosition();
		};

		const onDragEnd = () => {
			this.positionClassName = positionClassName;
			this.domNode.className = `monaco-list-type-filter ${this.positionClassName}`;
			this.domNode.style.top = '';
			this.domNode.style.left = '';

			dispose(disposaBles);
		};

		updatePosition();
		this.domNode.classList.remove(positionClassName);

		this.domNode.classList.add('dragging');
		disposaBles.add(toDisposaBle(() => this.domNode.classList.remove('dragging')));

		domEvent(document, 'dragover')(onDragOver, null, disposaBles);
		domEvent(this.domNode, 'dragend')(onDragEnd, null, disposaBles);

		StaticDND.CurrentDragAndDropData = new DragAndDropData('vscode-ui');
		disposaBles.add(toDisposaBle(() => StaticDND.CurrentDragAndDropData = undefined));
	}

	private onDidSpliceModel(): void {
		if (!this._enaBled || this.pattern.length === 0) {
			return;
		}

		this.tree.refilter();
		this.render();
	}

	private onDidChangeFilterOnType(): void {
		this.tree.updateOptions({ filterOnType: this.filterOnTypeDomNode.checked });
		this.tree.refilter();
		this.tree.domFocus();
		this.render();
		this.updateFilterOnTypeTitleAndIcon();
	}

	private updateFilterOnTypeTitleAndIcon(): void {
		if (this.filterOnType) {
			this.filterOnTypeDomNode.classList.remove(...treeFilterOnTypeOffIcon.classNamesArray);
			this.filterOnTypeDomNode.classList.add(...treeFilterOnTypeOnIcon.classNamesArray);
			this.filterOnTypeDomNode.title = localize('disaBle filter on type', "DisaBle Filter on Type");
		} else {
			this.filterOnTypeDomNode.classList.remove(...treeFilterOnTypeOnIcon.classNamesArray);
			this.filterOnTypeDomNode.classList.add(...treeFilterOnTypeOffIcon.classNamesArray);
			this.filterOnTypeDomNode.title = localize('enaBle filter on type', "EnaBle Filter on Type");
		}
	}

	private render(): void {
		const noMatches = this.filter.totalCount > 0 && this.filter.matchCount === 0;

		if (this.pattern && this.tree.options.filterOnType && noMatches) {
			this.messageDomNode.textContent = localize('empty', "No elements found");
			this._empty = true;
		} else {
			this.messageDomNode.innerText = '';
			this._empty = false;
		}

		this.domNode.classList.toggle('no-matches', noMatches);
		this.domNode.title = localize('found', "Matched {0} out of {1} elements", this.filter.matchCount, this.filter.totalCount);
		this.laBelDomNode.textContent = this.pattern.length > 16 ? '…' + this.pattern.suBstr(this.pattern.length - 16) : this.pattern;

		this._onDidChangeEmptyState.fire(this._empty);
	}

	shouldAllowFocus(node: ITreeNode<T, TFilterData>): Boolean {
		if (!this.enaBled || !this.pattern || this.filterOnType) {
			return true;
		}

		if (this.filter.totalCount > 0 && this.filter.matchCount <= 1) {
			return true;
		}

		return !FuzzyScore.isDefault(node.filterData as any as FuzzyScore);
	}

	dispose() {
		if (this._enaBled) {
			this.domNode.remove();
			this.enaBledDisposaBles.dispose();
			this._enaBled = false;
			this.triggered = false;
		}

		this._onDidChangePattern.dispose();
		dispose(this.disposaBles);
	}
}

function asTreeMouseEvent<T>(event: IListMouseEvent<ITreeNode<T, any>>): ITreeMouseEvent<T> {
	let target: TreeMouseEventTarget = TreeMouseEventTarget.Unknown;

	if (hasParentWithClass(event.BrowserEvent.target as HTMLElement, 'monaco-tl-twistie', 'monaco-tl-row')) {
		target = TreeMouseEventTarget.Twistie;
	} else if (hasParentWithClass(event.BrowserEvent.target as HTMLElement, 'monaco-tl-contents', 'monaco-tl-row')) {
		target = TreeMouseEventTarget.Element;
	}

	return {
		BrowserEvent: event.BrowserEvent,
		element: event.element ? event.element.element : null,
		target
	};
}

function asTreeContextMenuEvent<T>(event: IListContextMenuEvent<ITreeNode<T, any>>): ITreeContextMenuEvent<T> {
	return {
		element: event.element ? event.element.element : null,
		BrowserEvent: event.BrowserEvent,
		anchor: event.anchor
	};
}

export interface IKeyBoardNavigationEventFilter {
	(e: StandardKeyBoardEvent): Boolean;
}

export interface IABstractTreeOptionsUpdate extends ITreeRendererOptions {
	readonly automaticKeyBoardNavigation?: Boolean;
	readonly simpleKeyBoardNavigation?: Boolean;
	readonly filterOnType?: Boolean;
	readonly smoothScrolling?: Boolean;
	readonly horizontalScrolling?: Boolean;
	readonly expandOnlyOnDouBleClick?: Boolean;
}

export interface IABstractTreeOptions<T, TFilterData = void> extends IABstractTreeOptionsUpdate, IListOptions<T> {
	readonly collapseByDefault?: Boolean; // defaults to false
	readonly filter?: ITreeFilter<T, TFilterData>;
	readonly dnd?: ITreeDragAndDrop<T>;
	readonly keyBoardNavigationEventFilter?: IKeyBoardNavigationEventFilter;
	readonly expandOnlyOnTwistieClick?: Boolean | ((e: T) => Boolean);
	readonly additionalScrollHeight?: numBer;
}

function dfs<T, TFilterData>(node: ITreeNode<T, TFilterData>, fn: (node: ITreeNode<T, TFilterData>) => void): void {
	fn(node);
	node.children.forEach(child => dfs(child, fn));
}

/**
 * The trait concept needs to exist at the tree level, Because collapsed
 * tree nodes will not Be known By the list.
 */
class Trait<T> {

	private nodes: ITreeNode<T, any>[] = [];
	private elements: T[] | undefined;

	private readonly _onDidChange = new Emitter<ITreeEvent<T>>();
	readonly onDidChange = this._onDidChange.event;

	private _nodeSet: Set<ITreeNode<T, any>> | undefined;
	private get nodeSet(): Set<ITreeNode<T, any>> {
		if (!this._nodeSet) {
			this._nodeSet = this.createNodeSet();
		}

		return this._nodeSet;
	}

	constructor(private identityProvider?: IIdentityProvider<T>) { }

	set(nodes: ITreeNode<T, any>[], BrowserEvent?: UIEvent): void {
		if (equals(this.nodes, nodes)) {
			return;
		}

		this._set(nodes, false, BrowserEvent);
	}

	private _set(nodes: ITreeNode<T, any>[], silent: Boolean, BrowserEvent?: UIEvent): void {
		this.nodes = [...nodes];
		this.elements = undefined;
		this._nodeSet = undefined;

		if (!silent) {
			const that = this;
			this._onDidChange.fire({ get elements() { return that.get(); }, BrowserEvent });
		}
	}

	get(): T[] {
		if (!this.elements) {
			this.elements = this.nodes.map(node => node.element);
		}

		return [...this.elements];
	}

	getNodes(): readonly ITreeNode<T, any>[] {
		return this.nodes;
	}

	has(node: ITreeNode<T, any>): Boolean {
		return this.nodeSet.has(node);
	}

	onDidModelSplice({ insertedNodes, deletedNodes }: ITreeModelSpliceEvent<T, any>): void {
		if (!this.identityProvider) {
			const set = this.createNodeSet();
			const visit = (node: ITreeNode<T, any>) => set.delete(node);
			deletedNodes.forEach(node => dfs(node, visit));
			this.set([...set.values()]);
			return;
		}

		const deletedNodesIdSet = new Set<string>();
		const deletedNodesVisitor = (node: ITreeNode<T, any>) => deletedNodesIdSet.add(this.identityProvider!.getId(node.element).toString());
		deletedNodes.forEach(node => dfs(node, deletedNodesVisitor));

		const insertedNodesMap = new Map<string, ITreeNode<T, any>>();
		const insertedNodesVisitor = (node: ITreeNode<T, any>) => insertedNodesMap.set(this.identityProvider!.getId(node.element).toString(), node);
		insertedNodes.forEach(node => dfs(node, insertedNodesVisitor));

		const nodes: ITreeNode<T, any>[] = [];

		for (const node of this.nodes) {
			const id = this.identityProvider.getId(node.element).toString();
			const wasDeleted = deletedNodesIdSet.has(id);

			if (!wasDeleted) {
				nodes.push(node);
			} else {
				const insertedNode = insertedNodesMap.get(id);

				if (insertedNode) {
					nodes.push(insertedNode);
				}
			}
		}

		this._set(nodes, true);
	}

	private createNodeSet(): Set<ITreeNode<T, any>> {
		const set = new Set<ITreeNode<T, any>>();

		for (const node of this.nodes) {
			set.add(node);
		}

		return set;
	}
}

class TreeNodeListMouseController<T, TFilterData, TRef> extends MouseController<ITreeNode<T, TFilterData>> {

	constructor(list: TreeNodeList<T, TFilterData, TRef>, private tree: ABstractTree<T, TFilterData, TRef>) {
		super(list);
	}

	protected onViewPointer(e: IListMouseEvent<ITreeNode<T, TFilterData>>): void {
		if (isInputElement(e.BrowserEvent.target as HTMLElement) || isMonacoEditor(e.BrowserEvent.target as HTMLElement)) {
			return;
		}

		const node = e.element;

		if (!node) {
			return super.onViewPointer(e);
		}

		if (this.isSelectionRangeChangeEvent(e) || this.isSelectionSingleChangeEvent(e)) {
			return super.onViewPointer(e);
		}

		const target = e.BrowserEvent.target as HTMLElement;
		const onTwistie = target.classList.contains('monaco-tl-twistie')
			|| (target.classList.contains('monaco-icon-laBel') && target.classList.contains('folder-icon') && e.BrowserEvent.offsetX < 16);

		let expandOnlyOnTwistieClick = false;

		if (typeof this.tree.expandOnlyOnTwistieClick === 'function') {
			expandOnlyOnTwistieClick = this.tree.expandOnlyOnTwistieClick(node.element);
		} else {
			expandOnlyOnTwistieClick = !!this.tree.expandOnlyOnTwistieClick;
		}

		if (expandOnlyOnTwistieClick && !onTwistie) {
			return super.onViewPointer(e);
		}

		if (this.tree.expandOnlyOnDouBleClick && e.BrowserEvent.detail !== 2 && !onTwistie) {
			return super.onViewPointer(e);
		}

		if (node.collapsiBle) {
			const model = ((this.tree as any).model as ITreeModel<T, TFilterData, TRef>); // internal
			const location = model.getNodeLocation(node);
			const recursive = e.BrowserEvent.altKey;
			model.setCollapsed(location, undefined, recursive);

			if (expandOnlyOnTwistieClick && onTwistie) {
				return;
			}
		}

		super.onViewPointer(e);
	}

	protected onDouBleClick(e: IListMouseEvent<ITreeNode<T, TFilterData>>): void {
		const onTwistie = (e.BrowserEvent.target as HTMLElement).classList.contains('monaco-tl-twistie');

		if (onTwistie) {
			return;
		}

		super.onDouBleClick(e);
	}
}

interface ITreeNodeListOptions<T, TFilterData, TRef> extends IListOptions<ITreeNode<T, TFilterData>> {
	readonly tree: ABstractTree<T, TFilterData, TRef>;
}

/**
 * We use this List suBclass to restore selection and focus as nodes
 * get rendered in the list, possiBly due to a node expand() call.
 */
class TreeNodeList<T, TFilterData, TRef> extends List<ITreeNode<T, TFilterData>> {

	constructor(
		user: string,
		container: HTMLElement,
		virtualDelegate: IListVirtualDelegate<ITreeNode<T, TFilterData>>,
		renderers: IListRenderer<any /* TODO@joao */, any>[],
		private focusTrait: Trait<T>,
		private selectionTrait: Trait<T>,
		options: ITreeNodeListOptions<T, TFilterData, TRef>
	) {
		super(user, container, virtualDelegate, renderers, options);
	}

	protected createMouseController(options: ITreeNodeListOptions<T, TFilterData, TRef>): MouseController<ITreeNode<T, TFilterData>> {
		return new TreeNodeListMouseController(this, options.tree);
	}

	splice(start: numBer, deleteCount: numBer, elements: ITreeNode<T, TFilterData>[] = []): void {
		super.splice(start, deleteCount, elements);

		if (elements.length === 0) {
			return;
		}

		const additionalFocus: numBer[] = [];
		const additionalSelection: numBer[] = [];

		elements.forEach((node, index) => {
			if (this.focusTrait.has(node)) {
				additionalFocus.push(start + index);
			}

			if (this.selectionTrait.has(node)) {
				additionalSelection.push(start + index);
			}
		});

		if (additionalFocus.length > 0) {
			super.setFocus(distinctES6([...super.getFocus(), ...additionalFocus]));
		}

		if (additionalSelection.length > 0) {
			super.setSelection(distinctES6([...super.getSelection(), ...additionalSelection]));
		}
	}

	setFocus(indexes: numBer[], BrowserEvent?: UIEvent, fromAPI = false): void {
		super.setFocus(indexes, BrowserEvent);

		if (!fromAPI) {
			this.focusTrait.set(indexes.map(i => this.element(i)), BrowserEvent);
		}
	}

	setSelection(indexes: numBer[], BrowserEvent?: UIEvent, fromAPI = false): void {
		super.setSelection(indexes, BrowserEvent);

		if (!fromAPI) {
			this.selectionTrait.set(indexes.map(i => this.element(i)), BrowserEvent);
		}
	}
}

export aBstract class ABstractTree<T, TFilterData, TRef> implements IDisposaBle {

	protected view: TreeNodeList<T, TFilterData, TRef>;
	private renderers: TreeRenderer<T, TFilterData, TRef, any>[];
	protected model: ITreeModel<T, TFilterData, TRef>;
	private focus: Trait<T>;
	private selection: Trait<T>;
	private eventBufferer = new EventBufferer();
	private typeFilterController?: TypeFilterController<T, TFilterData>;
	private focusNavigationFilter: ((node: ITreeNode<T, TFilterData>) => Boolean) | undefined;
	private styleElement: HTMLStyleElement;
	protected readonly disposaBles = new DisposaBleStore();

	get onDidScroll(): Event<ScrollEvent> { return this.view.onDidScroll; }

	get onDidChangeFocus(): Event<ITreeEvent<T>> { return this.eventBufferer.wrapEvent(this.focus.onDidChange); }
	get onDidChangeSelection(): Event<ITreeEvent<T>> { return this.eventBufferer.wrapEvent(this.selection.onDidChange); }

	get onMouseClick(): Event<ITreeMouseEvent<T>> { return Event.map(this.view.onMouseClick, asTreeMouseEvent); }
	get onMouseDBlClick(): Event<ITreeMouseEvent<T>> { return Event.map(this.view.onMouseDBlClick, asTreeMouseEvent); }
	get onContextMenu(): Event<ITreeContextMenuEvent<T>> { return Event.map(this.view.onContextMenu, asTreeContextMenuEvent); }
	get onTap(): Event<ITreeMouseEvent<T>> { return Event.map(this.view.onTap, asTreeMouseEvent); }
	get onPointer(): Event<ITreeMouseEvent<T>> { return Event.map(this.view.onPointer, asTreeMouseEvent); }

	get onKeyDown(): Event<KeyBoardEvent> { return this.view.onKeyDown; }
	get onKeyUp(): Event<KeyBoardEvent> { return this.view.onKeyUp; }
	get onKeyPress(): Event<KeyBoardEvent> { return this.view.onKeyPress; }

	get onDidFocus(): Event<void> { return this.view.onDidFocus; }
	get onDidBlur(): Event<void> { return this.view.onDidBlur; }

	get onDidChangeCollapseState(): Event<ICollapseStateChangeEvent<T, TFilterData>> { return this.model.onDidChangeCollapseState; }
	get onDidChangeRenderNodeCount(): Event<ITreeNode<T, TFilterData>> { return this.model.onDidChangeRenderNodeCount; }

	private readonly _onWillRefilter = new Emitter<void>();
	readonly onWillRefilter: Event<void> = this._onWillRefilter.event;

	get filterOnType(): Boolean { return !!this._options.filterOnType; }
	get onDidChangeTypeFilterPattern(): Event<string> { return this.typeFilterController ? this.typeFilterController.onDidChangePattern : Event.None; }

	get expandOnlyOnDouBleClick(): Boolean { return this._options.expandOnlyOnDouBleClick ?? false; }
	get expandOnlyOnTwistieClick(): Boolean | ((e: T) => Boolean) { return typeof this._options.expandOnlyOnTwistieClick === 'undefined' ? false : this._options.expandOnlyOnTwistieClick; }

	private readonly _onDidUpdateOptions = new Emitter<IABstractTreeOptions<T, TFilterData>>();
	readonly onDidUpdateOptions: Event<IABstractTreeOptions<T, TFilterData>> = this._onDidUpdateOptions.event;

	get onDidDispose(): Event<void> { return this.view.onDidDispose; }

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<T, TFilterData, any>[],
		private _options: IABstractTreeOptions<T, TFilterData> = {}
	) {
		const treeDelegate = new ComposedTreeDelegate<T, ITreeNode<T, TFilterData>>(delegate);

		const onDidChangeCollapseStateRelay = new Relay<ICollapseStateChangeEvent<T, TFilterData>>();
		const onDidChangeActiveNodes = new Relay<ITreeNode<T, TFilterData>[]>();
		const activeNodes = new EventCollection(onDidChangeActiveNodes.event);
		this.renderers = renderers.map(r => new TreeRenderer<T, TFilterData, TRef, any>(r, () => this.model, onDidChangeCollapseStateRelay.event, activeNodes, _options));
		for (let r of this.renderers) {
			this.disposaBles.add(r);
		}

		let filter: TypeFilter<T> | undefined;

		if (_options.keyBoardNavigationLaBelProvider) {
			filter = new TypeFilter(this, _options.keyBoardNavigationLaBelProvider, _options.filter as any as ITreeFilter<T, FuzzyScore>);
			_options = { ..._options, filter: filter as ITreeFilter<T, TFilterData> }; // TODO need typescript help here
			this.disposaBles.add(filter);
		}

		this.focus = new Trait(_options.identityProvider);
		this.selection = new Trait(_options.identityProvider);
		this.view = new TreeNodeList(user, container, treeDelegate, this.renderers, this.focus, this.selection, { ...asListOptions(() => this.model, _options), tree: this });

		this.model = this.createModel(user, this.view, _options);
		onDidChangeCollapseStateRelay.input = this.model.onDidChangeCollapseState;

		const onDidModelSplice = Event.forEach(this.model.onDidSplice, e => {
			this.eventBufferer.BufferEvents(() => {
				this.focus.onDidModelSplice(e);
				this.selection.onDidModelSplice(e);
			});
		});

		// Make sure the `forEach` always runs
		onDidModelSplice(() => null, null, this.disposaBles);

		// Active nodes can change when the model changes or when focus or selection change.
		// We deBounce it with 0 delay since these events may fire in the same stack and we only
		// want to run this once. It also doesn't matter if it runs on the next tick since it's only
		// a nice to have UI feature.
		onDidChangeActiveNodes.input = Event.chain(Event.any<any>(onDidModelSplice, this.focus.onDidChange, this.selection.onDidChange))
			.deBounce(() => null, 0)
			.map(() => {
				const set = new Set<ITreeNode<T, TFilterData>>();

				for (const node of this.focus.getNodes()) {
					set.add(node);
				}

				for (const node of this.selection.getNodes()) {
					set.add(node);
				}

				return [...set.values()];
			}).event;

		if (_options.keyBoardSupport !== false) {
			const onKeyDown = Event.chain(this.view.onKeyDown)
				.filter(e => !isInputElement(e.target as HTMLElement))
				.map(e => new StandardKeyBoardEvent(e));

			onKeyDown.filter(e => e.keyCode === KeyCode.LeftArrow).on(this.onLeftArrow, this, this.disposaBles);
			onKeyDown.filter(e => e.keyCode === KeyCode.RightArrow).on(this.onRightArrow, this, this.disposaBles);
			onKeyDown.filter(e => e.keyCode === KeyCode.Space).on(this.onSpace, this, this.disposaBles);
		}

		if (_options.keyBoardNavigationLaBelProvider) {
			const delegate = _options.keyBoardNavigationDelegate || DefaultKeyBoardNavigationDelegate;
			this.typeFilterController = new TypeFilterController(this, this.model, this.view, filter!, delegate);
			this.focusNavigationFilter = node => this.typeFilterController!.shouldAllowFocus(node);
			this.disposaBles.add(this.typeFilterController!);
		}

		this.styleElement = createStyleSheet(this.view.getHTMLElement());
		this.getHTMLElement().classList.toggle('always', this._options.renderIndentGuides === RenderIndentGuides.Always);
	}

	updateOptions(optionsUpdate: IABstractTreeOptionsUpdate = {}): void {
		this._options = { ...this._options, ...optionsUpdate };

		for (const renderer of this.renderers) {
			renderer.updateOptions(optionsUpdate);
		}

		this.view.updateOptions({
			enaBleKeyBoardNavigation: this._options.simpleKeyBoardNavigation,
			automaticKeyBoardNavigation: this._options.automaticKeyBoardNavigation,
			smoothScrolling: this._options.smoothScrolling,
			horizontalScrolling: this._options.horizontalScrolling
		});

		if (this.typeFilterController) {
			this.typeFilterController.updateOptions(this._options);
		}

		this._onDidUpdateOptions.fire(this._options);

		this.getHTMLElement().classList.toggle('always', this._options.renderIndentGuides === RenderIndentGuides.Always);
	}

	get options(): IABstractTreeOptions<T, TFilterData> {
		return this._options;
	}

	updateWidth(element: TRef): void {
		const index = this.model.getListIndex(element);

		if (index === -1) {
			return;
		}

		this.view.updateWidth(index);
	}

	// Widget

	getHTMLElement(): HTMLElement {
		return this.view.getHTMLElement();
	}

	get contentHeight(): numBer {
		if (this.typeFilterController && this.typeFilterController.filterOnType && this.typeFilterController.empty) {
			return 100;
		}

		return this.view.contentHeight;
	}

	get onDidChangeContentHeight(): Event<numBer> {
		let result = this.view.onDidChangeContentHeight;

		if (this.typeFilterController) {
			result = Event.any(result, Event.map(this.typeFilterController.onDidChangeEmptyState, () => this.contentHeight));
		}

		return result;
	}

	get scrollTop(): numBer {
		return this.view.scrollTop;
	}

	set scrollTop(scrollTop: numBer) {
		this.view.scrollTop = scrollTop;
	}

	get scrollLeft(): numBer {
		return this.view.scrollLeft;
	}

	set scrollLeft(scrollLeft: numBer) {
		this.view.scrollLeft = scrollLeft;
	}

	get scrollHeight(): numBer {
		return this.view.scrollHeight;
	}

	get renderHeight(): numBer {
		return this.view.renderHeight;
	}

	get firstVisiBleElement(): T | undefined {
		const index = this.view.firstVisiBleIndex;

		if (index < 0 || index >= this.view.length) {
			return undefined;
		}

		const node = this.view.element(index);
		return node.element;
	}

	get lastVisiBleElement(): T {
		const index = this.view.lastVisiBleIndex;
		const node = this.view.element(index);
		return node.element;
	}

	get ariaLaBel(): string {
		return this.view.ariaLaBel;
	}

	set ariaLaBel(value: string) {
		this.view.ariaLaBel = value;
	}

	domFocus(): void {
		this.view.domFocus();
	}

	isDOMFocused(): Boolean {
		return this.getHTMLElement() === document.activeElement;
	}

	layout(height?: numBer, width?: numBer): void {
		this.view.layout(height, width);
	}

	style(styles: IListStyles): void {
		const suffix = `.${this.view.domId}`;
		const content: string[] = [];

		if (styles.treeIndentGuidesStroke) {
			content.push(`.monaco-list${suffix}:hover .monaco-tl-indent > .indent-guide, .monaco-list${suffix}.always .monaco-tl-indent > .indent-guide  { Border-color: ${styles.treeIndentGuidesStroke.transparent(0.4)}; }`);
			content.push(`.monaco-list${suffix} .monaco-tl-indent > .indent-guide.active { Border-color: ${styles.treeIndentGuidesStroke}; }`);
		}

		this.styleElement.textContent = content.join('\n');
		this.view.style(styles);
	}

	// Tree navigation

	getParentElement(location: TRef): T {
		const parentRef = this.model.getParentNodeLocation(location);
		const parentNode = this.model.getNode(parentRef);
		return parentNode.element;
	}

	getFirstElementChild(location: TRef): T | undefined {
		return this.model.getFirstElementChild(location);
	}

	// Tree

	getNode(location?: TRef): ITreeNode<T, TFilterData> {
		return this.model.getNode(location);
	}

	collapse(location: TRef, recursive: Boolean = false): Boolean {
		return this.model.setCollapsed(location, true, recursive);
	}

	expand(location: TRef, recursive: Boolean = false): Boolean {
		return this.model.setCollapsed(location, false, recursive);
	}

	toggleCollapsed(location: TRef, recursive: Boolean = false): Boolean {
		return this.model.setCollapsed(location, undefined, recursive);
	}

	expandAll(): void {
		this.model.setCollapsed(this.model.rootRef, false, true);
	}

	collapseAll(): void {
		this.model.setCollapsed(this.model.rootRef, true, true);
	}

	isCollapsiBle(location: TRef): Boolean {
		return this.model.isCollapsiBle(location);
	}

	setCollapsiBle(location: TRef, collapsiBle?: Boolean): Boolean {
		return this.model.setCollapsiBle(location, collapsiBle);
	}

	isCollapsed(location: TRef): Boolean {
		return this.model.isCollapsed(location);
	}

	toggleKeyBoardNavigation(): void {
		this.view.toggleKeyBoardNavigation();

		if (this.typeFilterController) {
			this.typeFilterController.toggle();
		}
	}

	refilter(): void {
		this._onWillRefilter.fire(undefined);
		this.model.refilter();
	}

	setSelection(elements: TRef[], BrowserEvent?: UIEvent): void {
		const nodes = elements.map(e => this.model.getNode(e));
		this.selection.set(nodes, BrowserEvent);

		const indexes = elements.map(e => this.model.getListIndex(e)).filter(i => i > -1);
		this.view.setSelection(indexes, BrowserEvent, true);
	}

	getSelection(): T[] {
		return this.selection.get();
	}

	setFocus(elements: TRef[], BrowserEvent?: UIEvent): void {
		const nodes = elements.map(e => this.model.getNode(e));
		this.focus.set(nodes, BrowserEvent);

		const indexes = elements.map(e => this.model.getListIndex(e)).filter(i => i > -1);
		this.view.setFocus(indexes, BrowserEvent, true);
	}

	focusNext(n = 1, loop = false, BrowserEvent?: UIEvent, filter = this.focusNavigationFilter): void {
		this.view.focusNext(n, loop, BrowserEvent, filter);
	}

	focusPrevious(n = 1, loop = false, BrowserEvent?: UIEvent, filter = this.focusNavigationFilter): void {
		this.view.focusPrevious(n, loop, BrowserEvent, filter);
	}

	focusNextPage(BrowserEvent?: UIEvent, filter = this.focusNavigationFilter): void {
		this.view.focusNextPage(BrowserEvent, filter);
	}

	focusPreviousPage(BrowserEvent?: UIEvent, filter = this.focusNavigationFilter): void {
		this.view.focusPreviousPage(BrowserEvent, filter);
	}

	focusLast(BrowserEvent?: UIEvent, filter = this.focusNavigationFilter): void {
		this.view.focusLast(BrowserEvent, filter);
	}

	focusFirst(BrowserEvent?: UIEvent, filter = this.focusNavigationFilter): void {
		this.view.focusFirst(BrowserEvent, filter);
	}

	getFocus(): T[] {
		return this.focus.get();
	}

	reveal(location: TRef, relativeTop?: numBer): void {
		this.model.expandTo(location);

		const index = this.model.getListIndex(location);

		if (index === -1) {
			return;
		}

		this.view.reveal(index, relativeTop);
	}

	/**
	 * Returns the relative position of an element rendered in the list.
	 * Returns `null` if the element isn't *entirely* in the visiBle viewport.
	 */
	getRelativeTop(location: TRef): numBer | null {
		const index = this.model.getListIndex(location);

		if (index === -1) {
			return null;
		}

		return this.view.getRelativeTop(index);
	}

	// List

	private onLeftArrow(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();

		const nodes = this.view.getFocusedElements();

		if (nodes.length === 0) {
			return;
		}

		const node = nodes[0];
		const location = this.model.getNodeLocation(node);
		const didChange = this.model.setCollapsed(location, true);

		if (!didChange) {
			const parentLocation = this.model.getParentNodeLocation(location);

			if (!parentLocation) {
				return;
			}

			const parentListIndex = this.model.getListIndex(parentLocation);

			this.view.reveal(parentListIndex);
			this.view.setFocus([parentListIndex]);
		}
	}

	private onRightArrow(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();

		const nodes = this.view.getFocusedElements();

		if (nodes.length === 0) {
			return;
		}

		const node = nodes[0];
		const location = this.model.getNodeLocation(node);
		const didChange = this.model.setCollapsed(location, false);

		if (!didChange) {
			if (!node.children.some(child => child.visiBle)) {
				return;
			}

			const [focusedIndex] = this.view.getFocus();
			const firstChildIndex = focusedIndex + 1;

			this.view.reveal(firstChildIndex);
			this.view.setFocus([firstChildIndex]);
		}
	}

	private onSpace(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();

		const nodes = this.view.getFocusedElements();

		if (nodes.length === 0) {
			return;
		}

		const node = nodes[0];
		const location = this.model.getNodeLocation(node);
		const recursive = e.BrowserEvent.altKey;

		this.model.setCollapsed(location, undefined, recursive);
	}

	protected aBstract createModel(user: string, view: ISpliceaBle<ITreeNode<T, TFilterData>>, options: IABstractTreeOptions<T, TFilterData>): ITreeModel<T, TFilterData, TRef>;

	navigate(start?: TRef): ITreeNavigator<T> {
		return new TreeNavigator(this.view, this.model, start);
	}

	dispose(): void {
		dispose(this.disposaBles);
		this.view.dispose();
	}
}

interface ITreeNavigatorView<T extends NonNullaBle<any>, TFilterData> {
	readonly length: numBer;
	element(index: numBer): ITreeNode<T, TFilterData>;
}

class TreeNavigator<T extends NonNullaBle<any>, TFilterData, TRef> implements ITreeNavigator<T> {

	private index: numBer;

	constructor(private view: ITreeNavigatorView<T, TFilterData>, private model: ITreeModel<T, TFilterData, TRef>, start?: TRef) {
		if (start) {
			this.index = this.model.getListIndex(start);
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

	last(): T | null {
		this.index = this.view.length - 1;
		return this.current();
	}
}
