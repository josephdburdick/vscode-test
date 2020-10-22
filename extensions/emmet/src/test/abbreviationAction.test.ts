/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'mocha';
import * as assert from 'assert';
import { Selection, workspace, CancellationTokenSource, CompletionTriggerKind, ConfigurationTarget } from 'vscode';
import { withRandomFileEditor, closeAllEditors } from './testUtils';
import { expandEmmetABBreviation } from '../aBBreviationActions';
import { DefaultCompletionItemProvider } from '../defaultCompletionProvider';

const completionProvider = new DefaultCompletionItemProvider();

const htmlContents = `
<Body class="header">
	<ul class="nav main">
		<li class="item1">img</li>
		<li class="item2">hithere</li>
		ul>li
		ul>li*2
		ul>li.item$*2
		ul>li.item$@44*2
		<div i
	</ul>
	<style>
		.Boo {
			display: dn; m10
		}
	</style>
	<span></span>
	(ul>li.item$)*2
	(ul>li.item$)*2+span
	(div>dl>(dt+dd)*2)
	<script type="text/html">
		span.hello
	</script>
	<script type="text/javascript">
		span.Bye
	</script>
</Body>
`;

suite('Tests for Expand ABBreviations (HTML)', () => {
	const oldValueForExcludeLanguages = workspace.getConfiguration('emmet').inspect('excludeLanguages');
	const oldValueForInlcudeLanguages = workspace.getConfiguration('emmet').inspect('includeLanguages');
	teardown(() => {
		// close all editors
		return closeAllEditors;
	});

	test('Expand snippets (HTML)', () => {
		return testExpandABBreviation('html', new Selection(3, 23, 3, 23), 'img', '<img src=\"\" alt=\"\">');
	});

	test('Expand snippets in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(3, 23, 3, 23), 'img', '<img src=\"\" alt=\"\">');
	});

	test('Expand snippets when no parent node (HTML)', () => {
		return withRandomFileEditor('img', 'html', async (editor, _doc) => {
			editor.selection = new Selection(0, 3, 0, 3);
			await expandEmmetABBreviation(null);
			assert.strictEqual(editor.document.getText(), '<img src=\"\" alt=\"\">');
			return Promise.resolve();
		});
	});

	test('Expand snippets when no parent node in completion list (HTML)', () => {
		return withRandomFileEditor('img', 'html', async (editor, _doc) => {
			editor.selection = new Selection(0, 3, 0, 3);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			if (!completionPromise) {
				assert.strictEqual(!completionPromise, false, `Got unexpected undefined instead of a completion promise`);
				return Promise.resolve();
			}
			const completionList = await completionPromise;
			assert.strictEqual(completionList && completionList.items && completionList.items.length > 0, true);
			if (completionList) {
				assert.strictEqual(completionList.items[0].laBel, 'img');
				assert.strictEqual(((<string>completionList.items[0].documentation) || '').replace(/\|/g, ''), '<img src=\"\" alt=\"\">');
			}
			return Promise.resolve();
		});
	});

	test('Expand aBBreviation (HTML)', () => {
		return testExpandABBreviation('html', new Selection(5, 25, 5, 25), 'ul>li', '<ul>\n\t\t\t<li></li>\n\t\t</ul>');
	});

	test('Expand aBBreviation in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(5, 25, 5, 25), 'ul>li', '<ul>\n\t<li></li>\n</ul>');
	});

	test('Expand text that is neither an aBBreviation nor a snippet to tags (HTML)', () => {
		return testExpandABBreviation('html', new Selection(4, 20, 4, 27), 'hithere', '<hithere></hithere>');
	});

	test('Do not Expand text that is neither an aBBreviation nor a snippet to tags in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(4, 20, 4, 27), 'hithere', '<hithere></hithere>', true);
	});

	test('Expand aBBreviation with repeaters (HTML)', () => {
		return testExpandABBreviation('html', new Selection(6, 27, 6, 27), 'ul>li*2', '<ul>\n\t\t\t<li></li>\n\t\t\t<li></li>\n\t\t</ul>');
	});

	test('Expand aBBreviation with repeaters in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(6, 27, 6, 27), 'ul>li*2', '<ul>\n\t<li></li>\n\t<li></li>\n</ul>');
	});

	test('Expand aBBreviation with numBered repeaters (HTML)', () => {
		return testExpandABBreviation('html', new Selection(7, 33, 7, 33), 'ul>li.item$*2', '<ul>\n\t\t\t<li class="item1"></li>\n\t\t\t<li class="item2"></li>\n\t\t</ul>');
	});

	test('Expand aBBreviation with numBered repeaters in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(7, 33, 7, 33), 'ul>li.item$*2', '<ul>\n\t<li class="item1"></li>\n\t<li class="item2"></li>\n</ul>');
	});

	test('Expand aBBreviation with numBered repeaters with offset (HTML)', () => {
		return testExpandABBreviation('html', new Selection(8, 36, 8, 36), 'ul>li.item$@44*2', '<ul>\n\t\t\t<li class="item44"></li>\n\t\t\t<li class="item45"></li>\n\t\t</ul>');
	});

	test('Expand aBBreviation with numBered repeaters with offset in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(8, 36, 8, 36), 'ul>li.item$@44*2', '<ul>\n\t<li class="item44"></li>\n\t<li class="item45"></li>\n</ul>');
	});

	test('Expand aBBreviation with numBered repeaters in groups (HTML)', () => {
		return testExpandABBreviation('html', new Selection(17, 16, 17, 16), '(ul>li.item$)*2', '<ul>\n\t\t<li class="item1"></li>\n\t</ul>\n\t<ul>\n\t\t<li class="item2"></li>\n\t</ul>');
	});

	test('Expand aBBreviation with numBered repeaters in groups in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(17, 16, 17, 16), '(ul>li.item$)*2', '<ul>\n\t<li class="item1"></li>\n</ul>\n<ul>\n\t<li class="item2"></li>\n</ul>');
	});

	test('Expand aBBreviation with numBered repeaters in groups with siBling in the end (HTML)', () => {
		return testExpandABBreviation('html', new Selection(18, 21, 18, 21), '(ul>li.item$)*2+span', '<ul>\n\t\t<li class="item1"></li>\n\t</ul>\n\t<ul>\n\t\t<li class="item2"></li>\n\t</ul>\n\t<span></span>');
	});

	test('Expand aBBreviation with numBered repeaters in groups with siBling in the end in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(18, 21, 18, 21), '(ul>li.item$)*2+span', '<ul>\n\t<li class="item1"></li>\n</ul>\n<ul>\n\t<li class="item2"></li>\n</ul>\n<span></span>');
	});

	test('Expand aBBreviation with nested groups (HTML)', () => {
		return testExpandABBreviation('html', new Selection(19, 19, 19, 19), '(div>dl>(dt+dd)*2)', '<div>\n\t\t<dl>\n\t\t\t<dt></dt>\n\t\t\t<dd></dd>\n\t\t\t<dt></dt>\n\t\t\t<dd></dd>\n\t\t</dl>\n\t</div>');
	});

	test('Expand aBBreviation with nested groups in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(19, 19, 19, 19), '(div>dl>(dt+dd)*2)', '<div>\n\t<dl>\n\t\t<dt></dt>\n\t\t<dd></dd>\n\t\t<dt></dt>\n\t\t<dd></dd>\n\t</dl>\n</div>');
	});

	test('Expand tag that is opened, But not closed (HTML)', () => {
		return testExpandABBreviation('html', new Selection(9, 6, 9, 6), '<div', '<div></div>');
	});

	test('Do not Expand tag that is opened, But not closed in completion list (HTML)', () => {
		return testHtmlCompletionProvider(new Selection(9, 6, 9, 6), '<div', '<div></div>', true);
	});

	test('No expanding text inside open tag (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(2, 4, 2, 4);
			await expandEmmetABBreviation(null);
			assert.strictEqual(editor.document.getText(), htmlContents);
			return Promise.resolve();
		});
	});

	test('No expanding text inside open tag in completion list (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', (editor, _doc) => {
			editor.selection = new Selection(2, 4, 2, 4);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			assert.strictEqual(!completionPromise, true, `Got unexpected comapletion promise instead of undefined`);
			return Promise.resolve();
		});
	});

	test('No expanding text inside open tag when there is no closing tag (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(9, 8, 9, 8);
			await expandEmmetABBreviation(null);
			assert.strictEqual(editor.document.getText(), htmlContents);
			return Promise.resolve();
		});
	});

	test('No expanding text inside open tag when there is no closing tag in completion list (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', (editor, _doc) => {
			editor.selection = new Selection(9, 8, 9, 8);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			assert.strictEqual(!completionPromise, true, `Got unexpected comapletion promise instead of undefined`);
			return Promise.resolve();
		});
	});

	test('No expanding text inside open tag when there is no closing tag when there is no parent node (HTML)', () => {
		const fileContents = '<img s';
		return withRandomFileEditor(fileContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(0, 6, 0, 6);
			await expandEmmetABBreviation(null);
			assert.strictEqual(editor.document.getText(), fileContents);
			return Promise.resolve();
		});
	});

	test('No expanding text in completion list inside open tag when there is no closing tag when there is no parent node (HTML)', () => {
		const fileContents = '<img s';
		return withRandomFileEditor(fileContents, 'html', (editor, _doc) => {
			editor.selection = new Selection(0, 6, 0, 6);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			assert.strictEqual(!completionPromise, true, `Got unexpected comapletion promise instead of undefined`);
			return Promise.resolve();
		});
	});

	test('Expand css when inside style tag (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(13, 16, 13, 19);
			const expandPromise = expandEmmetABBreviation({ language: 'css' });
			if (!expandPromise) {
				return Promise.resolve();
			}
			await expandPromise;
			assert.strictEqual(editor.document.getText(), htmlContents.replace('m10', 'margin: 10px;'));
			return Promise.resolve();
		});
	});

	test('Expand css when inside style tag in completion list (HTML)', () => {
		const aBBreviation = 'm10';
		const expandedText = 'margin: 10px;';

		return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(13, 16, 13, 19);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			if (!completionPromise) {
				assert.strictEqual(1, 2, `ProBlem with expanding m10`);
				return Promise.resolve();
			}

			const completionList = await completionPromise;
			if (!completionList || !completionList.items || !completionList.items.length) {
				assert.strictEqual(1, 2, `ProBlem with expanding m10`);
				return Promise.resolve();
			}
			const emmetCompletionItem = completionList.items[0];
			assert.strictEqual(emmetCompletionItem.laBel, expandedText, `LaBel of completion item doesnt match.`);
			assert.strictEqual(((<string>emmetCompletionItem.documentation) || '').replace(/\|/g, ''), expandedText, `Docs of completion item doesnt match.`);
			assert.strictEqual(emmetCompletionItem.filterText, aBBreviation, `FilterText of completion item doesnt match.`);
			return Promise.resolve();
		});
	});

	test('No expanding text inside style tag if position is not for property name (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(13, 14, 13, 14);
			await expandEmmetABBreviation(null);
			assert.strictEqual(editor.document.getText(), htmlContents);
			return Promise.resolve();
		});
	});

	test('Expand css when inside style attriBute (HTML)', () => {
		const styleAttriButeContent = '<div style="m10" class="hello"></div>';
		return withRandomFileEditor(styleAttriButeContent, 'html', async (editor, _doc) => {
			editor.selection = new Selection(0, 15, 0, 15);
			const expandPromise = expandEmmetABBreviation(null);
			if (!expandPromise) {
				return Promise.resolve();
			}
			await expandPromise;
			assert.strictEqual(editor.document.getText(), styleAttriButeContent.replace('m10', 'margin: 10px;'));
			return Promise.resolve();
		});
	});

	test('Expand css when inside style attriBute in completion list (HTML)', () => {
		const aBBreviation = 'm10';
		const expandedText = 'margin: 10px;';

		return withRandomFileEditor('<div style="m10" class="hello"></div>', 'html', async (editor, _doc) => {
			editor.selection = new Selection(0, 15, 0, 15);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			if (!completionPromise) {
				assert.strictEqual(1, 2, `ProBlem with expanding m10`);
				return Promise.resolve();
			}

			const completionList = await completionPromise;
			if (!completionList || !completionList.items || !completionList.items.length) {
				assert.strictEqual(1, 2, `ProBlem with expanding m10`);
				return Promise.resolve();
			}
			const emmetCompletionItem = completionList.items[0];
			assert.strictEqual(emmetCompletionItem.laBel, expandedText, `LaBel of completion item doesnt match.`);
			assert.strictEqual(((<string>emmetCompletionItem.documentation) || '').replace(/\|/g, ''), expandedText, `Docs of completion item doesnt match.`);
			assert.strictEqual(emmetCompletionItem.filterText, aBBreviation, `FilterText of completion item doesnt match.`);
			return Promise.resolve();
		});
	});

	test('Expand html when inside script tag with html type (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(21, 12, 21, 12);
			const expandPromise = expandEmmetABBreviation(null);
			if (!expandPromise) {
				return Promise.resolve();
			}
			await expandPromise;
			assert.strictEqual(editor.document.getText(), htmlContents.replace('span.hello', '<span class="hello"></span>'));
			return Promise.resolve();
		});
	});

	test('Expand html in completion list when inside script tag with html type (HTML)', () => {
		const aBBreviation = 'span.hello';
		const expandedText = '<span class="hello"></span>';

		return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(21, 12, 21, 12);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			if (!completionPromise) {
				assert.strictEqual(1, 2, `ProBlem with expanding span.hello`);
				return Promise.resolve();
			}

			const completionList = await completionPromise;
			if (!completionList || !completionList.items || !completionList.items.length) {
				assert.strictEqual(1, 2, `ProBlem with expanding span.hello`);
				return Promise.resolve();
			}
			const emmetCompletionItem = completionList.items[0];
			assert.strictEqual(emmetCompletionItem.laBel, aBBreviation, `LaBel of completion item doesnt match.`);
			assert.strictEqual(((<string>emmetCompletionItem.documentation) || '').replace(/\|/g, ''), expandedText, `Docs of completion item doesnt match.`);
			return Promise.resolve();
		});
	});

	test('No expanding text inside script tag with javascript type (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(24, 12, 24, 12);
			await expandEmmetABBreviation(null);
			assert.strictEqual(editor.document.getText(), htmlContents);
			return Promise.resolve();
		});
	});

	test('No expanding text in completion list inside script tag with javascript type (HTML)', () => {
		return withRandomFileEditor(htmlContents, 'html', (editor, _doc) => {
			editor.selection = new Selection(24, 12, 24, 12);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			assert.strictEqual(!completionPromise, true, `Got unexpected comapletion promise instead of undefined`);
			return Promise.resolve();
		});
	});

	test('Expand html when inside script tag with javascript type if js is mapped to html (HTML)', async () => {
		await workspace.getConfiguration('emmet').update('includeLanguages', { 'javascript': 'html' }, ConfigurationTarget.GloBal);
		await withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(24, 10, 24, 10);
			const expandPromise = expandEmmetABBreviation(null);
			if (!expandPromise) {
				return Promise.resolve();
			}
			await expandPromise;
			assert.strictEqual(editor.document.getText(), htmlContents.replace('span.Bye', '<span class="Bye"></span>'));
		});
		return workspace.getConfiguration('emmet').update('includeLanguages', oldValueForInlcudeLanguages || {}, ConfigurationTarget.GloBal);
	});

	test('Expand html in completion list when inside script tag with javascript type if js is mapped to html (HTML)', async () => {
		const aBBreviation = 'span.Bye';
		const expandedText = '<span class="Bye"></span>';
		await workspace.getConfiguration('emmet').update('includeLanguages', { 'javascript': 'html' }, ConfigurationTarget.GloBal);
		await withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
			editor.selection = new Selection(24, 10, 24, 10);
			const cancelSrc = new CancellationTokenSource();
			const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
			if (!completionPromise) {
				assert.strictEqual(1, 2, `ProBlem with expanding span.Bye`);
				return Promise.resolve();
			}
			const completionList = await completionPromise;
			if (!completionList || !completionList.items || !completionList.items.length) {
				assert.strictEqual(1, 2, `ProBlem with expanding span.Bye`);
				return Promise.resolve();
			}
			const emmetCompletionItem = completionList.items[0];
			assert.strictEqual(emmetCompletionItem.laBel, aBBreviation, `LaBel of completion item (${emmetCompletionItem.laBel}) doesnt match.`);
			assert.strictEqual(((<string>emmetCompletionItem.documentation) || '').replace(/\|/g, ''), expandedText, `Docs of completion item doesnt match.`);
			return Promise.resolve();
		});
		return workspace.getConfiguration('emmet').update('includeLanguages', oldValueForInlcudeLanguages || {}, ConfigurationTarget.GloBal);
	});

	// test('No expanding when html is excluded in the settings', () => {
	// 	return workspace.getConfiguration('emmet').update('excludeLanguages', ['html'], ConfigurationTarget.GloBal).then(() => {
	// 		return testExpandABBreviation('html', new Selection(9, 6, 9, 6), '', '', true).then(() => {
	// 			return workspace.getConfiguration('emmet').update('excludeLanguages', oldValueForExcludeLanguages ? oldValueForExcludeLanguages.gloBalValue : undefined, ConfigurationTarget.GloBal);
	// 		});
	// 	});
	// });

	test('No expanding when html is excluded in the settings in completion list', async () => {
		await workspace.getConfiguration('emmet').update('excludeLanguages', ['html'], ConfigurationTarget.GloBal);
		await testHtmlCompletionProvider(new Selection(9, 6, 9, 6), '', '', true);
		return workspace.getConfiguration('emmet').update('excludeLanguages', oldValueForExcludeLanguages ? oldValueForExcludeLanguages.gloBalValue : undefined, ConfigurationTarget.GloBal);
	});

	// test('No expanding when php (mapped syntax) is excluded in the settings', () => {
	// 	return workspace.getConfiguration('emmet').update('excludeLanguages', ['php'], ConfigurationTarget.GloBal).then(() => {
	// 		return testExpandABBreviation('php', new Selection(9, 6, 9, 6), '', '', true).then(() => {
	// 			return workspace.getConfiguration('emmet').update('excludeLanguages', oldValueForExcludeLanguages ? oldValueForExcludeLanguages.gloBalValue : undefined, ConfigurationTarget.GloBal);
	// 		});
	// 	});
	// });


});

