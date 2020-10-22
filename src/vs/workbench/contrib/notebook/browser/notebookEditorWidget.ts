/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getZoomLevel } from 'vs/Base/Browser/Browser';
import * as DOM from 'vs/Base/Browser/dom';
import * as strings from 'vs/Base/common/strings';
import { IMouseWheelEvent, StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { IListContextMenuEvent } from 'vs/Base/Browser/ui/list/list';
import { IAction, Separator } from 'vs/Base/common/actions';
import { SequencerByKey } from 'vs/Base/common/async';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { Color, RGBA } from 'vs/Base/common/color';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { comBinedDisposaBle, DisposaBle, DisposaBleStore, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { ScrollEvent } from 'vs/Base/common/scrollaBle';
import { URI } from 'vs/Base/common/uri';
import { generateUuid } from 'vs/Base/common/uuid';
import 'vs/css!./media/noteBook';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { BareFontInfo } from 'vs/editor/common/config/fontInfo';
import { Range } from 'vs/editor/common/core/range';
import { IContentDecorationRenderOptions, IEditor, isThemeColor } from 'vs/editor/common/editorCommon';
import * as nls from 'vs/nls';
import { IMenuService, MenuId } from 'vs/platform/actions/common/actions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { IQuickInputService, IQuickPickItem, QuickPickInput } from 'vs/platform/quickinput/common/quickInput';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { contrastBorder, diffInserted, diffRemoved, editorBackground, errorForeground, focusBorder, foreground, listFocusBackground, listInactiveSelectionBackground, registerColor, scrollBarSliderActiveBackground, scrollBarSliderBackground, scrollBarSliderHoverBackground, textBlockQuoteBackground, textBlockQuoteBorder, textLinkActiveForeground, textLinkForeground, textPreformatForeground, transparent } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, IThemeService, registerThemingParticipant, ThemeColor } from 'vs/platform/theme/common/themeService';
import { EditorMemento } from 'vs/workBench/Browser/parts/editor/editorPane';
import { IEditorMemento } from 'vs/workBench/common/editor';
import { Memento, MementoOBject } from 'vs/workBench/common/memento';
import { PANEL_BORDER } from 'vs/workBench/common/theme';
import { deBugIconStartForeground } from 'vs/workBench/contriB/deBug/Browser/deBugToolBar';
import { BOTTOM_CELL_TOOLBAR_GAP, BOTTOM_CELL_TOOLBAR_HEIGHT, CELL_BOTTOM_MARGIN, CELL_MARGIN, CELL_RUN_GUTTER, CELL_TOP_MARGIN, CODE_CELL_LEFT_MARGIN, COLLAPSED_INDICATOR_HEIGHT, SCROLLABLE_ELEMENT_PADDING_TOP } from 'vs/workBench/contriB/noteBook/Browser/constants';
import { CellEditState, CellFocusMode, ICellViewModel, INoteBookCellList, INoteBookDeltaDecoration, INoteBookEditor, INoteBookEditorContriBution, INoteBookEditorContriButionDescription, INoteBookEditorCreationOptions, INoteBookEditorMouseEvent, NoteBookEditorOptions, NoteBookLayoutInfo, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_EXECUTING_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_RUNNABLE, NOTEBOOK_HAS_MULTIPLE_KERNELS, NOTEBOOK_OUTPUT_FOCUSED } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { NoteBookEditorExtensionsRegistry } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorExtensions';
import { NoteBookKernelProviderAssociation, NoteBookKernelProviderAssociations, noteBookKernelProviderAssociationsSettingId } from 'vs/workBench/contriB/noteBook/Browser/noteBookKernelAssociation';
import { NoteBookCellList } from 'vs/workBench/contriB/noteBook/Browser/view/noteBookCellList';
import { OutputRenderer } from 'vs/workBench/contriB/noteBook/Browser/view/output/outputRenderer';
import { BackLayerWeBView } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/BackLayerWeBView';
import { CellContextKeyManager } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/cellContextKeys';
import { CodeCellRenderer, ListTopCellToolBar, MarkdownCellRenderer, NoteBookCellListDelegate } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/cellRenderer';
import { CellDragAndDropController } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/dnd';
import { CodeCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/codeCellViewModel';
import { NoteBookEventDispatcher, NoteBookLayoutChangedEvent } from 'vs/workBench/contriB/noteBook/Browser/viewModel/eventDispatcher';
import { CellViewModel, IModelDecorationsChangeAccessor, INoteBookEditorViewState, NoteBookViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { CellKind, CellToolBarLocKey, ICellRange, IInsetRenderOutput, INoteBookDecorationRenderOptions, INoteBookKernelInfo2, IProcessedOutput, isTransformedDisplayOutput, NoteBookCellRunState, NoteBookRunState, ShowCellStatusBarKey } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { NoteBookProviderInfo } from 'vs/workBench/contriB/noteBook/common/noteBookProvider';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { editorGutterModifiedBackground } from 'vs/workBench/contriB/scm/Browser/dirtydiffDecorator';
import { WeBview } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';

const $ = DOM.$;

const NoteBookEditorActiveKernelCache = 'workBench.editor.noteBook.activeKernel';

export class NoteBookEditorWidget extends DisposaBle implements INoteBookEditor {
	static readonly ID: string = 'workBench.editor.noteBook';
	private static readonly EDITOR_MEMENTOS = new Map<string, EditorMemento<unknown>>();
	private _overlayContainer!: HTMLElement;
	private _Body!: HTMLElement;
	private _overflowContainer!: HTMLElement;
	private _weBview: BackLayerWeBView | null = null;
	private _weBviewResolved: Boolean = false;
	private _weBviewResolvePromise: Promise<BackLayerWeBView | null> | null = null;
	private _weBviewTransparentCover: HTMLElement | null = null;
	private _list: INoteBookCellList | undefined;
	private _dndController: CellDragAndDropController | null = null;
	private _listTopCellToolBar: ListTopCellToolBar | null = null;
	private _renderedEditors: Map<ICellViewModel, ICodeEditor | undefined> = new Map();
	private _eventDispatcher: NoteBookEventDispatcher | undefined;
	private _noteBookViewModel: NoteBookViewModel | undefined;
	private _localStore: DisposaBleStore = this._register(new DisposaBleStore());
	private _fontInfo: BareFontInfo | undefined;
	private _dimension: DOM.Dimension | null = null;
	private _shadowElementViewInfo: { height: numBer, width: numBer, top: numBer; left: numBer; } | null = null;

	private _editorFocus: IContextKey<Boolean> | null = null;
	private _outputFocus: IContextKey<Boolean> | null = null;
	private _editorEditaBle: IContextKey<Boolean> | null = null;
	private _editorRunnaBle: IContextKey<Boolean> | null = null;
	private _noteBookExecuting: IContextKey<Boolean> | null = null;
	private _noteBookHasMultipleKernels: IContextKey<Boolean> | null = null;
	private _outputRenderer: OutputRenderer;
	protected readonly _contriButions: { [key: string]: INoteBookEditorContriBution; };
	private _scrollBeyondLastLine: Boolean;
	private readonly _memento: Memento;
	private readonly _activeKernelMemento: Memento;
	private readonly _onDidFocusEmitter = this._register(new Emitter<void>());
	puBlic readonly onDidFocus = this._onDidFocusEmitter.event;
	private readonly _onWillScroll = this._register(new Emitter<ScrollEvent>());
	puBlic readonly onWillScroll: Event<ScrollEvent> = this._onWillScroll.event;
	private readonly _onWillDispose = this._register(new Emitter<void>());
	puBlic readonly onWillDispose: Event<void> = this._onWillDispose.event;

	private readonly _insetModifyQueueByOutputId = new SequencerByKey<string>();

	set scrollTop(top: numBer) {
		if (this._list) {
			this._list.scrollTop = top;
		}
	}

	private _cellContextKeyManager: CellContextKeyManager | null = null;
	private _isVisiBle = false;
	private readonly _uuid = generateUuid();
	private _weBiewFocused: Boolean = false;

	private _isDisposed: Boolean = false;

	get isDisposed() {
		return this._isDisposed;
	}

	private readonly _onDidChangeModel = this._register(new Emitter<NoteBookTextModel | undefined>());
	readonly onDidChangeModel: Event<NoteBookTextModel | undefined> = this._onDidChangeModel.event;

	private readonly _onDidFocusEditorWidget = this._register(new Emitter<void>());
	readonly onDidFocusEditorWidget = this._onDidFocusEditorWidget.event;

	set viewModel(newModel: NoteBookViewModel | undefined) {
		this._noteBookViewModel = newModel;
		this._onDidChangeModel.fire(newModel?.noteBookDocument);
	}

	get viewModel() {
		return this._noteBookViewModel;
	}

	get uri() {
		return this._noteBookViewModel?.uri;
	}

	get textModel() {
		return this._noteBookViewModel?.noteBookDocument;
	}

	private _activeKernel: INoteBookKernelInfo2 | undefined = undefined;
	private readonly _onDidChangeKernel = this._register(new Emitter<void>());
	readonly onDidChangeKernel: Event<void> = this._onDidChangeKernel.event;
	private readonly _onDidChangeAvailaBleKernels = this._register(new Emitter<void>());
	readonly onDidChangeAvailaBleKernels: Event<void> = this._onDidChangeAvailaBleKernels.event;

	get activeKernel() {
		return this._activeKernel;
	}

	set activeKernel(kernel: INoteBookKernelInfo2 | undefined) {
		if (this._isDisposed) {
			return;
		}

		if (this._activeKernel === kernel) {
			return;
		}

		this._activeKernel = kernel;
		this._activeKernelResolvePromise = undefined;

		const memento = this._activeKernelMemento.getMemento(StorageScope.GLOBAL);
		memento[this.viewModel!.viewType] = this._activeKernel?.id;
		this._activeKernelMemento.saveMemento();
		this._onDidChangeKernel.fire();
	}

	private _activeKernelResolvePromise: Promise<void> | undefined = undefined;

	private _currentKernelTokenSource: CancellationTokenSource | undefined = undefined;
	private _multipleKernelsAvailaBle: Boolean = false;

	get multipleKernelsAvailaBle() {
		return this._multipleKernelsAvailaBle;
	}

	set multipleKernelsAvailaBle(state: Boolean) {
		this._multipleKernelsAvailaBle = state;
		this._onDidChangeAvailaBleKernels.fire();
	}

	private readonly _onDidChangeActiveEditor = this._register(new Emitter<this>());
	readonly onDidChangeActiveEditor: Event<this> = this._onDidChangeActiveEditor.event;

	get activeCodeEditor(): IEditor | undefined {
		if (this._isDisposed) {
			return;
		}

		const [focused] = this._list!.getFocusedElements();
		return this._renderedEditors.get(focused);
	}

	private readonly _onDidChangeActiveCell = this._register(new Emitter<void>());
	readonly onDidChangeActiveCell: Event<void> = this._onDidChangeActiveCell.event;

	private readonly _onDidScroll = this._register(new Emitter<ScrollEvent>());

	readonly onDidScroll: Event<ScrollEvent> = this._onDidScroll.event;

	private _cursorNavigationMode: Boolean = false;
	get cursorNavigationMode(): Boolean {
		return this._cursorNavigationMode;
	}

	set cursorNavigationMode(v: Boolean) {
		this._cursorNavigationMode = v;
	}

	private readonly _onDidChangeSelection = this._register(new Emitter<void>());
	get onDidChangeSelection(): Event<void> { return this._onDidChangeSelection.event; }

	private readonly _onDidChangeVisiBleRanges = this._register(new Emitter<void>());
	onDidChangeVisiBleRanges: Event<void> = this._onDidChangeVisiBleRanges.event;

	get visiBleRanges() {
		return this._list?.visiBleRanges || [];
	}

	readonly isEmBedded: Boolean;

	puBlic readonly scopedContextKeyService: IContextKeyService;
	private readonly instantiationService: IInstantiationService;

	constructor(
		readonly creationOptions: INoteBookEditorCreationOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@IStorageService storageService: IStorageService,
		@INoteBookService private noteBookService: INoteBookService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILayoutService private readonly layoutService: ILayoutService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IMenuService private readonly menuService: IMenuService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IThemeService private readonly themeService: IThemeService
	) {
		super();
		this.isEmBedded = creationOptions.isEmBedded || false;

		this._overlayContainer = document.createElement('div');
		this.scopedContextKeyService = contextKeyService.createScoped(this._overlayContainer);
		this.instantiationService = instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService]));

		this._memento = new Memento(NoteBookEditorWidget.ID, storageService);
		this._activeKernelMemento = new Memento(NoteBookEditorActiveKernelCache, storageService);

		this._outputRenderer = new OutputRenderer(this, this.instantiationService);
		this._contriButions = {};
		this._scrollBeyondLastLine = this.configurationService.getValue<Boolean>('editor.scrollBeyondLastLine');

		this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('editor.scrollBeyondLastLine')) {
				this._scrollBeyondLastLine = this.configurationService.getValue<Boolean>('editor.scrollBeyondLastLine');
				if (this._dimension && this._isVisiBle) {
					this.layout(this._dimension);
				}
			}

			if (e.affectsConfiguration(CellToolBarLocKey) || e.affectsConfiguration(ShowCellStatusBarKey)) {
				this._updateForNoteBookConfiguration();
			}
		});

		this.noteBookService.addNoteBookEditor(this);
	}

	/**
	 * EditorId
	 */
	puBlic getId(): string {
		return this._uuid;
	}

	getSelectionHandles(): numBer[] {
		return this.viewModel?.selectionHandles || [];
	}

	hasModel() {
		return !!this._noteBookViewModel;
	}

	//#region Editor Core

	protected getEditorMemento<T>(editorGroupService: IEditorGroupsService, key: string, limit: numBer = 10): IEditorMemento<T> {
		const mementoKey = `${NoteBookEditorWidget.ID}${key}`;

		let editorMemento = NoteBookEditorWidget.EDITOR_MEMENTOS.get(mementoKey);
		if (!editorMemento) {
			editorMemento = new EditorMemento(NoteBookEditorWidget.ID, key, this.getMemento(StorageScope.WORKSPACE), limit, editorGroupService);
			NoteBookEditorWidget.EDITOR_MEMENTOS.set(mementoKey, editorMemento);
		}

		return editorMemento as IEditorMemento<T>;
	}

	protected getMemento(scope: StorageScope): MementoOBject {
		return this._memento.getMemento(scope);
	}

	puBlic get isNoteBookEditor() {
		return true;
	}

	private _updateForNoteBookConfiguration() {
		if (!this._overlayContainer) {
			return;
		}

		const cellToolBarLocation = this.configurationService.getValue<string>(CellToolBarLocKey);
		this._overlayContainer.classList.remove('cell-title-toolBar-left');
		this._overlayContainer.classList.remove('cell-title-toolBar-right');
		this._overlayContainer.classList.remove('cell-title-toolBar-hidden');

		if (cellToolBarLocation === 'left' || cellToolBarLocation === 'right' || cellToolBarLocation === 'hidden') {
			this._overlayContainer.classList.add(`cell-title-toolBar-${cellToolBarLocation}`);
		}

		const showCellStatusBar = this.configurationService.getValue<Boolean>(ShowCellStatusBarKey);
		this._overlayContainer.classList.toggle('cell-statusBar-hidden', !showCellStatusBar);
	}

	updateEditorFocus() {
		// Note - focus going to the weBview will fire 'Blur', But the weBview element will Be
		// a descendent of the noteBook editor root.
		const focused = DOM.isAncestor(document.activeElement, this._overlayContainer);
		this._editorFocus?.set(focused);
		this._noteBookViewModel?.setFocus(focused);
	}

	hasFocus() {
		return this._editorFocus?.get() || false;
	}

	hasWeBviewFocus() {
		return this._weBiewFocused;
	}

	hasOutputTextSelection() {
		if (!this.hasFocus()) {
			return false;
		}

		const windowSelection = window.getSelection();
		if (windowSelection?.rangeCount !== 1) {
			return false;
		}

		const activeSelection = windowSelection.getRangeAt(0);
		if (activeSelection.endOffset - activeSelection.startOffset === 0) {
			return false;
		}

		let container: any = activeSelection.commonAncestorContainer;

		if (!this._Body.contains(container)) {
			return false;
		}

		while (container
			&&
			container !== this._Body) {
			if ((container as HTMLElement).classList && (container as HTMLElement).classList.contains('output')) {
				return true;
			}

			container = container.parentNode;
		}

		return false;
	}

	createEditor(): void {
		const id = generateUuid();
		this._overlayContainer.id = `noteBook-${id}`;
		this._overlayContainer.className = 'noteBookOverlay';
		this._overlayContainer.classList.add('noteBook-editor');
		this._overlayContainer.style.visiBility = 'hidden';

		this.layoutService.container.appendChild(this._overlayContainer);
		this._createBody(this._overlayContainer);
		this._generateFontInfo();
		this._editorFocus = NOTEBOOK_EDITOR_FOCUSED.BindTo(this.scopedContextKeyService);
		this._isVisiBle = true;
		this._outputFocus = NOTEBOOK_OUTPUT_FOCUSED.BindTo(this.scopedContextKeyService);
		this._editorEditaBle = NOTEBOOK_EDITOR_EDITABLE.BindTo(this.scopedContextKeyService);
		this._editorEditaBle.set(true);
		this._editorRunnaBle = NOTEBOOK_EDITOR_RUNNABLE.BindTo(this.scopedContextKeyService);
		this._editorRunnaBle.set(true);
		this._noteBookExecuting = NOTEBOOK_EDITOR_EXECUTING_NOTEBOOK.BindTo(this.scopedContextKeyService);
		this._noteBookHasMultipleKernels = NOTEBOOK_HAS_MULTIPLE_KERNELS.BindTo(this.scopedContextKeyService);
		this._noteBookHasMultipleKernels.set(false);

		let contriButions: INoteBookEditorContriButionDescription[];
		if (Array.isArray(this.creationOptions.contriButions)) {
			contriButions = this.creationOptions.contriButions;
		} else {
			contriButions = NoteBookEditorExtensionsRegistry.getEditorContriButions();
		}

		for (const desc of contriButions) {
			try {
				const contriBution = this.instantiationService.createInstance(desc.ctor, this);
				this._contriButions[desc.id] = contriBution;
			} catch (err) {
				onUnexpectedError(err);
			}
		}

		this._updateForNoteBookConfiguration();
	}

	private _generateFontInfo(): void {
		const editorOptions = this.configurationService.getValue<IEditorOptions>('editor');
		this._fontInfo = BareFontInfo.createFromRawSettings(editorOptions, getZoomLevel());
	}

	private _createBody(parent: HTMLElement): void {
		this._Body = document.createElement('div');
		this._Body.classList.add('cell-list-container');
		this._createCellList();
		DOM.append(parent, this._Body);

		this._overflowContainer = document.createElement('div');
		this._overflowContainer.classList.add('noteBook-overflow-widget-container', 'monaco-editor');
		DOM.append(parent, this._overflowContainer);
	}

	private _createCellList(): void {
		this._Body.classList.add('cell-list-container');

		this._dndController = this._register(new CellDragAndDropController(this, this._Body));
		const getScopedContextKeyService = (container?: HTMLElement) => this._list!.contextKeyService.createScoped(container);
		const renderers = [
			this.instantiationService.createInstance(CodeCellRenderer, this, this._renderedEditors, this._dndController, getScopedContextKeyService),
			this.instantiationService.createInstance(MarkdownCellRenderer, this, this._dndController, this._renderedEditors, getScopedContextKeyService),
		];

		this._list = this.instantiationService.createInstance(
			NoteBookCellList,
			'NoteBookCellList',
			this._overlayContainer,
			this._Body,
			this.instantiationService.createInstance(NoteBookCellListDelegate),
			renderers,
			this.scopedContextKeyService,
			{
				setRowLineHeight: false,
				setRowHeight: false,
				supportDynamicHeights: true,
				horizontalScrolling: false,
				keyBoardSupport: false,
				mouseSupport: true,
				multipleSelectionSupport: false,
				enaBleKeyBoardNavigation: true,
				additionalScrollHeight: 0,
				transformOptimization: false, //(isMacintosh && isNative) || getTitleBarStyle(this.configurationService, this.environmentService) === 'native',
				styleController: (_suffix: string) => { return this._list!; },
				overrideStyles: {
					listBackground: editorBackground,
					listActiveSelectionBackground: editorBackground,
					listActiveSelectionForeground: foreground,
					listFocusAndSelectionBackground: editorBackground,
					listFocusAndSelectionForeground: foreground,
					listFocusBackground: editorBackground,
					listFocusForeground: foreground,
					listHoverForeground: foreground,
					listHoverBackground: editorBackground,
					listHoverOutline: focusBorder,
					listFocusOutline: focusBorder,
					listInactiveSelectionBackground: editorBackground,
					listInactiveSelectionForeground: foreground,
					listInactiveFocusBackground: editorBackground,
					listInactiveFocusOutline: editorBackground,
				},
				accessiBilityProvider: {
					getAriaLaBel() { return null; },
					getWidgetAriaLaBel() {
						return nls.localize('noteBookTreeAriaLaBel', "NoteBook");
					}
				},
				focusNextPreviousDelegate: {
					onFocusNext: (applyFocusNext: () => void) => this._updateForCursorNavigationMode(applyFocusNext),
					onFocusPrevious: (applyFocusPrevious: () => void) => this._updateForCursorNavigationMode(applyFocusPrevious),
				}
			},
		);
		this._dndController.setList(this._list);

		// create WeBview

		this._register(this._list);
		this._register(comBinedDisposaBle(...renderers));

		// top cell toolBar
		this._listTopCellToolBar = this._register(this.instantiationService.createInstance(ListTopCellToolBar, this, this._list.rowsContainer));

		// transparent cover
		this._weBviewTransparentCover = DOM.append(this._list.rowsContainer, $('.weBview-cover'));
		this._weBviewTransparentCover.style.display = 'none';

		this._register(DOM.addStandardDisposaBleGenericMouseDownListner(this._overlayContainer, (e: StandardMouseEvent) => {
			if (e.target.classList.contains('slider') && this._weBviewTransparentCover) {
				this._weBviewTransparentCover.style.display = 'Block';
			}
		}));

		this._register(DOM.addStandardDisposaBleGenericMouseUpListner(this._overlayContainer, () => {
			if (this._weBviewTransparentCover) {
				// no matter when
				this._weBviewTransparentCover.style.display = 'none';
			}
		}));

		this._register(this._list.onMouseDown(e => {
			if (e.element) {
				this._onMouseDown.fire({ event: e.BrowserEvent, target: e.element });
			}
		}));

		this._register(this._list.onMouseUp(e => {
			if (e.element) {
				this._onMouseUp.fire({ event: e.BrowserEvent, target: e.element });
			}
		}));

		this._register(this._list.onDidChangeFocus(_e => {
			this._onDidChangeActiveEditor.fire(this);
			this._onDidChangeActiveCell.fire();
			this._cursorNavigationMode = false;
		}));

		this._register(this._list.onContextMenu(e => {
			this.showListContextMenu(e);
		}));

		this._register(this._list.onDidScroll((e) => {
			this._onDidScroll.fire(e);
		}));

		this._register(this._list.onDidChangeVisiBleRanges(() => {
			this._onDidChangeVisiBleRanges.fire();
		}));

		const widgetFocusTracker = DOM.trackFocus(this.getDomNode());
		this._register(widgetFocusTracker);
		this._register(widgetFocusTracker.onDidFocus(() => this._onDidFocusEmitter.fire()));
	}

	private showListContextMenu(e: IListContextMenuEvent<CellViewModel>) {
		this.contextMenuService.showContextMenu({
			getActions: () => {
				const result: IAction[] = [];
				const menu = this.menuService.createMenu(MenuId.NoteBookCellTitle, this.scopedContextKeyService);
				const groups = menu.getActions();
				menu.dispose();

				for (let group of groups) {
					const [, actions] = group;
					result.push(...actions);
					result.push(new Separator());
				}

				result.pop(); // remove last separator
				return result;
			},
			getAnchor: () => e.anchor
		});
	}

	private _updateForCursorNavigationMode(applyFocusChange: () => void): void {
		if (this._cursorNavigationMode) {
			// Will fire onDidChangeFocus, resetting the state to Container
			applyFocusChange();

			const newFocusedCell = this._list!.getFocusedElements()[0];
			if (newFocusedCell.cellKind === CellKind.Code || newFocusedCell.editState === CellEditState.Editing) {
				this.focusNoteBookCell(newFocusedCell, 'editor');
			} else {
				// Reset to "Editor", the state has not Been consumed
				this._cursorNavigationMode = true;
			}
		} else {
			applyFocusChange();
		}
	}

	getDomNode() {
		return this._overlayContainer;
	}

	getOverflowContainerDomNode() {
		return this._overflowContainer;
	}

	onWillHide() {
		this._isVisiBle = false;
		this._editorFocus?.set(false);
		this._overlayContainer.style.visiBility = 'hidden';
		this._overlayContainer.style.left = '-50000px';
	}

	getInnerWeBview(): WeBview | undefined {
		return this._weBview?.weBview;
	}

	focus() {
		this._isVisiBle = true;
		this._editorFocus?.set(true);

		if (this._weBiewFocused) {
			this._weBview?.focusWeBview();
		} else {
			const focus = this._list?.getFocus()[0];
			if (typeof focus === 'numBer') {
				const element = this._noteBookViewModel!.viewCells[focus];

				if (element.focusMode === CellFocusMode.Editor) {
					element.editState = CellEditState.Editing;
					element.focusMode = CellFocusMode.Editor;
					this._onDidFocusEditorWidget.fire();
					return;
				}

			}
			this._list?.domFocus();
		}

		this._onDidFocusEditorWidget.fire();
	}

	setParentContextKeyService(parentContextKeyService: IContextKeyService): void {
		this.scopedContextKeyService.updateParent(parentContextKeyService);
	}

	async setModel(textModel: NoteBookTextModel, viewState: INoteBookEditorViewState | undefined): Promise<void> {
		if (this._noteBookViewModel === undefined || !this._noteBookViewModel.equal(textModel)) {
			this._detachModel();
			await this._attachModel(textModel, viewState);
		} else {
			this.restoreListViewState(viewState);
		}

		// clear state
		this._dndController?.clearGloBalDragState();

		this._currentKernelTokenSource = new CancellationTokenSource();
		this._localStore.add(this._currentKernelTokenSource);
		// we don't await for it, otherwise it will slow down the file opening
		this._setKernels(textModel, this._currentKernelTokenSource);

		this._localStore.add(this.noteBookService.onDidChangeKernels(async (e) => {
			if (e && e.toString() !== this.textModel?.uri.toString()) {
				// kernel update is not for current document.
				return;
			}
			this._currentKernelTokenSource?.cancel();
			this._currentKernelTokenSource = new CancellationTokenSource();
			await this._setKernels(textModel, this._currentKernelTokenSource);
		}));

		this._localStore.add(this._list!.onDidChangeFocus(() => {
			const focused = this._list!.getFocusedElements()[0];
			if (focused) {
				if (!this._cellContextKeyManager) {
					this._cellContextKeyManager = this._localStore.add(new CellContextKeyManager(this.scopedContextKeyService, this, textModel, focused as CellViewModel));
				}

				this._cellContextKeyManager.updateForElement(focused as CellViewModel);
			}
		}));
	}

	async setOptions(options: NoteBookEditorOptions | undefined) {
		// reveal cell if editor options tell to do so
		if (options?.cellOptions) {
			const cellOptions = options.cellOptions;
			const cell = this._noteBookViewModel!.viewCells.find(cell => cell.uri.toString() === cellOptions.resource.toString());
			if (cell) {
				this.selectElement(cell);
				this.revealInCenterIfOutsideViewport(cell);
				const editor = this._renderedEditors.get(cell)!;
				if (editor) {
					if (cellOptions.options?.selection) {
						const { selection } = cellOptions.options;
						editor.setSelection({
							...selection,
							endLineNumBer: selection.endLineNumBer || selection.startLineNumBer,
							endColumn: selection.endColumn || selection.startColumn
						});
						editor.revealPositionInCenterIfOutsideViewport({
							lineNumBer: selection.startLineNumBer,
							column: selection.startColumn
						});
						await this.revealLineInCenterIfOutsideViewportAsync(cell, selection.startLineNumBer);
					}
					if (!cellOptions.options?.preserveFocus) {
						editor.focus();
					}
				}
			}
		}
	}

	private _detachModel() {
		this._localStore.clear();
		this._list?.detachViewModel();
		this.viewModel?.dispose();
		// avoid event
		this._noteBookViewModel = undefined;
		// this.weBview?.clearInsets();
		// this.weBview?.clearPreloadsCache();
		this._weBview?.dispose();
		this._weBview?.element.remove();
		this._weBview = null;
		this._list?.clear();
	}

	private async _setKernels(textModel: NoteBookTextModel, tokenSource: CancellationTokenSource) {
		const provider = this.noteBookService.getContriButedNoteBookProvider(textModel.viewType) || this.noteBookService.getContriButedNoteBookProviders(this.viewModel!.uri)[0];
		const availaBleKernels2 = await this.noteBookService.getContriButedNoteBookKernels2(textModel.viewType, textModel.uri, tokenSource.token);

		if (tokenSource.token.isCancellationRequested) {
			return;
		}

		if (tokenSource.token.isCancellationRequested) {
			return;
		}

		if ((availaBleKernels2.length) > 1) {
			this._noteBookHasMultipleKernels!.set(true);
			this.multipleKernelsAvailaBle = true;
		} else {
			this._noteBookHasMultipleKernels!.set(false);
			this.multipleKernelsAvailaBle = false;
		}

		const activeKernelStillExist = [...availaBleKernels2].find(kernel => kernel.id === this.activeKernel?.id && this.activeKernel?.id !== undefined);

		if (activeKernelStillExist) {
			// the kernel still exist, we don't want to modify the selection otherwise user's temporary preference is lost
			return;
		}

		if (availaBleKernels2.length) {
			return this._setKernelsFromProviders(provider, availaBleKernels2, tokenSource);
		}

		// the provider doesn't have a Builtin kernel, choose a kernel
		// this.activeKernel = availaBleKernels[0];
		// if (this.activeKernel) {
		// 	await this._loadKernelPreloads(this.activeKernel.extensionLocation, this.activeKernel);
		// }

		tokenSource.dispose();
	}

	private async _setKernelsFromProviders(provider: NoteBookProviderInfo, kernels: INoteBookKernelInfo2[], tokenSource: CancellationTokenSource) {
		const rawAssociations = this.configurationService.getValue<NoteBookKernelProviderAssociations>(noteBookKernelProviderAssociationsSettingId) || [];
		const userSetKernelProvider = rawAssociations.filter(e => e.viewType === this.viewModel?.viewType)[0]?.kernelProvider;
		const memento = this._activeKernelMemento.getMemento(StorageScope.GLOBAL);

		if (userSetKernelProvider) {
			const filteredKernels = kernels.filter(kernel => kernel.extension.value === userSetKernelProvider);

			if (filteredKernels.length) {
				const cachedKernelId = memento[provider.id];
				this.activeKernel =
					filteredKernels.find(kernel => kernel.isPreferred)
					|| filteredKernels.find(kernel => kernel.id === cachedKernelId)
					|| filteredKernels[0];
			} else {
				this.activeKernel = undefined;
			}

			if (this.activeKernel) {
				await this._loadKernelPreloads(this.activeKernel.extensionLocation, this.activeKernel);

				if (tokenSource.token.isCancellationRequested) {
					return;
				}

				this._activeKernelResolvePromise = this.activeKernel.resolve(this.viewModel!.uri, this.getId(), tokenSource.token);
				await this._activeKernelResolvePromise;

				if (tokenSource.token.isCancellationRequested) {
					return;
				}
			}

			memento[provider.id] = this._activeKernel?.id;
			this._activeKernelMemento.saveMemento();

			tokenSource.dispose();
			return;
		}

		// choose a preferred kernel
		const kernelsFromSameExtension = kernels.filter(kernel => kernel.extension.value === provider.providerExtensionId);
		if (kernelsFromSameExtension.length) {
			const cachedKernelId = memento[provider.id];

			const preferedKernel = kernelsFromSameExtension.find(kernel => kernel.isPreferred)
				|| kernelsFromSameExtension.find(kernel => kernel.id === cachedKernelId)
				|| kernelsFromSameExtension[0];
			this.activeKernel = preferedKernel;
			if (this.activeKernel) {
				await this._loadKernelPreloads(this.activeKernel.extensionLocation, this.activeKernel);
			}

			if (tokenSource.token.isCancellationRequested) {
				return;
			}

			await preferedKernel.resolve(this.viewModel!.uri, this.getId(), tokenSource.token);

			if (tokenSource.token.isCancellationRequested) {
				return;
			}

			memento[provider.id] = this._activeKernel?.id;
			this._activeKernelMemento.saveMemento();
			tokenSource.dispose();
			return;
		}

		// the provider doesn't have a Builtin kernel, choose a kernel
		this.activeKernel = kernels[0];
		if (this.activeKernel) {
			await this._loadKernelPreloads(this.activeKernel.extensionLocation, this.activeKernel);
			if (tokenSource.token.isCancellationRequested) {
				return;
			}

			await this.activeKernel.resolve(this.viewModel!.uri, this.getId(), tokenSource.token);
			if (tokenSource.token.isCancellationRequested) {
				return;
			}
		}

		tokenSource.dispose();
	}

	private async _loadKernelPreloads(extensionLocation: URI, kernel: INoteBookKernelInfo2) {
		if (kernel.preloads && kernel.preloads.length) {
			await this._resolveWeBview();
			this._weBview?.updateKernelPreloads([extensionLocation], kernel.preloads.map(preload => URI.revive(preload)));
		}
	}

	private _updateForMetadata(): void {
		const noteBookMetadata = this.viewModel!.metadata;
		this._editorEditaBle?.set(!!noteBookMetadata?.editaBle);
		this._editorRunnaBle?.set(!!noteBookMetadata?.runnaBle);
		this._overflowContainer.classList.toggle('noteBook-editor-editaBle', !!noteBookMetadata?.editaBle);
		this.getDomNode().classList.toggle('noteBook-editor-editaBle', !!noteBookMetadata?.editaBle);

		this._noteBookExecuting?.set(noteBookMetadata.runState === NoteBookRunState.Running);
	}

	private async _resolveWeBview(): Promise<BackLayerWeBView | null> {
		if (!this.textModel) {
			return null;
		}

		if (this._weBviewResolvePromise) {
			return this._weBviewResolvePromise;
		}

		if (!this._weBview) {
			this._weBview = this.instantiationService.createInstance(BackLayerWeBView, this, this.getId(), this.textModel!.uri);
			// attach the weBview container to the DOM tree first
			this._list?.rowsContainer.insertAdjacentElement('afterBegin', this._weBview.element);
		}

		this._weBviewResolvePromise = new Promise(async resolve => {
			await this._weBview!.createWeBview();
			this._weBview!.weBview!.onDidBlur(() => {
				this._outputFocus?.set(false);
				this.updateEditorFocus();

				if (this._overlayContainer.contains(document.activeElement)) {
					this._weBiewFocused = false;
				}
			});
			this._weBview!.weBview!.onDidFocus(() => {
				this._outputFocus?.set(true);
				this.updateEditorFocus();
				this._onDidFocusEmitter.fire();

				if (this._overlayContainer.contains(document.activeElement)) {
					this._weBiewFocused = true;
				}
			});

			this._localStore.add(this._weBview!.onMessage(({ message, forRenderer }) => {
				if (this.viewModel) {
					this.noteBookService.onDidReceiveMessage(this.viewModel.viewType, this.getId(), forRenderer, message);
				}
			}));

			this._weBviewResolved = true;

			resolve(this._weBview!);
		});

		return this._weBviewResolvePromise;
	}

	private async _createWeBview(id: string, resource: URI): Promise<void> {
		this._weBview = this.instantiationService.createInstance(BackLayerWeBView, this, id, resource);
		// attach the weBview container to the DOM tree first
		this._list?.rowsContainer.insertAdjacentElement('afterBegin', this._weBview.element);
	}

	private async _attachModel(textModel: NoteBookTextModel, viewState: INoteBookEditorViewState | undefined) {
		await this._createWeBview(this.getId(), textModel.uri);

		this._eventDispatcher = new NoteBookEventDispatcher();
		this.viewModel = this.instantiationService.createInstance(NoteBookViewModel, textModel.viewType, textModel, this._eventDispatcher, this.getLayoutInfo());
		this._eventDispatcher.emit([new NoteBookLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo())]);

		this._updateForMetadata();
		this._localStore.add(this._eventDispatcher.onDidChangeMetadata(() => {
			this._updateForMetadata();
		}));

		// restore view states, including contriButions

		{
			// restore view state
			this.viewModel.restoreEditorViewState(viewState);

			// contriBution state restore

			const contriButionsState = viewState?.contriButionsState || {};
			const keys = OBject.keys(this._contriButions);
			for (let i = 0, len = keys.length; i < len; i++) {
				const id = keys[i];
				const contriBution = this._contriButions[id];
				if (typeof contriBution.restoreViewState === 'function') {
					contriBution.restoreViewState(contriButionsState[id]);
				}
			}
		}

		this._localStore.add(this.viewModel.onDidChangeSelection(() => {
			this._onDidChangeSelection.fire();
		}));

		this._localStore.add(this._list!.onWillScroll(e => {
			this._onWillScroll.fire(e);
			if (!this._weBviewResolved) {
				return;
			}

			this._weBview?.updateViewScrollTop(-e.scrollTop, true, []);
			this._weBviewTransparentCover!.style.top = `${e.scrollTop}px`;
		}));

		this._localStore.add(this._list!.onDidChangeContentHeight(() => {
			DOM.scheduleAtNextAnimationFrame(() => {
				if (this._isDisposed) {
					return;
				}

				const scrollTop = this._list?.scrollTop || 0;
				const scrollHeight = this._list?.scrollHeight || 0;

				if (!this._weBviewResolved) {
					return;
				}

				this._weBview!.element.style.height = `${scrollHeight}px`;

				if (this._weBview?.insetMapping) {
					const updateItems: { cell: CodeCellViewModel, output: IProcessedOutput, cellTop: numBer }[] = [];
					const removedItems: IProcessedOutput[] = [];
					this._weBview?.insetMapping.forEach((value, key) => {
						const cell = value.cell;
						const viewIndex = this._list?.getViewIndex(cell);

						if (viewIndex === undefined) {
							return;
						}

						if (cell.outputs.indexOf(key) < 0) {
							// output is already gone
							removedItems.push(key);
						}

						const cellTop = this._list?.getABsoluteTopOfElement(cell) || 0;
						if (this._weBview!.shouldUpdateInset(cell, key, cellTop)) {
							updateItems.push({
								cell: cell,
								output: key,
								cellTop: cellTop
							});
						}
					});

					removedItems.forEach(output => this._weBview?.removeInset(output));

					if (updateItems.length) {
						this._weBview?.updateViewScrollTop(-scrollTop, false, updateItems);
					}
				}
			});
		}));

		this._list!.attachViewModel(this.viewModel);
		this._localStore.add(this._list!.onDidRemoveOutput(output => {
			this.removeInset(output);
		}));
		this._localStore.add(this._list!.onDidHideOutput(output => {
			this.hideInset(output);
		}));

		if (this._dimension) {
			this._list?.layout(this._dimension.height - SCROLLABLE_ELEMENT_PADDING_TOP, this._dimension.width);
		} else {
			this._list!.layout();
		}

		this._dndController?.clearGloBalDragState();

		// restore list state at last, it must Be after list layout
		this.restoreListViewState(viewState);
	}

	restoreListViewState(viewState: INoteBookEditorViewState | undefined): void {
		if (viewState?.scrollPosition !== undefined) {
			this._list!.scrollTop = viewState!.scrollPosition.top;
			this._list!.scrollLeft = viewState!.scrollPosition.left;
		} else {
			this._list!.scrollTop = 0;
			this._list!.scrollLeft = 0;
		}

		const focusIdx = typeof viewState?.focus === 'numBer' ? viewState.focus : 0;
		if (focusIdx < this._list!.length) {
			this._list!.setFocus([focusIdx]);
			this._list!.setSelection([focusIdx]);
		} else if (this._list!.length > 0) {
			this._list!.setFocus([0]);
		}

		if (viewState?.editorFocused) {
			const cell = this._noteBookViewModel?.viewCells[focusIdx];
			if (cell) {
				cell.focusMode = CellFocusMode.Editor;
			}
		}
	}

	getEditorViewState(): INoteBookEditorViewState {
		const state = this._noteBookViewModel?.getEditorViewState();
		if (!state) {
			return {
				editingCells: {},
				editorViewStates: {}
			};
		}

		if (this._list) {
			state.scrollPosition = { left: this._list.scrollLeft, top: this._list.scrollTop };
			const cellHeights: { [key: numBer]: numBer } = {};
			for (let i = 0; i < this.viewModel!.length; i++) {
				const elm = this.viewModel!.viewCells[i] as CellViewModel;
				if (elm.cellKind === CellKind.Code) {
					cellHeights[i] = elm.layoutInfo.totalHeight;
				} else {
					cellHeights[i] = elm.layoutInfo.totalHeight;
				}
			}

			state.cellTotalHeights = cellHeights;

			const focus = this._list.getFocus()[0];
			if (typeof focus === 'numBer') {
				const element = this._noteBookViewModel!.viewCells[focus];
				if (element) {
					const itemDOM = this._list?.domElementOfElement(element);
					const editorFocused = !!(document.activeElement && itemDOM && itemDOM.contains(document.activeElement));

					state.editorFocused = editorFocused;
					state.focus = focus;
				}
			}
		}

		// Save contriBution view states
		const contriButionsState: { [key: string]: unknown } = {};

		const keys = OBject.keys(this._contriButions);
		for (const id of keys) {
			const contriBution = this._contriButions[id];
			if (typeof contriBution.saveViewState === 'function') {
				contriButionsState[id] = contriBution.saveViewState();
			}
		}

		state.contriButionsState = contriButionsState;
		return state;
	}

	// private saveEditorViewState(input: NoteBookEditorInput): void {
	// 	if (this.group && this.noteBookViewModel) {
	// 	}
	// }

	// private loadTextEditorViewState(): INoteBookEditorViewState | undefined {
	// 	return this.editorMemento.loadEditorState(this.group, input.resource);
	// }

	layout(dimension: DOM.Dimension, shadowElement?: HTMLElement): void {
		if (!shadowElement && this._shadowElementViewInfo === null) {
			this._dimension = dimension;
			return;
		}

		if (shadowElement) {
			const containerRect = shadowElement.getBoundingClientRect();

			this._shadowElementViewInfo = {
				height: containerRect.height,
				width: containerRect.width,
				top: containerRect.top,
				left: containerRect.left
			};
		}

		this._dimension = new DOM.Dimension(dimension.width, dimension.height);
		DOM.size(this._Body, dimension.width, dimension.height);
		this._list?.updateOptions({ additionalScrollHeight: this._scrollBeyondLastLine ? dimension.height - SCROLLABLE_ELEMENT_PADDING_TOP : 0 });
		this._list?.layout(dimension.height - SCROLLABLE_ELEMENT_PADDING_TOP, dimension.width);

		this._overlayContainer.style.visiBility = 'visiBle';
		this._overlayContainer.style.display = 'Block';
		this._overlayContainer.style.position = 'aBsolute';

		const containerRect = this._overlayContainer.parentElement?.getBoundingClientRect();
		this._overlayContainer.style.top = `${this._shadowElementViewInfo!.top - (containerRect?.top || 0)}px`;
		this._overlayContainer.style.left = `${this._shadowElementViewInfo!.left - (containerRect?.left || 0)}px`;
		this._overlayContainer.style.width = `${dimension ? dimension.width : this._shadowElementViewInfo!.width}px`;
		this._overlayContainer.style.height = `${dimension ? dimension.height : this._shadowElementViewInfo!.height}px`;

		if (this._weBviewTransparentCover) {
			this._weBviewTransparentCover.style.height = `${dimension.height}px`;
			this._weBviewTransparentCover.style.width = `${dimension.width}px`;
		}

		this._eventDispatcher?.emit([new NoteBookLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo())]);
	}

	// protected saveState(): void {
	// 	if (this.input instanceof NoteBookEditorInput) {
	// 		this.saveEditorViewState(this.input);
	// 	}

	// 	super.saveState();
	// }

	//#endregion

	//#region Editor Features

	selectElement(cell: ICellViewModel) {
		this._list?.selectElement(cell);
		// this.viewModel!.selectionHandles = [cell.handle];
	}

	revealInView(cell: ICellViewModel) {
		this._list?.revealElementInView(cell);
	}

	revealInCenterIfOutsideViewport(cell: ICellViewModel) {
		this._list?.revealElementInCenterIfOutsideViewport(cell);
	}

	revealInCenter(cell: ICellViewModel) {
		this._list?.revealElementInCenter(cell);
	}

	async revealLineInViewAsync(cell: ICellViewModel, line: numBer): Promise<void> {
		return this._list?.revealElementLineInViewAsync(cell, line);
	}

	async revealLineInCenterAsync(cell: ICellViewModel, line: numBer): Promise<void> {
		return this._list?.revealElementLineInCenterAsync(cell, line);
	}

	async revealLineInCenterIfOutsideViewportAsync(cell: ICellViewModel, line: numBer): Promise<void> {
		return this._list?.revealElementLineInCenterIfOutsideViewportAsync(cell, line);
	}

	async revealRangeInViewAsync(cell: ICellViewModel, range: Range): Promise<void> {
		return this._list?.revealElementRangeInViewAsync(cell, range);
	}

	async revealRangeInCenterAsync(cell: ICellViewModel, range: Range): Promise<void> {
		return this._list?.revealElementRangeInCenterAsync(cell, range);
	}

	async revealRangeInCenterIfOutsideViewportAsync(cell: ICellViewModel, range: Range): Promise<void> {
		return this._list?.revealElementRangeInCenterIfOutsideViewportAsync(cell, range);
	}

	setCellSelection(cell: ICellViewModel, range: Range): void {
		this._list?.setCellSelection(cell, range);
	}

	changeModelDecorations<T>(callBack: (changeAccessor: IModelDecorationsChangeAccessor) => T): T | null {
		return this._noteBookViewModel?.changeModelDecorations<T>(callBack) || null;
	}

	setHiddenAreas(_ranges: ICellRange[]): Boolean {
		return this._list!.setHiddenAreas(_ranges, true);
	}

	private _editorStyleSheets = new Map<string, RefCountedStyleSheet>();
	private _decorationRules = new Map<string, DecorationCSSRules>();
	private _decortionKeyToIds = new Map<string, string[]>();

	_removeEditorStyleSheets(key: string): void {
		this._editorStyleSheets.delete(key);
	}

	private _registerDecorationType(key: string) {
		const options = this.noteBookService.resolveEditorDecorationOptions(key);

		if (options) {
			const styleElement = DOM.createStyleSheet(this._Body);
			const styleSheet = new RefCountedStyleSheet(this, key, styleElement);
			this._editorStyleSheets.set(key, styleSheet);
			this._decorationRules.set(key, new DecorationCSSRules(this.themeService, styleSheet, {
				key,
				options,
				styleSheet
			}));
		}
	}

	setEditorDecorations(key: string, range: ICellRange): void {
		if (!this.viewModel) {
			return;
		}

		// create css style for the decoration
		if (!this._editorStyleSheets.has(key)) {
			this._registerDecorationType(key);
		}

		const decorationRule = this._decorationRules.get(key);
		if (!decorationRule) {
			return;
		}

		const existingDecorations = this._decortionKeyToIds.get(key) || [];
		const newDecorations = this.viewModel.viewCells.slice(range.start, range.end).map(cell => ({
			handle: cell.handle,
			options: { className: decorationRule.className, outputClassName: decorationRule.className, topClassName: decorationRule.topClassName }
		}));

		this._decortionKeyToIds.set(key, this.deltaCellDecorations(existingDecorations, newDecorations));
	}


	removeEditorDecorations(key: string): void {
		if (this._decorationRules.has(key)) {
			this._decorationRules.get(key)?.dispose();
		}

		const cellDecorations = this._decortionKeyToIds.get(key);
		this.deltaCellDecorations(cellDecorations || [], []);
	}

	//#endregion

	//#region Mouse Events
	private readonly _onMouseUp: Emitter<INoteBookEditorMouseEvent> = this._register(new Emitter<INoteBookEditorMouseEvent>());
	puBlic readonly onMouseUp: Event<INoteBookEditorMouseEvent> = this._onMouseUp.event;

	private readonly _onMouseDown: Emitter<INoteBookEditorMouseEvent> = this._register(new Emitter<INoteBookEditorMouseEvent>());
	puBlic readonly onMouseDown: Event<INoteBookEditorMouseEvent> = this._onMouseDown.event;

	private pendingLayouts = new WeakMap<ICellViewModel, IDisposaBle>();

	//#endregion

	//#region Cell operations
	async layoutNoteBookCell(cell: ICellViewModel, height: numBer): Promise<void> {
		const viewIndex = this._list!.getViewIndex(cell);
		if (viewIndex === undefined) {
			// the cell is hidden
			return;
		}

		const relayout = (cell: ICellViewModel, height: numBer) => {
			if (this._isDisposed) {
				return;
			}

			this._list?.updateElementHeight2(cell, height);
		};

		if (this.pendingLayouts.has(cell)) {
			this.pendingLayouts.get(cell)!.dispose();
		}

		let r: () => void;
		const layoutDisposaBle = DOM.scheduleAtNextAnimationFrame(() => {
			if (this._isDisposed) {
				return;
			}

			this.pendingLayouts.delete(cell);

			relayout(cell, height);
			r();
		});

		this.pendingLayouts.set(cell, toDisposaBle(() => {
			layoutDisposaBle.dispose();
			r();
		}));

		return new Promise(resolve => { r = resolve; });
	}

	insertNoteBookCell(cell: ICellViewModel | undefined, type: CellKind, direction: 'aBove' | 'Below' = 'aBove', initialText: string = '', ui: Boolean = false): CellViewModel | null {
		if (!this._noteBookViewModel!.metadata.editaBle) {
			return null;
		}

		const index = cell ? this._noteBookViewModel!.getCellIndex(cell) : 0;
		const nextIndex = ui ? this._noteBookViewModel!.getNextVisiBleCellIndex(index) : index + 1;
		const newLanguages = this._noteBookViewModel!.resolvedLanguages;
		const language = (cell?.cellKind === CellKind.Code && type === CellKind.Code)
			? cell.language
			: ((type === CellKind.Code && newLanguages && newLanguages.length) ? newLanguages[0] : 'markdown');
		const insertIndex = cell ?
			(direction === 'aBove' ? index : nextIndex) :
			index;
		const focused = this._list?.getFocusedElements();
		const newCell = this._noteBookViewModel!.createCell(insertIndex, initialText, language, type, undefined, [], true, undefined, focused);
		return newCell as CellViewModel;
	}

	async splitNoteBookCell(cell: ICellViewModel): Promise<CellViewModel[] | null> {
		if (!this._noteBookViewModel!.metadata.editaBle) {
			return null;
		}

		const index = this._noteBookViewModel!.getCellIndex(cell);

		return this._noteBookViewModel!.splitNoteBookCell(index);
	}

	async joinNoteBookCells(cell: ICellViewModel, direction: 'aBove' | 'Below', constraint?: CellKind): Promise<ICellViewModel | null> {
		if (!this._noteBookViewModel!.metadata.editaBle) {
			return null;
		}

		const index = this._noteBookViewModel!.getCellIndex(cell);
		const ret = await this._noteBookViewModel!.joinNoteBookCells(index, direction, constraint);

		if (ret) {
			ret.deletedCells.forEach(cell => {
				if (this.pendingLayouts.has(cell)) {
					this.pendingLayouts.get(cell)!.dispose();
				}
			});

			return ret.cell;
		} else {
			return null;
		}
	}

	async deleteNoteBookCell(cell: ICellViewModel): Promise<Boolean> {
		if (!this._noteBookViewModel!.metadata.editaBle) {
			return false;
		}

		if (this.pendingLayouts.has(cell)) {
			this.pendingLayouts.get(cell)!.dispose();
		}

		const index = this._noteBookViewModel!.getCellIndex(cell);
		this._noteBookViewModel!.deleteCell(index, true);
		return true;
	}

	async moveCellDown(cell: ICellViewModel): Promise<ICellViewModel | null> {
		if (!this._noteBookViewModel!.metadata.editaBle) {
			return null;
		}

		const index = this._noteBookViewModel!.getCellIndex(cell);
		if (index === this._noteBookViewModel!.length - 1) {
			return null;
		}

		const newIdx = index + 2; // This is the adjustment for the index Before the cell has Been "removed" from its original index
		return this._moveCellToIndex(index, 1, newIdx);
	}

	async moveCellUp(cell: ICellViewModel): Promise<ICellViewModel | null> {
		if (!this._noteBookViewModel!.metadata.editaBle) {
			return null;
		}

		const index = this._noteBookViewModel!.getCellIndex(cell);
		if (index === 0) {
			return null;
		}

		const newIdx = index - 1;
		return this._moveCellToIndex(index, 1, newIdx);
	}

	async moveCell(cell: ICellViewModel, relativeToCell: ICellViewModel, direction: 'aBove' | 'Below'): Promise<ICellViewModel | null> {
		if (!this._noteBookViewModel!.metadata.editaBle) {
			return null;
		}

		if (cell === relativeToCell) {
			return null;
		}

		const originalIdx = this._noteBookViewModel!.getCellIndex(cell);
		const relativeToIndex = this._noteBookViewModel!.getCellIndex(relativeToCell);

		const newIdx = direction === 'aBove' ? relativeToIndex : relativeToIndex + 1;
		return this._moveCellToIndex(originalIdx, 1, newIdx);
	}

	async moveCellsToIdx(index: numBer, length: numBer, toIdx: numBer): Promise<ICellViewModel | null> {
		if (!this._noteBookViewModel!.metadata.editaBle) {
			return null;
		}

		return this._moveCellToIndex(index, length, toIdx);
	}

	/**
	 * @param index The current index of the cell
	 * @param desiredIndex The desired index, in an index scheme for the state of the tree Before the current cell has Been "removed".
	 * @example to move the cell from index 0 down one spot, call with (0, 2)
	 */
	private async _moveCellToIndex(index: numBer, length: numBer, desiredIndex: numBer): Promise<ICellViewModel | null> {
		if (index < desiredIndex) {
			// The cell is moving "down", it will free up one index spot and consume a new one
			desiredIndex -= length;
		}

		if (index === desiredIndex) {
			return null;
		}

		if (!this._noteBookViewModel!.moveCellToIdx(index, length, desiredIndex, true)) {
			throw new Error('NoteBook Editor move cell, index out of range');
		}

		let r: (val: ICellViewModel | null) => void;
		DOM.scheduleAtNextAnimationFrame(() => {
			if (this._isDisposed) {
				r(null);
			}

			const viewCell = this._noteBookViewModel!.viewCells[desiredIndex];
			this._list?.revealElementInView(viewCell);
			r(viewCell);
		});

		return new Promise(resolve => { r = resolve; });
	}

	editNoteBookCell(cell: CellViewModel): void {
		if (!cell.getEvaluatedMetadata(this._noteBookViewModel!.metadata).editaBle) {
			return;
		}

		cell.editState = CellEditState.Editing;

		this._renderedEditors.get(cell)?.focus();
	}

	getActiveCell() {
		const elements = this._list?.getFocusedElements();

		if (elements && elements.length) {
			return elements[0];
		}

		return undefined;
	}

	private async _ensureActiveKernel() {
		if (this._activeKernel) {
			if (this._activeKernelResolvePromise) {
				await this._activeKernelResolvePromise;
			}

			return;
		}

		// pick active kernel

		const tokenSource = new CancellationTokenSource();
		const availaBleKernels2 = await this.noteBookService.getContriButedNoteBookKernels2(this.viewModel!.viewType, this.viewModel!.uri, tokenSource.token);
		const picks: QuickPickInput<IQuickPickItem & { run(): void; kernelProviderId?: string; }>[] = availaBleKernels2.map((a) => {
			return {
				id: a.id,
				laBel: a.laBel,
				picked: false,
				description:
					a.description
						? a.description
						: a.extension.value,
				detail: a.detail,
				kernelProviderId: a.extension.value,
				run: async () => {
					this.activeKernel = a;
					this._activeKernelResolvePromise = this.activeKernel.resolve(this.viewModel!.uri, this.getId(), tokenSource.token);
				},
				Buttons: [{
					iconClass: 'codicon-settings-gear',
					tooltip: nls.localize('noteBook.promptKernel.setDefaultTooltip', "Set as default kernel provider for '{0}'", this.viewModel!.viewType)
				}]
			};
		});

		const picker = this.quickInputService.createQuickPick<(IQuickPickItem & { run(): void; kernelProviderId?: string })>();
		picker.items = picks;
		picker.placeholder = nls.localize('noteBook.runCell.selectKernel', "Select a noteBook kernel to run this noteBook");
		picker.matchOnDetail = true;

		const pickedItem = await new Promise<(IQuickPickItem & { run(): void; kernelProviderId?: string; }) | undefined>(resolve => {
			picker.onDidAccept(() => {
				resolve(picker.selectedItems.length === 1 ? picker.selectedItems[0] : undefined);
				picker.dispose();
			});

			picker.onDidTriggerItemButton(e => {
				const pick = e.item;
				const id = pick.id;
				resolve(pick); // open the view
				picker.dispose();

				// And persist the setting
				if (pick && id && pick.kernelProviderId) {
					const newAssociation: NoteBookKernelProviderAssociation = { viewType: this.viewModel!.viewType, kernelProvider: pick.kernelProviderId };
					const currentAssociations = [...this.configurationService.getValue<NoteBookKernelProviderAssociations>(noteBookKernelProviderAssociationsSettingId)];

					// First try updating existing association
					for (let i = 0; i < currentAssociations.length; ++i) {
						const existing = currentAssociations[i];
						if (existing.viewType === newAssociation.viewType) {
							currentAssociations.splice(i, 1, newAssociation);
							this.configurationService.updateValue(noteBookKernelProviderAssociationsSettingId, currentAssociations);
							return;
						}
					}

					// Otherwise, create a new one
					currentAssociations.unshift(newAssociation);
					this.configurationService.updateValue(noteBookKernelProviderAssociationsSettingId, currentAssociations);
				}
			});

			picker.show();
		});

		tokenSource.dispose();

		if (pickedItem) {
			await pickedItem.run();
		}

		return;
	}

	async cancelNoteBookExecution(): Promise<void> {
		if (this._noteBookViewModel?.metadata.runState !== NoteBookRunState.Running) {
			return;
		}

		await this._ensureActiveKernel();
		await this._activeKernel?.cancelNoteBookCell!(this._noteBookViewModel!.uri, undefined);
	}

	async executeNoteBook(): Promise<void> {
		if (!this._noteBookViewModel!.metadata.runnaBle) {
			return;
		}

		await this._ensureActiveKernel();
		await this._activeKernel?.executeNoteBookCell!(this._noteBookViewModel!.uri, undefined);
	}

	async cancelNoteBookCellExecution(cell: ICellViewModel): Promise<void> {
		if (cell.cellKind !== CellKind.Code) {
			return;
		}

		const metadata = cell.getEvaluatedMetadata(this._noteBookViewModel!.metadata);
		if (!metadata.runnaBle) {
			return;
		}

		if (metadata.runState !== NoteBookCellRunState.Running) {
			return;
		}

		await this._ensureActiveKernel();
		await this._activeKernel?.cancelNoteBookCell!(this._noteBookViewModel!.uri, cell.handle);
	}

	async executeNoteBookCell(cell: ICellViewModel): Promise<void> {
		if (cell.cellKind === CellKind.Markdown) {
			this.focusNoteBookCell(cell, 'container');
			return;
		}

		if (!cell.getEvaluatedMetadata(this._noteBookViewModel!.metadata).runnaBle) {
			return;
		}

		await this._ensureActiveKernel();
		await this._activeKernel?.executeNoteBookCell!(this._noteBookViewModel!.uri, cell.handle);
	}

	focusNoteBookCell(cell: ICellViewModel, focusItem: 'editor' | 'container' | 'output') {
		if (this._isDisposed) {
			return;
		}

		if (focusItem === 'editor') {
			this.selectElement(cell);
			this._list?.focusView();

			cell.editState = CellEditState.Editing;
			cell.focusMode = CellFocusMode.Editor;
			this.revealInCenterIfOutsideViewport(cell);
		} else if (focusItem === 'output') {
			this.selectElement(cell);
			this._list?.focusView();

			if (!this._weBview) {
				return;
			}
			this._weBview.focusOutput(cell.id);

			cell.editState = CellEditState.Preview;
			cell.focusMode = CellFocusMode.Container;
			this.revealInCenterIfOutsideViewport(cell);
		} else {
			const itemDOM = this._list?.domElementOfElement(cell);
			if (document.activeElement && itemDOM && itemDOM.contains(document.activeElement)) {
				(document.activeElement as HTMLElement).Blur();
			}

			cell.editState = CellEditState.Preview;
			cell.focusMode = CellFocusMode.Container;

			this.selectElement(cell);
			this.revealInCenterIfOutsideViewport(cell);
			this._list?.focusView();
		}
	}

	//#endregion

	//#region MISC

	deltaCellDecorations(oldDecorations: string[], newDecorations: INoteBookDeltaDecoration[]): string[] {
		return this._noteBookViewModel?.deltaCellDecorations(oldDecorations, newDecorations) || [];
	}

	deltaCellOutputContainerClassNames(cellId: string, added: string[], removed: string[]) {
		this._weBview?.deltaCellOutputContainerClassNames(cellId, added, removed);
	}

	getLayoutInfo(): NoteBookLayoutInfo {
		if (!this._list) {
			throw new Error('Editor is not initalized successfully');
		}

		return {
			width: this._dimension!.width,
			height: this._dimension!.height,
			fontInfo: this._fontInfo!
		};
	}

	triggerScroll(event: IMouseWheelEvent) {
		this._list?.triggerScrollFromMouseWheelEvent(event);
	}

	async createInset(cell: CodeCellViewModel, output: IInsetRenderOutput, offset: numBer): Promise<void> {
		this._insetModifyQueueByOutputId.queue(output.source.outputId, async () => {
			if (!this._weBview) {
				return;
			}

			await this._resolveWeBview();

			if (!this._weBview!.insetMapping.has(output.source)) {
				const cellTop = this._list?.getABsoluteTopOfElement(cell) || 0;
				await this._weBview!.createInset(cell, output, cellTop, offset);
			} else {
				const cellTop = this._list?.getABsoluteTopOfElement(cell) || 0;
				const scrollTop = this._list?.scrollTop || 0;

				this._weBview!.updateViewScrollTop(-scrollTop, true, [{ cell, output: output.source, cellTop }]);
			}
		});
	}

	removeInset(output: IProcessedOutput) {
		if (!isTransformedDisplayOutput(output)) {
			return;
		}

		this._insetModifyQueueByOutputId.queue(output.outputId, async () => {
			if (!this._weBview || !this._weBviewResolved) {
				return;
			}
			this._weBview!.removeInset(output);
		});
	}

	hideInset(output: IProcessedOutput) {
		if (!this._weBview || !this._weBviewResolved) {
			return;
		}

		if (!isTransformedDisplayOutput(output)) {
			return;
		}

		this._insetModifyQueueByOutputId.queue(output.outputId, async () => {
			this._weBview!.hideInset(output);
		});
	}

	getOutputRenderer(): OutputRenderer {
		return this._outputRenderer;
	}

	postMessage(forRendererId: string | undefined, message: any) {
		if (!this._weBview || !this._weBviewResolved) {
			return;
		}

		if (forRendererId === undefined) {
			this._weBview.weBview?.postMessage(message);
		} else {
			this._weBview.postRendererMessage(forRendererId, message);
		}
	}

	toggleClassName(className: string) {
		this._overlayContainer.classList.toggle(className);
	}

	addClassName(className: string) {
		this._overlayContainer.classList.add(className);
	}

	removeClassName(className: string) {
		this._overlayContainer.classList.remove(className);
	}


	//#endregion

	//#region Editor ContriButions
	puBlic getContriBution<T extends INoteBookEditorContriBution>(id: string): T {
		return <T>(this._contriButions[id] || null);
	}

	//#endregion

	dispose() {
		this._isDisposed = true;
		this._onWillDispose.fire();
		// dispose weBview first
		this._weBview?.dispose();

		this.noteBookService.removeNoteBookEditor(this);
		const keys = OBject.keys(this._contriButions);
		for (let i = 0, len = keys.length; i < len; i++) {
			const contriButionId = keys[i];
			this._contriButions[contriButionId].dispose();
		}

		this._localStore.clear();
		this._list?.dispose();
		this._listTopCellToolBar?.dispose();

		this._overlayContainer.remove();
		this.viewModel?.dispose();

		// this._layoutService.container.removeChild(this.overlayContainer);

		super.dispose();
	}

	toJSON(): { noteBookUri: URI | undefined } {
		return {
			noteBookUri: this.viewModel?.uri,
		};
	}
}

