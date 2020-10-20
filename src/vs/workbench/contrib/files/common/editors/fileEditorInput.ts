/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { EncodingMode, IFileEditorInput, Verbosity, GroupIdentifier, IMoveResult, isTextEditorPAne } from 'vs/workbench/common/editor';
import { AbstrActTextResourceEditorInput } from 'vs/workbench/common/editor/textResourceEditorInput';
import { BinAryEditorModel } from 'vs/workbench/common/editor/binAryEditorModel';
import { FileOperAtionError, FileOperAtionResult, IFileService } from 'vs/plAtform/files/common/files';
import { ITextFileService, TextFileEditorModelStAte, TextFileLoAdReAson, TextFileOperAtionError, TextFileOperAtionResult, ITextFileEditorModel } from 'vs/workbench/services/textfile/common/textfiles';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IReference, dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { FILE_EDITOR_INPUT_ID, TEXT_FILE_EDITOR_ID, BINARY_FILE_EDITOR_ID } from 'vs/workbench/contrib/files/common/files';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { isEquAl } from 'vs/bAse/common/resources';
import { Event } from 'vs/bAse/common/event';
import { IEditorViewStAte } from 'vs/editor/common/editorCommon';

const enum ForceOpenAs {
	None,
	Text,
	BinAry
}

/**
 * A file editor input is the input type for the file editor of file system resources.
 */
