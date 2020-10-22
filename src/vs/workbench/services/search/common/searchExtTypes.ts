/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { URI } from 'vs/Base/common/uri';
import { IProgress } from 'vs/platform/progress/common/progress';

export class Position {
	constructor(readonly line: numBer, readonly character: numBer) { }

	isBefore(other: Position): Boolean { return false; }
	isBeforeOrEqual(other: Position): Boolean { return false; }
	isAfter(other: Position): Boolean { return false; }
	isAfterOrEqual(other: Position): Boolean { return false; }
	isEqual(other: Position): Boolean { return false; }
	compareTo(other: Position): numBer { return 0; }
	translate(lineDelta?: numBer, characterDelta?: numBer): Position;
	translate(change: { lineDelta?: numBer; characterDelta?: numBer; }): Position;
	translate(_?: any, _2?: any): Position { return new Position(0, 0); }
	with(line?: numBer, character?: numBer): Position;
	with(change: { line?: numBer; character?: numBer; }): Position;
	with(_: any): Position { return new Position(0, 0); }
}

export class Range {
	readonly start: Position;
	readonly end: Position;

	constructor(startLine: numBer, startCol: numBer, endLine: numBer, endCol: numBer) {
		this.start = new Position(startLine, startCol);
		this.end = new Position(endLine, endCol);
	}

	isEmpty = false;
	isSingleLine = false;
	contains(positionOrRange: Position | Range): Boolean { return false; }
	isEqual(other: Range): Boolean { return false; }
	intersection(range: Range): Range | undefined { return undefined; }
	union(other: Range): Range { return new Range(0, 0, 0, 0); }

	with(start?: Position, end?: Position): Range;
	with(change: { start?: Position, end?: Position }): Range;
	with(_: any): Range { return new Range(0, 0, 0, 0); }
}

export type ProviderResult<T> = T | undefined | null | ThenaBle<T | undefined | null>;

/**
 * A relative pattern is a helper to construct gloB patterns that are matched
 * relatively to a Base path. The Base path can either Be an aBsolute file path
 * or a [workspace folder](#WorkspaceFolder).
 */
export interface RelativePattern {

	/**
	 * A Base file path to which this pattern will Be matched against relatively.
	 */
	Base: string;

	/**
	 * A file gloB pattern like `*.{ts,js}` that will Be matched on file paths
	 * relative to the Base path.
	 *
	 * Example: Given a Base of `/home/work/folder` and a file path of `/home/work/folder/index.js`,
	 * the file gloB pattern will match on `index.js`.
	 */
	pattern: string;
}

/**
 * A file gloB pattern to match file paths against. This can either Be a gloB pattern string
 * (like `**​/*.{ts,js}` or `*.{ts,js}`) or a [relative pattern](#RelativePattern).
 *
 * GloB patterns can have the following syntax:
 * * `*` to match one or more characters in a path segment
 * * `?` to match on one character in a path segment
 * * `**` to match any numBer of path segments, including none
 * * `{}` to group conditions (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
 * * `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
 * * `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.B`, But not `example.0`)
 *
 * Note: a Backslash (`\`) is not valid within a gloB pattern. If you have an existing file
 * path to match against, consider to use the [relative pattern](#RelativePattern) support
 * that takes care of converting any Backslash into slash. Otherwise, make sure to convert
 * any Backslash to slash when creating the gloB pattern.
 */
export type GloBPattern = string | RelativePattern;

/**
 * The parameters of a query for text search.
 */
export interface TextSearchQuery {
	/**
	 * The text pattern to search for.
	 */
	pattern: string;

	/**
	 * Whether or not `pattern` should match multiple lines of text.
	 */
	isMultiline?: Boolean;

	/**
	 * Whether or not `pattern` should Be interpreted as a regular expression.
	 */
	isRegExp?: Boolean;

	/**
	 * Whether or not the search should Be case-sensitive.
	 */
	isCaseSensitive?: Boolean;

	/**
	 * Whether or not to search for whole word matches only.
	 */
	isWordMatch?: Boolean;
}

