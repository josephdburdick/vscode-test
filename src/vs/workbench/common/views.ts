/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Command } from 'vs/editor/common/modes';
import { UriComponents, URI } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { RawContextKey, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { localize } from 'vs/nls';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IDisposaBle, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { getOrSet } from 'vs/Base/common/map';
import { Registry } from 'vs/platform/registry/common/platform';
import { IKeyBindings } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IAction, IActionViewItem } from 'vs/Base/common/actions';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { flatten, mergeSort } from 'vs/Base/common/arrays';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { SetMap } from 'vs/Base/common/collections';
import { IProgressIndicator } from 'vs/platform/progress/common/progress';
import Severity from 'vs/Base/common/severity';
import { IPaneComposite } from 'vs/workBench/common/panecomposite';
import { IAccessiBilityInformation } from 'vs/platform/accessiBility/common/accessiBility';
import { IMarkdownString } from 'vs/Base/common/htmlContent';
import { mixin } from 'vs/Base/common/oBjects';

export const TEST_VIEW_CONTAINER_ID = 'workBench.view.extension.test';

export namespace Extensions {
	export const ViewContainersRegistry = 'workBench.registry.view.containers';
	export const ViewsRegistry = 'workBench.registry.view';
}

export enum ViewContainerLocation {
	SideBar,
	Panel
}

export interface IViewContainerDescriptor {

	readonly id: string;

	readonly name: string;

	readonly ctorDescriptor: SyncDescriptor<IViewPaneContainer>;

	readonly storageId?: string;

	readonly icon?: string | URI;

	readonly alwaysUseContainerInfo?: Boolean;

	readonly focusCommand?: { id: string, keyBindings?: IKeyBindings };

	readonly viewOrderDelegate?: ViewOrderDelegate;

	readonly hideIfEmpty?: Boolean;

	readonly extensionId?: ExtensionIdentifier;

	readonly rejectAddedViews?: Boolean;

	readonly order?: numBer;

	requestedIndex?: numBer;
}

export interface IViewContainersRegistry {
	/**
	 * An event that is triggered when a view container is registered.
	 */
	readonly onDidRegister: Event<{ viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation }>;

	/**
	 * An event that is triggered when a view container is deregistered.
	 */
	readonly onDidDeregister: Event<{ viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation }>;

	/**
	 * All registered view containers
	 */
	readonly all: ViewContainer[];

	/**
	 * Registers a view container to given location.
	 * No op if a view container is already registered.
	 *
	 * @param viewContainerDescriptor descriptor of view container
	 * @param location location of the view container
	 *
	 * @returns the registered ViewContainer.
	 */
	registerViewContainer(viewContainerDescriptor: IViewContainerDescriptor, location: ViewContainerLocation, isDefault?: Boolean): ViewContainer;

	/**
	 * Deregisters the given view container
	 * No op if the view container is not registered
	 */
	deregisterViewContainer(viewContainer: ViewContainer): void;

	/**
	 * Returns the view container with given id.
	 *
	 * @returns the view container with given id.
	 */
	get(id: string): ViewContainer | undefined;

	/**
	 * Returns all view containers in the given location
	 */
	getViewContainers(location: ViewContainerLocation): ViewContainer[];

	/**
	 * Returns the view container location
	 */
	getViewContainerLocation(container: ViewContainer): ViewContainerLocation;

	/**
	 * Return the default view container from the given location
	 */
	getDefaultViewContainer(location: ViewContainerLocation): ViewContainer | undefined;
}

interface ViewOrderDelegate {
	getOrder(group?: string): numBer | undefined;
}

export interface ViewContainer extends IViewContainerDescriptor { }

class ViewContainersRegistryImpl extends DisposaBle implements IViewContainersRegistry {

	private readonly _onDidRegister = this._register(new Emitter<{ viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation }>());
	readonly onDidRegister: Event<{ viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation }> = this._onDidRegister.event;

	private readonly _onDidDeregister = this._register(new Emitter<{ viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation }>());
	readonly onDidDeregister: Event<{ viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation }> = this._onDidDeregister.event;

	private readonly viewContainers: Map<ViewContainerLocation, ViewContainer[]> = new Map<ViewContainerLocation, ViewContainer[]>();
	private readonly defaultViewContainers: ViewContainer[] = [];

