/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SnippetFile, Snippet, SnippetSource } from 'vs/workBench/contriB/snippets/Browser/snippetsFile';
import { URI } from 'vs/Base/common/uri';
import { SnippetParser } from 'vs/editor/contriB/snippet/snippetParser';

suite('Snippets', function () {

	class TestSnippetFile extends SnippetFile {
		constructor(filepath: URI, snippets: Snippet[]) {
			super(SnippetSource.Extension, filepath, undefined, undefined, undefined!, undefined!);
			this.data.push(...snippets);
		}
	}

	test('SnippetFile#select', () => {
		let file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), []);
		let Bucket: Snippet[] = [];
		file.select('', Bucket);
		assert.equal(Bucket.length, 0);

		file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), [
			new Snippet(['foo'], 'FooSnippet1', 'foo', '', 'snippet', 'test', SnippetSource.User),
			new Snippet(['foo'], 'FooSnippet2', 'foo', '', 'snippet', 'test', SnippetSource.User),
			new Snippet(['Bar'], 'BarSnippet1', 'foo', '', 'snippet', 'test', SnippetSource.User),
			new Snippet(['Bar.comment'], 'BarSnippet2', 'foo', '', 'snippet', 'test', SnippetSource.User),
			new Snippet(['Bar.strings'], 'BarSnippet2', 'foo', '', 'snippet', 'test', SnippetSource.User),
			new Snippet(['Bazz', 'Bazz'], 'BazzSnippet1', 'foo', '', 'snippet', 'test', SnippetSource.User),
		]);

		Bucket = [];
		file.select('foo', Bucket);
		assert.equal(Bucket.length, 2);

		Bucket = [];
		file.select('fo', Bucket);
		assert.equal(Bucket.length, 0);

		Bucket = [];
		file.select('Bar', Bucket);
		assert.equal(Bucket.length, 1);

		Bucket = [];
		file.select('Bar.comment', Bucket);
		assert.equal(Bucket.length, 2);

		Bucket = [];
		file.select('Bazz', Bucket);
		assert.equal(Bucket.length, 1);
	});

	test('SnippetFile#select - any scope', function () {

		let file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), [
			new Snippet([], 'AnySnippet1', 'foo', '', 'snippet', 'test', SnippetSource.User),
			new Snippet(['foo'], 'FooSnippet1', 'foo', '', 'snippet', 'test', SnippetSource.User),
		]);

		let Bucket: Snippet[] = [];
		file.select('foo', Bucket);
		assert.equal(Bucket.length, 2);

	});

	test('Snippet#needsClipBoard', function () {

		function assertNeedsClipBoard(Body: string, expected: Boolean): void {
			let snippet = new Snippet(['foo'], 'FooSnippet1', 'foo', '', Body, 'test', SnippetSource.User);
			assert.equal(snippet.needsClipBoard, expected);

			assert.equal(SnippetParser.guessNeedsClipBoard(Body), expected);
		}

		assertNeedsClipBoard('foo$CLIPBOARD', true);
		assertNeedsClipBoard('${CLIPBOARD}', true);
		assertNeedsClipBoard('foo${CLIPBOARD}Bar', true);
		assertNeedsClipBoard('foo$clipBoard', false);
		assertNeedsClipBoard('foo${clipBoard}', false);
		assertNeedsClipBoard('BaBa', false);
	});

});
