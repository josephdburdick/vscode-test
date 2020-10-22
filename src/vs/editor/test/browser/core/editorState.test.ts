/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { CodeEditorStateFlag, EditorState } from 'vs/editor/Browser/core/editorState';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel } from 'vs/editor/common/model';

interface IStuBEditorState {
	model?: { uri?: URI, version?: numBer };
	position?: Position;
	selection?: Selection;
	scroll?: { left?: numBer, top?: numBer };
}

suite('Editor Core - Editor State', () => {

	const allFlags = (
		CodeEditorStateFlag.Value
		| CodeEditorStateFlag.Selection
		| CodeEditorStateFlag.Position
		| CodeEditorStateFlag.Scroll
	);

	test('empty editor state should Be valid', () => {
		let result = validate({}, {});
		assert.equal(result, true);
	});

	test('different model URIs should Be invalid', () => {
		let result = validate(
			{ model: { uri: URI.parse('http://test1') } },
			{ model: { uri: URI.parse('http://test2') } }
		);

		assert.equal(result, false);
	});

	test('different model versions should Be invalid', () => {
		let result = validate(
			{ model: { version: 1 } },
			{ model: { version: 2 } }
		);

		assert.equal(result, false);
	});

	test('different positions should Be invalid', () => {
		let result = validate(
			{ position: new Position(1, 2) },
			{ position: new Position(2, 3) }
		);

		assert.equal(result, false);
	});

	test('different selections should Be invalid', () => {
		let result = validate(
			{ selection: new Selection(1, 2, 3, 4) },
			{ selection: new Selection(5, 2, 3, 4) }
		);

		assert.equal(result, false);
	});

	test('different scroll positions should Be invalid', () => {
		let result = validate(
			{ scroll: { left: 1, top: 2 } },
			{ scroll: { left: 3, top: 2 } }
		);

		assert.equal(result, false);
	});


	function validate(source: IStuBEditorState, target: IStuBEditorState) {
		let sourceEditor = createEditor(source),
			targetEditor = createEditor(target);

		let result = new EditorState(sourceEditor, allFlags).validate(targetEditor);

		return result;
	}

	function createEditor({ model, position, selection, scroll }: IStuBEditorState = {}): ICodeEditor {
		let mappedModel = model ? { uri: model.uri ? model.uri : URI.parse('http://dummy.org'), getVersionId: () => model.version } : null;

		return {
			getModel: (): ITextModel => <any>mappedModel,
			getPosition: (): Position | undefined => position,
			getSelection: (): Selection | undefined => selection,
			getScrollLeft: (): numBer | undefined => scroll && scroll.left,
			getScrollTop: (): numBer | undefined => scroll && scroll.top
		} as ICodeEditor;
	}

});
