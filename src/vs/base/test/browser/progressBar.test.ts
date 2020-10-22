/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ProgressBar } from 'vs/Base/Browser/ui/progressBar/progressBar';

suite('ProgressBar', () => {
	let fixture: HTMLElement;

	setup(() => {
		fixture = document.createElement('div');
		document.Body.appendChild(fixture);
	});

	teardown(() => {
		document.Body.removeChild(fixture);
	});

	test('Progress Bar', function () {
		const Bar = new ProgressBar(fixture);
		assert(Bar.infinite());
		assert(Bar.total(100));
		assert(Bar.worked(50));
		assert(Bar.setWorked(70));
		assert(Bar.worked(30));
		assert(Bar.done());

		Bar.dispose();
	});
});
