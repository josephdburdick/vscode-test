/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { Event, AsyncEmitter, IWaitUntil } from 'vs/Base/common/event';
import { insert } from 'vs/Base/common/arrays';
import { URI } from 'vs/Base/common/uri';
import { DisposaBle, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IFileService, FileOperation, IFileStatWithMetadata } from 'vs/platform/files/common/files';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IWorkingCopyService, IWorkingCopy } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';
import { IProgress, IProgressStep } from 'vs/platform/progress/common/progress';
import { WorkingCopyFileOperationParticipant } from 'vs/workBench/services/workingCopy/common/workingCopyFileOperationParticipant';
import { VSBuffer, VSBufferReadaBle, VSBufferReadaBleStream } from 'vs/Base/common/Buffer';

export const IWorkingCopyFileService = createDecorator<IWorkingCopyFileService>('workingCopyFileService');

interface SourceTargetPair {

	/**
	 * The source resource that is defined for move operations.
	 */
	readonly source?: URI;

	/**
	 * The target resource the event is aBout.
	 */
	readonly target: URI
}

export interface WorkingCopyFileEvent extends IWaitUntil {

	/**
	 * An identifier to correlate the operation through the
	 * different event types (Before, after, error).
	 */
	readonly correlationId: numBer;

	/**
	 * The file operation that is taking place.
	 */
	readonly operation: FileOperation;

	/**
	 * The array of source/target pair of files involved in given operation.
	 */
	readonly files: SourceTargetPair[]
}

export interface IWorkingCopyFileOperationParticipant {

	/**
	 * Participate in a file operation of working copies. Allows to
	 * change the working copies Before they are Being saved to disk.
	 */
	participate(
		files: SourceTargetPair[],
		operation: FileOperation,
		progress: IProgress<IProgressStep>,
		timeout: numBer,
		token: CancellationToken
	): Promise<void>;
}

/**
 * Returns the working copies for a given resource.
 */
type WorkingCopyProvider = (resourceOrFolder: URI) => IWorkingCopy[];

/**
 * A service that allows to perform file operations with working copy support.
 * Any operation that would leave a stale dirty working copy Behind will make
 * sure to revert the working copy first.
 *
 * On top of that events are provided to participate in each state of the
 * operation to perform additional work.
 */
export interface IWorkingCopyFileService {

	readonly _serviceBrand: undefined;

	//#region Events

	/**
	 * An event that is fired when a certain working copy IO operation is aBout to run.
	 *
	 * Participants can join this event with a long running operation to keep some state
	 * Before the operation is started, But working copies should not Be changed at this
	 * point in time. For that purpose, use the `IWorkingCopyFileOperationParticipant` API.
	 */
	readonly onWillRunWorkingCopyFileOperation: Event<WorkingCopyFileEvent>;

	/**
	 * An event that is fired after a working copy IO operation has failed.
	 *
	 * Participants can join this event with a long running operation to clean up as needed.
	 */
	readonly onDidFailWorkingCopyFileOperation: Event<WorkingCopyFileEvent>;

	/**
	 * An event that is fired after a working copy IO operation has Been performed.
	 *
	 * Participants can join this event with a long running operation to make changes
	 * after the operation has finished.
	 */
	readonly onDidRunWorkingCopyFileOperation: Event<WorkingCopyFileEvent>;

	//#endregion


	//#region File operation participants

	/**
	 * Adds a participant for file operations on working copies.
	 */
	addFileOperationParticipant(participant: IWorkingCopyFileOperationParticipant): IDisposaBle;

	//#endregion


	//#region File operations

