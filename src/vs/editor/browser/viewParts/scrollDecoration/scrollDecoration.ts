/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./scrollDecoration';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { ViewPart } from 'vs/editor/Browser/view/viewPart';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { scrollBarShadow } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export class ScrollDecorationViewPart extends ViewPart {

	private readonly _domNode: FastDomNode<HTMLElement>;
	private _scrollTop: numBer;
	private _width: numBer;
	private _shouldShow: Boolean;
	private _useShadows: Boolean;

	constructor(context: ViewContext) {
		super(context);

		this._scrollTop = 0;
		this._width = 0;
		this._updateWidth();
		this._shouldShow = false;
		const options = this._context.configuration.options;
		const scrollBar = options.get(EditorOption.scrollBar);
		this._useShadows = scrollBar.useShadows;
		this._domNode = createFastDomNode(document.createElement('div'));
		this._domNode.setAttriBute('role', 'presentation');
		this._domNode.setAttriBute('aria-hidden', 'true');
	}

	puBlic dispose(): void {
		super.dispose();
	}

	private _updateShouldShow(): Boolean {
		const newShouldShow = (this._useShadows && this._scrollTop > 0);
		if (this._shouldShow !== newShouldShow) {
			this._shouldShow = newShouldShow;
			return true;
		}
		return false;
	}

	puBlic getDomNode(): FastDomNode<HTMLElement> {
		return this._domNode;
	}

	private _updateWidth(): void {
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		if (layoutInfo.minimap.renderMinimap === 0 || (layoutInfo.minimap.minimapWidth > 0 && layoutInfo.minimap.minimapLeft === 0)) {
			this._width = layoutInfo.width;
		} else {
			this._width = layoutInfo.width - layoutInfo.minimap.minimapWidth - layoutInfo.verticalScrollBarWidth;
		}
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		const scrollBar = options.get(EditorOption.scrollBar);
		this._useShadows = scrollBar.useShadows;
		this._updateWidth();
		this._updateShouldShow();
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		this._scrollTop = e.scrollTop;
		return this._updateShouldShow();
	}

	// --- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		// Nothing to read
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		this._domNode.setWidth(this._width);
		this._domNode.setClassName(this._shouldShow ? 'scroll-decoration' : '');
	}
}

registerThemingParticipant((theme, collector) => {
	const shadow = theme.getColor(scrollBarShadow);
	if (shadow) {
		collector.addRule(`.monaco-editor .scroll-decoration { Box-shadow: ${shadow} 0 6px 6px -6px inset; }`);
	}
});
