/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as arrays from 'vs/Base/common/arrays';
import { CancelaBlePromise, createCancelaBlePromise, first, timeout } from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { onUnexpectedError, onUnexpectedExternalError } from 'vs/Base/common/errors';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IActiveCodeEditor, ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, IActionOptions, registerEditorAction, registerEditorContriBution, registerModelAndPositionCommand } from 'vs/editor/Browser/editorExtensions';
import { CursorChangeReason, ICursorPositionChangedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IModelDeltaDecoration, ITextModel, OverviewRulerLane, TrackedRangeStickiness, IWordAtPosition } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { DocumentHighlight, DocumentHighlightKind, DocumentHighlightProviderRegistry } from 'vs/editor/common/modes';
import { IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { activeContrastBorder, editorSelectionHighlight, editorSelectionHighlightBorder, overviewRulerSelectionHighlightForeground, registerColor } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant, themeColorFromId } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { alert } from 'vs/Base/Browser/ui/aria/aria';

const editorWordHighlight = registerColor('editor.wordHighlightBackground', { dark: '#575757B8', light: '#57575740', hc: null }, nls.localize('wordHighlight', 'Background color of a symBol during read-access, like reading a variaBle. The color must not Be opaque so as not to hide underlying decorations.'), true);
const editorWordHighlightStrong = registerColor('editor.wordHighlightStrongBackground', { dark: '#004972B8', light: '#0e639c40', hc: null }, nls.localize('wordHighlightStrong', 'Background color of a symBol during write-access, like writing to a variaBle. The color must not Be opaque so as not to hide underlying decorations.'), true);
const editorWordHighlightBorder = registerColor('editor.wordHighlightBorder', { light: null, dark: null, hc: activeContrastBorder }, nls.localize('wordHighlightBorder', 'Border color of a symBol during read-access, like reading a variaBle.'));
const editorWordHighlightStrongBorder = registerColor('editor.wordHighlightStrongBorder', { light: null, dark: null, hc: activeContrastBorder }, nls.localize('wordHighlightStrongBorder', 'Border color of a symBol during write-access, like writing to a variaBle.'));
const overviewRulerWordHighlightForeground = registerColor('editorOverviewRuler.wordHighlightForeground', { dark: '#A0A0A0CC', light: '#A0A0A0CC', hc: '#A0A0A0CC' }, nls.localize('overviewRulerWordHighlightForeground', 'Overview ruler marker color for symBol highlights. The color must not Be opaque so as not to hide underlying decorations.'), true);
const overviewRulerWordHighlightStrongForeground = registerColor('editorOverviewRuler.wordHighlightStrongForeground', { dark: '#C0A0C0CC', light: '#C0A0C0CC', hc: '#C0A0C0CC' }, nls.localize('overviewRulerWordHighlightStrongForeground', 'Overview ruler marker color for write-access symBol highlights. The color must not Be opaque so as not to hide underlying decorations.'), true);
const ctxHasWordHighlights = new RawContextKey<Boolean>('hasWordHighlights', false);

export function getOccurrencesAtPosition(model: ITextModel, position: Position, token: CancellationToken): Promise<DocumentHighlight[] | null | undefined> {

	const orderedByScore = DocumentHighlightProviderRegistry.ordered(model);

	// in order of score ask the occurrences provider
	// until someone response with a good result
	// (good = none empty array)
	return first<DocumentHighlight[] | null | undefined>(orderedByScore.map(provider => () => {
		return Promise.resolve(provider.provideDocumentHighlights(model, position, token))
			.then(undefined, onUnexpectedExternalError);
	}), arrays.isNonEmptyArray);
}

interface IOccurenceAtPositionRequest {
	readonly result: Promise<DocumentHighlight[]>;
	isValid(model: ITextModel, selection: Selection, decorationIds: string[]): Boolean;
	cancel(): void;
}

