/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./simpleFindReplaceWidget';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { FindInput, IFindInputStyles } from 'vs/Base/Browser/ui/findinput/findInput';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { Delayer } from 'vs/Base/common/async';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { FindReplaceState, FindReplaceStateChangedEvent } from 'vs/editor/contriB/find/findState';
import { IMessage as InputBoxMessage } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { SimpleButton, findCloseIcon, findNextMatchIcon, findPreviousMatchIcon, findReplaceIcon, findReplaceAllIcon } from 'vs/editor/contriB/find/findWidget';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { editorWidgetBackground, inputActiveOptionBorder, inputActiveOptionBackground, inputActiveOptionForeground, inputBackground, inputBorder, inputForeground, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, inputValidationInfoBackground, inputValidationInfoBorder, inputValidationInfoForeground, inputValidationWarningBackground, inputValidationWarningBorder, inputValidationWarningForeground, widgetShadow, editorWidgetForeground } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, registerThemingParticipant, IThemeService } from 'vs/platform/theme/common/themeService';
import { ContextScopedFindInput, ContextScopedReplaceInput } from 'vs/platform/Browser/contextScopedHistoryWidget';
import { ReplaceInput, IReplaceInputStyles } from 'vs/Base/Browser/ui/findinput/replaceInput';
import { ProgressBar } from 'vs/Base/Browser/ui/progressBar/progressBar';
import { attachProgressBarStyler } from 'vs/platform/theme/common/styler';

