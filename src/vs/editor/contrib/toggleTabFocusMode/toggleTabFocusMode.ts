/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { TAbFocus } from 'vs/editor/common/config/commonEditorConfig';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';

export clAss ToggleTAbFocusModeAction extends EditorAction {

	public stAtic reAdonly ID = 'editor.Action.toggleTAbFocusMode';

	constructor() {
		super({
			id: ToggleTAbFocusModeAction.ID,
			lAbel: nls.locAlize({ key: 'toggle.tAbMovesFocus', comment: ['Turn on/off use of tAb key for moving focus Around VS Code'] }, "Toggle TAb Key Moves Focus"),
			AliAs: 'Toggle TAb Key Moves Focus',
			precondition: undefined,
			kbOpts: {
				kbExpr: null,
				primAry: KeyMod.CtrlCmd | KeyCode.KEY_M,
				mAc: { primAry: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.KEY_M },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const oldVAlue = TAbFocus.getTAbFocusMode();
		const newVAlue = !oldVAlue;
		TAbFocus.setTAbFocusMode(newVAlue);
		if (newVAlue) {
			Alert(nls.locAlize('toggle.tAbMovesFocus.on', "Pressing TAb will now move focus to the next focusAble element"));
		} else {
			Alert(nls.locAlize('toggle.tAbMovesFocus.off', "Pressing TAb will now insert the tAb chArActer"));
		}
	}
}

registerEditorAction(ToggleTAbFocusModeAction);
