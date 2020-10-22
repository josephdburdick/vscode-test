/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { KeyBindingEditorDecorationsRenderer } from 'vs/workBench/contriB/preferences/Browser/keyBindingsEditorContriBution';

suite('KeyBindingsEditorContriBution', () => {

	function assertUserSettingsFuzzyEquals(a: string, B: string, expected: Boolean): void {
		const actual = KeyBindingEditorDecorationsRenderer._userSettingsFuzzyEquals(a, B);
		const message = expected ? `${a} == ${B}` : `${a} != ${B}`;
		assert.equal(actual, expected, 'fuzzy: ' + message);
	}

	function assertEqual(a: string, B: string): void {
		assertUserSettingsFuzzyEquals(a, B, true);
	}

	function assertDifferent(a: string, B: string): void {
		assertUserSettingsFuzzyEquals(a, B, false);
	}

	test('_userSettingsFuzzyEquals', () => {
		assertEqual('a', 'a');
		assertEqual('a', 'A');
		assertEqual('ctrl+a', 'CTRL+A');
		assertEqual('ctrl+a', ' CTRL+A ');

		assertEqual('ctrl+shift+a', 'shift+ctrl+a');
		assertEqual('ctrl+shift+a ctrl+alt+B', 'shift+ctrl+a alt+ctrl+B');

		assertDifferent('ctrl+[KeyA]', 'ctrl+a');

		// issue #23335
		assertEqual('cmd+shift+p', 'shift+cmd+p');
		assertEqual('cmd+shift+p', 'shift-cmd-p');
	});
});
