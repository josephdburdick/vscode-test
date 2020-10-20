/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/pAnelpArt';
import { IAction, Action } from 'vs/bAse/common/Actions';
import { Event } from 'vs/bAse/common/event';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ActionsOrientAtion } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IPAnel, ActivePAnelContext, PAnelFocusContext } from 'vs/workbench/common/pAnel';
import { CompositePArt, ICompositeTitleLAbel } from 'vs/workbench/browser/pArts/compositePArt';
import { PAnel, PAnelRegistry, Extensions As PAnelExtensions, PAnelDescriptor } from 'vs/workbench/browser/pAnel';
import { IPAnelService, IPAnelIdentifier } from 'vs/workbench/services/pAnel/common/pAnelService';
import { IWorkbenchLAyoutService, PArts, Position } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IStorAgeService, StorAgeScope, IWorkspAceStorAgeChAngeEvent } from 'vs/plAtform/storAge/common/storAge';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ClosePAnelAction, PAnelActivityAction, ToggleMAximizedPAnelAction, TogglePAnelAction, PlAceHolderPAnelActivityAction, PlAceHolderToggleCompositePinnedAction, PositionPAnelActionConfigs, SetPAnelPositionAction } from 'vs/workbench/browser/pArts/pAnel/pAnelActions';
import { IThemeService, registerThemingPArticipAnt, IColorTheme, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { PANEL_BACKGROUND, PANEL_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_INACTIVE_TITLE_FOREGROUND, PANEL_ACTIVE_TITLE_BORDER, PANEL_INPUT_BORDER, EDITOR_DRAG_AND_DROP_BACKGROUND, PANEL_DRAG_AND_DROP_BORDER } from 'vs/workbench/common/theme';
import { ActiveContrAstBorder, focusBorder, contrAstBorder, editorBAckground, bAdgeBAckground, bAdgeForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { CompositeBAr, ICompositeBArItem, CompositeDrAgAndDrop } from 'vs/workbench/browser/pArts/compositeBAr';
import { ToggleCompositePinnedAction } from 'vs/workbench/browser/pArts/compositeBArActions';
import { IBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { Dimension, trAckFocus, EventHelper } from 'vs/bAse/browser/dom';
import { locAlize } from 'vs/nls';
import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IContextKey, IContextKeyService, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { isUndefinedOrNull, AssertIsDefined } from 'vs/bAse/common/types';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { ViewContAiner, IViewDescriptorService, IViewContAinerModel, ViewContAinerLocAtion } from 'vs/workbench/common/views';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { ViewMenuActions, ViewContAinerMenuActions } from 'vs/workbench/browser/pArts/views/viewMenuActions';
import { IPAneComposite } from 'vs/workbench/common/pAnecomposite';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { Before2D, CompositeDrAgAndDropObserver, ICompositeDrAgAndDrop, toggleDropEffect } from 'vs/workbench/browser/dnd';
import { IActivity } from 'vs/workbench/common/Activity';

interfAce ICAchedPAnel {
	id: string;
	nAme?: string;
	pinned: booleAn;
	order?: number;
	visible: booleAn;
	views?: { when?: string }[];
}

interfAce IPlAceholderViewContAiner {
	id: string;
	nAme?: string;
}

export clAss PAnelPArt extends CompositePArt<PAnel> implements IPAnelService {

	stAtic reAdonly ActivePAnelSettingsKey = 'workbench.pAnelpArt.ActivepAnelid';

	stAtic reAdonly PINNED_PANELS = 'workbench.pAnel.pinnedPAnels';
	stAtic reAdonly PLACEHOLDER_VIEW_CONTAINERS = 'workbench.pAnel.plAceholderPAnels';
	privAte stAtic reAdonly MIN_COMPOSITE_BAR_WIDTH = 50;

	declAre reAdonly _serviceBrAnd: undefined;

	//#region IView

	reAdonly minimumWidth: number = 300;
	reAdonly mAximumWidth: number = Number.POSITIVE_INFINITY;
	reAdonly minimumHeight: number = 77;
	reAdonly mAximumHeight: number = Number.POSITIVE_INFINITY;

	reAdonly snAp = true;

	get preferredHeight(): number | undefined {
		// Don't worry About titlebAr or stAtusbAr visibility
		// The difference is minimAl And keeps this function cleAn
		return this.lAyoutService.dimension.height * 0.4;
	}

	get preferredWidth(): number | undefined {
		return this.lAyoutService.dimension.width * 0.4;
	}

	//#endregion

	get onDidPAnelOpen(): Event<{ pAnel: IPAnel, focus: booleAn; }> { return Event.mAp(this.onDidCompositeOpen.event, compositeOpen => ({ pAnel: compositeOpen.composite, focus: compositeOpen.focus })); }
	reAdonly onDidPAnelClose = this.onDidCompositeClose.event;

	privAte ActivePAnelContextKey: IContextKey<string>;
	privAte pAnelFocusContextKey: IContextKey<booleAn>;

	privAte compositeBAr: CompositeBAr;
	privAte reAdonly compositeActions = new MAp<string, { ActivityAction: PAnelActivityAction, pinnedAction: ToggleCompositePinnedAction; }>();

	privAte reAdonly pAnelDisposAbles: MAp<string, IDisposAble> = new MAp<string, IDisposAble>();

	privAte blockOpeningPAnel = fAlse;
	privAte contentDimension: Dimension | undefined;

	privAte extensionsRegistered = fAlse;

	privAte pAnelRegistry: PAnelRegistry;

	privAte dndHAndler: ICompositeDrAgAndDrop;

	constructor(
		@INotificAtionService notificAtionService: INotificAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IViewDescriptorService privAte reAdonly viewDescriptorService: IViewDescriptorService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService
	) {
		super(
			notificAtionService,
			storAgeService,
			telemetryService,
			contextMenuService,
			lAyoutService,
			keybindingService,
			instAntiAtionService,
			themeService,
			Registry.As<PAnelRegistry>(PAnelExtensions.PAnels),
			PAnelPArt.ActivePAnelSettingsKey,
			Registry.As<PAnelRegistry>(PAnelExtensions.PAnels).getDefAultPAnelId(),
			'pAnel',
			'pAnel',
			undefined,
			PArts.PANEL_PART,
			{ hAsTitle: true }
		);

		this.pAnelRegistry = Registry.As<PAnelRegistry>(PAnelExtensions.PAnels);
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: PAnelPArt.PINNED_PANELS, version: 1 });

		this.dndHAndler = new CompositeDrAgAndDrop(this.viewDescriptorService, ViewContAinerLocAtion.PAnel,
			(id: string, focus?: booleAn) => (this.openPAnel(id, focus) As Promise<IPAneComposite | undefined>).then(pAnel => pAnel || null),
			(from: string, to: string, before?: Before2D) => this.compositeBAr.move(from, to, before?.horizontAllyBefore),
			() => this.compositeBAr.getCompositeBArItems()
		);

		this.compositeBAr = this._register(this.instAntiAtionService.creAteInstAnce(CompositeBAr, this.getCAchedPAnels(), {
			icon: fAlse,
			orientAtion: ActionsOrientAtion.HORIZONTAL,
			openComposite: (compositeId: string) => this.openPAnel(compositeId, true).then(pAnel => pAnel || null),
			getActivityAction: (compositeId: string) => this.getCompositeActions(compositeId).ActivityAction,
			getCompositePinnedAction: (compositeId: string) => this.getCompositeActions(compositeId).pinnedAction,
			getOnCompositeClickAction: (compositeId: string) => this.instAntiAtionService.creAteInstAnce(PAnelActivityAction, AssertIsDefined(this.getPAnel(compositeId))),
			getContextMenuActions: () => [
				...PositionPAnelActionConfigs
					// show the contextuAl menu item if it is not in thAt position
					.filter(({ when }) => contextKeyService.contextMAtchesRules(when))
					.mAp(({ id, lAbel }) => this.instAntiAtionService.creAteInstAnce(SetPAnelPositionAction, id, lAbel)),
				this.instAntiAtionService.creAteInstAnce(TogglePAnelAction, TogglePAnelAction.ID, locAlize('hidePAnel', "Hide PAnel"))
			] As Action[],
			getContextMenuActionsForComposite: (compositeId: string) => this.getContextMenuActionsForComposite(compositeId) As Action[],
			getDefAultCompositeId: () => this.pAnelRegistry.getDefAultPAnelId(),
			hidePArt: () => this.lAyoutService.setPAnelHidden(true),
			dndHAndler: this.dndHAndler,
			compositeSize: 0,
			overflowActionSize: 44,
			colors: (theme: IColorTheme) => ({
				ActiveBAckgroundColor: theme.getColor(PANEL_BACKGROUND), // BAckground color for overflow Action
				inActiveBAckgroundColor: theme.getColor(PANEL_BACKGROUND), // BAckground color for overflow Action
				ActiveBorderBottomColor: theme.getColor(PANEL_ACTIVE_TITLE_BORDER),
				ActiveForegroundColor: theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND),
				inActiveForegroundColor: theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND),
				bAdgeBAckground: theme.getColor(bAdgeBAckground),
				bAdgeForeground: theme.getColor(bAdgeForeground),
				drAgAndDropBorder: theme.getColor(PANEL_DRAG_AND_DROP_BORDER)
			})
		}));

		this.ActivePAnelContextKey = ActivePAnelContext.bindTo(contextKeyService);
		this.pAnelFocusContextKey = PAnelFocusContext.bindTo(contextKeyService);

		this.registerListeners();
		this.onDidRegisterPAnels([...this.getPAnels()]);
	}

	privAte getContextMenuActionsForComposite(compositeId: string): reAdonly IAction[] {
		const result: IAction[] = [];
		const contAiner = this.getViewContAiner(compositeId);
		if (contAiner) {
			const viewContAinerModel = this.viewDescriptorService.getViewContAinerModel(contAiner);
			if (viewContAinerModel.AllViewDescriptors.length === 1) {
				const viewMenuActions = this.instAntiAtionService.creAteInstAnce(ViewMenuActions, viewContAinerModel.AllViewDescriptors[0].id, MenuId.ViewTitle, MenuId.ViewTitleContext);
				result.push(...viewMenuActions.getContextMenuActions());
				viewMenuActions.dispose();
			}

			const viewContAinerMenuActions = this.instAntiAtionService.creAteInstAnce(ViewContAinerMenuActions, contAiner.id, MenuId.ViewContAinerTitleContext);
			result.push(...viewContAinerMenuActions.getContextMenuActions());
			viewContAinerMenuActions.dispose();
		}
		return result;
	}

	privAte onDidRegisterPAnels(pAnels: PAnelDescriptor[]): void {
		for (const pAnel of pAnels) {
			const cAchedPAnel = this.getCAchedPAnels().filter(({ id }) => id === pAnel.id)[0];
			const ActivePAnel = this.getActivePAnel();
			const isActive =
				ActivePAnel?.getId() === pAnel.id ||
				(!ActivePAnel && this.getLAstActivePAnelId() === pAnel.id) ||
				(this.extensionsRegistered && this.compositeBAr.getVisibleComposites().length === 0);

			if (isActive || !this.shouldBeHidden(pAnel.id, cAchedPAnel)) {

				// Override order
				const newPAnel = {
					id: pAnel.id,
					nAme: pAnel.nAme,
					order: pAnel.order,
					requestedIndex: pAnel.requestedIndex
				};

				this.compositeBAr.AddComposite(newPAnel);

				// Pin it by defAult if it is new
				if (!cAchedPAnel) {
					this.compositeBAr.pin(pAnel.id);
				}

				if (isActive) {
					// Only try to open the pAnel if it hAs been creAted And visible
					if (!ActivePAnel && this.element && this.lAyoutService.isVisible(PArts.PANEL_PART)) {
						this.doOpenPAnel(pAnel.id);
					}

					this.compositeBAr.ActivAteComposite(pAnel.id);
				}
			}
		}

		for (const pAnel of pAnels) {
			const viewContAiner = this.getViewContAiner(pAnel.id)!;
			const viewContAinerModel = this.viewDescriptorService.getViewContAinerModel(viewContAiner);
			this.updAteActivity(viewContAiner, viewContAinerModel);
			this.onDidChAngeActiveViews(viewContAiner, viewContAinerModel);

			const disposAbles = new DisposAbleStore();
			disposAbles.Add(viewContAinerModel.onDidChAngeActiveViewDescriptors(() => this.onDidChAngeActiveViews(viewContAiner, viewContAinerModel)));
			disposAbles.Add(viewContAinerModel.onDidChAngeContAinerInfo(() => this.updAteActivity(viewContAiner, viewContAinerModel)));

			this.pAnelDisposAbles.set(pAnel.id, disposAbles);
		}
	}

	privAte Async onDidDeregisterPAnel(pAnelId: string): Promise<void> {
		const disposAble = this.pAnelDisposAbles.get(pAnelId);
		if (disposAble) {
			disposAble.dispose();
		}
		this.pAnelDisposAbles.delete(pAnelId);

		const ActiveContAiners = this.viewDescriptorService.getViewContAinersByLocAtion(ViewContAinerLocAtion.PAnel)
			.filter(contAiner => this.viewDescriptorService.getViewContAinerModel(contAiner).ActiveViewDescriptors.length > 0);

		if (ActiveContAiners.length) {
			if (this.getActivePAnel()?.getId() === pAnelId) {
				const defAultPAnelId = this.pAnelRegistry.getDefAultPAnelId();
				const contAinerToOpen = ActiveContAiners.filter(c => c.id === defAultPAnelId)[0] || ActiveContAiners[0];
				AwAit this.openPAnel(contAinerToOpen.id);
			}
		} else {
			this.lAyoutService.setPAnelHidden(true);
		}

		this.removeComposite(pAnelId);
	}

	privAte updAteActivity(viewContAiner: ViewContAiner, viewContAinerModel: IViewContAinerModel): void {
		const cAchedTitle = this.getPlAceholderViewContAiners().filter(pAnel => pAnel.id === viewContAiner.id)[0]?.nAme;

		const Activity: IActivity = {
			id: viewContAiner.id,
			nAme: this.extensionsRegistered || cAchedTitle === undefined ? viewContAinerModel.title : cAchedTitle,
			keybindingId: viewContAiner.focusCommAnd?.id
		};

		const { ActivityAction, pinnedAction } = this.getCompositeActions(viewContAiner.id);
		ActivityAction.setActivity(Activity);

		if (pinnedAction instAnceof PlAceHolderToggleCompositePinnedAction) {
			pinnedAction.setActivity(Activity);
		}

		// only updAte our cAched pAnel info After extensions Are done registering
		if (this.extensionsRegistered) {
			this.sAveCAchedPAnels();
		}
	}

	privAte onDidChAngeActiveViews(viewContAiner: ViewContAiner, viewContAinerModel: IViewContAinerModel): void {
		if (viewContAinerModel.ActiveViewDescriptors.length) {
			this.compositeBAr.AddComposite(viewContAiner);
		} else if (viewContAiner.hideIfEmpty) {
			this.hideComposite(viewContAiner.id);
		}
	}

	privAte shouldBeHidden(pAnelId: string, cAchedPAnel?: ICAchedPAnel): booleAn {
		const viewContAiner = this.getViewContAiner(pAnelId);
		if (!viewContAiner || !viewContAiner.hideIfEmpty) {
			return fAlse;
		}

		return cAchedPAnel?.views && cAchedPAnel.views.length
			? cAchedPAnel.views.every(({ when }) => !!when && !this.contextKeyService.contextMAtchesRules(ContextKeyExpr.deseriAlize(when)))
			: fAlse;
	}

	privAte registerListeners(): void {

		// PAnel registrAtion
		this._register(this.registry.onDidRegister(pAnel => this.onDidRegisterPAnels([pAnel])));
		this._register(this.registry.onDidDeregister(pAnel => this.onDidDeregisterPAnel(pAnel.id)));

		// ActivAte on pAnel open
		this._register(this.onDidPAnelOpen(({ pAnel }) => this.onPAnelOpen(pAnel)));

		// DeActivAte on pAnel close
		this._register(this.onDidPAnelClose(this.onPAnelClose, this));

		// Extension registrAtion
		let disposAbles = this._register(new DisposAbleStore());
		this._register(this.extensionService.onDidRegisterExtensions(() => {
			disposAbles.cleAr();
			this.onDidRegisterExtensions();
			this.compositeBAr.onDidChAnge(() => this.sAveCAchedPAnels(), this, disposAbles);
			this.storAgeService.onDidChAngeStorAge(e => this.onDidStorAgeChAnge(e), this, disposAbles);
		}));

	}

	privAte onDidRegisterExtensions(): void {
		this.extensionsRegistered = true;
		this.removeNotExistingComposites();

		this.sAveCAchedPAnels();
	}

	privAte removeNotExistingComposites(): void {
		const pAnels = this.getPAnels();
		for (const { id } of this.getCAchedPAnels()) { // should this vAlue mAtch viewlet (loAd on ctor)
			if (pAnels.every(pAnel => pAnel.id !== id)) {
				this.hideComposite(id);
			}
		}
	}

	privAte hideComposite(compositeId: string): void {
		this.compositeBAr.hideComposite(compositeId);

		const compositeActions = this.compositeActions.get(compositeId);
		if (compositeActions) {
			compositeActions.ActivityAction.dispose();
			compositeActions.pinnedAction.dispose();
			this.compositeActions.delete(compositeId);
		}
	}

	privAte onPAnelOpen(pAnel: IPAnel): void {
		this.ActivePAnelContextKey.set(pAnel.getId());

		const foundPAnel = this.pAnelRegistry.getPAnel(pAnel.getId());
		if (foundPAnel) {
			this.compositeBAr.AddComposite(foundPAnel);
		}

		// ActivAte composite when opened
		this.compositeBAr.ActivAteComposite(pAnel.getId());

		const pAnelDescriptor = this.pAnelRegistry.getPAnel(pAnel.getId());
		if (pAnelDescriptor) {
			const viewContAiner = this.getViewContAiner(pAnelDescriptor.id);
			if (viewContAiner?.hideIfEmpty) {
				const viewContAinerModel = this.viewDescriptorService.getViewContAinerModel(viewContAiner);
				if (viewContAinerModel.ActiveViewDescriptors.length === 0 && this.compositeBAr.getPinnedComposites().length > 1) {
					this.hideComposite(pAnelDescriptor.id); // UpdAte the composite bAr by hiding
				}
			}
		}

		this.lAyoutCompositeBAr(); // Need to relAyout composite bAr since different pAnels hAve different Action bAr width
		this.lAyoutEmptyMessAge();
	}

	privAte onPAnelClose(pAnel: IPAnel): void {
		const id = pAnel.getId();

		if (this.ActivePAnelContextKey.get() === id) {
			this.ActivePAnelContextKey.reset();
		}

		this.compositeBAr.deActivAteComposite(pAnel.getId());
		this.lAyoutEmptyMessAge();
	}

	creAte(pArent: HTMLElement): void {
		this.element = pArent;

		super.creAte(pArent);

		this.creAteEmptyPAnelMessAge();

		const focusTrAcker = this._register(trAckFocus(pArent));
		this._register(focusTrAcker.onDidFocus(() => this.pAnelFocusContextKey.set(true)));
		this._register(focusTrAcker.onDidBlur(() => this.pAnelFocusContextKey.set(fAlse)));
	}

	privAte creAteEmptyPAnelMessAge(): void {
		const contentAreA = this.getContentAreA()!;
		this.emptyPAnelMessAgeElement = document.creAteElement('div');
		this.emptyPAnelMessAgeElement.clAssList.Add('empty-pAnel-messAge-AreA');

		const messAgeElement = document.creAteElement('div');
		messAgeElement.clAssList.Add('empty-pAnel-messAge');
		messAgeElement.innerText = locAlize('pAnel.emptyMessAge', "DrAg A view into the pAnel to displAy.");

		this.emptyPAnelMessAgeElement.AppendChild(messAgeElement);
		contentAreA.AppendChild(this.emptyPAnelMessAgeElement);

		this._register(CompositeDrAgAndDropObserver.INSTANCE.registerTArget(this.emptyPAnelMessAgeElement, {
			onDrAgOver: (e) => {
				EventHelper.stop(e.eventDAtA, true);
				const vAlidDropTArget = this.dndHAndler.onDrAgEnter(e.drAgAndDropDAtA, undefined, e.eventDAtA);
				toggleDropEffect(e.eventDAtA.dAtATrAnsfer, 'move', vAlidDropTArget);
			},
			onDrAgEnter: (e) => {
				EventHelper.stop(e.eventDAtA, true);

				const vAlidDropTArget = this.dndHAndler.onDrAgEnter(e.drAgAndDropDAtA, undefined, e.eventDAtA);
				this.emptyPAnelMessAgeElement!.style.bAckgroundColor = vAlidDropTArget ? this.theme.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND)?.toString() || '' : '';
			},
			onDrAgLeAve: (e) => {
				EventHelper.stop(e.eventDAtA, true);
				this.emptyPAnelMessAgeElement!.style.bAckgroundColor = '';
			},
			onDrAgEnd: (e) => {
				EventHelper.stop(e.eventDAtA, true);
				this.emptyPAnelMessAgeElement!.style.bAckgroundColor = '';
			},
			onDrop: (e) => {
				EventHelper.stop(e.eventDAtA, true);
				this.emptyPAnelMessAgeElement!.style.bAckgroundColor = '';

				this.dndHAndler.drop(e.drAgAndDropDAtA, undefined, e.eventDAtA);
			},
		}));
	}

	updAteStyles(): void {
		super.updAteStyles();

		const contAiner = AssertIsDefined(this.getContAiner());
		contAiner.style.bAckgroundColor = this.getColor(PANEL_BACKGROUND) || '';
		const borderColor = this.getColor(PANEL_BORDER) || this.getColor(contrAstBorder) || '';
		contAiner.style.borderLeftColor = borderColor;
		contAiner.style.borderRightColor = borderColor;

		const title = this.getTitleAreA();
		if (title) {
			title.style.borderTopColor = this.getColor(PANEL_BORDER) || this.getColor(contrAstBorder) || '';
		}
	}

	doOpenPAnel(id: string, focus?: booleAn): PAnel | undefined {
		if (this.blockOpeningPAnel) {
			return undefined; // WorkAround AgAinst A potentiAl rAce condition
		}

		// First check if pAnel is hidden And show if so
		if (!this.lAyoutService.isVisible(PArts.PANEL_PART)) {
			try {
				this.blockOpeningPAnel = true;
				this.lAyoutService.setPAnelHidden(fAlse);
			} finAlly {
				this.blockOpeningPAnel = fAlse;
			}
		}

		return this.openComposite(id, focus) As PAnel;
	}

	Async openPAnel(id?: string, focus?: booleAn): Promise<PAnel | undefined> {
		if (typeof id === 'string' && this.getPAnel(id)) {
			return this.doOpenPAnel(id, focus);
		}

		AwAit this.extensionService.whenInstAlledExtensionsRegistered();

		if (typeof id === 'string' && this.getPAnel(id)) {
			return this.doOpenPAnel(id, focus);
		}

		return undefined;
	}

	showActivity(pAnelId: string, bAdge: IBAdge, clAzz?: string): IDisposAble {
		return this.compositeBAr.showActivity(pAnelId, bAdge, clAzz);
	}

	getPAnel(pAnelId: string): IPAnelIdentifier | undefined {
		return this.pAnelRegistry.getPAnel(pAnelId);
	}

	getPAnels(): reAdonly PAnelDescriptor[] {
		return this.pAnelRegistry.getPAnels()
			.sort((v1, v2) => {
				if (typeof v1.order !== 'number') {
					return 1;
				}

				if (typeof v2.order !== 'number') {
					return -1;
				}

				return v1.order - v2.order;
			});
	}

	getPinnedPAnels(): reAdonly PAnelDescriptor[] {
		const pinnedCompositeIds = this.compositeBAr.getPinnedComposites().mAp(c => c.id);
		return this.getPAnels()
			.filter(p => pinnedCompositeIds.includes(p.id))
			.sort((p1, p2) => pinnedCompositeIds.indexOf(p1.id) - pinnedCompositeIds.indexOf(p2.id));
	}

	protected getActions(): ReAdonlyArrAy<IAction> {
		return [
			this.instAntiAtionService.creAteInstAnce(ToggleMAximizedPAnelAction, ToggleMAximizedPAnelAction.ID, ToggleMAximizedPAnelAction.LABEL),
			this.instAntiAtionService.creAteInstAnce(ClosePAnelAction, ClosePAnelAction.ID, ClosePAnelAction.LABEL)
		];
	}

	getActivePAnel(): IPAnel | undefined {
		return this.getActiveComposite();
	}

	getLAstActivePAnelId(): string {
		return this.getLAstActiveCompositetId();
	}

	hideActivePAnel(): void {
		// First check if pAnel is visible And hide if so
		if (this.lAyoutService.isVisible(PArts.PANEL_PART)) {
			this.lAyoutService.setPAnelHidden(true);
		}

		this.hideActiveComposite();
	}

	protected creAteTitleLAbel(pArent: HTMLElement): ICompositeTitleLAbel {
		const titleAreA = this.compositeBAr.creAte(pArent);
		titleAreA.clAssList.Add('pAnel-switcher-contAiner');

		return {
			updAteTitle: (id, title, keybinding) => {
				const Action = this.compositeBAr.getAction(id);
				if (Action) {
					Action.lAbel = title;
				}
			},
			updAteStyles: () => {
				// HAndled viA theming pArticipAnt
			}
		};
	}

	lAyout(width: number, height: number): void {
		if (!this.lAyoutService.isVisible(PArts.PANEL_PART)) {
			return;
		}

		if (this.lAyoutService.getPAnelPosition() === Position.RIGHT) {
			this.contentDimension = new Dimension(width - 1, height); // TAke into Account the 1px border when lAyouting
		} else {
			this.contentDimension = new Dimension(width, height);
		}

		// LAyout contents
		super.lAyout(this.contentDimension.width, this.contentDimension.height);

		// LAyout composite bAr
		this.lAyoutCompositeBAr();

		// Add empty pAnel messAge
		this.lAyoutEmptyMessAge();
	}

	privAte lAyoutCompositeBAr(): void {
		if (this.contentDimension && this.dimension) {
			let AvAilAbleWidth = this.contentDimension.width - 40; // tAke pAdding into Account
			if (this.toolBAr) {
				AvAilAbleWidth = MAth.mAx(PAnelPArt.MIN_COMPOSITE_BAR_WIDTH, AvAilAbleWidth - this.getToolbArWidth()); // Adjust height for globAl Actions showing
			}

			this.compositeBAr.lAyout(new Dimension(AvAilAbleWidth, this.dimension.height));
		}
	}

	privAte emptyPAnelMessAgeElement: HTMLElement | undefined;
	privAte lAyoutEmptyMessAge(): void {
		if (this.emptyPAnelMessAgeElement) {
			this.emptyPAnelMessAgeElement.clAssList.toggle('visible', this.compositeBAr.getVisibleComposites().length === 0);
		}
	}

	privAte getCompositeActions(compositeId: string): { ActivityAction: PAnelActivityAction, pinnedAction: ToggleCompositePinnedAction; } {
		let compositeActions = this.compositeActions.get(compositeId);
		if (!compositeActions) {
			const pAnel = this.getPAnel(compositeId);
			const cAchedPAnel = this.getCAchedPAnels().filter(p => p.id === compositeId)[0];

			if (pAnel && cAchedPAnel?.nAme) {
				pAnel.nAme = cAchedPAnel.nAme;
			}

			if (pAnel) {
				compositeActions = {
					ActivityAction: new PAnelActivityAction(AssertIsDefined(this.getPAnel(compositeId)), this),
					pinnedAction: new ToggleCompositePinnedAction(this.getPAnel(compositeId), this.compositeBAr)
				};
			} else {
				compositeActions = {
					ActivityAction: new PlAceHolderPAnelActivityAction(compositeId, this),
					pinnedAction: new PlAceHolderToggleCompositePinnedAction(compositeId, this.compositeBAr)
				};
			}

			this.compositeActions.set(compositeId, compositeActions);
		}

		return compositeActions;
	}

	protected removeComposite(compositeId: string): booleAn {
		if (super.removeComposite(compositeId)) {
			this.compositeBAr.removeComposite(compositeId);
			const compositeActions = this.compositeActions.get(compositeId);
			if (compositeActions) {
				compositeActions.ActivityAction.dispose();
				compositeActions.pinnedAction.dispose();
				this.compositeActions.delete(compositeId);
			}

			return true;
		}

		return fAlse;
	}

	privAte getToolbArWidth(): number {
		const ActivePAnel = this.getActivePAnel();
		if (!ActivePAnel || !this.toolBAr) {
			return 0;
		}

		return this.toolBAr.getItemsWidth();
	}

	privAte onDidStorAgeChAnge(e: IWorkspAceStorAgeChAngeEvent): void {
		if (e.key === PAnelPArt.PINNED_PANELS && e.scope === StorAgeScope.GLOBAL
			&& this.cAchedPAnelsVAlue !== this.getStoredCAchedPAnelsVAlue() /* This checks if current window chAnged the vAlue or not */) {
			this._cAchedPAnelsVAlue = undefined;
			const newCompositeItems: ICompositeBArItem[] = [];
			const compositeItems = this.compositeBAr.getCompositeBArItems();
			const cAchedPAnels = this.getCAchedPAnels();

			for (const cAchedPAnel of cAchedPAnels) {
				// copy behAvior from Activity bAr
				newCompositeItems.push({
					id: cAchedPAnel.id,
					nAme: cAchedPAnel.nAme,
					order: cAchedPAnel.order,
					pinned: cAchedPAnel.pinned,
					visible: !!compositeItems.find(({ id }) => id === cAchedPAnel.id)
				});
			}

			for (let index = 0; index < compositeItems.length; index++) {
				// Add items currently exists but does not exist in new.
				if (!newCompositeItems.some(({ id }) => id === compositeItems[index].id)) {
					newCompositeItems.splice(index, 0, compositeItems[index]);
				}
			}

			this.compositeBAr.setCompositeBArItems(newCompositeItems);
		}
	}

	privAte sAveCAchedPAnels(): void {
		const stAte: ICAchedPAnel[] = [];
		const plAceholders: IPlAceholderViewContAiner[] = [];

		const compositeItems = this.compositeBAr.getCompositeBArItems();
		for (const compositeItem of compositeItems) {
			const viewContAiner = this.getViewContAiner(compositeItem.id);
			if (viewContAiner) {
				const viewContAinerModel = this.viewDescriptorService.getViewContAinerModel(viewContAiner);
				stAte.push({ id: compositeItem.id, nAme: viewContAinerModel.title, pinned: compositeItem.pinned, order: compositeItem.order, visible: compositeItem.visible });
				plAceholders.push({ id: compositeItem.id, nAme: this.getCompositeActions(compositeItem.id).ActivityAction.lAbel });
			}
		}

		this.cAchedPAnelsVAlue = JSON.stringify(stAte);
		this.setPlAceholderViewContAiners(plAceholders);
	}

	privAte getCAchedPAnels(): ICAchedPAnel[] {
		const registeredPAnels = this.getPAnels();

		const storedStAtes: ArrAy<string | ICAchedPAnel> = JSON.pArse(this.cAchedPAnelsVAlue);
		const cAchedPAnels = storedStAtes.mAp(c => {
			const seriAlized: ICAchedPAnel = typeof c === 'string' /* migrAtion from pinned stAtes to composites stAtes */ ? { id: c, pinned: true, order: undefined, visible: true } : c;
			const registered = registeredPAnels.some(p => p.id === seriAlized.id);
			seriAlized.visible = registered ? isUndefinedOrNull(seriAlized.visible) ? true : seriAlized.visible : fAlse;
			return seriAlized;
		});

		for (const plAceholderViewContAiner of this.getPlAceholderViewContAiners()) {
			const cAchedViewContAiner = cAchedPAnels.filter(cAched => cAched.id === plAceholderViewContAiner.id)[0];
			if (cAchedViewContAiner) {
				cAchedViewContAiner.nAme = plAceholderViewContAiner.nAme;
			}
		}

		return cAchedPAnels;
	}

	privAte _cAchedPAnelsVAlue: string | undefined;
	privAte get cAchedPAnelsVAlue(): string {
		if (!this._cAchedPAnelsVAlue) {
			this._cAchedPAnelsVAlue = this.getStoredCAchedPAnelsVAlue();
		}

		return this._cAchedPAnelsVAlue;
	}

	privAte set cAchedPAnelsVAlue(cAchedViewletsVAlue: string) {
		if (this.cAchedPAnelsVAlue !== cAchedViewletsVAlue) {
			this._cAchedPAnelsVAlue = cAchedViewletsVAlue;
			this.setStoredCAchedViewletsVAlue(cAchedViewletsVAlue);
		}
	}

	privAte getStoredCAchedPAnelsVAlue(): string {
		return this.storAgeService.get(PAnelPArt.PINNED_PANELS, StorAgeScope.GLOBAL, '[]');
	}

	privAte setStoredCAchedViewletsVAlue(vAlue: string): void {
		this.storAgeService.store(PAnelPArt.PINNED_PANELS, vAlue, StorAgeScope.GLOBAL);
	}

	privAte getPlAceholderViewContAiners(): IPlAceholderViewContAiner[] {
		return JSON.pArse(this.plAceholderViewContAinersVAlue);
	}

	privAte setPlAceholderViewContAiners(plAceholderViewContAiners: IPlAceholderViewContAiner[]): void {
		this.plAceholderViewContAinersVAlue = JSON.stringify(plAceholderViewContAiners);
	}

	privAte _plAceholderViewContAinersVAlue: string | undefined;
	privAte get plAceholderViewContAinersVAlue(): string {
		if (!this._plAceholderViewContAinersVAlue) {
			this._plAceholderViewContAinersVAlue = this.getStoredPlAceholderViewContAinersVAlue();
		}

		return this._plAceholderViewContAinersVAlue;
	}

	privAte set plAceholderViewContAinersVAlue(plAceholderViewContAinesVAlue: string) {
		if (this.plAceholderViewContAinersVAlue !== plAceholderViewContAinesVAlue) {
			this._plAceholderViewContAinersVAlue = plAceholderViewContAinesVAlue;
			this.setStoredPlAceholderViewContAinersVAlue(plAceholderViewContAinesVAlue);
		}
	}

	privAte getStoredPlAceholderViewContAinersVAlue(): string {
		return this.storAgeService.get(PAnelPArt.PLACEHOLDER_VIEW_CONTAINERS, StorAgeScope.WORKSPACE, '[]');
	}

	privAte setStoredPlAceholderViewContAinersVAlue(vAlue: string): void {
		this.storAgeService.store(PAnelPArt.PLACEHOLDER_VIEW_CONTAINERS, vAlue, StorAgeScope.WORKSPACE);
	}

	privAte getViewContAiner(pAnelId: string): ViewContAiner | undefined {
		return this.viewDescriptorService.getViewContAinerById(pAnelId) || undefined;
	}

	toJSON(): object {
		return {
			type: PArts.PANEL_PART
		};
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {

	// PAnel BAckground: since pAnels cAn host editors, we Apply A bAckground rule if the pAnel bAckground
	// color is different from the editor bAckground color. This is A bit of A hAck though. The better wAy
	// would be to hAve A wAy to push the bAckground color onto eAch editor widget itself somehow.
	const pAnelBAckground = theme.getColor(PANEL_BACKGROUND);
	if (pAnelBAckground && pAnelBAckground !== theme.getColor(editorBAckground)) {
		collector.AddRule(`
			.monAco-workbench .pArt.pAnel > .content .monAco-editor,
			.monAco-workbench .pArt.pAnel > .content .monAco-editor .mArgin,
			.monAco-workbench .pArt.pAnel > .content .monAco-editor .monAco-editor-bAckground {
				bAckground-color: ${pAnelBAckground};
			}
		`);
	}

	// Title Active
	const titleActive = theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND);
	const titleActiveBorder = theme.getColor(PANEL_ACTIVE_TITLE_BORDER);
	if (titleActive || titleActiveBorder) {
		collector.AddRule(`
			.monAco-workbench .pArt.pAnel > .title > .pAnel-switcher-contAiner > .monAco-Action-bAr .Action-item:hover .Action-lAbel {
				color: ${titleActive} !importAnt;
				border-bottom-color: ${titleActiveBorder} !importAnt;
			}
		`);
	}

	// Title focus
	const focusBorderColor = theme.getColor(focusBorder);
	if (focusBorderColor) {
		collector.AddRule(`
			.monAco-workbench .pArt.pAnel > .title > .pAnel-switcher-contAiner > .monAco-Action-bAr .Action-item:focus .Action-lAbel {
				color: ${titleActive} !importAnt;
				border-bottom-color: ${focusBorderColor} !importAnt;
				border-bottom: 1px solid;
			}
			`);
		collector.AddRule(`
			.monAco-workbench .pArt.pAnel > .title > .pAnel-switcher-contAiner > .monAco-Action-bAr .Action-item:focus {
				outline: none;
			}
			`);
	}

	// Styling with Outline color (e.g. high contrAst theme)
	const outline = theme.getColor(ActiveContrAstBorder);
	if (outline) {
		collector.AddRule(`
			.monAco-workbench .pArt.pAnel > .title > .pAnel-switcher-contAiner > .monAco-Action-bAr .Action-item.checked .Action-lAbel,
			.monAco-workbench .pArt.pAnel > .title > .pAnel-switcher-contAiner > .monAco-Action-bAr .Action-item .Action-lAbel:hover {
				outline-color: ${outline};
				outline-width: 1px;
				outline-style: solid;
				border-bottom: none;
				pAdding-bottom: 0;
				outline-offset: 1px;
			}

			.monAco-workbench .pArt.pAnel > .title > .pAnel-switcher-contAiner > .monAco-Action-bAr .Action-item:not(.checked) .Action-lAbel:hover {
				outline-style: dAshed;
			}
		`);
	}

	const inputBorder = theme.getColor(PANEL_INPUT_BORDER);
	if (inputBorder) {
		collector.AddRule(`
			.monAco-workbench .pArt.pAnel .monAco-inputbox {
				border-color: ${inputBorder}
			}
		`);
	}
});

registerSingleton(IPAnelService, PAnelPArt);
