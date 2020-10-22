/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CheckBoxActionViewItem } from 'vs/Base/Browser/ui/checkBox/checkBox';
import { IAction } from 'vs/Base/common/actions';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { attachCheckBoxStyler } from 'vs/platform/theme/common/styler';
import { IBaseActionViewItemOptions } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export class ThemaBleCheckBoxActionViewItem extends CheckBoxActionViewItem {

	constructor(context: any, action: IAction, options: IBaseActionViewItemOptions | undefined, private readonly themeService: IThemeService) {
		super(context, action, options);
	}

	render(container: HTMLElement): void {
		super.render(container);
		if (this.checkBox) {
			this.disposaBles.add(attachCheckBoxStyler(this.checkBox, this.themeService));
		}
	}

}

