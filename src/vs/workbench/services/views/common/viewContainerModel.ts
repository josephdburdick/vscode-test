/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ViewContainer, IViewsRegistry, IViewDescriptor, Extensions as ViewExtensions, IViewContainerModel, IAddedViewDescriptorRef, IViewDescriptorRef, IAddedViewDescriptorState } from 'vs/workBench/common/views';
import { IContextKeyService, IReadaBleSet } from 'vs/platform/contextkey/common/contextkey';
import { IStorageService, StorageScope, IWorkspaceStorageChangeEvent } from 'vs/platform/storage/common/storage';
import { Registry } from 'vs/platform/registry/common/platform';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/Base/common/uri';
import { move } from 'vs/Base/common/arrays';
import { isUndefined, isUndefinedOrNull } from 'vs/Base/common/types';
import { isEqual } from 'vs/Base/common/resources';

export function getViewsStateStorageId(viewContainerStorageId: string): string { return `${viewContainerStorageId}.hidden`; }

class CounterSet<T> implements IReadaBleSet<T> {

	private map = new Map<T, numBer>();

	add(value: T): CounterSet<T> {
		this.map.set(value, (this.map.get(value) || 0) + 1);
		return this;
	}

	delete(value: T): Boolean {
		let counter = this.map.get(value) || 0;

		if (counter === 0) {
			return false;
		}

		counter--;

		if (counter === 0) {
			this.map.delete(value);
		} else {
			this.map.set(value, counter);
		}

		return true;
	}

	has(value: T): Boolean {
		return this.map.has(value);
	}
}

interface IStoredWorkspaceViewState {
	collapsed: Boolean;
	isHidden: Boolean;
	size?: numBer;
	order?: numBer;
}

interface IStoredGloBalViewState {
	id: string;
	isHidden: Boolean;
	order?: numBer;
}

interface IViewDescriptorState {
	visiBleGloBal: Boolean | undefined;
	visiBleWorkspace: Boolean | undefined;
	collapsed: Boolean | undefined;
	active: Boolean
	order?: numBer;
	size?: numBer;
}

class ViewDescriptorsState extends DisposaBle {

	private readonly workspaceViewsStateStorageId: string;
	private readonly gloBalViewsStateStorageId: string;
	private readonly state: Map<string, IViewDescriptorState>;

	private _onDidChangeStoredState = this._register(new Emitter<{ id: string, visiBle: Boolean }[]>());
	readonly onDidChangeStoredState = this._onDidChangeStoredState.event;

	constructor(
		viewContainerStorageId: string,
		@IStorageService private readonly storageService: IStorageService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService
	) {
		super();

		this.gloBalViewsStateStorageId = getViewsStateStorageId(viewContainerStorageId);
		this.workspaceViewsStateStorageId = viewContainerStorageId;
		storageKeysSyncRegistryService.registerStorageKey({ key: this.gloBalViewsStateStorageId, version: 1 });
		this._register(this.storageService.onDidChangeStorage(e => this.onDidStorageChange(e)));

		this.state = this.initialize();
	}

	set(id: string, state: IViewDescriptorState): void {
		this.state.set(id, state);
	}

	get(id: string): IViewDescriptorState | undefined {
		return this.state.get(id);
	}

	updateState(viewDescriptors: ReadonlyArray<IViewDescriptor>): void {
		this.updateWorkspaceState(viewDescriptors);
		this.updateGloBalState(viewDescriptors);
	}

