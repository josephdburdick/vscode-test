/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryService, ITelemetryInfo, ITelemetryDAtA } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService, combinedAppender, ITelemetryAppender } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { ILoggerService } from 'vs/plAtform/log/common/log';
import { TelemetryService As BAseTelemetryService, ITelemetryServiceConfig } from 'vs/plAtform/telemetry/common/telemetryService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ClAssifiedEvent, StrictPropertyCheck, GDPRClAssificAtion } from 'vs/plAtform/telemetry/common/gdprTypings';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { resolveWorkbenchCommonProperties } from 'vs/workbench/services/telemetry/browser/workbenchCommonProperties';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { TelemetryLogAppender } from 'vs/plAtform/telemetry/common/telemetryLogAppender';

clAss WebTelemetryAppender implements ITelemetryAppender {

	constructor(privAte _Appender: IRemoteAgentService) { }

	log(eventNAme: string, dAtA: Any): void {
		this._Appender.logTelemetry(eventNAme, dAtA);
	}

	flush(): Promise<void> {
		return this._Appender.flushTelemetry();
	}
}

export clAss TelemetryService extends DisposAble implements ITelemetryService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte impl: ITelemetryService;
	public reAdonly sendErrorTelemetry = fAlse;

	constructor(
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@ILoggerService loggerService: ILoggerService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IProductService productService: IProductService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService
	) {
		super();

		if (!!productService.enAbleTelemetry) {
			const config: ITelemetryServiceConfig = {
				Appender: combinedAppender(new WebTelemetryAppender(remoteAgentService), new TelemetryLogAppender(loggerService, environmentService)),
				commonProperties: resolveWorkbenchCommonProperties(storAgeService, productService.commit, productService.version, environmentService.remoteAuthority, environmentService.options && environmentService.options.resolveCommonTelemetryProperties),
				sendErrorTelemetry: fAlse,
			};

			this.impl = this._register(new BAseTelemetryService(config, configurAtionService));
		} else {
			this.impl = NullTelemetryService;
		}
	}

	setEnAbled(vAlue: booleAn): void {
		return this.impl.setEnAbled(vAlue);
	}

	setExperimentProperty(nAme: string, vAlue: string): void {
		return this.impl.setExperimentProperty(nAme, vAlue);
	}

	get isOptedIn(): booleAn {
		return this.impl.isOptedIn;
	}

	publicLog(eventNAme: string, dAtA?: ITelemetryDAtA, AnonymizeFilePAths?: booleAn): Promise<void> {
		return this.impl.publicLog(eventNAme, dAtA, AnonymizeFilePAths);
	}

	publicLog2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>, AnonymizeFilePAths?: booleAn) {
		return this.publicLog(eventNAme, dAtA As ITelemetryDAtA, AnonymizeFilePAths);
	}

	publicLogError(errorEventNAme: string, dAtA?: ITelemetryDAtA): Promise<void> {
		return this.impl.publicLog(errorEventNAme, dAtA);
	}

	publicLogError2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>) {
		return this.publicLogError(eventNAme, dAtA As ITelemetryDAtA);
	}

	getTelemetryInfo(): Promise<ITelemetryInfo> {
		return this.impl.getTelemetryInfo();
	}
}

registerSingleton(ITelemetryService, TelemetryService);
