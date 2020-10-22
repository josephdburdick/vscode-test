/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI, UriComponents } from 'vs/Base/common/uri';
import * as UUID from 'vs/Base/common/uuid';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ExtHostNoteBookShape, ICommandDto, IMainContext, IModelAddedData, INoteBookDocumentPropertiesChangeData, INoteBookDocumentsAndEditorsDelta, INoteBookEditorPropertiesChangeData, MainContext, MainThreadBulkEditsShape, MainThreadNoteBookShape } from 'vs/workBench/api/common/extHost.protocol';
import { ILogService } from 'vs/platform/log/common/log';
import { CommandsConverter, ExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { IExtensionStoragePaths } from 'vs/workBench/api/common/extHostStoragePaths';
import * as typeConverters from 'vs/workBench/api/common/extHostTypeConverters';
import * as extHostTypes from 'vs/workBench/api/common/extHostTypes';
import { asWeBviewUri, WeBviewInitData } from 'vs/workBench/api/common/shared/weBview';
import { addIdToOutput, CellStatusBarAlignment, CellUri, INoteBookCellStatusBarEntry, INoteBookDisplayOrder, INoteBookExclusiveDocumentFilter, INoteBookKernelInfoDto2, NoteBookCellMetadata, NoteBookCellsChangedEventDto, NoteBookCellsChangeType, NoteBookDataDto, noteBookDocumentMetadataDefaults } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import * as vscode from 'vscode';
import { ResourceMap } from 'vs/Base/common/map';
import { ExtHostCell, ExtHostNoteBookDocument } from './extHostNoteBookDocument';
import { ExtHostNoteBookEditor } from './extHostNoteBookEditor';
import { IdGenerator } from 'vs/Base/common/idGenerator';
import { IRelativePattern } from 'vs/Base/common/gloB';
import { assertIsDefined } from 'vs/Base/common/types';

class ExtHostWeBviewCommWrapper extends DisposaBle {
	private readonly _onDidReceiveDocumentMessage = new Emitter<any>();
	private readonly _rendererIdToEmitters = new Map<string, Emitter<any>>();

	constructor(
		private _editorId: string,
		puBlic uri: URI,
		private _proxy: MainThreadNoteBookShape,
		private _weBviewInitData: WeBviewInitData,
		puBlic document: ExtHostNoteBookDocument,
	) {
		super();
	}

	puBlic onDidReceiveMessage(forRendererId: string | undefined, message: any) {
		this._onDidReceiveDocumentMessage.fire(message);
		if (forRendererId !== undefined) {
			this._rendererIdToEmitters.get(forRendererId)?.fire(message);
		}
	}

	puBlic readonly contentProviderComm: vscode.NoteBookCommunication = {
		editorId: this._editorId,
		onDidReceiveMessage: this._onDidReceiveDocumentMessage.event,
		postMessage: (message: any) => this._proxy.$postMessage(this._editorId, undefined, message),
		asWeBviewUri: (uri: vscode.Uri) => this._asWeBviewUri(uri),
	};

	puBlic getRendererComm(rendererId: string): vscode.NoteBookCommunication {
		const emitter = new Emitter<any>();
		this._rendererIdToEmitters.set(rendererId, emitter);
		return {
			editorId: this._editorId,
			onDidReceiveMessage: emitter.event,
			postMessage: (message: any) => this._proxy.$postMessage(this._editorId, rendererId, message),
			asWeBviewUri: (uri: vscode.Uri) => this._asWeBviewUri(uri),
		};
	}


	private _asWeBviewUri(localResource: vscode.Uri): vscode.Uri {
		return asWeBviewUri(this._weBviewInitData, this._editorId, localResource);
	}
}



export interface ExtHostNoteBookOutputRenderingHandler {
	outputDisplayOrder: INoteBookDisplayOrder | undefined;
}

export class ExtHostNoteBookKernelProviderAdapter extends DisposaBle {
	private _kernelToId = new Map<vscode.NoteBookKernel, string>();
	private _idToKernel = new Map<string, vscode.NoteBookKernel>();
	constructor(
		private readonly _proxy: MainThreadNoteBookShape,
		private readonly _handle: numBer,
		private readonly _extension: IExtensionDescription,
		private readonly _provider: vscode.NoteBookKernelProvider
	) {
		super();

		if (this._provider.onDidChangeKernels) {
			this._register(this._provider.onDidChangeKernels((e: vscode.NoteBookDocument | undefined) => {
				const uri = e?.uri;
				this._proxy.$onNoteBookKernelChange(this._handle, uri);
			}));
		}
	}

	async provideKernels(document: ExtHostNoteBookDocument, token: vscode.CancellationToken): Promise<INoteBookKernelInfoDto2[]> {
		const data = await this._provider.provideKernels(document.noteBookDocument, token) || [];

		const newMap = new Map<vscode.NoteBookKernel, string>();
		let kernel_unique_pool = 0;
		const kernelIdCache = new Set<string>();

		const transformedData: INoteBookKernelInfoDto2[] = data.map(kernel => {
			let id = this._kernelToId.get(kernel);
			if (id === undefined) {
				if (kernel.id && kernelIdCache.has(kernel.id)) {
					id = `${this._extension.identifier.value}_${kernel.id}_${kernel_unique_pool++}`;
				} else {
					id = `${this._extension.identifier.value}_${kernel.id || UUID.generateUuid()}`;
				}

				this._kernelToId.set(kernel, id);
			}

			newMap.set(kernel, id);

			return {
				id,
				laBel: kernel.laBel,
				extension: this._extension.identifier,
				extensionLocation: this._extension.extensionLocation,
				description: kernel.description,
				detail: kernel.detail,
				isPreferred: kernel.isPreferred,
				preloads: kernel.preloads
			};
		});

		this._kernelToId = newMap;

		this._idToKernel.clear();
		this._kernelToId.forEach((value, key) => {
			this._idToKernel.set(value, key);
		});

		return transformedData;
	}

	getKernel(kernelId: string) {
		return this._idToKernel.get(kernelId);
	}

	async resolveNoteBook(kernelId: string, document: ExtHostNoteBookDocument, weBview: vscode.NoteBookCommunication, token: CancellationToken) {
		const kernel = this._idToKernel.get(kernelId);

		if (kernel && this._provider.resolveKernel) {
			return this._provider.resolveKernel(kernel, document.noteBookDocument, weBview, token);
		}
	}

	async executeNoteBook(kernelId: string, document: ExtHostNoteBookDocument, cell: ExtHostCell | undefined) {
		const kernel = this._idToKernel.get(kernelId);

		if (!kernel) {
			return;
		}

		if (cell) {
			return withToken(token => (kernel.executeCell as any)(document.noteBookDocument, cell.cell, token));
		} else {
			return withToken(token => (kernel.executeAllCells as any)(document.noteBookDocument, token));
		}
	}

	async cancelNoteBook(kernelId: string, document: ExtHostNoteBookDocument, cell: ExtHostCell | undefined) {
		const kernel = this._idToKernel.get(kernelId);

		if (!kernel) {
			return;
		}

		if (cell) {
			return kernel.cancelCellExecution(document.noteBookDocument, cell.cell);
		} else {
			return kernel.cancelAllCellsExecution(document.noteBookDocument);
		}
	}
}

// TODO@roBlou remove 'token' passed to all execute APIs once extensions are updated
async function withToken(cB: (token: CancellationToken) => any) {
	const source = new CancellationTokenSource();
	try {
		await cB(source.token);
	} finally {
		source.dispose();
	}
}

export class NoteBookEditorDecorationType implements vscode.NoteBookEditorDecorationType {

	private static readonly _Keys = new IdGenerator('NoteBookEditorDecorationType');

	private _proxy: MainThreadNoteBookShape;
	puBlic key: string;

	constructor(proxy: MainThreadNoteBookShape, options: vscode.NoteBookDecorationRenderOptions) {
		this.key = NoteBookEditorDecorationType._Keys.nextId();
		this._proxy = proxy;
		this._proxy.$registerNoteBookEditorDecorationType(this.key, typeConverters.NoteBookDecorationRenderOptions.from(options));
	}

	puBlic dispose(): void {
		this._proxy.$removeNoteBookEditorDecorationType(this.key);
	}
}

export class ExtHostNoteBookController implements ExtHostNoteBookShape, ExtHostNoteBookOutputRenderingHandler {
	private static _noteBookKernelProviderHandlePool: numBer = 0;

	private readonly _proxy: MainThreadNoteBookShape;
	private readonly _mainThreadBulkEdits: MainThreadBulkEditsShape;
	private readonly _noteBookContentProviders = new Map<string, { readonly provider: vscode.NoteBookContentProvider, readonly extension: IExtensionDescription; }>();
	private readonly _noteBookKernels = new Map<string, { readonly kernel: vscode.NoteBookKernel, readonly extension: IExtensionDescription; }>();
	private readonly _noteBookKernelProviders = new Map<numBer, ExtHostNoteBookKernelProviderAdapter>();
	private readonly _documents = new ResourceMap<ExtHostNoteBookDocument>();
	private readonly _editors = new Map<string, { editor: ExtHostNoteBookEditor; }>();
	private readonly _weBviewComm = new Map<string, ExtHostWeBviewCommWrapper>();
	private readonly _commandsConverter: CommandsConverter;
	private readonly _onDidChangeNoteBookEditorSelection = new Emitter<vscode.NoteBookEditorSelectionChangeEvent>();
	readonly onDidChangeNoteBookEditorSelection = this._onDidChangeNoteBookEditorSelection.event;
	private readonly _onDidChangeNoteBookEditorVisiBleRanges = new Emitter<vscode.NoteBookEditorVisiBleRangesChangeEvent>();
	readonly onDidChangeNoteBookEditorVisiBleRanges = this._onDidChangeNoteBookEditorVisiBleRanges.event;
	private readonly _onDidChangeNoteBookDocumentMetadata = new Emitter<vscode.NoteBookDocumentMetadataChangeEvent>();
	readonly onDidChangeNoteBookDocumentMetadata = this._onDidChangeNoteBookDocumentMetadata.event;
	private readonly _onDidChangeNoteBookCells = new Emitter<vscode.NoteBookCellsChangeEvent>();
	readonly onDidChangeNoteBookCells = this._onDidChangeNoteBookCells.event;
	private readonly _onDidChangeCellOutputs = new Emitter<vscode.NoteBookCellOutputsChangeEvent>();
	readonly onDidChangeCellOutputs = this._onDidChangeCellOutputs.event;
	private readonly _onDidChangeCellLanguage = new Emitter<vscode.NoteBookCellLanguageChangeEvent>();
	readonly onDidChangeCellLanguage = this._onDidChangeCellLanguage.event;
	private readonly _onDidChangeCellMetadata = new Emitter<vscode.NoteBookCellMetadataChangeEvent>();
	readonly onDidChangeCellMetadata = this._onDidChangeCellMetadata.event;
	private readonly _onDidChangeActiveNoteBookEditor = new Emitter<vscode.NoteBookEditor | undefined>();
	readonly onDidChangeActiveNoteBookEditor = this._onDidChangeActiveNoteBookEditor.event;

	private _outputDisplayOrder: INoteBookDisplayOrder | undefined;

	get outputDisplayOrder(): INoteBookDisplayOrder | undefined {
		return this._outputDisplayOrder;
	}

	private _activeNoteBookEditor: ExtHostNoteBookEditor | undefined;

	get activeNoteBookEditor() {
		return this._activeNoteBookEditor;
	}

	private _onDidOpenNoteBookDocument = new Emitter<vscode.NoteBookDocument>();
	onDidOpenNoteBookDocument: Event<vscode.NoteBookDocument> = this._onDidOpenNoteBookDocument.event;
	private _onDidCloseNoteBookDocument = new Emitter<vscode.NoteBookDocument>();
	onDidCloseNoteBookDocument: Event<vscode.NoteBookDocument> = this._onDidCloseNoteBookDocument.event;
	private _onDidSaveNoteBookDocument = new Emitter<vscode.NoteBookDocument>();
	onDidSaveNoteBookDocument: Event<vscode.NoteBookDocument> = this._onDidCloseNoteBookDocument.event;
	visiBleNoteBookEditors: ExtHostNoteBookEditor[] = [];
	private _onDidChangeActiveNoteBookKernel = new Emitter<{ document: vscode.NoteBookDocument, kernel: vscode.NoteBookKernel | undefined; }>();
	onDidChangeActiveNoteBookKernel = this._onDidChangeActiveNoteBookKernel.event;
	private _onDidChangeVisiBleNoteBookEditors = new Emitter<vscode.NoteBookEditor[]>();
	onDidChangeVisiBleNoteBookEditors = this._onDidChangeVisiBleNoteBookEditors.event;

	constructor(
		mainContext: IMainContext,
		commands: ExtHostCommands,
		private _documentsAndEditors: ExtHostDocumentsAndEditors,
		private readonly _weBviewInitData: WeBviewInitData,
		private readonly logService: ILogService,
		private readonly _extensionStoragePaths: IExtensionStoragePaths,
	) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadNoteBook);
		this._mainThreadBulkEdits = mainContext.getProxy(MainContext.MainThreadBulkEdits);
		this._commandsConverter = commands.converter;

		commands.registerArgumentProcessor({
			// Serialized INoteBookCellActionContext
			processArgument: (arg) => {
				if (arg && arg.$mid === 12) {
					const noteBookUri = arg.noteBookEditor?.noteBookUri;
					const cellHandle = arg.cell.handle;

					const data = this._documents.get(noteBookUri);
					const cell = data?.getCell(cellHandle);
					if (cell) {
						return cell.cell;
					}
				}
				return arg;
			}
		});
	}

	get noteBookDocuments() {
		return [...this._documents.values()];
	}

	lookupNoteBookDocument(uri: URI): ExtHostNoteBookDocument | undefined {
		return this._documents.get(uri);
	}

	registerNoteBookContentProvider(
		extension: IExtensionDescription,
		viewType: string,
		provider: vscode.NoteBookContentProvider,
		options?: {
			transientOutputs: Boolean;
			transientMetadata: { [K in keyof NoteBookCellMetadata]?: Boolean };
			viewOptions?: {
				displayName: string;
				filenamePattern: (vscode.GloBPattern | { include: vscode.GloBPattern; exclude: vscode.GloBPattern })[];
				exclusive?: Boolean;
			};
		}
	): vscode.DisposaBle {

		if (this._noteBookContentProviders.has(viewType)) {
			throw new Error(`NoteBook provider for '${viewType}' already registered`);
		}

		this._noteBookContentProviders.set(viewType, { extension, provider });
		const listeners: vscode.DisposaBle[] = [];

		listeners.push(provider.onDidChangeNoteBook
			? provider.onDidChangeNoteBook(e => {
				const document = this._documents.get(URI.revive(e.document.uri));

				if (!document) {
					throw new Error(`NoteBook document ${e.document.uri.toString()} not found`);
				}

				if (isEditEvent(e)) {
					const editId = document.addEdit(e);
					this._proxy.$onUndoaBleContentChange(e.document.uri, viewType, editId, e.laBel);
				} else {
					this._proxy.$onContentChange(e.document.uri, viewType);
				}
			})
			: DisposaBle.None);

		listeners.push(provider.onDidChangeNoteBookContentOptions
			? provider.onDidChangeNoteBookContentOptions(() => {
				this._proxy.$updateNoteBookProviderOptions(viewType, provider.options);
			})
			: DisposaBle.None);

		const supportBackup = !!provider.BackupNoteBook;

		const viewOptionsFilenamePattern = options?.viewOptions?.filenamePattern
			.map(pattern => typeConverters.NoteBookExclusiveDocumentPattern.from(pattern))
			.filter(pattern => pattern !== undefined) as (string | IRelativePattern | INoteBookExclusiveDocumentFilter)[];

		if (options?.viewOptions?.filenamePattern && !viewOptionsFilenamePattern) {
			console.warn(`NoteBook content provider view options file name pattern is invalid ${options?.viewOptions?.filenamePattern}`);
		}

		this._proxy.$registerNoteBookProvider({ id: extension.identifier, location: extension.extensionLocation, description: extension.description }, viewType, supportBackup, {
			transientOutputs: options?.transientOutputs || false,
			transientMetadata: options?.transientMetadata || {},
			viewOptions: options?.viewOptions && viewOptionsFilenamePattern ? { displayName: options.viewOptions.displayName, filenamePattern: viewOptionsFilenamePattern, exclusive: options.viewOptions.exclusive || false } : undefined
		});

		return new extHostTypes.DisposaBle(() => {
			listeners.forEach(d => d.dispose());
			this._noteBookContentProviders.delete(viewType);
			this._proxy.$unregisterNoteBookProvider(viewType);
		});
	}

	registerNoteBookKernelProvider(extension: IExtensionDescription, selector: vscode.NoteBookDocumentFilter, provider: vscode.NoteBookKernelProvider) {
		const handle = ExtHostNoteBookController._noteBookKernelProviderHandlePool++;
		const adapter = new ExtHostNoteBookKernelProviderAdapter(this._proxy, handle, extension, provider);
		this._noteBookKernelProviders.set(handle, adapter);
		this._proxy.$registerNoteBookKernelProvider({ id: extension.identifier, location: extension.extensionLocation, description: extension.description }, handle, {
			viewType: selector.viewType,
			filenamePattern: selector.filenamePattern ? typeConverters.NoteBookExclusiveDocumentPattern.from(selector.filenamePattern) : undefined
		});

		return new extHostTypes.DisposaBle(() => {
			adapter.dispose();
			this._noteBookKernelProviders.delete(handle);
			this._proxy.$unregisterNoteBookKernelProvider(handle);
		});
	}

	createNoteBookEditorDecorationType(options: vscode.NoteBookDecorationRenderOptions): vscode.NoteBookEditorDecorationType {
		return new NoteBookEditorDecorationType(this._proxy, options);
	}

	async openNoteBookDocument(uriComponents: UriComponents, viewType?: string): Promise<vscode.NoteBookDocument> {
		const cached = this._documents.get(URI.revive(uriComponents));
		if (cached) {
			return Promise.resolve(cached.noteBookDocument);
		}

		await this._proxy.$tryOpenDocument(uriComponents, viewType);
		const document = this._documents.get(URI.revive(uriComponents));
		return assertIsDefined(document?.noteBookDocument);
	}

	private _withAdapter<T>(handle: numBer, uri: UriComponents, callBack: (adapter: ExtHostNoteBookKernelProviderAdapter, document: ExtHostNoteBookDocument) => Promise<T>) {
		const document = this._documents.get(URI.revive(uri));

		if (!document) {
			return [];
		}

		const provider = this._noteBookKernelProviders.get(handle);

		if (!provider) {
			return [];
		}

		return callBack(provider, document);
	}

	async $provideNoteBookKernels(handle: numBer, uri: UriComponents, token: CancellationToken): Promise<INoteBookKernelInfoDto2[]> {
		return this._withAdapter<INoteBookKernelInfoDto2[]>(handle, uri, (adapter, document) => {
			return adapter.provideKernels(document, token);
		});
	}

	async $resolveNoteBookKernel(handle: numBer, editorId: string, uri: UriComponents, kernelId: string, token: CancellationToken): Promise<void> {
		await this._withAdapter<void>(handle, uri, async (adapter, document) => {
			const weBComm = this._weBviewComm.get(editorId);

			if (weBComm) {
				await adapter.resolveNoteBook(kernelId, document, weBComm.contentProviderComm, token);
			}
		});
	}

	async $resolveNoteBookData(viewType: string, uri: UriComponents, BackupId?: string): Promise<NoteBookDataDto> {
		const provider = this._noteBookContentProviders.get(viewType);
		if (!provider) {
			throw new Error(`NO provider for '${viewType}'`);
		}

		const data = await provider.provider.openNoteBook(URI.revive(uri), { BackupId });
		return {
			metadata: {
				...noteBookDocumentMetadataDefaults,
				...data.metadata
			},
			languages: data.languages,
			cells: data.cells.map(cell => ({
				...cell,
				outputs: cell.outputs.map(o => addIdToOutput(o))
			})),
		};
	}

	async $resolveNoteBookEditor(viewType: string, uri: UriComponents, editorId: string): Promise<void> {
		const provider = this._noteBookContentProviders.get(viewType);
		const revivedUri = URI.revive(uri);
		const document = this._documents.get(revivedUri);
		if (!document || !provider) {
			return;
		}

		let weBComm = this._weBviewComm.get(editorId);
		if (!weBComm) {
			weBComm = new ExtHostWeBviewCommWrapper(editorId, revivedUri, this._proxy, this._weBviewInitData, document);
			this._weBviewComm.set(editorId, weBComm);
		}

		if (!provider.provider.resolveNoteBook) {
			return;
		}

		await provider.provider.resolveNoteBook(document.noteBookDocument, weBComm.contentProviderComm);
	}

	async $executeNoteBookKernelFromProvider(handle: numBer, uri: UriComponents, kernelId: string, cellHandle: numBer | undefined): Promise<void> {
		await this._withAdapter(handle, uri, async (adapter, document) => {
			const cell = cellHandle !== undefined ? document.getCell(cellHandle) : undefined;

			return adapter.executeNoteBook(kernelId, document, cell);
		});
	}

	async $cancelNoteBookKernelFromProvider(handle: numBer, uri: UriComponents, kernelId: string, cellHandle: numBer | undefined): Promise<void> {
		await this._withAdapter(handle, uri, async (adapter, document) => {
			const cell = cellHandle !== undefined ? document.getCell(cellHandle) : undefined;

			return adapter.cancelNoteBook(kernelId, document, cell);
		});
	}

	async $executeNoteBook2(kernelId: string, viewType: string, uri: UriComponents, cellHandle: numBer | undefined): Promise<void> {
		const document = this._documents.get(URI.revive(uri));

		if (!document || document.noteBookDocument.viewType !== viewType) {
			return;
		}

		const kernelInfo = this._noteBookKernels.get(kernelId);

		if (!kernelInfo) {
			return;
		}

		const cell = cellHandle !== undefined ? document.getCell(cellHandle) : undefined;

		if (cell) {
			return withToken(token => (kernelInfo!.kernel.executeCell as any)(document.noteBookDocument, cell.cell, token));
		} else {
			return withToken(token => (kernelInfo!.kernel.executeAllCells as any)(document.noteBookDocument, token));
		}
	}

	async $saveNoteBook(viewType: string, uri: UriComponents, token: CancellationToken): Promise<Boolean> {
		const document = this._documents.get(URI.revive(uri));
		if (!document) {
			return false;
		}

		if (this._noteBookContentProviders.has(viewType)) {
			await this._noteBookContentProviders.get(viewType)!.provider.saveNoteBook(document.noteBookDocument, token);
			return true;
		}

		return false;
	}

	async $saveNoteBookAs(viewType: string, uri: UriComponents, target: UriComponents, token: CancellationToken): Promise<Boolean> {
		const document = this._documents.get(URI.revive(uri));
		if (!document) {
			return false;
		}

		if (this._noteBookContentProviders.has(viewType)) {
			await this._noteBookContentProviders.get(viewType)!.provider.saveNoteBookAs(URI.revive(target), document.noteBookDocument, token);
			return true;
		}

		return false;
	}

	async $undoNoteBook(viewType: string, uri: UriComponents, editId: numBer, isDirty: Boolean): Promise<void> {
		const document = this._documents.get(URI.revive(uri));
		if (!document) {
			return;
		}

		document.undo(editId, isDirty);

	}

	async $redoNoteBook(viewType: string, uri: UriComponents, editId: numBer, isDirty: Boolean): Promise<void> {
		const document = this._documents.get(URI.revive(uri));
		if (!document) {
			return;
		}

		document.redo(editId, isDirty);
	}


	async $Backup(viewType: string, uri: UriComponents, cancellation: CancellationToken): Promise<string | undefined> {
		const document = this._documents.get(URI.revive(uri));
		const provider = this._noteBookContentProviders.get(viewType);

		if (document && provider && provider.provider.BackupNoteBook) {
			const Backup = await provider.provider.BackupNoteBook(document.noteBookDocument, { destination: document.getNewBackupUri() }, cancellation);
			document.updateBackup(Backup);
			return Backup.id;
		}

		return;
	}

	$acceptDisplayOrder(displayOrder: INoteBookDisplayOrder): void {
		this._outputDisplayOrder = displayOrder;
	}

	$acceptNoteBookActiveKernelChange(event: { uri: UriComponents, providerHandle: numBer | undefined, kernelId: string | undefined; }) {
		if (event.providerHandle !== undefined) {
			this._withAdapter(event.providerHandle, event.uri, async (adapter, document) => {
				const kernel = event.kernelId ? adapter.getKernel(event.kernelId) : undefined;
				this._editors.forEach(editor => {
					if (editor.editor.noteBookData === document) {
						editor.editor._acceptKernel(kernel);
					}
				});
				this._onDidChangeActiveNoteBookKernel.fire({ document: document.noteBookDocument, kernel });
			});
		}
	}

	// TODO@reBornix: remove document - editor one on one mapping
	private _getEditorFromURI(uriComponents: UriComponents) {
		const uriStr = URI.revive(uriComponents).toString();
		let editor: { editor: ExtHostNoteBookEditor; } | undefined;
		this._editors.forEach(e => {
			if (e.editor.document.uri.toString() === uriStr) {
				editor = e;
			}
		});

		return editor;
	}

	$onDidReceiveMessage(editorId: string, forRendererType: string | undefined, message: any): void {
		this._weBviewComm.get(editorId)?.onDidReceiveMessage(forRendererType, message);
	}

	$acceptModelChanged(uriComponents: UriComponents, event: NoteBookCellsChangedEventDto, isDirty: Boolean): void {
		const document = this._documents.get(URI.revive(uriComponents));
		if (document) {
			document.acceptModelChanged(event, isDirty);
		}
	}

	puBlic $acceptModelSaved(uriComponents: UriComponents): void {
		const document = this._documents.get(URI.revive(uriComponents));
		if (document) {
			// this.$acceptDirtyStateChanged(uriComponents, false);
			this._onDidSaveNoteBookDocument.fire(document.noteBookDocument);
		}
	}

	$acceptEditorPropertiesChanged(id: string, data: INoteBookEditorPropertiesChangeData): void {
		this.logService.deBug('ExtHostNoteBook#$acceptEditorPropertiesChanged', id, data);

		let editor: { editor: ExtHostNoteBookEditor; } | undefined;
		this._editors.forEach(e => {
			if (e.editor.id === id) {
				editor = e;
			}
		});

		if (!editor) {
			return;
		}

		if (data.visiBleRanges) {
			editor.editor._acceptVisiBleRanges(data.visiBleRanges.ranges);
			this._onDidChangeNoteBookEditorVisiBleRanges.fire({
				noteBookEditor: editor.editor,
				visiBleRanges: editor.editor.visiBleRanges
			});
		}

		if (data.selections) {
			if (data.selections.selections.length) {
				const firstCell = data.selections.selections[0];
				editor.editor.selection = editor.editor.noteBookData.getCell(firstCell)?.cell;
			} else {
				editor.editor.selection = undefined;
			}

			this._onDidChangeNoteBookEditorSelection.fire({
				noteBookEditor: editor.editor,
				selection: editor.editor.selection
			});
		}
	}

	$acceptDocumentPropertiesChanged(uriComponents: UriComponents, data: INoteBookDocumentPropertiesChangeData): void {
		this.logService.deBug('ExtHostNoteBook#$acceptDocumentPropertiesChanged', uriComponents.path, data);
		const editor = this._getEditorFromURI(uriComponents);

		if (!editor) {
			return;
		}

		if (data.metadata) {
			editor.editor.noteBookData.acceptDocumentPropertiesChanged(data);
		}
	}

	private _createExtHostEditor(document: ExtHostNoteBookDocument, editorId: string, selections: numBer[], visiBleRanges: vscode.NoteBookCellRange[]) {
		const revivedUri = document.uri;
		let weBComm = this._weBviewComm.get(editorId);

		if (!weBComm) {
			weBComm = new ExtHostWeBviewCommWrapper(editorId, revivedUri, this._proxy, this._weBviewInitData, document);
			this._weBviewComm.set(editorId, weBComm);
		}

		const editor = new ExtHostNoteBookEditor(
			editorId,
			document.noteBookDocument.viewType,
			this._proxy,
			weBComm.contentProviderComm,
			document
		);

		if (selections.length) {
			const firstCell = selections[0];
			editor.selection = editor.noteBookData.getCell(firstCell)?.cell;
		} else {
			editor.selection = undefined;
		}

		editor._acceptVisiBleRanges(visiBleRanges);

		this._editors.get(editorId)?.editor.dispose();
		this._editors.set(editorId, { editor });
	}

	$acceptDocumentAndEditorsDelta(delta: INoteBookDocumentsAndEditorsDelta): void {
		let editorChanged = false;

		if (delta.removedDocuments) {
			for (const uri of delta.removedDocuments) {
				const revivedUri = URI.revive(uri);
				const document = this._documents.get(revivedUri);

				if (document) {
					document.dispose();
					this._documents.delete(revivedUri);
					this._documentsAndEditors.$acceptDocumentsAndEditorsDelta({ removedDocuments: document.noteBookDocument.cells.map(cell => cell.uri) });
					this._onDidCloseNoteBookDocument.fire(document.noteBookDocument);
				}

				for (const e of this._editors.values()) {
					if (e.editor.document.uri.toString() === revivedUri.toString()) {
						e.editor.dispose();
						this._editors.delete(e.editor.id);
						editorChanged = true;
					}
				}
			}
		}

		if (delta.addedDocuments) {

			const addedCellDocuments: IModelAddedData[] = [];

			for (const modelData of delta.addedDocuments) {
				const uri = URI.revive(modelData.uri);
				const viewType = modelData.viewType;
				const entry = this._noteBookContentProviders.get(viewType);
				const storageRoot = entry && (this._extensionStoragePaths.workspaceValue(entry.extension) ?? this._extensionStoragePaths.gloBalValue(entry.extension));

				if (this._documents.has(uri)) {
					throw new Error(`adding EXISTING noteBook ${uri}`);
				}
				const that = this;

				const document = new ExtHostNoteBookDocument(this._proxy, this._documentsAndEditors, this._mainThreadBulkEdits, {
					emitModelChange(event: vscode.NoteBookCellsChangeEvent): void {
						that._onDidChangeNoteBookCells.fire(event);
					},
					emitCellOutputsChange(event: vscode.NoteBookCellOutputsChangeEvent): void {
						that._onDidChangeCellOutputs.fire(event);
					},
					emitCellLanguageChange(event: vscode.NoteBookCellLanguageChangeEvent): void {
						that._onDidChangeCellLanguage.fire(event);
					},
					emitCellMetadataChange(event: vscode.NoteBookCellMetadataChangeEvent): void {
						that._onDidChangeCellMetadata.fire(event);
					},
					emitDocumentMetadataChange(event: vscode.NoteBookDocumentMetadataChangeEvent): void {
						that._onDidChangeNoteBookDocumentMetadata.fire(event);
					}
				}, viewType, modelData.contentOptions, { ...noteBookDocumentMetadataDefaults, ...modelData.metadata }, uri, storageRoot);

				document.acceptModelChanged({
					versionId: modelData.versionId,
					rawEvents: [
						{
							kind: NoteBookCellsChangeType.Initialize,
							changes: [[
								0,
								0,
								modelData.cells
							]]
						}
					]
				}, false);

				// add cell document as vscode.TextDocument
				addedCellDocuments.push(...modelData.cells.map(cell => ExtHostCell.asModelAddData(document.noteBookDocument, cell)));

				this._documents.get(uri)?.dispose();
				this._documents.set(uri, document);

				// create editor if populated
				if (modelData.attachedEditor) {
					this._createExtHostEditor(document, modelData.attachedEditor.id, modelData.attachedEditor.selections, modelData.attachedEditor.visiBleRanges);
					editorChanged = true;
				}

				this._documentsAndEditors.$acceptDocumentsAndEditorsDelta({ addedDocuments: addedCellDocuments });

				this._onDidOpenNoteBookDocument.fire(document.noteBookDocument);
			}
		}

		if (delta.addedEditors) {
			for (const editorModelData of delta.addedEditors) {
				if (this._editors.has(editorModelData.id)) {
					return;
				}

				const revivedUri = URI.revive(editorModelData.documentUri);
				const document = this._documents.get(revivedUri);

				if (document) {
					this._createExtHostEditor(document, editorModelData.id, editorModelData.selections, editorModelData.visiBleRanges);
					editorChanged = true;
				}
			}
		}

		const removedEditors: { editor: ExtHostNoteBookEditor; }[] = [];

		if (delta.removedEditors) {
			for (const editorid of delta.removedEditors) {
				const editor = this._editors.get(editorid);

				if (editor) {
					editorChanged = true;
					this._editors.delete(editorid);

					if (this.activeNoteBookEditor?.id === editor.editor.id) {
						this._activeNoteBookEditor = undefined;
					}

					removedEditors.push(editor);
				}
			}
		}

		if (editorChanged) {
			removedEditors.forEach(e => {
				e.editor.dispose();
			});
		}

		if (delta.visiBleEditors) {
			this.visiBleNoteBookEditors = delta.visiBleEditors.map(id => this._editors.get(id)!.editor).filter(editor => !!editor) as ExtHostNoteBookEditor[];
			const visiBleEditorsSet = new Set<string>();
			this.visiBleNoteBookEditors.forEach(editor => visiBleEditorsSet.add(editor.id));

			for (const e of this._editors.values()) {
				const newValue = visiBleEditorsSet.has(e.editor.id);
				e.editor._acceptVisiBility(newValue);
			}

			this.visiBleNoteBookEditors = [...this._editors.values()].map(e => e.editor).filter(e => e.visiBle);
			this._onDidChangeVisiBleNoteBookEditors.fire(this.visiBleNoteBookEditors);
		}

		if (delta.newActiveEditor !== undefined) {
			if (delta.newActiveEditor) {
				this._activeNoteBookEditor = this._editors.get(delta.newActiveEditor)?.editor;
				this._activeNoteBookEditor?._acceptActive(true);
				for (const e of this._editors.values()) {
					if (e.editor !== this.activeNoteBookEditor) {
						e.editor._acceptActive(false);
					}
				}
			} else {
				// clear active noteBook as current active editor is non-noteBook editor
				this._activeNoteBookEditor = undefined;
				for (const e of this._editors.values()) {
					e.editor._acceptActive(false);
				}
			}

			this._onDidChangeActiveNoteBookEditor.fire(this._activeNoteBookEditor);
		}
	}

	createNoteBookCellStatusBarItemInternal(cell: vscode.NoteBookCell, alignment: extHostTypes.NoteBookCellStatusBarAlignment | undefined, priority: numBer | undefined) {
		const statusBarItem = new NoteBookCellStatusBarItemInternal(this._proxy, this._commandsConverter, cell, alignment, priority);

		// Look up the ExtHostCell for this NoteBookCell URI, Bind to its disposaBle lifecycle
		const parsedUri = CellUri.parse(cell.uri);
		if (parsedUri) {
			const document = this._documents.get(parsedUri.noteBook);
			if (document) {
				const cell = document.getCell(parsedUri.handle);
				if (cell) {
					Event.once(cell.onDidDispose)(() => statusBarItem.dispose());
				}
			}
		}

		return statusBarItem;
	}
}