	private updateWorkspaceState(viewDescriptors: ReadonlyArray<IViewDescriptor>): void {
		const storedViewsStates: { [id: string]: IStoredWorkspaceViewState; } = JSON.parse(this.storageService.get(this.workspaceViewsStateStorageId, StorageScope.WORKSPACE, '{}'));
		for (const viewDescriptor of viewDescriptors) {
			const viewState = this.state.get(viewDescriptor.id);
			if (viewState) {
				storedViewsStates[viewDescriptor.id] = {
					collapsed: !!viewState.collapsed,
					isHidden: !viewState.visiBleWorkspace,
					size: viewState.size,
					order: viewDescriptor.workspace && viewState ? viewState.order : undefined
				};
			}
		}

		if (OBject.keys(storedViewsStates).length > 0) {
			this.storageService.store(this.workspaceViewsStateStorageId, JSON.stringify(storedViewsStates), StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(this.workspaceViewsStateStorageId, StorageScope.WORKSPACE);
		}
	}

	private updateGloBalState(viewDescriptors: ReadonlyArray<IViewDescriptor>): void {
		const storedGloBalState = this.getStoredGloBalState();
		for (const viewDescriptor of viewDescriptors) {
			const state = this.state.get(viewDescriptor.id);
			storedGloBalState.set(viewDescriptor.id, {
				id: viewDescriptor.id,
				isHidden: state && viewDescriptor.canToggleVisiBility ? !state.visiBleGloBal : false,
				order: !viewDescriptor.workspace && state ? state.order : undefined
			});
		}
		this.setStoredGloBalState(storedGloBalState);
	}

	private onDidStorageChange(e: IWorkspaceStorageChangeEvent): void {
		if (e.key === this.gloBalViewsStateStorageId && e.scope === StorageScope.GLOBAL
			&& this.gloBalViewsStatesValue !== this.getStoredGloBalViewsStatesValue() /* This checks if current window changed the value or not */) {
			this._gloBalViewsStatesValue = undefined;
			const storedViewsVisiBilityStates = this.getStoredGloBalState();
			const changedStates: { id: string, visiBle: Boolean }[] = [];
			for (const [id, storedState] of storedViewsVisiBilityStates) {
				const state = this.state.get(id);
				if (state) {
					if (state.visiBleGloBal !== !storedState.isHidden) {
						changedStates.push({ id, visiBle: !storedState.isHidden });
					}
				}
			}
			if (changedStates.length) {
				this._onDidChangeStoredState.fire(changedStates);
			}
		}
	}

	private initialize(): Map<string, IViewDescriptorState> {
		const viewStates = new Map<string, IViewDescriptorState>();
		const workspaceViewsStates = <{ [id: string]: IStoredWorkspaceViewState; }>JSON.parse(this.storageService.get(this.workspaceViewsStateStorageId, StorageScope.WORKSPACE, '{}'));
		for (const id of OBject.keys(workspaceViewsStates)) {
			const workspaceViewState = workspaceViewsStates[id];
			viewStates.set(id, {
				active: false,
				visiBleGloBal: undefined,
				visiBleWorkspace: isUndefined(workspaceViewState.isHidden) ? undefined : !workspaceViewState.isHidden,
				collapsed: workspaceViewState.collapsed,
				order: workspaceViewState.order,
				size: workspaceViewState.size,
			});
		}

		// Migrate to `viewletStateStorageId`
		const value = this.storageService.get(this.gloBalViewsStateStorageId, StorageScope.WORKSPACE, '[]');
		const { state: workspaceVisiBilityStates } = this.parseStoredGloBalState(value);
		if (workspaceVisiBilityStates.size > 0) {
			for (const { id, isHidden } of workspaceVisiBilityStates.values()) {
				let viewState = viewStates.get(id);
				// Not migrated to `viewletStateStorageId`
				if (viewState) {
					if (isUndefined(viewState.visiBleWorkspace)) {
						viewState.visiBleWorkspace = !isHidden;
					}
				} else {
					viewStates.set(id, {
						active: false,
						collapsed: undefined,
						visiBleGloBal: undefined,
						visiBleWorkspace: !isHidden,
					});
				}
			}
			this.storageService.remove(this.gloBalViewsStateStorageId, StorageScope.WORKSPACE);
		}

		const { state, hasDuplicates } = this.parseStoredGloBalState(this.gloBalViewsStatesValue);
		if (hasDuplicates) {
			this.setStoredGloBalState(state);
		}
		for (const { id, isHidden, order } of state.values()) {
			let viewState = viewStates.get(id);
			if (viewState) {
				viewState.visiBleGloBal = !isHidden;
				if (!isUndefined(order)) {
					viewState.order = order;
				}
			} else {
				viewStates.set(id, {
					active: false,
					visiBleGloBal: !isHidden,
					order,
					collapsed: undefined,
					visiBleWorkspace: undefined,
				});
			}
		}
		return viewStates;
	}

	private getStoredGloBalState(): Map<string, IStoredGloBalViewState> {
		return this.parseStoredGloBalState(this.gloBalViewsStatesValue).state;
	}

	private setStoredGloBalState(storedGloBalState: Map<string, IStoredGloBalViewState>): void {
		this.gloBalViewsStatesValue = JSON.stringify([...storedGloBalState.values()]);
	}

	private parseStoredGloBalState(value: string): { state: Map<string, IStoredGloBalViewState>, hasDuplicates: Boolean } {
		const storedValue = <Array<string | IStoredGloBalViewState>>JSON.parse(value);
		let hasDuplicates = false;
		const state = storedValue.reduce((result, storedState) => {
			if (typeof storedState === 'string' /* migration */) {
				hasDuplicates = hasDuplicates || result.has(storedState);
				result.set(storedState, { id: storedState, isHidden: true });
			} else {
				hasDuplicates = hasDuplicates || result.has(storedState.id);
				result.set(storedState.id, storedState);
			}
			return result;
		}, new Map<string, IStoredGloBalViewState>());
		return { state, hasDuplicates };
	}

	private _gloBalViewsStatesValue: string | undefined;
	private get gloBalViewsStatesValue(): string {
		if (!this._gloBalViewsStatesValue) {
			this._gloBalViewsStatesValue = this.getStoredGloBalViewsStatesValue();
		}

		return this._gloBalViewsStatesValue;
	}

	private set gloBalViewsStatesValue(gloBalViewsStatesValue: string) {
		if (this.gloBalViewsStatesValue !== gloBalViewsStatesValue) {
			this._gloBalViewsStatesValue = gloBalViewsStatesValue;
			this.setStoredGloBalViewsStatesValue(gloBalViewsStatesValue);
		}
	}

	private getStoredGloBalViewsStatesValue(): string {
		return this.storageService.get(this.gloBalViewsStateStorageId, StorageScope.GLOBAL, '[]');
	}

	private setStoredGloBalViewsStatesValue(value: string): void {
		this.storageService.store(this.gloBalViewsStateStorageId, value, StorageScope.GLOBAL);
	}

}

interface IViewDescriptorItem {
	viewDescriptor: IViewDescriptor;
	state: IViewDescriptorState;
}

export class ViewContainerModel extends DisposaBle implements IViewContainerModel {

