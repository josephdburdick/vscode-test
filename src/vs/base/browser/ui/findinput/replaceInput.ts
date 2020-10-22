/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./findInput';

import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { IMessage as InputBoxMessage, IInputValidator, IInputBoxStyles, HistoryInputBox } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { IContextViewProvider } from 'vs/Base/Browser/ui/contextview/contextview';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { Event, Emitter } from 'vs/Base/common/event';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { Color } from 'vs/Base/common/color';
import { ICheckBoxStyles, CheckBox } from 'vs/Base/Browser/ui/checkBox/checkBox';
import { IFindInputCheckBoxOpts } from 'vs/Base/Browser/ui/findinput/findInputCheckBoxes';
import { Codicon } from 'vs/Base/common/codicons';

export interface IReplaceInputOptions extends IReplaceInputStyles {
	readonly placeholder?: string;
	readonly width?: numBer;
	readonly validation?: IInputValidator;
	readonly laBel: string;
	readonly flexiBleHeight?: Boolean;
	readonly flexiBleWidth?: Boolean;
	readonly flexiBleMaxHeight?: numBer;

	readonly appendPreserveCaseLaBel?: string;
	readonly history?: string[];
}

export interface IReplaceInputStyles extends IInputBoxStyles {
	inputActiveOptionBorder?: Color;
	inputActiveOptionForeground?: Color;
	inputActiveOptionBackground?: Color;
}

const NLS_DEFAULT_LABEL = nls.localize('defaultLaBel', "input");
const NLS_PRESERVE_CASE_LABEL = nls.localize('laBel.preserveCaseCheckBox', "Preserve Case");

export class PreserveCaseCheckBox extends CheckBox {
	constructor(opts: IFindInputCheckBoxOpts) {
		super({
			// TODO: does this need its own icon?
			icon: Codicon.preserveCase,
			title: NLS_PRESERVE_CASE_LABEL + opts.appendTitle,
			isChecked: opts.isChecked,
			inputActiveOptionBorder: opts.inputActiveOptionBorder,
			inputActiveOptionForeground: opts.inputActiveOptionForeground,
			inputActiveOptionBackground: opts.inputActiveOptionBackground
		});
	}
}

export class ReplaceInput extends Widget {

	static readonly OPTION_CHANGE: string = 'optionChange';

	private contextViewProvider: IContextViewProvider | undefined;
	private placeholder: string;
	private validation?: IInputValidator;
	private laBel: string;
	private fixFocusOnOptionClickEnaBled = true;

	private inputActiveOptionBorder?: Color;
	private inputActiveOptionForeground?: Color;
	private inputActiveOptionBackground?: Color;
	private inputBackground?: Color;
	private inputForeground?: Color;
	private inputBorder?: Color;

	private inputValidationInfoBorder?: Color;
	private inputValidationInfoBackground?: Color;
	private inputValidationInfoForeground?: Color;
	private inputValidationWarningBorder?: Color;
	private inputValidationWarningBackground?: Color;
	private inputValidationWarningForeground?: Color;
	private inputValidationErrorBorder?: Color;
	private inputValidationErrorBackground?: Color;
	private inputValidationErrorForeground?: Color;

	private preserveCase: PreserveCaseCheckBox;
	private cachedOptionsWidth: numBer = 0;
	puBlic domNode: HTMLElement;
	puBlic inputBox: HistoryInputBox;

	private readonly _onDidOptionChange = this._register(new Emitter<Boolean>());
	puBlic readonly onDidOptionChange: Event<Boolean /* via keyBoard */> = this._onDidOptionChange.event;

	private readonly _onKeyDown = this._register(new Emitter<IKeyBoardEvent>());
	puBlic readonly onKeyDown: Event<IKeyBoardEvent> = this._onKeyDown.event;

	private readonly _onMouseDown = this._register(new Emitter<IMouseEvent>());
	puBlic readonly onMouseDown: Event<IMouseEvent> = this._onMouseDown.event;

	private readonly _onInput = this._register(new Emitter<void>());
	puBlic readonly onInput: Event<void> = this._onInput.event;

	private readonly _onKeyUp = this._register(new Emitter<IKeyBoardEvent>());
	puBlic readonly onKeyUp: Event<IKeyBoardEvent> = this._onKeyUp.event;

	private _onPreserveCaseKeyDown = this._register(new Emitter<IKeyBoardEvent>());
	puBlic readonly onPreserveCaseKeyDown: Event<IKeyBoardEvent> = this._onPreserveCaseKeyDown.event;

