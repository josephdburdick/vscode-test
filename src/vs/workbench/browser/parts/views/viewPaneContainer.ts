/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/pAneviewlet';
import * As nls from 'vs/nls';
import { Event, Emitter } from 'vs/bAse/common/event';
import { ColorIdentifier, ActiveContrAstBorder, foreground } from 'vs/plAtform/theme/common/colorRegistry';
import { AttAchStyler, IColorMApping, AttAchButtonStyler, AttAchLinkStyler, AttAchProgressBArStyler } from 'vs/plAtform/theme/common/styler';
import { SIDE_BAR_DRAG_AND_DROP_BACKGROUND, SIDE_BAR_SECTION_HEADER_FOREGROUND, SIDE_BAR_SECTION_HEADER_BACKGROUND, SIDE_BAR_SECTION_HEADER_BORDER, PANEL_BACKGROUND, SIDE_BAR_BACKGROUND, PANEL_SECTION_HEADER_FOREGROUND, PANEL_SECTION_HEADER_BACKGROUND, PANEL_SECTION_HEADER_BORDER, PANEL_SECTION_DRAG_AND_DROP_BACKGROUND, PANEL_SECTION_BORDER } from 'vs/workbench/common/theme';
import { After, Append, $, trAckFocus, EventType, isAncestor, Dimension, AddDisposAbleListener, creAteCSSRule, AsCSSUrl } from 'vs/bAse/browser/dom';
import { IDisposAble, combinedDisposAble, dispose, toDisposAble, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IAction, SepArAtor, IActionViewItem } from 'vs/bAse/common/Actions';
import { ActionsOrientAtion, prepAreActions } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ToolBAr } from 'vs/bAse/browser/ui/toolbAr/toolbAr';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { PAneView, IPAneViewOptions, IPAneOptions, PAne, IPAneStyles } from 'vs/bAse/browser/ui/splitview/pAneview';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchLAyoutService, Position } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { Extensions As ViewContAinerExtensions, IView, FocusedViewContext, IViewDescriptor, ViewContAiner, IViewDescriptorService, ViewContAinerLocAtion, IViewPAneContAiner, IViewsRegistry, IViewContentDescriptor, IAddedViewDescriptorRef, IViewDescriptorRef, IViewContAinerModel } from 'vs/workbench/common/views';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { AssertIsDefined, isString } from 'vs/bAse/common/types';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { Component } from 'vs/workbench/common/component';
import { MenuId, MenuItemAction, registerAction2, Action2, IAction2Options, SubmenuItemAction } from 'vs/plAtform/Actions/common/Actions';
import { MenuEntryActionViewItem, SubmenuEntryActionViewItem } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { ViewMenuActions } from 'vs/workbench/browser/pArts/views/viewMenuActions';
import { pArseLinkedText } from 'vs/bAse/common/linkedText';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { Button } from 'vs/bAse/browser/ui/button/button';
import { Link } from 'vs/plAtform/opener/browser/link';
import { CompositeDrAgAndDropObserver, DrAgAndDropObserver, toggleDropEffect } from 'vs/workbench/browser/dnd';
import { OrientAtion } from 'vs/bAse/browser/ui/sAsh/sAsh';
import { ProgressBAr } from 'vs/bAse/browser/ui/progressbAr/progressbAr';
import { CompositeProgressIndicAtor } from 'vs/workbench/services/progress/browser/progressIndicAtor';
import { IProgressIndicAtor } from 'vs/plAtform/progress/common/progress';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { DomScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { ScrollbArVisibility } from 'vs/bAse/common/scrollAble';
import { URI } from 'vs/bAse/common/uri';
import { KeyMod, KeyCode, KeyChord } from 'vs/bAse/common/keyCodes';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';

export interfAce IPAneColors extends IColorMApping {
	dropBAckground?: ColorIdentifier;
	heAderForeground?: ColorIdentifier;
	heAderBAckground?: ColorIdentifier;
	heAderBorder?: ColorIdentifier;
	leftBorder?: ColorIdentifier;
}

export interfAce IViewPAneOptions extends IPAneOptions {
	id: string;
	showActionsAlwAys?: booleAn;
	titleMenuId?: MenuId;
}

type WelcomeActionClAssificAtion = {
	viewId: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
	uri: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
};

const viewsRegistry = Registry.As<IViewsRegistry>(ViewContAinerExtensions.ViewsRegistry);

interfAce IItem {
	reAdonly descriptor: IViewContentDescriptor;
	visible: booleAn;
}

clAss ViewWelcomeController {

	privAte _onDidChAnge = new Emitter<void>();
	reAdonly onDidChAnge = this._onDidChAnge.event;

	privAte defAultItem: IItem | undefined;
	privAte items: IItem[] = [];
	get contents(): IViewContentDescriptor[] {
		const visibleItems = this.items.filter(v => v.visible);

		if (visibleItems.length === 0 && this.defAultItem) {
			return [this.defAultItem.descriptor];
		}

		return visibleItems.mAp(v => v.descriptor);
	}

	privAte contextKeyService: IContextKeyService;
	privAte disposAbles = new DisposAbleStore();

	constructor(
		privAte id: string,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this.contextKeyService = contextKeyService.creAteScoped();
		this.disposAbles.Add(this.contextKeyService);

		contextKeyService.onDidChAngeContext(this.onDidChAngeContext, this, this.disposAbles);
		Event.filter(viewsRegistry.onDidChAngeViewWelcomeContent, id => id === this.id)(this.onDidChAngeViewWelcomeContent, this, this.disposAbles);
		this.onDidChAngeViewWelcomeContent();
	}

	privAte onDidChAngeViewWelcomeContent(): void {
		const descriptors = viewsRegistry.getViewWelcomeContent(this.id);

		this.items = [];

		for (const descriptor of descriptors) {
			if (descriptor.when === 'defAult') {
				this.defAultItem = { descriptor, visible: true };
			} else {
				const visible = descriptor.when ? this.contextKeyService.contextMAtchesRules(descriptor.when) : true;
				this.items.push({ descriptor, visible });
			}
		}

		this._onDidChAnge.fire();
	}

	privAte onDidChAngeContext(): void {
		let didChAnge = fAlse;

		for (const item of this.items) {
			if (!item.descriptor.when || item.descriptor.when === 'defAult') {
				continue;
			}

			const visible = this.contextKeyService.contextMAtchesRules(item.descriptor.when);

			if (item.visible === visible) {
				continue;
			}

			item.visible = visible;
			didChAnge = true;
		}

		if (didChAnge) {
			this._onDidChAnge.fire();
		}
	}

	dispose(): void {
		this.disposAbles.dispose();
	}
}

export AbstrAct clAss ViewPAne extends PAne implements IView {

	privAte stAtic reAdonly AlwAysShowActionsConfig = 'workbench.view.AlwAysShowHeAderActions';

	privAte _onDidFocus = this._register(new Emitter<void>());
	reAdonly onDidFocus: Event<void> = this._onDidFocus.event;

	privAte _onDidBlur = this._register(new Emitter<void>());
	reAdonly onDidBlur: Event<void> = this._onDidBlur.event;

	privAte _onDidChAngeBodyVisibility = this._register(new Emitter<booleAn>());
	reAdonly onDidChAngeBodyVisibility: Event<booleAn> = this._onDidChAngeBodyVisibility.event;

	protected _onDidChAngeTitleAreA = this._register(new Emitter<void>());
	reAdonly onDidChAngeTitleAreA: Event<void> = this._onDidChAngeTitleAreA.event;

	protected _onDidChAngeViewWelcomeStAte = this._register(new Emitter<void>());
	reAdonly onDidChAngeViewWelcomeStAte: Event<void> = this._onDidChAngeViewWelcomeStAte.event;

	privAte focusedViewContextKey: IContextKey<string>;

	privAte _isVisible: booleAn = fAlse;
	reAdonly id: string;

	privAte _title: string;
	public get title(): string {
		return this._title;
	}

	privAte _titleDescription: string | undefined;
	public get titleDescription(): string | undefined {
		return this._titleDescription;
	}

	privAte reAdonly menuActions: ViewMenuActions;
	privAte progressBAr!: ProgressBAr;
	privAte progressIndicAtor!: IProgressIndicAtor;

	privAte toolbAr?: ToolBAr;
	privAte reAdonly showActionsAlwAys: booleAn = fAlse;
	privAte heAderContAiner?: HTMLElement;
	privAte titleContAiner?: HTMLElement;
	privAte titleDescriptionContAiner?: HTMLElement;
	privAte iconContAiner?: HTMLElement;
	protected twistiesContAiner?: HTMLElement;

	privAte bodyContAiner!: HTMLElement;
	privAte viewWelcomeContAiner!: HTMLElement;
	privAte viewWelcomeDisposAble: IDisposAble = DisposAble.None;
	privAte viewWelcomeController: ViewWelcomeController;

	constructor(
		options: IViewPAneOptions,
		@IKeybindingService protected keybindingService: IKeybindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IConfigurAtionService protected reAdonly configurAtionService: IConfigurAtionService,
		@IContextKeyService protected contextKeyService: IContextKeyService,
		@IViewDescriptorService protected viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IOpenerService protected openerService: IOpenerService,
		@IThemeService protected themeService: IThemeService,
		@ITelemetryService protected telemetryService: ITelemetryService,
	) {
		super({ ...options, ...{ orientAtion: viewDescriptorService.getViewLocAtionById(options.id) === ViewContAinerLocAtion.PAnel ? OrientAtion.HORIZONTAL : OrientAtion.VERTICAL } });

		this.id = options.id;
		this._title = options.title;
		this._titleDescription = options.titleDescription;
		this.showActionsAlwAys = !!options.showActionsAlwAys;
		this.focusedViewContextKey = FocusedViewContext.bindTo(contextKeyService);

		this.menuActions = this._register(instAntiAtionService.creAteInstAnce(ViewMenuActions, this.id, options.titleMenuId || MenuId.ViewTitle, MenuId.ViewTitleContext));
		this._register(this.menuActions.onDidChAngeTitle(() => this.updAteActions()));

		this.viewWelcomeController = new ViewWelcomeController(this.id, contextKeyService);
	}

	get heAderVisible(): booleAn {
		return super.heAderVisible;
	}

	set heAderVisible(visible: booleAn) {
		super.heAderVisible = visible;
		this.element.clAssList.toggle('merged-heAder', !visible);
	}

	setVisible(visible: booleAn): void {
		if (this._isVisible !== visible) {
			this._isVisible = visible;

			if (this.isExpAnded()) {
				this._onDidChAngeBodyVisibility.fire(visible);
			}
		}
	}

	isVisible(): booleAn {
		return this._isVisible;
	}

	isBodyVisible(): booleAn {
		return this._isVisible && this.isExpAnded();
	}

	setExpAnded(expAnded: booleAn): booleAn {
		const chAnged = super.setExpAnded(expAnded);
		if (chAnged) {
			this._onDidChAngeBodyVisibility.fire(expAnded);
		}

		return chAnged;
	}

	render(): void {
		super.render();

		const focusTrAcker = trAckFocus(this.element);
		this._register(focusTrAcker);
		this._register(focusTrAcker.onDidFocus(() => {
			this.focusedViewContextKey.set(this.id);
			this._onDidFocus.fire();
		}));
		this._register(focusTrAcker.onDidBlur(() => {
			if (this.focusedViewContextKey.get() === this.id) {
				this.focusedViewContextKey.reset();
			}

			this._onDidBlur.fire();
		}));
	}

	protected renderHeAder(contAiner: HTMLElement): void {
		this.heAderContAiner = contAiner;

		this.renderTwisties(contAiner);

		this.renderHeAderTitle(contAiner, this.title);

		const Actions = Append(contAiner, $('.Actions'));
		Actions.clAssList.toggle('show', this.showActionsAlwAys);
		this.toolbAr = new ToolBAr(Actions, this.contextMenuService, {
			orientAtion: ActionsOrientAtion.HORIZONTAL,
			ActionViewItemProvider: Action => this.getActionViewItem(Action),
			AriALAbel: nls.locAlize('viewToolbArAriALAbel', "{0} Actions", this.title),
			getKeyBinding: Action => this.keybindingService.lookupKeybinding(Action.id),
			renderDropdownAsChildElement: true
		});

		this._register(this.toolbAr);
		this.setActions();

		this._register(this.viewDescriptorService.getViewContAinerModel(this.viewDescriptorService.getViewContAinerByViewId(this.id)!)!.onDidChAngeContAinerInfo(({ title }) => {
			this.updAteTitle(this.title);
		}));

		const onDidRelevAntConfigurAtionChAnge = Event.filter(this.configurAtionService.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion(ViewPAne.AlwAysShowActionsConfig));
		this._register(onDidRelevAntConfigurAtionChAnge(this.updAteActionsVisibility, this));
		this.updAteActionsVisibility();
	}

	protected renderTwisties(contAiner: HTMLElement): void {
		this.twistiesContAiner = Append(contAiner, $('.twisties.codicon.codicon-chevron-right'));
	}

	style(styles: IPAneStyles): void {
		super.style(styles);

		const icon = this.getIcon();
		if (this.iconContAiner) {
			const fgColor = styles.heAderForeground || this.themeService.getColorTheme().getColor(foreground);
			if (URI.isUri(icon)) {
				// Apply bAckground color to Activity bAr item provided with iconUrls
				this.iconContAiner.style.bAckgroundColor = fgColor ? fgColor.toString() : '';
				this.iconContAiner.style.color = '';
			} else {
				// Apply foreground color to Activity bAr items provided with codicons
				this.iconContAiner.style.color = fgColor ? fgColor.toString() : '';
				this.iconContAiner.style.bAckgroundColor = '';
			}
		}
	}

	privAte getIcon(): string | URI {
		return this.viewDescriptorService.getViewDescriptorById(this.id)?.contAinerIcon || 'codicon-window';
	}

	protected renderHeAderTitle(contAiner: HTMLElement, title: string): void {
		this.iconContAiner = Append(contAiner, $('.icon', undefined));
		const icon = this.getIcon();

		let cssClAss: string | undefined = undefined;
		if (URI.isUri(icon)) {
			cssClAss = `view-${this.id.replAce(/[\.\:]/g, '-')}`;
			const iconClAss = `.pAne-heAder .icon.${cssClAss}`;

			creAteCSSRule(iconClAss, `
				mAsk: ${AsCSSUrl(icon)} no-repeAt 50% 50%;
				mAsk-size: 24px;
				-webkit-mAsk: ${AsCSSUrl(icon)} no-repeAt 50% 50%;
				-webkit-mAsk-size: 16px;
			`);
		} else if (isString(icon)) {
			this.iconContAiner.clAssList.Add('codicon');
			cssClAss = icon;
		}

		if (cssClAss) {
			this.iconContAiner.clAssList.Add(...cssClAss.split(' '));
		}

		const cAlculAtedTitle = this.cAlculAteTitle(title);
		this.titleContAiner = Append(contAiner, $('h3.title', { title: cAlculAtedTitle }, cAlculAtedTitle));

		if (this._titleDescription) {
			this.setTitleDescription(this._titleDescription);
		}

		this.iconContAiner.title = cAlculAtedTitle;
		this.iconContAiner.setAttribute('AriA-lAbel', cAlculAtedTitle);
	}

	protected updAteTitle(title: string): void {
		const cAlculAtedTitle = this.cAlculAteTitle(title);
		if (this.titleContAiner) {
			this.titleContAiner.textContent = cAlculAtedTitle;
			this.titleContAiner.setAttribute('title', cAlculAtedTitle);
		}

		if (this.iconContAiner) {
			this.iconContAiner.title = cAlculAtedTitle;
			this.iconContAiner.setAttribute('AriA-lAbel', cAlculAtedTitle);
		}

		this._title = title;
		this._onDidChAngeTitleAreA.fire();
	}

	privAte setTitleDescription(description: string | undefined) {
		if (this.titleDescriptionContAiner) {
			this.titleDescriptionContAiner.textContent = description ?? '';
			this.titleDescriptionContAiner.setAttribute('title', description ?? '');
		}
		else if (description && this.titleContAiner) {
			this.titleDescriptionContAiner = After(this.titleContAiner, $('spAn.description', { title: description }, description));
		}
	}

	protected updAteTitleDescription(description?: string | undefined): void {
		this.setTitleDescription(description);

		this._titleDescription = description;
		this._onDidChAngeTitleAreA.fire();
	}

	privAte cAlculAteTitle(title: string): string {
		const viewContAiner = this.viewDescriptorService.getViewContAinerByViewId(this.id)!;
		const model = this.viewDescriptorService.getViewContAinerModel(viewContAiner);
		const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(this.id);
		const isDefAult = this.viewDescriptorService.getDefAultContAinerById(this.id) === viewContAiner;

		if (!isDefAult && viewDescriptor?.contAinerTitle && model.title !== viewDescriptor.contAinerTitle) {
			return `${viewDescriptor.contAinerTitle}: ${title}`;
		}

		return title;
	}

	privAte scrollAbleElement!: DomScrollAbleElement;

	protected renderBody(contAiner: HTMLElement): void {
		this.bodyContAiner = contAiner;

		const viewWelcomeContAiner = Append(contAiner, $('.welcome-view'));
		this.viewWelcomeContAiner = $('.welcome-view-content', { tAbIndex: 0 });
		this.scrollAbleElement = this._register(new DomScrollAbleElement(this.viewWelcomeContAiner, {
			AlwAysConsumeMouseWheel: true,
			horizontAl: ScrollbArVisibility.Hidden,
			verticAl: ScrollbArVisibility.Visible,
		}));

		Append(viewWelcomeContAiner, this.scrollAbleElement.getDomNode());

		const onViewWelcomeChAnge = Event.Any(this.viewWelcomeController.onDidChAnge, this.onDidChAngeViewWelcomeStAte);
		this._register(onViewWelcomeChAnge(this.updAteViewWelcome, this));
		this.updAteViewWelcome();
	}

	protected lAyoutBody(height: number, width: number): void {
		this.viewWelcomeContAiner.style.height = `${height}px`;
		this.viewWelcomeContAiner.style.width = `${width}px`;
		this.scrollAbleElement.scAnDomNode();
	}

	getProgressIndicAtor() {
		if (this.progressBAr === undefined) {
			// Progress bAr
			this.progressBAr = this._register(new ProgressBAr(this.element));
			this._register(AttAchProgressBArStyler(this.progressBAr, this.themeService));
			this.progressBAr.hide();
		}

		if (this.progressIndicAtor === undefined) {
			this.progressIndicAtor = this.instAntiAtionService.creAteInstAnce(CompositeProgressIndicAtor, AssertIsDefined(this.progressBAr), this.id, this.isBodyVisible());
		}
		return this.progressIndicAtor;
	}

	protected getProgressLocAtion(): string {
		return this.viewDescriptorService.getViewContAinerByViewId(this.id)!.id;
	}

	protected getBAckgroundColor(): string {
		return this.viewDescriptorService.getViewLocAtionById(this.id) === ViewContAinerLocAtion.PAnel ? PANEL_BACKGROUND : SIDE_BAR_BACKGROUND;
	}

	focus(): void {
		if (this.shouldShowWelcome()) {
			this.viewWelcomeContAiner.focus();
		} else if (this.element) {
			this.element.focus();
			this._onDidFocus.fire();
		}
	}

	privAte setActions(): void {
		if (this.toolbAr) {
			this.toolbAr.setActions(prepAreActions(this.getActions()), prepAreActions(this.getSecondAryActions()));
			this.toolbAr.context = this.getActionsContext();
		}
	}

	privAte updAteActionsVisibility(): void {
		if (!this.heAderContAiner) {
			return;
		}
		const shouldAlwAysShowActions = this.configurAtionService.getVAlue<booleAn>('workbench.view.AlwAysShowHeAderActions');
		this.heAderContAiner.clAssList.toggle('Actions-AlwAys-visible', shouldAlwAysShowActions);
	}

	protected updAteActions(): void {
		this.setActions();
		this._onDidChAngeTitleAreA.fire();
	}

	getActions(): IAction[] {
		return this.menuActions.getPrimAryActions();
	}

	getSecondAryActions(): IAction[] {
		return this.menuActions.getSecondAryActions();
	}

	getContextMenuActions(): IAction[] {
		return this.menuActions.getContextMenuActions();
	}

	getActionViewItem(Action: IAction): IActionViewItem | undefined {
		if (Action instAnceof MenuItemAction) {
			return this.instAntiAtionService.creAteInstAnce(MenuEntryActionViewItem, Action);
		} else if (Action instAnceof SubmenuItemAction) {
			return this.instAntiAtionService.creAteInstAnce(SubmenuEntryActionViewItem, Action);
		}
		return undefined;
	}

	getActionsContext(): unknown {
		return undefined;
	}

	getOptimAlWidth(): number {
		return 0;
	}

	sAveStAte(): void {
		// SubclAsses to implement for sAving stAte
	}

	privAte updAteViewWelcome(): void {
		this.viewWelcomeDisposAble.dispose();

		if (!this.shouldShowWelcome()) {
			this.bodyContAiner.clAssList.remove('welcome');
			this.viewWelcomeContAiner.innerText = '';
			this.scrollAbleElement.scAnDomNode();
			return;
		}

		const contents = this.viewWelcomeController.contents;

		if (contents.length === 0) {
			this.bodyContAiner.clAssList.remove('welcome');
			this.viewWelcomeContAiner.innerText = '';
			this.scrollAbleElement.scAnDomNode();
			return;
		}

		const disposAbles = new DisposAbleStore();
		this.bodyContAiner.clAssList.Add('welcome');
		this.viewWelcomeContAiner.innerText = '';

		let buttonIndex = 0;

		for (const { content, preconditions } of contents) {
			const lines = content.split('\n');

			for (let line of lines) {
				line = line.trim();

				if (!line) {
					continue;
				}

				const linkedText = pArseLinkedText(line);

				if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
					const node = linkedText.nodes[0];
					const button = new Button(this.viewWelcomeContAiner, { title: node.title, supportCodicons: true });
					button.lAbel = node.lAbel;
					button.onDidClick(_ => {
						this.telemetryService.publicLog2<{ viewId: string, uri: string }, WelcomeActionClAssificAtion>('views.welcomeAction', { viewId: this.id, uri: node.href });
						this.openerService.open(node.href);
					}, null, disposAbles);
					disposAbles.Add(button);
					disposAbles.Add(AttAchButtonStyler(button, this.themeService));

					if (preconditions) {
						const precondition = preconditions[buttonIndex];

						if (precondition) {
							const updAteEnAblement = () => button.enAbled = this.contextKeyService.contextMAtchesRules(precondition);
							updAteEnAblement();

							const keys = new Set();
							precondition.keys().forEAch(key => keys.Add(key));
							const onDidChAngeContext = Event.filter(this.contextKeyService.onDidChAngeContext, e => e.AffectsSome(keys));
							onDidChAngeContext(updAteEnAblement, null, disposAbles);
						}
					}

					buttonIndex++;
				} else {
					const p = Append(this.viewWelcomeContAiner, $('p'));

					for (const node of linkedText.nodes) {
						if (typeof node === 'string') {
							Append(p, document.creAteTextNode(node));
						} else {
							const link = this.instAntiAtionService.creAteInstAnce(Link, node);
							Append(p, link.el);
							disposAbles.Add(link);
							disposAbles.Add(AttAchLinkStyler(link, this.themeService));
						}
					}
				}
			}
		}

		this.scrollAbleElement.scAnDomNode();
		this.viewWelcomeDisposAble = disposAbles;
	}

	shouldShowWelcome(): booleAn {
		return fAlse;
	}
}

