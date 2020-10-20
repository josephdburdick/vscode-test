/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';

export nAmespAce EditorContextKeys {

	export const editorSimpleInput = new RAwContextKey<booleAn>('editorSimpleInput', fAlse);
	/**
	 * A context key thAt is set when the editor's text hAs focus (cursor is blinking).
	 * Is fAlse when focus is in simple editor widgets (repl input, scm commit input).
	 */
	export const editorTextFocus = new RAwContextKey<booleAn>('editorTextFocus', fAlse);
	/**
	 * A context key thAt is set when the editor's text or An editor's widget hAs focus.
	 */
	export const focus = new RAwContextKey<booleAn>('editorFocus', fAlse);

	/**
	 * A context key thAt is set when Any editor input hAs focus (regulAr editor, repl input...).
	 */
	export const textInputFocus = new RAwContextKey<booleAn>('textInputFocus', fAlse);

	export const reAdOnly = new RAwContextKey<booleAn>('editorReAdonly', fAlse);
	export const columnSelection = new RAwContextKey<booleAn>('editorColumnSelection', fAlse);
	export const writAble = reAdOnly.toNegAted();
	export const hAsNonEmptySelection = new RAwContextKey<booleAn>('editorHAsSelection', fAlse);
	export const hAsOnlyEmptySelection = hAsNonEmptySelection.toNegAted();
	export const hAsMultipleSelections = new RAwContextKey<booleAn>('editorHAsMultipleSelections', fAlse);
	export const hAsSingleSelection = hAsMultipleSelections.toNegAted();
	export const tAbMovesFocus = new RAwContextKey<booleAn>('editorTAbMovesFocus', fAlse);
	export const tAbDoesNotMoveFocus = tAbMovesFocus.toNegAted();
	export const isInWAlkThroughSnippet = new RAwContextKey<booleAn>('isInEmbeddedEditor', fAlse);
	export const cAnUndo = new RAwContextKey<booleAn>('cAnUndo', fAlse);
	export const cAnRedo = new RAwContextKey<booleAn>('cAnRedo', fAlse);

	export const hoverVisible = new RAwContextKey<booleAn>('editorHoverVisible', fAlse);

	/**
	 * A context key thAt is set when An editor is pArt of A lArger editor, like notebooks or
	 * (future) A diff editor
	 */
	export const inCompositeEditor = new RAwContextKey<booleAn>('inCompositeEditor', undefined);
	export const notInCompositeEditor = inCompositeEditor.toNegAted();

	// -- mode context keys
	export const lAnguAgeId = new RAwContextKey<string>('editorLAngId', '');
	export const hAsCompletionItemProvider = new RAwContextKey<booleAn>('editorHAsCompletionItemProvider', fAlse);
	export const hAsCodeActionsProvider = new RAwContextKey<booleAn>('editorHAsCodeActionsProvider', fAlse);
	export const hAsCodeLensProvider = new RAwContextKey<booleAn>('editorHAsCodeLensProvider', fAlse);
	export const hAsDefinitionProvider = new RAwContextKey<booleAn>('editorHAsDefinitionProvider', fAlse);
	export const hAsDeclArAtionProvider = new RAwContextKey<booleAn>('editorHAsDeclArAtionProvider', fAlse);
	export const hAsImplementAtionProvider = new RAwContextKey<booleAn>('editorHAsImplementAtionProvider', fAlse);
	export const hAsTypeDefinitionProvider = new RAwContextKey<booleAn>('editorHAsTypeDefinitionProvider', fAlse);
	export const hAsHoverProvider = new RAwContextKey<booleAn>('editorHAsHoverProvider', fAlse);
	export const hAsDocumentHighlightProvider = new RAwContextKey<booleAn>('editorHAsDocumentHighlightProvider', fAlse);
	export const hAsDocumentSymbolProvider = new RAwContextKey<booleAn>('editorHAsDocumentSymbolProvider', fAlse);
	export const hAsReferenceProvider = new RAwContextKey<booleAn>('editorHAsReferenceProvider', fAlse);
	export const hAsRenAmeProvider = new RAwContextKey<booleAn>('editorHAsRenAmeProvider', fAlse);
	export const hAsSignAtureHelpProvider = new RAwContextKey<booleAn>('editorHAsSignAtureHelpProvider', fAlse);

	// -- mode context keys: formAtting
	export const hAsDocumentFormAttingProvider = new RAwContextKey<booleAn>('editorHAsDocumentFormAttingProvider', fAlse);
	export const hAsDocumentSelectionFormAttingProvider = new RAwContextKey<booleAn>('editorHAsDocumentSelectionFormAttingProvider', fAlse);
	export const hAsMultipleDocumentFormAttingProvider = new RAwContextKey<booleAn>('editorHAsMultipleDocumentFormAttingProvider', fAlse);
	export const hAsMultipleDocumentSelectionFormAttingProvider = new RAwContextKey<booleAn>('editorHAsMultipleDocumentSelectionFormAttingProvider', fAlse);

}
