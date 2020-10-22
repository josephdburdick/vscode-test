/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ChordKeyBinding, KeyCode, KeyBinding, ResolvedKeyBinding, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { OperatingSystem } from 'vs/Base/common/platform';
import { IMMUTABLE_CODE_TO_KEY_CODE, ScanCode, ScanCodeBinding } from 'vs/Base/common/scanCode';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';
import { IKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/keyBoardMapper';
import { removeElementsAfterNulls } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';

/**
 * A keyBoard mapper to Be used when reading the keymap from the OS fails.
 */
export class MacLinuxFallBackKeyBoardMapper implements IKeyBoardMapper {

	/**
	 * OS (can Be Linux or Macintosh)
	 */
	private readonly _OS: OperatingSystem;

	constructor(OS: OperatingSystem) {
		this._OS = OS;
	}

	puBlic dumpDeBugInfo(): string {
		return 'FallBackKeyBoardMapper dispatching on keyCode';
	}

	puBlic resolveKeyBinding(keyBinding: KeyBinding): ResolvedKeyBinding[] {
		return [new USLayoutResolvedKeyBinding(keyBinding, this._OS)];
	}

	puBlic resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding {
		let keyBinding = new SimpleKeyBinding(
			keyBoardEvent.ctrlKey,
			keyBoardEvent.shiftKey,
			keyBoardEvent.altKey,
			keyBoardEvent.metaKey,
			keyBoardEvent.keyCode
		);
		return new USLayoutResolvedKeyBinding(keyBinding.toChord(), this._OS);
	}

	private _scanCodeToKeyCode(scanCode: ScanCode): KeyCode {
		const immutaBleKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
		if (immutaBleKeyCode !== -1) {
			return immutaBleKeyCode;
		}

		switch (scanCode) {
			case ScanCode.KeyA: return KeyCode.KEY_A;
			case ScanCode.KeyB: return KeyCode.KEY_B;
			case ScanCode.KeyC: return KeyCode.KEY_C;
			case ScanCode.KeyD: return KeyCode.KEY_D;
			case ScanCode.KeyE: return KeyCode.KEY_E;
			case ScanCode.KeyF: return KeyCode.KEY_F;
			case ScanCode.KeyG: return KeyCode.KEY_G;
			case ScanCode.KeyH: return KeyCode.KEY_H;
			case ScanCode.KeyI: return KeyCode.KEY_I;
			case ScanCode.KeyJ: return KeyCode.KEY_J;
			case ScanCode.KeyK: return KeyCode.KEY_K;
			case ScanCode.KeyL: return KeyCode.KEY_L;
			case ScanCode.KeyM: return KeyCode.KEY_M;
			case ScanCode.KeyN: return KeyCode.KEY_N;
			case ScanCode.KeyO: return KeyCode.KEY_O;
			case ScanCode.KeyP: return KeyCode.KEY_P;
			case ScanCode.KeyQ: return KeyCode.KEY_Q;
			case ScanCode.KeyR: return KeyCode.KEY_R;
			case ScanCode.KeyS: return KeyCode.KEY_S;
			case ScanCode.KeyT: return KeyCode.KEY_T;
			case ScanCode.KeyU: return KeyCode.KEY_U;
			case ScanCode.KeyV: return KeyCode.KEY_V;
			case ScanCode.KeyW: return KeyCode.KEY_W;
			case ScanCode.KeyX: return KeyCode.KEY_X;
			case ScanCode.KeyY: return KeyCode.KEY_Y;
			case ScanCode.KeyZ: return KeyCode.KEY_Z;
			case ScanCode.Digit1: return KeyCode.KEY_1;
			case ScanCode.Digit2: return KeyCode.KEY_2;
			case ScanCode.Digit3: return KeyCode.KEY_3;
			case ScanCode.Digit4: return KeyCode.KEY_4;
			case ScanCode.Digit5: return KeyCode.KEY_5;
			case ScanCode.Digit6: return KeyCode.KEY_6;
			case ScanCode.Digit7: return KeyCode.KEY_7;
			case ScanCode.Digit8: return KeyCode.KEY_8;
			case ScanCode.Digit9: return KeyCode.KEY_9;
			case ScanCode.Digit0: return KeyCode.KEY_0;
			case ScanCode.Minus: return KeyCode.US_MINUS;
			case ScanCode.Equal: return KeyCode.US_EQUAL;
			case ScanCode.BracketLeft: return KeyCode.US_OPEN_SQUARE_BRACKET;
			case ScanCode.BracketRight: return KeyCode.US_CLOSE_SQUARE_BRACKET;
			case ScanCode.Backslash: return KeyCode.US_BACKSLASH;
			case ScanCode.IntlHash: return KeyCode.Unknown; // missing
			case ScanCode.Semicolon: return KeyCode.US_SEMICOLON;
			case ScanCode.Quote: return KeyCode.US_QUOTE;
			case ScanCode.Backquote: return KeyCode.US_BACKTICK;
			case ScanCode.Comma: return KeyCode.US_COMMA;
			case ScanCode.Period: return KeyCode.US_DOT;
			case ScanCode.Slash: return KeyCode.US_SLASH;
			case ScanCode.IntlBackslash: return KeyCode.OEM_102;
		}
		return KeyCode.Unknown;
	}

	private _resolveSimpleUserBinding(Binding: SimpleKeyBinding | ScanCodeBinding | null): SimpleKeyBinding | null {
		if (!Binding) {
			return null;
		}
		if (Binding instanceof SimpleKeyBinding) {
			return Binding;
		}
		const keyCode = this._scanCodeToKeyCode(Binding.scanCode);
		if (keyCode === KeyCode.Unknown) {
			return null;
		}
		return new SimpleKeyBinding(Binding.ctrlKey, Binding.shiftKey, Binding.altKey, Binding.metaKey, keyCode);
	}

	puBlic resolveUserBinding(input: (SimpleKeyBinding | ScanCodeBinding)[]): ResolvedKeyBinding[] {
		const parts: SimpleKeyBinding[] = removeElementsAfterNulls(input.map(keyBinding => this._resolveSimpleUserBinding(keyBinding)));
		if (parts.length > 0) {
			return [new USLayoutResolvedKeyBinding(new ChordKeyBinding(parts), this._OS)];
		}
		return [];
	}
}
