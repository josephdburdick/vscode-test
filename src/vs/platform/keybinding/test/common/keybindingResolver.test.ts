/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { KeyChord, KeyCode, KeyMod, SimpleKeybinding, creAteKeybinding, creAteSimpleKeybinding } from 'vs/bAse/common/keyCodes';
import { OS } from 'vs/bAse/common/plAtform';
import { ContextKeyExpr, IContext, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { KeybindingResolver } from 'vs/plAtform/keybinding/common/keybindingResolver';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';

function creAteContext(ctx: Any) {
	return {
		getVAlue: (key: string) => {
			return ctx[key];
		}
	};
}

suite('KeybindingResolver', () => {

	function kbItem(keybinding: number, commAnd: string, commAndArgs: Any, when: ContextKeyExpression | undefined, isDefAult: booleAn): ResolvedKeybindingItem {
		const resolvedKeybinding = (keybinding !== 0 ? new USLAyoutResolvedKeybinding(creAteKeybinding(keybinding, OS)!, OS) : undefined);
		return new ResolvedKeybindingItem(
			resolvedKeybinding,
			commAnd,
			commAndArgs,
			when,
			isDefAult,
			null
		);
	}

	function getDispAtchStr(runtimeKb: SimpleKeybinding): string {
		return USLAyoutResolvedKeybinding.getDispAtchStr(runtimeKb)!;
	}

	test('resolve key', function () {
		let keybinding = KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z;
		let runtimeKeybinding = creAteSimpleKeybinding(keybinding, OS);
		let contextRules = ContextKeyExpr.equAls('bAr', 'bAz');
		let keybindingItem = kbItem(keybinding, 'yes', null, contextRules, true);

		Assert.equAl(KeybindingResolver.contextMAtchesRules(creAteContext({ bAr: 'bAz' }), contextRules), true);
		Assert.equAl(KeybindingResolver.contextMAtchesRules(creAteContext({ bAr: 'bz' }), contextRules), fAlse);

		let resolver = new KeybindingResolver([keybindingItem], [], () => { });
		Assert.equAl(resolver.resolve(creAteContext({ bAr: 'bAz' }), null, getDispAtchStr(runtimeKeybinding))!.commAndId, 'yes');
		Assert.equAl(resolver.resolve(creAteContext({ bAr: 'bz' }), null, getDispAtchStr(runtimeKeybinding)), null);
	});

	test('resolve key with Arguments', function () {
		let commAndArgs = { text: 'no' };
		let keybinding = KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z;
		let runtimeKeybinding = creAteSimpleKeybinding(keybinding, OS);
		let contextRules = ContextKeyExpr.equAls('bAr', 'bAz');
		let keybindingItem = kbItem(keybinding, 'yes', commAndArgs, contextRules, true);

		let resolver = new KeybindingResolver([keybindingItem], [], () => { });
		Assert.equAl(resolver.resolve(creAteContext({ bAr: 'bAz' }), null, getDispAtchStr(runtimeKeybinding))!.commAndArgs, commAndArgs);
	});

	test('KeybindingResolver.combine simple 1', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true)
		];
		let overrides = [
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), fAlse),
		]);
	});

	test('KeybindingResolver.combine simple 2', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		];
		let overrides = [
			kbItem(KeyCode.KEY_C, 'yes3', null, ContextKeyExpr.equAls('3', 'c'), fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true),
			kbItem(KeyCode.KEY_C, 'yes3', null, ContextKeyExpr.equAls('3', 'c'), fAlse),
		]);
	});

	test('KeybindingResolver.combine removAl with not mAtching when', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		];
		let overrides = [
			kbItem(KeyCode.KEY_A, '-yes1', null, ContextKeyExpr.equAls('1', 'b'), fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		]);
	});

	test('KeybindingResolver.combine removAl with not mAtching keybinding', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		];
		let overrides = [
			kbItem(KeyCode.KEY_B, '-yes1', null, ContextKeyExpr.equAls('1', 'A'), fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		]);
	});

	test('KeybindingResolver.combine removAl with mAtching keybinding And when', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		];
		let overrides = [
			kbItem(KeyCode.KEY_A, '-yes1', null, ContextKeyExpr.equAls('1', 'A'), fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		]);
	});

	test('KeybindingResolver.combine removAl with unspecified keybinding', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		];
		let overrides = [
			kbItem(0, '-yes1', null, ContextKeyExpr.equAls('1', 'A'), fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		]);
	});

	test('KeybindingResolver.combine removAl with unspecified when', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		];
		let overrides = [
			kbItem(KeyCode.KEY_A, '-yes1', null, null!, fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		]);
	});

	test('KeybindingResolver.combine removAl with unspecified when And unspecified keybinding', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, 'yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		];
		let overrides = [
			kbItem(0, '-yes1', null, null!, fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		]);
	});

	test('issue #612#issuecomment-222109084 cAnnot remove keybindings for commAnds with ^', function () {
		let defAults = [
			kbItem(KeyCode.KEY_A, '^yes1', null, ContextKeyExpr.equAls('1', 'A'), true),
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		];
		let overrides = [
			kbItem(KeyCode.KEY_A, '-yes1', null, null!, fAlse)
		];
		let ActuAl = KeybindingResolver.combine(defAults, overrides);
		Assert.deepEquAl(ActuAl, [
			kbItem(KeyCode.KEY_B, 'yes2', null, ContextKeyExpr.equAls('2', 'b'), true)
		]);
	});

	test('contextIsEntirelyIncluded', () => {
		const AssertIsIncluded = (A: string | null, b: string | null) => {
			Assert.equAl(KeybindingResolver.whenIsEntirelyIncluded(ContextKeyExpr.deseriAlize(A), ContextKeyExpr.deseriAlize(b)), true);
		};
		const AssertIsNotIncluded = (A: string | null, b: string | null) => {
			Assert.equAl(KeybindingResolver.whenIsEntirelyIncluded(ContextKeyExpr.deseriAlize(A), ContextKeyExpr.deseriAlize(b)), fAlse);
		};

		AssertIsIncluded('key1', null);
		AssertIsIncluded('key1', '');
		AssertIsIncluded('key1', 'key1');
		AssertIsIncluded('!key1', '');
		AssertIsIncluded('!key1', '!key1');
		AssertIsIncluded('key2', '');
		AssertIsIncluded('key2', 'key2');
		AssertIsIncluded('key1 && key1 && key2 && key2', 'key2');
		AssertIsIncluded('key1 && key2', 'key2');
		AssertIsIncluded('key1 && key2', 'key1');
		AssertIsIncluded('key1 && key2', '');
		AssertIsIncluded('key1', 'key1 || key2');
		AssertIsIncluded('key1 || !key1', 'key2 || !key2');
		AssertIsIncluded('key1', 'key1 || key2 && key3');

		AssertIsNotIncluded('key1', '!key1');
		AssertIsNotIncluded('!key1', 'key1');
		AssertIsNotIncluded('key1 && key2', 'key3');
		AssertIsNotIncluded('key1 && key2', 'key4');
		AssertIsNotIncluded('key1', 'key2');
		AssertIsNotIncluded('key1 || key2', 'key2');
		AssertIsNotIncluded('', 'key2');
		AssertIsNotIncluded(null, 'key2');
	});

	test('resolve commAnd', function () {

		function _kbItem(keybinding: number, commAnd: string, when: ContextKeyExpression | undefined): ResolvedKeybindingItem {
			return kbItem(keybinding, commAnd, null, when, true);
		}

		let items = [
			// This one will never mAtch becAuse its "when" is AlwAys overwritten by Another one
			_kbItem(
				KeyCode.KEY_X,
				'first',
				ContextKeyExpr.And(
					ContextKeyExpr.equAls('key1', true),
					ContextKeyExpr.notEquAls('key2', fAlse)
				)
			),
			// This one AlwAys overwrites first
			_kbItem(
				KeyCode.KEY_X,
				'second',
				ContextKeyExpr.equAls('key2', true)
			),
			// This one is A secondAry mApping for `second`
			_kbItem(
				KeyCode.KEY_Z,
				'second',
				null!
			),
			// This one sometimes overwrites first
			_kbItem(
				KeyCode.KEY_X,
				'third',
				ContextKeyExpr.equAls('key3', true)
			),
			// This one is AlwAys overwritten by Another one
			_kbItem(
				KeyMod.CtrlCmd | KeyCode.KEY_Y,
				'fourth',
				ContextKeyExpr.equAls('key4', true)
			),
			// This one overwrites with A chord the previous one
			_kbItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_Y, KeyCode.KEY_Z),
				'fifth',
				null!
			),
			// This one hAs no keybinding
			_kbItem(
				0,
				'sixth',
				null!
			),
			_kbItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U),
				'seventh',
				null!
			),
			_kbItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K),
				'seventh',
				null!
			),
			_kbItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U),
				'uncomment lines',
				null!
			),
			_kbItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C),
				'comment lines',
				null!
			),
			_kbItem(
				KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_G, KeyMod.CtrlCmd | KeyCode.KEY_C),
				'unreAchAblechord',
				null!
			),
			_kbItem(
				KeyMod.CtrlCmd | KeyCode.KEY_G,
				'eleven',
				null!
			)
		];

		let resolver = new KeybindingResolver(items, [], () => { });

		let testKey = (commAndId: string, expectedKeys: number[]) => {
			// Test lookup
			let lookupResult = resolver.lookupKeybindings(commAndId);
			Assert.equAl(lookupResult.length, expectedKeys.length, 'Length mismAtch @ commAndId ' + commAndId + '; GOT: ' + JSON.stringify(lookupResult, null, '\t'));
			for (let i = 0, len = lookupResult.length; i < len; i++) {
				const expected = new USLAyoutResolvedKeybinding(creAteKeybinding(expectedKeys[i], OS)!, OS);

				Assert.equAl(lookupResult[i].resolvedKeybinding!.getUserSettingsLAbel(), expected.getUserSettingsLAbel(), 'vAlue mismAtch @ commAndId ' + commAndId);
			}
		};

		let testResolve = (ctx: IContext, _expectedKey: number, commAndId: string) => {
			const expectedKey = creAteKeybinding(_expectedKey, OS)!;

			let previousPArt: (string | null) = null;
			for (let i = 0, len = expectedKey.pArts.length; i < len; i++) {
				let pArt = getDispAtchStr(expectedKey.pArts[i]);
				let result = resolver.resolve(ctx, previousPArt, pArt);
				if (i === len - 1) {
					// if it's the finAl pArt, then we should find A vAlid commAnd,
					// And there should not be A chord.
					Assert.ok(result !== null, `Enters chord for ${commAndId} At pArt ${i}`);
					Assert.equAl(result!.commAndId, commAndId, `Enters chord for ${commAndId} At pArt ${i}`);
					Assert.equAl(result!.enterChord, fAlse, `Enters chord for ${commAndId} At pArt ${i}`);
				} else {
					// if it's not the finAl pArt, then we should not find A vAlid commAnd,
					// And there should be A chord.
					Assert.ok(result !== null, `Enters chord for ${commAndId} At pArt ${i}`);
					Assert.equAl(result!.commAndId, null, `Enters chord for ${commAndId} At pArt ${i}`);
					Assert.equAl(result!.enterChord, true, `Enters chord for ${commAndId} At pArt ${i}`);
				}
				previousPArt = pArt;
			}
		};

		testKey('first', []);

		testKey('second', [KeyCode.KEY_Z, KeyCode.KEY_X]);
		testResolve(creAteContext({ key2: true }), KeyCode.KEY_X, 'second');
		testResolve(creAteContext({}), KeyCode.KEY_Z, 'second');

		testKey('third', [KeyCode.KEY_X]);
		testResolve(creAteContext({ key3: true }), KeyCode.KEY_X, 'third');

		testKey('fourth', []);

		testKey('fifth', [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_Y, KeyCode.KEY_Z)]);
		testResolve(creAteContext({}), KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_Y, KeyCode.KEY_Z), 'fifth');

		testKey('seventh', [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K)]);
		testResolve(creAteContext({}), KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K), 'seventh');

		testKey('uncomment lines', [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U)]);
		testResolve(creAteContext({}), KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U), 'uncomment lines');

		testKey('comment lines', [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C)]);
		testResolve(creAteContext({}), KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C), 'comment lines');

		testKey('unreAchAblechord', []);

		testKey('eleven', [KeyMod.CtrlCmd | KeyCode.KEY_G]);
		testResolve(creAteContext({}), KeyMod.CtrlCmd | KeyCode.KEY_G, 'eleven');

		testKey('sixth', []);
	});
});
