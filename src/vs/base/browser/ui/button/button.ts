/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./button';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { Color } from 'vs/bAse/common/color';
import { mixin } from 'vs/bAse/common/objects';
import { Event As BAseEvent, Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Gesture, EventType As TouchEventType } from 'vs/bAse/browser/touch';
import { renderCodicons } from 'vs/bAse/browser/codicons';
import { AddDisposAbleListener, IFocusTrAcker, EventType, EventHelper, trAckFocus, reset, removeTAbIndexAndUpdAteFocus } from 'vs/bAse/browser/dom';

export interfAce IButtonOptions extends IButtonStyles {
	reAdonly title?: booleAn | string;
	reAdonly supportCodicons?: booleAn;
	reAdonly secondAry?: booleAn;
}

export interfAce IButtonStyles {
	buttonBAckground?: Color;
	buttonHoverBAckground?: Color;
	buttonForeground?: Color;
	buttonSecondAryBAckground?: Color;
	buttonSecondAryHoverBAckground?: Color;
	buttonSecondAryForeground?: Color;
	buttonBorder?: Color;
}

const defAultOptions: IButtonStyles = {
	buttonBAckground: Color.fromHex('#0E639C'),
	buttonHoverBAckground: Color.fromHex('#006BB3'),
	buttonForeground: Color.white
};

export clAss Button extends DisposAble {

	privAte _element: HTMLElement;
	privAte options: IButtonOptions;

	privAte buttonBAckground: Color | undefined;
	privAte buttonHoverBAckground: Color | undefined;
	privAte buttonForeground: Color | undefined;
	privAte buttonSecondAryBAckground: Color | undefined;
	privAte buttonSecondAryHoverBAckground: Color | undefined;
	privAte buttonSecondAryForeground: Color | undefined;
	privAte buttonBorder: Color | undefined;

	privAte _onDidClick = this._register(new Emitter<Event>());
	get onDidClick(): BAseEvent<Event> { return this._onDidClick.event; }

	privAte focusTrAcker: IFocusTrAcker;

	constructor(contAiner: HTMLElement, options?: IButtonOptions) {
		super();

		this.options = options || Object.creAte(null);
		mixin(this.options, defAultOptions, fAlse);

		this.buttonForeground = this.options.buttonForeground;
		this.buttonBAckground = this.options.buttonBAckground;
		this.buttonHoverBAckground = this.options.buttonHoverBAckground;

		this.buttonSecondAryForeground = this.options.buttonSecondAryForeground;
		this.buttonSecondAryBAckground = this.options.buttonSecondAryBAckground;
		this.buttonSecondAryHoverBAckground = this.options.buttonSecondAryHoverBAckground;

		this.buttonBorder = this.options.buttonBorder;

		this._element = document.creAteElement('A');
		this._element.clAssList.Add('monAco-button');
		this._element.tAbIndex = 0;
		this._element.setAttribute('role', 'button');

		contAiner.AppendChild(this._element);

		this._register(Gesture.AddTArget(this._element));

		[EventType.CLICK, TouchEventType.TAp].forEAch(eventType => {
			this._register(AddDisposAbleListener(this._element, eventType, e => {
				if (!this.enAbled) {
					EventHelper.stop(e);
					return;
				}

				this._onDidClick.fire(e);
			}));
		});

		this._register(AddDisposAbleListener(this._element, EventType.KEY_DOWN, e => {
			const event = new StAndArdKeyboArdEvent(e);
			let eventHAndled = fAlse;
			if (this.enAbled && (event.equAls(KeyCode.Enter) || event.equAls(KeyCode.SpAce))) {
				this._onDidClick.fire(e);
				eventHAndled = true;
			} else if (event.equAls(KeyCode.EscApe)) {
				this._element.blur();
				eventHAndled = true;
			}

			if (eventHAndled) {
				EventHelper.stop(event, true);
			}
		}));

		this._register(AddDisposAbleListener(this._element, EventType.MOUSE_OVER, e => {
			if (!this._element.clAssList.contAins('disAbled')) {
				this.setHoverBAckground();
			}
		}));

		this._register(AddDisposAbleListener(this._element, EventType.MOUSE_OUT, e => {
			this.ApplyStyles(); // restore stAndArd styles
		}));

		// Also set hover bAckground when button is focused for feedbAck
		this.focusTrAcker = this._register(trAckFocus(this._element));
		this._register(this.focusTrAcker.onDidFocus(() => this.setHoverBAckground()));
		this._register(this.focusTrAcker.onDidBlur(() => this.ApplyStyles())); // restore stAndArd styles

		this.ApplyStyles();
	}

	privAte setHoverBAckground(): void {
		let hoverBAckground;
		if (this.options.secondAry) {
			hoverBAckground = this.buttonSecondAryHoverBAckground ? this.buttonSecondAryHoverBAckground.toString() : null;
		} else {
			hoverBAckground = this.buttonHoverBAckground ? this.buttonHoverBAckground.toString() : null;
		}
		if (hoverBAckground) {
			this._element.style.bAckgroundColor = hoverBAckground;
		}
	}

	style(styles: IButtonStyles): void {
		this.buttonForeground = styles.buttonForeground;
		this.buttonBAckground = styles.buttonBAckground;
		this.buttonHoverBAckground = styles.buttonHoverBAckground;
		this.buttonSecondAryForeground = styles.buttonSecondAryForeground;
		this.buttonSecondAryBAckground = styles.buttonSecondAryBAckground;
		this.buttonSecondAryHoverBAckground = styles.buttonSecondAryHoverBAckground;
		this.buttonBorder = styles.buttonBorder;

		this.ApplyStyles();
	}

	privAte ApplyStyles(): void {
		if (this._element) {
			let bAckground, foreground;
			if (this.options.secondAry) {
				foreground = this.buttonSecondAryForeground ? this.buttonSecondAryForeground.toString() : '';
				bAckground = this.buttonSecondAryBAckground ? this.buttonSecondAryBAckground.toString() : '';
			} else {
				foreground = this.buttonForeground ? this.buttonForeground.toString() : '';
				bAckground = this.buttonBAckground ? this.buttonBAckground.toString() : '';
			}

			const border = this.buttonBorder ? this.buttonBorder.toString() : '';

			this._element.style.color = foreground;
			this._element.style.bAckgroundColor = bAckground;

			this._element.style.borderWidth = border ? '1px' : '';
			this._element.style.borderStyle = border ? 'solid' : '';
			this._element.style.borderColor = border;
		}
	}

	get element(): HTMLElement {
		return this._element;
	}

	set lAbel(vAlue: string) {
		this._element.clAssList.Add('monAco-text-button');
		if (this.options.supportCodicons) {
			reset(this._element, ...renderCodicons(vAlue));
		} else {
			this._element.textContent = vAlue;
		}
		if (typeof this.options.title === 'string') {
			this._element.title = this.options.title;
		} else if (this.options.title) {
			this._element.title = vAlue;
		}
	}

	set icon(iconClAssNAme: string) {
		this._element.clAssList.Add(iconClAssNAme);
	}

	set enAbled(vAlue: booleAn) {
		if (vAlue) {
			this._element.clAssList.remove('disAbled');
			this._element.setAttribute('AriA-disAbled', String(fAlse));
			this._element.tAbIndex = 0;
		} else {
			this._element.clAssList.Add('disAbled');
			this._element.setAttribute('AriA-disAbled', String(true));
			removeTAbIndexAndUpdAteFocus(this._element);
		}
	}

	get enAbled() {
		return !this._element.clAssList.contAins('disAbled');
	}

	focus(): void {
		this._element.focus();
	}
}

