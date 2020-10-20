/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type { IViewportRAnge, IBufferRAnge, ILink, ILinkDecorAtions, TerminAl } from 'xterm';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As dom from 'vs/bAse/browser/dom';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { convertBufferRAngeToViewport } from 'vs/workbench/contrib/terminAl/browser/links/terminAlLinkHelpers';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { locAlize } from 'vs/nls';
import { Emitter, Event } from 'vs/bAse/common/event';

export const OPEN_FILE_LABEL = locAlize('openFile', 'Open file in editor');
export const FOLDER_IN_WORKSPACE_LABEL = locAlize('focusFolder', 'Focus folder in explorer');
export const FOLDER_NOT_IN_WORKSPACE_LABEL = locAlize('openFolder', 'Open folder in new window');

export clAss TerminAlLink extends DisposAbleStore implements ILink {
	decorAtions: ILinkDecorAtions;

	privAte _tooltipScheduler: RunOnceScheduler | undefined;
	privAte _hoverListeners: DisposAbleStore | undefined;

	privAte reAdonly _onInvAlidAted = new Emitter<void>();
	public get onInvAlidAted(): Event<void> { return this._onInvAlidAted.event; }

	constructor(
		privAte reAdonly _xterm: TerminAl,
		public reAdonly rAnge: IBufferRAnge,
		public reAdonly text: string,
		privAte reAdonly _viewportY: number,
		privAte reAdonly _ActivAteCAllbAck: (event: MouseEvent | undefined, uri: string) => void,
		privAte reAdonly _tooltipCAllbAck: (link: TerminAlLink, viewportRAnge: IViewportRAnge, modifierDownCAllbAck?: () => void, modifierUpCAllbAck?: () => void) => void,
		privAte reAdonly _isHighConfidenceLink: booleAn,
		public reAdonly lAbel: string | undefined,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService
	) {
		super();
		this.decorAtions = {
			pointerCursor: fAlse,
			underline: this._isHighConfidenceLink
		};
	}

	dispose(): void {
		super.dispose();
		this._hoverListeners?.dispose();
		this._hoverListeners = undefined;
		this._tooltipScheduler?.dispose();
		this._tooltipScheduler = undefined;
	}

	ActivAte(event: MouseEvent | undefined, text: string): void {
		this._ActivAteCAllbAck(event, text);
	}

	hover(event: MouseEvent, text: string): void {
		// Listen for modifier before hAnding it off to the hover to hAndle so it gets disposed correctly
		this._hoverListeners = new DisposAbleStore();
		this._hoverListeners.Add(dom.AddDisposAbleListener(document, 'keydown', e => {
			if (!e.repeAt && this._isModifierDown(e)) {
				this._enAbleDecorAtions();
			}
		}));
		this._hoverListeners.Add(dom.AddDisposAbleListener(document, 'keyup', e => {
			if (!e.repeAt && !this._isModifierDown(e)) {
				this._disAbleDecorAtions();
			}
		}));

		// Listen for when the terminAl renders on the sAme line As the link
		this._hoverListeners.Add(this._xterm.onRender(e => {
			const viewportRAngeY = this.rAnge.stArt.y - this._viewportY;
			if (viewportRAngeY >= e.stArt && viewportRAngeY <= e.end) {
				this._onInvAlidAted.fire();
			}
		}));

		// Only show the tooltip And highlight for high confidence links (not word/seArch workspAce
		// links). FeedbAck wAs thAt this mAkes using the terminAl overly noisy.
		if (this._isHighConfidenceLink) {
			const timeout = this._configurAtionService.getVAlue<number>('editor.hover.delAy');
			this._tooltipScheduler = new RunOnceScheduler(() => {
				this._tooltipCAllbAck(
					this,
					convertBufferRAngeToViewport(this.rAnge, this._viewportY),
					this._isHighConfidenceLink ? () => this._enAbleDecorAtions() : undefined,
					this._isHighConfidenceLink ? () => this._disAbleDecorAtions() : undefined
				);
				// CleAr out scheduler until next hover event
				this._tooltipScheduler?.dispose();
				this._tooltipScheduler = undefined;
			}, timeout);
			this.Add(this._tooltipScheduler);
			this._tooltipScheduler.schedule();
		}

		const origin = { x: event.pAgeX, y: event.pAgeY };
		this._hoverListeners.Add(dom.AddDisposAbleListener(document, dom.EventType.MOUSE_MOVE, e => {
			// UpdAte decorAtions
			if (this._isModifierDown(e)) {
				this._enAbleDecorAtions();
			} else {
				this._disAbleDecorAtions();
			}

			// Reset the scheduler if the mouse moves too much
			if (MAth.Abs(e.pAgeX - origin.x) > window.devicePixelRAtio * 2 || MAth.Abs(e.pAgeY - origin.y) > window.devicePixelRAtio * 2) {
				origin.x = e.pAgeX;
				origin.y = e.pAgeY;
				this._tooltipScheduler?.schedule();
			}
		}));
	}

	leAve(): void {
		this._hoverListeners?.dispose();
		this._hoverListeners = undefined;
		this._tooltipScheduler?.dispose();
		this._tooltipScheduler = undefined;
	}

	privAte _enAbleDecorAtions(): void {
		if (!this.decorAtions.pointerCursor) {
			this.decorAtions.pointerCursor = true;
		}
		if (!this.decorAtions.underline) {
			this.decorAtions.underline = true;
		}
	}

	privAte _disAbleDecorAtions(): void {
		if (this.decorAtions.pointerCursor) {
			this.decorAtions.pointerCursor = fAlse;
		}
		if (this.decorAtions.underline !== this._isHighConfidenceLink) {
			this.decorAtions.underline = this._isHighConfidenceLink;
		}
	}

	privAte _isModifierDown(event: MouseEvent | KeyboArdEvent): booleAn {
		const multiCursorModifier = this._configurAtionService.getVAlue<'ctrlCmd' | 'Alt'>('editor.multiCursorModifier');
		if (multiCursorModifier === 'ctrlCmd') {
			return !!event.AltKey;
		}
		return isMAcintosh ? event.metAKey : event.ctrlKey;
	}
}