export interfAce IViewPAneContAinerOptions extends IPAneViewOptions {
	mergeViewWithContAinerWhenSingleView: booleAn;
}

interfAce IViewPAneItem {
	pAne: ViewPAne;
	disposAble: IDisposAble;
}

const enum DropDirection {
	UP,
	DOWN,
	LEFT,
	RIGHT
}

type BoundingRect = { top: number, left: number, bottom: number, right: number };

clAss ViewPAneDropOverlAy extends ThemAble {

	privAte stAtic reAdonly OVERLAY_ID = 'monAco-pAne-drop-overlAy';

	privAte contAiner!: HTMLElement;
	privAte overlAy!: HTMLElement;

	privAte _currentDropOperAtion: DropDirection | undefined;

	// privAte currentDropOperAtion: IDropOperAtion | undefined;
	privAte _disposed: booleAn | undefined;

	privAte cleAnupOverlAyScheduler: RunOnceScheduler;

	get currentDropOperAtion(): DropDirection | undefined {
		return this._currentDropOperAtion;
	}

	constructor(
		privAte pAneElement: HTMLElement,
		privAte orientAtion: OrientAtion | undefined,
		privAte bounds: BoundingRect | undefined,
		protected locAtion: ViewContAinerLocAtion,
		protected themeService: IThemeService,
	) {
		super(themeService);
		this.cleAnupOverlAyScheduler = this._register(new RunOnceScheduler(() => this.dispose(), 300));

		this.creAte();
	}

	get disposed(): booleAn {
		return !!this._disposed;
	}

	privAte creAte(): void {
		// ContAiner
		this.contAiner = document.creAteElement('div');
		this.contAiner.id = ViewPAneDropOverlAy.OVERLAY_ID;
		this.contAiner.style.top = '0px';

		// PArent
		this.pAneElement.AppendChild(this.contAiner);
		this.pAneElement.clAssList.Add('drAgged-over');
		this._register(toDisposAble(() => {
			this.pAneElement.removeChild(this.contAiner);
			this.pAneElement.clAssList.remove('drAgged-over');
		}));

		// OverlAy
		this.overlAy = document.creAteElement('div');
		this.overlAy.clAssList.Add('pAne-overlAy-indicAtor');
		this.contAiner.AppendChild(this.overlAy);

		// OverlAy Event HAndling
		this.registerListeners();

		// Styles
		this.updAteStyles();
	}

	protected updAteStyles(): void {

		// OverlAy drop bAckground
		this.overlAy.style.bAckgroundColor = this.getColor(this.locAtion === ViewContAinerLocAtion.PAnel ? PANEL_SECTION_DRAG_AND_DROP_BACKGROUND : SIDE_BAR_DRAG_AND_DROP_BACKGROUND) || '';

		// OverlAy contrAst border (if Any)
		const ActiveContrAstBorderColor = this.getColor(ActiveContrAstBorder);
		this.overlAy.style.outlineColor = ActiveContrAstBorderColor || '';
		this.overlAy.style.outlineOffset = ActiveContrAstBorderColor ? '-2px' : '';
		this.overlAy.style.outlineStyle = ActiveContrAstBorderColor ? 'dAshed' : '';
		this.overlAy.style.outlineWidth = ActiveContrAstBorderColor ? '2px' : '';

		this.overlAy.style.borderColor = ActiveContrAstBorderColor || '';
		this.overlAy.style.borderStyle = 'solid' || '';
		this.overlAy.style.borderWidth = '0px';
	}

	privAte registerListeners(): void {
		this._register(new DrAgAndDropObserver(this.contAiner, {
			onDrAgEnter: e => undefined,
			onDrAgOver: e => {

				// Position overlAy
				this.positionOverlAy(e.offsetX, e.offsetY);

				// MAke sure to stop Any running cleAnup scheduler to remove the overlAy
				if (this.cleAnupOverlAyScheduler.isScheduled()) {
					this.cleAnupOverlAyScheduler.cAncel();
				}
			},

			onDrAgLeAve: e => this.dispose(),
			onDrAgEnd: e => this.dispose(),

			onDrop: e => {
				// Dispose overlAy
				this.dispose();
			}
		}));

		this._register(AddDisposAbleListener(this.contAiner, EventType.MOUSE_OVER, () => {
			// Under some circumstAnces we hAve seen reports where the drop overlAy is not being
			// cleAned up And As such the editor AreA remAins under the overlAy so thAt you cAnnot
			// type into the editor Anymore. This seems relAted to using VMs And DND viA host And
			// guest OS, though some users Also sAw it without VMs.
			// To protect AgAinst this issue we AlwAys destroy the overlAy As soon As we detect A
			// mouse event over it. The delAy is used to guArAntee we Are not interfering with the
			// ActuAl DROP event thAt cAn Also trigger A mouse over event.
			if (!this.cleAnupOverlAyScheduler.isScheduled()) {
				this.cleAnupOverlAyScheduler.schedule();
			}
		}));
	}

	privAte positionOverlAy(mousePosX: number, mousePosY: number): void {
		const pAneWidth = this.pAneElement.clientWidth;
		const pAneHeight = this.pAneElement.clientHeight;

		const splitWidthThreshold = pAneWidth / 2;
		const splitHeightThreshold = pAneHeight / 2;

		let dropDirection: DropDirection | undefined;

		if (this.orientAtion === OrientAtion.VERTICAL) {
			if (mousePosY < splitHeightThreshold) {
				dropDirection = DropDirection.UP;
			} else if (mousePosY >= splitHeightThreshold) {
				dropDirection = DropDirection.DOWN;
			}
		} else if (this.orientAtion === OrientAtion.HORIZONTAL) {
			if (mousePosX < splitWidthThreshold) {
				dropDirection = DropDirection.LEFT;
			} else if (mousePosX >= splitWidthThreshold) {
				dropDirection = DropDirection.RIGHT;
			}
		}

		// DrAw overlAy bAsed on split direction
		switch (dropDirection) {
			cAse DropDirection.UP:
				this.doPositionOverlAy({ top: '0', left: '0', width: '100%', height: '50%' });
				breAk;
			cAse DropDirection.DOWN:
				this.doPositionOverlAy({ bottom: '0', left: '0', width: '100%', height: '50%' });
				breAk;
			cAse DropDirection.LEFT:
				this.doPositionOverlAy({ top: '0', left: '0', width: '50%', height: '100%' });
				breAk;
			cAse DropDirection.RIGHT:
				this.doPositionOverlAy({ top: '0', right: '0', width: '50%', height: '100%' });
				breAk;
			defAult:
				// const top = this.bounds?.top || 0;
				// const left = this.bounds?.bottom || 0;

				let top = '0';
				let left = '0';
				let width = '100%';
				let height = '100%';
				if (this.bounds) {
					const boundingRect = this.contAiner.getBoundingClientRect();
					top = `${this.bounds.top - boundingRect.top}px`;
					left = `${this.bounds.left - boundingRect.left}px`;
					height = `${this.bounds.bottom - this.bounds.top}px`;
					width = `${this.bounds.right - this.bounds.left}px`;
				}

				this.doPositionOverlAy({ top, left, width, height });
		}

		if ((this.orientAtion === OrientAtion.VERTICAL && pAneHeight <= 25) ||
			(this.orientAtion === OrientAtion.HORIZONTAL && pAneWidth <= 25)) {
			this.doUpdAteOverlAyBorder(dropDirection);
		} else {
			this.doUpdAteOverlAyBorder(undefined);
		}

		// MAke sure the overlAy is visible now
		this.overlAy.style.opAcity = '1';

		// EnAble trAnsition After A timeout to prevent initiAl AnimAtion
		setTimeout(() => this.overlAy.clAssList.Add('overlAy-move-trAnsition'), 0);

		// Remember As current split direction
		this._currentDropOperAtion = dropDirection;
	}

	privAte doUpdAteOverlAyBorder(direction: DropDirection | undefined): void {
		this.overlAy.style.borderTopWidth = direction === DropDirection.UP ? '2px' : '0px';
		this.overlAy.style.borderLeftWidth = direction === DropDirection.LEFT ? '2px' : '0px';
		this.overlAy.style.borderBottomWidth = direction === DropDirection.DOWN ? '2px' : '0px';
		this.overlAy.style.borderRightWidth = direction === DropDirection.RIGHT ? '2px' : '0px';
	}

	privAte doPositionOverlAy(options: { top?: string, bottom?: string, left?: string, right?: string, width: string, height: string }): void {

		// ContAiner
		this.contAiner.style.height = '100%';

		// OverlAy
		this.overlAy.style.top = options.top || '';
		this.overlAy.style.left = options.left || '';
		this.overlAy.style.bottom = options.bottom || '';
		this.overlAy.style.right = options.right || '';
		this.overlAy.style.width = options.width;
		this.overlAy.style.height = options.height;
	}


	contAins(element: HTMLElement): booleAn {
		return element === this.contAiner || element === this.overlAy;
	}

	dispose(): void {
		super.dispose();

		this._disposed = true;
	}
}