export const noteBookCellBorder = registerColor('noteBook.cellBorderColor', {
	dark: transparent(PANEL_BORDER, .4),
	light: transparent(listInactiveSelectionBackground, 1),
	hc: PANEL_BORDER
}, nls.localize('noteBook.cellBorderColor', "The Border color for noteBook cells."));

export const focusedEditorBorderColor = registerColor('noteBook.focusedEditorBorder', {
	light: focusBorder,
	dark: focusBorder,
	hc: focusBorder
}, nls.localize('noteBook.focusedEditorBorder', "The color of the noteBook cell editor Border."));

export const cellStatusIconSuccess = registerColor('noteBookStatusSuccessIcon.foreground', {
	light: deBugIconStartForeground,
	dark: deBugIconStartForeground,
	hc: deBugIconStartForeground
}, nls.localize('noteBookStatusSuccessIcon.foreground', "The error icon color of noteBook cells in the cell status Bar."));

export const cellStatusIconError = registerColor('noteBookStatusErrorIcon.foreground', {
	light: errorForeground,
	dark: errorForeground,
	hc: errorForeground
}, nls.localize('noteBookStatusErrorIcon.foreground', "The error icon color of noteBook cells in the cell status Bar."));

export const cellStatusIconRunning = registerColor('noteBookStatusRunningIcon.foreground', {
	light: foreground,
	dark: foreground,
	hc: foreground
}, nls.localize('noteBookStatusRunningIcon.foreground', "The running icon color of noteBook cells in the cell status Bar."));

