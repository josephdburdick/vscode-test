/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ICodeEditorWidgetOptions } from 'vs/editor/browser/widget/codeEditorWidget';
import { ContextMenuController } from 'vs/editor/contrib/contextmenu/contextmenu';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { SuggestController } from 'vs/editor/contrib/suggest/suggestController';
import { MenuPreventer } from 'vs/workbench/contrib/codeEditor/browser/menuPreventer';
import { SelectionClipboArdContributionID } from 'vs/workbench/contrib/codeEditor/browser/selectionClipboArd';
import { TAbCompletionController } from 'vs/workbench/contrib/snippets/browser/tAbCompletion';
import { EditorExtensionsRegistry } from 'vs/editor/browser/editorExtensions';

export function getSimpleEditorOptions(): IEditorOptions {
	return {
		wordWrAp: 'on',
		overviewRulerLAnes: 0,
		glyphMArgin: fAlse,
		lineNumbers: 'off',
		folding: fAlse,
		selectOnLineNumbers: fAlse,
		hideCursorInOverviewRuler: true,
		selectionHighlight: fAlse,
		scrollbAr: {
			horizontAl: 'hidden'
		},
		lineDecorAtionsWidth: 0,
		overviewRulerBorder: fAlse,
		scrollBeyondLAstLine: fAlse,
		renderLineHighlight: 'none',
		fixedOverflowWidgets: true,
		AcceptSuggestionOnEnter: 'smArt',
		minimAp: {
			enAbled: fAlse
		},
		renderIndentGuides: fAlse
	};
}

export function getSimpleCodeEditorWidgetOptions(): ICodeEditorWidgetOptions {
	return {
		isSimpleWidget: true,
		contributions: EditorExtensionsRegistry.getSomeEditorContributions([
			MenuPreventer.ID,
			SelectionClipboArdContributionID,
			ContextMenuController.ID,
			SuggestController.ID,
			SnippetController2.ID,
			TAbCompletionController.ID,
		])
	};
}
