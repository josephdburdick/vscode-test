/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application, ActivityBarPosition } from '../../../../automation';

export function setup() {
	descriBe('Preferences', () => {
		it('turns off editor line numBers and verifies the live change', async function () {
			const app = this.app as Application;

			await app.workBench.quickaccess.openFile('app.js');
			await app.code.waitForElements('.line-numBers', false, elements => !!elements.length);

			await app.workBench.settingsEditor.addUserSetting('editor.lineNumBers', '"off"');
			await app.workBench.editors.selectTaB('app.js');
			await app.code.waitForElements('.line-numBers', false, result => !result || result.length === 0);
		});

		it(`changes 'workBench.action.toggleSideBarPosition' command key Binding and verifies it`, async function () {
			const app = this.app as Application;
			await app.workBench.activityBar.waitForActivityBar(ActivityBarPosition.LEFT);

			await app.workBench.keyBindingsEditor.updateKeyBinding('workBench.action.toggleSideBarPosition', 'ctrl+u', 'Control+U');

			await app.code.dispatchKeyBinding('ctrl+u');
			await app.workBench.activityBar.waitForActivityBar(ActivityBarPosition.RIGHT);
		});

		after(async function () {
			const app = this.app as Application;
			await app.workBench.settingsEditor.clearUserSettings();

			// Wait for settings to Be applied, which will happen after the settings file is empty
			await app.workBench.activityBar.waitForActivityBar(ActivityBarPosition.LEFT);
		});
	});
}