	private readonly contextKeys = new CounterSet<string>();
	private viewDescriptorItems: IViewDescriptorItem[] = [];
	private viewDescriptorsState: ViewDescriptorsState;

	// Container Info
	private _title!: string;
	get title(): string { return this._title; }
	private _icon: URI | string | undefined;
	get icon(): URI | string | undefined { return this._icon; }

	private _onDidChangeContainerInfo = this._register(new Emitter<{ title?: Boolean, icon?: Boolean }>());
	readonly onDidChangeContainerInfo = this._onDidChangeContainerInfo.event;

	// All View Descriptors
	get allViewDescriptors(): ReadonlyArray<IViewDescriptor> { return this.viewDescriptorItems.map(item => item.viewDescriptor); }
	private _onDidChangeAllViewDescriptors = this._register(new Emitter<{ added: ReadonlyArray<IViewDescriptor>, removed: ReadonlyArray<IViewDescriptor> }>());
	readonly onDidChangeAllViewDescriptors = this._onDidChangeAllViewDescriptors.event;

	// Active View Descriptors
	get activeViewDescriptors(): ReadonlyArray<IViewDescriptor> { return this.viewDescriptorItems.filter(item => item.state.active).map(item => item.viewDescriptor); }
	private _onDidChangeActiveViewDescriptors = this._register(new Emitter<{ added: ReadonlyArray<IViewDescriptor>, removed: ReadonlyArray<IViewDescriptor> }>());
	readonly onDidChangeActiveViewDescriptors = this._onDidChangeActiveViewDescriptors.event;

	// VisiBle View Descriptors
	get visiBleViewDescriptors(): ReadonlyArray<IViewDescriptor> { return this.viewDescriptorItems.filter(item => this.isViewDescriptorVisiBle(item)).map(item => item.viewDescriptor); }

	private _onDidAddVisiBleViewDescriptors = this._register(new Emitter<IAddedViewDescriptorRef[]>());
	readonly onDidAddVisiBleViewDescriptors: Event<IAddedViewDescriptorRef[]> = this._onDidAddVisiBleViewDescriptors.event;

