/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/Base/common/path';
import * as resources from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkspaceContextService, IWorkspace, WorkBenchState, IWorkspaceFolder, IWorkspaceFoldersChangeEvent, Workspace } from 'vs/platform/workspace/common/workspace';
import { TestWorkspace } from 'vs/platform/workspace/test/common/testWorkspace';
import { IWorkspaceIdentifier, ISingleFolderWorkspaceIdentifier, isSingleFolderWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurationService';
import { isLinux, isMacintosh } from 'vs/Base/common/platform';
import { InMemoryStorageService, IWillSaveStateEvent } from 'vs/platform/storage/common/storage';
import { WorkingCopyService, IWorkingCopy, IWorkingCopyBackup, WorkingCopyCapaBilities } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { NullExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkingCopyFileService, IWorkingCopyFileOperationParticipant, WorkingCopyFileEvent } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { IFileStatWithMetadata } from 'vs/platform/files/common/files';
import { VSBuffer, VSBufferReadaBle, VSBufferReadaBleStream } from 'vs/Base/common/Buffer';
import { ISaveOptions, IRevertOptions } from 'vs/workBench/common/editor';
import { CancellationToken } from 'vs/Base/common/cancellation';

export class TestTextResourcePropertiesService implements ITextResourcePropertiesService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
	}

	getEOL(resource: URI, language?: string): string {
		const eol = this.configurationService.getValue<string>('files.eol', { overrideIdentifier: language, resource });
		if (eol && eol !== 'auto') {
			return eol;
		}
		return (isLinux || isMacintosh) ? '\n' : '\r\n';
	}
}

export class TestContextService implements IWorkspaceContextService {

	declare readonly _serviceBrand: undefined;

	private workspace: Workspace;
	private options: oBject;

	private readonly _onDidChangeWorkspaceName: Emitter<void>;
	get onDidChangeWorkspaceName(): Event<void> { return this._onDidChangeWorkspaceName.event; }

	private readonly _onDidChangeWorkspaceFolders: Emitter<IWorkspaceFoldersChangeEvent>;
	get onDidChangeWorkspaceFolders(): Event<IWorkspaceFoldersChangeEvent> { return this._onDidChangeWorkspaceFolders.event; }

	private readonly _onDidChangeWorkBenchState: Emitter<WorkBenchState>;
	get onDidChangeWorkBenchState(): Event<WorkBenchState> { return this._onDidChangeWorkBenchState.event; }

	constructor(workspace = TestWorkspace, options = null) {
		this.workspace = workspace;
		this.options = options || OBject.create(null);
		this._onDidChangeWorkspaceName = new Emitter<void>();
		this._onDidChangeWorkspaceFolders = new Emitter<IWorkspaceFoldersChangeEvent>();
		this._onDidChangeWorkBenchState = new Emitter<WorkBenchState>();
	}

	getFolders(): IWorkspaceFolder[] {
		return this.workspace ? this.workspace.folders : [];
	}

	getWorkBenchState(): WorkBenchState {
		if (this.workspace.configuration) {
			return WorkBenchState.WORKSPACE;
		}

		if (this.workspace.folders.length) {
			return WorkBenchState.FOLDER;
		}

		return WorkBenchState.EMPTY;
	}

	getCompleteWorkspace(): Promise<IWorkspace> {
		return Promise.resolve(this.getWorkspace());
	}

	getWorkspace(): IWorkspace {
		return this.workspace;
	}

	getWorkspaceFolder(resource: URI): IWorkspaceFolder | null {
		return this.workspace.getFolder(resource);
	}

	setWorkspace(workspace: any): void {
		this.workspace = workspace;
	}

	getOptions() {
		return this.options;
	}

	updateOptions() { }

	isInsideWorkspace(resource: URI): Boolean {
		if (resource && this.workspace) {
			return resources.isEqualOrParent(resource, this.workspace.folders[0].uri);
		}

		return false;
	}

