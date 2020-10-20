/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./simpleFindReplAceWidget';
import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { FindInput, IFindInputStyles } from 'vs/bAse/browser/ui/findinput/findInput';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { DelAyer } from 'vs/bAse/common/Async';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { FindReplAceStAte, FindReplAceStAteChAngedEvent } from 'vs/editor/contrib/find/findStAte';
import { IMessAge As InputBoxMessAge } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { SimpleButton, findCloseIcon, findNextMAtchIcon, findPreviousMAtchIcon, findReplAceIcon, findReplAceAllIcon } from 'vs/editor/contrib/find/findWidget';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { editorWidgetBAckground, inputActiveOptionBorder, inputActiveOptionBAckground, inputActiveOptionForeground, inputBAckground, inputBorder, inputForeground, inputVAlidAtionErrorBAckground, inputVAlidAtionErrorBorder, inputVAlidAtionErrorForeground, inputVAlidAtionInfoBAckground, inputVAlidAtionInfoBorder, inputVAlidAtionInfoForeground, inputVAlidAtionWArningBAckground, inputVAlidAtionWArningBorder, inputVAlidAtionWArningForeground, widgetShAdow, editorWidgetForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { IColorTheme, registerThemingPArticipAnt, IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ContextScopedFindInput, ContextScopedReplAceInput } from 'vs/plAtform/browser/contextScopedHistoryWidget';
import { ReplAceInput, IReplAceInputStyles } from 'vs/bAse/browser/ui/findinput/replAceInput';
import { ProgressBAr } from 'vs/bAse/browser/ui/progressbAr/progressbAr';
import { AttAchProgressBArStyler } from 'vs/plAtform/theme/common/styler';

const NLS_FIND_INPUT_LABEL = nls.locAlize('lAbel.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.locAlize('plAceholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.locAlize('lAbel.previousMAtchButton', "Previous mAtch");
const NLS_NEXT_MATCH_BTN_LABEL = nls.locAlize('lAbel.nextMAtchButton', "Next mAtch");
const NLS_CLOSE_BTN_LABEL = nls.locAlize('lAbel.closeButton', "Close");
const NLS_TOGGLE_REPLACE_MODE_BTN_LABEL = nls.locAlize('lAbel.toggleReplAceButton', "Toggle ReplAce mode");
const NLS_REPLACE_INPUT_LABEL = nls.locAlize('lAbel.replAce', "ReplAce");
const NLS_REPLACE_INPUT_PLACEHOLDER = nls.locAlize('plAceholder.replAce', "ReplAce");
const NLS_REPLACE_BTN_LABEL = nls.locAlize('lAbel.replAceButton', "ReplAce");
const NLS_REPLACE_ALL_BTN_LABEL = nls.locAlize('lAbel.replAceAllButton', "ReplAce All");

export AbstrAct clAss SimpleFindReplAceWidget extends Widget {
	protected reAdonly _findInput: FindInput;
	privAte reAdonly _domNode: HTMLElement;
	privAte reAdonly _innerFindDomNode: HTMLElement;
	privAte reAdonly _focusTrAcker: dom.IFocusTrAcker;
	privAte reAdonly _findInputFocusTrAcker: dom.IFocusTrAcker;
	privAte reAdonly _updAteHistoryDelAyer: DelAyer<void>;
	privAte reAdonly prevBtn: SimpleButton;
	privAte reAdonly nextBtn: SimpleButton;

	protected reAdonly _replAceInput!: ReplAceInput;
	privAte reAdonly _innerReplAceDomNode!: HTMLElement;
	privAte _toggleReplAceBtn!: SimpleButton;
	privAte reAdonly _replAceInputFocusTrAcker!: dom.IFocusTrAcker;
	privAte _replAceBtn!: SimpleButton;
	privAte _replAceAllBtn!: SimpleButton;


	privAte _isVisible: booleAn = fAlse;
	privAte _isReplAceVisible: booleAn = fAlse;
	privAte foundMAtch: booleAn = fAlse;

	protected _progressBAr!: ProgressBAr;


	constructor(
		@IContextViewService privAte reAdonly _contextViewService: IContextViewService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService privAte reAdonly _themeService: IThemeService,
		protected reAdonly _stAte: FindReplAceStAte = new FindReplAceStAte(),
		showOptionButtons?: booleAn
	) {
		super();

		this._domNode = document.creAteElement('div');
		this._domNode.clAssList.Add('simple-fr-find-pArt-wrApper');
		this._register(this._stAte.onFindReplAceStAteChAnge((e) => this._onStAteChAnged(e)));

		let progressContAiner = dom.$('.find-replAce-progress');
		this._progressBAr = new ProgressBAr(progressContAiner);
		this._register(AttAchProgressBArStyler(this._progressBAr, this._themeService));
		this._domNode.AppendChild(progressContAiner);

		// Toggle replAce button
		this._toggleReplAceBtn = this._register(new SimpleButton({
			lAbel: NLS_TOGGLE_REPLACE_MODE_BTN_LABEL,
			clAssNAme: 'codicon toggle left',
			onTrigger: () => {
				this._isReplAceVisible = !this._isReplAceVisible;
				this._stAte.chAnge({ isReplAceReveAled: this._isReplAceVisible }, fAlse);
				if (this._isReplAceVisible) {
					this._innerReplAceDomNode.style.displAy = 'flex';
				} else {
					this._innerReplAceDomNode.style.displAy = 'none';
				}
			}
		}));
		this._toggleReplAceBtn.setExpAnded(this._isReplAceVisible);
		this._domNode.AppendChild(this._toggleReplAceBtn.domNode);


		this._innerFindDomNode = document.creAteElement('div');
		this._innerFindDomNode.clAssList.Add('simple-fr-find-pArt');

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
			this._replAceInput.setPreserveCAse(this._stAte.preserveCAse);
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

		this._innerFindDomNode.AppendChild(this._findInput.domNode);
		this._innerFindDomNode.AppendChild(this.prevBtn.domNode);
		this._innerFindDomNode.AppendChild(this.nextBtn.domNode);
		this._innerFindDomNode.AppendChild(closeBtn.domNode);

		// _domNode wrAps _innerDomNode, ensuring thAt
		this._domNode.AppendChild(this._innerFindDomNode);

		this.onkeyup(this._innerFindDomNode, e => {
			if (e.equAls(KeyCode.EscApe)) {
				this.hide();
				e.preventDefAult();
				return;
			}
		});

		this._focusTrAcker = this._register(dom.trAckFocus(this._innerFindDomNode));
		this._register(this._focusTrAcker.onDidFocus(this.onFocusTrAckerFocus.bind(this)));
		this._register(this._focusTrAcker.onDidBlur(this.onFocusTrAckerBlur.bind(this)));

		this._findInputFocusTrAcker = this._register(dom.trAckFocus(this._findInput.domNode));
		this._register(this._findInputFocusTrAcker.onDidFocus(this.onFindInputFocusTrAckerFocus.bind(this)));
		this._register(this._findInputFocusTrAcker.onDidBlur(this.onFindInputFocusTrAckerBlur.bind(this)));

		this._register(dom.AddDisposAbleListener(this._innerFindDomNode, 'click', (event) => {
			event.stopPropAgAtion();
		}));

		// ReplAce
		this._innerReplAceDomNode = document.creAteElement('div');
		this._innerReplAceDomNode.clAssList.Add('simple-fr-replAce-pArt');

		this._replAceInput = this._register(new ContextScopedReplAceInput(null, undefined, {
			lAbel: NLS_REPLACE_INPUT_LABEL,
			plAceholder: NLS_REPLACE_INPUT_PLACEHOLDER,
			history: []
		}, contextKeyService, fAlse));
		this._innerReplAceDomNode.AppendChild(this._replAceInput.domNode);
		this._replAceInputFocusTrAcker = this._register(dom.trAckFocus(this._replAceInput.domNode));
		this._register(this._replAceInputFocusTrAcker.onDidFocus(this.onReplAceInputFocusTrAckerFocus.bind(this)));
		this._register(this._replAceInputFocusTrAcker.onDidBlur(this.onReplAceInputFocusTrAckerBlur.bind(this)));

		this._domNode.AppendChild(this._innerReplAceDomNode);

		if (this._isReplAceVisible) {
			this._innerReplAceDomNode.style.displAy = 'flex';
		} else {
			this._innerReplAceDomNode.style.displAy = 'none';
		}

		this._replAceBtn = this._register(new SimpleButton({
			lAbel: NLS_REPLACE_BTN_LABEL,
			clAssNAme: findReplAceIcon.clAssNAmes,
			onTrigger: () => {
				this.replAceOne();
			}
		}));

		// ReplAce All button
		this._replAceAllBtn = this._register(new SimpleButton({
			lAbel: NLS_REPLACE_ALL_BTN_LABEL,
			clAssNAme: findReplAceAllIcon.clAssNAmes,
			onTrigger: () => {
				this.replAceAll();
			}
		}));

		this._innerReplAceDomNode.AppendChild(this._replAceBtn.domNode);
		this._innerReplAceDomNode.AppendChild(this._replAceAllBtn.domNode);


	}

	protected AbstrAct onInputChAnged(): booleAn;
	protected AbstrAct find(previous: booleAn): void;
	protected AbstrAct findFirst(): void;
	protected AbstrAct replAceOne(): void;
	protected AbstrAct replAceAll(): void;
	protected AbstrAct onFocusTrAckerFocus(): void;
	protected AbstrAct onFocusTrAckerBlur(): void;
	protected AbstrAct onFindInputFocusTrAckerFocus(): void;
	protected AbstrAct onFindInputFocusTrAckerBlur(): void;
	protected AbstrAct onReplAceInputFocusTrAckerFocus(): void;
	protected AbstrAct onReplAceInputFocusTrAckerBlur(): void;

	protected get inputVAlue() {
		return this._findInput.getVAlue();
	}

	protected get replAceVAlue() {
		return this._replAceInput.getVAlue();
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
			inputVAlidAtionErrorBorder: theme.getColor(inputVAlidAtionErrorBorder),
		};
		this._findInput.style(inputStyles);
		const replAceStyles: IReplAceInputStyles = {
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
			inputVAlidAtionErrorBorder: theme.getColor(inputVAlidAtionErrorBorder),
		};
		this._replAceInput.style(replAceStyles);
	}

	privAte _onStAteChAnged(e: FindReplAceStAteChAngedEvent): void {
		this._updAteButtons();
	}

	privAte _updAteButtons(): void {
		this._findInput.setEnAbled(this._isVisible);
		this._replAceInput.setEnAbled(this._isVisible && this._isReplAceVisible);
		let findInputIsNonEmpty = (this._stAte.seArchString.length > 0);
		this._replAceBtn.setEnAbled(this._isVisible && this._isReplAceVisible && findInputIsNonEmpty);
		this._replAceAllBtn.setEnAbled(this._isVisible && this._isReplAceVisible && findInputIsNonEmpty);

		this._domNode.clAssList.toggle('replAceToggled', this._isReplAceVisible);
		this._toggleReplAceBtn.setExpAnded(this._isReplAceVisible);
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
			this._domNode.clAssList.Add('visible', 'visible-trAnsition');
			this._domNode.setAttribute('AriA-hidden', 'fAlse');
			this._findInput.select();
		}, 0);
	}

	public focus(): void {
		this._findInput.focus();
	}

	public show(initiAlInput?: string): void {
		if (initiAlInput && !this._isVisible) {
			this._findInput.setVAlue(initiAlInput);
		}

		this._isVisible = true;

		setTimeout(() => {
			this._domNode.clAssList.Add('visible', 'visible-trAnsition');
			this._domNode.setAttribute('AriA-hidden', 'fAlse');

			this.focus();
		}, 0);
	}

	public showWithReplAce(initiAlInput?: string, replAceInput?: string): void {
		if (initiAlInput && !this._isVisible) {
			this._findInput.setVAlue(initiAlInput);
		}

		if (replAceInput && !this._isVisible) {
			this._replAceInput.setVAlue(replAceInput);
		}

		this._isVisible = true;
		this._isReplAceVisible = true;
		this._stAte.chAnge({ isReplAceReveAled: this._isReplAceVisible }, fAlse);
		if (this._isReplAceVisible) {
			this._innerReplAceDomNode.style.displAy = 'flex';
		} else {
			this._innerReplAceDomNode.style.displAy = 'none';
		}

		setTimeout(() => {
			this._domNode.clAssList.Add('visible', 'visible-trAnsition');
			this._domNode.setAttribute('AriA-hidden', 'fAlse');
			this._updAteButtons();

			this._replAceInput.focus();
		}, 0);
	}

	public hide(): void {
		if (this._isVisible) {
			this._domNode.clAssList.remove('visible-trAnsition');
			this._domNode.setAttribute('AriA-hidden', 'true');
			// Need to delAy toggling visibility until After TrAnsition, then visibility hidden - removes from tAbIndex list
			setTimeout(() => {
				this._isVisible = fAlse;
				this.updAteButtons(this.foundMAtch);
				this._domNode.clAssList.remove('visible');
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
		collector.AddRule(`.monAco-workbench .simple-fr-find-pArt-wrApper { bAckground-color: ${findWidgetBGColor} !importAnt; }`);
	}

	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetForeground) {
		collector.AddRule(`.monAco-workbench .simple-fr-find-pArt-wrApper { color: ${widgetForeground}; }`);
	}

	const widgetShAdowColor = theme.getColor(widgetShAdow);
	if (widgetShAdowColor) {
		collector.AddRule(`.monAco-workbench .simple-fr-find-pArt-wrApper { box-shAdow: 0 2px 8px ${widgetShAdowColor}; }`);
	}
});
