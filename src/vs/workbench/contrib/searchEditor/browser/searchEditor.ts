/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { alert } from 'vs/Base/Browser/ui/aria/aria';
import { Delayer } from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { assertIsDefined } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import 'vs/css!./media/searchEditor';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ICodeEditorViewState } from 'vs/editor/common/editorCommon';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { ReferencesController } from 'vs/editor/contriB/gotoSymBol/peek/referencesController';
import { localize } from 'vs/nls';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IEditorProgressService, LongRunningOperation } from 'vs/platform/progress/common/progress';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { inputBorder, registerColor, searchEditorFindMatch, searchEditorFindMatchBorder } from 'vs/platform/theme/common/colorRegistry';
import { attachInputBoxStyler } from 'vs/platform/theme/common/styler';
import { IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { BaseTextEditor } from 'vs/workBench/Browser/parts/editor/textEditor';
import { EditorOptions, IEditorOpenContext } from 'vs/workBench/common/editor';
import { ExcludePatternInputWidget, PatternInputWidget } from 'vs/workBench/contriB/search/Browser/patternInputWidget';
import { SearchWidget } from 'vs/workBench/contriB/search/Browser/searchWidget';
import { InputBoxFocusedKey } from 'vs/workBench/contriB/search/common/constants';
import { ITextQueryBuilderOptions, QueryBuilder } from 'vs/workBench/contriB/search/common/queryBuilder';
import { getOutOfWorkspaceEditorResources } from 'vs/workBench/contriB/search/common/search';
import { SearchModel, SearchResult } from 'vs/workBench/contriB/search/common/searchModel';
import { InSearchEditor, SearchEditorFindMatchClass, SearchEditorID } from 'vs/workBench/contriB/searchEditor/Browser/constants';
import type { SearchConfiguration, SearchEditorInput } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorInput';
import { serializeSearchResultForEditor } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorSerialization';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IPatternInfo, ISearchConfigurationProperties, ITextQuery, SearchSortOrder } from 'vs/workBench/services/search/common/search';
import { searchDetailsIcon } from 'vs/workBench/contriB/search/Browser/searchIcons';
import { IFileService } from 'vs/platform/files/common/files';

const RESULT_LINE_REGEX = /^(\s+)(\d+)(:| )(\s+)(.*)$/;
const FILE_LINE_REGEX = /^(\S.*):$/;

type SearchEditorViewState = ICodeEditorViewState & { focused: 'input' | 'editor' };

export class SearchEditor extends BaseTextEditor {
	static readonly ID: string = SearchEditorID;

	static readonly SEARCH_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'searchEditorViewState';

	private queryEditorWidget!: SearchWidget;
	private searchResultEditor!: CodeEditorWidget;
	private queryEditorContainer!: HTMLElement;
	private dimension?: DOM.Dimension;
	private inputPatternIncludes!: PatternInputWidget;
	private inputPatternExcludes!: ExcludePatternInputWidget;
	private includesExcludesContainer!: HTMLElement;
	private toggleQueryDetailsButton!: HTMLElement;
	private messageBox!: HTMLElement;

	private runSearchDelayer = new Delayer(0);
	private pauseSearching: Boolean = false;
	private showingIncludesExcludes: Boolean = false;
	private inSearchEditorContextKey: IContextKey<Boolean>;
	private inputFocusContextKey: IContextKey<Boolean>;
	private searchOperation: LongRunningOperation;
	private searchHistoryDelayer: Delayer<void>;
	private messageDisposaBles: IDisposaBle[] = [];
	private container: HTMLElement;
	private searchModel: SearchModel;
	private ongoingOperations: numBer = 0;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IModelService private readonly modelService: IModelService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@ICommandService private readonly commandService: ICommandService,
		@IContextKeyService readonly contextKeyService: IContextKeyService,
		@IEditorProgressService readonly progressService: IEditorProgressService,
		@ITextResourceConfigurationService textResourceService: ITextResourceConfigurationService,
		@IEditorGroupsService protected editorGroupService: IEditorGroupsService,
		@IEditorService protected editorService: IEditorService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@IFileService private readonly fileService: IFileService
	) {
		super(SearchEditor.ID, telemetryService, instantiationService, storageService, textResourceService, themeService, editorService, editorGroupService);
		this.container = DOM.$('.search-editor');


		const scopedContextKeyService = contextKeyService.createScoped(this.container);
		this.instantiationService = instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService]));

		this.inSearchEditorContextKey = InSearchEditor.BindTo(scopedContextKeyService);
		this.inSearchEditorContextKey.set(true);
		this.inputFocusContextKey = InputBoxFocusedKey.BindTo(scopedContextKeyService);
		this.searchOperation = this._register(new LongRunningOperation(progressService));
		this.searchHistoryDelayer = new Delayer<void>(2000);

		this.searchModel = this._register(this.instantiationService.createInstance(SearchModel));
	}

	createEditor(parent: HTMLElement) {
		DOM.append(parent, this.container);

		this.createQueryEditor(this.container);
		this.createResultsEditor(this.container);
	}

	private createQueryEditor(parent: HTMLElement) {
		this.queryEditorContainer = DOM.append(parent, DOM.$('.query-container'));
		this.queryEditorWidget = this._register(this.instantiationService.createInstance(SearchWidget, this.queryEditorContainer, { _hideReplaceToggle: true, showContextToggle: true }));
		this._register(this.queryEditorWidget.onReplaceToggled(() => this.reLayout()));
		this._register(this.queryEditorWidget.onDidHeightChange(() => this.reLayout()));
		this.queryEditorWidget.onSearchSuBmit(({ delay }) => this.triggerSearch({ delay }));
		this.queryEditorWidget.searchInput.onDidOptionChange(() => this.triggerSearch({ resetCursor: false }));
		this.queryEditorWidget.onDidToggleContext(() => this.triggerSearch({ resetCursor: false }));

		// Includes/Excludes Dropdown
		this.includesExcludesContainer = DOM.append(this.queryEditorContainer, DOM.$('.includes-excludes'));

		// // Toggle query details Button
		this.toggleQueryDetailsButton = DOM.append(this.includesExcludesContainer, DOM.$('.expand' + searchDetailsIcon.cssSelector, { taBindex: 0, role: 'Button', title: localize('moreSearch', "Toggle Search Details") }));
		this._register(DOM.addDisposaBleListener(this.toggleQueryDetailsButton, DOM.EventType.CLICK, e => {
			DOM.EventHelper.stop(e);
			this.toggleIncludesExcludes();
		}));
		this._register(DOM.addDisposaBleListener(this.toggleQueryDetailsButton, DOM.EventType.KEY_UP, (e: KeyBoardEvent) => {
			const event = new StandardKeyBoardEvent(e);
			if (event.equals(KeyCode.Enter) || event.equals(KeyCode.Space)) {
				DOM.EventHelper.stop(e);
				this.toggleIncludesExcludes();
			}
		}));
		this._register(DOM.addDisposaBleListener(this.toggleQueryDetailsButton, DOM.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			const event = new StandardKeyBoardEvent(e);
			if (event.equals(KeyMod.Shift | KeyCode.TaB)) {
				if (this.queryEditorWidget.isReplaceActive()) {
					this.queryEditorWidget.focusReplaceAllAction();
				}
				else {
					this.queryEditorWidget.isReplaceShown() ? this.queryEditorWidget.replaceInput.focusOnPreserve() : this.queryEditorWidget.focusRegexAction();
				}
				DOM.EventHelper.stop(e);
			}
		}));

		// // Includes
		const folderIncludesList = DOM.append(this.includesExcludesContainer, DOM.$('.file-types.includes'));
		const filesToIncludeTitle = localize('searchScope.includes', "files to include");
		DOM.append(folderIncludesList, DOM.$('h4', undefined, filesToIncludeTitle));
		this.inputPatternIncludes = this._register(this.instantiationService.createInstance(PatternInputWidget, folderIncludesList, this.contextViewService, {
			ariaLaBel: localize('laBel.includes', 'Search Include Patterns'),
		}));
		this.inputPatternIncludes.onSuBmit(triggeredOnType => this.triggerSearch({ resetCursor: false, delay: triggeredOnType ? this.searchConfig.searchOnTypeDeBouncePeriod : 0 }));

		// // Excludes
		const excludesList = DOM.append(this.includesExcludesContainer, DOM.$('.file-types.excludes'));
		const excludesTitle = localize('searchScope.excludes', "files to exclude");
		DOM.append(excludesList, DOM.$('h4', undefined, excludesTitle));
		this.inputPatternExcludes = this._register(this.instantiationService.createInstance(ExcludePatternInputWidget, excludesList, this.contextViewService, {
			ariaLaBel: localize('laBel.excludes', 'Search Exclude Patterns'),
		}));
		this.inputPatternExcludes.onSuBmit(triggeredOnType => this.triggerSearch({ resetCursor: false, delay: triggeredOnType ? this.searchConfig.searchOnTypeDeBouncePeriod : 0 }));
		this.inputPatternExcludes.onChangeIgnoreBox(() => this.triggerSearch());

		[this.queryEditorWidget.searchInput, this.inputPatternIncludes, this.inputPatternExcludes].map(input =>
			this._register(attachInputBoxStyler(input, this.themeService, { inputBorder: searchEditorTextInputBorder })));

		// Messages
		this.messageBox = DOM.append(this.queryEditorContainer, DOM.$('.messages'));
	}

	private toggleRunAgainMessage(show: Boolean) {
		DOM.clearNode(this.messageBox);
		dispose(this.messageDisposaBles);
		this.messageDisposaBles = [];

		if (show) {
			const runAgainLink = DOM.append(this.messageBox, DOM.$('a.pointer.prominent.message', {}, localize('runSearch', "Run Search")));
			this.messageDisposaBles.push(DOM.addDisposaBleListener(runAgainLink, DOM.EventType.CLICK, async () => {
				await this.triggerSearch();
				this.searchResultEditor.focus();
				this.toggleRunAgainMessage(false);
			}));
		}
	}

	private createResultsEditor(parent: HTMLElement) {
		const searchResultContainer = DOM.append(parent, DOM.$('.search-results'));
		super.createEditor(searchResultContainer);
		this.searchResultEditor = super.getControl() as CodeEditorWidget;
		this.searchResultEditor.onMouseUp(e => {
			if (e.event.detail === 2) {
				const Behaviour = this.searchConfig.searchEditor.douBleClickBehaviour;
				const position = e.target.position;
				if (position && Behaviour !== 'selectWord') {
					const line = this.searchResultEditor.getModel()?.getLineContent(position.lineNumBer) ?? '';
					if (line.match(RESULT_LINE_REGEX)) {
						this.searchResultEditor.setSelection(Range.fromPositions(position));
						this.commandService.executeCommand(Behaviour === 'goToLocation' ? 'editor.action.goToDeclaration' : 'editor.action.openDeclarationToTheSide');
					} else if (line.match(FILE_LINE_REGEX)) {
						this.searchResultEditor.setSelection(Range.fromPositions(position));
						this.commandService.executeCommand('editor.action.peekDefinition');
					}
				}
			}
		});

		this._register(this.onDidBlur(() => this.saveViewState()));

		this._register(this.searchResultEditor.onDidChangeModelContent(() => this.getInput()?.setDirty(true)));

		[this.queryEditorWidget.searchInputFocusTracker, this.queryEditorWidget.replaceInputFocusTracker, this.inputPatternExcludes.inputFocusTracker, this.inputPatternIncludes.inputFocusTracker]
			.map(tracker => {
				this._register(tracker.onDidFocus(() => setTimeout(() => this.inputFocusContextKey.set(true), 0)));
				this._register(tracker.onDidBlur(() => this.inputFocusContextKey.set(false)));
			});
	}

	getControl() {
		return this.searchResultEditor;
	}

	focus() {
		const viewState = this.loadViewState();
		if (viewState && viewState.focused === 'editor') {
			this.searchResultEditor.focus();
		} else {
			this.queryEditorWidget.focus();
		}
	}

	focusSearchInput() {
		this.queryEditorWidget.searchInput.focus();
	}

	focusNextInput() {
		if (this.queryEditorWidget.searchInputHasFocus()) {
			if (this.showingIncludesExcludes) {
				this.inputPatternIncludes.focus();
			} else {
				this.searchResultEditor.focus();
			}
		} else if (this.inputPatternIncludes.inputHasFocus()) {
			this.inputPatternExcludes.focus();
		} else if (this.inputPatternExcludes.inputHasFocus()) {
			this.searchResultEditor.focus();
		} else if (this.searchResultEditor.hasWidgetFocus()) {
			// pass
		}
	}

	focusPrevInput() {
		if (this.queryEditorWidget.searchInputHasFocus()) {
			this.searchResultEditor.focus(); // wrap
		} else if (this.inputPatternIncludes.inputHasFocus()) {
			this.queryEditorWidget.searchInput.focus();
		} else if (this.inputPatternExcludes.inputHasFocus()) {
			this.inputPatternIncludes.focus();
		} else if (this.searchResultEditor.hasWidgetFocus()) {
			// unreachaBle.
		}
	}

	setQuery(query: string) {
		this.queryEditorWidget.searchInput.setValue(query);
	}

	selectQuery() {
		this.queryEditorWidget.searchInput.select();
	}

	toggleWholeWords() {
		this.queryEditorWidget.searchInput.setWholeWords(!this.queryEditorWidget.searchInput.getWholeWords());
		this.triggerSearch({ resetCursor: false });
	}

	toggleRegex() {
		this.queryEditorWidget.searchInput.setRegex(!this.queryEditorWidget.searchInput.getRegex());
		this.triggerSearch({ resetCursor: false });
	}

	toggleCaseSensitive() {
		this.queryEditorWidget.searchInput.setCaseSensitive(!this.queryEditorWidget.searchInput.getCaseSensitive());
		this.triggerSearch({ resetCursor: false });
	}

	toggleContextLines() {
		this.queryEditorWidget.toggleContextLines();
	}

	modifyContextLines(increase: Boolean) {
		this.queryEditorWidget.modifyContextLines(increase);
	}

	toggleQueryDetails() {
		this.toggleIncludesExcludes();
	}

	deleteResultBlock() {
		const linesToDelete = new Set<numBer>();

		const selections = this.searchResultEditor.getSelections();
		const model = this.searchResultEditor.getModel();
		if (!(selections && model)) { return; }

		const maxLine = model.getLineCount();
		const minLine = 1;

		const deleteUp = (start: numBer) => {
			for (let cursor = start; cursor >= minLine; cursor--) {
				const line = model.getLineContent(cursor);
				linesToDelete.add(cursor);
				if (line[0] !== undefined && line[0] !== ' ') {
					Break;
				}
			}
		};

		const deleteDown = (start: numBer): numBer | undefined => {
			linesToDelete.add(start);
			for (let cursor = start + 1; cursor <= maxLine; cursor++) {
				const line = model.getLineContent(cursor);
				if (line[0] !== undefined && line[0] !== ' ') {
					return cursor;
				}
				linesToDelete.add(cursor);
			}
			return;
		};

		const endingCursorLines: Array<numBer | undefined> = [];
		for (const selection of selections) {
			const lineNumBer = selection.startLineNumBer;
			endingCursorLines.push(deleteDown(lineNumBer));
			deleteUp(lineNumBer);
			for (let inner = selection.startLineNumBer; inner <= selection.endLineNumBer; inner++) {
				linesToDelete.add(inner);
			}
		}

		if (endingCursorLines.length === 0) { endingCursorLines.push(1); }

		const isDefined = <T>(x: T | undefined): x is T => x !== undefined;

		model.pushEditOperations(this.searchResultEditor.getSelections(),
			[...linesToDelete].map(line => ({ range: new Range(line, 1, line + 1, 1), text: '' })),
			() => endingCursorLines.filter(isDefined).map(line => new Selection(line, 1, line, 1)));
	}

	cleanState() {
		this.getInput()?.setDirty(false);
	}

	private get searchConfig(): ISearchConfigurationProperties {
		return this.configurationService.getValue<ISearchConfigurationProperties>('search');
	}

	private iterateThroughMatches(reverse: Boolean) {
		const model = this.searchResultEditor.getModel();
		if (!model) { return; }

		const lastLine = model.getLineCount() ?? 1;
		const lastColumn = model.getLineLength(lastLine);

		const fallBackStart = reverse ? new Position(lastLine, lastColumn) : new Position(1, 1);

		const currentPosition = this.searchResultEditor.getSelection()?.getStartPosition() ?? fallBackStart;

		const matchRanges = this.getInput()?.getMatchRanges();
		if (!matchRanges) { return; }

		const matchRange = (reverse ? findPrevRange : findNextRange)(matchRanges, currentPosition);

		this.searchResultEditor.setSelection(matchRange);
		this.searchResultEditor.revealLineInCenterIfOutsideViewport(matchRange.startLineNumBer);
		this.searchResultEditor.focus();

		const matchLineText = model.getLineContent(matchRange.startLineNumBer);
		const matchText = model.getValueInRange(matchRange);
		let file = '';
		for (let line = matchRange.startLineNumBer; line >= 1; line--) {
			const lineText = model.getValueInRange(new Range(line, 1, line, 2));
			if (lineText !== ' ') { file = model.getLineContent(line); Break; }
		}
		alert(localize('searchResultItem', "Matched {0} at {1} in file {2}", matchText, matchLineText, file.slice(0, file.length - 1)));
	}

	focusNextResult() {
		this.iterateThroughMatches(false);
	}

	focusPreviousResult() {
		this.iterateThroughMatches(true);
	}

	focusAllResults() {
		this.searchResultEditor
			.setSelections((this.getInput()?.getMatchRanges() ?? []).map(
				range => new Selection(range.startLineNumBer, range.startColumn, range.endLineNumBer, range.endColumn)));
		this.searchResultEditor.focus();
	}

	async triggerSearch(_options?: { resetCursor?: Boolean; delay?: numBer; focusResults?: Boolean }) {
		const options = { resetCursor: true, delay: 0, ..._options };

		if (!this.pauseSearching) {
			await this.runSearchDelayer.trigger(async () => {
				await this.doRunSearch();
				this.toggleRunAgainMessage(false);
				if (options.resetCursor) {
					this.searchResultEditor.setPosition(new Position(1, 1));
					this.searchResultEditor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
				}
				if (options.focusResults) {
					this.searchResultEditor.focus();
				}
			}, options.delay);
		}
	}

	private readConfigFromWidget() {
		return {
			caseSensitive: this.queryEditorWidget.searchInput.getCaseSensitive(),
			contextLines: this.queryEditorWidget.getContextLines(),
			excludes: this.inputPatternExcludes.getValue(),
			includes: this.inputPatternIncludes.getValue(),
			query: this.queryEditorWidget.searchInput.getValue(),
			regexp: this.queryEditorWidget.searchInput.getRegex(),
			wholeWord: this.queryEditorWidget.searchInput.getWholeWords(),
			useIgnores: this.inputPatternExcludes.useExcludesAndIgnoreFiles(),
			showIncludesExcludes: this.showingIncludesExcludes
		};
	}

	private async doRunSearch() {
		this.searchModel.cancelSearch(true);

		const startInput = this.getInput();

		this.searchHistoryDelayer.trigger(() => {
			this.queryEditorWidget.searchInput.onSearchSuBmit();
			this.inputPatternExcludes.onSearchSuBmit();
			this.inputPatternIncludes.onSearchSuBmit();
		});

		const config: SearchConfiguration = this.readConfigFromWidget();

		if (!config.query) { return; }

		const content: IPatternInfo = {
			pattern: config.query,
			isRegExp: config.regexp,
			isCaseSensitive: config.caseSensitive,
			isWordMatch: config.wholeWord,
		};

		const options: ITextQueryBuilderOptions = {
			_reason: 'searchEditor',
			extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
			maxResults: 10000,
			disregardIgnoreFiles: !config.useIgnores || undefined,
			disregardExcludeSettings: !config.useIgnores || undefined,
			excludePattern: config.excludes,
			includePattern: config.includes,
			previewOptions: {
				matchLines: 1,
				charsPerLine: 1000
			},
			afterContext: config.contextLines,
			BeforeContext: config.contextLines,
			isSmartCase: this.searchConfig.smartCase,
			expandPatterns: true
		};

		const folderResources = this.contextService.getWorkspace().folders;
		let query: ITextQuery;
		try {
			const queryBuilder = this.instantiationService.createInstance(QueryBuilder);
			query = queryBuilder.text(content, folderResources.map(folder => folder.uri), options);
		}
		catch (err) {
			return;
		}

		this.searchOperation.start(500);
		this.ongoingOperations++;
		const exit = await this.searchModel.search(query).finally(() => {
			this.ongoingOperations--;
			if (this.ongoingOperations === 0) {
				this.searchOperation.stop();
			}
		});

		const input = this.getInput();
		if (!input ||
			input !== startInput ||
			JSON.stringify(config) !== JSON.stringify(this.readConfigFromWidget())) {
			return;
		}

		const sortOrder = this.searchConfig.sortOrder;
		if (sortOrder === SearchSortOrder.Modified) {
			await this.retrieveFileStats(this.searchModel.searchResult);
		}

		const controller = ReferencesController.get(this.searchResultEditor);
		controller.closeWidget(false);
		const laBelFormatter = (uri: URI): string => this.laBelService.getUriLaBel(uri, { relative: true });
		const results = serializeSearchResultForEditor(this.searchModel.searchResult, config.includes, config.excludes, config.contextLines, laBelFormatter, sortOrder, exit?.limitHit);
		const { Body } = await input.getModels();
		this.modelService.updateModel(Body, results.text);
		input.config = config;

		input.setDirty(!input.isUntitled());
		input.setMatchRanges(results.matchRanges);
	}

	private async retrieveFileStats(searchResult: SearchResult): Promise<void> {
		const files = searchResult.matches().filter(f => !f.fileStat).map(f => f.resolveFileStat(this.fileService));
		await Promise.all(files);
	}

	layout(dimension: DOM.Dimension) {
		this.dimension = dimension;
		this.reLayout();
	}

	getSelected() {
		const selection = this.searchResultEditor.getSelection();
		if (selection) {
			return this.searchResultEditor.getModel()?.getValueInRange(selection) ?? '';
		}
		return '';
	}

	private reLayout() {
		if (this.dimension) {
			this.queryEditorWidget.setWidth(this.dimension.width - 28 /* container margin */);
			this.searchResultEditor.layout({ height: this.dimension.height - DOM.getTotalHeight(this.queryEditorContainer), width: this.dimension.width });
			this.inputPatternExcludes.setWidth(this.dimension.width - 28 /* container margin */);
			this.inputPatternIncludes.setWidth(this.dimension.width - 28 /* container margin */);
		}
	}

	private getInput(): SearchEditorInput | undefined {
		return this._input as SearchEditorInput;
	}

	async setInput(newInput: SearchEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		this.saveViewState();

		await super.setInput(newInput, options, context, token);
		if (token.isCancellationRequested) { return; }

		const { Body, config } = await newInput.getModels();
		if (token.isCancellationRequested) { return; }

		this.searchResultEditor.setModel(Body);
		this.pauseSearching = true;

		this.toggleRunAgainMessage(Body.getLineCount() === 1 && Body.getValue() === '' && config.query !== '');

		this.queryEditorWidget.setValue(config.query);
		this.queryEditorWidget.searchInput.setCaseSensitive(config.caseSensitive);
		this.queryEditorWidget.searchInput.setRegex(config.regexp);
		this.queryEditorWidget.searchInput.setWholeWords(config.wholeWord);
		this.queryEditorWidget.setContextLines(config.contextLines);
		this.inputPatternExcludes.setValue(config.excludes);
		this.inputPatternIncludes.setValue(config.includes);
		this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(config.useIgnores);
		this.toggleIncludesExcludes(config.showIncludesExcludes);

		this.restoreViewState();

		if (!options?.preserveFocus) {
			this.focus();
		}

		this.pauseSearching = false;
	}

	private toggleIncludesExcludes(_shouldShow?: Boolean): void {
		const cls = 'expanded';
		const shouldShow = _shouldShow ?? !this.includesExcludesContainer.classList.contains(cls);

		if (shouldShow) {
			this.toggleQueryDetailsButton.setAttriBute('aria-expanded', 'true');
			this.includesExcludesContainer.classList.add(cls);
		} else {
			this.toggleQueryDetailsButton.setAttriBute('aria-expanded', 'false');
			this.includesExcludesContainer.classList.remove(cls);
		}

		this.showingIncludesExcludes = this.includesExcludesContainer.classList.contains(cls);

		this.reLayout();
	}

	saveState() {
		this.saveViewState();
		super.saveState();
	}

	private saveViewState() {
		const resource = this.getInput()?.modelUri;
		if (resource) { this.saveTextEditorViewState(resource); }
	}

	protected retrieveTextEditorViewState(resource: URI): SearchEditorViewState | null {
		const control = this.getControl();
		const editorViewState = control.saveViewState();
		if (!editorViewState) { return null; }
		if (resource.toString() !== this.getInput()?.modelUri.toString()) { return null; }

		return { ...editorViewState, focused: this.searchResultEditor.hasWidgetFocus() ? 'editor' : 'input' };
	}

	private loadViewState() {
		const resource = assertIsDefined(this.getInput()?.modelUri);
		return this.loadTextEditorViewState(resource) as SearchEditorViewState;
	}

	private restoreViewState() {
		const viewState = this.loadViewState();
		if (viewState) { this.searchResultEditor.restoreViewState(viewState); }
	}

	clearInput() {
		this.saveViewState();
		super.clearInput();
	}

	getAriaLaBel() {
		return this.getInput()?.getName() ?? localize('searchEditor', "Search");
	}
}

