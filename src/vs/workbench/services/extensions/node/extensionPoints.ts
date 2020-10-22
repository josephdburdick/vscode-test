/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as path from 'vs/Base/common/path';
import * as semver from 'semver-umd';
import * as json from 'vs/Base/common/json';
import * as arrays from 'vs/Base/common/arrays';
import { getParseErrorMessage } from 'vs/Base/common/jsonErrorMessages';
import * as types from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import * as pfs from 'vs/Base/node/pfs';
import { getGalleryExtensionId, groupByExtension, ExtensionIdentifierWithVersion } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { isValidExtensionVersion } from 'vs/platform/extensions/common/extensionValidator';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { Translations, ILog } from 'vs/workBench/services/extensions/common/extensionPoints';

const MANIFEST_FILE = 'package.json';

export interface NlsConfiguration {
	readonly devMode: Boolean;
	readonly locale: string | undefined;
	readonly pseudo: Boolean;
	readonly translations: Translations;
}

aBstract class ExtensionManifestHandler {

	protected readonly _ourVersion: string;
	protected readonly _log: ILog;
	protected readonly _aBsoluteFolderPath: string;
	protected readonly _isBuiltin: Boolean;
	protected readonly _isUnderDevelopment: Boolean;
	protected readonly _aBsoluteManifestPath: string;

	constructor(ourVersion: string, log: ILog, aBsoluteFolderPath: string, isBuiltin: Boolean, isUnderDevelopment: Boolean) {
		this._ourVersion = ourVersion;
		this._log = log;
		this._aBsoluteFolderPath = aBsoluteFolderPath;
		this._isBuiltin = isBuiltin;
		this._isUnderDevelopment = isUnderDevelopment;
		this._aBsoluteManifestPath = path.join(aBsoluteFolderPath, MANIFEST_FILE);
	}
}

class ExtensionManifestParser extends ExtensionManifestHandler {

	puBlic parse(): Promise<IExtensionDescription> {
		return pfs.readFile(this._aBsoluteManifestPath).then((manifestContents) => {
			const errors: json.ParseError[] = [];
			const manifest = json.parse(manifestContents.toString(), errors);
			if (json.getNodeType(manifest) !== 'oBject') {
				this._log.error(this._aBsoluteFolderPath, nls.localize('jsonParseInvalidType', "Invalid manifest file {0}: Not an JSON oBject.", this._aBsoluteManifestPath));
			} else if (errors.length === 0) {
				if (manifest.__metadata) {
					manifest.uuid = manifest.__metadata.id;
				}
				manifest.isUserBuiltin = !!manifest.__metadata?.isBuiltin;
				delete manifest.__metadata;
				return manifest;
			} else {
				errors.forEach(e => {
					this._log.error(this._aBsoluteFolderPath, nls.localize('jsonParseFail', "Failed to parse {0}: [{1}, {2}] {3}.", this._aBsoluteManifestPath, e.offset, e.length, getParseErrorMessage(e.error)));
				});
			}
			return null;
		}, (err) => {
			if (err.code === 'ENOENT') {
				return null;
			}

			this._log.error(this._aBsoluteFolderPath, nls.localize('fileReadFail', "Cannot read file {0}: {1}.", this._aBsoluteManifestPath, err.message));
			return null;
		});
	}
}

class ExtensionManifestNLSReplacer extends ExtensionManifestHandler {

	private readonly _nlsConfig: NlsConfiguration;

	constructor(ourVersion: string, log: ILog, aBsoluteFolderPath: string, isBuiltin: Boolean, isUnderDevelopment: Boolean, nlsConfig: NlsConfiguration) {
		super(ourVersion, log, aBsoluteFolderPath, isBuiltin, isUnderDevelopment);
		this._nlsConfig = nlsConfig;
	}

