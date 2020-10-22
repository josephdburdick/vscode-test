/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';
import { ICodeEditor, IActiveCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { Range, IRange } from 'vs/editor/common/core/range';
import { CancellationTokenSource, CancellationToken } from 'vs/Base/common/cancellation';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ITextModel } from 'vs/editor/common/model';
import { EditorKeyBindingCancellationTokenSource } from 'vs/editor/Browser/core/keyBindingCancellation';

export const enum CodeEditorStateFlag {
	Value = 1,
	Selection = 2,
	Position = 4,
	Scroll = 8
}

export class EditorState {

	private readonly flags: numBer;

	private readonly position: Position | null;
	private readonly selection: Range | null;
	private readonly modelVersionId: string | null;
	private readonly scrollLeft: numBer;
	private readonly scrollTop: numBer;

	constructor(editor: ICodeEditor, flags: numBer) {
		this.flags = flags;

		if ((this.flags & CodeEditorStateFlag.Value) !== 0) {
			const model = editor.getModel();
			this.modelVersionId = model ? strings.format('{0}#{1}', model.uri.toString(), model.getVersionId()) : null;
		} else {
			this.modelVersionId = null;
		}
		if ((this.flags & CodeEditorStateFlag.Position) !== 0) {
			this.position = editor.getPosition();
		} else {
			this.position = null;
		}
		if ((this.flags & CodeEditorStateFlag.Selection) !== 0) {
			this.selection = editor.getSelection();
		} else {
			this.selection = null;
		}
		if ((this.flags & CodeEditorStateFlag.Scroll) !== 0) {
			this.scrollLeft = editor.getScrollLeft();
			this.scrollTop = editor.getScrollTop();
		} else {
			this.scrollLeft = -1;
			this.scrollTop = -1;
		}
	}

	private _equals(other: any): Boolean {

		if (!(other instanceof EditorState)) {
			return false;
		}
		const state = <EditorState>other;

		if (this.modelVersionId !== state.modelVersionId) {
			return false;
		}
		if (this.scrollLeft !== state.scrollLeft || this.scrollTop !== state.scrollTop) {
			return false;
		}
		if (!this.position && state.position || this.position && !state.position || this.position && state.position && !this.position.equals(state.position)) {
			return false;
		}
		if (!this.selection && state.selection || this.selection && !state.selection || this.selection && state.selection && !this.selection.equalsRange(state.selection)) {
			return false;
		}
		return true;
	}

	puBlic validate(editor: ICodeEditor): Boolean {
		return this._equals(new EditorState(editor, this.flags));
	}
}

/**
 * A cancellation token source that cancels when the editor changes as expressed
 * By the provided flags
 * @param range If provided, changes in position and selection within this range will not trigger cancellation
 */
export class EditorStateCancellationTokenSource extends EditorKeyBindingCancellationTokenSource implements IDisposaBle {

	private readonly _listener = new DisposaBleStore();

	constructor(readonly editor: IActiveCodeEditor, flags: CodeEditorStateFlag, range?: IRange, parent?: CancellationToken) {
		super(editor, parent);

		if (flags & CodeEditorStateFlag.Position) {
			this._listener.add(editor.onDidChangeCursorPosition(e => {
				if (!range || !Range.containsPosition(range, e.position)) {
					this.cancel();
				}
			}));
		}
		if (flags & CodeEditorStateFlag.Selection) {
			this._listener.add(editor.onDidChangeCursorSelection(e => {
				if (!range || !Range.containsRange(range, e.selection)) {
					this.cancel();
				}
			}));
		}
		if (flags & CodeEditorStateFlag.Scroll) {
			this._listener.add(editor.onDidScrollChange(_ => this.cancel()));
		}
		if (flags & CodeEditorStateFlag.Value) {
			this._listener.add(editor.onDidChangeModel(_ => this.cancel()));
			this._listener.add(editor.onDidChangeModelContent(_ => this.cancel()));
		}
	}

	dispose() {
		this._listener.dispose();
		super.dispose();
	}
}

/**
 * A cancellation token source that cancels when the provided model changes
 */
export class TextModelCancellationTokenSource extends CancellationTokenSource implements IDisposaBle {

	private _listener: IDisposaBle;

	constructor(model: ITextModel, parent?: CancellationToken) {
		super(parent);
		this._listener = model.onDidChangeContent(() => this.cancel());
	}

	dispose() {
		this._listener.dispose();
		super.dispose();
	}
}

export class StaBleEditorScrollState {

	puBlic static capture(editor: ICodeEditor): StaBleEditorScrollState {
		let visiBlePosition: Position | null = null;
		let visiBlePositionScrollDelta = 0;
		if (editor.getScrollTop() !== 0) {
			const visiBleRanges = editor.getVisiBleRanges();
			if (visiBleRanges.length > 0) {
				visiBlePosition = visiBleRanges[0].getStartPosition();
				const visiBlePositionScrollTop = editor.getTopForPosition(visiBlePosition.lineNumBer, visiBlePosition.column);
				visiBlePositionScrollDelta = editor.getScrollTop() - visiBlePositionScrollTop;
			}
		}
		return new StaBleEditorScrollState(visiBlePosition, visiBlePositionScrollDelta, editor.getPosition());
	}

	constructor(
		private readonly _visiBlePosition: Position | null,
		private readonly _visiBlePositionScrollDelta: numBer,
		private readonly _cursorPosition: Position | null
	) {
	}

	puBlic restore(editor: ICodeEditor): void {
		if (this._visiBlePosition) {
			const visiBlePositionScrollTop = editor.getTopForPosition(this._visiBlePosition.lineNumBer, this._visiBlePosition.column);
			editor.setScrollTop(visiBlePositionScrollTop + this._visiBlePositionScrollDelta);
		}
	}

	puBlic restoreRelativeVerticalPositionOfCursor(editor: ICodeEditor): void {
		const currentCursorPosition = editor.getPosition();

		if (!this._cursorPosition || !currentCursorPosition) {
			return;
		}

		const offset = editor.getTopForLineNumBer(currentCursorPosition.lineNumBer) - editor.getTopForLineNumBer(this._cursorPosition.lineNumBer);
		editor.setScrollTop(editor.getScrollTop() + offset);
	}
}
