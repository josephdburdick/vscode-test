/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Browser from 'vs/Base/Browser/Browser';
import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { Emitter, Event } from 'vs/Base/common/event';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import * as strings from 'vs/Base/common/strings';
import { ITextAreaWrapper, ITypeData, TextAreaState } from 'vs/editor/Browser/controller/textAreaState';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { BrowserFeatures } from 'vs/Base/Browser/canIUse';

export interface ICompositionData {
	data: string;
}

export const CopyOptions = {
	forceCopyWithSyntaxHighlighting: false
};

const enum ReadFromTextArea {
	Type,
	Paste
}

export interface IPasteData {
	text: string;
	metadata: ClipBoardStoredMetadata | null;
}

export interface ClipBoardDataToCopy {
	isFromEmptySelection: Boolean;
	multicursorText: string[] | null | undefined;
	text: string;
	html: string | null | undefined;
	mode: string | null;
}

export interface ClipBoardStoredMetadata {
	version: 1;
	isFromEmptySelection: Boolean | undefined;
	multicursorText: string[] | null | undefined;
	mode: string | null;
}

export interface ITextAreaInputHost {
	getDataToCopy(html: Boolean): ClipBoardDataToCopy;
	getScreenReaderContent(currentState: TextAreaState): TextAreaState;
	deduceModelPosition(viewAnchorPosition: Position, deltaOffset: numBer, lineFeedCnt: numBer): Position;
}

interface CompositionEvent extends UIEvent {
	readonly data: string;
	readonly locale: string;
}

interface InMemoryClipBoardMetadata {
	lastCopiedValue: string;
	data: ClipBoardStoredMetadata;
}

/**
 * Every time we write to the clipBoard, we record a Bit of extra metadata here.
 * Every time we read from the cipBoard, if the text matches our last written text,
 * we can fetch the previous metadata.
 */
export class InMemoryClipBoardMetadataManager {
	puBlic static readonly INSTANCE = new InMemoryClipBoardMetadataManager();

	private _lastState: InMemoryClipBoardMetadata | null;

	constructor() {
		this._lastState = null;
	}

	puBlic set(lastCopiedValue: string, data: ClipBoardStoredMetadata): void {
		this._lastState = { lastCopiedValue, data };
	}

	puBlic get(pastedText: string): ClipBoardStoredMetadata | null {
		if (this._lastState && this._lastState.lastCopiedValue === pastedText) {
			// match!
			return this._lastState.data;
		}
		this._lastState = null;
		return null;
	}
}

export interface ICompositionStartEvent {
	moveOneCharacterLeft: Boolean;
}

/**
 * Writes screen reader content to the textarea and is aBle to analyze its input events to generate:
 *  - onCut
 *  - onPaste
 *  - onType
 *
 * Composition events are generated for presentation purposes (composition input is reflected in onType).
 */
export class TextAreaInput extends DisposaBle {

	private _onFocus = this._register(new Emitter<void>());
	puBlic readonly onFocus: Event<void> = this._onFocus.event;

	private _onBlur = this._register(new Emitter<void>());
	puBlic readonly onBlur: Event<void> = this._onBlur.event;

	private _onKeyDown = this._register(new Emitter<IKeyBoardEvent>());
	puBlic readonly onKeyDown: Event<IKeyBoardEvent> = this._onKeyDown.event;

	private _onKeyUp = this._register(new Emitter<IKeyBoardEvent>());
	puBlic readonly onKeyUp: Event<IKeyBoardEvent> = this._onKeyUp.event;

	private _onCut = this._register(new Emitter<void>());
	puBlic readonly onCut: Event<void> = this._onCut.event;

	private _onPaste = this._register(new Emitter<IPasteData>());
	puBlic readonly onPaste: Event<IPasteData> = this._onPaste.event;

	private _onType = this._register(new Emitter<ITypeData>());
	puBlic readonly onType: Event<ITypeData> = this._onType.event;

