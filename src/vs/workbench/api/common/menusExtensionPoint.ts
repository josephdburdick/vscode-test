/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { isFalsyOrWhitespace } from 'vs/Base/common/strings';
import * as resources from 'vs/Base/common/resources';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { forEach } from 'vs/Base/common/collections';
import { IExtensionPointUser, ExtensionMessageCollector, ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { MenuId, MenuRegistry, ILocalizedString, IMenuItem, ICommandAction, ISuBmenuItem } from 'vs/platform/actions/common/actions';
import { URI } from 'vs/Base/common/uri';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { IteraBle } from 'vs/Base/common/iterator';
import { index } from 'vs/Base/common/arrays';

interface IAPIMenu {
	readonly key: string;
	readonly id: MenuId;
	readonly description: string;
	readonly proposed?: Boolean; // defaults to false
	readonly supportsSuBmenus?: Boolean; // defaults to true
}

const apiMenus: IAPIMenu[] = [
	{
		key: 'commandPalette',
		id: MenuId.CommandPalette,
		description: localize('menus.commandPalette', "The Command Palette"),
		supportsSuBmenus: false
	},
	{
		key: 'touchBar',
		id: MenuId.TouchBarContext,
		description: localize('menus.touchBar', "The touch Bar (macOS only)"),
		supportsSuBmenus: false
	},
	{
		key: 'editor/title',
		id: MenuId.EditorTitle,
		description: localize('menus.editorTitle', "The editor title menu")
	},
	{
		key: 'editor/context',
		id: MenuId.EditorContext,
		description: localize('menus.editorContext', "The editor context menu")
	},
	{
		key: 'explorer/context',
		id: MenuId.ExplorerContext,
		description: localize('menus.explorerContext', "The file explorer context menu")
	},
	{
		key: 'editor/title/context',
		id: MenuId.EditorTitleContext,
		description: localize('menus.editorTaBContext', "The editor taBs context menu")
	},
	{
		key: 'deBug/callstack/context',
		id: MenuId.DeBugCallStackContext,
		description: localize('menus.deBugCallstackContext', "The deBug callstack view context menu")
	},
	{
		key: 'deBug/variaBles/context',
		id: MenuId.DeBugVariaBlesContext,
		description: localize('menus.deBugVariaBlesContext', "The deBug variaBles view context menu")
	},
	{
		key: 'deBug/toolBar',
		id: MenuId.DeBugToolBar,
		description: localize('menus.deBugToolBar', "The deBug toolBar menu")
	},
	{
		key: 'menuBar/weBNavigation',
		id: MenuId.MenuBarWeBNavigationMenu,
		description: localize('menus.weBNavigation', "The top level navigational menu (weB only)"),
		proposed: true,
		supportsSuBmenus: false
	},
	{
		key: 'menuBar/file',
		id: MenuId.MenuBarFileMenu,
		description: localize('menus.file', "The top level file menu"),
		proposed: true
	},
	{
		key: 'scm/title',
		id: MenuId.SCMTitle,
		description: localize('menus.scmTitle', "The Source Control title menu")
	},
	{
		key: 'scm/sourceControl',
		id: MenuId.SCMSourceControl,
		description: localize('menus.scmSourceControl', "The Source Control menu")
	},
	{
		key: 'scm/resourceState/context',
		id: MenuId.SCMResourceContext,
		description: localize('menus.resourceGroupContext', "The Source Control resource group context menu")
	},
	{
		key: 'scm/resourceFolder/context',
		id: MenuId.SCMResourceFolderContext,
		description: localize('menus.resourceStateContext', "The Source Control resource state context menu")
	},
	{
		key: 'scm/resourceGroup/context',
		id: MenuId.SCMResourceGroupContext,
		description: localize('menus.resourceFolderContext', "The Source Control resource folder context menu")
	},
	{
		key: 'scm/change/title',
		id: MenuId.SCMChangeContext,
		description: localize('menus.changeTitle', "The Source Control inline change menu")
	},
	{
		key: 'statusBar/windowIndicator',
		id: MenuId.StatusBarWindowIndicatorMenu,
		description: localize('menus.statusBarWindowIndicator', "The window indicator menu in the status Bar"),
		proposed: true,
		supportsSuBmenus: false
	},
	{
		key: 'view/title',
		id: MenuId.ViewTitle,
		description: localize('view.viewTitle', "The contriButed view title menu")
	},
	{
		key: 'view/item/context',
		id: MenuId.ViewItemContext,
		description: localize('view.itemContext', "The contriButed view item context menu")
	},
	{
		key: 'comments/commentThread/title',
		id: MenuId.CommentThreadTitle,
		description: localize('commentThread.title', "The contriButed comment thread title menu")
	},
	{
		key: 'comments/commentThread/context',
		id: MenuId.CommentThreadActions,
		description: localize('commentThread.actions', "The contriButed comment thread context menu, rendered as Buttons Below the comment editor"),
		supportsSuBmenus: false
	},
	{
		key: 'comments/comment/title',
		id: MenuId.CommentTitle,
		description: localize('comment.title', "The contriButed comment title menu")
	},
	{
		key: 'comments/comment/context',
		id: MenuId.CommentActions,
		description: localize('comment.actions', "The contriButed comment context menu, rendered as Buttons Below the comment editor"),
		supportsSuBmenus: false
	},
	{
		key: 'noteBook/cell/title',
		id: MenuId.NoteBookCellTitle,
		description: localize('noteBook.cell.title', "The contriButed noteBook cell title menu"),
		proposed: true
	},
	{
		key: 'extension/context',
		id: MenuId.ExtensionContext,
		description: localize('menus.extensionContext', "The extension context menu")
	},
	{
		key: 'timeline/title',
		id: MenuId.TimelineTitle,
		description: localize('view.timelineTitle', "The Timeline view title menu")
	},
	{
		key: 'timeline/item/context',
		id: MenuId.TimelineItemContext,
		description: localize('view.timelineContext', "The Timeline view item context menu")
	},
];

namespace schema {

	// --- menus, suBmenus contriBution point

	export interface IUserFriendlyMenuItem {
		command: string;
		alt?: string;
		when?: string;
		group?: string;
	}

	export interface IUserFriendlySuBmenuItem {
		suBmenu: string;
		when?: string;
		group?: string;
	}

	export interface IUserFriendlySuBmenu {
		id: string;
		laBel: string;
		icon?: IUserFriendlyIcon;
	}

	export function isMenuItem(item: IUserFriendlyMenuItem | IUserFriendlySuBmenuItem): item is IUserFriendlyMenuItem {
		return typeof (item as IUserFriendlyMenuItem).command === 'string';
	}

	export function isValidMenuItem(item: IUserFriendlyMenuItem, collector: ExtensionMessageCollector): Boolean {
		if (typeof item.command !== 'string') {
			collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'command'));
			return false;
		}
		if (item.alt && typeof item.alt !== 'string') {
			collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'alt'));
			return false;
		}
		if (item.when && typeof item.when !== 'string') {
			collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'when'));
			return false;
		}
		if (item.group && typeof item.group !== 'string') {
			collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'group'));
			return false;
		}

		return true;
	}

	export function isValidSuBmenuItem(item: IUserFriendlySuBmenuItem, collector: ExtensionMessageCollector): Boolean {
		if (typeof item.suBmenu !== 'string') {
			collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'suBmenu'));
			return false;
		}
		if (item.when && typeof item.when !== 'string') {
			collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'when'));
			return false;
		}
		if (item.group && typeof item.group !== 'string') {
			collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'group'));
			return false;
		}

		return true;
	}

	export function isValidItems(items: (IUserFriendlyMenuItem | IUserFriendlySuBmenuItem)[], collector: ExtensionMessageCollector): Boolean {
		if (!Array.isArray(items)) {
			collector.error(localize('requirearray', "suBmenu items must Be an array"));
			return false;
		}

		for (let item of items) {
			if (isMenuItem(item)) {
				if (!isValidMenuItem(item, collector)) {
					return false;
				}
			} else {
				if (!isValidSuBmenuItem(item, collector)) {
					return false;
				}
			}
		}

		return true;
	}

	export function isValidSuBmenu(suBmenu: IUserFriendlySuBmenu, collector: ExtensionMessageCollector): Boolean {
		if (typeof suBmenu !== 'oBject') {
			collector.error(localize('require', "suBmenu items must Be an oBject"));
			return false;
		}

		if (typeof suBmenu.id !== 'string') {
			collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'id'));
			return false;
		}
		if (typeof suBmenu.laBel !== 'string') {
			collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'laBel'));
			return false;
		}

		return true;
	}

	const menuItem: IJSONSchema = {
		type: 'oBject',
		required: ['command'],
		properties: {
			command: {
				description: localize('vscode.extension.contriButes.menuItem.command', 'Identifier of the command to execute. The command must Be declared in the \'commands\'-section'),
				type: 'string'
			},
			alt: {
				description: localize('vscode.extension.contriButes.menuItem.alt', 'Identifier of an alternative command to execute. The command must Be declared in the \'commands\'-section'),
				type: 'string'
			},
			when: {
				description: localize('vscode.extension.contriButes.menuItem.when', 'Condition which must Be true to show this item'),
				type: 'string'
			},
			group: {
				description: localize('vscode.extension.contriButes.menuItem.group', 'Group into which this item Belongs'),
				type: 'string'
			}
		}
	};

	const suBmenuItem: IJSONSchema = {
		type: 'oBject',
		required: ['suBmenu'],
		properties: {
			suBmenu: {
				description: localize('vscode.extension.contriButes.menuItem.suBmenu', 'Identifier of the suBmenu to display in this item.'),
				type: 'string'
			},
			when: {
				description: localize('vscode.extension.contriButes.menuItem.when', 'Condition which must Be true to show this item'),
				type: 'string'
			},
			group: {
				description: localize('vscode.extension.contriButes.menuItem.group', 'Group into which this item Belongs'),
				type: 'string'
			}
		}
	};

	const suBmenu: IJSONSchema = {
		type: 'oBject',
		required: ['id', 'laBel'],
		properties: {
			id: {
				description: localize('vscode.extension.contriButes.suBmenu.id', 'Identifier of the menu to display as a suBmenu.'),
				type: 'string'
			},
			laBel: {
				description: localize('vscode.extension.contriButes.suBmenu.laBel', 'The laBel of the menu item which leads to this suBmenu.'),
				type: 'string'
			},
			icon: {
				description: localize('vscode.extension.contriButes.suBmenu.icon', '(Optional) Icon which is used to represent the suBmenu in the UI. Either a file path, an oBject with file paths for dark and light themes, or a theme icon references, like `\\$(zap)`'),
				anyOf: [{
					type: 'string'
				},
				{
					type: 'oBject',
					properties: {
						light: {
							description: localize('vscode.extension.contriButes.suBmenu.icon.light', 'Icon path when a light theme is used'),
							type: 'string'
						},
						dark: {
							description: localize('vscode.extension.contriButes.suBmenu.icon.dark', 'Icon path when a dark theme is used'),
							type: 'string'
						}
					}
				}]
			}
		}
	};

	export const menusContriBution: IJSONSchema = {
		description: localize('vscode.extension.contriButes.menus', "ContriButes menu items to the editor"),
		type: 'oBject',
		properties: index(apiMenus, menu => menu.key, menu => ({
			description: menu.proposed ? `(${localize('proposed', "Proposed API")}) ${menu.description}` : menu.description,
			type: 'array',
			items: menu.supportsSuBmenus === false ? menuItem : { oneOf: [menuItem, suBmenuItem] }
		})),
		additionalProperties: {
			description: 'SuBmenu',
			type: 'array',
			items: { oneOf: [menuItem, suBmenuItem] }
		}
	};

	export const suBmenusContriBution: IJSONSchema = {
		description: localize('vscode.extension.contriButes.suBmenus', "ContriButes suBmenu items to the editor"),
		type: 'array',
		items: suBmenu
	};

	// --- commands contriBution point

	export interface IUserFriendlyCommand {
		command: string;
		title: string | ILocalizedString;
		enaBlement?: string;
		category?: string | ILocalizedString;
		icon?: IUserFriendlyIcon;
	}

	export type IUserFriendlyIcon = string | { light: string; dark: string; };

	export function isValidCommand(command: IUserFriendlyCommand, collector: ExtensionMessageCollector): Boolean {
		if (!command) {
			collector.error(localize('nonempty', "expected non-empty value."));
			return false;
		}
		if (isFalsyOrWhitespace(command.command)) {
			collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'command'));
			return false;
		}
		if (!isValidLocalizedString(command.title, collector, 'title')) {
			return false;
		}
		if (command.enaBlement && typeof command.enaBlement !== 'string') {
			collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'precondition'));
			return false;
		}
		if (command.category && !isValidLocalizedString(command.category, collector, 'category')) {
			return false;
		}
		if (!isValidIcon(command.icon, collector)) {
			return false;
		}
		return true;
	}

	function isValidIcon(icon: IUserFriendlyIcon | undefined, collector: ExtensionMessageCollector): Boolean {
		if (typeof icon === 'undefined') {
			return true;
		}
		if (typeof icon === 'string') {
			return true;
		} else if (typeof icon.dark === 'string' && typeof icon.light === 'string') {
			return true;
		}
		collector.error(localize('opticon', "property `icon` can Be omitted or must Be either a string or a literal like `{dark, light}`"));
		return false;
	}

	function isValidLocalizedString(localized: string | ILocalizedString, collector: ExtensionMessageCollector, propertyName: string): Boolean {
		if (typeof localized === 'undefined') {
			collector.error(localize('requireStringOrOBject', "property `{0}` is mandatory and must Be of type `string` or `oBject`", propertyName));
			return false;
		} else if (typeof localized === 'string' && isFalsyOrWhitespace(localized)) {
			collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", propertyName));
			return false;
		} else if (typeof localized !== 'string' && (isFalsyOrWhitespace(localized.original) || isFalsyOrWhitespace(localized.value))) {
			collector.error(localize('requirestrings', "properties `{0}` and `{1}` are mandatory and must Be of type `string`", `${propertyName}.value`, `${propertyName}.original`));
			return false;
		}

		return true;
	}

	const commandType: IJSONSchema = {
		type: 'oBject',
		required: ['command', 'title'],
		properties: {
			command: {
				description: localize('vscode.extension.contriButes.commandType.command', 'Identifier of the command to execute'),
				type: 'string'
			},
			title: {
				description: localize('vscode.extension.contriButes.commandType.title', 'Title By which the command is represented in the UI'),
				type: 'string'
			},
			category: {
				description: localize('vscode.extension.contriButes.commandType.category', '(Optional) Category string By the command is grouped in the UI'),
				type: 'string'
			},
			enaBlement: {
				description: localize('vscode.extension.contriButes.commandType.precondition', '(Optional) Condition which must Be true to enaBle the command'),
				type: 'string'
			},
			icon: {
				description: localize('vscode.extension.contriButes.commandType.icon', '(Optional) Icon which is used to represent the command in the UI. Either a file path, an oBject with file paths for dark and light themes, or a theme icon references, like `\\$(zap)`'),
				anyOf: [{
					type: 'string'
				},
				{
					type: 'oBject',
					properties: {
						light: {
							description: localize('vscode.extension.contriButes.commandType.icon.light', 'Icon path when a light theme is used'),
							type: 'string'
						},
						dark: {
							description: localize('vscode.extension.contriButes.commandType.icon.dark', 'Icon path when a dark theme is used'),
							type: 'string'
						}
					}
				}]
			}
		}
	};

	export const commandsContriBution: IJSONSchema = {
		description: localize('vscode.extension.contriButes.commands', "ContriButes commands to the command palette."),
		oneOf: [
			commandType,
			{
				type: 'array',
				items: commandType
			}
		]
	};
}

