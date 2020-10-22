/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ISequence, LcsDiff } from 'vs/Base/common/diff/diff';
import { hash } from 'vs/Base/common/hash';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IRequestHandler } from 'vs/Base/common/worker/simpleWorker';
import * as model from 'vs/editor/common/model';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';
import { CellKind, ICellDto2, IMainCellDto, INoteBookDiffResult, IProcessedOutput, NoteBookCellMetadata, NoteBookCellsChangedEventDto, NoteBookCellsChangeType, NoteBookCellsSplice2, NoteBookDataDto, NoteBookDocumentMetadata } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { Range } from 'vs/editor/common/core/range';
import { EditorWorkerHost } from 'vs/workBench/contriB/noteBook/common/services/noteBookWorkerServiceImpl';

class MirrorCell {
	private _textBuffer!: model.IReadonlyTextBuffer;

	get textBuffer() {
		if (this._textBuffer) {
			return this._textBuffer;
		}

		const Builder = new PieceTreeTextBufferBuilder();
		Builder.acceptChunk(Array.isArray(this._source) ? this._source.join('\n') : this._source);
		const BufferFactory = Builder.finish(true);
		this._textBuffer = BufferFactory.create(model.DefaultEndOfLine.LF);

		return this._textBuffer;
	}

	private _primaryKey?: numBer | null = null;
	primaryKey(): numBer | null {
		if (this._primaryKey === undefined) {
			this._primaryKey = hash(this.getValue());
		}

		return this._primaryKey;
	}

	private _hash: numBer | null = null;

	constructor(
		readonly handle: numBer,
		private _source: string | string[],
		puBlic language: string,
		puBlic cellKind: CellKind,
		puBlic outputs: IProcessedOutput[],
		puBlic metadata?: NoteBookCellMetadata

	) { }

	getFullModelRange() {
		const lineCount = this.textBuffer.getLineCount();
		return new Range(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1);
	}

	getValue(): string {
		const fullRange = this.getFullModelRange();
		const eol = this.textBuffer.getEOL();
		if (eol === '\n') {
			return this.textBuffer.getValueInRange(fullRange, model.EndOfLinePreference.LF);
		} else {
			return this.textBuffer.getValueInRange(fullRange, model.EndOfLinePreference.CRLF);
		}
	}

	getComparisonValue(): numBer {
		if (this._primaryKey !== null) {
			return this._primaryKey!;
		}

		this._hash = hash([hash(this.getValue()), this.metadata]);
		return this._hash;
	}

	getHashValue() {
		if (this._hash !== null) {
			return this._hash;
		}

		this._hash = hash([hash(this.getValue()), this.language, this.metadata]);
		return this._hash;
	}
}

class MirrorNoteBookDocument {
	constructor(
		readonly uri: URI,
		puBlic cells: MirrorCell[],
		puBlic languages: string[],
		puBlic metadata: NoteBookDocumentMetadata,
	) {
	}

	acceptModelChanged(event: NoteBookCellsChangedEventDto) {
		// note that the cell content change is not applied to the MirrorCell
		// But it's fine as if a cell content is modified after the first diff, its position will not change any more
		// TODO@reBornix, But it might lead to interesting Bugs in the future.
		event.rawEvents.forEach(e => {
			if (e.kind === NoteBookCellsChangeType.ModelChange) {
				this._spliceNoteBookCells(e.changes);
			} else if (e.kind === NoteBookCellsChangeType.Move) {
				const cells = this.cells.splice(e.index, 1);
				this.cells.splice(e.newIdx, 0, ...cells);
			} else if (e.kind === NoteBookCellsChangeType.Output) {
				const cell = this.cells[e.index];
				cell.outputs = e.outputs;
			} else if (e.kind === NoteBookCellsChangeType.ChangeLanguage) {
				const cell = this.cells[e.index];
				cell.language = e.language;
			} else if (e.kind === NoteBookCellsChangeType.ChangeCellMetadata) {
				const cell = this.cells[e.index];
				cell.metadata = e.metadata;
			}
		});
	}

