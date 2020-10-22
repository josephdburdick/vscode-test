/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyBindingsRegistry } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import * as platform from 'vs/Base/common/platform';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';

if (platform.isMacintosh) {

	// On the mac, cmd+x, cmd+c and cmd+v do not result in cut / copy / paste
	// We therefore add a Basic keyBinding rule that invokes document.execCommand
	// This is to cover <input>s...

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'execCut',
		primary: KeyMod.CtrlCmd | KeyCode.KEY_X,
		handler: BindExecuteCommand('cut'),
		weight: 0,
		when: undefined,
	});
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'execCopy',
		primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
		handler: BindExecuteCommand('copy'),
		weight: 0,
		when: undefined,
	});
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'execPaste',
		primary: KeyMod.CtrlCmd | KeyCode.KEY_V,
		handler: BindExecuteCommand('paste'),
		weight: 0,
		when: undefined,
	});

	function BindExecuteCommand(command: 'cut' | 'copy' | 'paste') {
		return () => {
			document.execCommand(command);
		};
	}
}
