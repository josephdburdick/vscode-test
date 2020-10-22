/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SimpleFindWidget } from 'vs/workBench/contriB/codeEditor/Browser/find/simpleFindWidget';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { Event } from 'vs/Base/common/event';

export interface WeBviewFindDelegate {
	readonly hasFindResult: Event<Boolean>;
	find(value: string, previous: Boolean): void;
	startFind(value: string): void;
	stopFind(keepSelection?: Boolean): void;
	focus(): void;
}

export class WeBviewFindWidget extends SimpleFindWidget {
	protected _findWidgetFocused: IContextKey<Boolean>;

	constructor(
		private readonly _delegate: WeBviewFindDelegate,
		@IContextViewService contextViewService: IContextViewService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super(contextViewService, contextKeyService);
		this._findWidgetFocused = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED.BindTo(contextKeyService);

		this._register(_delegate.hasFindResult(hasResult => {
			this.updateButtons(hasResult);
		}));
	}

	puBlic find(previous: Boolean) {
		const val = this.inputValue;
		if (val) {
			this._delegate.find(val, previous);
		}
	}

	puBlic hide() {
		super.hide();
		this._delegate.stopFind(true);
		this._delegate.focus();
	}

	puBlic onInputChanged() {
		const val = this.inputValue;
		if (val) {
			this._delegate.startFind(val);
		} else {
			this._delegate.stopFind(false);
		}
		return false;
	}

	protected onFocusTrackerFocus() {
		this._findWidgetFocused.set(true);
	}

	protected onFocusTrackerBlur() {
		this._findWidgetFocused.reset();
	}

	protected onFindInputFocusTrackerFocus() { }

	protected onFindInputFocusTrackerBlur() { }

	protected findFirst() { }
}
