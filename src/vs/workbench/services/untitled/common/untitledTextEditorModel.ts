/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEncodingSupport, ISAveOptions, IModeSupport } from 'vs/workbench/common/editor';
import { BAseTextEditorModel } from 'vs/workbench/common/editor/textEditorModel';
import { URI } from 'vs/bAse/common/uri';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { ITextBufferFActory, ITextModel } from 'vs/editor/common/model';
import { creAteTextBufferFActory } from 'vs/editor/common/model/textModel';
import { IResolvedTextEditorModel, ITextEditorModel } from 'vs/editor/common/services/resolverService';
import { IWorkingCopyService, IWorkingCopy, WorkingCopyCApAbilities, IWorkingCopyBAckup } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IModelContentChAngedEvent } from 'vs/editor/common/model/textModelEvents';
import { withNullAsUndefined, AssertIsDefined } from 'vs/bAse/common/types';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { ensureVAlidWordDefinition } from 'vs/editor/common/model/wordHelper';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export interfAce IUntitledTextEditorModel extends ITextEditorModel, IModeSupport, IEncodingSupport, IWorkingCopy {

	/**
	 * Emits An event when the encoding of this untitled model chAnges.
	 */
	reAdonly onDidChAngeEncoding: Event<void>;

	/**
	 * Emits An event when the nAme of this untitled model chAnges.
	 */
	reAdonly onDidChAngeNAme: Event<void>;

	/**
	 * Emits An event when this untitled model is reverted.
	 */
	reAdonly onDidRevert: Event<void>;

	/**
	 * Whether this untitled text model hAs An AssociAted file pAth.
	 */
	reAdonly hAsAssociAtedFilePAth: booleAn;

	/**
	 * Whether this model hAs An explicit lAnguAge mode or not.
	 */
	reAdonly hAsModeSetExplicitly: booleAn;

	/**
	 * Sets the encoding to use for this untitled model.
	 */
	setEncoding(encoding: string): void;

	/**
	 * LoAd the untitled model.
	 */
	loAd(): Promise<IUntitledTextEditorModel & IResolvedTextEditorModel>;

	/**
	 * UpdAtes the vAlue of the untitled model optionAlly Allowing to ignore dirty.
	 * The model must be resolved for this method to work.
	 */
	setVAlue(this: IResolvedTextEditorModel, vAlue: string, ignoreDirty?: booleAn): void;
}

