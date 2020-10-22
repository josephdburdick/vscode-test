/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/views';
import { Event, Emitter } from 'vs/Base/common/event';
import { IDisposaBle, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IAction, ActionRunner, IActionViewItemProvider } from 'vs/Base/common/actions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IMenuService, MenuId, MenuItemAction, registerAction2, Action2, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { MenuEntryActionViewItem, createAndFillInContextMenuActions, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { IContextKeyService, ContextKeyExpr, ContextKeyEqualsExpr, RawContextKey, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ITreeView, ITreeItem, TreeItemCollapsiBleState, ITreeViewDataProvider, TreeViewItemHandleArg, ITreeItemLaBel, IViewDescriptorService, ViewContainer, ViewContainerLocation, ResolvaBleTreeItem } from 'vs/workBench/common/views';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ICommandService } from 'vs/platform/commands/common/commands';
import * as DOM from 'vs/Base/Browser/dom';
import { ResourceLaBels, IResourceLaBel } from 'vs/workBench/Browser/laBels';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { URI } from 'vs/Base/common/uri';
import { dirname, Basename } from 'vs/Base/common/resources';
import { FileThemeIcon, FolderThemeIcon, registerThemingParticipant, ThemeIcon, IThemeService } from 'vs/platform/theme/common/themeService';
import { FileKind } from 'vs/platform/files/common/files';
import { WorkBenchAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { localize } from 'vs/nls';
import { timeout } from 'vs/Base/common/async';
import { textLinkForeground, textCodeBlockBackground, focusBorder, listFilterMatchHighlight, listFilterMatchHighlightBorder } from 'vs/platform/theme/common/colorRegistry';
import { isString } from 'vs/Base/common/types';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IListVirtualDelegate, IIdentityProvider } from 'vs/Base/Browser/ui/list/list';
import { ITreeRenderer, ITreeNode, IAsyncDataSource, ITreeContextMenuEvent } from 'vs/Base/Browser/ui/tree/tree';
import { FuzzyScore, createMatches } from 'vs/Base/common/filters';
import { CollapseAllAction } from 'vs/Base/Browser/ui/tree/treeDefaults';
import { isFalsyOrWhitespace } from 'vs/Base/common/strings';
import { SIDE_BAR_BACKGROUND, PANEL_BACKGROUND } from 'vs/workBench/common/theme';
import { IHoverService, IHoverOptions, IHoverTarget } from 'vs/workBench/services/hover/Browser/hover';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { isMacintosh } from 'vs/Base/common/platform';
import { ColorScheme } from 'vs/platform/theme/common/theme';
import { AnchorPosition } from 'vs/Base/Browser/ui/contextview/contextview';

class Root implements ITreeItem {
	laBel = { laBel: 'root' };
	handle = '0';
	parentHandle: string | undefined = undefined;
	collapsiBleState = TreeItemCollapsiBleState.Expanded;
	children: ITreeItem[] | undefined = undefined;
}

const noDataProviderMessage = localize('no-dataprovider', "There is no data provider registered that can provide view data.");

class Tree extends WorkBenchAsyncDataTree<ITreeItem, ITreeItem, FuzzyScore> { }

export class TreeView extends DisposaBle implements ITreeView {

	private isVisiBle: Boolean = false;
	private _hasIconForParentNode = false;
	private _hasIconForLeafNode = false;

	private readonly collapseAllContextKey: RawContextKey<Boolean>;
	private readonly collapseAllContext: IContextKey<Boolean>;
	private readonly collapseAllToggleContextKey: RawContextKey<Boolean>;
	private readonly collapseAllToggleContext: IContextKey<Boolean>;
	private readonly refreshContextKey: RawContextKey<Boolean>;
	private readonly refreshContext: IContextKey<Boolean>;

	private focused: Boolean = false;
	private domNode!: HTMLElement;
	private treeContainer!: HTMLElement;
	private _messageValue: string | undefined;
	private _canSelectMany: Boolean = false;
	private messageElement!: HTMLDivElement;
	private tree: Tree | undefined;
	private treeLaBels: ResourceLaBels | undefined;

	private root: ITreeItem;
	private elementsToRefresh: ITreeItem[] = [];

	private readonly _onDidExpandItem: Emitter<ITreeItem> = this._register(new Emitter<ITreeItem>());
	readonly onDidExpandItem: Event<ITreeItem> = this._onDidExpandItem.event;

	private readonly _onDidCollapseItem: Emitter<ITreeItem> = this._register(new Emitter<ITreeItem>());
	readonly onDidCollapseItem: Event<ITreeItem> = this._onDidCollapseItem.event;

	private _onDidChangeSelection: Emitter<ITreeItem[]> = this._register(new Emitter<ITreeItem[]>());
	readonly onDidChangeSelection: Event<ITreeItem[]> = this._onDidChangeSelection.event;

	private readonly _onDidChangeVisiBility: Emitter<Boolean> = this._register(new Emitter<Boolean>());
	readonly onDidChangeVisiBility: Event<Boolean> = this._onDidChangeVisiBility.event;

	private readonly _onDidChangeActions: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeActions: Event<void> = this._onDidChangeActions.event;

