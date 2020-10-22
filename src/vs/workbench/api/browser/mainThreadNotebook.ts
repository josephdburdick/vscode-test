/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Emitter } from 'vs/Base/common/event';
import { IRelativePattern } from 'vs/Base/common/gloB';
import { comBinedDisposaBle, DisposaBle, DisposaBleStore, dispose, IDisposaBle, IReference } from 'vs/Base/common/lifecycle';
import { ResourceMap } from 'vs/Base/common/map';
import { Schemas } from 'vs/Base/common/network';
import { IExtUri } from 'vs/Base/common/resources';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILogService } from 'vs/platform/log/common/log';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { INoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { INoteBookCellStatusBarService } from 'vs/workBench/contriB/noteBook/common/noteBookCellStatusBarService';
import { ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER, CellEditType, DisplayOrderKey, ICellEditOperation, ICellRange, IEditor, IMainCellDto, INoteBookDecorationRenderOptions, INoteBookDocumentFilter, INoteBookEditorModel, INoteBookExclusiveDocumentFilter, NoteBookCellOutputsSplice, NoteBookCellsChangeType, NOTEBOOK_DISPLAY_ORDER, TransientMetadata } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { INoteBookEditorModelResolverService } from 'vs/workBench/contriB/noteBook/common/noteBookEditorModelResolverService';
import { IMainNoteBookController, INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { ExtHostContext, ExtHostNoteBookShape, IExtHostContext, INoteBookCellStatusBarEntryDto, INoteBookDocumentsAndEditorsDelta, INoteBookModelAddedData, MainContext, MainThreadNoteBookShape, NoteBookEditorRevealType, NoteBookExtensionDescription } from '../common/extHost.protocol';

class DocumentAndEditorState {
	static ofSets<T>(Before: Set<T>, after: Set<T>): { removed: T[], added: T[] } {
		const removed: T[] = [];
		const added: T[] = [];
		Before.forEach(element => {
			if (!after.has(element)) {
				removed.push(element);
			}
		});
		after.forEach(element => {
			if (!Before.has(element)) {
				added.push(element);
			}
		});
		return { removed, added };
	}

	static ofMaps<K, V>(Before: Map<K, V>, after: Map<K, V>): { removed: V[], added: V[] } {
		const removed: V[] = [];
		const added: V[] = [];
		Before.forEach((value, index) => {
			if (!after.has(index)) {
				removed.push(value);
			}
		});
		after.forEach((value, index) => {
			if (!Before.has(index)) {
				added.push(value);
			}
		});
		return { removed, added };
	}

	static compute(Before: DocumentAndEditorState | undefined, after: DocumentAndEditorState): INoteBookDocumentsAndEditorsDelta {
		if (!Before) {
			const apiEditors = [];
			for (let id in after.textEditors) {
				const editor = after.textEditors.get(id)!;
				apiEditors.push({ id, documentUri: editor.uri!, selections: editor!.getSelectionHandles(), visiBleRanges: editor.visiBleRanges });
			}

			return {
				addedDocuments: [],
				addedEditors: apiEditors,
				visiBleEditors: [...after.visiBleEditors].map(editor => editor[0])
			};
		}
		const documentDelta = DocumentAndEditorState.ofSets(Before.documents, after.documents);
		const editorDelta = DocumentAndEditorState.ofMaps(Before.textEditors, after.textEditors);
		const addedAPIEditors = editorDelta.added.map(add => ({
			id: add.getId(),
			documentUri: add.uri!,
			selections: add.getSelectionHandles(),
			visiBleRanges: add.visiBleRanges
		}));

		const removedAPIEditors = editorDelta.removed.map(removed => removed.getId());

		// const oldActiveEditor = Before.activeEditor !== after.activeEditor ? Before.activeEditor : undefined;
		const newActiveEditor = Before.activeEditor !== after.activeEditor ? after.activeEditor : undefined;

		const visiBleEditorDelta = DocumentAndEditorState.ofMaps(Before.visiBleEditors, after.visiBleEditors);

		return {
			addedDocuments: documentDelta.added.map((e: NoteBookTextModel): INoteBookModelAddedData => {
				return {
					viewType: e.viewType,
					uri: e.uri,
					metadata: e.metadata,
					versionId: e.versionId,
					cells: e.cells.map(cell => ({
						handle: cell.handle,
						uri: cell.uri,
						source: cell.textBuffer.getLinesContent(),
						eol: cell.textBuffer.getEOL(),
						language: cell.language,
						cellKind: cell.cellKind,
						outputs: cell.outputs,
						metadata: cell.metadata
					})),
					contentOptions: e.transientOptions,
					// attachedEditor: editorId ? {
					// 	id: editorId,
					// 	selections: document.textModel.selections
					// } : undefined
				};
			}),
			removedDocuments: documentDelta.removed.map(e => e.uri),
			addedEditors: addedAPIEditors,
			removedEditors: removedAPIEditors,
			newActiveEditor: newActiveEditor,
			visiBleEditors: visiBleEditorDelta.added.length === 0 && visiBleEditorDelta.removed.length === 0
				? undefined
				: [...after.visiBleEditors].map(editor => editor[0])
		};
	}

	constructor(
		readonly documents: Set<NoteBookTextModel>,
		readonly textEditors: Map<string, IEditor>,
		readonly activeEditor: string | null | undefined,
		readonly visiBleEditors: Map<string, IEditor>
	) {
		//
	}
}

@extHostNamedCustomer(MainContext.MainThreadNoteBook)
export class MainThreadNoteBooks extends DisposaBle implements MainThreadNoteBookShape {
	private readonly _noteBookProviders = new Map<string, { controller: IMainNoteBookController, disposaBle: IDisposaBle }>();
	private readonly _noteBookKernelProviders = new Map<numBer, { extension: NoteBookExtensionDescription, emitter: Emitter<URI | undefined>, provider: IDisposaBle }>();
	private readonly _proxy: ExtHostNoteBookShape;
	private _toDisposeOnEditorRemove = new Map<string, IDisposaBle>();
	private _currentState?: DocumentAndEditorState;
	private _editorEventListenersMapping: Map<string, DisposaBleStore> = new Map();
	private _documentEventListenersMapping: ResourceMap<DisposaBleStore> = new ResourceMap();
	private readonly _cellStatusBarEntries: Map<numBer, IDisposaBle> = new Map();
	private readonly _modelReferenceCollection: BoundModelReferenceCollection;

	constructor(
		extHostContext: IExtHostContext,
		@INoteBookService private _noteBookService: INoteBookService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEditorService private readonly editorService: IEditorService,
		@IAccessiBilityService private readonly accessiBilityService: IAccessiBilityService,
		@ILogService private readonly logService: ILogService,
		@INoteBookCellStatusBarService private readonly cellStatusBarService: INoteBookCellStatusBarService,
		@IWorkingCopyService private readonly _workingCopyService: IWorkingCopyService,
		@INoteBookEditorModelResolverService private readonly _noteBookModelResolverService: INoteBookEditorModelResolverService,
		@IUriIdentityService private readonly _uriIdentityService: IUriIdentityService,
	) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNoteBook);
		this._modelReferenceCollection = new BoundModelReferenceCollection(this._uriIdentityService.extUri);
		this._register(this._modelReferenceCollection);
		this.registerListeners();
	}

	async $tryApplyEdits(_viewType: string, resource: UriComponents, modelVersionId: numBer, cellEdits: ICellEditOperation[]): Promise<Boolean> {
		const textModel = this._noteBookService.getNoteBookTextModel(URI.from(resource));
		if (!textModel) {
			return false;
		}
		this._noteBookService.transformEditsOutputs(textModel, cellEdits);
		return textModel.applyEdits(modelVersionId, cellEdits, true, undefined, () => undefined, undefined);
	}

	private _isDeltaEmpty(delta: INoteBookDocumentsAndEditorsDelta) {
		if (delta.addedDocuments !== undefined && delta.addedDocuments.length > 0) {
			return false;
		}

		if (delta.removedDocuments !== undefined && delta.removedDocuments.length > 0) {
			return false;
		}

		if (delta.addedEditors !== undefined && delta.addedEditors.length > 0) {
			return false;
		}

		if (delta.removedEditors !== undefined && delta.removedEditors.length > 0) {
			return false;
		}

		if (delta.visiBleEditors !== undefined && delta.visiBleEditors.length > 0) {
			return false;
		}

		if (delta.newActiveEditor !== undefined) {
			return false;
		}

		return true;
	}

	private _emitDelta(delta: INoteBookDocumentsAndEditorsDelta) {
		if (this._isDeltaEmpty(delta)) {
			return;
		}

		return this._proxy.$acceptDocumentAndEditorsDelta(delta);
	}

	registerListeners() {
		this._noteBookService.listNoteBookEditors().forEach((e) => {
			this._addNoteBookEditor(e);
		});

		this._register(this._noteBookService.onDidChangeActiveEditor(e => {
			this._updateState();
		}));

		this._register(this._noteBookService.onDidChangeVisiBleEditors(e => {
			if (this._noteBookProviders.size > 0) {
				if (!this._currentState) {
					// no current state means we didn't even create editors in ext host yet.
					return;
				}

				// we can't simply update visiBleEditors as we need to check if we should create editors first.
				this._updateState();
			}
		}));

		const noteBookEditorAddedHandler = (editor: IEditor) => {
			if (!this._editorEventListenersMapping.has(editor.getId())) {
				const disposaBleStore = new DisposaBleStore();
				disposaBleStore.add(editor.onDidChangeVisiBleRanges(() => {
					this._proxy.$acceptEditorPropertiesChanged(editor.getId(), { visiBleRanges: { ranges: editor.visiBleRanges }, selections: null });
				}));

				disposaBleStore.add(editor.onDidChangeSelection(() => {
					const selectionHandles = editor.getSelectionHandles();
					this._proxy.$acceptEditorPropertiesChanged(editor.getId(), { visiBleRanges: null, selections: { selections: selectionHandles } });
				}));

				this._editorEventListenersMapping.set(editor.getId(), disposaBleStore);
			}
		};

		this._register(this._noteBookService.onNoteBookEditorAdd(editor => {
			noteBookEditorAddedHandler(editor);
			this._addNoteBookEditor(editor);
		}));

		this._register(this._noteBookService.onNoteBookEditorsRemove(editors => {
			this._removeNoteBookEditor(editors);

			editors.forEach(editor => {
				this._editorEventListenersMapping.get(editor.getId())?.dispose();
				this._editorEventListenersMapping.delete(editor.getId());
			});
		}));

		this._noteBookService.listNoteBookEditors().forEach(editor => {
			noteBookEditorAddedHandler(editor);
		});

		const cellToDto = (cell: NoteBookCellTextModel): IMainCellDto => {
			return {
				handle: cell.handle,
				uri: cell.uri,
				source: cell.textBuffer.getLinesContent(),
				eol: cell.textBuffer.getEOL(),
				language: cell.language,
				cellKind: cell.cellKind,
				outputs: cell.outputs,
				metadata: cell.metadata
			};
		};


		const noteBookDocumentAddedHandler = (textModel: NoteBookTextModel) => {
			if (!this._documentEventListenersMapping.has(textModel.uri)) {
				const disposaBleStore = new DisposaBleStore();
				disposaBleStore.add(textModel!.onDidChangeContent(event => {
					const dto = event.rawEvents.map(e => {
						const data =
							e.kind === NoteBookCellsChangeType.ModelChange || e.kind === NoteBookCellsChangeType.Initialize
								? {
									kind: e.kind,
									versionId: event.versionId,
									changes: e.changes.map(diff => [diff[0], diff[1], diff[2].map(cell => cellToDto(cell as NoteBookCellTextModel))] as [numBer, numBer, IMainCellDto[]])
								}
								: (
									e.kind === NoteBookCellsChangeType.Move
										? {
											kind: e.kind,
											index: e.index,
											length: e.length,
											newIdx: e.newIdx,
											versionId: event.versionId,
											cells: e.cells.map(cell => cellToDto(cell as NoteBookCellTextModel))
										}
										: e
								);

						return data;
					});

					/**
					 * TODO@reBornix, @jrieken
					 * When a document is modified, it will trigger onDidChangeContent events.
					 * The first event listener is this one, which doesn't know if the text model is dirty or not. It can ask `workingCopyService` But get the wrong result
					 * The second event listener is `NoteBookEditorModel`, which will then set `isDirty` to `true`.
					 * Since `e.transient` decides if the model should Be dirty or not, we will use the same logic here.
					 */
					const hasNonTransientEvent = event.rawEvents.find(e => !e.transient);
					this._proxy.$acceptModelChanged(textModel.uri, {
						rawEvents: dto,
						versionId: event.versionId
					}, !!hasNonTransientEvent);

					const hasDocumentMetadataChangeEvent = event.rawEvents.find(e => e.kind === NoteBookCellsChangeType.ChangeDocumentMetadata);
					if (!!hasDocumentMetadataChangeEvent) {
						this._proxy.$acceptDocumentPropertiesChanged(textModel.uri, { metadata: textModel.metadata });
					}
				}));
				this._documentEventListenersMapping.set(textModel!.uri, disposaBleStore);
			}
		};

		this._noteBookService.listNoteBookDocuments().forEach(noteBookDocumentAddedHandler);
		this._register(this._noteBookService.onDidAddNoteBookDocument(document => {
			noteBookDocumentAddedHandler(document);
			this._updateState();
		}));

		this._register(this._noteBookService.onDidRemoveNoteBookDocument(uri => {
			this._documentEventListenersMapping.get(uri)?.dispose();
			this._documentEventListenersMapping.delete(uri);
			this._updateState();
		}));

		this._register(this._noteBookService.onDidChangeNoteBookActiveKernel(e => {
			this._proxy.$acceptNoteBookActiveKernelChange(e);
		}));

		this._register(this._noteBookService.onNoteBookDocumentSaved(e => {
			this._proxy.$acceptModelSaved(e);
		}));

		const updateOrder = () => {
			let userOrder = this.configurationService.getValue<string[]>(DisplayOrderKey);
			this._proxy.$acceptDisplayOrder({
				defaultOrder: this.accessiBilityService.isScreenReaderOptimized() ? ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER : NOTEBOOK_DISPLAY_ORDER,
				userOrder: userOrder
			});
		};

		updateOrder();

		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectedKeys.indexOf(DisplayOrderKey) >= 0) {
				updateOrder();
			}
		}));

		this._register(this.accessiBilityService.onDidChangeScreenReaderOptimized(() => {
			updateOrder();
		}));

		const activeEditorPane = this.editorService.activeEditorPane as any | undefined;
		const noteBookEditor = activeEditorPane?.isNoteBookEditor ? activeEditorPane.getControl() : undefined;
		this._updateState(noteBookEditor);
	}

	private _addNoteBookEditor(e: IEditor) {
		this._toDisposeOnEditorRemove.set(e.getId(), comBinedDisposaBle(
			e.onDidChangeModel(() => this._updateState()),
			e.onDidFocusEditorWidget(() => {
				this._updateState(e);
			}),
		));

		const activeEditorPane = this.editorService.activeEditorPane as any | undefined;
		const noteBookEditor = activeEditorPane?.isNoteBookEditor ? activeEditorPane.getControl() : undefined;
		this._updateState(noteBookEditor);
	}

	private _removeNoteBookEditor(editors: IEditor[]) {
		editors.forEach(e => {
			const suB = this._toDisposeOnEditorRemove.get(e.getId());
			if (suB) {
				this._toDisposeOnEditorRemove.delete(e.getId());
				suB.dispose();
			}
		});

		this._updateState();
	}

	private async _updateState(focusedNoteBookEditor?: IEditor) {
		let activeEditor: string | null = null;

		const activeEditorPane = this.editorService.activeEditorPane as any | undefined;
		if (activeEditorPane?.isNoteBookEditor) {
			const noteBookEditor = (activeEditorPane.getControl() as INoteBookEditor);
			activeEditor = noteBookEditor && noteBookEditor.hasModel() ? noteBookEditor!.getId() : null;
		}

		const documentEditorsMap = new Map<string, IEditor>();

		const editors = new Map<string, IEditor>();
		this._noteBookService.listNoteBookEditors().forEach(editor => {
			if (editor.hasModel()) {
				editors.set(editor.getId(), editor);
				documentEditorsMap.set(editor.textModel!.uri.toString(), editor);
			}
		});

		const visiBleEditorsMap = new Map<string, IEditor>();
		this.editorService.visiBleEditorPanes.forEach(editor => {
			if ((editor as any).isNoteBookEditor) {
				const nBEditorWidget = (editor as any).getControl() as INoteBookEditor;
				if (nBEditorWidget && editors.has(nBEditorWidget.getId())) {
					visiBleEditorsMap.set(nBEditorWidget.getId(), nBEditorWidget);
				}
			}
		});

		const documents = new Set<NoteBookTextModel>();
		this._noteBookService.listNoteBookDocuments().forEach(document => {
			documents.add(document);
		});

		if (!activeEditor && focusedNoteBookEditor && focusedNoteBookEditor.hasModel()) {
			activeEditor = focusedNoteBookEditor.getId();
		}

		// editors always have view model attached, which means there is already a document in exthost.
		const newState = new DocumentAndEditorState(documents, editors, activeEditor, visiBleEditorsMap);
		const delta = DocumentAndEditorState.compute(this._currentState, newState);
		// const isEmptyChange = (!delta.addedDocuments || delta.addedDocuments.length === 0)
		// 	&& (!delta.removedDocuments || delta.removedDocuments.length === 0)
		// 	&& (!delta.addedEditors || delta.addedEditors.length === 0)
		// 	&& (!delta.removedEditors || delta.removedEditors.length === 0)
		// 	&& (delta.newActiveEditor === undefined)

		// if (!isEmptyChange) {
		this._currentState = newState;
		await this._emitDelta(delta);
		// }
	}

	async $registerNoteBookProvider(extension: NoteBookExtensionDescription, viewType: string, supportBackup: Boolean, options: {
		transientOutputs: Boolean;
		transientMetadata: TransientMetadata;
		viewOptions?: { displayName: string; filenamePattern: (string | IRelativePattern | INoteBookExclusiveDocumentFilter)[]; exclusive: Boolean; };
	}): Promise<void> {
		let contentOptions = { transientOutputs: options.transientOutputs, transientMetadata: options.transientMetadata };

		const controller: IMainNoteBookController = {
			supportBackup,
			get options() {
				return contentOptions;
			},
			set options(newOptions) {
				contentOptions.transientMetadata = newOptions.transientMetadata;
				contentOptions.transientOutputs = newOptions.transientOutputs;
			},
			viewOptions: options.viewOptions,
			reloadNoteBook: async (mainthreadTextModel: NoteBookTextModel) => {
				const data = await this._proxy.$resolveNoteBookData(viewType, mainthreadTextModel.uri);
				mainthreadTextModel.updateLanguages(data.languages);
				mainthreadTextModel.metadata = data.metadata;
				mainthreadTextModel.transientOptions = contentOptions;

				const edits: ICellEditOperation[] = [
					{ editType: CellEditType.Replace, index: 0, count: mainthreadTextModel.cells.length, cells: data.cells }
				];

				this._noteBookService.transformEditsOutputs(mainthreadTextModel, edits);
				await new Promise(resolve => {
					DOM.scheduleAtNextAnimationFrame(() => {
						const ret = mainthreadTextModel!.applyEdits(mainthreadTextModel!.versionId, edits, true, undefined, () => undefined, undefined);
						resolve(ret);
					});
				});
			},
			resolveNoteBookDocument: async (viewType: string, uri: URI, BackupId?: string) => {
				const data = await this._proxy.$resolveNoteBookData(viewType, uri, BackupId);
				return {
					data,
					transientOptions: contentOptions
				};
			},
			resolveNoteBookEditor: async (viewType: string, uri: URI, editorId: string) => {
				await this._proxy.$resolveNoteBookEditor(viewType, uri, editorId);
			},
			onDidReceiveMessage: (editorId: string, rendererType: string | undefined, message: unknown) => {
				this._proxy.$onDidReceiveMessage(editorId, rendererType, message);
			},
			save: async (uri: URI, token: CancellationToken) => {
				return this._proxy.$saveNoteBook(viewType, uri, token);
			},
			saveAs: async (uri: URI, target: URI, token: CancellationToken) => {
				return this._proxy.$saveNoteBookAs(viewType, uri, target, token);
			},
			Backup: async (uri: URI, token: CancellationToken) => {
				return this._proxy.$Backup(viewType, uri, token);
			}
		};

		const disposaBle = this._noteBookService.registerNoteBookController(viewType, extension, controller);
		this._noteBookProviders.set(viewType, { controller, disposaBle });
		return;
	}

	async $updateNoteBookProviderOptions(viewType: string, options?: { transientOutputs: Boolean; transientMetadata: TransientMetadata; }): Promise<void> {
		const provider = this._noteBookProviders.get(viewType);

		if (provider && options) {
			provider.controller.options = options;
			this._noteBookService.listNoteBookDocuments().forEach(document => {
				if (document.viewType === viewType) {
					document.transientOptions = provider.controller.options;
				}
			});
		}
	}

	async $unregisterNoteBookProvider(viewType: string): Promise<void> {
		const entry = this._noteBookProviders.get(viewType);
		if (entry) {
			entry.disposaBle.dispose();
			this._noteBookProviders.delete(viewType);
		}
	}

	async $registerNoteBookKernelProvider(extension: NoteBookExtensionDescription, handle: numBer, documentFilter: INoteBookDocumentFilter): Promise<void> {
		const emitter = new Emitter<URI | undefined>();
		const that = this;
		const provider = this._noteBookService.registerNoteBookKernelProvider({
			providerExtensionId: extension.id.value,
			providerDescription: extension.description,
			onDidChangeKernels: emitter.event,
			selector: documentFilter,
			provideKernels: async (uri: URI, token: CancellationToken) => {
				const kernels = await that._proxy.$provideNoteBookKernels(handle, uri, token);
				return kernels.map(kernel => {
					return {
						...kernel,
						providerHandle: handle
					};
				});
			},
			resolveKernel: (editorId: string, uri: URI, kernelId: string, token: CancellationToken) => {
				return that._proxy.$resolveNoteBookKernel(handle, editorId, uri, kernelId, token);
			},
			executeNoteBook: (uri: URI, kernelId: string, cellHandle: numBer | undefined) => {
				this.logService.deBug('MainthreadNoteBooks.registerNoteBookKernelProvider#executeNoteBook', uri.path, kernelId, cellHandle);
				return that._proxy.$executeNoteBookKernelFromProvider(handle, uri, kernelId, cellHandle);
			},
			cancelNoteBook: (uri: URI, kernelId: string, cellHandle: numBer | undefined) => {
				this.logService.deBug('MainthreadNoteBooks.registerNoteBookKernelProvider#cancelNoteBook', uri.path, kernelId, cellHandle);
				return that._proxy.$cancelNoteBookKernelFromProvider(handle, uri, kernelId, cellHandle);
			},
		});
		this._noteBookKernelProviders.set(handle, {
			extension,
			emitter,
			provider
		});

		return;
	}

	async $unregisterNoteBookKernelProvider(handle: numBer): Promise<void> {
		const entry = this._noteBookKernelProviders.get(handle);

		if (entry) {
			entry.emitter.dispose();
			entry.provider.dispose();
			this._noteBookKernelProviders.delete(handle);
		}
	}

	$onNoteBookKernelChange(handle: numBer, uriComponents: UriComponents): void {
		const entry = this._noteBookKernelProviders.get(handle);

		entry?.emitter.fire(uriComponents ? URI.revive(uriComponents) : undefined);
	}

	async $updateNoteBookLanguages(viewType: string, resource: UriComponents, languages: string[]): Promise<void> {
		this.logService.deBug('MainThreadNoteBooks#updateNoteBookLanguages', resource.path, languages);
		const textModel = this._noteBookService.getNoteBookTextModel(URI.from(resource));
		textModel?.updateLanguages(languages);
	}

	async $spliceNoteBookCellOutputs(viewType: string, resource: UriComponents, cellHandle: numBer, splices: NoteBookCellOutputsSplice[]): Promise<void> {
		this.logService.deBug('MainThreadNoteBooks#spliceNoteBookCellOutputs', resource.path, cellHandle);
		const textModel = this._noteBookService.getNoteBookTextModel(URI.from(resource));

		if (!textModel) {
			return;
		}

		this._noteBookService.transformSpliceOutputs(textModel, splices);
		const cell = textModel.cells.find(cell => cell.handle === cellHandle);

		if (!cell) {
			return;
		}

		textModel.applyEdits(textModel.versionId, [
			{
				editType: CellEditType.OutputsSplice,
				index: textModel.cells.indexOf(cell),
				splices
			}
		], true, undefined, () => undefined, undefined);
	}

	async $postMessage(editorId: string, forRendererId: string | undefined, value: any): Promise<Boolean> {
		const editor = this._noteBookService.getNoteBookEditor(editorId) as INoteBookEditor | undefined;
		if (editor?.isNoteBookEditor) {
			editor.postMessage(forRendererId, value);
			return true;
		}

		return false;
	}

	$onUndoaBleContentChange(resource: UriComponents, viewType: string, editId: numBer, laBel: string | undefined): void {
		const textModel = this._noteBookService.getNoteBookTextModel(URI.from(resource));

		if (textModel) {
			textModel.handleUnknownUndoaBleEdit(laBel, () => {
				const isDirty = this._workingCopyService.isDirty(textModel.uri.with({ scheme: Schemas.vscodeNoteBook }));
				return this._proxy.$undoNoteBook(textModel.viewType, textModel.uri, editId, isDirty);
			}, () => {
				const isDirty = this._workingCopyService.isDirty(textModel.uri.with({ scheme: Schemas.vscodeNoteBook }));
				return this._proxy.$redoNoteBook(textModel.viewType, textModel.uri, editId, isDirty);
			});
		}
	}

	$onContentChange(resource: UriComponents, viewType: string): void {
		const textModel = this._noteBookService.getNoteBookTextModel(URI.from(resource));

		if (textModel) {
			textModel.applyEdits(textModel.versionId, [
				{
					editType: CellEditType.Unknown
				}
			], true, undefined, () => undefined, undefined);
		}
	}

	async $tryRevealRange(id: string, range: ICellRange, revealType: NoteBookEditorRevealType) {
		const editor = this._noteBookService.listNoteBookEditors().find(editor => editor.getId() === id);
		if (editor && editor.isNoteBookEditor) {
			const noteBookEditor = editor as INoteBookEditor;
			const viewModel = noteBookEditor.viewModel;
			const cell = viewModel?.viewCells[range.start];
			if (!cell) {
				return;
			}

			switch (revealType) {
				case NoteBookEditorRevealType.Default:
					noteBookEditor.revealInView(cell);
					Break;
				case NoteBookEditorRevealType.InCenter:
					noteBookEditor.revealInCenter(cell);
					Break;
				case NoteBookEditorRevealType.InCenterIfOutsideViewport:
					noteBookEditor.revealInCenterIfOutsideViewport(cell);
					Break;
				default:
					Break;
			}
		}
	}

	$registerNoteBookEditorDecorationType(key: string, options: INoteBookDecorationRenderOptions) {
		this._noteBookService.registerEditorDecorationType(key, options);
	}

	$removeNoteBookEditorDecorationType(key: string) {
		this._noteBookService.removeEditorDecorationType(key);
	}

	$trySetDecorations(id: string, range: ICellRange, key: string) {
		const editor = this._noteBookService.listNoteBookEditors().find(editor => editor.getId() === id);
		if (editor && editor.isNoteBookEditor) {
			const noteBookEditor = editor as INoteBookEditor;
			noteBookEditor.setEditorDecorations(key, range);
		}
	}

	async $setStatusBarEntry(id: numBer, rawStatusBarEntry: INoteBookCellStatusBarEntryDto): Promise<void> {
		const statusBarEntry = {
			...rawStatusBarEntry,
			...{ cellResource: URI.revive(rawStatusBarEntry.cellResource) }
		};

		const existingEntry = this._cellStatusBarEntries.get(id);
		if (existingEntry) {
			existingEntry.dispose();
		}

		if (statusBarEntry.visiBle) {
			this._cellStatusBarEntries.set(
				id,
				this.cellStatusBarService.addEntry(statusBarEntry));
		}
	}


	async $tryOpenDocument(uriComponents: UriComponents, viewType?: string): Promise<URI> {
		const uri = URI.revive(uriComponents);
		const ref = await this._noteBookModelResolverService.resolve(uri, viewType);
		this._modelReferenceCollection.add(uri, ref);

		return uri;
	}
}


export class BoundModelReferenceCollection {

	private _data = new Array<{ uri: URI, dispose(): void }>();

	constructor(
		private readonly _extUri: IExtUri,
		private readonly _maxAge: numBer = 1000 * 60 * 3,
	) {
		//
	}

	dispose(): void {
		this._data = dispose(this._data);
	}

	remove(uri: URI): void {
		for (const entry of [...this._data] /* copy array Because dispose will modify it */) {
			if (this._extUri.isEqualOrParent(entry.uri, uri)) {
				entry.dispose();
			}
		}
	}

	add(uri: URI, ref: IReference<INoteBookEditorModel>): void {
		let handle: any;
		let entry: { uri: URI, dispose(): void };
		const dispose = () => {
			const idx = this._data.indexOf(entry);
			if (idx >= 0) {
				ref.dispose();
				clearTimeout(handle);
				this._data.splice(idx, 1);
			}
		};
		handle = setTimeout(dispose, this._maxAge);
		entry = { uri, dispose };

		this._data.push(entry);
	}
}