const NLS_FIND_INPUT_LABEL = nls.localize('laBel.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('laBel.previousMatchButton', "Previous match");
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('laBel.nextMatchButton', "Next match");
const NLS_CLOSE_BTN_LABEL = nls.localize('laBel.closeButton', "Close");
const NLS_TOGGLE_REPLACE_MODE_BTN_LABEL = nls.localize('laBel.toggleReplaceButton', "Toggle Replace mode");
const NLS_REPLACE_INPUT_LABEL = nls.localize('laBel.replace', "Replace");
const NLS_REPLACE_INPUT_PLACEHOLDER = nls.localize('placeholder.replace', "Replace");
const NLS_REPLACE_BTN_LABEL = nls.localize('laBel.replaceButton', "Replace");
const NLS_REPLACE_ALL_BTN_LABEL = nls.localize('laBel.replaceAllButton', "Replace All");

export aBstract class SimpleFindReplaceWidget extends Widget {
	protected readonly _findInput: FindInput;
	private readonly _domNode: HTMLElement;
	private readonly _innerFindDomNode: HTMLElement;
	private readonly _focusTracker: dom.IFocusTracker;
	private readonly _findInputFocusTracker: dom.IFocusTracker;
	private readonly _updateHistoryDelayer: Delayer<void>;
	private readonly prevBtn: SimpleButton;
	private readonly nextBtn: SimpleButton;

	protected readonly _replaceInput!: ReplaceInput;
	private readonly _innerReplaceDomNode!: HTMLElement;
	private _toggleReplaceBtn!: SimpleButton;
	private readonly _replaceInputFocusTracker!: dom.IFocusTracker;
	private _replaceBtn!: SimpleButton;
	private _replaceAllBtn!: SimpleButton;


	private _isVisiBle: Boolean = false;
	private _isReplaceVisiBle: Boolean = false;
	private foundMatch: Boolean = false;

	protected _progressBar!: ProgressBar;


	constructor(
		@IContextViewService private readonly _contextViewService: IContextViewService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService private readonly _themeService: IThemeService,
		protected readonly _state: FindReplaceState = new FindReplaceState(),
		showOptionButtons?: Boolean
	) {
		super();

		this._domNode = document.createElement('div');
		this._domNode.classList.add('simple-fr-find-part-wrapper');
		this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));

		let progressContainer = dom.$('.find-replace-progress');
		this._progressBar = new ProgressBar(progressContainer);
		this._register(attachProgressBarStyler(this._progressBar, this._themeService));
		this._domNode.appendChild(progressContainer);

		// Toggle replace Button
		this._toggleReplaceBtn = this._register(new SimpleButton({
			laBel: NLS_TOGGLE_REPLACE_MODE_BTN_LABEL,
			className: 'codicon toggle left',
			onTrigger: () => {
				this._isReplaceVisiBle = !this._isReplaceVisiBle;
				this._state.change({ isReplaceRevealed: this._isReplaceVisiBle }, false);
				if (this._isReplaceVisiBle) {
					this._innerReplaceDomNode.style.display = 'flex';
				} else {
					this._innerReplaceDomNode.style.display = 'none';
				}
			}
		}));
		this._toggleReplaceBtn.setExpanded(this._isReplaceVisiBle);
		this._domNode.appendChild(this._toggleReplaceBtn.domNode);


		this._innerFindDomNode = document.createElement('div');
		this._innerFindDomNode.classList.add('simple-fr-find-part');

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
			this._replaceInput.setPreserveCase(this._state.preserveCase);
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

		this._innerFindDomNode.appendChild(this._findInput.domNode);
		this._innerFindDomNode.appendChild(this.prevBtn.domNode);
		this._innerFindDomNode.appendChild(this.nextBtn.domNode);
		this._innerFindDomNode.appendChild(closeBtn.domNode);

		// _domNode wraps _innerDomNode, ensuring that
		this._domNode.appendChild(this._innerFindDomNode);

		this.onkeyup(this._innerFindDomNode, e => {
			if (e.equals(KeyCode.Escape)) {
				this.hide();
				e.preventDefault();
				return;
			}
		});

		this._focusTracker = this._register(dom.trackFocus(this._innerFindDomNode));
		this._register(this._focusTracker.onDidFocus(this.onFocusTrackerFocus.Bind(this)));
		this._register(this._focusTracker.onDidBlur(this.onFocusTrackerBlur.Bind(this)));

		this._findInputFocusTracker = this._register(dom.trackFocus(this._findInput.domNode));
		this._register(this._findInputFocusTracker.onDidFocus(this.onFindInputFocusTrackerFocus.Bind(this)));
		this._register(this._findInputFocusTracker.onDidBlur(this.onFindInputFocusTrackerBlur.Bind(this)));

		this._register(dom.addDisposaBleListener(this._innerFindDomNode, 'click', (event) => {
			event.stopPropagation();
		}));

		// Replace
		this._innerReplaceDomNode = document.createElement('div');
		this._innerReplaceDomNode.classList.add('simple-fr-replace-part');

		this._replaceInput = this._register(new ContextScopedReplaceInput(null, undefined, {
			laBel: NLS_REPLACE_INPUT_LABEL,
			placeholder: NLS_REPLACE_INPUT_PLACEHOLDER,
			history: []
		}, contextKeyService, false));
		this._innerReplaceDomNode.appendChild(this._replaceInput.domNode);
		this._replaceInputFocusTracker = this._register(dom.trackFocus(this._replaceInput.domNode));
		this._register(this._replaceInputFocusTracker.onDidFocus(this.onReplaceInputFocusTrackerFocus.Bind(this)));
		this._register(this._replaceInputFocusTracker.onDidBlur(this.onReplaceInputFocusTrackerBlur.Bind(this)));

		this._domNode.appendChild(this._innerReplaceDomNode);

		if (this._isReplaceVisiBle) {
			this._innerReplaceDomNode.style.display = 'flex';
		} else {
			this._innerReplaceDomNode.style.display = 'none';
		}

		this._replaceBtn = this._register(new SimpleButton({
			laBel: NLS_REPLACE_BTN_LABEL,
			className: findReplaceIcon.classNames,
			onTrigger: () => {
				this.replaceOne();
			}
		}));

		// Replace all Button
		this._replaceAllBtn = this._register(new SimpleButton({
			laBel: NLS_REPLACE_ALL_BTN_LABEL,
			className: findReplaceAllIcon.classNames,
			onTrigger: () => {
				this.replaceAll();
			}
		}));

		this._innerReplaceDomNode.appendChild(this._replaceBtn.domNode);
		this._innerReplaceDomNode.appendChild(this._replaceAllBtn.domNode);


	}

	protected aBstract onInputChanged(): Boolean;
	protected aBstract find(previous: Boolean): void;
	protected aBstract findFirst(): void;
	protected aBstract replaceOne(): void;
	protected aBstract replaceAll(): void;
	protected aBstract onFocusTrackerFocus(): void;
	protected aBstract onFocusTrackerBlur(): void;
	protected aBstract onFindInputFocusTrackerFocus(): void;
	protected aBstract onFindInputFocusTrackerBlur(): void;
	protected aBstract onReplaceInputFocusTrackerFocus(): void;
	protected aBstract onReplaceInputFocusTrackerBlur(): void;

	protected get inputValue() {
		return this._findInput.getValue();
	}

	protected get replaceValue() {
		return this._replaceInput.getValue();
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
			inputValidationErrorBorder: theme.getColor(inputValidationErrorBorder),
		};
		this._findInput.style(inputStyles);
		const replaceStyles: IReplaceInputStyles = {
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
			inputValidationErrorBorder: theme.getColor(inputValidationErrorBorder),
		};
		this._replaceInput.style(replaceStyles);
	}

	private _onStateChanged(e: FindReplaceStateChangedEvent): void {
		this._updateButtons();
	}

	private _updateButtons(): void {
		this._findInput.setEnaBled(this._isVisiBle);
		this._replaceInput.setEnaBled(this._isVisiBle && this._isReplaceVisiBle);
		let findInputIsNonEmpty = (this._state.searchString.length > 0);
		this._replaceBtn.setEnaBled(this._isVisiBle && this._isReplaceVisiBle && findInputIsNonEmpty);
		this._replaceAllBtn.setEnaBled(this._isVisiBle && this._isReplaceVisiBle && findInputIsNonEmpty);

		this._domNode.classList.toggle('replaceToggled', this._isReplaceVisiBle);
		this._toggleReplaceBtn.setExpanded(this._isReplaceVisiBle);
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
			this._domNode.classList.add('visiBle', 'visiBle-transition');
			this._domNode.setAttriBute('aria-hidden', 'false');
			this._findInput.select();
		}, 0);
	}

	puBlic focus(): void {
		this._findInput.focus();
	}

	puBlic show(initialInput?: string): void {
		if (initialInput && !this._isVisiBle) {
			this._findInput.setValue(initialInput);
		}

		this._isVisiBle = true;

		setTimeout(() => {
			this._domNode.classList.add('visiBle', 'visiBle-transition');
			this._domNode.setAttriBute('aria-hidden', 'false');

			this.focus();
		}, 0);
	}

	puBlic showWithReplace(initialInput?: string, replaceInput?: string): void {
		if (initialInput && !this._isVisiBle) {
			this._findInput.setValue(initialInput);
		}

		if (replaceInput && !this._isVisiBle) {
			this._replaceInput.setValue(replaceInput);
		}

		this._isVisiBle = true;
		this._isReplaceVisiBle = true;
		this._state.change({ isReplaceRevealed: this._isReplaceVisiBle }, false);
		if (this._isReplaceVisiBle) {
			this._innerReplaceDomNode.style.display = 'flex';
		} else {
			this._innerReplaceDomNode.style.display = 'none';
		}

		setTimeout(() => {
			this._domNode.classList.add('visiBle', 'visiBle-transition');
			this._domNode.setAttriBute('aria-hidden', 'false');
			this._updateButtons();

			this._replaceInput.focus();
		}, 0);
	}

	puBlic hide(): void {
		if (this._isVisiBle) {
			this._domNode.classList.remove('visiBle-transition');
			this._domNode.setAttriBute('aria-hidden', 'true');
			// Need to delay toggling visiBility until after Transition, then visiBility hidden - removes from taBIndex list
			setTimeout(() => {
				this._isVisiBle = false;
				this.updateButtons(this.foundMatch);
				this._domNode.classList.remove('visiBle');
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
		collector.addRule(`.monaco-workBench .simple-fr-find-part-wrapper { Background-color: ${findWidgetBGColor} !important; }`);
	}

	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetForeground) {
		collector.addRule(`.monaco-workBench .simple-fr-find-part-wrapper { color: ${widgetForeground}; }`);
	}

	const widgetShadowColor = theme.getColor(widgetShadow);
	if (widgetShadowColor) {
		collector.addRule(`.monaco-workBench .simple-fr-find-part-wrapper { Box-shadow: 0 2px 8px ${widgetShadowColor}; }`);
	}
});