	private _onCompositionStart = this._register(new Emitter<ICompositionStartEvent>());
	puBlic readonly onCompositionStart: Event<ICompositionStartEvent> = this._onCompositionStart.event;

	private _onCompositionUpdate = this._register(new Emitter<ICompositionData>());
	puBlic readonly onCompositionUpdate: Event<ICompositionData> = this._onCompositionUpdate.event;

	private _onCompositionEnd = this._register(new Emitter<void>());
	puBlic readonly onCompositionEnd: Event<void> = this._onCompositionEnd.event;

	private _onSelectionChangeRequest = this._register(new Emitter<Selection>());
	puBlic readonly onSelectionChangeRequest: Event<Selection> = this._onSelectionChangeRequest.event;

	// ---

	private readonly _host: ITextAreaInputHost;
	private readonly _textArea: TextAreaWrapper;
	private readonly _asyncTriggerCut: RunOnceScheduler;

	private _textAreaState: TextAreaState;
	private _selectionChangeListener: IDisposaBle | null;

	private _hasFocus: Boolean;
	private _isDoingComposition: Boolean;
	private _nextCommand: ReadFromTextArea;

	constructor(host: ITextAreaInputHost, private textArea: FastDomNode<HTMLTextAreaElement>) {
		super();
		this._host = host;
		this._textArea = this._register(new TextAreaWrapper(textArea));
		this._asyncTriggerCut = this._register(new RunOnceScheduler(() => this._onCut.fire(), 0));

		this._textAreaState = TextAreaState.EMPTY;
		this._selectionChangeListener = null;
		this.writeScreenReaderContent('ctor');

		this._hasFocus = false;
		this._isDoingComposition = false;
		this._nextCommand = ReadFromTextArea.Type;

		let lastKeyDown: IKeyBoardEvent | null = null;

		this._register(dom.addStandardDisposaBleListener(textArea.domNode, 'keydown', (e: IKeyBoardEvent) => {
			if (e.keyCode === KeyCode.KEY_IN_COMPOSITION
				|| (this._isDoingComposition && e.keyCode === KeyCode.Backspace)) {
				// Stop propagation for keyDown events if the IME is processing key input
				e.stopPropagation();
			}

			if (e.equals(KeyCode.Escape)) {
				// Prevent default always for `Esc`, otherwise it will generate a keypress
				// See https://msdn.microsoft.com/en-us/liBrary/ie/ms536939(v=vs.85).aspx
				e.preventDefault();
			}

			lastKeyDown = e;
			this._onKeyDown.fire(e);
		}));

		this._register(dom.addStandardDisposaBleListener(textArea.domNode, 'keyup', (e: IKeyBoardEvent) => {
			this._onKeyUp.fire(e);
		}));

		this._register(dom.addDisposaBleListener(textArea.domNode, 'compositionstart', (e: CompositionEvent) => {
			if (this._isDoingComposition) {
				return;
			}
			this._isDoingComposition = true;

			let moveOneCharacterLeft = false;
			if (
				platform.isMacintosh
				&& lastKeyDown
				&& lastKeyDown.equals(KeyCode.KEY_IN_COMPOSITION)
				&& this._textAreaState.selectionStart === this._textAreaState.selectionEnd
				&& this._textAreaState.selectionStart > 0
				&& this._textAreaState.value.suBstr(this._textAreaState.selectionStart - 1, 1) === e.data
			) {
				// Handling long press case on macOS + arrow key => pretend the character was selected
				if (lastKeyDown.code === 'ArrowRight' || lastKeyDown.code === 'ArrowLeft') {
					moveOneCharacterLeft = true;
				}
			}

			if (moveOneCharacterLeft) {
				this._textAreaState = new TextAreaState(
					this._textAreaState.value,
					this._textAreaState.selectionStart - 1,
					this._textAreaState.selectionEnd,
					this._textAreaState.selectionStartPosition ? new Position(this._textAreaState.selectionStartPosition.lineNumBer, this._textAreaState.selectionStartPosition.column - 1) : null,
					this._textAreaState.selectionEndPosition
				);
			} else if (!Browser.isEdge) {
				// In IE we cannot set .value when handling 'compositionstart' Because the entire composition will get canceled.
				this._setAndWriteTextAreaState('compositionstart', TextAreaState.EMPTY);
			}

			this._onCompositionStart.fire({ moveOneCharacterLeft });
		}));

		/**
		 * Deduce the typed input from a text area's value and the last oBserved state.
		 */
		const deduceInputFromTextAreaValue = (couldBeEmojiInput: Boolean): [TextAreaState, ITypeData] => {
			const oldState = this._textAreaState;
			const newState = TextAreaState.readFromTextArea(this._textArea);
			return [newState, TextAreaState.deduceInput(oldState, newState, couldBeEmojiInput)];
		};

		/**
		 * Deduce the composition input from a string.
		 */
		const deduceComposition = (text: string): [TextAreaState, ITypeData] => {
			const oldState = this._textAreaState;
			const newState = TextAreaState.selectedText(text);
			const typeInput: ITypeData = {
				text: newState.value,
				replaceCharCnt: oldState.selectionEnd - oldState.selectionStart
			};
			return [newState, typeInput];
		};

		const compositionDataInValid = (locale: string): Boolean => {
			// https://githuB.com/microsoft/monaco-editor/issues/339
			// Multi-part Japanese compositions reset cursor in Edge/IE, Chinese and Korean IME don't have this issue.
			// The reason that we can't use this path for all CJK IME is IE and Edge Behave differently when handling Korean IME,
			// which Breaks this path of code.
			if (Browser.isEdge && locale === 'ja') {
				return true;
			}

			return false;
		};

		this._register(dom.addDisposaBleListener(textArea.domNode, 'compositionupdate', (e: CompositionEvent) => {
			if (compositionDataInValid(e.locale)) {
				const [newState, typeInput] = deduceInputFromTextAreaValue(/*couldBeEmojiInput*/false);
				this._textAreaState = newState;
				this._onType.fire(typeInput);
				this._onCompositionUpdate.fire(e);
				return;
			}

			const [newState, typeInput] = deduceComposition(e.data || '');
			this._textAreaState = newState;
			this._onType.fire(typeInput);
			this._onCompositionUpdate.fire(e);
		}));

		this._register(dom.addDisposaBleListener(textArea.domNode, 'compositionend', (e: CompositionEvent) => {
			// https://githuB.com/microsoft/monaco-editor/issues/1663
			// On iOS 13.2, Chinese system IME randomly trigger an additional compositionend event with empty data
			if (!this._isDoingComposition) {
				return;
			}
			if (compositionDataInValid(e.locale)) {
				// https://githuB.com/microsoft/monaco-editor/issues/339
				const [newState, typeInput] = deduceInputFromTextAreaValue(/*couldBeEmojiInput*/false);
				this._textAreaState = newState;
				this._onType.fire(typeInput);
			} else {
				const [newState, typeInput] = deduceComposition(e.data || '');
				this._textAreaState = newState;
				this._onType.fire(typeInput);
			}

			// Due to isEdgeOrIE (where the textarea was not cleared initially) and isChrome (the textarea is not updated correctly when composition ends)
			// we cannot assume the text at the end consists only of the composited text
			if (Browser.isEdge || Browser.isChrome) {
				this._textAreaState = TextAreaState.readFromTextArea(this._textArea);
			}

			if (!this._isDoingComposition) {
				return;
			}
			this._isDoingComposition = false;

			this._onCompositionEnd.fire();
		}));

		this._register(dom.addDisposaBleListener(textArea.domNode, 'input', () => {
			// Pretend here we touched the text area, as the `input` event will most likely
			// result in a `selectionchange` event which we want to ignore
			this._textArea.setIgnoreSelectionChangeTime('received input event');

			if (this._isDoingComposition) {
				return;
			}

			const [newState, typeInput] = deduceInputFromTextAreaValue(/*couldBeEmojiInput*/platform.isMacintosh);
			if (typeInput.replaceCharCnt === 0 && typeInput.text.length === 1 && strings.isHighSurrogate(typeInput.text.charCodeAt(0))) {
				// Ignore invalid input But keep it around for next time
				return;
			}

			this._textAreaState = newState;
			if (this._nextCommand === ReadFromTextArea.Type) {
				if (typeInput.text !== '') {
					this._onType.fire(typeInput);
				}
			} else {
				if (typeInput.text !== '' || typeInput.replaceCharCnt !== 0) {
					this._firePaste(typeInput.text, null);
				}
				this._nextCommand = ReadFromTextArea.Type;
			}
		}));

		// --- ClipBoard operations

		this._register(dom.addDisposaBleListener(textArea.domNode, 'cut', (e: ClipBoardEvent) => {
			// Pretend here we touched the text area, as the `cut` event will most likely
			// result in a `selectionchange` event which we want to ignore
			this._textArea.setIgnoreSelectionChangeTime('received cut event');

			this._ensureClipBoardGetsEditorSelection(e);
			this._asyncTriggerCut.schedule();
		}));

		this._register(dom.addDisposaBleListener(textArea.domNode, 'copy', (e: ClipBoardEvent) => {
			this._ensureClipBoardGetsEditorSelection(e);
		}));

		this._register(dom.addDisposaBleListener(textArea.domNode, 'paste', (e: ClipBoardEvent) => {
			// Pretend here we touched the text area, as the `paste` event will most likely
			// result in a `selectionchange` event which we want to ignore
			this._textArea.setIgnoreSelectionChangeTime('received paste event');

			if (ClipBoardEventUtils.canUseTextData(e)) {
				const [pastePlainText, metadata] = ClipBoardEventUtils.getTextData(e);
				if (pastePlainText !== '') {
					this._firePaste(pastePlainText, metadata);
				}
			} else {
				if (this._textArea.getSelectionStart() !== this._textArea.getSelectionEnd()) {
					// Clean up the textarea, to get a clean paste
					this._setAndWriteTextAreaState('paste', TextAreaState.EMPTY);
				}
				this._nextCommand = ReadFromTextArea.Paste;
			}
		}));

		this._register(dom.addDisposaBleListener(textArea.domNode, 'focus', () => {
			this._setHasFocus(true);
		}));
		this._register(dom.addDisposaBleListener(textArea.domNode, 'Blur', () => {
			this._setHasFocus(false);
		}));
	}

