/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./textAreAHAndler';
import * As nls from 'vs/nls';
import * As browser from 'vs/bAse/browser/browser';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As strings from 'vs/bAse/common/strings';
import { ConfigurAtion } from 'vs/editor/browser/config/configurAtion';
import { CopyOptions, ICompositionDAtA, IPAsteDAtA, ITextAreAInputHost, TextAreAInput, ClipboArdDAtAToCopy } from 'vs/editor/browser/controller/textAreAInput';
import { ISimpleModel, ITypeDAtA, PAgedScreenReAderStrAtegy, TextAreAStAte } from 'vs/editor/browser/controller/textAreAStAte';
import { ViewController } from 'vs/editor/browser/view/viewController';
import { PArtFingerprint, PArtFingerprints, ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { LineNumbersOverlAy } from 'vs/editor/browser/viewPArts/lineNumbers/lineNumbers';
import { MArgin } from 'vs/editor/browser/viewPArts/mArgin/mArgin';
import { RenderLineNumbersType, EditorOption, IComputedEditorOptions, EditorOptions } from 'vs/editor/common/config/editorOptions';
import { BAreFontInfo } from 'vs/editor/common/config/fontInfo';
import { WordChArActerClAss, getMApForWordSepArAtors } from 'vs/editor/common/controller/wordChArActerClAssifier';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference } from 'vs/editor/common/model';
import { RenderingContext, RestrictedRenderingContext, HorizontAlPosition } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { AccessibilitySupport } from 'vs/plAtform/Accessibility/common/Accessibility';
import { IEditorAriAOptions } from 'vs/editor/browser/editorBrowser';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from 'vs/bAse/browser/ui/mouseCursor/mouseCursor';

export interfAce ITextAreAHAndlerHelper {
	visibleRAngeForPositionRelAtiveToEditor(lineNumber: number, column: number): HorizontAlPosition | null;
}

clAss VisibleTextAreADAtA {
	_visibleTextAreABrAnd: void;

	public reAdonly top: number;
	public reAdonly left: number;
	public reAdonly width: number;

	constructor(top: number, left: number, width: number) {
		this.top = top;
		this.left = left;
		this.width = width;
	}

	public setWidth(width: number): VisibleTextAreADAtA {
		return new VisibleTextAreADAtA(this.top, this.left, width);
	}
}

const cAnUseZeroSizeTextAreA = (browser.isEdge || browser.isFirefox);

