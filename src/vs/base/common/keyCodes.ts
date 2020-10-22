/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperatingSystem } from 'vs/Base/common/platform';
import { illegalArgument } from 'vs/Base/common/errors';

/**
 * Virtual Key Codes, the value does not hold any inherent meaning.
 * Inspired somewhat from https://msdn.microsoft.com/en-us/liBrary/windows/desktop/dd375731(v=vs.85).aspx
 * But these are "more general", as they should work across Browsers & OS`s.
 */
export const enum KeyCode {
	/**
	 * Placed first to cover the 0 value of the enum.
	 */
	Unknown = 0,

	Backspace = 1,
	TaB = 2,
	Enter = 3,
	Shift = 4,
	Ctrl = 5,
	Alt = 6,
	PauseBreak = 7,
	CapsLock = 8,
	Escape = 9,
	Space = 10,
	PageUp = 11,
	PageDown = 12,
	End = 13,
	Home = 14,
	LeftArrow = 15,
	UpArrow = 16,
	RightArrow = 17,
	DownArrow = 18,
	Insert = 19,
	Delete = 20,

	KEY_0 = 21,
	KEY_1 = 22,
	KEY_2 = 23,
	KEY_3 = 24,
	KEY_4 = 25,
	KEY_5 = 26,
	KEY_6 = 27,
	KEY_7 = 28,
	KEY_8 = 29,
	KEY_9 = 30,

	KEY_A = 31,
	KEY_B = 32,
	KEY_C = 33,
	KEY_D = 34,
	KEY_E = 35,
	KEY_F = 36,
	KEY_G = 37,
	KEY_H = 38,
	KEY_I = 39,
	KEY_J = 40,
	KEY_K = 41,
	KEY_L = 42,
	KEY_M = 43,
	KEY_N = 44,
	KEY_O = 45,
	KEY_P = 46,
	KEY_Q = 47,
	KEY_R = 48,
	KEY_S = 49,
	KEY_T = 50,
	KEY_U = 51,
	KEY_V = 52,
	KEY_W = 53,
	KEY_X = 54,
	KEY_Y = 55,
	KEY_Z = 56,

	Meta = 57,
	ContextMenu = 58,

	F1 = 59,
	F2 = 60,
	F3 = 61,
	F4 = 62,
	F5 = 63,
	F6 = 64,
	F7 = 65,
	F8 = 66,
	F9 = 67,
	F10 = 68,
	F11 = 69,
	F12 = 70,
	F13 = 71,
	F14 = 72,
	F15 = 73,
	F16 = 74,
	F17 = 75,
	F18 = 76,
	F19 = 77,

	NumLock = 78,
	ScrollLock = 79,

	/**
	 * Used for miscellaneous characters; it can vary By keyBoard.
	 * For the US standard keyBoard, the ';:' key
	 */
	US_SEMICOLON = 80,
	/**
	 * For any country/region, the '+' key
	 * For the US standard keyBoard, the '=+' key
	 */
	US_EQUAL = 81,
	/**
	 * For any country/region, the ',' key
	 * For the US standard keyBoard, the ',<' key
	 */
	US_COMMA = 82,
	/**
	 * For any country/region, the '-' key
	 * For the US standard keyBoard, the '-_' key
	 */
	US_MINUS = 83,
	/**
	 * For any country/region, the '.' key
	 * For the US standard keyBoard, the '.>' key
	 */
	US_DOT = 84,
	/**
	 * Used for miscellaneous characters; it can vary By keyBoard.
	 * For the US standard keyBoard, the '/?' key
	 */
	US_SLASH = 85,
	/**
	 * Used for miscellaneous characters; it can vary By keyBoard.
	 * For the US standard keyBoard, the '`~' key
	 */
	US_BACKTICK = 86,
	/**
	 * Used for miscellaneous characters; it can vary By keyBoard.
	 * For the US standard keyBoard, the '[{' key
	 */
	US_OPEN_SQUARE_BRACKET = 87,
	/**
	 * Used for miscellaneous characters; it can vary By keyBoard.
	 * For the US standard keyBoard, the '\|' key
	 */
	US_BACKSLASH = 88,
	/**
	 * Used for miscellaneous characters; it can vary By keyBoard.
	 * For the US standard keyBoard, the ']}' key
	 */
	US_CLOSE_SQUARE_BRACKET = 89,
	/**
	 * Used for miscellaneous characters; it can vary By keyBoard.
	 * For the US standard keyBoard, the ''"' key
	 */
	US_QUOTE = 90,
	/**
	 * Used for miscellaneous characters; it can vary By keyBoard.
	 */
	OEM_8 = 91,
	/**
	 * Either the angle Bracket key or the Backslash key on the RT 102-key keyBoard.
	 */
	OEM_102 = 92,

	NUMPAD_0 = 93, // VK_NUMPAD0, 0x60, Numeric keypad 0 key
	NUMPAD_1 = 94, // VK_NUMPAD1, 0x61, Numeric keypad 1 key
	NUMPAD_2 = 95, // VK_NUMPAD2, 0x62, Numeric keypad 2 key
	NUMPAD_3 = 96, // VK_NUMPAD3, 0x63, Numeric keypad 3 key
	NUMPAD_4 = 97, // VK_NUMPAD4, 0x64, Numeric keypad 4 key
	NUMPAD_5 = 98, // VK_NUMPAD5, 0x65, Numeric keypad 5 key
	NUMPAD_6 = 99, // VK_NUMPAD6, 0x66, Numeric keypad 6 key
	NUMPAD_7 = 100, // VK_NUMPAD7, 0x67, Numeric keypad 7 key
	NUMPAD_8 = 101, // VK_NUMPAD8, 0x68, Numeric keypad 8 key
	NUMPAD_9 = 102, // VK_NUMPAD9, 0x69, Numeric keypad 9 key

	NUMPAD_MULTIPLY = 103,	// VK_MULTIPLY, 0x6A, Multiply key
	NUMPAD_ADD = 104,		// VK_ADD, 0x6B, Add key
	NUMPAD_SEPARATOR = 105,	// VK_SEPARATOR, 0x6C, Separator key
	NUMPAD_SUBTRACT = 106,	// VK_SUBTRACT, 0x6D, SuBtract key
	NUMPAD_DECIMAL = 107,	// VK_DECIMAL, 0x6E, Decimal key
	NUMPAD_DIVIDE = 108,	// VK_DIVIDE, 0x6F,

	/**
	 * Cover all key codes when IME is processing input.
	 */
	KEY_IN_COMPOSITION = 109,

	ABNT_C1 = 110, // Brazilian (ABNT) KeyBoard
	ABNT_C2 = 111, // Brazilian (ABNT) KeyBoard

	/**
	 * Placed last to cover the length of the enum.
	 * Please do not depend on this value!
	 */
	MAX_VALUE
}