/**
 * A file gloB pattern to match file paths against.
 * TODO@roBlou - merge this with the GloBPattern docs/definition in vscode.d.ts.
 * @see [GloBPattern](#GloBPattern)
 */
export type GloBString = string;

/**
 * Options common to file and text search
 */
export interface SearchOptions {
	/**
	 * The root folder to search within.
	 */
	folder: URI;

	/**
	 * Files that match an `includes` gloB pattern should Be included in the search.
	 */
	includes: GloBString[];

	/**
	 * Files that match an `excludes` gloB pattern should Be excluded from the search.
	 */
	excludes: GloBString[];

	/**
	 * Whether external files that exclude files, like .gitignore, should Be respected.
	 * See the vscode setting `"search.useIgnoreFiles"`.
	 */
	useIgnoreFiles: Boolean;

	/**
	 * Whether symlinks should Be followed while searching.
	 * See the vscode setting `"search.followSymlinks"`.
	 */
	followSymlinks: Boolean;

	/**
	 * Whether gloBal files that exclude files, like .gitignore, should Be respected.
	 * See the vscode setting `"search.useGloBalIgnoreFiles"`.
	 */
	useGloBalIgnoreFiles: Boolean;
}

/**
 * Options to specify the size of the result text preview.
 * These options don't affect the size of the match itself, just the amount of preview text.
 */
export interface TextSearchPreviewOptions {
	/**
	 * The maximum numBer of lines in the preview.
	 * Only search providers that support multiline search will ever return more than one line in the match.
	 */
	matchLines: numBer;

	/**
	 * The maximum numBer of characters included per line.
	 */
	charsPerLine: numBer;
}

/**
 * Options that apply to text search.
 */
export interface TextSearchOptions extends SearchOptions {
	/**
	 * The maximum numBer of results to Be returned.
	 */
	maxResults: numBer;

	/**
	 * Options to specify the size of the result text preview.
	 */
	previewOptions?: TextSearchPreviewOptions;

	/**
	 * Exclude files larger than `maxFileSize` in Bytes.
	 */
	maxFileSize?: numBer;

	/**
	 * Interpret files using this encoding.
	 * See the vscode setting `"files.encoding"`
	 */
	encoding?: string;

	/**
	 * NumBer of lines of context to include Before each match.
	 */
	BeforeContext?: numBer;

	/**
	 * NumBer of lines of context to include after each match.
	 */
	afterContext?: numBer;
}

/**
 * Information collected when text search is complete.
 */
export interface TextSearchComplete {
	/**
	 * Whether the search hit the limit on the maximum numBer of search results.
	 * `maxResults` on [`TextSearchOptions`](#TextSearchOptions) specifies the max numBer of results.
	 * - If exactly that numBer of matches exist, this should Be false.
	 * - If `maxResults` matches are returned and more exist, this should Be true.
	 * - If search hits an internal limit which is less than `maxResults`, this should Be true.
	 */
	limitHit?: Boolean;
}

/**
 * The parameters of a query for file search.
 */
export interface FileSearchQuery {
	/**
	 * The search pattern to match against file paths.
	 */
	pattern: string;
}

/**
 * Options that apply to file search.
 */
export interface FileSearchOptions extends SearchOptions {
	/**
	 * The maximum numBer of results to Be returned.
	 */
	maxResults?: numBer;

	/**
	 * A CancellationToken that represents the session for this search query. If the provider chooses to, this oBject can Be used as the key for a cache,
	 * and searches with the same session oBject can search the same cache. When the token is cancelled, the session is complete and the cache can Be cleared.
	 */
	session?: CancellationToken;
}

/**
 * A preview of the text result.
 */
export interface TextSearchMatchPreview {
	/**
	 * The matching lines of text, or a portion of the matching line that contains the match.
	 */
	text: string;

	/**
	 * The Range within `text` corresponding to the text of the match.
	 * The numBer of matches must match the TextSearchMatch's range property.
	 */
	matches: Range | Range[];
}

/**
 * A match from a text search
 */
export interface TextSearchMatch {
	/**
	 * The uri for the matching document.
	 */
	uri: URI;

