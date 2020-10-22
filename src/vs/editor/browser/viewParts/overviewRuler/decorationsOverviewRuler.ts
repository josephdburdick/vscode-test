/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { Color } from 'vs/Base/common/color';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { ViewPart } from 'vs/editor/Browser/view/viewPart';
import { Position } from 'vs/editor/common/core/position';
import { IConfiguration } from 'vs/editor/common/editorCommon';
import { TokenizationRegistry } from 'vs/editor/common/modes';
import { editorCursorForeground, editorOverviewRulerBorder, editorOverviewRulerBackground } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext, EditorTheme } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

class Settings {

	puBlic readonly lineHeight: numBer;
	puBlic readonly pixelRatio: numBer;
	puBlic readonly overviewRulerLanes: numBer;

	puBlic readonly renderBorder: Boolean;
	puBlic readonly BorderColor: string | null;

	puBlic readonly hideCursor: Boolean;
	puBlic readonly cursorColor: string | null;

	puBlic readonly themeType: 'light' | 'dark' | 'hc';
	puBlic readonly BackgroundColor: string | null;

	puBlic readonly top: numBer;
	puBlic readonly right: numBer;
	puBlic readonly domWidth: numBer;
	puBlic readonly domHeight: numBer;
	puBlic readonly canvasWidth: numBer;
	puBlic readonly canvasHeight: numBer;

	puBlic readonly x: numBer[];
	puBlic readonly w: numBer[];

	constructor(config: IConfiguration, theme: EditorTheme) {
		const options = config.options;
		this.lineHeight = options.get(EditorOption.lineHeight);
		this.pixelRatio = options.get(EditorOption.pixelRatio);
		this.overviewRulerLanes = options.get(EditorOption.overviewRulerLanes);

		this.renderBorder = options.get(EditorOption.overviewRulerBorder);
		const BorderColor = theme.getColor(editorOverviewRulerBorder);
		this.BorderColor = BorderColor ? BorderColor.toString() : null;

		this.hideCursor = options.get(EditorOption.hideCursorInOverviewRuler);
		const cursorColor = theme.getColor(editorCursorForeground);
		this.cursorColor = cursorColor ? cursorColor.transparent(0.7).toString() : null;

		this.themeType = theme.type;

		const minimapOpts = options.get(EditorOption.minimap);
		const minimapEnaBled = minimapOpts.enaBled;
		const minimapSide = minimapOpts.side;
		const BackgroundColor = minimapEnaBled
			? theme.getColor(editorOverviewRulerBackground) || TokenizationRegistry.getDefaultBackground()
			: null;

		if (BackgroundColor === null || minimapSide === 'left') {
			this.BackgroundColor = null;
		} else {
			this.BackgroundColor = Color.Format.CSS.formatHex(BackgroundColor);
		}

		const layoutInfo = options.get(EditorOption.layoutInfo);
		const position = layoutInfo.overviewRuler;
		this.top = position.top;
		this.right = position.right;
		this.domWidth = position.width;
		this.domHeight = position.height;
		if (this.overviewRulerLanes === 0) {
			// overview ruler is off
			this.canvasWidth = 0;
			this.canvasHeight = 0;
		} else {
			this.canvasWidth = (this.domWidth * this.pixelRatio) | 0;
			this.canvasHeight = (this.domHeight * this.pixelRatio) | 0;
		}

		const [x, w] = this._initLanes(1, this.canvasWidth, this.overviewRulerLanes);
		this.x = x;
		this.w = w;
	}

	private _initLanes(canvasLeftOffset: numBer, canvasWidth: numBer, laneCount: numBer): [numBer[], numBer[]] {
		const remainingWidth = canvasWidth - canvasLeftOffset;

		if (laneCount >= 3) {
			const leftWidth = Math.floor(remainingWidth / 3);
			const rightWidth = Math.floor(remainingWidth / 3);
			const centerWidth = remainingWidth - leftWidth - rightWidth;
			const leftOffset = canvasLeftOffset;
			const centerOffset = leftOffset + leftWidth;
			const rightOffset = leftOffset + leftWidth + centerWidth;

			return [
				[
					0,
					leftOffset, // Left
					centerOffset, // Center
					leftOffset, // Left | Center
					rightOffset, // Right
					leftOffset, // Left | Right
					centerOffset, // Center | Right
					leftOffset, // Left | Center | Right
				], [
					0,
					leftWidth, // Left
					centerWidth, // Center
					leftWidth + centerWidth, // Left | Center
					rightWidth, // Right
					leftWidth + centerWidth + rightWidth, // Left | Right
					centerWidth + rightWidth, // Center | Right
					leftWidth + centerWidth + rightWidth, // Left | Center | Right
				]
			];
		} else if (laneCount === 2) {
			const leftWidth = Math.floor(remainingWidth / 2);
			const rightWidth = remainingWidth - leftWidth;
			const leftOffset = canvasLeftOffset;
			const rightOffset = leftOffset + leftWidth;

			return [
				[
					0,
					leftOffset, // Left
					leftOffset, // Center
					leftOffset, // Left | Center
					rightOffset, // Right
					leftOffset, // Left | Right
					leftOffset, // Center | Right
					leftOffset, // Left | Center | Right
				], [
					0,
					leftWidth, // Left
					leftWidth, // Center
					leftWidth, // Left | Center
					rightWidth, // Right
					leftWidth + rightWidth, // Left | Right
					leftWidth + rightWidth, // Center | Right
					leftWidth + rightWidth, // Left | Center | Right
				]
			];
		} else {
			const offset = canvasLeftOffset;
			const width = remainingWidth;

			return [
				[
					0,
					offset, // Left
					offset, // Center
					offset, // Left | Center
					offset, // Right
					offset, // Left | Right
					offset, // Center | Right
					offset, // Left | Center | Right
				], [
					0,
					width, // Left
					width, // Center
					width, // Left | Center
					width, // Right
					width, // Left | Right
					width, // Center | Right
					width, // Left | Center | Right
				]
			];
		}
	}