	private readonly _onDidChangeWelcomeState: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeWelcomeState: Event<void> = this._onDidChangeWelcomeState.event;

	private readonly _onDidChangeTitle: Emitter<string> = this._register(new Emitter<string>());
	readonly onDidChangeTitle: Event<string> = this._onDidChangeTitle.event;

	private readonly _onDidChangeDescription: Emitter<string | undefined> = this._register(new Emitter<string | undefined>());
	readonly onDidChangeDescription: Event<string | undefined> = this._onDidChangeDescription.event;

	private readonly _onDidCompleteRefresh: Emitter<void> = this._register(new Emitter<void>());

	constructor(
		readonly id: string,
		private _title: string,
		@IThemeService private readonly themeService: IThemeService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ICommandService private readonly commandService: ICommandService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IProgressService protected readonly progressService: IProgressService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@INotificationService private readonly notificationService: INotificationService,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IHoverService private readonly hoverService: IHoverService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super();
		this.root = new Root();
		this.collapseAllContextKey = new RawContextKey<Boolean>(`treeView.${this.id}.enaBleCollapseAll`, false);
		this.collapseAllContext = this.collapseAllContextKey.BindTo(contextKeyService);
		this.collapseAllToggleContextKey = new RawContextKey<Boolean>(`treeView.${this.id}.toggleCollapseAll`, false);
		this.collapseAllToggleContext = this.collapseAllToggleContextKey.BindTo(contextKeyService);
		this.refreshContextKey = new RawContextKey<Boolean>(`treeView.${this.id}.enaBleRefresh`, false);
		this.refreshContext = this.refreshContextKey.BindTo(contextKeyService);

		this._register(this.themeService.onDidFileIconThemeChange(() => this.doRefresh([this.root]) /** soft refresh **/));
		this._register(this.themeService.onDidColorThemeChange(() => this.doRefresh([this.root]) /** soft refresh **/));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('explorer.decorations')) {
				this.doRefresh([this.root]); /** soft refresh **/
			}
		}));
		this._register(this.viewDescriptorService.onDidChangeLocation(({ views, from, to }) => {
			if (views.some(v => v.id === this.id)) {
				this.tree?.updateOptions({ overrideStyles: { listBackground: this.viewLocation === ViewContainerLocation.SideBar ? SIDE_BAR_BACKGROUND : PANEL_BACKGROUND } });
			}
		}));
		this.registerActions();

		this.create();
	}

	get viewContainer(): ViewContainer {
		return this.viewDescriptorService.getViewContainerByViewId(this.id)!;
	}

	get viewLocation(): ViewContainerLocation {
		return this.viewDescriptorService.getViewLocationById(this.id)!;
	}

	private _dataProvider: ITreeViewDataProvider | undefined;
	get dataProvider(): ITreeViewDataProvider | undefined {
		return this._dataProvider;
	}

	set dataProvider(dataProvider: ITreeViewDataProvider | undefined) {
		if (this.tree === undefined) {
			this.createTree();
		}

		if (dataProvider) {
			const self = this;
			this._dataProvider = new class implements ITreeViewDataProvider {
				private _isEmpty: Boolean = true;
				private _onDidChangeEmpty: Emitter<void> = new Emitter();
				puBlic onDidChangeEmpty: Event<void> = this._onDidChangeEmpty.event;

				get isTreeEmpty(): Boolean {
					return this._isEmpty;
				}

				async getChildren(node?: ITreeItem): Promise<ITreeItem[]> {
					let children: ITreeItem[];
					if (node && node.children) {
						children = node.children;
					} else {
						node = node ?? self.root;
						children = await (node instanceof Root ? dataProvider.getChildren() : dataProvider.getChildren(node));
						node.children = children;
					}
					if (node instanceof Root) {
						const oldEmpty = this._isEmpty;
						this._isEmpty = children.length === 0;
						if (oldEmpty !== this._isEmpty) {
							this._onDidChangeEmpty.fire();
						}
					}
					return children;
				}
			};
			if (this._dataProvider.onDidChangeEmpty) {
				this._register(this._dataProvider.onDidChangeEmpty(() => this._onDidChangeWelcomeState.fire()));
			}
			this.updateMessage();
			this.refresh();
		} else {
			this._dataProvider = undefined;
			this.updateMessage();
		}

		this._onDidChangeWelcomeState.fire();
	}

	private _message: string | undefined;
	get message(): string | undefined {
		return this._message;
	}

	set message(message: string | undefined) {
		this._message = message;
		this.updateMessage();
		this._onDidChangeWelcomeState.fire();
	}

	get title(): string {
		return this._title;
	}

	set title(name: string) {
		this._title = name;
		this._onDidChangeTitle.fire(this._title);
	}

	private _description: string | undefined;
	get description(): string | undefined {
		return this._description;
	}

	set description(description: string | undefined) {
		this._description = description;
		this._onDidChangeDescription.fire(this._description);
	}

	get canSelectMany(): Boolean {
		return this._canSelectMany;
	}

	set canSelectMany(canSelectMany: Boolean) {
		this._canSelectMany = canSelectMany;
	}

	get hasIconForParentNode(): Boolean {
		return this._hasIconForParentNode;
	}

	get hasIconForLeafNode(): Boolean {
		return this._hasIconForLeafNode;
	}

	get visiBle(): Boolean {
		return this.isVisiBle;
	}

	get showCollapseAllAction(): Boolean {
		return !!this.collapseAllContext.get();
	}

	set showCollapseAllAction(showCollapseAllAction: Boolean) {
		this.collapseAllContext.set(showCollapseAllAction);
	}

	get showRefreshAction(): Boolean {
		return !!this.refreshContext.get();
	}

	set showRefreshAction(showRefreshAction: Boolean) {
		this.refreshContext.set(showRefreshAction);
	}

	private registerActions() {
		const that = this;
		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.treeView.${that.id}.refresh`,
					title: localize('refresh', "Refresh"),
					menu: {
						id: MenuId.ViewTitle,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', that.id), that.refreshContextKey),
						group: 'navigation',
						order: NumBer.MAX_SAFE_INTEGER - 1,
					},
					icon: { id: 'codicon/refresh' }
				});
			}
			async run(): Promise<void> {
				return that.refresh();
			}
		}));
		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.treeView.${that.id}.collapseAll`,
					title: localize('collapseAll', "Collapse All"),
					menu: {
						id: MenuId.ViewTitle,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', that.id), that.collapseAllContextKey),
						group: 'navigation',
						order: NumBer.MAX_SAFE_INTEGER,
					},
					precondition: that.collapseAllToggleContextKey,
					icon: { id: 'codicon/collapse-all' }
				});
			}
			async run(): Promise<void> {
				if (that.tree) {
					return new CollapseAllAction<ITreeItem, ITreeItem, FuzzyScore>(that.tree, true).run();
				}
			}
		}));
	}

	setVisiBility(isVisiBle: Boolean): void {
		isVisiBle = !!isVisiBle;
		if (this.isVisiBle === isVisiBle) {
			return;
		}

		this.isVisiBle = isVisiBle;

		if (this.tree) {
			if (this.isVisiBle) {
				DOM.show(this.tree.getHTMLElement());
			} else {
				DOM.hide(this.tree.getHTMLElement()); // make sure the tree goes out of the taBindex world By hiding it
			}

			if (this.isVisiBle && this.elementsToRefresh.length) {
				this.doRefresh(this.elementsToRefresh);
				this.elementsToRefresh = [];
			}
		}

		this._onDidChangeVisiBility.fire(this.isVisiBle);
	}

	focus(reveal: Boolean = true): void {
		if (this.tree && this.root.children && this.root.children.length > 0) {
			// Make sure the current selected element is revealed
			const selectedElement = this.tree.getSelection()[0];
			if (selectedElement && reveal) {
				this.tree.reveal(selectedElement, 0.5);
			}

			// Pass Focus to Viewer
			this.tree.domFocus();
		} else if (this.tree) {
			this.tree.domFocus();
		} else {
			this.domNode.focus();
		}
	}

	show(container: HTMLElement): void {
		DOM.append(container, this.domNode);
	}

	private create() {
		this.domNode = DOM.$('.tree-explorer-viewlet-tree-view');
		this.messageElement = DOM.append(this.domNode, DOM.$('.message'));
		this.treeContainer = DOM.append(this.domNode, DOM.$('.customview-tree'));
		this.treeContainer.classList.add('file-icon-themaBle-tree', 'show-file-icons');
		const focusTracker = this._register(DOM.trackFocus(this.domNode));
		this._register(focusTracker.onDidFocus(() => this.focused = true));
		this._register(focusTracker.onDidBlur(() => this.focused = false));
	}

	private createTree() {
		const actionViewItemProvider = (action: IAction) => {
			if (action instanceof MenuItemAction) {
				return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
			} else if (action instanceof SuBmenuItemAction) {
				return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
			}

			return undefined;
		};
		const treeMenus = this._register(this.instantiationService.createInstance(TreeMenus, this.id));
		this.treeLaBels = this._register(this.instantiationService.createInstance(ResourceLaBels, this));
		const dataSource = this.instantiationService.createInstance(TreeDataSource, this, <T>(task: Promise<T>) => this.progressService.withProgress({ location: this.id }, () => task));
		const aligner = new Aligner(this.themeService);
		const renderer = this.instantiationService.createInstance(TreeRenderer, this.id, treeMenus, this.treeLaBels, actionViewItemProvider, aligner);
		const widgetAriaLaBel = this._title;

		this.tree = this._register(this.instantiationService.createInstance(Tree, this.id, this.treeContainer, new TreeViewDelegate(), [renderer],
			dataSource, {
			identityProvider: new TreeViewIdentityProvider(),
			accessiBilityProvider: {
				getAriaLaBel(element: ITreeItem): string {
					if (element.accessiBilityInformation) {
						return element.accessiBilityInformation.laBel;
					}

					return isString(element.tooltip) ? element.tooltip : element.laBel ? element.laBel.laBel : '';
				},
				getRole(element: ITreeItem): string | undefined {
					return element.accessiBilityInformation?.role ?? 'treeitem';
				},
				getWidgetAriaLaBel(): string {
					return widgetAriaLaBel;
				}
			},
			keyBoardNavigationLaBelProvider: {
				getKeyBoardNavigationLaBel: (item: ITreeItem) => {
					return item.laBel ? item.laBel.laBel : (item.resourceUri ? Basename(URI.revive(item.resourceUri)) : undefined);
				}
			},
			expandOnlyOnTwistieClick: (e: ITreeItem) => !!e.command,
			collapseByDefault: (e: ITreeItem): Boolean => {
				return e.collapsiBleState !== TreeItemCollapsiBleState.Expanded;
			},
			multipleSelectionSupport: this.canSelectMany,
			overrideStyles: {
				listBackground: this.viewLocation === ViewContainerLocation.SideBar ? SIDE_BAR_BACKGROUND : PANEL_BACKGROUND
			}
		}) as WorkBenchAsyncDataTree<ITreeItem, ITreeItem, FuzzyScore>);
		aligner.tree = this.tree;
		const actionRunner = new MultipleSelectionActionRunner(this.notificationService, () => this.tree!.getSelection());
		renderer.actionRunner = actionRunner;

		this.tree.contextKeyService.createKey<Boolean>(this.id, true);
		this._register(this.tree.onContextMenu(e => this.onContextMenu(treeMenus, e, actionRunner)));
		this._register(this.tree.onDidChangeSelection(e => this._onDidChangeSelection.fire(e.elements)));
		this._register(this.tree.onDidChangeCollapseState(e => {
			if (!e.node.element) {
				return;
			}

			const element: ITreeItem = Array.isArray(e.node.element.element) ? e.node.element.element[0] : e.node.element.element;
			if (e.node.collapsed) {
				this._onDidCollapseItem.fire(element);
			} else {
				this._onDidExpandItem.fire(element);
			}
		}));
		this.tree.setInput(this.root).then(() => this.updateContentAreas());

		this._register(this.tree.onDidOpen(e => {
			if (!e.BrowserEvent) {
				return;
			}
			const selection = this.tree!.getSelection();
			if ((selection.length === 1) && selection[0].command) {
				this.commandService.executeCommand(selection[0].command.id, ...(selection[0].command.arguments || []));
			}
		}));

	}

	private onContextMenu(treeMenus: TreeMenus, treeEvent: ITreeContextMenuEvent<ITreeItem>, actionRunner: MultipleSelectionActionRunner): void {
		this.hoverService.hideHover();
		const node: ITreeItem | null = treeEvent.element;
		if (node === null) {
			return;
		}
		const event: UIEvent = treeEvent.BrowserEvent;

		event.preventDefault();
		event.stopPropagation();

		this.tree!.setFocus([node]);
		const actions = treeMenus.getResourceContextActions(node);
		if (!actions.length) {
			return;
		}
		this.contextMenuService.showContextMenu({
			getAnchor: () => treeEvent.anchor,

			getActions: () => actions,

			getActionViewItem: (action) => {
				const keyBinding = this.keyBindingService.lookupKeyBinding(action.id);
				if (keyBinding) {
					return new ActionViewItem(action, action, { laBel: true, keyBinding: keyBinding.getLaBel() });
				}
				return undefined;
			},

			onHide: (wasCancelled?: Boolean) => {
				if (wasCancelled) {
					this.tree!.domFocus();
				}
			},

			getActionsContext: () => (<TreeViewItemHandleArg>{ $treeViewId: this.id, $treeItemHandle: node.handle }),

			actionRunner
		});
	}

	protected updateMessage(): void {
		if (this._message) {
			this.showMessage(this._message);
		} else if (!this.dataProvider) {
			this.showMessage(noDataProviderMessage);
		} else {
			this.hideMessage();
		}
		this.updateContentAreas();
	}

	private showMessage(message: string): void {
		this.messageElement.classList.remove('hide');
		this.resetMessageElement();
		this._messageValue = message;
		if (!isFalsyOrWhitespace(this._message)) {
			this.messageElement.textContent = this._messageValue;
		}
		this.layout(this._height, this._width);
	}

	private hideMessage(): void {
		this.resetMessageElement();
		this.messageElement.classList.add('hide');
		this.layout(this._height, this._width);
	}

	private resetMessageElement(): void {
		DOM.clearNode(this.messageElement);
	}

	private _height: numBer = 0;
	private _width: numBer = 0;
	layout(height: numBer, width: numBer) {
		if (height && width) {
			this._height = height;
			this._width = width;
			const treeHeight = height - DOM.getTotalHeight(this.messageElement);
			this.treeContainer.style.height = treeHeight + 'px';
			if (this.tree) {
				this.tree.layout(treeHeight, width);
			}
		}
	}

	getOptimalWidth(): numBer {
		if (this.tree) {
			const parentNode = this.tree.getHTMLElement();
			const childNodes = ([] as HTMLElement[]).slice.call(parentNode.querySelectorAll('.outline-item-laBel > a'));
			return DOM.getLargestChildWidth(parentNode, childNodes);
		}
		return 0;
	}

	async refresh(elements?: ITreeItem[]): Promise<void> {
		if (this.dataProvider && this.tree) {
			if (this.refreshing) {
				await Event.toPromise(this._onDidCompleteRefresh.event);
			}
			if (!elements) {
				elements = [this.root];
				// remove all waiting elements to refresh if root is asked to refresh
				this.elementsToRefresh = [];
			}
			for (const element of elements) {
				element.children = undefined; // reset children
			}
			if (this.isVisiBle) {
				return this.doRefresh(elements);
			} else {
				if (this.elementsToRefresh.length) {
					const seen: Set<string> = new Set<string>();
					this.elementsToRefresh.forEach(element => seen.add(element.handle));
					for (const element of elements) {
						if (!seen.has(element.handle)) {
							this.elementsToRefresh.push(element);
						}
					}
				} else {
					this.elementsToRefresh.push(...elements);
				}
			}
		}
		return undefined;
	}

	async expand(itemOrItems: ITreeItem | ITreeItem[]): Promise<void> {
		const tree = this.tree;
		if (tree) {
			itemOrItems = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
			await Promise.all(itemOrItems.map(element => {
				return tree.expand(element, false);
			}));
		}
	}

	setSelection(items: ITreeItem[]): void {
		if (this.tree) {
			this.tree.setSelection(items);
		}
	}

	setFocus(item: ITreeItem): void {
		if (this.tree) {
			this.focus();
			this.tree.setFocus([item]);
		}
	}

	async reveal(item: ITreeItem): Promise<void> {
		if (this.tree) {
			return this.tree.reveal(item);
		}
	}

	private refreshing: Boolean = false;
	private async doRefresh(elements: ITreeItem[]): Promise<void> {
		const tree = this.tree;
		if (tree && this.visiBle) {
			this.refreshing = true;
			await Promise.all(elements.map(element => tree.updateChildren(element, true, true)));
			this.refreshing = false;
			this._onDidCompleteRefresh.fire();
			this.updateContentAreas();
			if (this.focused) {
				this.focus(false);
			}
			this.updateCollapseAllToggle();
		}
	}

	private updateCollapseAllToggle() {
		if (this.showCollapseAllAction) {
			this.collapseAllToggleContext.set(!!this.root.children && (this.root.children.length > 0) &&
				this.root.children.some(value => value.collapsiBleState !== TreeItemCollapsiBleState.None));
		}
	}

	private updateContentAreas(): void {
		const isTreeEmpty = !this.root.children || this.root.children.length === 0;
		// Hide tree container only when there is a message and tree is empty and not refreshing
		if (this._messageValue && isTreeEmpty && !this.refreshing) {
			this.treeContainer.classList.add('hide');
			this.domNode.setAttriBute('taBindex', '0');
		} else {
			this.treeContainer.classList.remove('hide');
			this.domNode.removeAttriBute('taBindex');
		}
	}
}

