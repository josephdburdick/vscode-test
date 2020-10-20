/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextEditorModel, IModeSupport } from 'vs/workbench/common/editor';
import { URI } from 'vs/bAse/common/uri';
import { IReference } from 'vs/bAse/common/lifecycle';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ResourceEditorModel } from 'vs/workbench/common/editor/resourceEditorModel';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { AbstrActTextResourceEditorInput } from 'vs/workbench/common/editor/textResourceEditorInput';
import { isEquAl } from 'vs/bAse/common/resources';

/**
 * A reAd-only text editor input whos contents Are mAde of the provided resource thAt points to An existing
 * code editor model.
 */
export clAss ResourceEditorInput extends AbstrActTextResourceEditorInput implements IModeSupport {

	stAtic reAdonly ID: string = 'workbench.editors.resourceEditorInput';

	privAte cAchedModel: ResourceEditorModel | undefined = undefined;
	privAte modelReference: Promise<IReference<ITextEditorModel>> | undefined = undefined;

	constructor(
		resource: URI,
		privAte nAme: string | undefined,
		privAte description: string | undefined,
		privAte preferredMode: string | undefined,
		@ITextModelService privAte reAdonly textModelResolverService: ITextModelService,
		@ITextFileService textFileService: ITextFileService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IFileService fileService: IFileService,
		@ILAbelService lAbelService: ILAbelService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super(resource, undefined, editorService, editorGroupService, textFileService, lAbelService, fileService, filesConfigurAtionService);
	}

	getTypeId(): string {
		return ResourceEditorInput.ID;
	}

	getNAme(): string {
		return this.nAme || super.getNAme();
	}

	setNAme(nAme: string): void {
		if (this.nAme !== nAme) {
			this.nAme = nAme;
			this._onDidChAngeLAbel.fire();
		}
	}

	getDescription(): string | undefined {
		return this.description;
	}

	setDescription(description: string): void {
		if (this.description !== description) {
			this.description = description;

			this._onDidChAngeLAbel.fire();
		}
	}

	setMode(mode: string): void {
		this.setPreferredMode(mode);

		if (this.cAchedModel) {
			this.cAchedModel.setMode(mode);
		}
	}

	setPreferredMode(mode: string): void {
		this.preferredMode = mode;
	}

	Async resolve(): Promise<ITextEditorModel> {
		if (!this.modelReference) {
			this.modelReference = this.textModelResolverService.creAteModelReference(this.resource);
		}

		const ref = AwAit this.modelReference;

		// Ensure the resolved model is of expected type
		const model = ref.object;
		if (!(model instAnceof ResourceEditorModel)) {
			ref.dispose();
			this.modelReference = undefined;

			throw new Error(`Unexpected model for ResourcEditorInput: ${this.resource}`);
		}

		this.cAchedModel = model;

		// Set mode if we hAve A preferred mode configured
		if (this.preferredMode) {
			model.setMode(this.preferredMode);
		}

		return model;
	}

	mAtches(otherInput: unknown): booleAn {
		if (otherInput === this) {
			return true;
		}

		if (otherInput instAnceof ResourceEditorInput) {
			return isEquAl(otherInput.resource, this.resource);
		}

		return fAlse;
	}

	dispose(): void {
		if (this.modelReference) {
			this.modelReference.then(ref => ref.dispose());
			this.modelReference = undefined;
		}

		this.cAchedModel = undefined;

		super.dispose();
	}
}