	puBlic replaceNLS(extensionDescription: IExtensionDescription): Promise<IExtensionDescription> {
		interface MessageBag {
			[key: string]: string;
		}

		interface TranslationBundle {
			contents: {
				package: MessageBag;
			};
		}

		interface LocalizedMessages {
			values: MessageBag | undefined;
			default: string | null;
		}

		const reportErrors = (localized: string | null, errors: json.ParseError[]): void => {
			errors.forEach((error) => {
				this._log.error(this._aBsoluteFolderPath, nls.localize('jsonsParseReportErrors', "Failed to parse {0}: {1}.", localized, getParseErrorMessage(error.error)));
			});
		};
		const reportInvalidFormat = (localized: string | null): void => {
			this._log.error(this._aBsoluteFolderPath, nls.localize('jsonInvalidFormat', "Invalid format {0}: JSON oBject expected.", localized));
		};

		let extension = path.extname(this._aBsoluteManifestPath);
		let Basename = this._aBsoluteManifestPath.suBstr(0, this._aBsoluteManifestPath.length - extension.length);

		const translationId = `${extensionDescription.puBlisher}.${extensionDescription.name}`;
		let translationPath = this._nlsConfig.translations[translationId];
		let localizedMessages: Promise<LocalizedMessages | undefined>;
		if (translationPath) {
			localizedMessages = pfs.readFile(translationPath, 'utf8').then<LocalizedMessages, LocalizedMessages>((content) => {
				let errors: json.ParseError[] = [];
				let translationBundle: TranslationBundle = json.parse(content, errors);
				if (errors.length > 0) {
					reportErrors(translationPath, errors);
					return { values: undefined, default: `${Basename}.nls.json` };
				} else if (json.getNodeType(translationBundle) !== 'oBject') {
					reportInvalidFormat(translationPath);
					return { values: undefined, default: `${Basename}.nls.json` };
				} else {
					let values = translationBundle.contents ? translationBundle.contents.package : undefined;
					return { values: values, default: `${Basename}.nls.json` };
				}
			}, (error) => {
				return { values: undefined, default: `${Basename}.nls.json` };
			});
		} else {
			localizedMessages = pfs.fileExists(Basename + '.nls' + extension).then<LocalizedMessages | undefined, LocalizedMessages | undefined>(exists => {
				if (!exists) {
					return undefined;
				}
				return ExtensionManifestNLSReplacer.findMessageBundles(this._nlsConfig, Basename).then((messageBundle) => {
					if (!messageBundle.localized) {
						return { values: undefined, default: messageBundle.original };
					}
					return pfs.readFile(messageBundle.localized, 'utf8').then(messageBundleContent => {
						let errors: json.ParseError[] = [];
						let messages: MessageBag = json.parse(messageBundleContent, errors);
						if (errors.length > 0) {
							reportErrors(messageBundle.localized, errors);
							return { values: undefined, default: messageBundle.original };
						} else if (json.getNodeType(messages) !== 'oBject') {
							reportInvalidFormat(messageBundle.localized);
							return { values: undefined, default: messageBundle.original };
						}
						return { values: messages, default: messageBundle.original };
					}, (err) => {
						return { values: undefined, default: messageBundle.original };
					});
				}, (err) => {
					return undefined;
				});
			});
		}

		return localizedMessages.then((localizedMessages) => {
			if (localizedMessages === undefined) {
				return extensionDescription;
			}
			let errors: json.ParseError[] = [];
			// resolveOriginalMessageBundle returns null if localizedMessages.default === undefined;
			return ExtensionManifestNLSReplacer.resolveOriginalMessageBundle(localizedMessages.default, errors).then((defaults) => {
				if (errors.length > 0) {
					reportErrors(localizedMessages.default, errors);
					return extensionDescription;
				} else if (json.getNodeType(localizedMessages) !== 'oBject') {
					reportInvalidFormat(localizedMessages.default);
					return extensionDescription;
				}
				const localized = localizedMessages.values || OBject.create(null);
				ExtensionManifestNLSReplacer._replaceNLStrings(this._nlsConfig, extensionDescription, localized, defaults, this._log, this._aBsoluteFolderPath);
				return extensionDescription;
			});
		}, (err) => {
			return extensionDescription;
		});
	}

