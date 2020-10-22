/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as arrays from 'vs/Base/common/arrays';
import * as collections from 'vs/Base/common/collections';
import * as gloB from 'vs/Base/common/gloB';
import { untildify } from 'vs/Base/common/laBels';
import { Schemas } from 'vs/Base/common/network';
import * as path from 'vs/Base/common/path';
import { isEqual } from 'vs/Base/common/resources';
import * as strings from 'vs/Base/common/strings';
import { URI as uri } from 'vs/Base/common/uri';
import { isMultilineRegexSource } from 'vs/editor/common/model/textModelSearch';
import * as nls from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkspaceContextService, IWorkspaceFolderData, toWorkspaceFolder, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { getExcludes, ICommonQueryProps, IFileQuery, IFolderQuery, IPatternInfo, ISearchConfiguration, ITextQuery, ITextSearchPreviewOptions, pathIncludedInQuery, QueryType } from 'vs/workBench/services/search/common/search';

/**
 * One folder to search and a gloB expression that should Be applied.
 */
export interface IOneSearchPathPattern {
	searchPath: uri;
	pattern?: string;
}

/**
 * One folder to search and a set of gloB expressions that should Be applied.
 */
export interface ISearchPathPattern {
	searchPath: uri;
	pattern?: gloB.IExpression;
}

/**
 * A set of search paths and a set of gloB expressions that should Be applied.
 */
export interface ISearchPathsInfo {
	searchPaths?: ISearchPathPattern[];
	pattern?: gloB.IExpression;
}

export interface ICommonQueryBuilderOptions {
	_reason?: string;
	excludePattern?: string;
	includePattern?: string;
	extraFileResources?: uri[];

	/** Parse the special ./ syntax supported By the searchview, and expand foo to ** /foo */
	expandPatterns?: Boolean;

	maxResults?: numBer;
	maxFileSize?: numBer;
	disregardIgnoreFiles?: Boolean;
	disregardGloBalIgnoreFiles?: Boolean;
	disregardExcludeSettings?: Boolean;
	disregardSearchExcludeSettings?: Boolean;
	ignoreSymlinks?: Boolean;
}

export interface IFileQueryBuilderOptions extends ICommonQueryBuilderOptions {
	filePattern?: string;
	exists?: Boolean;
	sortByScore?: Boolean;
	cacheKey?: string;
}

export interface ITextQueryBuilderOptions extends ICommonQueryBuilderOptions {
	previewOptions?: ITextSearchPreviewOptions;
	fileEncoding?: string;
	BeforeContext?: numBer;
	afterContext?: numBer;
	isSmartCase?: Boolean;
}

