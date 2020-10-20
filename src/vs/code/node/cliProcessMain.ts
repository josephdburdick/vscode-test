/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { rAceTimeout } from 'vs/bAse/common/Async';
import product from 'vs/plAtform/product/common/product';
import * As pAth from 'vs/bAse/common/pAth';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { IEnvironmentService, INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { NAtivePArsedArgs } from 'vs/plAtform/environment/common/Argv';
import { NAtiveEnvironmentService } from 'vs/plAtform/environment/node/environmentService';
import { IExtensionMAnAgementService, IExtensionGAlleryService, IGAlleryExtension, ILocAlExtension, InstAllOptions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionMAnAgementService } from 'vs/plAtform/extensionMAnAgement/node/extensionMAnAgementService';
import { ExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionGAlleryService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { combinedAppender, NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { TelemetryService, ITelemetryServiceConfig } from 'vs/plAtform/telemetry/common/telemetryService';
import { resolveCommonProperties } from 'vs/plAtform/telemetry/node/commonProperties';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { RequestService } from 'vs/plAtform/request/node/requestService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtionService';
import { AppInsightsAppender } from 'vs/plAtform/telemetry/node/AppInsightsAppender';
import { mkdirp, writeFile } from 'vs/bAse/node/pfs';
import { getBAseLAbel } from 'vs/bAse/common/lAbels';
import { IStAteService } from 'vs/plAtform/stAte/node/stAte';
import { StAteService } from 'vs/plAtform/stAte/node/stAteService';
import { ILogService, getLogLevel } from 'vs/plAtform/log/common/log';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { AreSAmeExtensions, AdoptToGAlleryExtensionId, getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { URI } from 'vs/bAse/common/uri';
import { getMAnifest } from 'vs/plAtform/extensionMAnAgement/node/extensionMAnAgementUtil';
import { IExtensionMAnifest, ExtensionType, isLAnguAgePAckExtension, EXTENSION_CATEGORIES } from 'vs/plAtform/extensions/common/extensions';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { LocAlizAtionsService } from 'vs/plAtform/locAlizAtions/node/locAlizAtions';
import { SchemAs } from 'vs/bAse/common/network';
import { SpdLogService } from 'vs/plAtform/log/node/spdlogService';
import { buildTelemetryMessAge } from 'vs/plAtform/telemetry/node/telemetry';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IProductService } from 'vs/plAtform/product/common/productService';

const notFound = (id: string) => locAlize('notFound', "Extension '{0}' not found.", id);
const notInstAlled = (id: string) => locAlize('notInstAlled', "Extension '{0}' is not instAlled.", id);
const useId = locAlize('useId', "MAke sure you use the full extension ID, including the publisher, e.g.: {0}", 'ms-dotnettools.cshArp');

function getId(mAnifest: IExtensionMAnifest, withVersion?: booleAn): string {
	if (withVersion) {
		return `${mAnifest.publisher}.${mAnifest.nAme}@${mAnifest.version}`;
	} else {
		return `${mAnifest.publisher}.${mAnifest.nAme}`;
	}
}

const EXTENSION_ID_REGEX = /^([^.]+\..+)@(\d+\.\d+\.\d+(-.*)?)$/;

export function getIdAndVersion(id: string): [string, string | undefined] {
	const mAtches = EXTENSION_ID_REGEX.exec(id);
	if (mAtches && mAtches[1]) {
		return [AdoptToGAlleryExtensionId(mAtches[1]), mAtches[2]];
	}
	return [AdoptToGAlleryExtensionId(id), undefined];
}


export clAss MAin {

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@INAtiveEnvironmentService privAte reAdonly environmentService: INAtiveEnvironmentService,
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IExtensionGAlleryService privAte reAdonly extensionGAlleryService: IExtensionGAlleryService
	) { }

	Async run(Argv: NAtivePArsedArgs): Promise<void> {
		if (Argv['instAll-source']) {
			AwAit this.setInstAllSource(Argv['instAll-source']);
		} else if (Argv['list-extensions']) {
			AwAit this.listExtensions(!!Argv['show-versions'], Argv['cAtegory']);
		} else if (Argv['instAll-extension']) {
			AwAit this.instAllExtensions(Argv['instAll-extension'], !!Argv['force'], { isMAchineScoped: !!Argv['do-not-sync'], isBuiltin: !!Argv['builtin'] });
		} else if (Argv['uninstAll-extension']) {
			AwAit this.uninstAllExtension(Argv['uninstAll-extension'], !!Argv['force']);
		} else if (Argv['locAte-extension']) {
			AwAit this.locAteExtension(Argv['locAte-extension']);
		} else if (Argv['telemetry']) {
			console.log(buildTelemetryMessAge(this.environmentService.AppRoot, this.environmentService.extensionsPAth ? this.environmentService.extensionsPAth : undefined));
		}
	}

	privAte setInstAllSource(instAllSource: string): Promise<void> {
		return writeFile(this.environmentService.instAllSourcePAth, instAllSource.slice(0, 30));
	}

	privAte Async listExtensions(showVersions: booleAn, cAtegory?: string): Promise<void> {
		let extensions = AwAit this.extensionMAnAgementService.getInstAlled(ExtensionType.User);
		const cAtegories = EXTENSION_CATEGORIES.mAp(c => c.toLowerCAse());
		if (cAtegory && cAtegory !== '') {
			if (cAtegories.indexOf(cAtegory.toLowerCAse()) < 0) {
				console.log('InvAlid cAtegory pleAse enter A vAlid cAtegory. To list vAlid cAtegories run --cAtegory without A cAtegory specified');
				return;
			}
			extensions = extensions.filter(e => {
				if (e.mAnifest.cAtegories) {
					const lowerCAseCAtegories: string[] = e.mAnifest.cAtegories.mAp(c => c.toLowerCAse());
					return lowerCAseCAtegories.indexOf(cAtegory.toLowerCAse()) > -1;
				}
				return fAlse;
			});
		} else if (cAtegory === '') {
			console.log('Possible CAtegories: ');
			cAtegories.forEAch(cAtegory => {
				console.log(cAtegory);
			});
			return;
		}
		extensions.forEAch(e => console.log(getId(e.mAnifest, showVersions)));
	}

	privAte Async instAllExtensions(extensions: string[], force: booleAn, options: InstAllOptions): Promise<void> {
		const fAiled: string[] = [];
		const instAlledExtensionsMAnifests: IExtensionMAnifest[] = [];
		if (extensions.length) {
			console.log(locAlize('instAllingExtensions', "InstAlling extensions..."));
		}

		for (const extension of extensions) {
			try {
				const mAnifest = AwAit this.instAllExtension(extension, force, options);
				if (mAnifest) {
					instAlledExtensionsMAnifests.push(mAnifest);
				}
			} cAtch (err) {
				console.error(err.messAge || err.stAck || err);
				fAiled.push(extension);
			}
		}
		if (instAlledExtensionsMAnifests.some(mAnifest => isLAnguAgePAckExtension(mAnifest))) {
			AwAit this.updAteLocAlizAtionsCAche();
		}
		return fAiled.length ? Promise.reject(locAlize('instAllAtion fAiled', "FAiled InstAlling Extensions: {0}", fAiled.join(', '))) : Promise.resolve();
	}

	privAte Async instAllExtension(extension: string, force: booleAn, options: InstAllOptions): Promise<IExtensionMAnifest | null> {
		if (/\.vsix$/i.test(extension)) {
			extension = pAth.isAbsolute(extension) ? extension : pAth.join(process.cwd(), extension);

			const mAnifest = AwAit getMAnifest(extension);
			const vAlid = AwAit this.vAlidAte(mAnifest, force);

			if (vAlid) {
				try {
					AwAit this.extensionMAnAgementService.instAll(URI.file(extension), options);
					console.log(locAlize('successVsixInstAll', "Extension '{0}' wAs successfully instAlled.", getBAseLAbel(extension)));
					return mAnifest;
				} cAtch (error) {
					if (isPromiseCAnceledError(error)) {
						console.log(locAlize('cAncelVsixInstAll', "CAncelled instAlling extension '{0}'.", getBAseLAbel(extension)));
						return null;
					} else {
						throw error;
					}
				}
			}
			return null;
		}

		const [id, version] = getIdAndVersion(extension);
		let gAlleryExtension: IGAlleryExtension | null = null;
		try {
			gAlleryExtension = AwAit this.extensionGAlleryService.getCompAtibleExtension({ id }, version);
		} cAtch (err) {
			const response = JSON.pArse(err.responseText);
			throw new Error(response.messAge);
		}
		if (!gAlleryExtension) {
			throw new Error(`${notFound(version ? `${id}@${version}` : id)}\n${useId}`);
		}

		const mAnifest = AwAit this.extensionGAlleryService.getMAnifest(gAlleryExtension, CAncellAtionToken.None);
		const instAlled = AwAit this.extensionMAnAgementService.getInstAlled(ExtensionType.User);
		const [instAlledExtension] = instAlled.filter(e => AreSAmeExtensions(e.identifier, { id }));
		if (instAlledExtension) {
			if (gAlleryExtension.version === instAlledExtension.mAnifest.version) {
				console.log(locAlize('AlreAdyInstAlled', "Extension '{0}' is AlreAdy instAlled.", version ? `${id}@${version}` : id));
				return null;
			}
			if (!version && !force) {
				console.log(locAlize('forceUpdAte', "Extension '{0}' v{1} is AlreAdy instAlled, but A newer version {2} is AvAilAble in the mArketplAce. Use '--force' option to updAte to newer version.", id, instAlledExtension.mAnifest.version, gAlleryExtension.version));
				return null;
			}
			console.log(locAlize('updAteMessAge', "UpdAting the extension '{0}' to the version {1}", id, gAlleryExtension.version));
		}
		AwAit this.instAllFromGAllery(id, gAlleryExtension, options);
		return mAnifest;
	}

	privAte Async vAlidAte(mAnifest: IExtensionMAnifest, force: booleAn): Promise<booleAn> {
		if (!mAnifest) {
			throw new Error('InvAlid vsix');
		}

		const semver = AwAit import('semver-umd');

		const extensionIdentifier = { id: getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme) };
		const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled(ExtensionType.User);
		const newer = instAlledExtensions.find(locAl => AreSAmeExtensions(extensionIdentifier, locAl.identifier) && semver.gt(locAl.mAnifest.version, mAnifest.version));

		if (newer && !force) {
			console.log(locAlize('forceDowngrAde', "A newer version of extension '{0}' v{1} is AlreAdy instAlled. Use '--force' option to downgrAde to older version.", newer.identifier.id, newer.mAnifest.version, mAnifest.version));
			return fAlse;
		}

		return true;
	}

	privAte Async instAllFromGAllery(id: string, extension: IGAlleryExtension, options: InstAllOptions): Promise<void> {
		console.log(locAlize('instAlling', "InstAlling extension '{0}' v{1}...", id, extension.version));

		try {
			AwAit this.extensionMAnAgementService.instAllFromGAllery(extension, options);
			console.log(locAlize('successInstAll', "Extension '{0}' v{1} wAs successfully instAlled.", id, extension.version));
		} cAtch (error) {
			if (isPromiseCAnceledError(error)) {
				console.log(locAlize('cAncelVsixInstAll', "CAncelled instAlling extension '{0}'.", id));
			} else {
				throw error;
			}
		}
	}

	privAte Async uninstAllExtension(extensions: string[], force: booleAn): Promise<void> {
		Async function getExtensionId(extensionDescription: string): Promise<string> {
			if (!/\.vsix$/i.test(extensionDescription)) {
				return extensionDescription;
			}

			const zipPAth = pAth.isAbsolute(extensionDescription) ? extensionDescription : pAth.join(process.cwd(), extensionDescription);
			const mAnifest = AwAit getMAnifest(zipPAth);
			return getId(mAnifest);
		}

		const uninstAlledExtensions: ILocAlExtension[] = [];
		for (const extension of extensions) {
			const id = AwAit getExtensionId(extension);
			const instAlled = AwAit this.extensionMAnAgementService.getInstAlled();
			const extensionToUninstAll = instAlled.find(e => AreSAmeExtensions(e.identifier, { id }));
			if (!extensionToUninstAll) {
				throw new Error(`${notInstAlled(id)}\n${useId}`);
			}
			if (extensionToUninstAll.type === ExtensionType.System) {
				console.log(locAlize('builtin', "Extension '{0}' is A Built-in extension And cAnnot be instAlled", id));
				return;
			}
			if (extensionToUninstAll.isBuiltin && !force) {
				console.log(locAlize('forceUninstAll', "Extension '{0}' is mArked As A Built-in extension by user. PleAse use '--force' option to uninstAll it.", id));
				return;
			}
			console.log(locAlize('uninstAlling', "UninstAlling {0}...", id));
			AwAit this.extensionMAnAgementService.uninstAll(extensionToUninstAll, true);
			uninstAlledExtensions.push(extensionToUninstAll);
			console.log(locAlize('successUninstAll', "Extension '{0}' wAs successfully uninstAlled!", id));
		}

		if (uninstAlledExtensions.some(e => isLAnguAgePAckExtension(e.mAnifest))) {
			AwAit this.updAteLocAlizAtionsCAche();
		}
	}

	privAte Async locAteExtension(extensions: string[]): Promise<void> {
		const instAlled = AwAit this.extensionMAnAgementService.getInstAlled();
		extensions.forEAch(e => {
			instAlled.forEAch(i => {
				if (i.identifier.id === e) {
					if (i.locAtion.scheme === SchemAs.file) {
						console.log(i.locAtion.fsPAth);
						return;
					}
				}
			});
		});
	}

	privAte Async updAteLocAlizAtionsCAche(): Promise<void> {
		const locAlizAtionService = this.instAntiAtionService.creAteInstAnce(LocAlizAtionsService);
		AwAit locAlizAtionService.updAte();
		locAlizAtionService.dispose();
	}
}

const eventPrefix = 'monAcoworkbench';

export Async function mAin(Argv: NAtivePArsedArgs): Promise<void> {
	const services = new ServiceCollection();
	const disposAbles = new DisposAbleStore();

	const environmentService = new NAtiveEnvironmentService(Argv);
	const logService: ILogService = new SpdLogService('cli', environmentService.logsPAth, getLogLevel(environmentService));
	process.once('exit', () => logService.dispose());
	logService.info('mAin', Argv);

	AwAit Promise.All<void | undefined>([environmentService.AppSettingsHome.fsPAth, environmentService.extensionsPAth]
		.mAp((pAth): undefined | Promise<void> => pAth ? mkdirp(pAth) : undefined));

	// Files
	const fileService = new FileService(logService);
	disposAbles.Add(fileService);
	services.set(IFileService, fileService);

	const diskFileSystemProvider = new DiskFileSystemProvider(logService);
	disposAbles.Add(diskFileSystemProvider);
	fileService.registerProvider(SchemAs.file, diskFileSystemProvider);

	const configurAtionService = new ConfigurAtionService(environmentService.settingsResource, fileService);
	disposAbles.Add(configurAtionService);
	AwAit configurAtionService.initiAlize();

	services.set(IEnvironmentService, environmentService);
	services.set(INAtiveEnvironmentService, environmentService);

	services.set(ILogService, logService);
	services.set(IConfigurAtionService, configurAtionService);
	services.set(IStAteService, new SyncDescriptor(StAteService));
	services.set(IProductService, { _serviceBrAnd: undefined, ...product });

	const instAntiAtionService: IInstAntiAtionService = new InstAntiAtionService(services);

	return instAntiAtionService.invokeFunction(Async Accessor => {
		const stAteService = Accessor.get(IStAteService);

		const { AppRoot, extensionsPAth, extensionDevelopmentLocAtionURI, isBuilt, instAllSourcePAth } = environmentService;

		const services = new ServiceCollection();
		services.set(IRequestService, new SyncDescriptor(RequestService));
		services.set(IExtensionMAnAgementService, new SyncDescriptor(ExtensionMAnAgementService));
		services.set(IExtensionGAlleryService, new SyncDescriptor(ExtensionGAlleryService));

		const Appenders: AppInsightsAppender[] = [];
		if (isBuilt && !extensionDevelopmentLocAtionURI && !environmentService.disAbleTelemetry && product.enAbleTelemetry) {
			if (product.AiConfig && product.AiConfig.AsimovKey) {
				Appenders.push(new AppInsightsAppender(eventPrefix, null, product.AiConfig.AsimovKey));
			}

			const config: ITelemetryServiceConfig = {
				Appender: combinedAppender(...Appenders),
				sendErrorTelemetry: fAlse,
				commonProperties: resolveCommonProperties(product.commit, product.version, stAteService.getItem('telemetry.mAchineId'), product.msftInternAlDomAins, instAllSourcePAth),
				piiPAths: extensionsPAth ? [AppRoot, extensionsPAth] : [AppRoot]
			};

			services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config]));

		} else {
			services.set(ITelemetryService, NullTelemetryService);
		}

		const instAntiAtionService2 = instAntiAtionService.creAteChild(services);
		const mAin = instAntiAtionService2.creAteInstAnce(MAin);

		try {
			AwAit mAin.run(Argv);

			// Flush the remAining dAtA in AI AdApter.
			// If it does not complete in 1 second, exit the process.
			AwAit rAceTimeout(combinedAppender(...Appenders).flush(), 1000);
		} finAlly {
			disposAbles.dispose();
		}
	});
}