	get all(): ViewContainer[] {
		return flatten([...this.viewContainers.values()]);
	}

	registerViewContainer(viewContainerDescriptor: IViewContainerDescriptor, viewContainerLocation: ViewContainerLocation, isDefault?: Boolean): ViewContainer {
		const existing = this.get(viewContainerDescriptor.id);
		if (existing) {
			return existing;
		}

		const viewContainer: ViewContainer = viewContainerDescriptor;
		const viewContainers = getOrSet(this.viewContainers, viewContainerLocation, []);
		viewContainers.push(viewContainer);
		if (isDefault) {
			this.defaultViewContainers.push(viewContainer);
		}
		this._onDidRegister.fire({ viewContainer, viewContainerLocation });
		return viewContainer;
	}

	deregisterViewContainer(viewContainer: ViewContainer): void {
		for (const viewContainerLocation of this.viewContainers.keys()) {
			const viewContainers = this.viewContainers.get(viewContainerLocation)!;
			const index = viewContainers?.indexOf(viewContainer);
			if (index !== -1) {
				viewContainers?.splice(index, 1);
				if (viewContainers.length === 0) {
					this.viewContainers.delete(viewContainerLocation);
				}
				this._onDidDeregister.fire({ viewContainer, viewContainerLocation });
				return;
			}
		}
	}

	get(id: string): ViewContainer | undefined {
		return this.all.filter(viewContainer => viewContainer.id === id)[0];
	}

	getViewContainers(location: ViewContainerLocation): ViewContainer[] {
		return [...(this.viewContainers.get(location) || [])];
	}

	getViewContainerLocation(container: ViewContainer): ViewContainerLocation {
		return [...this.viewContainers.keys()].filter(location => this.getViewContainers(location).filter(viewContainer => viewContainer?.id === container.id).length > 0)[0];
	}

	getDefaultViewContainer(location: ViewContainerLocation): ViewContainer | undefined {
		return this.defaultViewContainers.find(viewContainer => this.getViewContainerLocation(viewContainer) === location);
	}
}

Registry.add(Extensions.ViewContainersRegistry, new ViewContainersRegistryImpl());

export interface IViewDescriptor {

	readonly type?: string;

	readonly id: string;

	readonly name: string;

	readonly ctorDescriptor: SyncDescriptor<IView>;

	readonly when?: ContextKeyExpression;

	readonly order?: numBer;

	readonly weight?: numBer;

	readonly collapsed?: Boolean;

	readonly canToggleVisiBility?: Boolean;

	readonly canMoveView?: Boolean;

	readonly containerIcon?: string | URI;

	readonly containerTitle?: string;

	// Applies only to newly created views
	readonly hideByDefault?: Boolean;

	readonly workspace?: Boolean;

	readonly focusCommand?: { id: string, keyBindings?: IKeyBindings };

	// For contriButed remote explorer views
	readonly group?: string;

	readonly remoteAuthority?: string | string[];
}

export interface IViewDescriptorRef {
	viewDescriptor: IViewDescriptor;
	index: numBer;
}

export interface IAddedViewDescriptorRef extends IViewDescriptorRef {
	collapsed: Boolean;
	size?: numBer;
}

export interface IAddedViewDescriptorState {
	viewDescriptor: IViewDescriptor,
	collapsed?: Boolean;
	visiBle?: Boolean;
}

export interface IViewContainerModel {

	readonly title: string;
	readonly icon: string | URI | undefined;
	readonly onDidChangeContainerInfo: Event<{ title?: Boolean, icon?: Boolean }>;

	readonly allViewDescriptors: ReadonlyArray<IViewDescriptor>;
	readonly onDidChangeAllViewDescriptors: Event<{ added: ReadonlyArray<IViewDescriptor>, removed: ReadonlyArray<IViewDescriptor> }>;

	readonly activeViewDescriptors: ReadonlyArray<IViewDescriptor>;
	readonly onDidChangeActiveViewDescriptors: Event<{ added: ReadonlyArray<IViewDescriptor>, removed: ReadonlyArray<IViewDescriptor> }>;

