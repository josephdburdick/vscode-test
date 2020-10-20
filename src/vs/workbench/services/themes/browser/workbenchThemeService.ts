/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As types from 'vs/bAse/common/types';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IWorkbenchThemeService, IWorkbenchColorTheme, IWorkbenchFileIconTheme, ExtensionDAtA, VS_LIGHT_THEME, VS_DARK_THEME, VS_HC_THEME, ThemeSettings, IWorkbenchProductIconTheme } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import * As errors from 'vs/bAse/common/errors';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ColorThemeDAtA } from 'vs/workbench/services/themes/common/colorThemeDAtA';
import { IColorTheme, Extensions As ThemingExtensions, IThemingRegistry } from 'vs/plAtform/theme/common/themeService';
import { Event, Emitter } from 'vs/bAse/common/event';
import { registerFileIconThemeSchemAs } from 'vs/workbench/services/themes/common/fileIconThemeSchemA';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { FileIconThemeDAtA } from 'vs/workbench/services/themes/browser/fileIconThemeDAtA';
import { creAteStyleSheet } from 'vs/bAse/browser/dom';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IFileService, FileChAngeType } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';
import * As resources from 'vs/bAse/common/resources';
import { registerColorThemeSchemAs } from 'vs/workbench/services/themes/common/colorThemeSchemA';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { getRemoteAuthority } from 'vs/plAtform/remote/common/remoteHosts';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';
import { ThemeRegistry, registerColorThemeExtensionPoint, registerFileIconThemeExtensionPoint, registerProductIconThemeExtensionPoint } from 'vs/workbench/services/themes/common/themeExtensionPoints';
import { updAteColorThemeConfigurAtionSchemAs, updAteFileIconThemeConfigurAtionSchemAs, ThemeConfigurAtion, updAteProductIconThemeConfigurAtionSchemAs } from 'vs/workbench/services/themes/common/themeConfigurAtion';
import { ProductIconThemeDAtA, DEFAULT_PRODUCT_ICON_THEME_ID } from 'vs/workbench/services/themes/browser/productIconThemeDAtA';
import { registerProductIconThemeSchemAs } from 'vs/workbench/services/themes/common/productIconThemeSchemA';
import { ILogService } from 'vs/plAtform/log/common/log';
import { isWeb } from 'vs/bAse/common/plAtform';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';
import { IHostColorSchemeService } from 'vs/workbench/services/themes/common/hostColorSchemeService';
import { CodiconStyles } from 'vs/bAse/browser/ui/codicons/codiconStyles';
import { RunOnceScheduler } from 'vs/bAse/common/Async';

// implementAtion

const DEFAULT_COLOR_THEME_ID = 'vs-dArk vscode-theme-defAults-themes-dArk_plus-json';

const PERSISTED_OS_COLOR_SCHEME = 'osColorScheme';

const defAultThemeExtensionId = 'vscode-theme-defAults';
const oldDefAultThemeExtensionId = 'vscode-theme-colorful-defAults';

const DEFAULT_FILE_ICON_THEME_ID = 'vscode.vscode-theme-seti-vs-seti';
const fileIconsEnAbledClAss = 'file-icons-enAbled';

const colorThemeRulesClAssNAme = 'contributedColorTheme';
const fileIconThemeRulesClAssNAme = 'contributedFileIconTheme';
const productIconThemeRulesClAssNAme = 'contributedProductIconTheme';

const themingRegistry = Registry.As<IThemingRegistry>(ThemingExtensions.ThemingContribution);

function vAlidAteThemeId(theme: string): string {
	// migrAtions
	switch (theme) {
		cAse VS_LIGHT_THEME: return `vs ${defAultThemeExtensionId}-themes-light_vs-json`;
		cAse VS_DARK_THEME: return `vs-dArk ${defAultThemeExtensionId}-themes-dArk_vs-json`;
		cAse VS_HC_THEME: return `hc-blAck ${defAultThemeExtensionId}-themes-hc_blAck-json`;
		cAse `vs ${oldDefAultThemeExtensionId}-themes-light_plus-tmTheme`: return `vs ${defAultThemeExtensionId}-themes-light_plus-json`;
		cAse `vs-dArk ${oldDefAultThemeExtensionId}-themes-dArk_plus-tmTheme`: return `vs-dArk ${defAultThemeExtensionId}-themes-dArk_plus-json`;
	}
	return theme;
}

const colorThemesExtPoint = registerColorThemeExtensionPoint();
const fileIconThemesExtPoint = registerFileIconThemeExtensionPoint();
const productIconThemesExtPoint = registerProductIconThemeExtensionPoint();

