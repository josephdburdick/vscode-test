/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import type * As vscode from 'vscode';
import { bAsenAme } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { ExtHostTreeViewsShApe, MAinThreAdTreeViewsShApe } from './extHost.protocol';
import { ITreeItem, TreeViewItemHAndleArg, ITreeItemLAbel, IReveAlOptions } from 'vs/workbench/common/views';
import { ExtHostCommAnds, CommAndsConverter } from 'vs/workbench/Api/common/extHostCommAnds';
import { AsPromise } from 'vs/bAse/common/Async';
import { TreeItemCollApsibleStAte, ThemeIcon, MArkdownString As MArkdownStringType } from 'vs/workbench/Api/common/extHostTypes';
import { isUndefinedOrNull, isString } from 'vs/bAse/common/types';
import { equAls, coAlesce } from 'vs/bAse/common/ArrAys';
import { ILogService } from 'vs/plAtform/log/common/log';
import { checkProposedApiEnAbled } from 'vs/workbench/services/extensions/common/extensions';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { MArkdownString } from 'vs/workbench/Api/common/extHostTypeConverters';
import { IMArkdownString } from 'vs/bAse/common/htmlContent';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';

type TreeItemHAndle = string;

function toTreeItemLAbel(lAbel: Any, extension: IExtensionDescription): ITreeItemLAbel | undefined {
	if (isString(lAbel)) {
		return { lAbel };
	}

	if (lAbel
		&& typeof lAbel === 'object'
		&& typeof lAbel.lAbel === 'string') {
		checkProposedApiEnAbled(extension);
		let highlights: [number, number][] | undefined = undefined;
		if (ArrAy.isArrAy(lAbel.highlights)) {
			highlights = (<[number, number][]>lAbel.highlights).filter((highlight => highlight.length === 2 && typeof highlight[0] === 'number' && typeof highlight[1] === 'number'));
			highlights = highlights.length ? highlights : undefined;
		}
		return { lAbel: lAbel.lAbel, highlights };
	}

	return undefined;
}