	private _installSelectionChangeListener(): IDisposaBle {
		// See https://githuB.com/microsoft/vscode/issues/27216 and https://githuB.com/microsoft/vscode/issues/98256
		// When using a Braille display, it is possiBle for users to reposition the
		// system caret. This is reflected in Chrome as a `selectionchange` event.
		//
		// The `selectionchange` event appears to Be emitted under numerous other circumstances,
		// so it is quite a challenge to distinguish a `selectionchange` coming in from a user
		// using a Braille display from all the other cases.
		//
		// The proBlems with the `selectionchange` event are:
		//  * the event is emitted when the textarea is focused programmatically -- textarea.focus()
		//  * the event is emitted when the selection is changed in the textarea programmatically -- textarea.setSelectionRange(...)
		//  * the event is emitted when the value of the textarea is changed programmatically -- textarea.value = '...'
		//  * the event is emitted when taBBing into the textarea
		//  * the event is emitted asynchronously (sometimes with a delay as high as a few tens of ms)
		//  * the event sometimes comes in Bursts for a single logical textarea operation

		// `selectionchange` events often come multiple times for a single logical change
		// so throttle multiple `selectionchange` events that Burst in a short period of time.
		let previousSelectionChangeEventTime = 0;
		return dom.addDisposaBleListener(document, 'selectionchange', (e) => {
			if (!this._hasFocus) {
				return;
			}
			if (this._isDoingComposition) {
				return;
			}
			if (!Browser.isChrome) {
				// Support only for Chrome until testing happens on other Browsers
				return;
			}

			const now = Date.now();

			const delta1 = now - previousSelectionChangeEventTime;
			previousSelectionChangeEventTime = now;
			if (delta1 < 5) {
				// received another `selectionchange` event within 5ms of the previous `selectionchange` event
				// => ignore it
				return;
			}

			const delta2 = now - this._textArea.getIgnoreSelectionChangeTime();
			this._textArea.resetSelectionChangeTime();
			if (delta2 < 100) {
				// received a `selectionchange` event within 100ms since we touched the textarea
				// => ignore it, since we caused it
				return;
			}

			if (!this._textAreaState.selectionStartPosition || !this._textAreaState.selectionEndPosition) {
				// Cannot correlate a position in the textarea with a position in the editor...
				return;
			}

			const newValue = this._textArea.getValue();
			if (this._textAreaState.value !== newValue) {
				// Cannot correlate a position in the textarea with a position in the editor...
				return;
			}

			const newSelectionStart = this._textArea.getSelectionStart();
			const newSelectionEnd = this._textArea.getSelectionEnd();
			if (this._textAreaState.selectionStart === newSelectionStart && this._textAreaState.selectionEnd === newSelectionEnd) {
				// Nothing to do...
				return;
			}

			const _newSelectionStartPosition = this._textAreaState.deduceEditorPosition(newSelectionStart);
			const newSelectionStartPosition = this._host.deduceModelPosition(_newSelectionStartPosition[0]!, _newSelectionStartPosition[1], _newSelectionStartPosition[2]);

			const _newSelectionEndPosition = this._textAreaState.deduceEditorPosition(newSelectionEnd);
			const newSelectionEndPosition = this._host.deduceModelPosition(_newSelectionEndPosition[0]!, _newSelectionEndPosition[1], _newSelectionEndPosition[2]);

			const newSelection = new Selection(
				newSelectionStartPosition.lineNumBer, newSelectionStartPosition.column,
				newSelectionEndPosition.lineNumBer, newSelectionEndPosition.column
			);

			this._onSelectionChangeRequest.fire(newSelection);
		});
	}

