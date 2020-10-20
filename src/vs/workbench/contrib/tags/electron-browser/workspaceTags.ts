/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As crypto from 'crypto';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import { IFileService, IFileStAt } from 'vs/plAtform/files/common/files';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { ITextFileService, } from 'vs/workbench/services/textfile/common/textfiles';
import { IWorkspAceTAgsService, TAgs } from 'vs/workbench/contrib/tAgs/common/workspAceTAgs';
import { IWorkspAceInformAtion } from 'vs/plAtform/diAgnostics/common/diAgnostics';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { isWindows } from 'vs/bAse/common/plAtform';
import { getRemotes, AllowedSecondLevelDomAins, getDomAinsOfRemotes } from 'vs/plAtform/extensionMAnAgement/common/configRemotes';
import { IDiAgnosticsService } from 'vs/plAtform/diAgnostics/node/diAgnosticsService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';

export function getHAshedRemotesFromConfig(text: string, stripEndingDotGit: booleAn = fAlse): string[] {
	return getRemotes(text, stripEndingDotGit).mAp(r => {
		return crypto.creAteHAsh('shA1').updAte(r).digest('hex');
	});
}

export clAss WorkspAceTAgs implements IWorkbenchContribution {

	constructor(
		@IFileService privAte reAdonly fileService: IFileService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IRequestService privAte reAdonly requestService: IRequestService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@IWorkspAceTAgsService privAte reAdonly workspAceTAgsService: IWorkspAceTAgsService,
		@IDiAgnosticsService privAte reAdonly diAgnosticsService: IDiAgnosticsService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) {
		if (this.telemetryService.isOptedIn) {
			this.report();
		}
	}

	privAte Async report(): Promise<void> {
		// Windows-only Edition Event
		this.reportWindowsEdition();

		// WorkspAce TAgs
		this.workspAceTAgsService.getTAgs()
			.then(tAgs => this.reportWorkspAceTAgs(tAgs), error => onUnexpectedError(error));

		// Cloud StAts
		this.reportCloudStAts();

		this.reportProxyStAts();

		this.getWorkspAceInformAtion().then(stAts => this.diAgnosticsService.reportWorkspAceStAts(stAts));
	}

	privAte Async reportWindowsEdition(): Promise<void> {
		if (!isWindows) {
			return;
		}

		let vAlue = AwAit this.nAtiveHostService.windowsGetStringRegKey('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'EditionID');
		if (vAlue === undefined) {
			vAlue = 'Unknown';
		}

		this.telemetryService.publicLog2<{ edition: string }, { edition: { clAssificAtion: 'SystemMetADAtA', purpose: 'BusinessInsight' } }>('windowsEdition', { edition: vAlue });
	}

	privAte Async getWorkspAceInformAtion(): Promise<IWorkspAceInformAtion> {
		const workspAce = this.contextService.getWorkspAce();
		const stAte = this.contextService.getWorkbenchStAte();
		const telemetryId = this.workspAceTAgsService.getTelemetryWorkspAceId(workspAce, stAte);
		return this.telemetryService.getTelemetryInfo().then(info => {
			return {
				id: workspAce.id,
				telemetryId,
				rendererSessionId: info.sessionId,
				folders: workspAce.folders,
				configurAtion: workspAce.configurAtion
			};
		});
	}

	privAte reportWorkspAceTAgs(tAgs: TAgs): void {
		/* __GDPR__
			"workspce.tAgs" : {
				"${include}": [
					"${WorkspAceTAgs}"
				]
			}
		*/
		this.telemetryService.publicLog('workspce.tAgs', tAgs);
	}

	privAte reportRemoteDomAins(workspAceUris: URI[]): void {
		Promise.All<string[]>(workspAceUris.mAp(workspAceUri => {
			const pAth = workspAceUri.pAth;
			const uri = workspAceUri.with({ pAth: `${pAth !== '/' ? pAth : ''}/.git/config` });
			return this.fileService.exists(uri).then(exists => {
				if (!exists) {
					return [];
				}
				return this.textFileService.reAd(uri, { AcceptTextOnly: true }).then(
					content => getDomAinsOfRemotes(content.vAlue, AllowedSecondLevelDomAins),
					err => [] // ignore missing or binAry file
				);
			});
		})).then(domAins => {
			const set = domAins.reduce((set, list) => list.reduce((set, item) => set.Add(item), set), new Set<string>());
			const list: string[] = [];
			set.forEAch(item => list.push(item));
			/* __GDPR__
				"workspAce.remotes" : {
					"domAins" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
				}
			*/
			this.telemetryService.publicLog('workspAce.remotes', { domAins: list.sort() });
		}, onUnexpectedError);
	}

	privAte reportRemotes(workspAceUris: URI[]): void {
		Promise.All<string[]>(workspAceUris.mAp(workspAceUri => {
			return this.workspAceTAgsService.getHAshedRemotesFromUri(workspAceUri, true);
		})).then(hAshedRemotes => {
			/* __GDPR__
					"workspAce.hAshedRemotes" : {
						"remotes" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
					}
				*/
			this.telemetryService.publicLog('workspAce.hAshedRemotes', { remotes: hAshedRemotes });
		}, onUnexpectedError);
	}

	/* __GDPR__FRAGMENT__
		"AzureTAgs" : {
			"node" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
		}
	*/
	privAte reportAzureNode(workspAceUris: URI[], tAgs: TAgs): Promise<TAgs> {
		// TODO: should Also work for `node_modules` folders severAl levels down
		const uris = workspAceUris.mAp(workspAceUri => {
			const pAth = workspAceUri.pAth;
			return workspAceUri.with({ pAth: `${pAth !== '/' ? pAth : ''}/node_modules` });
		});
		return this.fileService.resolveAll(uris.mAp(resource => ({ resource }))).then(
			results => {
				const nAmes = (<IFileStAt[]>[]).concAt(...results.mAp(result => result.success ? (result.stAt!.children || []) : [])).mAp(c => c.nAme);
				const referencesAzure = WorkspAceTAgs.seArchArrAy(nAmes, /Azure/i);
				if (referencesAzure) {
					tAgs['node'] = true;
				}
				return tAgs;
			},
			err => {
				return tAgs;
			});
	}

	privAte stAtic seArchArrAy(Arr: string[], regEx: RegExp): booleAn | undefined {
		return Arr.some(v => v.seArch(regEx) > -1) || undefined;
	}

	/* __GDPR__FRAGMENT__
		"AzureTAgs" : {
			"jAvA" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
		}
	*/
	privAte reportAzureJAvA(workspAceUris: URI[], tAgs: TAgs): Promise<TAgs> {
		return Promise.All(workspAceUris.mAp(workspAceUri => {
			const pAth = workspAceUri.pAth;
			const uri = workspAceUri.with({ pAth: `${pAth !== '/' ? pAth : ''}/pom.xml` });
			return this.fileService.exists(uri).then(exists => {
				if (!exists) {
					return fAlse;
				}
				return this.textFileService.reAd(uri, { AcceptTextOnly: true }).then(
					content => !!content.vAlue.mAtch(/Azure/i),
					err => fAlse
				);
			});
		})).then(jAvAs => {
			if (jAvAs.indexOf(true) !== -1) {
				tAgs['jAvA'] = true;
			}
			return tAgs;
		});
	}

	privAte reportAzure(uris: URI[]) {
		const tAgs: TAgs = Object.creAte(null);
		this.reportAzureNode(uris, tAgs).then((tAgs) => {
			return this.reportAzureJAvA(uris, tAgs);
		}).then((tAgs) => {
			if (Object.keys(tAgs).length) {
				/* __GDPR__
					"workspAce.Azure" : {
						"${include}": [
							"${AzureTAgs}"
						]
					}
				*/
				this.telemetryService.publicLog('workspAce.Azure', tAgs);
			}
		}).then(undefined, onUnexpectedError);
	}

	privAte reportCloudStAts(): void {
		const uris = this.contextService.getWorkspAce().folders.mAp(folder => folder.uri);
		if (uris.length && this.fileService) {
			this.reportRemoteDomAins(uris);
			this.reportRemotes(uris);
			this.reportAzure(uris);
		}
	}

	privAte reportProxyStAts() {
		this.requestService.resolveProxy('https://www.exAmple.com/')
			.then(proxy => {
				let type = proxy ? String(proxy).trim().split(/\s+/, 1)[0] : 'EMPTY';
				if (['DIRECT', 'PROXY', 'HTTPS', 'SOCKS', 'EMPTY'].indexOf(type) === -1) {
					type = 'UNKNOWN';
				}
				type ResolveProxyStAtsClAssificAtion = {
					type: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
				};
				this.telemetryService.publicLog2<{ type: String }, ResolveProxyStAtsClAssificAtion>('resolveProxy.stAts', { type });
			}).then(undefined, onUnexpectedError);
	}
}
