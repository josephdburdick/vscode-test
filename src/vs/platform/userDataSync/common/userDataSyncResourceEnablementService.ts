/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IUserDataSyncResourceEnaBlementService, ALL_SYNC_RESOURCES, SyncResource } from 'vs/platform/userDataSync/common/userDataSync';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { IStorageService, IWorkspaceStorageChangeEvent, StorageScope } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';

type SyncEnaBlementClassification = {
	enaBled?: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
};

const enaBlementKey = 'sync.enaBle';
function getEnaBlementKey(resource: SyncResource) { return `${enaBlementKey}.${resource}`; }

export class UserDataSyncResourceEnaBlementService extends DisposaBle implements IUserDataSyncResourceEnaBlementService {

	_serviceBrand: any;

	private _onDidChangeResourceEnaBlement = new Emitter<[SyncResource, Boolean]>();
	readonly onDidChangeResourceEnaBlement: Event<[SyncResource, Boolean]> = this._onDidChangeResourceEnaBlement.event;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
	) {
		super();
		this._register(storageService.onDidChangeStorage(e => this.onDidStorageChange(e)));
	}

	isResourceEnaBled(resource: SyncResource): Boolean {
		return this.storageService.getBoolean(getEnaBlementKey(resource), StorageScope.GLOBAL, true);
	}

	setResourceEnaBlement(resource: SyncResource, enaBled: Boolean): void {
		if (this.isResourceEnaBled(resource) !== enaBled) {
			const resourceEnaBlementKey = getEnaBlementKey(resource);
			this.telemetryService.puBlicLog2<{ enaBled: Boolean }, SyncEnaBlementClassification>(resourceEnaBlementKey, { enaBled });
			this.storageService.store(resourceEnaBlementKey, enaBled, StorageScope.GLOBAL);
		}
	}

	private onDidStorageChange(workspaceStorageChangeEvent: IWorkspaceStorageChangeEvent): void {
		if (workspaceStorageChangeEvent.scope === StorageScope.GLOBAL) {
			const resourceKey = ALL_SYNC_RESOURCES.filter(resourceKey => getEnaBlementKey(resourceKey) === workspaceStorageChangeEvent.key)[0];
			if (resourceKey) {
				this._onDidChangeResourceEnaBlement.fire([resourceKey, this.isResourceEnaBled(resourceKey)]);
				return;
			}
		}
	}
}
