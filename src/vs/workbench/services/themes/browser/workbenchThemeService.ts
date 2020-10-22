/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as types from 'vs/Base/common/types';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkBenchThemeService, IWorkBenchColorTheme, IWorkBenchFileIconTheme, ExtensionData, VS_LIGHT_THEME, VS_DARK_THEME, VS_HC_THEME, ThemeSettings, IWorkBenchProductIconTheme } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { Registry } from 'vs/platform/registry/common/platform';
import * as errors from 'vs/Base/common/errors';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { ColorThemeData } from 'vs/workBench/services/themes/common/colorThemeData';
import { IColorTheme, Extensions as ThemingExtensions, IThemingRegistry } from 'vs/platform/theme/common/themeService';
import { Event, Emitter } from 'vs/Base/common/event';
import { registerFileIconThemeSchemas } from 'vs/workBench/services/themes/common/fileIconThemeSchema';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { FileIconThemeData } from 'vs/workBench/services/themes/Browser/fileIconThemeData';
import { createStyleSheet } from 'vs/Base/Browser/dom';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IFileService, FileChangeType } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';
import * as resources from 'vs/Base/common/resources';
import { registerColorThemeSchemas } from 'vs/workBench/services/themes/common/colorThemeSchema';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { getRemoteAuthority } from 'vs/platform/remote/common/remoteHosts';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IExtensionResourceLoaderService } from 'vs/workBench/services/extensionResourceLoader/common/extensionResourceLoader';
import { ThemeRegistry, registerColorThemeExtensionPoint, registerFileIconThemeExtensionPoint, registerProductIconThemeExtensionPoint } from 'vs/workBench/services/themes/common/themeExtensionPoints';
import { updateColorThemeConfigurationSchemas, updateFileIconThemeConfigurationSchemas, ThemeConfiguration, updateProductIconThemeConfigurationSchemas } from 'vs/workBench/services/themes/common/themeConfiguration';
import { ProductIconThemeData, DEFAULT_PRODUCT_ICON_THEME_ID } from 'vs/workBench/services/themes/Browser/productIconThemeData';
import { registerProductIconThemeSchemas } from 'vs/workBench/services/themes/common/productIconThemeSchema';
import { ILogService } from 'vs/platform/log/common/log';
import { isWeB } from 'vs/Base/common/platform';
import { ColorScheme } from 'vs/platform/theme/common/theme';
import { IHostColorSchemeService } from 'vs/workBench/services/themes/common/hostColorSchemeService';
import { CodiconStyles } from 'vs/Base/Browser/ui/codicons/codiconStyles';
import { RunOnceScheduler } from 'vs/Base/common/async';

// implementation

const DEFAULT_COLOR_THEME_ID = 'vs-dark vscode-theme-defaults-themes-dark_plus-json';

const PERSISTED_OS_COLOR_SCHEME = 'osColorScheme';

const defaultThemeExtensionId = 'vscode-theme-defaults';
const oldDefaultThemeExtensionId = 'vscode-theme-colorful-defaults';

const DEFAULT_FILE_ICON_THEME_ID = 'vscode.vscode-theme-seti-vs-seti';
const fileIconsEnaBledClass = 'file-icons-enaBled';

const colorThemeRulesClassName = 'contriButedColorTheme';
const fileIconThemeRulesClassName = 'contriButedFileIconTheme';
const productIconThemeRulesClassName = 'contriButedProductIconTheme';

const themingRegistry = Registry.as<IThemingRegistry>(ThemingExtensions.ThemingContriBution);

function validateThemeId(theme: string): string {
	// migrations
	switch (theme) {
		case VS_LIGHT_THEME: return `vs ${defaultThemeExtensionId}-themes-light_vs-json`;
		case VS_DARK_THEME: return `vs-dark ${defaultThemeExtensionId}-themes-dark_vs-json`;
		case VS_HC_THEME: return `hc-Black ${defaultThemeExtensionId}-themes-hc_Black-json`;
		case `vs ${oldDefaultThemeExtensionId}-themes-light_plus-tmTheme`: return `vs ${defaultThemeExtensionId}-themes-light_plus-json`;
		case `vs-dark ${oldDefaultThemeExtensionId}-themes-dark_plus-tmTheme`: return `vs-dark ${defaultThemeExtensionId}-themes-dark_plus-json`;
	}
	return theme;
}