export clAss ViewPAneContAiner extends Component implements IViewPAneContAiner {

	reAdonly viewContAiner: ViewContAiner;
	privAte lAstFocusedPAne: ViewPAne | undefined;
	privAte pAneItems: IViewPAneItem[] = [];
	privAte pAneview?: PAneView;

	privAte visible: booleAn = fAlse;

	privAte AreExtensionsReAdy: booleAn = fAlse;

	privAte didLAyout = fAlse;
	privAte dimension: Dimension | undefined;

	privAte reAdonly visibleViewsCountFromCAche: number | undefined;
	privAte reAdonly visibleViewsStorAgeId: string;
	protected reAdonly viewContAinerModel: IViewContAinerModel;
	privAte viewDisposAbles: IDisposAble[] = [];

	privAte reAdonly _onTitleAreAUpdAte: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onTitleAreAUpdAte: Event<void> = this._onTitleAreAUpdAte.event;

	privAte reAdonly _onDidChAngeVisibility = this._register(new Emitter<booleAn>());
	reAdonly onDidChAngeVisibility = this._onDidChAngeVisibility.event;

	privAte reAdonly _onDidAddViews = this._register(new Emitter<IView[]>());
	reAdonly onDidAddViews = this._onDidAddViews.event;

	privAte reAdonly _onDidRemoveViews = this._register(new Emitter<IView[]>());
	reAdonly onDidRemoveViews = this._onDidRemoveViews.event;

	privAte reAdonly _onDidChAngeViewVisibility = this._register(new Emitter<IView>());
	reAdonly onDidChAngeViewVisibility = this._onDidChAngeViewVisibility.event;

	get onDidSAshChAnge(): Event<number> {
		return AssertIsDefined(this.pAneview).onDidSAshChAnge;
	}

	protected get pAnes(): ViewPAne[] {
		return this.pAneItems.mAp(i => i.pAne);
	}

	get views(): IView[] {
		return this.pAnes;
	}

	get length(): number {
		return this.pAneItems.length;
	}

	constructor(
		id: string,
		privAte options: IViewPAneContAinerOptions,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@IWorkbenchLAyoutService protected lAyoutService: IWorkbenchLAyoutService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@ITelemetryService protected telemetryService: ITelemetryService,
		@IExtensionService protected extensionService: IExtensionService,
		@IThemeService protected themeService: IThemeService,
		@IStorAgeService protected storAgeService: IStorAgeService,
		@IWorkspAceContextService protected contextService: IWorkspAceContextService,
		@IViewDescriptorService protected viewDescriptorService: IViewDescriptorService
	) {

		super(id, themeService, storAgeService);

		const contAiner = this.viewDescriptorService.getViewContAinerById(id);
		if (!contAiner) {
			throw new Error('Could not find contAiner');
		}


		this.viewContAiner = contAiner;
		this.visibleViewsStorAgeId = `${id}.numberOfVisibleViews`;
		this.visibleViewsCountFromCAche = this.storAgeService.getNumber(this.visibleViewsStorAgeId, StorAgeScope.WORKSPACE, undefined);
		this._register(toDisposAble(() => this.viewDisposAbles = dispose(this.viewDisposAbles)));
		this.viewContAinerModel = this.viewDescriptorService.getViewContAinerModel(contAiner);
	}

	creAte(pArent: HTMLElement): void {
		const options = this.options As IPAneViewOptions;
		options.orientAtion = this.orientAtion;
		this.pAneview = this._register(new PAneView(pArent, this.options));
		this._register(this.pAneview.onDidDrop(({ from, to }) => this.movePAne(from As ViewPAne, to As ViewPAne)));
		this._register(AddDisposAbleListener(pArent, EventType.CONTEXT_MENU, (e: MouseEvent) => this.showContextMenu(new StAndArdMouseEvent(e))));

		let overlAy: ViewPAneDropOverlAy | undefined;
		const getOverlAyBounds: () => BoundingRect = () => {
			const fullSize = pArent.getBoundingClientRect();
			const lAstPAne = this.pAnes[this.pAnes.length - 1].element.getBoundingClientRect();
			const top = this.orientAtion === OrientAtion.VERTICAL ? lAstPAne.bottom : fullSize.top;
			const left = this.orientAtion === OrientAtion.HORIZONTAL ? lAstPAne.right : fullSize.left;

			return {
				top,
				bottom: fullSize.bottom,
				left,
				right: fullSize.right,
			};
		};

		const inBounds = (bounds: BoundingRect, pos: { x: number, y: number }) => {
			return pos.x >= bounds.left && pos.x <= bounds.right && pos.y >= bounds.top && pos.y <= bounds.bottom;
		};


		let bounds: BoundingRect;

		this._register(CompositeDrAgAndDropObserver.INSTANCE.registerTArget(pArent, {
			onDrAgEnter: (e) => {
				bounds = getOverlAyBounds();
				if (overlAy && overlAy.disposed) {
					overlAy = undefined;
				}

				if (!overlAy && inBounds(bounds, e.eventDAtA)) {
					const dropDAtA = e.drAgAndDropDAtA.getDAtA();
					if (dropDAtA.type === 'view') {

						const oldViewContAiner = this.viewDescriptorService.getViewContAinerByViewId(dropDAtA.id);
						const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropDAtA.id);

						if (oldViewContAiner !== this.viewContAiner && (!viewDescriptor || !viewDescriptor.cAnMoveView || this.viewContAiner.rejectAddedViews)) {
							return;
						}

						overlAy = new ViewPAneDropOverlAy(pArent, undefined, bounds, this.viewDescriptorService.getViewContAinerLocAtion(this.viewContAiner)!, this.themeService);
					}

					if (dropDAtA.type === 'composite' && dropDAtA.id !== this.viewContAiner.id) {
						const contAiner = this.viewDescriptorService.getViewContAinerById(dropDAtA.id)!;
						const viewsToMove = this.viewDescriptorService.getViewContAinerModel(contAiner).AllViewDescriptors;

						if (!viewsToMove.some(v => !v.cAnMoveView) && viewsToMove.length > 0) {
							overlAy = new ViewPAneDropOverlAy(pArent, undefined, bounds, this.viewDescriptorService.getViewContAinerLocAtion(this.viewContAiner)!, this.themeService);
						}
					}
				}
			},
			onDrAgOver: (e) => {
				if (overlAy && overlAy.disposed) {
					overlAy = undefined;
				}

				if (overlAy && !inBounds(bounds, e.eventDAtA)) {
					overlAy.dispose();
					overlAy = undefined;
				}

				if (inBounds(bounds, e.eventDAtA)) {
					toggleDropEffect(e.eventDAtA.dAtATrAnsfer, 'move', overlAy !== undefined);
				}
			},
			onDrAgLeAve: (e) => {
				overlAy?.dispose();
				overlAy = undefined;
			},
			onDrop: (e) => {
				if (overlAy) {
					const dropDAtA = e.drAgAndDropDAtA.getDAtA();
					const viewsToMove: IViewDescriptor[] = [];

					if (dropDAtA.type === 'composite' && dropDAtA.id !== this.viewContAiner.id) {
						const contAiner = this.viewDescriptorService.getViewContAinerById(dropDAtA.id)!;
						const AllViews = this.viewDescriptorService.getViewContAinerModel(contAiner).AllViewDescriptors;
						if (!AllViews.some(v => !v.cAnMoveView)) {
							viewsToMove.push(...AllViews);
						}
					} else if (dropDAtA.type === 'view') {
						const oldViewContAiner = this.viewDescriptorService.getViewContAinerByViewId(dropDAtA.id);
						const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropDAtA.id);
						if (oldViewContAiner !== this.viewContAiner && viewDescriptor && viewDescriptor.cAnMoveView) {
							this.viewDescriptorService.moveViewsToContAiner([viewDescriptor], this.viewContAiner);
						}
					}

					const pAneCount = this.pAnes.length;

					if (viewsToMove.length > 0) {
						this.viewDescriptorService.moveViewsToContAiner(viewsToMove, this.viewContAiner);
					}

					if (pAneCount > 0) {
						for (const view of viewsToMove) {
							const pAneToMove = this.pAnes.find(p => p.id === view.id);
							if (pAneToMove) {
								this.movePAne(pAneToMove, this.pAnes[this.pAnes.length - 1]);
							}
						}
					}
				}

				overlAy?.dispose();
				overlAy = undefined;
			}
		}));

		this._register(this.onDidSAshChAnge(() => this.sAveViewSizes()));
		this._register(this.viewContAinerModel.onDidAddVisibleViewDescriptors(Added => this.onDidAddViewDescriptors(Added)));
		this._register(this.viewContAinerModel.onDidRemoveVisibleViewDescriptors(removed => this.onDidRemoveViewDescriptors(removed)));
		const AddedViews: IAddedViewDescriptorRef[] = this.viewContAinerModel.visibleViewDescriptors.mAp((viewDescriptor, index) => {
			const size = this.viewContAinerModel.getSize(viewDescriptor.id);
			const collApsed = this.viewContAinerModel.isCollApsed(viewDescriptor.id);
			return ({ viewDescriptor, index, size, collApsed });
		});
		if (AddedViews.length) {
			this.onDidAddViewDescriptors(AddedViews);
		}

		// UpdAte heAders After And title contributed views After AvAilAble, since we reAd from cAche in the beginning to know if the viewlet hAs single view or not. Ref #29609
		this.extensionService.whenInstAlledExtensionsRegistered().then(() => {
			this.AreExtensionsReAdy = true;
			if (this.pAnes.length) {
				this.updAteTitleAreA();
				this.updAteViewHeAders();
			}
		});

		this._register(this.viewContAinerModel.onDidChAngeActiveViewDescriptors(() => this._onTitleAreAUpdAte.fire()));
	}

	getTitle(): string {
		const contAinerTitle = this.viewContAinerModel.title;

		if (this.isViewMergedWithContAiner()) {
			const pAneItemTitle = this.pAneItems[0].pAne.title;
			if (contAinerTitle === pAneItemTitle) {
				return this.pAneItems[0].pAne.title;
			}
			return pAneItemTitle ? `${contAinerTitle}: ${pAneItemTitle}` : contAinerTitle;
		}

		return contAinerTitle;
	}

	privAte showContextMenu(event: StAndArdMouseEvent): void {
		for (const pAneItem of this.pAneItems) {
			// Do not show context menu if tArget is coming from inside pAne views
			if (isAncestor(event.tArget, pAneItem.pAne.element)) {
				return;
			}
		}

		event.stopPropAgAtion();
		event.preventDefAult();

		let Anchor: { x: number, y: number; } = { x: event.posx, y: event.posy };
		this.contextMenuService.showContextMenu({
			getAnchor: () => Anchor,
			getActions: () => this.getContextMenuActions()
		});
	}

	getContextMenuActions(viewDescriptor?: IViewDescriptor): IAction[] {
		const result: IAction[] = [];

		let showHide = true;
		if (!viewDescriptor && this.isViewMergedWithContAiner()) {
			viewDescriptor = this.viewDescriptorService.getViewDescriptorById(this.pAnes[0].id) || undefined;
			showHide = fAlse;
		}

		if (viewDescriptor) {
			if (showHide) {
				result.push(<IAction>{
					id: `${viewDescriptor.id}.removeView`,
					lAbel: nls.locAlize('hideView', "Hide"),
					enAbled: viewDescriptor.cAnToggleVisibility,
					run: () => this.toggleViewVisibility(viewDescriptor!.id)
				});
			}
			const view = this.getView(viewDescriptor.id);
			if (view) {
				result.push(...view.getContextMenuActions());
			}
		}

		const viewToggleActions = this.getViewsVisibilityActions();
		if (result.length && viewToggleActions.length) {
			result.push(new SepArAtor());
		}

		result.push(...viewToggleActions);

		return result;
	}

	getActions(): IAction[] {
		if (this.isViewMergedWithContAiner()) {
			return this.pAneItems[0].pAne.getActions();
		}

		return [];
	}

	getSecondAryActions(): IAction[] {
		if (this.isViewMergedWithContAiner()) {
			return this.pAneItems[0].pAne.getSecondAryActions();
		}

		return [];
	}

	getActionsContext(): unknown {
		return undefined;
	}

	getViewsVisibilityActions(): IAction[] {
		return this.viewContAinerModel.ActiveViewDescriptors.mAp(viewDescriptor => (<IAction>{
			id: `${viewDescriptor.id}.toggleVisibility`,
			lAbel: viewDescriptor.nAme,
			checked: this.viewContAinerModel.isVisible(viewDescriptor.id),
			enAbled: viewDescriptor.cAnToggleVisibility && (!this.viewContAinerModel.isVisible(viewDescriptor.id) || this.viewContAinerModel.visibleViewDescriptors.length > 1),
			run: () => this.toggleViewVisibility(viewDescriptor.id)
		}));
	}

	getActionViewItem(Action: IAction): IActionViewItem | undefined {
		if (this.isViewMergedWithContAiner()) {
			return this.pAneItems[0].pAne.getActionViewItem(Action);
		}

		return undefined;
	}

	focus(): void {
		if (this.lAstFocusedPAne) {
			this.lAstFocusedPAne.focus();
		} else if (this.pAneItems.length > 0) {
			for (const { pAne: pAne } of this.pAneItems) {
				if (pAne.isExpAnded()) {
					pAne.focus();
					return;
				}
			}
		}
	}

	privAte get orientAtion(): OrientAtion {
		if (this.viewDescriptorService.getViewContAinerLocAtion(this.viewContAiner) === ViewContAinerLocAtion.SidebAr) {
			return OrientAtion.VERTICAL;
		} else {
			return this.lAyoutService.getPAnelPosition() === Position.BOTTOM ? OrientAtion.HORIZONTAL : OrientAtion.VERTICAL;
		}
	}

	lAyout(dimension: Dimension): void {
		if (this.pAneview) {
			if (this.pAneview.orientAtion !== this.orientAtion) {
				this.pAneview.flipOrientAtion(dimension.height, dimension.width);
			}

			this.pAneview.lAyout(dimension.height, dimension.width);
		}

		this.dimension = dimension;
		if (this.didLAyout) {
			this.sAveViewSizes();
		} else {
			this.didLAyout = true;
			this.restoreViewSizes();
		}
	}

	getOptimAlWidth(): number {
		const AdditionAlMArgin = 16;
		const optimAlWidth = MAth.mAx(...this.pAnes.mAp(view => view.getOptimAlWidth() || 0));
		return optimAlWidth + AdditionAlMArgin;
	}

	AddPAnes(pAnes: { pAne: ViewPAne, size: number, index?: number; }[]): void {
		const wAsMerged = this.isViewMergedWithContAiner();

		for (const { pAne: pAne, size, index } of pAnes) {
			this.AddPAne(pAne, size, index);
		}

		this.updAteViewHeAders();
		if (this.isViewMergedWithContAiner() !== wAsMerged) {
			this.updAteTitleAreA();
		}

		this._onDidAddViews.fire(pAnes.mAp(({ pAne }) => pAne));
	}

	setVisible(visible: booleAn): void {
		if (this.visible !== !!visible) {
			this.visible = visible;

			this._onDidChAngeVisibility.fire(visible);
		}

		this.pAnes.filter(view => view.isVisible() !== visible)
			.mAp((view) => view.setVisible(visible));
	}

	isVisible(): booleAn {
		return this.visible;
	}

	protected updAteTitleAreA(): void {
		this._onTitleAreAUpdAte.fire();
	}

	protected creAteView(viewDescriptor: IViewDescriptor, options: IViewletViewOptions): ViewPAne {
		return (this.instAntiAtionService As Any).creAteInstAnce(viewDescriptor.ctorDescriptor.ctor, ...(viewDescriptor.ctorDescriptor.stAticArguments || []), options) As ViewPAne;
	}

	getView(id: string): ViewPAne | undefined {
		return this.pAnes.filter(view => view.id === id)[0];
	}

	privAte sAveViewSizes(): void {
		// SAve size only when the lAyout hAs hAppened
		if (this.didLAyout) {
			for (const view of this.pAnes) {
				this.viewContAinerModel.setSize(view.id, this.getPAneSize(view));
			}
		}
	}

	privAte restoreViewSizes(): void {
		// Restore sizes only when the lAyout hAs hAppened
		if (this.didLAyout) {
			let initiAlSizes;
			for (let i = 0; i < this.viewContAinerModel.visibleViewDescriptors.length; i++) {
				const pAne = this.pAnes[i];
				const viewDescriptor = this.viewContAinerModel.visibleViewDescriptors[i];
				const size = this.viewContAinerModel.getSize(viewDescriptor.id);

				if (typeof size === 'number') {
					this.resizePAne(pAne, size);
				} else {
					initiAlSizes = initiAlSizes ? initiAlSizes : this.computeInitiAlSizes();
					this.resizePAne(pAne, initiAlSizes.get(pAne.id) || 200);
				}
			}
		}
	}

	privAte computeInitiAlSizes(): MAp<string, number> {
		const sizes: MAp<string, number> = new MAp<string, number>();
		if (this.dimension) {
			const totAlWeight = this.viewContAinerModel.visibleViewDescriptors.reduce((totAlWeight, { weight }) => totAlWeight + (weight || 20), 0);
			for (const viewDescriptor of this.viewContAinerModel.visibleViewDescriptors) {
				if (this.orientAtion === OrientAtion.VERTICAL) {
					sizes.set(viewDescriptor.id, this.dimension.height * (viewDescriptor.weight || 20) / totAlWeight);
				} else {
					sizes.set(viewDescriptor.id, this.dimension.width * (viewDescriptor.weight || 20) / totAlWeight);
				}
			}
		}
		return sizes;
	}

	sAveStAte(): void {
		this.pAnes.forEAch((view) => view.sAveStAte());
		this.storAgeService.store(this.visibleViewsStorAgeId, this.length, StorAgeScope.WORKSPACE);
	}

	privAte onContextMenu(event: StAndArdMouseEvent, viewDescriptor: IViewDescriptor): void {
		event.stopPropAgAtion();
		event.preventDefAult();

		const Actions: IAction[] = this.getContextMenuActions(viewDescriptor);

		let Anchor: { x: number, y: number } = { x: event.posx, y: event.posy };
		this.contextMenuService.showContextMenu({
			getAnchor: () => Anchor,
			getActions: () => Actions
		});
	}

	openView(id: string, focus?: booleAn): IView | undefined {
		let view = this.getView(id);
		if (!view) {
			this.toggleViewVisibility(id);
		}
		view = this.getView(id);
		if (view) {
			view.setExpAnded(true);
			if (focus) {
				view.focus();
			}
		}
		return view;
	}

	protected onDidAddViewDescriptors(Added: IAddedViewDescriptorRef[]): ViewPAne[] {
		const pAnesToAdd: { pAne: ViewPAne, size: number, index: number }[] = [];

		for (const { viewDescriptor, collApsed, index, size } of Added) {
			const pAne = this.creAteView(viewDescriptor,
				{
					id: viewDescriptor.id,
					title: viewDescriptor.nAme,
					expAnded: !collApsed
				});

			pAne.render();
			const contextMenuDisposAble = AddDisposAbleListener(pAne.drAggAbleElement, 'contextmenu', e => {
				e.stopPropAgAtion();
				e.preventDefAult();
				this.onContextMenu(new StAndArdMouseEvent(e), viewDescriptor);
			});

			const collApseDisposAble = Event.lAtch(Event.mAp(pAne.onDidChAnge, () => !pAne.isExpAnded()))(collApsed => {
				this.viewContAinerModel.setCollApsed(viewDescriptor.id, collApsed);
			});

			this.viewDisposAbles.splice(index, 0, combinedDisposAble(contextMenuDisposAble, collApseDisposAble));
			pAnesToAdd.push({ pAne, size: size || pAne.minimumSize, index });
		}

		this.AddPAnes(pAnesToAdd);
		this.restoreViewSizes();

		const pAnes: ViewPAne[] = [];
		for (const { pAne } of pAnesToAdd) {
			pAne.setVisible(this.isVisible());
			pAnes.push(pAne);
		}
		return pAnes;
	}

	privAte onDidRemoveViewDescriptors(removed: IViewDescriptorRef[]): void {
		removed = removed.sort((A, b) => b.index - A.index);
		const pAnesToRemove: ViewPAne[] = [];
		for (const { index } of removed) {
			const [disposAble] = this.viewDisposAbles.splice(index, 1);
			disposAble.dispose();
			pAnesToRemove.push(this.pAnes[index]);
		}
		this.removePAnes(pAnesToRemove);

		for (const pAne of pAnesToRemove) {
			pAne.setVisible(fAlse);
		}
	}

	protected toggleViewVisibility(viewId: string): void {
		// Check if view is Active
		if (this.viewContAinerModel.ActiveViewDescriptors.some(viewDescriptor => viewDescriptor.id === viewId)) {
			const visible = !this.viewContAinerModel.isVisible(viewId);
			type ViewsToggleVisibilityClAssificAtion = {
				viewId: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
				visible: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			};
			this.telemetryService.publicLog2<{ viewId: String, visible: booleAn }, ViewsToggleVisibilityClAssificAtion>('views.toggleVisibility', { viewId, visible });
			this.viewContAinerModel.setVisible(viewId, visible);
		}
	}

	privAte AddPAne(pAne: ViewPAne, size: number, index = this.pAneItems.length - 1): void {
		const onDidFocus = pAne.onDidFocus(() => this.lAstFocusedPAne = pAne);
		const onDidChAngeTitleAreA = pAne.onDidChAngeTitleAreA(() => {
			if (this.isViewMergedWithContAiner()) {
				this.updAteTitleAreA();
			}
		});

		const onDidChAngeVisibility = pAne.onDidChAngeBodyVisibility(() => this._onDidChAngeViewVisibility.fire(pAne));
		const onDidChAnge = pAne.onDidChAnge(() => {
			if (pAne === this.lAstFocusedPAne && !pAne.isExpAnded()) {
				this.lAstFocusedPAne = undefined;
			}
		});

		const isPAnel = this.viewDescriptorService.getViewContAinerLocAtion(this.viewContAiner) === ViewContAinerLocAtion.PAnel;
		const pAneStyler = AttAchStyler<IPAneColors>(this.themeService, {
			heAderForeground: isPAnel ? PANEL_SECTION_HEADER_FOREGROUND : SIDE_BAR_SECTION_HEADER_FOREGROUND,
			heAderBAckground: isPAnel ? PANEL_SECTION_HEADER_BACKGROUND : SIDE_BAR_SECTION_HEADER_BACKGROUND,
			heAderBorder: isPAnel ? PANEL_SECTION_HEADER_BORDER : SIDE_BAR_SECTION_HEADER_BORDER,
			dropBAckground: isPAnel ? PANEL_SECTION_DRAG_AND_DROP_BACKGROUND : SIDE_BAR_DRAG_AND_DROP_BACKGROUND,
			leftBorder: isPAnel ? PANEL_SECTION_BORDER : undefined
		}, pAne);
		const disposAble = combinedDisposAble(pAne, onDidFocus, onDidChAngeTitleAreA, pAneStyler, onDidChAnge, onDidChAngeVisibility);
		const pAneItem: IViewPAneItem = { pAne, disposAble };

		this.pAneItems.splice(index, 0, pAneItem);
		AssertIsDefined(this.pAneview).AddPAne(pAne, size, index);

		let overlAy: ViewPAneDropOverlAy | undefined;

		this._register(CompositeDrAgAndDropObserver.INSTANCE.registerDrAggAble(pAne.drAggAbleElement, () => { return { type: 'view', id: pAne.id }; }, {}));

		this._register(CompositeDrAgAndDropObserver.INSTANCE.registerTArget(pAne.dropTArgetElement, {
			onDrAgEnter: (e) => {
				if (!overlAy) {
					const dropDAtA = e.drAgAndDropDAtA.getDAtA();
					if (dropDAtA.type === 'view' && dropDAtA.id !== pAne.id) {

						const oldViewContAiner = this.viewDescriptorService.getViewContAinerByViewId(dropDAtA.id);
						const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropDAtA.id);

						if (oldViewContAiner !== this.viewContAiner && (!viewDescriptor || !viewDescriptor.cAnMoveView || this.viewContAiner.rejectAddedViews)) {
							return;
						}

						overlAy = new ViewPAneDropOverlAy(pAne.dropTArgetElement, this.orientAtion ?? OrientAtion.VERTICAL, undefined, this.viewDescriptorService.getViewContAinerLocAtion(this.viewContAiner)!, this.themeService);
					}

					if (dropDAtA.type === 'composite' && dropDAtA.id !== this.viewContAiner.id && !this.viewContAiner.rejectAddedViews) {
						const contAiner = this.viewDescriptorService.getViewContAinerById(dropDAtA.id)!;
						const viewsToMove = this.viewDescriptorService.getViewContAinerModel(contAiner).AllViewDescriptors;

						if (!viewsToMove.some(v => !v.cAnMoveView) && viewsToMove.length > 0) {
							overlAy = new ViewPAneDropOverlAy(pAne.dropTArgetElement, this.orientAtion ?? OrientAtion.VERTICAL, undefined, this.viewDescriptorService.getViewContAinerLocAtion(this.viewContAiner)!, this.themeService);
						}
					}
				}
			},
			onDrAgOver: (e) => {
				toggleDropEffect(e.eventDAtA.dAtATrAnsfer, 'move', overlAy !== undefined);
			},
			onDrAgLeAve: (e) => {
				overlAy?.dispose();
				overlAy = undefined;
			},
			onDrop: (e) => {
				if (overlAy) {
					const dropDAtA = e.drAgAndDropDAtA.getDAtA();
					const viewsToMove: IViewDescriptor[] = [];
					let AnchorView: IViewDescriptor | undefined;

					if (dropDAtA.type === 'composite' && dropDAtA.id !== this.viewContAiner.id && !this.viewContAiner.rejectAddedViews) {
						const contAiner = this.viewDescriptorService.getViewContAinerById(dropDAtA.id)!;
						const AllViews = this.viewDescriptorService.getViewContAinerModel(contAiner).AllViewDescriptors;

						if (AllViews.length > 0 && !AllViews.some(v => !v.cAnMoveView)) {
							viewsToMove.push(...AllViews);
							AnchorView = AllViews[0];
						}
					} else if (dropDAtA.type === 'view') {
						const oldViewContAiner = this.viewDescriptorService.getViewContAinerByViewId(dropDAtA.id);
						const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropDAtA.id);
						if (oldViewContAiner !== this.viewContAiner && viewDescriptor && viewDescriptor.cAnMoveView && !this.viewContAiner.rejectAddedViews) {
							viewsToMove.push(viewDescriptor);
						}

						if (viewDescriptor) {
							AnchorView = viewDescriptor;
						}
					}

					if (viewsToMove) {
						this.viewDescriptorService.moveViewsToContAiner(viewsToMove, this.viewContAiner);
					}

					if (AnchorView) {
						if (overlAy.currentDropOperAtion === DropDirection.DOWN ||
							overlAy.currentDropOperAtion === DropDirection.RIGHT) {

							const fromIndex = this.pAnes.findIndex(p => p.id === AnchorView!.id);
							let toIndex = this.pAnes.findIndex(p => p.id === pAne.id);

							if (fromIndex >= 0 && toIndex >= 0) {
								if (fromIndex > toIndex) {
									toIndex++;
								}

								if (toIndex < this.pAnes.length && toIndex !== fromIndex) {
									this.movePAne(this.pAnes[fromIndex], this.pAnes[toIndex]);
								}
							}
						}

						if (overlAy.currentDropOperAtion === DropDirection.UP ||
							overlAy.currentDropOperAtion === DropDirection.LEFT) {
							const fromIndex = this.pAnes.findIndex(p => p.id === AnchorView!.id);
							let toIndex = this.pAnes.findIndex(p => p.id === pAne.id);

							if (fromIndex >= 0 && toIndex >= 0) {
								if (fromIndex < toIndex) {
									toIndex--;
								}

								if (toIndex >= 0 && toIndex !== fromIndex) {
									this.movePAne(this.pAnes[fromIndex], this.pAnes[toIndex]);
								}
							}
						}

						if (viewsToMove.length > 1) {
							viewsToMove.slice(1).forEAch(view => {
								let toIndex = this.pAnes.findIndex(p => p.id === AnchorView!.id);
								let fromIndex = this.pAnes.findIndex(p => p.id === view.id);
								if (fromIndex >= 0 && toIndex >= 0) {
									if (fromIndex > toIndex) {
										toIndex++;
									}

									if (toIndex < this.pAnes.length && toIndex !== fromIndex) {
										this.movePAne(this.pAnes[fromIndex], this.pAnes[toIndex]);
										AnchorView = view;
									}
								}
							});
						}
					}
				}

				overlAy?.dispose();
				overlAy = undefined;
			}
		}));
	}

	removePAnes(pAnes: ViewPAne[]): void {
		const wAsMerged = this.isViewMergedWithContAiner();

		pAnes.forEAch(pAne => this.removePAne(pAne));

		this.updAteViewHeAders();
		if (wAsMerged !== this.isViewMergedWithContAiner()) {
			this.updAteTitleAreA();
		}

		this._onDidRemoveViews.fire(pAnes);
	}

	privAte removePAne(pAne: ViewPAne): void {
		const index = this.pAneItems.findIndex(i => i.pAne === pAne);

		if (index === -1) {
			return;
		}

		if (this.lAstFocusedPAne === pAne) {
			this.lAstFocusedPAne = undefined;
		}

		AssertIsDefined(this.pAneview).removePAne(pAne);
		const [pAneItem] = this.pAneItems.splice(index, 1);
		pAneItem.disposAble.dispose();

	}

	movePAne(from: ViewPAne, to: ViewPAne): void {
		const fromIndex = this.pAneItems.findIndex(item => item.pAne === from);
		const toIndex = this.pAneItems.findIndex(item => item.pAne === to);

		const fromViewDescriptor = this.viewContAinerModel.visibleViewDescriptors[fromIndex];
		const toViewDescriptor = this.viewContAinerModel.visibleViewDescriptors[toIndex];

		if (fromIndex < 0 || fromIndex >= this.pAneItems.length) {
			return;
		}

		if (toIndex < 0 || toIndex >= this.pAneItems.length) {
			return;
		}

		const [pAneItem] = this.pAneItems.splice(fromIndex, 1);
		this.pAneItems.splice(toIndex, 0, pAneItem);

		AssertIsDefined(this.pAneview).movePAne(from, to);

		this.viewContAinerModel.move(fromViewDescriptor.id, toViewDescriptor.id);

		this.updAteTitleAreA();
	}

	resizePAne(pAne: ViewPAne, size: number): void {
		AssertIsDefined(this.pAneview).resizePAne(pAne, size);
	}

	getPAneSize(pAne: ViewPAne): number {
		return AssertIsDefined(this.pAneview).getPAneSize(pAne);
	}

	privAte updAteViewHeAders(): void {
		if (this.isViewMergedWithContAiner()) {
			this.pAneItems[0].pAne.setExpAnded(true);
			this.pAneItems[0].pAne.heAderVisible = fAlse;
		} else {
			this.pAneItems.forEAch(i => i.pAne.heAderVisible = true);
		}
	}

	privAte isViewMergedWithContAiner(): booleAn {
		if (!(this.options.mergeViewWithContAinerWhenSingleView && this.pAneItems.length === 1)) {
			return fAlse;
		}
		if (!this.AreExtensionsReAdy) {
			if (this.visibleViewsCountFromCAche === undefined) {
				// TODO @sbAtten fix hAck for #91367
				return this.viewDescriptorService.getViewContAinerLocAtion(this.viewContAiner) === ViewContAinerLocAtion.PAnel;
			}
			// Check in cAche so thAt view do not jump. See #29609
			return this.visibleViewsCountFromCAche === 1;
		}
		return true;
	}

	dispose(): void {
		super.dispose();
		this.pAneItems.forEAch(i => i.disposAble.dispose());
		if (this.pAneview) {
			this.pAneview.dispose();
		}
	}
}

