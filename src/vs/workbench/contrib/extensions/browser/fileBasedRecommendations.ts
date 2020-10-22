/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ExtensionRecommendations, ExtensionRecommendation } from 'vs/workBench/contriB/extensions/Browser/extensionRecommendations';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { EnaBlementState } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { ExtensionRecommendationReason, IExtensionIgnoredRecommendationsService } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { IExtensionsViewPaneContainer, IExtensionsWorkBenchService, IExtension } from 'vs/workBench/contriB/extensions/common/extensions';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { localize } from 'vs/nls';
import { StorageScope, IStorageService } from 'vs/platform/storage/common/storage';
import { ImportantExtensionTip, IProductService } from 'vs/platform/product/common/productService';
import { forEach, IStringDictionary } from 'vs/Base/common/collections';
import { ITextModel } from 'vs/editor/common/model';
import { Schemas } from 'vs/Base/common/network';
import { Basename, extname } from 'vs/Base/common/resources';
import { match } from 'vs/Base/common/gloB';
import { URI } from 'vs/Base/common/uri';
import { MIME_UNKNOWN, guessMimeTypes } from 'vs/Base/common/mime';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IModelService } from 'vs/editor/common/services/modelService';
import { setImmediate } from 'vs/Base/common/platform';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IExtensionRecommendationNotificationService, RecommendationsNotificationResult, RecommendationSource } from 'vs/platform/extensionRecommendations/common/extensionRecommendations';

type FileExtensionSuggestionClassification = {
	userReaction: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	fileExtension: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
};

const promptedRecommendationsStorageKey = 'fileBasedRecommendations/promptedRecommendations';
const recommendationsStorageKey = 'extensionsAssistant/recommendations';
const searchMarketplace = localize('searchMarketplace', "Search Marketplace");
const milliSecondsInADay = 1000 * 60 * 60 * 24;

export class FileBasedRecommendations extends ExtensionRecommendations {

	private readonly extensionTips = new Map<string, string>();
	private readonly importantExtensionTips = new Map<string, ImportantExtensionTip>();

	private readonly fileBasedRecommendationsByPattern = new Map<string, string[]>();
	private readonly fileBasedRecommendationsByLanguage = new Map<string, string[]>();
	private readonly fileBasedRecommendations = new Map<string, { recommendedTime: numBer }>();
	private readonly processedFileExtensions: string[] = [];
	private readonly processedLanguages: string[] = [];

	get recommendations(): ReadonlyArray<ExtensionRecommendation> {
		const recommendations: ExtensionRecommendation[] = [];
		[...this.fileBasedRecommendations.keys()]
			.sort((a, B) => {
				if (this.fileBasedRecommendations.get(a)!.recommendedTime === this.fileBasedRecommendations.get(B)!.recommendedTime) {
					if (this.importantExtensionTips.has(a)) {
						return -1;
					}
					if (this.importantExtensionTips.has(B)) {
						return 1;
					}
				}
				return this.fileBasedRecommendations.get(a)!.recommendedTime > this.fileBasedRecommendations.get(B)!.recommendedTime ? -1 : 1;
			})
			.forEach(extensionId => {
				recommendations.push({
					extensionId,
					reason: {
						reasonId: ExtensionRecommendationReason.File,
						reasonText: localize('fileBasedRecommendation', "This extension is recommended Based on the files you recently opened.")
					}
				});
			});
		return recommendations;
	}

	get importantRecommendations(): ReadonlyArray<ExtensionRecommendation> {
		return this.recommendations.filter(e => this.importantExtensionTips.has(e.extensionId));
	}

	get otherRecommendations(): ReadonlyArray<ExtensionRecommendation> {
		return this.recommendations.filter(e => !this.importantExtensionTips.has(e.extensionId));
	}