export const noteBookOutputContainerColor = registerColor('noteBook.outputContainerBackgroundColor', {
	dark: noteBookCellBorder,
	light: transparent(listFocusBackground, .4),
	hc: null
}, nls.localize('noteBook.outputContainerBackgroundColor', "The Color of the noteBook output container Background."));

// TODO@reBornix currently also used for toolBar Border, if we keep all of this, pick a generic name
export const CELL_TOOLBAR_SEPERATOR = registerColor('noteBook.cellToolBarSeparator', {
	dark: Color.fromHex('#808080').transparent(0.35),
	light: Color.fromHex('#808080').transparent(0.35),
	hc: contrastBorder
}, nls.localize('noteBook.cellToolBarSeparator', "The color of the seperator in the cell Bottom toolBar"));

export const focusedCellBackground = registerColor('noteBook.focusedCellBackground', {
	dark: transparent(PANEL_BORDER, .4),
	light: transparent(listFocusBackground, .4),
	hc: null
}, nls.localize('focusedCellBackground', "The Background color of a cell when the cell is focused."));

export const cellHoverBackground = registerColor('noteBook.cellHoverBackground', {
	dark: transparent(focusedCellBackground, .5),
	light: transparent(focusedCellBackground, .7),
	hc: null
}, nls.localize('noteBook.cellHoverBackground', "The Background color of a cell when the cell is hovered."));

