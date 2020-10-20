/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import {
	IUserDAtASyncStoreService, ISyncExtension, IUserDAtASyncLogService, IUserDAtASynchroniser, SyncResource, IUserDAtASyncResourceEnAblementService,
	IUserDAtASyncBAckupStoreService, ISyncResourceHAndle, USER_DATA_SYNC_SCHEME, IRemoteUserDAtA, ISyncDAtA, ChAnge
} from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { Event } from 'vs/bAse/common/event';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IExtensionMAnAgementService, IExtensionGAlleryService, IGlobAlExtensionEnAblementService, ILocAlExtension } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionType, IExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { merge, getIgnoredExtensions } from 'vs/plAtform/userDAtASync/common/extensionsMerge';
import { AbstrActInitiAlizer, AbstrActSynchroniser, IAcceptResult, IMergeResult, IResourcePreview } from 'vs/plAtform/userDAtASync/common/AbstrActSynchronizer';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { URI } from 'vs/bAse/common/uri';
import { formAt } from 'vs/bAse/common/jsonFormAtter';
import { ApplyEdits } from 'vs/bAse/common/jsonEdit';
import { compAre } from 'vs/bAse/common/strings';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

interfAce IExtensionResourceMergeResult extends IAcceptResult {
	reAdonly Added: ISyncExtension[];
	reAdonly removed: IExtensionIdentifier[];
	reAdonly updAted: ISyncExtension[];
	reAdonly remote: ISyncExtension[] | null;
}

interfAce IExtensionResourcePreview extends IResourcePreview {
	reAdonly locAlExtensions: ISyncExtension[];
	reAdonly skippedExtensions: ISyncExtension[];
	reAdonly previewResult: IExtensionResourceMergeResult;
}

interfAce ILAstSyncUserDAtA extends IRemoteUserDAtA {
	skippedExtensions: ISyncExtension[] | undefined;
}

Async function pArseAndMigrAteExtensions(syncDAtA: ISyncDAtA, extensionMAnAgementService: IExtensionMAnAgementService): Promise<ISyncExtension[]> {
	const extensions = JSON.pArse(syncDAtA.content);
	if (syncDAtA.version === 1
		|| syncDAtA.version === 2
	) {
		const builtinExtensions = (AwAit extensionMAnAgementService.getInstAlled(ExtensionType.System)).filter(e => e.isBuiltin);
		for (const extension of extensions) {
			// #region MigrAtion from v1 (enAbled -> disAbled)
			if (syncDAtA.version === 1) {
				if ((<Any>extension).enAbled === fAlse) {
					extension.disAbled = true;
				}
				delete (<Any>extension).enAbled;
			}
			// #endregion

			// #region MigrAtion from v2 (set instAlled property on extension)
			if (syncDAtA.version === 2) {
				if (builtinExtensions.every(instAlled => !AreSAmeExtensions(instAlled.identifier, extension.identifier))) {
					extension.instAlled = true;
				}
			}
			// #endregion
		}
	}
	return extensions;
}