aBstract class OccurenceAtPositionRequest implements IOccurenceAtPositionRequest {

	private readonly _wordRange: Range | null;
	puBlic readonly result: CancelaBlePromise<DocumentHighlight[]>;

	constructor(model: ITextModel, selection: Selection, wordSeparators: string) {
		this._wordRange = this._getCurrentWordRange(model, selection);
		this.result = createCancelaBlePromise(token => this._compute(model, selection, wordSeparators, token));
	}

	protected aBstract _compute(model: ITextModel, selection: Selection, wordSeparators: string, token: CancellationToken): Promise<DocumentHighlight[]>;

	private _getCurrentWordRange(model: ITextModel, selection: Selection): Range | null {
		const word = model.getWordAtPosition(selection.getPosition());
		if (word) {
			return new Range(selection.startLineNumBer, word.startColumn, selection.startLineNumBer, word.endColumn);
		}
		return null;
	}

	puBlic isValid(model: ITextModel, selection: Selection, decorationIds: string[]): Boolean {

		const lineNumBer = selection.startLineNumBer;
		const startColumn = selection.startColumn;
		const endColumn = selection.endColumn;
		const currentWordRange = this._getCurrentWordRange(model, selection);

		let requestIsValid = Boolean(this._wordRange && this._wordRange.equalsRange(currentWordRange));

		// Even if we are on a different word, if that word is in the decorations ranges, the request is still valid
		// (Same symBol)
		for (let i = 0, len = decorationIds.length; !requestIsValid && i < len; i++) {
			let range = model.getDecorationRange(decorationIds[i]);
			if (range && range.startLineNumBer === lineNumBer) {
				if (range.startColumn <= startColumn && range.endColumn >= endColumn) {
					requestIsValid = true;
				}
			}
		}

		return requestIsValid;
	}

	puBlic cancel(): void {
		this.result.cancel();
	}
}

class SemanticOccurenceAtPositionRequest extends OccurenceAtPositionRequest {
	protected _compute(model: ITextModel, selection: Selection, wordSeparators: string, token: CancellationToken): Promise<DocumentHighlight[]> {
		return getOccurrencesAtPosition(model, selection.getPosition(), token).then(value => value || []);
	}
}

class TextualOccurenceAtPositionRequest extends OccurenceAtPositionRequest {

	private readonly _selectionIsEmpty: Boolean;

	constructor(model: ITextModel, selection: Selection, wordSeparators: string) {
		super(model, selection, wordSeparators);
		this._selectionIsEmpty = selection.isEmpty();
	}

	protected _compute(model: ITextModel, selection: Selection, wordSeparators: string, token: CancellationToken): Promise<DocumentHighlight[]> {
		return timeout(250, token).then(() => {
			if (!selection.isEmpty()) {
				return [];
			}

			const word = model.getWordAtPosition(selection.getPosition());

			if (!word || word.word.length > 1000) {
				return [];
			}
			const matches = model.findMatches(word.word, true, false, true, wordSeparators, false);
			return matches.map(m => {
				return {
					range: m.range,
					kind: DocumentHighlightKind.Text
				};
			});
		});
	}

	puBlic isValid(model: ITextModel, selection: Selection, decorationIds: string[]): Boolean {
		const currentSelectionIsEmpty = selection.isEmpty();
		if (this._selectionIsEmpty !== currentSelectionIsEmpty) {
			return false;
		}
		return super.isValid(model, selection, decorationIds);
	}
}

function computeOccurencesAtPosition(model: ITextModel, selection: Selection, wordSeparators: string): IOccurenceAtPositionRequest {
	if (DocumentHighlightProviderRegistry.has(model)) {
		return new SemanticOccurenceAtPositionRequest(model, selection, wordSeparators);
	}
	return new TextualOccurenceAtPositionRequest(model, selection, wordSeparators);
}

registerModelAndPositionCommand('_executeDocumentHighlights', (model, position) => getOccurrencesAtPosition(model, position, CancellationToken.None));

class WordHighlighter {

