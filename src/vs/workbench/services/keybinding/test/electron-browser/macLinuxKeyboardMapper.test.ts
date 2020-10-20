/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { KeyChord, KeyCode, KeyMod, SimpleKeybinding, creAteKeybinding, creAteSimpleKeybinding } from 'vs/bAse/common/keyCodes';
import { UserSettingsLAbelProvider } from 'vs/bAse/common/keybindingLAbels';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';
import { ScAnCode, ScAnCodeBinding, ScAnCodeUtils } from 'vs/bAse/common/scAnCode';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';
import { IMAcLinuxKeyboArdMApping, MAcLinuxKeyboArdMApper } from 'vs/workbench/services/keybinding/common/mAcLinuxKeyboArdMApper';
import { IResolvedKeybinding, AssertMApping, AssertResolveKeybinding, AssertResolveKeyboArdEvent, AssertResolveUserBinding, reAdRAwMApping } from 'vs/workbench/services/keybinding/test/electron-browser/keyboArdMApperTestUtils';

const WRITE_FILE_IF_DIFFERENT = fAlse;

Async function creAteKeyboArdMApper(isUSStAndArd: booleAn, file: string, OS: OperAtingSystem): Promise<MAcLinuxKeyboArdMApper> {
	const rAwMAppings = AwAit reAdRAwMApping<IMAcLinuxKeyboArdMApping>(file);
	return new MAcLinuxKeyboArdMApper(isUSStAndArd, rAwMAppings, OS);
}

