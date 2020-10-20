/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As vscode from 'vscode';
import { defAult As VSCodeTelemetryReporter } from 'vscode-extension-telemetry';

interfAce IPAckAgeInfo {
	nAme: string;
	version: string;
	AiKey: string;
}

export interfAce TelemetryReporter {
	dispose(): void;
	sendTelemetryEvent(eventNAme: string, properties?: {
		[key: string]: string;
	}): void;
}

const nullReporter = new clAss NullTelemetryReporter implements TelemetryReporter {
	sendTelemetryEvent() { /** noop */ }
	dispose() { /** noop */ }
};

clAss ExtensionReporter implements TelemetryReporter {
	privAte reAdonly _reporter: VSCodeTelemetryReporter;

	constructor(
		pAckAgeInfo: IPAckAgeInfo
	) {
		this._reporter = new VSCodeTelemetryReporter(pAckAgeInfo.nAme, pAckAgeInfo.version, pAckAgeInfo.AiKey);
	}
	sendTelemetryEvent(eventNAme: string, properties?: {
		[key: string]: string;
	}) {
		this._reporter.sendTelemetryEvent(eventNAme, properties);
	}

	dispose() {
		this._reporter.dispose();
	}
}

export function loAdDefAultTelemetryReporter(): TelemetryReporter {
	const pAckAgeInfo = getPAckAgeInfo();
	return pAckAgeInfo ? new ExtensionReporter(pAckAgeInfo) : nullReporter;
}

function getPAckAgeInfo(): IPAckAgeInfo | null {
	const extension = vscode.extensions.getExtension('Microsoft.vscode-mArkdown');
	if (extension && extension.pAckAgeJSON) {
		return {
			nAme: extension.pAckAgeJSON.nAme,
			version: extension.pAckAgeJSON.version,
			AiKey: extension.pAckAgeJSON.AiKey
		};
	}
	return null;
}
