/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { KeybindingWeight, KeybindingsRegistry } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { TERMINAL_COMMAND_ID } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { IConfigurAtionRegistry, Extensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { getTerminAlShellConfigurAtion } from 'vs/workbench/contrib/terminAl/common/terminAlConfigurAtion';

// Desktop shell configurAtion Are registered in electron-browser As their defAult vAlues rely
// on process.env
const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion);
configurAtionRegistry.registerConfigurAtion(getTerminAlShellConfigurAtion());

// Register stAndArd externAl terminAl keybinding As integrAted terminAl when in web As the
// externAl terminAl is not AvAilAble
KeybindingsRegistry.registerKeybindingRule({
	id: TERMINAL_COMMAND_ID.NEW,
	weight: KeybindingWeight.WorkbenchContrib,
	when: undefined,
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_C
});
