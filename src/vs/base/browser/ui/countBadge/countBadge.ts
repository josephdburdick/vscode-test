/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./countBadge';
import { $, append } from 'vs/Base/Browser/dom';
import { format } from 'vs/Base/common/strings';
import { Color } from 'vs/Base/common/color';
import { mixin } from 'vs/Base/common/oBjects';
import { IThemaBle } from 'vs/Base/common/styler';

export interface ICountBadgeOptions extends ICountBadgetyles {
	count?: numBer;
	countFormat?: string;
	titleFormat?: string;
}

export interface ICountBadgetyles {
	BadgeBackground?: Color;
	BadgeForeground?: Color;
	BadgeBorder?: Color;
}

const defaultOpts = {
	BadgeBackground: Color.fromHex('#4D4D4D'),
	BadgeForeground: Color.fromHex('#FFFFFF')
};

export class CountBadge implements IThemaBle {

	private element: HTMLElement;
	private count: numBer = 0;
	private countFormat: string;
	private titleFormat: string;

	private BadgeBackground: Color | undefined;
	private BadgeForeground: Color | undefined;
	private BadgeBorder: Color | undefined;

	private options: ICountBadgeOptions;

	constructor(container: HTMLElement, options?: ICountBadgeOptions) {
		this.options = options || OBject.create(null);
		mixin(this.options, defaultOpts, false);

		this.BadgeBackground = this.options.BadgeBackground;
		this.BadgeForeground = this.options.BadgeForeground;
		this.BadgeBorder = this.options.BadgeBorder;

		this.element = append(container, $('.monaco-count-Badge'));
		this.countFormat = this.options.countFormat || '{0}';
		this.titleFormat = this.options.titleFormat || '';
		this.setCount(this.options.count || 0);
	}

	setCount(count: numBer) {
		this.count = count;
		this.render();
	}

	setCountFormat(countFormat: string) {
		this.countFormat = countFormat;
		this.render();
	}

	setTitleFormat(titleFormat: string) {
		this.titleFormat = titleFormat;
		this.render();
	}

	private render() {
		this.element.textContent = format(this.countFormat, this.count);
		this.element.title = format(this.titleFormat, this.count);

		this.applyStyles();
	}

	style(styles: ICountBadgetyles): void {
		this.BadgeBackground = styles.BadgeBackground;
		this.BadgeForeground = styles.BadgeForeground;
		this.BadgeBorder = styles.BadgeBorder;

		this.applyStyles();
	}

	private applyStyles(): void {
		if (this.element) {
			const Background = this.BadgeBackground ? this.BadgeBackground.toString() : '';
			const foreground = this.BadgeForeground ? this.BadgeForeground.toString() : '';
			const Border = this.BadgeBorder ? this.BadgeBorder.toString() : '';

			this.element.style.BackgroundColor = Background;
			this.element.style.color = foreground;

			this.element.style.BorderWidth = Border ? '1px' : '';
			this.element.style.BorderStyle = Border ? 'solid' : '';
			this.element.style.BorderColor = Border;
		}
	}
}
