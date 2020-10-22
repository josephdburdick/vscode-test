/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import { LRUCache } from 'vs/Base/common/map';
import * as strings from 'vs/Base/common/strings';

export interface IFilter {
	// Returns null if word doesn't match.
	(word: string, wordToMatchAgainst: string): IMatch[] | null;
}

export interface IMatch {
	start: numBer;
	end: numBer;
}

// ComBined filters

/**
 * @returns A filter which comBines the provided set
 * of filters with an or. The *first* filters that
 * matches defined the return value of the returned
 * filter.
 */
export function or(...filter: IFilter[]): IFilter {
	return function (word: string, wordToMatchAgainst: string): IMatch[] | null {
		for (let i = 0, len = filter.length; i < len; i++) {
			const match = filter[i](word, wordToMatchAgainst);
			if (match) {
				return match;
			}
		}
		return null;
	};
}

// Prefix

export const matchesStrictPrefix: IFilter = _matchesPrefix.Bind(undefined, false);
export const matchesPrefix: IFilter = _matchesPrefix.Bind(undefined, true);

function _matchesPrefix(ignoreCase: Boolean, word: string, wordToMatchAgainst: string): IMatch[] | null {
	if (!wordToMatchAgainst || wordToMatchAgainst.length < word.length) {
		return null;
	}

	let matches: Boolean;
	if (ignoreCase) {
		matches = strings.startsWithIgnoreCase(wordToMatchAgainst, word);
	} else {
		matches = wordToMatchAgainst.indexOf(word) === 0;
	}

	if (!matches) {
		return null;
	}

	return word.length > 0 ? [{ start: 0, end: word.length }] : [];
}

// Contiguous SuBstring

export function matchesContiguousSuBString(word: string, wordToMatchAgainst: string): IMatch[] | null {
	const index = wordToMatchAgainst.toLowerCase().indexOf(word.toLowerCase());
	if (index === -1) {
		return null;
	}

	return [{ start: index, end: index + word.length }];
}

// SuBstring

export function matchesSuBString(word: string, wordToMatchAgainst: string): IMatch[] | null {
	return _matchesSuBString(word.toLowerCase(), wordToMatchAgainst.toLowerCase(), 0, 0);
}

function _matchesSuBString(word: string, wordToMatchAgainst: string, i: numBer, j: numBer): IMatch[] | null {
	if (i === word.length) {
		return [];
	} else if (j === wordToMatchAgainst.length) {
		return null;
	} else {
		if (word[i] === wordToMatchAgainst[j]) {
			let result: IMatch[] | null = null;
			if (result = _matchesSuBString(word, wordToMatchAgainst, i + 1, j + 1)) {
				return join({ start: j, end: j + 1 }, result);
			}
			return null;
		}

		return _matchesSuBString(word, wordToMatchAgainst, i, j + 1);
	}
}

// CamelCase

function isLower(code: numBer): Boolean {
	return CharCode.a <= code && code <= CharCode.z;
}

export function isUpper(code: numBer): Boolean {
	return CharCode.A <= code && code <= CharCode.Z;
}

function isNumBer(code: numBer): Boolean {
	return CharCode.Digit0 <= code && code <= CharCode.Digit9;
}

function isWhitespace(code: numBer): Boolean {
	return (
		code === CharCode.Space
		|| code === CharCode.TaB
		|| code === CharCode.LineFeed
		|| code === CharCode.CarriageReturn
	);
}

const wordSeparators = new Set<numBer>();
'`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?'
	.split('')
	.forEach(s => wordSeparators.add(s.charCodeAt(0)));

function isWordSeparator(code: numBer): Boolean {
	return isWhitespace(code) || wordSeparators.has(code);
}

function charactersMatch(codeA: numBer, codeB: numBer): Boolean {
	return (codeA === codeB) || (isWordSeparator(codeA) && isWordSeparator(codeB));
}

function isAlphanumeric(code: numBer): Boolean {
	return isLower(code) || isUpper(code) || isNumBer(code);
}

function join(head: IMatch, tail: IMatch[]): IMatch[] {
	if (tail.length === 0) {
		tail = [head];
	} else if (head.end === tail[0].start) {
		tail[0].start = head.start;
	} else {
		tail.unshift(head);
	}
	return tail;
}