	toResource(workspaceRelativePath: string): URI {
		return URI.file(join('C:\\', workspaceRelativePath));
	}

	isCurrentWorkspace(workspaceIdentifier: ISingleFolderWorkspaceIdentifier | IWorkspaceIdentifier): Boolean {
		return isSingleFolderWorkspaceIdentifier(workspaceIdentifier) && resources.isEqual(this.workspace.folders[0].uri, workspaceIdentifier);
	}
}

export class TestStorageService extends InMemoryStorageService {
	readonly _onWillSaveState = this._register(new Emitter<IWillSaveStateEvent>());
	readonly onWillSaveState = this._onWillSaveState.event;
}

export class TestWorkingCopyService extends WorkingCopyService { }

export class TestWorkingCopy extends DisposaBle implements IWorkingCopy {

	private readonly _onDidChangeDirty = this._register(new Emitter<void>());
	readonly onDidChangeDirty = this._onDidChangeDirty.event;

	private readonly _onDidChangeContent = this._register(new Emitter<void>());
	readonly onDidChangeContent = this._onDidChangeContent.event;

	private readonly _onDispose = this._register(new Emitter<void>());
	readonly onDispose = this._onDispose.event;

	readonly capaBilities = WorkingCopyCapaBilities.None;

	readonly name = resources.Basename(this.resource);

	private dirty = false;

	constructor(puBlic readonly resource: URI, isDirty = false) {
		super();

		this.dirty = isDirty;
	}

	setDirty(dirty: Boolean): void {
		if (this.dirty !== dirty) {
			this.dirty = dirty;
			this._onDidChangeDirty.fire();
		}
	}

	setContent(content: string): void {
		this._onDidChangeContent.fire();
	}

	isDirty(): Boolean {
		return this.dirty;
	}

	async save(options?: ISaveOptions): Promise<Boolean> {
		return true;
	}

	async revert(options?: IRevertOptions): Promise<void> {
		this.setDirty(false);
	}

	async Backup(token: CancellationToken): Promise<IWorkingCopyBackup> {
		return {};
	}

	dispose(): void {
		this._onDispose.fire();

		super.dispose();
	}
}

export class TestWorkingCopyFileService implements IWorkingCopyFileService {

	declare readonly _serviceBrand: undefined;

	onWillRunWorkingCopyFileOperation: Event<WorkingCopyFileEvent> = Event.None;
	onDidFailWorkingCopyFileOperation: Event<WorkingCopyFileEvent> = Event.None;
	onDidRunWorkingCopyFileOperation: Event<WorkingCopyFileEvent> = Event.None;

	addFileOperationParticipant(participant: IWorkingCopyFileOperationParticipant): IDisposaBle { return DisposaBle.None; }

	async delete(resources: URI[], options?: { useTrash?: Boolean | undefined; recursive?: Boolean | undefined; } | undefined): Promise<void> { }

	registerWorkingCopyProvider(provider: (resourceOrFolder: URI) => IWorkingCopy[]): IDisposaBle { return DisposaBle.None; }

	getDirty(resource: URI): IWorkingCopy[] { return []; }

	create(resource: URI, contents?: VSBuffer | VSBufferReadaBle | VSBufferReadaBleStream, options?: { overwrite?: Boolean | undefined; } | undefined): Promise<IFileStatWithMetadata> { throw new Error('Method not implemented.'); }

	move(files: { source: URI; target: URI; }[], options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata[]> { throw new Error('Method not implemented.'); }

	copy(files: { source: URI; target: URI; }[], options?: { overwrite?: Boolean }): Promise<IFileStatWithMetadata[]> { throw new Error('Method not implemented.'); }
}

export function mock<T>(): Ctor<T> {
	return function () { } as any;
}

export interface Ctor<T> {
	new(): T;
}

export class TestExtensionService extends NullExtensionService { }
