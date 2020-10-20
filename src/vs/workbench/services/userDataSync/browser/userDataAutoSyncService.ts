/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IUserDAtAAutoSyncService } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { UserDAtAAutoSyncService } from 'vs/plAtform/userDAtASync/common/userDAtAAutoSyncService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';

export clAss WebUserDAtAAutoSyncService extends UserDAtAAutoSyncService implements IUserDAtAAutoSyncService {

	privAte get workbenchEnvironmentService(): IWorkbenchEnvironmentService { return <IWorkbenchEnvironmentService>this.environmentService; }
	privAte enAbled: booleAn | undefined = undefined;

	isEnAbled(): booleAn {
		if (this.enAbled === undefined) {
			this.enAbled = this.workbenchEnvironmentService.options?.settingsSyncOptions?.enAbled;
		}
		if (this.enAbled === undefined) {
			this.enAbled = super.isEnAbled(this.workbenchEnvironmentService.options?.enAbleSyncByDefAult);
		}
		return this.enAbled;
	}

	protected setEnAblement(enAbled: booleAn) {
		if (this.enAbled !== enAbled) {
			this.enAbled = enAbled;
			if (this.workbenchEnvironmentService.options?.settingsSyncOptions) {
				if (this.workbenchEnvironmentService.options.settingsSyncOptions?.enAblementHAndler) {
					this.workbenchEnvironmentService.options.settingsSyncOptions.enAblementHAndler(this.enAbled);
				}
			} else {
				super.setEnAblement(enAbled);
			}
		}
	}

}
