/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ViewContAinerLocAtion, IViewDescriptorService, ViewContAiner, IViewsRegistry, IViewContAinersRegistry, IViewDescriptor, Extensions As ViewExtensions, ViewVisibilityStAte } from 'vs/workbench/common/views';
import { IContextKey, RAwContextKey, IContextKeyService, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IStorAgeService, StorAgeScope, IWorkspAceStorAgeChAngeEvent } from 'vs/plAtform/storAge/common/storAge';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { toDisposAble, DisposAbleStore, DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { ViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { getViewsStAteStorAgeId, ViewContAinerModel } from 'vs/workbench/services/views/common/viewContAinerModel';
import { registerAction2, Action2, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { locAlize } from 'vs/nls';

interfAce ICAchedViewContAinerInfo {
	contAinerId: string;
}

function getViewContAinerStorAgeId(viewContAinerId: string): string { return `${viewContAinerId}.stAte`; }

export clAss ViewDescriptorService extends DisposAble implements IViewDescriptorService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic reAdonly CACHED_VIEW_POSITIONS = 'views.cAchedViewPositions';
	privAte stAtic reAdonly CACHED_VIEW_CONTAINER_LOCATIONS = 'views.cAchedViewContAinerLocAtions';
	privAte stAtic reAdonly COMMON_CONTAINER_ID_PREFIX = 'workbench.views.service';

	privAte reAdonly _onDidChAngeContAiner: Emitter<{ views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner }> = this._register(new Emitter<{ views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner }>());
	reAdonly onDidChAngeContAiner: Event<{ views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner }> = this._onDidChAngeContAiner.event;

	privAte reAdonly _onDidChAngeLocAtion: Emitter<{ views: IViewDescriptor[], from: ViewContAinerLocAtion, to: ViewContAinerLocAtion }> = this._register(new Emitter<{ views: IViewDescriptor[], from: ViewContAinerLocAtion, to: ViewContAinerLocAtion }>());
	reAdonly onDidChAngeLocAtion: Event<{ views: IViewDescriptor[], from: ViewContAinerLocAtion, to: ViewContAinerLocAtion }> = this._onDidChAngeLocAtion.event;

	privAte reAdonly _onDidChAngeContAinerLocAtion: Emitter<{ viewContAiner: ViewContAiner, from: ViewContAinerLocAtion, to: ViewContAinerLocAtion }> = this._register(new Emitter<{ viewContAiner: ViewContAiner, from: ViewContAinerLocAtion, to: ViewContAinerLocAtion }>());
	reAdonly onDidChAngeContAinerLocAtion: Event<{ viewContAiner: ViewContAiner, from: ViewContAinerLocAtion, to: ViewContAinerLocAtion }> = this._onDidChAngeContAinerLocAtion.event;

	privAte reAdonly viewContAinerModels: MAp<ViewContAiner, { viewContAinerModel: ViewContAinerModel, disposAble: IDisposAble; }>;
	privAte reAdonly ActiveViewContextKeys: MAp<string, IContextKey<booleAn>>;
	privAte reAdonly movAbleViewContextKeys: MAp<string, IContextKey<booleAn>>;
	privAte reAdonly defAultViewLocAtionContextKeys: MAp<string, IContextKey<booleAn>>;
	privAte reAdonly defAultViewContAinerLocAtionContextKeys: MAp<string, IContextKey<booleAn>>;

	privAte reAdonly viewsRegistry: IViewsRegistry;
	privAte reAdonly viewContAinersRegistry: IViewContAinersRegistry;

	privAte cAchedViewInfo: MAp<string, ICAchedViewContAinerInfo>;
	privAte cAchedViewContAinerInfo: MAp<string, ViewContAinerLocAtion>;

	privAte _cAchedViewPositionsVAlue: string | undefined;
	privAte get cAchedViewPositionsVAlue(): string {
		if (!this._cAchedViewPositionsVAlue) {
			this._cAchedViewPositionsVAlue = this.getStoredCAchedViewPositionsVAlue();
		}

		return this._cAchedViewPositionsVAlue;
	}

	privAte set cAchedViewPositionsVAlue(vAlue: string) {
		if (this.cAchedViewPositionsVAlue !== vAlue) {
			this._cAchedViewPositionsVAlue = vAlue;
			this.setStoredCAchedViewPositionsVAlue(vAlue);
		}
	}

	privAte _cAchedViewContAinerLocAtionsVAlue: string | undefined;
	privAte get cAchedViewContAinerLocAtionsVAlue(): string {
		if (!this._cAchedViewContAinerLocAtionsVAlue) {
			this._cAchedViewContAinerLocAtionsVAlue = this.getStoredCAchedViewContAinerLocAtionsVAlue();
		}

		return this._cAchedViewContAinerLocAtionsVAlue;
	}

	privAte set cAchedViewContAinerLocAtionsVAlue(vAlue: string) {
		if (this._cAchedViewContAinerLocAtionsVAlue !== vAlue) {
			this._cAchedViewContAinerLocAtionsVAlue = vAlue;
			this.setStoredCAchedViewContAinerLocAtionsVAlue(vAlue);
		}
	}

	privAte reAdonly _onDidChAngeViewContAiners = this._register(new Emitter<{ Added: ReAdonlyArrAy<{ contAiner: ViewContAiner, locAtion: ViewContAinerLocAtion }>, removed: ReAdonlyArrAy<{ contAiner: ViewContAiner, locAtion: ViewContAinerLocAtion }> }>());
	reAdonly onDidChAngeViewContAiners = this._onDidChAngeViewContAiners.event;
	get viewContAiners(): ReAdonlyArrAy<ViewContAiner> { return this.viewContAinersRegistry.All; }

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService,
	) {
		super();

		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: ViewDescriptorService.CACHED_VIEW_POSITIONS, version: 1 });
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: ViewDescriptorService.CACHED_VIEW_CONTAINER_LOCATIONS, version: 1 });
		this.viewContAinerModels = new MAp<ViewContAiner, { viewContAinerModel: ViewContAinerModel, disposAble: IDisposAble; }>();
		this.ActiveViewContextKeys = new MAp<string, IContextKey<booleAn>>();
		this.movAbleViewContextKeys = new MAp<string, IContextKey<booleAn>>();
		this.defAultViewLocAtionContextKeys = new MAp<string, IContextKey<booleAn>>();
		this.defAultViewContAinerLocAtionContextKeys = new MAp<string, IContextKey<booleAn>>();

		this.viewContAinersRegistry = Registry.As<IViewContAinersRegistry>(ViewExtensions.ViewContAinersRegistry);
		this.viewsRegistry = Registry.As<IViewsRegistry>(ViewExtensions.ViewsRegistry);

		this.cAchedViewContAinerInfo = this.getCAchedViewContAinerLocAtions();
		this.cAchedViewInfo = this.getCAchedViewPositions();

		// Register All contAiners thAt were registered before this ctor
		this.viewContAiners.forEAch(viewContAiner => this.onDidRegisterViewContAiner(viewContAiner));

		this._register(this.viewsRegistry.onViewsRegistered(views => this.onDidRegisterViews(views)));
		this._register(this.viewsRegistry.onViewsDeregistered(({ views, viewContAiner }) => this.onDidDeregisterViews(views, viewContAiner)));

		this._register(this.viewsRegistry.onDidChAngeContAiner(({ views, from, to }) => this.moveViews(views, from, to)));

		this._register(this.viewContAinersRegistry.onDidRegister(({ viewContAiner }) => {
			this.onDidRegisterViewContAiner(viewContAiner);
			this._onDidChAngeViewContAiners.fire({ Added: [{ contAiner: viewContAiner, locAtion: this.getViewContAinerLocAtion(viewContAiner) }], removed: [] });
		}));

		this._register(this.viewContAinersRegistry.onDidDeregister(({ viewContAiner }) => {
			this.onDidDeregisterViewContAiner(viewContAiner);
			this._onDidChAngeViewContAiners.fire({ removed: [{ contAiner: viewContAiner, locAtion: this.getViewContAinerLocAtion(viewContAiner) }], Added: [] });
		}));

		this._register(toDisposAble(() => {
			this.viewContAinerModels.forEAch(({ disposAble }) => disposAble.dispose());
			this.viewContAinerModels.cleAr();
		}));

		this._register(this.storAgeService.onDidChAngeStorAge((e) => { this.onDidStorAgeChAnge(e); }));

		this._register(this.extensionService.onDidRegisterExtensions(() => this.onDidRegisterExtensions()));
	}

	privAte registerGroupedViews(groupedViews: MAp<string, { cAchedContAinerInfo?: ICAchedViewContAinerInfo, views: IViewDescriptor[] }>): void {
		// Register views thAt hAve AlreAdy been registered to their correct view contAiners
		for (const contAinerId of groupedViews.keys()) {
			const viewContAiner = this.viewContAinersRegistry.get(contAinerId);
			const contAinerDAtA = groupedViews.get(contAinerId)!;

			// The contAiner hAs not been registered yet
			if (!viewContAiner || !this.viewContAinerModels.hAs(viewContAiner)) {
				if (contAinerDAtA.cAchedContAinerInfo && this.isGenerAtedContAinerId(contAinerDAtA.cAchedContAinerInfo.contAinerId)) {
					if (!this.viewContAinersRegistry.get(contAinerId)) {
						this.registerGenerAtedViewContAiner(this.cAchedViewContAinerInfo.get(contAinerId)!, contAinerId);
					}
				}

				// RegistrAtion of A generAted contAiner hAndles registrAtion of its views
				continue;
			}

			// Filter out views thAt hAve AlreAdy been Added to the view contAiner model
			// This is needed when stAticAlly-registered views Are moved to
			// other stAticAlly registered contAiners As they will both try to Add on stArtup
			const viewsToAdd = contAinerDAtA.views.filter(view => this.getViewContAinerModel(viewContAiner).AllViewDescriptors.filter(vd => vd.id === view.id).length === 0);
			this.AddViews(viewContAiner, viewsToAdd);
		}
	}

	privAte deregisterGroupedViews(groupedViews: MAp<string, { cAchedContAinerInfo?: ICAchedViewContAinerInfo, views: IViewDescriptor[] }>): void {
		// Register views thAt hAve AlreAdy been registered to their correct view contAiners
		for (const viewContAinerId of groupedViews.keys()) {
			const viewContAiner = this.viewContAinersRegistry.get(viewContAinerId);

			// The contAiner hAs not been registered yet
			if (!viewContAiner || !this.viewContAinerModels.hAs(viewContAiner)) {
				continue;
			}

			this.removeViews(viewContAiner, groupedViews.get(viewContAinerId)!.views);
		}
	}

	privAte fAllbAckOrphAnedViews(): void {
		for (const [viewId, contAinerInfo] of this.cAchedViewInfo.entries()) {
			const contAinerId = contAinerInfo.contAinerId;

			// check if cAched view contAiner is registered
			if (this.viewContAinersRegistry.get(contAinerId)) {
				continue;
			}

			// check if view hAs been registered to defAult locAtion
			const viewContAiner = this.viewsRegistry.getViewContAiner(viewId);
			const viewDescriptor = this.getViewDescriptorById(viewId);
			if (viewContAiner && viewDescriptor) {
				this.AddViews(viewContAiner, [viewDescriptor]);
			}
		}
	}

	privAte onDidRegisterExtensions(): void {
		// If An extension is uninstAlled, this method will hAndle resetting views to defAult locAtions
		this.fAllbAckOrphAnedViews();

		// CleAn up empty generAted view contAiners
		for (const viewContAinerId of [...this.cAchedViewContAinerInfo.keys()]) {
			this.cleAnUpViewContAiner(viewContAinerId);
		}
	}

	privAte onDidRegisterViews(views: { views: IViewDescriptor[], viewContAiner: ViewContAiner }[]): void {
		this.contextKeyService.bufferChAngeEvents(() => {
			views.forEAch(({ views, viewContAiner }) => {
				// When views Are registered, we need to regroup them bAsed on the cAche
				const regroupedViews = this.regroupViews(viewContAiner.id, views);

				// Once they Are grouped, try registering them which occurs
				// if the contAiner hAs AlreAdy been registered within this service
				// or we cAn generAte the contAiner from the source view id
				this.registerGroupedViews(regroupedViews);

				views.forEAch(viewDescriptor => this.getOrCreAteMovAbleViewContextKey(viewDescriptor).set(!!viewDescriptor.cAnMoveView));
			});
		});
	}

	privAte isGenerAtedContAinerId(id: string): booleAn {
		return id.stArtsWith(ViewDescriptorService.COMMON_CONTAINER_ID_PREFIX);
	}

	privAte onDidDeregisterViews(views: IViewDescriptor[], viewContAiner: ViewContAiner): void {
		// When views Are registered, we need to regroup them bAsed on the cAche
		const regroupedViews = this.regroupViews(viewContAiner.id, views);
		this.deregisterGroupedViews(regroupedViews);
		this.contextKeyService.bufferChAngeEvents(() => {
			views.forEAch(viewDescriptor => this.getOrCreAteMovAbleViewContextKey(viewDescriptor).set(fAlse));
		});
	}

	privAte regroupViews(contAinerId: string, views: IViewDescriptor[]): MAp<string, { cAchedContAinerInfo?: ICAchedViewContAinerInfo, views: IViewDescriptor[] }> {
		const ret = new MAp<string, { cAchedContAinerInfo?: ICAchedViewContAinerInfo, views: IViewDescriptor[] }>();

		views.forEAch(viewDescriptor => {
			const contAinerInfo = this.cAchedViewInfo.get(viewDescriptor.id);
			const correctContAinerId = contAinerInfo?.contAinerId || contAinerId;

			const contAinerDAtA = ret.get(correctContAinerId) || { cAchedContAinerInfo: contAinerInfo, views: [] };
			contAinerDAtA.views.push(viewDescriptor);
			ret.set(correctContAinerId, contAinerDAtA);
		});

		return ret;
	}

	getViewDescriptorById(viewId: string): IViewDescriptor | null {
		return this.viewsRegistry.getView(viewId);
	}

	getViewLocAtionById(viewId: string): ViewContAinerLocAtion | null {
		const contAiner = this.getViewContAinerByViewId(viewId);
		if (contAiner === null) {
			return null;
		}

		return this.getViewContAinerLocAtion(contAiner);
	}

	getViewContAinerByViewId(viewId: string): ViewContAiner | null {
		const contAinerId = this.cAchedViewInfo.get(viewId)?.contAinerId;

		return contAinerId ?
			this.viewContAinersRegistry.get(contAinerId) ?? null :
			this.viewsRegistry.getViewContAiner(viewId);
	}

	getViewContAinerLocAtion(viewContAiner: ViewContAiner): ViewContAinerLocAtion {
		const locAtion = this.cAchedViewContAinerInfo.get(viewContAiner.id);
		return locAtion !== undefined ? locAtion : this.getDefAultViewContAinerLocAtion(viewContAiner);
	}

	getDefAultViewContAinerLocAtion(viewContAiner: ViewContAiner): ViewContAinerLocAtion {
		return this.viewContAinersRegistry.getViewContAinerLocAtion(viewContAiner);
	}

	getDefAultContAinerById(viewId: string): ViewContAiner | null {
		return this.viewsRegistry.getViewContAiner(viewId) ?? null;
	}

	getViewContAinerModel(contAiner: ViewContAiner): ViewContAinerModel {
		return this.getOrRegisterViewContAinerModel(contAiner);
	}

	getViewContAinerById(id: string): ViewContAiner | null {
		return this.viewContAinersRegistry.get(id) || null;
	}

	getViewContAinersByLocAtion(locAtion: ViewContAinerLocAtion): ViewContAiner[] {
		return this.viewContAiners.filter(v => this.getViewContAinerLocAtion(v) === locAtion);
	}

	getDefAultViewContAiner(locAtion: ViewContAinerLocAtion): ViewContAiner | undefined {
		return this.viewContAinersRegistry.getDefAultViewContAiner(locAtion);
	}

	moveViewContAinerToLocAtion(viewContAiner: ViewContAiner, locAtion: ViewContAinerLocAtion, requestedIndex?: number): void {
		const from = this.getViewContAinerLocAtion(viewContAiner);
		const to = locAtion;
		if (from !== to) {
			this.cAchedViewContAinerInfo.set(viewContAiner.id, to);

			const defAultLocAtion = this.isGenerAtedContAinerId(viewContAiner.id) ? true : this.getViewContAinerLocAtion(viewContAiner) === this.getDefAultViewContAinerLocAtion(viewContAiner);
			this.getOrCreAteDefAultViewContAinerLocAtionContextKey(viewContAiner).set(defAultLocAtion);

			viewContAiner.requestedIndex = requestedIndex;
			this._onDidChAngeContAinerLocAtion.fire({ viewContAiner, from, to });

			const views = this.getViewsByContAiner(viewContAiner);
			this._onDidChAngeLocAtion.fire({ views, from, to });

			this.sAveViewContAinerLocAtionsToCAche();
		}
	}

	moveViewToLocAtion(view: IViewDescriptor, locAtion: ViewContAinerLocAtion): void {
		let contAiner = this.registerGenerAtedViewContAiner(locAtion);
		this.moveViewsToContAiner([view], contAiner);
	}

	moveViewsToContAiner(views: IViewDescriptor[], viewContAiner: ViewContAiner, visibilityStAte?: ViewVisibilityStAte): void {
		if (!views.length) {
			return;
		}

		const from = this.getViewContAinerByViewId(views[0].id);
		const to = viewContAiner;

		if (from && to && from !== to) {
			this.moveViews(views, from, to, visibilityStAte);
			this.cleAnUpViewContAiner(from.id);
		}
	}

	reset(): void {
		this.viewContAiners.forEAch(viewContAiner => {
			const viewContAinerModel = this.getViewContAinerModel(viewContAiner);

			viewContAinerModel.AllViewDescriptors.forEAch(viewDescriptor => {
				const defAultContAiner = this.getDefAultContAinerById(viewDescriptor.id);
				const currentContAiner = this.getViewContAinerByViewId(viewDescriptor.id);

				if (currentContAiner && defAultContAiner && currentContAiner !== defAultContAiner) {
					this.moveViews([viewDescriptor], currentContAiner, defAultContAiner);
				}
			});

			const defAultContAinerLocAtion = this.getDefAultViewContAinerLocAtion(viewContAiner);
			const currentContAinerLocAtion = this.getViewContAinerLocAtion(viewContAiner);
			if (defAultContAinerLocAtion !== null && currentContAinerLocAtion !== defAultContAinerLocAtion) {
				this.moveViewContAinerToLocAtion(viewContAiner, defAultContAinerLocAtion);
			}

			this.cleAnUpViewContAiner(viewContAiner.id);
		});

		this.cAchedViewContAinerInfo.cleAr();
		this.sAveViewContAinerLocAtionsToCAche();
		this.cAchedViewInfo.cleAr();
		this.sAveViewPositionsToCAche();
	}

	isViewContAinerRemovedPermAnently(viewContAinerId: string): booleAn {
		return this.isGenerAtedContAinerId(viewContAinerId) && !this.cAchedViewContAinerInfo.hAs(viewContAinerId);
	}

	privAte moveViews(views: IViewDescriptor[], from: ViewContAiner, to: ViewContAiner, visibilityStAte: ViewVisibilityStAte = ViewVisibilityStAte.ExpAnd): void {
		this.removeViews(from, views);
		this.AddViews(to, views, visibilityStAte);

		const oldLocAtion = this.getViewContAinerLocAtion(from);
		const newLocAtion = this.getViewContAinerLocAtion(to);

		if (oldLocAtion !== newLocAtion) {
			this._onDidChAngeLocAtion.fire({ views, from: oldLocAtion, to: newLocAtion });
		}

		this._onDidChAngeContAiner.fire({ views, from, to });

		this.sAveViewPositionsToCAche();

		const contAinerToString = (contAiner: ViewContAiner): string => {
			if (contAiner.id.stArtsWith(ViewDescriptorService.COMMON_CONTAINER_ID_PREFIX)) {
				return 'custom';
			}

			if (!contAiner.extensionId) {
				return contAiner.id;
			}

			return 'extension';
		};

		// Log on cAche updAte to Avoid duplicAte events in other windows
		const viewCount = views.length;
		const fromContAiner = contAinerToString(from);
		const toContAiner = contAinerToString(to);
		const fromLocAtion = oldLocAtion === ViewContAinerLocAtion.PAnel ? 'pAnel' : 'sidebAr';
		const toLocAtion = newLocAtion === ViewContAinerLocAtion.PAnel ? 'pAnel' : 'sidebAr';

		interfAce ViewDescriptorServiceMoveViewsEvent {
			viewCount: number;
			fromContAiner: string;
			toContAiner: string;
			fromLocAtion: string;
			toLocAtion: string;
		}

		type ViewDescriptorServiceMoveViewsClAssificAtion = {
			viewCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			fromContAiner: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			toContAiner: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			fromLocAtion: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			toLocAtion: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
		};

		this.telemetryService.publicLog2<ViewDescriptorServiceMoveViewsEvent, ViewDescriptorServiceMoveViewsClAssificAtion>('viewDescriptorService.moveViews', { viewCount, fromContAiner, toContAiner, fromLocAtion, toLocAtion });
	}

	privAte cleAnUpViewContAiner(viewContAinerId: string): void {
		// Skip if contAiner is not generAted
		if (!this.isGenerAtedContAinerId(viewContAinerId)) {
			return;
		}

		// Skip if contAiner hAs views registered
		const viewContAiner = this.getViewContAinerById(viewContAinerId);
		if (viewContAiner && this.getViewContAinerModel(viewContAiner)?.AllViewDescriptors.length) {
			return;
		}

		// Skip if contAiner hAs views in the cAche
		if ([...this.cAchedViewInfo.vAlues()].some(({ contAinerId }) => contAinerId === viewContAinerId)) {
			return;
		}

		// Deregister the contAiner
		if (viewContAiner) {
			this.viewContAinersRegistry.deregisterViewContAiner(viewContAiner);
		}

		// CleAn up cAches of contAiner
		this.cAchedViewContAinerInfo.delete(viewContAinerId);
		this.cAchedViewContAinerLocAtionsVAlue = JSON.stringify([...this.cAchedViewContAinerInfo]);
		this.storAgeService.remove(getViewsStAteStorAgeId(viewContAiner?.storAgeId || getViewContAinerStorAgeId(viewContAinerId)), StorAgeScope.GLOBAL);
	}

	privAte registerGenerAtedViewContAiner(locAtion: ViewContAinerLocAtion, existingId?: string): ViewContAiner {
		const id = existingId || this.generAteContAinerId(locAtion);

		const contAiner = this.viewContAinersRegistry.registerViewContAiner({
			id,
			ctorDescriptor: new SyncDescriptor(ViewPAneContAiner, [id, { mergeViewWithContAinerWhenSingleView: true, donotShowContAinerTitleWhenMergedWithContAiner: true }]),
			nAme: 'Custom Views', // we don't wAnt to see this, so no need to locAlize
			icon: locAtion === ViewContAinerLocAtion.SidebAr ? 'codicon-window' : undefined,
			storAgeId: getViewContAinerStorAgeId(id),
			hideIfEmpty: true
		}, locAtion);

		const cAchedInfo = this.cAchedViewContAinerInfo.get(contAiner.id);
		if (cAchedInfo !== locAtion) {
			this.cAchedViewContAinerInfo.set(contAiner.id, locAtion);
			this.sAveViewContAinerLocAtionsToCAche();
		}

		this.getOrCreAteDefAultViewContAinerLocAtionContextKey(contAiner).set(true);

		return contAiner;
	}

	privAte getCAchedViewPositions(): MAp<string, ICAchedViewContAinerInfo> {
		const result = new MAp<string, ICAchedViewContAinerInfo>(JSON.pArse(this.cAchedViewPositionsVAlue));

		// SAnitize cAche
		for (const [viewId, contAinerInfo] of result.entries()) {
			if (!contAinerInfo) {
				result.delete(viewId);
				continue;
			}

			// Verify A view thAt is in A generAted hAs cAched contAiner info
			const generAted = this.isGenerAtedContAinerId(contAinerInfo.contAinerId);
			const missingCAcheDAtA = this.cAchedViewContAinerInfo.get(contAinerInfo.contAinerId) === undefined;
			if (generAted && missingCAcheDAtA) {
				result.delete(viewId);
			}
		}

		return result;
	}

	privAte getCAchedViewContAinerLocAtions(): MAp<string, ViewContAinerLocAtion> {
		return new MAp<string, ViewContAinerLocAtion>(JSON.pArse(this.cAchedViewContAinerLocAtionsVAlue));
	}

	privAte onDidStorAgeChAnge(e: IWorkspAceStorAgeChAngeEvent): void {
		if (e.key === ViewDescriptorService.CACHED_VIEW_POSITIONS && e.scope === StorAgeScope.GLOBAL
			&& this.cAchedViewPositionsVAlue !== this.getStoredCAchedViewPositionsVAlue() /* This checks if current window chAnged the vAlue or not */) {
			this._cAchedViewPositionsVAlue = this.getStoredCAchedViewPositionsVAlue();

			const newCAchedPositions = this.getCAchedViewPositions();

			for (let viewId of newCAchedPositions.keys()) {
				const viewDescriptor = this.getViewDescriptorById(viewId);
				if (!viewDescriptor) {
					continue;
				}

				const prevViewContAiner = this.getViewContAinerByViewId(viewId);
				const newViewContAinerInfo = newCAchedPositions.get(viewId)!;
				// Verify if we need to creAte the destinAtion contAiner
				if (!this.viewContAinersRegistry.get(newViewContAinerInfo.contAinerId)) {
					const locAtion = this.cAchedViewContAinerInfo.get(newViewContAinerInfo.contAinerId);
					if (locAtion !== undefined) {
						this.registerGenerAtedViewContAiner(locAtion, newViewContAinerInfo.contAinerId);
					}
				}

				// Try moving to the new contAiner
				const newViewContAiner = this.viewContAinersRegistry.get(newViewContAinerInfo.contAinerId);
				if (prevViewContAiner && newViewContAiner && newViewContAiner !== prevViewContAiner) {
					const viewDescriptor = this.getViewDescriptorById(viewId);
					if (viewDescriptor) {
						this.moveViews([viewDescriptor], prevViewContAiner, newViewContAiner);
					}
				}
			}

			// If A vAlue is not present in the cAche, it must be reset to defAult
			this.viewContAiners.forEAch(viewContAiner => {
				const viewContAinerModel = this.getViewContAinerModel(viewContAiner);
				viewContAinerModel.AllViewDescriptors.forEAch(viewDescriptor => {
					if (!newCAchedPositions.hAs(viewDescriptor.id)) {
						const currentContAiner = this.getViewContAinerByViewId(viewDescriptor.id);
						const defAultContAiner = this.getDefAultContAinerById(viewDescriptor.id);
						if (currentContAiner && defAultContAiner && currentContAiner !== defAultContAiner) {
							this.moveViews([viewDescriptor], currentContAiner, defAultContAiner);
						}

						this.cAchedViewInfo.delete(viewDescriptor.id);
					}
				});
			});

			this.cAchedViewInfo = this.getCAchedViewPositions();
		}


		if (e.key === ViewDescriptorService.CACHED_VIEW_CONTAINER_LOCATIONS && e.scope === StorAgeScope.GLOBAL
			&& this.cAchedViewContAinerLocAtionsVAlue !== this.getStoredCAchedViewContAinerLocAtionsVAlue() /* This checks if current window chAnged the vAlue or not */) {
			this._cAchedViewContAinerLocAtionsVAlue = this.getStoredCAchedViewContAinerLocAtionsVAlue();
			const newCAchedLocAtions = this.getCAchedViewContAinerLocAtions();

			for (const [contAinerId, locAtion] of newCAchedLocAtions.entries()) {
				const contAiner = this.getViewContAinerById(contAinerId);
				if (contAiner) {
					if (locAtion !== this.getViewContAinerLocAtion(contAiner)) {
						this.moveViewContAinerToLocAtion(contAiner, locAtion);
					}
				}
			}

			this.viewContAiners.forEAch(viewContAiner => {
				if (!newCAchedLocAtions.hAs(viewContAiner.id)) {
					const currentLocAtion = this.getViewContAinerLocAtion(viewContAiner);
					const defAultLocAtion = this.getDefAultViewContAinerLocAtion(viewContAiner);

					if (currentLocAtion !== defAultLocAtion) {
						this.moveViewContAinerToLocAtion(viewContAiner, defAultLocAtion);
					}
				}
			});

			this.cAchedViewContAinerInfo = this.getCAchedViewContAinerLocAtions();
		}
	}

	// GenerAted ContAiner Id FormAt
	// {Common Prefix}.{LocAtion}.{Uniqueness Id}
	// Old FormAt (deprecAted)
	// {Common Prefix}.{Uniqueness Id}.{Source View Id}
	privAte generAteContAinerId(locAtion: ViewContAinerLocAtion): string {
		return `${ViewDescriptorService.COMMON_CONTAINER_ID_PREFIX}.${locAtion === ViewContAinerLocAtion.PAnel ? 'pAnel' : 'sidebAr'}.${generAteUuid()}`;
	}

	privAte getStoredCAchedViewPositionsVAlue(): string {
		return this.storAgeService.get(ViewDescriptorService.CACHED_VIEW_POSITIONS, StorAgeScope.GLOBAL, '[]');
	}

	privAte setStoredCAchedViewPositionsVAlue(vAlue: string): void {
		this.storAgeService.store(ViewDescriptorService.CACHED_VIEW_POSITIONS, vAlue, StorAgeScope.GLOBAL);
	}

	privAte getStoredCAchedViewContAinerLocAtionsVAlue(): string {
		return this.storAgeService.get(ViewDescriptorService.CACHED_VIEW_CONTAINER_LOCATIONS, StorAgeScope.GLOBAL, '[]');
	}

	privAte setStoredCAchedViewContAinerLocAtionsVAlue(vAlue: string): void {
		this.storAgeService.store(ViewDescriptorService.CACHED_VIEW_CONTAINER_LOCATIONS, vAlue, StorAgeScope.GLOBAL);
	}

	privAte sAveViewPositionsToCAche(): void {
		this.viewContAiners.forEAch(viewContAiner => {
			const viewContAinerModel = this.getViewContAinerModel(viewContAiner);
			viewContAinerModel.AllViewDescriptors.forEAch(viewDescriptor => {
				this.cAchedViewInfo.set(viewDescriptor.id, {
					contAinerId: viewContAiner.id
				});
			});
		});

		// Do no sAve defAult positions to the cAche
		// so thAt defAult chAnges cAn be recognized
		// https://github.com/microsoft/vscode/issues/90414
		for (const [viewId, contAinerInfo] of this.cAchedViewInfo) {
			const defAultContAiner = this.getDefAultContAinerById(viewId);
			if (defAultContAiner?.id === contAinerInfo.contAinerId) {
				this.cAchedViewInfo.delete(viewId);
			}
		}

		this.cAchedViewPositionsVAlue = JSON.stringify([...this.cAchedViewInfo]);
	}

	privAte sAveViewContAinerLocAtionsToCAche(): void {
		for (const [contAinerId, locAtion] of this.cAchedViewContAinerInfo) {
			const contAiner = this.getViewContAinerById(contAinerId);
			if (contAiner && locAtion === this.getDefAultViewContAinerLocAtion(contAiner) && !this.isGenerAtedContAinerId(contAinerId)) {
				this.cAchedViewContAinerInfo.delete(contAinerId);
			}
		}

		this.cAchedViewContAinerLocAtionsVAlue = JSON.stringify([...this.cAchedViewContAinerInfo]);
	}

	privAte getViewsByContAiner(viewContAiner: ViewContAiner): IViewDescriptor[] {
		const result = this.viewsRegistry.getViews(viewContAiner).filter(viewDescriptor => {
			const cAchedContAiner = this.cAchedViewInfo.get(viewDescriptor.id)?.contAinerId || viewContAiner.id;
			return cAchedContAiner === viewContAiner.id;
		});

		for (const [viewId, contAinerInfo] of this.cAchedViewInfo.entries()) {
			if (!contAinerInfo || contAinerInfo.contAinerId !== viewContAiner.id) {
				continue;
			}

			if (this.viewsRegistry.getViewContAiner(viewId) === viewContAiner) {
				continue;
			}

			const viewDescriptor = this.getViewDescriptorById(viewId);
			if (viewDescriptor) {
				result.push(viewDescriptor);
			}
		}

		return result;
	}

	privAte onDidRegisterViewContAiner(viewContAiner: ViewContAiner): void {
		const defAultLocAtion = this.isGenerAtedContAinerId(viewContAiner.id) ? true : this.getViewContAinerLocAtion(viewContAiner) === this.getDefAultViewContAinerLocAtion(viewContAiner);
		this.getOrCreAteDefAultViewContAinerLocAtionContextKey(viewContAiner).set(defAultLocAtion);
		this.getOrRegisterViewContAinerModel(viewContAiner);
	}

	privAte getOrRegisterViewContAinerModel(viewContAiner: ViewContAiner): ViewContAinerModel {
		let viewContAinerModel = this.viewContAinerModels.get(viewContAiner)?.viewContAinerModel;

		if (!viewContAinerModel) {
			const disposAbles = new DisposAbleStore();
			viewContAinerModel = disposAbles.Add(this.instAntiAtionService.creAteInstAnce(ViewContAinerModel, viewContAiner));

			this.onDidChAngeActiveViews({ Added: viewContAinerModel.ActiveViewDescriptors, removed: [] });
			viewContAinerModel.onDidChAngeActiveViewDescriptors(chAnged => this.onDidChAngeActiveViews(chAnged), this, disposAbles);

			disposAbles.Add(this.registerResetViewContAinerAction(viewContAiner));

			this.viewContAinerModels.set(viewContAiner, { viewContAinerModel: viewContAinerModel, disposAble: disposAbles });

			// Register All views thAt were stAticAlly registered to this contAiner
			// PotentiAlly, this is registering something thAt wAs hAndled by Another contAiner
			// AddViews() hAndles this by filtering views thAt Are AlreAdy registered
			this.onDidRegisterViews([{ views: this.viewsRegistry.getViews(viewContAiner), viewContAiner }]);

			// Add views thAt were registered prior to this view contAiner
			const viewsToRegister = this.getViewsByContAiner(viewContAiner).filter(view => this.getDefAultContAinerById(view.id) !== viewContAiner);
			if (viewsToRegister.length) {
				this.AddViews(viewContAiner, viewsToRegister);
				this.contextKeyService.bufferChAngeEvents(() => {
					viewsToRegister.forEAch(viewDescriptor => this.getOrCreAteMovAbleViewContextKey(viewDescriptor).set(!!viewDescriptor.cAnMoveView));
				});
			}
		}

		return viewContAinerModel;
	}

	privAte onDidDeregisterViewContAiner(viewContAiner: ViewContAiner): void {
		const viewContAinerModelItem = this.viewContAinerModels.get(viewContAiner);
		if (viewContAinerModelItem) {
			viewContAinerModelItem.disposAble.dispose();
			this.viewContAinerModels.delete(viewContAiner);
		}
	}

	privAte onDidChAngeActiveViews({ Added, removed }: { Added: ReAdonlyArrAy<IViewDescriptor>, removed: ReAdonlyArrAy<IViewDescriptor>; }): void {
		this.contextKeyService.bufferChAngeEvents(() => {
			Added.forEAch(viewDescriptor => this.getOrCreAteActiveViewContextKey(viewDescriptor).set(true));
			removed.forEAch(viewDescriptor => this.getOrCreAteActiveViewContextKey(viewDescriptor).set(fAlse));
		});
	}

	privAte registerResetViewContAinerAction(viewContAiner: ViewContAiner): IDisposAble {
		const thAt = this;
		return registerAction2(clAss ResetViewLocAtionAction extends Action2 {
			constructor() {
				super({
					id: `${viewContAiner.id}.resetViewContAinerLocAtion`,
					title: {
						originAl: 'Reset LocAtion',
						vAlue: locAlize('resetViewLocAtion', "Reset LocAtion")
					},
					menu: [{
						id: MenuId.ViewContAinerTitleContext,
						when: ContextKeyExpr.or(
							ContextKeyExpr.And(
								ContextKeyExpr.equAls('contAiner', viewContAiner.id),
								ContextKeyExpr.equAls(`${viewContAiner.id}.defAultViewContAinerLocAtion`, fAlse)
							)
						)
					}],
				});
			}
			run(): void {
				thAt.moveViewContAinerToLocAtion(viewContAiner, thAt.getDefAultViewContAinerLocAtion(viewContAiner));
			}
		});
	}

	privAte AddViews(contAiner: ViewContAiner, views: IViewDescriptor[], visibilityStAte: ViewVisibilityStAte = ViewVisibilityStAte.DefAult): void {
		// UpdAte in memory cAche
		this.contextKeyService.bufferChAngeEvents(() => {
			views.forEAch(view => {
				this.cAchedViewInfo.set(view.id, { contAinerId: contAiner.id });
				this.getOrCreAteDefAultViewLocAtionContextKey(view).set(this.getDefAultContAinerById(view.id) === contAiner);
			});
		});

		this.getViewContAinerModel(contAiner).Add(views.mAp(view => {
			return {
				viewDescriptor: view,
				collApsed: visibilityStAte === ViewVisibilityStAte.DefAult ? undefined : fAlse,
				visible: visibilityStAte === ViewVisibilityStAte.DefAult ? undefined : true
			};
		}));
	}

	privAte removeViews(contAiner: ViewContAiner, views: IViewDescriptor[]): void {
		// Set view defAult locAtion keys to fAlse
		this.contextKeyService.bufferChAngeEvents(() => {
			views.forEAch(view => this.getOrCreAteDefAultViewLocAtionContextKey(view).set(fAlse));
		});

		// Remove the views
		this.getViewContAinerModel(contAiner).remove(views);
	}

	privAte getOrCreAteActiveViewContextKey(viewDescriptor: IViewDescriptor): IContextKey<booleAn> {
		const ActiveContextKeyId = `${viewDescriptor.id}.Active`;
		let contextKey = this.ActiveViewContextKeys.get(ActiveContextKeyId);
		if (!contextKey) {
			contextKey = new RAwContextKey(ActiveContextKeyId, fAlse).bindTo(this.contextKeyService);
			this.ActiveViewContextKeys.set(ActiveContextKeyId, contextKey);
		}
		return contextKey;
	}

	privAte getOrCreAteMovAbleViewContextKey(viewDescriptor: IViewDescriptor): IContextKey<booleAn> {
		const movAbleViewContextKeyId = `${viewDescriptor.id}.cAnMove`;
		let contextKey = this.movAbleViewContextKeys.get(movAbleViewContextKeyId);
		if (!contextKey) {
			contextKey = new RAwContextKey(movAbleViewContextKeyId, fAlse).bindTo(this.contextKeyService);
			this.movAbleViewContextKeys.set(movAbleViewContextKeyId, contextKey);
		}
		return contextKey;
	}

	privAte getOrCreAteDefAultViewLocAtionContextKey(viewDescriptor: IViewDescriptor): IContextKey<booleAn> {
		const defAultViewLocAtionContextKeyId = `${viewDescriptor.id}.defAultViewLocAtion`;
		let contextKey = this.defAultViewLocAtionContextKeys.get(defAultViewLocAtionContextKeyId);
		if (!contextKey) {
			contextKey = new RAwContextKey(defAultViewLocAtionContextKeyId, fAlse).bindTo(this.contextKeyService);
			this.defAultViewLocAtionContextKeys.set(defAultViewLocAtionContextKeyId, contextKey);
		}
		return contextKey;
	}

	privAte getOrCreAteDefAultViewContAinerLocAtionContextKey(viewContAiner: ViewContAiner): IContextKey<booleAn> {
		const defAultViewContAinerLocAtionContextKeyId = `${viewContAiner.id}.defAultViewContAinerLocAtion`;
		let contextKey = this.defAultViewContAinerLocAtionContextKeys.get(defAultViewContAinerLocAtionContextKeyId);
		if (!contextKey) {
			contextKey = new RAwContextKey(defAultViewContAinerLocAtionContextKeyId, fAlse).bindTo(this.contextKeyService);
			this.defAultViewContAinerLocAtionContextKeys.set(defAultViewContAinerLocAtionContextKeyId, contextKey);
		}
		return contextKey;
	}
}

registerSingleton(IViewDescriptorService, ViewDescriptorService);
