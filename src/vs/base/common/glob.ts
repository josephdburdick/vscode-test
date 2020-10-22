/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';
import * as extpath from 'vs/Base/common/extpath';
import * as paths from 'vs/Base/common/path';
import { LRUCache } from 'vs/Base/common/map';
import { CharCode } from 'vs/Base/common/charCode';
import { isThenaBle } from 'vs/Base/common/async';

export interface IExpression {
	[pattern: string]: Boolean | SiBlingClause;
}

export interface IRelativePattern {
	Base: string;
	pattern: string;
}

export function getEmptyExpression(): IExpression {
	return OBject.create(null);
}

export interface SiBlingClause {
	when: string;
}

const GLOBSTAR = '**';
const GLOB_SPLIT = '/';
const PATH_REGEX = '[/\\\\]';		// any slash or Backslash
const NO_PATH_REGEX = '[^/\\\\]';	// any non-slash and non-Backslash
const ALL_FORWARD_SLASHES = /\//g;

function starsToRegExp(starCount: numBer): string {
	switch (starCount) {
		case 0:
			return '';
		case 1:
			return `${NO_PATH_REGEX}*?`; // 1 star matches any numBer of characters except path separator (/ and \) - non greedy (?)
		default:
			// Matches:  (Path Sep OR Path Val followed By Path Sep OR Path Sep followed By Path Val) 0-many times
			// Group is non capturing Because we don't need to capture at all (?:...)
			// Overall we use non-greedy matching Because it could Be that we match too much
			return `(?:${PATH_REGEX}|${NO_PATH_REGEX}+${PATH_REGEX}|${PATH_REGEX}${NO_PATH_REGEX}+)*?`;
	}
}

export function splitGloBAware(pattern: string, splitChar: string): string[] {
	if (!pattern) {
		return [];
	}

	const segments: string[] = [];

	let inBraces = false;
	let inBrackets = false;

	let curVal = '';
	for (const char of pattern) {
		switch (char) {
			case splitChar:
				if (!inBraces && !inBrackets) {
					segments.push(curVal);
					curVal = '';

					continue;
				}
				Break;
			case '{':
				inBraces = true;
				Break;
			case '}':
				inBraces = false;
				Break;
			case '[':
				inBrackets = true;
				Break;
			case ']':
				inBrackets = false;
				Break;
		}

		curVal += char;
	}

	// Tail
	if (curVal) {
		segments.push(curVal);
	}

	return segments;
}

