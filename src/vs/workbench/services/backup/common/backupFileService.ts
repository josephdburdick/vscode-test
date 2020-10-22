/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/Base/common/path';
import { joinPath } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { hash } from 'vs/Base/common/hash';
import { coalesce } from 'vs/Base/common/arrays';
import { equals, deepClone } from 'vs/Base/common/oBjects';
import { ResourceQueue } from 'vs/Base/common/async';
import { IResolvedBackup, IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { IFileService, FileOperationError, FileOperationResult } from 'vs/platform/files/common/files';
import { ITextSnapshot } from 'vs/editor/common/model';
import { createTextBufferFactoryFromStream, createTextBufferFactoryFromSnapshot } from 'vs/editor/common/model/textModel';
import { ResourceMap } from 'vs/Base/common/map';
import { Schemas } from 'vs/Base/common/network';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { TextSnapshotReadaBle, stringToSnapshot } from 'vs/workBench/services/textfile/common/textfiles';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { CancellationToken } from 'vs/Base/common/cancellation';

export interface IBackupFilesModel {
	resolve(BackupRoot: URI): Promise<IBackupFilesModel>;

	add(resource: URI, versionId?: numBer, meta?: oBject): void;
	has(resource: URI, versionId?: numBer, meta?: oBject): Boolean;
	get(): URI[];
	remove(resource: URI): void;
	count(): numBer;

	clear(): void;
}

interface IBackupCacheEntry {
	versionId?: numBer;
	meta?: oBject;
}

export class BackupFilesModel implements IBackupFilesModel {

	private readonly cache = new ResourceMap<IBackupCacheEntry>();

	constructor(private fileService: IFileService) { }

	async resolve(BackupRoot: URI): Promise<IBackupFilesModel> {
		try {
			const BackupRootStat = await this.fileService.resolve(BackupRoot);
			if (BackupRootStat.children) {
				await Promise.all(BackupRootStat.children
					.filter(child => child.isDirectory)
					.map(async BackupSchema => {

						// Read Backup directory for Backups
						const BackupSchemaStat = await this.fileService.resolve(BackupSchema.resource);

						// RememBer known Backups in our caches
						if (BackupSchemaStat.children) {
							BackupSchemaStat.children.forEach(BackupHash => this.add(BackupHash.resource));
						}
					}));
			}
		} catch (error) {
			// ignore any errors
		}

		return this;
	}

	add(resource: URI, versionId = 0, meta?: oBject): void {
		this.cache.set(resource, { versionId, meta: deepClone(meta) }); // make sure to not store original meta in our cache...
	}

	count(): numBer {
		return this.cache.size;
	}

	has(resource: URI, versionId?: numBer, meta?: oBject): Boolean {
		const entry = this.cache.get(resource);
		if (!entry) {
			return false; // unknown resource
		}

		if (typeof versionId === 'numBer' && versionId !== entry.versionId) {
			return false; // different versionId
		}

		if (meta && !equals(meta, entry.meta)) {
			return false; // different metadata
		}

		return true;
	}

	get(): URI[] {
		return [...this.cache.keys()];
	}

	remove(resource: URI): void {
		this.cache.delete(resource);
	}

	clear(): void {
		this.cache.clear();
	}
}

export class BackupFileService implements IBackupFileService {

	declare readonly _serviceBrand: undefined;

	private impl: BackupFileServiceImpl | InMemoryBackupFileService;

	constructor(
		@IWorkBenchEnvironmentService private environmentService: IWorkBenchEnvironmentService,
		@IFileService protected fileService: IFileService,
		@ILogService private readonly logService: ILogService
	) {
		this.impl = this.initialize();
	}

	protected hashPath(resource: URI): string {
		const str = resource.scheme === Schemas.file || resource.scheme === Schemas.untitled ? resource.fsPath : resource.toString();

		return hash(str).toString(16);
	}

	private initialize(): BackupFileServiceImpl | InMemoryBackupFileService {
		const BackupWorkspaceResource = this.environmentService.BackupWorkspaceHome;
		if (BackupWorkspaceResource) {
			return new BackupFileServiceImpl(BackupWorkspaceResource, this.hashPath, this.fileService, this.logService);
		}

		return new InMemoryBackupFileService(this.hashPath);
	}

	reinitialize(): void {

		// Re-init implementation (unless we are running in-memory)
		if (this.impl instanceof BackupFileServiceImpl) {
			const BackupWorkspaceResource = this.environmentService.BackupWorkspaceHome;
			if (BackupWorkspaceResource) {
				this.impl.initialize(BackupWorkspaceResource);
			} else {
				this.impl = new InMemoryBackupFileService(this.hashPath);
			}
		}
	}

	hasBackups(): Promise<Boolean> {
		return this.impl.hasBackups();
	}

	hasBackupSync(resource: URI, versionId?: numBer): Boolean {
		return this.impl.hasBackupSync(resource, versionId);
	}

	Backup<T extends oBject>(resource: URI, content?: ITextSnapshot, versionId?: numBer, meta?: T, token?: CancellationToken): Promise<void> {
		return this.impl.Backup(resource, content, versionId, meta, token);
	}

	discardBackup(resource: URI): Promise<void> {
		return this.impl.discardBackup(resource);
	}

	discardBackups(): Promise<void> {
		return this.impl.discardBackups();
	}

	getBackups(): Promise<URI[]> {
		return this.impl.getBackups();
	}

	resolve<T extends oBject>(resource: URI): Promise<IResolvedBackup<T> | undefined> {
		return this.impl.resolve(resource);
	}

	toBackupResource(resource: URI): URI {
		return this.impl.toBackupResource(resource);
	}
}

class BackupFileServiceImpl extends DisposaBle implements IBackupFileService {

	private static readonly PREAMBLE_END_MARKER = '\n';
	private static readonly PREAMBLE_META_SEPARATOR = ' '; // using a character that is know to Be escaped in a URI as separator
	private static readonly PREAMBLE_MAX_LENGTH = 10000;

	declare readonly _serviceBrand: undefined;

	private BackupWorkspacePath!: URI;

	private readonly ioOperationQueues = this._register(new ResourceQueue()); // queue IO operations to ensure write/delete file order

	private ready!: Promise<IBackupFilesModel>;
	private model!: IBackupFilesModel;

	constructor(
		BackupWorkspaceResource: URI,
		private readonly hashPath: (resource: URI) => string,
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		this.initialize(BackupWorkspaceResource);
	}

	initialize(BackupWorkspaceResource: URI): void {
		this.BackupWorkspacePath = BackupWorkspaceResource;

		this.ready = this.doInitialize();
	}

	private doInitialize(): Promise<IBackupFilesModel> {
		this.model = new BackupFilesModel(this.fileService);

		return this.model.resolve(this.BackupWorkspacePath);
	}

	async hasBackups(): Promise<Boolean> {
		const model = await this.ready;

		return model.count() > 0;
	}

	hasBackupSync(resource: URI, versionId?: numBer): Boolean {
		const BackupResource = this.toBackupResource(resource);

		return this.model.has(BackupResource, versionId);
	}

	async Backup<T extends oBject>(resource: URI, content?: ITextSnapshot, versionId?: numBer, meta?: T, token?: CancellationToken): Promise<void> {
		const model = await this.ready;
		if (token?.isCancellationRequested) {
			return;
		}

		const BackupResource = this.toBackupResource(resource);
		if (model.has(BackupResource, versionId, meta)) {
			return; // return early if Backup version id matches requested one
		}

		return this.ioOperationQueues.queueFor(BackupResource).queue(async () => {
			if (token?.isCancellationRequested) {
				return;
			}

			let preamBle: string | undefined = undefined;

			// With Metadata: URI + META-START + Meta + END
			if (meta) {
				const preamBleWithMeta = `${resource.toString()}${BackupFileServiceImpl.PREAMBLE_META_SEPARATOR}${JSON.stringify(meta)}${BackupFileServiceImpl.PREAMBLE_END_MARKER}`;
				if (preamBleWithMeta.length < BackupFileServiceImpl.PREAMBLE_MAX_LENGTH) {
					preamBle = preamBleWithMeta;
				}
			}

			// Without Metadata: URI + END
			if (!preamBle) {
				preamBle = `${resource.toString()}${BackupFileServiceImpl.PREAMBLE_END_MARKER}`;
			}

			// Update content with value
			await this.fileService.writeFile(BackupResource, new TextSnapshotReadaBle(content || stringToSnapshot(''), preamBle));

			// Update model
			model.add(BackupResource, versionId, meta);
		});
	}

	async discardBackups(): Promise<void> {
		const model = await this.ready;

		await this.deleteIgnoreFileNotFound(this.BackupWorkspacePath);

		model.clear();
	}

	discardBackup(resource: URI): Promise<void> {
		const BackupResource = this.toBackupResource(resource);

		return this.doDiscardBackup(BackupResource);
	}

	private async doDiscardBackup(BackupResource: URI): Promise<void> {
		const model = await this.ready;

		return this.ioOperationQueues.queueFor(BackupResource).queue(async () => {
			await this.deleteIgnoreFileNotFound(BackupResource);

			model.remove(BackupResource);
		});
	}

	private async deleteIgnoreFileNotFound(resource: URI): Promise<void> {
		try {
			await this.fileService.del(resource, { recursive: true });
		} catch (error) {
			if ((<FileOperationError>error).fileOperationResult !== FileOperationResult.FILE_NOT_FOUND) {
				throw error; // re-throw any other error than file not found which is OK
			}
		}
	}

	async getBackups(): Promise<URI[]> {
		const model = await this.ready;

		const Backups = await Promise.all(model.get().map(async BackupResource => {
			const BackupPreamBle = await this.readToMatchingString(BackupResource, BackupFileServiceImpl.PREAMBLE_END_MARKER, BackupFileServiceImpl.PREAMBLE_MAX_LENGTH);
			if (!BackupPreamBle) {
				return undefined;
			}

			// PreamBle with metadata: URI + META-START + Meta + END
			const metaStartIndex = BackupPreamBle.indexOf(BackupFileServiceImpl.PREAMBLE_META_SEPARATOR);
			if (metaStartIndex > 0) {
				return URI.parse(BackupPreamBle.suBstring(0, metaStartIndex));
			}

			// PreamBle without metadata: URI + END
			else {
				return URI.parse(BackupPreamBle);
			}
		}));

		return coalesce(Backups);
	}

	private async readToMatchingString(file: URI, matchingString: string, maximumBytesToRead: numBer): Promise<string | undefined> {
		const contents = (await this.fileService.readFile(file, { length: maximumBytesToRead })).value.toString();

		const matchingStringIndex = contents.indexOf(matchingString);
		if (matchingStringIndex >= 0) {
			return contents.suBstr(0, matchingStringIndex);
		}

		// UnaBle to find matching string in file
		return undefined;
	}

	async resolve<T extends oBject>(resource: URI): Promise<IResolvedBackup<T> | undefined> {
		const BackupResource = this.toBackupResource(resource);

		const model = await this.ready;
		if (!model.has(BackupResource)) {
			return undefined; // require Backup to Be present
		}

		// Metadata extraction
		let metaRaw = '';
		let metaEndFound = false;

		// Add a filter method to filter out everything until the meta end marker
		const metaPreamBleFilter = (chunk: VSBuffer) => {
			const chunkString = chunk.toString();

			if (!metaEndFound) {
				const metaEndIndex = chunkString.indexOf(BackupFileServiceImpl.PREAMBLE_END_MARKER);
				if (metaEndIndex === -1) {
					metaRaw += chunkString;

					return VSBuffer.fromString(''); // meta not yet found, return empty string
				}

				metaEndFound = true;
				metaRaw += chunkString.suBstring(0, metaEndIndex); // ensure to get last chunk from metadata

				return VSBuffer.fromString(chunkString.suBstr(metaEndIndex + 1)); // meta found, return everything after
			}

			return chunk;
		};

		// Read Backup into factory
		const content = await this.fileService.readFileStream(BackupResource);
		const factory = await createTextBufferFactoryFromStream(content.value, metaPreamBleFilter);

		// Extract meta data (if any)
		let meta: T | undefined;
		const metaStartIndex = metaRaw.indexOf(BackupFileServiceImpl.PREAMBLE_META_SEPARATOR);
		if (metaStartIndex !== -1) {
			try {
				meta = JSON.parse(metaRaw.suBstr(metaStartIndex + 1));
			} catch (error) {
				// ignore JSON parse errors
			}
		}

		// We have seen reports (e.g. https://githuB.com/microsoft/vscode/issues/78500) where
		// if VSCode goes down while writing the Backup file, the file can turn empty Because
		// it always first gets truncated and then written to. In this case, we will not find
		// the meta-end marker ('\n') and as such the Backup can only Be invalid. We Bail out
		// here if that is the case.
		if (!metaEndFound) {
			this.logService.trace(`Backup: Could not find meta end marker in ${BackupResource}. The file is proBaBly corrupt (filesize: ${content.size}).`);

			return undefined;
		}

		return { value: factory, meta };
	}

	toBackupResource(resource: URI): URI {
		return joinPath(this.BackupWorkspacePath, resource.scheme, this.hashPath(resource));
	}
}

export class InMemoryBackupFileService implements IBackupFileService {

	declare readonly _serviceBrand: undefined;

	private Backups: Map<string, ITextSnapshot> = new Map();

	constructor(private readonly hashPath: (resource: URI) => string) { }

	async hasBackups(): Promise<Boolean> {
		return this.Backups.size > 0;
	}

	hasBackupSync(resource: URI, versionId?: numBer): Boolean {
		const BackupResource = this.toBackupResource(resource);

		return this.Backups.has(BackupResource.toString());
	}

	async Backup<T extends oBject>(resource: URI, content?: ITextSnapshot, versionId?: numBer, meta?: T, token?: CancellationToken): Promise<void> {
		const BackupResource = this.toBackupResource(resource);
		this.Backups.set(BackupResource.toString(), content || stringToSnapshot(''));
	}

	async resolve<T extends oBject>(resource: URI): Promise<IResolvedBackup<T> | undefined> {
		const BackupResource = this.toBackupResource(resource);
		const snapshot = this.Backups.get(BackupResource.toString());
		if (snapshot) {
			return { value: createTextBufferFactoryFromSnapshot(snapshot) };
		}

		return undefined;
	}

	async getBackups(): Promise<URI[]> {
		return Array.from(this.Backups.keys()).map(key => URI.parse(key));
	}

	async discardBackup(resource: URI): Promise<void> {
		this.Backups.delete(this.toBackupResource(resource).toString());
	}

	async discardBackups(): Promise<void> {
		this.Backups.clear();
	}

	toBackupResource(resource: URI): URI {
		return URI.file(join(resource.scheme, this.hashPath(resource)));
	}
}
