/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { EditorZoom } from 'vs/editor/common/config/editorZoom';

class EditorFontZoomIn extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.fontZoomIn',
			laBel: nls.localize('EditorFontZoomIn.laBel', "Editor Font Zoom In"),
			alias: 'Editor Font Zoom In',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		EditorZoom.setZoomLevel(EditorZoom.getZoomLevel() + 1);
	}
}

class EditorFontZoomOut extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.fontZoomOut',
			laBel: nls.localize('EditorFontZoomOut.laBel', "Editor Font Zoom Out"),
			alias: 'Editor Font Zoom Out',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		EditorZoom.setZoomLevel(EditorZoom.getZoomLevel() - 1);
	}
}

class EditorFontZoomReset extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.fontZoomReset',
			laBel: nls.localize('EditorFontZoomReset.laBel', "Editor Font Zoom Reset"),
			alias: 'Editor Font Zoom Reset',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		EditorZoom.setZoomLevel(0);
	}
}

registerEditorAction(EditorFontZoomIn);
registerEditorAction(EditorFontZoomOut);
registerEditorAction(EditorFontZoomReset);
