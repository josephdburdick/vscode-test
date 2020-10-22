/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ChordKeyBinding, KeyCode, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { OperatingSystem } from 'vs/Base/common/platform';
import { refactorCommandId, organizeImportsCommandId } from 'vs/editor/contriB/codeAction/codeAction';
import { CodeActionKind } from 'vs/editor/contriB/codeAction/types';
import { CodeActionKeyBindingResolver } from 'vs/editor/contriB/codeAction/codeActionMenu';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';

suite('CodeActionKeyBindingResolver', () => {
	const refactorKeyBinding = createCodeActionKeyBinding(
		KeyCode.KEY_A,
		refactorCommandId,
		{ kind: CodeActionKind.Refactor.value });

	const refactorExtractKeyBinding = createCodeActionKeyBinding(
		KeyCode.KEY_B,
		refactorCommandId,
		{ kind: CodeActionKind.Refactor.append('extract').value });

	const organizeImportsKeyBinding = createCodeActionKeyBinding(
		KeyCode.KEY_C,
		organizeImportsCommandId,
		undefined);

	test('Should match refactor keyBindings', async function () {
		const resolver = new CodeActionKeyBindingResolver({
			getKeyBindings: (): readonly ResolvedKeyBindingItem[] => {
				return [refactorKeyBinding];
			},
		}).getResolver();

		assert.equal(
			resolver({ title: '' }),
			undefined);

		assert.equal(
			resolver({ title: '', kind: CodeActionKind.Refactor.value }),
			refactorKeyBinding.resolvedKeyBinding);

		assert.equal(
			resolver({ title: '', kind: CodeActionKind.Refactor.append('extract').value }),
			refactorKeyBinding.resolvedKeyBinding);

		assert.equal(
			resolver({ title: '', kind: CodeActionKind.QuickFix.value }),
			undefined);
	});

	test('Should prefer most specific keyBinding', async function () {
		const resolver = new CodeActionKeyBindingResolver({
			getKeyBindings: (): readonly ResolvedKeyBindingItem[] => {
				return [refactorKeyBinding, refactorExtractKeyBinding, organizeImportsKeyBinding];
			},
		}).getResolver();

		assert.equal(
			resolver({ title: '', kind: CodeActionKind.Refactor.value }),
			refactorKeyBinding.resolvedKeyBinding);

		assert.equal(
			resolver({ title: '', kind: CodeActionKind.Refactor.append('extract').value }),
			refactorExtractKeyBinding.resolvedKeyBinding);
	});

	test('Organize imports should still return a keyBinding even though it does not have args', async function () {
		const resolver = new CodeActionKeyBindingResolver({
			getKeyBindings: (): readonly ResolvedKeyBindingItem[] => {
				return [refactorKeyBinding, refactorExtractKeyBinding, organizeImportsKeyBinding];
			},
		}).getResolver();

		assert.equal(
			resolver({ title: '', kind: CodeActionKind.SourceOrganizeImports.value }),
			organizeImportsKeyBinding.resolvedKeyBinding);
	});
});

function createCodeActionKeyBinding(keycode: KeyCode, command: string, commandArgs: any) {
	return new ResolvedKeyBindingItem(
		new USLayoutResolvedKeyBinding(
			new ChordKeyBinding([new SimpleKeyBinding(false, true, false, false, keycode)]),
			OperatingSystem.Linux),
		command,
		commandArgs,
		undefined,
		false,
		null);
}

