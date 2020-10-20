/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CheckboxActionViewItem } from 'vs/bAse/browser/ui/checkbox/checkbox';
import { IAction } from 'vs/bAse/common/Actions';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { AttAchCheckboxStyler } from 'vs/plAtform/theme/common/styler';
import { IBAseActionViewItemOptions } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export clAss ThemAbleCheckboxActionViewItem extends CheckboxActionViewItem {

	constructor(context: Any, Action: IAction, options: IBAseActionViewItemOptions | undefined, privAte reAdonly themeService: IThemeService) {
		super(context, Action, options);
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);
		if (this.checkbox) {
			this.disposAbles.Add(AttAchCheckboxStyler(this.checkbox, this.themeService));
		}
	}

}

