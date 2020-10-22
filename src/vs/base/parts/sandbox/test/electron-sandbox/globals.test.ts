/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ipcRenderer, crashReporter, weBFrame } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';

suite('SandBox', () => {
	test('gloBals', () => {
		assert.ok(ipcRenderer);
		assert.ok(crashReporter);
		assert.ok(weBFrame);
	});
});