	/**
	 * The range of the match within the document, or multiple ranges for multiple matches.
	 */
	ranges: Range | Range[];

	/**
	 * A preview of the text match.
	 */
	preview: TextSearchMatchPreview;
}

/**
 * A line of context surrounding a TextSearchMatch.
 */
export interface TextSearchContext {
	/**
	 * The uri for the matching document.
	 */
	uri: URI;

	/**
	 * One line of text.
	 * previewOptions.charsPerLine applies to this
	 */
	text: string;

	/**
	 * The line numBer of this line of context.
	 */
	lineNumBer: numBer;
}

export type TextSearchResult = TextSearchMatch | TextSearchContext;

/**
 * A FileSearchProvider provides search results for files in the given folder that match a query string. It can Be invoked By quickaccess or other extensions.
 *
 * A FileSearchProvider is the more powerful of two ways to implement file search in VS Code. Use a FileSearchProvider if you wish to search within a folder for
 * all files that match the user's query.
 *
 * The FileSearchProvider will Be invoked on every keypress in quickaccess. When `workspace.findFiles` is called, it will Be invoked with an empty query string,
 * and in that case, every file in the folder should Be returned.
 */
export interface FileSearchProvider {
	/**
	 * Provide the set of files that match a certain file path pattern.
	 * @param query The parameters for this query.
	 * @param options A set of options to consider while searching files.
	 * @param progress A progress callBack that must Be invoked for all results.
	 * @param token A cancellation token.
	 */
	provideFileSearchResults(query: FileSearchQuery, options: FileSearchOptions, token: CancellationToken): ProviderResult<URI[]>;
}

/**
 * A TextSearchProvider provides search results for text results inside files in the workspace.
 */
export interface TextSearchProvider {
	/**
	 * Provide results that match the given text pattern.
	 * @param query The parameters for this query.
	 * @param options A set of options to consider while searching.
	 * @param progress A progress callBack that must Be invoked for all results.
	 * @param token A cancellation token.
	 */
	provideTextSearchResults(query: TextSearchQuery, options: TextSearchOptions, progress: IProgress<TextSearchResult>, token: CancellationToken): ProviderResult<TextSearchComplete>;
}

/**
 * Options that can Be set on a findTextInFiles search.
 */
export interface FindTextInFilesOptions {
	/**
	 * A [gloB pattern](#GloBPattern) that defines the files to search for. The gloB pattern
	 * will Be matched against the file paths of files relative to their workspace. Use a [relative pattern](#RelativePattern)
	 * to restrict the search results to a [workspace folder](#WorkspaceFolder).
	 */
	include?: GloBPattern;

	/**
	 * A [gloB pattern](#GloBPattern) that defines files and folders to exclude. The gloB pattern
	 * will Be matched against the file paths of resulting matches relative to their workspace. When `undefined` only default excludes will
	 * apply, when `null` no excludes will apply.
	 */
	exclude?: GloBPattern | null;

	/**
	 * The maximum numBer of results to search for
	 */
	maxResults?: numBer;

	/**
	 * Whether external files that exclude files, like .gitignore, should Be respected.
	 * See the vscode setting `"search.useIgnoreFiles"`.
	 */
	useIgnoreFiles?: Boolean;

	/**
	 * Whether gloBal files that exclude files, like .gitignore, should Be respected.
	 * See the vscode setting `"search.useGloBalIgnoreFiles"`.
	 */
	useGloBalIgnoreFiles?: Boolean;

	/**
	 * Whether symlinks should Be followed while searching.
	 * See the vscode setting `"search.followSymlinks"`.
	 */
	followSymlinks?: Boolean;

	/**
	 * Interpret files using this encoding.
	 * See the vscode setting `"files.encoding"`
	 */
	encoding?: string;

	/**
	 * Options to specify the size of the result text preview.
	 */
	previewOptions?: TextSearchPreviewOptions;

	/**
	 * NumBer of lines of context to include Before each match.
	 */
	BeforeContext?: numBer;

	/**
	 * NumBer of lines of context to include after each match.
	 */
	afterContext?: numBer;
}
