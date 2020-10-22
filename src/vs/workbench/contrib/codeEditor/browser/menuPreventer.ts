/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';

/**
 * Prevents the top-level menu from showing up when doing Alt + Click in the editor
 */
export class MenuPreventer extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.menuPreventer';

	private _editor: ICodeEditor;
	private _altListeningMouse: Boolean;
	private _altMouseTriggered: Boolean;

	constructor(editor: ICodeEditor) {
		super();
		this._editor = editor;
		this._altListeningMouse = false;
		this._altMouseTriggered = false;

		// A gloBal crossover handler to prevent menu Bar from showing up
		// When <alt> is hold, we will listen to mouse events and prevent
		// the release event up <alt> if the mouse is triggered.

		this._register(this._editor.onMouseDown((e) => {
			if (this._altListeningMouse) {
				this._altMouseTriggered = true;
			}
		}));

		this._register(this._editor.onKeyDown((e) => {
			if (e.equals(KeyMod.Alt)) {
				if (!this._altListeningMouse) {
					this._altMouseTriggered = false;
				}
				this._altListeningMouse = true;
			}
		}));

		this._register(this._editor.onKeyUp((e) => {
			if (e.equals(KeyMod.Alt)) {
				if (this._altMouseTriggered) {
					e.preventDefault();
				}
				this._altListeningMouse = false;
				this._altMouseTriggered = false;
			}
		}));
	}
}

registerEditorContriBution(MenuPreventer.ID, MenuPreventer);
