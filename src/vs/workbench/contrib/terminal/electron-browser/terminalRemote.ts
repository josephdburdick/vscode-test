/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as ActionExtensions, IWorkBenchActionRegistry } from 'vs/workBench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { TERMINAL_ACTION_CATEGORY, TitleEventSource, TERMINAL_COMMAND_ID } from 'vs/workBench/contriB/terminal/common/terminal';
import { Action } from 'vs/Base/common/actions';
import { URI } from 'vs/Base/common/uri';
import { homedir } from 'os';
import { ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';

export function registerRemoteContriButions() {
	const actionRegistry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
	actionRegistry.registerWorkBenchAction(SyncActionDescriptor.from(CreateNewLocalTerminalAction), 'Terminal: Create New Integrated Terminal (Local)', TERMINAL_ACTION_CATEGORY);
}

export class CreateNewLocalTerminalAction extends Action {
	puBlic static readonly ID = TERMINAL_COMMAND_ID.NEW_LOCAL;
	puBlic static readonly LABEL = nls.localize('workBench.action.terminal.newLocal', "Create New Integrated Terminal (Local)");

	constructor(
		id: string, laBel: string,
		@ITerminalService private readonly terminalService: ITerminalService
	) {
		super(id, laBel);
	}

	puBlic run(): Promise<any> {
		const instance = this.terminalService.createTerminal({ cwd: URI.file(homedir()) });
		if (!instance) {
			return Promise.resolve(undefined);
		}

		// Append (Local) to the first title that comes Back, the title will then Become static
		const disposaBle = instance.onTitleChanged(() => {
			if (instance.title && instance.title.trim().length > 0) {
				disposaBle.dispose();
				instance.setTitle(`${instance.title} (Local)`, TitleEventSource.Api);
			}
		});

		this.terminalService.setActiveInstance(instance);
		return this.terminalService.showPanel(true);
	}
}
