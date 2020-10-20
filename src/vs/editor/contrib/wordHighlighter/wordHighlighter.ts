/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { CAncelAblePromise, creAteCAncelAblePromise, first, timeout } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { onUnexpectedError, onUnexpectedExternAlError } from 'vs/bAse/common/errors';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IActiveCodeEditor, ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, IActionOptions, registerEditorAction, registerEditorContribution, registerModelAndPositionCommAnd } from 'vs/editor/browser/editorExtensions';
import { CursorChAngeReAson, ICursorPositionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IModelDeltADecorAtion, ITextModel, OverviewRulerLAne, TrAckedRAngeStickiness, IWordAtPosition } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { DocumentHighlight, DocumentHighlightKind, DocumentHighlightProviderRegistry } from 'vs/editor/common/modes';
import { IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ActiveContrAstBorder, editorSelectionHighlight, editorSelectionHighlightBorder, overviewRulerSelectionHighlightForeground, registerColor } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt, themeColorFromId } from 'vs/plAtform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';

const editorWordHighlight = registerColor('editor.wordHighlightBAckground', { dArk: '#575757B8', light: '#57575740', hc: null }, nls.locAlize('wordHighlight', 'BAckground color of A symbol during reAd-Access, like reAding A vAriAble. The color must not be opAque so As not to hide underlying decorAtions.'), true);
const editorWordHighlightStrong = registerColor('editor.wordHighlightStrongBAckground', { dArk: '#004972B8', light: '#0e639c40', hc: null }, nls.locAlize('wordHighlightStrong', 'BAckground color of A symbol during write-Access, like writing to A vAriAble. The color must not be opAque so As not to hide underlying decorAtions.'), true);
const editorWordHighlightBorder = registerColor('editor.wordHighlightBorder', { light: null, dArk: null, hc: ActiveContrAstBorder }, nls.locAlize('wordHighlightBorder', 'Border color of A symbol during reAd-Access, like reAding A vAriAble.'));
const editorWordHighlightStrongBorder = registerColor('editor.wordHighlightStrongBorder', { light: null, dArk: null, hc: ActiveContrAstBorder }, nls.locAlize('wordHighlightStrongBorder', 'Border color of A symbol during write-Access, like writing to A vAriAble.'));
const overviewRulerWordHighlightForeground = registerColor('editorOverviewRuler.wordHighlightForeground', { dArk: '#A0A0A0CC', light: '#A0A0A0CC', hc: '#A0A0A0CC' }, nls.locAlize('overviewRulerWordHighlightForeground', 'Overview ruler mArker color for symbol highlights. The color must not be opAque so As not to hide underlying decorAtions.'), true);
const overviewRulerWordHighlightStrongForeground = registerColor('editorOverviewRuler.wordHighlightStrongForeground', { dArk: '#C0A0C0CC', light: '#C0A0C0CC', hc: '#C0A0C0CC' }, nls.locAlize('overviewRulerWordHighlightStrongForeground', 'Overview ruler mArker color for write-Access symbol highlights. The color must not be opAque so As not to hide underlying decorAtions.'), true);
const ctxHAsWordHighlights = new RAwContextKey<booleAn>('hAsWordHighlights', fAlse);

export function getOccurrencesAtPosition(model: ITextModel, position: Position, token: CAncellAtionToken): Promise<DocumentHighlight[] | null | undefined> {

	const orderedByScore = DocumentHighlightProviderRegistry.ordered(model);

	// in order of score Ask the occurrences provider
	// until someone response with A good result
	// (good = none empty ArrAy)
	return first<DocumentHighlight[] | null | undefined>(orderedByScore.mAp(provider => () => {
		return Promise.resolve(provider.provideDocumentHighlights(model, position, token))
			.then(undefined, onUnexpectedExternAlError);
	}), ArrAys.isNonEmptyArrAy);
}

interfAce IOccurenceAtPositionRequest {
	reAdonly result: Promise<DocumentHighlight[]>;
	isVAlid(model: ITextModel, selection: Selection, decorAtionIds: string[]): booleAn;
	cAncel(): void;
}

