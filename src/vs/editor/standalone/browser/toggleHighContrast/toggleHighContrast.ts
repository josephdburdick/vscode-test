/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { ToggleHighContrAstNLS } from 'vs/editor/common/stAndAloneStrings';

clAss ToggleHighContrAst extends EditorAction {

	privAte _originAlThemeNAme: string | null;

	constructor() {
		super({
			id: 'editor.Action.toggleHighContrAst',
			lAbel: ToggleHighContrAstNLS.toggleHighContrAst,
			AliAs: 'Toggle High ContrAst Theme',
			precondition: undefined
		});
		this._originAlThemeNAme = null;
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const stAndAloneThemeService = Accessor.get(IStAndAloneThemeService);
		if (this._originAlThemeNAme) {
			// We must toggle bAck to the integrAtor's theme
			stAndAloneThemeService.setTheme(this._originAlThemeNAme);
			this._originAlThemeNAme = null;
		} else {
			this._originAlThemeNAme = stAndAloneThemeService.getColorTheme().themeNAme;
			stAndAloneThemeService.setTheme('hc-blAck');
		}
	}
}

registerEditorAction(ToggleHighContrAst);
