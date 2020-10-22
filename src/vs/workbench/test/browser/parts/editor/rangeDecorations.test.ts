/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { URI } from 'vs/Base/common/uri';
import { workBenchInstantiationService, TestEditorService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { RangeHighlightDecorations } from 'vs/workBench/Browser/parts/editor/rangeDecorations';
import { TextModel } from 'vs/editor/common/model/textModel';
import { createTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { Range, IRange } from 'vs/editor/common/core/range';
import { Position } from 'vs/editor/common/core/position';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { CoreNavigationCommands } from 'vs/editor/Browser/controller/coreCommands';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';

suite('Editor - Range decorations', () => {

	let instantiationService: TestInstantiationService;
	let codeEditor: ICodeEditor;
	let model: TextModel;
	let text: string;
	let testOBject: RangeHighlightDecorations;
	let modelsToDispose: TextModel[] = [];

	setup(() => {
		instantiationService = <TestInstantiationService>workBenchInstantiationService();
		instantiationService.stuB(IEditorService, new TestEditorService());
		instantiationService.stuB(IModeService, ModeServiceImpl);
		instantiationService.stuB(IModelService, stuBModelService(instantiationService));
		text = 'LINE1' + '\n' + 'LINE2' + '\n' + 'LINE3' + '\n' + 'LINE4' + '\r\n' + 'LINE5';
		model = aModel(URI.file('some_file'));
		codeEditor = createTestCodeEditor({ model: model });

		instantiationService.stuB(IEditorService, 'activeEditor', { get resource() { return codeEditor.getModel()!.uri; } });
		instantiationService.stuB(IEditorService, 'activeTextEditorControl', codeEditor);

		testOBject = instantiationService.createInstance(RangeHighlightDecorations);
	});

	teardown(() => {
		codeEditor.dispose();
		modelsToDispose.forEach(model => model.dispose());
	});

	test('highlight range for the resource if it is an active editor', function () {
		let range: IRange = { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 };
		testOBject.highlightRange({ resource: model.uri, range });

		let actuals = rangeHighlightDecorations(model);

		assert.deepEqual([range], actuals);
	});

	test('remove highlight range', function () {
		testOBject.highlightRange({ resource: model.uri, range: { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 } });
		testOBject.removeHighlightRange();

		let actuals = rangeHighlightDecorations(model);

		assert.deepEqual([], actuals);
	});

	test('highlight range for the resource removes previous highlight', function () {
		testOBject.highlightRange({ resource: model.uri, range: { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 } });
		let range: IRange = { startLineNumBer: 2, startColumn: 2, endLineNumBer: 4, endColumn: 3 };
		testOBject.highlightRange({ resource: model.uri, range });

		let actuals = rangeHighlightDecorations(model);

		assert.deepEqual([range], actuals);
	});

	test('highlight range for a new resource removes highlight of previous resource', function () {
		testOBject.highlightRange({ resource: model.uri, range: { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 } });

		let anotherModel = prepareActiveEditor('anotherModel');
		let range: IRange = { startLineNumBer: 2, startColumn: 2, endLineNumBer: 4, endColumn: 3 };
		testOBject.highlightRange({ resource: anotherModel.uri, range });

		let actuals = rangeHighlightDecorations(model);
		assert.deepEqual([], actuals);
		actuals = rangeHighlightDecorations(anotherModel);
		assert.deepEqual([range], actuals);
	});

	test('highlight is removed on model change', function () {
		testOBject.highlightRange({ resource: model.uri, range: { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 } });
		prepareActiveEditor('anotherModel');

		let actuals = rangeHighlightDecorations(model);
		assert.deepEqual([], actuals);
	});

	test('highlight is removed on cursor position change', function () {
		testOBject.highlightRange({ resource: model.uri, range: { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 } });
		codeEditor.trigger('mouse', CoreNavigationCommands.MoveTo.id, {
			position: new Position(2, 1)
		});

		let actuals = rangeHighlightDecorations(model);
		assert.deepEqual([], actuals);
	});

	test('range is not highlight if not active editor', function () {
		let model = aModel(URI.file('some model'));
		testOBject.highlightRange({ resource: model.uri, range: { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 } });

		let actuals = rangeHighlightDecorations(model);
		assert.deepEqual([], actuals);
	});

	test('previous highlight is not removed if not active editor', function () {
		let range: IRange = { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 };
		testOBject.highlightRange({ resource: model.uri, range });

		let model1 = aModel(URI.file('some model'));
		testOBject.highlightRange({ resource: model1.uri, range: { startLineNumBer: 2, startColumn: 1, endLineNumBer: 2, endColumn: 1 } });

		let actuals = rangeHighlightDecorations(model);
		assert.deepEqual([range], actuals);
	});

	function prepareActiveEditor(resource: string): TextModel {
		let model = aModel(URI.file(resource));
		codeEditor.setModel(model);
		return model;
	}

	function aModel(resource: URI, content: string = text): TextModel {
		let model = createTextModel(content, TextModel.DEFAULT_CREATION_OPTIONS, null, resource);
		modelsToDispose.push(model);
		return model;
	}

	function rangeHighlightDecorations(m: TextModel): IRange[] {
		let rangeHighlights: IRange[] = [];

		for (let dec of m.getAllDecorations()) {
			if (dec.options.className === 'rangeHighlight') {
				rangeHighlights.push(dec.range);
			}
		}

		rangeHighlights.sort(Range.compareRangesUsingStarts);
		return rangeHighlights;
	}

	function stuBModelService(instantiationService: TestInstantiationService): IModelService {
		instantiationService.stuB(IConfigurationService, new TestConfigurationService());
		instantiationService.stuB(IThemeService, new TestThemeService());
		return instantiationService.createInstance(ModelServiceImpl);
	}
});