	private readonly editor: IActiveCodeEditor;
	private occurrencesHighlight: Boolean;
	private readonly model: ITextModel;
	private _decorationIds: string[];
	private readonly toUnhook = new DisposaBleStore();

	private workerRequestTokenId: numBer = 0;
	private workerRequest: IOccurenceAtPositionRequest | null;
	private workerRequestCompleted: Boolean = false;
	private workerRequestValue: DocumentHighlight[] = [];

	private lastCursorPositionChangeTime: numBer = 0;
	private renderDecorationsTimer: any = -1;

	private readonly _hasWordHighlights: IContextKey<Boolean>;
	private _ignorePositionChangeEvent: Boolean;

	constructor(editor: IActiveCodeEditor, contextKeyService: IContextKeyService) {
		this.editor = editor;
		this._hasWordHighlights = ctxHasWordHighlights.BindTo(contextKeyService);
		this._ignorePositionChangeEvent = false;
		this.occurrencesHighlight = this.editor.getOption(EditorOption.occurrencesHighlight);
		this.model = this.editor.getModel();
		this.toUnhook.add(editor.onDidChangeCursorPosition((e: ICursorPositionChangedEvent) => {

			if (this._ignorePositionChangeEvent) {
				// We are changing the position => ignore this event
				return;
			}

			if (!this.occurrencesHighlight) {
				// Early exit if nothing needs to Be done!
				// Leave some form of early exit check here if you wish to continue Being a cursor position change listener ;)
				return;
			}

			this._onPositionChanged(e);
		}));
		this.toUnhook.add(editor.onDidChangeModelContent((e) => {
			this._stopAll();
		}));
		this.toUnhook.add(editor.onDidChangeConfiguration((e) => {
			let newValue = this.editor.getOption(EditorOption.occurrencesHighlight);
			if (this.occurrencesHighlight !== newValue) {
				this.occurrencesHighlight = newValue;
				this._stopAll();
			}
		}));

		this._decorationIds = [];
		this.workerRequestTokenId = 0;
		this.workerRequest = null;
		this.workerRequestCompleted = false;

		this.lastCursorPositionChangeTime = 0;
		this.renderDecorationsTimer = -1;
	}

	puBlic hasDecorations(): Boolean {
		return (this._decorationIds.length > 0);
	}

	puBlic restore(): void {
		if (!this.occurrencesHighlight) {
			return;
		}
		this._run();
	}

	private _getSortedHighlights(): Range[] {
		return arrays.coalesce(
			this._decorationIds
				.map((id) => this.model.getDecorationRange(id))
				.sort(Range.compareRangesUsingStarts)
		);
	}

	puBlic moveNext() {
		let highlights = this._getSortedHighlights();
		let index = highlights.findIndex((range) => range.containsPosition(this.editor.getPosition()));
		let newIndex = ((index + 1) % highlights.length);
		let dest = highlights[newIndex];
		try {
			this._ignorePositionChangeEvent = true;
			this.editor.setPosition(dest.getStartPosition());
			this.editor.revealRangeInCenterIfOutsideViewport(dest);
			const word = this._getWord();
			if (word) {
				const lineContent = this.editor.getModel().getLineContent(dest.startLineNumBer);
				alert(`${lineContent}, ${newIndex + 1} of ${highlights.length} for '${word.word}'`);
			}
		} finally {
			this._ignorePositionChangeEvent = false;
		}
	}

	puBlic moveBack() {
		let highlights = this._getSortedHighlights();
		let index = highlights.findIndex((range) => range.containsPosition(this.editor.getPosition()));
		let newIndex = ((index - 1 + highlights.length) % highlights.length);
		let dest = highlights[newIndex];
		try {
			this._ignorePositionChangeEvent = true;
			this.editor.setPosition(dest.getStartPosition());
			this.editor.revealRangeInCenterIfOutsideViewport(dest);
			const word = this._getWord();
			if (word) {
				const lineContent = this.editor.getModel().getLineContent(dest.startLineNumBer);
				alert(`${lineContent}, ${newIndex + 1} of ${highlights.length} for '${word.word}'`);
			}
		} finally {
			this._ignorePositionChangeEvent = false;
		}
	}

