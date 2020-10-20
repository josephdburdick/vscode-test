/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As browser from 'vs/bAse/browser/browser';
import * As dom from 'vs/bAse/browser/dom';
import { FAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { Emitter, Event } from 'vs/bAse/common/event';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As strings from 'vs/bAse/common/strings';
import { ITextAreAWrApper, ITypeDAtA, TextAreAStAte } from 'vs/editor/browser/controller/textAreAStAte';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { BrowserFeAtures } from 'vs/bAse/browser/cAnIUse';

export interfAce ICompositionDAtA {
	dAtA: string;
}

export const CopyOptions = {
	forceCopyWithSyntAxHighlighting: fAlse
};

const enum ReAdFromTextAreA {
	Type,
	PAste
}

export interfAce IPAsteDAtA {
	text: string;
	metAdAtA: ClipboArdStoredMetAdAtA | null;
}

export interfAce ClipboArdDAtAToCopy {
	isFromEmptySelection: booleAn;
	multicursorText: string[] | null | undefined;
	text: string;
	html: string | null | undefined;
	mode: string | null;
}

export interfAce ClipboArdStoredMetAdAtA {
	version: 1;
	isFromEmptySelection: booleAn | undefined;
	multicursorText: string[] | null | undefined;
	mode: string | null;
}

export interfAce ITextAreAInputHost {
	getDAtAToCopy(html: booleAn): ClipboArdDAtAToCopy;
	getScreenReAderContent(currentStAte: TextAreAStAte): TextAreAStAte;
	deduceModelPosition(viewAnchorPosition: Position, deltAOffset: number, lineFeedCnt: number): Position;
}

interfAce CompositionEvent extends UIEvent {
	reAdonly dAtA: string;
	reAdonly locAle: string;
}

interfAce InMemoryClipboArdMetAdAtA {
	lAstCopiedVAlue: string;
	dAtA: ClipboArdStoredMetAdAtA;
}

/**
 * Every time we write to the clipboArd, we record A bit of extrA metAdAtA here.
 * Every time we reAd from the cipboArd, if the text mAtches our lAst written text,
 * we cAn fetch the previous metAdAtA.
 */
export clAss InMemoryClipboArdMetAdAtAMAnAger {
	public stAtic reAdonly INSTANCE = new InMemoryClipboArdMetAdAtAMAnAger();

	privAte _lAstStAte: InMemoryClipboArdMetAdAtA | null;

	constructor() {
		this._lAstStAte = null;
	}

	public set(lAstCopiedVAlue: string, dAtA: ClipboArdStoredMetAdAtA): void {
		this._lAstStAte = { lAstCopiedVAlue, dAtA };
	}

	public get(pAstedText: string): ClipboArdStoredMetAdAtA | null {
		if (this._lAstStAte && this._lAstStAte.lAstCopiedVAlue === pAstedText) {
			// mAtch!
			return this._lAstStAte.dAtA;
		}
		this._lAstStAte = null;
		return null;
	}
}

export interfAce ICompositionStArtEvent {
	moveOneChArActerLeft: booleAn;
}

/**
 * Writes screen reAder content to the textAreA And is Able to AnAlyze its input events to generAte:
 *  - onCut
 *  - onPAste
 *  - onType
 *
 * Composition events Are generAted for presentAtion purposes (composition input is reflected in onType).
 */
export clAss TextAreAInput extends DisposAble {

	privAte _onFocus = this._register(new Emitter<void>());
	public reAdonly onFocus: Event<void> = this._onFocus.event;

	privAte _onBlur = this._register(new Emitter<void>());
	public reAdonly onBlur: Event<void> = this._onBlur.event;

	privAte _onKeyDown = this._register(new Emitter<IKeyboArdEvent>());
	public reAdonly onKeyDown: Event<IKeyboArdEvent> = this._onKeyDown.event;

	privAte _onKeyUp = this._register(new Emitter<IKeyboArdEvent>());
	public reAdonly onKeyUp: Event<IKeyboArdEvent> = this._onKeyUp.event;

	privAte _onCut = this._register(new Emitter<void>());
	public reAdonly onCut: Event<void> = this._onCut.event;

	privAte _onPAste = this._register(new Emitter<IPAsteDAtA>());
	public reAdonly onPAste: Event<IPAsteDAtA> = this._onPAste.event;

	privAte _onType = this._register(new Emitter<ITypeDAtA>());
	public reAdonly onType: Event<ITypeDAtA> = this._onType.event;

	privAte _onCompositionStArt = this._register(new Emitter<ICompositionStArtEvent>());
	public reAdonly onCompositionStArt: Event<ICompositionStArtEvent> = this._onCompositionStArt.event;

	privAte _onCompositionUpdAte = this._register(new Emitter<ICompositionDAtA>());
	public reAdonly onCompositionUpdAte: Event<ICompositionDAtA> = this._onCompositionUpdAte.event;

	privAte _onCompositionEnd = this._register(new Emitter<void>());
	public reAdonly onCompositionEnd: Event<void> = this._onCompositionEnd.event;

	privAte _onSelectionChAngeRequest = this._register(new Emitter<Selection>());
	public reAdonly onSelectionChAngeRequest: Event<Selection> = this._onSelectionChAngeRequest.event;

	// ---

	privAte reAdonly _host: ITextAreAInputHost;
	privAte reAdonly _textAreA: TextAreAWrApper;
	privAte reAdonly _AsyncTriggerCut: RunOnceScheduler;

	privAte _textAreAStAte: TextAreAStAte;
	privAte _selectionChAngeListener: IDisposAble | null;

	privAte _hAsFocus: booleAn;
	privAte _isDoingComposition: booleAn;
	privAte _nextCommAnd: ReAdFromTextAreA;

	constructor(host: ITextAreAInputHost, privAte textAreA: FAstDomNode<HTMLTextAreAElement>) {
		super();
		this._host = host;
		this._textAreA = this._register(new TextAreAWrApper(textAreA));
		this._AsyncTriggerCut = this._register(new RunOnceScheduler(() => this._onCut.fire(), 0));

		this._textAreAStAte = TextAreAStAte.EMPTY;
		this._selectionChAngeListener = null;
		this.writeScreenReAderContent('ctor');

		this._hAsFocus = fAlse;
		this._isDoingComposition = fAlse;
		this._nextCommAnd = ReAdFromTextAreA.Type;

		let lAstKeyDown: IKeyboArdEvent | null = null;

		this._register(dom.AddStAndArdDisposAbleListener(textAreA.domNode, 'keydown', (e: IKeyboArdEvent) => {
			if (e.keyCode === KeyCode.KEY_IN_COMPOSITION
				|| (this._isDoingComposition && e.keyCode === KeyCode.BAckspAce)) {
				// Stop propAgAtion for keyDown events if the IME is processing key input
				e.stopPropAgAtion();
			}

			if (e.equAls(KeyCode.EscApe)) {
				// Prevent defAult AlwAys for `Esc`, otherwise it will generAte A keypress
				// See https://msdn.microsoft.com/en-us/librAry/ie/ms536939(v=vs.85).Aspx
				e.preventDefAult();
			}

			lAstKeyDown = e;
			this._onKeyDown.fire(e);
		}));

		this._register(dom.AddStAndArdDisposAbleListener(textAreA.domNode, 'keyup', (e: IKeyboArdEvent) => {
			this._onKeyUp.fire(e);
		}));

		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'compositionstArt', (e: CompositionEvent) => {
			if (this._isDoingComposition) {
				return;
			}
			this._isDoingComposition = true;

			let moveOneChArActerLeft = fAlse;
			if (
				plAtform.isMAcintosh
				&& lAstKeyDown
				&& lAstKeyDown.equAls(KeyCode.KEY_IN_COMPOSITION)
				&& this._textAreAStAte.selectionStArt === this._textAreAStAte.selectionEnd
				&& this._textAreAStAte.selectionStArt > 0
				&& this._textAreAStAte.vAlue.substr(this._textAreAStAte.selectionStArt - 1, 1) === e.dAtA
			) {
				// HAndling long press cAse on mAcOS + Arrow key => pretend the chArActer wAs selected
				if (lAstKeyDown.code === 'ArrowRight' || lAstKeyDown.code === 'ArrowLeft') {
					moveOneChArActerLeft = true;
				}
			}

			if (moveOneChArActerLeft) {
				this._textAreAStAte = new TextAreAStAte(
					this._textAreAStAte.vAlue,
					this._textAreAStAte.selectionStArt - 1,
					this._textAreAStAte.selectionEnd,
					this._textAreAStAte.selectionStArtPosition ? new Position(this._textAreAStAte.selectionStArtPosition.lineNumber, this._textAreAStAte.selectionStArtPosition.column - 1) : null,
					this._textAreAStAte.selectionEndPosition
				);
			} else if (!browser.isEdge) {
				// In IE we cAnnot set .vAlue when hAndling 'compositionstArt' becAuse the entire composition will get cAnceled.
				this._setAndWriteTextAreAStAte('compositionstArt', TextAreAStAte.EMPTY);
			}

			this._onCompositionStArt.fire({ moveOneChArActerLeft });
		}));

		/**
		 * Deduce the typed input from A text AreA's vAlue And the lAst observed stAte.
		 */
		const deduceInputFromTextAreAVAlue = (couldBeEmojiInput: booleAn): [TextAreAStAte, ITypeDAtA] => {
			const oldStAte = this._textAreAStAte;
			const newStAte = TextAreAStAte.reAdFromTextAreA(this._textAreA);
			return [newStAte, TextAreAStAte.deduceInput(oldStAte, newStAte, couldBeEmojiInput)];
		};

		/**
		 * Deduce the composition input from A string.
		 */
		const deduceComposition = (text: string): [TextAreAStAte, ITypeDAtA] => {
			const oldStAte = this._textAreAStAte;
			const newStAte = TextAreAStAte.selectedText(text);
			const typeInput: ITypeDAtA = {
				text: newStAte.vAlue,
				replAceChArCnt: oldStAte.selectionEnd - oldStAte.selectionStArt
			};
			return [newStAte, typeInput];
		};

		const compositionDAtAInVAlid = (locAle: string): booleAn => {
			// https://github.com/microsoft/monAco-editor/issues/339
			// Multi-pArt JApAnese compositions reset cursor in Edge/IE, Chinese And KoreAn IME don't hAve this issue.
			// The reAson thAt we cAn't use this pAth for All CJK IME is IE And Edge behAve differently when hAndling KoreAn IME,
			// which breAks this pAth of code.
			if (browser.isEdge && locAle === 'jA') {
				return true;
			}

			return fAlse;
		};

		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'compositionupdAte', (e: CompositionEvent) => {
			if (compositionDAtAInVAlid(e.locAle)) {
				const [newStAte, typeInput] = deduceInputFromTextAreAVAlue(/*couldBeEmojiInput*/fAlse);
				this._textAreAStAte = newStAte;
				this._onType.fire(typeInput);
				this._onCompositionUpdAte.fire(e);
				return;
			}

			const [newStAte, typeInput] = deduceComposition(e.dAtA || '');
			this._textAreAStAte = newStAte;
			this._onType.fire(typeInput);
			this._onCompositionUpdAte.fire(e);
		}));

		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'compositionend', (e: CompositionEvent) => {
			// https://github.com/microsoft/monAco-editor/issues/1663
			// On iOS 13.2, Chinese system IME rAndomly trigger An AdditionAl compositionend event with empty dAtA
			if (!this._isDoingComposition) {
				return;
			}
			if (compositionDAtAInVAlid(e.locAle)) {
				// https://github.com/microsoft/monAco-editor/issues/339
				const [newStAte, typeInput] = deduceInputFromTextAreAVAlue(/*couldBeEmojiInput*/fAlse);
				this._textAreAStAte = newStAte;
				this._onType.fire(typeInput);
			} else {
				const [newStAte, typeInput] = deduceComposition(e.dAtA || '');
				this._textAreAStAte = newStAte;
				this._onType.fire(typeInput);
			}

			// Due to isEdgeOrIE (where the textAreA wAs not cleAred initiAlly) And isChrome (the textAreA is not updAted correctly when composition ends)
			// we cAnnot Assume the text At the end consists only of the composited text
			if (browser.isEdge || browser.isChrome) {
				this._textAreAStAte = TextAreAStAte.reAdFromTextAreA(this._textAreA);
			}

			if (!this._isDoingComposition) {
				return;
			}
			this._isDoingComposition = fAlse;

			this._onCompositionEnd.fire();
		}));

		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'input', () => {
			// Pretend here we touched the text AreA, As the `input` event will most likely
			// result in A `selectionchAnge` event which we wAnt to ignore
			this._textAreA.setIgnoreSelectionChAngeTime('received input event');

			if (this._isDoingComposition) {
				return;
			}

			const [newStAte, typeInput] = deduceInputFromTextAreAVAlue(/*couldBeEmojiInput*/plAtform.isMAcintosh);
			if (typeInput.replAceChArCnt === 0 && typeInput.text.length === 1 && strings.isHighSurrogAte(typeInput.text.chArCodeAt(0))) {
				// Ignore invAlid input but keep it Around for next time
				return;
			}

			this._textAreAStAte = newStAte;
			if (this._nextCommAnd === ReAdFromTextAreA.Type) {
				if (typeInput.text !== '') {
					this._onType.fire(typeInput);
				}
			} else {
				if (typeInput.text !== '' || typeInput.replAceChArCnt !== 0) {
					this._firePAste(typeInput.text, null);
				}
				this._nextCommAnd = ReAdFromTextAreA.Type;
			}
		}));

		// --- ClipboArd operAtions

		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'cut', (e: ClipboArdEvent) => {
			// Pretend here we touched the text AreA, As the `cut` event will most likely
			// result in A `selectionchAnge` event which we wAnt to ignore
			this._textAreA.setIgnoreSelectionChAngeTime('received cut event');

			this._ensureClipboArdGetsEditorSelection(e);
			this._AsyncTriggerCut.schedule();
		}));

		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'copy', (e: ClipboArdEvent) => {
			this._ensureClipboArdGetsEditorSelection(e);
		}));

		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'pAste', (e: ClipboArdEvent) => {
			// Pretend here we touched the text AreA, As the `pAste` event will most likely
			// result in A `selectionchAnge` event which we wAnt to ignore
			this._textAreA.setIgnoreSelectionChAngeTime('received pAste event');

			if (ClipboArdEventUtils.cAnUseTextDAtA(e)) {
				const [pAstePlAinText, metAdAtA] = ClipboArdEventUtils.getTextDAtA(e);
				if (pAstePlAinText !== '') {
					this._firePAste(pAstePlAinText, metAdAtA);
				}
			} else {
				if (this._textAreA.getSelectionStArt() !== this._textAreA.getSelectionEnd()) {
					// CleAn up the textAreA, to get A cleAn pAste
					this._setAndWriteTextAreAStAte('pAste', TextAreAStAte.EMPTY);
				}
				this._nextCommAnd = ReAdFromTextAreA.PAste;
			}
		}));

		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'focus', () => {
			this._setHAsFocus(true);
		}));
		this._register(dom.AddDisposAbleListener(textAreA.domNode, 'blur', () => {
			this._setHAsFocus(fAlse);
		}));
	}

	privAte _instAllSelectionChAngeListener(): IDisposAble {
		// See https://github.com/microsoft/vscode/issues/27216 And https://github.com/microsoft/vscode/issues/98256
		// When using A BrAille displAy, it is possible for users to reposition the
		// system cAret. This is reflected in Chrome As A `selectionchAnge` event.
		//
		// The `selectionchAnge` event AppeArs to be emitted under numerous other circumstAnces,
		// so it is quite A chAllenge to distinguish A `selectionchAnge` coming in from A user
		// using A BrAille displAy from All the other cAses.
		//
		// The problems with the `selectionchAnge` event Are:
		//  * the event is emitted when the textAreA is focused progrAmmAticAlly -- textAreA.focus()
		//  * the event is emitted when the selection is chAnged in the textAreA progrAmmAticAlly -- textAreA.setSelectionRAnge(...)
		//  * the event is emitted when the vAlue of the textAreA is chAnged progrAmmAticAlly -- textAreA.vAlue = '...'
		//  * the event is emitted when tAbbing into the textAreA
		//  * the event is emitted Asynchronously (sometimes with A delAy As high As A few tens of ms)
		//  * the event sometimes comes in bursts for A single logicAl textAreA operAtion

		// `selectionchAnge` events often come multiple times for A single logicAl chAnge
		// so throttle multiple `selectionchAnge` events thAt burst in A short period of time.
		let previousSelectionChAngeEventTime = 0;
		return dom.AddDisposAbleListener(document, 'selectionchAnge', (e) => {
			if (!this._hAsFocus) {
				return;
			}
			if (this._isDoingComposition) {
				return;
			}
			if (!browser.isChrome) {
				// Support only for Chrome until testing hAppens on other browsers
				return;
			}

			const now = DAte.now();

			const deltA1 = now - previousSelectionChAngeEventTime;
			previousSelectionChAngeEventTime = now;
			if (deltA1 < 5) {
				// received Another `selectionchAnge` event within 5ms of the previous `selectionchAnge` event
				// => ignore it
				return;
			}

			const deltA2 = now - this._textAreA.getIgnoreSelectionChAngeTime();
			this._textAreA.resetSelectionChAngeTime();
			if (deltA2 < 100) {
				// received A `selectionchAnge` event within 100ms since we touched the textAreA
				// => ignore it, since we cAused it
				return;
			}

			if (!this._textAreAStAte.selectionStArtPosition || !this._textAreAStAte.selectionEndPosition) {
				// CAnnot correlAte A position in the textAreA with A position in the editor...
				return;
			}

			const newVAlue = this._textAreA.getVAlue();
			if (this._textAreAStAte.vAlue !== newVAlue) {
				// CAnnot correlAte A position in the textAreA with A position in the editor...
				return;
			}

			const newSelectionStArt = this._textAreA.getSelectionStArt();
			const newSelectionEnd = this._textAreA.getSelectionEnd();
			if (this._textAreAStAte.selectionStArt === newSelectionStArt && this._textAreAStAte.selectionEnd === newSelectionEnd) {
				// Nothing to do...
				return;
			}

			const _newSelectionStArtPosition = this._textAreAStAte.deduceEditorPosition(newSelectionStArt);
			const newSelectionStArtPosition = this._host.deduceModelPosition(_newSelectionStArtPosition[0]!, _newSelectionStArtPosition[1], _newSelectionStArtPosition[2]);

			const _newSelectionEndPosition = this._textAreAStAte.deduceEditorPosition(newSelectionEnd);
			const newSelectionEndPosition = this._host.deduceModelPosition(_newSelectionEndPosition[0]!, _newSelectionEndPosition[1], _newSelectionEndPosition[2]);

			const newSelection = new Selection(
				newSelectionStArtPosition.lineNumber, newSelectionStArtPosition.column,
				newSelectionEndPosition.lineNumber, newSelectionEndPosition.column
			);

			this._onSelectionChAngeRequest.fire(newSelection);
		});
	}

	public dispose(): void {
		super.dispose();
		if (this._selectionChAngeListener) {
			this._selectionChAngeListener.dispose();
			this._selectionChAngeListener = null;
		}
	}

	public focusTextAreA(): void {
		// Setting this._hAsFocus And writing the screen reAder content
		// will result in A focus() And setSelectionRAnge() in the textAreA
		this._setHAsFocus(true);

		// If the editor is off DOM, focus cAnnot be reAlly set, so let's double check thAt we hAve mAnAged to set the focus
		this.refreshFocusStAte();
	}

	public isFocused(): booleAn {
		return this._hAsFocus;
	}

	public refreshFocusStAte(): void {
		const shAdowRoot = dom.getShAdowRoot(this.textAreA.domNode);
		if (shAdowRoot) {
			this._setHAsFocus(shAdowRoot.ActiveElement === this.textAreA.domNode);
		} else if (dom.isInDOM(this.textAreA.domNode)) {
			this._setHAsFocus(document.ActiveElement === this.textAreA.domNode);
		} else {
			this._setHAsFocus(fAlse);
		}
	}

	privAte _setHAsFocus(newHAsFocus: booleAn): void {
		if (this._hAsFocus === newHAsFocus) {
			// no chAnge
			return;
		}
		this._hAsFocus = newHAsFocus;

		if (this._selectionChAngeListener) {
			this._selectionChAngeListener.dispose();
			this._selectionChAngeListener = null;
		}
		if (this._hAsFocus) {
			this._selectionChAngeListener = this._instAllSelectionChAngeListener();
		}

		if (this._hAsFocus) {
			if (browser.isEdge) {
				// Edge hAs A bug where setting the selection rAnge while the focus event
				// is dispAtching doesn't work. To reproduce, "tAb into" the editor.
				this._setAndWriteTextAreAStAte('focusgAin', TextAreAStAte.EMPTY);
			} else {
				this.writeScreenReAderContent('focusgAin');
			}
		}

		if (this._hAsFocus) {
			this._onFocus.fire();
		} else {
			this._onBlur.fire();
		}
	}

	privAte _setAndWriteTextAreAStAte(reAson: string, textAreAStAte: TextAreAStAte): void {
		if (!this._hAsFocus) {
			textAreAStAte = textAreAStAte.collApseSelection();
		}

		textAreAStAte.writeToTextAreA(reAson, this._textAreA, this._hAsFocus);
		this._textAreAStAte = textAreAStAte;
	}

	public writeScreenReAderContent(reAson: string): void {
		if (this._isDoingComposition) {
			// Do not write to the text AreA when doing composition
			return;
		}

		this._setAndWriteTextAreAStAte(reAson, this._host.getScreenReAderContent(this._textAreAStAte));
	}

	privAte _ensureClipboArdGetsEditorSelection(e: ClipboArdEvent): void {
		const dAtAToCopy = this._host.getDAtAToCopy(ClipboArdEventUtils.cAnUseTextDAtA(e) && BrowserFeAtures.clipboArd.richText);
		const storedMetAdAtA: ClipboArdStoredMetAdAtA = {
			version: 1,
			isFromEmptySelection: dAtAToCopy.isFromEmptySelection,
			multicursorText: dAtAToCopy.multicursorText,
			mode: dAtAToCopy.mode
		};
		InMemoryClipboArdMetAdAtAMAnAger.INSTANCE.set(
			// When writing "LINE\r\n" to the clipboArd And then pAsting,
			// Firefox pAstes "LINE\n", so let's work Around this quirk
			(browser.isFirefox ? dAtAToCopy.text.replAce(/\r\n/g, '\n') : dAtAToCopy.text),
			storedMetAdAtA
		);

		if (!ClipboArdEventUtils.cAnUseTextDAtA(e)) {
			// Looks like An old browser. The strAtegy is to plAce the text
			// we'd like to be copied to the clipboArd in the textAreA And select it.
			this._setAndWriteTextAreAStAte('copy or cut', TextAreAStAte.selectedText(dAtAToCopy.text));
			return;
		}

		ClipboArdEventUtils.setTextDAtA(e, dAtAToCopy.text, dAtAToCopy.html, storedMetAdAtA);
	}

	privAte _firePAste(text: string, metAdAtA: ClipboArdStoredMetAdAtA | null): void {
		if (!metAdAtA) {
			// try the in-memory store
			metAdAtA = InMemoryClipboArdMetAdAtAMAnAger.INSTANCE.get(text);
		}
		this._onPAste.fire({
			text: text,
			metAdAtA: metAdAtA
		});
	}
}

