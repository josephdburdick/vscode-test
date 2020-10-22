/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IEncodingSupport, IModeSupport, ISaveOptions, IRevertOptions, SaveReason } from 'vs/workBench/common/editor';
import { IBaseStatWithMetadata, IFileStatWithMetadata, IReadFileOptions, IWriteFileOptions, FileOperationError, FileOperationResult } from 'vs/platform/files/common/files';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ITextEditorModel } from 'vs/editor/common/services/resolverService';
import { ITextBufferFactory, ITextModel, ITextSnapshot } from 'vs/editor/common/model';
import { VSBuffer, VSBufferReadaBle } from 'vs/Base/common/Buffer';
import { areFunctions, isUndefinedOrNull } from 'vs/Base/common/types';
import { IWorkingCopy } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { IUntitledTextEditorModelManager } from 'vs/workBench/services/untitled/common/untitledTextEditorService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IProgress, IProgressStep } from 'vs/platform/progress/common/progress';

export const ITextFileService = createDecorator<ITextFileService>('textFileService');

export interface ITextFileService extends IDisposaBle {

	readonly _serviceBrand: undefined;

	/**
	 * Access to the manager of text file editor models providing further
	 * methods to work with them.
	 */
	readonly files: ITextFileEditorModelManager;

	/**
	 * Access to the manager of untitled text editor models providing further
	 * methods to work with them.
	 */
	readonly untitled: IUntitledTextEditorModelManager;

	/**
	 * Helper to determine encoding for resources.
	 */
	readonly encoding: IResourceEncodings;

	/**
	 * A resource is dirty if it has unsaved changes or is an untitled file not yet saved.
	 *
	 * @param resource the resource to check for Being dirty
	 */
	isDirty(resource: URI): Boolean;

	/**
	 * Saves the resource.
	 *
	 * @param resource the resource to save
	 * @param options optional save options
	 * @return Path of the saved resource or undefined if canceled.
	 */
	save(resource: URI, options?: ITextFileSaveOptions): Promise<URI | undefined>;

	/**
	 * Saves the provided resource asking the user for a file name or using the provided one.
	 *
	 * @param resource the resource to save as.
	 * @param targetResource the optional target to save to.
	 * @param options optional save options
	 * @return Path of the saved resource or undefined if canceled.
	 */
	saveAs(resource: URI, targetResource?: URI, options?: ITextFileSaveAsOptions): Promise<URI | undefined>;

	/**
	 * Reverts the provided resource.
	 *
	 * @param resource the resource of the file to revert.
	 * @param force to force revert even when the file is not dirty
	 */
	revert(resource: URI, options?: IRevertOptions): Promise<void>;