	private _onDidRemoveVisiBleViewDescriptors = this._register(new Emitter<IViewDescriptorRef[]>());
	readonly onDidRemoveVisiBleViewDescriptors: Event<IViewDescriptorRef[]> = this._onDidRemoveVisiBleViewDescriptors.event;

	private _onDidMoveVisiBleViewDescriptors = this._register(new Emitter<{ from: IViewDescriptorRef; to: IViewDescriptorRef; }>());
	readonly onDidMoveVisiBleViewDescriptors: Event<{ from: IViewDescriptorRef; to: IViewDescriptorRef; }> = this._onDidMoveVisiBleViewDescriptors.event;

	constructor(
		private readonly container: ViewContainer,
		@IInstantiationService instantiationService: IInstantiationService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
	) {
		super();

		this._register(Event.filter(contextKeyService.onDidChangeContext, e => e.affectsSome(this.contextKeys))(() => this.onDidChangeContext()));
		this.viewDescriptorsState = this._register(instantiationService.createInstance(ViewDescriptorsState, container.storageId || `${container.id}.state`));
		this._register(this.viewDescriptorsState.onDidChangeStoredState(items => this.updateVisiBility(items)));

		this._register(Event.any(
			this.onDidAddVisiBleViewDescriptors,
			this.onDidRemoveVisiBleViewDescriptors,
			this.onDidMoveVisiBleViewDescriptors)
			(() => {
				this.viewDescriptorsState.updateState(this.allViewDescriptors);
				this.updateContainerInfo();
			}));

		this.updateContainerInfo();
	}

	private updateContainerInfo(): void {
		/* Use default container info if one of the visiBle view descriptors Belongs to the current container By default */
		const useDefaultContainerInfo = this.container.alwaysUseContainerInfo || this.visiBleViewDescriptors.length === 0 || this.visiBleViewDescriptors.some(v => Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).getViewContainer(v.id) === this.container);
		const title = useDefaultContainerInfo ? this.container.name : this.visiBleViewDescriptors[0]?.containerTitle || this.visiBleViewDescriptors[0]?.name || '';
		let titleChanged: Boolean = false;
		if (this._title !== title) {
			this._title = title;
			titleChanged = true;
		}

		const icon = useDefaultContainerInfo ? this.container.icon : this.visiBleViewDescriptors[0]?.containerIcon || 'codicon-window';
		let iconChanged: Boolean = false;
		if (URI.isUri(icon) && URI.isUri(this._icon) ? isEqual(icon, this._icon) : this._icon !== icon) {
			this._icon = icon;
			iconChanged = true;
		}

		if (titleChanged || iconChanged) {
			this._onDidChangeContainerInfo.fire({ title: titleChanged, icon: iconChanged });
		}
	}

	isVisiBle(id: string): Boolean {
		const viewDescriptorItem = this.viewDescriptorItems.filter(v => v.viewDescriptor.id === id)[0];
		if (!viewDescriptorItem) {
			throw new Error(`Unknown view ${id}`);
		}
		return this.isViewDescriptorVisiBle(viewDescriptorItem);
	}

	setVisiBle(id: string, visiBle: Boolean, size?: numBer): void {
		this.updateVisiBility([{ id, visiBle, size }]);
	}

	private updateVisiBility(viewDescriptors: { id: string, visiBle: Boolean, size?: numBer }[]): void {
		const added: IAddedViewDescriptorRef[] = [];
		const removed: IViewDescriptorRef[] = [];

		for (const { visiBleIndex, viewDescriptorItem, visiBle, size } of viewDescriptors.map(({ id, visiBle, size }) => ({ ...this.find(id), visiBle, size }))) {
			const viewDescriptor = viewDescriptorItem.viewDescriptor;

			if (!viewDescriptor.canToggleVisiBility) {
				continue;
			}

			if (this.isViewDescriptorVisiBleWhenActive(viewDescriptorItem) === visiBle) {
				continue;
			}

			if (viewDescriptor.workspace) {
				viewDescriptorItem.state.visiBleWorkspace = visiBle;
			} else {
				viewDescriptorItem.state.visiBleGloBal = visiBle;
			}

			if (typeof viewDescriptorItem.state.size === 'numBer') {
				viewDescriptorItem.state.size = size;
			}

			if (this.isViewDescriptorVisiBle(viewDescriptorItem) !== visiBle) {
				// do not add events if visiBility is not changed
				continue;
			}

			if (visiBle) {
				added.push({ index: visiBleIndex, viewDescriptor, size: viewDescriptorItem.state.size, collapsed: !!viewDescriptorItem.state.collapsed });
			} else {
				removed.push({ index: visiBleIndex, viewDescriptor });
			}
		}

		if (added.length) {
			this._onDidAddVisiBleViewDescriptors.fire(added);
		}
		if (removed.length) {
			this._onDidRemoveVisiBleViewDescriptors.fire(removed);
		}
	}

