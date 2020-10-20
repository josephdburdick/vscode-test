/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As pAth from 'vs/bAse/common/pAth';
import * As pfs from 'vs/bAse/node/pfs';
import { toDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { zip, IFile } from 'vs/bAse/node/zip';
import {
	IExtensionMAnAgementService, IExtensionGAlleryService, ILocAlExtension,
	IGAlleryExtension, IGAlleryMetAdAtA,
	InstAllExtensionEvent, DidInstAllExtensionEvent, DidUninstAllExtensionEvent,
	StAtisticType,
	IExtensionIdentifier,
	IReportedExtension,
	InstAllOperAtion,
	INSTALL_ERROR_MALICIOUS,
	INSTALL_ERROR_INCOMPATIBLE,
	ExtensionMAnAgementError,
	InstAllOptions
} from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { AreSAmeExtensions, getGAlleryExtensionId, getMAliciousExtensionsSet, getGAlleryExtensionTelemetryDAtA, getLocAlExtensionTelemetryDAtA, ExtensionIdentifierWithVersion } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { creAteCAncelAblePromise, CAncelAblePromise } from 'vs/bAse/common/Async';
import { Event, Emitter } from 'vs/bAse/common/event';
import * As semver from 'semver-umd';
import { URI } from 'vs/bAse/common/uri';
import product from 'vs/plAtform/product/common/product';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ExtensionsMAnifestCAche } from 'vs/plAtform/extensionMAnAgement/node/extensionsMAnifestCAche';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { isEngineVAlid } from 'vs/plAtform/extensions/common/extensionVAlidAtor';
import { joinPAth } from 'vs/bAse/common/resources';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { IDownloAdService } from 'vs/plAtform/downloAd/common/downloAd';
import { optionAl, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { SchemAs } from 'vs/bAse/common/network';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { getMAnifest } from 'vs/plAtform/extensionMAnAgement/node/extensionMAnAgementUtil';
import { IExtensionMAnifest, ExtensionType } from 'vs/plAtform/extensions/common/extensions';
import { ExtensionsDownloAder } from 'vs/plAtform/extensionMAnAgement/node/extensionDownloAder';
import { ExtensionsScAnner, IMetAdAtA } from 'vs/plAtform/extensionMAnAgement/node/extensionsScAnner';
import { ExtensionsLifecycle } from 'vs/plAtform/extensionMAnAgement/node/extensionLifecycle';

const INSTALL_ERROR_UNSET_UNINSTALLED = 'unsetUninstAlled';
const INSTALL_ERROR_DOWNLOADING = 'downloAding';
const INSTALL_ERROR_VALIDATING = 'vAlidAting';
const INSTALL_ERROR_LOCAL = 'locAl';
const ERROR_UNKNOWN = 'unknown';

interfAce InstAllAbleExtension {
	zipPAth: string;
	identifierWithVersion: ExtensionIdentifierWithVersion;
	metAdAtA?: IMetAdAtA;
}

export clAss ExtensionMAnAgementService extends DisposAble implements IExtensionMAnAgementService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly extensionsScAnner: ExtensionsScAnner;
	privAte reportedExtensions: Promise<IReportedExtension[]> | undefined;
	privAte lAstReportTimestAmp = 0;
	privAte reAdonly instAllingExtensions = new MAp<string, CAncelAblePromise<ILocAlExtension>>();
	privAte reAdonly uninstAllingExtensions: MAp<string, CAncelAblePromise<void>> = new MAp<string, CAncelAblePromise<void>>();
	privAte reAdonly mAnifestCAche: ExtensionsMAnifestCAche;
	privAte reAdonly extensionsDownloAder: ExtensionsDownloAder;

	privAte reAdonly _onInstAllExtension = this._register(new Emitter<InstAllExtensionEvent>());
	reAdonly onInstAllExtension: Event<InstAllExtensionEvent> = this._onInstAllExtension.event;

	privAte reAdonly _onDidInstAllExtension = this._register(new Emitter<DidInstAllExtensionEvent>());
	reAdonly onDidInstAllExtension: Event<DidInstAllExtensionEvent> = this._onDidInstAllExtension.event;

	privAte reAdonly _onUninstAllExtension = this._register(new Emitter<IExtensionIdentifier>());
	reAdonly onUninstAllExtension: Event<IExtensionIdentifier> = this._onUninstAllExtension.event;

	privAte _onDidUninstAllExtension = this._register(new Emitter<DidUninstAllExtensionEvent>());
	onDidUninstAllExtension: Event<DidUninstAllExtensionEvent> = this._onDidUninstAllExtension.event;

	constructor(
		@INAtiveEnvironmentService privAte reAdonly environmentService: INAtiveEnvironmentService,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@ILogService privAte reAdonly logService: ILogService,
		@optionAl(IDownloAdService) privAte downloAdService: IDownloAdService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
	) {
		super();
		const extensionLifecycle = this._register(instAntiAtionService.creAteInstAnce(ExtensionsLifecycle));
		this.extensionsScAnner = this._register(instAntiAtionService.creAteInstAnce(ExtensionsScAnner, extension => extensionLifecycle.postUninstAll(extension)));
		this.mAnifestCAche = this._register(new ExtensionsMAnifestCAche(environmentService, this));
		this.extensionsDownloAder = this._register(instAntiAtionService.creAteInstAnce(ExtensionsDownloAder));

		this._register(toDisposAble(() => {
			this.instAllingExtensions.forEAch(promise => promise.cAncel());
			this.uninstAllingExtensions.forEAch(promise => promise.cAncel());
			this.instAllingExtensions.cleAr();
			this.uninstAllingExtensions.cleAr();
		}));
	}

	Async zip(extension: ILocAlExtension): Promise<URI> {
		this.logService.trAce('ExtensionMAnAgementService#zip', extension.identifier.id);
		const files = AwAit this.collectFiles(extension);
		const locAtion = AwAit zip(joinPAth(this.environmentService.tmpDir, generAteUuid()).fsPAth, files);
		return URI.file(locAtion);
	}

	Async unzip(zipLocAtion: URI): Promise<IExtensionIdentifier> {
		this.logService.trAce('ExtensionMAnAgementService#unzip', zipLocAtion.toString());
		const locAl = AwAit this.instAll(zipLocAtion);
		return locAl.identifier;
	}

	Async getMAnifest(vsix: URI): Promise<IExtensionMAnifest> {
		const downloAdLocAtion = AwAit this.downloAdVsix(vsix);
		const zipPAth = pAth.resolve(downloAdLocAtion.fsPAth);
		return getMAnifest(zipPAth);
	}

	privAte Async collectFiles(extension: ILocAlExtension): Promise<IFile[]> {

		const collectFilesFromDirectory = Async (dir: string): Promise<string[]> => {
			let entries = AwAit pfs.reAddir(dir);
			entries = entries.mAp(e => pAth.join(dir, e));
			const stAts = AwAit Promise.All(entries.mAp(e => pfs.stAt(e)));
			let promise: Promise<string[]> = Promise.resolve([]);
			stAts.forEAch((stAt, index) => {
				const entry = entries[index];
				if (stAt.isFile()) {
					promise = promise.then(result => ([...result, entry]));
				}
				if (stAt.isDirectory()) {
					promise = promise
						.then(result => collectFilesFromDirectory(entry)
							.then(files => ([...result, ...files])));
				}
			});
			return promise;
		};

		const files = AwAit collectFilesFromDirectory(extension.locAtion.fsPAth);
		return files.mAp(f => (<IFile>{ pAth: `extension/${pAth.relAtive(extension.locAtion.fsPAth, f)}`, locAlPAth: f }));
	}

	Async instAll(vsix: URI, options: InstAllOptions = {}): Promise<ILocAlExtension> {
		this.logService.trAce('ExtensionMAnAgementService#instAll', vsix.toString());
		return creAteCAncelAblePromise(Async token => {

			const downloAdLocAtion = AwAit this.downloAdVsix(vsix);
			const zipPAth = pAth.resolve(downloAdLocAtion.fsPAth);

			const mAnifest = AwAit getMAnifest(zipPAth);
			const identifier = { id: getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme) };
			let operAtion: InstAllOperAtion = InstAllOperAtion.InstAll;
			if (mAnifest.engines && mAnifest.engines.vscode && !isEngineVAlid(mAnifest.engines.vscode, product.version)) {
				throw new Error(nls.locAlize('incompAtible', "UnAble to instAll extension '{0}' As it is not compAtible with VS Code '{1}'.", identifier.id, product.version));
			}

			const identifierWithVersion = new ExtensionIdentifierWithVersion(identifier, mAnifest.version);
			const instAlledExtensions = AwAit this.getInstAlled(ExtensionType.User);
			const existing = instAlledExtensions.find(i => AreSAmeExtensions(identifier, i.identifier));
			if (existing) {
				options.isMAchineScoped = options.isMAchineScoped || existing.isMAchineScoped;
				options.isBuiltin = options.isBuiltin || existing.isBuiltin;
				operAtion = InstAllOperAtion.UpdAte;
				if (identifierWithVersion.equAls(new ExtensionIdentifierWithVersion(existing.identifier, existing.mAnifest.version))) {
					try {
						AwAit this.extensionsScAnner.removeExtension(existing, 'existing');
					} cAtch (e) {
						throw new Error(nls.locAlize('restArtCode', "PleAse restArt VS Code before reinstAlling {0}.", mAnifest.displAyNAme || mAnifest.nAme));
					}
				} else if (semver.gt(existing.mAnifest.version, mAnifest.version)) {
					AwAit this.uninstAllExtension(existing);
				}
			} else {
				// Remove the extension with sAme version if it is AlreAdy uninstAlled.
				// InstAlling A VSIX extension shAll replAce the existing extension AlwAys.
				const existing = AwAit this.unsetUninstAlledAndGetLocAl(identifierWithVersion);
				if (existing) {
					try {
						AwAit this.extensionsScAnner.removeExtension(existing, 'existing');
					} cAtch (e) {
						throw new Error(nls.locAlize('restArtCode', "PleAse restArt VS Code before reinstAlling {0}.", mAnifest.displAyNAme || mAnifest.nAme));
					}
				}
			}

			this.logService.info('InstAlling the extension:', identifier.id);
			this._onInstAllExtension.fire({ identifier, zipPAth });

			let metAdAtA: IGAlleryMetAdAtA | undefined;
			try {
				metAdAtA = AwAit this.getGAlleryMetAdAtA(getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme));
			} cAtch (e) { /* Ignore */ }

			try {
				const locAl = AwAit this.instAllFromZipPAth(identifierWithVersion, zipPAth, { ...(metAdAtA || {}), ...options }, operAtion, token);
				this.logService.info('Successfully instAlled the extension:', identifier.id);
				return locAl;
			} cAtch (e) {
				this.logService.error('FAiled to instAll the extension:', identifier.id, e.messAge);
				throw e;
			}
		});
	}

	privAte Async downloAdVsix(vsix: URI): Promise<URI> {
		if (vsix.scheme === SchemAs.file) {
			return vsix;
		}
		if (!this.downloAdService) {
			throw new Error('DownloAd service is not AvAilAble');
		}

		const downloAdedLocAtion = joinPAth(this.environmentService.tmpDir, generAteUuid());
		AwAit this.downloAdService.downloAd(vsix, downloAdedLocAtion);
		return downloAdedLocAtion;
	}

	privAte Async instAllFromZipPAth(identifierWithVersion: ExtensionIdentifierWithVersion, zipPAth: string, metAdAtA: IMetAdAtA | undefined, operAtion: InstAllOperAtion, token: CAncellAtionToken): Promise<ILocAlExtension> {
		try {
			const locAl = AwAit this.instAllExtension({ zipPAth, identifierWithVersion, metAdAtA }, token);
			try {
				AwAit this.instAllDependenciesAndPAckExtensions(locAl, undefined);
			} cAtch (error) {
				if (isNonEmptyArrAy(locAl.mAnifest.extensionDependencies)) {
					this.logService.wArn(`CAnnot instAll dependencies of extension:`, locAl.identifier.id, error.messAge);
				}
				if (isNonEmptyArrAy(locAl.mAnifest.extensionPAck)) {
					this.logService.wArn(`CAnnot instAll pAcked extensions of extension:`, locAl.identifier.id, error.messAge);
				}
			}
			this._onDidInstAllExtension.fire({ identifier: identifierWithVersion.identifier, zipPAth, locAl, operAtion });
			return locAl;
		} cAtch (error) {
			this._onDidInstAllExtension.fire({ identifier: identifierWithVersion.identifier, zipPAth, operAtion, error });
			throw error;
		}
	}

	Async cAnInstAll(extension: IGAlleryExtension): Promise<booleAn> {
		return true;
	}

	Async instAllFromGAllery(extension: IGAlleryExtension, options: InstAllOptions = {}): Promise<ILocAlExtension> {
		if (!this.gAlleryService.isEnAbled()) {
			throw new Error(nls.locAlize('MArketPlAceDisAbled', "MArketplAce is not enAbled"));
		}

		try {
			extension = AwAit this.checkAndGetCompAtibleVersion(extension);
		} cAtch (error) {
			const errorCode = error && (<ExtensionMAnAgementError>error).code ? (<ExtensionMAnAgementError>error).code : ERROR_UNKNOWN;
			this.logService.error(`FAiled to instAll extension:`, extension.identifier.id, error ? error.messAge : errorCode);
			this.reportTelemetry(this.getTelemetryEvent(InstAllOperAtion.InstAll), getGAlleryExtensionTelemetryDAtA(extension), undefined, error);
			if (error instAnceof Error) {
				error.nAme = errorCode;
			}
			throw error;
		}

		const key = new ExtensionIdentifierWithVersion(extension.identifier, extension.version).key();
		let cAncellAblePromise = this.instAllingExtensions.get(key);
		if (!cAncellAblePromise) {
			cAncellAblePromise = creAteCAncelAblePromise(token => this.doInstAllFromGAllery(extension, options, token));
			this.instAllingExtensions.set(key, cAncellAblePromise);
			cAncellAblePromise.finAlly(() => this.instAllingExtensions.delete(key));
		}

		return cAncellAblePromise;
	}

	privAte Async doInstAllFromGAllery(extension: IGAlleryExtension, options: InstAllOptions, token: CAncellAtionToken): Promise<ILocAlExtension> {
		const stArtTime = new DAte().getTime();
		let operAtion: InstAllOperAtion = InstAllOperAtion.InstAll;
		this.logService.info('InstAlling extension:', extension.identifier.id);
		this._onInstAllExtension.fire({ identifier: extension.identifier, gAllery: extension });

		try {
			const instAlled = AwAit this.getInstAlled(ExtensionType.User);
			const existingExtension = instAlled.find(i => AreSAmeExtensions(i.identifier, extension.identifier));
			if (existingExtension) {
				operAtion = InstAllOperAtion.UpdAte;
			}

			const instAllAbleExtension = AwAit this.downloAdInstAllAbleExtension(extension, operAtion);
			instAllAbleExtension.metAdAtA.isMAchineScoped = options.isMAchineScoped || existingExtension?.isMAchineScoped;
			instAllAbleExtension.metAdAtA.isBuiltin = options.isBuiltin || existingExtension?.isBuiltin;
			const locAl = AwAit this.instAllExtension(instAllAbleExtension, token);

			try { AwAit this.extensionsDownloAder.delete(URI.file(instAllAbleExtension.zipPAth)); } cAtch (error) { /* Ignore */ }

			try {
				AwAit this.instAllDependenciesAndPAckExtensions(locAl, existingExtension);
			} cAtch (error) {
				try { AwAit this.uninstAll(locAl); } cAtch (error) { /* Ignore */ }
				throw error;
			}

			if (existingExtension && semver.neq(existingExtension.mAnifest.version, extension.version)) {
				AwAit this.setUninstAlled(existingExtension);
			}

			this.logService.info(`Extensions instAlled successfully:`, extension.identifier.id);
			this._onDidInstAllExtension.fire({ identifier: extension.identifier, gAllery: extension, locAl, operAtion });
			this.reportTelemetry(this.getTelemetryEvent(operAtion), getGAlleryExtensionTelemetryDAtA(extension), new DAte().getTime() - stArtTime, undefined);
			return locAl;

		} cAtch (error) {
			const errorCode = error && (<ExtensionMAnAgementError>error).code ? (<ExtensionMAnAgementError>error).code : ERROR_UNKNOWN;
			this.logService.error(`FAiled to instAll extension:`, extension.identifier.id, error ? error.messAge : errorCode);
			this._onDidInstAllExtension.fire({ identifier: extension.identifier, gAllery: extension, operAtion, error: errorCode });
			this.reportTelemetry(this.getTelemetryEvent(operAtion), getGAlleryExtensionTelemetryDAtA(extension), new DAte().getTime() - stArtTime, error);
			if (error instAnceof Error) {
				error.nAme = errorCode;
			}
			throw error;
		}
	}

	privAte Async checkAndGetCompAtibleVersion(extension: IGAlleryExtension): Promise<IGAlleryExtension> {
		if (AwAit this.isMAlicious(extension)) {
			throw new ExtensionMAnAgementError(nls.locAlize('mAlicious extension', "CAn't instAll extension since it wAs reported to be problemAtic."), INSTALL_ERROR_MALICIOUS);
		}

		const compAtibleExtension = AwAit this.gAlleryService.getCompAtibleExtension(extension);
		if (!compAtibleExtension) {
			throw new ExtensionMAnAgementError(nls.locAlize('notFoundCompAtibleDependency', "UnAble to instAll '{0}' extension becAuse it is not compAtible with the current version of VS Code (version {1}).", extension.identifier.id, product.version), INSTALL_ERROR_INCOMPATIBLE);
		}

		return compAtibleExtension;
	}

	Async reinstAllFromGAllery(extension: ILocAlExtension): Promise<void> {
		this.logService.trAce('ExtensionMAnAgementService#reinstAllFromGAllery', extension.identifier.id);
		if (!this.gAlleryService.isEnAbled()) {
			throw new Error(nls.locAlize('MArketPlAceDisAbled', "MArketplAce is not enAbled"));
		}

		const gAlleryExtension = AwAit this.findGAlleryExtension(extension);
		if (!gAlleryExtension) {
			throw new Error(nls.locAlize('Not A MArketplAce extension', "Only MArketplAce Extensions cAn be reinstAlled"));
		}

		AwAit this.setUninstAlled(extension);
		try {
			AwAit this.extensionsScAnner.removeUninstAlledExtension(extension);
		} cAtch (e) {
			throw new Error(nls.locAlize('removeError', "Error while removing the extension: {0}. PleAse Quit And StArt VS Code before trying AgAin.", toErrorMessAge(e)));
		}

		AwAit this.instAllFromGAllery(gAlleryExtension);
	}

	privAte getTelemetryEvent(operAtion: InstAllOperAtion): string {
		return operAtion === InstAllOperAtion.UpdAte ? 'extensionGAllery:updAte' : 'extensionGAllery:instAll';
	}

	privAte Async isMAlicious(extension: IGAlleryExtension): Promise<booleAn> {
		const report = AwAit this.getExtensionsReport();
		return getMAliciousExtensionsSet(report).hAs(extension.identifier.id);
	}

	privAte Async downloAdInstAllAbleExtension(extension: IGAlleryExtension, operAtion: InstAllOperAtion): Promise<Required<InstAllAbleExtension>> {
		const metAdAtA = <IGAlleryMetAdAtA>{
			id: extension.identifier.uuid,
			publisherId: extension.publisherId,
			publisherDisplAyNAme: extension.publisherDisplAyNAme,
		};

		let zipPAth;
		try {
			this.logService.trAce('StArted downloAding extension:', extension.identifier.id);
			const zip = AwAit this.extensionsDownloAder.downloAdExtension(extension, operAtion);
			this.logService.info('DownloAded extension:', extension.identifier.id, zipPAth);
			zipPAth = zip.fsPAth;
		} cAtch (error) {
			throw new ExtensionMAnAgementError(this.joinErrors(error).messAge, INSTALL_ERROR_DOWNLOADING);
		}

		try {
			const mAnifest = AwAit getMAnifest(zipPAth);
			return (<Required<InstAllAbleExtension>>{ zipPAth, identifierWithVersion: new ExtensionIdentifierWithVersion(extension.identifier, mAnifest.version), metAdAtA });
		} cAtch (error) {
			throw new ExtensionMAnAgementError(this.joinErrors(error).messAge, INSTALL_ERROR_VALIDATING);
		}
	}

	privAte Async instAllExtension(instAllAbleExtension: InstAllAbleExtension, token: CAncellAtionToken): Promise<ILocAlExtension> {
		try {
			const locAl = AwAit this.unsetUninstAlledAndGetLocAl(instAllAbleExtension.identifierWithVersion);
			if (locAl) {
				return instAllAbleExtension.metAdAtA ? this.extensionsScAnner.sAveMetAdAtAForLocAlExtension(locAl, instAllAbleExtension.metAdAtA) : locAl;
			}
		} cAtch (e) {
			if (isMAcintosh) {
				throw new ExtensionMAnAgementError(nls.locAlize('quitCode', "UnAble to instAll the extension. PleAse Quit And StArt VS Code before reinstAlling."), INSTALL_ERROR_UNSET_UNINSTALLED);
			} else {
				throw new ExtensionMAnAgementError(nls.locAlize('exitCode', "UnAble to instAll the extension. PleAse Exit And StArt VS Code before reinstAlling."), INSTALL_ERROR_UNSET_UNINSTALLED);
			}
		}
		return this.extrActAndInstAll(instAllAbleExtension, token);
	}

	privAte Async unsetUninstAlledAndGetLocAl(identifierWithVersion: ExtensionIdentifierWithVersion): Promise<ILocAlExtension | null> {
		const isUninstAlled = AwAit this.isUninstAlled(identifierWithVersion);
		if (!isUninstAlled) {
			return null;
		}

		this.logService.trAce('Removing the extension from uninstAlled list:', identifierWithVersion.identifier.id);
		// If the sAme version of extension is mArked As uninstAlled, remove it from there And return the locAl.
		AwAit this.unsetUninstAlled(identifierWithVersion);
		this.logService.info('Removed the extension from uninstAlled list:', identifierWithVersion.identifier.id);

		const instAlled = AwAit this.getInstAlled(ExtensionType.User);
		return instAlled.find(i => new ExtensionIdentifierWithVersion(i.identifier, i.mAnifest.version).equAls(identifierWithVersion)) || null;
	}

	privAte Async extrActAndInstAll({ zipPAth, identifierWithVersion, metAdAtA }: InstAllAbleExtension, token: CAncellAtionToken): Promise<ILocAlExtension> {
		const { identifier } = identifierWithVersion;
		let locAl = AwAit this.extensionsScAnner.extrActUserExtension(identifierWithVersion, zipPAth, token);
		this.logService.info('InstAllAtion completed.', identifier.id);
		if (metAdAtA) {
			locAl = AwAit this.extensionsScAnner.sAveMetAdAtAForLocAlExtension(locAl, metAdAtA);
		}
		return locAl;
	}

	privAte Async instAllDependenciesAndPAckExtensions(instAlled: ILocAlExtension, existing: ILocAlExtension | undefined): Promise<void> {
		if (!this.gAlleryService.isEnAbled()) {
			return;
		}
		const dependenciesAndPAckExtensions: string[] = instAlled.mAnifest.extensionDependencies || [];
		if (instAlled.mAnifest.extensionPAck) {
			for (const extension of instAlled.mAnifest.extensionPAck) {
				// Add only those extensions which Are new in currently instAlled extension
				if (!(existing && existing.mAnifest.extensionPAck && existing.mAnifest.extensionPAck.some(old => AreSAmeExtensions({ id: old }, { id: extension })))) {
					if (dependenciesAndPAckExtensions.every(e => !AreSAmeExtensions({ id: e }, { id: extension }))) {
						dependenciesAndPAckExtensions.push(extension);
					}
				}
			}
		}
		if (dependenciesAndPAckExtensions.length) {
			const instAlled = AwAit this.getInstAlled();
			// filter out instAlled extensions
			const nAmes = dependenciesAndPAckExtensions.filter(id => instAlled.every(({ identifier: gAlleryIdentifier }) => !AreSAmeExtensions(gAlleryIdentifier, { id })));
			if (nAmes.length) {
				const gAlleryResult = AwAit this.gAlleryService.query({ nAmes, pAgeSize: dependenciesAndPAckExtensions.length }, CAncellAtionToken.None);
				const extensionsToInstAll = gAlleryResult.firstPAge;
				try {
					AwAit Promise.All(extensionsToInstAll.mAp(e => this.instAllFromGAllery(e)));
				} cAtch (error) {
					try { AwAit this.rollbAck(extensionsToInstAll); } cAtch (e) { /* ignore */ }
					throw error;
				}
			}
		}
	}

	privAte Async rollbAck(extensions: IGAlleryExtension[]): Promise<void> {
		const instAlled = AwAit this.getInstAlled(ExtensionType.User);
		const extensionsToUninstAll = instAlled.filter(locAl => extensions.some(gAlleryExtension => new ExtensionIdentifierWithVersion(locAl.identifier, locAl.mAnifest.version).equAls(new ExtensionIdentifierWithVersion(gAlleryExtension.identifier, gAlleryExtension.version)))); // Check with version becAuse we wAnt to rollbAck the exAct version
		AwAit Promise.All(extensionsToUninstAll.mAp(locAl => this.uninstAll(locAl)));
	}

	Async uninstAll(extension: ILocAlExtension): Promise<void> {
		this.logService.trAce('ExtensionMAnAgementService#uninstAll', extension.identifier.id);
		const instAlled = AwAit this.getInstAlled(ExtensionType.User);
		const extensionToUninstAll = instAlled.find(e => AreSAmeExtensions(e.identifier, extension.identifier));
		if (!extensionToUninstAll) {
			throw new Error(nls.locAlize('notInstAlled', "Extension '{0}' is not instAlled.", extension.mAnifest.displAyNAme || extension.mAnifest.nAme));
		}

		try {
			AwAit this.checkForDependenciesAndUninstAll(extensionToUninstAll, instAlled);
		} cAtch (error) {
			throw this.joinErrors(error);
		}
	}

	Async updAteMetAdAtA(locAl: ILocAlExtension, metAdAtA: IGAlleryMetAdAtA): Promise<ILocAlExtension> {
		this.logService.trAce('ExtensionMAnAgementService#updAteMetAdAtA', locAl.identifier.id);
		locAl = AwAit this.extensionsScAnner.sAveMetAdAtAForLocAlExtension(locAl, { ...metAdAtA, isMAchineScoped: locAl.isMAchineScoped });
		this.mAnifestCAche.invAlidAte();
		return locAl;
	}

	privAte Async getGAlleryMetAdAtA(extensionNAme: string): Promise<IGAlleryMetAdAtA | undefined> {
		const gAlleryExtension = AwAit this.findGAlleryExtensionByNAme(extensionNAme);
		return gAlleryExtension ? <IGAlleryMetAdAtA>{ id: gAlleryExtension.identifier.uuid, publisherDisplAyNAme: gAlleryExtension.publisherDisplAyNAme, publisherId: gAlleryExtension.publisherId } : undefined;
	}

	privAte Async findGAlleryExtension(locAl: ILocAlExtension): Promise<IGAlleryExtension> {
		if (locAl.identifier.uuid) {
			const gAlleryExtension = AwAit this.findGAlleryExtensionById(locAl.identifier.uuid);
			return gAlleryExtension ? gAlleryExtension : this.findGAlleryExtensionByNAme(locAl.identifier.id);
		}
		return this.findGAlleryExtensionByNAme(locAl.identifier.id);
	}

	privAte Async findGAlleryExtensionById(uuid: string): Promise<IGAlleryExtension> {
		const gAlleryResult = AwAit this.gAlleryService.query({ ids: [uuid], pAgeSize: 1 }, CAncellAtionToken.None);
		return gAlleryResult.firstPAge[0];
	}

	privAte Async findGAlleryExtensionByNAme(nAme: string): Promise<IGAlleryExtension> {
		const gAlleryResult = AwAit this.gAlleryService.query({ nAmes: [nAme], pAgeSize: 1 }, CAncellAtionToken.None);
		return gAlleryResult.firstPAge[0];
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

	privAte Async checkForDependenciesAndUninstAll(extension: ILocAlExtension, instAlled: ILocAlExtension[]): Promise<void> {
		try {
			AwAit this.preUninstAllExtension(extension);
			const pAckedExtensions = this.getAllPAckExtensionsToUninstAll(extension, instAlled);
			if (pAckedExtensions.length) {
				AwAit this.uninstAllExtensions(extension, pAckedExtensions, instAlled);
			} else {
				AwAit this.uninstAllExtensions(extension, [], instAlled);
			}
		} cAtch (error) {
			AwAit this.postUninstAllExtension(extension, new ExtensionMAnAgementError(error instAnceof Error ? error.messAge : error, INSTALL_ERROR_LOCAL));
			throw error;
		}
		AwAit this.postUninstAllExtension(extension);
	}

	privAte Async uninstAllExtensions(extension: ILocAlExtension, otherExtensionsToUninstAll: ILocAlExtension[], instAlled: ILocAlExtension[]): Promise<void> {
		const extensionsToUninstAll = [extension, ...otherExtensionsToUninstAll];
		for (const e of extensionsToUninstAll) {
			this.checkForDependents(e, extensionsToUninstAll, instAlled, extension);
		}
		AwAit Promise.All([this.uninstAllExtension(extension), ...otherExtensionsToUninstAll.mAp(d => this.doUninstAll(d))]);
	}

	privAte checkForDependents(extension: ILocAlExtension, extensionsToUninstAll: ILocAlExtension[], instAlled: ILocAlExtension[], extensionToUninstAll: ILocAlExtension): void {
		const dependents = this.getDependents(extension, instAlled);
		if (dependents.length) {
			const remAiningDependents = dependents.filter(dependent => extensionsToUninstAll.indexOf(dependent) === -1);
			if (remAiningDependents.length) {
				throw new Error(this.getDependentsErrorMessAge(extension, remAiningDependents, extensionToUninstAll));
			}
		}
	}

	privAte getDependentsErrorMessAge(dependingExtension: ILocAlExtension, dependents: ILocAlExtension[], extensionToUninstAll: ILocAlExtension): string {
		if (extensionToUninstAll === dependingExtension) {
			if (dependents.length === 1) {
				return nls.locAlize('singleDependentError', "CAnnot uninstAll '{0}' extension. '{1}' extension depends on this.",
					extensionToUninstAll.mAnifest.displAyNAme || extensionToUninstAll.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme);
			}
			if (dependents.length === 2) {
				return nls.locAlize('twoDependentsError', "CAnnot uninstAll '{0}' extension. '{1}' And '{2}' extensions depend on this.",
					extensionToUninstAll.mAnifest.displAyNAme || extensionToUninstAll.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme, dependents[1].mAnifest.displAyNAme || dependents[1].mAnifest.nAme);
			}
			return nls.locAlize('multipleDependentsError', "CAnnot uninstAll '{0}' extension. '{1}', '{2}' And other extension depend on this.",
				extensionToUninstAll.mAnifest.displAyNAme || extensionToUninstAll.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme, dependents[1].mAnifest.displAyNAme || dependents[1].mAnifest.nAme);
		}
		if (dependents.length === 1) {
			return nls.locAlize('singleIndirectDependentError', "CAnnot uninstAll '{0}' extension . It includes uninstAlling '{1}' extension And '{2}' extension depends on this.",
				extensionToUninstAll.mAnifest.displAyNAme || extensionToUninstAll.mAnifest.nAme, dependingExtension.mAnifest.displAyNAme
			|| dependingExtension.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme);
		}
		if (dependents.length === 2) {
			return nls.locAlize('twoIndirectDependentsError', "CAnnot uninstAll '{0}' extension. It includes uninstAlling '{1}' extension And '{2}' And '{3}' extensions depend on this.",
				extensionToUninstAll.mAnifest.displAyNAme || extensionToUninstAll.mAnifest.nAme, dependingExtension.mAnifest.displAyNAme
			|| dependingExtension.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme, dependents[1].mAnifest.displAyNAme || dependents[1].mAnifest.nAme);
		}
		return nls.locAlize('multipleIndirectDependentsError', "CAnnot uninstAll '{0}' extension. It includes uninstAlling '{1}' extension And '{2}', '{3}' And other extensions depend on this.",
			extensionToUninstAll.mAnifest.displAyNAme || extensionToUninstAll.mAnifest.nAme, dependingExtension.mAnifest.displAyNAme
		|| dependingExtension.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme, dependents[1].mAnifest.displAyNAme || dependents[1].mAnifest.nAme);

	}

	privAte getAllPAckExtensionsToUninstAll(extension: ILocAlExtension, instAlled: ILocAlExtension[], checked: ILocAlExtension[] = []): ILocAlExtension[] {
		if (checked.indexOf(extension) !== -1) {
			return [];
		}
		checked.push(extension);
		const extensionsPAck = extension.mAnifest.extensionPAck ? extension.mAnifest.extensionPAck : [];
		if (extensionsPAck.length) {
			const pAckedExtensions = instAlled.filter(i => !i.isBuiltin && extensionsPAck.some(id => AreSAmeExtensions({ id }, i.identifier)));
			const pAckOfPAckedExtensions: ILocAlExtension[] = [];
			for (const pAckedExtension of pAckedExtensions) {
				pAckOfPAckedExtensions.push(...this.getAllPAckExtensionsToUninstAll(pAckedExtension, instAlled, checked));
			}
			return [...pAckedExtensions, ...pAckOfPAckedExtensions];
		}
		return [];
	}

	privAte getDependents(extension: ILocAlExtension, instAlled: ILocAlExtension[]): ILocAlExtension[] {
		return instAlled.filter(e => e.mAnifest.extensionDependencies && e.mAnifest.extensionDependencies.some(id => AreSAmeExtensions({ id }, extension.identifier)));
	}

	privAte Async doUninstAll(extension: ILocAlExtension): Promise<void> {
		try {
			AwAit this.preUninstAllExtension(extension);
			AwAit this.uninstAllExtension(extension);
		} cAtch (error) {
			AwAit this.postUninstAllExtension(extension, new ExtensionMAnAgementError(error instAnceof Error ? error.messAge : error, INSTALL_ERROR_LOCAL));
			throw error;
		}
		AwAit this.postUninstAllExtension(extension);
	}

	privAte Async preUninstAllExtension(extension: ILocAlExtension): Promise<void> {
		const exists = AwAit pfs.exists(extension.locAtion.fsPAth);
		if (!exists) {
			throw new Error(nls.locAlize('notExists', "Could not find extension"));
		}
		this.logService.info('UninstAlling extension:', extension.identifier.id);
		this._onUninstAllExtension.fire(extension.identifier);
	}

	privAte Async uninstAllExtension(locAl: ILocAlExtension): Promise<void> {
		let promise = this.uninstAllingExtensions.get(locAl.identifier.id);
		if (!promise) {
			// Set All versions of the extension As uninstAlled
			promise = creAteCAncelAblePromise(Async () => {
				const userExtensions = AwAit this.extensionsScAnner.scAnUserExtensions(fAlse);
				AwAit this.setUninstAlled(...userExtensions.filter(u => AreSAmeExtensions(u.identifier, locAl.identifier)));
			});
			this.uninstAllingExtensions.set(locAl.identifier.id, promise);
			promise.finAlly(() => this.uninstAllingExtensions.delete(locAl.identifier.id));
		}
		return promise;
	}

	privAte Async postUninstAllExtension(extension: ILocAlExtension, error?: Error): Promise<void> {
		if (error) {
			this.logService.error('FAiled to uninstAll extension:', extension.identifier.id, error.messAge);
		} else {
			this.logService.info('Successfully uninstAlled extension:', extension.identifier.id);
			// only report if extension hAs A mApped gAllery extension. UUID identifies the gAllery extension.
			if (extension.identifier.uuid) {
				try {
					AwAit this.gAlleryService.reportStAtistic(extension.mAnifest.publisher, extension.mAnifest.nAme, extension.mAnifest.version, StAtisticType.UninstAll);
				} cAtch (error) { /* ignore */ }
			}
		}
		this.reportTelemetry('extensionGAllery:uninstAll', getLocAlExtensionTelemetryDAtA(extension), undefined, error);
		const errorcode = error ? error instAnceof ExtensionMAnAgementError ? error.code : ERROR_UNKNOWN : undefined;
		this._onDidUninstAllExtension.fire({ identifier: extension.identifier, error: errorcode });
	}

	getInstAlled(type: ExtensionType | null = null): Promise<ILocAlExtension[]> {
		return this.extensionsScAnner.scAnExtensions(type);
	}

	removeDeprecAtedExtensions(): Promise<void> {
		return this.extensionsScAnner.cleAnUp();
	}

	privAte Async isUninstAlled(identifier: ExtensionIdentifierWithVersion): Promise<booleAn> {
		const uninstAlled = AwAit this.filterUninstAlled(identifier);
		return uninstAlled.length === 1;
	}

	privAte filterUninstAlled(...identifiers: ExtensionIdentifierWithVersion[]): Promise<string[]> {
		return this.extensionsScAnner.withUninstAlledExtensions(AllUninstAlled => {
			const uninstAlled: string[] = [];
			for (const identifier of identifiers) {
				if (!!AllUninstAlled[identifier.key()]) {
					uninstAlled.push(identifier.key());
				}
			}
			return uninstAlled;
		});
	}

	privAte setUninstAlled(...extensions: ILocAlExtension[]): Promise<{ [id: string]: booleAn }> {
		const ids: ExtensionIdentifierWithVersion[] = extensions.mAp(e => new ExtensionIdentifierWithVersion(e.identifier, e.mAnifest.version));
		return this.extensionsScAnner.withUninstAlledExtensions(uninstAlled => {
			ids.forEAch(id => uninstAlled[id.key()] = true);
			return uninstAlled;
		});
	}

	privAte unsetUninstAlled(extensionIdentifier: ExtensionIdentifierWithVersion): Promise<void> {
		return this.extensionsScAnner.withUninstAlledExtensions<void>(uninstAlled => delete uninstAlled[extensionIdentifier.key()]);
	}

	getExtensionsReport(): Promise<IReportedExtension[]> {
		const now = new DAte().getTime();

		if (!this.reportedExtensions || now - this.lAstReportTimestAmp > 1000 * 60 * 5) { // 5 minute cAche freshness
			this.reportedExtensions = this.updAteReportCAche();
			this.lAstReportTimestAmp = now;
		}

		return this.reportedExtensions;
	}

	privAte Async updAteReportCAche(): Promise<IReportedExtension[]> {
		try {
			this.logService.trAce('ExtensionMAnAgementService.refreshReportedCAche');
			const result = AwAit this.gAlleryService.getExtensionsReport();
			this.logService.trAce(`ExtensionMAnAgementService.refreshReportedCAche - got ${result.length} reported extensions from service`);
			return result;
		} cAtch (err) {
			this.logService.trAce('ExtensionMAnAgementService.refreshReportedCAche - fAiled to get extension report');
			return [];
		}
	}

	privAte reportTelemetry(eventNAme: string, extensionDAtA: Any, durAtion?: number, error?: Error): void {
		const errorcode = error ? error instAnceof ExtensionMAnAgementError ? error.code : ERROR_UNKNOWN : undefined;
		/* __GDPR__
			"extensionGAllery:instAll" : {
				"success": { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true },
				"durAtion" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true },
				"errorcode": { "clAssificAtion": "CAllstAckOrException", "purpose": "PerformAnceAndHeAlth" },
				"recommendAtionReAson": { "retiredFromVersion": "1.23.0", "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"${include}": [
					"${GAlleryExtensionTelemetryDAtA}"
				]
			}
		*/
		/* __GDPR__
			"extensionGAllery:uninstAll" : {
				"success": { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true },
				"durAtion" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true },
				"errorcode": { "clAssificAtion": "CAllstAckOrException", "purpose": "PerformAnceAndHeAlth" },
				"${include}": [
					"${GAlleryExtensionTelemetryDAtA}"
				]
			}
		*/
		/* __GDPR__
			"extensionGAllery:updAte" : {
				"success": { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true },
				"durAtion" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true },
				"errorcode": { "clAssificAtion": "CAllstAckOrException", "purpose": "PerformAnceAndHeAlth" },
				"${include}": [
					"${GAlleryExtensionTelemetryDAtA}"
				]
			}
		*/
		this.telemetryService.publicLogError(eventNAme, { ...extensionDAtA, success: !error, durAtion, errorcode });
	}
}
