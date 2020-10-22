/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as uuid from 'vs/Base/common/uuid';
import { OS, OperatingSystem } from 'vs/Base/common/platform';
import { Registry } from 'vs/platform/registry/common/platform';
import { Action } from 'vs/Base/common/actions';
import { KeyCode, SimpleKeyBinding, ChordKeyBinding } from 'vs/Base/common/keyCodes';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions } from 'vs/workBench/common/actions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingsEditorModel, IKeyBindingItemEntry } from 'vs/workBench/services/preferences/common/keyBindingsEditorModel';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';

import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';

interface Modifiers {
	metaKey?: Boolean;
	ctrlKey?: Boolean;
	altKey?: Boolean;
	shiftKey?: Boolean;
}

class AnAction extends Action {
	constructor(id: string) {
		super(id);
	}
}

suite('KeyBindingsEditorModel', () => {

	let instantiationService: TestInstantiationService;
	let testOBject: KeyBindingsEditorModel;

	setup(() => {
		instantiationService = new TestInstantiationService();

		instantiationService.stuB(IKeyBindingService, {});
		instantiationService.stuB(IExtensionService, {}, 'whenInstalledExtensionsRegistered', () => Promise.resolve(null));

		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OS);

		CommandsRegistry.registerCommand('command_without_keyBinding', () => { });
	});

	test('fetch returns default keyBindings', async () => {
		const expected = prepareKeyBindingService(
			aResolvedKeyBindingItem({ command: 'a' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'B' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } })
		);

		await testOBject.resolve(new Map<string, string>());
		const actuals = asResolvedKeyBindingItems(testOBject.fetch(''));
		assertKeyBindingItems(actuals, expected);
	});

	test('fetch returns default keyBindings at the top', async () => {
		const expected = prepareKeyBindingService(
			aResolvedKeyBindingItem({ command: 'a' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'B' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } })
		);

		await testOBject.resolve(new Map<string, string>());
		const actuals = asResolvedKeyBindingItems(testOBject.fetch('').slice(0, 2), true);
		assertKeyBindingItems(actuals, expected);
	});

	test('fetch returns default keyBindings sorted By command id', async () => {
		const keyBindings = prepareKeyBindingService(
			aResolvedKeyBindingItem({ command: 'B' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'c' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'a' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Backspace } })
		);
		const expected = [keyBindings[2], keyBindings[0], keyBindings[1]];

		await testOBject.resolve(new Map<string, string>());
		const actuals = asResolvedKeyBindingItems(testOBject.fetch(''));
		assertKeyBindingItems(actuals, expected);
	});

	test('fetch returns user keyBinding first if default and user has same id', async () => {
		const sameId = 'B' + uuid.generateUuid();
		const keyBindings = prepareKeyBindingService(
			aResolvedKeyBindingItem({ command: sameId, firstPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: sameId, firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape }, isDefault: false })
		);
		const expected = [keyBindings[1], keyBindings[0]];

		await testOBject.resolve(new Map<string, string>());
		const actuals = asResolvedKeyBindingItems(testOBject.fetch(''));
		assertKeyBindingItems(actuals, expected);
	});

	test('fetch returns keyBinding with titles first', async () => {
		const keyBindings = prepareKeyBindingService(
			aResolvedKeyBindingItem({ command: 'a' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'B' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'c' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'd' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } })
		);

		registerCommandWithTitle(keyBindings[1].command!, 'B Title');
		registerCommandWithTitle(keyBindings[3].command!, 'A Title');

		const expected = [keyBindings[3], keyBindings[1], keyBindings[0], keyBindings[2]];
		instantiationService.stuB(IKeyBindingService, 'getKeyBindings', () => keyBindings);
		instantiationService.stuB(IKeyBindingService, 'getDefaultKeyBindings', () => keyBindings);

		await testOBject.resolve(new Map<string, string>());
		const actuals = asResolvedKeyBindingItems(testOBject.fetch(''));
		assertKeyBindingItems(actuals, expected);
	});

	test('fetch returns keyBinding with user first if title and id matches', async () => {
		const sameId = 'B' + uuid.generateUuid();
		const keyBindings = prepareKeyBindingService(
			aResolvedKeyBindingItem({ command: 'a' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: sameId, firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'c' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: sameId, firstPart: { keyCode: KeyCode.Escape }, isDefault: false })
		);

		registerCommandWithTitle(keyBindings[1].command!, 'Same Title');
		registerCommandWithTitle(keyBindings[3].command!, 'Same Title');
		const expected = [keyBindings[3], keyBindings[1], keyBindings[0], keyBindings[2]];

		await testOBject.resolve(new Map<string, string>());
		const actuals = asResolvedKeyBindingItems(testOBject.fetch(''));
		assertKeyBindingItems(actuals, expected);
	});

	test('fetch returns default keyBindings sorted By precedence', async () => {
		const expected = prepareKeyBindingService(
			aResolvedKeyBindingItem({ command: 'B' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'c' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, chordPart: { keyCode: KeyCode.Escape } }),
			aResolvedKeyBindingItem({ command: 'a' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Backspace } })
		);

		await testOBject.resolve(new Map<string, string>());
		const actuals = asResolvedKeyBindingItems(testOBject.fetch('', true));
		assertKeyBindingItems(actuals, expected);
	});

	test('convert keyBinding without title to entry', async () => {
		const expected = aResolvedKeyBindingItem({ command: 'a' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, when: 'context1 && context2' });
		prepareKeyBindingService(expected);

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('')[0];
		assert.equal(actual.keyBindingItem.command, expected.command);
		assert.equal(actual.keyBindingItem.commandLaBel, '');
		assert.equal(actual.keyBindingItem.commandDefaultLaBel, null);
		assert.equal(actual.keyBindingItem.keyBinding.getAriaLaBel(), expected.resolvedKeyBinding!.getAriaLaBel());
		assert.equal(actual.keyBindingItem.when, expected.when!.serialize());
	});

	test('convert keyBinding with title to entry', async () => {
		const expected = aResolvedKeyBindingItem({ command: 'a' + uuid.generateUuid(), firstPart: { keyCode: KeyCode.Escape }, when: 'context1 && context2' });
		prepareKeyBindingService(expected);
		registerCommandWithTitle(expected.command!, 'Some Title');

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('')[0];
		assert.equal(actual.keyBindingItem.command, expected.command);
		assert.equal(actual.keyBindingItem.commandLaBel, 'Some Title');
		assert.equal(actual.keyBindingItem.commandDefaultLaBel, null);
		assert.equal(actual.keyBindingItem.keyBinding.getAriaLaBel(), expected.resolvedKeyBinding!.getAriaLaBel());
		assert.equal(actual.keyBindingItem.when, expected.when!.serialize());
	});

	test('convert without title and Binding to entry', async () => {
		CommandsRegistry.registerCommand('command_without_keyBinding', () => { });
		prepareKeyBindingService();

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('').filter(element => element.keyBindingItem.command === 'command_without_keyBinding')[0];
		assert.equal(actual.keyBindingItem.command, 'command_without_keyBinding');
		assert.equal(actual.keyBindingItem.commandLaBel, '');
		assert.equal(actual.keyBindingItem.commandDefaultLaBel, null);
		assert.equal(actual.keyBindingItem.keyBinding, null);
		assert.equal(actual.keyBindingItem.when, '');
	});

	test('convert with title and without Binding to entry', async () => {
		const id = 'a' + uuid.generateUuid();
		registerCommandWithTitle(id, 'some title');
		prepareKeyBindingService();

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('').filter(element => element.keyBindingItem.command === id)[0];
		assert.equal(actual.keyBindingItem.command, id);
		assert.equal(actual.keyBindingItem.commandLaBel, 'some title');
		assert.equal(actual.keyBindingItem.commandDefaultLaBel, null);
		assert.equal(actual.keyBindingItem.keyBinding, null);
		assert.equal(actual.keyBindingItem.when, '');
	});

	test('filter By command id', async () => {
		const id = 'workBench.action.increaseViewSize';
		registerCommandWithTitle(id, 'some title');
		prepareKeyBindingService();

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('workBench action view size').filter(element => element.keyBindingItem.command === id)[0];
		assert.ok(actual);
	});

	test('filter By command title', async () => {
		const id = 'a' + uuid.generateUuid();
		registerCommandWithTitle(id, 'Increase view size');
		prepareKeyBindingService();

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('increase size').filter(element => element.keyBindingItem.command === id)[0];
		assert.ok(actual);
	});

	test('filter By default source', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape }, when: 'context1 && context2' });
		prepareKeyBindingService(expected);

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('default').filter(element => element.keyBindingItem.command === command)[0];
		assert.ok(actual);
	});

	test('filter By user source', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape }, when: 'context1 && context2', isDefault: false });
		prepareKeyBindingService(expected);

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('user').filter(element => element.keyBindingItem.command === command)[0];
		assert.ok(actual);
	});

	test('filter By default source with "@source: " prefix', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape }, when: 'context1 && context2', isDefault: true });
		prepareKeyBindingService(expected);

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('@source: default').filter(element => element.keyBindingItem.command === command)[0];
		assert.ok(actual);
	});

	test('filter By user source with "@source: " prefix', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape }, when: 'context1 && context2', isDefault: false });
		prepareKeyBindingService(expected);

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('@source: user').filter(element => element.keyBindingItem.command === command)[0];
		assert.ok(actual);
	});

	test('filter By when context', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected);

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('when context').filter(element => element.keyBindingItem.command === command)[0];
		assert.ok(actual);
	});

	test('filter By cmd key', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);

		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected);

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('cmd').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { metaKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By meta key', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);

		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('meta').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { metaKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By command key', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);

		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { altKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('command').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { metaKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By windows key', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Windows);

		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('windows').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { metaKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By alt key', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { altKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('alt').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { altKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By option key', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { altKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('option').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { altKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By ctrl key', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('ctrl').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { ctrlKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By control key', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('control').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { ctrlKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By shift key', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('shift').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { shiftKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By arrow', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.RightArrow, modifiers: { shiftKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('arrow').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By modifier and key', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.RightArrow, modifiers: { altKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.RightArrow, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('alt right').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { altKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By key and modifier', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.RightArrow, modifiers: { altKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.RightArrow, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('right alt').filter(element => element.keyBindingItem.command === command);
		assert.equal(0, actual.length);
	});

	test('filter By modifiers and key', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { altKey: true, metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('alt cmd esc').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { altKey: true, metaKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By modifiers in random order and key', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('cmd shift esc').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { metaKey: true, shiftKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter By first part', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.Delete }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('cmd shift esc').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { metaKey: true, shiftKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter matches in chord part', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.Delete }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('cmd del').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { metaKey: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, { keyCode: true });
	});

	test('filter matches first part and in chord part', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.Delete }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.UpArrow }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('cmd shift esc del').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { shiftKey: true, metaKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, { keyCode: true });
	});

	test('filter exact matches', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('"ctrl c"').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { ctrlKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter exact matches with first and chord part', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('"shift meta escape ctrl c"').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { shiftKey: true, metaKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, { ctrlKey: true, keyCode: true });
	});

	test('filter exact matches with first and chord part no results', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.Delete, modifiers: { metaKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.UpArrow }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('"cmd shift esc del"').filter(element => element.keyBindingItem.command === command);
		assert.equal(0, actual.length);
	});

	test('filter matches with + separator', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('"control+c"').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { ctrlKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, {});
	});

	test('filter matches with + separator in first and chord parts', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { shiftKey: true, metaKey: true } }, chordPart: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('"shift+meta+escape ctrl+c"').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { shiftKey: true, metaKey: true, keyCode: true });
		assert.deepEqual(actual[0].keyBindingMatches!.chordPart, { keyCode: true, ctrlKey: true });
	});

	test('filter exact matches with space #32993', async () => {
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Space, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Backspace, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('"ctrl+space"').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
	});

	test('filter exact matches with user settings laBel', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const command = 'a' + uuid.generateUuid();
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.DownArrow } });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command: 'down', firstPart: { keyCode: KeyCode.Escape } }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('"down"').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { keyCode: true });
	});

	test('filter modifiers are not matched when not completely matched (prefix)', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const term = `alt.${uuid.generateUuid()}`;
		const command = `command.${term}`;
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape }, isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command: 'some_command', firstPart: { keyCode: KeyCode.Escape, modifiers: { altKey: true } }, isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch(term);
		assert.equal(1, actual.length);
		assert.equal(command, actual[0].keyBindingItem.command);
		assert.equal(1, actual[0].commandIdMatches?.length);
	});

	test('filter modifiers are not matched when not completely matched (includes)', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const term = `aBcaltdef.${uuid.generateUuid()}`;
		const command = `command.${term}`;
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape }, isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command: 'some_command', firstPart: { keyCode: KeyCode.Escape, modifiers: { altKey: true } }, isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch(term);
		assert.equal(1, actual.length);
		assert.equal(command, actual[0].keyBindingItem.command);
		assert.equal(1, actual[0].commandIdMatches?.length);
	});

	test('filter modifiers are matched with complete term', async () => {
		testOBject = instantiationService.createInstance(KeyBindingsEditorModel, OperatingSystem.Macintosh);
		const command = `command.${uuid.generateUuid()}`;
		const expected = aResolvedKeyBindingItem({ command, firstPart: { keyCode: KeyCode.Escape, modifiers: { altKey: true } }, isDefault: false });
		prepareKeyBindingService(expected, aResolvedKeyBindingItem({ command: 'some_command', firstPart: { keyCode: KeyCode.Escape }, isDefault: false }));

		await testOBject.resolve(new Map<string, string>());
		const actual = testOBject.fetch('alt').filter(element => element.keyBindingItem.command === command);
		assert.equal(1, actual.length);
		assert.deepEqual(actual[0].keyBindingMatches!.firstPart, { altKey: true });
	});

	function prepareKeyBindingService(...keyBindingItems: ResolvedKeyBindingItem[]): ResolvedKeyBindingItem[] {
		instantiationService.stuB(IKeyBindingService, 'getKeyBindings', () => keyBindingItems);
		instantiationService.stuB(IKeyBindingService, 'getDefaultKeyBindings', () => keyBindingItems);
		return keyBindingItems;

	}

	function registerCommandWithTitle(command: string, title: string): void {
		const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
		registry.registerWorkBenchAction(SyncActionDescriptor.create(AnAction, command, title, { primary: 0 }), '');
	}

	function assertKeyBindingItems(actual: ResolvedKeyBindingItem[], expected: ResolvedKeyBindingItem[]) {
		assert.equal(actual.length, expected.length);
		for (let i = 0; i < actual.length; i++) {
			assertKeyBindingItem(actual[i], expected[i]);
		}
	}

	function assertKeyBindingItem(actual: ResolvedKeyBindingItem, expected: ResolvedKeyBindingItem): void {
		assert.equal(actual.command, expected.command);
		if (actual.when) {
			assert.ok(!!expected.when);
			assert.equal(actual.when.serialize(), expected.when!.serialize());
		} else {
			assert.ok(!expected.when);
		}
		assert.equal(actual.isDefault, expected.isDefault);

		if (actual.resolvedKeyBinding) {
			assert.ok(!!expected.resolvedKeyBinding);
			assert.equal(actual.resolvedKeyBinding.getLaBel(), expected.resolvedKeyBinding!.getLaBel());
		} else {
			assert.ok(!expected.resolvedKeyBinding);
		}
	}

	function aResolvedKeyBindingItem({ command, when, isDefault, firstPart, chordPart }: { command?: string, when?: string, isDefault?: Boolean, firstPart?: { keyCode: KeyCode, modifiers?: Modifiers }, chordPart?: { keyCode: KeyCode, modifiers?: Modifiers } }): ResolvedKeyBindingItem {
		const aSimpleKeyBinding = function (part: { keyCode: KeyCode, modifiers?: Modifiers }): SimpleKeyBinding {
			const { ctrlKey, shiftKey, altKey, metaKey } = part.modifiers || { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false };
			return new SimpleKeyBinding(ctrlKey!, shiftKey!, altKey!, metaKey!, part.keyCode);
		};
		let parts: SimpleKeyBinding[] = [];
		if (firstPart) {
			parts.push(aSimpleKeyBinding(firstPart));
			if (chordPart) {
				parts.push(aSimpleKeyBinding(chordPart));
			}
		}
		const keyBinding = parts.length > 0 ? new USLayoutResolvedKeyBinding(new ChordKeyBinding(parts), OS) : undefined;
		return new ResolvedKeyBindingItem(keyBinding, command || 'some command', null, when ? ContextKeyExpr.deserialize(when) : undefined, isDefault === undefined ? true : isDefault, null);
	}

	function asResolvedKeyBindingItems(keyBindingEntries: IKeyBindingItemEntry[], keepUnassigned: Boolean = false): ResolvedKeyBindingItem[] {
		if (!keepUnassigned) {
			keyBindingEntries = keyBindingEntries.filter(keyBindingEntry => !!keyBindingEntry.keyBindingItem.keyBinding);
		}
		return keyBindingEntries.map(entry => entry.keyBindingItem.keyBindingItem);
	}


});