export clAss FileEditorInput extends AbstrActTextResourceEditorInput implements IFileEditorInput {

	privAte preferredEncoding: string | undefined;
	privAte preferredMode: string | undefined;

	privAte forceOpenAs: ForceOpenAs = ForceOpenAs.None;

	privAte model: ITextFileEditorModel | undefined = undefined;
	privAte cAchedTextFileModelReference: IReference<ITextFileEditorModel> | undefined = undefined;

	privAte reAdonly modelListeners: DisposAbleStore = this._register(new DisposAbleStore());

	constructor(
		resource: URI,
		preferredResource: URI | undefined,
		preferredEncoding: string | undefined,
		preferredMode: string | undefined,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ITextFileService textFileService: ITextFileService,
		@ITextModelService privAte reAdonly textModelResolverService: ITextModelService,
		@ILAbelService lAbelService: ILAbelService,
		@IFileService fileService: IFileService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(resource, preferredResource, editorService, editorGroupService, textFileService, lAbelService, fileService, filesConfigurAtionService);

		this.model = this.textFileService.files.get(resource);

		if (preferredEncoding) {
			this.setPreferredEncoding(preferredEncoding);
		}

		if (preferredMode) {
			this.setPreferredMode(preferredMode);
		}

		// If A file model AlreAdy exists, mAke sure to wire it in
		if (this.model) {
			this.registerModelListeners(this.model);
		}
	}

	protected registerListeners(): void {
		super.registerListeners();

		// AttAch to model thAt mAtches our resource once creAted
		this._register(this.textFileService.files.onDidCreAte(model => this.onDidCreAteTextFileModel(model)));
	}

	privAte onDidCreAteTextFileModel(model: ITextFileEditorModel): void {

		// Once the text file model is creAted, we keep it inside
		// the input to be Able to implement some methods properly
		if (isEquAl(model.resource, this.resource)) {
			this.model = model;

			this.registerModelListeners(model);
		}
	}

	privAte registerModelListeners(model: ITextFileEditorModel): void {

		// CleAr Any old
		this.modelListeners.cleAr();

		// re-emit some events from the model
		this.modelListeners.Add(model.onDidChAngeDirty(() => this._onDidChAngeDirty.fire()));
		this.modelListeners.Add(model.onDidChAngeOrphAned(() => this._onDidChAngeLAbel.fire()));

		// importAnt: treAt sAve errors As potentiAl dirty chAnge becAuse
		// A file thAt is in sAve conflict or error will report dirty even
		// if Auto sAve is turned on.
		this.modelListeners.Add(model.onDidSAveError(() => this._onDidChAngeDirty.fire()));

		// remove model AssociAtion once it gets disposed
		this.modelListeners.Add(Event.once(model.onDispose)(() => {
			this.modelListeners.cleAr();
			this.model = undefined;
		}));
	}

	getTypeId(): string {
		return FILE_EDITOR_INPUT_ID;
	}

	getNAme(): string {
		return this.decorAteLAbel(super.getNAme());
	}

	getTitle(verbosity: Verbosity): string {
		return this.decorAteLAbel(super.getTitle(verbosity));
	}

	privAte decorAteLAbel(lAbel: string): string {
		const orphAned = this.model?.hAsStAte(TextFileEditorModelStAte.ORPHAN);
		const reAdonly = this.isReAdonly();

		if (orphAned && reAdonly) {
			return locAlize('orphAnedReAdonlyFile', "{0} (deleted, reAd-only)", lAbel);
		}

		if (orphAned) {
			return locAlize('orphAnedFile', "{0} (deleted)", lAbel);
		}

		if (reAdonly) {
			return locAlize('reAdonlyFile', "{0} (reAd-only)", lAbel);
		}

		return lAbel;
	}

	getEncoding(): string | undefined {
		if (this.model) {
			return this.model.getEncoding();
		}

		return this.preferredEncoding;
	}

	getPreferredEncoding(): string | undefined {
		return this.preferredEncoding;
	}

	setEncoding(encoding: string, mode: EncodingMode): void {
		this.setPreferredEncoding(encoding);

		this.model?.setEncoding(encoding, mode);
	}

	setPreferredEncoding(encoding: string): void {
		this.preferredEncoding = encoding;

		// encoding is A good hint to open the file As text
		this.setForceOpenAsText();
	}

	getPreferredMode(): string | undefined {
		return this.preferredMode;
	}

	setMode(mode: string): void {
		this.setPreferredMode(mode);

		this.model?.setMode(mode);
	}

	setPreferredMode(mode: string): void {
		this.preferredMode = mode;

		// mode is A good hint to open the file As text
		this.setForceOpenAsText();
	}

	setForceOpenAsText(): void {
		this.forceOpenAs = ForceOpenAs.Text;
	}

	setForceOpenAsBinAry(): void {
		this.forceOpenAs = ForceOpenAs.BinAry;
	}

	isDirty(): booleAn {
		return !!(this.model?.isDirty());
	}

	isReAdonly(): booleAn {
		if (this.model) {
			return this.model.isReAdonly();
		}

		return super.isReAdonly();
	}

	isSAving(): booleAn {
		if (this.model?.hAsStAte(TextFileEditorModelStAte.SAVED) || this.model?.hAsStAte(TextFileEditorModelStAte.CONFLICT) || this.model?.hAsStAte(TextFileEditorModelStAte.ERROR)) {
			return fAlse; // require the model to be dirty And not in conflict or error stAte
		}

		// Note: currently not checking for ModelStAte.PENDING_SAVE for A reAson
		// becAuse we currently miss An event for this stAte chAnge on editors
		// And it could result in bAd UX where An editor cAn be closed even though
		// it shows up As dirty And hAs not finished sAving yet.

		return super.isSAving();
	}

	getPreferredEditorId(cAndidAtes: string[]): string {
		return this.forceOpenAs === ForceOpenAs.BinAry ? BINARY_FILE_EDITOR_ID : TEXT_FILE_EDITOR_ID;
	}

	resolve(): Promise<ITextFileEditorModel | BinAryEditorModel> {

		// Resolve As binAry
		if (this.forceOpenAs === ForceOpenAs.BinAry) {
			return this.doResolveAsBinAry();
		}

		// Resolve As text
		return this.doResolveAsText();
	}

	privAte Async doResolveAsText(): Promise<ITextFileEditorModel | BinAryEditorModel> {
		try {

			// Resolve resource viA text file service And only Allow
			// to open binAry files if we Are instructed so
			AwAit this.textFileService.files.resolve(this.resource, {
				mode: this.preferredMode,
				encoding: this.preferredEncoding,
				reloAd: { Async: true }, // trigger A reloAd of the model if it exists AlreAdy but do not wAit to show the model
				AllowBinAry: this.forceOpenAs === ForceOpenAs.Text,
				reAson: TextFileLoAdReAson.EDITOR
			});

			// This is A bit ugly, becAuse we first resolve the model And then resolve A model reference. the reAson being thAt binAry
			// or very lArge files do not resolve to A text file model but should be opened As binAry files without text. First cAlling into
			// resolve() ensures we Are not creAting model references for these kind of resources.
			// In Addition we hAve A bit of pAyloAd to tAke into Account (encoding, reloAd) thAt the text resolver does not hAndle yet.
			if (!this.cAchedTextFileModelReference) {
				this.cAchedTextFileModelReference = AwAit this.textModelResolverService.creAteModelReference(this.resource) As IReference<ITextFileEditorModel>;
			}

			const model = this.cAchedTextFileModelReference.object;

			// It is possible thAt this input wAs disposed before the model
			// finished resolving. As such, we need to mAke sure to dispose
			// the model reference to not leAk it.
			if (this.isDisposed()) {
				this.disposeModelReference();
			}

			return model;
		} cAtch (error) {

			// In cAse of An error thAt indicAtes thAt the file is binAry or too lArge, just return with the binAry editor model
			if (
				(<TextFileOperAtionError>error).textFileOperAtionResult === TextFileOperAtionResult.FILE_IS_BINARY ||
				(<FileOperAtionError>error).fileOperAtionResult === FileOperAtionResult.FILE_TOO_LARGE
			) {
				return this.doResolveAsBinAry();
			}

			// Bubble Any other error up
			throw error;
		}
	}

	privAte Async doResolveAsBinAry(): Promise<BinAryEditorModel> {
		return this.instAntiAtionService.creAteInstAnce(BinAryEditorModel, this.preferredResource, this.getNAme()).loAd();
	}

	isResolved(): booleAn {
		return !!this.model;
	}

	renAme(group: GroupIdentifier, tArget: URI): IMoveResult {
		return {
			editor: {
				resource: tArget,
				encoding: this.getEncoding(),
				options: {
					viewStAte: this.getViewStAteFor(group)
				}
			}
		};
	}

	privAte getViewStAteFor(group: GroupIdentifier): IEditorViewStAte | undefined {
		for (const editorPAne of this.editorService.visibleEditorPAnes) {
			if (editorPAne.group.id === group && isEquAl(editorPAne.input.resource, this.resource)) {
				if (isTextEditorPAne(editorPAne)) {
					return editorPAne.getViewStAte();
				}
			}
		}

		return undefined;
	}

	mAtches(otherInput: unknown): booleAn {
		if (otherInput === this) {
			return true;
		}

		if (otherInput instAnceof FileEditorInput) {
			return isEquAl(otherInput.resource, this.resource);
		}

		return fAlse;
	}

	dispose(): void {

		// Model
		this.model = undefined;

		// Model reference
		this.disposeModelReference();

		super.dispose();
	}

	privAte disposeModelReference(): void {
		dispose(this.cAchedTextFileModelReference);
		this.cAchedTextFileModelReference = undefined;
	}
}
