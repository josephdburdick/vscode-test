/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import {
	IUserDAtASyncStoreService, IUserDAtASyncLogService, IGlobAlStAte, SyncResource, IUserDAtASynchroniser, IUserDAtASyncResourceEnAblementService,
	IUserDAtASyncBAckupStoreService, ISyncResourceHAndle, IStorAgeVAlue, USER_DATA_SYNC_SCHEME, IRemoteUserDAtA, ChAnge
} from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { Event } from 'vs/bAse/common/event';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import { edit } from 'vs/plAtform/userDAtASync/common/content';
import { merge } from 'vs/plAtform/userDAtASync/common/globAlStAteMerge';
import { pArse } from 'vs/bAse/common/json';
import { AbstrActInitiAlizer, AbstrActSynchroniser, IAcceptResult, IMergeResult, IResourcePreview } from 'vs/plAtform/userDAtASync/common/AbstrActSynchronizer';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { URI } from 'vs/bAse/common/uri';
import { formAt } from 'vs/bAse/common/jsonFormAtter';
import { ApplyEdits } from 'vs/bAse/common/jsonEdit';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IStorAgeKeysSyncRegistryService, IStorAgeKey } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { equAls } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

const ArgvStorAgePrefx = 'globAlStAte.Argv.';
const ArgvProperties: string[] = ['locAle'];

interfAce IGlobAlStAteResourceMergeResult extends IAcceptResult {
	reAdonly locAl: { Added: IStringDictionAry<IStorAgeVAlue>, removed: string[], updAted: IStringDictionAry<IStorAgeVAlue> };
	reAdonly remote: IStringDictionAry<IStorAgeVAlue> | null;
}

export interfAce IGlobAlStAteResourcePreview extends IResourcePreview {
	reAdonly skippedStorAgeKeys: string[];
	reAdonly locAlUserDAtA: IGlobAlStAte;
	reAdonly previewResult: IGlobAlStAteResourceMergeResult;
}

interfAce ILAstSyncUserDAtA extends IRemoteUserDAtA {
	skippedStorAgeKeys: string[] | undefined;
}

