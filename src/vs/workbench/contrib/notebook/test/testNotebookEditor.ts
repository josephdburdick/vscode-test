/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { Emitter, Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IBulkEditService } from 'vs/editor/Browser/services/BulkEditService';
import { BareFontInfo } from 'vs/editor/common/config/fontInfo';
import { Range } from 'vs/editor/common/core/range';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { EditorModel } from 'vs/workBench/common/editor';
import { ICellViewModel, INoteBookEditor, INoteBookEditorContriBution, INoteBookEditorMouseEvent, NoteBookLayoutInfo, INoteBookDeltaDecoration, INoteBookEditorCreationOptions, NoteBookEditorOptions } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { OutputRenderer } from 'vs/workBench/contriB/noteBook/Browser/view/output/outputRenderer';
import { NoteBookEventDispatcher } from 'vs/workBench/contriB/noteBook/Browser/viewModel/eventDispatcher';
import { CellViewModel, IModelDecorationsChangeAccessor, NoteBookViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { CellKind, CellUri, INoteBookEditorModel, IProcessedOutput, NoteBookCellMetadata, IInsetRenderOutput, ICellRange, INoteBookKernelInfo2, noteBookDocumentMetadataDefaults } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { WeBview } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { ICompositeCodeEditor, IEditor } from 'vs/editor/common/editorCommon';
import { NotImplementedError } from 'vs/Base/common/errors';
import { Schemas } from 'vs/Base/common/network';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { TextModelResolverService } from 'vs/workBench/services/textmodelResolver/common/textModelResolverService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { UndoRedoService } from 'vs/platform/undoRedo/common/undoRedoService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';
import { ScrollEvent } from 'vs/Base/common/scrollaBle';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IFileStatWithMetadata } from 'vs/platform/files/common/files';

export class TestCell extends NoteBookCellTextModel {
	constructor(
		puBlic viewType: string,
		handle: numBer,
		puBlic source: string,
		language: string,
		cellKind: CellKind,
		outputs: IProcessedOutput[],
		modelService: ITextModelService
	) {
		super(CellUri.generate(URI.parse('test:///fake/noteBook'), handle), handle, source, language, cellKind, outputs, undefined, { transientMetadata: {}, transientOutputs: false }, modelService);
	}
}

export class TestNoteBookEditor implements INoteBookEditor {
	isEmBedded = false;
	private _isDisposed = false;

	get isDisposed() {
		return this._isDisposed;
	}

	get viewModel() {
		return undefined;
	}
	creationOptions: INoteBookEditorCreationOptions = { isEmBedded: false };

	constructor(
	) { }
	setEditorDecorations(key: string, range: ICellRange): void {
		// throw new Error('Method not implemented.');
	}
	removeEditorDecorations(key: string): void {
		// throw new Error('Method not implemented.');
	}
	getSelectionHandles(): numBer[] {
		return [];
	}


	setOptions(options: NoteBookEditorOptions | undefined): Promise<void> {
		throw new Error('Method not implemented.');
	}

	hideInset(output: IProcessedOutput): void {
		throw new Error('Method not implemented.');
	}

	multipleKernelsAvailaBle: Boolean = false;
	onDidChangeAvailaBleKernels: Event<void> = new Emitter<void>().event;
	onDidChangeActiveCell: Event<void> = new Emitter<void>().event;
	onDidScroll = new Emitter<ScrollEvent>().event;
	onWillDispose = new Emitter<void>().event;
	onDidChangeVisiBleRanges: Event<void> = new Emitter<void>().event;
	onDidChangeSelection: Event<void> = new Emitter<void>().event;
	visiBleRanges: ICellRange[] = [];
	uri?: URI | undefined;
	textModel?: NoteBookTextModel | undefined;

	hasModel(): Boolean {
		return true;
	}

	onDidFocusEditorWidget: Event<void> = new Emitter<void>().event;
	hasFocus(): Boolean {
		return true;
	}

	hasWeBviewFocus() {
		return false;
	}

	hasOutputTextSelection() {
		return false;
	}

	getId(): string {
		return 'noteBook.testEditor';
	}

	cursorNavigationMode = false;
	activeKernel: INoteBookKernelInfo2 | undefined;
	onDidChangeKernel: Event<void> = new Emitter<void>().event;
	onDidChangeActiveEditor: Event<ICompositeCodeEditor> = new Emitter<ICompositeCodeEditor>().event;
	activeCodeEditor: IEditor | undefined;
	getDomNode(): HTMLElement {
		throw new Error('Method not implemented.');
	}

	getOverflowContainerDomNode(): HTMLElement {
		throw new Error('Method not implemented.');
	}

