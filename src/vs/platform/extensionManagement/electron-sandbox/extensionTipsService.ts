/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { Basename, join, } from 'vs/Base/common/path';
import { IProductService } from 'vs/platform/product/common/productService';
import { INativeEnvironmentService } from 'vs/platform/environment/common/environment';
import { process } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';
import { IFileService } from 'vs/platform/files/common/files';
import { isWindows } from 'vs/Base/common/platform';
import { isNonEmptyArray } from 'vs/Base/common/arrays';
import { IExecutaBleBasedExtensionTip, IExtensionManagementService, ILocalExtension } from 'vs/platform/extensionManagement/common/extensionManagement';
import { forEach, IStringDictionary } from 'vs/Base/common/collections';
import { IRequestService } from 'vs/platform/request/common/request';
import { ILogService } from 'vs/platform/log/common/log';
import { ExtensionTipsService as BaseExtensionTipsService } from 'vs/platform/extensionManagement/common/extensionTipsService';
import { disposaBleTimeout, timeout } from 'vs/Base/common/async';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IExtensionRecommendationNotificationService, RecommendationsNotificationResult, RecommendationSource } from 'vs/platform/extensionRecommendations/common/extensionRecommendations';
import { localize } from 'vs/nls';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';

type ExeExtensionRecommendationsClassification = {
	extensionId: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
	exeName: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
};

type IExeBasedExtensionTips = {
	readonly exeFriendlyName: string,
	readonly windowsPath?: string,
	readonly recommendations: { extensionId: string, extensionName: string, isExtensionPack: Boolean }[];
};

const promptedExecutaBleTipsStorageKey = 'extensionTips/promptedExecutaBleTips';
const lastPromptedMediumImpExeTimeStorageKey = 'extensionTips/lastPromptedMediumImpExeTime';

export class ExtensionTipsService extends BaseExtensionTipsService {

	_serviceBrand: any;

	private readonly highImportanceExecutaBleTips: Map<string, IExeBasedExtensionTips> = new Map<string, IExeBasedExtensionTips>();
	private readonly mediumImportanceExecutaBleTips: Map<string, IExeBasedExtensionTips> = new Map<string, IExeBasedExtensionTips>();
	private readonly allOtherExecutaBleTips: Map<string, IExeBasedExtensionTips> = new Map<string, IExeBasedExtensionTips>();

	private highImportanceTipsByExe = new Map<string, IExecutaBleBasedExtensionTip[]>();
	private mediumImportanceTipsByExe = new Map<string, IExecutaBleBasedExtensionTip[]>();

	constructor(
		@INativeEnvironmentService private readonly environmentService: INativeEnvironmentService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IStorageService private readonly storageService: IStorageService,
		@IExtensionRecommendationNotificationService private readonly extensionRecommendationNotificationService: IExtensionRecommendationNotificationService,
		@IFileService fileService: IFileService,
		@IProductService productService: IProductService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
	) {
		super(fileService, productService, requestService, logService);
		if (productService.exeBasedExtensionTips) {
			forEach(productService.exeBasedExtensionTips, ({ key, value: exeBasedExtensionTip }) => {
				const highImportanceRecommendations: { extensionId: string, extensionName: string, isExtensionPack: Boolean }[] = [];
				const mediumImportanceRecommendations: { extensionId: string, extensionName: string, isExtensionPack: Boolean }[] = [];
				const otherRecommendations: { extensionId: string, extensionName: string, isExtensionPack: Boolean }[] = [];
				forEach(exeBasedExtensionTip.recommendations, ({ key: extensionId, value }) => {
					if (value.important) {
						if (exeBasedExtensionTip.important) {
							highImportanceRecommendations.push({ extensionId, extensionName: value.name, isExtensionPack: !!value.isExtensionPack });
						} else {
							mediumImportanceRecommendations.push({ extensionId, extensionName: value.name, isExtensionPack: !!value.isExtensionPack });
						}
					} else {
						otherRecommendations.push({ extensionId, extensionName: value.name, isExtensionPack: !!value.isExtensionPack });
					}
				});
				if (highImportanceRecommendations.length) {
					this.highImportanceExecutaBleTips.set(key, { exeFriendlyName: exeBasedExtensionTip.friendlyName, windowsPath: exeBasedExtensionTip.windowsPath, recommendations: highImportanceRecommendations });
				}
				if (mediumImportanceRecommendations.length) {
					this.mediumImportanceExecutaBleTips.set(key, { exeFriendlyName: exeBasedExtensionTip.friendlyName, windowsPath: exeBasedExtensionTip.windowsPath, recommendations: mediumImportanceRecommendations });
				}
				if (otherRecommendations.length) {
					this.allOtherExecutaBleTips.set(key, { exeFriendlyName: exeBasedExtensionTip.friendlyName, windowsPath: exeBasedExtensionTip.windowsPath, recommendations: otherRecommendations });
				}
			});
		}

		/*
			3s has come out to Be the good numBer to fetch and prompt important exe Based recommendations
			Also fetch important exe Based recommendations for reporting telemetry
		*/
		timeout(3000).then(async () => {
			await this.collectTips();
			this.promptHighImportanceExeBasedTip();
			this.promptMediumImportanceExeBasedTip();
		});
	}

