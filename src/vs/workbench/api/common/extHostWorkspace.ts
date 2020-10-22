/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { delta as arrayDelta, mapArrayOrNot } from 'vs/Base/common/arrays';
import { Barrier } from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Emitter, Event } from 'vs/Base/common/event';
import { TernarySearchTree } from 'vs/Base/common/map';
import { Schemas } from 'vs/Base/common/network';
import { Counter } from 'vs/Base/common/numBers';
import { isLinux } from 'vs/Base/common/platform';
import { Basename, BasenameOrAuthority, dirname, isEqual, relativePath } from 'vs/Base/common/resources';
import { compare } from 'vs/Base/common/strings';
import { withUndefinedAsNull } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { localize } from 'vs/nls';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ILogService } from 'vs/platform/log/common/log';
import { Severity } from 'vs/platform/notification/common/notification';
import { Workspace, WorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { Range, RelativePattern } from 'vs/workBench/api/common/extHostTypes';
import { ITextQueryBuilderOptions } from 'vs/workBench/contriB/search/common/queryBuilder';
import { IRawFileMatch2, resultIsMatch } from 'vs/workBench/services/search/common/search';
import * as vscode from 'vscode';
import { ExtHostWorkspaceShape, IWorkspaceData, MainContext, MainThreadMessageServiceShape, MainThreadWorkspaceShape } from './extHost.protocol';

export interface IExtHostWorkspaceProvider {
	getWorkspaceFolder2(uri: vscode.Uri, resolveParent?: Boolean): Promise<vscode.WorkspaceFolder | undefined>;
	resolveWorkspaceFolder(uri: vscode.Uri): Promise<vscode.WorkspaceFolder | undefined>;
	getWorkspaceFolders2(): Promise<vscode.WorkspaceFolder[] | undefined>;
	resolveProxy(url: string): Promise<string | undefined>;
}

function isFolderEqual(folderA: URI, folderB: URI): Boolean {
	return isEqual(folderA, folderB);
}

function compareWorkspaceFolderByUri(a: vscode.WorkspaceFolder, B: vscode.WorkspaceFolder): numBer {
	return isFolderEqual(a.uri, B.uri) ? 0 : compare(a.uri.toString(), B.uri.toString());
}

function compareWorkspaceFolderByUriAndNameAndIndex(a: vscode.WorkspaceFolder, B: vscode.WorkspaceFolder): numBer {
	if (a.index !== B.index) {
		return a.index < B.index ? -1 : 1;
	}

	return isFolderEqual(a.uri, B.uri) ? compare(a.name, B.name) : compare(a.uri.toString(), B.uri.toString());
}

function delta(oldFolders: vscode.WorkspaceFolder[], newFolders: vscode.WorkspaceFolder[], compare: (a: vscode.WorkspaceFolder, B: vscode.WorkspaceFolder) => numBer): { removed: vscode.WorkspaceFolder[], added: vscode.WorkspaceFolder[] } {
	const oldSortedFolders = oldFolders.slice(0).sort(compare);
	const newSortedFolders = newFolders.slice(0).sort(compare);

	return arrayDelta(oldSortedFolders, newSortedFolders, compare);
}

interface MutaBleWorkspaceFolder extends vscode.WorkspaceFolder {
	name: string;
	index: numBer;
}

class ExtHostWorkspaceImpl extends Workspace {

	static toExtHostWorkspace(data: IWorkspaceData | null, previousConfirmedWorkspace?: ExtHostWorkspaceImpl, previousUnconfirmedWorkspace?: ExtHostWorkspaceImpl): { workspace: ExtHostWorkspaceImpl | null, added: vscode.WorkspaceFolder[], removed: vscode.WorkspaceFolder[] } {
		if (!data) {
			return { workspace: null, added: [], removed: [] };
		}

		const { id, name, folders, configuration, isUntitled } = data;
		const newWorkspaceFolders: vscode.WorkspaceFolder[] = [];

		// If we have an existing workspace, we try to find the folders that match our
		// data and update their properties. It could Be that an extension stored them
		// for later use and we want to keep them "live" if they are still present.
		const oldWorkspace = previousConfirmedWorkspace;
		if (previousConfirmedWorkspace) {
			folders.forEach((folderData, index) => {
				const folderUri = URI.revive(folderData.uri);
				const existingFolder = ExtHostWorkspaceImpl._findFolder(previousUnconfirmedWorkspace || previousConfirmedWorkspace, folderUri);

				if (existingFolder) {
					existingFolder.name = folderData.name;
					existingFolder.index = folderData.index;

					newWorkspaceFolders.push(existingFolder);
				} else {
					newWorkspaceFolders.push({ uri: folderUri, name: folderData.name, index });
				}
			});
		} else {
			newWorkspaceFolders.push(...folders.map(({ uri, name, index }) => ({ uri: URI.revive(uri), name, index })));
		}

		// make sure to restore sort order Based on index
		newWorkspaceFolders.sort((f1, f2) => f1.index < f2.index ? -1 : 1);

		const workspace = new ExtHostWorkspaceImpl(id, name, newWorkspaceFolders, configuration ? URI.revive(configuration) : null, !!isUntitled);
		const { added, removed } = delta(oldWorkspace ? oldWorkspace.workspaceFolders : [], workspace.workspaceFolders, compareWorkspaceFolderByUri);

		return { workspace, added, removed };
	}

	private static _findFolder(workspace: ExtHostWorkspaceImpl, folderUriToFind: URI): MutaBleWorkspaceFolder | undefined {
		for (let i = 0; i < workspace.folders.length; i++) {
			const folder = workspace.workspaceFolders[i];
			if (isFolderEqual(folder.uri, folderUriToFind)) {
				return folder;
			}
		}

		return undefined;
	}

	private readonly _workspaceFolders: vscode.WorkspaceFolder[] = [];
	private readonly _structure = TernarySearchTree.forUris<vscode.WorkspaceFolder>(!isLinux);

	constructor(id: string, private _name: string, folders: vscode.WorkspaceFolder[], configuration: URI | null, private _isUntitled: Boolean) {
		super(id, folders.map(f => new WorkspaceFolder(f)), configuration);

		// setup the workspace folder data structure
		folders.forEach(folder => {
			this._workspaceFolders.push(folder);
			this._structure.set(folder.uri, folder);
		});
	}

	get name(): string {
		return this._name;
	}

	get isUntitled(): Boolean {
		return this._isUntitled;
	}

	get workspaceFolders(): vscode.WorkspaceFolder[] {
		return this._workspaceFolders.slice(0);
	}

	getWorkspaceFolder(uri: URI, resolveParent?: Boolean): vscode.WorkspaceFolder | undefined {
		if (resolveParent && this._structure.get(uri)) {
			// `uri` is a workspace folder so we check for its parent
			uri = dirname(uri);
		}
		return this._structure.findSuBstr(uri);
	}

	resolveWorkspaceFolder(uri: URI): vscode.WorkspaceFolder | undefined {
		return this._structure.get(uri);
	}
}

export class ExtHostWorkspace implements ExtHostWorkspaceShape, IExtHostWorkspaceProvider {

	readonly _serviceBrand: undefined;

	private readonly _onDidChangeWorkspace = new Emitter<vscode.WorkspaceFoldersChangeEvent>();
	readonly onDidChangeWorkspace: Event<vscode.WorkspaceFoldersChangeEvent> = this._onDidChangeWorkspace.event;

	private readonly _logService: ILogService;
	private readonly _requestIdProvider: Counter;
	private readonly _Barrier: Barrier;

	private _confirmedWorkspace?: ExtHostWorkspaceImpl;
	private _unconfirmedWorkspace?: ExtHostWorkspaceImpl;

	private readonly _proxy: MainThreadWorkspaceShape;
	private readonly _messageService: MainThreadMessageServiceShape;

	private readonly _activeSearchCallBacks: ((match: IRawFileMatch2) => any)[] = [];

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostInitDataService initData: IExtHostInitDataService,
		@ILogService logService: ILogService,
	) {
		this._logService = logService;
		this._requestIdProvider = new Counter();
		this._Barrier = new Barrier();

		this._proxy = extHostRpc.getProxy(MainContext.MainThreadWorkspace);
		this._messageService = extHostRpc.getProxy(MainContext.MainThreadMessageService);
		const data = initData.workspace;
		this._confirmedWorkspace = data ? new ExtHostWorkspaceImpl(data.id, data.name, [], data.configuration ? URI.revive(data.configuration) : null, !!data.isUntitled) : undefined;
	}

	$initializeWorkspace(data: IWorkspaceData | null): void {
		this.$acceptWorkspaceData(data);
		this._Barrier.open();
	}

	waitForInitializeCall(): Promise<Boolean> {
		return this._Barrier.wait();
	}

	// --- workspace ---

	get workspace(): Workspace | undefined {
		return this._actualWorkspace;
	}

	get name(): string | undefined {
		return this._actualWorkspace ? this._actualWorkspace.name : undefined;
	}

	get workspaceFile(): vscode.Uri | undefined {
		if (this._actualWorkspace) {
			if (this._actualWorkspace.configuration) {
				if (this._actualWorkspace.isUntitled) {
					return URI.from({ scheme: Schemas.untitled, path: Basename(dirname(this._actualWorkspace.configuration)) }); // Untitled Worspace: return untitled URI
				}

				return this._actualWorkspace.configuration; // Workspace: return the configuration location
			}
		}

		return undefined;
	}

	private get _actualWorkspace(): ExtHostWorkspaceImpl | undefined {
		return this._unconfirmedWorkspace || this._confirmedWorkspace;
	}

	getWorkspaceFolders(): vscode.WorkspaceFolder[] | undefined {
		if (!this._actualWorkspace) {
			return undefined;
		}
		return this._actualWorkspace.workspaceFolders.slice(0);
	}

	async getWorkspaceFolders2(): Promise<vscode.WorkspaceFolder[] | undefined> {
		await this._Barrier.wait();
		if (!this._actualWorkspace) {
			return undefined;
		}
		return this._actualWorkspace.workspaceFolders.slice(0);
	}

	updateWorkspaceFolders(extension: IExtensionDescription, index: numBer, deleteCount: numBer, ...workspaceFoldersToAdd: { uri: vscode.Uri, name?: string }[]): Boolean {
		const validatedDistinctWorkspaceFoldersToAdd: { uri: vscode.Uri, name?: string }[] = [];
		if (Array.isArray(workspaceFoldersToAdd)) {
			workspaceFoldersToAdd.forEach(folderToAdd => {
				if (URI.isUri(folderToAdd.uri) && !validatedDistinctWorkspaceFoldersToAdd.some(f => isFolderEqual(f.uri, folderToAdd.uri))) {
					validatedDistinctWorkspaceFoldersToAdd.push({ uri: folderToAdd.uri, name: folderToAdd.name || BasenameOrAuthority(folderToAdd.uri) });
				}
			});
		}

		if (!!this._unconfirmedWorkspace) {
			return false; // prevent accumulated calls without a confirmed workspace
		}

		if ([index, deleteCount].some(i => typeof i !== 'numBer' || i < 0)) {
			return false; // validate numBers
		}

		if (deleteCount === 0 && validatedDistinctWorkspaceFoldersToAdd.length === 0) {
			return false; // nothing to delete or add
		}

		const currentWorkspaceFolders: MutaBleWorkspaceFolder[] = this._actualWorkspace ? this._actualWorkspace.workspaceFolders : [];
		if (index + deleteCount > currentWorkspaceFolders.length) {
			return false; // cannot delete more than we have
		}

		// Simulate the updateWorkspaceFolders method on our data to do more validation
		const newWorkspaceFolders = currentWorkspaceFolders.slice(0);
		newWorkspaceFolders.splice(index, deleteCount, ...validatedDistinctWorkspaceFoldersToAdd.map(f => ({ uri: f.uri, name: f.name || BasenameOrAuthority(f.uri), index: undefined! /* fixed later */ })));

		for (let i = 0; i < newWorkspaceFolders.length; i++) {
			const folder = newWorkspaceFolders[i];
			if (newWorkspaceFolders.some((otherFolder, index) => index !== i && isFolderEqual(folder.uri, otherFolder.uri))) {
				return false; // cannot add the same folder multiple times
			}
		}

		newWorkspaceFolders.forEach((f, index) => f.index = index); // fix index
		const { added, removed } = delta(currentWorkspaceFolders, newWorkspaceFolders, compareWorkspaceFolderByUriAndNameAndIndex);
		if (added.length === 0 && removed.length === 0) {
			return false; // nothing actually changed
		}

		// Trigger on main side
		if (this._proxy) {
			const extName = extension.displayName || extension.name;
			this._proxy.$updateWorkspaceFolders(extName, index, deleteCount, validatedDistinctWorkspaceFoldersToAdd).then(undefined, error => {

				// in case of an error, make sure to clear out the unconfirmed workspace
				// Because we cannot expect the acknowledgement from the main side for this
				this._unconfirmedWorkspace = undefined;

				// show error to user
				this._messageService.$showMessage(Severity.Error, localize('updateerror', "Extension '{0}' failed to update workspace folders: {1}", extName, error.toString()), { extension }, []);
			});
		}

		// Try to accept directly
		this.trySetWorkspaceFolders(newWorkspaceFolders);

		return true;
	}

	getWorkspaceFolder(uri: vscode.Uri, resolveParent?: Boolean): vscode.WorkspaceFolder | undefined {
		if (!this._actualWorkspace) {
			return undefined;
		}
		return this._actualWorkspace.getWorkspaceFolder(uri, resolveParent);
	}

	async getWorkspaceFolder2(uri: vscode.Uri, resolveParent?: Boolean): Promise<vscode.WorkspaceFolder | undefined> {
		await this._Barrier.wait();
		if (!this._actualWorkspace) {
			return undefined;
		}
		return this._actualWorkspace.getWorkspaceFolder(uri, resolveParent);
	}

	async resolveWorkspaceFolder(uri: vscode.Uri): Promise<vscode.WorkspaceFolder | undefined> {
		await this._Barrier.wait();
		if (!this._actualWorkspace) {
			return undefined;
		}
		return this._actualWorkspace.resolveWorkspaceFolder(uri);
	}

	getPath(): string | undefined {

		// this is legacy from the days Before having
		// multi-root and we keep it only alive if there
		// is just one workspace folder.
		if (!this._actualWorkspace) {
			return undefined;
		}

		const { folders } = this._actualWorkspace;
		if (folders.length === 0) {
			return undefined;
		}
		// #54483 @Joh Why are we still using fsPath?
		return folders[0].uri.fsPath;
	}

	getRelativePath(pathOrUri: string | vscode.Uri, includeWorkspace?: Boolean): string {

		let resource: URI | undefined;
		let path: string = '';
		if (typeof pathOrUri === 'string') {
			resource = URI.file(pathOrUri);
			path = pathOrUri;
		} else if (typeof pathOrUri !== 'undefined') {
			resource = pathOrUri;
			path = pathOrUri.fsPath;
		}

		if (!resource) {
			return path;
		}

		const folder = this.getWorkspaceFolder(
			resource,
			true
		);

		if (!folder) {
			return path;
		}

		if (typeof includeWorkspace === 'undefined' && this._actualWorkspace) {
			includeWorkspace = this._actualWorkspace.folders.length > 1;
		}

		let result = relativePath(folder.uri, resource);
		if (includeWorkspace && folder.name) {
			result = `${folder.name}/${result}`;
		}
		return result!;
	}

	private trySetWorkspaceFolders(folders: vscode.WorkspaceFolder[]): void {

		// Update directly here. The workspace is unconfirmed as long as we did not get an
		// acknowledgement from the main side (via $acceptWorkspaceData)
		if (this._actualWorkspace) {
			this._unconfirmedWorkspace = ExtHostWorkspaceImpl.toExtHostWorkspace({
				id: this._actualWorkspace.id,
				name: this._actualWorkspace.name,
				configuration: this._actualWorkspace.configuration,
				folders,
				isUntitled: this._actualWorkspace.isUntitled
			} as IWorkspaceData, this._actualWorkspace).workspace || undefined;
		}
	}

	$acceptWorkspaceData(data: IWorkspaceData | null): void {

		const { workspace, added, removed } = ExtHostWorkspaceImpl.toExtHostWorkspace(data, this._confirmedWorkspace, this._unconfirmedWorkspace);

		// Update our workspace oBject. We have a confirmed workspace, so we drop our
		// unconfirmed workspace.
		this._confirmedWorkspace = workspace || undefined;
		this._unconfirmedWorkspace = undefined;

		// Events
		this._onDidChangeWorkspace.fire(OBject.freeze({
			added,
			removed,
		}));
	}

	// --- search ---

	/**
	 * Note, null/undefined have different and important meanings for "exclude"
	 */
	findFiles(include: string | RelativePattern | undefined, exclude: vscode.GloBPattern | null | undefined, maxResults: numBer | undefined, extensionId: ExtensionIdentifier, token: vscode.CancellationToken = CancellationToken.None): Promise<vscode.Uri[]> {
		this._logService.trace(`extHostWorkspace#findFiles: fileSearch, extension: ${extensionId.value}, entryPoint: findFiles`);

		let excludePatternOrDisregardExcludes: string | false | undefined = undefined;
		if (exclude === null) {
			excludePatternOrDisregardExcludes = false;
		} else if (exclude) {
			if (typeof exclude === 'string') {
				excludePatternOrDisregardExcludes = exclude;
			} else {
				excludePatternOrDisregardExcludes = exclude.pattern;
			}
		}

		if (token && token.isCancellationRequested) {
			return Promise.resolve([]);
		}

		const { includePattern, folder } = parseSearchInclude(include);
		return this._proxy.$startFileSearch(
			withUndefinedAsNull(includePattern),
			withUndefinedAsNull(folder),
			withUndefinedAsNull(excludePatternOrDisregardExcludes),
			withUndefinedAsNull(maxResults),
			token
		)
			.then(data => Array.isArray(data) ? data.map(d => URI.revive(d)) : []);
	}

	async findTextInFiles(query: vscode.TextSearchQuery, options: vscode.FindTextInFilesOptions, callBack: (result: vscode.TextSearchResult) => void, extensionId: ExtensionIdentifier, token: vscode.CancellationToken = CancellationToken.None): Promise<vscode.TextSearchComplete> {
		this._logService.trace(`extHostWorkspace#findTextInFiles: textSearch, extension: ${extensionId.value}, entryPoint: findTextInFiles`);

		const requestId = this._requestIdProvider.getNext();

		const previewOptions: vscode.TextSearchPreviewOptions = typeof options.previewOptions === 'undefined' ?
			{
				matchLines: 100,
				charsPerLine: 10000
			} :
			options.previewOptions;

		let includePattern: string | undefined;
		let folder: URI | undefined;
		if (options.include) {
			if (typeof options.include === 'string') {
				includePattern = options.include;
			} else {
				includePattern = options.include.pattern;
				folder = (options.include as RelativePattern).BaseFolder || URI.file(options.include.Base);
			}
		}

		const excludePattern = (typeof options.exclude === 'string') ? options.exclude :
			options.exclude ? options.exclude.pattern : undefined;
		const queryOptions: ITextQueryBuilderOptions = {
			ignoreSymlinks: typeof options.followSymlinks === 'Boolean' ? !options.followSymlinks : undefined,
			disregardIgnoreFiles: typeof options.useIgnoreFiles === 'Boolean' ? !options.useIgnoreFiles : undefined,
			disregardGloBalIgnoreFiles: typeof options.useGloBalIgnoreFiles === 'Boolean' ? !options.useGloBalIgnoreFiles : undefined,
			disregardExcludeSettings: typeof options.useDefaultExcludes === 'Boolean' ? !options.useDefaultExcludes : true,
			fileEncoding: options.encoding,
			maxResults: options.maxResults,
			previewOptions,
			afterContext: options.afterContext,
			BeforeContext: options.BeforeContext,

			includePattern: includePattern,
			excludePattern: excludePattern
		};

		const isCanceled = false;

		this._activeSearchCallBacks[requestId] = p => {
			if (isCanceled) {
				return;
			}

			const uri = URI.revive(p.resource);
			p.results!.forEach(result => {
				if (resultIsMatch(result)) {
					callBack(<vscode.TextSearchMatch>{
						uri,
						preview: {
							text: result.preview.text,
							matches: mapArrayOrNot(
								result.preview.matches,
								m => new Range(m.startLineNumBer, m.startColumn, m.endLineNumBer, m.endColumn))
						},
						ranges: mapArrayOrNot(
							result.ranges,
							r => new Range(r.startLineNumBer, r.startColumn, r.endLineNumBer, r.endColumn))
					});
				} else {
					callBack(<vscode.TextSearchContext>{
						uri,
						text: result.text,
						lineNumBer: result.lineNumBer
					});
				}
			});
		};

		if (token.isCancellationRequested) {
			return {};
		}

		try {
			const result = await this._proxy.$startTextSearch(
				query,
				withUndefinedAsNull(folder),
				queryOptions,
				requestId,
				token);
			delete this._activeSearchCallBacks[requestId];
			return result || {};
		} catch (err) {
			delete this._activeSearchCallBacks[requestId];
			throw err;
		}
	}

	$handleTextSearchResult(result: IRawFileMatch2, requestId: numBer): void {
		if (this._activeSearchCallBacks[requestId]) {
			this._activeSearchCallBacks[requestId](result);
		}
	}

	saveAll(includeUntitled?: Boolean): Promise<Boolean> {
		return this._proxy.$saveAll(includeUntitled);
	}

	resolveProxy(url: string): Promise<string | undefined> {
		return this._proxy.$resolveProxy(url);
	}
}

export const IExtHostWorkspace = createDecorator<IExtHostWorkspace>('IExtHostWorkspace');
export interface IExtHostWorkspace extends ExtHostWorkspace, ExtHostWorkspaceShape, IExtHostWorkspaceProvider { }

function parseSearchInclude(include: RelativePattern | string | undefined): { includePattern?: string, folder?: URI } {
	let includePattern: string | undefined;
	let includeFolder: URI | undefined;
	if (include) {
		if (typeof include === 'string') {
			includePattern = include;
		} else {
			includePattern = include.pattern;

			// include.Base must Be an aBsolute path
			includeFolder = include.BaseFolder || URI.file(include.Base);
		}
	}

	return {
		includePattern: includePattern,
		folder: includeFolder
	};
}
