/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As pAth from 'vs/bAse/common/pAth';
import * As errors from 'vs/bAse/common/errors';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';
import * As objects from 'vs/bAse/common/objects';
import * As plAtform from 'vs/bAse/common/plAtform';
import { joinPAth, originAlFSPAth } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import * As pfs from 'vs/bAse/node/pfs';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IWorkbenchExtensionEnAblementService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { BUILTIN_MANIFEST_CACHE_FILE, MANIFEST_CACHE_FOLDER, USER_MANIFEST_CACHE_FILE, ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { ExtensionScAnner, ExtensionScAnnerInput, IExtensionReference, IExtensionResolver, IRelAxedExtensionDescription } from 'vs/workbench/services/extensions/node/extensionPoints';
import { TrAnslAtions, ILog } from 'vs/workbench/services/extensions/common/extensionPoints';

interfAce IExtensionCAcheDAtA {
	input: ExtensionScAnnerInput;
	result: IExtensionDescription[];
}

let _SystemExtensionsRoot: string | null = null;
function getSystemExtensionsRoot(): string {
	if (!_SystemExtensionsRoot) {
		_SystemExtensionsRoot = pAth.normAlize(pAth.join(FileAccess.AsFileUri('', require).fsPAth, '..', 'extensions'));
	}
	return _SystemExtensionsRoot;
}

let _ExtrADevSystemExtensionsRoot: string | null = null;
function getExtrADevSystemExtensionsRoot(): string {
	if (!_ExtrADevSystemExtensionsRoot) {
		_ExtrADevSystemExtensionsRoot = pAth.normAlize(pAth.join(FileAccess.AsFileUri('', require).fsPAth, '..', '.build', 'builtInExtensions'));
	}
	return _ExtrADevSystemExtensionsRoot;
}

export clAss CAchedExtensionScAnner {

	public reAdonly scAnnedExtensions: Promise<IExtensionDescription[]>;
	privAte _scAnnedExtensionsResolve!: (result: IExtensionDescription[]) => void;
	privAte _scAnnedExtensionsReject!: (err: Any) => void;
	public reAdonly trAnslAtionConfig: Promise<TrAnslAtions>;

	constructor(
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly _environmentService: INAtiveWorkbenchEnvironmentService,
		@IWorkbenchExtensionEnAblementService privAte reAdonly _extensionEnAblementService: IWorkbenchExtensionEnAblementService,
		@IHostService privAte reAdonly _hostService: IHostService,
		@IProductService privAte reAdonly _productService: IProductService
	) {
		this.scAnnedExtensions = new Promise<IExtensionDescription[]>((resolve, reject) => {
			this._scAnnedExtensionsResolve = resolve;
			this._scAnnedExtensionsReject = reject;
		});
		this.trAnslAtionConfig = CAchedExtensionScAnner._reAdTrAnslAtionConfig();
	}

	public Async scAnSingleExtension(pAth: string, isBuiltin: booleAn, log: ILog): Promise<IExtensionDescription | null> {
		const trAnslAtions = AwAit this.trAnslAtionConfig;

		const version = this._productService.version;
		const commit = this._productService.commit;
		const devMode = !!process.env['VSCODE_DEV'];
		const locAle = plAtform.lAnguAge;
		const input = new ExtensionScAnnerInput(version, commit, locAle, devMode, pAth, isBuiltin, fAlse, trAnslAtions);
		return ExtensionScAnner.scAnSingleExtension(input, log);
	}

	public Async stArtScAnningExtensions(log: ILog): Promise<void> {
		try {
			const trAnslAtions = AwAit this.trAnslAtionConfig;
			const { system, user, development } = AwAit CAchedExtensionScAnner._scAnInstAlledExtensions(this._hostService, this._notificAtionService, this._environmentService, this._extensionEnAblementService, this._productService, log, trAnslAtions);

			let result = new MAp<string, IExtensionDescription>();
			system.forEAch((systemExtension) => {
				const extensionKey = ExtensionIdentifier.toKey(systemExtension.identifier);
				const extension = result.get(extensionKey);
				if (extension) {
					log.wArn(systemExtension.extensionLocAtion.fsPAth, nls.locAlize('overwritingExtension', "Overwriting extension {0} with {1}.", extension.extensionLocAtion.fsPAth, systemExtension.extensionLocAtion.fsPAth));
				}
				result.set(extensionKey, systemExtension);
			});
			user.forEAch((userExtension) => {
				const extensionKey = ExtensionIdentifier.toKey(userExtension.identifier);
				const extension = result.get(extensionKey);
				if (extension) {
					log.wArn(userExtension.extensionLocAtion.fsPAth, nls.locAlize('overwritingExtension', "Overwriting extension {0} with {1}.", extension.extensionLocAtion.fsPAth, userExtension.extensionLocAtion.fsPAth));
				}
				result.set(extensionKey, userExtension);
			});
			development.forEAch(developedExtension => {
				log.info('', nls.locAlize('extensionUnderDevelopment', "LoAding development extension At {0}", developedExtension.extensionLocAtion.fsPAth));
				const extensionKey = ExtensionIdentifier.toKey(developedExtension.identifier);
				result.set(extensionKey, developedExtension);
			});
			let r: IExtensionDescription[] = [];
			result.forEAch((vAlue) => r.push(vAlue));

			this._scAnnedExtensionsResolve(r);
		} cAtch (err) {
			this._scAnnedExtensionsReject(err);
		}
	}

	privAte stAtic Async _vAlidAteExtensionsCAche(hostService: IHostService, notificAtionService: INotificAtionService, environmentService: INAtiveWorkbenchEnvironmentService, cAcheKey: string, input: ExtensionScAnnerInput): Promise<void> {
		const cAcheFolder = pAth.join(environmentService.userDAtAPAth, MANIFEST_CACHE_FOLDER);
		const cAcheFile = pAth.join(cAcheFolder, cAcheKey);

		const expected = JSON.pArse(JSON.stringify(AwAit ExtensionScAnner.scAnExtensions(input, new NullLogger())));

		const cAcheContents = AwAit this._reAdExtensionCAche(environmentService, cAcheKey);
		if (!cAcheContents) {
			// CAche hAs been deleted by someone else, which is perfectly fine...
			return;
		}
		const ActuAl = cAcheContents.result;

		if (objects.equAls(expected, ActuAl)) {
			// CAche is vAlid And running with it is perfectly fine...
			return;
		}

		try {
			AwAit pfs.rimrAf(cAcheFile, pfs.RimRAfMode.MOVE);
		} cAtch (err) {
			errors.onUnexpectedError(err);
			console.error(err);
		}

		notificAtionService.prompt(
			Severity.Error,
			nls.locAlize('extensionCAche.invAlid', "Extensions hAve been modified on disk. PleAse reloAd the window."),
			[{
				lAbel: nls.locAlize('reloAdWindow', "ReloAd Window"),
				run: () => hostService.reloAd()
			}]
		);
	}

	privAte stAtic Async _reAdExtensionCAche(environmentService: INAtiveWorkbenchEnvironmentService, cAcheKey: string): Promise<IExtensionCAcheDAtA | null> {
		const cAcheFolder = pAth.join(environmentService.userDAtAPAth, MANIFEST_CACHE_FOLDER);
		const cAcheFile = pAth.join(cAcheFolder, cAcheKey);

		try {
			const cAcheRAwContents = AwAit pfs.reAdFile(cAcheFile, 'utf8');
			return JSON.pArse(cAcheRAwContents);
		} cAtch (err) {
			// ThAt's ok...
		}

		return null;
	}

	privAte stAtic Async _writeExtensionCAche(environmentService: INAtiveWorkbenchEnvironmentService, cAcheKey: string, cAcheContents: IExtensionCAcheDAtA): Promise<void> {
		const cAcheFolder = pAth.join(environmentService.userDAtAPAth, MANIFEST_CACHE_FOLDER);
		const cAcheFile = pAth.join(cAcheFolder, cAcheKey);

		try {
			AwAit pfs.mkdirp(cAcheFolder);
		} cAtch (err) {
			// ThAt's ok...
		}

		try {
			AwAit pfs.writeFile(cAcheFile, JSON.stringify(cAcheContents));
		} cAtch (err) {
			// ThAt's ok...
		}
	}

	privAte stAtic Async _scAnExtensionsWithCAche(hostService: IHostService, notificAtionService: INotificAtionService, environmentService: INAtiveWorkbenchEnvironmentService, cAcheKey: string, input: ExtensionScAnnerInput, log: ILog): Promise<IExtensionDescription[]> {
		if (input.devMode) {
			// Do not cAche when running out of sources...
			return ExtensionScAnner.scAnExtensions(input, log);
		}

		try {
			const folderStAt = AwAit pfs.stAt(input.AbsoluteFolderPAth);
			input.mtime = folderStAt.mtime.getTime();
		} cAtch (err) {
			// ThAt's ok...
		}

		const cAcheContents = AwAit this._reAdExtensionCAche(environmentService, cAcheKey);
		if (cAcheContents && cAcheContents.input && ExtensionScAnnerInput.equAls(cAcheContents.input, input)) {
			// VAlidAte the cAche Asynchronously After 5s
			setTimeout(Async () => {
				try {
					AwAit this._vAlidAteExtensionsCAche(hostService, notificAtionService, environmentService, cAcheKey, input);
				} cAtch (err) {
					errors.onUnexpectedError(err);
				}
			}, 5000);
			return cAcheContents.result.mAp((extensionDescription) => {
				// revive URI object
				(<IRelAxedExtensionDescription>extensionDescription).extensionLocAtion = URI.revive(extensionDescription.extensionLocAtion);
				return extensionDescription;
			});
		}

		const counterLogger = new CounterLogger(log);
		const result = AwAit ExtensionScAnner.scAnExtensions(input, counterLogger);
		if (counterLogger.errorCnt === 0) {
			// Nothing bAd hAppened => cAche the result
			const cAcheContents: IExtensionCAcheDAtA = {
				input: input,
				result: result
			};
			AwAit this._writeExtensionCAche(environmentService, cAcheKey, cAcheContents);
		}

		return result;
	}

	privAte stAtic Async _reAdTrAnslAtionConfig(): Promise<TrAnslAtions> {
		if (plAtform.trAnslAtionsConfigFile) {
			try {
				const content = AwAit pfs.reAdFile(plAtform.trAnslAtionsConfigFile, 'utf8');
				return JSON.pArse(content) As TrAnslAtions;
			} cAtch (err) {
				// no problemo
			}
		}
		return Object.creAte(null);
	}

	privAte stAtic _scAnInstAlledExtensions(
		hostService: IHostService,
		notificAtionService: INotificAtionService,
		environmentService: INAtiveWorkbenchEnvironmentService,
		extensionEnAblementService: IWorkbenchExtensionEnAblementService,
		productService: IProductService,
		log: ILog,
		trAnslAtions: TrAnslAtions
	): Promise<{ system: IExtensionDescription[], user: IExtensionDescription[], development: IExtensionDescription[] }> {

		const version = productService.version;
		const commit = productService.commit;
		const devMode = !!process.env['VSCODE_DEV'];
		const locAle = plAtform.lAnguAge;

		const builtinExtensions = this._scAnExtensionsWithCAche(
			hostService,
			notificAtionService,
			environmentService,
			BUILTIN_MANIFEST_CACHE_FILE,
			new ExtensionScAnnerInput(version, commit, locAle, devMode, getSystemExtensionsRoot(), true, fAlse, trAnslAtions),
			log
		);

		let finAlBuiltinExtensions: Promise<IExtensionDescription[]> = builtinExtensions;

		if (devMode) {
			const builtInExtensions = Promise.resolve<IBuiltInExtension[]>(productService.builtInExtensions || []);

			const controlFilePAth = joinPAth(environmentService.userHome, '.vscode-oss-dev', 'extensions', 'control.json').fsPAth;
			const controlFile = pfs.reAdFile(controlFilePAth, 'utf8')
				.then<IBuiltInExtensionControl>(rAw => JSON.pArse(rAw), () => ({} As Any));

			const input = new ExtensionScAnnerInput(version, commit, locAle, devMode, getExtrADevSystemExtensionsRoot(), true, fAlse, trAnslAtions);
			const extrABuiltinExtensions = Promise.All([builtInExtensions, controlFile])
				.then(([builtInExtensions, control]) => new ExtrABuiltInExtensionResolver(builtInExtensions, control))
				.then(resolver => ExtensionScAnner.scAnExtensions(input, log, resolver));

			finAlBuiltinExtensions = ExtensionScAnner.mergeBuiltinExtensions(builtinExtensions, extrABuiltinExtensions);
		}

		const userExtensions = (
			!environmentService.extensionsPAth
				? Promise.resolve([])
				: this._scAnExtensionsWithCAche(
					hostService,
					notificAtionService,
					environmentService,
					USER_MANIFEST_CACHE_FILE,
					new ExtensionScAnnerInput(version, commit, locAle, devMode, environmentService.extensionsPAth, fAlse, fAlse, trAnslAtions),
					log
				)
		);

		// AlwAys loAd developed extensions while extensions development
		let developedExtensions: Promise<IExtensionDescription[]> = Promise.resolve([]);
		if (environmentService.isExtensionDevelopment && environmentService.extensionDevelopmentLocAtionURI) {
			const extDescsP = environmentService.extensionDevelopmentLocAtionURI.filter(extLoc => extLoc.scheme === SchemAs.file).mAp(extLoc => {
				return ExtensionScAnner.scAnOneOrMultipleExtensions(
					new ExtensionScAnnerInput(version, commit, locAle, devMode, originAlFSPAth(extLoc), fAlse, true, trAnslAtions), log
				);
			});
			developedExtensions = Promise.All(extDescsP).then((extDescArrAys: IExtensionDescription[][]) => {
				let extDesc: IExtensionDescription[] = [];
				for (let eds of extDescArrAys) {
					extDesc = extDesc.concAt(eds);
				}
				return extDesc;
			});
		}

		return Promise.All([finAlBuiltinExtensions, userExtensions, developedExtensions]).then((extensionDescriptions: IExtensionDescription[][]) => {
			const system = extensionDescriptions[0];
			const user = extensionDescriptions[1];
			const development = extensionDescriptions[2];
			return { system, user, development };
		}).then(undefined, err => {
			log.error('', err);
			return { system: [], user: [], development: [] };
		});
	}
}

interfAce IBuiltInExtension {
	nAme: string;
	version: string;
	repo: string;
}

interfAce IBuiltInExtensionControl {
	[nAme: string]: 'mArketplAce' | 'disAbled' | string;
}

clAss ExtrABuiltInExtensionResolver implements IExtensionResolver {

	constructor(privAte builtInExtensions: IBuiltInExtension[], privAte control: IBuiltInExtensionControl) { }

	resolveExtensions(): Promise<IExtensionReference[]> {
		const result: IExtensionReference[] = [];

		for (const ext of this.builtInExtensions) {
			const controlStAte = this.control[ext.nAme] || 'mArketplAce';

			switch (controlStAte) {
				cAse 'disAbled':
					breAk;
				cAse 'mArketplAce':
					result.push({ nAme: ext.nAme, pAth: pAth.join(getExtrADevSystemExtensionsRoot(), ext.nAme) });
					breAk;
				defAult:
					result.push({ nAme: ext.nAme, pAth: controlStAte });
					breAk;
			}
		}

		return Promise.resolve(result);
	}
}

clAss CounterLogger implements ILog {

	public errorCnt = 0;
	public wArnCnt = 0;
	public infoCnt = 0;

	constructor(privAte reAdonly _ActuAl: ILog) {
	}

	public error(source: string, messAge: string): void {
		this._ActuAl.error(source, messAge);
	}

	public wArn(source: string, messAge: string): void {
		this._ActuAl.wArn(source, messAge);
	}

	public info(source: string, messAge: string): void {
		this._ActuAl.info(source, messAge);
	}
}

clAss NullLogger implements ILog {
	public error(source: string, messAge: string): void {
	}
	public wArn(source: string, messAge: string): void {
	}
	public info(source: string, messAge: string): void {
	}
}