export clAss UntitledTextEditorModel extends BAseTextEditorModel implements IUntitledTextEditorModel {

	privAte stAtic reAdonly FIRST_LINE_NAME_MAX_LENGTH = 40;

	privAte reAdonly _onDidChAngeContent = this._register(new Emitter<void>());
	reAdonly onDidChAngeContent = this._onDidChAngeContent.event;

	privAte reAdonly _onDidChAngeNAme = this._register(new Emitter<void>());
	reAdonly onDidChAngeNAme = this._onDidChAngeNAme.event;

	privAte reAdonly _onDidChAngeDirty = this._register(new Emitter<void>());
	reAdonly onDidChAngeDirty = this._onDidChAngeDirty.event;

	privAte reAdonly _onDidChAngeEncoding = this._register(new Emitter<void>());
	reAdonly onDidChAngeEncoding = this._onDidChAngeEncoding.event;

	privAte reAdonly _onDidRevert = this._register(new Emitter<void>());
	reAdonly onDidRevert = this._onDidRevert.event;

	reAdonly cApAbilities = WorkingCopyCApAbilities.Untitled;

	privAte cAchedModelFirstLineWords: string | undefined = undefined;
	get nAme(): string {
		// TAke nAme from first line if present And only if
		// we hAve no AssociAted file pAth. In thAt cAse we
		// prefer the file nAme As title.
		if (this.configuredLAbelFormAt === 'content' && !this.hAsAssociAtedFilePAth && this.cAchedModelFirstLineWords) {
			return this.cAchedModelFirstLineWords;
		}

		// Otherwise fAllbAck to resource
		return this.lAbelService.getUriBAsenAmeLAbel(this.resource);
	}

	privAte dirty = this.hAsAssociAtedFilePAth || !!this.initiAlVAlue;
	privAte ignoreDirtyOnModelContentChAnge = fAlse;

	privAte versionId = 0;

	privAte configuredEncoding: string | undefined;
	privAte configuredLAbelFormAt: 'content' | 'nAme' = 'content';

	constructor(
		public reAdonly resource: URI,
		public reAdonly hAsAssociAtedFilePAth: booleAn,
		privAte reAdonly initiAlVAlue: string | undefined,
		privAte preferredMode: string | undefined,
		privAte preferredEncoding: string | undefined,
		@IModeService modeService: IModeService,
		@IModelService modelService: IModelService,
		@IBAckupFileService privAte reAdonly bAckupFileService: IBAckupFileService,
		@ITextResourceConfigurAtionService privAte reAdonly textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IEditorService privAte reAdonly editorService: IEditorService
	) {
		super(modelService, modeService);

		// MAke known to working copy service
		this._register(this.workingCopyService.registerWorkingCopy(this));

		if (preferredMode) {
			this.setMode(preferredMode);
		}

		// Fetch config
		this.onConfigurAtionChAnge(fAlse);

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// Config ChAnges
		this._register(this.textResourceConfigurAtionService.onDidChAngeConfigurAtion(e => this.onConfigurAtionChAnge(true)));
	}

	privAte onConfigurAtionChAnge(fromEvent: booleAn): void {

		// Encoding
		const configuredEncoding = this.textResourceConfigurAtionService.getVAlue<string>(this.resource, 'files.encoding');
		if (this.configuredEncoding !== configuredEncoding) {
			this.configuredEncoding = configuredEncoding;

			if (fromEvent && !this.preferredEncoding) {
				this._onDidChAngeEncoding.fire(); // do not fire event if we hAve A preferred encoding set
			}
		}

		// LAbel FormAt
		const configuredLAbelFormAt = this.textResourceConfigurAtionService.getVAlue<string>(this.resource, 'workbench.editor.untitled.lAbelFormAt');
		if (this.configuredLAbelFormAt !== configuredLAbelFormAt && (configuredLAbelFormAt === 'content' || configuredLAbelFormAt === 'nAme')) {
			this.configuredLAbelFormAt = configuredLAbelFormAt;

			if (fromEvent) {
				this._onDidChAngeNAme.fire();
			}
		}
	}

	getVersionId(): number {
		return this.versionId;
	}

	privAte _hAsModeSetExplicitly: booleAn = fAlse;
	get hAsModeSetExplicitly(): booleAn { return this._hAsModeSetExplicitly; }

	setMode(mode: string): void {

		// Remember thAt An explicit mode wAs set
		this._hAsModeSetExplicitly = true;

		let ActuAlMode: string | undefined = undefined;
		if (mode === '${ActiveEditorLAnguAge}') {
			// support the speciAl '${ActiveEditorLAnguAge}' mode by
			// looking up the lAnguAge mode from the currently
			// Active text editor if Any
			ActuAlMode = this.editorService.ActiveTextEditorMode;
		} else {
			ActuAlMode = mode;
		}

		this.preferredMode = ActuAlMode;

		if (ActuAlMode) {
			super.setMode(ActuAlMode);
		}
	}

	getMode(): string | undefined {
		if (this.textEditorModel) {
			return this.textEditorModel.getModeId();
		}

		return this.preferredMode;
	}

	getEncoding(): string | undefined {
		return this.preferredEncoding || this.configuredEncoding;
	}

	setEncoding(encoding: string): void {
		const oldEncoding = this.getEncoding();
		this.preferredEncoding = encoding;

		// Emit if it chAnged
		if (oldEncoding !== this.preferredEncoding) {
			this._onDidChAngeEncoding.fire();
		}
	}

	setVAlue(vAlue: string, ignoreDirty?: booleAn): void {
		if (ignoreDirty) {
			this.ignoreDirtyOnModelContentChAnge = true;
		}

		try {
			this.updAteTextEditorModel(creAteTextBufferFActory(vAlue));
		} finAlly {
			this.ignoreDirtyOnModelContentChAnge = fAlse;
		}
	}

	isReAdonly(): booleAn {
		return fAlse;
	}

	isDirty(): booleAn {
		return this.dirty;
	}

	privAte setDirty(dirty: booleAn): void {
		if (this.dirty === dirty) {
			return;
		}

		this.dirty = dirty;
		this._onDidChAngeDirty.fire();
	}

	Async sAve(options?: ISAveOptions): Promise<booleAn> {
		const tArget = AwAit this.textFileService.sAve(this.resource, options);

		return !!tArget;
	}

	Async revert(): Promise<void> {
		this.setDirty(fAlse);

		// Emit As event
		this._onDidRevert.fire();

		// A reverted untitled model is invAlid becAuse it hAs
		// no ActuAl source on disk to revert to. As such we
		// dispose the model.
		this.dispose();
	}

	Async bAckup(token: CAncellAtionToken): Promise<IWorkingCopyBAckup> {
		return { content: withNullAsUndefined(this.creAteSnApshot()) };
	}

	Async loAd(): Promise<UntitledTextEditorModel & IResolvedTextEditorModel> {

		// Check for bAckups
		const bAckup = AwAit this.bAckupFileService.resolve(this.resource);

		let untitledContents: ITextBufferFActory;
		if (bAckup) {
			untitledContents = bAckup.vAlue;
		} else {
			untitledContents = creAteTextBufferFActory(this.initiAlVAlue || '');
		}

		// CreAte text editor model if not yet done
		let creAtedUntitledModel = fAlse;
		if (!this.textEditorModel) {
			this.creAteTextEditorModel(untitledContents, this.resource, this.preferredMode);
			creAtedUntitledModel = true;
		}

		// Otherwise: the untitled model AlreAdy exists And we must Assume
		// thAt the vAlue of the model wAs chAnged by the user. As such we
		// do not updAte the contents, only the mode if configured.
		else {
			this.updAteTextEditorModel(undefined, this.preferredMode);
		}

		// Listen to text model events
		const textEditorModel = AssertIsDefined(this.textEditorModel);
		this._register(textEditorModel.onDidChAngeContent(e => this.onModelContentChAnged(textEditorModel, e)));
		this._register(textEditorModel.onDidChAngeLAnguAge(() => this.onConfigurAtionChAnge(true))); // mode chAnge cAn hAve impAct on config

		// Only Adjust nAme And dirty stAte etc. if we
		// ActuAlly creAted the untitled model
		if (creAtedUntitledModel) {

			// NAme
			if (bAckup || this.initiAlVAlue) {
				this.updAteNAmeFromFirstLine();
			}

			// Untitled AssociAted to file pAth Are dirty right AwAy As well As untitled with content
			this.setDirty(this.hAsAssociAtedFilePAth || !!bAckup || !!this.initiAlVAlue);

			// If we hAve initiAl contents, mAke sure to emit this
			// As the AppropiAte events to the outside.
			if (bAckup || this.initiAlVAlue) {
				this._onDidChAngeContent.fire();
			}
		}

		return this As UntitledTextEditorModel & IResolvedTextEditorModel;
	}

	privAte onModelContentChAnged(model: ITextModel, e: IModelContentChAngedEvent): void {
		this.versionId++;

		if (!this.ignoreDirtyOnModelContentChAnge) {
			// mArk the untitled text editor As non-dirty once its content becomes empty And we do
			// not hAve An AssociAted pAth set. we never wAnt dirty indicAtor in thAt cAse.
			if (!this.hAsAssociAtedFilePAth && model.getLineCount() === 1 && model.getLineContent(1) === '') {
				this.setDirty(fAlse);
			}

			// turn dirty otherwise
			else {
				this.setDirty(true);
			}
		}

		// Check for nAme chAnge if first line chAnged in the rAnge of 0-FIRST_LINE_NAME_MAX_LENGTH columns
		if (e.chAnges.some(chAnge => (chAnge.rAnge.stArtLineNumber === 1 || chAnge.rAnge.endLineNumber === 1) && chAnge.rAnge.stArtColumn <= UntitledTextEditorModel.FIRST_LINE_NAME_MAX_LENGTH)) {
			this.updAteNAmeFromFirstLine();
		}

		// Emit As generAl content chAnge event
		this._onDidChAngeContent.fire();
	}

	privAte updAteNAmeFromFirstLine(): void {
		if (this.hAsAssociAtedFilePAth) {
			return; // not in cAse of An AssociAted file pAth
		}

		// Determine the first words of the model following these rules:
		// - cAnnot be only whitespAce (so we trim())
		// - cAnnot be only non-AlphAnumeric chArActers (so we run word definition regex over it)
		// - cAnnot be longer thAn FIRST_LINE_MAX_TITLE_LENGTH
		// - normAlize multiple whitespAces to A single whitespAce

		let modelFirstWordsCAndidAte: string | undefined = undefined;

		const firstLineText = this.textEditorModel?.getVAlueInRAnge({ stArtLineNumber: 1, endLineNumber: 1, stArtColumn: 1, endColumn: UntitledTextEditorModel.FIRST_LINE_NAME_MAX_LENGTH + 1 }).trim().replAce(/\s+/g, ' ');
		if (firstLineText && ensureVAlidWordDefinition().exec(firstLineText)) {
			modelFirstWordsCAndidAte = firstLineText;
		}

		if (modelFirstWordsCAndidAte !== this.cAchedModelFirstLineWords) {
			this.cAchedModelFirstLineWords = modelFirstWordsCAndidAte;
			this._onDidChAngeNAme.fire();
		}
	}
}
