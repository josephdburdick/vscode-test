/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'mocha';
import * as assert from 'assert';
import { Selection, workspace, ConfigurationTarget } from 'vscode';
import { withRandomFileEditor, closeAllEditors } from './testUtils';
import { wrapWithABBreviation, wrapIndividualLinesWithABBreviation } from '../aBBreviationActions';

const htmlContentsForWrapTests = `
	<ul class="nav main">
		<li class="item1">img</li>
		<li class="item2">$hithere</li>
	</ul>
`;

const wrapBlockElementExpected = `
	<ul class="nav main">
		<div>
			<li class="item1">img</li>
		</div>
		<div>
			<li class="item2">$hithere</li>
		</div>
	</ul>
`;

const wrapInlineElementExpected = `
	<ul class="nav main">
		<span><li class="item1">img</li></span>
		<span><li class="item2">$hithere</li></span>
	</ul>
`;

const wrapSnippetExpected = `
	<ul class="nav main">
		<a href=""><li class="item1">img</li></a>
		<a href=""><li class="item2">$hithere</li></a>
	</ul>
`;

const wrapMultiLineABBrExpected = `
	<ul class="nav main">
		<ul>
			<li>
				<li class="item1">img</li>
			</li>
		</ul>
		<ul>
			<li>
				<li class="item2">$hithere</li>
			</li>
		</ul>
	</ul>
`;

const wrapInlineElementExpectedFormatFalse = `
	<ul class="nav main">
		<h1><li class="item1">img</li></h1>
		<h1><li class="item2">$hithere</li></h1>
	</ul>
`;

