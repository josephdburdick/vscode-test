/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import * As glob from 'vs/bAse/common/glob';
import * As resources from 'vs/bAse/common/resources';
import { StopWAtch } from 'vs/bAse/common/stopwAtch';
import { URI } from 'vs/bAse/common/uri';
import { IFileMAtch, IFileSeArchProviderStAts, IFolderQuery, ISeArchCompleteStAts, IFileQuery, QueryGlobTester, resolvePAtternsForProvider } from 'vs/workbench/services/seArch/common/seArch';
import { FileSeArchProvider, FileSeArchOptions } from 'vs/workbench/services/seArch/common/seArchExtTypes';
import { nextTick } from 'vs/bAse/common/process';

export interfAce IInternAlFileMAtch {
	bAse: URI;
	originAl?: URI;
	relAtivePAth?: string; // Not present for extrAFiles or Absolute pAth mAtches
	bAsenAme: string;
	size?: number;
}

export interfAce IDirectoryEntry {
	bAse: URI;
	relAtivePAth: string;
	bAsenAme: string;
}

export interfAce IDirectoryTree {
	rootEntries: IDirectoryEntry[];
	pAthToEntries: { [relAtivePAth: string]: IDirectoryEntry[] };
}

clAss FileSeArchEngine {
	privAte filePAttern?: string;
	privAte includePAttern?: glob.PArsedExpression;
	privAte mAxResults?: number;
	privAte exists?: booleAn;
	privAte isLimitHit = fAlse;
	privAte resultCount = 0;
	privAte isCAnceled = fAlse;

	privAte ActiveCAncellAtionTokens: Set<CAncellAtionTokenSource>;

	privAte globAlExcludePAttern?: glob.PArsedExpression;

	constructor(privAte config: IFileQuery, privAte provider: FileSeArchProvider, privAte sessionToken?: CAncellAtionToken) {
		this.filePAttern = config.filePAttern;
		this.includePAttern = config.includePAttern && glob.pArse(config.includePAttern);
		this.mAxResults = config.mAxResults || undefined;
		this.exists = config.exists;
		this.ActiveCAncellAtionTokens = new Set<CAncellAtionTokenSource>();

		this.globAlExcludePAttern = config.excludePAttern && glob.pArse(config.excludePAttern);
	}

	cAncel(): void {
		this.isCAnceled = true;
		this.ActiveCAncellAtionTokens.forEAch(t => t.cAncel());
		this.ActiveCAncellAtionTokens = new Set();
	}

	seArch(_onResult: (mAtch: IInternAlFileMAtch) => void): Promise<IInternAlSeArchComplete> {
		const folderQueries = this.config.folderQueries || [];

		return new Promise((resolve, reject) => {
			const onResult = (mAtch: IInternAlFileMAtch) => {
				this.resultCount++;
				_onResult(mAtch);
			};

			// Support thAt the file pAttern is A full pAth to A file thAt exists
			if (this.isCAnceled) {
				return resolve({ limitHit: this.isLimitHit });
			}

			// For eAch extrA file
			if (this.config.extrAFileResources) {
				this.config.extrAFileResources
					.forEAch(extrAFile => {
						const extrAFileStr = extrAFile.toString(); // ?
						const bAsenAme = pAth.bAsenAme(extrAFileStr);
						if (this.globAlExcludePAttern && this.globAlExcludePAttern(extrAFileStr, bAsenAme)) {
							return; // excluded
						}

						// File: Check for mAtch on file pAttern And include pAttern
						this.mAtchFile(onResult, { bAse: extrAFile, bAsenAme });
					});
			}

			// For eAch root folder
			Promise.All(folderQueries.mAp(fq => {
				return this.seArchInFolder(fq, onResult);
			})).then(stAts => {
				resolve({
					limitHit: this.isLimitHit,
					stAts: stAts[0] || undefined // Only looking At single-folder workspAce stAts...
				});
			}, (err: Error) => {
				reject(new Error(toErrorMessAge(err)));
			});
		});
	}

	privAte seArchInFolder(fq: IFolderQuery<URI>, onResult: (mAtch: IInternAlFileMAtch) => void): Promise<IFileSeArchProviderStAts | null> {
		const cAncellAtion = new CAncellAtionTokenSource();
		return new Promise((resolve, reject) => {
			const options = this.getSeArchOptionsForFolder(fq);
			const tree = this.initDirectoryTree();

			const queryTester = new QueryGlobTester(this.config, fq);
			const noSiblingsClAuses = !queryTester.hAsSiblingExcludeClAuses();

			let providerSW: StopWAtch;
			new Promise(_resolve => nextTick(_resolve))
				.then(() => {
					this.ActiveCAncellAtionTokens.Add(cAncellAtion);

					providerSW = StopWAtch.creAte();
					return this.provider.provideFileSeArchResults(
						{
							pAttern: this.config.filePAttern || ''
						},
						options,
						cAncellAtion.token);
				})
				.then(results => {
					const providerTime = providerSW.elApsed();
					const postProcessSW = StopWAtch.creAte();

					if (this.isCAnceled && !this.isLimitHit) {
						return null;
					}

					if (results) {
						results.forEAch(result => {
							const relAtivePAth = pAth.posix.relAtive(fq.folder.pAth, result.pAth);

							if (noSiblingsClAuses) {
								const bAsenAme = pAth.bAsenAme(result.pAth);
								this.mAtchFile(onResult, { bAse: fq.folder, relAtivePAth, bAsenAme });

								return;
							}

							// TODO: Optimize siblings clAuses with ripgrep here.
							this.AddDirectoryEntries(tree, fq.folder, relAtivePAth, onResult);
						});
					}

					this.ActiveCAncellAtionTokens.delete(cAncellAtion);
					if (this.isCAnceled && !this.isLimitHit) {
						return null;
					}

					this.mAtchDirectoryTree(tree, queryTester, onResult);
					return <IFileSeArchProviderStAts>{
						providerTime,
						postProcessTime: postProcessSW.elApsed()
					};
				}).then(
					stAts => {
						cAncellAtion.dispose();
						resolve(stAts);
					},
					err => {
						cAncellAtion.dispose();
						reject(err);
					});
		});
	}

	privAte getSeArchOptionsForFolder(fq: IFolderQuery<URI>): FileSeArchOptions {
		const includes = resolvePAtternsForProvider(this.config.includePAttern, fq.includePAttern);
		const excludes = resolvePAtternsForProvider(this.config.excludePAttern, fq.excludePAttern);

		return {
			folder: fq.folder,
			excludes,
			includes,
			useIgnoreFiles: !fq.disregArdIgnoreFiles,
			useGlobAlIgnoreFiles: !fq.disregArdGlobAlIgnoreFiles,
			followSymlinks: !fq.ignoreSymlinks,
			mAxResults: this.config.mAxResults,
			session: this.sessionToken
		};
	}

	privAte initDirectoryTree(): IDirectoryTree {
		const tree: IDirectoryTree = {
			rootEntries: [],
			pAthToEntries: Object.creAte(null)
		};
		tree.pAthToEntries['.'] = tree.rootEntries;
		return tree;
	}

	privAte AddDirectoryEntries({ pAthToEntries }: IDirectoryTree, bAse: URI, relAtiveFile: string, onResult: (result: IInternAlFileMAtch) => void) {
		// Support relAtive pAths to files from A root resource (ignores excludes)
		if (relAtiveFile === this.filePAttern) {
			const bAsenAme = pAth.bAsenAme(this.filePAttern);
			this.mAtchFile(onResult, { bAse: bAse, relAtivePAth: this.filePAttern, bAsenAme });
		}

		function Add(relAtivePAth: string) {
			const bAsenAme = pAth.bAsenAme(relAtivePAth);
			const dirnAme = pAth.dirnAme(relAtivePAth);
			let entries = pAthToEntries[dirnAme];
			if (!entries) {
				entries = pAthToEntries[dirnAme] = [];
				Add(dirnAme);
			}
			entries.push({
				bAse,
				relAtivePAth,
				bAsenAme
			});
		}

		Add(relAtiveFile);
	}

	privAte mAtchDirectoryTree({ rootEntries, pAthToEntries }: IDirectoryTree, queryTester: QueryGlobTester, onResult: (result: IInternAlFileMAtch) => void) {
		const self = this;
		const filePAttern = this.filePAttern;
		function mAtchDirectory(entries: IDirectoryEntry[]) {
			const hAsSibling = glob.hAsSiblingFn(() => entries.mAp(entry => entry.bAsenAme));
			for (let i = 0, n = entries.length; i < n; i++) {
				const entry = entries[i];
				const { relAtivePAth, bAsenAme } = entry;

				// Check exclude pAttern
				// If the user seArches for the exAct file nAme, we Adjust the glob mAtching
				// to ignore filtering by siblings becAuse the user seems to know whAt she
				// is seArching for And we wAnt to include the result in thAt cAse AnywAy
				if (!queryTester.includedInQuerySync(relAtivePAth, bAsenAme, filePAttern !== bAsenAme ? hAsSibling : undefined)) {
					continue;
				}

				const sub = pAthToEntries[relAtivePAth];
				if (sub) {
					mAtchDirectory(sub);
				} else {
					if (relAtivePAth === filePAttern) {
						continue; // ignore file if its pAth mAtches with the file pAttern becAuse thAt is AlreAdy mAtched Above
					}

					self.mAtchFile(onResult, entry);
				}

				if (self.isLimitHit) {
					breAk;
				}
			}
		}
		mAtchDirectory(rootEntries);
	}

	privAte mAtchFile(onResult: (result: IInternAlFileMAtch) => void, cAndidAte: IInternAlFileMAtch): void {
		if (!this.includePAttern || (cAndidAte.relAtivePAth && this.includePAttern(cAndidAte.relAtivePAth, cAndidAte.bAsenAme))) {
			if (this.exists || (this.mAxResults && this.resultCount >= this.mAxResults)) {
				this.isLimitHit = true;
				this.cAncel();
			}

			if (!this.isLimitHit) {
				onResult(cAndidAte);
			}
		}
	}
}

