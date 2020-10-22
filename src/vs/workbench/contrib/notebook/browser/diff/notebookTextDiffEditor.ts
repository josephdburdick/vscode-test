/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as DOM from 'vs/Base/Browser/dom';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { EditorOptions, IEditorOpenContext } from 'vs/workBench/common/editor';
import { noteBookCellBorder, NoteBookEditorWidget } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorWidget';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { NoteBookDiffEditorInput } from '../noteBookDiffEditorInput';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { WorkBenchList } from 'vs/platform/list/Browser/listService';
import { CellDiffViewModel } from 'vs/workBench/contriB/noteBook/Browser/diff/celllDiffViewModel';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { CellDiffRenderer, NoteBookCellTextDiffListDelegate, NoteBookTextDiffList } from 'vs/workBench/contriB/noteBook/Browser/diff/noteBookTextDiffList';
import { IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { diffDiagonalFill, diffInserted, diffRemoved, editorBackground, focusBorder, foreground } from 'vs/platform/theme/common/colorRegistry';
import { INoteBookEditorWorkerService } from 'vs/workBench/contriB/noteBook/common/services/noteBookWorkerService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { BareFontInfo } from 'vs/editor/common/config/fontInfo';
import { getZoomLevel } from 'vs/Base/Browser/Browser';
import { NoteBookLayoutInfo } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { DIFF_CELL_MARGIN, INoteBookTextDiffEditor } from 'vs/workBench/contriB/noteBook/Browser/diff/common';
import { Emitter } from 'vs/Base/common/event';
import { DisposaBleStore, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { NoteBookDiffEditorEventDispatcher, NoteBookLayoutChangedEvent } from 'vs/workBench/contriB/noteBook/Browser/viewModel/eventDispatcher';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { INoteBookDiffEditorModel } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { FileService } from 'vs/platform/files/common/fileService';
import { IFileService } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';
import { Schemas } from 'vs/Base/common/network';
import { IDiffChange } from 'vs/Base/common/diff/diff';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';

export const IN_NOTEBOOK_TEXT_DIFF_EDITOR = new RawContextKey<Boolean>('isInNoteBookTextDiffEditor', false);

export class NoteBookTextDiffEditor extends EditorPane implements INoteBookTextDiffEditor {
	static readonly ID: string = 'workBench.editor.noteBookTextDiffEditor';

	private _rootElement!: HTMLElement;
	private _overflowContainer!: HTMLElement;
	private _dimension: DOM.Dimension | null = null;
	private _list!: WorkBenchList<CellDiffViewModel>;
	private _fontInfo: BareFontInfo | undefined;

	private readonly _onMouseUp = this._register(new Emitter<{ readonly event: MouseEvent; readonly target: CellDiffViewModel; }>());
	puBlic readonly onMouseUp = this._onMouseUp.event;
	private _eventDispatcher: NoteBookDiffEditorEventDispatcher | undefined;
	protected _scopeContextKeyService!: IContextKeyService;
	private _model: INoteBookDiffEditorModel | null = null;
	private _modifiedResourceDisposaBleStore = new DisposaBleStore();

	get textModel() {
		return this._model?.modified.noteBook;
	}

	constructor(
		@IInstantiationService readonly instantiationService: IInstantiationService,
		@IThemeService readonly themeService: IThemeService,
		@IContextKeyService readonly contextKeyService: IContextKeyService,
		@INoteBookEditorWorkerService readonly noteBookEditorWorkerService: INoteBookEditorWorkerService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IFileService private readonly _fileService: FileService,

		@ITelemetryService telemetryService: ITelemetryService,
		@IStorageService storageService: IStorageService,
	) {
		super(NoteBookTextDiffEditor.ID, telemetryService, themeService, storageService);
		const editorOptions = this.configurationService.getValue<IEditorOptions>('editor');
		this._fontInfo = BareFontInfo.createFromRawSettings(editorOptions, getZoomLevel());

		this._register(this._modifiedResourceDisposaBleStore);
	}

	protected createEditor(parent: HTMLElement): void {
		this._rootElement = DOM.append(parent, DOM.$('.noteBook-text-diff-editor'));
		this._overflowContainer = document.createElement('div');
		this._overflowContainer.classList.add('noteBook-overflow-widget-container', 'monaco-editor');
		DOM.append(parent, this._overflowContainer);

		const renderer = this.instantiationService.createInstance(CellDiffRenderer, this);

		this._list = this.instantiationService.createInstance(
			NoteBookTextDiffList,
			'NoteBookTextDiff',
			this._rootElement,
			this.instantiationService.createInstance(NoteBookCellTextDiffListDelegate),
			[
				renderer
			],
			this.contextKeyService,
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
				// transformOptimization: (isMacintosh && isNative) || getTitleBarStyle(this.configurationService, this.environmentService) === 'native',
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
						return nls.localize('noteBookTreeAriaLaBel', "NoteBook Text Diff");
					}
				},
				// focusNextPreviousDelegate: {
				// 	onFocusNext: (applyFocusNext: () => void) => this._updateForCursorNavigationMode(applyFocusNext),
				// 	onFocusPrevious: (applyFocusPrevious: () => void) => this._updateForCursorNavigationMode(applyFocusPrevious),
				// }
			}
		);

		this._register(this._list.onMouseUp(e => {
			if (e.element) {
				this._onMouseUp.fire({ event: e.BrowserEvent, target: e.element });
			}
		}));
	}

	async setInput(input: NoteBookDiffEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);

		this._model = await input.resolve();
		if (this._model === null) {
			return;
		}

		this._modifiedResourceDisposaBleStore.add(this._fileService.watch(this._model.modified.resource));
		this._modifiedResourceDisposaBleStore.add(this._fileService.onDidFilesChange(async e => {
			if (this._model === null) {
				return;
			}

			if (e.contains(this._model!.modified.resource)) {
				if (this._model.modified.isDirty()) {
					return;
				}

				const modified = this._model.modified;
				const lastResolvedFileStat = modified.lastResolvedFileStat;
				const currFileStat = await this._resolveStats(modified.resource);

				if (lastResolvedFileStat && currFileStat && currFileStat.mtime > lastResolvedFileStat.mtime) {
					await this._model.resolveModifiedFromDisk();
					await this.updateLayout();
					return;
				}
			}

			if (e.contains(this._model!.original.resource)) {
				if (this._model.original.isDirty()) {
					return;
				}

				const original = this._model.original;
				const lastResolvedFileStat = original.lastResolvedFileStat;
				const currFileStat = await this._resolveStats(original.resource);

				if (lastResolvedFileStat && currFileStat && currFileStat.mtime > lastResolvedFileStat.mtime) {
					await this._model.resolveOriginalFromDisk();
					await this.updateLayout();
					return;
				}
			}
		}));


		this._eventDispatcher = new NoteBookDiffEditorEventDispatcher();
		await this.updateLayout();
	}

	private async _resolveStats(resource: URI) {
		if (resource.scheme === Schemas.untitled) {
			return undefined;
		}

		try {
			const newStats = await this._fileService.resolve(resource, { resolveMetadata: true });
			return newStats;
		} catch (e) {
			return undefined;
		}
	}

	async updateLayout() {
		if (!this._model) {
			return;
		}

		const diffResult = await this.noteBookEditorWorkerService.computeDiff(this._model.original.resource, this._model.modified.resource);
		const cellChanges = diffResult.cellsDiff.changes;

		const cellDiffViewModels: CellDiffViewModel[] = [];
		const originalModel = this._model.original.noteBook;
		const modifiedModel = this._model.modified.noteBook;
		let originalCellIndex = 0;
		let modifiedCellIndex = 0;

		for (let i = 0; i < cellChanges.length; i++) {
			const change = cellChanges[i];
			// common cells

			for (let j = 0; j < change.originalStart - originalCellIndex; j++) {
				const originalCell = originalModel.cells[originalCellIndex + j];
				const modifiedCell = modifiedModel.cells[modifiedCellIndex + j];
				if (originalCell.getHashValue() === modifiedCell.getHashValue()) {
					cellDiffViewModels.push(new CellDiffViewModel(
						originalCell,
						modifiedCell,
						'unchanged',
						this._eventDispatcher!
					));
				} else {
					cellDiffViewModels.push(new CellDiffViewModel(
						originalCell,
						modifiedCell,
						'modified',
						this._eventDispatcher!
					));
				}
			}

			cellDiffViewModels.push(...this._computeModifiedLCS(change, originalModel, modifiedModel));
			originalCellIndex = change.originalStart + change.originalLength;
			modifiedCellIndex = change.modifiedStart + change.modifiedLength;
		}

		for (let i = originalCellIndex; i < originalModel.cells.length; i++) {
			cellDiffViewModels.push(new CellDiffViewModel(
				originalModel.cells[i],
				modifiedModel.cells[i - originalCellIndex + modifiedCellIndex],
				'unchanged',
				this._eventDispatcher!
			));
		}

		this._list.splice(0, this._list.length, cellDiffViewModels);
	}

	private _computeModifiedLCS(change: IDiffChange, originalModel: NoteBookTextModel, modifiedModel: NoteBookTextModel) {
		const result: CellDiffViewModel[] = [];
		// modified cells
		const modifiedLen = Math.min(change.originalLength, change.modifiedLength);

		for (let j = 0; j < modifiedLen; j++) {
			result.push(new CellDiffViewModel(
				originalModel.cells[change.originalStart + j],
				modifiedModel.cells[change.modifiedStart + j],
				'modified',
				this._eventDispatcher!
			));
		}

		for (let j = modifiedLen; j < change.originalLength; j++) {
			// deletion
			result.push(new CellDiffViewModel(
				originalModel.cells[change.originalStart + j],
				undefined,
				'delete',
				this._eventDispatcher!
			));
		}

		for (let j = modifiedLen; j < change.modifiedLength; j++) {
			// insertion
			result.push(new CellDiffViewModel(
				undefined,
				modifiedModel.cells[change.modifiedStart + j],
				'insert',
				this._eventDispatcher!
			));
		}

		return result;
	}

	private pendingLayouts = new WeakMap<CellDiffViewModel, IDisposaBle>();


	layoutNoteBookCell(cell: CellDiffViewModel, height: numBer) {
		const relayout = (cell: CellDiffViewModel, height: numBer) => {
			const viewIndex = this._list!.indexOf(cell);

			this._list?.updateElementHeight(viewIndex, height);
		};

		if (this.pendingLayouts.has(cell)) {
			this.pendingLayouts.get(cell)!.dispose();
		}

		let r: () => void;
		const layoutDisposaBle = DOM.scheduleAtNextAnimationFrame(() => {
			this.pendingLayouts.delete(cell);

			relayout(cell, height);
			r();
		});

		this.pendingLayouts.set(cell, toDisposaBle(() => {
			layoutDisposaBle.dispose();
			r();
		}));

		return new Promise<void>(resolve => { r = resolve; });
	}

	getDomNode() {
		return this._rootElement;
	}

	getOverflowContainerDomNode(): HTMLElement {
		return this._overflowContainer;
	}

	getControl(): NoteBookEditorWidget | undefined {
		return undefined;
	}

	setEditorVisiBle(visiBle: Boolean, group: IEditorGroup | undefined): void {
		super.setEditorVisiBle(visiBle, group);
	}

	focus() {
		super.focus();
	}

	clearInput(): void {
		super.clearInput();

		this._modifiedResourceDisposaBleStore.clear();
		this._list?.splice(0, this._list?.length || 0);
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

	layout(dimension: DOM.Dimension): void {
		this._rootElement.classList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
		this._rootElement.classList.toggle('narrow-width', dimension.width < 600);
		this._dimension = dimension;
		this._rootElement.style.height = `${dimension.height}px`;

		this._list?.layout(this._dimension.height, this._dimension.width);
		this._eventDispatcher?.emit([new NoteBookLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo())]);
	}
}

