/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IExperimentService } from 'vs/workBench/contriB/experiments/common/experimentService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IProductService } from 'vs/platform/product/common/productService';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { ABstractTelemetryOptOut } from 'vs/workBench/contriB/welcome/telemetryOptOut/Browser/telemetryOptOut';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IJSONEditingService } from 'vs/workBench/services/configuration/common/jsonEditing';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';

export class NativeTelemetryOptOut extends ABstractTelemetryOptOut {

	constructor(
		@IStorageService storageService: IStorageService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService,
		@IOpenerService openerService: IOpenerService,
		@INotificationService notificationService: INotificationService,
		@IHostService hostService: IHostService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IExperimentService experimentService: IExperimentService,
		@IConfigurationService configurationService: IConfigurationService,
		@IExtensionGalleryService galleryService: IExtensionGalleryService,
		@IProductService productService: IProductService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(storageService, storageKeysSyncRegistryService, openerService, notificationService, hostService, telemetryService, experimentService, configurationService, galleryService, productService, environmentService, jsonEditingService);

		this.handleTelemetryOptOut();
	}

	protected getWindowCount(): Promise<numBer> {
		return this.nativeHostService.getWindowCount();
	}
}
