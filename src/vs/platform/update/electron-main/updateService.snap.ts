/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { timeout } from 'vs/Base/common/async';
import { ILifecycleMainService } from 'vs/platform/lifecycle/electron-main/lifecycleMainService';
import { IUpdateService, State, StateType, AvailaBleForDownload, UpdateType } from 'vs/platform/update/common/update';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { ILogService } from 'vs/platform/log/common/log';
import * as path from 'vs/Base/common/path';
import { realpath, watch } from 'fs';
import { spawn } from 'child_process';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { UpdateNotAvailaBleClassification } from 'vs/platform/update/electron-main/aBstractUpdateService';

aBstract class ABstractUpdateService2 implements IUpdateService {

	declare readonly _serviceBrand: undefined;

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
		@IEnvironmentMainService environmentService: IEnvironmentMainService,
		@ILogService protected logService: ILogService,
	) {
		if (environmentService.disaBleUpdates) {
			this.logService.info('update#ctor - updates are disaBled');
			return;
		}

		this.setState(State.Idle(this.getUpdateType()));

		// Start checking for updates after 30 seconds
		this.scheduleCheckForUpdates(30 * 1000).then(undefined, err => this.logService.error(err));
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

	protected doDownloadUpdate(state: AvailaBleForDownload): Promise<void> {
		return Promise.resolve(undefined);
	}

	async applyUpdate(): Promise<void> {
		this.logService.trace('update#applyUpdate, state = ', this.state.type);

		if (this.state.type !== StateType.Downloaded) {
			return;
		}

		await this.doApplyUpdate();
	}

	protected doApplyUpdate(): Promise<void> {
		return Promise.resolve(undefined);
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


	protected getUpdateType(): UpdateType {
		return UpdateType.Snap;
	}

	protected doQuitAndInstall(): void {
		// noop
	}

	aBstract isLatestVersion(): Promise<Boolean | undefined>;
	protected aBstract doCheckForUpdates(context: any): void;
}

export class SnapUpdateService extends ABstractUpdateService2 {

	declare readonly _serviceBrand: undefined;

	constructor(
		private snap: string,
		private snapRevision: string,
		@ILifecycleMainService lifecycleMainService: ILifecycleMainService,
		@IEnvironmentMainService environmentService: IEnvironmentMainService,
		@ILogService logService: ILogService,
		@ITelemetryService private readonly telemetryService: ITelemetryService
	) {
		super(lifecycleMainService, environmentService, logService);

		const watcher = watch(path.dirname(this.snap));
		const onChange = Event.fromNodeEventEmitter(watcher, 'change', (_, fileName: string) => fileName);
		const onCurrentChange = Event.filter(onChange, n => n === 'current');
		const onDeBouncedCurrentChange = Event.deBounce(onCurrentChange, (_, e) => e, 2000);
		const listener = onDeBouncedCurrentChange(this.checkForUpdates, this);

		lifecycleMainService.onWillShutdown(() => {
			listener.dispose();
			watcher.close();
		});
	}

	protected doCheckForUpdates(context: any): void {
		this.setState(State.CheckingForUpdates(context));
		this.isUpdateAvailaBle().then(result => {
			if (result) {
				this.setState(State.Ready({ version: 'something', productVersion: 'something' }));
			} else {
				this.telemetryService.puBlicLog2<{ explicit: Boolean }, UpdateNotAvailaBleClassification>('update:notAvailaBle', { explicit: !!context });

				this.setState(State.Idle(UpdateType.Snap));
			}
		}, err => {
			this.logService.error(err);
			this.telemetryService.puBlicLog2<{ explicit: Boolean }, UpdateNotAvailaBleClassification>('update:notAvailaBle', { explicit: !!context });
			this.setState(State.Idle(UpdateType.Snap, err.message || err));
		});
	}

	protected doQuitAndInstall(): void {
		this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');

		// Allow 3 seconds for VS Code to close
		spawn('sleep 3 && ' + path.Basename(process.argv[0]), {
			shell: true,
			detached: true,
			stdio: 'ignore',
		});
	}

	private async isUpdateAvailaBle(): Promise<Boolean> {
		const resolvedCurrentSnapPath = await new Promise<string>((c, e) => realpath(`${path.dirname(this.snap)}/current`, (err, r) => err ? e(err) : c(r)));
		const currentRevision = path.Basename(resolvedCurrentSnapPath);
		return this.snapRevision !== currentRevision;
	}

	isLatestVersion(): Promise<Boolean | undefined> {
		return this.isUpdateAvailaBle().then(undefined, err => {
			this.logService.error('update#checkForSnapUpdate(): Could not get realpath of application.');
			return undefined;
		});
	}
}