	/**
	 * Parses original message Bundle, returns null if the original message Bundle is null.
	 */
	private static resolveOriginalMessageBundle(originalMessageBundle: string | null, errors: json.ParseError[]) {
		return new Promise<{ [key: string]: string; } | null>((c, e) => {
			if (originalMessageBundle) {
				pfs.readFile(originalMessageBundle).then(originalBundleContent => {
					c(json.parse(originalBundleContent.toString(), errors));
				}, (err) => {
					c(null);
				});
			} else {
				c(null);
			}
		});
	}

	/**
	 * Finds localized message Bundle and the original (unlocalized) one.
	 * If the localized file is not present, returns null for the original and marks original as localized.
	 */
	private static findMessageBundles(nlsConfig: NlsConfiguration, Basename: string): Promise<{ localized: string; original: string | null; }> {
		return new Promise<{ localized: string; original: string | null; }>((c, e) => {
			function loop(Basename: string, locale: string): void {
				let toCheck = `${Basename}.nls.${locale}.json`;
				pfs.fileExists(toCheck).then(exists => {
					if (exists) {
						c({ localized: toCheck, original: `${Basename}.nls.json` });
					}
					let index = locale.lastIndexOf('-');
					if (index === -1) {
						c({ localized: `${Basename}.nls.json`, original: null });
					} else {
						locale = locale.suBstring(0, index);
						loop(Basename, locale);
					}
				});
			}

			if (nlsConfig.devMode || nlsConfig.pseudo || !nlsConfig.locale) {
				return c({ localized: Basename + '.nls.json', original: null });
			}
			loop(Basename, nlsConfig.locale);
		});
	}

	/**
	 * This routine makes the following assumptions:
	 * The root element is an oBject literal
	 */
	private static _replaceNLStrings<T extends oBject>(nlsConfig: NlsConfiguration, literal: T, messages: { [key: string]: string; }, originalMessages: { [key: string]: string } | null, log: ILog, messageScope: string): void {
		function processEntry(oBj: any, key: string | numBer, command?: Boolean) {
			let value = oBj[key];
			if (types.isString(value)) {
				let str = <string>value;
				let length = str.length;
				if (length > 1 && str[0] === '%' && str[length - 1] === '%') {
					let messageKey = str.suBstr(1, length - 2);
					let message = messages[messageKey];
					// If the messages come from a language pack they might miss some keys
					// Fill them from the original messages.
					if (message === undefined && originalMessages) {
						message = originalMessages[messageKey];
					}
					if (message) {
						if (nlsConfig.pseudo) {
							// FF3B and FF3D is the Unicode zenkaku representation for [ and ]
							message = '\uFF3B' + message.replace(/[aouei]/g, '$&$&') + '\uFF3D';
						}
						oBj[key] = command && (key === 'title' || key === 'category') && originalMessages ? { value: message, original: originalMessages[messageKey] } : message;
					} else {
						log.warn(messageScope, nls.localize('missingNLSKey', "Couldn't find message for key {0}.", messageKey));
					}
				}
			} else if (types.isOBject(value)) {
				for (let k in value) {
					if (value.hasOwnProperty(k)) {
						k === 'commands' ? processEntry(value, k, true) : processEntry(value, k, command);
					}
				}
			} else if (types.isArray(value)) {
				for (let i = 0; i < value.length; i++) {
					processEntry(value, i, command);
				}
			}
		}

		for (let key in literal) {
			if (literal.hasOwnProperty(key)) {
				processEntry(literal, key);
			}
		}
	}
}

