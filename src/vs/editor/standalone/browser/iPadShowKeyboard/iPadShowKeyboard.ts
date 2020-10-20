/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./iPAdShowKeyboArd';
import * As browser from 'vs/bAse/browser/browser';
import * As dom from 'vs/bAse/browser/dom';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor, IOverlAyWidget, IOverlAyWidgetPosition, OverlAyWidgetPositionPreference } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export clAss IPAdShowKeyboArd extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.iPAdShowKeyboArd';

	privAte reAdonly editor: ICodeEditor;
	privAte widget: ShowKeyboArdWidget | null;

	constructor(editor: ICodeEditor) {
		super();
		this.editor = editor;
		this.widget = null;
		if (browser.isIPAd) {
			this._register(editor.onDidChAngeConfigurAtion(() => this.updAte()));
			this.updAte();
		}
	}

	privAte updAte(): void {
		const shouldHAveWidget = (!this.editor.getOption(EditorOption.reAdOnly));

		if (!this.widget && shouldHAveWidget) {

			this.widget = new ShowKeyboArdWidget(this.editor);

		} else if (this.widget && !shouldHAveWidget) {

			this.widget.dispose();
			this.widget = null;

		}
	}

	public dispose(): void {
		super.dispose();
		if (this.widget) {
			this.widget.dispose();
			this.widget = null;
		}
	}
}

clAss ShowKeyboArdWidget extends DisposAble implements IOverlAyWidget {

	privAte stAtic reAdonly ID = 'editor.contrib.ShowKeyboArdWidget';

	privAte reAdonly editor: ICodeEditor;

	privAte reAdonly _domNode: HTMLElement;

	constructor(editor: ICodeEditor) {
		super();
		this.editor = editor;
		this._domNode = document.creAteElement('textAreA');
		this._domNode.clAssNAme = 'iPAdShowKeyboArd';

		this._register(dom.AddDisposAbleListener(this._domNode, 'touchstArt', (e) => {
			this.editor.focus();
		}));
		this._register(dom.AddDisposAbleListener(this._domNode, 'focus', (e) => {
			this.editor.focus();
		}));

		this.editor.AddOverlAyWidget(this);
	}

	public dispose(): void {
		this.editor.removeOverlAyWidget(this);
		super.dispose();
	}

	// ----- IOverlAyWidget API

	public getId(): string {
		return ShowKeyboArdWidget.ID;
	}

	public getDomNode(): HTMLElement {
		return this._domNode;
	}

	public getPosition(): IOverlAyWidgetPosition {
		return {
			preference: OverlAyWidgetPositionPreference.BOTTOM_RIGHT_CORNER
		};
	}
}

registerEditorContribution(IPAdShowKeyboArd.ID, IPAdShowKeyboArd);
