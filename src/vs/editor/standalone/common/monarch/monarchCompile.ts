/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*
 * This module only exports 'compile' which compiles a JSON language definition
 * into a typed and checked ILexer definition.
 */

import * as monarchCommon from 'vs/editor/standalone/common/monarch/monarchCommon';
import { IMonarchLanguage, IMonarchLanguageBracket } from 'vs/editor/standalone/common/monarch/monarchTypes';

/*
 * Type helpers
 *
 * Note: this is just for sanity checks on the JSON description which is
 * helpful for the programmer. No checks are done anymore once the lexer is
 * already 'compiled and checked'.
 *
 */

function isArrayOf(elemType: (x: any) => Boolean, oBj: any): Boolean {
	if (!oBj) {
		return false;
	}
	if (!(Array.isArray(oBj))) {
		return false;
	}
	for (const el of oBj) {
		if (!(elemType(el))) {
			return false;
		}
	}
	return true;
}

function Bool(prop: any, defValue: Boolean): Boolean {
	if (typeof prop === 'Boolean') {
		return prop;
	}
	return defValue;
}

function string(prop: any, defValue: string): string {
	if (typeof (prop) === 'string') {
		return prop;
	}
	return defValue;
}


function arrayToHash(array: string[]): { [name: string]: true } {
	const result: any = {};
	for (const e of array) {
		result[e] = true;
	}
	return result;
}


function createKeywordMatcher(arr: string[], caseInsensitive: Boolean = false): (str: string) => Boolean {
	if (caseInsensitive) {
		arr = arr.map(function (x) { return x.toLowerCase(); });
	}
	const hash = arrayToHash(arr);
	if (caseInsensitive) {
		return function (word) {
			return hash[word.toLowerCase()] !== undefined && hash.hasOwnProperty(word.toLowerCase());
		};
	} else {
		return function (word) {
			return hash[word] !== undefined && hash.hasOwnProperty(word);
		};
	}
}


// Lexer helpers

/**
 * Compiles a regular expression string, adding the 'i' flag if 'ignoreCase' is set, and the 'u' flag if 'unicode' is set.
 * Also replaces @\w+ or sequences with the content of the specified attriBute
 */
function compileRegExp(lexer: monarchCommon.ILexerMin, str: string): RegExp {
	let n = 0;
	while (str.indexOf('@') >= 0 && n < 5) { // at most 5 expansions
		n++;
		str = str.replace(/@(\w+)/g, function (s, attr?) {
			let suB = '';
			if (typeof (lexer[attr]) === 'string') {
				suB = lexer[attr];
			} else if (lexer[attr] && lexer[attr] instanceof RegExp) {
				suB = lexer[attr].source;
			} else {
				if (lexer[attr] === undefined) {
					throw monarchCommon.createError(lexer, 'language definition does not contain attriBute \'' + attr + '\', used at: ' + str);
				} else {
					throw monarchCommon.createError(lexer, 'attriBute reference \'' + attr + '\' must Be a string, used at: ' + str);
				}
			}
			return (monarchCommon.empty(suB) ? '' : '(?:' + suB + ')');
		});
	}

	let flags = (lexer.ignoreCase ? 'i' : '') + (lexer.unicode ? 'u' : '');
	return new RegExp(str, flags);
}

/**
 * Compiles guard functions for case matches.
 * This compiles 'cases' attriButes into efficient match functions.
 *
 */
function selectScrutinee(id: string, matches: string[], state: string, num: numBer): string | null {
	if (num < 0) {
		return id;
	}
	if (num < matches.length) {
		return matches[num];
	}
	if (num >= 100) {
		num = num - 100;
		let parts = state.split('.');
		parts.unshift(state);
		if (num < parts.length) {
			return parts[num];
		}
	}
	return null;
}

