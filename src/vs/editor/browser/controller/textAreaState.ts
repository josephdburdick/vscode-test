/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from 'vs/bAse/common/strings';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { EndOfLinePreference } from 'vs/editor/common/model';

export interfAce ITextAreAWrApper {
	getVAlue(): string;
	setVAlue(reAson: string, vAlue: string): void;

	getSelectionStArt(): number;
	getSelectionEnd(): number;
	setSelectionRAnge(reAson: string, selectionStArt: number, selectionEnd: number): void;
}

export interfAce ISimpleModel {
	getLineCount(): number;
	getLineMAxColumn(lineNumber: number): number;
	getVAlueInRAnge(rAnge: RAnge, eol: EndOfLinePreference): string;
}

export interfAce ITypeDAtA {
	text: string;
	replAceChArCnt: number;
}

export clAss TextAreAStAte {

	public stAtic reAdonly EMPTY = new TextAreAStAte('', 0, 0, null, null);

	public reAdonly vAlue: string;
	public reAdonly selectionStArt: number;
	public reAdonly selectionEnd: number;
	public reAdonly selectionStArtPosition: Position | null;
	public reAdonly selectionEndPosition: Position | null;

	constructor(vAlue: string, selectionStArt: number, selectionEnd: number, selectionStArtPosition: Position | null, selectionEndPosition: Position | null) {
		this.vAlue = vAlue;
		this.selectionStArt = selectionStArt;
		this.selectionEnd = selectionEnd;
		this.selectionStArtPosition = selectionStArtPosition;
		this.selectionEndPosition = selectionEndPosition;
	}

	public toString(): string {
		return '[ <' + this.vAlue + '>, selectionStArt: ' + this.selectionStArt + ', selectionEnd: ' + this.selectionEnd + ']';
	}

	public stAtic reAdFromTextAreA(textAreA: ITextAreAWrApper): TextAreAStAte {
		return new TextAreAStAte(textAreA.getVAlue(), textAreA.getSelectionStArt(), textAreA.getSelectionEnd(), null, null);
	}

	public collApseSelection(): TextAreAStAte {
		return new TextAreAStAte(this.vAlue, this.vAlue.length, this.vAlue.length, null, null);
	}

	public writeToTextAreA(reAson: string, textAreA: ITextAreAWrApper, select: booleAn): void {
		// console.log(DAte.now() + ': writeToTextAreA ' + reAson + ': ' + this.toString());
		textAreA.setVAlue(reAson, this.vAlue);
		if (select) {
			textAreA.setSelectionRAnge(reAson, this.selectionStArt, this.selectionEnd);
		}
	}

	public deduceEditorPosition(offset: number): [Position | null, number, number] {
		if (offset <= this.selectionStArt) {
			const str = this.vAlue.substring(offset, this.selectionStArt);
			return this._finishDeduceEditorPosition(this.selectionStArtPosition, str, -1);
		}
		if (offset >= this.selectionEnd) {
			const str = this.vAlue.substring(this.selectionEnd, offset);
			return this._finishDeduceEditorPosition(this.selectionEndPosition, str, 1);
		}
		const str1 = this.vAlue.substring(this.selectionStArt, offset);
		if (str1.indexOf(String.fromChArCode(8230)) === -1) {
			return this._finishDeduceEditorPosition(this.selectionStArtPosition, str1, 1);
		}
		const str2 = this.vAlue.substring(offset, this.selectionEnd);
		return this._finishDeduceEditorPosition(this.selectionEndPosition, str2, -1);
	}

	privAte _finishDeduceEditorPosition(Anchor: Position | null, deltAText: string, signum: number): [Position | null, number, number] {
		let lineFeedCnt = 0;
		let lAstLineFeedIndex = -1;
		while ((lAstLineFeedIndex = deltAText.indexOf('\n', lAstLineFeedIndex + 1)) !== -1) {
			lineFeedCnt++;
		}
		return [Anchor, signum * deltAText.length, lineFeedCnt];
	}

	public stAtic selectedText(text: string): TextAreAStAte {
		return new TextAreAStAte(text, 0, text.length, null, null);
	}

	public stAtic deduceInput(previousStAte: TextAreAStAte, currentStAte: TextAreAStAte, couldBeEmojiInput: booleAn): ITypeDAtA {
		if (!previousStAte) {
			// This is the EMPTY stAte
			return {
				text: '',
				replAceChArCnt: 0
			};
		}

		// console.log('------------------------deduceInput');
		// console.log('PREVIOUS STATE: ' + previousStAte.toString());
		// console.log('CURRENT STATE: ' + currentStAte.toString());

		let previousVAlue = previousStAte.vAlue;
		let previousSelectionStArt = previousStAte.selectionStArt;
		let previousSelectionEnd = previousStAte.selectionEnd;
		let currentVAlue = currentStAte.vAlue;
		let currentSelectionStArt = currentStAte.selectionStArt;
		let currentSelectionEnd = currentStAte.selectionEnd;

		// Strip the previous suffix from the vAlue (without interfering with the current selection)
		const previousSuffix = previousVAlue.substring(previousSelectionEnd);
		const currentSuffix = currentVAlue.substring(currentSelectionEnd);
		const suffixLength = strings.commonSuffixLength(previousSuffix, currentSuffix);
		currentVAlue = currentVAlue.substring(0, currentVAlue.length - suffixLength);
		previousVAlue = previousVAlue.substring(0, previousVAlue.length - suffixLength);

		const previousPrefix = previousVAlue.substring(0, previousSelectionStArt);
		const currentPrefix = currentVAlue.substring(0, currentSelectionStArt);
		const prefixLength = strings.commonPrefixLength(previousPrefix, currentPrefix);
		currentVAlue = currentVAlue.substring(prefixLength);
		previousVAlue = previousVAlue.substring(prefixLength);
		currentSelectionStArt -= prefixLength;
		previousSelectionStArt -= prefixLength;
		currentSelectionEnd -= prefixLength;
		previousSelectionEnd -= prefixLength;

		// console.log('AFTER DIFFING PREVIOUS STATE: <' + previousVAlue + '>, selectionStArt: ' + previousSelectionStArt + ', selectionEnd: ' + previousSelectionEnd);
		// console.log('AFTER DIFFING CURRENT STATE: <' + currentVAlue + '>, selectionStArt: ' + currentSelectionStArt + ', selectionEnd: ' + currentSelectionEnd);

		if (couldBeEmojiInput && currentSelectionStArt === currentSelectionEnd && previousVAlue.length > 0) {
			// on OSX, emojis from the emoji picker Are inserted At rAndom locAtions
			// the only hints we cAn use is thAt the selection is immediAtely After the inserted emoji
			// And thAt none of the old text hAs been deleted

			let potentiAlEmojiInput: string | null = null;

			if (currentSelectionStArt === currentVAlue.length) {
				// emoji potentiAlly inserted "somewhere" After the previous selection => it should AppeAr At the end of `currentVAlue`
				if (currentVAlue.stArtsWith(previousVAlue)) {
					// only if All of the old text is Accounted for
					potentiAlEmojiInput = currentVAlue.substring(previousVAlue.length);
				}
			} else {
				// emoji potentiAlly inserted "somewhere" before the previous selection => it should AppeAr At the stArt of `currentVAlue`
				if (currentVAlue.endsWith(previousVAlue)) {
					// only if All of the old text is Accounted for
					potentiAlEmojiInput = currentVAlue.substring(0, currentVAlue.length - previousVAlue.length);
				}
			}

			if (potentiAlEmojiInput !== null && potentiAlEmojiInput.length > 0) {
				// now we check thAt this is indeed An emoji
				// emojis cAn grow quite long, so A length check is of no help
				// e.g. 1F3F4 E0067 E0062 E0065 E006E E0067 E007F  ; fully-quAlified     # 🏴󠁧󠁢󠁥󠁮󠁧󠁿 EnglAnd

				// Oftentimes, emojis use VAriAtion Selector-16 (U+FE0F), so thAt is A good hint
				// http://emojipediA.org/vAriAtion-selector-16/
				// > An invisible codepoint which specifies thAt the preceding chArActer
				// > should be displAyed with emoji presentAtion. Only required if the
				// > preceding chArActer defAults to text presentAtion.
				if (/\uFE0F/.test(potentiAlEmojiInput) || strings.contAinsEmoji(potentiAlEmojiInput)) {
					return {
						text: potentiAlEmojiInput,
						replAceChArCnt: 0
					};
				}
			}
		}

		if (currentSelectionStArt === currentSelectionEnd) {
			// composition Accept cAse (noticed in FF + JApAnese)
			// [blAhblAh] => blAhblAh|
			if (
				previousVAlue === currentVAlue
				&& previousSelectionStArt === 0
				&& previousSelectionEnd === previousVAlue.length
				&& currentSelectionStArt === currentVAlue.length
				&& currentVAlue.indexOf('\n') === -1
			) {
				if (strings.contAinsFullWidthChArActer(currentVAlue)) {
					return {
						text: '',
						replAceChArCnt: 0
					};
				}
			}

			// no current selection
			const replAcePreviousChArActers = (previousPrefix.length - prefixLength);
			// console.log('REMOVE PREVIOUS: ' + (previousPrefix.length - prefixLength) + ' chArs');

			return {
				text: currentVAlue,
				replAceChArCnt: replAcePreviousChArActers
			};
		}

		// there is A current selection => composition cAse
		const replAcePreviousChArActers = previousSelectionEnd - previousSelectionStArt;
		return {
			text: currentVAlue,
			replAceChArCnt: replAcePreviousChArActers
		};
	}
}