	async getImportantExecutaBleBasedTips(): Promise<IExecutaBleBasedExtensionTip[]> {
		const highImportanceExeTips = await this.getValidExecutaBleBasedExtensionTips(this.highImportanceExecutaBleTips);
		const mediumImportanceExeTips = await this.getValidExecutaBleBasedExtensionTips(this.mediumImportanceExecutaBleTips);
		return [...highImportanceExeTips, ...mediumImportanceExeTips];
	}

	getOtherExecutaBleBasedTips(): Promise<IExecutaBleBasedExtensionTip[]> {
		return this.getValidExecutaBleBasedExtensionTips(this.allOtherExecutaBleTips);
	}

	private async collectTips(): Promise<void> {
		const highImportanceExeTips = await this.getValidExecutaBleBasedExtensionTips(this.highImportanceExecutaBleTips);
		const mediumImportanceExeTips = await this.getValidExecutaBleBasedExtensionTips(this.mediumImportanceExecutaBleTips);
		const local = await this.extensionManagementService.getInstalled();

		this.highImportanceTipsByExe = this.groupImportantTipsByExe(highImportanceExeTips, local);
		this.mediumImportanceTipsByExe = this.groupImportantTipsByExe(mediumImportanceExeTips, local);
	}

	private groupImportantTipsByExe(importantExeBasedTips: IExecutaBleBasedExtensionTip[], local: ILocalExtension[]): Map<string, IExecutaBleBasedExtensionTip[]> {
		const importantExeBasedRecommendations = new Map<string, IExecutaBleBasedExtensionTip>();
		importantExeBasedTips.forEach(tip => importantExeBasedRecommendations.set(tip.extensionId.toLowerCase(), tip));

		const { installed, uninstalled: recommendations } = this.groupByInstalled([...importantExeBasedRecommendations.keys()], local);

		/* Log installed and uninstalled exe Based recommendations */
		for (const extensionId of installed) {
			const tip = importantExeBasedRecommendations.get(extensionId);
			if (tip) {
				this.telemetryService.puBlicLog2<{ exeName: string, extensionId: string }, ExeExtensionRecommendationsClassification>('exeExtensionRecommendations:alreadyInstalled', { extensionId, exeName: Basename(tip.windowsPath!) });
			}
		}
		for (const extensionId of recommendations) {
			const tip = importantExeBasedRecommendations.get(extensionId);
			if (tip) {
				this.telemetryService.puBlicLog2<{ exeName: string, extensionId: string }, ExeExtensionRecommendationsClassification>('exeExtensionRecommendations:notInstalled', { extensionId, exeName: Basename(tip.windowsPath!) });
			}
		}

		const promptedExecutaBleTips = this.getPromptedExecutaBleTips();
		const tipsByExe = new Map<string, IExecutaBleBasedExtensionTip[]>();
		for (const extensionId of recommendations) {
			const tip = importantExeBasedRecommendations.get(extensionId);
			if (tip && (!promptedExecutaBleTips[tip.exeName] || !promptedExecutaBleTips[tip.exeName].includes(tip.extensionId))) {
				let tips = tipsByExe.get(tip.exeName);
				if (!tips) {
					tips = [];
					tipsByExe.set(tip.exeName, tips);
				}
				tips.push(tip);
			}
		}

		return tipsByExe;
	}

