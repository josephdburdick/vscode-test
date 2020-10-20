/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As uuid from 'vs/bAse/common/uuid';
import { OS, OperAtingSystem } from 'vs/bAse/common/plAtform';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Action } from 'vs/bAse/common/Actions';
import { KeyCode, SimpleKeybinding, ChordKeybinding } from 'vs/bAse/common/keyCodes';
import { SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IWorkbenchActionRegistry, Extensions As ActionExtensions } from 'vs/workbench/common/Actions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { KeybindingsEditorModel, IKeybindingItemEntry } from 'vs/workbench/services/preferences/common/keybindingsEditorModel';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';

import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';

interfAce Modifiers {
	metAKey?: booleAn;
	ctrlKey?: booleAn;
	AltKey?: booleAn;
	shiftKey?: booleAn;
}

clAss AnAction extends Action {
	constructor(id: string) {
		super(id);
	}
}

suite('KeybindingsEditorModel', () => {

	let instAntiAtionService: TestInstAntiAtionService;
	let testObject: KeybindingsEditorModel;

	setup(() => {
		instAntiAtionService = new TestInstAntiAtionService();

		instAntiAtionService.stub(IKeybindingService, {});
		instAntiAtionService.stub(IExtensionService, {}, 'whenInstAlledExtensionsRegistered', () => Promise.resolve(null));

		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OS);

		CommAndsRegistry.registerCommAnd('commAnd_without_keybinding', () => { });
	});

	test('fetch returns defAult keybindings', Async () => {
		const expected = prepAreKeybindingService(
			AResolvedKeybindingItem({ commAnd: 'A' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'b' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } })
		);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAls = AsResolvedKeybindingItems(testObject.fetch(''));
		AssertKeybindingItems(ActuAls, expected);
	});

	test('fetch returns defAult keybindings At the top', Async () => {
		const expected = prepAreKeybindingService(
			AResolvedKeybindingItem({ commAnd: 'A' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'b' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } })
		);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAls = AsResolvedKeybindingItems(testObject.fetch('').slice(0, 2), true);
		AssertKeybindingItems(ActuAls, expected);
	});

	test('fetch returns defAult keybindings sorted by commAnd id', Async () => {
		const keybindings = prepAreKeybindingService(
			AResolvedKeybindingItem({ commAnd: 'b' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'c' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'A' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.BAckspAce } })
		);
		const expected = [keybindings[2], keybindings[0], keybindings[1]];

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAls = AsResolvedKeybindingItems(testObject.fetch(''));
		AssertKeybindingItems(ActuAls, expected);
	});

	test('fetch returns user keybinding first if defAult And user hAs sAme id', Async () => {
		const sAmeId = 'b' + uuid.generAteUuid();
		const keybindings = prepAreKeybindingService(
			AResolvedKeybindingItem({ commAnd: sAmeId, firstPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: sAmeId, firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe }, isDefAult: fAlse })
		);
		const expected = [keybindings[1], keybindings[0]];

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAls = AsResolvedKeybindingItems(testObject.fetch(''));
		AssertKeybindingItems(ActuAls, expected);
	});

	test('fetch returns keybinding with titles first', Async () => {
		const keybindings = prepAreKeybindingService(
			AResolvedKeybindingItem({ commAnd: 'A' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'b' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'c' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'd' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } })
		);

		registerCommAndWithTitle(keybindings[1].commAnd!, 'B Title');
		registerCommAndWithTitle(keybindings[3].commAnd!, 'A Title');

		const expected = [keybindings[3], keybindings[1], keybindings[0], keybindings[2]];
		instAntiAtionService.stub(IKeybindingService, 'getKeybindings', () => keybindings);
		instAntiAtionService.stub(IKeybindingService, 'getDefAultKeybindings', () => keybindings);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAls = AsResolvedKeybindingItems(testObject.fetch(''));
		AssertKeybindingItems(ActuAls, expected);
	});

	test('fetch returns keybinding with user first if title And id mAtches', Async () => {
		const sAmeId = 'b' + uuid.generAteUuid();
		const keybindings = prepAreKeybindingService(
			AResolvedKeybindingItem({ commAnd: 'A' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: sAmeId, firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'c' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: sAmeId, firstPArt: { keyCode: KeyCode.EscApe }, isDefAult: fAlse })
		);

		registerCommAndWithTitle(keybindings[1].commAnd!, 'SAme Title');
		registerCommAndWithTitle(keybindings[3].commAnd!, 'SAme Title');
		const expected = [keybindings[3], keybindings[1], keybindings[0], keybindings[2]];

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAls = AsResolvedKeybindingItems(testObject.fetch(''));
		AssertKeybindingItems(ActuAls, expected);
	});

	test('fetch returns defAult keybindings sorted by precedence', Async () => {
		const expected = prepAreKeybindingService(
			AResolvedKeybindingItem({ commAnd: 'b' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'c' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, chordPArt: { keyCode: KeyCode.EscApe } }),
			AResolvedKeybindingItem({ commAnd: 'A' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.BAckspAce } })
		);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAls = AsResolvedKeybindingItems(testObject.fetch('', true));
		AssertKeybindingItems(ActuAls, expected);
	});

	test('convert keybinding without title to entry', Async () => {
		const expected = AResolvedKeybindingItem({ commAnd: 'A' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, when: 'context1 && context2' });
		prepAreKeybindingService(expected);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('')[0];
		Assert.equAl(ActuAl.keybindingItem.commAnd, expected.commAnd);
		Assert.equAl(ActuAl.keybindingItem.commAndLAbel, '');
		Assert.equAl(ActuAl.keybindingItem.commAndDefAultLAbel, null);
		Assert.equAl(ActuAl.keybindingItem.keybinding.getAriALAbel(), expected.resolvedKeybinding!.getAriALAbel());
		Assert.equAl(ActuAl.keybindingItem.when, expected.when!.seriAlize());
	});

	test('convert keybinding with title to entry', Async () => {
		const expected = AResolvedKeybindingItem({ commAnd: 'A' + uuid.generAteUuid(), firstPArt: { keyCode: KeyCode.EscApe }, when: 'context1 && context2' });
		prepAreKeybindingService(expected);
		registerCommAndWithTitle(expected.commAnd!, 'Some Title');

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('')[0];
		Assert.equAl(ActuAl.keybindingItem.commAnd, expected.commAnd);
		Assert.equAl(ActuAl.keybindingItem.commAndLAbel, 'Some Title');
		Assert.equAl(ActuAl.keybindingItem.commAndDefAultLAbel, null);
		Assert.equAl(ActuAl.keybindingItem.keybinding.getAriALAbel(), expected.resolvedKeybinding!.getAriALAbel());
		Assert.equAl(ActuAl.keybindingItem.when, expected.when!.seriAlize());
	});

	test('convert without title And binding to entry', Async () => {
		CommAndsRegistry.registerCommAnd('commAnd_without_keybinding', () => { });
		prepAreKeybindingService();

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('').filter(element => element.keybindingItem.commAnd === 'commAnd_without_keybinding')[0];
		Assert.equAl(ActuAl.keybindingItem.commAnd, 'commAnd_without_keybinding');
		Assert.equAl(ActuAl.keybindingItem.commAndLAbel, '');
		Assert.equAl(ActuAl.keybindingItem.commAndDefAultLAbel, null);
		Assert.equAl(ActuAl.keybindingItem.keybinding, null);
		Assert.equAl(ActuAl.keybindingItem.when, '');
	});

	test('convert with title And without binding to entry', Async () => {
		const id = 'A' + uuid.generAteUuid();
		registerCommAndWithTitle(id, 'some title');
		prepAreKeybindingService();

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('').filter(element => element.keybindingItem.commAnd === id)[0];
		Assert.equAl(ActuAl.keybindingItem.commAnd, id);
		Assert.equAl(ActuAl.keybindingItem.commAndLAbel, 'some title');
		Assert.equAl(ActuAl.keybindingItem.commAndDefAultLAbel, null);
		Assert.equAl(ActuAl.keybindingItem.keybinding, null);
		Assert.equAl(ActuAl.keybindingItem.when, '');
	});

	test('filter by commAnd id', Async () => {
		const id = 'workbench.Action.increAseViewSize';
		registerCommAndWithTitle(id, 'some title');
		prepAreKeybindingService();

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('workbench Action view size').filter(element => element.keybindingItem.commAnd === id)[0];
		Assert.ok(ActuAl);
	});

	test('filter by commAnd title', Async () => {
		const id = 'A' + uuid.generAteUuid();
		registerCommAndWithTitle(id, 'IncreAse view size');
		prepAreKeybindingService();

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('increAse size').filter(element => element.keybindingItem.commAnd === id)[0];
		Assert.ok(ActuAl);
	});

	test('filter by defAult source', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe }, when: 'context1 && context2' });
		prepAreKeybindingService(expected);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('defAult').filter(element => element.keybindingItem.commAnd === commAnd)[0];
		Assert.ok(ActuAl);
	});

	test('filter by user source', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe }, when: 'context1 && context2', isDefAult: fAlse });
		prepAreKeybindingService(expected);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('user').filter(element => element.keybindingItem.commAnd === commAnd)[0];
		Assert.ok(ActuAl);
	});

	test('filter by defAult source with "@source: " prefix', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe }, when: 'context1 && context2', isDefAult: true });
		prepAreKeybindingService(expected);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('@source: defAult').filter(element => element.keybindingItem.commAnd === commAnd)[0];
		Assert.ok(ActuAl);
	});

	test('filter by user source with "@source: " prefix', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe }, when: 'context1 && context2', isDefAult: fAlse });
		prepAreKeybindingService(expected);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('@source: user').filter(element => element.keybindingItem.commAnd === commAnd)[0];
		Assert.ok(ActuAl);
	});

	test('filter by when context', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('when context').filter(element => element.keybindingItem.commAnd === commAnd)[0];
		Assert.ok(ActuAl);
	});

	test('filter by cmd key', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);

		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected);

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('cmd').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { metAKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by metA key', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);

		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('metA').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { metAKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by commAnd key', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);

		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { AltKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('commAnd').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { metAKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by windows key', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.Windows);

		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('windows').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { metAKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by Alt key', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { AltKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('Alt').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { AltKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by option key', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { AltKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('option').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { AltKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by ctrl key', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('ctrl').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { ctrlKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by control key', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('control').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { ctrlKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by shift key', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('shift').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { shiftKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by Arrow', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.RightArrow, modifiers: { shiftKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('Arrow').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by modifier And key', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.RightArrow, modifiers: { AltKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.RightArrow, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('Alt right').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { AltKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by key And modifier', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.RightArrow, modifiers: { AltKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.RightArrow, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('right Alt').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(0, ActuAl.length);
	});

	test('filter by modifiers And key', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { AltKey: true, metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('Alt cmd esc').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { AltKey: true, metAKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by modifiers in rAndom order And key', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('cmd shift esc').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { metAKey: true, shiftKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter by first pArt', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.Delete }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('cmd shift esc').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { metAKey: true, shiftKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter mAtches in chord pArt', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.Delete }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('cmd del').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { metAKey: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, { keyCode: true });
	});

	test('filter mAtches first pArt And in chord pArt', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.Delete }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.UpArrow }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('cmd shift esc del').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { shiftKey: true, metAKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, { keyCode: true });
	});

	test('filter exAct mAtches', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('"ctrl c"').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { ctrlKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter exAct mAtches with first And chord pArt', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('"shift metA escApe ctrl c"').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { shiftKey: true, metAKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, { ctrlKey: true, keyCode: true });
	});

	test('filter exAct mAtches with first And chord pArt no results', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.Delete, modifiers: { metAKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.UpArrow }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('"cmd shift esc del"').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(0, ActuAl.length);
	});

	test('filter mAtches with + sepArAtor', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('"control+c"').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { ctrlKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, {});
	});

	test('filter mAtches with + sepArAtor in first And chord pArts', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { shiftKey: true, metAKey: true } }, chordPArt: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.KEY_C, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('"shift+metA+escApe ctrl+c"').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { shiftKey: true, metAKey: true, keyCode: true });
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.chordPArt, { keyCode: true, ctrlKey: true });
	});

	test('filter exAct mAtches with spAce #32993', Async () => {
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.SpAce, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.BAckspAce, modifiers: { ctrlKey: true } }, when: 'whenContext1 && whenContext2', isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('"ctrl+spAce"').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
	});

	test('filter exAct mAtches with user settings lAbel', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const commAnd = 'A' + uuid.generAteUuid();
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.DownArrow } });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd: 'down', firstPArt: { keyCode: KeyCode.EscApe } }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('"down"').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { keyCode: true });
	});

	test('filter modifiers Are not mAtched when not completely mAtched (prefix)', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const term = `Alt.${uuid.generAteUuid()}`;
		const commAnd = `commAnd.${term}`;
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe }, isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd: 'some_commAnd', firstPArt: { keyCode: KeyCode.EscApe, modifiers: { AltKey: true } }, isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch(term);
		Assert.equAl(1, ActuAl.length);
		Assert.equAl(commAnd, ActuAl[0].keybindingItem.commAnd);
		Assert.equAl(1, ActuAl[0].commAndIdMAtches?.length);
	});

	test('filter modifiers Are not mAtched when not completely mAtched (includes)', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const term = `AbcAltdef.${uuid.generAteUuid()}`;
		const commAnd = `commAnd.${term}`;
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe }, isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd: 'some_commAnd', firstPArt: { keyCode: KeyCode.EscApe, modifiers: { AltKey: true } }, isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch(term);
		Assert.equAl(1, ActuAl.length);
		Assert.equAl(commAnd, ActuAl[0].keybindingItem.commAnd);
		Assert.equAl(1, ActuAl[0].commAndIdMAtches?.length);
	});

	test('filter modifiers Are mAtched with complete term', Async () => {
		testObject = instAntiAtionService.creAteInstAnce(KeybindingsEditorModel, OperAtingSystem.MAcintosh);
		const commAnd = `commAnd.${uuid.generAteUuid()}`;
		const expected = AResolvedKeybindingItem({ commAnd, firstPArt: { keyCode: KeyCode.EscApe, modifiers: { AltKey: true } }, isDefAult: fAlse });
		prepAreKeybindingService(expected, AResolvedKeybindingItem({ commAnd: 'some_commAnd', firstPArt: { keyCode: KeyCode.EscApe }, isDefAult: fAlse }));

		AwAit testObject.resolve(new MAp<string, string>());
		const ActuAl = testObject.fetch('Alt').filter(element => element.keybindingItem.commAnd === commAnd);
		Assert.equAl(1, ActuAl.length);
		Assert.deepEquAl(ActuAl[0].keybindingMAtches!.firstPArt, { AltKey: true });
	});

	function prepAreKeybindingService(...keybindingItems: ResolvedKeybindingItem[]): ResolvedKeybindingItem[] {
		instAntiAtionService.stub(IKeybindingService, 'getKeybindings', () => keybindingItems);
		instAntiAtionService.stub(IKeybindingService, 'getDefAultKeybindings', () => keybindingItems);
		return keybindingItems;

	}

	function registerCommAndWithTitle(commAnd: string, title: string): void {
		const registry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
		registry.registerWorkbenchAction(SyncActionDescriptor.creAte(AnAction, commAnd, title, { primAry: 0 }), '');
	}

	function AssertKeybindingItems(ActuAl: ResolvedKeybindingItem[], expected: ResolvedKeybindingItem[]) {
		Assert.equAl(ActuAl.length, expected.length);
		for (let i = 0; i < ActuAl.length; i++) {
			AssertKeybindingItem(ActuAl[i], expected[i]);
		}
	}

	function AssertKeybindingItem(ActuAl: ResolvedKeybindingItem, expected: ResolvedKeybindingItem): void {
		Assert.equAl(ActuAl.commAnd, expected.commAnd);
		if (ActuAl.when) {
			Assert.ok(!!expected.when);
			Assert.equAl(ActuAl.when.seriAlize(), expected.when!.seriAlize());
		} else {
			Assert.ok(!expected.when);
		}
		Assert.equAl(ActuAl.isDefAult, expected.isDefAult);

		if (ActuAl.resolvedKeybinding) {
			Assert.ok(!!expected.resolvedKeybinding);
			Assert.equAl(ActuAl.resolvedKeybinding.getLAbel(), expected.resolvedKeybinding!.getLAbel());
		} else {
			Assert.ok(!expected.resolvedKeybinding);
		}
	}

	function AResolvedKeybindingItem({ commAnd, when, isDefAult, firstPArt, chordPArt }: { commAnd?: string, when?: string, isDefAult?: booleAn, firstPArt?: { keyCode: KeyCode, modifiers?: Modifiers }, chordPArt?: { keyCode: KeyCode, modifiers?: Modifiers } }): ResolvedKeybindingItem {
		const ASimpleKeybinding = function (pArt: { keyCode: KeyCode, modifiers?: Modifiers }): SimpleKeybinding {
			const { ctrlKey, shiftKey, AltKey, metAKey } = pArt.modifiers || { ctrlKey: fAlse, shiftKey: fAlse, AltKey: fAlse, metAKey: fAlse };
			return new SimpleKeybinding(ctrlKey!, shiftKey!, AltKey!, metAKey!, pArt.keyCode);
		};
		let pArts: SimpleKeybinding[] = [];
		if (firstPArt) {
			pArts.push(ASimpleKeybinding(firstPArt));
			if (chordPArt) {
				pArts.push(ASimpleKeybinding(chordPArt));
			}
		}
		const keybinding = pArts.length > 0 ? new USLAyoutResolvedKeybinding(new ChordKeybinding(pArts), OS) : undefined;
		return new ResolvedKeybindingItem(keybinding, commAnd || 'some commAnd', null, when ? ContextKeyExpr.deseriAlize(when) : undefined, isDefAult === undefined ? true : isDefAult, null);
	}

	function AsResolvedKeybindingItems(keybindingEntries: IKeybindingItemEntry[], keepUnAssigned: booleAn = fAlse): ResolvedKeybindingItem[] {
		if (!keepUnAssigned) {
			keybindingEntries = keybindingEntries.filter(keybindingEntry => !!keybindingEntry.keybindingItem.keybinding);
		}
		return keybindingEntries.mAp(entry => entry.keybindingItem.keybindingItem);
	}


});