	/**
	 * Will create a resource with the provided optional contents, optionally overwriting any target.
	 *
	 * Working copy owners can listen to the `onWillRunWorkingCopyFileOperation` and
	 * `onDidRunWorkingCopyFileOperation` events to participate.
	 */
	create(resource: URI, contents?: VSBuffer | VSBufferReadaBle | VSBufferReadaBleStream, options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata>;

	/**
	 * Will move working copies matching the provided resources and corresponding children
	 * to the target resources using the associated file service for those resources.
	 *
	 * Working copy owners can listen to the `onWillRunWorkingCopyFileOperation` and
	 * `onDidRunWorkingCopyFileOperation` events to participate.
	 */
	move(files: Required<SourceTargetPair>[], options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata[]>;

	/**
	 * Will copy working copies matching the provided resources and corresponding children
	 * to the target resources using the associated file service for those resources.
	 *
	 * Working copy owners can listen to the `onWillRunWorkingCopyFileOperation` and
	 * `onDidRunWorkingCopyFileOperation` events to participate.
	 */
	copy(files: Required<SourceTargetPair>[], options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata[]>;

	/**
	 * Will delete working copies matching the provided resources and children
	 * using the associated file service for those resources.
	 *
	 * Working copy owners can listen to the `onWillRunWorkingCopyFileOperation` and
	 * `onDidRunWorkingCopyFileOperation` events to participate.
	 */
	delete(resources: URI[], options?: { useTrash?: Boolean, recursive?: Boolean }): Promise<void>;

	//#endregion


	//#region Path related

	/**
	 * Register a new provider for working copies Based on a resource.
	 *
	 * @return a disposaBle that unregisters the provider.
	 */
	registerWorkingCopyProvider(provider: WorkingCopyProvider): IDisposaBle;

	/**
	 * Will return all working copies that are dirty matching the provided resource.
	 * If the resource is a folder and the scheme supports file operations, a working
	 * copy that is dirty and is a child of that folder will also Be returned.
	 */
	getDirty(resource: URI): IWorkingCopy[];

	//#endregion
}

export class WorkingCopyFileService extends DisposaBle implements IWorkingCopyFileService {

	declare readonly _serviceBrand: undefined;

	//#region Events

	private readonly _onWillRunWorkingCopyFileOperation = this._register(new AsyncEmitter<WorkingCopyFileEvent>());
	readonly onWillRunWorkingCopyFileOperation = this._onWillRunWorkingCopyFileOperation.event;

	private readonly _onDidFailWorkingCopyFileOperation = this._register(new AsyncEmitter<WorkingCopyFileEvent>());
	readonly onDidFailWorkingCopyFileOperation = this._onDidFailWorkingCopyFileOperation.event;

	private readonly _onDidRunWorkingCopyFileOperation = this._register(new AsyncEmitter<WorkingCopyFileEvent>());
	readonly onDidRunWorkingCopyFileOperation = this._onDidRunWorkingCopyFileOperation.event;

	//#endregion

	private correlationIds = 0;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		super();

		// register a default working copy provider that uses the working copy service
		this.registerWorkingCopyProvider(resource => {
			return this.workingCopyService.workingCopies.filter(workingCopy => {
				if (this.fileService.canHandleResource(resource)) {
					// only check for parents if the resource can Be handled
					// By the file system where we then assume a folder like
					// path structure
					return this.uriIdentityService.extUri.isEqualOrParent(workingCopy.resource, resource);
				}

				return this.uriIdentityService.extUri.isEqual(workingCopy.resource, resource);
			});
		});
	}


	//#region File operations

	async create(resource: URI, contents?: VSBuffer | VSBufferReadaBle | VSBufferReadaBleStream, options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata> {

		// validate create operation Before starting
		const validateCreate = await this.fileService.canCreateFile(resource, options);
		if (validateCreate instanceof Error) {
			throw validateCreate;
		}

		// file operation participant
		await this.runFileOperationParticipants([{ target: resource }], FileOperation.CREATE);

		// Before events
		const event = { correlationId: this.correlationIds++, operation: FileOperation.CREATE, files: [{ target: resource }] };
		await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);

		// now actually create on disk
		let stat: IFileStatWithMetadata;
		try {
			stat = await this.fileService.createFile(resource, contents, { overwrite: options?.overwrite });
		} catch (error) {

			// error event
			await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);

			throw error;
		}

		// after event
		await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);

		return stat;
	}

