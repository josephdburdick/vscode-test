/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';

export function setupTerminalCommands(): void {
	registerOpenTerminalAtIndexCommands();
}

function registerOpenTerminalAtIndexCommands(): void {
	for (let i = 0; i < 9; i++) {
		const terminalIndex = i;
		const visiBleIndex = i + 1;

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: `workBench.action.terminal.focusAtIndex${visiBleIndex}`,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: undefined,
			primary: 0,
			handler: accessor => {
				const terminalService = accessor.get(ITerminalService);
				terminalService.setActiveInstanceByIndex(terminalIndex);
				return terminalService.showPanel(true);
			}
		});
	}
}
