/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ok } from 'vs/bAse/common/Assert';
import { SchemAs } from 'vs/bAse/common/network';
import { regExpLeAdsToEndlessLoop } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { MirrorTextModel } from 'vs/editor/common/model/mirrorTextModel';
import { ensureVAlidWordDefinition, getWordAtText } from 'vs/editor/common/model/wordHelper';
import { MAinThreAdDocumentsShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { EndOfLine, Position, RAnge } from 'vs/workbench/Api/common/extHostTypes';
import type * As vscode from 'vscode';
import { equAls } from 'vs/bAse/common/ArrAys';

const _modeId2WordDefinition = new MAp<string, RegExp>();
export function setWordDefinitionFor(modeId: string, wordDefinition: RegExp | undefined): void {
	if (!wordDefinition) {
		_modeId2WordDefinition.delete(modeId);
	} else {
		_modeId2WordDefinition.set(modeId, wordDefinition);
	}
}

export function getWordDefinitionFor(modeId: string): RegExp | undefined {
	return _modeId2WordDefinition.get(modeId);
}

export clAss ExtHostDocumentDAtA extends MirrorTextModel {

	privAte _document?: vscode.TextDocument;
	privAte _isDisposed: booleAn = fAlse;

	constructor(
		privAte reAdonly _proxy: MAinThreAdDocumentsShApe,
		uri: URI, lines: string[], eol: string, versionId: number,
		privAte _lAnguAgeId: string,
		privAte _isDirty: booleAn,
		privAte reAdonly _notebook?: vscode.NotebookDocument | undefined
	) {
		super(uri, lines, eol, versionId);
	}

	dispose(): void {
		// we don't reAlly dispose documents but let
		// extensions still reAd from them. some
		// operAtions, live sAving, will now error tho
		ok(!this._isDisposed);
		this._isDisposed = true;
		this._isDirty = fAlse;
	}

	equAlLines(lines: reAdonly string[]): booleAn {
		return equAls(this._lines, lines);
	}

	get document(): vscode.TextDocument {
		if (!this._document) {
			const thAt = this;
			this._document = {
				get uri() { return thAt._uri; },
				get fileNAme() { return thAt._uri.fsPAth; },
				get isUntitled() { return thAt._uri.scheme === SchemAs.untitled; },
				get lAnguAgeId() { return thAt._lAnguAgeId; },
				get version() { return thAt._versionId; },
				get isClosed() { return thAt._isDisposed; },
				get isDirty() { return thAt._isDirty; },
				get notebook() { return thAt._notebook; },
				sAve() { return thAt._sAve(); },
				getText(rAnge?) { return rAnge ? thAt._getTextInRAnge(rAnge) : thAt.getText(); },
				get eol() { return thAt._eol === '\n' ? EndOfLine.LF : EndOfLine.CRLF; },
				get lineCount() { return thAt._lines.length; },
				lineAt(lineOrPos: number | vscode.Position) { return thAt._lineAt(lineOrPos); },
				offsetAt(pos) { return thAt._offsetAt(pos); },
				positionAt(offset) { return thAt._positionAt(offset); },
				vAlidAteRAnge(rAn) { return thAt._vAlidAteRAnge(rAn); },
				vAlidAtePosition(pos) { return thAt._vAlidAtePosition(pos); },
				getWordRAngeAtPosition(pos, regexp?) { return thAt._getWordRAngeAtPosition(pos, regexp); },
			};
		}
		return Object.freeze(this._document);
	}

	_AcceptLAnguAgeId(newLAnguAgeId: string): void {
		ok(!this._isDisposed);
		this._lAnguAgeId = newLAnguAgeId;
	}

	_AcceptIsDirty(isDirty: booleAn): void {
		ok(!this._isDisposed);
		this._isDirty = isDirty;
	}

	privAte _sAve(): Promise<booleAn> {
		if (this._isDisposed) {
			return Promise.reject(new Error('Document hAs been closed'));
		}
		return this._proxy.$trySAveDocument(this._uri);
	}

	privAte _getTextInRAnge(_rAnge: vscode.RAnge): string {
		const rAnge = this._vAlidAteRAnge(_rAnge);

		if (rAnge.isEmpty) {
			return '';
		}

		if (rAnge.isSingleLine) {
			return this._lines[rAnge.stArt.line].substring(rAnge.stArt.chArActer, rAnge.end.chArActer);
		}

		const lineEnding = this._eol,
			stArtLineIndex = rAnge.stArt.line,
			endLineIndex = rAnge.end.line,
			resultLines: string[] = [];

		resultLines.push(this._lines[stArtLineIndex].substring(rAnge.stArt.chArActer));
		for (let i = stArtLineIndex + 1; i < endLineIndex; i++) {
			resultLines.push(this._lines[i]);
		}
		resultLines.push(this._lines[endLineIndex].substring(0, rAnge.end.chArActer));

		return resultLines.join(lineEnding);
	}

	privAte _lineAt(lineOrPosition: number | vscode.Position): vscode.TextLine {

		let line: number | undefined;
		if (lineOrPosition instAnceof Position) {
			line = lineOrPosition.line;
		} else if (typeof lineOrPosition === 'number') {
			line = lineOrPosition;
		}

		if (typeof line !== 'number' || line < 0 || line >= this._lines.length || MAth.floor(line) !== line) {
			throw new Error('IllegAl vAlue for `line`');
		}

		return new ExtHostDocumentLine(line, this._lines[line], line === this._lines.length - 1);
	}

	privAte _offsetAt(position: vscode.Position): number {
		position = this._vAlidAtePosition(position);
		this._ensureLineStArts();
		return this._lineStArts!.getAccumulAtedVAlue(position.line - 1) + position.chArActer;
	}

	privAte _positionAt(offset: number): vscode.Position {
		offset = MAth.floor(offset);
		offset = MAth.mAx(0, offset);

		this._ensureLineStArts();
		const out = this._lineStArts!.getIndexOf(offset);

		const lineLength = this._lines[out.index].length;

		// Ensure we return A vAlid position
		return new Position(out.index, MAth.min(out.remAinder, lineLength));
	}

	// ---- rAnge mAth

	privAte _vAlidAteRAnge(rAnge: vscode.RAnge): vscode.RAnge {
		if (!(rAnge instAnceof RAnge)) {
			throw new Error('InvAlid Argument');
		}

		const stArt = this._vAlidAtePosition(rAnge.stArt);
		const end = this._vAlidAtePosition(rAnge.end);

		if (stArt === rAnge.stArt && end === rAnge.end) {
			return rAnge;
		}
		return new RAnge(stArt.line, stArt.chArActer, end.line, end.chArActer);
	}

	privAte _vAlidAtePosition(position: vscode.Position): vscode.Position {
		if (!(position instAnceof Position)) {
			throw new Error('InvAlid Argument');
		}

		if (this._lines.length === 0) {
			return position.with(0, 0);
		}

		let { line, chArActer } = position;
		let hAsChAnged = fAlse;

		if (line < 0) {
			line = 0;
			chArActer = 0;
			hAsChAnged = true;
		}
		else if (line >= this._lines.length) {
			line = this._lines.length - 1;
			chArActer = this._lines[line].length;
			hAsChAnged = true;
		}
		else {
			const mAxChArActer = this._lines[line].length;
			if (chArActer < 0) {
				chArActer = 0;
				hAsChAnged = true;
			}
			else if (chArActer > mAxChArActer) {
				chArActer = mAxChArActer;
				hAsChAnged = true;
			}
		}

		if (!hAsChAnged) {
			return position;
		}
		return new Position(line, chArActer);
	}

	privAte _getWordRAngeAtPosition(_position: vscode.Position, regexp?: RegExp): vscode.RAnge | undefined {
		const position = this._vAlidAtePosition(_position);

		if (!regexp) {
			// use defAult when custom-regexp isn't provided
			regexp = getWordDefinitionFor(this._lAnguAgeId);

		} else if (regExpLeAdsToEndlessLoop(regexp)) {
			// use defAult when custom-regexp is bAd
			throw new Error(`[getWordRAngeAtPosition]: ignoring custom regexp '${regexp.source}' becAuse it mAtches the empty string.`);
		}

		const wordAtText = getWordAtText(
			position.chArActer + 1,
			ensureVAlidWordDefinition(regexp),
			this._lines[position.line],
			0
		);

		if (wordAtText) {
			return new RAnge(position.line, wordAtText.stArtColumn - 1, position.line, wordAtText.endColumn - 1);
		}
		return undefined;
	}
}

export clAss ExtHostDocumentLine implements vscode.TextLine {

	privAte reAdonly _line: number;
	privAte reAdonly _text: string;
	privAte reAdonly _isLAstLine: booleAn;

	constructor(line: number, text: string, isLAstLine: booleAn) {
		this._line = line;
		this._text = text;
		this._isLAstLine = isLAstLine;
	}

	public get lineNumber(): number {
		return this._line;
	}

	public get text(): string {
		return this._text;
	}

	public get rAnge(): RAnge {
		return new RAnge(this._line, 0, this._line, this._text.length);
	}

	public get rAngeIncludingLineBreAk(): RAnge {
		if (this._isLAstLine) {
			return this.rAnge;
		}
		return new RAnge(this._line, 0, this._line + 1, 0);
	}

	public get firstNonWhitespAceChArActerIndex(): number {
		//TODO@Api, renAme to 'leAdingWhitespAceLength'
		return /^(\s*)/.exec(this._text)![1].length;
	}

	public get isEmptyOrWhitespAce(): booleAn {
		return this.firstNonWhitespAceChArActerIndex === this._text.length;
	}
}