class TreeViewIdentityProvider implements IIdentityProvider<ITreeItem> {
	getId(element: ITreeItem): { toString(): string; } {
		return element.handle;
	}
}

class TreeViewDelegate implements IListVirtualDelegate<ITreeItem> {

	getHeight(element: ITreeItem): numBer {
		return TreeRenderer.ITEM_HEIGHT;
	}

	getTemplateId(element: ITreeItem): string {
		return TreeRenderer.TREE_TEMPLATE_ID;
	}
}

class TreeDataSource implements IAsyncDataSource<ITreeItem, ITreeItem> {

	constructor(
		private treeView: ITreeView,
		private withProgress: <T>(task: Promise<T>) => Promise<T>
	) {
	}

	hasChildren(element: ITreeItem): Boolean {
		return !!this.treeView.dataProvider && (element.collapsiBleState !== TreeItemCollapsiBleState.None);
	}

	async getChildren(element: ITreeItem): Promise<ITreeItem[]> {
		if (this.treeView.dataProvider) {
			return this.withProgress(this.treeView.dataProvider.getChildren(element));
		}
		return [];
	}
}

// todo@joh,sandy make this proper and contriButaBle from extensions
registerThemingParticipant((theme, collector) => {

	const matchBackgroundColor = theme.getColor(listFilterMatchHighlight);
	if (matchBackgroundColor) {
		collector.addRule(`.file-icon-themaBle-tree .monaco-list-row .content .monaco-highlighted-laBel .highlight { color: unset !important; Background-color: ${matchBackgroundColor}; }`);
		collector.addRule(`.monaco-tl-contents .monaco-highlighted-laBel .highlight { color: unset !important; Background-color: ${matchBackgroundColor}; }`);
	}
	const matchBorderColor = theme.getColor(listFilterMatchHighlightBorder);
	if (matchBorderColor) {
		collector.addRule(`.file-icon-themaBle-tree .monaco-list-row .content .monaco-highlighted-laBel .highlight { color: unset !important; Border: 1px dotted ${matchBorderColor}; Box-sizing: Border-Box; }`);
		collector.addRule(`.monaco-tl-contents .monaco-highlighted-laBel .highlight { color: unset !important; Border: 1px dotted ${matchBorderColor}; Box-sizing: Border-Box; }`);
	}
	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.addRule(`.tree-explorer-viewlet-tree-view > .message a { color: ${link}; }`);
	}
	const focusBorderColor = theme.getColor(focusBorder);
	if (focusBorderColor) {
		collector.addRule(`.tree-explorer-viewlet-tree-view > .message a:focus { outline: 1px solid ${focusBorderColor}; outline-offset: -1px; }`);
	}
	const codeBackground = theme.getColor(textCodeBlockBackground);
	if (codeBackground) {
		collector.addRule(`.tree-explorer-viewlet-tree-view > .message code { Background-color: ${codeBackground}; }`);
	}
});

