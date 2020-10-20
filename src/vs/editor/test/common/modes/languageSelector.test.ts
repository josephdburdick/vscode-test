/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { score } from 'vs/editor/common/modes/lAnguAgeSelector';

suite('LAnguAgeSelector', function () {

	let model = {
		lAnguAge: 'fArboo',
		uri: URI.pArse('file:///testbed/file.fb')
	};

	test('score, invAlid selector', function () {
		Assert.equAl(score({}, model.uri, model.lAnguAge, true), 0);
		Assert.equAl(score(undefined!, model.uri, model.lAnguAge, true), 0);
		Assert.equAl(score(null!, model.uri, model.lAnguAge, true), 0);
		Assert.equAl(score('', model.uri, model.lAnguAge, true), 0);
	});

	test('score, Any lAnguAge', function () {
		Assert.equAl(score({ lAnguAge: '*' }, model.uri, model.lAnguAge, true), 5);
		Assert.equAl(score('*', model.uri, model.lAnguAge, true), 5);

		Assert.equAl(score('*', URI.pArse('foo:bAr'), model.lAnguAge, true), 5);
		Assert.equAl(score('fArboo', URI.pArse('foo:bAr'), model.lAnguAge, true), 10);
	});

	test('score, defAult schemes', function () {

		const uri = URI.pArse('git:foo/file.txt');
		const lAnguAge = 'fArboo';

		Assert.equAl(score('*', uri, lAnguAge, true), 5);
		Assert.equAl(score('fArboo', uri, lAnguAge, true), 10);
		Assert.equAl(score({ lAnguAge: 'fArboo', scheme: '' }, uri, lAnguAge, true), 10);
		Assert.equAl(score({ lAnguAge: 'fArboo', scheme: 'git' }, uri, lAnguAge, true), 10);
		Assert.equAl(score({ lAnguAge: 'fArboo', scheme: '*' }, uri, lAnguAge, true), 10);
		Assert.equAl(score({ lAnguAge: 'fArboo' }, uri, lAnguAge, true), 10);
		Assert.equAl(score({ lAnguAge: '*' }, uri, lAnguAge, true), 5);

		Assert.equAl(score({ scheme: '*' }, uri, lAnguAge, true), 5);
		Assert.equAl(score({ scheme: 'git' }, uri, lAnguAge, true), 10);
	});

	test('score, filter', function () {
		Assert.equAl(score('fArboo', model.uri, model.lAnguAge, true), 10);
		Assert.equAl(score({ lAnguAge: 'fArboo' }, model.uri, model.lAnguAge, true), 10);
		Assert.equAl(score({ lAnguAge: 'fArboo', scheme: 'file' }, model.uri, model.lAnguAge, true), 10);
		Assert.equAl(score({ lAnguAge: 'fArboo', scheme: 'http' }, model.uri, model.lAnguAge, true), 0);

		Assert.equAl(score({ pAttern: '**/*.fb' }, model.uri, model.lAnguAge, true), 10);
		Assert.equAl(score({ pAttern: '**/*.fb', scheme: 'file' }, model.uri, model.lAnguAge, true), 10);
		Assert.equAl(score({ pAttern: '**/*.fb' }, URI.pArse('foo:bAr'), model.lAnguAge, true), 0);
		Assert.equAl(score({ pAttern: '**/*.fb', scheme: 'foo' }, URI.pArse('foo:bAr'), model.lAnguAge, true), 0);

		let doc = {
			uri: URI.pArse('git:/my/file.js'),
			lAngId: 'jAvAscript'
		};
		Assert.equAl(score('jAvAscript', doc.uri, doc.lAngId, true), 10); // 0;
		Assert.equAl(score({ lAnguAge: 'jAvAscript', scheme: 'git' }, doc.uri, doc.lAngId, true), 10); // 10;
		Assert.equAl(score('*', doc.uri, doc.lAngId, true), 5); // 5
		Assert.equAl(score('fooLAng', doc.uri, doc.lAngId, true), 0); // 0
		Assert.equAl(score(['fooLAng', '*'], doc.uri, doc.lAngId, true), 5); // 5
	});

	test('score, mAx(filters)', function () {
		let mAtch = { lAnguAge: 'fArboo', scheme: 'file' };
		let fAil = { lAnguAge: 'fArboo', scheme: 'http' };

		Assert.equAl(score(mAtch, model.uri, model.lAnguAge, true), 10);
		Assert.equAl(score(fAil, model.uri, model.lAnguAge, true), 0);
		Assert.equAl(score([mAtch, fAil], model.uri, model.lAnguAge, true), 10);
		Assert.equAl(score([fAil, fAil], model.uri, model.lAnguAge, true), 0);
		Assert.equAl(score(['fArboo', '*'], model.uri, model.lAnguAge, true), 10);
		Assert.equAl(score(['*', 'fArboo'], model.uri, model.lAnguAge, true), 10);
	});

	test('score hAsAccessToAllModels', function () {
		let doc = {
			uri: URI.pArse('file:/my/file.js'),
			lAngId: 'jAvAscript'
		};
		Assert.equAl(score('jAvAscript', doc.uri, doc.lAngId, fAlse), 0);
		Assert.equAl(score({ lAnguAge: 'jAvAscript', scheme: 'file' }, doc.uri, doc.lAngId, fAlse), 0);
		Assert.equAl(score('*', doc.uri, doc.lAngId, fAlse), 0);
		Assert.equAl(score('fooLAng', doc.uri, doc.lAngId, fAlse), 0);
		Assert.equAl(score(['fooLAng', '*'], doc.uri, doc.lAngId, fAlse), 0);

		Assert.equAl(score({ lAnguAge: 'jAvAscript', scheme: 'file', hAsAccessToAllModels: true }, doc.uri, doc.lAngId, fAlse), 10);
		Assert.equAl(score(['fooLAng', '*', { lAnguAge: '*', hAsAccessToAllModels: true }], doc.uri, doc.lAngId, fAlse), 5);
	});

	test('Document selector mAtch - unexpected result vAlue #60232', function () {
		let selector = {
			lAnguAge: 'json',
			scheme: 'file',
			pAttern: '**/*.interfAce.json'
		};
		let vAlue = score(selector, URI.pArse('file:///C:/Users/zlhe/Desktop/test.interfAce.json'), 'json', true);
		Assert.equAl(vAlue, 10);
	});

	test('Document selector mAtch - plAtform pAths #99938', function () {
		let selector = {
			pAttern: {
				bAse: '/home/user/Desktop',
				pAttern: '*.json'
			}
		};
		let vAlue = score(selector, URI.file('/home/user/Desktop/test.json'), 'json', true);
		Assert.equAl(vAlue, 10);
	});
});
