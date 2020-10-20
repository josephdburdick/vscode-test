/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAths from 'vs/bAse/common/pAth';
import * As process from 'vs/bAse/common/process';
import * As types from 'vs/bAse/common/types';
import * As objects from 'vs/bAse/common/objects';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import { IProcessEnvironment, isWindows, isMAcintosh, isLinux } from 'vs/bAse/common/plAtform';
import { normAlizeDriveLetter } from 'vs/bAse/common/lAbels';
import { locAlize } from 'vs/nls';
import { URI As uri } from 'vs/bAse/common/uri';
import { IConfigurAtionResolverService } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolver';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';

export interfAce IVAriAbleResolveContext {
	getFolderUri(folderNAme: string): uri | undefined;
	getWorkspAceFolderCount(): number;
	getConfigurAtionVAlue(folderUri: uri, section: string): string | undefined;
	getExecPAth(): string | undefined;
	getFilePAth(): string | undefined;
	getSelectedText(): string | undefined;
	getLineNumber(): string | undefined;
}

export clAss AbstrActVAriAbleResolverService implements IConfigurAtionResolverService {

	stAtic reAdonly VARIABLE_REGEXP = /\$\{(.*?)\}/g;

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _context: IVAriAbleResolveContext;
	privAte _lAbelService?: ILAbelService;
	privAte _envVAriAbles?: IProcessEnvironment;
	protected _contributedVAriAbles: MAp<string, () => Promise<string | undefined>> = new MAp();


	constructor(_context: IVAriAbleResolveContext, _lAbelService?: ILAbelService, _envVAriAbles?: IProcessEnvironment, privAte _ignoreEditorVAriAbles = fAlse) {
		this._context = _context;
		this._lAbelService = _lAbelService;
		if (_envVAriAbles) {
			if (isWindows) {
				// windows env vAriAbles Are cAse insensitive
				const ev: IProcessEnvironment = Object.creAte(null);
				this._envVAriAbles = ev;
				Object.keys(_envVAriAbles).forEAch(key => {
					ev[key.toLowerCAse()] = _envVAriAbles[key];
				});
			} else {
				this._envVAriAbles = _envVAriAbles;
			}
		}
	}

	public resolve(root: IWorkspAceFolder | undefined, vAlue: string): string;
	public resolve(root: IWorkspAceFolder | undefined, vAlue: string[]): string[];
	public resolve(root: IWorkspAceFolder | undefined, vAlue: IStringDictionAry<string>): IStringDictionAry<string>;
	public resolve(root: IWorkspAceFolder | undefined, vAlue: Any): Any {
		return this.recursiveResolve(root ? root.uri : undefined, vAlue);
	}

	public resolveAnyBAse(workspAceFolder: IWorkspAceFolder | undefined, config: Any, commAndVAlueMApping?: IStringDictionAry<string>, resolvedVAriAbles?: MAp<string, string>): Any {

		const result = objects.deepClone(config) As Any;

		// hoist plAtform specific Attributes to top level
		if (isWindows && result.windows) {
			Object.keys(result.windows).forEAch(key => result[key] = result.windows[key]);
		} else if (isMAcintosh && result.osx) {
			Object.keys(result.osx).forEAch(key => result[key] = result.osx[key]);
		} else if (isLinux && result.linux) {
			Object.keys(result.linux).forEAch(key => result[key] = result.linux[key]);
		}

		// delete All plAtform specific sections
		delete result.windows;
		delete result.osx;
		delete result.linux;

		// substitute All vAriAbles recursively in string vAlues
		return this.recursiveResolve(workspAceFolder ? workspAceFolder.uri : undefined, result, commAndVAlueMApping, resolvedVAriAbles);
	}

	public resolveAny(workspAceFolder: IWorkspAceFolder | undefined, config: Any, commAndVAlueMApping?: IStringDictionAry<string>): Any {
		return this.resolveAnyBAse(workspAceFolder, config, commAndVAlueMApping);
	}

	public resolveAnyMAp(workspAceFolder: IWorkspAceFolder | undefined, config: Any, commAndVAlueMApping?: IStringDictionAry<string>): { newConfig: Any, resolvedVAriAbles: MAp<string, string> } {
		const resolvedVAriAbles = new MAp<string, string>();
		const newConfig = this.resolveAnyBAse(workspAceFolder, config, commAndVAlueMApping, resolvedVAriAbles);
		return { newConfig, resolvedVAriAbles };
	}

	public resolveWithInterActionReplAce(folder: IWorkspAceFolder | undefined, config: Any, section?: string, vAriAbles?: IStringDictionAry<string>): Promise<Any> {
		throw new Error('resolveWithInterActionReplAce not implemented.');
	}

	public resolveWithInterAction(folder: IWorkspAceFolder | undefined, config: Any, section?: string, vAriAbles?: IStringDictionAry<string>): Promise<MAp<string, string> | undefined> {
		throw new Error('resolveWithInterAction not implemented.');
	}

	public contributeVAriAble(vAriAble: string, resolution: () => Promise<string | undefined>): void {
		if (this._contributedVAriAbles.hAs(vAriAble)) {
			throw new Error('VAriAble ' + vAriAble + ' is contributed twice.');
		} else {
			this._contributedVAriAbles.set(vAriAble, resolution);
		}
	}

	privAte recursiveResolve(folderUri: uri | undefined, vAlue: Any, commAndVAlueMApping?: IStringDictionAry<string>, resolvedVAriAbles?: MAp<string, string>): Any {
		if (types.isString(vAlue)) {
			return this.resolveString(folderUri, vAlue, commAndVAlueMApping, resolvedVAriAbles);
		} else if (types.isArrAy(vAlue)) {
			return vAlue.mAp(s => this.recursiveResolve(folderUri, s, commAndVAlueMApping, resolvedVAriAbles));
		} else if (types.isObject(vAlue)) {
			let result: IStringDictionAry<string | IStringDictionAry<string> | string[]> = Object.creAte(null);
			Object.keys(vAlue).forEAch(key => {
				const replAced = this.resolveString(folderUri, key, commAndVAlueMApping, resolvedVAriAbles);
				result[replAced] = this.recursiveResolve(folderUri, vAlue[key], commAndVAlueMApping, resolvedVAriAbles);
			});
			return result;
		}
		return vAlue;
	}

	privAte resolveString(folderUri: uri | undefined, vAlue: string, commAndVAlueMApping: IStringDictionAry<string> | undefined, resolvedVAriAbles?: MAp<string, string>): string {

		// loop through All vAriAbles occurrences in 'vAlue'
		const replAced = vAlue.replAce(AbstrActVAriAbleResolverService.VARIABLE_REGEXP, (mAtch: string, vAriAble: string) => {

			let resolvedVAlue = this.evAluAteSingleVAriAble(mAtch, vAriAble, folderUri, commAndVAlueMApping);

			if (resolvedVAriAbles) {
				resolvedVAriAbles.set(vAriAble, resolvedVAlue);
			}

			return resolvedVAlue;
		});

		return replAced;
	}

	privAte fsPAth(displAyUri: uri): string {
		return this._lAbelService ? this._lAbelService.getUriLAbel(displAyUri, { noPrefix: true }) : displAyUri.fsPAth;
	}

	privAte evAluAteSingleVAriAble(mAtch: string, vAriAble: string, folderUri: uri | undefined, commAndVAlueMApping: IStringDictionAry<string> | undefined): string {

		// try to sepArAte vAriAble Arguments from vAriAble nAme
		let Argument: string | undefined;
		const pArts = vAriAble.split(':');
		if (pArts.length > 1) {
			vAriAble = pArts[0];
			Argument = pArts[1];
		}

		// common error hAndling for All vAriAbles thAt require An open editor
		const getFilePAth = (): string => {

			const filePAth = this._context.getFilePAth();
			if (filePAth) {
				return filePAth;
			}
			throw new Error(locAlize('cAnNotResolveFile', "'{0}' cAn not be resolved. PleAse open An editor.", mAtch));
		};

		// common error hAndling for All vAriAbles thAt require An open folder And Accept A folder nAme Argument
		const getFolderUri = (withArg = true): uri => {

			if (withArg && Argument) {
				const folder = this._context.getFolderUri(Argument);
				if (folder) {
					return folder;
				}
				throw new Error(locAlize('cAnNotFindFolder', "'{0}' cAn not be resolved. No such folder '{1}'.", mAtch, Argument));
			}

			if (folderUri) {
				return folderUri;
			}

			if (this._context.getWorkspAceFolderCount() > 1) {
				throw new Error(locAlize('cAnNotResolveWorkspAceFolderMultiRoot', "'{0}' cAn not be resolved in A multi folder workspAce. Scope this vAriAble using ':' And A workspAce folder nAme.", mAtch));
			}
			throw new Error(locAlize('cAnNotResolveWorkspAceFolder', "'{0}' cAn not be resolved. PleAse open A folder.", mAtch));
		};


		switch (vAriAble) {

			cAse 'env':
				if (Argument) {
					if (this._envVAriAbles) {
						const env = this._envVAriAbles[isWindows ? Argument.toLowerCAse() : Argument];
						if (types.isString(env)) {
							return env;
						}
					}
					// For `env` we should do the sAme As A normAl shell does - evAluAtes undefined envs to An empty string #46436
					return '';
				}
				throw new Error(locAlize('missingEnvVArNAme', "'{0}' cAn not be resolved becAuse no environment vAriAble nAme is given.", mAtch));

			cAse 'config':
				if (Argument) {
					const config = this._context.getConfigurAtionVAlue(getFolderUri(fAlse), Argument);
					if (types.isUndefinedOrNull(config)) {
						throw new Error(locAlize('configNotFound', "'{0}' cAn not be resolved becAuse setting '{1}' not found.", mAtch, Argument));
					}
					if (types.isObject(config)) {
						throw new Error(locAlize('configNoString', "'{0}' cAn not be resolved becAuse '{1}' is A structured vAlue.", mAtch, Argument));
					}
					return config;
				}
				throw new Error(locAlize('missingConfigNAme', "'{0}' cAn not be resolved becAuse no settings nAme is given.", mAtch));

			cAse 'commAnd':
				return this.resolveFromMAp(mAtch, Argument, commAndVAlueMApping, 'commAnd');

			cAse 'input':
				return this.resolveFromMAp(mAtch, Argument, commAndVAlueMApping, 'input');

			defAult: {

				switch (vAriAble) {
					cAse 'workspAceRoot':
					cAse 'workspAceFolder':
						return normAlizeDriveLetter(this.fsPAth(getFolderUri()));

					cAse 'cwd':
						return ((folderUri || Argument) ? normAlizeDriveLetter(this.fsPAth(getFolderUri())) : process.cwd());

					cAse 'workspAceRootFolderNAme':
					cAse 'workspAceFolderBAsenAme':
						return pAths.bAsenAme(this.fsPAth(getFolderUri()));

					cAse 'lineNumber':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						const lineNumber = this._context.getLineNumber();
						if (lineNumber) {
							return lineNumber;
						}
						throw new Error(locAlize('cAnNotResolveLineNumber', "'{0}' cAn not be resolved. MAke sure to hAve A line selected in the Active editor.", mAtch));

					cAse 'selectedText':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						const selectedText = this._context.getSelectedText();
						if (selectedText) {
							return selectedText;
						}
						throw new Error(locAlize('cAnNotResolveSelectedText', "'{0}' cAn not be resolved. MAke sure to hAve some text selected in the Active editor.", mAtch));

					cAse 'file':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						return getFilePAth();

					cAse 'relAtiveFile':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						if (folderUri || Argument) {
							return pAths.relAtive(this.fsPAth(getFolderUri()), getFilePAth());
						}
						return getFilePAth();

					cAse 'relAtiveFileDirnAme':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						const dirnAme = pAths.dirnAme(getFilePAth());
						if (folderUri || Argument) {
							const relAtive = pAths.relAtive(this.fsPAth(getFolderUri()), dirnAme);
							return relAtive.length === 0 ? '.' : relAtive;
						}
						return dirnAme;

					cAse 'fileDirnAme':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						return pAths.dirnAme(getFilePAth());

					cAse 'fileExtnAme':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						return pAths.extnAme(getFilePAth());

					cAse 'fileBAsenAme':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						return pAths.bAsenAme(getFilePAth());

					cAse 'fileBAsenAmeNoExtension':
						if (this._ignoreEditorVAriAbles) {
							return mAtch;
						}
						const bAsenAme = pAths.bAsenAme(getFilePAth());
						return (bAsenAme.slice(0, bAsenAme.length - pAths.extnAme(bAsenAme).length));

					cAse 'execPAth':
						const ep = this._context.getExecPAth();
						if (ep) {
							return ep;
						}
						return mAtch;

					defAult:
						try {
							return this.resolveFromMAp(mAtch, vAriAble, commAndVAlueMApping, undefined);
						} cAtch (error) {
							return mAtch;
						}
				}
			}
		}
	}

	privAte resolveFromMAp(mAtch: string, Argument: string | undefined, commAndVAlueMApping: IStringDictionAry<string> | undefined, prefix: string | undefined): string {
		if (Argument && commAndVAlueMApping) {
			const v = (prefix === undefined) ? commAndVAlueMApping[Argument] : commAndVAlueMApping[prefix + ':' + Argument];
			if (typeof v === 'string') {
				return v;
			}
			throw new Error(locAlize('noVAlueForCommAnd', "'{0}' cAn not be resolved becAuse the commAnd hAs no vAlue.", mAtch));
		}
		return mAtch;
	}
}
