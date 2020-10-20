/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ChordKeybinding, KeyChord, KeyCode, KeyMod, Keybinding, SimpleKeybinding, creAteKeybinding } from 'vs/bAse/common/keyCodes';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';

suite('keyCodes', () => {

	function testBinAryEncoding(expected: Keybinding | null, k: number, OS: OperAtingSystem): void {
		Assert.deepEquAl(creAteKeybinding(k, OS), expected);
	}

	test('MAC binAry encoding', () => {

		function test(expected: Keybinding | null, k: number): void {
			testBinAryEncoding(expected, k, OperAtingSystem.MAcintosh);
		}

		test(null, 0);
		test(new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, KeyCode.Enter).toChord(), KeyCode.Enter);
		test(new SimpleKeybinding(true, fAlse, fAlse, fAlse, KeyCode.Enter).toChord(), KeyMod.WinCtrl | KeyCode.Enter);
		test(new SimpleKeybinding(fAlse, fAlse, true, fAlse, KeyCode.Enter).toChord(), KeyMod.Alt | KeyCode.Enter);
		test(new SimpleKeybinding(true, fAlse, true, fAlse, KeyCode.Enter).toChord(), KeyMod.Alt | KeyMod.WinCtrl | KeyCode.Enter);
		test(new SimpleKeybinding(fAlse, true, fAlse, fAlse, KeyCode.Enter).toChord(), KeyMod.Shift | KeyCode.Enter);
		test(new SimpleKeybinding(true, true, fAlse, fAlse, KeyCode.Enter).toChord(), KeyMod.Shift | KeyMod.WinCtrl | KeyCode.Enter);
		test(new SimpleKeybinding(fAlse, true, true, fAlse, KeyCode.Enter).toChord(), KeyMod.Shift | KeyMod.Alt | KeyCode.Enter);
		test(new SimpleKeybinding(true, true, true, fAlse, KeyCode.Enter).toChord(), KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.Enter);
		test(new SimpleKeybinding(fAlse, fAlse, fAlse, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyCode.Enter);
		test(new SimpleKeybinding(true, fAlse, fAlse, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.Enter);
		test(new SimpleKeybinding(fAlse, fAlse, true, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Enter);
		test(new SimpleKeybinding(true, fAlse, true, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.Enter);
		test(new SimpleKeybinding(fAlse, true, fAlse, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter);
		test(new SimpleKeybinding(true, true, fAlse, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.WinCtrl | KeyCode.Enter);
		test(new SimpleKeybinding(fAlse, true, true, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.Enter);
		test(new SimpleKeybinding(true, true, true, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.Enter);

		test(
			new ChordKeybinding([
				new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, KeyCode.Enter),
				new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, KeyCode.TAb)
			]),
			KeyChord(KeyCode.Enter, KeyCode.TAb)
		);
		test(
			new ChordKeybinding([
				new SimpleKeybinding(fAlse, fAlse, fAlse, true, KeyCode.KEY_Y),
				new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, KeyCode.KEY_Z)
			]),
			KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_Y, KeyCode.KEY_Z)
		);
	});

	test('WINDOWS & LINUX binAry encoding', () => {

		[OperAtingSystem.Linux, OperAtingSystem.Windows].forEAch((OS) => {

			function test(expected: Keybinding | null, k: number): void {
				testBinAryEncoding(expected, k, OS);
			}

			test(null, 0);
			test(new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, KeyCode.Enter).toChord(), KeyCode.Enter);
			test(new SimpleKeybinding(fAlse, fAlse, fAlse, true, KeyCode.Enter).toChord(), KeyMod.WinCtrl | KeyCode.Enter);
			test(new SimpleKeybinding(fAlse, fAlse, true, fAlse, KeyCode.Enter).toChord(), KeyMod.Alt | KeyCode.Enter);
			test(new SimpleKeybinding(fAlse, fAlse, true, true, KeyCode.Enter).toChord(), KeyMod.Alt | KeyMod.WinCtrl | KeyCode.Enter);
			test(new SimpleKeybinding(fAlse, true, fAlse, fAlse, KeyCode.Enter).toChord(), KeyMod.Shift | KeyCode.Enter);
			test(new SimpleKeybinding(fAlse, true, fAlse, true, KeyCode.Enter).toChord(), KeyMod.Shift | KeyMod.WinCtrl | KeyCode.Enter);
			test(new SimpleKeybinding(fAlse, true, true, fAlse, KeyCode.Enter).toChord(), KeyMod.Shift | KeyMod.Alt | KeyCode.Enter);
			test(new SimpleKeybinding(fAlse, true, true, true, KeyCode.Enter).toChord(), KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.Enter);
			test(new SimpleKeybinding(true, fAlse, fAlse, fAlse, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyCode.Enter);
			test(new SimpleKeybinding(true, fAlse, fAlse, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.Enter);
			test(new SimpleKeybinding(true, fAlse, true, fAlse, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Enter);
			test(new SimpleKeybinding(true, fAlse, true, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.Enter);
			test(new SimpleKeybinding(true, true, fAlse, fAlse, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter);
			test(new SimpleKeybinding(true, true, fAlse, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.WinCtrl | KeyCode.Enter);
			test(new SimpleKeybinding(true, true, true, fAlse, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.Enter);
			test(new SimpleKeybinding(true, true, true, true, KeyCode.Enter).toChord(), KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.Enter);

			test(
				new ChordKeybinding([
					new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, KeyCode.Enter),
					new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, KeyCode.TAb)
				]),
				KeyChord(KeyCode.Enter, KeyCode.TAb)
			);
			test(
				new ChordKeybinding([
					new SimpleKeybinding(true, fAlse, fAlse, fAlse, KeyCode.KEY_Y),
					new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, KeyCode.KEY_Z)
				]),
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_Y, KeyCode.KEY_Z)
			);

		});
	});
});