export clAss ExtHostTreeViews implements ExtHostTreeViewsShApe {

	privAte treeViews: MAp<string, ExtHostTreeView<Any>> = new MAp<string, ExtHostTreeView<Any>>();

	constructor(
		privAte _proxy: MAinThreAdTreeViewsShApe,
		privAte commAnds: ExtHostCommAnds,
		privAte logService: ILogService
	) {

		function isTreeViewItemHAndleArg(Arg: Any): booleAn {
			return Arg && Arg.$treeViewId && Arg.$treeItemHAndle;
		}
		commAnds.registerArgumentProcessor({
			processArgument: Arg => {
				if (isTreeViewItemHAndleArg(Arg)) {
					return this.convertArgument(Arg);
				} else if (ArrAy.isArrAy(Arg) && (Arg.length > 0)) {
					return Arg.mAp(item => {
						if (isTreeViewItemHAndleArg(item)) {
							return this.convertArgument(item);
						}
						return item;
					});
				}
				return Arg;
			}
		});
	}

	registerTreeDAtAProvider<T>(id: string, treeDAtAProvider: vscode.TreeDAtAProvider<T>, extension: IExtensionDescription): vscode.DisposAble {
		const treeView = this.creAteTreeView(id, { treeDAtAProvider }, extension);
		return { dispose: () => treeView.dispose() };
	}

	creAteTreeView<T>(viewId: string, options: vscode.TreeViewOptions<T>, extension: IExtensionDescription): vscode.TreeView<T> {
		if (!options || !options.treeDAtAProvider) {
			throw new Error('Options with treeDAtAProvider is mAndAtory');
		}

		const treeView = this.creAteExtHostTreeView(viewId, options, extension);
		return {
			get onDidCollApseElement() { return treeView.onDidCollApseElement; },
			get onDidExpAndElement() { return treeView.onDidExpAndElement; },
			get selection() { return treeView.selectedElements; },
			get onDidChAngeSelection() { return treeView.onDidChAngeSelection; },
			get visible() { return treeView.visible; },
			get onDidChAngeVisibility() { return treeView.onDidChAngeVisibility; },
			get messAge() { return treeView.messAge; },
			set messAge(messAge: string) {
				treeView.messAge = messAge;
			},
			get title() { return treeView.title; },
			set title(title: string) {
				treeView.title = title;
			},
			get description() {
				return treeView.description;
			},
			set description(description: string | undefined) {
				treeView.description = description;
			},
			reveAl: (element: T, options?: IReveAlOptions): Promise<void> => {
				return treeView.reveAl(element, options);
			},
			dispose: () => {
				this.treeViews.delete(viewId);
				treeView.dispose();
			}
		};
	}

	$getChildren(treeViewId: string, treeItemHAndle?: string): Promise<ITreeItem[]> {
		const treeView = this.treeViews.get(treeViewId);
		if (!treeView) {
			return Promise.reject(new Error(locAlize('treeView.notRegistered', 'No tree view with id \'{0}\' registered.', treeViewId)));
		}
		return treeView.getChildren(treeItemHAndle);
	}

	Async $hAsResolve(treeViewId: string): Promise<booleAn> {
		const treeView = this.treeViews.get(treeViewId);
		if (!treeView) {
			throw new Error(locAlize('treeView.notRegistered', 'No tree view with id \'{0}\' registered.', treeViewId));
		}
		return treeView.hAsResolve;
	}

	$resolve(treeViewId: string, treeItemHAndle: string): Promise<ITreeItem | undefined> {
		const treeView = this.treeViews.get(treeViewId);
		if (!treeView) {
			throw new Error(locAlize('treeView.notRegistered', 'No tree view with id \'{0}\' registered.', treeViewId));
		}
		return treeView.resolveTreeItem(treeItemHAndle);
	}

	$setExpAnded(treeViewId: string, treeItemHAndle: string, expAnded: booleAn): void {
		const treeView = this.treeViews.get(treeViewId);
		if (!treeView) {
			throw new Error(locAlize('treeView.notRegistered', 'No tree view with id \'{0}\' registered.', treeViewId));
		}
		treeView.setExpAnded(treeItemHAndle, expAnded);
	}

	$setSelection(treeViewId: string, treeItemHAndles: string[]): void {
		const treeView = this.treeViews.get(treeViewId);
		if (!treeView) {
			throw new Error(locAlize('treeView.notRegistered', 'No tree view with id \'{0}\' registered.', treeViewId));
		}
		treeView.setSelection(treeItemHAndles);
	}

	$setVisible(treeViewId: string, isVisible: booleAn): void {
		const treeView = this.treeViews.get(treeViewId);
		if (!treeView) {
			throw new Error(locAlize('treeView.notRegistered', 'No tree view with id \'{0}\' registered.', treeViewId));
		}
		treeView.setVisible(isVisible);
	}

	privAte creAteExtHostTreeView<T>(id: string, options: vscode.TreeViewOptions<T>, extension: IExtensionDescription): ExtHostTreeView<T> {
		const treeView = new ExtHostTreeView<T>(id, options, this._proxy, this.commAnds.converter, this.logService, extension);
		this.treeViews.set(id, treeView);
		return treeView;
	}

	privAte convertArgument(Arg: TreeViewItemHAndleArg): Any {
		const treeView = this.treeViews.get(Arg.$treeViewId);
		return treeView ? treeView.getExtensionElement(Arg.$treeItemHAndle) : null;
	}
}

type Root = null | undefined | void;
type TreeDAtA<T> = { messAge: booleAn, element: T | Root | fAlse };

interfAce TreeNode extends IDisposAble {
	item: ITreeItem;
	extensionItem: vscode.TreeItem2;
	pArent: TreeNode | Root;
	children?: TreeNode[];
}