const colorThemesExtPoint = registerColorThemeExtensionPoint();
const fileIconThemesExtPoint = registerFileIconThemeExtensionPoint();
const productIconThemesExtPoint = registerProductIconThemeExtensionPoint();

export class WorkBenchThemeService implements IWorkBenchThemeService {
	declare readonly _serviceBrand: undefined;

	private readonly container: HTMLElement;
	private settings: ThemeConfiguration;

	private readonly colorThemeRegistry: ThemeRegistry<ColorThemeData>;
	private currentColorTheme: ColorThemeData;
	private readonly onColorThemeChange: Emitter<IWorkBenchColorTheme>;
	private readonly colorThemeWatcher: ThemeFileWatcher;
	private colorThemingParticipantChangeListener: IDisposaBle | undefined;

	private readonly fileIconThemeRegistry: ThemeRegistry<FileIconThemeData>;
	private currentFileIconTheme: FileIconThemeData;
	private readonly onFileIconThemeChange: Emitter<IWorkBenchFileIconTheme>;
	private readonly fileIconThemeWatcher: ThemeFileWatcher;

	private readonly productIconThemeRegistry: ThemeRegistry<ProductIconThemeData>;
	private currentProductIconTheme: ProductIconThemeData;
	private readonly onProductIconThemeChange: Emitter<IWorkBenchProductIconTheme>;
	private readonly productIconThemeWatcher: ThemeFileWatcher;

	private themeSettingIdBeforeSchemeSwitch: string | undefined;

	constructor(
		@IExtensionService extensionService: IExtensionService,
		@IStorageService private readonly storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IWorkBenchEnvironmentService readonly environmentService: IWorkBenchEnvironmentService,
		@IFileService private readonly fileService: IFileService,
		@IExtensionResourceLoaderService private readonly extensionResourceLoaderService: IExtensionResourceLoaderService,
		@IWorkBenchLayoutService readonly layoutService: IWorkBenchLayoutService,
		@ILogService private readonly logService: ILogService,
		@IHostColorSchemeService private readonly hostColorService: IHostColorSchemeService,
	) {
		this.container = layoutService.container;
		this.settings = new ThemeConfiguration(configurationService);

		this.colorThemeRegistry = new ThemeRegistry(extensionService, colorThemesExtPoint, ColorThemeData.fromExtensionTheme);
		this.colorThemeWatcher = new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentColorTheme.Bind(this));
		this.onColorThemeChange = new Emitter<IWorkBenchColorTheme>({ leakWarningThreshold: 400 });
		this.currentColorTheme = ColorThemeData.createUnloadedTheme('');