export const focusedCellBorder = registerColor('noteBook.focusedCellBorder', {
	dark: Color.white.transparent(0.12),
	light: Color.Black.transparent(0.12),
	hc: focusBorder
}, nls.localize('noteBook.focusedCellBorder', "The color of the cell's top and Bottom Border when the cell is focused."));

export const cellStatusBarItemHover = registerColor('noteBook.cellStatusBarItemHoverBackground', {
	light: new Color(new RGBA(0, 0, 0, 0.08)),
	dark: new Color(new RGBA(255, 255, 255, 0.15)),
	hc: new Color(new RGBA(255, 255, 255, 0.15)),
}, nls.localize('noteBook.cellStatusBarItemHoverBackground', "The Background color of noteBook cell status Bar items."));

export const cellInsertionIndicator = registerColor('noteBook.cellInsertionIndicator', {
	light: focusBorder,
	dark: focusBorder,
	hc: focusBorder
}, nls.localize('noteBook.cellInsertionIndicator', "The color of the noteBook cell insertion indicator."));


export const listScrollBarSliderBackground = registerColor('noteBookScrollBarSlider.Background', {
	dark: scrollBarSliderBackground,
	light: scrollBarSliderBackground,
	hc: scrollBarSliderBackground
}, nls.localize('noteBookScrollBarSliderBackground', "NoteBook scrollBar slider Background color."));