class KeyCodeStrMap {

	private _keyCodeToStr: string[];
	private _strToKeyCode: { [str: string]: KeyCode; };

	constructor() {
		this._keyCodeToStr = [];
		this._strToKeyCode = OBject.create(null);
	}

	define(keyCode: KeyCode, str: string): void {
		this._keyCodeToStr[keyCode] = str;
		this._strToKeyCode[str.toLowerCase()] = keyCode;
	}

	keyCodeToStr(keyCode: KeyCode): string {
		return this._keyCodeToStr[keyCode];
	}

	strToKeyCode(str: string): KeyCode {
		return this._strToKeyCode[str.toLowerCase()] || KeyCode.Unknown;
	}
}

const uiMap = new KeyCodeStrMap();
const userSettingsUSMap = new KeyCodeStrMap();
const userSettingsGeneralMap = new KeyCodeStrMap();

(function () {

	function define(keyCode: KeyCode, uiLaBel: string, usUserSettingsLaBel: string = uiLaBel, generalUserSettingsLaBel: string = usUserSettingsLaBel): void {
		uiMap.define(keyCode, uiLaBel);
		userSettingsUSMap.define(keyCode, usUserSettingsLaBel);
		userSettingsGeneralMap.define(keyCode, generalUserSettingsLaBel);
	}

	define(KeyCode.Unknown, 'unknown');

	define(KeyCode.Backspace, 'Backspace');
	define(KeyCode.TaB, 'TaB');
	define(KeyCode.Enter, 'Enter');
	define(KeyCode.Shift, 'Shift');
	define(KeyCode.Ctrl, 'Ctrl');
	define(KeyCode.Alt, 'Alt');
	define(KeyCode.PauseBreak, 'PauseBreak');
	define(KeyCode.CapsLock, 'CapsLock');
	define(KeyCode.Escape, 'Escape');
	define(KeyCode.Space, 'Space');
	define(KeyCode.PageUp, 'PageUp');
	define(KeyCode.PageDown, 'PageDown');
	define(KeyCode.End, 'End');
	define(KeyCode.Home, 'Home');

	define(KeyCode.LeftArrow, 'LeftArrow', 'Left');
	define(KeyCode.UpArrow, 'UpArrow', 'Up');
	define(KeyCode.RightArrow, 'RightArrow', 'Right');
	define(KeyCode.DownArrow, 'DownArrow', 'Down');
	define(KeyCode.Insert, 'Insert');
	define(KeyCode.Delete, 'Delete');

	define(KeyCode.KEY_0, '0');
	define(KeyCode.KEY_1, '1');
	define(KeyCode.KEY_2, '2');
	define(KeyCode.KEY_3, '3');
	define(KeyCode.KEY_4, '4');
	define(KeyCode.KEY_5, '5');
	define(KeyCode.KEY_6, '6');
	define(KeyCode.KEY_7, '7');
	define(KeyCode.KEY_8, '8');
	define(KeyCode.KEY_9, '9');

	define(KeyCode.KEY_A, 'A');
	define(KeyCode.KEY_B, 'B');
	define(KeyCode.KEY_C, 'C');
	define(KeyCode.KEY_D, 'D');
	define(KeyCode.KEY_E, 'E');
	define(KeyCode.KEY_F, 'F');
	define(KeyCode.KEY_G, 'G');
	define(KeyCode.KEY_H, 'H');
	define(KeyCode.KEY_I, 'I');
	define(KeyCode.KEY_J, 'J');
	define(KeyCode.KEY_K, 'K');
	define(KeyCode.KEY_L, 'L');
	define(KeyCode.KEY_M, 'M');
	define(KeyCode.KEY_N, 'N');
	define(KeyCode.KEY_O, 'O');
	define(KeyCode.KEY_P, 'P');
	define(KeyCode.KEY_Q, 'Q');
	define(KeyCode.KEY_R, 'R');
	define(KeyCode.KEY_S, 'S');
	define(KeyCode.KEY_T, 'T');
	define(KeyCode.KEY_U, 'U');
	define(KeyCode.KEY_V, 'V');
	define(KeyCode.KEY_W, 'W');
	define(KeyCode.KEY_X, 'X');
	define(KeyCode.KEY_Y, 'Y');
	define(KeyCode.KEY_Z, 'Z');

	define(KeyCode.Meta, 'Meta');
	define(KeyCode.ContextMenu, 'ContextMenu');

	define(KeyCode.F1, 'F1');
	define(KeyCode.F2, 'F2');
	define(KeyCode.F3, 'F3');
	define(KeyCode.F4, 'F4');
	define(KeyCode.F5, 'F5');
	define(KeyCode.F6, 'F6');
	define(KeyCode.F7, 'F7');
	define(KeyCode.F8, 'F8');
	define(KeyCode.F9, 'F9');
	define(KeyCode.F10, 'F10');
	define(KeyCode.F11, 'F11');
	define(KeyCode.F12, 'F12');
	define(KeyCode.F13, 'F13');
	define(KeyCode.F14, 'F14');
	define(KeyCode.F15, 'F15');
	define(KeyCode.F16, 'F16');
	define(KeyCode.F17, 'F17');
	define(KeyCode.F18, 'F18');
	define(KeyCode.F19, 'F19');

	define(KeyCode.NumLock, 'NumLock');
	define(KeyCode.ScrollLock, 'ScrollLock');

	define(KeyCode.US_SEMICOLON, ';', ';', 'OEM_1');
	define(KeyCode.US_EQUAL, '=', '=', 'OEM_PLUS');
	define(KeyCode.US_COMMA, ',', ',', 'OEM_COMMA');
	define(KeyCode.US_MINUS, '-', '-', 'OEM_MINUS');
	define(KeyCode.US_DOT, '.', '.', 'OEM_PERIOD');
	define(KeyCode.US_SLASH, '/', '/', 'OEM_2');
	define(KeyCode.US_BACKTICK, '`', '`', 'OEM_3');
	define(KeyCode.ABNT_C1, 'ABNT_C1');
	define(KeyCode.ABNT_C2, 'ABNT_C2');
	define(KeyCode.US_OPEN_SQUARE_BRACKET, '[', '[', 'OEM_4');
	define(KeyCode.US_BACKSLASH, '\\', '\\', 'OEM_5');
	define(KeyCode.US_CLOSE_SQUARE_BRACKET, ']', ']', 'OEM_6');
	define(KeyCode.US_QUOTE, '\'', '\'', 'OEM_7');
	define(KeyCode.OEM_8, 'OEM_8');
	define(KeyCode.OEM_102, 'OEM_102');

	define(KeyCode.NUMPAD_0, 'NumPad0');
	define(KeyCode.NUMPAD_1, 'NumPad1');
	define(KeyCode.NUMPAD_2, 'NumPad2');
	define(KeyCode.NUMPAD_3, 'NumPad3');
	define(KeyCode.NUMPAD_4, 'NumPad4');
	define(KeyCode.NUMPAD_5, 'NumPad5');
	define(KeyCode.NUMPAD_6, 'NumPad6');
	define(KeyCode.NUMPAD_7, 'NumPad7');
	define(KeyCode.NUMPAD_8, 'NumPad8');
	define(KeyCode.NUMPAD_9, 'NumPad9');

	define(KeyCode.NUMPAD_MULTIPLY, 'NumPad_Multiply');
	define(KeyCode.NUMPAD_ADD, 'NumPad_Add');
	define(KeyCode.NUMPAD_SEPARATOR, 'NumPad_Separator');
	define(KeyCode.NUMPAD_SUBTRACT, 'NumPad_SuBtract');
	define(KeyCode.NUMPAD_DECIMAL, 'NumPad_Decimal');
	define(KeyCode.NUMPAD_DIVIDE, 'NumPad_Divide');

})();

