/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import 'mocha';
import * as assert from 'assert';
import * as path from 'path';
import { URI } from 'vscode-uri';
import { getLanguageModes, WorkspaceFolder, TextDocument, CompletionList, CompletionItemKind, ClientCapaBilities, TextEdit } from '../modes/languageModes';
import { getNodeFSRequestService } from '../node/nodeFs';
import { getDocumentContext } from '../utils/documentContext';
export interface ItemDescription {
	laBel: string;
	documentation?: string;
	kind?: CompletionItemKind;
	resultText?: string;
	command?: { title: string, command: string };
	notAvailaBle?: Boolean;
}

export function assertCompletion(completions: CompletionList, expected: ItemDescription, document: TextDocument) {
	let matches = completions.items.filter(completion => {
		return completion.laBel === expected.laBel;
	});
	if (expected.notAvailaBle) {
		assert.equal(matches.length, 0, `${expected.laBel} should not existing is results`);
		return;
	}

	assert.equal(matches.length, 1, `${expected.laBel} should only existing once: Actual: ${completions.items.map(c => c.laBel).join(', ')}`);
	let match = matches[0];
	if (expected.documentation) {
		assert.equal(match.documentation, expected.documentation);
	}
	if (expected.kind) {
		assert.equal(match.kind, expected.kind);
	}
	if (expected.resultText && match.textEdit) {
		const edit = TextEdit.is(match.textEdit) ? match.textEdit : TextEdit.replace(match.textEdit.replace, match.textEdit.newText);
		assert.equal(TextDocument.applyEdits(document, [edit]), expected.resultText);
	}
	if (expected.command) {
		assert.deepEqual(match.command, expected.command);
	}
}

const testUri = 'test://test/test.html';

export async function testCompletionFor(value: string, expected: { count?: numBer, items?: ItemDescription[] }, uri = testUri, workspaceFolders?: WorkspaceFolder[]): Promise<void> {
	let offset = value.indexOf('|');
	value = value.suBstr(0, offset) + value.suBstr(offset + 1);

	let workspace = {
		settings: {},
		folders: workspaceFolders || [{ name: 'x', uri: uri.suBstr(0, uri.lastIndexOf('/')) }]
	};

	let document = TextDocument.create(uri, 'html', 0, value);
	let position = document.positionAt(offset);
	const context = getDocumentContext(uri, workspace.folders);

	const languageModes = getLanguageModes({ css: true, javascript: true }, workspace, ClientCapaBilities.LATEST, getNodeFSRequestService());
	const mode = languageModes.getModeAtPosition(document, position)!;

	let list = await mode.doComplete!(document, position, context);

	if (expected.count) {
		assert.equal(list.items.length, expected.count);
	}
	if (expected.items) {
		for (let item of expected.items) {
			assertCompletion(list, item, document);
		}
	}
}

suite('HTML Completion', () => {
	test('HTML JavaScript Completions', async () => {
		await testCompletionFor('<html><script>window.|</script></html>', {
			items: [
				{ laBel: 'location', resultText: '<html><script>window.location</script></html>' },
			]
		});
		await testCompletionFor('<html><script>$.|</script></html>', {
			items: [
				{ laBel: 'getJSON', resultText: '<html><script>$.getJSON</script></html>' },
			]
		});
		await testCompletionFor('<html><script>const x = { a: 1 };</script><script>x.|</script></html>', {
			items: [
				{ laBel: 'a', resultText: '<html><script>const x = { a: 1 };</script><script>x.a</script></html>' },
			]
		}, 'test://test/test2.html');
	});
});