suite('keyboArdMApper - MAC de_ch', () => {

	let mApper: MAcLinuxKeyboArdMApper;

	suiteSetup(Async () => {
		const _mApper = AwAit creAteKeyboArdMApper(fAlse, 'mAc_de_ch', OperAtingSystem.MAcintosh);
		mApper = _mApper;
	});

	test('mApping', () => {
		return AssertMApping(WRITE_FILE_IF_DIFFERENT, mApper, 'mAc_de_ch.txt');
	});

	function AssertKeybindingTrAnslAtion(kb: number, expected: string | string[]): void {
		_AssertKeybindingTrAnslAtion(mApper, OperAtingSystem.MAcintosh, kb, expected);
	}

	function _AssertResolveKeybinding(k: number, expected: IResolvedKeybinding[]): void {
		AssertResolveKeybinding(mApper, creAteKeybinding(k, OperAtingSystem.MAcintosh)!, expected);
	}

	test('kb => hw', () => {
		// unchAnged
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.KEY_1, 'cmd+Digit1');
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.KEY_B, 'cmd+KeyB');
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_B, 'shift+cmd+KeyB');
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_B, 'ctrl+shift+Alt+cmd+KeyB');

		// flips Y And Z
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.KEY_Z, 'cmd+KeyY');
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.KEY_Y, 'cmd+KeyZ');

		// Ctrl+/
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.US_SLASH, 'shift+cmd+Digit7');
	});

	test('resolveKeybinding Cmd+A', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_A,
			[{
				lAbel: '⌘A',
				AriALAbel: 'CommAnd+A',
				electronAccelerAtor: 'Cmd+A',
				userSettingsLAbel: 'cmd+A',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[KeyA]'],
			}]
		);
	});

	test('resolveKeybinding Cmd+B', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_B,
			[{
				lAbel: '⌘B',
				AriALAbel: 'CommAnd+B',
				electronAccelerAtor: 'Cmd+B',
				userSettingsLAbel: 'cmd+b',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[KeyB]'],
			}]
		);
	});

	test('resolveKeybinding Cmd+Z', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_Z,
			[{
				lAbel: '⌘Z',
				AriALAbel: 'CommAnd+Z',
				electronAccelerAtor: 'Cmd+Z',
				userSettingsLAbel: 'cmd+z',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[KeyY]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Cmd+[KeyY]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: -1,
				code: 'KeyY'
			},
			{
				lAbel: '⌘Z',
				AriALAbel: 'CommAnd+Z',
				electronAccelerAtor: 'Cmd+Z',
				userSettingsLAbel: 'cmd+z',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[KeyY]'],
			}
		);
	});

	test('resolveKeybinding Cmd+]', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				lAbel: '⌃⌥⌘6',
				AriALAbel: 'Control+Alt+CommAnd+6',
				electronAccelerAtor: 'Ctrl+Alt+Cmd+6',
				userSettingsLAbel: 'ctrl+Alt+cmd+6',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+Alt+metA+[Digit6]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Cmd+[BrAcketRight]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: -1,
				code: 'BrAcketRight'
			},
			{
				lAbel: '⌘¨',
				AriALAbel: 'CommAnd+¨',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd+[BrAcketRight]',
				isWYSIWYG: fAlse,
				isChord: fAlse,
				dispAtchPArts: ['metA+[BrAcketRight]'],
			}
		);
	});

	test('resolveKeybinding Shift+]', () => {
		_AssertResolveKeybinding(
			KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				lAbel: '⌃⌥9',
				AriALAbel: 'Control+Alt+9',
				electronAccelerAtor: 'Ctrl+Alt+9',
				userSettingsLAbel: 'ctrl+Alt+9',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+Alt+[Digit9]'],
			}]
		);
	});

	test('resolveKeybinding Cmd+/', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.US_SLASH,
			[{
				lAbel: '⇧⌘7',
				AriALAbel: 'Shift+CommAnd+7',
				electronAccelerAtor: 'Shift+Cmd+7',
				userSettingsLAbel: 'shift+cmd+7',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['shift+metA+[Digit7]'],
			}]
		);
	});

	test('resolveKeybinding Cmd+Shift+/', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SLASH,
			[{
				lAbel: '⇧⌘\'',
				AriALAbel: 'Shift+CommAnd+\'',
				electronAccelerAtor: null,
				userSettingsLAbel: 'shift+cmd+[Minus]',
				isWYSIWYG: fAlse,
				isChord: fAlse,
				dispAtchPArts: ['shift+metA+[Minus]'],
			}]
		);
	});

	test('resolveKeybinding Cmd+K Cmd+\\', () => {
		_AssertResolveKeybinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH),
			[{
				lAbel: '⌘K ⌃⇧⌥⌘7',
				AriALAbel: 'CommAnd+K Control+Shift+Alt+CommAnd+7',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd+k ctrl+shift+Alt+cmd+7',
				isWYSIWYG: true,
				isChord: true,
				dispAtchPArts: ['metA+[KeyK]', 'ctrl+shift+Alt+metA+[Digit7]'],
			}]
		);
	});

	test('resolveKeybinding Cmd+K Cmd+=', () => {
		_AssertResolveKeybinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[{
				lAbel: '⌘K ⇧⌘0',
				AriALAbel: 'CommAnd+K Shift+CommAnd+0',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd+k shift+cmd+0',
				isWYSIWYG: true,
				isChord: true,
				dispAtchPArts: ['metA+[KeyK]', 'shift+metA+[Digit0]'],
			}]
		);
	});

	test('resolveKeybinding Cmd+DownArrow', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.DownArrow,
			[{
				lAbel: '⌘↓',
				AriALAbel: 'CommAnd+DownArrow',
				electronAccelerAtor: 'Cmd+Down',
				userSettingsLAbel: 'cmd+down',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[ArrowDown]'],
			}]
		);
	});

	test('resolveKeybinding Cmd+NUMPAD_0', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.NUMPAD_0,
			[{
				lAbel: '⌘NumPAd0',
				AriALAbel: 'CommAnd+NumPAd0',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd+numpAd0',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[NumpAd0]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+Home', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.Home,
			[{
				lAbel: '⌘Home',
				AriALAbel: 'CommAnd+Home',
				electronAccelerAtor: 'Cmd+Home',
				userSettingsLAbel: 'cmd+home',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[Home]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Ctrl+[Home]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: -1,
				code: 'Home'
			},
			{
				lAbel: '⌘Home',
				AriALAbel: 'CommAnd+Home',
				electronAccelerAtor: 'Cmd+Home',
				userSettingsLAbel: 'cmd+home',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[Home]'],
			}
		);
	});

	test('resolveUserBinding empty', () => {
		AssertResolveUserBinding(mApper, [], []);
	});

	test('resolveUserBinding Cmd+[CommA] Cmd+/', () => {
		AssertResolveUserBinding(
			mApper,
			[
				new ScAnCodeBinding(fAlse, fAlse, fAlse, true, ScAnCode.CommA),
				new SimpleKeybinding(fAlse, fAlse, fAlse, true, KeyCode.US_SLASH),
			],
			[{
				lAbel: '⌘, ⇧⌘7',
				AriALAbel: 'CommAnd+, Shift+CommAnd+7',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd+[CommA] shift+cmd+7',
				isWYSIWYG: fAlse,
				isChord: true,
				dispAtchPArts: ['metA+[CommA]', 'shift+metA+[Digit7]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Modifier only MetALeft+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: -1,
				code: 'MetALeft'
			},
			{
				lAbel: '⌘',
				AriALAbel: 'CommAnd',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: [null],
			}
		);
	});

	test('resolveKeyboArdEvent Modifier only MetARight+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: -1,
				code: 'MetARight'
			},
			{
				lAbel: '⌘',
				AriALAbel: 'CommAnd',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: [null],
			}
		);
	});
});