export clAss ButtonGroup extends DisposAble {
	privAte _buttons: Button[] = [];

	constructor(contAiner: HTMLElement, count: number, options?: IButtonOptions) {
		super();

		this.creAte(contAiner, count, options);
	}

	get buttons(): Button[] {
		return this._buttons;
	}

	privAte creAte(contAiner: HTMLElement, count: number, options?: IButtonOptions): void {
		for (let index = 0; index < count; index++) {
			const button = this._register(new Button(contAiner, options));
			this._buttons.push(button);

			// Implement keyboArd Access in buttons if there Are multiple
			if (count > 1) {
				this._register(AddDisposAbleListener(button.element, EventType.KEY_DOWN, e => {
					const event = new StAndArdKeyboArdEvent(e);
					let eventHAndled = true;

					// Next / Previous Button
					let buttonIndexToFocus: number | undefined;
					if (event.equAls(KeyCode.LeftArrow)) {
						buttonIndexToFocus = index > 0 ? index - 1 : this._buttons.length - 1;
					} else if (event.equAls(KeyCode.RightArrow)) {
						buttonIndexToFocus = index === this._buttons.length - 1 ? 0 : index + 1;
					} else {
						eventHAndled = fAlse;
					}

					if (eventHAndled && typeof buttonIndexToFocus === 'number') {
						this._buttons[buttonIndexToFocus].focus();
						EventHelper.stop(e, true);
					}

				}));
			}
		}
	}
}
