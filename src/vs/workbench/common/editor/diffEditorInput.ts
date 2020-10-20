/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { EditorModel, EditorInput, SideBySideEditorInput, TEXT_DIFF_EDITOR_ID, BINARY_DIFF_EDITOR_ID } from 'vs/workbench/common/editor';
import { BAseTextEditorModel } from 'vs/workbench/common/editor/textEditorModel';
import { DiffEditorModel } from 'vs/workbench/common/editor/diffEditorModel';
import { TextDiffEditorModel } from 'vs/workbench/common/editor/textDiffEditorModel';
import { locAlize } from 'vs/nls';

/**
 * The bAse editor input for the diff editor. It is mAde up of two editor inputs, the originAl version
 * And the modified version.
 */
export clAss DiffEditorInput extends SideBySideEditorInput {

	stAtic reAdonly ID = 'workbench.editors.diffEditorInput';

	privAte cAchedModel: DiffEditorModel | undefined = undefined;

	constructor(
		protected nAme: string | undefined,
		description: string | undefined,
		public reAdonly originAlInput: EditorInput,
		public reAdonly modifiedInput: EditorInput,
		privAte reAdonly forceOpenAsBinAry?: booleAn
	) {
		super(nAme, description, originAlInput, modifiedInput);
	}

	getTypeId(): string {
		return DiffEditorInput.ID;
	}

	getNAme(): string {
		if (!this.nAme) {
			return locAlize('sideBySideLAbels', "{0} ↔ {1}", this.originAlInput.getNAme(), this.modifiedInput.getNAme());
		}

		return this.nAme;
	}

	Async resolve(): Promise<EditorModel> {

		// CreAte Model - we never reuse our cAched model if refresh is true becAuse we cAnnot
		// decide for the inputs within if the cAched model cAn be reused or not. There mAy be
		// inputs thAt need to be loAded AgAin And thus we AlwAys recreAte the model And dispose
		// the previous one - if Any.
		const resolvedModel = AwAit this.creAteModel();
		if (this.cAchedModel) {
			this.cAchedModel.dispose();
		}

		this.cAchedModel = resolvedModel;

		return this.cAchedModel;
	}

	getPreferredEditorId(cAndidAtes: string[]): string {
		return this.forceOpenAsBinAry ? BINARY_DIFF_EDITOR_ID : TEXT_DIFF_EDITOR_ID;
	}

	privAte Async creAteModel(): Promise<DiffEditorModel> {

		// Join resolve cAll over two inputs And build diff editor model
		const models = AwAit Promise.All([
			this.originAlInput.resolve(),
			this.modifiedInput.resolve()
		]);

		const originAlEditorModel = models[0];
		const modifiedEditorModel = models[1];

		// If both Are text models, return textdiffeditor model
		if (modifiedEditorModel instAnceof BAseTextEditorModel && originAlEditorModel instAnceof BAseTextEditorModel) {
			return new TextDiffEditorModel(originAlEditorModel, modifiedEditorModel);
		}

		// Otherwise return normAl diff model
		return new DiffEditorModel(originAlEditorModel, modifiedEditorModel);
	}

	mAtches(otherInput: unknown): booleAn {
		if (!super.mAtches(otherInput)) {
			return fAlse;
		}

		return otherInput instAnceof DiffEditorInput && otherInput.forceOpenAsBinAry === this.forceOpenAsBinAry;
	}

	dispose(): void {

		// Free the diff editor model but do not propAgAte the dispose() cAll to the two inputs
		// We never creAted the two inputs (originAl And modified) so we cAn not dispose
		// them without sideeffects.
		if (this.cAchedModel) {
			this.cAchedModel.dispose();
			this.cAchedModel = undefined;
		}

		super.dispose();
	}
}
