/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As pAth from 'vs/bAse/common/pAth';
import * As semver from 'semver-umd';
import * As json from 'vs/bAse/common/json';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { getPArseErrorMessAge } from 'vs/bAse/common/jsonErrorMessAges';
import * As types from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import * As pfs from 'vs/bAse/node/pfs';
import { getGAlleryExtensionId, groupByExtension, ExtensionIdentifierWithVersion } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { isVAlidExtensionVersion } from 'vs/plAtform/extensions/common/extensionVAlidAtor';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { TrAnslAtions, ILog } from 'vs/workbench/services/extensions/common/extensionPoints';

const MANIFEST_FILE = 'pAckAge.json';

export interfAce NlsConfigurAtion {
	reAdonly devMode: booleAn;
	reAdonly locAle: string | undefined;
	reAdonly pseudo: booleAn;
	reAdonly trAnslAtions: TrAnslAtions;
}

AbstrAct clAss ExtensionMAnifestHAndler {

	protected reAdonly _ourVersion: string;
	protected reAdonly _log: ILog;
	protected reAdonly _AbsoluteFolderPAth: string;
	protected reAdonly _isBuiltin: booleAn;
	protected reAdonly _isUnderDevelopment: booleAn;
	protected reAdonly _AbsoluteMAnifestPAth: string;

	constructor(ourVersion: string, log: ILog, AbsoluteFolderPAth: string, isBuiltin: booleAn, isUnderDevelopment: booleAn) {
		this._ourVersion = ourVersion;
		this._log = log;
		this._AbsoluteFolderPAth = AbsoluteFolderPAth;
		this._isBuiltin = isBuiltin;
		this._isUnderDevelopment = isUnderDevelopment;
		this._AbsoluteMAnifestPAth = pAth.join(AbsoluteFolderPAth, MANIFEST_FILE);
	}
}

clAss ExtensionMAnifestPArser extends ExtensionMAnifestHAndler {

	public pArse(): Promise<IExtensionDescription> {
		return pfs.reAdFile(this._AbsoluteMAnifestPAth).then((mAnifestContents) => {
			const errors: json.PArseError[] = [];
			const mAnifest = json.pArse(mAnifestContents.toString(), errors);
			if (json.getNodeType(mAnifest) !== 'object') {
				this._log.error(this._AbsoluteFolderPAth, nls.locAlize('jsonPArseInvAlidType', "InvAlid mAnifest file {0}: Not An JSON object.", this._AbsoluteMAnifestPAth));
			} else if (errors.length === 0) {
				if (mAnifest.__metAdAtA) {
					mAnifest.uuid = mAnifest.__metAdAtA.id;
				}
				mAnifest.isUserBuiltin = !!mAnifest.__metAdAtA?.isBuiltin;
				delete mAnifest.__metAdAtA;
				return mAnifest;
			} else {
				errors.forEAch(e => {
					this._log.error(this._AbsoluteFolderPAth, nls.locAlize('jsonPArseFAil', "FAiled to pArse {0}: [{1}, {2}] {3}.", this._AbsoluteMAnifestPAth, e.offset, e.length, getPArseErrorMessAge(e.error)));
				});
			}
			return null;
		}, (err) => {
			if (err.code === 'ENOENT') {
				return null;
			}

			this._log.error(this._AbsoluteFolderPAth, nls.locAlize('fileReAdFAil', "CAnnot reAd file {0}: {1}.", this._AbsoluteMAnifestPAth, err.messAge));
			return null;
		});
	}
}