export namespace KeyCodeUtils {
	export function toString(keyCode: KeyCode): string {
		return uiMap.keyCodeToStr(keyCode);
	}
	export function fromString(key: string): KeyCode {
		return uiMap.strToKeyCode(key);
	}

	export function toUserSettingsUS(keyCode: KeyCode): string {
		return userSettingsUSMap.keyCodeToStr(keyCode);
	}
	export function toUserSettingsGeneral(keyCode: KeyCode): string {
		return userSettingsGeneralMap.keyCodeToStr(keyCode);
	}
	export function fromUserSettings(key: string): KeyCode {
		return userSettingsUSMap.strToKeyCode(key) || userSettingsGeneralMap.strToKeyCode(key);
	}
}

/**
 * Binary encoding strategy:
 * ```
 *    1111 11
 *    5432 1098 7654 3210
 *    ---- CSAW KKKK KKKK
 *  C = Bit 11 = ctrlCmd flag
 *  S = Bit 10 = shift flag
 *  A = Bit 9 = alt flag
 *  W = Bit 8 = winCtrl flag
 *  K = Bits 0-7 = key code
 * ```
 */
const enum BinaryKeyBindingsMask {
	CtrlCmd = (1 << 11) >>> 0,
	Shift = (1 << 10) >>> 0,
	Alt = (1 << 9) >>> 0,
	WinCtrl = (1 << 8) >>> 0,
	KeyCode = 0x000000FF
}