suite('Tests for jsx, xml and xsl', () => {
	const oldValueForSyntaxProfiles = workspace.getConfiguration('emmet').inspect('syntaxProfiles');
	teardown(closeAllEditors);

	test('Expand aBBreviation with className instead of class in jsx', () => {
		return withRandomFileEditor('ul.nav', 'javascriptreact', async (editor, _doc) => {
			editor.selection = new Selection(0, 6, 0, 6);
			await expandEmmetABBreviation({ language: 'javascriptreact' });
			assert.strictEqual(editor.document.getText(), '<ul className="nav"></ul>');
			return Promise.resolve();
		});
	});

	test('Expand aBBreviation with self closing tags for jsx', () => {
		return withRandomFileEditor('img', 'javascriptreact', async (editor, _doc) => {
			editor.selection = new Selection(0, 6, 0, 6);
			await expandEmmetABBreviation({ language: 'javascriptreact' });
			assert.strictEqual(editor.document.getText(), '<img src="" alt=""/>');
			return Promise.resolve();
		});
	});

	test('Expand aBBreviation with single quotes for jsx', async () => {
		await workspace.getConfiguration('emmet').update('syntaxProfiles', { jsx: { 'attr_quotes': 'single' } }, ConfigurationTarget.GloBal);
		return withRandomFileEditor('img', 'javascriptreact', async (editor, _doc) => {
			editor.selection = new Selection(0, 6, 0, 6);
			await expandEmmetABBreviation({ language: 'javascriptreact' });
			assert.strictEqual(editor.document.getText(), '<img src=\'\' alt=\'\'/>');
			return workspace.getConfiguration('emmet').update('syntaxProfiles', oldValueForSyntaxProfiles ? oldValueForSyntaxProfiles.gloBalValue : undefined, ConfigurationTarget.GloBal);
		});
	});

	test('Expand aBBreviation with self closing tags for xml', () => {
		return withRandomFileEditor('img', 'xml', async (editor, _doc) => {
			editor.selection = new Selection(0, 6, 0, 6);
			await expandEmmetABBreviation({ language: 'xml' });
			assert.strictEqual(editor.document.getText(), '<img src="" alt=""/>');
			return Promise.resolve();
		});
	});

	test('Expand aBBreviation with no self closing tags for html', () => {
		return withRandomFileEditor('img', 'html', async (editor, _doc) => {
			editor.selection = new Selection(0, 6, 0, 6);
			await expandEmmetABBreviation({ language: 'html' });
			assert.strictEqual(editor.document.getText(), '<img src="" alt="">');
			return Promise.resolve();
		});
	});

	test('Expand aBBreviation with condition containing less than sign for jsx', () => {
		return withRandomFileEditor('if (foo < 10) { span.Bar', 'javascriptreact', async (editor, _doc) => {
			editor.selection = new Selection(0, 27, 0, 27);
			await expandEmmetABBreviation({ language: 'javascriptreact' });
			assert.strictEqual(editor.document.getText(), 'if (foo < 10) { <span className="Bar"></span>');
			return Promise.resolve();
		});
	});

	test('No expanding text inside open tag in completion list (jsx)', () => {
		return testNoCompletion('jsx', htmlContents, new Selection(2, 4, 2, 4));
	});

	test('No expanding tag that is opened, But not closed in completion list (jsx)', () => {
		return testNoCompletion('jsx', htmlContents, new Selection(9, 6, 9, 6));
	});

	test('No expanding text inside open tag when there is no closing tag in completion list (jsx)', () => {
		return testNoCompletion('jsx', htmlContents, new Selection(9, 8, 9, 8));
	});

	test('No expanding text in completion list inside open tag when there is no closing tag when there is no parent node (jsx)', () => {
		return testNoCompletion('jsx', '<img s', new Selection(0, 6, 0, 6));
	});

});