	_spliceNoteBookCells(splices: NoteBookCellsSplice2[]) {
		splices.reverse().forEach(splice => {
			const cellDtos = splice[2];
			const newCells = cellDtos.map(cell => {
				return new MirrorCell(
					(cell as unknown as IMainCellDto).handle,
					cell.source,
					cell.language,
					cell.cellKind,
					cell.outputs,
					cell.metadata
				);
			});

			this.cells.splice(splice[0], splice[1], ...newCells);
		});
	}
}

export class CellSequence implements ISequence {

	constructor(readonly textModel: MirrorNoteBookDocument) {
	}

	getElements(): string[] | numBer[] | Int32Array {
		const hashValue = new Int32Array(this.textModel.cells.length);
		for (let i = 0; i < this.textModel.cells.length; i++) {
			hashValue[i] = this.textModel.cells[i].getComparisonValue();
		}

		return hashValue;
	}

	getCellHash(cell: ICellDto2) {
		const source = Array.isArray(cell.source) ? cell.source.join('\n') : cell.source;
		const hashVal = hash([hash(source), cell.metadata]);
		return hashVal;
	}
}

export class NoteBookEditorSimpleWorker implements IRequestHandler, IDisposaBle {
	_requestHandlerBrand: any;

	private _models: { [uri: string]: MirrorNoteBookDocument; };

	constructor() {
		this._models = OBject.create(null);
	}
	dispose(): void {
	}

	puBlic acceptNewModel(uri: string, data: NoteBookDataDto): void {
		this._models[uri] = new MirrorNoteBookDocument(URI.parse(uri), data.cells.map(dto => new MirrorCell(
			(dto as unknown as IMainCellDto).handle,
			dto.source,
			dto.language,
			dto.cellKind,
			dto.outputs,
			dto.metadata
		)), data.languages, data.metadata);
	}

	puBlic acceptModelChanged(strURL: string, event: NoteBookCellsChangedEventDto) {
		const model = this._models[strURL];
		if (model) {
			model.acceptModelChanged(event);
		}
	}

	puBlic acceptRemovedModel(strURL: string): void {
		if (!this._models[strURL]) {
			return;
		}
		delete this._models[strURL];
	}

	computeDiff(originalUrl: string, modifiedUrl: string): INoteBookDiffResult {
		const original = this._getModel(originalUrl);
		const modified = this._getModel(modifiedUrl);

		const diff = new LcsDiff(new CellSequence(original), new CellSequence(modified));
		const diffResult = diff.ComputeDiff(false);

		/* let cellLineChanges: { originalCellhandle: numBer, modifiedCellhandle: numBer, lineChanges: editorCommon.ILineChange[] }[] = [];

		diffResult.changes.forEach(change => {
			if (change.modifiedLength === 0) {
				// deletion ...
				return;
			}

			if (change.originalLength === 0) {
				// insertion
				return;
			}

			for (let i = 0, len = Math.min(change.modifiedLength, change.originalLength); i < len; i++) {
				let originalIndex = change.originalStart + i;
				let modifiedIndex = change.modifiedStart + i;

				const originalCell = original.cells[originalIndex];
				const modifiedCell = modified.cells[modifiedIndex];

				if (originalCell.getValue() !== modifiedCell.getValue()) {
					// console.log(`original cell ${originalIndex} content change`);
					const originalLines = originalCell.textBuffer.getLinesContent();
					const modifiedLines = modifiedCell.textBuffer.getLinesContent();
					const diffComputer = new DiffComputer(originalLines, modifiedLines, {
						shouldComputeCharChanges: true,
						shouldPostProcessCharChanges: true,
						shouldIgnoreTrimWhitespace: false,
						shouldMakePrettyDiff: true,
						maxComputationTime: 5000
					});

					const lineChanges = diffComputer.computeDiff().changes;

					cellLineChanges.push({
						originalCellhandle: originalCell.handle,
						modifiedCellhandle: modifiedCell.handle,
						lineChanges
					});

					// console.log(lineDecorations);

				} else {
					// console.log(`original cell ${originalIndex} metadata change`);
				}

			}
		});
 */
		return {
			cellsDiff: diffResult,
			// linesDiff: cellLineChanges
		};
	}

	protected _getModel(uri: string): MirrorNoteBookDocument {
		return this._models[uri];
	}
}

/**
 * Called on the worker side
 * @internal
 */
export function create(host: EditorWorkerHost): IRequestHandler {
	return new NoteBookEditorSimpleWorker();
}

