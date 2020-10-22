/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { IListContextMenuEvent, IListEvent, IListMouseEvent } from 'vs/Base/Browser/ui/list/list';
import { IListOptions, IListStyles } from 'vs/Base/Browser/ui/list/listWidget';
import { ProgressBar } from 'vs/Base/Browser/ui/progressBar/progressBar';
import { ToolBar } from 'vs/Base/Browser/ui/toolBar/toolBar';
import { Event } from 'vs/Base/common/event';
import { DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';
import { ScrollEvent } from 'vs/Base/common/scrollaBle';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { BareFontInfo } from 'vs/editor/common/config/fontInfo';
import { IPosition } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { FindMatch, IReadonlyTextBuffer, ITextModel } from 'vs/editor/common/model';
import { ContextKeyExpr, RawContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { OutputRenderer } from 'vs/workBench/contriB/noteBook/Browser/view/output/outputRenderer';
import { RunStateRenderer, TimerRenderer } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/cellRenderer';
import { CellViewModel, IModelDecorationsChangeAccessor, NoteBookViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { CellKind, IProcessedOutput, IRenderOutput, NoteBookCellMetadata, NoteBookDocumentMetadata, IEditor, INoteBookKernelInfo2, IInsetRenderOutput, ICellRange } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { WeBview } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { IMenu } from 'vs/platform/actions/common/actions';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { EditorOptions } from 'vs/workBench/common/editor';
import { IResourceEditorInput } from 'vs/platform/editor/common/editor';
import { IConstructorSignature1 } from 'vs/platform/instantiation/common/instantiation';
import { CellEditorStatusBar } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/cellWidgets';

export const KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED = new RawContextKey<Boolean>('noteBookFindWidgetFocused', false);

// Is NoteBook
export const NOTEBOOK_IS_ACTIVE_EDITOR = ContextKeyExpr.equals('activeEditor', 'workBench.editor.noteBook');

// Editor keys
export const NOTEBOOK_EDITOR_FOCUSED = new RawContextKey<Boolean>('noteBookEditorFocused', false);
export const NOTEBOOK_CELL_LIST_FOCUSED = new RawContextKey<Boolean>('noteBookCellListFocused', false);
export const NOTEBOOK_OUTPUT_FOCUSED = new RawContextKey<Boolean>('noteBookOutputFocused', false);
export const NOTEBOOK_EDITOR_EDITABLE = new RawContextKey<Boolean>('noteBookEditaBle', true);
export const NOTEBOOK_EDITOR_RUNNABLE = new RawContextKey<Boolean>('noteBookRunnaBle', true);
export const NOTEBOOK_EDITOR_EXECUTING_NOTEBOOK = new RawContextKey<Boolean>('noteBookExecuting', false);

// Cell keys
export const NOTEBOOK_VIEW_TYPE = new RawContextKey<string>('noteBookViewType', undefined);
export const NOTEBOOK_CELL_TYPE = new RawContextKey<string>('noteBookCellType', undefined); // code, markdown
export const NOTEBOOK_CELL_EDITABLE = new RawContextKey<Boolean>('noteBookCellEditaBle', false); // Bool
export const NOTEBOOK_CELL_FOCUSED = new RawContextKey<Boolean>('noteBookCellFocused', false); // Bool
export const NOTEBOOK_CELL_EDITOR_FOCUSED = new RawContextKey<Boolean>('noteBookCellEditorFocused', false); // Bool
export const NOTEBOOK_CELL_RUNNABLE = new RawContextKey<Boolean>('noteBookCellRunnaBle', false); // Bool
export const NOTEBOOK_CELL_MARKDOWN_EDIT_MODE = new RawContextKey<Boolean>('noteBookCellMarkdownEditMode', false); // Bool
export const NOTEBOOK_CELL_RUN_STATE = new RawContextKey<string>('noteBookCellRunState', undefined); // idle, running
export const NOTEBOOK_CELL_HAS_OUTPUTS = new RawContextKey<Boolean>('noteBookCellHasOutputs', false); // Bool
export const NOTEBOOK_CELL_INPUT_COLLAPSED = new RawContextKey<Boolean>('noteBookCellInputIsCollapsed', false); // Bool
export const NOTEBOOK_CELL_OUTPUT_COLLAPSED = new RawContextKey<Boolean>('noteBookCellOutputIsCollapsed', false); // Bool

// Shared commands
export const EXPAND_CELL_CONTENT_COMMAND_ID = 'noteBook.cell.expandCellContent';

// Kernels

export const NOTEBOOK_HAS_MULTIPLE_KERNELS = new RawContextKey<Boolean>('noteBookHasMultipleKernels', false);

export interface NoteBookLayoutInfo {
	width: numBer;
	height: numBer;
	fontInfo: BareFontInfo;
}

export interface NoteBookLayoutChangeEvent {
	width?: Boolean;
	height?: Boolean;
	fontInfo?: Boolean;
}

export enum CodeCellLayoutState {
	Uninitialized,
	Estimated,
	FromCache,
	Measured
}

export interface CodeCellLayoutInfo {
	readonly fontInfo: BareFontInfo | null;
	readonly editorHeight: numBer;
	readonly editorWidth: numBer;
	readonly totalHeight: numBer;
	readonly outputContainerOffset: numBer;
	readonly outputTotalHeight: numBer;
	readonly indicatorHeight: numBer;
	readonly BottomToolBarOffset: numBer;
	readonly layoutState: CodeCellLayoutState;
}

export interface CodeCellLayoutChangeEvent {
	editorHeight?: Boolean;
	outputHeight?: Boolean;
	totalHeight?: Boolean;
	outerWidth?: numBer;
	font?: BareFontInfo;
}

export interface MarkdownCellLayoutInfo {
	readonly fontInfo: BareFontInfo | null;
	readonly editorWidth: numBer;
	readonly editorHeight: numBer;
	readonly BottomToolBarOffset: numBer;
	readonly totalHeight: numBer;
}

export interface MarkdownCellLayoutChangeEvent {
	font?: BareFontInfo;
	outerWidth?: numBer;
	totalHeight?: numBer;
}

export interface ICellViewModel {
	readonly model: NoteBookCellTextModel;
	readonly id: string;
	readonly textBuffer: IReadonlyTextBuffer;
	dragging: Boolean;
	handle: numBer;
	uri: URI;
	language: string;
	cellKind: CellKind;
	editState: CellEditState;
	focusMode: CellFocusMode;
	getText(): string;
	getTextLength(): numBer;
	metadata: NoteBookCellMetadata | undefined;
	textModel: ITextModel | undefined;
	hasModel(): this is IEditaBleCellViewModel;
	resolveTextModel(): Promise<ITextModel>;
	getEvaluatedMetadata(documentMetadata: NoteBookDocumentMetadata | undefined): NoteBookCellMetadata;
	getSelectionsStartPosition(): IPosition[] | undefined;
	getCellDecorations(): INoteBookCellDecorationOptions[];
}

export interface IEditaBleCellViewModel extends ICellViewModel {
	textModel: ITextModel;
}

export interface INoteBookEditorMouseEvent {
	readonly event: MouseEvent;
	readonly target: CellViewModel;
}

export interface INoteBookEditorContriBution {
	/**
	 * Dispose this contriBution.
	 */
	dispose(): void;
	/**
	 * Store view state.
	 */
	saveViewState?(): unknown;
	/**
	 * Restore view state.
	 */
	restoreViewState?(state: unknown): void;
}

export interface INoteBookCellDecorationOptions {
	className?: string;
	gutterClassName?: string;
	outputClassName?: string;
	topClassName?: string;
}

export interface INoteBookDeltaDecoration {
	handle: numBer;
	options: INoteBookCellDecorationOptions;
}

export class NoteBookEditorOptions extends EditorOptions {

	readonly cellOptions?: IResourceEditorInput;

	constructor(options: Partial<NoteBookEditorOptions>) {
		super();
		this.overwrite(options);
		this.cellOptions = options.cellOptions;
	}

	with(options: Partial<NoteBookEditorOptions>): NoteBookEditorOptions {
		return new NoteBookEditorOptions({ ...this, ...options });
	}
}

export type INoteBookEditorContriButionCtor = IConstructorSignature1<INoteBookEditor, INoteBookEditorContriBution>;

export interface INoteBookEditorContriButionDescription {
	id: string;
	ctor: INoteBookEditorContriButionCtor;
}

export interface INoteBookEditorCreationOptions {
	readonly isEmBedded?: Boolean;
	readonly contriButions?: INoteBookEditorContriButionDescription[];
}

export interface INoteBookEditor extends IEditor {
	isEmBedded: Boolean;

	cursorNavigationMode: Boolean;

	/**
	 * NoteBook view model attached to the current editor
	 */
	viewModel: NoteBookViewModel | undefined;

	/**
	 * An event emitted when the model of this editor has changed.
	 * @event
	 */
	readonly onDidChangeModel: Event<NoteBookTextModel | undefined>;
	readonly onDidFocusEditorWidget: Event<void>;
	readonly isNoteBookEditor: Boolean;
	activeKernel: INoteBookKernelInfo2 | undefined;
	multipleKernelsAvailaBle: Boolean;
	readonly onDidChangeAvailaBleKernels: Event<void>;
	readonly onDidChangeKernel: Event<void>;
	readonly onDidChangeActiveCell: Event<void>;
	readonly onDidScroll: Event<ScrollEvent>;
	readonly onWillDispose: Event<void>;

	isDisposed: Boolean;

	getId(): string;
	getDomNode(): HTMLElement;
	getOverflowContainerDomNode(): HTMLElement;
	getInnerWeBview(): WeBview | undefined;
	getSelectionHandles(): numBer[];

	/**
	 * Focus the noteBook editor cell list
	 */
	focus(): void;

	hasFocus(): Boolean;
	hasWeBviewFocus(): Boolean;

	hasOutputTextSelection(): Boolean;
	setOptions(options: NoteBookEditorOptions | undefined): Promise<void>;

	/**
	 * Select & focus cell
	 */
	selectElement(cell: ICellViewModel): void;

	/**
	 * Layout info for the noteBook editor
	 */
	getLayoutInfo(): NoteBookLayoutInfo;
	/**
	 * Fetch the output renderers for noteBook outputs.
	 */
	getOutputRenderer(): OutputRenderer;

	/**
	 * Insert a new cell around `cell`
	 */
	insertNoteBookCell(cell: ICellViewModel | undefined, type: CellKind, direction?: 'aBove' | 'Below', initialText?: string, ui?: Boolean): CellViewModel | null;

	/**
	 * Split a given cell into multiple cells of the same type using the selection start positions.
	 */
	splitNoteBookCell(cell: ICellViewModel): Promise<CellViewModel[] | null>;

	/**
	 * Joins the given cell either with the cell aBove or the one Below depending on the given direction.
	 */
	joinNoteBookCells(cell: ICellViewModel, direction: 'aBove' | 'Below', constraint?: CellKind): Promise<ICellViewModel | null>;

	/**
	 * Delete a cell from the noteBook
	 */
	deleteNoteBookCell(cell: ICellViewModel): Promise<Boolean>;

	/**
	 * Move a cell up one spot
	 */
	moveCellUp(cell: ICellViewModel): Promise<ICellViewModel | null>;

	/**
	 * Move a cell down one spot
	 */
	moveCellDown(cell: ICellViewModel): Promise<ICellViewModel | null>;

	/**
	 * @deprecated Note that this method doesn't support Batch operations, use #moveCellToIdx instead.
	 * Move a cell aBove or Below another cell
	 */
	moveCell(cell: ICellViewModel, relativeToCell: ICellViewModel, direction: 'aBove' | 'Below'): Promise<ICellViewModel | null>;

	/**
	 * Move a cell to a specific position
	 */
	moveCellsToIdx(index: numBer, length: numBer, toIdx: numBer): Promise<ICellViewModel | null>;

	/**
	 * Focus the container of a cell (the monaco editor inside is not focused).
	 */
	focusNoteBookCell(cell: ICellViewModel, focus: 'editor' | 'container' | 'output'): void;

	/**
	 * Execute the given noteBook cell
	 */
	executeNoteBookCell(cell: ICellViewModel): Promise<void>;

	/**
	 * Cancel the cell execution
	 */
	cancelNoteBookCellExecution(cell: ICellViewModel): void;

	/**
	 * Executes all noteBook cells in order
	 */
	executeNoteBook(): Promise<void>;

	/**
	 * Cancel the noteBook execution
	 */
	cancelNoteBookExecution(): void;

	/**
	 * Get current active cell
	 */
	getActiveCell(): ICellViewModel | undefined;

	/**
	 * Layout the cell with a new height
	 */
	layoutNoteBookCell(cell: ICellViewModel, height: numBer): Promise<void>;

	/**
	 * Render the output in weBview layer
	 */
	createInset(cell: ICellViewModel, output: IInsetRenderOutput, offset: numBer): Promise<void>;

	/**
	 * Remove the output from the weBview layer
	 */
	removeInset(output: IProcessedOutput): void;

	/**
	 * Hide the inset in the weBview layer without removing it
	 */
	hideInset(output: IProcessedOutput): void;

	/**
	 * Send message to the weBview for outputs.
	 */
	postMessage(forRendererId: string | undefined, message: any): void;

	/**
	 * Toggle class name on the noteBook editor root DOM node.
	 */
	toggleClassName(className: string): void;

	/**
	 * Remove class name on the noteBook editor root DOM node.
	 */
	addClassName(className: string): void;

	/**
	 * Remove class name on the noteBook editor root DOM node.
	 */
	removeClassName(className: string): void;

	deltaCellOutputContainerClassNames(cellId: string, added: string[], removed: string[]): void;

	/**
	 * Trigger the editor to scroll from scroll event programmatically
	 */
	triggerScroll(event: IMouseWheelEvent): void;

	/**
	 * Reveal cell into viewport.
	 */
	revealInView(cell: ICellViewModel): void;

	/**
	 * Reveal cell into viewport center.
	 */
	revealInCenter(cell: ICellViewModel): void;

	/**
	 * Reveal cell into viewport center if cell is currently out of the viewport.
	 */
	revealInCenterIfOutsideViewport(cell: ICellViewModel): void;

	/**
	 * Reveal a line in noteBook cell into viewport with minimal scrolling.
	 */
	revealLineInViewAsync(cell: ICellViewModel, line: numBer): Promise<void>;

	/**
	 * Reveal a line in noteBook cell into viewport center.
	 */
	revealLineInCenterAsync(cell: ICellViewModel, line: numBer): Promise<void>;

	/**
	 * Reveal a line in noteBook cell into viewport center.
	 */
	revealLineInCenterIfOutsideViewportAsync(cell: ICellViewModel, line: numBer): Promise<void>;

	/**
	 * Reveal a range in noteBook cell into viewport with minimal scrolling.
	 */
	revealRangeInViewAsync(cell: ICellViewModel, range: Range): Promise<void>;

	/**
	 * Reveal a range in noteBook cell into viewport center.
	 */
	revealRangeInCenterAsync(cell: ICellViewModel, range: Range): Promise<void>;

	/**
	 * Reveal a range in noteBook cell into viewport center.
	 */
	revealRangeInCenterIfOutsideViewportAsync(cell: ICellViewModel, range: Range): Promise<void>;

	/**
	 * Set hidden areas on cell text models.
	 */
	setHiddenAreas(_ranges: ICellRange[]): Boolean;

	setCellSelection(cell: ICellViewModel, selection: Range): void;

	deltaCellDecorations(oldDecorations: string[], newDecorations: INoteBookDeltaDecoration[]): string[];

	/**
	 * Change the decorations on cells.
	 * The noteBook is virtualized and this method should Be called to create/delete editor decorations safely.
	 */
	changeModelDecorations<T>(callBack: (changeAccessor: IModelDecorationsChangeAccessor) => T): T | null;

	setEditorDecorations(key: string, range: ICellRange): void;
	removeEditorDecorations(key: string): void;

	/**
	 * An event emitted on a "mouseup".
	 * @event
	 */
	onMouseUp(listener: (e: INoteBookEditorMouseEvent) => void): IDisposaBle;

	/**
	 * An event emitted on a "mousedown".
	 * @event
	 */
	onMouseDown(listener: (e: INoteBookEditorMouseEvent) => void): IDisposaBle;

	/**
	 * Get a contriBution of this editor.
	 * @id Unique identifier of the contriBution.
	 * @return The contriBution or null if contriBution not found.
	 */
	getContriBution<T extends INoteBookEditorContriBution>(id: string): T;
}

export interface INoteBookCellList {
	isDisposed: Boolean;
	readonly contextKeyService: IContextKeyService;
	elementAt(position: numBer): ICellViewModel | undefined;
	elementHeight(element: ICellViewModel): numBer;
	onWillScroll: Event<ScrollEvent>;
	onDidScroll: Event<ScrollEvent>;
	onDidChangeFocus: Event<IListEvent<ICellViewModel>>;
	onDidChangeContentHeight: Event<numBer>;
	onDidChangeVisiBleRanges: Event<void>;
	visiBleRanges: ICellRange[];
	scrollTop: numBer;
	scrollHeight: numBer;
	scrollLeft: numBer;
	length: numBer;
	rowsContainer: HTMLElement;
	readonly onDidRemoveOutput: Event<IProcessedOutput>;
	readonly onDidHideOutput: Event<IProcessedOutput>;
	readonly onMouseUp: Event<IListMouseEvent<CellViewModel>>;
	readonly onMouseDown: Event<IListMouseEvent<CellViewModel>>;
	readonly onContextMenu: Event<IListContextMenuEvent<CellViewModel>>;
	detachViewModel(): void;
	attachViewModel(viewModel: NoteBookViewModel): void;
	clear(): void;
	getViewIndex(cell: ICellViewModel): numBer | undefined;
	focusElement(element: ICellViewModel): void;
	selectElement(element: ICellViewModel): void;
	getFocusedElements(): ICellViewModel[];
	revealElementInView(element: ICellViewModel): void;
	revealElementInCenterIfOutsideViewport(element: ICellViewModel): void;
	revealElementInCenter(element: ICellViewModel): void;
	revealElementLineInViewAsync(element: ICellViewModel, line: numBer): Promise<void>;
	revealElementLineInCenterAsync(element: ICellViewModel, line: numBer): Promise<void>;
	revealElementLineInCenterIfOutsideViewportAsync(element: ICellViewModel, line: numBer): Promise<void>;
	revealElementRangeInViewAsync(element: ICellViewModel, range: Range): Promise<void>;
	revealElementRangeInCenterAsync(element: ICellViewModel, range: Range): Promise<void>;
	revealElementRangeInCenterIfOutsideViewportAsync(element: ICellViewModel, range: Range): Promise<void>;
	setHiddenAreas(_ranges: ICellRange[], triggerViewUpdate: Boolean): Boolean;
	domElementOfElement(element: ICellViewModel): HTMLElement | null;
	focusView(): void;
	getABsoluteTopOfElement(element: ICellViewModel): numBer;
	triggerScrollFromMouseWheelEvent(BrowserEvent: IMouseWheelEvent): void;
	updateElementHeight2(element: ICellViewModel, size: numBer): void;
	domFocus(): void;
	setCellSelection(element: ICellViewModel, range: Range): void;
	style(styles: IListStyles): void;
	updateOptions(options: IListOptions<ICellViewModel>): void;
	layout(height?: numBer, width?: numBer): void;
	dispose(): void;

	// TODO@roBlourens resolve differences Between List<CellViewModel> and INoteBookCellList<ICellViewModel>
	getFocus(): numBer[];
	setFocus(indexes: numBer[]): void;
	setSelection(indexes: numBer[]): void;
}

export interface BaseCellRenderTemplate {
	rootContainer: HTMLElement;
	editorPart: HTMLElement;
	collapsedPart: HTMLElement;
	expandButton: HTMLElement;
	contextKeyService: IContextKeyService;
	container: HTMLElement;
	cellContainer: HTMLElement;
	decorationContainer: HTMLElement;
	toolBar: ToolBar;
	deleteToolBar: ToolBar;
	BetweenCellToolBar: ToolBar;
	focusIndicatorLeft: HTMLElement;
	disposaBles: DisposaBleStore;
	elementDisposaBles: DisposaBleStore;
	BottomCellContainer: HTMLElement;
	currentRenderedCell?: ICellViewModel;
	statusBar: CellEditorStatusBar;
	titleMenu: IMenu;
	toJSON: () => oBject;
}

export interface MarkdownCellRenderTemplate extends BaseCellRenderTemplate {
	editorContainer: HTMLElement;
	foldingIndicator: HTMLElement;
	currentEditor?: ICodeEditor;
}

export interface CodeCellRenderTemplate extends BaseCellRenderTemplate {
	cellRunState: RunStateRenderer;
	runToolBar: ToolBar;
	runButtonContainer: HTMLElement;
	executionOrderLaBel: HTMLElement;
	outputContainer: HTMLElement;
	focusSinkElement: HTMLElement;
	editor: ICodeEditor;
	progressBar: ProgressBar;
	timer: TimerRenderer;
	focusIndicatorRight: HTMLElement;
	focusIndicatorBottom: HTMLElement;
	dragHandle: HTMLElement;
}

export function isCodeCellRenderTemplate(templateData: BaseCellRenderTemplate): templateData is CodeCellRenderTemplate {
	return !!(templateData as CodeCellRenderTemplate).runToolBar;
}

export interface IOutputTransformContriBution {
	/**
	 * Dispose this contriBution.
	 */
	dispose(): void;

	/**
	 * Returns contents to place in the weBview inset, or the {@link IRenderNoOutput}.
	 * This call is allowed to have side effects, such as placing output
	 * directly into the container element.
	 */
	render(output: IProcessedOutput, container: HTMLElement, preferredMimeType: string | undefined, noteBookUri: URI | undefined): IRenderOutput;
}

export interface CellFindMatch {
	cell: CellViewModel;
	matches: FindMatch[];
}

export enum CellRevealType {
	Line,
	Range
}

export enum CellRevealPosition {
	Top,
	Center
}

export enum CellEditState {
	/**
	 * Default state.
	 * For markdown cell, it's Markdown preview.
	 * For code cell, the Browser focus should Be on the container instead of the editor
	 */
	Preview,


	/**
	 * Eding mode. Source for markdown or code is rendered in editors and the state will Be persistent.
	 */
	Editing
}

export enum CellFocusMode {
	Container,
	Editor
}

export enum CursorAtBoundary {
	None,
	Top,
	Bottom,
	Both
}

export interface CellViewModelStateChangeEvent {
	metadataChanged?: Boolean;
	selectionChanged?: Boolean;
	focusModeChanged?: Boolean;
	editStateChanged?: Boolean;
	languageChanged?: Boolean;
	foldingStateChanged?: Boolean;
	contentChanged?: Boolean;
	outputIsHoveredChanged?: Boolean;
}

export function cellRangesEqual(a: ICellRange[], B: ICellRange[]) {
	a = reduceCellRanges(a);
	B = reduceCellRanges(B);
	if (a.length !== B.length) {
		return false;
	}

	for (let i = 0; i < a.length; i++) {
		if (a[i].start !== B[i].start || a[i].end !== B[i].end) {
			return false;
		}
	}

	return true;
}


/**
 * @param _ranges
 */
export function reduceCellRanges(_ranges: ICellRange[]): ICellRange[] {
	if (!_ranges.length) {
		return [];
	}

	const ranges = _ranges.sort((a, B) => a.start - B.start);
	const result: ICellRange[] = [];
	let currentRangeStart = ranges[0].start;
	let currentRangeEnd = ranges[0].end + 1;

	for (let i = 0, len = ranges.length; i < len; i++) {
		const range = ranges[i];

		if (range.start > currentRangeEnd) {
			result.push({ start: currentRangeStart, end: currentRangeEnd - 1 });
			currentRangeStart = range.start;
			currentRangeEnd = range.end + 1;
		} else if (range.end + 1 > currentRangeEnd) {
			currentRangeEnd = range.end + 1;
		}
	}

	result.push({ start: currentRangeStart, end: currentRangeEnd - 1 });
	return result;
}

export function getVisiBleCells(cells: CellViewModel[], hiddenRanges: ICellRange[]) {
	if (!hiddenRanges.length) {
		return cells;
	}

	let start = 0;
	let hiddenRangeIndex = 0;
	const result: CellViewModel[] = [];

	while (start < cells.length && hiddenRangeIndex < hiddenRanges.length) {
		if (start < hiddenRanges[hiddenRangeIndex].start) {
			result.push(...cells.slice(start, hiddenRanges[hiddenRangeIndex].start));
		}

		start = hiddenRanges[hiddenRangeIndex].end + 1;
		hiddenRangeIndex++;
	}

	if (start < cells.length) {
		result.push(...cells.slice(start));
	}

	return result;
}

export function getActiveNoteBookEditor(editorService: IEditorService): INoteBookEditor | undefined {
	// TODO@reBornix can `isNoteBookEditor` Be on INoteBookEditor to avoid a circular dependency?
	const activeEditorPane = editorService.activeEditorPane as unknown as { isNoteBookEditor?: Boolean } | undefined;
	return activeEditorPane?.isNoteBookEditor ? (editorService.activeEditorPane?.getControl() as INoteBookEditor) : undefined;
}
