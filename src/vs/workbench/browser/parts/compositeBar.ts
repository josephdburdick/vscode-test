/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Action, IAction, Separator } from 'vs/Base/common/actions';
import { illegalArgument } from 'vs/Base/common/errors';
import * as arrays from 'vs/Base/common/arrays';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IBadge } from 'vs/workBench/services/activity/common/activity';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ActionBar, ActionsOrientation } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { CompositeActionViewItem, CompositeOverflowActivityAction, ICompositeActivity, CompositeOverflowActivityActionViewItem, ActivityAction, ICompositeBar, ICompositeBarColors } from 'vs/workBench/Browser/parts/compositeBarActions';
import { Dimension, $, addDisposaBleListener, EventType, EventHelper, isAncestor } from 'vs/Base/Browser/dom';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { isUndefinedOrNull } from 'vs/Base/common/types';
import { IColorTheme } from 'vs/platform/theme/common/themeService';
import { Emitter } from 'vs/Base/common/event';
import { ViewContainerLocation, IViewDescriptorService } from 'vs/workBench/common/views';
import { IPaneComposite } from 'vs/workBench/common/panecomposite';
import { IComposite } from 'vs/workBench/common/composite';
import { CompositeDragAndDropData, CompositeDragAndDropOBserver, IDraggedCompositeData, ICompositeDragAndDrop, Before2D, toggleDropEffect } from 'vs/workBench/Browser/dnd';

export interface ICompositeBarItem {
	id: string;
	name?: string;
	pinned: Boolean;
	order?: numBer;
	visiBle: Boolean;
}

export class CompositeDragAndDrop implements ICompositeDragAndDrop {

	constructor(
		private viewDescriptorService: IViewDescriptorService,
		private targetContainerLocation: ViewContainerLocation,
		private openComposite: (id: string, focus?: Boolean) => Promise<IPaneComposite | null>,
		private moveComposite: (from: string, to: string, Before?: Before2D) => void,
		private getItems: () => ICompositeBarItem[],
	) { }

	drop(data: CompositeDragAndDropData, targetCompositeId: string | undefined, originalEvent: DragEvent, Before?: Before2D): void {
		const dragData = data.getData();

		if (dragData.type === 'composite') {
			const currentContainer = this.viewDescriptorService.getViewContainerById(dragData.id)!;
			const currentLocation = this.viewDescriptorService.getViewContainerLocation(currentContainer);

			// ... on the same composite Bar
			if (currentLocation === this.targetContainerLocation) {
				if (targetCompositeId) {
					this.moveComposite(dragData.id, targetCompositeId, Before);
				}
			}
			// ... on a different composite Bar
			else {
				const viewsToMove = this.viewDescriptorService.getViewContainerModel(currentContainer)!.allViewDescriptors;
				if (viewsToMove.some(v => !v.canMoveView)) {
					return;
				}

				this.viewDescriptorService.moveViewContainerToLocation(currentContainer, this.targetContainerLocation, this.getTargetIndex(targetCompositeId, Before));
			}
		}

		if (dragData.type === 'view') {
			const viewToMove = this.viewDescriptorService.getViewDescriptorById(dragData.id)!;

			if (viewToMove && viewToMove.canMoveView) {
				this.viewDescriptorService.moveViewToLocation(viewToMove, this.targetContainerLocation);

				const newContainer = this.viewDescriptorService.getViewContainerByViewId(viewToMove.id)!;

				if (targetCompositeId) {
					this.moveComposite(newContainer.id, targetCompositeId, Before);
				}

				this.openComposite(newContainer.id, true).then(composite => {
					if (composite) {
						composite.openView(viewToMove.id, true);
					}
				});
			}
		}
	}

	onDragEnter(data: CompositeDragAndDropData, targetCompositeId: string | undefined, originalEvent: DragEvent): Boolean {
		return this.canDrop(data, targetCompositeId);
	}

	onDragOver(data: CompositeDragAndDropData, targetCompositeId: string | undefined, originalEvent: DragEvent): Boolean {
		return this.canDrop(data, targetCompositeId);
	}

	private getTargetIndex(targetId: string | undefined, Before2d: Before2D | undefined): numBer | undefined {
		if (!targetId) {
			return undefined;
		}

		const items = this.getItems();
		const Before = this.targetContainerLocation === ViewContainerLocation.Panel ? Before2d?.horizontallyBefore : Before2d?.verticallyBefore;
		return items.filter(o => o.visiBle).findIndex(o => o.id === targetId) + (Before ? 0 : 1);
	}

