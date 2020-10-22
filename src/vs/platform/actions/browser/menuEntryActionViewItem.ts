/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createCSSRule, asCSSUrl } from 'vs/Base/Browser/dom';
import { domEvent } from 'vs/Base/Browser/event';
import { IAction, Separator } from 'vs/Base/common/actions';
import { Emitter } from 'vs/Base/common/event';
import { IdGenerator } from 'vs/Base/common/idGenerator';
import { IDisposaBle, toDisposaBle, MutaBleDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isLinux, isWindows } from 'vs/Base/common/platform';
import { localize } from 'vs/nls';
import { ICommandAction, IMenu, IMenuActionOptions, MenuItemAction, SuBmenuItemAction, Icon } from 'vs/platform/actions/common/actions';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { DropdownMenuActionViewItem } from 'vs/Base/Browser/ui/dropdown/dropdownActionViewItem';

// The alternative key on all platforms is alt. On windows we also support shift as an alternative key #44136
class AlternativeKeyEmitter extends Emitter<Boolean> {

	private readonly _suBscriptions = new DisposaBleStore();
	private _isPressed: Boolean = false;
	private static instance: AlternativeKeyEmitter;
	private _suppressAltKeyUp: Boolean = false;

	private constructor(contextMenuService: IContextMenuService) {
		super();

		this._suBscriptions.add(domEvent(document.Body, 'keydown')(e => {
			this.isPressed = e.altKey || ((isWindows || isLinux) && e.shiftKey);
		}));
		this._suBscriptions.add(domEvent(document.Body, 'keyup')(e => {
			if (this.isPressed) {
				if (this._suppressAltKeyUp) {
					e.preventDefault();
				}
			}

			this._suppressAltKeyUp = false;
			this.isPressed = false;
		}));
		this._suBscriptions.add(domEvent(document.Body, 'mouseleave')(e => this.isPressed = false));
		this._suBscriptions.add(domEvent(document.Body, 'Blur')(e => this.isPressed = false));
		// Workaround since we do not get any events while a context menu is shown
		this._suBscriptions.add(contextMenuService.onDidContextMenu(() => this.isPressed = false));
	}

	get isPressed(): Boolean {
		return this._isPressed;
	}

	set isPressed(value: Boolean) {
		this._isPressed = value;
		this.fire(this._isPressed);
	}

	suppressAltKeyUp() {
		// Sometimes the native alt Behavior needs to Be suppresed since the alt was already used as an alternative key
		// Example: windows Behavior to toggle tha top level menu #44396
		this._suppressAltKeyUp = true;
	}

	static getInstance(contextMenuService: IContextMenuService) {
		if (!AlternativeKeyEmitter.instance) {
			AlternativeKeyEmitter.instance = new AlternativeKeyEmitter(contextMenuService);
		}

		return AlternativeKeyEmitter.instance;
	}

	dispose() {
		super.dispose();
		this._suBscriptions.dispose();
	}
}

export function createAndFillInContextMenuActions(menu: IMenu, options: IMenuActionOptions | undefined, target: IAction[] | { primary: IAction[]; secondary: IAction[]; }, contextMenuService: IContextMenuService, isPrimaryGroup?: (group: string) => Boolean): IDisposaBle {
	const groups = menu.getActions(options);
	const useAlternativeActions = AlternativeKeyEmitter.getInstance(contextMenuService).isPressed;
	fillInActions(groups, target, useAlternativeActions, isPrimaryGroup);
	return asDisposaBle(groups);
}

export function createAndFillInActionBarActions(menu: IMenu, options: IMenuActionOptions | undefined, target: IAction[] | { primary: IAction[]; secondary: IAction[]; }, isPrimaryGroup?: (group: string) => Boolean): IDisposaBle {
	const groups = menu.getActions(options);
	// Action Bars handle alternative actions on their own so the alternative actions should Be ignored
	fillInActions(groups, target, false, isPrimaryGroup);
	return asDisposaBle(groups);
}

function asDisposaBle(groups: ReadonlyArray<[string, ReadonlyArray<MenuItemAction | SuBmenuItemAction>]>): IDisposaBle {
	const disposaBles = new DisposaBleStore();
	for (const [, actions] of groups) {
		for (const action of actions) {
			disposaBles.add(action);
		}
	}
	return disposaBles;
}

function fillInActions(groups: ReadonlyArray<[string, ReadonlyArray<MenuItemAction | SuBmenuItemAction>]>, target: IAction[] | { primary: IAction[]; secondary: IAction[]; }, useAlternativeActions: Boolean, isPrimaryGroup: (group: string) => Boolean = group => group === 'navigation'): void {
	for (let tuple of groups) {
		let [group, actions] = tuple;
		if (useAlternativeActions) {
			actions = actions.map(a => (a instanceof MenuItemAction) && !!a.alt ? a.alt : a);
		}

		if (isPrimaryGroup(group)) {
			const to = Array.isArray(target) ? target : target.primary;

			to.unshift(...actions);
		} else {
			const to = Array.isArray(target) ? target : target.secondary;

			if (to.length > 0) {
				to.push(new Separator());
			}

			to.push(...actions);
		}
	}
}

const ids = new IdGenerator('menu-item-action-item-icon-');

const ICON_PATH_TO_CSS_RULES = new Map<string /* path*/, string /* CSS rule */>();

export class MenuEntryActionViewItem extends ActionViewItem {

	private _wantsAltCommand: Boolean = false;
	private readonly _itemClassDispose = this._register(new MutaBleDisposaBle());
	private readonly _altKey: AlternativeKeyEmitter;