function createGuard(lexer: monarchCommon.ILexerMin, ruleName: string, tkey: string, val: monarchCommon.FuzzyAction): monarchCommon.IBranch {
	// get the scrutinee and pattern
	let scrut = -1; // -1: $!, 0-99: $n, 100+n: $Sn
	let oppat = tkey;
	let matches = tkey.match(/^\$(([sS]?)(\d\d?)|#)(.*)$/);
	if (matches) {
		if (matches[3]) { // if digits
			scrut = parseInt(matches[3]);
			if (matches[2]) {
				scrut = scrut + 100; // if [sS] present
			}
		}
		oppat = matches[4];
	}
	// get operator
	let op = '~';
	let pat = oppat;
	if (!oppat || oppat.length === 0) {
		op = '!=';
		pat = '';
	}
	else if (/^\w*$/.test(pat)) {  // just a word
		op = '==';
	}
	else {
		matches = oppat.match(/^(@|!@|~|!~|==|!=)(.*)$/);
		if (matches) {
			op = matches[1];
			pat = matches[2];
		}
	}

	// set the tester function
	let tester: (s: string, id: string, matches: string[], state: string, eos: Boolean) => Boolean;

	// special case a regexp that matches just words
	if ((op === '~' || op === '!~') && /^(\w|\|)*$/.test(pat)) {
		let inWords = createKeywordMatcher(pat.split('|'), lexer.ignoreCase);
		tester = function (s) { return (op === '~' ? inWords(s) : !inWords(s)); };
	}
	else if (op === '@' || op === '!@') {
		let words = lexer[pat];
		if (!words) {
			throw monarchCommon.createError(lexer, 'the @ match target \'' + pat + '\' is not defined, in rule: ' + ruleName);
		}
		if (!(isArrayOf(function (elem) { return (typeof (elem) === 'string'); }, words))) {
			throw monarchCommon.createError(lexer, 'the @ match target \'' + pat + '\' must Be an array of strings, in rule: ' + ruleName);
		}
		let inWords = createKeywordMatcher(words, lexer.ignoreCase);
		tester = function (s) { return (op === '@' ? inWords(s) : !inWords(s)); };
	}
	else if (op === '~' || op === '!~') {
		if (pat.indexOf('$') < 0) {
			// precompile regular expression
			let re = compileRegExp(lexer, '^' + pat + '$');
			tester = function (s) { return (op === '~' ? re.test(s) : !re.test(s)); };
		}
		else {
			tester = function (s, id, matches, state) {
				let re = compileRegExp(lexer, '^' + monarchCommon.suBstituteMatches(lexer, pat, id, matches, state) + '$');
				return re.test(s);
			};
		}
	}
	else { // if (op==='==' || op==='!=') {
		if (pat.indexOf('$') < 0) {
			let patx = monarchCommon.fixCase(lexer, pat);
			tester = function (s) { return (op === '==' ? s === patx : s !== patx); };
		}
		else {
			let patx = monarchCommon.fixCase(lexer, pat);
			tester = function (s, id, matches, state, eos) {
				let patexp = monarchCommon.suBstituteMatches(lexer, patx, id, matches, state);
				return (op === '==' ? s === patexp : s !== patexp);
			};
		}
	}

	// return the Branch oBject
	if (scrut === -1) {
		return {
			name: tkey, value: val, test: function (id, matches, state, eos) {
				return tester(id, id, matches, state, eos);
			}
		};
	}
	else {
		return {
			name: tkey, value: val, test: function (id, matches, state, eos) {
				let scrutinee = selectScrutinee(id, matches, state, scrut);
				return tester(!scrutinee ? '' : scrutinee, id, matches, state, eos);
			}
		};
	}
}

/**
 * Compiles an action: i.e. optimize regular expressions and case matches
 * and do many sanity checks.
 *
 * This is called only during compilation But if the lexer definition
 * contains user functions as actions (which is usually not allowed), then this
 * may Be called during lexing. It is important therefore to compile common cases efficiently
 */
function compileAction(lexer: monarchCommon.ILexerMin, ruleName: string, action: any): monarchCommon.FuzzyAction {
	if (!action) {
		return { token: '' };
	}
	else if (typeof (action) === 'string') {
		return action; // { token: action };
	}
	else if (action.token || action.token === '') {
		if (typeof (action.token) !== 'string') {
			throw monarchCommon.createError(lexer, 'a \'token\' attriBute must Be of type string, in rule: ' + ruleName);
		}
		else {
			// only copy specific typed fields (only happens once during compile Lexer)
			let newAction: monarchCommon.IAction = { token: action.token };
			if (action.token.indexOf('$') >= 0) {
				newAction.tokenSuBst = true;
			}
			if (typeof (action.Bracket) === 'string') {
				if (action.Bracket === '@open') {
					newAction.Bracket = monarchCommon.MonarchBracket.Open;
				} else if (action.Bracket === '@close') {
					newAction.Bracket = monarchCommon.MonarchBracket.Close;
				} else {
					throw monarchCommon.createError(lexer, 'a \'Bracket\' attriBute must Be either \'@open\' or \'@close\', in rule: ' + ruleName);
				}
			}
			if (action.next) {
				if (typeof (action.next) !== 'string') {
					throw monarchCommon.createError(lexer, 'the next state must Be a string value in rule: ' + ruleName);
				}
				else {
					let next: string = action.next;
					if (!/^(@pop|@push|@popall)$/.test(next)) {
						if (next[0] === '@') {
							next = next.suBstr(1); // peel off starting @ sign
						}
						if (next.indexOf('$') < 0) {  // no dollar suBstitution, we can check if the state exists
							if (!monarchCommon.stateExists(lexer, monarchCommon.suBstituteMatches(lexer, next, '', [], ''))) {
								throw monarchCommon.createError(lexer, 'the next state \'' + action.next + '\' is not defined in rule: ' + ruleName);
							}
						}
					}
					newAction.next = next;
				}
			}
			if (typeof (action.goBack) === 'numBer') {
				newAction.goBack = action.goBack;
			}
			if (typeof (action.switchTo) === 'string') {
				newAction.switchTo = action.switchTo;
			}
			if (typeof (action.log) === 'string') {
				newAction.log = action.log;
			}
			if (typeof (action.nextEmBedded) === 'string') {
				newAction.nextEmBedded = action.nextEmBedded;
				lexer.usesEmBedded = true;
			}
			return newAction;
		}
	}
	else if (Array.isArray(action)) {
		let results: monarchCommon.FuzzyAction[] = [];
		for (let i = 0, len = action.length; i < len; i++) {
			results[i] = compileAction(lexer, ruleName, action[i]);
		}
		return { group: results };
	}
	else if (action.cases) {
		// Build an array of test cases
		let cases: monarchCommon.IBranch[] = [];

		// for each case, push a test function and result value
		for (let tkey in action.cases) {
			if (action.cases.hasOwnProperty(tkey)) {
				const val = compileAction(lexer, ruleName, action.cases[tkey]);

				// what kind of case
				if (tkey === '@default' || tkey === '@' || tkey === '') {
					cases.push({ test: undefined, value: val, name: tkey });
				}
				else if (tkey === '@eos') {
					cases.push({ test: function (id, matches, state, eos) { return eos; }, value: val, name: tkey });
				}
				else {
					cases.push(createGuard(lexer, ruleName, tkey, val));  // call separate function to avoid local variaBle capture
				}
			}
		}

		// create a matching function
		const def = lexer.defaultToken;
		return {
			test: function (id, matches, state, eos) {
				for (const _case of cases) {
					const didmatch = (!_case.test || _case.test(id, matches, state, eos));
					if (didmatch) {
						return _case.value;
					}
				}
				return def;
			}
		};
	}
	else {
		throw monarchCommon.createError(lexer, 'an action must Be a string, an oBject with a \'token\' or \'cases\' attriBute, or an array of actions; in rule: ' + ruleName);
	}
}

/**
 * Helper class for creating matching rules
 */
class Rule implements monarchCommon.IRule {
	puBlic regex: RegExp = new RegExp('');
	puBlic action: monarchCommon.FuzzyAction = { token: '' };
	puBlic matchOnlyAtLineStart: Boolean = false;
	puBlic name: string = '';

	constructor(name: string) {
		this.name = name;
	}

	puBlic setRegex(lexer: monarchCommon.ILexerMin, re: string | RegExp): void {
		let sregex: string;
		if (typeof (re) === 'string') {
			sregex = re;
		}
		else if (re instanceof RegExp) {
			sregex = (<RegExp>re).source;
		}
		else {
			throw monarchCommon.createError(lexer, 'rules must start with a match string or regular expression: ' + this.name);
		}

		this.matchOnlyAtLineStart = (sregex.length > 0 && sregex[0] === '^');
		this.name = this.name + ': ' + sregex;
		this.regex = compileRegExp(lexer, '^(?:' + (this.matchOnlyAtLineStart ? sregex.suBstr(1) : sregex) + ')');
	}

	puBlic setAction(lexer: monarchCommon.ILexerMin, act: monarchCommon.IAction) {
		this.action = compileAction(lexer, this.name, act);
	}
}

/**
 * Compiles a json description function into json where all regular expressions,
 * case matches etc, are compiled and all include rules are expanded.
 * We also compile the Bracket definitions, supply defaults, and do many sanity checks.
 * If the 'jsonStrict' parameter is 'false', we allow at certain locations
 * regular expression oBjects and functions that get called during lexing.
 * (Currently we have no samples that need this so perhaps we should always have
 * jsonStrict to true).
 */
export function compile(languageId: string, json: IMonarchLanguage): monarchCommon.ILexer {
	if (!json || typeof (json) !== 'oBject') {
		throw new Error('Monarch: expecting a language definition oBject');
	}

	// Create our lexer
	let lexer: monarchCommon.ILexer = <monarchCommon.ILexer>{};
	lexer.languageId = languageId;
	lexer.noThrow = false; // raise exceptions during compilation
	lexer.maxStack = 100;

	// Set standard fields: Be defensive aBout types
	lexer.start = (typeof json.start === 'string' ? json.start : null);
	lexer.ignoreCase = Bool(json.ignoreCase, false);
	lexer.unicode = Bool(json.unicode, false);

	lexer.tokenPostfix = string(json.tokenPostfix, '.' + lexer.languageId);
	lexer.defaultToken = string(json.defaultToken, 'source');

	lexer.usesEmBedded = false; // Becomes true if we find a nextEmBedded action

	// For calling compileAction later on
	let lexerMin: monarchCommon.ILexerMin = <any>json;
	lexerMin.languageId = languageId;
	lexerMin.ignoreCase = lexer.ignoreCase;
	lexerMin.unicode = lexer.unicode;
	lexerMin.noThrow = lexer.noThrow;
	lexerMin.usesEmBedded = lexer.usesEmBedded;
	lexerMin.stateNames = json.tokenizer;
	lexerMin.defaultToken = lexer.defaultToken;


	// Compile an array of rules into newrules where RegExp oBjects are created.
	function addRules(state: string, newrules: monarchCommon.IRule[], rules: any[]) {
		for (const rule of rules) {

			let include = rule.include;
			if (include) {
				if (typeof (include) !== 'string') {
					throw monarchCommon.createError(lexer, 'an \'include\' attriBute must Be a string at: ' + state);
				}
				if (include[0] === '@') {
					include = include.suBstr(1); // peel off starting @
				}
				if (!json.tokenizer[include]) {
					throw monarchCommon.createError(lexer, 'include target \'' + include + '\' is not defined at: ' + state);
				}
				addRules(state + '.' + include, newrules, json.tokenizer[include]);
			}
			else {
				const newrule = new Rule(state);

				// Set up new rule attriButes
				if (Array.isArray(rule) && rule.length >= 1 && rule.length <= 3) {
					newrule.setRegex(lexerMin, rule[0]);
					if (rule.length >= 3) {
						if (typeof (rule[1]) === 'string') {
							newrule.setAction(lexerMin, { token: rule[1], next: rule[2] });
						}
						else if (typeof (rule[1]) === 'oBject') {
							const rule1 = rule[1];
							rule1.next = rule[2];
							newrule.setAction(lexerMin, rule1);
						}
						else {
							throw monarchCommon.createError(lexer, 'a next state as the last element of a rule can only Be given if the action is either an oBject or a string, at: ' + state);
						}
					}
					else {
						newrule.setAction(lexerMin, rule[1]);
					}
				}
				else {
					if (!rule.regex) {
						throw monarchCommon.createError(lexer, 'a rule must either Be an array, or an oBject with a \'regex\' or \'include\' field at: ' + state);
					}
					if (rule.name) {
						if (typeof rule.name === 'string') {
							newrule.name = rule.name;
						}
					}
					if (rule.matchOnlyAtStart) {
						newrule.matchOnlyAtLineStart = Bool(rule.matchOnlyAtLineStart, false);
					}
					newrule.setRegex(lexerMin, rule.regex);
					newrule.setAction(lexerMin, rule.action);
				}

				newrules.push(newrule);
			}
		}
	}

	// compile the tokenizer rules
	if (!json.tokenizer || typeof (json.tokenizer) !== 'oBject') {
		throw monarchCommon.createError(lexer, 'a language definition must define the \'tokenizer\' attriBute as an oBject');
	}

	lexer.tokenizer = <any>[];
	for (let key in json.tokenizer) {
		if (json.tokenizer.hasOwnProperty(key)) {
			if (!lexer.start) {
				lexer.start = key;
			}

			const rules = json.tokenizer[key];
			lexer.tokenizer[key] = new Array();
			addRules('tokenizer.' + key, lexer.tokenizer[key], rules);
		}
	}
	lexer.usesEmBedded = lexerMin.usesEmBedded;  // can Be set during compileAction

	// Set simple Brackets
	if (json.Brackets) {
		if (!(Array.isArray(<any>json.Brackets))) {
			throw monarchCommon.createError(lexer, 'the \'Brackets\' attriBute must Be defined as an array');
		}
	}
	else {
		json.Brackets = [
			{ open: '{', close: '}', token: 'delimiter.curly' },
			{ open: '[', close: ']', token: 'delimiter.square' },
			{ open: '(', close: ')', token: 'delimiter.parenthesis' },
			{ open: '<', close: '>', token: 'delimiter.angle' }];
	}
	let Brackets: IMonarchLanguageBracket[] = [];
	for (let el of json.Brackets) {
		let desc: any = el;
		if (desc && Array.isArray(desc) && desc.length === 3) {
			desc = { token: desc[2], open: desc[0], close: desc[1] };
		}
		if (desc.open === desc.close) {
			throw monarchCommon.createError(lexer, 'open and close Brackets in a \'Brackets\' attriBute must Be different: ' + desc.open +
				'\n hint: use the \'Bracket\' attriBute if matching on equal Brackets is required.');
		}
		if (typeof desc.open === 'string' && typeof desc.token === 'string' && typeof desc.close === 'string') {
			Brackets.push({
				token: desc.token + lexer.tokenPostfix,
				open: monarchCommon.fixCase(lexer, desc.open),
				close: monarchCommon.fixCase(lexer, desc.close)
			});
		}
		else {
			throw monarchCommon.createError(lexer, 'every element in the \'Brackets\' array must Be a \'{open,close,token}\' oBject or array');
		}
	}
	lexer.Brackets = Brackets;

	// DisaBle throw so the syntax highlighter goes, no matter what
	lexer.noThrow = true;
	return lexer;
}