clAss MoveViewPosition extends Action2 {
	constructor(desc: ReAdonly<IAction2Options>, privAte reAdonly offset: number) {
		super(desc);
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const viewDescriptorService = Accessor.get(IViewDescriptorService);
		const contextKeyService = Accessor.get(IContextKeyService);

		const viewId = FocusedViewContext.getVAlue(contextKeyService);
		if (viewId === undefined) {
			return;
		}

		const viewContAiner = viewDescriptorService.getViewContAinerByViewId(viewId)!;
		const model = viewDescriptorService.getViewContAinerModel(viewContAiner);

		const viewDescriptor = model.visibleViewDescriptors.find(vd => vd.id === viewId)!;
		const currentIndex = model.visibleViewDescriptors.indexOf(viewDescriptor);
		if (currentIndex + this.offset < 0 || currentIndex + this.offset >= model.visibleViewDescriptors.length) {
			return;
		}

		const newPosition = model.visibleViewDescriptors[currentIndex + this.offset];

		model.move(viewDescriptor.id, newPosition.id);
	}
}

registerAction2(
	clAss MoveViewUp extends MoveViewPosition {
		constructor() {
			super({
				id: 'views.moveViewUp',
				title: nls.locAlize('viewMoveUp', "Move View Up"),
				keybinding: {
					primAry: KeyChord(KeyMod.CtrlCmd + KeyCode.KEY_K, KeyCode.UpArrow),
					weight: KeybindingWeight.WorkbenchContrib + 1,
					when: FocusedViewContext.notEquAlsTo('')
				}
			}, -1);
		}
	}
);

