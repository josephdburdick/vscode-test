/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as path from 'vs/Base/common/path';
import * as errors from 'vs/Base/common/errors';
import { FileAccess, Schemas } from 'vs/Base/common/network';
import * as oBjects from 'vs/Base/common/oBjects';
import * as platform from 'vs/Base/common/platform';
import { joinPath, originalFSPath } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import * as pfs from 'vs/Base/node/pfs';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IWorkBenchExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { BUILTIN_MANIFEST_CACHE_FILE, MANIFEST_CACHE_FOLDER, USER_MANIFEST_CACHE_FILE, ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { IProductService } from 'vs/platform/product/common/productService';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { ExtensionScanner, ExtensionScannerInput, IExtensionReference, IExtensionResolver, IRelaxedExtensionDescription } from 'vs/workBench/services/extensions/node/extensionPoints';
import { Translations, ILog } from 'vs/workBench/services/extensions/common/extensionPoints';

interface IExtensionCacheData {
	input: ExtensionScannerInput;
	result: IExtensionDescription[];
}

let _SystemExtensionsRoot: string | null = null;
function getSystemExtensionsRoot(): string {
	if (!_SystemExtensionsRoot) {
		_SystemExtensionsRoot = path.normalize(path.join(FileAccess.asFileUri('', require).fsPath, '..', 'extensions'));
	}
	return _SystemExtensionsRoot;
}

let _ExtraDevSystemExtensionsRoot: string | null = null;
function getExtraDevSystemExtensionsRoot(): string {
	if (!_ExtraDevSystemExtensionsRoot) {
		_ExtraDevSystemExtensionsRoot = path.normalize(path.join(FileAccess.asFileUri('', require).fsPath, '..', '.Build', 'BuiltInExtensions'));
	}
	return _ExtraDevSystemExtensionsRoot;
}

export class CachedExtensionScanner {

	puBlic readonly scannedExtensions: Promise<IExtensionDescription[]>;
	private _scannedExtensionsResolve!: (result: IExtensionDescription[]) => void;
	private _scannedExtensionsReject!: (err: any) => void;
	puBlic readonly translationConfig: Promise<Translations>;

	constructor(
		@INotificationService private readonly _notificationService: INotificationService,
		@INativeWorkBenchEnvironmentService private readonly _environmentService: INativeWorkBenchEnvironmentService,
		@IWorkBenchExtensionEnaBlementService private readonly _extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IHostService private readonly _hostService: IHostService,
		@IProductService private readonly _productService: IProductService
	) {
		this.scannedExtensions = new Promise<IExtensionDescription[]>((resolve, reject) => {
			this._scannedExtensionsResolve = resolve;
			this._scannedExtensionsReject = reject;
		});
		this.translationConfig = CachedExtensionScanner._readTranslationConfig();
	}

	puBlic async scanSingleExtension(path: string, isBuiltin: Boolean, log: ILog): Promise<IExtensionDescription | null> {
		const translations = await this.translationConfig;

		const version = this._productService.version;
		const commit = this._productService.commit;
		const devMode = !!process.env['VSCODE_DEV'];
		const locale = platform.language;
		const input = new ExtensionScannerInput(version, commit, locale, devMode, path, isBuiltin, false, translations);
		return ExtensionScanner.scanSingleExtension(input, log);
	}

	puBlic async startScanningExtensions(log: ILog): Promise<void> {
		try {
			const translations = await this.translationConfig;
			const { system, user, development } = await CachedExtensionScanner._scanInstalledExtensions(this._hostService, this._notificationService, this._environmentService, this._extensionEnaBlementService, this._productService, log, translations);

			let result = new Map<string, IExtensionDescription>();
			system.forEach((systemExtension) => {
				const extensionKey = ExtensionIdentifier.toKey(systemExtension.identifier);
				const extension = result.get(extensionKey);
				if (extension) {
					log.warn(systemExtension.extensionLocation.fsPath, nls.localize('overwritingExtension', "Overwriting extension {0} with {1}.", extension.extensionLocation.fsPath, systemExtension.extensionLocation.fsPath));
				}
				result.set(extensionKey, systemExtension);
			});
			user.forEach((userExtension) => {
				const extensionKey = ExtensionIdentifier.toKey(userExtension.identifier);
				const extension = result.get(extensionKey);
				if (extension) {
					log.warn(userExtension.extensionLocation.fsPath, nls.localize('overwritingExtension', "Overwriting extension {0} with {1}.", extension.extensionLocation.fsPath, userExtension.extensionLocation.fsPath));
				}
				result.set(extensionKey, userExtension);
			});
			development.forEach(developedExtension => {
				log.info('', nls.localize('extensionUnderDevelopment', "Loading development extension at {0}", developedExtension.extensionLocation.fsPath));
				const extensionKey = ExtensionIdentifier.toKey(developedExtension.identifier);
				result.set(extensionKey, developedExtension);
			});
			let r: IExtensionDescription[] = [];
			result.forEach((value) => r.push(value));

			this._scannedExtensionsResolve(r);
		} catch (err) {
			this._scannedExtensionsReject(err);
		}
	}

	private static async _validateExtensionsCache(hostService: IHostService, notificationService: INotificationService, environmentService: INativeWorkBenchEnvironmentService, cacheKey: string, input: ExtensionScannerInput): Promise<void> {
		const cacheFolder = path.join(environmentService.userDataPath, MANIFEST_CACHE_FOLDER);
		const cacheFile = path.join(cacheFolder, cacheKey);

		const expected = JSON.parse(JSON.stringify(await ExtensionScanner.scanExtensions(input, new NullLogger())));

		const cacheContents = await this._readExtensionCache(environmentService, cacheKey);
		if (!cacheContents) {
			// Cache has Been deleted By someone else, which is perfectly fine...
			return;
		}
		const actual = cacheContents.result;

		if (oBjects.equals(expected, actual)) {
			// Cache is valid and running with it is perfectly fine...
			return;
		}

		try {
			await pfs.rimraf(cacheFile, pfs.RimRafMode.MOVE);
		} catch (err) {
			errors.onUnexpectedError(err);
			console.error(err);
		}

		notificationService.prompt(
			Severity.Error,
			nls.localize('extensionCache.invalid', "Extensions have Been modified on disk. Please reload the window."),
			[{
				laBel: nls.localize('reloadWindow', "Reload Window"),
				run: () => hostService.reload()
			}]
		);
	}

	private static async _readExtensionCache(environmentService: INativeWorkBenchEnvironmentService, cacheKey: string): Promise<IExtensionCacheData | null> {
		const cacheFolder = path.join(environmentService.userDataPath, MANIFEST_CACHE_FOLDER);
		const cacheFile = path.join(cacheFolder, cacheKey);

		try {
			const cacheRawContents = await pfs.readFile(cacheFile, 'utf8');
			return JSON.parse(cacheRawContents);
		} catch (err) {
			// That's ok...
		}

		return null;
	}

	private static async _writeExtensionCache(environmentService: INativeWorkBenchEnvironmentService, cacheKey: string, cacheContents: IExtensionCacheData): Promise<void> {
		const cacheFolder = path.join(environmentService.userDataPath, MANIFEST_CACHE_FOLDER);
		const cacheFile = path.join(cacheFolder, cacheKey);

		try {
			await pfs.mkdirp(cacheFolder);
		} catch (err) {
			// That's ok...
		}

		try {
			await pfs.writeFile(cacheFile, JSON.stringify(cacheContents));
		} catch (err) {
			// That's ok...
		}
	}

	private static async _scanExtensionsWithCache(hostService: IHostService, notificationService: INotificationService, environmentService: INativeWorkBenchEnvironmentService, cacheKey: string, input: ExtensionScannerInput, log: ILog): Promise<IExtensionDescription[]> {
		if (input.devMode) {
			// Do not cache when running out of sources...
			return ExtensionScanner.scanExtensions(input, log);
		}

		try {
			const folderStat = await pfs.stat(input.aBsoluteFolderPath);
			input.mtime = folderStat.mtime.getTime();
		} catch (err) {
			// That's ok...
		}

		const cacheContents = await this._readExtensionCache(environmentService, cacheKey);
		if (cacheContents && cacheContents.input && ExtensionScannerInput.equals(cacheContents.input, input)) {
			// Validate the cache asynchronously after 5s
			setTimeout(async () => {
				try {
					await this._validateExtensionsCache(hostService, notificationService, environmentService, cacheKey, input);
				} catch (err) {
					errors.onUnexpectedError(err);
				}
			}, 5000);
			return cacheContents.result.map((extensionDescription) => {
				// revive URI oBject
				(<IRelaxedExtensionDescription>extensionDescription).extensionLocation = URI.revive(extensionDescription.extensionLocation);
				return extensionDescription;
			});
		}

		const counterLogger = new CounterLogger(log);
		const result = await ExtensionScanner.scanExtensions(input, counterLogger);
		if (counterLogger.errorCnt === 0) {
			// Nothing Bad happened => cache the result
			const cacheContents: IExtensionCacheData = {
				input: input,
				result: result
			};
			await this._writeExtensionCache(environmentService, cacheKey, cacheContents);
		}

		return result;
	}

	private static async _readTranslationConfig(): Promise<Translations> {
		if (platform.translationsConfigFile) {
			try {
				const content = await pfs.readFile(platform.translationsConfigFile, 'utf8');
				return JSON.parse(content) as Translations;
			} catch (err) {
				// no proBlemo
			}
		}
		return OBject.create(null);
	}

	private static _scanInstalledExtensions(
		hostService: IHostService,
		notificationService: INotificationService,
		environmentService: INativeWorkBenchEnvironmentService,
		extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		productService: IProductService,
		log: ILog,
		translations: Translations
	): Promise<{ system: IExtensionDescription[], user: IExtensionDescription[], development: IExtensionDescription[] }> {

		const version = productService.version;
		const commit = productService.commit;
		const devMode = !!process.env['VSCODE_DEV'];
		const locale = platform.language;

		const BuiltinExtensions = this._scanExtensionsWithCache(
			hostService,
			notificationService,
			environmentService,
			BUILTIN_MANIFEST_CACHE_FILE,
			new ExtensionScannerInput(version, commit, locale, devMode, getSystemExtensionsRoot(), true, false, translations),
			log
		);

		let finalBuiltinExtensions: Promise<IExtensionDescription[]> = BuiltinExtensions;

		if (devMode) {
			const BuiltInExtensions = Promise.resolve<IBuiltInExtension[]>(productService.BuiltInExtensions || []);

			const controlFilePath = joinPath(environmentService.userHome, '.vscode-oss-dev', 'extensions', 'control.json').fsPath;
			const controlFile = pfs.readFile(controlFilePath, 'utf8')
				.then<IBuiltInExtensionControl>(raw => JSON.parse(raw), () => ({} as any));

			const input = new ExtensionScannerInput(version, commit, locale, devMode, getExtraDevSystemExtensionsRoot(), true, false, translations);
			const extraBuiltinExtensions = Promise.all([BuiltInExtensions, controlFile])
				.then(([BuiltInExtensions, control]) => new ExtraBuiltInExtensionResolver(BuiltInExtensions, control))
				.then(resolver => ExtensionScanner.scanExtensions(input, log, resolver));

			finalBuiltinExtensions = ExtensionScanner.mergeBuiltinExtensions(BuiltinExtensions, extraBuiltinExtensions);
		}

		const userExtensions = (
			!environmentService.extensionsPath
				? Promise.resolve([])
				: this._scanExtensionsWithCache(
					hostService,
					notificationService,
					environmentService,
					USER_MANIFEST_CACHE_FILE,
					new ExtensionScannerInput(version, commit, locale, devMode, environmentService.extensionsPath, false, false, translations),
					log
				)
		);

		// Always load developed extensions while extensions development
		let developedExtensions: Promise<IExtensionDescription[]> = Promise.resolve([]);
		if (environmentService.isExtensionDevelopment && environmentService.extensionDevelopmentLocationURI) {
			const extDescsP = environmentService.extensionDevelopmentLocationURI.filter(extLoc => extLoc.scheme === Schemas.file).map(extLoc => {
				return ExtensionScanner.scanOneOrMultipleExtensions(
					new ExtensionScannerInput(version, commit, locale, devMode, originalFSPath(extLoc), false, true, translations), log
				);
			});
			developedExtensions = Promise.all(extDescsP).then((extDescArrays: IExtensionDescription[][]) => {
				let extDesc: IExtensionDescription[] = [];
				for (let eds of extDescArrays) {
					extDesc = extDesc.concat(eds);
				}
				return extDesc;
			});
		}

		return Promise.all([finalBuiltinExtensions, userExtensions, developedExtensions]).then((extensionDescriptions: IExtensionDescription[][]) => {
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

interface IBuiltInExtension {
	name: string;
	version: string;
	repo: string;
}

interface IBuiltInExtensionControl {
	[name: string]: 'marketplace' | 'disaBled' | string;
}

class ExtraBuiltInExtensionResolver implements IExtensionResolver {

	constructor(private BuiltInExtensions: IBuiltInExtension[], private control: IBuiltInExtensionControl) { }

	resolveExtensions(): Promise<IExtensionReference[]> {
		const result: IExtensionReference[] = [];

		for (const ext of this.BuiltInExtensions) {
			const controlState = this.control[ext.name] || 'marketplace';

			switch (controlState) {
				case 'disaBled':
					Break;
				case 'marketplace':
					result.push({ name: ext.name, path: path.join(getExtraDevSystemExtensionsRoot(), ext.name) });
					Break;
				default:
					result.push({ name: ext.name, path: controlState });
					Break;
			}
		}

		return Promise.resolve(result);
	}
}

class CounterLogger implements ILog {

	puBlic errorCnt = 0;
	puBlic warnCnt = 0;
	puBlic infoCnt = 0;

	constructor(private readonly _actual: ILog) {
	}

	puBlic error(source: string, message: string): void {
		this._actual.error(source, message);
	}

	puBlic warn(source: string, message: string): void {
		this._actual.warn(source, message);
	}

	puBlic info(source: string, message: string): void {
		this._actual.info(source, message);
	}
}

class NullLogger implements ILog {
	puBlic error(source: string, message: string): void {
	}
	puBlic warn(source: string, message: string): void {
	}
	puBlic info(source: string, message: string): void {
	}
}
