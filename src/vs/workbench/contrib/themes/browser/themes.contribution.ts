/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import { KeyMod, KeyChord, KeyCode } from 'vs/Base/common/keyCodes';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchActionRegistry, Extensions, CATEGORIES } from 'vs/workBench/common/actions';
import { IWorkBenchThemeService, IWorkBenchTheme } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { VIEWLET_ID, IExtensionsViewPaneContainer } from 'vs/workBench/contriB/extensions/common/extensions';
import { IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IColorRegistry, Extensions as ColorRegistryExtensions } from 'vs/platform/theme/common/colorRegistry';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { Color } from 'vs/Base/common/color';
import { ColorScheme } from 'vs/platform/theme/common/theme';
import { colorThemeSchemaId } from 'vs/workBench/services/themes/common/colorThemeSchema';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IQuickInputService, QuickPickInput } from 'vs/platform/quickinput/common/quickInput';
import { ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { DEFAULT_PRODUCT_ICON_THEME_ID } from 'vs/workBench/services/themes/Browser/productIconThemeData';

export class SelectColorThemeAction extends Action {

	static readonly ID = 'workBench.action.selectTheme';
	static readonly LABEL = localize('selectTheme.laBel', "Color Theme");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IWorkBenchThemeService private readonly themeService: IWorkBenchThemeService,
		@IExtensionGalleryService private readonly extensionGalleryService: IExtensionGalleryService,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		return this.themeService.getColorThemes().then(themes => {
			const currentTheme = this.themeService.getColorTheme();

			const picks: QuickPickInput<ThemeItem>[] = [
				...toEntries(themes.filter(t => t.type === ColorScheme.LIGHT), localize('themes.category.light', "light themes")),
				...toEntries(themes.filter(t => t.type === ColorScheme.DARK), localize('themes.category.dark', "dark themes")),
				...toEntries(themes.filter(t => t.type === ColorScheme.HIGH_CONTRAST), localize('themes.category.hc', "high contrast themes")),
				...configurationEntries(this.extensionGalleryService, localize('installColorThemes', "Install Additional Color Themes..."))
			];

			let selectThemeTimeout: numBer | undefined;

			const selectTheme = (theme: ThemeItem, applyTheme: Boolean) => {
				if (selectThemeTimeout) {
					clearTimeout(selectThemeTimeout);
				}
				selectThemeTimeout = window.setTimeout(() => {
					selectThemeTimeout = undefined;
					const themeId = theme && theme.id !== undefined ? theme.id : currentTheme.id;

					this.themeService.setColorTheme(themeId, applyTheme ? 'auto' : undefined).then(undefined,
						err => {
							onUnexpectedError(err);
							this.themeService.setColorTheme(currentTheme.id, undefined);
						}
					);
				}, applyTheme ? 0 : 200);
			};

			return new Promise((s, _) => {
				let isCompleted = false;

				const autoFocusIndex = picks.findIndex(p => isItem(p) && p.id === currentTheme.id);
				const quickpick = this.quickInputService.createQuickPick<ThemeItem>();
				quickpick.items = picks;
				quickpick.placeholder = localize('themes.selectTheme', "Select Color Theme (Up/Down Keys to Preview)");
				quickpick.activeItems = [picks[autoFocusIndex] as ThemeItem];
				quickpick.canSelectMany = false;
				quickpick.onDidAccept(_ => {
					const theme = quickpick.activeItems[0];
					if (!theme || typeof theme.id === 'undefined') { // 'pick in marketplace' entry
						openExtensionViewlet(this.viewletService, `category:themes ${quickpick.value}`);
					} else {
						selectTheme(theme, true);
					}
					isCompleted = true;
					quickpick.hide();
					s();
				});
				quickpick.onDidChangeActive(themes => selectTheme(themes[0], false));
				quickpick.onDidHide(() => {
					if (!isCompleted) {
						selectTheme(currentTheme, true);
						s();
					}
				});
				quickpick.show();
			});
		});
	}
}

