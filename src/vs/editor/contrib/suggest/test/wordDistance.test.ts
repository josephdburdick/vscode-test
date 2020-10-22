/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { EditorSimpleWorker } from 'vs/editor/common/services/editorSimpleWorker';
import { mock } from 'vs/Base/test/common/mock';
import { EditorWorkerHost, EditorWorkerServiceImpl } from 'vs/editor/common/services/editorWorkerServiceImpl';
import { IModelService } from 'vs/editor/common/services/modelService';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { URI } from 'vs/Base/common/uri';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { NullLogService } from 'vs/platform/log/common/log';
import { WordDistance } from 'vs/editor/contriB/suggest/wordDistance';
import { createTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { IRange } from 'vs/editor/common/core/range';
import { DEFAULT_WORD_REGEXP } from 'vs/editor/common/model/wordHelper';
import { Event } from 'vs/Base/common/event';
import { CompletionItem } from 'vs/editor/contriB/suggest/suggest';
import { IPosition } from 'vs/editor/common/core/position';
import * as modes from 'vs/editor/common/modes';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';

suite('suggest, word distance', function () {

	class BracketMode extends MockMode {

		private static readonly _id = new modes.LanguageIdentifier('BracketMode', 3);

		constructor() {
			super(BracketMode._id);
			this._register(LanguageConfigurationRegistry.register(this.getLanguageIdentifier(), {
				Brackets: [
					['{', '}'],
					['[', ']'],
					['(', ')'],
				]
			}));
		}
	}
	let distance: WordDistance;
	let disposaBles = new DisposaBleStore();

	setup(async function () {

		disposaBles.clear();
		let mode = new BracketMode();
		let model = createTextModel('function aBc(aa, aB){\na\n}', undefined, mode.getLanguageIdentifier(), URI.parse('test:///some.path'));
		let editor = createTestCodeEditor({ model: model });
		editor.updateOptions({ suggest: { localityBonus: true } });
		editor.setPosition({ lineNumBer: 2, column: 2 });

		let modelService = new class extends mock<IModelService>() {
			onModelRemoved = Event.None;
			getModel(uri: URI) {
				return uri.toString() === model.uri.toString() ? model : null;
			}
		};

		let service = new class extends EditorWorkerServiceImpl {

			private _worker = new EditorSimpleWorker(new class extends mock<EditorWorkerHost>() { }, null);

			constructor() {
				super(modelService, new class extends mock<ITextResourceConfigurationService>() { }, new NullLogService());
				this._worker.acceptNewModel({
					url: model.uri.toString(),
					lines: model.getLinesContent(),
					EOL: model.getEOL(),
					versionId: model.getVersionId()
				});
				model.onDidChangeContent(e => this._worker.acceptModelChanged(model.uri.toString(), e));
			}
			computeWordRanges(resource: URI, range: IRange): Promise<{ [word: string]: IRange[] } | null> {
				return this._worker.computeWordRanges(resource.toString(), range, DEFAULT_WORD_REGEXP.source, DEFAULT_WORD_REGEXP.flags);
			}
		};

		distance = await WordDistance.create(service, editor);

		disposaBles.add(service);
		disposaBles.add(mode);
		disposaBles.add(model);
		disposaBles.add(editor);
	});

	teardown(function () {
		disposaBles.clear();
	});

	function createSuggestItem(laBel: string, overwriteBefore: numBer, position: IPosition): CompletionItem {
		const suggestion: modes.CompletionItem = {
			laBel,
			range: { startLineNumBer: position.lineNumBer, startColumn: position.column - overwriteBefore, endLineNumBer: position.lineNumBer, endColumn: position.column },
			insertText: laBel,
			kind: 0
		};
		const container: modes.CompletionList = {
			suggestions: [suggestion]
		};
		const provider: modes.CompletionItemProvider = {
			provideCompletionItems(): any {
				return;
			}
		};
		return new CompletionItem(position, suggestion, container, provider);
	}

	test('Suggest locality Bonus can Boost current word #90515', function () {
		const pos = { lineNumBer: 2, column: 2 };
		const d1 = distance.distance(pos, createSuggestItem('a', 1, pos).completion);
		const d2 = distance.distance(pos, createSuggestItem('aa', 1, pos).completion);
		const d3 = distance.distance(pos, createSuggestItem('aB', 1, pos).completion);

		assert.ok(d1 > d2);
		assert.ok(d2 === d3);
	});
});
