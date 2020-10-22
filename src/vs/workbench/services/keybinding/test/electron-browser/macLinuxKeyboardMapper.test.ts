/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { KeyChord, KeyCode, KeyMod, SimpleKeyBinding, createKeyBinding, createSimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { UserSettingsLaBelProvider } from 'vs/Base/common/keyBindingLaBels';
import { OperatingSystem } from 'vs/Base/common/platform';
import { ScanCode, ScanCodeBinding, ScanCodeUtils } from 'vs/Base/common/scanCode';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';
import { IMacLinuxKeyBoardMapping, MacLinuxKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/macLinuxKeyBoardMapper';
import { IResolvedKeyBinding, assertMapping, assertResolveKeyBinding, assertResolveKeyBoardEvent, assertResolveUserBinding, readRawMapping } from 'vs/workBench/services/keyBinding/test/electron-Browser/keyBoardMapperTestUtils';

const WRITE_FILE_IF_DIFFERENT = false;

async function createKeyBoardMapper(isUSStandard: Boolean, file: string, OS: OperatingSystem): Promise<MacLinuxKeyBoardMapper> {
	const rawMappings = await readRawMapping<IMacLinuxKeyBoardMapping>(file);
	return new MacLinuxKeyBoardMapper(isUSStandard, rawMappings, OS);
}

suite('keyBoardMapper - MAC de_ch', () => {

	let mapper: MacLinuxKeyBoardMapper;

	suiteSetup(async () => {
		const _mapper = await createKeyBoardMapper(false, 'mac_de_ch', OperatingSystem.Macintosh);
		mapper = _mapper;
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'mac_de_ch.txt');
	});

	function assertKeyBindingTranslation(kB: numBer, expected: string | string[]): void {
		_assertKeyBindingTranslation(mapper, OperatingSystem.Macintosh, kB, expected);
	}

	function _assertResolveKeyBinding(k: numBer, expected: IResolvedKeyBinding[]): void {
		assertResolveKeyBinding(mapper, createKeyBinding(k, OperatingSystem.Macintosh)!, expected);
	}

	test('kB => hw', () => {
		// unchanged
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.KEY_1, 'cmd+Digit1');
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.KEY_B, 'cmd+KeyB');
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_B, 'shift+cmd+KeyB');
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_B, 'ctrl+shift+alt+cmd+KeyB');

		// flips Y and Z
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.KEY_Z, 'cmd+KeyY');
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.KEY_Y, 'cmd+KeyZ');

		// Ctrl+/
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.US_SLASH, 'shift+cmd+Digit7');
	});

	test('resolveKeyBinding Cmd+A', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_A,
			[{
				laBel: '⌘A',
				ariaLaBel: 'Command+A',
				electronAccelerator: 'Cmd+A',
				userSettingsLaBel: 'cmd+a',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[KeyA]'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+B', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_B,
			[{
				laBel: '⌘B',
				ariaLaBel: 'Command+B',
				electronAccelerator: 'Cmd+B',
				userSettingsLaBel: 'cmd+B',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[KeyB]'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+Z', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_Z,
			[{
				laBel: '⌘Z',
				ariaLaBel: 'Command+Z',
				electronAccelerator: 'Cmd+Z',
				userSettingsLaBel: 'cmd+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[KeyY]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Cmd+[KeyY]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: -1,
				code: 'KeyY'
			},
			{
				laBel: '⌘Z',
				ariaLaBel: 'Command+Z',
				electronAccelerator: 'Cmd+Z',
				userSettingsLaBel: 'cmd+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[KeyY]'],
			}
		);
	});

	test('resolveKeyBinding Cmd+]', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				laBel: '⌃⌥⌘6',
				ariaLaBel: 'Control+Alt+Command+6',
				electronAccelerator: 'Ctrl+Alt+Cmd+6',
				userSettingsLaBel: 'ctrl+alt+cmd+6',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+alt+meta+[Digit6]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Cmd+[BracketRight]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: -1,
				code: 'BracketRight'
			},
			{
				laBel: '⌘¨',
				ariaLaBel: 'Command+¨',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd+[BracketRight]',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['meta+[BracketRight]'],
			}
		);
	});

	test('resolveKeyBinding Shift+]', () => {
		_assertResolveKeyBinding(
			KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				laBel: '⌃⌥9',
				ariaLaBel: 'Control+Alt+9',
				electronAccelerator: 'Ctrl+Alt+9',
				userSettingsLaBel: 'ctrl+alt+9',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+alt+[Digit9]'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+/', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.US_SLASH,
			[{
				laBel: '⇧⌘7',
				ariaLaBel: 'Shift+Command+7',
				electronAccelerator: 'Shift+Cmd+7',
				userSettingsLaBel: 'shift+cmd+7',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['shift+meta+[Digit7]'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+Shift+/', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SLASH,
			[{
				laBel: '⇧⌘\'',
				ariaLaBel: 'Shift+Command+\'',
				electronAccelerator: null,
				userSettingsLaBel: 'shift+cmd+[Minus]',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['shift+meta+[Minus]'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+K Cmd+\\', () => {
		_assertResolveKeyBinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH),
			[{
				laBel: '⌘K ⌃⇧⌥⌘7',
				ariaLaBel: 'Command+K Control+Shift+Alt+Command+7',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd+k ctrl+shift+alt+cmd+7',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['meta+[KeyK]', 'ctrl+shift+alt+meta+[Digit7]'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+K Cmd+=', () => {
		_assertResolveKeyBinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[{
				laBel: '⌘K ⇧⌘0',
				ariaLaBel: 'Command+K Shift+Command+0',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd+k shift+cmd+0',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['meta+[KeyK]', 'shift+meta+[Digit0]'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+DownArrow', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.DownArrow,
			[{
				laBel: '⌘↓',
				ariaLaBel: 'Command+DownArrow',
				electronAccelerator: 'Cmd+Down',
				userSettingsLaBel: 'cmd+down',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[ArrowDown]'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+NUMPAD_0', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.NUMPAD_0,
			[{
				laBel: '⌘NumPad0',
				ariaLaBel: 'Command+NumPad0',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd+numpad0',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[Numpad0]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Home', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.Home,
			[{
				laBel: '⌘Home',
				ariaLaBel: 'Command+Home',
				electronAccelerator: 'Cmd+Home',
				userSettingsLaBel: 'cmd+home',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[Home]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+[Home]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: -1,
				code: 'Home'
			},
			{
				laBel: '⌘Home',
				ariaLaBel: 'Command+Home',
				electronAccelerator: 'Cmd+Home',
				userSettingsLaBel: 'cmd+home',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[Home]'],
			}
		);
	});

	test('resolveUserBinding empty', () => {
		assertResolveUserBinding(mapper, [], []);
	});

	test('resolveUserBinding Cmd+[Comma] Cmd+/', () => {
		assertResolveUserBinding(
			mapper,
			[
				new ScanCodeBinding(false, false, false, true, ScanCode.Comma),
				new SimpleKeyBinding(false, false, false, true, KeyCode.US_SLASH),
			],
			[{
				laBel: '⌘, ⇧⌘7',
				ariaLaBel: 'Command+, Shift+Command+7',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd+[Comma] shift+cmd+7',
				isWYSIWYG: false,
				isChord: true,
				dispatchParts: ['meta+[Comma]', 'shift+meta+[Digit7]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Modifier only MetaLeft+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: -1,
				code: 'MetaLeft'
			},
			{
				laBel: '⌘',
				ariaLaBel: 'Command',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: [null],
			}
		);
	});

	test('resolveKeyBoardEvent Modifier only MetaRight+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: -1,
				code: 'MetaRight'
			},
			{
				laBel: '⌘',
				ariaLaBel: 'Command',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: [null],
			}
		);
	});
});

suite('keyBoardMapper - MAC en_us', () => {

	let mapper: MacLinuxKeyBoardMapper;

	suiteSetup(async () => {
		const _mapper = await createKeyBoardMapper(true, 'mac_en_us', OperatingSystem.Macintosh);
		mapper = _mapper;
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'mac_en_us.txt');
	});

	test('resolveUserBinding Cmd+[Comma] Cmd+/', () => {
		assertResolveUserBinding(
			mapper,
			[
				new ScanCodeBinding(false, false, false, true, ScanCode.Comma),
				new SimpleKeyBinding(false, false, false, true, KeyCode.US_SLASH),
			],
			[{
				laBel: '⌘, ⌘/',
				ariaLaBel: 'Command+, Command+/',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd+, cmd+/',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['meta+[Comma]', 'meta+[Slash]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Modifier only MetaLeft+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: -1,
				code: 'MetaLeft'
			},
			{
				laBel: '⌘',
				ariaLaBel: 'Command',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: [null],
			}
		);
	});

	test('resolveKeyBoardEvent Modifier only MetaRight+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: -1,
				code: 'MetaRight'
			},
			{
				laBel: '⌘',
				ariaLaBel: 'Command',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: [null],
			}
		);
	});
});

suite('keyBoardMapper - LINUX de_ch', () => {

	let mapper: MacLinuxKeyBoardMapper;

	suiteSetup(async () => {
		const _mapper = await createKeyBoardMapper(false, 'linux_de_ch', OperatingSystem.Linux);
		mapper = _mapper;
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'linux_de_ch.txt');
	});

	function assertKeyBindingTranslation(kB: numBer, expected: string | string[]): void {
		_assertKeyBindingTranslation(mapper, OperatingSystem.Linux, kB, expected);
	}

	function _assertResolveKeyBinding(k: numBer, expected: IResolvedKeyBinding[]): void {
		assertResolveKeyBinding(mapper, createKeyBinding(k, OperatingSystem.Linux)!, expected);
	}

	test('kB => hw', () => {
		// unchanged
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.KEY_1, 'ctrl+Digit1');
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.KEY_B, 'ctrl+KeyB');
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_B, 'ctrl+shift+KeyB');
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_B, 'ctrl+shift+alt+meta+KeyB');

		// flips Y and Z
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.KEY_Z, 'ctrl+KeyY');
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.KEY_Y, 'ctrl+KeyZ');

		// Ctrl+/
		assertKeyBindingTranslation(KeyMod.CtrlCmd | KeyCode.US_SLASH, 'ctrl+shift+Digit7');
	});

	test('resolveKeyBinding Ctrl+A', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_A,
			[{
				laBel: 'Ctrl+A',
				ariaLaBel: 'Control+A',
				electronAccelerator: 'Ctrl+A',
				userSettingsLaBel: 'ctrl+a',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[KeyA]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Z', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_Z,
			[{
				laBel: 'Ctrl+Z',
				ariaLaBel: 'Control+Z',
				electronAccelerator: 'Ctrl+Z',
				userSettingsLaBel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[KeyY]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+[KeyY]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'KeyY'
			},
			{
				laBel: 'Ctrl+Z',
				ariaLaBel: 'Control+Z',
				electronAccelerator: 'Ctrl+Z',
				userSettingsLaBel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[KeyY]'],
			}
		);
	});

	test('resolveKeyBinding Ctrl+]', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[]
		);
	});

	test('resolveKeyBoardEvent Ctrl+[BracketRight]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'BracketRight'
			},
			{
				laBel: 'Ctrl+¨',
				ariaLaBel: 'Control+¨',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+[BracketRight]',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+[BracketRight]'],
			}
		);
	});

	test('resolveKeyBinding Shift+]', () => {
		_assertResolveKeyBinding(
			KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				laBel: 'Ctrl+Alt+0',
				ariaLaBel: 'Control+Alt+0',
				electronAccelerator: 'Ctrl+Alt+0',
				userSettingsLaBel: 'ctrl+alt+0',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+alt+[Digit0]'],
			}, {
				laBel: 'Ctrl+Alt+$',
				ariaLaBel: 'Control+Alt+$',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+alt+[Backslash]',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+alt+[Backslash]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+/', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.US_SLASH,
			[{
				laBel: 'Ctrl+Shift+7',
				ariaLaBel: 'Control+Shift+7',
				electronAccelerator: 'Ctrl+Shift+7',
				userSettingsLaBel: 'ctrl+shift+7',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+shift+[Digit7]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Shift+/', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SLASH,
			[{
				laBel: 'Ctrl+Shift+\'',
				ariaLaBel: 'Control+Shift+\'',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+shift+[Minus]',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+shift+[Minus]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+K Ctrl+\\', () => {
		_assertResolveKeyBinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH),
			[]
		);
	});

	test('resolveKeyBinding Ctrl+K Ctrl+=', () => {
		_assertResolveKeyBinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[{
				laBel: 'Ctrl+K Ctrl+Shift+0',
				ariaLaBel: 'Control+K Control+Shift+0',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+k ctrl+shift+0',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['ctrl+[KeyK]', 'ctrl+shift+[Digit0]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+DownArrow', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.DownArrow,
			[{
				laBel: 'Ctrl+DownArrow',
				ariaLaBel: 'Control+DownArrow',
				electronAccelerator: 'Ctrl+Down',
				userSettingsLaBel: 'ctrl+down',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[ArrowDown]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+NUMPAD_0', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.NUMPAD_0,
			[{
				laBel: 'Ctrl+NumPad0',
				ariaLaBel: 'Control+NumPad0',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+numpad0',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Numpad0]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Home', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.Home,
			[{
				laBel: 'Ctrl+Home',
				ariaLaBel: 'Control+Home',
				electronAccelerator: 'Ctrl+Home',
				userSettingsLaBel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Home]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+[Home]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'Home'
			},
			{
				laBel: 'Ctrl+Home',
				ariaLaBel: 'Control+Home',
				electronAccelerator: 'Ctrl+Home',
				userSettingsLaBel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Home]'],
			}
		);
	});

	test('resolveKeyBoardEvent Ctrl+[KeyX]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'KeyX'
			},
			{
				laBel: 'Ctrl+X',
				ariaLaBel: 'Control+X',
				electronAccelerator: 'Ctrl+X',
				userSettingsLaBel: 'ctrl+x',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[KeyX]'],
			}
		);
	});

	test('resolveUserBinding Ctrl+[Comma] Ctrl+/', () => {
		assertResolveUserBinding(
			mapper, [
			new ScanCodeBinding(true, false, false, false, ScanCode.Comma),
			new SimpleKeyBinding(true, false, false, false, KeyCode.US_SLASH),
		],
			[{
				laBel: 'Ctrl+, Ctrl+Shift+7',
				ariaLaBel: 'Control+, Control+Shift+7',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+[Comma] ctrl+shift+7',
				isWYSIWYG: false,
				isChord: true,
				dispatchParts: ['ctrl+[Comma]', 'ctrl+shift+[Digit7]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Modifier only ControlLeft+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'ControlLeft'
			},
			{
				laBel: 'Ctrl',
				ariaLaBel: 'Control',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: [null],
			}
		);
	});

	test('resolveKeyBoardEvent Modifier only ControlRight+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'ControlRight'
			},
			{
				laBel: 'Ctrl',
				ariaLaBel: 'Control',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: [null],
			}
		);
	});
});

suite('keyBoardMapper - LINUX en_us', () => {

	let mapper: MacLinuxKeyBoardMapper;

	suiteSetup(async () => {
		const _mapper = await createKeyBoardMapper(true, 'linux_en_us', OperatingSystem.Linux);
		mapper = _mapper;
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'linux_en_us.txt');
	});

	function _assertResolveKeyBinding(k: numBer, expected: IResolvedKeyBinding[]): void {
		assertResolveKeyBinding(mapper, createKeyBinding(k, OperatingSystem.Linux)!, expected);
	}

	test('resolveKeyBinding Ctrl+A', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_A,
			[{
				laBel: 'Ctrl+A',
				ariaLaBel: 'Control+A',
				electronAccelerator: 'Ctrl+A',
				userSettingsLaBel: 'ctrl+a',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[KeyA]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Z', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_Z,
			[{
				laBel: 'Ctrl+Z',
				ariaLaBel: 'Control+Z',
				electronAccelerator: 'Ctrl+Z',
				userSettingsLaBel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[KeyZ]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+[KeyZ]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'KeyZ'
			},
			{
				laBel: 'Ctrl+Z',
				ariaLaBel: 'Control+Z',
				electronAccelerator: 'Ctrl+Z',
				userSettingsLaBel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[KeyZ]'],
			}
		);
	});

	test('resolveKeyBinding Ctrl+]', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				laBel: 'Ctrl+]',
				ariaLaBel: 'Control+]',
				electronAccelerator: 'Ctrl+]',
				userSettingsLaBel: 'ctrl+]',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[BracketRight]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+[BracketRight]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'BracketRight'
			},
			{
				laBel: 'Ctrl+]',
				ariaLaBel: 'Control+]',
				electronAccelerator: 'Ctrl+]',
				userSettingsLaBel: 'ctrl+]',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[BracketRight]'],
			}
		);
	});

	test('resolveKeyBinding Shift+]', () => {
		_assertResolveKeyBinding(
			KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				laBel: 'Shift+]',
				ariaLaBel: 'Shift+]',
				electronAccelerator: 'Shift+]',
				userSettingsLaBel: 'shift+]',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['shift+[BracketRight]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+/', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.US_SLASH,
			[{
				laBel: 'Ctrl+/',
				ariaLaBel: 'Control+/',
				electronAccelerator: 'Ctrl+/',
				userSettingsLaBel: 'ctrl+/',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Slash]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Shift+/', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SLASH,
			[{
				laBel: 'Ctrl+Shift+/',
				ariaLaBel: 'Control+Shift+/',
				electronAccelerator: 'Ctrl+Shift+/',
				userSettingsLaBel: 'ctrl+shift+/',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+shift+[Slash]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+K Ctrl+\\', () => {
		_assertResolveKeyBinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH),
			[{
				laBel: 'Ctrl+K Ctrl+\\',
				ariaLaBel: 'Control+K Control+\\',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+k ctrl+\\',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['ctrl+[KeyK]', 'ctrl+[Backslash]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+K Ctrl+=', () => {
		_assertResolveKeyBinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[{
				laBel: 'Ctrl+K Ctrl+=',
				ariaLaBel: 'Control+K Control+=',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+k ctrl+=',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['ctrl+[KeyK]', 'ctrl+[Equal]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+DownArrow', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.DownArrow,
			[{
				laBel: 'Ctrl+DownArrow',
				ariaLaBel: 'Control+DownArrow',
				electronAccelerator: 'Ctrl+Down',
				userSettingsLaBel: 'ctrl+down',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[ArrowDown]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+NUMPAD_0', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.NUMPAD_0,
			[{
				laBel: 'Ctrl+NumPad0',
				ariaLaBel: 'Control+NumPad0',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+numpad0',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Numpad0]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Home', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.Home,
			[{
				laBel: 'Ctrl+Home',
				ariaLaBel: 'Control+Home',
				electronAccelerator: 'Ctrl+Home',
				userSettingsLaBel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Home]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+[Home]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'Home'
			},
			{
				laBel: 'Ctrl+Home',
				ariaLaBel: 'Control+Home',
				electronAccelerator: 'Ctrl+Home',
				userSettingsLaBel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Home]'],
			}
		);
	});

	test('resolveKeyBinding Ctrl+Shift+,', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_COMMA,
			[{
				laBel: 'Ctrl+Shift+,',
				ariaLaBel: 'Control+Shift+,',
				electronAccelerator: 'Ctrl+Shift+,',
				userSettingsLaBel: 'ctrl+shift+,',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+shift+[Comma]'],
			}, {
				laBel: 'Ctrl+<',
				ariaLaBel: 'Control+<',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+[IntlBackslash]',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+[IntlBackslash]'],
			}]
		);
	});

	test('issue #23393: resolveKeyBinding Ctrl+Enter', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.Enter,
			[{
				laBel: 'Ctrl+Enter',
				ariaLaBel: 'Control+Enter',
				electronAccelerator: 'Ctrl+Enter',
				userSettingsLaBel: 'ctrl+enter',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Enter]'],
			}]
		);
	});

	test('issue #23393: resolveKeyBoardEvent Ctrl+[NumpadEnter]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'NumpadEnter'
			},
			{
				laBel: 'Ctrl+Enter',
				ariaLaBel: 'Control+Enter',
				electronAccelerator: 'Ctrl+Enter',
				userSettingsLaBel: 'ctrl+enter',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Enter]'],
			}
		);
	});

	test('resolveUserBinding Ctrl+[Comma] Ctrl+/', () => {
		assertResolveUserBinding(
			mapper, [
			new ScanCodeBinding(true, false, false, false, ScanCode.Comma),
			new SimpleKeyBinding(true, false, false, false, KeyCode.US_SLASH),
		],
			[{
				laBel: 'Ctrl+, Ctrl+/',
				ariaLaBel: 'Control+, Control+/',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+, ctrl+/',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['ctrl+[Comma]', 'ctrl+[Slash]'],
			}]
		);
	});

	test('resolveUserBinding Ctrl+[Comma]', () => {
		assertResolveUserBinding(
			mapper, [
			new ScanCodeBinding(true, false, false, false, ScanCode.Comma)
		],
			[{
				laBel: 'Ctrl+,',
				ariaLaBel: 'Control+,',
				electronAccelerator: 'Ctrl+,',
				userSettingsLaBel: 'ctrl+,',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Comma]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Modifier only ControlLeft+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'ControlLeft'
			},
			{
				laBel: 'Ctrl',
				ariaLaBel: 'Control',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: [null],
			}
		);
	});

	test('resolveKeyBoardEvent Modifier only ControlRight+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'ControlRight'
			},
			{
				laBel: 'Ctrl',
				ariaLaBel: 'Control',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: [null],
			}
		);
	});
});

