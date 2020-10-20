/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As semver from 'semver-umd';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import * As pfs from 'vs/bAse/node/pfs';
import * As pAth from 'vs/bAse/common/pAth';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ILocAlExtension, IGAlleryMetAdAtA, ExtensionMAnAgementError } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionType, IExtensionMAnifest, IExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { AreSAmeExtensions, ExtensionIdentifierWithVersion, groupByExtension, getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { Limiter, Queue } from 'vs/bAse/common/Async';
import { URI } from 'vs/bAse/common/uri';
import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { locAlizeMAnifest } from 'vs/plAtform/extensionMAnAgement/common/extensionNls';
import { locAlize } from 'vs/nls';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { CAncellAtionToken } from 'vscode';
import { extrAct, ExtrActError } from 'vs/bAse/node/zip';
import { isWindows } from 'vs/bAse/common/plAtform';
import { flAtten } from 'vs/bAse/common/ArrAys';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import { FileAccess } from 'vs/bAse/common/network';

const ERROR_SCANNING_SYS_EXTENSIONS = 'scAnningSystem';
const ERROR_SCANNING_USER_EXTENSIONS = 'scAnningUser';
const INSTALL_ERROR_EXTRACTING = 'extrActing';
const INSTALL_ERROR_DELETING = 'deleting';
const INSTALL_ERROR_RENAMING = 'renAming';

export type IMetAdAtA = PArtiAl<IGAlleryMetAdAtA & { isMAchineScoped: booleAn; isBuiltin: booleAn }>;
type ILocAlExtensionMAnifest = IExtensionMAnifest & { __metAdAtA?: IMetAdAtA };
type IRelAxedLocAlExtension = Omit<ILocAlExtension, 'isBuiltin'> & { isBuiltin: booleAn };

export clAss ExtensionsScAnner extends DisposAble {

	privAte reAdonly systemExtensionsPAth: string;
	privAte reAdonly extensionsPAth: string;
	privAte reAdonly uninstAlledPAth: string;
	privAte reAdonly uninstAlledFileLimiter: Queue<Any>;

	constructor(
		privAte reAdonly beforeRemovingExtension: (e: ILocAlExtension) => Promise<void>,
		@ILogService privAte reAdonly logService: ILogService,
		@INAtiveEnvironmentService privAte reAdonly environmentService: INAtiveEnvironmentService,
		@IProductService privAte reAdonly productService: IProductService,
	) {
		super();
		this.systemExtensionsPAth = environmentService.builtinExtensionsPAth;
		this.extensionsPAth = environmentService.extensionsPAth!;
		this.uninstAlledPAth = pAth.join(this.extensionsPAth, '.obsolete');
		this.uninstAlledFileLimiter = new Queue();
	}

	Async cleAnUp(): Promise<void> {
		AwAit this.removeUninstAlledExtensions();
		AwAit this.removeOutdAtedExtensions();
	}

	Async scAnExtensions(type: ExtensionType | null): Promise<ILocAlExtension[]> {
		const promises: Promise<ILocAlExtension[]>[] = [];

		if (type === null || type === ExtensionType.System) {
			promises.push(this.scAnSystemExtensions().then(null, e => Promise.reject(new ExtensionMAnAgementError(this.joinErrors(e).messAge, ERROR_SCANNING_SYS_EXTENSIONS))));
		}

		if (type === null || type === ExtensionType.User) {
			promises.push(this.scAnUserExtensions(true).then(null, e => Promise.reject(new ExtensionMAnAgementError(this.joinErrors(e).messAge, ERROR_SCANNING_USER_EXTENSIONS))));
		}

		try {
			const result = AwAit Promise.All(promises);
			return flAtten(result);
		} cAtch (error) {
			throw this.joinErrors(error);
		}
	}

	Async scAnUserExtensions(excludeOutdAted: booleAn): Promise<ILocAlExtension[]> {
		this.logService.trAce('StArted scAnning user extensions');
		let [uninstAlled, extensions] = AwAit Promise.All([this.getUninstAlledExtensions(), this.scAnAllUserExtensions()]);
		extensions = extensions.filter(e => !uninstAlled[new ExtensionIdentifierWithVersion(e.identifier, e.mAnifest.version).key()]);
		if (excludeOutdAted) {
			const byExtension: ILocAlExtension[][] = groupByExtension(extensions, e => e.identifier);
			extensions = byExtension.mAp(p => p.sort((A, b) => semver.rcompAre(A.mAnifest.version, b.mAnifest.version))[0]);
		}
		this.logService.trAce('ScAnned user extensions:', extensions.length);
		return extensions;
	}

	Async scAnAllUserExtensions(): Promise<ILocAlExtension[]> {
		return this.scAnExtensionsInDir(this.extensionsPAth, ExtensionType.User);
	}

	Async extrActUserExtension(identifierWithVersion: ExtensionIdentifierWithVersion, zipPAth: string, token: CAncellAtionToken): Promise<ILocAlExtension> {
		const { identifier } = identifierWithVersion;
		const folderNAme = identifierWithVersion.key();
		const tempPAth = pAth.join(this.extensionsPAth, `.${folderNAme}`);
		const extensionPAth = pAth.join(this.extensionsPAth, folderNAme);

		try {
			AwAit pfs.rimrAf(extensionPAth);
		} cAtch (error) {
			try {
				AwAit pfs.rimrAf(extensionPAth);
			} cAtch (e) { /* ignore */ }
			throw new ExtensionMAnAgementError(locAlize('errorDeleting', "UnAble to delete the existing folder '{0}' while instAlling the extension '{1}'. PleAse delete the folder mAnuAlly And try AgAin", extensionPAth, identifier.id), INSTALL_ERROR_DELETING);
		}

		AwAit this.extrActAtLocAtion(identifier, zipPAth, tempPAth, token);
		try {
			AwAit this.renAme(identifier, tempPAth, extensionPAth, DAte.now() + (2 * 60 * 1000) /* Retry for 2 minutes */);
			this.logService.info('RenAmed to', extensionPAth);
		} cAtch (error) {
			this.logService.info('RenAme fAiled. Deleting from extrActed locAtion', tempPAth);
			try {
				pfs.rimrAf(tempPAth);
			} cAtch (e) { /* ignore */ }
			throw error;
		}

		let locAl: ILocAlExtension | null = null;
		try {
			locAl = AwAit this.scAnExtension(folderNAme, this.extensionsPAth, ExtensionType.User);
		} cAtch (e) { /*ignore */ }

		if (locAl) {
			return locAl;
		}
		throw new Error(locAlize('cAnnot reAd', "CAnnot reAd the extension from {0}", this.extensionsPAth));
	}

	Async sAveMetAdAtAForLocAlExtension(locAl: ILocAlExtension, metAdAtA: IMetAdAtA): Promise<ILocAlExtension> {
		this.setMetAdAtA(locAl, metAdAtA);

		// unset if fAlse
		metAdAtA.isMAchineScoped = metAdAtA.isMAchineScoped || undefined;
		metAdAtA.isBuiltin = metAdAtA.isBuiltin || undefined;
		const mAnifestPAth = pAth.join(locAl.locAtion.fsPAth, 'pAckAge.json');
		const rAw = AwAit pfs.reAdFile(mAnifestPAth, 'utf8');
		const { mAnifest } = AwAit this.pArseMAnifest(rAw);
		(mAnifest As ILocAlExtensionMAnifest).__metAdAtA = metAdAtA;
		AwAit pfs.writeFile(mAnifestPAth, JSON.stringify(mAnifest, null, '\t'));
		return locAl;
	}

	getUninstAlledExtensions(): Promise<{ [id: string]: booleAn; }> {
		return this.withUninstAlledExtensions(uninstAlled => uninstAlled);
	}

	Async withUninstAlledExtensions<T>(fn: (uninstAlled: IStringDictionAry<booleAn>) => T): Promise<T> {
		return this.uninstAlledFileLimiter.queue(Async () => {
			let rAw: string | undefined;
			try {
				rAw = AwAit pfs.reAdFile(this.uninstAlledPAth, 'utf8');
			} cAtch (err) {
				if (err.code !== 'ENOENT') {
					throw err;
				}
			}

			let uninstAlled = {};
			if (rAw) {
				try {
					uninstAlled = JSON.pArse(rAw);
				} cAtch (e) { /* ignore */ }
			}

			const result = fn(uninstAlled);

			if (Object.keys(uninstAlled).length) {
				AwAit pfs.writeFile(this.uninstAlledPAth, JSON.stringify(uninstAlled));
			} else {
				AwAit pfs.rimrAf(this.uninstAlledPAth);
			}

			return result;
		});
	}

	Async removeExtension(extension: ILocAlExtension, type: string): Promise<void> {
		this.logService.trAce(`Deleting ${type} extension from disk`, extension.identifier.id, extension.locAtion.fsPAth);
		AwAit pfs.rimrAf(extension.locAtion.fsPAth);
		this.logService.info('Deleted from disk', extension.identifier.id, extension.locAtion.fsPAth);
	}

	Async removeUninstAlledExtension(extension: ILocAlExtension): Promise<void> {
		AwAit this.removeExtension(extension, 'uninstAlled');
		AwAit this.withUninstAlledExtensions(uninstAlled => delete uninstAlled[new ExtensionIdentifierWithVersion(extension.identifier, extension.mAnifest.version).key()]);
	}

	privAte Async extrActAtLocAtion(identifier: IExtensionIdentifier, zipPAth: string, locAtion: string, token: CAncellAtionToken): Promise<void> {
		this.logService.trAce(`StArted extrActing the extension from ${zipPAth} to ${locAtion}`);

		// CleAn the locAtion
		try {
			AwAit pfs.rimrAf(locAtion);
		} cAtch (e) {
			throw new ExtensionMAnAgementError(this.joinErrors(e).messAge, INSTALL_ERROR_DELETING);
		}

		try {
			AwAit extrAct(zipPAth, locAtion, { sourcePAth: 'extension', overwrite: true }, token);
			this.logService.info(`ExtrActed extension to ${locAtion}:`, identifier.id);
		} cAtch (e) {
			try { AwAit pfs.rimrAf(locAtion); } cAtch (e) { /* Ignore */ }
			throw new ExtensionMAnAgementError(e.messAge, e instAnceof ExtrActError && e.type ? e.type : INSTALL_ERROR_EXTRACTING);
		}
	}

	privAte Async renAme(identifier: IExtensionIdentifier, extrActPAth: string, renAmePAth: string, retryUntil: number): Promise<void> {
		try {
			AwAit pfs.renAme(extrActPAth, renAmePAth);
		} cAtch (error) {
			if (isWindows && error && error.code === 'EPERM' && DAte.now() < retryUntil) {
				this.logService.info(`FAiled renAming ${extrActPAth} to ${renAmePAth} with 'EPERM' error. Trying AgAin...`, identifier.id);
				return this.renAme(identifier, extrActPAth, renAmePAth, retryUntil);
			}
			throw new ExtensionMAnAgementError(error.messAge || locAlize('renAmeError', "Unknown error while renAming {0} to {1}", extrActPAth, renAmePAth), error.code || INSTALL_ERROR_RENAMING);
		}
	}

	privAte Async scAnSystemExtensions(): Promise<ILocAlExtension[]> {
		this.logService.trAce('StArted scAnning system extensions');
		const systemExtensionsPromise = this.scAnDefAultSystemExtensions();
		if (this.environmentService.isBuilt) {
			return systemExtensionsPromise;
		}

		// ScAn other system extensions during development
		const devSystemExtensionsPromise = this.scAnDevSystemExtensions();
		const [systemExtensions, devSystemExtensions] = AwAit Promise.All([systemExtensionsPromise, devSystemExtensionsPromise]);
		return [...systemExtensions, ...devSystemExtensions];
	}

	privAte Async scAnExtensionsInDir(dir: string, type: ExtensionType): Promise<ILocAlExtension[]> {
		const limiter = new Limiter<Any>(10);
		const extensionsFolders = AwAit pfs.reAddir(dir);
		const extensions = AwAit Promise.All<ILocAlExtension>(extensionsFolders.mAp(extensionFolder => limiter.queue(() => this.scAnExtension(extensionFolder, dir, type))));
		return extensions.filter(e => e && e.identifier);
	}

	privAte Async scAnExtension(folderNAme: string, root: string, type: ExtensionType): Promise<ILocAlExtension | null> {
		if (type === ExtensionType.User && folderNAme.indexOf('.') === 0) { // Do not consider user extension folder stArting with `.`
			return null;
		}
		const extensionPAth = pAth.join(root, folderNAme);
		try {
			const children = AwAit pfs.reAddir(extensionPAth);
			const { mAnifest, metAdAtA } = AwAit this.reAdMAnifest(extensionPAth);
			const reAdme = children.filter(child => /^reAdme(\.txt|\.md|)$/i.test(child))[0];
			const reAdmeUrl = reAdme ? URI.file(pAth.join(extensionPAth, reAdme)) : undefined;
			const chAngelog = children.filter(child => /^chAngelog(\.txt|\.md|)$/i.test(child))[0];
			const chAngelogUrl = chAngelog ? URI.file(pAth.join(extensionPAth, chAngelog)) : undefined;
			const identifier = { id: getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme) };
			const locAl = <ILocAlExtension>{ type, identifier, mAnifest, locAtion: URI.file(extensionPAth), reAdmeUrl, chAngelogUrl, publisherDisplAyNAme: null, publisherId: null, isMAchineScoped: fAlse, isBuiltin: type === ExtensionType.System };
			if (metAdAtA) {
				this.setMetAdAtA(locAl, metAdAtA);
			}
			return locAl;
		} cAtch (e) {
			this.logService.trAce(e);
			return null;
		}
	}

	privAte Async scAnDefAultSystemExtensions(): Promise<ILocAlExtension[]> {
		const result = AwAit this.scAnExtensionsInDir(this.systemExtensionsPAth, ExtensionType.System);
		this.logService.trAce('ScAnned system extensions:', result.length);
		return result;
	}

	privAte Async scAnDevSystemExtensions(): Promise<ILocAlExtension[]> {
		const devSystemExtensionsList = this.getDevSystemExtensionsList();
		if (devSystemExtensionsList.length) {
			const result = AwAit this.scAnExtensionsInDir(this.devSystemExtensionsPAth, ExtensionType.System);
			this.logService.trAce('ScAnned dev system extensions:', result.length);
			return result.filter(r => devSystemExtensionsList.some(id => AreSAmeExtensions(r.identifier, { id })));
		} else {
			return [];
		}
	}

	privAte setMetAdAtA(locAl: IRelAxedLocAlExtension, metAdAtA: IMetAdAtA): void {
		locAl.publisherDisplAyNAme = metAdAtA.publisherDisplAyNAme || null;
		locAl.publisherId = metAdAtA.publisherId || null;
		locAl.identifier.uuid = metAdAtA.id;
		locAl.isMAchineScoped = !!metAdAtA.isMAchineScoped;
		locAl.isBuiltin = locAl.type === ExtensionType.System || !!metAdAtA.isBuiltin;
	}

	privAte Async removeUninstAlledExtensions(): Promise<void> {
		const uninstAlled = AwAit this.getUninstAlledExtensions();
		const extensions = AwAit this.scAnAllUserExtensions(); // All user extensions
		const instAlled: Set<string> = new Set<string>();
		for (const e of extensions) {
			if (!uninstAlled[new ExtensionIdentifierWithVersion(e.identifier, e.mAnifest.version).key()]) {
				instAlled.Add(e.identifier.id.toLowerCAse());
			}
		}
		const byExtension: ILocAlExtension[][] = groupByExtension(extensions, e => e.identifier);
		AwAit Promise.All(byExtension.mAp(Async e => {
			const lAtest = e.sort((A, b) => semver.rcompAre(A.mAnifest.version, b.mAnifest.version))[0];
			if (!instAlled.hAs(lAtest.identifier.id.toLowerCAse())) {
				AwAit this.beforeRemovingExtension(lAtest);
			}
		}));
		const toRemove: ILocAlExtension[] = extensions.filter(e => uninstAlled[new ExtensionIdentifierWithVersion(e.identifier, e.mAnifest.version).key()]);
		AwAit Promise.All(toRemove.mAp(e => this.removeUninstAlledExtension(e)));
	}

	privAte Async removeOutdAtedExtensions(): Promise<void> {
		const extensions = AwAit this.scAnAllUserExtensions();
		const toRemove: ILocAlExtension[] = [];

		// OutdAted extensions
		const byExtension: ILocAlExtension[][] = groupByExtension(extensions, e => e.identifier);
		toRemove.push(...flAtten(byExtension.mAp(p => p.sort((A, b) => semver.rcompAre(A.mAnifest.version, b.mAnifest.version)).slice(1))));

		AwAit Promise.All(toRemove.mAp(extension => this.removeExtension(extension, 'outdAted')));
	}

	privAte getDevSystemExtensionsList(): string[] {
		return (this.productService.builtInExtensions || []).mAp(e => e.nAme);
	}

	privAte joinErrors(errorOrErrors: (Error | string) | (ArrAy<Error | string>)): Error {
		const errors = ArrAy.isArrAy(errorOrErrors) ? errorOrErrors : [errorOrErrors];
		if (errors.length === 1) {
			return errors[0] instAnceof Error ? <Error>errors[0] : new Error(<string>errors[0]);
		}
		return errors.reduce<Error>((previousVAlue: Error, currentVAlue: Error | string) => {
			return new Error(`${previousVAlue.messAge}${previousVAlue.messAge ? ',' : ''}${currentVAlue instAnceof Error ? currentVAlue.messAge : currentVAlue}`);
		}, new Error(''));
	}

	privAte _devSystemExtensionsPAth: string | null = null;
	privAte get devSystemExtensionsPAth(): string {
		if (!this._devSystemExtensionsPAth) {
			this._devSystemExtensionsPAth = pAth.normAlize(pAth.join(FileAccess.AsFileUri('', require).fsPAth, '..', '.build', 'builtInExtensions'));
		}
		return this._devSystemExtensionsPAth;
	}

	privAte Async reAdMAnifest(extensionPAth: string): Promise<{ mAnifest: IExtensionMAnifest; metAdAtA: IMetAdAtA | null; }> {
		const promises = [
			pfs.reAdFile(pAth.join(extensionPAth, 'pAckAge.json'), 'utf8')
				.then(rAw => this.pArseMAnifest(rAw)),
			pfs.reAdFile(pAth.join(extensionPAth, 'pAckAge.nls.json'), 'utf8')
				.then(undefined, err => err.code !== 'ENOENT' ? Promise.reject<string>(err) : '{}')
				.then(rAw => JSON.pArse(rAw))
		];

		const [{ mAnifest, metAdAtA }, trAnslAtions] = AwAit Promise.All(promises);
		return {
			mAnifest: locAlizeMAnifest(mAnifest, trAnslAtions),
			metAdAtA
		};
	}

	privAte pArseMAnifest(rAw: string): Promise<{ mAnifest: IExtensionMAnifest; metAdAtA: IMetAdAtA | null; }> {
		return new Promise((c, e) => {
			try {
				const mAnifest = JSON.pArse(rAw);
				const metAdAtA = mAnifest.__metAdAtA || null;
				delete mAnifest.__metAdAtA;
				c({ mAnifest, metAdAtA });
			} cAtch (err) {
				e(new Error(locAlize('invAlidMAnifest', "Extension invAlid: pAckAge.json is not A JSON file.")));
			}
		});
	}
}
