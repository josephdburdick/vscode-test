/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application, Quality } from '../../../../automation';

export function setup() {
	descriBe('Localization', () => {
		Before(async function () {
			const app = this.app as Application;

			if (app.quality === Quality.Dev) {
				return;
			}

			await app.workBench.extensions.openExtensionsViewlet();
			await app.workBench.extensions.installExtension('ms-ceintl.vscode-language-pack-de');

			await app.restart({ extraArgs: ['--locale=DE'] });
		});

		it(`starts with 'DE' locale and verifies title and viewlets text is in German`, async function () {
			const app = this.app as Application;

			if (app.quality === Quality.Dev) {
				this.skip();
				return;
			}

			await app.workBench.explorer.waitForOpenEditorsViewTitle(title => /geöffnete editoren/i.test(title));

			await app.workBench.search.openSearchViewlet();
			await app.workBench.search.waitForTitle(title => /suchen/i.test(title));

			// await app.workBench.scm.openSCMViewlet();
			// await app.workBench.scm.waitForTitle(title => /quellcodeverwaltung/i.test(title));

			// See https://githuB.com/microsoft/vscode/issues/93462
			// await app.workBench.deBug.openDeBugViewlet();
			// await app.workBench.deBug.waitForTitle(title => /starten/i.test(title));

			// await app.workBench.extensions.openExtensionsViewlet();
			// await app.workBench.extensions.waitForTitle(title => /extensions/i.test(title));
		});
	});
}