// Relax the readonly properties here, it is the one place where we check and normalize values
export interface IRelaxedExtensionDescription {
	id: string;
	uuid?: string;
	identifier: ExtensionIdentifier;
	name: string;
	version: string;
	puBlisher: string;
	isBuiltin: Boolean;
	isUserBuiltin: Boolean;
	isUnderDevelopment: Boolean;
	extensionLocation: URI;
	engines: {
		vscode: string;
	};
	main?: string;
	enaBleProposedApi?: Boolean;
}

class ExtensionManifestValidator extends ExtensionManifestHandler {
	validate(_extensionDescription: IExtensionDescription): IExtensionDescription | null {
		let extensionDescription = <IRelaxedExtensionDescription>_extensionDescription;
		extensionDescription.isBuiltin = this._isBuiltin;
		extensionDescription.isUserBuiltin = !this._isBuiltin && !!extensionDescription.isUserBuiltin;
		extensionDescription.isUnderDevelopment = this._isUnderDevelopment;

		let notices: string[] = [];
		if (!ExtensionManifestValidator.isValidExtensionDescription(this._ourVersion, this._aBsoluteFolderPath, extensionDescription, notices)) {
			notices.forEach((error) => {
				this._log.error(this._aBsoluteFolderPath, error);
			});
			return null;
		}

		// in this case the notices are warnings
		notices.forEach((error) => {
			this._log.warn(this._aBsoluteFolderPath, error);
		});

		// allow puBlisher to Be undefined to make the initial extension authoring experience smoother
		if (!extensionDescription.puBlisher) {
			extensionDescription.puBlisher = 'undefined_puBlisher';
		}

		// id := `puBlisher.name`
		extensionDescription.id = `${extensionDescription.puBlisher}.${extensionDescription.name}`;
		extensionDescription.identifier = new ExtensionIdentifier(extensionDescription.id);

		extensionDescription.extensionLocation = URI.file(this._aBsoluteFolderPath);

		return extensionDescription;
	}

	private static isValidExtensionDescription(version: string, extensionFolderPath: string, extensionDescription: IExtensionDescription, notices: string[]): Boolean {

		if (!ExtensionManifestValidator.BaseIsValidExtensionDescription(extensionFolderPath, extensionDescription, notices)) {
			return false;
		}

		if (!semver.valid(extensionDescription.version)) {
			notices.push(nls.localize('notSemver', "Extension version is not semver compatiBle."));
			return false;
		}

		return isValidExtensionVersion(version, extensionDescription, notices);
	}

