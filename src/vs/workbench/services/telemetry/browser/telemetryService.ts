/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryService, ITelemetryInfo, ITelemetryData } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService, comBinedAppender, ITelemetryAppender } from 'vs/platform/telemetry/common/telemetryUtils';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { ILoggerService } from 'vs/platform/log/common/log';
import { TelemetryService as BaseTelemetryService, ITelemetryServiceConfig } from 'vs/platform/telemetry/common/telemetryService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ClassifiedEvent, StrictPropertyCheck, GDPRClassification } from 'vs/platform/telemetry/common/gdprTypings';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { resolveWorkBenchCommonProperties } from 'vs/workBench/services/telemetry/Browser/workBenchCommonProperties';
import { IProductService } from 'vs/platform/product/common/productService';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { TelemetryLogAppender } from 'vs/platform/telemetry/common/telemetryLogAppender';

class WeBTelemetryAppender implements ITelemetryAppender {

	constructor(private _appender: IRemoteAgentService) { }

	log(eventName: string, data: any): void {
		this._appender.logTelemetry(eventName, data);
	}

	flush(): Promise<void> {
		return this._appender.flushTelemetry();
	}
}

export class TelemetryService extends DisposaBle implements ITelemetryService {

	declare readonly _serviceBrand: undefined;

	private impl: ITelemetryService;
	puBlic readonly sendErrorTelemetry = false;

	constructor(
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@ILoggerService loggerService: ILoggerService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
		@IProductService productService: IProductService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService
	) {
		super();

		if (!!productService.enaBleTelemetry) {
			const config: ITelemetryServiceConfig = {
				appender: comBinedAppender(new WeBTelemetryAppender(remoteAgentService), new TelemetryLogAppender(loggerService, environmentService)),
				commonProperties: resolveWorkBenchCommonProperties(storageService, productService.commit, productService.version, environmentService.remoteAuthority, environmentService.options && environmentService.options.resolveCommonTelemetryProperties),
				sendErrorTelemetry: false,
			};

			this.impl = this._register(new BaseTelemetryService(config, configurationService));
		} else {
			this.impl = NullTelemetryService;
		}
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
		return this.impl.puBlicLog(errorEventName, data);
	}

	puBlicLogError2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>) {
		return this.puBlicLogError(eventName, data as ITelemetryData);
	}

	getTelemetryInfo(): Promise<ITelemetryInfo> {
		return this.impl.getTelemetryInfo();
	}
}

registerSingleton(ITelemetryService, TelemetryService);
