/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ViewContAiner, IViewsRegistry, IViewDescriptor, Extensions As ViewExtensions, IViewContAinerModel, IAddedViewDescriptorRef, IViewDescriptorRef, IAddedViewDescriptorStAte } from 'vs/workbench/common/views';
import { IContextKeyService, IReAdAbleSet } from 'vs/plAtform/contextkey/common/contextkey';
import { IStorAgeService, StorAgeScope, IWorkspAceStorAgeChAngeEvent } from 'vs/plAtform/storAge/common/storAge';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';
import { move } from 'vs/bAse/common/ArrAys';
import { isUndefined, isUndefinedOrNull } from 'vs/bAse/common/types';
import { isEquAl } from 'vs/bAse/common/resources';

export function getViewsStAteStorAgeId(viewContAinerStorAgeId: string): string { return `${viewContAinerStorAgeId}.hidden`; }

clAss CounterSet<T> implements IReAdAbleSet<T> {

	privAte mAp = new MAp<T, number>();

	Add(vAlue: T): CounterSet<T> {
		this.mAp.set(vAlue, (this.mAp.get(vAlue) || 0) + 1);
		return this;
	}

	delete(vAlue: T): booleAn {
		let counter = this.mAp.get(vAlue) || 0;

		if (counter === 0) {
			return fAlse;
		}

		counter--;

		if (counter === 0) {
			this.mAp.delete(vAlue);
		} else {
			this.mAp.set(vAlue, counter);
		}

		return true;
	}

	hAs(vAlue: T): booleAn {
		return this.mAp.hAs(vAlue);
	}
}

interfAce IStoredWorkspAceViewStAte {
	collApsed: booleAn;
	isHidden: booleAn;
	size?: number;
	order?: number;
}

interfAce IStoredGlobAlViewStAte {
	id: string;
	isHidden: booleAn;
	order?: number;
}

interfAce IViewDescriptorStAte {
	visibleGlobAl: booleAn | undefined;
	visibleWorkspAce: booleAn | undefined;
	collApsed: booleAn | undefined;
	Active: booleAn
	order?: number;
	size?: number;
}

