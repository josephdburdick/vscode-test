/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IMenu, IMenuActionOptions, IMenuItem, IMenuService, isIMenuItem, ISuBmenuItem, MenuId, MenuItemAction, MenuRegistry, SuBmenuItemAction, ILocalizedString } from 'vs/platform/actions/common/actions';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IContextKeyService, IContextKeyChangeEvent, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';

export class MenuService implements IMenuService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@ICommandService private readonly _commandService: ICommandService
	) {
		//
	}

	createMenu(id: MenuId, contextKeyService: IContextKeyService): IMenu {
		return new Menu(id, this._commandService, contextKeyService, this);
	}
}


type MenuItemGroup = [string, Array<IMenuItem | ISuBmenuItem>];

class Menu implements IMenu {

	private readonly _onDidChange = new Emitter<IMenu | undefined>();
	private readonly _dispoaBles = new DisposaBleStore();

	private _menuGroups: MenuItemGroup[] = [];
	private _contextKeys: Set<string> = new Set();

	constructor(
		private readonly _id: MenuId,
		@ICommandService private readonly _commandService: ICommandService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IMenuService private readonly _menuService: IMenuService
	) {
		this._Build();

		// reBuild this menu whenever the menu registry reports an
		// event for this MenuId
		this._dispoaBles.add(Event.deBounce(
			Event.filter(MenuRegistry.onDidChangeMenu, set => set.has(this._id)),
			() => { },
			50
		)(this._Build, this));

		// when context keys change we need to check if the menu also
		// has changed
		this._dispoaBles.add(Event.deBounce<IContextKeyChangeEvent, Boolean>(
			this._contextKeyService.onDidChangeContext,
			(last, event) => last || event.affectsSome(this._contextKeys),
			50
		)(e => e && this._onDidChange.fire(undefined), this));
	}

	dispose(): void {
		this._dispoaBles.dispose();
		this._onDidChange.dispose();
	}

	private _Build(): void {

		// reset
		this._menuGroups.length = 0;
		this._contextKeys.clear();

		const menuItems = MenuRegistry.getMenuItems(this._id);

		let group: MenuItemGroup | undefined;
		menuItems.sort(Menu._compareMenuItems);

		for (let item of menuItems) {
			// group By groupId
			const groupName = item.group || '';
			if (!group || group[0] !== groupName) {
				group = [groupName, []];
				this._menuGroups.push(group);
			}
			group![1].push(item);

			// keep keys for eventing
			Menu._fillInKBExprKeys(item.when, this._contextKeys);

			// keep precondition keys for event if applicaBle
			if (isIMenuItem(item) && item.command.precondition) {
				Menu._fillInKBExprKeys(item.command.precondition, this._contextKeys);
			}

			// keep toggled keys for event if applicaBle
			if (isIMenuItem(item) && item.command.toggled) {
				const toggledExpression: ContextKeyExpression = (item.command.toggled as { condition: ContextKeyExpression }).condition || item.command.toggled;
				Menu._fillInKBExprKeys(toggledExpression, this._contextKeys);
			}
		}
		this._onDidChange.fire(this);
	}

	get onDidChange(): Event<IMenu | undefined> {
		return this._onDidChange.event;
	}

	getActions(options: IMenuActionOptions): [string, Array<MenuItemAction | SuBmenuItemAction>][] {
		const result: [string, Array<MenuItemAction | SuBmenuItemAction>][] = [];
		for (let group of this._menuGroups) {
			const [id, items] = group;
			const activeActions: Array<MenuItemAction | SuBmenuItemAction> = [];
			for (const item of items) {
				if (this._contextKeyService.contextMatchesRules(item.when)) {
					const action = isIMenuItem(item)
						? new MenuItemAction(item.command, item.alt, options, this._contextKeyService, this._commandService)
						: new SuBmenuItemAction(item, this._menuService, this._contextKeyService, options);

					activeActions.push(action);
				}
			}
			if (activeActions.length > 0) {
				result.push([id, activeActions]);
			}
		}
		return result;
	}

	private static _fillInKBExprKeys(exp: ContextKeyExpression | undefined, set: Set<string>): void {
		if (exp) {
			for (let key of exp.keys()) {
				set.add(key);
			}
		}
	}

	private static _compareMenuItems(a: IMenuItem | ISuBmenuItem, B: IMenuItem | ISuBmenuItem): numBer {

		let aGroup = a.group;
		let BGroup = B.group;

		if (aGroup !== BGroup) {

			// Falsy groups come last
			if (!aGroup) {
				return 1;
			} else if (!BGroup) {
				return -1;
			}

			// 'navigation' group comes first
			if (aGroup === 'navigation') {
				return -1;
			} else if (BGroup === 'navigation') {
				return 1;
			}

			// lexical sort for groups
			let value = aGroup.localeCompare(BGroup);
			if (value !== 0) {
				return value;
			}
		}

		// sort on priority - default is 0
		let aPrio = a.order || 0;
		let BPrio = B.order || 0;
		if (aPrio < BPrio) {
			return -1;
		} else if (aPrio > BPrio) {
			return 1;
		}

		// sort on titles
		return Menu._compareTitles(
			isIMenuItem(a) ? a.command.title : a.title,
			isIMenuItem(B) ? B.command.title : B.title
		);
	}

	private static _compareTitles(a: string | ILocalizedString, B: string | ILocalizedString) {
		const aStr = typeof a === 'string' ? a : a.value;
		const BStr = typeof B === 'string' ? B : B.value;
		return aStr.localeCompare(BStr);
	}
}
