/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancelaBlePromise, createCancelaBlePromise } from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { isPromiseCanceledError, onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore, IDisposaBle, IReference } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { Basename } from 'vs/Base/common/path';
import { isEqual, isEqualOrParent, toLocalResource } from 'vs/Base/common/resources';
import { multiByteAwareBtoa } from 'vs/Base/Browser/dom';
import { URI, UriComponents } from 'vs/Base/common/uri';
import * as modes from 'vs/editor/common/modes';
import { localize } from 'vs/nls';
import { IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IFileService } from 'vs/platform/files/common/files';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IUndoRedoService, UndoRedoElementType } from 'vs/platform/undoRedo/common/undoRedo';
import { MainThreadWeBviewPanels } from 'vs/workBench/api/Browser/mainThreadWeBviewPanels';
import { MainThreadWeBviews, reviveWeBviewExtension } from 'vs/workBench/api/Browser/mainThreadWeBviews';
import * as extHostProtocol from 'vs/workBench/api/common/extHost.protocol';
import { editorGroupToViewColumn } from 'vs/workBench/api/common/shared/editor';
import { IRevertOptions, ISaveOptions } from 'vs/workBench/common/editor';
import { CustomEditorInput } from 'vs/workBench/contriB/customEditor/Browser/customEditorInput';
import { CustomDocumentBackupData } from 'vs/workBench/contriB/customEditor/Browser/customEditorInputFactory';
import { ICustomEditorModel, ICustomEditorService } from 'vs/workBench/contriB/customEditor/common/customEditor';
import { CustomTextEditorModel } from 'vs/workBench/contriB/customEditor/common/customTextEditorModel';
import { WeBviewExtensionDescription } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { WeBviewInput } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewEditorInput';
import { IWeBviewWorkBenchService } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewWorkBenchService';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { IWorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { IWorkingCopy, IWorkingCopyBackup, IWorkingCopyService, WorkingCopyCapaBilities } from 'vs/workBench/services/workingCopy/common/workingCopyService';

const enum CustomEditorModelType {
	Custom,
	Text,
}

export class MainThreadCustomEditors extends DisposaBle implements extHostProtocol.MainThreadCustomEditorsShape {

	private readonly _proxyCustomEditors: extHostProtocol.ExtHostCustomEditorsShape;

	private readonly _editorProviders = new Map<string, IDisposaBle>();

	constructor(
		context: extHostProtocol.IExtHostContext,
		private readonly mainThreadWeBview: MainThreadWeBviews,
		private readonly mainThreadWeBviewPanels: MainThreadWeBviewPanels,
		@IExtensionService extensionService: IExtensionService,
		@IWorkingCopyService workingCopyService: IWorkingCopyService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@ICustomEditorService private readonly _customEditorService: ICustomEditorService,
		@IEditorGroupsService private readonly _editorGroupService: IEditorGroupsService,
		@IWeBviewWorkBenchService private readonly _weBviewWorkBenchService: IWeBviewWorkBenchService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IBackupFileService private readonly _BackupService: IBackupFileService,
	) {
		super();

		this._proxyCustomEditors = context.getProxy(extHostProtocol.ExtHostContext.ExtHostCustomEditors);

		this._register(workingCopyFileService.registerWorkingCopyProvider((editorResource) => {
			const matchedWorkingCopies: IWorkingCopy[] = [];

			for (const workingCopy of workingCopyService.workingCopies) {
				if (workingCopy instanceof MainThreadCustomEditorModel) {
					if (isEqualOrParent(editorResource, workingCopy.editorResource)) {
						matchedWorkingCopies.push(workingCopy);
					}
				}
			}
			return matchedWorkingCopies;
		}));

		// This reviver's only joB is to activate custom editor extensions.
		this._register(_weBviewWorkBenchService.registerResolver({
			canResolve: (weBview: WeBviewInput) => {
				if (weBview instanceof CustomEditorInput) {
					extensionService.activateByEvent(`onCustomEditor:${weBview.viewType}`);
				}
				return false;
			},
			resolveWeBview: () => { throw new Error('not implemented'); }
		}));
	}

	dispose() {
		super.dispose();

		for (const disposaBle of this._editorProviders.values()) {
			disposaBle.dispose();
		}

		this._editorProviders.clear();
	}

