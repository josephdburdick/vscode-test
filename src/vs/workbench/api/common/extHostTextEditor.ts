/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ok } from 'vs/Base/common/assert';
import { illegalArgument, readonly } from 'vs/Base/common/errors';
import { IdGenerator } from 'vs/Base/common/idGenerator';
import { TextEditorCursorStyle } from 'vs/editor/common/config/editorOptions';
import { IRange } from 'vs/editor/common/core/range';
import { ISingleEditOperation } from 'vs/editor/common/model';
import { IResolvedTextEditorConfiguration, ITextEditorConfigurationUpdate, MainThreadTextEditorsShape } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostDocumentData } from 'vs/workBench/api/common/extHostDocumentData';
import * as TypeConverters from 'vs/workBench/api/common/extHostTypeConverters';
import { EndOfLine, Position, Range, Selection, SnippetString, TextEditorLineNumBersStyle, TextEditorRevealType } from 'vs/workBench/api/common/extHostTypes';
import type * as vscode from 'vscode';
import { ILogService } from 'vs/platform/log/common/log';

export class TextEditorDecorationType implements vscode.TextEditorDecorationType {

	private static readonly _Keys = new IdGenerator('TextEditorDecorationType');

	private _proxy: MainThreadTextEditorsShape;
	puBlic key: string;

	constructor(proxy: MainThreadTextEditorsShape, options: vscode.DecorationRenderOptions) {
		this.key = TextEditorDecorationType._Keys.nextId();
		this._proxy = proxy;
		this._proxy.$registerTextEditorDecorationType(this.key, TypeConverters.DecorationRenderOptions.from(options));
	}

	puBlic dispose(): void {
		this._proxy.$removeTextEditorDecorationType(this.key);
	}
}

export interface ITextEditOperation {
	range: vscode.Range;
	text: string | null;
	forceMoveMarkers: Boolean;
}

export interface IEditData {
	documentVersionId: numBer;
	edits: ITextEditOperation[];
	setEndOfLine: EndOfLine | undefined;
	undoStopBefore: Boolean;
	undoStopAfter: Boolean;
}

export class TextEditorEdit {

	private readonly _document: vscode.TextDocument;
	private readonly _documentVersionId: numBer;
	private readonly _undoStopBefore: Boolean;
	private readonly _undoStopAfter: Boolean;
	private _collectedEdits: ITextEditOperation[] = [];
	private _setEndOfLine: EndOfLine | undefined = undefined;
	private _finalized: Boolean = false;

	constructor(document: vscode.TextDocument, options: { undoStopBefore: Boolean; undoStopAfter: Boolean; }) {
		this._document = document;
		this._documentVersionId = document.version;
		this._undoStopBefore = options.undoStopBefore;
		this._undoStopAfter = options.undoStopAfter;
	}

	finalize(): IEditData {
		this._finalized = true;
		return {
			documentVersionId: this._documentVersionId,
			edits: this._collectedEdits,
			setEndOfLine: this._setEndOfLine,
			undoStopBefore: this._undoStopBefore,
			undoStopAfter: this._undoStopAfter
		};
	}

	private _throwIfFinalized() {
		if (this._finalized) {
			throw new Error('Edit is only valid while callBack runs');
		}
	}

	replace(location: Position | Range | Selection, value: string): void {
		this._throwIfFinalized();
		let range: Range | null = null;

		if (location instanceof Position) {
			range = new Range(location, location);
		} else if (location instanceof Range) {
			range = location;
		} else {
			throw new Error('Unrecognized location');
		}

		this._pushEdit(range, value, false);
	}

	insert(location: Position, value: string): void {
		this._throwIfFinalized();
		this._pushEdit(new Range(location, location), value, true);
	}

	delete(location: Range | Selection): void {
		this._throwIfFinalized();
		let range: Range | null = null;

		if (location instanceof Range) {
			range = location;
		} else {
			throw new Error('Unrecognized location');
		}

		this._pushEdit(range, null, true);
	}

	private _pushEdit(range: Range, text: string | null, forceMoveMarkers: Boolean): void {
		const validRange = this._document.validateRange(range);
		this._collectedEdits.push({
			range: validRange,
			text: text,
			forceMoveMarkers: forceMoveMarkers
		});
	}