AbstrAct clAss OccurenceAtPositionRequest implements IOccurenceAtPositionRequest {

	privAte reAdonly _wordRAnge: RAnge | null;
	public reAdonly result: CAncelAblePromise<DocumentHighlight[]>;

	constructor(model: ITextModel, selection: Selection, wordSepArAtors: string) {
		this._wordRAnge = this._getCurrentWordRAnge(model, selection);
		this.result = creAteCAncelAblePromise(token => this._compute(model, selection, wordSepArAtors, token));
	}

	protected AbstrAct _compute(model: ITextModel, selection: Selection, wordSepArAtors: string, token: CAncellAtionToken): Promise<DocumentHighlight[]>;

	privAte _getCurrentWordRAnge(model: ITextModel, selection: Selection): RAnge | null {
		const word = model.getWordAtPosition(selection.getPosition());
		if (word) {
			return new RAnge(selection.stArtLineNumber, word.stArtColumn, selection.stArtLineNumber, word.endColumn);
		}
		return null;
	}

	public isVAlid(model: ITextModel, selection: Selection, decorAtionIds: string[]): booleAn {

		const lineNumber = selection.stArtLineNumber;
		const stArtColumn = selection.stArtColumn;
		const endColumn = selection.endColumn;
		const currentWordRAnge = this._getCurrentWordRAnge(model, selection);

		let requestIsVAlid = BooleAn(this._wordRAnge && this._wordRAnge.equAlsRAnge(currentWordRAnge));

		// Even if we Are on A different word, if thAt word is in the decorAtions rAnges, the request is still vAlid
		// (SAme symbol)
		for (let i = 0, len = decorAtionIds.length; !requestIsVAlid && i < len; i++) {
			let rAnge = model.getDecorAtionRAnge(decorAtionIds[i]);
			if (rAnge && rAnge.stArtLineNumber === lineNumber) {
				if (rAnge.stArtColumn <= stArtColumn && rAnge.endColumn >= endColumn) {
					requestIsVAlid = true;
				}
			}
		}

		return requestIsVAlid;
	}

	public cAncel(): void {
		this.result.cAncel();
	}
}

clAss SemAnticOccurenceAtPositionRequest extends OccurenceAtPositionRequest {
	protected _compute(model: ITextModel, selection: Selection, wordSepArAtors: string, token: CAncellAtionToken): Promise<DocumentHighlight[]> {
		return getOccurrencesAtPosition(model, selection.getPosition(), token).then(vAlue => vAlue || []);
	}
}

clAss TextuAlOccurenceAtPositionRequest extends OccurenceAtPositionRequest {

	privAte reAdonly _selectionIsEmpty: booleAn;

	constructor(model: ITextModel, selection: Selection, wordSepArAtors: string) {
		super(model, selection, wordSepArAtors);
		this._selectionIsEmpty = selection.isEmpty();
	}

	protected _compute(model: ITextModel, selection: Selection, wordSepArAtors: string, token: CAncellAtionToken): Promise<DocumentHighlight[]> {
		return timeout(250, token).then(() => {
			if (!selection.isEmpty()) {
				return [];
			}

			const word = model.getWordAtPosition(selection.getPosition());

			if (!word || word.word.length > 1000) {
				return [];
			}
			const mAtches = model.findMAtches(word.word, true, fAlse, true, wordSepArAtors, fAlse);
			return mAtches.mAp(m => {
				return {
					rAnge: m.rAnge,
					kind: DocumentHighlightKind.Text
				};
			});
		});
	}

	public isVAlid(model: ITextModel, selection: Selection, decorAtionIds: string[]): booleAn {
		const currentSelectionIsEmpty = selection.isEmpty();
		if (this._selectionIsEmpty !== currentSelectionIsEmpty) {
			return fAlse;
		}
		return super.isVAlid(model, selection, decorAtionIds);
	}
}

function computeOccurencesAtPosition(model: ITextModel, selection: Selection, wordSepArAtors: string): IOccurenceAtPositionRequest {
	if (DocumentHighlightProviderRegistry.hAs(model)) {
		return new SemAnticOccurenceAtPositionRequest(model, selection, wordSepArAtors);
	}
	return new TextuAlOccurenceAtPositionRequest(model, selection, wordSepArAtors);
}