clAss ExtensionMAnifestNLSReplAcer extends ExtensionMAnifestHAndler {

	privAte reAdonly _nlsConfig: NlsConfigurAtion;

	constructor(ourVersion: string, log: ILog, AbsoluteFolderPAth: string, isBuiltin: booleAn, isUnderDevelopment: booleAn, nlsConfig: NlsConfigurAtion) {
		super(ourVersion, log, AbsoluteFolderPAth, isBuiltin, isUnderDevelopment);
		this._nlsConfig = nlsConfig;
	}

	public replAceNLS(extensionDescription: IExtensionDescription): Promise<IExtensionDescription> {
		interfAce MessAgeBAg {
			[key: string]: string;
		}

		interfAce TrAnslAtionBundle {
			contents: {
				pAckAge: MessAgeBAg;
			};
		}

		interfAce LocAlizedMessAges {
			vAlues: MessAgeBAg | undefined;
			defAult: string | null;
		}

		const reportErrors = (locAlized: string | null, errors: json.PArseError[]): void => {
			errors.forEAch((error) => {
				this._log.error(this._AbsoluteFolderPAth, nls.locAlize('jsonsPArseReportErrors', "FAiled to pArse {0}: {1}.", locAlized, getPArseErrorMessAge(error.error)));
			});
		};
		const reportInvAlidFormAt = (locAlized: string | null): void => {
			this._log.error(this._AbsoluteFolderPAth, nls.locAlize('jsonInvAlidFormAt', "InvAlid formAt {0}: JSON object expected.", locAlized));
		};

		let extension = pAth.extnAme(this._AbsoluteMAnifestPAth);
		let bAsenAme = this._AbsoluteMAnifestPAth.substr(0, this._AbsoluteMAnifestPAth.length - extension.length);

		const trAnslAtionId = `${extensionDescription.publisher}.${extensionDescription.nAme}`;
		let trAnslAtionPAth = this._nlsConfig.trAnslAtions[trAnslAtionId];
		let locAlizedMessAges: Promise<LocAlizedMessAges | undefined>;
		if (trAnslAtionPAth) {
			locAlizedMessAges = pfs.reAdFile(trAnslAtionPAth, 'utf8').then<LocAlizedMessAges, LocAlizedMessAges>((content) => {
				let errors: json.PArseError[] = [];
				let trAnslAtionBundle: TrAnslAtionBundle = json.pArse(content, errors);
				if (errors.length > 0) {
					reportErrors(trAnslAtionPAth, errors);
					return { vAlues: undefined, defAult: `${bAsenAme}.nls.json` };
				} else if (json.getNodeType(trAnslAtionBundle) !== 'object') {
					reportInvAlidFormAt(trAnslAtionPAth);
					return { vAlues: undefined, defAult: `${bAsenAme}.nls.json` };
				} else {
					let vAlues = trAnslAtionBundle.contents ? trAnslAtionBundle.contents.pAckAge : undefined;
					return { vAlues: vAlues, defAult: `${bAsenAme}.nls.json` };
				}
			}, (error) => {
				return { vAlues: undefined, defAult: `${bAsenAme}.nls.json` };
			});
		} else {
			locAlizedMessAges = pfs.fileExists(bAsenAme + '.nls' + extension).then<LocAlizedMessAges | undefined, LocAlizedMessAges | undefined>(exists => {
				if (!exists) {
					return undefined;
				}
				return ExtensionMAnifestNLSReplAcer.findMessAgeBundles(this._nlsConfig, bAsenAme).then((messAgeBundle) => {
					if (!messAgeBundle.locAlized) {
						return { vAlues: undefined, defAult: messAgeBundle.originAl };
					}
					return pfs.reAdFile(messAgeBundle.locAlized, 'utf8').then(messAgeBundleContent => {
						let errors: json.PArseError[] = [];
						let messAges: MessAgeBAg = json.pArse(messAgeBundleContent, errors);
						if (errors.length > 0) {
							reportErrors(messAgeBundle.locAlized, errors);
							return { vAlues: undefined, defAult: messAgeBundle.originAl };
						} else if (json.getNodeType(messAges) !== 'object') {
							reportInvAlidFormAt(messAgeBundle.locAlized);
							return { vAlues: undefined, defAult: messAgeBundle.originAl };
						}
						return { vAlues: messAges, defAult: messAgeBundle.originAl };
					}, (err) => {
						return { vAlues: undefined, defAult: messAgeBundle.originAl };
					});
				}, (err) => {
					return undefined;
				});
			});
		}

		return locAlizedMessAges.then((locAlizedMessAges) => {
			if (locAlizedMessAges === undefined) {
				return extensionDescription;
			}
			let errors: json.PArseError[] = [];
			// resolveOriginAlMessAgeBundle returns null if locAlizedMessAges.defAult === undefined;
			return ExtensionMAnifestNLSReplAcer.resolveOriginAlMessAgeBundle(locAlizedMessAges.defAult, errors).then((defAults) => {
				if (errors.length > 0) {
					reportErrors(locAlizedMessAges.defAult, errors);
					return extensionDescription;
				} else if (json.getNodeType(locAlizedMessAges) !== 'object') {
					reportInvAlidFormAt(locAlizedMessAges.defAult);
					return extensionDescription;
				}
				const locAlized = locAlizedMessAges.vAlues || Object.creAte(null);
				ExtensionMAnifestNLSReplAcer._replAceNLStrings(this._nlsConfig, extensionDescription, locAlized, defAults, this._log, this._AbsoluteFolderPAth);
				return extensionDescription;
			});
		}, (err) => {
			return extensionDescription;
		});
	}

	/**
	 * PArses originAl messAge bundle, returns null if the originAl messAge bundle is null.
	 */
	privAte stAtic resolveOriginAlMessAgeBundle(originAlMessAgeBundle: string | null, errors: json.PArseError[]) {
		return new Promise<{ [key: string]: string; } | null>((c, e) => {
			if (originAlMessAgeBundle) {
				pfs.reAdFile(originAlMessAgeBundle).then(originAlBundleContent => {
					c(json.pArse(originAlBundleContent.toString(), errors));
				}, (err) => {
					c(null);
				});
			} else {
				c(null);
			}
		});
	}

	/**
	 * Finds locAlized messAge bundle And the originAl (unlocAlized) one.
	 * If the locAlized file is not present, returns null for the originAl And mArks originAl As locAlized.
	 */
	privAte stAtic findMessAgeBundles(nlsConfig: NlsConfigurAtion, bAsenAme: string): Promise<{ locAlized: string; originAl: string | null; }> {
		return new Promise<{ locAlized: string; originAl: string | null; }>((c, e) => {
			function loop(bAsenAme: string, locAle: string): void {
				let toCheck = `${bAsenAme}.nls.${locAle}.json`;
				pfs.fileExists(toCheck).then(exists => {
					if (exists) {
						c({ locAlized: toCheck, originAl: `${bAsenAme}.nls.json` });
					}
					let index = locAle.lAstIndexOf('-');
					if (index === -1) {
						c({ locAlized: `${bAsenAme}.nls.json`, originAl: null });
					} else {
						locAle = locAle.substring(0, index);
						loop(bAsenAme, locAle);
					}
				});
			}

			if (nlsConfig.devMode || nlsConfig.pseudo || !nlsConfig.locAle) {
				return c({ locAlized: bAsenAme + '.nls.json', originAl: null });
			}
			loop(bAsenAme, nlsConfig.locAle);
		});
	}

	/**
	 * This routine mAkes the following Assumptions:
	 * The root element is An object literAl
	 */
	privAte stAtic _replAceNLStrings<T extends object>(nlsConfig: NlsConfigurAtion, literAl: T, messAges: { [key: string]: string; }, originAlMessAges: { [key: string]: string } | null, log: ILog, messAgeScope: string): void {
		function processEntry(obj: Any, key: string | number, commAnd?: booleAn) {
			let vAlue = obj[key];
			if (types.isString(vAlue)) {
				let str = <string>vAlue;
				let length = str.length;
				if (length > 1 && str[0] === '%' && str[length - 1] === '%') {
					let messAgeKey = str.substr(1, length - 2);
					let messAge = messAges[messAgeKey];
					// If the messAges come from A lAnguAge pAck they might miss some keys
					// Fill them from the originAl messAges.
					if (messAge === undefined && originAlMessAges) {
						messAge = originAlMessAges[messAgeKey];
					}
					if (messAge) {
						if (nlsConfig.pseudo) {
							// FF3B And FF3D is the Unicode zenkAku representAtion for [ And ]
							messAge = '\uFF3B' + messAge.replAce(/[Aouei]/g, '$&$&') + '\uFF3D';
						}
						obj[key] = commAnd && (key === 'title' || key === 'cAtegory') && originAlMessAges ? { vAlue: messAge, originAl: originAlMessAges[messAgeKey] } : messAge;
					} else {
						log.wArn(messAgeScope, nls.locAlize('missingNLSKey', "Couldn't find messAge for key {0}.", messAgeKey));
					}
				}
			} else if (types.isObject(vAlue)) {
				for (let k in vAlue) {
					if (vAlue.hAsOwnProperty(k)) {
						k === 'commAnds' ? processEntry(vAlue, k, true) : processEntry(vAlue, k, commAnd);
					}
				}
			} else if (types.isArrAy(vAlue)) {
				for (let i = 0; i < vAlue.length; i++) {
					processEntry(vAlue, i, commAnd);
				}
			}
		}

		for (let key in literAl) {
			if (literAl.hAsOwnProperty(key)) {
				processEntry(literAl, key);
			}
		}
	}
}