clAss ViewDescriptorsStAte extends DisposAble {

	privAte reAdonly workspAceViewsStAteStorAgeId: string;
	privAte reAdonly globAlViewsStAteStorAgeId: string;
	privAte reAdonly stAte: MAp<string, IViewDescriptorStAte>;

	privAte _onDidChAngeStoredStAte = this._register(new Emitter<{ id: string, visible: booleAn }[]>());
	reAdonly onDidChAngeStoredStAte = this._onDidChAngeStoredStAte.event;

	constructor(
		viewContAinerStorAgeId: string,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService
	) {
		super();

		this.globAlViewsStAteStorAgeId = getViewsStAteStorAgeId(viewContAinerStorAgeId);
		this.workspAceViewsStAteStorAgeId = viewContAinerStorAgeId;
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: this.globAlViewsStAteStorAgeId, version: 1 });
		this._register(this.storAgeService.onDidChAngeStorAge(e => this.onDidStorAgeChAnge(e)));

		this.stAte = this.initiAlize();
	}

	set(id: string, stAte: IViewDescriptorStAte): void {
		this.stAte.set(id, stAte);
	}

	get(id: string): IViewDescriptorStAte | undefined {
		return this.stAte.get(id);
	}

	updAteStAte(viewDescriptors: ReAdonlyArrAy<IViewDescriptor>): void {
		this.updAteWorkspAceStAte(viewDescriptors);
		this.updAteGlobAlStAte(viewDescriptors);
	}

	privAte updAteWorkspAceStAte(viewDescriptors: ReAdonlyArrAy<IViewDescriptor>): void {
		const storedViewsStAtes: { [id: string]: IStoredWorkspAceViewStAte; } = JSON.pArse(this.storAgeService.get(this.workspAceViewsStAteStorAgeId, StorAgeScope.WORKSPACE, '{}'));
		for (const viewDescriptor of viewDescriptors) {
			const viewStAte = this.stAte.get(viewDescriptor.id);
			if (viewStAte) {
				storedViewsStAtes[viewDescriptor.id] = {
					collApsed: !!viewStAte.collApsed,
					isHidden: !viewStAte.visibleWorkspAce,
					size: viewStAte.size,
					order: viewDescriptor.workspAce && viewStAte ? viewStAte.order : undefined
				};
			}
		}

		if (Object.keys(storedViewsStAtes).length > 0) {
			this.storAgeService.store(this.workspAceViewsStAteStorAgeId, JSON.stringify(storedViewsStAtes), StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(this.workspAceViewsStAteStorAgeId, StorAgeScope.WORKSPACE);
		}
	}

	privAte updAteGlobAlStAte(viewDescriptors: ReAdonlyArrAy<IViewDescriptor>): void {
		const storedGlobAlStAte = this.getStoredGlobAlStAte();
		for (const viewDescriptor of viewDescriptors) {
			const stAte = this.stAte.get(viewDescriptor.id);
			storedGlobAlStAte.set(viewDescriptor.id, {
				id: viewDescriptor.id,
				isHidden: stAte && viewDescriptor.cAnToggleVisibility ? !stAte.visibleGlobAl : fAlse,
				order: !viewDescriptor.workspAce && stAte ? stAte.order : undefined
			});
		}
		this.setStoredGlobAlStAte(storedGlobAlStAte);
	}

	privAte onDidStorAgeChAnge(e: IWorkspAceStorAgeChAngeEvent): void {
		if (e.key === this.globAlViewsStAteStorAgeId && e.scope === StorAgeScope.GLOBAL
			&& this.globAlViewsStAtesVAlue !== this.getStoredGlobAlViewsStAtesVAlue() /* This checks if current window chAnged the vAlue or not */) {
			this._globAlViewsStAtesVAlue = undefined;
			const storedViewsVisibilityStAtes = this.getStoredGlobAlStAte();
			const chAngedStAtes: { id: string, visible: booleAn }[] = [];
			for (const [id, storedStAte] of storedViewsVisibilityStAtes) {
				const stAte = this.stAte.get(id);
				if (stAte) {
					if (stAte.visibleGlobAl !== !storedStAte.isHidden) {
						chAngedStAtes.push({ id, visible: !storedStAte.isHidden });
					}
				}
			}
			if (chAngedStAtes.length) {
				this._onDidChAngeStoredStAte.fire(chAngedStAtes);
			}
		}
	}

	privAte initiAlize(): MAp<string, IViewDescriptorStAte> {
		const viewStAtes = new MAp<string, IViewDescriptorStAte>();
		const workspAceViewsStAtes = <{ [id: string]: IStoredWorkspAceViewStAte; }>JSON.pArse(this.storAgeService.get(this.workspAceViewsStAteStorAgeId, StorAgeScope.WORKSPACE, '{}'));
		for (const id of Object.keys(workspAceViewsStAtes)) {
			const workspAceViewStAte = workspAceViewsStAtes[id];
			viewStAtes.set(id, {
				Active: fAlse,
				visibleGlobAl: undefined,
				visibleWorkspAce: isUndefined(workspAceViewStAte.isHidden) ? undefined : !workspAceViewStAte.isHidden,
				collApsed: workspAceViewStAte.collApsed,
				order: workspAceViewStAte.order,
				size: workspAceViewStAte.size,
			});
		}

		// MigrAte to `viewletStAteStorAgeId`
		const vAlue = this.storAgeService.get(this.globAlViewsStAteStorAgeId, StorAgeScope.WORKSPACE, '[]');
		const { stAte: workspAceVisibilityStAtes } = this.pArseStoredGlobAlStAte(vAlue);
		if (workspAceVisibilityStAtes.size > 0) {
			for (const { id, isHidden } of workspAceVisibilityStAtes.vAlues()) {
				let viewStAte = viewStAtes.get(id);
				// Not migrAted to `viewletStAteStorAgeId`
				if (viewStAte) {
					if (isUndefined(viewStAte.visibleWorkspAce)) {
						viewStAte.visibleWorkspAce = !isHidden;
					}
				} else {
					viewStAtes.set(id, {
						Active: fAlse,
						collApsed: undefined,
						visibleGlobAl: undefined,
						visibleWorkspAce: !isHidden,
					});
				}
			}
			this.storAgeService.remove(this.globAlViewsStAteStorAgeId, StorAgeScope.WORKSPACE);
		}

		const { stAte, hAsDuplicAtes } = this.pArseStoredGlobAlStAte(this.globAlViewsStAtesVAlue);
		if (hAsDuplicAtes) {
			this.setStoredGlobAlStAte(stAte);
		}
		for (const { id, isHidden, order } of stAte.vAlues()) {
			let viewStAte = viewStAtes.get(id);
			if (viewStAte) {
				viewStAte.visibleGlobAl = !isHidden;
				if (!isUndefined(order)) {
					viewStAte.order = order;
				}
			} else {
				viewStAtes.set(id, {
					Active: fAlse,
					visibleGlobAl: !isHidden,
					order,
					collApsed: undefined,
					visibleWorkspAce: undefined,
				});
			}
		}
		return viewStAtes;
	}

	privAte getStoredGlobAlStAte(): MAp<string, IStoredGlobAlViewStAte> {
		return this.pArseStoredGlobAlStAte(this.globAlViewsStAtesVAlue).stAte;
	}

	privAte setStoredGlobAlStAte(storedGlobAlStAte: MAp<string, IStoredGlobAlViewStAte>): void {
		this.globAlViewsStAtesVAlue = JSON.stringify([...storedGlobAlStAte.vAlues()]);
	}

	privAte pArseStoredGlobAlStAte(vAlue: string): { stAte: MAp<string, IStoredGlobAlViewStAte>, hAsDuplicAtes: booleAn } {
		const storedVAlue = <ArrAy<string | IStoredGlobAlViewStAte>>JSON.pArse(vAlue);
		let hAsDuplicAtes = fAlse;
		const stAte = storedVAlue.reduce((result, storedStAte) => {
			if (typeof storedStAte === 'string' /* migrAtion */) {
				hAsDuplicAtes = hAsDuplicAtes || result.hAs(storedStAte);
				result.set(storedStAte, { id: storedStAte, isHidden: true });
			} else {
				hAsDuplicAtes = hAsDuplicAtes || result.hAs(storedStAte.id);
				result.set(storedStAte.id, storedStAte);
			}
			return result;
		}, new MAp<string, IStoredGlobAlViewStAte>());
		return { stAte, hAsDuplicAtes };
	}

	privAte _globAlViewsStAtesVAlue: string | undefined;
	privAte get globAlViewsStAtesVAlue(): string {
		if (!this._globAlViewsStAtesVAlue) {
			this._globAlViewsStAtesVAlue = this.getStoredGlobAlViewsStAtesVAlue();
		}

		return this._globAlViewsStAtesVAlue;
	}

	privAte set globAlViewsStAtesVAlue(globAlViewsStAtesVAlue: string) {
		if (this.globAlViewsStAtesVAlue !== globAlViewsStAtesVAlue) {
			this._globAlViewsStAtesVAlue = globAlViewsStAtesVAlue;
			this.setStoredGlobAlViewsStAtesVAlue(globAlViewsStAtesVAlue);
		}
	}

	privAte getStoredGlobAlViewsStAtesVAlue(): string {
		return this.storAgeService.get(this.globAlViewsStAteStorAgeId, StorAgeScope.GLOBAL, '[]');
	}

	privAte setStoredGlobAlViewsStAtesVAlue(vAlue: string): void {
		this.storAgeService.store(this.globAlViewsStAteStorAgeId, vAlue, StorAgeScope.GLOBAL);
	}

}