clAss ClipboArdEventUtils {

	public stAtic cAnUseTextDAtA(e: ClipboArdEvent): booleAn {
		if (e.clipboArdDAtA) {
			return true;
		}
		if ((<Any>window).clipboArdDAtA) {
			return true;
		}
		return fAlse;
	}

	public stAtic getTextDAtA(e: ClipboArdEvent): [string, ClipboArdStoredMetAdAtA | null] {
		if (e.clipboArdDAtA) {
			e.preventDefAult();

			const text = e.clipboArdDAtA.getDAtA('text/plAin');
			let metAdAtA: ClipboArdStoredMetAdAtA | null = null;
			const rAwmetAdAtA = e.clipboArdDAtA.getDAtA('vscode-editor-dAtA');
			if (typeof rAwmetAdAtA === 'string') {
				try {
					metAdAtA = <ClipboArdStoredMetAdAtA>JSON.pArse(rAwmetAdAtA);
					if (metAdAtA.version !== 1) {
						metAdAtA = null;
					}
				} cAtch (err) {
					// no problem!
				}
			}

			return [text, metAdAtA];
		}

		if ((<Any>window).clipboArdDAtA) {
			e.preventDefAult();
			const text: string = (<Any>window).clipboArdDAtA.getDAtA('Text');
			return [text, null];
		}

		throw new Error('ClipboArdEventUtils.getTextDAtA: CAnnot use text dAtA!');
	}

	public stAtic setTextDAtA(e: ClipboArdEvent, text: string, html: string | null | undefined, metAdAtA: ClipboArdStoredMetAdAtA): void {
		if (e.clipboArdDAtA) {
			e.clipboArdDAtA.setDAtA('text/plAin', text);
			if (typeof html === 'string') {
				e.clipboArdDAtA.setDAtA('text/html', html);
			}
			e.clipboArdDAtA.setDAtA('vscode-editor-dAtA', JSON.stringify(metAdAtA));
			e.preventDefAult();
			return;
		}

		if ((<Any>window).clipboArdDAtA) {
			(<Any>window).clipboArdDAtA.setDAtA('Text', text);
			e.preventDefAult();
			return;
		}

		throw new Error('ClipboArdEventUtils.setTextDAtA: CAnnot use text dAtA!');
	}
}