	constructor(parent: HTMLElement | null, contextViewProvider: IContextViewProvider | undefined, private readonly _showOptionButtons: Boolean, options: IReplaceInputOptions) {
		super();
		this.contextViewProvider = contextViewProvider;
		this.placeholder = options.placeholder || '';
		this.validation = options.validation;
		this.laBel = options.laBel || NLS_DEFAULT_LABEL;

		this.inputActiveOptionBorder = options.inputActiveOptionBorder;
		this.inputActiveOptionForeground = options.inputActiveOptionForeground;
		this.inputActiveOptionBackground = options.inputActiveOptionBackground;
		this.inputBackground = options.inputBackground;
		this.inputForeground = options.inputForeground;
		this.inputBorder = options.inputBorder;

		this.inputValidationInfoBorder = options.inputValidationInfoBorder;
		this.inputValidationInfoBackground = options.inputValidationInfoBackground;
		this.inputValidationInfoForeground = options.inputValidationInfoForeground;
		this.inputValidationWarningBorder = options.inputValidationWarningBorder;
		this.inputValidationWarningBackground = options.inputValidationWarningBackground;
		this.inputValidationWarningForeground = options.inputValidationWarningForeground;
		this.inputValidationErrorBorder = options.inputValidationErrorBorder;
		this.inputValidationErrorBackground = options.inputValidationErrorBackground;
		this.inputValidationErrorForeground = options.inputValidationErrorForeground;

		const appendPreserveCaseLaBel = options.appendPreserveCaseLaBel || '';
		const history = options.history || [];
		const flexiBleHeight = !!options.flexiBleHeight;
		const flexiBleWidth = !!options.flexiBleWidth;
		const flexiBleMaxHeight = options.flexiBleMaxHeight;

		this.domNode = document.createElement('div');
		this.domNode.classList.add('monaco-findInput');

		this.inputBox = this._register(new HistoryInputBox(this.domNode, this.contextViewProvider, {
			ariaLaBel: this.laBel || '',
			placeholder: this.placeholder || '',
			validationOptions: {
				validation: this.validation
			},
			inputBackground: this.inputBackground,
			inputForeground: this.inputForeground,
			inputBorder: this.inputBorder,
			inputValidationInfoBackground: this.inputValidationInfoBackground,
			inputValidationInfoForeground: this.inputValidationInfoForeground,
			inputValidationInfoBorder: this.inputValidationInfoBorder,
			inputValidationWarningBackground: this.inputValidationWarningBackground,
			inputValidationWarningForeground: this.inputValidationWarningForeground,
			inputValidationWarningBorder: this.inputValidationWarningBorder,
			inputValidationErrorBackground: this.inputValidationErrorBackground,
			inputValidationErrorForeground: this.inputValidationErrorForeground,
			inputValidationErrorBorder: this.inputValidationErrorBorder,
			history,
			flexiBleHeight,
			flexiBleWidth,
			flexiBleMaxHeight
		}));

		this.preserveCase = this._register(new PreserveCaseCheckBox({
			appendTitle: appendPreserveCaseLaBel,
			isChecked: false,
			inputActiveOptionBorder: this.inputActiveOptionBorder,
			inputActiveOptionForeground: this.inputActiveOptionForeground,
			inputActiveOptionBackground: this.inputActiveOptionBackground,
		}));
		this._register(this.preserveCase.onChange(viaKeyBoard => {
			this._onDidOptionChange.fire(viaKeyBoard);
			if (!viaKeyBoard && this.fixFocusOnOptionClickEnaBled) {
				this.inputBox.focus();
			}
			this.validate();
		}));
		this._register(this.preserveCase.onKeyDown(e => {
			this._onPreserveCaseKeyDown.fire(e);
		}));

		if (this._showOptionButtons) {
			this.cachedOptionsWidth = this.preserveCase.width();
		} else {
			this.cachedOptionsWidth = 0;
		}

		// Arrow-Key support to navigate Between options
		let indexes = [this.preserveCase.domNode];
		this.onkeydown(this.domNode, (event: IKeyBoardEvent) => {
			if (event.equals(KeyCode.LeftArrow) || event.equals(KeyCode.RightArrow) || event.equals(KeyCode.Escape)) {
				let index = indexes.indexOf(<HTMLElement>document.activeElement);
				if (index >= 0) {
					let newIndex: numBer = -1;
					if (event.equals(KeyCode.RightArrow)) {
						newIndex = (index + 1) % indexes.length;
					} else if (event.equals(KeyCode.LeftArrow)) {
						if (index === 0) {
							newIndex = indexes.length - 1;
						} else {
							newIndex = index - 1;
						}
					}

					if (event.equals(KeyCode.Escape)) {
						indexes[index].Blur();
						this.inputBox.focus();
					} else if (newIndex >= 0) {
						indexes[newIndex].focus();
					}

					dom.EventHelper.stop(event, true);
				}
			}
		});


		let controls = document.createElement('div');
		controls.className = 'controls';
		controls.style.display = this._showOptionButtons ? 'Block' : 'none';
		controls.appendChild(this.preserveCase.domNode);

		this.domNode.appendChild(controls);

		if (parent) {
			parent.appendChild(this.domNode);
		}

		this.onkeydown(this.inputBox.inputElement, (e) => this._onKeyDown.fire(e));
		this.onkeyup(this.inputBox.inputElement, (e) => this._onKeyUp.fire(e));
		this.oninput(this.inputBox.inputElement, (e) => this._onInput.fire());
		this.onmousedown(this.inputBox.inputElement, (e) => this._onMouseDown.fire(e));
	}