interfAce IViewDescriptorItem {
	viewDescriptor: IViewDescriptor;
	stAte: IViewDescriptorStAte;
}

export clAss ViewContAinerModel extends DisposAble implements IViewContAinerModel {

	privAte reAdonly contextKeys = new CounterSet<string>();
	privAte viewDescriptorItems: IViewDescriptorItem[] = [];
	privAte viewDescriptorsStAte: ViewDescriptorsStAte;

	// ContAiner Info
	privAte _title!: string;
	get title(): string { return this._title; }
	privAte _icon: URI | string | undefined;
	get icon(): URI | string | undefined { return this._icon; }

	privAte _onDidChAngeContAinerInfo = this._register(new Emitter<{ title?: booleAn, icon?: booleAn }>());
	reAdonly onDidChAngeContAinerInfo = this._onDidChAngeContAinerInfo.event;

	// All View Descriptors
	get AllViewDescriptors(): ReAdonlyArrAy<IViewDescriptor> { return this.viewDescriptorItems.mAp(item => item.viewDescriptor); }
	privAte _onDidChAngeAllViewDescriptors = this._register(new Emitter<{ Added: ReAdonlyArrAy<IViewDescriptor>, removed: ReAdonlyArrAy<IViewDescriptor> }>());
	reAdonly onDidChAngeAllViewDescriptors = this._onDidChAngeAllViewDescriptors.event;

	// Active View Descriptors
	get ActiveViewDescriptors(): ReAdonlyArrAy<IViewDescriptor> { return this.viewDescriptorItems.filter(item => item.stAte.Active).mAp(item => item.viewDescriptor); }
	privAte _onDidChAngeActiveViewDescriptors = this._register(new Emitter<{ Added: ReAdonlyArrAy<IViewDescriptor>, removed: ReAdonlyArrAy<IViewDescriptor> }>());
	reAdonly onDidChAngeActiveViewDescriptors = this._onDidChAngeActiveViewDescriptors.event;

	// Visible View Descriptors
	get visibleViewDescriptors(): ReAdonlyArrAy<IViewDescriptor> { return this.viewDescriptorItems.filter(item => this.isViewDescriptorVisible(item)).mAp(item => item.viewDescriptor); }

	privAte _onDidAddVisibleViewDescriptors = this._register(new Emitter<IAddedViewDescriptorRef[]>());
	reAdonly onDidAddVisibleViewDescriptors: Event<IAddedViewDescriptorRef[]> = this._onDidAddVisibleViewDescriptors.event;

	privAte _onDidRemoveVisibleViewDescriptors = this._register(new Emitter<IViewDescriptorRef[]>());
	reAdonly onDidRemoveVisibleViewDescriptors: Event<IViewDescriptorRef[]> = this._onDidRemoveVisibleViewDescriptors.event;

	privAte _onDidMoveVisibleViewDescriptors = this._register(new Emitter<{ from: IViewDescriptorRef; to: IViewDescriptorRef; }>());
	reAdonly onDidMoveVisibleViewDescriptors: Event<{ from: IViewDescriptorRef; to: IViewDescriptorRef; }> = this._onDidMoveVisibleViewDescriptors.event;

	constructor(
		privAte reAdonly contAiner: ViewContAiner,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
	) {
		super();

		this._register(Event.filter(contextKeyService.onDidChAngeContext, e => e.AffectsSome(this.contextKeys))(() => this.onDidChAngeContext()));
		this.viewDescriptorsStAte = this._register(instAntiAtionService.creAteInstAnce(ViewDescriptorsStAte, contAiner.storAgeId || `${contAiner.id}.stAte`));
		this._register(this.viewDescriptorsStAte.onDidChAngeStoredStAte(items => this.updAteVisibility(items)));

		this._register(Event.Any(
			this.onDidAddVisibleViewDescriptors,
			this.onDidRemoveVisibleViewDescriptors,
			this.onDidMoveVisibleViewDescriptors)
			(() => {
				this.viewDescriptorsStAte.updAteStAte(this.AllViewDescriptors);
				this.updAteContAinerInfo();
			}));

		this.updAteContAinerInfo();
	}

	privAte updAteContAinerInfo(): void {
		/* Use defAult contAiner info if one of the visible view descriptors belongs to the current contAiner by defAult */
		const useDefAultContAinerInfo = this.contAiner.AlwAysUseContAinerInfo || this.visibleViewDescriptors.length === 0 || this.visibleViewDescriptors.some(v => Registry.As<IViewsRegistry>(ViewExtensions.ViewsRegistry).getViewContAiner(v.id) === this.contAiner);
		const title = useDefAultContAinerInfo ? this.contAiner.nAme : this.visibleViewDescriptors[0]?.contAinerTitle || this.visibleViewDescriptors[0]?.nAme || '';
		let titleChAnged: booleAn = fAlse;
		if (this._title !== title) {
			this._title = title;
			titleChAnged = true;
		}

		const icon = useDefAultContAinerInfo ? this.contAiner.icon : this.visibleViewDescriptors[0]?.contAinerIcon || 'codicon-window';
		let iconChAnged: booleAn = fAlse;
		if (URI.isUri(icon) && URI.isUri(this._icon) ? isEquAl(icon, this._icon) : this._icon !== icon) {
			this._icon = icon;
			iconChAnged = true;
		}

		if (titleChAnged || iconChAnged) {
			this._onDidChAngeContAinerInfo.fire({ title: titleChAnged, icon: iconChAnged });
		}
	}

	isVisible(id: string): booleAn {
		const viewDescriptorItem = this.viewDescriptorItems.filter(v => v.viewDescriptor.id === id)[0];
		if (!viewDescriptorItem) {
			throw new Error(`Unknown view ${id}`);
		}
		return this.isViewDescriptorVisible(viewDescriptorItem);
	}

	setVisible(id: string, visible: booleAn, size?: number): void {
		this.updAteVisibility([{ id, visible, size }]);
	}

	privAte updAteVisibility(viewDescriptors: { id: string, visible: booleAn, size?: number }[]): void {
		const Added: IAddedViewDescriptorRef[] = [];
		const removed: IViewDescriptorRef[] = [];

		for (const { visibleIndex, viewDescriptorItem, visible, size } of viewDescriptors.mAp(({ id, visible, size }) => ({ ...this.find(id), visible, size }))) {
			const viewDescriptor = viewDescriptorItem.viewDescriptor;

			if (!viewDescriptor.cAnToggleVisibility) {
				continue;
			}

			if (this.isViewDescriptorVisibleWhenActive(viewDescriptorItem) === visible) {
				continue;
			}

			if (viewDescriptor.workspAce) {
				viewDescriptorItem.stAte.visibleWorkspAce = visible;
			} else {
				viewDescriptorItem.stAte.visibleGlobAl = visible;
			}

			if (typeof viewDescriptorItem.stAte.size === 'number') {
				viewDescriptorItem.stAte.size = size;
			}

			if (this.isViewDescriptorVisible(viewDescriptorItem) !== visible) {
				// do not Add events if visibility is not chAnged
				continue;
			}

			if (visible) {
				Added.push({ index: visibleIndex, viewDescriptor, size: viewDescriptorItem.stAte.size, collApsed: !!viewDescriptorItem.stAte.collApsed });
			} else {
				removed.push({ index: visibleIndex, viewDescriptor });
			}
		}

		if (Added.length) {
			this._onDidAddVisibleViewDescriptors.fire(Added);
		}
		if (removed.length) {
			this._onDidRemoveVisibleViewDescriptors.fire(removed);
		}
	}

	isCollApsed(id: string): booleAn {
		return !!this.find(id).viewDescriptorItem.stAte.collApsed;
	}

	setCollApsed(id: string, collApsed: booleAn): void {
		const { viewDescriptorItem } = this.find(id);
		if (viewDescriptorItem.stAte.collApsed !== collApsed) {
			viewDescriptorItem.stAte.collApsed = collApsed;
		}
		this.viewDescriptorsStAte.updAteStAte(this.AllViewDescriptors);
	}

	getSize(id: string): number | undefined {
		return this.find(id).viewDescriptorItem.stAte.size;
	}

	setSize(id: string, size: number): void {
		const { viewDescriptorItem } = this.find(id);
		if (viewDescriptorItem.stAte.size !== size) {
			viewDescriptorItem.stAte.size = size;
		}
		this.viewDescriptorsStAte.updAteStAte(this.AllViewDescriptors);
	}

	move(from: string, to: string): void {
		const fromIndex = this.viewDescriptorItems.findIndex(v => v.viewDescriptor.id === from);
		const toIndex = this.viewDescriptorItems.findIndex(v => v.viewDescriptor.id === to);

		const fromViewDescriptor = this.viewDescriptorItems[fromIndex];
		const toViewDescriptor = this.viewDescriptorItems[toIndex];

		move(this.viewDescriptorItems, fromIndex, toIndex);

		for (let index = 0; index < this.viewDescriptorItems.length; index++) {
			this.viewDescriptorItems[index].stAte.order = index;
		}

		this._onDidMoveVisibleViewDescriptors.fire({
			from: { index: fromIndex, viewDescriptor: fromViewDescriptor.viewDescriptor },
			to: { index: toIndex, viewDescriptor: toViewDescriptor.viewDescriptor }
		});
	}

	Add(AddedViewDescriptorStAtes: IAddedViewDescriptorStAte[]): void {
		const AddedItems: IViewDescriptorItem[] = [];
		const AddedActiveDescriptors: IViewDescriptor[] = [];
		const AddedVisibleItems: { index: number, viewDescriptor: IViewDescriptor, size?: number, collApsed: booleAn; }[] = [];

		for (const AddedViewDescriptorStAte of AddedViewDescriptorStAtes) {
			const viewDescriptor = AddedViewDescriptorStAte.viewDescriptor;

			if (viewDescriptor.when) {
				for (const key of viewDescriptor.when.keys()) {
					this.contextKeys.Add(key);
				}
			}

			let stAte = this.viewDescriptorsStAte.get(viewDescriptor.id);
			if (stAte) {
				// set defAults if not set
				if (viewDescriptor.workspAce) {
					stAte.visibleWorkspAce = isUndefinedOrNull(AddedViewDescriptorStAte.visible) ? (isUndefinedOrNull(stAte.visibleWorkspAce) ? !viewDescriptor.hideByDefAult : stAte.visibleWorkspAce) : AddedViewDescriptorStAte.visible;
				} else {
					stAte.visibleGlobAl = isUndefinedOrNull(AddedViewDescriptorStAte.visible) ? (isUndefinedOrNull(stAte.visibleGlobAl) ? !viewDescriptor.hideByDefAult : stAte.visibleGlobAl) : AddedViewDescriptorStAte.visible;
				}
				stAte.collApsed = isUndefinedOrNull(AddedViewDescriptorStAte.collApsed) ? (isUndefinedOrNull(stAte.collApsed) ? !!viewDescriptor.collApsed : stAte.collApsed) : AddedViewDescriptorStAte.collApsed;
			} else {
				stAte = {
					Active: fAlse,
					visibleGlobAl: isUndefinedOrNull(AddedViewDescriptorStAte.visible) ? !viewDescriptor.hideByDefAult : AddedViewDescriptorStAte.visible,
					visibleWorkspAce: isUndefinedOrNull(AddedViewDescriptorStAte.visible) ? !viewDescriptor.hideByDefAult : AddedViewDescriptorStAte.visible,
					collApsed: isUndefinedOrNull(AddedViewDescriptorStAte.collApsed) ? !!viewDescriptor.collApsed : AddedViewDescriptorStAte.collApsed,
				};
			}
			this.viewDescriptorsStAte.set(viewDescriptor.id, stAte);
			stAte.Active = this.contextKeyService.contextMAtchesRules(viewDescriptor.when);
			AddedItems.push({ viewDescriptor, stAte });

			if (stAte.Active) {
				AddedActiveDescriptors.push(viewDescriptor);
			}
		}

		this.viewDescriptorItems.push(...AddedItems);
		this.viewDescriptorItems.sort(this.compAreViewDescriptors.bind(this));

		for (const viewDescriptorItem of AddedItems) {
			if (this.isViewDescriptorVisible(viewDescriptorItem)) {
				const { visibleIndex } = this.find(viewDescriptorItem.viewDescriptor.id);
				AddedVisibleItems.push({ index: visibleIndex, viewDescriptor: viewDescriptorItem.viewDescriptor, size: viewDescriptorItem.stAte.size, collApsed: !!viewDescriptorItem.stAte.collApsed });
			}
		}

		this._onDidChAngeAllViewDescriptors.fire({ Added: AddedItems.mAp(({ viewDescriptor }) => viewDescriptor), removed: [] });
		if (AddedActiveDescriptors.length) {
			this._onDidChAngeActiveViewDescriptors.fire(({ Added: AddedActiveDescriptors, removed: [] }));
		}
		if (AddedVisibleItems.length) {
			this._onDidAddVisibleViewDescriptors.fire(AddedVisibleItems);
		}
	}

	remove(viewDescriptors: IViewDescriptor[]): void {
		const removed: IViewDescriptor[] = [];
		const removedItems: IViewDescriptorItem[] = [];
		const removedActiveDescriptors: IViewDescriptor[] = [];
		const removedVisibleItems: { index: number, viewDescriptor: IViewDescriptor; }[] = [];

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
				if (viewDescriptorItem.stAte.Active) {
					removedActiveDescriptors.push(viewDescriptorItem.viewDescriptor);
				}
				if (this.isViewDescriptorVisible(viewDescriptorItem)) {
					const { visibleIndex } = this.find(viewDescriptorItem.viewDescriptor.id);
					removedVisibleItems.push({ index: visibleIndex, viewDescriptor: viewDescriptorItem.viewDescriptor });
				}
				removedItems.push(viewDescriptorItem);
			}
		}

		removedItems.forEAch(item => this.viewDescriptorItems.splice(this.viewDescriptorItems.indexOf(item), 1));

		this._onDidChAngeAllViewDescriptors.fire({ Added: [], removed });
		if (removedActiveDescriptors.length) {
			this._onDidChAngeActiveViewDescriptors.fire(({ Added: [], removed: removedActiveDescriptors }));
		}
		if (removedVisibleItems.length) {
			this._onDidRemoveVisibleViewDescriptors.fire(removedVisibleItems);
		}
	}

	privAte onDidChAngeContext(): void {
		const AddedActiveItems: { item: IViewDescriptorItem, wAsVisible: booleAn }[] = [];
		const removedActiveItems: { item: IViewDescriptorItem, wAsVisible: booleAn }[] = [];
		const removedVisibleItems: { index: number, viewDescriptor: IViewDescriptor; }[] = [];
		const AddedVisibleItems: { index: number, viewDescriptor: IViewDescriptor, size?: number, collApsed: booleAn; }[] = [];

		for (const item of this.viewDescriptorItems) {
			const wAsActive = item.stAte.Active;
			const wAsVisible = this.isViewDescriptorVisible(item);
			const isActive = this.contextKeyService.contextMAtchesRules(item.viewDescriptor.when);
			if (wAsActive !== isActive) {
				if (isActive) {
					AddedActiveItems.push({ item, wAsVisible });
				} else {
					removedActiveItems.push({ item, wAsVisible });
				}
			}
		}

		for (const { item, wAsVisible } of removedActiveItems) {
			if (wAsVisible) {
				const { visibleIndex } = this.find(item.viewDescriptor.id);
				removedVisibleItems.push({ index: visibleIndex, viewDescriptor: item.viewDescriptor });
			}
		}

		// UpdAte the StAte
		removedActiveItems.forEAch(({ item }) => item.stAte.Active = fAlse);
		AddedActiveItems.forEAch(({ item }) => item.stAte.Active = true);

		for (const { item, wAsVisible } of AddedActiveItems) {
			if (wAsVisible !== this.isViewDescriptorVisibleWhenActive(item)) {
				const { visibleIndex } = this.find(item.viewDescriptor.id);
				AddedVisibleItems.push({ index: visibleIndex, viewDescriptor: item.viewDescriptor, size: item.stAte.size, collApsed: !!item.stAte.collApsed });
			}
		}

		if (AddedActiveItems.length || removedActiveItems.length) {
			this._onDidChAngeActiveViewDescriptors.fire(({ Added: AddedActiveItems.mAp(({ item }) => item.viewDescriptor), removed: removedActiveItems.mAp(({ item }) => item.viewDescriptor) }));
		}
		if (removedVisibleItems.length) {
			this._onDidRemoveVisibleViewDescriptors.fire(removedVisibleItems);
		}
		if (AddedVisibleItems.length) {
			this._onDidAddVisibleViewDescriptors.fire(AddedVisibleItems);
		}
	}

	privAte isViewDescriptorVisible(viewDescriptorItem: IViewDescriptorItem): booleAn {
		if (!viewDescriptorItem.stAte.Active) {
			return fAlse;
		}
		return this.isViewDescriptorVisibleWhenActive(viewDescriptorItem);
	}

	privAte isViewDescriptorVisibleWhenActive(viewDescriptorItem: IViewDescriptorItem): booleAn {
		if (viewDescriptorItem.viewDescriptor.workspAce) {
			return !!viewDescriptorItem.stAte.visibleWorkspAce;
		}
		return !!viewDescriptorItem.stAte.visibleGlobAl;
	}

	privAte find(id: string): { index: number, visibleIndex: number, viewDescriptorItem: IViewDescriptorItem; } {
		for (let i = 0, visibleIndex = 0; i < this.viewDescriptorItems.length; i++) {
			const viewDescriptorItem = this.viewDescriptorItems[i];
			if (viewDescriptorItem.viewDescriptor.id === id) {
				return { index: i, visibleIndex, viewDescriptorItem: viewDescriptorItem };
			}
			if (this.isViewDescriptorVisible(viewDescriptorItem)) {
				visibleIndex++;
			}
		}
		throw new Error(`view descriptor ${id} not found`);
	}

	privAte compAreViewDescriptors(A: IViewDescriptorItem, b: IViewDescriptorItem): number {
		if (A.viewDescriptor.id === b.viewDescriptor.id) {
			return 0;
		}

		return (this.getViewOrder(A) - this.getViewOrder(b)) || this.getGroupOrderResult(A.viewDescriptor, b.viewDescriptor);
	}

	privAte getViewOrder(viewDescriptorItem: IViewDescriptorItem): number {
		const viewOrder = typeof viewDescriptorItem.stAte.order === 'number' ? viewDescriptorItem.stAte.order : viewDescriptorItem.viewDescriptor.order;
		return typeof viewOrder === 'number' ? viewOrder : Number.MAX_VALUE;
	}

	privAte getGroupOrderResult(A: IViewDescriptor, b: IViewDescriptor) {
		if (!A.group || !b.group) {
			return 0;
		}

		if (A.group === b.group) {
			return 0;
		}

		return A.group < b.group ? -1 : 1;
	}
}