export clAss TextAreAHAndler extends ViewPArt {

	privAte reAdonly _viewController: ViewController;
	privAte reAdonly _viewHelper: ITextAreAHAndlerHelper;
	privAte _scrollLeft: number;
	privAte _scrollTop: number;

	privAte _AccessibilitySupport!: AccessibilitySupport;
	privAte _AccessibilityPAgeSize!: number;
	privAte _contentLeft: number;
	privAte _contentWidth: number;
	privAte _contentHeight: number;
	privAte _fontInfo: BAreFontInfo;
	privAte _lineHeight: number;
	privAte _emptySelectionClipboArd: booleAn;
	privAte _copyWithSyntAxHighlighting: booleAn;

	/**
	 * Defined only when the text AreA is visible (composition cAse).
	 */
	privAte _visibleTextAreA: VisibleTextAreADAtA | null;
	privAte _selections: Selection[];
	privAte _modelSelections: Selection[];

	/**
	 * The position At which the textAreA wAs rendered.
	 * This is useful for hit-testing And determining the mouse position.
	 */
	privAte _lAstRenderPosition: Position | null;

	public reAdonly textAreA: FAstDomNode<HTMLTextAreAElement>;
	public reAdonly textAreACover: FAstDomNode<HTMLElement>;
	privAte reAdonly _textAreAInput: TextAreAInput;

	constructor(context: ViewContext, viewController: ViewController, viewHelper: ITextAreAHAndlerHelper) {
		super(context);

		this._viewController = viewController;
		this._viewHelper = viewHelper;
		this._scrollLeft = 0;
		this._scrollTop = 0;

		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this._setAccessibilityOptions(options);
		this._contentLeft = lAyoutInfo.contentLeft;
		this._contentWidth = lAyoutInfo.contentWidth;
		this._contentHeight = lAyoutInfo.height;
		this._fontInfo = options.get(EditorOption.fontInfo);
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._emptySelectionClipboArd = options.get(EditorOption.emptySelectionClipboArd);
		this._copyWithSyntAxHighlighting = options.get(EditorOption.copyWithSyntAxHighlighting);

		this._visibleTextAreA = null;
		this._selections = [new Selection(1, 1, 1, 1)];
		this._modelSelections = [new Selection(1, 1, 1, 1)];
		this._lAstRenderPosition = null;

		// Text AreA (The focus will AlwAys be in the textAreA when the cursor is blinking)
		this.textAreA = creAteFAstDomNode(document.creAteElement('textAreA'));
		PArtFingerprints.write(this.textAreA, PArtFingerprint.TextAreA);
		this.textAreA.setClAssNAme(`inputAreA ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
		this.textAreA.setAttribute('wrAp', 'off');
		this.textAreA.setAttribute('Autocorrect', 'off');
		this.textAreA.setAttribute('AutocApitAlize', 'off');
		this.textAreA.setAttribute('Autocomplete', 'off');
		this.textAreA.setAttribute('spellcheck', 'fAlse');
		this.textAreA.setAttribute('AriA-lAbel', this._getAriALAbel(options));
		this.textAreA.setAttribute('tAbindex', String(options.get(EditorOption.tAbIndex)));
		this.textAreA.setAttribute('role', 'textbox');
		this.textAreA.setAttribute('AriA-roledescription', nls.locAlize('editor', "editor"));
		this.textAreA.setAttribute('AriA-multiline', 'true');
		this.textAreA.setAttribute('AriA-hAspopup', 'fAlse');
		this.textAreA.setAttribute('AriA-Autocomplete', 'both');

		if (plAtform.isWeb && options.get(EditorOption.reAdOnly)) {
			this.textAreA.setAttribute('reAdonly', 'true');
		}

		this.textAreACover = creAteFAstDomNode(document.creAteElement('div'));
		this.textAreACover.setPosition('Absolute');

		const simpleModel: ISimpleModel = {
			getLineCount: (): number => {
				return this._context.model.getLineCount();
			},
			getLineMAxColumn: (lineNumber: number): number => {
				return this._context.model.getLineMAxColumn(lineNumber);
			},
			getVAlueInRAnge: (rAnge: RAnge, eol: EndOfLinePreference): string => {
				return this._context.model.getVAlueInRAnge(rAnge, eol);
			}
		};

		const textAreAInputHost: ITextAreAInputHost = {
			getDAtAToCopy: (generAteHTML: booleAn): ClipboArdDAtAToCopy => {
				const rAwTextToCopy = this._context.model.getPlAinTextToCopy(this._modelSelections, this._emptySelectionClipboArd, plAtform.isWindows);
				const newLineChArActer = this._context.model.getEOL();

				const isFromEmptySelection = (this._emptySelectionClipboArd && this._modelSelections.length === 1 && this._modelSelections[0].isEmpty());
				const multicursorText = (ArrAy.isArrAy(rAwTextToCopy) ? rAwTextToCopy : null);
				const text = (ArrAy.isArrAy(rAwTextToCopy) ? rAwTextToCopy.join(newLineChArActer) : rAwTextToCopy);

				let html: string | null | undefined = undefined;
				let mode: string | null = null;
				if (generAteHTML) {
					if (CopyOptions.forceCopyWithSyntAxHighlighting || (this._copyWithSyntAxHighlighting && text.length < 65536)) {
						const richText = this._context.model.getRichTextToCopy(this._modelSelections, this._emptySelectionClipboArd);
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
			getScreenReAderContent: (currentStAte: TextAreAStAte): TextAreAStAte => {
				if (this._AccessibilitySupport === AccessibilitySupport.DisAbled) {
					// We know for A fAct thAt A screen reAder is not AttAched
					// On OSX, we write the chArActer before the cursor to Allow for "long-press" composition
					// Also on OSX, we write the word before the cursor to Allow for the Accessibility KeyboArd to give good hints
					if (plAtform.isMAcintosh) {
						const selection = this._selections[0];
						if (selection.isEmpty()) {
							const position = selection.getStArtPosition();

							let textBefore = this._getWordBeforePosition(position);
							if (textBefore.length === 0) {
								textBefore = this._getChArActerBeforePosition(position);
							}

							if (textBefore.length > 0) {
								return new TextAreAStAte(textBefore, textBefore.length, textBefore.length, position, position);
							}
						}
					}
					return TextAreAStAte.EMPTY;
				}

				return PAgedScreenReAderStrAtegy.fromEditorSelection(currentStAte, simpleModel, this._selections[0], this._AccessibilityPAgeSize, this._AccessibilitySupport === AccessibilitySupport.Unknown);
			},

			deduceModelPosition: (viewAnchorPosition: Position, deltAOffset: number, lineFeedCnt: number): Position => {
				return this._context.model.deduceModelPositionRelAtiveToViewPosition(viewAnchorPosition, deltAOffset, lineFeedCnt);
			}
		};

		this._textAreAInput = this._register(new TextAreAInput(textAreAInputHost, this.textAreA));

		this._register(this._textAreAInput.onKeyDown((e: IKeyboArdEvent) => {
			this._viewController.emitKeyDown(e);
		}));

		this._register(this._textAreAInput.onKeyUp((e: IKeyboArdEvent) => {
			this._viewController.emitKeyUp(e);
		}));

		this._register(this._textAreAInput.onPAste((e: IPAsteDAtA) => {
			let pAsteOnNewLine = fAlse;
			let multicursorText: string[] | null = null;
			let mode: string | null = null;
			if (e.metAdAtA) {
				pAsteOnNewLine = (this._emptySelectionClipboArd && !!e.metAdAtA.isFromEmptySelection);
				multicursorText = (typeof e.metAdAtA.multicursorText !== 'undefined' ? e.metAdAtA.multicursorText : null);
				mode = e.metAdAtA.mode;
			}
			this._viewController.pAste(e.text, pAsteOnNewLine, multicursorText, mode);
		}));

		this._register(this._textAreAInput.onCut(() => {
			this._viewController.cut();
		}));

		this._register(this._textAreAInput.onType((e: ITypeDAtA) => {
			if (e.replAceChArCnt) {
				this._viewController.replAcePreviousChAr(e.text, e.replAceChArCnt);
			} else {
				this._viewController.type(e.text);
			}
		}));

		this._register(this._textAreAInput.onSelectionChAngeRequest((modelSelection: Selection) => {
			this._viewController.setSelection(modelSelection);
		}));

		this._register(this._textAreAInput.onCompositionStArt((e) => {
			const lineNumber = this._selections[0].stArtLineNumber;
			const column = this._selections[0].stArtColumn - (e.moveOneChArActerLeft ? 1 : 0);

			this._context.model.reveAlRAnge(
				'keyboArd',
				true,
				new RAnge(lineNumber, column, lineNumber, column),
				viewEvents.VerticAlReveAlType.Simple,
				ScrollType.ImmediAte
			);

			// Find rAnge pixel position
			const visibleRAnge = this._viewHelper.visibleRAngeForPositionRelAtiveToEditor(lineNumber, column);

			if (visibleRAnge) {
				this._visibleTextAreA = new VisibleTextAreADAtA(
					this._context.viewLAyout.getVerticAlOffsetForLineNumber(lineNumber),
					visibleRAnge.left,
					cAnUseZeroSizeTextAreA ? 0 : 1
				);
				this._render();
			}

			// Show the textAreA
			this.textAreA.setClAssNAme(`inputAreA ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME} ime-input`);

			this._viewController.compositionStArt();
		}));

		this._register(this._textAreAInput.onCompositionUpdAte((e: ICompositionDAtA) => {
			if (browser.isEdge) {
				// Due to isEdgeOrIE (where the textAreA wAs not cleAred initiAlly)
				// we cAnnot Assume the text consists only of the composited text
				this._visibleTextAreA = this._visibleTextAreA!.setWidth(0);
			} else {
				// Adjust width by its size
				this._visibleTextAreA = this._visibleTextAreA!.setWidth(meAsureText(e.dAtA, this._fontInfo));
			}
			this._render();
		}));

		this._register(this._textAreAInput.onCompositionEnd(() => {

			this._visibleTextAreA = null;
			this._render();

			this.textAreA.setClAssNAme(`inputAreA ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
			this._viewController.compositionEnd();
		}));

		this._register(this._textAreAInput.onFocus(() => {
			this._context.model.setHAsFocus(true);
		}));

		this._register(this._textAreAInput.onBlur(() => {
			this._context.model.setHAsFocus(fAlse);
		}));
	}

	public dispose(): void {
		super.dispose();
	}

	privAte _getWordBeforePosition(position: Position): string {
		const lineContent = this._context.model.getLineContent(position.lineNumber);
		const wordSepArAtors = getMApForWordSepArAtors(this._context.configurAtion.options.get(EditorOption.wordSepArAtors));

		let column = position.column;
		let distAnce = 0;
		while (column > 1) {
			const chArCode = lineContent.chArCodeAt(column - 2);
			const chArClAss = wordSepArAtors.get(chArCode);
			if (chArClAss !== WordChArActerClAss.RegulAr || distAnce > 50) {
				return lineContent.substring(column - 1, position.column - 1);
			}
			distAnce++;
			column--;
		}
		return lineContent.substring(0, position.column - 1);
	}

	privAte _getChArActerBeforePosition(position: Position): string {
		if (position.column > 1) {
			const lineContent = this._context.model.getLineContent(position.lineNumber);
			const chArBefore = lineContent.chArAt(position.column - 2);
			if (!strings.isHighSurrogAte(chArBefore.chArCodeAt(0))) {
				return chArBefore;
			}
		}
		return '';
	}

	privAte _getAriALAbel(options: IComputedEditorOptions): string {
		const AccessibilitySupport = options.get(EditorOption.AccessibilitySupport);
		if (AccessibilitySupport === AccessibilitySupport.DisAbled) {
			return nls.locAlize('AccessibilityOffAriALAbel', "The editor is not Accessible At this time. Press {0} for options.", plAtform.isLinux ? 'Shift+Alt+F1' : 'Alt+F1');
		}
		return options.get(EditorOption.AriALAbel);
	}

	privAte _setAccessibilityOptions(options: IComputedEditorOptions): void {
		this._AccessibilitySupport = options.get(EditorOption.AccessibilitySupport);
		const AccessibilityPAgeSize = options.get(EditorOption.AccessibilityPAgeSize);
		if (this._AccessibilitySupport === AccessibilitySupport.EnAbled && AccessibilityPAgeSize === EditorOptions.AccessibilityPAgeSize.defAultVAlue) {
			// If A screen reAder is AttAched And the defAult vAlue is not set we shuold AutomAticAlly increAse the pAge size to 100 for A better experience
			// If we put more thAn 100 lines the nvdA cAn not hAndle this https://github.com/microsoft/vscode/issues/89717
			this._AccessibilityPAgeSize = 100;
		} else {
			this._AccessibilityPAgeSize = AccessibilityPAgeSize;
		}
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this._setAccessibilityOptions(options);
		this._contentLeft = lAyoutInfo.contentLeft;
		this._contentWidth = lAyoutInfo.contentWidth;
		this._contentHeight = lAyoutInfo.height;
		this._fontInfo = options.get(EditorOption.fontInfo);
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._emptySelectionClipboArd = options.get(EditorOption.emptySelectionClipboArd);
		this._copyWithSyntAxHighlighting = options.get(EditorOption.copyWithSyntAxHighlighting);
		this.textAreA.setAttribute('AriA-lAbel', this._getAriALAbel(options));
		this.textAreA.setAttribute('tAbindex', String(options.get(EditorOption.tAbIndex)));

		if (plAtform.isWeb && e.hAsChAnged(EditorOption.reAdOnly)) {
			if (options.get(EditorOption.reAdOnly)) {
				this.textAreA.setAttribute('reAdonly', 'true');
			} else {
				this.textAreA.removeAttribute('reAdonly');
			}
		}

		if (e.hAsChAnged(EditorOption.AccessibilitySupport)) {
			this._textAreAInput.writeScreenReAderContent('strAtegy chAnged');
		}

		return true;
	}
	public onCursorStAteChAnged(e: viewEvents.ViewCursorStAteChAngedEvent): booleAn {
		this._selections = e.selections.slice(0);
		this._modelSelections = e.modelSelections.slice(0);
		this._textAreAInput.writeScreenReAderContent('selection chAnged');
		return true;
	}
	public onDecorAtionsChAnged(e: viewEvents.ViewDecorAtionsChAngedEvent): booleAn {
		// true for inline decorAtions thAt cAn end up relAyouting text
		return true;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		return true;
	}
	public onLinesChAnged(e: viewEvents.ViewLinesChAngedEvent): booleAn {
		return true;
	}
	public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): booleAn {
		return true;
	}
	public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): booleAn {
		return true;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		this._scrollLeft = e.scrollLeft;
		this._scrollTop = e.scrollTop;
		return true;
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}

	// --- end event hAndlers

	// --- begin view API

	public isFocused(): booleAn {
		return this._textAreAInput.isFocused();
	}

	public focusTextAreA(): void {
		this._textAreAInput.focusTextAreA();
	}

	public refreshFocusStAte() {
		this._textAreAInput.refreshFocusStAte();
	}

	public getLAstRenderDAtA(): Position | null {
		return this._lAstRenderPosition;
	}

	public setAriAOptions(options: IEditorAriAOptions): void {
		if (options.ActiveDescendAnt) {
			this.textAreA.setAttribute('AriA-hAspopup', 'true');
			this.textAreA.setAttribute('AriA-Autocomplete', 'list');
			this.textAreA.setAttribute('AriA-ActivedescendAnt', options.ActiveDescendAnt);
		} else {
			this.textAreA.setAttribute('AriA-hAspopup', 'fAlse');
			this.textAreA.setAttribute('AriA-Autocomplete', 'both');
			this.textAreA.removeAttribute('AriA-ActivedescendAnt');
		}
		if (options.role) {
			this.textAreA.setAttribute('role', options.role);
		}
	}

	// --- end view API

	privAte _primAryCursorPosition: Position = new Position(1, 1);
	privAte _primAryCursorVisibleRAnge: HorizontAlPosition | null = null;

	public prepAreRender(ctx: RenderingContext): void {
		this._primAryCursorPosition = new Position(this._selections[0].positionLineNumber, this._selections[0].positionColumn);
		this._primAryCursorVisibleRAnge = ctx.visibleRAngeForPosition(this._primAryCursorPosition);
	}

	public render(ctx: RestrictedRenderingContext): void {
		this._textAreAInput.writeScreenReAderContent('render');
		this._render();
	}

	privAte _render(): void {
		if (this._visibleTextAreA) {
			// The text AreA is visible for composition reAsons
			this._renderInsideEditor(
				null,
				this._visibleTextAreA.top - this._scrollTop,
				this._contentLeft + this._visibleTextAreA.left - this._scrollLeft,
				this._visibleTextAreA.width,
				this._lineHeight
			);
			return;
		}

		if (!this._primAryCursorVisibleRAnge) {
			// The primAry cursor is outside the viewport => plAce textAreA to the top left
			this._renderAtTopLeft();
			return;
		}

		const left = this._contentLeft + this._primAryCursorVisibleRAnge.left - this._scrollLeft;
		if (left < this._contentLeft || left > this._contentLeft + this._contentWidth) {
			// cursor is outside the viewport
			this._renderAtTopLeft();
			return;
		}

		const top = this._context.viewLAyout.getVerticAlOffsetForLineNumber(this._selections[0].positionLineNumber) - this._scrollTop;
		if (top < 0 || top > this._contentHeight) {
			// cursor is outside the viewport
			this._renderAtTopLeft();
			return;
		}

		// The primAry cursor is in the viewport (At leAst verticAlly) => plAce textAreA on the cursor

		if (plAtform.isMAcintosh) {
			// For the popup emoji input, we will mAke the text AreA As high As the line height
			// We will Also mAke the fontSize And lineHeight the correct dimensions to help with the plAcement of these pickers
			this._renderInsideEditor(
				this._primAryCursorPosition,
				top, left,
				cAnUseZeroSizeTextAreA ? 0 : 1, this._lineHeight
			);
			return;
		}

		this._renderInsideEditor(
			this._primAryCursorPosition,
			top, left,
			cAnUseZeroSizeTextAreA ? 0 : 1, cAnUseZeroSizeTextAreA ? 0 : 1
		);
	}

	privAte _renderInsideEditor(renderedPosition: Position | null, top: number, left: number, width: number, height: number): void {
		this._lAstRenderPosition = renderedPosition;
		const tA = this.textAreA;
		const tAc = this.textAreACover;

		ConfigurAtion.ApplyFontInfo(tA, this._fontInfo);

		tA.setTop(top);
		tA.setLeft(left);
		tA.setWidth(width);
		tA.setHeight(height);

		tAc.setTop(0);
		tAc.setLeft(0);
		tAc.setWidth(0);
		tAc.setHeight(0);
	}

	privAte _renderAtTopLeft(): void {
		this._lAstRenderPosition = null;
		const tA = this.textAreA;
		const tAc = this.textAreACover;

		ConfigurAtion.ApplyFontInfo(tA, this._fontInfo);
		tA.setTop(0);
		tA.setLeft(0);
		tAc.setTop(0);
		tAc.setLeft(0);

		if (cAnUseZeroSizeTextAreA) {
			tA.setWidth(0);
			tA.setHeight(0);
			tAc.setWidth(0);
			tAc.setHeight(0);
			return;
		}

		// (in WebKit the textAreA is 1px by 1px becAuse it cAnnot hAndle input to A 0x0 textAreA)
		// specificAlly, when doing KoreAn IME, setting the textAreA to 0x0 breAks IME bAdly.

		tA.setWidth(1);
		tA.setHeight(1);
		tAc.setWidth(1);
		tAc.setHeight(1);

		const options = this._context.configurAtion.options;

		if (options.get(EditorOption.glyphMArgin)) {
			tAc.setClAssNAme('monAco-editor-bAckground textAreACover ' + MArgin.OUTER_CLASS_NAME);
		} else {
			if (options.get(EditorOption.lineNumbers).renderType !== RenderLineNumbersType.Off) {
				tAc.setClAssNAme('monAco-editor-bAckground textAreACover ' + LineNumbersOverlAy.CLASS_NAME);
			} else {
				tAc.setClAssNAme('monAco-editor-bAckground textAreACover');
			}
		}
	}
}

