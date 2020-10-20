/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { flAtten } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { DisposAble, DisposAbleStore, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { SchemAs } from 'vs/bAse/common/network';
import { URI } from 'vs/bAse/common/uri';
import * As UUID from 'vs/bAse/common/uuid';
import { RedoCommAnd, UndoCommAnd } from 'vs/editor/browser/editorExtensions';
import { CopyAction, CutAction, PAsteAction } from 'vs/editor/contrib/clipboArd/clipboArd';
import * As nls from 'vs/nls';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { NotebookExtensionDescription } from 'vs/workbench/Api/common/extHost.protocol';
import { Memento } from 'vs/workbench/common/memento';
import { INotebookEditorContribution, notebookProviderExtensionPoint, notebookRendererExtensionPoint } from 'vs/workbench/contrib/notebook/browser/extensionPoint';
import { getActiveNotebookEditor, INotebookEditor, NotebookEditorOptions } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { NotebookKernelProviderAssociAtionRegistry, NotebookViewTypesExtensionRegistry, updAteNotebookKernelProvideAssociAtionSchemA } from 'vs/workbench/contrib/notebook/browser/notebookKernelAssociAtion';
import { CellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/notebookViewModel';
import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { NotebookTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookTextModel';
import { ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER, BUILTIN_RENDERER_ID, CellEditType, CellKind, CellOutputKind, DisplAyOrderKey, ICellEditOperAtion, IDisplAyOutput, INotebookDecorAtionRenderOptions, INotebookKernelInfo2, INotebookKernelProvider, INotebookRendererInfo, INotebookTextModel, IOrderedMimeType, ITrAnsformedDisplAyOutputDto, mimeTypeSupportedByCore, NotebookCellOutputsSplice, notebookDocumentFilterMAtch, NotebookEditorPriority, NOTEBOOK_DISPLAY_ORDER, sortMimeTypes } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { NotebookOutputRendererInfo } from 'vs/workbench/contrib/notebook/common/notebookOutputRenderer';
import { NotebookEditorDescriptor, NotebookProviderInfo } from 'vs/workbench/contrib/notebook/common/notebookProvider';
import { IMAinNotebookController, INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { ICustomEditorInfo, ICustomEditorViewTypesHAndler, IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IExtensionPointUser } from 'vs/workbench/services/extensions/common/extensionsRegistry';

export clAss NotebookKernelProviderInfoStore extends DisposAble {
	privAte reAdonly _notebookKernelProviders: INotebookKernelProvider[] = [];

	constructor() {
		super();
	}

	Add(provider: INotebookKernelProvider) {
		this._notebookKernelProviders.push(provider);
		this._updAteProviderExtensionsInfo();

		return toDisposAble(() => {
			const idx = this._notebookKernelProviders.indexOf(provider);
			if (idx >= 0) {
				this._notebookKernelProviders.splice(idx, 1);
			}

			this._updAteProviderExtensionsInfo();
		});
	}

	get(viewType: string, resource: URI) {
		return this._notebookKernelProviders.filter(provider => notebookDocumentFilterMAtch(provider.selector, viewType, resource));
	}

	privAte _updAteProviderExtensionsInfo() {
		NotebookKernelProviderAssociAtionRegistry.extensionIds.length = 0;
		NotebookKernelProviderAssociAtionRegistry.extensionDescriptions.length = 0;

		this._notebookKernelProviders.forEAch(provider => {
			NotebookKernelProviderAssociAtionRegistry.extensionIds.push(provider.providerExtensionId);
			NotebookKernelProviderAssociAtionRegistry.extensionDescriptions.push(provider.providerDescription || '');
		});

		updAteNotebookKernelProvideAssociAtionSchemA();
	}
}

export clAss NotebookProviderInfoStore extends DisposAble {
	privAte stAtic reAdonly CUSTOM_EDITORS_STORAGE_ID = 'notebookEditors';
	privAte stAtic reAdonly CUSTOM_EDITORS_ENTRY_ID = 'editors';

	privAte reAdonly _memento: Memento;
	privAte _hAndled: booleAn = fAlse;
	constructor(
		storAgeService: IStorAgeService,
		extensionService: IExtensionService

	) {
		super();
		this._memento = new Memento(NotebookProviderInfoStore.CUSTOM_EDITORS_STORAGE_ID, storAgeService);

		const mementoObject = this._memento.getMemento(StorAgeScope.GLOBAL);
		for (const info of (mementoObject[NotebookProviderInfoStore.CUSTOM_EDITORS_ENTRY_ID] || []) As NotebookEditorDescriptor[]) {
			this.Add(new NotebookProviderInfo(info));
		}

		this._updAteProviderExtensionsInfo();

		this._register(extensionService.onDidRegisterExtensions(() => {
			if (!this._hAndled) {
				// there is no extension point registered for notebook content provider
				// cleAr the memento And cAche
				this.cleAr();
				mementoObject[NotebookProviderInfoStore.CUSTOM_EDITORS_ENTRY_ID] = [];
				this._memento.sAveMemento();

				this._updAteProviderExtensionsInfo();
			}
		}));
	}

	setupHAndler(extensions: reAdonly IExtensionPointUser<INotebookEditorContribution[]>[]) {
		this._hAndled = true;
		this.cleAr();

		for (const extension of extensions) {
			for (const notebookContribution of extension.vAlue) {
				this.Add(new NotebookProviderInfo({
					id: notebookContribution.viewType,
					displAyNAme: notebookContribution.displAyNAme,
					selectors: notebookContribution.selector || [],
					priority: this._convertPriority(notebookContribution.priority),
					providerExtensionId: extension.description.identifier.vAlue,
					providerDescription: extension.description.description,
					providerDisplAyNAme: extension.description.isBuiltin ? nls.locAlize('builtinProviderDisplAyNAme', "Built-in") : extension.description.displAyNAme || extension.description.identifier.vAlue,
					providerExtensionLocAtion: extension.description.extensionLocAtion,
					dynAmicContribution: fAlse,
					exclusive: fAlse
				}));
			}
		}

		const mementoObject = this._memento.getMemento(StorAgeScope.GLOBAL);
		mementoObject[NotebookProviderInfoStore.CUSTOM_EDITORS_ENTRY_ID] = ArrAy.from(this._contributedEditors.vAlues());
		this._memento.sAveMemento();

		this._updAteProviderExtensionsInfo();
	}

	privAte _updAteProviderExtensionsInfo() {
		NotebookViewTypesExtensionRegistry.viewTypes.length = 0;
		NotebookViewTypesExtensionRegistry.viewTypeDescriptions.length = 0;

		for (const contribute of this._contributedEditors) {
			if (contribute[1].providerExtensionId) {
				NotebookViewTypesExtensionRegistry.viewTypes.push(contribute[1].id);
				NotebookViewTypesExtensionRegistry.viewTypeDescriptions.push(`${contribute[1].displAyNAme}`);
			}
		}

		updAteNotebookKernelProvideAssociAtionSchemA();
	}

	privAte _convertPriority(priority?: string) {
		if (!priority) {
			return NotebookEditorPriority.defAult;
		}

		if (priority === NotebookEditorPriority.defAult) {
			return NotebookEditorPriority.defAult;
		}

		return NotebookEditorPriority.option;

	}

	privAte reAdonly _contributedEditors = new MAp<string, NotebookProviderInfo>();

	cleAr() {
		this._contributedEditors.cleAr();
	}

	get(viewType: string): NotebookProviderInfo | undefined {
		return this._contributedEditors.get(viewType);
	}

	Add(info: NotebookProviderInfo): void {
		if (this._contributedEditors.hAs(info.id)) {
			return;
		}
		this._contributedEditors.set(info.id, info);

		const mementoObject = this._memento.getMemento(StorAgeScope.GLOBAL);
		mementoObject[NotebookProviderInfoStore.CUSTOM_EDITORS_ENTRY_ID] = ArrAy.from(this._contributedEditors.vAlues());
		this._memento.sAveMemento();
	}

	getContributedNotebook(resource: URI): reAdonly NotebookProviderInfo[] {
		return [...IterAble.filter(this._contributedEditors.vAlues(), customEditor => resource.scheme === 'untitled' || customEditor.mAtches(resource))];
	}

	public [Symbol.iterAtor](): IterAtor<NotebookProviderInfo> {
		return this._contributedEditors.vAlues();
	}
}

export clAss NotebookOutputRendererInfoStore {
	privAte reAdonly contributedRenderers = new MAp<string, NotebookOutputRendererInfo>();

	cleAr() {
		this.contributedRenderers.cleAr();
	}

	get(viewType: string): NotebookOutputRendererInfo | undefined {
		return this.contributedRenderers.get(viewType);
	}

	Add(info: NotebookOutputRendererInfo): void {
		if (this.contributedRenderers.hAs(info.id)) {
			return;
		}
		this.contributedRenderers.set(info.id, info);
	}

	getContributedRenderer(mimeType: string): reAdonly NotebookOutputRendererInfo[] {
		return ArrAy.from(this.contributedRenderers.vAlues()).filter(customEditor =>
			customEditor.mAtches(mimeType));
	}
}

clAss ModelDAtA implements IDisposAble {
	privAte reAdonly _modelEventListeners = new DisposAbleStore();

	constructor(
		public model: NotebookTextModel,
		onWillDispose: (model: INotebookTextModel) => void
	) {
		this._modelEventListeners.Add(model.onWillDispose(() => onWillDispose(model)));
	}

	dispose(): void {
		this._modelEventListeners.dispose();
	}
}
export clAss NotebookService extends DisposAble implements INotebookService, ICustomEditorViewTypesHAndler {
	declAre reAdonly _serviceBrAnd: undefined;
	privAte reAdonly _notebookProviders = new MAp<string, { controller: IMAinNotebookController, extensionDAtA: NotebookExtensionDescription }>();
	notebookProviderInfoStore: NotebookProviderInfoStore;
	notebookRenderersInfoStore: NotebookOutputRendererInfoStore = new NotebookOutputRendererInfoStore();
	notebookKernelProviderInfoStore: NotebookKernelProviderInfoStore = new NotebookKernelProviderInfoStore();
	privAte reAdonly _models = new ResourceMAp<ModelDAtA>();
	privAte _onDidChAngeActiveEditor = new Emitter<string | null>();
	onDidChAngeActiveEditor: Event<string | null> = this._onDidChAngeActiveEditor.event;
	privAte _ActiveEditorDisposAbles = new DisposAbleStore();
	privAte _onDidChAngeVisibleEditors = new Emitter<string[]>();
	onDidChAngeVisibleEditors: Event<string[]> = this._onDidChAngeVisibleEditors.event;
	privAte reAdonly _onNotebookEditorAdd: Emitter<INotebookEditor> = this._register(new Emitter<INotebookEditor>());
	public reAdonly onNotebookEditorAdd: Event<INotebookEditor> = this._onNotebookEditorAdd.event;
	privAte reAdonly _onNotebookEditorsRemove: Emitter<INotebookEditor[]> = this._register(new Emitter<INotebookEditor[]>());
	public reAdonly onNotebookEditorsRemove: Event<INotebookEditor[]> = this._onNotebookEditorsRemove.event;

	privAte reAdonly _onDidAddNotebookDocument = this._register(new Emitter<NotebookTextModel>());
	privAte reAdonly _onDidRemoveNotebookDocument = this._register(new Emitter<URI>());
	reAdonly onDidAddNotebookDocument = this._onDidAddNotebookDocument.event;
	reAdonly onDidRemoveNotebookDocument = this._onDidRemoveNotebookDocument.event;

	privAte reAdonly _onNotebookDocumentSAved: Emitter<URI> = this._register(new Emitter<URI>());
	public reAdonly onNotebookDocumentSAved: Event<URI> = this._onNotebookDocumentSAved.event;
	privAte reAdonly _notebookEditors = new MAp<string, INotebookEditor>();

	privAte reAdonly _onDidChAngeViewTypes = new Emitter<void>();
	onDidChAngeViewTypes: Event<void> = this._onDidChAngeViewTypes.event;

	privAte reAdonly _onDidChAngeKernels = new Emitter<URI | undefined>();
	onDidChAngeKernels: Event<URI | undefined> = this._onDidChAngeKernels.event;
	privAte reAdonly _onDidChAngeNotebookActiveKernel = new Emitter<{ uri: URI, providerHAndle: number | undefined, kernelId: string | undefined }>();
	onDidChAngeNotebookActiveKernel: Event<{ uri: URI, providerHAndle: number | undefined, kernelId: string | undefined }> = this._onDidChAngeNotebookActiveKernel.event;
	privAte cutItems: NotebookCellTextModel[] | undefined;
	privAte _lAstClipboArdIsCopy: booleAn = true;

	privAte _displAyOrder: { userOrder: string[], defAultOrder: string[] } = Object.creAte(null);
	privAte reAdonly _decorAtionOptionProviders = new MAp<string, INotebookDecorAtionRenderOptions>();

	constructor(
		@IExtensionService privAte reAdonly _extensionService: IExtensionService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@IAccessibilityService privAte reAdonly _AccessibilityService: IAccessibilityService,
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService
	) {
		super();

		this.notebookProviderInfoStore = new NotebookProviderInfoStore(this._storAgeService, this._extensionService);
		this._register(this.notebookProviderInfoStore);

		notebookProviderExtensionPoint.setHAndler((extensions) => {
			this.notebookProviderInfoStore.setupHAndler(extensions);
		});

		notebookRendererExtensionPoint.setHAndler((renderers) => {
			this.notebookRenderersInfoStore.cleAr();

			for (const extension of renderers) {
				for (const notebookContribution of extension.vAlue) {
					if (!notebookContribution.entrypoint) { // Avoid crAshing
						console.error(`CAnnot register renderer for ${extension.description.identifier.vAlue} since it did not hAve An entrypoint. This is now required: https://github.com/microsoft/vscode/issues/102644`);
						continue;
					}

					const id = notebookContribution.id ?? notebookContribution.viewType;
					if (!id) {
						console.error(`Notebook renderer from ${extension.description.identifier.vAlue} is missing An 'id'`);
						continue;
					}

					this.notebookRenderersInfoStore.Add(new NotebookOutputRendererInfo({
						id,
						extension: extension.description,
						entrypoint: notebookContribution.entrypoint,
						displAyNAme: notebookContribution.displAyNAme,
						mimeTypes: notebookContribution.mimeTypes || [],
					}));
				}
			}
		});

		this._editorService.registerCustomEditorViewTypesHAndler('Notebook', this);

		const updAteOrder = () => {
			const userOrder = this._configurAtionService.getVAlue<string[]>(DisplAyOrderKey);
			this._displAyOrder = {
				defAultOrder: this._AccessibilityService.isScreenReAderOptimized() ? ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER : NOTEBOOK_DISPLAY_ORDER,
				userOrder: userOrder
			};
		};

		updAteOrder();

		this._register(this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectedKeys.indexOf(DisplAyOrderKey) >= 0) {
				updAteOrder();
			}
		}));

		this._register(this._AccessibilityService.onDidChAngeScreenReAderOptimized(() => {
			updAteOrder();
		}));

		const getContext = () => {
			const editor = getActiveNotebookEditor(this._editorService);
			const ActiveCell = editor?.getActiveCell();

			return {
				editor,
				ActiveCell
			};
		};

		const PRIORITY = 50;
		this._register(UndoCommAnd.AddImplementAtion(PRIORITY, () => {
			const { editor } = getContext();
			if (editor?.viewModel) {
				return editor.viewModel.undo().then(cellResources => {
					if (cellResources?.length) {
						editor?.setOptions(new NotebookEditorOptions({ cellOptions: { resource: cellResources[0] } }));
					}
				});
			}

			return fAlse;
		}));

		this._register(RedoCommAnd.AddImplementAtion(PRIORITY, () => {
			const { editor } = getContext();
			if (editor?.viewModel) {
				return editor.viewModel.redo().then(cellResources => {
					if (cellResources?.length) {
						editor?.setOptions(new NotebookEditorOptions({ cellOptions: { resource: cellResources[0] } }));
					}
				});
			}

			return fAlse;
		}));

		if (CopyAction) {
			this._register(CopyAction.AddImplementAtion(PRIORITY, Accessor => {
				const ActiveElement = <HTMLElement>document.ActiveElement;
				if (ActiveElement && ['input', 'textAreA'].indexOf(ActiveElement.tAgNAme.toLowerCAse()) >= 0) {
					return fAlse;
				}

				const { editor, ActiveCell } = getContext();
				if (!editor || !ActiveCell) {
					return fAlse;
				}

				if (editor.hAsOutputTextSelection()) {
					document.execCommAnd('copy');
					return true;
				}

				const clipboArdService = Accessor.get<IClipboArdService>(IClipboArdService);
				const notebookService = Accessor.get<INotebookService>(INotebookService);
				clipboArdService.writeText(ActiveCell.getText());
				notebookService.setToCopy([ActiveCell.model], true);

				return true;
			}));
		}

		if (PAsteAction) {
			PAsteAction.AddImplementAtion(PRIORITY, () => {
				const ActiveElement = <HTMLElement>document.ActiveElement;
				if (ActiveElement && ['input', 'textAreA'].indexOf(ActiveElement.tAgNAme.toLowerCAse()) >= 0) {
					return fAlse;
				}

				const pAsteCells = this.getToCopy();

				if (!pAsteCells) {
					return fAlse;
				}

				const { editor, ActiveCell } = getContext();
				if (!editor) {
					return fAlse;
				}

				const viewModel = editor.viewModel;

				if (!viewModel) {
					return fAlse;
				}

				if (!viewModel.metAdAtA.editAble) {
					return fAlse;
				}

				if (ActiveCell) {
					const currCellIndex = viewModel.getCellIndex(ActiveCell);

					let topPAstedCell: CellViewModel | undefined = undefined;
					pAsteCells.items.reverse().mAp(cell => {
						return {
							source: cell.getVAlue(),
							lAnguAge: cell.lAnguAge,
							cellKind: cell.cellKind,
							outputs: cell.outputs.mAp(output => {
								if (output.outputKind === CellOutputKind.Rich) {
									return {
										...output,
										outputId: UUID.generAteUuid()
									};
								}

								return output;
							}),
							metAdAtA: {
								editAble: cell.metAdAtA?.editAble,
								runnAble: cell.metAdAtA?.runnAble,
								breAkpointMArgin: cell.metAdAtA?.breAkpointMArgin,
								hAsExecutionOrder: cell.metAdAtA?.hAsExecutionOrder,
								inputCollApsed: cell.metAdAtA?.inputCollApsed,
								outputCollApsed: cell.metAdAtA?.outputCollApsed,
								custom: cell.metAdAtA?.custom
							}
						};
					}).forEAch(pAsteCell => {
						const newIdx = typeof currCellIndex === 'number' ? currCellIndex + 1 : 0;
						topPAstedCell = viewModel.creAteCell(newIdx, pAsteCell.source, pAsteCell.lAnguAge, pAsteCell.cellKind, pAsteCell.metAdAtA, pAsteCell.outputs, true);
					});

					if (topPAstedCell) {
						editor.focusNotebookCell(topPAstedCell, 'contAiner');
					}
				} else {
					if (viewModel.length !== 0) {
						return fAlse;
					}

					let topPAstedCell: CellViewModel | undefined = undefined;
					pAsteCells.items.reverse().mAp(cell => {
						return {
							source: cell.getVAlue(),
							lAnguAge: cell.lAnguAge,
							cellKind: cell.cellKind,
							outputs: cell.outputs.mAp(output => {
								if (output.outputKind === CellOutputKind.Rich) {
									return {
										...output,
										outputId: UUID.generAteUuid()
									};
								}

								return output;
							}),
							metAdAtA: {
								editAble: cell.metAdAtA?.editAble,
								runnAble: cell.metAdAtA?.runnAble,
								breAkpointMArgin: cell.metAdAtA?.breAkpointMArgin,
								hAsExecutionOrder: cell.metAdAtA?.hAsExecutionOrder,
								inputCollApsed: cell.metAdAtA?.inputCollApsed,
								outputCollApsed: cell.metAdAtA?.outputCollApsed,
								custom: cell.metAdAtA?.custom
							}
						};
					}).forEAch(pAsteCell => {
						topPAstedCell = viewModel.creAteCell(0, pAsteCell.source, pAsteCell.lAnguAge, pAsteCell.cellKind, pAsteCell.metAdAtA, pAsteCell.outputs, true);
					});

					if (topPAstedCell) {
						editor.focusNotebookCell(topPAstedCell, 'contAiner');
					}
				}


				return true;
			});
		}

		if (CutAction) {
			CutAction.AddImplementAtion(PRIORITY, Accessor => {
				const ActiveElement = <HTMLElement>document.ActiveElement;
				if (ActiveElement && ['input', 'textAreA'].indexOf(ActiveElement.tAgNAme.toLowerCAse()) >= 0) {
					return fAlse;
				}

				const { editor, ActiveCell } = getContext();
				if (!editor || !ActiveCell) {
					return fAlse;
				}

				const viewModel = editor.viewModel;

				if (!viewModel) {
					return fAlse;
				}

				if (!viewModel.metAdAtA.editAble) {
					return fAlse;
				}

				const clipboArdService = Accessor.get<IClipboArdService>(IClipboArdService);
				const notebookService = Accessor.get<INotebookService>(INotebookService);
				clipboArdService.writeText(ActiveCell.getText());
				viewModel.deleteCell(viewModel.getCellIndex(ActiveCell), true);
				notebookService.setToCopy([ActiveCell.model], fAlse);

				return true;
			});
		}

	}

	registerEditorDecorAtionType(key: string, options: INotebookDecorAtionRenderOptions): void {
		if (this._decorAtionOptionProviders.hAs(key)) {
			return;
		}

		this._decorAtionOptionProviders.set(key, options);
	}

	removeEditorDecorAtionType(key: string): void {
		this._decorAtionOptionProviders.delete(key);

		this.listNotebookEditors().forEAch(editor => editor.removeEditorDecorAtions(key));
	}

	resolveEditorDecorAtionOptions(key: string): INotebookDecorAtionRenderOptions | undefined {
		return this._decorAtionOptionProviders.get(key);
	}

	getViewTypes(): ICustomEditorInfo[] {
		return [...this.notebookProviderInfoStore].mAp(info => ({
			id: info.id,
			displAyNAme: info.displAyNAme,
			providerDisplAyNAme: info.providerDisplAyNAme
		}));
	}

	Async cAnResolve(viewType: string): Promise<booleAn> {
		if (!this._notebookProviders.hAs(viewType)) {
			AwAit this._extensionService.whenInstAlledExtensionsRegistered();
			// this AwAits full ActivAtion of All mAtching extensions
			AwAit this._extensionService.ActivAteByEvent(`onNotebook:${viewType}`);
			if (this._notebookProviders.hAs(viewType)) {
				return true;
			} else {
				// notebook providers/kernels/renderers might use `*` As ActivAtion event.
				// TODO, only ActivAte by `*` if this._notebookProviders.get(viewType).dynAmicContribution === true
				AwAit this._extensionService.ActivAteByEvent(`*`);
			}
		}
		return this._notebookProviders.hAs(viewType);
	}

	registerNotebookController(viewType: string, extensionDAtA: NotebookExtensionDescription, controller: IMAinNotebookController): IDisposAble {
		this._notebookProviders.set(viewType, { extensionDAtA, controller });

		if (controller.viewOptions && !this.notebookProviderInfoStore.get(viewType)) {
			// register this content provider to the stAtic contribution, if it does not exist
			const info = new NotebookProviderInfo({
				displAyNAme: controller.viewOptions.displAyNAme,
				id: viewType,
				priority: NotebookEditorPriority.defAult,
				selectors: [],
				providerExtensionId: extensionDAtA.id.vAlue,
				providerDescription: extensionDAtA.description,
				providerDisplAyNAme: extensionDAtA.id.vAlue,
				providerExtensionLocAtion: URI.revive(extensionDAtA.locAtion),
				dynAmicContribution: true,
				exclusive: controller.viewOptions.exclusive
			});

			info.updAte({ selectors: controller.viewOptions.filenAmePAttern });
			info.updAte({ options: controller.options });
			this.notebookProviderInfoStore.Add(info);
		}

		this.notebookProviderInfoStore.get(viewType)?.updAte({ options: controller.options });

		this._onDidChAngeViewTypes.fire();
		return toDisposAble(() => {
			this._notebookProviders.delete(viewType);
			this._onDidChAngeViewTypes.fire();
		});
	}

	registerNotebookKernelProvider(provider: INotebookKernelProvider): IDisposAble {
		const d = this.notebookKernelProviderInfoStore.Add(provider);
		const kernelChAngeEventListener = provider.onDidChAngeKernels((e) => {
			this._onDidChAngeKernels.fire(e);
		});

		this._onDidChAngeKernels.fire(undefined);
		return toDisposAble(() => {
			kernelChAngeEventListener.dispose();
			d.dispose();
		});
	}

	Async getContributedNotebookKernels2(viewType: string, resource: URI, token: CAncellAtionToken): Promise<INotebookKernelInfo2[]> {
		const filteredProvider = this.notebookKernelProviderInfoStore.get(viewType, resource);
		const result = new ArrAy<INotebookKernelInfo2[]>(filteredProvider.length);

		const promises = filteredProvider.mAp(Async (provider, index) => {
			const dAtA = AwAit provider.provideKernels(resource, token);
			result[index] = dAtA.mAp(dto => {
				return {
					extension: dto.extension,
					extensionLocAtion: URI.revive(dto.extensionLocAtion),
					id: dto.id,
					lAbel: dto.lAbel,
					description: dto.description,
					detAil: dto.detAil,
					isPreferred: dto.isPreferred,
					preloAds: dto.preloAds,
					providerHAndle: dto.providerHAndle,
					resolve: Async (uri: URI, editorId: string, token: CAncellAtionToken) => {
						return provider.resolveKernel(editorId, uri, dto.id, token);
					},
					executeNotebookCell: Async (uri: URI, hAndle: number | undefined) => {
						return provider.executeNotebook(uri, dto.id, hAndle);
					},
					cAncelNotebookCell: (uri: URI, hAndle: number | undefined): Promise<void> => {
						return provider.cAncelNotebook(uri, dto.id, hAndle);
					}
				};
			});
		});

		AwAit Promise.All(promises);

		return flAtten(result);
	}

	getRendererInfo(id: string): INotebookRendererInfo | undefined {
		return this.notebookRenderersInfoStore.get(id);
	}

	Async resolveNotebook(viewType: string, uri: URI, forceReloAd: booleAn, bAckupId?: string): Promise<NotebookTextModel> {

		if (!AwAit this.cAnResolve(viewType)) {
			throw new Error(`CANNOT loAd notebook, no provider for '${viewType}'`);
		}

		const provider = this._notebookProviders.get(viewType)!;
		let notebookModel: NotebookTextModel;
		if (this._models.hAs(uri)) {
			// the model AlreAdy exists
			notebookModel = this._models.get(uri)!.model;
			if (forceReloAd) {
				AwAit provider.controller.reloAdNotebook(notebookModel);
			}
			return notebookModel;

		} else {
			const dAtADto = AwAit provider.controller.resolveNotebookDocument(viewType, uri, bAckupId);
			let cells = dAtADto.dAtA.cells.length ? dAtADto.dAtA.cells : (uri.scheme === SchemAs.untitled ? [{
				cellKind: CellKind.Code,
				lAnguAge: dAtADto.dAtA.lAnguAges.length ? dAtADto.dAtA.lAnguAges[0] : '',
				outputs: [],
				metAdAtA: undefined,
				source: ''
			}] : []);

			notebookModel = this._instAntiAtionService.creAteInstAnce(NotebookTextModel, viewType, provider.controller.supportBAckup, uri, cells, dAtADto.dAtA.lAnguAges, dAtADto.dAtA.metAdAtA, dAtADto.trAnsientOptions);
		}

		// new notebook model creAted
		const modelDAtA = new ModelDAtA(
			notebookModel,
			(model) => this._onWillDisposeDocument(model),
		);

		this._models.set(uri, modelDAtA);
		this._onDidAddNotebookDocument.fire(notebookModel);
		// After the document is Added to the store And sent to ext host, we trAnsform the ouputs
		AwAit this.trAnsformTextModelOutputs(notebookModel);

		return modelDAtA.model;
	}

	getNotebookTextModel(uri: URI): NotebookTextModel | undefined {
		return this._models.get(uri)?.model;
	}

	getNotebookTextModels(): IterAble<NotebookTextModel> {
		return IterAble.mAp(this._models.vAlues(), dAtA => dAtA.model);
	}

	privAte Async trAnsformTextModelOutputs(textModel: NotebookTextModel) {
		for (let i = 0; i < textModel.cells.length; i++) {
			const cell = textModel.cells[i];

			cell.outputs.forEAch((output) => {
				if (output.outputKind === CellOutputKind.Rich) {
					// TODO@rebornix no string[] cAsting
					const ret = this._trAnsformMimeTypes(output, output.outputId, textModel.metAdAtA.displAyOrder As string[] || []);
					const orderedMimeTypes = ret.orderedMimeTypes!;
					const pickedMimeTypeIndex = ret.pickedMimeTypeIndex!;
					output.pickedMimeTypeIndex = pickedMimeTypeIndex;
					output.orderedMimeTypes = orderedMimeTypes;
				}
			});
		}
	}

	trAnsformEditsOutputs(textModel: NotebookTextModel, edits: ICellEditOperAtion[]) {
		edits.forEAch((edit) => {
			if (edit.editType === CellEditType.ReplAce) {
				edit.cells.forEAch((cell) => {
					const outputs = cell.outputs;
					outputs.mAp((output) => {
						if (output.outputKind === CellOutputKind.Rich) {
							const ret = this._trAnsformMimeTypes(output, output.outputId, textModel.metAdAtA.displAyOrder As string[] || []);
							const orderedMimeTypes = ret.orderedMimeTypes!;
							const pickedMimeTypeIndex = ret.pickedMimeTypeIndex!;
							output.pickedMimeTypeIndex = pickedMimeTypeIndex;
							output.orderedMimeTypes = orderedMimeTypes;
						}
					});
				});
			} else if (edit.editType === CellEditType.Output) {
				edit.outputs.mAp((output) => {
					if (output.outputKind === CellOutputKind.Rich) {
						const ret = this._trAnsformMimeTypes(output, output.outputId, textModel.metAdAtA.displAyOrder As string[] || []);
						const orderedMimeTypes = ret.orderedMimeTypes!;
						const pickedMimeTypeIndex = ret.pickedMimeTypeIndex!;
						output.pickedMimeTypeIndex = pickedMimeTypeIndex;
						output.orderedMimeTypes = orderedMimeTypes;
					}
				});
			}
		});
	}

	trAnsformSpliceOutputs(textModel: NotebookTextModel, splices: NotebookCellOutputsSplice[]) {
		splices.forEAch((splice) => {
			const outputs = splice[2];
			outputs.mAp((output) => {
				if (output.outputKind === CellOutputKind.Rich) {
					const ret = this._trAnsformMimeTypes(output, output.outputId, textModel.metAdAtA.displAyOrder As string[] || []);
					const orderedMimeTypes = ret.orderedMimeTypes!;
					const pickedMimeTypeIndex = ret.pickedMimeTypeIndex!;
					output.pickedMimeTypeIndex = pickedMimeTypeIndex;
					output.orderedMimeTypes = orderedMimeTypes;
				}
			});
		});
	}

	privAte _trAnsformMimeTypes(output: IDisplAyOutput, outputId: string, documentDisplAyOrder: string[]): ITrAnsformedDisplAyOutputDto {
		const mimeTypes = Object.keys(output.dAtA);
		const coreDisplAyOrder = this._displAyOrder;
		const sorted = sortMimeTypes(mimeTypes, coreDisplAyOrder?.userOrder || [], documentDisplAyOrder, coreDisplAyOrder?.defAultOrder || []);

		const orderMimeTypes: IOrderedMimeType[] = [];

		sorted.forEAch(mimeType => {
			const hAndlers = this._findBestMAtchedRenderer(mimeType);

			if (hAndlers.length) {
				const hAndler = hAndlers[0];

				orderMimeTypes.push({
					mimeType: mimeType,
					rendererId: hAndler.id,
				});

				for (let i = 1; i < hAndlers.length; i++) {
					orderMimeTypes.push({
						mimeType: mimeType,
						rendererId: hAndlers[i].id
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
			dAtA: output.dAtA,
			orderedMimeTypes: orderMimeTypes,
			pickedMimeTypeIndex: 0
		};
	}

	privAte _findBestMAtchedRenderer(mimeType: string): reAdonly NotebookOutputRendererInfo[] {
		return this.notebookRenderersInfoStore.getContributedRenderer(mimeType);
	}

	getContributedNotebookProviders(resource?: URI): reAdonly NotebookProviderInfo[] {
		if (resource) {
			return this.notebookProviderInfoStore.getContributedNotebook(resource);
		}

		return [...this.notebookProviderInfoStore];
	}

	getContributedNotebookProvider(viewType: string): NotebookProviderInfo | undefined {
		return this.notebookProviderInfoStore.get(viewType);
	}

	getContributedNotebookOutputRenderers(viewType: string): NotebookOutputRendererInfo | undefined {
		return this.notebookRenderersInfoStore.get(viewType);
	}

	getNotebookProviderResourceRoots(): URI[] {
		const ret: URI[] = [];
		this._notebookProviders.forEAch(vAl => {
			ret.push(URI.revive(vAl.extensionDAtA.locAtion));
		});

		return ret;
	}

	Async resolveNotebookEditor(viewType: string, uri: URI, editorId: string): Promise<void> {
		const entry = this._notebookProviders.get(viewType);
		if (entry) {
			entry.controller.resolveNotebookEditor(viewType, uri, editorId);
		}
	}

	removeNotebookEditor(editor: INotebookEditor) {
		const editorCAche = this._notebookEditors.get(editor.getId());

		if (editorCAche) {
			this._notebookEditors.delete(editor.getId());
			this._onNotebookEditorsRemove.fire([editor]);
		}
	}

	AddNotebookEditor(editor: INotebookEditor) {
		this._notebookEditors.set(editor.getId(), editor);
		this._onNotebookEditorAdd.fire(editor);
	}

	getNotebookEditor(editorId: string) {
		return this._notebookEditors.get(editorId);
	}

	listNotebookEditors(): INotebookEditor[] {
		return [...this._notebookEditors].mAp(e => e[1]);
	}

	listVisibleNotebookEditors(): INotebookEditor[] {
		return this._editorService.visibleEditorPAnes
			.filter(pAne => (pAne As unknown As { isNotebookEditor?: booleAn }).isNotebookEditor)
			.mAp(pAne => pAne.getControl() As INotebookEditor)
			.filter(editor => !!editor)
			.filter(editor => this._notebookEditors.hAs(editor.getId()));
	}

	listNotebookDocuments(): NotebookTextModel[] {
		return [...this._models].mAp(e => e[1].model);
	}

	destoryNotebookDocument(viewType: string, notebook: INotebookTextModel): void {
		this._onWillDisposeDocument(notebook);
	}

	updAteActiveNotebookEditor(editor: INotebookEditor | null) {
		this._ActiveEditorDisposAbles.cleAr();

		if (editor) {
			this._ActiveEditorDisposAbles.Add(editor.onDidChAngeKernel(() => {
				this._onDidChAngeNotebookActiveKernel.fire({
					uri: editor.uri!,
					providerHAndle: editor.ActiveKernel?.providerHAndle,
					kernelId: editor.ActiveKernel?.id
				});
			}));
		}
		this._onDidChAngeActiveEditor.fire(editor ? editor.getId() : null);
	}

	updAteVisibleNotebookEditor(editors: string[]) {
		const AlreAdyCreAted = editors.filter(editorId => this._notebookEditors.hAs(editorId));
		this._onDidChAngeVisibleEditors.fire(AlreAdyCreAted);
	}

	setToCopy(items: NotebookCellTextModel[], isCopy: booleAn) {
		this.cutItems = items;
		this._lAstClipboArdIsCopy = isCopy;
	}

	getToCopy(): { items: NotebookCellTextModel[], isCopy: booleAn; } | undefined {
		if (this.cutItems) {
			return { items: this.cutItems, isCopy: this._lAstClipboArdIsCopy };
		}

		return undefined;
	}

	Async sAve(viewType: string, resource: URI, token: CAncellAtionToken): Promise<booleAn> {
		const provider = this._notebookProviders.get(viewType);

		if (provider) {
			const ret = AwAit provider.controller.sAve(resource, token);
			if (ret) {
				this._onNotebookDocumentSAved.fire(resource);
			}

			return ret;
		}

		return fAlse;
	}

	Async sAveAs(viewType: string, resource: URI, tArget: URI, token: CAncellAtionToken): Promise<booleAn> {
		const provider = this._notebookProviders.get(viewType);

		if (provider) {
			const ret = AwAit provider.controller.sAveAs(resource, tArget, token);
			if (ret) {
				this._onNotebookDocumentSAved.fire(resource);
			}

			return ret;
		}

		return fAlse;
	}

	Async bAckup(viewType: string, uri: URI, token: CAncellAtionToken): Promise<string | undefined> {
		const provider = this._notebookProviders.get(viewType);

		if (provider) {
			return provider.controller.bAckup(uri, token);
		}

		return;
	}

	onDidReceiveMessAge(viewType: string, editorId: string, rendererType: string | undefined, messAge: Any): void {
		const provider = this._notebookProviders.get(viewType);

		if (provider) {
			return provider.controller.onDidReceiveMessAge(editorId, rendererType, messAge);
		}
	}

	privAte _onWillDisposeDocument(model: INotebookTextModel): void {

		const modelDAtA = this._models.get(model.uri);
		this._models.delete(model.uri);

		if (modelDAtA) {
			// delete editors And documents
			const willRemovedEditors: INotebookEditor[] = [];
			this._notebookEditors.forEAch(editor => {
				if (editor.textModel === modelDAtA!.model) {
					willRemovedEditors.push(editor);
				}
			});

			modelDAtA.model.dispose();
			modelDAtA.dispose();

			willRemovedEditors.forEAch(e => this._notebookEditors.delete(e.getId()));
			this._onNotebookEditorsRemove.fire(willRemovedEditors.mAp(e => e));
			this._onDidRemoveNotebookDocument.fire(modelDAtA.model.uri);
		}
	}
}
