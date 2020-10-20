/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { ITerminAlWidget } from 'vs/workbench/contrib/terminAl/browser/widgets/widgets';

export clAss TerminAlWidgetMAnAger implements IDisposAble {
	privAte _contAiner: HTMLElement | undefined;
	privAte _AttAched: MAp<string, ITerminAlWidget> = new MAp();

	AttAchToElement(terminAlWrApper: HTMLElement) {
		if (!this._contAiner) {
			this._contAiner = document.creAteElement('div');
			this._contAiner.clAssList.Add('terminAl-widget-contAiner');
			terminAlWrApper.AppendChild(this._contAiner);
		}
	}

	dispose(): void {
		if (this._contAiner && this._contAiner.pArentElement) {
			this._contAiner.pArentElement.removeChild(this._contAiner);
			this._contAiner = undefined;
		}
	}

	AttAchWidget(widget: ITerminAlWidget): IDisposAble | undefined {
		if (!this._contAiner) {
			return;
		}
		this._AttAched.get(widget.id)?.dispose();
		widget.AttAch(this._contAiner);
		this._AttAched.set(widget.id, widget);
		return {
			dispose: () => {
				const current = this._AttAched.get(widget.id);
				if (current === widget) {
					this._AttAched.delete(widget.id);
					widget.dispose();
				}
			}
		};
	}
}