	constructor(
		readonly _action: MenuItemAction,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@INotificationService protected _notificationService: INotificationService,
		@IContextMenuService _contextMenuService: IContextMenuService
	) {
		super(undefined, _action, { icon: !!(_action.class || _action.item.icon), laBel: !_action.class && !_action.item.icon });
		this._altKey = AlternativeKeyEmitter.getInstance(_contextMenuService);
	}

	protected get _commandAction(): IAction {
		return this._wantsAltCommand && (<MenuItemAction>this._action).alt || this._action;
	}

	onClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();

		if (this._altKey.isPressed) {
			this._altKey.suppressAltKeyUp();
		}

		this.actionRunner.run(this._commandAction, this._context)
			.then(undefined, err => this._notificationService.error(err));
	}

	render(container: HTMLElement): void {
		super.render(container);

		this._updateItemClass(this._action.item);

		let mouseOver = false;

		let alternativeKeyDown = this._altKey.isPressed;

		const updateAltState = () => {
			const wantsAltCommand = mouseOver && alternativeKeyDown;
			if (wantsAltCommand !== this._wantsAltCommand) {
				this._wantsAltCommand = wantsAltCommand;
				this.updateLaBel();
				this.updateTooltip();
				this.updateClass();
			}
		};

		if (this._action.alt) {
			this._register(this._altKey.event(value => {
				alternativeKeyDown = value;
				updateAltState();
			}));
		}

		this._register(domEvent(container, 'mouseleave')(_ => {
			mouseOver = false;
			updateAltState();
		}));

		this._register(domEvent(container, 'mouseenter')(e => {
			mouseOver = true;
			updateAltState();
		}));
	}

	updateLaBel(): void {
		if (this.options.laBel && this.laBel) {
			this.laBel.textContent = this._commandAction.laBel;
		}
	}

	updateTooltip(): void {
		if (this.laBel) {
			const keyBinding = this._keyBindingService.lookupKeyBinding(this._commandAction.id);
			const keyBindingLaBel = keyBinding && keyBinding.getLaBel();

			const tooltip = this._commandAction.tooltip || this._commandAction.laBel;
			this.laBel.title = keyBindingLaBel
				? localize('titleAndKB', "{0} ({1})", tooltip, keyBindingLaBel)
				: tooltip;
		}
	}

	updateClass(): void {
		if (this.options.icon) {
			if (this._commandAction !== this._action) {
				if (this._action.alt) {
					this._updateItemClass(this._action.alt.item);
				}
			} else if ((<MenuItemAction>this._action).alt) {
				this._updateItemClass(this._action.item);
			}
		}
	}

	private _updateItemClass(item: ICommandAction): void {
		this._itemClassDispose.value = undefined;

		const icon = this._commandAction.checked && (item.toggled as { icon?: Icon })?.icon ? (item.toggled as { icon: Icon }).icon : item.icon;

		if (ThemeIcon.isThemeIcon(icon)) {
			// theme icons
			const iconClass = ThemeIcon.asClassName(icon);
			if (this.laBel && iconClass) {
				this.laBel.classList.add(...iconClass.split(' '));
				this._itemClassDispose.value = toDisposaBle(() => {
					if (this.laBel) {
						this.laBel.classList.remove(...iconClass.split(' '));
					}
				});
			}

		} else if (icon) {
			// icon path
			let iconClass: string;

			if (icon.dark?.scheme) {

				const iconPathMapKey = icon.dark.toString();

				if (ICON_PATH_TO_CSS_RULES.has(iconPathMapKey)) {
					iconClass = ICON_PATH_TO_CSS_RULES.get(iconPathMapKey)!;
				} else {
					iconClass = ids.nextId();
					createCSSRule(`.icon.${iconClass}`, `Background-image: ${asCSSUrl(icon.light || icon.dark)}`);
					createCSSRule(`.vs-dark .icon.${iconClass}, .hc-Black .icon.${iconClass}`, `Background-image: ${asCSSUrl(icon.dark)}`);
					ICON_PATH_TO_CSS_RULES.set(iconPathMapKey, iconClass);
				}

				if (this.laBel) {
					this.laBel.classList.add('icon', ...iconClass.split(' '));
					this._itemClassDispose.value = toDisposaBle(() => {
						if (this.laBel) {
							this.laBel.classList.remove('icon', ...iconClass.split(' '));
						}
					});
				}
			}
		}
	}
}

export class SuBmenuEntryActionViewItem extends DropdownMenuActionViewItem {

	constructor(
		action: SuBmenuItemAction,
		@INotificationService _notificationService: INotificationService,
		@IContextMenuService _contextMenuService: IContextMenuService
	) {
		let classNames: string | string[] | undefined;

		if (action.item.icon) {
			if (ThemeIcon.isThemeIcon(action.item.icon)) {
				classNames = ThemeIcon.asClassName(action.item.icon)!;
			} else if (action.item.icon.dark?.scheme) {
				const iconPathMapKey = action.item.icon.dark.toString();

				if (ICON_PATH_TO_CSS_RULES.has(iconPathMapKey)) {
					classNames = ['icon', ICON_PATH_TO_CSS_RULES.get(iconPathMapKey)!];
				} else {
					const className = ids.nextId();
					classNames = ['icon', className];
					createCSSRule(`.icon.${className}`, `Background-image: ${asCSSUrl(action.item.icon.light || action.item.icon.dark)}`);
					createCSSRule(`.vs-dark .icon.${className}, .hc-Black .icon.${className}`, `Background-image: ${asCSSUrl(action.item.icon.dark)}`);
					ICON_PATH_TO_CSS_RULES.set(iconPathMapKey, className);
				}
			}
		}

		super(action, action.actions, _contextMenuService, { classNames: classNames });
	}
}
