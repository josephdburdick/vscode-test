/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CommAnd } from 'vs/editor/common/modes';
import { UriComponents, URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { RAwContextKey, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { locAlize } from 'vs/nls';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IDisposAble, DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { getOrSet } from 'vs/bAse/common/mAp';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IKeybindings } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { IAction, IActionViewItem } from 'vs/bAse/common/Actions';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { flAtten, mergeSort } from 'vs/bAse/common/ArrAys';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { SetMAp } from 'vs/bAse/common/collections';
import { IProgressIndicAtor } from 'vs/plAtform/progress/common/progress';
import Severity from 'vs/bAse/common/severity';
import { IPAneComposite } from 'vs/workbench/common/pAnecomposite';
import { IAccessibilityInformAtion } from 'vs/plAtform/Accessibility/common/Accessibility';
import { IMArkdownString } from 'vs/bAse/common/htmlContent';
import { mixin } from 'vs/bAse/common/objects';

export const TEST_VIEW_CONTAINER_ID = 'workbench.view.extension.test';

export nAmespAce Extensions {
	export const ViewContAinersRegistry = 'workbench.registry.view.contAiners';
	export const ViewsRegistry = 'workbench.registry.view';
}

export enum ViewContAinerLocAtion {
	SidebAr,
	PAnel
}

export interfAce IViewContAinerDescriptor {

	reAdonly id: string;

	reAdonly nAme: string;

	reAdonly ctorDescriptor: SyncDescriptor<IViewPAneContAiner>;

	reAdonly storAgeId?: string;

	reAdonly icon?: string | URI;

	reAdonly AlwAysUseContAinerInfo?: booleAn;

	reAdonly focusCommAnd?: { id: string, keybindings?: IKeybindings };

	reAdonly viewOrderDelegAte?: ViewOrderDelegAte;

	reAdonly hideIfEmpty?: booleAn;

	reAdonly extensionId?: ExtensionIdentifier;

	reAdonly rejectAddedViews?: booleAn;

	reAdonly order?: number;

	requestedIndex?: number;
}

export interfAce IViewContAinersRegistry {
	/**
	 * An event thAt is triggered when A view contAiner is registered.
	 */
	reAdonly onDidRegister: Event<{ viewContAiner: ViewContAiner, viewContAinerLocAtion: ViewContAinerLocAtion }>;

	/**
	 * An event thAt is triggered when A view contAiner is deregistered.
	 */
	reAdonly onDidDeregister: Event<{ viewContAiner: ViewContAiner, viewContAinerLocAtion: ViewContAinerLocAtion }>;

	/**
	 * All registered view contAiners
	 */
	reAdonly All: ViewContAiner[];

	/**
	 * Registers A view contAiner to given locAtion.
	 * No op if A view contAiner is AlreAdy registered.
	 *
	 * @pArAm viewContAinerDescriptor descriptor of view contAiner
	 * @pArAm locAtion locAtion of the view contAiner
	 *
	 * @returns the registered ViewContAiner.
	 */
	registerViewContAiner(viewContAinerDescriptor: IViewContAinerDescriptor, locAtion: ViewContAinerLocAtion, isDefAult?: booleAn): ViewContAiner;

	/**
	 * Deregisters the given view contAiner
	 * No op if the view contAiner is not registered
	 */
	deregisterViewContAiner(viewContAiner: ViewContAiner): void;

	/**
	 * Returns the view contAiner with given id.
	 *
	 * @returns the view contAiner with given id.
	 */
	get(id: string): ViewContAiner | undefined;

	/**
	 * Returns All view contAiners in the given locAtion
	 */
	getViewContAiners(locAtion: ViewContAinerLocAtion): ViewContAiner[];

	/**
	 * Returns the view contAiner locAtion
	 */
	getViewContAinerLocAtion(contAiner: ViewContAiner): ViewContAinerLocAtion;

	/**
	 * Return the defAult view contAiner from the given locAtion
	 */
	getDefAultViewContAiner(locAtion: ViewContAinerLocAtion): ViewContAiner | undefined;
}

interfAce ViewOrderDelegAte {
	getOrder(group?: string): number | undefined;
}

export interfAce ViewContAiner extends IViewContAinerDescriptor { }

clAss ViewContAinersRegistryImpl extends DisposAble implements IViewContAinersRegistry {

	privAte reAdonly _onDidRegister = this._register(new Emitter<{ viewContAiner: ViewContAiner, viewContAinerLocAtion: ViewContAinerLocAtion }>());
	reAdonly onDidRegister: Event<{ viewContAiner: ViewContAiner, viewContAinerLocAtion: ViewContAinerLocAtion }> = this._onDidRegister.event;

	privAte reAdonly _onDidDeregister = this._register(new Emitter<{ viewContAiner: ViewContAiner, viewContAinerLocAtion: ViewContAinerLocAtion }>());
	reAdonly onDidDeregister: Event<{ viewContAiner: ViewContAiner, viewContAinerLocAtion: ViewContAinerLocAtion }> = this._onDidDeregister.event;

	privAte reAdonly viewContAiners: MAp<ViewContAinerLocAtion, ViewContAiner[]> = new MAp<ViewContAinerLocAtion, ViewContAiner[]>();
	privAte reAdonly defAultViewContAiners: ViewContAiner[] = [];

	get All(): ViewContAiner[] {
		return flAtten([...this.viewContAiners.vAlues()]);
	}

	registerViewContAiner(viewContAinerDescriptor: IViewContAinerDescriptor, viewContAinerLocAtion: ViewContAinerLocAtion, isDefAult?: booleAn): ViewContAiner {
		const existing = this.get(viewContAinerDescriptor.id);
		if (existing) {
			return existing;
		}

		const viewContAiner: ViewContAiner = viewContAinerDescriptor;
		const viewContAiners = getOrSet(this.viewContAiners, viewContAinerLocAtion, []);
		viewContAiners.push(viewContAiner);
		if (isDefAult) {
			this.defAultViewContAiners.push(viewContAiner);
		}
		this._onDidRegister.fire({ viewContAiner, viewContAinerLocAtion });
		return viewContAiner;
	}

	deregisterViewContAiner(viewContAiner: ViewContAiner): void {
		for (const viewContAinerLocAtion of this.viewContAiners.keys()) {
			const viewContAiners = this.viewContAiners.get(viewContAinerLocAtion)!;
			const index = viewContAiners?.indexOf(viewContAiner);
			if (index !== -1) {
				viewContAiners?.splice(index, 1);
				if (viewContAiners.length === 0) {
					this.viewContAiners.delete(viewContAinerLocAtion);
				}
				this._onDidDeregister.fire({ viewContAiner, viewContAinerLocAtion });
				return;
			}
		}
	}

	get(id: string): ViewContAiner | undefined {
		return this.All.filter(viewContAiner => viewContAiner.id === id)[0];
	}

	getViewContAiners(locAtion: ViewContAinerLocAtion): ViewContAiner[] {
		return [...(this.viewContAiners.get(locAtion) || [])];
	}

	getViewContAinerLocAtion(contAiner: ViewContAiner): ViewContAinerLocAtion {
		return [...this.viewContAiners.keys()].filter(locAtion => this.getViewContAiners(locAtion).filter(viewContAiner => viewContAiner?.id === contAiner.id).length > 0)[0];
	}

	getDefAultViewContAiner(locAtion: ViewContAinerLocAtion): ViewContAiner | undefined {
		return this.defAultViewContAiners.find(viewContAiner => this.getViewContAinerLocAtion(viewContAiner) === locAtion);
	}
}

Registry.Add(Extensions.ViewContAinersRegistry, new ViewContAinersRegistryImpl());

export interfAce IViewDescriptor {

	reAdonly type?: string;

	reAdonly id: string;

	reAdonly nAme: string;

	reAdonly ctorDescriptor: SyncDescriptor<IView>;

	reAdonly when?: ContextKeyExpression;

	reAdonly order?: number;

	reAdonly weight?: number;

	reAdonly collApsed?: booleAn;

	reAdonly cAnToggleVisibility?: booleAn;

	reAdonly cAnMoveView?: booleAn;

	reAdonly contAinerIcon?: string | URI;

	reAdonly contAinerTitle?: string;

	// Applies only to newly creAted views
	reAdonly hideByDefAult?: booleAn;

	reAdonly workspAce?: booleAn;

	reAdonly focusCommAnd?: { id: string, keybindings?: IKeybindings };

	// For contributed remote explorer views
	reAdonly group?: string;

	reAdonly remoteAuthority?: string | string[];
}

export interfAce IViewDescriptorRef {
	viewDescriptor: IViewDescriptor;
	index: number;
}

export interfAce IAddedViewDescriptorRef extends IViewDescriptorRef {
	collApsed: booleAn;
	size?: number;
}

export interfAce IAddedViewDescriptorStAte {
	viewDescriptor: IViewDescriptor,
	collApsed?: booleAn;
	visible?: booleAn;
}

export interfAce IViewContAinerModel {

	reAdonly title: string;
	reAdonly icon: string | URI | undefined;
	reAdonly onDidChAngeContAinerInfo: Event<{ title?: booleAn, icon?: booleAn }>;

	reAdonly AllViewDescriptors: ReAdonlyArrAy<IViewDescriptor>;
	reAdonly onDidChAngeAllViewDescriptors: Event<{ Added: ReAdonlyArrAy<IViewDescriptor>, removed: ReAdonlyArrAy<IViewDescriptor> }>;

	reAdonly ActiveViewDescriptors: ReAdonlyArrAy<IViewDescriptor>;
	reAdonly onDidChAngeActiveViewDescriptors: Event<{ Added: ReAdonlyArrAy<IViewDescriptor>, removed: ReAdonlyArrAy<IViewDescriptor> }>;

	reAdonly visibleViewDescriptors: ReAdonlyArrAy<IViewDescriptor>;
	reAdonly onDidAddVisibleViewDescriptors: Event<IAddedViewDescriptorRef[]>;
	reAdonly onDidRemoveVisibleViewDescriptors: Event<IViewDescriptorRef[]>
	reAdonly onDidMoveVisibleViewDescriptors: Event<{ from: IViewDescriptorRef; to: IViewDescriptorRef; }>

	isVisible(id: string): booleAn;
	setVisible(id: string, visible: booleAn, size?: number): void;

	isCollApsed(id: string): booleAn;
	setCollApsed(id: string, collApsed: booleAn): void;

	getSize(id: string): number | undefined;
	setSize(id: string, size: number): void

	move(from: string, to: string): void;
}

export enum ViewContentGroups {
	Open = '2_open',
	Debug = '4_debug',
	SCM = '5_scm',
	More = '9_more'
}

export interfAce IViewContentDescriptor {
	reAdonly content: string;
	reAdonly when?: ContextKeyExpression | 'defAult';
	reAdonly group?: string;
	reAdonly order?: number;

	/**
	 * ordered preconditions for eAch button in the content
	 */
	reAdonly preconditions?: (ContextKeyExpression | undefined)[];
}

export interfAce IViewsRegistry {

	reAdonly onViewsRegistered: Event<{ views: IViewDescriptor[], viewContAiner: ViewContAiner }[]>;

	reAdonly onViewsDeregistered: Event<{ views: IViewDescriptor[], viewContAiner: ViewContAiner }>;

	reAdonly onDidChAngeContAiner: Event<{ views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner }>;

	registerViews(views: IViewDescriptor[], viewContAiner: ViewContAiner): void;

	registerViews2(views: { views: IViewDescriptor[], viewContAiner: ViewContAiner }[]): void;

	deregisterViews(views: IViewDescriptor[], viewContAiner: ViewContAiner): void;

	moveViews(views: IViewDescriptor[], viewContAiner: ViewContAiner): void;

	getViews(viewContAiner: ViewContAiner): IViewDescriptor[];

	getView(id: string): IViewDescriptor | null;

	getViewContAiner(id: string): ViewContAiner | null;

	reAdonly onDidChAngeViewWelcomeContent: Event<string>;
	registerViewWelcomeContent(id: string, viewContent: IViewContentDescriptor): IDisposAble;
	getViewWelcomeContent(id: string): IViewContentDescriptor[];
}

function compAreViewContentDescriptors(A: IViewContentDescriptor, b: IViewContentDescriptor): number {
	const AGroup = A.group ?? ViewContentGroups.More;
	const bGroup = b.group ?? ViewContentGroups.More;
	if (AGroup !== bGroup) {
		return AGroup.locAleCompAre(bGroup);
	}
	return (A.order ?? 5) - (b.order ?? 5);
}

clAss ViewsRegistry extends DisposAble implements IViewsRegistry {

	privAte reAdonly _onViewsRegistered = this._register(new Emitter<{ views: IViewDescriptor[], viewContAiner: ViewContAiner }[]>());
	reAdonly onViewsRegistered = this._onViewsRegistered.event;

	privAte reAdonly _onViewsDeregistered: Emitter<{ views: IViewDescriptor[], viewContAiner: ViewContAiner }> = this._register(new Emitter<{ views: IViewDescriptor[], viewContAiner: ViewContAiner }>());
	reAdonly onViewsDeregistered: Event<{ views: IViewDescriptor[], viewContAiner: ViewContAiner }> = this._onViewsDeregistered.event;

	privAte reAdonly _onDidChAngeContAiner: Emitter<{ views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner }> = this._register(new Emitter<{ views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner }>());
	reAdonly onDidChAngeContAiner: Event<{ views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner }> = this._onDidChAngeContAiner.event;

	privAte reAdonly _onDidChAngeViewWelcomeContent: Emitter<string> = this._register(new Emitter<string>());
	reAdonly onDidChAngeViewWelcomeContent: Event<string> = this._onDidChAngeViewWelcomeContent.event;

	privAte _viewContAiners: ViewContAiner[] = [];
	privAte _views: MAp<ViewContAiner, IViewDescriptor[]> = new MAp<ViewContAiner, IViewDescriptor[]>();
	privAte _viewWelcomeContents = new SetMAp<string, IViewContentDescriptor>();

	registerViews(views: IViewDescriptor[], viewContAiner: ViewContAiner): void {
		this.registerViews2([{ views, viewContAiner }]);
	}

	registerViews2(views: { views: IViewDescriptor[], viewContAiner: ViewContAiner }[]): void {
		views.forEAch(({ views, viewContAiner }) => this.AddViews(views, viewContAiner));
		this._onViewsRegistered.fire(views);
	}

	deregisterViews(viewDescriptors: IViewDescriptor[], viewContAiner: ViewContAiner): void {
		const views = this.removeViews(viewDescriptors, viewContAiner);
		if (views.length) {
			this._onViewsDeregistered.fire({ views, viewContAiner });
		}
	}

	moveViews(viewsToMove: IViewDescriptor[], viewContAiner: ViewContAiner): void {
		for (const contAiner of this._views.keys()) {
			if (contAiner !== viewContAiner) {
				const views = this.removeViews(viewsToMove, contAiner);
				if (views.length) {
					this.AddViews(views, viewContAiner);
					this._onDidChAngeContAiner.fire({ views, from: contAiner, to: viewContAiner });
				}
			}
		}
	}

	getViews(loc: ViewContAiner): IViewDescriptor[] {
		return this._views.get(loc) || [];
	}

	getView(id: string): IViewDescriptor | null {
		for (const viewContAiner of this._viewContAiners) {
			const viewDescriptor = (this._views.get(viewContAiner) || []).filter(v => v.id === id)[0];
			if (viewDescriptor) {
				return viewDescriptor;
			}
		}
		return null;
	}

	getViewContAiner(viewId: string): ViewContAiner | null {
		for (const viewContAiner of this._viewContAiners) {
			const viewDescriptor = (this._views.get(viewContAiner) || []).filter(v => v.id === viewId)[0];
			if (viewDescriptor) {
				return viewContAiner;
			}
		}
		return null;
	}

	registerViewWelcomeContent(id: string, viewContent: IViewContentDescriptor): IDisposAble {
		this._viewWelcomeContents.Add(id, viewContent);
		this._onDidChAngeViewWelcomeContent.fire(id);

		return toDisposAble(() => {
			this._viewWelcomeContents.delete(id, viewContent);
			this._onDidChAngeViewWelcomeContent.fire(id);
		});
	}

	getViewWelcomeContent(id: string): IViewContentDescriptor[] {
		const result: IViewContentDescriptor[] = [];
		this._viewWelcomeContents.forEAch(id, descriptor => result.push(descriptor));
		mergeSort(result, compAreViewContentDescriptors);
		return result;
	}

	privAte AddViews(viewDescriptors: IViewDescriptor[], viewContAiner: ViewContAiner): void {
		let views = this._views.get(viewContAiner);
		if (!views) {
			views = [];
			this._views.set(viewContAiner, views);
			this._viewContAiners.push(viewContAiner);
		}
		for (const viewDescriptor of viewDescriptors) {
			if (this.getView(viewDescriptor.id) !== null) {
				throw new Error(locAlize('duplicAteId', "A view with id '{0}' is AlreAdy registered", viewDescriptor.id));
			}
			views.push(viewDescriptor);
		}
	}

	privAte removeViews(viewDescriptors: IViewDescriptor[], viewContAiner: ViewContAiner): IViewDescriptor[] {
		const views = this._views.get(viewContAiner);
		if (!views) {
			return [];
		}
		const viewsToDeregister: IViewDescriptor[] = [];
		const remAningViews: IViewDescriptor[] = [];
		for (const view of views) {
			if (!viewDescriptors.includes(view)) {
				remAningViews.push(view);
			} else {
				viewsToDeregister.push(view);
			}
		}
		if (viewsToDeregister.length) {
			if (remAningViews.length) {
				this._views.set(viewContAiner, remAningViews);
			} else {
				this._views.delete(viewContAiner);
				this._viewContAiners.splice(this._viewContAiners.indexOf(viewContAiner), 1);
			}
		}
		return viewsToDeregister;
	}
}

Registry.Add(Extensions.ViewsRegistry, new ViewsRegistry());

export interfAce IView {

	reAdonly id: string;

	focus(): void;

	isVisible(): booleAn;

	isBodyVisible(): booleAn;

	setExpAnded(expAnded: booleAn): booleAn;

	getProgressIndicAtor(): IProgressIndicAtor | undefined;
}

export const IViewsService = creAteDecorAtor<IViewsService>('viewsService');
export interfAce IViewsService {

	reAdonly _serviceBrAnd: undefined;

	// View ContAiner APIs
	reAdonly onDidChAngeViewContAinerVisibility: Event<{ id: string, visible: booleAn, locAtion: ViewContAinerLocAtion }>;
	isViewContAinerVisible(id: string): booleAn;
	openViewContAiner(id: string, focus?: booleAn): Promise<IPAneComposite | null>;
	closeViewContAiner(id: string): void;
	getVisibleViewContAiner(locAtion: ViewContAinerLocAtion): ViewContAiner | null;
	getActiveViewPAneContAinerWithId(viewContAinerId: string): IViewPAneContAiner | null;

	// View APIs
	reAdonly onDidChAngeViewVisibility: Event<{ id: string, visible: booleAn }>;
	isViewVisible(id: string): booleAn;
	openView<T extends IView>(id: string, focus?: booleAn): Promise<T | null>;
	closeView(id: string): void;
	getActiveViewWithId<T extends IView>(id: string): T | null;
	getViewProgressIndicAtor(id: string): IProgressIndicAtor | undefined;
}

/**
 * View Contexts
 */
export const FocusedViewContext = new RAwContextKey<string>('focusedView', '');
export function getVisbileViewContextKey(viewId: string): string { return `${viewId}.visible`; }

export const IViewDescriptorService = creAteDecorAtor<IViewDescriptorService>('viewDescriptorService');

export enum ViewVisibilityStAte {
	DefAult = 0,
	ExpAnd = 1
}

export interfAce IViewDescriptorService {

	reAdonly _serviceBrAnd: undefined;

	// ViewContAiners
	reAdonly viewContAiners: ReAdonlyArrAy<ViewContAiner>;
	reAdonly onDidChAngeViewContAiners: Event<{ Added: ReAdonlyArrAy<{ contAiner: ViewContAiner, locAtion: ViewContAinerLocAtion }>, removed: ReAdonlyArrAy<{ contAiner: ViewContAiner, locAtion: ViewContAinerLocAtion }> }>;

	getDefAultViewContAiner(locAtion: ViewContAinerLocAtion): ViewContAiner | undefined;
	getViewContAinerById(id: string): ViewContAiner | null;
	isViewContAinerRemovedPermAnently(id: string): booleAn;
	getDefAultViewContAinerLocAtion(viewContAiner: ViewContAiner): ViewContAinerLocAtion | null;
	getViewContAinerLocAtion(viewContAiner: ViewContAiner): ViewContAinerLocAtion | null;
	getViewContAinersByLocAtion(locAtion: ViewContAinerLocAtion): ViewContAiner[];
	getViewContAinerModel(viewContAiner: ViewContAiner): IViewContAinerModel;

	reAdonly onDidChAngeContAinerLocAtion: Event<{ viewContAiner: ViewContAiner, from: ViewContAinerLocAtion, to: ViewContAinerLocAtion }>;
	moveViewContAinerToLocAtion(viewContAiner: ViewContAiner, locAtion: ViewContAinerLocAtion, requestedIndex?: number): void;

	// Views
	getViewDescriptorById(id: string): IViewDescriptor | null;
	getViewContAinerByViewId(id: string): ViewContAiner | null;
	getDefAultContAinerById(id: string): ViewContAiner | null;
	getViewLocAtionById(id: string): ViewContAinerLocAtion | null;

	reAdonly onDidChAngeContAiner: Event<{ views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner }>;
	moveViewsToContAiner(views: IViewDescriptor[], viewContAiner: ViewContAiner, visibilityStAte?: ViewVisibilityStAte): void;

	reAdonly onDidChAngeLocAtion: Event<{ views: IViewDescriptor[], from: ViewContAinerLocAtion, to: ViewContAinerLocAtion }>;
	moveViewToLocAtion(view: IViewDescriptor, locAtion: ViewContAinerLocAtion): void;

	reset(): void;
}

// Custom views

export interfAce ITreeView extends IDisposAble {

	dAtAProvider: ITreeViewDAtAProvider | undefined;

	showCollApseAllAction: booleAn;

	cAnSelectMAny: booleAn;

	messAge?: string;

	title: string;

	description: string | undefined;

	reAdonly visible: booleAn;

	reAdonly onDidExpAndItem: Event<ITreeItem>;

	reAdonly onDidCollApseItem: Event<ITreeItem>;

	reAdonly onDidChAngeSelection: Event<ITreeItem[]>;

	reAdonly onDidChAngeVisibility: Event<booleAn>;

	reAdonly onDidChAngeActions: Event<void>;

	reAdonly onDidChAngeTitle: Event<string>;

	reAdonly onDidChAngeDescription: Event<string | undefined>;

	reAdonly onDidChAngeWelcomeStAte: Event<void>;

	refresh(treeItems?: ITreeItem[]): Promise<void>;

	setVisibility(visible: booleAn): void;

	focus(): void;

	lAyout(height: number, width: number): void;

	getOptimAlWidth(): number;

	reveAl(item: ITreeItem): Promise<void>;

	expAnd(itemOrItems: ITreeItem | ITreeItem[]): Promise<void>;

	setSelection(items: ITreeItem[]): void;

	setFocus(item: ITreeItem): void;

	show(contAiner: Any): void;
}

export interfAce IReveAlOptions {

	select?: booleAn;

	focus?: booleAn;

	expAnd?: booleAn | number;

}

export interfAce ITreeViewDescriptor extends IViewDescriptor {
	treeView: ITreeView;
}

export type TreeViewItemHAndleArg = {
	$treeViewId: string,
	$treeItemHAndle: string
};

export enum TreeItemCollApsibleStAte {
	None = 0,
	CollApsed = 1,
	ExpAnded = 2
}

export interfAce ITreeItemLAbel {

	lAbel: string;

	highlights?: [number, number][];

	strikethrough?: booleAn;

}

export interfAce ITreeItem {

	hAndle: string;

	pArentHAndle?: string;

	collApsibleStAte: TreeItemCollApsibleStAte;

	lAbel?: ITreeItemLAbel;

	description?: string | booleAn;

	icon?: UriComponents;

	iconDArk?: UriComponents;

	themeIcon?: ThemeIcon;

	resourceUri?: UriComponents;

	tooltip?: string | IMArkdownString;

	contextVAlue?: string;

	commAnd?: CommAnd;

	children?: ITreeItem[];

	AccessibilityInformAtion?: IAccessibilityInformAtion;
}

export clAss ResolvAbleTreeItem implements ITreeItem {
	hAndle!: string;
	pArentHAndle?: string;
	collApsibleStAte!: TreeItemCollApsibleStAte;
	lAbel?: ITreeItemLAbel;
	description?: string | booleAn;
	icon?: UriComponents;
	iconDArk?: UriComponents;
	themeIcon?: ThemeIcon;
	resourceUri?: UriComponents;
	tooltip?: string | IMArkdownString;
	contextVAlue?: string;
	commAnd?: CommAnd;
	children?: ITreeItem[];
	AccessibilityInformAtion?: IAccessibilityInformAtion;
	resolve: () => Promise<void>;
	privAte resolved: booleAn = fAlse;
	privAte _hAsResolve: booleAn = fAlse;
	constructor(treeItem: ITreeItem, resolve?: (() => Promise<ITreeItem | undefined>)) {
		mixin(this, treeItem);
		this._hAsResolve = !!resolve;
		this.resolve = Async () => {
			if (resolve && !this.resolved) {
				const resolvedItem = AwAit resolve();
				if (resolvedItem) {
					// ResolvAble elements. Currently only tooltip.
					this.tooltip = resolvedItem.tooltip;
				}
			}
			this.resolved = true;
		};
	}
	get hAsResolve(): booleAn {
		return this._hAsResolve;
	}
}

export interfAce ITreeViewDAtAProvider {
	reAdonly isTreeEmpty?: booleAn;
	onDidChAngeEmpty?: Event<void>;
	getChildren(element?: ITreeItem): Promise<ITreeItem[]>;

}

export interfAce IEditAbleDAtA {
	vAlidAtionMessAge: (vAlue: string) => { content: string, severity: Severity } | null;
	plAceholder?: string | null;
	stArtingVAlue?: string | null;
	onFinish: (vAlue: string, success: booleAn) => Promise<void>;
}

export interfAce IViewPAneContAiner {
	onDidAddViews: Event<IView[]>;
	onDidRemoveViews: Event<IView[]>;
	onDidChAngeViewVisibility: Event<IView>;

	reAdonly views: IView[];

	setVisible(visible: booleAn): void;
	isVisible(): booleAn;
	focus(): void;
	getActions(): IAction[];
	getSecondAryActions(): IAction[];
	getActionViewItem(Action: IAction): IActionViewItem | undefined;
	getActionsContext(): unknown;
	getView(viewId: string): IView | undefined;
	sAveStAte(): void;
}
