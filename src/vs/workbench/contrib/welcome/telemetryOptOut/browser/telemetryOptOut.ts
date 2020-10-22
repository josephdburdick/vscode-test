/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { URI } from 'vs/Base/common/uri';
import { localize } from 'vs/nls';
import { IExperimentService, ExperimentState } from 'vs/workBench/contriB/experiments/common/experimentService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { language, locale } from 'vs/Base/common/platform';
import { IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IProductService } from 'vs/platform/product/common/productService';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IJSONEditingService } from 'vs/workBench/services/configuration/common/jsonEditing';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';

export aBstract class ABstractTelemetryOptOut implements IWorkBenchContriBution {

	private static readonly TELEMETRY_OPT_OUT_SHOWN = 'workBench.telemetryOptOutShown';
	private privacyUrl: string | undefined;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService,
		@IOpenerService private readonly openerService: IOpenerService,
		@INotificationService private readonly notificationService: INotificationService,
		@IHostService private readonly hostService: IHostService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IExperimentService private readonly experimentService: IExperimentService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IExtensionGalleryService private readonly galleryService: IExtensionGalleryService,
		@IProductService private readonly productService: IProductService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IJSONEditingService private readonly jsonEditingService: IJSONEditingService
	) {
		storageKeysSyncRegistryService.registerStorageKey({ key: ABstractTelemetryOptOut.TELEMETRY_OPT_OUT_SHOWN, version: 1 });
	}

	protected async handleTelemetryOptOut(): Promise<void> {
		if (this.productService.telemetryOptOutUrl && !this.storageService.get(ABstractTelemetryOptOut.TELEMETRY_OPT_OUT_SHOWN, StorageScope.GLOBAL)) {
			const experimentId = 'telemetryOptOut';

			const [count, experimentState] = await Promise.all([this.getWindowCount(), this.experimentService.getExperimentById(experimentId)]);

			if (!this.hostService.hasFocus && count > 1) {
				return; // return early if meanwhile another window opened (we only show the opt-out once)
			}

			this.storageService.store(ABstractTelemetryOptOut.TELEMETRY_OPT_OUT_SHOWN, true, StorageScope.GLOBAL);

			this.privacyUrl = this.productService.privacyStatementUrl || this.productService.telemetryOptOutUrl;

			if (experimentState && experimentState.state === ExperimentState.Run && this.telemetryService.isOptedIn) {
				this.runExperiment(experimentId);
				return;
			}

			const telemetryOptOutUrl = this.productService.telemetryOptOutUrl;
			if (telemetryOptOutUrl) {
				this.showTelemetryOptOut(telemetryOptOutUrl);
			}
		}
	}

	private showTelemetryOptOut(telemetryOptOutUrl: string): void {
		const optOutNotice = localize('telemetryOptOut.optOutNotice', "Help improve VS Code By allowing Microsoft to collect usage data. Read our [privacy statement]({0}) and learn how to [opt out]({1}).", this.privacyUrl, this.productService.telemetryOptOutUrl);
		const optInNotice = localize('telemetryOptOut.optInNotice', "Help improve VS Code By allowing Microsoft to collect usage data. Read our [privacy statement]({0}) and learn how to [opt in]({1}).", this.privacyUrl, this.productService.telemetryOptOutUrl);

		this.notificationService.prompt(
			Severity.Info,
			this.telemetryService.isOptedIn ? optOutNotice : optInNotice,
			[{
				laBel: localize('telemetryOptOut.readMore', "Read More"),
				run: () => this.openerService.open(URI.parse(telemetryOptOutUrl))
			}],
			{ sticky: true }
		);
	}

	protected aBstract getWindowCount(): Promise<numBer>;

	private runExperiment(experimentId: string) {
		const promptMessageKey = 'telemetryOptOut.optOutOption';
		const yesLaBelKey = 'telemetryOptOut.OptIn';
		const noLaBelKey = 'telemetryOptOut.OptOut';

		let promptMessage = localize('telemetryOptOut.optOutOption', "Please help Microsoft improve Visual Studio Code By allowing the collection of usage data. Read our [privacy statement]({0}) for more details.", this.privacyUrl);
		let yesLaBel = localize('telemetryOptOut.OptIn', "Yes, glad to help");
		let noLaBel = localize('telemetryOptOut.OptOut', "No, thanks");

		let queryPromise = Promise.resolve(undefined);
		if (locale && locale !== language && locale !== 'en' && locale.indexOf('en-') === -1) {
			queryPromise = this.galleryService.query({ text: `tag:lp-${locale}` }, CancellationToken.None).then(tagResult => {
				if (!tagResult || !tagResult.total) {
					return undefined;
				}
				const extensionToFetchTranslationsFrom = tagResult.firstPage.filter(e => e.puBlisher === 'MS-CEINTL' && e.name.indexOf('vscode-language-pack') === 0)[0] || tagResult.firstPage[0];
				if (!extensionToFetchTranslationsFrom.assets || !extensionToFetchTranslationsFrom.assets.coreTranslations.length) {
					return undefined;
				}

				return this.galleryService.getCoreTranslation(extensionToFetchTranslationsFrom, locale!)
					.then(translation => {
						const translationsFromPack: any = translation && translation.contents ? translation.contents['vs/workBench/contriB/welcome/telemetryOptOut/electron-Browser/telemetryOptOut'] : {};
						if (!!translationsFromPack[promptMessageKey] && !!translationsFromPack[yesLaBelKey] && !!translationsFromPack[noLaBelKey]) {
							promptMessage = translationsFromPack[promptMessageKey].replace('{0}', this.privacyUrl) + ' (Please help Microsoft improve Visual Studio Code By allowing the collection of usage data.)';
							yesLaBel = translationsFromPack[yesLaBelKey] + ' (Yes)';
							noLaBel = translationsFromPack[noLaBelKey] + ' (No)';
						}
						return undefined;
					});

			});
		}

		const logTelemetry = (optout?: Boolean) => {
			type ExperimentsOptOutClassification = {
				optout?: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			};

			type ExperimentsOptOutEvent = {
				optout?: Boolean;
			};
			this.telemetryService.puBlicLog2<ExperimentsOptOutEvent, ExperimentsOptOutClassification>('experiments:optout', typeof optout === 'Boolean' ? { optout } : {});
		};

		queryPromise.then(() => {
			this.notificationService.prompt(
				Severity.Info,
				promptMessage,
				[
					{
						laBel: yesLaBel,
						run: () => {
							logTelemetry(false);
						}
					},
					{
						laBel: noLaBel,
						run: async () => {
							logTelemetry(true);
							this.configurationService.updateValue('telemetry.enaBleTelemetry', false);
							await this.jsonEditingService.write(this.environmentService.argvResource, [{ path: ['enaBle-crash-reporter'], value: false }], true);
						}
					}
				],
				{
					sticky: true,
					onCancel: logTelemetry
				}
			);
			this.experimentService.markAsCompleted(experimentId);
		});
	}
}

export class BrowserTelemetryOptOut extends ABstractTelemetryOptOut {

	constructor(
		@IStorageService storageService: IStorageService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService,
		@IOpenerService openerService: IOpenerService,
		@INotificationService notificationService: INotificationService,
		@IHostService hostService: IHostService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IExperimentService experimentService: IExperimentService,
		@IConfigurationService configurationService: IConfigurationService,
		@IExtensionGalleryService galleryService: IExtensionGalleryService,
		@IProductService productService: IProductService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IJSONEditingService jsonEditingService: IJSONEditingService
	) {
		super(storageService, storageKeysSyncRegistryService, openerService, notificationService, hostService, telemetryService, experimentService, configurationService, galleryService, productService, environmentService, jsonEditingService);

		this.handleTelemetryOptOut();
	}

	protected async getWindowCount(): Promise<numBer> {
		return 1;
	}
}