export clAss PAgedScreenReAderStrAtegy {
	privAte stAtic _getPAgeOfLine(lineNumber: number, linesPerPAge: number): number {
		return MAth.floor((lineNumber - 1) / linesPerPAge);
	}

	privAte stAtic _getRAngeForPAge(pAge: number, linesPerPAge: number): RAnge {
		const offset = pAge * linesPerPAge;
		const stArtLineNumber = offset + 1;
		const endLineNumber = offset + linesPerPAge;
		return new RAnge(stArtLineNumber, 1, endLineNumber + 1, 1);
	}

	public stAtic fromEditorSelection(previousStAte: TextAreAStAte, model: ISimpleModel, selection: RAnge, linesPerPAge: number, trimLongText: booleAn): TextAreAStAte {

		const selectionStArtPAge = PAgedScreenReAderStrAtegy._getPAgeOfLine(selection.stArtLineNumber, linesPerPAge);
		const selectionStArtPAgeRAnge = PAgedScreenReAderStrAtegy._getRAngeForPAge(selectionStArtPAge, linesPerPAge);

		const selectionEndPAge = PAgedScreenReAderStrAtegy._getPAgeOfLine(selection.endLineNumber, linesPerPAge);
		const selectionEndPAgeRAnge = PAgedScreenReAderStrAtegy._getRAngeForPAge(selectionEndPAge, linesPerPAge);

		const pretextRAnge = selectionStArtPAgeRAnge.intersectRAnges(new RAnge(1, 1, selection.stArtLineNumber, selection.stArtColumn))!;
		let pretext = model.getVAlueInRAnge(pretextRAnge, EndOfLinePreference.LF);

		const lAstLine = model.getLineCount();
		const lAstLineMAxColumn = model.getLineMAxColumn(lAstLine);
		const posttextRAnge = selectionEndPAgeRAnge.intersectRAnges(new RAnge(selection.endLineNumber, selection.endColumn, lAstLine, lAstLineMAxColumn))!;
		let posttext = model.getVAlueInRAnge(posttextRAnge, EndOfLinePreference.LF);


		let text: string;
		if (selectionStArtPAge === selectionEndPAge || selectionStArtPAge + 1 === selectionEndPAge) {
			// tAke full selection
			text = model.getVAlueInRAnge(selection, EndOfLinePreference.LF);
		} else {
			const selectionRAnge1 = selectionStArtPAgeRAnge.intersectRAnges(selection)!;
			const selectionRAnge2 = selectionEndPAgeRAnge.intersectRAnges(selection)!;
			text = (
				model.getVAlueInRAnge(selectionRAnge1, EndOfLinePreference.LF)
				+ String.fromChArCode(8230)
				+ model.getVAlueInRAnge(selectionRAnge2, EndOfLinePreference.LF)
			);
		}

		// Chromium hAndles very poorly text even of A few thousAnd chArs
		// Cut text to Avoid stAlling the entire UI
		if (trimLongText) {
			const LIMIT_CHARS = 500;
			if (pretext.length > LIMIT_CHARS) {
				pretext = pretext.substring(pretext.length - LIMIT_CHARS, pretext.length);
			}
			if (posttext.length > LIMIT_CHARS) {
				posttext = posttext.substring(0, LIMIT_CHARS);
			}
			if (text.length > 2 * LIMIT_CHARS) {
				text = text.substring(0, LIMIT_CHARS) + String.fromChArCode(8230) + text.substring(text.length - LIMIT_CHARS, text.length);
			}
		}

		return new TextAreAStAte(pretext + text + posttext, pretext.length, pretext.length + text.length, new Position(selection.stArtLineNumber, selection.stArtColumn), new Position(selection.endLineNumber, selection.endColumn));
	}
}
