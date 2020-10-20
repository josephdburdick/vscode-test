/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As ActionExtensions, IWorkbenchActionRegistry } from 'vs/workbench/common/Actions';
import { SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { TERMINAL_ACTION_CATEGORY, TitleEventSource, TERMINAL_COMMAND_ID } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { Action } from 'vs/bAse/common/Actions';
import { URI } from 'vs/bAse/common/uri';
import { homedir } from 'os';
import { ITerminAlService } from 'vs/workbench/contrib/terminAl/browser/terminAl';

export function registerRemoteContributions() {
	const ActionRegistry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
	ActionRegistry.registerWorkbenchAction(SyncActionDescriptor.from(CreAteNewLocAlTerminAlAction), 'TerminAl: CreAte New IntegrAted TerminAl (LocAl)', TERMINAL_ACTION_CATEGORY);
}

export clAss CreAteNewLocAlTerminAlAction extends Action {
	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.NEW_LOCAL;
	public stAtic reAdonly LABEL = nls.locAlize('workbench.Action.terminAl.newLocAl', "CreAte New IntegrAted TerminAl (LocAl)");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly terminAlService: ITerminAlService
	) {
		super(id, lAbel);
	}

	public run(): Promise<Any> {
		const instAnce = this.terminAlService.creAteTerminAl({ cwd: URI.file(homedir()) });
		if (!instAnce) {
			return Promise.resolve(undefined);
		}

		// Append (LocAl) to the first title thAt comes bAck, the title will then become stAtic
		const disposAble = instAnce.onTitleChAnged(() => {
			if (instAnce.title && instAnce.title.trim().length > 0) {
				disposAble.dispose();
				instAnce.setTitle(`${instAnce.title} (LocAl)`, TitleEventSource.Api);
			}
		});

		this.terminAlService.setActiveInstAnce(instAnce);
		return this.terminAlService.showPAnel(true);
	}
}