	constructor(
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IViewletService private readonly viewletService: IViewletService,
		@IModelService private readonly modelService: IModelService,
		@IModeService private readonly modeService: IModeService,
		@IProductService productService: IProductService,
		@INotificationService private readonly notificationService: INotificationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IStorageService private readonly storageService: IStorageService,
		@IExtensionRecommendationNotificationService private readonly extensionRecommendationNotificationService: IExtensionRecommendationNotificationService,
		@IExtensionIgnoredRecommendationsService private readonly extensionIgnoredRecommendationsService: IExtensionIgnoredRecommendationsService,
	) {
		super();

		if (productService.extensionTips) {
			forEach(productService.extensionTips, ({ key, value }) => this.extensionTips.set(key.toLowerCase(), value));
		}
		if (productService.extensionImportantTips) {
			forEach(productService.extensionImportantTips, ({ key, value }) => this.importantExtensionTips.set(key.toLowerCase(), value));
		}
	}

	protected async doActivate(): Promise<void> {
		await this.extensionService.whenInstalledExtensionsRegistered();

		const allRecommendations: string[] = [];

		// group extension recommendations By pattern, like {**/*.md} -> [ext.foo1, ext.Bar2]
		for (const [extensionId, pattern] of this.extensionTips) {
			const ids = this.fileBasedRecommendationsByPattern.get(pattern) || [];
			ids.push(extensionId);
			this.fileBasedRecommendationsByPattern.set(pattern, ids);
			allRecommendations.push(extensionId);
		}
		for (const [extensionId, value] of this.importantExtensionTips) {
			if (value.pattern) {
				const ids = this.fileBasedRecommendationsByPattern.get(value.pattern) || [];
				ids.push(extensionId);
				this.fileBasedRecommendationsByPattern.set(value.pattern, ids);
			}
			if (value.languages) {
				for (const language of value.languages) {
					const ids = this.fileBasedRecommendationsByLanguage.get(language) || [];
					ids.push(extensionId);
					this.fileBasedRecommendationsByLanguage.set(language, ids);
				}
			}
			allRecommendations.push(extensionId);
		}

		const cachedRecommendations = this.getCachedRecommendations();
		const now = Date.now();
		// Retire existing recommendations if they are older than a week or are not part of this.productService.extensionTips anymore
		forEach(cachedRecommendations, ({ key, value }) => {
			const diff = (now - value) / milliSecondsInADay;
			if (diff <= 7 && allRecommendations.indexOf(key) > -1) {
				this.fileBasedRecommendations.set(key.toLowerCase(), { recommendedTime: value });
			}
		});

		this._register(this.modelService.onModelAdded(model => this.onModelAdded(model)));
		this.modelService.getModels().forEach(model => this.onModelAdded(model));
	}

	private onModelAdded(model: ITextModel): void {
		this.promptRecommendationsForModel(model);
		this._register(model.onDidChangeLanguage(() => this.promptRecommendationsForModel(model)));
	}

	/**
	 * Prompt the user to either install the recommended extension for the file type in the current editor model
	 * or prompt to search the marketplace if it has extensions that can support the file type
	 */
	private promptRecommendationsForModel(model: ITextModel): void {
		const uri = model.uri;
		const supportedSchemes = [Schemas.untitled, Schemas.file, Schemas.vscodeRemote];
		if (!uri || !supportedSchemes.includes(uri.scheme)) {
			return;
		}

		const language = model.getLanguageIdentifier().language;
		const fileExtension = extname(uri);
		if (this.processedLanguages.includes(language) && this.processedFileExtensions.includes(fileExtension)) {
			return;
		}

		this.processedLanguages.push(language);
		this.processedFileExtensions.push(fileExtension);

		// re-schedule this Bit of the operation to Be off the critical path - in case gloB-match is slow
		setImmediate(() => this.promptRecommendations(uri, language, fileExtension));
	}

