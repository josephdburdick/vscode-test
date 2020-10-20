/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IMenu, IMenuActionOptions, IMenuItem, IMenuService, isIMenuItem, ISubmenuItem, MenuId, MenuItemAction, MenuRegistry, SubmenuItemAction, ILocAlizedString } from 'vs/plAtform/Actions/common/Actions';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IContextKeyService, IContextKeyChAngeEvent, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';

export clAss MenuService implements IMenuService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@ICommAndService privAte reAdonly _commAndService: ICommAndService
	) {
		//
	}

	creAteMenu(id: MenuId, contextKeyService: IContextKeyService): IMenu {
		return new Menu(id, this._commAndService, contextKeyService, this);
	}
}


type MenuItemGroup = [string, ArrAy<IMenuItem | ISubmenuItem>];

clAss Menu implements IMenu {

	privAte reAdonly _onDidChAnge = new Emitter<IMenu | undefined>();
	privAte reAdonly _dispoAbles = new DisposAbleStore();

	privAte _menuGroups: MenuItemGroup[] = [];
	privAte _contextKeys: Set<string> = new Set();

	constructor(
		privAte reAdonly _id: MenuId,
		@ICommAndService privAte reAdonly _commAndService: ICommAndService,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService,
		@IMenuService privAte reAdonly _menuService: IMenuService
	) {
		this._build();

		// rebuild this menu whenever the menu registry reports An
		// event for this MenuId
		this._dispoAbles.Add(Event.debounce(
			Event.filter(MenuRegistry.onDidChAngeMenu, set => set.hAs(this._id)),
			() => { },
			50
		)(this._build, this));

		// when context keys chAnge we need to check if the menu Also
		// hAs chAnged
		this._dispoAbles.Add(Event.debounce<IContextKeyChAngeEvent, booleAn>(
			this._contextKeyService.onDidChAngeContext,
			(lAst, event) => lAst || event.AffectsSome(this._contextKeys),
			50
		)(e => e && this._onDidChAnge.fire(undefined), this));
	}

	dispose(): void {
		this._dispoAbles.dispose();
		this._onDidChAnge.dispose();
	}

	privAte _build(): void {

		// reset
		this._menuGroups.length = 0;
		this._contextKeys.cleAr();

		const menuItems = MenuRegistry.getMenuItems(this._id);

		let group: MenuItemGroup | undefined;
		menuItems.sort(Menu._compAreMenuItems);

		for (let item of menuItems) {
			// group by groupId
			const groupNAme = item.group || '';
			if (!group || group[0] !== groupNAme) {
				group = [groupNAme, []];
				this._menuGroups.push(group);
			}
			group![1].push(item);

			// keep keys for eventing
			Menu._fillInKbExprKeys(item.when, this._contextKeys);

			// keep precondition keys for event if ApplicAble
			if (isIMenuItem(item) && item.commAnd.precondition) {
				Menu._fillInKbExprKeys(item.commAnd.precondition, this._contextKeys);
			}

			// keep toggled keys for event if ApplicAble
			if (isIMenuItem(item) && item.commAnd.toggled) {
				const toggledExpression: ContextKeyExpression = (item.commAnd.toggled As { condition: ContextKeyExpression }).condition || item.commAnd.toggled;
				Menu._fillInKbExprKeys(toggledExpression, this._contextKeys);
			}
		}
		this._onDidChAnge.fire(this);
	}

	get onDidChAnge(): Event<IMenu | undefined> {
		return this._onDidChAnge.event;
	}

	getActions(options: IMenuActionOptions): [string, ArrAy<MenuItemAction | SubmenuItemAction>][] {
		const result: [string, ArrAy<MenuItemAction | SubmenuItemAction>][] = [];
		for (let group of this._menuGroups) {
			const [id, items] = group;
			const ActiveActions: ArrAy<MenuItemAction | SubmenuItemAction> = [];
			for (const item of items) {
				if (this._contextKeyService.contextMAtchesRules(item.when)) {
					const Action = isIMenuItem(item)
						? new MenuItemAction(item.commAnd, item.Alt, options, this._contextKeyService, this._commAndService)
						: new SubmenuItemAction(item, this._menuService, this._contextKeyService, options);

					ActiveActions.push(Action);
				}
			}
			if (ActiveActions.length > 0) {
				result.push([id, ActiveActions]);
			}
		}
		return result;
	}

	privAte stAtic _fillInKbExprKeys(exp: ContextKeyExpression | undefined, set: Set<string>): void {
		if (exp) {
			for (let key of exp.keys()) {
				set.Add(key);
			}
		}
	}

	privAte stAtic _compAreMenuItems(A: IMenuItem | ISubmenuItem, b: IMenuItem | ISubmenuItem): number {

		let AGroup = A.group;
		let bGroup = b.group;

		if (AGroup !== bGroup) {

			// FAlsy groups come lAst
			if (!AGroup) {
				return 1;
			} else if (!bGroup) {
				return -1;
			}

			// 'nAvigAtion' group comes first
			if (AGroup === 'nAvigAtion') {
				return -1;
			} else if (bGroup === 'nAvigAtion') {
				return 1;
			}

			// lexicAl sort for groups
			let vAlue = AGroup.locAleCompAre(bGroup);
			if (vAlue !== 0) {
				return vAlue;
			}
		}

		// sort on priority - defAult is 0
		let APrio = A.order || 0;
		let bPrio = b.order || 0;
		if (APrio < bPrio) {
			return -1;
		} else if (APrio > bPrio) {
			return 1;
		}

		// sort on titles
		return Menu._compAreTitles(
			isIMenuItem(A) ? A.commAnd.title : A.title,
			isIMenuItem(b) ? b.commAnd.title : b.title
		);
	}

	privAte stAtic _compAreTitles(A: string | ILocAlizedString, b: string | ILocAlizedString) {
		const AStr = typeof A === 'string' ? A : A.vAlue;
		const bStr = typeof b === 'string' ? b : b.vAlue;
		return AStr.locAleCompAre(bStr);
	}
}