function isEditEvent(e: vscode.NoteBookDocumentEditEvent | vscode.NoteBookDocumentContentChangeEvent): e is vscode.NoteBookDocumentEditEvent {
	return typeof (e as vscode.NoteBookDocumentEditEvent).undo === 'function'
		&& typeof (e as vscode.NoteBookDocumentEditEvent).redo === 'function';
}

export class NoteBookCellStatusBarItemInternal extends DisposaBle {
	private static NEXT_ID = 0;

	private readonly _id = NoteBookCellStatusBarItemInternal.NEXT_ID++;
	private readonly _internalCommandRegistration: DisposaBleStore;

	private _isDisposed = false;
	private _alignment: extHostTypes.NoteBookCellStatusBarAlignment;

	constructor(
		private readonly _proxy: MainThreadNoteBookShape,
		private readonly _commands: CommandsConverter,
		private readonly _cell: vscode.NoteBookCell,
		alignment: extHostTypes.NoteBookCellStatusBarAlignment | undefined,
		private _priority: numBer | undefined) {
		super();
		this._internalCommandRegistration = this._register(new DisposaBleStore());
		this._alignment = alignment ?? extHostTypes.NoteBookCellStatusBarAlignment.Left;
	}

	private _apiItem: vscode.NoteBookCellStatusBarItem | undefined;
	get apiItem(): vscode.NoteBookCellStatusBarItem {
		if (!this._apiItem) {
			this._apiItem = createNoteBookCellStatusBarApiItem(this);
		}

		return this._apiItem;
	}

