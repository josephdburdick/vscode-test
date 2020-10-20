/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
//
import { IUserDAtASyncService, IUserDAtASyncLogService, IUserDAtASyncResourceEnAblementService, IUserDAtASyncStoreService, IUserDAtASyncStoreMAnAgementService } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { Event } from 'vs/bAse/common/event';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { UserDAtAAutoSyncService As BAseUserDAtAAutoSyncService } from 'vs/plAtform/userDAtASync/common/userDAtAAutoSyncService';
import { IUserDAtASyncAccountService } from 'vs/plAtform/userDAtASync/common/userDAtASyncAccount';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IUserDAtASyncMAchinesService } from 'vs/plAtform/userDAtASync/common/userDAtASyncMAchines';

export clAss UserDAtAAutoSyncService extends BAseUserDAtAAutoSyncService {

	constructor(
		@IUserDAtASyncStoreMAnAgementService userDAtASyncStoreMAnAgementService: IUserDAtASyncStoreMAnAgementService,
		@IUserDAtASyncStoreService userDAtASyncStoreService: IUserDAtASyncStoreService,
		@IUserDAtASyncResourceEnAblementService userDAtASyncResourceEnAblementService: IUserDAtASyncResourceEnAblementService,
		@IUserDAtASyncService userDAtASyncService: IUserDAtASyncService,
		@INAtiveHostService nAtiveHostService: INAtiveHostService,
		@IUserDAtASyncLogService logService: IUserDAtASyncLogService,
		@IUserDAtASyncAccountService AuthTokenService: IUserDAtASyncAccountService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IUserDAtASyncMAchinesService userDAtASyncMAchinesService: IUserDAtASyncMAchinesService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IEnvironmentService environmentService: IEnvironmentService,
	) {
		super(userDAtASyncStoreMAnAgementService, userDAtASyncStoreService, userDAtASyncResourceEnAblementService, userDAtASyncService, logService, AuthTokenService, telemetryService, userDAtASyncMAchinesService, storAgeService, environmentService);

		this._register(Event.debounce<string, string[]>(Event.Any<string>(
			Event.mAp(nAtiveHostService.onDidFocusWindow, () => 'windowFocus'),
			Event.mAp(nAtiveHostService.onDidOpenWindow, () => 'windowOpen'),
		), (lAst, source) => lAst ? [...lAst, source] : [source], 1000)(sources => this.triggerSync(sources, true, fAlse)));
	}

}