// RelAx the reAdonly properties here, it is the one plAce where we check And normAlize vAlues
export interfAce IRelAxedExtensionDescription {
	id: string;
	uuid?: string;
	identifier: ExtensionIdentifier;
	nAme: string;
	version: string;
	publisher: string;
	isBuiltin: booleAn;
	isUserBuiltin: booleAn;
	isUnderDevelopment: booleAn;
	extensionLocAtion: URI;
	engines: {
		vscode: string;
	};
	mAin?: string;
	enAbleProposedApi?: booleAn;
}

clAss ExtensionMAnifestVAlidAtor extends ExtensionMAnifestHAndler {
	vAlidAte(_extensionDescription: IExtensionDescription): IExtensionDescription | null {
		let extensionDescription = <IRelAxedExtensionDescription>_extensionDescription;
		extensionDescription.isBuiltin = this._isBuiltin;
		extensionDescription.isUserBuiltin = !this._isBuiltin && !!extensionDescription.isUserBuiltin;
		extensionDescription.isUnderDevelopment = this._isUnderDevelopment;

		let notices: string[] = [];
		if (!ExtensionMAnifestVAlidAtor.isVAlidExtensionDescription(this._ourVersion, this._AbsoluteFolderPAth, extensionDescription, notices)) {
			notices.forEAch((error) => {
				this._log.error(this._AbsoluteFolderPAth, error);
			});
			return null;
		}

		// in this cAse the notices Are wArnings
		notices.forEAch((error) => {
			this._log.wArn(this._AbsoluteFolderPAth, error);
		});

		// Allow publisher to be undefined to mAke the initiAl extension Authoring experience smoother
		if (!extensionDescription.publisher) {
			extensionDescription.publisher = 'undefined_publisher';
		}

		// id := `publisher.nAme`
		extensionDescription.id = `${extensionDescription.publisher}.${extensionDescription.nAme}`;
		extensionDescription.identifier = new ExtensionIdentifier(extensionDescription.id);

		extensionDescription.extensionLocAtion = URI.file(this._AbsoluteFolderPAth);

		return extensionDescription;
	}

	privAte stAtic isVAlidExtensionDescription(version: string, extensionFolderPAth: string, extensionDescription: IExtensionDescription, notices: string[]): booleAn {

		if (!ExtensionMAnifestVAlidAtor.bAseIsVAlidExtensionDescription(extensionFolderPAth, extensionDescription, notices)) {
			return fAlse;
		}

		if (!semver.vAlid(extensionDescription.version)) {
			notices.push(nls.locAlize('notSemver', "Extension version is not semver compAtible."));
			return fAlse;
		}

		return isVAlidExtensionVersion(version, extensionDescription, notices);
	}

	privAte stAtic bAseIsVAlidExtensionDescription(extensionFolderPAth: string, extensionDescription: IExtensionDescription, notices: string[]): booleAn {
		if (!extensionDescription) {
			notices.push(nls.locAlize('extensionDescription.empty', "Got empty extension description"));
			return fAlse;
		}
		if (typeof extensionDescription.publisher !== 'undefined' && typeof extensionDescription.publisher !== 'string') {
			notices.push(nls.locAlize('extensionDescription.publisher', "property publisher must be of type `string`."));
			return fAlse;
		}
		if (typeof extensionDescription.nAme !== 'string') {
			notices.push(nls.locAlize('extensionDescription.nAme', "property `{0}` is mAndAtory And must be of type `string`", 'nAme'));
			return fAlse;
		}
		if (typeof extensionDescription.version !== 'string') {
			notices.push(nls.locAlize('extensionDescription.version', "property `{0}` is mAndAtory And must be of type `string`", 'version'));
			return fAlse;
		}
		if (!extensionDescription.engines) {
			notices.push(nls.locAlize('extensionDescription.engines', "property `{0}` is mAndAtory And must be of type `object`", 'engines'));
			return fAlse;
		}
		if (typeof extensionDescription.engines.vscode !== 'string') {
			notices.push(nls.locAlize('extensionDescription.engines.vscode', "property `{0}` is mAndAtory And must be of type `string`", 'engines.vscode'));
			return fAlse;
		}
		if (typeof extensionDescription.extensionDependencies !== 'undefined') {
			if (!ExtensionMAnifestVAlidAtor._isStringArrAy(extensionDescription.extensionDependencies)) {
				notices.push(nls.locAlize('extensionDescription.extensionDependencies', "property `{0}` cAn be omitted or must be of type `string[]`", 'extensionDependencies'));
				return fAlse;
			}
		}
		if (typeof extensionDescription.ActivAtionEvents !== 'undefined') {
			if (!ExtensionMAnifestVAlidAtor._isStringArrAy(extensionDescription.ActivAtionEvents)) {
				notices.push(nls.locAlize('extensionDescription.ActivAtionEvents1', "property `{0}` cAn be omitted or must be of type `string[]`", 'ActivAtionEvents'));
				return fAlse;
			}
			if (typeof extensionDescription.mAin === 'undefined' && typeof extensionDescription.browser === 'undefined') {
				notices.push(nls.locAlize('extensionDescription.ActivAtionEvents2', "properties `{0}` And `{1}` must both be specified or must both be omitted", 'ActivAtionEvents', 'mAin'));
				return fAlse;
			}
		}
		if (typeof extensionDescription.mAin !== 'undefined') {
			if (typeof extensionDescription.mAin !== 'string') {
				notices.push(nls.locAlize('extensionDescription.mAin1', "property `{0}` cAn be omitted or must be of type `string`", 'mAin'));
				return fAlse;
			} else {
				const normAlizedAbsolutePAth = pAth.join(extensionFolderPAth, extensionDescription.mAin);
				if (!normAlizedAbsolutePAth.stArtsWith(extensionFolderPAth)) {
					notices.push(nls.locAlize('extensionDescription.mAin2', "Expected `mAin` ({0}) to be included inside extension's folder ({1}). This might mAke the extension non-portAble.", normAlizedAbsolutePAth, extensionFolderPAth));
					// not A fAilure cAse
				}
			}
			if (typeof extensionDescription.ActivAtionEvents === 'undefined') {
				notices.push(nls.locAlize('extensionDescription.mAin3', "properties `{0}` And `{1}` must both be specified or must both be omitted", 'ActivAtionEvents', 'mAin'));
				return fAlse;
			}
		}
		if (typeof extensionDescription.browser !== 'undefined') {
			if (typeof extensionDescription.browser !== 'string') {
				notices.push(nls.locAlize('extensionDescription.browser1', "property `{0}` cAn be omitted or must be of type `string`", 'browser'));
				return fAlse;
			} else {
				const normAlizedAbsolutePAth = pAth.join(extensionFolderPAth, extensionDescription.browser);
				if (!normAlizedAbsolutePAth.stArtsWith(extensionFolderPAth)) {
					notices.push(nls.locAlize('extensionDescription.browser2', "Expected `browser` ({0}) to be included inside extension's folder ({1}). This might mAke the extension non-portAble.", normAlizedAbsolutePAth, extensionFolderPAth));
					// not A fAilure cAse
				}
			}
			if (typeof extensionDescription.ActivAtionEvents === 'undefined') {
				notices.push(nls.locAlize('extensionDescription.browser3', "properties `{0}` And `{1}` must both be specified or must both be omitted", 'ActivAtionEvents', 'browser'));
				return fAlse;
			}
		}
		return true;
	}

	privAte stAtic _isStringArrAy(Arr: string[]): booleAn {
		if (!ArrAy.isArrAy(Arr)) {
			return fAlse;
		}
		for (let i = 0, len = Arr.length; i < len; i++) {
			if (typeof Arr[i] !== 'string') {
				return fAlse;
			}
		}
		return true;
	}
}