	private _onDidChangeModel = new Emitter<NoteBookTextModel | undefined>();
	onDidChangeModel: Event<NoteBookTextModel | undefined> = this._onDidChangeModel.event;
	getContriBution<T extends INoteBookEditorContriBution>(id: string): T {
		throw new Error('Method not implemented.');
	}
	onMouseUp(listener: (e: INoteBookEditorMouseEvent) => void): IDisposaBle {
		throw new Error('Method not implemented.');
	}
	onMouseDown(listener: (e: INoteBookEditorMouseEvent) => void): IDisposaBle {
		throw new Error('Method not implemented.');
	}

	setHiddenAreas(_ranges: ICellRange[]): Boolean {
		throw new Error('Method not implemented.');
	}

	getInnerWeBview(): WeBview | undefined {
		throw new Error('Method not implemented.');
	}

	cancelNoteBookCellExecution(cell: ICellViewModel): void {
		throw new Error('Method not implemented.');
	}

	executeNoteBook(): Promise<void> {
		throw new Error('Method not implemented.');
	}

	cancelNoteBookExecution(): void {
		throw new Error('Method not implemented.');
	}

	executeNoteBookCell(cell: ICellViewModel): Promise<void> {
		throw new Error('Method not implemented.');
	}

	isNoteBookEditor = true;

	postMessage(): void {
		throw new Error('Method not implemented.');
	}

	toggleClassName(className: string): void {
		throw new Error('Method not implemented.');
	}

	addClassName(className: string): void {
		throw new Error('Method not implemented.');
	}

	removeClassName(className: string): void {
		throw new Error('Method not implemented.');
	}

	setCellSelection(cell: CellViewModel, selection: Range): void {
		throw new Error('Method not implemented.');
	}

	selectElement(cell: CellViewModel): void {
		throw new Error('Method not implemented.');
	}

	moveCellDown(cell: CellViewModel): Promise<ICellViewModel | null> {
		throw new Error('Method not implemented.');
	}

	moveCellUp(cell: CellViewModel): Promise<ICellViewModel | null> {
		throw new Error('Method not implemented.');
	}

	async moveCellsToIdx(index: numBer, length: numBer, toIdx: numBer): Promise<ICellViewModel | null> {
		throw new Error('Method not implemented.');
	}

	moveCell(cell: ICellViewModel, relativeToCell: ICellViewModel, direction: 'aBove' | 'Below'): Promise<ICellViewModel | null> {
		throw new Error('Method not implemented.');
	}

	splitNoteBookCell(cell: ICellViewModel): Promise<CellViewModel[] | null> {
		throw new Error('Method not implemented.');
	}

	joinNoteBookCells(cell: ICellViewModel, direction: 'aBove' | 'Below', constraint?: CellKind): Promise<ICellViewModel | null> {
		throw new Error('Method not implemented.');
	}

	setSelection(cell: CellViewModel, selection: Range): void {
		throw new Error('Method not implemented.');
	}
	revealRangeInViewAsync(cell: CellViewModel, range: Range): Promise<void> {
		throw new Error('Method not implemented.');
	}
	revealRangeInCenterAsync(cell: CellViewModel, range: Range): Promise<void> {
		throw new Error('Method not implemented.');
	}
	revealRangeInCenterIfOutsideViewportAsync(cell: CellViewModel, range: Range): Promise<void> {
		throw new Error('Method not implemented.');
	}