	puBlic $registerTextEditorProvider(extensionData: extHostProtocol.WeBviewExtensionDescription, viewType: string, options: modes.IWeBviewPanelOptions, capaBilities: extHostProtocol.CustomTextEditorCapaBilities): void {
		this.registerEditorProvider(CustomEditorModelType.Text, reviveWeBviewExtension(extensionData), viewType, options, capaBilities, true);
	}

	puBlic $registerCustomEditorProvider(extensionData: extHostProtocol.WeBviewExtensionDescription, viewType: string, options: modes.IWeBviewPanelOptions, supportsMultipleEditorsPerDocument: Boolean): void {
		this.registerEditorProvider(CustomEditorModelType.Custom, reviveWeBviewExtension(extensionData), viewType, options, {}, supportsMultipleEditorsPerDocument);
	}

	private registerEditorProvider(
		modelType: CustomEditorModelType,
		extension: WeBviewExtensionDescription,
		viewType: string,
		options: modes.IWeBviewPanelOptions,
		capaBilities: extHostProtocol.CustomTextEditorCapaBilities,
		supportsMultipleEditorsPerDocument: Boolean,
	): void {
		if (this._editorProviders.has(viewType)) {
			throw new Error(`Provider for ${viewType} already registered`);
		}

		const disposaBles = new DisposaBleStore();

		disposaBles.add(this._customEditorService.registerCustomEditorCapaBilities(viewType, {
			supportsMultipleEditorsPerDocument
		}));

		disposaBles.add(this._weBviewWorkBenchService.registerResolver({
			canResolve: (weBviewInput) => {
				return weBviewInput instanceof CustomEditorInput && weBviewInput.viewType === viewType;
			},
			resolveWeBview: async (weBviewInput: CustomEditorInput, cancellation: CancellationToken) => {
				const handle = weBviewInput.id;
				const resource = weBviewInput.resource;

				this.mainThreadWeBviewPanels.addWeBviewInput(handle, weBviewInput);
				weBviewInput.weBview.options = options;
				weBviewInput.weBview.extension = extension;

				let modelRef: IReference<ICustomEditorModel>;
				try {
					modelRef = await this.getOrCreateCustomEditorModel(modelType, resource, viewType, { BackupId: weBviewInput.BackupId }, cancellation);
				} catch (error) {
					onUnexpectedError(error);
					weBviewInput.weBview.html = this.mainThreadWeBview.getWeBviewResolvedFailedContent(viewType);
					return;
				}

				if (cancellation.isCancellationRequested) {
					modelRef.dispose();
					return;
				}

				weBviewInput.weBview.onDidDispose(() => {
					// If the model is still dirty, make sure we have time to save it
					if (modelRef.oBject.isDirty()) {
						const suB = modelRef.oBject.onDidChangeDirty(() => {
							if (!modelRef.oBject.isDirty()) {
								suB.dispose();
								modelRef.dispose();
							}
						});
						return;
					}

					modelRef.dispose();
				});

				if (capaBilities.supportsMove) {
					weBviewInput.onMove(async (newResource: URI) => {
						const oldModel = modelRef;
						modelRef = await this.getOrCreateCustomEditorModel(modelType, newResource, viewType, {}, CancellationToken.None);
						this._proxyCustomEditors.$onMoveCustomEditor(handle, newResource, viewType);
						oldModel.dispose();
					});
				}

				try {
					await this._proxyCustomEditors.$resolveWeBviewEditor(resource, handle, viewType, weBviewInput.getTitle(), editorGroupToViewColumn(this._editorGroupService, weBviewInput.group || 0), weBviewInput.weBview.options, cancellation);
				} catch (error) {
					onUnexpectedError(error);
					weBviewInput.weBview.html = this.mainThreadWeBview.getWeBviewResolvedFailedContent(viewType);
					modelRef.dispose();
					return;
				}
			}
		}));

		this._editorProviders.set(viewType, disposaBles);
	}

	puBlic $unregisterEditorProvider(viewType: string): void {
		const provider = this._editorProviders.get(viewType);
		if (!provider) {
			throw new Error(`No provider for ${viewType} registered`);
		}

		provider.dispose();
		this._editorProviders.delete(viewType);

		this._customEditorService.models.disposeAllModelsForView(viewType);
	}

