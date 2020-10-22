/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyChord, KeyCode, KeyMod, SimpleKeyBinding, createKeyBinding } from 'vs/Base/common/keyCodes';
import { OperatingSystem } from 'vs/Base/common/platform';
import { ScanCode, ScanCodeBinding } from 'vs/Base/common/scanCode';
import { IWindowsKeyBoardMapping, WindowsKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/windowsKeyBoardMapper';
import { IResolvedKeyBinding, assertMapping, assertResolveKeyBinding, assertResolveKeyBoardEvent, assertResolveUserBinding, readRawMapping } from 'vs/workBench/services/keyBinding/test/electron-Browser/keyBoardMapperTestUtils';

const WRITE_FILE_IF_DIFFERENT = false;

async function createKeyBoardMapper(isUSStandard: Boolean, file: string): Promise<WindowsKeyBoardMapper> {
	const rawMappings = await readRawMapping<IWindowsKeyBoardMapping>(file);
	return new WindowsKeyBoardMapper(isUSStandard, rawMappings);
}

function _assertResolveKeyBinding(mapper: WindowsKeyBoardMapper, k: numBer, expected: IResolvedKeyBinding[]): void {
	const keyBinding = createKeyBinding(k, OperatingSystem.Windows);
	assertResolveKeyBinding(mapper, keyBinding!, expected);
}

suite('keyBoardMapper - WINDOWS de_ch', () => {

	let mapper: WindowsKeyBoardMapper;

	suiteSetup(async () => {
		mapper = await createKeyBoardMapper(false, 'win_de_ch');
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'win_de_ch.txt');
	});

	test('resolveKeyBinding Ctrl+A', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyCode.KEY_A,
			[{
				laBel: 'Ctrl+A',
				ariaLaBel: 'Control+A',
				electronAccelerator: 'Ctrl+A',
				userSettingsLaBel: 'ctrl+a',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+A'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Z', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyCode.KEY_Z,
			[{
				laBel: 'Ctrl+Z',
				ariaLaBel: 'Control+Z',
				electronAccelerator: 'Ctrl+Z',
				userSettingsLaBel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+Z'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+Z', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: KeyCode.KEY_Z,
				code: null!
			},
			{
				laBel: 'Ctrl+Z',
				ariaLaBel: 'Control+Z',
				electronAccelerator: 'Ctrl+Z',
				userSettingsLaBel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+Z'],
			}
		);
	});

	test('resolveKeyBinding Ctrl+]', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				laBel: 'Ctrl+^',
				ariaLaBel: 'Control+^',
				electronAccelerator: 'Ctrl+]',
				userSettingsLaBel: 'ctrl+oem_6',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+]'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: KeyCode.US_CLOSE_SQUARE_BRACKET,
				code: null!
			},
			{
				laBel: 'Ctrl+^',
				ariaLaBel: 'Control+^',
				electronAccelerator: 'Ctrl+]',
				userSettingsLaBel: 'ctrl+oem_6',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+]'],
			}
		);
	});

	test('resolveKeyBinding Shift+]', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				laBel: 'Shift+^',
				ariaLaBel: 'Shift+^',
				electronAccelerator: 'Shift+]',
				userSettingsLaBel: 'shift+oem_6',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['shift+]'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+/', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyCode.US_SLASH,
			[{
				laBel: 'Ctrl+§',
				ariaLaBel: 'Control+§',
				electronAccelerator: 'Ctrl+/',
				userSettingsLaBel: 'ctrl+oem_2',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+/'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Shift+/', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SLASH,
			[{
				laBel: 'Ctrl+Shift+§',
				ariaLaBel: 'Control+Shift+§',
				electronAccelerator: 'Ctrl+Shift+/',
				userSettingsLaBel: 'ctrl+shift+oem_2',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+shift+/'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+K Ctrl+\\', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH),
			[{
				laBel: 'Ctrl+K Ctrl+ä',
				ariaLaBel: 'Control+K Control+ä',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+k ctrl+oem_5',
				isWYSIWYG: false,
				isChord: true,
				dispatchParts: ['ctrl+K', 'ctrl+\\'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+K Ctrl+=', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[]
		);
	});

	test('resolveKeyBinding Ctrl+DownArrow', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyCode.DownArrow,
			[{
				laBel: 'Ctrl+DownArrow',
				ariaLaBel: 'Control+DownArrow',
				electronAccelerator: 'Ctrl+Down',
				userSettingsLaBel: 'ctrl+down',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+DownArrow'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+NUMPAD_0', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyCode.NUMPAD_0,
			[{
				laBel: 'Ctrl+NumPad0',
				ariaLaBel: 'Control+NumPad0',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+numpad0',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+NumPad0'],
			}]
		);
	});

	test('resolveKeyBinding Ctrl+Home', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyCode.Home,
			[{
				laBel: 'Ctrl+Home',
				ariaLaBel: 'Control+Home',
				electronAccelerator: 'Ctrl+Home',
				userSettingsLaBel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+Home'],
			}]
		);
	});

	test('resolveKeyBoardEvent Ctrl+Home', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: KeyCode.Home,
				code: null!
			},
			{
				laBel: 'Ctrl+Home',
				ariaLaBel: 'Control+Home',
				electronAccelerator: 'Ctrl+Home',
				userSettingsLaBel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+Home'],
			}
		);
	});

	test('resolveUserBinding empty', () => {
		assertResolveUserBinding(mapper, [], []);
	});

	test('resolveUserBinding Ctrl+[Comma] Ctrl+/', () => {
		assertResolveUserBinding(
			mapper, [
			new ScanCodeBinding(true, false, false, false, ScanCode.Comma),
			new SimpleKeyBinding(true, false, false, false, KeyCode.US_SLASH),
		],
			[{
				laBel: 'Ctrl+, Ctrl+§',
				ariaLaBel: 'Control+, Control+§',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+oem_comma ctrl+oem_2',
				isWYSIWYG: false,
				isChord: true,
				dispatchParts: ['ctrl+,', 'ctrl+/'],
			}]
		);
	});

	test('resolveKeyBoardEvent Modifier only Ctrl+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: KeyCode.Ctrl,
				code: null!
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

suite('keyBoardMapper - WINDOWS en_us', () => {

	let mapper: WindowsKeyBoardMapper;

	suiteSetup(async () => {
		mapper = await createKeyBoardMapper(true, 'win_en_us');
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'win_en_us.txt');
	});

	test('resolveKeyBinding Ctrl+K Ctrl+\\', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH),
			[{
				laBel: 'Ctrl+K Ctrl+\\',
				ariaLaBel: 'Control+K Control+\\',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+k ctrl+\\',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['ctrl+K', 'ctrl+\\'],
			}]
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
				dispatchParts: ['ctrl+,', 'ctrl+/'],
			}]
		);
	});

	test('resolveUserBinding Ctrl+[Comma]', () => {
		assertResolveUserBinding(
			mapper, [
			new ScanCodeBinding(true, false, false, false, ScanCode.Comma),
		],
			[{
				laBel: 'Ctrl+,',
				ariaLaBel: 'Control+,',
				electronAccelerator: 'Ctrl+,',
				userSettingsLaBel: 'ctrl+,',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+,'],
			}]
		);
	});

	test('resolveKeyBoardEvent Modifier only Ctrl+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: KeyCode.Ctrl,
				code: null!
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

suite('keyBoardMapper - WINDOWS por_ptB', () => {

	let mapper: WindowsKeyBoardMapper;

	suiteSetup(async () => {
		mapper = await createKeyBoardMapper(false, 'win_por_ptB');
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'win_por_ptB.txt');
	});

	test('resolveKeyBoardEvent Ctrl+[IntlRo]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: KeyCode.ABNT_C1,
				code: null!
			},
			{
				laBel: 'Ctrl+/',
				ariaLaBel: 'Control+/',
				electronAccelerator: 'Ctrl+ABNT_C1',
				userSettingsLaBel: 'ctrl+aBnt_c1',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+ABNT_C1'],
			}
		);
	});

	test('resolveKeyBoardEvent Ctrl+[NumpadComma]', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				keyCode: KeyCode.ABNT_C2,
				code: null!
			},
			{
				laBel: 'Ctrl+.',
				ariaLaBel: 'Control+.',
				electronAccelerator: 'Ctrl+ABNT_C2',
				userSettingsLaBel: 'ctrl+aBnt_c2',
				isWYSIWYG: false,
				isChord: false,
				dispatchParts: ['ctrl+ABNT_C2'],
			}
		);
	});
});