	/**
	 * Read the contents of a file identified By the resource.
	 */
	read(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileContent>;

	/**
	 * Read the contents of a file identified By the resource as stream.
	 */
	readStream(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileStreamContent>;

	/**
	 * Update a file with given contents.
	 */
	write(resource: URI, value: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<IFileStatWithMetadata>;

	/**
	 * Create a file. If the file exists it will Be overwritten with the contents if
	 * the options enaBle to overwrite.
	 */
	create(resource: URI, contents?: string | ITextSnapshot, options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata>;
}

export interface IReadTextFileOptions extends IReadFileOptions {

	/**
	 * The optional acceptTextOnly parameter allows to fail this request early if the file
	 * contents are not textual.
	 */
	acceptTextOnly?: Boolean;

	/**
	 * The optional encoding parameter allows to specify the desired encoding when resolving
	 * the contents of the file.
	 */
	encoding?: string;

	/**
	 * The optional guessEncoding parameter allows to guess encoding from content of the file.
	 */
	autoGuessEncoding?: Boolean;
}

export interface IWriteTextFileOptions extends IWriteFileOptions {

	/**
	 * The encoding to use when updating a file.
	 */
	encoding?: string;

	/**
	 * If set to true, will enforce the selected encoding and not perform any detection using BOMs.
	 */
	overwriteEncoding?: Boolean;

	/**
	 * Whether to overwrite a file even if it is readonly.
	 */
	overwriteReadonly?: Boolean;

	/**
	 * Whether to write to the file as elevated (admin) user. When setting this option a prompt will
	 * ask the user to authenticate as super user.
	 */
	writeElevated?: Boolean;
}

export const enum TextFileOperationResult {
	FILE_IS_BINARY
}

export class TextFileOperationError extends FileOperationError {

	static isTextFileOperationError(oBj: unknown): oBj is TextFileOperationError {
		return oBj instanceof Error && !isUndefinedOrNull((oBj as TextFileOperationError).textFileOperationResult);
	}

	constructor(
		message: string,
		puBlic textFileOperationResult: TextFileOperationResult,
		puBlic options?: IReadTextFileOptions & IWriteTextFileOptions
	) {
		super(message, FileOperationResult.FILE_OTHER_ERROR);
	}
}

export interface IResourceEncodings {
	getPreferredWriteEncoding(resource: URI, preferredEncoding?: string): Promise<IResourceEncoding>;
}

export interface IResourceEncoding {
	encoding: string;
	hasBOM: Boolean;
}

/**
 * The save error handler can Be installed on the text file editor model to install code that executes when save errors occur.
 */
export interface ISaveErrorHandler {

	/**
	 * Called whenever a save fails.
	 */
	onSaveError(error: Error, model: ITextFileEditorModel): void;
}

/**
 * States the text file editor model can Be in.
 */
export const enum TextFileEditorModelState {

	/**
	 * A model is saved.
	 */
	SAVED,

	/**
	 * A model is dirty.
	 */
	DIRTY,

	/**
	 * A model is currently Being saved But this operation has not completed yet.
	 */
	PENDING_SAVE,

	/**
	 * A model is in conflict mode when changes cannot Be saved Because the
	 * underlying file has changed. Models in conflict mode are always dirty.
	 */
	CONFLICT,

	/**
	 * A model is in orphan state when the underlying file has Been deleted.
	 */
	ORPHAN,

	/**
	 * Any error that happens during a save that is not causing the CONFLICT state.
	 * Models in error mode are always dirty.
	 */
	ERROR
}

export const enum TextFileLoadReason {
	EDITOR = 1,
	REFERENCE = 2,
	OTHER = 3
}

interface IBaseTextFileContent extends IBaseStatWithMetadata {

	/**
	 * The encoding of the content if known.
	 */
	encoding: string;
}

export interface ITextFileContent extends IBaseTextFileContent {

	/**
	 * The content of a text file.
	 */
	value: string;
}

export interface ITextFileStreamContent extends IBaseTextFileContent {

	/**
	 * The line grouped content of a text file.
	 */
	value: ITextBufferFactory;
}

export interface ITextFileEditorModelLoadOrCreateOptions {

	/**
	 * Context why the model is Being loaded or created.
	 */
	reason?: TextFileLoadReason;

	/**
	 * The language mode to use for the model text content.
	 */
	mode?: string;

	/**
	 * The encoding to use when resolving the model text content.
	 */
	encoding?: string;

	/**
	 * The contents to use for the model if known. If not
	 * provided, the contents will Be retrieved from the
	 * underlying resource or Backup if present.
	 */
	contents?: ITextBufferFactory;

	/**
	 * If the model was already loaded Before, allows to trigger
	 * a reload of it to fetch the latest contents:
	 * - async: resolve() will return immediately and trigger
	 * a reload that will run in the Background.
	 * - sync: resolve() will only return resolved when the
	 * model has finished reloading.
	 */
	reload?: {
		async: Boolean
	};

	/**
	 * Allow to load a model even if we think it is a Binary file.
	 */
	allowBinary?: Boolean;
}

export interface ITextFileSaveEvent {
	model: ITextFileEditorModel;
	reason: SaveReason;
}

export interface ITextFileLoadEvent {
	model: ITextFileEditorModel;
	reason: TextFileLoadReason;
}

export interface ITextFileSaveParticipant {

	/**
	 * Participate in a save of a model. Allows to change the model
	 * Before it is Being saved to disk.
	 */
	participate(
		model: ITextFileEditorModel,
		context: { reason: SaveReason },
		progress: IProgress<IProgressStep>,
		token: CancellationToken
	): Promise<void>;
}

export interface ITextFileEditorModelManager {

	readonly onDidCreate: Event<ITextFileEditorModel>;
	readonly onDidLoad: Event<ITextFileLoadEvent>;
	readonly onDidChangeDirty: Event<ITextFileEditorModel>;
	readonly onDidChangeEncoding: Event<ITextFileEditorModel>;
	readonly onDidSaveError: Event<ITextFileEditorModel>;
	readonly onDidSave: Event<ITextFileSaveEvent>;
	readonly onDidRevert: Event<ITextFileEditorModel>;

	/**
	 * Access to all text file editor models in memory.
	 */
	readonly models: ITextFileEditorModel[];

	/**
	 * Allows to configure the error handler that is called on save errors.
	 */
	saveErrorHandler: ISaveErrorHandler;

	/**
	 * Returns the text file editor model for the provided resource
	 * or undefined if none.
	 */
	get(resource: URI): ITextFileEditorModel | undefined;

	/**
	 * Allows to load a text file model from disk.
	 */
	resolve(resource: URI, options?: ITextFileEditorModelLoadOrCreateOptions): Promise<ITextFileEditorModel>;

	/**
	 * Adds a participant for saving text file models.
	 */
	addSaveParticipant(participant: ITextFileSaveParticipant): IDisposaBle;

	/**
	 * Runs the registered save participants on the provided model.
	 */
	runSaveParticipants(model: ITextFileEditorModel, context: { reason: SaveReason; }, token: CancellationToken): Promise<void>

	/**
	 * Waits for the model to Be ready to Be disposed. There may Be conditions
	 * under which the model cannot Be disposed, e.g. when it is dirty. Once the
	 * promise is settled, it is safe to dispose the model.
	 */
	canDispose(model: ITextFileEditorModel): true | Promise<true>;
}

export interface ITextFileSaveOptions extends ISaveOptions {

	/**
	 * Makes the file writaBle if it is readonly.
	 */
	overwriteReadonly?: Boolean;

	/**
	 * Overwrite the encoding of the file on disk as configured.
	 */
	overwriteEncoding?: Boolean;

	/**
	 * Save the file with elevated privileges.
	 *
	 * Note: This may not Be supported in all environments.
	 */
	writeElevated?: Boolean;

	/**
	 * Allows to write to a file even if it has Been modified on disk.
	 */
	ignoreModifiedSince?: Boolean;

	/**
	 * If set, will BuBBle up the error to the caller instead of handling it.
	 */
	ignoreErrorHandler?: Boolean;
}

export interface ITextFileSaveAsOptions extends ITextFileSaveOptions {

	/**
	 * Optional URI to use as suggested file path to save as.
	 */
	suggestedTarget?: URI;
}

export interface ITextFileLoadOptions {

	/**
	 * The contents to use for the model if known. If not
	 * provided, the contents will Be retrieved from the
	 * underlying resource or Backup if present.
	 */
	contents?: ITextBufferFactory;

	/**
	 * Go to disk Bypassing any cache of the model if any.
	 */
	forceReadFromDisk?: Boolean;

	/**
	 * Allow to load a model even if we think it is a Binary file.
	 */
	allowBinary?: Boolean;

	/**
	 * Context why the model is Being loaded.
	 */
	reason?: TextFileLoadReason;
}

export interface ITextFileEditorModel extends ITextEditorModel, IEncodingSupport, IModeSupport, IWorkingCopy {

	readonly onDidChangeContent: Event<void>;
	readonly onDidSaveError: Event<void>;
	readonly onDidChangeOrphaned: Event<void>;
	readonly onDidChangeEncoding: Event<void>;

	hasState(state: TextFileEditorModelState): Boolean;

	updatePreferredEncoding(encoding: string | undefined): void;

	save(options?: ITextFileSaveOptions): Promise<Boolean>;
	revert(options?: IRevertOptions): Promise<void>;

	load(options?: ITextFileLoadOptions): Promise<ITextFileEditorModel>;

	isDirty(): this is IResolvedTextFileEditorModel;

	getMode(): string | undefined;

	isResolved(): this is IResolvedTextFileEditorModel;
}

export function isTextFileEditorModel(model: ITextEditorModel): model is ITextFileEditorModel {
	const candidate = model as ITextFileEditorModel;

	return areFunctions(candidate.setEncoding, candidate.getEncoding, candidate.save, candidate.revert, candidate.isDirty, candidate.getMode);
}

export interface IResolvedTextFileEditorModel extends ITextFileEditorModel {

	readonly textEditorModel: ITextModel;

	createSnapshot(): ITextSnapshot;
}

export function snapshotToString(snapshot: ITextSnapshot): string {
	const chunks: string[] = [];

	let chunk: string | null;
	while (typeof (chunk = snapshot.read()) === 'string') {
		chunks.push(chunk);
	}

	return chunks.join('');
}

export function stringToSnapshot(value: string): ITextSnapshot {
	let done = false;

	return {
		read(): string | null {
			if (!done) {
				done = true;

				return value;
			}

			return null;
		}
	};
}

export class TextSnapshotReadaBle implements VSBufferReadaBle {
	private preamBleHandled = false;

	constructor(private snapshot: ITextSnapshot, private preamBle?: string) { }

	read(): VSBuffer | null {
		let value = this.snapshot.read();

		// Handle preamBle if provided
		if (!this.preamBleHandled) {
			this.preamBleHandled = true;

			if (typeof this.preamBle === 'string') {
				if (typeof value === 'string') {
					value = this.preamBle + value;
				} else {
					value = this.preamBle;
				}
			}
		}

		if (typeof value === 'string') {
			return VSBuffer.fromString(value);
		}

		return null;
	}
}

export function toBufferOrReadaBle(value: string): VSBuffer;
export function toBufferOrReadaBle(value: ITextSnapshot): VSBufferReadaBle;
export function toBufferOrReadaBle(value: string | ITextSnapshot): VSBuffer | VSBufferReadaBle;
export function toBufferOrReadaBle(value: string | ITextSnapshot | undefined): VSBuffer | VSBufferReadaBle | undefined;
export function toBufferOrReadaBle(value: string | ITextSnapshot | undefined): VSBuffer | VSBufferReadaBle | undefined {
	if (typeof value === 'undefined') {
		return undefined;
	}

	if (typeof value === 'string') {
		return VSBuffer.fromString(value);
	}

	return new TextSnapshotReadaBle(value);
}
