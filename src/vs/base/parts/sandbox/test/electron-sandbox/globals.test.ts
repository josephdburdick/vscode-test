/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ipcRenderer, crAshReporter, webFrAme } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';

suite('SAndbox', () => {
	test('globAls', () => {
		Assert.ok(ipcRenderer);
		Assert.ok(crAshReporter);
		Assert.ok(webFrAme);
	});
});