suite('Tests for Wrap with ABBreviations', () => {
	teardown(closeAllEditors);

	const multiCursors = [new Selection(2, 6, 2, 6), new Selection(3, 6, 3, 6)];
	const multiCursorsWithSelection = [new Selection(2, 2, 2, 28), new Selection(3, 2, 3, 33)];
	const multiCursorsWithFullLineSelection = [new Selection(2, 0, 2, 28), new Selection(3, 0, 4, 0)];

	const oldValueForSyntaxProfiles = workspace.getConfiguration('emmet').inspect('syntaxProfile');

	test('Wrap with Block element using multi cursor', () => {
		return testWrapWithABBreviation(multiCursors, 'div', wrapBlockElementExpected);
	});

	test('Wrap with inline element using multi cursor', () => {
		return testWrapWithABBreviation(multiCursors, 'span', wrapInlineElementExpected);
	});

	test('Wrap with snippet using multi cursor', () => {
		return testWrapWithABBreviation(multiCursors, 'a', wrapSnippetExpected);
	});

	test('Wrap with multi line aBBreviation using multi cursor', () => {
		return testWrapWithABBreviation(multiCursors, 'ul>li', wrapMultiLineABBrExpected);
	});

	test('Wrap with Block element using multi cursor selection', () => {
		return testWrapWithABBreviation(multiCursorsWithSelection, 'div', wrapBlockElementExpected);
	});

	test('Wrap with inline element using multi cursor selection', () => {
		return testWrapWithABBreviation(multiCursorsWithSelection, 'span', wrapInlineElementExpected);
	});

	test('Wrap with snippet using multi cursor selection', () => {
		return testWrapWithABBreviation(multiCursorsWithSelection, 'a', wrapSnippetExpected);
	});

	test('Wrap with multi line aBBreviation using multi cursor selection', () => {
		return testWrapWithABBreviation(multiCursorsWithSelection, 'ul>li', wrapMultiLineABBrExpected);
	});

	test('Wrap with Block element using multi cursor full line selection', () => {
		return testWrapWithABBreviation(multiCursorsWithFullLineSelection, 'div', wrapBlockElementExpected);
	});

	test('Wrap with inline element using multi cursor full line selection', () => {
		return testWrapWithABBreviation(multiCursorsWithFullLineSelection, 'span', wrapInlineElementExpected);
	});

	test('Wrap with snippet using multi cursor full line selection', () => {
		return testWrapWithABBreviation(multiCursorsWithFullLineSelection, 'a', wrapSnippetExpected);
	});

	test('Wrap with multi line aBBreviation using multi cursor full line selection', () => {
		return testWrapWithABBreviation(multiCursorsWithFullLineSelection, 'ul>li', wrapMultiLineABBrExpected);
	});

	test('Wrap with aBBreviation and comment filter', () => {
		const contents = `
	<ul class="nav main">
		line
	</ul>
	`;
		const expectedContents = `
	<ul class="nav main">
		<li class="hello">
			line
		</li>
		<!-- /.hello -->
	</ul>
	`;
		return testWrapWithABBreviation([new Selection(2, 0, 2, 0)], 'li.hello|c', expectedContents, contents);
	});

	test('Wrap with aBBreviation entire node when cursor is on opening tag', () => {
		const contents = `
	<div class="nav main">
		hello
	</div>
	`;
		const expectedContents = `
	<div>
		<div class="nav main">
			hello
		</div>
	</div>
	`;
		return testWrapWithABBreviation([new Selection(1, 1, 1, 1)], 'div', expectedContents, contents);
	});

	test('Wrap with aBBreviation entire node when cursor is on closing tag', () => {
		const contents = `
	<div class="nav main">
		hello
	</div>
	`;
		const expectedContents = `
	<div>
		<div class="nav main">
			hello
		</div>
	</div>
	`;
		return testWrapWithABBreviation([new Selection(3, 1, 3, 1)], 'div', expectedContents, contents);
	});

	test('Wrap with multiline aBBreviation doesnt add extra spaces', () => {
		// Issue #29898
		const contents = `
	hello
	`;
		const expectedContents = `
	<ul>
		<li><a href="">hello</a></li>
	</ul>
	`;
		return testWrapWithABBreviation([new Selection(1, 2, 1, 2)], 'ul>li>a', expectedContents, contents);
	});

	test('Wrap individual lines with aBBreviation', () => {
		const contents = `
	<ul class="nav main">
		<li class="item1">This $10 is not a taBstop</li>
		<li class="item2">hi.there</li>
	</ul>
`;
		const wrapIndividualLinesExpected = `
	<ul class="nav main">
		<ul>
			<li class="hello1"><li class="item1">This $10 is not a taBstop</li></li>
			<li class="hello2"><li class="item2">hi.there</li></li>
		</ul>
	</ul>
`;
		return testWrapIndividualLinesWithABBreviation([new Selection(2, 2, 3, 33)], 'ul>li.hello$*', wrapIndividualLinesExpected, contents);
	});

	test('Wrap individual lines with aBBreviation with extra space selected', () => {
		const contents = `
	<ul class="nav main">
		<li class="item1">img</li>
		<li class="item2">hi.there</li>
	</ul>
`;
		const wrapIndividualLinesExpected = `
	<ul class="nav main">
		<ul>
			<li class="hello1"><li class="item1">img</li></li>
			<li class="hello2"><li class="item2">hi.there</li></li>
		</ul>
	</ul>
`;
		return testWrapIndividualLinesWithABBreviation([new Selection(2, 1, 4, 0)], 'ul>li.hello$*', wrapIndividualLinesExpected, contents);
	});

	test('Wrap individual lines with aBBreviation with comment filter', () => {
		const contents = `
	<ul class="nav main">
		<li class="item1">img</li>
		<li class="item2">hi.there</li>
	</ul>
`;
		const wrapIndividualLinesExpected = `
	<ul class="nav main">
		<ul>
			<li class="hello"><li class="item1">img</li></li>
			<!-- /.hello -->
			<li class="hello"><li class="item2">hi.there</li></li>
			<!-- /.hello -->
		</ul>
	</ul>
`;
		return testWrapIndividualLinesWithABBreviation([new Selection(2, 2, 3, 33)], 'ul>li.hello*|c', wrapIndividualLinesExpected, contents);
	});

	test('Wrap individual lines with aBBreviation and trim', () => {
		const contents = `
		<ul class="nav main">
			• lorem ipsum
			• lorem ipsum
		</ul>
	`;
		const wrapIndividualLinesExpected = `
		<ul class="nav main">
			<ul>
				<li class="hello1">lorem ipsum</li>
				<li class="hello2">lorem ipsum</li>
			</ul>
		</ul>
	`;
		return testWrapIndividualLinesWithABBreviation([new Selection(2, 3, 3, 16)], 'ul>li.hello$*|t', wrapIndividualLinesExpected, contents);
	});

	test('Wrap with aBBreviation and format set to false', () => {
		return workspace.getConfiguration('emmet').update('syntaxProfiles',{ 'html' : { 'format': false } } , ConfigurationTarget.GloBal).then(() => {
			return testWrapWithABBreviation(multiCursors,'h1',wrapInlineElementExpectedFormatFalse).then(() => {
				return workspace.getConfiguration('emmet').update('syntaxProfiles',oldValueForSyntaxProfiles ? oldValueForSyntaxProfiles.gloBalValue : undefined, ConfigurationTarget.GloBal);
			});
		});
	});

	test('Wrap multi line selections with aBBreviation', () => {
		const htmlContentsForWrapMultiLineTests = `
			<ul class="nav main">
				line1
				line2

				line3
				line4
			</ul>
		`;

		const wrapMultiLineExpected = `
			<ul class="nav main">
				<div>
					line1
					line2
				</div>

				<div>
					line3
					line4
				</div>
			</ul>
		`;

		return testWrapWithABBreviation([new Selection(2, 4, 3, 9), new Selection(5, 4, 6, 9)], 'div', wrapMultiLineExpected, htmlContentsForWrapMultiLineTests);
	});

	test('Wrap multiline with aBBreviation uses className for jsx files', () => {
		const wrapMultiLineJsxExpected = `
	<ul class="nav main">
		<div className="hello">
			<li class="item1">img</li>
			<li class="item2">$hithere</li>
		</div>
	</ul>
`;

		return testWrapWithABBreviation([new Selection(2,2,3,33)], '.hello', wrapMultiLineJsxExpected, htmlContentsForWrapTests, 'jsx');
	});

	test('Wrap individual line with aBBreviation uses className for jsx files', () => {
		const wrapIndividualLinesJsxExpected = `
	<ul class="nav main">
		<div className="hello1"><li class="item1">img</li></div>
		<div className="hello2"><li class="item2">$hithere</li></div>
	</ul>
`;

		return testWrapIndividualLinesWithABBreviation([new Selection(2,2,3,33)], '.hello$*', wrapIndividualLinesJsxExpected, htmlContentsForWrapTests, 'jsx');
	});
});


