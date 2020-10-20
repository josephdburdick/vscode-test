/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { CAseSensitiveCheckbox, RegexCheckbox, WholeWordsCheckbox } from 'vs/bAse/browser/ui/findinput/findInputCheckboxes';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { ICodeEditor, IOverlAyWidget, IOverlAyWidgetPosition, OverlAyWidgetPositionPreference } from 'vs/editor/browser/editorBrowser';
import { FIND_IDS } from 'vs/editor/contrib/find/findModel';
import { FindReplAceStAte } from 'vs/editor/contrib/find/findStAte';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { contrAstBorder, editorWidgetBAckground, inputActiveOptionBorder, inputActiveOptionBAckground, widgetShAdow, editorWidgetForeground, inputActiveOptionForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { IColorTheme, IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';

export clAss FindOptionsWidget extends Widget implements IOverlAyWidget {

	privAte stAtic reAdonly ID = 'editor.contrib.findOptionsWidget';

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _stAte: FindReplAceStAte;
	privAte reAdonly _keybindingService: IKeybindingService;

	privAte reAdonly _domNode: HTMLElement;
	privAte reAdonly regex: RegexCheckbox;
	privAte reAdonly wholeWords: WholeWordsCheckbox;
	privAte reAdonly cAseSensitive: CAseSensitiveCheckbox;

	constructor(
		editor: ICodeEditor,
		stAte: FindReplAceStAte,
		keybindingService: IKeybindingService,
		themeService: IThemeService
	) {
		super();

		this._editor = editor;
		this._stAte = stAte;
		this._keybindingService = keybindingService;

		this._domNode = document.creAteElement('div');
		this._domNode.clAssNAme = 'findOptionsWidget';
		this._domNode.style.displAy = 'none';
		this._domNode.style.top = '10px';
		this._domNode.setAttribute('role', 'presentAtion');
		this._domNode.setAttribute('AriA-hidden', 'true');

		const inputActiveOptionBorderColor = themeService.getColorTheme().getColor(inputActiveOptionBorder);
		const inputActiveOptionForegroundColor = themeService.getColorTheme().getColor(inputActiveOptionForeground);
		const inputActiveOptionBAckgroundColor = themeService.getColorTheme().getColor(inputActiveOptionBAckground);

		this.cAseSensitive = this._register(new CAseSensitiveCheckbox({
			AppendTitle: this._keybindingLAbelFor(FIND_IDS.ToggleCAseSensitiveCommAnd),
			isChecked: this._stAte.mAtchCAse,
			inputActiveOptionBorder: inputActiveOptionBorderColor,
			inputActiveOptionForeground: inputActiveOptionForegroundColor,
			inputActiveOptionBAckground: inputActiveOptionBAckgroundColor
		}));
		this._domNode.AppendChild(this.cAseSensitive.domNode);
		this._register(this.cAseSensitive.onChAnge(() => {
			this._stAte.chAnge({
				mAtchCAse: this.cAseSensitive.checked
			}, fAlse);
		}));

		this.wholeWords = this._register(new WholeWordsCheckbox({
			AppendTitle: this._keybindingLAbelFor(FIND_IDS.ToggleWholeWordCommAnd),
			isChecked: this._stAte.wholeWord,
			inputActiveOptionBorder: inputActiveOptionBorderColor,
			inputActiveOptionForeground: inputActiveOptionForegroundColor,
			inputActiveOptionBAckground: inputActiveOptionBAckgroundColor
		}));
		this._domNode.AppendChild(this.wholeWords.domNode);
		this._register(this.wholeWords.onChAnge(() => {
			this._stAte.chAnge({
				wholeWord: this.wholeWords.checked
			}, fAlse);
		}));

		this.regex = this._register(new RegexCheckbox({
			AppendTitle: this._keybindingLAbelFor(FIND_IDS.ToggleRegexCommAnd),
			isChecked: this._stAte.isRegex,
			inputActiveOptionBorder: inputActiveOptionBorderColor,
			inputActiveOptionForeground: inputActiveOptionForegroundColor,
			inputActiveOptionBAckground: inputActiveOptionBAckgroundColor
		}));
		this._domNode.AppendChild(this.regex.domNode);
		this._register(this.regex.onChAnge(() => {
			this._stAte.chAnge({
				isRegex: this.regex.checked
			}, fAlse);
		}));

		this._editor.AddOverlAyWidget(this);

		this._register(this._stAte.onFindReplAceStAteChAnge((e) => {
			let somethingChAnged = fAlse;
			if (e.isRegex) {
				this.regex.checked = this._stAte.isRegex;
				somethingChAnged = true;
			}
			if (e.wholeWord) {
				this.wholeWords.checked = this._stAte.wholeWord;
				somethingChAnged = true;
			}
			if (e.mAtchCAse) {
				this.cAseSensitive.checked = this._stAte.mAtchCAse;
				somethingChAnged = true;
			}
			if (!this._stAte.isReveAled && somethingChAnged) {
				this._reveAlTemporArily();
			}
		}));

		this._register(dom.AddDisposAbleNonBubblingMouseOutListener(this._domNode, (e) => this._onMouseOut()));
		this._register(dom.AddDisposAbleListener(this._domNode, 'mouseover', (e) => this._onMouseOver()));

		this._ApplyTheme(themeService.getColorTheme());
		this._register(themeService.onDidColorThemeChAnge(this._ApplyTheme.bind(this)));
	}

	privAte _keybindingLAbelFor(ActionId: string): string {
		let kb = this._keybindingService.lookupKeybinding(ActionId);
		if (!kb) {
			return '';
		}
		return ` (${kb.getLAbel()})`;
	}

	public dispose(): void {
		this._editor.removeOverlAyWidget(this);
		super.dispose();
	}

	// ----- IOverlAyWidget API

	public getId(): string {
		return FindOptionsWidget.ID;
	}

	public getDomNode(): HTMLElement {
		return this._domNode;
	}

	public getPosition(): IOverlAyWidgetPosition {
		return {
			preference: OverlAyWidgetPositionPreference.TOP_RIGHT_CORNER
		};
	}

	public highlightFindOptions(): void {
		this._reveAlTemporArily();
	}

	privAte _hideSoon = this._register(new RunOnceScheduler(() => this._hide(), 2000));

	privAte _reveAlTemporArily(): void {
		this._show();
		this._hideSoon.schedule();
	}

	privAte _onMouseOut(): void {
		this._hideSoon.schedule();
	}

	privAte _onMouseOver(): void {
		this._hideSoon.cAncel();
	}

	privAte _isVisible: booleAn = fAlse;

	privAte _show(): void {
		if (this._isVisible) {
			return;
		}
		this._isVisible = true;
		this._domNode.style.displAy = 'block';
	}

	privAte _hide(): void {
		if (!this._isVisible) {
			return;
		}
		this._isVisible = fAlse;
		this._domNode.style.displAy = 'none';
	}

	privAte _ApplyTheme(theme: IColorTheme) {
		let inputStyles = {
			inputActiveOptionBorder: theme.getColor(inputActiveOptionBorder),
			inputActiveOptionForeground: theme.getColor(inputActiveOptionForeground),
			inputActiveOptionBAckground: theme.getColor(inputActiveOptionBAckground)
		};
		this.cAseSensitive.style(inputStyles);
		this.wholeWords.style(inputStyles);
		this.regex.style(inputStyles);
	}
}


registerThemingPArticipAnt((theme, collector) => {
	const widgetBAckground = theme.getColor(editorWidgetBAckground);
	if (widgetBAckground) {
		collector.AddRule(`.monAco-editor .findOptionsWidget { bAckground-color: ${widgetBAckground}; }`);
	}

	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetForeground) {
		collector.AddRule(`.monAco-editor .findOptionsWidget { color: ${widgetForeground}; }`);
	}


	const widgetShAdowColor = theme.getColor(widgetShAdow);
	if (widgetShAdowColor) {
		collector.AddRule(`.monAco-editor .findOptionsWidget { box-shAdow: 0 2px 8px ${widgetShAdowColor}; }`);
	}

	const hcBorder = theme.getColor(contrAstBorder);
	if (hcBorder) {
		collector.AddRule(`.monAco-editor .findOptionsWidget { border: 2px solid ${hcBorder}; }`);
	}
});
