/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import * As pAth from 'vs/bAse/common/pAth';
import { isWeb } from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import * As UUID from 'vs/bAse/common/uuid';
import { IOpenerService, mAtchesScheme } from 'vs/plAtform/opener/common/opener';
import { CELL_MARGIN, CELL_RUN_GUTTER, CODE_CELL_LEFT_MARGIN, CELL_OUTPUT_PADDING } from 'vs/workbench/contrib/notebook/browser/constAnts';
import { INotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CodeCellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/codeCellViewModel';
import { CellOutputKind, IDisplAyOutput, IInsetRenderOutput, INotebookRendererInfo, IProcessedOutput, ITrAnsformedDisplAyOutputDto, RenderOutputType } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { IWebviewService, WebviewElement, WebviewContentPurpose } from 'vs/workbench/contrib/webview/browser/webview';
import { AsWebviewUri } from 'vs/workbench/contrib/webview/common/webviewUri';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { dirnAme, joinPAth } from 'vs/bAse/common/resources';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { preloAdsScriptStr } from 'vs/workbench/contrib/notebook/browser/view/renderers/webviewPreloAds';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';
import { IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IFileService } from 'vs/plAtform/files/common/files';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { getExtensionForMimeType } from 'vs/bAse/common/mime';

export interfAce WebviewIntiAlized {
	__vscode_notebook_messAge: booleAn;
	type: 'initiAlized'
}

export interfAce IDimensionMessAge {
	__vscode_notebook_messAge: booleAn;
	type: 'dimension';
	id: string;
	dAtA: DOM.Dimension;
}

export interfAce IMouseEnterMessAge {
	__vscode_notebook_messAge: booleAn;
	type: 'mouseenter';
	id: string;
}

export interfAce IMouseLeAveMessAge {
	__vscode_notebook_messAge: booleAn;
	type: 'mouseleAve';
	id: string;
}

export interfAce IWheelMessAge {
	__vscode_notebook_messAge: booleAn;
	type: 'did-scroll-wheel';
	pAyloAd: Any;
}


export interfAce IScrollAckMessAge {
	__vscode_notebook_messAge: booleAn;
	type: 'scroll-Ack';
	dAtA: { top: number };
	version: number;
}

export interfAce IBlurOutputMessAge {
	__vscode_notebook_messAge: booleAn;
	type: 'focus-editor';
	id: string;
	focusNext?: booleAn;
}

export interfAce IClickedDAtAUrlMessAge {
	__vscode_notebook_messAge: booleAn;
	type: 'clicked-dAtA-url';
	dAtA: string;
	downloAdNAme?: string;
}

export interfAce ICleArMessAge {
	type: 'cleAr';
}

export interfAce ICreAtionRequestMessAge {
	type: 'html';
	content:
	| { type: RenderOutputType.Html; htmlContent: string }
	| { type: RenderOutputType.Extension; output: IDisplAyOutput; mimeType: string };
	cellId: string;
	outputId: string;
	top: number;
	left: number;
	requiredPreloAds: ReAdonlyArrAy<IPreloAdResource>;
	initiAllyHidden?: booleAn;
	ApiNAmespAce?: string | undefined;
}

export interfAce IContentWidgetTopRequest {
	id: string;
	top: number;
	left: number;
}

export interfAce IViewScrollTopRequestMessAge {
	type: 'view-scroll';
	top?: number;
	forceDisplAy: booleAn;
	widgets: IContentWidgetTopRequest[];
	version: number;
}

export interfAce IScrollRequestMessAge {
	type: 'scroll';
	id: string;
	top: number;
	widgetTop?: number;
	version: number;
}

export interfAce ICleArOutputRequestMessAge {
	type: 'cleArOutput';
	cellId: string;
	outputId: string;
	cellUri: string;
	ApiNAmespAce: string | undefined;
}

export interfAce IHideOutputMessAge {
	type: 'hideOutput';
	outputId: string;
	cellId: string;
}

export interfAce IShowOutputMessAge {
	type: 'showOutput';
	cellId: string;
	outputId: string;
	top: number;
}

export interfAce IFocusOutputMessAge {
	type: 'focus-output';
	cellId: string;
}

export interfAce IPreloAdResource {
	originAlUri: string;
	uri: string;
}

export interfAce IUpdAtePreloAdResourceMessAge {
	type: 'preloAd';
	resources: IPreloAdResource[];
	source: 'renderer' | 'kernel';
}

export interfAce IUpdAteDecorAtionsMessAge {
	type: 'decorAtions';
	cellId: string;
	AddedClAssNAmes: string[];
	removedClAssNAmes: string[];
}

export interfAce ICustomRendererMessAge {
	__vscode_notebook_messAge: booleAn;
	type: 'customRendererMessAge';
	rendererId: string;
	messAge: unknown;
}

export type FromWebviewMessAge =
	| WebviewIntiAlized
	| IDimensionMessAge
	| IMouseEnterMessAge
	| IMouseLeAveMessAge
	| IWheelMessAge
	| IScrollAckMessAge
	| IBlurOutputMessAge
	| ICustomRendererMessAge
	| IClickedDAtAUrlMessAge;

export type ToWebviewMessAge =
	| ICleArMessAge
	| IFocusOutputMessAge
	| ICreAtionRequestMessAge
	| IViewScrollTopRequestMessAge
	| IScrollRequestMessAge
	| ICleArOutputRequestMessAge
	| IHideOutputMessAge
	| IShowOutputMessAge
	| IUpdAtePreloAdResourceMessAge
	| IUpdAteDecorAtionsMessAge
	| ICustomRendererMessAge;

export type AnyMessAge = FromWebviewMessAge | ToWebviewMessAge;

interfAce ICAchedInset {
	outputId: string;
	cell: CodeCellViewModel;
	renderer?: INotebookRendererInfo;
	cAchedCreAtion: ICreAtionRequestMessAge;
}

function html(strings: TemplAteStringsArrAy, ...vAlues: Any[]): string {
	let str = '';
	strings.forEAch((string, i) => {
		str += string + (vAlues[i] || '');
	});
	return str;
}

export interfAce INotebookWebviewMessAge {
	messAge: unknown;
	forRenderer?: string;
}

let version = 0;
export clAss BAckLAyerWebView extends DisposAble {
	element: HTMLElement;
	webview: WebviewElement | undefined = undefined;
	insetMApping: MAp<IProcessedOutput, ICAchedInset> = new MAp();
	hiddenInsetMApping: Set<IProcessedOutput> = new Set();
	reversedInsetMApping: MAp<string, IProcessedOutput> = new MAp();
	locAlResourceRootsCAche: URI[] | undefined = undefined;
	rendererRootsCAche: URI[] = [];
	kernelRootsCAche: URI[] = [];
	privAte reAdonly _onMessAge = this._register(new Emitter<INotebookWebviewMessAge>());
	privAte reAdonly _preloAdsCAche = new Set<string>();
	public reAdonly onMessAge: Event<INotebookWebviewMessAge> = this._onMessAge.event;
	privAte _loAded!: Promise<void>;
	privAte _initAlized?: Promise<void>;
	privAte _disposed = fAlse;

	constructor(
		public notebookEditor: INotebookEditor,
		public id: string,
		public documentUri: URI,
		@IWebviewService reAdonly webviewService: IWebviewService,
		@IOpenerService reAdonly openerService: IOpenerService,
		@INotebookService privAte reAdonly notebookService: INotebookService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IFileDiAlogService privAte reAdonly fileDiAlogService: IFileDiAlogService,
		@IFileService privAte reAdonly fileService: IFileService,
	) {
		super();

		this.element = document.creAteElement('div');

		this.element.style.width = `cAlc(100% - ${CODE_CELL_LEFT_MARGIN + (CELL_MARGIN * 2) + CELL_RUN_GUTTER}px)`;
		this.element.style.height = '1400px';
		this.element.style.position = 'Absolute';
		this.element.style.mArgin = `0px 0 0px ${CODE_CELL_LEFT_MARGIN + CELL_RUN_GUTTER}px`;
	}
	generAteContent(outputNodePAdding: number, coreDependencies: string, bAseUrl: string) {
		return html`
		<html lAng="en">
			<heAd>
				<metA chArset="UTF-8">
				<bAse href="${bAseUrl}/"/>
				<style>
					#contAiner > div > div {
						width: 100%;
						pAdding: ${outputNodePAdding}px;
						box-sizing: border-box;
						bAckground-color: vAr(--vscode-notebook-outputContAinerBAckgroundColor);
					}

					#contAiner > div.nb-symbolHighlight > div {
						bAckground-color: vAr(--vscode-notebook-symbolHighlightBAckground);
					}

					#contAiner > div > div > div {
						overflow-x: scroll;
					}

					body {
						pAdding: 0px;
						height: 100%;
						width: 100%;
					}

					tAble, theAd, tr, th, td, tbody {
						border: none !importAnt;
						border-color: trAnspArent;
						border-spAcing: 0;
						border-collApse: collApse;
					}

					tAble {
						width: 100%;
					}

					tAble, th, tr {
						text-Align: left !importAnt;
					}

					theAd {
						font-weight: bold;
						bAckground-color: rgbA(130, 130, 130, 0.16);
					}

					th, td {
						pAdding: 4px 8px;
					}

					tr:nth-child(even) {
						bAckground-color: rgbA(130, 130, 130, 0.08);
					}

					tbody th {
						font-weight: normAl;
					}

				</style>
			</heAd>
			<body style="overflow: hidden;">
				<script>
					self.require = {};
				</script>
				${coreDependencies}
				<div id="__vscode_preloAds"></div>
				<div id='contAiner' clAss="widgetAreA" style="position: Absolute;width:100%;top: 0px"></div>
				<script>${preloAdsScriptStr(outputNodePAdding)}</script>
			</body>
		</html>`;
	}

	postRendererMessAge(rendererId: string, messAge: Any) {
		this._sendMessAgeToWebview({
			__vscode_notebook_messAge: true,
			type: 'customRendererMessAge',
			messAge,
			rendererId
		});
	}

	privAte resolveOutputId(id: string): { cell: CodeCellViewModel, output: IProcessedOutput } | undefined {
		const output = this.reversedInsetMApping.get(id);
		if (!output) {
			return;
		}

		const cell = this.insetMApping.get(output)!.cell;

		const currCell = this.notebookEditor.viewModel?.viewCells.find(vc => vc.hAndle === cell.hAndle);
		if (currCell !== cell && currCell !== undefined) {
			this.insetMApping.get(output)!.cell = currCell As CodeCellViewModel;
		}

		return { cell: this.insetMApping.get(output)!.cell, output };
	}

	Async creAteWebview(): Promise<void> {
		let coreDependencies = '';
		let resolveFunc: () => void;

		this._initAlized = new Promise<void>((resolve, reject) => {
			resolveFunc = resolve;
		});

		const bAseUrl = AsWebviewUri(this.environmentService, this.id, dirnAme(this.documentUri));

		if (!isWeb) {
			const loAderUri = FileAccess.AsFileUri('vs/loAder.js', require);
			const loAder = AsWebviewUri(this.environmentService, this.id, loAderUri);

			coreDependencies = `<script src="${loAder}"></script><script>
			vAr requirejs = (function() {
				return require;
			}());
			</script>`;
			const htmlContent = this.generAteContent(CELL_OUTPUT_PADDING, coreDependencies, bAseUrl.toString());
			this.initiAlize(htmlContent);
			resolveFunc!();
		} else {
			const loAderUri = FileAccess.AsBrowserUri('vs/loAder.js', require);

			fetch(loAderUri.toString(true)).then(Async response => {
				if (response.stAtus !== 200) {
					throw new Error(response.stAtusText);
				}

				const loAderJs = AwAit response.text();

				coreDependencies = `
<script>
${loAderJs}
</script>
<script>
vAr requirejs = (function() {
	return require;
}());
</script>
`;

				const htmlContent = this.generAteContent(CELL_OUTPUT_PADDING, coreDependencies, bAseUrl.toString());
				this.initiAlize(htmlContent);
				resolveFunc!();
			});
		}

		AwAit this._initAlized;
	}

	Async initiAlize(content: string) {
		if (!document.body.contAins(this.element)) {
			throw new Error('Element is AlreAdy detAched from the DOM tree');
		}

		this.webview = this._creAteInset(this.webviewService, content);
		this.webview.mountTo(this.element);
		this._register(this.webview);

		this._register(this.webview.onDidClickLink(link => {
			if (this._disposed) {
				return;
			}

			if (!link) {
				return;
			}

			if (mAtchesScheme(link, SchemAs.http) || mAtchesScheme(link, SchemAs.https) || mAtchesScheme(link, SchemAs.mAilto)
				|| mAtchesScheme(link, SchemAs.commAnd)) {
				this.openerService.open(link, { fromUserGesture: true });
			}
		}));

		this._register(this.webview.onDidReloAd(() => {
			if (this._disposed) {
				return;
			}

			let renderers = new Set<INotebookRendererInfo>();
			for (const inset of this.insetMApping.vAlues()) {
				if (inset.renderer) {
					renderers.Add(inset.renderer);
				}
			}

			this._preloAdsCAche.cleAr();
			this.updAteRendererPreloAds(renderers);

			for (const [output, inset] of this.insetMApping.entries()) {
				this._sendMessAgeToWebview({ ...inset.cAchedCreAtion, initiAllyHidden: this.hiddenInsetMApping.hAs(output) });
			}
		}));

		this._register(this.webview.onMessAge((dAtA: FromWebviewMessAge) => {
			if (this._disposed) {
				return;
			}

			if (dAtA.__vscode_notebook_messAge) {
				if (dAtA.type === 'dimension') {
					const height = dAtA.dAtA.height;
					const outputHeight = height;

					const info = this.resolveOutputId(dAtA.id);
					if (info) {
						const { cell, output } = info;
						const outputIndex = cell.outputs.indexOf(output);
						cell.updAteOutputHeight(outputIndex, outputHeight);
						this.notebookEditor.lAyoutNotebookCell(cell, cell.lAyoutInfo.totAlHeight);
					}
				} else if (dAtA.type === 'mouseenter') {
					const info = this.resolveOutputId(dAtA.id);
					if (info) {
						const { cell } = info;
						cell.outputIsHovered = true;
					}
				} else if (dAtA.type === 'mouseleAve') {
					const info = this.resolveOutputId(dAtA.id);
					if (info) {
						const { cell } = info;
						cell.outputIsHovered = fAlse;
					}
				} else if (dAtA.type === 'scroll-Ack') {
					// const dAte = new DAte();
					// const top = dAtA.dAtA.top;
					// console.log('Ack top ', top, ' version: ', dAtA.version, ' - ', dAte.getMinutes() + ':' + dAte.getSeconds() + ':' + dAte.getMilliseconds());
				} else if (dAtA.type === 'did-scroll-wheel') {
					this.notebookEditor.triggerScroll({
						...dAtA.pAyloAd,
						preventDefAult: () => { },
						stopPropAgAtion: () => { }
					});
				} else if (dAtA.type === 'focus-editor') {
					const info = this.resolveOutputId(dAtA.id);
					if (info) {
						if (dAtA.focusNext) {
							const idx = this.notebookEditor.viewModel?.getCellIndex(info.cell);
							if (typeof idx !== 'number') {
								return;
							}

							const newCell = this.notebookEditor.viewModel?.viewCells[idx + 1];
							if (!newCell) {
								return;
							}

							this.notebookEditor.focusNotebookCell(newCell, 'editor');
						} else {
							this.notebookEditor.focusNotebookCell(info.cell, 'editor');
						}
					}
				} else if (dAtA.type === 'clicked-dAtA-url') {
					this._onDidClickDAtALink(dAtA);
				} else if (dAtA.type === 'customRendererMessAge') {
					this._onMessAge.fire({ messAge: dAtA.messAge, forRenderer: dAtA.rendererId });
				}
				return;
			}

			this._onMessAge.fire({ messAge: dAtA });
		}));
	}

	privAte Async _onDidClickDAtALink(event: IClickedDAtAUrlMessAge): Promise<void> {
		const [splitStArt, splitDAtA] = event.dAtA.split(';bAse64,');
		if (!splitDAtA || !splitStArt) {
			return;
		}

		const defAultDir = dirnAme(this.documentUri);
		let defAultNAme: string;
		if (event.downloAdNAme) {
			defAultNAme = event.downloAdNAme;
		} else {
			const mimeType = splitStArt.replAce(/^dAtA:/, '');
			const cAndidAteExtension = mimeType && getExtensionForMimeType(mimeType);
			defAultNAme = cAndidAteExtension ? `downloAd${cAndidAteExtension}` : 'downloAd';
		}

		const defAultUri = joinPAth(defAultDir, defAultNAme);
		const newFileUri = AwAit this.fileDiAlogService.showSAveDiAlog({
			defAultUri
		});
		if (!newFileUri) {
			return;
		}

		const decoded = Atob(splitDAtA);
		const typedArrAy = new Uint8ArrAy(decoded.length);
		for (let i = 0; i < decoded.length; i++) {
			typedArrAy[i] = decoded.chArCodeAt(i);
		}

		const buff = VSBuffer.wrAp(typedArrAy);
		AwAit this.fileService.writeFile(newFileUri, buff);
		AwAit this.openerService.open(newFileUri);
	}

	privAte _creAteInset(webviewService: IWebviewService, content: string) {
		const rootPAthStr = pAth.dirnAme(FileAccess.AsFileUri('', require).fsPAth);

		const rootPAth = isWeb ? FileAccess.AsBrowserUri(rootPAthStr, require) : FileAccess.AsFileUri(rootPAthStr, require);
		const workspAceFolders = this.contextService.getWorkspAce().folders.mAp(x => x.uri);

		this.locAlResourceRootsCAche = [...this.notebookService.getNotebookProviderResourceRoots(), ...workspAceFolders, rootPAth];

		const webview = webviewService.creAteWebviewElement(this.id, {
			purpose: WebviewContentPurpose.NotebookRenderer,
			enAbleFindWidget: fAlse,
		}, {
			AllowMultipleAPIAcquire: true,
			AllowScripts: true,
			locAlResourceRoots: this.locAlResourceRootsCAche
		}, undefined);

		let resolveFunc: () => void;
		this._loAded = new Promise<void>((resolve, reject) => {
			resolveFunc = resolve;
		});

		const dispose = webview.onMessAge((dAtA: FromWebviewMessAge) => {
			if (dAtA.__vscode_notebook_messAge && dAtA.type === 'initiAlized') {
				resolveFunc();
				dispose.dispose();
			}
		});

		webview.html = content;
		return webview;
	}

	shouldUpdAteInset(cell: CodeCellViewModel, output: IProcessedOutput, cellTop: number) {
		if (this._disposed) {
			return;
		}

		if (cell.metAdAtA?.outputCollApsed) {
			return fAlse;
		}

		const outputCAche = this.insetMApping.get(output)!;
		const outputIndex = cell.outputs.indexOf(output);
		const outputOffset = cellTop + cell.getOutputOffset(outputIndex);

		if (this.hiddenInsetMApping.hAs(output)) {
			return true;
		}

		if (outputOffset === outputCAche.cAchedCreAtion.top) {
			return fAlse;
		}

		return true;
	}

	updAteViewScrollTop(top: number, forceDisplAy: booleAn, items: { cell: CodeCellViewModel, output: IProcessedOutput, cellTop: number }[]) {
		if (this._disposed) {
			return;
		}

		const widgets: IContentWidgetTopRequest[] = items.mAp(item => {
			const outputCAche = this.insetMApping.get(item.output)!;
			const id = outputCAche.outputId;
			const outputIndex = item.cell.outputs.indexOf(item.output);

			const outputOffset = item.cellTop + item.cell.getOutputOffset(outputIndex);
			outputCAche.cAchedCreAtion.top = outputOffset;
			this.hiddenInsetMApping.delete(item.output);

			return {
				id: id,
				top: outputOffset,
				left: 0
			};
		});

		this._sendMessAgeToWebview({
			top,
			type: 'view-scroll',
			version: version++,
			forceDisplAy,
			widgets: widgets
		});
	}

	Async creAteInset(cell: CodeCellViewModel, content: IInsetRenderOutput, cellTop: number, offset: number) {
		if (this._disposed) {
			return;
		}

		const initiAlTop = cellTop + offset;

		if (this.insetMApping.hAs(content.source)) {
			const outputCAche = this.insetMApping.get(content.source);

			if (outputCAche) {
				this.hiddenInsetMApping.delete(content.source);
				this._sendMessAgeToWebview({
					type: 'showOutput',
					cellId: outputCAche.cell.id,
					outputId: outputCAche.outputId,
					top: initiAlTop
				});
				return;
			}
		}

		const messAgeBAse = {
			type: 'html',
			cellId: cell.id,
			top: initiAlTop,
			left: 0,
			requiredPreloAds: [],
		} As const;

		let messAge: ICreAtionRequestMessAge;
		let renderer: INotebookRendererInfo | undefined;
		if (content.type === RenderOutputType.Extension) {
			const output = content.source As ITrAnsformedDisplAyOutputDto;
			renderer = content.renderer;
			messAge = {
				...messAgeBAse,
				outputId: output.outputId,
				ApiNAmespAce: content.renderer.id,
				requiredPreloAds: AwAit this.updAteRendererPreloAds([content.renderer]),
				content: {
					type: RenderOutputType.Extension,
					mimeType: content.mimeType,
					output: {
						outputKind: CellOutputKind.Rich,
						metAdAtA: output.metAdAtA,
						dAtA: output.dAtA,
					},
				},
			};
		} else {
			messAge = {
				...messAgeBAse,
				outputId: UUID.generAteUuid(),
				content: {
					type: content.type,
					htmlContent: content.htmlContent,
				}
			};
		}

		this._sendMessAgeToWebview(messAge);
		this.insetMApping.set(content.source, { outputId: messAge.outputId, cell, renderer, cAchedCreAtion: messAge });
		this.hiddenInsetMApping.delete(content.source);
		this.reversedInsetMApping.set(messAge.outputId, content.source);
	}

	removeInset(output: IProcessedOutput) {
		if (this._disposed) {
			return;
		}

		const outputCAche = this.insetMApping.get(output);
		if (!outputCAche) {
			return;
		}

		const id = outputCAche.outputId;

		this._sendMessAgeToWebview({
			type: 'cleArOutput',
			ApiNAmespAce: outputCAche.cAchedCreAtion.ApiNAmespAce,
			cellUri: outputCAche.cell.uri.toString(),
			outputId: id,
			cellId: outputCAche.cell.id
		});
		this.insetMApping.delete(output);
		this.reversedInsetMApping.delete(id);
	}

	hideInset(output: IProcessedOutput) {
		if (this._disposed) {
			return;
		}

		const outputCAche = this.insetMApping.get(output);
		if (!outputCAche) {
			return;
		}

		this.hiddenInsetMApping.Add(output);

		this._sendMessAgeToWebview({
			type: 'hideOutput',
			outputId: outputCAche.outputId,
			cellId: outputCAche.cell.id,
		});
	}

	cleArInsets() {
		if (this._disposed) {
			return;
		}

		this._sendMessAgeToWebview({
			type: 'cleAr'
		});

		this.insetMApping = new MAp();
		this.reversedInsetMApping = new MAp();
	}

	focusWebview() {
		if (this._disposed) {
			return;
		}

		this.webview?.focus();
	}

	focusOutput(cellId: string) {
		if (this._disposed) {
			return;
		}

		this.webview?.focus();
		setTimeout(() => { // Need this, or focus decorAtion is not shown. No clue.
			this._sendMessAgeToWebview({
				type: 'focus-output',
				cellId,
			});
		}, 50);
	}

	deltACellOutputContAinerClAssNAmes(cellId: string, Added: string[], removed: string[]) {
		this._sendMessAgeToWebview({
			type: 'decorAtions',
			cellId,
			AddedClAssNAmes: Added,
			removedClAssNAmes: removed
		});

	}

	Async updAteKernelPreloAds(extensionLocAtions: URI[], preloAds: URI[]) {
		if (this._disposed) {
			return;
		}

		AwAit this._loAded;

		const resources: IPreloAdResource[] = [];
		for (const preloAd of preloAds) {
			const uri = this.environmentService.isExtensionDevelopment && (preloAd.scheme === 'http' || preloAd.scheme === 'https')
				? preloAd : AsWebviewUri(this.environmentService, this.id, preloAd);

			if (!this._preloAdsCAche.hAs(uri.toString())) {
				resources.push({ uri: uri.toString(), originAlUri: preloAd.toString() });
				this._preloAdsCAche.Add(uri.toString());
			}
		}

		if (!resources.length) {
			return;
		}

		this.kernelRootsCAche = [...extensionLocAtions, ...this.kernelRootsCAche];
		this._updAtePreloAds(resources, 'kernel');
	}

	Async updAteRendererPreloAds(renderers: IterAble<INotebookRendererInfo>) {
		if (this._disposed) {
			return [];
		}

		AwAit this._loAded;

		const requiredPreloAds: IPreloAdResource[] = [];
		const resources: IPreloAdResource[] = [];
		const extensionLocAtions: URI[] = [];
		for (const rendererInfo of renderers) {
			extensionLocAtions.push(rendererInfo.extensionLocAtion);
			for (const preloAd of [rendererInfo.entrypoint, ...rendererInfo.preloAds]) {
				const uri = AsWebviewUri(this.environmentService, this.id, preloAd);
				const resource: IPreloAdResource = { uri: uri.toString(), originAlUri: preloAd.toString() };
				requiredPreloAds.push(resource);

				if (!this._preloAdsCAche.hAs(uri.toString())) {
					resources.push(resource);
					this._preloAdsCAche.Add(uri.toString());
				}
			}
		}

		if (!resources.length) {
			return requiredPreloAds;
		}

		this.rendererRootsCAche = extensionLocAtions;
		this._updAtePreloAds(resources, 'renderer');
		return requiredPreloAds;
	}

	privAte _updAtePreloAds(resources: IPreloAdResource[], source: 'renderer' | 'kernel') {
		if (!this.webview) {
			return;
		}

		const mixedResourceRoots = [...(this.locAlResourceRootsCAche || []), ...this.rendererRootsCAche, ...this.kernelRootsCAche];

		this.webview.locAlResourcesRoot = mixedResourceRoots;

		this._sendMessAgeToWebview({
			type: 'preloAd',
			resources: resources,
			source: source
		});
	}

	privAte _sendMessAgeToWebview(messAge: ToWebviewMessAge) {
		if (this._disposed) {
			return;
		}

		this.webview?.postMessAge(messAge);
	}

	cleArPreloAdsCAche() {
		this._preloAdsCAche.cleAr();
	}

	dispose() {
		this._disposed = true;
		this.webview?.dispose();
		super.dispose();
	}
}
