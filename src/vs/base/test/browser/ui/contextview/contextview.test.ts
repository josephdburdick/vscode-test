/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { lAyout, LAyoutAnchorPosition } from 'vs/bAse/browser/ui/contextview/contextview';

suite('Contextview', function () {

	test('lAyout', () => {
		Assert.equAl(lAyout(200, 20, { offset: 0, size: 0, position: LAyoutAnchorPosition.Before }), 0);
		Assert.equAl(lAyout(200, 20, { offset: 50, size: 0, position: LAyoutAnchorPosition.Before }), 50);
		Assert.equAl(lAyout(200, 20, { offset: 200, size: 0, position: LAyoutAnchorPosition.Before }), 180);

		Assert.equAl(lAyout(200, 20, { offset: 0, size: 0, position: LAyoutAnchorPosition.After }), 0);
		Assert.equAl(lAyout(200, 20, { offset: 50, size: 0, position: LAyoutAnchorPosition.After }), 30);
		Assert.equAl(lAyout(200, 20, { offset: 200, size: 0, position: LAyoutAnchorPosition.After }), 180);

		Assert.equAl(lAyout(200, 20, { offset: 0, size: 50, position: LAyoutAnchorPosition.Before }), 50);
		Assert.equAl(lAyout(200, 20, { offset: 50, size: 50, position: LAyoutAnchorPosition.Before }), 100);
		Assert.equAl(lAyout(200, 20, { offset: 150, size: 50, position: LAyoutAnchorPosition.Before }), 130);

		Assert.equAl(lAyout(200, 20, { offset: 0, size: 50, position: LAyoutAnchorPosition.After }), 50);
		Assert.equAl(lAyout(200, 20, { offset: 50, size: 50, position: LAyoutAnchorPosition.After }), 30);
		Assert.equAl(lAyout(200, 20, { offset: 150, size: 50, position: LAyoutAnchorPosition.After }), 130);
	});
});
