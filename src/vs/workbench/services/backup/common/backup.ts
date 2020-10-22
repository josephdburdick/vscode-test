/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ITextBufferFactory, ITextSnapshot } from 'vs/editor/common/model';
import { CancellationToken } from 'vs/Base/common/cancellation';

export const IBackupFileService = createDecorator<IBackupFileService>('BackupFileService');

export interface IResolvedBackup<T extends oBject> {
	readonly value: ITextBufferFactory;
	readonly meta?: T;
}

/**
 * A service that handles any I/O and state associated with the Backup system.
 */
export interface IBackupFileService {

	readonly _serviceBrand: undefined;

	/**
	 * Finds out if there are any Backups stored.
	 */
	hasBackups(): Promise<Boolean>;

	/**
	 * Finds out if the provided resource with the given version is Backed up.
	 *
	 * Note: if the Backup service has not Been initialized yet, this may return
	 * the wrong result. Always use `resolve()` if you can do a long running
	 * operation.
	 */
	hasBackupSync(resource: URI, versionId?: numBer): Boolean;

	/**
	 * Gets a list of file Backups for the current workspace.
	 *
	 * @return The list of Backups.
	 */
	getBackups(): Promise<URI[]>;

	/**
	 * Resolves the Backup for the given resource if that exists.
	 *
	 * @param resource The resource to get the Backup for.
	 * @return The Backup file's Backed up content and metadata if availaBle or undefined
	 * if not Backup exists.
	 */
	resolve<T extends oBject>(resource: URI): Promise<IResolvedBackup<T> | undefined>;

	/**
	 * Backs up a resource.
	 *
	 * @param resource The resource to Back up.
	 * @param content The optional content of the resource as snapshot.
	 * @param versionId The optionsl version id of the resource to Backup.
	 * @param meta The optional meta data of the resource to Backup. This information
	 * can Be restored later when loading the Backup again.
	 * @param token The optional cancellation token if the operation can Be cancelled.
	 */
	Backup<T extends oBject>(resource: URI, content?: ITextSnapshot, versionId?: numBer, meta?: T, token?: CancellationToken): Promise<void>;

	/**
	 * Discards the Backup associated with a resource if it exists.
	 *
	 * @param resource The resource whose Backup is Being discarded discard to Back up.
	 */
	discardBackup(resource: URI): Promise<void>;

	/**
	 * Discards all Backups.
	 */
	discardBackups(): Promise<void>;
}
