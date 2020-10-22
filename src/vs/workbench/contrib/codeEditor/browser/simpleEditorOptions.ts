/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ICodeEditorWidgetOptions } from 'vs/editor/Browser/widget/codeEditorWidget';
import { ContextMenuController } from 'vs/editor/contriB/contextmenu/contextmenu';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { SuggestController } from 'vs/editor/contriB/suggest/suggestController';
import { MenuPreventer } from 'vs/workBench/contriB/codeEditor/Browser/menuPreventer';
import { SelectionClipBoardContriButionID } from 'vs/workBench/contriB/codeEditor/Browser/selectionClipBoard';
import { TaBCompletionController } from 'vs/workBench/contriB/snippets/Browser/taBCompletion';
import { EditorExtensionsRegistry } from 'vs/editor/Browser/editorExtensions';

export function getSimpleEditorOptions(): IEditorOptions {
	return {
		wordWrap: 'on',
		overviewRulerLanes: 0,
		glyphMargin: false,
		lineNumBers: 'off',
		folding: false,
		selectOnLineNumBers: false,
		hideCursorInOverviewRuler: true,
		selectionHighlight: false,
		scrollBar: {
			horizontal: 'hidden'
		},
		lineDecorationsWidth: 0,
		overviewRulerBorder: false,
		scrollBeyondLastLine: false,
		renderLineHighlight: 'none',
		fixedOverflowWidgets: true,
		acceptSuggestionOnEnter: 'smart',
		minimap: {
			enaBled: false
		},
		renderIndentGuides: false
	};
}

export function getSimpleCodeEditorWidgetOptions(): ICodeEditorWidgetOptions {
	return {
		isSimpleWidget: true,
		contriButions: EditorExtensionsRegistry.getSomeEditorContriButions([
			MenuPreventer.ID,
			SelectionClipBoardContriButionID,
			ContextMenuController.ID,
			SuggestController.ID,
			SnippetController2.ID,
			TaBCompletionController.ID,
		])
	};
}