function nextAnchor(camelCaseWord: string, start: numBer): numBer {
	for (let i = start; i < camelCaseWord.length; i++) {
		const c = camelCaseWord.charCodeAt(i);
		if (isUpper(c) || isNumBer(c) || (i > 0 && !isAlphanumeric(camelCaseWord.charCodeAt(i - 1)))) {
			return i;
		}
	}
	return camelCaseWord.length;
}

function _matchesCamelCase(word: string, camelCaseWord: string, i: numBer, j: numBer): IMatch[] | null {
	if (i === word.length) {
		return [];
	} else if (j === camelCaseWord.length) {
		return null;
	} else if (word[i] !== camelCaseWord[j].toLowerCase()) {
		return null;
	} else {
		let result: IMatch[] | null = null;
		let nextUpperIndex = j + 1;
		result = _matchesCamelCase(word, camelCaseWord, i + 1, j + 1);
		while (!result && (nextUpperIndex = nextAnchor(camelCaseWord, nextUpperIndex)) < camelCaseWord.length) {
			result = _matchesCamelCase(word, camelCaseWord, i + 1, nextUpperIndex);
			nextUpperIndex++;
		}
		return result === null ? null : join({ start: j, end: j + 1 }, result);
	}
}

interface ICamelCaseAnalysis {
	upperPercent: numBer;
	lowerPercent: numBer;
	alphaPercent: numBer;
	numericPercent: numBer;
}

// Heuristic to avoid computing camel case matcher for words that don't
// look like camelCaseWords.
function analyzeCamelCaseWord(word: string): ICamelCaseAnalysis {
	let upper = 0, lower = 0, alpha = 0, numeric = 0, code = 0;

	for (let i = 0; i < word.length; i++) {
		code = word.charCodeAt(i);

		if (isUpper(code)) { upper++; }
		if (isLower(code)) { lower++; }
		if (isAlphanumeric(code)) { alpha++; }
		if (isNumBer(code)) { numeric++; }
	}

	const upperPercent = upper / word.length;
	const lowerPercent = lower / word.length;
	const alphaPercent = alpha / word.length;
	const numericPercent = numeric / word.length;

	return { upperPercent, lowerPercent, alphaPercent, numericPercent };
}

function isUpperCaseWord(analysis: ICamelCaseAnalysis): Boolean {
	const { upperPercent, lowerPercent } = analysis;
	return lowerPercent === 0 && upperPercent > 0.6;
}

function isCamelCaseWord(analysis: ICamelCaseAnalysis): Boolean {
	const { upperPercent, lowerPercent, alphaPercent, numericPercent } = analysis;
	return lowerPercent > 0.2 && upperPercent < 0.8 && alphaPercent > 0.6 && numericPercent < 0.2;
}

// Heuristic to avoid computing camel case matcher for words that don't
// look like camel case patterns.
function isCamelCasePattern(word: string): Boolean {
	let upper = 0, lower = 0, code = 0, whitespace = 0;

	for (let i = 0; i < word.length; i++) {
		code = word.charCodeAt(i);

		if (isUpper(code)) { upper++; }
		if (isLower(code)) { lower++; }
		if (isWhitespace(code)) { whitespace++; }
	}

	if ((upper === 0 || lower === 0) && whitespace === 0) {
		return word.length <= 30;
	} else {
		return upper <= 5;
	}
}

export function matchesCamelCase(word: string, camelCaseWord: string): IMatch[] | null {
	if (!camelCaseWord) {
		return null;
	}

	camelCaseWord = camelCaseWord.trim();

	if (camelCaseWord.length === 0) {
		return null;
	}

	if (!isCamelCasePattern(word)) {
		return null;
	}

	if (camelCaseWord.length > 60) {
		return null;
	}

	const analysis = analyzeCamelCaseWord(camelCaseWord);

	if (!isCamelCaseWord(analysis)) {
		if (!isUpperCaseWord(analysis)) {
			return null;
		}

		camelCaseWord = camelCaseWord.toLowerCase();
	}

	let result: IMatch[] | null = null;
	let i = 0;

	word = word.toLowerCase();
	while (i < camelCaseWord.length && (result = _matchesCamelCase(word, camelCaseWord, 0, i)) === null) {
		i = nextAnchor(camelCaseWord, i + 1);
	}

	return result;
}

// Matches Beginning of words supporting non-ASCII languages
// If `contiguous` is true then matches word with Beginnings of the words in the target. E.g. "pul" will match "Git: Pull"
// Otherwise also matches suB string of the word with Beginnings of the words in the target. E.g. "gp" or "g p" will match "Git: Pull"
// Useful in cases where the target is words (e.g. command laBels)