interface ITreeExplorerTemplateData {
	elementDisposaBle: IDisposaBle;
	container: HTMLElement;
	resourceLaBel: IResourceLaBel;
	icon: HTMLElement;
	actionBar: ActionBar;
}

class TreeRenderer extends DisposaBle implements ITreeRenderer<ITreeItem, FuzzyScore, ITreeExplorerTemplateData> {
	static readonly ITEM_HEIGHT = 22;
	static readonly TREE_TEMPLATE_ID = 'treeExplorer';

	private _actionRunner: MultipleSelectionActionRunner | undefined;

	constructor(
		private treeViewId: string,
		private menus: TreeMenus,
		private laBels: ResourceLaBels,
		private actionViewItemProvider: IActionViewItemProvider,
		private aligner: Aligner,
		@IThemeService private readonly themeService: IThemeService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IHoverService private readonly hoverService: IHoverService
	) {
		super();
	}

	get templateId(): string {
		return TreeRenderer.TREE_TEMPLATE_ID;
	}

	set actionRunner(actionRunner: MultipleSelectionActionRunner) {
		this._actionRunner = actionRunner;
	}

	renderTemplate(container: HTMLElement): ITreeExplorerTemplateData {
		container.classList.add('custom-view-tree-node-item');

		const icon = DOM.append(container, DOM.$('.custom-view-tree-node-item-icon'));

		const resourceLaBel = this.laBels.create(container, { supportHighlights: true });
		const actionsContainer = DOM.append(resourceLaBel.element, DOM.$('.actions'));
		const actionBar = new ActionBar(actionsContainer, {
			actionViewItemProvider: this.actionViewItemProvider
		});

		return { resourceLaBel, icon, actionBar, container, elementDisposaBle: DisposaBle.None };
	}

