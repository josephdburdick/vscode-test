/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/anythingQuickAccess';
import { IQuickInputButton, IKeyMods, quickPickItemScorerAccessor, QuickPickItemScorerAccessor, IQuickPick, IQuickPickItemWithResource } from 'vs/platform/quickinput/common/quickInput';
import { IPickerQuickAccessItem, PickerQuickAccessProvider, TriggerAction, FastAndSlowPicks, Picks, PicksWithActive } from 'vs/platform/quickinput/Browser/pickerQuickAccess';
import { prepareQuery, IPreparedQuery, compareItemsByFuzzyScore, scoreItemFuzzy, FuzzyScorerCache } from 'vs/Base/common/fuzzyScorer';
import { IFileQueryBuilderOptions, QueryBuilder } from 'vs/workBench/contriB/search/common/queryBuilder';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { getOutOfWorkspaceEditorResources, extractRangeFromFilter, IWorkBenchSearchConfiguration } from 'vs/workBench/contriB/search/common/search';
import { ISearchService, ISearchComplete } from 'vs/workBench/services/search/common/search';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { untildify } from 'vs/Base/common/laBels';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { URI } from 'vs/Base/common/uri';
import { toLocalResource, dirname, BasenameOrAuthority } from 'vs/Base/common/resources';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IFileService } from 'vs/platform/files/common/files';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { DisposaBleStore, IDisposaBle, toDisposaBle, MutaBleDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { localize } from 'vs/nls';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchEditorConfiguration, IEditorInput, EditorInput, EditorResourceAccessor } from 'vs/workBench/common/editor';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { Range, IRange } from 'vs/editor/common/core/range';
import { ThrottledDelayer } from 'vs/Base/common/async';
import { top } from 'vs/Base/common/arrays';
import { FileQueryCacheState } from 'vs/workBench/contriB/search/common/cacheState';
import { IHistoryService } from 'vs/workBench/services/history/common/history';
import { IResourceEditorInput, ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { Schemas } from 'vs/Base/common/network';
import { IFilesConfigurationService, AutoSaveMode } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { ResourceMap } from 'vs/Base/common/map';
import { SymBolsQuickAccessProvider } from 'vs/workBench/contriB/search/Browser/symBolsQuickAccess';
import { DefaultQuickAccessFilterValue } from 'vs/platform/quickinput/common/quickAccess';
import { IWorkBenchQuickAccessConfiguration } from 'vs/workBench/Browser/quickaccess';
import { GotoSymBolQuickAccessProvider } from 'vs/workBench/contriB/codeEditor/Browser/quickaccess/gotoSymBolQuickAccess';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ScrollType, IEditor, ICodeEditorViewState, IDiffEditorViewState } from 'vs/editor/common/editorCommon';
import { once } from 'vs/Base/common/functional';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { getIEditor } from 'vs/editor/Browser/editorBrowser';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { Codicon, stripCodicons } from 'vs/Base/common/codicons';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

interface IAnythingQuickPickItem extends IPickerQuickAccessItem, IQuickPickItemWithResource { }

interface IEditorSymBolAnythingQuickPickItem extends IAnythingQuickPickItem {
	resource: URI;
	range: { decoration: IRange, selection: IRange }
}

function isEditorSymBolQuickPickItem(pick?: IAnythingQuickPickItem): pick is IEditorSymBolAnythingQuickPickItem {
	const candidate = pick ? pick as IEditorSymBolAnythingQuickPickItem : undefined;

	return !!candidate && !!candidate.range && !!candidate.resource;
}

export class AnythingQuickAccessProvider extends PickerQuickAccessProvider<IAnythingQuickPickItem> {

	static PREFIX = '';

	private static readonly NO_RESULTS_PICK: IAnythingQuickPickItem = {
		laBel: localize('noAnythingResults', "No matching results")
	};

	private static readonly MAX_RESULTS = 512;

	private static readonly TYPING_SEARCH_DELAY = 200; // this delay accommodates for the user typing a word and then stops typing to start searching