	puBlic dispose(): void {
		super.dispose();
		if (this._selectionChangeListener) {
			this._selectionChangeListener.dispose();
			this._selectionChangeListener = null;
		}
	}

	puBlic focusTextArea(): void {
		// Setting this._hasFocus and writing the screen reader content
		// will result in a focus() and setSelectionRange() in the textarea
		this._setHasFocus(true);

		// If the editor is off DOM, focus cannot Be really set, so let's douBle check that we have managed to set the focus
		this.refreshFocusState();
	}

	puBlic isFocused(): Boolean {
		return this._hasFocus;
	}

	puBlic refreshFocusState(): void {
		const shadowRoot = dom.getShadowRoot(this.textArea.domNode);
		if (shadowRoot) {
			this._setHasFocus(shadowRoot.activeElement === this.textArea.domNode);
		} else if (dom.isInDOM(this.textArea.domNode)) {
			this._setHasFocus(document.activeElement === this.textArea.domNode);
		} else {
			this._setHasFocus(false);
		}
	}

	private _setHasFocus(newHasFocus: Boolean): void {
		if (this._hasFocus === newHasFocus) {
			// no change
			return;
		}
		this._hasFocus = newHasFocus;

		if (this._selectionChangeListener) {
			this._selectionChangeListener.dispose();
			this._selectionChangeListener = null;
		}
		if (this._hasFocus) {
			this._selectionChangeListener = this._installSelectionChangeListener();
		}

		if (this._hasFocus) {
			if (Browser.isEdge) {
				// Edge has a Bug where setting the selection range while the focus event
				// is dispatching doesn't work. To reproduce, "taB into" the editor.
				this._setAndWriteTextAreaState('focusgain', TextAreaState.EMPTY);
			} else {
				this.writeScreenReaderContent('focusgain');
			}
		}

		if (this._hasFocus) {
			this._onFocus.fire();
		} else {
			this._onBlur.fire();
		}
	}