registerModelAndPositionCommAnd('_executeDocumentHighlights', (model, position) => getOccurrencesAtPosition(model, position, CAncellAtionToken.None));

clAss WordHighlighter {

	privAte reAdonly editor: IActiveCodeEditor;
	privAte occurrencesHighlight: booleAn;
	privAte reAdonly model: ITextModel;
	privAte _decorAtionIds: string[];
	privAte reAdonly toUnhook = new DisposAbleStore();

	privAte workerRequestTokenId: number = 0;
	privAte workerRequest: IOccurenceAtPositionRequest | null;
	privAte workerRequestCompleted: booleAn = fAlse;
	privAte workerRequestVAlue: DocumentHighlight[] = [];

	privAte lAstCursorPositionChAngeTime: number = 0;
	privAte renderDecorAtionsTimer: Any = -1;

	privAte reAdonly _hAsWordHighlights: IContextKey<booleAn>;
	privAte _ignorePositionChAngeEvent: booleAn;

	constructor(editor: IActiveCodeEditor, contextKeyService: IContextKeyService) {
		this.editor = editor;
		this._hAsWordHighlights = ctxHAsWordHighlights.bindTo(contextKeyService);
		this._ignorePositionChAngeEvent = fAlse;
		this.occurrencesHighlight = this.editor.getOption(EditorOption.occurrencesHighlight);
		this.model = this.editor.getModel();
		this.toUnhook.Add(editor.onDidChAngeCursorPosition((e: ICursorPositionChAngedEvent) => {

			if (this._ignorePositionChAngeEvent) {
				// We Are chAnging the position => ignore this event
				return;
			}

			if (!this.occurrencesHighlight) {
				// EArly exit if nothing needs to be done!
				// LeAve some form of eArly exit check here if you wish to continue being A cursor position chAnge listener ;)
				return;
			}

			this._onPositionChAnged(e);
		}));
		this.toUnhook.Add(editor.onDidChAngeModelContent((e) => {
			this._stopAll();
		}));
		this.toUnhook.Add(editor.onDidChAngeConfigurAtion((e) => {
			let newVAlue = this.editor.getOption(EditorOption.occurrencesHighlight);
			if (this.occurrencesHighlight !== newVAlue) {
				this.occurrencesHighlight = newVAlue;
				this._stopAll();
			}
		}));

		this._decorAtionIds = [];
		this.workerRequestTokenId = 0;
		this.workerRequest = null;
		this.workerRequestCompleted = fAlse;

		this.lAstCursorPositionChAngeTime = 0;
		this.renderDecorAtionsTimer = -1;
	}

	public hAsDecorAtions(): booleAn {
		return (this._decorAtionIds.length > 0);
	}

	public restore(): void {
		if (!this.occurrencesHighlight) {
			return;
		}
		this._run();
	}

	privAte _getSortedHighlights(): RAnge[] {
		return ArrAys.coAlesce(
			this._decorAtionIds
				.mAp((id) => this.model.getDecorAtionRAnge(id))
				.sort(RAnge.compAreRAngesUsingStArts)
		);
	}

	public moveNext() {
		let highlights = this._getSortedHighlights();
		let index = highlights.findIndex((rAnge) => rAnge.contAinsPosition(this.editor.getPosition()));
		let newIndex = ((index + 1) % highlights.length);
		let dest = highlights[newIndex];
		try {
			this._ignorePositionChAngeEvent = true;
			this.editor.setPosition(dest.getStArtPosition());
			this.editor.reveAlRAngeInCenterIfOutsideViewport(dest);
			const word = this._getWord();
			if (word) {
				const lineContent = this.editor.getModel().getLineContent(dest.stArtLineNumber);
				Alert(`${lineContent}, ${newIndex + 1} of ${highlights.length} for '${word.word}'`);
			}
		} finAlly {
			this._ignorePositionChAngeEvent = fAlse;
		}
	}

	public moveBAck() {
		let highlights = this._getSortedHighlights();
		let index = highlights.findIndex((rAnge) => rAnge.contAinsPosition(this.editor.getPosition()));
		let newIndex = ((index - 1 + highlights.length) % highlights.length);
		let dest = highlights[newIndex];
		try {
			this._ignorePositionChAngeEvent = true;
			this.editor.setPosition(dest.getStArtPosition());
			this.editor.reveAlRAngeInCenterIfOutsideViewport(dest);
			const word = this._getWord();
			if (word) {
				const lineContent = this.editor.getModel().getLineContent(dest.stArtLineNumber);
				Alert(`${lineContent}, ${newIndex + 1} of ${highlights.length} for '${word.word}'`);
			}
		} finAlly {
			this._ignorePositionChAngeEvent = fAlse;
		}
	}

	privAte _removeDecorAtions(): void {
		if (this._decorAtionIds.length > 0) {
			// remove decorAtions
			this._decorAtionIds = this.editor.deltADecorAtions(this._decorAtionIds, []);
			this._hAsWordHighlights.set(fAlse);
		}
	}

	privAte _stopAll(): void {
		// Remove Any existing decorAtions
		this._removeDecorAtions();

		// CAncel Any renderDecorAtionsTimer
		if (this.renderDecorAtionsTimer !== -1) {
			cleArTimeout(this.renderDecorAtionsTimer);
			this.renderDecorAtionsTimer = -1;
		}

		// CAncel Any worker request
		if (this.workerRequest !== null) {
			this.workerRequest.cAncel();
			this.workerRequest = null;
		}

		// InvAlidAte Any worker request cAllbAck
		if (!this.workerRequestCompleted) {
			this.workerRequestTokenId++;
			this.workerRequestCompleted = true;
		}
	}

	privAte _onPositionChAnged(e: ICursorPositionChAngedEvent): void {

		// disAbled
		if (!this.occurrencesHighlight) {
			this._stopAll();
			return;
		}

		// ignore typing & other
		if (e.reAson !== CursorChAngeReAson.Explicit) {
			this._stopAll();
			return;
		}

		this._run();
	}

	privAte _getWord(): IWordAtPosition | null {
		let editorSelection = this.editor.getSelection();
		let lineNumber = editorSelection.stArtLineNumber;
		let stArtColumn = editorSelection.stArtColumn;

		return this.model.getWordAtPosition({
			lineNumber: lineNumber,
			column: stArtColumn
		});
	}

	privAte _run(): void {
		let editorSelection = this.editor.getSelection();

		// ignore multiline selection
		if (editorSelection.stArtLineNumber !== editorSelection.endLineNumber) {
			this._stopAll();
			return;
		}

		let stArtColumn = editorSelection.stArtColumn;
		let endColumn = editorSelection.endColumn;

		const word = this._getWord();

		// The selection must be inside A word or surround one word At most
		if (!word || word.stArtColumn > stArtColumn || word.endColumn < endColumn) {
			this._stopAll();
			return;
		}

		// All the effort below is trying to Achieve this:
		// - when cursor is moved to A word, trigger immediAtely A findOccurrences request
		// - 250ms lAter After the lAst cursor move event, render the occurrences
		// - no flickering!

		const workerRequestIsVAlid = (this.workerRequest && this.workerRequest.isVAlid(this.model, editorSelection, this._decorAtionIds));

		// There Are 4 cAses:
		// A) old workerRequest is vAlid & completed, renderDecorAtionsTimer fired
		// b) old workerRequest is vAlid & completed, renderDecorAtionsTimer not fired
		// c) old workerRequest is vAlid, but not completed
		// d) old workerRequest is not vAlid

		// For A) no Action is needed
		// For c), member 'lAstCursorPositionChAngeTime' will be used when instAlling the timer so no Action is needed

		this.lAstCursorPositionChAngeTime = (new DAte()).getTime();

		if (workerRequestIsVAlid) {
			if (this.workerRequestCompleted && this.renderDecorAtionsTimer !== -1) {
				// cAse b)
				// DelAy the firing of renderDecorAtionsTimer by An extrA 250 ms
				cleArTimeout(this.renderDecorAtionsTimer);
				this.renderDecorAtionsTimer = -1;
				this._beginRenderDecorAtions();
			}
		} else {
			// cAse d)
			// Stop All previous Actions And stArt fresh
			this._stopAll();

			let myRequestId = ++this.workerRequestTokenId;
			this.workerRequestCompleted = fAlse;

			this.workerRequest = computeOccurencesAtPosition(this.model, this.editor.getSelection(), this.editor.getOption(EditorOption.wordSepArAtors));

			this.workerRequest.result.then(dAtA => {
				if (myRequestId === this.workerRequestTokenId) {
					this.workerRequestCompleted = true;
					this.workerRequestVAlue = dAtA || [];
					this._beginRenderDecorAtions();
				}
			}, onUnexpectedError);
		}
	}

	privAte _beginRenderDecorAtions(): void {
		let currentTime = (new DAte()).getTime();
		let minimumRenderTime = this.lAstCursorPositionChAngeTime + 250;

		if (currentTime >= minimumRenderTime) {
			// Synchronous
			this.renderDecorAtionsTimer = -1;
			this.renderDecorAtions();
		} else {
			// Asynchronous
			this.renderDecorAtionsTimer = setTimeout(() => {
				this.renderDecorAtions();
			}, (minimumRenderTime - currentTime));
		}
	}

	privAte renderDecorAtions(): void {
		this.renderDecorAtionsTimer = -1;
		let decorAtions: IModelDeltADecorAtion[] = [];
		for (const info of this.workerRequestVAlue) {
			if (info.rAnge) {
				decorAtions.push({
					rAnge: info.rAnge,
					options: WordHighlighter._getDecorAtionOptions(info.kind)
				});
			}
		}

		this._decorAtionIds = this.editor.deltADecorAtions(this._decorAtionIds, decorAtions);
		this._hAsWordHighlights.set(this.hAsDecorAtions());
	}

	privAte stAtic _getDecorAtionOptions(kind: DocumentHighlightKind | undefined): ModelDecorAtionOptions {
		if (kind === DocumentHighlightKind.Write) {
			return this._WRITE_OPTIONS;
		} else if (kind === DocumentHighlightKind.Text) {
			return this._TEXT_OPTIONS;
		} else {
			return this._REGULAR_OPTIONS;
		}
	}

	privAte stAtic reAdonly _WRITE_OPTIONS = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'wordHighlightStrong',
		overviewRuler: {
			color: themeColorFromId(overviewRulerWordHighlightStrongForeground),
			position: OverviewRulerLAne.Center
		}
	});

	privAte stAtic reAdonly _TEXT_OPTIONS = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'selectionHighlight',
		overviewRuler: {
			color: themeColorFromId(overviewRulerSelectionHighlightForeground),
			position: OverviewRulerLAne.Center
		}
	});

	privAte stAtic reAdonly _REGULAR_OPTIONS = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'wordHighlight',
		overviewRuler: {
			color: themeColorFromId(overviewRulerWordHighlightForeground),
			position: OverviewRulerLAne.Center
		}
	});

	public dispose(): void {
		this._stopAll();
		this.toUnhook.dispose();
	}
}