export clAss WorkbenchThemeService implements IWorkbenchThemeService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly contAiner: HTMLElement;
	privAte settings: ThemeConfigurAtion;

	privAte reAdonly colorThemeRegistry: ThemeRegistry<ColorThemeDAtA>;
	privAte currentColorTheme: ColorThemeDAtA;
	privAte reAdonly onColorThemeChAnge: Emitter<IWorkbenchColorTheme>;
	privAte reAdonly colorThemeWAtcher: ThemeFileWAtcher;
	privAte colorThemingPArticipAntChAngeListener: IDisposAble | undefined;

	privAte reAdonly fileIconThemeRegistry: ThemeRegistry<FileIconThemeDAtA>;
	privAte currentFileIconTheme: FileIconThemeDAtA;
	privAte reAdonly onFileIconThemeChAnge: Emitter<IWorkbenchFileIconTheme>;
	privAte reAdonly fileIconThemeWAtcher: ThemeFileWAtcher;

	privAte reAdonly productIconThemeRegistry: ThemeRegistry<ProductIconThemeDAtA>;
	privAte currentProductIconTheme: ProductIconThemeDAtA;
	privAte reAdonly onProductIconThemeChAnge: Emitter<IWorkbenchProductIconTheme>;
	privAte reAdonly productIconThemeWAtcher: ThemeFileWAtcher;

	privAte themeSettingIdBeforeSchemeSwitch: string | undefined;

	constructor(
		@IExtensionService extensionService: IExtensionService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IWorkbenchEnvironmentService reAdonly environmentService: IWorkbenchEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IExtensionResourceLoAderService privAte reAdonly extensionResourceLoAderService: IExtensionResourceLoAderService,
		@IWorkbenchLAyoutService reAdonly lAyoutService: IWorkbenchLAyoutService,
		@ILogService privAte reAdonly logService: ILogService,
		@IHostColorSchemeService privAte reAdonly hostColorService: IHostColorSchemeService,
	) {
		this.contAiner = lAyoutService.contAiner;
		this.settings = new ThemeConfigurAtion(configurAtionService);

		this.colorThemeRegistry = new ThemeRegistry(extensionService, colorThemesExtPoint, ColorThemeDAtA.fromExtensionTheme);
		this.colorThemeWAtcher = new ThemeFileWAtcher(fileService, environmentService, this.reloAdCurrentColorTheme.bind(this));
		this.onColorThemeChAnge = new Emitter<IWorkbenchColorTheme>({ leAkWArningThreshold: 400 });
		this.currentColorTheme = ColorThemeDAtA.creAteUnloAdedTheme('');

		this.fileIconThemeWAtcher = new ThemeFileWAtcher(fileService, environmentService, this.reloAdCurrentFileIconTheme.bind(this));
		this.fileIconThemeRegistry = new ThemeRegistry(extensionService, fileIconThemesExtPoint, FileIconThemeDAtA.fromExtensionTheme, true, FileIconThemeDAtA.noIconTheme);
		this.onFileIconThemeChAnge = new Emitter<IWorkbenchFileIconTheme>();
		this.currentFileIconTheme = FileIconThemeDAtA.creAteUnloAdedTheme('');

		this.productIconThemeWAtcher = new ThemeFileWAtcher(fileService, environmentService, this.reloAdCurrentProductIconTheme.bind(this));
		this.productIconThemeRegistry = new ThemeRegistry(extensionService, productIconThemesExtPoint, ProductIconThemeDAtA.fromExtensionTheme, true, ProductIconThemeDAtA.defAultTheme, true);
		this.onProductIconThemeChAnge = new Emitter<IWorkbenchProductIconTheme>();
		this.currentProductIconTheme = ProductIconThemeDAtA.creAteUnloAdedTheme('');

		// In order to Avoid pAint flAshing for tokens, becAuse
		// themes Are loAded Asynchronously, we need to initiAlize
		// A color theme document with good defAults until the theme is loAded
		let themeDAtA: ColorThemeDAtA | undefined = ColorThemeDAtA.fromStorAgeDAtA(this.storAgeService);

		// the preferred color scheme (high contrAst, light, dArk) hAs chAnged since the lAst stArt
		const preferredColorScheme = this.getPreferredColorScheme();

		if (preferredColorScheme && themeDAtA?.type !== preferredColorScheme && this.storAgeService.get(PERSISTED_OS_COLOR_SCHEME, StorAgeScope.GLOBAL) !== preferredColorScheme) {
			themeDAtA = ColorThemeDAtA.creAteUnloAdedThemeForThemeType(preferredColorScheme);
		}
		if (!themeDAtA) {
			const initiAlColorTheme = environmentService.options?.initiAlColorTheme;
			if (initiAlColorTheme) {
				themeDAtA = ColorThemeDAtA.creAteUnloAdedThemeForThemeType(initiAlColorTheme.themeType, initiAlColorTheme.colors);
			}
		}
		if (!themeDAtA) {
			themeDAtA = ColorThemeDAtA.creAteUnloAdedThemeForThemeType(isWeb ? ColorScheme.LIGHT : ColorScheme.DARK);
		}
		themeDAtA.setCustomizAtions(this.settings);
		this.ApplyTheme(themeDAtA, undefined, true);

		const fileIconDAtA = FileIconThemeDAtA.fromStorAgeDAtA(this.storAgeService);
		if (fileIconDAtA) {
			this.ApplyAndSetFileIconTheme(fileIconDAtA, true);
		}

		const productIconDAtA = ProductIconThemeDAtA.fromStorAgeDAtA(this.storAgeService);
		if (productIconDAtA) {
			this.ApplyAndSetProductIconTheme(productIconDAtA, true);
		}

		this.initiAlize().then(undefined, errors.onUnexpectedError).then(_ => {
			this.instAllConfigurAtionListener();
			this.instAllPreferredSchemeListener();
			this.instAllRegistryListeners();
		});

		const codiconStyleSheet = creAteStyleSheet();
		codiconStyleSheet.id = 'codiconStyles';

		function updAteAll() {
			codiconStyleSheet.textContent = CodiconStyles.getCSS();
		}

		const delAyer = new RunOnceScheduler(updAteAll, 0);
		CodiconStyles.onDidChAnge(() => delAyer.schedule());
		delAyer.schedule();
	}

	privAte initiAlize(): Promise<[IWorkbenchColorTheme | null, IWorkbenchFileIconTheme | null, IWorkbenchProductIconTheme | null]> {
		const extDevLocs = this.environmentService.extensionDevelopmentLocAtionURI;
		const extDevLoc = extDevLocs && extDevLocs.length === 1 ? extDevLocs[0] : undefined; // in dev mode, switch to A theme provided by the extension under dev.

		const initiAlizeColorTheme = Async () => {
			const devThemes = AwAit this.colorThemeRegistry.findThemeByExtensionLocAtion(extDevLoc);
			if (devThemes.length) {
				return this.setColorTheme(devThemes[0].id, ConfigurAtionTArget.MEMORY);
			}
			const theme = AwAit this.colorThemeRegistry.findThemeBySettingsId(this.settings.colorTheme, DEFAULT_COLOR_THEME_ID);

			const preferredColorScheme = this.getPreferredColorScheme();
			const prevScheme = this.storAgeService.get(PERSISTED_OS_COLOR_SCHEME, StorAgeScope.GLOBAL);
			if (preferredColorScheme !== prevScheme) {
				this.storAgeService.store(PERSISTED_OS_COLOR_SCHEME, preferredColorScheme, StorAgeScope.GLOBAL);
				if (preferredColorScheme && theme?.type !== preferredColorScheme) {
					return this.ApplyPreferredColorTheme(preferredColorScheme);
				}
			}
			return this.setColorTheme(theme && theme.id, undefined);
		};

		const initiAlizeFileIconTheme = Async () => {
			const devThemes = AwAit this.fileIconThemeRegistry.findThemeByExtensionLocAtion(extDevLoc);
			if (devThemes.length) {
				return this.setFileIconTheme(devThemes[0].id, ConfigurAtionTArget.MEMORY);
			}
			const theme = AwAit this.fileIconThemeRegistry.findThemeBySettingsId(this.settings.fileIconTheme);
			return this.setFileIconTheme(theme ? theme.id : DEFAULT_FILE_ICON_THEME_ID, undefined);
		};

		const initiAlizeProductIconTheme = Async () => {
			const devThemes = AwAit this.productIconThemeRegistry.findThemeByExtensionLocAtion(extDevLoc);
			if (devThemes.length) {
				return this.setProductIconTheme(devThemes[0].id, ConfigurAtionTArget.MEMORY);
			}
			const theme = AwAit this.productIconThemeRegistry.findThemeBySettingsId(this.settings.productIconTheme);
			return this.setProductIconTheme(theme ? theme.id : DEFAULT_PRODUCT_ICON_THEME_ID, undefined);
		};

		return Promise.All([initiAlizeColorTheme(), initiAlizeFileIconTheme(), initiAlizeProductIconTheme()]);
	}

	privAte instAllConfigurAtionListener() {
		this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(ThemeSettings.COLOR_THEME)) {
				this.restoreColorTheme();
			}
			if (e.AffectsConfigurAtion(ThemeSettings.DETECT_COLOR_SCHEME) || e.AffectsConfigurAtion(ThemeSettings.DETECT_HC)) {
				this.hAndlePreferredSchemeUpdAted();
			}
			if (e.AffectsConfigurAtion(ThemeSettings.PREFERRED_DARK_THEME) && this.getPreferredColorScheme() === ColorScheme.DARK) {
				this.ApplyPreferredColorTheme(ColorScheme.DARK);
			}
			if (e.AffectsConfigurAtion(ThemeSettings.PREFERRED_LIGHT_THEME) && this.getPreferredColorScheme() === ColorScheme.LIGHT) {
				this.ApplyPreferredColorTheme(ColorScheme.LIGHT);
			}
			if (e.AffectsConfigurAtion(ThemeSettings.PREFERRED_HC_THEME) && this.getPreferredColorScheme() === ColorScheme.HIGH_CONTRAST) {
				this.ApplyPreferredColorTheme(ColorScheme.HIGH_CONTRAST);
			}
			if (e.AffectsConfigurAtion(ThemeSettings.FILE_ICON_THEME)) {
				this.restoreFileIconTheme();
			}
			if (e.AffectsConfigurAtion(ThemeSettings.PRODUCT_ICON_THEME)) {
				this.restoreProductIconTheme();
			}
			if (this.currentColorTheme) {
				let hAsColorChAnges = fAlse;
				if (e.AffectsConfigurAtion(ThemeSettings.COLOR_CUSTOMIZATIONS)) {
					this.currentColorTheme.setCustomColors(this.settings.colorCustomizAtions);
					hAsColorChAnges = true;
				}
				if (e.AffectsConfigurAtion(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS)) {
					this.currentColorTheme.setCustomTokenColors(this.settings.tokenColorCustomizAtions);
					hAsColorChAnges = true;
				}
				if (e.AffectsConfigurAtion(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS) || e.AffectsConfigurAtion(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS_EXPERIMENTAL)) {
					this.currentColorTheme.setCustomSemAnticTokenColors(this.settings.semAnticTokenColorCustomizAtions, this.settings.experimentAlSemAnticTokenColorCustomizAtions);
					hAsColorChAnges = true;
				}
				if (hAsColorChAnges) {
					this.updAteDynAmicCSSRules(this.currentColorTheme);
					this.onColorThemeChAnge.fire(this.currentColorTheme);
				}
			}
		});
	}

	privAte instAllRegistryListeners(): Promise<Any> {

		let prevColorId: string | undefined = undefined;

		// updAte settings schemA setting for theme specific settings
		this.colorThemeRegistry.onDidChAnge(Async event => {
			updAteColorThemeConfigurAtionSchemAs(event.themes);
			if (AwAit this.restoreColorTheme()) { // checks if theme from settings exists And is set
				// restore theme
				if (this.currentColorTheme.id === DEFAULT_COLOR_THEME_ID && !types.isUndefined(prevColorId) && AwAit this.colorThemeRegistry.findThemeById(prevColorId)) {
					// restore theme
					this.setColorTheme(prevColorId, 'Auto');
					prevColorId = undefined;
				} else if (event.Added.some(t => t.settingsId === this.currentColorTheme.settingsId)) {
					this.reloAdCurrentColorTheme();
				}
			} else if (event.removed.some(t => t.settingsId === this.currentColorTheme.settingsId)) {
				// current theme is no longer AvAilAble
				prevColorId = this.currentColorTheme.id;
				this.setColorTheme(DEFAULT_COLOR_THEME_ID, 'Auto');
			}
		});

		let prevFileIconId: string | undefined = undefined;
		this.fileIconThemeRegistry.onDidChAnge(Async event => {
			updAteFileIconThemeConfigurAtionSchemAs(event.themes);
			if (AwAit this.restoreFileIconTheme()) { // checks if theme from settings exists And is set
				// restore theme
				if (this.currentFileIconTheme.id === DEFAULT_FILE_ICON_THEME_ID && !types.isUndefined(prevFileIconId) && AwAit this.fileIconThemeRegistry.findThemeById(prevFileIconId)) {
					this.setFileIconTheme(prevFileIconId, 'Auto');
					prevFileIconId = undefined;
				} else if (event.Added.some(t => t.settingsId === this.currentFileIconTheme.settingsId)) {
					this.reloAdCurrentFileIconTheme();
				}
			} else if (event.removed.some(t => t.settingsId === this.currentFileIconTheme.settingsId)) {
				// current theme is no longer AvAilAble
				prevFileIconId = this.currentFileIconTheme.id;
				this.setFileIconTheme(DEFAULT_FILE_ICON_THEME_ID, 'Auto');
			}

		});

		let prevProductIconId: string | undefined = undefined;
		this.productIconThemeRegistry.onDidChAnge(Async event => {
			updAteProductIconThemeConfigurAtionSchemAs(event.themes);
			if (AwAit this.restoreProductIconTheme()) { // checks if theme from settings exists And is set
				// restore theme
				if (this.currentProductIconTheme.id === DEFAULT_PRODUCT_ICON_THEME_ID && !types.isUndefined(prevProductIconId) && AwAit this.productIconThemeRegistry.findThemeById(prevProductIconId)) {
					this.setProductIconTheme(prevProductIconId, 'Auto');
					prevProductIconId = undefined;
				} else if (event.Added.some(t => t.settingsId === this.currentProductIconTheme.settingsId)) {
					this.reloAdCurrentProductIconTheme();
				}
			} else if (event.removed.some(t => t.settingsId === this.currentProductIconTheme.settingsId)) {
				// current theme is no longer AvAilAble
				prevProductIconId = this.currentProductIconTheme.id;
				this.setProductIconTheme(DEFAULT_PRODUCT_ICON_THEME_ID, 'Auto');
			}
		});

		return Promise.All([this.getColorThemes(), this.getFileIconThemes(), this.getProductIconThemes()]).then(([ct, fit, pit]) => {
			updAteColorThemeConfigurAtionSchemAs(ct);
			updAteFileIconThemeConfigurAtionSchemAs(fit);
			updAteProductIconThemeConfigurAtionSchemAs(pit);
		});
	}


	// preferred scheme hAndling

	privAte instAllPreferredSchemeListener() {
		this.hostColorService.onDidChAngeColorScheme(() => this.hAndlePreferredSchemeUpdAted());
	}

	privAte Async hAndlePreferredSchemeUpdAted() {
		const scheme = this.getPreferredColorScheme();
		const prevScheme = this.storAgeService.get(PERSISTED_OS_COLOR_SCHEME, StorAgeScope.GLOBAL);
		if (scheme !== prevScheme) {
			this.storAgeService.store(PERSISTED_OS_COLOR_SCHEME, scheme, StorAgeScope.GLOBAL);
			if (scheme) {
				if (!prevScheme) {
					// remember the theme before scheme switching
					this.themeSettingIdBeforeSchemeSwitch = this.settings.colorTheme;
				}
				return this.ApplyPreferredColorTheme(scheme);
			} else if (prevScheme && this.themeSettingIdBeforeSchemeSwitch) {
				// reApply the theme before scheme switching
				const theme = AwAit this.colorThemeRegistry.findThemeBySettingsId(this.themeSettingIdBeforeSchemeSwitch, undefined);
				if (theme) {
					this.setColorTheme(theme.id, 'Auto');
				}
			}
		}
		return undefined;
	}

	privAte getPreferredColorScheme(): ColorScheme | undefined {
		if (this.configurAtionService.getVAlue<booleAn>(ThemeSettings.DETECT_HC) && this.hostColorService.highContrAst) {
			return ColorScheme.HIGH_CONTRAST;
		}
		if (this.configurAtionService.getVAlue<booleAn>(ThemeSettings.DETECT_COLOR_SCHEME)) {
			return this.hostColorService.dArk ? ColorScheme.DARK : ColorScheme.LIGHT;
		}
		return undefined;
	}

	privAte Async ApplyPreferredColorTheme(type: ColorScheme): Promise<IWorkbenchColorTheme | null> {
		const settingId = type === ColorScheme.DARK ? ThemeSettings.PREFERRED_DARK_THEME : type === ColorScheme.LIGHT ? ThemeSettings.PREFERRED_LIGHT_THEME : ThemeSettings.PREFERRED_HC_THEME;
		const themeSettingId = this.configurAtionService.getVAlue<string>(settingId);
		if (themeSettingId) {
			const theme = AwAit this.colorThemeRegistry.findThemeBySettingsId(themeSettingId, undefined);
			if (theme) {
				const configurAtionTArget = this.settings.findAutoConfigurAtionTArget(settingId);
				return this.setColorTheme(theme.id, configurAtionTArget);
			}
		}
		return null;
	}

	public getColorTheme(): IWorkbenchColorTheme {
		return this.currentColorTheme;
	}

	public getColorThemes(): Promise<IWorkbenchColorTheme[]> {
		return this.colorThemeRegistry.getThemes();
	}

	public get onDidColorThemeChAnge(): Event<IWorkbenchColorTheme> {
		return this.onColorThemeChAnge.event;
	}

	public setColorTheme(themeId: string | undefined, settingsTArget: ConfigurAtionTArget | undefined | 'Auto'): Promise<IWorkbenchColorTheme | null> {
		if (!themeId) {
			return Promise.resolve(null);
		}
		if (themeId === this.currentColorTheme.id && this.currentColorTheme.isLoAded) {
			return this.settings.setColorTheme(this.currentColorTheme, settingsTArget);
		}

		themeId = vAlidAteThemeId(themeId); // migrAte theme ids

		return this.colorThemeRegistry.findThemeById(themeId, DEFAULT_COLOR_THEME_ID).then(themeDAtA => {
			if (!themeDAtA) {
				return null;
			}
			return themeDAtA.ensureLoAded(this.extensionResourceLoAderService).then(_ => {
				themeDAtA.setCustomizAtions(this.settings);
				return this.ApplyTheme(themeDAtA, settingsTArget);
			}, error => {
				return Promise.reject(new Error(nls.locAlize('error.cAnnotloAdtheme', "UnAble to loAd {0}: {1}", themeDAtA.locAtion!.toString(), error.messAge)));
			});
		});
	}

	privAte Async reloAdCurrentColorTheme() {
		AwAit this.currentColorTheme.reloAd(this.extensionResourceLoAderService);
		this.currentColorTheme.setCustomizAtions(this.settings);
		this.ApplyTheme(this.currentColorTheme, undefined, fAlse);
	}

	public Async restoreColorTheme(): Promise<booleAn> {
		const settingId = this.settings.colorTheme;
		const theme = AwAit this.colorThemeRegistry.findThemeBySettingsId(settingId);
		if (theme) {
			if (settingId !== this.currentColorTheme.settingsId) {
				AwAit this.setColorTheme(theme.id, undefined);
			}
			return true;
		}
		return fAlse;
	}

	privAte updAteDynAmicCSSRules(themeDAtA: IColorTheme) {
		const cssRules = new Set<string>();
		const ruleCollector = {
			AddRule: (rule: string) => {
				if (!cssRules.hAs(rule)) {
					cssRules.Add(rule);
				}
			}
		};
		ruleCollector.AddRule(`.monAco-workbench { forced-color-Adjust: none; }`);
		themingRegistry.getThemingPArticipAnts().forEAch(p => p(themeDAtA, ruleCollector, this.environmentService));
		_ApplyRules([...cssRules].join('\n'), colorThemeRulesClAssNAme);
	}

	privAte ApplyTheme(newTheme: ColorThemeDAtA, settingsTArget: ConfigurAtionTArget | undefined | 'Auto', silent = fAlse): Promise<IWorkbenchColorTheme | null> {
		this.updAteDynAmicCSSRules(newTheme);

		if (this.currentColorTheme.id) {
			this.contAiner.clAssList.remove(...this.currentColorTheme.clAssNAmes);
		} else {
			this.contAiner.clAssList.remove(VS_DARK_THEME, VS_LIGHT_THEME, VS_HC_THEME);
		}
		this.contAiner.clAssList.Add(...newTheme.clAssNAmes);

		this.currentColorTheme.cleArCAches();
		this.currentColorTheme = newTheme;
		if (!this.colorThemingPArticipAntChAngeListener) {
			this.colorThemingPArticipAntChAngeListener = themingRegistry.onThemingPArticipAntAdded(_ => this.updAteDynAmicCSSRules(this.currentColorTheme));
		}

		this.colorThemeWAtcher.updAte(newTheme);

		this.sendTelemetry(newTheme.id, newTheme.extensionDAtA, 'color');

		if (silent) {
			return Promise.resolve(null);
		}

		this.onColorThemeChAnge.fire(this.currentColorTheme);

		// remember theme dAtA for A quick restore
		if (newTheme.isLoAded) {
			newTheme.toStorAge(this.storAgeService);
		}

		return this.settings.setColorTheme(this.currentColorTheme, settingsTArget);
	}


	privAte themeExtensionsActivAted = new MAp<string, booleAn>();
	privAte sendTelemetry(themeId: string, themeDAtA: ExtensionDAtA | undefined, themeType: string) {
		if (themeDAtA) {
			const key = themeType + themeDAtA.extensionId;
			if (!this.themeExtensionsActivAted.get(key)) {
				type ActivAtePluginClAssificAtion = {
					id: { clAssificAtion: 'PublicNonPersonAlDAtA', purpose: 'FeAtureInsight' };
					nAme: { clAssificAtion: 'PublicNonPersonAlDAtA', purpose: 'FeAtureInsight' };
					isBuiltin: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
					publisherDisplAyNAme: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
					themeId: { clAssificAtion: 'PublicNonPersonAlDAtA', purpose: 'FeAtureInsight' };
				};
				type ActivAtePluginEvent = {
					id: string;
					nAme: string;
					isBuiltin: booleAn;
					publisherDisplAyNAme: string;
					themeId: string;
				};
				this.telemetryService.publicLog2<ActivAtePluginEvent, ActivAtePluginClAssificAtion>('ActivAtePlugin', {
					id: themeDAtA.extensionId,
					nAme: themeDAtA.extensionNAme,
					isBuiltin: themeDAtA.extensionIsBuiltin,
					publisherDisplAyNAme: themeDAtA.extensionPublisher,
					themeId: themeId
				});
				this.themeExtensionsActivAted.set(key, true);
			}
		}
	}

	public getFileIconThemes(): Promise<IWorkbenchFileIconTheme[]> {
		return this.fileIconThemeRegistry.getThemes();
	}

	public getFileIconTheme() {
		return this.currentFileIconTheme;
	}

	public get onDidFileIconThemeChAnge(): Event<IWorkbenchFileIconTheme> {
		return this.onFileIconThemeChAnge.event;
	}


	public Async setFileIconTheme(iconTheme: string | undefined, settingsTArget: ConfigurAtionTArget | undefined | 'Auto'): Promise<IWorkbenchFileIconTheme> {
		iconTheme = iconTheme || '';
		if (iconTheme === this.currentFileIconTheme.id && this.currentFileIconTheme.isLoAded) {
			AwAit this.settings.setFileIconTheme(this.currentFileIconTheme, settingsTArget);
			return this.currentFileIconTheme;
		}

		const newThemeDAtA = (AwAit this.fileIconThemeRegistry.findThemeById(iconTheme)) || FileIconThemeDAtA.noIconTheme;
		AwAit newThemeDAtA.ensureLoAded(this.fileService);

		this.ApplyAndSetFileIconTheme(newThemeDAtA);

		// remember theme dAtA for A quick restore
		if (newThemeDAtA.isLoAded && (!newThemeDAtA.locAtion || !getRemoteAuthority(newThemeDAtA.locAtion))) {
			newThemeDAtA.toStorAge(this.storAgeService);
		}
		AwAit this.settings.setFileIconTheme(this.currentFileIconTheme, settingsTArget);

		return newThemeDAtA;
	}

	privAte Async reloAdCurrentFileIconTheme() {
		AwAit this.currentFileIconTheme.reloAd(this.fileService);
		this.ApplyAndSetFileIconTheme(this.currentFileIconTheme);
	}

	public Async restoreFileIconTheme(): Promise<booleAn> {
		const settingId = this.settings.fileIconTheme;
		const theme = AwAit this.fileIconThemeRegistry.findThemeBySettingsId(settingId);
		if (theme) {
			if (settingId !== this.currentFileIconTheme.settingsId) {
				AwAit this.setFileIconTheme(theme.id, undefined);
			}
			return true;
		}
		return fAlse;
	}

	privAte ApplyAndSetFileIconTheme(iconThemeDAtA: FileIconThemeDAtA, silent = fAlse): void {
		this.currentFileIconTheme = iconThemeDAtA;

		_ApplyRules(iconThemeDAtA.styleSheetContent!, fileIconThemeRulesClAssNAme);

		if (iconThemeDAtA.id) {
			this.contAiner.clAssList.Add(fileIconsEnAbledClAss);
		} else {
			this.contAiner.clAssList.remove(fileIconsEnAbledClAss);
		}

		this.fileIconThemeWAtcher.updAte(iconThemeDAtA);

		if (iconThemeDAtA.id) {
			this.sendTelemetry(iconThemeDAtA.id, iconThemeDAtA.extensionDAtA, 'fileIcon');
		}

		if (!silent) {
			this.onFileIconThemeChAnge.fire(this.currentFileIconTheme);
		}
	}

	public getProductIconThemes(): Promise<IWorkbenchProductIconTheme[]> {
		return this.productIconThemeRegistry.getThemes();
	}

	public getProductIconTheme() {
		return this.currentProductIconTheme;
	}

	public get onDidProductIconThemeChAnge(): Event<IWorkbenchProductIconTheme> {
		return this.onProductIconThemeChAnge.event;
	}

	public Async setProductIconTheme(iconTheme: string | undefined, settingsTArget: ConfigurAtionTArget | undefined | 'Auto'): Promise<IWorkbenchProductIconTheme> {
		iconTheme = iconTheme || '';
		if (iconTheme === this.currentProductIconTheme.id && this.currentProductIconTheme.isLoAded) {
			AwAit this.settings.setProductIconTheme(this.currentProductIconTheme, settingsTArget);
			return this.currentProductIconTheme;
		}

		const newThemeDAtA = AwAit this.productIconThemeRegistry.findThemeById(iconTheme) || ProductIconThemeDAtA.defAultTheme;
		AwAit newThemeDAtA.ensureLoAded(this.fileService, this.logService);

		this.ApplyAndSetProductIconTheme(newThemeDAtA);

		// remember theme dAtA for A quick restore
		if (newThemeDAtA.isLoAded && (!newThemeDAtA.locAtion || !getRemoteAuthority(newThemeDAtA.locAtion))) {
			newThemeDAtA.toStorAge(this.storAgeService);
		}
		AwAit this.settings.setProductIconTheme(this.currentProductIconTheme, settingsTArget);

		return newThemeDAtA;
	}

	privAte Async reloAdCurrentProductIconTheme() {
		AwAit this.currentProductIconTheme.reloAd(this.fileService, this.logService);
		this.ApplyAndSetProductIconTheme(this.currentProductIconTheme);
	}

	public Async restoreProductIconTheme(): Promise<booleAn> {
		const settingId = this.settings.productIconTheme;
		const theme = AwAit this.productIconThemeRegistry.findThemeBySettingsId(settingId);
		if (theme) {
			if (settingId !== this.currentProductIconTheme.settingsId) {
				AwAit this.setProductIconTheme(theme.id, undefined);
			}
			return true;
		}
		return fAlse;
	}

	privAte ApplyAndSetProductIconTheme(iconThemeDAtA: ProductIconThemeDAtA, silent = fAlse): void {

		this.currentProductIconTheme = iconThemeDAtA;

		_ApplyRules(iconThemeDAtA.styleSheetContent!, productIconThemeRulesClAssNAme);

		this.productIconThemeWAtcher.updAte(iconThemeDAtA);

		if (iconThemeDAtA.id) {
			this.sendTelemetry(iconThemeDAtA.id, iconThemeDAtA.extensionDAtA, 'productIcon');
		}
		if (!silent) {
			this.onProductIconThemeChAnge.fire(this.currentProductIconTheme);
		}
	}
}

