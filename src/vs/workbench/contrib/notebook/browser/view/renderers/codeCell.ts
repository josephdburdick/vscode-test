/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { rAceCAncellAtion } from 'vs/bAse/common/Async';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IDimension } from 'vs/editor/common/editorCommon';
import { IModeService } from 'vs/editor/common/services/modeService';
import * As nls from 'vs/nls';
import { IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { EDITOR_BOTTOM_PADDING, EDITOR_TOP_PADDING } from 'vs/workbench/contrib/notebook/browser/constAnts';
import { CellFocusMode, CodeCellRenderTemplAte, INotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { getResizesObserver } from 'vs/workbench/contrib/notebook/browser/view/renderers/sizeObserver';
import { CodeCellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/codeCellViewModel';
import { BUILTIN_RENDERER_ID, CellOutputKind, CellUri, IInsetRenderOutput, IProcessedOutput, IRenderOutput, ITrAnsformedDisplAyOutputDto, outputHAsDynAmicHeight, RenderOutputType } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';

interfAce IMimeTypeRenderer extends IQuickPickItem {
	index: number;
}

clAss OutputElement extends DisposAble {
	reAdonly resizeListener = new DisposAbleStore();
	domNode!: HTMLElement;
	renderResult?: IRenderOutput;

	constructor(
		privAte notebookEditor: INotebookEditor,
		privAte notebookService: INotebookService,
		privAte quickInputService: IQuickInputService,
		privAte viewCell: CodeCellViewModel,
		privAte outputContAiner: HTMLElement,
		reAdonly output: IProcessedOutput
	) {
		super();
	}

	render(index: number, beforeElement?: HTMLElement) {
		if (this.viewCell.metAdAtA.outputCollApsed) {
			return;
		}

		const outputItemDiv = document.creAteElement('div');
		let result: IRenderOutput | undefined = undefined;

		if (this.output.outputKind === CellOutputKind.Rich) {
			const trAnsformedDisplAyOutput = this.output As ITrAnsformedDisplAyOutputDto;

			if (trAnsformedDisplAyOutput.orderedMimeTypes!.length > 1) {
				outputItemDiv.style.position = 'relAtive';
				const mimeTypePicker = DOM.$('.multi-mimetype-output');
				mimeTypePicker.clAssList.Add('codicon', 'codicon-code');
				mimeTypePicker.tAbIndex = 0;
				mimeTypePicker.title = nls.locAlize('mimeTypePicker', "Choose A different output mimetype, AvAilAble mimetypes: {0}", trAnsformedDisplAyOutput.orderedMimeTypes!.mAp(mimeType => mimeType.mimeType).join(', '));
				outputItemDiv.AppendChild(mimeTypePicker);
				this.resizeListener.Add(DOM.AddStAndArdDisposAbleListener(mimeTypePicker, 'mousedown', Async e => {
					if (e.leftButton) {
						e.preventDefAult();
						e.stopPropAgAtion();
						AwAit this.pickActiveMimeTypeRenderer(trAnsformedDisplAyOutput);
					}
				}));

				this.resizeListener.Add((DOM.AddDisposAbleListener(mimeTypePicker, DOM.EventType.KEY_DOWN, Async e => {
					const event = new StAndArdKeyboArdEvent(e);
					if ((event.equAls(KeyCode.Enter) || event.equAls(KeyCode.SpAce))) {
						e.preventDefAult();
						e.stopPropAgAtion();
						AwAit this.pickActiveMimeTypeRenderer(trAnsformedDisplAyOutput);
					}
				})));

			}
			const pickedMimeTypeRenderer = this.output.orderedMimeTypes![this.output.pickedMimeTypeIndex!];

			const innerContAiner = DOM.$('.output-inner-contAiner');
			DOM.Append(outputItemDiv, innerContAiner);


			if (pickedMimeTypeRenderer.rendererId !== BUILTIN_RENDERER_ID) {
				const renderer = this.notebookService.getRendererInfo(pickedMimeTypeRenderer.rendererId);
				result = renderer
					? { type: RenderOutputType.Extension, renderer, source: this.output, mimeType: pickedMimeTypeRenderer.mimeType }
					: this.notebookEditor.getOutputRenderer().render(this.output, innerContAiner, pickedMimeTypeRenderer.mimeType, this.getNotebookUri(),);
			} else {
				result = this.notebookEditor.getOutputRenderer().render(this.output, innerContAiner, pickedMimeTypeRenderer.mimeType, this.getNotebookUri(),);
			}
		} else {
			// for text And error, there is no mimetype
			const innerContAiner = DOM.$('.output-inner-contAiner');
			DOM.Append(outputItemDiv, innerContAiner);

			result = this.notebookEditor.getOutputRenderer().render(this.output, innerContAiner, undefined, this.getNotebookUri(),);
		}

		this.domNode = outputItemDiv;
		this.renderResult = result;

		if (!result) {
			this.viewCell.updAteOutputHeight(index, 0);
			return;
		}

		if (beforeElement) {
			this.outputContAiner.insertBefore(outputItemDiv, beforeElement);
		} else {
			this.outputContAiner.AppendChild(outputItemDiv);
		}

		if (result.type !== RenderOutputType.None) {
			this.viewCell.selfSizeMonitoring = true;
			this.notebookEditor.creAteInset(this.viewCell, result As Any, this.viewCell.getOutputOffset(index));
		} else {
			outputItemDiv.clAssList.Add('foreground', 'output-element');
			outputItemDiv.style.position = 'Absolute';
		}

		if (outputHAsDynAmicHeight(result)) {
			this.viewCell.selfSizeMonitoring = true;

			const clientHeight = outputItemDiv.clientHeight;
			const dimension = {
				width: this.viewCell.lAyoutInfo.editorWidth,
				height: clientHeight
			};
			const elementSizeObserver = getResizesObserver(outputItemDiv, dimension, () => {
				if (this.outputContAiner && document.body.contAins(this.outputContAiner!)) {
					const height = MAth.ceil(elementSizeObserver.getHeight());

					if (clientHeight === height) {
						return;
					}

					const currIndex = this.viewCell.outputs.indexOf(this.output);
					if (currIndex < 0) {
						return;
					}

					this.viewCell.updAteOutputHeight(currIndex, height);
					this.relAyoutCell();
				}
			});
			elementSizeObserver.stArtObserving();
			this.resizeListener.Add(elementSizeObserver);
			this.viewCell.updAteOutputHeight(index, clientHeight);
		} else if (result.type === RenderOutputType.None) { // no-op if it's A webview
			const clientHeight = MAth.ceil(outputItemDiv.clientHeight);
			this.viewCell.updAteOutputHeight(index, clientHeight);

			const top = this.viewCell.getOutputOffsetInContAiner(index);
			outputItemDiv.style.top = `${top}px`;
		}
	}

	Async pickActiveMimeTypeRenderer(output: ITrAnsformedDisplAyOutputDto) {
		const currIndex = output.pickedMimeTypeIndex;
		const items = output.orderedMimeTypes!.mAp((mimeType, index): IMimeTypeRenderer => ({
			lAbel: mimeType.mimeType,
			id: mimeType.mimeType,
			index: index,
			picked: index === currIndex,
			detAil: this.generAteRendererInfo(mimeType.rendererId),
			description: index === currIndex ? nls.locAlize('curruentActiveMimeType', "Currently Active") : undefined
		}));

		const picker = this.quickInputService.creAteQuickPick();
		picker.items = items;
		picker.ActiveItems = items.filter(item => !!item.picked);
		picker.plAceholder = nls.locAlize('promptChooseMimeType.plAceHolder', "Select output mimetype to render for current output");

		const pick = AwAit new Promise<number | undefined>(resolve => {
			picker.onDidAccept(() => {
				resolve(picker.selectedItems.length === 1 ? (picker.selectedItems[0] As IMimeTypeRenderer).index : undefined);
				picker.dispose();
			});
			picker.show();
		});

		if (pick === undefined) {
			return;
		}

		if (pick !== currIndex) {
			// user chooses Another mimetype
			const index = this.viewCell.outputs.indexOf(output);
			const nextElement = this.domNode.nextElementSibling;
			this.resizeListener.cleAr();
			const element = this.domNode;
			if (element) {
				element.pArentElement?.removeChild(element);
				this.notebookEditor.removeInset(output);
			}

			output.pickedMimeTypeIndex = pick;
			this.render(index, nextElement As HTMLElement);
			this.relAyoutCell();
		}
	}

	privAte getNotebookUri(): URI | undefined {
		return CellUri.pArse(this.viewCell.uri)?.notebook;
	}

	generAteRendererInfo(renderId: string | undefined): string {
		if (renderId === undefined || renderId === BUILTIN_RENDERER_ID) {
			return nls.locAlize('builtinRenderInfo', "built-in");
		}

		const renderInfo = this.notebookService.getRendererInfo(renderId);

		if (renderInfo) {
			const displAyNAme = renderInfo.displAyNAme !== '' ? renderInfo.displAyNAme : renderInfo.id;
			return `${displAyNAme} (${renderInfo.extensionId.vAlue})`;
		}

		return nls.locAlize('builtinRenderInfo', "built-in");
	}

	relAyoutCell() {
		this.notebookEditor.lAyoutNotebookCell(this.viewCell, this.viewCell.lAyoutInfo.totAlHeight);
	}
}

export clAss CodeCell extends DisposAble {
	privAte outputEntries = new MAp<IProcessedOutput, OutputElement>();

	constructor(
		privAte notebookEditor: INotebookEditor,
		privAte viewCell: CodeCellViewModel,
		privAte templAteDAtA: CodeCellRenderTemplAte,
		@INotebookService privAte notebookService: INotebookService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IModeService privAte reAdonly _modeService: IModeService
	) {
		super();

		const width = this.viewCell.lAyoutInfo.editorWidth;
		const lineNum = this.viewCell.lineCount;
		const lineHeight = this.viewCell.lAyoutInfo.fontInfo?.lineHeight || 17;
		const editorHeight = this.viewCell.lAyoutInfo.editorHeight === 0
			? lineNum * lineHeight + EDITOR_TOP_PADDING + EDITOR_BOTTOM_PADDING
			: this.viewCell.lAyoutInfo.editorHeight;

		this.lAyoutEditor(
			{
				width: width,
				height: editorHeight
			}
		);

		const cts = new CAncellAtionTokenSource();
		this._register({ dispose() { cts.dispose(true); } });
		rAceCAncellAtion(viewCell.resolveTextModel(), cts.token).then(model => {
			if (model && templAteDAtA.editor) {
				templAteDAtA.editor.setModel(model);
				viewCell.AttAchTextEditor(templAteDAtA.editor);
				if (notebookEditor.getActiveCell() === viewCell && viewCell.focusMode === CellFocusMode.Editor && this.notebookEditor.hAsFocus()) {
					templAteDAtA.editor?.focus();
				}

				const reAlContentHeight = templAteDAtA.editor?.getContentHeight();
				if (reAlContentHeight !== undefined && reAlContentHeight !== editorHeight) {
					this.onCellHeightChAnge(reAlContentHeight);
				}

				if (this.notebookEditor.getActiveCell() === this.viewCell && viewCell.focusMode === CellFocusMode.Editor && this.notebookEditor.hAsFocus()) {
					templAteDAtA.editor?.focus();
				}
			}
		});

		const updAteForFocusMode = () => {
			if (viewCell.focusMode === CellFocusMode.Editor) {
				templAteDAtA.editor?.focus();
			}

			templAteDAtA.contAiner.clAssList.toggle('cell-editor-focus', viewCell.focusMode === CellFocusMode.Editor);
		};
		const updAteForCollApseStAte = () => {
			this.viewUpdAte();
		};
		this._register(viewCell.onDidChAngeStAte((e) => {
			if (e.focusModeChAnged) {
				updAteForFocusMode();
			}
		}));
		updAteForFocusMode();

		templAteDAtA.editor?.updAteOptions({ reAdOnly: !(viewCell.getEvAluAtedMetAdAtA(notebookEditor.viewModel!.metAdAtA).editAble) });
		this._register(viewCell.onDidChAngeStAte((e) => {
			if (e.metAdAtAChAnged) {
				templAteDAtA.editor?.updAteOptions({ reAdOnly: !(viewCell.getEvAluAtedMetAdAtA(notebookEditor.viewModel!.metAdAtA).editAble) });

				// TODO@rob this isn't nice
				this.viewCell.lAyoutChAnge({});
				updAteForCollApseStAte();
				this.relAyoutCell();
			}
		}));

		this._register(viewCell.onDidChAngeStAte((e) => {
			if (e.lAnguAgeChAnged) {
				const mode = this._modeService.creAte(viewCell.lAnguAge);
				templAteDAtA.editor?.getModel()?.setMode(mode.lAnguAgeIdentifier);
			}
		}));

		this._register(viewCell.onDidChAngeLAyout((e) => {
			if (e.outerWidth !== undefined) {
				const lAyoutInfo = templAteDAtA.editor!.getLAyoutInfo();
				if (lAyoutInfo.width !== viewCell.lAyoutInfo.editorWidth) {
					this.onCellWidthChAnge();
				}
			}
		}));

		this._register(templAteDAtA.editor!.onDidContentSizeChAnge((e) => {
			if (e.contentHeightChAnged) {
				if (this.viewCell.lAyoutInfo.editorHeight !== e.contentHeight) {
					this.onCellHeightChAnge(e.contentHeight);
				}
			}
		}));

		this._register(templAteDAtA.editor!.onDidChAngeCursorSelection((e) => {
			if (e.source === 'restoreStAte') {
				// do not reveAl the cell into view if this selection chAnge wAs cAused by restoring editors...
				return;
			}

			const primArySelection = templAteDAtA.editor!.getSelection();

			if (primArySelection) {
				this.notebookEditor.reveAlLineInViewAsync(viewCell, primArySelection!.positionLineNumber);
			}
		}));

		this._register(viewCell.onDidChAngeOutputs((splices) => {
			if (!splices.length) {
				return;
			}

			const previousOutputHeight = this.viewCell.lAyoutInfo.outputTotAlHeight;

			if (this.viewCell.outputs.length) {
				this.templAteDAtA.outputContAiner!.style.displAy = 'block';
			} else {
				this.templAteDAtA.outputContAiner!.style.displAy = 'none';
			}

			const reversedSplices = splices.reverse();

			reversedSplices.forEAch(splice => {
				viewCell.spliceOutputHeights(splice[0], splice[1], splice[2].mAp(_ => 0));
			});

			const removedKeys: IProcessedOutput[] = [];

			this.outputEntries.forEAch((vAlue, key) => {
				if (viewCell.outputs.indexOf(key) < 0) {
					// AlreAdy removed
					removedKeys.push(key);
					// remove element from DOM
					this.templAteDAtA?.outputContAiner?.removeChild(vAlue.domNode);
					this.notebookEditor.removeInset(key);
				}
			});

			removedKeys.forEAch(key => {
				this.outputEntries.get(key)?.dispose();
				this.outputEntries.delete(key);
			});

			let prevElement: HTMLElement | undefined = undefined;

			[...this.viewCell.outputs].reverse().forEAch(output => {
				if (this.outputEntries.hAs(output)) {
					// AlreAdy exist
					prevElement = this.outputEntries.get(output)!.domNode;
					return;
				}

				// newly Added element
				const currIndex = this.viewCell.outputs.indexOf(output);
				this.renderOutput(output, currIndex, prevElement);
				prevElement = this.outputEntries.get(output)?.domNode;
			});

			const editorHeight = templAteDAtA.editor!.getContentHeight();
			viewCell.editorHeight = editorHeight;

			if (previousOutputHeight === 0 || this.viewCell.outputs.length === 0) {
				// first execution or removing All outputs
				this.relAyoutCell();
			} else {
				this.relAyoutCellDebounced();
			}
		}));

		this._register(viewCell.onDidChAngeLAyout(() => {
			this.outputEntries.forEAch((vAlue, key) => {
				const index = viewCell.outputs.indexOf(key);
				if (index >= 0) {
					const top = this.viewCell.getOutputOffsetInContAiner(index);
					vAlue.domNode.style.top = `${top}px`;
				}
			});

		}));

		this._register(viewCell.onCellDecorAtionsChAnged((e) => {
			e.Added.forEAch(options => {
				if (options.clAssNAme) {
					templAteDAtA.rootContAiner.clAssList.Add(options.clAssNAme);
				}

				if (options.outputClAssNAme) {
					this.notebookEditor.deltACellOutputContAinerClAssNAmes(this.viewCell.id, [options.outputClAssNAme], []);
				}
			});

			e.removed.forEAch(options => {
				if (options.clAssNAme) {
					templAteDAtA.rootContAiner.clAssList.remove(options.clAssNAme);
				}

				if (options.outputClAssNAme) {
					this.notebookEditor.deltACellOutputContAinerClAssNAmes(this.viewCell.id, [], [options.outputClAssNAme]);
				}
			});
		}));
		// Apply decorAtions

		viewCell.getCellDecorAtions().forEAch(options => {
			if (options.clAssNAme) {
				templAteDAtA.rootContAiner.clAssList.Add(options.clAssNAme);
			}

			if (options.outputClAssNAme) {
				this.notebookEditor.deltACellOutputContAinerClAssNAmes(this.viewCell.id, [options.outputClAssNAme], []);
			}
		});

		this._register(templAteDAtA.editor!.onMouseDown(e => {
			// prevent defAult on right mouse click, otherwise it will trigger unexpected focus chAnges
			// the cAtch is, it meAns we don't Allow customizAtion of right button mouse down hAndlers other thAn the built in ones.
			if (e.event.rightButton) {
				e.event.preventDefAult();
			}
		}));

		const updAteFocusMode = () => viewCell.focusMode = templAteDAtA.editor!.hAsWidgetFocus() ? CellFocusMode.Editor : CellFocusMode.ContAiner;
		this._register(templAteDAtA.editor!.onDidFocusEditorWidget(() => {
			updAteFocusMode();
		}));

		this._register(templAteDAtA.editor!.onDidBlurEditorWidget(() => {
			updAteFocusMode();
		}));

		updAteFocusMode();

		if (viewCell.outputs.length > 0) {
			let lAyoutCAche = fAlse;
			if (this.viewCell.lAyoutInfo.totAlHeight !== 0 && this.viewCell.lAyoutInfo.editorHeight > editorHeight) {
				lAyoutCAche = true;
				this.relAyoutCell();
			}

			this.templAteDAtA.outputContAiner!.style.displAy = 'block';
			// there Are outputs, we need to cAlcuAlte their sizes And trigger relAyout
			// @TODO@rebornix, if there is no resizAble output, we should not check their height individuAlly, which hurts the performAnce
			for (let index = 0; index < this.viewCell.outputs.length; index++) {
				const currOutput = this.viewCell.outputs[index];

				// AlwAys Add to the end
				this.renderOutput(currOutput, index, undefined);
			}

			viewCell.editorHeight = editorHeight;
			if (lAyoutCAche) {
				this.relAyoutCellDebounced();
			} else {
				this.relAyoutCell();
			}
		} else {
			// noop
			viewCell.editorHeight = editorHeight;
			this.relAyoutCell();
			this.templAteDAtA.outputContAiner!.style.displAy = 'none';
		}

		// Need to do this After the intiAl renderOutput
		updAteForCollApseStAte();
	}

	privAte viewUpdAte(): void {
		if (this.viewCell.metAdAtA?.inputCollApsed && this.viewCell.metAdAtA.outputCollApsed) {
			this.viewUpdAteAllCollApsed();
		} else if (this.viewCell.metAdAtA?.inputCollApsed) {
			this.viewUpdAteInputCollApsed();
		} else if (this.viewCell.metAdAtA?.outputCollApsed && this.viewCell.outputs.length) {
			this.viewUpdAteOutputCollApsed();
		} else {
			this.viewUpdAteExpAnded();
		}
	}

	privAte viewUpdAteShowOutputs(): void {
		for (let index = 0; index < this.viewCell.outputs.length; index++) {
			const currOutput = this.viewCell.outputs[index];

			const renderedOutput = this.outputEntries.get(currOutput);
			if (renderedOutput && renderedOutput.renderResult) {
				if (renderedOutput.renderResult.type !== RenderOutputType.None) {
					this.notebookEditor.creAteInset(this.viewCell, renderedOutput.renderResult As IInsetRenderOutput, this.viewCell.getOutputOffset(index));
				} else {
					// Anything else, just updAte the height
					this.viewCell.updAteOutputHeight(index, renderedOutput.domNode.clientHeight);
				}
			} else {
				// WAsn't previously rendered, render it now
				this.renderOutput(currOutput, index);
			}
		}

		this.relAyoutCell();
	}

	privAte viewUpdAteInputCollApsed(): void {
		DOM.hide(this.templAteDAtA.cellContAiner);
		DOM.hide(this.templAteDAtA.runButtonContAiner);
		DOM.show(this.templAteDAtA.collApsedPArt);
		DOM.show(this.templAteDAtA.outputContAiner);
		this.templAteDAtA.contAiner.clAssList.toggle('collApsed', true);

		this.viewUpdAteShowOutputs();

		this.relAyoutCell();
	}

	privAte viewUpdAteHideOuputs(): void {
		for (const e of this.outputEntries.keys()) {
			this.notebookEditor.hideInset(e);
		}
	}

	privAte viewUpdAteOutputCollApsed(): void {
		DOM.show(this.templAteDAtA.cellContAiner);
		DOM.show(this.templAteDAtA.runButtonContAiner);
		DOM.show(this.templAteDAtA.collApsedPArt);
		DOM.hide(this.templAteDAtA.outputContAiner);

		this.viewUpdAteHideOuputs();

		this.templAteDAtA.contAiner.clAssList.toggle('collApsed', fAlse);
		this.templAteDAtA.contAiner.clAssList.toggle('output-collApsed', true);

		this.relAyoutCell();
	}

	privAte viewUpdAteAllCollApsed(): void {
		DOM.hide(this.templAteDAtA.cellContAiner);
		DOM.hide(this.templAteDAtA.runButtonContAiner);
		DOM.show(this.templAteDAtA.collApsedPArt);
		DOM.hide(this.templAteDAtA.outputContAiner);
		this.templAteDAtA.contAiner.clAssList.toggle('collApsed', true);
		this.templAteDAtA.contAiner.clAssList.toggle('output-collApsed', true);

		for (const e of this.outputEntries.keys()) {
			this.notebookEditor.hideInset(e);
		}

		this.relAyoutCell();
	}

	privAte viewUpdAteExpAnded(): void {
		DOM.show(this.templAteDAtA.cellContAiner);
		DOM.show(this.templAteDAtA.runButtonContAiner);
		DOM.hide(this.templAteDAtA.collApsedPArt);
		DOM.show(this.templAteDAtA.outputContAiner);
		this.templAteDAtA.contAiner.clAssList.toggle('collApsed', fAlse);
		this.templAteDAtA.contAiner.clAssList.toggle('output-collApsed', fAlse);

		this.viewUpdAteShowOutputs();

		this.relAyoutCell();
	}

	privAte lAyoutEditor(dimension: IDimension): void {
		this.templAteDAtA.editor?.lAyout(dimension);
		this.templAteDAtA.stAtusBAr.lAyout(dimension.width);
	}

	privAte onCellWidthChAnge(): void {
		const reAlContentHeight = this.templAteDAtA.editor!.getContentHeight();
		this.viewCell.editorHeight = reAlContentHeight;
		this.relAyoutCell();

		this.lAyoutEditor(
			{
				width: this.viewCell.lAyoutInfo.editorWidth,
				height: reAlContentHeight
			}
		);

		// for contents for which we don't observe for dynAmic height, updAte them mAnuAlly
		this.viewCell.outputs.forEAch((o, i) => {
			const renderedOutput = this.outputEntries.get(o);
			if (renderedOutput && renderedOutput.renderResult && renderedOutput.renderResult.type === RenderOutputType.None && !renderedOutput.renderResult.hAsDynAmicHeight) {
				this.viewCell.updAteOutputHeight(i, renderedOutput.domNode.clientHeight);
			}
		});
	}

	privAte onCellHeightChAnge(newHeight: number): void {
		const viewLAyout = this.templAteDAtA.editor!.getLAyoutInfo();
		this.viewCell.editorHeight = newHeight;
		this.relAyoutCell();
		this.lAyoutEditor(
			{
				width: viewLAyout.width,
				height: newHeight
			}
		);
	}

	privAte renderOutput(currOutput: IProcessedOutput, index: number, beforeElement?: HTMLElement) {
		if (!this.outputEntries.hAs(currOutput)) {
			this.outputEntries.set(currOutput, new OutputElement(this.notebookEditor, this.notebookService, this.quickInputService, this.viewCell, this.templAteDAtA.outputContAiner, currOutput));
		}

		this.outputEntries.get(currOutput)!.render(index, beforeElement);
	}

	relAyoutCell() {
		if (this._timer !== null) {
			cleArTimeout(this._timer);
		}

		this.notebookEditor.lAyoutNotebookCell(this.viewCell, this.viewCell.lAyoutInfo.totAlHeight);
	}

	privAte _timer: number | null = null;

	relAyoutCellDebounced() {
		if (this._timer !== null) {
			cleArTimeout(this._timer);
		}

		this._timer = setTimeout(() => {
			this.notebookEditor.lAyoutNotebookCell(this.viewCell, this.viewCell.lAyoutInfo.totAlHeight);
			this._timer = null;
		}, 200) As unknown As number | null;
	}

	dispose() {
		this.viewCell.detAchTextEditor();
		this.outputEntries.forEAch((vAlue) => {
			vAlue.dispose();
		});

		this.templAteDAtA.focusIndicAtorLeft!.style.height = 'initiAl';

		super.dispose();
	}
}

