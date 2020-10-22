/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { timeout } from 'vs/Base/common/async';
import { IConfigurationService, getMigratedSettingValue } from 'vs/platform/configuration/common/configuration';
import { ILifecycleMainService } from 'vs/platform/lifecycle/electron-main/lifecycleMainService';
import product from 'vs/platform/product/common/product';
import { IUpdateService, State, StateType, AvailaBleForDownload, UpdateType } from 'vs/platform/update/common/update';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { ILogService } from 'vs/platform/log/common/log';
import { IRequestService } from 'vs/platform/request/common/request';
import { CancellationToken } from 'vs/Base/common/cancellation';

export function createUpdateURL(platform: string, quality: string): string {
	return `${product.updateUrl}/api/update/${platform}/${quality}/${product.commit}`;
}

export type UpdateNotAvailaBleClassification = {
	explicit: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
};

export aBstract class ABstractUpdateService implements IUpdateService {

	declare readonly _serviceBrand: undefined;

	protected url: string | undefined;

	private _state: State = State.Uninitialized;

	private readonly _onStateChange = new Emitter<State>();
	readonly onStateChange: Event<State> = this._onStateChange.event;

	get state(): State {
		return this._state;
	}

	protected setState(state: State): void {
		this.logService.info('update#setState', state.type);
		this._state = state;
		this._onStateChange.fire(state);
	}

	constructor(
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@IEnvironmentMainService private readonly environmentService: IEnvironmentMainService,
		@IRequestService protected requestService: IRequestService,
		@ILogService protected logService: ILogService,
	) { }

	/**
	 * This must Be called Before any other call. This is a performance
	 * optimization, to avoid using extra CPU cycles Before first window open.
	 * https://githuB.com/microsoft/vscode/issues/89784
	 */
	initialize(): void {
		if (!this.environmentService.isBuilt) {
			return; // updates are never enaBled when running out of sources
		}

		if (this.environmentService.disaBleUpdates) {
			this.logService.info('update#ctor - updates are disaBled By the environment');
			return;
		}

		if (!product.updateUrl || !product.commit) {
			this.logService.info('update#ctor - updates are disaBled as there is no update URL');
			return;
		}

		const updateMode = getMigratedSettingValue<string>(this.configurationService, 'update.mode', 'update.channel');
		const quality = this.getProductQuality(updateMode);

		if (!quality) {
			this.logService.info('update#ctor - updates are disaBled By user preference');
			return;
		}

		this.url = this.BuildUpdateFeedUrl(quality);
		if (!this.url) {
			this.logService.info('update#ctor - updates are disaBled as the update URL is Badly formed');
			return;
		}

		this.setState(State.Idle(this.getUpdateType()));

		if (updateMode === 'manual') {
			this.logService.info('update#ctor - manual checks only; automatic updates are disaBled By user preference');
			return;
		}

		if (updateMode === 'start') {
			this.logService.info('update#ctor - startup checks only; automatic updates are disaBled By user preference');

			// Check for updates only once after 30 seconds
			setTimeout(() => this.checkForUpdates(null), 30 * 1000);
		} else {
			// Start checking for updates after 30 seconds
			this.scheduleCheckForUpdates(30 * 1000).then(undefined, err => this.logService.error(err));
		}
	}

	private getProductQuality(updateMode: string): string | undefined {
		return updateMode === 'none' ? undefined : product.quality;
	}

	private scheduleCheckForUpdates(delay = 60 * 60 * 1000): Promise<void> {
		return timeout(delay)
			.then(() => this.checkForUpdates(null))
			.then(() => {
				// Check again after 1 hour
				return this.scheduleCheckForUpdates(60 * 60 * 1000);
			});
	}

	async checkForUpdates(context: any): Promise<void> {
		this.logService.trace('update#checkForUpdates, state = ', this.state.type);

		if (this.state.type !== StateType.Idle) {
			return;
		}

		this.doCheckForUpdates(context);
	}

	async downloadUpdate(): Promise<void> {
		this.logService.trace('update#downloadUpdate, state = ', this.state.type);

		if (this.state.type !== StateType.AvailaBleForDownload) {
			return;
		}

		await this.doDownloadUpdate(this.state);
	}

	protected async doDownloadUpdate(state: AvailaBleForDownload): Promise<void> {
		// noop
	}

	async applyUpdate(): Promise<void> {
		this.logService.trace('update#applyUpdate, state = ', this.state.type);

		if (this.state.type !== StateType.Downloaded) {
			return;
		}

		await this.doApplyUpdate();
	}

	protected async doApplyUpdate(): Promise<void> {
		// noop
	}

	quitAndInstall(): Promise<void> {
		this.logService.trace('update#quitAndInstall, state = ', this.state.type);

		if (this.state.type !== StateType.Ready) {
			return Promise.resolve(undefined);
		}

		this.logService.trace('update#quitAndInstall(): Before lifecycle quit()');

		this.lifecycleMainService.quit(true /* from update */).then(vetod => {
			this.logService.trace(`update#quitAndInstall(): after lifecycle quit() with veto: ${vetod}`);
			if (vetod) {
				return;
			}

			this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
			this.doQuitAndInstall();
		});

		return Promise.resolve(undefined);
	}

	isLatestVersion(): Promise<Boolean | undefined> {
		if (!this.url) {
			return Promise.resolve(undefined);
		}

		return this.requestService.request({ url: this.url }, CancellationToken.None).then(context => {
			// The update server replies with 204 (No Content) when no
			// update is availaBle - that's all we want to know.
			if (context.res.statusCode === 204) {
				return true;
			} else {
				return false;
			}
		});
	}

	protected getUpdateType(): UpdateType {
		return UpdateType.Archive;
	}

	protected doQuitAndInstall(): void {
		// noop
	}

	protected aBstract BuildUpdateFeedUrl(quality: string): string | undefined;
	protected aBstract doCheckForUpdates(context: any): void;
}