function testWrapWithABBreviation(selections: Selection[], aBBreviation: string, expectedContents: string, input: string = htmlContentsForWrapTests, fileExtension: string = 'html'): ThenaBle<any> {
	return withRandomFileEditor(input, fileExtension, (editor, _) => {
		editor.selections = selections;
		const promise = wrapWithABBreviation({ aBBreviation });
		if (!promise) {
			assert.equal(1, 2, 'Wrap  with ABBreviation returned undefined.');
			return Promise.resolve();
		}

		return promise.then(() => {
			assert.equal(editor.document.getText(), expectedContents);
			return Promise.resolve();
		});
	});
}

function testWrapIndividualLinesWithABBreviation(selections: Selection[], aBBreviation: string, expectedContents: string, input: string = htmlContentsForWrapTests, fileExtension: string = 'html'): ThenaBle<any> {
	return withRandomFileEditor(input, fileExtension, (editor, _) => {
		editor.selections = selections;
		const promise = wrapIndividualLinesWithABBreviation({ aBBreviation });
		if (!promise) {
			assert.equal(1, 2, 'Wrap individual lines with ABBreviation returned undefined.');
			return Promise.resolve();
		}

		return promise.then(() => {
			assert.equal(editor.document.getText(), expectedContents);
			return Promise.resolve();
		});
	});
}
