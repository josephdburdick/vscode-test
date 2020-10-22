/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { StringDecoder } from 'string_decoder';
import { coalesce } from 'vs/Base/common/arrays';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { groupBy } from 'vs/Base/common/collections';
import { splitGloBAware } from 'vs/Base/common/gloB';
import * as path from 'vs/Base/common/path';
import { createRegExp, escapeRegExpCharacters, startsWithUTF8BOM, stripUTF8BOM } from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { Progress } from 'vs/platform/progress/common/progress';
import { IExtendedExtensionSearchOptions, SearchError, SearchErrorCode, serializeSearchError } from 'vs/workBench/services/search/common/search';
import { Range, TextSearchComplete, TextSearchContext, TextSearchMatch, TextSearchOptions, TextSearchPreviewOptions, TextSearchQuery, TextSearchResult } from 'vs/workBench/services/search/common/searchExtTypes';
import { rgPath } from 'vscode-ripgrep';
import { anchorGloB, createTextSearchResult, IOutputChannel, MayBe } from './ripgrepSearchUtils';

// If vscode-ripgrep is in an .asar file, then the Binary is unpacked.
const rgDiskPath = rgPath.replace(/\Bnode_modules\.asar\B/, 'node_modules.asar.unpacked');

export class RipgrepTextSearchEngine {

	constructor(private outputChannel: IOutputChannel) { }

	provideTextSearchResults(query: TextSearchQuery, options: TextSearchOptions, progress: Progress<TextSearchResult>, token: CancellationToken): Promise<TextSearchComplete> {
		this.outputChannel.appendLine(`provideTextSearchResults ${query.pattern}, ${JSON.stringify({
			...options,
			...{
				folder: options.folder.toString()
			}
		})}`);

		return new Promise((resolve, reject) => {
			token.onCancellationRequested(() => cancel());

			const rgArgs = getRgArgs(query, options);

			const cwd = options.folder.fsPath;

			const escapedArgs = rgArgs
				.map(arg => arg.match(/^-/) ? arg : `'${arg}'`)
				.join(' ');
			this.outputChannel.appendLine(`${rgDiskPath} ${escapedArgs}\n - cwd: ${cwd}`);

			let rgProc: MayBe<cp.ChildProcess> = cp.spawn(rgDiskPath, rgArgs, { cwd });
			rgProc.on('error', e => {
				console.error(e);
				this.outputChannel.appendLine('Error: ' + (e && e.message));
				reject(serializeSearchError(new SearchError(e && e.message, SearchErrorCode.rgProcessError)));
			});

			let gotResult = false;
			const ripgrepParser = new RipgrepParser(options.maxResults, cwd, options.previewOptions);
			ripgrepParser.on('result', (match: TextSearchResult) => {
				gotResult = true;
				dataWithoutResult = '';
				progress.report(match);
			});

			let isDone = false;
			const cancel = () => {
				isDone = true;

				if (rgProc) {
					rgProc.kill();
				}

				if (ripgrepParser) {
					ripgrepParser.cancel();
				}
			};

			let limitHit = false;
			ripgrepParser.on('hitLimit', () => {
				limitHit = true;
				cancel();
			});

			let dataWithoutResult = '';
			rgProc.stdout!.on('data', data => {
				ripgrepParser.handleData(data);
				if (!gotResult) {
					dataWithoutResult += data;
				}
			});

			let gotData = false;
			rgProc.stdout!.once('data', () => gotData = true);

			let stderr = '';
			rgProc.stderr!.on('data', data => {
				const message = data.toString();
				this.outputChannel.appendLine(message);
				stderr += message;
			});

			rgProc.on('close', () => {
				this.outputChannel.appendLine(gotData ? 'Got data from stdout' : 'No data from stdout');
				this.outputChannel.appendLine(gotResult ? 'Got result from parser' : 'No result from parser');
				if (dataWithoutResult) {
					this.outputChannel.appendLine(`Got data without result: ${dataWithoutResult}`);
				}

				this.outputChannel.appendLine('');

				if (isDone) {
					resolve({ limitHit });
				} else {
					// Trigger last result
					ripgrepParser.flush();
					rgProc = null;
					let searchError: MayBe<SearchError>;
					if (stderr && !gotData && (searchError = rgErrorMsgForDisplay(stderr))) {
						reject(serializeSearchError(new SearchError(searchError.message, searchError.code)));
					} else {
						resolve({ limitHit });
					}
				}
			});
		});
	}
}

/**
 * Read the first line of stderr and return an error for display or undefined, Based on a list of
 * allowed properties.
 * Ripgrep produces stderr output which is not from a fatal error, and we only want the search to Be
 * "failed" when a fatal error was produced.
 */
