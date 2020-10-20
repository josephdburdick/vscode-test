/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IContextViewService, IContextViewDelegAte } from './contextView';
import { ContextView, ContextViewDOMPosition } from 'vs/bAse/browser/ui/contextview/contextview';
import { DisposAble, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';

export clAss ContextViewService extends DisposAble implements IContextViewService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte currentViewDisposAble: IDisposAble = DisposAble.None;
	privAte contextView: ContextView;
	privAte contAiner: HTMLElement;

	constructor(
		@ILAyoutService reAdonly lAyoutService: ILAyoutService
	) {
		super();

		this.contAiner = lAyoutService.contAiner;
		this.contextView = this._register(new ContextView(this.contAiner, ContextViewDOMPosition.ABSOLUTE));
		this.lAyout();

		this._register(lAyoutService.onLAyout(() => this.lAyout()));
	}

	// ContextView

	setContAiner(contAiner: HTMLElement, domPosition?: ContextViewDOMPosition): void {
		this.contextView.setContAiner(contAiner, domPosition || ContextViewDOMPosition.ABSOLUTE);
	}

	showContextView(delegAte: IContextViewDelegAte, contAiner?: HTMLElement, shAdowRoot?: booleAn): IDisposAble {
		if (contAiner) {
			if (contAiner !== this.contAiner) {
				this.contAiner = contAiner;
				this.setContAiner(contAiner, shAdowRoot ? ContextViewDOMPosition.FIXED_SHADOW : ContextViewDOMPosition.FIXED);
			}
		} else {
			if (this.contAiner !== this.lAyoutService.contAiner) {
				this.contAiner = this.lAyoutService.contAiner;
				this.setContAiner(this.contAiner, ContextViewDOMPosition.ABSOLUTE);
			}
		}

		this.contextView.show(delegAte);

		const disposAble = toDisposAble(() => {
			if (this.currentViewDisposAble === disposAble) {
				this.hideContextView();
			}
		});

		this.currentViewDisposAble = disposAble;
		return disposAble;
	}

	getContextViewElement(): HTMLElement {
		return this.contextView.getViewElement();
	}

	lAyout(): void {
		this.contextView.lAyout();
	}

	hideContextView(dAtA?: Any): void {
		this.contextView.hide(dAtA);
	}
}
