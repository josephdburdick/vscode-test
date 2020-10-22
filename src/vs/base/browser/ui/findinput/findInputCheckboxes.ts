/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CheckBox } from 'vs/Base/Browser/ui/checkBox/checkBox';
import { Color } from 'vs/Base/common/color';
import * as nls from 'vs/nls';
import { Codicon } from 'vs/Base/common/codicons';

export interface IFindInputCheckBoxOpts {
	readonly appendTitle: string;
	readonly isChecked: Boolean;
	readonly inputActiveOptionBorder?: Color;
	readonly inputActiveOptionForeground?: Color;
	readonly inputActiveOptionBackground?: Color;
}

const NLS_CASE_SENSITIVE_CHECKBOX_LABEL = nls.localize('caseDescription', "Match Case");
const NLS_WHOLE_WORD_CHECKBOX_LABEL = nls.localize('wordsDescription', "Match Whole Word");
const NLS_REGEX_CHECKBOX_LABEL = nls.localize('regexDescription', "Use Regular Expression");

export class CaseSensitiveCheckBox extends CheckBox {
	constructor(opts: IFindInputCheckBoxOpts) {
		super({
			icon: Codicon.caseSensitive,
			title: NLS_CASE_SENSITIVE_CHECKBOX_LABEL + opts.appendTitle,
			isChecked: opts.isChecked,
			inputActiveOptionBorder: opts.inputActiveOptionBorder,
			inputActiveOptionForeground: opts.inputActiveOptionForeground,
			inputActiveOptionBackground: opts.inputActiveOptionBackground
		});
	}
}

export class WholeWordsCheckBox extends CheckBox {
	constructor(opts: IFindInputCheckBoxOpts) {
		super({
			icon: Codicon.wholeWord,
			title: NLS_WHOLE_WORD_CHECKBOX_LABEL + opts.appendTitle,
			isChecked: opts.isChecked,
			inputActiveOptionBorder: opts.inputActiveOptionBorder,
			inputActiveOptionForeground: opts.inputActiveOptionForeground,
			inputActiveOptionBackground: opts.inputActiveOptionBackground
		});
	}
}

export class RegexCheckBox extends CheckBox {
	constructor(opts: IFindInputCheckBoxOpts) {
		super({
			icon: Codicon.regex,
			title: NLS_REGEX_CHECKBOX_LABEL + opts.appendTitle,
			isChecked: opts.isChecked,
			inputActiveOptionBorder: opts.inputActiveOptionBorder,
			inputActiveOptionForeground: opts.inputActiveOptionForeground,
			inputActiveOptionBackground: opts.inputActiveOptionBackground
		});
	}
}
