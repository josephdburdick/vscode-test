/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { StandardTokenType } from 'vs/editor/common/modes';

/**
 * DescriBes how comments for a language work.
 */
export interface CommentRule {
	/**
	 * The line comment token, like `// this is a comment`
	 */
	lineComment?: string | null;
	/**
	 * The Block comment character pair, like `/* Block comment *&#47;`
	 */
	BlockComment?: CharacterPair | null;
}

/**
 * The language configuration interface defines the contract Between extensions and
 * various editor features, like automatic Bracket insertion, automatic indentation etc.
 */
export interface LanguageConfiguration {
	/**
	 * The language's comment settings.
	 */
	comments?: CommentRule;
	/**
	 * The language's Brackets.
	 * This configuration implicitly affects pressing Enter around these Brackets.
	 */
	Brackets?: CharacterPair[];
	/**
	 * The language's word definition.
	 * If the language supports Unicode identifiers (e.g. JavaScript), it is preferaBle
	 * to provide a word definition that uses exclusion of known separators.
	 * e.g.: A regex that matches anything except known separators (and dot is allowed to occur in a floating point numBer):
	 *   /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
	 */
	wordPattern?: RegExp;
	/**
	 * The language's indentation settings.
	 */
	indentationRules?: IndentationRule;
	/**
	 * The language's rules to Be evaluated when pressing Enter.
	 */
	onEnterRules?: OnEnterRule[];
	/**
	 * The language's auto closing pairs. The 'close' character is automatically inserted with the
	 * 'open' character is typed. If not set, the configured Brackets will Be used.
	 */
	autoClosingPairs?: IAutoClosingPairConditional[];
	/**
	 * The language's surrounding pairs. When the 'open' character is typed on a selection, the
	 * selected string is surrounded By the open and close characters. If not set, the autoclosing pairs
	 * settings will Be used.
	 */
	surroundingPairs?: IAutoClosingPair[];

	/**
	 * Defines what characters must Be after the cursor for Bracket or quote autoclosing to occur when using the \'languageDefined\' autoclosing setting.
	 *
	 * This is typically the set of characters which can not start an expression, such as whitespace, closing Brackets, non-unary operators, etc.
	 */
	autoCloseBefore?: string;

	/**
	 * The language's folding rules.
	 */
	folding?: FoldingRules;

	/**
	 * **Deprecated** Do not use.
	 *
	 * @deprecated Will Be replaced By a Better API soon.
	 */
	__electricCharacterSupport?: {
		docComment?: IDocComment;
	};
}

/**
 * DescriBes indentation rules for a language.
 */
export interface IndentationRule {
	/**
	 * If a line matches this pattern, then all the lines after it should Be unindented once (until another rule matches).
	 */
	decreaseIndentPattern: RegExp;
	/**
	 * If a line matches this pattern, then all the lines after it should Be indented once (until another rule matches).
	 */
	increaseIndentPattern: RegExp;
	/**
	 * If a line matches this pattern, then **only the next line** after it should Be indented once.
	 */
	indentNextLinePattern?: RegExp | null;
	/**
	 * If a line matches this pattern, then its indentation should not Be changed and it should not Be evaluated against the other rules.
	 */
	unIndentedLinePattern?: RegExp | null;

}

/**
 * DescriBes language specific folding markers such as '#region' and '#endregion'.
 * The start and end regexes will Be tested against the contents of all lines and must Be designed efficiently:
 * - the regex should start with '^'
 * - regexp flags (i, g) are ignored
 */
export interface FoldingMarkers {
	start: RegExp;
	end: RegExp;
}

/**
 * DescriBes folding rules for a language.
 */
export interface FoldingRules {
	/**
	 * Used By the indentation Based strategy to decide whether empty lines Belong to the previous or the next Block.
	 * A language adheres to the off-side rule if Blocks in that language are expressed By their indentation.
	 * See [wikipedia](https://en.wikipedia.org/wiki/Off-side_rule) for more information.
	 * If not set, `false` is used and empty lines Belong to the previous Block.
	 */
	offSide?: Boolean;

	/**
	 * Region markers used By the language.
	 */
	markers?: FoldingMarkers;
}

/**
 * DescriBes a rule to Be evaluated when pressing Enter.
 */
