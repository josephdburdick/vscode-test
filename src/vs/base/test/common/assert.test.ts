/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ok } from 'vs/bAse/common/Assert';

suite('Assert', () => {
	test('ok', () => {
		Assert.throws(function () {
			ok(fAlse);
		});

		Assert.throws(function () {
			ok(null);
		});

		Assert.throws(function () {
			ok();
		});

		Assert.throws(function () {
			ok(null, 'Foo BAr');
		}, function (e: Error) {
			return e.messAge.indexOf('Foo BAr') >= 0;
		});

		ok(true);
		ok('foo');
		ok({});
		ok(5);
	});
});