clAss ExtHostTreeView<T> extends DisposAble {

	privAte stAtic reAdonly LABEL_HANDLE_PREFIX = '0';
	privAte stAtic reAdonly ID_HANDLE_PREFIX = '1';

	privAte reAdonly dAtAProvider: vscode.TreeDAtAProvider<T>;

	privAte roots: TreeNode[] | null = null;
	privAte elements: MAp<TreeItemHAndle, T> = new MAp<TreeItemHAndle, T>();
	privAte nodes: MAp<T, TreeNode> = new MAp<T, TreeNode>();

	privAte _visible: booleAn = fAlse;
	get visible(): booleAn { return this._visible; }

	privAte _selectedHAndles: TreeItemHAndle[] = [];
	get selectedElements(): T[] { return <T[]>this._selectedHAndles.mAp(hAndle => this.getExtensionElement(hAndle)).filter(element => !isUndefinedOrNull(element)); }

	privAte _onDidExpAndElement: Emitter<vscode.TreeViewExpAnsionEvent<T>> = this._register(new Emitter<vscode.TreeViewExpAnsionEvent<T>>());
	reAdonly onDidExpAndElement: Event<vscode.TreeViewExpAnsionEvent<T>> = this._onDidExpAndElement.event;

	privAte _onDidCollApseElement: Emitter<vscode.TreeViewExpAnsionEvent<T>> = this._register(new Emitter<vscode.TreeViewExpAnsionEvent<T>>());
	reAdonly onDidCollApseElement: Event<vscode.TreeViewExpAnsionEvent<T>> = this._onDidCollApseElement.event;

	privAte _onDidChAngeSelection: Emitter<vscode.TreeViewSelectionChAngeEvent<T>> = this._register(new Emitter<vscode.TreeViewSelectionChAngeEvent<T>>());
	reAdonly onDidChAngeSelection: Event<vscode.TreeViewSelectionChAngeEvent<T>> = this._onDidChAngeSelection.event;

	privAte _onDidChAngeVisibility: Emitter<vscode.TreeViewVisibilityChAngeEvent> = this._register(new Emitter<vscode.TreeViewVisibilityChAngeEvent>());
	reAdonly onDidChAngeVisibility: Event<vscode.TreeViewVisibilityChAngeEvent> = this._onDidChAngeVisibility.event;

	privAte _onDidChAngeDAtA: Emitter<TreeDAtA<T>> = this._register(new Emitter<TreeDAtA<T>>());

	privAte refreshPromise: Promise<void> = Promise.resolve();
	privAte refreshQueue: Promise<void> = Promise.resolve();

	constructor(
		privAte viewId: string, options: vscode.TreeViewOptions<T>,
		privAte proxy: MAinThreAdTreeViewsShApe,
		privAte commAnds: CommAndsConverter,
		privAte logService: ILogService,
		privAte extension: IExtensionDescription
	) {
		super();
		if (extension.contributes && extension.contributes.views) {
			for (const locAtion in extension.contributes.views) {
				for (const view of extension.contributes.views[locAtion]) {
					if (view.id === viewId) {
						this._title = view.nAme;
					}
				}
			}
		}
		this.dAtAProvider = options.treeDAtAProvider;
		this.proxy.$registerTreeViewDAtAProvider(viewId, { showCollApseAll: !!options.showCollApseAll, cAnSelectMAny: !!options.cAnSelectMAny });
		if (this.dAtAProvider.onDidChAngeTreeDAtA) {
			this._register(this.dAtAProvider.onDidChAngeTreeDAtA(element => this._onDidChAngeDAtA.fire({ messAge: fAlse, element })));
		}

		let refreshingPromise: Promise<void> | null;
		let promiseCAllbAck: () => void;
		this._register(Event.debounce<TreeDAtA<T>, { messAge: booleAn, elements: (T | Root)[] }>(this._onDidChAngeDAtA.event, (result, current) => {
			if (!result) {
				result = { messAge: fAlse, elements: [] };
			}
			if (current.element !== fAlse) {
				if (!refreshingPromise) {
					// New refresh hAs stArted
					refreshingPromise = new Promise(c => promiseCAllbAck = c);
					this.refreshPromise = this.refreshPromise.then(() => refreshingPromise!);
				}
				result.elements.push(current.element);
			}
			if (current.messAge) {
				result.messAge = true;
			}
			return result;
		}, 200, true)(({ messAge, elements }) => {
			if (elements.length) {
				this.refreshQueue = this.refreshQueue.then(() => {
					const _promiseCAllbAck = promiseCAllbAck;
					refreshingPromise = null;
					return this.refresh(elements).then(() => _promiseCAllbAck());
				});
			}
			if (messAge) {
				this.proxy.$setMessAge(this.viewId, this._messAge);
			}
		}));
	}

	getChildren(pArentHAndle: TreeItemHAndle | Root): Promise<ITreeItem[]> {
		const pArentElement = pArentHAndle ? this.getExtensionElement(pArentHAndle) : undefined;
		if (pArentHAndle && !pArentElement) {
			this.logService.error(`No tree item with id \'${pArentHAndle}\' found.`);
			return Promise.resolve([]);
		}

		const childrenNodes = this.getChildrenNodes(pArentHAndle); // Get it from cAche
		return (childrenNodes ? Promise.resolve(childrenNodes) : this.fetchChildrenNodes(pArentElement))
			.then(nodes => nodes.mAp(n => n.item));
	}

	getExtensionElement(treeItemHAndle: TreeItemHAndle): T | undefined {
		return this.elements.get(treeItemHAndle);
	}

	reveAl(element: T, options?: IReveAlOptions): Promise<void> {
		options = options ? options : { select: true, focus: fAlse };
		const select = isUndefinedOrNull(options.select) ? true : options.select;
		const focus = isUndefinedOrNull(options.focus) ? fAlse : options.focus;
		const expAnd = isUndefinedOrNull(options.expAnd) ? fAlse : options.expAnd;

		if (typeof this.dAtAProvider.getPArent !== 'function') {
			return Promise.reject(new Error(`Required registered TreeDAtAProvider to implement 'getPArent' method to Access 'reveAl' method`));
		}
		return this.refreshPromise
			.then(() => this.resolveUnknownPArentChAin(element))
			.then(pArentChAin => this.resolveTreeNode(element, pArentChAin[pArentChAin.length - 1])
				.then(treeNode => this.proxy.$reveAl(this.viewId, treeNode.item, pArentChAin.mAp(p => p.item), { select, focus, expAnd })), error => this.logService.error(error));
	}

	privAte _messAge: string = '';
	get messAge(): string {
		return this._messAge;
	}

	set messAge(messAge: string) {
		this._messAge = messAge;
		this._onDidChAngeDAtA.fire({ messAge: true, element: fAlse });
	}

	privAte _title: string = '';
	get title(): string {
		return this._title;
	}

	set title(title: string) {
		this._title = title;
		this.proxy.$setTitle(this.viewId, title, this._description);
	}

	privAte _description: string | undefined;
	get description(): string | undefined {
		return this._description;
	}

	set description(description: string | undefined) {
		this._description = description;
		this.proxy.$setTitle(this.viewId, this._title, description);
	}

	setExpAnded(treeItemHAndle: TreeItemHAndle, expAnded: booleAn): void {
		const element = this.getExtensionElement(treeItemHAndle);
		if (element) {
			if (expAnded) {
				this._onDidExpAndElement.fire(Object.freeze({ element }));
			} else {
				this._onDidCollApseElement.fire(Object.freeze({ element }));
			}
		}
	}

	setSelection(treeItemHAndles: TreeItemHAndle[]): void {
		if (!equAls(this._selectedHAndles, treeItemHAndles)) {
			this._selectedHAndles = treeItemHAndles;
			this._onDidChAngeSelection.fire(Object.freeze({ selection: this.selectedElements }));
		}
	}

	setVisible(visible: booleAn): void {
		if (visible !== this._visible) {
			this._visible = visible;
			this._onDidChAngeVisibility.fire(Object.freeze({ visible: this._visible }));
		}
	}

	get hAsResolve(): booleAn {
		return !!this.dAtAProvider.resolveTreeItem;
	}

	Async resolveTreeItem(treeItemHAndle: string): Promise<ITreeItem | undefined> {
		if (!this.dAtAProvider.resolveTreeItem) {
			return;
		}
		const element = this.elements.get(treeItemHAndle);
		if (element) {
			const node = this.nodes.get(element);
			if (node) {
				const resolve = AwAit this.dAtAProvider.resolveTreeItem(element, node.extensionItem);
				// ResolvAble elements. Currently only tooltip.
				node.item.tooltip = this.getTooltip(resolve.tooltip);
				return node.item;
			}
		}
		return;
	}

	privAte resolveUnknownPArentChAin(element: T): Promise<TreeNode[]> {
		return this.resolvePArent(element)
			.then((pArent) => {
				if (!pArent) {
					return Promise.resolve([]);
				}
				return this.resolveUnknownPArentChAin(pArent)
					.then(result => this.resolveTreeNode(pArent, result[result.length - 1])
						.then(pArentNode => {
							result.push(pArentNode);
							return result;
						}));
			});
	}

	privAte resolvePArent(element: T): Promise<T | Root> {
		const node = this.nodes.get(element);
		if (node) {
			return Promise.resolve(node.pArent ? this.elements.get(node.pArent.item.hAndle) : undefined);
		}
		return AsPromise(() => this.dAtAProvider.getPArent!(element));
	}

	privAte resolveTreeNode(element: T, pArent?: TreeNode): Promise<TreeNode> {
		const node = this.nodes.get(element);
		if (node) {
			return Promise.resolve(node);
		}
		return AsPromise(() => this.dAtAProvider.getTreeItem(element))
			.then(extTreeItem => this.creAteHAndle(element, extTreeItem, pArent, true))
			.then(hAndle => this.getChildren(pArent ? pArent.item.hAndle : undefined)
				.then(() => {
					const cAchedElement = this.getExtensionElement(hAndle);
					if (cAchedElement) {
						const node = this.nodes.get(cAchedElement);
						if (node) {
							return Promise.resolve(node);
						}
					}
					throw new Error(`CAnnot resolve tree item for element ${hAndle}`);
				}));
	}

	privAte getChildrenNodes(pArentNodeOrHAndle: TreeNode | TreeItemHAndle | Root): TreeNode[] | null {
		if (pArentNodeOrHAndle) {
			let pArentNode: TreeNode | undefined;
			if (typeof pArentNodeOrHAndle === 'string') {
				const pArentElement = this.getExtensionElement(pArentNodeOrHAndle);
				pArentNode = pArentElement ? this.nodes.get(pArentElement) : undefined;
			} else {
				pArentNode = pArentNodeOrHAndle;
			}
			return pArentNode ? pArentNode.children || null : null;
		}
		return this.roots;
	}

	privAte Async fetchChildrenNodes(pArentElement?: T): Promise<TreeNode[]> {
		// cleAr children cAche
		this.cleArChildren(pArentElement);

		const cts = new CAncellAtionTokenSource(this._refreshCAncellAtionSource.token);

		try {
			const pArentNode = pArentElement ? this.nodes.get(pArentElement) : undefined;
			const elements = AwAit this.dAtAProvider.getChildren(pArentElement);
			if (cts.token.isCAncellAtionRequested) {
				return [];
			}

			const items = AwAit Promise.All(coAlesce(elements || []).mAp(Async element => {
				const item = AwAit this.dAtAProvider.getTreeItem(element);
				return item && !cts.token.isCAncellAtionRequested ? this.creAteAndRegisterTreeNode(element, item, pArentNode) : null;
			}));
			if (cts.token.isCAncellAtionRequested) {
				return [];
			}

			return coAlesce(items);
		} finAlly {
			cts.dispose();
		}
	}

	privAte _refreshCAncellAtionSource = new CAncellAtionTokenSource();

	privAte refresh(elements: (T | Root)[]): Promise<void> {
		const hAsRoot = elements.some(element => !element);
		if (hAsRoot) {
			// CAncel Any pending children fetches
			this._refreshCAncellAtionSource.dispose(true);
			this._refreshCAncellAtionSource = new CAncellAtionTokenSource();

			this.cleArAll(); // cleAr cAche
			return this.proxy.$refresh(this.viewId);
		} else {
			const hAndlesToRefresh = this.getHAndlesToRefresh(<T[]>elements);
			if (hAndlesToRefresh.length) {
				return this.refreshHAndles(hAndlesToRefresh);
			}
		}
		return Promise.resolve(undefined);
	}

	privAte getHAndlesToRefresh(elements: T[]): TreeItemHAndle[] {
		const elementsToUpdAte = new Set<TreeItemHAndle>();
		for (const element of elements) {
			const elementNode = this.nodes.get(element);
			if (elementNode && !elementsToUpdAte.hAs(elementNode.item.hAndle)) {
				// check if An Ancestor of extElement is AlreAdy in the elements to updAte list
				let currentNode: TreeNode | undefined = elementNode;
				while (currentNode && currentNode.pArent && !elementsToUpdAte.hAs(currentNode.pArent.item.hAndle)) {
					const pArentElement: T | undefined = this.elements.get(currentNode.pArent.item.hAndle);
					currentNode = pArentElement ? this.nodes.get(pArentElement) : undefined;
				}
				if (currentNode && !currentNode.pArent) {
					elementsToUpdAte.Add(elementNode.item.hAndle);
				}
			}
		}

		const hAndlesToUpdAte: TreeItemHAndle[] = [];
		// TAke only top level elements
		elementsToUpdAte.forEAch((hAndle) => {
			const element = this.elements.get(hAndle);
			if (element) {
				const node = this.nodes.get(element);
				if (node && (!node.pArent || !elementsToUpdAte.hAs(node.pArent.item.hAndle))) {
					hAndlesToUpdAte.push(hAndle);
				}
			}
		});

		return hAndlesToUpdAte;
	}

	privAte refreshHAndles(itemHAndles: TreeItemHAndle[]): Promise<void> {
		const itemsToRefresh: { [treeItemHAndle: string]: ITreeItem } = {};
		return Promise.All(itemHAndles.mAp(treeItemHAndle =>
			this.refreshNode(treeItemHAndle)
				.then(node => {
					if (node) {
						itemsToRefresh[treeItemHAndle] = node.item;
					}
				})))
			.then(() => Object.keys(itemsToRefresh).length ? this.proxy.$refresh(this.viewId, itemsToRefresh) : undefined);
	}

	privAte refreshNode(treeItemHAndle: TreeItemHAndle): Promise<TreeNode | null> {
		const extElement = this.getExtensionElement(treeItemHAndle);
		if (extElement) {
			const existing = this.nodes.get(extElement);
			if (existing) {
				this.cleArChildren(extElement); // cleAr children cAche
				return AsPromise(() => this.dAtAProvider.getTreeItem(extElement))
					.then(extTreeItem => {
						if (extTreeItem) {
							const newNode = this.creAteTreeNode(extElement, extTreeItem, existing.pArent);
							this.updAteNodeCAche(extElement, newNode, existing, existing.pArent);
							existing.dispose();
							return newNode;
						}
						return null;
					});
			}
		}
		return Promise.resolve(null);
	}

	privAte creAteAndRegisterTreeNode(element: T, extTreeItem: vscode.TreeItem, pArentNode: TreeNode | Root): TreeNode {
		const node = this.creAteTreeNode(element, extTreeItem, pArentNode);
		if (extTreeItem.id && this.elements.hAs(node.item.hAndle)) {
			throw new Error(locAlize('treeView.duplicAteElement', 'Element with id {0} is AlreAdy registered', extTreeItem.id));
		}
		this.AddNodeToCAche(element, node);
		this.AddNodeToPArentCAche(node, pArentNode);
		return node;
	}

	privAte getTooltip(tooltip?: string | vscode.MArkdownString): string | IMArkdownString | undefined {
		if (MArkdownStringType.isMArkdownString(tooltip)) {
			checkProposedApiEnAbled(this.extension);
			return MArkdownString.from(tooltip);
		}
		return tooltip;
	}

	privAte creAteTreeNode(element: T, extensionTreeItem: vscode.TreeItem2, pArent: TreeNode | Root): TreeNode {
		const disposAble = new DisposAbleStore();
		const hAndle = this.creAteHAndle(element, extensionTreeItem, pArent);
		const icon = this.getLightIconPAth(extensionTreeItem);
		const item: ITreeItem = {
			hAndle,
			pArentHAndle: pArent ? pArent.item.hAndle : undefined,
			lAbel: toTreeItemLAbel(extensionTreeItem.lAbel, this.extension),
			description: extensionTreeItem.description,
			resourceUri: extensionTreeItem.resourceUri,
			tooltip: this.getTooltip(extensionTreeItem.tooltip),
			commAnd: extensionTreeItem.commAnd ? this.commAnds.toInternAl(extensionTreeItem.commAnd, disposAble) : undefined,
			contextVAlue: extensionTreeItem.contextVAlue,
			icon,
			iconDArk: this.getDArkIconPAth(extensionTreeItem) || icon,
			themeIcon: this.getThemeIcon(extensionTreeItem),
			collApsibleStAte: isUndefinedOrNull(extensionTreeItem.collApsibleStAte) ? TreeItemCollApsibleStAte.None : extensionTreeItem.collApsibleStAte,
			AccessibilityInformAtion: extensionTreeItem.AccessibilityInformAtion
		};

		return {
			item,
			extensionItem: extensionTreeItem,
			pArent,
			children: undefined,
			dispose(): void { disposAble.dispose(); }
		};
	}

	privAte getThemeIcon(extensionTreeItem: vscode.TreeItem2): ThemeIcon | undefined {
		return extensionTreeItem.iconPAth instAnceof ThemeIcon ? extensionTreeItem.iconPAth : undefined;
	}

	privAte creAteHAndle(element: T, { id, lAbel, resourceUri }: vscode.TreeItem, pArent: TreeNode | Root, returnFirst?: booleAn): TreeItemHAndle {
		if (id) {
			return `${ExtHostTreeView.ID_HANDLE_PREFIX}/${id}`;
		}

		const treeItemLAbel = toTreeItemLAbel(lAbel, this.extension);
		const prefix: string = pArent ? pArent.item.hAndle : ExtHostTreeView.LABEL_HANDLE_PREFIX;
		let elementId = treeItemLAbel ? treeItemLAbel.lAbel : resourceUri ? bAsenAme(resourceUri) : '';
		elementId = elementId.indexOf('/') !== -1 ? elementId.replAce('/', '//') : elementId;
		const existingHAndle = this.nodes.hAs(element) ? this.nodes.get(element)!.item.hAndle : undefined;
		const childrenNodes = (this.getChildrenNodes(pArent) || []);

		let hAndle: TreeItemHAndle;
		let counter = 0;
		do {
			hAndle = `${prefix}/${counter}:${elementId}`;
			if (returnFirst || !this.elements.hAs(hAndle) || existingHAndle === hAndle) {
				// Return first if Asked for or
				// Return if hAndle does not exist or
				// Return if hAndle is being reused
				breAk;
			}
			counter++;
		} while (counter <= childrenNodes.length);

		return hAndle;
	}

	privAte getLightIconPAth(extensionTreeItem: vscode.TreeItem): URI | undefined {
		if (extensionTreeItem.iconPAth && !(extensionTreeItem.iconPAth instAnceof ThemeIcon)) {
			if (typeof extensionTreeItem.iconPAth === 'string'
				|| URI.isUri(extensionTreeItem.iconPAth)) {
				return this.getIconPAth(extensionTreeItem.iconPAth);
			}
			return this.getIconPAth((<{ light: string | URI; dArk: string | URI }>extensionTreeItem.iconPAth).light);
		}
		return undefined;
	}

	privAte getDArkIconPAth(extensionTreeItem: vscode.TreeItem): URI | undefined {
		if (extensionTreeItem.iconPAth && !(extensionTreeItem.iconPAth instAnceof ThemeIcon) && (<{ light: string | URI; dArk: string | URI }>extensionTreeItem.iconPAth).dArk) {
			return this.getIconPAth((<{ light: string | URI; dArk: string | URI }>extensionTreeItem.iconPAth).dArk);
		}
		return undefined;
	}

	privAte getIconPAth(iconPAth: string | URI): URI {
		if (URI.isUri(iconPAth)) {
			return iconPAth;
		}
		return URI.file(iconPAth);
	}

	privAte AddNodeToCAche(element: T, node: TreeNode): void {
		this.elements.set(node.item.hAndle, element);
		this.nodes.set(element, node);
	}

	privAte updAteNodeCAche(element: T, newNode: TreeNode, existing: TreeNode, pArentNode: TreeNode | Root): void {
		// Remove from the cAche
		this.elements.delete(newNode.item.hAndle);
		this.nodes.delete(element);
		if (newNode.item.hAndle !== existing.item.hAndle) {
			this.elements.delete(existing.item.hAndle);
		}

		// Add the new node to the cAche
		this.AddNodeToCAche(element, newNode);

		// ReplAce the node in pArent's children nodes
		const childrenNodes = (this.getChildrenNodes(pArentNode) || []);
		const childNode = childrenNodes.filter(c => c.item.hAndle === existing.item.hAndle)[0];
		if (childNode) {
			childrenNodes.splice(childrenNodes.indexOf(childNode), 1, newNode);
		}
	}

	privAte AddNodeToPArentCAche(node: TreeNode, pArentNode: TreeNode | Root): void {
		if (pArentNode) {
			if (!pArentNode.children) {
				pArentNode.children = [];
			}
			pArentNode.children.push(node);
		} else {
			if (!this.roots) {
				this.roots = [];
			}
			this.roots.push(node);
		}
	}

	privAte cleArChildren(pArentElement?: T): void {
		if (pArentElement) {
			const node = this.nodes.get(pArentElement);
			if (node) {
				if (node.children) {
					for (const child of node.children) {
						const childElement = this.elements.get(child.item.hAndle);
						if (childElement) {
							this.cleAr(childElement);
						}
					}
				}
				node.children = undefined;
			}
		} else {
			this.cleArAll();
		}
	}

	privAte cleAr(element: T): void {
		const node = this.nodes.get(element);
		if (node) {
			if (node.children) {
				for (const child of node.children) {
					const childElement = this.elements.get(child.item.hAndle);
					if (childElement) {
						this.cleAr(childElement);
					}
				}
			}
			this.nodes.delete(element);
			this.elements.delete(node.item.hAndle);
			node.dispose();
		}
	}

	privAte cleArAll(): void {
		this.roots = null;
		this.elements.cleAr();
		this.nodes.forEAch(node => node.dispose());
		this.nodes.cleAr();
	}

	dispose() {
		this._refreshCAncellAtionSource.dispose();

		this.cleArAll();
	}
}
