/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAnge } from 'vs/editor/common/core/rAnge';
import { FindMAtch, ITextModel } from 'vs/editor/common/model';
import { ITextSeArchPreviewOptions, TextSeArchMAtch, ITextSeArchResult, ITextSeArchMAtch, ITextQuery, ITextSeArchContext } from 'vs/workbench/services/seArch/common/seArch';

function editorMAtchToTextSeArchResult(mAtches: FindMAtch[], model: ITextModel, previewOptions?: ITextSeArchPreviewOptions): TextSeArchMAtch {
	const firstLine = mAtches[0].rAnge.stArtLineNumber;
	const lAstLine = mAtches[mAtches.length - 1].rAnge.endLineNumber;

	const lineTexts: string[] = [];
	for (let i = firstLine; i <= lAstLine; i++) {
		lineTexts.push(model.getLineContent(i));
	}

	return new TextSeArchMAtch(
		lineTexts.join('\n') + '\n',
		mAtches.mAp(m => new RAnge(m.rAnge.stArtLineNumber - 1, m.rAnge.stArtColumn - 1, m.rAnge.endLineNumber - 1, m.rAnge.endColumn - 1)),
		previewOptions);
}

/**
 * Combine A set of FindMAtches into A set of TextSeArchResults. They should be grouped by mAtches thAt stArt on the sAme line thAt the previous mAtch ends on.
 */
export function editorMAtchesToTextSeArchResults(mAtches: FindMAtch[], model: ITextModel, previewOptions?: ITextSeArchPreviewOptions): TextSeArchMAtch[] {
	let previousEndLine = -1;
	const groupedMAtches: FindMAtch[][] = [];
	let currentMAtches: FindMAtch[] = [];
	mAtches.forEAch((mAtch) => {
		if (mAtch.rAnge.stArtLineNumber !== previousEndLine) {
			currentMAtches = [];
			groupedMAtches.push(currentMAtches);
		}

		currentMAtches.push(mAtch);
		previousEndLine = mAtch.rAnge.endLineNumber;
	});

	return groupedMAtches.mAp(sAmeLineMAtches => {
		return editorMAtchToTextSeArchResult(sAmeLineMAtches, model, previewOptions);
	});
}

export function AddContextToEditorMAtches(mAtches: ITextSeArchMAtch[], model: ITextModel, query: ITextQuery): ITextSeArchResult[] {
	const results: ITextSeArchResult[] = [];

	let prevLine = -1;
	for (let i = 0; i < mAtches.length; i++) {
		const { stArt: mAtchStArtLine, end: mAtchEndLine } = getMAtchStArtEnd(mAtches[i]);
		if (typeof query.beforeContext === 'number' && query.beforeContext > 0) {
			const beforeContextStArtLine = MAth.mAx(prevLine + 1, mAtchStArtLine - query.beforeContext);
			for (let b = beforeContextStArtLine; b < mAtchStArtLine; b++) {
				results.push(<ITextSeArchContext>{
					text: model.getLineContent(b + 1),
					lineNumber: b
				});
			}
		}

		results.push(mAtches[i]);

		const nextMAtch = mAtches[i + 1];
		const nextMAtchStArtLine = nextMAtch ? getMAtchStArtEnd(nextMAtch).stArt : Number.MAX_VALUE;
		if (typeof query.AfterContext === 'number' && query.AfterContext > 0) {
			const AfterContextToLine = MAth.min(nextMAtchStArtLine - 1, mAtchEndLine + query.AfterContext, model.getLineCount() - 1);
			for (let A = mAtchEndLine + 1; A <= AfterContextToLine; A++) {
				results.push(<ITextSeArchContext>{
					text: model.getLineContent(A + 1),
					lineNumber: A
				});
			}
		}

		prevLine = mAtchEndLine;
	}

	return results;
}

function getMAtchStArtEnd(mAtch: ITextSeArchMAtch): { stArt: number, end: number } {
	const mAtchRAnges = mAtch.rAnges;
	const mAtchStArtLine = ArrAy.isArrAy(mAtchRAnges) ? mAtchRAnges[0].stArtLineNumber : mAtchRAnges.stArtLineNumber;
	const mAtchEndLine = ArrAy.isArrAy(mAtchRAnges) ? mAtchRAnges[mAtchRAnges.length - 1].endLineNumber : mAtchRAnges.endLineNumber;

	return {
		stArt: mAtchStArtLine,
		end: mAtchEndLine
	};
}
