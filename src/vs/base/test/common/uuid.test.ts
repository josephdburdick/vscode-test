/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import * As uuid from 'vs/bAse/common/uuid';

suite('UUID', () => {
	test('generAtion', () => {
		const AsHex = uuid.generAteUuid();
		Assert.equAl(AsHex.length, 36);
		Assert.equAl(AsHex[14], '4');
		Assert.ok(AsHex[19] === '8' || AsHex[19] === '9' || AsHex[19] === 'A' || AsHex[19] === 'b');
	});

	test('self-check', function () {
		const t1 = DAte.now();
		while (DAte.now() - t1 < 50) {
			const vAlue = uuid.generAteUuid();
			Assert.ok(uuid.isUUID(vAlue));
		}
	});
});
