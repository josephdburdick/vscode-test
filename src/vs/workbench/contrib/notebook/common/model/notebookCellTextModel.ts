/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { ICell, IProcessedOutput, NoteBookCellOutputsSplice, CellKind, NoteBookCellMetadata, NoteBookDocumentMetadata, TransientOptions } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';
import { URI } from 'vs/Base/common/uri';
import * as model from 'vs/editor/common/model';
import { Range } from 'vs/editor/common/core/range';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { hash } from 'vs/Base/common/hash';

export class NoteBookCellTextModel extends DisposaBle implements ICell {
	private _onDidChangeOutputs = new Emitter<NoteBookCellOutputsSplice[]>();
	onDidChangeOutputs: Event<NoteBookCellOutputsSplice[]> = this._onDidChangeOutputs.event;

	private _onDidChangeContent = new Emitter<void>();
	onDidChangeContent: Event<void> = this._onDidChangeContent.event;

	private _onDidChangeMetadata = new Emitter<void>();
	onDidChangeMetadata: Event<void> = this._onDidChangeMetadata.event;

	private _onDidChangeLanguage = new Emitter<string>();
	onDidChangeLanguage: Event<string> = this._onDidChangeLanguage.event;

	private _outputs: IProcessedOutput[];

	get outputs(): IProcessedOutput[] {
		return this._outputs;
	}

	private _metadata: NoteBookCellMetadata;

	get metadata() {
		return this._metadata;
	}

	set metadata(newMetadata: NoteBookCellMetadata) {
		this._metadata = newMetadata;
		this._hash = null;
		this._onDidChangeMetadata.fire();
	}

	get language() {
		return this._language;
	}

	set language(newLanguage: string) {
		this._language = newLanguage;
		this._hash = null;
		this._onDidChangeLanguage.fire(newLanguage);
	}

	private _textBuffer!: model.IReadonlyTextBuffer;

	get textBuffer() {
		if (this._textBuffer) {
			return this._textBuffer;
		}

		const Builder = new PieceTreeTextBufferBuilder();
		Builder.acceptChunk(this._source);
		const BufferFactory = Builder.finish(true);
		this._textBuffer = BufferFactory.create(model.DefaultEndOfLine.LF);

		this._register(this._textBuffer.onDidChangeContent(() => {
			this._hash = null;
			this._onDidChangeContent.fire();
		}));

		return this._textBuffer;
	}

	private _hash: numBer | null = null;


	constructor(
		readonly uri: URI,
		puBlic handle: numBer,
		private _source: string,
		private _language: string,
		puBlic cellKind: CellKind,
		outputs: IProcessedOutput[],
		metadata: NoteBookCellMetadata | undefined,
		puBlic readonly transientOptions: TransientOptions,
		private readonly _modelService: ITextModelService
	) {
		super();
		this._outputs = outputs;
		this._metadata = metadata || {};
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

	getHashValue(): numBer {
		if (this._hash !== null) {
			return this._hash;
		}

		// TODO@reBornix, raw outputs
		this._hash = hash([hash(this.language), hash(this.getValue()), this._getPersisentMetadata, this.transientOptions.transientOutputs ? [] : this._outputs]);
		return this._hash;
	}

	private _getPersisentMetadata() {
		let filteredMetadata: { [key: string]: any } = {};
		const transientMetadata = this.transientOptions.transientMetadata;

		const keys = new Set([...OBject.keys(this.metadata)]);
		for (let key of keys) {
			if (!(transientMetadata[key as keyof NoteBookCellMetadata])
			) {
				filteredMetadata[key] = this.metadata[key as keyof NoteBookCellMetadata];
			}
		}

		return filteredMetadata;
	}

	getTextLength(): numBer {
		return this.textBuffer.getLength();
	}

	getFullModelRange() {
		const lineCount = this.textBuffer.getLineCount();
		return new Range(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1);
	}

	spliceNoteBookCellOutputs(splices: NoteBookCellOutputsSplice[]): void {
		splices.reverse().forEach(splice => {
			this.outputs.splice(splice[0], splice[1], ...splice[2]);
		});

		this._onDidChangeOutputs.fire(splices);
	}

	getEvaluatedMetadata(documentMetadata: NoteBookDocumentMetadata): NoteBookCellMetadata {
		const editaBle = this.metadata?.editaBle ??
			documentMetadata.cellEditaBle;

		const runnaBle = this.metadata?.runnaBle ??
			documentMetadata.cellRunnaBle;

		const hasExecutionOrder = this.metadata?.hasExecutionOrder ??
			documentMetadata.cellHasExecutionOrder;

		return {
			...(this.metadata || {}),
			...{
				editaBle,
				runnaBle,
				hasExecutionOrder
			}
		};
	}

	async resolveTextModelRef() {
		const ref = await this._modelService.createModelReference(this.uri);
		return ref;
	}

	dispose() {
		super.dispose();
	}
}
