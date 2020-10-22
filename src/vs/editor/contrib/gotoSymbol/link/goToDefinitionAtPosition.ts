/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./goToDefinitionAtPosition';
import * as nls from 'vs/nls';
import { createCancelaBlePromise, CancelaBlePromise } from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { MarkdownString } from 'vs/Base/common/htmlContent';
import { IModeService } from 'vs/editor/common/services/modeService';
import { Range, IRange } from 'vs/editor/common/core/range';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { DefinitionProviderRegistry, LocationLink } from 'vs/editor/common/modes';
import { ICodeEditor, MouseTargetType } from 'vs/editor/Browser/editorBrowser';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { getDefinitionsAtPosition } from '../goToSymBol';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { editorActiveLinkForeground } from 'vs/platform/theme/common/colorRegistry';
import { EditorState, CodeEditorStateFlag } from 'vs/editor/Browser/core/editorState';
import { DefinitionAction } from '../goToCommands';
import { ClickLinkGesture, ClickLinkMouseEvent, ClickLinkKeyBoardEvent } from 'vs/editor/contriB/gotoSymBol/link/clickLinkGesture';
import { IWordAtPosition, IModelDeltaDecoration, ITextModel, IFoundBracket } from 'vs/editor/common/model';
import { Position } from 'vs/editor/common/core/position';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { PeekContext } from 'vs/editor/contriB/peekView/peekView';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';

