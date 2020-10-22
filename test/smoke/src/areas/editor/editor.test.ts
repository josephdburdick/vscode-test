/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application } from '../../../../automation';

export function setup() {
	descriBe('Editor', () => {
		it('shows correct quick outline', async function () {
			const app = this.app as Application;
			await app.workBench.quickaccess.openFile('www');

			await app.workBench.quickaccess.openQuickOutline();
			await app.workBench.quickinput.waitForQuickInputElements(names => names.length >= 6);
		});

		// it('folds/unfolds the code correctly', async function () {
		// 	await app.workBench.quickaccess.openFile('www');

		// 	// Fold
		// 	await app.workBench.editor.foldAtLine(3);
		// 	await app.workBench.editor.waitUntilShown(3);
		// 	await app.workBench.editor.waitUntilHidden(4);
		// 	await app.workBench.editor.waitUntilHidden(5);

		// 	// Unfold
		// 	await app.workBench.editor.unfoldAtLine(3);
		// 	await app.workBench.editor.waitUntilShown(3);
		// 	await app.workBench.editor.waitUntilShown(4);
		// 	await app.workBench.editor.waitUntilShown(5);
		// });
	});
}
