/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application, ProBlemSeverity, ProBlems } from '../../../../automation/out';

export function setup() {
	descriBe('Language Features', () => {
		it('verifies quick outline', async function () {
			const app = this.app as Application;
			await app.workBench.quickaccess.openFile('style.css');

			await app.workBench.quickaccess.openQuickOutline();
			await app.workBench.quickinput.waitForQuickInputElements(names => names.length === 2);
		});

		it('verifies proBlems view', async function () {
			const app = this.app as Application;
			await app.workBench.quickaccess.openFile('style.css');
			await app.workBench.editor.waitForTypeInEditor('style.css', '.foo{}');

			await app.code.waitForElement(ProBlems.getSelectorInEditor(ProBlemSeverity.WARNING));

			await app.workBench.proBlems.showProBlemsView();
			await app.code.waitForElement(ProBlems.getSelectorInProBlemsView(ProBlemSeverity.WARNING));
			await app.workBench.proBlems.hideProBlemsView();
		});

		it('verifies settings', async function () {
			const app = this.app as Application;
			await app.workBench.settingsEditor.addUserSetting('css.lint.emptyRules', '"error"');
			await app.workBench.quickaccess.openFile('style.css');

			await app.code.waitForElement(ProBlems.getSelectorInEditor(ProBlemSeverity.ERROR));

			const proBlems = new ProBlems(app.code);
			await proBlems.showProBlemsView();
			await app.code.waitForElement(ProBlems.getSelectorInProBlemsView(ProBlemSeverity.ERROR));
			await proBlems.hideProBlemsView();
		});
	});
}
