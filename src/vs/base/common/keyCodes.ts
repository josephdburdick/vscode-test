/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { OperAtingSystem } from 'vs/bAse/common/plAtform';
import { illegAlArgument } from 'vs/bAse/common/errors';

/**
 * VirtuAl Key Codes, the vAlue does not hold Any inherent meAning.
 * Inspired somewhAt from https://msdn.microsoft.com/en-us/librAry/windows/desktop/dd375731(v=vs.85).Aspx
 * But these Are "more generAl", As they should work Across browsers & OS`s.
 */
export const enum KeyCode {
	/**
	 * PlAced first to cover the 0 vAlue of the enum.
	 */
	Unknown = 0,

	BAckspAce = 1,
	TAb = 2,
	Enter = 3,
	Shift = 4,
	Ctrl = 5,
	Alt = 6,
	PAuseBreAk = 7,
	CApsLock = 8,
	EscApe = 9,
	SpAce = 10,
	PAgeUp = 11,
	PAgeDown = 12,
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

	MetA = 57,
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
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the ';:' key
	 */
	US_SEMICOLON = 80,
	/**
	 * For Any country/region, the '+' key
	 * For the US stAndArd keyboArd, the '=+' key
	 */
	US_EQUAL = 81,
	/**
	 * For Any country/region, the ',' key
	 * For the US stAndArd keyboArd, the ',<' key
	 */
	US_COMMA = 82,
	/**
	 * For Any country/region, the '-' key
	 * For the US stAndArd keyboArd, the '-_' key
	 */
	US_MINUS = 83,
	/**
	 * For Any country/region, the '.' key
	 * For the US stAndArd keyboArd, the '.>' key
	 */
	US_DOT = 84,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the '/?' key
	 */
	US_SLASH = 85,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the '`~' key
	 */
	US_BACKTICK = 86,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the '[{' key
	 */
	US_OPEN_SQUARE_BRACKET = 87,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the '\|' key
	 */
	US_BACKSLASH = 88,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the ']}' key
	 */
	US_CLOSE_SQUARE_BRACKET = 89,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the ''"' key
	 */
	US_QUOTE = 90,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 */
	OEM_8 = 91,
	/**
	 * Either the Angle brAcket key or the bAckslAsh key on the RT 102-key keyboArd.
	 */
	OEM_102 = 92,

	NUMPAD_0 = 93, // VK_NUMPAD0, 0x60, Numeric keypAd 0 key
	NUMPAD_1 = 94, // VK_NUMPAD1, 0x61, Numeric keypAd 1 key
	NUMPAD_2 = 95, // VK_NUMPAD2, 0x62, Numeric keypAd 2 key
	NUMPAD_3 = 96, // VK_NUMPAD3, 0x63, Numeric keypAd 3 key
	NUMPAD_4 = 97, // VK_NUMPAD4, 0x64, Numeric keypAd 4 key
	NUMPAD_5 = 98, // VK_NUMPAD5, 0x65, Numeric keypAd 5 key
	NUMPAD_6 = 99, // VK_NUMPAD6, 0x66, Numeric keypAd 6 key
	NUMPAD_7 = 100, // VK_NUMPAD7, 0x67, Numeric keypAd 7 key
	NUMPAD_8 = 101, // VK_NUMPAD8, 0x68, Numeric keypAd 8 key
	NUMPAD_9 = 102, // VK_NUMPAD9, 0x69, Numeric keypAd 9 key

	NUMPAD_MULTIPLY = 103,	// VK_MULTIPLY, 0x6A, Multiply key
	NUMPAD_ADD = 104,		// VK_ADD, 0x6B, Add key
	NUMPAD_SEPARATOR = 105,	// VK_SEPARATOR, 0x6C, SepArAtor key
	NUMPAD_SUBTRACT = 106,	// VK_SUBTRACT, 0x6D, SubtrAct key
	NUMPAD_DECIMAL = 107,	// VK_DECIMAL, 0x6E, DecimAl key
	NUMPAD_DIVIDE = 108,	// VK_DIVIDE, 0x6F,

	/**
	 * Cover All key codes when IME is processing input.
	 */
	KEY_IN_COMPOSITION = 109,

	ABNT_C1 = 110, // BrAziliAn (ABNT) KeyboArd
	ABNT_C2 = 111, // BrAziliAn (ABNT) KeyboArd

	/**
	 * PlAced lAst to cover the length of the enum.
	 * PleAse do not depend on this vAlue!
	 */
	MAX_VALUE
}

