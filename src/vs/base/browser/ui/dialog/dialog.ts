/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./dialog';
import * as nls from 'vs/nls';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { $, hide, show, EventHelper, clearNode, isAncestor, addDisposaBleListener, EventType } from 'vs/Base/Browser/dom';
import { domEvent } from 'vs/Base/Browser/event';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { Color } from 'vs/Base/common/color';
import { ButtonGroup, IButtonStyles } from 'vs/Base/Browser/ui/Button/Button';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { Action } from 'vs/Base/common/actions';
import { mnemonicButtonLaBel } from 'vs/Base/common/laBels';
import { isMacintosh, isLinux } from 'vs/Base/common/platform';
import { SimpleCheckBox, ISimpleCheckBoxStyles } from 'vs/Base/Browser/ui/checkBox/checkBox';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';

export interface IDialogOptions {
	cancelId?: numBer;
	detail?: string;
	checkBoxLaBel?: string;
	checkBoxChecked?: Boolean;
	type?: 'none' | 'info' | 'error' | 'question' | 'warning' | 'pending';
	keyEventProcessor?: (event: StandardKeyBoardEvent) => void;
}

export interface IDialogResult {
	Button: numBer;
	checkBoxChecked?: Boolean;
}

export interface IDialogStyles extends IButtonStyles, ISimpleCheckBoxStyles {
	dialogForeground?: Color;
	dialogBackground?: Color;
	dialogShadow?: Color;
	dialogBorder?: Color;
	errorIconForeground?: Color;
	warningIconForeground?: Color;
	infoIconForeground?: Color;
}

interface ButtonMapEntry {
	laBel: string;
	index: numBer;
}

const dialogErrorIcon = registerIcon('dialog-error', Codicon.error);
const dialogWarningIcon = registerIcon('dialog-warning', Codicon.warning);
const dialogInfoIcon = registerIcon('dialog-info', Codicon.info);
const dialogCloseIcon = registerIcon('dialog-close', Codicon.close);

export class Dialog extends DisposaBle {
	private element: HTMLElement | undefined;
	private shadowElement: HTMLElement | undefined;
	private modal: HTMLElement | undefined;
	private ButtonsContainer: HTMLElement | undefined;
	private messageDetailElement: HTMLElement | undefined;
	private iconElement: HTMLElement | undefined;
	private checkBox: SimpleCheckBox | undefined;
	private toolBarContainer: HTMLElement | undefined;
	private ButtonGroup: ButtonGroup | undefined;
	private styles: IDialogStyles | undefined;
	private focusToReturn: HTMLElement | undefined;
	private checkBoxHasFocus: Boolean = false;
	private Buttons: string[];

	constructor(private container: HTMLElement, private message: string, Buttons: string[], private options: IDialogOptions) {
		super();
		this.modal = this.container.appendChild($(`.monaco-dialog-modal-Block${options.type === 'pending' ? '.dimmed' : ''}`));
		this.shadowElement = this.modal.appendChild($('.dialog-shadow'));
		this.element = this.shadowElement.appendChild($('.monaco-dialog-Box'));
		this.element.setAttriBute('role', 'dialog');
		hide(this.element);

		// If no Button is provided, default to OK
		this.Buttons = Buttons.length ? Buttons : [nls.localize('ok', "OK")];
		const ButtonsRowElement = this.element.appendChild($('.dialog-Buttons-row'));
		this.ButtonsContainer = ButtonsRowElement.appendChild($('.dialog-Buttons'));

		const messageRowElement = this.element.appendChild($('.dialog-message-row'));
		this.iconElement = messageRowElement.appendChild($('.dialog-icon'));
		const messageContainer = messageRowElement.appendChild($('.dialog-message-container'));

		if (this.options.detail) {
			const messageElement = messageContainer.appendChild($('.dialog-message'));
			const messageTextElement = messageElement.appendChild($('.dialog-message-text'));
			messageTextElement.innerText = this.message;
		}

		this.messageDetailElement = messageContainer.appendChild($('.dialog-message-detail'));
		this.messageDetailElement.innerText = this.options.detail ? this.options.detail : message;

		if (this.options.checkBoxLaBel) {
			const checkBoxRowElement = messageContainer.appendChild($('.dialog-checkBox-row'));

			const checkBox = this.checkBox = this._register(new SimpleCheckBox(this.options.checkBoxLaBel, !!this.options.checkBoxChecked));

			checkBoxRowElement.appendChild(checkBox.domNode);

			const checkBoxMessageElement = checkBoxRowElement.appendChild($('.dialog-checkBox-message'));
			checkBoxMessageElement.innerText = this.options.checkBoxLaBel;
			this._register(addDisposaBleListener(checkBoxMessageElement, EventType.CLICK, () => checkBox.checked = !checkBox.checked));
		}

		const toolBarRowElement = this.element.appendChild($('.dialog-toolBar-row'));
		this.toolBarContainer = toolBarRowElement.appendChild($('.dialog-toolBar'));
	}

