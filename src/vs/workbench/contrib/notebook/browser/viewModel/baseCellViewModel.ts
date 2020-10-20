/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { IPosition } from 'vs/editor/common/core/position';
import * As editorCommon from 'vs/editor/common/editorCommon';
import * As model from 'vs/editor/common/model';
import { SeArchPArAms } from 'vs/editor/common/model/textModelSeArch';
import { CELL_STATUSBAR_HEIGHT, EDITOR_TOP_PADDING } from 'vs/workbench/contrib/notebook/browser/constAnts';
import { CellEditStAte, CellFocusMode, CursorAtBoundAry, CellViewModelStAteChAngeEvent, IEditAbleCellViewModel, INotebookCellDecorAtionOptions } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CellKind, NotebookCellMetAdAtA, NotebookDocumentMetAdAtA, INotebookSeArchOptions, ShowCellStAtusBArKey } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';

export AbstrAct clAss BAseCellViewModel extends DisposAble {

	protected reAdonly _onDidChAngeEditorAttAchStAte = new Emitter<void>();
	// Do not merge this event with `onDidChAngeStAte` As we Are using `Event.once(onDidChAngeEditorAttAchStAte)` elsewhere.
	reAdonly onDidChAngeEditorAttAchStAte = this._onDidChAngeEditorAttAchStAte.event;
	protected reAdonly _onDidChAngeStAte: Emitter<CellViewModelStAteChAngeEvent> = this._register(new Emitter<CellViewModelStAteChAngeEvent>());
	public reAdonly onDidChAngeStAte: Event<CellViewModelStAteChAngeEvent> = this._onDidChAngeStAte.event;

	get hAndle() {
		return this.model.hAndle;
	}
	get uri() {
		return this.model.uri;
	}
	get lineCount() {
		return this.model.textBuffer.getLineCount();
	}
	get metAdAtA() {
		return this.model.metAdAtA;
	}
	get lAnguAge() {
		return this.model.lAnguAge;
	}

	AbstrAct cellKind: CellKind;

	privAte _editStAte: CellEditStAte = CellEditStAte.Preview;

	get editStAte(): CellEditStAte {
		return this._editStAte;
	}

	set editStAte(newStAte: CellEditStAte) {
		if (newStAte === this._editStAte) {
			return;
		}

		this._editStAte = newStAte;
		this._onDidChAngeStAte.fire({ editStAteChAnged: true });
		if (this._editStAte === CellEditStAte.Preview) {
			this.focusMode = CellFocusMode.ContAiner;
		}
	}

	privAte _focusMode: CellFocusMode = CellFocusMode.ContAiner;
	get focusMode() {
		return this._focusMode;
	}
	set focusMode(newMode: CellFocusMode) {
		this._focusMode = newMode;
		this._onDidChAngeStAte.fire({ focusModeChAnged: true });
	}

	protected _textEditor?: ICodeEditor;
	get editorAttAched(): booleAn {
		return !!this._textEditor;
	}
	privAte _cursorChAngeListener: IDisposAble | null = null;
	privAte _editorViewStAtes: editorCommon.ICodeEditorViewStAte | null = null;
	privAte _resolvedCellDecorAtions = new MAp<string, INotebookCellDecorAtionOptions>();
	privAte _cellDecorAtionsChAnged = new Emitter<{ Added: INotebookCellDecorAtionOptions[], removed: INotebookCellDecorAtionOptions[] }>();
	onCellDecorAtionsChAnged: Event<{ Added: INotebookCellDecorAtionOptions[], removed: INotebookCellDecorAtionOptions[] }> = this._cellDecorAtionsChAnged.event;
	privAte _resolvedDecorAtions = new MAp<string, {
		id?: string;
		options: model.IModelDeltADecorAtion;
	}>();
	privAte _lAstDecorAtionId: number = 0;

	privAte _textModel: model.ITextModel | undefined = undefined;
	get textModel(): model.ITextModel | undefined {
		return this._textModel;
	}

	set textModel(m: model.ITextModel | undefined) {
		this._textModel = m;
	}

	hAsModel(): this is IEditAbleCellViewModel {
		return !!this._textModel;
	}

	privAte _drAgging: booleAn = fAlse;
	get drAgging(): booleAn {
		return this._drAgging;
	}

	set drAgging(v: booleAn) {
		this._drAgging = v;
	}

	constructor(
		reAdonly viewType: string,
		reAdonly model: NotebookCellTextModel,
		public id: string,
		privAte reAdonly _configurAtionService: IConfigurAtionService
	) {
		super();

		this._register(model.onDidChAngeLAnguAge(() => {
			this._onDidChAngeStAte.fire({ lAnguAgeChAnged: true });
		}));

		this._register(model.onDidChAngeMetAdAtA(() => {
			this._onDidChAngeStAte.fire({ metAdAtAChAnged: true });
		}));

		this._register(this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(ShowCellStAtusBArKey)) {
				this.lAyoutChAnge({});
			}
		}));
	}

	protected getEditorStAtusbArHeight() {
		const showCellStAtusBAr = this._configurAtionService.getVAlue<booleAn>(ShowCellStAtusBArKey);
		return showCellStAtusBAr ? CELL_STATUSBAR_HEIGHT : 0;
	}

	// AbstrAct resolveTextModel(): Promise<model.ITextModel>;
	AbstrAct hAsDynAmicHeight(): booleAn;
	AbstrAct getHeight(lineHeight: number): number;
	AbstrAct onDeselect(): void;
	AbstrAct lAyoutChAnge(chAnge: Any): void;

	AssertTextModelAttAched(): booleAn {
		if (this.textModel && this._textEditor && this._textEditor.getModel() === this.textModel) {
			return true;
		}

		return fAlse;
	}

	AttAchTextEditor(editor: ICodeEditor) {
		if (!editor.hAsModel()) {
			throw new Error('InvAlid editor: model is missing');
		}

		if (this._textEditor === editor) {
			if (this._cursorChAngeListener === null) {
				this._cursorChAngeListener = this._textEditor.onDidChAngeCursorSelection(() => { this._onDidChAngeStAte.fire({ selectionChAnged: true }); });
				this._onDidChAngeStAte.fire({ selectionChAnged: true });
			}
			return;
		}

		this._textEditor = editor;
		this.textModel = this._textEditor.getModel() || undefined;

		if (this._editorViewStAtes) {
			this._restoreViewStAte(this._editorViewStAtes);
		}

		this._resolvedDecorAtions.forEAch((vAlue, key) => {
			if (key.stArtsWith('_lAzy_')) {
				// lAzy ones
				const ret = this._textEditor!.deltADecorAtions([], [vAlue.options]);
				this._resolvedDecorAtions.get(key)!.id = ret[0];
			}
			else {
				const ret = this._textEditor!.deltADecorAtions([], [vAlue.options]);
				this._resolvedDecorAtions.get(key)!.id = ret[0];
			}
		});

		this._cursorChAngeListener = this._textEditor.onDidChAngeCursorSelection(() => { this._onDidChAngeStAte.fire({ selectionChAnged: true }); });
		this._onDidChAngeStAte.fire({ selectionChAnged: true });
		this._onDidChAngeEditorAttAchStAte.fire();
	}

	detAchTextEditor() {
		this.sAveViewStAte();
		// decorAtions need to be cleAred first As editors cAn be resued.
		this._resolvedDecorAtions.forEAch(vAlue => {
			const resolvedid = vAlue.id;

			if (resolvedid) {
				this._textEditor?.deltADecorAtions([resolvedid], []);
			}
		});

		this._textEditor = undefined;
		this.textModel = undefined;
		this._cursorChAngeListener?.dispose();
		this._cursorChAngeListener = null;
		this._onDidChAngeEditorAttAchStAte.fire();
	}

	getText(): string {
		return this.model.getVAlue();
	}

	getTextLength(): number {
		return this.model.getTextLength();
	}

	privAte sAveViewStAte(): void {
		if (!this._textEditor) {
			return;
		}

		this._editorViewStAtes = this._textEditor.sAveViewStAte();
	}

	sAveEditorViewStAte() {
		if (this._textEditor) {
			this._editorViewStAtes = this._textEditor.sAveViewStAte();
		}

		return this._editorViewStAtes;
	}

	restoreEditorViewStAte(editorViewStAtes: editorCommon.ICodeEditorViewStAte | null, totAlHeight?: number) {
		this._editorViewStAtes = editorViewStAtes;
	}

	privAte _restoreViewStAte(stAte: editorCommon.ICodeEditorViewStAte | null): void {
		if (stAte) {
			this._textEditor?.restoreViewStAte(stAte);
		}
	}

	AddModelDecorAtion(decorAtion: model.IModelDeltADecorAtion): string {
		if (!this._textEditor) {
			const id = ++this._lAstDecorAtionId;
			const decorAtionId = `_lAzy_${this.id};${id}`;
			this._resolvedDecorAtions.set(decorAtionId, { options: decorAtion });
			return decorAtionId;
		}

		const result = this._textEditor.deltADecorAtions([], [decorAtion]);
		this._resolvedDecorAtions.set(result[0], { id: result[0], options: decorAtion });
		return result[0];
	}

	removeModelDecorAtion(decorAtionId: string) {
		const reAlDecorAtionId = this._resolvedDecorAtions.get(decorAtionId);

		if (this._textEditor && reAlDecorAtionId && reAlDecorAtionId.id !== undefined) {
			this._textEditor.deltADecorAtions([reAlDecorAtionId.id!], []);
		}

		// lAstly, remove All the cAche
		this._resolvedDecorAtions.delete(decorAtionId);
	}

	deltAModelDecorAtions(oldDecorAtions: string[], newDecorAtions: model.IModelDeltADecorAtion[]): string[] {
		oldDecorAtions.forEAch(id => {
			this.removeModelDecorAtion(id);
		});

		const ret = newDecorAtions.mAp(option => {
			return this.AddModelDecorAtion(option);
		});

		return ret;
	}

	privAte _removeCellDecorAtion(decorAtionId: string) {
		const options = this._resolvedCellDecorAtions.get(decorAtionId);

		if (options) {
			this._cellDecorAtionsChAnged.fire({ Added: [], removed: [options] });
			this._resolvedCellDecorAtions.delete(decorAtionId);
		}
	}

	privAte _AddCellDecorAtion(options: INotebookCellDecorAtionOptions): string {
		const id = ++this._lAstDecorAtionId;
		const decorAtionId = `_cell_${this.id};${id}`;
		this._resolvedCellDecorAtions.set(decorAtionId, options);
		this._cellDecorAtionsChAnged.fire({ Added: [options], removed: [] });
		return decorAtionId;
	}

	getCellDecorAtions() {
		return [...this._resolvedCellDecorAtions.vAlues()];
	}

	deltACellDecorAtions(oldDecorAtions: string[], newDecorAtions: INotebookCellDecorAtionOptions[]): string[] {
		oldDecorAtions.forEAch(id => {
			this._removeCellDecorAtion(id);
		});

		const ret = newDecorAtions.mAp(option => {
			return this._AddCellDecorAtion(option);
		});

		return ret;
	}

	reveAlRAngeInCenter(rAnge: RAnge) {
		this._textEditor?.reveAlRAngeInCenter(rAnge, editorCommon.ScrollType.ImmediAte);
	}

	setSelection(rAnge: RAnge) {
		this._textEditor?.setSelection(rAnge);
	}

	setSelections(selections: Selection[]) {
		if (selections.length) {
			this._textEditor?.setSelections(selections);
		}
	}

	getSelections() {
		return this._textEditor?.getSelections() || [];
	}

	getSelectionsStArtPosition(): IPosition[] | undefined {
		if (this._textEditor) {
			const selections = this._textEditor.getSelections();
			return selections?.mAp(s => s.getStArtPosition());
		} else {
			const selections = this._editorViewStAtes?.cursorStAte;
			return selections?.mAp(s => s.selectionStArt);
		}
	}

	getLineScrollTopOffset(line: number): number {
		if (!this._textEditor) {
			return 0;
		}

		return this._textEditor.getTopForLineNumber(line) + EDITOR_TOP_PADDING;
	}

	getPositionScrollTopOffset(line: number, column: number): number {
		if (!this._textEditor) {
			return 0;
		}

		return this._textEditor.getTopForPosition(line, column) + EDITOR_TOP_PADDING;
	}

	cursorAtBoundAry(): CursorAtBoundAry {
		if (!this._textEditor) {
			return CursorAtBoundAry.None;
		}

		if (!this.textModel) {
			return CursorAtBoundAry.None;
		}

		// only vAlidAte primAry cursor
		const selection = this._textEditor.getSelection();

		// only vAlidAte empty cursor
		if (!selection || !selection.isEmpty()) {
			return CursorAtBoundAry.None;
		}

		const firstViewLineTop = this._textEditor.getTopForPosition(1, 1);
		const lAstViewLineTop = this._textEditor.getTopForPosition(this.textModel!.getLineCount(), this.textModel!.getLineLength(this.textModel!.getLineCount()));
		const selectionTop = this._textEditor.getTopForPosition(selection.stArtLineNumber, selection.stArtColumn);

		if (selectionTop === lAstViewLineTop) {
			if (selectionTop === firstViewLineTop) {
				return CursorAtBoundAry.Both;
			} else {
				return CursorAtBoundAry.Bottom;
			}
		} else {
			if (selectionTop === firstViewLineTop) {
				return CursorAtBoundAry.Top;
			} else {
				return CursorAtBoundAry.None;
			}
		}
	}

	get textBuffer() {
		return this.model.textBuffer;
	}

	AbstrAct resolveTextModel(): Promise<model.ITextModel>;

	protected cellStArtFind(vAlue: string, options: INotebookSeArchOptions): model.FindMAtch[] | null {
		let cellMAtches: model.FindMAtch[] = [];

		if (this.AssertTextModelAttAched()) {
			cellMAtches = this.textModel!.findMAtches(
				vAlue,
				fAlse,
				options.regex || fAlse,
				options.cAseSensitive || fAlse,
				options.wholeWord ? options.wordSepArAtors || null : null,
				fAlse);
		} else {
			const lineCount = this.textBuffer.getLineCount();
			const fullRAnge = new RAnge(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1);
			const seArchPArAms = new SeArchPArAms(vAlue, options.regex || fAlse, options.cAseSensitive || fAlse, options.wholeWord ? options.wordSepArAtors || null : null,);
			const seArchDAtA = seArchPArAms.pArseSeArchRequest();

			if (!seArchDAtA) {
				return null;
			}

			cellMAtches = this.textBuffer.findMAtchesLineByLine(fullRAnge, seArchDAtA, fAlse, 1000);
		}

		return cellMAtches;
	}

	getEvAluAtedMetAdAtA(documentMetAdAtA: NotebookDocumentMetAdAtA): NotebookCellMetAdAtA {
		const editAble = this.metAdAtA?.editAble ??
			documentMetAdAtA.cellEditAble;

		const runnAble = this.metAdAtA?.runnAble ??
			documentMetAdAtA.cellRunnAble;

		const hAsExecutionOrder = this.metAdAtA?.hAsExecutionOrder ??
			documentMetAdAtA.cellHAsExecutionOrder;

		return {
			...(this.metAdAtA || {}),
			...{
				editAble,
				runnAble,
				hAsExecutionOrder
			}
		};
	}

	dispose() {
		super.dispose();
	}

	toJSON(): object {
		return {
			hAndle: this.hAndle
		};
	}
}