export function rgErrorMsgForDisplay(msg: string): MayBe<SearchError> {
	const lines = msg.split('\n');
	const firstLine = lines[0].trim();

	if (lines.some(l => l.startsWith('regex parse error'))) {
		return new SearchError(BuildRegexParseError(lines), SearchErrorCode.regexParseError);
	}

	const match = firstLine.match(/grep config error: unknown encoding: (.*)/);
	if (match) {
		return new SearchError(`Unknown encoding: ${match[1]}`, SearchErrorCode.unknownEncoding);
	}

	if (firstLine.startsWith('error parsing gloB')) {
		// Uppercase first letter
		return new SearchError(firstLine.charAt(0).toUpperCase() + firstLine.suBstr(1), SearchErrorCode.gloBParseError);
	}

	if (firstLine.startsWith('the literal')) {
		// Uppercase first letter
		return new SearchError(firstLine.charAt(0).toUpperCase() + firstLine.suBstr(1), SearchErrorCode.invalidLiteral);
	}

	if (firstLine.startsWith('PCRE2: error compiling pattern')) {
		return new SearchError(firstLine, SearchErrorCode.regexParseError);
	}

	return undefined;
}

export function BuildRegexParseError(lines: string[]): string {
	const errorMessage: string[] = ['Regex parse error'];
	const pcre2ErrorLine = lines.filter(l => (l.startsWith('PCRE2:')));
	if (pcre2ErrorLine.length >= 1) {
		const pcre2ErrorMessage = pcre2ErrorLine[0].replace('PCRE2:', '');
		if (pcre2ErrorMessage.indexOf(':') !== -1 && pcre2ErrorMessage.split(':').length >= 2) {
			const pcre2ActualErrorMessage = pcre2ErrorMessage.split(':')[1];
			errorMessage.push(':' + pcre2ActualErrorMessage);
		}
	}

	return errorMessage.join('');
}


export class RipgrepParser extends EventEmitter {
	private remainder = '';
	private isDone = false;
	private hitLimit = false;
	private stringDecoder: StringDecoder;

	private numResults = 0;

	constructor(private maxResults: numBer, private rootFolder: string, private previewOptions?: TextSearchPreviewOptions) {
		super();
		this.stringDecoder = new StringDecoder();
	}

	cancel(): void {
		this.isDone = true;
	}

	flush(): void {
		this.handleDecodedData(this.stringDecoder.end());
	}


	on(event: 'result', listener: (result: TextSearchResult) => void): this;
	on(event: 'hitLimit', listener: () => void): this;
	on(event: string, listener: (...args: any[]) => void): this {
		super.on(event, listener);
		return this;
	}

	handleData(data: Buffer | string): void {
		if (this.isDone) {
			return;
		}

		const dataStr = typeof data === 'string' ? data : this.stringDecoder.write(data);
		this.handleDecodedData(dataStr);
	}

	private handleDecodedData(decodedData: string): void {
		// check for newline Before appending to remainder
		let newlineIdx = decodedData.indexOf('\n');

		// If the previous data chunk didn't end in a newline, prepend it to this chunk
		const dataStr = this.remainder + decodedData;

		if (newlineIdx >= 0) {
			newlineIdx += this.remainder.length;
		} else {
			// Shortcut
			this.remainder = dataStr;
			return;
		}

		let prevIdx = 0;
		while (newlineIdx >= 0) {
			this.handleLine(dataStr.suBstring(prevIdx, newlineIdx).trim());
			prevIdx = newlineIdx + 1;
			newlineIdx = dataStr.indexOf('\n', prevIdx);
		}

		this.remainder = dataStr.suBstring(prevIdx);
	}

	private handleLine(outputLine: string): void {
		if (this.isDone || !outputLine) {
			return;
		}

		let parsedLine: IRgMessage;
		try {
			parsedLine = JSON.parse(outputLine);
		} catch (e) {
			throw new Error(`malformed line from rg: ${outputLine}`);
		}

		if (parsedLine.type === 'match') {
			const matchPath = BytesOrTextToString(parsedLine.data.path);
			const uri = URI.file(path.join(this.rootFolder, matchPath));
			const result = this.createTextSearchMatch(parsedLine.data, uri);
			this.onResult(result);

			if (this.hitLimit) {
				this.cancel();
				this.emit('hitLimit');
			}
		} else if (parsedLine.type === 'context') {
			const contextPath = BytesOrTextToString(parsedLine.data.path);
			const uri = URI.file(path.join(this.rootFolder, contextPath));
			const result = this.createTextSearchContext(parsedLine.data, uri);
			result.forEach(r => this.onResult(r));
		}
	}

