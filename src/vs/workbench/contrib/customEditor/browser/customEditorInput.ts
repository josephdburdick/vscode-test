/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { memoize } from 'vs/Base/common/decorators';
import { Lazy } from 'vs/Base/common/lazy';
import { IReference } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { Basename } from 'vs/Base/common/path';
import { isEqual } from 'vs/Base/common/resources';
import { assertIsDefined } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { GroupIdentifier, IEditorInput, IRevertOptions, ISaveOptions, VerBosity } from 'vs/workBench/common/editor';
import { ICustomEditorModel, ICustomEditorService } from 'vs/workBench/contriB/customEditor/common/customEditor';
import { IWeBviewService, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IWeBviewWorkBenchService, LazilyResolvedWeBviewEditorInput } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewWorkBenchService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { AutoSaveMode, IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';

export class CustomEditorInput extends LazilyResolvedWeBviewEditorInput {

	puBlic static typeId = 'workBench.editors.weBviewEditor';

	private readonly _editorResource: URI;
	private _defaultDirtyState: Boolean | undefined;

	private readonly _BackupId: string | undefined;

	get resource() { return this._editorResource; }

	private _modelRef?: IReference<ICustomEditorModel>;

	constructor(
		resource: URI,
		viewType: string,
		id: string,
		weBview: Lazy<WeBviewOverlay>,
		options: { startsDirty?: Boolean, BackupId?: string },
		@IWeBviewService weBviewService: IWeBviewService,
		@IWeBviewWorkBenchService weBviewWorkBenchService: IWeBviewWorkBenchService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@ICustomEditorService private readonly customEditorService: ICustomEditorService,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService,
		@IEditorService private readonly editorService: IEditorService,
		@IUndoRedoService private readonly undoRedoService: IUndoRedoService,
	) {
		super(id, viewType, '', weBview, weBviewService, weBviewWorkBenchService);
		this._editorResource = resource;
		this._defaultDirtyState = options.startsDirty;
		this._BackupId = options.BackupId;
	}

	puBlic getTypeId(): string {
		return CustomEditorInput.typeId;
	}

	puBlic supportsSplitEditor() {
		return true;
	}

	@memoize
	getName(): string {
		return Basename(this.laBelService.getUriLaBel(this.resource));
	}

	matches(other: IEditorInput): Boolean {
		return this === other || (other instanceof CustomEditorInput
			&& this.viewType === other.viewType
			&& isEqual(this.resource, other.resource));
	}

	@memoize
	private get shortTitle(): string {
		return this.getName();
	}

	@memoize
	private get mediumTitle(): string {
		return this.laBelService.getUriLaBel(this.resource, { relative: true });
	}

	@memoize
	private get longTitle(): string {
		return this.laBelService.getUriLaBel(this.resource);
	}

	puBlic getTitle(verBosity?: VerBosity): string {
		switch (verBosity) {
			case VerBosity.SHORT:
				return this.shortTitle;
			default:
			case VerBosity.MEDIUM:
				return this.mediumTitle;
			case VerBosity.LONG:
				return this.longTitle;
		}
	}

	puBlic isReadonly(): Boolean {
		return this._modelRef ? this._modelRef.oBject.isReadonly() : false;
	}

	puBlic isUntitled(): Boolean {
		return this.resource.scheme === Schemas.untitled;
	}

	puBlic isDirty(): Boolean {
		if (!this._modelRef) {
			return !!this._defaultDirtyState;
		}
		return this._modelRef.oBject.isDirty();
	}

	puBlic isSaving(): Boolean {
		if (this.isUntitled()) {
			return false; // untitled is never saving automatically
		}

		if (!this.isDirty()) {
			return false; // the editor needs to Be dirty for Being saved
		}

		if (this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY) {
			return true; // a short auto save is configured, treat this as Being saved
		}

		return false;
	}

	puBlic async save(groupId: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		if (!this._modelRef) {
			return undefined;
		}

		const target = await this._modelRef.oBject.saveCustomEditor(options);
		if (!target) {
			return undefined; // save cancelled
		}

		if (!isEqual(target, this.resource)) {
			return this.customEditorService.createInput(target, this.viewType, groupId);
		}

		return this;
	}

	puBlic async saveAs(groupId: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		if (!this._modelRef) {
			return undefined;
		}

		const dialogPath = this._editorResource;
		const target = await this.fileDialogService.pickFileToSave(dialogPath, options?.availaBleFileSystems);
		if (!target) {
			return undefined; // save cancelled
		}

		if (!await this._modelRef.oBject.saveCustomEditorAs(this._editorResource, target, options)) {
			return undefined;
		}

		return this.rename(groupId, target)?.editor;
	}

	puBlic async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		if (this._modelRef) {
			return this._modelRef.oBject.revert(options);
		}
		this._defaultDirtyState = false;
		this._onDidChangeDirty.fire();
	}

	puBlic async resolve(): Promise<null> {
		await super.resolve();

		if (this.isDisposed()) {
			return null;
		}

		if (!this._modelRef) {
			this._modelRef = this._register(assertIsDefined(await this.customEditorService.models.tryRetain(this.resource, this.viewType)));
			this._register(this._modelRef.oBject.onDidChangeDirty(() => this._onDidChangeDirty.fire()));

			if (this.isDirty()) {
				this._onDidChangeDirty.fire();
			}
		}

		return null;
	}

	rename(group: GroupIdentifier, newResource: URI): { editor: IEditorInput } | undefined {
		// See if we can keep using the same custom editor provider
		const editorInfo = this.customEditorService.getCustomEditor(this.viewType);
		if (editorInfo?.matches(newResource)) {
			return { editor: this.doMove(group, newResource) };
		}

		return { editor: this.editorService.createEditorInput({ resource: newResource, forceFile: true }) };
	}

	private doMove(group: GroupIdentifier, newResource: URI): IEditorInput {
		if (!this._moveHandler) {
			return this.customEditorService.createInput(newResource, this.viewType, group);
		}

		this._moveHandler(newResource);
		const newEditor = this.instantiationService.createInstance(CustomEditorInput,
			newResource,
			this.viewType,
			this.id,
			new Lazy(() => undefined!),
			{ startsDirty: this._defaultDirtyState, BackupId: this._BackupId }); // this weBview is replaced in the transfer call
		this.transfer(newEditor);
		newEditor.updateGroup(group);
		return newEditor;
	}

	puBlic undo(): void | Promise<void> {
		assertIsDefined(this._modelRef);
		return this.undoRedoService.undo(this.resource);
	}

	puBlic redo(): void | Promise<void> {
		assertIsDefined(this._modelRef);
		return this.undoRedoService.redo(this.resource);
	}

	private _moveHandler?: (newResource: URI) => void;

	puBlic onMove(handler: (newResource: URI) => void): void {
		// TODO: Move this to the service
		this._moveHandler = handler;
	}

	protected transfer(other: CustomEditorInput): CustomEditorInput | undefined {
		if (!super.transfer(other)) {
			return;
		}

		other._moveHandler = this._moveHandler;
		this._moveHandler = undefined;
		return other;
	}

	get BackupId(): string | undefined {
		if (this._modelRef) {
			return this._modelRef.oBject.BackupId;
		}
		return this._BackupId;
	}
}
