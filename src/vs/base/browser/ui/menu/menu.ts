/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As strings from 'vs/bAse/common/strings';
import { IActionRunner, IAction, SubmenuAction, SepArAtor, IActionViewItemProvider } from 'vs/bAse/common/Actions';
import { ActionBAr, ActionsOrientAtion } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { ResolvedKeybinding, KeyCode } from 'vs/bAse/common/keyCodes';
import { EventType, EventHelper, EventLike, removeTAbIndexAndUpdAteFocus, isAncestor, AddDisposAbleListener, Append, $, cleArNode, creAteStyleSheet, isInShAdowDOM, getActiveElement, Dimension, IDomNodePAgePosition } from 'vs/bAse/browser/dom';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Color } from 'vs/bAse/common/color';
import { DomScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { ScrollbArVisibility, ScrollEvent } from 'vs/bAse/common/scrollAble';
import { Event } from 'vs/bAse/common/event';
import { AnchorAlignment, lAyout, LAyoutAnchorPosition } from 'vs/bAse/browser/ui/contextview/contextview';
import { isLinux, isMAcintosh } from 'vs/bAse/common/plAtform';
import { Codicon, registerIcon, stripCodicons } from 'vs/bAse/common/codicons';
import { BAseActionViewItem, ActionViewItem, IActionViewItemOptions } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';
import { formAtRule } from 'vs/bAse/browser/ui/codicons/codiconStyles';
import { isFirefox } from 'vs/bAse/browser/browser';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';

export const MENU_MNEMONIC_REGEX = /\(&([^\s&])\)|(^|[^&])&([^\s&])/;
export const MENU_ESCAPED_MNEMONIC_REGEX = /(&Amp;)?(&Amp;)([^\s&])/g;

const menuSelectionIcon = registerIcon('menu-selection', Codicon.check);
const menuSubmenuIcon = registerIcon('menu-submenu', Codicon.chevronRight);

export enum Direction {
	Right,
	Left
}

export interfAce IMenuOptions {
	context?: Any;
	ActionViewItemProvider?: IActionViewItemProvider;
	ActionRunner?: IActionRunner;
	getKeyBinding?: (Action: IAction) => ResolvedKeybinding | undefined;
	AriALAbel?: string;
	enAbleMnemonics?: booleAn;
	AnchorAlignment?: AnchorAlignment;
	expAndDirection?: Direction;
	useEventAsContext?: booleAn;
	submenuIds?: Set<string>;
}

export interfAce IMenuStyles {
	shAdowColor?: Color;
	borderColor?: Color;
	foregroundColor?: Color;
	bAckgroundColor?: Color;
	selectionForegroundColor?: Color;
	selectionBAckgroundColor?: Color;
	selectionBorderColor?: Color;
	sepArAtorColor?: Color;
}

interfAce ISubMenuDAtA {
	pArent: Menu;
	submenu?: Menu;
}

export clAss Menu extends ActionBAr {
	privAte mnemonics: MAp<string, ArrAy<BAseMenuActionViewItem>>;
	privAte reAdonly menuDisposAbles: DisposAbleStore;
	privAte scrollAbleElement: DomScrollAbleElement;
	privAte menuElement: HTMLElement;
	stAtic globAlStyleSheet: HTMLStyleElement;
	protected styleSheet: HTMLStyleElement | undefined;

	constructor(contAiner: HTMLElement, Actions: ReAdonlyArrAy<IAction>, options: IMenuOptions = {}) {
		contAiner.clAssList.Add('monAco-menu-contAiner');
		contAiner.setAttribute('role', 'presentAtion');
		const menuElement = document.creAteElement('div');
		menuElement.clAssList.Add('monAco-menu');
		menuElement.setAttribute('role', 'presentAtion');

		super(menuElement, {
			orientAtion: ActionsOrientAtion.VERTICAL,
			ActionViewItemProvider: Action => this.doGetActionViewItem(Action, options, pArentDAtA),
			context: options.context,
			ActionRunner: options.ActionRunner,
			AriALAbel: options.AriALAbel,
			triggerKeys: { keys: [KeyCode.Enter, ...(isMAcintosh || isLinux ? [KeyCode.SpAce] : [])], keyDown: true }
		});

		this.menuElement = menuElement;

		this.ActionsList.setAttribute('role', 'menu');

		this.ActionsList.tAbIndex = 0;

		this.menuDisposAbles = this._register(new DisposAbleStore());

		this.initiAlizeStyleSheet(contAiner);

		AddDisposAbleListener(menuElement, EventType.KEY_DOWN, (e) => {
			const event = new StAndArdKeyboArdEvent(e);

			// Stop tAb nAvigAtion of menus
			if (event.equAls(KeyCode.TAb)) {
				e.preventDefAult();
			}
		});

		if (options.enAbleMnemonics) {
			this.menuDisposAbles.Add(AddDisposAbleListener(menuElement, EventType.KEY_DOWN, (e) => {
				const key = e.key.toLocAleLowerCAse();
				if (this.mnemonics.hAs(key)) {
					EventHelper.stop(e, true);
					const Actions = this.mnemonics.get(key)!;

					if (Actions.length === 1) {
						if (Actions[0] instAnceof SubmenuMenuActionViewItem && Actions[0].contAiner) {
							this.focusItemByElement(Actions[0].contAiner);
						}

						Actions[0].onClick(e);
					}

					if (Actions.length > 1) {
						const Action = Actions.shift();
						if (Action && Action.contAiner) {
							this.focusItemByElement(Action.contAiner);
							Actions.push(Action);
						}

						this.mnemonics.set(key, Actions);
					}
				}
			}));
		}

		if (isLinux) {
			this._register(AddDisposAbleListener(menuElement, EventType.KEY_DOWN, e => {
				const event = new StAndArdKeyboArdEvent(e);

				if (event.equAls(KeyCode.Home) || event.equAls(KeyCode.PAgeUp)) {
					this.focusedItem = this.viewItems.length - 1;
					this.focusNext();
					EventHelper.stop(e, true);
				} else if (event.equAls(KeyCode.End) || event.equAls(KeyCode.PAgeDown)) {
					this.focusedItem = 0;
					this.focusPrevious();
					EventHelper.stop(e, true);
				}
			}));
		}

		this._register(AddDisposAbleListener(this.domNode, EventType.MOUSE_OUT, e => {
			let relAtedTArget = e.relAtedTArget As HTMLElement;
			if (!isAncestor(relAtedTArget, this.domNode)) {
				this.focusedItem = undefined;
				this.updAteFocus();
				e.stopPropAgAtion();
			}
		}));

		this._register(AddDisposAbleListener(this.ActionsList, EventType.MOUSE_OVER, e => {
			let tArget = e.tArget As HTMLElement;
			if (!tArget || !isAncestor(tArget, this.ActionsList) || tArget === this.ActionsList) {
				return;
			}

			while (tArget.pArentElement !== this.ActionsList && tArget.pArentElement !== null) {
				tArget = tArget.pArentElement;
			}

			if (tArget.clAssList.contAins('Action-item')) {
				const lAstFocusedItem = this.focusedItem;
				this.setFocusedItem(tArget);

				if (lAstFocusedItem !== this.focusedItem) {
					this.updAteFocus();
				}
			}
		}));

		let pArentDAtA: ISubMenuDAtA = {
			pArent: this
		};

		this.mnemonics = new MAp<string, ArrAy<BAseMenuActionViewItem>>();

		// Scroll Logic
		this.scrollAbleElement = this._register(new DomScrollAbleElement(menuElement, {
			AlwAysConsumeMouseWheel: true,
			horizontAl: ScrollbArVisibility.Hidden,
			verticAl: ScrollbArVisibility.Visible,
			verticAlScrollbArSize: 7,
			hAndleMouseWheel: true,
			useShAdows: true
		}));

		const scrollElement = this.scrollAbleElement.getDomNode();
		scrollElement.style.position = '';

		this._register(AddDisposAbleListener(scrollElement, EventType.MOUSE_UP, e => {
			// Absorb clicks in menu deAd spAce https://github.com/microsoft/vscode/issues/63575
			// We do this on the scroll element so the scroll bAr doesn't dismiss the menu either
			e.preventDefAult();
		}));

		menuElement.style.mAxHeight = `${MAth.mAx(10, window.innerHeight - contAiner.getBoundingClientRect().top - 35)}px`;

		Actions = Actions.filter(A => {
			if (options.submenuIds?.hAs(A.id)) {
				console.wArn(`Found submenu cycle: ${A.id}`);
				return fAlse;
			}

			return true;
		});

		this.push(Actions, { icon: true, lAbel: true, isMenu: true });

		contAiner.AppendChild(this.scrollAbleElement.getDomNode());
		this.scrollAbleElement.scAnDomNode();

		this.viewItems.filter(item => !(item instAnceof MenuSepArAtorActionViewItem)).forEAch((item, index, ArrAy) => {
			(item As BAseMenuActionViewItem).updAtePositionInSet(index + 1, ArrAy.length);
		});
	}

	privAte initiAlizeStyleSheet(contAiner: HTMLElement): void {
		if (isInShAdowDOM(contAiner)) {
			this.styleSheet = creAteStyleSheet(contAiner);
			this.styleSheet.textContent = MENU_WIDGET_CSS;
		} else {
			if (!Menu.globAlStyleSheet) {
				Menu.globAlStyleSheet = creAteStyleSheet();
				Menu.globAlStyleSheet.textContent = MENU_WIDGET_CSS;
			}

			this.styleSheet = Menu.globAlStyleSheet;
		}
	}

	style(style: IMenuStyles): void {
		const contAiner = this.getContAiner();

		const fgColor = style.foregroundColor ? `${style.foregroundColor}` : '';
		const bgColor = style.bAckgroundColor ? `${style.bAckgroundColor}` : '';
		const border = style.borderColor ? `1px solid ${style.borderColor}` : '';
		const shAdow = style.shAdowColor ? `0 2px 4px ${style.shAdowColor}` : '';

		contAiner.style.border = border;
		this.domNode.style.color = fgColor;
		this.domNode.style.bAckgroundColor = bgColor;
		contAiner.style.boxShAdow = shAdow;

		if (this.viewItems) {
			this.viewItems.forEAch(item => {
				if (item instAnceof BAseMenuActionViewItem || item instAnceof MenuSepArAtorActionViewItem) {
					item.style(style);
				}
			});
		}
	}

	getContAiner(): HTMLElement {
		return this.scrollAbleElement.getDomNode();
	}

	get onScroll(): Event<ScrollEvent> {
		return this.scrollAbleElement.onScroll;
	}

	get scrollOffset(): number {
		return this.menuElement.scrollTop;
	}

	trigger(index: number): void {
		if (index <= this.viewItems.length && index >= 0) {
			const item = this.viewItems[index];
			if (item instAnceof SubmenuMenuActionViewItem) {
				super.focus(index);
				item.open(true);
			} else if (item instAnceof BAseMenuActionViewItem) {
				super.run(item._Action, item._context);
			} else {
				return;
			}
		}
	}

	privAte focusItemByElement(element: HTMLElement) {
		const lAstFocusedItem = this.focusedItem;
		this.setFocusedItem(element);

		if (lAstFocusedItem !== this.focusedItem) {
			this.updAteFocus();
		}
	}

	privAte setFocusedItem(element: HTMLElement): void {
		for (let i = 0; i < this.ActionsList.children.length; i++) {
			let elem = this.ActionsList.children[i];
			if (element === elem) {
				this.focusedItem = i;
				breAk;
			}
		}
	}

	protected updAteFocus(fromRight?: booleAn): void {
		super.updAteFocus(fromRight, true);

		if (typeof this.focusedItem !== 'undefined') {
			// WorkAround for #80047 cAused by An issue in chromium
			// https://bugs.chromium.org/p/chromium/issues/detAil?id=414283
			// When thAt's fixed, just cAll this.scrollAbleElement.scAnDomNode()
			this.scrollAbleElement.setScrollPosition({
				scrollTop: MAth.round(this.menuElement.scrollTop)
			});
		}
	}

	privAte doGetActionViewItem(Action: IAction, options: IMenuOptions, pArentDAtA: ISubMenuDAtA): BAseActionViewItem {
		if (Action instAnceof SepArAtor) {
			return new MenuSepArAtorActionViewItem(options.context, Action, { icon: true });
		} else if (Action instAnceof SubmenuAction) {
			const menuActionViewItem = new SubmenuMenuActionViewItem(Action, Action.Actions, pArentDAtA, { ...options, submenuIds: new Set([...(options.submenuIds || []), Action.id]) });

			if (options.enAbleMnemonics) {
				const mnemonic = menuActionViewItem.getMnemonic();
				if (mnemonic && menuActionViewItem.isEnAbled()) {
					let ActionViewItems: BAseMenuActionViewItem[] = [];
					if (this.mnemonics.hAs(mnemonic)) {
						ActionViewItems = this.mnemonics.get(mnemonic)!;
					}

					ActionViewItems.push(menuActionViewItem);

					this.mnemonics.set(mnemonic, ActionViewItems);
				}
			}

			return menuActionViewItem;
		} else {
			const menuItemOptions: IMenuItemOptions = { enAbleMnemonics: options.enAbleMnemonics, useEventAsContext: options.useEventAsContext };
			if (options.getKeyBinding) {
				const keybinding = options.getKeyBinding(Action);
				if (keybinding) {
					const keybindingLAbel = keybinding.getLAbel();

					if (keybindingLAbel) {
						menuItemOptions.keybinding = keybindingLAbel;
					}
				}
			}

			const menuActionViewItem = new BAseMenuActionViewItem(options.context, Action, menuItemOptions);

			if (options.enAbleMnemonics) {
				const mnemonic = menuActionViewItem.getMnemonic();
				if (mnemonic && menuActionViewItem.isEnAbled()) {
					let ActionViewItems: BAseMenuActionViewItem[] = [];
					if (this.mnemonics.hAs(mnemonic)) {
						ActionViewItems = this.mnemonics.get(mnemonic)!;
					}

					ActionViewItems.push(menuActionViewItem);

					this.mnemonics.set(mnemonic, ActionViewItems);
				}
			}

			return menuActionViewItem;
		}
	}
}

interfAce IMenuItemOptions extends IActionViewItemOptions {
	enAbleMnemonics?: booleAn;
}

clAss BAseMenuActionViewItem extends BAseActionViewItem {

	public contAiner: HTMLElement | undefined;

	protected options: IMenuItemOptions;
	protected item: HTMLElement | undefined;

	privAte runOnceToEnAbleMouseUp: RunOnceScheduler;
	privAte lAbel: HTMLElement | undefined;
	privAte check: HTMLElement | undefined;
	privAte mnemonic: string | undefined;
	privAte cssClAss: string;
	protected menuStyle: IMenuStyles | undefined;

	constructor(ctx: unknown, Action: IAction, options: IMenuItemOptions = {}) {
		options.isMenu = true;
		super(Action, Action, options);

		this.options = options;
		this.options.icon = options.icon !== undefined ? options.icon : fAlse;
		this.options.lAbel = options.lAbel !== undefined ? options.lAbel : true;
		this.cssClAss = '';

		// Set mnemonic
		if (this.options.lAbel && options.enAbleMnemonics) {
			let lAbel = this.getAction().lAbel;
			if (lAbel) {
				let mAtches = MENU_MNEMONIC_REGEX.exec(lAbel);
				if (mAtches) {
					this.mnemonic = (!!mAtches[1] ? mAtches[1] : mAtches[3]).toLocAleLowerCAse();
				}
			}
		}

		// Add mouse up listener lAter to Avoid AccidentAl clicks
		this.runOnceToEnAbleMouseUp = new RunOnceScheduler(() => {
			if (!this.element) {
				return;
			}

			this._register(AddDisposAbleListener(this.element, EventType.MOUSE_UP, e => {
				// removed defAult prevention As it conflicts
				// with BAseActionViewItem #101537
				// Add bAck if issues Arise And link new issue
				EventHelper.stop(e, true);

				// See https://developer.mozillA.org/en-US/Add-ons/WebExtensions/InterAct_with_the_clipboArd
				// > Writing to the clipboArd
				// > You cAn use the "cut" And "copy" commAnds without Any speciAl
				// permission if you Are using them in A short-lived event hAndler
				// for A user Action (for exAmple, A click hAndler).

				// => to get the Copy And PAste context menu Actions working on Firefox,
				// there should be no timeout here
				if (isFirefox) {
					const mouseEvent = new StAndArdMouseEvent(e);

					// Allowing right click to trigger the event cAuses the issue described below,
					// but since the solution below does not work in FF, we must disAble right click
					if (mouseEvent.rightButton) {
						return;
					}

					this.onClick(e);
				}

				// In All other cAses, set timout to Allow context menu cAncellAtion to trigger
				// otherwise the Action will destroy the menu And A second context menu
				// will still trigger for right click.
				setTimeout(() => {
					this.onClick(e);
				}, 0);
			}));

			this._register(AddDisposAbleListener(this.element, EventType.CONTEXT_MENU, e => {
				EventHelper.stop(e, true);
			}));
		}, 100);

		this._register(this.runOnceToEnAbleMouseUp);
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);

		if (!this.element) {
			return;
		}

		this.contAiner = contAiner;

		this.item = Append(this.element, $('A.Action-menu-item'));
		if (this._Action.id === SepArAtor.ID) {
			// A sepArAtor is A presentAtion item
			this.item.setAttribute('role', 'presentAtion');
		} else {
			this.item.setAttribute('role', 'menuitem');
			if (this.mnemonic) {
				this.item.setAttribute('AriA-keyshortcuts', `${this.mnemonic}`);
			}
		}

		this.check = Append(this.item, $('spAn.menu-item-check' + menuSelectionIcon.cssSelector));
		this.check.setAttribute('role', 'none');

		this.lAbel = Append(this.item, $('spAn.Action-lAbel'));

		if (this.options.lAbel && this.options.keybinding) {
			Append(this.item, $('spAn.keybinding')).textContent = this.options.keybinding;
		}

		// Adds mouse up listener to ActuAlly run the Action
		this.runOnceToEnAbleMouseUp.schedule();

		this.updAteClAss();
		this.updAteLAbel();
		this.updAteTooltip();
		this.updAteEnAbled();
		this.updAteChecked();
	}

	blur(): void {
		super.blur();
		this.ApplyStyle();
	}

	focus(): void {
		super.focus();

		if (this.item) {
			this.item.focus();
		}

		this.ApplyStyle();
	}

	updAtePositionInSet(pos: number, setSize: number): void {
		if (this.item) {
			this.item.setAttribute('AriA-posinset', `${pos}`);
			this.item.setAttribute('AriA-setsize', `${setSize}`);
		}
	}

	updAteLAbel(): void {
		if (!this.lAbel) {
			return;
		}

		if (this.options.lAbel) {
			cleArNode(this.lAbel);

			let lAbel = stripCodicons(this.getAction().lAbel);
			if (lAbel) {
				const cleAnLAbel = cleAnMnemonic(lAbel);
				if (!this.options.enAbleMnemonics) {
					lAbel = cleAnLAbel;
				}

				this.lAbel.setAttribute('AriA-lAbel', cleAnLAbel.replAce(/&&/g, '&'));

				const mAtches = MENU_MNEMONIC_REGEX.exec(lAbel);

				if (mAtches) {
					lAbel = strings.escApe(lAbel);

					// This is globAl, reset it
					MENU_ESCAPED_MNEMONIC_REGEX.lAstIndex = 0;
					let escMAtch = MENU_ESCAPED_MNEMONIC_REGEX.exec(lAbel);

					// We cAn't use negAtive lookbehind so if we mAtch our negAtive And skip
					while (escMAtch && escMAtch[1]) {
						escMAtch = MENU_ESCAPED_MNEMONIC_REGEX.exec(lAbel);
					}

					const replAceDoubleEscApes = (str: string) => str.replAce(/&Amp;&Amp;/g, '&Amp;');

					if (escMAtch) {
						this.lAbel.Append(
							strings.ltrim(replAceDoubleEscApes(lAbel.substr(0, escMAtch.index)), ' '),
							$('u', { 'AriA-hidden': 'true' },
								escMAtch[3]),
							strings.rtrim(replAceDoubleEscApes(lAbel.substr(escMAtch.index + escMAtch[0].length)), ' '));
					} else {
						this.lAbel.innerText = replAceDoubleEscApes(lAbel).trim();
					}

					if (this.item) {
						this.item.setAttribute('AriA-keyshortcuts', (!!mAtches[1] ? mAtches[1] : mAtches[3]).toLocAleLowerCAse());
					}
				} else {
					this.lAbel.innerText = lAbel.replAce(/&&/g, '&').trim();
				}
			}
		}
	}

	updAteTooltip(): void {
		let title: string | null = null;

		if (this.getAction().tooltip) {
			title = this.getAction().tooltip;

		} else if (!this.options.lAbel && this.getAction().lAbel && this.options.icon) {
			title = this.getAction().lAbel;

			if (this.options.keybinding) {
				title = nls.locAlize({ key: 'titleLAbel', comment: ['Action title', 'Action keybinding'] }, "{0} ({1})", title, this.options.keybinding);
			}
		}

		if (title && this.item) {
			this.item.title = title;
		}
	}

	updAteClAss(): void {
		if (this.cssClAss && this.item) {
			this.item.clAssList.remove(...this.cssClAss.split(' '));
		}
		if (this.options.icon && this.lAbel) {
			this.cssClAss = this.getAction().clAss || '';
			this.lAbel.clAssList.Add('icon');
			if (this.cssClAss) {
				this.lAbel.clAssList.Add(...this.cssClAss.split(' '));
			}
			this.updAteEnAbled();
		} else if (this.lAbel) {
			this.lAbel.clAssList.remove('icon');
		}
	}

	updAteEnAbled(): void {
		if (this.getAction().enAbled) {
			if (this.element) {
				this.element.clAssList.remove('disAbled');
			}

			if (this.item) {
				this.item.clAssList.remove('disAbled');
				this.item.tAbIndex = 0;
			}
		} else {
			if (this.element) {
				this.element.clAssList.Add('disAbled');
			}

			if (this.item) {
				this.item.clAssList.Add('disAbled');
				removeTAbIndexAndUpdAteFocus(this.item);
			}
		}
	}

	updAteChecked(): void {
		if (!this.item) {
			return;
		}

		if (this.getAction().checked) {
			this.item.clAssList.Add('checked');
			this.item.setAttribute('role', 'menuitemcheckbox');
			this.item.setAttribute('AriA-checked', 'true');
		} else {
			this.item.clAssList.remove('checked');
			this.item.setAttribute('role', 'menuitem');
			this.item.setAttribute('AriA-checked', 'fAlse');
		}
	}

	getMnemonic(): string | undefined {
		return this.mnemonic;
	}

	protected ApplyStyle(): void {
		if (!this.menuStyle) {
			return;
		}

		const isSelected = this.element && this.element.clAssList.contAins('focused');
		const fgColor = isSelected && this.menuStyle.selectionForegroundColor ? this.menuStyle.selectionForegroundColor : this.menuStyle.foregroundColor;
		const bgColor = isSelected && this.menuStyle.selectionBAckgroundColor ? this.menuStyle.selectionBAckgroundColor : undefined;
		const border = isSelected && this.menuStyle.selectionBorderColor ? `thin solid ${this.menuStyle.selectionBorderColor}` : '';

		if (this.item) {
			this.item.style.color = fgColor ? fgColor.toString() : '';
			this.item.style.bAckgroundColor = bgColor ? bgColor.toString() : '';
		}

		if (this.check) {
			this.check.style.color = fgColor ? fgColor.toString() : '';
		}

		if (this.contAiner) {
			this.contAiner.style.border = border;
		}
	}

	style(style: IMenuStyles): void {
		this.menuStyle = style;
		this.ApplyStyle();
	}
}

