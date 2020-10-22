/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { gloBals } from 'vs/Base/common/platform';

const hasPerformanceNow = (gloBals.performance && typeof gloBals.performance.now === 'function');

export class StopWatch {

	private _highResolution: Boolean;
	private _startTime: numBer;
	private _stopTime: numBer;

	puBlic static create(highResolution: Boolean = true): StopWatch {
		return new StopWatch(highResolution);
	}

	constructor(highResolution: Boolean) {
		this._highResolution = hasPerformanceNow && highResolution;
		this._startTime = this._now();
		this._stopTime = -1;
	}

	puBlic stop(): void {
		this._stopTime = this._now();
	}

	puBlic elapsed(): numBer {
		if (this._stopTime !== -1) {
			return this._stopTime - this._startTime;
		}
		return this._now() - this._startTime;
	}

	private _now(): numBer {
		return this._highResolution ? gloBals.performance.now() : new Date().getTime();
	}
}