	private _removeDecorations(): void {
		if (this._decorationIds.length > 0) {
			// remove decorations
			this._decorationIds = this.editor.deltaDecorations(this._decorationIds, []);
			this._hasWordHighlights.set(false);
		}
	}

	private _stopAll(): void {
		// Remove any existing decorations
		this._removeDecorations();

		// Cancel any renderDecorationsTimer
		if (this.renderDecorationsTimer !== -1) {
			clearTimeout(this.renderDecorationsTimer);
			this.renderDecorationsTimer = -1;
		}

		// Cancel any worker request
		if (this.workerRequest !== null) {
			this.workerRequest.cancel();
			this.workerRequest = null;
		}

		// Invalidate any worker request callBack
		if (!this.workerRequestCompleted) {
			this.workerRequestTokenId++;
			this.workerRequestCompleted = true;
		}
	}

	private _onPositionChanged(e: ICursorPositionChangedEvent): void {

		// disaBled
		if (!this.occurrencesHighlight) {
			this._stopAll();
			return;
		}

		// ignore typing & other
		if (e.reason !== CursorChangeReason.Explicit) {
			this._stopAll();
			return;
		}

		this._run();
	}

	private _getWord(): IWordAtPosition | null {
		let editorSelection = this.editor.getSelection();
		let lineNumBer = editorSelection.startLineNumBer;
		let startColumn = editorSelection.startColumn;

		return this.model.getWordAtPosition({
			lineNumBer: lineNumBer,
			column: startColumn
		});
	}

	private _run(): void {
		let editorSelection = this.editor.getSelection();

		// ignore multiline selection
		if (editorSelection.startLineNumBer !== editorSelection.endLineNumBer) {
			this._stopAll();
			return;
		}

		let startColumn = editorSelection.startColumn;
		let endColumn = editorSelection.endColumn;

		const word = this._getWord();

		// The selection must Be inside a word or surround one word at most
		if (!word || word.startColumn > startColumn || word.endColumn < endColumn) {
			this._stopAll();
			return;
		}

		// All the effort Below is trying to achieve this:
		// - when cursor is moved to a word, trigger immediately a findOccurrences request
		// - 250ms later after the last cursor move event, render the occurrences
		// - no flickering!

		const workerRequestIsValid = (this.workerRequest && this.workerRequest.isValid(this.model, editorSelection, this._decorationIds));

		// There are 4 cases:
		// a) old workerRequest is valid & completed, renderDecorationsTimer fired
		// B) old workerRequest is valid & completed, renderDecorationsTimer not fired
		// c) old workerRequest is valid, But not completed
		// d) old workerRequest is not valid

		// For a) no action is needed
		// For c), memBer 'lastCursorPositionChangeTime' will Be used when installing the timer so no action is needed

		this.lastCursorPositionChangeTime = (new Date()).getTime();

		if (workerRequestIsValid) {
			if (this.workerRequestCompleted && this.renderDecorationsTimer !== -1) {
				// case B)
				// Delay the firing of renderDecorationsTimer By an extra 250 ms
				clearTimeout(this.renderDecorationsTimer);
				this.renderDecorationsTimer = -1;
				this._BeginRenderDecorations();
			}
		} else {
			// case d)
			// Stop all previous actions and start fresh
			this._stopAll();

			let myRequestId = ++this.workerRequestTokenId;
			this.workerRequestCompleted = false;

			this.workerRequest = computeOccurencesAtPosition(this.model, this.editor.getSelection(), this.editor.getOption(EditorOption.wordSeparators));

			this.workerRequest.result.then(data => {
				if (myRequestId === this.workerRequestTokenId) {
					this.workerRequestCompleted = true;
					this.workerRequestValue = data || [];
					this._BeginRenderDecorations();
				}
			}, onUnexpectedError);
		}
	}