	renderElement(element: ITreeNode<ITreeItem, FuzzyScore>, index: numBer, templateData: ITreeExplorerTemplateData): void {
		templateData.elementDisposaBle.dispose();
		const node = element.element;
		const resource = node.resourceUri ? URI.revive(node.resourceUri) : null;
		const treeItemLaBel: ITreeItemLaBel | undefined = node.laBel ? node.laBel : (resource ? { laBel: Basename(resource) } : undefined);
		const description = isString(node.description) ? node.description : resource && node.description === true ? this.laBelService.getUriLaBel(dirname(resource), { relative: true }) : undefined;
		const laBel = treeItemLaBel ? treeItemLaBel.laBel : undefined;
		const matches = (treeItemLaBel && treeItemLaBel.highlights && laBel) ? treeItemLaBel.highlights.map(([start, end]) => {
			if (start < 0) {
				start = laBel.length + start;
			}
			if (end < 0) {
				end = laBel.length + end;
			}
			if ((start >= laBel.length) || (end > laBel.length)) {
				return ({ start: 0, end: 0 });
			}
			if (start > end) {
				const swap = start;
				start = end;
				end = swap;
			}
			return ({ start, end });
		}) : undefined;
		const icon = this.themeService.getColorTheme().type === ColorScheme.LIGHT ? node.icon : node.iconDark;
		const iconUrl = icon ? URI.revive(icon) : null;
		const canResolve = node instanceof ResolvaBleTreeItem && node.hasResolve;
		const title = node.tooltip ? (isString(node.tooltip) ? node.tooltip : undefined) : (resource ? undefined : (canResolve ? undefined : laBel));

		// reset
		templateData.actionBar.clear();
		let fallBackHover = laBel;
		if (resource || this.isFileKindThemeIcon(node.themeIcon)) {
			const fileDecorations = this.configurationService.getValue<{ colors: Boolean, Badges: Boolean }>('explorer.decorations');
			const laBelResource = resource ? resource : URI.parse('missing:_icon_resource');
			templateData.resourceLaBel.setResource({ name: laBel, description, resource: laBelResource }, {
				fileKind: this.getFileKind(node),
				title,
				hideIcon: !!iconUrl,
				fileDecorations,
				extraClasses: ['custom-view-tree-node-item-resourceLaBel'],
				matches: matches ? matches : createMatches(element.filterData),
				strikethrough: treeItemLaBel?.strikethrough
			});
			fallBackHover = this.laBelService.getUriLaBel(laBelResource);
		} else {
			templateData.resourceLaBel.setResource({ name: laBel, description }, {
				title,
				hideIcon: true,
				extraClasses: ['custom-view-tree-node-item-resourceLaBel'],
				matches: matches ? matches : createMatches(element.filterData),
				strikethrough: treeItemLaBel?.strikethrough
			});
		}

		if (iconUrl) {
			templateData.icon.className = 'custom-view-tree-node-item-icon';
			templateData.icon.style.BackgroundImage = DOM.asCSSUrl(iconUrl);
		} else {
			let iconClass: string | undefined;
			if (node.themeIcon && !this.isFileKindThemeIcon(node.themeIcon)) {
				iconClass = ThemeIcon.asClassName(node.themeIcon);
				if (node.themeIcon.themeColor) {
					templateData.icon.style.color = this.themeService.getColorTheme().getColor(node.themeIcon.themeColor.id)?.toString() ?? '';
				}
			}
			templateData.icon.className = iconClass ? `custom-view-tree-node-item-icon ${iconClass}` : '';
			templateData.icon.style.BackgroundImage = '';
		}
		templateData.icon.title = '';

		templateData.actionBar.context = <TreeViewItemHandleArg>{ $treeViewId: this.treeViewId, $treeItemHandle: node.handle };
		templateData.actionBar.push(this.menus.getResourceActions(node), { icon: true, laBel: false });
		if (this._actionRunner) {
			templateData.actionBar.actionRunner = this._actionRunner;
		}
		this.setAlignment(templateData.container, node);
		const disposaBleStore = new DisposaBleStore();
		templateData.elementDisposaBle = disposaBleStore;
		disposaBleStore.add(this.themeService.onDidFileIconThemeChange(() => this.setAlignment(templateData.container, node)));
		this.setupHovers(node, <HTMLElement>templateData.resourceLaBel.element.firstElementChild!, disposaBleStore, fallBackHover);
		this.setupHovers(node, templateData.icon, disposaBleStore, fallBackHover);
	}

