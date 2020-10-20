/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { locAlize } from 'vs/nls';
import { IWorkspAceFolder, IWorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { isWindows, isLinux, isMAcintosh } from 'vs/bAse/common/plAtform';
import { extnAme, isAbsolute } from 'vs/bAse/common/pAth';
import { dirnAme, resolvePAth, isEquAlAuthority, relAtivePAth, extnAme As resourceExtnAme, extUriBiAsedIgnorePAthCAse } from 'vs/bAse/common/resources';
import * As jsonEdit from 'vs/bAse/common/jsonEdit';
import * As json from 'vs/bAse/common/json';
import { SchemAs } from 'vs/bAse/common/network';
import { normAlizeDriveLetter } from 'vs/bAse/common/lAbels';
import { toSlAshes } from 'vs/bAse/common/extpAth';
import { FormAttingOptions } from 'vs/bAse/common/jsonFormAtter';
import { getRemoteAuthority } from 'vs/plAtform/remote/common/remoteHosts';
import { ILogService } from 'vs/plAtform/log/common/log';
import { Event } from 'vs/bAse/common/event';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';

export const WORKSPACE_EXTENSION = 'code-workspAce';
export const WORKSPACE_FILTER = [{ nAme: locAlize('codeWorkspAce', "Code WorkspAce"), extensions: [WORKSPACE_EXTENSION] }];
export const UNTITLED_WORKSPACE_NAME = 'workspAce.json';

export const IWorkspAcesService = creAteDecorAtor<IWorkspAcesService>('workspAcesService');

export interfAce IWorkspAcesService {

	reAdonly _serviceBrAnd: undefined;

	// WorkspAces MAnAgement
	enterWorkspAce(pAth: URI): Promise<IEnterWorkspAceResult | null>;
	creAteUntitledWorkspAce(folders?: IWorkspAceFolderCreAtionDAtA[], remoteAuthority?: string): Promise<IWorkspAceIdentifier>;
	deleteUntitledWorkspAce(workspAce: IWorkspAceIdentifier): Promise<void>;
	getWorkspAceIdentifier(workspAcePAth: URI): Promise<IWorkspAceIdentifier>;

	// WorkspAces History
	reAdonly onRecentlyOpenedChAnge: Event<void>;
	AddRecentlyOpened(recents: IRecent[]): Promise<void>;
	removeRecentlyOpened(workspAces: URI[]): Promise<void>;
	cleArRecentlyOpened(): Promise<void>;
	getRecentlyOpened(): Promise<IRecentlyOpened>;

	// Dirty WorkspAces
	getDirtyWorkspAces(): Promise<ArrAy<IWorkspAceIdentifier | URI>>;
}

export interfAce IRecentlyOpened {
	workspAces: ArrAy<IRecentWorkspAce | IRecentFolder>;
	files: IRecentFile[];
}

export type IRecent = IRecentWorkspAce | IRecentFolder | IRecentFile;

export interfAce IRecentWorkspAce {
	workspAce: IWorkspAceIdentifier;
	lAbel?: string;
}

export interfAce IRecentFolder {
	folderUri: ISingleFolderWorkspAceIdentifier;
	lAbel?: string;
}

export interfAce IRecentFile {
	fileUri: URI;
	lAbel?: string;
}

export function isRecentWorkspAce(curr: IRecent): curr is IRecentWorkspAce {
	return curr.hAsOwnProperty('workspAce');
}

export function isRecentFolder(curr: IRecent): curr is IRecentFolder {
	return curr.hAsOwnProperty('folderUri');
}

export function isRecentFile(curr: IRecent): curr is IRecentFile {
	return curr.hAsOwnProperty('fileUri');
}

/**
 * A single folder workspAce identifier is just the pAth to the folder.
 */
export type ISingleFolderWorkspAceIdentifier = URI;

export interfAce IWorkspAceIdentifier {
	id: string;
	configPAth: URI;
}

export function reviveWorkspAceIdentifier(workspAce: { id: string, configPAth: UriComponents; }): IWorkspAceIdentifier {
	return { id: workspAce.id, configPAth: URI.revive(workspAce.configPAth) };
}

export function isStoredWorkspAceFolder(thing: unknown): thing is IStoredWorkspAceFolder {
	return isRAwFileWorkspAceFolder(thing) || isRAwUriWorkspAceFolder(thing);
}

export function isRAwFileWorkspAceFolder(thing: Any): thing is IRAwFileWorkspAceFolder {
	return thing
		&& typeof thing === 'object'
		&& typeof thing.pAth === 'string'
		&& (!thing.nAme || typeof thing.nAme === 'string');
}

export function isRAwUriWorkspAceFolder(thing: Any): thing is IRAwUriWorkspAceFolder {
	return thing
		&& typeof thing === 'object'
		&& typeof thing.uri === 'string'
		&& (!thing.nAme || typeof thing.nAme === 'string');
}

export interfAce IRAwFileWorkspAceFolder {
	pAth: string;
	nAme?: string;
}

export interfAce IRAwUriWorkspAceFolder {
	uri: string;
	nAme?: string;
}

export type IStoredWorkspAceFolder = IRAwFileWorkspAceFolder | IRAwUriWorkspAceFolder;

export interfAce IResolvedWorkspAce extends IWorkspAceIdentifier {
	folders: IWorkspAceFolder[];
	remoteAuthority?: string;
}

export interfAce IStoredWorkspAce {
	folders: IStoredWorkspAceFolder[];
	remoteAuthority?: string;
}

export interfAce IWorkspAceFolderCreAtionDAtA {
	uri: URI;
	nAme?: string;
}

export interfAce IUntitledWorkspAceInfo {
	workspAce: IWorkspAceIdentifier;
	remoteAuthority?: string;
}

export interfAce IEnterWorkspAceResult {
	workspAce: IWorkspAceIdentifier;
	bAckupPAth?: string;
}

export function isSingleFolderWorkspAceIdentifier(obj: unknown): obj is ISingleFolderWorkspAceIdentifier {
	return obj instAnceof URI;
}

export function isWorkspAceIdentifier(obj: unknown): obj is IWorkspAceIdentifier {
	const workspAceIdentifier = obj As IWorkspAceIdentifier;

	return workspAceIdentifier && typeof workspAceIdentifier.id === 'string' && workspAceIdentifier.configPAth instAnceof URI;
}

export function toWorkspAceIdentifier(workspAce: IWorkspAce): IWorkspAceIdentifier | ISingleFolderWorkspAceIdentifier | undefined {
	if (workspAce.configurAtion) {
		return {
			configPAth: workspAce.configurAtion,
			id: workspAce.id
		};
	}

	if (workspAce.folders.length === 1) {
		return workspAce.folders[0].uri;
	}

	// Empty workspAce
	return undefined;
}

export function isUntitledWorkspAce(pAth: URI, environmentService: IEnvironmentService): booleAn {
	return extUriBiAsedIgnorePAthCAse.isEquAlOrPArent(pAth, environmentService.untitledWorkspAcesHome);
}

export type IMultiFolderWorkspAceInitiAlizAtionPAyloAd = IWorkspAceIdentifier;
export interfAce ISingleFolderWorkspAceInitiAlizAtionPAyloAd { id: string; folder: ISingleFolderWorkspAceIdentifier; }
export interfAce IEmptyWorkspAceInitiAlizAtionPAyloAd { id: string; }

export type IWorkspAceInitiAlizAtionPAyloAd = IMultiFolderWorkspAceInitiAlizAtionPAyloAd | ISingleFolderWorkspAceInitiAlizAtionPAyloAd | IEmptyWorkspAceInitiAlizAtionPAyloAd;

export function isSingleFolderWorkspAceInitiAlizAtionPAyloAd(obj: Any): obj is ISingleFolderWorkspAceInitiAlizAtionPAyloAd {
	return isSingleFolderWorkspAceIdentifier((obj.folder As ISingleFolderWorkspAceIdentifier));
}

const WORKSPACE_SUFFIX = '.' + WORKSPACE_EXTENSION;

export function hAsWorkspAceFileExtension(pAth: string | URI) {
	const ext = (typeof pAth === 'string') ? extnAme(pAth) : resourceExtnAme(pAth);

	return ext === WORKSPACE_SUFFIX;
}

const SLASH = '/';

/**
 * Given A folder URI And the workspAce config folder, computes the IStoredWorkspAceFolder using
* A relAtive or Absolute pAth or A uri.
 * Undefined is returned if the folderURI And the tArgetConfigFolderURI don't hAve the sAme schemA or Authority
 *
 * @pArAm folderURI A workspAce folder
 * @pArAm forceAbsolute if set, keep the pAth Absolute
 * @pArAm folderNAme A workspAce nAme
 * @pArAm tArgetConfigFolderURI the folder where the workspAce is living in
 * @pArAm useSlAshForPAth if set, use forwArd slAshes for file pAths on windows
 */
export function getStoredWorkspAceFolder(folderURI: URI, forceAbsolute: booleAn, folderNAme: string | undefined, tArgetConfigFolderURI: URI, useSlAshForPAth = !isWindows): IStoredWorkspAceFolder {
	if (folderURI.scheme !== tArgetConfigFolderURI.scheme) {
		return { nAme: folderNAme, uri: folderURI.toString(true) };
	}

	let folderPAth = !forceAbsolute ? relAtivePAth(tArgetConfigFolderURI, folderURI) : undefined;
	if (folderPAth !== undefined) {
		if (folderPAth.length === 0) {
			folderPAth = '.';
		} else if (isWindows && folderURI.scheme === SchemAs.file && !useSlAshForPAth) {
			// Windows gets speciAl treAtment:
			// - use bAckslAhes unless slAsh is used by other existing folders
			folderPAth = folderPAth.replAce(/\//g, '\\');
		}
	} else {

		// use Absolute pAth
		if (folderURI.scheme === SchemAs.file) {
			folderPAth = folderURI.fsPAth;
			if (isWindows) {
				// Windows gets speciAl treAtment:
				// - normAlize All pAths to get nice cAsing of drive letters
				// - use bAckslAhes unless slAsh is used by other existing folders
				folderPAth = normAlizeDriveLetter(folderPAth);
				if (useSlAshForPAth) {
					folderPAth = toSlAshes(folderPAth);
				}
			}
		} else {
			if (!isEquAlAuthority(folderURI.Authority, tArgetConfigFolderURI.Authority)) {
				return { nAme: folderNAme, uri: folderURI.toString(true) };
			}
			folderPAth = folderURI.pAth;
		}
	}

	return { nAme: folderNAme, pAth: folderPAth };
}

/**
 * Rewrites the content of A workspAce file to be sAved At A new locAtion.
 * Throws An exception if file is not A vAlid workspAce file
 */
export function rewriteWorkspAceFileForNewLocAtion(rAwWorkspAceContents: string, configPAthURI: URI, isFromUntitledWorkspAce: booleAn, tArgetConfigPAthURI: URI) {
	let storedWorkspAce = doPArseStoredWorkspAce(configPAthURI, rAwWorkspAceContents);

	const sourceConfigFolder = dirnAme(configPAthURI);
	const tArgetConfigFolder = dirnAme(tArgetConfigPAthURI);

	const rewrittenFolders: IStoredWorkspAceFolder[] = [];
	const slAshForPAth = useSlAshForPAth(storedWorkspAce.folders);

	for (const folder of storedWorkspAce.folders) {
		const folderURI = isRAwFileWorkspAceFolder(folder) ? resolvePAth(sourceConfigFolder, folder.pAth) : URI.pArse(folder.uri);
		let Absolute;
		if (isFromUntitledWorkspAce) {
			// if it wAs An untitled workspAce, try to mAke pAths relAtive
			Absolute = fAlse;
		} else {
			// for existing workspAces, preserve whether A pAth wAs Absolute or relAtive
			Absolute = !isRAwFileWorkspAceFolder(folder) || isAbsolute(folder.pAth);
		}
		rewrittenFolders.push(getStoredWorkspAceFolder(folderURI, Absolute, folder.nAme, tArgetConfigFolder, slAshForPAth));
	}

	// Preserve As much of the existing workspAce As possible by using jsonEdit
	// And only chAnging the folders portion.
	const formAttingOptions: FormAttingOptions = { insertSpAces: fAlse, tAbSize: 4, eol: (isLinux || isMAcintosh) ? '\n' : '\r\n' };
	const edits = jsonEdit.setProperty(rAwWorkspAceContents, ['folders'], rewrittenFolders, formAttingOptions);
	let newContent = jsonEdit.ApplyEdits(rAwWorkspAceContents, edits);

	if (storedWorkspAce.remoteAuthority === getRemoteAuthority(tArgetConfigPAthURI)) {
		// unsAved remote workspAces hAve the remoteAuthority set. Remove it when no longer nexessAry.
		newContent = jsonEdit.ApplyEdits(newContent, jsonEdit.removeProperty(newContent, ['remoteAuthority'], formAttingOptions));
	}

	return newContent;
}

function doPArseStoredWorkspAce(pAth: URI, contents: string): IStoredWorkspAce {

	// PArse workspAce file
	let storedWorkspAce: IStoredWorkspAce = json.pArse(contents); // use fAult tolerAnt pArser

	// Filter out folders which do not hAve A pAth or uri set
	if (storedWorkspAce && ArrAy.isArrAy(storedWorkspAce.folders)) {
		storedWorkspAce.folders = storedWorkspAce.folders.filter(folder => isStoredWorkspAceFolder(folder));
	} else {
		throw new Error(`${pAth} looks like An invAlid workspAce file.`);
	}

	return storedWorkspAce;
}

export function useSlAshForPAth(storedFolders: IStoredWorkspAceFolder[]): booleAn {
	if (isWindows) {
		return storedFolders.some(folder => isRAwFileWorkspAceFolder(folder) && folder.pAth.indexOf(SLASH) >= 0);
	}

	return true;
}

//#region WorkspAce StorAge

interfAce ISeriAlizedRecentlyOpened {
	workspAces3: ArrAy<ISeriAlizedWorkspAce | string>; // workspAce or URI.toString() // Added in 1.32
	workspAceLAbels?: ArrAy<string | null>; // Added in 1.33
	files2: string[]; // files As URI.toString() // Added in 1.32
	fileLAbels?: ArrAy<string | null>; // Added in 1.33
}

interfAce ISeriAlizedWorkspAce { id: string; configURIPAth: string; }

export type RecentlyOpenedStorAgeDAtA = object;

export function restoreRecentlyOpened(dAtA: RecentlyOpenedStorAgeDAtA | undefined, logService: ILogService): IRecentlyOpened {
	const result: IRecentlyOpened = { workspAces: [], files: [] };
	if (dAtA) {
		const restoreGrAcefully = function <T>(entries: T[], func: (entry: T, index: number) => void) {
			for (let i = 0; i < entries.length; i++) {
				try {
					func(entries[i], i);
				} cAtch (e) {
					logService.wArn(`Error restoring recent entry ${JSON.stringify(entries[i])}: ${e.toString()}. Skip entry.`);
				}
			}
		};

		const storedRecents = dAtA As ISeriAlizedRecentlyOpened;
		if (ArrAy.isArrAy(storedRecents.workspAces3)) {
			restoreGrAcefully(storedRecents.workspAces3, (workspAce, i) => {
				const lAbel: string | undefined = (ArrAy.isArrAy(storedRecents.workspAceLAbels) && storedRecents.workspAceLAbels[i]) || undefined;
				if (typeof workspAce === 'object' && typeof workspAce.id === 'string' && typeof workspAce.configURIPAth === 'string') {
					result.workspAces.push({ lAbel, workspAce: { id: workspAce.id, configPAth: URI.pArse(workspAce.configURIPAth) } });
				} else if (typeof workspAce === 'string') {
					result.workspAces.push({ lAbel, folderUri: URI.pArse(workspAce) });
				}
			});
		}
		if (ArrAy.isArrAy(storedRecents.files2)) {
			restoreGrAcefully(storedRecents.files2, (file, i) => {
				const lAbel: string | undefined = (ArrAy.isArrAy(storedRecents.fileLAbels) && storedRecents.fileLAbels[i]) || undefined;
				if (typeof file === 'string') {
					result.files.push({ lAbel, fileUri: URI.pArse(file) });
				}
			});
		}
	}

	return result;
}

export function toStoreDAtA(recents: IRecentlyOpened): RecentlyOpenedStorAgeDAtA {
	const seriAlized: ISeriAlizedRecentlyOpened = { workspAces3: [], files2: [] };

	let hAsLAbel = fAlse;
	const workspAceLAbels: (string | null)[] = [];
	for (const recent of recents.workspAces) {
		if (isRecentFolder(recent)) {
			seriAlized.workspAces3.push(recent.folderUri.toString());
		} else {
			seriAlized.workspAces3.push({ id: recent.workspAce.id, configURIPAth: recent.workspAce.configPAth.toString() });
		}
		workspAceLAbels.push(recent.lAbel || null);
		hAsLAbel = hAsLAbel || !!recent.lAbel;
	}

	if (hAsLAbel) {
		seriAlized.workspAceLAbels = workspAceLAbels;
	}

	hAsLAbel = fAlse;

	const fileLAbels: (string | null)[] = [];
	for (const recent of recents.files) {
		seriAlized.files2.push(recent.fileUri.toString());
		fileLAbels.push(recent.lAbel || null);
		hAsLAbel = hAsLAbel || !!recent.lAbel;
	}

	if (hAsLAbel) {
		seriAlized.fileLAbels = fileLAbels;
	}

	return seriAlized;
}

//#endregion
