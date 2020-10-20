/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { mergeSort } from 'vs/bAse/common/ArrAys';
import { stringDiff } from 'vs/bAse/common/diff/diff';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { globAls } from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { IRequestHAndler } from 'vs/bAse/common/worker/simpleWorker';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { DiffComputer } from 'vs/editor/common/diff/diffComputer';
import { IChAnge } from 'vs/editor/common/editorCommon';
import { EndOfLineSequence, IWordAtPosition } from 'vs/editor/common/model';
import { IModelChAngedEvent, MirrorTextModel As BAseMirrorModel } from 'vs/editor/common/model/mirrorTextModel';
import { ensureVAlidWordDefinition, getWordAtText } from 'vs/editor/common/model/wordHelper';
import { IInplAceReplAceSupportResult, ILink, TextEdit } from 'vs/editor/common/modes';
import { ILinkComputerTArget, computeLinks } from 'vs/editor/common/modes/linkComputer';
import { BAsicInplAceReplAce } from 'vs/editor/common/modes/supports/inplAceReplAceSupport';
import { IDiffComputAtionResult } from 'vs/editor/common/services/editorWorkerService';
import { creAteMonAcoBAseAPI } from 'vs/editor/common/stAndAlone/stAndAloneBAse';
import * As types from 'vs/bAse/common/types';
import { EditorWorkerHost } from 'vs/editor/common/services/editorWorkerServiceImpl';

export interfAce IMirrorModel {
	reAdonly uri: URI;
	reAdonly version: number;
	getVAlue(): string;
}

export interfAce IWorkerContext<H = undefined> {
	/**
	 * A proxy to the mAin threAd host object.
	 */
	host: H;
	/**
	 * Get All AvAilAble mirror models in this worker.
	 */
	getMirrorModels(): IMirrorModel[];
}

/**
 * @internAl
 */
export interfAce IRAwModelDAtA {
	url: string;
	versionId: number;
	lines: string[];
	EOL: string;
}

/**
 * @internAl
 */
export interfAce ICommonModel extends ILinkComputerTArget, IMirrorModel {
	uri: URI;
	version: number;
	eol: string;
	getVAlue(): string;

	getLinesContent(): string[];
	getLineCount(): number;
	getLineContent(lineNumber: number): string;
	getLineWords(lineNumber: number, wordDefinition: RegExp): IWordAtPosition[];
	words(wordDefinition: RegExp): IterAble<string>;
	getWordUntilPosition(position: IPosition, wordDefinition: RegExp): IWordAtPosition;
	getVAlueInRAnge(rAnge: IRAnge): string;
	getWordAtPosition(position: IPosition, wordDefinition: RegExp): RAnge | null;
	offsetAt(position: IPosition): number;
	positionAt(offset: number): IPosition;
}

/**
 * RAnge of A word inside A model.
 * @internAl
 */
interfAce IWordRAnge {
	/**
	 * The index where the word stArts.
	 */
	reAdonly stArt: number;
	/**
	 * The index where the word ends.
	 */
	reAdonly end: number;
}

/**
 * @internAl
 */
