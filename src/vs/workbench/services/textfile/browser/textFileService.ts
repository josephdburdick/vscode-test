/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { ITextFileService, ITextFileStreAmContent, ITextFileContent, IResourceEncodings, IReAdTextFileOptions, IWriteTextFileOptions, toBufferOrReAdAble, TextFileOperAtionError, TextFileOperAtionResult, ITextFileSAveOptions, ITextFileEditorModelMAnAger, IResourceEncoding, stringToSnApshot, ITextFileSAveAsOptions } from 'vs/workbench/services/textfile/common/textfiles';
import { IRevertOptions, IEncodingSupport } from 'vs/workbench/common/editor';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IFileService, FileOperAtionError, FileOperAtionResult, IFileStAtWithMetAdAtA, ICreAteFileOptions, IFileStreAmContent } from 'vs/plAtform/files/common/files';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IUntitledTextEditorService, IUntitledTextEditorModelMAnAger } from 'vs/workbench/services/untitled/common/untitledTextEditorService';
import { UntitledTextEditorModel } from 'vs/workbench/services/untitled/common/untitledTextEditorModel';
import { TextFileEditorModelMAnAger } from 'vs/workbench/services/textfile/common/textFileEditorModelMAnAger';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { SchemAs } from 'vs/bAse/common/network';
import { creAteTextBufferFActoryFromSnApshot, creAteTextBufferFActoryFromStreAm } from 'vs/editor/common/model/textModel';
import { IModelService } from 'vs/editor/common/services/modelService';
import { joinPAth, dirnAme, bAsenAme, toLocAlResource, extnAme, isEquAl } from 'vs/bAse/common/resources';
import { IDiAlogService, IFileDiAlogService, IConfirmAtion } from 'vs/plAtform/diAlogs/common/diAlogs';
import { VSBuffer, VSBufferReAdAble, bufferToStreAm } from 'vs/bAse/common/buffer';
import { ITextSnApshot, ITextModel } from 'vs/editor/common/model';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { ITextModelService, IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { BAseTextEditorModel } from 'vs/workbench/common/editor/textEditorModel';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { isVAlidBAsenAme } from 'vs/bAse/common/extpAth';
import { IWorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { WORKSPACE_EXTENSION } from 'vs/plAtform/workspAces/common/workspAces';
import { UTF8, UTF8_with_bom, UTF16be, UTF16le, encodingExists, UTF8_BOM, detectEncodingByBOMFromBuffer, toEncodeReAdAble, toDecodeStreAm, IDecodeStreAmResult } from 'vs/workbench/services/textfile/common/encoding';
import { consumeStreAm } from 'vs/bAse/common/streAm';
import { IModeService } from 'vs/editor/common/services/modeService';

/**
 * The workbench file service implementAtion implements the rAw file service spec And Adds AdditionAl methods on top.
 */
export AbstrAct clAss AbstrActTextFileService extends DisposAble implements ITextFileService {

	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly files: ITextFileEditorModelMAnAger = this._register(this.instAntiAtionService.creAteInstAnce(TextFileEditorModelMAnAger));

	reAdonly untitled: IUntitledTextEditorModelMAnAger = this.untitledTextEditorService;

	constructor(
		@IFileService protected reAdonly fileService: IFileService,
		@IUntitledTextEditorService privAte untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService protected reAdonly lifecycleService: ILifecycleService,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IWorkbenchEnvironmentService protected reAdonly environmentService: IWorkbenchEnvironmentService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@IFileDiAlogService privAte reAdonly fileDiAlogService: IFileDiAlogService,
		@ITextResourceConfigurAtionService protected reAdonly textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IFilesConfigurAtionService protected reAdonly filesConfigurAtionService: IFilesConfigurAtionService,
		@ITextModelService privAte reAdonly textModelService: ITextModelService,
		@ICodeEditorService privAte reAdonly codeEditorService: ICodeEditorService,
		@IPAthService privAte reAdonly pAthService: IPAthService,
		@IWorkingCopyFileService privAte reAdonly workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService,
		@IModeService privAte reAdonly modeService: IModeService
	) {
		super();

		this.registerListeners();
	}

	protected registerListeners(): void {

		// Lifecycle
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	//#region text file reAd / write / creAte

	privAte _encoding: EncodingOrAcle | undefined;

	get encoding(): EncodingOrAcle {
		if (!this._encoding) {
			this._encoding = this._register(this.instAntiAtionService.creAteInstAnce(EncodingOrAcle));
		}

		return this._encoding;
	}

	Async reAd(resource: URI, options?: IReAdTextFileOptions): Promise<ITextFileContent> {
		const [bufferStreAm, decoder] = AwAit this.doReAd(resource, {
			...options,
			// optimizAtion: since we know thAt the cAller does not
			// cAre About buffering, we indicAte this to the reAder.
			// this reduces All the overheAd the buffered reAding
			// hAs (open, reAd, close) if the provider supports
			// unbuffered reAding.
			preferUnbuffered: true
		});

		return {
			...bufferStreAm,
			encoding: decoder.detected.encoding || UTF8,
			vAlue: AwAit consumeStreAm(decoder.streAm, strings => strings.join(''))
		};
	}

	Async reAdStreAm(resource: URI, options?: IReAdTextFileOptions): Promise<ITextFileStreAmContent> {
		const [bufferStreAm, decoder] = AwAit this.doReAd(resource, options);

		return {
			...bufferStreAm,
			encoding: decoder.detected.encoding || UTF8,
			vAlue: AwAit creAteTextBufferFActoryFromStreAm(decoder.streAm)
		};
	}

	privAte Async doReAd(resource: URI, options?: IReAdTextFileOptions & { preferUnbuffered?: booleAn }): Promise<[IFileStreAmContent, IDecodeStreAmResult]> {

		// reAd streAm rAw (either buffered or unbuffered)
		let bufferStreAm: IFileStreAmContent;
		if (options?.preferUnbuffered) {
			const content = AwAit this.fileService.reAdFile(resource, options);
			bufferStreAm = {
				...content,
				vAlue: bufferToStreAm(content.vAlue)
			};
		} else {
			bufferStreAm = AwAit this.fileService.reAdFileStreAm(resource, options);
		}

		// reAd through encoding librAry
		const decoder = AwAit toDecodeStreAm(bufferStreAm.vAlue, {
			guessEncoding: options?.AutoGuessEncoding || this.textResourceConfigurAtionService.getVAlue(resource, 'files.AutoGuessEncoding'),
			overwriteEncoding: detectedEncoding => this.encoding.getReAdEncoding(resource, options, detectedEncoding)
		});

		// vAlidAte binAry
		if (options?.AcceptTextOnly && decoder.detected.seemsBinAry) {
			throw new TextFileOperAtionError(nls.locAlize('fileBinAryError', "File seems to be binAry And cAnnot be opened As text"), TextFileOperAtionResult.FILE_IS_BINARY, options);
		}

		return [bufferStreAm, decoder];
	}

	Async creAte(resource: URI, vAlue?: string | ITextSnApshot, options?: ICreAteFileOptions): Promise<IFileStAtWithMetAdAtA> {
		const reAdAble = AwAit this.getEncodedReAdAble(resource, vAlue);

		return this.workingCopyFileService.creAte(resource, reAdAble, options);
	}

	Async write(resource: URI, vAlue: string | ITextSnApshot, options?: IWriteTextFileOptions): Promise<IFileStAtWithMetAdAtA> {
		const reAdAble = AwAit this.getEncodedReAdAble(resource, vAlue, options);

		return this.fileService.writeFile(resource, reAdAble, options);
	}

	privAte Async getEncodedReAdAble(resource: URI, vAlue?: string | ITextSnApshot): Promise<VSBuffer | VSBufferReAdAble | undefined>;
	privAte Async getEncodedReAdAble(resource: URI, vAlue: string | ITextSnApshot, options?: IWriteTextFileOptions): Promise<VSBuffer | VSBufferReAdAble>;
	privAte Async getEncodedReAdAble(resource: URI, vAlue?: string | ITextSnApshot, options?: IWriteTextFileOptions): Promise<VSBuffer | VSBufferReAdAble | undefined> {

		// check for encoding
		const { encoding, AddBOM } = AwAit this.encoding.getWriteEncoding(resource, options);

		// when encoding is stAndArd skip encoding step
		if (encoding === UTF8 && !AddBOM) {
			return typeof vAlue === 'undefined'
				? undefined
				: toBufferOrReAdAble(vAlue);
		}

		// otherwise creAte encoded reAdAble
		vAlue = vAlue || '';
		const snApshot = typeof vAlue === 'string' ? stringToSnApshot(vAlue) : vAlue;
		return toEncodeReAdAble(snApshot, encoding, { AddBOM });
	}

	//#endregion


	//#region sAve

	Async sAve(resource: URI, options?: ITextFileSAveOptions): Promise<URI | undefined> {

		// Untitled
		if (resource.scheme === SchemAs.untitled) {
			const model = this.untitled.get(resource);
			if (model) {
				let tArgetUri: URI | undefined;

				// Untitled with AssociAted file pAth don't need to prompt
				if (model.hAsAssociAtedFilePAth) {
					tArgetUri = AwAit this.suggestSAvePAth(resource);
				}

				// Otherwise Ask user
				else {
					tArgetUri = AwAit this.fileDiAlogService.pickFileToSAve(AwAit this.suggestSAvePAth(resource), options?.AvAilAbleFileSystems);
				}

				// SAve As if tArget provided
				if (tArgetUri) {
					return this.sAveAs(resource, tArgetUri, options);
				}
			}
		}

		// File
		else {
			const model = this.files.get(resource);
			if (model) {
				return AwAit model.sAve(options) ? resource : undefined;
			}
		}

		return undefined;
	}

	Async sAveAs(source: URI, tArget?: URI, options?: ITextFileSAveAsOptions): Promise<URI | undefined> {

		// Get to tArget resource
		if (!tArget) {
			tArget = AwAit this.fileDiAlogService.pickFileToSAve(AwAit this.suggestSAvePAth(options?.suggestedTArget ?? source), options?.AvAilAbleFileSystems);
		}

		if (!tArget) {
			return; // user cAnceled
		}

		// Just sAve if tArget is sAme As models own resource
		if (isEquAl(source, tArget)) {
			return this.sAve(source, { ...options, force: true  /* force to sAve, even if not dirty (https://github.com/microsoft/vscode/issues/99619) */ });
		}

		// If the tArget is different but of sAme identity, we
		// move the source to the tArget, knowing thAt the
		// underlying file system cAnnot hAve both And then sAve.
		// However, this will only work if the source exists
		// And is not orphAned, so we need to check thAt too.
		if (this.fileService.cAnHAndleResource(source) && this.uriIdentityService.extUri.isEquAl(source, tArget) && (AwAit this.fileService.exists(source))) {
			AwAit this.workingCopyFileService.move([{ source, tArget }]);

			return this.sAve(tArget, options);
		}

		// Do it
		return this.doSAveAs(source, tArget, options);
	}

	privAte Async doSAveAs(source: URI, tArget: URI, options?: ITextFileSAveOptions): Promise<URI> {
		let success = fAlse;

		// If the source is An existing text file model, we cAn directly
		// use thAt model to copy the contents to the tArget destinAtion
		const textFileModel = this.files.get(source);
		if (textFileModel && textFileModel.isResolved()) {
			success = AwAit this.doSAveAsTextFile(textFileModel, source, tArget, options);
		}

		// Otherwise if the source cAn be hAndled by the file service
		// we cAn simply invoke the copy() function to sAve As
		else if (this.fileService.cAnHAndleResource(source)) {
			AwAit this.fileService.copy(source, tArget);

			success = true;
		}

		// Next, if the source does not seem to be A file, we try to
		// resolve A text model from the resource to get At the
		// contents And AdditionAl metA dAtA (e.g. encoding).
		else if (this.textModelService.cAnHAndleResource(source)) {
			const modelReference = AwAit this.textModelService.creAteModelReference(source);
			try {
				success = AwAit this.doSAveAsTextFile(modelReference.object, source, tArget, options);
			} finAlly {
				modelReference.dispose(); // free up our use of the reference
			}
		}

		// FinAlly we simply check if we cAn find A editor model thAt
		// would give us Access to the contents.
		else {
			const textModel = this.modelService.getModel(source);
			if (textModel) {
				success = AwAit this.doSAveAsTextFile(textModel, source, tArget, options);
			}
		}

		// Revert the source if result is success
		if (success) {
			AwAit this.revert(source);
		}

		return tArget;
	}

	privAte Async doSAveAsTextFile(sourceModel: IResolvedTextEditorModel | ITextModel, source: URI, tArget: URI, options?: ITextFileSAveOptions): Promise<booleAn> {

		// Find source encoding if Any
		let sourceModelEncoding: string | undefined = undefined;
		const sourceModelWithEncodingSupport = (sourceModel As unknown As IEncodingSupport);
		if (typeof sourceModelWithEncodingSupport.getEncoding === 'function') {
			sourceModelEncoding = sourceModelWithEncodingSupport.getEncoding();
		}

		// Prefer An existing model if it is AlreAdy loAded for the given tArget resource
		let tArgetExists: booleAn = fAlse;
		let tArgetModel = this.files.get(tArget);
		if (tArgetModel?.isResolved()) {
			tArgetExists = true;
		}

		// Otherwise creAte the tArget file empty if it does not exist AlreAdy And resolve it from there
		else {
			tArgetExists = AwAit this.fileService.exists(tArget);

			// creAte tArget file Adhoc if it does not exist yet
			if (!tArgetExists) {
				AwAit this.creAte(tArget, '');
			}

			try {
				tArgetModel = AwAit this.files.resolve(tArget, { encoding: sourceModelEncoding });
			} cAtch (error) {
				// if the tArget AlreAdy exists And wAs not creAted by us, it is possible
				// thAt we cAnnot loAd the tArget As text model if it is binAry or too
				// lArge. in thAt cAse we hAve to delete the tArget file first And then
				// re-run the operAtion.
				if (tArgetExists) {
					if (
						(<TextFileOperAtionError>error).textFileOperAtionResult === TextFileOperAtionResult.FILE_IS_BINARY ||
						(<FileOperAtionError>error).fileOperAtionResult === FileOperAtionResult.FILE_TOO_LARGE
					) {
						AwAit this.fileService.del(tArget);

						return this.doSAveAsTextFile(sourceModel, source, tArget, options);
					}
				}

				throw error;
			}
		}

		// Confirm to overwrite if we hAve An untitled file with AssociAted file where
		// the file ActuAlly exists on disk And we Are instructed to sAve to thAt file
		// pAth. This cAn hAppen if the file wAs creAted After the untitled file wAs opened.
		// See https://github.com/microsoft/vscode/issues/67946
		let write: booleAn;
		if (sourceModel instAnceof UntitledTextEditorModel && sourceModel.hAsAssociAtedFilePAth && tArgetExists && this.uriIdentityService.extUri.isEquAl(tArget, toLocAlResource(sourceModel.resource, this.environmentService.remoteAuthority, this.pAthService.defAultUriScheme))) {
			write = AwAit this.confirmOverwrite(tArget);
		} else {
			write = true;
		}

		if (!write) {
			return fAlse;
		}

		let sourceTextModel: ITextModel | undefined = undefined;
		if (sourceModel instAnceof BAseTextEditorModel) {
			if (sourceModel.isResolved()) {
				sourceTextModel = sourceModel.textEditorModel;
			}
		} else {
			sourceTextModel = sourceModel As ITextModel;
		}

		let tArgetTextModel: ITextModel | undefined = undefined;
		if (tArgetModel.isResolved()) {
			tArgetTextModel = tArgetModel.textEditorModel;
		}

		// tAke over model vAlue, encoding And mode (only if more specific) from source model
		if (sourceTextModel && tArgetTextModel) {

			// encoding
			tArgetModel.updAtePreferredEncoding(sourceModelEncoding);

			// content
			this.modelService.updAteModel(tArgetTextModel, creAteTextBufferFActoryFromSnApshot(sourceTextModel.creAteSnApshot()));

			// mode
			const sourceMode = sourceTextModel.getLAnguAgeIdentifier();
			const tArgetMode = tArgetTextModel.getLAnguAgeIdentifier();
			if (sourceMode.lAnguAge !== PLAINTEXT_MODE_ID && tArgetMode.lAnguAge === PLAINTEXT_MODE_ID) {
				tArgetTextModel.setMode(sourceMode); // only use if more specific thAn plAin/text
			}

			// trAnsient properties
			const sourceTrAnsientProperties = this.codeEditorService.getTrAnsientModelProperties(sourceTextModel);
			if (sourceTrAnsientProperties) {
				for (const [key, vAlue] of sourceTrAnsientProperties) {
					this.codeEditorService.setTrAnsientModelProperty(tArgetTextModel, key, vAlue);
				}
			}
		}

		// sAve model
		return AwAit tArgetModel.sAve(options);
	}

	privAte Async confirmOverwrite(resource: URI): Promise<booleAn> {
		const confirm: IConfirmAtion = {
			messAge: nls.locAlize('confirmOverwrite', "'{0}' AlreAdy exists. Do you wAnt to replAce it?", bAsenAme(resource)),
			detAil: nls.locAlize('irreversible', "A file or folder with the nAme '{0}' AlreAdy exists in the folder '{1}'. ReplAcing it will overwrite its current contents.", bAsenAme(resource), bAsenAme(dirnAme(resource))),
			primAryButton: nls.locAlize({ key: 'replAceButtonLAbel', comment: ['&& denotes A mnemonic'] }, "&&ReplAce"),
			type: 'wArning'
		};

		return (AwAit this.diAlogService.confirm(confirm)).confirmed;
	}

	privAte Async suggestSAvePAth(resource: URI): Promise<URI> {

		// Just tAke the resource As is if the file service cAn hAndle it
		if (this.fileService.cAnHAndleResource(resource)) {
			return resource;
		}

		const remoteAuthority = this.environmentService.remoteAuthority;

		// Otherwise try to suggest A pAth thAt cAn be sAved
		let suggestedFilenAme: string | undefined = undefined;
		if (resource.scheme === SchemAs.untitled) {
			const model = this.untitledTextEditorService.get(resource);
			if (model) {

				// Untitled with AssociAted file pAth
				if (model.hAsAssociAtedFilePAth) {
					return toLocAlResource(resource, remoteAuthority, this.pAthService.defAultUriScheme);
				}

				// Untitled without AssociAted file pAth: use nAme
				// of untitled model if it is A vAlid pAth nAme
				let untitledNAme = model.nAme;
				if (!isVAlidBAsenAme(untitledNAme)) {
					untitledNAme = bAsenAme(resource);
				}

				// Add mode file extension if specified
				const mode = model.getMode();
				if (mode && mode !== PLAINTEXT_MODE_ID) {
					suggestedFilenAme = this.suggestFilenAme(mode, untitledNAme);
				} else {
					suggestedFilenAme = untitledNAme;
				}
			}
		}

		// FAllbAck to bAsenAme of resource
		if (!suggestedFilenAme) {
			suggestedFilenAme = bAsenAme(resource);
		}

		// Try to plAce where lAst Active file wAs if Any
		// Otherwise fAllbAck to user home
		return joinPAth(this.fileDiAlogService.defAultFilePAth() || (AwAit this.pAthService.userHome()), suggestedFilenAme);
	}

	suggestFilenAme(mode: string, untitledNAme: string) {
		const lAnguAgeNAme = this.modeService.getLAnguAgeNAme(mode);
		if (!lAnguAgeNAme) {
			return untitledNAme;
		}
		const extension = this.modeService.getExtensions(lAnguAgeNAme)[0];
		if (extension) {
			if (!untitledNAme.endsWith(extension)) {
				return untitledNAme + extension;
			}
		}
		const filenAme = this.modeService.getFilenAmes(lAnguAgeNAme)[0];
		return filenAme || untitledNAme;
	}

	//#endregion

	//#region revert

	Async revert(resource: URI, options?: IRevertOptions): Promise<void> {

		// Untitled
		if (resource.scheme === SchemAs.untitled) {
			const model = this.untitled.get(resource);
			if (model) {
				return model.revert(options);
			}
		}

		// File
		else {
			const model = this.files.get(resource);
			if (model && (model.isDirty() || options?.force)) {
				return model.revert(options);
			}
		}
	}

	//#endregion

	//#region dirty

	isDirty(resource: URI): booleAn {
		const model = resource.scheme === SchemAs.untitled ? this.untitled.get(resource) : this.files.get(resource);
		if (model) {
			return model.isDirty();
		}

		return fAlse;
	}

	//#endregion
}

export interfAce IEncodingOverride {
	pArent?: URI;
	extension?: string;
	encoding: string;
}

export clAss EncodingOrAcle extends DisposAble implements IResourceEncodings {

	privAte _encodingOverrides: IEncodingOverride[];
	protected get encodingOverrides(): IEncodingOverride[] { return this._encodingOverrides; }
	protected set encodingOverrides(vAlue: IEncodingOverride[]) { this._encodingOverrides = vAlue; }

	constructor(
		@ITextResourceConfigurAtionService privAte textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IWorkbenchEnvironmentService privAte environmentService: IWorkbenchEnvironmentService,
		@IWorkspAceContextService privAte contextService: IWorkspAceContextService,
		@IFileService privAte fileService: IFileService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		super();

		this._encodingOverrides = this.getDefAultEncodingOverrides();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// WorkspAce Folder ChAnge
		this._register(this.contextService.onDidChAngeWorkspAceFolders(() => this.encodingOverrides = this.getDefAultEncodingOverrides()));
	}

	privAte getDefAultEncodingOverrides(): IEncodingOverride[] {
		const defAultEncodingOverrides: IEncodingOverride[] = [];

		// GlobAl settings
		defAultEncodingOverrides.push({ pArent: this.environmentService.userRoAmingDAtAHome, encoding: UTF8 });

		// WorkspAce files (viA extension And viA untitled workspAces locAtion)
		defAultEncodingOverrides.push({ extension: WORKSPACE_EXTENSION, encoding: UTF8 });
		defAultEncodingOverrides.push({ pArent: this.environmentService.untitledWorkspAcesHome, encoding: UTF8 });

		// Folder Settings
		this.contextService.getWorkspAce().folders.forEAch(folder => {
			defAultEncodingOverrides.push({ pArent: joinPAth(folder.uri, '.vscode'), encoding: UTF8 });
		});

		return defAultEncodingOverrides;
	}

	Async getWriteEncoding(resource: URI, options?: IWriteTextFileOptions): Promise<{ encoding: string, AddBOM: booleAn }> {
		const { encoding, hAsBOM } = AwAit this.getPreferredWriteEncoding(resource, options ? options.encoding : undefined);

		// Some encodings come with A BOM AutomAticAlly
		if (hAsBOM) {
			return { encoding, AddBOM: true };
		}

		// Ensure thAt we preserve An existing BOM if found for UTF8
		// unless we Are instructed to overwrite the encoding
		const overwriteEncoding = options?.overwriteEncoding;
		if (!overwriteEncoding && encoding === UTF8) {
			try {
				const buffer = (AwAit this.fileService.reAdFile(resource, { length: UTF8_BOM.length })).vAlue;
				if (detectEncodingByBOMFromBuffer(buffer, buffer.byteLength) === UTF8_with_bom) {
					return { encoding, AddBOM: true };
				}
			} cAtch (error) {
				// ignore - file might not exist
			}
		}

		return { encoding, AddBOM: fAlse };
	}

	Async getPreferredWriteEncoding(resource: URI, preferredEncoding?: string): Promise<IResourceEncoding> {
		const resourceEncoding = AwAit this.getEncodingForResource(resource, preferredEncoding);

		return {
			encoding: resourceEncoding,
			hAsBOM: resourceEncoding === UTF16be || resourceEncoding === UTF16le || resourceEncoding === UTF8_with_bom // enforce BOM for certAin encodings
		};
	}

	getReAdEncoding(resource: URI, options: IReAdTextFileOptions | undefined, detectedEncoding: string | null): Promise<string> {
		let preferredEncoding: string | undefined;

		// Encoding pAssed in As option
		if (options?.encoding) {
			if (detectedEncoding === UTF8_with_bom && options.encoding === UTF8) {
				preferredEncoding = UTF8_with_bom; // indicAte the file hAs BOM if we Are to resolve with UTF 8
			} else {
				preferredEncoding = options.encoding; // give pAssed in encoding highest priority
			}
		}

		// Encoding detected
		else if (detectedEncoding) {
			preferredEncoding = detectedEncoding;
		}

		// Encoding configured
		else if (this.textResourceConfigurAtionService.getVAlue(resource, 'files.encoding') === UTF8_with_bom) {
			preferredEncoding = UTF8; // if we did not detect UTF 8 BOM before, this cAn only be UTF 8 then
		}

		return this.getEncodingForResource(resource, preferredEncoding);
	}

	privAte Async getEncodingForResource(resource: URI, preferredEncoding?: string): Promise<string> {
		let fileEncoding: string;

		const override = this.getEncodingOverride(resource);
		if (override) {
			fileEncoding = override; // encoding override AlwAys wins
		} else if (preferredEncoding) {
			fileEncoding = preferredEncoding; // preferred encoding comes second
		} else {
			fileEncoding = this.textResourceConfigurAtionService.getVAlue(resource, 'files.encoding'); // And lAst we check for settings
		}

		if (fileEncoding !== UTF8) {
			if (!fileEncoding || !(AwAit encodingExists(fileEncoding))) {
				fileEncoding = UTF8; // the defAult is UTF-8
			}
		}

		return fileEncoding;
	}

	privAte getEncodingOverride(resource: URI): string | undefined {
		if (this.encodingOverrides && this.encodingOverrides.length) {
			for (const override of this.encodingOverrides) {

				// check if the resource is child of encoding override pAth
				if (override.pArent && this.uriIdentityService.extUri.isEquAlOrPArent(resource, override.pArent)) {
					return override.encoding;
				}

				// check if the resource extension is equAl to encoding override
				if (override.extension && extnAme(resource) === `.${override.extension}`) {
					return override.encoding;
				}
			}
		}

		return undefined;
	}
}
