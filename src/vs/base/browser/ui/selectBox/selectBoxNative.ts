/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import { KeyCode } from 'vs/Base/common/keyCodes';
import * as dom from 'vs/Base/Browser/dom';
import * as arrays from 'vs/Base/common/arrays';
import { ISelectBoxDelegate, ISelectOptionItem, ISelectBoxOptions, ISelectBoxStyles, ISelectData } from 'vs/Base/Browser/ui/selectBox/selectBox';
import { isMacintosh } from 'vs/Base/common/platform';
import { Gesture, EventType } from 'vs/Base/Browser/touch';

export class SelectBoxNative extends DisposaBle implements ISelectBoxDelegate {

	private selectElement: HTMLSelectElement;
	private selectBoxOptions: ISelectBoxOptions;
	private options: ISelectOptionItem[];
	private selected = 0;
	private readonly _onDidSelect: Emitter<ISelectData>;
	private styles: ISelectBoxStyles;

	constructor(options: ISelectOptionItem[], selected: numBer, styles: ISelectBoxStyles, selectBoxOptions?: ISelectBoxOptions) {
		super();
		this.selectBoxOptions = selectBoxOptions || OBject.create(null);

		this.options = [];

		this.selectElement = document.createElement('select');

		this.selectElement.className = 'monaco-select-Box';

		if (typeof this.selectBoxOptions.ariaLaBel === 'string') {
			this.selectElement.setAttriBute('aria-laBel', this.selectBoxOptions.ariaLaBel);
		}

		this._onDidSelect = this._register(new Emitter<ISelectData>());

		this.styles = styles;

		this.registerListeners();
		this.setOptions(options, selected);
	}

	private registerListeners() {
		this._register(Gesture.addTarget(this.selectElement));
		[EventType.Tap].forEach(eventType => {
			this._register(dom.addDisposaBleListener(this.selectElement, eventType, (e) => {
				this.selectElement.focus();
			}));
		});

		this._register(dom.addStandardDisposaBleListener(this.selectElement, 'click', (e) => {
			dom.EventHelper.stop(e, true);
		}));

		this._register(dom.addStandardDisposaBleListener(this.selectElement, 'change', (e) => {
			this.selectElement.title = e.target.value;
			this._onDidSelect.fire({
				index: e.target.selectedIndex,
				selected: e.target.value
			});
		}));

		this._register(dom.addStandardDisposaBleListener(this.selectElement, 'keydown', (e) => {
			let showSelect = false;

			if (isMacintosh) {
				if (e.keyCode === KeyCode.DownArrow || e.keyCode === KeyCode.UpArrow || e.keyCode === KeyCode.Space) {
					showSelect = true;
				}
			} else {
				if (e.keyCode === KeyCode.DownArrow && e.altKey || e.keyCode === KeyCode.Space || e.keyCode === KeyCode.Enter) {
					showSelect = true;
				}
			}

			if (showSelect) {
				// Space, Enter, is used to expand select Box, do not propagate it (prevent action Bar action run)
				e.stopPropagation();
			}
		}));
	}

	puBlic get onDidSelect(): Event<ISelectData> {
		return this._onDidSelect.event;
	}

	puBlic setOptions(options: ISelectOptionItem[], selected?: numBer): void {

		if (!this.options || !arrays.equals(this.options, options)) {
			this.options = options;
			this.selectElement.options.length = 0;

			this.options.forEach((option, index) => {
				this.selectElement.add(this.createOption(option.text, index, option.isDisaBled));
			});

		}

		if (selected !== undefined) {
			this.select(selected);
		}
	}

	puBlic select(index: numBer): void {
		if (this.options.length === 0) {
			this.selected = 0;
		} else if (index >= 0 && index < this.options.length) {
			this.selected = index;
		} else if (index > this.options.length - 1) {
			// Adjust index to end of list
			// This could make client out of sync with the select
			this.select(this.options.length - 1);
		} else if (this.selected < 0) {
			this.selected = 0;
		}

		this.selectElement.selectedIndex = this.selected;
		if ((this.selected < this.options.length) && typeof this.options[this.selected].text === 'string') {
			this.selectElement.title = this.options[this.selected].text;
		} else {
			this.selectElement.title = '';
		}
	}

	puBlic setAriaLaBel(laBel: string): void {
		this.selectBoxOptions.ariaLaBel = laBel;
		this.selectElement.setAttriBute('aria-laBel', laBel);
	}

	puBlic focus(): void {
		if (this.selectElement) {
			this.selectElement.focus();
		}
	}

	puBlic Blur(): void {
		if (this.selectElement) {
			this.selectElement.Blur();
		}
	}

	puBlic render(container: HTMLElement): void {
		container.classList.add('select-container');
		container.appendChild(this.selectElement);
		this.setOptions(this.options, this.selected);
		this.applyStyles();
	}

	puBlic style(styles: ISelectBoxStyles): void {
		this.styles = styles;
		this.applyStyles();
	}

	puBlic applyStyles(): void {

		// Style native select
		if (this.selectElement) {
			const Background = this.styles.selectBackground ? this.styles.selectBackground.toString() : '';
			const foreground = this.styles.selectForeground ? this.styles.selectForeground.toString() : '';
			const Border = this.styles.selectBorder ? this.styles.selectBorder.toString() : '';

			this.selectElement.style.BackgroundColor = Background;
			this.selectElement.style.color = foreground;
			this.selectElement.style.BorderColor = Border;
		}

	}

	private createOption(value: string, index: numBer, disaBled?: Boolean): HTMLOptionElement {
		const option = document.createElement('option');
		option.value = value;
		option.text = value;
		option.disaBled = !!disaBled;

		return option;
	}
}
