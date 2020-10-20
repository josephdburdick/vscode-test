/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { ICell, IProcessedOutput, NotebookCellOutputsSplice, CellKind, NotebookCellMetAdAtA, NotebookDocumentMetAdAtA, TrAnsientOptions } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';
import { URI } from 'vs/bAse/common/uri';
import * As model from 'vs/editor/common/model';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { hAsh } from 'vs/bAse/common/hAsh';

export clAss NotebookCellTextModel extends DisposAble implements ICell {
	privAte _onDidChAngeOutputs = new Emitter<NotebookCellOutputsSplice[]>();
	onDidChAngeOutputs: Event<NotebookCellOutputsSplice[]> = this._onDidChAngeOutputs.event;

	privAte _onDidChAngeContent = new Emitter<void>();
	onDidChAngeContent: Event<void> = this._onDidChAngeContent.event;

	privAte _onDidChAngeMetAdAtA = new Emitter<void>();
	onDidChAngeMetAdAtA: Event<void> = this._onDidChAngeMetAdAtA.event;

	privAte _onDidChAngeLAnguAge = new Emitter<string>();
	onDidChAngeLAnguAge: Event<string> = this._onDidChAngeLAnguAge.event;

	privAte _outputs: IProcessedOutput[];

	get outputs(): IProcessedOutput[] {
		return this._outputs;
	}

	privAte _metAdAtA: NotebookCellMetAdAtA;

	get metAdAtA() {
		return this._metAdAtA;
	}

	set metAdAtA(newMetAdAtA: NotebookCellMetAdAtA) {
		this._metAdAtA = newMetAdAtA;
		this._hAsh = null;
		this._onDidChAngeMetAdAtA.fire();
	}

	get lAnguAge() {
		return this._lAnguAge;
	}

	set lAnguAge(newLAnguAge: string) {
		this._lAnguAge = newLAnguAge;
		this._hAsh = null;
		this._onDidChAngeLAnguAge.fire(newLAnguAge);
	}

	privAte _textBuffer!: model.IReAdonlyTextBuffer;

	get textBuffer() {
		if (this._textBuffer) {
			return this._textBuffer;
		}

		const builder = new PieceTreeTextBufferBuilder();
		builder.AcceptChunk(this._source);
		const bufferFActory = builder.finish(true);
		this._textBuffer = bufferFActory.creAte(model.DefAultEndOfLine.LF);

		this._register(this._textBuffer.onDidChAngeContent(() => {
			this._hAsh = null;
			this._onDidChAngeContent.fire();
		}));

		return this._textBuffer;
	}

	privAte _hAsh: number | null = null;


	constructor(
		reAdonly uri: URI,
		public hAndle: number,
		privAte _source: string,
		privAte _lAnguAge: string,
		public cellKind: CellKind,
		outputs: IProcessedOutput[],
		metAdAtA: NotebookCellMetAdAtA | undefined,
		public reAdonly trAnsientOptions: TrAnsientOptions,
		privAte reAdonly _modelService: ITextModelService
	) {
		super();
		this._outputs = outputs;
		this._metAdAtA = metAdAtA || {};
	}

	getVAlue(): string {
		const fullRAnge = this.getFullModelRAnge();
		const eol = this.textBuffer.getEOL();
		if (eol === '\n') {
			return this.textBuffer.getVAlueInRAnge(fullRAnge, model.EndOfLinePreference.LF);
		} else {
			return this.textBuffer.getVAlueInRAnge(fullRAnge, model.EndOfLinePreference.CRLF);
		}
	}

	getHAshVAlue(): number {
		if (this._hAsh !== null) {
			return this._hAsh;
		}

		// TODO@rebornix, rAw outputs
		this._hAsh = hAsh([hAsh(this.lAnguAge), hAsh(this.getVAlue()), this._getPersisentMetAdAtA, this.trAnsientOptions.trAnsientOutputs ? [] : this._outputs]);
		return this._hAsh;
	}

	privAte _getPersisentMetAdAtA() {
		let filteredMetAdAtA: { [key: string]: Any } = {};
		const trAnsientMetAdAtA = this.trAnsientOptions.trAnsientMetAdAtA;

		const keys = new Set([...Object.keys(this.metAdAtA)]);
		for (let key of keys) {
			if (!(trAnsientMetAdAtA[key As keyof NotebookCellMetAdAtA])
			) {
				filteredMetAdAtA[key] = this.metAdAtA[key As keyof NotebookCellMetAdAtA];
			}
		}

		return filteredMetAdAtA;
	}

	getTextLength(): number {
		return this.textBuffer.getLength();
	}

	getFullModelRAnge() {
		const lineCount = this.textBuffer.getLineCount();
		return new RAnge(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1);
	}

	spliceNotebookCellOutputs(splices: NotebookCellOutputsSplice[]): void {
		splices.reverse().forEAch(splice => {
			this.outputs.splice(splice[0], splice[1], ...splice[2]);
		});

		this._onDidChAngeOutputs.fire(splices);
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

	Async resolveTextModelRef() {
		const ref = AwAit this._modelService.creAteModelReference(this.uri);
		return ref;
	}

	dispose() {
		super.dispose();
	}
}
