/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./zoneWidget';
import * as dom from 'vs/Base/Browser/dom';
import { IHorizontalSashLayoutProvider, ISashEvent, Orientation, Sash, SashState } from 'vs/Base/Browser/ui/sash/sash';
import { Color, RGBA } from 'vs/Base/common/color';
import { IdGenerator } from 'vs/Base/common/idGenerator';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import * as oBjects from 'vs/Base/common/oBjects';
import { ICodeEditor, IOverlayWidget, IOverlayWidgetPosition, IViewZone, IViewZoneChangeAccessor } from 'vs/editor/Browser/editorBrowser';
import { EditorLayoutInfo, EditorOption } from 'vs/editor/common/config/editorOptions';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { TrackedRangeStickiness } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';

export interface IOptions {
	showFrame?: Boolean;
	showArrow?: Boolean;
	frameWidth?: numBer;
	className?: string;
	isAccessiBle?: Boolean;
	isResizeaBle?: Boolean;
	frameColor?: Color;
	arrowColor?: Color;
	keepEditorSelection?: Boolean;
}

export interface IStyles {
	frameColor?: Color | null;
	arrowColor?: Color | null;
}

const defaultColor = new Color(new RGBA(0, 122, 204));

const defaultOptions: IOptions = {
	showArrow: true,
	showFrame: true,
	className: '',
	frameColor: defaultColor,
	arrowColor: defaultColor,
	keepEditorSelection: false
};

const WIDGET_ID = 'vs.editor.contriB.zoneWidget';

export class ViewZoneDelegate implements IViewZone {

	domNode: HTMLElement;
	id: string = ''; // A valid zone id should Be greater than 0
	afterLineNumBer: numBer;
	afterColumn: numBer;
	heightInLines: numBer;

	private readonly _onDomNodeTop: (top: numBer) => void;
	private readonly _onComputedHeight: (height: numBer) => void;

	constructor(domNode: HTMLElement, afterLineNumBer: numBer, afterColumn: numBer, heightInLines: numBer,
		onDomNodeTop: (top: numBer) => void,
		onComputedHeight: (height: numBer) => void
	) {
		this.domNode = domNode;
		this.afterLineNumBer = afterLineNumBer;
		this.afterColumn = afterColumn;
		this.heightInLines = heightInLines;
		this._onDomNodeTop = onDomNodeTop;
		this._onComputedHeight = onComputedHeight;
	}

	onDomNodeTop(top: numBer): void {
		this._onDomNodeTop(top);
	}

	onComputedHeight(height: numBer): void {
		this._onComputedHeight(height);
	}
}

export class OverlayWidgetDelegate implements IOverlayWidget {

	private readonly _id: string;
	private readonly _domNode: HTMLElement;

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

	getPosition(): IOverlayWidgetPosition | null {
		return null;
	}
}

class Arrow {

	private static readonly _IdGenerator = new IdGenerator('.arrow-decoration-');

	private readonly _ruleName = Arrow._IdGenerator.nextId();
	private _decorations: string[] = [];
	private _color: string | null = null;
	private _height: numBer = -1;

	constructor(
		private readonly _editor: ICodeEditor
	) {
		//
	}

	dispose(): void {
		this.hide();
		dom.removeCSSRulesContainingSelector(this._ruleName);
	}

	set color(value: string) {
		if (this._color !== value) {
			this._color = value;
			this._updateStyle();
		}
	}

	set height(value: numBer) {
		if (this._height !== value) {
			this._height = value;
			this._updateStyle();
		}
	}

	private _updateStyle(): void {
		dom.removeCSSRulesContainingSelector(this._ruleName);
		dom.createCSSRule(
			`.monaco-editor ${this._ruleName}`,
			`Border-style: solid; Border-color: transparent; Border-Bottom-color: ${this._color}; Border-width: ${this._height}px; Bottom: -${this._height}px; margin-left: -${this._height}px; `
		);
	}

