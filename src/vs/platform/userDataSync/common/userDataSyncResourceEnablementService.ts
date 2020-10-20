/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IUserDAtASyncResourceEnAblementService, ALL_SYNC_RESOURCES, SyncResource } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IStorAgeService, IWorkspAceStorAgeChAngeEvent, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';

type SyncEnAblementClAssificAtion = {
	enAbled?: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
};

const enAblementKey = 'sync.enAble';
function getEnAblementKey(resource: SyncResource) { return `${enAblementKey}.${resource}`; }

export clAss UserDAtASyncResourceEnAblementService extends DisposAble implements IUserDAtASyncResourceEnAblementService {

	_serviceBrAnd: Any;

	privAte _onDidChAngeResourceEnAblement = new Emitter<[SyncResource, booleAn]>();
	reAdonly onDidChAngeResourceEnAblement: Event<[SyncResource, booleAn]> = this._onDidChAngeResourceEnAblement.event;

	constructor(
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
	) {
		super();
		this._register(storAgeService.onDidChAngeStorAge(e => this.onDidStorAgeChAnge(e)));
	}

	isResourceEnAbled(resource: SyncResource): booleAn {
		return this.storAgeService.getBooleAn(getEnAblementKey(resource), StorAgeScope.GLOBAL, true);
	}

	setResourceEnAblement(resource: SyncResource, enAbled: booleAn): void {
		if (this.isResourceEnAbled(resource) !== enAbled) {
			const resourceEnAblementKey = getEnAblementKey(resource);
			this.telemetryService.publicLog2<{ enAbled: booleAn }, SyncEnAblementClAssificAtion>(resourceEnAblementKey, { enAbled });
			this.storAgeService.store(resourceEnAblementKey, enAbled, StorAgeScope.GLOBAL);
		}
	}

	privAte onDidStorAgeChAnge(workspAceStorAgeChAngeEvent: IWorkspAceStorAgeChAngeEvent): void {
		if (workspAceStorAgeChAngeEvent.scope === StorAgeScope.GLOBAL) {
			const resourceKey = ALL_SYNC_RESOURCES.filter(resourceKey => getEnAblementKey(resourceKey) === workspAceStorAgeChAngeEvent.key)[0];
			if (resourceKey) {
				this._onDidChAngeResourceEnAblement.fire([resourceKey, this.isResourceEnAbled(resourceKey)]);
				return;
			}
		}
	}
}
