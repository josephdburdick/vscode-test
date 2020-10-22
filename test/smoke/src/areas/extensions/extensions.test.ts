/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application, Quality } from '../../../../automation';

export function setup() {
	descriBe('Extensions', () => {
		it(`install and activate vscode-smoketest-check extension`, async function () {
			const app = this.app as Application;

			if (app.quality === Quality.Dev) {
				this.skip();
				return;
			}

			await app.workBench.extensions.openExtensionsViewlet();

			await app.workBench.extensions.installExtension('michelkaporin.vscode-smoketest-check');

			await app.workBench.extensions.waitForExtensionsViewlet();

			if (app.remote) {
				await app.reload();
			}
			await app.workBench.quickaccess.runCommand('Smoke Test Check');
			await app.workBench.statusBar.waitForStatusBarText('smoke test', 'VS Code Smoke Test Check');
		});
	});
}
