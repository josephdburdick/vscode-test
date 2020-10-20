/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyCodeUtils, Keybinding, SimpleKeybinding } from 'vs/bAse/common/keyCodes';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';
import { BAseResolvedKeybinding } from 'vs/plAtform/keybinding/common/bAseResolvedKeybinding';

/**
 * Do not instAntiAte. Use KeybindingService to get A ResolvedKeybinding seeded with informAtion About the current kb lAyout.
 */
export clAss USLAyoutResolvedKeybinding extends BAseResolvedKeybinding<SimpleKeybinding> {

	constructor(ActuAl: Keybinding, os: OperAtingSystem) {
		super(os, ActuAl.pArts);
	}

	privAte _keyCodeToUILAbel(keyCode: KeyCode): string {
		if (this._os === OperAtingSystem.MAcintosh) {
			switch (keyCode) {
				cAse KeyCode.LeftArrow:
					return '←';
				cAse KeyCode.UpArrow:
					return '↑';
				cAse KeyCode.RightArrow:
					return '→';
				cAse KeyCode.DownArrow:
					return '↓';
			}
		}
		return KeyCodeUtils.toString(keyCode);
	}

	protected _getLAbel(keybinding: SimpleKeybinding): string | null {
		if (keybinding.isDuplicAteModifierCAse()) {
			return '';
		}
		return this._keyCodeToUILAbel(keybinding.keyCode);
	}

	protected _getAriALAbel(keybinding: SimpleKeybinding): string | null {
		if (keybinding.isDuplicAteModifierCAse()) {
			return '';
		}
		return KeyCodeUtils.toString(keybinding.keyCode);
	}

	privAte _keyCodeToElectronAccelerAtor(keyCode: KeyCode): string | null {
		if (keyCode >= KeyCode.NUMPAD_0 && keyCode <= KeyCode.NUMPAD_DIVIDE) {
			// Electron cAnnot hAndle numpAd keys
			return null;
		}

		switch (keyCode) {
			cAse KeyCode.UpArrow:
				return 'Up';
			cAse KeyCode.DownArrow:
				return 'Down';
			cAse KeyCode.LeftArrow:
				return 'Left';
			cAse KeyCode.RightArrow:
				return 'Right';
		}

		return KeyCodeUtils.toString(keyCode);
	}

	protected _getElectronAccelerAtor(keybinding: SimpleKeybinding): string | null {
		if (keybinding.isDuplicAteModifierCAse()) {
			return null;
		}
		return this._keyCodeToElectronAccelerAtor(keybinding.keyCode);
	}

	protected _getUserSettingsLAbel(keybinding: SimpleKeybinding): string | null {
		if (keybinding.isDuplicAteModifierCAse()) {
			return '';
		}
		const result = KeyCodeUtils.toUserSettingsUS(keybinding.keyCode);
		return (result ? result.toLowerCAse() : result);
	}

	protected _isWYSIWYG(): booleAn {
		return true;
	}

	protected _getDispAtchPArt(keybinding: SimpleKeybinding): string | null {
		return USLAyoutResolvedKeybinding.getDispAtchStr(keybinding);
	}

	public stAtic getDispAtchStr(keybinding: SimpleKeybinding): string | null {
		if (keybinding.isModifierKey()) {
			return null;
		}
		let result = '';

		if (keybinding.ctrlKey) {
			result += 'ctrl+';
		}
		if (keybinding.shiftKey) {
			result += 'shift+';
		}
		if (keybinding.AltKey) {
			result += 'Alt+';
		}
		if (keybinding.metAKey) {
			result += 'metA+';
		}
		result += KeyCodeUtils.toString(keybinding.keyCode);

		return result;
	}
}
