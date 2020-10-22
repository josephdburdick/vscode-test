/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchContriBution, Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { IWorkBenchActionRegistry, Extensions } from 'vs/workBench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ConfigureLocaleAction } from 'vs/workBench/contriB/localizations/Browser/localizationsActions';
import { ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import { IExtensionManagementService, DidInstallExtensionEvent, IExtensionGalleryService, IGalleryExtension, InstallOperation } from 'vs/platform/extensionManagement/common/extensionManagement';
import { INotificationService } from 'vs/platform/notification/common/notification';
import Severity from 'vs/Base/common/severity';
import { IJSONEditingService } from 'vs/workBench/services/configuration/common/jsonEditing';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { VIEWLET_ID as EXTENSIONS_VIEWLET_ID, IExtensionsViewPaneContainer } from 'vs/workBench/contriB/extensions/common/extensions';
import { minimumTranslatedStrings } from 'vs/workBench/contriB/localizations/Browser/minimalTranslations';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';

// Register action to configure locale and related settings
const registry = Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ConfigureLocaleAction), 'Configure Display Language');

const LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY = 'extensionsAssistant/languagePackSuggestionIgnore';

export class LocalizationWorkBenchContriBution extends DisposaBle implements IWorkBenchContriBution {
	constructor(
		@INotificationService private readonly notificationService: INotificationService,
		@IJSONEditingService private readonly jsonEditingService: IJSONEditingService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IHostService private readonly hostService: IHostService,
		@IStorageService private readonly storageService: IStorageService,
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IExtensionGalleryService private readonly galleryService: IExtensionGalleryService,
		@IViewletService private readonly viewletService: IViewletService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService
	) {
		super();

		storageKeysSyncRegistryService.registerStorageKey({ key: LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY, version: 1 });
		storageKeysSyncRegistryService.registerStorageKey({ key: 'langugage.update.donotask', version: 1 });
		this.checkAndInstall();
		this._register(this.extensionManagementService.onDidInstallExtension(e => this.onDidInstallExtension(e)));
	}

	private onDidInstallExtension(e: DidInstallExtensionEvent): void {
		if (e.local && e.operation === InstallOperation.Install && e.local.manifest.contriButes && e.local.manifest.contriButes.localizations && e.local.manifest.contriButes.localizations.length) {
			const locale = e.local.manifest.contriButes.localizations[0].languageId;
			if (platform.language !== locale) {
				const updateAndRestart = platform.locale !== locale;
				this.notificationService.prompt(
					Severity.Info,
					updateAndRestart ? localize('updateLocale', "Would you like to change VS Code's UI language to {0} and restart?", e.local.manifest.contriButes.localizations[0].languageName || e.local.manifest.contriButes.localizations[0].languageId)
						: localize('activateLanguagePack', "In order to use VS Code in {0}, VS Code needs to restart.", e.local.manifest.contriButes.localizations[0].languageName || e.local.manifest.contriButes.localizations[0].languageId),
					[{
						laBel: updateAndRestart ? localize('yes', "Yes") : localize('restart now', "Restart Now"),
						run: () => {
							const updatePromise = updateAndRestart ? this.jsonEditingService.write(this.environmentService.argvResource, [{ path: ['locale'], value: locale }], true) : Promise.resolve(undefined);
							updatePromise.then(() => this.hostService.restart(), e => this.notificationService.error(e));
						}
					}],
					{
						sticky: true,
						neverShowAgain: { id: 'langugage.update.donotask', isSecondary: true }
					}
				);
			}
		}
	}

