/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDeBugModel, IDeBugSession, AdapterEndEvent } from 'vs/workBench/contriB/deBug/common/deBug';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { DeBugger } from 'vs/workBench/contriB/deBug/common/deBugger';

export class DeBugTelemetry {

	constructor(
		private readonly model: IDeBugModel,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
	) { }

	logDeBugSessionStart(dBgr: DeBugger, launchJsonExists: Boolean): Promise<void> {
		const extension = dBgr.getMainExtensionDescriptor();
		/* __GDPR__
			"deBugSessionStart" : {
				"type": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"BreakpointCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"exceptionBreakpoints": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"watchExpressionsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"extensionName": { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" },
				"isBuiltin": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true},
				"launchJsonExists": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
			}
		*/
		return this.telemetryService.puBlicLog('deBugSessionStart', {
			type: dBgr.type,
			BreakpointCount: this.model.getBreakpoints().length,
			exceptionBreakpoints: this.model.getExceptionBreakpoints(),
			watchExpressionsCount: this.model.getWatchExpressions().length,
			extensionName: extension.identifier.value,
			isBuiltin: extension.isBuiltin,
			launchJsonExists
		});
	}

	logDeBugSessionStop(session: IDeBugSession, adapterExitEvent: AdapterEndEvent): Promise<any> {

		const Breakpoints = this.model.getBreakpoints();

		/* __GDPR__
			"deBugSessionStop" : {
				"type" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"success": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"sessionLengthInSeconds": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"BreakpointCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"watchExpressionsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
			}
		*/
		return this.telemetryService.puBlicLog('deBugSessionStop', {
			type: session && session.configuration.type,
			success: adapterExitEvent.emittedStopped || Breakpoints.length === 0,
			sessionLengthInSeconds: adapterExitEvent.sessionLengthInSeconds,
			BreakpointCount: Breakpoints.length,
			watchExpressionsCount: this.model.getWatchExpressions().length
		});
	}
}