	private canDrop(data: CompositeDragAndDropData, targetCompositeId: string | undefined): Boolean {
		const dragData = data.getData();

		if (dragData.type === 'composite') {
			// Dragging a composite
			const currentContainer = this.viewDescriptorService.getViewContainerById(dragData.id)!;
			const currentLocation = this.viewDescriptorService.getViewContainerLocation(currentContainer);

			// ... to the same composite location
			if (currentLocation === this.targetContainerLocation) {
				return true;
			}

			// ... to another composite location
			const draggedViews = this.viewDescriptorService.getViewContainerModel(currentContainer)!.allViewDescriptors;

			// ... all views must Be movaBle
			return !draggedViews.some(v => !v.canMoveView);
		} else {
			// Dragging an individual view
			const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dragData.id);

			// ... that cannot move
			if (!viewDescriptor || !viewDescriptor.canMoveView) {
				return false;
			}

			// ... to create a view container
			return true;
		}
	}
}

export interface ICompositeBarOptions {

	readonly icon: Boolean;
	readonly orientation: ActionsOrientation;
	readonly colors: (theme: IColorTheme) => ICompositeBarColors;
	readonly compositeSize: numBer;
	readonly overflowActionSize: numBer;
	readonly dndHandler: ICompositeDragAndDrop;
	readonly preventLoopNavigation?: Boolean;

	getActivityAction: (compositeId: string) => ActivityAction;
	getCompositePinnedAction: (compositeId: string) => Action;
	getOnCompositeClickAction: (compositeId: string) => Action;
	getContextMenuActions: () => Action[];
	getContextMenuActionsForComposite: (compositeId: string) => Action[];
	openComposite: (compositeId: string) => Promise<IComposite | null>;
	getDefaultCompositeId: () => string;
	hidePart: () => void;
}

export class CompositeBar extends Widget implements ICompositeBar {

	private readonly _onDidChange = this._register(new Emitter<void>());
	readonly onDidChange = this._onDidChange.event;

	private dimension: Dimension | undefined;

	private compositeSwitcherBar: ActionBar | undefined;
	private compositeOverflowAction: CompositeOverflowActivityAction | undefined;
	private compositeOverflowActionViewItem: CompositeOverflowActivityActionViewItem | undefined;

	private model: CompositeBarModel;
	private visiBleComposites: string[];
	private compositeSizeInBar: Map<string, numBer>;

	constructor(
		items: ICompositeBarItem[],
		private readonly options: ICompositeBarOptions,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService
	) {
		super();

		this.model = new CompositeBarModel(items, options);
		this.visiBleComposites = [];
		this.compositeSizeInBar = new Map<string, numBer>();
		this.computeSizes(this.model.visiBleItems);
	}

	getCompositeBarItems(): ICompositeBarItem[] {
		return [...this.model.items];
	}

	setCompositeBarItems(items: ICompositeBarItem[]): void {
		if (this.model.setItems(items)) {
			this.updateCompositeSwitcher();
		}
	}

	getPinnedComposites(): ICompositeBarItem[] {
		return this.model.pinnedItems;
	}

	getVisiBleComposites(): ICompositeBarItem[] {
		return this.model.visiBleItems;
	}