clAss WordHighlighterContribution extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.wordHighlighter';

	public stAtic get(editor: ICodeEditor): WordHighlighterContribution {
		return editor.getContribution<WordHighlighterContribution>(WordHighlighterContribution.ID);
	}

	privAte wordHighlighter: WordHighlighter | null;

	constructor(editor: ICodeEditor, @IContextKeyService contextKeyService: IContextKeyService) {
		super();
		this.wordHighlighter = null;
		const creAteWordHighlighterIfPossible = () => {
			if (editor.hAsModel()) {
				this.wordHighlighter = new WordHighlighter(editor, contextKeyService);
			}
		};
		this._register(editor.onDidChAngeModel((e) => {
			if (this.wordHighlighter) {
				this.wordHighlighter.dispose();
				this.wordHighlighter = null;
			}
			creAteWordHighlighterIfPossible();
		}));
		creAteWordHighlighterIfPossible();
	}

	public sAveViewStAte(): booleAn {
		if (this.wordHighlighter && this.wordHighlighter.hAsDecorAtions()) {
			return true;
		}
		return fAlse;
	}

	public moveNext() {
		if (this.wordHighlighter) {
			this.wordHighlighter.moveNext();
		}
	}

	public moveBAck() {
		if (this.wordHighlighter) {
			this.wordHighlighter.moveBAck();
		}
	}

	public restoreViewStAte(stAte: booleAn | undefined): void {
		if (this.wordHighlighter && stAte) {
			this.wordHighlighter.restore();
		}
	}

	public dispose(): void {
		if (this.wordHighlighter) {
			this.wordHighlighter.dispose();
			this.wordHighlighter = null;
		}
		super.dispose();
	}
}


