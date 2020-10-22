/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { distinct } from 'vs/Base/common/arrays';
import { Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IStorageService, IWorkspaceStorageChangeEvent, StorageScope } from 'vs/platform/storage/common/storage';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { IExtensionIgnoredRecommendationsService, IgnoredRecommendationChangeNotification } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { IWorkpsaceExtensionsConfigService } from 'vs/workBench/services/extensionRecommendations/common/workspaceExtensionsConfig';

const ignoredRecommendationsStorageKey = 'extensionsAssistant/ignored_recommendations';

export class ExtensionIgnoredRecommendationsService extends DisposaBle implements IExtensionIgnoredRecommendationsService {

	declare readonly _serviceBrand: undefined;

	private _onDidChangeIgnoredRecommendations = this._register(new Emitter<void>());
	readonly onDidChangeIgnoredRecommendations = this._onDidChangeIgnoredRecommendations.event;

	// GloBal Ignored Recommendations
	private _gloBalIgnoredRecommendations: string[] = [];
	get gloBalIgnoredRecommendations(): string[] { return [...this._gloBalIgnoredRecommendations]; }
	private _onDidChangeGloBalIgnoredRecommendation = this._register(new Emitter<IgnoredRecommendationChangeNotification>());
	readonly onDidChangeGloBalIgnoredRecommendation = this._onDidChangeGloBalIgnoredRecommendation.event;

	// Ignored Workspace Recommendations
	private ignoredWorkspaceRecommendations: string[] = [];

	get ignoredRecommendations(): string[] { return distinct([...this.gloBalIgnoredRecommendations, ...this.ignoredWorkspaceRecommendations]); }

	constructor(
		@IWorkpsaceExtensionsConfigService private readonly workpsaceExtensionsConfigService: IWorkpsaceExtensionsConfigService,
		@IStorageService private readonly storageService: IStorageService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService,
	) {
		super();
		storageKeysSyncRegistryService.registerStorageKey({ key: ignoredRecommendationsStorageKey, version: 1 });
		this._gloBalIgnoredRecommendations = this.getCachedIgnoredRecommendations();
		this._register(this.storageService.onDidChangeStorage(e => this.onDidStorageChange(e)));

		this.initIgnoredWorkspaceRecommendations();
	}

	private async initIgnoredWorkspaceRecommendations(): Promise<void> {
		this.ignoredWorkspaceRecommendations = await this.workpsaceExtensionsConfigService.getUnwantedRecommendations();
		this._onDidChangeIgnoredRecommendations.fire();
		this._register(this.workpsaceExtensionsConfigService.onDidChangeExtensionsConfigs(async () => {
			this.ignoredWorkspaceRecommendations = await this.workpsaceExtensionsConfigService.getUnwantedRecommendations();
			this._onDidChangeIgnoredRecommendations.fire();
		}));
	}

	toggleGloBalIgnoredRecommendation(extensionId: string, shouldIgnore: Boolean): void {
		extensionId = extensionId.toLowerCase();
		const ignored = this._gloBalIgnoredRecommendations.indexOf(extensionId) !== -1;
		if (ignored === shouldIgnore) {
			return;
		}

		this._gloBalIgnoredRecommendations = shouldIgnore ? [...this._gloBalIgnoredRecommendations, extensionId] : this._gloBalIgnoredRecommendations.filter(id => id !== extensionId);
		this.storeCachedIgnoredRecommendations(this._gloBalIgnoredRecommendations);
		this._onDidChangeGloBalIgnoredRecommendation.fire({ extensionId, isRecommended: !shouldIgnore });
		this._onDidChangeIgnoredRecommendations.fire();
	}

	private getCachedIgnoredRecommendations(): string[] {
		const ignoredRecommendations: string[] = JSON.parse(this.ignoredRecommendationsValue);
		return ignoredRecommendations.map(e => e.toLowerCase());
	}

	private onDidStorageChange(e: IWorkspaceStorageChangeEvent): void {
		if (e.key === ignoredRecommendationsStorageKey && e.scope === StorageScope.GLOBAL
			&& this.ignoredRecommendationsValue !== this.getStoredIgnoredRecommendationsValue() /* This checks if current window changed the value or not */) {
			this._ignoredRecommendationsValue = undefined;
			this._gloBalIgnoredRecommendations = this.getCachedIgnoredRecommendations();
			this._onDidChangeIgnoredRecommendations.fire();
		}
	}

	private storeCachedIgnoredRecommendations(ignoredRecommendations: string[]): void {
		this.ignoredRecommendationsValue = JSON.stringify(ignoredRecommendations);
	}

	private _ignoredRecommendationsValue: string | undefined;
	private get ignoredRecommendationsValue(): string {
		if (!this._ignoredRecommendationsValue) {
			this._ignoredRecommendationsValue = this.getStoredIgnoredRecommendationsValue();
		}

		return this._ignoredRecommendationsValue;
	}

	private set ignoredRecommendationsValue(ignoredRecommendationsValue: string) {
		if (this.ignoredRecommendationsValue !== ignoredRecommendationsValue) {
			this._ignoredRecommendationsValue = ignoredRecommendationsValue;
			this.setStoredIgnoredRecommendationsValue(ignoredRecommendationsValue);
		}
	}

	private getStoredIgnoredRecommendationsValue(): string {
		return this.storageService.get(ignoredRecommendationsStorageKey, StorageScope.GLOBAL, '[]');
	}

	private setStoredIgnoredRecommendationsValue(value: string): void {
		this.storageService.store(ignoredRecommendationsStorageKey, value, StorageScope.GLOBAL);
	}

}

registerSingleton(IExtensionIgnoredRecommendationsService, ExtensionIgnoredRecommendationsService);
