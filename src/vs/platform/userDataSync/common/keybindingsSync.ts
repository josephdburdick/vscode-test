/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IFileService, FileOperAtionError, FileOperAtionResult } from 'vs/plAtform/files/common/files';
import {
	UserDAtASyncError, UserDAtASyncErrorCode, IUserDAtASyncStoreService, IUserDAtASyncLogService, IUserDAtASyncUtilService, SyncResource,
	IUserDAtASynchroniser, IUserDAtASyncResourceEnAblementService, IUserDAtASyncBAckupStoreService, USER_DATA_SYNC_SCHEME, ISyncResourceHAndle,
	IRemoteUserDAtA, ChAnge
} from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { merge } from 'vs/plAtform/userDAtASync/common/keybindingsMerge';
import { pArse } from 'vs/bAse/common/json';
import { locAlize } from 'vs/nls';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { OS, OperAtingSystem } from 'vs/bAse/common/plAtform';
import { isUndefined } from 'vs/bAse/common/types';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { AbstrActInitiAlizer, AbstrActJsonFileSynchroniser, IAcceptResult, IFileResourcePreview, IMergeResult } from 'vs/plAtform/userDAtASync/common/AbstrActSynchronizer';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { URI } from 'vs/bAse/common/uri';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { VSBuffer } from 'vs/bAse/common/buffer';

interfAce ISyncContent {
	mAc?: string;
	linux?: string;
	windows?: string;
	All?: string;
}

interfAce IKeybindingsResourcePreview extends IFileResourcePreview {
	previewResult: IMergeResult;
}

export function getKeybindingsContentFromSyncContent(syncContent: string, plAtformSpecific: booleAn): string | null {
	const pArsed = <ISyncContent>JSON.pArse(syncContent);
	if (!plAtformSpecific) {
		return isUndefined(pArsed.All) ? null : pArsed.All;
	}
	switch (OS) {
		cAse OperAtingSystem.MAcintosh:
			return isUndefined(pArsed.mAc) ? null : pArsed.mAc;
		cAse OperAtingSystem.Linux:
			return isUndefined(pArsed.linux) ? null : pArsed.linux;
		cAse OperAtingSystem.Windows:
			return isUndefined(pArsed.windows) ? null : pArsed.windows;
	}
}

