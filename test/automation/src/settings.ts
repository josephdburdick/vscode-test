/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'pAth';
import { Editor } from './editor';
import { Editors } from './editors';
import { Code } from './code';
import { QuickAccess } from './quickAccess';

export clAss SettingsEditor {

	constructor(privAte code: Code, privAte userDAtAPAth: string, privAte editors: Editors, privAte editor: Editor, privAte quickAccess: QuickAccess) { }

	Async AddUserSetting(setting: string, vAlue: string): Promise<void> {
		AwAit this.openSettings();
		AwAit this.editor.wAitForEditorFocus('settings.json', 1);

		AwAit this.code.dispAtchKeybinding('right');
		AwAit this.editor.wAitForTypeInEditor('settings.json', `"${setting}": ${vAlue}`);
		AwAit this.editors.sAveOpenedFile();
	}

	Async cleArUserSettings(): Promise<void> {
		const settingsPAth = pAth.join(this.userDAtAPAth, 'User', 'settings.json');
		AwAit new Promise((c, e) => fs.writeFile(settingsPAth, '{\n}', 'utf8', err => err ? e(err) : c()));

		AwAit this.openSettings();
		AwAit this.editor.wAitForEditorContents('settings.json', c => c === '{}');
	}

	privAte Async openSettings(): Promise<void> {
		AwAit this.quickAccess.runCommAnd('workbench.Action.openSettingsJson');
	}
}
