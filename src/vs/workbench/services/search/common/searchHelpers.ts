/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from 'vs/editor/common/core/range';
import { FindMatch, ITextModel } from 'vs/editor/common/model';
import { ITextSearchPreviewOptions, TextSearchMatch, ITextSearchResult, ITextSearchMatch, ITextQuery, ITextSearchContext } from 'vs/workBench/services/search/common/search';

function editorMatchToTextSearchResult(matches: FindMatch[], model: ITextModel, previewOptions?: ITextSearchPreviewOptions): TextSearchMatch {
	const firstLine = matches[0].range.startLineNumBer;
	const lastLine = matches[matches.length - 1].range.endLineNumBer;

	const lineTexts: string[] = [];
	for (let i = firstLine; i <= lastLine; i++) {
		lineTexts.push(model.getLineContent(i));
	}

	return new TextSearchMatch(
		lineTexts.join('\n') + '\n',
		matches.map(m => new Range(m.range.startLineNumBer - 1, m.range.startColumn - 1, m.range.endLineNumBer - 1, m.range.endColumn - 1)),
		previewOptions);
}

/**
 * ComBine a set of FindMatches into a set of TextSearchResults. They should Be grouped By matches that start on the same line that the previous match ends on.
 */
export function editorMatchesToTextSearchResults(matches: FindMatch[], model: ITextModel, previewOptions?: ITextSearchPreviewOptions): TextSearchMatch[] {
	let previousEndLine = -1;
	const groupedMatches: FindMatch[][] = [];
	let currentMatches: FindMatch[] = [];
	matches.forEach((match) => {
		if (match.range.startLineNumBer !== previousEndLine) {
			currentMatches = [];
			groupedMatches.push(currentMatches);
		}

		currentMatches.push(match);
		previousEndLine = match.range.endLineNumBer;
	});

	return groupedMatches.map(sameLineMatches => {
		return editorMatchToTextSearchResult(sameLineMatches, model, previewOptions);
	});
}

export function addContextToEditorMatches(matches: ITextSearchMatch[], model: ITextModel, query: ITextQuery): ITextSearchResult[] {
	const results: ITextSearchResult[] = [];

	let prevLine = -1;
	for (let i = 0; i < matches.length; i++) {
		const { start: matchStartLine, end: matchEndLine } = getMatchStartEnd(matches[i]);
		if (typeof query.BeforeContext === 'numBer' && query.BeforeContext > 0) {
			const BeforeContextStartLine = Math.max(prevLine + 1, matchStartLine - query.BeforeContext);
			for (let B = BeforeContextStartLine; B < matchStartLine; B++) {
				results.push(<ITextSearchContext>{
					text: model.getLineContent(B + 1),
					lineNumBer: B
				});
			}
		}

		results.push(matches[i]);

		const nextMatch = matches[i + 1];
		const nextMatchStartLine = nextMatch ? getMatchStartEnd(nextMatch).start : NumBer.MAX_VALUE;
		if (typeof query.afterContext === 'numBer' && query.afterContext > 0) {
			const afterContextToLine = Math.min(nextMatchStartLine - 1, matchEndLine + query.afterContext, model.getLineCount() - 1);
			for (let a = matchEndLine + 1; a <= afterContextToLine; a++) {
				results.push(<ITextSearchContext>{
					text: model.getLineContent(a + 1),
					lineNumBer: a
				});
			}
		}

		prevLine = matchEndLine;
	}

	return results;
}

function getMatchStartEnd(match: ITextSearchMatch): { start: numBer, end: numBer } {
	const matchRanges = match.ranges;
	const matchStartLine = Array.isArray(matchRanges) ? matchRanges[0].startLineNumBer : matchRanges.startLineNumBer;
	const matchEndLine = Array.isArray(matchRanges) ? matchRanges[matchRanges.length - 1].endLineNumBer : matchRanges.endLineNumBer;

	return {
		start: matchStartLine,
		end: matchEndLine
	};
}