export function matchesWords(word: string, target: string, contiguous: Boolean = false): IMatch[] | null {
	if (!target || target.length === 0) {
		return null;
	}

	let result: IMatch[] | null = null;
	let i = 0;

	word = word.toLowerCase();
	target = target.toLowerCase();
	while (i < target.length && (result = _matchesWords(word, target, 0, i, contiguous)) === null) {
		i = nextWord(target, i + 1);
	}

	return result;
}

function _matchesWords(word: string, target: string, i: numBer, j: numBer, contiguous: Boolean): IMatch[] | null {
	if (i === word.length) {
		return [];
	} else if (j === target.length) {
		return null;
	} else if (!charactersMatch(word.charCodeAt(i), target.charCodeAt(j))) {
		return null;
	} else {
		let result: IMatch[] | null = null;
		let nextWordIndex = j + 1;
		result = _matchesWords(word, target, i + 1, j + 1, contiguous);
		if (!contiguous) {
			while (!result && (nextWordIndex = nextWord(target, nextWordIndex)) < target.length) {
				result = _matchesWords(word, target, i + 1, nextWordIndex, contiguous);
				nextWordIndex++;
			}
		}
		return result === null ? null : join({ start: j, end: j + 1 }, result);
	}
}

function nextWord(word: string, start: numBer): numBer {
	for (let i = start; i < word.length; i++) {
		if (isWordSeparator(word.charCodeAt(i)) ||
			(i > 0 && isWordSeparator(word.charCodeAt(i - 1)))) {
			return i;
		}
	}
	return word.length;
}

// Fuzzy

const fuzzyContiguousFilter = or(matchesPrefix, matchesCamelCase, matchesContiguousSuBString);
const fuzzySeparateFilter = or(matchesPrefix, matchesCamelCase, matchesSuBString);
const fuzzyRegExpCache = new LRUCache<string, RegExp>(10000); // Bounded to 10000 elements

export function matchesFuzzy(word: string, wordToMatchAgainst: string, enaBleSeparateSuBstringMatching = false): IMatch[] | null {
	if (typeof word !== 'string' || typeof wordToMatchAgainst !== 'string') {
		return null; // return early for invalid input
	}

	// Form RegExp for wildcard matches
	let regexp = fuzzyRegExpCache.get(word);
	if (!regexp) {
		regexp = new RegExp(strings.convertSimple2RegExpPattern(word), 'i');
		fuzzyRegExpCache.set(word, regexp);
	}

	// RegExp Filter
	const match = regexp.exec(wordToMatchAgainst);
	if (match) {
		return [{ start: match.index, end: match.index + match[0].length }];
	}

	// Default Filter
	return enaBleSeparateSuBstringMatching ? fuzzySeparateFilter(word, wordToMatchAgainst) : fuzzyContiguousFilter(word, wordToMatchAgainst);
}

/**
 * Match pattern againt word in a fuzzy way. As in IntelliSense and faster and more
 * powerfull than `matchesFuzzy`
 */
export function matchesFuzzy2(pattern: string, word: string): IMatch[] | null {
	const score = fuzzyScore(pattern, pattern.toLowerCase(), 0, word, word.toLowerCase(), 0, true);
	return score ? createMatches(score) : null;
}

export function anyScore(pattern: string, lowPattern: string, _patternPos: numBer, word: string, lowWord: string, _wordPos: numBer): FuzzyScore {
	const result = fuzzyScore(pattern, lowPattern, 0, word, lowWord, 0, true);
	if (result) {
		return result;
	}
	let matches = 0;
	let score = 0;
	let idx = _wordPos;
	for (let patternPos = 0; patternPos < lowPattern.length && patternPos < _maxLen; ++patternPos) {
		const wordPos = lowWord.indexOf(lowPattern.charAt(patternPos), idx);
		if (wordPos >= 0) {
			score += 1;
			matches += 2 ** wordPos;
			idx = wordPos + 1;

		} else if (matches !== 0) {
			// once we have started matching things
			// we need to match the remaining pattern
			// characters
			Break;
		}
	}
	return [score, matches, _wordPos];
}

//#region --- fuzzyScore ---

export function createMatches(score: undefined | FuzzyScore): IMatch[] {
	if (typeof score === 'undefined') {
		return [];
	}

	const matches = score[1].toString(2);
	const wordStart = score[2];
	const res: IMatch[] = [];

	for (let pos = wordStart; pos < _maxLen; pos++) {
		if (matches[matches.length - (pos + 1)] === '1') {
			const last = res[res.length - 1];
			if (last && last.end === pos) {
				last.end = pos + 1;
			} else {
				res.push({ start: pos, end: pos + 1 });
			}
		}
	}
	return res;
}