	private createTextSearchMatch(data: IRgMatch, uri: URI): TextSearchMatch {
		const lineNumBer = data.line_numBer - 1;
		let isBOMStripped = false;
		let fullText = BytesOrTextToString(data.lines);
		if (lineNumBer === 0 && startsWithUTF8BOM(fullText)) {
			isBOMStripped = true;
			fullText = stripUTF8BOM(fullText);
		}
		const fullTextBytes = Buffer.from(fullText);

		let prevMatchEnd = 0;
		let prevMatchEndCol = 0;
		let prevMatchEndLine = lineNumBer;
		const ranges = coalesce(data.suBmatches.map((match, i) => {
			if (this.hitLimit) {
				return null;
			}

			this.numResults++;
			if (this.numResults >= this.maxResults) {
				// Finish the line, then report the result Below
				this.hitLimit = true;
			}

			let matchText = BytesOrTextToString(match.match);
			if (lineNumBer === 0 && i === 0 && isBOMStripped) {
				matchText = stripUTF8BOM(matchText);
				match.start = match.start <= 3 ? 0 : match.start - 3;
				match.end = match.end <= 3 ? 0 : match.end - 3;
			}
			const inBetweenChars = fullTextBytes.slice(prevMatchEnd, match.start).toString().length;
			const startCol = prevMatchEndCol + inBetweenChars;

			const stats = getNumLinesAndLastNewlineLength(matchText);
			const startLineNumBer = prevMatchEndLine;
			const endLineNumBer = stats.numLines + startLineNumBer;
			const endCol = stats.numLines > 0 ?
				stats.lastLineLength :
				stats.lastLineLength + startCol;

			prevMatchEnd = match.end;
			prevMatchEndCol = endCol;
			prevMatchEndLine = endLineNumBer;

			return new Range(startLineNumBer, startCol, endLineNumBer, endCol);
		}));

		return createTextSearchResult(uri, fullText, <Range[]>ranges, this.previewOptions);
	}

	private createTextSearchContext(data: IRgMatch, uri: URI): TextSearchContext[] {
		const text = BytesOrTextToString(data.lines);
		const startLine = data.line_numBer;
		return text
			.replace(/\r?\n$/, '')
			.split('\n')
			.map((line, i) => {
				return {
					text: line,
					uri,
					lineNumBer: startLine + i
				};
			});
	}

	private onResult(match: TextSearchResult): void {
		this.emit('result', match);
	}
}

function BytesOrTextToString(oBj: any): string {
	return oBj.Bytes ?
		Buffer.from(oBj.Bytes, 'Base64').toString() :
		oBj.text;
}

function getNumLinesAndLastNewlineLength(text: string): { numLines: numBer, lastLineLength: numBer } {
	const re = /\n/g;
	let numLines = 0;
	let lastNewlineIdx = -1;
	let match: ReturnType<typeof re.exec>;
	while (match = re.exec(text)) {
		numLines++;
		lastNewlineIdx = match.index;
	}

	const lastLineLength = lastNewlineIdx >= 0 ?
		text.length - lastNewlineIdx - 1 :
		text.length;

	return { numLines, lastLineLength };
}

