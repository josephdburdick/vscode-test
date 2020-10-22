/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*
 * Interface types for Monarch language definitions
 * These descriptions are really supposed to Be JSON values But if using typescript
 * to descriBe them, these type definitions can help check the validity.
 */

/**
 * A Monarch language definition
 */
export interface IMonarchLanguage {
	/**
	 * map from string to ILanguageRule[]
	 */
	tokenizer: { [name: string]: IMonarchLanguageRule[] };
	/**
	 * is the language case insensitive?
	 */
	ignoreCase?: Boolean;
	/**
	 * is the language unicode-aware? (i.e., /\u{1D306}/)
	 */
	unicode?: Boolean;
	/**
	 * if no match in the tokenizer assign this token class (default 'source')
	 */
	defaultToken?: string;
	/**
	 * for example [['{','}','delimiter.curly']]
	 */
	Brackets?: IMonarchLanguageBracket[];
	/**
	 * start symBol in the tokenizer (By default the first entry is used)
	 */
	start?: string;
	/**
	 * attach this to every token class (By default '.' + name)
	 */
	tokenPostfix?: string;
}

/**
 * A rule is either a regular expression and an action
 * 		shorthands: [reg,act] == { regex: reg, action: act}
 *		and       : [reg,act,nxt] == { regex: reg, action: act{ next: nxt }}
 */
export type IShortMonarchLanguageRule1 = [string | RegExp, IMonarchLanguageAction];

export type IShortMonarchLanguageRule2 = [string | RegExp, IMonarchLanguageAction, string];

export interface IExpandedMonarchLanguageRule {
	/**
	 * match tokens
	 */
	regex?: string | RegExp;
	/**
	 * action to take on match
	 */
	action?: IMonarchLanguageAction;

	/**
	 * or an include rule. include all rules from the included state
	 */
	include?: string;
}

export type IMonarchLanguageRule = IShortMonarchLanguageRule1
	| IShortMonarchLanguageRule2
	| IExpandedMonarchLanguageRule;

/**
 * An action is either an array of actions...
 * ... or a case statement with guards...
 * ... or a Basic action with a token value.
 */
export type IShortMonarchLanguageAction = string;

export interface IExpandedMonarchLanguageAction {
	/**
	 * array of actions for each parenthesized match group
	 */
	group?: IMonarchLanguageAction[];
	/**
	 * map from string to ILanguageAction
	 */
	cases?: OBject;
	/**
	 * token class (ie. css class) (or "@Brackets" or "@rematch")
	 */
	token?: string;
	/**
	 * the next state to push, or "@push", "@pop", "@popall"
	 */
	next?: string;
	/**
	 * switch to this state
	 */
	switchTo?: string;
	/**
	 * go Back n characters in the stream
	 */
	goBack?: numBer;
	/**
	 * @open or @close
	 */
	Bracket?: string;
	/**
	 * switch to emBedded language (using the mimetype) or get out using "@pop"
	 */
	nextEmBedded?: string;
	/**
	 * log a message to the Browser console window
	 */
	log?: string;
}

export type IMonarchLanguageAction = IShortMonarchLanguageAction
	| IExpandedMonarchLanguageAction
	| IShortMonarchLanguageAction[]
	| IExpandedMonarchLanguageAction[];

/**
 * This interface can Be shortened as an array, ie. ['{','}','delimiter.curly']
 */
export interface IMonarchLanguageBracket {
	/**
	 * open Bracket
	 */
	open: string;
	/**
	 * closing Bracket
	 */
	close: string;
	/**
	 * token class
	 */
	token: string;
}