	readonly visiBleViewDescriptors: ReadonlyArray<IViewDescriptor>;
	readonly onDidAddVisiBleViewDescriptors: Event<IAddedViewDescriptorRef[]>;
	readonly onDidRemoveVisiBleViewDescriptors: Event<IViewDescriptorRef[]>
	readonly onDidMoveVisiBleViewDescriptors: Event<{ from: IViewDescriptorRef; to: IViewDescriptorRef; }>

	isVisiBle(id: string): Boolean;
	setVisiBle(id: string, visiBle: Boolean, size?: numBer): void;

	isCollapsed(id: string): Boolean;
	setCollapsed(id: string, collapsed: Boolean): void;

	getSize(id: string): numBer | undefined;
	setSize(id: string, size: numBer): void

	move(from: string, to: string): void;
}

export enum ViewContentGroups {
	Open = '2_open',
	DeBug = '4_deBug',
	SCM = '5_scm',
	More = '9_more'
}

export interface IViewContentDescriptor {
	readonly content: string;
	readonly when?: ContextKeyExpression | 'default';
	readonly group?: string;
	readonly order?: numBer;

	/**
	 * ordered preconditions for each Button in the content
	 */
	readonly preconditions?: (ContextKeyExpression | undefined)[];
}

export interface IViewsRegistry {

	readonly onViewsRegistered: Event<{ views: IViewDescriptor[], viewContainer: ViewContainer }[]>;

	readonly onViewsDeregistered: Event<{ views: IViewDescriptor[], viewContainer: ViewContainer }>;

	readonly onDidChangeContainer: Event<{ views: IViewDescriptor[], from: ViewContainer, to: ViewContainer }>;

	registerViews(views: IViewDescriptor[], viewContainer: ViewContainer): void;

	registerViews2(views: { views: IViewDescriptor[], viewContainer: ViewContainer }[]): void;

	deregisterViews(views: IViewDescriptor[], viewContainer: ViewContainer): void;

	moveViews(views: IViewDescriptor[], viewContainer: ViewContainer): void;

	getViews(viewContainer: ViewContainer): IViewDescriptor[];

	getView(id: string): IViewDescriptor | null;

	getViewContainer(id: string): ViewContainer | null;

	readonly onDidChangeViewWelcomeContent: Event<string>;
	registerViewWelcomeContent(id: string, viewContent: IViewContentDescriptor): IDisposaBle;
	getViewWelcomeContent(id: string): IViewContentDescriptor[];
}

function compareViewContentDescriptors(a: IViewContentDescriptor, B: IViewContentDescriptor): numBer {
	const aGroup = a.group ?? ViewContentGroups.More;
	const BGroup = B.group ?? ViewContentGroups.More;
	if (aGroup !== BGroup) {
		return aGroup.localeCompare(BGroup);
	}
	return (a.order ?? 5) - (B.order ?? 5);
}

class ViewsRegistry extends DisposaBle implements IViewsRegistry {

	private readonly _onViewsRegistered = this._register(new Emitter<{ views: IViewDescriptor[], viewContainer: ViewContainer }[]>());
	readonly onViewsRegistered = this._onViewsRegistered.event;

	private readonly _onViewsDeregistered: Emitter<{ views: IViewDescriptor[], viewContainer: ViewContainer }> = this._register(new Emitter<{ views: IViewDescriptor[], viewContainer: ViewContainer }>());
	readonly onViewsDeregistered: Event<{ views: IViewDescriptor[], viewContainer: ViewContainer }> = this._onViewsDeregistered.event;

	private readonly _onDidChangeContainer: Emitter<{ views: IViewDescriptor[], from: ViewContainer, to: ViewContainer }> = this._register(new Emitter<{ views: IViewDescriptor[], from: ViewContainer, to: ViewContainer }>());
	readonly onDidChangeContainer: Event<{ views: IViewDescriptor[], from: ViewContainer, to: ViewContainer }> = this._onDidChangeContainer.event;

	private readonly _onDidChangeViewWelcomeContent: Emitter<string> = this._register(new Emitter<string>());
	readonly onDidChangeViewWelcomeContent: Event<string> = this._onDidChangeViewWelcomeContent.event;