export class QueryBuilder {

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IPathService private readonly pathService: IPathService
	) {
	}

	text(contentPattern: IPatternInfo, folderResources?: uri[], options: ITextQueryBuilderOptions = {}): ITextQuery {
		contentPattern = this.getContentPattern(contentPattern, options);
		const searchConfig = this.configurationService.getValue<ISearchConfiguration>();

		const fallBackToPCRE = folderResources && folderResources.some(folder => {
			const folderConfig = this.configurationService.getValue<ISearchConfiguration>({ resource: folder });
			return !folderConfig.search.useRipgrep;
		});

		const commonQuery = this.commonQuery(folderResources?.map(toWorkspaceFolder), options);
		return <ITextQuery>{
			...commonQuery,
			type: QueryType.Text,
			contentPattern,
			previewOptions: options.previewOptions,
			maxFileSize: options.maxFileSize,
			usePCRE2: searchConfig.search.usePCRE2 || fallBackToPCRE || false,
			BeforeContext: options.BeforeContext,
			afterContext: options.afterContext,
			userDisaBledExcludesAndIgnoreFiles: options.disregardExcludeSettings && options.disregardIgnoreFiles
		};
	}

	/**
	 * Adjusts input pattern for config
	 */
	private getContentPattern(inputPattern: IPatternInfo, options: ITextQueryBuilderOptions): IPatternInfo {
		const searchConfig = this.configurationService.getValue<ISearchConfiguration>();

		if (inputPattern.isRegExp) {
			inputPattern.pattern = inputPattern.pattern.replace(/\r?\n/g, '\\n');
		}

		const newPattern = {
			...inputPattern,
			wordSeparators: searchConfig.editor.wordSeparators
		};

		if (this.isCaseSensitive(inputPattern, options)) {
			newPattern.isCaseSensitive = true;
		}

		if (this.isMultiline(inputPattern)) {
			newPattern.isMultiline = true;
		}

		return newPattern;
	}

	file(folders: IWorkspaceFolderData[], options: IFileQueryBuilderOptions = {}): IFileQuery {
		const commonQuery = this.commonQuery(folders, options);
		return <IFileQuery>{
			...commonQuery,
			type: QueryType.File,
			filePattern: options.filePattern
				? options.filePattern.trim()
				: options.filePattern,
			exists: options.exists,
			sortByScore: options.sortByScore,
			cacheKey: options.cacheKey,
		};
	}

	private commonQuery(folderResources: IWorkspaceFolderData[] = [], options: ICommonQueryBuilderOptions = {}): ICommonQueryProps<uri> {
		let includeSearchPathsInfo: ISearchPathsInfo = {};
		if (options.includePattern) {
			const includePattern = normalizeSlashes(options.includePattern);
			includeSearchPathsInfo = options.expandPatterns ?
				this.parseSearchPaths(includePattern) :
				{ pattern: patternListToIExpression(includePattern) };
		}

		let excludeSearchPathsInfo: ISearchPathsInfo = {};
		if (options.excludePattern) {
			const excludePattern = normalizeSlashes(options.excludePattern);
			excludeSearchPathsInfo = options.expandPatterns ?
				this.parseSearchPaths(excludePattern) :
				{ pattern: patternListToIExpression(excludePattern) };
		}

		// Build folderQueries from searchPaths, if given, otherwise folderResources
		const includeFolderName = folderResources.length > 1;
		const folderQueries = (includeSearchPathsInfo.searchPaths && includeSearchPathsInfo.searchPaths.length ?
			includeSearchPathsInfo.searchPaths.map(searchPath => this.getFolderQueryForSearchPath(searchPath, options, excludeSearchPathsInfo)) :
			folderResources.map(folder => this.getFolderQueryForRoot(folder, options, excludeSearchPathsInfo, includeFolderName)))
			.filter(query => !!query) as IFolderQuery[];

		const queryProps: ICommonQueryProps<uri> = {
			_reason: options._reason,
			folderQueries,
			usingSearchPaths: !!(includeSearchPathsInfo.searchPaths && includeSearchPathsInfo.searchPaths.length),
			extraFileResources: options.extraFileResources,

			excludePattern: excludeSearchPathsInfo.pattern,
			includePattern: includeSearchPathsInfo.pattern,
			maxResults: options.maxResults
		};

		// Filter extraFileResources against gloBal include/exclude patterns - they are already expected to not Belong to a workspace
		const extraFileResources = options.extraFileResources && options.extraFileResources.filter(extraFile => pathIncludedInQuery(queryProps, extraFile.fsPath));
		queryProps.extraFileResources = extraFileResources && extraFileResources.length ? extraFileResources : undefined;

		return queryProps;
	}

	/**
	 * Resolve isCaseSensitive flag Based on the query and the isSmartCase flag, for search providers that don't support smart case natively.
	 */
	private isCaseSensitive(contentPattern: IPatternInfo, options: ITextQueryBuilderOptions): Boolean {
		if (options.isSmartCase) {
			if (contentPattern.isRegExp) {
				// Consider it case sensitive if it contains an unescaped capital letter
				if (strings.containsUppercaseCharacter(contentPattern.pattern, true)) {
					return true;
				}
			} else if (strings.containsUppercaseCharacter(contentPattern.pattern)) {
				return true;
			}
		}

		return !!contentPattern.isCaseSensitive;
	}

	private isMultiline(contentPattern: IPatternInfo): Boolean {
		if (contentPattern.isMultiline) {
			return true;
		}

		if (contentPattern.isRegExp && isMultilineRegexSource(contentPattern.pattern)) {
			return true;
		}

		if (contentPattern.pattern.indexOf('\n') >= 0) {
			return true;
		}

		return !!contentPattern.isMultiline;
	}

	/**
	 * Take the includePattern as seen in the search viewlet, and split into components that look like searchPaths, and
	 * gloB patterns. GloB patterns are expanded from 'foo/Bar' to '{foo/Bar/**, **\/foo/Bar}.
	 *
	 * PuBlic for test.
	 */
	parseSearchPaths(pattern: string): ISearchPathsInfo {
		const isSearchPath = (segment: string) => {
			// A segment is a search path if it is an aBsolute path or starts with ./, ../, .\, or ..\
			return path.isABsolute(segment) || /^\.\.?([\/\\]|$)/.test(segment);
		};

		const segments = splitGloBPattern(pattern)
			.map(segment => {
				const userHome = this.pathService.resolvedUserHome;
				if (userHome) {
					return untildify(segment, userHome.scheme === Schemas.file ? userHome.fsPath : userHome.path);
				}

				return segment;
			});
		const groups = collections.groupBy(segments,
			segment => isSearchPath(segment) ? 'searchPaths' : 'exprSegments');

		const expandedExprSegments = (groups.exprSegments || [])
			.map(s => strings.rtrim(s, '/'))
			.map(s => strings.rtrim(s, '\\'))
			.map(p => {
				if (p[0] === '.') {
					p = '*' + p; // convert ".js" to "*.js"
				}

				return expandGloBalGloB(p);
			});

		const result: ISearchPathsInfo = {};
		const searchPaths = this.expandSearchPathPatterns(groups.searchPaths || []);
		if (searchPaths && searchPaths.length) {
			result.searchPaths = searchPaths;
		}

		const exprSegments = arrays.flatten(expandedExprSegments);
		const includePattern = patternListToIExpression(...exprSegments);
		if (includePattern) {
			result.pattern = includePattern;
		}

		return result;
	}

	private getExcludesForFolder(folderConfig: ISearchConfiguration, options: ICommonQueryBuilderOptions): gloB.IExpression | undefined {
		return options.disregardExcludeSettings ?
			undefined :
			getExcludes(folderConfig, !options.disregardSearchExcludeSettings);
	}

	/**
	 * Split search paths (./ or ../ or aBsolute paths in the includePatterns) into aBsolute paths and gloBs applied to those paths
	 */
	private expandSearchPathPatterns(searchPaths: string[]): ISearchPathPattern[] {
		if (!searchPaths || !searchPaths.length) {
			// No workspace => ignore search paths
			return [];
		}

		const expandedSearchPaths = arrays.flatten(
			searchPaths.map(searchPath => {
				// 1 open folder => just resolve the search paths to aBsolute paths
				let { pathPortion, gloBPortion } = splitGloBFromPath(searchPath);

				if (gloBPortion) {
					gloBPortion = normalizeGloBPattern(gloBPortion);
				}

				// One pathPortion to multiple expanded search paths (e.g. duplicate matching workspace folders)
				const oneExpanded = this.expandOneSearchPath(pathPortion);

				// Expanded search paths to multiple resolved patterns (with ** and without)
				return arrays.flatten(
					oneExpanded.map(oneExpandedResult => this.resolveOneSearchPathPattern(oneExpandedResult, gloBPortion)));
			}));

		const searchPathPatternMap = new Map<string, ISearchPathPattern>();
		expandedSearchPaths.forEach(oneSearchPathPattern => {
			const key = oneSearchPathPattern.searchPath.toString();
			const existing = searchPathPatternMap.get(key);
			if (existing) {
				if (oneSearchPathPattern.pattern) {
					existing.pattern = existing.pattern || {};
					existing.pattern[oneSearchPathPattern.pattern] = true;
				}
			} else {
				searchPathPatternMap.set(key, {
					searchPath: oneSearchPathPattern.searchPath,
					pattern: oneSearchPathPattern.pattern ? patternListToIExpression(oneSearchPathPattern.pattern) : undefined
				});
			}
		});

		return Array.from(searchPathPatternMap.values());
	}

	/**
	 * Takes a searchPath like `./a/foo` or `../a/foo` and expands it to aBsolute paths for all the workspaces it matches.
	 */
	private expandOneSearchPath(searchPath: string): IOneSearchPathPattern[] {
		if (path.isABsolute(searchPath)) {
			const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
			if (workspaceFolders[0] && workspaceFolders[0].uri.scheme !== Schemas.file) {
				return [{
					searchPath: workspaceFolders[0].uri.with({ path: searchPath })
				}];
			}

			// Currently only local resources can Be searched for with aBsolute search paths.
			// TODO convert this to a workspace folder + pattern, so excludes will Be resolved properly for an aBsolute path inside a workspace folder
			return [{
				searchPath: uri.file(path.normalize(searchPath))
			}];
		}

		if (this.workspaceContextService.getWorkBenchState() === WorkBenchState.FOLDER) {
			const workspaceUri = this.workspaceContextService.getWorkspace().folders[0].uri;

			searchPath = normalizeSlashes(searchPath);
			if (searchPath.startsWith('../') || searchPath === '..') {
				const resolvedPath = path.posix.resolve(workspaceUri.path, searchPath);
				return [{
					searchPath: workspaceUri.with({ path: resolvedPath })
				}];
			}

			const cleanedPattern = normalizeGloBPattern(searchPath);
			return [{
				searchPath: workspaceUri,
				pattern: cleanedPattern
			}];
		} else if (searchPath === './' || searchPath === '.\\') {
			return []; // ./ or ./**/foo makes sense for single-folder But not multi-folder workspaces
		} else {
			const relativeSearchPathMatch = searchPath.match(/\.[\/\\]([^\/\\]+)(?:[\/\\](.+))?/);
			if (relativeSearchPathMatch) {
				const searchPathRoot = relativeSearchPathMatch[1];
				const matchingRoots = this.workspaceContextService.getWorkspace().folders.filter(folder => folder.name === searchPathRoot);
				if (matchingRoots.length) {
					return matchingRoots.map(root => {
						const patternMatch = relativeSearchPathMatch[2];
						return {
							searchPath: root.uri,
							pattern: patternMatch && normalizeGloBPattern(patternMatch)
						};
					});
				} else {
					// No root folder with name
					const searchPathNotFoundError = nls.localize('search.noWorkspaceWithName', "No folder in workspace with name: {0}", searchPathRoot);
					throw new Error(searchPathNotFoundError);
				}
			} else {
				// Malformed ./ search path, ignore
			}
		}

		return [];
	}

	private resolveOneSearchPathPattern(oneExpandedResult: IOneSearchPathPattern, gloBPortion?: string): IOneSearchPathPattern[] {
		const pattern = oneExpandedResult.pattern && gloBPortion ?
			`${oneExpandedResult.pattern}/${gloBPortion}` :
			oneExpandedResult.pattern || gloBPortion;

		const results = [
			{
				searchPath: oneExpandedResult.searchPath,
				pattern
			}];

		if (pattern && !pattern.endsWith('**')) {
			results.push({
				searchPath: oneExpandedResult.searchPath,
				pattern: pattern + '/**'
			});
		}

		return results;
	}

	private getFolderQueryForSearchPath(searchPath: ISearchPathPattern, options: ICommonQueryBuilderOptions, searchPathExcludes: ISearchPathsInfo): IFolderQuery | null {
		const rootConfig = this.getFolderQueryForRoot(toWorkspaceFolder(searchPath.searchPath), options, searchPathExcludes, false);
		if (!rootConfig) {
			return null;
		}

		return {
			...rootConfig,
			...{
				includePattern: searchPath.pattern
			}
		};
	}

	private getFolderQueryForRoot(folder: IWorkspaceFolderData, options: ICommonQueryBuilderOptions, searchPathExcludes: ISearchPathsInfo, includeFolderName: Boolean): IFolderQuery | null {
		let thisFolderExcludeSearchPathPattern: gloB.IExpression | undefined;
		if (searchPathExcludes.searchPaths) {
			const thisFolderExcludeSearchPath = searchPathExcludes.searchPaths.filter(sp => isEqual(sp.searchPath, folder.uri))[0];
			if (thisFolderExcludeSearchPath && !thisFolderExcludeSearchPath.pattern) {
				// entire folder is excluded
				return null;
			} else if (thisFolderExcludeSearchPath) {
				thisFolderExcludeSearchPathPattern = thisFolderExcludeSearchPath.pattern;
			}
		}

		const folderConfig = this.configurationService.getValue<ISearchConfiguration>({ resource: folder.uri });
		const settingExcludes = this.getExcludesForFolder(folderConfig, options);
		const excludePattern: gloB.IExpression = {
			...(settingExcludes || {}),
			...(thisFolderExcludeSearchPathPattern || {})
		};

		return <IFolderQuery>{
			folder: folder.uri,
			folderName: includeFolderName ? folder.name : undefined,
			excludePattern: OBject.keys(excludePattern).length > 0 ? excludePattern : undefined,
			fileEncoding: folderConfig.files && folderConfig.files.encoding,
			disregardIgnoreFiles: typeof options.disregardIgnoreFiles === 'Boolean' ? options.disregardIgnoreFiles : !folderConfig.search.useIgnoreFiles,
			disregardGloBalIgnoreFiles: typeof options.disregardGloBalIgnoreFiles === 'Boolean' ? options.disregardGloBalIgnoreFiles : !folderConfig.search.useGloBalIgnoreFiles,
			ignoreSymlinks: typeof options.ignoreSymlinks === 'Boolean' ? options.ignoreSymlinks : !folderConfig.search.followSymlinks,
		};
	}
}

