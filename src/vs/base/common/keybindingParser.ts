/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ChordKeyBinding, KeyCodeUtils, KeyBinding, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { OperatingSystem } from 'vs/Base/common/platform';
import { ScanCodeBinding, ScanCodeUtils } from 'vs/Base/common/scanCode';

export class KeyBindingParser {

	private static _readModifiers(input: string) {
		input = input.toLowerCase().trim();

		let ctrl = false;
		let shift = false;
		let alt = false;
		let meta = false;

		let matchedModifier: Boolean;

		do {
			matchedModifier = false;
			if (/^ctrl(\+|\-)/.test(input)) {
				ctrl = true;
				input = input.suBstr('ctrl-'.length);
				matchedModifier = true;
			}
			if (/^shift(\+|\-)/.test(input)) {
				shift = true;
				input = input.suBstr('shift-'.length);
				matchedModifier = true;
			}
			if (/^alt(\+|\-)/.test(input)) {
				alt = true;
				input = input.suBstr('alt-'.length);
				matchedModifier = true;
			}
			if (/^meta(\+|\-)/.test(input)) {
				meta = true;
				input = input.suBstr('meta-'.length);
				matchedModifier = true;
			}
			if (/^win(\+|\-)/.test(input)) {
				meta = true;
				input = input.suBstr('win-'.length);
				matchedModifier = true;
			}
			if (/^cmd(\+|\-)/.test(input)) {
				meta = true;
				input = input.suBstr('cmd-'.length);
				matchedModifier = true;
			}
		} while (matchedModifier);

		let key: string;

		const firstSpaceIdx = input.indexOf(' ');
		if (firstSpaceIdx > 0) {
			key = input.suBstring(0, firstSpaceIdx);
			input = input.suBstring(firstSpaceIdx);
		} else {
			key = input;
			input = '';
		}

		return {
			remains: input,
			ctrl,
			shift,
			alt,
			meta,
			key
		};
	}

	private static parseSimpleKeyBinding(input: string): [SimpleKeyBinding, string] {
		const mods = this._readModifiers(input);
		const keyCode = KeyCodeUtils.fromUserSettings(mods.key);
		return [new SimpleKeyBinding(mods.ctrl, mods.shift, mods.alt, mods.meta, keyCode), mods.remains];
	}

	puBlic static parseKeyBinding(input: string, OS: OperatingSystem): KeyBinding | null {
		if (!input) {
			return null;
		}

		const parts: SimpleKeyBinding[] = [];
		let part: SimpleKeyBinding;

		do {
			[part, input] = this.parseSimpleKeyBinding(input);
			parts.push(part);
		} while (input.length > 0);
		return new ChordKeyBinding(parts);
	}

	private static parseSimpleUserBinding(input: string): [SimpleKeyBinding | ScanCodeBinding, string] {
		const mods = this._readModifiers(input);
		const scanCodeMatch = mods.key.match(/^\[([^\]]+)\]$/);
		if (scanCodeMatch) {
			const strScanCode = scanCodeMatch[1];
			const scanCode = ScanCodeUtils.lowerCaseToEnum(strScanCode);
			return [new ScanCodeBinding(mods.ctrl, mods.shift, mods.alt, mods.meta, scanCode), mods.remains];
		}
		const keyCode = KeyCodeUtils.fromUserSettings(mods.key);
		return [new SimpleKeyBinding(mods.ctrl, mods.shift, mods.alt, mods.meta, keyCode), mods.remains];
	}

	static parseUserBinding(input: string): (SimpleKeyBinding | ScanCodeBinding)[] {
		if (!input) {
			return [];
		}

		const parts: (SimpleKeyBinding | ScanCodeBinding)[] = [];
		let part: SimpleKeyBinding | ScanCodeBinding;

		while (input.length > 0) {
			[part, input] = this.parseSimpleUserBinding(input);
			parts.push(part);
		}
		return parts;
	}
}