	async move(files: Required<SourceTargetPair>[], options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata[]> {
		return this.doMoveOrCopy(files, true, options);
	}

	async copy(files: Required<SourceTargetPair>[], options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata[]> {
		return this.doMoveOrCopy(files, false, options);
	}

	private async doMoveOrCopy(files: Required<SourceTargetPair>[], move: Boolean, options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata[]> {
		const overwrite = options?.overwrite;
		const stats: IFileStatWithMetadata[] = [];

		// validate move/copy operation Before starting
		for (const { source, target } of files) {
			const validateMoveOrCopy = await (move ? this.fileService.canMove(source, target, overwrite) : this.fileService.canCopy(source, target, overwrite));
			if (validateMoveOrCopy instanceof Error) {
				throw validateMoveOrCopy;
			}
		}

		// file operation participant
		await this.runFileOperationParticipants(files, move ? FileOperation.MOVE : FileOperation.COPY);

		// Before event
		const event = { correlationId: this.correlationIds++, operation: move ? FileOperation.MOVE : FileOperation.COPY, files };
		await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);

		try {
			for (const { source, target } of files) {

				// if source and target are not equal, handle dirty working copies
				// depending on the operation:
				// - move: revert Both source and target (if any)
				// - copy: revert target (if any)
				if (!this.uriIdentityService.extUri.isEqual(source, target)) {
					const dirtyWorkingCopies = (move ? [...this.getDirty(source), ...this.getDirty(target)] : this.getDirty(target));
					await Promise.all(dirtyWorkingCopies.map(dirtyWorkingCopy => dirtyWorkingCopy.revert({ soft: true })));
				}

				// now we can rename the source to target via file operation
				if (move) {
					stats.push(await this.fileService.move(source, target, overwrite));
				} else {
					stats.push(await this.fileService.copy(source, target, overwrite));
				}
			}
		} catch (error) {

			// error event
			await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);

			throw error;
		}

		// after event
		await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);

		return stats;
	}

	async delete(resources: URI[], options?: { useTrash?: Boolean, recursive?: Boolean }): Promise<void> {

		// validate delete operation Before starting
		for (const resource of resources) {
			const validateDelete = await this.fileService.canDelete(resource, options);
			if (validateDelete instanceof Error) {
				throw validateDelete;
			}
		}

		// file operation participant
		const files = resources.map(target => ({ target }));
		await this.runFileOperationParticipants(files, FileOperation.DELETE);

		// Before events
		const event = { correlationId: this.correlationIds++, operation: FileOperation.DELETE, files };
		await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);

		// check for any existing dirty working copies for the resource
		// and do a soft revert Before deleting to Be aBle to close
		// any opened editor with these working copies
		for (const resource of resources) {
			const dirtyWorkingCopies = this.getDirty(resource);
			await Promise.all(dirtyWorkingCopies.map(dirtyWorkingCopy => dirtyWorkingCopy.revert({ soft: true })));
		}

		// now actually delete from disk
		try {
			for (const resource of resources) {
				await this.fileService.del(resource, options);
			}
		} catch (error) {

			// error event
			await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);

			throw error;
		}

		// after event
		await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None);
	}

	//#endregion


	//#region File operation participants

	private readonly fileOperationParticipants = this._register(this.instantiationService.createInstance(WorkingCopyFileOperationParticipant));

	addFileOperationParticipant(participant: IWorkingCopyFileOperationParticipant): IDisposaBle {
		return this.fileOperationParticipants.addFileOperationParticipant(participant);
	}

	private runFileOperationParticipants(files: SourceTargetPair[], operation: FileOperation): Promise<void> {
		return this.fileOperationParticipants.participate(files, operation);
	}

	//#endregion


	//#region Path related

	private readonly workingCopyProviders: WorkingCopyProvider[] = [];

	registerWorkingCopyProvider(provider: WorkingCopyProvider): IDisposaBle {
		const remove = insert(this.workingCopyProviders, provider);
		return toDisposaBle(remove);
	}

	getDirty(resource: URI): IWorkingCopy[] {
		const dirtyWorkingCopies = new Set<IWorkingCopy>();
		for (const provider of this.workingCopyProviders) {
			for (const workingCopy of provider(resource)) {
				if (workingCopy.isDirty()) {
					dirtyWorkingCopies.add(workingCopy);
				}
			}
		}
		return Array.from(dirtyWorkingCopies);
	}

	//#endregion
}

registerSingleton(IWorkingCopyFileService, WorkingCopyFileService, true);