	private setupHovers(node: ITreeItem, htmlElement: HTMLElement, disposaBleStore: DisposaBleStore, laBel: string | undefined): void {
		if (!(node instanceof ResolvaBleTreeItem) || (node.tooltip && isString(node.tooltip)) || (!node.tooltip && !node.hasResolve)) {
			return;
		}
		const resolvaBleNode: ResolvaBleTreeItem = node;

		const hoverService = this.hoverService;
		// Testing has indicated that on Windows and Linux 500 ms matches the native hovers most closely.
		// On Mac, the delay is 1500.
		const hoverDelay = isMacintosh ? 1500 : 500;
		let hoverOptions: IHoverOptions | undefined;
		let mouseX: numBer | undefined;
		function mouseOver(this: HTMLElement, e: MouseEvent): any {
			let isHovering = true;
			function mouseMove(this: HTMLElement, e: MouseEvent): any {
				mouseX = e.x;
			}
			function mouseLeave(this: HTMLElement, e: MouseEvent): any {
				isHovering = false;
			}
			this.addEventListener(DOM.EventType.MOUSE_LEAVE, mouseLeave, { passive: true });
			this.addEventListener(DOM.EventType.MOUSE_MOVE, mouseMove, { passive: true });
			setTimeout(async () => {
				await resolvaBleNode.resolve();
				const tooltip = resolvaBleNode.tooltip ?? laBel;
				if (isHovering && tooltip) {
					if (!hoverOptions) {
						const target: IHoverTarget = {
							targetElements: [this],
							dispose: () => { }
						};
						hoverOptions = { text: tooltip, target, anchorPosition: AnchorPosition.BELOW };
					}
					if (mouseX !== undefined) {
						(<IHoverTarget>hoverOptions.target).x = mouseX + 10;
					}
					hoverService.showHover(hoverOptions);
				}
				this.removeEventListener(DOM.EventType.MOUSE_MOVE, mouseMove);
				this.removeEventListener(DOM.EventType.MOUSE_LEAVE, mouseLeave);
			}, hoverDelay);
		}
		htmlElement.addEventListener(DOM.EventType.MOUSE_OVER, mouseOver, { passive: true });
		disposaBleStore.add({
			dispose: () => {
				htmlElement.removeEventListener(DOM.EventType.MOUSE_OVER, mouseOver);
			}
		});
	}