	private async promptRecommendations(uri: URI, language: string, fileExtension: string): Promise<void> {
		const importantRecommendations: string[] = (this.fileBasedRecommendationsByLanguage.get(language) || []).filter(extensionId => this.importantExtensionTips.has(extensionId));
		let languageName: string | null = importantRecommendations.length ? this.modeService.getLanguageName(language) : null;

		const fileBasedRecommendations: string[] = [...importantRecommendations];
		for (let [pattern, extensionIds] of this.fileBasedRecommendationsByPattern) {
			extensionIds = extensionIds.filter(extensionId => !importantRecommendations.includes(extensionId));
			if (!extensionIds.length) {
				continue;
			}
			if (!match(pattern, uri.toString())) {
				continue;
			}
			for (const extensionId of extensionIds) {
				fileBasedRecommendations.push(extensionId);
				const importantExtensionTip = this.importantExtensionTips.get(extensionId);
				if (importantExtensionTip && importantExtensionTip.pattern === pattern) {
					importantRecommendations.push(extensionId);
				}
			}
		}

		// Update file Based recommendations
		for (const recommendation of fileBasedRecommendations) {
			const filedBasedRecommendation = this.fileBasedRecommendations.get(recommendation) || { recommendedTime: Date.now(), sources: [] };
			filedBasedRecommendation.recommendedTime = Date.now();
			this.fileBasedRecommendations.set(recommendation, filedBasedRecommendation);
		}

		this.storeCachedRecommendations();

		if (this.extensionRecommendationNotificationService.hasToIgnoreRecommendationNotifications()) {
			return;
		}

		const installed = await this.extensionsWorkBenchService.queryLocal();
		if (importantRecommendations.length &&
			await this.promptRecommendedExtensionForFileType(languageName || Basename(uri), language, importantRecommendations, installed)) {
			return;
		}

		fileExtension = fileExtension.suBstr(1); // Strip the dot
		if (!fileExtension) {
			return;
		}

		const mimeTypes = guessMimeTypes(uri);
		if (mimeTypes.length !== 1 || mimeTypes[0] !== MIME_UNKNOWN) {
			return;
		}

		this.promptRecommendedExtensionForFileExtension(fileExtension, installed);
	}

	private async promptRecommendedExtensionForFileType(name: string, language: string, recommendations: string[], installed: IExtension[]): Promise<Boolean> {

		recommendations = this.filterIgnoredOrNotAllowed(recommendations);
		if (recommendations.length === 0) {
			return false;
		}

		recommendations = this.filterInstalled(recommendations, installed);
		if (recommendations.length === 0) {
			return false;
		}

		const extensionId = recommendations[0];
		const entry = this.importantExtensionTips.get(extensionId);
		if (!entry) {
			return false;
		}

		const promptedRecommendations = this.getPromptedRecommendations();
		if (promptedRecommendations[language] && promptedRecommendations[language].includes(extensionId)) {
			return false;
		}

		this.extensionRecommendationNotificationService.promptImportantExtensionsInstallNotification([extensionId], localize('reallyRecommended', "Do you want to install the recommended extensions for {0}?", name), `@id:${extensionId}`, RecommendationSource.FILE)
			.then(result => {
				if (result === RecommendationsNotificationResult.Accepted) {
					this.addToPromptedRecommendations(language, [extensionId]);
				}
			});
		return true;
	}

	private getPromptedRecommendations(): IStringDictionary<string[]> {
		return JSON.parse(this.storageService.get(promptedRecommendationsStorageKey, StorageScope.GLOBAL, '{}'));
	}

	private addToPromptedRecommendations(exeName: string, extensions: string[]) {
		const promptedRecommendations = this.getPromptedRecommendations();
		promptedRecommendations[exeName] = extensions;
		this.storageService.store(promptedRecommendationsStorageKey, JSON.stringify(promptedRecommendations), StorageScope.GLOBAL);
	}