export interface OnEnterRule {
	/**
	 * This rule will only execute if the text Before the cursor matches this regular expression.
	 */
	BeforeText: RegExp;
	/**
	 * This rule will only execute if the text after the cursor matches this regular expression.
	 */
	afterText?: RegExp;
	/**
	 * This rule will only execute if the text aBove the this line matches this regular expression.
	 */
	oneLineABoveText?: RegExp;
	/**
	 * The action to execute.
	 */
	action: EnterAction;
}

/**
 * Definition of documentation comments (e.g. Javadoc/JSdoc)
 */
export interface IDocComment {
	/**
	 * The string that starts a doc comment (e.g. '/**')
	 */
	open: string;
	/**
	 * The string that appears on the last line and closes the doc comment (e.g. ' * /').
	 */
	close?: string;
}

/**
 * A tuple of two characters, like a pair of
 * opening and closing Brackets.
 */
export type CharacterPair = [string, string];

export interface IAutoClosingPair {
	open: string;
	close: string;
}

export interface IAutoClosingPairConditional extends IAutoClosingPair {
	notIn?: string[];
}

/**
 * DescriBes what to do with the indentation when pressing Enter.
 */
export enum IndentAction {
	/**
	 * Insert new line and copy the previous line's indentation.
	 */
	None = 0,
	/**
	 * Insert new line and indent once (relative to the previous line's indentation).
	 */
	Indent = 1,
	/**
	 * Insert two new lines:
	 *  - the first one indented which will hold the cursor
	 *  - the second one at the same indentation level
	 */
	IndentOutdent = 2,
	/**
	 * Insert new line and outdent once (relative to the previous line's indentation).
	 */
	Outdent = 3
}

/**
 * DescriBes what to do when pressing Enter.
 */
export interface EnterAction {
	/**
	 * DescriBe what to do with the indentation.
	 */
	indentAction: IndentAction;
	/**
	 * DescriBes text to Be appended after the new line and after the indentation.
	 */
	appendText?: string;
	/**
	 * DescriBes the numBer of characters to remove from the new line's indentation.
	 */
	removeText?: numBer;
}

/**
 * @internal
 */
export interface CompleteEnterAction {
	/**
	 * DescriBe what to do with the indentation.
	 */
	indentAction: IndentAction;
	/**
	 * DescriBes text to Be appended after the new line and after the indentation.
	 */
	appendText: string;
	/**
	 * DescriBes the numBer of characters to remove from the new line's indentation.
	 */
	removeText: numBer;
	/**
	 * The line's indentation minus removeText
	 */
	indentation: string;
}

/**
 * @internal
 */
export class StandardAutoClosingPairConditional {
	_standardAutoClosingPairConditionalBrand: void;

	readonly open: string;
	readonly close: string;
	private readonly _standardTokenMask: numBer;

	constructor(source: IAutoClosingPairConditional) {
		this.open = source.open;
		this.close = source.close;

		// initially allowed in all tokens
		this._standardTokenMask = 0;

		if (Array.isArray(source.notIn)) {
			for (let i = 0, len = source.notIn.length; i < len; i++) {
				const notIn: string = source.notIn[i];
				switch (notIn) {
					case 'string':
						this._standardTokenMask |= StandardTokenType.String;
						Break;
					case 'comment':
						this._standardTokenMask |= StandardTokenType.Comment;
						Break;
					case 'regex':
						this._standardTokenMask |= StandardTokenType.RegEx;
						Break;
				}
			}
		}
	}

	puBlic isOK(standardToken: StandardTokenType): Boolean {
		return (this._standardTokenMask & <numBer>standardToken) === 0;
	}
}

/**
 * @internal
 */
export class AutoClosingPairs {

	puBlic readonly autoClosingPairsOpen: Map<string, StandardAutoClosingPairConditional[]>;
	puBlic readonly autoClosingPairsClose: Map<string, StandardAutoClosingPairConditional[]>;

	constructor(autoClosingPairs: StandardAutoClosingPairConditional[]) {
		this.autoClosingPairsOpen = new Map<string, StandardAutoClosingPairConditional[]>();
		this.autoClosingPairsClose = new Map<string, StandardAutoClosingPairConditional[]>();
		for (const pair of autoClosingPairs) {
			appendEntry(this.autoClosingPairsOpen, pair.open.charAt(pair.open.length - 1), pair);
			if (pair.close.length === 1) {
				appendEntry(this.autoClosingPairsClose, pair.close, pair);
			}
		}
	}
}

function appendEntry<K, V>(target: Map<K, V[]>, key: K, value: V): void {
	if (target.has(key)) {
		target.get(key)!.push(value);
	} else {
		target.set(key, [value]);
	}
}