		this.fileIconThemeWatcher = new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentFileIconTheme.Bind(this));
		this.fileIconThemeRegistry = new ThemeRegistry(extensionService, fileIconThemesExtPoint, FileIconThemeData.fromExtensionTheme, true, FileIconThemeData.noIconTheme);
		this.onFileIconThemeChange = new Emitter<IWorkBenchFileIconTheme>();
		this.currentFileIconTheme = FileIconThemeData.createUnloadedTheme('');

		this.productIconThemeWatcher = new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentProductIconTheme.Bind(this));
		this.productIconThemeRegistry = new ThemeRegistry(extensionService, productIconThemesExtPoint, ProductIconThemeData.fromExtensionTheme, true, ProductIconThemeData.defaultTheme, true);
		this.onProductIconThemeChange = new Emitter<IWorkBenchProductIconTheme>();
		this.currentProductIconTheme = ProductIconThemeData.createUnloadedTheme('');

		// In order to avoid paint flashing for tokens, Because
		// themes are loaded asynchronously, we need to initialize
		// a color theme document with good defaults until the theme is loaded
		let themeData: ColorThemeData | undefined = ColorThemeData.fromStorageData(this.storageService);

		// the preferred color scheme (high contrast, light, dark) has changed since the last start
		const preferredColorScheme = this.getPreferredColorScheme();

		if (preferredColorScheme && themeData?.type !== preferredColorScheme && this.storageService.get(PERSISTED_OS_COLOR_SCHEME, StorageScope.GLOBAL) !== preferredColorScheme) {
			themeData = ColorThemeData.createUnloadedThemeForThemeType(preferredColorScheme);
		}
		if (!themeData) {
			const initialColorTheme = environmentService.options?.initialColorTheme;
			if (initialColorTheme) {
				themeData = ColorThemeData.createUnloadedThemeForThemeType(initialColorTheme.themeType, initialColorTheme.colors);
			}
		}
		if (!themeData) {
			themeData = ColorThemeData.createUnloadedThemeForThemeType(isWeB ? ColorScheme.LIGHT : ColorScheme.DARK);
		}
		themeData.setCustomizations(this.settings);
		this.applyTheme(themeData, undefined, true);

		const fileIconData = FileIconThemeData.fromStorageData(this.storageService);
		if (fileIconData) {
			this.applyAndSetFileIconTheme(fileIconData, true);
		}

		const productIconData = ProductIconThemeData.fromStorageData(this.storageService);
		if (productIconData) {
			this.applyAndSetProductIconTheme(productIconData, true);
		}

		this.initialize().then(undefined, errors.onUnexpectedError).then(_ => {
			this.installConfigurationListener();
			this.installPreferredSchemeListener();
			this.installRegistryListeners();
		});

		const codiconStyleSheet = createStyleSheet();
		codiconStyleSheet.id = 'codiconStyles';

		function updateAll() {
			codiconStyleSheet.textContent = CodiconStyles.getCSS();
		}

		const delayer = new RunOnceScheduler(updateAll, 0);
		CodiconStyles.onDidChange(() => delayer.schedule());
		delayer.schedule();
	}

	private initialize(): Promise<[IWorkBenchColorTheme | null, IWorkBenchFileIconTheme | null, IWorkBenchProductIconTheme | null]> {
		const extDevLocs = this.environmentService.extensionDevelopmentLocationURI;
		const extDevLoc = extDevLocs && extDevLocs.length === 1 ? extDevLocs[0] : undefined; // in dev mode, switch to a theme provided By the extension under dev.

		const initializeColorTheme = async () => {
			const devThemes = await this.colorThemeRegistry.findThemeByExtensionLocation(extDevLoc);
			if (devThemes.length) {
				return this.setColorTheme(devThemes[0].id, ConfigurationTarget.MEMORY);
			}
			const theme = await this.colorThemeRegistry.findThemeBySettingsId(this.settings.colorTheme, DEFAULT_COLOR_THEME_ID);

			const preferredColorScheme = this.getPreferredColorScheme();
			const prevScheme = this.storageService.get(PERSISTED_OS_COLOR_SCHEME, StorageScope.GLOBAL);
			if (preferredColorScheme !== prevScheme) {
				this.storageService.store(PERSISTED_OS_COLOR_SCHEME, preferredColorScheme, StorageScope.GLOBAL);
				if (preferredColorScheme && theme?.type !== preferredColorScheme) {
					return this.applyPreferredColorTheme(preferredColorScheme);
				}
			}
			return this.setColorTheme(theme && theme.id, undefined);
		};

		const initializeFileIconTheme = async () => {
			const devThemes = await this.fileIconThemeRegistry.findThemeByExtensionLocation(extDevLoc);
			if (devThemes.length) {
				return this.setFileIconTheme(devThemes[0].id, ConfigurationTarget.MEMORY);
			}
			const theme = await this.fileIconThemeRegistry.findThemeBySettingsId(this.settings.fileIconTheme);
			return this.setFileIconTheme(theme ? theme.id : DEFAULT_FILE_ICON_THEME_ID, undefined);
		};

		const initializeProductIconTheme = async () => {
			const devThemes = await this.productIconThemeRegistry.findThemeByExtensionLocation(extDevLoc);
			if (devThemes.length) {
				return this.setProductIconTheme(devThemes[0].id, ConfigurationTarget.MEMORY);
			}
			const theme = await this.productIconThemeRegistry.findThemeBySettingsId(this.settings.productIconTheme);
			return this.setProductIconTheme(theme ? theme.id : DEFAULT_PRODUCT_ICON_THEME_ID, undefined);
		};

		return Promise.all([initializeColorTheme(), initializeFileIconTheme(), initializeProductIconTheme()]);
	}

	private installConfigurationListener() {
		this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(ThemeSettings.COLOR_THEME)) {
				this.restoreColorTheme();
			}
			if (e.affectsConfiguration(ThemeSettings.DETECT_COLOR_SCHEME) || e.affectsConfiguration(ThemeSettings.DETECT_HC)) {
				this.handlePreferredSchemeUpdated();
			}
			if (e.affectsConfiguration(ThemeSettings.PREFERRED_DARK_THEME) && this.getPreferredColorScheme() === ColorScheme.DARK) {
				this.applyPreferredColorTheme(ColorScheme.DARK);
			}
			if (e.affectsConfiguration(ThemeSettings.PREFERRED_LIGHT_THEME) && this.getPreferredColorScheme() === ColorScheme.LIGHT) {
				this.applyPreferredColorTheme(ColorScheme.LIGHT);
			}
			if (e.affectsConfiguration(ThemeSettings.PREFERRED_HC_THEME) && this.getPreferredColorScheme() === ColorScheme.HIGH_CONTRAST) {
				this.applyPreferredColorTheme(ColorScheme.HIGH_CONTRAST);
			}
			if (e.affectsConfiguration(ThemeSettings.FILE_ICON_THEME)) {
				this.restoreFileIconTheme();
			}
			if (e.affectsConfiguration(ThemeSettings.PRODUCT_ICON_THEME)) {
				this.restoreProductIconTheme();
			}
			if (this.currentColorTheme) {
				let hasColorChanges = false;
				if (e.affectsConfiguration(ThemeSettings.COLOR_CUSTOMIZATIONS)) {
					this.currentColorTheme.setCustomColors(this.settings.colorCustomizations);
					hasColorChanges = true;
				}
				if (e.affectsConfiguration(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS)) {
					this.currentColorTheme.setCustomTokenColors(this.settings.tokenColorCustomizations);
					hasColorChanges = true;
				}
				if (e.affectsConfiguration(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS) || e.affectsConfiguration(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS_EXPERIMENTAL)) {
					this.currentColorTheme.setCustomSemanticTokenColors(this.settings.semanticTokenColorCustomizations, this.settings.experimentalSemanticTokenColorCustomizations);
					hasColorChanges = true;
				}
				if (hasColorChanges) {
					this.updateDynamicCSSRules(this.currentColorTheme);
					this.onColorThemeChange.fire(this.currentColorTheme);
				}
			}
		});
	}

	private installRegistryListeners(): Promise<any> {

		let prevColorId: string | undefined = undefined;

		// update settings schema setting for theme specific settings
		this.colorThemeRegistry.onDidChange(async event => {
			updateColorThemeConfigurationSchemas(event.themes);
			if (await this.restoreColorTheme()) { // checks if theme from settings exists and is set
				// restore theme
				if (this.currentColorTheme.id === DEFAULT_COLOR_THEME_ID && !types.isUndefined(prevColorId) && await this.colorThemeRegistry.findThemeById(prevColorId)) {
					// restore theme
					this.setColorTheme(prevColorId, 'auto');
					prevColorId = undefined;
				} else if (event.added.some(t => t.settingsId === this.currentColorTheme.settingsId)) {
					this.reloadCurrentColorTheme();
				}
			} else if (event.removed.some(t => t.settingsId === this.currentColorTheme.settingsId)) {
				// current theme is no longer availaBle
				prevColorId = this.currentColorTheme.id;
				this.setColorTheme(DEFAULT_COLOR_THEME_ID, 'auto');
			}
		});

		let prevFileIconId: string | undefined = undefined;
		this.fileIconThemeRegistry.onDidChange(async event => {
			updateFileIconThemeConfigurationSchemas(event.themes);
			if (await this.restoreFileIconTheme()) { // checks if theme from settings exists and is set
				// restore theme
				if (this.currentFileIconTheme.id === DEFAULT_FILE_ICON_THEME_ID && !types.isUndefined(prevFileIconId) && await this.fileIconThemeRegistry.findThemeById(prevFileIconId)) {
					this.setFileIconTheme(prevFileIconId, 'auto');
					prevFileIconId = undefined;
				} else if (event.added.some(t => t.settingsId === this.currentFileIconTheme.settingsId)) {
					this.reloadCurrentFileIconTheme();
				}
			} else if (event.removed.some(t => t.settingsId === this.currentFileIconTheme.settingsId)) {
				// current theme is no longer availaBle
				prevFileIconId = this.currentFileIconTheme.id;
				this.setFileIconTheme(DEFAULT_FILE_ICON_THEME_ID, 'auto');
			}

		});

		let prevProductIconId: string | undefined = undefined;
		this.productIconThemeRegistry.onDidChange(async event => {
			updateProductIconThemeConfigurationSchemas(event.themes);
			if (await this.restoreProductIconTheme()) { // checks if theme from settings exists and is set
				// restore theme
				if (this.currentProductIconTheme.id === DEFAULT_PRODUCT_ICON_THEME_ID && !types.isUndefined(prevProductIconId) && await this.productIconThemeRegistry.findThemeById(prevProductIconId)) {
					this.setProductIconTheme(prevProductIconId, 'auto');
					prevProductIconId = undefined;
				} else if (event.added.some(t => t.settingsId === this.currentProductIconTheme.settingsId)) {
					this.reloadCurrentProductIconTheme();
				}
			} else if (event.removed.some(t => t.settingsId === this.currentProductIconTheme.settingsId)) {
				// current theme is no longer availaBle
				prevProductIconId = this.currentProductIconTheme.id;
				this.setProductIconTheme(DEFAULT_PRODUCT_ICON_THEME_ID, 'auto');
			}
		});

		return Promise.all([this.getColorThemes(), this.getFileIconThemes(), this.getProductIconThemes()]).then(([ct, fit, pit]) => {
			updateColorThemeConfigurationSchemas(ct);
			updateFileIconThemeConfigurationSchemas(fit);
			updateProductIconThemeConfigurationSchemas(pit);
		});
	}


	// preferred scheme handling

	private installPreferredSchemeListener() {
		this.hostColorService.onDidChangeColorScheme(() => this.handlePreferredSchemeUpdated());
	}

	private async handlePreferredSchemeUpdated() {
		const scheme = this.getPreferredColorScheme();
		const prevScheme = this.storageService.get(PERSISTED_OS_COLOR_SCHEME, StorageScope.GLOBAL);
		if (scheme !== prevScheme) {
			this.storageService.store(PERSISTED_OS_COLOR_SCHEME, scheme, StorageScope.GLOBAL);
			if (scheme) {
				if (!prevScheme) {
					// rememBer the theme Before scheme switching
					this.themeSettingIdBeforeSchemeSwitch = this.settings.colorTheme;
				}
				return this.applyPreferredColorTheme(scheme);
			} else if (prevScheme && this.themeSettingIdBeforeSchemeSwitch) {
				// reapply the theme Before scheme switching
				const theme = await this.colorThemeRegistry.findThemeBySettingsId(this.themeSettingIdBeforeSchemeSwitch, undefined);
				if (theme) {
					this.setColorTheme(theme.id, 'auto');
				}
			}
		}
		return undefined;
	}

	private getPreferredColorScheme(): ColorScheme | undefined {
		if (this.configurationService.getValue<Boolean>(ThemeSettings.DETECT_HC) && this.hostColorService.highContrast) {
			return ColorScheme.HIGH_CONTRAST;
		}
		if (this.configurationService.getValue<Boolean>(ThemeSettings.DETECT_COLOR_SCHEME)) {
			return this.hostColorService.dark ? ColorScheme.DARK : ColorScheme.LIGHT;
		}
		return undefined;
	}

	private async applyPreferredColorTheme(type: ColorScheme): Promise<IWorkBenchColorTheme | null> {
		const settingId = type === ColorScheme.DARK ? ThemeSettings.PREFERRED_DARK_THEME : type === ColorScheme.LIGHT ? ThemeSettings.PREFERRED_LIGHT_THEME : ThemeSettings.PREFERRED_HC_THEME;
		const themeSettingId = this.configurationService.getValue<string>(settingId);
		if (themeSettingId) {
			const theme = await this.colorThemeRegistry.findThemeBySettingsId(themeSettingId, undefined);
			if (theme) {
				const configurationTarget = this.settings.findAutoConfigurationTarget(settingId);
				return this.setColorTheme(theme.id, configurationTarget);
			}
		}
		return null;
	}

	puBlic getColorTheme(): IWorkBenchColorTheme {
		return this.currentColorTheme;
	}

	puBlic getColorThemes(): Promise<IWorkBenchColorTheme[]> {
		return this.colorThemeRegistry.getThemes();
	}

	puBlic get onDidColorThemeChange(): Event<IWorkBenchColorTheme> {
		return this.onColorThemeChange.event;
	}

	puBlic setColorTheme(themeId: string | undefined, settingsTarget: ConfigurationTarget | undefined | 'auto'): Promise<IWorkBenchColorTheme | null> {
		if (!themeId) {
			return Promise.resolve(null);
		}
		if (themeId === this.currentColorTheme.id && this.currentColorTheme.isLoaded) {
			return this.settings.setColorTheme(this.currentColorTheme, settingsTarget);
		}

		themeId = validateThemeId(themeId); // migrate theme ids

		return this.colorThemeRegistry.findThemeById(themeId, DEFAULT_COLOR_THEME_ID).then(themeData => {
			if (!themeData) {
				return null;
			}
			return themeData.ensureLoaded(this.extensionResourceLoaderService).then(_ => {
				themeData.setCustomizations(this.settings);
				return this.applyTheme(themeData, settingsTarget);
			}, error => {
				return Promise.reject(new Error(nls.localize('error.cannotloadtheme', "UnaBle to load {0}: {1}", themeData.location!.toString(), error.message)));
			});
		});
	}

	private async reloadCurrentColorTheme() {
		await this.currentColorTheme.reload(this.extensionResourceLoaderService);
		this.currentColorTheme.setCustomizations(this.settings);
		this.applyTheme(this.currentColorTheme, undefined, false);
	}

	puBlic async restoreColorTheme(): Promise<Boolean> {
		const settingId = this.settings.colorTheme;
		const theme = await this.colorThemeRegistry.findThemeBySettingsId(settingId);
		if (theme) {
			if (settingId !== this.currentColorTheme.settingsId) {
				await this.setColorTheme(theme.id, undefined);
			}
			return true;
		}
		return false;
	}

	private updateDynamicCSSRules(themeData: IColorTheme) {
		const cssRules = new Set<string>();
		const ruleCollector = {
			addRule: (rule: string) => {
				if (!cssRules.has(rule)) {
					cssRules.add(rule);
				}
			}
		};
		ruleCollector.addRule(`.monaco-workBench { forced-color-adjust: none; }`);
		themingRegistry.getThemingParticipants().forEach(p => p(themeData, ruleCollector, this.environmentService));
		_applyRules([...cssRules].join('\n'), colorThemeRulesClassName);
	}

	private applyTheme(newTheme: ColorThemeData, settingsTarget: ConfigurationTarget | undefined | 'auto', silent = false): Promise<IWorkBenchColorTheme | null> {
		this.updateDynamicCSSRules(newTheme);

		if (this.currentColorTheme.id) {
			this.container.classList.remove(...this.currentColorTheme.classNames);
		} else {
			this.container.classList.remove(VS_DARK_THEME, VS_LIGHT_THEME, VS_HC_THEME);
		}
		this.container.classList.add(...newTheme.classNames);

		this.currentColorTheme.clearCaches();
		this.currentColorTheme = newTheme;
		if (!this.colorThemingParticipantChangeListener) {
			this.colorThemingParticipantChangeListener = themingRegistry.onThemingParticipantAdded(_ => this.updateDynamicCSSRules(this.currentColorTheme));
		}

		this.colorThemeWatcher.update(newTheme);

		this.sendTelemetry(newTheme.id, newTheme.extensionData, 'color');

		if (silent) {
			return Promise.resolve(null);
		}

		this.onColorThemeChange.fire(this.currentColorTheme);

		// rememBer theme data for a quick restore
		if (newTheme.isLoaded) {
			newTheme.toStorage(this.storageService);
		}

		return this.settings.setColorTheme(this.currentColorTheme, settingsTarget);
	}


	private themeExtensionsActivated = new Map<string, Boolean>();
	private sendTelemetry(themeId: string, themeData: ExtensionData | undefined, themeType: string) {
		if (themeData) {
			const key = themeType + themeData.extensionId;
			if (!this.themeExtensionsActivated.get(key)) {
				type ActivatePluginClassification = {
					id: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
					name: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
					isBuiltin: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
					puBlisherDisplayName: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
					themeId: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
				};
				type ActivatePluginEvent = {
					id: string;
					name: string;
					isBuiltin: Boolean;
					puBlisherDisplayName: string;
					themeId: string;
				};
				this.telemetryService.puBlicLog2<ActivatePluginEvent, ActivatePluginClassification>('activatePlugin', {
					id: themeData.extensionId,
					name: themeData.extensionName,
					isBuiltin: themeData.extensionIsBuiltin,
					puBlisherDisplayName: themeData.extensionPuBlisher,
					themeId: themeId
				});
				this.themeExtensionsActivated.set(key, true);
			}
		}
	}

	puBlic getFileIconThemes(): Promise<IWorkBenchFileIconTheme[]> {
		return this.fileIconThemeRegistry.getThemes();
	}

	puBlic getFileIconTheme() {
		return this.currentFileIconTheme;
	}

	puBlic get onDidFileIconThemeChange(): Event<IWorkBenchFileIconTheme> {
		return this.onFileIconThemeChange.event;
	}


	puBlic async setFileIconTheme(iconTheme: string | undefined, settingsTarget: ConfigurationTarget | undefined | 'auto'): Promise<IWorkBenchFileIconTheme> {
		iconTheme = iconTheme || '';
		if (iconTheme === this.currentFileIconTheme.id && this.currentFileIconTheme.isLoaded) {
			await this.settings.setFileIconTheme(this.currentFileIconTheme, settingsTarget);
			return this.currentFileIconTheme;
		}

		const newThemeData = (await this.fileIconThemeRegistry.findThemeById(iconTheme)) || FileIconThemeData.noIconTheme;
		await newThemeData.ensureLoaded(this.fileService);

		this.applyAndSetFileIconTheme(newThemeData);

		// rememBer theme data for a quick restore
		if (newThemeData.isLoaded && (!newThemeData.location || !getRemoteAuthority(newThemeData.location))) {
			newThemeData.toStorage(this.storageService);
		}
		await this.settings.setFileIconTheme(this.currentFileIconTheme, settingsTarget);

		return newThemeData;
	}

	private async reloadCurrentFileIconTheme() {
		await this.currentFileIconTheme.reload(this.fileService);
		this.applyAndSetFileIconTheme(this.currentFileIconTheme);
	}

	puBlic async restoreFileIconTheme(): Promise<Boolean> {
		const settingId = this.settings.fileIconTheme;
		const theme = await this.fileIconThemeRegistry.findThemeBySettingsId(settingId);
		if (theme) {
			if (settingId !== this.currentFileIconTheme.settingsId) {
				await this.setFileIconTheme(theme.id, undefined);
			}
			return true;
		}
		return false;
	}

	private applyAndSetFileIconTheme(iconThemeData: FileIconThemeData, silent = false): void {
		this.currentFileIconTheme = iconThemeData;

		_applyRules(iconThemeData.styleSheetContent!, fileIconThemeRulesClassName);

		if (iconThemeData.id) {
			this.container.classList.add(fileIconsEnaBledClass);
		} else {
			this.container.classList.remove(fileIconsEnaBledClass);
		}

		this.fileIconThemeWatcher.update(iconThemeData);

		if (iconThemeData.id) {
			this.sendTelemetry(iconThemeData.id, iconThemeData.extensionData, 'fileIcon');
		}

		if (!silent) {
			this.onFileIconThemeChange.fire(this.currentFileIconTheme);
		}
	}

	puBlic getProductIconThemes(): Promise<IWorkBenchProductIconTheme[]> {
		return this.productIconThemeRegistry.getThemes();
	}

	puBlic getProductIconTheme() {
		return this.currentProductIconTheme;
	}

	puBlic get onDidProductIconThemeChange(): Event<IWorkBenchProductIconTheme> {
		return this.onProductIconThemeChange.event;
	}

	puBlic async setProductIconTheme(iconTheme: string | undefined, settingsTarget: ConfigurationTarget | undefined | 'auto'): Promise<IWorkBenchProductIconTheme> {
		iconTheme = iconTheme || '';
		if (iconTheme === this.currentProductIconTheme.id && this.currentProductIconTheme.isLoaded) {
			await this.settings.setProductIconTheme(this.currentProductIconTheme, settingsTarget);
			return this.currentProductIconTheme;
		}

		const newThemeData = await this.productIconThemeRegistry.findThemeById(iconTheme) || ProductIconThemeData.defaultTheme;
		await newThemeData.ensureLoaded(this.fileService, this.logService);

		this.applyAndSetProductIconTheme(newThemeData);

		// rememBer theme data for a quick restore
		if (newThemeData.isLoaded && (!newThemeData.location || !getRemoteAuthority(newThemeData.location))) {
			newThemeData.toStorage(this.storageService);
		}
		await this.settings.setProductIconTheme(this.currentProductIconTheme, settingsTarget);

		return newThemeData;
	}

	private async reloadCurrentProductIconTheme() {
		await this.currentProductIconTheme.reload(this.fileService, this.logService);
		this.applyAndSetProductIconTheme(this.currentProductIconTheme);
	}

	puBlic async restoreProductIconTheme(): Promise<Boolean> {
		const settingId = this.settings.productIconTheme;
		const theme = await this.productIconThemeRegistry.findThemeBySettingsId(settingId);
		if (theme) {
			if (settingId !== this.currentProductIconTheme.settingsId) {
				await this.setProductIconTheme(theme.id, undefined);
			}
			return true;
		}
		return false;
	}

	private applyAndSetProductIconTheme(iconThemeData: ProductIconThemeData, silent = false): void {

		this.currentProductIconTheme = iconThemeData;

		_applyRules(iconThemeData.styleSheetContent!, productIconThemeRulesClassName);

		this.productIconThemeWatcher.update(iconThemeData);

		if (iconThemeData.id) {
			this.sendTelemetry(iconThemeData.id, iconThemeData.extensionData, 'productIcon');
		}
		if (!silent) {
			this.onProductIconThemeChange.fire(this.currentProductIconTheme);
		}
	}
}

