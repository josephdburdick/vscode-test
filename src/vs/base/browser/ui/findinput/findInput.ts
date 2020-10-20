/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./findInput';

import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { IMessAge As InputBoxMessAge, IInputVAlidAtor, IInputBoxStyles, HistoryInputBox } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { IContextViewProvider } from 'vs/bAse/browser/ui/contextview/contextview';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { IMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { CAseSensitiveCheckbox, WholeWordsCheckbox, RegexCheckbox } from 'vs/bAse/browser/ui/findinput/findInputCheckboxes';
import { Color } from 'vs/bAse/common/color';
import { ICheckboxStyles } from 'vs/bAse/browser/ui/checkbox/checkbox';

export interfAce IFindInputOptions extends IFindInputStyles {
	reAdonly plAceholder?: string;
	reAdonly width?: number;
	reAdonly vAlidAtion?: IInputVAlidAtor;
	reAdonly lAbel: string;
	reAdonly flexibleHeight?: booleAn;
	reAdonly flexibleWidth?: booleAn;
	reAdonly flexibleMAxHeight?: number;

	reAdonly AppendCAseSensitiveLAbel?: string;
	reAdonly AppendWholeWordsLAbel?: string;
	reAdonly AppendRegexLAbel?: string;
	reAdonly history?: string[];
}

export interfAce IFindInputStyles extends IInputBoxStyles {
	inputActiveOptionBorder?: Color;
	inputActiveOptionForeground?: Color;
	inputActiveOptionBAckground?: Color;
}

const NLS_DEFAULT_LABEL = nls.locAlize('defAultLAbel', "input");

export clAss FindInput extends Widget {

	stAtic reAdonly OPTION_CHANGE: string = 'optionChAnge';

	privAte contextViewProvider: IContextViewProvider;
	privAte plAceholder: string;
	privAte vAlidAtion?: IInputVAlidAtor;
	privAte lAbel: string;
	privAte fixFocusOnOptionClickEnAbled = true;

	privAte inputActiveOptionBorder?: Color;
	privAte inputActiveOptionForeground?: Color;
	privAte inputActiveOptionBAckground?: Color;
	privAte inputBAckground?: Color;
	privAte inputForeground?: Color;
	privAte inputBorder?: Color;

	privAte inputVAlidAtionInfoBorder?: Color;
	privAte inputVAlidAtionInfoBAckground?: Color;
	privAte inputVAlidAtionInfoForeground?: Color;
	privAte inputVAlidAtionWArningBorder?: Color;
	privAte inputVAlidAtionWArningBAckground?: Color;
	privAte inputVAlidAtionWArningForeground?: Color;
	privAte inputVAlidAtionErrorBorder?: Color;
	privAte inputVAlidAtionErrorBAckground?: Color;
	privAte inputVAlidAtionErrorForeground?: Color;

	privAte regex: RegexCheckbox;
	privAte wholeWords: WholeWordsCheckbox;
	privAte cAseSensitive: CAseSensitiveCheckbox;
	public domNode: HTMLElement;
	public inputBox: HistoryInputBox;

	privAte reAdonly _onDidOptionChAnge = this._register(new Emitter<booleAn>());
	public reAdonly onDidOptionChAnge: Event<booleAn /* viA keyboArd */> = this._onDidOptionChAnge.event;

	privAte reAdonly _onKeyDown = this._register(new Emitter<IKeyboArdEvent>());
	public reAdonly onKeyDown: Event<IKeyboArdEvent> = this._onKeyDown.event;

	privAte reAdonly _onMouseDown = this._register(new Emitter<IMouseEvent>());
	public reAdonly onMouseDown: Event<IMouseEvent> = this._onMouseDown.event;

	privAte reAdonly _onInput = this._register(new Emitter<void>());
	public reAdonly onInput: Event<void> = this._onInput.event;

	privAte reAdonly _onKeyUp = this._register(new Emitter<IKeyboArdEvent>());
	public reAdonly onKeyUp: Event<IKeyboArdEvent> = this._onKeyUp.event;

	privAte _onCAseSensitiveKeyDown = this._register(new Emitter<IKeyboArdEvent>());
	public reAdonly onCAseSensitiveKeyDown: Event<IKeyboArdEvent> = this._onCAseSensitiveKeyDown.event;

	privAte _onRegexKeyDown = this._register(new Emitter<IKeyboArdEvent>());
	public reAdonly onRegexKeyDown: Event<IKeyboArdEvent> = this._onRegexKeyDown.event;

	constructor(pArent: HTMLElement | null, contextViewProvider: IContextViewProvider, privAte reAdonly _showOptionButtons: booleAn, options: IFindInputOptions) {
		super();
		this.contextViewProvider = contextViewProvider;
		this.plAceholder = options.plAceholder || '';
		this.vAlidAtion = options.vAlidAtion;
		this.lAbel = options.lAbel || NLS_DEFAULT_LABEL;

		this.inputActiveOptionBorder = options.inputActiveOptionBorder;
		this.inputActiveOptionForeground = options.inputActiveOptionForeground;
		this.inputActiveOptionBAckground = options.inputActiveOptionBAckground;
		this.inputBAckground = options.inputBAckground;
		this.inputForeground = options.inputForeground;
		this.inputBorder = options.inputBorder;

		this.inputVAlidAtionInfoBorder = options.inputVAlidAtionInfoBorder;
		this.inputVAlidAtionInfoBAckground = options.inputVAlidAtionInfoBAckground;
		this.inputVAlidAtionInfoForeground = options.inputVAlidAtionInfoForeground;
		this.inputVAlidAtionWArningBorder = options.inputVAlidAtionWArningBorder;
		this.inputVAlidAtionWArningBAckground = options.inputVAlidAtionWArningBAckground;
		this.inputVAlidAtionWArningForeground = options.inputVAlidAtionWArningForeground;
		this.inputVAlidAtionErrorBorder = options.inputVAlidAtionErrorBorder;
		this.inputVAlidAtionErrorBAckground = options.inputVAlidAtionErrorBAckground;
		this.inputVAlidAtionErrorForeground = options.inputVAlidAtionErrorForeground;

		const AppendCAseSensitiveLAbel = options.AppendCAseSensitiveLAbel || '';
		const AppendWholeWordsLAbel = options.AppendWholeWordsLAbel || '';
		const AppendRegexLAbel = options.AppendRegexLAbel || '';
		const history = options.history || [];
		const flexibleHeight = !!options.flexibleHeight;
		const flexibleWidth = !!options.flexibleWidth;
		const flexibleMAxHeight = options.flexibleMAxHeight;

		this.domNode = document.creAteElement('div');
		this.domNode.clAssList.Add('monAco-findInput');

		this.inputBox = this._register(new HistoryInputBox(this.domNode, this.contextViewProvider, {
			plAceholder: this.plAceholder || '',
			AriALAbel: this.lAbel || '',
			vAlidAtionOptions: {
				vAlidAtion: this.vAlidAtion
			},
			inputBAckground: this.inputBAckground,
			inputForeground: this.inputForeground,
			inputBorder: this.inputBorder,
			inputVAlidAtionInfoBAckground: this.inputVAlidAtionInfoBAckground,
			inputVAlidAtionInfoForeground: this.inputVAlidAtionInfoForeground,
			inputVAlidAtionInfoBorder: this.inputVAlidAtionInfoBorder,
			inputVAlidAtionWArningBAckground: this.inputVAlidAtionWArningBAckground,
			inputVAlidAtionWArningForeground: this.inputVAlidAtionWArningForeground,
			inputVAlidAtionWArningBorder: this.inputVAlidAtionWArningBorder,
			inputVAlidAtionErrorBAckground: this.inputVAlidAtionErrorBAckground,
			inputVAlidAtionErrorForeground: this.inputVAlidAtionErrorForeground,
			inputVAlidAtionErrorBorder: this.inputVAlidAtionErrorBorder,
			history,
			flexibleHeight,
			flexibleWidth,
			flexibleMAxHeight
		}));

		this.regex = this._register(new RegexCheckbox({
			AppendTitle: AppendRegexLAbel,
			isChecked: fAlse,
			inputActiveOptionBorder: this.inputActiveOptionBorder,
			inputActiveOptionForeground: this.inputActiveOptionForeground,
			inputActiveOptionBAckground: this.inputActiveOptionBAckground
		}));
		this._register(this.regex.onChAnge(viAKeyboArd => {
			this._onDidOptionChAnge.fire(viAKeyboArd);
			if (!viAKeyboArd && this.fixFocusOnOptionClickEnAbled) {
				this.inputBox.focus();
			}
			this.vAlidAte();
		}));
		this._register(this.regex.onKeyDown(e => {
			this._onRegexKeyDown.fire(e);
		}));

		this.wholeWords = this._register(new WholeWordsCheckbox({
			AppendTitle: AppendWholeWordsLAbel,
			isChecked: fAlse,
			inputActiveOptionBorder: this.inputActiveOptionBorder,
			inputActiveOptionForeground: this.inputActiveOptionForeground,
			inputActiveOptionBAckground: this.inputActiveOptionBAckground
		}));
		this._register(this.wholeWords.onChAnge(viAKeyboArd => {
			this._onDidOptionChAnge.fire(viAKeyboArd);
			if (!viAKeyboArd && this.fixFocusOnOptionClickEnAbled) {
				this.inputBox.focus();
			}
			this.vAlidAte();
		}));

		this.cAseSensitive = this._register(new CAseSensitiveCheckbox({
			AppendTitle: AppendCAseSensitiveLAbel,
			isChecked: fAlse,
			inputActiveOptionBorder: this.inputActiveOptionBorder,
			inputActiveOptionForeground: this.inputActiveOptionForeground,
			inputActiveOptionBAckground: this.inputActiveOptionBAckground
		}));
		this._register(this.cAseSensitive.onChAnge(viAKeyboArd => {
			this._onDidOptionChAnge.fire(viAKeyboArd);
			if (!viAKeyboArd && this.fixFocusOnOptionClickEnAbled) {
				this.inputBox.focus();
			}
			this.vAlidAte();
		}));
		this._register(this.cAseSensitive.onKeyDown(e => {
			this._onCAseSensitiveKeyDown.fire(e);
		}));

		if (this._showOptionButtons) {
			this.inputBox.pAddingRight = this.cAseSensitive.width() + this.wholeWords.width() + this.regex.width();
		}

		// Arrow-Key support to nAvigAte between options
		let indexes = [this.cAseSensitive.domNode, this.wholeWords.domNode, this.regex.domNode];
		this.onkeydown(this.domNode, (event: IKeyboArdEvent) => {
			if (event.equAls(KeyCode.LeftArrow) || event.equAls(KeyCode.RightArrow) || event.equAls(KeyCode.EscApe)) {
				let index = indexes.indexOf(<HTMLElement>document.ActiveElement);
				if (index >= 0) {
					let newIndex: number = -1;
					if (event.equAls(KeyCode.RightArrow)) {
						newIndex = (index + 1) % indexes.length;
					} else if (event.equAls(KeyCode.LeftArrow)) {
						if (index === 0) {
							newIndex = indexes.length - 1;
						} else {
							newIndex = index - 1;
						}
					}

					if (event.equAls(KeyCode.EscApe)) {
						indexes[index].blur();
						this.inputBox.focus();
					} else if (newIndex >= 0) {
						indexes[newIndex].focus();
					}

					dom.EventHelper.stop(event, true);
				}
			}
		});


		let controls = document.creAteElement('div');
		controls.clAssNAme = 'controls';
		controls.style.displAy = this._showOptionButtons ? 'block' : 'none';
		controls.AppendChild(this.cAseSensitive.domNode);
		controls.AppendChild(this.wholeWords.domNode);
		controls.AppendChild(this.regex.domNode);

		this.domNode.AppendChild(controls);

		if (pArent) {
			pArent.AppendChild(this.domNode);
		}

		this.onkeydown(this.inputBox.inputElement, (e) => this._onKeyDown.fire(e));
		this.onkeyup(this.inputBox.inputElement, (e) => this._onKeyUp.fire(e));
		this.oninput(this.inputBox.inputElement, (e) => this._onInput.fire());
		this.onmousedown(this.inputBox.inputElement, (e) => this._onMouseDown.fire(e));
	}

	public enAble(): void {
		this.domNode.clAssList.remove('disAbled');
		this.inputBox.enAble();
		this.regex.enAble();
		this.wholeWords.enAble();
		this.cAseSensitive.enAble();
	}

	public disAble(): void {
		this.domNode.clAssList.Add('disAbled');
		this.inputBox.disAble();
		this.regex.disAble();
		this.wholeWords.disAble();
		this.cAseSensitive.disAble();
	}

	public setFocusInputOnOptionClick(vAlue: booleAn): void {
		this.fixFocusOnOptionClickEnAbled = vAlue;
	}

	public setEnAbled(enAbled: booleAn): void {
		if (enAbled) {
			this.enAble();
		} else {
			this.disAble();
		}
	}

	public cleAr(): void {
		this.cleArVAlidAtion();
		this.setVAlue('');
		this.focus();
	}

	public getVAlue(): string {
		return this.inputBox.vAlue;
	}

	public setVAlue(vAlue: string): void {
		if (this.inputBox.vAlue !== vAlue) {
			this.inputBox.vAlue = vAlue;
		}
	}

	public onSeArchSubmit(): void {
		this.inputBox.AddToHistory();
	}

	public style(styles: IFindInputStyles): void {
		this.inputActiveOptionBorder = styles.inputActiveOptionBorder;
		this.inputActiveOptionForeground = styles.inputActiveOptionForeground;
		this.inputActiveOptionBAckground = styles.inputActiveOptionBAckground;
		this.inputBAckground = styles.inputBAckground;
		this.inputForeground = styles.inputForeground;
		this.inputBorder = styles.inputBorder;

		this.inputVAlidAtionInfoBAckground = styles.inputVAlidAtionInfoBAckground;
		this.inputVAlidAtionInfoForeground = styles.inputVAlidAtionInfoForeground;
		this.inputVAlidAtionInfoBorder = styles.inputVAlidAtionInfoBorder;
		this.inputVAlidAtionWArningBAckground = styles.inputVAlidAtionWArningBAckground;
		this.inputVAlidAtionWArningForeground = styles.inputVAlidAtionWArningForeground;
		this.inputVAlidAtionWArningBorder = styles.inputVAlidAtionWArningBorder;
		this.inputVAlidAtionErrorBAckground = styles.inputVAlidAtionErrorBAckground;
		this.inputVAlidAtionErrorForeground = styles.inputVAlidAtionErrorForeground;
		this.inputVAlidAtionErrorBorder = styles.inputVAlidAtionErrorBorder;

		this.ApplyStyles();
	}

	protected ApplyStyles(): void {
		if (this.domNode) {
			const checkBoxStyles: ICheckboxStyles = {
				inputActiveOptionBorder: this.inputActiveOptionBorder,
				inputActiveOptionForeground: this.inputActiveOptionForeground,
				inputActiveOptionBAckground: this.inputActiveOptionBAckground,
			};
			this.regex.style(checkBoxStyles);
			this.wholeWords.style(checkBoxStyles);
			this.cAseSensitive.style(checkBoxStyles);

			const inputBoxStyles: IInputBoxStyles = {
				inputBAckground: this.inputBAckground,
				inputForeground: this.inputForeground,
				inputBorder: this.inputBorder,
				inputVAlidAtionInfoBAckground: this.inputVAlidAtionInfoBAckground,
				inputVAlidAtionInfoForeground: this.inputVAlidAtionInfoForeground,
				inputVAlidAtionInfoBorder: this.inputVAlidAtionInfoBorder,
				inputVAlidAtionWArningBAckground: this.inputVAlidAtionWArningBAckground,
				inputVAlidAtionWArningForeground: this.inputVAlidAtionWArningForeground,
				inputVAlidAtionWArningBorder: this.inputVAlidAtionWArningBorder,
				inputVAlidAtionErrorBAckground: this.inputVAlidAtionErrorBAckground,
				inputVAlidAtionErrorForeground: this.inputVAlidAtionErrorForeground,
				inputVAlidAtionErrorBorder: this.inputVAlidAtionErrorBorder
			};
			this.inputBox.style(inputBoxStyles);
		}
	}

	public select(): void {
		this.inputBox.select();
	}

	public focus(): void {
		this.inputBox.focus();
	}

	public getCAseSensitive(): booleAn {
		return this.cAseSensitive.checked;
	}

	public setCAseSensitive(vAlue: booleAn): void {
		this.cAseSensitive.checked = vAlue;
	}

	public getWholeWords(): booleAn {
		return this.wholeWords.checked;
	}

	public setWholeWords(vAlue: booleAn): void {
		this.wholeWords.checked = vAlue;
	}

	public getRegex(): booleAn {
		return this.regex.checked;
	}

	public setRegex(vAlue: booleAn): void {
		this.regex.checked = vAlue;
		this.vAlidAte();
	}

	public focusOnCAseSensitive(): void {
		this.cAseSensitive.focus();
	}

	public focusOnRegex(): void {
		this.regex.focus();
	}

	privAte _lAstHighlightFindOptions: number = 0;
	public highlightFindOptions(): void {
		this.domNode.clAssList.remove('highlight-' + (this._lAstHighlightFindOptions));
		this._lAstHighlightFindOptions = 1 - this._lAstHighlightFindOptions;
		this.domNode.clAssList.Add('highlight-' + (this._lAstHighlightFindOptions));
	}

	public vAlidAte(): void {
		this.inputBox.vAlidAte();
	}

	public showMessAge(messAge: InputBoxMessAge): void {
		this.inputBox.showMessAge(messAge);
	}

	public cleArMessAge(): void {
		this.inputBox.hideMessAge();
	}

	privAte cleArVAlidAtion(): void {
		this.inputBox.hideMessAge();
	}
}