suite('keyboArdMApper - MAC en_us', () => {

	let mApper: MAcLinuxKeyboArdMApper;

	suiteSetup(Async () => {
		const _mApper = AwAit creAteKeyboArdMApper(true, 'mAc_en_us', OperAtingSystem.MAcintosh);
		mApper = _mApper;
	});

	test('mApping', () => {
		return AssertMApping(WRITE_FILE_IF_DIFFERENT, mApper, 'mAc_en_us.txt');
	});

	test('resolveUserBinding Cmd+[CommA] Cmd+/', () => {
		AssertResolveUserBinding(
			mApper,
			[
				new ScAnCodeBinding(fAlse, fAlse, fAlse, true, ScAnCode.CommA),
				new SimpleKeybinding(fAlse, fAlse, fAlse, true, KeyCode.US_SLASH),
			],
			[{
				lAbel: '⌘, ⌘/',
				AriALAbel: 'CommAnd+, CommAnd+/',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd+, cmd+/',
				isWYSIWYG: true,
				isChord: true,
				dispAtchPArts: ['metA+[CommA]', 'metA+[SlAsh]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Modifier only MetALeft+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: -1,
				code: 'MetALeft'
			},
			{
				lAbel: '⌘',
				AriALAbel: 'CommAnd',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: [null],
			}
		);
	});

	test('resolveKeyboArdEvent Modifier only MetARight+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: -1,
				code: 'MetARight'
			},
			{
				lAbel: '⌘',
				AriALAbel: 'CommAnd',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: [null],
			}
		);
	});
});