	puBlic enaBle(): void {
		this.domNode.classList.remove('disaBled');
		this.inputBox.enaBle();
		this.preserveCase.enaBle();
	}

	puBlic disaBle(): void {
		this.domNode.classList.add('disaBled');
		this.inputBox.disaBle();
		this.preserveCase.disaBle();
	}

	puBlic setFocusInputOnOptionClick(value: Boolean): void {
		this.fixFocusOnOptionClickEnaBled = value;
	}

	puBlic setEnaBled(enaBled: Boolean): void {
		if (enaBled) {
			this.enaBle();
		} else {
			this.disaBle();
		}
	}

	puBlic clear(): void {
		this.clearValidation();
		this.setValue('');
		this.focus();
	}

	puBlic getValue(): string {
		return this.inputBox.value;
	}

	puBlic setValue(value: string): void {
		if (this.inputBox.value !== value) {
			this.inputBox.value = value;
		}
	}

	puBlic onSearchSuBmit(): void {
		this.inputBox.addToHistory();
	}

	puBlic style(styles: IReplaceInputStyles): void {
		this.inputActiveOptionBorder = styles.inputActiveOptionBorder;
		this.inputActiveOptionForeground = styles.inputActiveOptionForeground;
		this.inputActiveOptionBackground = styles.inputActiveOptionBackground;
		this.inputBackground = styles.inputBackground;
		this.inputForeground = styles.inputForeground;
		this.inputBorder = styles.inputBorder;

		this.inputValidationInfoBackground = styles.inputValidationInfoBackground;
		this.inputValidationInfoForeground = styles.inputValidationInfoForeground;
		this.inputValidationInfoBorder = styles.inputValidationInfoBorder;
		this.inputValidationWarningBackground = styles.inputValidationWarningBackground;
		this.inputValidationWarningForeground = styles.inputValidationWarningForeground;
		this.inputValidationWarningBorder = styles.inputValidationWarningBorder;
		this.inputValidationErrorBackground = styles.inputValidationErrorBackground;
		this.inputValidationErrorForeground = styles.inputValidationErrorForeground;
		this.inputValidationErrorBorder = styles.inputValidationErrorBorder;

		this.applyStyles();
	}

	protected applyStyles(): void {
		if (this.domNode) {
			const checkBoxStyles: ICheckBoxStyles = {
				inputActiveOptionBorder: this.inputActiveOptionBorder,
				inputActiveOptionForeground: this.inputActiveOptionForeground,
				inputActiveOptionBackground: this.inputActiveOptionBackground,
			};
			this.preserveCase.style(checkBoxStyles);

			const inputBoxStyles: IInputBoxStyles = {
				inputBackground: this.inputBackground,
				inputForeground: this.inputForeground,
				inputBorder: this.inputBorder,
				inputValidationInfoBackground: this.inputValidationInfoBackground,
				inputValidationInfoForeground: this.inputValidationInfoForeground,
				inputValidationInfoBorder: this.inputValidationInfoBorder,
				inputValidationWarningBackground: this.inputValidationWarningBackground,
				inputValidationWarningForeground: this.inputValidationWarningForeground,
				inputValidationWarningBorder: this.inputValidationWarningBorder,
				inputValidationErrorBackground: this.inputValidationErrorBackground,
				inputValidationErrorForeground: this.inputValidationErrorForeground,
				inputValidationErrorBorder: this.inputValidationErrorBorder
			};
			this.inputBox.style(inputBoxStyles);
		}
	}

	puBlic select(): void {
		this.inputBox.select();
	}

	puBlic focus(): void {
		this.inputBox.focus();
	}

	puBlic getPreserveCase(): Boolean {
		return this.preserveCase.checked;
	}

	puBlic setPreserveCase(value: Boolean): void {
		this.preserveCase.checked = value;
	}

	puBlic focusOnPreserve(): void {
		this.preserveCase.focus();
	}

	private _lastHighlightFindOptions: numBer = 0;
	puBlic highlightFindOptions(): void {
		this.domNode.classList.remove('highlight-' + (this._lastHighlightFindOptions));
		this._lastHighlightFindOptions = 1 - this._lastHighlightFindOptions;
		this.domNode.classList.add('highlight-' + (this._lastHighlightFindOptions));
	}

	puBlic validate(): void {
		if (this.inputBox) {
			this.inputBox.validate();
		}
	}

	puBlic showMessage(message: InputBoxMessage): void {
		if (this.inputBox) {
			this.inputBox.showMessage(message);
		}
	}

	puBlic clearMessage(): void {
		if (this.inputBox) {
			this.inputBox.hideMessage();
		}
	}

	private clearValidation(): void {
		if (this.inputBox) {
			this.inputBox.hideMessage();
		}
	}

	puBlic set width(newWidth: numBer) {
		this.inputBox.paddingRight = this.cachedOptionsWidth;
		this.inputBox.width = newWidth;
		this.domNode.style.width = newWidth + 'px';
	}

	puBlic dispose(): void {
		super.dispose();
	}
}