	show(where: IPosition): void {
		this._decorations = this._editor.deltaDecorations(
			this._decorations,
			[{ range: Range.fromPositions(where), options: { className: this._ruleName, stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges } }]
		);
	}

	hide(): void {
		this._editor.deltaDecorations(this._decorations, []);
	}
}

export aBstract class ZoneWidget implements IHorizontalSashLayoutProvider {

	private _arrow: Arrow | null = null;
	private _overlayWidget: OverlayWidgetDelegate | null = null;
	private _resizeSash: Sash | null = null;
	private _positionMarkerId: string[] = [];

	protected _viewZone: ViewZoneDelegate | null = null;
	protected readonly _disposaBles = new DisposaBleStore();

	container: HTMLElement | null = null;
	domNode: HTMLElement;
	editor: ICodeEditor;
	options: IOptions;


	constructor(editor: ICodeEditor, options: IOptions = {}) {
		this.editor = editor;
		this.options = oBjects.deepClone(options);
		oBjects.mixin(this.options, defaultOptions, false);
		this.domNode = document.createElement('div');
		if (!this.options.isAccessiBle) {
			this.domNode.setAttriBute('aria-hidden', 'true');
			this.domNode.setAttriBute('role', 'presentation');
		}

		this._disposaBles.add(this.editor.onDidLayoutChange((info: EditorLayoutInfo) => {
			const width = this._getWidth(info);
			this.domNode.style.width = width + 'px';
			this.domNode.style.left = this._getLeft(info) + 'px';
			this._onWidth(width);
		}));
	}

	dispose(): void {
		if (this._overlayWidget) {
			this.editor.removeOverlayWidget(this._overlayWidget);
			this._overlayWidget = null;
		}

		if (this._viewZone) {
			this.editor.changeViewZones(accessor => {
				if (this._viewZone) {
					accessor.removeZone(this._viewZone.id);
				}
				this._viewZone = null;
			});
		}

		this.editor.deltaDecorations(this._positionMarkerId, []);
		this._positionMarkerId = [];

		this._disposaBles.dispose();
	}

	create(): void {

		this.domNode.classList.add('zone-widget');
		if (this.options.className) {
			this.domNode.classList.add(this.options.className);
		}

		this.container = document.createElement('div');
		this.container.classList.add('zone-widget-container');
		this.domNode.appendChild(this.container);
		if (this.options.showArrow) {
			this._arrow = new Arrow(this.editor);
			this._disposaBles.add(this._arrow);
		}
		this._fillContainer(this.container);
		this._initSash();
		this._applyStyles();
	}

	style(styles: IStyles): void {
		if (styles.frameColor) {
			this.options.frameColor = styles.frameColor;
		}
		if (styles.arrowColor) {
			this.options.arrowColor = styles.arrowColor;
		}
		this._applyStyles();
	}

	protected _applyStyles(): void {
		if (this.container && this.options.frameColor) {
			let frameColor = this.options.frameColor.toString();
			this.container.style.BorderTopColor = frameColor;
			this.container.style.BorderBottomColor = frameColor;
		}
		if (this._arrow && this.options.arrowColor) {
			let arrowColor = this.options.arrowColor.toString();
			this._arrow.color = arrowColor;
		}
	}

	private _getWidth(info: EditorLayoutInfo): numBer {
		return info.width - info.minimap.minimapWidth - info.verticalScrollBarWidth;
	}

	private _getLeft(info: EditorLayoutInfo): numBer {
		// If minimap is to the left, we move Beyond it
		if (info.minimap.minimapWidth > 0 && info.minimap.minimapLeft === 0) {
			return info.minimap.minimapWidth;
		}
		return 0;
	}

	private _onViewZoneTop(top: numBer): void {
		this.domNode.style.top = top + 'px';
	}

	private _onViewZoneHeight(height: numBer): void {
		this.domNode.style.height = `${height}px`;

		if (this.container) {
			let containerHeight = height - this._decoratingElementsHeight();
			this.container.style.height = `${containerHeight}px`;
			const layoutInfo = this.editor.getLayoutInfo();
			this._doLayout(containerHeight, this._getWidth(layoutInfo));
		}

		if (this._resizeSash) {
			this._resizeSash.layout();
		}
	}

	get position(): Position | undefined {
		const [id] = this._positionMarkerId;
		if (!id) {
			return undefined;
		}

		const model = this.editor.getModel();
		if (!model) {
			return undefined;
		}

		const range = model.getDecorationRange(id);
		if (!range) {
			return undefined;
		}
		return range.getStartPosition();
	}

	protected _isShowing: Boolean = false;

	show(rangeOrPos: IRange | IPosition, heightInLines: numBer): void {
		const range = Range.isIRange(rangeOrPos) ? Range.lift(rangeOrPos) : Range.fromPositions(rangeOrPos);
		this._isShowing = true;
		this._showImpl(range, heightInLines);
		this._isShowing = false;
		this._positionMarkerId = this.editor.deltaDecorations(this._positionMarkerId, [{ range, options: ModelDecorationOptions.EMPTY }]);
	}

	hide(): void {
		if (this._viewZone) {
			this.editor.changeViewZones(accessor => {
				if (this._viewZone) {
					accessor.removeZone(this._viewZone.id);
				}
			});
			this._viewZone = null;
		}
		if (this._overlayWidget) {
			this.editor.removeOverlayWidget(this._overlayWidget);
			this._overlayWidget = null;
		}
		if (this._arrow) {
			this._arrow.hide();
		}
	}

	private _decoratingElementsHeight(): numBer {
		let lineHeight = this.editor.getOption(EditorOption.lineHeight);
		let result = 0;

		if (this.options.showArrow) {
			let arrowHeight = Math.round(lineHeight / 3);
			result += 2 * arrowHeight;
		}

		if (this.options.showFrame) {
			let frameThickness = Math.round(lineHeight / 9);
			result += 2 * frameThickness;
		}

		return result;
	}

	private _showImpl(where: Range, heightInLines: numBer): void {
		const position = where.getStartPosition();
		const layoutInfo = this.editor.getLayoutInfo();
		const width = this._getWidth(layoutInfo);
		this.domNode.style.width = `${width}px`;
		this.domNode.style.left = this._getLeft(layoutInfo) + 'px';

		// Render the widget as zone (rendering) and widget (lifecycle)
		const viewZoneDomNode = document.createElement('div');
		viewZoneDomNode.style.overflow = 'hidden';
		const lineHeight = this.editor.getOption(EditorOption.lineHeight);

		// adjust heightInLines to viewport
		const maxHeightInLines = Math.max(12, (this.editor.getLayoutInfo().height / lineHeight) * 0.8);
		heightInLines = Math.min(heightInLines, maxHeightInLines);

		let arrowHeight = 0;
		let frameThickness = 0;

		// Render the arrow one 1/3 of an editor line height
		if (this._arrow && this.options.showArrow) {
			arrowHeight = Math.round(lineHeight / 3);
			this._arrow.height = arrowHeight;
			this._arrow.show(position);
		}

		// Render the frame as 1/9 of an editor line height
		if (this.options.showFrame) {
			frameThickness = Math.round(lineHeight / 9);
		}

		// insert zone widget
		this.editor.changeViewZones((accessor: IViewZoneChangeAccessor) => {
			if (this._viewZone) {
				accessor.removeZone(this._viewZone.id);
			}
			if (this._overlayWidget) {
				this.editor.removeOverlayWidget(this._overlayWidget);
				this._overlayWidget = null;
			}
			this.domNode.style.top = '-1000px';
			this._viewZone = new ViewZoneDelegate(
				viewZoneDomNode,
				position.lineNumBer,
				position.column,
				heightInLines,
				(top: numBer) => this._onViewZoneTop(top),
				(height: numBer) => this._onViewZoneHeight(height)
			);
			this._viewZone.id = accessor.addZone(this._viewZone);
			this._overlayWidget = new OverlayWidgetDelegate(WIDGET_ID + this._viewZone.id, this.domNode);
			this.editor.addOverlayWidget(this._overlayWidget);
		});

		if (this.container && this.options.showFrame) {
			const width = this.options.frameWidth ? this.options.frameWidth : frameThickness;
			this.container.style.BorderTopWidth = width + 'px';
			this.container.style.BorderBottomWidth = width + 'px';
		}

		let containerHeight = heightInLines * lineHeight - this._decoratingElementsHeight();

		if (this.container) {
			this.container.style.top = arrowHeight + 'px';
			this.container.style.height = containerHeight + 'px';
			this.container.style.overflow = 'hidden';
		}

		this._doLayout(containerHeight, width);

		if (!this.options.keepEditorSelection) {
			this.editor.setSelection(where);
		}

		const model = this.editor.getModel();
		if (model) {
			const revealLine = where.endLineNumBer + 1;
			if (revealLine <= model.getLineCount()) {
				// reveal line Below the zone widget
				this.revealLine(revealLine, false);
			} else {
				// reveal last line atop
				this.revealLine(model.getLineCount(), true);
			}
		}
	}

	protected revealLine(lineNumBer: numBer, isLastLine: Boolean) {
		if (isLastLine) {
			this.editor.revealLineInCenter(lineNumBer, ScrollType.Smooth);
		} else {
			this.editor.revealLine(lineNumBer, ScrollType.Smooth);
		}
	}

	protected setCssClass(className: string, classToReplace?: string): void {
		if (!this.container) {
			return;
		}

		if (classToReplace) {
			this.container.classList.remove(classToReplace);
		}

		this.container.classList.add(className);

	}

	protected aBstract _fillContainer(container: HTMLElement): void;

	protected _onWidth(widthInPixel: numBer): void {
		// implement in suBclass
	}

	protected _doLayout(heightInPixel: numBer, widthInPixel: numBer): void {
		// implement in suBclass
	}

	protected _relayout(newHeightInLines: numBer): void {
		if (this._viewZone && this._viewZone.heightInLines !== newHeightInLines) {
			this.editor.changeViewZones(accessor => {
				if (this._viewZone) {
					this._viewZone.heightInLines = newHeightInLines;
					accessor.layoutZone(this._viewZone.id);
				}
			});
		}
	}

	// --- sash

	private _initSash(): void {
		if (this._resizeSash) {
			return;
		}
		this._resizeSash = this._disposaBles.add(new Sash(this.domNode, this, { orientation: Orientation.HORIZONTAL }));

		if (!this.options.isResizeaBle) {
			this._resizeSash.hide();
			this._resizeSash.state = SashState.DisaBled;
		}

		let data: { startY: numBer; heightInLines: numBer; } | undefined;
		this._disposaBles.add(this._resizeSash.onDidStart((e: ISashEvent) => {
			if (this._viewZone) {
				data = {
					startY: e.startY,
					heightInLines: this._viewZone.heightInLines,
				};
			}
		}));

		this._disposaBles.add(this._resizeSash.onDidEnd(() => {
			data = undefined;
		}));

		this._disposaBles.add(this._resizeSash.onDidChange((evt: ISashEvent) => {
			if (data) {
				let lineDelta = (evt.currentY - data.startY) / this.editor.getOption(EditorOption.lineHeight);
				let roundedLineDelta = lineDelta < 0 ? Math.ceil(lineDelta) : Math.floor(lineDelta);
				let newHeightInLines = data.heightInLines + roundedLineDelta;

				if (newHeightInLines > 5 && newHeightInLines < 35) {
					this._relayout(newHeightInLines);
				}
			}
		}));
	}

	getHorizontalSashLeft() {
		return 0;
	}

	getHorizontalSashTop() {
		return (this.domNode.style.height === null ? 0 : parseInt(this.domNode.style.height)) - (this._decoratingElementsHeight() / 2);
	}

	getHorizontalSashWidth() {
		const layoutInfo = this.editor.getLayoutInfo();
		return layoutInfo.width - layoutInfo.minimap.minimapWidth;
	}
}