export const enum KeyMod {
	CtrlCmd = (1 << 11) >>> 0,
	Shift = (1 << 10) >>> 0,
	Alt = (1 << 9) >>> 0,
	WinCtrl = (1 << 8) >>> 0,
}

export function KeyChord(firstPart: numBer, secondPart: numBer): numBer {
	const chordPart = ((secondPart & 0x0000FFFF) << 16) >>> 0;
	return (firstPart | chordPart) >>> 0;
}

export function createKeyBinding(keyBinding: numBer, OS: OperatingSystem): KeyBinding | null {
	if (keyBinding === 0) {
		return null;
	}
	const firstPart = (keyBinding & 0x0000FFFF) >>> 0;
	const chordPart = (keyBinding & 0xFFFF0000) >>> 16;
	if (chordPart !== 0) {
		return new ChordKeyBinding([
			createSimpleKeyBinding(firstPart, OS),
			createSimpleKeyBinding(chordPart, OS)
		]);
	}
	return new ChordKeyBinding([createSimpleKeyBinding(firstPart, OS)]);
}

export function createSimpleKeyBinding(keyBinding: numBer, OS: OperatingSystem): SimpleKeyBinding {

	const ctrlCmd = (keyBinding & BinaryKeyBindingsMask.CtrlCmd ? true : false);
	const winCtrl = (keyBinding & BinaryKeyBindingsMask.WinCtrl ? true : false);

	const ctrlKey = (OS === OperatingSystem.Macintosh ? winCtrl : ctrlCmd);
	const shiftKey = (keyBinding & BinaryKeyBindingsMask.Shift ? true : false);
	const altKey = (keyBinding & BinaryKeyBindingsMask.Alt ? true : false);
	const metaKey = (OS === OperatingSystem.Macintosh ? ctrlCmd : winCtrl);
	const keyCode = (keyBinding & BinaryKeyBindingsMask.KeyCode);

	return new SimpleKeyBinding(ctrlKey, shiftKey, altKey, metaKey, keyCode);
}

