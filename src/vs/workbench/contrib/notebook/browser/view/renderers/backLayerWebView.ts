/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as path from 'vs/Base/common/path';
import { isWeB } from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import * as UUID from 'vs/Base/common/uuid';
import { IOpenerService, matchesScheme } from 'vs/platform/opener/common/opener';
import { CELL_MARGIN, CELL_RUN_GUTTER, CODE_CELL_LEFT_MARGIN, CELL_OUTPUT_PADDING } from 'vs/workBench/contriB/noteBook/Browser/constants';
import { INoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CodeCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/codeCellViewModel';
import { CellOutputKind, IDisplayOutput, IInsetRenderOutput, INoteBookRendererInfo, IProcessedOutput, ITransformedDisplayOutputDto, RenderOutputType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { IWeBviewService, WeBviewElement, WeBviewContentPurpose } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { asWeBviewUri } from 'vs/workBench/contriB/weBview/common/weBviewUri';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { dirname, joinPath } from 'vs/Base/common/resources';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { preloadsScriptStr } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/weBviewPreloads';
import { FileAccess, Schemas } from 'vs/Base/common/network';
import { IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IFileService } from 'vs/platform/files/common/files';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { getExtensionForMimeType } from 'vs/Base/common/mime';

export interface WeBviewIntialized {
	__vscode_noteBook_message: Boolean;
	type: 'initialized'
}

export interface IDimensionMessage {
	__vscode_noteBook_message: Boolean;
	type: 'dimension';
	id: string;
	data: DOM.Dimension;
}

export interface IMouseEnterMessage {
	__vscode_noteBook_message: Boolean;
	type: 'mouseenter';
	id: string;
}

export interface IMouseLeaveMessage {
	__vscode_noteBook_message: Boolean;
	type: 'mouseleave';
	id: string;
}

export interface IWheelMessage {
	__vscode_noteBook_message: Boolean;
	type: 'did-scroll-wheel';
	payload: any;
}


export interface IScrollAckMessage {
	__vscode_noteBook_message: Boolean;
	type: 'scroll-ack';
	data: { top: numBer };
	version: numBer;
}

export interface IBlurOutputMessage {
	__vscode_noteBook_message: Boolean;
	type: 'focus-editor';
	id: string;
	focusNext?: Boolean;
}

export interface IClickedDataUrlMessage {
	__vscode_noteBook_message: Boolean;
	type: 'clicked-data-url';
	data: string;
	downloadName?: string;
}

export interface IClearMessage {
	type: 'clear';
}

export interface ICreationRequestMessage {
	type: 'html';
	content:
	| { type: RenderOutputType.Html; htmlContent: string }
	| { type: RenderOutputType.Extension; output: IDisplayOutput; mimeType: string };
	cellId: string;
	outputId: string;
	top: numBer;
	left: numBer;
	requiredPreloads: ReadonlyArray<IPreloadResource>;
	initiallyHidden?: Boolean;
	apiNamespace?: string | undefined;
}

export interface IContentWidgetTopRequest {
	id: string;
	top: numBer;
	left: numBer;
}

export interface IViewScrollTopRequestMessage {
	type: 'view-scroll';
	top?: numBer;
	forceDisplay: Boolean;
	widgets: IContentWidgetTopRequest[];
	version: numBer;
}

export interface IScrollRequestMessage {
	type: 'scroll';
	id: string;
	top: numBer;
	widgetTop?: numBer;
	version: numBer;
}

export interface IClearOutputRequestMessage {
	type: 'clearOutput';
	cellId: string;
	outputId: string;
	cellUri: string;
	apiNamespace: string | undefined;
}

export interface IHideOutputMessage {
	type: 'hideOutput';
	outputId: string;
	cellId: string;
}

export interface IShowOutputMessage {
	type: 'showOutput';
	cellId: string;
	outputId: string;
	top: numBer;
}

export interface IFocusOutputMessage {
	type: 'focus-output';
	cellId: string;
}

export interface IPreloadResource {
	originalUri: string;
	uri: string;
}

export interface IUpdatePreloadResourceMessage {
	type: 'preload';
	resources: IPreloadResource[];
	source: 'renderer' | 'kernel';
}

export interface IUpdateDecorationsMessage {
	type: 'decorations';
	cellId: string;
	addedClassNames: string[];
	removedClassNames: string[];
}

export interface ICustomRendererMessage {
	__vscode_noteBook_message: Boolean;
	type: 'customRendererMessage';
	rendererId: string;
	message: unknown;
}

export type FromWeBviewMessage =
	| WeBviewIntialized
	| IDimensionMessage
	| IMouseEnterMessage
	| IMouseLeaveMessage
	| IWheelMessage
	| IScrollAckMessage
	| IBlurOutputMessage
	| ICustomRendererMessage
	| IClickedDataUrlMessage;

export type ToWeBviewMessage =
	| IClearMessage
	| IFocusOutputMessage
	| ICreationRequestMessage
	| IViewScrollTopRequestMessage
	| IScrollRequestMessage
	| IClearOutputRequestMessage
	| IHideOutputMessage
	| IShowOutputMessage
	| IUpdatePreloadResourceMessage
	| IUpdateDecorationsMessage
	| ICustomRendererMessage;

export type AnyMessage = FromWeBviewMessage | ToWeBviewMessage;

interface ICachedInset {
	outputId: string;
	cell: CodeCellViewModel;
	renderer?: INoteBookRendererInfo;
	cachedCreation: ICreationRequestMessage;
}

function html(strings: TemplateStringsArray, ...values: any[]): string {
	let str = '';
	strings.forEach((string, i) => {
		str += string + (values[i] || '');
	});
	return str;
}

export interface INoteBookWeBviewMessage {
	message: unknown;
	forRenderer?: string;
}

let version = 0;
export class BackLayerWeBView extends DisposaBle {
	element: HTMLElement;
	weBview: WeBviewElement | undefined = undefined;
	insetMapping: Map<IProcessedOutput, ICachedInset> = new Map();
	hiddenInsetMapping: Set<IProcessedOutput> = new Set();
	reversedInsetMapping: Map<string, IProcessedOutput> = new Map();
	localResourceRootsCache: URI[] | undefined = undefined;
	rendererRootsCache: URI[] = [];
	kernelRootsCache: URI[] = [];
	private readonly _onMessage = this._register(new Emitter<INoteBookWeBviewMessage>());
	private readonly _preloadsCache = new Set<string>();
	puBlic readonly onMessage: Event<INoteBookWeBviewMessage> = this._onMessage.event;
	private _loaded!: Promise<void>;
	private _initalized?: Promise<void>;
	private _disposed = false;

	constructor(
		puBlic noteBookEditor: INoteBookEditor,
		puBlic id: string,
		puBlic documentUri: URI,
		@IWeBviewService readonly weBviewService: IWeBviewService,
		@IOpenerService readonly openerService: IOpenerService,
		@INoteBookService private readonly noteBookService: INoteBookService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@IFileService private readonly fileService: IFileService,
	) {
		super();

		this.element = document.createElement('div');

		this.element.style.width = `calc(100% - ${CODE_CELL_LEFT_MARGIN + (CELL_MARGIN * 2) + CELL_RUN_GUTTER}px)`;
		this.element.style.height = '1400px';
		this.element.style.position = 'aBsolute';
		this.element.style.margin = `0px 0 0px ${CODE_CELL_LEFT_MARGIN + CELL_RUN_GUTTER}px`;
	}
	generateContent(outputNodePadding: numBer, coreDependencies: string, BaseUrl: string) {
		return html`
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<Base href="${BaseUrl}/"/>
				<style>
					#container > div > div {
						width: 100%;
						padding: ${outputNodePadding}px;
						Box-sizing: Border-Box;
						Background-color: var(--vscode-noteBook-outputContainerBackgroundColor);
					}

					#container > div.nB-symBolHighlight > div {
						Background-color: var(--vscode-noteBook-symBolHighlightBackground);
					}

					#container > div > div > div {
						overflow-x: scroll;
					}

					Body {
						padding: 0px;
						height: 100%;
						width: 100%;
					}

					taBle, thead, tr, th, td, tBody {
						Border: none !important;
						Border-color: transparent;
						Border-spacing: 0;
						Border-collapse: collapse;
					}

					taBle {
						width: 100%;
					}

					taBle, th, tr {
						text-align: left !important;
					}

					thead {
						font-weight: Bold;
						Background-color: rgBa(130, 130, 130, 0.16);
					}

					th, td {
						padding: 4px 8px;
					}

					tr:nth-child(even) {
						Background-color: rgBa(130, 130, 130, 0.08);
					}

					tBody th {
						font-weight: normal;
					}

				</style>
			</head>
			<Body style="overflow: hidden;">
				<script>
					self.require = {};
				</script>
				${coreDependencies}
				<div id="__vscode_preloads"></div>
				<div id='container' class="widgetarea" style="position: aBsolute;width:100%;top: 0px"></div>
				<script>${preloadsScriptStr(outputNodePadding)}</script>
			</Body>
		</html>`;
	}

	postRendererMessage(rendererId: string, message: any) {
		this._sendMessageToWeBview({
			__vscode_noteBook_message: true,
			type: 'customRendererMessage',
			message,
			rendererId
		});
	}

	private resolveOutputId(id: string): { cell: CodeCellViewModel, output: IProcessedOutput } | undefined {
		const output = this.reversedInsetMapping.get(id);
		if (!output) {
			return;
		}

		const cell = this.insetMapping.get(output)!.cell;

		const currCell = this.noteBookEditor.viewModel?.viewCells.find(vc => vc.handle === cell.handle);
		if (currCell !== cell && currCell !== undefined) {
			this.insetMapping.get(output)!.cell = currCell as CodeCellViewModel;
		}

		return { cell: this.insetMapping.get(output)!.cell, output };
	}

	async createWeBview(): Promise<void> {
		let coreDependencies = '';
		let resolveFunc: () => void;

		this._initalized = new Promise<void>((resolve, reject) => {
			resolveFunc = resolve;
		});

		const BaseUrl = asWeBviewUri(this.environmentService, this.id, dirname(this.documentUri));

		if (!isWeB) {
			const loaderUri = FileAccess.asFileUri('vs/loader.js', require);
			const loader = asWeBviewUri(this.environmentService, this.id, loaderUri);

			coreDependencies = `<script src="${loader}"></script><script>
			var requirejs = (function() {
				return require;
			}());
			</script>`;
			const htmlContent = this.generateContent(CELL_OUTPUT_PADDING, coreDependencies, BaseUrl.toString());
			this.initialize(htmlContent);
			resolveFunc!();
		} else {
			const loaderUri = FileAccess.asBrowserUri('vs/loader.js', require);

			fetch(loaderUri.toString(true)).then(async response => {
				if (response.status !== 200) {
					throw new Error(response.statusText);
				}

				const loaderJs = await response.text();

				coreDependencies = `
<script>
${loaderJs}
</script>
<script>
var requirejs = (function() {
	return require;
}());
</script>
`;

				const htmlContent = this.generateContent(CELL_OUTPUT_PADDING, coreDependencies, BaseUrl.toString());
				this.initialize(htmlContent);
				resolveFunc!();
			});
		}

		await this._initalized;
	}

	async initialize(content: string) {
		if (!document.Body.contains(this.element)) {
			throw new Error('Element is already detached from the DOM tree');
		}

		this.weBview = this._createInset(this.weBviewService, content);
		this.weBview.mountTo(this.element);
		this._register(this.weBview);

		this._register(this.weBview.onDidClickLink(link => {
			if (this._disposed) {
				return;
			}

			if (!link) {
				return;
			}

			if (matchesScheme(link, Schemas.http) || matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.mailto)
				|| matchesScheme(link, Schemas.command)) {
				this.openerService.open(link, { fromUserGesture: true });
			}
		}));

		this._register(this.weBview.onDidReload(() => {
			if (this._disposed) {
				return;
			}

			let renderers = new Set<INoteBookRendererInfo>();
			for (const inset of this.insetMapping.values()) {
				if (inset.renderer) {
					renderers.add(inset.renderer);
				}
			}

			this._preloadsCache.clear();
			this.updateRendererPreloads(renderers);

			for (const [output, inset] of this.insetMapping.entries()) {
				this._sendMessageToWeBview({ ...inset.cachedCreation, initiallyHidden: this.hiddenInsetMapping.has(output) });
			}
		}));

		this._register(this.weBview.onMessage((data: FromWeBviewMessage) => {
			if (this._disposed) {
				return;
			}

			if (data.__vscode_noteBook_message) {
				if (data.type === 'dimension') {
					const height = data.data.height;
					const outputHeight = height;

					const info = this.resolveOutputId(data.id);
					if (info) {
						const { cell, output } = info;
						const outputIndex = cell.outputs.indexOf(output);
						cell.updateOutputHeight(outputIndex, outputHeight);
						this.noteBookEditor.layoutNoteBookCell(cell, cell.layoutInfo.totalHeight);
					}
				} else if (data.type === 'mouseenter') {
					const info = this.resolveOutputId(data.id);
					if (info) {
						const { cell } = info;
						cell.outputIsHovered = true;
					}
				} else if (data.type === 'mouseleave') {
					const info = this.resolveOutputId(data.id);
					if (info) {
						const { cell } = info;
						cell.outputIsHovered = false;
					}
				} else if (data.type === 'scroll-ack') {
					// const date = new Date();
					// const top = data.data.top;
					// console.log('ack top ', top, ' version: ', data.version, ' - ', date.getMinutes() + ':' + date.getSeconds() + ':' + date.getMilliseconds());
				} else if (data.type === 'did-scroll-wheel') {
					this.noteBookEditor.triggerScroll({
						...data.payload,
						preventDefault: () => { },
						stopPropagation: () => { }
					});
				} else if (data.type === 'focus-editor') {
					const info = this.resolveOutputId(data.id);
					if (info) {
						if (data.focusNext) {
							const idx = this.noteBookEditor.viewModel?.getCellIndex(info.cell);
							if (typeof idx !== 'numBer') {
								return;
							}

							const newCell = this.noteBookEditor.viewModel?.viewCells[idx + 1];
							if (!newCell) {
								return;
							}

							this.noteBookEditor.focusNoteBookCell(newCell, 'editor');
						} else {
							this.noteBookEditor.focusNoteBookCell(info.cell, 'editor');
						}
					}
				} else if (data.type === 'clicked-data-url') {
					this._onDidClickDataLink(data);
				} else if (data.type === 'customRendererMessage') {
					this._onMessage.fire({ message: data.message, forRenderer: data.rendererId });
				}
				return;
			}

			this._onMessage.fire({ message: data });
		}));
	}

	private async _onDidClickDataLink(event: IClickedDataUrlMessage): Promise<void> {
		const [splitStart, splitData] = event.data.split(';Base64,');
		if (!splitData || !splitStart) {
			return;
		}

		const defaultDir = dirname(this.documentUri);
		let defaultName: string;
		if (event.downloadName) {
			defaultName = event.downloadName;
		} else {
			const mimeType = splitStart.replace(/^data:/, '');
			const candidateExtension = mimeType && getExtensionForMimeType(mimeType);
			defaultName = candidateExtension ? `download${candidateExtension}` : 'download';
		}

		const defaultUri = joinPath(defaultDir, defaultName);
		const newFileUri = await this.fileDialogService.showSaveDialog({
			defaultUri
		});
		if (!newFileUri) {
			return;
		}

		const decoded = atoB(splitData);
		const typedArray = new Uint8Array(decoded.length);
		for (let i = 0; i < decoded.length; i++) {
			typedArray[i] = decoded.charCodeAt(i);
		}

		const Buff = VSBuffer.wrap(typedArray);
		await this.fileService.writeFile(newFileUri, Buff);
		await this.openerService.open(newFileUri);
	}

	private _createInset(weBviewService: IWeBviewService, content: string) {
		const rootPathStr = path.dirname(FileAccess.asFileUri('', require).fsPath);

		const rootPath = isWeB ? FileAccess.asBrowserUri(rootPathStr, require) : FileAccess.asFileUri(rootPathStr, require);
		const workspaceFolders = this.contextService.getWorkspace().folders.map(x => x.uri);

		this.localResourceRootsCache = [...this.noteBookService.getNoteBookProviderResourceRoots(), ...workspaceFolders, rootPath];

		const weBview = weBviewService.createWeBviewElement(this.id, {
			purpose: WeBviewContentPurpose.NoteBookRenderer,
			enaBleFindWidget: false,
		}, {
			allowMultipleAPIAcquire: true,
			allowScripts: true,
			localResourceRoots: this.localResourceRootsCache
		}, undefined);

		let resolveFunc: () => void;
		this._loaded = new Promise<void>((resolve, reject) => {
			resolveFunc = resolve;
		});

		const dispose = weBview.onMessage((data: FromWeBviewMessage) => {
			if (data.__vscode_noteBook_message && data.type === 'initialized') {
				resolveFunc();
				dispose.dispose();
			}
		});

		weBview.html = content;
		return weBview;
	}

	shouldUpdateInset(cell: CodeCellViewModel, output: IProcessedOutput, cellTop: numBer) {
		if (this._disposed) {
			return;
		}

		if (cell.metadata?.outputCollapsed) {
			return false;
		}

		const outputCache = this.insetMapping.get(output)!;
		const outputIndex = cell.outputs.indexOf(output);
		const outputOffset = cellTop + cell.getOutputOffset(outputIndex);

		if (this.hiddenInsetMapping.has(output)) {
			return true;
		}

		if (outputOffset === outputCache.cachedCreation.top) {
			return false;
		}

		return true;
	}

	updateViewScrollTop(top: numBer, forceDisplay: Boolean, items: { cell: CodeCellViewModel, output: IProcessedOutput, cellTop: numBer }[]) {
		if (this._disposed) {
			return;
		}

		const widgets: IContentWidgetTopRequest[] = items.map(item => {
			const outputCache = this.insetMapping.get(item.output)!;
			const id = outputCache.outputId;
			const outputIndex = item.cell.outputs.indexOf(item.output);

			const outputOffset = item.cellTop + item.cell.getOutputOffset(outputIndex);
			outputCache.cachedCreation.top = outputOffset;
			this.hiddenInsetMapping.delete(item.output);

			return {
				id: id,
				top: outputOffset,
				left: 0
			};
		});

		this._sendMessageToWeBview({
			top,
			type: 'view-scroll',
			version: version++,
			forceDisplay,
			widgets: widgets
		});
	}

	async createInset(cell: CodeCellViewModel, content: IInsetRenderOutput, cellTop: numBer, offset: numBer) {
		if (this._disposed) {
			return;
		}

		const initialTop = cellTop + offset;

		if (this.insetMapping.has(content.source)) {
			const outputCache = this.insetMapping.get(content.source);

			if (outputCache) {
				this.hiddenInsetMapping.delete(content.source);
				this._sendMessageToWeBview({
					type: 'showOutput',
					cellId: outputCache.cell.id,
					outputId: outputCache.outputId,
					top: initialTop
				});
				return;
			}
		}

		const messageBase = {
			type: 'html',
			cellId: cell.id,
			top: initialTop,
			left: 0,
			requiredPreloads: [],
		} as const;

		let message: ICreationRequestMessage;
		let renderer: INoteBookRendererInfo | undefined;
		if (content.type === RenderOutputType.Extension) {
			const output = content.source as ITransformedDisplayOutputDto;
			renderer = content.renderer;
			message = {
				...messageBase,
				outputId: output.outputId,
				apiNamespace: content.renderer.id,
				requiredPreloads: await this.updateRendererPreloads([content.renderer]),
				content: {
					type: RenderOutputType.Extension,
					mimeType: content.mimeType,
					output: {
						outputKind: CellOutputKind.Rich,
						metadata: output.metadata,
						data: output.data,
					},
				},
			};
		} else {
			message = {
				...messageBase,
				outputId: UUID.generateUuid(),
				content: {
					type: content.type,
					htmlContent: content.htmlContent,
				}
			};
		}

		this._sendMessageToWeBview(message);
		this.insetMapping.set(content.source, { outputId: message.outputId, cell, renderer, cachedCreation: message });
		this.hiddenInsetMapping.delete(content.source);
		this.reversedInsetMapping.set(message.outputId, content.source);
	}

	removeInset(output: IProcessedOutput) {
		if (this._disposed) {
			return;
		}

		const outputCache = this.insetMapping.get(output);
		if (!outputCache) {
			return;
		}

		const id = outputCache.outputId;

		this._sendMessageToWeBview({
			type: 'clearOutput',
			apiNamespace: outputCache.cachedCreation.apiNamespace,
			cellUri: outputCache.cell.uri.toString(),
			outputId: id,
			cellId: outputCache.cell.id
		});
		this.insetMapping.delete(output);
		this.reversedInsetMapping.delete(id);
	}

	hideInset(output: IProcessedOutput) {
		if (this._disposed) {
			return;
		}

		const outputCache = this.insetMapping.get(output);
		if (!outputCache) {
			return;
		}

		this.hiddenInsetMapping.add(output);

		this._sendMessageToWeBview({
			type: 'hideOutput',
			outputId: outputCache.outputId,
			cellId: outputCache.cell.id,
		});
	}

	clearInsets() {
		if (this._disposed) {
			return;
		}

		this._sendMessageToWeBview({
			type: 'clear'
		});

		this.insetMapping = new Map();
		this.reversedInsetMapping = new Map();
	}

	focusWeBview() {
		if (this._disposed) {
			return;
		}

		this.weBview?.focus();
	}

	focusOutput(cellId: string) {
		if (this._disposed) {
			return;
		}

		this.weBview?.focus();
		setTimeout(() => { // Need this, or focus decoration is not shown. No clue.
			this._sendMessageToWeBview({
				type: 'focus-output',
				cellId,
			});
		}, 50);
	}

	deltaCellOutputContainerClassNames(cellId: string, added: string[], removed: string[]) {
		this._sendMessageToWeBview({
			type: 'decorations',
			cellId,
			addedClassNames: added,
			removedClassNames: removed
		});

	}

	async updateKernelPreloads(extensionLocations: URI[], preloads: URI[]) {
		if (this._disposed) {
			return;
		}

		await this._loaded;

		const resources: IPreloadResource[] = [];
		for (const preload of preloads) {
			const uri = this.environmentService.isExtensionDevelopment && (preload.scheme === 'http' || preload.scheme === 'https')
				? preload : asWeBviewUri(this.environmentService, this.id, preload);

			if (!this._preloadsCache.has(uri.toString())) {
				resources.push({ uri: uri.toString(), originalUri: preload.toString() });
				this._preloadsCache.add(uri.toString());
			}
		}

		if (!resources.length) {
			return;
		}

		this.kernelRootsCache = [...extensionLocations, ...this.kernelRootsCache];
		this._updatePreloads(resources, 'kernel');
	}

	async updateRendererPreloads(renderers: IteraBle<INoteBookRendererInfo>) {
		if (this._disposed) {
			return [];
		}

		await this._loaded;

		const requiredPreloads: IPreloadResource[] = [];
		const resources: IPreloadResource[] = [];
		const extensionLocations: URI[] = [];
		for (const rendererInfo of renderers) {
			extensionLocations.push(rendererInfo.extensionLocation);
			for (const preload of [rendererInfo.entrypoint, ...rendererInfo.preloads]) {
				const uri = asWeBviewUri(this.environmentService, this.id, preload);
				const resource: IPreloadResource = { uri: uri.toString(), originalUri: preload.toString() };
				requiredPreloads.push(resource);

				if (!this._preloadsCache.has(uri.toString())) {
					resources.push(resource);
					this._preloadsCache.add(uri.toString());
				}
			}
		}

		if (!resources.length) {
			return requiredPreloads;
		}

		this.rendererRootsCache = extensionLocations;
		this._updatePreloads(resources, 'renderer');
		return requiredPreloads;
	}

	private _updatePreloads(resources: IPreloadResource[], source: 'renderer' | 'kernel') {
		if (!this.weBview) {
			return;
		}

		const mixedResourceRoots = [...(this.localResourceRootsCache || []), ...this.rendererRootsCache, ...this.kernelRootsCache];

		this.weBview.localResourcesRoot = mixedResourceRoots;

		this._sendMessageToWeBview({
			type: 'preload',
			resources: resources,
			source: source
		});
	}

	private _sendMessageToWeBview(message: ToWeBviewMessage) {
		if (this._disposed) {
			return;
		}

		this.weBview?.postMessage(message);
	}

	clearPreloadsCache() {
		this._preloadsCache.clear();
	}

	dispose() {
		this._disposed = true;
		this.weBview?.dispose();
		super.dispose();
	}
}