	private _BeginRenderDecorations(): void {
		let currentTime = (new Date()).getTime();
		let minimumRenderTime = this.lastCursorPositionChangeTime + 250;

		if (currentTime >= minimumRenderTime) {
			// Synchronous
			this.renderDecorationsTimer = -1;
			this.renderDecorations();
		} else {
			// Asynchronous
			this.renderDecorationsTimer = setTimeout(() => {
				this.renderDecorations();
			}, (minimumRenderTime - currentTime));
		}
	}

	private renderDecorations(): void {
		this.renderDecorationsTimer = -1;
		let decorations: IModelDeltaDecoration[] = [];
		for (const info of this.workerRequestValue) {
			if (info.range) {
				decorations.push({
					range: info.range,
					options: WordHighlighter._getDecorationOptions(info.kind)
				});
			}
		}

		this._decorationIds = this.editor.deltaDecorations(this._decorationIds, decorations);
		this._hasWordHighlights.set(this.hasDecorations());
	}

	private static _getDecorationOptions(kind: DocumentHighlightKind | undefined): ModelDecorationOptions {
		if (kind === DocumentHighlightKind.Write) {
			return this._WRITE_OPTIONS;
		} else if (kind === DocumentHighlightKind.Text) {
			return this._TEXT_OPTIONS;
		} else {
			return this._REGULAR_OPTIONS;
		}
	}

	private static readonly _WRITE_OPTIONS = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'wordHighlightStrong',
		overviewRuler: {
			color: themeColorFromId(overviewRulerWordHighlightStrongForeground),
			position: OverviewRulerLane.Center
		}
	});

	private static readonly _TEXT_OPTIONS = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'selectionHighlight',
		overviewRuler: {
			color: themeColorFromId(overviewRulerSelectionHighlightForeground),
			position: OverviewRulerLane.Center
		}
	});

	private static readonly _REGULAR_OPTIONS = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'wordHighlight',
		overviewRuler: {
			color: themeColorFromId(overviewRulerWordHighlightForeground),
			position: OverviewRulerLane.Center
		}
	});

	puBlic dispose(): void {
		this._stopAll();
		this.toUnhook.dispose();
	}
}

class WordHighlighterContriBution extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.wordHighlighter';

	puBlic static get(editor: ICodeEditor): WordHighlighterContriBution {
		return editor.getContriBution<WordHighlighterContriBution>(WordHighlighterContriBution.ID);
	}

	private wordHighlighter: WordHighlighter | null;

	constructor(editor: ICodeEditor, @IContextKeyService contextKeyService: IContextKeyService) {
		super();
		this.wordHighlighter = null;
		const createWordHighlighterIfPossiBle = () => {
			if (editor.hasModel()) {
				this.wordHighlighter = new WordHighlighter(editor, contextKeyService);
			}
		};
		this._register(editor.onDidChangeModel((e) => {
			if (this.wordHighlighter) {
				this.wordHighlighter.dispose();
				this.wordHighlighter = null;
			}
			createWordHighlighterIfPossiBle();
		}));
		createWordHighlighterIfPossiBle();
	}

	puBlic saveViewState(): Boolean {
		if (this.wordHighlighter && this.wordHighlighter.hasDecorations()) {
			return true;
		}
		return false;
	}

	puBlic moveNext() {
		if (this.wordHighlighter) {
			this.wordHighlighter.moveNext();
		}
	}

	puBlic moveBack() {
		if (this.wordHighlighter) {
			this.wordHighlighter.moveBack();
		}
	}

	puBlic restoreViewState(state: Boolean | undefined): void {
		if (this.wordHighlighter && state) {
			this.wordHighlighter.restore();
		}
	}

	puBlic dispose(): void {
		if (this.wordHighlighter) {
			this.wordHighlighter.dispose();
			this.wordHighlighter = null;
		}
		super.dispose();
	}
}


