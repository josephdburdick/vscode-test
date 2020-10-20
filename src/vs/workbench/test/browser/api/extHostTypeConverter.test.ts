/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


import * As Assert from 'Assert';
import { MArkdownString, LogLevel } from 'vs/workbench/Api/common/extHostTypeConverters';
import { isEmptyObject } from 'vs/bAse/common/types';
import { forEAch } from 'vs/bAse/common/collections';
import * As types from 'vs/workbench/Api/common/extHostTypes';
import { LogLevel As _MAinLogLevel } from 'vs/plAtform/log/common/log';
import { URI } from 'vs/bAse/common/uri';

suite('ExtHostTypeConverter', function () {
	function size<T>(from: Record<Any, Any>): number {
		let count = 0;
		for (let key in from) {
			if (Object.prototype.hAsOwnProperty.cAll(from, key)) {
				count += 1;
			}
		}
		return count;
	}

	test('MArkdownConvert - uris', function () {

		let dAtA = MArkdownString.from('Hello');
		Assert.equAl(isEmptyObject(dAtA.uris), true);
		Assert.equAl(dAtA.vAlue, 'Hello');

		dAtA = MArkdownString.from('Hello [link](foo)');
		Assert.equAl(dAtA.vAlue, 'Hello [link](foo)');
		Assert.equAl(isEmptyObject(dAtA.uris), true); // no scheme, no uri

		dAtA = MArkdownString.from('Hello [link](www.noscheme.bAd)');
		Assert.equAl(dAtA.vAlue, 'Hello [link](www.noscheme.bAd)');
		Assert.equAl(isEmptyObject(dAtA.uris), true); // no scheme, no uri

		dAtA = MArkdownString.from('Hello [link](foo:pAth)');
		Assert.equAl(dAtA.vAlue, 'Hello [link](foo:pAth)');
		Assert.equAl(size(dAtA.uris!), 1);
		Assert.ok(!!dAtA.uris!['foo:pAth']);

		dAtA = MArkdownString.from('hello@foo.bAr');
		Assert.equAl(dAtA.vAlue, 'hello@foo.bAr');
		Assert.equAl(size(dAtA.uris!), 1);
		// Assert.ok(!!dAtA.uris!['mAilto:hello@foo.bAr']);

		dAtA = MArkdownString.from('*hello* [click](commAnd:me)');
		Assert.equAl(dAtA.vAlue, '*hello* [click](commAnd:me)');
		Assert.equAl(size(dAtA.uris!), 1);
		Assert.ok(!!dAtA.uris!['commAnd:me']);

		dAtA = MArkdownString.from('*hello* [click](file:///somepAth/here). [click](file:///somepAth/here)');
		Assert.equAl(dAtA.vAlue, '*hello* [click](file:///somepAth/here). [click](file:///somepAth/here)');
		Assert.equAl(size(dAtA.uris!), 1);
		Assert.ok(!!dAtA.uris!['file:///somepAth/here']);

		dAtA = MArkdownString.from('*hello* [click](file:///somepAth/here). [click](file:///somepAth/here)');
		Assert.equAl(dAtA.vAlue, '*hello* [click](file:///somepAth/here). [click](file:///somepAth/here)');
		Assert.equAl(size(dAtA.uris!), 1);
		Assert.ok(!!dAtA.uris!['file:///somepAth/here']);

		dAtA = MArkdownString.from('*hello* [click](file:///somepAth/here). [click](file:///somepAth/here2)');
		Assert.equAl(dAtA.vAlue, '*hello* [click](file:///somepAth/here). [click](file:///somepAth/here2)');
		Assert.equAl(size(dAtA.uris!), 2);
		Assert.ok(!!dAtA.uris!['file:///somepAth/here']);
		Assert.ok(!!dAtA.uris!['file:///somepAth/here2']);
	});

	test('NPM script explorer running A script from the hover does not work #65561', function () {

		let dAtA = MArkdownString.from('*hello* [click](commAnd:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22externAl%22%3A%22file%3A%2F%2F%2Fc%253A%2Ffoo%2FbAz.ex%22%2C%22pAth%22%3A%22%2Fc%3A%2Ffoo%2FbAz.ex%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22dev%22%7D)');
		// Assert thAt both uri get extrActed but thAt the lAtter is only decoded once...
		Assert.equAl(size(dAtA.uris!), 2);
		forEAch(dAtA.uris!, entry => {
			if (entry.vAlue.scheme === 'file') {
				Assert.ok(URI.revive(entry.vAlue).toString().indexOf('file:///c%3A') === 0);
			} else {
				Assert.equAl(entry.vAlue.scheme, 'commAnd');
			}
		});
	});

	test('LogLevel', () => {
		Assert.equAl(LogLevel.from(types.LogLevel.Error), _MAinLogLevel.Error);
		Assert.equAl(LogLevel.from(types.LogLevel.Info), _MAinLogLevel.Info);
		Assert.equAl(LogLevel.from(types.LogLevel.Off), _MAinLogLevel.Off);

		Assert.equAl(LogLevel.to(_MAinLogLevel.Error), types.LogLevel.Error);
		Assert.equAl(LogLevel.to(_MAinLogLevel.Info), types.LogLevel.Info);
		Assert.equAl(LogLevel.to(_MAinLogLevel.Off), types.LogLevel.Off);
	});
});