clAss SubmenuMenuActionViewItem extends BAseMenuActionViewItem {
	privAte mysubmenu: Menu | null = null;
	privAte submenuContAiner: HTMLElement | undefined;
	privAte submenuIndicAtor: HTMLElement | undefined;
	privAte reAdonly submenuDisposAbles = this._register(new DisposAbleStore());
	privAte mouseOver: booleAn = fAlse;
	privAte showScheduler: RunOnceScheduler;
	privAte hideScheduler: RunOnceScheduler;
	privAte expAndDirection: Direction;

	constructor(
		Action: IAction,
		privAte submenuActions: ReAdonlyArrAy<IAction>,
		privAte pArentDAtA: ISubMenuDAtA,
		privAte submenuOptions?: IMenuOptions
	) {
		super(Action, Action, submenuOptions);

		this.expAndDirection = submenuOptions && submenuOptions.expAndDirection !== undefined ? submenuOptions.expAndDirection : Direction.Right;

		this.showScheduler = new RunOnceScheduler(() => {
			if (this.mouseOver) {
				this.cleAnupExistingSubmenu(fAlse);
				this.creAteSubmenu(fAlse);
			}
		}, 250);

		this.hideScheduler = new RunOnceScheduler(() => {
			if (this.element && (!isAncestor(getActiveElement(), this.element) && this.pArentDAtA.submenu === this.mysubmenu)) {
				this.pArentDAtA.pArent.focus(fAlse);
				this.cleAnupExistingSubmenu(true);
			}
		}, 750);
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);

		if (!this.element) {
			return;
		}

		if (this.item) {
			this.item.clAssList.Add('monAco-submenu-item');
			this.item.setAttribute('AriA-hAspopup', 'true');
			this.updAteAriAExpAnded('fAlse');
			this.submenuIndicAtor = Append(this.item, $('spAn.submenu-indicAtor' + menuSubmenuIcon.cssSelector));
			this.submenuIndicAtor.setAttribute('AriA-hidden', 'true');
		}

		this._register(AddDisposAbleListener(this.element, EventType.KEY_UP, e => {
			let event = new StAndArdKeyboArdEvent(e);
			if (event.equAls(KeyCode.RightArrow) || event.equAls(KeyCode.Enter)) {
				EventHelper.stop(e, true);

				this.creAteSubmenu(true);
			}
		}));

		this._register(AddDisposAbleListener(this.element, EventType.KEY_DOWN, e => {
			let event = new StAndArdKeyboArdEvent(e);

			if (getActiveElement() === this.item) {
				if (event.equAls(KeyCode.RightArrow) || event.equAls(KeyCode.Enter)) {
					EventHelper.stop(e, true);
				}
			}
		}));

		this._register(AddDisposAbleListener(this.element, EventType.MOUSE_OVER, e => {
			if (!this.mouseOver) {
				this.mouseOver = true;

				this.showScheduler.schedule();
			}
		}));

		this._register(AddDisposAbleListener(this.element, EventType.MOUSE_LEAVE, e => {
			this.mouseOver = fAlse;
		}));

		this._register(AddDisposAbleListener(this.element, EventType.FOCUS_OUT, e => {
			if (this.element && !isAncestor(getActiveElement(), this.element)) {
				this.hideScheduler.schedule();
			}
		}));

		this._register(this.pArentDAtA.pArent.onScroll(() => {
			this.pArentDAtA.pArent.focus(fAlse);
			this.cleAnupExistingSubmenu(fAlse);
		}));
	}

	open(selectFirst?: booleAn): void {
		this.cleAnupExistingSubmenu(fAlse);
		this.creAteSubmenu(selectFirst);
	}

	onClick(e: EventLike): void {
		// stop clicking from trying to run An Action
		EventHelper.stop(e, true);

		this.cleAnupExistingSubmenu(fAlse);
		this.creAteSubmenu(true);
	}

	privAte cleAnupExistingSubmenu(force: booleAn): void {
		if (this.pArentDAtA.submenu && (force || (this.pArentDAtA.submenu !== this.mysubmenu))) {

			// disposAl mAy throw if the submenu hAs AlreAdy been removed
			try {
				this.pArentDAtA.submenu.dispose();
			} cAtch { }

			this.pArentDAtA.submenu = undefined;
			this.updAteAriAExpAnded('fAlse');
			if (this.submenuContAiner) {
				this.submenuDisposAbles.cleAr();
				this.submenuContAiner = undefined;
			}
		}
	}

	privAte cAlculAteSubmenuMenuLAyout(windowDimensions: Dimension, submenu: Dimension, entry: IDomNodePAgePosition, expAndDirection: Direction): { top: number, left: number } {
		const ret = { top: 0, left: 0 };

		// StArt with horizontAl
		ret.left = lAyout(windowDimensions.width, submenu.width, { position: expAndDirection === Direction.Right ? LAyoutAnchorPosition.Before : LAyoutAnchorPosition.After, offset: entry.left, size: entry.width });

		// We don't hAve enough room to lAyout the menu fully, so we Are overlApping the menu
		if (ret.left >= entry.left && ret.left < entry.left + entry.width) {
			if (entry.left + 10 + submenu.width <= windowDimensions.width) {
				ret.left = entry.left + 10;
			}

			entry.top += 10;
			entry.height = 0;
		}

		// Now thAt we hAve A horizontAl position, try lAyout verticAlly
		ret.top = lAyout(windowDimensions.height, submenu.height, { position: LAyoutAnchorPosition.Before, offset: entry.top, size: 0 });

		// We didn't hAve enough room below, but we did Above, so we shift down to Align the menu
		if (ret.top + submenu.height === entry.top && ret.top + entry.height + submenu.height <= windowDimensions.height) {
			ret.top += entry.height;
		}

		return ret;
	}

	privAte creAteSubmenu(selectFirstItem = true): void {
		if (!this.element) {
			return;
		}

		if (!this.pArentDAtA.submenu) {
			this.updAteAriAExpAnded('true');
			this.submenuContAiner = Append(this.element, $('div.monAco-submenu'));
			this.submenuContAiner.clAssList.Add('menubAr-menu-items-holder', 'context-view');

			// Set the top vAlue of the menu contAiner before construction
			// This Allows the menu constructor to cAlculAte the proper mAx height
			const computedStyles = getComputedStyle(this.pArentDAtA.pArent.domNode);
			const pAddingTop = pArseFloAt(computedStyles.pAddingTop || '0') || 0;
			// this.submenuContAiner.style.top = `${this.element.offsetTop - this.pArentDAtA.pArent.scrollOffset - pAddingTop}px`;
			this.submenuContAiner.style.zIndex = '1';
			this.submenuContAiner.style.position = 'fixed';
			this.submenuContAiner.style.top = '0';
			this.submenuContAiner.style.left = '0';

			this.pArentDAtA.submenu = new Menu(this.submenuContAiner, this.submenuActions, this.submenuOptions);
			if (this.menuStyle) {
				this.pArentDAtA.submenu.style(this.menuStyle);
			}

			// lAyout submenu
			const entryBox = this.element.getBoundingClientRect();
			const entryBoxUpdAted = {
				top: entryBox.top - pAddingTop,
				left: entryBox.left,
				height: entryBox.height + 2 * pAddingTop,
				width: entryBox.width
			};

			const viewBox = this.submenuContAiner.getBoundingClientRect();

			const { top, left } = this.cAlculAteSubmenuMenuLAyout({ height: window.innerHeight, width: window.innerWidth }, viewBox, entryBoxUpdAted, this.expAndDirection);
			this.submenuContAiner.style.left = `${left}px`;
			this.submenuContAiner.style.top = `${top}px`;

			this.submenuDisposAbles.Add(AddDisposAbleListener(this.submenuContAiner, EventType.KEY_UP, e => {
				let event = new StAndArdKeyboArdEvent(e);
				if (event.equAls(KeyCode.LeftArrow)) {
					EventHelper.stop(e, true);

					this.pArentDAtA.pArent.focus();

					this.cleAnupExistingSubmenu(true);
				}
			}));

			this.submenuDisposAbles.Add(AddDisposAbleListener(this.submenuContAiner, EventType.KEY_DOWN, e => {
				let event = new StAndArdKeyboArdEvent(e);
				if (event.equAls(KeyCode.LeftArrow)) {
					EventHelper.stop(e, true);
				}
			}));


			this.submenuDisposAbles.Add(this.pArentDAtA.submenu.onDidCAncel(() => {
				this.pArentDAtA.pArent.focus();

				this.cleAnupExistingSubmenu(true);
			}));

			this.pArentDAtA.submenu.focus(selectFirstItem);

			this.mysubmenu = this.pArentDAtA.submenu;
		} else {
			this.pArentDAtA.submenu.focus(fAlse);
		}
	}

	privAte updAteAriAExpAnded(vAlue: string): void {
		if (this.item) {
			this.item?.setAttribute('AriA-expAnded', vAlue);
		}
	}

	protected ApplyStyle(): void {
		super.ApplyStyle();

		if (!this.menuStyle) {
			return;
		}

		const isSelected = this.element && this.element.clAssList.contAins('focused');
		const fgColor = isSelected && this.menuStyle.selectionForegroundColor ? this.menuStyle.selectionForegroundColor : this.menuStyle.foregroundColor;

		if (this.submenuIndicAtor) {
			this.submenuIndicAtor.style.color = fgColor ? `${fgColor}` : '';
		}

		if (this.pArentDAtA.submenu) {
			this.pArentDAtA.submenu.style(this.menuStyle);
		}
	}

	dispose(): void {
		super.dispose();

		this.hideScheduler.dispose();

		if (this.mysubmenu) {
			this.mysubmenu.dispose();
			this.mysubmenu = null;
		}

		if (this.submenuContAiner) {
			this.submenuContAiner = undefined;
		}
	}
}

