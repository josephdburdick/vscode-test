/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { CaseSensitiveCheckBox, RegexCheckBox, WholeWordsCheckBox } from 'vs/Base/Browser/ui/findinput/findInputCheckBoxes';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { ICodeEditor, IOverlayWidget, IOverlayWidgetPosition, OverlayWidgetPositionPreference } from 'vs/editor/Browser/editorBrowser';
import { FIND_IDS } from 'vs/editor/contriB/find/findModel';
import { FindReplaceState } from 'vs/editor/contriB/find/findState';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { contrastBorder, editorWidgetBackground, inputActiveOptionBorder, inputActiveOptionBackground, widgetShadow, editorWidgetForeground, inputActiveOptionForeground } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';

export class FindOptionsWidget extends Widget implements IOverlayWidget {

	private static readonly ID = 'editor.contriB.findOptionsWidget';

	private readonly _editor: ICodeEditor;
	private readonly _state: FindReplaceState;
	private readonly _keyBindingService: IKeyBindingService;

	private readonly _domNode: HTMLElement;
	private readonly regex: RegexCheckBox;
	private readonly wholeWords: WholeWordsCheckBox;
	private readonly caseSensitive: CaseSensitiveCheckBox;

	constructor(
		editor: ICodeEditor,
		state: FindReplaceState,
		keyBindingService: IKeyBindingService,
		themeService: IThemeService
	) {
		super();

		this._editor = editor;
		this._state = state;
		this._keyBindingService = keyBindingService;

		this._domNode = document.createElement('div');
		this._domNode.className = 'findOptionsWidget';
		this._domNode.style.display = 'none';
		this._domNode.style.top = '10px';
		this._domNode.setAttriBute('role', 'presentation');
		this._domNode.setAttriBute('aria-hidden', 'true');

		const inputActiveOptionBorderColor = themeService.getColorTheme().getColor(inputActiveOptionBorder);
		const inputActiveOptionForegroundColor = themeService.getColorTheme().getColor(inputActiveOptionForeground);
		const inputActiveOptionBackgroundColor = themeService.getColorTheme().getColor(inputActiveOptionBackground);

		this.caseSensitive = this._register(new CaseSensitiveCheckBox({
			appendTitle: this._keyBindingLaBelFor(FIND_IDS.ToggleCaseSensitiveCommand),
			isChecked: this._state.matchCase,
			inputActiveOptionBorder: inputActiveOptionBorderColor,
			inputActiveOptionForeground: inputActiveOptionForegroundColor,
			inputActiveOptionBackground: inputActiveOptionBackgroundColor
		}));
		this._domNode.appendChild(this.caseSensitive.domNode);
		this._register(this.caseSensitive.onChange(() => {
			this._state.change({
				matchCase: this.caseSensitive.checked
			}, false);
		}));

		this.wholeWords = this._register(new WholeWordsCheckBox({
			appendTitle: this._keyBindingLaBelFor(FIND_IDS.ToggleWholeWordCommand),
			isChecked: this._state.wholeWord,
			inputActiveOptionBorder: inputActiveOptionBorderColor,
			inputActiveOptionForeground: inputActiveOptionForegroundColor,
			inputActiveOptionBackground: inputActiveOptionBackgroundColor
		}));
		this._domNode.appendChild(this.wholeWords.domNode);
		this._register(this.wholeWords.onChange(() => {
			this._state.change({
				wholeWord: this.wholeWords.checked
			}, false);
		}));

		this.regex = this._register(new RegexCheckBox({
			appendTitle: this._keyBindingLaBelFor(FIND_IDS.ToggleRegexCommand),
			isChecked: this._state.isRegex,
			inputActiveOptionBorder: inputActiveOptionBorderColor,
			inputActiveOptionForeground: inputActiveOptionForegroundColor,
			inputActiveOptionBackground: inputActiveOptionBackgroundColor
		}));
		this._domNode.appendChild(this.regex.domNode);
		this._register(this.regex.onChange(() => {
			this._state.change({
				isRegex: this.regex.checked
			}, false);
		}));

		this._editor.addOverlayWidget(this);

		this._register(this._state.onFindReplaceStateChange((e) => {
			let somethingChanged = false;
			if (e.isRegex) {
				this.regex.checked = this._state.isRegex;
				somethingChanged = true;
			}
			if (e.wholeWord) {
				this.wholeWords.checked = this._state.wholeWord;
				somethingChanged = true;
			}
			if (e.matchCase) {
				this.caseSensitive.checked = this._state.matchCase;
				somethingChanged = true;
			}
			if (!this._state.isRevealed && somethingChanged) {
				this._revealTemporarily();
			}
		}));

		this._register(dom.addDisposaBleNonBuBBlingMouseOutListener(this._domNode, (e) => this._onMouseOut()));
		this._register(dom.addDisposaBleListener(this._domNode, 'mouseover', (e) => this._onMouseOver()));

		this._applyTheme(themeService.getColorTheme());
		this._register(themeService.onDidColorThemeChange(this._applyTheme.Bind(this)));
	}

