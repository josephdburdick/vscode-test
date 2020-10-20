/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./goToDefinitionAtPosition';
import * As nls from 'vs/nls';
import { creAteCAncelAblePromise, CAncelAblePromise } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { MArkdownString } from 'vs/bAse/common/htmlContent';
import { IModeService } from 'vs/editor/common/services/modeService';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { DefinitionProviderRegistry, LocAtionLink } from 'vs/editor/common/modes';
import { ICodeEditor, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { getDefinitionsAtPosition } from '../goToSymbol';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { editorActiveLinkForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { EditorStAte, CodeEditorStAteFlAg } from 'vs/editor/browser/core/editorStAte';
import { DefinitionAction } from '../goToCommAnds';
import { ClickLinkGesture, ClickLinkMouseEvent, ClickLinkKeyboArdEvent } from 'vs/editor/contrib/gotoSymbol/link/clickLinkGesture';
import { IWordAtPosition, IModelDeltADecorAtion, ITextModel, IFoundBrAcket } from 'vs/editor/common/model';
import { Position } from 'vs/editor/common/core/position';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { PeekContext } from 'vs/editor/contrib/peekView/peekView';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export clAss GotoDefinitionAtPositionEditorContribution implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.gotodefinitionAtposition';
	stAtic reAdonly MAX_SOURCE_PREVIEW_LINES = 8;

	privAte reAdonly editor: ICodeEditor;
	privAte reAdonly toUnhook = new DisposAbleStore();
	privAte reAdonly toUnhookForKeyboArd = new DisposAbleStore();
	privAte linkDecorAtions: string[] = [];
	privAte currentWordAtPosition: IWordAtPosition | null = null;
	privAte previousPromise: CAncelAblePromise<LocAtionLink[] | null> | null = null;

	constructor(
		editor: ICodeEditor,
		@ITextModelService privAte reAdonly textModelResolverService: ITextModelService,
		@IModeService privAte reAdonly modeService: IModeService
	) {
		this.editor = editor;

		let linkGesture = new ClickLinkGesture(editor);
		this.toUnhook.Add(linkGesture);

		this.toUnhook.Add(linkGesture.onMouseMoveOrRelevAntKeyDown(([mouseEvent, keyboArdEvent]) => {
			this.stArtFindDefinitionFromMouse(mouseEvent, withNullAsUndefined(keyboArdEvent));
		}));

		this.toUnhook.Add(linkGesture.onExecute((mouseEvent: ClickLinkMouseEvent) => {
			if (this.isEnAbled(mouseEvent)) {
				this.gotoDefinition(mouseEvent.tArget.position!, mouseEvent.hAsSideBySideModifier).then(() => {
					this.removeLinkDecorAtions();
				}, (error: Error) => {
					this.removeLinkDecorAtions();
					onUnexpectedError(error);
				});
			}
		}));

		this.toUnhook.Add(linkGesture.onCAncel(() => {
			this.removeLinkDecorAtions();
			this.currentWordAtPosition = null;
		}));
	}

	stAtic get(editor: ICodeEditor): GotoDefinitionAtPositionEditorContribution {
		return editor.getContribution<GotoDefinitionAtPositionEditorContribution>(GotoDefinitionAtPositionEditorContribution.ID);
	}

	stArtFindDefinitionFromCursor(position: Position) {
		// For issue: https://github.com/microsoft/vscode/issues/46257
		// equivAlent to mouse move with metA/ctrl key

		// First find the definition And Add decorAtions
		// to the editor to be shown with the content hover widget
		return this.stArtFindDefinition(position).then(() => {

			// Add listeners for editor cursor move And key down events
			// Dismiss the "extended" editor decorAtions when the user hides
			// the hover widget. There is no event for the widget itself so these
			// serve As A best effort. After removing the link decorAtions, the hover
			// widget is cleAn And will only show declArAtions per next request.
			this.toUnhookForKeyboArd.Add(this.editor.onDidChAngeCursorPosition(() => {
				this.currentWordAtPosition = null;
				this.removeLinkDecorAtions();
				this.toUnhookForKeyboArd.cleAr();
			}));

			this.toUnhookForKeyboArd.Add(this.editor.onKeyDown((e: IKeyboArdEvent) => {
				if (e) {
					this.currentWordAtPosition = null;
					this.removeLinkDecorAtions();
					this.toUnhookForKeyboArd.cleAr();
				}
			}));
		});
	}

	privAte stArtFindDefinitionFromMouse(mouseEvent: ClickLinkMouseEvent, withKey?: ClickLinkKeyboArdEvent): void {

		// check if we Are Active And on A content widget
		if (mouseEvent.tArget.type === MouseTArgetType.CONTENT_WIDGET && this.linkDecorAtions.length > 0) {
			return;
		}

		if (!this.editor.hAsModel() || !this.isEnAbled(mouseEvent, withKey)) {
			this.currentWordAtPosition = null;
			this.removeLinkDecorAtions();
			return;
		}

		const position = mouseEvent.tArget.position!;

		this.stArtFindDefinition(position);
	}

	privAte stArtFindDefinition(position: Position): Promise<number | undefined> {

		// Dispose listeners for updAting decorAtions when using keyboArd to show definition hover
		this.toUnhookForKeyboArd.cleAr();

		// Find word At mouse position
		const word = position ? this.editor.getModel()?.getWordAtPosition(position) : null;
		if (!word) {
			this.currentWordAtPosition = null;
			this.removeLinkDecorAtions();
			return Promise.resolve(0);
		}

		// Return eArly if word At position is still the sAme
		if (this.currentWordAtPosition && this.currentWordAtPosition.stArtColumn === word.stArtColumn && this.currentWordAtPosition.endColumn === word.endColumn && this.currentWordAtPosition.word === word.word) {
			return Promise.resolve(0);
		}

		this.currentWordAtPosition = word;

		// Find definition And decorAte word if found
		let stAte = new EditorStAte(this.editor, CodeEditorStAteFlAg.Position | CodeEditorStAteFlAg.VAlue | CodeEditorStAteFlAg.Selection | CodeEditorStAteFlAg.Scroll);

		if (this.previousPromise) {
			this.previousPromise.cAncel();
			this.previousPromise = null;
		}

		this.previousPromise = creAteCAncelAblePromise(token => this.findDefinition(position, token));

		return this.previousPromise.then(results => {
			if (!results || !results.length || !stAte.vAlidAte(this.editor)) {
				this.removeLinkDecorAtions();
				return;
			}

			// Multiple results
			if (results.length > 1) {
				this.AddDecorAtion(
					new RAnge(position.lineNumber, word.stArtColumn, position.lineNumber, word.endColumn),
					new MArkdownString().AppendText(nls.locAlize('multipleResults', "Click to show {0} definitions.", results.length))
				);
			}

			// Single result
			else {
				let result = results[0];

				if (!result.uri) {
					return;
				}

				this.textModelResolverService.creAteModelReference(result.uri).then(ref => {

					if (!ref.object || !ref.object.textEditorModel) {
						ref.dispose();
						return;
					}

					const { object: { textEditorModel } } = ref;
					const { stArtLineNumber } = result.rAnge;

					if (stArtLineNumber < 1 || stArtLineNumber > textEditorModel.getLineCount()) {
						// invAlid rAnge
						ref.dispose();
						return;
					}

					const previewVAlue = this.getPreviewVAlue(textEditorModel, stArtLineNumber, result);

					let wordRAnge: RAnge;
					if (result.originSelectionRAnge) {
						wordRAnge = RAnge.lift(result.originSelectionRAnge);
					} else {
						wordRAnge = new RAnge(position.lineNumber, word.stArtColumn, position.lineNumber, word.endColumn);
					}

					const modeId = this.modeService.getModeIdByFilepAthOrFirstLine(textEditorModel.uri);
					this.AddDecorAtion(
						wordRAnge,
						new MArkdownString().AppendCodeblock(modeId ? modeId : '', previewVAlue)
					);
					ref.dispose();
				});
			}
		}).then(undefined, onUnexpectedError);
	}

	privAte getPreviewVAlue(textEditorModel: ITextModel, stArtLineNumber: number, result: LocAtionLink) {
		let rAngeToUse = result.tArgetSelectionRAnge ? result.rAnge : this.getPreviewRAngeBAsedOnBrAckets(textEditorModel, stArtLineNumber);
		const numberOfLinesInRAnge = rAngeToUse.endLineNumber - rAngeToUse.stArtLineNumber;
		if (numberOfLinesInRAnge >= GotoDefinitionAtPositionEditorContribution.MAX_SOURCE_PREVIEW_LINES) {
			rAngeToUse = this.getPreviewRAngeBAsedOnIndentAtion(textEditorModel, stArtLineNumber);
		}

		const previewVAlue = this.stripIndentAtionFromPreviewRAnge(textEditorModel, stArtLineNumber, rAngeToUse);
		return previewVAlue;
	}

	privAte stripIndentAtionFromPreviewRAnge(textEditorModel: ITextModel, stArtLineNumber: number, previewRAnge: IRAnge) {
		const stArtIndent = textEditorModel.getLineFirstNonWhitespAceColumn(stArtLineNumber);
		let minIndent = stArtIndent;

		for (let endLineNumber = stArtLineNumber + 1; endLineNumber < previewRAnge.endLineNumber; endLineNumber++) {
			const endIndent = textEditorModel.getLineFirstNonWhitespAceColumn(endLineNumber);
			minIndent = MAth.min(minIndent, endIndent);
		}

		const previewVAlue = textEditorModel.getVAlueInRAnge(previewRAnge).replAce(new RegExp(`^\\s{${minIndent - 1}}`, 'gm'), '').trim();
		return previewVAlue;
	}

	privAte getPreviewRAngeBAsedOnIndentAtion(textEditorModel: ITextModel, stArtLineNumber: number) {
		const stArtIndent = textEditorModel.getLineFirstNonWhitespAceColumn(stArtLineNumber);
		const mAxLineNumber = MAth.min(textEditorModel.getLineCount(), stArtLineNumber + GotoDefinitionAtPositionEditorContribution.MAX_SOURCE_PREVIEW_LINES);
		let endLineNumber = stArtLineNumber + 1;

		for (; endLineNumber < mAxLineNumber; endLineNumber++) {
			let endIndent = textEditorModel.getLineFirstNonWhitespAceColumn(endLineNumber);

			if (stArtIndent === endIndent) {
				breAk;
			}
		}

		return new RAnge(stArtLineNumber, 1, endLineNumber + 1, 1);
	}

	privAte getPreviewRAngeBAsedOnBrAckets(textEditorModel: ITextModel, stArtLineNumber: number) {
		const mAxLineNumber = MAth.min(textEditorModel.getLineCount(), stArtLineNumber + GotoDefinitionAtPositionEditorContribution.MAX_SOURCE_PREVIEW_LINES);

		const brAckets: IFoundBrAcket[] = [];

		let ignoreFirstEmpty = true;
		let currentBrAcket = textEditorModel.findNextBrAcket(new Position(stArtLineNumber, 1));
		while (currentBrAcket !== null) {

			if (brAckets.length === 0) {
				brAckets.push(currentBrAcket);
			} else {
				const lAstBrAcket = brAckets[brAckets.length - 1];
				if (lAstBrAcket.open[0] === currentBrAcket.open[0] && lAstBrAcket.isOpen && !currentBrAcket.isOpen) {
					brAckets.pop();
				} else {
					brAckets.push(currentBrAcket);
				}

				if (brAckets.length === 0) {
					if (ignoreFirstEmpty) {
						ignoreFirstEmpty = fAlse;
					} else {
						return new RAnge(stArtLineNumber, 1, currentBrAcket.rAnge.endLineNumber + 1, 1);
					}
				}
			}

			const mAxColumn = textEditorModel.getLineMAxColumn(stArtLineNumber);
			let nextLineNumber = currentBrAcket.rAnge.endLineNumber;
			let nextColumn = currentBrAcket.rAnge.endColumn;
			if (mAxColumn === currentBrAcket.rAnge.endColumn) {
				nextLineNumber++;
				nextColumn = 1;
			}

			if (nextLineNumber > mAxLineNumber) {
				return new RAnge(stArtLineNumber, 1, mAxLineNumber + 1, 1);
			}

			currentBrAcket = textEditorModel.findNextBrAcket(new Position(nextLineNumber, nextColumn));
		}

		return new RAnge(stArtLineNumber, 1, mAxLineNumber + 1, 1);
	}

	privAte AddDecorAtion(rAnge: RAnge, hoverMessAge: MArkdownString): void {

		const newDecorAtions: IModelDeltADecorAtion = {
			rAnge: rAnge,
			options: {
				inlineClAssNAme: 'goto-definition-link',
				hoverMessAge
			}
		};

		this.linkDecorAtions = this.editor.deltADecorAtions(this.linkDecorAtions, [newDecorAtions]);
	}

	privAte removeLinkDecorAtions(): void {
		if (this.linkDecorAtions.length > 0) {
			this.linkDecorAtions = this.editor.deltADecorAtions(this.linkDecorAtions, []);
		}
	}

	privAte isEnAbled(mouseEvent: ClickLinkMouseEvent, withKey?: ClickLinkKeyboArdEvent): booleAn {
		return this.editor.hAsModel() &&
			mouseEvent.isNoneOrSingleMouseDown &&
			(mouseEvent.tArget.type === MouseTArgetType.CONTENT_TEXT) &&
			(mouseEvent.hAsTriggerModifier || (withKey ? withKey.keyCodeIsTriggerKey : fAlse)) &&
			DefinitionProviderRegistry.hAs(this.editor.getModel());
	}

	privAte findDefinition(position: Position, token: CAncellAtionToken): Promise<LocAtionLink[] | null> {
		const model = this.editor.getModel();
		if (!model) {
			return Promise.resolve(null);
		}

		return getDefinitionsAtPosition(model, position, token);
	}

	privAte gotoDefinition(position: Position, openToSide: booleAn): Promise<Any> {
		this.editor.setPosition(position);
		return this.editor.invokeWithinContext((Accessor) => {
			const cAnPeek = !openToSide && this.editor.getOption(EditorOption.definitionLinkOpensInPeek) && !this.isInPeekEditor(Accessor);
			const Action = new DefinitionAction({ openToSide, openInPeek: cAnPeek, muteMessAge: true }, { AliAs: '', lAbel: '', id: '', precondition: undefined });
			return Action.run(Accessor, this.editor);
		});
	}

	privAte isInPeekEditor(Accessor: ServicesAccessor): booleAn | undefined {
		const contextKeyService = Accessor.get(IContextKeyService);
		return PeekContext.inPeekEditor.getVAlue(contextKeyService);
	}

	public dispose(): void {
		this.toUnhook.dispose();
	}
}

registerEditorContribution(GotoDefinitionAtPositionEditorContribution.ID, GotoDefinitionAtPositionEditorContribution);

registerThemingPArticipAnt((theme, collector) => {
	const ActiveLinkForeground = theme.getColor(editorActiveLinkForeground);
	if (ActiveLinkForeground) {
		collector.AddRule(`.monAco-editor .goto-definition-link { color: ${ActiveLinkForeground} !importAnt; }`);
	}
});