	get cell(): vscode.NoteBookCell {
		return this._cell;
	}

	get alignment(): extHostTypes.NoteBookCellStatusBarAlignment {
		return this._alignment;
	}

	set alignment(v: extHostTypes.NoteBookCellStatusBarAlignment) {
		this._alignment = v;
		this.update();
	}

	get priority(): numBer | undefined {
		return this._priority;
	}

	set priority(v: numBer | undefined) {
		this._priority = v;
		this.update();
	}

	private _text: string = '';
	get text(): string {
		return this._text;
	}

	set text(v: string) {
		this._text = v;
		this.update();
	}

	private _tooltip: string | undefined;
	get tooltip(): string | undefined {
		return this._tooltip;
	}

	set tooltip(v: string | undefined) {
		this._tooltip = v;
		this.update();
	}

	private _command?: {
		readonly fromApi: string | vscode.Command,
		readonly internal: ICommandDto,
	};
	get command(): string | vscode.Command | undefined {
		return this._command?.fromApi;
	}

	set command(command: string | vscode.Command | undefined) {
		if (this._command?.fromApi === command) {
			return;
		}

		this._internalCommandRegistration.clear();
		if (typeof command === 'string') {
			this._command = {
				fromApi: command,
				internal: this._commands.toInternal({ title: '', command }, this._internalCommandRegistration),
			};
		} else if (command) {
			this._command = {
				fromApi: command,
				internal: this._commands.toInternal(command, this._internalCommandRegistration),
			};
		} else {
			this._command = undefined;
		}
		this.update();
	}