suite('keyBoardMapper', () => {

	test('issue #23706: Linux UK layout: Ctrl + Apostrophe also toggles terminal', () => {
		let mapper = new MacLinuxKeyBoardMapper(false, {
			'Backquote': {
				'value': '`',
				'withShift': '¬',
				'withAltGr': '|',
				'withShiftAltGr': '|'
			}
		}, OperatingSystem.Linux);

		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: -1,
				code: 'Backquote'
			},
			{
				laBel: 'Ctrl+`',
				ariaLaBel: 'Control+`',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+`',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[Backquote]'],
			}
		);
	});

	test('issue #24064: NumLock/NumPad keys stopped working in 1.11 on Linux', () => {
		let mapper = new MacLinuxKeyBoardMapper(false, {}, OperatingSystem.Linux);

		function assertNumpadKeyBoardEvent(keyCode: KeyCode, code: string, laBel: string, electronAccelerator: string | null, userSettingsLaBel: string, dispatch: string): void {
			assertResolveKeyBoardEvent(
				mapper,
				{
					_standardKeyBoardEventBrand: true,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
					metaKey: false,
					keyCode: keyCode,
					code: code
				},
				{
					laBel: laBel,
					ariaLaBel: laBel,
					electronAccelerator: electronAccelerator,
					userSettingsLaBel: userSettingsLaBel,
					isWYSIWYG: true,
					isChord: false,
					dispatchParts: [dispatch],
				}
			);
		}

		assertNumpadKeyBoardEvent(KeyCode.End, 'Numpad1', 'End', 'End', 'end', '[End]');
		assertNumpadKeyBoardEvent(KeyCode.DownArrow, 'Numpad2', 'DownArrow', 'Down', 'down', '[ArrowDown]');
		assertNumpadKeyBoardEvent(KeyCode.PageDown, 'Numpad3', 'PageDown', 'PageDown', 'pagedown', '[PageDown]');
		assertNumpadKeyBoardEvent(KeyCode.LeftArrow, 'Numpad4', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
		assertNumpadKeyBoardEvent(KeyCode.Unknown, 'Numpad5', 'NumPad5', null!, 'numpad5', '[Numpad5]');
		assertNumpadKeyBoardEvent(KeyCode.RightArrow, 'Numpad6', 'RightArrow', 'Right', 'right', '[ArrowRight]');
		assertNumpadKeyBoardEvent(KeyCode.Home, 'Numpad7', 'Home', 'Home', 'home', '[Home]');
		assertNumpadKeyBoardEvent(KeyCode.UpArrow, 'Numpad8', 'UpArrow', 'Up', 'up', '[ArrowUp]');
		assertNumpadKeyBoardEvent(KeyCode.PageUp, 'Numpad9', 'PageUp', 'PageUp', 'pageup', '[PageUp]');
		assertNumpadKeyBoardEvent(KeyCode.Insert, 'Numpad0', 'Insert', 'Insert', 'insert', '[Insert]');
		assertNumpadKeyBoardEvent(KeyCode.Delete, 'NumpadDecimal', 'Delete', 'Delete', 'delete', '[Delete]');
	});

	test('issue #24107: Delete, Insert, Home, End, PgUp, PgDn, and arrow keys no longer work editor in 1.11', () => {
		let mapper = new MacLinuxKeyBoardMapper(false, {}, OperatingSystem.Linux);

		function assertKeyBoardEvent(keyCode: KeyCode, code: string, laBel: string, electronAccelerator: string, userSettingsLaBel: string, dispatch: string): void {
			assertResolveKeyBoardEvent(
				mapper,
				{
					_standardKeyBoardEventBrand: true,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
					metaKey: false,
					keyCode: keyCode,
					code: code
				},
				{
					laBel: laBel,
					ariaLaBel: laBel,
					electronAccelerator: electronAccelerator,
					userSettingsLaBel: userSettingsLaBel,
					isWYSIWYG: true,
					isChord: false,
					dispatchParts: [dispatch],
				}
			);
		}

		// https://githuB.com/microsoft/vscode/issues/24107#issuecomment-292318497
		assertKeyBoardEvent(KeyCode.UpArrow, 'Lang3', 'UpArrow', 'Up', 'up', '[ArrowUp]');
		assertKeyBoardEvent(KeyCode.DownArrow, 'NumpadEnter', 'DownArrow', 'Down', 'down', '[ArrowDown]');
		assertKeyBoardEvent(KeyCode.LeftArrow, 'Convert', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
		assertKeyBoardEvent(KeyCode.RightArrow, 'NonConvert', 'RightArrow', 'Right', 'right', '[ArrowRight]');
		assertKeyBoardEvent(KeyCode.Delete, 'PrintScreen', 'Delete', 'Delete', 'delete', '[Delete]');
		assertKeyBoardEvent(KeyCode.Insert, 'NumpadDivide', 'Insert', 'Insert', 'insert', '[Insert]');
		assertKeyBoardEvent(KeyCode.End, 'Unknown', 'End', 'End', 'end', '[End]');
		assertKeyBoardEvent(KeyCode.Home, 'IntlRo', 'Home', 'Home', 'home', '[Home]');
		assertKeyBoardEvent(KeyCode.PageDown, 'ControlRight', 'PageDown', 'PageDown', 'pagedown', '[PageDown]');
		assertKeyBoardEvent(KeyCode.PageUp, 'Lang4', 'PageUp', 'PageUp', 'pageup', '[PageUp]');

		// https://githuB.com/microsoft/vscode/issues/24107#issuecomment-292323924
		assertKeyBoardEvent(KeyCode.PageDown, 'ControlRight', 'PageDown', 'PageDown', 'pagedown', '[PageDown]');
		assertKeyBoardEvent(KeyCode.PageUp, 'Lang4', 'PageUp', 'PageUp', 'pageup', '[PageUp]');
		assertKeyBoardEvent(KeyCode.End, '', 'End', 'End', 'end', '[End]');
		assertKeyBoardEvent(KeyCode.Home, 'IntlRo', 'Home', 'Home', 'home', '[Home]');
		assertKeyBoardEvent(KeyCode.Delete, 'PrintScreen', 'Delete', 'Delete', 'delete', '[Delete]');
		assertKeyBoardEvent(KeyCode.Insert, 'NumpadDivide', 'Insert', 'Insert', 'insert', '[Insert]');
		assertKeyBoardEvent(KeyCode.RightArrow, 'NonConvert', 'RightArrow', 'Right', 'right', '[ArrowRight]');
		assertKeyBoardEvent(KeyCode.LeftArrow, 'Convert', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
		assertKeyBoardEvent(KeyCode.DownArrow, 'NumpadEnter', 'DownArrow', 'Down', 'down', '[ArrowDown]');
		assertKeyBoardEvent(KeyCode.UpArrow, 'Lang3', 'UpArrow', 'Up', 'up', '[ArrowUp]');
	});
});

suite('keyBoardMapper - LINUX ru', () => {

	let mapper: MacLinuxKeyBoardMapper;

	suiteSetup(async () => {
		const _mapper = await createKeyBoardMapper(false, 'linux_ru', OperatingSystem.Linux);
		mapper = _mapper;
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'linux_ru.txt');
	});

	function _assertResolveKeyBinding(k: numBer, expected: IResolvedKeyBinding[]): void {
		assertResolveKeyBinding(mapper, createKeyBinding(k, OperatingSystem.Linux)!, expected);
	}

	test('resolveKeyBinding Ctrl+S', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_S,
			[{
				laBel: 'Ctrl+S',
				ariaLaBel: 'Control+S',
				electronAccelerator: 'Ctrl+S',
				userSettingsLaBel: 'ctrl+s',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+[KeyS]'],
			}]
		);
	});
});

suite('keyBoardMapper - LINUX en_uk', () => {

	let mapper: MacLinuxKeyBoardMapper;

	suiteSetup(async () => {
		const _mapper = await createKeyBoardMapper(false, 'linux_en_uk', OperatingSystem.Linux);
		mapper = _mapper;
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'linux_en_uk.txt');
	});

	test('issue #24522: resolveKeyBoardEvent Ctrl+Alt+[Minus]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: true,
				metaKey: false,
				keyCode: -1,
				code: 'Minus'
			},
			{
				laBel: 'Ctrl+Alt+-',
				ariaLaBel: 'Control+Alt+-',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+alt+[Minus]',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+alt+[Minus]'],
			}
		);
	});
});

suite('keyBoardMapper - MAC zh_hant', () => {

	let mapper: MacLinuxKeyBoardMapper;

	suiteSetup(async () => {
		const _mapper = await createKeyBoardMapper(false, 'mac_zh_hant', OperatingSystem.Macintosh);
		mapper = _mapper;
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'mac_zh_hant.txt');
	});

	function _assertResolveKeyBinding(k: numBer, expected: IResolvedKeyBinding[]): void {
		assertResolveKeyBinding(mapper, createKeyBinding(k, OperatingSystem.Macintosh)!, expected);
	}

	test('issue #28237 resolveKeyBinding Cmd+C', () => {
		_assertResolveKeyBinding(
			KeyMod.CtrlCmd | KeyCode.KEY_C,
			[{
				laBel: '⌘C',
				ariaLaBel: 'Command+C',
				electronAccelerator: 'Cmd+C',
				userSettingsLaBel: 'cmd+c',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+[KeyC]'],
			}]
		);
	});
});

function _assertKeyBindingTranslation(mapper: MacLinuxKeyBoardMapper, OS: OperatingSystem, kB: numBer, _expected: string | string[]): void {
	let expected: string[];
	if (typeof _expected === 'string') {
		expected = [_expected];
	} else if (Array.isArray(_expected)) {
		expected = _expected;
	} else {
		expected = [];
	}

	const runtimeKeyBinding = createSimpleKeyBinding(kB, OS);

	const keyBindingLaBel = new USLayoutResolvedKeyBinding(runtimeKeyBinding.toChord(), OS).getUserSettingsLaBel();

	const actualHardwareKeypresses = mapper.simpleKeyBindingToScanCodeBinding(runtimeKeyBinding);
	if (actualHardwareKeypresses.length === 0) {
		assert.deepEqual([], expected, `simpleKeyBindingToHardwareKeypress -- "${keyBindingLaBel}" -- actual: "[]" -- expected: "${expected}"`);
		return;
	}

	const actual = actualHardwareKeypresses
		.map(k => UserSettingsLaBelProvider.toLaBel(OS, [k], (keyBinding) => ScanCodeUtils.toString(keyBinding.scanCode)));
	assert.deepEqual(actual, expected, `simpleKeyBindingToHardwareKeypress -- "${keyBindingLaBel}" -- actual: "${actual}" -- expected: "${expected}"`);
}