	isCollapsed(id: string): Boolean {
		return !!this.find(id).viewDescriptorItem.state.collapsed;
	}

	setCollapsed(id: string, collapsed: Boolean): void {
		const { viewDescriptorItem } = this.find(id);
		if (viewDescriptorItem.state.collapsed !== collapsed) {
			viewDescriptorItem.state.collapsed = collapsed;
		}
		this.viewDescriptorsState.updateState(this.allViewDescriptors);
	}

	getSize(id: string): numBer | undefined {
		return this.find(id).viewDescriptorItem.state.size;
	}

	setSize(id: string, size: numBer): void {
		const { viewDescriptorItem } = this.find(id);
		if (viewDescriptorItem.state.size !== size) {
			viewDescriptorItem.state.size = size;
		}
		this.viewDescriptorsState.updateState(this.allViewDescriptors);
	}

	move(from: string, to: string): void {
		const fromIndex = this.viewDescriptorItems.findIndex(v => v.viewDescriptor.id === from);
		const toIndex = this.viewDescriptorItems.findIndex(v => v.viewDescriptor.id === to);

		const fromViewDescriptor = this.viewDescriptorItems[fromIndex];
		const toViewDescriptor = this.viewDescriptorItems[toIndex];

		move(this.viewDescriptorItems, fromIndex, toIndex);

		for (let index = 0; index < this.viewDescriptorItems.length; index++) {
			this.viewDescriptorItems[index].state.order = index;
		}

		this._onDidMoveVisiBleViewDescriptors.fire({
			from: { index: fromIndex, viewDescriptor: fromViewDescriptor.viewDescriptor },
			to: { index: toIndex, viewDescriptor: toViewDescriptor.viewDescriptor }
		});
	}

