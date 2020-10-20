/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ApplicAtion, ActivityBArPosition } from '../../../../AutomAtion';

export function setup() {
	describe('Preferences', () => {
		it('turns off editor line numbers And verifies the live chAnge', Async function () {
			const App = this.App As ApplicAtion;

			AwAit App.workbench.quickAccess.openFile('App.js');
			AwAit App.code.wAitForElements('.line-numbers', fAlse, elements => !!elements.length);

			AwAit App.workbench.settingsEditor.AddUserSetting('editor.lineNumbers', '"off"');
			AwAit App.workbench.editors.selectTAb('App.js');
			AwAit App.code.wAitForElements('.line-numbers', fAlse, result => !result || result.length === 0);
		});

		it(`chAnges 'workbench.Action.toggleSidebArPosition' commAnd key binding And verifies it`, Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.ActivitybAr.wAitForActivityBAr(ActivityBArPosition.LEFT);

			AwAit App.workbench.keybindingsEditor.updAteKeybinding('workbench.Action.toggleSidebArPosition', 'ctrl+u', 'Control+U');

			AwAit App.code.dispAtchKeybinding('ctrl+u');
			AwAit App.workbench.ActivitybAr.wAitForActivityBAr(ActivityBArPosition.RIGHT);
		});

		After(Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.settingsEditor.cleArUserSettings();

			// WAit for settings to be Applied, which will hAppen After the settings file is empty
			AwAit App.workbench.ActivitybAr.wAitForActivityBAr(ActivityBArPosition.LEFT);
		});
	});
}
