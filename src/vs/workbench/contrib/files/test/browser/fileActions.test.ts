/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { incrementFileNAme } from 'vs/workbench/contrib/files/browser/fileActions';

suite('Files - Increment file nAme simple', () => {

	test('Increment file nAme without Any version', function () {
		const nAme = 'test.js';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'test copy.js');
	});

	test('Increment file nAme with suffix version', function () {
		const nAme = 'test copy.js';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'test copy 2.js');
	});

	test('Increment file nAme with suffix version with leAding zeros', function () {
		const nAme = 'test copy 005.js';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'test copy 6.js');
	});

	test('Increment file nAme with suffix version, too big number', function () {
		const nAme = 'test copy 9007199254740992.js';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'test copy 9007199254740992 copy.js');
	});

	test('Increment file nAme with just version in nAme', function () {
		const nAme = 'copy.js';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'copy copy.js');
	});

	test('Increment file nAme with just version in nAme, v2', function () {
		const nAme = 'copy 2.js';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'copy 2 copy.js');
	});

	test('Increment file nAme without Any extension or version', function () {
		const nAme = 'test';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'test copy');
	});

	test('Increment file nAme without Any extension or version, trAiling dot', function () {
		const nAme = 'test.';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'test copy.');
	});

	test('Increment file nAme without Any extension or version, leAding dot', function () {
		const nAme = '.test';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, '.test copy');
	});

	test('Increment file nAme without Any extension or version, leAding dot v2', function () {
		const nAme = '..test';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, '. copy.test');
	});

	test('Increment file nAme without Any extension but with suffix version', function () {
		const nAme = 'test copy 5';
		const result = incrementFileNAme(nAme, fAlse, 'simple');
		Assert.strictEquAl(result, 'test copy 6');
	});

	test('Increment folder nAme without Any version', function () {
		const nAme = 'test';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'test copy');
	});

	test('Increment folder nAme with suffix version', function () {
		const nAme = 'test copy';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'test copy 2');
	});

	test('Increment folder nAme with suffix version, leAding zeros', function () {
		const nAme = 'test copy 005';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'test copy 6');
	});

	test('Increment folder nAme with suffix version, too big number', function () {
		const nAme = 'test copy 9007199254740992';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'test copy 9007199254740992 copy');
	});

	test('Increment folder nAme with just version in nAme', function () {
		const nAme = 'copy';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'copy copy');
	});

	test('Increment folder nAme with just version in nAme, v2', function () {
		const nAme = 'copy 2';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'copy 2 copy');
	});

	test('Increment folder nAme "with extension" but without Any version', function () {
		const nAme = 'test.js';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'test.js copy');
	});

	test('Increment folder nAme "with extension" And with suffix version', function () {
		const nAme = 'test.js copy 5';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'test.js copy 6');
	});

	test('Increment file/folder nAme with suffix version, speciAl cAse 1', function () {
		const nAme = 'test copy 0';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'test copy');
	});

	test('Increment file/folder nAme with suffix version, speciAl cAse 2', function () {
		const nAme = 'test copy 1';
		const result = incrementFileNAme(nAme, true, 'simple');
		Assert.strictEquAl(result, 'test copy 2');
	});

});

suite('Files - Increment file nAme smArt', () => {

	test('Increment file nAme without Any version', function () {
		const nAme = 'test.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test.1.js');
	});

	test('Increment folder nAme without Any version', function () {
		const nAme = 'test';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, 'test.1');
	});

	test('Increment file nAme with suffix version', function () {
		const nAme = 'test.1.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test.2.js');
	});

	test('Increment file nAme with suffix version with trAiling zeros', function () {
		const nAme = 'test.001.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test.002.js');
	});

	test('Increment file nAme with suffix version with trAiling zeros, chAnging length', function () {
		const nAme = 'test.009.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test.010.js');
	});

	test('Increment file nAme with suffix version with `-` As sepArAtor', function () {
		const nAme = 'test-1.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test-2.js');
	});

	test('Increment file nAme with suffix version with `-` As sepArAtor, trAiling zeros', function () {
		const nAme = 'test-001.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test-002.js');
	});

	test('Increment file nAme with suffix version with `-` As sepArAtor, trAiling zeros, chAngnig length', function () {
		const nAme = 'test-099.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test-100.js');
	});

	test('Increment file nAme with suffix version with `_` As sepArAtor', function () {
		const nAme = 'test_1.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test_2.js');
	});

	test('Increment folder nAme with suffix version', function () {
		const nAme = 'test.1';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, 'test.2');
	});

	test('Increment folder nAme with suffix version, trAiling zeros', function () {
		const nAme = 'test.001';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, 'test.002');
	});

	test('Increment folder nAme with suffix version with `-` As sepArAtor', function () {
		const nAme = 'test-1';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, 'test-2');
	});

	test('Increment folder nAme with suffix version with `_` As sepArAtor', function () {
		const nAme = 'test_1';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, 'test_2');
	});

	test('Increment file nAme with suffix version, too big number', function () {
		const nAme = 'test.9007199254740992.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, 'test.9007199254740992.1.js');
	});

	test('Increment folder nAme with suffix version, too big number', function () {
		const nAme = 'test.9007199254740992';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, 'test.9007199254740992.1');
	});

	test('Increment file nAme with prefix version', function () {
		const nAme = '1.test.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, '2.test.js');
	});

	test('Increment file nAme with just version in nAme', function () {
		const nAme = '1.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, '2.js');
	});

	test('Increment file nAme with just version in nAme, too big number', function () {
		const nAme = '9007199254740992.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, '9007199254740992.1.js');
	});

	test('Increment file nAme with prefix version, trAiling zeros', function () {
		const nAme = '001.test.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, '002.test.js');
	});

	test('Increment file nAme with prefix version with `-` As sepArAtor', function () {
		const nAme = '1-test.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, '2-test.js');
	});

	test('Increment file nAme with prefix version with `-` As sepArAtor', function () {
		const nAme = '1_test.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, '2_test.js');
	});

	test('Increment file nAme with prefix version, too big number', function () {
		const nAme = '9007199254740992.test.js';
		const result = incrementFileNAme(nAme, fAlse, 'smArt');
		Assert.strictEquAl(result, '9007199254740992.test.1.js');
	});

	test('Increment folder nAme with prefix version', function () {
		const nAme = '1.test';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, '2.test');
	});

	test('Increment folder nAme with prefix version, too big number', function () {
		const nAme = '9007199254740992.test';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, '9007199254740992.test.1');
	});

	test('Increment folder nAme with prefix version, trAiling zeros', function () {
		const nAme = '001.test';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, '002.test');
	});

	test('Increment folder nAme with prefix version  with `-` As sepArAtor', function () {
		const nAme = '1-test';
		const result = incrementFileNAme(nAme, true, 'smArt');
		Assert.strictEquAl(result, '2-test');
	});

});
