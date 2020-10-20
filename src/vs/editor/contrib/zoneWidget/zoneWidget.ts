/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./zoneWidget';
import * As dom from 'vs/bAse/browser/dom';
import { IHorizontAlSAshLAyoutProvider, ISAshEvent, OrientAtion, SAsh, SAshStAte } from 'vs/bAse/browser/ui/sAsh/sAsh';
import { Color, RGBA } from 'vs/bAse/common/color';
import { IdGenerAtor } from 'vs/bAse/common/idGenerAtor';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As objects from 'vs/bAse/common/objects';
import { ICodeEditor, IOverlAyWidget, IOverlAyWidgetPosition, IViewZone, IViewZoneChAngeAccessor } from 'vs/editor/browser/editorBrowser';
import { EditorLAyoutInfo, EditorOption } from 'vs/editor/common/config/editorOptions';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';

export interfAce IOptions {
	showFrAme?: booleAn;
	showArrow?: booleAn;
	frAmeWidth?: number;
	clAssNAme?: string;
	isAccessible?: booleAn;
	isResizeAble?: booleAn;
	frAmeColor?: Color;
	ArrowColor?: Color;
	keepEditorSelection?: booleAn;
}

export interfAce IStyles {
	frAmeColor?: Color | null;
	ArrowColor?: Color | null;
}

const defAultColor = new Color(new RGBA(0, 122, 204));

const defAultOptions: IOptions = {
	showArrow: true,
	showFrAme: true,
	clAssNAme: '',
	frAmeColor: defAultColor,
	ArrowColor: defAultColor,
	keepEditorSelection: fAlse
};

const WIDGET_ID = 'vs.editor.contrib.zoneWidget';

export clAss ViewZoneDelegAte implements IViewZone {

	domNode: HTMLElement;
	id: string = ''; // A vAlid zone id should be greAter thAn 0
	AfterLineNumber: number;
	AfterColumn: number;
	heightInLines: number;

	privAte reAdonly _onDomNodeTop: (top: number) => void;
	privAte reAdonly _onComputedHeight: (height: number) => void;

	constructor(domNode: HTMLElement, AfterLineNumber: number, AfterColumn: number, heightInLines: number,
		onDomNodeTop: (top: number) => void,
		onComputedHeight: (height: number) => void
	) {
		this.domNode = domNode;
		this.AfterLineNumber = AfterLineNumber;
		this.AfterColumn = AfterColumn;
		this.heightInLines = heightInLines;
		this._onDomNodeTop = onDomNodeTop;
		this._onComputedHeight = onComputedHeight;
	}

	onDomNodeTop(top: number): void {
		this._onDomNodeTop(top);
	}

	onComputedHeight(height: number): void {
		this._onComputedHeight(height);
	}
}

