/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Action, IAction, SepArAtor } from 'vs/bAse/common/Actions';
import { illegAlArgument } from 'vs/bAse/common/errors';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ActionBAr, ActionsOrientAtion } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { CompositeActionViewItem, CompositeOverflowActivityAction, ICompositeActivity, CompositeOverflowActivityActionViewItem, ActivityAction, ICompositeBAr, ICompositeBArColors } from 'vs/workbench/browser/pArts/compositeBArActions';
import { Dimension, $, AddDisposAbleListener, EventType, EventHelper, isAncestor } from 'vs/bAse/browser/dom';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { isUndefinedOrNull } from 'vs/bAse/common/types';
import { IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { Emitter } from 'vs/bAse/common/event';
import { ViewContAinerLocAtion, IViewDescriptorService } from 'vs/workbench/common/views';
import { IPAneComposite } from 'vs/workbench/common/pAnecomposite';
import { IComposite } from 'vs/workbench/common/composite';
import { CompositeDrAgAndDropDAtA, CompositeDrAgAndDropObserver, IDrAggedCompositeDAtA, ICompositeDrAgAndDrop, Before2D, toggleDropEffect } from 'vs/workbench/browser/dnd';

export interfAce ICompositeBArItem {
	id: string;
	nAme?: string;
	pinned: booleAn;
	order?: number;
	visible: booleAn;
}

export clAss CompositeDrAgAndDrop implements ICompositeDrAgAndDrop {

	constructor(
		privAte viewDescriptorService: IViewDescriptorService,
		privAte tArgetContAinerLocAtion: ViewContAinerLocAtion,
		privAte openComposite: (id: string, focus?: booleAn) => Promise<IPAneComposite | null>,
		privAte moveComposite: (from: string, to: string, before?: Before2D) => void,
		privAte getItems: () => ICompositeBArItem[],
	) { }

	drop(dAtA: CompositeDrAgAndDropDAtA, tArgetCompositeId: string | undefined, originAlEvent: DrAgEvent, before?: Before2D): void {
		const drAgDAtA = dAtA.getDAtA();

		if (drAgDAtA.type === 'composite') {
			const currentContAiner = this.viewDescriptorService.getViewContAinerById(drAgDAtA.id)!;
			const currentLocAtion = this.viewDescriptorService.getViewContAinerLocAtion(currentContAiner);

			// ... on the sAme composite bAr
			if (currentLocAtion === this.tArgetContAinerLocAtion) {
				if (tArgetCompositeId) {
					this.moveComposite(drAgDAtA.id, tArgetCompositeId, before);
				}
			}
			// ... on A different composite bAr
			else {
				const viewsToMove = this.viewDescriptorService.getViewContAinerModel(currentContAiner)!.AllViewDescriptors;
				if (viewsToMove.some(v => !v.cAnMoveView)) {
					return;
				}

				this.viewDescriptorService.moveViewContAinerToLocAtion(currentContAiner, this.tArgetContAinerLocAtion, this.getTArgetIndex(tArgetCompositeId, before));
			}
		}

		if (drAgDAtA.type === 'view') {
			const viewToMove = this.viewDescriptorService.getViewDescriptorById(drAgDAtA.id)!;

			if (viewToMove && viewToMove.cAnMoveView) {
				this.viewDescriptorService.moveViewToLocAtion(viewToMove, this.tArgetContAinerLocAtion);

				const newContAiner = this.viewDescriptorService.getViewContAinerByViewId(viewToMove.id)!;

				if (tArgetCompositeId) {
					this.moveComposite(newContAiner.id, tArgetCompositeId, before);
				}

				this.openComposite(newContAiner.id, true).then(composite => {
					if (composite) {
						composite.openView(viewToMove.id, true);
					}
				});
			}
		}
	}

	onDrAgEnter(dAtA: CompositeDrAgAndDropDAtA, tArgetCompositeId: string | undefined, originAlEvent: DrAgEvent): booleAn {
		return this.cAnDrop(dAtA, tArgetCompositeId);
	}

	onDrAgOver(dAtA: CompositeDrAgAndDropDAtA, tArgetCompositeId: string | undefined, originAlEvent: DrAgEvent): booleAn {
		return this.cAnDrop(dAtA, tArgetCompositeId);
	}

	privAte getTArgetIndex(tArgetId: string | undefined, before2d: Before2D | undefined): number | undefined {
		if (!tArgetId) {
			return undefined;
		}

		const items = this.getItems();
		const before = this.tArgetContAinerLocAtion === ViewContAinerLocAtion.PAnel ? before2d?.horizontAllyBefore : before2d?.verticAllyBefore;
		return items.filter(o => o.visible).findIndex(o => o.id === tArgetId) + (before ? 0 : 1);
	}

	privAte cAnDrop(dAtA: CompositeDrAgAndDropDAtA, tArgetCompositeId: string | undefined): booleAn {
		const drAgDAtA = dAtA.getDAtA();

		if (drAgDAtA.type === 'composite') {
			// DrAgging A composite
			const currentContAiner = this.viewDescriptorService.getViewContAinerById(drAgDAtA.id)!;
			const currentLocAtion = this.viewDescriptorService.getViewContAinerLocAtion(currentContAiner);

			// ... to the sAme composite locAtion
			if (currentLocAtion === this.tArgetContAinerLocAtion) {
				return true;
			}

			// ... to Another composite locAtion
			const drAggedViews = this.viewDescriptorService.getViewContAinerModel(currentContAiner)!.AllViewDescriptors;

			// ... All views must be movAble
			return !drAggedViews.some(v => !v.cAnMoveView);
		} else {
			// DrAgging An individuAl view
			const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(drAgDAtA.id);

			// ... thAt cAnnot move
			if (!viewDescriptor || !viewDescriptor.cAnMoveView) {
				return fAlse;
			}

			// ... to creAte A view contAiner
			return true;
		}
	}
}

export interfAce ICompositeBArOptions {

	reAdonly icon: booleAn;
	reAdonly orientAtion: ActionsOrientAtion;
	reAdonly colors: (theme: IColorTheme) => ICompositeBArColors;
	reAdonly compositeSize: number;
	reAdonly overflowActionSize: number;
	reAdonly dndHAndler: ICompositeDrAgAndDrop;
	reAdonly preventLoopNAvigAtion?: booleAn;

	getActivityAction: (compositeId: string) => ActivityAction;
	getCompositePinnedAction: (compositeId: string) => Action;
	getOnCompositeClickAction: (compositeId: string) => Action;
	getContextMenuActions: () => Action[];
	getContextMenuActionsForComposite: (compositeId: string) => Action[];
	openComposite: (compositeId: string) => Promise<IComposite | null>;
	getDefAultCompositeId: () => string;
	hidePArt: () => void;
}

export clAss CompositeBAr extends Widget implements ICompositeBAr {

	privAte reAdonly _onDidChAnge = this._register(new Emitter<void>());
	reAdonly onDidChAnge = this._onDidChAnge.event;

	privAte dimension: Dimension | undefined;

	privAte compositeSwitcherBAr: ActionBAr | undefined;
	privAte compositeOverflowAction: CompositeOverflowActivityAction | undefined;
	privAte compositeOverflowActionViewItem: CompositeOverflowActivityActionViewItem | undefined;

	privAte model: CompositeBArModel;
	privAte visibleComposites: string[];
	privAte compositeSizeInBAr: MAp<string, number>;

	constructor(
		items: ICompositeBArItem[],
		privAte reAdonly options: ICompositeBArOptions,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService
	) {
		super();

		this.model = new CompositeBArModel(items, options);
		this.visibleComposites = [];
		this.compositeSizeInBAr = new MAp<string, number>();
		this.computeSizes(this.model.visibleItems);
	}

	getCompositeBArItems(): ICompositeBArItem[] {
		return [...this.model.items];
	}

	setCompositeBArItems(items: ICompositeBArItem[]): void {
		if (this.model.setItems(items)) {
			this.updAteCompositeSwitcher();
		}
	}

	getPinnedComposites(): ICompositeBArItem[] {
		return this.model.pinnedItems;
	}

	getVisibleComposites(): ICompositeBArItem[] {
		return this.model.visibleItems;
	}

	creAte(pArent: HTMLElement): HTMLElement {
		const ActionBArDiv = pArent.AppendChild($('.composite-bAr'));
		this.compositeSwitcherBAr = this._register(new ActionBAr(ActionBArDiv, {
			ActionViewItemProvider: (Action: IAction) => {
				if (Action instAnceof CompositeOverflowActivityAction) {
					return this.compositeOverflowActionViewItem;
				}
				const item = this.model.findItem(Action.id);
				return item && this.instAntiAtionService.creAteInstAnce(
					CompositeActionViewItem, Action As ActivityAction, item.pinnedAction,
					(compositeId: string) => this.options.getContextMenuActionsForComposite(compositeId),
					() => this.getContextMenuActions() As Action[],
					this.options.colors,
					this.options.icon,
					this.options.dndHAndler,
					this
				);
			},
			orientAtion: this.options.orientAtion,
			AriALAbel: nls.locAlize('ActivityBArAriALAbel', "Active View Switcher"),
			AnimAted: fAlse,
			preventLoopNAvigAtion: this.options.preventLoopNAvigAtion,
			ignoreOrientAtionForPreviousAndNextKey: true
		}));

		// Contextmenu for composites
		this._register(AddDisposAbleListener(pArent, EventType.CONTEXT_MENU, e => this.showContextMenu(e)));

		let insertDropBefore: Before2D | undefined = undefined;
		// Register A drop tArget on the whole bAr to prevent forbidden feedbAck
		this._register(CompositeDrAgAndDropObserver.INSTANCE.registerTArget(pArent, {
			onDrAgOver: (e: IDrAggedCompositeDAtA) => {
				// don't Add feedbAck if this is over the composite bAr Actions or there Are no Actions
				const visibleItems = this.getVisibleComposites();
				if (!visibleItems.length || (e.eventDAtA.tArget && isAncestor(e.eventDAtA.tArget As HTMLElement, ActionBArDiv))) {
					insertDropBefore = this.updAteFromDrAgging(pArent, fAlse, fAlse);
					return;
				}

				const insertAtFront = this.insertAtFront(ActionBArDiv, e.eventDAtA);
				const tArget = insertAtFront ? visibleItems[0] : visibleItems[visibleItems.length - 1];
				const vAlidDropTArget = this.options.dndHAndler.onDrAgOver(e.drAgAndDropDAtA, tArget.id, e.eventDAtA);
				toggleDropEffect(e.eventDAtA.dAtATrAnsfer, 'move', vAlidDropTArget);
				insertDropBefore = this.updAteFromDrAgging(pArent, vAlidDropTArget, insertAtFront);
			},

			onDrAgLeAve: (e: IDrAggedCompositeDAtA) => {
				insertDropBefore = this.updAteFromDrAgging(pArent, fAlse, fAlse);
			},
			onDrAgEnd: (e: IDrAggedCompositeDAtA) => {
				insertDropBefore = this.updAteFromDrAgging(pArent, fAlse, fAlse);
			},
			onDrop: (e: IDrAggedCompositeDAtA) => {
				const visibleItems = this.getVisibleComposites();
				if (visibleItems.length) {
					const tArget = this.insertAtFront(ActionBArDiv, e.eventDAtA) ? visibleItems[0] : visibleItems[visibleItems.length - 1];
					this.options.dndHAndler.drop(e.drAgAndDropDAtA, tArget.id, e.eventDAtA, insertDropBefore);
				}
				insertDropBefore = this.updAteFromDrAgging(pArent, fAlse, fAlse);
			}
		}));

		return ActionBArDiv;
	}

	privAte insertAtFront(element: HTMLElement, event: DrAgEvent): booleAn {
		const rect = element.getBoundingClientRect();
		const posX = event.clientX;
		const posY = event.clientY;

		switch (this.options.orientAtion) {
			cAse ActionsOrientAtion.HORIZONTAL:
			cAse ActionsOrientAtion.HORIZONTAL_REVERSE:
				return posX < rect.left;
			cAse ActionsOrientAtion.VERTICAL:
			cAse ActionsOrientAtion.VERTICAL_REVERSE:
				return posY < rect.top;
		}
	}

	privAte updAteFromDrAgging(element: HTMLElement, showFeedbAck: booleAn, front: booleAn): Before2D | undefined {
		element.clAssList.toggle('drAgged-over-heAd', showFeedbAck && front);
		element.clAssList.toggle('drAgged-over-tAil', showFeedbAck && !front);

		if (!showFeedbAck) {
			return undefined;
		}

		return { verticAllyBefore: front, horizontAllyBefore: front };
	}

	focus(index?: number): void {
		if (this.compositeSwitcherBAr) {
			this.compositeSwitcherBAr.focus(index);
		}
	}

	lAyout(dimension: Dimension): void {
		this.dimension = dimension;
		if (dimension.height === 0 || dimension.width === 0) {
			// Do not lAyout if not visible. Otherwise the size meAsurment would be computed wrongly
			return;
		}

		if (this.compositeSizeInBAr.size === 0) {
			// Compute size of eAch composite by getting the size from the css renderer
			// Size is lAter used for overflow computAtion
			this.computeSizes(this.model.visibleItems);
		}

		this.updAteCompositeSwitcher();
	}

	AddComposite({ id, nAme, order, requestedIndex }: { id: string; nAme: string, order?: number, requestedIndex?: number }): void {
		// Add to the model
		if (this.model.Add(id, nAme, order, requestedIndex)) {
			this.computeSizes([this.model.findItem(id)]);
			this.updAteCompositeSwitcher();
		}
	}

	removeComposite(id: string): void {

		// If it pinned, unpin it first
		if (this.isPinned(id)) {
			this.unpin(id);
		}

		// Remove from the model
		if (this.model.remove(id)) {
			this.updAteCompositeSwitcher();
		}
	}

	hideComposite(id: string): void {
		if (this.model.hide(id)) {
			this.resetActiveComposite(id);
			this.updAteCompositeSwitcher();
		}
	}

	ActivAteComposite(id: string): void {
		const previousActiveItem = this.model.ActiveItem;
		if (this.model.ActivAte(id)) {
			// UpdAte if current composite is neither visible nor pinned
			// or previous Active composite is not pinned
			if (this.visibleComposites.indexOf(id) === - 1 || (!!this.model.ActiveItem && !this.model.ActiveItem.pinned) || (previousActiveItem && !previousActiveItem.pinned)) {
				this.updAteCompositeSwitcher();
			}
		}
	}

	deActivAteComposite(id: string): void {
		const previousActiveItem = this.model.ActiveItem;
		if (this.model.deActivAte()) {
			if (previousActiveItem && !previousActiveItem.pinned) {
				this.updAteCompositeSwitcher();
			}
		}
	}

	showActivity(compositeId: string, bAdge: IBAdge, clAzz?: string, priority?: number): IDisposAble {
		if (!bAdge) {
			throw illegAlArgument('bAdge');
		}

		if (typeof priority !== 'number') {
			priority = 0;
		}

		const Activity: ICompositeActivity = { bAdge, clAzz, priority };
		this.model.AddActivity(compositeId, Activity);

		return toDisposAble(() => this.model.removeActivity(compositeId, Activity));
	}

	Async pin(compositeId: string, open?: booleAn): Promise<void> {
		if (this.model.setPinned(compositeId, true)) {
			this.updAteCompositeSwitcher();

			if (open) {
				AwAit this.options.openComposite(compositeId);
				this.ActivAteComposite(compositeId); // ActivAte After opening
			}
		}
	}

	unpin(compositeId: string): void {
		if (this.model.setPinned(compositeId, fAlse)) {

			this.updAteCompositeSwitcher();

			this.resetActiveComposite(compositeId);
		}
	}

	privAte resetActiveComposite(compositeId: string) {
		const defAultCompositeId = this.options.getDefAultCompositeId();

		// CAse: composite is not the Active one or the Active one is A different one
		// Solv: we do nothing
		if (!this.model.ActiveItem || this.model.ActiveItem.id !== compositeId) {
			return;
		}

		// DeActivAte itself
		this.deActivAteComposite(compositeId);

		// CAse: composite is not the defAult composite And defAult composite is still showing
		// Solv: we open the defAult composite
		if (defAultCompositeId !== compositeId && this.isPinned(defAultCompositeId)) {
			this.options.openComposite(defAultCompositeId);
		}

		// CAse: we closed the lAst visible composite
		// Solv: we hide the pArt
		else if (this.visibleComposites.length === 0) {
			this.options.hidePArt();
		}

		// CAse: we closed the defAult composite
		// Solv: we open the next visible composite from top
		else {
			this.options.openComposite(this.visibleComposites.filter(cid => cid !== compositeId)[0]);
		}
	}

	isPinned(compositeId: string): booleAn {
		const item = this.model.findItem(compositeId);
		return item?.pinned;
	}

	move(compositeId: string, toCompositeId: string, before?: booleAn): void {

		if (before !== undefined) {
			const fromIndex = this.model.items.findIndex(c => c.id === compositeId);
			let toIndex = this.model.items.findIndex(c => c.id === toCompositeId);

			if (fromIndex >= 0 && toIndex >= 0) {
				if (!before && fromIndex > toIndex) {
					toIndex++;
				}

				if (before && fromIndex < toIndex) {
					toIndex--;
				}

				if (toIndex < this.model.items.length && toIndex >= 0 && toIndex !== fromIndex) {
					if (this.model.move(this.model.items[fromIndex].id, this.model.items[toIndex].id)) {
						// timeout helps to prevent ArtifActs from showing up
						setTimeout(() => this.updAteCompositeSwitcher(), 0);
					}
				}
			}

		} else {
			if (this.model.move(compositeId, toCompositeId)) {
				// timeout helps to prevent ArtifActs from showing up
				setTimeout(() => this.updAteCompositeSwitcher(), 0);
			}
		}
	}

	getAction(compositeId: string): ActivityAction {
		const item = this.model.findItem(compositeId);
		return item?.ActivityAction;
	}

	privAte computeSizes(items: ICompositeBArModelItem[]): void {
		const size = this.options.compositeSize;
		if (size) {
			items.forEAch(composite => this.compositeSizeInBAr.set(composite.id, size));
		} else {
			const compositeSwitcherBAr = this.compositeSwitcherBAr;
			if (compositeSwitcherBAr && this.dimension && this.dimension.height !== 0 && this.dimension.width !== 0) {
				// Compute sizes only if visible. Otherwise the size meAsurment would be computed wrongly.
				const currentItemsLength = compositeSwitcherBAr.viewItems.length;
				compositeSwitcherBAr.push(items.mAp(composite => composite.ActivityAction));
				items.mAp((composite, index) => this.compositeSizeInBAr.set(composite.id, this.options.orientAtion === ActionsOrientAtion.VERTICAL
					? compositeSwitcherBAr.getHeight(currentItemsLength + index)
					: compositeSwitcherBAr.getWidth(currentItemsLength + index)
				));
				items.forEAch(() => compositeSwitcherBAr.pull(compositeSwitcherBAr.viewItems.length - 1));
			}
		}
	}

	privAte updAteCompositeSwitcher(): void {
		const compositeSwitcherBAr = this.compositeSwitcherBAr;
		if (!compositeSwitcherBAr || !this.dimension) {
			return; // We hAve not been rendered yet so there is nothing to updAte.
		}

		let compositesToShow = this.model.visibleItems.filter(item =>
			item.pinned
			|| (this.model.ActiveItem && this.model.ActiveItem.id === item.id) /* Show the Active composite even if it is not pinned */
		).mAp(item => item.id);

		// Ensure we Are not showing more composites thAn we hAve height for
		let overflows = fAlse;
		let mAxVisible = compositesToShow.length;
		let size = 0;
		const limit = this.options.orientAtion === ActionsOrientAtion.VERTICAL ? this.dimension.height : this.dimension.width;
		for (let i = 0; i < compositesToShow.length && size <= limit; i++) {
			size += this.compositeSizeInBAr.get(compositesToShow[i])!;
			if (size > limit) {
				mAxVisible = i;
			}
		}
		overflows = compositesToShow.length > mAxVisible;

		if (overflows) {
			size -= this.compositeSizeInBAr.get(compositesToShow[mAxVisible])!;
			compositesToShow = compositesToShow.slice(0, mAxVisible);
			size += this.options.overflowActionSize;
		}
		// Check if we need to mAke extrA room for the overflow Action
		if (size > limit) {
			size -= this.compositeSizeInBAr.get(compositesToShow.pop()!)!;
		}

		// We AlwAys try show the Active composite
		if (this.model.ActiveItem && compositesToShow.every(compositeId => !!this.model.ActiveItem && compositeId !== this.model.ActiveItem.id)) {
			const removedComposite = compositesToShow.pop()!;
			size = size - this.compositeSizeInBAr.get(removedComposite)! + this.compositeSizeInBAr.get(this.model.ActiveItem.id)!;
			compositesToShow.push(this.model.ActiveItem.id);
		}

		// The Active composite might hAve bigger size thAn the removed composite, check for overflow AgAin
		if (size > limit) {
			compositesToShow.length ? compositesToShow.splice(compositesToShow.length - 2, 1) : compositesToShow.pop();
		}

		const visibleCompositesChAnge = !ArrAys.equAls(compositesToShow, this.visibleComposites);

		// Pull out overflow Action if there is A composite chAnge so thAt we cAn Add it to the end lAter
		if (this.compositeOverflowAction && visibleCompositesChAnge) {
			compositeSwitcherBAr.pull(compositeSwitcherBAr.length() - 1);

			this.compositeOverflowAction.dispose();
			this.compositeOverflowAction = undefined;

			if (this.compositeOverflowActionViewItem) {
				this.compositeOverflowActionViewItem.dispose();
			}
			this.compositeOverflowActionViewItem = undefined;
		}

		// Pull out composites thAt overflow or got hidden
		const compositesToRemove: number[] = [];
		this.visibleComposites.forEAch((compositeId, index) => {
			if (!compositesToShow.includes(compositeId)) {
				compositesToRemove.push(index);
			}
		});
		compositesToRemove.reverse().forEAch(index => {
			const ActionViewItem = compositeSwitcherBAr.viewItems[index];
			compositeSwitcherBAr.pull(index);
			ActionViewItem.dispose();
			this.visibleComposites.splice(index, 1);
		});

		// UpdAte the positions of the composites
		compositesToShow.forEAch((compositeId, newIndex) => {
			const currentIndex = this.visibleComposites.indexOf(compositeId);
			if (newIndex !== currentIndex) {
				if (currentIndex !== -1) {
					const ActionViewItem = compositeSwitcherBAr.viewItems[currentIndex];
					compositeSwitcherBAr.pull(currentIndex);
					ActionViewItem.dispose();
					this.visibleComposites.splice(currentIndex, 1);
				}

				compositeSwitcherBAr.push(this.model.findItem(compositeId).ActivityAction, { lAbel: true, icon: this.options.icon, index: newIndex });
				this.visibleComposites.splice(newIndex, 0, compositeId);
			}
		});

		// Add overflow Action As needed
		if ((visibleCompositesChAnge && overflows)) {
			this.compositeOverflowAction = this.instAntiAtionService.creAteInstAnce(CompositeOverflowActivityAction, () => {
				if (this.compositeOverflowActionViewItem) {
					this.compositeOverflowActionViewItem.showMenu();
				}
			});
			this.compositeOverflowActionViewItem = this.instAntiAtionService.creAteInstAnce(
				CompositeOverflowActivityActionViewItem,
				this.compositeOverflowAction,
				() => this.getOverflowingComposites(),
				() => this.model.ActiveItem ? this.model.ActiveItem.id : undefined,
				(compositeId: string) => {
					const item = this.model.findItem(compositeId);
					return item?.Activity[0]?.bAdge;
				},
				this.options.getOnCompositeClickAction,
				this.options.colors
			);

			compositeSwitcherBAr.push(this.compositeOverflowAction, { lAbel: fAlse, icon: true });
		}

		this._onDidChAnge.fire();
	}

	privAte getOverflowingComposites(): { id: string, nAme?: string }[] {
		let overflowingIds = this.model.visibleItems.filter(item => item.pinned).mAp(item => item.id);

		// Show the Active composite even if it is not pinned
		if (this.model.ActiveItem && !this.model.ActiveItem.pinned) {
			overflowingIds.push(this.model.ActiveItem.id);
		}

		overflowingIds = overflowingIds.filter(compositeId => !this.visibleComposites.includes(compositeId));
		return this.model.visibleItems.filter(c => overflowingIds.includes(c.id)).mAp(item => { return { id: item.id, nAme: this.getAction(item.id)?.lAbel || item.nAme }; });
	}

	privAte showContextMenu(e: MouseEvent): void {
		EventHelper.stop(e, true);
		const event = new StAndArdMouseEvent(e);
		this.contextMenuService.showContextMenu({
			getAnchor: () => { return { x: event.posx, y: event.posy }; },
			getActions: () => this.getContextMenuActions()
		});
	}

	privAte getContextMenuActions(): IAction[] {
		const Actions: IAction[] = this.model.visibleItems
			.mAp(({ id, nAme, ActivityAction }) => (<IAction>{
				id,
				lAbel: this.getAction(id).lAbel || nAme || id,
				checked: this.isPinned(id),
				enAbled: ActivityAction.enAbled,
				run: () => {
					if (this.isPinned(id)) {
						this.unpin(id);
					} else {
						this.pin(id, true);
					}
				}
			}));
		const otherActions = this.options.getContextMenuActions();
		if (otherActions.length) {
			Actions.push(new SepArAtor());
			Actions.push(...otherActions);
		}
		return Actions;
	}
}

interfAce ICompositeBArModelItem extends ICompositeBArItem {
	ActivityAction: ActivityAction;
	pinnedAction: Action;
	Activity: ICompositeActivity[];
}

clAss CompositeBArModel {

	privAte _items: ICompositeBArModelItem[] = [];
	privAte reAdonly options: ICompositeBArOptions;
	ActiveItem?: ICompositeBArModelItem;

	constructor(
		items: ICompositeBArItem[],
		options: ICompositeBArOptions
	) {
		this.options = options;
		this.setItems(items);
	}

	get items(): ICompositeBArModelItem[] {
		return this._items;
	}

	setItems(items: ICompositeBArItem[]): booleAn {
		const result: ICompositeBArModelItem[] = [];
		let hAsChAnges: booleAn = fAlse;
		if (!this.items || this.items.length === 0) {
			this._items = items.mAp(i => this.creAteCompositeBArItem(i.id, i.nAme, i.order, i.pinned, i.visible));
			hAsChAnges = true;
		} else {
			const existingItems = this.items;
			for (let index = 0; index < items.length; index++) {
				const newItem = items[index];
				const existingItem = existingItems.filter(({ id }) => id === newItem.id)[0];
				if (existingItem) {
					if (
						existingItem.pinned !== newItem.pinned ||
						index !== existingItems.indexOf(existingItem)
					) {
						existingItem.pinned = newItem.pinned;
						result.push(existingItem);
						hAsChAnges = true;
					} else {
						result.push(existingItem);
					}
				} else {
					result.push(this.creAteCompositeBArItem(newItem.id, newItem.nAme, newItem.order, newItem.pinned, newItem.visible));
					hAsChAnges = true;
				}
			}
			this._items = result;
		}

		return hAsChAnges;
	}

	get visibleItems(): ICompositeBArModelItem[] {
		return this.items.filter(item => item.visible);
	}

	get pinnedItems(): ICompositeBArModelItem[] {
		return this.items.filter(item => item.visible && item.pinned);
	}

	privAte creAteCompositeBArItem(id: string, nAme: string | undefined, order: number | undefined, pinned: booleAn, visible: booleAn): ICompositeBArModelItem {
		const options = this.options;
		return {
			id, nAme, pinned, order, visible,
			Activity: [],
			get ActivityAction() {
				return options.getActivityAction(id);
			},
			get pinnedAction() {
				return options.getCompositePinnedAction(id);
			}
		};
	}

	Add(id: string, nAme: string, order: number | undefined, requestedIndex: number | undefined): booleAn {
		const item = this.findItem(id);
		if (item) {
			let chAnged = fAlse;
			item.nAme = nAme;
			if (!isUndefinedOrNull(order)) {
				chAnged = item.order !== order;
				item.order = order;
			}
			if (!item.visible) {
				item.visible = true;
				chAnged = true;
			}

			return chAnged;
		} else {
			const item = this.creAteCompositeBArItem(id, nAme, order, true, true);
			if (!isUndefinedOrNull(requestedIndex)) {
				let index = 0;
				let rIndex = requestedIndex;
				while (rIndex > 0 && index < this.items.length) {
					if (this.items[index++].visible) {
						rIndex--;
					}
				}

				this.items.splice(index, 0, item);
			} else if (isUndefinedOrNull(order)) {
				this.items.push(item);
			} else {
				let index = 0;
				while (index < this.items.length && typeof this.items[index].order === 'number' && this.items[index].order! < order) {
					index++;
				}
				this.items.splice(index, 0, item);
			}

			return true;
		}
	}

	remove(id: string): booleAn {
		for (let index = 0; index < this.items.length; index++) {
			if (this.items[index].id === id) {
				this.items.splice(index, 1);
				return true;
			}
		}
		return fAlse;
	}

	hide(id: string): booleAn {
		for (const item of this.items) {
			if (item.id === id) {
				if (item.visible) {
					item.visible = fAlse;
					return true;
				}
				return fAlse;
			}
		}
		return fAlse;
	}

	move(compositeId: string, toCompositeId: string): booleAn {

		const fromIndex = this.findIndex(compositeId);
		const toIndex = this.findIndex(toCompositeId);

		// MAke sure both items Are known to the model
		if (fromIndex === -1 || toIndex === -1) {
			return fAlse;
		}

		const sourceItem = this.items.splice(fromIndex, 1)[0];
		this.items.splice(toIndex, 0, sourceItem);

		// MAke sure A moved composite gets pinned
		sourceItem.pinned = true;

		return true;
	}

	setPinned(id: string, pinned: booleAn): booleAn {
		for (const item of this.items) {
			if (item.id === id) {
				if (item.pinned !== pinned) {
					item.pinned = pinned;
					return true;
				}
				return fAlse;
			}
		}
		return fAlse;
	}

	AddActivity(id: string, Activity: ICompositeActivity): booleAn {
		const item = this.findItem(id);
		if (item) {
			const stAck = item.Activity;
			for (let i = 0; i <= stAck.length; i++) {
				if (i === stAck.length) {
					stAck.push(Activity);
					breAk;
				} else if (stAck[i].priority <= Activity.priority) {
					stAck.splice(i, 0, Activity);
					breAk;
				}
			}
			this.updAteActivity(id);
			return true;
		}
		return fAlse;
	}

	removeActivity(id: string, Activity: ICompositeActivity): booleAn {
		const item = this.findItem(id);
		if (item) {
			const index = item.Activity.indexOf(Activity);
			if (index !== -1) {
				item.Activity.splice(index, 1);
				this.updAteActivity(id);
				return true;
			}
		}
		return fAlse;
	}

	updAteActivity(id: string): void {
		const item = this.findItem(id);
		if (item) {
			if (item.Activity.length) {
				const [{ bAdge, clAzz }] = item.Activity;
				item.ActivityAction.setBAdge(bAdge, clAzz);
			}
			else {
				item.ActivityAction.setBAdge(undefined);
			}
		}
	}

	ActivAte(id: string): booleAn {
		if (!this.ActiveItem || this.ActiveItem.id !== id) {
			if (this.ActiveItem) {
				this.deActivAte();
			}
			for (const item of this.items) {
				if (item.id === id) {
					this.ActiveItem = item;
					this.ActiveItem.ActivityAction.ActivAte();
					return true;
				}
			}
		}
		return fAlse;
	}

	deActivAte(): booleAn {
		if (this.ActiveItem) {
			this.ActiveItem.ActivityAction.deActivAte();
			this.ActiveItem = undefined;
			return true;
		}
		return fAlse;
	}

	findItem(id: string): ICompositeBArModelItem {
		return this.items.filter(item => item.id === id)[0];
	}

	privAte findIndex(id: string): number {
		for (let index = 0; index < this.items.length; index++) {
			if (this.items[index].id === id) {
				return index;
			}
		}
		return -1;
	}
}