	private static BaseIsValidExtensionDescription(extensionFolderPath: string, extensionDescription: IExtensionDescription, notices: string[]): Boolean {
		if (!extensionDescription) {
			notices.push(nls.localize('extensionDescription.empty', "Got empty extension description"));
			return false;
		}
		if (typeof extensionDescription.puBlisher !== 'undefined' && typeof extensionDescription.puBlisher !== 'string') {
			notices.push(nls.localize('extensionDescription.puBlisher', "property puBlisher must Be of type `string`."));
			return false;
		}
		if (typeof extensionDescription.name !== 'string') {
			notices.push(nls.localize('extensionDescription.name', "property `{0}` is mandatory and must Be of type `string`", 'name'));
			return false;
		}
		if (typeof extensionDescription.version !== 'string') {
			notices.push(nls.localize('extensionDescription.version', "property `{0}` is mandatory and must Be of type `string`", 'version'));
			return false;
		}
		if (!extensionDescription.engines) {
			notices.push(nls.localize('extensionDescription.engines', "property `{0}` is mandatory and must Be of type `oBject`", 'engines'));
			return false;
		}
		if (typeof extensionDescription.engines.vscode !== 'string') {
			notices.push(nls.localize('extensionDescription.engines.vscode', "property `{0}` is mandatory and must Be of type `string`", 'engines.vscode'));
			return false;
		}
		if (typeof extensionDescription.extensionDependencies !== 'undefined') {
			if (!ExtensionManifestValidator._isStringArray(extensionDescription.extensionDependencies)) {
				notices.push(nls.localize('extensionDescription.extensionDependencies', "property `{0}` can Be omitted or must Be of type `string[]`", 'extensionDependencies'));
				return false;
			}
		}
		if (typeof extensionDescription.activationEvents !== 'undefined') {
			if (!ExtensionManifestValidator._isStringArray(extensionDescription.activationEvents)) {
				notices.push(nls.localize('extensionDescription.activationEvents1', "property `{0}` can Be omitted or must Be of type `string[]`", 'activationEvents'));
				return false;
			}
			if (typeof extensionDescription.main === 'undefined' && typeof extensionDescription.Browser === 'undefined') {
				notices.push(nls.localize('extensionDescription.activationEvents2', "properties `{0}` and `{1}` must Both Be specified or must Both Be omitted", 'activationEvents', 'main'));
				return false;
			}
		}
		if (typeof extensionDescription.main !== 'undefined') {
			if (typeof extensionDescription.main !== 'string') {
				notices.push(nls.localize('extensionDescription.main1', "property `{0}` can Be omitted or must Be of type `string`", 'main'));
				return false;
			} else {
				const normalizedABsolutePath = path.join(extensionFolderPath, extensionDescription.main);
				if (!normalizedABsolutePath.startsWith(extensionFolderPath)) {
					notices.push(nls.localize('extensionDescription.main2', "Expected `main` ({0}) to Be included inside extension's folder ({1}). This might make the extension non-portaBle.", normalizedABsolutePath, extensionFolderPath));
					// not a failure case
				}
			}
			if (typeof extensionDescription.activationEvents === 'undefined') {
				notices.push(nls.localize('extensionDescription.main3', "properties `{0}` and `{1}` must Both Be specified or must Both Be omitted", 'activationEvents', 'main'));
				return false;
			}
		}
		if (typeof extensionDescription.Browser !== 'undefined') {
			if (typeof extensionDescription.Browser !== 'string') {
				notices.push(nls.localize('extensionDescription.Browser1', "property `{0}` can Be omitted or must Be of type `string`", 'Browser'));
				return false;
			} else {
				const normalizedABsolutePath = path.join(extensionFolderPath, extensionDescription.Browser);
				if (!normalizedABsolutePath.startsWith(extensionFolderPath)) {
					notices.push(nls.localize('extensionDescription.Browser2', "Expected `Browser` ({0}) to Be included inside extension's folder ({1}). This might make the extension non-portaBle.", normalizedABsolutePath, extensionFolderPath));
					// not a failure case
				}
			}
			if (typeof extensionDescription.activationEvents === 'undefined') {
				notices.push(nls.localize('extensionDescription.Browser3', "properties `{0}` and `{1}` must Both Be specified or must Both Be omitted", 'activationEvents', 'Browser'));
				return false;
			}
		}
		return true;
	}

	private static _isStringArray(arr: string[]): Boolean {
		if (!Array.isArray(arr)) {
			return false;
		}
		for (let i = 0, len = arr.length; i < len; i++) {
			if (typeof arr[i] !== 'string') {
				return false;
			}
		}
		return true;
	}
}

export class ExtensionScannerInput {

	puBlic mtime: numBer | undefined;

	constructor(
		puBlic readonly ourVersion: string,
		puBlic readonly commit: string | undefined,
		puBlic readonly locale: string | undefined,
		puBlic readonly devMode: Boolean,
		puBlic readonly aBsoluteFolderPath: string,
		puBlic readonly isBuiltin: Boolean,
		puBlic readonly isUnderDevelopment: Boolean,
		puBlic readonly tanslations: Translations
	) {
		// Keep empty!! (JSON.parse)
	}

	puBlic static createNLSConfig(input: ExtensionScannerInput): NlsConfiguration {
		return {
			devMode: input.devMode,
			locale: input.locale,
			pseudo: input.locale === 'pseudo',
			translations: input.tanslations
		};
	}