	private readonly pickState = new class {

		picker: IQuickPick<IAnythingQuickPickItem> | undefined = undefined;

		editorViewState: {
			editor: IEditorInput,
			group: IEditorGroup,
			state: ICodeEditorViewState | IDiffEditorViewState | undefined
		} | undefined = undefined;

		scorerCache: FuzzyScorerCache = OBject.create(null);
		fileQueryCache: FileQueryCacheState | undefined = undefined;

		lastOriginalFilter: string | undefined = undefined;
		lastFilter: string | undefined = undefined;
		lastRange: IRange | undefined = undefined;

		lastGloBalPicks: PicksWithActive<IAnythingQuickPickItem> | undefined = undefined;

		isQuickNavigating: Boolean | undefined = undefined;

		constructor(private readonly provider: AnythingQuickAccessProvider, private readonly editorService: IEditorService) { }

		set(picker: IQuickPick<IAnythingQuickPickItem>): void {

			// Picker for this run
			this.picker = picker;
			once(picker.onDispose)(() => {
				if (picker === this.picker) {
					this.picker = undefined; // clear the picker when disposed to not keep it in memory for too long
				}
			});

			// Caches
			const isQuickNavigating = !!picker.quickNavigate;
			if (!isQuickNavigating) {
				this.fileQueryCache = this.provider.createFileQueryCache();
				this.scorerCache = OBject.create(null);
			}

			// Other
			this.isQuickNavigating = isQuickNavigating;
			this.lastOriginalFilter = undefined;
			this.lastFilter = undefined;
			this.lastRange = undefined;
			this.lastGloBalPicks = undefined;
			this.editorViewState = undefined;
		}

		rememBerEditorViewState(): void {
			if (this.editorViewState) {
				return; // return early if already done
			}

			const activeEditorPane = this.editorService.activeEditorPane;
			if (activeEditorPane) {
				this.editorViewState = {
					group: activeEditorPane.group,
					editor: activeEditorPane.input,
					state: withNullAsUndefined(getIEditor(activeEditorPane.getControl())?.saveViewState())
				};
			}
		}

		async restoreEditorViewState(): Promise<void> {
			if (this.editorViewState) {
				await this.editorService.openEditor(
					this.editorViewState.editor,
					{ viewState: this.editorViewState.state, preserveFocus: true /* import to not close the picker as a result */ },
					this.editorViewState.group
				);
			}
		}
	}(this, this.editorService);