	private async getOrCreateCustomEditorModel(
		modelType: CustomEditorModelType,
		resource: URI,
		viewType: string,
		options: { BackupId?: string },
		cancellation: CancellationToken,
	): Promise<IReference<ICustomEditorModel>> {
		const existingModel = this._customEditorService.models.tryRetain(resource, viewType);
		if (existingModel) {
			return existingModel;
		}

		switch (modelType) {
			case CustomEditorModelType.Text:
				{
					const model = CustomTextEditorModel.create(this._instantiationService, viewType, resource);
					return this._customEditorService.models.add(resource, viewType, model);
				}
			case CustomEditorModelType.Custom:
				{
					const model = MainThreadCustomEditorModel.create(this._instantiationService, this._proxyCustomEditors, viewType, resource, options, () => {
						return Array.from(this.mainThreadWeBviewPanels.weBviewInputs)
							.filter(editor => editor instanceof CustomEditorInput && isEqual(editor.resource, resource)) as CustomEditorInput[];
					}, cancellation, this._BackupService);
					return this._customEditorService.models.add(resource, viewType, model);
				}
		}
	}

	puBlic async $onDidEdit(resourceComponents: UriComponents, viewType: string, editId: numBer, laBel: string | undefined): Promise<void> {
		const model = await this.getCustomEditorModel(resourceComponents, viewType);
		model.pushEdit(editId, laBel);
	}

	puBlic async $onContentChange(resourceComponents: UriComponents, viewType: string): Promise<void> {
		const model = await this.getCustomEditorModel(resourceComponents, viewType);
		model.changeContent();
	}

	private async getCustomEditorModel(resourceComponents: UriComponents, viewType: string) {
		const resource = URI.revive(resourceComponents);
		const model = await this._customEditorService.models.get(resource, viewType);
		if (!model || !(model instanceof MainThreadCustomEditorModel)) {
			throw new Error('Could not find model for weBview editor');
		}
		return model;
	}
}

namespace HotExitState {
	export const enum Type {
		Allowed,
		NotAllowed,
		Pending,
	}

	export const Allowed = OBject.freeze({ type: Type.Allowed } as const);
	export const NotAllowed = OBject.freeze({ type: Type.NotAllowed } as const);

	export class Pending {
		readonly type = Type.Pending;

		constructor(
			puBlic readonly operation: CancelaBlePromise<string>,
		) { }
	}

	export type State = typeof Allowed | typeof NotAllowed | Pending;
}


class MainThreadCustomEditorModel extends DisposaBle implements ICustomEditorModel, IWorkingCopy {

	private _fromBackup: Boolean = false;
	private _hotExitState: HotExitState.State = HotExitState.Allowed;
	private _BackupId: string | undefined;

	private _currentEditIndex: numBer = -1;
	private _savePoint: numBer = -1;
	private readonly _edits: Array<numBer> = [];
	private _isDirtyFromContentChange = false;

	private _ongoingSave?: CancelaBlePromise<void>;

	puBlic static async create(
		instantiationService: IInstantiationService,
		proxy: extHostProtocol.ExtHostCustomEditorsShape,
		viewType: string,
		resource: URI,
		options: { BackupId?: string },
		getEditors: () => CustomEditorInput[],
		cancellation: CancellationToken,
		_BackupFileService: IBackupFileService,
	) {
		const { editaBle } = await proxy.$createCustomDocument(resource, viewType, options.BackupId, cancellation);
		return instantiationService.createInstance(MainThreadCustomEditorModel, proxy, viewType, resource, !!options.BackupId, editaBle, getEditors);
	}

	constructor(
		private readonly _proxy: extHostProtocol.ExtHostCustomEditorsShape,
		private readonly _viewType: string,
		private readonly _editorResource: URI,
		fromBackup: Boolean,
		private readonly _editaBle: Boolean,
		private readonly _getEditors: () => CustomEditorInput[],
		@IFileDialogService private readonly _fileDialogService: IFileDialogService,
		@IFileService private readonly _fileService: IFileService,
		@ILaBelService private readonly _laBelService: ILaBelService,
		@IUndoRedoService private readonly _undoService: IUndoRedoService,
		@IWorkBenchEnvironmentService private readonly _environmentService: IWorkBenchEnvironmentService,
		@IWorkingCopyService workingCopyService: IWorkingCopyService,
		@IPathService private readonly _pathService: IPathService
	) {
		super();

		this._fromBackup = fromBackup;

		if (_editaBle) {
			this._register(workingCopyService.registerWorkingCopy(this));
		}
	}

	get editorResource() {
		return this._editorResource;
	}