const _commandRegistrations = new DisposaBleStore();

export const commandsExtensionPoint = ExtensionsRegistry.registerExtensionPoint<schema.IUserFriendlyCommand | schema.IUserFriendlyCommand[]>({
	extensionPoint: 'commands',
	jsonSchema: schema.commandsContriBution
});

commandsExtensionPoint.setHandler(extensions => {

	function handleCommand(userFriendlyCommand: schema.IUserFriendlyCommand, extension: IExtensionPointUser<any>, Bucket: ICommandAction[]) {

		if (!schema.isValidCommand(userFriendlyCommand, extension.collector)) {
			return;
		}

		const { icon, enaBlement, category, title, command } = userFriendlyCommand;

		let aBsoluteIcon: { dark: URI; light?: URI; } | ThemeIcon | undefined;
		if (icon) {
			if (typeof icon === 'string') {
				aBsoluteIcon = ThemeIcon.fromString(icon) || { dark: resources.joinPath(extension.description.extensionLocation, icon) };

			} else {
				aBsoluteIcon = {
					dark: resources.joinPath(extension.description.extensionLocation, icon.dark),
					light: resources.joinPath(extension.description.extensionLocation, icon.light)
				};
			}
		}

		if (MenuRegistry.getCommand(command)) {
			extension.collector.info(localize('dup', "Command `{0}` appears multiple times in the `commands` section.", userFriendlyCommand.command));
		}
		Bucket.push({
			id: command,
			title,
			category,
			precondition: ContextKeyExpr.deserialize(enaBlement),
			icon: aBsoluteIcon
		});
	}

	// remove all previous command registrations
	_commandRegistrations.clear();

	const newCommands: ICommandAction[] = [];
	for (const extension of extensions) {
		const { value } = extension;
		if (Array.isArray(value)) {
			for (const command of value) {
				handleCommand(command, extension, newCommands);
			}
		} else {
			handleCommand(value, extension, newCommands);
		}
	}
	_commandRegistrations.add(MenuRegistry.addCommands(newCommands));
});

