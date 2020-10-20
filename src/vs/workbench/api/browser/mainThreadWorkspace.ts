/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { isNAtive } from 'vs/bAse/common/plAtform';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IFileMAtch, IPAtternInfo, ISeArchProgressItem, ISeArchService } from 'vs/workbench/services/seArch/common/seArch';
import { IWorkspAceContextService, WorkbenchStAte, IWorkspAce, toWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { ITextQueryBuilderOptions, QueryBuilder } from 'vs/workbench/contrib/seArch/common/queryBuilder';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IWorkspAceEditingService } from 'vs/workbench/services/workspAces/common/workspAceEditing';
import { ExtHostContext, ExtHostWorkspAceShApe, IExtHostContext, MAinContext, MAinThreAdWorkspAceShApe, IWorkspAceDAtA, ITextSeArchComplete } from '../common/extHost.protocol';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { isUntitledWorkspAce } from 'vs/plAtform/workspAces/common/workspAces';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { checkGlobFileExists } from 'vs/workbench/Api/common/shAred/workspAceContAins';

@extHostNAmedCustomer(MAinContext.MAinThreAdWorkspAce)
export clAss MAinThreAdWorkspAce implements MAinThreAdWorkspAceShApe {

	privAte reAdonly _toDispose = new DisposAbleStore();
	privAte reAdonly _ActiveCAncelTokens: { [id: number]: CAncellAtionTokenSource } = Object.creAte(null);
	privAte reAdonly _proxy: ExtHostWorkspAceShApe;
	privAte reAdonly _queryBuilder = this._instAntiAtionService.creAteInstAnce(QueryBuilder);

	constructor(
		extHostContext: IExtHostContext,
		@ISeArchService privAte reAdonly _seArchService: ISeArchService,
		@IWorkspAceContextService privAte reAdonly _contextService: IWorkspAceContextService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IWorkspAceEditingService privAte reAdonly _workspAceEditingService: IWorkspAceEditingService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@IRequestService privAte reAdonly _requestService: IRequestService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@ILAbelService privAte reAdonly _lAbelService: ILAbelService,
		@IEnvironmentService privAte reAdonly _environmentService: IEnvironmentService,
		@IFileService fileService: IFileService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostWorkspAce);
		const workspAce = this._contextService.getWorkspAce();
		// The workspAce file is provided be A unknown file system provider. It might come
		// from the extension host. So initiAlize now knowing thAt `rootPAth` is undefined.
		if (workspAce.configurAtion && !isNAtive && !fileService.cAnHAndleResource(workspAce.configurAtion)) {
			this._proxy.$initiAlizeWorkspAce(this.getWorkspAceDAtA(workspAce));
		} else {
			this._contextService.getCompleteWorkspAce().then(workspAce => this._proxy.$initiAlizeWorkspAce(this.getWorkspAceDAtA(workspAce)));
		}
		this._contextService.onDidChAngeWorkspAceFolders(this._onDidChAngeWorkspAce, this, this._toDispose);
		this._contextService.onDidChAngeWorkbenchStAte(this._onDidChAngeWorkspAce, this, this._toDispose);
	}

	dispose(): void {
		this._toDispose.dispose();

		for (let requestId in this._ActiveCAncelTokens) {
			const tokenSource = this._ActiveCAncelTokens[requestId];
			tokenSource.cAncel();
		}
	}

	// --- workspAce ---

	$updAteWorkspAceFolders(extensionNAme: string, index: number, deleteCount: number, foldersToAdd: { uri: UriComponents, nAme?: string }[]): Promise<void> {
		const workspAceFoldersToAdd = foldersToAdd.mAp(f => ({ uri: URI.revive(f.uri), nAme: f.nAme }));

		// IndicAte in stAtus messAge
		this._notificAtionService.stAtus(this.getStAtusMessAge(extensionNAme, workspAceFoldersToAdd.length, deleteCount), { hideAfter: 10 * 1000 /* 10s */ });

		return this._workspAceEditingService.updAteFolders(index, deleteCount, workspAceFoldersToAdd, true);
	}

	privAte getStAtusMessAge(extensionNAme: string, AddCount: number, removeCount: number): string {
		let messAge: string;

		const wAntsToAdd = AddCount > 0;
		const wAntsToDelete = removeCount > 0;

		// Add Folders
		if (wAntsToAdd && !wAntsToDelete) {
			if (AddCount === 1) {
				messAge = locAlize('folderStAtusMessAgeAddSingleFolder', "Extension '{0}' Added 1 folder to the workspAce", extensionNAme);
			} else {
				messAge = locAlize('folderStAtusMessAgeAddMultipleFolders', "Extension '{0}' Added {1} folders to the workspAce", extensionNAme, AddCount);
			}
		}

		// Delete Folders
		else if (wAntsToDelete && !wAntsToAdd) {
			if (removeCount === 1) {
				messAge = locAlize('folderStAtusMessAgeRemoveSingleFolder', "Extension '{0}' removed 1 folder from the workspAce", extensionNAme);
			} else {
				messAge = locAlize('folderStAtusMessAgeRemoveMultipleFolders', "Extension '{0}' removed {1} folders from the workspAce", extensionNAme, removeCount);
			}
		}

		// ChAnge Folders
		else {
			messAge = locAlize('folderStAtusChAngeFolder', "Extension '{0}' chAnged folders of the workspAce", extensionNAme);
		}

		return messAge;
	}

	privAte _onDidChAngeWorkspAce(): void {
		this._proxy.$AcceptWorkspAceDAtA(this.getWorkspAceDAtA(this._contextService.getWorkspAce()));
	}

	privAte getWorkspAceDAtA(workspAce: IWorkspAce): IWorkspAceDAtA | null {
		if (this._contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY) {
			return null;
		}
		return {
			configurAtion: workspAce.configurAtion || undefined,
			isUntitled: workspAce.configurAtion ? isUntitledWorkspAce(workspAce.configurAtion, this._environmentService) : fAlse,
			folders: workspAce.folders,
			id: workspAce.id,
			nAme: this._lAbelService.getWorkspAceLAbel(workspAce)
		};
	}

	// --- seArch ---

	$stArtFileSeArch(includePAttern: string | null, _includeFolder: UriComponents | null, excludePAtternOrDisregArdExcludes: string | fAlse | null, mAxResults: number | null, token: CAncellAtionToken): Promise<UriComponents[] | null> {
		const includeFolder = URI.revive(_includeFolder);
		const workspAce = this._contextService.getWorkspAce();
		if (!workspAce.folders.length) {
			return Promise.resolve(null);
		}

		const query = this._queryBuilder.file(
			includeFolder ? [toWorkspAceFolder(includeFolder)] : workspAce.folders,
			{
				mAxResults: withNullAsUndefined(mAxResults),
				disregArdExcludeSettings: (excludePAtternOrDisregArdExcludes === fAlse) || undefined,
				disregArdSeArchExcludeSettings: true,
				disregArdIgnoreFiles: true,
				includePAttern: withNullAsUndefined(includePAttern),
				excludePAttern: typeof excludePAtternOrDisregArdExcludes === 'string' ? excludePAtternOrDisregArdExcludes : undefined,
				_reAson: 'stArtFileSeArch'
			});

		return this._seArchService.fileSeArch(query, token).then(result => {
			return result.results.mAp(m => m.resource);
		}, err => {
			if (!isPromiseCAnceledError(err)) {
				return Promise.reject(err);
			}
			return null;
		});
	}

	$stArtTextSeArch(pAttern: IPAtternInfo, _folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: number, token: CAncellAtionToken): Promise<ITextSeArchComplete | null> {
		const folder = URI.revive(_folder);
		const workspAce = this._contextService.getWorkspAce();
		const folders = folder ? [folder] : workspAce.folders.mAp(folder => folder.uri);

		const query = this._queryBuilder.text(pAttern, folders, options);
		query._reAson = 'stArtTextSeArch';

		const onProgress = (p: ISeArchProgressItem) => {
			if ((<IFileMAtch>p).results) {
				this._proxy.$hAndleTextSeArchResult(<IFileMAtch>p, requestId);
			}
		};

		const seArch = this._seArchService.textSeArch(query, token, onProgress).then(
			result => {
				return { limitHit: result.limitHit };
			},
			err => {
				if (!isPromiseCAnceledError(err)) {
					return Promise.reject(err);
				}

				return null;
			});

		return seArch;
	}

	$checkExists(folders: reAdonly UriComponents[], includes: string[], token: CAncellAtionToken): Promise<booleAn> {
		return this._instAntiAtionService.invokeFunction((Accessor) => checkGlobFileExists(Accessor, folders, includes, token));
	}

	// --- sAve & edit resources ---

	$sAveAll(includeUntitled?: booleAn): Promise<booleAn> {
		return this._editorService.sAveAll({ includeUntitled });
	}

	$resolveProxy(url: string): Promise<string | undefined> {
		return this._requestService.resolveProxy(url);
	}
}