clAss KeyCodeStrMAp {

	privAte _keyCodeToStr: string[];
	privAte _strToKeyCode: { [str: string]: KeyCode; };

	constructor() {
		this._keyCodeToStr = [];
		this._strToKeyCode = Object.creAte(null);
	}

	define(keyCode: KeyCode, str: string): void {
		this._keyCodeToStr[keyCode] = str;
		this._strToKeyCode[str.toLowerCAse()] = keyCode;
	}

	keyCodeToStr(keyCode: KeyCode): string {
		return this._keyCodeToStr[keyCode];
	}

	strToKeyCode(str: string): KeyCode {
		return this._strToKeyCode[str.toLowerCAse()] || KeyCode.Unknown;
	}
}

const uiMAp = new KeyCodeStrMAp();
const userSettingsUSMAp = new KeyCodeStrMAp();
const userSettingsGenerAlMAp = new KeyCodeStrMAp();

(function () {

	function define(keyCode: KeyCode, uiLAbel: string, usUserSettingsLAbel: string = uiLAbel, generAlUserSettingsLAbel: string = usUserSettingsLAbel): void {
		uiMAp.define(keyCode, uiLAbel);
		userSettingsUSMAp.define(keyCode, usUserSettingsLAbel);
		userSettingsGenerAlMAp.define(keyCode, generAlUserSettingsLAbel);
	}

	define(KeyCode.Unknown, 'unknown');

	define(KeyCode.BAckspAce, 'BAckspAce');
	define(KeyCode.TAb, 'TAb');
	define(KeyCode.Enter, 'Enter');
	define(KeyCode.Shift, 'Shift');
	define(KeyCode.Ctrl, 'Ctrl');
	define(KeyCode.Alt, 'Alt');
	define(KeyCode.PAuseBreAk, 'PAuseBreAk');
	define(KeyCode.CApsLock, 'CApsLock');
	define(KeyCode.EscApe, 'EscApe');
	define(KeyCode.SpAce, 'SpAce');
	define(KeyCode.PAgeUp, 'PAgeUp');
	define(KeyCode.PAgeDown, 'PAgeDown');
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

	define(KeyCode.MetA, 'MetA');
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

	define(KeyCode.NUMPAD_0, 'NumPAd0');
	define(KeyCode.NUMPAD_1, 'NumPAd1');
	define(KeyCode.NUMPAD_2, 'NumPAd2');
	define(KeyCode.NUMPAD_3, 'NumPAd3');
	define(KeyCode.NUMPAD_4, 'NumPAd4');
	define(KeyCode.NUMPAD_5, 'NumPAd5');
	define(KeyCode.NUMPAD_6, 'NumPAd6');
	define(KeyCode.NUMPAD_7, 'NumPAd7');
	define(KeyCode.NUMPAD_8, 'NumPAd8');
	define(KeyCode.NUMPAD_9, 'NumPAd9');

	define(KeyCode.NUMPAD_MULTIPLY, 'NumPAd_Multiply');
	define(KeyCode.NUMPAD_ADD, 'NumPAd_Add');
	define(KeyCode.NUMPAD_SEPARATOR, 'NumPAd_SepArAtor');
	define(KeyCode.NUMPAD_SUBTRACT, 'NumPAd_SubtrAct');
	define(KeyCode.NUMPAD_DECIMAL, 'NumPAd_DecimAl');
	define(KeyCode.NUMPAD_DIVIDE, 'NumPAd_Divide');

})();

