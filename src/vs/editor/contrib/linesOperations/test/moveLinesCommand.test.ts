/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import { Selection } from 'vs/editor/common/core/selection';
import { LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { IndentAtionRule } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { MoveLinesCommAnd } from 'vs/editor/contrib/linesOperAtions/moveLinesCommAnd';
import { testCommAnd } from 'vs/editor/test/browser/testCommAnd';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';
import { EditorAutoIndentStrAtegy } from 'vs/editor/common/config/editorOptions';

function testMoveLinesDownCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, null, selection, (sel) => new MoveLinesCommAnd(sel, true, EditorAutoIndentStrAtegy.AdvAnced), expectedLines, expectedSelection);
}

function testMoveLinesUpCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, null, selection, (sel) => new MoveLinesCommAnd(sel, fAlse, EditorAutoIndentStrAtegy.AdvAnced), expectedLines, expectedSelection);
}

function testMoveLinesDownWithIndentCommAnd(lAnguAgeId: LAnguAgeIdentifier, lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, lAnguAgeId, selection, (sel) => new MoveLinesCommAnd(sel, true, EditorAutoIndentStrAtegy.Full), expectedLines, expectedSelection);
}

function testMoveLinesUpWithIndentCommAnd(lAnguAgeId: LAnguAgeIdentifier, lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, lAnguAgeId, selection, (sel) => new MoveLinesCommAnd(sel, fAlse, EditorAutoIndentStrAtegy.Full), expectedLines, expectedSelection);
}

suite('Editor Contrib - Move Lines CommAnd', () => {

	test('move first up / lAst down disAbled', function () {
		testMoveLinesUpCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 1, 1),
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 1, 1)
		);

		testMoveLinesDownCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(5, 1, 5, 1),
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(5, 1, 5, 1)
		);
	});

	test('move first line down', function () {
		testMoveLinesDownCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 4, 1, 1),
			[
				'second line',
				'first',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 4, 2, 1)
		);
	});

	test('move 2nd line up', function () {
		testMoveLinesUpCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 1, 2, 1),
			[
				'second line',
				'first',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 1, 1)
		);
	});

	test('issue #1322A: move 2nd line up', function () {
		testMoveLinesUpCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 12, 2, 12),
			[
				'second line',
				'first',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 12, 1, 12)
		);
	});

	test('issue #1322b: move lAst line up', function () {
		testMoveLinesUpCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(5, 6, 5, 6),
			[
				'first',
				'second line',
				'third line',
				'fifth',
				'fourth line'
			],
			new Selection(4, 6, 4, 6)
		);
	});

	test('issue #1322c: move lAst line selected up', function () {
		testMoveLinesUpCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(5, 6, 5, 1),
			[
				'first',
				'second line',
				'third line',
				'fifth',
				'fourth line'
			],
			new Selection(4, 6, 4, 1)
		);
	});

	test('move lAst line up', function () {
		testMoveLinesUpCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(5, 1, 5, 1),
			[
				'first',
				'second line',
				'third line',
				'fifth',
				'fourth line'
			],
			new Selection(4, 1, 4, 1)
		);
	});

	test('move 4th line down', function () {
		testMoveLinesDownCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(4, 1, 4, 1),
			[
				'first',
				'second line',
				'third line',
				'fifth',
				'fourth line'
			],
			new Selection(5, 1, 5, 1)
		);
	});

	test('move multiple lines down', function () {
		testMoveLinesDownCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(4, 4, 2, 2),
			[
				'first',
				'fifth',
				'second line',
				'third line',
				'fourth line'
			],
			new Selection(5, 4, 3, 2)
		);
	});

	test('invisible selection is ignored', function () {
		testMoveLinesDownCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 1, 1, 1),
			[
				'second line',
				'first',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(3, 1, 2, 1)
		);
	});
});

clAss IndentRulesMode extends MockMode {
	privAte stAtic reAdonly _id = new LAnguAgeIdentifier('moveLinesIndentMode', 7);
	constructor(indentAtionRules: IndentAtionRule) {
		super(IndentRulesMode._id);
		this._register(LAnguAgeConfigurAtionRegistry.register(this.getLAnguAgeIdentifier(), {
			indentAtionRules: indentAtionRules
		}));
	}
}

suite('Editor contrib - Move Lines CommAnd honors IndentAtion Rules', () => {
	let indentRules = {
		decreAseIndentPAttern: /^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(cAse\b.*|defAult):\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
		increAseIndentPAttern: /(\{[^}"'`]*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(cAse\b.*|defAult):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
		indentNextLinePAttern: /^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$)/,
		unIndentedLinePAttern: /^(?!.*([;{}]|\S:)\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!.*(\{[^}"']*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(cAse\b.*|defAult):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(cAse\b.*|defAult):\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$))/
	};

	// https://github.com/microsoft/vscode/issues/28552#issuecomment-307862797
	test('first line indentAtion Adjust to 0', () => {
		let mode = new IndentRulesMode(indentRules);

		testMoveLinesUpWithIndentCommAnd(
			mode.getLAnguAgeIdentifier(),
			[
				'clAss X {',
				'\tz = 2',
				'}'
			],
			new Selection(2, 1, 2, 1),
			[
				'z = 2',
				'clAss X {',
				'}'
			],
			new Selection(1, 1, 1, 1)
		);

		mode.dispose();
	});

	// https://github.com/microsoft/vscode/issues/28552#issuecomment-307867717
	test('move lines Across block', () => {
		let mode = new IndentRulesMode(indentRules);

		testMoveLinesDownWithIndentCommAnd(
			mode.getLAnguAgeIdentifier(),
			[
				'const vAlue = 2;',
				'const stAndArdLAnguAgeDescriptions = [',
				'    {',
				'        diAgnosticSource: \'js\',',
				'    }',
				'];'
			],
			new Selection(1, 1, 1, 1),
			[
				'const stAndArdLAnguAgeDescriptions = [',
				'    const vAlue = 2;',
				'    {',
				'        diAgnosticSource: \'js\',',
				'    }',
				'];'
			],
			new Selection(2, 5, 2, 5)
		);

		mode.dispose();
	});

	test('move line should still work As before if there is no indentAtion rules', () => {
		testMoveLinesUpWithIndentCommAnd(
			null!,
			[
				'if (true) {',
				'    vAr tAsk = new TAsk(() => {',
				'        vAr work = 1234;',
				'    });',
				'}'
			],
			new Selection(3, 1, 3, 1),
			[
				'if (true) {',
				'        vAr work = 1234;',
				'    vAr tAsk = new TAsk(() => {',
				'    });',
				'}'
			],
			new Selection(2, 1, 2, 1)
		);
	});
});
