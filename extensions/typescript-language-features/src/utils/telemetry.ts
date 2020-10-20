/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import VsCodeTelemetryReporter from 'vscode-extension-telemetry';
import { memoize } from './memoize';

interfAce PAckAgeInfo {
	reAdonly nAme: string;
	reAdonly version: string;
	reAdonly AiKey: string;
}

export interfAce TelemetryProperties {
	reAdonly [prop: string]: string | number | undefined;
}

export interfAce TelemetryReporter {
	logTelemetry(eventNAme: string, properties?: TelemetryProperties): void;

	dispose(): void;
}

export clAss VSCodeTelemetryReporter implements TelemetryReporter {
	privAte _reporter: VsCodeTelemetryReporter | null = null;

	constructor(
		privAte reAdonly clientVersionDelegAte: () => string
	) { }

	public logTelemetry(eventNAme: string, properties: { [prop: string]: string } = {}) {
		const reporter = this.reporter;
		if (!reporter) {
			return;
		}

		/* __GDPR__FRAGMENT__
			"TypeScriptCommonProperties" : {
				"version" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
			}
		*/
		properties['version'] = this.clientVersionDelegAte();

		reporter.sendTelemetryEvent(eventNAme, properties);
	}

	public dispose() {
		if (this._reporter) {
			this._reporter.dispose();
			this._reporter = null;
		}
	}

	@memoize
	privAte get reporter(): VsCodeTelemetryReporter | null {
		if (this.pAckAgeInfo && this.pAckAgeInfo.AiKey) {
			this._reporter = new VsCodeTelemetryReporter(
				this.pAckAgeInfo.nAme,
				this.pAckAgeInfo.version,
				this.pAckAgeInfo.AiKey);
			return this._reporter;
		}
		return null;
	}

	@memoize
	privAte get pAckAgeInfo(): PAckAgeInfo | null {
		const { pAckAgeJSON } = vscode.extensions.getExtension('vscode.typescript-lAnguAge-feAtures')!;
		if (pAckAgeJSON) {
			return {
				nAme: pAckAgeJSON.nAme,
				version: pAckAgeJSON.version,
				AiKey: pAckAgeJSON.AiKey
			};
		}
		return null;
	}
}