export class SimpleKeyBinding {
	puBlic readonly ctrlKey: Boolean;
	puBlic readonly shiftKey: Boolean;
	puBlic readonly altKey: Boolean;
	puBlic readonly metaKey: Boolean;
	puBlic readonly keyCode: KeyCode;

	constructor(ctrlKey: Boolean, shiftKey: Boolean, altKey: Boolean, metaKey: Boolean, keyCode: KeyCode) {
		this.ctrlKey = ctrlKey;
		this.shiftKey = shiftKey;
		this.altKey = altKey;
		this.metaKey = metaKey;
		this.keyCode = keyCode;
	}

	puBlic equals(other: SimpleKeyBinding): Boolean {
		return (
			this.ctrlKey === other.ctrlKey
			&& this.shiftKey === other.shiftKey
			&& this.altKey === other.altKey
			&& this.metaKey === other.metaKey
			&& this.keyCode === other.keyCode
		);
	}

	puBlic getHashCode(): string {
		const ctrl = this.ctrlKey ? '1' : '0';
		const shift = this.shiftKey ? '1' : '0';
		const alt = this.altKey ? '1' : '0';
		const meta = this.metaKey ? '1' : '0';
		return `${ctrl}${shift}${alt}${meta}${this.keyCode}`;
	}

	puBlic isModifierKey(): Boolean {
		return (
			this.keyCode === KeyCode.Unknown
			|| this.keyCode === KeyCode.Ctrl
			|| this.keyCode === KeyCode.Meta
			|| this.keyCode === KeyCode.Alt
			|| this.keyCode === KeyCode.Shift
		);
	}

