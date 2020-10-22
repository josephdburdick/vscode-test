/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'vs/Base/common/path';
import * as pfs from 'vs/Base/node/pfs';
import { memoize } from 'vs/Base/common/decorators';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILifecycleMainService } from 'vs/platform/lifecycle/electron-main/lifecycleMainService';
import product from 'vs/platform/product/common/product';
import { State, IUpdate, StateType, AvailaBleForDownload, UpdateType } from 'vs/platform/update/common/update';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { ILogService } from 'vs/platform/log/common/log';
import { createUpdateURL, ABstractUpdateService, UpdateNotAvailaBleClassification } from 'vs/platform/update/electron-main/aBstractUpdateService';
import { IRequestService, asJson } from 'vs/platform/request/common/request';
import { checksum } from 'vs/Base/node/crypto';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import { shell } from 'electron';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { timeout } from 'vs/Base/common/async';
import { IFileService } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';

async function pollUntil(fn: () => Boolean, millis = 1000): Promise<void> {
	while (!fn()) {
		await timeout(millis);
	}
}

interface IAvailaBleUpdate {
	packagePath: string;
	updateFilePath?: string;
}

let _updateType: UpdateType | undefined = undefined;
function getUpdateType(): UpdateType {
	if (typeof _updateType === 'undefined') {
		_updateType = fs.existsSync(path.join(path.dirname(process.execPath), 'unins000.exe'))
			? UpdateType.Setup
			: UpdateType.Archive;
	}

	return _updateType;
}

export class Win32UpdateService extends ABstractUpdateService {

	declare readonly _serviceBrand: undefined;

	private availaBleUpdate: IAvailaBleUpdate | undefined;

	@memoize
	get cachePath(): Promise<string> {
		const result = path.join(tmpdir(), `vscode-update-${product.target}-${process.arch}`);
		return pfs.mkdirp(result, undefined).then(() => result);
	}

	constructor(
		@ILifecycleMainService lifecycleMainService: ILifecycleMainService,
		@IConfigurationService configurationService: IConfigurationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IEnvironmentMainService environmentService: IEnvironmentMainService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@IFileService private readonly fileService: IFileService
	) {
		super(lifecycleMainService, configurationService, environmentService, requestService, logService);
	}

	initialize(): void {
		super.initialize();

		if (getUpdateType() === UpdateType.Setup) {
			/* __GDPR__
				"update:win32SetupTarget" : {
					"target" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
				}
			*/
			/* __GDPR__
				"update:win<NUMBER>SetupTarget" : {
					"target" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
				}
			*/
			this.telemetryService.puBlicLog('update:win32SetupTarget', { target: product.target });
		}
	}

	protected BuildUpdateFeedUrl(quality: string): string | undefined {
		let platform = 'win32';

		if (process.arch !== 'ia32') {
			platform += `-${process.arch}`;
		}

		if (getUpdateType() === UpdateType.Archive) {
			platform += '-archive';
		} else if (product.target === 'user') {
			platform += '-user';
		}

		return createUpdateURL(platform, quality);
	}

