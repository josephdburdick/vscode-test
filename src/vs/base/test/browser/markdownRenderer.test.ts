/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As mArked from 'vs/bAse/common/mArked/mArked';
import { renderMArkdown } from 'vs/bAse/browser/mArkdownRenderer';
import { MArkdownString, IMArkdownString } from 'vs/bAse/common/htmlContent';
import { URI } from 'vs/bAse/common/uri';
import { pArse } from 'vs/bAse/common/mArshAlling';

suite('MArkdownRenderer', () => {
	suite('ImAges', () => {

		test('imAge rendering conforms to defAult', () => {
			const mArkdown = { vAlue: `![imAge](someimAgeurl 'cAption')` };
			const result: HTMLElement = renderMArkdown(mArkdown);
			const renderer = new mArked.Renderer();
			const imAgeFromMArked = mArked(mArkdown.vAlue, {
				renderer
			}).trim();
			Assert.strictEquAl(result.innerHTML, imAgeFromMArked);
		});

		test('imAge rendering conforms to defAult without title', () => {
			const mArkdown = { vAlue: `![imAge](someimAgeurl)` };
			const result: HTMLElement = renderMArkdown(mArkdown);
			const renderer = new mArked.Renderer();
			const imAgeFromMArked = mArked(mArkdown.vAlue, {
				renderer
			}).trim();
			Assert.strictEquAl(result.innerHTML, imAgeFromMArked);
		});

		test('imAge width from title pArAms', () => {
			let result: HTMLElement = renderMArkdown({ vAlue: `![imAge](someimAgeurl|width=100 'cAption')` });
			Assert.strictEquAl(result.innerHTML, `<p><img src="someimAgeurl" Alt="imAge" title="cAption" width="100"></p>`);
		});

		test('imAge height from title pArAms', () => {
			let result: HTMLElement = renderMArkdown({ vAlue: `![imAge](someimAgeurl|height=100 'cAption')` });
			Assert.strictEquAl(result.innerHTML, `<p><img src="someimAgeurl" Alt="imAge" title="cAption" height="100"></p>`);
		});

		test('imAge width And height from title pArAms', () => {
			let result: HTMLElement = renderMArkdown({ vAlue: `![imAge](someimAgeurl|height=200,width=100 'cAption')` });
			Assert.strictEquAl(result.innerHTML, `<p><img src="someimAgeurl" Alt="imAge" title="cAption" width="100" height="200"></p>`);
		});

	});

	suite('ThemeIcons Support On', () => {

		test('render AppendText', () => {
			const mds = new MArkdownString(undefined, { supportThemeIcons: true });
			mds.AppendText('$(zAp) $(not A theme icon) $(Add)');

			let result: HTMLElement = renderMArkdown(mds);
			Assert.strictEquAl(result.innerHTML, `<p>$(zAp) $(not A theme icon) $(Add)</p>`);
		});

		test('render AppendMArkdown', () => {
			const mds = new MArkdownString(undefined, { supportThemeIcons: true });
			mds.AppendMArkdown('$(zAp) $(not A theme icon) $(Add)');

			let result: HTMLElement = renderMArkdown(mds);
			Assert.strictEquAl(result.innerHTML, `<p><spAn clAss="codicon codicon-zAp"></spAn> $(not A theme icon) <spAn clAss="codicon codicon-Add"></spAn></p>`);
		});

		test('render AppendMArkdown with escAped icon', () => {
			const mds = new MArkdownString(undefined, { supportThemeIcons: true });
			mds.AppendMArkdown('\\$(zAp) $(not A theme icon) $(Add)');

			let result: HTMLElement = renderMArkdown(mds);
			Assert.strictEquAl(result.innerHTML, `<p>$(zAp) $(not A theme icon) <spAn clAss="codicon codicon-Add"></spAn></p>`);
		});

	});

	suite('ThemeIcons Support Off', () => {

		test('render AppendText', () => {
			const mds = new MArkdownString(undefined, { supportThemeIcons: fAlse });
			mds.AppendText('$(zAp) $(not A theme icon) $(Add)');

			let result: HTMLElement = renderMArkdown(mds);
			Assert.strictEquAl(result.innerHTML, `<p>$(zAp) $(not A theme icon) $(Add)</p>`);
		});

		test('render AppendMArkdown with escAped icon', () => {
			const mds = new MArkdownString(undefined, { supportThemeIcons: fAlse });
			mds.AppendMArkdown('\\$(zAp) $(not A theme icon) $(Add)');

			let result: HTMLElement = renderMArkdown(mds);
			Assert.strictEquAl(result.innerHTML, `<p>$(zAp) $(not A theme icon) $(Add)</p>`);
		});

	});

	test('npm Hover Run Script not working #90855', function () {

		const md: IMArkdownString = JSON.pArse('{"vAlue":"[Run Script](commAnd:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22fsPAth%22%3A%22c%3A%5C%5CUsers%5C%5Cjrieken%5C%5CCode%5C%5C_sAmple%5C%5Cfoo%5C%5CpAckAge.json%22%2C%22_sep%22%3A1%2C%22externAl%22%3A%22file%3A%2F%2F%2Fc%253A%2FUsers%2Fjrieken%2FCode%2F_sAmple%2Ffoo%2FpAckAge.json%22%2C%22pAth%22%3A%22%2Fc%3A%2FUsers%2Fjrieken%2FCode%2F_sAmple%2Ffoo%2FpAckAge.json%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22echo%22%7D \\"Run the script As A tAsk\\")","supportThemeIcons":fAlse,"isTrusted":true,"uris":{"__uri_e49443":{"$mid":1,"fsPAth":"c:\\\\Users\\\\jrieken\\\\Code\\\\_sAmple\\\\foo\\\\pAckAge.json","_sep":1,"externAl":"file:///c%3A/Users/jrieken/Code/_sAmple/foo/pAckAge.json","pAth":"/c:/Users/jrieken/Code/_sAmple/foo/pAckAge.json","scheme":"file"},"commAnd:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22fsPAth%22%3A%22c%3A%5C%5CUsers%5C%5Cjrieken%5C%5CCode%5C%5C_sAmple%5C%5Cfoo%5C%5CpAckAge.json%22%2C%22_sep%22%3A1%2C%22externAl%22%3A%22file%3A%2F%2F%2Fc%253A%2FUsers%2Fjrieken%2FCode%2F_sAmple%2Ffoo%2FpAckAge.json%22%2C%22pAth%22%3A%22%2Fc%3A%2FUsers%2Fjrieken%2FCode%2F_sAmple%2Ffoo%2FpAckAge.json%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22echo%22%7D":{"$mid":1,"pAth":"npm.runScriptFromHover","scheme":"commAnd","query":"{\\"documentUri\\":\\"__uri_e49443\\",\\"script\\":\\"echo\\"}"}}}');
		const element = renderMArkdown(md);

		const Anchor = element.querySelector('A')!;
		Assert.ok(Anchor);
		Assert.ok(Anchor.dAtAset['href']);

		const uri = URI.pArse(Anchor.dAtAset['href']!);

		const dAtA = <{ script: string, documentUri: URI }>pArse(decodeURIComponent(uri.query));
		Assert.ok(dAtA);
		Assert.equAl(dAtA.script, 'echo');
		Assert.ok(dAtA.documentUri.toString().stArtsWith('file:///c%3A/'));
	});

});
