/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { localize } from 'vs/nls';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { timeout } from 'vs/Base/common/async';
import { ILogService } from 'vs/platform/log/common/log';

export class ExtensionActivationProgress implements IWorkBenchContriBution {

	private readonly _listener: IDisposaBle;

	constructor(
		@IExtensionService extensionService: IExtensionService,
		@IProgressService progressService: IProgressService,
		@ILogService logService: ILogService,
	) {

		const options = {
			location: ProgressLocation.Window,
			title: localize('activation', "Activating Extensions...")
		};

		this._listener = extensionService.onWillActivateByEvent(e => {
			logService.trace('onWillActivateByEvent: ', e.event);
			progressService.withProgress(options, _ => Promise.race([e.activation, timeout(5000)]));
		});
	}

	dispose(): void {
		this._listener.dispose();
	}
}