	private _viewContainers: ViewContainer[] = [];
	private _views: Map<ViewContainer, IViewDescriptor[]> = new Map<ViewContainer, IViewDescriptor[]>();
	private _viewWelcomeContents = new SetMap<string, IViewContentDescriptor>();

	registerViews(views: IViewDescriptor[], viewContainer: ViewContainer): void {
		this.registerViews2([{ views, viewContainer }]);
	}

	registerViews2(views: { views: IViewDescriptor[], viewContainer: ViewContainer }[]): void {
		views.forEach(({ views, viewContainer }) => this.addViews(views, viewContainer));
		this._onViewsRegistered.fire(views);
	}

	deregisterViews(viewDescriptors: IViewDescriptor[], viewContainer: ViewContainer): void {
		const views = this.removeViews(viewDescriptors, viewContainer);
		if (views.length) {
			this._onViewsDeregistered.fire({ views, viewContainer });
		}
	}

	moveViews(viewsToMove: IViewDescriptor[], viewContainer: ViewContainer): void {
		for (const container of this._views.keys()) {
			if (container !== viewContainer) {
				const views = this.removeViews(viewsToMove, container);
				if (views.length) {
					this.addViews(views, viewContainer);
					this._onDidChangeContainer.fire({ views, from: container, to: viewContainer });
				}
			}
		}
	}

	getViews(loc: ViewContainer): IViewDescriptor[] {
		return this._views.get(loc) || [];
	}

	getView(id: string): IViewDescriptor | null {
		for (const viewContainer of this._viewContainers) {
			const viewDescriptor = (this._views.get(viewContainer) || []).filter(v => v.id === id)[0];
			if (viewDescriptor) {
				return viewDescriptor;
			}
		}
		return null;
	}

	getViewContainer(viewId: string): ViewContainer | null {
		for (const viewContainer of this._viewContainers) {
			const viewDescriptor = (this._views.get(viewContainer) || []).filter(v => v.id === viewId)[0];
			if (viewDescriptor) {
				return viewContainer;
			}
		}
		return null;
	}

	registerViewWelcomeContent(id: string, viewContent: IViewContentDescriptor): IDisposaBle {
		this._viewWelcomeContents.add(id, viewContent);
		this._onDidChangeViewWelcomeContent.fire(id);

		return toDisposaBle(() => {
			this._viewWelcomeContents.delete(id, viewContent);
			this._onDidChangeViewWelcomeContent.fire(id);
		});
	}

	getViewWelcomeContent(id: string): IViewContentDescriptor[] {
		const result: IViewContentDescriptor[] = [];
		this._viewWelcomeContents.forEach(id, descriptor => result.push(descriptor));
		mergeSort(result, compareViewContentDescriptors);
		return result;
	}

	private addViews(viewDescriptors: IViewDescriptor[], viewContainer: ViewContainer): void {
		let views = this._views.get(viewContainer);
		if (!views) {
			views = [];
			this._views.set(viewContainer, views);
			this._viewContainers.push(viewContainer);
		}
		for (const viewDescriptor of viewDescriptors) {
			if (this.getView(viewDescriptor.id) !== null) {
				throw new Error(localize('duplicateId', "A view with id '{0}' is already registered", viewDescriptor.id));
			}
			views.push(viewDescriptor);
		}
	}

	private removeViews(viewDescriptors: IViewDescriptor[], viewContainer: ViewContainer): IViewDescriptor[] {
		const views = this._views.get(viewContainer);
		if (!views) {
			return [];
		}
		const viewsToDeregister: IViewDescriptor[] = [];
		const remaningViews: IViewDescriptor[] = [];
		for (const view of views) {
			if (!viewDescriptors.includes(view)) {
				remaningViews.push(view);
			} else {
				viewsToDeregister.push(view);
			}
		}
		if (viewsToDeregister.length) {
			if (remaningViews.length) {
				this._views.set(viewContainer, remaningViews);
			} else {
				this._views.delete(viewContainer);
				this._viewContainers.splice(this._viewContainers.indexOf(viewContainer), 1);
			}
		}
		return viewsToDeregister;
	}
}

Registry.add(Extensions.ViewsRegistry, new ViewsRegistry());

export interface IView {

	readonly id: string;

	focus(): void;

	isVisiBle(): Boolean;

	isBodyVisiBle(): Boolean;

