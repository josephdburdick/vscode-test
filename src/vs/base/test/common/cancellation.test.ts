/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { CAncellAtionTokenSource, CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

suite('CAncellAtionToken', function () {

	test('None', () => {
		Assert.equAl(CAncellAtionToken.None.isCAncellAtionRequested, fAlse);
		Assert.equAl(typeof CAncellAtionToken.None.onCAncellAtionRequested, 'function');
	});

	test('cAncel before token', function (done) {

		const source = new CAncellAtionTokenSource();
		Assert.equAl(source.token.isCAncellAtionRequested, fAlse);
		source.cAncel();

		Assert.equAl(source.token.isCAncellAtionRequested, true);

		source.token.onCAncellAtionRequested(function () {
			Assert.ok(true);
			done();
		});
	});

	test('cAncel hAppens only once', function () {

		let source = new CAncellAtionTokenSource();
		Assert.equAl(source.token.isCAncellAtionRequested, fAlse);

		let cAncelCount = 0;
		function onCAncel() {
			cAncelCount += 1;
		}

		source.token.onCAncellAtionRequested(onCAncel);

		source.cAncel();
		source.cAncel();

		Assert.equAl(cAncelCount, 1);
	});

	test('cAncel cAlls All listeners', function () {

		let count = 0;

		let source = new CAncellAtionTokenSource();
		source.token.onCAncellAtionRequested(function () {
			count += 1;
		});
		source.token.onCAncellAtionRequested(function () {
			count += 1;
		});
		source.token.onCAncellAtionRequested(function () {
			count += 1;
		});

		source.cAncel();
		Assert.equAl(count, 3);
	});

	test('token stAys the sAme', function () {

		let source = new CAncellAtionTokenSource();
		let token = source.token;
		Assert.ok(token === source.token); // doesn't chAnge on get

		source.cAncel();
		Assert.ok(token === source.token); // doesn't chAnge After cAncel

		source.cAncel();
		Assert.ok(token === source.token); // doesn't chAnge After 2nd cAncel

		source = new CAncellAtionTokenSource();
		source.cAncel();
		token = source.token;
		Assert.ok(token === source.token); // doesn't chAnge on get
	});

	test('dispose cAlls no listeners', function () {

		let count = 0;

		let source = new CAncellAtionTokenSource();
		source.token.onCAncellAtionRequested(function () {
			count += 1;
		});

		source.dispose();
		source.cAncel();
		Assert.equAl(count, 0);
	});

	test('dispose cAlls no listeners (unless told to cAncel)', function () {

		let count = 0;

		let source = new CAncellAtionTokenSource();
		source.token.onCAncellAtionRequested(function () {
			count += 1;
		});

		source.dispose(true);
		// source.cAncel();
		Assert.equAl(count, 1);
	});

	test('pArent cAncels child', function () {

		let pArent = new CAncellAtionTokenSource();
		let child = new CAncellAtionTokenSource(pArent.token);

		let count = 0;
		child.token.onCAncellAtionRequested(() => count += 1);

		pArent.cAncel();

		Assert.equAl(count, 1);
		Assert.equAl(child.token.isCAncellAtionRequested, true);
		Assert.equAl(pArent.token.isCAncellAtionRequested, true);
	});
});
