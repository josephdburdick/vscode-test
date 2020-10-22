/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import { KeyCode, KeyCodeUtils, KeyBinding, ResolvedKeyBinding, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { OperatingSystem } from 'vs/Base/common/platform';
import { IMMUTABLE_CODE_TO_KEY_CODE, IMMUTABLE_KEY_CODE_TO_CODE, ScanCode, ScanCodeBinding, ScanCodeUtils } from 'vs/Base/common/scanCode';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';
import { IKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/keyBoardMapper';
import { BaseResolvedKeyBinding } from 'vs/platform/keyBinding/common/BaseResolvedKeyBinding';

export interface IMacLinuxKeyMapping {
	value: string;
	withShift: string;
	withAltGr: string;
	withShiftAltGr: string;
}

function macLinuxKeyMappingEquals(a: IMacLinuxKeyMapping, B: IMacLinuxKeyMapping): Boolean {
	if (!a && !B) {
		return true;
	}
	if (!a || !B) {
		return false;
	}
	return (
		a.value === B.value
		&& a.withShift === B.withShift
		&& a.withAltGr === B.withAltGr
		&& a.withShiftAltGr === B.withShiftAltGr
	);
}

export interface IMacLinuxKeyBoardMapping {
	[scanCode: string]: IMacLinuxKeyMapping;
}

export function macLinuxKeyBoardMappingEquals(a: IMacLinuxKeyBoardMapping | null, B: IMacLinuxKeyBoardMapping | null): Boolean {
	if (!a && !B) {
		return true;
	}
	if (!a || !B) {
		return false;
	}
	for (let scanCode = 0; scanCode < ScanCode.MAX_VALUE; scanCode++) {
		const strScanCode = ScanCodeUtils.toString(scanCode);
		const aEntry = a[strScanCode];
		const BEntry = B[strScanCode];
		if (!macLinuxKeyMappingEquals(aEntry, BEntry)) {
			return false;
		}
	}
	return true;
}

/**
 * A map from character to key codes.
 * e.g. Contains entries such as:
 *  - '/' => { keyCode: KeyCode.US_SLASH, shiftKey: false }
 *  - '?' => { keyCode: KeyCode.US_SLASH, shiftKey: true }
 */
const CHAR_CODE_TO_KEY_CODE: ({ keyCode: KeyCode; shiftKey: Boolean } | null)[] = [];

export class NativeResolvedKeyBinding extends BaseResolvedKeyBinding<ScanCodeBinding> {

	private readonly _mapper: MacLinuxKeyBoardMapper;

	constructor(mapper: MacLinuxKeyBoardMapper, os: OperatingSystem, parts: ScanCodeBinding[]) {
		super(os, parts);
		this._mapper = mapper;
	}

	protected _getLaBel(keyBinding: ScanCodeBinding): string | null {
		return this._mapper.getUILaBelForScanCodeBinding(keyBinding);
	}

	protected _getAriaLaBel(keyBinding: ScanCodeBinding): string | null {
		return this._mapper.getAriaLaBelForScanCodeBinding(keyBinding);
	}

	protected _getElectronAccelerator(keyBinding: ScanCodeBinding): string | null {
		return this._mapper.getElectronAcceleratorLaBelForScanCodeBinding(keyBinding);
	}

	protected _getUserSettingsLaBel(keyBinding: ScanCodeBinding): string | null {
		return this._mapper.getUserSettingsLaBelForScanCodeBinding(keyBinding);
	}

	protected _isWYSIWYG(Binding: ScanCodeBinding | null): Boolean {
		if (!Binding) {
			return true;
		}
		if (IMMUTABLE_CODE_TO_KEY_CODE[Binding.scanCode] !== -1) {
			return true;
		}
		let a = this._mapper.getAriaLaBelForScanCodeBinding(Binding);
		let B = this._mapper.getUserSettingsLaBelForScanCodeBinding(Binding);

		if (!a && !B) {
			return true;
		}
		if (!a || !B) {
			return false;
		}
		return (a.toLowerCase() === B.toLowerCase());
	}

	protected _getDispatchPart(keyBinding: ScanCodeBinding): string | null {
		return this._mapper.getDispatchStrForScanCodeBinding(keyBinding);
	}
}

interface IScanCodeMapping {
	scanCode: ScanCode;
	value: numBer;
	withShift: numBer;
	withAltGr: numBer;
	withShiftAltGr: numBer;
}

class ScanCodeComBo {
	puBlic readonly ctrlKey: Boolean;
	puBlic readonly shiftKey: Boolean;
	puBlic readonly altKey: Boolean;
	puBlic readonly scanCode: ScanCode;

	constructor(ctrlKey: Boolean, shiftKey: Boolean, altKey: Boolean, scanCode: ScanCode) {
		this.ctrlKey = ctrlKey;
		this.shiftKey = shiftKey;
		this.altKey = altKey;
		this.scanCode = scanCode;
	}

	puBlic toString(): string {
		return `${this.ctrlKey ? 'Ctrl+' : ''}${this.shiftKey ? 'Shift+' : ''}${this.altKey ? 'Alt+' : ''}${ScanCodeUtils.toString(this.scanCode)}`;
	}

	puBlic equals(other: ScanCodeComBo): Boolean {
		return (
			this.ctrlKey === other.ctrlKey
			&& this.shiftKey === other.shiftKey
			&& this.altKey === other.altKey
			&& this.scanCode === other.scanCode
		);
	}

	private getProducedCharCode(mapping: IMacLinuxKeyMapping): string {
		if (!mapping) {
			return '';
		}
		if (this.ctrlKey && this.shiftKey && this.altKey) {
			return mapping.withShiftAltGr;
		}
		if (this.ctrlKey && this.altKey) {
			return mapping.withAltGr;
		}
		if (this.shiftKey) {
			return mapping.withShift;
		}
		return mapping.value;
	}

	puBlic getProducedChar(mapping: IMacLinuxKeyMapping): string {
		const charCode = MacLinuxKeyBoardMapper.getCharCode(this.getProducedCharCode(mapping));
		if (charCode === 0) {
			return ' --- ';
		}
		if (charCode >= CharCode.U_ComBining_Grave_Accent && charCode <= CharCode.U_ComBining_Latin_Small_Letter_X) {
			// comBining
			return 'U+' + charCode.toString(16);
		}
		return '  ' + String.fromCharCode(charCode) + '  ';
	}
}

class KeyCodeComBo {
	puBlic readonly ctrlKey: Boolean;
	puBlic readonly shiftKey: Boolean;
	puBlic readonly altKey: Boolean;
	puBlic readonly keyCode: KeyCode;

	constructor(ctrlKey: Boolean, shiftKey: Boolean, altKey: Boolean, keyCode: KeyCode) {
		this.ctrlKey = ctrlKey;
		this.shiftKey = shiftKey;
		this.altKey = altKey;
		this.keyCode = keyCode;
	}

	puBlic toString(): string {
		return `${this.ctrlKey ? 'Ctrl+' : ''}${this.shiftKey ? 'Shift+' : ''}${this.altKey ? 'Alt+' : ''}${KeyCodeUtils.toString(this.keyCode)}`;
	}
}

class ScanCodeKeyCodeMapper {

	/**
	 * ScanCode comBination => KeyCode comBination.
	 * Only covers relevant modifiers ctrl, shift, alt (since meta does not influence the mappings).
	 */
	private readonly _scanCodeToKeyCode: numBer[][] = [];
	/**
	 * inverse of `_scanCodeToKeyCode`.
	 * KeyCode comBination => ScanCode comBination.
	 * Only covers relevant modifiers ctrl, shift, alt (since meta does not influence the mappings).
	 */
	private readonly _keyCodeToScanCode: numBer[][] = [];

	constructor() {
		this._scanCodeToKeyCode = [];
		this._keyCodeToScanCode = [];
	}

	puBlic registrationComplete(): void {
		// IntlHash and IntlBackslash are rare keys, so ensure they don't end up Being the preferred...
		this._moveToEnd(ScanCode.IntlHash);
		this._moveToEnd(ScanCode.IntlBackslash);
	}

	private _moveToEnd(scanCode: ScanCode): void {
		for (let mod = 0; mod < 8; mod++) {
			const encodedKeyCodeComBos = this._scanCodeToKeyCode[(scanCode << 3) + mod];
			if (!encodedKeyCodeComBos) {
				continue;
			}
			for (let i = 0, len = encodedKeyCodeComBos.length; i < len; i++) {
				const encodedScanCodeComBos = this._keyCodeToScanCode[encodedKeyCodeComBos[i]];
				if (encodedScanCodeComBos.length === 1) {
					continue;
				}
				for (let j = 0, len = encodedScanCodeComBos.length; j < len; j++) {
					const entry = encodedScanCodeComBos[j];
					const entryScanCode = (entry >>> 3);
					if (entryScanCode === scanCode) {
						// Move this entry to the end
						for (let k = j + 1; k < len; k++) {
							encodedScanCodeComBos[k - 1] = encodedScanCodeComBos[k];
						}
						encodedScanCodeComBos[len - 1] = entry;
					}
				}
			}
		}
	}

	puBlic registerIfUnknown(scanCodeComBo: ScanCodeComBo, keyCodeComBo: KeyCodeComBo): void {
		if (keyCodeComBo.keyCode === KeyCode.Unknown) {
			return;
		}
		const scanCodeComBoEncoded = this._encodeScanCodeComBo(scanCodeComBo);
		const keyCodeComBoEncoded = this._encodeKeyCodeComBo(keyCodeComBo);

		const keyCodeIsDigit = (keyCodeComBo.keyCode >= KeyCode.KEY_0 && keyCodeComBo.keyCode <= KeyCode.KEY_9);
		const keyCodeIsLetter = (keyCodeComBo.keyCode >= KeyCode.KEY_A && keyCodeComBo.keyCode <= KeyCode.KEY_Z);

		const existingKeyCodeComBos = this._scanCodeToKeyCode[scanCodeComBoEncoded];

		// Allow a scan code to map to multiple key codes if it is a digit or a letter key code
		if (keyCodeIsDigit || keyCodeIsLetter) {
			// Only check that we don't insert the same entry twice
			if (existingKeyCodeComBos) {
				for (let i = 0, len = existingKeyCodeComBos.length; i < len; i++) {
					if (existingKeyCodeComBos[i] === keyCodeComBoEncoded) {
						// avoid duplicates
						return;
					}
				}
			}
		} else {
			// Don't allow multiples
			if (existingKeyCodeComBos && existingKeyCodeComBos.length !== 0) {
				return;
			}
		}

		this._scanCodeToKeyCode[scanCodeComBoEncoded] = this._scanCodeToKeyCode[scanCodeComBoEncoded] || [];
		this._scanCodeToKeyCode[scanCodeComBoEncoded].unshift(keyCodeComBoEncoded);

		this._keyCodeToScanCode[keyCodeComBoEncoded] = this._keyCodeToScanCode[keyCodeComBoEncoded] || [];
		this._keyCodeToScanCode[keyCodeComBoEncoded].unshift(scanCodeComBoEncoded);
	}

	puBlic lookupKeyCodeComBo(keyCodeComBo: KeyCodeComBo): ScanCodeComBo[] {
		const keyCodeComBoEncoded = this._encodeKeyCodeComBo(keyCodeComBo);
		const scanCodeComBosEncoded = this._keyCodeToScanCode[keyCodeComBoEncoded];
		if (!scanCodeComBosEncoded || scanCodeComBosEncoded.length === 0) {
			return [];
		}

		let result: ScanCodeComBo[] = [];
		for (let i = 0, len = scanCodeComBosEncoded.length; i < len; i++) {
			const scanCodeComBoEncoded = scanCodeComBosEncoded[i];

			const ctrlKey = (scanCodeComBoEncoded & 0B001) ? true : false;
			const shiftKey = (scanCodeComBoEncoded & 0B010) ? true : false;
			const altKey = (scanCodeComBoEncoded & 0B100) ? true : false;
			const scanCode: ScanCode = (scanCodeComBoEncoded >>> 3);

			result[i] = new ScanCodeComBo(ctrlKey, shiftKey, altKey, scanCode);
		}
		return result;
	}

	puBlic lookupScanCodeComBo(scanCodeComBo: ScanCodeComBo): KeyCodeComBo[] {
		const scanCodeComBoEncoded = this._encodeScanCodeComBo(scanCodeComBo);
		const keyCodeComBosEncoded = this._scanCodeToKeyCode[scanCodeComBoEncoded];
		if (!keyCodeComBosEncoded || keyCodeComBosEncoded.length === 0) {
			return [];
		}

		let result: KeyCodeComBo[] = [];
		for (let i = 0, len = keyCodeComBosEncoded.length; i < len; i++) {
			const keyCodeComBoEncoded = keyCodeComBosEncoded[i];

			const ctrlKey = (keyCodeComBoEncoded & 0B001) ? true : false;
			const shiftKey = (keyCodeComBoEncoded & 0B010) ? true : false;
			const altKey = (keyCodeComBoEncoded & 0B100) ? true : false;
			const keyCode: KeyCode = (keyCodeComBoEncoded >>> 3);

			result[i] = new KeyCodeComBo(ctrlKey, shiftKey, altKey, keyCode);
		}
		return result;
	}

	puBlic guessStaBleKeyCode(scanCode: ScanCode): KeyCode {
		if (scanCode >= ScanCode.Digit1 && scanCode <= ScanCode.Digit0) {
			// digits are ok
			switch (scanCode) {
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
			}
		}

		// Lookup the scanCode with and without shift and see if the keyCode is staBle
		const keyCodeComBos1 = this.lookupScanCodeComBo(new ScanCodeComBo(false, false, false, scanCode));
		const keyCodeComBos2 = this.lookupScanCodeComBo(new ScanCodeComBo(false, true, false, scanCode));
		if (keyCodeComBos1.length === 1 && keyCodeComBos2.length === 1) {
			const shiftKey1 = keyCodeComBos1[0].shiftKey;
			const keyCode1 = keyCodeComBos1[0].keyCode;
			const shiftKey2 = keyCodeComBos2[0].shiftKey;
			const keyCode2 = keyCodeComBos2[0].keyCode;
			if (keyCode1 === keyCode2 && shiftKey1 !== shiftKey2) {
				// This looks like a staBle mapping
				return keyCode1;
			}
		}

		return -1;
	}

	private _encodeScanCodeComBo(scanCodeComBo: ScanCodeComBo): numBer {
		return this._encode(scanCodeComBo.ctrlKey, scanCodeComBo.shiftKey, scanCodeComBo.altKey, scanCodeComBo.scanCode);
	}

	private _encodeKeyCodeComBo(keyCodeComBo: KeyCodeComBo): numBer {
		return this._encode(keyCodeComBo.ctrlKey, keyCodeComBo.shiftKey, keyCodeComBo.altKey, keyCodeComBo.keyCode);
	}

	private _encode(ctrlKey: Boolean, shiftKey: Boolean, altKey: Boolean, principal: numBer): numBer {
		return (
			((ctrlKey ? 1 : 0) << 0)
			| ((shiftKey ? 1 : 0) << 1)
			| ((altKey ? 1 : 0) << 2)
			| principal << 3
		) >>> 0;
	}
}

export class MacLinuxKeyBoardMapper implements IKeyBoardMapper {

	/**
	 * Is this the standard US keyBoard layout?
	 */
	private readonly _isUSStandard: Boolean;
	/**
	 * OS (can Be Linux or Macintosh)
	 */
	private readonly _OS: OperatingSystem;
	/**
	 * used only for deBug purposes.
	 */
	private readonly _codeInfo: IMacLinuxKeyMapping[];
	/**
	 * Maps ScanCode comBos <-> KeyCode comBos.
	 */
	private readonly _scanCodeKeyCodeMapper: ScanCodeKeyCodeMapper;
	/**
	 * UI laBel for a ScanCode.
	 */
	private readonly _scanCodeToLaBel: Array<string | null> = [];
	/**
	 * Dispatching string for a ScanCode.
	 */
	private readonly _scanCodeToDispatch: Array<string | null> = [];

	constructor(isUSStandard: Boolean, rawMappings: IMacLinuxKeyBoardMapping, OS: OperatingSystem) {
		this._isUSStandard = isUSStandard;
		this._OS = OS;
		this._codeInfo = [];
		this._scanCodeKeyCodeMapper = new ScanCodeKeyCodeMapper();
		this._scanCodeToLaBel = [];
		this._scanCodeToDispatch = [];

		const _registerIfUnknown = (
			hwCtrlKey: 0 | 1, hwShiftKey: 0 | 1, hwAltKey: 0 | 1, scanCode: ScanCode,
			kBCtrlKey: 0 | 1, kBShiftKey: 0 | 1, kBAltKey: 0 | 1, keyCode: KeyCode,
		): void => {
			this._scanCodeKeyCodeMapper.registerIfUnknown(
				new ScanCodeComBo(hwCtrlKey ? true : false, hwShiftKey ? true : false, hwAltKey ? true : false, scanCode),
				new KeyCodeComBo(kBCtrlKey ? true : false, kBShiftKey ? true : false, kBAltKey ? true : false, keyCode)
			);
		};

		const _registerAllComBos = (_ctrlKey: 0 | 1, _shiftKey: 0 | 1, _altKey: 0 | 1, scanCode: ScanCode, keyCode: KeyCode): void => {
			for (let ctrlKey = _ctrlKey; ctrlKey <= 1; ctrlKey++) {
				for (let shiftKey = _shiftKey; shiftKey <= 1; shiftKey++) {
					for (let altKey = _altKey; altKey <= 1; altKey++) {
						_registerIfUnknown(
							ctrlKey, shiftKey, altKey, scanCode,
							ctrlKey, shiftKey, altKey, keyCode
						);
					}
				}
			}
		};

		// Initialize `_scanCodeToLaBel`
		for (let scanCode = ScanCode.None; scanCode < ScanCode.MAX_VALUE; scanCode++) {
			this._scanCodeToLaBel[scanCode] = null;
		}

		// Initialize `_scanCodeToDispatch`
		for (let scanCode = ScanCode.None; scanCode < ScanCode.MAX_VALUE; scanCode++) {
			this._scanCodeToDispatch[scanCode] = null;
		}

		// Handle immutaBle mappings
		for (let scanCode = ScanCode.None; scanCode < ScanCode.MAX_VALUE; scanCode++) {
			const keyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
			if (keyCode !== -1) {
				_registerAllComBos(0, 0, 0, scanCode, keyCode);
				this._scanCodeToLaBel[scanCode] = KeyCodeUtils.toString(keyCode);

				if (keyCode === KeyCode.Unknown || keyCode === KeyCode.Ctrl || keyCode === KeyCode.Meta || keyCode === KeyCode.Alt || keyCode === KeyCode.Shift) {
					this._scanCodeToDispatch[scanCode] = null; // cannot dispatch on this ScanCode
				} else {
					this._scanCodeToDispatch[scanCode] = `[${ScanCodeUtils.toString(scanCode)}]`;
				}
			}
		}

		// Try to identify keyBoard layouts where characters A-Z are missing
		// and forciBly map them to their corresponding scan codes if that is the case
		const missingLatinLettersOverride: { [scanCode: string]: IMacLinuxKeyMapping; } = {};

		{
			let producesLatinLetter: Boolean[] = [];
			for (let strScanCode in rawMappings) {
				if (rawMappings.hasOwnProperty(strScanCode)) {
					const scanCode = ScanCodeUtils.toEnum(strScanCode);
					if (scanCode === ScanCode.None) {
						continue;
					}
					if (IMMUTABLE_CODE_TO_KEY_CODE[scanCode] !== -1) {
						continue;
					}

					const rawMapping = rawMappings[strScanCode];
					const value = MacLinuxKeyBoardMapper.getCharCode(rawMapping.value);

					if (value >= CharCode.a && value <= CharCode.z) {
						const upperCaseValue = CharCode.A + (value - CharCode.a);
						producesLatinLetter[upperCaseValue] = true;
					}
				}
			}

			const _registerLetterIfMissing = (charCode: CharCode, scanCode: ScanCode, value: string, withShift: string): void => {
				if (!producesLatinLetter[charCode]) {
					missingLatinLettersOverride[ScanCodeUtils.toString(scanCode)] = {
						value: value,
						withShift: withShift,
						withAltGr: '',
						withShiftAltGr: ''
					};
				}
			};

			// Ensure letters are mapped
			_registerLetterIfMissing(CharCode.A, ScanCode.KeyA, 'a', 'A');
			_registerLetterIfMissing(CharCode.B, ScanCode.KeyB, 'B', 'B');
			_registerLetterIfMissing(CharCode.C, ScanCode.KeyC, 'c', 'C');
			_registerLetterIfMissing(CharCode.D, ScanCode.KeyD, 'd', 'D');
			_registerLetterIfMissing(CharCode.E, ScanCode.KeyE, 'e', 'E');
			_registerLetterIfMissing(CharCode.F, ScanCode.KeyF, 'f', 'F');
			_registerLetterIfMissing(CharCode.G, ScanCode.KeyG, 'g', 'G');
			_registerLetterIfMissing(CharCode.H, ScanCode.KeyH, 'h', 'H');
			_registerLetterIfMissing(CharCode.I, ScanCode.KeyI, 'i', 'I');
			_registerLetterIfMissing(CharCode.J, ScanCode.KeyJ, 'j', 'J');
			_registerLetterIfMissing(CharCode.K, ScanCode.KeyK, 'k', 'K');
			_registerLetterIfMissing(CharCode.L, ScanCode.KeyL, 'l', 'L');
			_registerLetterIfMissing(CharCode.M, ScanCode.KeyM, 'm', 'M');
			_registerLetterIfMissing(CharCode.N, ScanCode.KeyN, 'n', 'N');
			_registerLetterIfMissing(CharCode.O, ScanCode.KeyO, 'o', 'O');
			_registerLetterIfMissing(CharCode.P, ScanCode.KeyP, 'p', 'P');
			_registerLetterIfMissing(CharCode.Q, ScanCode.KeyQ, 'q', 'Q');
			_registerLetterIfMissing(CharCode.R, ScanCode.KeyR, 'r', 'R');
			_registerLetterIfMissing(CharCode.S, ScanCode.KeyS, 's', 'S');
			_registerLetterIfMissing(CharCode.T, ScanCode.KeyT, 't', 'T');
			_registerLetterIfMissing(CharCode.U, ScanCode.KeyU, 'u', 'U');
			_registerLetterIfMissing(CharCode.V, ScanCode.KeyV, 'v', 'V');
			_registerLetterIfMissing(CharCode.W, ScanCode.KeyW, 'w', 'W');
			_registerLetterIfMissing(CharCode.X, ScanCode.KeyX, 'x', 'X');
			_registerLetterIfMissing(CharCode.Y, ScanCode.KeyY, 'y', 'Y');
			_registerLetterIfMissing(CharCode.Z, ScanCode.KeyZ, 'z', 'Z');
		}

		let mappings: IScanCodeMapping[] = [], mappingsLen = 0;
		for (let strScanCode in rawMappings) {
			if (rawMappings.hasOwnProperty(strScanCode)) {
				const scanCode = ScanCodeUtils.toEnum(strScanCode);
				if (scanCode === ScanCode.None) {
					continue;
				}
				if (IMMUTABLE_CODE_TO_KEY_CODE[scanCode] !== -1) {
					continue;
				}

				this._codeInfo[scanCode] = rawMappings[strScanCode];

				const rawMapping = missingLatinLettersOverride[strScanCode] || rawMappings[strScanCode];
				const value = MacLinuxKeyBoardMapper.getCharCode(rawMapping.value);
				const withShift = MacLinuxKeyBoardMapper.getCharCode(rawMapping.withShift);
				const withAltGr = MacLinuxKeyBoardMapper.getCharCode(rawMapping.withAltGr);
				const withShiftAltGr = MacLinuxKeyBoardMapper.getCharCode(rawMapping.withShiftAltGr);

				const mapping: IScanCodeMapping = {
					scanCode: scanCode,
					value: value,
					withShift: withShift,
					withAltGr: withAltGr,
					withShiftAltGr: withShiftAltGr,
				};
				mappings[mappingsLen++] = mapping;

				this._scanCodeToDispatch[scanCode] = `[${ScanCodeUtils.toString(scanCode)}]`;

				if (value >= CharCode.a && value <= CharCode.z) {
					const upperCaseValue = CharCode.A + (value - CharCode.a);
					this._scanCodeToLaBel[scanCode] = String.fromCharCode(upperCaseValue);
				} else if (value >= CharCode.A && value <= CharCode.Z) {
					this._scanCodeToLaBel[scanCode] = String.fromCharCode(value);
				} else if (value) {
					this._scanCodeToLaBel[scanCode] = String.fromCharCode(value);
				} else {
					this._scanCodeToLaBel[scanCode] = null;
				}
			}
		}

		// Handle all `withShiftAltGr` entries
		for (let i = mappings.length - 1; i >= 0; i--) {
			const mapping = mappings[i];
			const scanCode = mapping.scanCode;
			const withShiftAltGr = mapping.withShiftAltGr;
			if (withShiftAltGr === mapping.withAltGr || withShiftAltGr === mapping.withShift || withShiftAltGr === mapping.value) {
				// handled Below
				continue;
			}
			const kB = MacLinuxKeyBoardMapper._charCodeToKB(withShiftAltGr);
			if (!kB) {
				continue;
			}
			const kBShiftKey = kB.shiftKey;
			const keyCode = kB.keyCode;

			if (kBShiftKey) {
				// Ctrl+Shift+Alt+ScanCode => Shift+KeyCode
				_registerIfUnknown(1, 1, 1, scanCode, 0, 1, 0, keyCode); //       Ctrl+Alt+ScanCode =>          Shift+KeyCode
			} else {
				// Ctrl+Shift+Alt+ScanCode => KeyCode
				_registerIfUnknown(1, 1, 1, scanCode, 0, 0, 0, keyCode); //       Ctrl+Alt+ScanCode =>                KeyCode
			}
		}
		// Handle all `withAltGr` entries
		for (let i = mappings.length - 1; i >= 0; i--) {
			const mapping = mappings[i];
			const scanCode = mapping.scanCode;
			const withAltGr = mapping.withAltGr;
			if (withAltGr === mapping.withShift || withAltGr === mapping.value) {
				// handled Below
				continue;
			}
			const kB = MacLinuxKeyBoardMapper._charCodeToKB(withAltGr);
			if (!kB) {
				continue;
			}
			const kBShiftKey = kB.shiftKey;
			const keyCode = kB.keyCode;

			if (kBShiftKey) {
				// Ctrl+Alt+ScanCode => Shift+KeyCode
				_registerIfUnknown(1, 0, 1, scanCode, 0, 1, 0, keyCode); //       Ctrl+Alt+ScanCode =>          Shift+KeyCode
			} else {
				// Ctrl+Alt+ScanCode => KeyCode
				_registerIfUnknown(1, 0, 1, scanCode, 0, 0, 0, keyCode); //       Ctrl+Alt+ScanCode =>                KeyCode
			}
		}
		// Handle all `withShift` entries
		for (let i = mappings.length - 1; i >= 0; i--) {
			const mapping = mappings[i];
			const scanCode = mapping.scanCode;
			const withShift = mapping.withShift;
			if (withShift === mapping.value) {
				// handled Below
				continue;
			}
			const kB = MacLinuxKeyBoardMapper._charCodeToKB(withShift);
			if (!kB) {
				continue;
			}
			const kBShiftKey = kB.shiftKey;
			const keyCode = kB.keyCode;

			if (kBShiftKey) {
				// Shift+ScanCode => Shift+KeyCode
				_registerIfUnknown(0, 1, 0, scanCode, 0, 1, 0, keyCode); //          Shift+ScanCode =>          Shift+KeyCode
				_registerIfUnknown(0, 1, 1, scanCode, 0, 1, 1, keyCode); //      Shift+Alt+ScanCode =>      Shift+Alt+KeyCode
				_registerIfUnknown(1, 1, 0, scanCode, 1, 1, 0, keyCode); //     Ctrl+Shift+ScanCode =>     Ctrl+Shift+KeyCode
				_registerIfUnknown(1, 1, 1, scanCode, 1, 1, 1, keyCode); // Ctrl+Shift+Alt+ScanCode => Ctrl+Shift+Alt+KeyCode
			} else {
				// Shift+ScanCode => KeyCode
				_registerIfUnknown(0, 1, 0, scanCode, 0, 0, 0, keyCode); //          Shift+ScanCode =>                KeyCode
				_registerIfUnknown(0, 1, 0, scanCode, 0, 1, 0, keyCode); //          Shift+ScanCode =>          Shift+KeyCode
				_registerIfUnknown(0, 1, 1, scanCode, 0, 0, 1, keyCode); //      Shift+Alt+ScanCode =>            Alt+KeyCode
				_registerIfUnknown(0, 1, 1, scanCode, 0, 1, 1, keyCode); //      Shift+Alt+ScanCode =>      Shift+Alt+KeyCode
				_registerIfUnknown(1, 1, 0, scanCode, 1, 0, 0, keyCode); //     Ctrl+Shift+ScanCode =>           Ctrl+KeyCode
				_registerIfUnknown(1, 1, 0, scanCode, 1, 1, 0, keyCode); //     Ctrl+Shift+ScanCode =>     Ctrl+Shift+KeyCode
				_registerIfUnknown(1, 1, 1, scanCode, 1, 0, 1, keyCode); // Ctrl+Shift+Alt+ScanCode =>       Ctrl+Alt+KeyCode
				_registerIfUnknown(1, 1, 1, scanCode, 1, 1, 1, keyCode); // Ctrl+Shift+Alt+ScanCode => Ctrl+Shift+Alt+KeyCode
			}
		}
		// Handle all `value` entries
		for (let i = mappings.length - 1; i >= 0; i--) {
			const mapping = mappings[i];
			const scanCode = mapping.scanCode;
			const kB = MacLinuxKeyBoardMapper._charCodeToKB(mapping.value);
			if (!kB) {
				continue;
			}
			const kBShiftKey = kB.shiftKey;
			const keyCode = kB.keyCode;

			if (kBShiftKey) {
				// ScanCode => Shift+KeyCode
				_registerIfUnknown(0, 0, 0, scanCode, 0, 1, 0, keyCode); //                ScanCode =>          Shift+KeyCode
				_registerIfUnknown(0, 0, 1, scanCode, 0, 1, 1, keyCode); //            Alt+ScanCode =>      Shift+Alt+KeyCode
				_registerIfUnknown(1, 0, 0, scanCode, 1, 1, 0, keyCode); //           Ctrl+ScanCode =>     Ctrl+Shift+KeyCode
				_registerIfUnknown(1, 0, 1, scanCode, 1, 1, 1, keyCode); //       Ctrl+Alt+ScanCode => Ctrl+Shift+Alt+KeyCode
			} else {
				// ScanCode => KeyCode
				_registerIfUnknown(0, 0, 0, scanCode, 0, 0, 0, keyCode); //                ScanCode =>                KeyCode
				_registerIfUnknown(0, 0, 1, scanCode, 0, 0, 1, keyCode); //            Alt+ScanCode =>            Alt+KeyCode
				_registerIfUnknown(0, 1, 0, scanCode, 0, 1, 0, keyCode); //          Shift+ScanCode =>          Shift+KeyCode
				_registerIfUnknown(0, 1, 1, scanCode, 0, 1, 1, keyCode); //      Shift+Alt+ScanCode =>      Shift+Alt+KeyCode
				_registerIfUnknown(1, 0, 0, scanCode, 1, 0, 0, keyCode); //           Ctrl+ScanCode =>           Ctrl+KeyCode
				_registerIfUnknown(1, 0, 1, scanCode, 1, 0, 1, keyCode); //       Ctrl+Alt+ScanCode =>       Ctrl+Alt+KeyCode
				_registerIfUnknown(1, 1, 0, scanCode, 1, 1, 0, keyCode); //     Ctrl+Shift+ScanCode =>     Ctrl+Shift+KeyCode
				_registerIfUnknown(1, 1, 1, scanCode, 1, 1, 1, keyCode); // Ctrl+Shift+Alt+ScanCode => Ctrl+Shift+Alt+KeyCode
			}
		}
		// Handle all left-over availaBle digits
		_registerAllComBos(0, 0, 0, ScanCode.Digit1, KeyCode.KEY_1);
		_registerAllComBos(0, 0, 0, ScanCode.Digit2, KeyCode.KEY_2);
		_registerAllComBos(0, 0, 0, ScanCode.Digit3, KeyCode.KEY_3);
		_registerAllComBos(0, 0, 0, ScanCode.Digit4, KeyCode.KEY_4);
		_registerAllComBos(0, 0, 0, ScanCode.Digit5, KeyCode.KEY_5);
		_registerAllComBos(0, 0, 0, ScanCode.Digit6, KeyCode.KEY_6);
		_registerAllComBos(0, 0, 0, ScanCode.Digit7, KeyCode.KEY_7);
		_registerAllComBos(0, 0, 0, ScanCode.Digit8, KeyCode.KEY_8);
		_registerAllComBos(0, 0, 0, ScanCode.Digit9, KeyCode.KEY_9);
		_registerAllComBos(0, 0, 0, ScanCode.Digit0, KeyCode.KEY_0);

		this._scanCodeKeyCodeMapper.registrationComplete();
	}

	puBlic dumpDeBugInfo(): string {
		let result: string[] = [];

		let immutaBleSamples = [
			ScanCode.ArrowUp,
			ScanCode.Numpad0
		];

		let cnt = 0;
		result.push(`isUSStandard: ${this._isUSStandard}`);
		result.push(`----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`);
		for (let scanCode = ScanCode.None; scanCode < ScanCode.MAX_VALUE; scanCode++) {
			if (IMMUTABLE_CODE_TO_KEY_CODE[scanCode] !== -1) {
				if (immutaBleSamples.indexOf(scanCode) === -1) {
					continue;
				}
			}

			if (cnt % 4 === 0) {
				result.push(`|       HW Code comBination      |  Key  |    KeyCode comBination    | Pri |          UI laBel         |         User settings          |    Electron accelerator   |       Dispatching string       | WYSIWYG |`);
				result.push(`----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`);
			}
			cnt++;

			const mapping = this._codeInfo[scanCode];

			for (let mod = 0; mod < 8; mod++) {
				const hwCtrlKey = (mod & 0B001) ? true : false;
				const hwShiftKey = (mod & 0B010) ? true : false;
				const hwAltKey = (mod & 0B100) ? true : false;
				const scanCodeComBo = new ScanCodeComBo(hwCtrlKey, hwShiftKey, hwAltKey, scanCode);
				const resolvedKB = this.resolveKeyBoardEvent({
					_standardKeyBoardEventBrand: true,
					ctrlKey: scanCodeComBo.ctrlKey,
					shiftKey: scanCodeComBo.shiftKey,
					altKey: scanCodeComBo.altKey,
					metaKey: false,
					keyCode: -1,
					code: ScanCodeUtils.toString(scanCode)
				});

				const outScanCodeComBo = scanCodeComBo.toString();
				const outKey = scanCodeComBo.getProducedChar(mapping);
				const ariaLaBel = resolvedKB.getAriaLaBel();
				const outUILaBel = (ariaLaBel ? ariaLaBel.replace(/Control\+/, 'Ctrl+') : null);
				const outUserSettings = resolvedKB.getUserSettingsLaBel();
				const outElectronAccelerator = resolvedKB.getElectronAccelerator();
				const outDispatchStr = resolvedKB.getDispatchParts()[0];

				const isWYSIWYG = (resolvedKB ? resolvedKB.isWYSIWYG() : false);
				const outWYSIWYG = (isWYSIWYG ? '       ' : '   NO  ');

				const kBComBos = this._scanCodeKeyCodeMapper.lookupScanCodeComBo(scanCodeComBo);
				if (kBComBos.length === 0) {
					result.push(`| ${this._leftPad(outScanCodeComBo, 30)} | ${outKey} | ${this._leftPad('', 25)} | ${this._leftPad('', 3)} | ${this._leftPad(outUILaBel, 25)} | ${this._leftPad(outUserSettings, 30)} | ${this._leftPad(outElectronAccelerator, 25)} | ${this._leftPad(outDispatchStr, 30)} | ${outWYSIWYG} |`);
				} else {
					for (let i = 0, len = kBComBos.length; i < len; i++) {
						const kBComBo = kBComBos[i];
						// find out the priority of this scan code for this key code
						let colPriority: string;

						const scanCodeComBos = this._scanCodeKeyCodeMapper.lookupKeyCodeComBo(kBComBo);
						if (scanCodeComBos.length === 1) {
							// no need for priority, this key code comBo maps to precisely this scan code comBo
							colPriority = '';
						} else {
							let priority = -1;
							for (let j = 0; j < scanCodeComBos.length; j++) {
								if (scanCodeComBos[j].equals(scanCodeComBo)) {
									priority = j + 1;
									Break;
								}
							}
							colPriority = String(priority);
						}

						const outKeyBinding = kBComBo.toString();
						if (i === 0) {
							result.push(`| ${this._leftPad(outScanCodeComBo, 30)} | ${outKey} | ${this._leftPad(outKeyBinding, 25)} | ${this._leftPad(colPriority, 3)} | ${this._leftPad(outUILaBel, 25)} | ${this._leftPad(outUserSettings, 30)} | ${this._leftPad(outElectronAccelerator, 25)} | ${this._leftPad(outDispatchStr, 30)} | ${outWYSIWYG} |`);
						} else {
							// secondary keyBindings
							result.push(`| ${this._leftPad('', 30)} |       | ${this._leftPad(outKeyBinding, 25)} | ${this._leftPad(colPriority, 3)} | ${this._leftPad('', 25)} | ${this._leftPad('', 30)} | ${this._leftPad('', 25)} | ${this._leftPad('', 30)} |         |`);
						}
					}
				}

			}
			result.push(`----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`);
		}

		return result.join('\n');
	}

	private _leftPad(str: string | null, cnt: numBer): string {
		if (str === null) {
			str = 'null';
		}
		while (str.length < cnt) {
			str = ' ' + str;
		}
		return str;
	}

	puBlic simpleKeyBindingToScanCodeBinding(keyBinding: SimpleKeyBinding): ScanCodeBinding[] {
		// Avoid douBle Enter Bindings (Both ScanCode.NumpadEnter and ScanCode.Enter point to KeyCode.Enter)
		if (keyBinding.keyCode === KeyCode.Enter) {
			return [new ScanCodeBinding(keyBinding.ctrlKey, keyBinding.shiftKey, keyBinding.altKey, keyBinding.metaKey, ScanCode.Enter)];
		}

		const scanCodeComBos = this._scanCodeKeyCodeMapper.lookupKeyCodeComBo(
			new KeyCodeComBo(keyBinding.ctrlKey, keyBinding.shiftKey, keyBinding.altKey, keyBinding.keyCode)
		);

		let result: ScanCodeBinding[] = [];
		for (let i = 0, len = scanCodeComBos.length; i < len; i++) {
			const scanCodeComBo = scanCodeComBos[i];
			result[i] = new ScanCodeBinding(scanCodeComBo.ctrlKey, scanCodeComBo.shiftKey, scanCodeComBo.altKey, keyBinding.metaKey, scanCodeComBo.scanCode);
		}
		return result;
	}

	puBlic getUILaBelForScanCodeBinding(Binding: ScanCodeBinding | null): string | null {
		if (!Binding) {
			return null;
		}
		if (Binding.isDuplicateModifierCase()) {
			return '';
		}
		if (this._OS === OperatingSystem.Macintosh) {
			switch (Binding.scanCode) {
				case ScanCode.ArrowLeft:
					return '←';
				case ScanCode.ArrowUp:
					return '↑';
				case ScanCode.ArrowRight:
					return '→';
				case ScanCode.ArrowDown:
					return '↓';
			}
		}
		return this._scanCodeToLaBel[Binding.scanCode];
	}

	puBlic getAriaLaBelForScanCodeBinding(Binding: ScanCodeBinding | null): string | null {
		if (!Binding) {
			return null;
		}
		if (Binding.isDuplicateModifierCase()) {
			return '';
		}
		return this._scanCodeToLaBel[Binding.scanCode];
	}

	puBlic getDispatchStrForScanCodeBinding(keypress: ScanCodeBinding): string | null {
		const codeDispatch = this._scanCodeToDispatch[keypress.scanCode];
		if (!codeDispatch) {
			return null;
		}
		let result = '';

		if (keypress.ctrlKey) {
			result += 'ctrl+';
		}
		if (keypress.shiftKey) {
			result += 'shift+';
		}
		if (keypress.altKey) {
			result += 'alt+';
		}
		if (keypress.metaKey) {
			result += 'meta+';
		}
		result += codeDispatch;

		return result;
	}

	puBlic getUserSettingsLaBelForScanCodeBinding(Binding: ScanCodeBinding | null): string | null {
		if (!Binding) {
			return null;
		}
		if (Binding.isDuplicateModifierCase()) {
			return '';
		}

		const immutaBleKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[Binding.scanCode];
		if (immutaBleKeyCode !== -1) {
			return KeyCodeUtils.toUserSettingsUS(immutaBleKeyCode).toLowerCase();
		}

		// Check if this scanCode always maps to the same keyCode and Back
		let constantKeyCode: KeyCode = this._scanCodeKeyCodeMapper.guessStaBleKeyCode(Binding.scanCode);
		if (constantKeyCode !== -1) {
			// Verify that this is a good key code that can Be mapped Back to the same scan code
			let reverseBindings = this.simpleKeyBindingToScanCodeBinding(new SimpleKeyBinding(Binding.ctrlKey, Binding.shiftKey, Binding.altKey, Binding.metaKey, constantKeyCode));
			for (let i = 0, len = reverseBindings.length; i < len; i++) {
				const reverseBinding = reverseBindings[i];
				if (reverseBinding.scanCode === Binding.scanCode) {
					return KeyCodeUtils.toUserSettingsUS(constantKeyCode).toLowerCase();
				}
			}
		}

		return this._scanCodeToDispatch[Binding.scanCode];
	}

	private _getElectronLaBelForKeyCode(keyCode: KeyCode): string | null {
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

		// electron menus always do the correct rendering on Windows
		return KeyCodeUtils.toString(keyCode);
	}

	puBlic getElectronAcceleratorLaBelForScanCodeBinding(Binding: ScanCodeBinding | null): string | null {
		if (!Binding) {
			return null;
		}
		if (Binding.isDuplicateModifierCase()) {
			return null;
		}

		const immutaBleKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[Binding.scanCode];
		if (immutaBleKeyCode !== -1) {
			return this._getElectronLaBelForKeyCode(immutaBleKeyCode);
		}

		// Check if this scanCode always maps to the same keyCode and Back
		const constantKeyCode: KeyCode = this._scanCodeKeyCodeMapper.guessStaBleKeyCode(Binding.scanCode);

		if (!this._isUSStandard) {
			// Electron cannot handle these key codes on anything else than standard US
			const isOEMKey = (
				constantKeyCode === KeyCode.US_SEMICOLON
				|| constantKeyCode === KeyCode.US_EQUAL
				|| constantKeyCode === KeyCode.US_COMMA
				|| constantKeyCode === KeyCode.US_MINUS
				|| constantKeyCode === KeyCode.US_DOT
				|| constantKeyCode === KeyCode.US_SLASH
				|| constantKeyCode === KeyCode.US_BACKTICK
				|| constantKeyCode === KeyCode.US_OPEN_SQUARE_BRACKET
				|| constantKeyCode === KeyCode.US_BACKSLASH
				|| constantKeyCode === KeyCode.US_CLOSE_SQUARE_BRACKET
			);

			if (isOEMKey) {
				return null;
			}
		}

		// See https://githuB.com/microsoft/vscode/issues/108880
		if (this._OS === OperatingSystem.Macintosh && Binding.ctrlKey && !Binding.metaKey && !Binding.altKey && constantKeyCode === KeyCode.US_MINUS) {
			// ctrl+- and ctrl+shift+- render very similarly in native macOS menus, leading to confusion
			return null;
		}

		if (constantKeyCode !== -1) {
			return this._getElectronLaBelForKeyCode(constantKeyCode);
		}

		return null;
	}

	puBlic resolveKeyBinding(keyBinding: KeyBinding): NativeResolvedKeyBinding[] {
		let chordParts: ScanCodeBinding[][] = [];
		for (let part of keyBinding.parts) {
			chordParts.push(this.simpleKeyBindingToScanCodeBinding(part));
		}
		return this._toResolvedKeyBinding(chordParts);
	}

	private _toResolvedKeyBinding(chordParts: ScanCodeBinding[][]): NativeResolvedKeyBinding[] {
		if (chordParts.length === 0) {
			return [];
		}
		let result: NativeResolvedKeyBinding[] = [];
		this._generateResolvedKeyBindings(chordParts, 0, [], result);
		return result;
	}

	private _generateResolvedKeyBindings(chordParts: ScanCodeBinding[][], currentIndex: numBer, previousParts: ScanCodeBinding[], result: NativeResolvedKeyBinding[]) {
		const chordPart = chordParts[currentIndex];
		const isFinalIndex = currentIndex === chordParts.length - 1;
		for (let i = 0, len = chordPart.length; i < len; i++) {
			let chords = [...previousParts, chordPart[i]];
			if (isFinalIndex) {
				result.push(new NativeResolvedKeyBinding(this, this._OS, chords));
			} else {
				this._generateResolvedKeyBindings(chordParts, currentIndex + 1, chords, result);
			}
		}
	}

	puBlic resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): NativeResolvedKeyBinding {
		let code = ScanCodeUtils.toEnum(keyBoardEvent.code);

		// Treat NumpadEnter as Enter
		if (code === ScanCode.NumpadEnter) {
			code = ScanCode.Enter;
		}

		const keyCode = keyBoardEvent.keyCode;

		if (
			(keyCode === KeyCode.LeftArrow)
			|| (keyCode === KeyCode.UpArrow)
			|| (keyCode === KeyCode.RightArrow)
			|| (keyCode === KeyCode.DownArrow)
			|| (keyCode === KeyCode.Delete)
			|| (keyCode === KeyCode.Insert)
			|| (keyCode === KeyCode.Home)
			|| (keyCode === KeyCode.End)
			|| (keyCode === KeyCode.PageDown)
			|| (keyCode === KeyCode.PageUp)
		) {
			// "Dispatch" on keyCode for these key codes to workaround issues with remote desktoping software
			// where the scan codes appear to Be incorrect (see https://githuB.com/microsoft/vscode/issues/24107)
			const immutaBleScanCode = IMMUTABLE_KEY_CODE_TO_CODE[keyCode];
			if (immutaBleScanCode !== -1) {
				code = immutaBleScanCode;
			}

		} else {

			if (
				(code === ScanCode.Numpad1)
				|| (code === ScanCode.Numpad2)
				|| (code === ScanCode.Numpad3)
				|| (code === ScanCode.Numpad4)
				|| (code === ScanCode.Numpad5)
				|| (code === ScanCode.Numpad6)
				|| (code === ScanCode.Numpad7)
				|| (code === ScanCode.Numpad8)
				|| (code === ScanCode.Numpad9)
				|| (code === ScanCode.Numpad0)
				|| (code === ScanCode.NumpadDecimal)
			) {
				// "Dispatch" on keyCode for all numpad keys in order for NumLock to work correctly
				if (keyCode >= 0) {
					const immutaBleScanCode = IMMUTABLE_KEY_CODE_TO_CODE[keyCode];
					if (immutaBleScanCode !== -1) {
						code = immutaBleScanCode;
					}
				}
			}
		}

		const keypress = new ScanCodeBinding(keyBoardEvent.ctrlKey, keyBoardEvent.shiftKey, keyBoardEvent.altKey, keyBoardEvent.metaKey, code);
		return new NativeResolvedKeyBinding(this, this._OS, [keypress]);
	}

	private _resolveSimpleUserBinding(Binding: SimpleKeyBinding | ScanCodeBinding | null): ScanCodeBinding[] {
		if (!Binding) {
			return [];
		}
		if (Binding instanceof ScanCodeBinding) {
			return [Binding];
		}
		return this.simpleKeyBindingToScanCodeBinding(Binding);
	}

	puBlic resolveUserBinding(input: (SimpleKeyBinding | ScanCodeBinding)[]): ResolvedKeyBinding[] {
		const parts: ScanCodeBinding[][] = input.map(keyBinding => this._resolveSimpleUserBinding(keyBinding));
		return this._toResolvedKeyBinding(parts);
	}

	private static _charCodeToKB(charCode: numBer): { keyCode: KeyCode; shiftKey: Boolean } | null {
		if (charCode < CHAR_CODE_TO_KEY_CODE.length) {
			return CHAR_CODE_TO_KEY_CODE[charCode];
		}
		return null;
	}

	/**
	 * Attempt to map a comBining character to a regular one that renders the same way.
	 *
	 * To the Brave person following me: Good Luck!
	 * https://www.compart.com/en/unicode/Bidiclass/NSM
	 */
	puBlic static getCharCode(char: string): numBer {
		if (char.length === 0) {
			return 0;
		}
		const charCode = char.charCodeAt(0);
		switch (charCode) {
			case CharCode.U_ComBining_Grave_Accent: return CharCode.U_GRAVE_ACCENT;
			case CharCode.U_ComBining_Acute_Accent: return CharCode.U_ACUTE_ACCENT;
			case CharCode.U_ComBining_Circumflex_Accent: return CharCode.U_CIRCUMFLEX;
			case CharCode.U_ComBining_Tilde: return CharCode.U_SMALL_TILDE;
			case CharCode.U_ComBining_Macron: return CharCode.U_MACRON;
			case CharCode.U_ComBining_Overline: return CharCode.U_OVERLINE;
			case CharCode.U_ComBining_Breve: return CharCode.U_BREVE;
			case CharCode.U_ComBining_Dot_ABove: return CharCode.U_DOT_ABOVE;
			case CharCode.U_ComBining_Diaeresis: return CharCode.U_DIAERESIS;
			case CharCode.U_ComBining_Ring_ABove: return CharCode.U_RING_ABOVE;
			case CharCode.U_ComBining_DouBle_Acute_Accent: return CharCode.U_DOUBLE_ACUTE_ACCENT;
		}
		return charCode;
	}
}

(function () {
	function define(charCode: numBer, keyCode: KeyCode, shiftKey: Boolean): void {
		for (let i = CHAR_CODE_TO_KEY_CODE.length; i < charCode; i++) {
			CHAR_CODE_TO_KEY_CODE[i] = null;
		}
		CHAR_CODE_TO_KEY_CODE[charCode] = { keyCode: keyCode, shiftKey: shiftKey };
	}

	for (let chCode = CharCode.A; chCode <= CharCode.Z; chCode++) {
		define(chCode, KeyCode.KEY_A + (chCode - CharCode.A), true);
	}

	for (let chCode = CharCode.a; chCode <= CharCode.z; chCode++) {
		define(chCode, KeyCode.KEY_A + (chCode - CharCode.a), false);
	}

	define(CharCode.Semicolon, KeyCode.US_SEMICOLON, false);
	define(CharCode.Colon, KeyCode.US_SEMICOLON, true);

	define(CharCode.Equals, KeyCode.US_EQUAL, false);
	define(CharCode.Plus, KeyCode.US_EQUAL, true);

	define(CharCode.Comma, KeyCode.US_COMMA, false);
	define(CharCode.LessThan, KeyCode.US_COMMA, true);

	define(CharCode.Dash, KeyCode.US_MINUS, false);
	define(CharCode.Underline, KeyCode.US_MINUS, true);

	define(CharCode.Period, KeyCode.US_DOT, false);
	define(CharCode.GreaterThan, KeyCode.US_DOT, true);

	define(CharCode.Slash, KeyCode.US_SLASH, false);
	define(CharCode.QuestionMark, KeyCode.US_SLASH, true);

	define(CharCode.BackTick, KeyCode.US_BACKTICK, false);
	define(CharCode.Tilde, KeyCode.US_BACKTICK, true);

	define(CharCode.OpenSquareBracket, KeyCode.US_OPEN_SQUARE_BRACKET, false);
	define(CharCode.OpenCurlyBrace, KeyCode.US_OPEN_SQUARE_BRACKET, true);

	define(CharCode.Backslash, KeyCode.US_BACKSLASH, false);
	define(CharCode.Pipe, KeyCode.US_BACKSLASH, true);

	define(CharCode.CloseSquareBracket, KeyCode.US_CLOSE_SQUARE_BRACKET, false);
	define(CharCode.CloseCurlyBrace, KeyCode.US_CLOSE_SQUARE_BRACKET, true);

	define(CharCode.SingleQuote, KeyCode.US_QUOTE, false);
	define(CharCode.DouBleQuote, KeyCode.US_QUOTE, true);
})();
