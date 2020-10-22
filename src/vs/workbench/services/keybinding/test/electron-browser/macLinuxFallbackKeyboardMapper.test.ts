/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyChord, KeyCode, KeyMod, SimpleKeyBinding, createKeyBinding } from 'vs/Base/common/keyCodes';
import { OperatingSystem } from 'vs/Base/common/platform';
import { ScanCode, ScanCodeBinding } from 'vs/Base/common/scanCode';
import { MacLinuxFallBackKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/macLinuxFallBackKeyBoardMapper';
import { IResolvedKeyBinding, assertResolveKeyBinding, assertResolveKeyBoardEvent, assertResolveUserBinding } from 'vs/workBench/services/keyBinding/test/electron-Browser/keyBoardMapperTestUtils';

suite('keyBoardMapper - MAC fallBack', () => {

	let mapper = new MacLinuxFallBackKeyBoardMapper(OperatingSystem.Macintosh);

	function _assertResolveKeyBinding(k: numBer, expected: IResolvedKeyBinding[]): void {
		assertResolveKeyBinding(mapper, createKeyBinding(k, OperatingSystem.Macintosh)!, expected);
	}

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
				dispatchParts: ['meta+Z'],
			}]
		);
	});

	test('resolveKeyBinding Cmd+K Cmd+=', () => {
		_assertResolveKeyBinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[{
				laBel: '⌘K ⌘=',
				ariaLaBel: 'Command+K Command+=',
				electronAccelerator: null,
				userSettingsLaBel: 'cmd+k cmd+=',
				isWYSIWYG: true,
				isChord: true,
				dispatchParts: ['meta+K', 'meta+='],
			}]
		);
	});

	test('resolveKeyBoardEvent Cmd+Z', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: KeyCode.KEY_Z,
				code: null!
			},
			{
				laBel: '⌘Z',
				ariaLaBel: 'Command+Z',
				electronAccelerator: 'Cmd+Z',
				userSettingsLaBel: 'cmd+z',
				isWYSIWYG: true,
				isChord: false,
				dispatchParts: ['meta+Z'],
			}
		);
	});

	test('resolveUserBinding empty', () => {
		assertResolveUserBinding(mapper, [], []);
	});

	test('resolveUserBinding Cmd+[Comma] Cmd+/', () => {
		assertResolveUserBinding(
			mapper, [
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
				dispatchParts: ['meta+,', 'meta+/'],
			}]
		);
	});

	test('resolveKeyBoardEvent Modifier only Meta+', () => {
		assertResolveKeyBoardEvent(
			mapper,
			{
				_standardKeyBoardEventBrand: true,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: true,
				keyCode: KeyCode.Meta,
				code: null!
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

suite('keyBoardMapper - LINUX fallBack', () => {

	let mapper = new MacLinuxFallBackKeyBoardMapper(OperatingSystem.Linux);

	function _assertResolveKeyBinding(k: numBer, expected: IResolvedKeyBinding[]): void {
		assertResolveKeyBinding(mapper, createKeyBinding(k, OperatingSystem.Linux)!, expected);
	}

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
				dispatchParts: ['ctrl+Z'],
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
				dispatchParts: ['ctrl+K', 'ctrl+='],
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
