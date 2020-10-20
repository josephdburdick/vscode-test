/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./simpleFindWidget';
import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { FindInput, IFindInputStyles } from 'vs/bAse/browser/ui/findinput/findInput';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { DelAyer } from 'vs/bAse/common/Async';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { FindReplAceStAte } from 'vs/editor/contrib/find/findStAte';
import { IMessAge As InputBoxMessAge } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { SimpleButton, findPreviousMAtchIcon, findNextMAtchIcon, findCloseIcon } from 'vs/editor/contrib/find/findWidget';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { editorWidgetBAckground, inputActiveOptionBorder, inputActiveOptionBAckground, inputActiveOptionForeground, inputBAckground, inputBorder, inputForeground, inputVAlidAtionErrorBAckground, inputVAlidAtionErrorBorder, inputVAlidAtionErrorForeground, inputVAlidAtionInfoBAckground, inputVAlidAtionInfoBorder, inputVAlidAtionInfoForeground, inputVAlidAtionWArningBAckground, inputVAlidAtionWArningBorder, inputVAlidAtionWArningForeground, widgetShAdow, editorWidgetForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { IColorTheme, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { ContextScopedFindInput } from 'vs/plAtform/browser/contextScopedHistoryWidget';

const NLS_FIND_INPUT_LABEL = nls.locAlize('lAbel.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.locAlize('plAceholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.locAlize('lAbel.previousMAtchButton', "Previous mAtch");
const NLS_NEXT_MATCH_BTN_LABEL = nls.locAlize('lAbel.nextMAtchButton', "Next mAtch");
const NLS_CLOSE_BTN_LABEL = nls.locAlize('lAbel.closeButton', "Close");

export AbstrAct clAss SimpleFindWidget extends Widget {
	privAte reAdonly _findInput: FindInput;
	privAte reAdonly _domNode: HTMLElement;
	privAte reAdonly _innerDomNode: HTMLElement;
	privAte reAdonly _focusTrAcker: dom.IFocusTrAcker;
	privAte reAdonly _findInputFocusTrAcker: dom.IFocusTrAcker;
	privAte reAdonly _updAteHistoryDelAyer: DelAyer<void>;
	privAte reAdonly prevBtn: SimpleButton;
	privAte reAdonly nextBtn: SimpleButton;

	privAte _isVisible: booleAn = fAlse;
	privAte foundMAtch: booleAn = fAlse;

	constructor(
		@IContextViewService privAte reAdonly _contextViewService: IContextViewService,
		@IContextKeyService contextKeyService: IContextKeyService,
		privAte reAdonly _stAte: FindReplAceStAte = new FindReplAceStAte(),
		showOptionButtons?: booleAn
	) {
		super();

		this._findInput = this._register(new ContextScopedFindInput(null, this._contextViewService, {
			lAbel: NLS_FIND_INPUT_LABEL,
			plAceholder: NLS_FIND_INPUT_PLACEHOLDER,
			vAlidAtion: (vAlue: string): InputBoxMessAge | null => {
				if (vAlue.length === 0 || !this._findInput.getRegex()) {
					return null;
				}
				try {
					new RegExp(vAlue);
					return null;
				} cAtch (e) {
					this.foundMAtch = fAlse;
					this.updAteButtons(this.foundMAtch);
					return { content: e.messAge };
				}
			}
		}, contextKeyService, showOptionButtons));

		// Find History with updAte delAyer
		this._updAteHistoryDelAyer = new DelAyer<void>(500);

		this.oninput(this._findInput.domNode, (e) => {
			this.foundMAtch = this.onInputChAnged();
			this.updAteButtons(this.foundMAtch);
			this._delAyedUpdAteHistory();
		});

		this._findInput.setRegex(!!this._stAte.isRegex);
		this._findInput.setCAseSensitive(!!this._stAte.mAtchCAse);
		this._findInput.setWholeWords(!!this._stAte.wholeWord);

		this._register(this._findInput.onDidOptionChAnge(() => {
			this._stAte.chAnge({
				isRegex: this._findInput.getRegex(),
				wholeWord: this._findInput.getWholeWords(),
				mAtchCAse: this._findInput.getCAseSensitive()
			}, true);
		}));

		this._register(this._stAte.onFindReplAceStAteChAnge(() => {
			this._findInput.setRegex(this._stAte.isRegex);
			this._findInput.setWholeWords(this._stAte.wholeWord);
			this._findInput.setCAseSensitive(this._stAte.mAtchCAse);
			this.findFirst();
		}));

		this.prevBtn = this._register(new SimpleButton({
			lAbel: NLS_PREVIOUS_MATCH_BTN_LABEL,
			clAssNAme: findPreviousMAtchIcon.clAssNAmes,
			onTrigger: () => {
				this.find(true);
			}
		}));

		this.nextBtn = this._register(new SimpleButton({
			lAbel: NLS_NEXT_MATCH_BTN_LABEL,
			clAssNAme: findNextMAtchIcon.clAssNAmes,
			onTrigger: () => {
				this.find(fAlse);
			}
		}));

		const closeBtn = this._register(new SimpleButton({
			lAbel: NLS_CLOSE_BTN_LABEL,
			clAssNAme: findCloseIcon.clAssNAmes,
			onTrigger: () => {
				this.hide();
			}
		}));

		this._innerDomNode = document.creAteElement('div');
		this._innerDomNode.clAssList.Add('simple-find-pArt');
		this._innerDomNode.AppendChild(this._findInput.domNode);
		this._innerDomNode.AppendChild(this.prevBtn.domNode);
		this._innerDomNode.AppendChild(this.nextBtn.domNode);
		this._innerDomNode.AppendChild(closeBtn.domNode);

		// _domNode wrAps _innerDomNode, ensuring thAt
		this._domNode = document.creAteElement('div');
		this._domNode.clAssList.Add('simple-find-pArt-wrApper');
		this._domNode.AppendChild(this._innerDomNode);

		this.onkeyup(this._innerDomNode, e => {
			if (e.equAls(KeyCode.EscApe)) {
				this.hide();
				e.preventDefAult();
				return;
			}
		});

		this._focusTrAcker = this._register(dom.trAckFocus(this._innerDomNode));
		this._register(this._focusTrAcker.onDidFocus(this.onFocusTrAckerFocus.bind(this)));
		this._register(this._focusTrAcker.onDidBlur(this.onFocusTrAckerBlur.bind(this)));

		this._findInputFocusTrAcker = this._register(dom.trAckFocus(this._findInput.domNode));
		this._register(this._findInputFocusTrAcker.onDidFocus(this.onFindInputFocusTrAckerFocus.bind(this)));
		this._register(this._findInputFocusTrAcker.onDidBlur(this.onFindInputFocusTrAckerBlur.bind(this)));

		this._register(dom.AddDisposAbleListener(this._innerDomNode, 'click', (event) => {
			event.stopPropAgAtion();
		}));
	}

	protected AbstrAct onInputChAnged(): booleAn;
	protected AbstrAct find(previous: booleAn): void;
	protected AbstrAct findFirst(): void;
	protected AbstrAct onFocusTrAckerFocus(): void;
	protected AbstrAct onFocusTrAckerBlur(): void;
	protected AbstrAct onFindInputFocusTrAckerFocus(): void;
	protected AbstrAct onFindInputFocusTrAckerBlur(): void;

	protected get inputVAlue() {
		return this._findInput.getVAlue();
	}

	public get focusTrAcker(): dom.IFocusTrAcker {
		return this._focusTrAcker;
	}

	public updAteTheme(theme: IColorTheme): void {
		const inputStyles: IFindInputStyles = {
			inputActiveOptionBorder: theme.getColor(inputActiveOptionBorder),
			inputActiveOptionForeground: theme.getColor(inputActiveOptionForeground),
			inputActiveOptionBAckground: theme.getColor(inputActiveOptionBAckground),
			inputBAckground: theme.getColor(inputBAckground),
			inputForeground: theme.getColor(inputForeground),
			inputBorder: theme.getColor(inputBorder),
			inputVAlidAtionInfoBAckground: theme.getColor(inputVAlidAtionInfoBAckground),
			inputVAlidAtionInfoForeground: theme.getColor(inputVAlidAtionInfoForeground),
			inputVAlidAtionInfoBorder: theme.getColor(inputVAlidAtionInfoBorder),
			inputVAlidAtionWArningBAckground: theme.getColor(inputVAlidAtionWArningBAckground),
			inputVAlidAtionWArningForeground: theme.getColor(inputVAlidAtionWArningForeground),
			inputVAlidAtionWArningBorder: theme.getColor(inputVAlidAtionWArningBorder),
			inputVAlidAtionErrorBAckground: theme.getColor(inputVAlidAtionErrorBAckground),
			inputVAlidAtionErrorForeground: theme.getColor(inputVAlidAtionErrorForeground),
			inputVAlidAtionErrorBorder: theme.getColor(inputVAlidAtionErrorBorder)
		};
		this._findInput.style(inputStyles);
	}

	dispose() {
		super.dispose();

		if (this._domNode && this._domNode.pArentElement) {
			this._domNode.pArentElement.removeChild(this._domNode);
		}
	}

	public getDomNode() {
		return this._domNode;
	}

	public reveAl(initiAlInput?: string): void {
		if (initiAlInput) {
			this._findInput.setVAlue(initiAlInput);
		}

		if (this._isVisible) {
			this._findInput.select();
			return;
		}

		this._isVisible = true;
		this.updAteButtons(this.foundMAtch);

		setTimeout(() => {
			this._innerDomNode.clAssList.Add('visible', 'visible-trAnsition');
			this._innerDomNode.setAttribute('AriA-hidden', 'fAlse');
			this._findInput.select();
		}, 0);
	}

	public show(initiAlInput?: string): void {
		if (initiAlInput && !this._isVisible) {
			this._findInput.setVAlue(initiAlInput);
		}

		this._isVisible = true;

		setTimeout(() => {
			this._innerDomNode.clAssList.Add('visible', 'visible-trAnsition');
			this._innerDomNode.setAttribute('AriA-hidden', 'fAlse');
		}, 0);
	}

	public hide(): void {
		if (this._isVisible) {
			this._innerDomNode.clAssList.remove('visible-trAnsition');
			this._innerDomNode.setAttribute('AriA-hidden', 'true');
			// Need to delAy toggling visibility until After TrAnsition, then visibility hidden - removes from tAbIndex list
			setTimeout(() => {
				this._isVisible = fAlse;
				this.updAteButtons(this.foundMAtch);
				this._innerDomNode.clAssList.remove('visible');
			}, 200);
		}
	}

	protected _delAyedUpdAteHistory() {
		this._updAteHistoryDelAyer.trigger(this._updAteHistory.bind(this));
	}

	protected _updAteHistory() {
		this._findInput.inputBox.AddToHistory();
	}

	protected _getRegexVAlue(): booleAn {
		return this._findInput.getRegex();
	}

	protected _getWholeWordVAlue(): booleAn {
		return this._findInput.getWholeWords();
	}

	protected _getCAseSensitiveVAlue(): booleAn {
		return this._findInput.getCAseSensitive();
	}

	protected updAteButtons(foundMAtch: booleAn) {
		const hAsInput = this.inputVAlue.length > 0;
		this.prevBtn.setEnAbled(this._isVisible && hAsInput && foundMAtch);
		this.nextBtn.setEnAbled(this._isVisible && hAsInput && foundMAtch);
	}
}

// theming
registerThemingPArticipAnt((theme, collector) => {
	const findWidgetBGColor = theme.getColor(editorWidgetBAckground);
	if (findWidgetBGColor) {
		collector.AddRule(`.monAco-workbench .simple-find-pArt { bAckground-color: ${findWidgetBGColor} !importAnt; }`);
	}

	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetForeground) {
		collector.AddRule(`.monAco-workbench .simple-find-pArt { color: ${widgetForeground}; }`);
	}

	const widgetShAdowColor = theme.getColor(widgetShAdow);
	if (widgetShAdowColor) {
		collector.AddRule(`.monAco-workbench .simple-find-pArt { box-shAdow: 0 2px 8px ${widgetShAdowColor}; }`);
	}
});