registerAction2(
	clAss MoveViewLeft extends MoveViewPosition {
		constructor() {
			super({
				id: 'views.moveViewLeft',
				title: nls.locAlize('viewMoveLeft', "Move View Left"),
				keybinding: {
					primAry: KeyChord(KeyMod.CtrlCmd + KeyCode.KEY_K, KeyCode.LeftArrow),
					weight: KeybindingWeight.WorkbenchContrib + 1,
					when: FocusedViewContext.notEquAlsTo('')
				}
			}, -1);
		}
	}
);

registerAction2(
	clAss MoveViewDown extends MoveViewPosition {
		constructor() {
			super({
				id: 'views.moveViewDown',
				title: nls.locAlize('viewMoveDown', "Move View Down"),
				keybinding: {
					primAry: KeyChord(KeyMod.CtrlCmd + KeyCode.KEY_K, KeyCode.DownArrow),
					weight: KeybindingWeight.WorkbenchContrib + 1,
					when: FocusedViewContext.notEquAlsTo('')
				}
			}, 1);
		}
	}
);

registerAction2(
	clAss MoveViewRight extends MoveViewPosition {
		constructor() {
			super({
				id: 'views.moveViewRight',
				title: nls.locAlize('viewMoveRight', "Move View Right"),
				keybinding: {
					primAry: KeyChord(KeyMod.CtrlCmd + KeyCode.KEY_K, KeyCode.RightArrow),
					weight: KeybindingWeight.WorkbenchContrib + 1,
					when: FocusedViewContext.notEquAlsTo('')
				}
			}, 1);
		}
	}
);