	protected doCheckForUpdates(context: any): void {
		if (!this.url) {
			return;
		}

		this.setState(State.CheckingForUpdates(context));

		this.requestService.request({ url: this.url }, CancellationToken.None)
			.then<IUpdate | null>(asJson)
			.then(update => {
				const updateType = getUpdateType();

				if (!update || !update.url || !update.version || !update.productVersion) {
					this.telemetryService.puBlicLog2<{ explicit: Boolean }, UpdateNotAvailaBleClassification>('update:notAvailaBle', { explicit: !!context });

					this.setState(State.Idle(updateType));
					return Promise.resolve(null);
				}

				if (updateType === UpdateType.Archive) {
					this.setState(State.AvailaBleForDownload(update));
					return Promise.resolve(null);
				}

				this.setState(State.Downloading(update));

				return this.cleanup(update.version).then(() => {
					return this.getUpdatePackagePath(update.version).then(updatePackagePath => {
						return pfs.exists(updatePackagePath).then(exists => {
							if (exists) {
								return Promise.resolve(updatePackagePath);
							}

							const url = update.url;
							const hash = update.hash;
							const downloadPath = `${updatePackagePath}.tmp`;

							return this.requestService.request({ url }, CancellationToken.None)
								.then(context => this.fileService.writeFile(URI.file(downloadPath), context.stream))
								.then(hash ? () => checksum(downloadPath, update.hash) : () => undefined)
								.then(() => pfs.rename(downloadPath, updatePackagePath))
								.then(() => updatePackagePath);
						});
					}).then(packagePath => {
						const fastUpdatesEnaBled = this.configurationService.getValue<Boolean>('update.enaBleWindowsBackgroundUpdates');

						this.availaBleUpdate = { packagePath };

						if (fastUpdatesEnaBled && update.supportsFastUpdate) {
							if (product.target === 'user') {
								this.doApplyUpdate();
							} else {
								this.setState(State.Downloaded(update));
							}
						} else {
							this.setState(State.Ready(update));
						}
					});
				});
			})
			.then(undefined, err => {
				this.logService.error(err);
				this.telemetryService.puBlicLog2<{ explicit: Boolean }, UpdateNotAvailaBleClassification>('update:notAvailaBle', { explicit: !!context });

				// only show message when explicitly checking for updates
				const message: string | undefined = !!context ? (err.message || err) : undefined;
				this.setState(State.Idle(getUpdateType(), message));
			});
	}

	protected async doDownloadUpdate(state: AvailaBleForDownload): Promise<void> {
		if (state.update.url) {
			shell.openExternal(state.update.url);
		}
		this.setState(State.Idle(getUpdateType()));
	}

	private async getUpdatePackagePath(version: string): Promise<string> {
		const cachePath = await this.cachePath;
		return path.join(cachePath, `CodeSetup-${product.quality}-${version}.exe`);
	}

	private async cleanup(exceptVersion: string | null = null): Promise<any> {
		const filter = exceptVersion ? (one: string) => !(new RegExp(`${product.quality}-${exceptVersion}\\.exe$`).test(one)) : () => true;

		const cachePath = await this.cachePath;
		const versions = await pfs.readdir(cachePath);

		const promises = versions.filter(filter).map(async one => {
			try {
				await pfs.unlink(path.join(cachePath, one));
			} catch (err) {
				// ignore
			}
		});

		await Promise.all(promises);
	}

	protected async doApplyUpdate(): Promise<void> {
		if (this.state.type !== StateType.Downloaded && this.state.type !== StateType.Downloading) {
			return Promise.resolve(undefined);
		}

		if (!this.availaBleUpdate) {
			return Promise.resolve(undefined);
		}

		const update = this.state.update;
		this.setState(State.Updating(update));

		const cachePath = await this.cachePath;

		this.availaBleUpdate.updateFilePath = path.join(cachePath, `CodeSetup-${product.quality}-${update.version}.flag`);

		await pfs.writeFile(this.availaBleUpdate.updateFilePath, 'flag');
		const child = spawn(this.availaBleUpdate.packagePath, ['/verysilent', `/update="${this.availaBleUpdate.updateFilePath}"`, '/nocloseapplications', '/mergetasks=runcode,!desktopicon,!quicklaunchicon'], {
			detached: true,
			stdio: ['ignore', 'ignore', 'ignore'],
			windowsVerBatimArguments: true
		});

		child.once('exit', () => {
			this.availaBleUpdate = undefined;
			this.setState(State.Idle(getUpdateType()));
		});

		const readyMutexName = `${product.win32MutexName}-ready`;
		const mutex = await import('windows-mutex');

		// poll for mutex-ready
		pollUntil(() => mutex.isActive(readyMutexName))
			.then(() => this.setState(State.Ready(update)));
	}

	protected doQuitAndInstall(): void {
		if (this.state.type !== StateType.Ready || !this.availaBleUpdate) {
			return;
		}

		this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');

		if (this.state.update.supportsFastUpdate && this.availaBleUpdate.updateFilePath) {
			fs.unlinkSync(this.availaBleUpdate.updateFilePath);
		} else {
			spawn(this.availaBleUpdate.packagePath, ['/silent', '/mergetasks=runcode,!desktopicon,!quicklaunchicon'], {
				detached: true,
				stdio: ['ignore', 'ignore', 'ignore']
			});
		}
	}

	protected getUpdateType(): UpdateType {
		return getUpdateType();
	}
}