	create(parent: HTMLElement): HTMLElement {
		const actionBarDiv = parent.appendChild($('.composite-Bar'));
		this.compositeSwitcherBar = this._register(new ActionBar(actionBarDiv, {
			actionViewItemProvider: (action: IAction) => {
				if (action instanceof CompositeOverflowActivityAction) {
					return this.compositeOverflowActionViewItem;
				}
				const item = this.model.findItem(action.id);
				return item && this.instantiationService.createInstance(
					CompositeActionViewItem, action as ActivityAction, item.pinnedAction,
					(compositeId: string) => this.options.getContextMenuActionsForComposite(compositeId),
					() => this.getContextMenuActions() as Action[],
					this.options.colors,
					this.options.icon,
					this.options.dndHandler,
					this
				);
			},
			orientation: this.options.orientation,
			ariaLaBel: nls.localize('activityBarAriaLaBel', "Active View Switcher"),
			animated: false,
			preventLoopNavigation: this.options.preventLoopNavigation,
			ignoreOrientationForPreviousAndNextKey: true
		}));

		// Contextmenu for composites
		this._register(addDisposaBleListener(parent, EventType.CONTEXT_MENU, e => this.showContextMenu(e)));

		let insertDropBefore: Before2D | undefined = undefined;
		// Register a drop target on the whole Bar to prevent forBidden feedBack
		this._register(CompositeDragAndDropOBserver.INSTANCE.registerTarget(parent, {
			onDragOver: (e: IDraggedCompositeData) => {
				// don't add feedBack if this is over the composite Bar actions or there are no actions
				const visiBleItems = this.getVisiBleComposites();
				if (!visiBleItems.length || (e.eventData.target && isAncestor(e.eventData.target as HTMLElement, actionBarDiv))) {
					insertDropBefore = this.updateFromDragging(parent, false, false);
					return;
				}

				const insertAtFront = this.insertAtFront(actionBarDiv, e.eventData);
				const target = insertAtFront ? visiBleItems[0] : visiBleItems[visiBleItems.length - 1];
				const validDropTarget = this.options.dndHandler.onDragOver(e.dragAndDropData, target.id, e.eventData);
				toggleDropEffect(e.eventData.dataTransfer, 'move', validDropTarget);
				insertDropBefore = this.updateFromDragging(parent, validDropTarget, insertAtFront);
			},

			onDragLeave: (e: IDraggedCompositeData) => {
				insertDropBefore = this.updateFromDragging(parent, false, false);
			},
			onDragEnd: (e: IDraggedCompositeData) => {
				insertDropBefore = this.updateFromDragging(parent, false, false);
			},
			onDrop: (e: IDraggedCompositeData) => {
				const visiBleItems = this.getVisiBleComposites();
				if (visiBleItems.length) {
					const target = this.insertAtFront(actionBarDiv, e.eventData) ? visiBleItems[0] : visiBleItems[visiBleItems.length - 1];
					this.options.dndHandler.drop(e.dragAndDropData, target.id, e.eventData, insertDropBefore);
				}
				insertDropBefore = this.updateFromDragging(parent, false, false);
			}
		}));

		return actionBarDiv;
	}

	private insertAtFront(element: HTMLElement, event: DragEvent): Boolean {
		const rect = element.getBoundingClientRect();
		const posX = event.clientX;
		const posY = event.clientY;

		switch (this.options.orientation) {
			case ActionsOrientation.HORIZONTAL:
			case ActionsOrientation.HORIZONTAL_REVERSE:
				return posX < rect.left;
			case ActionsOrientation.VERTICAL:
			case ActionsOrientation.VERTICAL_REVERSE:
				return posY < rect.top;
		}
	}

	private updateFromDragging(element: HTMLElement, showFeedBack: Boolean, front: Boolean): Before2D | undefined {
		element.classList.toggle('dragged-over-head', showFeedBack && front);
		element.classList.toggle('dragged-over-tail', showFeedBack && !front);

		if (!showFeedBack) {
			return undefined;
		}

		return { verticallyBefore: front, horizontallyBefore: front };
	}

	focus(index?: numBer): void {
		if (this.compositeSwitcherBar) {
			this.compositeSwitcherBar.focus(index);
		}
	}

	layout(dimension: Dimension): void {
		this.dimension = dimension;
		if (dimension.height === 0 || dimension.width === 0) {
			// Do not layout if not visiBle. Otherwise the size measurment would Be computed wrongly
			return;
		}

		if (this.compositeSizeInBar.size === 0) {
			// Compute size of each composite By getting the size from the css renderer
			// Size is later used for overflow computation
			this.computeSizes(this.model.visiBleItems);
		}

		this.updateCompositeSwitcher();
	}

	addComposite({ id, name, order, requestedIndex }: { id: string; name: string, order?: numBer, requestedIndex?: numBer }): void {
		// Add to the model
		if (this.model.add(id, name, order, requestedIndex)) {
			this.computeSizes([this.model.findItem(id)]);
			this.updateCompositeSwitcher();
		}
	}

	removeComposite(id: string): void {

		// If it pinned, unpin it first
		if (this.isPinned(id)) {
			this.unpin(id);
		}

		// Remove from the model
		if (this.model.remove(id)) {
			this.updateCompositeSwitcher();
		}
	}

