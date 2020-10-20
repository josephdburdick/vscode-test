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
import { Color } from 'vs/bAse/common/color';
import { ICheckboxStyles, Checkbox } from 'vs/bAse/browser/ui/checkbox/checkbox';
import { IFindInputCheckboxOpts } from 'vs/bAse/browser/ui/findinput/findInputCheckboxes';
import { Codicon } from 'vs/bAse/common/codicons';

export interfAce IReplAceInputOptions extends IReplAceInputStyles {
	reAdonly plAceholder?: string;
	reAdonly width?: number;
	reAdonly vAlidAtion?: IInputVAlidAtor;
	reAdonly lAbel: string;
	reAdonly flexibleHeight?: booleAn;
	reAdonly flexibleWidth?: booleAn;
	reAdonly flexibleMAxHeight?: number;

	reAdonly AppendPreserveCAseLAbel?: string;
	reAdonly history?: string[];
}

export interfAce IReplAceInputStyles extends IInputBoxStyles {
	inputActiveOptionBorder?: Color;
	inputActiveOptionForeground?: Color;
	inputActiveOptionBAckground?: Color;
}

const NLS_DEFAULT_LABEL = nls.locAlize('defAultLAbel', "input");
const NLS_PRESERVE_CASE_LABEL = nls.locAlize('lAbel.preserveCAseCheckbox', "Preserve CAse");

export clAss PreserveCAseCheckbox extends Checkbox {
	constructor(opts: IFindInputCheckboxOpts) {
		super({
			// TODO: does this need its own icon?
			icon: Codicon.preserveCAse,
			title: NLS_PRESERVE_CASE_LABEL + opts.AppendTitle,
			isChecked: opts.isChecked,
			inputActiveOptionBorder: opts.inputActiveOptionBorder,
			inputActiveOptionForeground: opts.inputActiveOptionForeground,
			inputActiveOptionBAckground: opts.inputActiveOptionBAckground
		});
	}
}

export clAss ReplAceInput extends Widget {

	stAtic reAdonly OPTION_CHANGE: string = 'optionChAnge';

	privAte contextViewProvider: IContextViewProvider | undefined;
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

	privAte preserveCAse: PreserveCAseCheckbox;
	privAte cAchedOptionsWidth: number = 0;
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

	privAte _onPreserveCAseKeyDown = this._register(new Emitter<IKeyboArdEvent>());
	public reAdonly onPreserveCAseKeyDown: Event<IKeyboArdEvent> = this._onPreserveCAseKeyDown.event;

	constructor(pArent: HTMLElement | null, contextViewProvider: IContextViewProvider | undefined, privAte reAdonly _showOptionButtons: booleAn, options: IReplAceInputOptions) {
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

		const AppendPreserveCAseLAbel = options.AppendPreserveCAseLAbel || '';
		const history = options.history || [];
		const flexibleHeight = !!options.flexibleHeight;
		const flexibleWidth = !!options.flexibleWidth;
		const flexibleMAxHeight = options.flexibleMAxHeight;

		this.domNode = document.creAteElement('div');
		this.domNode.clAssList.Add('monAco-findInput');

		this.inputBox = this._register(new HistoryInputBox(this.domNode, this.contextViewProvider, {
			AriALAbel: this.lAbel || '',
			plAceholder: this.plAceholder || '',
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

		this.preserveCAse = this._register(new PreserveCAseCheckbox({
			AppendTitle: AppendPreserveCAseLAbel,
			isChecked: fAlse,
			inputActiveOptionBorder: this.inputActiveOptionBorder,
			inputActiveOptionForeground: this.inputActiveOptionForeground,
			inputActiveOptionBAckground: this.inputActiveOptionBAckground,
		}));
		this._register(this.preserveCAse.onChAnge(viAKeyboArd => {
			this._onDidOptionChAnge.fire(viAKeyboArd);
			if (!viAKeyboArd && this.fixFocusOnOptionClickEnAbled) {
				this.inputBox.focus();
			}
			this.vAlidAte();
		}));
		this._register(this.preserveCAse.onKeyDown(e => {
			this._onPreserveCAseKeyDown.fire(e);
		}));

		if (this._showOptionButtons) {
			this.cAchedOptionsWidth = this.preserveCAse.width();
		} else {
			this.cAchedOptionsWidth = 0;
		}

		// Arrow-Key support to nAvigAte between options
		let indexes = [this.preserveCAse.domNode];
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
		controls.AppendChild(this.preserveCAse.domNode);

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
		this.preserveCAse.enAble();
	}

	public disAble(): void {
		this.domNode.clAssList.Add('disAbled');
		this.inputBox.disAble();
		this.preserveCAse.disAble();
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

	public style(styles: IReplAceInputStyles): void {
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
			this.preserveCAse.style(checkBoxStyles);

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

	public getPreserveCAse(): booleAn {
		return this.preserveCAse.checked;
	}

	public setPreserveCAse(vAlue: booleAn): void {
		this.preserveCAse.checked = vAlue;
	}

	public focusOnPreserve(): void {
		this.preserveCAse.focus();
	}

	privAte _lAstHighlightFindOptions: number = 0;
	public highlightFindOptions(): void {
		this.domNode.clAssList.remove('highlight-' + (this._lAstHighlightFindOptions));
		this._lAstHighlightFindOptions = 1 - this._lAstHighlightFindOptions;
		this.domNode.clAssList.Add('highlight-' + (this._lAstHighlightFindOptions));
	}

	public vAlidAte(): void {
		if (this.inputBox) {
			this.inputBox.vAlidAte();
		}
	}

	public showMessAge(messAge: InputBoxMessAge): void {
		if (this.inputBox) {
			this.inputBox.showMessAge(messAge);
		}
	}

	public cleArMessAge(): void {
		if (this.inputBox) {
			this.inputBox.hideMessAge();
		}
	}

	privAte cleArVAlidAtion(): void {
		if (this.inputBox) {
			this.inputBox.hideMessAge();
		}
	}

	public set width(newWidth: number) {
		this.inputBox.pAddingRight = this.cAchedOptionsWidth;
		this.inputBox.width = newWidth;
		this.domNode.style.width = newWidth + 'px';
	}

	public dispose(): void {
		super.dispose();
	}
}
