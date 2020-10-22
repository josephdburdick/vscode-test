/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IDeBugService, State } from 'vs/workBench/contriB/deBug/common/deBug';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { ITitleService } from 'vs/workBench/services/title/common/titleService';

export class DeBugTitleContriBution implements IWorkBenchContriBution {

	private toDispose: IDisposaBle[] = [];

	constructor(
		@IDeBugService readonly deBugService: IDeBugService,
		@IHostService readonly hostService: IHostService,
		@ITitleService readonly titleService: ITitleService
	) {
		const updateTitle = () => {
			if (deBugService.state === State.Stopped && !hostService.hasFocus) {
				titleService.updateProperties({ prefix: '🔴' });
			} else {
				titleService.updateProperties({ prefix: '' });
			}
		};
		this.toDispose.push(deBugService.onDidChangeState(updateTitle));
		this.toDispose.push(hostService.onDidChangeFocus(updateTitle));
	}

	dispose(): void {
		dispose(this.toDispose);
	}
}