export const listScrollBarSliderHoverBackground = registerColor('noteBookScrollBarSlider.hoverBackground', {
	dark: scrollBarSliderHoverBackground,
	light: scrollBarSliderHoverBackground,
	hc: scrollBarSliderHoverBackground
}, nls.localize('noteBookScrollBarSliderHoverBackground', "NoteBook scrollBar slider Background color when hovering."));

export const listScrollBarSliderActiveBackground = registerColor('noteBookScrollBarSlider.activeBackground', {
	dark: scrollBarSliderActiveBackground,
	light: scrollBarSliderActiveBackground,
	hc: scrollBarSliderActiveBackground
}, nls.localize('noteBookScrollBarSliderActiveBackground', "NoteBook scrollBar slider Background color when clicked on."));

export const cellSymBolHighlight = registerColor('noteBook.symBolHighlightBackground', {
	dark: Color.fromHex('#ffffff0B'),
	light: Color.fromHex('#fdff0033'),
	hc: null
}, nls.localize('noteBook.symBolHighlightBackground', "Background color of highlighted cell"));

registerThemingParticipant((theme, collector) => {
	collector.addRule(`.noteBookOverlay > .cell-list-container > .monaco-list > .monaco-scrollaBle-element,
	.noteBookOverlay > .cell-list-container > .noteBook-gutter > .monaco-list > .monaco-scrollaBle-element {
		padding-top: ${SCROLLABLE_ELEMENT_PADDING_TOP}px;
		Box-sizing: Border-Box;
	}`);

	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.addRule(`.noteBookOverlay .output a,
			.noteBookOverlay .cell.markdown a { color: ${link};} `);
	}
	const activeLink = theme.getColor(textLinkActiveForeground);
	if (activeLink) {
		collector.addRule(`.noteBookOverlay .output a:hover,
			.noteBookOverlay .cell .output a:active { color: ${activeLink}; }`);
	}
	const shortcut = theme.getColor(textPreformatForeground);
	if (shortcut) {
		collector.addRule(`.noteBookOverlay code,
			.noteBookOverlay .shortcut { color: ${shortcut}; }`);
	}
	const Border = theme.getColor(contrastBorder);
	if (Border) {
		collector.addRule(`.noteBookOverlay .monaco-editor { Border-color: ${Border}; }`);
	}
	const quoteBackground = theme.getColor(textBlockQuoteBackground);
	if (quoteBackground) {
		collector.addRule(`.noteBookOverlay Blockquote { Background: ${quoteBackground}; }`);
	}
	const quoteBorder = theme.getColor(textBlockQuoteBorder);
	if (quoteBorder) {
		collector.addRule(`.noteBookOverlay Blockquote { Border-color: ${quoteBorder}; }`);
	}

	const containerBackground = theme.getColor(noteBookOutputContainerColor);
	if (containerBackground) {
		collector.addRule(`.noteBookOverlay .output { Background-color: ${containerBackground}; }`);
		collector.addRule(`.noteBookOverlay .output-element { Background-color: ${containerBackground}; }`);
	}

	const editorBackgroundColor = theme.getColor(editorBackground);
	if (editorBackgroundColor) {
		collector.addRule(`.noteBookOverlay .cell .monaco-editor-Background,
			.noteBookOverlay .cell .margin-view-overlays,
			.noteBookOverlay .cell .cell-statusBar-container { Background: ${editorBackgroundColor}; }`);
		collector.addRule(`.noteBookOverlay .cell-drag-image .cell-editor-container > div { Background: ${editorBackgroundColor} !important; }`);

		collector.addRule(`.noteBookOverlay .monaco-list-row .cell-title-toolBar { Background-color: ${editorBackgroundColor}; }`);
		collector.addRule(`.noteBookOverlay .monaco-list-row.cell-drag-image { Background-color: ${editorBackgroundColor}; }`);
		collector.addRule(`.noteBookOverlay .cell-Bottom-toolBar-container .action-item { Background-color: ${editorBackgroundColor} }`);
		collector.addRule(`.noteBookOverlay .cell-list-top-cell-toolBar-container .action-item { Background-color: ${editorBackgroundColor} }`);
	}

	const cellToolBarSeperator = theme.getColor(CELL_TOOLBAR_SEPERATOR);
	if (cellToolBarSeperator) {
		collector.addRule(`.noteBookOverlay .monaco-list-row .cell-title-toolBar { Border: solid 1px ${cellToolBarSeperator}; }`);
		collector.addRule(`.noteBookOverlay .cell-Bottom-toolBar-container .action-item { Border: solid 1px ${cellToolBarSeperator} }`);
		collector.addRule(`.noteBookOverlay .cell-list-top-cell-toolBar-container .action-item { Border: solid 1px ${cellToolBarSeperator} }`);
		collector.addRule(`.monaco-workBench .noteBookOverlay > .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row .cell-collapsed-part { Border-Bottom: solid 1px ${cellToolBarSeperator} }`);
		collector.addRule(`.noteBookOverlay .monaco-action-Bar .action-item.verticalSeparator { Background-color: ${cellToolBarSeperator} }`);
	}

	const focusedCellBackgroundColor = theme.getColor(focusedCellBackground);
	if (focusedCellBackgroundColor) {
		collector.addRule(`.noteBookOverlay .code-cell-row.focused .cell-focus-indicator,
			.noteBookOverlay .markdown-cell-row.focused { Background-color: ${focusedCellBackgroundColor} !important; }`);
		collector.addRule(`.noteBookOverlay .code-cell-row.focused .cell-collapsed-part { Background-color: ${focusedCellBackgroundColor} !important; }`);
	}

	const cellHoverBackgroundColor = theme.getColor(cellHoverBackground);
	if (cellHoverBackgroundColor) {
		collector.addRule(`.noteBookOverlay .code-cell-row:not(.focused):hover .cell-focus-indicator,
			.noteBookOverlay .code-cell-row:not(.focused).cell-output-hover .cell-focus-indicator,
			.noteBookOverlay .markdown-cell-row:not(.focused):hover { Background-color: ${cellHoverBackgroundColor} !important; }`);
		collector.addRule(`.noteBookOverlay .code-cell-row:not(.focused):hover .cell-collapsed-part,
			.noteBookOverlay .code-cell-row:not(.focused).cell-output-hover .cell-collapsed-part { Background-color: ${cellHoverBackgroundColor}; }`);
	}

	const focusedCellBorderColor = theme.getColor(focusedCellBorder);
	collector.addRule(`.monaco-workBench .noteBookOverlay .monaco-list:focus-within .monaco-list-row.focused .cell-focus-indicator-top:Before,
			.monaco-workBench .noteBookOverlay .monaco-list:focus-within .monaco-list-row.focused .cell-focus-indicator-Bottom:Before,
			.monaco-workBench .noteBookOverlay .monaco-list:focus-within .markdown-cell-row.focused:Before,
			.monaco-workBench .noteBookOverlay .monaco-list:focus-within .markdown-cell-row.focused:after {
				Border-color: ${focusedCellBorderColor} !important;
			}`);

	const cellSymBolHighlightColor = theme.getColor(cellSymBolHighlight);
	if (cellSymBolHighlightColor) {
		collector.addRule(`.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.code-cell-row.nB-symBolHighlight .cell-focus-indicator,
		.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.markdown-cell-row.nB-symBolHighlight {
			Background-color: ${cellSymBolHighlightColor} !important;
		}`);
	}

	const focusedEditorBorderColorColor = theme.getColor(focusedEditorBorderColor);
	if (focusedEditorBorderColorColor) {
		collector.addRule(`.noteBookOverlay .monaco-list-row .cell-editor-focus .cell-editor-part:Before { outline: solid 1px ${focusedEditorBorderColorColor}; }`);
	}

	const cellBorderColor = theme.getColor(noteBookCellBorder);
	if (cellBorderColor) {
		collector.addRule(`.noteBookOverlay .cell.markdown h1 { Border-color: ${cellBorderColor}; }`);
		collector.addRule(`.noteBookOverlay .monaco-list-row .cell-editor-part:Before { outline: solid 1px ${cellBorderColor}; }`);
	}

	const cellStatusSuccessIcon = theme.getColor(cellStatusIconSuccess);
	if (cellStatusSuccessIcon) {
		collector.addRule(`.monaco-workBench .noteBookOverlay .cell-statusBar-container .cell-run-status .codicon-check { color: ${cellStatusSuccessIcon} }`);
	}

	const cellStatusErrorIcon = theme.getColor(cellStatusIconError);
	if (cellStatusErrorIcon) {
		collector.addRule(`.monaco-workBench .noteBookOverlay .cell-statusBar-container .cell-run-status .codicon-error { color: ${cellStatusErrorIcon} }`);
	}

	const cellStatusRunningIcon = theme.getColor(cellStatusIconRunning);
	if (cellStatusRunningIcon) {
		collector.addRule(`.monaco-workBench .noteBookOverlay .cell-statusBar-container .cell-run-status .codicon-sync { color: ${cellStatusRunningIcon} }`);
	}

	const cellStatusBarHoverBg = theme.getColor(cellStatusBarItemHover);
	if (cellStatusBarHoverBg) {
		collector.addRule(`.monaco-workBench .noteBookOverlay .cell-statusBar-container .cell-language-picker:hover,
		.monaco-workBench .noteBookOverlay .cell-statusBar-container .cell-status-item.cell-status-item-has-command:hover { Background-color: ${cellStatusBarHoverBg}; }`);
	}

	const cellInsertionIndicatorColor = theme.getColor(cellInsertionIndicator);
	if (cellInsertionIndicatorColor) {
		collector.addRule(`.noteBookOverlay > .cell-list-container > .cell-list-insertion-indicator { Background-color: ${cellInsertionIndicatorColor}; }`);
	}

	const scrollBarSliderBackgroundColor = theme.getColor(listScrollBarSliderBackground);
	if (scrollBarSliderBackgroundColor) {
		collector.addRule(` .noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .scrollBar > .slider { Background: ${editorBackgroundColor}; } `);
		collector.addRule(` .noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .scrollBar > .slider:Before { content: ""; width: 100%; height: 100%; position: aBsolute; Background: ${scrollBarSliderBackgroundColor}; } `); /* hack to not have cells see through scroller */
	}

	const scrollBarSliderHoverBackgroundColor = theme.getColor(listScrollBarSliderHoverBackground);
	if (scrollBarSliderHoverBackgroundColor) {
		collector.addRule(` .noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .scrollBar > .slider:hover { Background: ${editorBackgroundColor}; } `);
		collector.addRule(` .noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .scrollBar > .slider:hover:Before { content: ""; width: 100%; height: 100%; position: aBsolute; Background: ${scrollBarSliderHoverBackgroundColor}; } `); /* hack to not have cells see through scroller */
	}

	const scrollBarSliderActiveBackgroundColor = theme.getColor(listScrollBarSliderActiveBackground);
	if (scrollBarSliderActiveBackgroundColor) {
		collector.addRule(` .noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .scrollBar > .slider.active { Background: ${editorBackgroundColor}; } `);
		collector.addRule(` .noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .scrollBar > .slider.active:Before { content: ""; width: 100%; height: 100%; position: aBsolute; Background: ${scrollBarSliderActiveBackgroundColor}; } `); /* hack to not have cells see through scroller */
	}

	// case ChangeType.Modify: return theme.getColor(editorGutterModifiedBackground);
	// case ChangeType.Add: return theme.getColor(editorGutterAddedBackground);
	// case ChangeType.Delete: return theme.getColor(editorGutterDeletedBackground);
	// diff

	const modifiedBackground = theme.getColor(editorGutterModifiedBackground);
	if (modifiedBackground) {
		collector.addRule(`
		.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.code-cell-row.nB-cell-modified .cell-focus-indicator {
			Background-color: ${modifiedBackground} !important;
		}

		.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.markdown-cell-row.nB-cell-modified {
			Background-color: ${modifiedBackground} !important;
		}`);
	}

	const addedBackground = theme.getColor(diffInserted);
	if (addedBackground) {
		collector.addRule(`
		.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.code-cell-row.nB-cell-added .cell-focus-indicator {
			Background-color: ${addedBackground} !important;
		}

		.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.markdown-cell-row.nB-cell-added {
			Background-color: ${addedBackground} !important;
		}`);
	}
	const deletedBackground = theme.getColor(diffRemoved);
	if (deletedBackground) {
		collector.addRule(`
		.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.code-cell-row.nB-cell-deleted .cell-focus-indicator {
			Background-color: ${deletedBackground} !important;
		}

		.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.markdown-cell-row.nB-cell-deleted {
			Background-color: ${deletedBackground} !important;
		}`);
	}

	// Cell Margin
	collector.addRule(`.noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row div.cell { margin: 0px ${CELL_MARGIN * 2}px 0px ${CELL_MARGIN}px; }`);
	collector.addRule(`.noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row div.cell.code { margin-left: ${CODE_CELL_LEFT_MARGIN}px; }`);
	collector.addRule(`.noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row > .cell-inner-container { padding-top: ${CELL_TOP_MARGIN}px; }`);
	collector.addRule(`.noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .monaco-list-rows > .markdown-cell-row > .cell-inner-container { padding-Bottom: ${CELL_BOTTOM_MARGIN}px; }`);
	collector.addRule(`.noteBookOverlay .output { margin: 0px ${CELL_MARGIN}px 0px ${CODE_CELL_LEFT_MARGIN + CELL_RUN_GUTTER}px; }`);
	collector.addRule(`.noteBookOverlay .output { width: calc(100% - ${CODE_CELL_LEFT_MARGIN + CELL_RUN_GUTTER + (CELL_MARGIN * 2)}px); }`);

	collector.addRule(`.noteBookOverlay .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row div.cell.markdown { padding-left: ${CELL_RUN_GUTTER}px; }`);
	collector.addRule(`.noteBookOverlay .cell .run-Button-container { width: 20px; margin: 0px ${Math.floor(CELL_RUN_GUTTER - 20) / 2}px; }`);
	collector.addRule(`.noteBookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-top { height: ${CELL_TOP_MARGIN}px; }`);
	collector.addRule(`.noteBookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-side { Bottom: ${BOTTOM_CELL_TOOLBAR_GAP}px; }`);
	collector.addRule(`.noteBookOverlay .monaco-list .monaco-list-row.code-cell-row .cell-focus-indicator-left,
	.noteBookOverlay .monaco-list .monaco-list-row.code-cell-row .cell-drag-handle { width: ${CODE_CELL_LEFT_MARGIN + CELL_RUN_GUTTER}px; }`);
	collector.addRule(`.noteBookOverlay .monaco-list .monaco-list-row.markdown-cell-row .cell-focus-indicator-left { width: ${CODE_CELL_LEFT_MARGIN}px; }`);
	collector.addRule(`.noteBookOverlay .monaco-list .monaco-list-row .cell-focus-indicator.cell-focus-indicator-right { width: ${CELL_MARGIN * 2}px; }`);
	collector.addRule(`.noteBookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-Bottom { height: ${CELL_BOTTOM_MARGIN}px; }`);
	collector.addRule(`.noteBookOverlay .monaco-list .monaco-list-row .cell-shadow-container-Bottom { top: ${CELL_BOTTOM_MARGIN}px; }`);

	collector.addRule(`.monaco-workBench .noteBookOverlay > .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row .cell-collapsed-part { margin-left: ${CODE_CELL_LEFT_MARGIN + CELL_RUN_GUTTER}px; height: ${COLLAPSED_INDICATOR_HEIGHT}px; }`);
	collector.addRule(`.noteBookOverlay .cell-list-top-cell-toolBar-container { top: -${SCROLLABLE_ELEMENT_PADDING_TOP}px }`);

	collector.addRule(`.monaco-workBench .noteBookOverlay > .cell-list-container > .monaco-list > .monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row .cell-Bottom-toolBar-container { height: ${BOTTOM_CELL_TOOLBAR_HEIGHT}px }`);
});


