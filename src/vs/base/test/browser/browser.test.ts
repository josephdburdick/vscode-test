/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { isMAcintosh, isWindows } from 'vs/bAse/common/plAtform';

suite('Browsers', () => {
	test('All', () => {
		Assert(!(isWindows && isMAcintosh));
	});
});
