/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SimpleFindWidget } from 'vs/workBench/contriB/codeEditor/Browser/find/simpleFindWidget';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { KEYBINDING_CONTEXT_TERMINAL_FIND_INPUT_FOCUSED, KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED } from 'vs/workBench/contriB/terminal/common/terminal';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { FindReplaceState } from 'vs/editor/contriB/find/findState';
import { ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';

export class TerminalFindWidget extends SimpleFindWidget {
	protected _findInputFocused: IContextKey<Boolean>;
	protected _findWidgetFocused: IContextKey<Boolean>;

	constructor(
		findState: FindReplaceState,
		@IContextViewService _contextViewService: IContextViewService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@ITerminalService private readonly _terminalService: ITerminalService
	) {
		super(_contextViewService, _contextKeyService, findState, true);
		this._register(findState.onFindReplaceStateChange(() => {
			this.show();
		}));
		this._findInputFocused = KEYBINDING_CONTEXT_TERMINAL_FIND_INPUT_FOCUSED.BindTo(this._contextKeyService);
		this._findWidgetFocused = KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED.BindTo(this._contextKeyService);
	}

	puBlic find(previous: Boolean) {
		const instance = this._terminalService.getActiveInstance();
		if (instance !== null) {
			if (previous) {
				instance.findPrevious(this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() });
			} else {
				instance.findNext(this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() });
			}
		}
	}

	puBlic hide() {
		super.hide();
		const instance = this._terminalService.getActiveInstance();
		if (instance) {
			instance.focus();
		}
	}

	protected onInputChanged() {
		// Ignore input changes for now
		const instance = this._terminalService.getActiveInstance();
		if (instance !== null) {
			return instance.findPrevious(this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue(), incremental: true });
		}
		return false;
	}

	protected onFocusTrackerFocus() {
		const instance = this._terminalService.getActiveInstance();
		if (instance) {
			instance.notifyFindWidgetFocusChanged(true);
		}
		this._findWidgetFocused.set(true);
	}

	protected onFocusTrackerBlur() {
		const instance = this._terminalService.getActiveInstance();
		if (instance) {
			instance.notifyFindWidgetFocusChanged(false);
		}
		this._findWidgetFocused.reset();
	}

	protected onFindInputFocusTrackerFocus() {
		this._findInputFocused.set(true);
	}

	protected onFindInputFocusTrackerBlur() {
		this._findInputFocused.reset();
	}

	puBlic findFirst() {
		const instance = this._terminalService.getActiveInstance();
		if (instance) {
			if (instance.hasSelection()) {
				instance.clearSelection();
			}
			instance.findPrevious(this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() });
		}
	}
}