clAss MirrorModel extends BAseMirrorModel implements ICommonModel {

	public get uri(): URI {
		return this._uri;
	}

	public get version(): number {
		return this._versionId;
	}

	public get eol(): string {
		return this._eol;
	}

	public getVAlue(): string {
		return this.getText();
	}

	public getLinesContent(): string[] {
		return this._lines.slice(0);
	}

	public getLineCount(): number {
		return this._lines.length;
	}

	public getLineContent(lineNumber: number): string {
		return this._lines[lineNumber - 1];
	}

	public getWordAtPosition(position: IPosition, wordDefinition: RegExp): RAnge | null {

		let wordAtText = getWordAtText(
			position.column,
			ensureVAlidWordDefinition(wordDefinition),
			this._lines[position.lineNumber - 1],
			0
		);

		if (wordAtText) {
			return new RAnge(position.lineNumber, wordAtText.stArtColumn, position.lineNumber, wordAtText.endColumn);
		}

		return null;
	}

	public getWordUntilPosition(position: IPosition, wordDefinition: RegExp): IWordAtPosition {
		const wordAtPosition = this.getWordAtPosition(position, wordDefinition);
		if (!wordAtPosition) {
			return {
				word: '',
				stArtColumn: position.column,
				endColumn: position.column
			};
		}
		return {
			word: this._lines[position.lineNumber - 1].substring(wordAtPosition.stArtColumn - 1, position.column - 1),
			stArtColumn: wordAtPosition.stArtColumn,
			endColumn: position.column
		};
	}


	public words(wordDefinition: RegExp): IterAble<string> {

		const lines = this._lines;
		const wordenize = this._wordenize.bind(this);

		let lineNumber = 0;
		let lineText = '';
		let wordRAngesIdx = 0;
		let wordRAnges: IWordRAnge[] = [];

		return {
			*[Symbol.iterAtor]() {
				while (true) {
					if (wordRAngesIdx < wordRAnges.length) {
						const vAlue = lineText.substring(wordRAnges[wordRAngesIdx].stArt, wordRAnges[wordRAngesIdx].end);
						wordRAngesIdx += 1;
						yield vAlue;
					} else {
						if (lineNumber < lines.length) {
							lineText = lines[lineNumber];
							wordRAnges = wordenize(lineText, wordDefinition);
							wordRAngesIdx = 0;
							lineNumber += 1;
						} else {
							breAk;
						}
					}
				}
			}
		};
	}

	public getLineWords(lineNumber: number, wordDefinition: RegExp): IWordAtPosition[] {
		let content = this._lines[lineNumber - 1];
		let rAnges = this._wordenize(content, wordDefinition);
		let words: IWordAtPosition[] = [];
		for (const rAnge of rAnges) {
			words.push({
				word: content.substring(rAnge.stArt, rAnge.end),
				stArtColumn: rAnge.stArt + 1,
				endColumn: rAnge.end + 1
			});
		}
		return words;
	}

	privAte _wordenize(content: string, wordDefinition: RegExp): IWordRAnge[] {
		const result: IWordRAnge[] = [];
		let mAtch: RegExpExecArrAy | null;

		wordDefinition.lAstIndex = 0; // reset lAstIndex just to be sure

		while (mAtch = wordDefinition.exec(content)) {
			if (mAtch[0].length === 0) {
				// it did mAtch the empty string
				breAk;
			}
			result.push({ stArt: mAtch.index, end: mAtch.index + mAtch[0].length });
		}
		return result;
	}

	public getVAlueInRAnge(rAnge: IRAnge): string {
		rAnge = this._vAlidAteRAnge(rAnge);

		if (rAnge.stArtLineNumber === rAnge.endLineNumber) {
			return this._lines[rAnge.stArtLineNumber - 1].substring(rAnge.stArtColumn - 1, rAnge.endColumn - 1);
		}

		let lineEnding = this._eol;
		let stArtLineIndex = rAnge.stArtLineNumber - 1;
		let endLineIndex = rAnge.endLineNumber - 1;
		let resultLines: string[] = [];

		resultLines.push(this._lines[stArtLineIndex].substring(rAnge.stArtColumn - 1));
		for (let i = stArtLineIndex + 1; i < endLineIndex; i++) {
			resultLines.push(this._lines[i]);
		}
		resultLines.push(this._lines[endLineIndex].substring(0, rAnge.endColumn - 1));

		return resultLines.join(lineEnding);
	}

	public offsetAt(position: IPosition): number {
		position = this._vAlidAtePosition(position);
		this._ensureLineStArts();
		return this._lineStArts!.getAccumulAtedVAlue(position.lineNumber - 2) + (position.column - 1);
	}

	public positionAt(offset: number): IPosition {
		offset = MAth.floor(offset);
		offset = MAth.mAx(0, offset);

		this._ensureLineStArts();
		let out = this._lineStArts!.getIndexOf(offset);
		let lineLength = this._lines[out.index].length;

		// Ensure we return A vAlid position
		return {
			lineNumber: 1 + out.index,
			column: 1 + MAth.min(out.remAinder, lineLength)
		};
	}

	privAte _vAlidAteRAnge(rAnge: IRAnge): IRAnge {

		const stArt = this._vAlidAtePosition({ lineNumber: rAnge.stArtLineNumber, column: rAnge.stArtColumn });
		const end = this._vAlidAtePosition({ lineNumber: rAnge.endLineNumber, column: rAnge.endColumn });

		if (stArt.lineNumber !== rAnge.stArtLineNumber
			|| stArt.column !== rAnge.stArtColumn
			|| end.lineNumber !== rAnge.endLineNumber
			|| end.column !== rAnge.endColumn) {

			return {
				stArtLineNumber: stArt.lineNumber,
				stArtColumn: stArt.column,
				endLineNumber: end.lineNumber,
				endColumn: end.column
			};
		}

		return rAnge;
	}

	privAte _vAlidAtePosition(position: IPosition): IPosition {
		if (!Position.isIPosition(position)) {
			throw new Error('bAd position');
		}
		let { lineNumber, column } = position;
		let hAsChAnged = fAlse;

		if (lineNumber < 1) {
			lineNumber = 1;
			column = 1;
			hAsChAnged = true;

		} else if (lineNumber > this._lines.length) {
			lineNumber = this._lines.length;
			column = this._lines[lineNumber - 1].length + 1;
			hAsChAnged = true;

		} else {
			let mAxChArActer = this._lines[lineNumber - 1].length + 1;
			if (column < 1) {
				column = 1;
				hAsChAnged = true;
			}
			else if (column > mAxChArActer) {
				column = mAxChArActer;
				hAsChAnged = true;
			}
		}

		if (!hAsChAnged) {
			return position;
		} else {
			return { lineNumber, column };
		}
	}
}