registerThemingParticipant((theme, collector) => {
	const cellBorderColor = theme.getColor(noteBookCellBorder);
	if (cellBorderColor) {
		collector.addRule(`.noteBook-text-diff-editor .cell-Body { Border: 1px solid ${cellBorderColor};}`);
		collector.addRule(`.noteBook-text-diff-editor .cell-diff-editor-container .output-header-container,
		.noteBook-text-diff-editor .cell-diff-editor-container .metadata-header-container {
			Border-top: 1px solid ${cellBorderColor};
		}`);
	}

	const diffDiagonalFillColor = theme.getColor(diffDiagonalFill);
	collector.addRule(`
	.noteBook-text-diff-editor .diagonal-fill {
		Background-image: linear-gradient(
			-45deg,
			${diffDiagonalFillColor} 12.5%,
			#0000 12.5%, #0000 50%,
			${diffDiagonalFillColor} 50%, ${diffDiagonalFillColor} 62.5%,
			#0000 62.5%, #0000 100%
		);
		Background-size: 8px 8px;
	}
	`);

	const added = theme.getColor(diffInserted);
	if (added) {
		collector.addRule(`
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .source-container { Background-color: ${added}; }
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .source-container .monaco-editor .margin,
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .source-container .monaco-editor .monaco-editor-Background {
					Background-color: ${added};
			}
		`
		);
		collector.addRule(`
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .metadata-editor-container { Background-color: ${added}; }
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .metadata-editor-container .monaco-editor .margin,
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .metadata-editor-container .monaco-editor .monaco-editor-Background {
					Background-color: ${added};
			}
		`
		);
		collector.addRule(`
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .output-editor-container { Background-color: ${added}; }
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .output-editor-container .monaco-editor .margin,
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .output-editor-container .monaco-editor .monaco-editor-Background {
					Background-color: ${added};
			}
		`
		);
		collector.addRule(`
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .metadata-header-container { Background-color: ${added}; }
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.inserted .output-header-container { Background-color: ${added}; }
		`
		);
	}
	const removed = theme.getColor(diffRemoved);
	if (added) {
		collector.addRule(`
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .source-container { Background-color: ${removed}; }
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .source-container .monaco-editor .margin,
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .source-container .monaco-editor .monaco-editor-Background {
					Background-color: ${removed};
			}
		`
		);
		collector.addRule(`
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .metadata-editor-container { Background-color: ${removed}; }
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .metadata-editor-container .monaco-editor .margin,
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .metadata-editor-container .monaco-editor .monaco-editor-Background {
					Background-color: ${removed};
			}
		`
		);
		collector.addRule(`
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .output-editor-container { Background-color: ${removed}; }
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .output-editor-container .monaco-editor .margin,
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .output-editor-container .monaco-editor .monaco-editor-Background {
					Background-color: ${removed};
			}
		`
		);
		collector.addRule(`
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .metadata-header-container { Background-color: ${removed}; }
			.noteBook-text-diff-editor .cell-Body .cell-diff-editor-container.removed .output-header-container { Background-color: ${removed}; }
		`
		);
	}

	// const changed = theme.getColor(editorGutterModifiedBackground);

	// if (changed) {
	// 	collector.addRule(`
	// 		.noteBook-text-diff-editor .cell-diff-editor-container .metadata-header-container.modified {
	// 			Background-color: ${changed};
	// 		}
	// 	`);
	// }

	collector.addRule(`.noteBook-text-diff-editor .cell-Body { margin: ${DIFF_CELL_MARGIN}px; }`);
});
