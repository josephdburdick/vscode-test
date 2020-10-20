/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./overlAyWidgets';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { IOverlAyWidget, OverlAyWidgetPositionPreference } from 'vs/editor/browser/editorBrowser';
import { PArtFingerprint, PArtFingerprints, ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


interfAce IWidgetDAtA {
	widget: IOverlAyWidget;
	preference: OverlAyWidgetPositionPreference | null;
	domNode: FAstDomNode<HTMLElement>;
}

interfAce IWidgetMAp {
	[key: string]: IWidgetDAtA;
}

export clAss ViewOverlAyWidgets extends ViewPArt {

	privAte _widgets: IWidgetMAp;
	privAte reAdonly _domNode: FAstDomNode<HTMLElement>;

	privAte _verticAlScrollbArWidth: number;
	privAte _minimApWidth: number;
	privAte _horizontAlScrollbArHeight: number;
	privAte _editorHeight: number;
	privAte _editorWidth: number;

	constructor(context: ViewContext) {
		super(context);

		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this._widgets = {};
		this._verticAlScrollbArWidth = lAyoutInfo.verticAlScrollbArWidth;
		this._minimApWidth = lAyoutInfo.minimAp.minimApWidth;
		this._horizontAlScrollbArHeight = lAyoutInfo.horizontAlScrollbArHeight;
		this._editorHeight = lAyoutInfo.height;
		this._editorWidth = lAyoutInfo.width;

		this._domNode = creAteFAstDomNode(document.creAteElement('div'));
		PArtFingerprints.write(this._domNode, PArtFingerprint.OverlAyWidgets);
		this._domNode.setClAssNAme('overlAyWidgets');
	}

	public dispose(): void {
		super.dispose();
		this._widgets = {};
	}

	public getDomNode(): FAstDomNode<HTMLElement> {
		return this._domNode;
	}

	// ---- begin view event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this._verticAlScrollbArWidth = lAyoutInfo.verticAlScrollbArWidth;
		this._minimApWidth = lAyoutInfo.minimAp.minimApWidth;
		this._horizontAlScrollbArHeight = lAyoutInfo.horizontAlScrollbArHeight;
		this._editorHeight = lAyoutInfo.height;
		this._editorWidth = lAyoutInfo.width;
		return true;
	}

	// ---- end view event hAndlers

	public AddWidget(widget: IOverlAyWidget): void {
		const domNode = creAteFAstDomNode(widget.getDomNode());

		this._widgets[widget.getId()] = {
			widget: widget,
			preference: null,
			domNode: domNode
		};

		// This is sync becAuse A widget wAnts to be in the dom
		domNode.setPosition('Absolute');
		domNode.setAttribute('widgetId', widget.getId());
		this._domNode.AppendChild(domNode);

		this.setShouldRender();
	}

	public setWidgetPosition(widget: IOverlAyWidget, preference: OverlAyWidgetPositionPreference | null): booleAn {
		const widgetDAtA = this._widgets[widget.getId()];
		if (widgetDAtA.preference === preference) {
			return fAlse;
		}

		widgetDAtA.preference = preference;
		this.setShouldRender();

		return true;
	}

	public removeWidget(widget: IOverlAyWidget): void {
		const widgetId = widget.getId();
		if (this._widgets.hAsOwnProperty(widgetId)) {
			const widgetDAtA = this._widgets[widgetId];
			const domNode = widgetDAtA.domNode.domNode;
			delete this._widgets[widgetId];

			domNode.pArentNode!.removeChild(domNode);
			this.setShouldRender();
		}
	}

	privAte _renderWidget(widgetDAtA: IWidgetDAtA): void {
		const domNode = widgetDAtA.domNode;

		if (widgetDAtA.preference === null) {
			domNode.unsetTop();
			return;
		}

		if (widgetDAtA.preference === OverlAyWidgetPositionPreference.TOP_RIGHT_CORNER) {
			domNode.setTop(0);
			domNode.setRight((2 * this._verticAlScrollbArWidth) + this._minimApWidth);
		} else if (widgetDAtA.preference === OverlAyWidgetPositionPreference.BOTTOM_RIGHT_CORNER) {
			const widgetHeight = domNode.domNode.clientHeight;
			domNode.setTop((this._editorHeight - widgetHeight - 2 * this._horizontAlScrollbArHeight));
			domNode.setRight((2 * this._verticAlScrollbArWidth) + this._minimApWidth);
		} else if (widgetDAtA.preference === OverlAyWidgetPositionPreference.TOP_CENTER) {
			domNode.setTop(0);
			domNode.domNode.style.right = '50%';
		}
	}

	public prepAreRender(ctx: RenderingContext): void {
		// Nothing to reAd
	}

	public render(ctx: RestrictedRenderingContext): void {
		this._domNode.setWidth(this._editorWidth);

		const keys = Object.keys(this._widgets);
		for (let i = 0, len = keys.length; i < len; i++) {
			const widgetId = keys[i];
			this._renderWidget(this._widgets[widgetId]);
		}
	}
}