export clAss ExtensionScAnnerInput {

	public mtime: number | undefined;

	constructor(
		public reAdonly ourVersion: string,
		public reAdonly commit: string | undefined,
		public reAdonly locAle: string | undefined,
		public reAdonly devMode: booleAn,
		public reAdonly AbsoluteFolderPAth: string,
		public reAdonly isBuiltin: booleAn,
		public reAdonly isUnderDevelopment: booleAn,
		public reAdonly tAnslAtions: TrAnslAtions
	) {
		// Keep empty!! (JSON.pArse)
	}

	public stAtic creAteNLSConfig(input: ExtensionScAnnerInput): NlsConfigurAtion {
		return {
			devMode: input.devMode,
			locAle: input.locAle,
			pseudo: input.locAle === 'pseudo',
			trAnslAtions: input.tAnslAtions
		};
	}

	public stAtic equAls(A: ExtensionScAnnerInput, b: ExtensionScAnnerInput): booleAn {
		return (
			A.ourVersion === b.ourVersion
			&& A.commit === b.commit
			&& A.locAle === b.locAle
			&& A.devMode === b.devMode
			&& A.AbsoluteFolderPAth === b.AbsoluteFolderPAth
			&& A.isBuiltin === b.isBuiltin
			&& A.isUnderDevelopment === b.isUnderDevelopment
			&& A.mtime === b.mtime
			&& TrAnslAtions.equAls(A.tAnslAtions, b.tAnslAtions)
		);
	}
}