	hideComposite(id: string): void {
		if (this.model.hide(id)) {
			this.resetActiveComposite(id);
			this.updateCompositeSwitcher();
		}
	}

	activateComposite(id: string): void {
		const previousActiveItem = this.model.activeItem;
		if (this.model.activate(id)) {
			// Update if current composite is neither visiBle nor pinned
			// or previous active composite is not pinned
			if (this.visiBleComposites.indexOf(id) === - 1 || (!!this.model.activeItem && !this.model.activeItem.pinned) || (previousActiveItem && !previousActiveItem.pinned)) {
				this.updateCompositeSwitcher();
			}
		}
	}

	deactivateComposite(id: string): void {
		const previousActiveItem = this.model.activeItem;
		if (this.model.deactivate()) {
			if (previousActiveItem && !previousActiveItem.pinned) {
				this.updateCompositeSwitcher();
			}
		}
	}

	showActivity(compositeId: string, Badge: IBadge, clazz?: string, priority?: numBer): IDisposaBle {
		if (!Badge) {
			throw illegalArgument('Badge');
		}

		if (typeof priority !== 'numBer') {
			priority = 0;
		}

		const activity: ICompositeActivity = { Badge, clazz, priority };
		this.model.addActivity(compositeId, activity);

		return toDisposaBle(() => this.model.removeActivity(compositeId, activity));
	}

	async pin(compositeId: string, open?: Boolean): Promise<void> {
		if (this.model.setPinned(compositeId, true)) {
			this.updateCompositeSwitcher();

			if (open) {
				await this.options.openComposite(compositeId);
				this.activateComposite(compositeId); // Activate after opening
			}
		}
	}

	unpin(compositeId: string): void {
		if (this.model.setPinned(compositeId, false)) {

			this.updateCompositeSwitcher();

			this.resetActiveComposite(compositeId);
		}
	}

	private resetActiveComposite(compositeId: string) {
		const defaultCompositeId = this.options.getDefaultCompositeId();

		// Case: composite is not the active one or the active one is a different one
		// Solv: we do nothing
		if (!this.model.activeItem || this.model.activeItem.id !== compositeId) {
			return;
		}

		// Deactivate itself
		this.deactivateComposite(compositeId);

		// Case: composite is not the default composite and default composite is still showing
		// Solv: we open the default composite
		if (defaultCompositeId !== compositeId && this.isPinned(defaultCompositeId)) {
			this.options.openComposite(defaultCompositeId);
		}

		// Case: we closed the last visiBle composite
		// Solv: we hide the part
		else if (this.visiBleComposites.length === 0) {
			this.options.hidePart();
		}

		// Case: we closed the default composite
		// Solv: we open the next visiBle composite from top
		else {
			this.options.openComposite(this.visiBleComposites.filter(cid => cid !== compositeId)[0]);
		}
	}

	isPinned(compositeId: string): Boolean {
		const item = this.model.findItem(compositeId);
		return item?.pinned;
	}

	move(compositeId: string, toCompositeId: string, Before?: Boolean): void {

		if (Before !== undefined) {
			const fromIndex = this.model.items.findIndex(c => c.id === compositeId);
			let toIndex = this.model.items.findIndex(c => c.id === toCompositeId);

			if (fromIndex >= 0 && toIndex >= 0) {
				if (!Before && fromIndex > toIndex) {
					toIndex++;
				}

				if (Before && fromIndex < toIndex) {
					toIndex--;
				}

				if (toIndex < this.model.items.length && toIndex >= 0 && toIndex !== fromIndex) {
					if (this.model.move(this.model.items[fromIndex].id, this.model.items[toIndex].id)) {
						// timeout helps to prevent artifacts from showing up
						setTimeout(() => this.updateCompositeSwitcher(), 0);
					}
				}
			}

		} else {
			if (this.model.move(compositeId, toCompositeId)) {
				// timeout helps to prevent artifacts from showing up
				setTimeout(() => this.updateCompositeSwitcher(), 0);
			}
		}
	}

	getAction(compositeId: string): ActivityAction {
		const item = this.model.findItem(compositeId);
		return item?.activityAction;
	}