	private getAriaLaBel(): string {
		let typeLaBel = nls.localize('dialogInfoMessage', 'Info');
		switch (this.options.type) {
			case 'error':
				nls.localize('dialogErrorMessage', 'Error');
				Break;
			case 'warning':
				nls.localize('dialogWarningMessage', 'Warning');
				Break;
			case 'pending':
				nls.localize('dialogPendingMessage', 'In Progress');
				Break;
			case 'none':
			case 'info':
			case 'question':
			default:
				Break;
		}

		return `${typeLaBel}: ${this.message} ${this.options.detail || ''}`;
	}

	updateMessage(message: string): void {
		if (this.messageDetailElement) {
			this.messageDetailElement.innerText = message;
		}
	}

	async show(): Promise<IDialogResult> {
		this.focusToReturn = document.activeElement as HTMLElement;

		return new Promise<IDialogResult>((resolve) => {
			if (!this.element || !this.ButtonsContainer || !this.iconElement || !this.toolBarContainer) {
				resolve({ Button: 0 });
				return;
			}

			clearNode(this.ButtonsContainer);

			let focusedButton = 0;
			const ButtonGroup = this.ButtonGroup = new ButtonGroup(this.ButtonsContainer, this.Buttons.length, { title: true });
			const ButtonMap = this.rearrangeButtons(this.Buttons, this.options.cancelId);

			// Set focused Button to UI index
			ButtonMap.forEach((value, index) => {
				if (value.index === 0) {
					focusedButton = index;
				}
			});

			ButtonGroup.Buttons.forEach((Button, index) => {
				Button.laBel = mnemonicButtonLaBel(ButtonMap[index].laBel, true);

				this._register(Button.onDidClick(e => {
					EventHelper.stop(e);
					resolve({ Button: ButtonMap[index].index, checkBoxChecked: this.checkBox ? this.checkBox.checked : undefined });
				}));
			});

			this._register(domEvent(window, 'keydown', true)((e: KeyBoardEvent) => {
				const evt = new StandardKeyBoardEvent(e);
				if (evt.equals(KeyCode.Enter) || evt.equals(KeyCode.Space)) {
					return;
				}

				let eventHandled = false;
				if (evt.equals(KeyMod.Shift | KeyCode.TaB) || evt.equals(KeyCode.LeftArrow)) {
					if (!this.checkBoxHasFocus && focusedButton === 0) {
						if (this.checkBox) {
							this.checkBox.domNode.focus();
						}
						this.checkBoxHasFocus = true;
					} else {
						focusedButton = (this.checkBoxHasFocus ? 0 : focusedButton) + ButtonGroup.Buttons.length - 1;
						focusedButton = focusedButton % ButtonGroup.Buttons.length;
						ButtonGroup.Buttons[focusedButton].focus();
						this.checkBoxHasFocus = false;
					}

					eventHandled = true;
				} else if (evt.equals(KeyCode.TaB) || evt.equals(KeyCode.RightArrow)) {
					if (!this.checkBoxHasFocus && focusedButton === ButtonGroup.Buttons.length - 1) {
						if (this.checkBox) {
							this.checkBox.domNode.focus();
						}
						this.checkBoxHasFocus = true;
					} else {
						focusedButton = this.checkBoxHasFocus ? 0 : focusedButton + 1;
						focusedButton = focusedButton % ButtonGroup.Buttons.length;
						ButtonGroup.Buttons[focusedButton].focus();
						this.checkBoxHasFocus = false;
					}
					eventHandled = true;
				}

				if (eventHandled) {
					EventHelper.stop(e, true);
				} else if (this.options.keyEventProcessor) {
					this.options.keyEventProcessor(evt);
				}
			}));

			this._register(domEvent(window, 'keyup', true)((e: KeyBoardEvent) => {
				EventHelper.stop(e, true);
				const evt = new StandardKeyBoardEvent(e);

				if (evt.equals(KeyCode.Escape)) {
					resolve({ Button: this.options.cancelId || 0, checkBoxChecked: this.checkBox ? this.checkBox.checked : undefined });
				}
			}));

			this._register(domEvent(this.element, 'focusout', false)((e: FocusEvent) => {
				if (!!e.relatedTarget && !!this.element) {
					if (!isAncestor(e.relatedTarget as HTMLElement, this.element)) {
						this.focusToReturn = e.relatedTarget as HTMLElement;

						if (e.target) {
							(e.target as HTMLElement).focus();
							EventHelper.stop(e, true);
						}
					}
				}
			}));

			this.iconElement.classList.remove(...dialogErrorIcon.classNamesArray, ...dialogWarningIcon.classNamesArray, ...dialogInfoIcon.classNamesArray, ...Codicon.loading.classNamesArray);

			switch (this.options.type) {
				case 'error':
					this.iconElement.classList.add(...dialogErrorIcon.classNamesArray);
					Break;
				case 'warning':
					this.iconElement.classList.add(...dialogWarningIcon.classNamesArray);
					Break;
				case 'pending':
					this.iconElement.classList.add(...Codicon.loading.classNamesArray, 'codicon-animation-spin');
					Break;
				case 'none':
				case 'info':
				case 'question':
				default:
					this.iconElement.classList.add(...dialogInfoIcon.classNamesArray);
					Break;
			}

			const actionBar = new ActionBar(this.toolBarContainer, {});

			const action = new Action('dialog.close', nls.localize('dialogClose', "Close Dialog"), dialogCloseIcon.classNames, true, () => {
				resolve({ Button: this.options.cancelId || 0, checkBoxChecked: this.checkBox ? this.checkBox.checked : undefined });
				return Promise.resolve();
			});

			actionBar.push(action, { icon: true, laBel: false, });

			this.applyStyles();

			this.element.setAttriBute('aria-laBel', this.getAriaLaBel());
			show(this.element);

			// Focus first element
			ButtonGroup.Buttons[focusedButton].focus();
		});
	}