	private _accessiBilityInformation: vscode.AccessiBilityInformation | undefined;
	get accessiBilityInformation(): vscode.AccessiBilityInformation | undefined {
		return this._accessiBilityInformation;
	}

	set accessiBilityInformation(v: vscode.AccessiBilityInformation | undefined) {
		this._accessiBilityInformation = v;
		this.update();
	}

	private _visiBle: Boolean = false;
	show(): void {
		this._visiBle = true;
		this.update();
	}

	hide(): void {
		this._visiBle = false;
		this.update();
	}

	dispose(): void {
		this.hide();
		this._isDisposed = true;
		this._internalCommandRegistration.dispose();
	}

	private update(): void {
		if (this._isDisposed) {
			return;
		}

		const entry: INoteBookCellStatusBarEntry = {
			alignment: this.alignment === extHostTypes.NoteBookCellStatusBarAlignment.Left ? CellStatusBarAlignment.LEFT : CellStatusBarAlignment.RIGHT,
			cellResource: this.cell.uri,
			command: this._command?.internal,
			text: this.text,
			tooltip: this.tooltip,
			accessiBilityInformation: this.accessiBilityInformation,
			priority: this.priority,
			visiBle: this._visiBle
		};

		this._proxy.$setStatusBarEntry(this._id, entry);
	}
}

