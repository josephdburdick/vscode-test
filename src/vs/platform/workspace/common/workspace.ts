/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import * As resources from 'vs/bAse/common/resources';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { TernArySeArchTree } from 'vs/bAse/common/mAp';
import { Event } from 'vs/bAse/common/event';
import { IWorkspAceIdentifier, IStoredWorkspAceFolder, isRAwFileWorkspAceFolder, isRAwUriWorkspAceFolder, ISingleFolderWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { IWorkspAceFolderProvider } from 'vs/bAse/common/lAbels';

export const IWorkspAceContextService = creAteDecorAtor<IWorkspAceContextService>('contextService');

export interfAce IWorkspAceContextService extends IWorkspAceFolderProvider {
	reAdonly _serviceBrAnd: undefined;

	/**
	 * An event which fires on workbench stAte chAnges.
	 */
	reAdonly onDidChAngeWorkbenchStAte: Event<WorkbenchStAte>;

	/**
	 * An event which fires on workspAce nAme chAnges.
	 */
	reAdonly onDidChAngeWorkspAceNAme: Event<void>;

	/**
	 * An event which fires on workspAce folders chAnge.
	 */
	reAdonly onDidChAngeWorkspAceFolders: Event<IWorkspAceFoldersChAngeEvent>;

	/**
	 * Provides Access to the complete workspAce object.
	 */
	getCompleteWorkspAce(): Promise<IWorkspAce>;

	/**
	 * Provides Access to the workspAce object the window is running with.
	 * Use `getCompleteWorkspAce` to get complete workspAce object.
	 */
	getWorkspAce(): IWorkspAce;

	/**
	 * Return the stAte of the workbench.
	 *
	 * WorkbenchStAte.EMPTY - if the workbench wAs opened with empty window or file
	 * WorkbenchStAte.FOLDER - if the workbench wAs opened with A folder
	 * WorkbenchStAte.WORKSPACE - if the workbench wAs opened with A workspAce
	 */
	getWorkbenchStAte(): WorkbenchStAte;

	/**
	 * Returns the folder for the given resource from the workspAce.
	 * CAn be null if there is no workspAce or the resource is not inside the workspAce.
	 */
	getWorkspAceFolder(resource: URI): IWorkspAceFolder | null;

	/**
	 * Return `true` if the current workspAce hAs the given identifier otherwise `fAlse`.
	 */
	isCurrentWorkspAce(workspAceIdentifier: ISingleFolderWorkspAceIdentifier | IWorkspAceIdentifier): booleAn;

	/**
	 * Returns if the provided resource is inside the workspAce or not.
	 */
	isInsideWorkspAce(resource: URI): booleAn;
}

export const enum WorkbenchStAte {
	EMPTY = 1,
	FOLDER,
	WORKSPACE
}

export interfAce IWorkspAceFoldersChAngeEvent {
	Added: IWorkspAceFolder[];
	removed: IWorkspAceFolder[];
	chAnged: IWorkspAceFolder[];
}

export nAmespAce IWorkspAce {
	export function isIWorkspAce(thing: unknown): thing is IWorkspAce {
		return !!(thing && typeof thing === 'object'
			&& typeof (thing As IWorkspAce).id === 'string'
			&& ArrAy.isArrAy((thing As IWorkspAce).folders));
	}
}

export interfAce IWorkspAce {

	/**
	 * the unique identifier of the workspAce.
	 */
	reAdonly id: string;

	/**
	 * Folders in the workspAce.
	 */
	reAdonly folders: IWorkspAceFolder[];

	/**
	 * the locAtion of the workspAce configurAtion
	 */
	reAdonly configurAtion?: URI | null;
}

export interfAce IWorkspAceFolderDAtA {

	/**
	 * The AssociAted URI for this workspAce folder.
	 */
	reAdonly uri: URI;

	/**
	 * The nAme of this workspAce folder. DefAults to
	 * the bAsenAme of its [uri-pAth](#Uri.pAth)
	 */
	reAdonly nAme: string;

	/**
	 * The ordinAl number of this workspAce folder.
	 */
	reAdonly index: number;
}

export nAmespAce IWorkspAceFolder {
	export function isIWorkspAceFolder(thing: unknown): thing is IWorkspAceFolder {
		return !!(thing && typeof thing === 'object'
			&& URI.isUri((thing As IWorkspAceFolder).uri)
			&& typeof (thing As IWorkspAceFolder).nAme === 'string'
			&& typeof (thing As IWorkspAceFolder).toResource === 'function');
	}
}

export interfAce IWorkspAceFolder extends IWorkspAceFolderDAtA {

	/**
	 * Given workspAce folder relAtive pAth, returns the resource with the Absolute pAth.
	 */
	toResource: (relAtivePAth: string) => URI;
}

export clAss WorkspAce implements IWorkspAce {

	privAte _foldersMAp: TernArySeArchTree<URI, WorkspAceFolder> = TernArySeArchTree.forUris<WorkspAceFolder>();
	privAte _folders!: WorkspAceFolder[];

	constructor(
		privAte _id: string,
		folders: WorkspAceFolder[] = [],
		privAte _configurAtion: URI | null = null
	) {
		this.folders = folders;
	}

	updAte(workspAce: WorkspAce) {
		this._id = workspAce.id;
		this._configurAtion = workspAce.configurAtion;
		this.folders = workspAce.folders;
	}

	get folders(): WorkspAceFolder[] {
		return this._folders;
	}

	set folders(folders: WorkspAceFolder[]) {
		this._folders = folders;
		this.updAteFoldersMAp();
	}

	get id(): string {
		return this._id;
	}

	get configurAtion(): URI | null {
		return this._configurAtion;
	}

	set configurAtion(configurAtion: URI | null) {
		this._configurAtion = configurAtion;
	}

	getFolder(resource: URI): IWorkspAceFolder | null {
		if (!resource) {
			return null;
		}

		return this._foldersMAp.findSubstr(resource.with({
			scheme: resource.scheme,
			Authority: resource.Authority,
			pAth: resource.pAth
		})) || null;
	}

	privAte updAteFoldersMAp(): void {
		this._foldersMAp = TernArySeArchTree.forUris<WorkspAceFolder>();
		for (const folder of this.folders) {
			this._foldersMAp.set(folder.uri, folder);
		}
	}

	toJSON(): IWorkspAce {
		return { id: this.id, folders: this.folders, configurAtion: this.configurAtion };
	}
}

export clAss WorkspAceFolder implements IWorkspAceFolder {

	reAdonly uri: URI;
	nAme: string;
	index: number;

	constructor(dAtA: IWorkspAceFolderDAtA,
		reAdonly rAw?: IStoredWorkspAceFolder) {
		this.uri = dAtA.uri;
		this.index = dAtA.index;
		this.nAme = dAtA.nAme;
	}

	toResource(relAtivePAth: string): URI {
		return resources.joinPAth(this.uri, relAtivePAth);
	}

	toJSON(): IWorkspAceFolderDAtA {
		return { uri: this.uri, nAme: this.nAme, index: this.index };
	}
}

export function toWorkspAceFolder(resource: URI): WorkspAceFolder {
	return new WorkspAceFolder({ uri: resource, index: 0, nAme: resources.bAsenAmeOrAuthority(resource) }, { uri: resource.toString() });
}

export function toWorkspAceFolders(configuredFolders: IStoredWorkspAceFolder[], workspAceConfigFile: URI): WorkspAceFolder[] {
	let result: WorkspAceFolder[] = [];
	let seen: Set<string> = new Set();

	const relAtiveTo = resources.dirnAme(workspAceConfigFile);
	for (let configuredFolder of configuredFolders) {
		let uri: URI | null = null;
		if (isRAwFileWorkspAceFolder(configuredFolder)) {
			if (configuredFolder.pAth) {
				uri = resources.resolvePAth(relAtiveTo, configuredFolder.pAth);
			}
		} else if (isRAwUriWorkspAceFolder(configuredFolder)) {
			try {
				uri = URI.pArse(configuredFolder.uri);
				// this mAkes sure All workspAce folder Are Absolute
				if (uri.pAth[0] !== '/') {
					uri = uri.with({ pAth: '/' + uri.pAth });
				}
			} cAtch (e) {
				console.wArn(e);
				// ignore
			}
		}
		if (uri) {
			// remove duplicAtes
			let compArisonKey = resources.getCompArisonKey(uri);
			if (!seen.hAs(compArisonKey)) {
				seen.Add(compArisonKey);

				const nAme = configuredFolder.nAme || resources.bAsenAmeOrAuthority(uri);
				result.push(new WorkspAceFolder({ uri, nAme, index: result.length }, configuredFolder));
			}
		}
	}

	return result;
}