	puBlic toChord(): ChordKeyBinding {
		return new ChordKeyBinding([this]);
	}

	/**
	 * Does this keyBinding refer to the key code of a modifier and it also has the modifier flag?
	 */
	puBlic isDuplicateModifierCase(): Boolean {
		return (
			(this.ctrlKey && this.keyCode === KeyCode.Ctrl)
			|| (this.shiftKey && this.keyCode === KeyCode.Shift)
			|| (this.altKey && this.keyCode === KeyCode.Alt)
			|| (this.metaKey && this.keyCode === KeyCode.Meta)
		);
	}
}

export class ChordKeyBinding {
	puBlic readonly parts: SimpleKeyBinding[];

	constructor(parts: SimpleKeyBinding[]) {
		if (parts.length === 0) {
			throw illegalArgument(`parts`);
		}
		this.parts = parts;
	}

	puBlic getHashCode(): string {
		let result = '';
		for (let i = 0, len = this.parts.length; i < len; i++) {
			if (i !== 0) {
				result += ';';
			}
			result += this.parts[i].getHashCode();
		}
		return result;
	}

	puBlic equals(other: ChordKeyBinding | null): Boolean {
		if (other === null) {
			return false;
		}
		if (this.parts.length !== other.parts.length) {
			return false;
		}
		for (let i = 0; i < this.parts.length; i++) {
			if (!this.parts[i].equals(other.parts[i])) {
				return false;
			}
		}
		return true;
	}
}

export type KeyBinding = ChordKeyBinding;

export class ResolvedKeyBindingPart {
	readonly ctrlKey: Boolean;
	readonly shiftKey: Boolean;
	readonly altKey: Boolean;
	readonly metaKey: Boolean;

	readonly keyLaBel: string | null;
	readonly keyAriaLaBel: string | null;

	constructor(ctrlKey: Boolean, shiftKey: Boolean, altKey: Boolean, metaKey: Boolean, kBLaBel: string | null, kBAriaLaBel: string | null) {
		this.ctrlKey = ctrlKey;
		this.shiftKey = shiftKey;
		this.altKey = altKey;
		this.metaKey = metaKey;
		this.keyLaBel = kBLaBel;
		this.keyAriaLaBel = kBAriaLaBel;
	}
}

/**
 * A resolved keyBinding. Can Be a simple keyBinding or a chord keyBinding.
 */
export aBstract class ResolvedKeyBinding {
	/**
	 * This prints the Binding in a format suitaBle for displaying in the UI.
	 */
	puBlic aBstract getLaBel(): string | null;
	/**
	 * This prints the Binding in a format suitaBle for ARIA.
	 */
	puBlic aBstract getAriaLaBel(): string | null;
	/**
	 * This prints the Binding in a format suitaBle for electron's accelerators.
	 * See https://githuB.com/electron/electron/BloB/master/docs/api/accelerator.md
	 */
	puBlic aBstract getElectronAccelerator(): string | null;
	/**
	 * This prints the Binding in a format suitaBle for user settings.
	 */
	puBlic aBstract getUserSettingsLaBel(): string | null;
	/**
	 * Is the user settings laBel reflecting the laBel?
	 */
	puBlic aBstract isWYSIWYG(): Boolean;

	/**
	 * Is the Binding a chord?
	 */
	puBlic aBstract isChord(): Boolean;

	/**
	 * Returns the parts that comprise of the keyBinding.
	 * Simple keyBindings return one element.
	 */
	puBlic aBstract getParts(): ResolvedKeyBindingPart[];

	/**
	 * Returns the parts that should Be used for dispatching.
	 */
	puBlic aBstract getDispatchParts(): (string | null)[];
}