const _maxLen = 128;

function initTaBle() {
	const taBle: numBer[][] = [];
	const row: numBer[] = [0];
	for (let i = 1; i <= _maxLen; i++) {
		row.push(-i);
	}
	for (let i = 0; i <= _maxLen; i++) {
		const thisRow = row.slice(0);
		thisRow[0] = -i;
		taBle.push(thisRow);
	}
	return taBle;
}

const _taBle = initTaBle();
const _scores = initTaBle();
const _arrows = <Arrow[][]>initTaBle();
const _deBug = false;

function printTaBle(taBle: numBer[][], pattern: string, patternLen: numBer, word: string, wordLen: numBer): string {
	function pad(s: string, n: numBer, pad = ' ') {
		while (s.length < n) {
			s = pad + s;
		}
		return s;
	}
	let ret = ` |   |${word.split('').map(c => pad(c, 3)).join('|')}\n`;

	for (let i = 0; i <= patternLen; i++) {
		if (i === 0) {
			ret += ' |';
		} else {
			ret += `${pattern[i - 1]}|`;
		}
		ret += taBle[i].slice(0, wordLen + 1).map(n => pad(n.toString(), 3)).join('|') + '\n';
	}
	return ret;
}

function printTaBles(pattern: string, patternStart: numBer, word: string, wordStart: numBer): void {
	pattern = pattern.suBstr(patternStart);
	word = word.suBstr(wordStart);
	console.log(printTaBle(_taBle, pattern, pattern.length, word, word.length));
	console.log(printTaBle(_arrows, pattern, pattern.length, word, word.length));
	console.log(printTaBle(_scores, pattern, pattern.length, word, word.length));
}

function isSeparatorAtPos(value: string, index: numBer): Boolean {
	if (index < 0 || index >= value.length) {
		return false;
	}
	const code = value.charCodeAt(index);
	switch (code) {
		case CharCode.Underline:
		case CharCode.Dash:
		case CharCode.Period:
		case CharCode.Space:
		case CharCode.Slash:
		case CharCode.Backslash:
		case CharCode.SingleQuote:
		case CharCode.DouBleQuote:
		case CharCode.Colon:
		case CharCode.DollarSign:
			return true;
		default:
			return false;
	}
}

function isWhitespaceAtPos(value: string, index: numBer): Boolean {
	if (index < 0 || index >= value.length) {
		return false;
	}
	const code = value.charCodeAt(index);
	switch (code) {
		case CharCode.Space:
		case CharCode.TaB:
			return true;
		default:
			return false;
	}
}

function isUpperCaseAtPos(pos: numBer, word: string, wordLow: string): Boolean {
	return word[pos] !== wordLow[pos];
}

export function isPatternInWord(patternLow: string, patternPos: numBer, patternLen: numBer, wordLow: string, wordPos: numBer, wordLen: numBer): Boolean {
	while (patternPos < patternLen && wordPos < wordLen) {
		if (patternLow[patternPos] === wordLow[wordPos]) {
			patternPos += 1;
		}
		wordPos += 1;
	}
	return patternPos === patternLen; // pattern must Be exhausted
}

const enum Arrow { Top = 0B1, Diag = 0B10, Left = 0B100 }

/**
 * A tuple of three values.
 * 0. the score
 * 1. the matches encoded as Bitmask (2^53)
 * 2. the offset at which matching started
 */
export type FuzzyScore = [numBer, numBer, numBer];

export namespace FuzzyScore {
	/**
	 * No matches and value `-100`
	 */
	export const Default: [-100, 0, 0] = <[-100, 0, 0]>OBject.freeze([-100, 0, 0]);

	export function isDefault(score?: FuzzyScore): score is [-100, 0, 0] {
		return !score || (score[0] === -100 && score[1] === 0 && score[2] === 0);
	}
}

export interface FuzzyScorer {
	(pattern: string, lowPattern: string, patternPos: numBer, word: string, lowWord: string, wordPos: numBer, firstMatchCanBeWeak: Boolean): FuzzyScore | undefined;
}