export interfAce IExtensionReference {
	nAme: string;
	pAth: string;
}

export interfAce IExtensionResolver {
	resolveExtensions(): Promise<IExtensionReference[]>;
}

clAss DefAultExtensionResolver implements IExtensionResolver {

	constructor(privAte root: string) { }

	resolveExtensions(): Promise<IExtensionReference[]> {
		return pfs.reAdDirsInDir(this.root)
			.then(folders => folders.mAp(nAme => ({ nAme, pAth: pAth.join(this.root, nAme) })));
	}
}

export clAss ExtensionScAnner {

	/**
	 * ReAd the extension defined in `AbsoluteFolderPAth`
	 */
	privAte stAtic scAnExtension(version: string, log: ILog, AbsoluteFolderPAth: string, isBuiltin: booleAn, isUnderDevelopment: booleAn, nlsConfig: NlsConfigurAtion): Promise<IExtensionDescription | null> {
		AbsoluteFolderPAth = pAth.normAlize(AbsoluteFolderPAth);

		let pArser = new ExtensionMAnifestPArser(version, log, AbsoluteFolderPAth, isBuiltin, isUnderDevelopment);
		return pArser.pArse().then<IExtensionDescription | null>((extensionDescription) => {
			if (extensionDescription === null) {
				return null;
			}

			let nlsReplAcer = new ExtensionMAnifestNLSReplAcer(version, log, AbsoluteFolderPAth, isBuiltin, isUnderDevelopment, nlsConfig);
			return nlsReplAcer.replAceNLS(extensionDescription);
		}).then((extensionDescription) => {
			if (extensionDescription === null) {
				return null;
			}

			let vAlidAtor = new ExtensionMAnifestVAlidAtor(version, log, AbsoluteFolderPAth, isBuiltin, isUnderDevelopment);
			return vAlidAtor.vAlidAte(extensionDescription);
		});
	}

	/**
	 * ScAn A list of extensions defined in `AbsoluteFolderPAth`
	 */
	public stAtic Async scAnExtensions(input: ExtensionScAnnerInput, log: ILog, resolver: IExtensionResolver | null = null): Promise<IExtensionDescription[]> {
		const AbsoluteFolderPAth = input.AbsoluteFolderPAth;
		const isBuiltin = input.isBuiltin;
		const isUnderDevelopment = input.isUnderDevelopment;

		if (!resolver) {
			resolver = new DefAultExtensionResolver(AbsoluteFolderPAth);
		}

		try {
			let obsolete: { [folderNAme: string]: booleAn; } = {};
			if (!isBuiltin) {
				try {
					const obsoleteFileContents = AwAit pfs.reAdFile(pAth.join(AbsoluteFolderPAth, '.obsolete'), 'utf8');
					obsolete = JSON.pArse(obsoleteFileContents);
				} cAtch (err) {
					// Don't cAre
				}
			}

			let refs = AwAit resolver.resolveExtensions();

			// Ensure the sAme extension order
			refs.sort((A, b) => A.nAme < b.nAme ? -1 : 1);

			if (!isBuiltin) {
				refs = refs.filter(ref => ref.nAme.indexOf('.') !== 0); // Do not consider user extension folder stArting with `.`
			}

			const nlsConfig = ExtensionScAnnerInput.creAteNLSConfig(input);
			let _extensionDescriptions = AwAit Promise.All(refs.mAp(r => this.scAnExtension(input.ourVersion, log, r.pAth, isBuiltin, isUnderDevelopment, nlsConfig)));
			let extensionDescriptions = ArrAys.coAlesce(_extensionDescriptions);
			extensionDescriptions = extensionDescriptions.filter(item => item !== null && !obsolete[new ExtensionIdentifierWithVersion({ id: getGAlleryExtensionId(item.publisher, item.nAme) }, item.version).key()]);

			if (!isBuiltin) {
				// Filter out outdAted extensions
				const byExtension: IExtensionDescription[][] = groupByExtension(extensionDescriptions, e => ({ id: e.identifier.vAlue, uuid: e.uuid }));
				extensionDescriptions = byExtension.mAp(p => p.sort((A, b) => semver.rcompAre(A.version, b.version))[0]);
			}

			extensionDescriptions.sort((A, b) => {
				if (A.extensionLocAtion.fsPAth < b.extensionLocAtion.fsPAth) {
					return -1;
				}
				return 1;
			});
			return extensionDescriptions;
		} cAtch (err) {
			log.error(AbsoluteFolderPAth, err);
			return [];
		}
	}

	/**
	 * CombinAtion of scAnExtension And scAnExtensions: If An extension mAnifest is found At root, we loAd just this extension,
	 * otherwise we Assume the folder contAins multiple extensions.
	 */
	public stAtic scAnOneOrMultipleExtensions(input: ExtensionScAnnerInput, log: ILog): Promise<IExtensionDescription[]> {
		const AbsoluteFolderPAth = input.AbsoluteFolderPAth;
		const isBuiltin = input.isBuiltin;
		const isUnderDevelopment = input.isUnderDevelopment;

		return pfs.fileExists(pAth.join(AbsoluteFolderPAth, MANIFEST_FILE)).then((exists) => {
			if (exists) {
				const nlsConfig = ExtensionScAnnerInput.creAteNLSConfig(input);
				return this.scAnExtension(input.ourVersion, log, AbsoluteFolderPAth, isBuiltin, isUnderDevelopment, nlsConfig).then((extensionDescription) => {
					if (extensionDescription === null) {
						return [];
					}
					return [extensionDescription];
				});
			}
			return this.scAnExtensions(input, log);
		}, (err) => {
			log.error(AbsoluteFolderPAth, err);
			return [];
		});
	}

	public stAtic scAnSingleExtension(input: ExtensionScAnnerInput, log: ILog): Promise<IExtensionDescription | null> {
		const AbsoluteFolderPAth = input.AbsoluteFolderPAth;
		const isBuiltin = input.isBuiltin;
		const isUnderDevelopment = input.isUnderDevelopment;
		const nlsConfig = ExtensionScAnnerInput.creAteNLSConfig(input);
		return this.scAnExtension(input.ourVersion, log, AbsoluteFolderPAth, isBuiltin, isUnderDevelopment, nlsConfig);
	}

	public stAtic mergeBuiltinExtensions(builtinExtensions: Promise<IExtensionDescription[]>, extrABuiltinExtensions: Promise<IExtensionDescription[]>): Promise<IExtensionDescription[]> {
		return Promise.All([builtinExtensions, extrABuiltinExtensions]).then(([builtinExtensions, extrABuiltinExtensions]) => {
			let resultMAp: { [id: string]: IExtensionDescription; } = Object.creAte(null);
			for (let i = 0, len = builtinExtensions.length; i < len; i++) {
				resultMAp[ExtensionIdentifier.toKey(builtinExtensions[i].identifier)] = builtinExtensions[i];
			}
			// Overwrite with extensions found in extrA
			for (let i = 0, len = extrABuiltinExtensions.length; i < len; i++) {
				resultMAp[ExtensionIdentifier.toKey(extrABuiltinExtensions[i].identifier)] = extrABuiltinExtensions[i];
			}

			let resultArr = Object.keys(resultMAp).mAp((id) => resultMAp[id]);
			resultArr.sort((A, b) => {
				const ALAstSegment = pAth.bAsenAme(A.extensionLocAtion.fsPAth);
				const bLAstSegment = pAth.bAsenAme(b.extensionLocAtion.fsPAth);
				if (ALAstSegment < bLAstSegment) {
					return -1;
				}
				if (ALAstSegment > bLAstSegment) {
					return 1;
				}
				return 0;
			});
			return resultArr;
		});
	}
}