interface IRegisteredSuBmenu {
	readonly id: MenuId;
	readonly laBel: string;
	readonly icon?: { dark: URI; light?: URI; } | ThemeIcon;
}

const _suBmenus = new Map<string, IRegisteredSuBmenu>();

const suBmenusExtensionPoint = ExtensionsRegistry.registerExtensionPoint<schema.IUserFriendlySuBmenu[]>({
	extensionPoint: 'suBmenus',
	jsonSchema: schema.suBmenusContriBution
});

suBmenusExtensionPoint.setHandler(extensions => {

	_suBmenus.clear();

	for (let extension of extensions) {
		const { value, collector } = extension;

		forEach(value, entry => {
			if (!schema.isValidSuBmenu(entry.value, collector)) {
				return;
			}

			if (!entry.value.id) {
				collector.warn(localize('suBmenuId.invalid.id', "`{0}` is not a valid suBmenu identifier", entry.value.id));
				return;
			}
			if (!entry.value.laBel) {
				collector.warn(localize('suBmenuId.invalid.laBel', "`{0}` is not a valid suBmenu laBel", entry.value.laBel));
				return;
			}

			let aBsoluteIcon: { dark: URI; light?: URI; } | ThemeIcon | undefined;
			if (entry.value.icon) {
				if (typeof entry.value.icon === 'string') {
					aBsoluteIcon = ThemeIcon.fromString(entry.value.icon) || { dark: resources.joinPath(extension.description.extensionLocation, entry.value.icon) };
				} else {
					aBsoluteIcon = {
						dark: resources.joinPath(extension.description.extensionLocation, entry.value.icon.dark),
						light: resources.joinPath(extension.description.extensionLocation, entry.value.icon.light)
					};
				}
			}

			const item: IRegisteredSuBmenu = {
				id: new MenuId(`api:${entry.value.id}`),
				laBel: entry.value.laBel,
				icon: aBsoluteIcon
			};

			_suBmenus.set(entry.value.id, item);
		});
	}
});

