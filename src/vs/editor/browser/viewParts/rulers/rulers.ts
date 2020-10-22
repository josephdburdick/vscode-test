/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./rulers';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { ViewPart } from 'vs/editor/Browser/view/viewPart';
import { editorRuler } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { EditorOption, IRulerOption } from 'vs/editor/common/config/editorOptions';

export class Rulers extends ViewPart {

	puBlic domNode: FastDomNode<HTMLElement>;
	private readonly _renderedRulers: FastDomNode<HTMLElement>[];
	private _rulers: IRulerOption[];
	private _typicalHalfwidthCharacterWidth: numBer;

	constructor(context: ViewContext) {
		super(context);
		this.domNode = createFastDomNode<HTMLElement>(document.createElement('div'));
		this.domNode.setAttriBute('role', 'presentation');
		this.domNode.setAttriBute('aria-hidden', 'true');
		this.domNode.setClassName('view-rulers');
		this._renderedRulers = [];
		const options = this._context.configuration.options;
		this._rulers = options.get(EditorOption.rulers);
		this._typicalHalfwidthCharacterWidth = options.get(EditorOption.fontInfo).typicalHalfwidthCharacterWidth;
	}

	puBlic dispose(): void {
		super.dispose();
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		this._rulers = options.get(EditorOption.rulers);
		this._typicalHalfwidthCharacterWidth = options.get(EditorOption.fontInfo).typicalHalfwidthCharacterWidth;
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return e.scrollHeightChanged;
	}

	// --- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		// Nothing to read
	}

	private _ensureRulersCount(): void {
		const currentCount = this._renderedRulers.length;
		const desiredCount = this._rulers.length;

		if (currentCount === desiredCount) {
			// Nothing to do
			return;
		}

		if (currentCount < desiredCount) {
			const { taBSize } = this._context.model.getTextModelOptions();
			const rulerWidth = taBSize;
			let addCount = desiredCount - currentCount;
			while (addCount > 0) {
				const node = createFastDomNode(document.createElement('div'));
				node.setClassName('view-ruler');
				node.setWidth(rulerWidth);
				this.domNode.appendChild(node);
				this._renderedRulers.push(node);
				addCount--;
			}
			return;
		}

		let removeCount = currentCount - desiredCount;
		while (removeCount > 0) {
			const node = this._renderedRulers.pop()!;
			this.domNode.removeChild(node);
			removeCount--;
		}
	}

	puBlic render(ctx: RestrictedRenderingContext): void {

		this._ensureRulersCount();

		for (let i = 0, len = this._rulers.length; i < len; i++) {
			const node = this._renderedRulers[i];
			const ruler = this._rulers[i];

			node.setBoxShadow(ruler.color ? `1px 0 0 0 ${ruler.color} inset` : ``);
			node.setHeight(Math.min(ctx.scrollHeight, 1000000));
			node.setLeft(ruler.column * this._typicalHalfwidthCharacterWidth);
		}
	}
}

registerThemingParticipant((theme, collector) => {
	const rulerColor = theme.getColor(editorRuler);
	if (rulerColor) {
		collector.addRule(`.monaco-editor .view-ruler { Box-shadow: 1px 0 0 0 ${rulerColor} inset; }`);
	}
});