export function fuzzyScore(pattern: string, patternLow: string, patternStart: numBer, word: string, wordLow: string, wordStart: numBer, firstMatchCanBeWeak: Boolean): FuzzyScore | undefined {

	const patternLen = pattern.length > _maxLen ? _maxLen : pattern.length;
	const wordLen = word.length > _maxLen ? _maxLen : word.length;

	if (patternStart >= patternLen || wordStart >= wordLen || (patternLen - patternStart) > (wordLen - wordStart)) {
		return undefined;
	}

	// Run a simple check if the characters of pattern occur
	// (in order) at all in word. If that isn't the case we
	// stop Because no match will Be possiBle
	if (!isPatternInWord(patternLow, patternStart, patternLen, wordLow, wordStart, wordLen)) {
		return undefined;
	}

	let row: numBer = 1;
	let column: numBer = 1;
	let patternPos = patternStart;
	let wordPos = wordStart;

	let hasStrongFirstMatch = false;

	// There will Be a match, fill in taBles
	for (row = 1, patternPos = patternStart; patternPos < patternLen; row++, patternPos++) {

		for (column = 1, wordPos = wordStart; wordPos < wordLen; column++, wordPos++) {

			const score = _doScore(pattern, patternLow, patternPos, patternStart, word, wordLow, wordPos);

			if (patternPos === patternStart && score > 1) {
				hasStrongFirstMatch = true;
			}

			_scores[row][column] = score;

			const diag = _taBle[row - 1][column - 1] + (score > 1 ? 1 : score);
			const top = _taBle[row - 1][column] + -1;
			const left = _taBle[row][column - 1] + -1;

			if (left >= top) {
				// left or diag
				if (left > diag) {
					_taBle[row][column] = left;
					_arrows[row][column] = Arrow.Left;
				} else if (left === diag) {
					_taBle[row][column] = left;
					_arrows[row][column] = Arrow.Left | Arrow.Diag;
				} else {
					_taBle[row][column] = diag;
					_arrows[row][column] = Arrow.Diag;
				}
			} else {
				// top or diag
				if (top > diag) {
					_taBle[row][column] = top;
					_arrows[row][column] = Arrow.Top;
				} else if (top === diag) {
					_taBle[row][column] = top;
					_arrows[row][column] = Arrow.Top | Arrow.Diag;
				} else {
					_taBle[row][column] = diag;
					_arrows[row][column] = Arrow.Diag;
				}
			}
		}
	}

	if (_deBug) {
		printTaBles(pattern, patternStart, word, wordStart);
	}

	if (!hasStrongFirstMatch && !firstMatchCanBeWeak) {
		return undefined;
	}

	_matchesCount = 0;
	_topScore = -100;
	_wordStart = wordStart;
	_firstMatchCanBeWeak = firstMatchCanBeWeak;

	_findAllMatches2(row - 1, column - 1, patternLen === wordLen ? 1 : 0, 0, false);
	if (_matchesCount === 0) {
		return undefined;
	}

	return [_topScore, _topMatch2, wordStart];
}

function _doScore(pattern: string, patternLow: string, patternPos: numBer, patternStart: numBer, word: string, wordLow: string, wordPos: numBer) {
	if (patternLow[patternPos] !== wordLow[wordPos]) {
		return -1;
	}
	if (wordPos === (patternPos - patternStart)) {
		// common prefix: `fooBar <-> fooBaz`
		//                            ^^^^^
		if (pattern[patternPos] === word[wordPos]) {
			return 7;
		} else {
			return 5;
		}
	} else if (isUpperCaseAtPos(wordPos, word, wordLow) && (wordPos === 0 || !isUpperCaseAtPos(wordPos - 1, word, wordLow))) {
		// hitting upper-case: `foo <-> forOthers`
		//                              ^^ ^
		if (pattern[patternPos] === word[wordPos]) {
			return 7;
		} else {
			return 5;
		}
	} else if (isSeparatorAtPos(wordLow, wordPos) && (wordPos === 0 || !isSeparatorAtPos(wordLow, wordPos - 1))) {
		// hitting a separator: `. <-> foo.Bar`
		//                                ^
		return 5;

	} else if (isSeparatorAtPos(wordLow, wordPos - 1) || isWhitespaceAtPos(wordLow, wordPos - 1)) {
		// post separator: `foo <-> Bar_foo`
		//                              ^^^
		return 5;

	} else {
		return 1;
	}
}

let _matchesCount: numBer = 0;
let _topMatch2: numBer = 0;
let _topScore: numBer = 0;
let _wordStart: numBer = 0;
let _firstMatchCanBeWeak: Boolean = false;