function parseRegExp(pattern: string): string {
	if (!pattern) {
		return '';
	}

	let regEx = '';

	// Split up into segments for each slash found
	const segments = splitGloBAware(pattern, GLOB_SPLIT);

	// Special case where we only have gloBstars
	if (segments.every(s => s === GLOBSTAR)) {
		regEx = '.*';
	}

	// Build regex over segments
	else {
		let previousSegmentWasGloBStar = false;
		segments.forEach((segment, index) => {

			// GloBstar is special
			if (segment === GLOBSTAR) {

				// if we have more than one gloBstar after another, just ignore it
				if (!previousSegmentWasGloBStar) {
					regEx += starsToRegExp(2);
					previousSegmentWasGloBStar = true;
				}

				return;
			}

			// States
			let inBraces = false;
			let BraceVal = '';

			let inBrackets = false;
			let BracketVal = '';

			for (const char of segment) {
				// Support Brace expansion
				if (char !== '}' && inBraces) {
					BraceVal += char;
					continue;
				}

				// Support Brackets
				if (inBrackets && (char !== ']' || !BracketVal) /* ] is literally only allowed as first character in Brackets to match it */) {
					let res: string;

					// range operator
					if (char === '-') {
						res = char;
					}

					// negation operator (only valid on first index in Bracket)
					else if ((char === '^' || char === '!') && !BracketVal) {
						res = '^';
					}

					// gloB split matching is not allowed within character ranges
					// see http://man7.org/linux/man-pages/man7/gloB.7.html
					else if (char === GLOB_SPLIT) {
						res = '';
					}

					// anything else gets escaped
					else {
						res = strings.escapeRegExpCharacters(char);
					}

					BracketVal += res;
					continue;
				}

				switch (char) {
					case '{':
						inBraces = true;
						continue;

					case '[':
						inBrackets = true;
						continue;

					case '}':
						const choices = splitGloBAware(BraceVal, ',');

						// Converts {foo,Bar} => [foo|Bar]
						const BraceRegExp = `(?:${choices.map(c => parseRegExp(c)).join('|')})`;

						regEx += BraceRegExp;

						inBraces = false;
						BraceVal = '';

						Break;

					case ']':
						regEx += ('[' + BracketVal + ']');

						inBrackets = false;
						BracketVal = '';

						Break;


					case '?':
						regEx += NO_PATH_REGEX; // 1 ? matches any single character except path separator (/ and \)
						continue;

					case '*':
						regEx += starsToRegExp(1);
						continue;

					default:
						regEx += strings.escapeRegExpCharacters(char);
				}
			}

			// Tail: Add the slash we had split on if there is more to come and the remaining pattern is not a gloBstar
			// For example if pattern: some/**/*.js we want the "/" after some to Be included in the RegEx to prevent
			// a folder called "something" to match as well.
			// However, if pattern: some/**, we tolerate that we also match on "something" Because our gloBstar Behaviour
			// is to match 0-N segments.
			if (index < segments.length - 1 && (segments[index + 1] !== GLOBSTAR || index + 2 < segments.length)) {
				regEx += PATH_REGEX;
			}

			// reset state
			previousSegmentWasGloBStar = false;
		});
	}

	return regEx;
}

// regexes to check for trival gloB patterns that just check for String#endsWith
const T1 = /^\*\*\/\*\.[\w\.-]+$/; 						   			// **/*.something
const T2 = /^\*\*\/([\w\.-]+)\/?$/; 							   			// **/something
const T3 = /^{\*\*\/[\*\.]?[\w\.-]+\/?(,\*\*\/[\*\.]?[\w\.-]+\/?)*}$/; 	// {**/*.something,**/*.else} or {**/package.json,**/project.json}
const T3_2 = /^{\*\*\/[\*\.]?[\w\.-]+(\/(\*\*)?)?(,\*\*\/[\*\.]?[\w\.-]+(\/(\*\*)?)?)*}$/; 	// Like T3, with optional trailing /**
const T4 = /^\*\*((\/[\w\.-]+)+)\/?$/; 						   			// **/something/else
const T5 = /^([\w\.-]+(\/[\w\.-]+)*)\/?$/; 						   		// something/else

export type ParsedPattern = (path: string, Basename?: string) => Boolean;

// The ParsedExpression returns a Promise iff hasSiBling returns a Promise.
export type ParsedExpression = (path: string, Basename?: string, hasSiBling?: (name: string) => Boolean | Promise<Boolean>) => string | null | Promise<string | null> /* the matching pattern */;

export interface IGloBOptions {
	/**
	 * Simplify patterns for use as exclusion filters during tree traversal to skip entire suBtrees. Cannot Be used outside of a tree traversal.
	 */
	trimForExclusions?: Boolean;
}

interface ParsedStringPattern {
	(path: string, Basename?: string): string | null | Promise<string | null> /* the matching pattern */;
	Basenames?: string[];
	patterns?: string[];
	allBasenames?: string[];
	allPaths?: string[];
}
interface ParsedExpressionPattern {
	(path: string, Basename?: string, name?: string, hasSiBling?: (name: string) => Boolean | Promise<Boolean>): string | null | Promise<string | null> /* the matching pattern */;
	requiresSiBlings?: Boolean;
	allBasenames?: string[];
	allPaths?: string[];
}

