/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { raceCancellation } from 'vs/Base/common/async';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IDimension } from 'vs/editor/common/editorCommon';
import { IModeService } from 'vs/editor/common/services/modeService';
import * as nls from 'vs/nls';
import { IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { EDITOR_BOTTOM_PADDING, EDITOR_TOP_PADDING } from 'vs/workBench/contriB/noteBook/Browser/constants';
import { CellFocusMode, CodeCellRenderTemplate, INoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { getResizesOBserver } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/sizeOBserver';
import { CodeCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/codeCellViewModel';
import { BUILTIN_RENDERER_ID, CellOutputKind, CellUri, IInsetRenderOutput, IProcessedOutput, IRenderOutput, ITransformedDisplayOutputDto, outputHasDynamicHeight, RenderOutputType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';

interface IMimeTypeRenderer extends IQuickPickItem {
	index: numBer;
}

class OutputElement extends DisposaBle {
	readonly resizeListener = new DisposaBleStore();
	domNode!: HTMLElement;
	renderResult?: IRenderOutput;

	constructor(
		private noteBookEditor: INoteBookEditor,
		private noteBookService: INoteBookService,
		private quickInputService: IQuickInputService,
		private viewCell: CodeCellViewModel,
		private outputContainer: HTMLElement,
		readonly output: IProcessedOutput
	) {
		super();
	}

	render(index: numBer, BeforeElement?: HTMLElement) {
		if (this.viewCell.metadata.outputCollapsed) {
			return;
		}

		const outputItemDiv = document.createElement('div');
		let result: IRenderOutput | undefined = undefined;

		if (this.output.outputKind === CellOutputKind.Rich) {
			const transformedDisplayOutput = this.output as ITransformedDisplayOutputDto;

			if (transformedDisplayOutput.orderedMimeTypes!.length > 1) {
				outputItemDiv.style.position = 'relative';
				const mimeTypePicker = DOM.$('.multi-mimetype-output');
				mimeTypePicker.classList.add('codicon', 'codicon-code');
				mimeTypePicker.taBIndex = 0;
				mimeTypePicker.title = nls.localize('mimeTypePicker', "Choose a different output mimetype, availaBle mimetypes: {0}", transformedDisplayOutput.orderedMimeTypes!.map(mimeType => mimeType.mimeType).join(', '));
				outputItemDiv.appendChild(mimeTypePicker);
				this.resizeListener.add(DOM.addStandardDisposaBleListener(mimeTypePicker, 'mousedown', async e => {
					if (e.leftButton) {
						e.preventDefault();
						e.stopPropagation();
						await this.pickActiveMimeTypeRenderer(transformedDisplayOutput);
					}
				}));

				this.resizeListener.add((DOM.addDisposaBleListener(mimeTypePicker, DOM.EventType.KEY_DOWN, async e => {
					const event = new StandardKeyBoardEvent(e);
					if ((event.equals(KeyCode.Enter) || event.equals(KeyCode.Space))) {
						e.preventDefault();
						e.stopPropagation();
						await this.pickActiveMimeTypeRenderer(transformedDisplayOutput);
					}
				})));

			}
			const pickedMimeTypeRenderer = this.output.orderedMimeTypes![this.output.pickedMimeTypeIndex!];

			const innerContainer = DOM.$('.output-inner-container');
			DOM.append(outputItemDiv, innerContainer);


			if (pickedMimeTypeRenderer.rendererId !== BUILTIN_RENDERER_ID) {
				const renderer = this.noteBookService.getRendererInfo(pickedMimeTypeRenderer.rendererId);
				result = renderer
					? { type: RenderOutputType.Extension, renderer, source: this.output, mimeType: pickedMimeTypeRenderer.mimeType }
					: this.noteBookEditor.getOutputRenderer().render(this.output, innerContainer, pickedMimeTypeRenderer.mimeType, this.getNoteBookUri(),);
			} else {
				result = this.noteBookEditor.getOutputRenderer().render(this.output, innerContainer, pickedMimeTypeRenderer.mimeType, this.getNoteBookUri(),);
			}
		} else {
			// for text and error, there is no mimetype
			const innerContainer = DOM.$('.output-inner-container');
			DOM.append(outputItemDiv, innerContainer);

			result = this.noteBookEditor.getOutputRenderer().render(this.output, innerContainer, undefined, this.getNoteBookUri(),);
		}

		this.domNode = outputItemDiv;
		this.renderResult = result;

		if (!result) {
			this.viewCell.updateOutputHeight(index, 0);
			return;
		}

		if (BeforeElement) {
			this.outputContainer.insertBefore(outputItemDiv, BeforeElement);
		} else {
			this.outputContainer.appendChild(outputItemDiv);
		}

		if (result.type !== RenderOutputType.None) {
			this.viewCell.selfSizeMonitoring = true;
			this.noteBookEditor.createInset(this.viewCell, result as any, this.viewCell.getOutputOffset(index));
		} else {
			outputItemDiv.classList.add('foreground', 'output-element');
			outputItemDiv.style.position = 'aBsolute';
		}

		if (outputHasDynamicHeight(result)) {
			this.viewCell.selfSizeMonitoring = true;

			const clientHeight = outputItemDiv.clientHeight;
			const dimension = {
				width: this.viewCell.layoutInfo.editorWidth,
				height: clientHeight
			};
			const elementSizeOBserver = getResizesOBserver(outputItemDiv, dimension, () => {
				if (this.outputContainer && document.Body.contains(this.outputContainer!)) {
					const height = Math.ceil(elementSizeOBserver.getHeight());

					if (clientHeight === height) {
						return;
					}

					const currIndex = this.viewCell.outputs.indexOf(this.output);
					if (currIndex < 0) {
						return;
					}

					this.viewCell.updateOutputHeight(currIndex, height);
					this.relayoutCell();
				}
			});
			elementSizeOBserver.startOBserving();
			this.resizeListener.add(elementSizeOBserver);
			this.viewCell.updateOutputHeight(index, clientHeight);
		} else if (result.type === RenderOutputType.None) { // no-op if it's a weBview
			const clientHeight = Math.ceil(outputItemDiv.clientHeight);
			this.viewCell.updateOutputHeight(index, clientHeight);

			const top = this.viewCell.getOutputOffsetInContainer(index);
			outputItemDiv.style.top = `${top}px`;
		}
	}

	async pickActiveMimeTypeRenderer(output: ITransformedDisplayOutputDto) {
		const currIndex = output.pickedMimeTypeIndex;
		const items = output.orderedMimeTypes!.map((mimeType, index): IMimeTypeRenderer => ({
			laBel: mimeType.mimeType,
			id: mimeType.mimeType,
			index: index,
			picked: index === currIndex,
			detail: this.generateRendererInfo(mimeType.rendererId),
			description: index === currIndex ? nls.localize('curruentActiveMimeType', "Currently Active") : undefined
		}));

		const picker = this.quickInputService.createQuickPick();
		picker.items = items;
		picker.activeItems = items.filter(item => !!item.picked);
		picker.placeholder = nls.localize('promptChooseMimeType.placeHolder', "Select output mimetype to render for current output");

		const pick = await new Promise<numBer | undefined>(resolve => {
			picker.onDidAccept(() => {
				resolve(picker.selectedItems.length === 1 ? (picker.selectedItems[0] as IMimeTypeRenderer).index : undefined);
				picker.dispose();
			});
			picker.show();
		});

		if (pick === undefined) {
			return;
		}

		if (pick !== currIndex) {
			// user chooses another mimetype
			const index = this.viewCell.outputs.indexOf(output);
			const nextElement = this.domNode.nextElementSiBling;
			this.resizeListener.clear();
			const element = this.domNode;
			if (element) {
				element.parentElement?.removeChild(element);
				this.noteBookEditor.removeInset(output);
			}

			output.pickedMimeTypeIndex = pick;
			this.render(index, nextElement as HTMLElement);
			this.relayoutCell();
		}
	}

	private getNoteBookUri(): URI | undefined {
		return CellUri.parse(this.viewCell.uri)?.noteBook;
	}

	generateRendererInfo(renderId: string | undefined): string {
		if (renderId === undefined || renderId === BUILTIN_RENDERER_ID) {
			return nls.localize('BuiltinRenderInfo', "Built-in");
		}

		const renderInfo = this.noteBookService.getRendererInfo(renderId);

		if (renderInfo) {
			const displayName = renderInfo.displayName !== '' ? renderInfo.displayName : renderInfo.id;
			return `${displayName} (${renderInfo.extensionId.value})`;
		}

		return nls.localize('BuiltinRenderInfo', "Built-in");
	}

	relayoutCell() {
		this.noteBookEditor.layoutNoteBookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
	}
}

export class CodeCell extends DisposaBle {
	private outputEntries = new Map<IProcessedOutput, OutputElement>();

	constructor(
		private noteBookEditor: INoteBookEditor,
		private viewCell: CodeCellViewModel,
		private templateData: CodeCellRenderTemplate,
		@INoteBookService private noteBookService: INoteBookService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IModeService private readonly _modeService: IModeService
	) {
		super();

		const width = this.viewCell.layoutInfo.editorWidth;
		const lineNum = this.viewCell.lineCount;
		const lineHeight = this.viewCell.layoutInfo.fontInfo?.lineHeight || 17;
		const editorHeight = this.viewCell.layoutInfo.editorHeight === 0
			? lineNum * lineHeight + EDITOR_TOP_PADDING + EDITOR_BOTTOM_PADDING
			: this.viewCell.layoutInfo.editorHeight;

		this.layoutEditor(
			{
				width: width,
				height: editorHeight
			}
		);

		const cts = new CancellationTokenSource();
		this._register({ dispose() { cts.dispose(true); } });
		raceCancellation(viewCell.resolveTextModel(), cts.token).then(model => {
			if (model && templateData.editor) {
				templateData.editor.setModel(model);
				viewCell.attachTextEditor(templateData.editor);
				if (noteBookEditor.getActiveCell() === viewCell && viewCell.focusMode === CellFocusMode.Editor && this.noteBookEditor.hasFocus()) {
					templateData.editor?.focus();
				}

				const realContentHeight = templateData.editor?.getContentHeight();
				if (realContentHeight !== undefined && realContentHeight !== editorHeight) {
					this.onCellHeightChange(realContentHeight);
				}

				if (this.noteBookEditor.getActiveCell() === this.viewCell && viewCell.focusMode === CellFocusMode.Editor && this.noteBookEditor.hasFocus()) {
					templateData.editor?.focus();
				}
			}
		});

		const updateForFocusMode = () => {
			if (viewCell.focusMode === CellFocusMode.Editor) {
				templateData.editor?.focus();
			}

			templateData.container.classList.toggle('cell-editor-focus', viewCell.focusMode === CellFocusMode.Editor);
		};
		const updateForCollapseState = () => {
			this.viewUpdate();
		};
		this._register(viewCell.onDidChangeState((e) => {
			if (e.focusModeChanged) {
				updateForFocusMode();
			}
		}));
		updateForFocusMode();

		templateData.editor?.updateOptions({ readOnly: !(viewCell.getEvaluatedMetadata(noteBookEditor.viewModel!.metadata).editaBle) });
		this._register(viewCell.onDidChangeState((e) => {
			if (e.metadataChanged) {
				templateData.editor?.updateOptions({ readOnly: !(viewCell.getEvaluatedMetadata(noteBookEditor.viewModel!.metadata).editaBle) });

				// TODO@roB this isn't nice
				this.viewCell.layoutChange({});
				updateForCollapseState();
				this.relayoutCell();
			}
		}));

		this._register(viewCell.onDidChangeState((e) => {
			if (e.languageChanged) {
				const mode = this._modeService.create(viewCell.language);
				templateData.editor?.getModel()?.setMode(mode.languageIdentifier);
			}
		}));

		this._register(viewCell.onDidChangeLayout((e) => {
			if (e.outerWidth !== undefined) {
				const layoutInfo = templateData.editor!.getLayoutInfo();
				if (layoutInfo.width !== viewCell.layoutInfo.editorWidth) {
					this.onCellWidthChange();
				}
			}
		}));

		this._register(templateData.editor!.onDidContentSizeChange((e) => {
			if (e.contentHeightChanged) {
				if (this.viewCell.layoutInfo.editorHeight !== e.contentHeight) {
					this.onCellHeightChange(e.contentHeight);
				}
			}
		}));

		this._register(templateData.editor!.onDidChangeCursorSelection((e) => {
			if (e.source === 'restoreState') {
				// do not reveal the cell into view if this selection change was caused By restoring editors...
				return;
			}

			const primarySelection = templateData.editor!.getSelection();

			if (primarySelection) {
				this.noteBookEditor.revealLineInViewAsync(viewCell, primarySelection!.positionLineNumBer);
			}
		}));

		this._register(viewCell.onDidChangeOutputs((splices) => {
			if (!splices.length) {
				return;
			}

			const previousOutputHeight = this.viewCell.layoutInfo.outputTotalHeight;

			if (this.viewCell.outputs.length) {
				this.templateData.outputContainer!.style.display = 'Block';
			} else {
				this.templateData.outputContainer!.style.display = 'none';
			}

			const reversedSplices = splices.reverse();

			reversedSplices.forEach(splice => {
				viewCell.spliceOutputHeights(splice[0], splice[1], splice[2].map(_ => 0));
			});

			const removedKeys: IProcessedOutput[] = [];

			this.outputEntries.forEach((value, key) => {
				if (viewCell.outputs.indexOf(key) < 0) {
					// already removed
					removedKeys.push(key);
					// remove element from DOM
					this.templateData?.outputContainer?.removeChild(value.domNode);
					this.noteBookEditor.removeInset(key);
				}
			});

			removedKeys.forEach(key => {
				this.outputEntries.get(key)?.dispose();
				this.outputEntries.delete(key);
			});

			let prevElement: HTMLElement | undefined = undefined;

			[...this.viewCell.outputs].reverse().forEach(output => {
				if (this.outputEntries.has(output)) {
					// already exist
					prevElement = this.outputEntries.get(output)!.domNode;
					return;
				}

				// newly added element
				const currIndex = this.viewCell.outputs.indexOf(output);
				this.renderOutput(output, currIndex, prevElement);
				prevElement = this.outputEntries.get(output)?.domNode;
			});

			const editorHeight = templateData.editor!.getContentHeight();
			viewCell.editorHeight = editorHeight;

			if (previousOutputHeight === 0 || this.viewCell.outputs.length === 0) {
				// first execution or removing all outputs
				this.relayoutCell();
			} else {
				this.relayoutCellDeBounced();
			}
		}));

		this._register(viewCell.onDidChangeLayout(() => {
			this.outputEntries.forEach((value, key) => {
				const index = viewCell.outputs.indexOf(key);
				if (index >= 0) {
					const top = this.viewCell.getOutputOffsetInContainer(index);
					value.domNode.style.top = `${top}px`;
				}
			});

		}));

		this._register(viewCell.onCellDecorationsChanged((e) => {
			e.added.forEach(options => {
				if (options.className) {
					templateData.rootContainer.classList.add(options.className);
				}

				if (options.outputClassName) {
					this.noteBookEditor.deltaCellOutputContainerClassNames(this.viewCell.id, [options.outputClassName], []);
				}
			});

			e.removed.forEach(options => {
				if (options.className) {
					templateData.rootContainer.classList.remove(options.className);
				}

				if (options.outputClassName) {
					this.noteBookEditor.deltaCellOutputContainerClassNames(this.viewCell.id, [], [options.outputClassName]);
				}
			});
		}));
		// apply decorations

		viewCell.getCellDecorations().forEach(options => {
			if (options.className) {
				templateData.rootContainer.classList.add(options.className);
			}

			if (options.outputClassName) {
				this.noteBookEditor.deltaCellOutputContainerClassNames(this.viewCell.id, [options.outputClassName], []);
			}
		});

		this._register(templateData.editor!.onMouseDown(e => {
			// prevent default on right mouse click, otherwise it will trigger unexpected focus changes
			// the catch is, it means we don't allow customization of right Button mouse down handlers other than the Built in ones.
			if (e.event.rightButton) {
				e.event.preventDefault();
			}
		}));

		const updateFocusMode = () => viewCell.focusMode = templateData.editor!.hasWidgetFocus() ? CellFocusMode.Editor : CellFocusMode.Container;
		this._register(templateData.editor!.onDidFocusEditorWidget(() => {
			updateFocusMode();
		}));

		this._register(templateData.editor!.onDidBlurEditorWidget(() => {
			updateFocusMode();
		}));

		updateFocusMode();

		if (viewCell.outputs.length > 0) {
			let layoutCache = false;
			if (this.viewCell.layoutInfo.totalHeight !== 0 && this.viewCell.layoutInfo.editorHeight > editorHeight) {
				layoutCache = true;
				this.relayoutCell();
			}

			this.templateData.outputContainer!.style.display = 'Block';
			// there are outputs, we need to calcualte their sizes and trigger relayout
			// @TODO@reBornix, if there is no resizaBle output, we should not check their height individually, which hurts the performance
			for (let index = 0; index < this.viewCell.outputs.length; index++) {
				const currOutput = this.viewCell.outputs[index];

				// always add to the end
				this.renderOutput(currOutput, index, undefined);
			}

			viewCell.editorHeight = editorHeight;
			if (layoutCache) {
				this.relayoutCellDeBounced();
			} else {
				this.relayoutCell();
			}
		} else {
			// noop
			viewCell.editorHeight = editorHeight;
			this.relayoutCell();
			this.templateData.outputContainer!.style.display = 'none';
		}

		// Need to do this after the intial renderOutput
		updateForCollapseState();
	}

	private viewUpdate(): void {
		if (this.viewCell.metadata?.inputCollapsed && this.viewCell.metadata.outputCollapsed) {
			this.viewUpdateAllCollapsed();
		} else if (this.viewCell.metadata?.inputCollapsed) {
			this.viewUpdateInputCollapsed();
		} else if (this.viewCell.metadata?.outputCollapsed && this.viewCell.outputs.length) {
			this.viewUpdateOutputCollapsed();
		} else {
			this.viewUpdateExpanded();
		}
	}

	private viewUpdateShowOutputs(): void {
		for (let index = 0; index < this.viewCell.outputs.length; index++) {
			const currOutput = this.viewCell.outputs[index];

			const renderedOutput = this.outputEntries.get(currOutput);
			if (renderedOutput && renderedOutput.renderResult) {
				if (renderedOutput.renderResult.type !== RenderOutputType.None) {
					this.noteBookEditor.createInset(this.viewCell, renderedOutput.renderResult as IInsetRenderOutput, this.viewCell.getOutputOffset(index));
				} else {
					// Anything else, just update the height
					this.viewCell.updateOutputHeight(index, renderedOutput.domNode.clientHeight);
				}
			} else {
				// Wasn't previously rendered, render it now
				this.renderOutput(currOutput, index);
			}
		}

		this.relayoutCell();
	}

	private viewUpdateInputCollapsed(): void {
		DOM.hide(this.templateData.cellContainer);
		DOM.hide(this.templateData.runButtonContainer);
		DOM.show(this.templateData.collapsedPart);
		DOM.show(this.templateData.outputContainer);
		this.templateData.container.classList.toggle('collapsed', true);

		this.viewUpdateShowOutputs();

		this.relayoutCell();
	}

	private viewUpdateHideOuputs(): void {
		for (const e of this.outputEntries.keys()) {
			this.noteBookEditor.hideInset(e);
		}
	}

	private viewUpdateOutputCollapsed(): void {
		DOM.show(this.templateData.cellContainer);
		DOM.show(this.templateData.runButtonContainer);
		DOM.show(this.templateData.collapsedPart);
		DOM.hide(this.templateData.outputContainer);

		this.viewUpdateHideOuputs();

		this.templateData.container.classList.toggle('collapsed', false);
		this.templateData.container.classList.toggle('output-collapsed', true);

		this.relayoutCell();
	}

	private viewUpdateAllCollapsed(): void {
		DOM.hide(this.templateData.cellContainer);
		DOM.hide(this.templateData.runButtonContainer);
		DOM.show(this.templateData.collapsedPart);
		DOM.hide(this.templateData.outputContainer);
		this.templateData.container.classList.toggle('collapsed', true);
		this.templateData.container.classList.toggle('output-collapsed', true);

		for (const e of this.outputEntries.keys()) {
			this.noteBookEditor.hideInset(e);
		}

		this.relayoutCell();
	}

	private viewUpdateExpanded(): void {
		DOM.show(this.templateData.cellContainer);
		DOM.show(this.templateData.runButtonContainer);
		DOM.hide(this.templateData.collapsedPart);
		DOM.show(this.templateData.outputContainer);
		this.templateData.container.classList.toggle('collapsed', false);
		this.templateData.container.classList.toggle('output-collapsed', false);

		this.viewUpdateShowOutputs();

		this.relayoutCell();
	}

	private layoutEditor(dimension: IDimension): void {
		this.templateData.editor?.layout(dimension);
		this.templateData.statusBar.layout(dimension.width);
	}

	private onCellWidthChange(): void {
		const realContentHeight = this.templateData.editor!.getContentHeight();
		this.viewCell.editorHeight = realContentHeight;
		this.relayoutCell();

		this.layoutEditor(
			{
				width: this.viewCell.layoutInfo.editorWidth,
				height: realContentHeight
			}
		);

		// for contents for which we don't oBserve for dynamic height, update them manually
		this.viewCell.outputs.forEach((o, i) => {
			const renderedOutput = this.outputEntries.get(o);
			if (renderedOutput && renderedOutput.renderResult && renderedOutput.renderResult.type === RenderOutputType.None && !renderedOutput.renderResult.hasDynamicHeight) {
				this.viewCell.updateOutputHeight(i, renderedOutput.domNode.clientHeight);
			}
		});
	}

	private onCellHeightChange(newHeight: numBer): void {
		const viewLayout = this.templateData.editor!.getLayoutInfo();
		this.viewCell.editorHeight = newHeight;
		this.relayoutCell();
		this.layoutEditor(
			{
				width: viewLayout.width,
				height: newHeight
			}
		);
	}

	private renderOutput(currOutput: IProcessedOutput, index: numBer, BeforeElement?: HTMLElement) {
		if (!this.outputEntries.has(currOutput)) {
			this.outputEntries.set(currOutput, new OutputElement(this.noteBookEditor, this.noteBookService, this.quickInputService, this.viewCell, this.templateData.outputContainer, currOutput));
		}

		this.outputEntries.get(currOutput)!.render(index, BeforeElement);
	}

	relayoutCell() {
		if (this._timer !== null) {
			clearTimeout(this._timer);
		}

		this.noteBookEditor.layoutNoteBookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
	}

	private _timer: numBer | null = null;

	relayoutCellDeBounced() {
		if (this._timer !== null) {
			clearTimeout(this._timer);
		}

		this._timer = setTimeout(() => {
			this.noteBookEditor.layoutNoteBookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
			this._timer = null;
		}, 200) as unknown as numBer | null;
	}

	dispose() {
		this.viewCell.detachTextEditor();
		this.outputEntries.forEach((value) => {
			value.dispose();
		});

		this.templateData.focusIndicatorLeft!.style.height = 'initial';

		super.dispose();
	}
}