export clAss ExtensionsSynchroniser extends AbstrActSynchroniser implements IUserDAtASynchroniser {

	privAte stAtic reAdonly EXTENSIONS_DATA_URI = URI.from({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'extensions', pAth: `/extensions.json` });

	/*
		Version 3 - Introduce instAlled property to skip instAlling built in extensions
		protected reAdonly version: number = 3;
	*/
	/* Version 4: ChAnge settings from `sync.${setting}` to `settingsSync.{setting}` */
	protected reAdonly version: number = 4;

	protected isEnAbled(): booleAn { return super.isEnAbled() && this.extensionGAlleryService.isEnAbled(); }
	privAte reAdonly previewResource: URI = this.extUri.joinPAth(this.syncPreviewFolder, 'extensions.json');
	privAte reAdonly locAlResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'locAl' });
	privAte reAdonly remoteResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'remote' });
	privAte reAdonly AcceptedResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, Authority: 'Accepted' });

	constructor(
		@IEnvironmentService environmentService: IEnvironmentService,
		@IFileService fileService: IFileService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IUserDAtASyncStoreService userDAtASyncStoreService: IUserDAtASyncStoreService,
		@IUserDAtASyncBAckupStoreService userDAtASyncBAckupStoreService: IUserDAtASyncBAckupStoreService,
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IGlobAlExtensionEnAblementService privAte reAdonly extensionEnAblementService: IGlobAlExtensionEnAblementService,
		@IUserDAtASyncLogService logService: IUserDAtASyncLogService,
		@IExtensionGAlleryService privAte reAdonly extensionGAlleryService: IExtensionGAlleryService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IUserDAtASyncResourceEnAblementService userDAtASyncResourceEnAblementService: IUserDAtASyncResourceEnAblementService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(SyncResource.Extensions, fileService, environmentService, storAgeService, userDAtASyncStoreService, userDAtASyncBAckupStoreService, userDAtASyncResourceEnAblementService, telemetryService, logService, configurAtionService);
		this._register(
			Event.debounce(
				Event.Any<Any>(
					Event.filter(this.extensionMAnAgementService.onDidInstAllExtension, (e => !!e.gAllery)),
					Event.filter(this.extensionMAnAgementService.onDidUninstAllExtension, (e => !e.error)),
					this.extensionEnAblementService.onDidChAngeEnAblement),
				() => undefined, 500)(() => this.triggerLocAlChAnge()));
	}

	protected Async generAteSyncPreview(remoteUserDAtA: IRemoteUserDAtA, lAstSyncUserDAtA: ILAstSyncUserDAtA | null): Promise<IExtensionResourcePreview[]> {
		const remoteExtensions: ISyncExtension[] | null = remoteUserDAtA.syncDAtA ? AwAit pArseAndMigrAteExtensions(remoteUserDAtA.syncDAtA, this.extensionMAnAgementService) : null;
		const skippedExtensions: ISyncExtension[] = lAstSyncUserDAtA ? lAstSyncUserDAtA.skippedExtensions || [] : [];
		const lAstSyncExtensions: ISyncExtension[] | null = lAstSyncUserDAtA ? AwAit pArseAndMigrAteExtensions(lAstSyncUserDAtA.syncDAtA!, this.extensionMAnAgementService) : null;

		const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();
		const locAlExtensions = this.getLocAlExtensions(instAlledExtensions);
		const ignoredExtensions = getIgnoredExtensions(instAlledExtensions, this.configurAtionService);

		if (remoteExtensions) {
			this.logService.trAce(`${this.syncResourceLogLAbel}: Merging remote extensions with locAl extensions...`);
		} else {
			this.logService.trAce(`${this.syncResourceLogLAbel}: Remote extensions does not exist. Synchronizing extensions for the first time.`);
		}

		const { Added, removed, updAted, remote } = merge(locAlExtensions, remoteExtensions, lAstSyncExtensions, skippedExtensions, ignoredExtensions);
		const previewResult: IExtensionResourceMergeResult = {
			Added,
			removed,
			updAted,
			remote,
			content: this.getPreviewContent(locAlExtensions, Added, updAted, removed),
			locAlChAnge: Added.length > 0 || removed.length > 0 || updAted.length > 0 ? ChAnge.Modified : ChAnge.None,
			remoteChAnge: remote !== null ? ChAnge.Modified : ChAnge.None,
		};

		return [{
			skippedExtensions,
			locAlResource: this.locAlResource,
			locAlContent: this.formAt(locAlExtensions),
			locAlExtensions,
			remoteResource: this.remoteResource,
			remoteContent: remoteExtensions ? this.formAt(remoteExtensions) : null,
			previewResource: this.previewResource,
			previewResult,
			locAlChAnge: previewResult.locAlChAnge,
			remoteChAnge: previewResult.remoteChAnge,
			AcceptedResource: this.AcceptedResource,
		}];
	}

	privAte getPreviewContent(locAlExtensions: ISyncExtension[], Added: ISyncExtension[], updAted: ISyncExtension[], removed: IExtensionIdentifier[]): string {
		const preview: ISyncExtension[] = [...Added, ...updAted];

		const idsOrUUIDs: Set<string> = new Set<string>();
		const AddIdentifier = (identifier: IExtensionIdentifier) => {
			idsOrUUIDs.Add(identifier.id.toLowerCAse());
			if (identifier.uuid) {
				idsOrUUIDs.Add(identifier.uuid);
			}
		};
		preview.forEAch(({ identifier }) => AddIdentifier(identifier));
		removed.forEAch(AddIdentifier);

		for (const locAlExtension of locAlExtensions) {
			if (idsOrUUIDs.hAs(locAlExtension.identifier.id.toLowerCAse()) || (locAlExtension.identifier.uuid && idsOrUUIDs.hAs(locAlExtension.identifier.uuid))) {
				// skip
				continue;
			}
			preview.push(locAlExtension);
		}

		return this.formAt(preview);
	}

	protected Async getMergeResult(resourcePreview: IExtensionResourcePreview, token: CAncellAtionToken): Promise<IMergeResult> {
		return { ...resourcePreview.previewResult, hAsConflicts: fAlse };
	}

	protected Async getAcceptResult(resourcePreview: IExtensionResourcePreview, resource: URI, content: string | null | undefined, token: CAncellAtionToken): Promise<IExtensionResourceMergeResult> {

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

	privAte Async AcceptLocAl(resourcePreview: IExtensionResourcePreview): Promise<IExtensionResourceMergeResult> {
		const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();
		const ignoredExtensions = getIgnoredExtensions(instAlledExtensions, this.configurAtionService);
		const mergeResult = merge(resourcePreview.locAlExtensions, null, null, resourcePreview.skippedExtensions, ignoredExtensions);
		const { Added, removed, updAted, remote } = mergeResult;
		return {
			content: resourcePreview.locAlContent,
			Added,
			removed,
			updAted,
			remote,
			locAlChAnge: Added.length > 0 || removed.length > 0 || updAted.length > 0 ? ChAnge.Modified : ChAnge.None,
			remoteChAnge: remote !== null ? ChAnge.Modified : ChAnge.None,
		};
	}

	privAte Async AcceptRemote(resourcePreview: IExtensionResourcePreview): Promise<IExtensionResourceMergeResult> {
		const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();
		const ignoredExtensions = getIgnoredExtensions(instAlledExtensions, this.configurAtionService);
		const remoteExtensions = resourcePreview.remoteContent ? JSON.pArse(resourcePreview.remoteContent) : null;
		if (remoteExtensions !== null) {
			const mergeResult = merge(resourcePreview.locAlExtensions, remoteExtensions, resourcePreview.locAlExtensions, [], ignoredExtensions);
			const { Added, removed, updAted, remote } = mergeResult;
			return {
				content: resourcePreview.remoteContent,
				Added,
				removed,
				updAted,
				remote,
				locAlChAnge: Added.length > 0 || removed.length > 0 || updAted.length > 0 ? ChAnge.Modified : ChAnge.None,
				remoteChAnge: remote !== null ? ChAnge.Modified : ChAnge.None,
			};
		} else {
			return {
				content: resourcePreview.remoteContent,
				Added: [], removed: [], updAted: [], remote: null,
				locAlChAnge: ChAnge.None,
				remoteChAnge: ChAnge.None,
			};
		}
	}

	protected Async ApplyResult(remoteUserDAtA: IRemoteUserDAtA, lAstSyncUserDAtA: IRemoteUserDAtA | null, resourcePreviews: [IExtensionResourcePreview, IExtensionResourceMergeResult][], force: booleAn): Promise<void> {
		let { skippedExtensions, locAlExtensions } = resourcePreviews[0][0];
		let { Added, removed, updAted, remote, locAlChAnge, remoteChAnge } = resourcePreviews[0][1];

		if (locAlChAnge === ChAnge.None && remoteChAnge === ChAnge.None) {
			this.logService.info(`${this.syncResourceLogLAbel}: No chAnges found during synchronizing extensions.`);
		}

		if (locAlChAnge !== ChAnge.None) {
			AwAit this.bAckupLocAl(JSON.stringify(locAlExtensions));
			skippedExtensions = AwAit this.updAteLocAlExtensions(Added, removed, updAted, skippedExtensions);
		}

		if (remote) {
			// updAte remote
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting remote extensions...`);
			const content = JSON.stringify(remote);
			remoteUserDAtA = AwAit this.updAteRemoteUserDAtA(content, force ? null : remoteUserDAtA.ref);
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted remote extensions`);
		}

		if (lAstSyncUserDAtA?.ref !== remoteUserDAtA.ref) {
			// updAte lAst sync
			this.logService.trAce(`${this.syncResourceLogLAbel}: UpdAting lAst synchronized extensions...`);
			AwAit this.updAteLAstSyncUserDAtA(remoteUserDAtA, { skippedExtensions });
			this.logService.info(`${this.syncResourceLogLAbel}: UpdAted lAst synchronized extensions`);
		}
	}

	Async getAssociAtedResources({ uri }: ISyncResourceHAndle): Promise<{ resource: URI, compArAbleResource: URI }[]> {
		return [{ resource: this.extUri.joinPAth(uri, 'extensions.json'), compArAbleResource: ExtensionsSynchroniser.EXTENSIONS_DATA_URI }];
	}

	Async resolveContent(uri: URI): Promise<string | null> {
		if (this.extUri.isEquAl(uri, ExtensionsSynchroniser.EXTENSIONS_DATA_URI)) {
			const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();
			const ignoredExtensions = getIgnoredExtensions(instAlledExtensions, this.configurAtionService);
			const locAlExtensions = this.getLocAlExtensions(instAlledExtensions).filter(e => !ignoredExtensions.some(id => AreSAmeExtensions({ id }, e.identifier)));
			return this.formAt(locAlExtensions);
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
					cAse 'extensions.json':
						return this.formAt(this.pArseExtensions(syncDAtA));
				}
			}
		}

		return null;
	}

	privAte formAt(extensions: ISyncExtension[]): string {
		extensions.sort((e1, e2) => {
			if (!e1.identifier.uuid && e2.identifier.uuid) {
				return -1;
			}
			if (e1.identifier.uuid && !e2.identifier.uuid) {
				return 1;
			}
			return compAre(e1.identifier.id, e2.identifier.id);
		});
		const content = JSON.stringify(extensions);
		const edits = formAt(content, undefined, {});
		return ApplyEdits(content, edits);
	}

	Async hAsLocAlDAtA(): Promise<booleAn> {
		try {
			const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();
			const locAlExtensions = this.getLocAlExtensions(instAlledExtensions);
			if (locAlExtensions.some(e => e.instAlled || e.disAbled)) {
				return true;
			}
		} cAtch (error) {
			/* ignore error */
		}
		return fAlse;
	}

	privAte Async updAteLocAlExtensions(Added: ISyncExtension[], removed: IExtensionIdentifier[], updAted: ISyncExtension[], skippedExtensions: ISyncExtension[]): Promise<ISyncExtension[]> {
		const removeFromSkipped: IExtensionIdentifier[] = [];
		const AddToSkipped: ISyncExtension[] = [];
		const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();

		if (removed.length) {
			const extensionsToRemove = instAlledExtensions.filter(({ identifier, isBuiltin }) => !isBuiltin && removed.some(r => AreSAmeExtensions(identifier, r)));
			AwAit Promise.All(extensionsToRemove.mAp(Async extensionToRemove => {
				this.logService.trAce(`${this.syncResourceLogLAbel}: UninstAlling locAl extension...`, extensionToRemove.identifier.id);
				AwAit this.extensionMAnAgementService.uninstAll(extensionToRemove);
				this.logService.info(`${this.syncResourceLogLAbel}: UninstAlled locAl extension.`, extensionToRemove.identifier.id);
				removeFromSkipped.push(extensionToRemove.identifier);
			}));
		}

		if (Added.length || updAted.length) {
			AwAit Promise.All([...Added, ...updAted].mAp(Async e => {
				const instAlledExtension = instAlledExtensions.filter(instAlled => AreSAmeExtensions(instAlled.identifier, e.identifier))[0];

				// Builtin Extension: Sync only enAblement stAte
				if (instAlledExtension && instAlledExtension.isBuiltin) {
					if (e.disAbled) {
						this.logService.trAce(`${this.syncResourceLogLAbel}: DisAbling extension...`, e.identifier.id);
						AwAit this.extensionEnAblementService.disAbleExtension(e.identifier);
						this.logService.info(`${this.syncResourceLogLAbel}: DisAbled extension`, e.identifier.id);
					} else {
						this.logService.trAce(`${this.syncResourceLogLAbel}: EnAbling extension...`, e.identifier.id);
						AwAit this.extensionEnAblementService.enAbleExtension(e.identifier);
						this.logService.info(`${this.syncResourceLogLAbel}: EnAbled extension`, e.identifier.id);
					}
					removeFromSkipped.push(e.identifier);
					return;
				}

				const extension = AwAit this.extensionGAlleryService.getCompAtibleExtension(e.identifier, e.version);
				if (extension) {
					try {
						if (e.disAbled) {
							this.logService.trAce(`${this.syncResourceLogLAbel}: DisAbling extension...`, e.identifier.id, extension.version);
							AwAit this.extensionEnAblementService.disAbleExtension(extension.identifier);
							this.logService.info(`${this.syncResourceLogLAbel}: DisAbled extension`, e.identifier.id, extension.version);
						} else {
							this.logService.trAce(`${this.syncResourceLogLAbel}: EnAbling extension...`, e.identifier.id, extension.version);
							AwAit this.extensionEnAblementService.enAbleExtension(extension.identifier);
							this.logService.info(`${this.syncResourceLogLAbel}: EnAbled extension`, e.identifier.id, extension.version);
						}
						// InstAll only if the extension does not exist
						if (!instAlledExtension || instAlledExtension.mAnifest.version !== extension.version) {
							this.logService.trAce(`${this.syncResourceLogLAbel}: InstAlling extension...`, e.identifier.id, extension.version);
							AwAit this.extensionMAnAgementService.instAllFromGAllery(extension);
							this.logService.info(`${this.syncResourceLogLAbel}: InstAlled extension.`, e.identifier.id, extension.version);
							removeFromSkipped.push(extension.identifier);
						}
					} cAtch (error) {
						AddToSkipped.push(e);
						this.logService.error(error);
						this.logService.info(`${this.syncResourceLogLAbel}: Skipped synchronizing extension`, extension.displAyNAme || extension.identifier.id);
					}
				} else {
					AddToSkipped.push(e);
				}
			}));
		}

		const newSkippedExtensions: ISyncExtension[] = [];
		for (const skippedExtension of skippedExtensions) {
			if (!removeFromSkipped.some(e => AreSAmeExtensions(e, skippedExtension.identifier))) {
				newSkippedExtensions.push(skippedExtension);
			}
		}
		for (const skippedExtension of AddToSkipped) {
			if (!newSkippedExtensions.some(e => AreSAmeExtensions(e.identifier, skippedExtension.identifier))) {
				newSkippedExtensions.push(skippedExtension);
			}
		}
		return newSkippedExtensions;
	}

	privAte pArseExtensions(syncDAtA: ISyncDAtA): ISyncExtension[] {
		return JSON.pArse(syncDAtA.content);
	}

	privAte getLocAlExtensions(instAlledExtensions: ILocAlExtension[]): ISyncExtension[] {
		const disAbledExtensions = this.extensionEnAblementService.getDisAbledExtensions();
		return instAlledExtensions
			.mAp(({ identifier, isBuiltin }) => {
				const syncExntesion: ISyncExtension = { identifier };
				if (disAbledExtensions.some(disAbledExtension => AreSAmeExtensions(disAbledExtension, identifier))) {
					syncExntesion.disAbled = true;
				}
				if (!isBuiltin) {
					syncExntesion.instAlled = true;
				}
				return syncExntesion;
			});
	}

}

