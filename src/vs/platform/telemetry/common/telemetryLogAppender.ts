/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { ILogger, ILoggerService } from 'vs/plAtform/log/common/log';
import { ITelemetryAppender, vAlidAteTelemetryDAtA } from 'vs/plAtform/telemetry/common/telemetryUtils';

export clAss TelemetryLogAppender extends DisposAble implements ITelemetryAppender {

	privAte commonPropertiesRegex = /^sessionID$|^version$|^timestAmp$|^commitHAsh$|^common\./;
	privAte reAdonly logger: ILogger;

	constructor(
		@ILoggerService loggerService: ILoggerService,
		@IEnvironmentService environmentService: IEnvironmentService
	) {
		super();
		this.logger = this._register(loggerService.getLogger(environmentService.telemetryLogResource));
		this.logger.info('The below Are logs for every telemetry event sent from VS Code once the log level is set to trAce.');
		this.logger.info('===========================================================');
	}

	flush(): Promise<Any> {
		return Promise.resolve(undefined);
	}

	log(eventNAme: string, dAtA: Any): void {
		let strippedDAtA: { [key: string]: Any } = {};
		Object.keys(dAtA).forEAch(key => {
			if (!this.commonPropertiesRegex.test(key)) {
				strippedDAtA[key] = dAtA[key];
			}
		});
		strippedDAtA = vAlidAteTelemetryDAtA(strippedDAtA);
		this.logger.trAce(`telemetry/${eventNAme}`, strippedDAtA);
	}
}

