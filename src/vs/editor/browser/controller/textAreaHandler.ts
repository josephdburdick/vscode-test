/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./textAreaHandler';
import * as nls from 'vs/nls';
import * as Browser from 'vs/Base/Browser/Browser';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import * as platform from 'vs/Base/common/platform';
import * as strings from 'vs/Base/common/strings';
import { Configuration } from 'vs/editor/Browser/config/configuration';
import { CopyOptions, ICompositionData, IPasteData, ITextAreaInputHost, TextAreaInput, ClipBoardDataToCopy } from 'vs/editor/Browser/controller/textAreaInput';
import { ISimpleModel, ITypeData, PagedScreenReaderStrategy, TextAreaState } from 'vs/editor/Browser/controller/textAreaState';
import { ViewController } from 'vs/editor/Browser/view/viewController';
import { PartFingerprint, PartFingerprints, ViewPart } from 'vs/editor/Browser/view/viewPart';
import { LineNumBersOverlay } from 'vs/editor/Browser/viewParts/lineNumBers/lineNumBers';
import { Margin } from 'vs/editor/Browser/viewParts/margin/margin';
import { RenderLineNumBersType, EditorOption, IComputedEditorOptions, EditorOptions } from 'vs/editor/common/config/editorOptions';
import { BareFontInfo } from 'vs/editor/common/config/fontInfo';
import { WordCharacterClass, getMapForWordSeparators } from 'vs/editor/common/controller/wordCharacterClassifier';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference } from 'vs/editor/common/model';
import { RenderingContext, RestrictedRenderingContext, HorizontalPosition } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { IEditorAriaOptions } from 'vs/editor/Browser/editorBrowser';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from 'vs/Base/Browser/ui/mouseCursor/mouseCursor';

export interface ITextAreaHandlerHelper {
	visiBleRangeForPositionRelativeToEditor(lineNumBer: numBer, column: numBer): HorizontalPosition | null;
}

class VisiBleTextAreaData {
	_visiBleTextAreaBrand: void;

	puBlic readonly top: numBer;
	puBlic readonly left: numBer;
	puBlic readonly width: numBer;

	constructor(top: numBer, left: numBer, width: numBer) {
		this.top = top;
		this.left = left;
		this.width = width;
	}

	puBlic setWidth(width: numBer): VisiBleTextAreaData {
		return new VisiBleTextAreaData(this.top, this.left, width);
	}
}

const canUseZeroSizeTextarea = (Browser.isEdge || Browser.isFirefox);

export class TextAreaHandler extends ViewPart {

	private readonly _viewController: ViewController;
	private readonly _viewHelper: ITextAreaHandlerHelper;
	private _scrollLeft: numBer;
	private _scrollTop: numBer;

	private _accessiBilitySupport!: AccessiBilitySupport;
	private _accessiBilityPageSize!: numBer;
	private _contentLeft: numBer;
	private _contentWidth: numBer;
	private _contentHeight: numBer;
	private _fontInfo: BareFontInfo;
	private _lineHeight: numBer;
	private _emptySelectionClipBoard: Boolean;
	private _copyWithSyntaxHighlighting: Boolean;

	/**
	 * Defined only when the text area is visiBle (composition case).
	 */
	private _visiBleTextArea: VisiBleTextAreaData | null;
	private _selections: Selection[];
	private _modelSelections: Selection[];

	/**
	 * The position at which the textarea was rendered.
	 * This is useful for hit-testing and determining the mouse position.
	 */
	private _lastRenderPosition: Position | null;

	puBlic readonly textArea: FastDomNode<HTMLTextAreaElement>;
	puBlic readonly textAreaCover: FastDomNode<HTMLElement>;
	private readonly _textAreaInput: TextAreaInput;