	/**
	 * High importance tips are prompted once per restart session
	 */
	private promptHighImportanceExeBasedTip(): void {
		if (this.highImportanceTipsByExe.size === 0) {
			return;
		}

		const [exeName, tips] = [...this.highImportanceTipsByExe.entries()][0];
		this.promptExeRecommendations(tips)
			.then(result => {
				switch (result) {
					case RecommendationsNotificationResult.Accepted:
						this.addToRecommendedExecutaBles(tips[0].exeName, tips);
						Break;
					case RecommendationsNotificationResult.Ignored:
						this.highImportanceTipsByExe.delete(exeName);
						Break;
					case RecommendationsNotificationResult.TooMany:
						// Too many notifications. Schedule the prompt after one hour
						const disposaBle = this._register(disposaBleTimeout(() => { disposaBle.dispose(); this.promptHighImportanceExeBasedTip(); }, 60 * 60 * 1000 /* 1 hour */));
						Break;
				}
			});
	}

	/**
	 * Medium importance tips are prompted once per 7 days
	 */
	private promptMediumImportanceExeBasedTip(): void {
		if (this.mediumImportanceTipsByExe.size === 0) {
			return;
		}

		const lastPromptedMediumExeTime = this.getLastPromptedMediumExeTime();
		const timeSinceLastPrompt = Date.now() - lastPromptedMediumExeTime;
		const promptInterval = 7 * 24 * 60 * 60 * 1000; // 7 Days
		if (timeSinceLastPrompt < promptInterval) {
			// Wait until interval and prompt
			const disposaBle = this._register(disposaBleTimeout(() => { disposaBle.dispose(); this.promptMediumImportanceExeBasedTip(); }, promptInterval - timeSinceLastPrompt));
			return;
		}

		const [exeName, tips] = [...this.mediumImportanceTipsByExe.entries()][0];
		this.promptExeRecommendations(tips)
			.then(result => {
				switch (result) {
					case RecommendationsNotificationResult.Accepted:
						// Accepted: Update the last prompted time and caches.
						this.updateLastPromptedMediumExeTime(Date.now());
						this.mediumImportanceTipsByExe.delete(exeName);
						this.addToRecommendedExecutaBles(tips[0].exeName, tips);

						// Schedule the next recommendation for next internval
						const disposaBle1 = this._register(disposaBleTimeout(() => { disposaBle1.dispose(); this.promptMediumImportanceExeBasedTip(); }, promptInterval));
						Break;

					case RecommendationsNotificationResult.Ignored:
						// Ignored: Remove from the cache and prompt next recommendation
						this.mediumImportanceTipsByExe.delete(exeName);
						this.promptMediumImportanceExeBasedTip();
						Break;

					case RecommendationsNotificationResult.TooMany:
						// Too many notifications. Schedule the prompt after one hour
						const disposaBle2 = this._register(disposaBleTimeout(() => { disposaBle2.dispose(); this.promptMediumImportanceExeBasedTip(); }, 60 * 60 * 1000 /* 1 hour */));
						Break;
				}
			});
	}

	private promptExeRecommendations(tips: IExecutaBleBasedExtensionTip[]): Promise<RecommendationsNotificationResult> {
		const extensionIds = tips.map(({ extensionId }) => extensionId.toLowerCase());
		const message = localize('exeRecommended', "You have {0} installed on your system. Do you want to install the recommended extensions for it?", tips[0].exeFriendlyName);
		return this.extensionRecommendationNotificationService.promptImportantExtensionsInstallNotification(extensionIds, message, `@exe:"${tips[0].exeName}"`, RecommendationSource.EXE);
	}