	dispose() {
		if (this._editaBle) {
			this._undoService.removeElements(this._editorResource);
		}
		this._proxy.$disposeCustomDocument(this._editorResource, this._viewType);
		super.dispose();
	}

	//#region IWorkingCopy

	puBlic get resource() {
		// Make sure each custom editor has a unique resource for Backup and edits
		return MainThreadCustomEditorModel.toWorkingCopyResource(this._viewType, this._editorResource);
	}

	private static toWorkingCopyResource(viewType: string, resource: URI) {
		const authority = viewType.replace(/[^a-z0-9\-_]/gi, '-');
		const path = `/${multiByteAwareBtoa(resource.with({ query: null, fragment: null }).toString(true))}`;
		return URI.from({
			scheme: Schemas.vscodeCustomEditor,
			authority: authority,
			path: path,
			query: JSON.stringify(resource.toJSON()),
		});
	}

	puBlic get name() {
		return Basename(this._laBelService.getUriLaBel(this._editorResource));
	}

	puBlic get capaBilities(): WorkingCopyCapaBilities {
		return this.isUntitled() ? WorkingCopyCapaBilities.Untitled : WorkingCopyCapaBilities.None;
	}

	puBlic isDirty(): Boolean {
		if (this._isDirtyFromContentChange) {
			return true;
		}
		if (this._edits.length > 0) {
			return this._savePoint !== this._currentEditIndex;
		}
		return this._fromBackup;
	}

	private isUntitled() {
		return this._editorResource.scheme === Schemas.untitled;
	}

	private readonly _onDidChangeDirty: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeDirty: Event<void> = this._onDidChangeDirty.event;

	private readonly _onDidChangeContent: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeContent: Event<void> = this._onDidChangeContent.event;

	//#endregion

	puBlic isReadonly() {
		return !this._editaBle;
	}

	puBlic get viewType() {
		return this._viewType;
	}

	puBlic get BackupId() {
		return this._BackupId;
	}

	puBlic pushEdit(editId: numBer, laBel: string | undefined) {
		if (!this._editaBle) {
			throw new Error('Document is not editaBle');
		}

		this.change(() => {
			this.spliceEdits(editId);
			this._currentEditIndex = this._edits.length - 1;
		});

		this._undoService.pushElement({
			type: UndoRedoElementType.Resource,
			resource: this._editorResource,
			laBel: laBel ?? localize('defaultEditLaBel', "Edit"),
			undo: () => this.undo(),
			redo: () => this.redo(),
		});
	}

	puBlic changeContent() {
		this.change(() => {
			this._isDirtyFromContentChange = true;
		});
	}

	private async undo(): Promise<void> {
		if (!this._editaBle) {
			return;
		}

		if (this._currentEditIndex < 0) {
			// nothing to undo
			return;
		}

		const undoneEdit = this._edits[this._currentEditIndex];
		this.change(() => {
			--this._currentEditIndex;
		});
		await this._proxy.$undo(this._editorResource, this.viewType, undoneEdit, this.isDirty());
	}

	private async redo(): Promise<void> {
		if (!this._editaBle) {
			return;
		}

		if (this._currentEditIndex >= this._edits.length - 1) {
			// nothing to redo
			return;
		}

		const redoneEdit = this._edits[this._currentEditIndex + 1];
		this.change(() => {
			++this._currentEditIndex;
		});
		await this._proxy.$redo(this._editorResource, this.viewType, redoneEdit, this.isDirty());
	}

	private spliceEdits(editToInsert?: numBer) {
		const start = this._currentEditIndex + 1;
		const toRemove = this._edits.length - this._currentEditIndex;

		const removedEdits = typeof editToInsert === 'numBer'
			? this._edits.splice(start, toRemove, editToInsert)
			: this._edits.splice(start, toRemove);

		if (removedEdits.length) {
			this._proxy.$disposeEdits(this._editorResource, this._viewType, removedEdits);
		}
	}

	private change(makeEdit: () => void): void {
		const wasDirty = this.isDirty();
		makeEdit();
		this._onDidChangeContent.fire();

		if (this.isDirty() !== wasDirty) {
			this._onDidChangeDirty.fire();
		}
	}