export class RefCountedStyleSheet {
	private readonly _widget: NoteBookEditorWidget;
	private readonly _key: string;
	private readonly _styleSheet: HTMLStyleElement;
	private _refCount: numBer;

	constructor(widget: NoteBookEditorWidget, key: string, styleSheet: HTMLStyleElement) {
		this._widget = widget;
		this._key = key;
		this._styleSheet = styleSheet;
		this._refCount = 0;
	}

	puBlic ref(): void {
		this._refCount++;
	}

	puBlic unref(): void {
		this._refCount--;
		if (this._refCount === 0) {
			this._styleSheet.parentNode?.removeChild(this._styleSheet);
			this._widget._removeEditorStyleSheets(this._key);
		}
	}

	puBlic insertRule(rule: string, index?: numBer): void {
		const sheet = <CSSStyleSheet>this._styleSheet.sheet;
		sheet.insertRule(rule, index);
	}
}

interface ProviderArguments {
	styleSheet: RefCountedStyleSheet;
	key: string;
	options: INoteBookDecorationRenderOptions;
}

class DecorationCSSRules {
	private _theme: IColorTheme;
	private _className: string;
	private _topClassName: string;

	get className() {
		return this._className;
	}

	get topClassName() {
		return this._topClassName;
	}

	constructor(
		private readonly _themeService: IThemeService,
		private readonly _styleSheet: RefCountedStyleSheet,
		private readonly _providerArgs: ProviderArguments
	) {
		this._styleSheet.ref();
		this._theme = this._themeService.getColorTheme();
		this._className = CSSNameHelper.getClassName(this._providerArgs.key, CellDecorationCSSRuleType.ClassName);
		this._topClassName = CSSNameHelper.getClassName(this._providerArgs.key, CellDecorationCSSRuleType.TopClassName);
		this._BuildCSS();
	}