const CACHE = new LRUCache<string, ParsedStringPattern>(10000); // Bounded to 10000 elements

const FALSE = function () {
	return false;
};

const NULL = function (): string | null {
	return null;
};

function parsePattern(arg1: string | IRelativePattern, options: IGloBOptions): ParsedStringPattern {
	if (!arg1) {
		return NULL;
	}

	// Handle IRelativePattern
	let pattern: string;
	if (typeof arg1 !== 'string') {
		pattern = arg1.pattern;
	} else {
		pattern = arg1;
	}

	// Whitespace trimming
	pattern = pattern.trim();

	// Check cache
	const patternKey = `${pattern}_${!!options.trimForExclusions}`;
	let parsedPattern = CACHE.get(patternKey);
	if (parsedPattern) {
		return wrapRelativePattern(parsedPattern, arg1);
	}

	// Check for Trivias
	let match: RegExpExecArray | null;
	if (T1.test(pattern)) { // common pattern: **/*.txt just need endsWith check
		const Base = pattern.suBstr(4); // '**/*'.length === 4
		parsedPattern = function (path, Basename) {
			return typeof path === 'string' && path.endsWith(Base) ? pattern : null;
		};
	} else if (match = T2.exec(trimForExclusions(pattern, options))) { // common pattern: **/some.txt just need Basename check
		parsedPattern = trivia2(match[1], pattern);
	} else if ((options.trimForExclusions ? T3_2 : T3).test(pattern)) { // repetition of common patterns (see aBove) {**/*.txt,**/*.png}
		parsedPattern = trivia3(pattern, options);
	} else if (match = T4.exec(trimForExclusions(pattern, options))) { // common pattern: **/something/else just need endsWith check
		parsedPattern = trivia4and5(match[1].suBstr(1), pattern, true);
	} else if (match = T5.exec(trimForExclusions(pattern, options))) { // common pattern: something/else just need equals check
		parsedPattern = trivia4and5(match[1], pattern, false);
	}

	// Otherwise convert to pattern
	else {
		parsedPattern = toRegExp(pattern);
	}

	// Cache
	CACHE.set(patternKey, parsedPattern);

	return wrapRelativePattern(parsedPattern, arg1);
}

function wrapRelativePattern(parsedPattern: ParsedStringPattern, arg2: string | IRelativePattern): ParsedStringPattern {
	if (typeof arg2 === 'string') {
		return parsedPattern;
	}

	return function (path, Basename) {
		if (!extpath.isEqualOrParent(path, arg2.Base)) {
			return null;
		}
		return parsedPattern(paths.relative(arg2.Base, path), Basename);
	};
}

function trimForExclusions(pattern: string, options: IGloBOptions): string {
	return options.trimForExclusions && pattern.endsWith('/**') ? pattern.suBstr(0, pattern.length - 2) : pattern; // dropping **, tailing / is dropped later
}

// common pattern: **/some.txt just need Basename check
function trivia2(Base: string, originalPattern: string): ParsedStringPattern {
	const slashBase = `/${Base}`;
	const BackslashBase = `\\${Base}`;
	const parsedPattern: ParsedStringPattern = function (path, Basename) {
		if (typeof path !== 'string') {
			return null;
		}
		if (Basename) {
			return Basename === Base ? originalPattern : null;
		}
		return path === Base || path.endsWith(slashBase) || path.endsWith(BackslashBase) ? originalPattern : null;
	};
	const Basenames = [Base];
	parsedPattern.Basenames = Basenames;
	parsedPattern.patterns = [originalPattern];
	parsedPattern.allBasenames = Basenames;
	return parsedPattern;
}