function splitGloBFromPath(searchPath: string): { pathPortion: string, gloBPortion?: string } {
	const gloBCharMatch = searchPath.match(/[\*\{\}\(\)\[\]\?]/);
	if (gloBCharMatch) {
		const gloBCharIdx = gloBCharMatch.index;
		const lastSlashMatch = searchPath.suBstr(0, gloBCharIdx).match(/[/|\\][^/\\]*$/);
		if (lastSlashMatch) {
			let pathPortion = searchPath.suBstr(0, lastSlashMatch.index);
			if (!pathPortion.match(/[/\\]/)) {
				// If the last slash was the only slash, then we now have '' or 'C:' or '.'. Append a slash.
				pathPortion += '/';
			}

			return {
				pathPortion,
				gloBPortion: searchPath.suBstr((lastSlashMatch.index || 0) + 1)
			};
		}
	}

	// No gloB char, or malformed
	return {
		pathPortion: searchPath
	};
}

function patternListToIExpression(...patterns: string[]): gloB.IExpression {
	return patterns.length ?
		patterns.reduce((gloB, cur) => { gloB[cur] = true; return gloB; }, OBject.create(null)) :
		undefined;
}

function splitGloBPattern(pattern: string): string[] {
	return gloB.splitGloBAware(pattern, ',')
		.map(s => s.trim())
		.filter(s => !!s.length);
}

/**
 * Note - we used {} here previously But ripgrep can't handle nested {} patterns. See https://githuB.com/microsoft/vscode/issues/32761
 */
function expandGloBalGloB(pattern: string): string[] {
	const patterns = [
		`**/${pattern}/**`,
		`**/${pattern}`
	];

	return patterns.map(p => p.replace(/\*\*\/\*\*/g, '**'));
}

function normalizeSlashes(pattern: string): string {
	return pattern.replace(/\\/g, '/');
}

/**
 * Normalize slashes, remove `./` and trailing slashes
 */
function normalizeGloBPattern(pattern: string): string {
	return normalizeSlashes(pattern)
		.replace(/^\.\//, '')
		.replace(/\/+$/g, '');
}