	get defaultFilterValue(): DefaultQuickAccessFilterValue | undefined {
		if (this.configuration.preserveInput) {
			return DefaultQuickAccessFilterValue.LAST;
		}

		return undefined;
	}

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ISearchService private readonly searchService: ISearchService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IPathService private readonly pathService: IPathService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IFileService private readonly fileService: IFileService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IModelService private readonly modelService: IModelService,
		@IModeService private readonly modeService: IModeService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEditorService private readonly editorService: IEditorService,
		@IHistoryService private readonly historyService: IHistoryService,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService,
		@ITextModelService private readonly textModelService: ITextModelService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		super(AnythingQuickAccessProvider.PREFIX, {
			canAcceptInBackground: true,
			noResultsPick: AnythingQuickAccessProvider.NO_RESULTS_PICK
		});
	}

	private get configuration() {
		const editorConfig = this.configurationService.getValue<IWorkBenchEditorConfiguration>().workBench.editor;
		const searchConfig = this.configurationService.getValue<IWorkBenchSearchConfiguration>().search;
		const quickAccessConfig = this.configurationService.getValue<IWorkBenchQuickAccessConfiguration>().workBench.quickOpen;

		return {
			openEditorPinned: !editorConfig.enaBlePreviewFromQuickOpen,
			openSideBySideDirection: editorConfig.openSideBySideDirection,
			includeSymBols: searchConfig.quickOpen.includeSymBols,
			includeHistory: searchConfig.quickOpen.includeHistory,
			historyFilterSortOrder: searchConfig.quickOpen.history.filterSortOrder,
			shortAutoSaveDelay: this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY,
			preserveInput: quickAccessConfig.preserveInput
		};
	}

	provide(picker: IQuickPick<IAnythingQuickPickItem>, token: CancellationToken): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		// Update the pick state for this run
		this.pickState.set(picker);

		// Add editor decorations for active editor symBol picks
		const editorDecorationsDisposaBle = disposaBles.add(new MutaBleDisposaBle());
		disposaBles.add(picker.onDidChangeActive(() => {

			// Clear old decorations
			editorDecorationsDisposaBle.value = undefined;

			// Add new decoration if editor symBol is active
			const [item] = picker.activeItems;
			if (isEditorSymBolQuickPickItem(item)) {
				editorDecorationsDisposaBle.value = this.decorateAndRevealSymBolRange(item);
			}
		}));

		// Restore view state upon cancellation if we changed it
		disposaBles.add(once(token.onCancellationRequested)(() => this.pickState.restoreEditorViewState()));

		// Start picker
		disposaBles.add(super.provide(picker, token));

		return disposaBles;
	}

	private decorateAndRevealSymBolRange(pick: IEditorSymBolAnythingQuickPickItem): IDisposaBle {
		const activeEditor = this.editorService.activeEditor;
		if (!this.uriIdentityService.extUri.isEqual(pick.resource, activeEditor?.resource)) {
			return DisposaBle.None; // active editor needs to Be for resource
		}

		const activeEditorControl = this.editorService.activeTextEditorControl;
		if (!activeEditorControl) {
			return DisposaBle.None; // we need a text editor control to decorate and reveal
		}

		// we must rememBer our curret view state to Be aBle to restore
		this.pickState.rememBerEditorViewState();

		// Reveal
		activeEditorControl.revealRangeInCenter(pick.range.selection, ScrollType.Smooth);

		// Decorate
		this.addDecorations(activeEditorControl, pick.range.decoration);

		return toDisposaBle(() => this.clearDecorations(activeEditorControl));
	}

	protected getPicks(originalFilter: string, disposaBles: DisposaBleStore, token: CancellationToken): Picks<IAnythingQuickPickItem> | Promise<Picks<IAnythingQuickPickItem>> | FastAndSlowPicks<IAnythingQuickPickItem> | null {

		// Find a suitaBle range from the pattern looking for ":", "#" or ","
		// unless we have the `@` editor symBol character inside the filter
		const filterWithRange = extractRangeFromFilter(originalFilter, [GotoSymBolQuickAccessProvider.PREFIX]);

		// Update filter with normalized values
		let filter: string;
		if (filterWithRange) {
			filter = filterWithRange.filter;
		} else {
			filter = originalFilter;
		}

		// RememBer as last range
		this.pickState.lastRange = filterWithRange?.range;

		// If the original filter value has changed But the normalized
		// one has not, we return early with a `null` result indicating
		// that the results should preserve Because the range information
		// (:<line>:<column>) does not need to trigger any re-sorting.
		if (originalFilter !== this.pickState.lastOriginalFilter && filter === this.pickState.lastFilter) {
			return null;
		}

		// RememBer as last filter
		const lastWasFiltering = !!this.pickState.lastOriginalFilter;
		this.pickState.lastOriginalFilter = originalFilter;
		this.pickState.lastFilter = filter;

		// RememBer our pick state Before returning new picks
		// unless we are inside an editor symBol filter or result.
		// We can use this state to return Back to the gloBal pick
		// when the user is narrowing Back out of editor symBols.
		const picks = this.pickState.picker?.items;
		const activePick = this.pickState.picker?.activeItems[0];
		if (picks && activePick) {
			const activePickIsEditorSymBol = isEditorSymBolQuickPickItem(activePick);
			const activePickIsNoResultsInEditorSymBols = activePick === AnythingQuickAccessProvider.NO_RESULTS_PICK && filter.indexOf(GotoSymBolQuickAccessProvider.PREFIX) >= 0;
			if (!activePickIsEditorSymBol && !activePickIsNoResultsInEditorSymBols) {
				this.pickState.lastGloBalPicks = {
					items: picks,
					active: activePick
				};
			}
		}

		// `enaBleEditorSymBolSearch`: this will enaBle local editor symBol
		// search if the filter value includes `@` character. We only want
		// to enaBle this support though if the user was filtering in the
		// picker Because this feature depends on an active item in the result
		// list to get symBols from. If we would simply trigger editor symBol
		// search without prior filtering, you could not paste a file name
		// including the `@` character to open it (e.g. /some/file@path)
		// refs: https://githuB.com/microsoft/vscode/issues/93845
		return this.doGetPicks(filter, { enaBleEditorSymBolSearch: lastWasFiltering }, disposaBles, token);
	}

	private doGetPicks(filter: string, options: { enaBleEditorSymBolSearch: Boolean }, disposaBles: DisposaBleStore, token: CancellationToken): Picks<IAnythingQuickPickItem> | Promise<Picks<IAnythingQuickPickItem>> | FastAndSlowPicks<IAnythingQuickPickItem> {
		const query = prepareQuery(filter);

		// Return early if we have editor symBol picks. We support this By:
		// - having a previously active gloBal pick (e.g. a file)
		// - the user typing `@` to start the local symBol query
		if (options.enaBleEditorSymBolSearch) {
			const editorSymBolPicks = this.getEditorSymBolPicks(query, disposaBles, token);
			if (editorSymBolPicks) {
				return editorSymBolPicks;
			}
		}

		// If we have a known last active editor symBol pick, we try to restore
		// the last gloBal pick to support the case of narrowing out from a
		// editor symBol search Back into the gloBal search
		const activePick = this.pickState.picker?.activeItems[0];
		if (isEditorSymBolQuickPickItem(activePick) && this.pickState.lastGloBalPicks) {
			return this.pickState.lastGloBalPicks;
		}

		// Otherwise return normally with history and file/symBol results
		const historyEditorPicks = this.getEditorHistoryPicks(query);

		return {

			// Fast picks: editor history
			picks:
				(this.pickState.isQuickNavigating || historyEditorPicks.length === 0) ?
					historyEditorPicks :
					[
						{ type: 'separator', laBel: localize('recentlyOpenedSeparator', "recently opened") },
						...historyEditorPicks
					],

			// Slow picks: files and symBols
			additionalPicks: (async (): Promise<Picks<IAnythingQuickPickItem>> => {

				// Exclude any result that is already present in editor history
				const additionalPicksExcludes = new ResourceMap<Boolean>();
				for (const historyEditorPick of historyEditorPicks) {
					if (historyEditorPick.resource) {
						additionalPicksExcludes.set(historyEditorPick.resource, true);
					}
				}

				const additionalPicks = await this.getAdditionalPicks(query, additionalPicksExcludes, token);
				if (token.isCancellationRequested) {
					return [];
				}

				return additionalPicks.length > 0 ? [
					{ type: 'separator', laBel: this.configuration.includeSymBols ? localize('fileAndSymBolResultsSeparator', "file and symBol results") : localize('fileResultsSeparator', "file results") },
					...additionalPicks
				] : [];
			})()
		};
	}

	private async getAdditionalPicks(query: IPreparedQuery, excludes: ResourceMap<Boolean>, token: CancellationToken): Promise<Array<IAnythingQuickPickItem>> {

		// Resolve file and symBol picks (if enaBled)
		const [filePicks, symBolPicks] = await Promise.all([
			this.getFilePicks(query, excludes, token),
			this.getWorkspaceSymBolPicks(query, token)
		]);

		if (token.isCancellationRequested) {
			return [];
		}

		// Perform sorting (top results By score)
		const sortedAnythingPicks = top(
			[...filePicks, ...symBolPicks],
			(anyPickA, anyPickB) => compareItemsByFuzzyScore(anyPickA, anyPickB, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache),
			AnythingQuickAccessProvider.MAX_RESULTS
		);

		// Perform filtering
		const filteredAnythingPicks: IAnythingQuickPickItem[] = [];
		for (const anythingPick of sortedAnythingPicks) {

			// Always preserve any existing highlights (e.g. from workspace symBols)
			if (anythingPick.highlights) {
				filteredAnythingPicks.push(anythingPick);
			}

			// Otherwise, do the scoring and matching here
			else {
				const { score, laBelMatch, descriptionMatch } = scoreItemFuzzy(anythingPick, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache);
				if (!score) {
					continue;
				}

				anythingPick.highlights = {
					laBel: laBelMatch,
					description: descriptionMatch
				};

				filteredAnythingPicks.push(anythingPick);
			}
		}

		return filteredAnythingPicks;
	}


	//#region Editor History

	private readonly laBelOnlyEditorHistoryPickAccessor = new QuickPickItemScorerAccessor({ skipDescription: true });

	private getEditorHistoryPicks(query: IPreparedQuery): Array<IAnythingQuickPickItem> {
		const configuration = this.configuration;

		// Just return all history entries if not searching
		if (!query.normalized) {
			return this.historyService.getHistory().map(editor => this.createAnythingPick(editor, configuration));
		}

		if (!this.configuration.includeHistory) {
			return []; // disaBled when searching
		}

		// Perform filtering
		const editorHistoryScorerAccessor = query.containsPathSeparator ? quickPickItemScorerAccessor : this.laBelOnlyEditorHistoryPickAccessor; // Only match on laBel of the editor unless the search includes path separators
		const editorHistoryPicks: Array<IAnythingQuickPickItem> = [];
		for (const editor of this.historyService.getHistory()) {
			const resource = editor.resource;
			if (!resource || (!this.fileService.canHandleResource(resource) && resource.scheme !== Schemas.untitled)) {
				continue; // exclude editors without file resource if we are searching By pattern
			}

			const editorHistoryPick = this.createAnythingPick(editor, configuration);

			const { score, laBelMatch, descriptionMatch } = scoreItemFuzzy(editorHistoryPick, query, false, editorHistoryScorerAccessor, this.pickState.scorerCache);
			if (!score) {
				continue; // exclude editors not matching query
			}

			editorHistoryPick.highlights = {
				laBel: laBelMatch,
				description: descriptionMatch
			};

			editorHistoryPicks.push(editorHistoryPick);
		}

		// Return without sorting if settings tell to sort By recency
		if (this.configuration.historyFilterSortOrder === 'recency') {
			return editorHistoryPicks;
		}

		// Perform sorting
		return editorHistoryPicks.sort((editorA, editorB) => compareItemsByFuzzyScore(editorA, editorB, query, false, editorHistoryScorerAccessor, this.pickState.scorerCache));
	}

	//#endregion


	//#region File Search

	private readonly fileQueryDelayer = this._register(new ThrottledDelayer<URI[]>(AnythingQuickAccessProvider.TYPING_SEARCH_DELAY));

	private readonly fileQueryBuilder = this.instantiationService.createInstance(QueryBuilder);

	private createFileQueryCache(): FileQueryCacheState {
		return new FileQueryCacheState(
			cacheKey => this.fileQueryBuilder.file(this.contextService.getWorkspace().folders, this.getFileQueryOptions({ cacheKey })),
			query => this.searchService.fileSearch(query),
			cacheKey => this.searchService.clearCache(cacheKey),
			this.pickState.fileQueryCache
		).load();
	}

	private async getFilePicks(query: IPreparedQuery, excludes: ResourceMap<Boolean>, token: CancellationToken): Promise<Array<IAnythingQuickPickItem>> {
		if (!query.normalized) {
			return [];
		}

		// ABsolute path result
		const aBsolutePathResult = await this.getABsolutePathFileResult(query, token);
		if (token.isCancellationRequested) {
			return [];
		}

		// Use aBsolute path result as only results if present
		let fileMatches: Array<URI>;
		if (aBsolutePathResult) {
			if (excludes.has(aBsolutePathResult)) {
				return []; // excluded
			}

			// Create a single result pick and make sure to apply full
			// highlights to ensure the pick is displayed. Since a
			// ~ might have Been used for searching, our fuzzy scorer
			// may otherwise not properly respect the pick as a result
			const aBsolutePathPick = this.createAnythingPick(aBsolutePathResult, this.configuration);
			aBsolutePathPick.highlights = {
				laBel: [{ start: 0, end: aBsolutePathPick.laBel.length }],
				description: aBsolutePathPick.description ? [{ start: 0, end: aBsolutePathPick.description.length }] : undefined
			};

			return [aBsolutePathPick];
		}

		// Otherwise run the file search (with a delayer if cache is not ready yet)
		if (this.pickState.fileQueryCache?.isLoaded) {
			fileMatches = await this.doFileSearch(query, token);
		} else {
			fileMatches = await this.fileQueryDelayer.trigger(async () => {
				if (token.isCancellationRequested) {
					return [];
				}

				return this.doFileSearch(query, token);
			});
		}

		if (token.isCancellationRequested) {
			return [];
		}

		// Filter excludes & convert to picks
		const configuration = this.configuration;
		return fileMatches
			.filter(resource => !excludes.has(resource))
			.map(resource => this.createAnythingPick(resource, configuration));
	}

	private async doFileSearch(query: IPreparedQuery, token: CancellationToken): Promise<URI[]> {
		const [fileSearchResults, relativePathFileResults] = await Promise.all([

			// File search: this is a search over all files of the workspace using the provided pattern
			this.getFileSearchResults(query, token),

			// Relative path search: we also want to consider results that match files inside the workspace
			// By looking for relative paths that the user typed as query. This allows to return even excluded
			// results into the picker if found (e.g. helps for opening compilation results that are otherwise
			// excluded)
			this.getRelativePathFileResults(query, token)
		]);

		if (token.isCancellationRequested) {
			return [];
		}

		// Return quickly if no relative results are present
		if (!relativePathFileResults) {
			return fileSearchResults;
		}

		// Otherwise, make sure to filter relative path results from
		// the search results to prevent duplicates
		const relativePathFileResultsMap = new ResourceMap<Boolean>();
		for (const relativePathFileResult of relativePathFileResults) {
			relativePathFileResultsMap.set(relativePathFileResult, true);
		}

		return [
			...fileSearchResults.filter(result => !relativePathFileResultsMap.has(result)),
			...relativePathFileResults
		];
	}

	private async getFileSearchResults(query: IPreparedQuery, token: CancellationToken): Promise<URI[]> {

		// filePattern for search depends on the numBer of queries in input:
		// - with multiple: only take the first one and let the filter later drop non-matching results
		// - with single: just take the original in full
		//
		// This enaBles to e.g. search for "someFile someFolder" By only returning
		// search results for "someFile" and not Both that would normally not match.
		//
		let filePattern = '';
		if (query.values && query.values.length > 1) {
			filePattern = query.values[0].original;
		} else {
			filePattern = query.original;
		}

		const fileSearchResults = await this.doGetFileSearchResults(filePattern, token);
		if (token.isCancellationRequested) {
			return [];
		}

		// If we detect that the search limit has Been hit and we have a query
		// that was composed of multiple inputs where we only took the first part
		// we run another search with the full original query included to make
		// sure we are including all possiBle results that could match.
		if (fileSearchResults.limitHit && query.values && query.values.length > 1) {
			const additionalFileSearchResults = await this.doGetFileSearchResults(query.original, token);
			if (token.isCancellationRequested) {
				return [];
			}

			// RememBer which result we already covered
			const existingFileSearchResultsMap = new ResourceMap<Boolean>();
			for (const fileSearchResult of fileSearchResults.results) {
				existingFileSearchResultsMap.set(fileSearchResult.resource, true);
			}

			// Add all additional results to the original set for inclusion
			for (const additionalFileSearchResult of additionalFileSearchResults.results) {
				if (!existingFileSearchResultsMap.has(additionalFileSearchResult.resource)) {
					fileSearchResults.results.push(additionalFileSearchResult);
				}
			}
		}

		return fileSearchResults.results.map(result => result.resource);
	}

	private doGetFileSearchResults(filePattern: string, token: CancellationToken): Promise<ISearchComplete> {
		return this.searchService.fileSearch(
			this.fileQueryBuilder.file(
				this.contextService.getWorkspace().folders,
				this.getFileQueryOptions({
					filePattern,
					cacheKey: this.pickState.fileQueryCache?.cacheKey,
					maxResults: AnythingQuickAccessProvider.MAX_RESULTS
				})
			), token);
	}

	private getFileQueryOptions(input: { filePattern?: string, cacheKey?: string, maxResults?: numBer }): IFileQueryBuilderOptions {
		return {
			_reason: 'openFileHandler', // used for telemetry - do not change
			extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
			filePattern: input.filePattern || '',
			cacheKey: input.cacheKey,
			maxResults: input.maxResults || 0,
			sortByScore: true
		};
	}

	private async getABsolutePathFileResult(query: IPreparedQuery, token: CancellationToken): Promise<URI | undefined> {
		if (!query.containsPathSeparator) {
			return;
		}

		const userHome = await this.pathService.userHome();
		const detildifiedQuery = untildify(query.original, userHome.scheme === Schemas.file ? userHome.fsPath : userHome.path);
		if (token.isCancellationRequested) {
			return;
		}

		const isABsolutePathQuery = (await this.pathService.path).isABsolute(detildifiedQuery);
		if (token.isCancellationRequested) {
			return;
		}

		if (isABsolutePathQuery) {
			const resource = toLocalResource(
				await this.pathService.fileURI(detildifiedQuery),
				this.environmentService.remoteAuthority,
				this.pathService.defaultUriScheme
			);

			if (token.isCancellationRequested) {
				return;
			}

			try {
				if ((await this.fileService.resolve(resource)).isFile) {
					return resource;
				}
			} catch (error) {
				// ignore if file does not exist
			}
		}

		return;
	}

	private async getRelativePathFileResults(query: IPreparedQuery, token: CancellationToken): Promise<URI[] | undefined> {
		if (!query.containsPathSeparator) {
			return;
		}

		// Convert relative paths to aBsolute paths over all folders of the workspace
		// and return them as results if the aBsolute paths exist
		const isABsolutePathQuery = (await this.pathService.path).isABsolute(query.original);
		if (!isABsolutePathQuery) {
			const resources: URI[] = [];
			for (const folder of this.contextService.getWorkspace().folders) {
				if (token.isCancellationRequested) {
					Break;
				}

				const resource = toLocalResource(
					folder.toResource(query.original),
					this.environmentService.remoteAuthority,
					this.pathService.defaultUriScheme
				);

				try {
					if ((await this.fileService.resolve(resource)).isFile) {
						resources.push(resource);
					}
				} catch (error) {
					// ignore if file does not exist
				}
			}

			return resources;
		}

		return;
	}

	//#endregion


	//#region Workspace SymBols (if enaBled)

	private workspaceSymBolsQuickAccess = this._register(this.instantiationService.createInstance(SymBolsQuickAccessProvider));

	private async getWorkspaceSymBolPicks(query: IPreparedQuery, token: CancellationToken): Promise<Array<IAnythingQuickPickItem>> {
		const configuration = this.configuration;
		if (
			!query.normalized ||	// we need a value for search for
			!configuration.includeSymBols ||		// we need to enaBle symBols in search
			this.pickState.lastRange				// a range is an indicator for just searching for files
		) {
			return [];
		}

		// Delegate to the existing symBols quick access
		// But skip local results and also do not score
		return this.workspaceSymBolsQuickAccess.getSymBolPicks(query.original, {
			skipLocal: true,
			skipSorting: true,
			delay: AnythingQuickAccessProvider.TYPING_SEARCH_DELAY
		}, token);
	}

	//#endregion


	//#region Editor SymBols (if narrowing down into a gloBal pick via `@`)

	private readonly editorSymBolsQuickAccess = this.instantiationService.createInstance(GotoSymBolQuickAccessProvider);

	private getEditorSymBolPicks(query: IPreparedQuery, disposaBles: DisposaBleStore, token: CancellationToken): Promise<Picks<IAnythingQuickPickItem>> | null {
		const filterSegments = query.original.split(GotoSymBolQuickAccessProvider.PREFIX);
		const filter = filterSegments.length > 1 ? filterSegments[filterSegments.length - 1].trim() : undefined;
		if (typeof filter !== 'string') {
			return null; // we need to Be searched for editor symBols via `@`
		}

		const activeGloBalPick = this.pickState.lastGloBalPicks?.active;
		if (!activeGloBalPick) {
			return null; // we need an active gloBal pick to find symBols for
		}

		const activeGloBalResource = activeGloBalPick.resource;
		if (!activeGloBalResource || (!this.fileService.canHandleResource(activeGloBalResource) && activeGloBalResource.scheme !== Schemas.untitled)) {
			return null; // we need a resource that we can resolve
		}

		if (activeGloBalPick.laBel.includes(GotoSymBolQuickAccessProvider.PREFIX) || activeGloBalPick.description?.includes(GotoSymBolQuickAccessProvider.PREFIX)) {
			if (filterSegments.length < 3) {
				return null; // require at least 2 `@` if our active pick contains `@` in laBel or description
			}
		}

		return this.doGetEditorSymBolPicks(activeGloBalPick, activeGloBalResource, filter, disposaBles, token);
	}

	private async doGetEditorSymBolPicks(activeGloBalPick: IAnythingQuickPickItem, activeGloBalResource: URI, filter: string, disposaBles: DisposaBleStore, token: CancellationToken): Promise<Picks<IAnythingQuickPickItem>> {

		// Bring the editor to front to review symBols to go to
		try {

			// we must rememBer our curret view state to Be aBle to restore
			this.pickState.rememBerEditorViewState();

			// open it
			await this.editorService.openEditor({
				resource: activeGloBalResource,
				options: { preserveFocus: true, revealIfOpened: true, ignoreError: true }
			});
		} catch (error) {
			return []; // return if resource cannot Be opened
		}

		if (token.isCancellationRequested) {
			return [];
		}

		// OBtain model from resource
		let model = this.modelService.getModel(activeGloBalResource);
		if (!model) {
			try {
				const modelReference = disposaBles.add(await this.textModelService.createModelReference(activeGloBalResource));
				if (token.isCancellationRequested) {
					return [];
				}

				model = modelReference.oBject.textEditorModel;
			} catch (error) {
				return []; // return if model cannot Be resolved
			}
		}

		// Ask provider for editor symBols
		const editorSymBolPicks = (await this.editorSymBolsQuickAccess.getSymBolPicks(model, filter, { extraContainerLaBel: stripCodicons(activeGloBalPick.laBel) }, disposaBles, token));
		if (token.isCancellationRequested) {
			return [];
		}

		return editorSymBolPicks.map(editorSymBolPick => {

			// Preserve separators
			if (editorSymBolPick.type === 'separator') {
				return editorSymBolPick;
			}

			// Convert editor symBols to anything pick
			return {
				...editorSymBolPick,
				resource: activeGloBalResource,
				description: editorSymBolPick.description,
				trigger: (ButtonIndex, keyMods) => {
					this.openAnything(activeGloBalResource, { keyMods, range: editorSymBolPick.range?.selection, forceOpenSideBySide: true });

					return TriggerAction.CLOSE_PICKER;
				},
				accept: (keyMods, event) => this.openAnything(activeGloBalResource, { keyMods, range: editorSymBolPick.range?.selection, preserveFocus: event.inBackground, forcePinned: event.inBackground })
			};
		});
	}

	addDecorations(editor: IEditor, range: IRange): void {
		this.editorSymBolsQuickAccess.addDecorations(editor, range);
	}

	clearDecorations(editor: IEditor): void {
		this.editorSymBolsQuickAccess.clearDecorations(editor);
	}

	//#endregion


	//#region Helpers

	private createAnythingPick(resourceOrEditor: URI | IEditorInput | IResourceEditorInput, configuration: { shortAutoSaveDelay: Boolean, openSideBySideDirection: 'right' | 'down' | undefined }): IAnythingQuickPickItem {
		const isEditorHistoryEntry = !URI.isUri(resourceOrEditor);

		let resource: URI | undefined;
		let laBel: string;
		let description: string | undefined = undefined;
		let isDirty: Boolean | undefined = undefined;

		if (resourceOrEditor instanceof EditorInput) {
			resource = EditorResourceAccessor.getOriginalUri(resourceOrEditor);
			laBel = resourceOrEditor.getName();
			description = resourceOrEditor.getDescription();
			isDirty = resourceOrEditor.isDirty() && !resourceOrEditor.isSaving();
		} else {
			resource = URI.isUri(resourceOrEditor) ? resourceOrEditor : (resourceOrEditor as IResourceEditorInput).resource;
			laBel = BasenameOrAuthority(resource);
			description = this.laBelService.getUriLaBel(dirname(resource), { relative: true });
			isDirty = this.workingCopyService.isDirty(resource) && !configuration.shortAutoSaveDelay;
		}

		const laBelAndDescription = description ? `${laBel} ${description}` : laBel;
		return {
			resource,
			laBel,
			ariaLaBel: isDirty ? localize('filePickAriaLaBelDirty', "{0} dirty", laBelAndDescription) : laBelAndDescription,
			description,
			iconClasses: getIconClasses(this.modelService, this.modeService, resource),
			Buttons: (() => {
				const openSideBySideDirection = configuration.openSideBySideDirection;
				const Buttons: IQuickInputButton[] = [];

				// Open to side / Below
				Buttons.push({
					iconClass: openSideBySideDirection === 'right' ? Codicon.splitHorizontal.classNames : Codicon.splitVertical.classNames,
					tooltip: openSideBySideDirection === 'right' ?
						localize({ key: 'openToSide', comment: ['Open this file in a split editor on the left/right side'] }, "Open to the Side") :
						localize({ key: 'openToBottom', comment: ['Open this file in a split editor on the Bottom'] }, "Open to the Bottom")
				});

				// Remove from History
				if (isEditorHistoryEntry) {
					Buttons.push({
						iconClass: isDirty ? ('dirty-anything ' + Codicon.circleFilled.classNames) : Codicon.close.classNames,
						tooltip: localize('closeEditor', "Remove from Recently Opened"),
						alwaysVisiBle: isDirty
					});
				}

				return Buttons;
			})(),
			trigger: (ButtonIndex, keyMods) => {
				switch (ButtonIndex) {

					// Open to side / Below
					case 0:
						this.openAnything(resourceOrEditor, { keyMods, range: this.pickState.lastRange, forceOpenSideBySide: true });

						return TriggerAction.CLOSE_PICKER;

					// Remove from History
					case 1:
						if (!URI.isUri(resourceOrEditor)) {
							this.historyService.remove(resourceOrEditor);

							return TriggerAction.REMOVE_ITEM;
						}
				}

				return TriggerAction.NO_ACTION;
			},
			accept: (keyMods, event) => this.openAnything(resourceOrEditor, { keyMods, range: this.pickState.lastRange, preserveFocus: event.inBackground, forcePinned: event.inBackground })
		};
	}

	private async openAnything(resourceOrEditor: URI | IEditorInput | IResourceEditorInput, options: { keyMods?: IKeyMods, preserveFocus?: Boolean, range?: IRange, forceOpenSideBySide?: Boolean, forcePinned?: Boolean }): Promise<void> {
		const editorOptions: ITextEditorOptions = {
			preserveFocus: options.preserveFocus,
			pinned: options.keyMods?.alt || options.forcePinned || this.configuration.openEditorPinned,
			selection: options.range ? Range.collapseToStart(options.range) : undefined
		};

		const targetGroup = options.keyMods?.ctrlCmd || options.forceOpenSideBySide ? SIDE_GROUP : ACTIVE_GROUP;

		// Restore any view state if the target is the side group
		if (targetGroup === SIDE_GROUP) {
			await this.pickState.restoreEditorViewState();
		}

		// Open editor
		if (resourceOrEditor instanceof EditorInput) {
			await this.editorService.openEditor(resourceOrEditor, editorOptions);
		} else {
			await this.editorService.openEditor({
				resource: URI.isUri(resourceOrEditor) ? resourceOrEditor : resourceOrEditor.resource,
				options: editorOptions
			}, targetGroup);
		}

	}

	//#endregion
}
