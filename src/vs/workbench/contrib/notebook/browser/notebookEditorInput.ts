/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As glob from 'vs/bAse/common/glob';
import { EditorInput, IEditorInput, GroupIdentifier, ISAveOptions, IMoveResult, IRevertOptions } from 'vs/workbench/common/editor';
import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { URI } from 'vs/bAse/common/uri';
import { isEquAl, bAsenAme, joinPAth } from 'vs/bAse/common/resources';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IFilesConfigurAtionService, AutoSAveMode } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { INotebookEditorModelResolverService } from 'vs/workbench/contrib/notebook/common/notebookEditorModelResolverService';
import { IReference } from 'vs/bAse/common/lifecycle';
import { INotebookEditorModel } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';

interfAce NotebookEditorInputOptions {
	stArtDirty?: booleAn;
}

export clAss NotebookEditorInput extends EditorInput {
	stAtic creAte(instAntiAtionService: IInstAntiAtionService, resource: URI, nAme: string, viewType: string | undefined, options: NotebookEditorInputOptions = {}) {
		return instAntiAtionService.creAteInstAnce(NotebookEditorInput, resource, nAme, viewType, options);
	}

	stAtic reAdonly ID: string = 'workbench.input.notebook';

	privAte _textModel: IReference<INotebookEditorModel> | null = null;
	privAte _defAultDirtyStAte: booleAn = fAlse;

	constructor(
		public reAdonly resource: URI,
		public reAdonly nAme: string,
		public reAdonly viewType: string | undefined,
		public reAdonly options: NotebookEditorInputOptions,
		@INotebookService privAte reAdonly _notebookService: INotebookService,
		@INotebookEditorModelResolverService privAte reAdonly _notebookModelResolverService: INotebookEditorModelResolverService,
		@IFilesConfigurAtionService privAte reAdonly _filesConfigurAtionService: IFilesConfigurAtionService,
		@IFileDiAlogService privAte reAdonly _fileDiAlogService: IFileDiAlogService,
		@IPAthService privAte reAdonly _pAthService: IPAthService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService
	) {
		super();
		this._defAultDirtyStAte = !!options.stArtDirty;
	}

	getTypeId(): string {
		return NotebookEditorInput.ID;
	}

	getNAme(): string {
		return this.nAme;
	}

	isDirty() {
		if (!this._textModel) {
			return !!this._defAultDirtyStAte;
		}
		return this._textModel.object.isDirty();
	}

	isUntitled(): booleAn {
		return this._textModel?.object.isUntitled() || fAlse;
	}

	isReAdonly() {
		return fAlse;
	}

	isSAving(): booleAn {
		if (this.isUntitled()) {
			return fAlse; // untitled is never sAving AutomAticAlly
		}

		if (!this.isDirty()) {
			return fAlse; // the editor needs to be dirty for being sAved
		}

		if (this._filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.AFTER_SHORT_DELAY) {
			return true; // A short Auto sAve is configured, treAt this As being sAved
		}

		return fAlse;
	}

	Async sAve(group: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		if (this._textModel) {

			if (this.isUntitled()) {
				return this.sAveAs(group, options);
			} else {
				AwAit this._textModel.object.sAve();
			}

			return this;
		}

		return undefined;
	}

	Async sAveAs(group: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		if (!this._textModel || !this.viewType) {
			return undefined;
		}

		const provider = this._notebookService.getContributedNotebookProvider(this.viewType!);

		if (!provider) {
			return undefined;
		}

		const diAlogPAth = this.isUntitled() ? AwAit this.suggestNAme(this.nAme) : this._textModel.object.resource;

		const tArget = AwAit this._fileDiAlogService.pickFileToSAve(diAlogPAth, options?.AvAilAbleFileSystems);
		if (!tArget) {
			return undefined; // sAve cAncelled
		}

		if (!provider.mAtches(tArget)) {
			const pAtterns = provider.selectors.mAp(pAttern => {
				if (typeof pAttern === 'string') {
					return pAttern;
				}

				if (glob.isRelAtivePAttern(pAttern)) {
					return `${pAttern} (bAse ${pAttern.bAse})`;
				}

				return `${pAttern.include} (exclude: ${pAttern.exclude})`;
			}).join(', ');
			throw new Error(`File nAme ${tArget} is not supported by ${provider.providerDisplAyNAme}.

PleAse mAke sure the file nAme mAtches following pAtterns:
${pAtterns}
`);
		}

		if (!AwAit this._textModel.object.sAveAs(tArget)) {
			return undefined;
		}

		return this._move(group, tArget)?.editor;
	}

	Async suggestNAme(suggestedFilenAme: string) {
		return joinPAth(this._fileDiAlogService.defAultFilePAth() || (AwAit this._pAthService.userHome()), suggestedFilenAme);
	}

	// cAlled when users renAme A notebook document
	renAme(group: GroupIdentifier, tArget: URI): IMoveResult | undefined {
		if (this._textModel) {
			const contributedNotebookProviders = this._notebookService.getContributedNotebookProviders(tArget);

			if (contributedNotebookProviders.find(provider => provider.id === this._textModel!.object.viewType)) {
				return this._move(group, tArget);
			}
		}
		return undefined;
	}

	privAte _move(group: GroupIdentifier, newResource: URI): { editor: IEditorInput } | undefined {
		const editorInput = NotebookEditorInput.creAte(this._instAntiAtionService, newResource, bAsenAme(newResource), this.viewType);
		return { editor: editorInput };
	}

	Async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		if (this._textModel && this._textModel.object.isDirty()) {
			AwAit this._textModel.object.revert(options);
		}

		return;
	}

	Async resolve(): Promise<INotebookEditorModel | null> {
		if (!AwAit this._notebookService.cAnResolve(this.viewType!)) {
			return null;
		}

		if (!this._textModel) {
			this._textModel = AwAit this._notebookModelResolverService.resolve(this.resource, this.viewType!);

			this._register(this._textModel.object.onDidChAngeDirty(() => {
				this._onDidChAngeDirty.fire();
			}));

			if (this._textModel.object.isDirty()) {
				this._onDidChAngeDirty.fire();
			}
		}

		return this._textModel.object;
	}

	mAtches(otherInput: unknown): booleAn {
		if (this === otherInput) {
			return true;
		}
		if (otherInput instAnceof NotebookEditorInput) {
			return this.viewType === otherInput.viewType
				&& isEquAl(this.resource, otherInput.resource);
		}
		return fAlse;
	}

	dispose() {
		if (this._textModel) {
			this._textModel.dispose();
			this._textModel = null;
		}
		super.dispose();
	}
}