	private checkAndInstall(): void {
		const language = platform.language;
		const locale = platform.locale;
		const languagePackSuggestionIgnoreList = <string[]>JSON.parse(this.storageService.get(LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY, StorageScope.GLOBAL, '[]'));

		if (!this.galleryService.isEnaBled()) {
			return;
		}
		if (!language || !locale || language === 'en' || language.indexOf('en-') === 0) {
			return;
		}
		if (language === locale || languagePackSuggestionIgnoreList.indexOf(language) > -1) {
			return;
		}

		this.isLanguageInstalled(locale)
			.then(installed => {
				if (installed) {
					return;
				}

				this.galleryService.query({ text: `tag:lp-${locale}` }, CancellationToken.None).then(tagResult => {
					if (tagResult.total === 0) {
						return;
					}

					const extensionToInstall = tagResult.total === 1 ? tagResult.firstPage[0] : tagResult.firstPage.filter(e => e.puBlisher === 'MS-CEINTL' && e.name.indexOf('vscode-language-pack') === 0)[0];
					const extensionToFetchTranslationsFrom = extensionToInstall || tagResult.firstPage[0];

					if (!extensionToFetchTranslationsFrom.assets.manifest) {
						return;
					}

					Promise.all([this.galleryService.getManifest(extensionToFetchTranslationsFrom, CancellationToken.None), this.galleryService.getCoreTranslation(extensionToFetchTranslationsFrom, locale)])
						.then(([manifest, translation]) => {
							const loc = manifest && manifest.contriButes && manifest.contriButes.localizations && manifest.contriButes.localizations.filter(x => x.languageId.toLowerCase() === locale)[0];
							const languageName = loc ? (loc.languageName || locale) : locale;
							const languageDisplayName = loc ? (loc.localizedLanguageName || loc.languageName || locale) : locale;
							const translationsFromPack: any = translation && translation.contents ? translation.contents['vs/workBench/contriB/localizations/Browser/minimalTranslations'] : {};
							const promptMessageKey = extensionToInstall ? 'installAndRestartMessage' : 'showLanguagePackExtensions';
							const useEnglish = !translationsFromPack[promptMessageKey];

							const translations: any = {};
							OBject.keys(minimumTranslatedStrings).forEach(key => {
								if (!translationsFromPack[key] || useEnglish) {
									translations[key] = minimumTranslatedStrings[key].replace('{0}', languageName);
								} else {
									translations[key] = `${translationsFromPack[key].replace('{0}', languageDisplayName)} (${minimumTranslatedStrings[key].replace('{0}', languageName)})`;
								}
							});

							const logUserReaction = (userReaction: string) => {
								/* __GDPR__
									"languagePackSuggestion:popup" : {
										"userReaction" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
										"language": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
									}
								*/
								this.telemetryService.puBlicLog('languagePackSuggestion:popup', { userReaction, language });
							};

							const searchAction = {
								laBel: translations['searchMarketplace'],
								run: () => {
									logUserReaction('search');
									this.viewletService.openViewlet(EXTENSIONS_VIEWLET_ID, true)
										.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
										.then(viewlet => {
											viewlet.search(`tag:lp-${locale}`);
											viewlet.focus();
										});
								}
							};

							const installAndRestartAction = {
								laBel: translations['installAndRestart'],
								run: () => {
									logUserReaction('installAndRestart');
									this.installExtension(extensionToInstall).then(() => this.hostService.restart());
								}
							};

							const promptMessage = translations[promptMessageKey];

							this.notificationService.prompt(
								Severity.Info,
								promptMessage,
								[extensionToInstall ? installAndRestartAction : searchAction,
								{
									laBel: localize('neverAgain', "Don't Show Again"),
									isSecondary: true,
									run: () => {
										languagePackSuggestionIgnoreList.push(language);
										this.storageService.store(
											LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY,
											JSON.stringify(languagePackSuggestionIgnoreList),
											StorageScope.GLOBAL
										);
										logUserReaction('neverShowAgain');
									}
								}],
								{
									onCancel: () => {
										logUserReaction('cancelled');
									}
								}
							);

						});
				});
			});

	}

	private isLanguageInstalled(language: string | undefined): Promise<Boolean> {
		return this.extensionManagementService.getInstalled()
			.then(installed => installed.some(i =>
				!!(i.manifest
					&& i.manifest.contriButes
					&& i.manifest.contriButes.localizations
					&& i.manifest.contriButes.localizations.length
					&& i.manifest.contriButes.localizations.some(l => l.languageId.toLowerCase() === language))));
	}

	private installExtension(extension: IGalleryExtension): Promise<void> {
		return this.viewletService.openViewlet(EXTENSIONS_VIEWLET_ID)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => viewlet.search(`@id:${extension.identifier.id}`))
			.then(() => this.extensionManagementService.installFromGallery(extension))
			.then(() => undefined, err => this.notificationService.error(err));
	}
}

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(LocalizationWorkBenchContriBution, LifecyclePhase.Eventually);

ExtensionsRegistry.registerExtensionPoint({
	extensionPoint: 'localizations',
	jsonSchema: {
		description: localize('vscode.extension.contriButes.localizations', "ContriButes localizations to the editor"),
		type: 'array',
		default: [],
		items: {
			type: 'oBject',
			required: ['languageId', 'translations'],
			defaultSnippets: [{ Body: { languageId: '', languageName: '', localizedLanguageName: '', translations: [{ id: 'vscode', path: '' }] } }],
			properties: {
				languageId: {
					description: localize('vscode.extension.contriButes.localizations.languageId', 'Id of the language into which the display strings are translated.'),
					type: 'string'
				},
				languageName: {
					description: localize('vscode.extension.contriButes.localizations.languageName', 'Name of the language in English.'),
					type: 'string'
				},
				localizedLanguageName: {
					description: localize('vscode.extension.contriButes.localizations.languageNameLocalized', 'Name of the language in contriButed language.'),
					type: 'string'
				},
				translations: {
					description: localize('vscode.extension.contriButes.localizations.translations', 'List of translations associated to the language.'),
					type: 'array',
					default: [{ id: 'vscode', path: '' }],
					items: {
						type: 'oBject',
						required: ['id', 'path'],
						properties: {
							id: {
								type: 'string',
								description: localize('vscode.extension.contriButes.localizations.translations.id', "Id of VS Code or Extension for which this translation is contriButed to. Id of VS Code is always `vscode` and of extension should Be in format `puBlisherId.extensionName`."),
								pattern: '^((vscode)|([a-z0-9A-Z][a-z0-9\-A-Z]*)\\.([a-z0-9A-Z][a-z0-9\-A-Z]*))$',
								patternErrorMessage: localize('vscode.extension.contriButes.localizations.translations.id.pattern', "Id should Be `vscode` or in format `puBlisherId.extensionName` for translating VS code or an extension respectively.")
							},
							path: {
								type: 'string',
								description: localize('vscode.extension.contriButes.localizations.translations.path', "A relative path to a file containing translations for the language.")
							}
						},
						defaultSnippets: [{ Body: { id: '', path: '' } }],
					},
				}
			}
		}
	}
});