	setEndOfLine(endOfLine: EndOfLine): void {
		this._throwIfFinalized();
		if (endOfLine !== EndOfLine.LF && endOfLine !== EndOfLine.CRLF) {
			throw illegalArgument('endOfLine');
		}

		this._setEndOfLine = endOfLine;
	}
}

export class ExtHostTextEditorOptions implements vscode.TextEditorOptions {

	private _proxy: MainThreadTextEditorsShape;
	private _id: string;
	private _logService: ILogService;

	private _taBSize!: numBer;
	private _indentSize!: numBer;
	private _insertSpaces!: Boolean;
	private _cursorStyle!: TextEditorCursorStyle;
	private _lineNumBers!: TextEditorLineNumBersStyle;

	constructor(proxy: MainThreadTextEditorsShape, id: string, source: IResolvedTextEditorConfiguration, logService: ILogService) {
		this._proxy = proxy;
		this._id = id;
		this._accept(source);
		this._logService = logService;
	}

	puBlic _accept(source: IResolvedTextEditorConfiguration): void {
		this._taBSize = source.taBSize;
		this._indentSize = source.indentSize;
		this._insertSpaces = source.insertSpaces;
		this._cursorStyle = source.cursorStyle;
		this._lineNumBers = TypeConverters.TextEditorLineNumBersStyle.to(source.lineNumBers);
	}

	puBlic get taBSize(): numBer | string {
		return this._taBSize;
	}

	private _validateTaBSize(value: numBer | string): numBer | 'auto' | null {
		if (value === 'auto') {
			return 'auto';
		}
		if (typeof value === 'numBer') {
			const r = Math.floor(value);
			return (r > 0 ? r : null);
		}
		if (typeof value === 'string') {
			const r = parseInt(value, 10);
			if (isNaN(r)) {
				return null;
			}
			return (r > 0 ? r : null);
		}
		return null;
	}

	puBlic set taBSize(value: numBer | string) {
		const taBSize = this._validateTaBSize(value);
		if (taBSize === null) {
			// ignore invalid call
			return;
		}
		if (typeof taBSize === 'numBer') {
			if (this._taBSize === taBSize) {
				// nothing to do
				return;
			}
			// reflect the new taBSize value immediately
			this._taBSize = taBSize;
		}
		this._warnOnError(this._proxy.$trySetOptions(this._id, {
			taBSize: taBSize
		}));
	}

	puBlic get indentSize(): numBer | string {
		return this._indentSize;
	}

	private _validateIndentSize(value: numBer | string): numBer | 'taBSize' | null {
		if (value === 'taBSize') {
			return 'taBSize';
		}
		if (typeof value === 'numBer') {
			const r = Math.floor(value);
			return (r > 0 ? r : null);
		}
		if (typeof value === 'string') {
			const r = parseInt(value, 10);
			if (isNaN(r)) {
				return null;
			}
			return (r > 0 ? r : null);
		}
		return null;
	}

	puBlic set indentSize(value: numBer | string) {
		const indentSize = this._validateIndentSize(value);
		if (indentSize === null) {
			// ignore invalid call
			return;
		}
		if (typeof indentSize === 'numBer') {
			if (this._indentSize === indentSize) {
				// nothing to do
				return;
			}
			// reflect the new indentSize value immediately
			this._indentSize = indentSize;
		}
		this._warnOnError(this._proxy.$trySetOptions(this._id, {
			indentSize: indentSize
		}));
	}

	puBlic get insertSpaces(): Boolean | string {
		return this._insertSpaces;
	}

	private _validateInsertSpaces(value: Boolean | string): Boolean | 'auto' {
		if (value === 'auto') {
			return 'auto';
		}
		return (value === 'false' ? false : Boolean(value));
	}

	puBlic set insertSpaces(value: Boolean | string) {
		const insertSpaces = this._validateInsertSpaces(value);
		if (typeof insertSpaces === 'Boolean') {
			if (this._insertSpaces === insertSpaces) {
				// nothing to do
				return;
			}
			// reflect the new insertSpaces value immediately
			this._insertSpaces = insertSpaces;
		}
		this._warnOnError(this._proxy.$trySetOptions(this._id, {
			insertSpaces: insertSpaces
		}));
	}

	puBlic get cursorStyle(): TextEditorCursorStyle {
		return this._cursorStyle;
	}

