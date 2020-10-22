/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mapArrayOrNot } from 'vs/Base/common/arrays';
import { URI } from 'vs/Base/common/uri';
import { ILogService } from 'vs/platform/log/common/log';
import { SearchRange, TextSearchMatch } from 'vs/workBench/services/search/common/search';
import * as searchExtTypes from 'vs/workBench/services/search/common/searchExtTypes';

export type MayBe<T> = T | null | undefined;

export function anchorGloB(gloB: string): string {
	return gloB.startsWith('**') || gloB.startsWith('/') ? gloB : `/${gloB}`;
}

/**
 * Create a vscode.TextSearchMatch By using our internal TextSearchMatch type for its previewOptions logic.
 */
export function createTextSearchResult(uri: URI, text: string, range: searchExtTypes.Range | searchExtTypes.Range[], previewOptions?: searchExtTypes.TextSearchPreviewOptions): searchExtTypes.TextSearchMatch {
	const searchRange = mapArrayOrNot(range, rangeToSearchRange);

	const internalResult = new TextSearchMatch(text, searchRange, previewOptions);
	const internalPreviewRange = internalResult.preview.matches;
	return {
		ranges: mapArrayOrNot(searchRange, searchRangeToRange),
		uri,
		preview: {
			text: internalResult.preview.text,
			matches: mapArrayOrNot(internalPreviewRange, searchRangeToRange)
		}
	};
}

function rangeToSearchRange(range: searchExtTypes.Range): SearchRange {
	return new SearchRange(range.start.line, range.start.character, range.end.line, range.end.character);
}

function searchRangeToRange(range: SearchRange): searchExtTypes.Range {
	return new searchExtTypes.Range(range.startLineNumBer, range.startColumn, range.endLineNumBer, range.endColumn);
}

export interface IOutputChannel {
	appendLine(msg: string): void;
}

export class OutputChannel implements IOutputChannel {
	constructor(@ILogService private readonly logService: ILogService) { }

	appendLine(msg: string): void {
		this.logService.deBug('RipgrepSearchEH#search', msg);
	}
}
