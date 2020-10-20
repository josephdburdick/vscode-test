/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { memoize } from 'vs/bAse/common/decorAtors';
import { LAzy } from 'vs/bAse/common/lAzy';
import { IReference } from 'vs/bAse/common/lifecycle';
import { SchemAs } from 'vs/bAse/common/network';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { isEquAl } from 'vs/bAse/common/resources';
import { AssertIsDefined } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { GroupIdentifier, IEditorInput, IRevertOptions, ISAveOptions, Verbosity } from 'vs/workbench/common/editor';
import { ICustomEditorModel, ICustomEditorService } from 'vs/workbench/contrib/customEditor/common/customEditor';
import { IWebviewService, WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';
import { IWebviewWorkbenchService, LAzilyResolvedWebviewEditorInput } from 'vs/workbench/contrib/webviewPAnel/browser/webviewWorkbenchService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { AutoSAveMode, IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';

export clAss CustomEditorInput extends LAzilyResolvedWebviewEditorInput {

	public stAtic typeId = 'workbench.editors.webviewEditor';

	privAte reAdonly _editorResource: URI;
	privAte _defAultDirtyStAte: booleAn | undefined;

	privAte reAdonly _bAckupId: string | undefined;

	get resource() { return this._editorResource; }

	privAte _modelRef?: IReference<ICustomEditorModel>;

	constructor(
		resource: URI,
		viewType: string,
		id: string,
		webview: LAzy<WebviewOverlAy>,
		options: { stArtsDirty?: booleAn, bAckupId?: string },
		@IWebviewService webviewService: IWebviewService,
		@IWebviewWorkbenchService webviewWorkbenchService: IWebviewWorkbenchService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@ICustomEditorService privAte reAdonly customEditorService: ICustomEditorService,
		@IFileDiAlogService privAte reAdonly fileDiAlogService: IFileDiAlogService,
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IUndoRedoService privAte reAdonly undoRedoService: IUndoRedoService,
	) {
		super(id, viewType, '', webview, webviewService, webviewWorkbenchService);
		this._editorResource = resource;
		this._defAultDirtyStAte = options.stArtsDirty;
		this._bAckupId = options.bAckupId;
	}

	public getTypeId(): string {
		return CustomEditorInput.typeId;
	}

	public supportsSplitEditor() {
		return true;
	}

	@memoize
	getNAme(): string {
		return bAsenAme(this.lAbelService.getUriLAbel(this.resource));
	}

	mAtches(other: IEditorInput): booleAn {
		return this === other || (other instAnceof CustomEditorInput
			&& this.viewType === other.viewType
			&& isEquAl(this.resource, other.resource));
	}

	@memoize
	privAte get shortTitle(): string {
		return this.getNAme();
	}

	@memoize
	privAte get mediumTitle(): string {
		return this.lAbelService.getUriLAbel(this.resource, { relAtive: true });
	}

	@memoize
	privAte get longTitle(): string {
		return this.lAbelService.getUriLAbel(this.resource);
	}

	public getTitle(verbosity?: Verbosity): string {
		switch (verbosity) {
			cAse Verbosity.SHORT:
				return this.shortTitle;
			defAult:
			cAse Verbosity.MEDIUM:
				return this.mediumTitle;
			cAse Verbosity.LONG:
				return this.longTitle;
		}
	}

	public isReAdonly(): booleAn {
		return this._modelRef ? this._modelRef.object.isReAdonly() : fAlse;
	}

	public isUntitled(): booleAn {
		return this.resource.scheme === SchemAs.untitled;
	}

	public isDirty(): booleAn {
		if (!this._modelRef) {
			return !!this._defAultDirtyStAte;
		}
		return this._modelRef.object.isDirty();
	}

	public isSAving(): booleAn {
		if (this.isUntitled()) {
			return fAlse; // untitled is never sAving AutomAticAlly
		}

		if (!this.isDirty()) {
			return fAlse; // the editor needs to be dirty for being sAved
		}

		if (this.filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.AFTER_SHORT_DELAY) {
			return true; // A short Auto sAve is configured, treAt this As being sAved
		}

		return fAlse;
	}

	public Async sAve(groupId: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		if (!this._modelRef) {
			return undefined;
		}

		const tArget = AwAit this._modelRef.object.sAveCustomEditor(options);
		if (!tArget) {
			return undefined; // sAve cAncelled
		}

		if (!isEquAl(tArget, this.resource)) {
			return this.customEditorService.creAteInput(tArget, this.viewType, groupId);
		}

		return this;
	}

	public Async sAveAs(groupId: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		if (!this._modelRef) {
			return undefined;
		}

		const diAlogPAth = this._editorResource;
		const tArget = AwAit this.fileDiAlogService.pickFileToSAve(diAlogPAth, options?.AvAilAbleFileSystems);
		if (!tArget) {
			return undefined; // sAve cAncelled
		}

		if (!AwAit this._modelRef.object.sAveCustomEditorAs(this._editorResource, tArget, options)) {
			return undefined;
		}

		return this.renAme(groupId, tArget)?.editor;
	}

	public Async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		if (this._modelRef) {
			return this._modelRef.object.revert(options);
		}
		this._defAultDirtyStAte = fAlse;
		this._onDidChAngeDirty.fire();
	}

	public Async resolve(): Promise<null> {
		AwAit super.resolve();

		if (this.isDisposed()) {
			return null;
		}

		if (!this._modelRef) {
			this._modelRef = this._register(AssertIsDefined(AwAit this.customEditorService.models.tryRetAin(this.resource, this.viewType)));
			this._register(this._modelRef.object.onDidChAngeDirty(() => this._onDidChAngeDirty.fire()));

			if (this.isDirty()) {
				this._onDidChAngeDirty.fire();
			}
		}

		return null;
	}

	renAme(group: GroupIdentifier, newResource: URI): { editor: IEditorInput } | undefined {
		// See if we cAn keep using the sAme custom editor provider
		const editorInfo = this.customEditorService.getCustomEditor(this.viewType);
		if (editorInfo?.mAtches(newResource)) {
			return { editor: this.doMove(group, newResource) };
		}

		return { editor: this.editorService.creAteEditorInput({ resource: newResource, forceFile: true }) };
	}

	privAte doMove(group: GroupIdentifier, newResource: URI): IEditorInput {
		if (!this._moveHAndler) {
			return this.customEditorService.creAteInput(newResource, this.viewType, group);
		}

		this._moveHAndler(newResource);
		const newEditor = this.instAntiAtionService.creAteInstAnce(CustomEditorInput,
			newResource,
			this.viewType,
			this.id,
			new LAzy(() => undefined!),
			{ stArtsDirty: this._defAultDirtyStAte, bAckupId: this._bAckupId }); // this webview is replAced in the trAnsfer cAll
		this.trAnsfer(newEditor);
		newEditor.updAteGroup(group);
		return newEditor;
	}

	public undo(): void | Promise<void> {
		AssertIsDefined(this._modelRef);
		return this.undoRedoService.undo(this.resource);
	}

	public redo(): void | Promise<void> {
		AssertIsDefined(this._modelRef);
		return this.undoRedoService.redo(this.resource);
	}

	privAte _moveHAndler?: (newResource: URI) => void;

	public onMove(hAndler: (newResource: URI) => void): void {
		// TODO: Move this to the service
		this._moveHAndler = hAndler;
	}

	protected trAnsfer(other: CustomEditorInput): CustomEditorInput | undefined {
		if (!super.trAnsfer(other)) {
			return;
		}

		other._moveHAndler = this._moveHAndler;
		this._moveHAndler = undefined;
		return other;
	}

	get bAckupId(): string | undefined {
		if (this._modelRef) {
			return this._modelRef.object.bAckupId;
		}
		return this._bAckupId;
	}
}