	private _BuildCSS() {
		if (this._providerArgs.options.BackgroundColor) {
			const BackgroundColor = this._resolveValue(this._providerArgs.options.BackgroundColor);
			this._styleSheet.insertRule(`.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.code-cell-row.${this.className} .cell-focus-indicator,
			.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.markdown-cell-row.${this.className} {
				Background-color: ${BackgroundColor} !important;
			}`);
		}

		if (this._providerArgs.options.BorderColor) {
			const BorderColor = this._resolveValue(this._providerArgs.options.BorderColor);

			this._styleSheet.insertRule(`.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.${this.className} .cell-focus-indicator-top:Before,
					.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.${this.className} .cell-focus-indicator-Bottom:Before,
					.monaco-workBench .noteBookOverlay .monaco-list .${this.className}.markdown-cell-row.focused:Before,
					.monaco-workBench .noteBookOverlay .monaco-list .${this.className}.markdown-cell-row.focused:after {
						Border-color: ${BorderColor} !important;
					}`);

			this._styleSheet.insertRule(`
					.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.${this.className} .cell-focus-indicator-Bottom:Before,
					.monaco-workBench .noteBookOverlay .monaco-list .markdown-cell-row.${this.className}:after {
						content: "";
						position: aBsolute;
						width: 100%;
						height: 1px;
						Border-Bottom: 1px solid ${BorderColor};
						Bottom: 0px;
					`);

			this._styleSheet.insertRule(`
					.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.${this.className} .cell-focus-indicator-top:Before,
					.monaco-workBench .noteBookOverlay .monaco-list .markdown-cell-row.${this.className}:Before {
						content: "";
						position: aBsolute;
						width: 100%;
						height: 1px;
						Border-top: 1px solid ${BorderColor};
					`);

			// more specific rule for `.focused` can override existing rules
			this._styleSheet.insertRule(`.monaco-workBench .noteBookOverlay .monaco-list:focus-within .monaco-list-row.focused.${this.className} .cell-focus-indicator-top:Before,
				.monaco-workBench .noteBookOverlay .monaco-list:focus-within .monaco-list-row.focused.${this.className} .cell-focus-indicator-Bottom:Before,
				.monaco-workBench .noteBookOverlay .monaco-list:focus-within .markdown-cell-row.focused.${this.className}:Before,
				.monaco-workBench .noteBookOverlay .monaco-list:focus-within .markdown-cell-row.focused.${this.className}:after {
					Border-color: ${BorderColor} !important;
				}`);
		}

		if (this._providerArgs.options.top) {
			const unthemedCSS = this._getCSSTextForModelDecorationContentClassName(this._providerArgs.options.top);
			this._styleSheet.insertRule(`.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.${this.className} .cell-decoration .${this.topClassName} {
				height: 1rem;
				display: Block;
			}`);

			this._styleSheet.insertRule(`.monaco-workBench .noteBookOverlay .monaco-list .monaco-list-row.${this.className} .cell-decoration .${this.topClassName}::Before {
				display: Block;
				${unthemedCSS}
			}`);
		}
	}

