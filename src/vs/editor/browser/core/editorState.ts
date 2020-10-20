/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from 'vs/bAse/common/strings';
import { ICodeEditor, IActiveCodeEditor } from 'vs/editor/browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import { CAncellAtionTokenSource, CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ITextModel } from 'vs/editor/common/model';
import { EditorKeybindingCAncellAtionTokenSource } from 'vs/editor/browser/core/keybindingCAncellAtion';

export const enum CodeEditorStAteFlAg {
	VAlue = 1,
	Selection = 2,
	Position = 4,
	Scroll = 8
}

export clAss EditorStAte {

	privAte reAdonly flAgs: number;

	privAte reAdonly position: Position | null;
	privAte reAdonly selection: RAnge | null;
	privAte reAdonly modelVersionId: string | null;
	privAte reAdonly scrollLeft: number;
	privAte reAdonly scrollTop: number;

	constructor(editor: ICodeEditor, flAgs: number) {
		this.flAgs = flAgs;

		if ((this.flAgs & CodeEditorStAteFlAg.VAlue) !== 0) {
			const model = editor.getModel();
			this.modelVersionId = model ? strings.formAt('{0}#{1}', model.uri.toString(), model.getVersionId()) : null;
		} else {
			this.modelVersionId = null;
		}
		if ((this.flAgs & CodeEditorStAteFlAg.Position) !== 0) {
			this.position = editor.getPosition();
		} else {
			this.position = null;
		}
		if ((this.flAgs & CodeEditorStAteFlAg.Selection) !== 0) {
			this.selection = editor.getSelection();
		} else {
			this.selection = null;
		}
		if ((this.flAgs & CodeEditorStAteFlAg.Scroll) !== 0) {
			this.scrollLeft = editor.getScrollLeft();
			this.scrollTop = editor.getScrollTop();
		} else {
			this.scrollLeft = -1;
			this.scrollTop = -1;
		}
	}

	privAte _equAls(other: Any): booleAn {

		if (!(other instAnceof EditorStAte)) {
			return fAlse;
		}
		const stAte = <EditorStAte>other;

		if (this.modelVersionId !== stAte.modelVersionId) {
			return fAlse;
		}
		if (this.scrollLeft !== stAte.scrollLeft || this.scrollTop !== stAte.scrollTop) {
			return fAlse;
		}
		if (!this.position && stAte.position || this.position && !stAte.position || this.position && stAte.position && !this.position.equAls(stAte.position)) {
			return fAlse;
		}
		if (!this.selection && stAte.selection || this.selection && !stAte.selection || this.selection && stAte.selection && !this.selection.equAlsRAnge(stAte.selection)) {
			return fAlse;
		}
		return true;
	}

	public vAlidAte(editor: ICodeEditor): booleAn {
		return this._equAls(new EditorStAte(editor, this.flAgs));
	}
}

/**
 * A cAncellAtion token source thAt cAncels when the editor chAnges As expressed
 * by the provided flAgs
 * @pArAm rAnge If provided, chAnges in position And selection within this rAnge will not trigger cAncellAtion
 */
export clAss EditorStAteCAncellAtionTokenSource extends EditorKeybindingCAncellAtionTokenSource implements IDisposAble {

	privAte reAdonly _listener = new DisposAbleStore();

	constructor(reAdonly editor: IActiveCodeEditor, flAgs: CodeEditorStAteFlAg, rAnge?: IRAnge, pArent?: CAncellAtionToken) {
		super(editor, pArent);

		if (flAgs & CodeEditorStAteFlAg.Position) {
			this._listener.Add(editor.onDidChAngeCursorPosition(e => {
				if (!rAnge || !RAnge.contAinsPosition(rAnge, e.position)) {
					this.cAncel();
				}
			}));
		}
		if (flAgs & CodeEditorStAteFlAg.Selection) {
			this._listener.Add(editor.onDidChAngeCursorSelection(e => {
				if (!rAnge || !RAnge.contAinsRAnge(rAnge, e.selection)) {
					this.cAncel();
				}
			}));
		}
		if (flAgs & CodeEditorStAteFlAg.Scroll) {
			this._listener.Add(editor.onDidScrollChAnge(_ => this.cAncel()));
		}
		if (flAgs & CodeEditorStAteFlAg.VAlue) {
			this._listener.Add(editor.onDidChAngeModel(_ => this.cAncel()));
			this._listener.Add(editor.onDidChAngeModelContent(_ => this.cAncel()));
		}
	}

	dispose() {
		this._listener.dispose();
		super.dispose();
	}
}

/**
 * A cAncellAtion token source thAt cAncels when the provided model chAnges
 */
export clAss TextModelCAncellAtionTokenSource extends CAncellAtionTokenSource implements IDisposAble {

	privAte _listener: IDisposAble;

	constructor(model: ITextModel, pArent?: CAncellAtionToken) {
		super(pArent);
		this._listener = model.onDidChAngeContent(() => this.cAncel());
	}

	dispose() {
		this._listener.dispose();
		super.dispose();
	}
}

export clAss StAbleEditorScrollStAte {

	public stAtic cApture(editor: ICodeEditor): StAbleEditorScrollStAte {
		let visiblePosition: Position | null = null;
		let visiblePositionScrollDeltA = 0;
		if (editor.getScrollTop() !== 0) {
			const visibleRAnges = editor.getVisibleRAnges();
			if (visibleRAnges.length > 0) {
				visiblePosition = visibleRAnges[0].getStArtPosition();
				const visiblePositionScrollTop = editor.getTopForPosition(visiblePosition.lineNumber, visiblePosition.column);
				visiblePositionScrollDeltA = editor.getScrollTop() - visiblePositionScrollTop;
			}
		}
		return new StAbleEditorScrollStAte(visiblePosition, visiblePositionScrollDeltA, editor.getPosition());
	}

	constructor(
		privAte reAdonly _visiblePosition: Position | null,
		privAte reAdonly _visiblePositionScrollDeltA: number,
		privAte reAdonly _cursorPosition: Position | null
	) {
	}

	public restore(editor: ICodeEditor): void {
		if (this._visiblePosition) {
			const visiblePositionScrollTop = editor.getTopForPosition(this._visiblePosition.lineNumber, this._visiblePosition.column);
			editor.setScrollTop(visiblePositionScrollTop + this._visiblePositionScrollDeltA);
		}
	}

	public restoreRelAtiveVerticAlPositionOfCursor(editor: ICodeEditor): void {
		const currentCursorPosition = editor.getPosition();

		if (!this._cursorPosition || !currentCursorPosition) {
			return;
		}

		const offset = editor.getTopForLineNumber(currentCursorPosition.lineNumber) - editor.getTopForLineNumber(this._cursorPosition.lineNumber);
		editor.setScrollTop(editor.getScrollTop() + offset);
	}
}