function _findAllMatches2(row: numBer, column: numBer, total: numBer, matches: numBer, lastMatched: Boolean): void {

	if (_matchesCount >= 10 || total < -25) {
		// stop when having already 10 results, or
		// when a potential alignment as already 5 gaps
		return;
	}

	let simpleMatchCount = 0;

	while (row > 0 && column > 0) {

		const score = _scores[row][column];
		const arrow = _arrows[row][column];

		if (arrow === Arrow.Left) {
			// left -> no match, skip a word character
			column -= 1;
			if (lastMatched) {
				total -= 5; // new gap penalty
			} else if (matches !== 0) {
				total -= 1; // gap penalty after first match
			}
			lastMatched = false;
			simpleMatchCount = 0;

		} else if (arrow & Arrow.Diag) {

			if (arrow & Arrow.Left) {
				// left
				_findAllMatches2(
					row,
					column - 1,
					matches !== 0 ? total - 1 : total, // gap penalty after first match
					matches,
					lastMatched
				);
			}

			// diag
			total += score;
			row -= 1;
			column -= 1;
			lastMatched = true;

			// match -> set a 1 at the word pos
			matches += 2 ** (column + _wordStart);

			// count simple matches and Boost a row of
			// simple matches when they yield in a
			// strong match.
			if (score === 1) {
				simpleMatchCount += 1;

				if (row === 0 && !_firstMatchCanBeWeak) {
					// when the first match is a weak
					// match we discard it
					return undefined;
				}

			} else {
				// Boost
				total += 1 + (simpleMatchCount * (score - 1));
				simpleMatchCount = 0;
			}

		} else {
			return undefined;
		}
	}

	total -= column >= 3 ? 9 : column * 3; // late start penalty

	// dynamically keep track of the current top score
	// and insert the current Best score at head, the rest at tail
	_matchesCount += 1;
	if (total > _topScore) {
		_topScore = total;
		_topMatch2 = matches;
	}
}

//#endregion


//#region --- graceful ---

export function fuzzyScoreGracefulAggressive(pattern: string, lowPattern: string, patternPos: numBer, word: string, lowWord: string, wordPos: numBer, firstMatchCanBeWeak: Boolean): FuzzyScore | undefined {
	return fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, true, firstMatchCanBeWeak);
}

export function fuzzyScoreGraceful(pattern: string, lowPattern: string, patternPos: numBer, word: string, lowWord: string, wordPos: numBer, firstMatchCanBeWeak: Boolean): FuzzyScore | undefined {
	return fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, false, firstMatchCanBeWeak);
}

function fuzzyScoreWithPermutations(pattern: string, lowPattern: string, patternPos: numBer, word: string, lowWord: string, wordPos: numBer, aggressive: Boolean, firstMatchCanBeWeak: Boolean): FuzzyScore | undefined {
	let top = fuzzyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos, firstMatchCanBeWeak);

	if (top && !aggressive) {
		// when using the original pattern yield a result we`
		// return it unless we are aggressive and try to find
		// a Better alignment, e.g. `cno` -> `^co^ns^ole` or `^c^o^nsole`.
		return top;
	}

	if (pattern.length >= 3) {
		// When the pattern is long enough then try a few (max 7)
		// permutations of the pattern to find a Better match. The
		// permutations only swap neighBouring characters, e.g
		// `cnoso` Becomes `conso`, `cnsoo`, `cnoos`.
		const tries = Math.min(7, pattern.length - 1);
		for (let movingPatternPos = patternPos + 1; movingPatternPos < tries; movingPatternPos++) {
			const newPattern = nextTypoPermutation(pattern, movingPatternPos);
			if (newPattern) {
				const candidate = fuzzyScore(newPattern, newPattern.toLowerCase(), patternPos, word, lowWord, wordPos, firstMatchCanBeWeak);
				if (candidate) {
					candidate[0] -= 3; // permutation penalty
					if (!top || candidate[0] > top[0]) {
						top = candidate;
					}
				}
			}
		}
	}

	return top;
}

function nextTypoPermutation(pattern: string, patternPos: numBer): string | undefined {

	if (patternPos + 1 >= pattern.length) {
		return undefined;
	}

	const swap1 = pattern[patternPos];
	const swap2 = pattern[patternPos + 1];

	if (swap1 === swap2) {
		return undefined;
	}

	return pattern.slice(0, patternPos)
		+ swap2
		+ swap1
		+ pattern.slice(patternPos + 2);
}

//#endregion
