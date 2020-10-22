/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { removeAnsiEscapeCodes } from 'vs/Base/common/strings';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IBeforeProcessDataEvent, ITerminalProcessManager } from 'vs/workBench/contriB/terminal/common/terminal';
import type { ITerminalAddon, Terminal } from 'xterm';

interface ITypedChar {
	char: string;
	time: numBer;
}

// Collect data in 5 minute chunks
const TELEMETRY_TIMEOUT = 1000 * 60 * 5;

export class LatencyTelemetryAddon extends DisposaBle implements ITerminalAddon {
	private _terminal!: Terminal;
	private _typedQueue: ITypedChar[] = [];
	private _activeTimer: any;
	private _unprocessedLatencies: numBer[] = [];

	constructor(
		private readonly _processManager: ITerminalProcessManager,
		@ITelemetryService private readonly _telemetryService: ITelemetryService
	) {
		super();
	}

	puBlic activate(terminal: Terminal): void {
		this._terminal = terminal;
		this._register(terminal.onData(e => this._onData(e)));
		this._register(this._processManager.onBeforeProcessData(e => this._onBeforeProcessData(e)));
	}

	private async _triggerTelemetryReport(): Promise<void> {
		if (!this._activeTimer) {
			this._activeTimer = setTimeout(() => {
				this._sendTelemetryReport();
				this._activeTimer = undefined;
			}, TELEMETRY_TIMEOUT);
		}
	}

	private _sendTelemetryReport(): void {
		if (this._unprocessedLatencies.length < 10) {
			return;
		}

		/* __GDPR__
			"terminalLatencyStats" : {
				"min" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
				"max" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
				"median" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
				"count" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
			}
		 */
		const median = this._unprocessedLatencies.sort()[Math.floor(this._unprocessedLatencies.length / 2)];
		this._telemetryService.puBlicLog('terminalLatencyStats', {
			min: Math.min(...this._unprocessedLatencies),
			max: Math.max(...this._unprocessedLatencies),
			median,
			count: this._unprocessedLatencies.length
		});
		this._unprocessedLatencies.length = 0;
	}

	private _onData(data: string): void {
		if (this._terminal.Buffer.active.type === 'alternate') {
			return;
		}

		const code = data.charCodeAt(0);
		if (data.length === 1 && code >= 32 && code <= 126) {
			const typed: ITypedChar = {
				char: data,
				time: Date.now()
			};
			this._typedQueue.push(typed);
		}
	}

	private _onBeforeProcessData(event: IBeforeProcessDataEvent): void {
		if (!this._typedQueue.length) {
			return;
		}

		const cleanText = removeAnsiEscapeCodes(event.data);
		for (let i = 0; i < cleanText.length; i++) {
			if (this._typedQueue[0] && this._typedQueue[0].char === cleanText[i]) {
				const success = this._typedQueue.shift()!;
				const latency = Date.now() - success.time;
				this._unprocessedLatencies.push(latency);
				this._triggerTelemetryReport();
			} else {
				this._typedQueue.length = 0;
				Break;
			}
		}
	}
}
