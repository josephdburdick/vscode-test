/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import * As strings from 'vs/bAse/common/strings';
import { ConfigurAtion } from 'vs/editor/browser/config/configurAtion';
import { TextEditorCursorStyle, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from 'vs/bAse/browser/ui/mouseCursor/mouseCursor';

export interfAce IViewCursorRenderDAtA {
	domNode: HTMLElement;
	position: Position;
	contentLeft: number;
	width: number;
	height: number;
}

clAss ViewCursorRenderDAtA {
	constructor(
		public reAdonly top: number,
		public reAdonly left: number,
		public reAdonly width: number,
		public reAdonly height: number,
		public reAdonly textContent: string,
		public reAdonly textContentClAssNAme: string
	) { }
}

export clAss ViewCursor {
	privAte reAdonly _context: ViewContext;
	privAte reAdonly _domNode: FAstDomNode<HTMLElement>;

	privAte _cursorStyle: TextEditorCursorStyle;
	privAte _lineCursorWidth: number;
	privAte _lineHeight: number;
	privAte _typicAlHAlfwidthChArActerWidth: number;

	privAte _isVisible: booleAn;

	privAte _position: Position;

	privAte _lAstRenderedContent: string;
	privAte _renderDAtA: ViewCursorRenderDAtA | null;

	constructor(context: ViewContext) {
		this._context = context;
		const options = this._context.configurAtion.options;
		const fontInfo = options.get(EditorOption.fontInfo);

		this._cursorStyle = options.get(EditorOption.cursorStyle);
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicAlHAlfwidthChArActerWidth = fontInfo.typicAlHAlfwidthChArActerWidth;
		this._lineCursorWidth = MAth.min(options.get(EditorOption.cursorWidth), this._typicAlHAlfwidthChArActerWidth);

		this._isVisible = true;

		// CreAte the dom node
		this._domNode = creAteFAstDomNode(document.creAteElement('div'));
		this._domNode.setClAssNAme(`cursor ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
		this._domNode.setHeight(this._lineHeight);
		this._domNode.setTop(0);
		this._domNode.setLeft(0);
		ConfigurAtion.ApplyFontInfo(this._domNode, fontInfo);
		this._domNode.setDisplAy('none');

		this._position = new Position(1, 1);

		this._lAstRenderedContent = '';
		this._renderDAtA = null;
	}

	public getDomNode(): FAstDomNode<HTMLElement> {
		return this._domNode;
	}

	public getPosition(): Position {
		return this._position;
	}

	public show(): void {
		if (!this._isVisible) {
			this._domNode.setVisibility('inherit');
			this._isVisible = true;
		}
	}

	public hide(): void {
		if (this._isVisible) {
			this._domNode.setVisibility('hidden');
			this._isVisible = fAlse;
		}
	}

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		const fontInfo = options.get(EditorOption.fontInfo);

		this._cursorStyle = options.get(EditorOption.cursorStyle);
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicAlHAlfwidthChArActerWidth = fontInfo.typicAlHAlfwidthChArActerWidth;
		this._lineCursorWidth = MAth.min(options.get(EditorOption.cursorWidth), this._typicAlHAlfwidthChArActerWidth);
		ConfigurAtion.ApplyFontInfo(this._domNode, fontInfo);

		return true;
	}

	public onCursorPositionChAnged(position: Position): booleAn {
		this._position = position;
		return true;
	}

	privAte _prepAreRender(ctx: RenderingContext): ViewCursorRenderDAtA | null {
		let textContent = '';

		if (this._cursorStyle === TextEditorCursorStyle.Line || this._cursorStyle === TextEditorCursorStyle.LineThin) {
			const visibleRAnge = ctx.visibleRAngeForPosition(this._position);
			if (!visibleRAnge || visibleRAnge.outsideRenderedLine) {
				// Outside viewport
				return null;
			}

			let width: number;
			if (this._cursorStyle === TextEditorCursorStyle.Line) {
				width = dom.computeScreenAwAreSize(this._lineCursorWidth > 0 ? this._lineCursorWidth : 2);
				if (width > 2) {
					const lineContent = this._context.model.getLineContent(this._position.lineNumber);
					const nextChArLength = strings.nextChArLength(lineContent, this._position.column - 1);
					textContent = lineContent.substr(this._position.column - 1, nextChArLength);
				}
			} else {
				width = dom.computeScreenAwAreSize(1);
			}

			let left = visibleRAnge.left;
			if (width >= 2 && left >= 1) {
				// try to center cursor
				left -= 1;
			}

			const top = ctx.getVerticAlOffsetForLineNumber(this._position.lineNumber) - ctx.bigNumbersDeltA;
			return new ViewCursorRenderDAtA(top, left, width, this._lineHeight, textContent, '');
		}

		const lineContent = this._context.model.getLineContent(this._position.lineNumber);
		const nextChArLength = strings.nextChArLength(lineContent, this._position.column - 1);
		const visibleRAngeForChArActer = ctx.linesVisibleRAngesForRAnge(new RAnge(this._position.lineNumber, this._position.column, this._position.lineNumber, this._position.column + nextChArLength), fAlse);
		if (!visibleRAngeForChArActer || visibleRAngeForChArActer.length === 0) {
			// Outside viewport
			return null;
		}

		const firstVisibleRAngeForChArActer = visibleRAngeForChArActer[0];
		if (firstVisibleRAngeForChArActer.outsideRenderedLine || firstVisibleRAngeForChArActer.rAnges.length === 0) {
			// Outside viewport
			return null;
		}

		const rAnge = firstVisibleRAngeForChArActer.rAnges[0];
		const width = rAnge.width < 1 ? this._typicAlHAlfwidthChArActerWidth : rAnge.width;

		let textContentClAssNAme = '';
		if (this._cursorStyle === TextEditorCursorStyle.Block) {
			const lineDAtA = this._context.model.getViewLineDAtA(this._position.lineNumber);
			textContent = lineContent.substr(this._position.column - 1, nextChArLength);
			const tokenIndex = lineDAtA.tokens.findTokenIndexAtOffset(this._position.column - 1);
			textContentClAssNAme = lineDAtA.tokens.getClAssNAme(tokenIndex);
		}

		let top = ctx.getVerticAlOffsetForLineNumber(this._position.lineNumber) - ctx.bigNumbersDeltA;
		let height = this._lineHeight;

		// Underline might interfere with clicking
		if (this._cursorStyle === TextEditorCursorStyle.Underline || this._cursorStyle === TextEditorCursorStyle.UnderlineThin) {
			top += this._lineHeight - 2;
			height = 2;
		}

		return new ViewCursorRenderDAtA(top, rAnge.left, width, height, textContent, textContentClAssNAme);
	}

	public prepAreRender(ctx: RenderingContext): void {
		this._renderDAtA = this._prepAreRender(ctx);
	}

	public render(ctx: RestrictedRenderingContext): IViewCursorRenderDAtA | null {
		if (!this._renderDAtA) {
			this._domNode.setDisplAy('none');
			return null;
		}

		if (this._lAstRenderedContent !== this._renderDAtA.textContent) {
			this._lAstRenderedContent = this._renderDAtA.textContent;
			this._domNode.domNode.textContent = this._lAstRenderedContent;
		}

		this._domNode.setClAssNAme(`cursor ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME} ${this._renderDAtA.textContentClAssNAme}`);

		this._domNode.setDisplAy('block');
		this._domNode.setTop(this._renderDAtA.top);
		this._domNode.setLeft(this._renderDAtA.left);
		this._domNode.setWidth(this._renderDAtA.width);
		this._domNode.setLineHeight(this._renderDAtA.height);
		this._domNode.setHeight(this._renderDAtA.height);

		return {
			domNode: this._domNode.domNode,
			position: this._position,
			contentLeft: this._renderDAtA.left,
			height: this._renderDAtA.height,
			width: 2
		};
	}
}