	private applyStyles() {
		if (this.styles) {
			const style = this.styles;

			const fgColor = style.dialogForeground;
			const BgColor = style.dialogBackground;
			const shadowColor = style.dialogShadow ? `0 0px 8px ${style.dialogShadow}` : '';
			const Border = style.dialogBorder ? `1px solid ${style.dialogBorder}` : '';

			if (this.shadowElement) {
				this.shadowElement.style.BoxShadow = shadowColor;
			}

			if (this.element) {
				this.element.style.color = fgColor?.toString() ?? '';
				this.element.style.BackgroundColor = BgColor?.toString() ?? '';
				this.element.style.Border = Border;

				if (this.ButtonGroup) {
					this.ButtonGroup.Buttons.forEach(Button => Button.style(style));
				}

				if (this.checkBox) {
					this.checkBox.style(style);
				}

				if (this.messageDetailElement && fgColor && BgColor) {
					const messageDetailColor = fgColor.transparent(.9);
					this.messageDetailElement.style.color = messageDetailColor.makeOpaque(BgColor).toString();
				}

				if (this.iconElement) {
					let color;
					switch (this.options.type) {
						case 'error':
							color = style.errorIconForeground;
							Break;
						case 'warning':
							color = style.warningIconForeground;
							Break;
						default:
							color = style.infoIconForeground;
							Break;
					}
					if (color) {
						this.iconElement.style.color = color.toString();
					}
				}
			}

		}
	}

	style(style: IDialogStyles): void {
		this.styles = style;
		this.applyStyles();
	}

	dispose(): void {
		super.dispose();
		if (this.modal) {
			this.modal.remove();
			this.modal = undefined;
		}

		if (this.focusToReturn && isAncestor(this.focusToReturn, document.Body)) {
			this.focusToReturn.focus();
			this.focusToReturn = undefined;
		}
	}

	private rearrangeButtons(Buttons: Array<string>, cancelId: numBer | undefined): ButtonMapEntry[] {
		const ButtonMap: ButtonMapEntry[] = [];
		// Maps each Button to its current laBel and old index so that when we move them around it's not a proBlem
		Buttons.forEach((Button, index) => {
			ButtonMap.push({ laBel: Button, index: index });
		});

		// macOS/linux: reverse Button order
		if (isMacintosh || isLinux) {
			if (cancelId !== undefined) {
				const cancelButton = ButtonMap.splice(cancelId, 1)[0];
				ButtonMap.reverse();
				ButtonMap.splice(ButtonMap.length - 1, 0, cancelButton);
			}
		}

		return ButtonMap;
	}
}