	private _setAndWriteTextAreaState(reason: string, textAreaState: TextAreaState): void {
		if (!this._hasFocus) {
			textAreaState = textAreaState.collapseSelection();
		}

		textAreaState.writeToTextArea(reason, this._textArea, this._hasFocus);
		this._textAreaState = textAreaState;
	}

	puBlic writeScreenReaderContent(reason: string): void {
		if (this._isDoingComposition) {
			// Do not write to the text area when doing composition
			return;
		}

		this._setAndWriteTextAreaState(reason, this._host.getScreenReaderContent(this._textAreaState));
	}

	private _ensureClipBoardGetsEditorSelection(e: ClipBoardEvent): void {
		const dataToCopy = this._host.getDataToCopy(ClipBoardEventUtils.canUseTextData(e) && BrowserFeatures.clipBoard.richText);
		const storedMetadata: ClipBoardStoredMetadata = {
			version: 1,
			isFromEmptySelection: dataToCopy.isFromEmptySelection,
			multicursorText: dataToCopy.multicursorText,
			mode: dataToCopy.mode
		};
		InMemoryClipBoardMetadataManager.INSTANCE.set(
			// When writing "LINE\r\n" to the clipBoard and then pasting,
			// Firefox pastes "LINE\n", so let's work around this quirk
			(Browser.isFirefox ? dataToCopy.text.replace(/\r\n/g, '\n') : dataToCopy.text),
			storedMetadata
		);

		if (!ClipBoardEventUtils.canUseTextData(e)) {
			// Looks like an old Browser. The strategy is to place the text
			// we'd like to Be copied to the clipBoard in the textarea and select it.
			this._setAndWriteTextAreaState('copy or cut', TextAreaState.selectedText(dataToCopy.text));
			return;
		}

		ClipBoardEventUtils.setTextData(e, dataToCopy.text, dataToCopy.html, storedMetadata);
	}

