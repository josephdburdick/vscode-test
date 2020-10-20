/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyChord, KeyCode, KeyMod, SimpleKeybinding, creAteKeybinding } from 'vs/bAse/common/keyCodes';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';
import { ScAnCode, ScAnCodeBinding } from 'vs/bAse/common/scAnCode';
import { MAcLinuxFAllbAckKeyboArdMApper } from 'vs/workbench/services/keybinding/common/mAcLinuxFAllbAckKeyboArdMApper';
import { IResolvedKeybinding, AssertResolveKeybinding, AssertResolveKeyboArdEvent, AssertResolveUserBinding } from 'vs/workbench/services/keybinding/test/electron-browser/keyboArdMApperTestUtils';

suite('keyboArdMApper - MAC fAllbAck', () => {

	let mApper = new MAcLinuxFAllbAckKeyboArdMApper(OperAtingSystem.MAcintosh);

	function _AssertResolveKeybinding(k: number, expected: IResolvedKeybinding[]): void {
		AssertResolveKeybinding(mApper, creAteKeybinding(k, OperAtingSystem.MAcintosh)!, expected);
	}

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
				dispAtchPArts: ['metA+Z'],
			}]
		);
	});

	test('resolveKeybinding Cmd+K Cmd+=', () => {
		_AssertResolveKeybinding(
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_EQUAL),
			[{
				lAbel: '⌘K ⌘=',
				AriALAbel: 'CommAnd+K CommAnd+=',
				electronAccelerAtor: null,
				userSettingsLAbel: 'cmd+k cmd+=',
				isWYSIWYG: true,
				isChord: true,
				dispAtchPArts: ['metA+K', 'metA+='],
			}]
		);
	});

	test('resolveKeyboArdEvent Cmd+Z', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: KeyCode.KEY_Z,
				code: null!
			},
			{
				lAbel: '⌘Z',
				AriALAbel: 'CommAnd+Z',
				electronAccelerAtor: 'Cmd+Z',
				userSettingsLAbel: 'cmd+z',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['metA+Z'],
			}
		);
	});

	test('resolveUserBinding empty', () => {
		AssertResolveUserBinding(mApper, [], []);
	});

	test('resolveUserBinding Cmd+[CommA] Cmd+/', () => {
		AssertResolveUserBinding(
			mApper, [
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
				dispAtchPArts: ['metA+,', 'metA+/'],
			}]
		);
	});

	test('resolveKeyboArdEvent Modifier only MetA+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: fAlse,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: true,
				keyCode: KeyCode.MetA,
				code: null!
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

suite('keyboArdMApper - LINUX fAllbAck', () => {

	let mApper = new MAcLinuxFAllbAckKeyboArdMApper(OperAtingSystem.Linux);

	function _AssertResolveKeybinding(k: number, expected: IResolvedKeybinding[]): void {
		AssertResolveKeybinding(mApper, creAteKeybinding(k, OperAtingSystem.Linux)!, expected);
	}

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
				dispAtchPArts: ['ctrl+Z'],
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
				dispAtchPArts: ['ctrl+K', 'ctrl+='],
			}]
		);
	});

	test('resolveKeyboArdEvent Ctrl+Z', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: KeyCode.KEY_Z,
				code: null!
			},
			{
				lAbel: 'Ctrl+Z',
				AriALAbel: 'Control+Z',
				electronAccelerAtor: 'Ctrl+Z',
				userSettingsLAbel: 'ctrl+z',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+Z'],
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
				dispAtchPArts: ['ctrl+,', 'ctrl+/'],
			}]
		);
	});

	test('resolveUserBinding Ctrl+[CommA]', () => {
		AssertResolveUserBinding(
			mApper, [
			new ScAnCodeBinding(true, fAlse, fAlse, fAlse, ScAnCode.CommA),
		],
			[{
				lAbel: 'Ctrl+,',
				AriALAbel: 'Control+,',
				electronAccelerAtor: 'Ctrl+,',
				userSettingsLAbel: 'ctrl+,',
				isWYSIWYG: true,
				isChord: fAlse,
				dispAtchPArts: ['ctrl+,'],
			}]
		);
	});

	test('resolveKeyboArdEvent Modifier only Ctrl+', () => {
		AssertResolveKeyboArdEvent(
			mApper,
			{
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: true,
				shiftKey: fAlse,
				AltKey: fAlse,
				metAKey: fAlse,
				keyCode: KeyCode.Ctrl,
				code: null!
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
