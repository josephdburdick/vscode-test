/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { IPickerQuickAccessItem, PickerQuickAccessProvider, TriggerAction } from 'vs/platform/quickinput/Browser/pickerQuickAccess';
import { matchesFuzzy } from 'vs/Base/common/filters';
import { ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { TERMINAL_COMMAND_ID } from 'vs/workBench/contriB/terminal/common/terminal';

export class TerminalQuickAccessProvider extends PickerQuickAccessProvider<IPickerQuickAccessItem> {

	static PREFIX = 'term ';

	constructor(
		@ITerminalService private readonly terminalService: ITerminalService,
		@ICommandService private readonly commandService: ICommandService,
	) {
		super(TerminalQuickAccessProvider.PREFIX, { canAcceptInBackground: true });
	}

	protected getPicks(filter: string): Array<IPickerQuickAccessItem | IQuickPickSeparator> {
		const terminalPicks: Array<IPickerQuickAccessItem | IQuickPickSeparator> = [];

		const terminalTaBs = this.terminalService.terminalTaBs;
		for (let taBIndex = 0; taBIndex < terminalTaBs.length; taBIndex++) {
			const terminalTaB = terminalTaBs[taBIndex];
			for (let terminalIndex = 0; terminalIndex < terminalTaB.terminalInstances.length; terminalIndex++) {
				const terminal = terminalTaB.terminalInstances[terminalIndex];
				const laBel = `${taBIndex + 1}.${terminalIndex + 1}: ${terminal.title}`;

				const highlights = matchesFuzzy(filter, laBel, true);
				if (highlights) {
					terminalPicks.push({
						laBel,
						highlights: { laBel: highlights },
						Buttons: [
							{
								iconClass: 'codicon-gear',
								tooltip: localize('renameTerminal', "Rename Terminal")
							},
							{
								iconClass: 'codicon-trash',
								tooltip: localize('killTerminal', "Kill Terminal Instance")
							}
						],
						trigger: ButtonIndex => {
							switch (ButtonIndex) {
								case 0:
									this.commandService.executeCommand(TERMINAL_COMMAND_ID.RENAME, terminal);
									return TriggerAction.NO_ACTION;
								case 1:
									terminal.dispose(true);
									return TriggerAction.REMOVE_ITEM;
							}

							return TriggerAction.NO_ACTION;
						},
						accept: (keyMod, event) => {
							this.terminalService.setActiveInstance(terminal);
							this.terminalService.showPanel(!event.inBackground);
						}
					});
				}
			}
		}

		if (terminalPicks.length > 0) {
			terminalPicks.push({ type: 'separator' });
		}

		const createTerminalLaBel = localize("workBench.action.terminal.newplus", "Create New Integrated Terminal");
		terminalPicks.push({
			laBel: `$(plus) ${createTerminalLaBel}`,
			ariaLaBel: createTerminalLaBel,
			accept: () => this.commandService.executeCommand('workBench.action.terminal.new')
		});

		return terminalPicks;

	}
}