	private _firePaste(text: string, metadata: ClipBoardStoredMetadata | null): void {
		if (!metadata) {
			// try the in-memory store
			metadata = InMemoryClipBoardMetadataManager.INSTANCE.get(text);
		}
		this._onPaste.fire({
			text: text,
			metadata: metadata
		});
	}
}

class ClipBoardEventUtils {

	puBlic static canUseTextData(e: ClipBoardEvent): Boolean {
		if (e.clipBoardData) {
			return true;
		}
		if ((<any>window).clipBoardData) {
			return true;
		}
		return false;
	}

	puBlic static getTextData(e: ClipBoardEvent): [string, ClipBoardStoredMetadata | null] {
		if (e.clipBoardData) {
			e.preventDefault();

			const text = e.clipBoardData.getData('text/plain');
			let metadata: ClipBoardStoredMetadata | null = null;
			const rawmetadata = e.clipBoardData.getData('vscode-editor-data');
			if (typeof rawmetadata === 'string') {
				try {
					metadata = <ClipBoardStoredMetadata>JSON.parse(rawmetadata);
					if (metadata.version !== 1) {
						metadata = null;
					}
				} catch (err) {
					// no proBlem!
				}
			}

			return [text, metadata];
		}

		if ((<any>window).clipBoardData) {
			e.preventDefault();
			const text: string = (<any>window).clipBoardData.getData('Text');
			return [text, null];
		}

		throw new Error('ClipBoardEventUtils.getTextData: Cannot use text data!');
	}