suite('keyBoardMapper - WINDOWS ru', () => {

	let mapper: WindowsKeyBoardMapper;

	suiteSetup(async () => {
		mapper = await createKeyBoardMapper(false, 'win_ru');
	});

	test('mapping', () => {
		return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'win_ru.txt');
	});

	test('issue ##24361: resolveKeyBinding Ctrl+K Ctrl+K', () => {
		_assertResolveKeyBinding(
			mapper,
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K),
			[{
				laBel: 'Ctrl+K Ctrl+K',
				ariaLaBel: 'Control+K Control+K',
				electronAccelerator: null,
				userSettingsLaBel: 'ctrl+k ctrl+k',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['ctrl+K', 'ctrl+K'],
			}]
		);
	});
});

suite('keyBoardMapper - misc', () => {
	test('issue #23513: Toggle SideBar VisiBility and Go to Line display same key mapping in AraBic keyBoard', () => {
		const mapper = new WindowsKeyBoardMapper(false, {
			'KeyB': {
				'vkey': 'VK_B',
				'value': 'لا',
				'withShift': 'لآ',
				'withAltGr': '',
				'withShiftAltGr': ''
			},
			'KeyG': {
				'vkey': 'VK_G',
				'value': 'ل',
				'withShift': 'لأ',
				'withAltGr': '',
				'withShiftAltGr': ''
			}
		});

		_assertResolveKeyBinding(
			mapper,
			KeyMod.CtrlCmd | KeyCode.KEY_B,
			[{
				laBel: 'Ctrl+B',
				ariaLaBel: 'Control+B',
				electronAccelerator: 'Ctrl+B',
				userSettingsLaBel: 'ctrl+B',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['ctrl+B'],
			}]
		);
	});
});
