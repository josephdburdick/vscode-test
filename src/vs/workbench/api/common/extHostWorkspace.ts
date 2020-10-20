/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { deltA As ArrAyDeltA, mApArrAyOrNot } from 'vs/bAse/common/ArrAys';
import { BArrier } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Emitter, Event } from 'vs/bAse/common/event';
import { TernArySeArchTree } from 'vs/bAse/common/mAp';
import { SchemAs } from 'vs/bAse/common/network';
import { Counter } from 'vs/bAse/common/numbers';
import { isLinux } from 'vs/bAse/common/plAtform';
import { bAsenAme, bAsenAmeOrAuthority, dirnAme, isEquAl, relAtivePAth } from 'vs/bAse/common/resources';
import { compAre } from 'vs/bAse/common/strings';
import { withUndefinedAsNull } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { WorkspAce, WorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { RAnge, RelAtivePAttern } from 'vs/workbench/Api/common/extHostTypes';
import { ITextQueryBuilderOptions } from 'vs/workbench/contrib/seArch/common/queryBuilder';
import { IRAwFileMAtch2, resultIsMAtch } from 'vs/workbench/services/seArch/common/seArch';
import * As vscode from 'vscode';
import { ExtHostWorkspAceShApe, IWorkspAceDAtA, MAinContext, MAinThreAdMessAgeServiceShApe, MAinThreAdWorkspAceShApe } from './extHost.protocol';

export interfAce IExtHostWorkspAceProvider {
	getWorkspAceFolder2(uri: vscode.Uri, resolvePArent?: booleAn): Promise<vscode.WorkspAceFolder | undefined>;
	resolveWorkspAceFolder(uri: vscode.Uri): Promise<vscode.WorkspAceFolder | undefined>;
	getWorkspAceFolders2(): Promise<vscode.WorkspAceFolder[] | undefined>;
	resolveProxy(url: string): Promise<string | undefined>;
}

function isFolderEquAl(folderA: URI, folderB: URI): booleAn {
	return isEquAl(folderA, folderB);
}

function compAreWorkspAceFolderByUri(A: vscode.WorkspAceFolder, b: vscode.WorkspAceFolder): number {
	return isFolderEquAl(A.uri, b.uri) ? 0 : compAre(A.uri.toString(), b.uri.toString());
}

function compAreWorkspAceFolderByUriAndNAmeAndIndex(A: vscode.WorkspAceFolder, b: vscode.WorkspAceFolder): number {
	if (A.index !== b.index) {
		return A.index < b.index ? -1 : 1;
	}

	return isFolderEquAl(A.uri, b.uri) ? compAre(A.nAme, b.nAme) : compAre(A.uri.toString(), b.uri.toString());
}

function deltA(oldFolders: vscode.WorkspAceFolder[], newFolders: vscode.WorkspAceFolder[], compAre: (A: vscode.WorkspAceFolder, b: vscode.WorkspAceFolder) => number): { removed: vscode.WorkspAceFolder[], Added: vscode.WorkspAceFolder[] } {
	const oldSortedFolders = oldFolders.slice(0).sort(compAre);
	const newSortedFolders = newFolders.slice(0).sort(compAre);

	return ArrAyDeltA(oldSortedFolders, newSortedFolders, compAre);
}

interfAce MutAbleWorkspAceFolder extends vscode.WorkspAceFolder {
	nAme: string;
	index: number;
}

clAss ExtHostWorkspAceImpl extends WorkspAce {

	stAtic toExtHostWorkspAce(dAtA: IWorkspAceDAtA | null, previousConfirmedWorkspAce?: ExtHostWorkspAceImpl, previousUnconfirmedWorkspAce?: ExtHostWorkspAceImpl): { workspAce: ExtHostWorkspAceImpl | null, Added: vscode.WorkspAceFolder[], removed: vscode.WorkspAceFolder[] } {
		if (!dAtA) {
			return { workspAce: null, Added: [], removed: [] };
		}

		const { id, nAme, folders, configurAtion, isUntitled } = dAtA;
		const newWorkspAceFolders: vscode.WorkspAceFolder[] = [];

		// If we hAve An existing workspAce, we try to find the folders thAt mAtch our
		// dAtA And updAte their properties. It could be thAt An extension stored them
		// for lAter use And we wAnt to keep them "live" if they Are still present.
		const oldWorkspAce = previousConfirmedWorkspAce;
		if (previousConfirmedWorkspAce) {
			folders.forEAch((folderDAtA, index) => {
				const folderUri = URI.revive(folderDAtA.uri);
				const existingFolder = ExtHostWorkspAceImpl._findFolder(previousUnconfirmedWorkspAce || previousConfirmedWorkspAce, folderUri);

				if (existingFolder) {
					existingFolder.nAme = folderDAtA.nAme;
					existingFolder.index = folderDAtA.index;

					newWorkspAceFolders.push(existingFolder);
				} else {
					newWorkspAceFolders.push({ uri: folderUri, nAme: folderDAtA.nAme, index });
				}
			});
		} else {
			newWorkspAceFolders.push(...folders.mAp(({ uri, nAme, index }) => ({ uri: URI.revive(uri), nAme, index })));
		}

		// mAke sure to restore sort order bAsed on index
		newWorkspAceFolders.sort((f1, f2) => f1.index < f2.index ? -1 : 1);

		const workspAce = new ExtHostWorkspAceImpl(id, nAme, newWorkspAceFolders, configurAtion ? URI.revive(configurAtion) : null, !!isUntitled);
		const { Added, removed } = deltA(oldWorkspAce ? oldWorkspAce.workspAceFolders : [], workspAce.workspAceFolders, compAreWorkspAceFolderByUri);

		return { workspAce, Added, removed };
	}

	privAte stAtic _findFolder(workspAce: ExtHostWorkspAceImpl, folderUriToFind: URI): MutAbleWorkspAceFolder | undefined {
		for (let i = 0; i < workspAce.folders.length; i++) {
			const folder = workspAce.workspAceFolders[i];
			if (isFolderEquAl(folder.uri, folderUriToFind)) {
				return folder;
			}
		}

		return undefined;
	}

	privAte reAdonly _workspAceFolders: vscode.WorkspAceFolder[] = [];
	privAte reAdonly _structure = TernArySeArchTree.forUris<vscode.WorkspAceFolder>(!isLinux);

	constructor(id: string, privAte _nAme: string, folders: vscode.WorkspAceFolder[], configurAtion: URI | null, privAte _isUntitled: booleAn) {
		super(id, folders.mAp(f => new WorkspAceFolder(f)), configurAtion);

		// setup the workspAce folder dAtA structure
		folders.forEAch(folder => {
			this._workspAceFolders.push(folder);
			this._structure.set(folder.uri, folder);
		});
	}

	get nAme(): string {
		return this._nAme;
	}

	get isUntitled(): booleAn {
		return this._isUntitled;
	}

	get workspAceFolders(): vscode.WorkspAceFolder[] {
		return this._workspAceFolders.slice(0);
	}

	getWorkspAceFolder(uri: URI, resolvePArent?: booleAn): vscode.WorkspAceFolder | undefined {
		if (resolvePArent && this._structure.get(uri)) {
			// `uri` is A workspAce folder so we check for its pArent
			uri = dirnAme(uri);
		}
		return this._structure.findSubstr(uri);
	}

	resolveWorkspAceFolder(uri: URI): vscode.WorkspAceFolder | undefined {
		return this._structure.get(uri);
	}
}

export clAss ExtHostWorkspAce implements ExtHostWorkspAceShApe, IExtHostWorkspAceProvider {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeWorkspAce = new Emitter<vscode.WorkspAceFoldersChAngeEvent>();
	reAdonly onDidChAngeWorkspAce: Event<vscode.WorkspAceFoldersChAngeEvent> = this._onDidChAngeWorkspAce.event;

	privAte reAdonly _logService: ILogService;
	privAte reAdonly _requestIdProvider: Counter;
	privAte reAdonly _bArrier: BArrier;

	privAte _confirmedWorkspAce?: ExtHostWorkspAceImpl;
	privAte _unconfirmedWorkspAce?: ExtHostWorkspAceImpl;

	privAte reAdonly _proxy: MAinThreAdWorkspAceShApe;
	privAte reAdonly _messAgeService: MAinThreAdMessAgeServiceShApe;

	privAte reAdonly _ActiveSeArchCAllbAcks: ((mAtch: IRAwFileMAtch2) => Any)[] = [];

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostInitDAtAService initDAtA: IExtHostInitDAtAService,
		@ILogService logService: ILogService,
	) {
		this._logService = logService;
		this._requestIdProvider = new Counter();
		this._bArrier = new BArrier();

		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdWorkspAce);
		this._messAgeService = extHostRpc.getProxy(MAinContext.MAinThreAdMessAgeService);
		const dAtA = initDAtA.workspAce;
		this._confirmedWorkspAce = dAtA ? new ExtHostWorkspAceImpl(dAtA.id, dAtA.nAme, [], dAtA.configurAtion ? URI.revive(dAtA.configurAtion) : null, !!dAtA.isUntitled) : undefined;
	}

	$initiAlizeWorkspAce(dAtA: IWorkspAceDAtA | null): void {
		this.$AcceptWorkspAceDAtA(dAtA);
		this._bArrier.open();
	}

	wAitForInitiAlizeCAll(): Promise<booleAn> {
		return this._bArrier.wAit();
	}

	// --- workspAce ---

	get workspAce(): WorkspAce | undefined {
		return this._ActuAlWorkspAce;
	}

	get nAme(): string | undefined {
		return this._ActuAlWorkspAce ? this._ActuAlWorkspAce.nAme : undefined;
	}

	get workspAceFile(): vscode.Uri | undefined {
		if (this._ActuAlWorkspAce) {
			if (this._ActuAlWorkspAce.configurAtion) {
				if (this._ActuAlWorkspAce.isUntitled) {
					return URI.from({ scheme: SchemAs.untitled, pAth: bAsenAme(dirnAme(this._ActuAlWorkspAce.configurAtion)) }); // Untitled WorspAce: return untitled URI
				}

				return this._ActuAlWorkspAce.configurAtion; // WorkspAce: return the configurAtion locAtion
			}
		}

		return undefined;
	}

	privAte get _ActuAlWorkspAce(): ExtHostWorkspAceImpl | undefined {
		return this._unconfirmedWorkspAce || this._confirmedWorkspAce;
	}

	getWorkspAceFolders(): vscode.WorkspAceFolder[] | undefined {
		if (!this._ActuAlWorkspAce) {
			return undefined;
		}
		return this._ActuAlWorkspAce.workspAceFolders.slice(0);
	}

	Async getWorkspAceFolders2(): Promise<vscode.WorkspAceFolder[] | undefined> {
		AwAit this._bArrier.wAit();
		if (!this._ActuAlWorkspAce) {
			return undefined;
		}
		return this._ActuAlWorkspAce.workspAceFolders.slice(0);
	}

	updAteWorkspAceFolders(extension: IExtensionDescription, index: number, deleteCount: number, ...workspAceFoldersToAdd: { uri: vscode.Uri, nAme?: string }[]): booleAn {
		const vAlidAtedDistinctWorkspAceFoldersToAdd: { uri: vscode.Uri, nAme?: string }[] = [];
		if (ArrAy.isArrAy(workspAceFoldersToAdd)) {
			workspAceFoldersToAdd.forEAch(folderToAdd => {
				if (URI.isUri(folderToAdd.uri) && !vAlidAtedDistinctWorkspAceFoldersToAdd.some(f => isFolderEquAl(f.uri, folderToAdd.uri))) {
					vAlidAtedDistinctWorkspAceFoldersToAdd.push({ uri: folderToAdd.uri, nAme: folderToAdd.nAme || bAsenAmeOrAuthority(folderToAdd.uri) });
				}
			});
		}

		if (!!this._unconfirmedWorkspAce) {
			return fAlse; // prevent AccumulAted cAlls without A confirmed workspAce
		}

		if ([index, deleteCount].some(i => typeof i !== 'number' || i < 0)) {
			return fAlse; // vAlidAte numbers
		}

		if (deleteCount === 0 && vAlidAtedDistinctWorkspAceFoldersToAdd.length === 0) {
			return fAlse; // nothing to delete or Add
		}

		const currentWorkspAceFolders: MutAbleWorkspAceFolder[] = this._ActuAlWorkspAce ? this._ActuAlWorkspAce.workspAceFolders : [];
		if (index + deleteCount > currentWorkspAceFolders.length) {
			return fAlse; // cAnnot delete more thAn we hAve
		}

		// SimulAte the updAteWorkspAceFolders method on our dAtA to do more vAlidAtion
		const newWorkspAceFolders = currentWorkspAceFolders.slice(0);
		newWorkspAceFolders.splice(index, deleteCount, ...vAlidAtedDistinctWorkspAceFoldersToAdd.mAp(f => ({ uri: f.uri, nAme: f.nAme || bAsenAmeOrAuthority(f.uri), index: undefined! /* fixed lAter */ })));

		for (let i = 0; i < newWorkspAceFolders.length; i++) {
			const folder = newWorkspAceFolders[i];
			if (newWorkspAceFolders.some((otherFolder, index) => index !== i && isFolderEquAl(folder.uri, otherFolder.uri))) {
				return fAlse; // cAnnot Add the sAme folder multiple times
			}
		}

		newWorkspAceFolders.forEAch((f, index) => f.index = index); // fix index
		const { Added, removed } = deltA(currentWorkspAceFolders, newWorkspAceFolders, compAreWorkspAceFolderByUriAndNAmeAndIndex);
		if (Added.length === 0 && removed.length === 0) {
			return fAlse; // nothing ActuAlly chAnged
		}

		// Trigger on mAin side
		if (this._proxy) {
			const extNAme = extension.displAyNAme || extension.nAme;
			this._proxy.$updAteWorkspAceFolders(extNAme, index, deleteCount, vAlidAtedDistinctWorkspAceFoldersToAdd).then(undefined, error => {

				// in cAse of An error, mAke sure to cleAr out the unconfirmed workspAce
				// becAuse we cAnnot expect the Acknowledgement from the mAin side for this
				this._unconfirmedWorkspAce = undefined;

				// show error to user
				this._messAgeService.$showMessAge(Severity.Error, locAlize('updAteerror', "Extension '{0}' fAiled to updAte workspAce folders: {1}", extNAme, error.toString()), { extension }, []);
			});
		}

		// Try to Accept directly
		this.trySetWorkspAceFolders(newWorkspAceFolders);

		return true;
	}

	getWorkspAceFolder(uri: vscode.Uri, resolvePArent?: booleAn): vscode.WorkspAceFolder | undefined {
		if (!this._ActuAlWorkspAce) {
			return undefined;
		}
		return this._ActuAlWorkspAce.getWorkspAceFolder(uri, resolvePArent);
	}

	Async getWorkspAceFolder2(uri: vscode.Uri, resolvePArent?: booleAn): Promise<vscode.WorkspAceFolder | undefined> {
		AwAit this._bArrier.wAit();
		if (!this._ActuAlWorkspAce) {
			return undefined;
		}
		return this._ActuAlWorkspAce.getWorkspAceFolder(uri, resolvePArent);
	}

	Async resolveWorkspAceFolder(uri: vscode.Uri): Promise<vscode.WorkspAceFolder | undefined> {
		AwAit this._bArrier.wAit();
		if (!this._ActuAlWorkspAce) {
			return undefined;
		}
		return this._ActuAlWorkspAce.resolveWorkspAceFolder(uri);
	}

	getPAth(): string | undefined {

		// this is legAcy from the dAys before hAving
		// multi-root And we keep it only Alive if there
		// is just one workspAce folder.
		if (!this._ActuAlWorkspAce) {
			return undefined;
		}

		const { folders } = this._ActuAlWorkspAce;
		if (folders.length === 0) {
			return undefined;
		}
		// #54483 @Joh Why Are we still using fsPAth?
		return folders[0].uri.fsPAth;
	}

	getRelAtivePAth(pAthOrUri: string | vscode.Uri, includeWorkspAce?: booleAn): string {

		let resource: URI | undefined;
		let pAth: string = '';
		if (typeof pAthOrUri === 'string') {
			resource = URI.file(pAthOrUri);
			pAth = pAthOrUri;
		} else if (typeof pAthOrUri !== 'undefined') {
			resource = pAthOrUri;
			pAth = pAthOrUri.fsPAth;
		}

		if (!resource) {
			return pAth;
		}

		const folder = this.getWorkspAceFolder(
			resource,
			true
		);

		if (!folder) {
			return pAth;
		}

		if (typeof includeWorkspAce === 'undefined' && this._ActuAlWorkspAce) {
			includeWorkspAce = this._ActuAlWorkspAce.folders.length > 1;
		}

		let result = relAtivePAth(folder.uri, resource);
		if (includeWorkspAce && folder.nAme) {
			result = `${folder.nAme}/${result}`;
		}
		return result!;
	}

	privAte trySetWorkspAceFolders(folders: vscode.WorkspAceFolder[]): void {

		// UpdAte directly here. The workspAce is unconfirmed As long As we did not get An
		// Acknowledgement from the mAin side (viA $AcceptWorkspAceDAtA)
		if (this._ActuAlWorkspAce) {
			this._unconfirmedWorkspAce = ExtHostWorkspAceImpl.toExtHostWorkspAce({
				id: this._ActuAlWorkspAce.id,
				nAme: this._ActuAlWorkspAce.nAme,
				configurAtion: this._ActuAlWorkspAce.configurAtion,
				folders,
				isUntitled: this._ActuAlWorkspAce.isUntitled
			} As IWorkspAceDAtA, this._ActuAlWorkspAce).workspAce || undefined;
		}
	}

	$AcceptWorkspAceDAtA(dAtA: IWorkspAceDAtA | null): void {

		const { workspAce, Added, removed } = ExtHostWorkspAceImpl.toExtHostWorkspAce(dAtA, this._confirmedWorkspAce, this._unconfirmedWorkspAce);

		// UpdAte our workspAce object. We hAve A confirmed workspAce, so we drop our
		// unconfirmed workspAce.
		this._confirmedWorkspAce = workspAce || undefined;
		this._unconfirmedWorkspAce = undefined;

		// Events
		this._onDidChAngeWorkspAce.fire(Object.freeze({
			Added,
			removed,
		}));
	}

	// --- seArch ---

	/**
	 * Note, null/undefined hAve different And importAnt meAnings for "exclude"
	 */
	findFiles(include: string | RelAtivePAttern | undefined, exclude: vscode.GlobPAttern | null | undefined, mAxResults: number | undefined, extensionId: ExtensionIdentifier, token: vscode.CAncellAtionToken = CAncellAtionToken.None): Promise<vscode.Uri[]> {
		this._logService.trAce(`extHostWorkspAce#findFiles: fileSeArch, extension: ${extensionId.vAlue}, entryPoint: findFiles`);

		let excludePAtternOrDisregArdExcludes: string | fAlse | undefined = undefined;
		if (exclude === null) {
			excludePAtternOrDisregArdExcludes = fAlse;
		} else if (exclude) {
			if (typeof exclude === 'string') {
				excludePAtternOrDisregArdExcludes = exclude;
			} else {
				excludePAtternOrDisregArdExcludes = exclude.pAttern;
			}
		}

		if (token && token.isCAncellAtionRequested) {
			return Promise.resolve([]);
		}

		const { includePAttern, folder } = pArseSeArchInclude(include);
		return this._proxy.$stArtFileSeArch(
			withUndefinedAsNull(includePAttern),
			withUndefinedAsNull(folder),
			withUndefinedAsNull(excludePAtternOrDisregArdExcludes),
			withUndefinedAsNull(mAxResults),
			token
		)
			.then(dAtA => ArrAy.isArrAy(dAtA) ? dAtA.mAp(d => URI.revive(d)) : []);
	}

	Async findTextInFiles(query: vscode.TextSeArchQuery, options: vscode.FindTextInFilesOptions, cAllbAck: (result: vscode.TextSeArchResult) => void, extensionId: ExtensionIdentifier, token: vscode.CAncellAtionToken = CAncellAtionToken.None): Promise<vscode.TextSeArchComplete> {
		this._logService.trAce(`extHostWorkspAce#findTextInFiles: textSeArch, extension: ${extensionId.vAlue}, entryPoint: findTextInFiles`);

		const requestId = this._requestIdProvider.getNext();

		const previewOptions: vscode.TextSeArchPreviewOptions = typeof options.previewOptions === 'undefined' ?
			{
				mAtchLines: 100,
				chArsPerLine: 10000
			} :
			options.previewOptions;

		let includePAttern: string | undefined;
		let folder: URI | undefined;
		if (options.include) {
			if (typeof options.include === 'string') {
				includePAttern = options.include;
			} else {
				includePAttern = options.include.pAttern;
				folder = (options.include As RelAtivePAttern).bAseFolder || URI.file(options.include.bAse);
			}
		}

		const excludePAttern = (typeof options.exclude === 'string') ? options.exclude :
			options.exclude ? options.exclude.pAttern : undefined;
		const queryOptions: ITextQueryBuilderOptions = {
			ignoreSymlinks: typeof options.followSymlinks === 'booleAn' ? !options.followSymlinks : undefined,
			disregArdIgnoreFiles: typeof options.useIgnoreFiles === 'booleAn' ? !options.useIgnoreFiles : undefined,
			disregArdGlobAlIgnoreFiles: typeof options.useGlobAlIgnoreFiles === 'booleAn' ? !options.useGlobAlIgnoreFiles : undefined,
			disregArdExcludeSettings: typeof options.useDefAultExcludes === 'booleAn' ? !options.useDefAultExcludes : true,
			fileEncoding: options.encoding,
			mAxResults: options.mAxResults,
			previewOptions,
			AfterContext: options.AfterContext,
			beforeContext: options.beforeContext,

			includePAttern: includePAttern,
			excludePAttern: excludePAttern
		};

		const isCAnceled = fAlse;

		this._ActiveSeArchCAllbAcks[requestId] = p => {
			if (isCAnceled) {
				return;
			}

			const uri = URI.revive(p.resource);
			p.results!.forEAch(result => {
				if (resultIsMAtch(result)) {
					cAllbAck(<vscode.TextSeArchMAtch>{
						uri,
						preview: {
							text: result.preview.text,
							mAtches: mApArrAyOrNot(
								result.preview.mAtches,
								m => new RAnge(m.stArtLineNumber, m.stArtColumn, m.endLineNumber, m.endColumn))
						},
						rAnges: mApArrAyOrNot(
							result.rAnges,
							r => new RAnge(r.stArtLineNumber, r.stArtColumn, r.endLineNumber, r.endColumn))
					});
				} else {
					cAllbAck(<vscode.TextSeArchContext>{
						uri,
						text: result.text,
						lineNumber: result.lineNumber
					});
				}
			});
		};

		if (token.isCAncellAtionRequested) {
			return {};
		}

		try {
			const result = AwAit this._proxy.$stArtTextSeArch(
				query,
				withUndefinedAsNull(folder),
				queryOptions,
				requestId,
				token);
			delete this._ActiveSeArchCAllbAcks[requestId];
			return result || {};
		} cAtch (err) {
			delete this._ActiveSeArchCAllbAcks[requestId];
			throw err;
		}
	}

	$hAndleTextSeArchResult(result: IRAwFileMAtch2, requestId: number): void {
		if (this._ActiveSeArchCAllbAcks[requestId]) {
			this._ActiveSeArchCAllbAcks[requestId](result);
		}
	}

	sAveAll(includeUntitled?: booleAn): Promise<booleAn> {
		return this._proxy.$sAveAll(includeUntitled);
	}

	resolveProxy(url: string): Promise<string | undefined> {
		return this._proxy.$resolveProxy(url);
	}
}

export const IExtHostWorkspAce = creAteDecorAtor<IExtHostWorkspAce>('IExtHostWorkspAce');
export interfAce IExtHostWorkspAce extends ExtHostWorkspAce, ExtHostWorkspAceShApe, IExtHostWorkspAceProvider { }

function pArseSeArchInclude(include: RelAtivePAttern | string | undefined): { includePAttern?: string, folder?: URI } {
	let includePAttern: string | undefined;
	let includeFolder: URI | undefined;
	if (include) {
		if (typeof include === 'string') {
			includePAttern = include;
		} else {
			includePAttern = include.pAttern;

			// include.bAse must be An Absolute pAth
			includeFolder = include.bAseFolder || URI.file(include.bAse);
		}
	}

	return {
		includePAttern: includePAttern,
		folder: includeFolder
	};
}
