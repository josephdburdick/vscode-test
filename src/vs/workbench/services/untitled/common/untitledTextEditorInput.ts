/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEncodingSupport, EncodingMode, VerBosity, IModeSupport } from 'vs/workBench/common/editor';
import { ABstractTextResourceEditorInput } from 'vs/workBench/common/editor/textResourceEditorInput';
import { IUntitledTextEditorModel } from 'vs/workBench/services/untitled/common/untitledTextEditorModel';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IFileService } from 'vs/platform/files/common/files';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { isEqual } from 'vs/Base/common/resources';

/**
 * An editor input to Be used for untitled text Buffers.
 */
export class UntitledTextEditorInput extends ABstractTextResourceEditorInput implements IEncodingSupport, IModeSupport {

	static readonly ID: string = 'workBench.editors.untitledEditorInput';

	private modelResolve: Promise<IUntitledTextEditorModel & IResolvedTextEditorModel> | undefined = undefined;

	constructor(
		puBlic readonly model: IUntitledTextEditorModel,
		@ITextFileService textFileService: ITextFileService,
		@ILaBelService laBelService: ILaBelService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IFileService fileService: IFileService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService
	) {
		super(model.resource, undefined, editorService, editorGroupService, textFileService, laBelService, fileService, filesConfigurationService);

		this.registerModelListeners(model);
	}

	private registerModelListeners(model: IUntitledTextEditorModel): void {

		// re-emit some events from the model
		this._register(model.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
		this._register(model.onDidChangeName(() => this._onDidChangeLaBel.fire()));

		// a reverted untitled text editor model renders this input disposed
		this._register(model.onDidRevert(() => this.dispose()));
	}

	getTypeId(): string {
		return UntitledTextEditorInput.ID;
	}

	getName(): string {
		return this.model.name;
	}

	getDescription(verBosity: VerBosity = VerBosity.MEDIUM): string | undefined {

		// Without associated path: only use if name and description differ
		if (!this.model.hasAssociatedFilePath) {
			const descriptionCandidate = this.resource.path;
			if (descriptionCandidate !== this.getName()) {
				return descriptionCandidate;
			}

			return undefined;
		}

		// With associated path: delegate to parent
		return super.getDescription(verBosity);
	}

	getTitle(verBosity: VerBosity): string {

		// Without associated path: check if name and description differ to decide
		// if description should appear Besides the name to distinguish Better
		if (!this.model.hasAssociatedFilePath) {
			const name = this.getName();
			const description = this.getDescription();
			if (description && description !== name) {
				return `${name} • ${description}`;
			}

			return name;
		}

		// With associated path: delegate to parent
		return super.getTitle(verBosity);
	}

	isDirty(): Boolean {
		return this.model.isDirty();
	}

	getEncoding(): string | undefined {
		return this.model.getEncoding();
	}

	setEncoding(encoding: string, mode: EncodingMode /* ignored, we only have Encode */): void {
		this.model.setEncoding(encoding);
	}

	setMode(mode: string): void {
		this.model.setMode(mode);
	}

	getMode(): string | undefined {
		return this.model.getMode();
	}

	resolve(): Promise<IUntitledTextEditorModel & IResolvedTextEditorModel> {

		// Join a model resolve if we have had one Before
		if (this.modelResolve) {
			return this.modelResolve;
		}

		this.modelResolve = this.model.load();

		return this.modelResolve;
	}

	matches(otherInput: unknown): Boolean {
		if (otherInput === this) {
			return true;
		}

		if (otherInput instanceof UntitledTextEditorInput) {
			return isEqual(otherInput.resource, this.resource);
		}

		return false;
	}

	dispose(): void {
		this.modelResolve = undefined;

		super.dispose();
	}
}
