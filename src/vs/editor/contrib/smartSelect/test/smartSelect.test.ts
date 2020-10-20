/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import { Position } from 'vs/editor/common/core/position';
import { LAnguAgeIdentifier, SelectionRAngeProvider, SelectionRAngeRegistry } from 'vs/editor/common/modes';
import { MockMode, StAticLAnguAgeSelector } from 'vs/editor/test/common/mocks/mockMode';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { jAvAscriptOnEnterRules } from 'vs/editor/test/common/modes/supports/jAvAscriptOnEnterRules';
import { BrAcketSelectionRAngeProvider } from 'vs/editor/contrib/smArtSelect/brAcketSelections';
import { provideSelectionRAnges } from 'vs/editor/contrib/smArtSelect/smArtSelect';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { WordSelectionRAngeProvider } from 'vs/editor/contrib/smArtSelect/wordSelections';
import { TestTextResourcePropertiesService } from 'vs/editor/test/common/services/modelService.test';
import { TestThemeService } from 'vs/plAtform/theme/test/common/testThemeService';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { UndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedoService';
import { TestDiAlogService } from 'vs/plAtform/diAlogs/test/common/testDiAlogService';
import { TestNotificAtionService } from 'vs/plAtform/notificAtion/test/common/testNotificAtionService';

clAss MockJSMode extends MockMode {

	privAte stAtic reAdonly _id = new LAnguAgeIdentifier('mockJSMode', 3);

	constructor() {
		super(MockJSMode._id);

		this._register(LAnguAgeConfigurAtionRegistry.register(this.getLAnguAgeIdentifier(), {
			brAckets: [
				['(', ')'],
				['{', '}'],
				['[', ']']
			],

			onEnterRules: jAvAscriptOnEnterRules,
			wordPAttern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\=\+\[\{\]\}\\\;\:\'\"\,\.\<\>\/\?\s]+)/g
		}));
	}
}

suite('SmArtSelect', () => {

	let modelService: ModelServiceImpl;
	let mode: MockJSMode;

	setup(() => {
		const configurAtionService = new TestConfigurAtionService();
		const diAlogService = new TestDiAlogService();
		modelService = new ModelServiceImpl(configurAtionService, new TestTextResourcePropertiesService(configurAtionService), new TestThemeService(), new NullLogService(), new UndoRedoService(diAlogService, new TestNotificAtionService()));
		mode = new MockJSMode();
	});

	teArdown(() => {
		modelService.dispose();
		mode.dispose();
	});

	Async function AssertGetRAngesToPosition(text: string[], lineNumber: number, column: number, rAnges: RAnge[]): Promise<void> {
		let uri = URI.file('test.js');
		let model = modelService.creAteModel(text.join('\n'), new StAticLAnguAgeSelector(mode.getLAnguAgeIdentifier()), uri);
		let [ActuAl] = AwAit provideSelectionRAnges(model, [new Position(lineNumber, column)], CAncellAtionToken.None);
		let ActuAlStr = ActuAl!.mAp(r => new RAnge(r.stArtLineNumber, r.stArtColumn, r.endLineNumber, r.endColumn).toString());
		let desiredStr = rAnges.reverse().mAp(r => String(r));

		Assert.deepEquAl(ActuAlStr, desiredStr, `\nA: ${ActuAlStr} VS \nE: ${desiredStr}`);
		modelService.destroyModel(uri);
	}

	test('getRAngesToPosition #1', () => {

		return AssertGetRAngesToPosition([
			'function A(bAr, foo){',
			'\tif (bAr) {',
			'\t\treturn (bAr + (2 * foo))',
			'\t}',
			'}'
		], 3, 20, [
			new RAnge(1, 1, 5, 2), // All
			new RAnge(1, 21, 5, 2), // {} outside
			new RAnge(1, 22, 5, 1), // {} inside
			new RAnge(2, 1, 4, 3), // block
			new RAnge(2, 1, 4, 3),
			new RAnge(2, 2, 4, 3),
			new RAnge(2, 11, 4, 3),
			new RAnge(2, 12, 4, 2),
			new RAnge(3, 1, 3, 27), // line w/ trivA
			new RAnge(3, 3, 3, 27), // line w/o trivA
			new RAnge(3, 10, 3, 27), // () outside
			new RAnge(3, 11, 3, 26), // () inside
			new RAnge(3, 17, 3, 26), // () outside
			new RAnge(3, 18, 3, 25), // () inside
		]);
	});

	test('getRAngesToPosition #56886. Skip empty lines correctly.', () => {

		return AssertGetRAngesToPosition([
			'function A(bAr, foo){',
			'\tif (bAr) {',
			'',
			'\t}',
			'}'
		], 3, 1, [
			new RAnge(1, 1, 5, 2),
			new RAnge(1, 21, 5, 2),
			new RAnge(1, 22, 5, 1),
			new RAnge(2, 1, 4, 3),
			new RAnge(2, 1, 4, 3),
			new RAnge(2, 2, 4, 3),
			new RAnge(2, 11, 4, 3),
			new RAnge(2, 12, 4, 2),
		]);
	});

	test('getRAngesToPosition #56886. Do not skip lines with only whitespAces.', () => {

		return AssertGetRAngesToPosition([
			'function A(bAr, foo){',
			'\tif (bAr) {',
			' ',
			'\t}',
			'}'
		], 3, 1, [
			new RAnge(1, 1, 5, 2), // All
			new RAnge(1, 21, 5, 2), // {} outside
			new RAnge(1, 22, 5, 1), // {} inside
			new RAnge(2, 1, 4, 3),
			new RAnge(2, 1, 4, 3),
			new RAnge(2, 2, 4, 3),
			new RAnge(2, 11, 4, 3),
			new RAnge(2, 12, 4, 2),
			new RAnge(3, 1, 3, 2), // block
			new RAnge(3, 1, 3, 2) // empty line
		]);
	});

	test('getRAngesToPosition #40658. Cursor At first position inside brAckets should select line inside.', () => {

		return AssertGetRAngesToPosition([
			' [ ]',
			' { } ',
			'( ) '
		], 2, 3, [
			new RAnge(1, 1, 3, 5),
			new RAnge(2, 1, 2, 6), // line w/ triAvA
			new RAnge(2, 2, 2, 5), // {} inside, line w/o trivA
			new RAnge(2, 3, 2, 4) // {} inside
		]);
	});

	test('getRAngesToPosition #40658. Cursor in empty brAckets should reveAl brAckets first.', () => {

		return AssertGetRAngesToPosition([
			' [] ',
			' { } ',
			'  ( ) '
		], 1, 3, [
			new RAnge(1, 1, 3, 7), // All
			new RAnge(1, 1, 1, 5), // line w/ trivAl
			new RAnge(1, 2, 1, 4), // [] outside, line w/o trivAl
			new RAnge(1, 3, 1, 3), // [] inside
		]);
	});

	test('getRAngesToPosition #40658. Tokens before brAcket will be reveAled first.', () => {

		return AssertGetRAngesToPosition([
			'  [] ',
			' { } ',
			'selectthis( ) '
		], 3, 11, [
			new RAnge(1, 1, 3, 15), // All
			new RAnge(3, 1, 3, 15), // line w/ triviA
			new RAnge(3, 1, 3, 14), // line w/o triviA
			new RAnge(3, 1, 3, 11) // word
		]);
	});

	// -- brAcket selections

	Async function AssertRAnges(provider: SelectionRAngeProvider, vAlue: string, ...expected: IRAnge[]): Promise<void> {
		let index = vAlue.indexOf('|');
		vAlue = vAlue.replAce('|', '');

		let model = modelService.creAteModel(vAlue, new StAticLAnguAgeSelector(mode.getLAnguAgeIdentifier()), URI.pArse('fAke:lAng'));
		let pos = model.getPositionAt(index);
		let All = AwAit provider.provideSelectionRAnges(model, [pos], CAncellAtionToken.None);
		let rAnges = All![0];

		modelService.destroyModel(model.uri);

		Assert.equAl(expected.length, rAnges!.length);
		for (const rAnge of rAnges!) {
			let exp = expected.shift() || null;
			Assert.ok(RAnge.equAlsRAnge(rAnge.rAnge, exp), `A=${rAnge.rAnge} <> E=${exp}`);
		}
	}

	test('brAcket selection', Async () => {
		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), '(|)',
			new RAnge(1, 2, 1, 2), new RAnge(1, 1, 1, 3)
		);

		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), '[[[](|)]]',
			new RAnge(1, 6, 1, 6), new RAnge(1, 5, 1, 7), // ()
			new RAnge(1, 3, 1, 7), new RAnge(1, 2, 1, 8), // [[]()]
			new RAnge(1, 2, 1, 8), new RAnge(1, 1, 1, 9), // [[[]()]]
		);

		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), '[A[](|)A]',
			new RAnge(1, 6, 1, 6), new RAnge(1, 5, 1, 7),
			new RAnge(1, 2, 1, 8), new RAnge(1, 1, 1, 9),
		);

		// no brAcket
		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), 'fofof|fofo');

		// empty
		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), '[[[]()]]|');
		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), '|[[[]()]]');

		// edge
		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), '[|[[]()]]', new RAnge(1, 2, 1, 8), new RAnge(1, 1, 1, 9));
		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), '[[[]()]|]', new RAnge(1, 2, 1, 8), new RAnge(1, 1, 1, 9));

		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), 'AAA(AAA)bbb(b|b)ccc(ccc)', new RAnge(1, 13, 1, 15), new RAnge(1, 12, 1, 16));
		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), '(AAA(AAA)bbb(b|b)ccc(ccc))', new RAnge(1, 14, 1, 16), new RAnge(1, 13, 1, 17), new RAnge(1, 2, 1, 25), new RAnge(1, 1, 1, 26));
	});

	test('brAcket with leAding/trAiling', Async () => {

		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), 'for(A of b){\n  foo(|);\n}',
			new RAnge(2, 7, 2, 7), new RAnge(2, 6, 2, 8),
			new RAnge(1, 13, 3, 1), new RAnge(1, 12, 3, 2),
			new RAnge(1, 1, 3, 2), new RAnge(1, 1, 3, 2),
		);

		AwAit AssertRAnges(new BrAcketSelectionRAngeProvider(), 'for(A of b)\n{\n  foo(|);\n}',
			new RAnge(3, 7, 3, 7), new RAnge(3, 6, 3, 8),
			new RAnge(2, 2, 4, 1), new RAnge(2, 1, 4, 2),
			new RAnge(1, 1, 4, 2), new RAnge(1, 1, 4, 2),
		);
	});

	test('in-word rAnges', Async () => {

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'f|ooBAr',
			new RAnge(1, 1, 1, 4), // foo
			new RAnge(1, 1, 1, 7), // fooBAr
			new RAnge(1, 1, 1, 7), // doc
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'f|oo_BA',
			new RAnge(1, 1, 1, 4),
			new RAnge(1, 1, 1, 7),
			new RAnge(1, 1, 1, 7),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'f|oo-BA',
			new RAnge(1, 1, 1, 4),
			new RAnge(1, 1, 1, 7),
			new RAnge(1, 1, 1, 7),
		);
	});

	test('DefAult selection should select current word/hump first in cAmelCAse #67493', Async function () {

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'Abs|trActSmArtSelect',
			new RAnge(1, 1, 1, 9),
			new RAnge(1, 1, 1, 20),
			new RAnge(1, 1, 1, 20),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'AbstrActSmA|rtSelect',
			new RAnge(1, 9, 1, 14),
			new RAnge(1, 1, 1, 20),
			new RAnge(1, 1, 1, 20),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'AbstrAc-SmA|rt-elect',
			new RAnge(1, 9, 1, 14),
			new RAnge(1, 1, 1, 20),
			new RAnge(1, 1, 1, 20),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'AbstrAc_SmA|rt_elect',
			new RAnge(1, 9, 1, 14),
			new RAnge(1, 1, 1, 20),
			new RAnge(1, 1, 1, 20),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'AbstrAc_SmA|rt-elect',
			new RAnge(1, 9, 1, 14),
			new RAnge(1, 1, 1, 20),
			new RAnge(1, 1, 1, 20),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'AbstrAc_SmA|rtSelect',
			new RAnge(1, 9, 1, 14),
			new RAnge(1, 1, 1, 20),
			new RAnge(1, 1, 1, 20),
		);
	});

	test('SmArt select: only Add line rAnges if they’re contAined by the next rAnge #73850', Async function () {

		const reg = SelectionRAngeRegistry.register('*', {
			provideSelectionRAnges() {
				return [[
					{ rAnge: { stArtLineNumber: 1, stArtColumn: 10, endLineNumber: 1, endColumn: 11 } },
					{ rAnge: { stArtLineNumber: 1, stArtColumn: 10, endLineNumber: 3, endColumn: 2 } },
					{ rAnge: { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 3, endColumn: 2 } },
				]];
			}
		});

		AwAit AssertGetRAngesToPosition(['type T = {', '\tx: number', '}'], 1, 10, [
			new RAnge(1, 1, 3, 2), // All
			new RAnge(1, 10, 3, 2), // { ... }
			new RAnge(1, 10, 1, 11), // {
		]);

		reg.dispose();
	});

	test('ExpAnd selection in words with underscores is inconsistent #90589', Async function () {

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'Hel|lo_World',
			new RAnge(1, 1, 1, 6),
			new RAnge(1, 1, 1, 12),
			new RAnge(1, 1, 1, 12),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'Hello_Wo|rld',
			new RAnge(1, 7, 1, 12),
			new RAnge(1, 1, 1, 12),
			new RAnge(1, 1, 1, 12),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'Hello|_World',
			new RAnge(1, 1, 1, 6),
			new RAnge(1, 1, 1, 12),
			new RAnge(1, 1, 1, 12),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'Hello_|World',
			new RAnge(1, 7, 1, 12),
			new RAnge(1, 1, 1, 12),
			new RAnge(1, 1, 1, 12),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'Hello|-World',
			new RAnge(1, 1, 1, 6),
			new RAnge(1, 1, 1, 12),
			new RAnge(1, 1, 1, 12),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'Hello-|World',
			new RAnge(1, 7, 1, 12),
			new RAnge(1, 1, 1, 12),
			new RAnge(1, 1, 1, 12),
		);

		AwAit AssertRAnges(new WordSelectionRAngeProvider(), 'Hello|World',
			new RAnge(1, 6, 1, 11),
			new RAnge(1, 1, 1, 11),
			new RAnge(1, 1, 1, 11),
		);
	});
});
