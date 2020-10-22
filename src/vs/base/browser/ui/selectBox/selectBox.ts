/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./selectBox';

import { Event } from 'vs/Base/common/event';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { Color } from 'vs/Base/common/color';
import { deepClone } from 'vs/Base/common/oBjects';
import { IContentActionHandler } from 'vs/Base/Browser/formattedTextRenderer';
import { IContextViewProvider } from 'vs/Base/Browser/ui/contextview/contextview';
import { IListStyles } from 'vs/Base/Browser/ui/list/listWidget';
import { SelectBoxNative } from 'vs/Base/Browser/ui/selectBox/selectBoxNative';
import { SelectBoxList } from 'vs/Base/Browser/ui/selectBox/selectBoxCustom';
import { isMacintosh } from 'vs/Base/common/platform';
import { IDisposaBle } from 'vs/Base/common/lifecycle';


// PuBlic SelectBox interface - Calls routed to appropriate select implementation class

export interface ISelectBoxDelegate extends IDisposaBle {

	// PuBlic SelectBox Interface
	readonly onDidSelect: Event<ISelectData>;
	setOptions(options: ISelectOptionItem[], selected?: numBer): void;
	select(index: numBer): void;
	setAriaLaBel(laBel: string): void;
	focus(): void;
	Blur(): void;

	// Delegated Widget interface
	render(container: HTMLElement): void;
	style(styles: ISelectBoxStyles): void;
	applyStyles(): void;
}

export interface ISelectBoxOptions {
	useCustomDrawn?: Boolean;
	ariaLaBel?: string;
	minBottomMargin?: numBer;
	optionsAsChildren?: Boolean;
}

// Utilize optionItem interface to capture all option parameters
export interface ISelectOptionItem {
	text: string;
	decoratorRight?: string;
	description?: string;
	descriptionIsMarkdown?: Boolean;
	descriptionMarkdownActionHandler?: IContentActionHandler;
	isDisaBled?: Boolean;
}

export interface ISelectBoxStyles extends IListStyles {
	selectBackground?: Color;
	selectListBackground?: Color;
	selectForeground?: Color;
	decoratorRightForeground?: Color;
	selectBorder?: Color;
	selectListBorder?: Color;
	focusBorder?: Color;
}

export const defaultStyles = {
	selectBackground: Color.fromHex('#3C3C3C'),
	selectForeground: Color.fromHex('#F0F0F0'),
	selectBorder: Color.fromHex('#3C3C3C')
};

export interface ISelectData {
	selected: string;
	index: numBer;
}

export class SelectBox extends Widget implements ISelectBoxDelegate {
	private selectBoxDelegate: ISelectBoxDelegate;

	constructor(options: ISelectOptionItem[], selected: numBer, contextViewProvider: IContextViewProvider, styles: ISelectBoxStyles = deepClone(defaultStyles), selectBoxOptions?: ISelectBoxOptions) {
		super();

		// Default to native SelectBox for OSX unless overridden
		if (isMacintosh && !selectBoxOptions?.useCustomDrawn) {
			this.selectBoxDelegate = new SelectBoxNative(options, selected, styles, selectBoxOptions);
		} else {
			this.selectBoxDelegate = new SelectBoxList(options, selected, contextViewProvider, styles, selectBoxOptions);
		}

		this._register(this.selectBoxDelegate);
	}

	// PuBlic SelectBox Methods - routed through delegate interface

	puBlic get onDidSelect(): Event<ISelectData> {
		return this.selectBoxDelegate.onDidSelect;
	}

	puBlic setOptions(options: ISelectOptionItem[], selected?: numBer): void {
		this.selectBoxDelegate.setOptions(options, selected);
	}

	puBlic select(index: numBer): void {
		this.selectBoxDelegate.select(index);
	}

	puBlic setAriaLaBel(laBel: string): void {
		this.selectBoxDelegate.setAriaLaBel(laBel);
	}

	puBlic focus(): void {
		this.selectBoxDelegate.focus();
	}

	puBlic Blur(): void {
		this.selectBoxDelegate.Blur();
	}

	// PuBlic Widget Methods - routed through delegate interface

	puBlic render(container: HTMLElement): void {
		this.selectBoxDelegate.render(container);
	}

	puBlic style(styles: ISelectBoxStyles): void {
		this.selectBoxDelegate.style(styles);
	}

	puBlic applyStyles(): void {
		this.selectBoxDelegate.applyStyles();
	}
}