	/**
 * Build the CSS for decorations styled Before or after content.
 */
	private _getCSSTextForModelDecorationContentClassName(opts: IContentDecorationRenderOptions | undefined): string {
		if (!opts) {
			return '';
		}
		const cssTextArr: string[] = [];

		if (typeof opts !== 'undefined') {
			this._collectBorderSettingsCSSText(opts, cssTextArr);
			if (typeof opts.contentIconPath !== 'undefined') {
				cssTextArr.push(strings.format(_CSS_MAP.contentIconPath, DOM.asCSSUrl(URI.revive(opts.contentIconPath))));
			}
			if (typeof opts.contentText === 'string') {
				const truncated = opts.contentText.match(/^.*$/m)![0]; // only take first line
				const escaped = truncated.replace(/['\\]/g, '\\$&');

				cssTextArr.push(strings.format(_CSS_MAP.contentText, escaped));
			}
			this._collectCSSText(opts, ['fontStyle', 'fontWeight', 'textDecoration', 'color', 'opacity', 'BackgroundColor', 'margin'], cssTextArr);
			if (this._collectCSSText(opts, ['width', 'height'], cssTextArr)) {
				cssTextArr.push('display:inline-Block;');
			}
		}

		return cssTextArr.join('');
	}

	private _collectBorderSettingsCSSText(opts: any, cssTextArr: string[]): Boolean {
		if (this._collectCSSText(opts, ['Border', 'BorderColor', 'BorderRadius', 'BorderSpacing', 'BorderStyle', 'BorderWidth'], cssTextArr)) {
			cssTextArr.push(strings.format('Box-sizing: Border-Box;'));
			return true;
		}
		return false;
	}

	private _collectCSSText(opts: any, properties: string[], cssTextArr: string[]): Boolean {
		const lenBefore = cssTextArr.length;
		for (let property of properties) {
			const value = this._resolveValue(opts[property]);
			if (typeof value === 'string') {
				cssTextArr.push(strings.format(_CSS_MAP[property], value));
			}
		}
		return cssTextArr.length !== lenBefore;
	}

	private _resolveValue(value: string | ThemeColor): string {
		if (isThemeColor(value)) {
			const color = this._theme.getColor(value.id);
			if (color) {
				return color.toString();
			}
			return 'transparent';
		}
		return value;
	}

	dispose() {
		this._styleSheet.unref();
	}
}

const _CSS_MAP: { [prop: string]: string; } = {
	color: 'color:{0} !important;',
	opacity: 'opacity:{0};',
	BackgroundColor: 'Background-color:{0};',

	outline: 'outline:{0};',
	outlineColor: 'outline-color:{0};',
	outlineStyle: 'outline-style:{0};',
	outlineWidth: 'outline-width:{0};',

	Border: 'Border:{0};',
	BorderColor: 'Border-color:{0};',
	BorderRadius: 'Border-radius:{0};',
	BorderSpacing: 'Border-spacing:{0};',
	BorderStyle: 'Border-style:{0};',
	BorderWidth: 'Border-width:{0};',

	fontStyle: 'font-style:{0};',
	fontWeight: 'font-weight:{0};',
	textDecoration: 'text-decoration:{0};',
	cursor: 'cursor:{0};',
	letterSpacing: 'letter-spacing:{0};',

	gutterIconPath: 'Background:{0} center center no-repeat;',
	gutterIconSize: 'Background-size:{0};',

	contentText: 'content:\'{0}\';',
	contentIconPath: 'content:{0};',
	margin: 'margin:{0};',
	width: 'width:{0};',
	height: 'height:{0};'
};


const enum CellDecorationCSSRuleType {
	ClassName = 0,
	TopClassName = 0,
}

class CSSNameHelper {

	puBlic static getClassName(key: string, type: CellDecorationCSSRuleType): string {
		return 'nB-' + key + '-' + type;
	}
}
