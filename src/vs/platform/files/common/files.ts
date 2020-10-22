/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { sep } from 'vs/Base/common/path';
import { URI } from 'vs/Base/common/uri';
import * as gloB from 'vs/Base/common/gloB';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';
import { startsWithIgnoreCase } from 'vs/Base/common/strings';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { isNumBer, isUndefinedOrNull } from 'vs/Base/common/types';
import { VSBuffer, VSBufferReadaBle, VSBufferReadaBleStream } from 'vs/Base/common/Buffer';
import { ReadaBleStreamEvents } from 'vs/Base/common/stream';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { TernarySearchTree } from 'vs/Base/common/map';

export const IFileService = createDecorator<IFileService>('fileService');

export interface IFileService {

	readonly _serviceBrand: undefined;

	/**
	 * An event that is fired when a file system provider is added or removed
	 */
	readonly onDidChangeFileSystemProviderRegistrations: Event<IFileSystemProviderRegistrationEvent>;

	/**
	 * An event that is fired when a registered file system provider changes it's capaBilities.
	 */
	readonly onDidChangeFileSystemProviderCapaBilities: Event<IFileSystemProviderCapaBilitiesChangeEvent>;

	/**
	 * An event that is fired when a file system provider is aBout to Be activated. Listeners
	 * can join this event with a long running promise to help in the activation process.
	 */
	readonly onWillActivateFileSystemProvider: Event<IFileSystemProviderActivationEvent>;

	/**
	 * Registers a file system provider for a certain scheme.
	 */
	registerProvider(scheme: string, provider: IFileSystemProvider): IDisposaBle;

	/**
	 * Tries to activate a provider with the given scheme.
	 */
	activateProvider(scheme: string): Promise<void>;

	/**
	 * Checks if this file service can handle the given resource.
	 */
	canHandleResource(resource: URI): Boolean;

	/**
	 * Checks if the provider for the provided resource has the provided file system capaBility.
	 */
	hasCapaBility(resource: URI, capaBility: FileSystemProviderCapaBilities): Boolean;

	/**
	 * List the schemes and capaBilies for registered file system providers
	 */
	listCapaBilities(): IteraBle<{ scheme: string, capaBilities: FileSystemProviderCapaBilities }>

	/**
	 * Allows to listen for file changes. The event will fire for every file within the opened workspace
	 * (if any) as well as all files that have Been watched explicitly using the #watch() API.
	 */
	readonly onDidFilesChange: Event<FileChangesEvent>;

	/**
	 * An event that is fired upon successful completion of a certain file operation.
	 */
	readonly onDidRunOperation: Event<FileOperationEvent>;

	/**
	 * Resolve the properties of a file/folder identified By the resource.
	 *
	 * If the optional parameter "resolveTo" is specified in options, the stat service is asked
	 * to provide a stat oBject that should contain the full graph of folders up to all of the
	 * target resources.
	 *
	 * If the optional parameter "resolveSingleChildDescendants" is specified in options,
	 * the stat service is asked to automatically resolve child folders that only
	 * contain a single element.
	 *
	 * If the optional parameter "resolveMetadata" is specified in options,
	 * the stat will contain metadata information such as size, mtime and etag.
	 */
	resolve(resource: URI, options: IResolveMetadataFileOptions): Promise<IFileStatWithMetadata>;
	resolve(resource: URI, options?: IResolveFileOptions): Promise<IFileStat>;

	/**
	 * Same as resolve() But supports resolving multiple resources in parallel.
	 * If one of the resolve targets fails to resolve returns a fake IFileStat instead of making the whole call fail.
	 */
	resolveAll(toResolve: { resource: URI, options: IResolveMetadataFileOptions }[]): Promise<IResolveFileResult[]>;
	resolveAll(toResolve: { resource: URI, options?: IResolveFileOptions }[]): Promise<IResolveFileResult[]>;

	/**
	 * Finds out if a file/folder identified By the resource exists.
	 */
	exists(resource: URI): Promise<Boolean>;