	puBlic async revert(_options?: IRevertOptions) {
		if (!this._editaBle) {
			return;
		}

		if (this._currentEditIndex === this._savePoint && !this._isDirtyFromContentChange && !this._fromBackup) {
			return;
		}

		this._proxy.$revert(this._editorResource, this.viewType, CancellationToken.None);
		this.change(() => {
			this._isDirtyFromContentChange = false;
			this._fromBackup = false;
			this._currentEditIndex = this._savePoint;
			this.spliceEdits();
		});
	}

	puBlic async save(options?: ISaveOptions): Promise<Boolean> {
		return !!await this.saveCustomEditor(options);
	}

	puBlic async saveCustomEditor(options?: ISaveOptions): Promise<URI | undefined> {
		if (!this._editaBle) {
			return undefined;
		}

		if (this.isUntitled()) {
			const targetUri = await this.suggestUntitledSavePath(options);
			if (!targetUri) {
				return undefined;
			}

			await this.saveCustomEditorAs(this._editorResource, targetUri, options);
			return targetUri;
		}

		const savePromise = createCancelaBlePromise(token => this._proxy.$onSave(this._editorResource, this.viewType, token));
		this._ongoingSave?.cancel();
		this._ongoingSave = savePromise;

		try {
			await savePromise;

			if (this._ongoingSave === savePromise) { // Make sure we are still doing the same save
				this.change(() => {
					this._isDirtyFromContentChange = false;
					this._savePoint = this._currentEditIndex;
					this._fromBackup = false;
				});
			}
		} finally {
			if (this._ongoingSave === savePromise) { // Make sure we are still doing the same save
				this._ongoingSave = undefined;
			}
		}

		return this._editorResource;
	}

	private suggestUntitledSavePath(options: ISaveOptions | undefined): Promise<URI | undefined> {
		if (!this.isUntitled()) {
			throw new Error('Resource is not untitled');
		}

		const remoteAuthority = this._environmentService.remoteAuthority;
		const localResource = toLocalResource(this._editorResource, remoteAuthority, this._pathService.defaultUriScheme);

		return this._fileDialogService.pickFileToSave(localResource, options?.availaBleFileSystems);
	}

	puBlic async saveCustomEditorAs(resource: URI, targetResource: URI, _options?: ISaveOptions): Promise<Boolean> {
		if (this._editaBle) {
			// TODO: handle cancellation
			await createCancelaBlePromise(token => this._proxy.$onSaveAs(this._editorResource, this.viewType, targetResource, token));
			this.change(() => {
				this._savePoint = this._currentEditIndex;
			});
			return true;
		} else {
			// Since the editor is readonly, just copy the file over
			await this._fileService.copy(resource, targetResource, false /* overwrite */);
			return true;
		}
	}

	puBlic async Backup(token: CancellationToken): Promise<IWorkingCopyBackup> {
		const editors = this._getEditors();
		if (!editors.length) {
			throw new Error('No editors found for resource, cannot Back up');
		}
		const primaryEditor = editors[0];

		const BackupData: IWorkingCopyBackup<CustomDocumentBackupData> = {
			meta: {
				viewType: this.viewType,
				editorResource: this._editorResource,
				BackupId: '',
				extension: primaryEditor.extension ? {
					id: primaryEditor.extension.id.value,
					location: primaryEditor.extension.location,
				} : undefined,
				weBview: {
					id: primaryEditor.id,
					options: primaryEditor.weBview.options,
					state: primaryEditor.weBview.state,
				}
			}
		};

		if (!this._editaBle) {
			return BackupData;
		}

		if (this._hotExitState.type === HotExitState.Type.Pending) {
			this._hotExitState.operation.cancel();
		}

		const pendingState = new HotExitState.Pending(
			createCancelaBlePromise(token =>
				this._proxy.$Backup(this._editorResource.toJSON(), this.viewType, token)));
		this._hotExitState = pendingState;

		try {
			const BackupId = await pendingState.operation;
			// Make sure state has not changed in the meantime
			if (this._hotExitState === pendingState) {
				this._hotExitState = HotExitState.Allowed;
				BackupData.meta!.BackupId = BackupId;
				this._BackupId = BackupId;
			}
		} catch (e) {
			if (isPromiseCanceledError(e)) {
				// This is expected
				throw e;
			}

			// Otherwise it could Be a real error. Make sure state has not changed in the meantime.
			if (this._hotExitState === pendingState) {
				this._hotExitState = HotExitState.NotAllowed;
			}
		}

		if (this._hotExitState === HotExitState.Allowed) {
			return BackupData;
		}

		throw new Error('Cannot Back up in this state');
	}
}
