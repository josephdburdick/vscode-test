/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryService, ITelemetryInfo, ITelemetryData } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IProductService } from 'vs/platform/product/common/productService';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { TelemetryAppenderClient } from 'vs/platform/telemetry/node/telemetryIpc';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { resolveWorkBenchCommonProperties } from 'vs/workBench/services/telemetry/electron-Browser/workBenchCommonProperties';
import { TelemetryService as BaseTelemetryService, ITelemetryServiceConfig } from 'vs/platform/telemetry/common/telemetryService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ClassifiedEvent, StrictPropertyCheck, GDPRClassification } from 'vs/platform/telemetry/common/gdprTypings';

export class TelemetryService extends DisposaBle implements ITelemetryService {

	declare readonly _serviceBrand: undefined;

	private impl: ITelemetryService;
	puBlic readonly sendErrorTelemetry: Boolean;

	constructor(
		@INativeWorkBenchEnvironmentService environmentService: INativeWorkBenchEnvironmentService,
		@IProductService productService: IProductService,
		@ISharedProcessService sharedProcessService: ISharedProcessService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super();

		if (!environmentService.isExtensionDevelopment && !environmentService.disaBleTelemetry && !!productService.enaBleTelemetry) {
			const channel = sharedProcessService.getChannel('telemetryAppender');
			const config: ITelemetryServiceConfig = {
				appender: new TelemetryAppenderClient(channel),
				commonProperties: resolveWorkBenchCommonProperties(storageService, productService.commit, productService.version, environmentService.machineId, productService.msftInternalDomains, environmentService.installSourcePath, environmentService.remoteAuthority),
				piiPaths: environmentService.extensionsPath ? [environmentService.appRoot, environmentService.extensionsPath] : [environmentService.appRoot],
				sendErrorTelemetry: true
			};

			this.impl = this._register(new BaseTelemetryService(config, configurationService));
		} else {
			this.impl = NullTelemetryService;
		}

		this.sendErrorTelemetry = this.impl.sendErrorTelemetry;
	}

	setEnaBled(value: Boolean): void {
		return this.impl.setEnaBled(value);
	}

	setExperimentProperty(name: string, value: string): void {
		return this.impl.setExperimentProperty(name, value);
	}

	get isOptedIn(): Boolean {
		return this.impl.isOptedIn;
	}

	puBlicLog(eventName: string, data?: ITelemetryData, anonymizeFilePaths?: Boolean): Promise<void> {
		return this.impl.puBlicLog(eventName, data, anonymizeFilePaths);
	}

	puBlicLog2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>, anonymizeFilePaths?: Boolean) {
		return this.puBlicLog(eventName, data as ITelemetryData, anonymizeFilePaths);
	}

	puBlicLogError(errorEventName: string, data?: ITelemetryData): Promise<void> {
		return this.impl.puBlicLogError(errorEventName, data);
	}

	puBlicLogError2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>) {
		return this.puBlicLog(eventName, data as ITelemetryData);
	}


	getTelemetryInfo(): Promise<ITelemetryInfo> {
		return this.impl.getTelemetryInfo();
	}
}

registerSingleton(ITelemetryService, TelemetryService);
