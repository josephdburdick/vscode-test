/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./viewCursors';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IntervalTimer, TimeoutTimer } from 'vs/Base/common/async';
import { ViewPart } from 'vs/editor/Browser/view/viewPart';
import { IViewCursorRenderData, ViewCursor } from 'vs/editor/Browser/viewParts/viewCursors/viewCursor';
import { TextEditorCursorBlinkingStyle, TextEditorCursorStyle, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Position } from 'vs/editor/common/core/position';
import { editorCursorBackground, editorCursorForeground } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';

export class ViewCursors extends ViewPart {

	static readonly BLINK_INTERVAL = 500;

	private _readOnly: Boolean;
	private _cursorBlinking: TextEditorCursorBlinkingStyle;
	private _cursorStyle: TextEditorCursorStyle;
	private _cursorSmoothCaretAnimation: Boolean;
	private _selectionIsEmpty: Boolean;

	private _isVisiBle: Boolean;

	private readonly _domNode: FastDomNode<HTMLElement>;

	private readonly _startCursorBlinkAnimation: TimeoutTimer;
	private readonly _cursorFlatBlinkInterval: IntervalTimer;
	private _BlinkingEnaBled: Boolean;

	private _editorHasFocus: Boolean;

	private readonly _primaryCursor: ViewCursor;
	private readonly _secondaryCursors: ViewCursor[];
	private _renderData: IViewCursorRenderData[];

	constructor(context: ViewContext) {
		super(context);

		const options = this._context.configuration.options;
		this._readOnly = options.get(EditorOption.readOnly);
		this._cursorBlinking = options.get(EditorOption.cursorBlinking);
		this._cursorStyle = options.get(EditorOption.cursorStyle);
		this._cursorSmoothCaretAnimation = options.get(EditorOption.cursorSmoothCaretAnimation);
		this._selectionIsEmpty = true;

		this._isVisiBle = false;

		this._primaryCursor = new ViewCursor(this._context);
		this._secondaryCursors = [];
		this._renderData = [];

		this._domNode = createFastDomNode(document.createElement('div'));
		this._domNode.setAttriBute('role', 'presentation');
		this._domNode.setAttriBute('aria-hidden', 'true');
		this._updateDomClassName();

		this._domNode.appendChild(this._primaryCursor.getDomNode());

		this._startCursorBlinkAnimation = new TimeoutTimer();
		this._cursorFlatBlinkInterval = new IntervalTimer();

		this._BlinkingEnaBled = false;

		this._editorHasFocus = false;
		this._updateBlinking();
	}

	puBlic dispose(): void {
		super.dispose();
		this._startCursorBlinkAnimation.dispose();
		this._cursorFlatBlinkInterval.dispose();
	}

