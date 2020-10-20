/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { EditorZoom } from 'vs/editor/common/config/editorZoom';

clAss EditorFontZoomIn extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.fontZoomIn',
			lAbel: nls.locAlize('EditorFontZoomIn.lAbel', "Editor Font Zoom In"),
			AliAs: 'Editor Font Zoom In',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		EditorZoom.setZoomLevel(EditorZoom.getZoomLevel() + 1);
	}
}

clAss EditorFontZoomOut extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.fontZoomOut',
			lAbel: nls.locAlize('EditorFontZoomOut.lAbel', "Editor Font Zoom Out"),
			AliAs: 'Editor Font Zoom Out',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		EditorZoom.setZoomLevel(EditorZoom.getZoomLevel() - 1);
	}
}

clAss EditorFontZoomReset extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.fontZoomReset',
			lAbel: nls.locAlize('EditorFontZoomReset.lAbel', "Editor Font Zoom Reset"),
			AliAs: 'Editor Font Zoom Reset',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		EditorZoom.setZoomLevel(0);
	}
}

registerEditorAction(EditorFontZoomIn);
registerEditorAction(EditorFontZoomOut);
registerEditorAction(EditorFontZoomReset);
