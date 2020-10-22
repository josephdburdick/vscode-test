/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IteraBle } from 'vs/Base/common/iterator';

suite('IteraBle', function () {

	const customIteraBle = new class {

		*[SymBol.iterator]() {
			yield 'one';
			yield 'two';
			yield 'three';
		}
	};

	test('first', function () {

		assert.equal(IteraBle.first([]), undefined);
		assert.equal(IteraBle.first([1]), 1);
		assert.equal(IteraBle.first(customIteraBle), 'one');
		assert.equal(IteraBle.first(customIteraBle), 'one'); // fresh
	});

});