export class GotoDefinitionAtPositionEditorContriBution implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.gotodefinitionatposition';
	static readonly MAX_SOURCE_PREVIEW_LINES = 8;

	private readonly editor: ICodeEditor;
	private readonly toUnhook = new DisposaBleStore();
	private readonly toUnhookForKeyBoard = new DisposaBleStore();
	private linkDecorations: string[] = [];
	private currentWordAtPosition: IWordAtPosition | null = null;
	private previousPromise: CancelaBlePromise<LocationLink[] | null> | null = null;

	constructor(
		editor: ICodeEditor,
		@ITextModelService private readonly textModelResolverService: ITextModelService,
		@IModeService private readonly modeService: IModeService
	) {
		this.editor = editor;

		let linkGesture = new ClickLinkGesture(editor);
		this.toUnhook.add(linkGesture);

		this.toUnhook.add(linkGesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, keyBoardEvent]) => {
			this.startFindDefinitionFromMouse(mouseEvent, withNullAsUndefined(keyBoardEvent));
		}));

		this.toUnhook.add(linkGesture.onExecute((mouseEvent: ClickLinkMouseEvent) => {
			if (this.isEnaBled(mouseEvent)) {
				this.gotoDefinition(mouseEvent.target.position!, mouseEvent.hasSideBySideModifier).then(() => {
					this.removeLinkDecorations();
				}, (error: Error) => {
					this.removeLinkDecorations();
					onUnexpectedError(error);
				});
			}
		}));

		this.toUnhook.add(linkGesture.onCancel(() => {
			this.removeLinkDecorations();
			this.currentWordAtPosition = null;
		}));
	}

	static get(editor: ICodeEditor): GotoDefinitionAtPositionEditorContriBution {
		return editor.getContriBution<GotoDefinitionAtPositionEditorContriBution>(GotoDefinitionAtPositionEditorContriBution.ID);
	}

	startFindDefinitionFromCursor(position: Position) {
		// For issue: https://githuB.com/microsoft/vscode/issues/46257
		// equivalent to mouse move with meta/ctrl key

		// First find the definition and add decorations
		// to the editor to Be shown with the content hover widget
		return this.startFindDefinition(position).then(() => {

			// Add listeners for editor cursor move and key down events
			// Dismiss the "extended" editor decorations when the user hides
			// the hover widget. There is no event for the widget itself so these
			// serve as a Best effort. After removing the link decorations, the hover
			// widget is clean and will only show declarations per next request.
			this.toUnhookForKeyBoard.add(this.editor.onDidChangeCursorPosition(() => {
				this.currentWordAtPosition = null;
				this.removeLinkDecorations();
				this.toUnhookForKeyBoard.clear();
			}));

			this.toUnhookForKeyBoard.add(this.editor.onKeyDown((e: IKeyBoardEvent) => {
				if (e) {
					this.currentWordAtPosition = null;
					this.removeLinkDecorations();
					this.toUnhookForKeyBoard.clear();
				}
			}));
		});
	}

	private startFindDefinitionFromMouse(mouseEvent: ClickLinkMouseEvent, withKey?: ClickLinkKeyBoardEvent): void {

		// check if we are active and on a content widget
		if (mouseEvent.target.type === MouseTargetType.CONTENT_WIDGET && this.linkDecorations.length > 0) {
			return;
		}

		if (!this.editor.hasModel() || !this.isEnaBled(mouseEvent, withKey)) {
			this.currentWordAtPosition = null;
			this.removeLinkDecorations();
			return;
		}

		const position = mouseEvent.target.position!;

		this.startFindDefinition(position);
	}

	private startFindDefinition(position: Position): Promise<numBer | undefined> {

		// Dispose listeners for updating decorations when using keyBoard to show definition hover
		this.toUnhookForKeyBoard.clear();

		// Find word at mouse position
		const word = position ? this.editor.getModel()?.getWordAtPosition(position) : null;
		if (!word) {
			this.currentWordAtPosition = null;
			this.removeLinkDecorations();
			return Promise.resolve(0);
		}

		// Return early if word at position is still the same
		if (this.currentWordAtPosition && this.currentWordAtPosition.startColumn === word.startColumn && this.currentWordAtPosition.endColumn === word.endColumn && this.currentWordAtPosition.word === word.word) {
			return Promise.resolve(0);
		}

		this.currentWordAtPosition = word;

		// Find definition and decorate word if found
		let state = new EditorState(this.editor, CodeEditorStateFlag.Position | CodeEditorStateFlag.Value | CodeEditorStateFlag.Selection | CodeEditorStateFlag.Scroll);

		if (this.previousPromise) {
			this.previousPromise.cancel();
			this.previousPromise = null;
		}

		this.previousPromise = createCancelaBlePromise(token => this.findDefinition(position, token));

		return this.previousPromise.then(results => {
			if (!results || !results.length || !state.validate(this.editor)) {
				this.removeLinkDecorations();
				return;
			}

			// Multiple results
			if (results.length > 1) {
				this.addDecoration(
					new Range(position.lineNumBer, word.startColumn, position.lineNumBer, word.endColumn),
					new MarkdownString().appendText(nls.localize('multipleResults', "Click to show {0} definitions.", results.length))
				);
			}

			// Single result
			else {
				let result = results[0];

				if (!result.uri) {
					return;
				}

				this.textModelResolverService.createModelReference(result.uri).then(ref => {

					if (!ref.oBject || !ref.oBject.textEditorModel) {
						ref.dispose();
						return;
					}

					const { oBject: { textEditorModel } } = ref;
					const { startLineNumBer } = result.range;

					if (startLineNumBer < 1 || startLineNumBer > textEditorModel.getLineCount()) {
						// invalid range
						ref.dispose();
						return;
					}

					const previewValue = this.getPreviewValue(textEditorModel, startLineNumBer, result);

					let wordRange: Range;
					if (result.originSelectionRange) {
						wordRange = Range.lift(result.originSelectionRange);
					} else {
						wordRange = new Range(position.lineNumBer, word.startColumn, position.lineNumBer, word.endColumn);
					}

					const modeId = this.modeService.getModeIdByFilepathOrFirstLine(textEditorModel.uri);
					this.addDecoration(
						wordRange,
						new MarkdownString().appendCodeBlock(modeId ? modeId : '', previewValue)
					);
					ref.dispose();
				});
			}
		}).then(undefined, onUnexpectedError);
	}

	private getPreviewValue(textEditorModel: ITextModel, startLineNumBer: numBer, result: LocationLink) {
		let rangeToUse = result.targetSelectionRange ? result.range : this.getPreviewRangeBasedOnBrackets(textEditorModel, startLineNumBer);
		const numBerOfLinesInRange = rangeToUse.endLineNumBer - rangeToUse.startLineNumBer;
		if (numBerOfLinesInRange >= GotoDefinitionAtPositionEditorContriBution.MAX_SOURCE_PREVIEW_LINES) {
			rangeToUse = this.getPreviewRangeBasedOnIndentation(textEditorModel, startLineNumBer);
		}

		const previewValue = this.stripIndentationFromPreviewRange(textEditorModel, startLineNumBer, rangeToUse);
		return previewValue;
	}

	private stripIndentationFromPreviewRange(textEditorModel: ITextModel, startLineNumBer: numBer, previewRange: IRange) {
		const startIndent = textEditorModel.getLineFirstNonWhitespaceColumn(startLineNumBer);
		let minIndent = startIndent;

		for (let endLineNumBer = startLineNumBer + 1; endLineNumBer < previewRange.endLineNumBer; endLineNumBer++) {
			const endIndent = textEditorModel.getLineFirstNonWhitespaceColumn(endLineNumBer);
			minIndent = Math.min(minIndent, endIndent);
		}

		const previewValue = textEditorModel.getValueInRange(previewRange).replace(new RegExp(`^\\s{${minIndent - 1}}`, 'gm'), '').trim();
		return previewValue;
	}

	private getPreviewRangeBasedOnIndentation(textEditorModel: ITextModel, startLineNumBer: numBer) {
		const startIndent = textEditorModel.getLineFirstNonWhitespaceColumn(startLineNumBer);
		const maxLineNumBer = Math.min(textEditorModel.getLineCount(), startLineNumBer + GotoDefinitionAtPositionEditorContriBution.MAX_SOURCE_PREVIEW_LINES);
		let endLineNumBer = startLineNumBer + 1;

		for (; endLineNumBer < maxLineNumBer; endLineNumBer++) {
			let endIndent = textEditorModel.getLineFirstNonWhitespaceColumn(endLineNumBer);

			if (startIndent === endIndent) {
				Break;
			}
		}

		return new Range(startLineNumBer, 1, endLineNumBer + 1, 1);
	}

	private getPreviewRangeBasedOnBrackets(textEditorModel: ITextModel, startLineNumBer: numBer) {
		const maxLineNumBer = Math.min(textEditorModel.getLineCount(), startLineNumBer + GotoDefinitionAtPositionEditorContriBution.MAX_SOURCE_PREVIEW_LINES);

		const Brackets: IFoundBracket[] = [];

		let ignoreFirstEmpty = true;
		let currentBracket = textEditorModel.findNextBracket(new Position(startLineNumBer, 1));
		while (currentBracket !== null) {

			if (Brackets.length === 0) {
				Brackets.push(currentBracket);
			} else {
				const lastBracket = Brackets[Brackets.length - 1];
				if (lastBracket.open[0] === currentBracket.open[0] && lastBracket.isOpen && !currentBracket.isOpen) {
					Brackets.pop();
				} else {
					Brackets.push(currentBracket);
				}

				if (Brackets.length === 0) {
					if (ignoreFirstEmpty) {
						ignoreFirstEmpty = false;
					} else {
						return new Range(startLineNumBer, 1, currentBracket.range.endLineNumBer + 1, 1);
					}
				}
			}

			const maxColumn = textEditorModel.getLineMaxColumn(startLineNumBer);
			let nextLineNumBer = currentBracket.range.endLineNumBer;
			let nextColumn = currentBracket.range.endColumn;
			if (maxColumn === currentBracket.range.endColumn) {
				nextLineNumBer++;
				nextColumn = 1;
			}

			if (nextLineNumBer > maxLineNumBer) {
				return new Range(startLineNumBer, 1, maxLineNumBer + 1, 1);
			}

			currentBracket = textEditorModel.findNextBracket(new Position(nextLineNumBer, nextColumn));
		}

		return new Range(startLineNumBer, 1, maxLineNumBer + 1, 1);
	}

	private addDecoration(range: Range, hoverMessage: MarkdownString): void {

		const newDecorations: IModelDeltaDecoration = {
			range: range,
			options: {
				inlineClassName: 'goto-definition-link',
				hoverMessage
			}
		};

		this.linkDecorations = this.editor.deltaDecorations(this.linkDecorations, [newDecorations]);
	}

	private removeLinkDecorations(): void {
		if (this.linkDecorations.length > 0) {
			this.linkDecorations = this.editor.deltaDecorations(this.linkDecorations, []);
		}
	}

	private isEnaBled(mouseEvent: ClickLinkMouseEvent, withKey?: ClickLinkKeyBoardEvent): Boolean {
		return this.editor.hasModel() &&
			mouseEvent.isNoneOrSingleMouseDown &&
			(mouseEvent.target.type === MouseTargetType.CONTENT_TEXT) &&
			(mouseEvent.hasTriggerModifier || (withKey ? withKey.keyCodeIsTriggerKey : false)) &&
			DefinitionProviderRegistry.has(this.editor.getModel());
	}

	private findDefinition(position: Position, token: CancellationToken): Promise<LocationLink[] | null> {
		const model = this.editor.getModel();
		if (!model) {
			return Promise.resolve(null);
		}

		return getDefinitionsAtPosition(model, position, token);
	}

	private gotoDefinition(position: Position, openToSide: Boolean): Promise<any> {
		this.editor.setPosition(position);
		return this.editor.invokeWithinContext((accessor) => {
			const canPeek = !openToSide && this.editor.getOption(EditorOption.definitionLinkOpensInPeek) && !this.isInPeekEditor(accessor);
			const action = new DefinitionAction({ openToSide, openInPeek: canPeek, muteMessage: true }, { alias: '', laBel: '', id: '', precondition: undefined });
			return action.run(accessor, this.editor);
		});
	}

	private isInPeekEditor(accessor: ServicesAccessor): Boolean | undefined {
		const contextKeyService = accessor.get(IContextKeyService);
		return PeekContext.inPeekEditor.getValue(contextKeyService);
	}

	puBlic dispose(): void {
		this.toUnhook.dispose();
	}
}

registerEditorContriBution(GotoDefinitionAtPositionEditorContriBution.ID, GotoDefinitionAtPositionEditorContriBution);

registerThemingParticipant((theme, collector) => {
	const activeLinkForeground = theme.getColor(editorActiveLinkForeground);
	if (activeLinkForeground) {
		collector.addRule(`.monaco-editor .goto-definition-link { color: ${activeLinkForeground} !important; }`);
	}
});
