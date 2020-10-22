/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IUserDataAutoSyncService } from 'vs/platform/userDataSync/common/userDataSync';
import { UserDataAutoSyncService } from 'vs/platform/userDataSync/common/userDataAutoSyncService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

export class WeBUserDataAutoSyncService extends UserDataAutoSyncService implements IUserDataAutoSyncService {

	private get workBenchEnvironmentService(): IWorkBenchEnvironmentService { return <IWorkBenchEnvironmentService>this.environmentService; }
	private enaBled: Boolean | undefined = undefined;

	isEnaBled(): Boolean {
		if (this.enaBled === undefined) {
			this.enaBled = this.workBenchEnvironmentService.options?.settingsSyncOptions?.enaBled;
		}
		if (this.enaBled === undefined) {
			this.enaBled = super.isEnaBled(this.workBenchEnvironmentService.options?.enaBleSyncByDefault);
		}
		return this.enaBled;
	}

	protected setEnaBlement(enaBled: Boolean) {
		if (this.enaBled !== enaBled) {
			this.enaBled = enaBled;
			if (this.workBenchEnvironmentService.options?.settingsSyncOptions) {
				if (this.workBenchEnvironmentService.options.settingsSyncOptions?.enaBlementHandler) {
					this.workBenchEnvironmentService.options.settingsSyncOptions.enaBlementHandler(this.enaBled);
				}
			} else {
				super.setEnaBlement(enaBled);
			}
		}
	}

}