export clAss OverlAyWidgetDelegAte implements IOverlAyWidget {

	privAte reAdonly _id: string;
	privAte reAdonly _domNode: HTMLElement;

	constructor(id: string, domNode: HTMLElement) {
		this._id = id;
		this._domNode = domNode;
	}

	getId(): string {
		return this._id;
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	getPosition(): IOverlAyWidgetPosition | null {
		return null;
	}
}

clAss Arrow {

	privAte stAtic reAdonly _IdGenerAtor = new IdGenerAtor('.Arrow-decorAtion-');

	privAte reAdonly _ruleNAme = Arrow._IdGenerAtor.nextId();
	privAte _decorAtions: string[] = [];
	privAte _color: string | null = null;
	privAte _height: number = -1;

	constructor(
		privAte reAdonly _editor: ICodeEditor
	) {
		//
	}

	dispose(): void {
		this.hide();
		dom.removeCSSRulesContAiningSelector(this._ruleNAme);
	}

	set color(vAlue: string) {
		if (this._color !== vAlue) {
			this._color = vAlue;
			this._updAteStyle();
		}
	}

	set height(vAlue: number) {
		if (this._height !== vAlue) {
			this._height = vAlue;
			this._updAteStyle();
		}
	}

	privAte _updAteStyle(): void {
		dom.removeCSSRulesContAiningSelector(this._ruleNAme);
		dom.creAteCSSRule(
			`.monAco-editor ${this._ruleNAme}`,
			`border-style: solid; border-color: trAnspArent; border-bottom-color: ${this._color}; border-width: ${this._height}px; bottom: -${this._height}px; mArgin-left: -${this._height}px; `
		);
	}

	show(where: IPosition): void {
		this._decorAtions = this._editor.deltADecorAtions(
			this._decorAtions,
			[{ rAnge: RAnge.fromPositions(where), options: { clAssNAme: this._ruleNAme, stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges } }]
		);
	}

	hide(): void {
		this._editor.deltADecorAtions(this._decorAtions, []);
	}
}

export AbstrAct clAss ZoneWidget implements IHorizontAlSAshLAyoutProvider {

	privAte _Arrow: Arrow | null = null;
	privAte _overlAyWidget: OverlAyWidgetDelegAte | null = null;
	privAte _resizeSAsh: SAsh | null = null;
	privAte _positionMArkerId: string[] = [];

	protected _viewZone: ViewZoneDelegAte | null = null;
	protected reAdonly _disposAbles = new DisposAbleStore();

	contAiner: HTMLElement | null = null;
	domNode: HTMLElement;
	editor: ICodeEditor;
	options: IOptions;


	constructor(editor: ICodeEditor, options: IOptions = {}) {
		this.editor = editor;
		this.options = objects.deepClone(options);
		objects.mixin(this.options, defAultOptions, fAlse);
		this.domNode = document.creAteElement('div');
		if (!this.options.isAccessible) {
			this.domNode.setAttribute('AriA-hidden', 'true');
			this.domNode.setAttribute('role', 'presentAtion');
		}

		this._disposAbles.Add(this.editor.onDidLAyoutChAnge((info: EditorLAyoutInfo) => {
			const width = this._getWidth(info);
			this.domNode.style.width = width + 'px';
			this.domNode.style.left = this._getLeft(info) + 'px';
			this._onWidth(width);
		}));
	}

	dispose(): void {
		if (this._overlAyWidget) {
			this.editor.removeOverlAyWidget(this._overlAyWidget);
			this._overlAyWidget = null;
		}

		if (this._viewZone) {
			this.editor.chAngeViewZones(Accessor => {
				if (this._viewZone) {
					Accessor.removeZone(this._viewZone.id);
				}
				this._viewZone = null;
			});
		}

		this.editor.deltADecorAtions(this._positionMArkerId, []);
		this._positionMArkerId = [];

		this._disposAbles.dispose();
	}

	creAte(): void {

		this.domNode.clAssList.Add('zone-widget');
		if (this.options.clAssNAme) {
			this.domNode.clAssList.Add(this.options.clAssNAme);
		}

		this.contAiner = document.creAteElement('div');
		this.contAiner.clAssList.Add('zone-widget-contAiner');
		this.domNode.AppendChild(this.contAiner);
		if (this.options.showArrow) {
			this._Arrow = new Arrow(this.editor);
			this._disposAbles.Add(this._Arrow);
		}
		this._fillContAiner(this.contAiner);
		this._initSAsh();
		this._ApplyStyles();
	}

	style(styles: IStyles): void {
		if (styles.frAmeColor) {
			this.options.frAmeColor = styles.frAmeColor;
		}
		if (styles.ArrowColor) {
			this.options.ArrowColor = styles.ArrowColor;
		}
		this._ApplyStyles();
	}

	protected _ApplyStyles(): void {
		if (this.contAiner && this.options.frAmeColor) {
			let frAmeColor = this.options.frAmeColor.toString();
			this.contAiner.style.borderTopColor = frAmeColor;
			this.contAiner.style.borderBottomColor = frAmeColor;
		}
		if (this._Arrow && this.options.ArrowColor) {
			let ArrowColor = this.options.ArrowColor.toString();
			this._Arrow.color = ArrowColor;
		}
	}

	privAte _getWidth(info: EditorLAyoutInfo): number {
		return info.width - info.minimAp.minimApWidth - info.verticAlScrollbArWidth;
	}

	privAte _getLeft(info: EditorLAyoutInfo): number {
		// If minimAp is to the left, we move beyond it
		if (info.minimAp.minimApWidth > 0 && info.minimAp.minimApLeft === 0) {
			return info.minimAp.minimApWidth;
		}
		return 0;
	}

	privAte _onViewZoneTop(top: number): void {
		this.domNode.style.top = top + 'px';
	}

	privAte _onViewZoneHeight(height: number): void {
		this.domNode.style.height = `${height}px`;

		if (this.contAiner) {
			let contAinerHeight = height - this._decorAtingElementsHeight();
			this.contAiner.style.height = `${contAinerHeight}px`;
			const lAyoutInfo = this.editor.getLAyoutInfo();
			this._doLAyout(contAinerHeight, this._getWidth(lAyoutInfo));
		}

		if (this._resizeSAsh) {
			this._resizeSAsh.lAyout();
		}
	}

	get position(): Position | undefined {
		const [id] = this._positionMArkerId;
		if (!id) {
			return undefined;
		}

		const model = this.editor.getModel();
		if (!model) {
			return undefined;
		}

		const rAnge = model.getDecorAtionRAnge(id);
		if (!rAnge) {
			return undefined;
		}
		return rAnge.getStArtPosition();
	}

	protected _isShowing: booleAn = fAlse;

	show(rAngeOrPos: IRAnge | IPosition, heightInLines: number): void {
		const rAnge = RAnge.isIRAnge(rAngeOrPos) ? RAnge.lift(rAngeOrPos) : RAnge.fromPositions(rAngeOrPos);
		this._isShowing = true;
		this._showImpl(rAnge, heightInLines);
		this._isShowing = fAlse;
		this._positionMArkerId = this.editor.deltADecorAtions(this._positionMArkerId, [{ rAnge, options: ModelDecorAtionOptions.EMPTY }]);
	}

	hide(): void {
		if (this._viewZone) {
			this.editor.chAngeViewZones(Accessor => {
				if (this._viewZone) {
					Accessor.removeZone(this._viewZone.id);
				}
			});
			this._viewZone = null;
		}
		if (this._overlAyWidget) {
			this.editor.removeOverlAyWidget(this._overlAyWidget);
			this._overlAyWidget = null;
		}
		if (this._Arrow) {
			this._Arrow.hide();
		}
	}

	privAte _decorAtingElementsHeight(): number {
		let lineHeight = this.editor.getOption(EditorOption.lineHeight);
		let result = 0;

		if (this.options.showArrow) {
			let ArrowHeight = MAth.round(lineHeight / 3);
			result += 2 * ArrowHeight;
		}

		if (this.options.showFrAme) {
			let frAmeThickness = MAth.round(lineHeight / 9);
			result += 2 * frAmeThickness;
		}

		return result;
	}

	privAte _showImpl(where: RAnge, heightInLines: number): void {
		const position = where.getStArtPosition();
		const lAyoutInfo = this.editor.getLAyoutInfo();
		const width = this._getWidth(lAyoutInfo);
		this.domNode.style.width = `${width}px`;
		this.domNode.style.left = this._getLeft(lAyoutInfo) + 'px';

		// Render the widget As zone (rendering) And widget (lifecycle)
		const viewZoneDomNode = document.creAteElement('div');
		viewZoneDomNode.style.overflow = 'hidden';
		const lineHeight = this.editor.getOption(EditorOption.lineHeight);

		// Adjust heightInLines to viewport
		const mAxHeightInLines = MAth.mAx(12, (this.editor.getLAyoutInfo().height / lineHeight) * 0.8);
		heightInLines = MAth.min(heightInLines, mAxHeightInLines);

		let ArrowHeight = 0;
		let frAmeThickness = 0;

		// Render the Arrow one 1/3 of An editor line height
		if (this._Arrow && this.options.showArrow) {
			ArrowHeight = MAth.round(lineHeight / 3);
			this._Arrow.height = ArrowHeight;
			this._Arrow.show(position);
		}

		// Render the frAme As 1/9 of An editor line height
		if (this.options.showFrAme) {
			frAmeThickness = MAth.round(lineHeight / 9);
		}

		// insert zone widget
		this.editor.chAngeViewZones((Accessor: IViewZoneChAngeAccessor) => {
			if (this._viewZone) {
				Accessor.removeZone(this._viewZone.id);
			}
			if (this._overlAyWidget) {
				this.editor.removeOverlAyWidget(this._overlAyWidget);
				this._overlAyWidget = null;
			}
			this.domNode.style.top = '-1000px';
			this._viewZone = new ViewZoneDelegAte(
				viewZoneDomNode,
				position.lineNumber,
				position.column,
				heightInLines,
				(top: number) => this._onViewZoneTop(top),
				(height: number) => this._onViewZoneHeight(height)
			);
			this._viewZone.id = Accessor.AddZone(this._viewZone);
			this._overlAyWidget = new OverlAyWidgetDelegAte(WIDGET_ID + this._viewZone.id, this.domNode);
			this.editor.AddOverlAyWidget(this._overlAyWidget);
		});

		if (this.contAiner && this.options.showFrAme) {
			const width = this.options.frAmeWidth ? this.options.frAmeWidth : frAmeThickness;
			this.contAiner.style.borderTopWidth = width + 'px';
			this.contAiner.style.borderBottomWidth = width + 'px';
		}

		let contAinerHeight = heightInLines * lineHeight - this._decorAtingElementsHeight();

		if (this.contAiner) {
			this.contAiner.style.top = ArrowHeight + 'px';
			this.contAiner.style.height = contAinerHeight + 'px';
			this.contAiner.style.overflow = 'hidden';
		}

		this._doLAyout(contAinerHeight, width);

		if (!this.options.keepEditorSelection) {
			this.editor.setSelection(where);
		}

		const model = this.editor.getModel();
		if (model) {
			const reveAlLine = where.endLineNumber + 1;
			if (reveAlLine <= model.getLineCount()) {
				// reveAl line below the zone widget
				this.reveAlLine(reveAlLine, fAlse);
			} else {
				// reveAl lAst line Atop
				this.reveAlLine(model.getLineCount(), true);
			}
		}
	}

	protected reveAlLine(lineNumber: number, isLAstLine: booleAn) {
		if (isLAstLine) {
			this.editor.reveAlLineInCenter(lineNumber, ScrollType.Smooth);
		} else {
			this.editor.reveAlLine(lineNumber, ScrollType.Smooth);
		}
	}

	protected setCssClAss(clAssNAme: string, clAssToReplAce?: string): void {
		if (!this.contAiner) {
			return;
		}

		if (clAssToReplAce) {
			this.contAiner.clAssList.remove(clAssToReplAce);
		}

		this.contAiner.clAssList.Add(clAssNAme);

	}

	protected AbstrAct _fillContAiner(contAiner: HTMLElement): void;

	protected _onWidth(widthInPixel: number): void {
		// implement in subclAss
	}

	protected _doLAyout(heightInPixel: number, widthInPixel: number): void {
		// implement in subclAss
	}

	protected _relAyout(newHeightInLines: number): void {
		if (this._viewZone && this._viewZone.heightInLines !== newHeightInLines) {
			this.editor.chAngeViewZones(Accessor => {
				if (this._viewZone) {
					this._viewZone.heightInLines = newHeightInLines;
					Accessor.lAyoutZone(this._viewZone.id);
				}
			});
		}
	}

	// --- sAsh

	privAte _initSAsh(): void {
		if (this._resizeSAsh) {
			return;
		}
		this._resizeSAsh = this._disposAbles.Add(new SAsh(this.domNode, this, { orientAtion: OrientAtion.HORIZONTAL }));

		if (!this.options.isResizeAble) {
			this._resizeSAsh.hide();
			this._resizeSAsh.stAte = SAshStAte.DisAbled;
		}

		let dAtA: { stArtY: number; heightInLines: number; } | undefined;
		this._disposAbles.Add(this._resizeSAsh.onDidStArt((e: ISAshEvent) => {
			if (this._viewZone) {
				dAtA = {
					stArtY: e.stArtY,
					heightInLines: this._viewZone.heightInLines,
				};
			}
		}));

		this._disposAbles.Add(this._resizeSAsh.onDidEnd(() => {
			dAtA = undefined;
		}));

		this._disposAbles.Add(this._resizeSAsh.onDidChAnge((evt: ISAshEvent) => {
			if (dAtA) {
				let lineDeltA = (evt.currentY - dAtA.stArtY) / this.editor.getOption(EditorOption.lineHeight);
				let roundedLineDeltA = lineDeltA < 0 ? MAth.ceil(lineDeltA) : MAth.floor(lineDeltA);
				let newHeightInLines = dAtA.heightInLines + roundedLineDeltA;

				if (newHeightInLines > 5 && newHeightInLines < 35) {
					this._relAyout(newHeightInLines);
				}
			}
		}));
	}

	getHorizontAlSAshLeft() {
		return 0;
	}

	getHorizontAlSAshTop() {
		return (this.domNode.style.height === null ? 0 : pArseInt(this.domNode.style.height)) - (this._decorAtingElementsHeight() / 2);
	}

	getHorizontAlSAshWidth() {
		const lAyoutInfo = this.editor.getLAyoutInfo();
		return lAyoutInfo.width - lAyoutInfo.minimAp.minimApWidth;
	}
}