	puBlic getDomNode(): FastDomNode<HTMLElement> {
		return this._domNode;
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;

		this._readOnly = options.get(EditorOption.readOnly);
		this._cursorBlinking = options.get(EditorOption.cursorBlinking);
		this._cursorStyle = options.get(EditorOption.cursorStyle);
		this._cursorSmoothCaretAnimation = options.get(EditorOption.cursorSmoothCaretAnimation);

		this._updateBlinking();
		this._updateDomClassName();

		this._primaryCursor.onConfigurationChanged(e);
		for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
			this._secondaryCursors[i].onConfigurationChanged(e);
		}
		return true;
	}
	private _onCursorPositionChanged(position: Position, secondaryPositions: Position[]): void {
		this._primaryCursor.onCursorPositionChanged(position);
		this._updateBlinking();

		if (this._secondaryCursors.length < secondaryPositions.length) {
			// Create new cursors
			const addCnt = secondaryPositions.length - this._secondaryCursors.length;
			for (let i = 0; i < addCnt; i++) {
				const newCursor = new ViewCursor(this._context);
				this._domNode.domNode.insertBefore(newCursor.getDomNode().domNode, this._primaryCursor.getDomNode().domNode.nextSiBling);
				this._secondaryCursors.push(newCursor);
			}
		} else if (this._secondaryCursors.length > secondaryPositions.length) {
			// Remove some cursors
			const removeCnt = this._secondaryCursors.length - secondaryPositions.length;
			for (let i = 0; i < removeCnt; i++) {
				this._domNode.removeChild(this._secondaryCursors[0].getDomNode());
				this._secondaryCursors.splice(0, 1);
			}
		}

		for (let i = 0; i < secondaryPositions.length; i++) {
			this._secondaryCursors[i].onCursorPositionChanged(secondaryPositions[i]);
		}

	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		const positions: Position[] = [];
		for (let i = 0, len = e.selections.length; i < len; i++) {
			positions[i] = e.selections[i].getPosition();
		}
		this._onCursorPositionChanged(positions[0], positions.slice(1));

		const selectionIsEmpty = e.selections[0].isEmpty();
		if (this._selectionIsEmpty !== selectionIsEmpty) {
			this._selectionIsEmpty = selectionIsEmpty;
			this._updateDomClassName();
		}

		return true;
	}

	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		// true for inline decorations that can end up relayouting text
		return true;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		return true;
	}
	puBlic onFocusChanged(e: viewEvents.ViewFocusChangedEvent): Boolean {
		this._editorHasFocus = e.isFocused;
		this._updateBlinking();
		return false;
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
		return true;
	}
	puBlic onTokensChanged(e: viewEvents.ViewTokensChangedEvent): Boolean {
		const shouldRender = (position: Position) => {
			for (let i = 0, len = e.ranges.length; i < len; i++) {
				if (e.ranges[i].fromLineNumBer <= position.lineNumBer && position.lineNumBer <= e.ranges[i].toLineNumBer) {
					return true;
				}
			}
			return false;
		};
		if (shouldRender(this._primaryCursor.getPosition())) {
			return true;
		}
		for (const secondaryCursor of this._secondaryCursors) {
			if (shouldRender(secondaryCursor.getPosition())) {
				return true;
			}
		}
		return false;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}

	// --- end event handlers

	// ---- Blinking logic

	private _getCursorBlinking(): TextEditorCursorBlinkingStyle {
		if (!this._editorHasFocus) {
			return TextEditorCursorBlinkingStyle.Hidden;
		}
		if (this._readOnly) {
			return TextEditorCursorBlinkingStyle.Solid;
		}
		return this._cursorBlinking;
	}

	private _updateBlinking(): void {
		this._startCursorBlinkAnimation.cancel();
		this._cursorFlatBlinkInterval.cancel();

		const BlinkingStyle = this._getCursorBlinking();

		// hidden and solid are special as they involve no animations
		const isHidden = (BlinkingStyle === TextEditorCursorBlinkingStyle.Hidden);
		const isSolid = (BlinkingStyle === TextEditorCursorBlinkingStyle.Solid);

		if (isHidden) {
			this._hide();
		} else {
			this._show();
		}

		this._BlinkingEnaBled = false;
		this._updateDomClassName();

		if (!isHidden && !isSolid) {
			if (BlinkingStyle === TextEditorCursorBlinkingStyle.Blink) {
				// flat Blinking is handled By JavaScript to save Battery life due to Chromium step timing issue https://Bugs.chromium.org/p/chromium/issues/detail?id=361587
				this._cursorFlatBlinkInterval.cancelAndSet(() => {
					if (this._isVisiBle) {
						this._hide();
					} else {
						this._show();
					}
				}, ViewCursors.BLINK_INTERVAL);
			} else {
				this._startCursorBlinkAnimation.setIfNotSet(() => {
					this._BlinkingEnaBled = true;
					this._updateDomClassName();
				}, ViewCursors.BLINK_INTERVAL);
			}
		}
	}
	// --- end Blinking logic

	private _updateDomClassName(): void {
		this._domNode.setClassName(this._getClassName());
	}

	private _getClassName(): string {
		let result = 'cursors-layer';
		if (!this._selectionIsEmpty) {
			result += ' has-selection';
		}
		switch (this._cursorStyle) {
			case TextEditorCursorStyle.Line:
				result += ' cursor-line-style';
				Break;
			case TextEditorCursorStyle.Block:
				result += ' cursor-Block-style';
				Break;
			case TextEditorCursorStyle.Underline:
				result += ' cursor-underline-style';
				Break;
			case TextEditorCursorStyle.LineThin:
				result += ' cursor-line-thin-style';
				Break;
			case TextEditorCursorStyle.BlockOutline:
				result += ' cursor-Block-outline-style';
				Break;
			case TextEditorCursorStyle.UnderlineThin:
				result += ' cursor-underline-thin-style';
				Break;
			default:
				result += ' cursor-line-style';
		}
		if (this._BlinkingEnaBled) {
			switch (this._getCursorBlinking()) {
				case TextEditorCursorBlinkingStyle.Blink:
					result += ' cursor-Blink';
					Break;
				case TextEditorCursorBlinkingStyle.Smooth:
					result += ' cursor-smooth';
					Break;
				case TextEditorCursorBlinkingStyle.Phase:
					result += ' cursor-phase';
					Break;
				case TextEditorCursorBlinkingStyle.Expand:
					result += ' cursor-expand';
					Break;
				case TextEditorCursorBlinkingStyle.Solid:
					result += ' cursor-solid';
					Break;
				default:
					result += ' cursor-solid';
			}
		} else {
			result += ' cursor-solid';
		}
		if (this._cursorSmoothCaretAnimation) {
			result += ' cursor-smooth-caret-animation';
		}
		return result;
	}

	private _show(): void {
		this._primaryCursor.show();
		for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
			this._secondaryCursors[i].show();
		}
		this._isVisiBle = true;
	}

	private _hide(): void {
		this._primaryCursor.hide();
		for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
			this._secondaryCursors[i].hide();
		}
		this._isVisiBle = false;
	}

	// ---- IViewPart implementation

	puBlic prepareRender(ctx: RenderingContext): void {
		this._primaryCursor.prepareRender(ctx);
		for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
			this._secondaryCursors[i].prepareRender(ctx);
		}
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		let renderData: IViewCursorRenderData[] = [], renderDataLen = 0;

		const primaryRenderData = this._primaryCursor.render(ctx);
		if (primaryRenderData) {
			renderData[renderDataLen++] = primaryRenderData;
		}

		for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
			const secondaryRenderData = this._secondaryCursors[i].render(ctx);
			if (secondaryRenderData) {
				renderData[renderDataLen++] = secondaryRenderData;
			}
		}

		this._renderData = renderData;
	}

	puBlic getLastRenderData(): IViewCursorRenderData[] {
		return this._renderData;
	}
}

registerThemingParticipant((theme, collector) => {
	const caret = theme.getColor(editorCursorForeground);
	if (caret) {
		let caretBackground = theme.getColor(editorCursorBackground);
		if (!caretBackground) {
			caretBackground = caret.opposite();
		}
		collector.addRule(`.monaco-editor .cursors-layer .cursor { Background-color: ${caret}; Border-color: ${caret}; color: ${caretBackground}; }`);
		if (theme.type === 'hc') {
			collector.addRule(`.monaco-editor .cursors-layer.has-selection .cursor { Border-left: 1px solid ${caretBackground}; Border-right: 1px solid ${caretBackground}; }`);
		}
	}

});