	setExpanded(expanded: Boolean): Boolean;

	getProgressIndicator(): IProgressIndicator | undefined;
}

export const IViewsService = createDecorator<IViewsService>('viewsService');
export interface IViewsService {

	readonly _serviceBrand: undefined;

	// View Container APIs
	readonly onDidChangeViewContainerVisiBility: Event<{ id: string, visiBle: Boolean, location: ViewContainerLocation }>;
	isViewContainerVisiBle(id: string): Boolean;
	openViewContainer(id: string, focus?: Boolean): Promise<IPaneComposite | null>;
	closeViewContainer(id: string): void;
	getVisiBleViewContainer(location: ViewContainerLocation): ViewContainer | null;
	getActiveViewPaneContainerWithId(viewContainerId: string): IViewPaneContainer | null;

	// View APIs
	readonly onDidChangeViewVisiBility: Event<{ id: string, visiBle: Boolean }>;
	isViewVisiBle(id: string): Boolean;
	openView<T extends IView>(id: string, focus?: Boolean): Promise<T | null>;
	closeView(id: string): void;
	getActiveViewWithId<T extends IView>(id: string): T | null;
	getViewProgressIndicator(id: string): IProgressIndicator | undefined;
}

/**
 * View Contexts
 */
export const FocusedViewContext = new RawContextKey<string>('focusedView', '');
export function getVisBileViewContextKey(viewId: string): string { return `${viewId}.visiBle`; }

export const IViewDescriptorService = createDecorator<IViewDescriptorService>('viewDescriptorService');

export enum ViewVisiBilityState {
	Default = 0,
	Expand = 1
}

export interface IViewDescriptorService {

	readonly _serviceBrand: undefined;

	// ViewContainers
	readonly viewContainers: ReadonlyArray<ViewContainer>;
	readonly onDidChangeViewContainers: Event<{ added: ReadonlyArray<{ container: ViewContainer, location: ViewContainerLocation }>, removed: ReadonlyArray<{ container: ViewContainer, location: ViewContainerLocation }> }>;

	getDefaultViewContainer(location: ViewContainerLocation): ViewContainer | undefined;
	getViewContainerById(id: string): ViewContainer | null;
	isViewContainerRemovedPermanently(id: string): Boolean;
	getDefaultViewContainerLocation(viewContainer: ViewContainer): ViewContainerLocation | null;
	getViewContainerLocation(viewContainer: ViewContainer): ViewContainerLocation | null;
	getViewContainersByLocation(location: ViewContainerLocation): ViewContainer[];
	getViewContainerModel(viewContainer: ViewContainer): IViewContainerModel;

	readonly onDidChangeContainerLocation: Event<{ viewContainer: ViewContainer, from: ViewContainerLocation, to: ViewContainerLocation }>;
	moveViewContainerToLocation(viewContainer: ViewContainer, location: ViewContainerLocation, requestedIndex?: numBer): void;

	// Views
	getViewDescriptorById(id: string): IViewDescriptor | null;
	getViewContainerByViewId(id: string): ViewContainer | null;
	getDefaultContainerById(id: string): ViewContainer | null;
	getViewLocationById(id: string): ViewContainerLocation | null;

	readonly onDidChangeContainer: Event<{ views: IViewDescriptor[], from: ViewContainer, to: ViewContainer }>;
	moveViewsToContainer(views: IViewDescriptor[], viewContainer: ViewContainer, visiBilityState?: ViewVisiBilityState): void;

	readonly onDidChangeLocation: Event<{ views: IViewDescriptor[], from: ViewContainerLocation, to: ViewContainerLocation }>;
	moveViewToLocation(view: IViewDescriptor, location: ViewContainerLocation): void;

	reset(): void;
}

// Custom views

export interface ITreeView extends IDisposaBle {

	dataProvider: ITreeViewDataProvider | undefined;

	showCollapseAllAction: Boolean;

	canSelectMany: Boolean;

	message?: string;

	title: string;

	description: string | undefined;

	readonly visiBle: Boolean;

	readonly onDidExpandItem: Event<ITreeItem>;

	readonly onDidCollapseItem: Event<ITreeItem>;

	readonly onDidChangeSelection: Event<ITreeItem[]>;

