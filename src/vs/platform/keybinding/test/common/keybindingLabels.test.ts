/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { KeyChord, KeyCode, KeyMod, createKeyBinding } from 'vs/Base/common/keyCodes';
import { OperatingSystem } from 'vs/Base/common/platform';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';

suite('KeyBindingLaBels', () => {

	function assertUSLaBel(OS: OperatingSystem, keyBinding: numBer, expected: string): void {
		const usResolvedKeyBinding = new USLayoutResolvedKeyBinding(createKeyBinding(keyBinding, OS)!, OS);
		assert.equal(usResolvedKeyBinding.getLaBel(), expected);
	}

	test('Windows US laBel', () => {
		// no modifier
		assertUSLaBel(OperatingSystem.Windows, KeyCode.KEY_A, 'A');

		// one modifier
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyCode.KEY_A, 'Ctrl+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.Shift | KeyCode.KEY_A, 'Shift+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.Alt | KeyCode.KEY_A, 'Alt+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.WinCtrl | KeyCode.KEY_A, 'Windows+A');

		// two modifiers
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_A, 'Ctrl+Shift+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_A, 'Ctrl+Alt+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Windows+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, 'Shift+Alt+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, 'Shift+Windows+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Alt+Windows+A');

		// three modifiers
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, 'Ctrl+Shift+Alt+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Windows+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Alt+Windows+A');
		assertUSLaBel(OperatingSystem.Windows, KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Shift+Alt+Windows+A');

		// four modifiers
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Windows+A');

		// chord
		assertUSLaBel(OperatingSystem.Windows, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'Ctrl+A Ctrl+B');
	});

	test('Linux US laBel', () => {
		// no modifier
		assertUSLaBel(OperatingSystem.Linux, KeyCode.KEY_A, 'A');

		// one modifier
		assertUSLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyCode.KEY_A, 'Ctrl+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.Shift | KeyCode.KEY_A, 'Shift+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.Alt | KeyCode.KEY_A, 'Alt+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.WinCtrl | KeyCode.KEY_A, 'Super+A');

		// two modifiers
		assertUSLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_A, 'Ctrl+Shift+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_A, 'Ctrl+Alt+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Super+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, 'Shift+Alt+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, 'Shift+Super+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Alt+Super+A');

		// three modifiers
		assertUSLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, 'Ctrl+Shift+Alt+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Super+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Alt+Super+A');
		assertUSLaBel(OperatingSystem.Linux, KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Shift+Alt+Super+A');

		// four modifiers
		assertUSLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Super+A');

		// chord
		assertUSLaBel(OperatingSystem.Linux, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'Ctrl+A Ctrl+B');
	});

	test('Mac US laBel', () => {
		// no modifier
		assertUSLaBel(OperatingSystem.Macintosh, KeyCode.KEY_A, 'A');

		// one modifier
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyCode.KEY_A, '⌘A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.Shift | KeyCode.KEY_A, '⇧A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.Alt | KeyCode.KEY_A, '⌥A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.WinCtrl | KeyCode.KEY_A, '⌃A');

		// two modifiers
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_A, '⇧⌘A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_A, '⌥⌘A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⌘A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, '⇧⌥A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⇧A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⌥A');

		// three modifiers
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A, '⇧⌥⌘A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⇧⌘A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⌥⌘A');
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⇧⌥A');

		// four modifiers
		assertUSLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, '⌃⇧⌥⌘A');

		// chord
		assertUSLaBel(OperatingSystem.Macintosh, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), '⌘A ⌘B');

		// special keys
		assertUSLaBel(OperatingSystem.Macintosh, KeyCode.LeftArrow, '←');
		assertUSLaBel(OperatingSystem.Macintosh, KeyCode.UpArrow, '↑');
		assertUSLaBel(OperatingSystem.Macintosh, KeyCode.RightArrow, '→');
		assertUSLaBel(OperatingSystem.Macintosh, KeyCode.DownArrow, '↓');
	});

	test('Aria laBel', () => {
		function assertAriaLaBel(OS: OperatingSystem, keyBinding: numBer, expected: string): void {
			const usResolvedKeyBinding = new USLayoutResolvedKeyBinding(createKeyBinding(keyBinding, OS)!, OS);
			assert.equal(usResolvedKeyBinding.getAriaLaBel(), expected);
		}

		assertAriaLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Control+Shift+Alt+Windows+A');
		assertAriaLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Control+Shift+Alt+Super+A');
		assertAriaLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Control+Shift+Alt+Command+A');
	});

	test('Electron Accelerator laBel', () => {
		function assertElectronAcceleratorLaBel(OS: OperatingSystem, keyBinding: numBer, expected: string | null): void {
			const usResolvedKeyBinding = new USLayoutResolvedKeyBinding(createKeyBinding(keyBinding, OS)!, OS);
			assert.equal(usResolvedKeyBinding.getElectronAccelerator(), expected);
		}

		assertElectronAcceleratorLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Super+A');
		assertElectronAcceleratorLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Super+A');
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'Ctrl+Shift+Alt+Cmd+A');

		// electron cannot handle chords
		assertElectronAcceleratorLaBel(OperatingSystem.Windows, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), null);
		assertElectronAcceleratorLaBel(OperatingSystem.Linux, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), null);
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), null);

		// electron cannot handle numpad keys
		assertElectronAcceleratorLaBel(OperatingSystem.Windows, KeyCode.NUMPAD_1, null);
		assertElectronAcceleratorLaBel(OperatingSystem.Linux, KeyCode.NUMPAD_1, null);
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyCode.NUMPAD_1, null);

		// special
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyCode.LeftArrow, 'Left');
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyCode.UpArrow, 'Up');
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyCode.RightArrow, 'Right');
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyCode.DownArrow, 'Down');
	});

	test('User Settings laBel', () => {
		function assertElectronAcceleratorLaBel(OS: OperatingSystem, keyBinding: numBer, expected: string): void {
			const usResolvedKeyBinding = new USLayoutResolvedKeyBinding(createKeyBinding(keyBinding, OS)!, OS);
			assert.equal(usResolvedKeyBinding.getUserSettingsLaBel(), expected);
		}

		assertElectronAcceleratorLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'ctrl+shift+alt+win+a');
		assertElectronAcceleratorLaBel(OperatingSystem.Linux, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'ctrl+shift+alt+meta+a');
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyMod.WinCtrl | KeyCode.KEY_A, 'ctrl+shift+alt+cmd+a');

		// electron cannot handle chords
		assertElectronAcceleratorLaBel(OperatingSystem.Windows, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'ctrl+a ctrl+B');
		assertElectronAcceleratorLaBel(OperatingSystem.Linux, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'ctrl+a ctrl+B');
		assertElectronAcceleratorLaBel(OperatingSystem.Macintosh, KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_A, KeyMod.CtrlCmd | KeyCode.KEY_B), 'cmd+a cmd+B');
	});

	test('issue #91235: Do not end with a +', () => {
		assertUSLaBel(OperatingSystem.Windows, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Alt, 'Ctrl+Alt');
	});
});