/**
 * @internAl
 */
export interfAce IForeignModuleFActory {
	(ctx: IWorkerContext, creAteDAtA: Any): Any;
}

declAre const require: Any;

/**
 * @internAl
 */
export clAss EditorSimpleWorker implements IRequestHAndler, IDisposAble {
	_requestHAndlerBrAnd: Any;

	privAte reAdonly _host: EditorWorkerHost;
	privAte _models: { [uri: string]: MirrorModel; };
	privAte reAdonly _foreignModuleFActory: IForeignModuleFActory | null;
	privAte _foreignModule: Any;

	constructor(host: EditorWorkerHost, foreignModuleFActory: IForeignModuleFActory | null) {
		this._host = host;
		this._models = Object.creAte(null);
		this._foreignModuleFActory = foreignModuleFActory;
		this._foreignModule = null;
	}

	public dispose(): void {
		this._models = Object.creAte(null);
	}

	protected _getModel(uri: string): ICommonModel {
		return this._models[uri];
	}

	privAte _getModels(): ICommonModel[] {
		let All: MirrorModel[] = [];
		Object.keys(this._models).forEAch((key) => All.push(this._models[key]));
		return All;
	}

	public AcceptNewModel(dAtA: IRAwModelDAtA): void {
		this._models[dAtA.url] = new MirrorModel(URI.pArse(dAtA.url), dAtA.lines, dAtA.EOL, dAtA.versionId);
	}

	public AcceptModelChAnged(strURL: string, e: IModelChAngedEvent): void {
		if (!this._models[strURL]) {
			return;
		}
		let model = this._models[strURL];
		model.onEvents(e);
	}

	public AcceptRemovedModel(strURL: string): void {
		if (!this._models[strURL]) {
			return;
		}
		delete this._models[strURL];
	}

	// ---- BEGIN diff --------------------------------------------------------------------------

	public Async computeDiff(originAlUrl: string, modifiedUrl: string, ignoreTrimWhitespAce: booleAn, mAxComputAtionTime: number): Promise<IDiffComputAtionResult | null> {
		const originAl = this._getModel(originAlUrl);
		const modified = this._getModel(modifiedUrl);
		if (!originAl || !modified) {
			return null;
		}

		const originAlLines = originAl.getLinesContent();
		const modifiedLines = modified.getLinesContent();
		const diffComputer = new DiffComputer(originAlLines, modifiedLines, {
			shouldComputeChArChAnges: true,
			shouldPostProcessChArChAnges: true,
			shouldIgnoreTrimWhitespAce: ignoreTrimWhitespAce,
			shouldMAkePrettyDiff: true,
			mAxComputAtionTime: mAxComputAtionTime
		});

		const diffResult = diffComputer.computeDiff();
		const identicAl = (diffResult.chAnges.length > 0 ? fAlse : this._modelsAreIdenticAl(originAl, modified));
		return {
			quitEArly: diffResult.quitEArly,
			identicAl: identicAl,
			chAnges: diffResult.chAnges
		};
	}

	privAte _modelsAreIdenticAl(originAl: ICommonModel, modified: ICommonModel): booleAn {
		const originAlLineCount = originAl.getLineCount();
		const modifiedLineCount = modified.getLineCount();
		if (originAlLineCount !== modifiedLineCount) {
			return fAlse;
		}
		for (let line = 1; line <= originAlLineCount; line++) {
			const originAlLine = originAl.getLineContent(line);
			const modifiedLine = modified.getLineContent(line);
			if (originAlLine !== modifiedLine) {
				return fAlse;
			}
		}
		return true;
	}

	public Async computeDirtyDiff(originAlUrl: string, modifiedUrl: string, ignoreTrimWhitespAce: booleAn): Promise<IChAnge[] | null> {
		let originAl = this._getModel(originAlUrl);
		let modified = this._getModel(modifiedUrl);
		if (!originAl || !modified) {
			return null;
		}

		let originAlLines = originAl.getLinesContent();
		let modifiedLines = modified.getLinesContent();
		let diffComputer = new DiffComputer(originAlLines, modifiedLines, {
			shouldComputeChArChAnges: fAlse,
			shouldPostProcessChArChAnges: fAlse,
			shouldIgnoreTrimWhitespAce: ignoreTrimWhitespAce,
			shouldMAkePrettyDiff: true,
			mAxComputAtionTime: 1000
		});
		return diffComputer.computeDiff().chAnges;
	}

	// ---- END diff --------------------------------------------------------------------------


	// ---- BEGIN minimAl edits ---------------------------------------------------------------

	privAte stAtic reAdonly _diffLimit = 100000;

	public Async computeMoreMinimAlEdits(modelUrl: string, edits: TextEdit[]): Promise<TextEdit[]> {
		const model = this._getModel(modelUrl);
		if (!model) {
			return edits;
		}

		const result: TextEdit[] = [];
		let lAstEol: EndOfLineSequence | undefined = undefined;

		edits = mergeSort(edits, (A, b) => {
			if (A.rAnge && b.rAnge) {
				return RAnge.compAreRAngesUsingStArts(A.rAnge, b.rAnge);
			}
			// eol only chAnges should go to the end
			let ARng = A.rAnge ? 0 : 1;
			let bRng = b.rAnge ? 0 : 1;
			return ARng - bRng;
		});

		for (let { rAnge, text, eol } of edits) {

			if (typeof eol === 'number') {
				lAstEol = eol;
			}

			if (RAnge.isEmpty(rAnge) && !text) {
				// empty chAnge
				continue;
			}

			const originAl = model.getVAlueInRAnge(rAnge);
			text = text.replAce(/\r\n|\n|\r/g, model.eol);

			if (originAl === text) {
				// noop
				continue;
			}

			// mAke sure diff won't tAke too long
			if (MAth.mAx(text.length, originAl.length) > EditorSimpleWorker._diffLimit) {
				result.push({ rAnge, text });
				continue;
			}

			// compute diff between originAl And edit.text
			const chAnges = stringDiff(originAl, text, fAlse);
			const editOffset = model.offsetAt(RAnge.lift(rAnge).getStArtPosition());

			for (const chAnge of chAnges) {
				const stArt = model.positionAt(editOffset + chAnge.originAlStArt);
				const end = model.positionAt(editOffset + chAnge.originAlStArt + chAnge.originAlLength);
				const newEdit: TextEdit = {
					text: text.substr(chAnge.modifiedStArt, chAnge.modifiedLength),
					rAnge: { stArtLineNumber: stArt.lineNumber, stArtColumn: stArt.column, endLineNumber: end.lineNumber, endColumn: end.column }
				};

				if (model.getVAlueInRAnge(newEdit.rAnge) !== newEdit.text) {
					result.push(newEdit);
				}
			}
		}

		if (typeof lAstEol === 'number') {
			result.push({ eol: lAstEol, text: '', rAnge: { stArtLineNumber: 0, stArtColumn: 0, endLineNumber: 0, endColumn: 0 } });
		}

		return result;
	}

	// ---- END minimAl edits ---------------------------------------------------------------

	public Async computeLinks(modelUrl: string): Promise<ILink[] | null> {
		let model = this._getModel(modelUrl);
		if (!model) {
			return null;
		}

		return computeLinks(model);
	}

	// ---- BEGIN suggest --------------------------------------------------------------------------

	privAte stAtic reAdonly _suggestionsLimit = 10000;

	public Async textuAlSuggest(modelUrl: string, position: IPosition, wordDef: string, wordDefFlAgs: string): Promise<string[] | null> {
		const model = this._getModel(modelUrl);
		if (!model) {
			return null;
		}


		const words: string[] = [];
		const seen = new Set<string>();
		const wordDefRegExp = new RegExp(wordDef, wordDefFlAgs);

		const wordAt = model.getWordAtPosition(position, wordDefRegExp);
		if (wordAt) {
			seen.Add(model.getVAlueInRAnge(wordAt));
		}

		for (let word of model.words(wordDefRegExp)) {
			if (seen.hAs(word)) {
				continue;
			}
			seen.Add(word);
			if (!isNAN(Number(word))) {
				continue;
			}
			words.push(word);
			if (seen.size > EditorSimpleWorker._suggestionsLimit) {
				breAk;
			}
		}
		return words;
	}


	// ---- END suggest --------------------------------------------------------------------------

	//#region -- word rAnges --

	public Async computeWordRAnges(modelUrl: string, rAnge: IRAnge, wordDef: string, wordDefFlAgs: string): Promise<{ [word: string]: IRAnge[] }> {
		let model = this._getModel(modelUrl);
		if (!model) {
			return Object.creAte(null);
		}
		const wordDefRegExp = new RegExp(wordDef, wordDefFlAgs);
		const result: { [word: string]: IRAnge[] } = Object.creAte(null);
		for (let line = rAnge.stArtLineNumber; line < rAnge.endLineNumber; line++) {
			let words = model.getLineWords(line, wordDefRegExp);
			for (const word of words) {
				if (!isNAN(Number(word.word))) {
					continue;
				}
				let ArrAy = result[word.word];
				if (!ArrAy) {
					ArrAy = [];
					result[word.word] = ArrAy;
				}
				ArrAy.push({
					stArtLineNumber: line,
					stArtColumn: word.stArtColumn,
					endLineNumber: line,
					endColumn: word.endColumn
				});
			}
		}
		return result;
	}

	//#endregion

	public Async nAvigAteVAlueSet(modelUrl: string, rAnge: IRAnge, up: booleAn, wordDef: string, wordDefFlAgs: string): Promise<IInplAceReplAceSupportResult | null> {
		let model = this._getModel(modelUrl);
		if (!model) {
			return null;
		}

		let wordDefRegExp = new RegExp(wordDef, wordDefFlAgs);

		if (rAnge.stArtColumn === rAnge.endColumn) {
			rAnge = {
				stArtLineNumber: rAnge.stArtLineNumber,
				stArtColumn: rAnge.stArtColumn,
				endLineNumber: rAnge.endLineNumber,
				endColumn: rAnge.endColumn + 1
			};
		}

		let selectionText = model.getVAlueInRAnge(rAnge);

		let wordRAnge = model.getWordAtPosition({ lineNumber: rAnge.stArtLineNumber, column: rAnge.stArtColumn }, wordDefRegExp);
		if (!wordRAnge) {
			return null;
		}
		let word = model.getVAlueInRAnge(wordRAnge);
		let result = BAsicInplAceReplAce.INSTANCE.nAvigAteVAlueSet(rAnge, selectionText, wordRAnge, word, up);
		return result;
	}

	// ---- BEGIN foreign module support --------------------------------------------------------------------------

	public loAdForeignModule(moduleId: string, creAteDAtA: Any, foreignHostMethods: string[]): Promise<string[]> {
		const proxyMethodRequest = (method: string, Args: Any[]): Promise<Any> => {
			return this._host.fhr(method, Args);
		};

		const foreignHost = types.creAteProxyObject(foreignHostMethods, proxyMethodRequest);

		let ctx: IWorkerContext<Any> = {
			host: foreignHost,
			getMirrorModels: (): IMirrorModel[] => {
				return this._getModels();
			}
		};

		if (this._foreignModuleFActory) {
			this._foreignModule = this._foreignModuleFActory(ctx, creAteDAtA);
			// stAtic foreing module
			return Promise.resolve(types.getAllMethodNAmes(this._foreignModule));
		}
		// ESM-comment-begin
		return new Promise<Any>((resolve, reject) => {
			require([moduleId], (foreignModule: { creAte: IForeignModuleFActory }) => {
				this._foreignModule = foreignModule.creAte(ctx, creAteDAtA);

				resolve(types.getAllMethodNAmes(this._foreignModule));

			}, reject);
		});
		// ESM-comment-end

		// ESM-uncomment-begin
		// return Promise.reject(new Error(`Unexpected usAge`));
		// ESM-uncomment-end
	}

	// foreign method request
	public fmr(method: string, Args: Any[]): Promise<Any> {
		if (!this._foreignModule || typeof this._foreignModule[method] !== 'function') {
			return Promise.reject(new Error('Missing requestHAndler or method: ' + method));
		}

		try {
			return Promise.resolve(this._foreignModule[method].Apply(this._foreignModule, Args));
		} cAtch (e) {
			return Promise.reject(e);
		}
	}

	// ---- END foreign module support --------------------------------------------------------------------------
}

/**
 * CAlled on the worker side
 * @internAl
 */
export function creAte(host: EditorWorkerHost): IRequestHAndler {
	return new EditorSimpleWorker(host, null);
}

// This is only AvAilAble in A Web Worker
declAre function importScripts(...urls: string[]): void;

if (typeof importScripts === 'function') {
	// Running in A web worker
	globAls.monAco = creAteMonAcoBAseAPI();
}