clAss WordHighlightNAvigAtionAction extends EditorAction {

	privAte reAdonly _isNext: booleAn;

	constructor(next: booleAn, opts: IActionOptions) {
		super(opts);
		this._isNext = next;
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const controller = WordHighlighterContribution.get(editor);
		if (!controller) {
			return;
		}

		if (this._isNext) {
			controller.moveNext();
		} else {
			controller.moveBAck();
		}
	}
}

clAss NextWordHighlightAction extends WordHighlightNAvigAtionAction {
	constructor() {
		super(true, {
			id: 'editor.Action.wordHighlight.next',
			lAbel: nls.locAlize('wordHighlight.next.lAbel', "Go to Next Symbol Highlight"),
			AliAs: 'Go to Next Symbol Highlight',
			precondition: ctxHAsWordHighlights,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyCode.F7,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

clAss PrevWordHighlightAction extends WordHighlightNAvigAtionAction {
	constructor() {
		super(fAlse, {
			id: 'editor.Action.wordHighlight.prev',
			lAbel: nls.locAlize('wordHighlight.previous.lAbel', "Go to Previous Symbol Highlight"),
			AliAs: 'Go to Previous Symbol Highlight',
			precondition: ctxHAsWordHighlights,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Shift | KeyCode.F7,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

clAss TriggerWordHighlightAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.wordHighlight.trigger',
			lAbel: nls.locAlize('wordHighlight.trigger.lAbel', "Trigger Symbol Highlight"),
			AliAs: 'Trigger Symbol Highlight',
			precondition: ctxHAsWordHighlights.toNegAted(),
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: 0,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
		const controller = WordHighlighterContribution.get(editor);
		if (!controller) {
			return;
		}

		controller.restoreViewStAte(true);
	}
}

registerEditorContribution(WordHighlighterContribution.ID, WordHighlighterContribution);
registerEditorAction(NextWordHighlightAction);
registerEditorAction(PrevWordHighlightAction);
registerEditorAction(TriggerWordHighlightAction);

registerThemingPArticipAnt((theme, collector) => {
	const selectionHighlight = theme.getColor(editorSelectionHighlight);
	if (selectionHighlight) {
		collector.AddRule(`.monAco-editor .focused .selectionHighlight { bAckground-color: ${selectionHighlight}; }`);
		collector.AddRule(`.monAco-editor .selectionHighlight { bAckground-color: ${selectionHighlight.trAnspArent(0.5)}; }`);
	}

	const wordHighlight = theme.getColor(editorWordHighlight);
	if (wordHighlight) {
		collector.AddRule(`.monAco-editor .wordHighlight { bAckground-color: ${wordHighlight}; }`);
	}

	const wordHighlightStrong = theme.getColor(editorWordHighlightStrong);
	if (wordHighlightStrong) {
		collector.AddRule(`.monAco-editor .wordHighlightStrong { bAckground-color: ${wordHighlightStrong}; }`);
	}

	const selectionHighlightBorder = theme.getColor(editorSelectionHighlightBorder);
	if (selectionHighlightBorder) {
		collector.AddRule(`.monAco-editor .selectionHighlight { border: 1px ${theme.type === 'hc' ? 'dotted' : 'solid'} ${selectionHighlightBorder}; box-sizing: border-box; }`);
	}

	const wordHighlightBorder = theme.getColor(editorWordHighlightBorder);
	if (wordHighlightBorder) {
		collector.AddRule(`.monAco-editor .wordHighlight { border: 1px ${theme.type === 'hc' ? 'dAshed' : 'solid'} ${wordHighlightBorder}; box-sizing: border-box; }`);
	}

	const wordHighlightStrongBorder = theme.getColor(editorWordHighlightStrongBorder);
	if (wordHighlightStrongBorder) {
		collector.AddRule(`.monAco-editor .wordHighlightStrong { border: 1px ${theme.type === 'hc' ? 'dAshed' : 'solid'} ${wordHighlightStrongBorder}; box-sizing: border-box; }`);
	}
});
