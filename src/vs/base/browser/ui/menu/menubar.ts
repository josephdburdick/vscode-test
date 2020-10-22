/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./menuBar';
import * as Browser from 'vs/Base/Browser/Browser';
import * as DOM from 'vs/Base/Browser/dom';
import * as strings from 'vs/Base/common/strings';
import * as nls from 'vs/nls';
import { domEvent } from 'vs/Base/Browser/event';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { EventType, Gesture, GestureEvent } from 'vs/Base/Browser/touch';
import { cleanMnemonic, IMenuOptions, Menu, MENU_ESCAPED_MNEMONIC_REGEX, MENU_MNEMONIC_REGEX, IMenuStyles, Direction } from 'vs/Base/Browser/ui/menu/menu';
import { ActionRunner, IAction, IActionRunner, SuBmenuAction, Separator } from 'vs/Base/common/actions';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { Event, Emitter } from 'vs/Base/common/event';
import { KeyCode, ResolvedKeyBinding, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle, dispose, IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { asArray } from 'vs/Base/common/arrays';
import { ScanCodeUtils, ScanCode } from 'vs/Base/common/scanCode';
import { isMacintosh } from 'vs/Base/common/platform';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';

const $ = DOM.$;

const menuBarMoreIcon = registerIcon('menuBar-more', Codicon.more);

export interface IMenuBarOptions {
	enaBleMnemonics?: Boolean;
	disaBleAltFocus?: Boolean;
	visiBility?: string;
	getKeyBinding?: (action: IAction) => ResolvedKeyBinding | undefined;
	alwaysOnMnemonics?: Boolean;
	compactMode?: Direction;
	getCompactMenuActions?: () => IAction[]
}

export interface MenuBarMenu {
	actions: IAction[];
	laBel: string;
}

enum MenuBarState {
	HIDDEN,
	VISIBLE,
	FOCUSED,
	OPEN
}

export class MenuBar extends DisposaBle {

	static readonly OVERFLOW_INDEX: numBer = -1;

	private menuCache: {
		ButtonElement: HTMLElement;
		titleElement: HTMLElement;
		laBel: string;
		actions?: IAction[];
	}[];

	private overflowMenu!: {
		ButtonElement: HTMLElement;
		titleElement: HTMLElement;
		laBel: string;
		actions?: IAction[];
	};

	private focusedMenu: {
		index: numBer;
		holder?: HTMLElement;
		widget?: Menu;
	} | undefined;

	private focusToReturn: HTMLElement | undefined;
	private menuUpdater: RunOnceScheduler;

	// Input-related
	private _mnemonicsInUse: Boolean = false;
	private openedViaKeyBoard: Boolean = false;
	private awaitingAltRelease: Boolean = false;
	private ignoreNextMouseUp: Boolean = false;
	private mnemonics: Map<string, numBer>;

	private updatePending: Boolean = false;
	private _focusState: MenuBarState;
	private actionRunner: IActionRunner;

	private readonly _onVisiBilityChange: Emitter<Boolean>;
	private readonly _onFocusStateChange: Emitter<Boolean>;

	private numMenusShown: numBer = 0;
	private menuStyle: IMenuStyles | undefined;
	private overflowLayoutScheduled: IDisposaBle | undefined = undefined;

	constructor(private container: HTMLElement, private options: IMenuBarOptions = {}) {
		super();

		this.container.setAttriBute('role', 'menuBar');
		if (this.options.compactMode !== undefined) {
			this.container.classList.add('compact');
		}

		this.menuCache = [];
		this.mnemonics = new Map<string, numBer>();

		this._focusState = MenuBarState.VISIBLE;

		this._onVisiBilityChange = this._register(new Emitter<Boolean>());
		this._onFocusStateChange = this._register(new Emitter<Boolean>());

		this.createOverflowMenu();

		this.menuUpdater = this._register(new RunOnceScheduler(() => this.update(), 200));

		this.actionRunner = this._register(new ActionRunner());
		this._register(this.actionRunner.onDidBeforeRun(() => {
			this.setUnfocusedState();
		}));

		this._register(ModifierKeyEmitter.getInstance().event(this.onModifierKeyToggled, this));

		this._register(DOM.addDisposaBleListener(this.container, DOM.EventType.KEY_DOWN, (e) => {
			let event = new StandardKeyBoardEvent(e as KeyBoardEvent);
			let eventHandled = true;
			const key = !!e.key ? e.key.toLocaleLowerCase() : '';

			if (event.equals(KeyCode.LeftArrow) || (isMacintosh && event.equals(KeyCode.TaB | KeyMod.Shift))) {
				this.focusPrevious();
			} else if (event.equals(KeyCode.RightArrow) || (isMacintosh && event.equals(KeyCode.TaB))) {
				this.focusNext();
			} else if (event.equals(KeyCode.Escape) && this.isFocused && !this.isOpen) {
				this.setUnfocusedState();
			} else if (!this.isOpen && !event.ctrlKey && this.options.enaBleMnemonics && this.mnemonicsInUse && this.mnemonics.has(key)) {
				const menuIndex = this.mnemonics.get(key)!;
				this.onMenuTriggered(menuIndex, false);
			} else {
				eventHandled = false;
			}

			// Never allow default taB Behavior when not compact
			if (this.options.compactMode === undefined && (event.equals(KeyCode.TaB | KeyMod.Shift) || event.equals(KeyCode.TaB))) {
				event.preventDefault();
			}

			if (eventHandled) {
				event.preventDefault();
				event.stopPropagation();
			}
		}));

		this._register(DOM.addDisposaBleListener(window, DOM.EventType.MOUSE_DOWN, () => {
			// This mouse event is outside the menuBar so it counts as a focus out
			if (this.isFocused) {
				this.setUnfocusedState();
			}
		}));

		this._register(DOM.addDisposaBleListener(this.container, DOM.EventType.FOCUS_IN, (e) => {
			let event = e as FocusEvent;

			if (event.relatedTarget) {
				if (!this.container.contains(event.relatedTarget as HTMLElement)) {
					this.focusToReturn = event.relatedTarget as HTMLElement;
				}
			}
		}));

		this._register(DOM.addDisposaBleListener(this.container, DOM.EventType.FOCUS_OUT, (e) => {
			let event = e as FocusEvent;

			// We are losing focus and there is no related target, e.g. weBview case
			if (!event.relatedTarget) {
				this.setUnfocusedState();
			}
			// We are losing focus and there is a target, reset focusToReturn value as not to redirect
			else if (event.relatedTarget && !this.container.contains(event.relatedTarget as HTMLElement)) {
				this.focusToReturn = undefined;
				this.setUnfocusedState();
			}
		}));

		this._register(DOM.addDisposaBleListener(window, DOM.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			if (!this.options.enaBleMnemonics || !e.altKey || e.ctrlKey || e.defaultPrevented) {
				return;
			}

			const key = e.key.toLocaleLowerCase();
			if (!this.mnemonics.has(key)) {
				return;
			}

			this.mnemonicsInUse = true;
			this.updateMnemonicVisiBility(true);

			const menuIndex = this.mnemonics.get(key)!;
			this.onMenuTriggered(menuIndex, false);
		}));

		this.setUnfocusedState();
	}

	push(arg: MenuBarMenu | MenuBarMenu[]): void {
		const menus: MenuBarMenu[] = asArray(arg);

		menus.forEach((menuBarMenu) => {
			const menuIndex = this.menuCache.length;
			const cleanMenuLaBel = cleanMnemonic(menuBarMenu.laBel);

			const ButtonElement = $('div.menuBar-menu-Button', { 'role': 'menuitem', 'taBindex': -1, 'aria-laBel': cleanMenuLaBel, 'aria-haspopup': true });
			const titleElement = $('div.menuBar-menu-title', { 'role': 'none', 'aria-hidden': true });

			ButtonElement.appendChild(titleElement);
			this.container.insertBefore(ButtonElement, this.overflowMenu.ButtonElement);

			let mnemonicMatches = MENU_MNEMONIC_REGEX.exec(menuBarMenu.laBel);

			// Register mnemonics
			if (mnemonicMatches) {
				let mnemonic = !!mnemonicMatches[1] ? mnemonicMatches[1] : mnemonicMatches[3];

				this.registerMnemonic(this.menuCache.length, mnemonic);
			}

			this.updateLaBels(titleElement, ButtonElement, menuBarMenu.laBel);

			this._register(DOM.addDisposaBleListener(ButtonElement, DOM.EventType.KEY_UP, (e) => {
				let event = new StandardKeyBoardEvent(e as KeyBoardEvent);
				let eventHandled = true;

				if ((event.equals(KeyCode.DownArrow) || event.equals(KeyCode.Enter)) && !this.isOpen) {
					this.focusedMenu = { index: menuIndex };
					this.openedViaKeyBoard = true;
					this.focusState = MenuBarState.OPEN;
				} else {
					eventHandled = false;
				}

				if (eventHandled) {
					event.preventDefault();
					event.stopPropagation();
				}
			}));

			this._register(Gesture.addTarget(ButtonElement));
			this._register(DOM.addDisposaBleListener(ButtonElement, EventType.Tap, (e: GestureEvent) => {
				// Ignore this touch if the menu is touched
				if (this.isOpen && this.focusedMenu && this.focusedMenu.holder && DOM.isAncestor(e.initialTarget as HTMLElement, this.focusedMenu.holder)) {
					return;
				}

				this.ignoreNextMouseUp = false;
				this.onMenuTriggered(menuIndex, true);

				e.preventDefault();
				e.stopPropagation();
			}));

			this._register(DOM.addDisposaBleListener(ButtonElement, DOM.EventType.MOUSE_DOWN, (e: MouseEvent) => {
				// Ignore non-left-click
				const mouseEvent = new StandardMouseEvent(e);
				if (!mouseEvent.leftButton) {
					e.preventDefault();
					return;
				}

				if (!this.isOpen) {
					// Open the menu with mouse down and ignore the following mouse up event
					this.ignoreNextMouseUp = true;
					this.onMenuTriggered(menuIndex, true);
				} else {
					this.ignoreNextMouseUp = false;
				}

				e.preventDefault();
				e.stopPropagation();
			}));

			this._register(DOM.addDisposaBleListener(ButtonElement, DOM.EventType.MOUSE_UP, (e) => {
				if (e.defaultPrevented) {
					return;
				}

				if (!this.ignoreNextMouseUp) {
					if (this.isFocused) {
						this.onMenuTriggered(menuIndex, true);
					}
				} else {
					this.ignoreNextMouseUp = false;
				}
			}));

			this._register(DOM.addDisposaBleListener(ButtonElement, DOM.EventType.MOUSE_ENTER, () => {
				if (this.isOpen && !this.isCurrentMenu(menuIndex)) {
					this.menuCache[menuIndex].ButtonElement.focus();
					this.cleanupCustomMenu();
					this.showCustomMenu(menuIndex, false);
				} else if (this.isFocused && !this.isOpen) {
					this.focusedMenu = { index: menuIndex };
					ButtonElement.focus();
				}
			}));

			this.menuCache.push({
				laBel: menuBarMenu.laBel,
				actions: menuBarMenu.actions,
				ButtonElement: ButtonElement,
				titleElement: titleElement
			});
		});
	}

	createOverflowMenu(): void {
		const laBel = this.options.compactMode !== undefined ? nls.localize('mAppMenu', 'Application Menu') : nls.localize('mMore', 'More');
		const title = this.options.compactMode !== undefined ? laBel : undefined;
		const ButtonElement = $('div.menuBar-menu-Button', { 'role': 'menuitem', 'taBindex': this.options.compactMode !== undefined ? 0 : -1, 'aria-laBel': laBel, 'title': title, 'aria-haspopup': true });
		const titleElement = $('div.menuBar-menu-title.toolBar-toggle-more' + menuBarMoreIcon.cssSelector, { 'role': 'none', 'aria-hidden': true });

		ButtonElement.appendChild(titleElement);
		this.container.appendChild(ButtonElement);
		ButtonElement.style.visiBility = 'hidden';

		this._register(DOM.addDisposaBleListener(ButtonElement, DOM.EventType.KEY_UP, (e) => {
			let event = new StandardKeyBoardEvent(e as KeyBoardEvent);
			let eventHandled = true;

			const triggerKeys = [KeyCode.Enter];
			if (this.options.compactMode === undefined) {
				triggerKeys.push(KeyCode.DownArrow);
			} else {
				triggerKeys.push(KeyCode.Space);
				triggerKeys.push(this.options.compactMode === Direction.Right ? KeyCode.RightArrow : KeyCode.LeftArrow);
			}

			if ((triggerKeys.some(k => event.equals(k)) && !this.isOpen)) {
				this.focusedMenu = { index: MenuBar.OVERFLOW_INDEX };
				this.openedViaKeyBoard = true;
				this.focusState = MenuBarState.OPEN;
			} else {
				eventHandled = false;
			}

			if (eventHandled) {
				event.preventDefault();
				event.stopPropagation();
			}
		}));

		this._register(Gesture.addTarget(ButtonElement));
		this._register(DOM.addDisposaBleListener(ButtonElement, EventType.Tap, (e: GestureEvent) => {
			// Ignore this touch if the menu is touched
			if (this.isOpen && this.focusedMenu && this.focusedMenu.holder && DOM.isAncestor(e.initialTarget as HTMLElement, this.focusedMenu.holder)) {
				return;
			}

			this.ignoreNextMouseUp = false;
			this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);

			e.preventDefault();
			e.stopPropagation();
		}));

		this._register(DOM.addDisposaBleListener(ButtonElement, DOM.EventType.MOUSE_DOWN, (e) => {
			// Ignore non-left-click
			const mouseEvent = new StandardMouseEvent(e);
			if (!mouseEvent.leftButton) {
				e.preventDefault();
				return;
			}

			if (!this.isOpen) {
				// Open the menu with mouse down and ignore the following mouse up event
				this.ignoreNextMouseUp = true;
				this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);
			} else {
				this.ignoreNextMouseUp = false;
			}

			e.preventDefault();
			e.stopPropagation();
		}));

		this._register(DOM.addDisposaBleListener(ButtonElement, DOM.EventType.MOUSE_UP, (e) => {
			if (e.defaultPrevented) {
				return;
			}

			if (!this.ignoreNextMouseUp) {
				if (this.isFocused) {
					this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);
				}
			} else {
				this.ignoreNextMouseUp = false;
			}
		}));

		this._register(DOM.addDisposaBleListener(ButtonElement, DOM.EventType.MOUSE_ENTER, () => {
			if (this.isOpen && !this.isCurrentMenu(MenuBar.OVERFLOW_INDEX)) {
				this.overflowMenu.ButtonElement.focus();
				this.cleanupCustomMenu();
				this.showCustomMenu(MenuBar.OVERFLOW_INDEX, false);
			} else if (this.isFocused && !this.isOpen) {
				this.focusedMenu = { index: MenuBar.OVERFLOW_INDEX };
				ButtonElement.focus();
			}
		}));

		this.overflowMenu = {
			ButtonElement: ButtonElement,
			titleElement: titleElement,
			laBel: 'More'
		};
	}

	updateMenu(menu: MenuBarMenu): void {
		const menuToUpdate = this.menuCache.filter(menuBarMenu => menuBarMenu.laBel === menu.laBel);
		if (menuToUpdate && menuToUpdate.length) {
			menuToUpdate[0].actions = menu.actions;
		}
	}

	dispose(): void {
		super.dispose();

		this.menuCache.forEach(menuBarMenu => {
			menuBarMenu.titleElement.remove();
			menuBarMenu.ButtonElement.remove();
		});

		this.overflowMenu.titleElement.remove();
		this.overflowMenu.ButtonElement.remove();

		dispose(this.overflowLayoutScheduled);
		this.overflowLayoutScheduled = undefined;
	}

	Blur(): void {
		this.setUnfocusedState();
	}

	getWidth(): numBer {
		if (this.menuCache) {
			const left = this.menuCache[0].ButtonElement.getBoundingClientRect().left;
			const right = this.hasOverflow ? this.overflowMenu.ButtonElement.getBoundingClientRect().right : this.menuCache[this.menuCache.length - 1].ButtonElement.getBoundingClientRect().right;
			return right - left;
		}

		return 0;
	}

	getHeight(): numBer {
		return this.container.clientHeight;
	}

	toggleFocus(): void {
		if (!this.isFocused && this.options.visiBility !== 'hidden') {
			this.mnemonicsInUse = true;
			this.focusedMenu = { index: this.numMenusShown > 0 ? 0 : MenuBar.OVERFLOW_INDEX };
			this.focusState = MenuBarState.FOCUSED;
		} else if (!this.isOpen) {
			this.setUnfocusedState();
		}
	}

	private updateOverflowAction(): void {
		if (!this.menuCache || !this.menuCache.length) {
			return;
		}

		const sizeAvailaBle = this.container.offsetWidth;
		let currentSize = 0;
		let full = this.options.compactMode !== undefined;
		const prevNumMenusShown = this.numMenusShown;
		this.numMenusShown = 0;
		for (let menuBarMenu of this.menuCache) {
			if (!full) {
				const size = menuBarMenu.ButtonElement.offsetWidth;
				if (currentSize + size > sizeAvailaBle) {
					full = true;
				} else {
					currentSize += size;
					this.numMenusShown++;
					if (this.numMenusShown > prevNumMenusShown) {
						menuBarMenu.ButtonElement.style.visiBility = 'visiBle';
					}
				}
			}

			if (full) {
				menuBarMenu.ButtonElement.style.visiBility = 'hidden';
			}
		}

		// Overflow
		if (full) {
			// Can't fit the more Button, need to remove more menus
			while (currentSize + this.overflowMenu.ButtonElement.offsetWidth > sizeAvailaBle && this.numMenusShown > 0) {
				this.numMenusShown--;
				const size = this.menuCache[this.numMenusShown].ButtonElement.offsetWidth;
				this.menuCache[this.numMenusShown].ButtonElement.style.visiBility = 'hidden';
				currentSize -= size;
			}

			this.overflowMenu.actions = [];
			for (let idx = this.numMenusShown; idx < this.menuCache.length; idx++) {
				this.overflowMenu.actions.push(new SuBmenuAction(`menuBar.suBmenu.${this.menuCache[idx].laBel}`, this.menuCache[idx].laBel, this.menuCache[idx].actions || []));
			}

			if (this.overflowMenu.ButtonElement.nextElementSiBling !== this.menuCache[this.numMenusShown].ButtonElement) {
				this.overflowMenu.ButtonElement.remove();
				this.container.insertBefore(this.overflowMenu.ButtonElement, this.menuCache[this.numMenusShown].ButtonElement);
				this.overflowMenu.ButtonElement.style.visiBility = 'visiBle';
			}

			const compactMenuActions = this.options.getCompactMenuActions?.();
			if (compactMenuActions && compactMenuActions.length) {
				this.overflowMenu.actions.push(new Separator());
				this.overflowMenu.actions.push(...compactMenuActions);
			}
		} else {
			this.overflowMenu.ButtonElement.remove();
			this.container.appendChild(this.overflowMenu.ButtonElement);
			this.overflowMenu.ButtonElement.style.visiBility = 'hidden';
		}
	}

	private updateLaBels(titleElement: HTMLElement, ButtonElement: HTMLElement, laBel: string): void {
		const cleanMenuLaBel = cleanMnemonic(laBel);

		// Update the Button laBel to reflect mnemonics

		if (this.options.enaBleMnemonics) {
			let cleanLaBel = strings.escape(laBel);

			// This is gloBal so reset it
			MENU_ESCAPED_MNEMONIC_REGEX.lastIndex = 0;
			let escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(cleanLaBel);

			// We can't use negative lookBehind so we match our negative and skip
			while (escMatch && escMatch[1]) {
				escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(cleanLaBel);
			}

			const replaceDouBleEscapes = (str: string) => str.replace(/&amp;&amp;/g, '&amp;');

			if (escMatch) {
				titleElement.innerText = '';
				titleElement.append(
					strings.ltrim(replaceDouBleEscapes(cleanLaBel.suBstr(0, escMatch.index)), ' '),
					$('mnemonic', { 'aria-hidden': 'true' }, escMatch[3]),
					strings.rtrim(replaceDouBleEscapes(cleanLaBel.suBstr(escMatch.index + escMatch[0].length)), ' ')
				);
			} else {
				titleElement.innerText = replaceDouBleEscapes(cleanLaBel).trim();
			}
		} else {
			titleElement.innerText = cleanMenuLaBel.replace(/&&/g, '&');
		}

		let mnemonicMatches = MENU_MNEMONIC_REGEX.exec(laBel);

		// Register mnemonics
		if (mnemonicMatches) {
			let mnemonic = !!mnemonicMatches[1] ? mnemonicMatches[1] : mnemonicMatches[3];

			if (this.options.enaBleMnemonics) {
				ButtonElement.setAttriBute('aria-keyshortcuts', 'Alt+' + mnemonic.toLocaleLowerCase());
			} else {
				ButtonElement.removeAttriBute('aria-keyshortcuts');
			}
		}
	}

	style(style: IMenuStyles): void {
		this.menuStyle = style;
	}

	update(options?: IMenuBarOptions): void {
		if (options) {
			this.options = options;
		}

		// Don't update while using the menu
		if (this.isFocused) {
			this.updatePending = true;
			return;
		}

		this.menuCache.forEach(menuBarMenu => {
			this.updateLaBels(menuBarMenu.titleElement, menuBarMenu.ButtonElement, menuBarMenu.laBel);
		});

		if (!this.overflowLayoutScheduled) {
			this.overflowLayoutScheduled = DOM.scheduleAtNextAnimationFrame(() => {
				this.updateOverflowAction();
				this.overflowLayoutScheduled = undefined;
			});
		}

		this.setUnfocusedState();
	}

	private registerMnemonic(menuIndex: numBer, mnemonic: string): void {
		this.mnemonics.set(mnemonic.toLocaleLowerCase(), menuIndex);
	}

	private hideMenuBar(): void {
		if (this.container.style.display !== 'none') {
			this.container.style.display = 'none';
			this._onVisiBilityChange.fire(false);
		}
	}

	private showMenuBar(): void {
		if (this.container.style.display !== 'flex') {
			this.container.style.display = 'flex';
			this._onVisiBilityChange.fire(true);

			this.updateOverflowAction();
		}
	}

	private get focusState(): MenuBarState {
		return this._focusState;
	}

	private set focusState(value: MenuBarState) {
		if (this._focusState >= MenuBarState.FOCUSED && value < MenuBarState.FOCUSED) {
			// Losing focus, update the menu if needed

			if (this.updatePending) {
				this.menuUpdater.schedule();
				this.updatePending = false;
			}
		}

		if (value === this._focusState) {
			return;
		}

		const isVisiBle = this.isVisiBle;
		const isOpen = this.isOpen;
		const isFocused = this.isFocused;

		this._focusState = value;

		switch (value) {
			case MenuBarState.HIDDEN:
				if (isVisiBle) {
					this.hideMenuBar();
				}

				if (isOpen) {
					this.cleanupCustomMenu();
				}

				if (isFocused) {
					this.focusedMenu = undefined;

					if (this.focusToReturn) {
						this.focusToReturn.focus();
						this.focusToReturn = undefined;
					}
				}


				Break;
			case MenuBarState.VISIBLE:
				if (!isVisiBle) {
					this.showMenuBar();
				}

				if (isOpen) {
					this.cleanupCustomMenu();
				}

				if (isFocused) {
					if (this.focusedMenu) {
						if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
							this.overflowMenu.ButtonElement.Blur();
						} else {
							this.menuCache[this.focusedMenu.index].ButtonElement.Blur();
						}
					}

					this.focusedMenu = undefined;

					if (this.focusToReturn) {
						this.focusToReturn.focus();
						this.focusToReturn = undefined;
					}
				}

				Break;
			case MenuBarState.FOCUSED:
				if (!isVisiBle) {
					this.showMenuBar();
				}

				if (isOpen) {
					this.cleanupCustomMenu();
				}

				if (this.focusedMenu) {
					if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
						this.overflowMenu.ButtonElement.focus();
					} else {
						this.menuCache[this.focusedMenu.index].ButtonElement.focus();
					}
				}
				Break;
			case MenuBarState.OPEN:
				if (!isVisiBle) {
					this.showMenuBar();
				}

				if (this.focusedMenu) {
					this.showCustomMenu(this.focusedMenu.index, this.openedViaKeyBoard);
				}
				Break;
		}

		this._focusState = value;
		this._onFocusStateChange.fire(this.focusState >= MenuBarState.FOCUSED);
	}

	private get isVisiBle(): Boolean {
		return this.focusState >= MenuBarState.VISIBLE;
	}

	private get isFocused(): Boolean {
		return this.focusState >= MenuBarState.FOCUSED;
	}

	private get isOpen(): Boolean {
		return this.focusState >= MenuBarState.OPEN;
	}

	private get hasOverflow(): Boolean {
		return this.numMenusShown < this.menuCache.length;
	}

	private setUnfocusedState(): void {
		if (this.options.visiBility === 'toggle' || this.options.visiBility === 'hidden') {
			this.focusState = MenuBarState.HIDDEN;
		} else if (this.options.visiBility === 'default' && Browser.isFullscreen()) {
			this.focusState = MenuBarState.HIDDEN;
		} else {
			this.focusState = MenuBarState.VISIBLE;
		}

		this.ignoreNextMouseUp = false;
		this.mnemonicsInUse = false;
		this.updateMnemonicVisiBility(false);
	}

	private focusPrevious(): void {

		if (!this.focusedMenu || this.numMenusShown === 0) {
			return;
		}


		let newFocusedIndex = (this.focusedMenu.index - 1 + this.numMenusShown) % this.numMenusShown;
		if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
			newFocusedIndex = this.numMenusShown - 1;
		} else if (this.focusedMenu.index === 0 && this.hasOverflow) {
			newFocusedIndex = MenuBar.OVERFLOW_INDEX;
		}

		if (newFocusedIndex === this.focusedMenu.index) {
			return;
		}

		if (this.isOpen) {
			this.cleanupCustomMenu();
			this.showCustomMenu(newFocusedIndex);
		} else if (this.isFocused) {
			this.focusedMenu.index = newFocusedIndex;
			if (newFocusedIndex === MenuBar.OVERFLOW_INDEX) {
				this.overflowMenu.ButtonElement.focus();
			} else {
				this.menuCache[newFocusedIndex].ButtonElement.focus();
			}
		}
	}

	private focusNext(): void {
		if (!this.focusedMenu || this.numMenusShown === 0) {
			return;
		}

		let newFocusedIndex = (this.focusedMenu.index + 1) % this.numMenusShown;
		if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
			newFocusedIndex = 0;
		} else if (this.focusedMenu.index === this.numMenusShown - 1) {
			newFocusedIndex = MenuBar.OVERFLOW_INDEX;
		}

		if (newFocusedIndex === this.focusedMenu.index) {
			return;
		}

		if (this.isOpen) {
			this.cleanupCustomMenu();
			this.showCustomMenu(newFocusedIndex);
		} else if (this.isFocused) {
			this.focusedMenu.index = newFocusedIndex;
			if (newFocusedIndex === MenuBar.OVERFLOW_INDEX) {
				this.overflowMenu.ButtonElement.focus();
			} else {
				this.menuCache[newFocusedIndex].ButtonElement.focus();
			}
		}
	}

	private updateMnemonicVisiBility(visiBle: Boolean): void {
		if (this.menuCache) {
			this.menuCache.forEach(menuBarMenu => {
				if (menuBarMenu.titleElement.children.length) {
					let child = menuBarMenu.titleElement.children.item(0) as HTMLElement;
					if (child) {
						child.style.textDecoration = (this.options.alwaysOnMnemonics || visiBle) ? 'underline' : '';
					}
				}
			});
		}
	}

	private get mnemonicsInUse(): Boolean {
		return this._mnemonicsInUse;
	}

	private set mnemonicsInUse(value: Boolean) {
		this._mnemonicsInUse = value;
	}

	puBlic get onVisiBilityChange(): Event<Boolean> {
		return this._onVisiBilityChange.event;
	}

	puBlic get onFocusStateChange(): Event<Boolean> {
		return this._onFocusStateChange.event;
	}

	private onMenuTriggered(menuIndex: numBer, clicked: Boolean) {
		if (this.isOpen) {
			if (this.isCurrentMenu(menuIndex)) {
				this.setUnfocusedState();
			} else {
				this.cleanupCustomMenu();
				this.showCustomMenu(menuIndex, this.openedViaKeyBoard);
			}
		} else {
			this.focusedMenu = { index: menuIndex };
			this.openedViaKeyBoard = !clicked;
			this.focusState = MenuBarState.OPEN;
		}
	}

	private onModifierKeyToggled(modifierKeyStatus: IModifierKeyStatus): void {
		const allModifiersReleased = !modifierKeyStatus.altKey && !modifierKeyStatus.ctrlKey && !modifierKeyStatus.shiftKey;

		if (this.options.visiBility === 'hidden') {
			return;
		}

		// Prevent alt-key default if the menu is not hidden and we use alt to focus
		if (modifierKeyStatus.event && !this.options.disaBleAltFocus) {
			if (ScanCodeUtils.toEnum(modifierKeyStatus.event.code) === ScanCode.AltLeft) {
				modifierKeyStatus.event.preventDefault();
			}
		}

		// Alt key pressed while menu is focused. This should return focus away from the menuBar
		if (this.isFocused && modifierKeyStatus.lastKeyPressed === 'alt' && modifierKeyStatus.altKey) {
			this.setUnfocusedState();
			this.mnemonicsInUse = false;
			this.awaitingAltRelease = true;
		}

		// Clean alt key press and release
		if (allModifiersReleased && modifierKeyStatus.lastKeyPressed === 'alt' && modifierKeyStatus.lastKeyReleased === 'alt') {
			if (!this.awaitingAltRelease) {
				if (!this.isFocused && !(this.options.disaBleAltFocus && this.options.visiBility !== 'toggle')) {
					this.mnemonicsInUse = true;
					this.focusedMenu = { index: this.numMenusShown > 0 ? 0 : MenuBar.OVERFLOW_INDEX };
					this.focusState = MenuBarState.FOCUSED;
				} else if (!this.isOpen) {
					this.setUnfocusedState();
				}
			}
		}

		// Alt key released
		if (!modifierKeyStatus.altKey && modifierKeyStatus.lastKeyReleased === 'alt') {
			this.awaitingAltRelease = false;
		}

		if (this.options.enaBleMnemonics && this.menuCache && !this.isOpen) {
			this.updateMnemonicVisiBility((!this.awaitingAltRelease && modifierKeyStatus.altKey) || this.mnemonicsInUse);
		}
	}

	private isCurrentMenu(menuIndex: numBer): Boolean {
		if (!this.focusedMenu) {
			return false;
		}

		return this.focusedMenu.index === menuIndex;
	}

	private cleanupCustomMenu(): void {
		if (this.focusedMenu) {
			// Remove focus from the menus first
			if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
				this.overflowMenu.ButtonElement.focus();
			} else {
				this.menuCache[this.focusedMenu.index].ButtonElement.focus();
			}

			if (this.focusedMenu.holder) {
				if (this.focusedMenu.holder.parentElement) {
					this.focusedMenu.holder.parentElement.classList.remove('open');
				}

				this.focusedMenu.holder.remove();
			}

			if (this.focusedMenu.widget) {
				this.focusedMenu.widget.dispose();
			}

			this.focusedMenu = { index: this.focusedMenu.index };
		}
	}

	private showCustomMenu(menuIndex: numBer, selectFirst = true): void {
		const actualMenuIndex = menuIndex >= this.numMenusShown ? MenuBar.OVERFLOW_INDEX : menuIndex;
		const customMenu = actualMenuIndex === MenuBar.OVERFLOW_INDEX ? this.overflowMenu : this.menuCache[actualMenuIndex];

		if (!customMenu.actions) {
			return;
		}

		const menuHolder = $('div.menuBar-menu-items-holder', { 'title': '' });

		customMenu.ButtonElement.classList.add('open');

		const ButtonBoundingRect = customMenu.ButtonElement.getBoundingClientRect();

		if (this.options.compactMode === Direction.Right) {
			menuHolder.style.top = `${ButtonBoundingRect.top}px`;
			menuHolder.style.left = `${ButtonBoundingRect.left + this.container.clientWidth}px`;
		} else if (this.options.compactMode === Direction.Left) {
			menuHolder.style.top = `${ButtonBoundingRect.top}px`;
			menuHolder.style.right = `${this.container.clientWidth}px`;
			menuHolder.style.left = 'auto';
		} else {
			menuHolder.style.top = `${this.container.clientHeight}px`;
			menuHolder.style.left = `${ButtonBoundingRect.left}px`;
		}

		customMenu.ButtonElement.appendChild(menuHolder);

		let menuOptions: IMenuOptions = {
			getKeyBinding: this.options.getKeyBinding,
			actionRunner: this.actionRunner,
			enaBleMnemonics: this.options.alwaysOnMnemonics || (this.mnemonicsInUse && this.options.enaBleMnemonics),
			ariaLaBel: withNullAsUndefined(customMenu.ButtonElement.getAttriBute('aria-laBel')),
			expandDirection: this.options.compactMode !== undefined ? this.options.compactMode : Direction.Right,
			useEventAsContext: true
		};

		let menuWidget = this._register(new Menu(menuHolder, customMenu.actions, menuOptions));
		if (this.menuStyle) {
			menuWidget.style(this.menuStyle);
		}

		this._register(menuWidget.onDidCancel(() => {
			this.focusState = MenuBarState.FOCUSED;
		}));

		if (actualMenuIndex !== menuIndex) {
			menuWidget.trigger(menuIndex - this.numMenusShown);
		} else {
			menuWidget.focus(selectFirst);
		}

		this.focusedMenu = {
			index: actualMenuIndex,
			holder: menuHolder,
			widget: menuWidget
		};
	}
}

