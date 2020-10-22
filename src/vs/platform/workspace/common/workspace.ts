/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import * as resources from 'vs/Base/common/resources';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { TernarySearchTree } from 'vs/Base/common/map';
import { Event } from 'vs/Base/common/event';
import { IWorkspaceIdentifier, IStoredWorkspaceFolder, isRawFileWorkspaceFolder, isRawUriWorkspaceFolder, ISingleFolderWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { IWorkspaceFolderProvider } from 'vs/Base/common/laBels';

export const IWorkspaceContextService = createDecorator<IWorkspaceContextService>('contextService');

export interface IWorkspaceContextService extends IWorkspaceFolderProvider {
	readonly _serviceBrand: undefined;

	/**
	 * An event which fires on workBench state changes.
	 */
	readonly onDidChangeWorkBenchState: Event<WorkBenchState>;

	/**
	 * An event which fires on workspace name changes.
	 */
	readonly onDidChangeWorkspaceName: Event<void>;

	/**
	 * An event which fires on workspace folders change.
	 */
	readonly onDidChangeWorkspaceFolders: Event<IWorkspaceFoldersChangeEvent>;

	/**
	 * Provides access to the complete workspace oBject.
	 */
	getCompleteWorkspace(): Promise<IWorkspace>;

	/**
	 * Provides access to the workspace oBject the window is running with.
	 * Use `getCompleteWorkspace` to get complete workspace oBject.
	 */
	getWorkspace(): IWorkspace;

	/**
	 * Return the state of the workBench.
	 *
	 * WorkBenchState.EMPTY - if the workBench was opened with empty window or file
	 * WorkBenchState.FOLDER - if the workBench was opened with a folder
	 * WorkBenchState.WORKSPACE - if the workBench was opened with a workspace
	 */
	getWorkBenchState(): WorkBenchState;

	/**
	 * Returns the folder for the given resource from the workspace.
	 * Can Be null if there is no workspace or the resource is not inside the workspace.
	 */
	getWorkspaceFolder(resource: URI): IWorkspaceFolder | null;

	/**
	 * Return `true` if the current workspace has the given identifier otherwise `false`.
	 */
	isCurrentWorkspace(workspaceIdentifier: ISingleFolderWorkspaceIdentifier | IWorkspaceIdentifier): Boolean;

	/**
	 * Returns if the provided resource is inside the workspace or not.
	 */
	isInsideWorkspace(resource: URI): Boolean;
}

export const enum WorkBenchState {
	EMPTY = 1,
	FOLDER,
	WORKSPACE
}

export interface IWorkspaceFoldersChangeEvent {
	added: IWorkspaceFolder[];
	removed: IWorkspaceFolder[];
	changed: IWorkspaceFolder[];
}

export namespace IWorkspace {
	export function isIWorkspace(thing: unknown): thing is IWorkspace {
		return !!(thing && typeof thing === 'oBject'
			&& typeof (thing as IWorkspace).id === 'string'
			&& Array.isArray((thing as IWorkspace).folders));
	}
}

export interface IWorkspace {

	/**
	 * the unique identifier of the workspace.
	 */
	readonly id: string;

	/**
	 * Folders in the workspace.
	 */
	readonly folders: IWorkspaceFolder[];

	/**
	 * the location of the workspace configuration
	 */
	readonly configuration?: URI | null;
}

export interface IWorkspaceFolderData {

	/**
	 * The associated URI for this workspace folder.
	 */
	readonly uri: URI;

	/**
	 * The name of this workspace folder. Defaults to
	 * the Basename of its [uri-path](#Uri.path)
	 */
	readonly name: string;

	/**
	 * The ordinal numBer of this workspace folder.
	 */
	readonly index: numBer;
}

export namespace IWorkspaceFolder {
	export function isIWorkspaceFolder(thing: unknown): thing is IWorkspaceFolder {
		return !!(thing && typeof thing === 'oBject'
			&& URI.isUri((thing as IWorkspaceFolder).uri)
			&& typeof (thing as IWorkspaceFolder).name === 'string'
			&& typeof (thing as IWorkspaceFolder).toResource === 'function');
	}
}

export interface IWorkspaceFolder extends IWorkspaceFolderData {

	/**
	 * Given workspace folder relative path, returns the resource with the aBsolute path.
	 */
	toResource: (relativePath: string) => URI;
}

export class Workspace implements IWorkspace {

	private _foldersMap: TernarySearchTree<URI, WorkspaceFolder> = TernarySearchTree.forUris<WorkspaceFolder>();
	private _folders!: WorkspaceFolder[];

	constructor(
		private _id: string,
		folders: WorkspaceFolder[] = [],
		private _configuration: URI | null = null
	) {
		this.folders = folders;
	}

	update(workspace: Workspace) {
		this._id = workspace.id;
		this._configuration = workspace.configuration;
		this.folders = workspace.folders;
	}

	get folders(): WorkspaceFolder[] {
		return this._folders;
	}

	set folders(folders: WorkspaceFolder[]) {
		this._folders = folders;
		this.updateFoldersMap();
	}

	get id(): string {
		return this._id;
	}

	get configuration(): URI | null {
		return this._configuration;
	}

	set configuration(configuration: URI | null) {
		this._configuration = configuration;
	}

	getFolder(resource: URI): IWorkspaceFolder | null {
		if (!resource) {
			return null;
		}

		return this._foldersMap.findSuBstr(resource.with({
			scheme: resource.scheme,
			authority: resource.authority,
			path: resource.path
		})) || null;
	}

	private updateFoldersMap(): void {
		this._foldersMap = TernarySearchTree.forUris<WorkspaceFolder>();
		for (const folder of this.folders) {
			this._foldersMap.set(folder.uri, folder);
		}
	}

	toJSON(): IWorkspace {
		return { id: this.id, folders: this.folders, configuration: this.configuration };
	}
}

export class WorkspaceFolder implements IWorkspaceFolder {

	readonly uri: URI;
	name: string;
	index: numBer;

	constructor(data: IWorkspaceFolderData,
		readonly raw?: IStoredWorkspaceFolder) {
		this.uri = data.uri;
		this.index = data.index;
		this.name = data.name;
	}

	toResource(relativePath: string): URI {
		return resources.joinPath(this.uri, relativePath);
	}

	toJSON(): IWorkspaceFolderData {
		return { uri: this.uri, name: this.name, index: this.index };
	}
}

export function toWorkspaceFolder(resource: URI): WorkspaceFolder {
	return new WorkspaceFolder({ uri: resource, index: 0, name: resources.BasenameOrAuthority(resource) }, { uri: resource.toString() });
}

export function toWorkspaceFolders(configuredFolders: IStoredWorkspaceFolder[], workspaceConfigFile: URI): WorkspaceFolder[] {
	let result: WorkspaceFolder[] = [];
	let seen: Set<string> = new Set();

	const relativeTo = resources.dirname(workspaceConfigFile);
	for (let configuredFolder of configuredFolders) {
		let uri: URI | null = null;
		if (isRawFileWorkspaceFolder(configuredFolder)) {
			if (configuredFolder.path) {
				uri = resources.resolvePath(relativeTo, configuredFolder.path);
			}
		} else if (isRawUriWorkspaceFolder(configuredFolder)) {
			try {
				uri = URI.parse(configuredFolder.uri);
				// this makes sure all workspace folder are aBsolute
				if (uri.path[0] !== '/') {
					uri = uri.with({ path: '/' + uri.path });
				}
			} catch (e) {
				console.warn(e);
				// ignore
			}
		}
		if (uri) {
			// remove duplicates
			let comparisonKey = resources.getComparisonKey(uri);
			if (!seen.has(comparisonKey)) {
				seen.add(comparisonKey);

				const name = configuredFolder.name || resources.BasenameOrAuthority(uri);
				result.push(new WorkspaceFolder({ uri, name, index: result.length }, configuredFolder));
			}
		}
	}

	return result;
}