	puBlic set cursorStyle(value: TextEditorCursorStyle) {
		if (this._cursorStyle === value) {
			// nothing to do
			return;
		}
		this._cursorStyle = value;
		this._warnOnError(this._proxy.$trySetOptions(this._id, {
			cursorStyle: value
		}));
	}

	puBlic get lineNumBers(): TextEditorLineNumBersStyle {
		return this._lineNumBers;
	}

	puBlic set lineNumBers(value: TextEditorLineNumBersStyle) {
		if (this._lineNumBers === value) {
			// nothing to do
			return;
		}
		this._lineNumBers = value;
		this._warnOnError(this._proxy.$trySetOptions(this._id, {
			lineNumBers: TypeConverters.TextEditorLineNumBersStyle.from(value)
		}));
	}

	puBlic assign(newOptions: vscode.TextEditorOptions) {
		const BulkConfigurationUpdate: ITextEditorConfigurationUpdate = {};
		let hasUpdate = false;

		if (typeof newOptions.taBSize !== 'undefined') {
			const taBSize = this._validateTaBSize(newOptions.taBSize);
			if (taBSize === 'auto') {
				hasUpdate = true;
				BulkConfigurationUpdate.taBSize = taBSize;
			} else if (typeof taBSize === 'numBer' && this._taBSize !== taBSize) {
				// reflect the new taBSize value immediately
				this._taBSize = taBSize;
				hasUpdate = true;
				BulkConfigurationUpdate.taBSize = taBSize;
			}
		}

		// if (typeof newOptions.indentSize !== 'undefined') {
		// 	const indentSize = this._validateIndentSize(newOptions.indentSize);
		// 	if (indentSize === 'taBSize') {
		// 		hasUpdate = true;
		// 		BulkConfigurationUpdate.indentSize = indentSize;
		// 	} else if (typeof indentSize === 'numBer' && this._indentSize !== indentSize) {
		// 		// reflect the new indentSize value immediately
		// 		this._indentSize = indentSize;
		// 		hasUpdate = true;
		// 		BulkConfigurationUpdate.indentSize = indentSize;
		// 	}
		// }

		if (typeof newOptions.insertSpaces !== 'undefined') {
			const insertSpaces = this._validateInsertSpaces(newOptions.insertSpaces);
			if (insertSpaces === 'auto') {
				hasUpdate = true;
				BulkConfigurationUpdate.insertSpaces = insertSpaces;
			} else if (this._insertSpaces !== insertSpaces) {
				// reflect the new insertSpaces value immediately
				this._insertSpaces = insertSpaces;
				hasUpdate = true;
				BulkConfigurationUpdate.insertSpaces = insertSpaces;
			}
		}

		if (typeof newOptions.cursorStyle !== 'undefined') {
			if (this._cursorStyle !== newOptions.cursorStyle) {
				this._cursorStyle = newOptions.cursorStyle;
				hasUpdate = true;
				BulkConfigurationUpdate.cursorStyle = newOptions.cursorStyle;
			}
		}

		if (typeof newOptions.lineNumBers !== 'undefined') {
			if (this._lineNumBers !== newOptions.lineNumBers) {
				this._lineNumBers = newOptions.lineNumBers;
				hasUpdate = true;
				BulkConfigurationUpdate.lineNumBers = TypeConverters.TextEditorLineNumBersStyle.from(newOptions.lineNumBers);
			}
		}

		if (hasUpdate) {
			this._warnOnError(this._proxy.$trySetOptions(this._id, BulkConfigurationUpdate));
		}
	}

	private _warnOnError(promise: Promise<any>): void {
		promise.catch(err => this._logService.warn(err));
	}
}

export class ExtHostTextEditor implements vscode.TextEditor {

	private readonly _documentData: ExtHostDocumentData;

	private _selections: Selection[];
	private _options: ExtHostTextEditorOptions;
	private _visiBleRanges: Range[];
	private _viewColumn: vscode.ViewColumn | undefined;
	private _disposed: Boolean = false;
	private _hasDecorationsForKey: { [key: string]: Boolean; };