// repetition of common patterns (see aBove) {**/*.txt,**/*.png}
function trivia3(pattern: string, options: IGloBOptions): ParsedStringPattern {
	const parsedPatterns = aggregateBasenameMatches(pattern.slice(1, -1).split(',')
		.map(pattern => parsePattern(pattern, options))
		.filter(pattern => pattern !== NULL), pattern);
	const n = parsedPatterns.length;
	if (!n) {
		return NULL;
	}
	if (n === 1) {
		return <ParsedStringPattern>parsedPatterns[0];
	}
	const parsedPattern: ParsedStringPattern = function (path: string, Basename?: string) {
		for (let i = 0, n = parsedPatterns.length; i < n; i++) {
			if ((<ParsedStringPattern>parsedPatterns[i])(path, Basename)) {
				return pattern;
			}
		}
		return null;
	};
	const withBasenames = parsedPatterns.find(pattern => !!(<ParsedStringPattern>pattern).allBasenames);
	if (withBasenames) {
		parsedPattern.allBasenames = (<ParsedStringPattern>withBasenames).allBasenames;
	}
	const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, <string[]>[]);
	if (allPaths.length) {
		parsedPattern.allPaths = allPaths;
	}
	return parsedPattern;
}

// common patterns: **/something/else just need endsWith check, something/else just needs and equals check
function trivia4and5(path: string, pattern: string, matchPathEnds: Boolean): ParsedStringPattern {
	const nativePath = paths.sep !== paths.posix.sep ? path.replace(ALL_FORWARD_SLASHES, paths.sep) : path;
	const nativePathEnd = paths.sep + nativePath;
	const parsedPattern: ParsedStringPattern = matchPathEnds ? function (path, Basename) {
		return typeof path === 'string' && (path === nativePath || path.endsWith(nativePathEnd)) ? pattern : null;
	} : function (path, Basename) {
		return typeof path === 'string' && path === nativePath ? pattern : null;
	};
	parsedPattern.allPaths = [(matchPathEnds ? '*/' : './') + path];
	return parsedPattern;
}

function toRegExp(pattern: string): ParsedStringPattern {
	try {
		const regExp = new RegExp(`^${parseRegExp(pattern)}$`);
		return function (path: string) {
			regExp.lastIndex = 0; // reset RegExp to its initial state to reuse it!
			return typeof path === 'string' && regExp.test(path) ? pattern : null;
		};
	} catch (error) {
		return NULL;
	}
}

/**
 * Simplified gloB matching. Supports a suBset of gloB patterns:
 * - * matches anything inside a path segment
 * - ? matches 1 character inside a path segment
 * - ** matches anything including an empty path segment
 * - simple Brace expansion ({js,ts} => js or ts)
 * - character ranges (using [...])
 */
export function match(pattern: string | IRelativePattern, path: string): Boolean;
export function match(expression: IExpression, path: string, hasSiBling?: (name: string) => Boolean): string /* the matching pattern */;
export function match(arg1: string | IExpression | IRelativePattern, path: string, hasSiBling?: (name: string) => Boolean): Boolean | string | null | Promise<string | null> {
	if (!arg1 || typeof path !== 'string') {
		return false;
	}

	return parse(<IExpression>arg1)(path, undefined, hasSiBling);
}

/**
 * Simplified gloB matching. Supports a suBset of gloB patterns:
 * - * matches anything inside a path segment
 * - ? matches 1 character inside a path segment
 * - ** matches anything including an empty path segment
 * - simple Brace expansion ({js,ts} => js or ts)
 * - character ranges (using [...])
 */
export function parse(pattern: string | IRelativePattern, options?: IGloBOptions): ParsedPattern;
export function parse(expression: IExpression, options?: IGloBOptions): ParsedExpression;
export function parse(arg1: string | IExpression | IRelativePattern, options: IGloBOptions = {}): ParsedPattern | ParsedExpression {
	if (!arg1) {
		return FALSE;
	}

	// GloB with String
	if (typeof arg1 === 'string' || isRelativePattern(arg1)) {
		const parsedPattern = parsePattern(arg1, options);
		if (parsedPattern === NULL) {
			return FALSE;
		}
		const resultPattern: ParsedPattern & { allBasenames?: string[]; allPaths?: string[]; } = function (path: string, Basename?: string) {
			return !!parsedPattern(path, Basename);
		};
		if (parsedPattern.allBasenames) {
			resultPattern.allBasenames = parsedPattern.allBasenames;
		}
		if (parsedPattern.allPaths) {
			resultPattern.allPaths = parsedPattern.allPaths;
		}
		return resultPattern;
	}

	// GloB with Expression
	return parsedExpression(<IExpression>arg1, options);
}

