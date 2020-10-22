/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/Base/common/event';

export class DeBugCompoundRoot {
	private stopped = false;
	private stopEmitter = new Emitter<void>();

	onDidSessionStop = this.stopEmitter.event;

	sessionStopped(): void {
		if (!this.stopped) { // avoid sending extranous terminate events
			this.stopped = true;
			this.stopEmitter.fire();
		}
	}
}
