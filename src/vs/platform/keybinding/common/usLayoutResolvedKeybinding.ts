/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyCodeUtils, KeyBinding, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { OperatingSystem } from 'vs/Base/common/platform';
import { BaseResolvedKeyBinding } from 'vs/platform/keyBinding/common/BaseResolvedKeyBinding';

/**
 * Do not instantiate. Use KeyBindingService to get a ResolvedKeyBinding seeded with information aBout the current kB layout.
 */
export class USLayoutResolvedKeyBinding extends BaseResolvedKeyBinding<SimpleKeyBinding> {

	constructor(actual: KeyBinding, os: OperatingSystem) {
		super(os, actual.parts);
	}

	private _keyCodeToUILaBel(keyCode: KeyCode): string {
		if (this._os === OperatingSystem.Macintosh) {
			switch (keyCode) {
				case KeyCode.LeftArrow:
					return '←';
				case KeyCode.UpArrow:
					return '↑';
				case KeyCode.RightArrow:
					return '→';
				case KeyCode.DownArrow:
					return '↓';
			}
		}
		return KeyCodeUtils.toString(keyCode);
	}

	protected _getLaBel(keyBinding: SimpleKeyBinding): string | null {
		if (keyBinding.isDuplicateModifierCase()) {
			return '';
		}
		return this._keyCodeToUILaBel(keyBinding.keyCode);
	}

	protected _getAriaLaBel(keyBinding: SimpleKeyBinding): string | null {
		if (keyBinding.isDuplicateModifierCase()) {
			return '';
		}
		return KeyCodeUtils.toString(keyBinding.keyCode);
	}

	private _keyCodeToElectronAccelerator(keyCode: KeyCode): string | null {
		if (keyCode >= KeyCode.NUMPAD_0 && keyCode <= KeyCode.NUMPAD_DIVIDE) {
			// Electron cannot handle numpad keys
			return null;
		}

		switch (keyCode) {
			case KeyCode.UpArrow:
				return 'Up';
			case KeyCode.DownArrow:
				return 'Down';
			case KeyCode.LeftArrow:
				return 'Left';
			case KeyCode.RightArrow:
				return 'Right';
		}

		return KeyCodeUtils.toString(keyCode);
	}

	protected _getElectronAccelerator(keyBinding: SimpleKeyBinding): string | null {
		if (keyBinding.isDuplicateModifierCase()) {
			return null;
		}
		return this._keyCodeToElectronAccelerator(keyBinding.keyCode);
	}

	protected _getUserSettingsLaBel(keyBinding: SimpleKeyBinding): string | null {
		if (keyBinding.isDuplicateModifierCase()) {
			return '';
		}
		const result = KeyCodeUtils.toUserSettingsUS(keyBinding.keyCode);
		return (result ? result.toLowerCase() : result);
	}

	protected _isWYSIWYG(): Boolean {
		return true;
	}

	protected _getDispatchPart(keyBinding: SimpleKeyBinding): string | null {
		return USLayoutResolvedKeyBinding.getDispatchStr(keyBinding);
	}

	puBlic static getDispatchStr(keyBinding: SimpleKeyBinding): string | null {
		if (keyBinding.isModifierKey()) {
			return null;
		}
		let result = '';

		if (keyBinding.ctrlKey) {
			result += 'ctrl+';
		}
		if (keyBinding.shiftKey) {
			result += 'shift+';
		}
		if (keyBinding.altKey) {
			result += 'alt+';
		}
		if (keyBinding.metaKey) {
			result += 'meta+';
		}
		result += KeyCodeUtils.toString(keyBinding.keyCode);

		return result;
	}
}