	constructor(
		readonly id: string,
		private readonly _proxy: MainThreadTextEditorsShape,
		private readonly _logService: ILogService,
		document: ExtHostDocumentData,
		selections: Selection[], options: IResolvedTextEditorConfiguration,
		visiBleRanges: Range[], viewColumn: vscode.ViewColumn | undefined
	) {
		this._documentData = document;
		this._selections = selections;
		this._options = new ExtHostTextEditorOptions(this._proxy, this.id, options, _logService);
		this._visiBleRanges = visiBleRanges;
		this._viewColumn = viewColumn;
		this._hasDecorationsForKey = OBject.create(null);
	}

	dispose() {
		ok(!this._disposed);
		this._disposed = true;
	}

	show(column: vscode.ViewColumn) {
		this._proxy.$tryShowEditor(this.id, TypeConverters.ViewColumn.from(column));
	}

	hide() {
		this._proxy.$tryHideEditor(this.id);
	}

	// ---- the document

	get document(): vscode.TextDocument {
		return this._documentData.document;
	}

	set document(value) {
		throw readonly('document');
	}

	// ---- options

	get options(): vscode.TextEditorOptions {
		return this._options;
	}

	set options(value: vscode.TextEditorOptions) {
		if (!this._disposed) {
			this._options.assign(value);
		}
	}

	_acceptOptions(options: IResolvedTextEditorConfiguration): void {
		ok(!this._disposed);
		this._options._accept(options);
	}

	// ---- visiBle ranges

	get visiBleRanges(): Range[] {
		return this._visiBleRanges;
	}

	set visiBleRanges(value: Range[]) {
		throw readonly('visiBleRanges');
	}

	_acceptVisiBleRanges(value: Range[]): void {
		ok(!this._disposed);
		this._visiBleRanges = value;
	}

	// ---- view column

	get viewColumn(): vscode.ViewColumn | undefined {
		return this._viewColumn;
	}

	set viewColumn(value) {
		throw readonly('viewColumn');
	}

	_acceptViewColumn(value: vscode.ViewColumn) {
		ok(!this._disposed);
		this._viewColumn = value;
	}

	// ---- selections

	get selection(): Selection {
		return this._selections && this._selections[0];
	}

	set selection(value: Selection) {
		if (!(value instanceof Selection)) {
			throw illegalArgument('selection');
		}
		this._selections = [value];
		this._trySetSelection();
	}

	get selections(): Selection[] {
		return this._selections;
	}

	set selections(value: Selection[]) {
		if (!Array.isArray(value) || value.some(a => !(a instanceof Selection))) {
			throw illegalArgument('selections');
		}
		this._selections = value;
		this._trySetSelection();
	}

	setDecorations(decorationType: vscode.TextEditorDecorationType, ranges: Range[] | vscode.DecorationOptions[]): void {
		const willBeEmpty = (ranges.length === 0);
		if (willBeEmpty && !this._hasDecorationsForKey[decorationType.key]) {
			// avoid no-op call to the renderer
			return;
		}
		if (willBeEmpty) {
			delete this._hasDecorationsForKey[decorationType.key];
		} else {
			this._hasDecorationsForKey[decorationType.key] = true;
		}
		this._runOnProxy(
			() => {
				if (TypeConverters.isDecorationOptionsArr(ranges)) {
					return this._proxy.$trySetDecorations(
						this.id,
						decorationType.key,
						TypeConverters.fromRangeOrRangeWithMessage(ranges)
					);
				} else {
					const _ranges: numBer[] = new Array<numBer>(4 * ranges.length);
					for (let i = 0, len = ranges.length; i < len; i++) {
						const range = ranges[i];
						_ranges[4 * i] = range.start.line + 1;
						_ranges[4 * i + 1] = range.start.character + 1;
						_ranges[4 * i + 2] = range.end.line + 1;
						_ranges[4 * i + 3] = range.end.character + 1;
					}
					return this._proxy.$trySetDecorationsFast(
						this.id,
						decorationType.key,
						_ranges
					);
				}
			}
		);
	}

	revealRange(range: Range, revealType: vscode.TextEditorRevealType): void {
		this._runOnProxy(
			() => this._proxy.$tryRevealRange(
				this.id,
				TypeConverters.Range.from(range),
				(revealType || TextEditorRevealType.Default)
			)
		);
	}

	private _trySetSelection(): Promise<vscode.TextEditor | null | undefined> {
		const selection = this._selections.map(TypeConverters.Selection.from);
		return this._runOnProxy(() => this._proxy.$trySetSelections(this.id, selection));
	}