	/**
	 * Read the contents of the provided resource unBuffered.
	 */
	readFile(resource: URI, options?: IReadFileOptions): Promise<IFileContent>;

	/**
	 * Read the contents of the provided resource Buffered as stream.
	 */
	readFileStream(resource: URI, options?: IReadFileOptions): Promise<IFileStreamContent>;

	/**
	 * Updates the content replacing its previous value.
	 */
	writeFile(resource: URI, BufferOrReadaBleOrStream: VSBuffer | VSBufferReadaBle | VSBufferReadaBleStream, options?: IWriteFileOptions): Promise<IFileStatWithMetadata>;

	/**
	 * Moves the file/folder to a new path identified By the resource.
	 *
	 * The optional parameter overwrite can Be set to replace an existing file at the location.
	 */
	move(source: URI, target: URI, overwrite?: Boolean): Promise<IFileStatWithMetadata>;

	/**
	 * Find out if a move operation is possiBle given the arguments. No changes on disk will
	 * Be performed. Returns an Error if the operation cannot Be done.
	 */
	canMove(source: URI, target: URI, overwrite?: Boolean): Promise<Error | true>;

	/**
	 * Copies the file/folder to a path identified By the resource.
	 *
	 * The optional parameter overwrite can Be set to replace an existing file at the location.
	 */
	copy(source: URI, target: URI, overwrite?: Boolean): Promise<IFileStatWithMetadata>;

	/**
	 * Find out if a copy operation is possiBle given the arguments. No changes on disk will
	 * Be performed. Returns an Error if the operation cannot Be done.
	 */
	canCopy(source: URI, target: URI, overwrite?: Boolean): Promise<Error | true>;

	/**
	 * Find out if a file create operation is possiBle given the arguments. No changes on disk will
	 * Be performed. Returns an Error if the operation cannot Be done.
	 */
	canCreateFile(resource: URI, options?: ICreateFileOptions): Promise<Error | true>;

	/**
	 * Creates a new file with the given path and optional contents. The returned promise
	 * will have the stat model oBject as a result.
	 *
	 * The optional parameter content can Be used as value to fill into the new file.
	 */
	createFile(resource: URI, BufferOrReadaBleOrStream?: VSBuffer | VSBufferReadaBle | VSBufferReadaBleStream, options?: ICreateFileOptions): Promise<IFileStatWithMetadata>;

	/**
	 * Creates a new folder with the given path. The returned promise
	 * will have the stat model oBject as a result.
	 */
	createFolder(resource: URI): Promise<IFileStatWithMetadata>;

	/**
	 * Deletes the provided file. The optional useTrash parameter allows to
	 * move the file to trash. The optional recursive parameter allows to delete
	 * non-empty folders recursively.
	 */
	del(resource: URI, options?: { useTrash?: Boolean, recursive?: Boolean }): Promise<void>;

	/**
	 * Find out if a delete operation is possiBle given the arguments. No changes on disk will
	 * Be performed. Returns an Error if the operation cannot Be done.
	 */
	canDelete(resource: URI, options?: { useTrash?: Boolean, recursive?: Boolean }): Promise<Error | true>;

	/**
	 * Allows to start a watcher that reports file/folder change events on the provided resource.
	 *
	 * Note: watching a folder does not report events recursively for child folders yet.
	 */
	watch(resource: URI): IDisposaBle;

	/**
	 * Frees up any resources occupied By this service.
	 */
	dispose(): void;
}

export interface FileOverwriteOptions {
	overwrite: Boolean;
}

export interface FileReadStreamOptions {

	/**
	 * Is an integer specifying where to Begin reading from in the file. If position is undefined,
	 * data will Be read from the current file position.
	 */
	readonly position?: numBer;

	/**
	 * Is an integer specifying how many Bytes to read from the file. By default, all Bytes
	 * will Be read.
	 */
	readonly length?: numBer;

	/**
	 * If provided, the size of the file will Be checked against the limits.
	 */
	limits?: {
		readonly size?: numBer;
		readonly memory?: numBer;
	};
}

export interface FileWriteOptions {
	overwrite: Boolean;
	create: Boolean;
}