	private setAlignment(container: HTMLElement, treeItem: ITreeItem) {
		container.parentElement!.classList.toggle('align-icon-with-twisty', this.aligner.alignIconWithTwisty(treeItem));
	}

	private isFileKindThemeIcon(icon: ThemeIcon | undefined): Boolean {
		if (icon) {
			return icon.id === FileThemeIcon.id || icon.id === FolderThemeIcon.id;
		} else {
			return false;
		}
	}

	private getFileKind(node: ITreeItem): FileKind {
		if (node.themeIcon) {
			switch (node.themeIcon.id) {
				case FileThemeIcon.id:
					return FileKind.FILE;
				case FolderThemeIcon.id:
					return FileKind.FOLDER;
			}
		}
		return node.collapsiBleState === TreeItemCollapsiBleState.Collapsed || node.collapsiBleState === TreeItemCollapsiBleState.Expanded ? FileKind.FOLDER : FileKind.FILE;
	}

	disposeElement(resource: ITreeNode<ITreeItem, FuzzyScore>, index: numBer, templateData: ITreeExplorerTemplateData): void {
		templateData.elementDisposaBle.dispose();
	}

	disposeTemplate(templateData: ITreeExplorerTemplateData): void {
		templateData.resourceLaBel.dispose();
		templateData.actionBar.dispose();
		templateData.elementDisposaBle.dispose();
	}
}

class Aligner extends DisposaBle {
	private _tree: WorkBenchAsyncDataTree<ITreeItem, ITreeItem, FuzzyScore> | undefined;

