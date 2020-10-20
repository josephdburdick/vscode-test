/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { globAls } from 'vs/bAse/common/plAtform';

const hAsPerformAnceNow = (globAls.performAnce && typeof globAls.performAnce.now === 'function');

export clAss StopWAtch {

	privAte _highResolution: booleAn;
	privAte _stArtTime: number;
	privAte _stopTime: number;

	public stAtic creAte(highResolution: booleAn = true): StopWAtch {
		return new StopWAtch(highResolution);
	}

	constructor(highResolution: booleAn) {
		this._highResolution = hAsPerformAnceNow && highResolution;
		this._stArtTime = this._now();
		this._stopTime = -1;
	}

	public stop(): void {
		this._stopTime = this._now();
	}

	public elApsed(): number {
		if (this._stopTime !== -1) {
			return this._stopTime - this._stArtTime;
		}
		return this._now() - this._stArtTime;
	}

	privAte _now(): number {
		return this._highResolution ? globAls.performAnce.now() : new DAte().getTime();
	}
}