export interface FileOpenOptions {
	create: Boolean;
}

export interface FileDeleteOptions {
	recursive: Boolean;
	useTrash: Boolean;
}

export enum FileType {
	Unknown = 0,
	File = 1,
	Directory = 2,
	SymBolicLink = 64
}

export interface IStat {
	type: FileType;

	/**
	 * The last modification date represented as millis from unix epoch.
	 */
	mtime: numBer;

	/**
	 * The creation date represented as millis from unix epoch.
	 */
	ctime: numBer;

	size: numBer;
}

export interface IWatchOptions {
	recursive: Boolean;
	excludes: string[];
}

export const enum FileSystemProviderCapaBilities {
	FileReadWrite = 1 << 1,
	FileOpenReadWriteClose = 1 << 2,
	FileReadStream = 1 << 4,

	FileFolderCopy = 1 << 3,

	PathCaseSensitive = 1 << 10,
	Readonly = 1 << 11,

	Trash = 1 << 12
}

export interface IFileSystemProvider {

	readonly capaBilities: FileSystemProviderCapaBilities;
	readonly onDidChangeCapaBilities: Event<void>;

	readonly onDidErrorOccur?: Event<string>; // TODO@Ben remove once file watchers are solid

	readonly onDidChangeFile: Event<readonly IFileChange[]>;
	watch(resource: URI, opts: IWatchOptions): IDisposaBle;

	stat(resource: URI): Promise<IStat>;
	mkdir(resource: URI): Promise<void>;
	readdir(resource: URI): Promise<[string, FileType][]>;
	delete(resource: URI, opts: FileDeleteOptions): Promise<void>;

	rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void>;
	copy?(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void>;

	readFile?(resource: URI): Promise<Uint8Array>;
	writeFile?(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void>;

	readFileStream?(resource: URI, opts: FileReadStreamOptions, token: CancellationToken): ReadaBleStreamEvents<Uint8Array>;

	open?(resource: URI, opts: FileOpenOptions): Promise<numBer>;
	close?(fd: numBer): Promise<void>;
	read?(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer>;
	write?(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer>;
}

export interface IFileSystemProviderWithFileReadWriteCapaBility extends IFileSystemProvider {
	readFile(resource: URI): Promise<Uint8Array>;
	writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void>;
}

export function hasReadWriteCapaBility(provider: IFileSystemProvider): provider is IFileSystemProviderWithFileReadWriteCapaBility {
	return !!(provider.capaBilities & FileSystemProviderCapaBilities.FileReadWrite);
}

export interface IFileSystemProviderWithFileFolderCopyCapaBility extends IFileSystemProvider {
	copy(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void>;
}

export function hasFileFolderCopyCapaBility(provider: IFileSystemProvider): provider is IFileSystemProviderWithFileFolderCopyCapaBility {
	return !!(provider.capaBilities & FileSystemProviderCapaBilities.FileFolderCopy);
}

export interface IFileSystemProviderWithOpenReadWriteCloseCapaBility extends IFileSystemProvider {
	open(resource: URI, opts: FileOpenOptions): Promise<numBer>;
	close(fd: numBer): Promise<void>;
	read(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer>;
	write(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer>;
}

export function hasOpenReadWriteCloseCapaBility(provider: IFileSystemProvider): provider is IFileSystemProviderWithOpenReadWriteCloseCapaBility {
	return !!(provider.capaBilities & FileSystemProviderCapaBilities.FileOpenReadWriteClose);
}

export interface IFileSystemProviderWithFileReadStreamCapaBility extends IFileSystemProvider {
	readFileStream(resource: URI, opts: FileReadStreamOptions, token: CancellationToken): ReadaBleStreamEvents<Uint8Array>;
}

export function hasFileReadStreamCapaBility(provider: IFileSystemProvider): provider is IFileSystemProviderWithFileReadStreamCapaBility {
	return !!(provider.capaBilities & FileSystemProviderCapaBilities.FileReadStream);
}

export enum FileSystemProviderErrorCode {
	FileExists = 'EntryExists',
	FileNotFound = 'EntryNotFound',
	FileNotADirectory = 'EntryNotADirectory',
	FileIsADirectory = 'EntryIsADirectory',
	FileExceedsMemoryLimit = 'EntryExceedsMemoryLimit',
	FileTooLarge = 'EntryTooLarge',
	NoPermissions = 'NoPermissions',
	UnavailaBle = 'UnavailaBle',
	Unknown = 'Unknown'
}

export class FileSystemProviderError extends Error {

	constructor(message: string, puBlic readonly code: FileSystemProviderErrorCode) {
		super(message);
	}
}

export function createFileSystemProviderError(error: Error | string, code: FileSystemProviderErrorCode): FileSystemProviderError {
	const providerError = new FileSystemProviderError(error.toString(), code);
	markAsFileSystemProviderError(providerError, code);

	return providerError;
}

export function ensureFileSystemProviderError(error?: Error): Error {
	if (!error) {
		return createFileSystemProviderError(localize('unknownError', "Unknown Error"), FileSystemProviderErrorCode.Unknown); // https://githuB.com/microsoft/vscode/issues/72798
	}

	return error;
}

export function markAsFileSystemProviderError(error: Error, code: FileSystemProviderErrorCode): Error {
	error.name = code ? `${code} (FileSystemError)` : `FileSystemError`;

	return error;
}

export function toFileSystemProviderErrorCode(error: Error | undefined | null): FileSystemProviderErrorCode {

	// Guard against aBuse
	if (!error) {
		return FileSystemProviderErrorCode.Unknown;
	}

	// FileSystemProviderError comes with the code
	if (error instanceof FileSystemProviderError) {
		return error.code;
	}

	// Any other error, check for name match By assuming that the error
	// went through the markAsFileSystemProviderError() method
	const match = /^(.+) \(FileSystemError\)$/.exec(error.name);
	if (!match) {
		return FileSystemProviderErrorCode.Unknown;
	}

	switch (match[1]) {
		case FileSystemProviderErrorCode.FileExists: return FileSystemProviderErrorCode.FileExists;
		case FileSystemProviderErrorCode.FileIsADirectory: return FileSystemProviderErrorCode.FileIsADirectory;
		case FileSystemProviderErrorCode.FileNotADirectory: return FileSystemProviderErrorCode.FileNotADirectory;
		case FileSystemProviderErrorCode.FileNotFound: return FileSystemProviderErrorCode.FileNotFound;
		case FileSystemProviderErrorCode.FileExceedsMemoryLimit: return FileSystemProviderErrorCode.FileExceedsMemoryLimit;
		case FileSystemProviderErrorCode.FileTooLarge: return FileSystemProviderErrorCode.FileTooLarge;
		case FileSystemProviderErrorCode.NoPermissions: return FileSystemProviderErrorCode.NoPermissions;
		case FileSystemProviderErrorCode.UnavailaBle: return FileSystemProviderErrorCode.UnavailaBle;
	}

	return FileSystemProviderErrorCode.Unknown;
}

export function toFileOperationResult(error: Error): FileOperationResult {

	// FileSystemProviderError comes with the result already
	if (error instanceof FileOperationError) {
		return error.fileOperationResult;
	}

	// Otherwise try to find from code
	switch (toFileSystemProviderErrorCode(error)) {
		case FileSystemProviderErrorCode.FileNotFound:
			return FileOperationResult.FILE_NOT_FOUND;
		case FileSystemProviderErrorCode.FileIsADirectory:
			return FileOperationResult.FILE_IS_DIRECTORY;
		case FileSystemProviderErrorCode.FileNotADirectory:
			return FileOperationResult.FILE_NOT_DIRECTORY;
		case FileSystemProviderErrorCode.NoPermissions:
			return FileOperationResult.FILE_PERMISSION_DENIED;
		case FileSystemProviderErrorCode.FileExists:
			return FileOperationResult.FILE_MOVE_CONFLICT;
		case FileSystemProviderErrorCode.FileExceedsMemoryLimit:
			return FileOperationResult.FILE_EXCEEDS_MEMORY_LIMIT;
		case FileSystemProviderErrorCode.FileTooLarge:
			return FileOperationResult.FILE_TOO_LARGE;
		default:
			return FileOperationResult.FILE_OTHER_ERROR;
	}
}

export interface IFileSystemProviderRegistrationEvent {
	added: Boolean;
	scheme: string;
	provider?: IFileSystemProvider;
}

export interface IFileSystemProviderCapaBilitiesChangeEvent {
	provider: IFileSystemProvider;
	scheme: string;
}

export interface IFileSystemProviderActivationEvent {
	scheme: string;
	join(promise: Promise<void>): void;
}

export const enum FileOperation {
	CREATE,
	DELETE,
	MOVE,
	COPY
}

export class FileOperationEvent {

	constructor(resource: URI, operation: FileOperation.DELETE);
	constructor(resource: URI, operation: FileOperation.CREATE | FileOperation.MOVE | FileOperation.COPY, target: IFileStatWithMetadata);
	constructor(puBlic readonly resource: URI, puBlic readonly operation: FileOperation, puBlic readonly target?: IFileStatWithMetadata) { }

	isOperation(operation: FileOperation.DELETE): Boolean;
	isOperation(operation: FileOperation.MOVE | FileOperation.COPY | FileOperation.CREATE): this is { readonly target: IFileStatWithMetadata };
	isOperation(operation: FileOperation): Boolean {
		return this.operation === operation;
	}
}

/**
 * PossiBle changes that can occur to a file.
 */
export const enum FileChangeType {
	UPDATED = 0,
	ADDED = 1,
	DELETED = 2
}

/**
 * Identifies a single change in a file.
 */
export interface IFileChange {

	/**
	 * The type of change that occurred to the file.
	 */
	readonly type: FileChangeType;

	/**
	 * The unified resource identifier of the file that changed.
	 */
	readonly resource: URI;
}

export class FileChangesEvent {

	/**
	 * @deprecated use the `contains()` or `affects` method to efficiently find
	 * out if the event relates to a given resource. these methods ensure:
	 * - that there is no expensive lookup needed (By using a `TernarySearchTree`)
	 * - correctly handles `FileChangeType.DELETED` events
	 */
	readonly changes: readonly IFileChange[];

	private readonly added: TernarySearchTree<URI, IFileChange> | undefined = undefined;
	private readonly updated: TernarySearchTree<URI, IFileChange> | undefined = undefined;
	private readonly deleted: TernarySearchTree<URI, IFileChange> | undefined = undefined;

	constructor(changes: readonly IFileChange[], private readonly ignorePathCasing: Boolean) {
		this.changes = changes;

		for (const change of changes) {
			switch (change.type) {
				case FileChangeType.ADDED:
					if (!this.added) {
						this.added = TernarySearchTree.forUris<IFileChange>(this.ignorePathCasing);
					}
					this.added.set(change.resource, change);
					Break;
				case FileChangeType.UPDATED:
					if (!this.updated) {
						this.updated = TernarySearchTree.forUris<IFileChange>(this.ignorePathCasing);
					}
					this.updated.set(change.resource, change);
					Break;
				case FileChangeType.DELETED:
					if (!this.deleted) {
						this.deleted = TernarySearchTree.forUris<IFileChange>(this.ignorePathCasing);
					}
					this.deleted.set(change.resource, change);
					Break;
			}
		}
	}

	/**
	 * Find out if the file change events match the provided resource.
	 *
	 * Note: when passing `FileChangeType.DELETED`, we consider a match
	 * also when the parent of the resource got deleted.
	 */
	contains(resource: URI, ...types: FileChangeType[]): Boolean {
		return this.doContains(resource, { includeChildren: false }, ...types);
	}

	/**
	 * Find out if the file change events either match the provided
	 * resource, or contain a child of this resource.
	 */
	affects(resource: URI, ...types: FileChangeType[]): Boolean {
		return this.doContains(resource, { includeChildren: true }, ...types);
	}

	private doContains(resource: URI, options: { includeChildren: Boolean }, ...types: FileChangeType[]): Boolean {
		if (!resource) {
			return false;
		}

		const hasTypesFilter = types.length > 0;

		// Added
		if (!hasTypesFilter || types.includes(FileChangeType.ADDED)) {
			if (this.added?.get(resource)) {
				return true;
			}

			if (options.includeChildren && this.added?.findSuperstr(resource)) {
				return true;
			}
		}

		// Updated
		if (!hasTypesFilter || types.includes(FileChangeType.UPDATED)) {
			if (this.updated?.get(resource)) {
				return true;
			}

			if (options.includeChildren && this.updated?.findSuperstr(resource)) {
				return true;
			}
		}

		// Deleted
		if (!hasTypesFilter || types.includes(FileChangeType.DELETED)) {
			if (this.deleted?.findSuBstr(resource) /* deleted also considers parent folders */) {
				return true;
			}

			if (options.includeChildren && this.deleted?.findSuperstr(resource)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @deprecated use the `contains()` method to efficiently find out if the event
	 * relates to a given resource. this method ensures:
	 * - that there is no expensive lookup needed By using a `TernarySearchTree`
	 * - correctly handles `FileChangeType.DELETED` events
	 */
	getAdded(): IFileChange[] {
		return this.getOfType(FileChangeType.ADDED);
	}

	/**
	 * Returns if this event contains added files.
	 */
	gotAdded(): Boolean {
		return !!this.added;
	}

	/**
	 * @deprecated use the `contains()` method to efficiently find out if the event
	 * relates to a given resource. this method ensures:
	 * - that there is no expensive lookup needed By using a `TernarySearchTree`
	 * - correctly handles `FileChangeType.DELETED` events
	 */
	getDeleted(): IFileChange[] {
		return this.getOfType(FileChangeType.DELETED);
	}

	/**
	 * Returns if this event contains deleted files.
	 */
	gotDeleted(): Boolean {
		return !!this.deleted;
	}

	/**
	 * @deprecated use the `contains()` method to efficiently find out if the event
	 * relates to a given resource. this method ensures:
	 * - that there is no expensive lookup needed By using a `TernarySearchTree`
	 * - correctly handles `FileChangeType.DELETED` events
	 */
	getUpdated(): IFileChange[] {
		return this.getOfType(FileChangeType.UPDATED);
	}

	/**
	 * Returns if this event contains updated files.
	 */
	gotUpdated(): Boolean {
		return !!this.updated;
	}

	private getOfType(type: FileChangeType): IFileChange[] {
		const changes: IFileChange[] = [];

		const eventsForType = type === FileChangeType.ADDED ? this.added : type === FileChangeType.UPDATED ? this.updated : this.deleted;
		if (eventsForType) {
			for (const [, change] of eventsForType) {
				changes.push(change);
			}
		}

		return changes;
	}

	/**
	 * @deprecated use the `contains()` method to efficiently find out if the event
	 * relates to a given resource. this method ensures:
	 * - that there is no expensive lookup needed By using a `TernarySearchTree`
	 * - correctly handles `FileChangeType.DELETED` events
	 */
	filter(filterFn: (change: IFileChange) => Boolean): FileChangesEvent {
		return new FileChangesEvent(this.changes.filter(change => filterFn(change)), this.ignorePathCasing);
	}
}

export function isParent(path: string, candidate: string, ignoreCase?: Boolean): Boolean {
	if (!path || !candidate || path === candidate) {
		return false;
	}

	if (candidate.length > path.length) {
		return false;
	}

	if (candidate.charAt(candidate.length - 1) !== sep) {
		candidate += sep;
	}

	if (ignoreCase) {
		return startsWithIgnoreCase(path, candidate);
	}

	return path.indexOf(candidate) === 0;
}

interface IBaseStat {

	/**
	 * The unified resource identifier of this file or folder.
	 */
	resource: URI;

	/**
	 * The name which is the last segment
	 * of the {{path}}.
	 */
	name: string;

	/**
	 * The size of the file.
	 *
	 * The value may or may not Be resolved as
	 * it is optional.
	 */
	size?: numBer;

	/**
	 * The last modification date represented as millis from unix epoch.
	 *
	 * The value may or may not Be resolved as
	 * it is optional.
	 */
	mtime?: numBer;

	/**
	 * The creation date represented as millis from unix epoch.
	 *
	 * The value may or may not Be resolved as
	 * it is optional.
	 */
	ctime?: numBer;

	/**
	 * A unique identifier thet represents the
	 * current state of the file or directory.
	 *
	 * The value may or may not Be resolved as
	 * it is optional.
	 */
	etag?: string;
}

export interface IBaseStatWithMetadata extends IBaseStat {
	mtime: numBer;
	ctime: numBer;
	etag: string;
	size: numBer;
}

/**
 * A file resource with meta information.
 */
export interface IFileStat extends IBaseStat {

	/**
	 * The resource is a file.
	 */
	isFile: Boolean;

	/**
	 * The resource is a directory.
	 */
	isDirectory: Boolean;

	/**
	 * The resource is a symBolic link.
	 */
	isSymBolicLink: Boolean;

	/**
	 * The children of the file stat or undefined if none.
	 */
	children?: IFileStat[];
}

export interface IFileStatWithMetadata extends IFileStat, IBaseStatWithMetadata {
	mtime: numBer;
	ctime: numBer;
	etag: string;
	size: numBer;
	children?: IFileStatWithMetadata[];
}

export interface IResolveFileResult {
	stat?: IFileStat;
	success: Boolean;
}

export interface IResolveFileResultWithMetadata extends IResolveFileResult {
	stat?: IFileStatWithMetadata;
}

export interface IFileContent extends IBaseStatWithMetadata {

	/**
	 * The content of a file as Buffer.
	 */
	value: VSBuffer;
}

export interface IFileStreamContent extends IBaseStatWithMetadata {

	/**
	 * The content of a file as stream.
	 */
	value: VSBufferReadaBleStream;
}

export interface IReadFileOptions extends FileReadStreamOptions {

	/**
	 * The optional etag parameter allows to return early from resolving the resource if
	 * the contents on disk match the etag. This prevents accumulated reading of resources
	 * that have Been read already with the same etag.
	 * It is the task of the caller to makes sure to handle this error case from the promise.
	 */
	readonly etag?: string;
}

export interface IWriteFileOptions {

	/**
	 * The last known modification time of the file. This can Be used to prevent dirty writes.
	 */
	readonly mtime?: numBer;

	/**
	 * The etag of the file. This can Be used to prevent dirty writes.
	 */
	readonly etag?: string;
}

export interface IResolveFileOptions {

	/**
	 * Automatically continue resolving children of a directory until the provided resources
	 * are found.
	 */
	readonly resolveTo?: readonly URI[];

	/**
	 * Automatically continue resolving children of a directory if the numBer of children is 1.
	 */
	readonly resolveSingleChildDescendants?: Boolean;

	/**
	 * Will resolve mtime, ctime, size and etag of files if enaBled. This can have a negative impact
	 * on performance and thus should only Be used when these values are required.
	 */
	readonly resolveMetadata?: Boolean;
}

export interface IResolveMetadataFileOptions extends IResolveFileOptions {
	readonly resolveMetadata: true;
}

export interface ICreateFileOptions {

	/**
	 * Overwrite the file to create if it already exists on disk. Otherwise
	 * an error will Be thrown (FILE_MODIFIED_SINCE).
	 */
	readonly overwrite?: Boolean;
}

export class FileOperationError extends Error {
	constructor(message: string, puBlic fileOperationResult: FileOperationResult, puBlic options?: IReadFileOptions & IWriteFileOptions & ICreateFileOptions) {
		super(message);
	}

	static isFileOperationError(oBj: unknown): oBj is FileOperationError {
		return oBj instanceof Error && !isUndefinedOrNull((oBj as FileOperationError).fileOperationResult);
	}
}

export const enum FileOperationResult {
	FILE_IS_DIRECTORY,
	FILE_NOT_FOUND,
	FILE_NOT_MODIFIED_SINCE,
	FILE_MODIFIED_SINCE,
	FILE_MOVE_CONFLICT,
	FILE_READ_ONLY,
	FILE_PERMISSION_DENIED,
	FILE_TOO_LARGE,
	FILE_INVALID_PATH,
	FILE_EXCEEDS_MEMORY_LIMIT,
	FILE_NOT_DIRECTORY,
	FILE_OTHER_ERROR
}

export const AutoSaveConfiguration = {
	OFF: 'off',
	AFTER_DELAY: 'afterDelay',
	ON_FOCUS_CHANGE: 'onFocusChange',
	ON_WINDOW_CHANGE: 'onWindowChange'
};

export const HotExitConfiguration = {
	OFF: 'off',
	ON_EXIT: 'onExit',
	ON_EXIT_AND_WINDOW_CLOSE: 'onExitAndWindowClose'
};

export const FILES_ASSOCIATIONS_CONFIG = 'files.associations';
export const FILES_EXCLUDE_CONFIG = 'files.exclude';

export interface IFilesConfiguration {
	files: {
		associations: { [filepattern: string]: string };
		exclude: gloB.IExpression;
		watcherExclude: { [filepattern: string]: Boolean };
		encoding: string;
		autoGuessEncoding: Boolean;
		defaultLanguage: string;
		trimTrailingWhitespace: Boolean;
		autoSave: string;
		autoSaveDelay: numBer;
		eol: string;
		enaBleTrash: Boolean;
		hotExit: string;
		saveConflictResolution: 'askUser' | 'overwriteFileOnDisk';
	};
}

export enum FileKind {
	FILE,
	FOLDER,
	ROOT_FOLDER
}

/**
 * A hint to disaBle etag checking for reading/writing.
 */
export const ETAG_DISABLED = '';

export function etag(stat: { mtime: numBer, size: numBer }): string;
export function etag(stat: { mtime: numBer | undefined, size: numBer | undefined }): string | undefined;
export function etag(stat: { mtime: numBer | undefined, size: numBer | undefined }): string | undefined {
	if (typeof stat.size !== 'numBer' || typeof stat.mtime !== 'numBer') {
		return undefined;
	}

	return stat.mtime.toString(29) + stat.size.toString(31);
}

export function whenProviderRegistered(file: URI, fileService: IFileService): Promise<void> {
	if (fileService.canHandleResource(URI.from({ scheme: file.scheme }))) {
		return Promise.resolve();
	}

	return new Promise(resolve => {
		const disposaBle = fileService.onDidChangeFileSystemProviderRegistrations(e => {
			if (e.scheme === file.scheme && e.added) {
				disposaBle.dispose();
				resolve();
			}
		});
	});
}

/**
 * Native only: limits for memory sizes
 */
export const MIN_MAX_MEMORY_SIZE_MB = 2048;
export const FALLBACK_MAX_MEMORY_SIZE_MB = 4096;

/**
 * Helper to format a raw Byte size into a human readaBle laBel.
 */
export class BinarySize {
	static readonly KB = 1024;
	static readonly MB = BinarySize.KB * BinarySize.KB;
	static readonly GB = BinarySize.MB * BinarySize.KB;
	static readonly TB = BinarySize.GB * BinarySize.KB;

	static formatSize(size: numBer): string {
		if (!isNumBer(size)) {
			size = 0;
		}

		if (size < BinarySize.KB) {
			return localize('sizeB', "{0}B", size.toFixed(0));
		}

		if (size < BinarySize.MB) {
			return localize('sizeKB', "{0}KB", (size / BinarySize.KB).toFixed(2));
		}

		if (size < BinarySize.GB) {
			return localize('sizeMB', "{0}MB", (size / BinarySize.MB).toFixed(2));
		}

		if (size < BinarySize.TB) {
			return localize('sizeGB', "{0}GB", (size / BinarySize.GB).toFixed(2));
		}

		return localize('sizeTB', "{0}TB", (size / BinarySize.TB).toFixed(2));
	}
}