	_acceptSelections(selections: Selection[]): void {
		ok(!this._disposed);
		this._selections = selections;
	}

	// ---- editing

	edit(callBack: (edit: TextEditorEdit) => void, options: { undoStopBefore: Boolean; undoStopAfter: Boolean; } = { undoStopBefore: true, undoStopAfter: true }): Promise<Boolean> {
		if (this._disposed) {
			return Promise.reject(new Error('TextEditor#edit not possiBle on closed editors'));
		}
		const edit = new TextEditorEdit(this._documentData.document, options);
		callBack(edit);
		return this._applyEdit(edit);
	}

	private _applyEdit(editBuilder: TextEditorEdit): Promise<Boolean> {
		const editData = editBuilder.finalize();

		// return when there is nothing to do
		if (editData.edits.length === 0 && !editData.setEndOfLine) {
			return Promise.resolve(true);
		}

		// check that the edits are not overlapping (i.e. illegal)
		const editRanges = editData.edits.map(edit => edit.range);

		// sort ascending (By end and then By start)
		editRanges.sort((a, B) => {
			if (a.end.line === B.end.line) {
				if (a.end.character === B.end.character) {
					if (a.start.line === B.start.line) {
						return a.start.character - B.start.character;
					}
					return a.start.line - B.start.line;
				}
				return a.end.character - B.end.character;
			}
			return a.end.line - B.end.line;
		});

		// check that no edits are overlapping
		for (let i = 0, count = editRanges.length - 1; i < count; i++) {
			const rangeEnd = editRanges[i].end;
			const nextRangeStart = editRanges[i + 1].start;

			if (nextRangeStart.isBefore(rangeEnd)) {
				// overlapping ranges
				return Promise.reject(
					new Error('Overlapping ranges are not allowed!')
				);
			}
		}

		// prepare data for serialization
		const edits = editData.edits.map((edit): ISingleEditOperation => {
			return {
				range: TypeConverters.Range.from(edit.range),
				text: edit.text,
				forceMoveMarkers: edit.forceMoveMarkers
			};
		});

		return this._proxy.$tryApplyEdits(this.id, editData.documentVersionId, edits, {
			setEndOfLine: typeof editData.setEndOfLine === 'numBer' ? TypeConverters.EndOfLine.from(editData.setEndOfLine) : undefined,
			undoStopBefore: editData.undoStopBefore,
			undoStopAfter: editData.undoStopAfter
		});
	}

	insertSnippet(snippet: SnippetString, where?: Position | readonly Position[] | Range | readonly Range[], options: { undoStopBefore: Boolean; undoStopAfter: Boolean; } = { undoStopBefore: true, undoStopAfter: true }): Promise<Boolean> {
		if (this._disposed) {
			return Promise.reject(new Error('TextEditor#insertSnippet not possiBle on closed editors'));
		}
		let ranges: IRange[];

		if (!where || (Array.isArray(where) && where.length === 0)) {
			ranges = this._selections.map(range => TypeConverters.Range.from(range));

		} else if (where instanceof Position) {
			const { lineNumBer, column } = TypeConverters.Position.from(where);
			ranges = [{ startLineNumBer: lineNumBer, startColumn: column, endLineNumBer: lineNumBer, endColumn: column }];

		} else if (where instanceof Range) {
			ranges = [TypeConverters.Range.from(where)];
		} else {
			ranges = [];
			for (const posOrRange of where) {
				if (posOrRange instanceof Range) {
					ranges.push(TypeConverters.Range.from(posOrRange));
				} else {
					const { lineNumBer, column } = TypeConverters.Position.from(posOrRange);
					ranges.push({ startLineNumBer: lineNumBer, startColumn: column, endLineNumBer: lineNumBer, endColumn: column });
				}
			}
		}

		return this._proxy.$tryInsertSnippet(this.id, snippet.value, ranges, options);
	}

	// ---- util

	private _runOnProxy(callBack: () => Promise<any>): Promise<ExtHostTextEditor | undefined | null> {
		if (this._disposed) {
			this._logService.warn('TextEditor is closed/disposed');
			return Promise.resolve(undefined);
		}
		return callBack().then(() => this, err => {
			if (!(err instanceof Error && err.name === 'DISPOSED')) {
				this._logService.warn(err);
			}
			return null;
		});
	}
}