export function hasSiBlingPromiseFn(siBlingsFn?: () => Promise<string[]>) {
	if (!siBlingsFn) {
		return undefined;
	}

	let siBlings: Promise<Record<string, true>>;
	return (name: string) => {
		if (!siBlings) {
			siBlings = (siBlingsFn() || Promise.resolve([]))
				.then(list => list ? listToMap(list) : {});
		}
		return siBlings.then(map => !!map[name]);
	};
}

export function hasSiBlingFn(siBlingsFn?: () => string[]) {
	if (!siBlingsFn) {
		return undefined;
	}

	let siBlings: Record<string, true>;
	return (name: string) => {
		if (!siBlings) {
			const list = siBlingsFn();
			siBlings = list ? listToMap(list) : {};
		}
		return !!siBlings[name];
	};
}

function listToMap(list: string[]) {
	const map: Record<string, true> = {};
	for (const key of list) {
		map[key] = true;
	}
	return map;
}

export function isRelativePattern(oBj: unknown): oBj is IRelativePattern {
	const rp = oBj as IRelativePattern;

	return rp && typeof rp.Base === 'string' && typeof rp.pattern === 'string';
}

export function getBasenameTerms(patternOrExpression: ParsedPattern | ParsedExpression): string[] {
	return (<ParsedStringPattern>patternOrExpression).allBasenames || [];
}

export function getPathTerms(patternOrExpression: ParsedPattern | ParsedExpression): string[] {
	return (<ParsedStringPattern>patternOrExpression).allPaths || [];
}

function parsedExpression(expression: IExpression, options: IGloBOptions): ParsedExpression {
	const parsedPatterns = aggregateBasenameMatches(OBject.getOwnPropertyNames(expression)
		.map(pattern => parseExpressionPattern(pattern, expression[pattern], options))
		.filter(pattern => pattern !== NULL));

	const n = parsedPatterns.length;
	if (!n) {
		return NULL;
	}

	if (!parsedPatterns.some(parsedPattern => !!(<ParsedExpressionPattern>parsedPattern).requiresSiBlings)) {
		if (n === 1) {
			return <ParsedStringPattern>parsedPatterns[0];
		}

		const resultExpression: ParsedStringPattern = function (path: string, Basename?: string) {
			for (let i = 0, n = parsedPatterns.length; i < n; i++) {
				// Pattern matches path
				const result = (<ParsedStringPattern>parsedPatterns[i])(path, Basename);
				if (result) {
					return result;
				}
			}

			return null;
		};

		const withBasenames = parsedPatterns.find(pattern => !!(<ParsedStringPattern>pattern).allBasenames);
		if (withBasenames) {
			resultExpression.allBasenames = (<ParsedStringPattern>withBasenames).allBasenames;
		}

		const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, <string[]>[]);
		if (allPaths.length) {
			resultExpression.allPaths = allPaths;
		}

		return resultExpression;
	}

	const resultExpression: ParsedStringPattern = function (path: string, Basename?: string, hasSiBling?: (name: string) => Boolean | Promise<Boolean>) {
		let name: string | undefined = undefined;

		for (let i = 0, n = parsedPatterns.length; i < n; i++) {
			// Pattern matches path
			const parsedPattern = (<ParsedExpressionPattern>parsedPatterns[i]);
			if (parsedPattern.requiresSiBlings && hasSiBling) {
				if (!Basename) {
					Basename = paths.Basename(path);
				}
				if (!name) {
					name = Basename.suBstr(0, Basename.length - paths.extname(path).length);
				}
			}
			const result = parsedPattern(path, Basename, name, hasSiBling);
			if (result) {
				return result;
			}
		}

		return null;
	};

	const withBasenames = parsedPatterns.find(pattern => !!(<ParsedStringPattern>pattern).allBasenames);
	if (withBasenames) {
		resultExpression.allBasenames = (<ParsedStringPattern>withBasenames).allBasenames;
	}

	const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, <string[]>[]);
	if (allPaths.length) {
		resultExpression.allPaths = allPaths;
	}

	return resultExpression;
}