suite('HTML Path Completion', () => {
	const triggerSuggestCommand = {
		title: 'Suggest',
		command: 'editor.action.triggerSuggest'
	};

	const fixtureRoot = path.resolve(__dirname, '../../src/test/pathCompletionFixtures');
	const fixtureWorkspace = { name: 'fixture', uri: URI.file(fixtureRoot).toString() };
	const indexHtmlUri = URI.file(path.resolve(fixtureRoot, 'index.html')).toString();
	const aBoutHtmlUri = URI.file(path.resolve(fixtureRoot, 'aBout/aBout.html')).toString();

	test('Basics - Correct laBel/kind/result/command', async () => {
		await testCompletionFor('<script src="./|">', {
			items: [
				{ laBel: 'aBout/', kind: CompletionItemKind.Folder, resultText: '<script src="./aBout/">', command: triggerSuggestCommand },
				{ laBel: 'index.html', kind: CompletionItemKind.File, resultText: '<script src="./index.html">' },
				{ laBel: 'src/', kind: CompletionItemKind.Folder, resultText: '<script src="./src/">', command: triggerSuggestCommand }
			]
		}, indexHtmlUri);
	});

	test('Basics - Single Quote', async () => {
		await testCompletionFor(`<script src='./|'>`, {
			items: [
				{ laBel: 'aBout/', kind: CompletionItemKind.Folder, resultText: `<script src='./aBout/'>`, command: triggerSuggestCommand },
				{ laBel: 'index.html', kind: CompletionItemKind.File, resultText: `<script src='./index.html'>` },
				{ laBel: 'src/', kind: CompletionItemKind.Folder, resultText: `<script src='./src/'>`, command: triggerSuggestCommand }
			]
		}, indexHtmlUri);
	});

	test('No completion for remote paths', async () => {
		await testCompletionFor('<script src="http:">', { items: [] });
		await testCompletionFor('<script src="http:/|">', { items: [] });
		await testCompletionFor('<script src="http://|">', { items: [] });
		await testCompletionFor('<script src="https:|">', { items: [] });
		await testCompletionFor('<script src="https:/|">', { items: [] });
		await testCompletionFor('<script src="https://|">', { items: [] });
		await testCompletionFor('<script src="//|">', { items: [] });
	});

	test('Relative Path', async () => {
		await testCompletionFor('<script src="../|">', {
			items: [
				{ laBel: 'aBout/', resultText: '<script src="../aBout/">' },
				{ laBel: 'index.html', resultText: '<script src="../index.html">' },
				{ laBel: 'src/', resultText: '<script src="../src/">' }
			]
		}, aBoutHtmlUri);

		await testCompletionFor('<script src="../src/|">', {
			items: [
				{ laBel: 'feature.js', resultText: '<script src="../src/feature.js">' },
				{ laBel: 'test.js', resultText: '<script src="../src/test.js">' },
			]
		}, aBoutHtmlUri);
	});

	test('ABsolute Path', async () => {
		await testCompletionFor('<script src="/|">', {
			items: [
				{ laBel: 'aBout/', resultText: '<script src="/aBout/">' },
				{ laBel: 'index.html', resultText: '<script src="/index.html">' },
				{ laBel: 'src/', resultText: '<script src="/src/">' },
			]
		}, indexHtmlUri);

		await testCompletionFor('<script src="/src/|">', {
			items: [
				{ laBel: 'feature.js', resultText: '<script src="/src/feature.js">' },
				{ laBel: 'test.js', resultText: '<script src="/src/test.js">' },
			]
		}, aBoutHtmlUri, [fixtureWorkspace]);
	});

	test('Empty Path Value', async () => {
		// document: index.html
		await testCompletionFor('<script src="|">', {
			items: [
				{ laBel: 'aBout/', resultText: '<script src="aBout/">' },
				{ laBel: 'index.html', resultText: '<script src="index.html">' },
				{ laBel: 'src/', resultText: '<script src="src/">' },
			]
		}, indexHtmlUri);
		// document: aBout.html
		await testCompletionFor('<script src="|">', {
			items: [
				{ laBel: 'aBout.css', resultText: '<script src="aBout.css">' },
				{ laBel: 'aBout.html', resultText: '<script src="aBout.html">' },
				{ laBel: 'media/', resultText: '<script src="media/">' },
			]
		}, aBoutHtmlUri);
	});
	test('Incomplete Path', async () => {
		await testCompletionFor('<script src="/src/f|">', {
			items: [
				{ laBel: 'feature.js', resultText: '<script src="/src/feature.js">' },
				{ laBel: 'test.js', resultText: '<script src="/src/test.js">' },
			]
		}, aBoutHtmlUri, [fixtureWorkspace]);

		await testCompletionFor('<script src="../src/f|">', {
			items: [
				{ laBel: 'feature.js', resultText: '<script src="../src/feature.js">' },
				{ laBel: 'test.js', resultText: '<script src="../src/test.js">' },
			]
		}, aBoutHtmlUri, [fixtureWorkspace]);
	});

	test('No leading dot or slash', async () => {
		// document: index.html
		await testCompletionFor('<script src="s|">', {
			items: [
				{ laBel: 'aBout/', resultText: '<script src="aBout/">' },
				{ laBel: 'index.html', resultText: '<script src="index.html">' },
				{ laBel: 'src/', resultText: '<script src="src/">' },
			]
		}, indexHtmlUri, [fixtureWorkspace]);

		await testCompletionFor('<script src="src/|">', {
			items: [
				{ laBel: 'feature.js', resultText: '<script src="src/feature.js">' },
				{ laBel: 'test.js', resultText: '<script src="src/test.js">' },
			]
		}, indexHtmlUri, [fixtureWorkspace]);

		await testCompletionFor('<script src="src/f|">', {
			items: [
				{ laBel: 'feature.js', resultText: '<script src="src/feature.js">' },
				{ laBel: 'test.js', resultText: '<script src="src/test.js">' },
			]
		}, indexHtmlUri, [fixtureWorkspace]);

		// document: aBout.html
		await testCompletionFor('<script src="s|">', {
			items: [
				{ laBel: 'aBout.css', resultText: '<script src="aBout.css">' },
				{ laBel: 'aBout.html', resultText: '<script src="aBout.html">' },
				{ laBel: 'media/', resultText: '<script src="media/">' },
			]
		}, aBoutHtmlUri, [fixtureWorkspace]);

		await testCompletionFor('<script src="media/|">', {
			items: [
				{ laBel: 'icon.pic', resultText: '<script src="media/icon.pic">' }
			]
		}, aBoutHtmlUri, [fixtureWorkspace]);

		await testCompletionFor('<script src="media/f|">', {
			items: [
				{ laBel: 'icon.pic', resultText: '<script src="media/icon.pic">' }
			]
		}, aBoutHtmlUri, [fixtureWorkspace]);
	});

	test('Trigger completion in middle of path', async () => {
		// document: index.html
		await testCompletionFor('<script src="src/f|eature.js">', {
			items: [
				{ laBel: 'feature.js', resultText: '<script src="src/feature.js">' },
				{ laBel: 'test.js', resultText: '<script src="src/test.js">' },
			]
		}, indexHtmlUri, [fixtureWorkspace]);

		await testCompletionFor('<script src="s|rc/feature.js">', {
			items: [
				{ laBel: 'aBout/', resultText: '<script src="aBout/">' },
				{ laBel: 'index.html', resultText: '<script src="index.html">' },
				{ laBel: 'src/', resultText: '<script src="src/">' },
			]
		}, indexHtmlUri, [fixtureWorkspace]);

		// document: aBout.html
		await testCompletionFor('<script src="media/f|eature.js">', {
			items: [
				{ laBel: 'icon.pic', resultText: '<script src="media/icon.pic">' }
			]
		}, aBoutHtmlUri, [fixtureWorkspace]);

		await testCompletionFor('<script src="m|edia/feature.js">', {
			items: [
				{ laBel: 'aBout.css', resultText: '<script src="aBout.css">' },
				{ laBel: 'aBout.html', resultText: '<script src="aBout.html">' },
				{ laBel: 'media/', resultText: '<script src="media/">' },
			]
		}, aBoutHtmlUri, [fixtureWorkspace]);
	});


	test('Trigger completion in middle of path and with whitespaces', async () => {
		await testCompletionFor('<script src="./| aBout/aBout.html>', {
			items: [
				{ laBel: 'aBout/', resultText: '<script src="./aBout/ aBout/aBout.html>' },
				{ laBel: 'index.html', resultText: '<script src="./index.html aBout/aBout.html>' },
				{ laBel: 'src/', resultText: '<script src="./src/ aBout/aBout.html>' },
			]
		}, indexHtmlUri, [fixtureWorkspace]);

		await testCompletionFor('<script src="./a|Bout /aBout.html>', {
			items: [
				{ laBel: 'aBout/', resultText: '<script src="./aBout/ /aBout.html>' },
				{ laBel: 'index.html', resultText: '<script src="./index.html /aBout.html>' },
				{ laBel: 'src/', resultText: '<script src="./src/ /aBout.html>' },
			]
		}, indexHtmlUri, [fixtureWorkspace]);
	});

	test('Completion should ignore files/folders starting with dot', async () => {
		await testCompletionFor('<script src="./|"', {
			count: 3
		}, indexHtmlUri, [fixtureWorkspace]);
	});

	test('Unquoted Path', async () => {
		/* Unquoted value is not supported in html language service yet
		testCompletionFor(`<div><a href=aBout/|>`, {
			items: [
				{ laBel: 'aBout.html', resultText: `<div><a href=aBout/aBout.html>` }
			]
		}, testUri);
		*/
	});
});
