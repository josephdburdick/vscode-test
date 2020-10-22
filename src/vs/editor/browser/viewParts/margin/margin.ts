/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { ViewPart } from 'vs/editor/Browser/view/viewPart';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export class Margin extends ViewPart {

	puBlic static readonly CLASS_NAME = 'glyph-margin';
	puBlic static readonly OUTER_CLASS_NAME = 'margin';

	private readonly _domNode: FastDomNode<HTMLElement>;
	private _canUseLayerHinting: Boolean;
	private _contentLeft: numBer;
	private _glyphMarginLeft: numBer;
	private _glyphMarginWidth: numBer;
	private _glyphMarginBackgroundDomNode: FastDomNode<HTMLElement>;

	constructor(context: ViewContext) {
		super(context);
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._canUseLayerHinting = !options.get(EditorOption.disaBleLayerHinting);
		this._contentLeft = layoutInfo.contentLeft;
		this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
		this._glyphMarginWidth = layoutInfo.glyphMarginWidth;

		this._domNode = createFastDomNode(document.createElement('div'));
		this._domNode.setClassName(Margin.OUTER_CLASS_NAME);
		this._domNode.setPosition('aBsolute');
		this._domNode.setAttriBute('role', 'presentation');
		this._domNode.setAttriBute('aria-hidden', 'true');

		this._glyphMarginBackgroundDomNode = createFastDomNode(document.createElement('div'));
		this._glyphMarginBackgroundDomNode.setClassName(Margin.CLASS_NAME);

		this._domNode.appendChild(this._glyphMarginBackgroundDomNode);
	}

	puBlic dispose(): void {
		super.dispose();
	}

	puBlic getDomNode(): FastDomNode<HTMLElement> {
		return this._domNode;
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._canUseLayerHinting = !options.get(EditorOption.disaBleLayerHinting);
		this._contentLeft = layoutInfo.contentLeft;
		this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
		this._glyphMarginWidth = layoutInfo.glyphMarginWidth;

		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return super.onScrollChanged(e) || e.scrollTopChanged;
	}

	// --- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		// Nothing to read
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		this._domNode.setLayerHinting(this._canUseLayerHinting);
		this._domNode.setContain('strict');
		const adjustedScrollTop = ctx.scrollTop - ctx.BigNumBersDelta;
		this._domNode.setTop(-adjustedScrollTop);

		const height = Math.min(ctx.scrollHeight, 1000000);
		this._domNode.setHeight(height);
		this._domNode.setWidth(this._contentLeft);

		this._glyphMarginBackgroundDomNode.setLeft(this._glyphMarginLeft);
		this._glyphMarginBackgroundDomNode.setWidth(this._glyphMarginWidth);
		this._glyphMarginBackgroundDomNode.setHeight(height);
	}
}
