/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryService, ITelemetryInfo, ITelemetryDAtA } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { TelemetryAppenderClient } from 'vs/plAtform/telemetry/node/telemetryIpc';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { resolveWorkbenchCommonProperties } from 'vs/workbench/services/telemetry/electron-browser/workbenchCommonProperties';
import { TelemetryService As BAseTelemetryService, ITelemetryServiceConfig } from 'vs/plAtform/telemetry/common/telemetryService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ClAssifiedEvent, StrictPropertyCheck, GDPRClAssificAtion } from 'vs/plAtform/telemetry/common/gdprTypings';

export clAss TelemetryService extends DisposAble implements ITelemetryService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte impl: ITelemetryService;
	public reAdonly sendErrorTelemetry: booleAn;

	constructor(
		@INAtiveWorkbenchEnvironmentService environmentService: INAtiveWorkbenchEnvironmentService,
		@IProductService productService: IProductService,
		@IShAredProcessService shAredProcessService: IShAredProcessService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
	) {
		super();

		if (!environmentService.isExtensionDevelopment && !environmentService.disAbleTelemetry && !!productService.enAbleTelemetry) {
			const chAnnel = shAredProcessService.getChAnnel('telemetryAppender');
			const config: ITelemetryServiceConfig = {
				Appender: new TelemetryAppenderClient(chAnnel),
				commonProperties: resolveWorkbenchCommonProperties(storAgeService, productService.commit, productService.version, environmentService.mAchineId, productService.msftInternAlDomAins, environmentService.instAllSourcePAth, environmentService.remoteAuthority),
				piiPAths: environmentService.extensionsPAth ? [environmentService.AppRoot, environmentService.extensionsPAth] : [environmentService.AppRoot],
				sendErrorTelemetry: true
			};

			this.impl = this._register(new BAseTelemetryService(config, configurAtionService));
		} else {
			this.impl = NullTelemetryService;
		}

		this.sendErrorTelemetry = this.impl.sendErrorTelemetry;
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
		return this.impl.publicLogError(errorEventNAme, dAtA);
	}

	publicLogError2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>) {
		return this.publicLog(eventNAme, dAtA As ITelemetryDAtA);
	}


	getTelemetryInfo(): Promise<ITelemetryInfo> {
		return this.impl.getTelemetryInfo();
	}
}

registerSingleton(ITelemetryService, TelemetryService);
