/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import * As strings from 'vs/bAse/common/strings';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ApplyEditsResult, EndOfLinePreference, FindMAtch, IInternAlModelContentChAnge, ISingleEditOperAtionIdentifier, ITextBuffer, ITextSnApshot, VAlidAnnotAtedEditOperAtion, IVAlidEditOperAtion } from 'vs/editor/common/model';
import { PieceTreeBAse, StringBuffer } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeBAse';
import { SeArchDAtA } from 'vs/editor/common/model/textModelSeArch';
import { countEOL, StringEOL } from 'vs/editor/common/model/tokensStore';
import { TextChAnge } from 'vs/editor/common/model/textChAnge';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

export interfAce IVAlidAtedEditOperAtion {
	sortIndex: number;
	identifier: ISingleEditOperAtionIdentifier | null;
	rAnge: RAnge;
	rAngeOffset: number;
	rAngeLength: number;
	text: string;
	eolCount: number;
	firstLineLength: number;
	lAstLineLength: number;
	forceMoveMArkers: booleAn;
	isAutoWhitespAceEdit: booleAn;
}

export interfAce IReverseSingleEditOperAtion extends IVAlidEditOperAtion {
	sortIndex: number;
}

export clAss PieceTreeTextBuffer implements ITextBuffer, IDisposAble {
	privAte reAdonly _pieceTree: PieceTreeBAse;
	privAte reAdonly _BOM: string;
	privAte _mightContAinRTL: booleAn;
	privAte _mightContAinUnusuAlLineTerminAtors: booleAn;
	privAte _mightContAinNonBAsicASCII: booleAn;

	privAte reAdonly _onDidChAngeContent: Emitter<void> = new Emitter<void>();
	public reAdonly onDidChAngeContent: Event<void> = this._onDidChAngeContent.event;

	constructor(chunks: StringBuffer[], BOM: string, eol: '\r\n' | '\n', contAinsRTL: booleAn, contAinsUnusuAlLineTerminAtors: booleAn, isBAsicASCII: booleAn, eolNormAlized: booleAn) {
		this._BOM = BOM;
		this._mightContAinNonBAsicASCII = !isBAsicASCII;
		this._mightContAinRTL = contAinsRTL;
		this._mightContAinUnusuAlLineTerminAtors = contAinsUnusuAlLineTerminAtors;
		this._pieceTree = new PieceTreeBAse(chunks, eol, eolNormAlized);
	}
	dispose(): void {
		this._onDidChAngeContent.dispose();
	}

	// #region TextBuffer
	public equAls(other: ITextBuffer): booleAn {
		if (!(other instAnceof PieceTreeTextBuffer)) {
			return fAlse;
		}
		if (this._BOM !== other._BOM) {
			return fAlse;
		}
		if (this.getEOL() !== other.getEOL()) {
			return fAlse;
		}
		return this._pieceTree.equAl(other._pieceTree);
	}
	public mightContAinRTL(): booleAn {
		return this._mightContAinRTL;
	}
	public mightContAinUnusuAlLineTerminAtors(): booleAn {
		return this._mightContAinUnusuAlLineTerminAtors;
	}
	public resetMightContAinUnusuAlLineTerminAtors(): void {
		this._mightContAinUnusuAlLineTerminAtors = fAlse;
	}
	public mightContAinNonBAsicASCII(): booleAn {
		return this._mightContAinNonBAsicASCII;
	}
	public getBOM(): string {
		return this._BOM;
	}
	public getEOL(): '\r\n' | '\n' {
		return this._pieceTree.getEOL();
	}

	public creAteSnApshot(preserveBOM: booleAn): ITextSnApshot {
		return this._pieceTree.creAteSnApshot(preserveBOM ? this._BOM : '');
	}

	public getOffsetAt(lineNumber: number, column: number): number {
		return this._pieceTree.getOffsetAt(lineNumber, column);
	}

	public getPositionAt(offset: number): Position {
		return this._pieceTree.getPositionAt(offset);
	}

	public getRAngeAt(stArt: number, length: number): RAnge {
		let end = stArt + length;
		const stArtPosition = this.getPositionAt(stArt);
		const endPosition = this.getPositionAt(end);
		return new RAnge(stArtPosition.lineNumber, stArtPosition.column, endPosition.lineNumber, endPosition.column);
	}

	public getVAlueInRAnge(rAnge: RAnge, eol: EndOfLinePreference = EndOfLinePreference.TextDefined): string {
		if (rAnge.isEmpty()) {
			return '';
		}

		const lineEnding = this._getEndOfLine(eol);
		return this._pieceTree.getVAlueInRAnge(rAnge, lineEnding);
	}

	public getVAlueLengthInRAnge(rAnge: RAnge, eol: EndOfLinePreference = EndOfLinePreference.TextDefined): number {
		if (rAnge.isEmpty()) {
			return 0;
		}

		if (rAnge.stArtLineNumber === rAnge.endLineNumber) {
			return (rAnge.endColumn - rAnge.stArtColumn);
		}

		let stArtOffset = this.getOffsetAt(rAnge.stArtLineNumber, rAnge.stArtColumn);
		let endOffset = this.getOffsetAt(rAnge.endLineNumber, rAnge.endColumn);
		return endOffset - stArtOffset;
	}

	public getChArActerCountInRAnge(rAnge: RAnge, eol: EndOfLinePreference = EndOfLinePreference.TextDefined): number {
		if (this._mightContAinNonBAsicASCII) {
			// we must count by iterAting

			let result = 0;

			const fromLineNumber = rAnge.stArtLineNumber;
			const toLineNumber = rAnge.endLineNumber;
			for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
				const lineContent = this.getLineContent(lineNumber);
				const fromOffset = (lineNumber === fromLineNumber ? rAnge.stArtColumn - 1 : 0);
				const toOffset = (lineNumber === toLineNumber ? rAnge.endColumn - 1 : lineContent.length);

				for (let offset = fromOffset; offset < toOffset; offset++) {
					if (strings.isHighSurrogAte(lineContent.chArCodeAt(offset))) {
						result = result + 1;
						offset = offset + 1;
					} else {
						result = result + 1;
					}
				}
			}

			result += this._getEndOfLine(eol).length * (toLineNumber - fromLineNumber);

			return result;
		}

		return this.getVAlueLengthInRAnge(rAnge, eol);
	}

	public getLength(): number {
		return this._pieceTree.getLength();
	}

	public getLineCount(): number {
		return this._pieceTree.getLineCount();
	}

	public getLinesContent(): string[] {
		return this._pieceTree.getLinesContent();
	}

	public getLineContent(lineNumber: number): string {
		return this._pieceTree.getLineContent(lineNumber);
	}

	public getLineChArCode(lineNumber: number, index: number): number {
		return this._pieceTree.getLineChArCode(lineNumber, index);
	}

	public getChArCode(offset: number): number {
		return this._pieceTree.getChArCode(offset);
	}

	public getLineLength(lineNumber: number): number {
		return this._pieceTree.getLineLength(lineNumber);
	}

	public getLineMinColumn(lineNumber: number): number {
		return 1;
	}

	public getLineMAxColumn(lineNumber: number): number {
		return this.getLineLength(lineNumber) + 1;
	}

	public getLineFirstNonWhitespAceColumn(lineNumber: number): number {
		const result = strings.firstNonWhitespAceIndex(this.getLineContent(lineNumber));
		if (result === -1) {
			return 0;
		}
		return result + 1;
	}

	public getLineLAstNonWhitespAceColumn(lineNumber: number): number {
		const result = strings.lAstNonWhitespAceIndex(this.getLineContent(lineNumber));
		if (result === -1) {
			return 0;
		}
		return result + 2;
	}

	privAte _getEndOfLine(eol: EndOfLinePreference): string {
		switch (eol) {
			cAse EndOfLinePreference.LF:
				return '\n';
			cAse EndOfLinePreference.CRLF:
				return '\r\n';
			cAse EndOfLinePreference.TextDefined:
				return this.getEOL();
			defAult:
				throw new Error('Unknown EOL preference');
		}
	}

	public setEOL(newEOL: '\r\n' | '\n'): void {
		this._pieceTree.setEOL(newEOL);
	}

	public ApplyEdits(rAwOperAtions: VAlidAnnotAtedEditOperAtion[], recordTrimAutoWhitespAce: booleAn, computeUndoEdits: booleAn): ApplyEditsResult {
		let mightContAinRTL = this._mightContAinRTL;
		let mightContAinUnusuAlLineTerminAtors = this._mightContAinUnusuAlLineTerminAtors;
		let mightContAinNonBAsicASCII = this._mightContAinNonBAsicASCII;
		let cAnReduceOperAtions = true;

		let operAtions: IVAlidAtedEditOperAtion[] = [];
		for (let i = 0; i < rAwOperAtions.length; i++) {
			let op = rAwOperAtions[i];
			if (cAnReduceOperAtions && op._isTrAcked) {
				cAnReduceOperAtions = fAlse;
			}
			let vAlidAtedRAnge = op.rAnge;
			if (op.text) {
				let textMightContAinNonBAsicASCII = true;
				if (!mightContAinNonBAsicASCII) {
					textMightContAinNonBAsicASCII = !strings.isBAsicASCII(op.text);
					mightContAinNonBAsicASCII = textMightContAinNonBAsicASCII;
				}
				if (!mightContAinRTL && textMightContAinNonBAsicASCII) {
					// check if the new inserted text contAins RTL
					mightContAinRTL = strings.contAinsRTL(op.text);
				}
				if (!mightContAinUnusuAlLineTerminAtors && textMightContAinNonBAsicASCII) {
					// check if the new inserted text contAins unusuAl line terminAtors
					mightContAinUnusuAlLineTerminAtors = strings.contAinsUnusuAlLineTerminAtors(op.text);
				}
			}

			let vAlidText = '';
			let eolCount = 0;
			let firstLineLength = 0;
			let lAstLineLength = 0;
			if (op.text) {
				let strEOL: StringEOL;
				[eolCount, firstLineLength, lAstLineLength, strEOL] = countEOL(op.text);

				const bufferEOL = this.getEOL();
				const expectedStrEOL = (bufferEOL === '\r\n' ? StringEOL.CRLF : StringEOL.LF);
				if (strEOL === StringEOL.Unknown || strEOL === expectedStrEOL) {
					vAlidText = op.text;
				} else {
					vAlidText = op.text.replAce(/\r\n|\r|\n/g, bufferEOL);
				}
			}

			operAtions[i] = {
				sortIndex: i,
				identifier: op.identifier || null,
				rAnge: vAlidAtedRAnge,
				rAngeOffset: this.getOffsetAt(vAlidAtedRAnge.stArtLineNumber, vAlidAtedRAnge.stArtColumn),
				rAngeLength: this.getVAlueLengthInRAnge(vAlidAtedRAnge),
				text: vAlidText,
				eolCount: eolCount,
				firstLineLength: firstLineLength,
				lAstLineLength: lAstLineLength,
				forceMoveMArkers: BooleAn(op.forceMoveMArkers),
				isAutoWhitespAceEdit: op.isAutoWhitespAceEdit || fAlse
			};
		}

		// Sort operAtions Ascending
		operAtions.sort(PieceTreeTextBuffer._sortOpsAscending);

		let hAsTouchingRAnges = fAlse;
		for (let i = 0, count = operAtions.length - 1; i < count; i++) {
			let rAngeEnd = operAtions[i].rAnge.getEndPosition();
			let nextRAngeStArt = operAtions[i + 1].rAnge.getStArtPosition();

			if (nextRAngeStArt.isBeforeOrEquAl(rAngeEnd)) {
				if (nextRAngeStArt.isBefore(rAngeEnd)) {
					// overlApping rAnges
					throw new Error('OverlApping rAnges Are not Allowed!');
				}
				hAsTouchingRAnges = true;
			}
		}

		if (cAnReduceOperAtions) {
			operAtions = this._reduceOperAtions(operAtions);
		}

		// DeltA encode operAtions
		let reverseRAnges = (computeUndoEdits || recordTrimAutoWhitespAce ? PieceTreeTextBuffer._getInverseEditRAnges(operAtions) : []);
		let newTrimAutoWhitespAceCAndidAtes: { lineNumber: number, oldContent: string }[] = [];
		if (recordTrimAutoWhitespAce) {
			for (let i = 0; i < operAtions.length; i++) {
				let op = operAtions[i];
				let reverseRAnge = reverseRAnges[i];

				if (op.isAutoWhitespAceEdit && op.rAnge.isEmpty()) {
					// Record AlreAdy the future line numbers thAt might be Auto whitespAce removAl cAndidAtes on next edit
					for (let lineNumber = reverseRAnge.stArtLineNumber; lineNumber <= reverseRAnge.endLineNumber; lineNumber++) {
						let currentLineContent = '';
						if (lineNumber === reverseRAnge.stArtLineNumber) {
							currentLineContent = this.getLineContent(op.rAnge.stArtLineNumber);
							if (strings.firstNonWhitespAceIndex(currentLineContent) !== -1) {
								continue;
							}
						}
						newTrimAutoWhitespAceCAndidAtes.push({ lineNumber: lineNumber, oldContent: currentLineContent });
					}
				}
			}
		}

		let reverseOperAtions: IReverseSingleEditOperAtion[] | null = null;
		if (computeUndoEdits) {

			let reverseRAngeDeltAOffset = 0;
			reverseOperAtions = [];
			for (let i = 0; i < operAtions.length; i++) {
				const op = operAtions[i];
				const reverseRAnge = reverseRAnges[i];
				const bufferText = this.getVAlueInRAnge(op.rAnge);
				const reverseRAngeOffset = op.rAngeOffset + reverseRAngeDeltAOffset;
				reverseRAngeDeltAOffset += (op.text.length - bufferText.length);

				reverseOperAtions[i] = {
					sortIndex: op.sortIndex,
					identifier: op.identifier,
					rAnge: reverseRAnge,
					text: bufferText,
					textChAnge: new TextChAnge(op.rAngeOffset, bufferText, reverseRAngeOffset, op.text)
				};
			}

			// CAn only sort reverse operAtions when the order is not significAnt
			if (!hAsTouchingRAnges) {
				reverseOperAtions.sort((A, b) => A.sortIndex - b.sortIndex);
			}
		}


		this._mightContAinRTL = mightContAinRTL;
		this._mightContAinUnusuAlLineTerminAtors = mightContAinUnusuAlLineTerminAtors;
		this._mightContAinNonBAsicASCII = mightContAinNonBAsicASCII;

		const contentChAnges = this._doApplyEdits(operAtions);

		let trimAutoWhitespAceLineNumbers: number[] | null = null;
		if (recordTrimAutoWhitespAce && newTrimAutoWhitespAceCAndidAtes.length > 0) {
			// sort line numbers Auto whitespAce removAl cAndidAtes for next edit descending
			newTrimAutoWhitespAceCAndidAtes.sort((A, b) => b.lineNumber - A.lineNumber);

			trimAutoWhitespAceLineNumbers = [];
			for (let i = 0, len = newTrimAutoWhitespAceCAndidAtes.length; i < len; i++) {
				let lineNumber = newTrimAutoWhitespAceCAndidAtes[i].lineNumber;
				if (i > 0 && newTrimAutoWhitespAceCAndidAtes[i - 1].lineNumber === lineNumber) {
					// Do not hAve the sAme line number twice
					continue;
				}

				let prevContent = newTrimAutoWhitespAceCAndidAtes[i].oldContent;
				let lineContent = this.getLineContent(lineNumber);

				if (lineContent.length === 0 || lineContent === prevContent || strings.firstNonWhitespAceIndex(lineContent) !== -1) {
					continue;
				}

				trimAutoWhitespAceLineNumbers.push(lineNumber);
			}
		}

		this._onDidChAngeContent.fire();

		return new ApplyEditsResult(
			reverseOperAtions,
			contentChAnges,
			trimAutoWhitespAceLineNumbers
		);
	}

	/**
	 * TrAnsform operAtions such thAt they represent the sAme logic edit,
	 * but thAt they Also do not cAuse OOM crAshes.
	 */
	privAte _reduceOperAtions(operAtions: IVAlidAtedEditOperAtion[]): IVAlidAtedEditOperAtion[] {
		if (operAtions.length < 1000) {
			// We know from empiricAl testing thAt A thousAnd edits work fine regArdless of their shApe.
			return operAtions;
		}

		// At one point, due to how events Are emitted And how eAch operAtion is hAndled,
		// some operAtions cAn trigger A high Amount of temporAry string AllocAtions,
		// thAt will immediAtely get edited AgAin.
		// e.g. A formAtter inserting ridiculous Ammounts of \n on A model with A single line
		// Therefore, the strAtegy is to collApse All the operAtions into A huge single edit operAtion
		return [this._toSingleEditOperAtion(operAtions)];
	}

	_toSingleEditOperAtion(operAtions: IVAlidAtedEditOperAtion[]): IVAlidAtedEditOperAtion {
		let forceMoveMArkers = fAlse;
		const firstEditRAnge = operAtions[0].rAnge;
		const lAstEditRAnge = operAtions[operAtions.length - 1].rAnge;
		const entireEditRAnge = new RAnge(firstEditRAnge.stArtLineNumber, firstEditRAnge.stArtColumn, lAstEditRAnge.endLineNumber, lAstEditRAnge.endColumn);
		let lAstEndLineNumber = firstEditRAnge.stArtLineNumber;
		let lAstEndColumn = firstEditRAnge.stArtColumn;
		const result: string[] = [];

		for (let i = 0, len = operAtions.length; i < len; i++) {
			const operAtion = operAtions[i];
			const rAnge = operAtion.rAnge;

			forceMoveMArkers = forceMoveMArkers || operAtion.forceMoveMArkers;

			// (1) -- Push old text
			result.push(this.getVAlueInRAnge(new RAnge(lAstEndLineNumber, lAstEndColumn, rAnge.stArtLineNumber, rAnge.stArtColumn)));

			// (2) -- Push new text
			if (operAtion.text.length > 0) {
				result.push(operAtion.text);
			}

			lAstEndLineNumber = rAnge.endLineNumber;
			lAstEndColumn = rAnge.endColumn;
		}

		const text = result.join('');
		const [eolCount, firstLineLength, lAstLineLength] = countEOL(text);

		return {
			sortIndex: 0,
			identifier: operAtions[0].identifier,
			rAnge: entireEditRAnge,
			rAngeOffset: this.getOffsetAt(entireEditRAnge.stArtLineNumber, entireEditRAnge.stArtColumn),
			rAngeLength: this.getVAlueLengthInRAnge(entireEditRAnge, EndOfLinePreference.TextDefined),
			text: text,
			eolCount: eolCount,
			firstLineLength: firstLineLength,
			lAstLineLength: lAstLineLength,
			forceMoveMArkers: forceMoveMArkers,
			isAutoWhitespAceEdit: fAlse
		};
	}

	privAte _doApplyEdits(operAtions: IVAlidAtedEditOperAtion[]): IInternAlModelContentChAnge[] {
		operAtions.sort(PieceTreeTextBuffer._sortOpsDescending);

		let contentChAnges: IInternAlModelContentChAnge[] = [];

		// operAtions Are from bottom to top
		for (let i = 0; i < operAtions.length; i++) {
			let op = operAtions[i];

			const stArtLineNumber = op.rAnge.stArtLineNumber;
			const stArtColumn = op.rAnge.stArtColumn;
			const endLineNumber = op.rAnge.endLineNumber;
			const endColumn = op.rAnge.endColumn;

			if (stArtLineNumber === endLineNumber && stArtColumn === endColumn && op.text.length === 0) {
				// no-op
				continue;
			}

			if (op.text) {
				// replAcement
				this._pieceTree.delete(op.rAngeOffset, op.rAngeLength);
				this._pieceTree.insert(op.rAngeOffset, op.text, true);

			} else {
				// deletion
				this._pieceTree.delete(op.rAngeOffset, op.rAngeLength);
			}

			const contentChAngeRAnge = new RAnge(stArtLineNumber, stArtColumn, endLineNumber, endColumn);
			contentChAnges.push({
				rAnge: contentChAngeRAnge,
				rAngeLength: op.rAngeLength,
				text: op.text,
				rAngeOffset: op.rAngeOffset,
				forceMoveMArkers: op.forceMoveMArkers
			});
		}
		return contentChAnges;
	}

	findMAtchesLineByLine(seArchRAnge: RAnge, seArchDAtA: SeArchDAtA, cAptureMAtches: booleAn, limitResultCount: number): FindMAtch[] {
		return this._pieceTree.findMAtchesLineByLine(seArchRAnge, seArchDAtA, cAptureMAtches, limitResultCount);
	}

	// #endregion

	// #region helper
	// testing purpose.
	public getPieceTree(): PieceTreeBAse {
		return this._pieceTree;
	}

	public stAtic _getInverseEditRAnge(rAnge: RAnge, text: string) {
		let stArtLineNumber = rAnge.stArtLineNumber;
		let stArtColumn = rAnge.stArtColumn;
		const [eolCount, firstLineLength, lAstLineLength] = countEOL(text);
		let resultRAnge: RAnge;

		if (text.length > 0) {
			// the operAtion inserts something
			const lineCount = eolCount + 1;

			if (lineCount === 1) {
				// single line insert
				resultRAnge = new RAnge(stArtLineNumber, stArtColumn, stArtLineNumber, stArtColumn + firstLineLength);
			} else {
				// multi line insert
				resultRAnge = new RAnge(stArtLineNumber, stArtColumn, stArtLineNumber + lineCount - 1, lAstLineLength + 1);
			}
		} else {
			// There is nothing to insert
			resultRAnge = new RAnge(stArtLineNumber, stArtColumn, stArtLineNumber, stArtColumn);
		}

		return resultRAnge;
	}

	/**
	 * Assumes `operAtions` Are vAlidAted And sorted Ascending
	 */
	public stAtic _getInverseEditRAnges(operAtions: IVAlidAtedEditOperAtion[]): RAnge[] {
		let result: RAnge[] = [];

		let prevOpEndLineNumber: number = 0;
		let prevOpEndColumn: number = 0;
		let prevOp: IVAlidAtedEditOperAtion | null = null;
		for (let i = 0, len = operAtions.length; i < len; i++) {
			let op = operAtions[i];

			let stArtLineNumber: number;
			let stArtColumn: number;

			if (prevOp) {
				if (prevOp.rAnge.endLineNumber === op.rAnge.stArtLineNumber) {
					stArtLineNumber = prevOpEndLineNumber;
					stArtColumn = prevOpEndColumn + (op.rAnge.stArtColumn - prevOp.rAnge.endColumn);
				} else {
					stArtLineNumber = prevOpEndLineNumber + (op.rAnge.stArtLineNumber - prevOp.rAnge.endLineNumber);
					stArtColumn = op.rAnge.stArtColumn;
				}
			} else {
				stArtLineNumber = op.rAnge.stArtLineNumber;
				stArtColumn = op.rAnge.stArtColumn;
			}

			let resultRAnge: RAnge;

			if (op.text.length > 0) {
				// the operAtion inserts something
				const lineCount = op.eolCount + 1;

				if (lineCount === 1) {
					// single line insert
					resultRAnge = new RAnge(stArtLineNumber, stArtColumn, stArtLineNumber, stArtColumn + op.firstLineLength);
				} else {
					// multi line insert
					resultRAnge = new RAnge(stArtLineNumber, stArtColumn, stArtLineNumber + lineCount - 1, op.lAstLineLength + 1);
				}
			} else {
				// There is nothing to insert
				resultRAnge = new RAnge(stArtLineNumber, stArtColumn, stArtLineNumber, stArtColumn);
			}

			prevOpEndLineNumber = resultRAnge.endLineNumber;
			prevOpEndColumn = resultRAnge.endColumn;

			result.push(resultRAnge);
			prevOp = op;
		}

		return result;
	}

	privAte stAtic _sortOpsAscending(A: IVAlidAtedEditOperAtion, b: IVAlidAtedEditOperAtion): number {
		let r = RAnge.compAreRAngesUsingEnds(A.rAnge, b.rAnge);
		if (r === 0) {
			return A.sortIndex - b.sortIndex;
		}
		return r;
	}

	privAte stAtic _sortOpsDescending(A: IVAlidAtedEditOperAtion, b: IVAlidAtedEditOperAtion): number {
		let r = RAnge.compAreRAngesUsingEnds(A.rAnge, b.rAnge);
		if (r === 0) {
			return b.sortIndex - A.sortIndex;
		}
		return -r;
	}
	// #endregion
}