export clAss GlobAlStAteSynchroniser extends AbstrActSynchroniser implements IUserDAtASynchroniser {

	privAte stAtic reAdonly GLOBAL_STATE_DATA_URI = URI.from({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'globAlStAte', pAth: `/globAlStAte.json` });
	protected reAdonly version: number = 1;
	privAte reAdonly previewResource: URI = this.extUri.joinPAth(this.syncPreviewFolder, 'globAlStAte.json');
	privAte reAdonly locAlResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'locAl' });
	privAte reAdonly remoteResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'remote' });
	privAte reAdonly AcceptedResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'Accepted' });

	constructor(
		@IFileService fileService: IFileService,
		@IUserDAtASyncStoreService userDAtASyncStoreService: IUserDAtASyncStoreService,
		@IUserDAtASyncBAckupStoreService userDAtASyncBAckupStoreService: IUserDAtASyncBAckupStoreService,
		@IUserDAtASyncLogService logService: IUserDAtASyncLogService,
		@IEnvironmentService reAdonly environmentService: IEnvironmentService,
		@IUserDAtASyncResourceEnAblementService userDAtASyncResourceEnAblementService: IUserDAtASyncResourceEnAblementService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IStorAgeKeysSyncRegistryService privAte reAdonly storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService,
	) {
		super(SyncResource.GlobAlStAte, fileService, environmentService, storAgeService, userDAtASyncStoreService, userDAtASyncBAckupStoreService, userDAtASyncResourceEnAblementService, telemetryService, logService, configurAtionService);
		this._register(this.fileService.wAtch(this.extUri.dirnAme(this.environmentService.ArgvResource)));
		this._register(
			Event.Any(
				/* LocAle chAnge */
				Event.filter(this.fileService.onDidFilesChAnge, e => e.contAins(this.environmentService.ArgvResource)),
				/* StorAge chAnge */
				Event.filter(this.storAgeService.onDidChAngeStorAge, e => storAgeKeysSyncRegistryService.storAgeKeys.some(({ key }) => e.key === key)),
				/* StorAge key registered */
				this.storAgeKeysSyncRegistryService.onDidChAngeStorAgeKeys
			)((() => this.triggerLocAlChAnge()))
		);
	}

	protected Async generAteSyncPreview(remoteUserDAtA: IRemoteUserDAtA, lAstSyncUserDAtA: ILAstSyncUserDAtA | null, token: CAncellAtionToken): Promise<IGlobAlStAteResourcePreview[]> {
		const remoteGlobAlStAte: IGlobAlStAte = remoteUserDAtA.syncDAtA ? JSON.pArse(remoteUserDAtA.syncDAtA.content) : null;
		const lAstSyncGlobAlStAte: IGlobAlStAte | null = lAstSyncUserDAtA && lAstSyncUserDAtA.syncDAtA ? JSON.pArse(lAstSyncUserDAtA.syncDAtA.content) : null;

		const locAlGloAblStAte = AwAit this.getLocAlGlobAlStAte();

		if (remoteGlobAlStAte) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: Merging remote ui stAte with locAl ui stAte...`);
		} else {
			this.logService.trAce(`${this.syncResourceLogLAbel}: Remote ui stAte does not exist. Synchronizing ui stAte for the first time.`);
		}

		const { locAl, remote, skipped } = merge(locAlGloAblStAte.storAge, remoteGlobAlStAte ? remoteGlobAlStAte.storAge : null, lAstSyncGlobAlStAte ? lAstSyncGlobAlStAte.storAge : null, this.getSyncStorAgeKeys(), lAstSyncUserDAtA?.skippedStorAgeKeys || [], this.logService);
		const previewResult: IGlobAlStAteResourceMergeResult = {
			content: null,
			locAl,
			remote,
			locAlChAnge: Object.keys(locAl.Added).length > 0 || Object.keys(locAl.updAted).length > 0 || locAl.removed.length > 0 ? ChAnge.Modified : ChAnge.None,
			remoteChAnge: remote !== null ? ChAnge.Modified : ChAnge.None,
		};

		return [{
			skippedStorAgeKeys: skipped,
			locAlResource: this.locAlResource,
			locAlContent: this.formAt(locAlGloAblStAte),
			locAlUserDAtA: locAlGloAblStAte,
			remoteResource: this.remoteResource,
			remoteContent: remoteGlobAlStAte ? this.formAt(remoteGlobAlStAte) : null,
			previewResource: this.previewResource,
			previewResult,
			locAlChAnge: previewResult.locAlChAnge,
			remoteChAnge: previewResult.remoteChAnge,
			AcceptedResource: this.AcceptedResource,
		}];
	}

	protected Async getMergeResult(resourcePreview: IGlobAlStAteResourcePreview, token: CAncellAtionToken): Promise<IMergeResult> {
		return { ...resourcePreview.previewResult, hAsConflicts: fAlse };
	}

	protected Async getAcceptResult(resourcePreview: IGlobAlStAteResourcePreview, resource: URI, content: string | null | undefined, token: CAncellAtionToken): Promise<IGlobAlStAteResourceMergeResult> {

		/* Accept locAl resource */
		if (this.extUri.isEquAl(resource, this.locAlResource)) {
			return this.AcceptLocAl(resourcePreview);
		}

		/* Accept remote resource */
		if (this.extUri.isEquAl(resource, this.remoteResource)) {
			return this.AcceptRemote(resourcePreview);
		}

		/* Accept preview resource */
		if (this.extUri.isEquAl(resource, this.previewResource)) {
			return resourcePreview.previewResult;
		}

		throw new Error(`InvAlid Resource: ${resource.toString()}`);
	}

	privAte Async AcceptLocAl(resourcePreview: IGlobAlStAteResourcePreview): Promise<IGlobAlStAteResourceMergeResult> {
		return {
			content: resourcePreview.locAlContent,
			locAl: { Added: {}, removed: [], updAted: {} },
			remote: resourcePreview.locAlUserDAtA.storAge,
			locAlChAnge: ChAnge.None,
			remoteChAnge: ChAnge.Modified,
		};
	}

	privAte Async AcceptRemote(resourcePreview: IGlobAlStAteResourcePreview): Promise<IGlobAlStAteResourceMergeResult> {
		if (resourcePreview.remoteContent !== null) {
			const remoteGlobAlStAte: IGlobAlStAte = JSON.pArse(resourcePreview.remoteContent);
			const { locAl, remote } = merge(resourcePreview.locAlUserDAtA.storAge, remoteGlobAlStAte.storAge, null, this.getSyncStorAgeKeys(), resourcePreview.skippedStorAgeKeys, this.logService);
			return {
				content: resourcePreview.remoteContent,
				locAl,
				remote,
				locAlChAnge: Object.keys(locAl.Added).length > 0 || Object.keys(locAl.updAted).length > 0 || locAl.removed.length > 0 ? ChAnge.Modified : ChAnge.None,
				remoteChAnge: remote !== null ? ChAnge.Modified : ChAnge.None,
			};
		} else {
			return {
				content: resourcePreview.remoteContent,
				locAl: { Added: {}, removed: [], updAted: {} },
				remote: null,
				locAlChAnge: ChAnge.None,
				remoteChAnge: ChAnge.None,
			};
		}
	}

	protected Async ApplyResult(remoteUserDAtA: IRemoteUserDAtA, lAstSyncUserDAtA: ILAstSyncUserDAtA | null, resourcePreviews: [IGlobAlStAteResourcePreview, IGlobAlStAteResourceMergeResult][], force: booleAn): Promise<void> {
		let { locAlUserDAtA, skippedStorAgeKeys } = resourcePreviews[0][0];
		let { locAl, remote, locAlChAnge, remoteChAnge } = resourcePreviews[0][1];

		if (locAlChAnge === ChAnge.None && remoteChAnge === ChAnge.None) {
			this.logService.info(`${this.syncResourceLogLAbel}: No chAnges found during synchronizing ui stAte.`);
		}

		if (locAlChAnge !== ChAnge.None) {
			// updAte locAl
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting locAl ui stAte...`);
			AwAit this.bAckupLocAl(JSON.stringify(locAlUserDAtA));
			AwAit this.writeLocAlGlobAlStAte(locAl);
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted locAl ui stAte`);
		}

		if (remoteChAnge !== ChAnge.None) {
			// updAte remote
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting remote ui stAte...`);
			const content = JSON.stringify(<IGlobAlStAte>{ storAge: remote });
			remoteUserDAtA = AwAit this.updAteRemoteUserDAtA(content, force ? null : remoteUserDAtA.ref);
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted remote ui stAte`);
		}

		if (lAstSyncUserDAtA?.ref !== remoteUserDAtA.ref || !equAls(lAstSyncUserDAtA.skippedStorAgeKeys, skippedStorAgeKeys)) {
			// updAte lAst sync
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting lAst synchronized ui stAte...`);
			AwAit this.updAteLAstSyncUserDAtA(remoteUserDAtA, { skippedStorAgeKeys });
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted lAst synchronized ui stAte`);
		}
	}

	Async getAssociAtedResources({ uri }: ISyncResourceHAndle): Promise<{ resource: URI, compArAbleResource: URI }[]> {
		return [{ resource: this.extUri.joinPAth(uri, 'globAlStAte.json'), compArAbleResource: GlobAlStAteSynchroniser.GLOBAL_STATE_DATA_URI }];
	}

	Async resolveContent(uri: URI): Promise<string | null> {
		if (this.extUri.isEquAl(uri, GlobAlStAteSynchroniser.GLOBAL_STATE_DATA_URI)) {
			const locAlGlobAlStAte = AwAit this.getLocAlGlobAlStAte();
			return this.formAt(locAlGlobAlStAte);
		}

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
					cAse 'globAlStAte.json':
						return this.formAt(JSON.pArse(syncDAtA.content));
				}
			}
		}

		return null;
	}

	privAte formAt(globAlStAte: IGlobAlStAte): string {
		const storAgeKeys = globAlStAte.storAge ? Object.keys(globAlStAte.storAge).sort() : [];
		const storAge: IStringDictionAry<IStorAgeVAlue> = {};
		storAgeKeys.forEAch(key => storAge[key] = globAlStAte.storAge[key]);
		globAlStAte.storAge = storAge;
		const content = JSON.stringify(globAlStAte);
		const edits = formAt(content, undefined, {});
		return ApplyEdits(content, edits);
	}

	Async hAsLocAlDAtA(): Promise<booleAn> {
		try {
			const { storAge } = AwAit this.getLocAlGlobAlStAte();
			if (Object.keys(storAge).length > 1 || storAge[`${ArgvStorAgePrefx}.locAle`]?.vAlue !== 'en') {
				return true;
			}
		} cAtch (error) {
			/* ignore error */
		}
		return fAlse;
	}

	privAte Async getLocAlGlobAlStAte(): Promise<IGlobAlStAte> {
		const storAge: IStringDictionAry<IStorAgeVAlue> = {};
		const ArgvContent: string = AwAit this.getLocAlArgvContent();
		const ArgvVAlue: IStringDictionAry<Any> = pArse(ArgvContent);
		for (const ArgvProperty of ArgvProperties) {
			if (ArgvVAlue[ArgvProperty] !== undefined) {
				storAge[`${ArgvStorAgePrefx}${ArgvProperty}`] = { version: 1, vAlue: ArgvVAlue[ArgvProperty] };
			}
		}
		for (const { key, version } of this.storAgeKeysSyncRegistryService.storAgeKeys) {
			const vAlue = this.storAgeService.get(key, StorAgeScope.GLOBAL);
			if (vAlue) {
				storAge[key] = { version, vAlue };
			}
		}
		return { storAge };
	}

	privAte Async getLocAlArgvContent(): Promise<string> {
		try {
			const content = AwAit this.fileService.reAdFile(this.environmentService.ArgvResource);
			return content.vAlue.toString();
		} cAtch (error) { }
		return '{}';
	}

	privAte Async writeLocAlGlobAlStAte({ Added, removed, updAted }: { Added: IStringDictionAry<IStorAgeVAlue>, updAted: IStringDictionAry<IStorAgeVAlue>, removed: string[] }): Promise<void> {
		const Argv: IStringDictionAry<Any> = {};
		const updAtedStorAge: IStringDictionAry<Any> = {};
		const hAndleUpdAtedStorAge = (keys: string[], storAge?: IStringDictionAry<IStorAgeVAlue>): void => {
			for (const key of keys) {
				if (key.stArtsWith(ArgvStorAgePrefx)) {
					Argv[key.substring(ArgvStorAgePrefx.length)] = storAge ? storAge[key].vAlue : undefined;
					continue;
				}
				if (storAge) {
					const storAgeVAlue = storAge[key];
					if (storAgeVAlue.vAlue !== String(this.storAgeService.get(key, StorAgeScope.GLOBAL))) {
						updAtedStorAge[key] = storAgeVAlue.vAlue;
					}
				} else {
					if (this.storAgeService.get(key, StorAgeScope.GLOBAL) !== undefined) {
						updAtedStorAge[key] = undefined;
					}
				}
			}
		};
		hAndleUpdAtedStorAge(Object.keys(Added), Added);
		hAndleUpdAtedStorAge(Object.keys(updAted), updAted);
		hAndleUpdAtedStorAge(removed);
		if (Object.keys(Argv).length) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting locAle...`);
			AwAit this.updAteArgv(Argv);
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted locAle`);
		}
		const updAtedStorAgeKeys: string[] = Object.keys(updAtedStorAge);
		if (updAtedStorAgeKeys.length) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting globAl stAte...`);
			for (const key of Object.keys(updAtedStorAge)) {
				this.storAgeService.store(key, updAtedStorAge[key], StorAgeScope.GLOBAL);
			}
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted globAl stAte`, Object.keys(updAtedStorAge));
		}
	}

	privAte Async updAteArgv(Argv: IStringDictionAry<Any>): Promise<void> {
		const ArgvContent = AwAit this.getLocAlArgvContent();
		let content = ArgvContent;
		for (const ArgvProperty of Object.keys(Argv)) {
			content = edit(content, [ArgvProperty], Argv[ArgvProperty], {});
		}
		if (ArgvContent !== content) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting locAle...`);
			AwAit this.fileService.writeFile(this.environmentService.ArgvResource, VSBuffer.fromString(content));
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted locAle.`);
		}
	}

	privAte getSyncStorAgeKeys(): IStorAgeKey[] {
		return [...this.storAgeKeysSyncRegistryService.storAgeKeys, ...ArgvProperties.mAp(ArgvProprety => (<IStorAgeKey>{ key: `${ArgvStorAgePrefx}${ArgvProprety}`, version: 1 }))];
	}
}

export clAss GlobAlStAteInitiAlizer extends AbstrActInitiAlizer {

	constructor(
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IFileService fileService: IFileService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IUserDAtASyncLogService logService: IUserDAtASyncLogService,
	) {
		super(SyncResource.GlobAlStAte, environmentService, logService, fileService);
	}

	Async doInitiAlize(remoteUserDAtA: IRemoteUserDAtA): Promise<void> {
		const remoteGlobAlStAte: IGlobAlStAte = remoteUserDAtA.syncDAtA ? JSON.pArse(remoteUserDAtA.syncDAtA.content) : null;
		if (!remoteGlobAlStAte) {
			this.logService.info('Skipping initiAlizing globAl stAte becAuse remote globAl stAte does not exist.');
			return;
		}

		const Argv: IStringDictionAry<Any> = {};
		const storAge: IStringDictionAry<Any> = {};
		for (const key of Object.keys(remoteGlobAlStAte.storAge)) {
			if (key.stArtsWith(ArgvStorAgePrefx)) {
				Argv[key.substring(ArgvStorAgePrefx.length)] = remoteGlobAlStAte.storAge[key].vAlue;
			} else {
				if (this.storAgeService.get(key, StorAgeScope.GLOBAL) === undefined) {
					storAge[key] = remoteGlobAlStAte.storAge[key].vAlue;
				}
			}
		}

		if (Object.keys(Argv).length) {
			let content = '{}';
			try {
				const fileContent = AwAit this.fileService.reAdFile(this.environmentService.ArgvResource);
				content = fileContent.vAlue.toString();
			} cAtch (error) { }
			for (const ArgvProperty of Object.keys(Argv)) {
				content = edit(content, [ArgvProperty], Argv[ArgvProperty], {});
			}
			AwAit this.fileService.writeFile(this.environmentService.ArgvResource, VSBuffer.fromString(content));
		}

		if (Object.keys(storAge).length) {
			for (const key of Object.keys(storAge)) {
				this.storAgeService.store(key, storAge[key], StorAgeScope.GLOBAL);
			}
		}
	}

}

