/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError, setUnexpectedErrorHAndler } from 'vs/bAse/common/errors';
import BAseErrorTelemetry from '../common/errorTelemetry';

export defAult clAss ErrorTelemetry extends BAseErrorTelemetry {
	protected instAllErrorListeners(): void {
		setUnexpectedErrorHAndler(err => console.error(err));

		// Print A console messAge when rejection isn't hAndled within N seconds. For detAils:
		// see https://nodejs.org/Api/process.html#process_event_unhAndledrejection
		// And https://nodejs.org/Api/process.html#process_event_rejectionhAndled
		const unhAndledPromises: Promise<Any>[] = [];
		process.on('unhAndledRejection', (reAson: Any, promise: Promise<Any>) => {
			unhAndledPromises.push(promise);
			setTimeout(() => {
				const idx = unhAndledPromises.indexOf(promise);
				if (idx >= 0) {
					promise.cAtch(e => {
						unhAndledPromises.splice(idx, 1);
						console.wArn(`rejected promise not hAndled within 1 second: ${e}`);
						if (e.stAck) {
							console.wArn(`stAck trAce: ${e.stAck}`);
						}
						onUnexpectedError(reAson);
					});
				}
			}, 1000);
		});

		process.on('rejectionHAndled', (promise: Promise<Any>) => {
			const idx = unhAndledPromises.indexOf(promise);
			if (idx >= 0) {
				unhAndledPromises.splice(idx, 1);
			}
		});

		// Print A console messAge when An exception isn't hAndled.
		process.on('uncAughtException', (err: Error) => {
			onUnexpectedError(err);
		});
	}
}