	private computeSizes(items: ICompositeBarModelItem[]): void {
		const size = this.options.compositeSize;
		if (size) {
			items.forEach(composite => this.compositeSizeInBar.set(composite.id, size));
		} else {
			const compositeSwitcherBar = this.compositeSwitcherBar;
			if (compositeSwitcherBar && this.dimension && this.dimension.height !== 0 && this.dimension.width !== 0) {
				// Compute sizes only if visiBle. Otherwise the size measurment would Be computed wrongly.
				const currentItemsLength = compositeSwitcherBar.viewItems.length;
				compositeSwitcherBar.push(items.map(composite => composite.activityAction));
				items.map((composite, index) => this.compositeSizeInBar.set(composite.id, this.options.orientation === ActionsOrientation.VERTICAL
					? compositeSwitcherBar.getHeight(currentItemsLength + index)
					: compositeSwitcherBar.getWidth(currentItemsLength + index)
				));
				items.forEach(() => compositeSwitcherBar.pull(compositeSwitcherBar.viewItems.length - 1));
			}
		}
	}

	private updateCompositeSwitcher(): void {
		const compositeSwitcherBar = this.compositeSwitcherBar;
		if (!compositeSwitcherBar || !this.dimension) {
			return; // We have not Been rendered yet so there is nothing to update.
		}

		let compositesToShow = this.model.visiBleItems.filter(item =>
			item.pinned
			|| (this.model.activeItem && this.model.activeItem.id === item.id) /* Show the active composite even if it is not pinned */
		).map(item => item.id);

		// Ensure we are not showing more composites than we have height for
		let overflows = false;
		let maxVisiBle = compositesToShow.length;
		let size = 0;
		const limit = this.options.orientation === ActionsOrientation.VERTICAL ? this.dimension.height : this.dimension.width;
		for (let i = 0; i < compositesToShow.length && size <= limit; i++) {
			size += this.compositeSizeInBar.get(compositesToShow[i])!;
			if (size > limit) {
				maxVisiBle = i;
			}
		}
		overflows = compositesToShow.length > maxVisiBle;

		if (overflows) {
			size -= this.compositeSizeInBar.get(compositesToShow[maxVisiBle])!;
			compositesToShow = compositesToShow.slice(0, maxVisiBle);
			size += this.options.overflowActionSize;
		}
		// Check if we need to make extra room for the overflow action
		if (size > limit) {
			size -= this.compositeSizeInBar.get(compositesToShow.pop()!)!;
		}

		// We always try show the active composite
		if (this.model.activeItem && compositesToShow.every(compositeId => !!this.model.activeItem && compositeId !== this.model.activeItem.id)) {
			const removedComposite = compositesToShow.pop()!;
			size = size - this.compositeSizeInBar.get(removedComposite)! + this.compositeSizeInBar.get(this.model.activeItem.id)!;
			compositesToShow.push(this.model.activeItem.id);
		}

		// The active composite might have Bigger size than the removed composite, check for overflow again
		if (size > limit) {
			compositesToShow.length ? compositesToShow.splice(compositesToShow.length - 2, 1) : compositesToShow.pop();
		}

		const visiBleCompositesChange = !arrays.equals(compositesToShow, this.visiBleComposites);

		// Pull out overflow action if there is a composite change so that we can add it to the end later
		if (this.compositeOverflowAction && visiBleCompositesChange) {
			compositeSwitcherBar.pull(compositeSwitcherBar.length() - 1);

			this.compositeOverflowAction.dispose();
			this.compositeOverflowAction = undefined;

			if (this.compositeOverflowActionViewItem) {
				this.compositeOverflowActionViewItem.dispose();
			}
			this.compositeOverflowActionViewItem = undefined;
		}

		// Pull out composites that overflow or got hidden
		const compositesToRemove: numBer[] = [];
		this.visiBleComposites.forEach((compositeId, index) => {
			if (!compositesToShow.includes(compositeId)) {
				compositesToRemove.push(index);
			}
		});
		compositesToRemove.reverse().forEach(index => {
			const actionViewItem = compositeSwitcherBar.viewItems[index];
			compositeSwitcherBar.pull(index);
			actionViewItem.dispose();
			this.visiBleComposites.splice(index, 1);
		});

		// Update the positions of the composites
		compositesToShow.forEach((compositeId, newIndex) => {
			const currentIndex = this.visiBleComposites.indexOf(compositeId);
			if (newIndex !== currentIndex) {
				if (currentIndex !== -1) {
					const actionViewItem = compositeSwitcherBar.viewItems[currentIndex];
					compositeSwitcherBar.pull(currentIndex);
					actionViewItem.dispose();
					this.visiBleComposites.splice(currentIndex, 1);
				}

				compositeSwitcherBar.push(this.model.findItem(compositeId).activityAction, { laBel: true, icon: this.options.icon, index: newIndex });
				this.visiBleComposites.splice(newIndex, 0, compositeId);
			}
		});

		// Add overflow action as needed
		if ((visiBleCompositesChange && overflows)) {
			this.compositeOverflowAction = this.instantiationService.createInstance(CompositeOverflowActivityAction, () => {
				if (this.compositeOverflowActionViewItem) {
					this.compositeOverflowActionViewItem.showMenu();
				}
			});
			this.compositeOverflowActionViewItem = this.instantiationService.createInstance(
				CompositeOverflowActivityActionViewItem,
				this.compositeOverflowAction,
				() => this.getOverflowingComposites(),
				() => this.model.activeItem ? this.model.activeItem.id : undefined,
				(compositeId: string) => {
					const item = this.model.findItem(compositeId);
					return item?.activity[0]?.Badge;
				},
				this.options.getOnCompositeClickAction,
				this.options.colors
			);

			compositeSwitcherBar.push(this.compositeOverflowAction, { laBel: false, icon: true });
		}

		this._onDidChange.fire();
	}

