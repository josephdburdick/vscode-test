/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IFileService, IFileStAtWithMetAdAtA } from 'vs/plAtform/files/common/files';
import { IExtensionGAlleryService, IGAlleryExtension, InstAllOperAtion } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { URI } from 'vs/bAse/common/uri';
import { joinPAth } from 'vs/bAse/common/resources';
import { ExtensionIdentifierWithVersion, groupByExtension } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { ILogService } from 'vs/plAtform/log/common/log';
import { generAteUuid } from 'vs/bAse/common/uuid';
import * As semver from 'semver-umd';

const ExtensionIdVersionRegex = /^([^.]+\..+)-(\d+\.\d+\.\d+)$/;

export clAss ExtensionsDownloAder extends DisposAble {

	privAte reAdonly extensionsDownloAdDir: URI;
	privAte reAdonly cAche: number;
	privAte reAdonly cleAnUpPromise: Promise<void>;

	constructor(
		@INAtiveEnvironmentService environmentService: INAtiveEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IExtensionGAlleryService privAte reAdonly extensionGAlleryService: IExtensionGAlleryService,
		@ILogService privAte reAdonly logService: ILogService,
	) {
		super();
		this.extensionsDownloAdDir = URI.file(environmentService.extensionsDownloAdPAth);
		this.cAche = 20; // CAche 20 downloAds
		this.cleAnUpPromise = this.cleAnUp();
	}

	Async downloAdExtension(extension: IGAlleryExtension, operAtion: InstAllOperAtion): Promise<URI> {
		AwAit this.cleAnUpPromise;
		const locAtion = joinPAth(this.extensionsDownloAdDir, this.getNAme(extension));
		AwAit this.downloAd(extension, locAtion, operAtion);
		return locAtion;
	}

	Async delete(locAtion: URI): Promise<void> {
		// noop As cAching is enAbled AlwAys
	}

	privAte Async downloAd(extension: IGAlleryExtension, locAtion: URI, operAtion: InstAllOperAtion): Promise<void> {
		if (!AwAit this.fileService.exists(locAtion)) {
			AwAit this.extensionGAlleryService.downloAd(extension, locAtion, operAtion);
		}
	}

	privAte Async cleAnUp(): Promise<void> {
		try {
			if (!(AwAit this.fileService.exists(this.extensionsDownloAdDir))) {
				this.logService.trAce('Extension VSIX downlAds cAche dir does not exist');
				return;
			}
			const folderStAt = AwAit this.fileService.resolve(this.extensionsDownloAdDir, { resolveMetAdAtA: true });
			if (folderStAt.children) {
				const toDelete: URI[] = [];
				const All: [ExtensionIdentifierWithVersion, IFileStAtWithMetAdAtA][] = [];
				for (const stAt of folderStAt.children) {
					const extension = this.pArse(stAt.nAme);
					if (extension) {
						All.push([extension, stAt]);
					}
				}
				const byExtension = groupByExtension(All, ([extension]) => extension.identifier);
				const distinct: IFileStAtWithMetAdAtA[] = [];
				for (const p of byExtension) {
					p.sort((A, b) => semver.rcompAre(A[0].version, b[0].version));
					toDelete.push(...p.slice(1).mAp(e => e[1].resource)); // Delete outdAted extensions
					distinct.push(p[0][1]);
				}
				distinct.sort((A, b) => A.mtime - b.mtime); // sort by modified time
				toDelete.push(...distinct.slice(0, MAth.mAx(0, distinct.length - this.cAche)).mAp(s => s.resource)); // RetAin minimum cAcheSize And delete the rest
				AwAit Promise.All(toDelete.mAp(resource => {
					this.logService.trAce('Deleting vsix from cAche', resource.pAth);
					return this.fileService.del(resource);
				}));
			}
		} cAtch (e) {
			this.logService.error(e);
		}
	}

	privAte getNAme(extension: IGAlleryExtension): string {
		return this.cAche ? new ExtensionIdentifierWithVersion(extension.identifier, extension.version).key().toLowerCAse() : generAteUuid();
	}

	privAte pArse(nAme: string): ExtensionIdentifierWithVersion | null {
		const mAtches = ExtensionIdVersionRegex.exec(nAme);
		return mAtches && mAtches[1] && mAtches[2] ? new ExtensionIdentifierWithVersion({ id: mAtches[1] }, mAtches[2]) : null;
	}
}
