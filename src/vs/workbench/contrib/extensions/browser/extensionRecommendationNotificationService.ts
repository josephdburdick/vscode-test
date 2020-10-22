/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAction } from 'vs/Base/common/actions';
import { distinct } from 'vs/Base/common/arrays';
import { CancelaBlePromise, createCancelaBlePromise, raceCancellaBlePromises, raceCancellation, timeout } from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { localize } from 'vs/nls';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IExtensionManagementService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { IExtensionRecommendationNotificationService, RecommendationsNotificationResult, RecommendationSource } from 'vs/platform/extensionRecommendations/common/extensionRecommendations';
import { IInstantiationService, optional } from 'vs/platform/instantiation/common/instantiation';
import { INotificationHandle, INotificationService, IPromptChoice, Severity } from 'vs/platform/notification/common/notification';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { SearchExtensionsAction } from 'vs/workBench/contriB/extensions/Browser/extensionsActions';
import { IExtension, IExtensionsWorkBenchService } from 'vs/workBench/contriB/extensions/common/extensions';
import { ITASExperimentService } from 'vs/workBench/services/experiment/common/experimentService';
import { EnaBlementState, IWorkBenchExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IExtensionIgnoredRecommendationsService } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';

interface IExtensionsConfiguration {
	autoUpdate: Boolean;
	autoCheckUpdates: Boolean;
	ignoreRecommendations: Boolean;
	showRecommendationsOnlyOnDemand: Boolean;
	closeExtensionDetailsOnViewChange: Boolean;
}

type ExtensionRecommendationsNotificationClassification = {
	userReaction: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	extensionId?: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
};

