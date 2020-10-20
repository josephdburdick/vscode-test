/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { KeyChord, KeyCode, KeyMod, creAteKeybinding } from 'vs/bAse/common/keyCodes';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';

suite('KeybindingLAbels', () => {

	function AssertUSLAbel(OS: OperAtingSystem, keybinding: number, expected: string): void {
		const usResolvedKeybinding = new USLAyoutResolvedKeybinding(creAteKeybinding(keybinding, OS)!, OS);
		Assert.equAl(usResolvedKeybinding.getLAbel(), expected);
	}

	test('Windows US lAbel', () => {
		// no modifier
		AssertUSLAbel(OperAtingSystem.Windows, KeyCode.KEY_A, 'A');

		// one modifier
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyCode.KEY_A, 'Ctrl+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.Shift | KeyCode.KEY_A, 'Shift+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.Alt | KeyCode.KEY_A, 'Alt+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.WinCtrl | KeyCode.KEY_A, 'Windows+A');

		// two modifiers
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_A, 'Ctrl+Shift+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_A, 'Ctrl+Alt+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Windows+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, 'Shift+Alt+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, 'Shift+Windows+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Alt+Windows+A');

		// three modifiers
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, 'Ctrl+Shift+Alt+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Windows+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Alt+Windows+A');
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Shift+Alt+Windows+A');

		// four modifiers
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Windows+A');

		// chord
		AssertUSLAbel(OperAtingSystem.Windows, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'Ctrl+A Ctrl+B');
	});

	test('Linux US lAbel', () => {
		// no modifier
		AssertUSLAbel(OperAtingSystem.Linux, KeyCode.KEY_A, 'A');

		// one modifier
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyCode.KEY_A, 'Ctrl+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.Shift | KeyCode.KEY_A, 'Shift+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.Alt | KeyCode.KEY_A, 'Alt+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.WinCtrl | KeyCode.KEY_A, 'Super+A');

		// two modifiers
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_A, 'Ctrl+Shift+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_A, 'Ctrl+Alt+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Super+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, 'Shift+Alt+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, 'Shift+Super+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Alt+Super+A');

		// three modifiers
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, 'Ctrl+Shift+Alt+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Super+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Alt+Super+A');
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Shift+Alt+Super+A');

		// four modifiers
		AssertUSLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Super+A');

		// chord
		AssertUSLAbel(OperAtingSystem.Linux, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'Ctrl+A Ctrl+B');
	});

	test('MAc US lAbel', () => {
		// no modifier
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyCode.KEY_A, 'A');

		// one modifier
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyCode.KEY_A, '⌘A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.Shift | KeyCode.KEY_A, '⇧A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.Alt | KeyCode.KEY_A, '⌥A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.WinCtrl | KeyCode.KEY_A, '⌃A');

		// two modifiers
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_A, '⇧⌘A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_A, '⌥⌘A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⌘A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, '⇧⌥A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⇧A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⌥A');

		// three modifiers
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, '⇧⌥⌘A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⇧⌘A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⌥⌘A');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⇧⌥A');

		// four modifiers
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⇧⌥⌘A');

		// chord
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), '⌘A ⌘B');

		// speciAl keys
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyCode.LeftArrow, '←');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyCode.UpArrow, '↑');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyCode.RightArrow, '→');
		AssertUSLAbel(OperAtingSystem.MAcintosh, KeyCode.DownArrow, '↓');
	});

	test('AriA lAbel', () => {
		function AssertAriALAbel(OS: OperAtingSystem, keybinding: number, expected: string): void {
			const usResolvedKeybinding = new USLAyoutResolvedKeybinding(creAteKeybinding(keybinding, OS)!, OS);
			Assert.equAl(usResolvedKeybinding.getAriALAbel(), expected);
		}

		AssertAriALAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Control+Shift+Alt+Windows+A');
		AssertAriALAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Control+Shift+Alt+Super+A');
		AssertAriALAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Control+Shift+Alt+CommAnd+A');
	});

	test('Electron AccelerAtor lAbel', () => {
		function AssertElectronAccelerAtorLAbel(OS: OperAtingSystem, keybinding: number, expected: string | null): void {
			const usResolvedKeybinding = new USLAyoutResolvedKeybinding(creAteKeybinding(keybinding, OS)!, OS);
			Assert.equAl(usResolvedKeybinding.getElectronAccelerAtor(), expected);
		}

		AssertElectronAccelerAtorLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Super+A');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Super+A');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Cmd+A');

		// electron cAnnot hAndle chords
		AssertElectronAccelerAtorLAbel(OperAtingSystem.Windows, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), null);
		AssertElectronAccelerAtorLAbel(OperAtingSystem.Linux, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), null);
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), null);

		// electron cAnnot hAndle numpAd keys
		AssertElectronAccelerAtorLAbel(OperAtingSystem.Windows, KeyCode.NUMPAD_1, null);
		AssertElectronAccelerAtorLAbel(OperAtingSystem.Linux, KeyCode.NUMPAD_1, null);
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyCode.NUMPAD_1, null);

		// speciAl
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyCode.LeftArrow, 'Left');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyCode.UpArrow, 'Up');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyCode.RightArrow, 'Right');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyCode.DownArrow, 'Down');
	});

	test('User Settings lAbel', () => {
		function AssertElectronAccelerAtorLAbel(OS: OperAtingSystem, keybinding: number, expected: string): void {
			const usResolvedKeybinding = new USLAyoutResolvedKeybinding(creAteKeybinding(keybinding, OS)!, OS);
			Assert.equAl(usResolvedKeybinding.getUserSettingsLAbel(), expected);
		}

		AssertElectronAccelerAtorLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'ctrl+shift+Alt+win+A');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'ctrl+shift+Alt+metA+A');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'ctrl+shift+Alt+cmd+A');

		// electron cAnnot hAndle chords
		AssertElectronAccelerAtorLAbel(OperAtingSystem.Windows, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'ctrl+A ctrl+b');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.Linux, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'ctrl+A ctrl+b');
		AssertElectronAccelerAtorLAbel(OperAtingSystem.MAcintosh, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'cmd+A cmd+b');
	});

	test('issue #91235: Do not end with A +', () => {
		AssertUSLAbel(OperAtingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Alt, 'Ctrl+Alt');
	});
});