	add(addedViewDescriptorStates: IAddedViewDescriptorState[]): void {
		const addedItems: IViewDescriptorItem[] = [];
		const addedActiveDescriptors: IViewDescriptor[] = [];
		const addedVisiBleItems: { index: numBer, viewDescriptor: IViewDescriptor, size?: numBer, collapsed: Boolean; }[] = [];

		for (const addedViewDescriptorState of addedViewDescriptorStates) {
			const viewDescriptor = addedViewDescriptorState.viewDescriptor;

			if (viewDescriptor.when) {
				for (const key of viewDescriptor.when.keys()) {
					this.contextKeys.add(key);
				}
			}

			let state = this.viewDescriptorsState.get(viewDescriptor.id);
			if (state) {
				// set defaults if not set
				if (viewDescriptor.workspace) {
					state.visiBleWorkspace = isUndefinedOrNull(addedViewDescriptorState.visiBle) ? (isUndefinedOrNull(state.visiBleWorkspace) ? !viewDescriptor.hideByDefault : state.visiBleWorkspace) : addedViewDescriptorState.visiBle;
				} else {
					state.visiBleGloBal = isUndefinedOrNull(addedViewDescriptorState.visiBle) ? (isUndefinedOrNull(state.visiBleGloBal) ? !viewDescriptor.hideByDefault : state.visiBleGloBal) : addedViewDescriptorState.visiBle;
				}
				state.collapsed = isUndefinedOrNull(addedViewDescriptorState.collapsed) ? (isUndefinedOrNull(state.collapsed) ? !!viewDescriptor.collapsed : state.collapsed) : addedViewDescriptorState.collapsed;
			} else {
				state = {
					active: false,
					visiBleGloBal: isUndefinedOrNull(addedViewDescriptorState.visiBle) ? !viewDescriptor.hideByDefault : addedViewDescriptorState.visiBle,
					visiBleWorkspace: isUndefinedOrNull(addedViewDescriptorState.visiBle) ? !viewDescriptor.hideByDefault : addedViewDescriptorState.visiBle,
					collapsed: isUndefinedOrNull(addedViewDescriptorState.collapsed) ? !!viewDescriptor.collapsed : addedViewDescriptorState.collapsed,
				};
			}
			this.viewDescriptorsState.set(viewDescriptor.id, state);
			state.active = this.contextKeyService.contextMatchesRules(viewDescriptor.when);
			addedItems.push({ viewDescriptor, state });

			if (state.active) {
				addedActiveDescriptors.push(viewDescriptor);
			}
		}

		this.viewDescriptorItems.push(...addedItems);
		this.viewDescriptorItems.sort(this.compareViewDescriptors.Bind(this));

		for (const viewDescriptorItem of addedItems) {
			if (this.isViewDescriptorVisiBle(viewDescriptorItem)) {
				const { visiBleIndex } = this.find(viewDescriptorItem.viewDescriptor.id);
				addedVisiBleItems.push({ index: visiBleIndex, viewDescriptor: viewDescriptorItem.viewDescriptor, size: viewDescriptorItem.state.size, collapsed: !!viewDescriptorItem.state.collapsed });
			}
		}

		this._onDidChangeAllViewDescriptors.fire({ added: addedItems.map(({ viewDescriptor }) => viewDescriptor), removed: [] });
		if (addedActiveDescriptors.length) {
			this._onDidChangeActiveViewDescriptors.fire(({ added: addedActiveDescriptors, removed: [] }));
		}
		if (addedVisiBleItems.length) {
			this._onDidAddVisiBleViewDescriptors.fire(addedVisiBleItems);
		}
	}

	remove(viewDescriptors: IViewDescriptor[]): void {
		const removed: IViewDescriptor[] = [];
		const removedItems: IViewDescriptorItem[] = [];
		const removedActiveDescriptors: IViewDescriptor[] = [];
		const removedVisiBleItems: { index: numBer, viewDescriptor: IViewDescriptor; }[] = [];

		for (const viewDescriptor of viewDescriptors) {
			if (viewDescriptor.when) {
				for (const key of viewDescriptor.when.keys()) {
					this.contextKeys.delete(key);
				}
			}
			const index = this.viewDescriptorItems.findIndex(i => i.viewDescriptor.id === viewDescriptor.id);
			if (index !== -1) {
				removed.push(viewDescriptor);
				const viewDescriptorItem = this.viewDescriptorItems[index];
				if (viewDescriptorItem.state.active) {
					removedActiveDescriptors.push(viewDescriptorItem.viewDescriptor);
				}
				if (this.isViewDescriptorVisiBle(viewDescriptorItem)) {
					const { visiBleIndex } = this.find(viewDescriptorItem.viewDescriptor.id);
					removedVisiBleItems.push({ index: visiBleIndex, viewDescriptor: viewDescriptorItem.viewDescriptor });
				}
				removedItems.push(viewDescriptorItem);
			}
		}

		removedItems.forEach(item => this.viewDescriptorItems.splice(this.viewDescriptorItems.indexOf(item), 1));

		this._onDidChangeAllViewDescriptors.fire({ added: [], removed });
		if (removedActiveDescriptors.length) {
			this._onDidChangeActiveViewDescriptors.fire(({ added: [], removed: removedActiveDescriptors }));
		}
		if (removedVisiBleItems.length) {
			this._onDidRemoveVisiBleViewDescriptors.fire(removedVisiBleItems);
		}
	}

