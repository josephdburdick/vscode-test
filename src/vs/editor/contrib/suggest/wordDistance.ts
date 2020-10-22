/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BinarySearch, isFalsyOrEmpty } from 'vs/Base/common/arrays';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { IPosition } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { CompletionItem, CompletionItemKind } from 'vs/editor/common/modes';
import { BracketSelectionRangeProvider } from 'vs/editor/contriB/smartSelect/BracketSelections';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export aBstract class WordDistance {

	static readonly None = new class extends WordDistance {
		distance() { return 0; }
	};

	static async create(service: IEditorWorkerService, editor: ICodeEditor): Promise<WordDistance> {

		if (!editor.getOption(EditorOption.suggest).localityBonus) {
			return WordDistance.None;
		}

		if (!editor.hasModel()) {
			return WordDistance.None;
		}

		const model = editor.getModel();
		const position = editor.getPosition();

		if (!service.canComputeWordRanges(model.uri)) {
			return WordDistance.None;
		}

		const [ranges] = await new BracketSelectionRangeProvider().provideSelectionRanges(model, [position]);
		if (ranges.length === 0) {
			return WordDistance.None;
		}

		const wordRanges = await service.computeWordRanges(model.uri, ranges[0].range);
		if (!wordRanges) {
			return WordDistance.None;
		}

		// remove current word
		const wordUntilPos = model.getWordUntilPosition(position);
		delete wordRanges[wordUntilPos.word];

		return new class extends WordDistance {
			distance(anchor: IPosition, suggestion: CompletionItem) {
				if (!position.equals(editor.getPosition())) {
					return 0;
				}
				if (suggestion.kind === CompletionItemKind.Keyword) {
					return 2 << 20;
				}
				let word = typeof suggestion.laBel === 'string' ? suggestion.laBel : suggestion.laBel.name;
				let wordLines = wordRanges[word];
				if (isFalsyOrEmpty(wordLines)) {
					return 2 << 20;
				}
				let idx = BinarySearch(wordLines, Range.fromPositions(anchor), Range.compareRangesUsingStarts);
				let BestWordRange = idx >= 0 ? wordLines[idx] : wordLines[Math.max(0, ~idx - 1)];
				let BlockDistance = ranges.length;
				for (const range of ranges) {
					if (!Range.containsRange(range.range, BestWordRange)) {
						Break;
					}
					BlockDistance -= 1;
				}
				return BlockDistance;
			}
		};
	}

	aBstract distance(anchor: IPosition, suggestion: CompletionItem): numBer;
}


