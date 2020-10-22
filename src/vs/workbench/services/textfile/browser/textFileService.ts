/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import { ITextFileService, ITextFileStreamContent, ITextFileContent, IResourceEncodings, IReadTextFileOptions, IWriteTextFileOptions, toBufferOrReadaBle, TextFileOperationError, TextFileOperationResult, ITextFileSaveOptions, ITextFileEditorModelManager, IResourceEncoding, stringToSnapshot, ITextFileSaveAsOptions } from 'vs/workBench/services/textfile/common/textfiles';
import { IRevertOptions, IEncodingSupport } from 'vs/workBench/common/editor';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IFileService, FileOperationError, FileOperationResult, IFileStatWithMetadata, ICreateFileOptions, IFileStreamContent } from 'vs/platform/files/common/files';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IUntitledTextEditorService, IUntitledTextEditorModelManager } from 'vs/workBench/services/untitled/common/untitledTextEditorService';
import { UntitledTextEditorModel } from 'vs/workBench/services/untitled/common/untitledTextEditorModel';
import { TextFileEditorModelManager } from 'vs/workBench/services/textfile/common/textFileEditorModelManager';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { Schemas } from 'vs/Base/common/network';
import { createTextBufferFactoryFromSnapshot, createTextBufferFactoryFromStream } from 'vs/editor/common/model/textModel';
import { IModelService } from 'vs/editor/common/services/modelService';
import { joinPath, dirname, Basename, toLocalResource, extname, isEqual } from 'vs/Base/common/resources';
import { IDialogService, IFileDialogService, IConfirmation } from 'vs/platform/dialogs/common/dialogs';
import { VSBuffer, VSBufferReadaBle, BufferToStream } from 'vs/Base/common/Buffer';
import { ITextSnapshot, ITextModel } from 'vs/editor/common/model';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { ITextModelService, IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { BaseTextEditorModel } from 'vs/workBench/common/editor/textEditorModel';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { isValidBasename } from 'vs/Base/common/extpath';
import { IWorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { WORKSPACE_EXTENSION } from 'vs/platform/workspaces/common/workspaces';
import { UTF8, UTF8_with_Bom, UTF16Be, UTF16le, encodingExists, UTF8_BOM, detectEncodingByBOMFromBuffer, toEncodeReadaBle, toDecodeStream, IDecodeStreamResult } from 'vs/workBench/services/textfile/common/encoding';
import { consumeStream } from 'vs/Base/common/stream';
import { IModeService } from 'vs/editor/common/services/modeService';

/**
 * The workBench file service implementation implements the raw file service spec and adds additional methods on top.
 */
export aBstract class ABstractTextFileService extends DisposaBle implements ITextFileService {

	declare readonly _serviceBrand: undefined;

	readonly files: ITextFileEditorModelManager = this._register(this.instantiationService.createInstance(TextFileEditorModelManager));

	readonly untitled: IUntitledTextEditorModelManager = this.untitledTextEditorService;

	constructor(
		@IFileService protected readonly fileService: IFileService,
		@IUntitledTextEditorService private untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService protected readonly lifecycleService: ILifecycleService,
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@IModelService private readonly modelService: IModelService,
		@IWorkBenchEnvironmentService protected readonly environmentService: IWorkBenchEnvironmentService,
		@IDialogService private readonly dialogService: IDialogService,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@ITextResourceConfigurationService protected readonly textResourceConfigurationService: ITextResourceConfigurationService,
		@IFilesConfigurationService protected readonly filesConfigurationService: IFilesConfigurationService,
		@ITextModelService private readonly textModelService: ITextModelService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@IPathService private readonly pathService: IPathService,
		@IWorkingCopyFileService private readonly workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService,
		@IModeService private readonly modeService: IModeService
	) {
		super();

		this.registerListeners();
	}

	protected registerListeners(): void {

		// Lifecycle
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	//#region text file read / write / create

	private _encoding: EncodingOracle | undefined;

	get encoding(): EncodingOracle {
		if (!this._encoding) {
			this._encoding = this._register(this.instantiationService.createInstance(EncodingOracle));
		}

		return this._encoding;
	}

	async read(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileContent> {
		const [BufferStream, decoder] = await this.doRead(resource, {
			...options,
			// optimization: since we know that the caller does not
			// care aBout Buffering, we indicate this to the reader.
			// this reduces all the overhead the Buffered reading
			// has (open, read, close) if the provider supports
			// unBuffered reading.
			preferUnBuffered: true
		});

		return {
			...BufferStream,
			encoding: decoder.detected.encoding || UTF8,
			value: await consumeStream(decoder.stream, strings => strings.join(''))
		};
	}

	async readStream(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileStreamContent> {
		const [BufferStream, decoder] = await this.doRead(resource, options);

		return {
			...BufferStream,
			encoding: decoder.detected.encoding || UTF8,
			value: await createTextBufferFactoryFromStream(decoder.stream)
		};
	}

	private async doRead(resource: URI, options?: IReadTextFileOptions & { preferUnBuffered?: Boolean }): Promise<[IFileStreamContent, IDecodeStreamResult]> {

		// read stream raw (either Buffered or unBuffered)
		let BufferStream: IFileStreamContent;
		if (options?.preferUnBuffered) {
			const content = await this.fileService.readFile(resource, options);
			BufferStream = {
				...content,
				value: BufferToStream(content.value)
			};
		} else {
			BufferStream = await this.fileService.readFileStream(resource, options);
		}

		// read through encoding liBrary
		const decoder = await toDecodeStream(BufferStream.value, {
			guessEncoding: options?.autoGuessEncoding || this.textResourceConfigurationService.getValue(resource, 'files.autoGuessEncoding'),
			overwriteEncoding: detectedEncoding => this.encoding.getReadEncoding(resource, options, detectedEncoding)
		});

		// validate Binary
		if (options?.acceptTextOnly && decoder.detected.seemsBinary) {
			throw new TextFileOperationError(nls.localize('fileBinaryError', "File seems to Be Binary and cannot Be opened as text"), TextFileOperationResult.FILE_IS_BINARY, options);
		}

		return [BufferStream, decoder];
	}

	async create(resource: URI, value?: string | ITextSnapshot, options?: ICreateFileOptions): Promise<IFileStatWithMetadata> {
		const readaBle = await this.getEncodedReadaBle(resource, value);

		return this.workingCopyFileService.create(resource, readaBle, options);
	}

	async write(resource: URI, value: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<IFileStatWithMetadata> {
		const readaBle = await this.getEncodedReadaBle(resource, value, options);

		return this.fileService.writeFile(resource, readaBle, options);
	}

	private async getEncodedReadaBle(resource: URI, value?: string | ITextSnapshot): Promise<VSBuffer | VSBufferReadaBle | undefined>;
	private async getEncodedReadaBle(resource: URI, value: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<VSBuffer | VSBufferReadaBle>;
	private async getEncodedReadaBle(resource: URI, value?: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<VSBuffer | VSBufferReadaBle | undefined> {

		// check for encoding
		const { encoding, addBOM } = await this.encoding.getWriteEncoding(resource, options);

		// when encoding is standard skip encoding step
		if (encoding === UTF8 && !addBOM) {
			return typeof value === 'undefined'
				? undefined
				: toBufferOrReadaBle(value);
		}

		// otherwise create encoded readaBle
		value = value || '';
		const snapshot = typeof value === 'string' ? stringToSnapshot(value) : value;
		return toEncodeReadaBle(snapshot, encoding, { addBOM });
	}

	//#endregion


	//#region save

	async save(resource: URI, options?: ITextFileSaveOptions): Promise<URI | undefined> {

		// Untitled
		if (resource.scheme === Schemas.untitled) {
			const model = this.untitled.get(resource);
			if (model) {
				let targetUri: URI | undefined;

				// Untitled with associated file path don't need to prompt
				if (model.hasAssociatedFilePath) {
					targetUri = await this.suggestSavePath(resource);
				}

				// Otherwise ask user
				else {
					targetUri = await this.fileDialogService.pickFileToSave(await this.suggestSavePath(resource), options?.availaBleFileSystems);
				}

				// Save as if target provided
				if (targetUri) {
					return this.saveAs(resource, targetUri, options);
				}
			}
		}

		// File
		else {
			const model = this.files.get(resource);
			if (model) {
				return await model.save(options) ? resource : undefined;
			}
		}

		return undefined;
	}

	async saveAs(source: URI, target?: URI, options?: ITextFileSaveAsOptions): Promise<URI | undefined> {

		// Get to target resource
		if (!target) {
			target = await this.fileDialogService.pickFileToSave(await this.suggestSavePath(options?.suggestedTarget ?? source), options?.availaBleFileSystems);
		}

		if (!target) {
			return; // user canceled
		}

		// Just save if target is same as models own resource
		if (isEqual(source, target)) {
			return this.save(source, { ...options, force: true  /* force to save, even if not dirty (https://githuB.com/microsoft/vscode/issues/99619) */ });
		}

		// If the target is different But of same identity, we
		// move the source to the target, knowing that the
		// underlying file system cannot have Both and then save.
		// However, this will only work if the source exists
		// and is not orphaned, so we need to check that too.
		if (this.fileService.canHandleResource(source) && this.uriIdentityService.extUri.isEqual(source, target) && (await this.fileService.exists(source))) {
			await this.workingCopyFileService.move([{ source, target }]);

			return this.save(target, options);
		}

		// Do it
		return this.doSaveAs(source, target, options);
	}

	private async doSaveAs(source: URI, target: URI, options?: ITextFileSaveOptions): Promise<URI> {
		let success = false;

		// If the source is an existing text file model, we can directly
		// use that model to copy the contents to the target destination
		const textFileModel = this.files.get(source);
		if (textFileModel && textFileModel.isResolved()) {
			success = await this.doSaveAsTextFile(textFileModel, source, target, options);
		}

		// Otherwise if the source can Be handled By the file service
		// we can simply invoke the copy() function to save as
		else if (this.fileService.canHandleResource(source)) {
			await this.fileService.copy(source, target);

			success = true;
		}

		// Next, if the source does not seem to Be a file, we try to
		// resolve a text model from the resource to get at the
		// contents and additional meta data (e.g. encoding).
		else if (this.textModelService.canHandleResource(source)) {
			const modelReference = await this.textModelService.createModelReference(source);
			try {
				success = await this.doSaveAsTextFile(modelReference.oBject, source, target, options);
			} finally {
				modelReference.dispose(); // free up our use of the reference
			}
		}

		// Finally we simply check if we can find a editor model that
		// would give us access to the contents.
		else {
			const textModel = this.modelService.getModel(source);
			if (textModel) {
				success = await this.doSaveAsTextFile(textModel, source, target, options);
			}
		}

		// Revert the source if result is success
		if (success) {
			await this.revert(source);
		}

		return target;
	}

	private async doSaveAsTextFile(sourceModel: IResolvedTextEditorModel | ITextModel, source: URI, target: URI, options?: ITextFileSaveOptions): Promise<Boolean> {

		// Find source encoding if any
		let sourceModelEncoding: string | undefined = undefined;
		const sourceModelWithEncodingSupport = (sourceModel as unknown as IEncodingSupport);
		if (typeof sourceModelWithEncodingSupport.getEncoding === 'function') {
			sourceModelEncoding = sourceModelWithEncodingSupport.getEncoding();
		}

		// Prefer an existing model if it is already loaded for the given target resource
		let targetExists: Boolean = false;
		let targetModel = this.files.get(target);
		if (targetModel?.isResolved()) {
			targetExists = true;
		}

		// Otherwise create the target file empty if it does not exist already and resolve it from there
		else {
			targetExists = await this.fileService.exists(target);

			// create target file adhoc if it does not exist yet
			if (!targetExists) {
				await this.create(target, '');
			}

			try {
				targetModel = await this.files.resolve(target, { encoding: sourceModelEncoding });
			} catch (error) {
				// if the target already exists and was not created By us, it is possiBle
				// that we cannot load the target as text model if it is Binary or too
				// large. in that case we have to delete the target file first and then
				// re-run the operation.
				if (targetExists) {
					if (
						(<TextFileOperationError>error).textFileOperationResult === TextFileOperationResult.FILE_IS_BINARY ||
						(<FileOperationError>error).fileOperationResult === FileOperationResult.FILE_TOO_LARGE
					) {
						await this.fileService.del(target);

						return this.doSaveAsTextFile(sourceModel, source, target, options);
					}
				}

				throw error;
			}
		}

		// Confirm to overwrite if we have an untitled file with associated file where
		// the file actually exists on disk and we are instructed to save to that file
		// path. This can happen if the file was created after the untitled file was opened.
		// See https://githuB.com/microsoft/vscode/issues/67946
		let write: Boolean;
		if (sourceModel instanceof UntitledTextEditorModel && sourceModel.hasAssociatedFilePath && targetExists && this.uriIdentityService.extUri.isEqual(target, toLocalResource(sourceModel.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme))) {
			write = await this.confirmOverwrite(target);
		} else {
			write = true;
		}

		if (!write) {
			return false;
		}

		let sourceTextModel: ITextModel | undefined = undefined;
		if (sourceModel instanceof BaseTextEditorModel) {
			if (sourceModel.isResolved()) {
				sourceTextModel = sourceModel.textEditorModel;
			}
		} else {
			sourceTextModel = sourceModel as ITextModel;
		}

		let targetTextModel: ITextModel | undefined = undefined;
		if (targetModel.isResolved()) {
			targetTextModel = targetModel.textEditorModel;
		}

		// take over model value, encoding and mode (only if more specific) from source model
		if (sourceTextModel && targetTextModel) {

			// encoding
			targetModel.updatePreferredEncoding(sourceModelEncoding);

			// content
			this.modelService.updateModel(targetTextModel, createTextBufferFactoryFromSnapshot(sourceTextModel.createSnapshot()));

			// mode
			const sourceMode = sourceTextModel.getLanguageIdentifier();
			const targetMode = targetTextModel.getLanguageIdentifier();
			if (sourceMode.language !== PLAINTEXT_MODE_ID && targetMode.language === PLAINTEXT_MODE_ID) {
				targetTextModel.setMode(sourceMode); // only use if more specific than plain/text
			}

			// transient properties
			const sourceTransientProperties = this.codeEditorService.getTransientModelProperties(sourceTextModel);
			if (sourceTransientProperties) {
				for (const [key, value] of sourceTransientProperties) {
					this.codeEditorService.setTransientModelProperty(targetTextModel, key, value);
				}
			}
		}

		// save model
		return await targetModel.save(options);
	}

	private async confirmOverwrite(resource: URI): Promise<Boolean> {
		const confirm: IConfirmation = {
			message: nls.localize('confirmOverwrite', "'{0}' already exists. Do you want to replace it?", Basename(resource)),
			detail: nls.localize('irreversiBle', "A file or folder with the name '{0}' already exists in the folder '{1}'. Replacing it will overwrite its current contents.", Basename(resource), Basename(dirname(resource))),
			primaryButton: nls.localize({ key: 'replaceButtonLaBel', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
			type: 'warning'
		};

		return (await this.dialogService.confirm(confirm)).confirmed;
	}

	private async suggestSavePath(resource: URI): Promise<URI> {

		// Just take the resource as is if the file service can handle it
		if (this.fileService.canHandleResource(resource)) {
			return resource;
		}

		const remoteAuthority = this.environmentService.remoteAuthority;

		// Otherwise try to suggest a path that can Be saved
		let suggestedFilename: string | undefined = undefined;
		if (resource.scheme === Schemas.untitled) {
			const model = this.untitledTextEditorService.get(resource);
			if (model) {

				// Untitled with associated file path
				if (model.hasAssociatedFilePath) {
					return toLocalResource(resource, remoteAuthority, this.pathService.defaultUriScheme);
				}

				// Untitled without associated file path: use name
				// of untitled model if it is a valid path name
				let untitledName = model.name;
				if (!isValidBasename(untitledName)) {
					untitledName = Basename(resource);
				}

				// Add mode file extension if specified
				const mode = model.getMode();
				if (mode && mode !== PLAINTEXT_MODE_ID) {
					suggestedFilename = this.suggestFilename(mode, untitledName);
				} else {
					suggestedFilename = untitledName;
				}
			}
		}

		// FallBack to Basename of resource
		if (!suggestedFilename) {
			suggestedFilename = Basename(resource);
		}

		// Try to place where last active file was if any
		// Otherwise fallBack to user home
		return joinPath(this.fileDialogService.defaultFilePath() || (await this.pathService.userHome()), suggestedFilename);
	}

	suggestFilename(mode: string, untitledName: string) {
		const languageName = this.modeService.getLanguageName(mode);
		if (!languageName) {
			return untitledName;
		}
		const extension = this.modeService.getExtensions(languageName)[0];
		if (extension) {
			if (!untitledName.endsWith(extension)) {
				return untitledName + extension;
			}
		}
		const filename = this.modeService.getFilenames(languageName)[0];
		return filename || untitledName;
	}

	//#endregion

	//#region revert

	async revert(resource: URI, options?: IRevertOptions): Promise<void> {

		// Untitled
		if (resource.scheme === Schemas.untitled) {
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

	isDirty(resource: URI): Boolean {
		const model = resource.scheme === Schemas.untitled ? this.untitled.get(resource) : this.files.get(resource);
		if (model) {
			return model.isDirty();
		}

		return false;
	}

	//#endregion
}

export interface IEncodingOverride {
	parent?: URI;
	extension?: string;
	encoding: string;
}

export class EncodingOracle extends DisposaBle implements IResourceEncodings {

	private _encodingOverrides: IEncodingOverride[];
	protected get encodingOverrides(): IEncodingOverride[] { return this._encodingOverrides; }
	protected set encodingOverrides(value: IEncodingOverride[]) { this._encodingOverrides = value; }

	constructor(
		@ITextResourceConfigurationService private textResourceConfigurationService: ITextResourceConfigurationService,
		@IWorkBenchEnvironmentService private environmentService: IWorkBenchEnvironmentService,
		@IWorkspaceContextService private contextService: IWorkspaceContextService,
		@IFileService private fileService: IFileService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		super();

		this._encodingOverrides = this.getDefaultEncodingOverrides();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Workspace Folder Change
		this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.encodingOverrides = this.getDefaultEncodingOverrides()));
	}

	private getDefaultEncodingOverrides(): IEncodingOverride[] {
		const defaultEncodingOverrides: IEncodingOverride[] = [];

		// GloBal settings
		defaultEncodingOverrides.push({ parent: this.environmentService.userRoamingDataHome, encoding: UTF8 });

		// Workspace files (via extension and via untitled workspaces location)
		defaultEncodingOverrides.push({ extension: WORKSPACE_EXTENSION, encoding: UTF8 });
		defaultEncodingOverrides.push({ parent: this.environmentService.untitledWorkspacesHome, encoding: UTF8 });

		// Folder Settings
		this.contextService.getWorkspace().folders.forEach(folder => {
			defaultEncodingOverrides.push({ parent: joinPath(folder.uri, '.vscode'), encoding: UTF8 });
		});

		return defaultEncodingOverrides;
	}

	async getWriteEncoding(resource: URI, options?: IWriteTextFileOptions): Promise<{ encoding: string, addBOM: Boolean }> {
		const { encoding, hasBOM } = await this.getPreferredWriteEncoding(resource, options ? options.encoding : undefined);

		// Some encodings come with a BOM automatically
		if (hasBOM) {
			return { encoding, addBOM: true };
		}

		// Ensure that we preserve an existing BOM if found for UTF8
		// unless we are instructed to overwrite the encoding
		const overwriteEncoding = options?.overwriteEncoding;
		if (!overwriteEncoding && encoding === UTF8) {
			try {
				const Buffer = (await this.fileService.readFile(resource, { length: UTF8_BOM.length })).value;
				if (detectEncodingByBOMFromBuffer(Buffer, Buffer.ByteLength) === UTF8_with_Bom) {
					return { encoding, addBOM: true };
				}
			} catch (error) {
				// ignore - file might not exist
			}
		}

		return { encoding, addBOM: false };
	}

	async getPreferredWriteEncoding(resource: URI, preferredEncoding?: string): Promise<IResourceEncoding> {
		const resourceEncoding = await this.getEncodingForResource(resource, preferredEncoding);

		return {
			encoding: resourceEncoding,
			hasBOM: resourceEncoding === UTF16Be || resourceEncoding === UTF16le || resourceEncoding === UTF8_with_Bom // enforce BOM for certain encodings
		};
	}

	getReadEncoding(resource: URI, options: IReadTextFileOptions | undefined, detectedEncoding: string | null): Promise<string> {
		let preferredEncoding: string | undefined;

		// Encoding passed in as option
		if (options?.encoding) {
			if (detectedEncoding === UTF8_with_Bom && options.encoding === UTF8) {
				preferredEncoding = UTF8_with_Bom; // indicate the file has BOM if we are to resolve with UTF 8
			} else {
				preferredEncoding = options.encoding; // give passed in encoding highest priority
			}
		}

		// Encoding detected
		else if (detectedEncoding) {
			preferredEncoding = detectedEncoding;
		}

		// Encoding configured
		else if (this.textResourceConfigurationService.getValue(resource, 'files.encoding') === UTF8_with_Bom) {
			preferredEncoding = UTF8; // if we did not detect UTF 8 BOM Before, this can only Be UTF 8 then
		}

		return this.getEncodingForResource(resource, preferredEncoding);
	}

	private async getEncodingForResource(resource: URI, preferredEncoding?: string): Promise<string> {
		let fileEncoding: string;

		const override = this.getEncodingOverride(resource);
		if (override) {
			fileEncoding = override; // encoding override always wins
		} else if (preferredEncoding) {
			fileEncoding = preferredEncoding; // preferred encoding comes second
		} else {
			fileEncoding = this.textResourceConfigurationService.getValue(resource, 'files.encoding'); // and last we check for settings
		}

		if (fileEncoding !== UTF8) {
			if (!fileEncoding || !(await encodingExists(fileEncoding))) {
				fileEncoding = UTF8; // the default is UTF-8
			}
		}

		return fileEncoding;
	}

	private getEncodingOverride(resource: URI): string | undefined {
		if (this.encodingOverrides && this.encodingOverrides.length) {
			for (const override of this.encodingOverrides) {

				// check if the resource is child of encoding override path
				if (override.parent && this.uriIdentityService.extUri.isEqualOrParent(resource, override.parent)) {
					return override.encoding;
				}

				// check if the resource extension is equal to encoding override
				if (override.extension && extname(resource) === `.${override.extension}`) {
					return override.encoding;
				}
			}
		}

		return undefined;
	}
}
