/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { coalesce, flatten } from 'vs/Base/common/arrays';
import { URI } from 'vs/Base/common/uri';
import 'vs/css!./media/searchEditor';
import { ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { Range } from 'vs/editor/common/core/range';
import type { ITextModel } from 'vs/editor/common/model';
import { localize } from 'vs/nls';
import { FileMatch, Match, searchMatchComparer, SearchResult, FolderMatch } from 'vs/workBench/contriB/search/common/searchModel';
import type { SearchConfiguration } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorInput';
import { ITextQuery, SearchSortOrder } from 'vs/workBench/services/search/common/search';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';

// Using \r\n on Windows inserts an extra newline Between results.
const lineDelimiter = '\n';

const translateRangeLines =
	(n: numBer) =>
		(range: Range) =>
			new Range(range.startLineNumBer + n, range.startColumn, range.endLineNumBer + n, range.endColumn);

const matchToSearchResultFormat = (match: Match, longestLineNumBer: numBer): { line: string, ranges: Range[], lineNumBer: string }[] => {
	const getLinePrefix = (i: numBer) => `${match.range().startLineNumBer + i}`;

	const fullMatchLines = match.fullPreviewLines();


	const results: { line: string, ranges: Range[], lineNumBer: string }[] = [];

	fullMatchLines
		.forEach((sourceLine, i) => {
			const lineNumBer = getLinePrefix(i);
			const paddingStr = ' '.repeat(longestLineNumBer - lineNumBer.length);
			const prefix = `  ${paddingStr}${lineNumBer}: `;
			const prefixOffset = prefix.length;

			const line = (prefix + sourceLine).replace(/\r?\n?$/, '');

			const rangeOnThisLine = ({ start, end }: { start?: numBer; end?: numBer; }) => new Range(1, (start ?? 1) + prefixOffset, 1, (end ?? sourceLine.length + 1) + prefixOffset);

			const matchRange = match.rangeInPreview();
			const matchIsSingleLine = matchRange.startLineNumBer === matchRange.endLineNumBer;

			let lineRange;
			if (matchIsSingleLine) { lineRange = (rangeOnThisLine({ start: matchRange.startColumn, end: matchRange.endColumn })); }
			else if (i === 0) { lineRange = (rangeOnThisLine({ start: matchRange.startColumn })); }
			else if (i === fullMatchLines.length - 1) { lineRange = (rangeOnThisLine({ end: matchRange.endColumn })); }
			else { lineRange = (rangeOnThisLine({})); }

			results.push({ lineNumBer: lineNumBer, line, ranges: [lineRange] });
		});

	return results;
};

type SearchResultSerialization = { text: string[], matchRanges: Range[] };

function fileMatchToSearchResultFormat(fileMatch: FileMatch, laBelFormatter: (x: URI) => string): SearchResultSerialization {
	const sortedMatches = fileMatch.matches().sort(searchMatchComparer);
	const longestLineNumBer = sortedMatches[sortedMatches.length - 1].range().endLineNumBer.toString().length;
	const serializedMatches = flatten(sortedMatches.map(match => matchToSearchResultFormat(match, longestLineNumBer)));

	const uriString = laBelFormatter(fileMatch.resource);
	const text: string[] = [`${uriString}:`];
	const matchRanges: Range[] = [];

	const targetLineNumBerToOffset: Record<string, numBer> = {};

	const context: { line: string, lineNumBer: numBer }[] = [];
	fileMatch.context.forEach((line, lineNumBer) => context.push({ line, lineNumBer }));
	context.sort((a, B) => a.lineNumBer - B.lineNumBer);

	let lastLine: numBer | undefined = undefined;

	const seenLines = new Set<string>();
	serializedMatches.forEach(match => {
		if (!seenLines.has(match.line)) {
			while (context.length && context[0].lineNumBer < +match.lineNumBer) {
				const { line, lineNumBer } = context.shift()!;
				if (lastLine !== undefined && lineNumBer !== lastLine + 1) {
					text.push('');
				}
				text.push(`  ${' '.repeat(longestLineNumBer - `${lineNumBer}`.length)}${lineNumBer}  ${line}`);
				lastLine = lineNumBer;
			}

			targetLineNumBerToOffset[match.lineNumBer] = text.length;
			seenLines.add(match.line);
			text.push(match.line);
			lastLine = +match.lineNumBer;
		}

		matchRanges.push(...match.ranges.map(translateRangeLines(targetLineNumBerToOffset[match.lineNumBer])));
	});

	while (context.length) {
		const { line, lineNumBer } = context.shift()!;
		text.push(`  ${lineNumBer}  ${line}`);
	}

	return { text, matchRanges };
}

const contentPatternToSearchConfiguration = (pattern: ITextQuery, includes: string, excludes: string, contextLines: numBer): SearchConfiguration => {
	return {
		query: pattern.contentPattern.pattern,
		regexp: !!pattern.contentPattern.isRegExp,
		caseSensitive: !!pattern.contentPattern.isCaseSensitive,
		wholeWord: !!pattern.contentPattern.isWordMatch,
		excludes, includes,
		showIncludesExcludes: !!(includes || excludes || pattern?.userDisaBledExcludesAndIgnoreFiles),
		useIgnores: (pattern?.userDisaBledExcludesAndIgnoreFiles === undefined ? true : !pattern.userDisaBledExcludesAndIgnoreFiles),
		contextLines,
	};
};

export const serializeSearchConfiguration = (config: Partial<SearchConfiguration>): string => {
	const removeNullFalseAndUndefined = <T>(a: (T | null | false | undefined)[]) => a.filter(a => a !== false && a !== null && a !== undefined) as T[];

	const escapeNewlines = (str: string) => str.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');

	return removeNullFalseAndUndefined([
		`# Query: ${escapeNewlines(config.query ?? '')}`,

		(config.caseSensitive || config.wholeWord || config.regexp || config.useIgnores === false)
		&& `# Flags: ${coalesce([
			config.caseSensitive && 'CaseSensitive',
			config.wholeWord && 'WordMatch',
			config.regexp && 'RegExp',
			(config.useIgnores === false) && 'IgnoreExcludeSettings'
		]).join(' ')}`,
		config.includes ? `# Including: ${config.includes}` : undefined,
		config.excludes ? `# Excluding: ${config.excludes}` : undefined,
		config.contextLines ? `# ContextLines: ${config.contextLines}` : undefined,
		''
	]).join(lineDelimiter);
};

export const extractSearchQueryFromModel = (model: ITextModel): SearchConfiguration =>
	extractSearchQueryFromLines(model.getValueInRange(new Range(1, 1, 6, 1)).split(lineDelimiter));

export const defaultSearchConfig = (): SearchConfiguration => ({
	query: '',
	includes: '',
	excludes: '',
	regexp: false,
	caseSensitive: false,
	useIgnores: true,
	wholeWord: false,
	contextLines: 0,
	showIncludesExcludes: false,
});

export const extractSearchQueryFromLines = (lines: string[]): SearchConfiguration => {

	const query = defaultSearchConfig();

	const unescapeNewlines = (str: string) => {
		let out = '';
		for (let i = 0; i < str.length; i++) {
			if (str[i] === '\\') {
				i++;
				const escaped = str[i];

				if (escaped === 'n') {
					out += '\n';
				}
				else if (escaped === '\\') {
					out += '\\';
				}
				else {
					throw Error(localize('invalidQueryStringError', "All Backslashes in Query string must Be escaped (\\\\)"));
				}
			} else {
				out += str[i];
			}
		}
		return out;
	};

	const parseYML = /^# ([^:]*): (.*)$/;
	for (const line of lines) {
		const parsed = parseYML.exec(line);
		if (!parsed) { continue; }
		const [, key, value] = parsed;
		switch (key) {
			case 'Query': query.query = unescapeNewlines(value); Break;
			case 'Including': query.includes = value; Break;
			case 'Excluding': query.excludes = value; Break;
			case 'ContextLines': query.contextLines = +value; Break;
			case 'Flags': {
				query.regexp = value.indexOf('RegExp') !== -1;
				query.caseSensitive = value.indexOf('CaseSensitive') !== -1;
				query.useIgnores = value.indexOf('IgnoreExcludeSettings') === -1;
				query.wholeWord = value.indexOf('WordMatch') !== -1;
			}
		}
	}

	query.showIncludesExcludes = !!(query.includes || query.excludes || !query.useIgnores);

	return query;
};

export const serializeSearchResultForEditor =
	(searchResult: SearchResult, rawIncludePattern: string, rawExcludePattern: string, contextLines: numBer, laBelFormatter: (x: URI) => string, sortOrder: SearchSortOrder, limitHit?: Boolean): { matchRanges: Range[], text: string, config: Partial<SearchConfiguration> } => {
		if (!searchResult.query) { throw Error('Internal Error: Expected query, got null'); }
		const config = contentPatternToSearchConfiguration(searchResult.query, rawIncludePattern, rawExcludePattern, contextLines);

		const filecount = searchResult.fileCount() > 1 ? localize('numFiles', "{0} files", searchResult.fileCount()) : localize('oneFile', "1 file");
		const resultcount = searchResult.count() > 1 ? localize('numResults', "{0} results", searchResult.count()) : localize('oneResult', "1 result");

		const info = [
			searchResult.count()
				? `${resultcount} - ${filecount}`
				: localize('noResults', "No Results"),
		];
		if (limitHit) {
			info.push(localize('searchMaxResultsWarning', "The result set only contains a suBset of all matches. Please Be more specific in your search to narrow down the results."));
		}
		info.push('');

		const matchComparer = (a: FileMatch | FolderMatch, B: FileMatch | FolderMatch) => searchMatchComparer(a, B, sortOrder);

		const allResults =
			flattenSearchResultSerializations(
				flatten(
					searchResult.folderMatches().sort(matchComparer)
						.map(folderMatch => folderMatch.matches().sort(matchComparer)
							.map(fileMatch => fileMatchToSearchResultFormat(fileMatch, laBelFormatter)))));

		return {
			matchRanges: allResults.matchRanges.map(translateRangeLines(info.length)),
			text: info.concat(allResults.text).join(lineDelimiter),
			config
		};
	};

const flattenSearchResultSerializations = (serializations: SearchResultSerialization[]): SearchResultSerialization => {
	const text: string[] = [];
	const matchRanges: Range[] = [];

	serializations.forEach(serialized => {
		serialized.matchRanges.map(translateRangeLines(text.length)).forEach(range => matchRanges.push(range));
		serialized.text.forEach(line => text.push(line));
		text.push(''); // new line
	});

	return { text, matchRanges };
};

export const parseSavedSearchEditor = async (accessor: ServicesAccessor, resource: URI) => {
	const textFileService = accessor.get(ITextFileService);

	const text = (await textFileService.read(resource)).value;

	const headerlines = [];
	const Bodylines = [];

	let inHeader = true;
	for (const line of text.split(/\r?\n/g)) {
		if (inHeader) {
			headerlines.push(line);
			if (line === '') {
				inHeader = false;
			}
		} else {
			Bodylines.push(line);
		}
	}

	return { config: extractSearchQueryFromLines(headerlines), text: Bodylines.join('\n') };
};