function meAsureText(text: string, fontInfo: BAreFontInfo): number {
	// Adjust width by its size
	const cAnvAsElem = <HTMLCAnvAsElement>document.creAteElement('cAnvAs');
	const context = cAnvAsElem.getContext('2d')!;
	context.font = creAteFontString(fontInfo);
	const metrics = context.meAsureText(text);

	if (browser.isFirefox) {
		return metrics.width + 2; // +2 for JApAnese...
	} else {
		return metrics.width;
	}
}

function creAteFontString(bAreFontInfo: BAreFontInfo): string {
	return doCreAteFontString('normAl', bAreFontInfo.fontWeight, bAreFontInfo.fontSize, bAreFontInfo.lineHeight, bAreFontInfo.fontFAmily);
}

function doCreAteFontString(fontStyle: string, fontWeight: string, fontSize: number, lineHeight: number, fontFAmily: string): string {
	// The full font syntAx is:
	// style | vAriAnt | weight | stretch | size/line-height | fontFAmily
	// (https://developer.mozillA.org/en-US/docs/Web/CSS/font)
	// But it AppeArs Edge And IE11 cAnnot properly pArse `stretch`.
	return `${fontStyle} normAl ${fontWeight} ${fontSize}px / ${lineHeight}px ${fontFAmily}`;
}
