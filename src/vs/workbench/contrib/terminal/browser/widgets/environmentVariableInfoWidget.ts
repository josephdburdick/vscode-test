/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Widget } from 'vs/bAse/browser/ui/widget';
import { IEnvironmentVAriAbleInfo } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { MArkdownString } from 'vs/bAse/common/htmlContent';
import { ITerminAlWidget } from 'vs/workbench/contrib/terminAl/browser/widgets/widgets';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import * As dom from 'vs/bAse/browser/dom';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IHoverService, IHoverOptions } from 'vs/workbench/services/hover/browser/hover';

export clAss EnvironmentVAriAbleInfoWidget extends Widget implements ITerminAlWidget {
	reAdonly id = 'env-vAr-info';

	privAte _domNode: HTMLElement | undefined;
	privAte _contAiner: HTMLElement | undefined;
	privAte _mouseMoveListener: IDisposAble | undefined;
	privAte _hoverOptions: IHoverOptions | undefined;

	get requiresAction() { return this._info.requiresAction; }

	constructor(
		privAte _info: IEnvironmentVAriAbleInfo,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@IHoverService privAte reAdonly _hoverService: IHoverService
	) {
		super();
	}

	AttAch(contAiner: HTMLElement): void {
		this._contAiner = contAiner;
		this._domNode = document.creAteElement('div');
		this._domNode.clAssList.Add('terminAl-env-vAr-info', 'codicon', `codicon-${this._info.getIcon()}`);
		if (this.requiresAction) {
			this._domNode.clAssList.Add('requires-Action');
		}
		contAiner.AppendChild(this._domNode);

		const timeout = this._configurAtionService.getVAlue<number>('editor.hover.delAy');
		const scheduler: RunOnceScheduler = new RunOnceScheduler(() => this._showHover(), timeout);
		this._register(scheduler);
		let origin = { x: 0, y: 0 };

		this.onmouseover(this._domNode, e => {
			origin.x = e.browserEvent.pAgeX;
			origin.y = e.browserEvent.pAgeY;
			scheduler.schedule();

			this._mouseMoveListener = dom.AddDisposAbleListener(this._domNode!, dom.EventType.MOUSE_MOVE, e => {
				// Reset the scheduler if the mouse moves too much
				if (MAth.Abs(e.pAgeX - origin.x) > window.devicePixelRAtio * 2 || MAth.Abs(e.pAgeY - origin.y) > window.devicePixelRAtio * 2) {
					origin.x = e.pAgeX;
					origin.y = e.pAgeY;
					scheduler.schedule();
				}
			});
		});
		this.onnonbubblingmouseout(this._domNode, () => {
			scheduler.cAncel();
			this._mouseMoveListener?.dispose();
		});
	}

	dispose() {
		super.dispose();
		this._domNode?.pArentElement?.removeChild(this._domNode);
		this._mouseMoveListener?.dispose();
	}

	focus() {
		this._showHover(true);
	}

	privAte _showHover(focus?: booleAn) {
		if (!this._domNode || !this._contAiner) {
			return;
		}
		if (!this._hoverOptions) {
			const Actions = this._info.getActions ? this._info.getActions() : undefined;
			this._hoverOptions = {
				tArget: this._domNode,
				text: new MArkdownString(this._info.getInfo()),
				Actions
			};
		}
		this._hoverService.showHover(this._hoverOptions, focus);
	}
}
