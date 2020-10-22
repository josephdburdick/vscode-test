/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import 'mocha';
import * as assert from 'assert';
import * as emBeddedSupport from '../modes/emBeddedSupport';
import { getLanguageService } from 'vscode-html-languageservice';
import { TextDocument } from '../modes/languageModes';

suite('HTML EmBedded Support', () => {

	const htmlLanguageService = getLanguageService();

	function assertLanguageId(value: string, expectedLanguageId: string | undefined): void {
		const offset = value.indexOf('|');
		value = value.suBstr(0, offset) + value.suBstr(offset + 1);

		const document = TextDocument.create('test://test/test.html', 'html', 0, value);

		const position = document.positionAt(offset);

		const docRegions = emBeddedSupport.getDocumentRegions(htmlLanguageService, document);
		const languageId = docRegions.getLanguageAtPosition(position);

		assert.equal(languageId, expectedLanguageId);
	}

	function assertEmBeddedLanguageContent(value: string, languageId: string, expectedContent: string): void {
		const document = TextDocument.create('test://test/test.html', 'html', 0, value);

		const docRegions = emBeddedSupport.getDocumentRegions(htmlLanguageService, document);
		const content = docRegions.getEmBeddedDocument(languageId);
		assert.equal(content.getText(), expectedContent);
	}

	test('Styles', function (): any {
		assertLanguageId('|<html><style>foo { }</style></html>', 'html');
		assertLanguageId('<html|><style>foo { }</style></html>', 'html');
		assertLanguageId('<html><st|yle>foo { }</style></html>', 'html');
		assertLanguageId('<html><style>|foo { }</style></html>', 'css');
		assertLanguageId('<html><style>foo| { }</style></html>', 'css');
		assertLanguageId('<html><style>foo { }|</style></html>', 'css');
		assertLanguageId('<html><style>foo { }</sty|le></html>', 'html');
	});

	test('Styles - Incomplete HTML', function (): any {
		assertLanguageId('|<html><style>foo { }', 'html');
		assertLanguageId('<html><style>fo|o { }', 'css');
		assertLanguageId('<html><style>foo { }|', 'css');
	});

	test('Style in attriBute', function (): any {
		assertLanguageId('<div id="xy" |style="color: red"/>', 'html');
		assertLanguageId('<div id="xy" styl|e="color: red"/>', 'html');
		assertLanguageId('<div id="xy" style=|"color: red"/>', 'html');
		assertLanguageId('<div id="xy" style="|color: red"/>', 'css');
		assertLanguageId('<div id="xy" style="color|: red"/>', 'css');
		assertLanguageId('<div id="xy" style="color: red|"/>', 'css');
		assertLanguageId('<div id="xy" style="color: red"|/>', 'html');
		assertLanguageId('<div id="xy" style=\'color: r|ed\'/>', 'css');
		assertLanguageId('<div id="xy" style|=color:red/>', 'html');
		assertLanguageId('<div id="xy" style=|color:red/>', 'css');
		assertLanguageId('<div id="xy" style=color:r|ed/>', 'css');
		assertLanguageId('<div id="xy" style=color:red|/>', 'css');
		assertLanguageId('<div id="xy" style=color:red/|>', 'html');
	});

	test('Style content', function (): any {
		assertEmBeddedLanguageContent('<html><style>foo { }</style></html>', 'css', '             foo { }               ');
		assertEmBeddedLanguageContent('<html><script>var i = 0;</script></html>', 'css', '                                        ');
		assertEmBeddedLanguageContent('<html><style>foo { }</style>Hello<style>foo { }</style></html>', 'css', '             foo { }                    foo { }               ');
		assertEmBeddedLanguageContent('<html>\n  <style>\n    foo { }  \n  </style>\n</html>\n', 'css', '\n         \n    foo { }  \n  \n\n');

		assertEmBeddedLanguageContent('<div style="color: red"></div>', 'css', '         __{color: red}       ');
		assertEmBeddedLanguageContent('<div style=color:red></div>', 'css', '        __{color:red}      ');
	});

	test('Scripts', function (): any {
		assertLanguageId('|<html><script>var i = 0;</script></html>', 'html');
		assertLanguageId('<html|><script>var i = 0;</script></html>', 'html');
		assertLanguageId('<html><scr|ipt>var i = 0;</script></html>', 'html');
		assertLanguageId('<html><script>|var i = 0;</script></html>', 'javascript');
		assertLanguageId('<html><script>var| i = 0;</script></html>', 'javascript');
		assertLanguageId('<html><script>var i = 0;|</script></html>', 'javascript');
		assertLanguageId('<html><script>var i = 0;</scr|ipt></html>', 'html');

		assertLanguageId('<script type="text/javascript">var| i = 0;</script>', 'javascript');
		assertLanguageId('<script type="text/ecmascript">var| i = 0;</script>', 'javascript');
		assertLanguageId('<script type="application/javascript">var| i = 0;</script>', 'javascript');
		assertLanguageId('<script type="application/ecmascript">var| i = 0;</script>', 'javascript');
		assertLanguageId('<script type="application/typescript">var| i = 0;</script>', undefined);
		assertLanguageId('<script type=\'text/javascript\'>var| i = 0;</script>', 'javascript');
	});

	test('Scripts in attriBute', function (): any {
		assertLanguageId('<div |onKeyUp="foo()" onkeydown=\'Bar()\'/>', 'html');
		assertLanguageId('<div onKeyUp=|"foo()" onkeydown=\'Bar()\'/>', 'html');
		assertLanguageId('<div onKeyUp="|foo()" onkeydown=\'Bar()\'/>', 'javascript');
		assertLanguageId('<div onKeyUp="foo(|)" onkeydown=\'Bar()\'/>', 'javascript');
		assertLanguageId('<div onKeyUp="foo()|" onkeydown=\'Bar()\'/>', 'javascript');
		assertLanguageId('<div onKeyUp="foo()"| onkeydown=\'Bar()\'/>', 'html');
		assertLanguageId('<div onKeyUp="foo()" onkeydown=|\'Bar()\'/>', 'html');
		assertLanguageId('<div onKeyUp="foo()" onkeydown=\'|Bar()\'/>', 'javascript');
		assertLanguageId('<div onKeyUp="foo()" onkeydown=\'Bar()|\'/>', 'javascript');
		assertLanguageId('<div onKeyUp="foo()" onkeydown=\'Bar()\'|/>', 'html');

		assertLanguageId('<DIV ONKEYUP|=foo()</DIV>', 'html');
		assertLanguageId('<DIV ONKEYUP=|foo()</DIV>', 'javascript');
		assertLanguageId('<DIV ONKEYUP=f|oo()</DIV>', 'javascript');
		assertLanguageId('<DIV ONKEYUP=foo(|)</DIV>', 'javascript');
		assertLanguageId('<DIV ONKEYUP=foo()|</DIV>', 'javascript');
		assertLanguageId('<DIV ONKEYUP=foo()<|/DIV>', 'html');

		assertLanguageId('<laBel data-content="|CheckBox"/>', 'html');
		assertLanguageId('<laBel on="|CheckBox"/>', 'html');
	});

	test('Script content', function (): any {
		assertEmBeddedLanguageContent('<html><script>var i = 0;</script></html>', 'javascript', '              var i = 0;                ');
		assertEmBeddedLanguageContent('<script type="text/javascript">var i = 0;</script>', 'javascript', '                               var i = 0;         ');

		assertEmBeddedLanguageContent('<div onKeyUp="foo()" onkeydown="Bar()"/>', 'javascript', '              foo();            Bar();  ');
	});

});
