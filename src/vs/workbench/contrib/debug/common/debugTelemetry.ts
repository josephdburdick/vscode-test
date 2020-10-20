/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDebugModel, IDebugSession, AdApterEndEvent } from 'vs/workbench/contrib/debug/common/debug';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { Debugger } from 'vs/workbench/contrib/debug/common/debugger';

export clAss DebugTelemetry {

	constructor(
		privAte reAdonly model: IDebugModel,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
	) { }

	logDebugSessionStArt(dbgr: Debugger, lAunchJsonExists: booleAn): Promise<void> {
		const extension = dbgr.getMAinExtensionDescriptor();
		/* __GDPR__
			"debugSessionStArt" : {
				"type": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"breAkpointCount": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"exceptionBreAkpoints": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"wAtchExpressionsCount": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"extensionNAme": { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" },
				"isBuiltin": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true},
				"lAunchJsonExists": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
			}
		*/
		return this.telemetryService.publicLog('debugSessionStArt', {
			type: dbgr.type,
			breAkpointCount: this.model.getBreAkpoints().length,
			exceptionBreAkpoints: this.model.getExceptionBreAkpoints(),
			wAtchExpressionsCount: this.model.getWAtchExpressions().length,
			extensionNAme: extension.identifier.vAlue,
			isBuiltin: extension.isBuiltin,
			lAunchJsonExists
		});
	}

	logDebugSessionStop(session: IDebugSession, AdApterExitEvent: AdApterEndEvent): Promise<Any> {

		const breAkpoints = this.model.getBreAkpoints();

		/* __GDPR__
			"debugSessionStop" : {
				"type" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"success": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"sessionLengthInSeconds": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"breAkpointCount": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"wAtchExpressionsCount": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
			}
		*/
		return this.telemetryService.publicLog('debugSessionStop', {
			type: session && session.configurAtion.type,
			success: AdApterExitEvent.emittedStopped || breAkpoints.length === 0,
			sessionLengthInSeconds: AdApterExitEvent.sessionLengthInSeconds,
			breAkpointCount: breAkpoints.length,
			wAtchExpressionsCount: this.model.getWAtchExpressions().length
		});
	}
}