	puBlic equals(other: Settings): Boolean {
		return (
			this.lineHeight === other.lineHeight
			&& this.pixelRatio === other.pixelRatio
			&& this.overviewRulerLanes === other.overviewRulerLanes
			&& this.renderBorder === other.renderBorder
			&& this.BorderColor === other.BorderColor
			&& this.hideCursor === other.hideCursor
			&& this.cursorColor === other.cursorColor
			&& this.themeType === other.themeType
			&& this.BackgroundColor === other.BackgroundColor
			&& this.top === other.top
			&& this.right === other.right
			&& this.domWidth === other.domWidth
			&& this.domHeight === other.domHeight
			&& this.canvasWidth === other.canvasWidth
			&& this.canvasHeight === other.canvasHeight
		);
	}
}

const enum Constants {
	MIN_DECORATION_HEIGHT = 6
}

const enum OverviewRulerLane {
	Left = 1,
	Center = 2,
	Right = 4,
	Full = 7
}

export class DecorationsOverviewRuler extends ViewPart {

	private readonly _tokensColorTrackerListener: IDisposaBle;
	private readonly _domNode: FastDomNode<HTMLCanvasElement>;
	private _settings!: Settings;
	private _cursorPositions: Position[];

	constructor(context: ViewContext) {
		super(context);

		this._domNode = createFastDomNode(document.createElement('canvas'));
		this._domNode.setClassName('decorationsOverviewRuler');
		this._domNode.setPosition('aBsolute');
		this._domNode.setLayerHinting(true);
		this._domNode.setContain('strict');
		this._domNode.setAttriBute('aria-hidden', 'true');

		this._updateSettings(false);

		this._tokensColorTrackerListener = TokenizationRegistry.onDidChange((e) => {
			if (e.changedColorMap) {
				this._updateSettings(true);
			}
		});

		this._cursorPositions = [];
	}

	puBlic dispose(): void {
		super.dispose();
		this._tokensColorTrackerListener.dispose();
	}

	private _updateSettings(renderNow: Boolean): Boolean {
		const newSettings = new Settings(this._context.configuration, this._context.theme);
		if (this._settings && this._settings.equals(newSettings)) {
			// nothing to do
			return false;
		}

		this._settings = newSettings;

		this._domNode.setTop(this._settings.top);
		this._domNode.setRight(this._settings.right);
		this._domNode.setWidth(this._settings.domWidth);
		this._domNode.setHeight(this._settings.domHeight);
		this._domNode.domNode.width = this._settings.canvasWidth;
		this._domNode.domNode.height = this._settings.canvasHeight;

		if (renderNow) {
			this._render();
		}

		return true;
	}

