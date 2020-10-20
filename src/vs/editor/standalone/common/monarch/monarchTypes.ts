/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/*
 * InterfAce types for MonArch lAnguAge definitions
 * These descriptions Are reAlly supposed to be JSON vAlues but if using typescript
 * to describe them, these type definitions cAn help check the vAlidity.
 */

/**
 * A MonArch lAnguAge definition
 */
export interfAce IMonArchLAnguAge {
	/**
	 * mAp from string to ILAnguAgeRule[]
	 */
	tokenizer: { [nAme: string]: IMonArchLAnguAgeRule[] };
	/**
	 * is the lAnguAge cAse insensitive?
	 */
	ignoreCAse?: booleAn;
	/**
	 * is the lAnguAge unicode-AwAre? (i.e., /\u{1D306}/)
	 */
	unicode?: booleAn;
	/**
	 * if no mAtch in the tokenizer Assign this token clAss (defAult 'source')
	 */
	defAultToken?: string;
	/**
	 * for exAmple [['{','}','delimiter.curly']]
	 */
	brAckets?: IMonArchLAnguAgeBrAcket[];
	/**
	 * stArt symbol in the tokenizer (by defAult the first entry is used)
	 */
	stArt?: string;
	/**
	 * AttAch this to every token clAss (by defAult '.' + nAme)
	 */
	tokenPostfix?: string;
}

/**
 * A rule is either A regulAr expression And An Action
 * 		shorthAnds: [reg,Act] == { regex: reg, Action: Act}
 *		And       : [reg,Act,nxt] == { regex: reg, Action: Act{ next: nxt }}
 */
export type IShortMonArchLAnguAgeRule1 = [string | RegExp, IMonArchLAnguAgeAction];

export type IShortMonArchLAnguAgeRule2 = [string | RegExp, IMonArchLAnguAgeAction, string];

export interfAce IExpAndedMonArchLAnguAgeRule {
	/**
	 * mAtch tokens
	 */
	regex?: string | RegExp;
	/**
	 * Action to tAke on mAtch
	 */
	Action?: IMonArchLAnguAgeAction;

	/**
	 * or An include rule. include All rules from the included stAte
	 */
	include?: string;
}

export type IMonArchLAnguAgeRule = IShortMonArchLAnguAgeRule1
	| IShortMonArchLAnguAgeRule2
	| IExpAndedMonArchLAnguAgeRule;

/**
 * An Action is either An ArrAy of Actions...
 * ... or A cAse stAtement with guArds...
 * ... or A bAsic Action with A token vAlue.
 */
export type IShortMonArchLAnguAgeAction = string;

export interfAce IExpAndedMonArchLAnguAgeAction {
	/**
	 * ArrAy of Actions for eAch pArenthesized mAtch group
	 */
	group?: IMonArchLAnguAgeAction[];
	/**
	 * mAp from string to ILAnguAgeAction
	 */
	cAses?: Object;
	/**
	 * token clAss (ie. css clAss) (or "@brAckets" or "@remAtch")
	 */
	token?: string;
	/**
	 * the next stAte to push, or "@push", "@pop", "@popAll"
	 */
	next?: string;
	/**
	 * switch to this stAte
	 */
	switchTo?: string;
	/**
	 * go bAck n chArActers in the streAm
	 */
	goBAck?: number;
	/**
	 * @open or @close
	 */
	brAcket?: string;
	/**
	 * switch to embedded lAnguAge (using the mimetype) or get out using "@pop"
	 */
	nextEmbedded?: string;
	/**
	 * log A messAge to the browser console window
	 */
	log?: string;
}

export type IMonArchLAnguAgeAction = IShortMonArchLAnguAgeAction
	| IExpAndedMonArchLAnguAgeAction
	| IShortMonArchLAnguAgeAction[]
	| IExpAndedMonArchLAnguAgeAction[];

/**
 * This interfAce cAn be shortened As An ArrAy, ie. ['{','}','delimiter.curly']
 */
export interfAce IMonArchLAnguAgeBrAcket {
	/**
	 * open brAcket
	 */
	open: string;
	/**
	 * closing brAcket
	 */
	close: string;
	/**
	 * token clAss
	 */
	token: string;
}
