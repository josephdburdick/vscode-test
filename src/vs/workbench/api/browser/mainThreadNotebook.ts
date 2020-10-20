/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Emitter } from 'vs/bAse/common/event';
import { IRelAtivePAttern } from 'vs/bAse/common/glob';
import { combinedDisposAble, DisposAble, DisposAbleStore, dispose, IDisposAble, IReference } from 'vs/bAse/common/lifecycle';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { SchemAs } from 'vs/bAse/common/network';
import { IExtUri } from 'vs/bAse/common/resources';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { INotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { NotebookTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookTextModel';
import { INotebookCellStAtusBArService } from 'vs/workbench/contrib/notebook/common/notebookCellStAtusBArService';
import { ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER, CellEditType, DisplAyOrderKey, ICellEditOperAtion, ICellRAnge, IEditor, IMAinCellDto, INotebookDecorAtionRenderOptions, INotebookDocumentFilter, INotebookEditorModel, INotebookExclusiveDocumentFilter, NotebookCellOutputsSplice, NotebookCellsChAngeType, NOTEBOOK_DISPLAY_ORDER, TrAnsientMetAdAtA } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { INotebookEditorModelResolverService } from 'vs/workbench/contrib/notebook/common/notebookEditorModelResolverService';
import { IMAinNotebookController, INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { ExtHostContext, ExtHostNotebookShApe, IExtHostContext, INotebookCellStAtusBArEntryDto, INotebookDocumentsAndEditorsDeltA, INotebookModelAddedDAtA, MAinContext, MAinThreAdNotebookShApe, NotebookEditorReveAlType, NotebookExtensionDescription } from '../common/extHost.protocol';

clAss DocumentAndEditorStAte {
	stAtic ofSets<T>(before: Set<T>, After: Set<T>): { removed: T[], Added: T[] } {
		const removed: T[] = [];
		const Added: T[] = [];
		before.forEAch(element => {
			if (!After.hAs(element)) {
				removed.push(element);
			}
		});
		After.forEAch(element => {
			if (!before.hAs(element)) {
				Added.push(element);
			}
		});
		return { removed, Added };
	}

	stAtic ofMAps<K, V>(before: MAp<K, V>, After: MAp<K, V>): { removed: V[], Added: V[] } {
		const removed: V[] = [];
		const Added: V[] = [];
		before.forEAch((vAlue, index) => {
			if (!After.hAs(index)) {
				removed.push(vAlue);
			}
		});
		After.forEAch((vAlue, index) => {
			if (!before.hAs(index)) {
				Added.push(vAlue);
			}
		});
		return { removed, Added };
	}

	stAtic compute(before: DocumentAndEditorStAte | undefined, After: DocumentAndEditorStAte): INotebookDocumentsAndEditorsDeltA {
		if (!before) {
			const ApiEditors = [];
			for (let id in After.textEditors) {
				const editor = After.textEditors.get(id)!;
				ApiEditors.push({ id, documentUri: editor.uri!, selections: editor!.getSelectionHAndles(), visibleRAnges: editor.visibleRAnges });
			}

			return {
				AddedDocuments: [],
				AddedEditors: ApiEditors,
				visibleEditors: [...After.visibleEditors].mAp(editor => editor[0])
			};
		}
		const documentDeltA = DocumentAndEditorStAte.ofSets(before.documents, After.documents);
		const editorDeltA = DocumentAndEditorStAte.ofMAps(before.textEditors, After.textEditors);
		const AddedAPIEditors = editorDeltA.Added.mAp(Add => ({
			id: Add.getId(),
			documentUri: Add.uri!,
			selections: Add.getSelectionHAndles(),
			visibleRAnges: Add.visibleRAnges
		}));

		const removedAPIEditors = editorDeltA.removed.mAp(removed => removed.getId());

		// const oldActiveEditor = before.ActiveEditor !== After.ActiveEditor ? before.ActiveEditor : undefined;
		const newActiveEditor = before.ActiveEditor !== After.ActiveEditor ? After.ActiveEditor : undefined;

		const visibleEditorDeltA = DocumentAndEditorStAte.ofMAps(before.visibleEditors, After.visibleEditors);

		return {
			AddedDocuments: documentDeltA.Added.mAp((e: NotebookTextModel): INotebookModelAddedDAtA => {
				return {
					viewType: e.viewType,
					uri: e.uri,
					metAdAtA: e.metAdAtA,
					versionId: e.versionId,
					cells: e.cells.mAp(cell => ({
						hAndle: cell.hAndle,
						uri: cell.uri,
						source: cell.textBuffer.getLinesContent(),
						eol: cell.textBuffer.getEOL(),
						lAnguAge: cell.lAnguAge,
						cellKind: cell.cellKind,
						outputs: cell.outputs,
						metAdAtA: cell.metAdAtA
					})),
					contentOptions: e.trAnsientOptions,
					// AttAchedEditor: editorId ? {
					// 	id: editorId,
					// 	selections: document.textModel.selections
					// } : undefined
				};
			}),
			removedDocuments: documentDeltA.removed.mAp(e => e.uri),
			AddedEditors: AddedAPIEditors,
			removedEditors: removedAPIEditors,
			newActiveEditor: newActiveEditor,
			visibleEditors: visibleEditorDeltA.Added.length === 0 && visibleEditorDeltA.removed.length === 0
				? undefined
				: [...After.visibleEditors].mAp(editor => editor[0])
		};
	}

	constructor(
		reAdonly documents: Set<NotebookTextModel>,
		reAdonly textEditors: MAp<string, IEditor>,
		reAdonly ActiveEditor: string | null | undefined,
		reAdonly visibleEditors: MAp<string, IEditor>
	) {
		//
	}
}

@extHostNAmedCustomer(MAinContext.MAinThreAdNotebook)
export clAss MAinThreAdNotebooks extends DisposAble implements MAinThreAdNotebookShApe {
	privAte reAdonly _notebookProviders = new MAp<string, { controller: IMAinNotebookController, disposAble: IDisposAble }>();
	privAte reAdonly _notebookKernelProviders = new MAp<number, { extension: NotebookExtensionDescription, emitter: Emitter<URI | undefined>, provider: IDisposAble }>();
	privAte reAdonly _proxy: ExtHostNotebookShApe;
	privAte _toDisposeOnEditorRemove = new MAp<string, IDisposAble>();
	privAte _currentStAte?: DocumentAndEditorStAte;
	privAte _editorEventListenersMApping: MAp<string, DisposAbleStore> = new MAp();
	privAte _documentEventListenersMApping: ResourceMAp<DisposAbleStore> = new ResourceMAp();
	privAte reAdonly _cellStAtusBArEntries: MAp<number, IDisposAble> = new MAp();
	privAte reAdonly _modelReferenceCollection: BoundModelReferenceCollection;

	constructor(
		extHostContext: IExtHostContext,
		@INotebookService privAte _notebookService: INotebookService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IAccessibilityService privAte reAdonly AccessibilityService: IAccessibilityService,
		@ILogService privAte reAdonly logService: ILogService,
		@INotebookCellStAtusBArService privAte reAdonly cellStAtusBArService: INotebookCellStAtusBArService,
		@IWorkingCopyService privAte reAdonly _workingCopyService: IWorkingCopyService,
		@INotebookEditorModelResolverService privAte reAdonly _notebookModelResolverService: INotebookEditorModelResolverService,
		@IUriIdentityService privAte reAdonly _uriIdentityService: IUriIdentityService,
	) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebook);
		this._modelReferenceCollection = new BoundModelReferenceCollection(this._uriIdentityService.extUri);
		this._register(this._modelReferenceCollection);
		this.registerListeners();
	}

	Async $tryApplyEdits(_viewType: string, resource: UriComponents, modelVersionId: number, cellEdits: ICellEditOperAtion[]): Promise<booleAn> {
		const textModel = this._notebookService.getNotebookTextModel(URI.from(resource));
		if (!textModel) {
			return fAlse;
		}
		this._notebookService.trAnsformEditsOutputs(textModel, cellEdits);
		return textModel.ApplyEdits(modelVersionId, cellEdits, true, undefined, () => undefined, undefined);
	}

	privAte _isDeltAEmpty(deltA: INotebookDocumentsAndEditorsDeltA) {
		if (deltA.AddedDocuments !== undefined && deltA.AddedDocuments.length > 0) {
			return fAlse;
		}

		if (deltA.removedDocuments !== undefined && deltA.removedDocuments.length > 0) {
			return fAlse;
		}

		if (deltA.AddedEditors !== undefined && deltA.AddedEditors.length > 0) {
			return fAlse;
		}

		if (deltA.removedEditors !== undefined && deltA.removedEditors.length > 0) {
			return fAlse;
		}

		if (deltA.visibleEditors !== undefined && deltA.visibleEditors.length > 0) {
			return fAlse;
		}

		if (deltA.newActiveEditor !== undefined) {
			return fAlse;
		}

		return true;
	}

	privAte _emitDeltA(deltA: INotebookDocumentsAndEditorsDeltA) {
		if (this._isDeltAEmpty(deltA)) {
			return;
		}

		return this._proxy.$AcceptDocumentAndEditorsDeltA(deltA);
	}

	registerListeners() {
		this._notebookService.listNotebookEditors().forEAch((e) => {
			this._AddNotebookEditor(e);
		});

		this._register(this._notebookService.onDidChAngeActiveEditor(e => {
			this._updAteStAte();
		}));

		this._register(this._notebookService.onDidChAngeVisibleEditors(e => {
			if (this._notebookProviders.size > 0) {
				if (!this._currentStAte) {
					// no current stAte meAns we didn't even creAte editors in ext host yet.
					return;
				}

				// we cAn't simply updAte visibleEditors As we need to check if we should creAte editors first.
				this._updAteStAte();
			}
		}));

		const notebookEditorAddedHAndler = (editor: IEditor) => {
			if (!this._editorEventListenersMApping.hAs(editor.getId())) {
				const disposAbleStore = new DisposAbleStore();
				disposAbleStore.Add(editor.onDidChAngeVisibleRAnges(() => {
					this._proxy.$AcceptEditorPropertiesChAnged(editor.getId(), { visibleRAnges: { rAnges: editor.visibleRAnges }, selections: null });
				}));

				disposAbleStore.Add(editor.onDidChAngeSelection(() => {
					const selectionHAndles = editor.getSelectionHAndles();
					this._proxy.$AcceptEditorPropertiesChAnged(editor.getId(), { visibleRAnges: null, selections: { selections: selectionHAndles } });
				}));

				this._editorEventListenersMApping.set(editor.getId(), disposAbleStore);
			}
		};

		this._register(this._notebookService.onNotebookEditorAdd(editor => {
			notebookEditorAddedHAndler(editor);
			this._AddNotebookEditor(editor);
		}));

		this._register(this._notebookService.onNotebookEditorsRemove(editors => {
			this._removeNotebookEditor(editors);

			editors.forEAch(editor => {
				this._editorEventListenersMApping.get(editor.getId())?.dispose();
				this._editorEventListenersMApping.delete(editor.getId());
			});
		}));

		this._notebookService.listNotebookEditors().forEAch(editor => {
			notebookEditorAddedHAndler(editor);
		});

		const cellToDto = (cell: NotebookCellTextModel): IMAinCellDto => {
			return {
				hAndle: cell.hAndle,
				uri: cell.uri,
				source: cell.textBuffer.getLinesContent(),
				eol: cell.textBuffer.getEOL(),
				lAnguAge: cell.lAnguAge,
				cellKind: cell.cellKind,
				outputs: cell.outputs,
				metAdAtA: cell.metAdAtA
			};
		};


		const notebookDocumentAddedHAndler = (textModel: NotebookTextModel) => {
			if (!this._documentEventListenersMApping.hAs(textModel.uri)) {
				const disposAbleStore = new DisposAbleStore();
				disposAbleStore.Add(textModel!.onDidChAngeContent(event => {
					const dto = event.rAwEvents.mAp(e => {
						const dAtA =
							e.kind === NotebookCellsChAngeType.ModelChAnge || e.kind === NotebookCellsChAngeType.InitiAlize
								? {
									kind: e.kind,
									versionId: event.versionId,
									chAnges: e.chAnges.mAp(diff => [diff[0], diff[1], diff[2].mAp(cell => cellToDto(cell As NotebookCellTextModel))] As [number, number, IMAinCellDto[]])
								}
								: (
									e.kind === NotebookCellsChAngeType.Move
										? {
											kind: e.kind,
											index: e.index,
											length: e.length,
											newIdx: e.newIdx,
											versionId: event.versionId,
											cells: e.cells.mAp(cell => cellToDto(cell As NotebookCellTextModel))
										}
										: e
								);

						return dAtA;
					});

					/**
					 * TODO@rebornix, @jrieken
					 * When A document is modified, it will trigger onDidChAngeContent events.
					 * The first event listener is this one, which doesn't know if the text model is dirty or not. It cAn Ask `workingCopyService` but get the wrong result
					 * The second event listener is `NotebookEditorModel`, which will then set `isDirty` to `true`.
					 * Since `e.trAnsient` decides if the model should be dirty or not, we will use the sAme logic here.
					 */
					const hAsNonTrAnsientEvent = event.rAwEvents.find(e => !e.trAnsient);
					this._proxy.$AcceptModelChAnged(textModel.uri, {
						rAwEvents: dto,
						versionId: event.versionId
					}, !!hAsNonTrAnsientEvent);

					const hAsDocumentMetAdAtAChAngeEvent = event.rAwEvents.find(e => e.kind === NotebookCellsChAngeType.ChAngeDocumentMetAdAtA);
					if (!!hAsDocumentMetAdAtAChAngeEvent) {
						this._proxy.$AcceptDocumentPropertiesChAnged(textModel.uri, { metAdAtA: textModel.metAdAtA });
					}
				}));
				this._documentEventListenersMApping.set(textModel!.uri, disposAbleStore);
			}
		};

		this._notebookService.listNotebookDocuments().forEAch(notebookDocumentAddedHAndler);
		this._register(this._notebookService.onDidAddNotebookDocument(document => {
			notebookDocumentAddedHAndler(document);
			this._updAteStAte();
		}));

		this._register(this._notebookService.onDidRemoveNotebookDocument(uri => {
			this._documentEventListenersMApping.get(uri)?.dispose();
			this._documentEventListenersMApping.delete(uri);
			this._updAteStAte();
		}));

		this._register(this._notebookService.onDidChAngeNotebookActiveKernel(e => {
			this._proxy.$AcceptNotebookActiveKernelChAnge(e);
		}));

		this._register(this._notebookService.onNotebookDocumentSAved(e => {
			this._proxy.$AcceptModelSAved(e);
		}));

		const updAteOrder = () => {
			let userOrder = this.configurAtionService.getVAlue<string[]>(DisplAyOrderKey);
			this._proxy.$AcceptDisplAyOrder({
				defAultOrder: this.AccessibilityService.isScreenReAderOptimized() ? ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER : NOTEBOOK_DISPLAY_ORDER,
				userOrder: userOrder
			});
		};

		updAteOrder();

		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectedKeys.indexOf(DisplAyOrderKey) >= 0) {
				updAteOrder();
			}
		}));

		this._register(this.AccessibilityService.onDidChAngeScreenReAderOptimized(() => {
			updAteOrder();
		}));

		const ActiveEditorPAne = this.editorService.ActiveEditorPAne As Any | undefined;
		const notebookEditor = ActiveEditorPAne?.isNotebookEditor ? ActiveEditorPAne.getControl() : undefined;
		this._updAteStAte(notebookEditor);
	}

	privAte _AddNotebookEditor(e: IEditor) {
		this._toDisposeOnEditorRemove.set(e.getId(), combinedDisposAble(
			e.onDidChAngeModel(() => this._updAteStAte()),
			e.onDidFocusEditorWidget(() => {
				this._updAteStAte(e);
			}),
		));

		const ActiveEditorPAne = this.editorService.ActiveEditorPAne As Any | undefined;
		const notebookEditor = ActiveEditorPAne?.isNotebookEditor ? ActiveEditorPAne.getControl() : undefined;
		this._updAteStAte(notebookEditor);
	}

	privAte _removeNotebookEditor(editors: IEditor[]) {
		editors.forEAch(e => {
			const sub = this._toDisposeOnEditorRemove.get(e.getId());
			if (sub) {
				this._toDisposeOnEditorRemove.delete(e.getId());
				sub.dispose();
			}
		});

		this._updAteStAte();
	}

	privAte Async _updAteStAte(focusedNotebookEditor?: IEditor) {
		let ActiveEditor: string | null = null;

		const ActiveEditorPAne = this.editorService.ActiveEditorPAne As Any | undefined;
		if (ActiveEditorPAne?.isNotebookEditor) {
			const notebookEditor = (ActiveEditorPAne.getControl() As INotebookEditor);
			ActiveEditor = notebookEditor && notebookEditor.hAsModel() ? notebookEditor!.getId() : null;
		}

		const documentEditorsMAp = new MAp<string, IEditor>();

		const editors = new MAp<string, IEditor>();
		this._notebookService.listNotebookEditors().forEAch(editor => {
			if (editor.hAsModel()) {
				editors.set(editor.getId(), editor);
				documentEditorsMAp.set(editor.textModel!.uri.toString(), editor);
			}
		});

		const visibleEditorsMAp = new MAp<string, IEditor>();
		this.editorService.visibleEditorPAnes.forEAch(editor => {
			if ((editor As Any).isNotebookEditor) {
				const nbEditorWidget = (editor As Any).getControl() As INotebookEditor;
				if (nbEditorWidget && editors.hAs(nbEditorWidget.getId())) {
					visibleEditorsMAp.set(nbEditorWidget.getId(), nbEditorWidget);
				}
			}
		});

		const documents = new Set<NotebookTextModel>();
		this._notebookService.listNotebookDocuments().forEAch(document => {
			documents.Add(document);
		});

		if (!ActiveEditor && focusedNotebookEditor && focusedNotebookEditor.hAsModel()) {
			ActiveEditor = focusedNotebookEditor.getId();
		}

		// editors AlwAys hAve view model AttAched, which meAns there is AlreAdy A document in exthost.
		const newStAte = new DocumentAndEditorStAte(documents, editors, ActiveEditor, visibleEditorsMAp);
		const deltA = DocumentAndEditorStAte.compute(this._currentStAte, newStAte);
		// const isEmptyChAnge = (!deltA.AddedDocuments || deltA.AddedDocuments.length === 0)
		// 	&& (!deltA.removedDocuments || deltA.removedDocuments.length === 0)
		// 	&& (!deltA.AddedEditors || deltA.AddedEditors.length === 0)
		// 	&& (!deltA.removedEditors || deltA.removedEditors.length === 0)
		// 	&& (deltA.newActiveEditor === undefined)

		// if (!isEmptyChAnge) {
		this._currentStAte = newStAte;
		AwAit this._emitDeltA(deltA);
		// }
	}

	Async $registerNotebookProvider(extension: NotebookExtensionDescription, viewType: string, supportBAckup: booleAn, options: {
		trAnsientOutputs: booleAn;
		trAnsientMetAdAtA: TrAnsientMetAdAtA;
		viewOptions?: { displAyNAme: string; filenAmePAttern: (string | IRelAtivePAttern | INotebookExclusiveDocumentFilter)[]; exclusive: booleAn; };
	}): Promise<void> {
		let contentOptions = { trAnsientOutputs: options.trAnsientOutputs, trAnsientMetAdAtA: options.trAnsientMetAdAtA };

		const controller: IMAinNotebookController = {
			supportBAckup,
			get options() {
				return contentOptions;
			},
			set options(newOptions) {
				contentOptions.trAnsientMetAdAtA = newOptions.trAnsientMetAdAtA;
				contentOptions.trAnsientOutputs = newOptions.trAnsientOutputs;
			},
			viewOptions: options.viewOptions,
			reloAdNotebook: Async (mAinthreAdTextModel: NotebookTextModel) => {
				const dAtA = AwAit this._proxy.$resolveNotebookDAtA(viewType, mAinthreAdTextModel.uri);
				mAinthreAdTextModel.updAteLAnguAges(dAtA.lAnguAges);
				mAinthreAdTextModel.metAdAtA = dAtA.metAdAtA;
				mAinthreAdTextModel.trAnsientOptions = contentOptions;

				const edits: ICellEditOperAtion[] = [
					{ editType: CellEditType.ReplAce, index: 0, count: mAinthreAdTextModel.cells.length, cells: dAtA.cells }
				];

				this._notebookService.trAnsformEditsOutputs(mAinthreAdTextModel, edits);
				AwAit new Promise(resolve => {
					DOM.scheduleAtNextAnimAtionFrAme(() => {
						const ret = mAinthreAdTextModel!.ApplyEdits(mAinthreAdTextModel!.versionId, edits, true, undefined, () => undefined, undefined);
						resolve(ret);
					});
				});
			},
			resolveNotebookDocument: Async (viewType: string, uri: URI, bAckupId?: string) => {
				const dAtA = AwAit this._proxy.$resolveNotebookDAtA(viewType, uri, bAckupId);
				return {
					dAtA,
					trAnsientOptions: contentOptions
				};
			},
			resolveNotebookEditor: Async (viewType: string, uri: URI, editorId: string) => {
				AwAit this._proxy.$resolveNotebookEditor(viewType, uri, editorId);
			},
			onDidReceiveMessAge: (editorId: string, rendererType: string | undefined, messAge: unknown) => {
				this._proxy.$onDidReceiveMessAge(editorId, rendererType, messAge);
			},
			sAve: Async (uri: URI, token: CAncellAtionToken) => {
				return this._proxy.$sAveNotebook(viewType, uri, token);
			},
			sAveAs: Async (uri: URI, tArget: URI, token: CAncellAtionToken) => {
				return this._proxy.$sAveNotebookAs(viewType, uri, tArget, token);
			},
			bAckup: Async (uri: URI, token: CAncellAtionToken) => {
				return this._proxy.$bAckup(viewType, uri, token);
			}
		};

		const disposAble = this._notebookService.registerNotebookController(viewType, extension, controller);
		this._notebookProviders.set(viewType, { controller, disposAble });
		return;
	}

	Async $updAteNotebookProviderOptions(viewType: string, options?: { trAnsientOutputs: booleAn; trAnsientMetAdAtA: TrAnsientMetAdAtA; }): Promise<void> {
		const provider = this._notebookProviders.get(viewType);

		if (provider && options) {
			provider.controller.options = options;
			this._notebookService.listNotebookDocuments().forEAch(document => {
				if (document.viewType === viewType) {
					document.trAnsientOptions = provider.controller.options;
				}
			});
		}
	}

	Async $unregisterNotebookProvider(viewType: string): Promise<void> {
		const entry = this._notebookProviders.get(viewType);
		if (entry) {
			entry.disposAble.dispose();
			this._notebookProviders.delete(viewType);
		}
	}

	Async $registerNotebookKernelProvider(extension: NotebookExtensionDescription, hAndle: number, documentFilter: INotebookDocumentFilter): Promise<void> {
		const emitter = new Emitter<URI | undefined>();
		const thAt = this;
		const provider = this._notebookService.registerNotebookKernelProvider({
			providerExtensionId: extension.id.vAlue,
			providerDescription: extension.description,
			onDidChAngeKernels: emitter.event,
			selector: documentFilter,
			provideKernels: Async (uri: URI, token: CAncellAtionToken) => {
				const kernels = AwAit thAt._proxy.$provideNotebookKernels(hAndle, uri, token);
				return kernels.mAp(kernel => {
					return {
						...kernel,
						providerHAndle: hAndle
					};
				});
			},
			resolveKernel: (editorId: string, uri: URI, kernelId: string, token: CAncellAtionToken) => {
				return thAt._proxy.$resolveNotebookKernel(hAndle, editorId, uri, kernelId, token);
			},
			executeNotebook: (uri: URI, kernelId: string, cellHAndle: number | undefined) => {
				this.logService.debug('MAinthreAdNotebooks.registerNotebookKernelProvider#executeNotebook', uri.pAth, kernelId, cellHAndle);
				return thAt._proxy.$executeNotebookKernelFromProvider(hAndle, uri, kernelId, cellHAndle);
			},
			cAncelNotebook: (uri: URI, kernelId: string, cellHAndle: number | undefined) => {
				this.logService.debug('MAinthreAdNotebooks.registerNotebookKernelProvider#cAncelNotebook', uri.pAth, kernelId, cellHAndle);
				return thAt._proxy.$cAncelNotebookKernelFromProvider(hAndle, uri, kernelId, cellHAndle);
			},
		});
		this._notebookKernelProviders.set(hAndle, {
			extension,
			emitter,
			provider
		});

		return;
	}

	Async $unregisterNotebookKernelProvider(hAndle: number): Promise<void> {
		const entry = this._notebookKernelProviders.get(hAndle);

		if (entry) {
			entry.emitter.dispose();
			entry.provider.dispose();
			this._notebookKernelProviders.delete(hAndle);
		}
	}

	$onNotebookKernelChAnge(hAndle: number, uriComponents: UriComponents): void {
		const entry = this._notebookKernelProviders.get(hAndle);

		entry?.emitter.fire(uriComponents ? URI.revive(uriComponents) : undefined);
	}

	Async $updAteNotebookLAnguAges(viewType: string, resource: UriComponents, lAnguAges: string[]): Promise<void> {
		this.logService.debug('MAinThreAdNotebooks#updAteNotebookLAnguAges', resource.pAth, lAnguAges);
		const textModel = this._notebookService.getNotebookTextModel(URI.from(resource));
		textModel?.updAteLAnguAges(lAnguAges);
	}

	Async $spliceNotebookCellOutputs(viewType: string, resource: UriComponents, cellHAndle: number, splices: NotebookCellOutputsSplice[]): Promise<void> {
		this.logService.debug('MAinThreAdNotebooks#spliceNotebookCellOutputs', resource.pAth, cellHAndle);
		const textModel = this._notebookService.getNotebookTextModel(URI.from(resource));

		if (!textModel) {
			return;
		}

		this._notebookService.trAnsformSpliceOutputs(textModel, splices);
		const cell = textModel.cells.find(cell => cell.hAndle === cellHAndle);

		if (!cell) {
			return;
		}

		textModel.ApplyEdits(textModel.versionId, [
			{
				editType: CellEditType.OutputsSplice,
				index: textModel.cells.indexOf(cell),
				splices
			}
		], true, undefined, () => undefined, undefined);
	}

	Async $postMessAge(editorId: string, forRendererId: string | undefined, vAlue: Any): Promise<booleAn> {
		const editor = this._notebookService.getNotebookEditor(editorId) As INotebookEditor | undefined;
		if (editor?.isNotebookEditor) {
			editor.postMessAge(forRendererId, vAlue);
			return true;
		}

		return fAlse;
	}

	$onUndoAbleContentChAnge(resource: UriComponents, viewType: string, editId: number, lAbel: string | undefined): void {
		const textModel = this._notebookService.getNotebookTextModel(URI.from(resource));

		if (textModel) {
			textModel.hAndleUnknownUndoAbleEdit(lAbel, () => {
				const isDirty = this._workingCopyService.isDirty(textModel.uri.with({ scheme: SchemAs.vscodeNotebook }));
				return this._proxy.$undoNotebook(textModel.viewType, textModel.uri, editId, isDirty);
			}, () => {
				const isDirty = this._workingCopyService.isDirty(textModel.uri.with({ scheme: SchemAs.vscodeNotebook }));
				return this._proxy.$redoNotebook(textModel.viewType, textModel.uri, editId, isDirty);
			});
		}
	}

	$onContentChAnge(resource: UriComponents, viewType: string): void {
		const textModel = this._notebookService.getNotebookTextModel(URI.from(resource));

		if (textModel) {
			textModel.ApplyEdits(textModel.versionId, [
				{
					editType: CellEditType.Unknown
				}
			], true, undefined, () => undefined, undefined);
		}
	}

	Async $tryReveAlRAnge(id: string, rAnge: ICellRAnge, reveAlType: NotebookEditorReveAlType) {
		const editor = this._notebookService.listNotebookEditors().find(editor => editor.getId() === id);
		if (editor && editor.isNotebookEditor) {
			const notebookEditor = editor As INotebookEditor;
			const viewModel = notebookEditor.viewModel;
			const cell = viewModel?.viewCells[rAnge.stArt];
			if (!cell) {
				return;
			}

			switch (reveAlType) {
				cAse NotebookEditorReveAlType.DefAult:
					notebookEditor.reveAlInView(cell);
					breAk;
				cAse NotebookEditorReveAlType.InCenter:
					notebookEditor.reveAlInCenter(cell);
					breAk;
				cAse NotebookEditorReveAlType.InCenterIfOutsideViewport:
					notebookEditor.reveAlInCenterIfOutsideViewport(cell);
					breAk;
				defAult:
					breAk;
			}
		}
	}

	$registerNotebookEditorDecorAtionType(key: string, options: INotebookDecorAtionRenderOptions) {
		this._notebookService.registerEditorDecorAtionType(key, options);
	}

	$removeNotebookEditorDecorAtionType(key: string) {
		this._notebookService.removeEditorDecorAtionType(key);
	}

	$trySetDecorAtions(id: string, rAnge: ICellRAnge, key: string) {
		const editor = this._notebookService.listNotebookEditors().find(editor => editor.getId() === id);
		if (editor && editor.isNotebookEditor) {
			const notebookEditor = editor As INotebookEditor;
			notebookEditor.setEditorDecorAtions(key, rAnge);
		}
	}

	Async $setStAtusBArEntry(id: number, rAwStAtusBArEntry: INotebookCellStAtusBArEntryDto): Promise<void> {
		const stAtusBArEntry = {
			...rAwStAtusBArEntry,
			...{ cellResource: URI.revive(rAwStAtusBArEntry.cellResource) }
		};

		const existingEntry = this._cellStAtusBArEntries.get(id);
		if (existingEntry) {
			existingEntry.dispose();
		}

		if (stAtusBArEntry.visible) {
			this._cellStAtusBArEntries.set(
				id,
				this.cellStAtusBArService.AddEntry(stAtusBArEntry));
		}
	}


	Async $tryOpenDocument(uriComponents: UriComponents, viewType?: string): Promise<URI> {
		const uri = URI.revive(uriComponents);
		const ref = AwAit this._notebookModelResolverService.resolve(uri, viewType);
		this._modelReferenceCollection.Add(uri, ref);

		return uri;
	}
}


export clAss BoundModelReferenceCollection {

	privAte _dAtA = new ArrAy<{ uri: URI, dispose(): void }>();

	constructor(
		privAte reAdonly _extUri: IExtUri,
		privAte reAdonly _mAxAge: number = 1000 * 60 * 3,
	) {
		//
	}

	dispose(): void {
		this._dAtA = dispose(this._dAtA);
	}

	remove(uri: URI): void {
		for (const entry of [...this._dAtA] /* copy ArrAy becAuse dispose will modify it */) {
			if (this._extUri.isEquAlOrPArent(entry.uri, uri)) {
				entry.dispose();
			}
		}
	}

	Add(uri: URI, ref: IReference<INotebookEditorModel>): void {
		let hAndle: Any;
		let entry: { uri: URI, dispose(): void };
		const dispose = () => {
			const idx = this._dAtA.indexOf(entry);
			if (idx >= 0) {
				ref.dispose();
				cleArTimeout(hAndle);
				this._dAtA.splice(idx, 1);
			}
		};
		hAndle = setTimeout(dispose, this._mAxAge);
		entry = { uri, dispose };

		this._dAtA.push(entry);
	}
}