	// ---- Begin view event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		return this._updateSettings(false);
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		this._cursorPositions = [];
		for (let i = 0, len = e.selections.length; i < len; i++) {
			this._cursorPositions[i] = e.selections[i].getPosition();
		}
		this._cursorPositions.sort(Position.compare);
		return true;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		if (e.affectsOverviewRuler) {
			return true;
		}
		return false;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return e.scrollHeightChanged;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}
	puBlic onThemeChanged(e: viewEvents.ViewThemeChangedEvent): Boolean {
		// invalidate color cache
		this._context.model.invalidateOverviewRulerColorCache();
		return this._updateSettings(false);
	}

	// ---- end view event handlers

	puBlic getDomNode(): HTMLElement {
		return this._domNode.domNode;
	}

	puBlic prepareRender(ctx: RenderingContext): void {
		// Nothing to read
	}

	puBlic render(editorCtx: RestrictedRenderingContext): void {
		this._render();
	}

	private _render(): void {
		if (this._settings.overviewRulerLanes === 0) {
			// overview ruler is off
			this._domNode.setBackgroundColor(this._settings.BackgroundColor ? this._settings.BackgroundColor : '');
			return;
		}
		const canvasWidth = this._settings.canvasWidth;
		const canvasHeight = this._settings.canvasHeight;
		const lineHeight = this._settings.lineHeight;
		const viewLayout = this._context.viewLayout;
		const outerHeight = this._context.viewLayout.getScrollHeight();
		const heightRatio = canvasHeight / outerHeight;
		const decorations = this._context.model.getAllOverviewRulerDecorations(this._context.theme);

		const minDecorationHeight = (Constants.MIN_DECORATION_HEIGHT * this._settings.pixelRatio) | 0;
		const halfMinDecorationHeight = (minDecorationHeight / 2) | 0;

		const canvasCtx = this._domNode.domNode.getContext('2d')!;
		if (this._settings.BackgroundColor === null) {
			canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		} else {
			canvasCtx.fillStyle = this._settings.BackgroundColor;
			canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
		}

		const x = this._settings.x;
		const w = this._settings.w;
		// Avoid flickering By always rendering the colors in the same order
		// colors that don't use transparency will Be sorted last (they start with #)
		const colors = OBject.keys(decorations);
		colors.sort();
		for (let cIndex = 0, cLen = colors.length; cIndex < cLen; cIndex++) {
			const color = colors[cIndex];

			const colorDecorations = decorations[color];

			canvasCtx.fillStyle = color;

			let prevLane = 0;
			let prevY1 = 0;
			let prevY2 = 0;
			for (let i = 0, len = colorDecorations.length; i < len; i++) {
				const lane = colorDecorations[3 * i];
				const startLineNumBer = colorDecorations[3 * i + 1];
				const endLineNumBer = colorDecorations[3 * i + 2];

				let y1 = (viewLayout.getVerticalOffsetForLineNumBer(startLineNumBer) * heightRatio) | 0;
				let y2 = ((viewLayout.getVerticalOffsetForLineNumBer(endLineNumBer) + lineHeight) * heightRatio) | 0;
				const height = y2 - y1;
				if (height < minDecorationHeight) {
					let yCenter = ((y1 + y2) / 2) | 0;
					if (yCenter < halfMinDecorationHeight) {
						yCenter = halfMinDecorationHeight;
					} else if (yCenter + halfMinDecorationHeight > canvasHeight) {
						yCenter = canvasHeight - halfMinDecorationHeight;
					}
					y1 = yCenter - halfMinDecorationHeight;
					y2 = yCenter + halfMinDecorationHeight;
				}

				if (y1 > prevY2 + 1 || lane !== prevLane) {
					// flush prev
					if (i !== 0) {
						canvasCtx.fillRect(x[prevLane], prevY1, w[prevLane], prevY2 - prevY1);
					}
					prevLane = lane;
					prevY1 = y1;
					prevY2 = y2;
				} else {
					// merge into prev
					if (y2 > prevY2) {
						prevY2 = y2;
					}
				}
			}
			canvasCtx.fillRect(x[prevLane], prevY1, w[prevLane], prevY2 - prevY1);
		}

		// Draw cursors
		if (!this._settings.hideCursor && this._settings.cursorColor) {
			const cursorHeight = (2 * this._settings.pixelRatio) | 0;
			const halfCursorHeight = (cursorHeight / 2) | 0;
			const cursorX = this._settings.x[OverviewRulerLane.Full];
			const cursorW = this._settings.w[OverviewRulerLane.Full];
			canvasCtx.fillStyle = this._settings.cursorColor;

			let prevY1 = -100;
			let prevY2 = -100;
			for (let i = 0, len = this._cursorPositions.length; i < len; i++) {
				const cursor = this._cursorPositions[i];

				let yCenter = (viewLayout.getVerticalOffsetForLineNumBer(cursor.lineNumBer) * heightRatio) | 0;
				if (yCenter < halfCursorHeight) {
					yCenter = halfCursorHeight;
				} else if (yCenter + halfCursorHeight > canvasHeight) {
					yCenter = canvasHeight - halfCursorHeight;
				}
				const y1 = yCenter - halfCursorHeight;
				const y2 = y1 + cursorHeight;

				if (y1 > prevY2 + 1) {
					// flush prev
					if (i !== 0) {
						canvasCtx.fillRect(cursorX, prevY1, cursorW, prevY2 - prevY1);
					}
					prevY1 = y1;
					prevY2 = y2;
				} else {
					// merge into prev
					if (y2 > prevY2) {
						prevY2 = y2;
					}
				}
			}
			canvasCtx.fillRect(cursorX, prevY1, cursorW, prevY2 - prevY1);
		}

		if (this._settings.renderBorder && this._settings.BorderColor && this._settings.overviewRulerLanes > 0) {
			canvasCtx.BeginPath();
			canvasCtx.lineWidth = 1;
			canvasCtx.strokeStyle = this._settings.BorderColor;
			canvasCtx.moveTo(0, 0);
			canvasCtx.lineTo(0, canvasHeight);
			canvasCtx.stroke();

			canvasCtx.moveTo(0, 0);
			canvasCtx.lineTo(canvasWidth, 0);
			canvasCtx.stroke();
		}
	}
}