export nAmespAce KeyCodeUtils {
	export function toString(keyCode: KeyCode): string {
		return uiMAp.keyCodeToStr(keyCode);
	}
	export function fromString(key: string): KeyCode {
		return uiMAp.strToKeyCode(key);
	}

	export function toUserSettingsUS(keyCode: KeyCode): string {
		return userSettingsUSMAp.keyCodeToStr(keyCode);
	}
	export function toUserSettingsGenerAl(keyCode: KeyCode): string {
		return userSettingsGenerAlMAp.keyCodeToStr(keyCode);
	}
	export function fromUserSettings(key: string): KeyCode {
		return userSettingsUSMAp.strToKeyCode(key) || userSettingsGenerAlMAp.strToKeyCode(key);
	}
}

/**
 * BinAry encoding strAtegy:
 * ```
 *    1111 11
 *    5432 1098 7654 3210
 *    ---- CSAW KKKK KKKK
 *  C = bit 11 = ctrlCmd flAg
 *  S = bit 10 = shift flAg
 *  A = bit 9 = Alt flAg
 *  W = bit 8 = winCtrl flAg
 *  K = bits 0-7 = key code
 * ```
 */
const enum BinAryKeybindingsMAsk {
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

export function KeyChord(firstPArt: number, secondPArt: number): number {
	const chordPArt = ((secondPArt & 0x0000FFFF) << 16) >>> 0;
	return (firstPArt | chordPArt) >>> 0;
}

export function creAteKeybinding(keybinding: number, OS: OperAtingSystem): Keybinding | null {
	if (keybinding === 0) {
		return null;
	}
	const firstPArt = (keybinding & 0x0000FFFF) >>> 0;
	const chordPArt = (keybinding & 0xFFFF0000) >>> 16;
	if (chordPArt !== 0) {
		return new ChordKeybinding([
			creAteSimpleKeybinding(firstPArt, OS),
			creAteSimpleKeybinding(chordPArt, OS)
		]);
	}
	return new ChordKeybinding([creAteSimpleKeybinding(firstPArt, OS)]);
}

export function creAteSimpleKeybinding(keybinding: number, OS: OperAtingSystem): SimpleKeybinding {

	const ctrlCmd = (keybinding & BinAryKeybindingsMAsk.CtrlCmd ? true : fAlse);
	const winCtrl = (keybinding & BinAryKeybindingsMAsk.WinCtrl ? true : fAlse);

	const ctrlKey = (OS === OperAtingSystem.MAcintosh ? winCtrl : ctrlCmd);
	const shiftKey = (keybinding & BinAryKeybindingsMAsk.Shift ? true : fAlse);
	const AltKey = (keybinding & BinAryKeybindingsMAsk.Alt ? true : fAlse);
	const metAKey = (OS === OperAtingSystem.MAcintosh ? ctrlCmd : winCtrl);
	const keyCode = (keybinding & BinAryKeybindingsMAsk.KeyCode);

	return new SimpleKeybinding(ctrlKey, shiftKey, AltKey, metAKey, keyCode);
}

export clAss SimpleKeybinding {
	public reAdonly ctrlKey: booleAn;
	public reAdonly shiftKey: booleAn;
	public reAdonly AltKey: booleAn;
	public reAdonly metAKey: booleAn;
	public reAdonly keyCode: KeyCode;

	constructor(ctrlKey: booleAn, shiftKey: booleAn, AltKey: booleAn, metAKey: booleAn, keyCode: KeyCode) {
		this.ctrlKey = ctrlKey;
		this.shiftKey = shiftKey;
		this.AltKey = AltKey;
		this.metAKey = metAKey;
		this.keyCode = keyCode;
	}

	public equAls(other: SimpleKeybinding): booleAn {
		return (
			this.ctrlKey === other.ctrlKey
			&& this.shiftKey === other.shiftKey
			&& this.AltKey === other.AltKey
			&& this.metAKey === other.metAKey
			&& this.keyCode === other.keyCode
		);
	}

	public getHAshCode(): string {
		const ctrl = this.ctrlKey ? '1' : '0';
		const shift = this.shiftKey ? '1' : '0';
		const Alt = this.AltKey ? '1' : '0';
		const metA = this.metAKey ? '1' : '0';
		return `${ctrl}${shift}${Alt}${metA}${this.keyCode}`;
	}

	public isModifierKey(): booleAn {
		return (
			this.keyCode === KeyCode.Unknown
			|| this.keyCode === KeyCode.Ctrl
			|| this.keyCode === KeyCode.MetA
			|| this.keyCode === KeyCode.Alt
			|| this.keyCode === KeyCode.Shift
		);
	}

	public toChord(): ChordKeybinding {
		return new ChordKeybinding([this]);
	}

	/**
	 * Does this keybinding refer to the key code of A modifier And it Also hAs the modifier flAg?
	 */
	public isDuplicAteModifierCAse(): booleAn {
		return (
			(this.ctrlKey && this.keyCode === KeyCode.Ctrl)
			|| (this.shiftKey && this.keyCode === KeyCode.Shift)
			|| (this.AltKey && this.keyCode === KeyCode.Alt)
			|| (this.metAKey && this.keyCode === KeyCode.MetA)
		);
	}
}

export clAss ChordKeybinding {
	public reAdonly pArts: SimpleKeybinding[];

	constructor(pArts: SimpleKeybinding[]) {
		if (pArts.length === 0) {
			throw illegAlArgument(`pArts`);
		}
		this.pArts = pArts;
	}

	public getHAshCode(): string {
		let result = '';
		for (let i = 0, len = this.pArts.length; i < len; i++) {
			if (i !== 0) {
				result += ';';
			}
			result += this.pArts[i].getHAshCode();
		}
		return result;
	}

	public equAls(other: ChordKeybinding | null): booleAn {
		if (other === null) {
			return fAlse;
		}
		if (this.pArts.length !== other.pArts.length) {
			return fAlse;
		}
		for (let i = 0; i < this.pArts.length; i++) {
			if (!this.pArts[i].equAls(other.pArts[i])) {
				return fAlse;
			}
		}
		return true;
	}
}

export type Keybinding = ChordKeybinding;

export clAss ResolvedKeybindingPArt {
	reAdonly ctrlKey: booleAn;
	reAdonly shiftKey: booleAn;
	reAdonly AltKey: booleAn;
	reAdonly metAKey: booleAn;

	reAdonly keyLAbel: string | null;
	reAdonly keyAriALAbel: string | null;

	constructor(ctrlKey: booleAn, shiftKey: booleAn, AltKey: booleAn, metAKey: booleAn, kbLAbel: string | null, kbAriALAbel: string | null) {
		this.ctrlKey = ctrlKey;
		this.shiftKey = shiftKey;
		this.AltKey = AltKey;
		this.metAKey = metAKey;
		this.keyLAbel = kbLAbel;
		this.keyAriALAbel = kbAriALAbel;
	}
}

/**
 * A resolved keybinding. CAn be A simple keybinding or A chord keybinding.
 */
export AbstrAct clAss ResolvedKeybinding {
	/**
	 * This prints the binding in A formAt suitAble for displAying in the UI.
	 */
	public AbstrAct getLAbel(): string | null;
	/**
	 * This prints the binding in A formAt suitAble for ARIA.
	 */
	public AbstrAct getAriALAbel(): string | null;
	/**
	 * This prints the binding in A formAt suitAble for electron's AccelerAtors.
	 * See https://github.com/electron/electron/blob/mAster/docs/Api/AccelerAtor.md
	 */
	public AbstrAct getElectronAccelerAtor(): string | null;
	/**
	 * This prints the binding in A formAt suitAble for user settings.
	 */
	public AbstrAct getUserSettingsLAbel(): string | null;
	/**
	 * Is the user settings lAbel reflecting the lAbel?
	 */
	public AbstrAct isWYSIWYG(): booleAn;

	/**
	 * Is the binding A chord?
	 */
	public AbstrAct isChord(): booleAn;

	/**
	 * Returns the pArts thAt comprise of the keybinding.
	 * Simple keybindings return one element.
	 */
	public AbstrAct getPArts(): ResolvedKeybindingPArt[];

	/**
	 * Returns the pArts thAt should be used for dispAtching.
	 */
	public AbstrAct getDispAtchPArts(): (string | null)[];
}