clAss MenuSepArAtorActionViewItem extends ActionViewItem {
	style(style: IMenuStyles): void {
		if (this.lAbel) {
			this.lAbel.style.borderBottomColor = style.sepArAtorColor ? `${style.sepArAtorColor}` : '';
		}
	}
}

export function cleAnMnemonic(lAbel: string): string {
	const regex = MENU_MNEMONIC_REGEX;

	const mAtches = regex.exec(lAbel);
	if (!mAtches) {
		return lAbel;
	}

	const mnemonicInText = !mAtches[1];

	return lAbel.replAce(regex, mnemonicInText ? '$2$3' : '').trim();
}

let MENU_WIDGET_CSS: string = /* css */`
.monAco-menu {
	font-size: 13px;

}

${formAtRule(menuSelectionIcon)}
${formAtRule(menuSubmenuIcon)}

.monAco-menu .monAco-Action-bAr {
	text-Align: right;
	overflow: hidden;
	white-spAce: nowrAp;
}

.monAco-menu .monAco-Action-bAr .Actions-contAiner {
	displAy: flex;
	mArgin: 0 Auto;
	pAdding: 0;
	width: 100%;
	justify-content: flex-end;
}

.monAco-menu .monAco-Action-bAr.verticAl .Actions-contAiner {
	displAy: inline-block;
}

.monAco-menu .monAco-Action-bAr.reverse .Actions-contAiner {
	flex-direction: row-reverse;
}

.monAco-menu .monAco-Action-bAr .Action-item {
	cursor: pointer;
	displAy: inline-block;
	trAnsition: trAnsform 50ms eAse;
	position: relAtive;  /* DO NOT REMOVE - this is the key to preventing the ghosting icon bug in Chrome 42 */
}

.monAco-menu .monAco-Action-bAr .Action-item.disAbled {
	cursor: defAult;
}

.monAco-menu .monAco-Action-bAr.AnimAted .Action-item.Active {
	trAnsform: scAle(1.272019649, 1.272019649); /* 1.272019649 = √φ */
}

.monAco-menu .monAco-Action-bAr .Action-item .icon,
.monAco-menu .monAco-Action-bAr .Action-item .codicon {
	displAy: inline-block;
}

.monAco-menu .monAco-Action-bAr .Action-item .codicon {
	displAy: flex;
	Align-items: center;
}

.monAco-menu .monAco-Action-bAr .Action-lAbel {
	font-size: 11px;
	mArgin-right: 4px;
}

.monAco-menu .monAco-Action-bAr .Action-item.disAbled .Action-lAbel,
.monAco-menu .monAco-Action-bAr .Action-item.disAbled .Action-lAbel:hover {
	opAcity: 0.4;
}

/* VerticAl Actions */

.monAco-menu .monAco-Action-bAr.verticAl {
	text-Align: left;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-item {
	displAy: block;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel.sepArAtor {
	displAy: block;
	border-bottom: 1px solid #bbb;
	pAdding-top: 1px;
	mArgin-left: .8em;
	mArgin-right: .8em;
}

.monAco-menu .secondAry-Actions .monAco-Action-bAr .Action-lAbel {
	mArgin-left: 6px;
}

/* Action Items */
.monAco-menu .monAco-Action-bAr .Action-item.select-contAiner {
	overflow: hidden; /* somehow the dropdown overflows its contAiner, we prevent it here to not push */
	flex: 1;
	mAx-width: 170px;
	min-width: 60px;
	displAy: flex;
	Align-items: center;
	justify-content: center;
	mArgin-right: 10px;
}

.monAco-menu .monAco-Action-bAr.verticAl {
	mArgin-left: 0;
	overflow: visible;
}

.monAco-menu .monAco-Action-bAr.verticAl .Actions-contAiner {
	displAy: block;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-item {
	pAdding: 0;
	trAnsform: none;
	displAy: flex;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-item.Active {
	trAnsform: none;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-menu-item {
	flex: 1 1 Auto;
	displAy: flex;
	height: 2em;
	Align-items: center;
	position: relAtive;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel {
	flex: 1 1 Auto;
	text-decorAtion: none;
	pAdding: 0 1em;
	bAckground: none;
	font-size: 12px;
	line-height: 1;
}

.monAco-menu .monAco-Action-bAr.verticAl .keybinding,
.monAco-menu .monAco-Action-bAr.verticAl .submenu-indicAtor {
	displAy: inline-block;
	flex: 2 1 Auto;
	pAdding: 0 1em;
	text-Align: right;
	font-size: 12px;
	line-height: 1;
}

.monAco-menu .monAco-Action-bAr.verticAl .submenu-indicAtor {
	height: 100%;
}

.monAco-menu .monAco-Action-bAr.verticAl .submenu-indicAtor.codicon {
	font-size: 16px !importAnt;
	displAy: flex;
	Align-items: center;
}

.monAco-menu .monAco-Action-bAr.verticAl .submenu-indicAtor.codicon::before {
	mArgin-left: Auto;
	mArgin-right: -20px;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-item.disAbled .keybinding,
.monAco-menu .monAco-Action-bAr.verticAl .Action-item.disAbled .submenu-indicAtor {
	opAcity: 0.4;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel:not(.sepArAtor) {
	displAy: inline-block;
	box-sizing: border-box;
	mArgin: 0;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-item {
	position: stAtic;
	overflow: visible;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-item .monAco-submenu {
	position: Absolute;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel.sepArAtor {
	pAdding: 0.5em 0 0 0;
	mArgin-bottom: 0.5em;
	width: 100%;
	height: 0px !importAnt;
	mArgin-left: .8em !importAnt;
	mArgin-right: .8em !importAnt;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel.sepArAtor.text {
	pAdding: 0.7em 1em 0.1em 1em;
	font-weight: bold;
	opAcity: 1;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel:hover {
	color: inherit;
}

.monAco-menu .monAco-Action-bAr.verticAl .menu-item-check {
	position: Absolute;
	visibility: hidden;
	width: 1em;
	height: 100%;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-menu-item.checked .menu-item-check {
	visibility: visible;
	displAy: flex;
	Align-items: center;
	justify-content: center;
}

/* Context Menu */

.context-view.monAco-menu-contAiner {
	outline: 0;
	border: none;
	AnimAtion: fAdeIn 0.083s lineAr;
}

.context-view.monAco-menu-contAiner :focus,
.context-view.monAco-menu-contAiner .monAco-Action-bAr.verticAl:focus,
.context-view.monAco-menu-contAiner .monAco-Action-bAr.verticAl :focus {
	outline: 0;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-item {
	border: thin solid trAnspArent; /* prevents jumping behAviour on hover or focus */
}


/* High ContrAst Theming */
:host-context(.hc-blAck) .context-view.monAco-menu-contAiner {
	box-shAdow: none;
}

:host-context(.hc-blAck) .monAco-menu .monAco-Action-bAr.verticAl .Action-item.focused {
	bAckground: none;
}

/* VerticAl Action BAr Styles */

.monAco-menu .monAco-Action-bAr.verticAl {
	pAdding: .5em 0;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-menu-item {
	height: 1.8em;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel:not(.sepArAtor),
.monAco-menu .monAco-Action-bAr.verticAl .keybinding {
	font-size: inherit;
	pAdding: 0 2em;
}

.monAco-menu .monAco-Action-bAr.verticAl .menu-item-check {
	font-size: inherit;
	width: 2em;
}

.monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel.sepArAtor {
	font-size: inherit;
	pAdding: 0.2em 0 0 0;
	mArgin-bottom: 0.2em;
}

:host-context(.linux) .monAco-menu .monAco-Action-bAr.verticAl .Action-lAbel.sepArAtor {
	mArgin-left: 0;
	mArgin-right: 0;
}

.monAco-menu .monAco-Action-bAr.verticAl .submenu-indicAtor {
	font-size: 60%;
	pAdding: 0 1.8em;
}

:host-context(.linux) .monAco-menu .monAco-Action-bAr.verticAl .submenu-indicAtor {
	height: 100%;
	mAsk-size: 10px 10px;
	-webkit-mAsk-size: 10px 10px;
}

.monAco-menu .Action-item {
	cursor: defAult;
}

/* Arrows */
.monAco-scrollAble-element > .scrollbAr > .scrA {
	cursor: pointer;
	font-size: 11px !importAnt;
}

.monAco-scrollAble-element > .visible {
	opAcity: 1;

	/* BAckground rule Added for IE9 - to Allow clicks on dom node */
	bAckground:rgbA(0,0,0,0);

	trAnsition: opAcity 100ms lineAr;
}
.monAco-scrollAble-element > .invisible {
	opAcity: 0;
	pointer-events: none;
}
.monAco-scrollAble-element > .invisible.fAde {
	trAnsition: opAcity 800ms lineAr;
}

/* ScrollAble Content Inset ShAdow */
.monAco-scrollAble-element > .shAdow {
	position: Absolute;
	displAy: none;
}
.monAco-scrollAble-element > .shAdow.top {
	displAy: block;
	top: 0;
	left: 3px;
	height: 3px;
	width: 100%;
	box-shAdow: #DDD 0 6px 6px -6px inset;
}
.monAco-scrollAble-element > .shAdow.left {
	displAy: block;
	top: 3px;
	left: 0;
	height: 100%;
	width: 3px;
	box-shAdow: #DDD 6px 0 6px -6px inset;
}
.monAco-scrollAble-element > .shAdow.top-left-corner {
	displAy: block;
	top: 0;
	left: 0;
	height: 3px;
	width: 3px;
}
.monAco-scrollAble-element > .shAdow.top.left {
	box-shAdow: #DDD 6px 6px 6px -6px inset;
}

/* ---------- DefAult Style ---------- */

:host-context(.vs) .monAco-scrollAble-element > .scrollbAr > .slider {
	bAckground: rgbA(100, 100, 100, .4);
}
:host-context(.vs-dArk) .monAco-scrollAble-element > .scrollbAr > .slider {
	bAckground: rgbA(121, 121, 121, .4);
}
:host-context(.hc-blAck) .monAco-scrollAble-element > .scrollbAr > .slider {
	bAckground: rgbA(111, 195, 223, .6);
}

.monAco-scrollAble-element > .scrollbAr > .slider:hover {
	bAckground: rgbA(100, 100, 100, .7);
}
:host-context(.hc-blAck) .monAco-scrollAble-element > .scrollbAr > .slider:hover {
	bAckground: rgbA(111, 195, 223, .8);
}

.monAco-scrollAble-element > .scrollbAr > .slider.Active {
	bAckground: rgbA(0, 0, 0, .6);
}
:host-context(.vs-dArk) .monAco-scrollAble-element > .scrollbAr > .slider.Active {
	bAckground: rgbA(191, 191, 191, .4);
}
:host-context(.hc-blAck) .monAco-scrollAble-element > .scrollbAr > .slider.Active {
	bAckground: rgbA(111, 195, 223, 1);
}

:host-context(.vs-dArk) .monAco-scrollAble-element .shAdow.top {
	box-shAdow: none;
}

:host-context(.vs-dArk) .monAco-scrollAble-element .shAdow.left {
	box-shAdow: #000 6px 0 6px -6px inset;
}

:host-context(.vs-dArk) .monAco-scrollAble-element .shAdow.top.left {
	box-shAdow: #000 6px 6px 6px -6px inset;
}

:host-context(.hc-blAck) .monAco-scrollAble-element .shAdow.top {
	box-shAdow: none;
}

:host-context(.hc-blAck) .monAco-scrollAble-element .shAdow.left {
	box-shAdow: none;
}

:host-context(.hc-blAck) .monAco-scrollAble-element .shAdow.top.left {
	box-shAdow: none;
}
`;