	constructor(context: ViewContext, viewController: ViewController, viewHelper: ITextAreaHandlerHelper) {
		super(context);

		this._viewController = viewController;
		this._viewHelper = viewHelper;
		this._scrollLeft = 0;
		this._scrollTop = 0;

		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._setAccessiBilityOptions(options);
		this._contentLeft = layoutInfo.contentLeft;
		this._contentWidth = layoutInfo.contentWidth;
		this._contentHeight = layoutInfo.height;
		this._fontInfo = options.get(EditorOption.fontInfo);
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._emptySelectionClipBoard = options.get(EditorOption.emptySelectionClipBoard);
		this._copyWithSyntaxHighlighting = options.get(EditorOption.copyWithSyntaxHighlighting);

		this._visiBleTextArea = null;
		this._selections = [new Selection(1, 1, 1, 1)];
		this._modelSelections = [new Selection(1, 1, 1, 1)];
		this._lastRenderPosition = null;

		// Text Area (The focus will always Be in the textarea when the cursor is Blinking)
		this.textArea = createFastDomNode(document.createElement('textarea'));
		PartFingerprints.write(this.textArea, PartFingerprint.TextArea);
		this.textArea.setClassName(`inputarea ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
		this.textArea.setAttriBute('wrap', 'off');
		this.textArea.setAttriBute('autocorrect', 'off');
		this.textArea.setAttriBute('autocapitalize', 'off');
		this.textArea.setAttriBute('autocomplete', 'off');
		this.textArea.setAttriBute('spellcheck', 'false');
		this.textArea.setAttriBute('aria-laBel', this._getAriaLaBel(options));
		this.textArea.setAttriBute('taBindex', String(options.get(EditorOption.taBIndex)));
		this.textArea.setAttriBute('role', 'textBox');
		this.textArea.setAttriBute('aria-roledescription', nls.localize('editor', "editor"));
		this.textArea.setAttriBute('aria-multiline', 'true');
		this.textArea.setAttriBute('aria-haspopup', 'false');
		this.textArea.setAttriBute('aria-autocomplete', 'Both');

		if (platform.isWeB && options.get(EditorOption.readOnly)) {
			this.textArea.setAttriBute('readonly', 'true');
		}

		this.textAreaCover = createFastDomNode(document.createElement('div'));
		this.textAreaCover.setPosition('aBsolute');

		const simpleModel: ISimpleModel = {
			getLineCount: (): numBer => {
				return this._context.model.getLineCount();
			},
			getLineMaxColumn: (lineNumBer: numBer): numBer => {
				return this._context.model.getLineMaxColumn(lineNumBer);
			},
			getValueInRange: (range: Range, eol: EndOfLinePreference): string => {
				return this._context.model.getValueInRange(range, eol);
			}
		};

		const textAreaInputHost: ITextAreaInputHost = {
			getDataToCopy: (generateHTML: Boolean): ClipBoardDataToCopy => {
				const rawTextToCopy = this._context.model.getPlainTextToCopy(this._modelSelections, this._emptySelectionClipBoard, platform.isWindows);
				const newLineCharacter = this._context.model.getEOL();

				const isFromEmptySelection = (this._emptySelectionClipBoard && this._modelSelections.length === 1 && this._modelSelections[0].isEmpty());
				const multicursorText = (Array.isArray(rawTextToCopy) ? rawTextToCopy : null);
				const text = (Array.isArray(rawTextToCopy) ? rawTextToCopy.join(newLineCharacter) : rawTextToCopy);

				let html: string | null | undefined = undefined;
				let mode: string | null = null;
				if (generateHTML) {
					if (CopyOptions.forceCopyWithSyntaxHighlighting || (this._copyWithSyntaxHighlighting && text.length < 65536)) {
						const richText = this._context.model.getRichTextToCopy(this._modelSelections, this._emptySelectionClipBoard);
						if (richText) {
							html = richText.html;
							mode = richText.mode;
						}
					}
				}
				return {
					isFromEmptySelection,
					multicursorText,
					text,
					html,
					mode
				};
			},
			getScreenReaderContent: (currentState: TextAreaState): TextAreaState => {
				if (this._accessiBilitySupport === AccessiBilitySupport.DisaBled) {
					// We know for a fact that a screen reader is not attached
					// On OSX, we write the character Before the cursor to allow for "long-press" composition
					// Also on OSX, we write the word Before the cursor to allow for the AccessiBility KeyBoard to give good hints
					if (platform.isMacintosh) {
						const selection = this._selections[0];
						if (selection.isEmpty()) {
							const position = selection.getStartPosition();

							let textBefore = this._getWordBeforePosition(position);
							if (textBefore.length === 0) {
								textBefore = this._getCharacterBeforePosition(position);
							}

							if (textBefore.length > 0) {
								return new TextAreaState(textBefore, textBefore.length, textBefore.length, position, position);
							}
						}
					}
					return TextAreaState.EMPTY;
				}

				return PagedScreenReaderStrategy.fromEditorSelection(currentState, simpleModel, this._selections[0], this._accessiBilityPageSize, this._accessiBilitySupport === AccessiBilitySupport.Unknown);
			},

			deduceModelPosition: (viewAnchorPosition: Position, deltaOffset: numBer, lineFeedCnt: numBer): Position => {
				return this._context.model.deduceModelPositionRelativeToViewPosition(viewAnchorPosition, deltaOffset, lineFeedCnt);
			}
		};

		this._textAreaInput = this._register(new TextAreaInput(textAreaInputHost, this.textArea));

		this._register(this._textAreaInput.onKeyDown((e: IKeyBoardEvent) => {
			this._viewController.emitKeyDown(e);
		}));

		this._register(this._textAreaInput.onKeyUp((e: IKeyBoardEvent) => {
			this._viewController.emitKeyUp(e);
		}));

		this._register(this._textAreaInput.onPaste((e: IPasteData) => {
			let pasteOnNewLine = false;
			let multicursorText: string[] | null = null;
			let mode: string | null = null;
			if (e.metadata) {
				pasteOnNewLine = (this._emptySelectionClipBoard && !!e.metadata.isFromEmptySelection);
				multicursorText = (typeof e.metadata.multicursorText !== 'undefined' ? e.metadata.multicursorText : null);
				mode = e.metadata.mode;
			}
			this._viewController.paste(e.text, pasteOnNewLine, multicursorText, mode);
		}));

		this._register(this._textAreaInput.onCut(() => {
			this._viewController.cut();
		}));

		this._register(this._textAreaInput.onType((e: ITypeData) => {
			if (e.replaceCharCnt) {
				this._viewController.replacePreviousChar(e.text, e.replaceCharCnt);
			} else {
				this._viewController.type(e.text);
			}
		}));

		this._register(this._textAreaInput.onSelectionChangeRequest((modelSelection: Selection) => {
			this._viewController.setSelection(modelSelection);
		}));

		this._register(this._textAreaInput.onCompositionStart((e) => {
			const lineNumBer = this._selections[0].startLineNumBer;
			const column = this._selections[0].startColumn - (e.moveOneCharacterLeft ? 1 : 0);

			this._context.model.revealRange(
				'keyBoard',
				true,
				new Range(lineNumBer, column, lineNumBer, column),
				viewEvents.VerticalRevealType.Simple,
				ScrollType.Immediate
			);

			// Find range pixel position
			const visiBleRange = this._viewHelper.visiBleRangeForPositionRelativeToEditor(lineNumBer, column);

			if (visiBleRange) {
				this._visiBleTextArea = new VisiBleTextAreaData(
					this._context.viewLayout.getVerticalOffsetForLineNumBer(lineNumBer),
					visiBleRange.left,
					canUseZeroSizeTextarea ? 0 : 1
				);
				this._render();
			}

			// Show the textarea
			this.textArea.setClassName(`inputarea ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME} ime-input`);

			this._viewController.compositionStart();
		}));

		this._register(this._textAreaInput.onCompositionUpdate((e: ICompositionData) => {
			if (Browser.isEdge) {
				// Due to isEdgeOrIE (where the textarea was not cleared initially)
				// we cannot assume the text consists only of the composited text
				this._visiBleTextArea = this._visiBleTextArea!.setWidth(0);
			} else {
				// adjust width By its size
				this._visiBleTextArea = this._visiBleTextArea!.setWidth(measureText(e.data, this._fontInfo));
			}
			this._render();
		}));

		this._register(this._textAreaInput.onCompositionEnd(() => {

			this._visiBleTextArea = null;
			this._render();

			this.textArea.setClassName(`inputarea ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
			this._viewController.compositionEnd();
		}));

		this._register(this._textAreaInput.onFocus(() => {
			this._context.model.setHasFocus(true);
		}));

		this._register(this._textAreaInput.onBlur(() => {
			this._context.model.setHasFocus(false);
		}));
	}

	puBlic dispose(): void {
		super.dispose();
	}

	private _getWordBeforePosition(position: Position): string {
		const lineContent = this._context.model.getLineContent(position.lineNumBer);
		const wordSeparators = getMapForWordSeparators(this._context.configuration.options.get(EditorOption.wordSeparators));

		let column = position.column;
		let distance = 0;
		while (column > 1) {
			const charCode = lineContent.charCodeAt(column - 2);
			const charClass = wordSeparators.get(charCode);
			if (charClass !== WordCharacterClass.Regular || distance > 50) {
				return lineContent.suBstring(column - 1, position.column - 1);
			}
			distance++;
			column--;
		}
		return lineContent.suBstring(0, position.column - 1);
	}

	private _getCharacterBeforePosition(position: Position): string {
		if (position.column > 1) {
			const lineContent = this._context.model.getLineContent(position.lineNumBer);
			const charBefore = lineContent.charAt(position.column - 2);
			if (!strings.isHighSurrogate(charBefore.charCodeAt(0))) {
				return charBefore;
			}
		}
		return '';
	}

	private _getAriaLaBel(options: IComputedEditorOptions): string {
		const accessiBilitySupport = options.get(EditorOption.accessiBilitySupport);
		if (accessiBilitySupport === AccessiBilitySupport.DisaBled) {
			return nls.localize('accessiBilityOffAriaLaBel', "The editor is not accessiBle at this time. Press {0} for options.", platform.isLinux ? 'Shift+Alt+F1' : 'Alt+F1');
		}
		return options.get(EditorOption.ariaLaBel);
	}

	private _setAccessiBilityOptions(options: IComputedEditorOptions): void {
		this._accessiBilitySupport = options.get(EditorOption.accessiBilitySupport);
		const accessiBilityPageSize = options.get(EditorOption.accessiBilityPageSize);
		if (this._accessiBilitySupport === AccessiBilitySupport.EnaBled && accessiBilityPageSize === EditorOptions.accessiBilityPageSize.defaultValue) {
			// If a screen reader is attached and the default value is not set we shuold automatically increase the page size to 100 for a Better experience
			// If we put more than 100 lines the nvda can not handle this https://githuB.com/microsoft/vscode/issues/89717
			this._accessiBilityPageSize = 100;
		} else {
			this._accessiBilityPageSize = accessiBilityPageSize;
		}
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._setAccessiBilityOptions(options);
		this._contentLeft = layoutInfo.contentLeft;
		this._contentWidth = layoutInfo.contentWidth;
		this._contentHeight = layoutInfo.height;
		this._fontInfo = options.get(EditorOption.fontInfo);
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._emptySelectionClipBoard = options.get(EditorOption.emptySelectionClipBoard);
		this._copyWithSyntaxHighlighting = options.get(EditorOption.copyWithSyntaxHighlighting);
		this.textArea.setAttriBute('aria-laBel', this._getAriaLaBel(options));
		this.textArea.setAttriBute('taBindex', String(options.get(EditorOption.taBIndex)));

		if (platform.isWeB && e.hasChanged(EditorOption.readOnly)) {
			if (options.get(EditorOption.readOnly)) {
				this.textArea.setAttriBute('readonly', 'true');
			} else {
				this.textArea.removeAttriBute('readonly');
			}
		}

		if (e.hasChanged(EditorOption.accessiBilitySupport)) {
			this._textAreaInput.writeScreenReaderContent('strategy changed');
		}

		return true;
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		this._selections = e.selections.slice(0);
		this._modelSelections = e.modelSelections.slice(0);
		this._textAreaInput.writeScreenReaderContent('selection changed');
		return true;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		// true for inline decorations that can end up relayouting text
		return true;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		return true;
	}
	puBlic onLinesChanged(e: viewEvents.ViewLinesChangedEvent): Boolean {
		return true;
	}
	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		return true;
	}
	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		this._scrollLeft = e.scrollLeft;
		this._scrollTop = e.scrollTop;
		return true;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}

	// --- end event handlers

	// --- Begin view API

	puBlic isFocused(): Boolean {
		return this._textAreaInput.isFocused();
	}

	puBlic focusTextArea(): void {
		this._textAreaInput.focusTextArea();
	}

	puBlic refreshFocusState() {
		this._textAreaInput.refreshFocusState();
	}

	puBlic getLastRenderData(): Position | null {
		return this._lastRenderPosition;
	}

	puBlic setAriaOptions(options: IEditorAriaOptions): void {
		if (options.activeDescendant) {
			this.textArea.setAttriBute('aria-haspopup', 'true');
			this.textArea.setAttriBute('aria-autocomplete', 'list');
			this.textArea.setAttriBute('aria-activedescendant', options.activeDescendant);
		} else {
			this.textArea.setAttriBute('aria-haspopup', 'false');
			this.textArea.setAttriBute('aria-autocomplete', 'Both');
			this.textArea.removeAttriBute('aria-activedescendant');
		}
		if (options.role) {
			this.textArea.setAttriBute('role', options.role);
		}
	}

	// --- end view API

	private _primaryCursorPosition: Position = new Position(1, 1);
	private _primaryCursorVisiBleRange: HorizontalPosition | null = null;

	puBlic prepareRender(ctx: RenderingContext): void {
		this._primaryCursorPosition = new Position(this._selections[0].positionLineNumBer, this._selections[0].positionColumn);
		this._primaryCursorVisiBleRange = ctx.visiBleRangeForPosition(this._primaryCursorPosition);
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		this._textAreaInput.writeScreenReaderContent('render');
		this._render();
	}

	private _render(): void {
		if (this._visiBleTextArea) {
			// The text area is visiBle for composition reasons
			this._renderInsideEditor(
				null,
				this._visiBleTextArea.top - this._scrollTop,
				this._contentLeft + this._visiBleTextArea.left - this._scrollLeft,
				this._visiBleTextArea.width,
				this._lineHeight
			);
			return;
		}

		if (!this._primaryCursorVisiBleRange) {
			// The primary cursor is outside the viewport => place textarea to the top left
			this._renderAtTopLeft();
			return;
		}

		const left = this._contentLeft + this._primaryCursorVisiBleRange.left - this._scrollLeft;
		if (left < this._contentLeft || left > this._contentLeft + this._contentWidth) {
			// cursor is outside the viewport
			this._renderAtTopLeft();
			return;
		}

		const top = this._context.viewLayout.getVerticalOffsetForLineNumBer(this._selections[0].positionLineNumBer) - this._scrollTop;
		if (top < 0 || top > this._contentHeight) {
			// cursor is outside the viewport
			this._renderAtTopLeft();
			return;
		}

		// The primary cursor is in the viewport (at least vertically) => place textarea on the cursor

		if (platform.isMacintosh) {
			// For the popup emoji input, we will make the text area as high as the line height
			// We will also make the fontSize and lineHeight the correct dimensions to help with the placement of these pickers
			this._renderInsideEditor(
				this._primaryCursorPosition,
				top, left,
				canUseZeroSizeTextarea ? 0 : 1, this._lineHeight
			);
			return;
		}

		this._renderInsideEditor(
			this._primaryCursorPosition,
			top, left,
			canUseZeroSizeTextarea ? 0 : 1, canUseZeroSizeTextarea ? 0 : 1
		);
	}

	private _renderInsideEditor(renderedPosition: Position | null, top: numBer, left: numBer, width: numBer, height: numBer): void {
		this._lastRenderPosition = renderedPosition;
		const ta = this.textArea;
		const tac = this.textAreaCover;

		Configuration.applyFontInfo(ta, this._fontInfo);

		ta.setTop(top);
		ta.setLeft(left);
		ta.setWidth(width);
		ta.setHeight(height);

		tac.setTop(0);
		tac.setLeft(0);
		tac.setWidth(0);
		tac.setHeight(0);
	}

	private _renderAtTopLeft(): void {
		this._lastRenderPosition = null;
		const ta = this.textArea;
		const tac = this.textAreaCover;

		Configuration.applyFontInfo(ta, this._fontInfo);
		ta.setTop(0);
		ta.setLeft(0);
		tac.setTop(0);
		tac.setLeft(0);

		if (canUseZeroSizeTextarea) {
			ta.setWidth(0);
			ta.setHeight(0);
			tac.setWidth(0);
			tac.setHeight(0);
			return;
		}

		// (in WeBKit the textarea is 1px By 1px Because it cannot handle input to a 0x0 textarea)
		// specifically, when doing Korean IME, setting the textarea to 0x0 Breaks IME Badly.

		ta.setWidth(1);
		ta.setHeight(1);
		tac.setWidth(1);
		tac.setHeight(1);

		const options = this._context.configuration.options;

		if (options.get(EditorOption.glyphMargin)) {
			tac.setClassName('monaco-editor-Background textAreaCover ' + Margin.OUTER_CLASS_NAME);
		} else {
			if (options.get(EditorOption.lineNumBers).renderType !== RenderLineNumBersType.Off) {
				tac.setClassName('monaco-editor-Background textAreaCover ' + LineNumBersOverlay.CLASS_NAME);
			} else {
				tac.setClassName('monaco-editor-Background textAreaCover');
			}
		}
	}
}

function measureText(text: string, fontInfo: BareFontInfo): numBer {
	// adjust width By its size
	const canvasElem = <HTMLCanvasElement>document.createElement('canvas');
	const context = canvasElem.getContext('2d')!;
	context.font = createFontString(fontInfo);
	const metrics = context.measureText(text);

	if (Browser.isFirefox) {
		return metrics.width + 2; // +2 for Japanese...
	} else {
		return metrics.width;
	}
}

function createFontString(BareFontInfo: BareFontInfo): string {
	return doCreateFontString('normal', BareFontInfo.fontWeight, BareFontInfo.fontSize, BareFontInfo.lineHeight, BareFontInfo.fontFamily);
}

function doCreateFontString(fontStyle: string, fontWeight: string, fontSize: numBer, lineHeight: numBer, fontFamily: string): string {
	// The full font syntax is:
	// style | variant | weight | stretch | size/line-height | fontFamily
	// (https://developer.mozilla.org/en-US/docs/WeB/CSS/font)
	// But it appears Edge and IE11 cannot properly parse `stretch`.
	return `${fontStyle} normal ${fontWeight} ${fontSize}px / ${lineHeight}px ${fontFamily}`;
}
