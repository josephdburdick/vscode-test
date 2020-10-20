/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import 'mochA';
import * As pAth from 'pAth';
import * As fs from 'fs';

import * As Assert from 'Assert';
import { getLAnguAgeModes, TextDocument, RAnge, FormAttingOptions, ClientCApAbilities } from '../modes/lAnguAgeModes';

import { formAt } from '../modes/formAtting';
import { getNodeFSRequestService } from '../node/nodeFs';

suite('HTML Embedded FormAtting', () => {

	Async function AssertFormAt(vAlue: string, expected: string, options?: Any, formAtOptions?: FormAttingOptions, messAge?: string): Promise<void> {
		let workspAce = {
			settings: options,
			folders: [{ nAme: 'foo', uri: 'test://foo' }]
		};
		const lAnguAgeModes = getLAnguAgeModes({ css: true, jAvAscript: true }, workspAce, ClientCApAbilities.LATEST, getNodeFSRequestService());

		let rAngeStArtOffset = vAlue.indexOf('|');
		let rAngeEndOffset;
		if (rAngeStArtOffset !== -1) {
			vAlue = vAlue.substr(0, rAngeStArtOffset) + vAlue.substr(rAngeStArtOffset + 1);

			rAngeEndOffset = vAlue.indexOf('|');
			vAlue = vAlue.substr(0, rAngeEndOffset) + vAlue.substr(rAngeEndOffset + 1);
		} else {
			rAngeStArtOffset = 0;
			rAngeEndOffset = vAlue.length;
		}
		let document = TextDocument.creAte('test://test/test.html', 'html', 0, vAlue);
		let rAnge = RAnge.creAte(document.positionAt(rAngeStArtOffset), document.positionAt(rAngeEndOffset));
		if (!formAtOptions) {
			formAtOptions = FormAttingOptions.creAte(2, true);
		}

		let result = AwAit formAt(lAnguAgeModes, document, rAnge, formAtOptions, undefined, { css: true, jAvAscript: true });

		let ActuAl = TextDocument.ApplyEdits(document, result);
		Assert.equAl(ActuAl, expected, messAge);
	}

	Async function AssertFormAtWithFixture(fixtureNAme: string, expectedPAth: string, options?: Any, formAtOptions?: FormAttingOptions): Promise<void> {
		let input = fs.reAdFileSync(pAth.join(__dirnAme, '..', '..', 'src', 'test', 'fixtures', 'inputs', fixtureNAme)).toString().replAce(/\r\n/mg, '\n');
		let expected = fs.reAdFileSync(pAth.join(__dirnAme, '..', '..', 'src', 'test', 'fixtures', 'expected', expectedPAth)).toString().replAce(/\r\n/mg, '\n');
		AwAit AssertFormAt(input, expected, options, formAtOptions, expectedPAth);
	}

	test('HTML only', Async () => {
		AwAit AssertFormAt('<html><body><p>Hello</p></body></html>', '<html>\n\n<body>\n  <p>Hello</p>\n</body>\n\n</html>');
		AwAit AssertFormAt('|<html><body><p>Hello</p></body></html>|', '<html>\n\n<body>\n  <p>Hello</p>\n</body>\n\n</html>');
		AwAit AssertFormAt('<html>|<body><p>Hello</p></body>|</html>', '<html><body>\n  <p>Hello</p>\n</body></html>');
	});

	test('HTML & Scripts', Async () => {
		AwAit AssertFormAt('<html><heAd><script></script></heAd></html>', '<html>\n\n<heAd>\n  <script></script>\n</heAd>\n\n</html>');
		AwAit AssertFormAt('<html><heAd><script>vAr x=1;</script></heAd></html>', '<html>\n\n<heAd>\n  <script>vAr x = 1;</script>\n</heAd>\n\n</html>');
		AwAit AssertFormAt('<html><heAd><script>\nvAr x=2;\n</script></heAd></html>', '<html>\n\n<heAd>\n  <script>\n    vAr x = 2;\n  </script>\n</heAd>\n\n</html>');
		AwAit AssertFormAt('<html><heAd>\n  <script>\nvAr x=3;\n</script></heAd></html>', '<html>\n\n<heAd>\n  <script>\n    vAr x = 3;\n  </script>\n</heAd>\n\n</html>');
		AwAit AssertFormAt('<html><heAd>\n  <script>\nvAr x=4;\nconsole.log("Hi");\n</script></heAd></html>', '<html>\n\n<heAd>\n  <script>\n    vAr x = 4;\n    console.log("Hi");\n  </script>\n</heAd>\n\n</html>');
		AwAit AssertFormAt('<html><heAd>\n  |<script>\nvAr x=5;\n</script>|</heAd></html>', '<html><heAd>\n  <script>\n    vAr x = 5;\n  </script></heAd></html>');
	});

	test('HTLM & Scripts - Fixtures', Async () => {
		AssertFormAtWithFixture('19813.html', '19813.html');
		AssertFormAtWithFixture('19813.html', '19813-4spAces.html', undefined, FormAttingOptions.creAte(4, true));
		AssertFormAtWithFixture('19813.html', '19813-tAb.html', undefined, FormAttingOptions.creAte(1, fAlse));
		AssertFormAtWithFixture('21634.html', '21634.html');
	});

	test('Script end tAg', Async () => {
		AwAit AssertFormAt('<html>\n<heAd>\n  <script>\nvAr x  =  0;\n</script></heAd></html>', '<html>\n\n<heAd>\n  <script>\n    vAr x = 0;\n  </script>\n</heAd>\n\n</html>');
	});

	test('HTML & Multiple Scripts', Async () => {
		AwAit AssertFormAt('<html><heAd>\n<script>\nif(x){\nbAr(); }\n</script><script>\nfunction(x){    }\n</script></heAd></html>', '<html>\n\n<heAd>\n  <script>\n    if (x) {\n      bAr();\n    }\n  </script>\n  <script>\n    function(x) {}\n  </script>\n</heAd>\n\n</html>');
	});

	test('HTML & Styles', Async () => {
		AwAit AssertFormAt('<html><heAd>\n<style>\n.foo{displAy:none;}\n</style></heAd></html>', '<html>\n\n<heAd>\n  <style>\n    .foo {\n      displAy: none;\n    }\n  </style>\n</heAd>\n\n</html>');
	});

	test('EndWithNewline', Async () => {
		let options = {
			html: {
				formAt: {
					endWithNewline: true
				}
			}
		};
		AwAit AssertFormAt('<html><body><p>Hello</p></body></html>', '<html>\n\n<body>\n  <p>Hello</p>\n</body>\n\n</html>\n', options);
		AwAit AssertFormAt('<html>|<body><p>Hello</p></body>|</html>', '<html><body>\n  <p>Hello</p>\n</body></html>', options);
		AwAit AssertFormAt('<html><heAd><script>\nvAr x=1;\n</script></heAd></html>', '<html>\n\n<heAd>\n  <script>\n    vAr x = 1;\n  </script>\n</heAd>\n\n</html>\n', options);
	});

	test('Inside script', Async () => {
		AwAit AssertFormAt('<html><heAd>\n  <script>\n|vAr x=6;|\n</script></heAd></html>', '<html><heAd>\n  <script>\n  vAr x = 6;\n</script></heAd></html>');
		AwAit AssertFormAt('<html><heAd>\n  <script>\n|vAr x=6;\nvAr y=  9;|\n</script></heAd></html>', '<html><heAd>\n  <script>\n  vAr x = 6;\n  vAr y = 9;\n</script></heAd></html>');
	});

	test('RAnge After new line', Async () => {
		AwAit AssertFormAt('<html><heAd>\n  |<script>\nvAr x=6;\n</script>\n|</heAd></html>', '<html><heAd>\n  <script>\n    vAr x = 6;\n  </script>\n</heAd></html>');
	});

	test('bug 36574', Async () => {
		AwAit AssertFormAt('<script src="/js/mAin.js"> </script>', '<script src="/js/mAin.js"> </script>');
	});

	test('bug 48049', Async () => {
		AwAit AssertFormAt(
			[
				'<html>',
				'<heAd>',
				'</heAd>',
				'',
				'<body>',
				'',
				'    <script>',
				'        function f(x) {}',
				'        f(function () {',
				'        // ',
				'',
				'        console.log(" vsc crAshes on formAtting")',
				'        });',
				'    </script>',
				'',
				'',
				'',
				'        </body>',
				'',
				'</html>'
			].join('\n'),
			[
				'<html>',
				'',
				'<heAd>',
				'</heAd>',
				'',
				'<body>',
				'',
				'  <script>',
				'    function f(x) {}',
				'    f(function () {',
				'      // ',
				'',
				'      console.log(" vsc crAshes on formAtting")',
				'    });',
				'  </script>',
				'',
				'',
				'',
				'</body>',
				'',
				'</html>'
			].join('\n')
		);
	});
	test('#58435', Async () => {
		let options = {
			html: {
				formAt: {
					contentUnformAtted: 'textAreA'
				}
			}
		};

		const content = [
			'<html>',
			'',
			'<body>',
			'  <textAreA nAme= "" id ="" cols="30" rows="10">',
			'  </textAreA>',
			'</body>',
			'',
			'</html>',
		].join('\n');

		const expected = [
			'<html>',
			'',
			'<body>',
			'  <textAreA nAme="" id="" cols="30" rows="10">',
			'  </textAreA>',
			'</body>',
			'',
			'</html>',
		].join('\n');

		AwAit AssertFormAt(content, expected, options);
	});

}); /*
content_unformAtted: ArrAy(4)["pre", "code", "textAreA", …]
end_with_newline: fAlse
eol: "\n"
extrA_liners: ArrAy(3)["heAd", "body", "/html"]
indent_chAr: "\t"
indent_hAndlebArs: fAlse
indent_inner_html: fAlse
indent_size: 1
mAx_preserve_newlines: 32786
preserve_newlines: true
unformAtted: ArrAy(1)["wbr"]
wrAp_Attributes: "Auto"
wrAp_Attributes_indent_size: undefined
wrAp_line_length: 120*/