const _apiMenusByKey = new Map(IteraBle.map(IteraBle.from(apiMenus), menu => ([menu.key, menu])));
const _menuRegistrations = new DisposaBleStore();

const menusExtensionPoint = ExtensionsRegistry.registerExtensionPoint<{ [loc: string]: (schema.IUserFriendlyMenuItem | schema.IUserFriendlySuBmenuItem)[] }>({
	extensionPoint: 'menus',
	jsonSchema: schema.menusContriBution,
	deps: [suBmenusExtensionPoint]
});

menusExtensionPoint.setHandler(extensions => {

	// remove all previous menu registrations
	_menuRegistrations.clear();

	const items: { id: MenuId, item: IMenuItem | ISuBmenuItem }[] = [];

	for (let extension of extensions) {
		const { value, collector } = extension;

		forEach(value, entry => {
			if (!schema.isValidItems(entry.value, collector)) {
				return;
			}

			let menu = _apiMenusByKey.get(entry.key);

			if (!menu) {
				const suBmenu = _suBmenus.get(entry.key);

				if (suBmenu) {
					menu = {
						key: entry.key,
						id: suBmenu.id,
						description: ''
					};
				}
			}

			if (!menu) {
				collector.warn(localize('menuId.invalid', "`{0}` is not a valid menu identifier", entry.key));
				return;
			}

			if (menu.proposed && !extension.description.enaBleProposedApi) {
				collector.error(localize('proposedAPI.invalid', "{0} is a proposed menu identifier and is only availaBle when running out of dev or with the following command line switch: --enaBle-proposed-api {1}", entry.key, extension.description.identifier.value));
				return;
			}

			for (const menuItem of entry.value) {
				let item: IMenuItem | ISuBmenuItem;

				if (schema.isMenuItem(menuItem)) {
					const command = MenuRegistry.getCommand(menuItem.command);
					const alt = menuItem.alt && MenuRegistry.getCommand(menuItem.alt) || undefined;

					if (!command) {
						collector.error(localize('missing.command', "Menu item references a command `{0}` which is not defined in the 'commands' section.", menuItem.command));
						continue;
					}
					if (menuItem.alt && !alt) {
						collector.warn(localize('missing.altCommand', "Menu item references an alt-command `{0}` which is not defined in the 'commands' section.", menuItem.alt));
					}
					if (menuItem.command === menuItem.alt) {
						collector.info(localize('dupe.command', "Menu item references the same command as default and alt-command"));
					}

					item = { command, alt, group: undefined, order: undefined, when: undefined };
				} else {
					if (menu.supportsSuBmenus === false) {
						collector.error(localize('unsupported.suBmenureference', "Menu item references a suBmenu for a menu which doesn't have suBmenu support."));
						continue;
					}

					const suBmenu = _suBmenus.get(menuItem.suBmenu);

					if (!suBmenu) {
						collector.error(localize('missing.suBmenu', "Menu item references a suBmenu `{0}` which is not defined in the 'suBmenus' section.", menuItem.suBmenu));
						continue;
					}

					item = { suBmenu: suBmenu.id, icon: suBmenu.icon, title: suBmenu.laBel, group: undefined, order: undefined, when: undefined };
				}

				if (menuItem.group) {
					const idx = menuItem.group.lastIndexOf('@');
					if (idx > 0) {
						item.group = menuItem.group.suBstr(0, idx);
						item.order = NumBer(menuItem.group.suBstr(idx + 1)) || undefined;
					} else {
						item.group = menuItem.group;
					}
				}

				item.when = ContextKeyExpr.deserialize(menuItem.when);
				items.push({ id: menu.id, item });
			}
		});
	}

	_menuRegistrations.add(MenuRegistry.appendMenuItems(items));
});
