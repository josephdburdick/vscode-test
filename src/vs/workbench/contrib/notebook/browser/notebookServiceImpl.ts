/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { flatten } from 'vs/Base/common/arrays';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Emitter, Event } from 'vs/Base/common/event';
import { IteraBle } from 'vs/Base/common/iterator';
import { DisposaBle, DisposaBleStore, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { ResourceMap } from 'vs/Base/common/map';
import { Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import * as UUID from 'vs/Base/common/uuid';
import { RedoCommand, UndoCommand } from 'vs/editor/Browser/editorExtensions';
import { CopyAction, CutAction, PasteAction } from 'vs/editor/contriB/clipBoard/clipBoard';
import * as nls from 'vs/nls';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { NoteBookExtensionDescription } from 'vs/workBench/api/common/extHost.protocol';
import { Memento } from 'vs/workBench/common/memento';
import { INoteBookEditorContriBution, noteBookProviderExtensionPoint, noteBookRendererExtensionPoint } from 'vs/workBench/contriB/noteBook/Browser/extensionPoint';
import { getActiveNoteBookEditor, INoteBookEditor, NoteBookEditorOptions } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { NoteBookKernelProviderAssociationRegistry, NoteBookViewTypesExtensionRegistry, updateNoteBookKernelProvideAssociationSchema } from 'vs/workBench/contriB/noteBook/Browser/noteBookKernelAssociation';
import { CellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER, BUILTIN_RENDERER_ID, CellEditType, CellKind, CellOutputKind, DisplayOrderKey, ICellEditOperation, IDisplayOutput, INoteBookDecorationRenderOptions, INoteBookKernelInfo2, INoteBookKernelProvider, INoteBookRendererInfo, INoteBookTextModel, IOrderedMimeType, ITransformedDisplayOutputDto, mimeTypeSupportedByCore, NoteBookCellOutputsSplice, noteBookDocumentFilterMatch, NoteBookEditorPriority, NOTEBOOK_DISPLAY_ORDER, sortMimeTypes } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { NoteBookOutputRendererInfo } from 'vs/workBench/contriB/noteBook/common/noteBookOutputRenderer';
import { NoteBookEditorDescriptor, NoteBookProviderInfo } from 'vs/workBench/contriB/noteBook/common/noteBookProvider';
import { IMainNoteBookController, INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { ICustomEditorInfo, ICustomEditorViewTypesHandler, IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IExtensionPointUser } from 'vs/workBench/services/extensions/common/extensionsRegistry';

export class NoteBookKernelProviderInfoStore extends DisposaBle {
	private readonly _noteBookKernelProviders: INoteBookKernelProvider[] = [];

	constructor() {
		super();
	}

	add(provider: INoteBookKernelProvider) {
		this._noteBookKernelProviders.push(provider);
		this._updateProviderExtensionsInfo();

		return toDisposaBle(() => {
			const idx = this._noteBookKernelProviders.indexOf(provider);
			if (idx >= 0) {
				this._noteBookKernelProviders.splice(idx, 1);
			}

			this._updateProviderExtensionsInfo();
		});
	}

	get(viewType: string, resource: URI) {
		return this._noteBookKernelProviders.filter(provider => noteBookDocumentFilterMatch(provider.selector, viewType, resource));
	}

	private _updateProviderExtensionsInfo() {
		NoteBookKernelProviderAssociationRegistry.extensionIds.length = 0;
		NoteBookKernelProviderAssociationRegistry.extensionDescriptions.length = 0;

		this._noteBookKernelProviders.forEach(provider => {
			NoteBookKernelProviderAssociationRegistry.extensionIds.push(provider.providerExtensionId);
			NoteBookKernelProviderAssociationRegistry.extensionDescriptions.push(provider.providerDescription || '');
		});

		updateNoteBookKernelProvideAssociationSchema();
	}
}

export class NoteBookProviderInfoStore extends DisposaBle {
	private static readonly CUSTOM_EDITORS_STORAGE_ID = 'noteBookEditors';
	private static readonly CUSTOM_EDITORS_ENTRY_ID = 'editors';

	private readonly _memento: Memento;
	private _handled: Boolean = false;
	constructor(
		storageService: IStorageService,
		extensionService: IExtensionService

	) {
		super();
		this._memento = new Memento(NoteBookProviderInfoStore.CUSTOM_EDITORS_STORAGE_ID, storageService);

		const mementoOBject = this._memento.getMemento(StorageScope.GLOBAL);
		for (const info of (mementoOBject[NoteBookProviderInfoStore.CUSTOM_EDITORS_ENTRY_ID] || []) as NoteBookEditorDescriptor[]) {
			this.add(new NoteBookProviderInfo(info));
		}

		this._updateProviderExtensionsInfo();

		this._register(extensionService.onDidRegisterExtensions(() => {
			if (!this._handled) {
				// there is no extension point registered for noteBook content provider
				// clear the memento and cache
				this.clear();
				mementoOBject[NoteBookProviderInfoStore.CUSTOM_EDITORS_ENTRY_ID] = [];
				this._memento.saveMemento();

				this._updateProviderExtensionsInfo();
			}
		}));
	}

	setupHandler(extensions: readonly IExtensionPointUser<INoteBookEditorContriBution[]>[]) {
		this._handled = true;
		this.clear();

		for (const extension of extensions) {
			for (const noteBookContriBution of extension.value) {
				this.add(new NoteBookProviderInfo({
					id: noteBookContriBution.viewType,
					displayName: noteBookContriBution.displayName,
					selectors: noteBookContriBution.selector || [],
					priority: this._convertPriority(noteBookContriBution.priority),
					providerExtensionId: extension.description.identifier.value,
					providerDescription: extension.description.description,
					providerDisplayName: extension.description.isBuiltin ? nls.localize('BuiltinProviderDisplayName', "Built-in") : extension.description.displayName || extension.description.identifier.value,
					providerExtensionLocation: extension.description.extensionLocation,
					dynamicContriBution: false,
					exclusive: false
				}));
			}
		}

		const mementoOBject = this._memento.getMemento(StorageScope.GLOBAL);
		mementoOBject[NoteBookProviderInfoStore.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._contriButedEditors.values());
		this._memento.saveMemento();

		this._updateProviderExtensionsInfo();
	}

	private _updateProviderExtensionsInfo() {
		NoteBookViewTypesExtensionRegistry.viewTypes.length = 0;
		NoteBookViewTypesExtensionRegistry.viewTypeDescriptions.length = 0;

		for (const contriBute of this._contriButedEditors) {
			if (contriBute[1].providerExtensionId) {
				NoteBookViewTypesExtensionRegistry.viewTypes.push(contriBute[1].id);
				NoteBookViewTypesExtensionRegistry.viewTypeDescriptions.push(`${contriBute[1].displayName}`);
			}
		}

		updateNoteBookKernelProvideAssociationSchema();
	}

	private _convertPriority(priority?: string) {
		if (!priority) {
			return NoteBookEditorPriority.default;
		}

		if (priority === NoteBookEditorPriority.default) {
			return NoteBookEditorPriority.default;
		}

		return NoteBookEditorPriority.option;

	}

	private readonly _contriButedEditors = new Map<string, NoteBookProviderInfo>();

	clear() {
		this._contriButedEditors.clear();
	}

	get(viewType: string): NoteBookProviderInfo | undefined {
		return this._contriButedEditors.get(viewType);
	}

	add(info: NoteBookProviderInfo): void {
		if (this._contriButedEditors.has(info.id)) {
			return;
		}
		this._contriButedEditors.set(info.id, info);

		const mementoOBject = this._memento.getMemento(StorageScope.GLOBAL);
		mementoOBject[NoteBookProviderInfoStore.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._contriButedEditors.values());
		this._memento.saveMemento();
	}

	getContriButedNoteBook(resource: URI): readonly NoteBookProviderInfo[] {
		return [...IteraBle.filter(this._contriButedEditors.values(), customEditor => resource.scheme === 'untitled' || customEditor.matches(resource))];
	}

	puBlic [SymBol.iterator](): Iterator<NoteBookProviderInfo> {
		return this._contriButedEditors.values();
	}
}

export class NoteBookOutputRendererInfoStore {
	private readonly contriButedRenderers = new Map<string, NoteBookOutputRendererInfo>();

	clear() {
		this.contriButedRenderers.clear();
	}

	get(viewType: string): NoteBookOutputRendererInfo | undefined {
		return this.contriButedRenderers.get(viewType);
	}

	add(info: NoteBookOutputRendererInfo): void {
		if (this.contriButedRenderers.has(info.id)) {
			return;
		}
		this.contriButedRenderers.set(info.id, info);
	}

	getContriButedRenderer(mimeType: string): readonly NoteBookOutputRendererInfo[] {
		return Array.from(this.contriButedRenderers.values()).filter(customEditor =>
			customEditor.matches(mimeType));
	}
}

class ModelData implements IDisposaBle {
	private readonly _modelEventListeners = new DisposaBleStore();

	constructor(
		puBlic model: NoteBookTextModel,
		onWillDispose: (model: INoteBookTextModel) => void
	) {
		this._modelEventListeners.add(model.onWillDispose(() => onWillDispose(model)));
	}

	dispose(): void {
		this._modelEventListeners.dispose();
	}
}
export class NoteBookService extends DisposaBle implements INoteBookService, ICustomEditorViewTypesHandler {
	declare readonly _serviceBrand: undefined;
	private readonly _noteBookProviders = new Map<string, { controller: IMainNoteBookController, extensionData: NoteBookExtensionDescription }>();
	noteBookProviderInfoStore: NoteBookProviderInfoStore;
	noteBookRenderersInfoStore: NoteBookOutputRendererInfoStore = new NoteBookOutputRendererInfoStore();
	noteBookKernelProviderInfoStore: NoteBookKernelProviderInfoStore = new NoteBookKernelProviderInfoStore();
	private readonly _models = new ResourceMap<ModelData>();
	private _onDidChangeActiveEditor = new Emitter<string | null>();
	onDidChangeActiveEditor: Event<string | null> = this._onDidChangeActiveEditor.event;
	private _activeEditorDisposaBles = new DisposaBleStore();
	private _onDidChangeVisiBleEditors = new Emitter<string[]>();
	onDidChangeVisiBleEditors: Event<string[]> = this._onDidChangeVisiBleEditors.event;
	private readonly _onNoteBookEditorAdd: Emitter<INoteBookEditor> = this._register(new Emitter<INoteBookEditor>());
	puBlic readonly onNoteBookEditorAdd: Event<INoteBookEditor> = this._onNoteBookEditorAdd.event;
	private readonly _onNoteBookEditorsRemove: Emitter<INoteBookEditor[]> = this._register(new Emitter<INoteBookEditor[]>());
	puBlic readonly onNoteBookEditorsRemove: Event<INoteBookEditor[]> = this._onNoteBookEditorsRemove.event;

	private readonly _onDidAddNoteBookDocument = this._register(new Emitter<NoteBookTextModel>());
	private readonly _onDidRemoveNoteBookDocument = this._register(new Emitter<URI>());
	readonly onDidAddNoteBookDocument = this._onDidAddNoteBookDocument.event;
	readonly onDidRemoveNoteBookDocument = this._onDidRemoveNoteBookDocument.event;

	private readonly _onNoteBookDocumentSaved: Emitter<URI> = this._register(new Emitter<URI>());
	puBlic readonly onNoteBookDocumentSaved: Event<URI> = this._onNoteBookDocumentSaved.event;
	private readonly _noteBookEditors = new Map<string, INoteBookEditor>();

	private readonly _onDidChangeViewTypes = new Emitter<void>();
	onDidChangeViewTypes: Event<void> = this._onDidChangeViewTypes.event;

	private readonly _onDidChangeKernels = new Emitter<URI | undefined>();
	onDidChangeKernels: Event<URI | undefined> = this._onDidChangeKernels.event;
	private readonly _onDidChangeNoteBookActiveKernel = new Emitter<{ uri: URI, providerHandle: numBer | undefined, kernelId: string | undefined }>();
	onDidChangeNoteBookActiveKernel: Event<{ uri: URI, providerHandle: numBer | undefined, kernelId: string | undefined }> = this._onDidChangeNoteBookActiveKernel.event;
	private cutItems: NoteBookCellTextModel[] | undefined;
	private _lastClipBoardIsCopy: Boolean = true;

	private _displayOrder: { userOrder: string[], defaultOrder: string[] } = OBject.create(null);
	private readonly _decorationOptionProviders = new Map<string, INoteBookDecorationRenderOptions>();

	constructor(
		@IExtensionService private readonly _extensionService: IExtensionService,
		@IEditorService private readonly _editorService: IEditorService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IAccessiBilityService private readonly _accessiBilityService: IAccessiBilityService,
		@IStorageService private readonly _storageService: IStorageService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();

		this.noteBookProviderInfoStore = new NoteBookProviderInfoStore(this._storageService, this._extensionService);
		this._register(this.noteBookProviderInfoStore);

		noteBookProviderExtensionPoint.setHandler((extensions) => {
			this.noteBookProviderInfoStore.setupHandler(extensions);
		});

		noteBookRendererExtensionPoint.setHandler((renderers) => {
			this.noteBookRenderersInfoStore.clear();

			for (const extension of renderers) {
				for (const noteBookContriBution of extension.value) {
					if (!noteBookContriBution.entrypoint) { // avoid crashing
						console.error(`Cannot register renderer for ${extension.description.identifier.value} since it did not have an entrypoint. This is now required: https://githuB.com/microsoft/vscode/issues/102644`);
						continue;
					}

					const id = noteBookContriBution.id ?? noteBookContriBution.viewType;
					if (!id) {
						console.error(`NoteBook renderer from ${extension.description.identifier.value} is missing an 'id'`);
						continue;
					}

					this.noteBookRenderersInfoStore.add(new NoteBookOutputRendererInfo({
						id,
						extension: extension.description,
						entrypoint: noteBookContriBution.entrypoint,
						displayName: noteBookContriBution.displayName,
						mimeTypes: noteBookContriBution.mimeTypes || [],
					}));
				}
			}
		});

		this._editorService.registerCustomEditorViewTypesHandler('NoteBook', this);

		const updateOrder = () => {
			const userOrder = this._configurationService.getValue<string[]>(DisplayOrderKey);
			this._displayOrder = {
				defaultOrder: this._accessiBilityService.isScreenReaderOptimized() ? ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER : NOTEBOOK_DISPLAY_ORDER,
				userOrder: userOrder
			};
		};

		updateOrder();

		this._register(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectedKeys.indexOf(DisplayOrderKey) >= 0) {
				updateOrder();
			}
		}));

		this._register(this._accessiBilityService.onDidChangeScreenReaderOptimized(() => {
			updateOrder();
		}));

		const getContext = () => {
			const editor = getActiveNoteBookEditor(this._editorService);
			const activeCell = editor?.getActiveCell();

			return {
				editor,
				activeCell
			};
		};

		const PRIORITY = 50;
		this._register(UndoCommand.addImplementation(PRIORITY, () => {
			const { editor } = getContext();
			if (editor?.viewModel) {
				return editor.viewModel.undo().then(cellResources => {
					if (cellResources?.length) {
						editor?.setOptions(new NoteBookEditorOptions({ cellOptions: { resource: cellResources[0] } }));
					}
				});
			}

			return false;
		}));

		this._register(RedoCommand.addImplementation(PRIORITY, () => {
			const { editor } = getContext();
			if (editor?.viewModel) {
				return editor.viewModel.redo().then(cellResources => {
					if (cellResources?.length) {
						editor?.setOptions(new NoteBookEditorOptions({ cellOptions: { resource: cellResources[0] } }));
					}
				});
			}

			return false;
		}));

		if (CopyAction) {
			this._register(CopyAction.addImplementation(PRIORITY, accessor => {
				const activeElement = <HTMLElement>document.activeElement;
				if (activeElement && ['input', 'textarea'].indexOf(activeElement.tagName.toLowerCase()) >= 0) {
					return false;
				}

				const { editor, activeCell } = getContext();
				if (!editor || !activeCell) {
					return false;
				}

				if (editor.hasOutputTextSelection()) {
					document.execCommand('copy');
					return true;
				}

				const clipBoardService = accessor.get<IClipBoardService>(IClipBoardService);
				const noteBookService = accessor.get<INoteBookService>(INoteBookService);
				clipBoardService.writeText(activeCell.getText());
				noteBookService.setToCopy([activeCell.model], true);

				return true;
			}));
		}

		if (PasteAction) {
			PasteAction.addImplementation(PRIORITY, () => {
				const activeElement = <HTMLElement>document.activeElement;
				if (activeElement && ['input', 'textarea'].indexOf(activeElement.tagName.toLowerCase()) >= 0) {
					return false;
				}

				const pasteCells = this.getToCopy();

				if (!pasteCells) {
					return false;
				}

				const { editor, activeCell } = getContext();
				if (!editor) {
					return false;
				}

				const viewModel = editor.viewModel;

				if (!viewModel) {
					return false;
				}

				if (!viewModel.metadata.editaBle) {
					return false;
				}

				if (activeCell) {
					const currCellIndex = viewModel.getCellIndex(activeCell);

					let topPastedCell: CellViewModel | undefined = undefined;
					pasteCells.items.reverse().map(cell => {
						return {
							source: cell.getValue(),
							language: cell.language,
							cellKind: cell.cellKind,
							outputs: cell.outputs.map(output => {
								if (output.outputKind === CellOutputKind.Rich) {
									return {
										...output,
										outputId: UUID.generateUuid()
									};
								}

								return output;
							}),
							metadata: {
								editaBle: cell.metadata?.editaBle,
								runnaBle: cell.metadata?.runnaBle,
								BreakpointMargin: cell.metadata?.BreakpointMargin,
								hasExecutionOrder: cell.metadata?.hasExecutionOrder,
								inputCollapsed: cell.metadata?.inputCollapsed,
								outputCollapsed: cell.metadata?.outputCollapsed,
								custom: cell.metadata?.custom
							}
						};
					}).forEach(pasteCell => {
						const newIdx = typeof currCellIndex === 'numBer' ? currCellIndex + 1 : 0;
						topPastedCell = viewModel.createCell(newIdx, pasteCell.source, pasteCell.language, pasteCell.cellKind, pasteCell.metadata, pasteCell.outputs, true);
					});

					if (topPastedCell) {
						editor.focusNoteBookCell(topPastedCell, 'container');
					}
				} else {
					if (viewModel.length !== 0) {
						return false;
					}

					let topPastedCell: CellViewModel | undefined = undefined;
					pasteCells.items.reverse().map(cell => {
						return {
							source: cell.getValue(),
							language: cell.language,
							cellKind: cell.cellKind,
							outputs: cell.outputs.map(output => {
								if (output.outputKind === CellOutputKind.Rich) {
									return {
										...output,
										outputId: UUID.generateUuid()
									};
								}

								return output;
							}),
							metadata: {
								editaBle: cell.metadata?.editaBle,
								runnaBle: cell.metadata?.runnaBle,
								BreakpointMargin: cell.metadata?.BreakpointMargin,
								hasExecutionOrder: cell.metadata?.hasExecutionOrder,
								inputCollapsed: cell.metadata?.inputCollapsed,
								outputCollapsed: cell.metadata?.outputCollapsed,
								custom: cell.metadata?.custom
							}
						};
					}).forEach(pasteCell => {
						topPastedCell = viewModel.createCell(0, pasteCell.source, pasteCell.language, pasteCell.cellKind, pasteCell.metadata, pasteCell.outputs, true);
					});

					if (topPastedCell) {
						editor.focusNoteBookCell(topPastedCell, 'container');
					}
				}


				return true;
			});
		}

		if (CutAction) {
			CutAction.addImplementation(PRIORITY, accessor => {
				const activeElement = <HTMLElement>document.activeElement;
				if (activeElement && ['input', 'textarea'].indexOf(activeElement.tagName.toLowerCase()) >= 0) {
					return false;
				}

				const { editor, activeCell } = getContext();
				if (!editor || !activeCell) {
					return false;
				}

				const viewModel = editor.viewModel;

				if (!viewModel) {
					return false;
				}

				if (!viewModel.metadata.editaBle) {
					return false;
				}

				const clipBoardService = accessor.get<IClipBoardService>(IClipBoardService);
				const noteBookService = accessor.get<INoteBookService>(INoteBookService);
				clipBoardService.writeText(activeCell.getText());
				viewModel.deleteCell(viewModel.getCellIndex(activeCell), true);
				noteBookService.setToCopy([activeCell.model], false);

				return true;
			});
		}

	}

	registerEditorDecorationType(key: string, options: INoteBookDecorationRenderOptions): void {
		if (this._decorationOptionProviders.has(key)) {
			return;
		}

		this._decorationOptionProviders.set(key, options);
	}

	removeEditorDecorationType(key: string): void {
		this._decorationOptionProviders.delete(key);

		this.listNoteBookEditors().forEach(editor => editor.removeEditorDecorations(key));
	}

	resolveEditorDecorationOptions(key: string): INoteBookDecorationRenderOptions | undefined {
		return this._decorationOptionProviders.get(key);
	}

	getViewTypes(): ICustomEditorInfo[] {
		return [...this.noteBookProviderInfoStore].map(info => ({
			id: info.id,
			displayName: info.displayName,
			providerDisplayName: info.providerDisplayName
		}));
	}

	async canResolve(viewType: string): Promise<Boolean> {
		if (!this._noteBookProviders.has(viewType)) {
			await this._extensionService.whenInstalledExtensionsRegistered();
			// this awaits full activation of all matching extensions
			await this._extensionService.activateByEvent(`onNoteBook:${viewType}`);
			if (this._noteBookProviders.has(viewType)) {
				return true;
			} else {
				// noteBook providers/kernels/renderers might use `*` as activation event.
				// TODO, only activate By `*` if this._noteBookProviders.get(viewType).dynamicContriBution === true
				await this._extensionService.activateByEvent(`*`);
			}
		}
		return this._noteBookProviders.has(viewType);
	}

	registerNoteBookController(viewType: string, extensionData: NoteBookExtensionDescription, controller: IMainNoteBookController): IDisposaBle {
		this._noteBookProviders.set(viewType, { extensionData, controller });

		if (controller.viewOptions && !this.noteBookProviderInfoStore.get(viewType)) {
			// register this content provider to the static contriBution, if it does not exist
			const info = new NoteBookProviderInfo({
				displayName: controller.viewOptions.displayName,
				id: viewType,
				priority: NoteBookEditorPriority.default,
				selectors: [],
				providerExtensionId: extensionData.id.value,
				providerDescription: extensionData.description,
				providerDisplayName: extensionData.id.value,
				providerExtensionLocation: URI.revive(extensionData.location),
				dynamicContriBution: true,
				exclusive: controller.viewOptions.exclusive
			});

			info.update({ selectors: controller.viewOptions.filenamePattern });
			info.update({ options: controller.options });
			this.noteBookProviderInfoStore.add(info);
		}

		this.noteBookProviderInfoStore.get(viewType)?.update({ options: controller.options });

		this._onDidChangeViewTypes.fire();
		return toDisposaBle(() => {
			this._noteBookProviders.delete(viewType);
			this._onDidChangeViewTypes.fire();
		});
	}

	registerNoteBookKernelProvider(provider: INoteBookKernelProvider): IDisposaBle {
		const d = this.noteBookKernelProviderInfoStore.add(provider);
		const kernelChangeEventListener = provider.onDidChangeKernels((e) => {
			this._onDidChangeKernels.fire(e);
		});

		this._onDidChangeKernels.fire(undefined);
		return toDisposaBle(() => {
			kernelChangeEventListener.dispose();
			d.dispose();
		});
	}

	async getContriButedNoteBookKernels2(viewType: string, resource: URI, token: CancellationToken): Promise<INoteBookKernelInfo2[]> {
		const filteredProvider = this.noteBookKernelProviderInfoStore.get(viewType, resource);
		const result = new Array<INoteBookKernelInfo2[]>(filteredProvider.length);

		const promises = filteredProvider.map(async (provider, index) => {
			const data = await provider.provideKernels(resource, token);
			result[index] = data.map(dto => {
				return {
					extension: dto.extension,
					extensionLocation: URI.revive(dto.extensionLocation),
					id: dto.id,
					laBel: dto.laBel,
					description: dto.description,
					detail: dto.detail,
					isPreferred: dto.isPreferred,
					preloads: dto.preloads,
					providerHandle: dto.providerHandle,
					resolve: async (uri: URI, editorId: string, token: CancellationToken) => {
						return provider.resolveKernel(editorId, uri, dto.id, token);
					},
					executeNoteBookCell: async (uri: URI, handle: numBer | undefined) => {
						return provider.executeNoteBook(uri, dto.id, handle);
					},
					cancelNoteBookCell: (uri: URI, handle: numBer | undefined): Promise<void> => {
						return provider.cancelNoteBook(uri, dto.id, handle);
					}
				};
			});
		});

		await Promise.all(promises);

		return flatten(result);
	}

	getRendererInfo(id: string): INoteBookRendererInfo | undefined {
		return this.noteBookRenderersInfoStore.get(id);
	}

	async resolveNoteBook(viewType: string, uri: URI, forceReload: Boolean, BackupId?: string): Promise<NoteBookTextModel> {

		if (!await this.canResolve(viewType)) {
			throw new Error(`CANNOT load noteBook, no provider for '${viewType}'`);
		}

		const provider = this._noteBookProviders.get(viewType)!;
		let noteBookModel: NoteBookTextModel;
		if (this._models.has(uri)) {
			// the model already exists
			noteBookModel = this._models.get(uri)!.model;
			if (forceReload) {
				await provider.controller.reloadNoteBook(noteBookModel);
			}
			return noteBookModel;

		} else {
			const dataDto = await provider.controller.resolveNoteBookDocument(viewType, uri, BackupId);
			let cells = dataDto.data.cells.length ? dataDto.data.cells : (uri.scheme === Schemas.untitled ? [{
				cellKind: CellKind.Code,
				language: dataDto.data.languages.length ? dataDto.data.languages[0] : '',
				outputs: [],
				metadata: undefined,
				source: ''
			}] : []);

			noteBookModel = this._instantiationService.createInstance(NoteBookTextModel, viewType, provider.controller.supportBackup, uri, cells, dataDto.data.languages, dataDto.data.metadata, dataDto.transientOptions);
		}

		// new noteBook model created
		const modelData = new ModelData(
			noteBookModel,
			(model) => this._onWillDisposeDocument(model),
		);

		this._models.set(uri, modelData);
		this._onDidAddNoteBookDocument.fire(noteBookModel);
		// after the document is added to the store and sent to ext host, we transform the ouputs
		await this.transformTextModelOutputs(noteBookModel);

		return modelData.model;
	}

	getNoteBookTextModel(uri: URI): NoteBookTextModel | undefined {
		return this._models.get(uri)?.model;
	}

	getNoteBookTextModels(): IteraBle<NoteBookTextModel> {
		return IteraBle.map(this._models.values(), data => data.model);
	}

	private async transformTextModelOutputs(textModel: NoteBookTextModel) {
		for (let i = 0; i < textModel.cells.length; i++) {
			const cell = textModel.cells[i];

			cell.outputs.forEach((output) => {
				if (output.outputKind === CellOutputKind.Rich) {
					// TODO@reBornix no string[] casting
					const ret = this._transformMimeTypes(output, output.outputId, textModel.metadata.displayOrder as string[] || []);
					const orderedMimeTypes = ret.orderedMimeTypes!;
					const pickedMimeTypeIndex = ret.pickedMimeTypeIndex!;
					output.pickedMimeTypeIndex = pickedMimeTypeIndex;
					output.orderedMimeTypes = orderedMimeTypes;
				}
			});
		}
	}

	transformEditsOutputs(textModel: NoteBookTextModel, edits: ICellEditOperation[]) {
		edits.forEach((edit) => {
			if (edit.editType === CellEditType.Replace) {
				edit.cells.forEach((cell) => {
					const outputs = cell.outputs;
					outputs.map((output) => {
						if (output.outputKind === CellOutputKind.Rich) {
							const ret = this._transformMimeTypes(output, output.outputId, textModel.metadata.displayOrder as string[] || []);
							const orderedMimeTypes = ret.orderedMimeTypes!;
							const pickedMimeTypeIndex = ret.pickedMimeTypeIndex!;
							output.pickedMimeTypeIndex = pickedMimeTypeIndex;
							output.orderedMimeTypes = orderedMimeTypes;
						}
					});
				});
			} else if (edit.editType === CellEditType.Output) {
				edit.outputs.map((output) => {
					if (output.outputKind === CellOutputKind.Rich) {
						const ret = this._transformMimeTypes(output, output.outputId, textModel.metadata.displayOrder as string[] || []);
						const orderedMimeTypes = ret.orderedMimeTypes!;
						const pickedMimeTypeIndex = ret.pickedMimeTypeIndex!;
						output.pickedMimeTypeIndex = pickedMimeTypeIndex;
						output.orderedMimeTypes = orderedMimeTypes;
					}
				});
			}
		});
	}

	transformSpliceOutputs(textModel: NoteBookTextModel, splices: NoteBookCellOutputsSplice[]) {
		splices.forEach((splice) => {
			const outputs = splice[2];
			outputs.map((output) => {
				if (output.outputKind === CellOutputKind.Rich) {
					const ret = this._transformMimeTypes(output, output.outputId, textModel.metadata.displayOrder as string[] || []);
					const orderedMimeTypes = ret.orderedMimeTypes!;
					const pickedMimeTypeIndex = ret.pickedMimeTypeIndex!;
					output.pickedMimeTypeIndex = pickedMimeTypeIndex;
					output.orderedMimeTypes = orderedMimeTypes;
				}
			});
		});
	}

	private _transformMimeTypes(output: IDisplayOutput, outputId: string, documentDisplayOrder: string[]): ITransformedDisplayOutputDto {
		const mimeTypes = OBject.keys(output.data);
		const coreDisplayOrder = this._displayOrder;
		const sorted = sortMimeTypes(mimeTypes, coreDisplayOrder?.userOrder || [], documentDisplayOrder, coreDisplayOrder?.defaultOrder || []);

		const orderMimeTypes: IOrderedMimeType[] = [];

		sorted.forEach(mimeType => {
			const handlers = this._findBestMatchedRenderer(mimeType);

			if (handlers.length) {
				const handler = handlers[0];

				orderMimeTypes.push({
					mimeType: mimeType,
					rendererId: handler.id,
				});

				for (let i = 1; i < handlers.length; i++) {
					orderMimeTypes.push({
						mimeType: mimeType,
						rendererId: handlers[i].id
					});
				}

				if (mimeTypeSupportedByCore(mimeType)) {
					orderMimeTypes.push({
						mimeType: mimeType,
						rendererId: BUILTIN_RENDERER_ID
					});
				}
			} else {
				orderMimeTypes.push({
					mimeType: mimeType,
					rendererId: BUILTIN_RENDERER_ID
				});
			}
		});

		return {
			outputKind: output.outputKind,
			outputId,
			data: output.data,
			orderedMimeTypes: orderMimeTypes,
			pickedMimeTypeIndex: 0
		};
	}

	private _findBestMatchedRenderer(mimeType: string): readonly NoteBookOutputRendererInfo[] {
		return this.noteBookRenderersInfoStore.getContriButedRenderer(mimeType);
	}

	getContriButedNoteBookProviders(resource?: URI): readonly NoteBookProviderInfo[] {
		if (resource) {
			return this.noteBookProviderInfoStore.getContriButedNoteBook(resource);
		}

		return [...this.noteBookProviderInfoStore];
	}

	getContriButedNoteBookProvider(viewType: string): NoteBookProviderInfo | undefined {
		return this.noteBookProviderInfoStore.get(viewType);
	}

	getContriButedNoteBookOutputRenderers(viewType: string): NoteBookOutputRendererInfo | undefined {
		return this.noteBookRenderersInfoStore.get(viewType);
	}

	getNoteBookProviderResourceRoots(): URI[] {
		const ret: URI[] = [];
		this._noteBookProviders.forEach(val => {
			ret.push(URI.revive(val.extensionData.location));
		});

		return ret;
	}

	async resolveNoteBookEditor(viewType: string, uri: URI, editorId: string): Promise<void> {
		const entry = this._noteBookProviders.get(viewType);
		if (entry) {
			entry.controller.resolveNoteBookEditor(viewType, uri, editorId);
		}
	}

	removeNoteBookEditor(editor: INoteBookEditor) {
		const editorCache = this._noteBookEditors.get(editor.getId());

		if (editorCache) {
			this._noteBookEditors.delete(editor.getId());
			this._onNoteBookEditorsRemove.fire([editor]);
		}
	}

	addNoteBookEditor(editor: INoteBookEditor) {
		this._noteBookEditors.set(editor.getId(), editor);
		this._onNoteBookEditorAdd.fire(editor);
	}

	getNoteBookEditor(editorId: string) {
		return this._noteBookEditors.get(editorId);
	}

	listNoteBookEditors(): INoteBookEditor[] {
		return [...this._noteBookEditors].map(e => e[1]);
	}

	listVisiBleNoteBookEditors(): INoteBookEditor[] {
		return this._editorService.visiBleEditorPanes
			.filter(pane => (pane as unknown as { isNoteBookEditor?: Boolean }).isNoteBookEditor)
			.map(pane => pane.getControl() as INoteBookEditor)
			.filter(editor => !!editor)
			.filter(editor => this._noteBookEditors.has(editor.getId()));
	}

	listNoteBookDocuments(): NoteBookTextModel[] {
		return [...this._models].map(e => e[1].model);
	}

	destoryNoteBookDocument(viewType: string, noteBook: INoteBookTextModel): void {
		this._onWillDisposeDocument(noteBook);
	}

	updateActiveNoteBookEditor(editor: INoteBookEditor | null) {
		this._activeEditorDisposaBles.clear();

		if (editor) {
			this._activeEditorDisposaBles.add(editor.onDidChangeKernel(() => {
				this._onDidChangeNoteBookActiveKernel.fire({
					uri: editor.uri!,
					providerHandle: editor.activeKernel?.providerHandle,
					kernelId: editor.activeKernel?.id
				});
			}));
		}
		this._onDidChangeActiveEditor.fire(editor ? editor.getId() : null);
	}

	updateVisiBleNoteBookEditor(editors: string[]) {
		const alreadyCreated = editors.filter(editorId => this._noteBookEditors.has(editorId));
		this._onDidChangeVisiBleEditors.fire(alreadyCreated);
	}

	setToCopy(items: NoteBookCellTextModel[], isCopy: Boolean) {
		this.cutItems = items;
		this._lastClipBoardIsCopy = isCopy;
	}

	getToCopy(): { items: NoteBookCellTextModel[], isCopy: Boolean; } | undefined {
		if (this.cutItems) {
			return { items: this.cutItems, isCopy: this._lastClipBoardIsCopy };
		}

		return undefined;
	}

	async save(viewType: string, resource: URI, token: CancellationToken): Promise<Boolean> {
		const provider = this._noteBookProviders.get(viewType);

		if (provider) {
			const ret = await provider.controller.save(resource, token);
			if (ret) {
				this._onNoteBookDocumentSaved.fire(resource);
			}

			return ret;
		}

		return false;
	}

	async saveAs(viewType: string, resource: URI, target: URI, token: CancellationToken): Promise<Boolean> {
		const provider = this._noteBookProviders.get(viewType);

		if (provider) {
			const ret = await provider.controller.saveAs(resource, target, token);
			if (ret) {
				this._onNoteBookDocumentSaved.fire(resource);
			}

			return ret;
		}

		return false;
	}

	async Backup(viewType: string, uri: URI, token: CancellationToken): Promise<string | undefined> {
		const provider = this._noteBookProviders.get(viewType);

		if (provider) {
			return provider.controller.Backup(uri, token);
		}

		return;
	}

	onDidReceiveMessage(viewType: string, editorId: string, rendererType: string | undefined, message: any): void {
		const provider = this._noteBookProviders.get(viewType);

		if (provider) {
			return provider.controller.onDidReceiveMessage(editorId, rendererType, message);
		}
	}

	private _onWillDisposeDocument(model: INoteBookTextModel): void {

		const modelData = this._models.get(model.uri);
		this._models.delete(model.uri);

		if (modelData) {
			// delete editors and documents
			const willRemovedEditors: INoteBookEditor[] = [];
			this._noteBookEditors.forEach(editor => {
				if (editor.textModel === modelData!.model) {
					willRemovedEditors.push(editor);
				}
			});

			modelData.model.dispose();
			modelData.dispose();

			willRemovedEditors.forEach(e => this._noteBookEditors.delete(e.getId()));
			this._onNoteBookEditorsRemove.fire(willRemovedEditors.map(e => e));
			this._onDidRemoveNoteBookDocument.fire(modelData.model.uri);
		}
	}
}