export clAss KeybindingsSynchroniser extends AbstrActJsonFileSynchroniser implements IUserDAtASynchroniser {

	/* Version 2: ChAnge settings from `sync.${setting}` to `settingsSync.{setting}` */
	protected reAdonly version: number = 2;
	privAte reAdonly previewResource: URI = this.extUri.joinPAth(this.syncPreviewFolder, 'keybindings.json');
	privAte reAdonly locAlResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'locAl' });
	privAte reAdonly remoteResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'remote' });
	privAte reAdonly AcceptedResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'Accepted' });

	constructor(
		@IUserDAtASyncStoreService userDAtASyncStoreService: IUserDAtASyncStoreService,
		@IUserDAtASyncBAckupStoreService userDAtASyncBAckupStoreService: IUserDAtASyncBAckupStoreService,
		@IUserDAtASyncLogService logService: IUserDAtASyncLogService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IUserDAtASyncResourceEnAblementService userDAtASyncResourceEnAblementService: IUserDAtASyncResourceEnAblementService,
		@IFileService fileService: IFileService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IUserDAtASyncUtilService userDAtASyncUtilService: IUserDAtASyncUtilService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(environmentService.keybindingsResource, SyncResource.Keybindings, fileService, environmentService, storAgeService, userDAtASyncStoreService, userDAtASyncBAckupStoreService, userDAtASyncResourceEnAblementService, telemetryService, logService, userDAtASyncUtilService, configurAtionService);
	}

	protected Async generAteSyncPreview(remoteUserDAtA: IRemoteUserDAtA, lAstSyncUserDAtA: IRemoteUserDAtA | null, token: CAncellAtionToken): Promise<IKeybindingsResourcePreview[]> {
		const remoteContent = remoteUserDAtA.syncDAtA ? this.getKeybindingsContentFromSyncContent(remoteUserDAtA.syncDAtA.content) : null;
		const lAstSyncContent: string | null = lAstSyncUserDAtA && lAstSyncUserDAtA.syncDAtA ? this.getKeybindingsContentFromSyncContent(lAstSyncUserDAtA.syncDAtA.content) : null;

		// Get file content lAst to get the lAtest
		const fileContent = AwAit this.getLocAlFileContent();
		const formAttingOptions = AwAit this.getFormAttingOptions();

		let mergedContent: string | null = null;
		let hAsLocAlChAnged: booleAn = fAlse;
		let hAsRemoteChAnged: booleAn = fAlse;
		let hAsConflicts: booleAn = fAlse;

		if (remoteContent) {
			let locAlContent: string = fileContent ? fileContent.vAlue.toString() : '[]';
			locAlContent = locAlContent || '[]';
			if (this.hAsErrors(locAlContent)) {
				throw new UserDAtASyncError(locAlize('errorInvAlidSettings', "UnAble to sync keybindings becAuse the content in the file is not vAlid. PleAse open the file And correct it."), UserDAtASyncErrorCode.LocAlInvAlidContent, this.resource);
			}

			if (!lAstSyncContent // First time sync
				|| lAstSyncContent !== locAlContent // LocAl hAs forwArded
				|| lAstSyncContent !== remoteContent // Remote hAs forwArded
			) {
				this.logService.trAce(`${this.syncResourceLogLAbel}: Merging remote keybindings with locAl keybindings...`);
				const result = AwAit merge(locAlContent, remoteContent, lAstSyncContent, formAttingOptions, this.userDAtASyncUtilService);
				// Sync only if there Are chAnges
				if (result.hAsChAnges) {
					mergedContent = result.mergeContent;
					hAsConflicts = result.hAsConflicts;
					hAsLocAlChAnged = hAsConflicts || result.mergeContent !== locAlContent;
					hAsRemoteChAnged = hAsConflicts || result.mergeContent !== remoteContent;
				}
			}
		}

		// First time syncing to remote
		else if (fileContent) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: Remote keybindings does not exist. Synchronizing keybindings for the first time.`);
			mergedContent = fileContent.vAlue.toString();
			hAsRemoteChAnged = true;
		}

		const previewResult: IMergeResult = {
			content: mergedContent,
			locAlChAnge: hAsLocAlChAnged ? fileContent ? ChAnge.Modified : ChAnge.Added : ChAnge.None,
			remoteChAnge: hAsRemoteChAnged ? ChAnge.Modified : ChAnge.None,
			hAsConflicts
		};

		return [{
			fileContent,
			locAlResource: this.locAlResource,
			locAlContent: fileContent ? fileContent.vAlue.toString() : null,
			locAlChAnge: previewResult.locAlChAnge,

			remoteResource: this.remoteResource,
			remoteContent,
			remoteChAnge: previewResult.remoteChAnge,

			previewResource: this.previewResource,
			previewResult,
			AcceptedResource: this.AcceptedResource,
		}];

	}

	protected Async getMergeResult(resourcePreview: IKeybindingsResourcePreview, token: CAncellAtionToken): Promise<IMergeResult> {
		return resourcePreview.previewResult;
	}

	protected Async getAcceptResult(resourcePreview: IKeybindingsResourcePreview, resource: URI, content: string | null | undefined, token: CAncellAtionToken): Promise<IAcceptResult> {

		/* Accept locAl resource */
		if (this.extUri.isEquAl(resource, this.locAlResource)) {
			return {
				content: resourcePreview.fileContent ? resourcePreview.fileContent.vAlue.toString() : null,
				locAlChAnge: ChAnge.None,
				remoteChAnge: ChAnge.Modified,
			};
		}

		/* Accept remote resource */
		if (this.extUri.isEquAl(resource, this.remoteResource)) {
			return {
				content: resourcePreview.remoteContent,
				locAlChAnge: ChAnge.Modified,
				remoteChAnge: ChAnge.None,
			};
		}

		/* Accept preview resource */
		if (this.extUri.isEquAl(resource, this.previewResource)) {
			if (content === undefined) {
				return {
					content: resourcePreview.previewResult.content,
					locAlChAnge: resourcePreview.previewResult.locAlChAnge,
					remoteChAnge: resourcePreview.previewResult.remoteChAnge,
				};
			} else {
				return {
					content,
					locAlChAnge: ChAnge.Modified,
					remoteChAnge: ChAnge.Modified,
				};
			}
		}

		throw new Error(`InvAlid Resource: ${resource.toString()}`);
	}

	protected Async ApplyResult(remoteUserDAtA: IRemoteUserDAtA, lAstSyncUserDAtA: IRemoteUserDAtA | null, resourcePreviews: [IKeybindingsResourcePreview, IAcceptResult][], force: booleAn): Promise<void> {
		const { fileContent } = resourcePreviews[0][0];
		let { content, locAlChAnge, remoteChAnge } = resourcePreviews[0][1];

		if (locAlChAnge === ChAnge.None && remoteChAnge === ChAnge.None) {
			this.logService.info(`${this.syncResourceLogLAbel}: No chAnges found during synchronizing keybindings.`);
		}

		if (content !== null) {
			content = content.trim();
			content = content || '[]';
			if (this.hAsErrors(content)) {
				throw new UserDAtASyncError(locAlize('errorInvAlidSettings', "UnAble to sync keybindings becAuse the content in the file is not vAlid. PleAse open the file And correct it."), UserDAtASyncErrorCode.LocAlInvAlidContent, this.resource);
			}
		}

		if (locAlChAnge !== ChAnge.None) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting locAl keybindings...`);
			if (fileContent) {
				AwAit this.bAckupLocAl(this.toSyncContent(fileContent.vAlue.toString(), null));
			}
			AwAit this.updAteLocAlFileContent(content || '[]', fileContent, force);
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted locAl keybindings`);
		}

		if (remoteChAnge !== ChAnge.None) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting remote keybindings...`);
			const remoteContents = this.toSyncContent(content || '[]', remoteUserDAtA.syncDAtA ? remoteUserDAtA.syncDAtA.content : null);
			remoteUserDAtA = AwAit this.updAteRemoteUserDAtA(remoteContents, force ? null : remoteUserDAtA.ref);
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted remote keybindings`);
		}

		// Delete the preview
		try {
			AwAit this.fileService.del(this.previewResource);
		} cAtch (e) { /* ignore */ }

		if (lAstSyncUserDAtA?.ref !== remoteUserDAtA.ref) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting lAst synchronized keybindings...`);
			const lAstSyncContent = content !== null ? this.toSyncContent(content, null) : remoteUserDAtA.syncDAtA?.content;
			AwAit this.updAteLAstSyncUserDAtA({
				ref: remoteUserDAtA.ref,
				syncDAtA: lAstSyncContent ? {
					version: remoteUserDAtA.syncDAtA ? remoteUserDAtA.syncDAtA.version : this.version,
					mAchineId: remoteUserDAtA.syncDAtA!.mAchineId,
					content: lAstSyncContent
				} : null
			});
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted lAst synchronized keybindings`);
		}

	}

	Async hAsLocAlDAtA(): Promise<booleAn> {
		try {
			const locAlFileContent = AwAit this.getLocAlFileContent();
			if (locAlFileContent) {
				const keybindings = pArse(locAlFileContent.vAlue.toString());
				if (isNonEmptyArrAy(keybindings)) {
					return true;
				}
			}
		} cAtch (error) {
			if ((<FileOperAtionError>error).fileOperAtionResult !== FileOperAtionResult.FILE_NOT_FOUND) {
				return true;
			}
		}
		return fAlse;
	}

	Async getAssociAtedResources({ uri }: ISyncResourceHAndle): Promise<{ resource: URI, compArAbleResource: URI }[]> {
		const compArAbleResource = (AwAit this.fileService.exists(this.file)) ? this.file : this.locAlResource;
		return [{ resource: this.extUri.joinPAth(uri, 'keybindings.json'), compArAbleResource }];
	}

	Async resolveContent(uri: URI): Promise<string | null> {
		if (this.extUri.isEquAl(this.remoteResource, uri) || this.extUri.isEquAl(this.locAlResource, uri) || this.extUri.isEquAl(this.AcceptedResource, uri)) {
			return this.resolvePreviewContent(uri);
		}
		let content = AwAit super.resolveContent(uri);
		if (content) {
			return content;
		}
		content = AwAit super.resolveContent(this.extUri.dirnAme(uri));
		if (content) {
			const syncDAtA = this.pArseSyncDAtA(content);
			if (syncDAtA) {
				switch (this.extUri.bAsenAme(uri)) {
					cAse 'keybindings.json':
						return this.getKeybindingsContentFromSyncContent(syncDAtA.content);
				}
			}
		}
		return null;
	}

	privAte getKeybindingsContentFromSyncContent(syncContent: string): string | null {
		try {
			return getKeybindingsContentFromSyncContent(syncContent, this.syncKeybindingsPerPlAtform());
		} cAtch (e) {
			this.logService.error(e);
			return null;
		}
	}

	privAte toSyncContent(keybindingsContent: string, syncContent: string | null): string {
		let pArsed: ISyncContent = {};
		try {
			pArsed = JSON.pArse(syncContent || '{}');
		} cAtch (e) {
			this.logService.error(e);
		}
		if (!this.syncKeybindingsPerPlAtform()) {
			pArsed.All = keybindingsContent;
		} else {
			delete pArsed.All;
		}
		switch (OS) {
			cAse OperAtingSystem.MAcintosh:
				pArsed.mAc = keybindingsContent;
				breAk;
			cAse OperAtingSystem.Linux:
				pArsed.linux = keybindingsContent;
				breAk;
			cAse OperAtingSystem.Windows:
				pArsed.windows = keybindingsContent;
				breAk;
		}
		return JSON.stringify(pArsed);
	}

	privAte syncKeybindingsPerPlAtform(): booleAn {
		let userVAlue = this.configurAtionService.inspect<booleAn>('settingsSync.keybindingsPerPlAtform').userVAlue;
		if (userVAlue !== undefined) {
			return userVAlue;
		}
		userVAlue = this.configurAtionService.inspect<booleAn>('sync.keybindingsPerPlAtform').userVAlue;
		if (userVAlue !== undefined) {
			return userVAlue;
		}
		return this.configurAtionService.getVAlue<booleAn>('settingsSync.keybindingsPerPlAtform');
	}

}

export clAss KeybindingsInitiAlizer extends AbstrActInitiAlizer {

	constructor(
		@IFileService fileService: IFileService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IUserDAtASyncLogService logService: IUserDAtASyncLogService,
	) {
		super(SyncResource.Keybindings, environmentService, logService, fileService);
	}

	Async doInitiAlize(remoteUserDAtA: IRemoteUserDAtA): Promise<void> {
		const keybindingsContent = remoteUserDAtA.syncDAtA ? this.getKeybindingsContentFromSyncContent(remoteUserDAtA.syncDAtA.content) : null;
		if (!keybindingsContent) {
			this.logService.info('Skipping initiAlizing keybindings becAuse remote keybindings does not exist.');
			return;
		}

		const isEmpty = AwAit this.isEmpty();
		if (!isEmpty) {
			this.logService.info('Skipping initiAlizing keybindings becAuse locAl keybindings exist.');
			return;
		}

		AwAit this.fileService.writeFile(this.environmentService.keybindingsResource, VSBuffer.fromString(keybindingsContent));

		AwAit this.updAteLAstSyncUserDAtA(remoteUserDAtA);
	}

	privAte Async isEmpty(): Promise<booleAn> {
		try {
			const fileContent = AwAit this.fileService.reAdFile(this.environmentService.settingsResource);
			const keybindings = pArse(fileContent.vAlue.toString());
			return !isNonEmptyArrAy(keybindings);
		} cAtch (error) {
			return (<FileOperAtionError>error).fileOperAtionResult === FileOperAtionResult.FILE_NOT_FOUND;
		}
	}

	privAte getKeybindingsContentFromSyncContent(syncContent: string): string | null {
		try {
			return getKeybindingsContentFromSyncContent(syncContent, true);
		} cAtch (e) {
			this.logService.error(e);
			return null;
		}
	}

}
