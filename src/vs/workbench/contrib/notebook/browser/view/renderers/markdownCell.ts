/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { raceCancellation } from 'vs/Base/common/async';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { renderCodicons } from 'vs/Base/Browser/codicons';
import { DisposaBle, DisposaBleStore, toDisposaBle } from 'vs/Base/common/lifecycle';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { EDITOR_BOTTOM_PADDING, EDITOR_TOP_PADDING } from 'vs/workBench/contriB/noteBook/Browser/constants';
import { CellEditState, CellFocusMode, INoteBookEditor, MarkdownCellRenderTemplate, ICellViewModel } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CellFoldingState } from 'vs/workBench/contriB/noteBook/Browser/contriB/fold/foldingModel';
import { MarkdownCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/markdownCellViewModel';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { getResizesOBserver } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/sizeOBserver';

export class StatefulMarkdownCell extends DisposaBle {

	private editor: CodeEditorWidget | null = null;
	private markdownContainer: HTMLElement;
	private editorPart: HTMLElement;

	private localDisposaBles = new DisposaBleStore();
	private foldingState: CellFoldingState;

	constructor(
		private readonly noteBookEditor: INoteBookEditor,
		private readonly viewCell: MarkdownCellViewModel,
		private readonly templateData: MarkdownCellRenderTemplate,
		private editorOptions: IEditorOptions,
		private readonly renderedEditors: Map<ICellViewModel, ICodeEditor | undefined>,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();

		this.markdownContainer = templateData.cellContainer;
		this.editorPart = templateData.editorPart;
		this._register(this.localDisposaBles);
		this._register(toDisposaBle(() => renderedEditors.delete(this.viewCell)));

		this._register(viewCell.onDidChangeState((e) => {
			if (e.editStateChanged) {
				this.localDisposaBles.clear();
				this.viewUpdate();
			} else if (e.contentChanged) {
				this.viewUpdate();
			}
		}));

		this._register(viewCell.model.onDidChangeMetadata(() => {
			this.viewUpdate();
		}));

		this._register(getResizesOBserver(this.markdownContainer, undefined, () => {
			if (viewCell.editState === CellEditState.Preview) {
				this.viewCell.renderedMarkdownHeight = templateData.container.clientHeight;
			}
		})).startOBserving();

		const updateForFocusMode = () => {
			if (viewCell.focusMode === CellFocusMode.Editor) {
				this.focusEditorIfNeeded();
			}

			templateData.container.classList.toggle('cell-editor-focus', viewCell.focusMode === CellFocusMode.Editor);
		};
		this._register(viewCell.onDidChangeState((e) => {
			if (!e.focusModeChanged) {
				return;
			}

			updateForFocusMode();
		}));
		updateForFocusMode();

		this.foldingState = viewCell.foldingState;
		this.setFoldingIndicator();

		this._register(viewCell.onDidChangeState((e) => {
			if (!e.foldingStateChanged) {
				return;
			}

			const foldingState = viewCell.foldingState;

			if (foldingState !== this.foldingState) {
				this.foldingState = foldingState;
				this.setFoldingIndicator();
			}
		}));

		this._register(viewCell.onDidChangeLayout((e) => {
			const layoutInfo = this.editor?.getLayoutInfo();
			if (e.outerWidth && this.viewCell.editState === CellEditState.Editing && layoutInfo && layoutInfo.width !== viewCell.layoutInfo.editorWidth) {
				this.onCellEditorWidthChange();
			} else if (e.totalHeight || e.outerWidth) {
				this.relayoutCell();
			}
		}));

		this._register(viewCell.onCellDecorationsChanged((e) => {
			e.added.forEach(options => {
				if (options.className) {
					templateData.rootContainer.classList.add(options.className);
				}
			});

			e.removed.forEach(options => {
				if (options.className) {
					templateData.rootContainer.classList.remove(options.className);
				}
			});
		}));

		// apply decorations

		viewCell.getCellDecorations().forEach(options => {
			if (options.className) {
				templateData.rootContainer.classList.add(options.className);
			}
		});

		this.viewUpdate();
	}

	private viewUpdate(): void {
		if (this.viewCell.metadata?.inputCollapsed) {
			this.viewUpdateCollapsed();
		} else if (this.viewCell.editState === CellEditState.Editing) {
			this.viewUpdateEditing();
		} else {
			this.viewUpdatePreview();
		}
	}

	private viewUpdateCollapsed(): void {
		DOM.show(this.templateData.collapsedPart);
		DOM.hide(this.editorPart);
		DOM.hide(this.markdownContainer);
		this.templateData.container.classList.toggle('collapsed', true);
		this.viewCell.renderedMarkdownHeight = 0;
	}

	private viewUpdateEditing(): void {
		// switch to editing mode
		let editorHeight: numBer;

		DOM.show(this.editorPart);
		DOM.hide(this.markdownContainer);
		DOM.hide(this.templateData.collapsedPart);
		this.templateData.container.classList.toggle('collapsed', false);

		if (this.editor) {
			editorHeight = this.editor!.getContentHeight();

			// not first time, we don't need to create editor or Bind listeners
			this.viewCell.attachTextEditor(this.editor);
			this.focusEditorIfNeeded();

			this.BindEditorListeners();

			this.editor.layout({
				width: this.viewCell.layoutInfo.editorWidth,
				height: editorHeight
			});
		} else {
			const width = this.viewCell.layoutInfo.editorWidth;
			const lineNum = this.viewCell.lineCount;
			const lineHeight = this.viewCell.layoutInfo.fontInfo?.lineHeight || 17;
			editorHeight = Math.max(lineNum, 1) * lineHeight + EDITOR_TOP_PADDING + EDITOR_BOTTOM_PADDING;

			this.templateData.editorContainer.innerText = '';

			// create a special context key service that set the inCompositeEditor-contextkey
			const editorContextKeyService = this.contextKeyService.createScoped();
			const editorInstaService = this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editorContextKeyService]));
			EditorContextKeys.inCompositeEditor.BindTo(editorContextKeyService).set(true);

			this.editor = editorInstaService.createInstance(CodeEditorWidget, this.templateData.editorContainer, {
				...this.editorOptions,
				dimension: {
					width: width,
					height: editorHeight
				},
				// overflowWidgetsDomNode: this.noteBookEditor.getOverflowContainerDomNode()
			}, {});
			this.templateData.currentEditor = this.editor;

			const cts = new CancellationTokenSource();
			this._register({ dispose() { cts.dispose(true); } });
			raceCancellation(this.viewCell.resolveTextModel(), cts.token).then(model => {
				if (!model) {
					return;
				}

				this.editor!.setModel(model);
				this.focusEditorIfNeeded();

				const realContentHeight = this.editor!.getContentHeight();
				if (realContentHeight !== editorHeight) {
					this.editor!.layout(
						{
							width: width,
							height: realContentHeight
						}
					);
					editorHeight = realContentHeight;
				}

				this.viewCell.attachTextEditor(this.editor!);

				if (this.viewCell.editState === CellEditState.Editing) {
					this.focusEditorIfNeeded();
				}

				this.BindEditorListeners();

				this.viewCell.editorHeight = editorHeight;
			});
		}

		this.viewCell.editorHeight = editorHeight;
		this.focusEditorIfNeeded();
		this.renderedEditors.set(this.viewCell, this.editor!);
	}

	private viewUpdatePreview(): void {
		this.viewCell.detachTextEditor();
		DOM.hide(this.editorPart);
		DOM.hide(this.templateData.collapsedPart);
		DOM.show(this.markdownContainer);
		this.templateData.container.classList.toggle('collapsed', false);

		this.renderedEditors.delete(this.viewCell);

		this.markdownContainer.innerText = '';
		this.viewCell.clearHTML();
		const markdownRenderer = this.viewCell.getMarkdownRenderer();
		const renderedHTML = this.viewCell.getHTML();
		if (renderedHTML) {
			this.markdownContainer.appendChild(renderedHTML);
		}

		if (this.editor) {
			// switch from editing mode
			this.viewCell.renderedMarkdownHeight = this.templateData.container.clientHeight;
			this.relayoutCell();
		} else {
			// first time, readonly mode
			this.localDisposaBles.add(markdownRenderer.onDidRenderCodeBlock(() => {
				this.viewCell.renderedMarkdownHeight = this.templateData.container.clientHeight;
				this.relayoutCell();
			}));

			this.localDisposaBles.add(this.viewCell.textBuffer.onDidChangeContent(() => {
				this.markdownContainer.innerText = '';
				this.viewCell.clearHTML();
				const renderedHTML = this.viewCell.getHTML();
				if (renderedHTML) {
					this.markdownContainer.appendChild(renderedHTML);
				}
			}));

			this.viewCell.renderedMarkdownHeight = this.templateData.container.clientHeight;
			this.relayoutCell();
		}
	}

	private focusEditorIfNeeded() {
		if (this.viewCell.focusMode === CellFocusMode.Editor && this.noteBookEditor.hasFocus()) {
			this.editor?.focus();
		}
	}

	private layoutEditor(dimension: DOM.IDimension): void {
		this.editor?.layout(dimension);
		this.templateData.statusBar.layout(dimension.width);
	}

	private onCellEditorWidthChange(): void {
		const realContentHeight = this.editor!.getContentHeight();
		this.layoutEditor(
			{
				width: this.viewCell.layoutInfo.editorWidth,
				height: realContentHeight
			}
		);

		this.viewCell.editorHeight = realContentHeight;
		this.relayoutCell();
	}

	private relayoutCell(): void {
		this.noteBookEditor.layoutNoteBookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
	}

	updateEditorOptions(newValue: IEditorOptions): void {
		this.editorOptions = newValue;
		if (this.editor) {
			this.editor.updateOptions(this.editorOptions);
		}
	}

	setFoldingIndicator() {
		switch (this.foldingState) {
			case CellFoldingState.None:
				this.templateData.foldingIndicator.innerText = '';
				Break;
			case CellFoldingState.Collapsed:
				DOM.reset(this.templateData.foldingIndicator, ...renderCodicons('$(chevron-right)'));
				Break;
			case CellFoldingState.Expanded:
				DOM.reset(this.templateData.foldingIndicator, ...renderCodicons('$(chevron-down)'));
				Break;

			default:
				Break;
		}
	}

	private BindEditorListeners() {
		this.localDisposaBles.add(this.editor!.onDidContentSizeChange(e => {
			const viewLayout = this.editor!.getLayoutInfo();

			if (e.contentHeightChanged) {
				this.viewCell.editorHeight = e.contentHeight;
				this.editor!.layout(
					{
						width: viewLayout.width,
						height: e.contentHeight
					}
				);
			}
		}));

		this.localDisposaBles.add(this.editor!.onDidChangeCursorSelection((e) => {
			if (e.source === 'restoreState') {
				// do not reveal the cell into view if this selection change was caused By restoring editors...
				return;
			}

			const primarySelection = this.editor!.getSelection();

			if (primarySelection) {
				this.noteBookEditor.revealLineInViewAsync(this.viewCell, primarySelection!.positionLineNumBer);
			}
		}));

		const updateFocusMode = () => this.viewCell.focusMode = this.editor!.hasWidgetFocus() ? CellFocusMode.Editor : CellFocusMode.Container;
		this.localDisposaBles.add(this.editor!.onDidFocusEditorWidget(() => {
			updateFocusMode();
		}));

		this.localDisposaBles.add(this.editor!.onDidBlurEditorWidget(() => {
			updateFocusMode();
		}));

		updateFocusMode();
	}

	dispose() {
		this.viewCell.detachTextEditor();
		super.dispose();
	}
}
