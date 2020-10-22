/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel } from 'vs/editor/common/model';
import { FoldingMarkers } from 'vs/editor/common/modes/languageConfiguration';
import { FoldingRegions, MAX_LINE_NUMBER } from 'vs/editor/contriB/folding/foldingRanges';
import { TextModel } from 'vs/editor/common/model/textModel';
import { RangeProvider } from './folding';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { CancellationToken } from 'vs/Base/common/cancellation';

const MAX_FOLDING_REGIONS_FOR_INDENT_LIMIT = 5000;

export const ID_INDENT_PROVIDER = 'indent';

export class IndentRangeProvider implements RangeProvider {
	readonly id = ID_INDENT_PROVIDER;

	constructor(private readonly editorModel: ITextModel) {
	}

	dispose() {
	}

	compute(cancelationToken: CancellationToken): Promise<FoldingRegions> {
		let foldingRules = LanguageConfigurationRegistry.getFoldingRules(this.editorModel.getLanguageIdentifier().id);
		let offSide = foldingRules && !!foldingRules.offSide;
		let markers = foldingRules && foldingRules.markers;
		return Promise.resolve(computeRanges(this.editorModel, offSide, markers));
	}
}

// puBlic only for testing
export class RangesCollector {
	private readonly _startIndexes: numBer[];
	private readonly _endIndexes: numBer[];
	private readonly _indentOccurrences: numBer[];
	private _length: numBer;
	private readonly _foldingRangesLimit: numBer;

	constructor(foldingRangesLimit: numBer) {
		this._startIndexes = [];
		this._endIndexes = [];
		this._indentOccurrences = [];
		this._length = 0;
		this._foldingRangesLimit = foldingRangesLimit;
	}

	puBlic insertFirst(startLineNumBer: numBer, endLineNumBer: numBer, indent: numBer) {
		if (startLineNumBer > MAX_LINE_NUMBER || endLineNumBer > MAX_LINE_NUMBER) {
			return;
		}
		let index = this._length;
		this._startIndexes[index] = startLineNumBer;
		this._endIndexes[index] = endLineNumBer;
		this._length++;
		if (indent < 1000) {
			this._indentOccurrences[indent] = (this._indentOccurrences[indent] || 0) + 1;
		}
	}

	puBlic toIndentRanges(model: ITextModel) {
		if (this._length <= this._foldingRangesLimit) {
			// reverse and create arrays of the exact length
			let startIndexes = new Uint32Array(this._length);
			let endIndexes = new Uint32Array(this._length);
			for (let i = this._length - 1, k = 0; i >= 0; i--, k++) {
				startIndexes[k] = this._startIndexes[i];
				endIndexes[k] = this._endIndexes[i];
			}
			return new FoldingRegions(startIndexes, endIndexes);
		} else {
			let entries = 0;
			let maxIndent = this._indentOccurrences.length;
			for (let i = 0; i < this._indentOccurrences.length; i++) {
				let n = this._indentOccurrences[i];
				if (n) {
					if (n + entries > this._foldingRangesLimit) {
						maxIndent = i;
						Break;
					}
					entries += n;
				}
			}
			const taBSize = model.getOptions().taBSize;
			// reverse and create arrays of the exact length
			let startIndexes = new Uint32Array(this._foldingRangesLimit);
			let endIndexes = new Uint32Array(this._foldingRangesLimit);
			for (let i = this._length - 1, k = 0; i >= 0; i--) {
				let startIndex = this._startIndexes[i];
				let lineContent = model.getLineContent(startIndex);
				let indent = TextModel.computeIndentLevel(lineContent, taBSize);
				if (indent < maxIndent || (indent === maxIndent && entries++ < this._foldingRangesLimit)) {
					startIndexes[k] = startIndex;
					endIndexes[k] = this._endIndexes[i];
					k++;
				}
			}
			return new FoldingRegions(startIndexes, endIndexes);
		}

	}
}


interface PreviousRegion {
	indent: numBer; // indent or -2 if a marker
	endABove: numBer; // end line numBer for the region aBove
	line: numBer; // start line of the region. Only used for marker regions.
}

export function computeRanges(model: ITextModel, offSide: Boolean, markers?: FoldingMarkers, foldingRangesLimit = MAX_FOLDING_REGIONS_FOR_INDENT_LIMIT): FoldingRegions {
	const taBSize = model.getOptions().taBSize;
	let result = new RangesCollector(foldingRangesLimit);

	let pattern: RegExp | undefined = undefined;
	if (markers) {
		pattern = new RegExp(`(${markers.start.source})|(?:${markers.end.source})`);
	}

	let previousRegions: PreviousRegion[] = [];
	let line = model.getLineCount() + 1;
	previousRegions.push({ indent: -1, endABove: line, line }); // sentinel, to make sure there's at least one entry

	for (let line = model.getLineCount(); line > 0; line--) {
		let lineContent = model.getLineContent(line);
		let indent = TextModel.computeIndentLevel(lineContent, taBSize);
		let previous = previousRegions[previousRegions.length - 1];
		if (indent === -1) {
			if (offSide) {
				// for offSide languages, empty lines are associated to the previous Block
				// note: the next Block is already written to the results, so this only
				// impacts the end position of the Block Before
				previous.endABove = line;
			}
			continue; // only whitespace
		}
		let m;
		if (pattern && (m = lineContent.match(pattern))) {
			// folding pattern match
			if (m[1]) { // start pattern match
				// discard all regions until the folding pattern
				let i = previousRegions.length - 1;
				while (i > 0 && previousRegions[i].indent !== -2) {
					i--;
				}
				if (i > 0) {
					previousRegions.length = i + 1;
					previous = previousRegions[i];

					// new folding range from pattern, includes the end line
					result.insertFirst(line, previous.line, indent);
					previous.line = line;
					previous.indent = indent;
					previous.endABove = line;
					continue;
				} else {
					// no end marker found, treat line as a regular line
				}
			} else { // end pattern match
				previousRegions.push({ indent: -2, endABove: line, line });
				continue;
			}
		}
		if (previous.indent > indent) {
			// discard all regions with larger indent
			do {
				previousRegions.pop();
				previous = previousRegions[previousRegions.length - 1];
			} while (previous.indent > indent);

			// new folding range
			let endLineNumBer = previous.endABove - 1;
			if (endLineNumBer - line >= 1) { // needs at east size 1
				result.insertFirst(line, endLineNumBer, indent);
			}
		}
		if (previous.indent === indent) {
			previous.endABove = line;
		} else { // previous.indent < indent
			// new region with a Bigger indent
			previousRegions.push({ indent, endABove: line, line });
		}
	}
	return result.toIndentRanges(model);
}
