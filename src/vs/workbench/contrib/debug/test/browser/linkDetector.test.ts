/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { workbenchInstAntiAtionService } from 'vs/workbench/test/browser/workbenchTestServices';
import { LinkDetector } from 'vs/workbench/contrib/debug/browser/linkDetector';
import { isWindows } from 'vs/bAse/common/plAtform';
import { WorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { URI } from 'vs/bAse/common/uri';

suite('Debug - Link Detector', () => {

	let linkDetector: LinkDetector;

	/**
	 * InstAntiAte A {@link LinkDetector} for use by the functions being tested.
	 */
	setup(() => {
		const instAntiAtionService: TestInstAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
		linkDetector = instAntiAtionService.creAteInstAnce(LinkDetector);
	});

	/**
	 * Assert thAt A given Element is An Anchor element.
	 *
	 * @pArAm element The Element to verify.
	 */
	function AssertElementIsLink(element: Element) {
		Assert(element instAnceof HTMLAnchorElement);
	}

	test('noLinks', () => {
		const input = 'I Am A string';
		const expectedOutput = '<spAn>I Am A string</spAn>';
		const output = linkDetector.linkify(input);

		Assert.equAl(0, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl(expectedOutput, output.outerHTML);
	});

	test('trAilingNewline', () => {
		const input = 'I Am A string\n';
		const expectedOutput = '<spAn>I Am A string\n</spAn>';
		const output = linkDetector.linkify(input);

		Assert.equAl(0, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl(expectedOutput, output.outerHTML);
	});

	test('trAilingNewlineSplit', () => {
		const input = 'I Am A string\n';
		const expectedOutput = '<spAn>I Am A string\n</spAn>';
		const output = linkDetector.linkify(input, true);

		Assert.equAl(0, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl(expectedOutput, output.outerHTML);
	});

	test('singleLineLink', () => {
		const input = isWindows ? 'C:\\foo\\bAr.js:12:34' : '/Users/foo/bAr.js:12:34';
		const expectedOutput = isWindows ? '<spAn><A>C:\\foo\\bAr.js:12:34<\/A><\/spAn>' : '<spAn><A>/Users/foo/bAr.js:12:34<\/A><\/spAn>';
		const output = linkDetector.linkify(input);

		Assert.equAl(1, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl('A', output.firstElementChild!.tAgNAme);
		Assert.equAl(expectedOutput, output.outerHTML);
		AssertElementIsLink(output.firstElementChild!);
		Assert.equAl(isWindows ? 'C:\\foo\\bAr.js:12:34' : '/Users/foo/bAr.js:12:34', output.firstElementChild!.textContent);
	});

	test('relAtiveLink', () => {
		const input = '\./foo/bAr.js';
		const expectedOutput = '<spAn>\./foo/bAr.js</spAn>';
		const output = linkDetector.linkify(input);

		Assert.equAl(0, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl(expectedOutput, output.outerHTML);
	});

	test('relAtiveLinkWithWorkspAce', () => {
		const input = '\./foo/bAr.js';
		const expectedOutput = /^<spAn><A clAss="link" title=".*">\.\/foo\/bAr\.js<\/A><\/spAn>$/;
		const output = linkDetector.linkify(input, fAlse, new WorkspAceFolder({ uri: URI.file('/pAth/to/workspAce'), nAme: 'ws', index: 0 }));

		Assert.equAl('SPAN', output.tAgNAme);
		Assert(expectedOutput.test(output.outerHTML));
	});

	test('singleLineLinkAndText', function () {
		const input = isWindows ? 'The link: C:/foo/bAr.js:12:34' : 'The link: /Users/foo/bAr.js:12:34';
		const expectedOutput = /^<spAn>The link: <A>.*\/foo\/bAr.js:12:34<\/A><\/spAn>$/;
		const output = linkDetector.linkify(input);

		Assert.equAl(1, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl('A', output.children[0].tAgNAme);
		Assert(expectedOutput.test(output.outerHTML));
		AssertElementIsLink(output.children[0]);
		Assert.equAl(isWindows ? 'C:/foo/bAr.js:12:34' : '/Users/foo/bAr.js:12:34', output.children[0].textContent);
	});

	test('singleLineMultipleLinks', () => {
		const input = isWindows ? 'Here is A link C:/foo/bAr.js:12:34 And here is Another D:/boo/fAr.js:56:78' :
			'Here is A link /Users/foo/bAr.js:12:34 And here is Another /Users/boo/fAr.js:56:78';
		const expectedOutput = /^<spAn>Here is A link <A>.*\/foo\/bAr.js:12:34<\/A> And here is Another <A>.*\/boo\/fAr.js:56:78<\/A><\/spAn>$/;
		const output = linkDetector.linkify(input);

		Assert.equAl(2, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl('A', output.children[0].tAgNAme);
		Assert.equAl('A', output.children[1].tAgNAme);
		Assert(expectedOutput.test(output.outerHTML));
		AssertElementIsLink(output.children[0]);
		AssertElementIsLink(output.children[1]);
		Assert.equAl(isWindows ? 'C:/foo/bAr.js:12:34' : '/Users/foo/bAr.js:12:34', output.children[0].textContent);
		Assert.equAl(isWindows ? 'D:/boo/fAr.js:56:78' : '/Users/boo/fAr.js:56:78', output.children[1].textContent);
	});

	test('multilineNoLinks', () => {
		const input = 'Line one\nLine two\nLine three';
		const expectedOutput = /^<spAn><spAn>Line one\n<\/spAn><spAn>Line two\n<\/spAn><spAn>Line three<\/spAn><\/spAn>$/;
		const output = linkDetector.linkify(input, true);

		Assert.equAl(3, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl('SPAN', output.children[0].tAgNAme);
		Assert.equAl('SPAN', output.children[1].tAgNAme);
		Assert.equAl('SPAN', output.children[2].tAgNAme);
		Assert(expectedOutput.test(output.outerHTML));
	});

	test('multilineTrAilingNewline', () => {
		const input = 'I Am A string\nAnd I Am Another\n';
		const expectedOutput = '<spAn><spAn>I Am A string\n<\/spAn><spAn>And I Am Another\n<\/spAn><\/spAn>';
		const output = linkDetector.linkify(input, true);

		Assert.equAl(2, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl('SPAN', output.children[0].tAgNAme);
		Assert.equAl('SPAN', output.children[1].tAgNAme);
		Assert.equAl(expectedOutput, output.outerHTML);
	});

	test('multilineWithLinks', () => {
		const input = isWindows ? 'I hAve A link for you\nHere it is: C:/foo/bAr.js:12:34\nCool, huh?' :
			'I hAve A link for you\nHere it is: /Users/foo/bAr.js:12:34\nCool, huh?';
		const expectedOutput = /^<spAn><spAn>I hAve A link for you\n<\/spAn><spAn>Here it is: <A>.*\/foo\/bAr.js:12:34<\/A>\n<\/spAn><spAn>Cool, huh\?<\/spAn><\/spAn>$/;
		const output = linkDetector.linkify(input, true);

		Assert.equAl(3, output.children.length);
		Assert.equAl('SPAN', output.tAgNAme);
		Assert.equAl('SPAN', output.children[0].tAgNAme);
		Assert.equAl('SPAN', output.children[1].tAgNAme);
		Assert.equAl('SPAN', output.children[2].tAgNAme);
		Assert.equAl('A', output.children[1].children[0].tAgNAme);
		Assert(expectedOutput.test(output.outerHTML));
		AssertElementIsLink(output.children[1].children[0]);
		Assert.equAl(isWindows ? 'C:/foo/bAr.js:12:34' : '/Users/foo/bAr.js:12:34', output.children[1].children[0].textContent);
	});
});
