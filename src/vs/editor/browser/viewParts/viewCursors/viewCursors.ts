/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./viewCursors';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { IntervAlTimer, TimeoutTimer } from 'vs/bAse/common/Async';
import { ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { IViewCursorRenderDAtA, ViewCursor } from 'vs/editor/browser/viewPArts/viewCursors/viewCursor';
import { TextEditorCursorBlinkingStyle, TextEditorCursorStyle, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Position } from 'vs/editor/common/core/position';
import { editorCursorBAckground, editorCursorForeground } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';

export clAss ViewCursors extends ViewPArt {

	stAtic reAdonly BLINK_INTERVAL = 500;

	privAte _reAdOnly: booleAn;
	privAte _cursorBlinking: TextEditorCursorBlinkingStyle;
	privAte _cursorStyle: TextEditorCursorStyle;
	privAte _cursorSmoothCAretAnimAtion: booleAn;
	privAte _selectionIsEmpty: booleAn;

	privAte _isVisible: booleAn;

	privAte reAdonly _domNode: FAstDomNode<HTMLElement>;

	privAte reAdonly _stArtCursorBlinkAnimAtion: TimeoutTimer;
	privAte reAdonly _cursorFlAtBlinkIntervAl: IntervAlTimer;
	privAte _blinkingEnAbled: booleAn;

	privAte _editorHAsFocus: booleAn;

	privAte reAdonly _primAryCursor: ViewCursor;
	privAte reAdonly _secondAryCursors: ViewCursor[];
	privAte _renderDAtA: IViewCursorRenderDAtA[];

	constructor(context: ViewContext) {
		super(context);

		const options = this._context.configurAtion.options;
		this._reAdOnly = options.get(EditorOption.reAdOnly);
		this._cursorBlinking = options.get(EditorOption.cursorBlinking);
		this._cursorStyle = options.get(EditorOption.cursorStyle);
		this._cursorSmoothCAretAnimAtion = options.get(EditorOption.cursorSmoothCAretAnimAtion);
		this._selectionIsEmpty = true;

		this._isVisible = fAlse;

		this._primAryCursor = new ViewCursor(this._context);
		this._secondAryCursors = [];
		this._renderDAtA = [];

		this._domNode = creAteFAstDomNode(document.creAteElement('div'));
		this._domNode.setAttribute('role', 'presentAtion');
		this._domNode.setAttribute('AriA-hidden', 'true');
		this._updAteDomClAssNAme();

		this._domNode.AppendChild(this._primAryCursor.getDomNode());

		this._stArtCursorBlinkAnimAtion = new TimeoutTimer();
		this._cursorFlAtBlinkIntervAl = new IntervAlTimer();

		this._blinkingEnAbled = fAlse;

		this._editorHAsFocus = fAlse;
		this._updAteBlinking();
	}

	public dispose(): void {
		super.dispose();
		this._stArtCursorBlinkAnimAtion.dispose();
		this._cursorFlAtBlinkIntervAl.dispose();
	}

	public getDomNode(): FAstDomNode<HTMLElement> {
		return this._domNode;
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;

		this._reAdOnly = options.get(EditorOption.reAdOnly);
		this._cursorBlinking = options.get(EditorOption.cursorBlinking);
		this._cursorStyle = options.get(EditorOption.cursorStyle);
		this._cursorSmoothCAretAnimAtion = options.get(EditorOption.cursorSmoothCAretAnimAtion);

		this._updAteBlinking();
		this._updAteDomClAssNAme();

		this._primAryCursor.onConfigurAtionChAnged(e);
		for (let i = 0, len = this._secondAryCursors.length; i < len; i++) {
			this._secondAryCursors[i].onConfigurAtionChAnged(e);
		}
		return true;
	}
	privAte _onCursorPositionChAnged(position: Position, secondAryPositions: Position[]): void {
		this._primAryCursor.onCursorPositionChAnged(position);
		this._updAteBlinking();

		if (this._secondAryCursors.length < secondAryPositions.length) {
			// CreAte new cursors
			const AddCnt = secondAryPositions.length - this._secondAryCursors.length;
			for (let i = 0; i < AddCnt; i++) {
				const newCursor = new ViewCursor(this._context);
				this._domNode.domNode.insertBefore(newCursor.getDomNode().domNode, this._primAryCursor.getDomNode().domNode.nextSibling);
				this._secondAryCursors.push(newCursor);
			}
		} else if (this._secondAryCursors.length > secondAryPositions.length) {
			// Remove some cursors
			const removeCnt = this._secondAryCursors.length - secondAryPositions.length;
			for (let i = 0; i < removeCnt; i++) {
				this._domNode.removeChild(this._secondAryCursors[0].getDomNode());
				this._secondAryCursors.splice(0, 1);
			}
		}

		for (let i = 0; i < secondAryPositions.length; i++) {
			this._secondAryCursors[i].onCursorPositionChAnged(secondAryPositions[i]);
		}

	}
	public onCursorStAteChAnged(e: viewEvents.ViewCursorStAteChAngedEvent): booleAn {
		const positions: Position[] = [];
		for (let i = 0, len = e.selections.length; i < len; i++) {
			positions[i] = e.selections[i].getPosition();
		}
		this._onCursorPositionChAnged(positions[0], positions.slice(1));

		const selectionIsEmpty = e.selections[0].isEmpty();
		if (this._selectionIsEmpty !== selectionIsEmpty) {
			this._selectionIsEmpty = selectionIsEmpty;
			this._updAteDomClAssNAme();
		}

		return true;
	}

	public onDecorAtionsChAnged(e: viewEvents.ViewDecorAtionsChAngedEvent): booleAn {
		// true for inline decorAtions thAt cAn end up relAyouting text
		return true;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		return true;
	}
	public onFocusChAnged(e: viewEvents.ViewFocusChAngedEvent): booleAn {
		this._editorHAsFocus = e.isFocused;
		this._updAteBlinking();
		return fAlse;
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
		return true;
	}
	public onTokensChAnged(e: viewEvents.ViewTokensChAngedEvent): booleAn {
		const shouldRender = (position: Position) => {
			for (let i = 0, len = e.rAnges.length; i < len; i++) {
				if (e.rAnges[i].fromLineNumber <= position.lineNumber && position.lineNumber <= e.rAnges[i].toLineNumber) {
					return true;
				}
			}
			return fAlse;
		};
		if (shouldRender(this._primAryCursor.getPosition())) {
			return true;
		}
		for (const secondAryCursor of this._secondAryCursors) {
			if (shouldRender(secondAryCursor.getPosition())) {
				return true;
			}
		}
		return fAlse;
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}

	// --- end event hAndlers

	// ---- blinking logic

	privAte _getCursorBlinking(): TextEditorCursorBlinkingStyle {
		if (!this._editorHAsFocus) {
			return TextEditorCursorBlinkingStyle.Hidden;
		}
		if (this._reAdOnly) {
			return TextEditorCursorBlinkingStyle.Solid;
		}
		return this._cursorBlinking;
	}

	privAte _updAteBlinking(): void {
		this._stArtCursorBlinkAnimAtion.cAncel();
		this._cursorFlAtBlinkIntervAl.cAncel();

		const blinkingStyle = this._getCursorBlinking();

		// hidden And solid Are speciAl As they involve no AnimAtions
		const isHidden = (blinkingStyle === TextEditorCursorBlinkingStyle.Hidden);
		const isSolid = (blinkingStyle === TextEditorCursorBlinkingStyle.Solid);

		if (isHidden) {
			this._hide();
		} else {
			this._show();
		}

		this._blinkingEnAbled = fAlse;
		this._updAteDomClAssNAme();

		if (!isHidden && !isSolid) {
			if (blinkingStyle === TextEditorCursorBlinkingStyle.Blink) {
				// flAt blinking is hAndled by JAvAScript to sAve bAttery life due to Chromium step timing issue https://bugs.chromium.org/p/chromium/issues/detAil?id=361587
				this._cursorFlAtBlinkIntervAl.cAncelAndSet(() => {
					if (this._isVisible) {
						this._hide();
					} else {
						this._show();
					}
				}, ViewCursors.BLINK_INTERVAL);
			} else {
				this._stArtCursorBlinkAnimAtion.setIfNotSet(() => {
					this._blinkingEnAbled = true;
					this._updAteDomClAssNAme();
				}, ViewCursors.BLINK_INTERVAL);
			}
		}
	}
	// --- end blinking logic

	privAte _updAteDomClAssNAme(): void {
		this._domNode.setClAssNAme(this._getClAssNAme());
	}

	privAte _getClAssNAme(): string {
		let result = 'cursors-lAyer';
		if (!this._selectionIsEmpty) {
			result += ' hAs-selection';
		}
		switch (this._cursorStyle) {
			cAse TextEditorCursorStyle.Line:
				result += ' cursor-line-style';
				breAk;
			cAse TextEditorCursorStyle.Block:
				result += ' cursor-block-style';
				breAk;
			cAse TextEditorCursorStyle.Underline:
				result += ' cursor-underline-style';
				breAk;
			cAse TextEditorCursorStyle.LineThin:
				result += ' cursor-line-thin-style';
				breAk;
			cAse TextEditorCursorStyle.BlockOutline:
				result += ' cursor-block-outline-style';
				breAk;
			cAse TextEditorCursorStyle.UnderlineThin:
				result += ' cursor-underline-thin-style';
				breAk;
			defAult:
				result += ' cursor-line-style';
		}
		if (this._blinkingEnAbled) {
			switch (this._getCursorBlinking()) {
				cAse TextEditorCursorBlinkingStyle.Blink:
					result += ' cursor-blink';
					breAk;
				cAse TextEditorCursorBlinkingStyle.Smooth:
					result += ' cursor-smooth';
					breAk;
				cAse TextEditorCursorBlinkingStyle.PhAse:
					result += ' cursor-phAse';
					breAk;
				cAse TextEditorCursorBlinkingStyle.ExpAnd:
					result += ' cursor-expAnd';
					breAk;
				cAse TextEditorCursorBlinkingStyle.Solid:
					result += ' cursor-solid';
					breAk;
				defAult:
					result += ' cursor-solid';
			}
		} else {
			result += ' cursor-solid';
		}
		if (this._cursorSmoothCAretAnimAtion) {
			result += ' cursor-smooth-cAret-AnimAtion';
		}
		return result;
	}

	privAte _show(): void {
		this._primAryCursor.show();
		for (let i = 0, len = this._secondAryCursors.length; i < len; i++) {
			this._secondAryCursors[i].show();
		}
		this._isVisible = true;
	}

	privAte _hide(): void {
		this._primAryCursor.hide();
		for (let i = 0, len = this._secondAryCursors.length; i < len; i++) {
			this._secondAryCursors[i].hide();
		}
		this._isVisible = fAlse;
	}

	// ---- IViewPArt implementAtion

	public prepAreRender(ctx: RenderingContext): void {
		this._primAryCursor.prepAreRender(ctx);
		for (let i = 0, len = this._secondAryCursors.length; i < len; i++) {
			this._secondAryCursors[i].prepAreRender(ctx);
		}
	}

	public render(ctx: RestrictedRenderingContext): void {
		let renderDAtA: IViewCursorRenderDAtA[] = [], renderDAtALen = 0;

		const primAryRenderDAtA = this._primAryCursor.render(ctx);
		if (primAryRenderDAtA) {
			renderDAtA[renderDAtALen++] = primAryRenderDAtA;
		}

		for (let i = 0, len = this._secondAryCursors.length; i < len; i++) {
			const secondAryRenderDAtA = this._secondAryCursors[i].render(ctx);
			if (secondAryRenderDAtA) {
				renderDAtA[renderDAtALen++] = secondAryRenderDAtA;
			}
		}

		this._renderDAtA = renderDAtA;
	}

	public getLAstRenderDAtA(): IViewCursorRenderDAtA[] {
		return this._renderDAtA;
	}
}

registerThemingPArticipAnt((theme, collector) => {
	const cAret = theme.getColor(editorCursorForeground);
	if (cAret) {
		let cAretBAckground = theme.getColor(editorCursorBAckground);
		if (!cAretBAckground) {
			cAretBAckground = cAret.opposite();
		}
		collector.AddRule(`.monAco-editor .cursors-lAyer .cursor { bAckground-color: ${cAret}; border-color: ${cAret}; color: ${cAretBAckground}; }`);
		if (theme.type === 'hc') {
			collector.AddRule(`.monAco-editor .cursors-lAyer.hAs-selection .cursor { border-left: 1px solid ${cAretBAckground}; border-right: 1px solid ${cAretBAckground}; }`);
		}
	}

});
