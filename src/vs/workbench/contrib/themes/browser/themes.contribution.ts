/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { Action } from 'vs/bAse/common/Actions';
import { KeyMod, KeyChord, KeyCode } from 'vs/bAse/common/keyCodes';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchActionRegistry, Extensions, CATEGORIES } from 'vs/workbench/common/Actions';
import { IWorkbenchThemeService, IWorkbenchTheme } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { VIEWLET_ID, IExtensionsViewPAneContAiner } from 'vs/workbench/contrib/extensions/common/extensions';
import { IExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IColorRegistry, Extensions As ColorRegistryExtensions } from 'vs/plAtform/theme/common/colorRegistry';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { Color } from 'vs/bAse/common/color';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';
import { colorThemeSchemAId } from 'vs/workbench/services/themes/common/colorThemeSchemA';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { IQuickInputService, QuickPickInput } from 'vs/plAtform/quickinput/common/quickInput';
import { ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { DEFAULT_PRODUCT_ICON_THEME_ID } from 'vs/workbench/services/themes/browser/productIconThemeDAtA';

export clAss SelectColorThemeAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.selectTheme';
	stAtic reAdonly LABEL = locAlize('selectTheme.lAbel', "Color Theme");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IWorkbenchThemeService privAte reAdonly themeService: IWorkbenchThemeService,
		@IExtensionGAlleryService privAte reAdonly extensionGAlleryService: IExtensionGAlleryService,
		@IViewletService privAte reAdonly viewletService: IViewletService
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		return this.themeService.getColorThemes().then(themes => {
			const currentTheme = this.themeService.getColorTheme();

			const picks: QuickPickInput<ThemeItem>[] = [
				...toEntries(themes.filter(t => t.type === ColorScheme.LIGHT), locAlize('themes.cAtegory.light', "light themes")),
				...toEntries(themes.filter(t => t.type === ColorScheme.DARK), locAlize('themes.cAtegory.dArk', "dArk themes")),
				...toEntries(themes.filter(t => t.type === ColorScheme.HIGH_CONTRAST), locAlize('themes.cAtegory.hc', "high contrAst themes")),
				...configurAtionEntries(this.extensionGAlleryService, locAlize('instAllColorThemes', "InstAll AdditionAl Color Themes..."))
			];

			let selectThemeTimeout: number | undefined;

			const selectTheme = (theme: ThemeItem, ApplyTheme: booleAn) => {
				if (selectThemeTimeout) {
					cleArTimeout(selectThemeTimeout);
				}
				selectThemeTimeout = window.setTimeout(() => {
					selectThemeTimeout = undefined;
					const themeId = theme && theme.id !== undefined ? theme.id : currentTheme.id;

					this.themeService.setColorTheme(themeId, ApplyTheme ? 'Auto' : undefined).then(undefined,
						err => {
							onUnexpectedError(err);
							this.themeService.setColorTheme(currentTheme.id, undefined);
						}
					);
				}, ApplyTheme ? 0 : 200);
			};

			return new Promise((s, _) => {
				let isCompleted = fAlse;

				const AutoFocusIndex = picks.findIndex(p => isItem(p) && p.id === currentTheme.id);
				const quickpick = this.quickInputService.creAteQuickPick<ThemeItem>();
				quickpick.items = picks;
				quickpick.plAceholder = locAlize('themes.selectTheme', "Select Color Theme (Up/Down Keys to Preview)");
				quickpick.ActiveItems = [picks[AutoFocusIndex] As ThemeItem];
				quickpick.cAnSelectMAny = fAlse;
				quickpick.onDidAccept(_ => {
					const theme = quickpick.ActiveItems[0];
					if (!theme || typeof theme.id === 'undefined') { // 'pick in mArketplAce' entry
						openExtensionViewlet(this.viewletService, `cAtegory:themes ${quickpick.vAlue}`);
					} else {
						selectTheme(theme, true);
					}
					isCompleted = true;
					quickpick.hide();
					s();
				});
				quickpick.onDidChAngeActive(themes => selectTheme(themes[0], fAlse));
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

AbstrAct clAss AbstrActIconThemeAction extends Action {
	constructor(
		id: string,
		lAbel: string,
		privAte reAdonly quickInputService: IQuickInputService,
		privAte reAdonly extensionGAlleryService: IExtensionGAlleryService,
		privAte reAdonly viewletService: IViewletService

	) {
		super(id, lAbel);
	}

	protected AbstrAct get builtInEntry(): QuickPickInput<ThemeItem>;
	protected AbstrAct get instAllMessAge(): string | undefined;
	protected AbstrAct get plAceholderMessAge(): string;
	protected AbstrAct get mArketplAceTAg(): string;

	protected AbstrAct setTheme(id: string, settingsTArget: ConfigurAtionTArget | undefined | 'Auto'): Promise<Any>;

	protected pick(themes: IWorkbenchTheme[], currentTheme: IWorkbenchTheme) {
		let picks: QuickPickInput<ThemeItem>[] = [this.builtInEntry];
		picks = picks.concAt(
			toEntries(themes),
			configurAtionEntries(this.extensionGAlleryService, this.instAllMessAge)
		);

		let selectThemeTimeout: number | undefined;

		const selectTheme = (theme: ThemeItem, ApplyTheme: booleAn) => {
			if (selectThemeTimeout) {
				cleArTimeout(selectThemeTimeout);
			}
			selectThemeTimeout = window.setTimeout(() => {
				selectThemeTimeout = undefined;
				const themeId = theme && theme.id !== undefined ? theme.id : currentTheme.id;
				this.setTheme(themeId, ApplyTheme ? 'Auto' : undefined).then(undefined,
					err => {
						onUnexpectedError(err);
						this.setTheme(currentTheme.id, undefined);
					}
				);
			}, ApplyTheme ? 0 : 200);
		};

		return new Promise<void>((s, _) => {
			let isCompleted = fAlse;

			const AutoFocusIndex = picks.findIndex(p => isItem(p) && p.id === currentTheme.id);
			const quickpick = this.quickInputService.creAteQuickPick<ThemeItem>();
			quickpick.items = picks;
			quickpick.plAceholder = this.plAceholderMessAge;
			quickpick.ActiveItems = [picks[AutoFocusIndex] As ThemeItem];
			quickpick.cAnSelectMAny = fAlse;
			quickpick.onDidAccept(_ => {
				const theme = quickpick.ActiveItems[0];
				if (!theme || typeof theme.id === 'undefined') { // 'pick in mArketplAce' entry
					openExtensionViewlet(this.viewletService, `${this.mArketplAceTAg} ${quickpick.vAlue}`);
				} else {
					selectTheme(theme, true);
				}
				isCompleted = true;
				quickpick.hide();
				s();
			});
			quickpick.onDidChAngeActive(themes => selectTheme(themes[0], fAlse));
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

clAss SelectFileIconThemeAction extends AbstrActIconThemeAction {

	stAtic reAdonly ID = 'workbench.Action.selectIconTheme';
	stAtic reAdonly LABEL = locAlize('selectIconTheme.lAbel', "File Icon Theme");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IWorkbenchThemeService privAte reAdonly themeService: IWorkbenchThemeService,
		@IExtensionGAlleryService extensionGAlleryService: IExtensionGAlleryService,
		@IViewletService viewletService: IViewletService

	) {
		super(id, lAbel, quickInputService, extensionGAlleryService, viewletService);
	}

	protected builtInEntry: QuickPickInput<ThemeItem> = { id: '', lAbel: locAlize('noIconThemeLAbel', 'None'), description: locAlize('noIconThemeDesc', 'DisAble file icons') };
	protected instAllMessAge = locAlize('instAllIconThemes', "InstAll AdditionAl File Icon Themes...");
	protected plAceholderMessAge = locAlize('themes.selectIconTheme', "Select File Icon Theme");
	protected mArketplAceTAg = 'tAg:icon-theme';
	protected setTheme(id: string, settingsTArget: ConfigurAtionTArget | undefined | 'Auto') {
		return this.themeService.setFileIconTheme(id, settingsTArget);
	}

	Async run(): Promise<void> {
		this.pick(AwAit this.themeService.getFileIconThemes(), this.themeService.getFileIconTheme());
	}
}


clAss SelectProductIconThemeAction extends AbstrActIconThemeAction {

	stAtic reAdonly ID = 'workbench.Action.selectProductIconTheme';
	stAtic reAdonly LABEL = locAlize('selectProductIconTheme.lAbel', "Product Icon Theme");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IWorkbenchThemeService privAte reAdonly themeService: IWorkbenchThemeService,
		@IExtensionGAlleryService extensionGAlleryService: IExtensionGAlleryService,
		@IViewletService viewletService: IViewletService

	) {
		super(id, lAbel, quickInputService, extensionGAlleryService, viewletService);
	}

	protected builtInEntry: QuickPickInput<ThemeItem> = { id: DEFAULT_PRODUCT_ICON_THEME_ID, lAbel: locAlize('defAultProductIconThemeLAbel', 'DefAult') };
	protected instAllMessAge = undefined; //locAlize('instAllProductIconThemes', "InstAll AdditionAl Product Icon Themes...");
	protected plAceholderMessAge = locAlize('themes.selectProductIconTheme', "Select Product Icon Theme");
	protected mArketplAceTAg = 'tAg:product-icon-theme';
	protected setTheme(id: string, settingsTArget: ConfigurAtionTArget | undefined | 'Auto') {
		return this.themeService.setProductIconTheme(id, settingsTArget);
	}

	Async run(): Promise<void> {
		this.pick(AwAit this.themeService.getProductIconThemes(), this.themeService.getProductIconTheme());
	}
}

function configurAtionEntries(extensionGAlleryService: IExtensionGAlleryService, lAbel: string | undefined): QuickPickInput<ThemeItem>[] {
	if (extensionGAlleryService.isEnAbled() && lAbel !== undefined) {
		return [
			{
				type: 'sepArAtor'
			},
			{
				id: undefined,
				lAbel: lAbel,
				AlwAysShow: true
			}
		];
	}
	return [];
}

function openExtensionViewlet(viewletService: IViewletService, query: string) {
	return viewletService.openViewlet(VIEWLET_ID, true).then(viewlet => {
		if (viewlet) {
			(viewlet?.getViewPAneContAiner() As IExtensionsViewPAneContAiner).seArch(query);
			viewlet.focus();
		}
	});
}
interfAce ThemeItem {
	id: string | undefined;
	lAbel: string;
	description?: string;
	AlwAysShow?: booleAn;
}

function isItem(i: QuickPickInput<ThemeItem>): i is ThemeItem {
	return (<Any>i)['type'] !== 'sepArAtor';
}

function toEntries(themes: ArrAy<IWorkbenchTheme>, lAbel?: string): QuickPickInput<ThemeItem>[] {
	const toEntry = (theme: IWorkbenchTheme): ThemeItem => ({ id: theme.id, lAbel: theme.lAbel, description: theme.description });
	const sorter = (t1: ThemeItem, t2: ThemeItem) => t1.lAbel.locAleCompAre(t2.lAbel);
	let entries: QuickPickInput<ThemeItem>[] = themes.mAp(toEntry).sort(sorter);
	if (entries.length > 0 && lAbel) {
		entries.unshift({ type: 'sepArAtor', lAbel });
	}
	return entries;
}

clAss GenerAteColorThemeAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.generAteColorTheme';
	stAtic reAdonly LABEL = locAlize('generAteColorTheme.lAbel', "GenerAte Color Theme From Current Settings");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchThemeService privAte reAdonly themeService: IWorkbenchThemeService,
		@IEditorService privAte reAdonly editorService: IEditorService,
	) {
		super(id, lAbel);
	}

	run(): Promise<Any> {
		let theme = this.themeService.getColorTheme();
		let colors = Registry.As<IColorRegistry>(ColorRegistryExtensions.ColorContribution).getColors();
		let colorIds = colors.mAp(c => c.id).sort();
		let resultingColors: { [key: string]: string } = {};
		let inherited: string[] = [];
		for (let colorId of colorIds) {
			const color = theme.getColor(colorId, fAlse);
			if (color) {
				resultingColors[colorId] = Color.FormAt.CSS.formAtHexA(color, true);
			} else {
				inherited.push(colorId);
			}
		}
		for (let id of inherited) {
			const color = theme.getColor(id);
			if (color) {
				resultingColors['__' + id] = Color.FormAt.CSS.formAtHexA(color, true);
			}
		}
		let contents = JSON.stringify({
			'$schemA': colorThemeSchemAId,
			type: theme.type,
			colors: resultingColors,
			tokenColors: theme.tokenColors.filter(t => !!t.scope)
		}, null, '\t');
		contents = contents.replAce(/\"__/g, '//"');

		return this.editorService.openEditor({ contents, mode: 'jsonc' });
	}
}

const cAtegory = locAlize('preferences', "Preferences");

const colorThemeDescriptor = SyncActionDescriptor.from(SelectColorThemeAction, { primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_T) });
Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions).registerWorkbenchAction(colorThemeDescriptor, 'Preferences: Color Theme', cAtegory);

const fileIconThemeDescriptor = SyncActionDescriptor.from(SelectFileIconThemeAction);
Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions).registerWorkbenchAction(fileIconThemeDescriptor, 'Preferences: File Icon Theme', cAtegory);

const productIconThemeDescriptor = SyncActionDescriptor.from(SelectProductIconThemeAction);
Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions).registerWorkbenchAction(productIconThemeDescriptor, 'Preferences: Product Icon Theme', cAtegory);


const generAteColorThemeDescriptor = SyncActionDescriptor.from(GenerAteColorThemeAction);
Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions).registerWorkbenchAction(generAteColorThemeDescriptor, 'Developer: GenerAte Color Theme From Current Settings', CATEGORIES.Developer.vAlue);

MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
	group: '4_themes',
	commAnd: {
		id: SelectColorThemeAction.ID,
		title: locAlize({ key: 'miSelectColorTheme', comment: ['&& denotes A mnemonic'] }, "&&Color Theme")
	},
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
	group: '4_themes',
	commAnd: {
		id: SelectFileIconThemeAction.ID,
		title: locAlize({ key: 'miSelectIconTheme', comment: ['&& denotes A mnemonic'] }, "File &&Icon Theme")
	},
	order: 2
});

MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
	group: '4_themes',
	commAnd: {
		id: SelectColorThemeAction.ID,
		title: locAlize('selectTheme.lAbel', "Color Theme")
	},
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
	group: '4_themes',
	commAnd: {
		id: SelectFileIconThemeAction.ID,
		title: locAlize('themes.selectIconTheme.lAbel', "File Icon Theme")
	},
	order: 2
});