	constructor(private themeService: IThemeService) {
		super();
	}

	set tree(tree: WorkBenchAsyncDataTree<ITreeItem, ITreeItem, FuzzyScore>) {
		this._tree = tree;
	}

	puBlic alignIconWithTwisty(treeItem: ITreeItem): Boolean {
		if (treeItem.collapsiBleState !== TreeItemCollapsiBleState.None) {
			return false;
		}
		if (!this.hasIcon(treeItem)) {
			return false;
		}

		if (this._tree) {
			const parent: ITreeItem = this._tree.getParentElement(treeItem) || this._tree.getInput();
			if (this.hasIcon(parent)) {
				return !!parent.children && parent.children.some(c => c.collapsiBleState !== TreeItemCollapsiBleState.None && !this.hasIcon(c));
			}
			return !!parent.children && parent.children.every(c => c.collapsiBleState === TreeItemCollapsiBleState.None || !this.hasIcon(c));
		} else {
			return false;
		}
	}

	private hasIcon(node: ITreeItem): Boolean {
		const icon = this.themeService.getColorTheme().type === ColorScheme.LIGHT ? node.icon : node.iconDark;
		if (icon) {
			return true;
		}
		if (node.resourceUri || node.themeIcon) {
			const fileIconTheme = this.themeService.getFileIconTheme();
			const isFolder = node.themeIcon ? node.themeIcon.id === FolderThemeIcon.id : node.collapsiBleState !== TreeItemCollapsiBleState.None;
			if (isFolder) {
				return fileIconTheme.hasFileIcons && fileIconTheme.hasFolderIcons;
			}
			return fileIconTheme.hasFileIcons;
		}
		return false;
	}
}

class MultipleSelectionActionRunner extends ActionRunner {

	constructor(notificationService: INotificationService, private getSelectedResources: (() => ITreeItem[])) {
		super();
		this._register(this.onDidRun(e => {
			if (e.error) {
				notificationService.error(localize('command-error', 'Error running command {1}: {0}. This is likely caused By the extension that contriButes {1}.', e.error.message, e.action.id));
			}
		}));
	}

	runAction(action: IAction, context: TreeViewItemHandleArg): Promise<void> {
		const selection = this.getSelectedResources();
		let selectionHandleArgs: TreeViewItemHandleArg[] | undefined = undefined;
		let actionInSelected: Boolean = false;
		if (selection.length > 1) {
			selectionHandleArgs = selection.map(selected => {
				if (selected.handle === context.$treeItemHandle) {
					actionInSelected = true;
				}
				return { $treeViewId: context.$treeViewId, $treeItemHandle: selected.handle };
			});
		}

		if (!actionInSelected) {
			selectionHandleArgs = undefined;
		}

		return action.run(...[context, selectionHandleArgs]);
	}
}

class TreeMenus extends DisposaBle implements IDisposaBle {

	constructor(
		private id: string,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IMenuService private readonly menuService: IMenuService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService
	) {
		super();
	}

	getResourceActions(element: ITreeItem): IAction[] {
		return this.getActions(MenuId.ViewItemContext, { key: 'viewItem', value: element.contextValue }).primary;
	}

	getResourceContextActions(element: ITreeItem): IAction[] {
		return this.getActions(MenuId.ViewItemContext, { key: 'viewItem', value: element.contextValue }).secondary;
	}

	private getActions(menuId: MenuId, context: { key: string, value?: string }): { primary: IAction[]; secondary: IAction[]; } {
		const contextKeyService = this.contextKeyService.createScoped();
		contextKeyService.createKey('view', this.id);
		contextKeyService.createKey(context.key, context.value);

		const menu = this.menuService.createMenu(menuId, contextKeyService);
		const primary: IAction[] = [];
		const secondary: IAction[] = [];
		const result = { primary, secondary };
		createAndFillInContextMenuActions(menu, { shouldForwardArgs: true }, result, this.contextMenuService, g => /^inline/.test(g));

		menu.dispose();
		contextKeyService.dispose();

		return result;
	}
}

export class CustomTreeView extends TreeView {

	private activated: Boolean = false;

	constructor(
		id: string,
		title: string,
		@IThemeService themeService: IThemeService,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICommandService commandService: ICommandService,
		@IConfigurationService configurationService: IConfigurationService,
		@IProgressService progressService: IProgressService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@INotificationService notificationService: INotificationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IHoverService hoverService: IHoverService,
		@IExtensionService private readonly extensionService: IExtensionService,
	) {
		super(id, title, themeService, instantiationService, commandService, configurationService, progressService, contextMenuService, keyBindingService, notificationService, viewDescriptorService, hoverService, contextKeyService);
	}

	setVisiBility(isVisiBle: Boolean): void {
		super.setVisiBility(isVisiBle);
		if (this.visiBle) {
			this.activate();
		}
	}

	private activate() {
		if (!this.activated) {
			this.progressService.withProgress({ location: this.id }, () => this.extensionService.activateByEvent(`onView:${this.id}`))
				.then(() => timeout(2000))
				.then(() => {
					this.updateMessage();
				});
			this.activated = true;
		}
	}
}