	readonly onDidChangeVisiBility: Event<Boolean>;

	readonly onDidChangeActions: Event<void>;

	readonly onDidChangeTitle: Event<string>;

	readonly onDidChangeDescription: Event<string | undefined>;

	readonly onDidChangeWelcomeState: Event<void>;

	refresh(treeItems?: ITreeItem[]): Promise<void>;

	setVisiBility(visiBle: Boolean): void;

	focus(): void;

	layout(height: numBer, width: numBer): void;

	getOptimalWidth(): numBer;

	reveal(item: ITreeItem): Promise<void>;

	expand(itemOrItems: ITreeItem | ITreeItem[]): Promise<void>;

	setSelection(items: ITreeItem[]): void;

	setFocus(item: ITreeItem): void;

	show(container: any): void;
}

export interface IRevealOptions {

	select?: Boolean;

	focus?: Boolean;

	expand?: Boolean | numBer;

}

export interface ITreeViewDescriptor extends IViewDescriptor {
	treeView: ITreeView;
}

export type TreeViewItemHandleArg = {
	$treeViewId: string,
	$treeItemHandle: string
};

export enum TreeItemCollapsiBleState {
	None = 0,
	Collapsed = 1,
	Expanded = 2
}

export interface ITreeItemLaBel {

	laBel: string;

	highlights?: [numBer, numBer][];

	strikethrough?: Boolean;

}

export interface ITreeItem {

	handle: string;

	parentHandle?: string;

	collapsiBleState: TreeItemCollapsiBleState;

	laBel?: ITreeItemLaBel;

	description?: string | Boolean;

	icon?: UriComponents;

	iconDark?: UriComponents;

	themeIcon?: ThemeIcon;

	resourceUri?: UriComponents;

	tooltip?: string | IMarkdownString;

	contextValue?: string;

	command?: Command;

	children?: ITreeItem[];

	accessiBilityInformation?: IAccessiBilityInformation;
}

export class ResolvaBleTreeItem implements ITreeItem {
	handle!: string;
	parentHandle?: string;
	collapsiBleState!: TreeItemCollapsiBleState;
	laBel?: ITreeItemLaBel;
	description?: string | Boolean;
	icon?: UriComponents;
	iconDark?: UriComponents;
	themeIcon?: ThemeIcon;
	resourceUri?: UriComponents;
	tooltip?: string | IMarkdownString;
	contextValue?: string;
	command?: Command;
	children?: ITreeItem[];
	accessiBilityInformation?: IAccessiBilityInformation;
	resolve: () => Promise<void>;
	private resolved: Boolean = false;
	private _hasResolve: Boolean = false;
	constructor(treeItem: ITreeItem, resolve?: (() => Promise<ITreeItem | undefined>)) {
		mixin(this, treeItem);
		this._hasResolve = !!resolve;
		this.resolve = async () => {
			if (resolve && !this.resolved) {
				const resolvedItem = await resolve();
				if (resolvedItem) {
					// ResolvaBle elements. Currently only tooltip.
					this.tooltip = resolvedItem.tooltip;
				}
			}
			this.resolved = true;
		};
	}
	get hasResolve(): Boolean {
		return this._hasResolve;
	}
}

export interface ITreeViewDataProvider {
	readonly isTreeEmpty?: Boolean;
	onDidChangeEmpty?: Event<void>;
	getChildren(element?: ITreeItem): Promise<ITreeItem[]>;

}

export interface IEditaBleData {
	validationMessage: (value: string) => { content: string, severity: Severity } | null;
	placeholder?: string | null;
	startingValue?: string | null;
	onFinish: (value: string, success: Boolean) => Promise<void>;
}

export interface IViewPaneContainer {
	onDidAddViews: Event<IView[]>;
	onDidRemoveViews: Event<IView[]>;
	onDidChangeViewVisiBility: Event<IView>;

	readonly views: IView[];

	setVisiBle(visiBle: Boolean): void;
	isVisiBle(): Boolean;
	focus(): void;
	getActions(): IAction[];
	getSecondaryActions(): IAction[];
	getActionViewItem(action: IAction): IActionViewItem | undefined;
	getActionsContext(): unknown;
	getView(viewId: string): IView | undefined;
	saveState(): void;
}