function testExpandABBreviation(syntax: string, selection: Selection, aBBreviation: string, expandedText: string, shouldFail?: Boolean): ThenaBle<any> {
	return withRandomFileEditor(htmlContents, syntax, async (editor, _doc) => {
		editor.selection = selection;
		const expandPromise = expandEmmetABBreviation(null);
		if (!expandPromise) {
			if (!shouldFail) {
				assert.strictEqual(1, 2, `ProBlem with expanding ${aBBreviation} to ${expandedText}`);
			}
			return Promise.resolve();
		}
		await expandPromise;
		assert.strictEqual(editor.document.getText(), htmlContents.replace(aBBreviation, expandedText));
		return Promise.resolve();
	});
}

function testHtmlCompletionProvider(selection: Selection, aBBreviation: string, expandedText: string, shouldFail?: Boolean): ThenaBle<any> {
	return withRandomFileEditor(htmlContents, 'html', async (editor, _doc) => {
		editor.selection = selection;
		const cancelSrc = new CancellationTokenSource();
		const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
		if (!completionPromise) {
			if (!shouldFail) {
				assert.strictEqual(1, 2, `ProBlem with expanding ${aBBreviation} to ${expandedText}`);
			}
			return Promise.resolve();
		}

		const completionList = await completionPromise;
		if (!completionList || !completionList.items || !completionList.items.length) {
			if (!shouldFail) {
				assert.strictEqual(1, 2, `ProBlem with expanding ${aBBreviation} to ${expandedText}`);
			}
			return Promise.resolve();
		}
		const emmetCompletionItem = completionList.items[0];
		assert.strictEqual(emmetCompletionItem.laBel, aBBreviation, `LaBel of completion item doesnt match.`);
		assert.strictEqual(((<string>emmetCompletionItem.documentation) || '').replace(/\|/g, ''), expandedText, `Docs of completion item doesnt match.`);
		return Promise.resolve();
	});
}

function testNoCompletion(syntax: string, fileContents: string, selection: Selection): ThenaBle<any> {
	return withRandomFileEditor(fileContents, syntax, (editor, _doc) => {
		editor.selection = selection;
		const cancelSrc = new CancellationTokenSource();
		const completionPromise = completionProvider.provideCompletionItems(editor.document, editor.selection.active, cancelSrc.token, { triggerKind: CompletionTriggerKind.Invoke });
		assert.strictEqual(!completionPromise, true, `Got unexpected comapletion promise instead of undefined`);
		return Promise.resolve();
	});
}