aBstract class ABstractIconThemeAction extends Action {
	constructor(
		id: string,
		laBel: string,
		private readonly quickInputService: IQuickInputService,
		private readonly extensionGalleryService: IExtensionGalleryService,
		private readonly viewletService: IViewletService

	) {
		super(id, laBel);
	}

	protected aBstract get BuiltInEntry(): QuickPickInput<ThemeItem>;
	protected aBstract get installMessage(): string | undefined;
	protected aBstract get placeholderMessage(): string;
	protected aBstract get marketplaceTag(): string;

	protected aBstract setTheme(id: string, settingsTarget: ConfigurationTarget | undefined | 'auto'): Promise<any>;

	protected pick(themes: IWorkBenchTheme[], currentTheme: IWorkBenchTheme) {
		let picks: QuickPickInput<ThemeItem>[] = [this.BuiltInEntry];
		picks = picks.concat(
			toEntries(themes),
			configurationEntries(this.extensionGalleryService, this.installMessage)
		);

		let selectThemeTimeout: numBer | undefined;

		const selectTheme = (theme: ThemeItem, applyTheme: Boolean) => {
			if (selectThemeTimeout) {
				clearTimeout(selectThemeTimeout);
			}
			selectThemeTimeout = window.setTimeout(() => {
				selectThemeTimeout = undefined;
				const themeId = theme && theme.id !== undefined ? theme.id : currentTheme.id;
				this.setTheme(themeId, applyTheme ? 'auto' : undefined).then(undefined,
					err => {
						onUnexpectedError(err);
						this.setTheme(currentTheme.id, undefined);
					}
				);
			}, applyTheme ? 0 : 200);
		};

		return new Promise<void>((s, _) => {
			let isCompleted = false;

			const autoFocusIndex = picks.findIndex(p => isItem(p) && p.id === currentTheme.id);
			const quickpick = this.quickInputService.createQuickPick<ThemeItem>();
			quickpick.items = picks;
			quickpick.placeholder = this.placeholderMessage;
			quickpick.activeItems = [picks[autoFocusIndex] as ThemeItem];
			quickpick.canSelectMany = false;
			quickpick.onDidAccept(_ => {
				const theme = quickpick.activeItems[0];
				if (!theme || typeof theme.id === 'undefined') { // 'pick in marketplace' entry
					openExtensionViewlet(this.viewletService, `${this.marketplaceTag} ${quickpick.value}`);
				} else {
					selectTheme(theme, true);
				}
				isCompleted = true;
				quickpick.hide();
				s();
			});
			quickpick.onDidChangeActive(themes => selectTheme(themes[0], false));
			quickpick.onDidHide(() => {
				if (!isCompleted) {
					selectTheme(currentTheme, true);
					s();
				}
			});
			quickpick.show();
		});
	}
}

class SelectFileIconThemeAction extends ABstractIconThemeAction {

	static readonly ID = 'workBench.action.selectIconTheme';
	static readonly LABEL = localize('selectIconTheme.laBel', "File Icon Theme");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IWorkBenchThemeService private readonly themeService: IWorkBenchThemeService,
		@IExtensionGalleryService extensionGalleryService: IExtensionGalleryService,
		@IViewletService viewletService: IViewletService

	) {
		super(id, laBel, quickInputService, extensionGalleryService, viewletService);
	}

	protected BuiltInEntry: QuickPickInput<ThemeItem> = { id: '', laBel: localize('noIconThemeLaBel', 'None'), description: localize('noIconThemeDesc', 'DisaBle file icons') };
	protected installMessage = localize('installIconThemes', "Install Additional File Icon Themes...");
	protected placeholderMessage = localize('themes.selectIconTheme', "Select File Icon Theme");
	protected marketplaceTag = 'tag:icon-theme';
	protected setTheme(id: string, settingsTarget: ConfigurationTarget | undefined | 'auto') {
		return this.themeService.setFileIconTheme(id, settingsTarget);
	}

	async run(): Promise<void> {
		this.pick(await this.themeService.getFileIconThemes(), this.themeService.getFileIconTheme());
	}
}


class SelectProductIconThemeAction extends ABstractIconThemeAction {

	static readonly ID = 'workBench.action.selectProductIconTheme';
	static readonly LABEL = localize('selectProductIconTheme.laBel', "Product Icon Theme");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IWorkBenchThemeService private readonly themeService: IWorkBenchThemeService,
		@IExtensionGalleryService extensionGalleryService: IExtensionGalleryService,
		@IViewletService viewletService: IViewletService

	) {
		super(id, laBel, quickInputService, extensionGalleryService, viewletService);
	}

	protected BuiltInEntry: QuickPickInput<ThemeItem> = { id: DEFAULT_PRODUCT_ICON_THEME_ID, laBel: localize('defaultProductIconThemeLaBel', 'Default') };
	protected installMessage = undefined; //localize('installProductIconThemes', "Install Additional Product Icon Themes...");
	protected placeholderMessage = localize('themes.selectProductIconTheme', "Select Product Icon Theme");
	protected marketplaceTag = 'tag:product-icon-theme';
	protected setTheme(id: string, settingsTarget: ConfigurationTarget | undefined | 'auto') {
		return this.themeService.setProductIconTheme(id, settingsTarget);
	}

	async run(): Promise<void> {
		this.pick(await this.themeService.getProductIconThemes(), this.themeService.getProductIconTheme());
	}
}