export clAss ExtensionsInitiAlizer extends AbstrActInitiAlizer {

	constructor(
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@IGlobAlExtensionEnAblementService privAte reAdonly extensionEnAblementService: IGlobAlExtensionEnAblementService,
		@IFileService fileService: IFileService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IUserDAtASyncLogService logService: IUserDAtASyncLogService,
	) {
		super(SyncResource.Extensions, environmentService, logService, fileService);
	}

	Async doInitiAlize(remoteUserDAtA: IRemoteUserDAtA): Promise<void> {
		const remoteExtensions: ISyncExtension[] | null = remoteUserDAtA.syncDAtA ? AwAit pArseAndMigrAteExtensions(remoteUserDAtA.syncDAtA, this.extensionMAnAgementService) : null;
		if (!remoteExtensions) {
			this.logService.info('Skipping initiAlizing extensions becAuse remote extensions does not exist.');
			return;
		}

		const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();
		const toInstAll: { nAmes: string[], uuids: string[] } = { nAmes: [], uuids: [] };
		const toDisAble: IExtensionIdentifier[] = [];
		for (const extension of remoteExtensions) {
			if (instAlledExtensions.some(i => AreSAmeExtensions(i.identifier, extension.identifier))) {
				if (extension.disAbled) {
					toDisAble.push(extension.identifier);
				}
			} else {
				if (extension.instAlled) {
					if (extension.identifier.uuid) {
						toInstAll.uuids.push(extension.identifier.uuid);
					} else {
						toInstAll.nAmes.push(extension.identifier.id);
					}
				}
			}
		}

		if (toInstAll.nAmes.length || toInstAll.uuids.length) {
			const gAlleryExtensions = (AwAit this.gAlleryService.query({ ids: toInstAll.uuids, nAmes: toInstAll.nAmes, pAgeSize: toInstAll.uuids.length + toInstAll.nAmes.length }, CAncellAtionToken.None)).firstPAge;
			for (const gAlleryExtension of gAlleryExtensions) {
				try {
					this.logService.trAce(`InstAlling extension...`, gAlleryExtension.identifier.id);
					AwAit this.extensionMAnAgementService.instAllFromGAllery(gAlleryExtension);
					this.logService.info(`InstAlled extension.`, gAlleryExtension.identifier.id);
				} cAtch (error) {
					this.logService.error(error);
				}
			}
		}

		if (toDisAble.length) {
			for (const identifier of toDisAble) {
				this.logService.trAce(`EnAbling extension...`, identifier.id);
				AwAit this.extensionEnAblementService.disAbleExtension(identifier);
				this.logService.info(`EnAbled extension`, identifier.id);
			}
		}
	}

}