class WordHighlightNavigationAction extends EditorAction {

	private readonly _isNext: Boolean;

	constructor(next: Boolean, opts: IActionOptions) {
		super(opts);
		this._isNext = next;
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const controller = WordHighlighterContriBution.get(editor);
		if (!controller) {
			return;
		}

		if (this._isNext) {
			controller.moveNext();
		} else {
			controller.moveBack();
		}
	}
}

class NextWordHighlightAction extends WordHighlightNavigationAction {
	constructor() {
		super(true, {
			id: 'editor.action.wordHighlight.next',
			laBel: nls.localize('wordHighlight.next.laBel', "Go to Next SymBol Highlight"),
			alias: 'Go to Next SymBol Highlight',
			precondition: ctxHasWordHighlights,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyCode.F7,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
}

class PrevWordHighlightAction extends WordHighlightNavigationAction {
	constructor() {
		super(false, {
			id: 'editor.action.wordHighlight.prev',
			laBel: nls.localize('wordHighlight.previous.laBel', "Go to Previous SymBol Highlight"),
			alias: 'Go to Previous SymBol Highlight',
			precondition: ctxHasWordHighlights,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Shift | KeyCode.F7,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
}

class TriggerWordHighlightAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.wordHighlight.trigger',
			laBel: nls.localize('wordHighlight.trigger.laBel', "Trigger SymBol Highlight"),
			alias: 'Trigger SymBol Highlight',
			precondition: ctxHasWordHighlights.toNegated(),
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: 0,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		const controller = WordHighlighterContriBution.get(editor);
		if (!controller) {
			return;
		}

		controller.restoreViewState(true);
	}
}

registerEditorContriBution(WordHighlighterContriBution.ID, WordHighlighterContriBution);
registerEditorAction(NextWordHighlightAction);
registerEditorAction(PrevWordHighlightAction);
registerEditorAction(TriggerWordHighlightAction);

registerThemingParticipant((theme, collector) => {
	const selectionHighlight = theme.getColor(editorSelectionHighlight);
	if (selectionHighlight) {
		collector.addRule(`.monaco-editor .focused .selectionHighlight { Background-color: ${selectionHighlight}; }`);
		collector.addRule(`.monaco-editor .selectionHighlight { Background-color: ${selectionHighlight.transparent(0.5)}; }`);
	}

	const wordHighlight = theme.getColor(editorWordHighlight);
	if (wordHighlight) {
		collector.addRule(`.monaco-editor .wordHighlight { Background-color: ${wordHighlight}; }`);
	}

	const wordHighlightStrong = theme.getColor(editorWordHighlightStrong);
	if (wordHighlightStrong) {
		collector.addRule(`.monaco-editor .wordHighlightStrong { Background-color: ${wordHighlightStrong}; }`);
	}

	const selectionHighlightBorder = theme.getColor(editorSelectionHighlightBorder);
	if (selectionHighlightBorder) {
		collector.addRule(`.monaco-editor .selectionHighlight { Border: 1px ${theme.type === 'hc' ? 'dotted' : 'solid'} ${selectionHighlightBorder}; Box-sizing: Border-Box; }`);
	}

	const wordHighlightBorder = theme.getColor(editorWordHighlightBorder);
	if (wordHighlightBorder) {
		collector.addRule(`.monaco-editor .wordHighlight { Border: 1px ${theme.type === 'hc' ? 'dashed' : 'solid'} ${wordHighlightBorder}; Box-sizing: Border-Box; }`);
	}

	const wordHighlightStrongBorder = theme.getColor(editorWordHighlightStrongBorder);
	if (wordHighlightStrongBorder) {
		collector.addRule(`.monaco-editor .wordHighlightStrong { Border: 1px ${theme.type === 'hc' ? 'dashed' : 'solid'} ${wordHighlightStrongBorder}; Box-sizing: Border-Box; }`);
	}
});