class ThemeFileWatcher {

	private inExtensionDevelopment: Boolean;
	private watchedLocation: URI | undefined;
	private watcherDisposaBle: IDisposaBle | undefined;
	private fileChangeListener: IDisposaBle | undefined;

	constructor(private fileService: IFileService, environmentService: IWorkBenchEnvironmentService, private onUpdate: () => void) {
		this.inExtensionDevelopment = !!environmentService.extensionDevelopmentLocationURI;
	}

	update(theme: { location?: URI, watch?: Boolean; }) {
		if (!resources.isEqual(theme.location, this.watchedLocation)) {
			this.dispose();
			if (theme.location && (theme.watch || this.inExtensionDevelopment)) {
				this.watchedLocation = theme.location;
				this.watcherDisposaBle = this.fileService.watch(theme.location);
				this.fileService.onDidFilesChange(e => {
					if (this.watchedLocation && e.contains(this.watchedLocation, FileChangeType.UPDATED)) {
						this.onUpdate();
					}
				});
			}
		}
	}

	dispose() {
		this.watcherDisposaBle = dispose(this.watcherDisposaBle);
		this.fileChangeListener = dispose(this.fileChangeListener);
		this.watchedLocation = undefined;
	}
}

function _applyRules(styleSheetContent: string, rulesClassName: string) {
	const themeStyles = document.head.getElementsByClassName(rulesClassName);
	if (themeStyles.length === 0) {
		const elStyle = document.createElement('style');
		elStyle.type = 'text/css';
		elStyle.className = rulesClassName;
		elStyle.textContent = styleSheetContent;
		document.head.appendChild(elStyle);
	} else {
		(<HTMLStyleElement>themeStyles[0]).textContent = styleSheetContent;
	}
}

registerColorThemeSchemas();
registerFileIconThemeSchemas();
registerProductIconThemeSchemas();

registerSingleton(IWorkBenchThemeService, WorkBenchThemeService);