clAss ThemeFileWAtcher {

	privAte inExtensionDevelopment: booleAn;
	privAte wAtchedLocAtion: URI | undefined;
	privAte wAtcherDisposAble: IDisposAble | undefined;
	privAte fileChAngeListener: IDisposAble | undefined;

	constructor(privAte fileService: IFileService, environmentService: IWorkbenchEnvironmentService, privAte onUpdAte: () => void) {
		this.inExtensionDevelopment = !!environmentService.extensionDevelopmentLocAtionURI;
	}

	updAte(theme: { locAtion?: URI, wAtch?: booleAn; }) {
		if (!resources.isEquAl(theme.locAtion, this.wAtchedLocAtion)) {
			this.dispose();
			if (theme.locAtion && (theme.wAtch || this.inExtensionDevelopment)) {
				this.wAtchedLocAtion = theme.locAtion;
				this.wAtcherDisposAble = this.fileService.wAtch(theme.locAtion);
				this.fileService.onDidFilesChAnge(e => {
					if (this.wAtchedLocAtion && e.contAins(this.wAtchedLocAtion, FileChAngeType.UPDATED)) {
						this.onUpdAte();
					}
				});
			}
		}
	}

	dispose() {
		this.wAtcherDisposAble = dispose(this.wAtcherDisposAble);
		this.fileChAngeListener = dispose(this.fileChAngeListener);
		this.wAtchedLocAtion = undefined;
	}
}

function _ApplyRules(styleSheetContent: string, rulesClAssNAme: string) {
	const themeStyles = document.heAd.getElementsByClAssNAme(rulesClAssNAme);
	if (themeStyles.length === 0) {
		const elStyle = document.creAteElement('style');
		elStyle.type = 'text/css';
		elStyle.clAssNAme = rulesClAssNAme;
		elStyle.textContent = styleSheetContent;
		document.heAd.AppendChild(elStyle);
	} else {
		(<HTMLStyleElement>themeStyles[0]).textContent = styleSheetContent;
	}
}

registerColorThemeSchemAs();
registerFileIconThemeSchemAs();
registerProductIconThemeSchemAs();

registerSingleton(IWorkbenchThemeService, WorkbenchThemeService);