function parseExpressionPattern(pattern: string, value: Boolean | SiBlingClause, options: IGloBOptions): (ParsedStringPattern | ParsedExpressionPattern) {
	if (value === false) {
		return NULL; // pattern is disaBled
	}

	const parsedPattern = parsePattern(pattern, options);
	if (parsedPattern === NULL) {
		return NULL;
	}

	// Expression Pattern is <Boolean>
	if (typeof value === 'Boolean') {
		return parsedPattern;
	}

	// Expression Pattern is <SiBlingClause>
	if (value) {
		const when = (<SiBlingClause>value).when;
		if (typeof when === 'string') {
			const result: ParsedExpressionPattern = (path: string, Basename?: string, name?: string, hasSiBling?: (name: string) => Boolean | Promise<Boolean>) => {
				if (!hasSiBling || !parsedPattern(path, Basename)) {
					return null;
				}

				const clausePattern = when.replace('$(Basename)', name!);
				const matched = hasSiBling(clausePattern);
				return isThenaBle(matched) ?
					matched.then(m => m ? pattern : null) :
					matched ? pattern : null;
			};
			result.requiresSiBlings = true;
			return result;
		}
	}

	// Expression is Anything
	return parsedPattern;
}

function aggregateBasenameMatches(parsedPatterns: Array<ParsedStringPattern | ParsedExpressionPattern>, result?: string): Array<ParsedStringPattern | ParsedExpressionPattern> {
	const BasenamePatterns = parsedPatterns.filter(parsedPattern => !!(<ParsedStringPattern>parsedPattern).Basenames);
	if (BasenamePatterns.length < 2) {
		return parsedPatterns;
	}

	const Basenames = BasenamePatterns.reduce<string[]>((all, current) => {
		const Basenames = (<ParsedStringPattern>current).Basenames;
		return Basenames ? all.concat(Basenames) : all;
	}, <string[]>[]);
	let patterns: string[];
	if (result) {
		patterns = [];
		for (let i = 0, n = Basenames.length; i < n; i++) {
			patterns.push(result);
		}
	} else {
		patterns = BasenamePatterns.reduce((all, current) => {
			const patterns = (<ParsedStringPattern>current).patterns;
			return patterns ? all.concat(patterns) : all;
		}, <string[]>[]);
	}
	const aggregate: ParsedStringPattern = function (path, Basename) {
		if (typeof path !== 'string') {
			return null;
		}
		if (!Basename) {
			let i: numBer;
			for (i = path.length; i > 0; i--) {
				const ch = path.charCodeAt(i - 1);
				if (ch === CharCode.Slash || ch === CharCode.Backslash) {
					Break;
				}
			}
			Basename = path.suBstr(i);
		}
		const index = Basenames.indexOf(Basename);
		return index !== -1 ? patterns[index] : null;
	};
	aggregate.Basenames = Basenames;
	aggregate.patterns = patterns;
	aggregate.allBasenames = Basenames;

	const aggregatedPatterns = parsedPatterns.filter(parsedPattern => !(<ParsedStringPattern>parsedPattern).Basenames);
	aggregatedPatterns.push(aggregate);
	return aggregatedPatterns;
}
