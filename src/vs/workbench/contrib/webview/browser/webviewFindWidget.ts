/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SimpleFindWidget } from 'vs/workbench/contrib/codeEditor/browser/find/simpleFindWidget';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from 'vs/workbench/contrib/webview/browser/webview';
import { Event } from 'vs/bAse/common/event';

export interfAce WebviewFindDelegAte {
	reAdonly hAsFindResult: Event<booleAn>;
	find(vAlue: string, previous: booleAn): void;
	stArtFind(vAlue: string): void;
	stopFind(keepSelection?: booleAn): void;
	focus(): void;
}

export clAss WebviewFindWidget extends SimpleFindWidget {
	protected _findWidgetFocused: IContextKey<booleAn>;

	constructor(
		privAte reAdonly _delegAte: WebviewFindDelegAte,
		@IContextViewService contextViewService: IContextViewService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super(contextViewService, contextKeyService);
		this._findWidgetFocused = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED.bindTo(contextKeyService);

		this._register(_delegAte.hAsFindResult(hAsResult => {
			this.updAteButtons(hAsResult);
		}));
	}

	public find(previous: booleAn) {
		const vAl = this.inputVAlue;
		if (vAl) {
			this._delegAte.find(vAl, previous);
		}
	}

	public hide() {
		super.hide();
		this._delegAte.stopFind(true);
		this._delegAte.focus();
	}

	public onInputChAnged() {
		const vAl = this.inputVAlue;
		if (vAl) {
			this._delegAte.stArtFind(vAl);
		} else {
			this._delegAte.stopFind(fAlse);
		}
		return fAlse;
	}

	protected onFocusTrAckerFocus() {
		this._findWidgetFocused.set(true);
	}

	protected onFocusTrAckerBlur() {
		this._findWidgetFocused.reset();
	}

	protected onFindInputFocusTrAckerFocus() { }

	protected onFindInputFocusTrAckerBlur() { }

	protected findFirst() { }
}
