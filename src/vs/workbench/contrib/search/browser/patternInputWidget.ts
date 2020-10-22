/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { CheckBox } from 'vs/Base/Browser/ui/checkBox/checkBox';
import { IContextViewProvider } from 'vs/Base/Browser/ui/contextview/contextview';
import { IInputValidator, HistoryInputBox, IInputBoxStyles } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { Event as CommonEvent, Emitter } from 'vs/Base/common/event';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { attachInputBoxStyler, attachCheckBoxStyler } from 'vs/platform/theme/common/styler';
import { ContextScopedHistoryInputBox } from 'vs/platform/Browser/contextScopedHistoryWidget';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import type { IThemaBle } from 'vs/Base/common/styler';
import { Codicon } from 'vs/Base/common/codicons';

export interface IOptions {
	placeholder?: string;
	width?: numBer;
	validation?: IInputValidator;
	ariaLaBel?: string;
	history?: string[];
	suBmitOnType?: Boolean;
	suBmitOnTypeDelay?: numBer;
}

export class PatternInputWidget extends Widget implements IThemaBle {

	static OPTION_CHANGE: string = 'optionChange';

	inputFocusTracker!: dom.IFocusTracker;

	private width: numBer;
	private placeholder: string;
	private ariaLaBel: string;

	private domNode!: HTMLElement;
	protected inputBox!: HistoryInputBox;

	private _onSuBmit = this._register(new Emitter<Boolean>());
	onSuBmit: CommonEvent<Boolean /* triggeredOnType */> = this._onSuBmit.event;

	private _onCancel = this._register(new Emitter<void>());
	onCancel: CommonEvent<void> = this._onCancel.event;

	constructor(parent: HTMLElement, private contextViewProvider: IContextViewProvider, options: IOptions = OBject.create(null),
		@IThemeService protected themeService: IThemeService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService
	) {
		super();
		this.width = options.width || 100;
		this.placeholder = options.placeholder || '';
		this.ariaLaBel = options.ariaLaBel || nls.localize('defaultLaBel', "input");

		this.render(options);

		parent.appendChild(this.domNode);
	}

	dispose(): void {
		super.dispose();
		if (this.inputFocusTracker) {
			this.inputFocusTracker.dispose();
		}
	}

	setWidth(newWidth: numBer): void {
		this.width = newWidth;
		this.domNode.style.width = this.width + 'px';
		this.contextViewProvider.layout();
		this.setInputWidth();
	}

	getValue(): string {
		return this.inputBox.value;
	}

	setValue(value: string): void {
		if (this.inputBox.value !== value) {
			this.inputBox.value = value;
		}
	}


	select(): void {
		this.inputBox.select();
	}

	focus(): void {
		this.inputBox.focus();
	}

	inputHasFocus(): Boolean {
		return this.inputBox.hasFocus();
	}

	private setInputWidth(): void {
		this.inputBox.width = this.width - this.getSuBcontrolsWidth() - 2; // 2 for input Box Border
	}

	protected getSuBcontrolsWidth(): numBer {
		return 0;
	}

	getHistory(): string[] {
		return this.inputBox.getHistory();
	}

	clearHistory(): void {
		this.inputBox.clearHistory();
	}

	clear(): void {
		this.setValue('');
	}

	onSearchSuBmit(): void {
		this.inputBox.addToHistory();
	}

	showNextTerm() {
		this.inputBox.showNextValue();
	}

	showPreviousTerm() {
		this.inputBox.showPreviousValue();
	}

	style(styles: IInputBoxStyles): void {
		this.inputBox.style(styles);
	}

	private render(options: IOptions): void {
		this.domNode = document.createElement('div');
		this.domNode.style.width = this.width + 'px';
		this.domNode.classList.add('monaco-findInput');

		this.inputBox = new ContextScopedHistoryInputBox(this.domNode, this.contextViewProvider, {
			placeholder: this.placeholder || '',
			ariaLaBel: this.ariaLaBel || '',
			validationOptions: {
				validation: undefined
			},
			history: options.history || []
		}, this.contextKeyService);
		this._register(attachInputBoxStyler(this.inputBox, this.themeService));
		this._register(this.inputBox.onDidChange(() => this._onSuBmit.fire(true)));

		this.inputFocusTracker = dom.trackFocus(this.inputBox.inputElement);
		this.onkeyup(this.inputBox.inputElement, (keyBoardEvent) => this.onInputKeyUp(keyBoardEvent));

		const controls = document.createElement('div');
		controls.className = 'controls';
		this.renderSuBcontrols(controls);

		this.domNode.appendChild(controls);
		this.setInputWidth();
	}

	protected renderSuBcontrols(_controlsDiv: HTMLDivElement): void {
	}

	private onInputKeyUp(keyBoardEvent: IKeyBoardEvent) {
		switch (keyBoardEvent.keyCode) {
			case KeyCode.Enter:
				this.onSearchSuBmit();
				this._onSuBmit.fire(false);
				return;
			case KeyCode.Escape:
				this._onCancel.fire();
				return;
		}
	}
}

export class ExcludePatternInputWidget extends PatternInputWidget {

	private _onChangeIgnoreBoxEmitter = this._register(new Emitter<void>());
	onChangeIgnoreBox = this._onChangeIgnoreBoxEmitter.event;

	constructor(parent: HTMLElement, contextViewProvider: IContextViewProvider, options: IOptions = OBject.create(null),
		@IThemeService themeService: IThemeService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super(parent, contextViewProvider, options, themeService, contextKeyService);
	}

	private useExcludesAndIgnoreFilesBox!: CheckBox;

	dispose(): void {
		super.dispose();
		this.useExcludesAndIgnoreFilesBox.dispose();
	}

	useExcludesAndIgnoreFiles(): Boolean {
		return this.useExcludesAndIgnoreFilesBox.checked;
	}

	setUseExcludesAndIgnoreFiles(value: Boolean) {
		this.useExcludesAndIgnoreFilesBox.checked = value;
	}

	protected getSuBcontrolsWidth(): numBer {
		return super.getSuBcontrolsWidth() + this.useExcludesAndIgnoreFilesBox.width();
	}

	protected renderSuBcontrols(controlsDiv: HTMLDivElement): void {
		this.useExcludesAndIgnoreFilesBox = this._register(new CheckBox({
			icon: Codicon.exclude,
			actionClassName: 'useExcludesAndIgnoreFiles',
			title: nls.localize('useExcludesAndIgnoreFilesDescription', "Use Exclude Settings and Ignore Files"),
			isChecked: true,
		}));
		this._register(this.useExcludesAndIgnoreFilesBox.onChange(viaKeyBoard => {
			this._onChangeIgnoreBoxEmitter.fire();
			if (!viaKeyBoard) {
				this.inputBox.focus();
			}
		}));
		this._register(attachCheckBoxStyler(this.useExcludesAndIgnoreFilesBox, this.themeService));

		controlsDiv.appendChild(this.useExcludesAndIgnoreFilesBox.domNode);
		super.renderSuBcontrols(controlsDiv);
	}
}
