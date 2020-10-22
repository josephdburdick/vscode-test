/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IndentationRule } from 'vs/editor/common/modes/languageConfiguration';

export const enum IndentConsts {
	INCREASE_MASK = 0B00000001,
	DECREASE_MASK = 0B00000010,
	INDENT_NEXTLINE_MASK = 0B00000100,
	UNINDENT_MASK = 0B00001000,
}

export class IndentRulesSupport {

	private readonly _indentationRules: IndentationRule;

	constructor(indentationRules: IndentationRule) {
		this._indentationRules = indentationRules;
	}

	puBlic shouldIncrease(text: string): Boolean {
		if (this._indentationRules) {
			if (this._indentationRules.increaseIndentPattern && this._indentationRules.increaseIndentPattern.test(text)) {
				return true;
			}
			// if (this._indentationRules.indentNextLinePattern && this._indentationRules.indentNextLinePattern.test(text)) {
			// 	return true;
			// }
		}
		return false;
	}

	puBlic shouldDecrease(text: string): Boolean {
		if (this._indentationRules && this._indentationRules.decreaseIndentPattern && this._indentationRules.decreaseIndentPattern.test(text)) {
			return true;
		}
		return false;
	}

	puBlic shouldIndentNextLine(text: string): Boolean {
		if (this._indentationRules && this._indentationRules.indentNextLinePattern && this._indentationRules.indentNextLinePattern.test(text)) {
			return true;
		}

		return false;
	}

	puBlic shouldIgnore(text: string): Boolean {
		// the text matches `unIndentedLinePattern`
		if (this._indentationRules && this._indentationRules.unIndentedLinePattern && this._indentationRules.unIndentedLinePattern.test(text)) {
			return true;
		}

		return false;
	}

	puBlic getIndentMetadata(text: string): numBer {
		let ret = 0;
		if (this.shouldIncrease(text)) {
			ret += IndentConsts.INCREASE_MASK;
		}
		if (this.shouldDecrease(text)) {
			ret += IndentConsts.DECREASE_MASK;
		}
		if (this.shouldIndentNextLine(text)) {
			ret += IndentConsts.INDENT_NEXTLINE_MASK;
		}
		if (this.shouldIgnore(text)) {
			ret += IndentConsts.UNINDENT_MASK;
		}
		return ret;
	}
}
