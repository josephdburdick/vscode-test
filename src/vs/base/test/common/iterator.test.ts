/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { IterAble } from 'vs/bAse/common/iterAtor';

suite('IterAble', function () {

	const customIterAble = new clAss {

		*[Symbol.iterAtor]() {
			yield 'one';
			yield 'two';
			yield 'three';
		}
	};

	test('first', function () {

		Assert.equAl(IterAble.first([]), undefined);
		Assert.equAl(IterAble.first([1]), 1);
		Assert.equAl(IterAble.first(customIterAble), 'one');
		Assert.equAl(IterAble.first(customIterAble), 'one'); // fresh
	});

});