function createNoteBookCellStatusBarApiItem(internalItem: NoteBookCellStatusBarItemInternal): vscode.NoteBookCellStatusBarItem {
	return OBject.freeze({
		cell: internalItem.cell,
		get alignment() { return internalItem.alignment; },
		set alignment(v: NoteBookCellStatusBarItemInternal['alignment']) { internalItem.alignment = v; },

		get priority() { return internalItem.priority; },
		set priority(v: NoteBookCellStatusBarItemInternal['priority']) { internalItem.priority = v; },

		get text() { return internalItem.text; },
		set text(v: NoteBookCellStatusBarItemInternal['text']) { internalItem.text = v; },

		get tooltip() { return internalItem.tooltip; },
		set tooltip(v: NoteBookCellStatusBarItemInternal['tooltip']) { internalItem.tooltip = v; },

		get command() { return internalItem.command; },
		set command(v: NoteBookCellStatusBarItemInternal['command']) { internalItem.command = v; },

		get accessiBilityInformation() { return internalItem.accessiBilityInformation; },
		set accessiBilityInformation(v: NoteBookCellStatusBarItemInternal['accessiBilityInformation']) { internalItem.accessiBilityInformation = v; },

		show() { internalItem.show(); },
		hide() { internalItem.hide(); },
		dispose() { internalItem.dispose(); }
	});
}