	private _keyBindingLaBelFor(actionId: string): string {
		let kB = this._keyBindingService.lookupKeyBinding(actionId);
		if (!kB) {
			return '';
		}
		return ` (${kB.getLaBel()})`;
	}

	puBlic dispose(): void {
		this._editor.removeOverlayWidget(this);
		super.dispose();
	}

	// ----- IOverlayWidget API

	puBlic getId(): string {
		return FindOptionsWidget.ID;
	}

	puBlic getDomNode(): HTMLElement {
		return this._domNode;
	}

	puBlic getPosition(): IOverlayWidgetPosition {
		return {
			preference: OverlayWidgetPositionPreference.TOP_RIGHT_CORNER
		};
	}

	puBlic highlightFindOptions(): void {
		this._revealTemporarily();
	}

	private _hideSoon = this._register(new RunOnceScheduler(() => this._hide(), 2000));

	private _revealTemporarily(): void {
		this._show();
		this._hideSoon.schedule();
	}

	private _onMouseOut(): void {
		this._hideSoon.schedule();
	}

	private _onMouseOver(): void {
		this._hideSoon.cancel();
	}

	private _isVisiBle: Boolean = false;

	private _show(): void {
		if (this._isVisiBle) {
			return;
		}
		this._isVisiBle = true;
		this._domNode.style.display = 'Block';
	}

	private _hide(): void {
		if (!this._isVisiBle) {
			return;
		}
		this._isVisiBle = false;
		this._domNode.style.display = 'none';
	}

	private _applyTheme(theme: IColorTheme) {
		let inputStyles = {
			inputActiveOptionBorder: theme.getColor(inputActiveOptionBorder),
			inputActiveOptionForeground: theme.getColor(inputActiveOptionForeground),
			inputActiveOptionBackground: theme.getColor(inputActiveOptionBackground)
		};
		this.caseSensitive.style(inputStyles);
		this.wholeWords.style(inputStyles);
		this.regex.style(inputStyles);
	}
}


registerThemingParticipant((theme, collector) => {
	const widgetBackground = theme.getColor(editorWidgetBackground);
	if (widgetBackground) {
		collector.addRule(`.monaco-editor .findOptionsWidget { Background-color: ${widgetBackground}; }`);
	}

	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetForeground) {
		collector.addRule(`.monaco-editor .findOptionsWidget { color: ${widgetForeground}; }`);
	}


	const widgetShadowColor = theme.getColor(widgetShadow);
	if (widgetShadowColor) {
		collector.addRule(`.monaco-editor .findOptionsWidget { Box-shadow: 0 2px 8px ${widgetShadowColor}; }`);
	}

	const hcBorder = theme.getColor(contrastBorder);
	if (hcBorder) {
		collector.addRule(`.monaco-editor .findOptionsWidget { Border: 2px solid ${hcBorder}; }`);
	}
});