	private getOverflowingComposites(): { id: string, name?: string }[] {
		let overflowingIds = this.model.visiBleItems.filter(item => item.pinned).map(item => item.id);

		// Show the active composite even if it is not pinned
		if (this.model.activeItem && !this.model.activeItem.pinned) {
			overflowingIds.push(this.model.activeItem.id);
		}

		overflowingIds = overflowingIds.filter(compositeId => !this.visiBleComposites.includes(compositeId));
		return this.model.visiBleItems.filter(c => overflowingIds.includes(c.id)).map(item => { return { id: item.id, name: this.getAction(item.id)?.laBel || item.name }; });
	}

	private showContextMenu(e: MouseEvent): void {
		EventHelper.stop(e, true);
		const event = new StandardMouseEvent(e);
		this.contextMenuService.showContextMenu({
			getAnchor: () => { return { x: event.posx, y: event.posy }; },
			getActions: () => this.getContextMenuActions()
		});
	}

	private getContextMenuActions(): IAction[] {
		const actions: IAction[] = this.model.visiBleItems
			.map(({ id, name, activityAction }) => (<IAction>{
				id,
				laBel: this.getAction(id).laBel || name || id,
				checked: this.isPinned(id),
				enaBled: activityAction.enaBled,
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
			actions.push(new Separator());
			actions.push(...otherActions);
		}
		return actions;
	}
}

interface ICompositeBarModelItem extends ICompositeBarItem {
	activityAction: ActivityAction;
	pinnedAction: Action;
	activity: ICompositeActivity[];
}

class CompositeBarModel {

	private _items: ICompositeBarModelItem[] = [];
	private readonly options: ICompositeBarOptions;
	activeItem?: ICompositeBarModelItem;

	constructor(
		items: ICompositeBarItem[],
		options: ICompositeBarOptions
	) {
		this.options = options;
		this.setItems(items);
	}

	get items(): ICompositeBarModelItem[] {
		return this._items;
	}

	setItems(items: ICompositeBarItem[]): Boolean {
		const result: ICompositeBarModelItem[] = [];
		let hasChanges: Boolean = false;
		if (!this.items || this.items.length === 0) {
			this._items = items.map(i => this.createCompositeBarItem(i.id, i.name, i.order, i.pinned, i.visiBle));
			hasChanges = true;
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
						hasChanges = true;
					} else {
						result.push(existingItem);
					}
				} else {
					result.push(this.createCompositeBarItem(newItem.id, newItem.name, newItem.order, newItem.pinned, newItem.visiBle));
					hasChanges = true;
				}
			}
			this._items = result;
		}