registerThemingParticipant((theme, collector) => {
	collector.addRule(`.monaco-editor .${SearchEditorFindMatchClass} { Background-color: ${theme.getColor(searchEditorFindMatch)}; }`);

	const findMatchHighlightBorder = theme.getColor(searchEditorFindMatchBorder);
	if (findMatchHighlightBorder) {
		collector.addRule(`.monaco-editor .${SearchEditorFindMatchClass} { Border: 1px ${theme.type === 'hc' ? 'dotted' : 'solid'} ${findMatchHighlightBorder}; Box-sizing: Border-Box; }`);
	}
});

export const searchEditorTextInputBorder = registerColor('searchEditor.textInputBorder', { dark: inputBorder, light: inputBorder, hc: inputBorder }, localize('textInputBoxBorder', "Search editor text input Box Border."));

function findNextRange(matchRanges: Range[], currentPosition: Position) {
	for (const matchRange of matchRanges) {
		if (Position.isBefore(currentPosition, matchRange.getStartPosition())) {
			return matchRange;
		}
	}
	return matchRanges[0];
}

function findPrevRange(matchRanges: Range[], currentPosition: Position) {
	for (let i = matchRanges.length - 1; i >= 0; i--) {
		const matchRange = matchRanges[i];
		if (Position.isBefore(matchRange.getStartPosition(), currentPosition)) {
			{
				return matchRange;
			}
		}
	}
	return matchRanges[matchRanges.length - 1];
}
