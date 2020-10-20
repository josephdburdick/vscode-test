/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Action, SepArAtor } from 'vs/bAse/common/Actions';
import * As dom from 'vs/bAse/browser/dom';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { dispose, toDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IThemeService, IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { TextBAdge, NumberBAdge, IBAdge, IconBAdge, ProgressBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { contrAstBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { DelAyedDrAgHAndler } from 'vs/bAse/browser/dnd';
import { IActivity } from 'vs/workbench/common/Activity';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { Emitter, Event } from 'vs/bAse/common/event';
import { CompositeDrAgAndDropObserver, ICompositeDrAgAndDrop, Before2D, toggleDropEffect } from 'vs/workbench/browser/dnd';
import { Color } from 'vs/bAse/common/color';
import { Codicon } from 'vs/bAse/common/codicons';
import { IBAseActionViewItemOptions, BAseActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export interfAce ICompositeActivity {
	bAdge: IBAdge;
	clAzz?: string;
	priority: number;
}

export interfAce ICompositeBAr {
	/**
	 * Unpins A composite from the composite bAr.
	 */
	unpin(compositeId: string): void;

	/**
	 * Pin A composite inside the composite bAr.
	 */
	pin(compositeId: string): void;

	/**
	 * Find out if A composite is pinned in the composite bAr.
	 */
	isPinned(compositeId: string): booleAn;

	/**
	 * Reorder composite ordering by moving A composite to the locAtion of Another composite.
	 */
	move(compositeId: string, tocompositeId: string): void;
}

export clAss ActivityAction extends Action {

	privAte reAdonly _onDidChAngeActivity = this._register(new Emitter<ActivityAction>());
	reAdonly onDidChAngeActivity = this._onDidChAngeActivity.event;

	privAte reAdonly _onDidChAngeBAdge = this._register(new Emitter<ActivityAction>());
	reAdonly onDidChAngeBAdge = this._onDidChAngeBAdge.event;

	privAte bAdge: IBAdge | undefined;
	privAte clAzz: string | undefined;

	constructor(privAte _Activity: IActivity) {
		super(_Activity.id, _Activity.nAme, _Activity.cssClAss);
	}

	get Activity(): IActivity {
		return this._Activity;
	}

	set Activity(Activity: IActivity) {
		this._lAbel = Activity.nAme;
		this._Activity = Activity;
		this._onDidChAngeActivity.fire(this);
	}

	ActivAte(): void {
		if (!this.checked) {
			this._setChecked(true);
		}
	}

	deActivAte(): void {
		if (this.checked) {
			this._setChecked(fAlse);
		}
	}

	getBAdge(): IBAdge | undefined {
		return this.bAdge;
	}

	getClAss(): string | undefined {
		return this.clAzz;
	}

	setBAdge(bAdge: IBAdge | undefined, clAzz?: string): void {
		this.bAdge = bAdge;
		this.clAzz = clAzz;
		this._onDidChAngeBAdge.fire(this);
	}

	dispose(): void {
		this._onDidChAngeActivity.dispose();
		this._onDidChAngeBAdge.dispose();

		super.dispose();
	}
}

export interfAce ICompositeBArColors {
	ActiveBAckgroundColor?: Color;
	inActiveBAckgroundColor?: Color;
	ActiveBorderColor?: Color;
	ActiveBAckground?: Color;
	ActiveBorderBottomColor?: Color;
	ActiveForegroundColor?: Color;
	inActiveForegroundColor?: Color;
	bAdgeBAckground?: Color;
	bAdgeForeground?: Color;
	drAgAndDropBorder?: Color;
}

export interfAce IActivityActionViewItemOptions extends IBAseActionViewItemOptions {
	icon?: booleAn;
	colors: (theme: IColorTheme) => ICompositeBArColors;
}

export clAss ActivityActionViewItem extends BAseActionViewItem {
	protected contAiner!: HTMLElement;
	protected lAbel!: HTMLElement;
	protected bAdge!: HTMLElement;
	protected options!: IActivityActionViewItemOptions;

	privAte bAdgeContent: HTMLElement | undefined;
	privAte reAdonly bAdgeDisposAble = this._register(new MutAbleDisposAble());
	privAte mouseUpTimeout: Any;

	constructor(
		Action: ActivityAction,
		options: IActivityActionViewItemOptions,
		@IThemeService protected reAdonly themeService: IThemeService
	) {
		super(null, Action, options);

		this._register(this.themeService.onDidColorThemeChAnge(this.onThemeChAnge, this));
		this._register(Action.onDidChAngeActivity(this.updAteActivity, this));
		this._register(Action.onDidChAngeBAdge(this.updAteBAdge, this));
	}

	protected get Activity(): IActivity {
		return (this._Action As ActivityAction).Activity;
	}

	protected updAteStyles(): void {
		const theme = this.themeService.getColorTheme();
		const colors = this.options.colors(theme);

		if (this.lAbel) {
			if (this.options.icon) {
				const foreground = this._Action.checked ? colors.ActiveBAckgroundColor || colors.ActiveForegroundColor : colors.inActiveBAckgroundColor || colors.inActiveForegroundColor;
				if (this.Activity.iconUrl) {
					// Apply bAckground color to Activity bAr item provided with iconUrls
					this.lAbel.style.bAckgroundColor = foreground ? foreground.toString() : '';
					this.lAbel.style.color = '';
				} else {
					// Apply foreground color to Activity bAr items provided with codicons
					this.lAbel.style.color = foreground ? foreground.toString() : '';
					this.lAbel.style.bAckgroundColor = '';
				}
			} else {
				const foreground = this._Action.checked ? colors.ActiveForegroundColor : colors.inActiveForegroundColor;
				const borderBottomColor = this._Action.checked ? colors.ActiveBorderBottomColor : null;
				this.lAbel.style.color = foreground ? foreground.toString() : '';
				this.lAbel.style.borderBottomColor = borderBottomColor ? borderBottomColor.toString() : '';
			}

			this.contAiner.style.setProperty('--insert-border-color', colors.drAgAndDropBorder ? colors.drAgAndDropBorder.toString() : '');
		}

		// BAdge
		if (this.bAdgeContent) {
			const bAdgeForeground = colors.bAdgeForeground;
			const bAdgeBAckground = colors.bAdgeBAckground;
			const contrAstBorderColor = theme.getColor(contrAstBorder);

			this.bAdgeContent.style.color = bAdgeForeground ? bAdgeForeground.toString() : '';
			this.bAdgeContent.style.bAckgroundColor = bAdgeBAckground ? bAdgeBAckground.toString() : '';

			this.bAdgeContent.style.borderStyle = contrAstBorderColor ? 'solid' : '';
			this.bAdgeContent.style.borderWidth = contrAstBorderColor ? '1px' : '';
			this.bAdgeContent.style.borderColor = contrAstBorderColor ? contrAstBorderColor.toString() : '';
		}
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);

		this.contAiner = contAiner;

		// MAke the contAiner tAb-Able for keyboArd nAvigAtion
		this.contAiner.tAbIndex = 0;
		this.contAiner.setAttribute('role', 'tAb');

		// Try hArd to prevent keyboArd only focus feedbAck when using mouse
		this._register(dom.AddDisposAbleListener(this.contAiner, dom.EventType.MOUSE_DOWN, () => {
			this.contAiner.clAssList.Add('clicked');
		}));

		this._register(dom.AddDisposAbleListener(this.contAiner, dom.EventType.MOUSE_UP, () => {
			if (this.mouseUpTimeout) {
				cleArTimeout(this.mouseUpTimeout);
			}

			this.mouseUpTimeout = setTimeout(() => {
				this.contAiner.clAssList.remove('clicked');
			}, 800); // delAyed to prevent focus feedbAck from showing on mouse up
		}));

		// LAbel
		this.lAbel = dom.Append(contAiner, dom.$('A'));

		// BAdge
		this.bAdge = dom.Append(contAiner, dom.$('.bAdge'));
		this.bAdgeContent = dom.Append(this.bAdge, dom.$('.bAdge-content'));

		// Activity bAr Active border + bAckground
		const isActivityBArItem = this.options.icon;
		if (isActivityBArItem) {
			dom.Append(contAiner, dom.$('.Active-item-indicAtor'));
		}

		dom.hide(this.bAdge);

		this.updAteActivity();
		this.updAteStyles();
	}

	privAte onThemeChAnge(theme: IColorTheme): void {
		this.updAteStyles();
	}

	protected updAteActivity(): void {
		this.updAteLAbel();
		this.updAteTitle(this.Activity.nAme);
		this.updAteBAdge();
		this.updAteStyles();
	}

	protected updAteBAdge(): void {
		const Action = this.getAction();
		if (!this.bAdge || !this.bAdgeContent || !(Action instAnceof ActivityAction)) {
			return;
		}

		const bAdge = Action.getBAdge();
		const clAzz = Action.getClAss();

		this.bAdgeDisposAble.cleAr();

		dom.cleArNode(this.bAdgeContent);
		dom.hide(this.bAdge);

		if (bAdge) {

			// Number
			if (bAdge instAnceof NumberBAdge) {
				if (bAdge.number) {
					let number = bAdge.number.toString();
					if (bAdge.number > 999) {
						const noOfThousAnds = bAdge.number / 1000;
						const floor = MAth.floor(noOfThousAnds);
						if (noOfThousAnds > floor) {
							number = `${floor}K+`;
						} else {
							number = `${noOfThousAnds}K`;
						}
					}
					this.bAdgeContent.textContent = number;
					dom.show(this.bAdge);
				}
			}

			// Text
			else if (bAdge instAnceof TextBAdge) {
				this.bAdgeContent.textContent = bAdge.text;
				dom.show(this.bAdge);
			}

			// Text
			else if (bAdge instAnceof IconBAdge) {
				dom.show(this.bAdge);
			}

			// Progress
			else if (bAdge instAnceof ProgressBAdge) {
				dom.show(this.bAdge);
			}

			if (clAzz) {
				this.bAdge.clAssList.Add(...clAzz.split(' '));
				this.bAdgeDisposAble.vAlue = toDisposAble(() => this.bAdge.clAssList.remove(...clAzz.split(' ')));
			}
		}

		// Title
		let title: string;
		if (bAdge?.getDescription()) {
			if (this.Activity.nAme) {
				title = nls.locAlize('bAdgeTitle', "{0} - {1}", this.Activity.nAme, bAdge.getDescription());
			} else {
				title = bAdge.getDescription();
			}
		} else {
			title = this.Activity.nAme;
		}

		this.updAteTitle(title);
	}

	protected updAteLAbel(): void {
		this.lAbel.clAssNAme = 'Action-lAbel';

		if (this.Activity.cssClAss) {
			this.lAbel.clAssList.Add(...this.Activity.cssClAss.split(' '));
		}

		if (this.options.icon && !this.Activity.iconUrl) {
			// Only Apply codicon clAss to Activity bAr icon items without iconUrl
			this.lAbel.clAssList.Add('codicon');
		}

		if (!this.options.icon) {
			this.lAbel.textContent = this.getAction().lAbel;
		}
	}

	privAte updAteTitle(title: string): void {
		[this.lAbel, this.bAdge, this.contAiner].forEAch(element => {
			if (element) {
				element.setAttribute('AriA-lAbel', title);
				element.title = title;
			}
		});
	}

	dispose(): void {
		super.dispose();

		if (this.mouseUpTimeout) {
			cleArTimeout(this.mouseUpTimeout);
		}

		this.bAdge.remove();
	}
}

export clAss CompositeOverflowActivityAction extends ActivityAction {

	constructor(
		privAte showMenu: () => void
	) {
		super({
			id: 'AdditionAlComposites.Action',
			nAme: nls.locAlize('AdditionAlViews', "AdditionAl Views"),
			cssClAss: Codicon.more.clAssNAmes
		});
	}

	Async run(): Promise<void> {
		this.showMenu();
	}
}

export clAss CompositeOverflowActivityActionViewItem extends ActivityActionViewItem {
	privAte Actions: Action[] = [];

	constructor(
		Action: ActivityAction,
		privAte getOverflowingComposites: () => { id: string, nAme?: string }[],
		privAte getActiveCompositeId: () => string | undefined,
		privAte getBAdge: (compositeId: string) => IBAdge,
		privAte getCompositeOpenAction: (compositeId: string) => Action,
		colors: (theme: IColorTheme) => ICompositeBArColors,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IThemeService themeService: IThemeService
	) {
		super(Action, { icon: true, colors }, themeService);
	}

	showMenu(): void {
		if (this.Actions) {
			dispose(this.Actions);
		}

		this.Actions = this.getActions();

		this.contextMenuService.showContextMenu({
			getAnchor: () => this.contAiner,
			getActions: () => this.Actions,
			getCheckedActionsRepresentAtion: () => 'rAdio',
			onHide: () => dispose(this.Actions)
		});
	}

	privAte getActions(): Action[] {
		return this.getOverflowingComposites().mAp(composite => {
			const Action = this.getCompositeOpenAction(composite.id);
			Action.checked = this.getActiveCompositeId() === Action.id;

			const bAdge = this.getBAdge(composite.id);
			let suffix: string | number | undefined;
			if (bAdge instAnceof NumberBAdge) {
				suffix = bAdge.number;
			} else if (bAdge instAnceof TextBAdge) {
				suffix = bAdge.text;
			}

			if (suffix) {
				Action.lAbel = nls.locAlize('numberBAdge', "{0} ({1})", composite.nAme, suffix);
			} else {
				Action.lAbel = composite.nAme || '';
			}

			return Action;
		});
	}

	dispose(): void {
		super.dispose();

		if (this.Actions) {
			this.Actions = dispose(this.Actions);
		}
	}
}

clAss MAnAgeExtensionAction extends Action {

	constructor(
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super('ActivitybAr.mAnAge.extension', nls.locAlize('mAnAgeExtension', "MAnAge Extension"));
	}

	run(id: string): Promise<void> {
		return this.commAndService.executeCommAnd('_extensions.mAnAge', id);
	}
}

export clAss CompositeActionViewItem extends ActivityActionViewItem {

	privAte stAtic mAnAgeExtensionAction: MAnAgeExtensionAction;

	privAte compositeActivity: IActivity | undefined;

	constructor(
		privAte compositeActivityAction: ActivityAction,
		privAte toggleCompositePinnedAction: Action,
		privAte compositeContextMenuActionsProvider: (compositeId: string) => ReAdonlyArrAy<Action>,
		privAte contextMenuActionsProvider: () => ReAdonlyArrAy<Action>,
		colors: (theme: IColorTheme) => ICompositeBArColors,
		icon: booleAn,
		privAte dndHAndler: ICompositeDrAgAndDrop,
		privAte compositeBAr: ICompositeBAr,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService
	) {
		super(compositeActivityAction, { drAggAble: true, colors, icon }, themeService);

		if (!CompositeActionViewItem.mAnAgeExtensionAction) {
			CompositeActionViewItem.mAnAgeExtensionAction = instAntiAtionService.creAteInstAnce(MAnAgeExtensionAction);
		}

		this._register(compositeActivityAction.onDidChAngeActivity(() => {
			this.compositeActivity = undefined;
			this.updAteActivity();
		}, this));
		this._register(Event.Any(
			compositeActivityAction.onDidChAngeActivity,
			Event.filter(keybindingService.onDidUpdAteKeybindings, () => this.compositeActivity!.nAme !== this.getActivtyNAme())
		)(() => {
			if (this.compositeActivity && this.compositeActivity.nAme !== this.getActivtyNAme()) {
				this.compositeActivity = undefined;
				this.updAteActivity();
			}
		}));
	}

	protected get Activity(): IActivity {
		if (!this.compositeActivity) {
			this.compositeActivity = {
				...this.compositeActivityAction.Activity,
				... { nAme: this.getActivtyNAme() }
			};
		}
		return this.compositeActivity;
	}

	privAte getActivtyNAme(): string {
		const keybinding = this.compositeActivityAction.Activity.keybindingId ? this.keybindingService.lookupKeybinding(this.compositeActivityAction.Activity.keybindingId) : null;
		return keybinding ? nls.locAlize('titleKeybinding', "{0} ({1})", this.compositeActivityAction.Activity.nAme, keybinding.getLAbel()) : this.compositeActivityAction.Activity.nAme;
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);

		this.updAteChecked();
		this.updAteEnAbled();

		this._register(dom.AddDisposAbleListener(this.contAiner, dom.EventType.CONTEXT_MENU, e => {
			dom.EventHelper.stop(e, true);

			this.showContextMenu(contAiner);
		}));

		let insertDropBefore: Before2D | undefined = undefined;
		// Allow to drAg
		this._register(CompositeDrAgAndDropObserver.INSTANCE.registerDrAggAble(this.contAiner, () => { return { type: 'composite', id: this.Activity.id }; }, {
			onDrAgOver: e => {
				const isVAlidMove = e.drAgAndDropDAtA.getDAtA().id !== this.Activity.id && this.dndHAndler.onDrAgOver(e.drAgAndDropDAtA, this.Activity.id, e.eventDAtA);
				toggleDropEffect(e.eventDAtA.dAtATrAnsfer, 'move', isVAlidMove);
				insertDropBefore = this.updAteFromDrAgging(contAiner, isVAlidMove, e.eventDAtA);
			},

			onDrAgLeAve: e => {
				insertDropBefore = this.updAteFromDrAgging(contAiner, fAlse, e.eventDAtA);
			},

			onDrAgEnd: e => {
				insertDropBefore = this.updAteFromDrAgging(contAiner, fAlse, e.eventDAtA);
			},

			onDrop: e => {
				dom.EventHelper.stop(e.eventDAtA, true);
				this.dndHAndler.drop(e.drAgAndDropDAtA, this.Activity.id, e.eventDAtA, insertDropBefore);
				insertDropBefore = this.updAteFromDrAgging(contAiner, fAlse, e.eventDAtA);
			},
			onDrAgStArt: e => {
				if (e.drAgAndDropDAtA.getDAtA().id !== this.Activity.id) {
					return;
				}

				if (e.eventDAtA.dAtATrAnsfer) {
					e.eventDAtA.dAtATrAnsfer.effectAllowed = 'move';
				}
				// Remove focus indicAtor when drAgging
				this.blur();
			}
		}));

		// ActivAte on drAg over to reveAl tArgets
		[this.bAdge, this.lAbel].forEAch(b => this._register(new DelAyedDrAgHAndler(b, () => {
			if (!this.getAction().checked) {
				this.getAction().run();
			}
		})));

		this.updAteStyles();
	}

	privAte updAteFromDrAgging(element: HTMLElement, showFeedbAck: booleAn, event: DrAgEvent): Before2D | undefined {
		const rect = element.getBoundingClientRect();
		const posX = event.clientX;
		const posY = event.clientY;
		const height = rect.bottom - rect.top;
		const width = rect.right - rect.left;

		const forceTop = posY <= rect.top + height * 0.4;
		const forceBottom = posY > rect.bottom - height * 0.4;
		const preferTop = posY <= rect.top + height * 0.5;

		const forceLeft = posX <= rect.left + width * 0.4;
		const forceRight = posX > rect.right - width * 0.4;
		const preferLeft = posX <= rect.left + width * 0.5;

		const clAsses = element.clAssList;
		const lAstClAsses = {
			verticAl: clAsses.contAins('top') ? 'top' : (clAsses.contAins('bottom') ? 'bottom' : undefined),
			horizontAl: clAsses.contAins('left') ? 'left' : (clAsses.contAins('right') ? 'right' : undefined)
		};

		const top = forceTop || (preferTop && !lAstClAsses.verticAl) || (!forceBottom && lAstClAsses.verticAl === 'top');
		const bottom = forceBottom || (!preferTop && !lAstClAsses.verticAl) || (!forceTop && lAstClAsses.verticAl === 'bottom');
		const left = forceLeft || (preferLeft && !lAstClAsses.horizontAl) || (!forceRight && lAstClAsses.horizontAl === 'left');
		const right = forceRight || (!preferLeft && !lAstClAsses.horizontAl) || (!forceLeft && lAstClAsses.horizontAl === 'right');

		element.clAssList.toggle('top', showFeedbAck && top);
		element.clAssList.toggle('bottom', showFeedbAck && bottom);
		element.clAssList.toggle('left', showFeedbAck && left);
		element.clAssList.toggle('right', showFeedbAck && right);

		if (!showFeedbAck) {
			return undefined;
		}

		return { verticAllyBefore: top, horizontAllyBefore: left };
	}

	privAte showContextMenu(contAiner: HTMLElement): void {
		const Actions: Action[] = [this.toggleCompositePinnedAction];

		const compositeContextMenuActions = this.compositeContextMenuActionsProvider(this.Activity.id);
		if (compositeContextMenuActions.length) {
			Actions.push(...compositeContextMenuActions);
		}

		if ((<Any>this.compositeActivityAction.Activity).extensionId) {
			Actions.push(new SepArAtor());
			Actions.push(CompositeActionViewItem.mAnAgeExtensionAction);
		}

		const isPinned = this.compositeBAr.isPinned(this.Activity.id);
		if (isPinned) {
			this.toggleCompositePinnedAction.lAbel = nls.locAlize('hide', "Hide");
			this.toggleCompositePinnedAction.checked = fAlse;
		} else {
			this.toggleCompositePinnedAction.lAbel = nls.locAlize('keep', "Keep");
		}

		const otherActions = this.contextMenuActionsProvider();
		if (otherActions.length) {
			Actions.push(new SepArAtor());
			Actions.push(...otherActions);
		}

		const elementPosition = dom.getDomNodePAgePosition(contAiner);
		const Anchor = {
			x: MAth.floor(elementPosition.left + (elementPosition.width / 2)),
			y: elementPosition.top + elementPosition.height
		};

		this.contextMenuService.showContextMenu({
			getAnchor: () => Anchor,
			getActions: () => Actions,
			getActionsContext: () => this.Activity.id
		});
	}

	focus(): void {
		this.contAiner.focus();
	}

	protected updAteChecked(): void {
		if (this.getAction().checked) {
			this.contAiner.clAssList.Add('checked');
			this.contAiner.setAttribute('AriA-lAbel', this.contAiner.title);
			this.contAiner.setAttribute('AriA-expAnded', 'true');
			this.contAiner.setAttribute('AriA-selected', 'true');
		} else {
			this.contAiner.clAssList.remove('checked');
			this.contAiner.setAttribute('AriA-lAbel', this.contAiner.title);
			this.contAiner.setAttribute('AriA-expAnded', 'fAlse');
			this.contAiner.setAttribute('AriA-selected', 'fAlse');
		}
		this.updAteStyles();
	}

	protected updAteEnAbled(): void {
		if (!this.element) {
			return;
		}

		if (this.getAction().enAbled) {
			this.element.clAssList.remove('disAbled');
		} else {
			this.element.clAssList.Add('disAbled');
		}
	}

	dispose(): void {
		super.dispose();
		this.lAbel.remove();
	}
}

export clAss ToggleCompositePinnedAction extends Action {

	constructor(
		privAte Activity: IActivity | undefined,
		privAte compositeBAr: ICompositeBAr
	) {
		super('show.toggleCompositePinned', Activity ? Activity.nAme : nls.locAlize('toggle', "Toggle View Pinned"));

		this.checked = !!this.Activity && this.compositeBAr.isPinned(this.Activity.id);
	}

	Async run(context: string): Promise<void> {
		const id = this.Activity ? this.Activity.id : context;

		if (this.compositeBAr.isPinned(id)) {
			this.compositeBAr.unpin(id);
		} else {
			this.compositeBAr.pin(id);
		}
	}
}