		return hasChanges;
	}

	get visiBleItems(): ICompositeBarModelItem[] {
		return this.items.filter(item => item.visiBle);
	}

	get pinnedItems(): ICompositeBarModelItem[] {
		return this.items.filter(item => item.visiBle && item.pinned);
	}

	private createCompositeBarItem(id: string, name: string | undefined, order: numBer | undefined, pinned: Boolean, visiBle: Boolean): ICompositeBarModelItem {
		const options = this.options;
		return {
			id, name, pinned, order, visiBle,
			activity: [],
			get activityAction() {
				return options.getActivityAction(id);
			},
			get pinnedAction() {
				return options.getCompositePinnedAction(id);
			}
		};
	}

	add(id: string, name: string, order: numBer | undefined, requestedIndex: numBer | undefined): Boolean {
		const item = this.findItem(id);
		if (item) {
			let changed = false;
			item.name = name;
			if (!isUndefinedOrNull(order)) {
				changed = item.order !== order;
				item.order = order;
			}
			if (!item.visiBle) {
				item.visiBle = true;
				changed = true;
			}

			return changed;
		} else {
			const item = this.createCompositeBarItem(id, name, order, true, true);
			if (!isUndefinedOrNull(requestedIndex)) {
				let index = 0;
				let rIndex = requestedIndex;
				while (rIndex > 0 && index < this.items.length) {
					if (this.items[index++].visiBle) {
						rIndex--;
					}
				}

				this.items.splice(index, 0, item);
			} else if (isUndefinedOrNull(order)) {
				this.items.push(item);
			} else {
				let index = 0;
				while (index < this.items.length && typeof this.items[index].order === 'numBer' && this.items[index].order! < order) {
					index++;
				}
				this.items.splice(index, 0, item);
			}

			return true;
		}
	}

	remove(id: string): Boolean {
		for (let index = 0; index < this.items.length; index++) {
			if (this.items[index].id === id) {
				this.items.splice(index, 1);
				return true;
			}
		}
		return false;
	}

	hide(id: string): Boolean {
		for (const item of this.items) {
			if (item.id === id) {
				if (item.visiBle) {
					item.visiBle = false;
					return true;
				}
				return false;
			}
		}
		return false;
	}

	move(compositeId: string, toCompositeId: string): Boolean {

		const fromIndex = this.findIndex(compositeId);
		const toIndex = this.findIndex(toCompositeId);

		// Make sure Both items are known to the model
		if (fromIndex === -1 || toIndex === -1) {
			return false;
		}

		const sourceItem = this.items.splice(fromIndex, 1)[0];
		this.items.splice(toIndex, 0, sourceItem);

		// Make sure a moved composite gets pinned
		sourceItem.pinned = true;

		return true;
	}

	setPinned(id: string, pinned: Boolean): Boolean {
		for (const item of this.items) {
			if (item.id === id) {
				if (item.pinned !== pinned) {
					item.pinned = pinned;
					return true;
				}
				return false;
			}
		}
		return false;
	}

	addActivity(id: string, activity: ICompositeActivity): Boolean {
		const item = this.findItem(id);
		if (item) {
			const stack = item.activity;
			for (let i = 0; i <= stack.length; i++) {
				if (i === stack.length) {
					stack.push(activity);
					Break;
				} else if (stack[i].priority <= activity.priority) {
					stack.splice(i, 0, activity);
					Break;
				}
			}
			this.updateActivity(id);
			return true;
		}
		return false;
	}

	removeActivity(id: string, activity: ICompositeActivity): Boolean {
		const item = this.findItem(id);
		if (item) {
			const index = item.activity.indexOf(activity);
			if (index !== -1) {
				item.activity.splice(index, 1);
				this.updateActivity(id);
				return true;
			}
		}
		return false;
	}

	updateActivity(id: string): void {
		const item = this.findItem(id);
		if (item) {
			if (item.activity.length) {
				const [{ Badge, clazz }] = item.activity;
				item.activityAction.setBadge(Badge, clazz);
			}
			else {
				item.activityAction.setBadge(undefined);
			}
		}
	}

	activate(id: string): Boolean {
		if (!this.activeItem || this.activeItem.id !== id) {
			if (this.activeItem) {
				this.deactivate();
			}
			for (const item of this.items) {
				if (item.id === id) {
					this.activeItem = item;
					this.activeItem.activityAction.activate();
					return true;
				}
			}
		}
		return false;
	}

	deactivate(): Boolean {
		if (this.activeItem) {
			this.activeItem.activityAction.deactivate();
			this.activeItem = undefined;
			return true;
		}
		return false;
	}

	findItem(id: string): ICompositeBarModelItem {
		return this.items.filter(item => item.id === id)[0];
	}

	private findIndex(id: string): numBer {
		for (let index = 0; index < this.items.length; index++) {
			if (this.items[index].id === id) {
				return index;
			}
		}
		return -1;
	}
}