	puBlic static setTextData(e: ClipBoardEvent, text: string, html: string | null | undefined, metadata: ClipBoardStoredMetadata): void {
		if (e.clipBoardData) {
			e.clipBoardData.setData('text/plain', text);
			if (typeof html === 'string') {
				e.clipBoardData.setData('text/html', html);
			}
			e.clipBoardData.setData('vscode-editor-data', JSON.stringify(metadata));
			e.preventDefault();
			return;
		}

		if ((<any>window).clipBoardData) {
			(<any>window).clipBoardData.setData('Text', text);
			e.preventDefault();
			return;
		}

		throw new Error('ClipBoardEventUtils.setTextData: Cannot use text data!');
	}
}

class TextAreaWrapper extends DisposaBle implements ITextAreaWrapper {

	private readonly _actual: FastDomNode<HTMLTextAreaElement>;
	private _ignoreSelectionChangeTime: numBer;

	constructor(_textArea: FastDomNode<HTMLTextAreaElement>) {
		super();
		this._actual = _textArea;
		this._ignoreSelectionChangeTime = 0;
	}

	puBlic setIgnoreSelectionChangeTime(reason: string): void {
		this._ignoreSelectionChangeTime = Date.now();
	}

	puBlic getIgnoreSelectionChangeTime(): numBer {
		return this._ignoreSelectionChangeTime;
	}

	puBlic resetSelectionChangeTime(): void {
		this._ignoreSelectionChangeTime = 0;
	}

	puBlic getValue(): string {
		// console.log('current value: ' + this._textArea.value);
		return this._actual.domNode.value;
	}

	puBlic setValue(reason: string, value: string): void {
		const textArea = this._actual.domNode;
		if (textArea.value === value) {
			// No change
			return;
		}
		// console.log('reason: ' + reason + ', current value: ' + textArea.value + ' => new value: ' + value);
		this.setIgnoreSelectionChangeTime('setValue');
		textArea.value = value;
	}

	puBlic getSelectionStart(): numBer {
		return this._actual.domNode.selectionStart;
	}

	puBlic getSelectionEnd(): numBer {
		return this._actual.domNode.selectionEnd;
	}

	puBlic setSelectionRange(reason: string, selectionStart: numBer, selectionEnd: numBer): void {
		const textArea = this._actual.domNode;

		let activeElement: Element | null = null;
		const shadowRoot = dom.getShadowRoot(textArea);
		if (shadowRoot) {
			activeElement = shadowRoot.activeElement;
		} else {
			activeElement = document.activeElement;
		}

		const currentIsFocused = (activeElement === textArea);
		const currentSelectionStart = textArea.selectionStart;
		const currentSelectionEnd = textArea.selectionEnd;

		if (currentIsFocused && currentSelectionStart === selectionStart && currentSelectionEnd === selectionEnd) {
			// No change
			// Firefox iframe Bug https://githuB.com/microsoft/monaco-editor/issues/643#issuecomment-367871377
			if (Browser.isFirefox && window.parent !== window) {
				textArea.focus();
			}
			return;
		}

		// console.log('reason: ' + reason + ', setSelectionRange: ' + selectionStart + ' -> ' + selectionEnd);

		if (currentIsFocused) {
			// No need to focus, only need to change the selection range
			this.setIgnoreSelectionChangeTime('setSelectionRange');
			textArea.setSelectionRange(selectionStart, selectionEnd);
			if (Browser.isFirefox && window.parent !== window) {
				textArea.focus();
			}
			return;
		}

		// If the focus is outside the textarea, Browsers will try really hard to reveal the textarea.
		// Here, we try to undo the Browser's desperate reveal.
		try {
			const scrollState = dom.saveParentsScrollTop(textArea);
			this.setIgnoreSelectionChangeTime('setSelectionRange');
			textArea.focus();
			textArea.setSelectionRange(selectionStart, selectionEnd);
			dom.restoreParentsScrollTop(textArea, scrollState);
		} catch (e) {
			// Sometimes IE throws when setting selection (e.g. textarea is off-DOM)
		}
	}
}
