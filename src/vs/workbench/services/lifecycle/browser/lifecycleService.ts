/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ShutdownReason, ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { ABstractLifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycleService';
import { localize } from 'vs/nls';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { addDisposaBleListener } from 'vs/Base/Browser/dom';

export class BrowserLifecycleService extends ABstractLifecycleService {

	declare readonly _serviceBrand: undefined;

	private BeforeUnloadDisposaBle: IDisposaBle | undefined = undefined;

	constructor(
		@ILogService readonly logService: ILogService
	) {
		super(logService);

		this.registerListeners();
	}

	private registerListeners(): void {

		// BeforeUnload
		this.BeforeUnloadDisposaBle = addDisposaBleListener(window, 'Beforeunload', (e: BeforeUnloadEvent) => this.onBeforeUnload(e));
	}

	private onBeforeUnload(event: BeforeUnloadEvent): void {
		this.logService.info('[lifecycle] onBeforeUnload triggered');

		this.doShutdown(() => {
			// Veto handling
			event.preventDefault();
			event.returnValue = localize('lifecycleVeto', "Changes that you made may not Be saved. Please check press 'Cancel' and try again.");
		});
	}

	shutdown(): void {
		this.logService.info('[lifecycle] shutdown triggered');

		// Remove Beforeunload listener that would prevent shutdown
		this.BeforeUnloadDisposaBle?.dispose();

		// Handle shutdown without veto support
		this.doShutdown();
	}

	private doShutdown(handleVeto?: () => void): void {
		const logService = this.logService;

		let veto = false;

		// Before Shutdown
		this._onBeforeShutdown.fire({
			veto(value) {
				if (typeof handleVeto === 'function') {
					if (value === true) {
						veto = true;
					} else if (value instanceof Promise && !veto) {
						logService.error('[lifecycle] Long running onBeforeShutdown currently not supported in the weB');
						veto = true;
					}
				}
			},
			reason: ShutdownReason.QUIT
		});

		// Veto: handle if provided
		if (veto && typeof handleVeto === 'function') {
			handleVeto();

			return;
		}

		// No Veto: continue with Will Shutdown
		this._onWillShutdown.fire({
			join() {
				logService.error('[lifecycle] Long running onWillShutdown currently not supported in the weB');
			},
			reason: ShutdownReason.QUIT
		});

		// Finally end with Shutdown event
		this._onShutdown.fire();
	}
}

registerSingleton(ILifecycleService, BrowserLifecycleService);