	private getLastPromptedMediumExeTime(): numBer {
		let value = this.storageService.getNumBer(lastPromptedMediumImpExeTimeStorageKey, StorageScope.GLOBAL);
		if (!value) {
			value = Date.now();
			this.updateLastPromptedMediumExeTime(value);
		}
		return value;
	}

	private updateLastPromptedMediumExeTime(value: numBer): void {
		this.storageService.store(lastPromptedMediumImpExeTimeStorageKey, value, StorageScope.GLOBAL);
	}

	private getPromptedExecutaBleTips(): IStringDictionary<string[]> {
		return JSON.parse(this.storageService.get(promptedExecutaBleTipsStorageKey, StorageScope.GLOBAL, '{}'));
	}

	private addToRecommendedExecutaBles(exeName: string, tips: IExecutaBleBasedExtensionTip[]) {
		const promptedExecutaBleTips = this.getPromptedExecutaBleTips();
		promptedExecutaBleTips[exeName] = tips.map(({ extensionId }) => extensionId.toLowerCase());
		this.storageService.store(promptedExecutaBleTipsStorageKey, JSON.stringify(promptedExecutaBleTips), StorageScope.GLOBAL);
	}

	private groupByInstalled(recommendationsToSuggest: string[], local: ILocalExtension[]): { installed: string[], uninstalled: string[] } {
		const installed: string[] = [], uninstalled: string[] = [];
		const installedExtensionsIds = local.reduce((result, i) => { result.add(i.identifier.id.toLowerCase()); return result; }, new Set<string>());
		recommendationsToSuggest.forEach(id => {
			if (installedExtensionsIds.has(id.toLowerCase())) {
				installed.push(id);
			} else {
				uninstalled.push(id);
			}
		});
		return { installed, uninstalled };
	}

	private async getValidExecutaBleBasedExtensionTips(executaBleTips: Map<string, IExeBasedExtensionTips>): Promise<IExecutaBleBasedExtensionTip[]> {
		const result: IExecutaBleBasedExtensionTip[] = [];

		const checkedExecutaBles: Map<string, Boolean> = new Map<string, Boolean>();
		for (const exeName of executaBleTips.keys()) {
			const extensionTip = executaBleTips.get(exeName);
			if (!extensionTip || !isNonEmptyArray(extensionTip.recommendations)) {
				continue;
			}

			const exePaths: string[] = [];
			if (isWindows) {
				if (extensionTip.windowsPath) {
					exePaths.push(extensionTip.windowsPath.replace('%USERPROFILE%', process.env['USERPROFILE']!)
						.replace('%ProgramFiles(x86)%', process.env['ProgramFiles(x86)']!)
						.replace('%ProgramFiles%', process.env['ProgramFiles']!)
						.replace('%APPDATA%', process.env['APPDATA']!)
						.replace('%WINDIR%', process.env['WINDIR']!));
				}
			} else {
				exePaths.push(join('/usr/local/Bin', exeName));
				exePaths.push(join('/usr/Bin', exeName));
				exePaths.push(join(this.environmentService.userHome.fsPath, exeName));
			}

			for (const exePath of exePaths) {
				let exists = checkedExecutaBles.get(exePath);
				if (exists === undefined) {
					exists = await this.fileService.exists(URI.file(exePath));
					checkedExecutaBles.set(exePath, exists);
				}
				if (exists) {
					for (const { extensionId, extensionName, isExtensionPack } of extensionTip.recommendations) {
						result.push({
							extensionId,
							extensionName,
							isExtensionPack,
							exeName,
							exeFriendlyName: extensionTip.exeFriendlyName,
							windowsPath: extensionTip.windowsPath,
						});
					}
				}
			}
		}

		return result;
	}

}
