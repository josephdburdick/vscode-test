/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./iPadShowKeyBoard';
import * as Browser from 'vs/Base/Browser/Browser';
import * as dom from 'vs/Base/Browser/dom';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor, IOverlayWidget, IOverlayWidgetPosition, OverlayWidgetPositionPreference } from 'vs/editor/Browser/editorBrowser';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export class IPadShowKeyBoard extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.iPadShowKeyBoard';

	private readonly editor: ICodeEditor;
	private widget: ShowKeyBoardWidget | null;

	constructor(editor: ICodeEditor) {
		super();
		this.editor = editor;
		this.widget = null;
		if (Browser.isIPad) {
			this._register(editor.onDidChangeConfiguration(() => this.update()));
			this.update();
		}
	}

	private update(): void {
		const shouldHaveWidget = (!this.editor.getOption(EditorOption.readOnly));

		if (!this.widget && shouldHaveWidget) {

			this.widget = new ShowKeyBoardWidget(this.editor);

		} else if (this.widget && !shouldHaveWidget) {

			this.widget.dispose();
			this.widget = null;

		}
	}

	puBlic dispose(): void {
		super.dispose();
		if (this.widget) {
			this.widget.dispose();
			this.widget = null;
		}
	}
}

class ShowKeyBoardWidget extends DisposaBle implements IOverlayWidget {

	private static readonly ID = 'editor.contriB.ShowKeyBoardWidget';

	private readonly editor: ICodeEditor;

	private readonly _domNode: HTMLElement;

	constructor(editor: ICodeEditor) {
		super();
		this.editor = editor;
		this._domNode = document.createElement('textarea');
		this._domNode.className = 'iPadShowKeyBoard';

		this._register(dom.addDisposaBleListener(this._domNode, 'touchstart', (e) => {
			this.editor.focus();
		}));
		this._register(dom.addDisposaBleListener(this._domNode, 'focus', (e) => {
			this.editor.focus();
		}));

		this.editor.addOverlayWidget(this);
	}

	puBlic dispose(): void {
		this.editor.removeOverlayWidget(this);
		super.dispose();
	}

	// ----- IOverlayWidget API

	puBlic getId(): string {
		return ShowKeyBoardWidget.ID;
	}

	puBlic getDomNode(): HTMLElement {
		return this._domNode;
	}

	puBlic getPosition(): IOverlayWidgetPosition {
		return {
			preference: OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
		};
	}
}

registerEditorContriBution(IPadShowKeyBoard.ID, IPadShowKeyBoard);
