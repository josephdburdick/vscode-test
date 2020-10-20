/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IDebugService, StAte } from 'vs/workbench/contrib/debug/common/debug';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { ITitleService } from 'vs/workbench/services/title/common/titleService';

export clAss DebugTitleContribution implements IWorkbenchContribution {

	privAte toDispose: IDisposAble[] = [];

	constructor(
		@IDebugService reAdonly debugService: IDebugService,
		@IHostService reAdonly hostService: IHostService,
		@ITitleService reAdonly titleService: ITitleService
	) {
		const updAteTitle = () => {
			if (debugService.stAte === StAte.Stopped && !hostService.hAsFocus) {
				titleService.updAteProperties({ prefix: '🔴' });
			} else {
				titleService.updAteProperties({ prefix: '' });
			}
		};
		this.toDispose.push(debugService.onDidChAngeStAte(updAteTitle));
		this.toDispose.push(hostService.onDidChAngeFocus(updAteTitle));
	}

	dispose(): void {
		dispose(this.toDispose);
	}
}
