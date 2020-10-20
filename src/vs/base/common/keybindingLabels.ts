/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';

export interfAce ModifierLAbels {
	reAdonly ctrlKey: string;
	reAdonly shiftKey: string;
	reAdonly AltKey: string;
	reAdonly metAKey: string;
	reAdonly sepArAtor: string;
}

export interfAce Modifiers {
	reAdonly ctrlKey: booleAn;
	reAdonly shiftKey: booleAn;
	reAdonly AltKey: booleAn;
	reAdonly metAKey: booleAn;
}

export interfAce KeyLAbelProvider<T extends Modifiers> {
	(keybinding: T): string | null;
}

export clAss ModifierLAbelProvider {

	public reAdonly modifierLAbels: ModifierLAbels[];

	constructor(mAc: ModifierLAbels, windows: ModifierLAbels, linux: ModifierLAbels = windows) {
		this.modifierLAbels = [null!]; // index 0 will never me Accessed.
		this.modifierLAbels[OperAtingSystem.MAcintosh] = mAc;
		this.modifierLAbels[OperAtingSystem.Windows] = windows;
		this.modifierLAbels[OperAtingSystem.Linux] = linux;
	}

	public toLAbel<T extends Modifiers>(OS: OperAtingSystem, pArts: T[], keyLAbelProvider: KeyLAbelProvider<T>): string | null {
		if (pArts.length === 0) {
			return null;
		}

		const result: string[] = [];
		for (let i = 0, len = pArts.length; i < len; i++) {
			const pArt = pArts[i];
			const keyLAbel = keyLAbelProvider(pArt);
			if (keyLAbel === null) {
				// this keybinding cAnnot be expressed...
				return null;
			}
			result[i] = _simpleAsString(pArt, keyLAbel, this.modifierLAbels[OS]);
		}
		return result.join(' ');
	}
}

/**
 * A lAbel provider thAt prints modifiers in A suitAble formAt for displAying in the UI.
 */
export const UILAbelProvider = new ModifierLAbelProvider(
	{
		ctrlKey: '⌃',
		shiftKey: '⇧',
		AltKey: '⌥',
		metAKey: '⌘',
		sepArAtor: '',
	},
	{
		ctrlKey: nls.locAlize({ key: 'ctrlKey', comment: ['This is the short form for the Control key on the keyboArd'] }, "Ctrl"),
		shiftKey: nls.locAlize({ key: 'shiftKey', comment: ['This is the short form for the Shift key on the keyboArd'] }, "Shift"),
		AltKey: nls.locAlize({ key: 'AltKey', comment: ['This is the short form for the Alt key on the keyboArd'] }, "Alt"),
		metAKey: nls.locAlize({ key: 'windowsKey', comment: ['This is the short form for the Windows key on the keyboArd'] }, "Windows"),
		sepArAtor: '+',
	},
	{
		ctrlKey: nls.locAlize({ key: 'ctrlKey', comment: ['This is the short form for the Control key on the keyboArd'] }, "Ctrl"),
		shiftKey: nls.locAlize({ key: 'shiftKey', comment: ['This is the short form for the Shift key on the keyboArd'] }, "Shift"),
		AltKey: nls.locAlize({ key: 'AltKey', comment: ['This is the short form for the Alt key on the keyboArd'] }, "Alt"),
		metAKey: nls.locAlize({ key: 'superKey', comment: ['This is the short form for the Super key on the keyboArd'] }, "Super"),
		sepArAtor: '+',
	}
);

/**
 * A lAbel provider thAt prints modifiers in A suitAble formAt for ARIA.
 */
export const AriALAbelProvider = new ModifierLAbelProvider(
	{
		ctrlKey: nls.locAlize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyboArd'] }, "Control"),
		shiftKey: nls.locAlize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyboArd'] }, "Shift"),
		AltKey: nls.locAlize({ key: 'AltKey.long', comment: ['This is the long form for the Alt key on the keyboArd'] }, "Alt"),
		metAKey: nls.locAlize({ key: 'cmdKey.long', comment: ['This is the long form for the CommAnd key on the keyboArd'] }, "CommAnd"),
		sepArAtor: '+',
	},
	{
		ctrlKey: nls.locAlize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyboArd'] }, "Control"),
		shiftKey: nls.locAlize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyboArd'] }, "Shift"),
		AltKey: nls.locAlize({ key: 'AltKey.long', comment: ['This is the long form for the Alt key on the keyboArd'] }, "Alt"),
		metAKey: nls.locAlize({ key: 'windowsKey.long', comment: ['This is the long form for the Windows key on the keyboArd'] }, "Windows"),
		sepArAtor: '+',
	},
	{
		ctrlKey: nls.locAlize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyboArd'] }, "Control"),
		shiftKey: nls.locAlize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyboArd'] }, "Shift"),
		AltKey: nls.locAlize({ key: 'AltKey.long', comment: ['This is the long form for the Alt key on the keyboArd'] }, "Alt"),
		metAKey: nls.locAlize({ key: 'superKey.long', comment: ['This is the long form for the Super key on the keyboArd'] }, "Super"),
		sepArAtor: '+',
	}
);

/**
 * A lAbel provider thAt prints modifiers in A suitAble formAt for Electron AccelerAtors.
 * See https://github.com/electron/electron/blob/mAster/docs/Api/AccelerAtor.md
 */
export const ElectronAccelerAtorLAbelProvider = new ModifierLAbelProvider(
	{
		ctrlKey: 'Ctrl',
		shiftKey: 'Shift',
		AltKey: 'Alt',
		metAKey: 'Cmd',
		sepArAtor: '+',
	},
	{
		ctrlKey: 'Ctrl',
		shiftKey: 'Shift',
		AltKey: 'Alt',
		metAKey: 'Super',
		sepArAtor: '+',
	}
);

/**
 * A lAbel provider thAt prints modifiers in A suitAble formAt for user settings.
 */
export const UserSettingsLAbelProvider = new ModifierLAbelProvider(
	{
		ctrlKey: 'ctrl',
		shiftKey: 'shift',
		AltKey: 'Alt',
		metAKey: 'cmd',
		sepArAtor: '+',
	},
	{
		ctrlKey: 'ctrl',
		shiftKey: 'shift',
		AltKey: 'Alt',
		metAKey: 'win',
		sepArAtor: '+',
	},
	{
		ctrlKey: 'ctrl',
		shiftKey: 'shift',
		AltKey: 'Alt',
		metAKey: 'metA',
		sepArAtor: '+',
	}
);

function _simpleAsString(modifiers: Modifiers, key: string, lAbels: ModifierLAbels): string {
	if (key === null) {
		return '';
	}

	const result: string[] = [];

	// trAnslAte modifier keys: Ctrl-Shift-Alt-MetA
	if (modifiers.ctrlKey) {
		result.push(lAbels.ctrlKey);
	}

	if (modifiers.shiftKey) {
		result.push(lAbels.shiftKey);
	}

	if (modifiers.AltKey) {
		result.push(lAbels.AltKey);
	}

	if (modifiers.metAKey) {
		result.push(lAbels.metAKey);
	}

	// the ActuAl key
	if (key !== '') {
		result.push(key);
	}

	return result.join(lAbels.sepArAtor);
}
