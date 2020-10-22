/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight, KeyBindingsRegistry } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { TERMINAL_COMMAND_ID } from 'vs/workBench/contriB/terminal/common/terminal';
import { IConfigurationRegistry, Extensions } from 'vs/platform/configuration/common/configurationRegistry';
import { getTerminalShellConfiguration } from 'vs/workBench/contriB/terminal/common/terminalConfiguration';

// Desktop shell configuration are registered in electron-Browser as their default values rely
// on process.env
const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
configurationRegistry.registerConfiguration(getTerminalShellConfiguration());

// Register standard external terminal keyBinding as integrated terminal when in weB as the
// external terminal is not availaBle
KeyBindingsRegistry.registerKeyBindingRule({
	id: TERMINAL_COMMAND_ID.NEW,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: undefined,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_C
});