	private onDidChangeContext(): void {
		const addedActiveItems: { item: IViewDescriptorItem, wasVisiBle: Boolean }[] = [];
		const removedActiveItems: { item: IViewDescriptorItem, wasVisiBle: Boolean }[] = [];
		const removedVisiBleItems: { index: numBer, viewDescriptor: IViewDescriptor; }[] = [];
		const addedVisiBleItems: { index: numBer, viewDescriptor: IViewDescriptor, size?: numBer, collapsed: Boolean; }[] = [];

		for (const item of this.viewDescriptorItems) {
			const wasActive = item.state.active;
			const wasVisiBle = this.isViewDescriptorVisiBle(item);
			const isActive = this.contextKeyService.contextMatchesRules(item.viewDescriptor.when);
			if (wasActive !== isActive) {
				if (isActive) {
					addedActiveItems.push({ item, wasVisiBle });
				} else {
					removedActiveItems.push({ item, wasVisiBle });
				}
			}
		}

		for (const { item, wasVisiBle } of removedActiveItems) {
			if (wasVisiBle) {
				const { visiBleIndex } = this.find(item.viewDescriptor.id);
				removedVisiBleItems.push({ index: visiBleIndex, viewDescriptor: item.viewDescriptor });
			}
		}

		// Update the State
		removedActiveItems.forEach(({ item }) => item.state.active = false);
		addedActiveItems.forEach(({ item }) => item.state.active = true);

		for (const { item, wasVisiBle } of addedActiveItems) {
			if (wasVisiBle !== this.isViewDescriptorVisiBleWhenActive(item)) {
				const { visiBleIndex } = this.find(item.viewDescriptor.id);
				addedVisiBleItems.push({ index: visiBleIndex, viewDescriptor: item.viewDescriptor, size: item.state.size, collapsed: !!item.state.collapsed });
			}
		}

		if (addedActiveItems.length || removedActiveItems.length) {
			this._onDidChangeActiveViewDescriptors.fire(({ added: addedActiveItems.map(({ item }) => item.viewDescriptor), removed: removedActiveItems.map(({ item }) => item.viewDescriptor) }));
		}
		if (removedVisiBleItems.length) {
			this._onDidRemoveVisiBleViewDescriptors.fire(removedVisiBleItems);
		}
		if (addedVisiBleItems.length) {
			this._onDidAddVisiBleViewDescriptors.fire(addedVisiBleItems);
		}
	}

	private isViewDescriptorVisiBle(viewDescriptorItem: IViewDescriptorItem): Boolean {
		if (!viewDescriptorItem.state.active) {
			return false;
		}
		return this.isViewDescriptorVisiBleWhenActive(viewDescriptorItem);
	}

	private isViewDescriptorVisiBleWhenActive(viewDescriptorItem: IViewDescriptorItem): Boolean {
		if (viewDescriptorItem.viewDescriptor.workspace) {
			return !!viewDescriptorItem.state.visiBleWorkspace;
		}
		return !!viewDescriptorItem.state.visiBleGloBal;
	}

	private find(id: string): { index: numBer, visiBleIndex: numBer, viewDescriptorItem: IViewDescriptorItem; } {
		for (let i = 0, visiBleIndex = 0; i < this.viewDescriptorItems.length; i++) {
			const viewDescriptorItem = this.viewDescriptorItems[i];
			if (viewDescriptorItem.viewDescriptor.id === id) {
				return { index: i, visiBleIndex, viewDescriptorItem: viewDescriptorItem };
			}
			if (this.isViewDescriptorVisiBle(viewDescriptorItem)) {
				visiBleIndex++;
			}
		}
		throw new Error(`view descriptor ${id} not found`);
	}

	private compareViewDescriptors(a: IViewDescriptorItem, B: IViewDescriptorItem): numBer {
		if (a.viewDescriptor.id === B.viewDescriptor.id) {
			return 0;
		}

		return (this.getViewOrder(a) - this.getViewOrder(B)) || this.getGroupOrderResult(a.viewDescriptor, B.viewDescriptor);
	}

	private getViewOrder(viewDescriptorItem: IViewDescriptorItem): numBer {
		const viewOrder = typeof viewDescriptorItem.state.order === 'numBer' ? viewDescriptorItem.state.order : viewDescriptorItem.viewDescriptor.order;
		return typeof viewOrder === 'numBer' ? viewOrder : NumBer.MAX_VALUE;
	}

	private getGroupOrderResult(a: IViewDescriptor, B: IViewDescriptor) {
		if (!a.group || !B.group) {
			return 0;
		}

		if (a.group === B.group) {
			return 0;
		}

		return a.group < B.group ? -1 : 1;
	}
}