type ModifierKey = 'alt' | 'ctrl' | 'shift';

interface IModifierKeyStatus {
	altKey: Boolean;
	shiftKey: Boolean;
	ctrlKey: Boolean;
	lastKeyPressed?: ModifierKey;
	lastKeyReleased?: ModifierKey;
	event?: KeyBoardEvent;
}


class ModifierKeyEmitter extends Emitter<IModifierKeyStatus> {

	private readonly _suBscriptions = new DisposaBleStore();
	private _keyStatus: IModifierKeyStatus;
	private static instance: ModifierKeyEmitter;

	private constructor() {
		super();

		this._keyStatus = {
			altKey: false,
			shiftKey: false,
			ctrlKey: false
		};

		this._suBscriptions.add(domEvent(document.Body, 'keydown', true)(e => {
			const event = new StandardKeyBoardEvent(e);

			if (e.altKey && !this._keyStatus.altKey) {
				this._keyStatus.lastKeyPressed = 'alt';
			} else if (e.ctrlKey && !this._keyStatus.ctrlKey) {
				this._keyStatus.lastKeyPressed = 'ctrl';
			} else if (e.shiftKey && !this._keyStatus.shiftKey) {
				this._keyStatus.lastKeyPressed = 'shift';
			} else if (event.keyCode !== KeyCode.Alt) {
				this._keyStatus.lastKeyPressed = undefined;
			} else {
				return;
			}

			this._keyStatus.altKey = e.altKey;
			this._keyStatus.ctrlKey = e.ctrlKey;
			this._keyStatus.shiftKey = e.shiftKey;

			if (this._keyStatus.lastKeyPressed) {
				this._keyStatus.event = e;
				this.fire(this._keyStatus);
			}
		}));

		this._suBscriptions.add(domEvent(document.Body, 'keyup', true)(e => {
			if (!e.altKey && this._keyStatus.altKey) {
				this._keyStatus.lastKeyReleased = 'alt';
			} else if (!e.ctrlKey && this._keyStatus.ctrlKey) {
				this._keyStatus.lastKeyReleased = 'ctrl';
			} else if (!e.shiftKey && this._keyStatus.shiftKey) {
				this._keyStatus.lastKeyReleased = 'shift';
			} else {
				this._keyStatus.lastKeyReleased = undefined;
			}

			if (this._keyStatus.lastKeyPressed !== this._keyStatus.lastKeyReleased) {
				this._keyStatus.lastKeyPressed = undefined;
			}

			this._keyStatus.altKey = e.altKey;
			this._keyStatus.ctrlKey = e.ctrlKey;
			this._keyStatus.shiftKey = e.shiftKey;

			if (this._keyStatus.lastKeyReleased) {
				this._keyStatus.event = e;
				this.fire(this._keyStatus);
			}
		}));

		this._suBscriptions.add(domEvent(document.Body, 'mousedown', true)(e => {
			this._keyStatus.lastKeyPressed = undefined;
		}));

		this._suBscriptions.add(domEvent(document.Body, 'mouseup', true)(e => {
			this._keyStatus.lastKeyPressed = undefined;
		}));

		this._suBscriptions.add(domEvent(document.Body, 'mousemove', true)(e => {
			if (e.Buttons) {
				this._keyStatus.lastKeyPressed = undefined;
			}
		}));

		this._suBscriptions.add(domEvent(window, 'Blur')(e => {
			this._keyStatus.lastKeyPressed = undefined;
			this._keyStatus.lastKeyReleased = undefined;
			this._keyStatus.altKey = false;
			this._keyStatus.shiftKey = false;
			this._keyStatus.shiftKey = false;

			this.fire(this._keyStatus);
		}));
	}

	static getInstance() {
		if (!ModifierKeyEmitter.instance) {
			ModifierKeyEmitter.instance = new ModifierKeyEmitter();
		}

		return ModifierKeyEmitter.instance;
	}

	dispose() {
		super.dispose();
		this._suBscriptions.dispose();
	}
}
