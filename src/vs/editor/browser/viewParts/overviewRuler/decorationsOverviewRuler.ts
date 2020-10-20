/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { Color } from 'vs/bAse/common/color';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { Position } from 'vs/editor/common/core/position';
import { IConfigurAtion } from 'vs/editor/common/editorCommon';
import { TokenizAtionRegistry } from 'vs/editor/common/modes';
import { editorCursorForeground, editorOverviewRulerBorder, editorOverviewRulerBAckground } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext, EditorTheme } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

clAss Settings {

	public reAdonly lineHeight: number;
	public reAdonly pixelRAtio: number;
	public reAdonly overviewRulerLAnes: number;

	public reAdonly renderBorder: booleAn;
	public reAdonly borderColor: string | null;

	public reAdonly hideCursor: booleAn;
	public reAdonly cursorColor: string | null;

	public reAdonly themeType: 'light' | 'dArk' | 'hc';
	public reAdonly bAckgroundColor: string | null;

	public reAdonly top: number;
	public reAdonly right: number;
	public reAdonly domWidth: number;
	public reAdonly domHeight: number;
	public reAdonly cAnvAsWidth: number;
	public reAdonly cAnvAsHeight: number;

	public reAdonly x: number[];
	public reAdonly w: number[];

	constructor(config: IConfigurAtion, theme: EditorTheme) {
		const options = config.options;
		this.lineHeight = options.get(EditorOption.lineHeight);
		this.pixelRAtio = options.get(EditorOption.pixelRAtio);
		this.overviewRulerLAnes = options.get(EditorOption.overviewRulerLAnes);

		this.renderBorder = options.get(EditorOption.overviewRulerBorder);
		const borderColor = theme.getColor(editorOverviewRulerBorder);
		this.borderColor = borderColor ? borderColor.toString() : null;

		this.hideCursor = options.get(EditorOption.hideCursorInOverviewRuler);
		const cursorColor = theme.getColor(editorCursorForeground);
		this.cursorColor = cursorColor ? cursorColor.trAnspArent(0.7).toString() : null;

		this.themeType = theme.type;

		const minimApOpts = options.get(EditorOption.minimAp);
		const minimApEnAbled = minimApOpts.enAbled;
		const minimApSide = minimApOpts.side;
		const bAckgroundColor = minimApEnAbled
			? theme.getColor(editorOverviewRulerBAckground) || TokenizAtionRegistry.getDefAultBAckground()
			: null;

		if (bAckgroundColor === null || minimApSide === 'left') {
			this.bAckgroundColor = null;
		} else {
			this.bAckgroundColor = Color.FormAt.CSS.formAtHex(bAckgroundColor);
		}

		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		const position = lAyoutInfo.overviewRuler;
		this.top = position.top;
		this.right = position.right;
		this.domWidth = position.width;
		this.domHeight = position.height;
		if (this.overviewRulerLAnes === 0) {
			// overview ruler is off
			this.cAnvAsWidth = 0;
			this.cAnvAsHeight = 0;
		} else {
			this.cAnvAsWidth = (this.domWidth * this.pixelRAtio) | 0;
			this.cAnvAsHeight = (this.domHeight * this.pixelRAtio) | 0;
		}

		const [x, w] = this._initLAnes(1, this.cAnvAsWidth, this.overviewRulerLAnes);
		this.x = x;
		this.w = w;
	}

	privAte _initLAnes(cAnvAsLeftOffset: number, cAnvAsWidth: number, lAneCount: number): [number[], number[]] {
		const remAiningWidth = cAnvAsWidth - cAnvAsLeftOffset;

		if (lAneCount >= 3) {
			const leftWidth = MAth.floor(remAiningWidth / 3);
			const rightWidth = MAth.floor(remAiningWidth / 3);
			const centerWidth = remAiningWidth - leftWidth - rightWidth;
			const leftOffset = cAnvAsLeftOffset;
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
		} else if (lAneCount === 2) {
			const leftWidth = MAth.floor(remAiningWidth / 2);
			const rightWidth = remAiningWidth - leftWidth;
			const leftOffset = cAnvAsLeftOffset;
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
			const offset = cAnvAsLeftOffset;
			const width = remAiningWidth;

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

	public equAls(other: Settings): booleAn {
		return (
			this.lineHeight === other.lineHeight
			&& this.pixelRAtio === other.pixelRAtio
			&& this.overviewRulerLAnes === other.overviewRulerLAnes
			&& this.renderBorder === other.renderBorder
			&& this.borderColor === other.borderColor
			&& this.hideCursor === other.hideCursor
			&& this.cursorColor === other.cursorColor
			&& this.themeType === other.themeType
			&& this.bAckgroundColor === other.bAckgroundColor
			&& this.top === other.top
			&& this.right === other.right
			&& this.domWidth === other.domWidth
			&& this.domHeight === other.domHeight
			&& this.cAnvAsWidth === other.cAnvAsWidth
			&& this.cAnvAsHeight === other.cAnvAsHeight
		);
	}
}

const enum ConstAnts {
	MIN_DECORATION_HEIGHT = 6
}

const enum OverviewRulerLAne {
	Left = 1,
	Center = 2,
	Right = 4,
	Full = 7
}

export clAss DecorAtionsOverviewRuler extends ViewPArt {

	privAte reAdonly _tokensColorTrAckerListener: IDisposAble;
	privAte reAdonly _domNode: FAstDomNode<HTMLCAnvAsElement>;
	privAte _settings!: Settings;
	privAte _cursorPositions: Position[];

	constructor(context: ViewContext) {
		super(context);

		this._domNode = creAteFAstDomNode(document.creAteElement('cAnvAs'));
		this._domNode.setClAssNAme('decorAtionsOverviewRuler');
		this._domNode.setPosition('Absolute');
		this._domNode.setLAyerHinting(true);
		this._domNode.setContAin('strict');
		this._domNode.setAttribute('AriA-hidden', 'true');

		this._updAteSettings(fAlse);

		this._tokensColorTrAckerListener = TokenizAtionRegistry.onDidChAnge((e) => {
			if (e.chAngedColorMAp) {
				this._updAteSettings(true);
			}
		});

		this._cursorPositions = [];
	}

	public dispose(): void {
		super.dispose();
		this._tokensColorTrAckerListener.dispose();
	}

	privAte _updAteSettings(renderNow: booleAn): booleAn {
		const newSettings = new Settings(this._context.configurAtion, this._context.theme);
		if (this._settings && this._settings.equAls(newSettings)) {
			// nothing to do
			return fAlse;
		}

		this._settings = newSettings;

		this._domNode.setTop(this._settings.top);
		this._domNode.setRight(this._settings.right);
		this._domNode.setWidth(this._settings.domWidth);
		this._domNode.setHeight(this._settings.domHeight);
		this._domNode.domNode.width = this._settings.cAnvAsWidth;
		this._domNode.domNode.height = this._settings.cAnvAsHeight;

		if (renderNow) {
			this._render();
		}

		return true;
	}

	// ---- begin view event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		return this._updAteSettings(fAlse);
	}
	public onCursorStAteChAnged(e: viewEvents.ViewCursorStAteChAngedEvent): booleAn {
		this._cursorPositions = [];
		for (let i = 0, len = e.selections.length; i < len; i++) {
			this._cursorPositions[i] = e.selections[i].getPosition();
		}
		this._cursorPositions.sort(Position.compAre);
		return true;
	}
	public onDecorAtionsChAnged(e: viewEvents.ViewDecorAtionsChAngedEvent): booleAn {
		if (e.AffectsOverviewRuler) {
			return true;
		}
		return fAlse;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		return true;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return e.scrollHeightChAnged;
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}
	public onThemeChAnged(e: viewEvents.ViewThemeChAngedEvent): booleAn {
		// invAlidAte color cAche
		this._context.model.invAlidAteOverviewRulerColorCAche();
		return this._updAteSettings(fAlse);
	}

	// ---- end view event hAndlers

	public getDomNode(): HTMLElement {
		return this._domNode.domNode;
	}

	public prepAreRender(ctx: RenderingContext): void {
		// Nothing to reAd
	}

	public render(editorCtx: RestrictedRenderingContext): void {
		this._render();
	}

	privAte _render(): void {
		if (this._settings.overviewRulerLAnes === 0) {
			// overview ruler is off
			this._domNode.setBAckgroundColor(this._settings.bAckgroundColor ? this._settings.bAckgroundColor : '');
			return;
		}
		const cAnvAsWidth = this._settings.cAnvAsWidth;
		const cAnvAsHeight = this._settings.cAnvAsHeight;
		const lineHeight = this._settings.lineHeight;
		const viewLAyout = this._context.viewLAyout;
		const outerHeight = this._context.viewLAyout.getScrollHeight();
		const heightRAtio = cAnvAsHeight / outerHeight;
		const decorAtions = this._context.model.getAllOverviewRulerDecorAtions(this._context.theme);

		const minDecorAtionHeight = (ConstAnts.MIN_DECORATION_HEIGHT * this._settings.pixelRAtio) | 0;
		const hAlfMinDecorAtionHeight = (minDecorAtionHeight / 2) | 0;

		const cAnvAsCtx = this._domNode.domNode.getContext('2d')!;
		if (this._settings.bAckgroundColor === null) {
			cAnvAsCtx.cleArRect(0, 0, cAnvAsWidth, cAnvAsHeight);
		} else {
			cAnvAsCtx.fillStyle = this._settings.bAckgroundColor;
			cAnvAsCtx.fillRect(0, 0, cAnvAsWidth, cAnvAsHeight);
		}

		const x = this._settings.x;
		const w = this._settings.w;
		// Avoid flickering by AlwAys rendering the colors in the sAme order
		// colors thAt don't use trAnspArency will be sorted lAst (they stArt with #)
		const colors = Object.keys(decorAtions);
		colors.sort();
		for (let cIndex = 0, cLen = colors.length; cIndex < cLen; cIndex++) {
			const color = colors[cIndex];

			const colorDecorAtions = decorAtions[color];

			cAnvAsCtx.fillStyle = color;

			let prevLAne = 0;
			let prevY1 = 0;
			let prevY2 = 0;
			for (let i = 0, len = colorDecorAtions.length; i < len; i++) {
				const lAne = colorDecorAtions[3 * i];
				const stArtLineNumber = colorDecorAtions[3 * i + 1];
				const endLineNumber = colorDecorAtions[3 * i + 2];

				let y1 = (viewLAyout.getVerticAlOffsetForLineNumber(stArtLineNumber) * heightRAtio) | 0;
				let y2 = ((viewLAyout.getVerticAlOffsetForLineNumber(endLineNumber) + lineHeight) * heightRAtio) | 0;
				const height = y2 - y1;
				if (height < minDecorAtionHeight) {
					let yCenter = ((y1 + y2) / 2) | 0;
					if (yCenter < hAlfMinDecorAtionHeight) {
						yCenter = hAlfMinDecorAtionHeight;
					} else if (yCenter + hAlfMinDecorAtionHeight > cAnvAsHeight) {
						yCenter = cAnvAsHeight - hAlfMinDecorAtionHeight;
					}
					y1 = yCenter - hAlfMinDecorAtionHeight;
					y2 = yCenter + hAlfMinDecorAtionHeight;
				}

				if (y1 > prevY2 + 1 || lAne !== prevLAne) {
					// flush prev
					if (i !== 0) {
						cAnvAsCtx.fillRect(x[prevLAne], prevY1, w[prevLAne], prevY2 - prevY1);
					}
					prevLAne = lAne;
					prevY1 = y1;
					prevY2 = y2;
				} else {
					// merge into prev
					if (y2 > prevY2) {
						prevY2 = y2;
					}
				}
			}
			cAnvAsCtx.fillRect(x[prevLAne], prevY1, w[prevLAne], prevY2 - prevY1);
		}

		// DrAw cursors
		if (!this._settings.hideCursor && this._settings.cursorColor) {
			const cursorHeight = (2 * this._settings.pixelRAtio) | 0;
			const hAlfCursorHeight = (cursorHeight / 2) | 0;
			const cursorX = this._settings.x[OverviewRulerLAne.Full];
			const cursorW = this._settings.w[OverviewRulerLAne.Full];
			cAnvAsCtx.fillStyle = this._settings.cursorColor;

			let prevY1 = -100;
			let prevY2 = -100;
			for (let i = 0, len = this._cursorPositions.length; i < len; i++) {
				const cursor = this._cursorPositions[i];

				let yCenter = (viewLAyout.getVerticAlOffsetForLineNumber(cursor.lineNumber) * heightRAtio) | 0;
				if (yCenter < hAlfCursorHeight) {
					yCenter = hAlfCursorHeight;
				} else if (yCenter + hAlfCursorHeight > cAnvAsHeight) {
					yCenter = cAnvAsHeight - hAlfCursorHeight;
				}
				const y1 = yCenter - hAlfCursorHeight;
				const y2 = y1 + cursorHeight;

				if (y1 > prevY2 + 1) {
					// flush prev
					if (i !== 0) {
						cAnvAsCtx.fillRect(cursorX, prevY1, cursorW, prevY2 - prevY1);
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
			cAnvAsCtx.fillRect(cursorX, prevY1, cursorW, prevY2 - prevY1);
		}

		if (this._settings.renderBorder && this._settings.borderColor && this._settings.overviewRulerLAnes > 0) {
			cAnvAsCtx.beginPAth();
			cAnvAsCtx.lineWidth = 1;
			cAnvAsCtx.strokeStyle = this._settings.borderColor;
			cAnvAsCtx.moveTo(0, 0);
			cAnvAsCtx.lineTo(0, cAnvAsHeight);
			cAnvAsCtx.stroke();

			cAnvAsCtx.moveTo(0, 0);
			cAnvAsCtx.lineTo(cAnvAsWidth, 0);
			cAnvAsCtx.stroke();
		}
	}
}