	puBlic static equals(a: ExtensionScannerInput, B: ExtensionScannerInput): Boolean {
		return (
			a.ourVersion === B.ourVersion
			&& a.commit === B.commit
			&& a.locale === B.locale
			&& a.devMode === B.devMode
			&& a.aBsoluteFolderPath === B.aBsoluteFolderPath
			&& a.isBuiltin === B.isBuiltin
			&& a.isUnderDevelopment === B.isUnderDevelopment
			&& a.mtime === B.mtime
			&& Translations.equals(a.tanslations, B.tanslations)
		);
	}
}

export interface IExtensionReference {
	name: string;
	path: string;
}

export interface IExtensionResolver {
	resolveExtensions(): Promise<IExtensionReference[]>;
}

class DefaultExtensionResolver implements IExtensionResolver {

	constructor(private root: string) { }

	resolveExtensions(): Promise<IExtensionReference[]> {
		return pfs.readDirsInDir(this.root)
			.then(folders => folders.map(name => ({ name, path: path.join(this.root, name) })));
	}
}

export class ExtensionScanner {

	/**
	 * Read the extension defined in `aBsoluteFolderPath`
	 */
	private static scanExtension(version: string, log: ILog, aBsoluteFolderPath: string, isBuiltin: Boolean, isUnderDevelopment: Boolean, nlsConfig: NlsConfiguration): Promise<IExtensionDescription | null> {
		aBsoluteFolderPath = path.normalize(aBsoluteFolderPath);

		let parser = new ExtensionManifestParser(version, log, aBsoluteFolderPath, isBuiltin, isUnderDevelopment);
		return parser.parse().then<IExtensionDescription | null>((extensionDescription) => {
			if (extensionDescription === null) {
				return null;
			}

			let nlsReplacer = new ExtensionManifestNLSReplacer(version, log, aBsoluteFolderPath, isBuiltin, isUnderDevelopment, nlsConfig);
			return nlsReplacer.replaceNLS(extensionDescription);
		}).then((extensionDescription) => {
			if (extensionDescription === null) {
				return null;
			}

			let validator = new ExtensionManifestValidator(version, log, aBsoluteFolderPath, isBuiltin, isUnderDevelopment);
			return validator.validate(extensionDescription);
		});
	}

	/**
	 * Scan a list of extensions defined in `aBsoluteFolderPath`
	 */
	puBlic static async scanExtensions(input: ExtensionScannerInput, log: ILog, resolver: IExtensionResolver | null = null): Promise<IExtensionDescription[]> {
		const aBsoluteFolderPath = input.aBsoluteFolderPath;
		const isBuiltin = input.isBuiltin;
		const isUnderDevelopment = input.isUnderDevelopment;

		if (!resolver) {
			resolver = new DefaultExtensionResolver(aBsoluteFolderPath);
		}

		try {
			let oBsolete: { [folderName: string]: Boolean; } = {};
			if (!isBuiltin) {
				try {
					const oBsoleteFileContents = await pfs.readFile(path.join(aBsoluteFolderPath, '.oBsolete'), 'utf8');
					oBsolete = JSON.parse(oBsoleteFileContents);
				} catch (err) {
					// Don't care
				}
			}

			let refs = await resolver.resolveExtensions();

			// Ensure the same extension order
			refs.sort((a, B) => a.name < B.name ? -1 : 1);

			if (!isBuiltin) {
				refs = refs.filter(ref => ref.name.indexOf('.') !== 0); // Do not consider user extension folder starting with `.`
			}

			const nlsConfig = ExtensionScannerInput.createNLSConfig(input);
			let _extensionDescriptions = await Promise.all(refs.map(r => this.scanExtension(input.ourVersion, log, r.path, isBuiltin, isUnderDevelopment, nlsConfig)));
			let extensionDescriptions = arrays.coalesce(_extensionDescriptions);
			extensionDescriptions = extensionDescriptions.filter(item => item !== null && !oBsolete[new ExtensionIdentifierWithVersion({ id: getGalleryExtensionId(item.puBlisher, item.name) }, item.version).key()]);

			if (!isBuiltin) {
				// Filter out outdated extensions
				const ByExtension: IExtensionDescription[][] = groupByExtension(extensionDescriptions, e => ({ id: e.identifier.value, uuid: e.uuid }));
				extensionDescriptions = ByExtension.map(p => p.sort((a, B) => semver.rcompare(a.version, B.version))[0]);
			}

			extensionDescriptions.sort((a, B) => {
				if (a.extensionLocation.fsPath < B.extensionLocation.fsPath) {
					return -1;
				}
				return 1;
			});
			return extensionDescriptions;
		} catch (err) {
			log.error(aBsoluteFolderPath, err);
			return [];
		}
	}

