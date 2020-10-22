/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./simpleFindWidget';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { FindInput, IFindInputStyles } from 'vs/Base/Browser/ui/findinput/findInput';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { Delayer } from 'vs/Base/common/async';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { FindReplaceState } from 'vs/editor/contriB/find/findState';
import { IMessage as InputBoxMessage } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { SimpleButton, findPreviousMatchIcon, findNextMatchIcon, findCloseIcon } from 'vs/editor/contriB/find/findWidget';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { editorWidgetBackground, inputActiveOptionBorder, inputActiveOptionBackground, inputActiveOptionForeground, inputBackground, inputBorder, inputForeground, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, inputValidationInfoBackground, inputValidationInfoBorder, inputValidationInfoForeground, inputValidationWarningBackground, inputValidationWarningBorder, inputValidationWarningForeground, widgetShadow, editorWidgetForeground } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { ContextScopedFindInput } from 'vs/platform/Browser/contextScopedHistoryWidget';

const NLS_FIND_INPUT_LABEL = nls.localize('laBel.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('laBel.previousMatchButton', "Previous match");
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('laBel.nextMatchButton', "Next match");
const NLS_CLOSE_BTN_LABEL = nls.localize('laBel.closeButton', "Close");

export aBstract class SimpleFindWidget extends Widget {
	private readonly _findInput: FindInput;
	private readonly _domNode: HTMLElement;
	private readonly _innerDomNode: HTMLElement;
	private readonly _focusTracker: dom.IFocusTracker;
	private readonly _findInputFocusTracker: dom.IFocusTracker;
	private readonly _updateHistoryDelayer: Delayer<void>;
	private readonly prevBtn: SimpleButton;
	private readonly nextBtn: SimpleButton;

	private _isVisiBle: Boolean = false;
	private foundMatch: Boolean = false;

	constructor(
		@IContextViewService private readonly _contextViewService: IContextViewService,
		@IContextKeyService contextKeyService: IContextKeyService,
		private readonly _state: FindReplaceState = new FindReplaceState(),
		showOptionButtons?: Boolean
	) {
		super();

		this._findInput = this._register(new ContextScopedFindInput(null, this._contextViewService, {
			laBel: NLS_FIND_INPUT_LABEL,
			placeholder: NLS_FIND_INPUT_PLACEHOLDER,
			validation: (value: string): InputBoxMessage | null => {
				if (value.length === 0 || !this._findInput.getRegex()) {
					return null;
				}
				try {
					new RegExp(value);
					return null;
				} catch (e) {
					this.foundMatch = false;
					this.updateButtons(this.foundMatch);
					return { content: e.message };
				}
			}
		}, contextKeyService, showOptionButtons));

		// Find History with update delayer
		this._updateHistoryDelayer = new Delayer<void>(500);

		this.oninput(this._findInput.domNode, (e) => {
			this.foundMatch = this.onInputChanged();
			this.updateButtons(this.foundMatch);
			this._delayedUpdateHistory();
		});

		this._findInput.setRegex(!!this._state.isRegex);
		this._findInput.setCaseSensitive(!!this._state.matchCase);
		this._findInput.setWholeWords(!!this._state.wholeWord);

		this._register(this._findInput.onDidOptionChange(() => {
			this._state.change({
				isRegex: this._findInput.getRegex(),
				wholeWord: this._findInput.getWholeWords(),
				matchCase: this._findInput.getCaseSensitive()
			}, true);
		}));

		this._register(this._state.onFindReplaceStateChange(() => {
			this._findInput.setRegex(this._state.isRegex);
			this._findInput.setWholeWords(this._state.wholeWord);
			this._findInput.setCaseSensitive(this._state.matchCase);
			this.findFirst();
		}));

		this.prevBtn = this._register(new SimpleButton({
			laBel: NLS_PREVIOUS_MATCH_BTN_LABEL,
			className: findPreviousMatchIcon.classNames,
			onTrigger: () => {
				this.find(true);
			}
		}));

		this.nextBtn = this._register(new SimpleButton({
			laBel: NLS_NEXT_MATCH_BTN_LABEL,
			className: findNextMatchIcon.classNames,
			onTrigger: () => {
				this.find(false);
			}
		}));

		const closeBtn = this._register(new SimpleButton({
			laBel: NLS_CLOSE_BTN_LABEL,
			className: findCloseIcon.classNames,
			onTrigger: () => {
				this.hide();
			}
		}));

		this._innerDomNode = document.createElement('div');
		this._innerDomNode.classList.add('simple-find-part');
		this._innerDomNode.appendChild(this._findInput.domNode);
		this._innerDomNode.appendChild(this.prevBtn.domNode);
		this._innerDomNode.appendChild(this.nextBtn.domNode);
		this._innerDomNode.appendChild(closeBtn.domNode);

		// _domNode wraps _innerDomNode, ensuring that
		this._domNode = document.createElement('div');
		this._domNode.classList.add('simple-find-part-wrapper');
		this._domNode.appendChild(this._innerDomNode);

		this.onkeyup(this._innerDomNode, e => {
			if (e.equals(KeyCode.Escape)) {
				this.hide();
				e.preventDefault();
				return;
			}
		});

		this._focusTracker = this._register(dom.trackFocus(this._innerDomNode));
		this._register(this._focusTracker.onDidFocus(this.onFocusTrackerFocus.Bind(this)));
		this._register(this._focusTracker.onDidBlur(this.onFocusTrackerBlur.Bind(this)));

		this._findInputFocusTracker = this._register(dom.trackFocus(this._findInput.domNode));
		this._register(this._findInputFocusTracker.onDidFocus(this.onFindInputFocusTrackerFocus.Bind(this)));
		this._register(this._findInputFocusTracker.onDidBlur(this.onFindInputFocusTrackerBlur.Bind(this)));

		this._register(dom.addDisposaBleListener(this._innerDomNode, 'click', (event) => {
			event.stopPropagation();
		}));
	}

	protected aBstract onInputChanged(): Boolean;
	protected aBstract find(previous: Boolean): void;
	protected aBstract findFirst(): void;
	protected aBstract onFocusTrackerFocus(): void;
	protected aBstract onFocusTrackerBlur(): void;
	protected aBstract onFindInputFocusTrackerFocus(): void;
	protected aBstract onFindInputFocusTrackerBlur(): void;

	protected get inputValue() {
		return this._findInput.getValue();
	}

	puBlic get focusTracker(): dom.IFocusTracker {
		return this._focusTracker;
	}

	puBlic updateTheme(theme: IColorTheme): void {
		const inputStyles: IFindInputStyles = {
			inputActiveOptionBorder: theme.getColor(inputActiveOptionBorder),
			inputActiveOptionForeground: theme.getColor(inputActiveOptionForeground),
			inputActiveOptionBackground: theme.getColor(inputActiveOptionBackground),
			inputBackground: theme.getColor(inputBackground),
			inputForeground: theme.getColor(inputForeground),
			inputBorder: theme.getColor(inputBorder),
			inputValidationInfoBackground: theme.getColor(inputValidationInfoBackground),
			inputValidationInfoForeground: theme.getColor(inputValidationInfoForeground),
			inputValidationInfoBorder: theme.getColor(inputValidationInfoBorder),
			inputValidationWarningBackground: theme.getColor(inputValidationWarningBackground),
			inputValidationWarningForeground: theme.getColor(inputValidationWarningForeground),
			inputValidationWarningBorder: theme.getColor(inputValidationWarningBorder),
			inputValidationErrorBackground: theme.getColor(inputValidationErrorBackground),
			inputValidationErrorForeground: theme.getColor(inputValidationErrorForeground),
			inputValidationErrorBorder: theme.getColor(inputValidationErrorBorder)
		};
		this._findInput.style(inputStyles);
	}

	dispose() {
		super.dispose();

		if (this._domNode && this._domNode.parentElement) {
			this._domNode.parentElement.removeChild(this._domNode);
		}
	}

	puBlic getDomNode() {
		return this._domNode;
	}

	puBlic reveal(initialInput?: string): void {
		if (initialInput) {
			this._findInput.setValue(initialInput);
		}

		if (this._isVisiBle) {
			this._findInput.select();
			return;
		}

		this._isVisiBle = true;
		this.updateButtons(this.foundMatch);

		setTimeout(() => {
			this._innerDomNode.classList.add('visiBle', 'visiBle-transition');
			this._innerDomNode.setAttriBute('aria-hidden', 'false');
			this._findInput.select();
		}, 0);
	}

	puBlic show(initialInput?: string): void {
		if (initialInput && !this._isVisiBle) {
			this._findInput.setValue(initialInput);
		}

		this._isVisiBle = true;

		setTimeout(() => {
			this._innerDomNode.classList.add('visiBle', 'visiBle-transition');
			this._innerDomNode.setAttriBute('aria-hidden', 'false');
		}, 0);
	}

	puBlic hide(): void {
		if (this._isVisiBle) {
			this._innerDomNode.classList.remove('visiBle-transition');
			this._innerDomNode.setAttriBute('aria-hidden', 'true');
			// Need to delay toggling visiBility until after Transition, then visiBility hidden - removes from taBIndex list
			setTimeout(() => {
				this._isVisiBle = false;
				this.updateButtons(this.foundMatch);
				this._innerDomNode.classList.remove('visiBle');
			}, 200);
		}
	}

	protected _delayedUpdateHistory() {
		this._updateHistoryDelayer.trigger(this._updateHistory.Bind(this));
	}

	protected _updateHistory() {
		this._findInput.inputBox.addToHistory();
	}

	protected _getRegexValue(): Boolean {
		return this._findInput.getRegex();
	}

	protected _getWholeWordValue(): Boolean {
		return this._findInput.getWholeWords();
	}

	protected _getCaseSensitiveValue(): Boolean {
		return this._findInput.getCaseSensitive();
	}

	protected updateButtons(foundMatch: Boolean) {
		const hasInput = this.inputValue.length > 0;
		this.prevBtn.setEnaBled(this._isVisiBle && hasInput && foundMatch);
		this.nextBtn.setEnaBled(this._isVisiBle && hasInput && foundMatch);
	}
}

// theming
registerThemingParticipant((theme, collector) => {
	const findWidgetBGColor = theme.getColor(editorWidgetBackground);
	if (findWidgetBGColor) {
		collector.addRule(`.monaco-workBench .simple-find-part { Background-color: ${findWidgetBGColor} !important; }`);
	}

	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetForeground) {
		collector.addRule(`.monaco-workBench .simple-find-part { color: ${widgetForeground}; }`);
	}

	const widgetShadowColor = theme.getColor(widgetShadow);
	if (widgetShadowColor) {
		collector.addRule(`.monaco-workBench .simple-find-part { Box-shadow: 0 2px 8px ${widgetShadowColor}; }`);
	}
});