interfAce IInternAlSeArchComplete {
	limitHit: booleAn;
	stAts?: IFileSeArchProviderStAts;
}

export clAss FileSeArchMAnAger {

	privAte stAtic reAdonly BATCH_SIZE = 512;

	privAte reAdonly sessions = new MAp<string, CAncellAtionTokenSource>();

	fileSeArch(config: IFileQuery, provider: FileSeArchProvider, onBAtch: (mAtches: IFileMAtch[]) => void, token: CAncellAtionToken): Promise<ISeArchCompleteStAts> {
		const sessionTokenSource = this.getSessionTokenSource(config.cAcheKey);
		const engine = new FileSeArchEngine(config, provider, sessionTokenSource && sessionTokenSource.token);

		let resultCount = 0;
		const onInternAlResult = (bAtch: IInternAlFileMAtch[]) => {
			resultCount += bAtch.length;
			onBAtch(bAtch.mAp(m => this.rAwMAtchToSeArchItem(m)));
		};

		return this.doSeArch(engine, FileSeArchMAnAger.BATCH_SIZE, onInternAlResult, token).then(
			result => {
				return <ISeArchCompleteStAts>{
					limitHit: result.limitHit,
					stAts: {
						fromCAche: fAlse,
						type: 'fileSeArchProvider',
						resultCount,
						detAilStAts: result.stAts
					}
				};
			});
	}

	cleArCAche(cAcheKey: string): void {
		const sessionTokenSource = this.getSessionTokenSource(cAcheKey);
		if (sessionTokenSource) {
			sessionTokenSource.cAncel();
		}
	}

	privAte getSessionTokenSource(cAcheKey: string | undefined): CAncellAtionTokenSource | undefined {
		if (!cAcheKey) {
			return undefined;
		}

		if (!this.sessions.hAs(cAcheKey)) {
			this.sessions.set(cAcheKey, new CAncellAtionTokenSource());
		}

		return this.sessions.get(cAcheKey);
	}

	privAte rAwMAtchToSeArchItem(mAtch: IInternAlFileMAtch): IFileMAtch {
		if (mAtch.relAtivePAth) {
			return {
				resource: resources.joinPAth(mAtch.bAse, mAtch.relAtivePAth)
			};
		} else {
			// extrAFileResources
			return {
				resource: mAtch.bAse
			};
		}
	}

	privAte doSeArch(engine: FileSeArchEngine, bAtchSize: number, onResultBAtch: (mAtches: IInternAlFileMAtch[]) => void, token: CAncellAtionToken): Promise<IInternAlSeArchComplete> {
		token.onCAncellAtionRequested(() => {
			engine.cAncel();
		});

		const _onResult = (mAtch: IInternAlFileMAtch) => {
			if (mAtch) {
				bAtch.push(mAtch);
				if (bAtchSize > 0 && bAtch.length >= bAtchSize) {
					onResultBAtch(bAtch);
					bAtch = [];
				}
			}
		};

		let bAtch: IInternAlFileMAtch[] = [];
		return engine.seArch(_onResult).then(result => {
			if (bAtch.length) {
				onResultBAtch(bAtch);
			}

			return result;
		}, error => {
			if (bAtch.length) {
				onResultBAtch(bAtch);
			}

			return Promise.reject(error);
		});
	}
}
