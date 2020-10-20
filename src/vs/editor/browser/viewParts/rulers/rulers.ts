/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./rulers';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { editorRuler } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { EditorOption, IRulerOption } from 'vs/editor/common/config/editorOptions';

export clAss Rulers extends ViewPArt {

	public domNode: FAstDomNode<HTMLElement>;
	privAte reAdonly _renderedRulers: FAstDomNode<HTMLElement>[];
	privAte _rulers: IRulerOption[];
	privAte _typicAlHAlfwidthChArActerWidth: number;

	constructor(context: ViewContext) {
		super(context);
		this.domNode = creAteFAstDomNode<HTMLElement>(document.creAteElement('div'));
		this.domNode.setAttribute('role', 'presentAtion');
		this.domNode.setAttribute('AriA-hidden', 'true');
		this.domNode.setClAssNAme('view-rulers');
		this._renderedRulers = [];
		const options = this._context.configurAtion.options;
		this._rulers = options.get(EditorOption.rulers);
		this._typicAlHAlfwidthChArActerWidth = options.get(EditorOption.fontInfo).typicAlHAlfwidthChArActerWidth;
	}

	public dispose(): void {
		super.dispose();
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		this._rulers = options.get(EditorOption.rulers);
		this._typicAlHAlfwidthChArActerWidth = options.get(EditorOption.fontInfo).typicAlHAlfwidthChArActerWidth;
		return true;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return e.scrollHeightChAnged;
	}

	// --- end event hAndlers

	public prepAreRender(ctx: RenderingContext): void {
		// Nothing to reAd
	}

	privAte _ensureRulersCount(): void {
		const currentCount = this._renderedRulers.length;
		const desiredCount = this._rulers.length;

		if (currentCount === desiredCount) {
			// Nothing to do
			return;
		}

		if (currentCount < desiredCount) {
			const { tAbSize } = this._context.model.getTextModelOptions();
			const rulerWidth = tAbSize;
			let AddCount = desiredCount - currentCount;
			while (AddCount > 0) {
				const node = creAteFAstDomNode(document.creAteElement('div'));
				node.setClAssNAme('view-ruler');
				node.setWidth(rulerWidth);
				this.domNode.AppendChild(node);
				this._renderedRulers.push(node);
				AddCount--;
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

	public render(ctx: RestrictedRenderingContext): void {

		this._ensureRulersCount();

		for (let i = 0, len = this._rulers.length; i < len; i++) {
			const node = this._renderedRulers[i];
			const ruler = this._rulers[i];

			node.setBoxShAdow(ruler.color ? `1px 0 0 0 ${ruler.color} inset` : ``);
			node.setHeight(MAth.min(ctx.scrollHeight, 1000000));
			node.setLeft(ruler.column * this._typicAlHAlfwidthChArActerWidth);
		}
	}
}

registerThemingPArticipAnt((theme, collector) => {
	const rulerColor = theme.getColor(editorRuler);
	if (rulerColor) {
		collector.AddRule(`.monAco-editor .view-ruler { box-shAdow: 1px 0 0 0 ${rulerColor} inset; }`);
	}
});
