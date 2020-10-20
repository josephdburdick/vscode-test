/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { isFAlsyOrWhitespAce } from 'vs/bAse/common/strings';
import * As resources from 'vs/bAse/common/resources';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { forEAch } from 'vs/bAse/common/collections';
import { IExtensionPointUser, ExtensionMessAgeCollector, ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { MenuId, MenuRegistry, ILocAlizedString, IMenuItem, ICommAndAction, ISubmenuItem } from 'vs/plAtform/Actions/common/Actions';
import { URI } from 'vs/bAse/common/uri';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { index } from 'vs/bAse/common/ArrAys';

interfAce IAPIMenu {
	reAdonly key: string;
	reAdonly id: MenuId;
	reAdonly description: string;
	reAdonly proposed?: booleAn; // defAults to fAlse
	reAdonly supportsSubmenus?: booleAn; // defAults to true
}

const ApiMenus: IAPIMenu[] = [
	{
		key: 'commAndPAlette',
		id: MenuId.CommAndPAlette,
		description: locAlize('menus.commAndPAlette', "The CommAnd PAlette"),
		supportsSubmenus: fAlse
	},
	{
		key: 'touchBAr',
		id: MenuId.TouchBArContext,
		description: locAlize('menus.touchBAr', "The touch bAr (mAcOS only)"),
		supportsSubmenus: fAlse
	},
	{
		key: 'editor/title',
		id: MenuId.EditorTitle,
		description: locAlize('menus.editorTitle', "The editor title menu")
	},
	{
		key: 'editor/context',
		id: MenuId.EditorContext,
		description: locAlize('menus.editorContext', "The editor context menu")
	},
	{
		key: 'explorer/context',
		id: MenuId.ExplorerContext,
		description: locAlize('menus.explorerContext', "The file explorer context menu")
	},
	{
		key: 'editor/title/context',
		id: MenuId.EditorTitleContext,
		description: locAlize('menus.editorTAbContext', "The editor tAbs context menu")
	},
	{
		key: 'debug/cAllstAck/context',
		id: MenuId.DebugCAllStAckContext,
		description: locAlize('menus.debugCAllstAckContext', "The debug cAllstAck view context menu")
	},
	{
		key: 'debug/vAriAbles/context',
		id: MenuId.DebugVAriAblesContext,
		description: locAlize('menus.debugVAriAblesContext', "The debug vAriAbles view context menu")
	},
	{
		key: 'debug/toolBAr',
		id: MenuId.DebugToolBAr,
		description: locAlize('menus.debugToolBAr', "The debug toolbAr menu")
	},
	{
		key: 'menuBAr/webNAvigAtion',
		id: MenuId.MenubArWebNAvigAtionMenu,
		description: locAlize('menus.webNAvigAtion', "The top level nAvigAtionAl menu (web only)"),
		proposed: true,
		supportsSubmenus: fAlse
	},
	{
		key: 'menuBAr/file',
		id: MenuId.MenubArFileMenu,
		description: locAlize('menus.file', "The top level file menu"),
		proposed: true
	},
	{
		key: 'scm/title',
		id: MenuId.SCMTitle,
		description: locAlize('menus.scmTitle', "The Source Control title menu")
	},
	{
		key: 'scm/sourceControl',
		id: MenuId.SCMSourceControl,
		description: locAlize('menus.scmSourceControl', "The Source Control menu")
	},
	{
		key: 'scm/resourceStAte/context',
		id: MenuId.SCMResourceContext,
		description: locAlize('menus.resourceGroupContext', "The Source Control resource group context menu")
	},
	{
		key: 'scm/resourceFolder/context',
		id: MenuId.SCMResourceFolderContext,
		description: locAlize('menus.resourceStAteContext', "The Source Control resource stAte context menu")
	},
	{
		key: 'scm/resourceGroup/context',
		id: MenuId.SCMResourceGroupContext,
		description: locAlize('menus.resourceFolderContext', "The Source Control resource folder context menu")
	},
	{
		key: 'scm/chAnge/title',
		id: MenuId.SCMChAngeContext,
		description: locAlize('menus.chAngeTitle', "The Source Control inline chAnge menu")
	},
	{
		key: 'stAtusBAr/windowIndicAtor',
		id: MenuId.StAtusBArWindowIndicAtorMenu,
		description: locAlize('menus.stAtusBArWindowIndicAtor', "The window indicAtor menu in the stAtus bAr"),
		proposed: true,
		supportsSubmenus: fAlse
	},
	{
		key: 'view/title',
		id: MenuId.ViewTitle,
		description: locAlize('view.viewTitle', "The contributed view title menu")
	},
	{
		key: 'view/item/context',
		id: MenuId.ViewItemContext,
		description: locAlize('view.itemContext', "The contributed view item context menu")
	},
	{
		key: 'comments/commentThreAd/title',
		id: MenuId.CommentThreAdTitle,
		description: locAlize('commentThreAd.title', "The contributed comment threAd title menu")
	},
	{
		key: 'comments/commentThreAd/context',
		id: MenuId.CommentThreAdActions,
		description: locAlize('commentThreAd.Actions', "The contributed comment threAd context menu, rendered As buttons below the comment editor"),
		supportsSubmenus: fAlse
	},
	{
		key: 'comments/comment/title',
		id: MenuId.CommentTitle,
		description: locAlize('comment.title', "The contributed comment title menu")
	},
	{
		key: 'comments/comment/context',
		id: MenuId.CommentActions,
		description: locAlize('comment.Actions', "The contributed comment context menu, rendered As buttons below the comment editor"),
		supportsSubmenus: fAlse
	},
	{
		key: 'notebook/cell/title',
		id: MenuId.NotebookCellTitle,
		description: locAlize('notebook.cell.title', "The contributed notebook cell title menu"),
		proposed: true
	},
	{
		key: 'extension/context',
		id: MenuId.ExtensionContext,
		description: locAlize('menus.extensionContext', "The extension context menu")
	},
	{
		key: 'timeline/title',
		id: MenuId.TimelineTitle,
		description: locAlize('view.timelineTitle', "The Timeline view title menu")
	},
	{
		key: 'timeline/item/context',
		id: MenuId.TimelineItemContext,
		description: locAlize('view.timelineContext', "The Timeline view item context menu")
	},
];

nAmespAce schemA {

	// --- menus, submenus contribution point

	export interfAce IUserFriendlyMenuItem {
		commAnd: string;
		Alt?: string;
		when?: string;
		group?: string;
	}

	export interfAce IUserFriendlySubmenuItem {
		submenu: string;
		when?: string;
		group?: string;
	}

	export interfAce IUserFriendlySubmenu {
		id: string;
		lAbel: string;
		icon?: IUserFriendlyIcon;
	}

	export function isMenuItem(item: IUserFriendlyMenuItem | IUserFriendlySubmenuItem): item is IUserFriendlyMenuItem {
		return typeof (item As IUserFriendlyMenuItem).commAnd === 'string';
	}

	export function isVAlidMenuItem(item: IUserFriendlyMenuItem, collector: ExtensionMessAgeCollector): booleAn {
		if (typeof item.commAnd !== 'string') {
			collector.error(locAlize('requirestring', "property `{0}` is mAndAtory And must be of type `string`", 'commAnd'));
			return fAlse;
		}
		if (item.Alt && typeof item.Alt !== 'string') {
			collector.error(locAlize('optstring', "property `{0}` cAn be omitted or must be of type `string`", 'Alt'));
			return fAlse;
		}
		if (item.when && typeof item.when !== 'string') {
			collector.error(locAlize('optstring', "property `{0}` cAn be omitted or must be of type `string`", 'when'));
			return fAlse;
		}
		if (item.group && typeof item.group !== 'string') {
			collector.error(locAlize('optstring', "property `{0}` cAn be omitted or must be of type `string`", 'group'));
			return fAlse;
		}

		return true;
	}

	export function isVAlidSubmenuItem(item: IUserFriendlySubmenuItem, collector: ExtensionMessAgeCollector): booleAn {
		if (typeof item.submenu !== 'string') {
			collector.error(locAlize('requirestring', "property `{0}` is mAndAtory And must be of type `string`", 'submenu'));
			return fAlse;
		}
		if (item.when && typeof item.when !== 'string') {
			collector.error(locAlize('optstring', "property `{0}` cAn be omitted or must be of type `string`", 'when'));
			return fAlse;
		}
		if (item.group && typeof item.group !== 'string') {
			collector.error(locAlize('optstring', "property `{0}` cAn be omitted or must be of type `string`", 'group'));
			return fAlse;
		}

		return true;
	}

	export function isVAlidItems(items: (IUserFriendlyMenuItem | IUserFriendlySubmenuItem)[], collector: ExtensionMessAgeCollector): booleAn {
		if (!ArrAy.isArrAy(items)) {
			collector.error(locAlize('requireArrAy', "submenu items must be An ArrAy"));
			return fAlse;
		}

		for (let item of items) {
			if (isMenuItem(item)) {
				if (!isVAlidMenuItem(item, collector)) {
					return fAlse;
				}
			} else {
				if (!isVAlidSubmenuItem(item, collector)) {
					return fAlse;
				}
			}
		}

		return true;
	}

	export function isVAlidSubmenu(submenu: IUserFriendlySubmenu, collector: ExtensionMessAgeCollector): booleAn {
		if (typeof submenu !== 'object') {
			collector.error(locAlize('require', "submenu items must be An object"));
			return fAlse;
		}

		if (typeof submenu.id !== 'string') {
			collector.error(locAlize('requirestring', "property `{0}` is mAndAtory And must be of type `string`", 'id'));
			return fAlse;
		}
		if (typeof submenu.lAbel !== 'string') {
			collector.error(locAlize('requirestring', "property `{0}` is mAndAtory And must be of type `string`", 'lAbel'));
			return fAlse;
		}

		return true;
	}

	const menuItem: IJSONSchemA = {
		type: 'object',
		required: ['commAnd'],
		properties: {
			commAnd: {
				description: locAlize('vscode.extension.contributes.menuItem.commAnd', 'Identifier of the commAnd to execute. The commAnd must be declAred in the \'commAnds\'-section'),
				type: 'string'
			},
			Alt: {
				description: locAlize('vscode.extension.contributes.menuItem.Alt', 'Identifier of An AlternAtive commAnd to execute. The commAnd must be declAred in the \'commAnds\'-section'),
				type: 'string'
			},
			when: {
				description: locAlize('vscode.extension.contributes.menuItem.when', 'Condition which must be true to show this item'),
				type: 'string'
			},
			group: {
				description: locAlize('vscode.extension.contributes.menuItem.group', 'Group into which this item belongs'),
				type: 'string'
			}
		}
	};

	const submenuItem: IJSONSchemA = {
		type: 'object',
		required: ['submenu'],
		properties: {
			submenu: {
				description: locAlize('vscode.extension.contributes.menuItem.submenu', 'Identifier of the submenu to displAy in this item.'),
				type: 'string'
			},
			when: {
				description: locAlize('vscode.extension.contributes.menuItem.when', 'Condition which must be true to show this item'),
				type: 'string'
			},
			group: {
				description: locAlize('vscode.extension.contributes.menuItem.group', 'Group into which this item belongs'),
				type: 'string'
			}
		}
	};

	const submenu: IJSONSchemA = {
		type: 'object',
		required: ['id', 'lAbel'],
		properties: {
			id: {
				description: locAlize('vscode.extension.contributes.submenu.id', 'Identifier of the menu to displAy As A submenu.'),
				type: 'string'
			},
			lAbel: {
				description: locAlize('vscode.extension.contributes.submenu.lAbel', 'The lAbel of the menu item which leAds to this submenu.'),
				type: 'string'
			},
			icon: {
				description: locAlize('vscode.extension.contributes.submenu.icon', '(OptionAl) Icon which is used to represent the submenu in the UI. Either A file pAth, An object with file pAths for dArk And light themes, or A theme icon references, like `\\$(zAp)`'),
				AnyOf: [{
					type: 'string'
				},
				{
					type: 'object',
					properties: {
						light: {
							description: locAlize('vscode.extension.contributes.submenu.icon.light', 'Icon pAth when A light theme is used'),
							type: 'string'
						},
						dArk: {
							description: locAlize('vscode.extension.contributes.submenu.icon.dArk', 'Icon pAth when A dArk theme is used'),
							type: 'string'
						}
					}
				}]
			}
		}
	};

	export const menusContribution: IJSONSchemA = {
		description: locAlize('vscode.extension.contributes.menus', "Contributes menu items to the editor"),
		type: 'object',
		properties: index(ApiMenus, menu => menu.key, menu => ({
			description: menu.proposed ? `(${locAlize('proposed', "Proposed API")}) ${menu.description}` : menu.description,
			type: 'ArrAy',
			items: menu.supportsSubmenus === fAlse ? menuItem : { oneOf: [menuItem, submenuItem] }
		})),
		AdditionAlProperties: {
			description: 'Submenu',
			type: 'ArrAy',
			items: { oneOf: [menuItem, submenuItem] }
		}
	};

	export const submenusContribution: IJSONSchemA = {
		description: locAlize('vscode.extension.contributes.submenus', "Contributes submenu items to the editor"),
		type: 'ArrAy',
		items: submenu
	};

	// --- commAnds contribution point

	export interfAce IUserFriendlyCommAnd {
		commAnd: string;
		title: string | ILocAlizedString;
		enAblement?: string;
		cAtegory?: string | ILocAlizedString;
		icon?: IUserFriendlyIcon;
	}

	export type IUserFriendlyIcon = string | { light: string; dArk: string; };

	export function isVAlidCommAnd(commAnd: IUserFriendlyCommAnd, collector: ExtensionMessAgeCollector): booleAn {
		if (!commAnd) {
			collector.error(locAlize('nonempty', "expected non-empty vAlue."));
			return fAlse;
		}
		if (isFAlsyOrWhitespAce(commAnd.commAnd)) {
			collector.error(locAlize('requirestring', "property `{0}` is mAndAtory And must be of type `string`", 'commAnd'));
			return fAlse;
		}
		if (!isVAlidLocAlizedString(commAnd.title, collector, 'title')) {
			return fAlse;
		}
		if (commAnd.enAblement && typeof commAnd.enAblement !== 'string') {
			collector.error(locAlize('optstring', "property `{0}` cAn be omitted or must be of type `string`", 'precondition'));
			return fAlse;
		}
		if (commAnd.cAtegory && !isVAlidLocAlizedString(commAnd.cAtegory, collector, 'cAtegory')) {
			return fAlse;
		}
		if (!isVAlidIcon(commAnd.icon, collector)) {
			return fAlse;
		}
		return true;
	}

	function isVAlidIcon(icon: IUserFriendlyIcon | undefined, collector: ExtensionMessAgeCollector): booleAn {
		if (typeof icon === 'undefined') {
			return true;
		}
		if (typeof icon === 'string') {
			return true;
		} else if (typeof icon.dArk === 'string' && typeof icon.light === 'string') {
			return true;
		}
		collector.error(locAlize('opticon', "property `icon` cAn be omitted or must be either A string or A literAl like `{dArk, light}`"));
		return fAlse;
	}

	function isVAlidLocAlizedString(locAlized: string | ILocAlizedString, collector: ExtensionMessAgeCollector, propertyNAme: string): booleAn {
		if (typeof locAlized === 'undefined') {
			collector.error(locAlize('requireStringOrObject', "property `{0}` is mAndAtory And must be of type `string` or `object`", propertyNAme));
			return fAlse;
		} else if (typeof locAlized === 'string' && isFAlsyOrWhitespAce(locAlized)) {
			collector.error(locAlize('requirestring', "property `{0}` is mAndAtory And must be of type `string`", propertyNAme));
			return fAlse;
		} else if (typeof locAlized !== 'string' && (isFAlsyOrWhitespAce(locAlized.originAl) || isFAlsyOrWhitespAce(locAlized.vAlue))) {
			collector.error(locAlize('requirestrings', "properties `{0}` And `{1}` Are mAndAtory And must be of type `string`", `${propertyNAme}.vAlue`, `${propertyNAme}.originAl`));
			return fAlse;
		}

		return true;
	}

	const commAndType: IJSONSchemA = {
		type: 'object',
		required: ['commAnd', 'title'],
		properties: {
			commAnd: {
				description: locAlize('vscode.extension.contributes.commAndType.commAnd', 'Identifier of the commAnd to execute'),
				type: 'string'
			},
			title: {
				description: locAlize('vscode.extension.contributes.commAndType.title', 'Title by which the commAnd is represented in the UI'),
				type: 'string'
			},
			cAtegory: {
				description: locAlize('vscode.extension.contributes.commAndType.cAtegory', '(OptionAl) CAtegory string by the commAnd is grouped in the UI'),
				type: 'string'
			},
			enAblement: {
				description: locAlize('vscode.extension.contributes.commAndType.precondition', '(OptionAl) Condition which must be true to enAble the commAnd'),
				type: 'string'
			},
			icon: {
				description: locAlize('vscode.extension.contributes.commAndType.icon', '(OptionAl) Icon which is used to represent the commAnd in the UI. Either A file pAth, An object with file pAths for dArk And light themes, or A theme icon references, like `\\$(zAp)`'),
				AnyOf: [{
					type: 'string'
				},
				{
					type: 'object',
					properties: {
						light: {
							description: locAlize('vscode.extension.contributes.commAndType.icon.light', 'Icon pAth when A light theme is used'),
							type: 'string'
						},
						dArk: {
							description: locAlize('vscode.extension.contributes.commAndType.icon.dArk', 'Icon pAth when A dArk theme is used'),
							type: 'string'
						}
					}
				}]
			}
		}
	};

	export const commAndsContribution: IJSONSchemA = {
		description: locAlize('vscode.extension.contributes.commAnds', "Contributes commAnds to the commAnd pAlette."),
		oneOf: [
			commAndType,
			{
				type: 'ArrAy',
				items: commAndType
			}
		]
	};
}

const _commAndRegistrAtions = new DisposAbleStore();

export const commAndsExtensionPoint = ExtensionsRegistry.registerExtensionPoint<schemA.IUserFriendlyCommAnd | schemA.IUserFriendlyCommAnd[]>({
	extensionPoint: 'commAnds',
	jsonSchemA: schemA.commAndsContribution
});

commAndsExtensionPoint.setHAndler(extensions => {

	function hAndleCommAnd(userFriendlyCommAnd: schemA.IUserFriendlyCommAnd, extension: IExtensionPointUser<Any>, bucket: ICommAndAction[]) {

		if (!schemA.isVAlidCommAnd(userFriendlyCommAnd, extension.collector)) {
			return;
		}

		const { icon, enAblement, cAtegory, title, commAnd } = userFriendlyCommAnd;

		let AbsoluteIcon: { dArk: URI; light?: URI; } | ThemeIcon | undefined;
		if (icon) {
			if (typeof icon === 'string') {
				AbsoluteIcon = ThemeIcon.fromString(icon) || { dArk: resources.joinPAth(extension.description.extensionLocAtion, icon) };

			} else {
				AbsoluteIcon = {
					dArk: resources.joinPAth(extension.description.extensionLocAtion, icon.dArk),
					light: resources.joinPAth(extension.description.extensionLocAtion, icon.light)
				};
			}
		}

		if (MenuRegistry.getCommAnd(commAnd)) {
			extension.collector.info(locAlize('dup', "CommAnd `{0}` AppeArs multiple times in the `commAnds` section.", userFriendlyCommAnd.commAnd));
		}
		bucket.push({
			id: commAnd,
			title,
			cAtegory,
			precondition: ContextKeyExpr.deseriAlize(enAblement),
			icon: AbsoluteIcon
		});
	}

	// remove All previous commAnd registrAtions
	_commAndRegistrAtions.cleAr();

	const newCommAnds: ICommAndAction[] = [];
	for (const extension of extensions) {
		const { vAlue } = extension;
		if (ArrAy.isArrAy(vAlue)) {
			for (const commAnd of vAlue) {
				hAndleCommAnd(commAnd, extension, newCommAnds);
			}
		} else {
			hAndleCommAnd(vAlue, extension, newCommAnds);
		}
	}
	_commAndRegistrAtions.Add(MenuRegistry.AddCommAnds(newCommAnds));
});

interfAce IRegisteredSubmenu {
	reAdonly id: MenuId;
	reAdonly lAbel: string;
	reAdonly icon?: { dArk: URI; light?: URI; } | ThemeIcon;
}

const _submenus = new MAp<string, IRegisteredSubmenu>();

const submenusExtensionPoint = ExtensionsRegistry.registerExtensionPoint<schemA.IUserFriendlySubmenu[]>({
	extensionPoint: 'submenus',
	jsonSchemA: schemA.submenusContribution
});

submenusExtensionPoint.setHAndler(extensions => {

	_submenus.cleAr();

	for (let extension of extensions) {
		const { vAlue, collector } = extension;

		forEAch(vAlue, entry => {
			if (!schemA.isVAlidSubmenu(entry.vAlue, collector)) {
				return;
			}

			if (!entry.vAlue.id) {
				collector.wArn(locAlize('submenuId.invAlid.id', "`{0}` is not A vAlid submenu identifier", entry.vAlue.id));
				return;
			}
			if (!entry.vAlue.lAbel) {
				collector.wArn(locAlize('submenuId.invAlid.lAbel', "`{0}` is not A vAlid submenu lAbel", entry.vAlue.lAbel));
				return;
			}

			let AbsoluteIcon: { dArk: URI; light?: URI; } | ThemeIcon | undefined;
			if (entry.vAlue.icon) {
				if (typeof entry.vAlue.icon === 'string') {
					AbsoluteIcon = ThemeIcon.fromString(entry.vAlue.icon) || { dArk: resources.joinPAth(extension.description.extensionLocAtion, entry.vAlue.icon) };
				} else {
					AbsoluteIcon = {
						dArk: resources.joinPAth(extension.description.extensionLocAtion, entry.vAlue.icon.dArk),
						light: resources.joinPAth(extension.description.extensionLocAtion, entry.vAlue.icon.light)
					};
				}
			}

			const item: IRegisteredSubmenu = {
				id: new MenuId(`Api:${entry.vAlue.id}`),
				lAbel: entry.vAlue.lAbel,
				icon: AbsoluteIcon
			};

			_submenus.set(entry.vAlue.id, item);
		});
	}
});

const _ApiMenusByKey = new MAp(IterAble.mAp(IterAble.from(ApiMenus), menu => ([menu.key, menu])));
const _menuRegistrAtions = new DisposAbleStore();

const menusExtensionPoint = ExtensionsRegistry.registerExtensionPoint<{ [loc: string]: (schemA.IUserFriendlyMenuItem | schemA.IUserFriendlySubmenuItem)[] }>({
	extensionPoint: 'menus',
	jsonSchemA: schemA.menusContribution,
	deps: [submenusExtensionPoint]
});

menusExtensionPoint.setHAndler(extensions => {

	// remove All previous menu registrAtions
	_menuRegistrAtions.cleAr();

	const items: { id: MenuId, item: IMenuItem | ISubmenuItem }[] = [];

	for (let extension of extensions) {
		const { vAlue, collector } = extension;

		forEAch(vAlue, entry => {
			if (!schemA.isVAlidItems(entry.vAlue, collector)) {
				return;
			}

			let menu = _ApiMenusByKey.get(entry.key);

			if (!menu) {
				const submenu = _submenus.get(entry.key);

				if (submenu) {
					menu = {
						key: entry.key,
						id: submenu.id,
						description: ''
					};
				}
			}

			if (!menu) {
				collector.wArn(locAlize('menuId.invAlid', "`{0}` is not A vAlid menu identifier", entry.key));
				return;
			}

			if (menu.proposed && !extension.description.enAbleProposedApi) {
				collector.error(locAlize('proposedAPI.invAlid', "{0} is A proposed menu identifier And is only AvAilAble when running out of dev or with the following commAnd line switch: --enAble-proposed-Api {1}", entry.key, extension.description.identifier.vAlue));
				return;
			}

			for (const menuItem of entry.vAlue) {
				let item: IMenuItem | ISubmenuItem;

				if (schemA.isMenuItem(menuItem)) {
					const commAnd = MenuRegistry.getCommAnd(menuItem.commAnd);
					const Alt = menuItem.Alt && MenuRegistry.getCommAnd(menuItem.Alt) || undefined;

					if (!commAnd) {
						collector.error(locAlize('missing.commAnd', "Menu item references A commAnd `{0}` which is not defined in the 'commAnds' section.", menuItem.commAnd));
						continue;
					}
					if (menuItem.Alt && !Alt) {
						collector.wArn(locAlize('missing.AltCommAnd', "Menu item references An Alt-commAnd `{0}` which is not defined in the 'commAnds' section.", menuItem.Alt));
					}
					if (menuItem.commAnd === menuItem.Alt) {
						collector.info(locAlize('dupe.commAnd', "Menu item references the sAme commAnd As defAult And Alt-commAnd"));
					}

					item = { commAnd, Alt, group: undefined, order: undefined, when: undefined };
				} else {
					if (menu.supportsSubmenus === fAlse) {
						collector.error(locAlize('unsupported.submenureference', "Menu item references A submenu for A menu which doesn't hAve submenu support."));
						continue;
					}

					const submenu = _submenus.get(menuItem.submenu);

					if (!submenu) {
						collector.error(locAlize('missing.submenu', "Menu item references A submenu `{0}` which is not defined in the 'submenus' section.", menuItem.submenu));
						continue;
					}

					item = { submenu: submenu.id, icon: submenu.icon, title: submenu.lAbel, group: undefined, order: undefined, when: undefined };
				}

				if (menuItem.group) {
					const idx = menuItem.group.lAstIndexOf('@');
					if (idx > 0) {
						item.group = menuItem.group.substr(0, idx);
						item.order = Number(menuItem.group.substr(idx + 1)) || undefined;
					} else {
						item.group = menuItem.group;
					}
				}

				item.when = ContextKeyExpr.deseriAlize(menuItem.when);
				items.push({ id: menu.id, item });
			}
		});
	}

	_menuRegistrAtions.Add(MenuRegistry.AppendMenuItems(items));
});