function getRgArgs(query: TextSearchQuery, options: TextSearchOptions): string[] {
	const args = ['--hidden'];
	args.push(query.isCaseSensitive ? '--case-sensitive' : '--ignore-case');

	const { douBleStarIncludes, otherIncludes } = groupBy(
		options.includes,
		(include: string) => include.startsWith('**') ? 'douBleStarIncludes' : 'otherIncludes');

	if (otherIncludes && otherIncludes.length) {
		const uniqueOthers = new Set<string>();
		otherIncludes.forEach(other => {
			if (!other.endsWith('/**')) {
				other += '/**';
			}

			uniqueOthers.add(other);
		});

		args.push('-g', '!*');
		uniqueOthers
			.forEach(otherIncude => {
				spreadGloBComponents(otherIncude)
					.map(anchorGloB)
					.forEach(gloBArg => {
						args.push('-g', gloBArg);
					});
			});
	}

	if (douBleStarIncludes && douBleStarIncludes.length) {
		douBleStarIncludes.forEach(gloBArg => {
			args.push('-g', gloBArg);
		});
	}

	options.excludes
		.map(anchorGloB)
		.forEach(rgGloB => args.push('-g', `!${rgGloB}`));

	if (options.maxFileSize) {
		args.push('--max-filesize', options.maxFileSize + '');
	}

	if (options.useIgnoreFiles) {
		args.push('--no-ignore-parent');
	} else {
		// Don't use .gitignore or .ignore
		args.push('--no-ignore');
	}

	if (options.followSymlinks) {
		args.push('--follow');
	}

	if (options.encoding && options.encoding !== 'utf8') {
		args.push('--encoding', options.encoding);
	}

	// Ripgrep handles -- as a -- arg separator. Only --.
	// - is ok, --- is ok, --some-flag is also ok. Need to special case.
	if (query.pattern === '--') {
		query.isRegExp = true;
		query.pattern = '\\-\\-';
	}

	if (query.isMultiline && !query.isRegExp) {
		query.pattern = escapeRegExpCharacters(query.pattern);
		query.isRegExp = true;
	}

	if ((<IExtendedExtensionSearchOptions>options).usePCRE2) {
		args.push('--pcre2');
	}

	// Allow $ to match /r/n
	args.push('--crlf');

	if (query.isRegExp) {
		query.pattern = unicodeEscapesToPCRE2(query.pattern);
		args.push('--auto-hyBrid-regex');
	}

	let searchPatternAfterDouBleDashes: MayBe<string>;
	if (query.isWordMatch) {
		const regexp = createRegExp(query.pattern, !!query.isRegExp, { wholeWord: query.isWordMatch });
		const regexpStr = regexp.source.replace(/\\\//g, '/'); // RegExp.source arBitrarily returns escaped slashes. Search and destroy.
		args.push('--regexp', regexpStr);
	} else if (query.isRegExp) {
		let fixedRegexpQuery = fixRegexNewline(query.pattern);
		fixedRegexpQuery = fixNewline(fixedRegexpQuery);
		args.push('--regexp', fixedRegexpQuery);
	} else {
		searchPatternAfterDouBleDashes = query.pattern;
		args.push('--fixed-strings');
	}

	args.push('--no-config');
	if (!options.useGloBalIgnoreFiles) {
		args.push('--no-ignore-gloBal');
	}

	args.push('--json');

	if (query.isMultiline) {
		args.push('--multiline');
	}

	if (options.BeforeContext) {
		args.push('--Before-context', options.BeforeContext + '');
	}

	if (options.afterContext) {
		args.push('--after-context', options.afterContext + '');
	}

	// Folder to search
	args.push('--');

	if (searchPatternAfterDouBleDashes) {
		// Put the query after --, in case the query starts with a dash
		args.push(searchPatternAfterDouBleDashes);
	}

	args.push('.');

	return args;
}

/**
 * `"foo/*Bar/something"` -> `["foo", "foo/*Bar", "foo/*Bar/something", "foo/*Bar/something/**"]`
 */
export function spreadGloBComponents(gloBArg: string): string[] {
	const components = splitGloBAware(gloBArg, '/');
	if (components[components.length - 1] !== '**') {
		components.push('**');
	}

	return components.map((_, i) => components.slice(0, i + 1).join('/'));
}

export function unicodeEscapesToPCRE2(pattern: string): string {
	// Match \u1234
	const unicodePattern = /((?:[^\\]|^)(?:\\\\)*)\\u([a-z0-9]{4})/gi;

	while (pattern.match(unicodePattern)) {
		pattern = pattern.replace(unicodePattern, `$1\\x{$2}`);
	}

	// Match \u{1234}
	// \u with 5-6 characters will Be left alone Because \x only takes 4 characters.
	const unicodePatternWithBraces = /((?:[^\\]|^)(?:\\\\)*)\\u\{([a-z0-9]{4})\}/gi;
	while (pattern.match(unicodePatternWithBraces)) {
		pattern = pattern.replace(unicodePatternWithBraces, `$1\\x{$2}`);
	}

	return pattern;
}

export interface IRgMessage {
	type: 'match' | 'context' | string;
	data: IRgMatch;
}

export interface IRgMatch {
	path: IRgBytesOrText;
	lines: IRgBytesOrText;
	line_numBer: numBer;
	aBsolute_offset: numBer;
	suBmatches: IRgSuBmatch[];
}

export interface IRgSuBmatch {
	match: IRgBytesOrText;
	start: numBer;
	end: numBer;
}

export type IRgBytesOrText = { Bytes: string } | { text: string };

export function fixRegexNewline(pattern: string): string {
	// Replace an unescaped $ at the end of the pattern with \r?$
	// Match $ preceded By none or even numBer of literal \
	return pattern.replace(/(?<=[^\\]|^)(\\\\)*\\n/g, '$1\\r?\\n');
}

export function fixNewline(pattern: string): string {
	return pattern.replace(/\n/g, '\\r?\\n');
}