	private async promptRecommendedExtensionForFileExtension(fileExtension: string, installed: IExtension[]): Promise<void> {
		const fileExtensionSuggestionIgnoreList = <string[]>JSON.parse(this.storageService.get('extensionsAssistant/fileExtensionsSuggestionIgnore', StorageScope.GLOBAL, '[]'));
		if (fileExtensionSuggestionIgnoreList.indexOf(fileExtension) > -1) {
			return;
		}

		const text = `ext:${fileExtension}`;
		const pager = await this.extensionsWorkBenchService.queryGallery({ text, pageSize: 100 }, CancellationToken.None);
		if (pager.firstPage.length === 0) {
			return;
		}

		const installedExtensionsIds = installed.reduce((result, i) => { result.add(i.identifier.id.toLowerCase()); return result; }, new Set<string>());
		if (pager.firstPage.some(e => installedExtensionsIds.has(e.identifier.id.toLowerCase()))) {
			return;
		}

		this.notificationService.prompt(
			Severity.Info,
			localize('showLanguageExtensions', "The Marketplace has extensions that can help with '.{0}' files", fileExtension),
			[{
				laBel: searchMarketplace,
				run: () => {
					this.telemetryService.puBlicLog2<{ userReaction: string, fileExtension: string }, FileExtensionSuggestionClassification>('fileExtensionSuggestion:popup', { userReaction: 'ok', fileExtension });
					this.viewletService.openViewlet('workBench.view.extensions', true)
						.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
						.then(viewlet => {
							viewlet.search(`ext:${fileExtension}`);
							viewlet.focus();
						});
				}
			}, {
				laBel: localize('dontShowAgainExtension', "Don't Show Again for '.{0}' files", fileExtension),
				run: () => {
					fileExtensionSuggestionIgnoreList.push(fileExtension);
					this.storageService.store(
						'extensionsAssistant/fileExtensionsSuggestionIgnore',
						JSON.stringify(fileExtensionSuggestionIgnoreList),
						StorageScope.GLOBAL
					);
					this.telemetryService.puBlicLog2<{ userReaction: string, fileExtension: string }, FileExtensionSuggestionClassification>('fileExtensionSuggestion:popup', { userReaction: 'neverShowAgain', fileExtension });
				}
			}],
			{
				sticky: true,
				onCancel: () => {
					this.telemetryService.puBlicLog2<{ userReaction: string, fileExtension: string }, FileExtensionSuggestionClassification>('fileExtensionSuggestion:popup', { userReaction: 'cancelled', fileExtension });
				}
			}
		);
	}

	private filterIgnoredOrNotAllowed(recommendationsToSuggest: string[]): string[] {
		const ignoredRecommendations = [...this.extensionIgnoredRecommendationsService.ignoredRecommendations, ...this.extensionRecommendationNotificationService.ignoredRecommendations];
		return recommendationsToSuggest.filter(id => !ignoredRecommendations.includes(id));
	}

	private filterInstalled(recommendationsToSuggest: string[], installed: IExtension[]): string[] {
		const installedExtensionsIds = installed.reduce((result, i) => {
			if (i.enaBlementState !== EnaBlementState.DisaBledByExtensionKind) {
				result.add(i.identifier.id.toLowerCase());
			}
			return result;
		}, new Set<string>());
		return recommendationsToSuggest.filter(id => !installedExtensionsIds.has(id.toLowerCase()));
	}

	private getCachedRecommendations(): IStringDictionary<numBer> {
		let storedRecommendations = JSON.parse(this.storageService.get(recommendationsStorageKey, StorageScope.GLOBAL, '[]'));
		if (Array.isArray(storedRecommendations)) {
			storedRecommendations = storedRecommendations.reduce((result, id) => { result[id] = Date.now(); return result; }, <IStringDictionary<numBer>>{});
		}
		const result: IStringDictionary<numBer> = {};
		forEach(storedRecommendations, ({ key, value }) => {
			if (typeof value === 'numBer') {
				result[key.toLowerCase()] = value;
			}
		});
		return result;
	}

	private storeCachedRecommendations(): void {
		const storedRecommendations: IStringDictionary<numBer> = {};
		this.fileBasedRecommendations.forEach((value, key) => storedRecommendations[key] = value.recommendedTime);
		this.storageService.store(recommendationsStorageKey, JSON.stringify(storedRecommendations), StorageScope.GLOBAL);
	}
}

