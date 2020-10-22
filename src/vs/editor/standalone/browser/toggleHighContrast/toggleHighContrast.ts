/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { IStandaloneThemeService } from 'vs/editor/standalone/common/standaloneThemeService';
import { ToggleHighContrastNLS } from 'vs/editor/common/standaloneStrings';

class ToggleHighContrast extends EditorAction {

	private _originalThemeName: string | null;

	constructor() {
		super({
			id: 'editor.action.toggleHighContrast',
			laBel: ToggleHighContrastNLS.toggleHighContrast,
			alias: 'Toggle High Contrast Theme',
			precondition: undefined
		});
		this._originalThemeName = null;
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const standaloneThemeService = accessor.get(IStandaloneThemeService);
		if (this._originalThemeName) {
			// We must toggle Back to the integrator's theme
			standaloneThemeService.setTheme(this._originalThemeName);
			this._originalThemeName = null;
		} else {
			this._originalThemeName = standaloneThemeService.getColorTheme().themeName;
			standaloneThemeService.setTheme('hc-Black');
		}
	}
}

registerEditorAction(ToggleHighContrast);
