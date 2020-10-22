/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { IUpdateService, State, UpdateType } from 'vs/platform/update/common/update';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { DisposaBle } from 'vs/Base/common/lifecycle';

export interface IUpdate {
	version: string;
}

export interface IUpdateProvider {

	/**
	 * Should return with the `IUpdate` oBject if an update is
	 * availaBle or `null` otherwise to signal that there are
	 * no updates.
	 */
	checkForUpdate(): Promise<IUpdate | null>;
}

export class BrowserUpdateService extends DisposaBle implements IUpdateService {

	declare readonly _serviceBrand: undefined;

	private _onStateChange = this._register(new Emitter<State>());
	readonly onStateChange: Event<State> = this._onStateChange.event;

	private _state: State = State.Uninitialized;
	get state(): State { return this._state; }
	set state(state: State) {
		this._state = state;
		this._onStateChange.fire(state);
	}

	constructor(
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IHostService private readonly hostService: IHostService
	) {
		super();

		this.checkForUpdates();
	}

	async isLatestVersion(): Promise<Boolean> {
		const update = await this.doCheckForUpdates();

		return !!update;
	}

	async checkForUpdates(): Promise<void> {
		await this.doCheckForUpdates();
	}

	private async doCheckForUpdates(): Promise<IUpdate | null> {
		if (this.environmentService.options && this.environmentService.options.updateProvider) {
			const updateProvider = this.environmentService.options.updateProvider;

			// State -> Checking for Updates
			this.state = State.CheckingForUpdates(null);

			const update = await updateProvider.checkForUpdate();
			if (update) {
				// State -> Downloaded
				this.state = State.Ready({ version: update.version, productVersion: update.version });
			} else {
				// State -> Idle
				this.state = State.Idle(UpdateType.Archive);
			}

			return update;
		}

		return null; // no update provider to ask
	}

	async downloadUpdate(): Promise<void> {
		// no-op
	}

	async applyUpdate(): Promise<void> {
		this.hostService.reload();
	}

	async quitAndInstall(): Promise<void> {
		this.hostService.reload();
	}
}

registerSingleton(IUpdateService, BrowserUpdateService);