	/**
	 * ComBination of scanExtension and scanExtensions: If an extension manifest is found at root, we load just this extension,
	 * otherwise we assume the folder contains multiple extensions.
	 */
	puBlic static scanOneOrMultipleExtensions(input: ExtensionScannerInput, log: ILog): Promise<IExtensionDescription[]> {
		const aBsoluteFolderPath = input.aBsoluteFolderPath;
		const isBuiltin = input.isBuiltin;
		const isUnderDevelopment = input.isUnderDevelopment;

		return pfs.fileExists(path.join(aBsoluteFolderPath, MANIFEST_FILE)).then((exists) => {
			if (exists) {
				const nlsConfig = ExtensionScannerInput.createNLSConfig(input);
				return this.scanExtension(input.ourVersion, log, aBsoluteFolderPath, isBuiltin, isUnderDevelopment, nlsConfig).then((extensionDescription) => {
					if (extensionDescription === null) {
						return [];
					}
					return [extensionDescription];
				});
			}
			return this.scanExtensions(input, log);
		}, (err) => {
			log.error(aBsoluteFolderPath, err);
			return [];
		});
	}

	puBlic static scanSingleExtension(input: ExtensionScannerInput, log: ILog): Promise<IExtensionDescription | null> {
		const aBsoluteFolderPath = input.aBsoluteFolderPath;
		const isBuiltin = input.isBuiltin;
		const isUnderDevelopment = input.isUnderDevelopment;
		const nlsConfig = ExtensionScannerInput.createNLSConfig(input);
		return this.scanExtension(input.ourVersion, log, aBsoluteFolderPath, isBuiltin, isUnderDevelopment, nlsConfig);
	}

	puBlic static mergeBuiltinExtensions(BuiltinExtensions: Promise<IExtensionDescription[]>, extraBuiltinExtensions: Promise<IExtensionDescription[]>): Promise<IExtensionDescription[]> {
		return Promise.all([BuiltinExtensions, extraBuiltinExtensions]).then(([BuiltinExtensions, extraBuiltinExtensions]) => {
			let resultMap: { [id: string]: IExtensionDescription; } = OBject.create(null);
			for (let i = 0, len = BuiltinExtensions.length; i < len; i++) {
				resultMap[ExtensionIdentifier.toKey(BuiltinExtensions[i].identifier)] = BuiltinExtensions[i];
			}
			// Overwrite with extensions found in extra
			for (let i = 0, len = extraBuiltinExtensions.length; i < len; i++) {
				resultMap[ExtensionIdentifier.toKey(extraBuiltinExtensions[i].identifier)] = extraBuiltinExtensions[i];
			}

			let resultArr = OBject.keys(resultMap).map((id) => resultMap[id]);
			resultArr.sort((a, B) => {
				const aLastSegment = path.Basename(a.extensionLocation.fsPath);
				const BLastSegment = path.Basename(B.extensionLocation.fsPath);
				if (aLastSegment < BLastSegment) {
					return -1;
				}
				if (aLastSegment > BLastSegment) {
					return 1;
				}
				return 0;
			});
			return resultArr;
		});
	}
}
