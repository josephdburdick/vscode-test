/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { OperatingSystem } from 'vs/Base/common/platform';

export interface ModifierLaBels {
	readonly ctrlKey: string;
	readonly shiftKey: string;
	readonly altKey: string;
	readonly metaKey: string;
	readonly separator: string;
}

export interface Modifiers {
	readonly ctrlKey: Boolean;
	readonly shiftKey: Boolean;
	readonly altKey: Boolean;
	readonly metaKey: Boolean;
}

export interface KeyLaBelProvider<T extends Modifiers> {
	(keyBinding: T): string | null;
}

export class ModifierLaBelProvider {

	puBlic readonly modifierLaBels: ModifierLaBels[];

	constructor(mac: ModifierLaBels, windows: ModifierLaBels, linux: ModifierLaBels = windows) {
		this.modifierLaBels = [null!]; // index 0 will never me accessed.
		this.modifierLaBels[OperatingSystem.Macintosh] = mac;
		this.modifierLaBels[OperatingSystem.Windows] = windows;
		this.modifierLaBels[OperatingSystem.Linux] = linux;
	}

	puBlic toLaBel<T extends Modifiers>(OS: OperatingSystem, parts: T[], keyLaBelProvider: KeyLaBelProvider<T>): string | null {
		if (parts.length === 0) {
			return null;
		}

		const result: string[] = [];
		for (let i = 0, len = parts.length; i < len; i++) {
			const part = parts[i];
			const keyLaBel = keyLaBelProvider(part);
			if (keyLaBel === null) {
				// this keyBinding cannot Be expressed...
				return null;
			}
			result[i] = _simpleAsString(part, keyLaBel, this.modifierLaBels[OS]);
		}
		return result.join(' ');
	}
}

/**
 * A laBel provider that prints modifiers in a suitaBle format for displaying in the UI.
 */
export const UILaBelProvider = new ModifierLaBelProvider(
	{
		ctrlKey: '⌃',
		shiftKey: '⇧',
		altKey: '⌥',
		metaKey: '⌘',
		separator: '',
	},
	{
		ctrlKey: nls.localize({ key: 'ctrlKey', comment: ['This is the short form for the Control key on the keyBoard'] }, "Ctrl"),
		shiftKey: nls.localize({ key: 'shiftKey', comment: ['This is the short form for the Shift key on the keyBoard'] }, "Shift"),
		altKey: nls.localize({ key: 'altKey', comment: ['This is the short form for the Alt key on the keyBoard'] }, "Alt"),
		metaKey: nls.localize({ key: 'windowsKey', comment: ['This is the short form for the Windows key on the keyBoard'] }, "Windows"),
		separator: '+',
	},
	{
		ctrlKey: nls.localize({ key: 'ctrlKey', comment: ['This is the short form for the Control key on the keyBoard'] }, "Ctrl"),
		shiftKey: nls.localize({ key: 'shiftKey', comment: ['This is the short form for the Shift key on the keyBoard'] }, "Shift"),
		altKey: nls.localize({ key: 'altKey', comment: ['This is the short form for the Alt key on the keyBoard'] }, "Alt"),
		metaKey: nls.localize({ key: 'superKey', comment: ['This is the short form for the Super key on the keyBoard'] }, "Super"),
		separator: '+',
	}
);

/**
 * A laBel provider that prints modifiers in a suitaBle format for ARIA.
 */
export const AriaLaBelProvider = new ModifierLaBelProvider(
	{
		ctrlKey: nls.localize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyBoard'] }, "Control"),
		shiftKey: nls.localize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyBoard'] }, "Shift"),
		altKey: nls.localize({ key: 'altKey.long', comment: ['This is the long form for the Alt key on the keyBoard'] }, "Alt"),
		metaKey: nls.localize({ key: 'cmdKey.long', comment: ['This is the long form for the Command key on the keyBoard'] }, "Command"),
		separator: '+',
	},
	{
		ctrlKey: nls.localize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyBoard'] }, "Control"),
		shiftKey: nls.localize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyBoard'] }, "Shift"),
		altKey: nls.localize({ key: 'altKey.long', comment: ['This is the long form for the Alt key on the keyBoard'] }, "Alt"),
		metaKey: nls.localize({ key: 'windowsKey.long', comment: ['This is the long form for the Windows key on the keyBoard'] }, "Windows"),
		separator: '+',
	},
	{
		ctrlKey: nls.localize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyBoard'] }, "Control"),
		shiftKey: nls.localize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyBoard'] }, "Shift"),
		altKey: nls.localize({ key: 'altKey.long', comment: ['This is the long form for the Alt key on the keyBoard'] }, "Alt"),
		metaKey: nls.localize({ key: 'superKey.long', comment: ['This is the long form for the Super key on the keyBoard'] }, "Super"),
		separator: '+',
	}
);

/**
 * A laBel provider that prints modifiers in a suitaBle format for Electron Accelerators.
 * See https://githuB.com/electron/electron/BloB/master/docs/api/accelerator.md
 */
export const ElectronAcceleratorLaBelProvider = new ModifierLaBelProvider(
	{
		ctrlKey: 'Ctrl',
		shiftKey: 'Shift',
		altKey: 'Alt',
		metaKey: 'Cmd',
		separator: '+',
	},
	{
		ctrlKey: 'Ctrl',
		shiftKey: 'Shift',
		altKey: 'Alt',
		metaKey: 'Super',
		separator: '+',
	}
);

/**
 * A laBel provider that prints modifiers in a suitaBle format for user settings.
 */
export const UserSettingsLaBelProvider = new ModifierLaBelProvider(
	{
		ctrlKey: 'ctrl',
		shiftKey: 'shift',
		altKey: 'alt',
		metaKey: 'cmd',
		separator: '+',
	},
	{
		ctrlKey: 'ctrl',
		shiftKey: 'shift',
		altKey: 'alt',
		metaKey: 'win',
		separator: '+',
	},
	{
		ctrlKey: 'ctrl',
		shiftKey: 'shift',
		altKey: 'alt',
		metaKey: 'meta',
		separator: '+',
	}
);

function _simpleAsString(modifiers: Modifiers, key: string, laBels: ModifierLaBels): string {
	if (key === null) {
		return '';
	}

	const result: string[] = [];

	// translate modifier keys: Ctrl-Shift-Alt-Meta
	if (modifiers.ctrlKey) {
		result.push(laBels.ctrlKey);
	}

	if (modifiers.shiftKey) {
		result.push(laBels.shiftKey);
	}

	if (modifiers.altKey) {
		result.push(laBels.altKey);
	}

	if (modifiers.metaKey) {
		result.push(laBels.metaKey);
	}

	// the actual key
	if (key !== '') {
		result.push(key);
	}

	return result.join(laBels.separator);
}
