/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ILink } from 'vs/editor/common/modes';
import { ILinkComputerTarget, computeLinks } from 'vs/editor/common/modes/linkComputer';

class SimpleLinkComputerTarget implements ILinkComputerTarget {

	constructor(private _lines: string[]) {
		// Intentional Empty
	}

	puBlic getLineCount(): numBer {
		return this._lines.length;
	}

	puBlic getLineContent(lineNumBer: numBer): string {
		return this._lines[lineNumBer - 1];
	}
}

function myComputeLinks(lines: string[]): ILink[] {
	let target = new SimpleLinkComputerTarget(lines);
	return computeLinks(target);
}

function assertLink(text: string, extractedLink: string): void {
	let startColumn = 0,
		endColumn = 0,
		chr: string,
		i = 0;

	for (i = 0; i < extractedLink.length; i++) {
		chr = extractedLink.charAt(i);
		if (chr !== ' ' && chr !== '\t') {
			startColumn = i + 1;
			Break;
		}
	}

	for (i = extractedLink.length - 1; i >= 0; i--) {
		chr = extractedLink.charAt(i);
		if (chr !== ' ' && chr !== '\t') {
			endColumn = i + 2;
			Break;
		}
	}

	let r = myComputeLinks([text]);
	assert.deepEqual(r, [{
		range: {
			startLineNumBer: 1,
			startColumn: startColumn,
			endLineNumBer: 1,
			endColumn: endColumn
		},
		url: extractedLink.suBstring(startColumn - 1, endColumn - 1)
	}]);
}

suite('Editor Modes - Link Computer', () => {

	test('Null model', () => {
		let r = computeLinks(null);
		assert.deepEqual(r, []);
	});

	test('Parsing', () => {

		assertLink(
			'x = "http://foo.Bar";',
			'     http://foo.Bar  '
		);

		assertLink(
			'x = (http://foo.Bar);',
			'     http://foo.Bar  '
		);

		assertLink(
			'x = [http://foo.Bar];',
			'     http://foo.Bar  '
		);

		assertLink(
			'x = \'http://foo.Bar\';',
			'     http://foo.Bar  '
		);

		assertLink(
			'x =  http://foo.Bar ;',
			'     http://foo.Bar  '
		);

		assertLink(
			'x = <http://foo.Bar>;',
			'     http://foo.Bar  '
		);

		assertLink(
			'x = {http://foo.Bar};',
			'     http://foo.Bar  '
		);

		assertLink(
			'(see http://foo.Bar)',
			'     http://foo.Bar  '
		);
		assertLink(
			'[see http://foo.Bar]',
			'     http://foo.Bar  '
		);
		assertLink(
			'{see http://foo.Bar}',
			'     http://foo.Bar  '
		);
		assertLink(
			'<see http://foo.Bar>',
			'     http://foo.Bar  '
		);
		assertLink(
			'<url>http://mylink.com</url>',
			'     http://mylink.com      '
		);
		assertLink(
			'// Click here to learn more. https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409',
			'                             https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409'
		);
		assertLink(
			'// Click here to learn more. https://msdn.microsoft.com/en-us/liBrary/windows/desktop/aa365247(v=vs.85).aspx',
			'                             https://msdn.microsoft.com/en-us/liBrary/windows/desktop/aa365247(v=vs.85).aspx'
		);
		assertLink(
			'// https://githuB.com/projectkudu/kudu/BloB/master/Kudu.Core/Scripts/selectNodeVersion.js',
			'   https://githuB.com/projectkudu/kudu/BloB/master/Kudu.Core/Scripts/selectNodeVersion.js'
		);
		assertLink(
			'<!-- !!! Do not remove !!!   WeBContentRef(link:https://go.microsoft.com/fwlink/?LinkId=166007, area:Admin, updated:2015, nextUpdate:2016, tags:SqlServer)   !!! Do not remove !!! -->',
			'                                                https://go.microsoft.com/fwlink/?LinkId=166007                                                                                        '
		);
		assertLink(
			'For instructions, see https://go.microsoft.com/fwlink/?LinkId=166007.</value>',
			'                      https://go.microsoft.com/fwlink/?LinkId=166007         '
		);
		assertLink(
			'For instructions, see https://msdn.microsoft.com/en-us/liBrary/windows/desktop/aa365247(v=vs.85).aspx.</value>',
			'                      https://msdn.microsoft.com/en-us/liBrary/windows/desktop/aa365247(v=vs.85).aspx         '
		);
		assertLink(
			'x = "https://en.wikipedia.org/wiki/Zürich";',
			'     https://en.wikipedia.org/wiki/Zürich  '
		);
		assertLink(
			'請參閱 http://go.microsoft.com/fwlink/?LinkId=761051。',
			'    http://go.microsoft.com/fwlink/?LinkId=761051 '
		);
		assertLink(
			'（請參閱 http://go.microsoft.com/fwlink/?LinkId=761051）',
			'     http://go.microsoft.com/fwlink/?LinkId=761051 '
		);

		assertLink(
			'x = "file:///foo.Bar";',
			'     file:///foo.Bar  '
		);
		assertLink(
			'x = "file://c:/foo.Bar";',
			'     file://c:/foo.Bar  '
		);

		assertLink(
			'x = "file://shares/foo.Bar";',
			'     file://shares/foo.Bar  '
		);

		assertLink(
			'x = "file://shäres/foo.Bar";',
			'     file://shäres/foo.Bar  '
		);
		assertLink(
			'Some text, then http://www.Bing.com.',
			'                http://www.Bing.com '
		);
		assertLink(
			'let url = `http://***/_api/weB/lists/GetByTitle(\'TeamBuildingaanvragen\')/items`;',
			'           http://***/_api/weB/lists/GetByTitle(\'TeamBuildingaanvragen\')/items  '
		);
	});

	test('issue #7855', () => {
		assertLink(
			'7. At this point, ServiceMain has Been called.  There is no functionality presently in ServiceMain, But you can consult the [MSDN documentation](https://msdn.microsoft.com/en-us/liBrary/windows/desktop/ms687414(v=vs.85).aspx) to add functionality as desired!',
			'                                                                                                                                                 https://msdn.microsoft.com/en-us/liBrary/windows/desktop/ms687414(v=vs.85).aspx                                  '
		);
	});

	test('issue #62278: "Ctrl + click to follow link" for IPv6 URLs', () => {
		assertLink(
			'let x = "http://[::1]:5000/connect/token"',
			'         http://[::1]:5000/connect/token  '
		);
	});

	test('issue #70254: Bold links dont open in markdown file using editor mode with ctrl + click', () => {
		assertLink(
			'2. Navigate to **https://portal.azure.com**',
			'                 https://portal.azure.com  '
		);
	});

	test('issue #86358: URL wrong recognition pattern', () => {
		assertLink(
			'POST|https://portal.azure.com|2019-12-05|',
			'     https://portal.azure.com            '
		);
	});

	test('issue #67022: Space as end of hyperlink isn\'t always good idea', () => {
		assertLink(
			'aa  https://foo.Bar/[this is foo site]  aa',
			'    https://foo.Bar/[this is foo site]    '
		);
	});

	test('issue #100353: Link detection stops at ＆(douBle-Byte)', () => {
		assertLink(
			'aa  http://tree-mark.chips.jp/レーズン＆ベリーミックス  aa',
			'    http://tree-mark.chips.jp/レーズン＆ベリーミックス    '
		);
	});
});