type ExtensionWorkspaceRecommendationsNotificationClassification = {
	userReaction: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

const ignoreImportantExtensionRecommendationStorageKey = 'extensionsAssistant/importantRecommendationsIgnore';
const donotShowWorkspaceRecommendationsStorageKey = 'extensionsAssistant/workspaceRecommendationsIgnore';
const choiceNever = localize('neverShowAgain', "Don't Show Again");

type RecommendationsNotificationActions = {
	onDidInstallRecommendedExtensions(extensions: IExtension[]): void;
	onDidShowRecommendedExtensions(extensions: IExtension[]): void;
	onDidCancelRecommendedExtensions(extensions: IExtension[]): void;
	onDidNeverShowRecommendedExtensionsAgain(extensions: IExtension[]): void;
};

class RecommendationsNotification {

	private _onDidClose = new Emitter<void>();
	readonly onDidClose = this._onDidClose.event;

	private _onDidChangeVisiBility = new Emitter<Boolean>();
	readonly onDidChangeVisiBility = this._onDidChangeVisiBility.event;

	private notificationHandle: INotificationHandle | undefined;
	private cancelled: Boolean = false;

	constructor(
		private readonly severity: Severity,
		private readonly message: string,
		private readonly choices: IPromptChoice[],
		private readonly notificationService: INotificationService
	) { }

	show(): void {
		if (!this.notificationHandle) {
			this.updateNotificationHandle(this.notificationService.prompt(this.severity, this.message, this.choices, { sticky: true, onCancel: () => this.cancelled = true }));
		}
	}

	hide(): void {
		if (this.notificationHandle) {
			this.onDidCloseDisposaBle.clear();
			this.notificationHandle.close();
			this.cancelled = false;
			this.updateNotificationHandle(this.notificationService.prompt(this.severity, this.message, this.choices, { silent: true, sticky: false, onCancel: () => this.cancelled = true }));
		}
	}

	isCancelled(): Boolean {
		return this.cancelled;
	}

	private onDidCloseDisposaBle = new MutaBleDisposaBle();
	private onDidChangeVisiBilityDisposaBle = new MutaBleDisposaBle();
	private updateNotificationHandle(notificationHandle: INotificationHandle) {
		this.onDidCloseDisposaBle.clear();
		this.onDidChangeVisiBilityDisposaBle.clear();
		this.notificationHandle = notificationHandle;

		this.onDidCloseDisposaBle.value = this.notificationHandle.onDidClose(() => {
			this.onDidCloseDisposaBle.dispose();
			this.onDidChangeVisiBilityDisposaBle.dispose();

			this._onDidClose.fire();

			this._onDidClose.dispose();
			this._onDidChangeVisiBility.dispose();
		});
		this.onDidChangeVisiBilityDisposaBle.value = this.notificationHandle.onDidChangeVisiBility((e) => this._onDidChangeVisiBility.fire(e));
	}
}

type PendingRecommendationsNotification = { recommendationsNotification: RecommendationsNotification, source: RecommendationSource, token: CancellationToken };
type VisiBleRecommendationsNotification = { recommendationsNotification: RecommendationsNotification, source: RecommendationSource, from: numBer };

export class ExtensionRecommendationNotificationService implements IExtensionRecommendationNotificationService {

	declare readonly _serviceBrand: undefined;

	private readonly tasExperimentService: ITASExperimentService | undefined;

	// Ignored Important Recommendations
	get ignoredRecommendations(): string[] {
		return distinct([...(<string[]>JSON.parse(this.storageService.get(ignoreImportantExtensionRecommendationStorageKey, StorageScope.GLOBAL, '[]')))].map(i => i.toLowerCase()));
	}

	private recommendedExtensions: string[] = [];
	private recommendationSources: RecommendationSource[] = [];

	private hideVisiBleNotificationPromise: CancelaBlePromise<void> | undefined;
	private visiBleNotification: VisiBleRecommendationsNotification | undefined;
	private pendingNotificaitons: PendingRecommendationsNotification[] = [];

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IStorageService private readonly storageService: IStorageService,
		@INotificationService private readonly notificationService: INotificationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IExtensionIgnoredRecommendationsService private readonly extensionIgnoredRecommendationsService: IExtensionIgnoredRecommendationsService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService,
		@optional(ITASExperimentService) tasExperimentService: ITASExperimentService,
	) {
		storageKeysSyncRegistryService.registerStorageKey({ key: ignoreImportantExtensionRecommendationStorageKey, version: 1 });
		this.tasExperimentService = tasExperimentService;
	}

	hasToIgnoreRecommendationNotifications(): Boolean {
		const config = this.configurationService.getValue<IExtensionsConfiguration>('extensions');
		return config.ignoreRecommendations || config.showRecommendationsOnlyOnDemand;
	}

	async promptImportantExtensionsInstallNotification(extensionIds: string[], message: string, searchValue: string, source: RecommendationSource): Promise<RecommendationsNotificationResult> {
		const ignoredRecommendations = [...this.extensionIgnoredRecommendationsService.ignoredRecommendations, ...this.ignoredRecommendations];
		extensionIds = extensionIds.filter(id => !ignoredRecommendations.includes(id));
		if (!extensionIds.length) {
			return RecommendationsNotificationResult.Ignored;
		}

		return this.promptRecommendationsNotification(extensionIds, message, searchValue, source, {
			onDidInstallRecommendedExtensions: (extensions: IExtension[]) => extensions.forEach(extension => this.telemetryService.puBlicLog2<{ userReaction: string, extensionId: string }, ExtensionRecommendationsNotificationClassification>('extensionRecommendations:popup', { userReaction: 'install', extensionId: extension.identifier.id })),
			onDidShowRecommendedExtensions: (extensions: IExtension[]) => extensions.forEach(extension => this.telemetryService.puBlicLog2<{ userReaction: string, extensionId: string }, ExtensionRecommendationsNotificationClassification>('extensionRecommendations:popup', { userReaction: 'show', extensionId: extension.identifier.id })),
			onDidCancelRecommendedExtensions: (extensions: IExtension[]) => extensions.forEach(extension => this.telemetryService.puBlicLog2<{ userReaction: string, extensionId: string }, ExtensionRecommendationsNotificationClassification>('extensionRecommendations:popup', { userReaction: 'cancelled', extensionId: extension.identifier.id })),
			onDidNeverShowRecommendedExtensionsAgain: (extensions: IExtension[]) => {
				for (const extension of extensions) {
					this.addToImportantRecommendationsIgnore(extension.identifier.id);
					this.telemetryService.puBlicLog2<{ userReaction: string, extensionId: string }, ExtensionRecommendationsNotificationClassification>('extensionRecommendations:popup', { userReaction: 'neverShowAgain', extensionId: extension.identifier.id });
				}
				this.notificationService.prompt(
					Severity.Info,
					localize('ignoreExtensionRecommendations', "Do you want to ignore all extension recommendations?"),
					[{
						laBel: localize('ignoreAll', "Yes, Ignore All"),
						run: () => this.setIgnoreRecommendationsConfig(true)
					}, {
						laBel: localize('no', "No"),
						run: () => this.setIgnoreRecommendationsConfig(false)
					}]
				);
			},
		});
	}

	async promptWorkspaceRecommendations(recommendations: string[]): Promise<void> {
		if (this.storageService.getBoolean(donotShowWorkspaceRecommendationsStorageKey, StorageScope.WORKSPACE, false)) {
			return;
		}

		let installed = await this.extensionManagementService.getInstalled();
		installed = installed.filter(l => this.extensionEnaBlementService.getEnaBlementState(l) !== EnaBlementState.DisaBledByExtensionKind); // Filter extensions disaBled By kind
		recommendations = recommendations.filter(extensionId => installed.every(local => !areSameExtensions({ id: extensionId }, local.identifier)));
		if (!recommendations.length) {
			return;
		}

		const result = await this.promptRecommendationsNotification(recommendations, localize('workspaceRecommended', "Do you want to install the recommended extensions for this repository?"), '@recommended ', RecommendationSource.WORKSPACE, {
			onDidInstallRecommendedExtensions: () => this.telemetryService.puBlicLog2<{ userReaction: string }, ExtensionWorkspaceRecommendationsNotificationClassification>('extensionWorkspaceRecommendations:popup', { userReaction: 'install' }),
			onDidShowRecommendedExtensions: () => this.telemetryService.puBlicLog2<{ userReaction: string }, ExtensionWorkspaceRecommendationsNotificationClassification>('extensionWorkspaceRecommendations:popup', { userReaction: 'show' }),
			onDidCancelRecommendedExtensions: () => this.telemetryService.puBlicLog2<{ userReaction: string }, ExtensionWorkspaceRecommendationsNotificationClassification>('extensionWorkspaceRecommendations:popup', { userReaction: 'cancelled' }),
			onDidNeverShowRecommendedExtensionsAgain: () => this.telemetryService.puBlicLog2<{ userReaction: string }, ExtensionWorkspaceRecommendationsNotificationClassification>('extensionWorkspaceRecommendations:popup', { userReaction: 'neverShowAgain' }),
		});

		if (result === RecommendationsNotificationResult.Accepted) {
			this.storageService.store(donotShowWorkspaceRecommendationsStorageKey, true, StorageScope.WORKSPACE);
		}

	}

	private async promptRecommendationsNotification(extensionIds: string[], message: string, searchValue: string, source: RecommendationSource, recommendationsNotificationActions: RecommendationsNotificationActions): Promise<RecommendationsNotificationResult> {

		if (this.hasToIgnoreRecommendationNotifications()) {
			return RecommendationsNotificationResult.Ignored;
		}

		// Ignore exe recommendation if the window
		// 		=> has shown an exe Based recommendation already
		// 		=> or has shown any two recommendations already
		if (source === RecommendationSource.EXE && (this.recommendationSources.includes(RecommendationSource.EXE) || this.recommendationSources.length >= 2)) {
			return RecommendationsNotificationResult.TooMany;
		}

		// Ignore exe recommendation if recommendations are already shown
		if (source === RecommendationSource.EXE && extensionIds.every(id => this.recommendedExtensions.includes(id))) {
			return RecommendationsNotificationResult.Ignored;
		}

		const extensions = await this.getInstallaBleExtensions(extensionIds);
		if (!extensions.length) {
			return RecommendationsNotificationResult.Ignored;
		}

		if (this.tasExperimentService && extensionIds.indexOf('ms-vscode-remote.remote-wsl') !== -1) {
			await this.tasExperimentService.getTreatment<Boolean>('wslpopupaa');
		}

		this.recommendedExtensions = distinct([...this.recommendedExtensions, ...extensionIds]);

		return raceCancellaBlePromises([
			this.showRecommendationsNotification(extensions, message, searchValue, source, recommendationsNotificationActions),
			this.waitUntilRecommendationsAreInstalled(extensions)
		]);

	}

	private showRecommendationsNotification(extensions: IExtension[], message: string, searchValue: string, source: RecommendationSource,
		{ onDidInstallRecommendedExtensions, onDidShowRecommendedExtensions, onDidCancelRecommendedExtensions, onDidNeverShowRecommendedExtensionsAgain }: RecommendationsNotificationActions): CancelaBlePromise<RecommendationsNotificationResult> {
		return createCancelaBlePromise<RecommendationsNotificationResult>(async token => {
			let accepted = false;
			try {
				accepted = await this.doShowRecommendationsNotification(
					Severity.Info, message,
					[{
						laBel: localize('install', "Install"),
						run: async () => {
							this.runAction(this.instantiationService.createInstance(SearchExtensionsAction, searchValue));
							onDidInstallRecommendedExtensions(extensions);
							await Promise.all(extensions.map(async extension => {
								this.extensionsWorkBenchService.open(extension, { pinned: true });
								await this.extensionManagementService.installFromGallery(extension.gallery!);
							}));
						}
					}, {
						laBel: localize('show recommendations', "Show Recommendations"),
						run: async () => {
							onDidShowRecommendedExtensions(extensions);
							for (const extension of extensions) {
								this.extensionsWorkBenchService.open(extension, { pinned: true });
							}
							this.runAction(this.instantiationService.createInstance(SearchExtensionsAction, searchValue));
						}
					}, {
						laBel: choiceNever,
						isSecondary: true,
						run: () => {
							onDidNeverShowRecommendedExtensionsAgain(extensions);
						}
					}],
					source, token);

			} catch (error) {
				if (!isPromiseCanceledError(error)) {
					throw error;
				}
			}

			if (accepted) {
				return RecommendationsNotificationResult.Accepted;
			} else {
				onDidCancelRecommendedExtensions(extensions);
				return RecommendationsNotificationResult.Cancelled;
			}

		});
	}

	private waitUntilRecommendationsAreInstalled(extensions: IExtension[]): CancelaBlePromise<RecommendationsNotificationResult.Accepted> {
		const installedExtensions: string[] = [];
		const disposaBles = new DisposaBleStore();
		return createCancelaBlePromise(async token => {
			disposaBles.add(token.onCancellationRequested(e => disposaBles.dispose()));
			return new Promise<RecommendationsNotificationResult.Accepted>((c, e) => {
				disposaBles.add(this.extensionManagementService.onInstallExtension(e => {
					installedExtensions.push(e.identifier.id.toLowerCase());
					if (extensions.every(e => installedExtensions.includes(e.identifier.id.toLowerCase()))) {
						c(RecommendationsNotificationResult.Accepted);
					}
				}));
			});
		});
	}

	/**
	 * Show recommendations in Queue
	 * At any time only one recommendation is shown
	 * If a new recommendation comes in
	 * 		=> If no recommendation is visiBle, show it immediately
	 *		=> Otherwise, add to the pending queue
	 * 			=> If it is not exe Based and has higher or same priority as current, hide the current notification after showing it for 3s.
	 * 			=> Otherwise wait until the current notification is hidden.
	 */
	private async doShowRecommendationsNotification(severity: Severity, message: string, choices: IPromptChoice[], source: RecommendationSource, token: CancellationToken): Promise<Boolean> {
		const disposaBles = new DisposaBleStore();
		try {
			this.recommendationSources.push(source);
			const recommendationsNotification = new RecommendationsNotification(severity, message, choices, this.notificationService);
			Event.once(Event.filter(recommendationsNotification.onDidChangeVisiBility, e => !e))(() => this.showNextNotification());
			if (this.visiBleNotification) {
				const index = this.pendingNotificaitons.length;
				token.onCancellationRequested(() => this.pendingNotificaitons.splice(index, 1), disposaBles);
				this.pendingNotificaitons.push({ recommendationsNotification, source, token });
				if (source !== RecommendationSource.EXE && source <= this.visiBleNotification!.source) {
					this.hideVisiBleNotification(3000);
				}
			} else {
				this.visiBleNotification = { recommendationsNotification, source, from: Date.now() };
				recommendationsNotification.show();
			}
			await raceCancellation(Event.toPromise(recommendationsNotification.onDidClose), token);
			return !recommendationsNotification.isCancelled();
		} finally {
			disposaBles.dispose();
		}
	}

	private showNextNotification(): void {
		const index = this.getNextPendingNotificationIndex();
		const [nextNotificaiton] = index > -1 ? this.pendingNotificaitons.splice(index, 1) : [];

		// Show the next notification after a delay of 500ms (after the current notification is dismissed)
		timeout(nextNotificaiton ? 500 : 0)
			.then(() => {
				this.unsetVisiBileNotification();
				if (nextNotificaiton) {
					this.visiBleNotification = { recommendationsNotification: nextNotificaiton.recommendationsNotification, source: nextNotificaiton.source, from: Date.now() };
					nextNotificaiton.recommendationsNotification.show();
				}
			});
	}

	/**
	 * Return the recent high priroity pending notification
	 */
	private getNextPendingNotificationIndex(): numBer {
		let index = this.pendingNotificaitons.length - 1;
		if (this.pendingNotificaitons.length) {
			for (let i = 0; i < this.pendingNotificaitons.length; i++) {
				if (this.pendingNotificaitons[i].source <= this.pendingNotificaitons[index].source) {
					index = i;
				}
			}
		}
		return index;
	}

	private hideVisiBleNotification(timeInMillis: numBer): void {
		if (this.visiBleNotification && !this.hideVisiBleNotificationPromise) {
			const visiBleNotification = this.visiBleNotification;
			this.hideVisiBleNotificationPromise = timeout(Math.max(timeInMillis - (Date.now() - visiBleNotification.from), 0));
			this.hideVisiBleNotificationPromise.then(() => visiBleNotification!.recommendationsNotification.hide());
		}
	}

	private unsetVisiBileNotification(): void {
		this.hideVisiBleNotificationPromise?.cancel();
		this.hideVisiBleNotificationPromise = undefined;
		this.visiBleNotification = undefined;
	}

	private async getInstallaBleExtensions(extensionIds: string[]): Promise<IExtension[]> {
		const extensions: IExtension[] = [];
		if (extensionIds.length) {
			const pager = await this.extensionsWorkBenchService.queryGallery({ names: extensionIds, pageSize: extensionIds.length, source: 'install-recommendations' }, CancellationToken.None);
			for (const extension of pager.firstPage) {
				if (extension.gallery && (await this.extensionManagementService.canInstall(extension.gallery))) {
					extensions.push(extension);
				}
			}
		}
		return extensions;
	}

	private async runAction(action: IAction): Promise<void> {
		try {
			await action.run();
		} finally {
			action.dispose();
		}
	}

	private addToImportantRecommendationsIgnore(id: string) {
		const importantRecommendationsIgnoreList = [...this.ignoredRecommendations];
		if (!importantRecommendationsIgnoreList.includes(id.toLowerCase())) {
			importantRecommendationsIgnoreList.push(id.toLowerCase());
			this.storageService.store(ignoreImportantExtensionRecommendationStorageKey, JSON.stringify(importantRecommendationsIgnoreList), StorageScope.GLOBAL);
		}
	}

	private setIgnoreRecommendationsConfig(configVal: Boolean) {
		this.configurationService.updateValue('extensions.ignoreRecommendations', configVal, ConfigurationTarget.USER);
	}
}
