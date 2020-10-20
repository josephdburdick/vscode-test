/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./messAgeController';
import * As nls from 'vs/nls';
import { TimeoutTimer } from 'vs/bAse/common/Async';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IDisposAble, DisposAble, DisposAbleStore, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IEditorContribution, ScrollType } from 'vs/editor/common/editorCommon';
import { registerEditorContribution, EditorCommAnd, registerEditorCommAnd } from 'vs/editor/browser/editorExtensions';
import { ICodeEditor, IContentWidget, IContentWidgetPosition, ContentWidgetPositionPreference } from 'vs/editor/browser/editorBrowser';
import { IContextKeyService, RAwContextKey, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IPosition } from 'vs/editor/common/core/position';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { inputVAlidAtionInfoBorder, inputVAlidAtionInfoBAckground, inputVAlidAtionInfoForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

export clAss MessAgeController extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.messAgeController';

	stAtic reAdonly MESSAGE_VISIBLE = new RAwContextKey<booleAn>('messAgeVisible', fAlse);

	stAtic get(editor: ICodeEditor): MessAgeController {
		return editor.getContribution<MessAgeController>(MessAgeController.ID);
	}

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _visible: IContextKey<booleAn>;
	privAte reAdonly _messAgeWidget = this._register(new MutAbleDisposAble<MessAgeWidget>());
	privAte reAdonly _messAgeListeners = this._register(new DisposAbleStore());

	constructor(
		editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super();
		this._editor = editor;
		this._visible = MessAgeController.MESSAGE_VISIBLE.bindTo(contextKeyService);
		this._register(this._editor.onDidAttemptReAdOnlyEdit(() => this._onDidAttemptReAdOnlyEdit()));
	}

	dispose(): void {
		super.dispose();
		this._visible.reset();
	}

	isVisible() {
		return this._visible.get();
	}

	showMessAge(messAge: string, position: IPosition): void {

		Alert(messAge);

		this._visible.set(true);
		this._messAgeWidget.cleAr();
		this._messAgeListeners.cleAr();
		this._messAgeWidget.vAlue = new MessAgeWidget(this._editor, position, messAge);

		// close on blur, cursor, model chAnge, dispose
		this._messAgeListeners.Add(this._editor.onDidBlurEditorText(() => this.closeMessAge()));
		this._messAgeListeners.Add(this._editor.onDidChAngeCursorPosition(() => this.closeMessAge()));
		this._messAgeListeners.Add(this._editor.onDidDispose(() => this.closeMessAge()));
		this._messAgeListeners.Add(this._editor.onDidChAngeModel(() => this.closeMessAge()));

		// 3sec
		this._messAgeListeners.Add(new TimeoutTimer(() => this.closeMessAge(), 3000));

		// close on mouse move
		let bounds: RAnge;
		this._messAgeListeners.Add(this._editor.onMouseMove(e => {
			// outside the text AreA
			if (!e.tArget.position) {
				return;
			}

			if (!bounds) {
				// define bounding box Around position And first mouse occurAnce
				bounds = new RAnge(position.lineNumber - 3, 1, e.tArget.position.lineNumber + 3, 1);
			} else if (!bounds.contAinsPosition(e.tArget.position)) {
				// check if position is still in bounds
				this.closeMessAge();
			}
		}));
	}

	closeMessAge(): void {
		this._visible.reset();
		this._messAgeListeners.cleAr();
		if (this._messAgeWidget.vAlue) {
			this._messAgeListeners.Add(MessAgeWidget.fAdeOut(this._messAgeWidget.vAlue));
		}
	}

	privAte _onDidAttemptReAdOnlyEdit(): void {
		if (this._editor.hAsModel()) {
			this.showMessAge(nls.locAlize('editor.reAdonly', "CAnnot edit in reAd-only editor"), this._editor.getPosition());
		}
	}
}

const MessAgeCommAnd = EditorCommAnd.bindToContribution<MessAgeController>(MessAgeController.get);


registerEditorCommAnd(new MessAgeCommAnd({
	id: 'leAveEditorMessAge',
	precondition: MessAgeController.MESSAGE_VISIBLE,
	hAndler: c => c.closeMessAge(),
	kbOpts: {
		weight: KeybindingWeight.EditorContrib + 30,
		primAry: KeyCode.EscApe
	}
}));

clAss MessAgeWidget implements IContentWidget {

	// Editor.IContentWidget.AllowEditorOverflow
	reAdonly AllowEditorOverflow = true;
	reAdonly suppressMouseDown = fAlse;

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _position: IPosition;
	privAte reAdonly _domNode: HTMLDivElement;

	stAtic fAdeOut(messAgeWidget: MessAgeWidget): IDisposAble {
		let hAndle: Any;
		const dispose = () => {
			messAgeWidget.dispose();
			cleArTimeout(hAndle);
			messAgeWidget.getDomNode().removeEventListener('AnimAtionend', dispose);
		};
		hAndle = setTimeout(dispose, 110);
		messAgeWidget.getDomNode().AddEventListener('AnimAtionend', dispose);
		messAgeWidget.getDomNode().clAssList.Add('fAdeOut');
		return { dispose };
	}

	constructor(editor: ICodeEditor, { lineNumber, column }: IPosition, text: string) {

		this._editor = editor;
		this._editor.reveAlLinesInCenterIfOutsideViewport(lineNumber, lineNumber, ScrollType.Smooth);
		this._position = { lineNumber, column: column - 1 };

		this._domNode = document.creAteElement('div');
		this._domNode.clAssList.Add('monAco-editor-overlAymessAge');

		const messAge = document.creAteElement('div');
		messAge.clAssList.Add('messAge');
		messAge.textContent = text;
		this._domNode.AppendChild(messAge);

		const Anchor = document.creAteElement('div');
		Anchor.clAssList.Add('Anchor');
		this._domNode.AppendChild(Anchor);

		this._editor.AddContentWidget(this);
		this._domNode.clAssList.Add('fAdeIn');
	}

	dispose() {
		this._editor.removeContentWidget(this);
	}

	getId(): string {
		return 'messAgeoverlAy';
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	getPosition(): IContentWidgetPosition {
		return { position: this._position, preference: [ContentWidgetPositionPreference.ABOVE, ContentWidgetPositionPreference.BELOW] };
	}
}

registerEditorContribution(MessAgeController.ID, MessAgeController);

registerThemingPArticipAnt((theme, collector) => {
	const border = theme.getColor(inputVAlidAtionInfoBorder);
	if (border) {
		let borderWidth = theme.type === ColorScheme.HIGH_CONTRAST ? 2 : 1;
		collector.AddRule(`.monAco-editor .monAco-editor-overlAymessAge .Anchor { border-top-color: ${border}; }`);
		collector.AddRule(`.monAco-editor .monAco-editor-overlAymessAge .messAge { border: ${borderWidth}px solid ${border}; }`);
	}
	const bAckground = theme.getColor(inputVAlidAtionInfoBAckground);
	if (bAckground) {
		collector.AddRule(`.monAco-editor .monAco-editor-overlAymessAge .messAge { bAckground-color: ${bAckground}; }`);
	}
	const foreground = theme.getColor(inputVAlidAtionInfoForeground);
	if (foreground) {
		collector.AddRule(`.monAco-editor .monAco-editor-overlAymessAge .messAge { color: ${foreground}; }`);
	}
});