suite('keyboArdMApper - LINUX de_ch', () => {

	let mApper: MAcLinuxKeyboArdMApper;

	suiteSetup(Async () => {
		const _mApper = AwAit creAteKeyboArdMApper(fAlse, 'linux_de_ch', OperAtingSystem.Linux);
		mApper = _mApper;
	});

	test('mApping', () => {
		return AssertMApping(WRITE_FILE_IF_DIFFERENT, mApper, 'linux_de_ch.txt');
	});

	function AssertKeybindingTrAnslAtion(kb: number, expected: string | string[]): void {
		_AssertKeybindingTrAnslAtion(mApper, OperAtingSystem.Linux, kb, expected);
	}

	function _AssertResolveKeybinding(k: number, expected: IResolvedKeybinding[]): void {
		AssertResolveKeybinding(mApper, creAteKeybinding(k, OperAtingSystem.Linux)!, expected);
	}

	test('kb => hw', () => {
		// unchAnged
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.KEY_1, 'ctrl+Digit1');
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.KEY_B, 'ctrl+KeyB');
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_B, 'ctrl+shift+KeyB');
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_B, 'ctrl+shift+Alt+metA+KeyB');

		// flips Y And Z
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.KEY_Z, 'ctrl+KeyY');
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.KEY_Y, 'ctrl+KeyZ');

		// Ctrl+/
		AssertKeybindingTrAnslAtion(KeyMod.CtrlCmd | KeyCode.US_SLASH, 'ctrl+shift+Digit7');
	});

	test('resolveKeybinding Ctrl+A', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_A,
			[{
				lAbel: 'Ctrl+A',
				AriALAbel: 'Control+A',
				electronAccelerAtor: 'Ctrl+A',
				userSettingsLAbel: 'ctrl+A',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[KeyA]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+Z', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_Z,
			[{
				lAbel: 'Ctrl+Z',
				AriALAbel: 'Control+Z',
				electronAccelerAtor: 'Ctrl+Z',
				userSettingsLAbel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[KeyY]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Ctrl+[KeyY]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'KeyY'
			},
			{
				lAbel: 'Ctrl+Z',
				AriALAbel: 'Control+Z',
				electronAccelerAtor: 'Ctrl+Z',
				userSettingsLAbel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[KeyY]'],
			}
		);
	});

	test('resolveKeybinding Ctrl+]', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[]
		);
	});

	test('resolveKeyboArdEvent Ctrl+[BrAcketRight]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'BrAcketRight'
			},
			{
				lAbel: 'Ctrl+¨',
				AriALAbel: 'Control+¨',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+[BrAcketRight]',
				isWYSIWYG: fAlse,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[BrAcketRight]'],
			}
		);
	});

	test('resolveKeybinding Shift+]', () => {
		_AssertResolveKeybinding(
			KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				lAbel: 'Ctrl+Alt+0',
				AriALAbel: 'Control+Alt+0',
				electronAccelerAtor: 'Ctrl+Alt+0',
				userSettingsLAbel: 'ctrl+Alt+0',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+Alt+[Digit0]'],
			}, {
				lAbel: 'Ctrl+Alt+$',
				AriALAbel: 'Control+Alt+$',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+Alt+[BAckslAsh]',
				isWYSIWYG: fAlse,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+Alt+[BAckslAsh]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+/', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.US_SLASH,
			[{
				lAbel: 'Ctrl+Shift+7',
				AriALAbel: 'Control+Shift+7',
				electronAccelerAtor: 'Ctrl+Shift+7',
				userSettingsLAbel: 'ctrl+shift+7',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+shift+[Digit7]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+Shift+/', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SLASH,
			[{
				lAbel: 'Ctrl+Shift+\'',
				AriALAbel: 'Control+Shift+\'',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+shift+[Minus]',
				isWYSIWYG: fAlse,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+shift+[Minus]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+K Ctrl+\\', () => {
		_AssertResolveKeybinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH),
			[]
		);
	});

	test('resolveKeybinding Ctrl+K Ctrl+=', () => {
		_AssertResolveKeybinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[{
				lAbel: 'Ctrl+K Ctrl+Shift+0',
				AriALAbel: 'Control+K Control+Shift+0',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+k ctrl+shift+0',
				isWYSIWYG: true,
				isChord: true,
				dispAtchPArts: ['ctrl+[KeyK]', 'ctrl+shift+[Digit0]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+DownArrow', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.DownArrow,
			[{
				lAbel: 'Ctrl+DownArrow',
				AriALAbel: 'Control+DownArrow',
				electronAccelerAtor: 'Ctrl+Down',
				userSettingsLAbel: 'ctrl+down',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[ArrowDown]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+NUMPAD_0', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.NUMPAD_0,
			[{
				lAbel: 'Ctrl+NumPAd0',
				AriALAbel: 'Control+NumPAd0',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+numpAd0',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[NumpAd0]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+Home', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.Home,
			[{
				lAbel: 'Ctrl+Home',
				AriALAbel: 'Control+Home',
				electronAccelerAtor: 'Ctrl+Home',
				userSettingsLAbel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[Home]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Ctrl+[Home]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'Home'
			},
			{
				lAbel: 'Ctrl+Home',
				AriALAbel: 'Control+Home',
				electronAccelerAtor: 'Ctrl+Home',
				userSettingsLAbel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[Home]'],
			}
		);
	});

	test('resolveKeyboArdEvent Ctrl+[KeyX]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'KeyX'
			},
			{
				lAbel: 'Ctrl+X',
				AriALAbel: 'Control+X',
				electronAccelerAtor: 'Ctrl+X',
				userSettingsLAbel: 'ctrl+x',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[KeyX]'],
			}
		);
	});

	test('resolveUserBinding Ctrl+[CommA] Ctrl+/', () => {
		AssertResolveUserBinding(
			mApper, [
			new ScAnCodeBinding(true, fAlse, fAlse, fAlse, ScAnCode.CommA),
			new SimpleKeybinding(true, fAlse, fAlse, fAlse, KeyCode.US_SLASH),
		],
			[{
				lAbel: 'Ctrl+, Ctrl+Shift+7',
				AriALAbel: 'Control+, Control+Shift+7',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+[CommA] ctrl+shift+7',
				isWYSIWYG: fAlse,
				isChord: true,
				dispAtchPArts: ['ctrl+[CommA]', 'ctrl+shift+[Digit7]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Modifier only ControlLeft+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'ControlLeft'
			},
			{
				lAbel: 'Ctrl',
				AriALAbel: 'Control',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: [null],
			}
		);
	});

	test('resolveKeyboArdEvent Modifier only ControlRight+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'ControlRight'
			},
			{
				lAbel: 'Ctrl',
				AriALAbel: 'Control',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: [null],
			}
		);
	});
});

suite('keyboArdMApper - LINUX en_us', () => {

	let mApper: MAcLinuxKeyboArdMApper;

	suiteSetup(Async () => {
		const _mApper = AwAit creAteKeyboArdMApper(true, 'linux_en_us', OperAtingSystem.Linux);
		mApper = _mApper;
	});

	test('mApping', () => {
		return AssertMApping(WRITE_FILE_IF_DIFFERENT, mApper, 'linux_en_us.txt');
	});

	function _AssertResolveKeybinding(k: number, expected: IResolvedKeybinding[]): void {
		AssertResolveKeybinding(mApper, creAteKeybinding(k, OperAtingSystem.Linux)!, expected);
	}

	test('resolveKeybinding Ctrl+A', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_A,
			[{
				lAbel: 'Ctrl+A',
				AriALAbel: 'Control+A',
				electronAccelerAtor: 'Ctrl+A',
				userSettingsLAbel: 'ctrl+A',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[KeyA]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+Z', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_Z,
			[{
				lAbel: 'Ctrl+Z',
				AriALAbel: 'Control+Z',
				electronAccelerAtor: 'Ctrl+Z',
				userSettingsLAbel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[KeyZ]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Ctrl+[KeyZ]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'KeyZ'
			},
			{
				lAbel: 'Ctrl+Z',
				AriALAbel: 'Control+Z',
				electronAccelerAtor: 'Ctrl+Z',
				userSettingsLAbel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[KeyZ]'],
			}
		);
	});

	test('resolveKeybinding Ctrl+]', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				lAbel: 'Ctrl+]',
				AriALAbel: 'Control+]',
				electronAccelerAtor: 'Ctrl+]',
				userSettingsLAbel: 'ctrl+]',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[BrAcketRight]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Ctrl+[BrAcketRight]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'BrAcketRight'
			},
			{
				lAbel: 'Ctrl+]',
				AriALAbel: 'Control+]',
				electronAccelerAtor: 'Ctrl+]',
				userSettingsLAbel: 'ctrl+]',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[BrAcketRight]'],
			}
		);
	});

	test('resolveKeybinding Shift+]', () => {
		_AssertResolveKeybinding(
			KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
			[{
				lAbel: 'Shift+]',
				AriALAbel: 'Shift+]',
				electronAccelerAtor: 'Shift+]',
				userSettingsLAbel: 'shift+]',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['shift+[BrAcketRight]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+/', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.US_SLASH,
			[{
				lAbel: 'Ctrl+/',
				AriALAbel: 'Control+/',
				electronAccelerAtor: 'Ctrl+/',
				userSettingsLAbel: 'ctrl+/',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[SlAsh]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+Shift+/', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SLASH,
			[{
				lAbel: 'Ctrl+Shift+/',
				AriALAbel: 'Control+Shift+/',
				electronAccelerAtor: 'Ctrl+Shift+/',
				userSettingsLAbel: 'ctrl+shift+/',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+shift+[SlAsh]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+K Ctrl+\\', () => {
		_AssertResolveKeybinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH),
			[{
				lAbel: 'Ctrl+K Ctrl+\\',
				AriALAbel: 'Control+K Control+\\',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+k ctrl+\\',
				isWYSIWYG: true,
				isChord: true,
				dispAtchPArts: ['ctrl+[KeyK]', 'ctrl+[BAckslAsh]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+K Ctrl+=', () => {
		_AssertResolveKeybinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[{
				lAbel: 'Ctrl+K Ctrl+=',
				AriALAbel: 'Control+K Control+=',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+k ctrl+=',
				isWYSIWYG: true,
				isChord: true,
				dispAtchPArts: ['ctrl+[KeyK]', 'ctrl+[EquAl]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+DownArrow', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.DownArrow,
			[{
				lAbel: 'Ctrl+DownArrow',
				AriALAbel: 'Control+DownArrow',
				electronAccelerAtor: 'Ctrl+Down',
				userSettingsLAbel: 'ctrl+down',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[ArrowDown]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+NUMPAD_0', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.NUMPAD_0,
			[{
				lAbel: 'Ctrl+NumPAd0',
				AriALAbel: 'Control+NumPAd0',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+numpAd0',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[NumpAd0]'],
			}]
		);
	});

	test('resolveKeybinding Ctrl+Home', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.Home,
			[{
				lAbel: 'Ctrl+Home',
				AriALAbel: 'Control+Home',
				electronAccelerAtor: 'Ctrl+Home',
				userSettingsLAbel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[Home]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Ctrl+[Home]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'Home'
			},
			{
				lAbel: 'Ctrl+Home',
				AriALAbel: 'Control+Home',
				electronAccelerAtor: 'Ctrl+Home',
				userSettingsLAbel: 'ctrl+home',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[Home]'],
			}
		);
	});

	test('resolveKeybinding Ctrl+Shift+,', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_COMMA,
			[{
				lAbel: 'Ctrl+Shift+,',
				AriALAbel: 'Control+Shift+,',
				electronAccelerAtor: 'Ctrl+Shift+,',
				userSettingsLAbel: 'ctrl+shift+,',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+shift+[CommA]'],
			}, {
				lAbel: 'Ctrl+<',
				AriALAbel: 'Control+<',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+[IntlBAckslAsh]',
				isWYSIWYG: fAlse,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[IntlBAckslAsh]'],
			}]
		);
	});

	test('issue #23393: resolveKeybinding Ctrl+Enter', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.Enter,
			[{
				lAbel: 'Ctrl+Enter',
				AriALAbel: 'Control+Enter',
				electronAccelerAtor: 'Ctrl+Enter',
				userSettingsLAbel: 'ctrl+enter',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[Enter]'],
			}]
		);
	});

	test('issue #23393: resolveKeyboArdEvent Ctrl+[NumpAdEnter]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'NumpAdEnter'
			},
			{
				lAbel: 'Ctrl+Enter',
				AriALAbel: 'Control+Enter',
				electronAccelerAtor: 'Ctrl+Enter',
				userSettingsLAbel: 'ctrl+enter',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[Enter]'],
			}
		);
	});

	test('resolveUserBinding Ctrl+[CommA] Ctrl+/', () => {
		AssertResolveUserBinding(
			mApper, [
			new ScAnCodeBinding(true, fAlse, fAlse, fAlse, ScAnCode.CommA),
			new SimpleKeybinding(true, fAlse, fAlse, fAlse, KeyCode.US_SLASH),
		],
			[{
				lAbel: 'Ctrl+, Ctrl+/',
				AriALAbel: 'Control+, Control+/',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+, ctrl+/',
				isWYSIWYG: true,
				isChord: true,
				dispAtchPArts: ['ctrl+[CommA]', 'ctrl+[SlAsh]'],
			}]
		);
	});

	test('resolveUserBinding Ctrl+[CommA]', () => {
		AssertResolveUserBinding(
			mApper, [
			new ScAnCodeBinding(true, fAlse, fAlse, fAlse, ScAnCode.CommA)
		],
			[{
				lAbel: 'Ctrl+,',
				AriALAbel: 'Control+,',
				electronAccelerAtor: 'Ctrl+,',
				userSettingsLAbel: 'ctrl+,',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[CommA]'],
			}]
		);
	});

	test('resolveKeyboArdEvent Modifier only ControlLeft+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'ControlLeft'
			},
			{
				lAbel: 'Ctrl',
				AriALAbel: 'Control',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: [null],
			}
		);
	});

	test('resolveKeyboArdEvent Modifier only ControlRight+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'ControlRight'
			},
			{
				lAbel: 'Ctrl',
				AriALAbel: 'Control',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: [null],
			}
		);
	});
});

suite('keyboArdMApper', () => {

	test('issue #23706: Linux UK lAyout: Ctrl + Apostrophe Also toggles terminAl', () => {
		let mApper = new MAcLinuxKeyboArdMApper(fAlse, {
			'BAckquote': {
				'vAlue': '`',
				'withShift': '¬',
				'withAltGr': '|',
				'withShiftAltGr': '|'
			}
		}, OperAtingSystem.Linux);

		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: -1,
				code: 'BAckquote'
			},
			{
				lAbel: 'Ctrl+`',
				AriALAbel: 'Control+`',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+`',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[BAckquote]'],
			}
		);
	});

	test('issue #24064: NumLock/NumPAd keys stopped working in 1.11 on Linux', () => {
		let mApper = new MAcLinuxKeyboArdMApper(fAlse, {}, OperAtingSystem.Linux);

		function AssertNumpAdKeyboArdEvent(keyCode: KeyCode, code: string, lAbel: string, electronAccelerAtor: string | null, userSettingsLAbel: string, dispAtch: string): void {
			AssertResolveKeyboArdEvent(
				mApper,
				{
					_stAndArdKeyboArdEventBrAnd: true,
					ctrlKey: fAlse,
					shiftKey: fAlse,
					AltKey: fAlse,
					metAKey: fAlse,
					keyCode: keyCode,
					code: code
				},
				{
					lAbel: lAbel,
					AriALAbel: lAbel,
					electronAccelerAtor: electronAccelerAtor,
					userSettingsLAbel: userSettingsLAbel,
					isWYSIWYG: true,
					isChord: fAlse,
					dispAtchPArts: [dispAtch],
				}
			);
		}

		AssertNumpAdKeyboArdEvent(KeyCode.End, 'NumpAd1', 'End', 'End', 'end', '[End]');
		AssertNumpAdKeyboArdEvent(KeyCode.DownArrow, 'NumpAd2', 'DownArrow', 'Down', 'down', '[ArrowDown]');
		AssertNumpAdKeyboArdEvent(KeyCode.PAgeDown, 'NumpAd3', 'PAgeDown', 'PAgeDown', 'pAgedown', '[PAgeDown]');
		AssertNumpAdKeyboArdEvent(KeyCode.LeftArrow, 'NumpAd4', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
		AssertNumpAdKeyboArdEvent(KeyCode.Unknown, 'NumpAd5', 'NumPAd5', null!, 'numpAd5', '[NumpAd5]');
		AssertNumpAdKeyboArdEvent(KeyCode.RightArrow, 'NumpAd6', 'RightArrow', 'Right', 'right', '[ArrowRight]');
		AssertNumpAdKeyboArdEvent(KeyCode.Home, 'NumpAd7', 'Home', 'Home', 'home', '[Home]');
		AssertNumpAdKeyboArdEvent(KeyCode.UpArrow, 'NumpAd8', 'UpArrow', 'Up', 'up', '[ArrowUp]');
		AssertNumpAdKeyboArdEvent(KeyCode.PAgeUp, 'NumpAd9', 'PAgeUp', 'PAgeUp', 'pAgeup', '[PAgeUp]');
		AssertNumpAdKeyboArdEvent(KeyCode.Insert, 'NumpAd0', 'Insert', 'Insert', 'insert', '[Insert]');
		AssertNumpAdKeyboArdEvent(KeyCode.Delete, 'NumpAdDecimAl', 'Delete', 'Delete', 'delete', '[Delete]');
	});

	test('issue #24107: Delete, Insert, Home, End, PgUp, PgDn, And Arrow keys no longer work editor in 1.11', () => {
		let mApper = new MAcLinuxKeyboArdMApper(fAlse, {}, OperAtingSystem.Linux);

		function AssertKeyboArdEvent(keyCode: KeyCode, code: string, lAbel: string, electronAccelerAtor: string, userSettingsLAbel: string, dispAtch: string): void {
			AssertResolveKeyboArdEvent(
				mApper,
				{
					_stAndArdKeyboArdEventBrAnd: true,
					ctrlKey: fAlse,
					shiftKey: fAlse,
					AltKey: fAlse,
					metAKey: fAlse,
					keyCode: keyCode,
					code: code
				},
				{
					lAbel: lAbel,
					AriALAbel: lAbel,
					electronAccelerAtor: electronAccelerAtor,
					userSettingsLAbel: userSettingsLAbel,
					isWYSIWYG: true,
					isChord: fAlse,
					dispAtchPArts: [dispAtch],
				}
			);
		}

		// https://github.com/microsoft/vscode/issues/24107#issuecomment-292318497
		AssertKeyboArdEvent(KeyCode.UpArrow, 'LAng3', 'UpArrow', 'Up', 'up', '[ArrowUp]');
		AssertKeyboArdEvent(KeyCode.DownArrow, 'NumpAdEnter', 'DownArrow', 'Down', 'down', '[ArrowDown]');
		AssertKeyboArdEvent(KeyCode.LeftArrow, 'Convert', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
		AssertKeyboArdEvent(KeyCode.RightArrow, 'NonConvert', 'RightArrow', 'Right', 'right', '[ArrowRight]');
		AssertKeyboArdEvent(KeyCode.Delete, 'PrintScreen', 'Delete', 'Delete', 'delete', '[Delete]');
		AssertKeyboArdEvent(KeyCode.Insert, 'NumpAdDivide', 'Insert', 'Insert', 'insert', '[Insert]');
		AssertKeyboArdEvent(KeyCode.End, 'Unknown', 'End', 'End', 'end', '[End]');
		AssertKeyboArdEvent(KeyCode.Home, 'IntlRo', 'Home', 'Home', 'home', '[Home]');
		AssertKeyboArdEvent(KeyCode.PAgeDown, 'ControlRight', 'PAgeDown', 'PAgeDown', 'pAgedown', '[PAgeDown]');
		AssertKeyboArdEvent(KeyCode.PAgeUp, 'LAng4', 'PAgeUp', 'PAgeUp', 'pAgeup', '[PAgeUp]');

		// https://github.com/microsoft/vscode/issues/24107#issuecomment-292323924
		AssertKeyboArdEvent(KeyCode.PAgeDown, 'ControlRight', 'PAgeDown', 'PAgeDown', 'pAgedown', '[PAgeDown]');
		AssertKeyboArdEvent(KeyCode.PAgeUp, 'LAng4', 'PAgeUp', 'PAgeUp', 'pAgeup', '[PAgeUp]');
		AssertKeyboArdEvent(KeyCode.End, '', 'End', 'End', 'end', '[End]');
		AssertKeyboArdEvent(KeyCode.Home, 'IntlRo', 'Home', 'Home', 'home', '[Home]');
		AssertKeyboArdEvent(KeyCode.Delete, 'PrintScreen', 'Delete', 'Delete', 'delete', '[Delete]');
		AssertKeyboArdEvent(KeyCode.Insert, 'NumpAdDivide', 'Insert', 'Insert', 'insert', '[Insert]');
		AssertKeyboArdEvent(KeyCode.RightArrow, 'NonConvert', 'RightArrow', 'Right', 'right', '[ArrowRight]');
		AssertKeyboArdEvent(KeyCode.LeftArrow, 'Convert', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
		AssertKeyboArdEvent(KeyCode.DownArrow, 'NumpAdEnter', 'DownArrow', 'Down', 'down', '[ArrowDown]');
		AssertKeyboArdEvent(KeyCode.UpArrow, 'LAng3', 'UpArrow', 'Up', 'up', '[ArrowUp]');
	});
});

suite('keyboArdMApper - LINUX ru', () => {

	let mApper: MAcLinuxKeyboArdMApper;

	suiteSetup(Async () => {
		const _mApper = AwAit creAteKeyboArdMApper(fAlse, 'linux_ru', OperAtingSystem.Linux);
		mApper = _mApper;
	});

	test('mApping', () => {
		return AssertMApping(WRITE_FILE_IF_DIFFERENT, mApper, 'linux_ru.txt');
	});

	function _AssertResolveKeybinding(k: number, expected: IResolvedKeybinding[]): void {
		AssertResolveKeybinding(mApper, creAteKeybinding(k, OperAtingSystem.Linux)!, expected);
	}

	test('resolveKeybinding Ctrl+S', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_S,
			[{
				lAbel: 'Ctrl+S',
				AriALAbel: 'Control+S',
				electronAccelerAtor: 'Ctrl+S',
				userSettingsLAbel: 'ctrl+s',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+[KeyS]'],
			}]
		);
	});
});

suite('keyboArdMApper - LINUX en_uk', () => {

	let mApper: MAcLinuxKeyboArdMApper;

	suiteSetup(Async () => {
		const _mApper = AwAit creAteKeyboArdMApper(fAlse, 'linux_en_uk', OperAtingSystem.Linux);
		mApper = _mApper;
	});

	test('mApping', () => {
		return AssertMApping(WRITE_FILE_IF_DIFFERENT, mApper, 'linux_en_uk.txt');
	});

	test('issue #24522: resolveKeyboArdEvent Ctrl+Alt+[Minus]', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: true,
				metAKey: fAlse,
				keyCode: -1,
				code: 'Minus'
			},
			{
				lAbel: 'Ctrl+Alt+-',
				AriALAbel: 'Control+Alt+-',
				electronAccelerAtor: null,
				userSettingsLAbel: 'ctrl+Alt+[Minus]',
				isWYSIWYG: fAlse,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+Alt+[Minus]'],
			}
		);
	});
});

suite('keyboArdMApper - MAC zh_hAnt', () => {

	let mApper: MAcLinuxKeyboArdMApper;

	suiteSetup(Async () => {
		const _mApper = AwAit creAteKeyboArdMApper(fAlse, 'mAc_zh_hAnt', OperAtingSystem.MAcintosh);
		mApper = _mApper;
	});

	test('mApping', () => {
		return AssertMApping(WRITE_FILE_IF_DIFFERENT, mApper, 'mAc_zh_hAnt.txt');
	});

	function _AssertResolveKeybinding(k: number, expected: IResolvedKeybinding[]): void {
		AssertResolveKeybinding(mApper, creAteKeybinding(k, OperAtingSystem.MAcintosh)!, expected);
	}

	test('issue #28237 resolveKeybinding Cmd+C', () => {
		_AssertResolveKeybinding(
			KeyMod.CtrlCmd | KeyCode.KEY_C,
			[{
				lAbel: '⌘C',
				AriALAbel: 'CommAnd+C',
				electronAccelerAtor: 'Cmd+C',
				userSettingsLAbel: 'cmd+c',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+[KeyC]'],
			}]
		);
	});
});

function _AssertKeybindingTrAnslAtion(mApper: MAcLinuxKeyboArdMApper, OS: OperAtingSystem, kb: number, _expected: string | string[]): void {
	let expected: string[];
	if (typeof _expected === 'string') {
		expected = [_expected];
	} else if (ArrAy.isArrAy(_expected)) {
		expected = _expected;
	} else {
		expected = [];
	}

	const runtimeKeybinding = creAteSimpleKeybinding(kb, OS);

	const keybindingLAbel = new USLAyoutResolvedKeybinding(runtimeKeybinding.toChord(), OS).getUserSettingsLAbel();

	const ActuAlHArdwAreKeypresses = mApper.simpleKeybindingToScAnCodeBinding(runtimeKeybinding);
	if (ActuAlHArdwAreKeypresses.length === 0) {
		Assert.deepEquAl([], expected, `simpleKeybindingToHArdwAreKeypress -- "${keybindingLAbel}" -- ActuAl: "[]" -- expected: "${expected}"`);
		return;
	}

	const ActuAl = ActuAlHArdwAreKeypresses
		.mAp(k => UserSettingsLAbelProvider.toLAbel(OS, [k], (keybinding) => ScAnCodeUtils.toString(keybinding.scAnCode)));
	Assert.deepEquAl(ActuAl, expected, `simpleKeybindingToHArdwAreKeypress -- "${keybindingLAbel}" -- ActuAl: "${ActuAl}" -- expected: "${expected}"`);
}