	revealLineInViewAsync(cell: CellViewModel, line: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	getLayoutInfo(): NoteBookLayoutInfo {
		throw new Error('Method not implemented.');
	}
	revealLineInCenterIfOutsideViewportAsync(cell: CellViewModel, line: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	revealLineInCenterAsync(cell: CellViewModel, line: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	focus(): void {
		throw new Error('Method not implemented.');
	}
	showFind(): void {
		throw new Error('Method not implemented.');
	}
	hideFind(): void {
		throw new Error('Method not implemented.');
	}
	revealInView(cell: CellViewModel): void {
		throw new Error('Method not implemented.');
	}
	revealInCenter(cell: CellViewModel): void {
		throw new Error('Method not implemented.');
	}
	revealInCenterIfOutsideViewport(cell: CellViewModel): void {
		throw new Error('Method not implemented.');
	}
	insertNoteBookCell(cell: CellViewModel, type: CellKind, direction: 'aBove' | 'Below'): CellViewModel {
		throw new Error('Method not implemented.');
	}
	deleteNoteBookCell(cell: CellViewModel): Promise<Boolean> {
		throw new Error('Method not implemented.');
	}
	focusNoteBookCell(cell: CellViewModel, focusItem: 'editor' | 'container' | 'output'): void {
		// throw new Error('Method not implemented.');
	}
	getActiveCell(): CellViewModel | undefined {
		// throw new Error('Method not implemented.');
		return;
	}
	async layoutNoteBookCell(cell: CellViewModel, height: numBer): Promise<void> {
		// throw new Error('Method not implemented.');
		return;
	}
	createInset(cell: CellViewModel, output: IInsetRenderOutput, offset: numBer): Promise<void> {
		return Promise.resolve();
	}
	removeInset(output: IProcessedOutput): void {
		// throw new Error('Method not implemented.');
	}
	triggerScroll(event: IMouseWheelEvent): void {
		// throw new Error('Method not implemented.');
	}
	getFontInfo(): BareFontInfo | undefined {
		return BareFontInfo.createFromRawSettings({
			fontFamily: 'Monaco',
		}, 1, true);
	}
	getOutputRenderer(): OutputRenderer {
		throw new Error('Method not implemented.');
	}

	changeModelDecorations<T>(callBack: (changeAccessor: IModelDecorationsChangeAccessor) => T): T | null {
		throw new Error('Method not implemented.');
	}

	deltaCellDecorations(oldDecorations: string[], newDecorations: INoteBookDeltaDecoration[]): string[] {
		throw new Error('Method not implemented.');
	}

	deltaCellOutputContainerClassNames(cellId: string, added: string[], removed: string[]): void {
		throw new Error('Method not implemented.');
	}

	dispose() {
		this._isDisposed = true;
	}
}

// export function createTestCellViewModel(instantiationService: IInstantiationService, viewType: string, noteBookHandle: numBer, cellhandle: numBer, source: string[], language: string, cellKind: CellKind, outputs: IOutput[]) {
// 	const mockCell = new TestCell(viewType, cellhandle, source, language, cellKind, outputs);
// 	return createCellViewModel(instantiationService, viewType, noteBookHandle, mockCell);
// }

export class NoteBookEditorTestModel extends EditorModel implements INoteBookEditorModel {
	private _dirty = false;

	protected readonly _onDidChangeDirty = this._register(new Emitter<void>());
	readonly onDidChangeDirty = this._onDidChangeDirty.event;

	private readonly _onDidChangeContent = this._register(new Emitter<void>());
	readonly onDidChangeContent: Event<void> = this._onDidChangeContent.event;


	get viewType() {
		return this._noteBook.viewType;
	}

	get resource() {
		return this._noteBook.uri;
	}

	get noteBook() {
		return this._noteBook;
	}

	constructor(
		private _noteBook: NoteBookTextModel
	) {
		super();

		if (_noteBook && _noteBook.onDidChangeContent) {
			this._register(_noteBook.onDidChangeContent(() => {
				this._dirty = true;
				this._onDidChangeDirty.fire();
				this._onDidChangeContent.fire();
			}));
		}
	}
	lastResolvedFileStat: IFileStatWithMetadata | undefined;

	isDirty() {
		return this._dirty;
	}

	isUntitled() {
		return this._noteBook.uri.scheme === Schemas.untitled;
	}

	getNoteBook(): NoteBookTextModel {
		return this._noteBook;
	}

	async save(): Promise<Boolean> {
		if (this._noteBook) {
			this._dirty = false;
			this._onDidChangeDirty.fire();
			// todo, flush all states
			return true;
		}

		return false;
	}

	saveAs(): Promise<Boolean> {
		throw new NotImplementedError();
	}

	revert(): Promise<void> {
		throw new NotImplementedError();
	}
}

export function setupInstantiationService() {
	const instantiationService = new TestInstantiationService();

	instantiationService.stuB(IUndoRedoService, instantiationService.createInstance(UndoRedoService));
	instantiationService.stuB(IConfigurationService, new TestConfigurationService());
	instantiationService.stuB(IThemeService, new TestThemeService());
	instantiationService.stuB(IModelService, instantiationService.createInstance(ModelServiceImpl));
	instantiationService.stuB(ITextModelService, <ITextModelService>instantiationService.createInstance(TextModelResolverService));

	return instantiationService;
}

export function withTestNoteBook(instantiationService: TestInstantiationService, BlukEditService: IBulkEditService, undoRedoService: IUndoRedoService, cells: [string, string, CellKind, IProcessedOutput[], NoteBookCellMetadata][], callBack: (editor: TestNoteBookEditor, viewModel: NoteBookViewModel, textModel: NoteBookTextModel) => void) {
	const textModelService = instantiationService.get(ITextModelService);
	const modeService = instantiationService.get(IModeService);

	const viewType = 'noteBook';
	const editor = new TestNoteBookEditor();
	const noteBook = new NoteBookTextModel(viewType, false, URI.parse('test'), cells.map(cell => {
		return {
			source: cell[0],
			language: cell[1],
			cellKind: cell[2],
			outputs: cell[3],
			metadata: cell[4]
		};
	}), [], noteBookDocumentMetadataDefaults, { transientMetadata: {}, transientOutputs: false }, undoRedoService, textModelService, modeService);
	const model = new NoteBookEditorTestModel(noteBook);
	const eventDispatcher = new NoteBookEventDispatcher();
	const viewModel = new NoteBookViewModel(viewType, model.noteBook, eventDispatcher, null, instantiationService, BlukEditService, undoRedoService);

	callBack(editor, viewModel, noteBook);

	viewModel.dispose();
	return;
}
