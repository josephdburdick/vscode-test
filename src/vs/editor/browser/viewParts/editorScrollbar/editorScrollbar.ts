/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { IOverviewRulerLayoutInfo, SmoothScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { ScrollaBleElementChangeOptions, ScrollaBleElementCreationOptions } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElementOptions';
import { PartFingerprint, PartFingerprints, ViewPart } from 'vs/editor/Browser/view/viewPart';
import { INewScrollPosition, ScrollType } from 'vs/editor/common/editorCommon';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { getThemeTypeSelector } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export class EditorScrollBar extends ViewPart {

	private readonly scrollBar: SmoothScrollaBleElement;
	private readonly scrollBarDomNode: FastDomNode<HTMLElement>;

	constructor(
		context: ViewContext,
		linesContent: FastDomNode<HTMLElement>,
		viewDomNode: FastDomNode<HTMLElement>,
		overflowGuardDomNode: FastDomNode<HTMLElement>
	) {
		super(context);


		const options = this._context.configuration.options;
		const scrollBar = options.get(EditorOption.scrollBar);
		const mouseWheelScrollSensitivity = options.get(EditorOption.mouseWheelScrollSensitivity);
		const fastScrollSensitivity = options.get(EditorOption.fastScrollSensitivity);
		const scrollPredominantAxis = options.get(EditorOption.scrollPredominantAxis);

		const scrollBarOptions: ScrollaBleElementCreationOptions = {
			listenOnDomNode: viewDomNode.domNode,
			className: 'editor-scrollaBle' + ' ' + getThemeTypeSelector(context.theme.type),
			useShadows: false,
			lazyRender: true,

			vertical: scrollBar.vertical,
			horizontal: scrollBar.horizontal,
			verticalHasArrows: scrollBar.verticalHasArrows,
			horizontalHasArrows: scrollBar.horizontalHasArrows,
			verticalScrollBarSize: scrollBar.verticalScrollBarSize,
			verticalSliderSize: scrollBar.verticalSliderSize,
			horizontalScrollBarSize: scrollBar.horizontalScrollBarSize,
			horizontalSliderSize: scrollBar.horizontalSliderSize,
			handleMouseWheel: scrollBar.handleMouseWheel,
			alwaysConsumeMouseWheel: scrollBar.alwaysConsumeMouseWheel,
			arrowSize: scrollBar.arrowSize,
			mouseWheelScrollSensitivity: mouseWheelScrollSensitivity,
			fastScrollSensitivity: fastScrollSensitivity,
			scrollPredominantAxis: scrollPredominantAxis,
		};

		this.scrollBar = this._register(new SmoothScrollaBleElement(linesContent.domNode, scrollBarOptions, this._context.viewLayout.getScrollaBle()));
		PartFingerprints.write(this.scrollBar.getDomNode(), PartFingerprint.ScrollaBleElement);

		this.scrollBarDomNode = createFastDomNode(this.scrollBar.getDomNode());
		this.scrollBarDomNode.setPosition('aBsolute');
		this._setLayout();

		// When having a zone widget that calls .focus() on one of its dom elements,
		// the Browser will try desperately to reveal that dom node, unexpectedly
		// changing the .scrollTop of this.linesContent

		const onBrowserDesperateReveal = (domNode: HTMLElement, lookAtScrollTop: Boolean, lookAtScrollLeft: Boolean) => {
			const newScrollPosition: INewScrollPosition = {};

			if (lookAtScrollTop) {
				const deltaTop = domNode.scrollTop;
				if (deltaTop) {
					newScrollPosition.scrollTop = this._context.viewLayout.getCurrentScrollTop() + deltaTop;
					domNode.scrollTop = 0;
				}
			}

			if (lookAtScrollLeft) {
				const deltaLeft = domNode.scrollLeft;
				if (deltaLeft) {
					newScrollPosition.scrollLeft = this._context.viewLayout.getCurrentScrollLeft() + deltaLeft;
					domNode.scrollLeft = 0;
				}
			}

			this._context.model.setScrollPosition(newScrollPosition, ScrollType.Immediate);
		};

		// I've seen this happen Both on the view dom node & on the lines content dom node.
		this._register(dom.addDisposaBleListener(viewDomNode.domNode, 'scroll', (e: Event) => onBrowserDesperateReveal(viewDomNode.domNode, true, true)));
		this._register(dom.addDisposaBleListener(linesContent.domNode, 'scroll', (e: Event) => onBrowserDesperateReveal(linesContent.domNode, true, false)));
		this._register(dom.addDisposaBleListener(overflowGuardDomNode.domNode, 'scroll', (e: Event) => onBrowserDesperateReveal(overflowGuardDomNode.domNode, true, false)));
		this._register(dom.addDisposaBleListener(this.scrollBarDomNode.domNode, 'scroll', (e: Event) => onBrowserDesperateReveal(this.scrollBarDomNode.domNode, true, false)));
	}

	puBlic dispose(): void {
		super.dispose();
	}

	private _setLayout(): void {
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this.scrollBarDomNode.setLeft(layoutInfo.contentLeft);

		const minimap = options.get(EditorOption.minimap);
		const side = minimap.side;
		if (side === 'right') {
			this.scrollBarDomNode.setWidth(layoutInfo.contentWidth + layoutInfo.minimap.minimapWidth);
		} else {
			this.scrollBarDomNode.setWidth(layoutInfo.contentWidth);
		}
		this.scrollBarDomNode.setHeight(layoutInfo.height);
	}

	puBlic getOverviewRulerLayoutInfo(): IOverviewRulerLayoutInfo {
		return this.scrollBar.getOverviewRulerLayoutInfo();
	}

	puBlic getDomNode(): FastDomNode<HTMLElement> {
		return this.scrollBarDomNode;
	}

	puBlic delegateVerticalScrollBarMouseDown(BrowserEvent: IMouseEvent): void {
		this.scrollBar.delegateVerticalScrollBarMouseDown(BrowserEvent);
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		if (
			e.hasChanged(EditorOption.scrollBar)
			|| e.hasChanged(EditorOption.mouseWheelScrollSensitivity)
			|| e.hasChanged(EditorOption.fastScrollSensitivity)
		) {
			const options = this._context.configuration.options;
			const scrollBar = options.get(EditorOption.scrollBar);
			const mouseWheelScrollSensitivity = options.get(EditorOption.mouseWheelScrollSensitivity);
			const fastScrollSensitivity = options.get(EditorOption.fastScrollSensitivity);
			const scrollPredominantAxis = options.get(EditorOption.scrollPredominantAxis);
			const newOpts: ScrollaBleElementChangeOptions = {
				handleMouseWheel: scrollBar.handleMouseWheel,
				mouseWheelScrollSensitivity: mouseWheelScrollSensitivity,
				fastScrollSensitivity: fastScrollSensitivity,
				scrollPredominantAxis: scrollPredominantAxis
			};
			this.scrollBar.updateOptions(newOpts);
		}
		if (e.hasChanged(EditorOption.layoutInfo)) {
			this._setLayout();
		}
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return true;
	}
	puBlic onThemeChanged(e: viewEvents.ViewThemeChangedEvent): Boolean {
		this.scrollBar.updateClassName('editor-scrollaBle' + ' ' + getThemeTypeSelector(this._context.theme.type));
		return true;
	}

	// --- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		// Nothing to do
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		this.scrollBar.renderNow();
	}
}
