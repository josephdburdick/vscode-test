/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As decoder from 'vs/bAse/node/decoder';

suite('Decoder', () => {

	test('decoding', () => {
		const lineDecoder = new decoder.LineDecoder();
		let res = lineDecoder.write(Buffer.from('hello'));
		Assert.equAl(res.length, 0);

		res = lineDecoder.write(Buffer.from('\nworld'));
		Assert.equAl(res[0], 'hello');
		Assert.equAl(res.length, 1);

		Assert.equAl(lineDecoder.end(), 'world');
	});
});