function configurationEntries(extensionGalleryService: IExtensionGalleryService, laBel: string | undefined): QuickPickInput<ThemeItem>[] {
	if (extensionGalleryService.isEnaBled() && laBel !== undefined) {
		return [
			{
				type: 'separator'
			},
			{
				id: undefined,
				laBel: laBel,
				alwaysShow: true
			}
		];
	}
	return [];
}

function openExtensionViewlet(viewletService: IViewletService, query: string) {
	return viewletService.openViewlet(VIEWLET_ID, true).then(viewlet => {
		if (viewlet) {
			(viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer).search(query);
			viewlet.focus();
		}
	});
}
interface ThemeItem {
	id: string | undefined;
	laBel: string;
	description?: string;
	alwaysShow?: Boolean;
}

function isItem(i: QuickPickInput<ThemeItem>): i is ThemeItem {
	return (<any>i)['type'] !== 'separator';
}

function toEntries(themes: Array<IWorkBenchTheme>, laBel?: string): QuickPickInput<ThemeItem>[] {
	const toEntry = (theme: IWorkBenchTheme): ThemeItem => ({ id: theme.id, laBel: theme.laBel, description: theme.description });
	const sorter = (t1: ThemeItem, t2: ThemeItem) => t1.laBel.localeCompare(t2.laBel);
	let entries: QuickPickInput<ThemeItem>[] = themes.map(toEntry).sort(sorter);
	if (entries.length > 0 && laBel) {
		entries.unshift({ type: 'separator', laBel });
	}
	return entries;
}

class GenerateColorThemeAction extends Action {

	static readonly ID = 'workBench.action.generateColorTheme';
	static readonly LABEL = localize('generateColorTheme.laBel', "Generate Color Theme From Current Settings");

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchThemeService private readonly themeService: IWorkBenchThemeService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, laBel);
	}

	run(): Promise<any> {
		let theme = this.themeService.getColorTheme();
		let colors = Registry.as<IColorRegistry>(ColorRegistryExtensions.ColorContriBution).getColors();
		let colorIds = colors.map(c => c.id).sort();
		let resultingColors: { [key: string]: string } = {};
		let inherited: string[] = [];
		for (let colorId of colorIds) {
			const color = theme.getColor(colorId, false);
			if (color) {
				resultingColors[colorId] = Color.Format.CSS.formatHexA(color, true);
			} else {
				inherited.push(colorId);
			}
		}
		for (let id of inherited) {
			const color = theme.getColor(id);
			if (color) {
				resultingColors['__' + id] = Color.Format.CSS.formatHexA(color, true);
			}
		}
		let contents = JSON.stringify({
			'$schema': colorThemeSchemaId,
			type: theme.type,
			colors: resultingColors,
			tokenColors: theme.tokenColors.filter(t => !!t.scope)
		}, null, '\t');
		contents = contents.replace(/\"__/g, '//"');

		return this.editorService.openEditor({ contents, mode: 'jsonc' });
	}
}

const category = localize('preferences', "Preferences");

const colorThemeDescriptor = SyncActionDescriptor.from(SelectColorThemeAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_T) });
Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions).registerWorkBenchAction(colorThemeDescriptor, 'Preferences: Color Theme', category);

const fileIconThemeDescriptor = SyncActionDescriptor.from(SelectFileIconThemeAction);
Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions).registerWorkBenchAction(fileIconThemeDescriptor, 'Preferences: File Icon Theme', category);

const productIconThemeDescriptor = SyncActionDescriptor.from(SelectProductIconThemeAction);
Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions).registerWorkBenchAction(productIconThemeDescriptor, 'Preferences: Product Icon Theme', category);


const generateColorThemeDescriptor = SyncActionDescriptor.from(GenerateColorThemeAction);
Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions).registerWorkBenchAction(generateColorThemeDescriptor, 'Developer: Generate Color Theme From Current Settings', CATEGORIES.Developer.value);

MenuRegistry.appendMenuItem(MenuId.MenuBarPreferencesMenu, {
	group: '4_themes',
	command: {
		id: SelectColorThemeAction.ID,
		title: localize({ key: 'miSelectColorTheme', comment: ['&& denotes a mnemonic'] }, "&&Color Theme")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarPreferencesMenu, {
	group: '4_themes',
	command: {
		id: SelectFileIconThemeAction.ID,
		title: localize({ key: 'miSelectIconTheme', comment: ['&& denotes a mnemonic'] }, "File &&Icon Theme")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.GloBalActivity, {
	group: '4_themes',
	command: {
		id: SelectColorThemeAction.ID,
		title: localize('selectTheme.laBel', "Color Theme")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.GloBalActivity, {
	group: '4_themes',
	command: {
		id: SelectFileIconThemeAction.ID,
		title: localize('themes.selectIconTheme.laBel', "File Icon Theme")
	},
	order: 2
});
