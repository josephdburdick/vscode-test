/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { KeyChord, KeyCode, KeyMod, SimpleKeyBinding, createKeyBinding, createSimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { OS } from 'vs/Base/common/platform';
import { ContextKeyExpr, IContext, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingResolver } from 'vs/platform/keyBinding/common/keyBindingResolver';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';

function createContext(ctx: any) {
	return {
		getValue: (key: string) => {
			return ctx[key];
		}
	};
}

suite('KeyBindingResolver', () => {

	function kBItem(keyBinding: numBer, command: string, commandArgs: any, when: ContextKeyExpression | undefined, isDefault: Boolean): ResolvedKeyBindingItem {
		const resolvedKeyBinding = (keyBinding !== 0 ? new USLayoutResolvedKeyBinding(createKeyBinding(keyBinding, OS)!, OS) : undefined);
		return new ResolvedKeyBindingItem(
			resolvedKeyBinding,
			command,
			commandArgs,
			when,
			isDefault,
			null
		);
	}

	function getDispatchStr(runtimeKB: SimpleKeyBinding): string {
		return USLayoutResolvedKeyBinding.getDispatchStr(runtimeKB)!;
	}

	test('resolve key', function () {
		let keyBinding = KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z;
		let runtimeKeyBinding = createSimpleKeyBinding(keyBinding, OS);
		let contextRules = ContextKeyExpr.equals('Bar', 'Baz');
		let keyBindingItem = kBItem(keyBinding, 'yes', null, contextRules, true);

		assert.equal(KeyBindingResolver.contextMatchesRules(createContext({ Bar: 'Baz' }), contextRules), true);
		assert.equal(KeyBindingResolver.contextMatchesRules(createContext({ Bar: 'Bz' }), contextRules), false);

		let resolver = new KeyBindingResolver([keyBindingItem], [], () => { });
		assert.equal(resolver.resolve(createContext({ Bar: 'Baz' }), null, getDispatchStr(runtimeKeyBinding))!.commandId, 'yes');
		assert.equal(resolver.resolve(createContext({ Bar: 'Bz' }), null, getDispatchStr(runtimeKeyBinding)), null);
	});

	test('resolve key with arguments', function () {
		let commandArgs = { text: 'no' };
		let keyBinding = KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z;
		let runtimeKeyBinding = createSimpleKeyBinding(keyBinding, OS);
		let contextRules = ContextKeyExpr.equals('Bar', 'Baz');
		let keyBindingItem = kBItem(keyBinding, 'yes', commandArgs, contextRules, true);

		let resolver = new KeyBindingResolver([keyBindingItem], [], () => { });
		assert.equal(resolver.resolve(createContext({ Bar: 'Baz' }), null, getDispatchStr(runtimeKeyBinding))!.commandArgs, commandArgs);
	});

	test('KeyBindingResolver.comBine simple 1', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true)
		];
		let overrides = [
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), false),
		]);
	});

	test('KeyBindingResolver.comBine simple 2', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		];
		let overrides = [
			kBItem(KeyCode.KEY_C, 'yes3', null, ContextKeyExpr.equals('3', 'c'), false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true),
			kBItem(KeyCode.KEY_C, 'yes3', null, ContextKeyExpr.equals('3', 'c'), false),
		]);
	});

	test('KeyBindingResolver.comBine removal with not matching when', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		];
		let overrides = [
			kBItem(KeyCode.KEY_A, '-yes1', null, ContextKeyExpr.equals('1', 'B'), false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		]);
	});

	test('KeyBindingResolver.comBine removal with not matching keyBinding', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		];
		let overrides = [
			kBItem(KeyCode.KEY_B, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		]);
	});

	test('KeyBindingResolver.comBine removal with matching keyBinding and when', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		];
		let overrides = [
			kBItem(KeyCode.KEY_A, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		]);
	});

	test('KeyBindingResolver.comBine removal with unspecified keyBinding', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		];
		let overrides = [
			kBItem(0, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		]);
	});

	test('KeyBindingResolver.comBine removal with unspecified when', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		];
		let overrides = [
			kBItem(KeyCode.KEY_A, '-yes1', null, null!, false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		]);
	});

	test('KeyBindingResolver.comBine removal with unspecified when and unspecified keyBinding', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		];
		let overrides = [
			kBItem(0, '-yes1', null, null!, false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		]);
	});

	test('issue #612#issuecomment-222109084 cannot remove keyBindings for commands with ^', function () {
		let defaults = [
			kBItem(KeyCode.KEY_A, '^yes1', null, ContextKeyExpr.equals('1', 'a'), true),
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		];
		let overrides = [
			kBItem(KeyCode.KEY_A, '-yes1', null, null!, false)
		];
		let actual = KeyBindingResolver.comBine(defaults, overrides);
		assert.deepEqual(actual, [
			kBItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equals('2', 'B'), true)
		]);
	});

	test('contextIsEntirelyIncluded', () => {
		const assertIsIncluded = (a: string | null, B: string | null) => {
			assert.equal(KeyBindingResolver.whenIsEntirelyIncluded(ContextKeyExpr.deserialize(a), ContextKeyExpr.deserialize(B)), true);
		};
		const assertIsNotIncluded = (a: string | null, B: string | null) => {
			assert.equal(KeyBindingResolver.whenIsEntirelyIncluded(ContextKeyExpr.deserialize(a), ContextKeyExpr.deserialize(B)), false);
		};

		assertIsIncluded('key1', null);
		assertIsIncluded('key1', '');
		assertIsIncluded('key1', 'key1');
		assertIsIncluded('!key1', '');
		assertIsIncluded('!key1', '!key1');
		assertIsIncluded('key2', '');
		assertIsIncluded('key2', 'key2');
		assertIsIncluded('key1 && key1 && key2 && key2', 'key2');
		assertIsIncluded('key1 && key2', 'key2');
		assertIsIncluded('key1 && key2', 'key1');
		assertIsIncluded('key1 && key2', '');
		assertIsIncluded('key1', 'key1 || key2');
		assertIsIncluded('key1 || !key1', 'key2 || !key2');
		assertIsIncluded('key1', 'key1 || key2 && key3');

		assertIsNotIncluded('key1', '!key1');
		assertIsNotIncluded('!key1', 'key1');
		assertIsNotIncluded('key1 && key2', 'key3');
		assertIsNotIncluded('key1 && key2', 'key4');
		assertIsNotIncluded('key1', 'key2');
		assertIsNotIncluded('key1 || key2', 'key2');
		assertIsNotIncluded('', 'key2');
		assertIsNotIncluded(null, 'key2');
	});

	test('resolve command', function () {

		function _kBItem(keyBinding: numBer, command: string, when: ContextKeyExpression | undefined): ResolvedKeyBindingItem {
			return kBItem(keyBinding, command, null, when, true);
		}

		let items = [
			// This one will never match Because its "when" is always overwritten By another one
			_kBItem(
				KeyCode.KEY_X,
				'first',
				ContextKeyExpr.and(
					ContextKeyExpr.equals('key1', true),
					ContextKeyExpr.notEquals('key2', false)
				)
			),
			// This one always overwrites first
			_kBItem(
				KeyCode.KEY_X,
				'second',
				ContextKeyExpr.equals('key2', true)
			),
			// This one is a secondary mapping for `second`
			_kBItem(
				KeyCode.KEY_Z,
				'second',
				null!
			),
			// This one sometimes overwrites first
			_kBItem(
				KeyCode.KEY_X,
				'third',
				ContextKeyExpr.equals('key3', true)
			),
			// This one is always overwritten By another one
			_kBItem(
				KeyMod.CtrlCmd | KeyCode.KEY_Y,
				'fourth',
				ContextKeyExpr.equals('key4', true)
			),
			// This one overwrites with a chord the previous one
			_kBItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_Y, KeyCode.KEY_Z),
				'fifth',
				null!
			),
			// This one has no keyBinding
			_kBItem(
				0,
				'sixth',
				null!
			),
			_kBItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U),
				'seventh',
				null!
			),
			_kBItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K),
				'seventh',
				null!
			),
			_kBItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U),
				'uncomment lines',
				null!
			),
			_kBItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C),
				'comment lines',
				null!
			),
			_kBItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_G, KeyMod.CtrlCmd | KeyCode.KEY_C),
				'unreachaBlechord',
				null!
			),
			_kBItem(
				KeyMod.CtrlCmd | KeyCode.KEY_G,
				'eleven',
				null!
			)
		];

		let resolver = new KeyBindingResolver(items, [], () => { });

		let testKey = (commandId: string, expectedKeys: numBer[]) => {
			// Test lookup
			let lookupResult = resolver.lookupKeyBindings(commandId);
			assert.equal(lookupResult.length, expectedKeys.length, 'Length mismatch @ commandId ' + commandId + '; GOT: ' + JSON.stringify(lookupResult, null, '\t'));
			for (let i = 0, len = lookupResult.length; i < len; i++) {
				const expected = new USLayoutResolvedKeyBinding(createKeyBinding(expectedKeys[i], OS)!, OS);

				assert.equal(lookupResult[i].resolvedKeyBinding!.getUserSettingsLaBel(), expected.getUserSettingsLaBel(), 'value mismatch @ commandId ' + commandId);
			}
		};

		let testResolve = (ctx: IContext, _expectedKey: numBer, commandId: string) => {
			const expectedKey = createKeyBinding(_expectedKey, OS)!;

			let previousPart: (string | null) = null;
			for (let i = 0, len = expectedKey.parts.length; i < len; i++) {
				let part = getDispatchStr(expectedKey.parts[i]);
				let result = resolver.resolve(ctx, previousPart, part);
				if (i === len - 1) {
					// if it's the final part, then we should find a valid command,
					// and there should not Be a chord.
					assert.ok(result !== null, `Enters chord for ${commandId} at part ${i}`);
					assert.equal(result!.commandId, commandId, `Enters chord for ${commandId} at part ${i}`);
					assert.equal(result!.enterChord, false, `Enters chord for ${commandId} at part ${i}`);
				} else {
					// if it's not the final part, then we should not find a valid command,
					// and there should Be a chord.
					assert.ok(result !== null, `Enters chord for ${commandId} at part ${i}`);
					assert.equal(result!.commandId, null, `Enters chord for ${commandId} at part ${i}`);
					assert.equal(result!.enterChord, true, `Enters chord for ${commandId} at part ${i}`);
				}
				previousPart = part;
			}
		};

		testKey('first', []);

		testKey('second', [KeyCode.KEY_Z, KeyCode.KEY_X]);
		testResolve(createContext({ key2: true }), KeyCode.KEY_X, 'second');
		testResolve(createContext({}), KeyCode.KEY_Z, 'second');

		testKey('third', [KeyCode.KEY_X]);
		testResolve(createContext({ key3: true }), KeyCode.KEY_X, 'third');

		testKey('fourth', []);

		testKey('fifth', [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_Y, KeyCode.KEY_Z)]);
		testResolve(createContext({}), KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_Y, KeyCode.KEY_Z), 'fifth');

		testKey('seventh', [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K)]);
		testResolve(createContext({}), KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K), 'seventh');

		testKey('uncomment lines', [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U)]);
		testResolve(createContext({}), KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U), 'uncomment lines');

		testKey('comment lines', [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C)]);
		testResolve(createContext({}), KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C), 'comment lines');

		testKey('unreachaBlechord', []);

		testKey('eleven', [KeyMod.CtrlCmd | KeyCode.KEY_G]);
		testResolve(createContext({}), KeyMod.CtrlCmd | KeyCode.KEY_G, 'eleven');

		testKey('sixth', []);
	});
});