clAss TextAreAWrApper extends DisposAble implements ITextAreAWrApper {

	privAte reAdonly _ActuAl: FAstDomNode<HTMLTextAreAElement>;
	privAte _ignoreSelectionChAngeTime: number;

	constructor(_textAreA: FAstDomNode<HTMLTextAreAElement>) {
		super();
		this._ActuAl = _textAreA;
		this._ignoreSelectionChAngeTime = 0;
	}

	public setIgnoreSelectionChAngeTime(reAson: string): void {
		this._ignoreSelectionChAngeTime = DAte.now();
	}

	public getIgnoreSelectionChAngeTime(): number {
		return this._ignoreSelectionChAngeTime;
	}

	public resetSelectionChAngeTime(): void {
		this._ignoreSelectionChAngeTime = 0;
	}

	public getVAlue(): string {
		// console.log('current vAlue: ' + this._textAreA.vAlue);
		return this._ActuAl.domNode.vAlue;
	}

	public setVAlue(reAson: string, vAlue: string): void {
		const textAreA = this._ActuAl.domNode;
		if (textAreA.vAlue === vAlue) {
			// No chAnge
			return;
		}
		// console.log('reAson: ' + reAson + ', current vAlue: ' + textAreA.vAlue + ' => new vAlue: ' + vAlue);
		this.setIgnoreSelectionChAngeTime('setVAlue');
		textAreA.vAlue = vAlue;
	}

	public getSelectionStArt(): number {
		return this._ActuAl.domNode.selectionStArt;
	}

	public getSelectionEnd(): number {
		return this._ActuAl.domNode.selectionEnd;
	}

	public setSelectionRAnge(reAson: string, selectionStArt: number, selectionEnd: number): void {
		const textAreA = this._ActuAl.domNode;

		let ActiveElement: Element | null = null;
		const shAdowRoot = dom.getShAdowRoot(textAreA);
		if (shAdowRoot) {
			ActiveElement = shAdowRoot.ActiveElement;
		} else {
			ActiveElement = document.ActiveElement;
		}

		const currentIsFocused = (ActiveElement === textAreA);
		const currentSelectionStArt = textAreA.selectionStArt;
		const currentSelectionEnd = textAreA.selectionEnd;

		if (currentIsFocused && currentSelectionStArt === selectionStArt && currentSelectionEnd === selectionEnd) {
			// No chAnge
			// Firefox ifrAme bug https://github.com/microsoft/monAco-editor/issues/643#issuecomment-367871377
			if (browser.isFirefox && window.pArent !== window) {
				textAreA.focus();
			}
			return;
		}

		// console.log('reAson: ' + reAson + ', setSelectionRAnge: ' + selectionStArt + ' -> ' + selectionEnd);

		if (currentIsFocused) {
			// No need to focus, only need to chAnge the selection rAnge
			this.setIgnoreSelectionChAngeTime('setSelectionRAnge');
			textAreA.setSelectionRAnge(selectionStArt, selectionEnd);
			if (browser.isFirefox && window.pArent !== window) {
				textAreA.focus();
			}
			return;
		}

		// If the focus is outside the textAreA, browsers will try reAlly hArd to reveAl the textAreA.
		// Here, we try to undo the browser's desperAte reveAl.
		try {
			const scrollStAte = dom.sAvePArentsScrollTop(textAreA);
			this.setIgnoreSelectionChAngeTime('setSelectionRAnge');
			textAreA.focus();
			textAreA.setSelectionRAnge(selectionStArt, selectionEnd);
			dom.restorePArentsScrollTop(textAreA, scrollStAte);
		} cAtch (e) {
			// Sometimes IE throws when setting selection (e.g. textAreA is off-DOM)
		}
	}
}
