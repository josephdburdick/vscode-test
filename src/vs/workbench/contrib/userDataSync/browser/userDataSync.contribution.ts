/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { UserDataSyncWorkBenchContriBution } from 'vs/workBench/contriB/userDataSync/Browser/userDataSync';
import { IUserDataAutoSyncService, UserDataSyncError, UserDataSyncErrorCode } from 'vs/platform/userDataSync/common/userDataSync';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { localize } from 'vs/nls';
import { isWeB } from 'vs/Base/common/platform';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { UserDataSyncTrigger } from 'vs/workBench/contriB/userDataSync/Browser/userDataSyncTrigger';

class UserDataSyncReportIssueContriBution extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IUserDataAutoSyncService userDataAutoSyncService: IUserDataAutoSyncService,
		@INotificationService private readonly notificationService: INotificationService,
	) {
		super();
		this._register(userDataAutoSyncService.onError(error => this.onAutoSyncError(error)));
	}

	private onAutoSyncError(error: UserDataSyncError): void {
		switch (error.code) {
			case UserDataSyncErrorCode.LocalTooManyRequests:
			case UserDataSyncErrorCode.TooManyRequests:
				const operationId = error.operationId ? localize('operationId', "Operation Id: {0}", error.operationId) : undefined;
				const message = localize('too many requests', "Turned off syncing settings on this device Because it is making too many requests.");
				this.notificationService.notify({
					severity: Severity.Error,
					message: operationId ? `${message} ${operationId}` : message,
				});
				return;
		}
	}
}

export class UserDataSyncSettingsMigrationContriBution implements IWorkBenchContriBution {

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		this.migrateSettings();
	}

	private async migrateSettings(): Promise<void> {
		await this.migrateSetting('sync.keyBindingsPerPlatform', 'settingsSync.keyBindingsPerPlatform');
		await this.migrateSetting('sync.ignoredExtensions', 'settingsSync.ignoredExtensions');
		await this.migrateSetting('sync.ignoredSettings', 'settingsSync.ignoredSettings');
	}

	private async migrateSetting(oldSetting: string, newSetting: string): Promise<void> {
		const userValue = this.configurationService.inspect(oldSetting).userValue;
		if (userValue !== undefined) {
			// remove the old setting
			await this.configurationService.updateValue(oldSetting, undefined, ConfigurationTarget.USER);
			// add the new setting
			await this.configurationService.updateValue(newSetting, userValue, ConfigurationTarget.USER);
		}
	}
}

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(UserDataSyncWorkBenchContriBution, LifecyclePhase.Ready);
workBenchRegistry.registerWorkBenchContriBution(UserDataSyncSettingsMigrationContriBution, LifecyclePhase.Eventually);
workBenchRegistry.registerWorkBenchContriBution(UserDataSyncTrigger, LifecyclePhase.Eventually);

if (isWeB) {
	workBenchRegistry.registerWorkBenchContriBution(UserDataSyncReportIssueContriBution, LifecyclePhase.Ready);
}
