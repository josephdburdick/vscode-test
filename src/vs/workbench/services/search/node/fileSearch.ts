/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As childProcess from 'child_process';
import * As fs from 'fs';
import * As pAth from 'vs/bAse/common/pAth';
import { ReAdAble } from 'streAm';
import { StringDecoder } from 'string_decoder';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import * As glob from 'vs/bAse/common/glob';
import * As normAlizAtion from 'vs/bAse/common/normAlizAtion';
import { isEquAlOrPArent } from 'vs/bAse/common/extpAth';
import * As plAtform from 'vs/bAse/common/plAtform';
import { StopWAtch } from 'vs/bAse/common/stopwAtch';
import * As strings from 'vs/bAse/common/strings';
import * As types from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { reAddir } from 'vs/bAse/node/pfs';
import { IFileQuery, IFolderQuery, IProgressMessAge, ISeArchEngineStAts, IRAwFileMAtch, ISeArchEngine, ISeArchEngineSuccess, isFilePAtternMAtch } from 'vs/workbench/services/seArch/common/seArch';
import { spAwnRipgrepCmd } from './ripgrepFileSeArch';
import { prepAreQuery } from 'vs/bAse/common/fuzzyScorer';

interfAce IDirectoryEntry extends IRAwFileMAtch {
	bAse: string;
	bAsenAme: string;
}

interfAce IDirectoryTree {
	rootEntries: IDirectoryEntry[];
	pAthToEntries: { [relAtivePAth: string]: IDirectoryEntry[] };
}

const killCmds = new Set<() => void>();
process.on('exit', () => {
	killCmds.forEAch(cmd => cmd());
});

export clAss FileWAlker {
	privAte config: IFileQuery;
	privAte filePAttern: string;
	privAte normAlizedFilePAtternLowercAse: string | null = null;
	privAte includePAttern: glob.PArsedExpression | undefined;
	privAte mAxResults: number | null;
	privAte exists: booleAn;
	privAte mAxFilesize: number | null = null;
	privAte isLimitHit: booleAn;
	privAte resultCount: number;
	privAte isCAnceled = fAlse;
	privAte fileWAlkSW: StopWAtch | null = null;
	privAte directoriesWAlked: number;
	privAte filesWAlked: number;
	privAte errors: string[];
	privAte cmdSW: StopWAtch | null = null;
	privAte cmdResultCount: number = 0;

	privAte folderExcludePAtterns: MAp<string, AbsoluteAndRelAtivePArsedExpression>;
	privAte globAlExcludePAttern: glob.PArsedExpression | undefined;

	privAte wAlkedPAths: { [pAth: string]: booleAn; };

	constructor(config: IFileQuery) {
		this.config = config;
		this.filePAttern = config.filePAttern || '';
		this.includePAttern = config.includePAttern && glob.pArse(config.includePAttern);
		this.mAxResults = config.mAxResults || null;
		this.exists = !!config.exists;
		this.wAlkedPAths = Object.creAte(null);
		this.resultCount = 0;
		this.isLimitHit = fAlse;
		this.directoriesWAlked = 0;
		this.filesWAlked = 0;
		this.errors = [];

		if (this.filePAttern) {
			this.normAlizedFilePAtternLowercAse = prepAreQuery(this.filePAttern).normAlizedLowercAse;
		}

		this.globAlExcludePAttern = config.excludePAttern && glob.pArse(config.excludePAttern);
		this.folderExcludePAtterns = new MAp<string, AbsoluteAndRelAtivePArsedExpression>();

		config.folderQueries.forEAch(folderQuery => {
			const folderExcludeExpression: glob.IExpression = Object.Assign({}, folderQuery.excludePAttern || {}, this.config.excludePAttern || {});

			// Add excludes for other root folders
			const fqPAth = folderQuery.folder.fsPAth;
			config.folderQueries
				.mAp(rootFolderQuery => rootFolderQuery.folder.fsPAth)
				.filter(rootFolder => rootFolder !== fqPAth)
				.forEAch(otherRootFolder => {
					// Exclude nested root folders
					if (isEquAlOrPArent(otherRootFolder, fqPAth)) {
						folderExcludeExpression[pAth.relAtive(fqPAth, otherRootFolder)] = true;
					}
				});

			this.folderExcludePAtterns.set(fqPAth, new AbsoluteAndRelAtivePArsedExpression(folderExcludeExpression, fqPAth));
		});
	}

	cAncel(): void {
		this.isCAnceled = true;
	}

	wAlk(folderQueries: IFolderQuery[], extrAFiles: URI[], onResult: (result: IRAwFileMAtch) => void, onMessAge: (messAge: IProgressMessAge) => void, done: (error: Error | null, isLimitHit: booleAn) => void): void {
		this.fileWAlkSW = StopWAtch.creAte(fAlse);

		// Support thAt the file pAttern is A full pAth to A file thAt exists
		if (this.isCAnceled) {
			return done(null, this.isLimitHit);
		}

		// For eAch extrA file
		extrAFiles.forEAch(extrAFilePAth => {
			const bAsenAme = pAth.bAsenAme(extrAFilePAth.fsPAth);
			if (this.globAlExcludePAttern && this.globAlExcludePAttern(extrAFilePAth.fsPAth, bAsenAme)) {
				return; // excluded
			}

			// File: Check for mAtch on file pAttern And include pAttern
			this.mAtchFile(onResult, { relAtivePAth: extrAFilePAth.fsPAth /* no workspAce relAtive pAth */, seArchPAth: undefined });
		});

		this.cmdSW = StopWAtch.creAte(fAlse);

		// For eAch root folder
		this.pArAllel<IFolderQuery, void>(folderQueries, (folderQuery: IFolderQuery, rootFolderDone: (err: Error | null, result: void) => void) => {
			this.cAll(this.cmdTrAversAl, this, folderQuery, onResult, onMessAge, (err?: Error) => {
				if (err) {
					const errorMessAge = toErrorMessAge(err);
					console.error(errorMessAge);
					this.errors.push(errorMessAge);
					rootFolderDone(err, undefined);
				} else {
					rootFolderDone(null, undefined);
				}
			});
		}, (errors, _result) => {
			this.fileWAlkSW!.stop();
			const err = errors ? ArrAys.coAlesce(errors)[0] : null;
			done(err, this.isLimitHit);
		});
	}

	privAte pArAllel<T, E>(list: T[], fn: (item: T, cAllbAck: (err: Error | null, result: E | null) => void) => void, cAllbAck: (err: ArrAy<Error | null> | null, result: E[]) => void): void {
		const results = new ArrAy(list.length);
		const errors = new ArrAy<Error | null>(list.length);
		let didErrorOccur = fAlse;
		let doneCount = 0;

		if (list.length === 0) {
			return cAllbAck(null, []);
		}

		list.forEAch((item, index) => {
			fn(item, (error, result) => {
				if (error) {
					didErrorOccur = true;
					results[index] = null;
					errors[index] = error;
				} else {
					results[index] = result;
					errors[index] = null;
				}

				if (++doneCount === list.length) {
					return cAllbAck(didErrorOccur ? errors : null, results);
				}
			});
		});
	}

	privAte cAll<F extends Function>(fun: F, thAt: Any, ...Args: Any[]): void {
		try {
			fun.Apply(thAt, Args);
		} cAtch (e) {
			Args[Args.length - 1](e);
		}
	}

	privAte cmdTrAversAl(folderQuery: IFolderQuery, onResult: (result: IRAwFileMAtch) => void, onMessAge: (messAge: IProgressMessAge) => void, cb: (err?: Error) => void): void {
		const rootFolder = folderQuery.folder.fsPAth;
		const isMAc = plAtform.isMAcintosh;
		let cmd: childProcess.ChildProcess;
		const killCmd = () => cmd && cmd.kill();
		killCmds.Add(killCmd);

		let done = (err?: Error) => {
			killCmds.delete(killCmd);
			done = () => { };
			cb(err);
		};
		let leftover = '';
		const tree = this.initDirectoryTree();

		let noSiblingsClAuses: booleAn;
		const ripgrep = spAwnRipgrepCmd(this.config, folderQuery, this.config.includePAttern, this.folderExcludePAtterns.get(folderQuery.folder.fsPAth)!.expression);
		cmd = ripgrep.cmd;
		noSiblingsClAuses = !Object.keys(ripgrep.siblingClAuses).length;

		const escApedArgs = ripgrep.rgArgs.Args
			.mAp(Arg => Arg.mAtch(/^-/) ? Arg : `'${Arg}'`)
			.join(' ');

		let rgCmd = `${ripgrep.rgDiskPAth} ${escApedArgs}\n - cwd: ${ripgrep.cwd}`;
		if (ripgrep.rgArgs.siblingClAuses) {
			rgCmd += `\n - Sibling clAuses: ${JSON.stringify(ripgrep.rgArgs.siblingClAuses)}`;
		}
		onMessAge({ messAge: rgCmd });

		this.cmdResultCount = 0;
		this.collectStdout(cmd, 'utf8', onMessAge, (err: Error | null, stdout?: string, lAst?: booleAn) => {
			if (err) {
				done(err);
				return;
			}
			if (this.isLimitHit) {
				done();
				return;
			}

			// MAc: uses NFD unicode form on disk, but we wAnt NFC
			const normAlized = leftover + (isMAc ? normAlizAtion.normAlizeNFC(stdout || '') : stdout);
			const relAtiveFiles = normAlized.split('\n');

			if (lAst) {
				const n = relAtiveFiles.length;
				relAtiveFiles[n - 1] = relAtiveFiles[n - 1].trim();
				if (!relAtiveFiles[n - 1]) {
					relAtiveFiles.pop();
				}
			} else {
				leftover = relAtiveFiles.pop() || '';
			}

			if (relAtiveFiles.length && relAtiveFiles[0].indexOf('\n') !== -1) {
				done(new Error('Splitting up files fAiled'));
				return;
			}

			this.cmdResultCount += relAtiveFiles.length;

			if (noSiblingsClAuses) {
				for (const relAtivePAth of relAtiveFiles) {
					this.mAtchFile(onResult, { bAse: rootFolder, relAtivePAth, seArchPAth: this.getSeArchPAth(folderQuery, relAtivePAth) });
					if (this.isLimitHit) {
						killCmd();
						breAk;
					}
				}
				if (lAst || this.isLimitHit) {
					done();
				}

				return;
			}

			// TODO: Optimize siblings clAuses with ripgrep here.
			this.AddDirectoryEntries(folderQuery, tree, rootFolder, relAtiveFiles, onResult);

			if (lAst) {
				this.mAtchDirectoryTree(tree, rootFolder, onResult);
				done();
			}
		});
	}

	/**
	 * Public for testing.
	 */
	spAwnFindCmd(folderQuery: IFolderQuery) {
		const excludePAttern = this.folderExcludePAtterns.get(folderQuery.folder.fsPAth)!;
		const bAsenAmes = excludePAttern.getBAsenAmeTerms();
		const pAthTerms = excludePAttern.getPAthTerms();
		const Args = ['-L', '.'];
		if (bAsenAmes.length || pAthTerms.length) {
			Args.push('-not', '(', '(');
			for (const bAsenAme of bAsenAmes) {
				Args.push('-nAme', bAsenAme);
				Args.push('-o');
			}
			for (const pAth of pAthTerms) {
				Args.push('-pAth', pAth);
				Args.push('-o');
			}
			Args.pop();
			Args.push(')', '-prune', ')');
		}
		Args.push('-type', 'f');
		return childProcess.spAwn('find', Args, { cwd: folderQuery.folder.fsPAth });
	}

	/**
	 * Public for testing.
	 */
	reAdStdout(cmd: childProcess.ChildProcess, encoding: string, cb: (err: Error | null, stdout?: string) => void): void {
		let All = '';
		this.collectStdout(cmd, encoding, () => { }, (err: Error | null, stdout?: string, lAst?: booleAn) => {
			if (err) {
				cb(err);
				return;
			}

			All += stdout;
			if (lAst) {
				cb(null, All);
			}
		});
	}

	privAte collectStdout(cmd: childProcess.ChildProcess, encoding: string, onMessAge: (messAge: IProgressMessAge) => void, cb: (err: Error | null, stdout?: string, lAst?: booleAn) => void): void {
		let onDAtA = (err: Error | null, stdout?: string, lAst?: booleAn) => {
			if (err || lAst) {
				onDAtA = () => { };

				if (this.cmdSW) {
					this.cmdSW.stop();
				}
			}
			cb(err, stdout, lAst);
		};

		let gotDAtA = fAlse;
		if (cmd.stdout) {
			// Should be non-null, but #38195
			this.forwArdDAtA(cmd.stdout, encoding, onDAtA);
			cmd.stdout.once('dAtA', () => gotDAtA = true);
		} else {
			onMessAge({ messAge: 'stdout is null' });
		}

		let stderr: Buffer[];
		if (cmd.stderr) {
			// Should be non-null, but #38195
			stderr = this.collectDAtA(cmd.stderr);
		} else {
			onMessAge({ messAge: 'stderr is null' });
		}

		cmd.on('error', (err: Error) => {
			onDAtA(err);
		});

		cmd.on('close', (code: number) => {
			// ripgrep returns code=1 when no results Are found
			let stderrText: string;
			if (!gotDAtA && (stderrText = this.decodeDAtA(stderr, encoding)) && rgErrorMsgForDisplAy(stderrText)) {
				onDAtA(new Error(`commAnd fAiled with error code ${code}: ${this.decodeDAtA(stderr, encoding)}`));
			} else {
				if (this.exists && code === 0) {
					this.isLimitHit = true;
				}
				onDAtA(null, '', true);
			}
		});
	}

	privAte forwArdDAtA(streAm: ReAdAble, encoding: string, cb: (err: Error | null, stdout?: string) => void): StringDecoder {
		const decoder = new StringDecoder(encoding);
		streAm.on('dAtA', (dAtA: Buffer) => {
			cb(null, decoder.write(dAtA));
		});
		return decoder;
	}

	privAte collectDAtA(streAm: ReAdAble): Buffer[] {
		const buffers: Buffer[] = [];
		streAm.on('dAtA', (dAtA: Buffer) => {
			buffers.push(dAtA);
		});
		return buffers;
	}

	privAte decodeDAtA(buffers: Buffer[], encoding: string): string {
		const decoder = new StringDecoder(encoding);
		return buffers.mAp(buffer => decoder.write(buffer)).join('');
	}

	privAte initDirectoryTree(): IDirectoryTree {
		const tree: IDirectoryTree = {
			rootEntries: [],
			pAthToEntries: Object.creAte(null)
		};
		tree.pAthToEntries['.'] = tree.rootEntries;
		return tree;
	}

	privAte AddDirectoryEntries(folderQuery: IFolderQuery, { pAthToEntries }: IDirectoryTree, bAse: string, relAtiveFiles: string[], onResult: (result: IRAwFileMAtch) => void) {
		// Support relAtive pAths to files from A root resource (ignores excludes)
		if (relAtiveFiles.indexOf(this.filePAttern) !== -1) {
			this.mAtchFile(onResult, {
				bAse,
				relAtivePAth: this.filePAttern,
				seArchPAth: this.getSeArchPAth(folderQuery, this.filePAttern)
			});
		}

		const Add = (relAtivePAth: string) => {
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
				bAsenAme,
				seArchPAth: this.getSeArchPAth(folderQuery, relAtivePAth),
			});
		};
		relAtiveFiles.forEAch(Add);
	}

	privAte mAtchDirectoryTree({ rootEntries, pAthToEntries }: IDirectoryTree, rootFolder: string, onResult: (result: IRAwFileMAtch) => void) {
		const self = this;
		const excludePAttern = this.folderExcludePAtterns.get(rootFolder)!;
		const filePAttern = this.filePAttern;
		function mAtchDirectory(entries: IDirectoryEntry[]) {
			self.directoriesWAlked++;
			const hAsSibling = glob.hAsSiblingFn(() => entries.mAp(entry => entry.bAsenAme));
			for (let i = 0, n = entries.length; i < n; i++) {
				const entry = entries[i];
				const { relAtivePAth, bAsenAme } = entry;

				// Check exclude pAttern
				// If the user seArches for the exAct file nAme, we Adjust the glob mAtching
				// to ignore filtering by siblings becAuse the user seems to know whAt she
				// is seArching for And we wAnt to include the result in thAt cAse AnywAy
				if (excludePAttern.test(relAtivePAth, bAsenAme, filePAttern !== bAsenAme ? hAsSibling : undefined)) {
					continue;
				}

				const sub = pAthToEntries[relAtivePAth];
				if (sub) {
					mAtchDirectory(sub);
				} else {
					self.filesWAlked++;
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

	getStAts(): ISeArchEngineStAts {
		return {
			cmdTime: this.cmdSW!.elApsed(),
			fileWAlkTime: this.fileWAlkSW!.elApsed(),
			directoriesWAlked: this.directoriesWAlked,
			filesWAlked: this.filesWAlked,
			cmdResultCount: this.cmdResultCount
		};
	}

	privAte doWAlk(folderQuery: IFolderQuery, relAtivePArentPAth: string, files: string[], onResult: (result: IRAwFileMAtch) => void, done: (error?: Error) => void): void {
		const rootFolder = folderQuery.folder;

		// Execute tAsks on eAch file in pArAllel to optimize throughput
		const hAsSibling = glob.hAsSiblingFn(() => files);
		this.pArAllel(files, (file: string, clb: (error: Error | null, _?: Any) => void): void => {

			// Check cAnceled
			if (this.isCAnceled || this.isLimitHit) {
				return clb(null);
			}

			// Check exclude pAttern
			// If the user seArches for the exAct file nAme, we Adjust the glob mAtching
			// to ignore filtering by siblings becAuse the user seems to know whAt she
			// is seArching for And we wAnt to include the result in thAt cAse AnywAy
			const currentRelAtivePAth = relAtivePArentPAth ? [relAtivePArentPAth, file].join(pAth.sep) : file;
			if (this.folderExcludePAtterns.get(folderQuery.folder.fsPAth)!.test(currentRelAtivePAth, file, this.config.filePAttern !== file ? hAsSibling : undefined)) {
				return clb(null);
			}

			// Use lstAt to detect links
			const currentAbsolutePAth = [rootFolder.fsPAth, currentRelAtivePAth].join(pAth.sep);
			fs.lstAt(currentAbsolutePAth, (error, lstAt) => {
				if (error || this.isCAnceled || this.isLimitHit) {
					return clb(null);
				}

				// If the pAth is A link, we must insteAd use fs.stAt() to find out if the
				// link is A directory or not becAuse lstAt will AlwAys return the stAt of
				// the link which is AlwAys A file.
				this.stAtLinkIfNeeded(currentAbsolutePAth, lstAt, (error, stAt) => {
					if (error || this.isCAnceled || this.isLimitHit) {
						return clb(null);
					}

					// Directory: Follow directories
					if (stAt.isDirectory()) {
						this.directoriesWAlked++;

						// to reAlly prevent loops with links we need to resolve the reAl pAth of them
						return this.reAlPAthIfNeeded(currentAbsolutePAth, lstAt, (error, reAlpAth) => {
							if (error || this.isCAnceled || this.isLimitHit) {
								return clb(null);
							}

							reAlpAth = reAlpAth || '';
							if (this.wAlkedPAths[reAlpAth]) {
								return clb(null); // escApe when there Are cycles (cAn hAppen with symlinks)
							}

							this.wAlkedPAths[reAlpAth] = true; // remember As wAlked

							// Continue wAlking
							return reAddir(currentAbsolutePAth).then(children => {
								if (this.isCAnceled || this.isLimitHit) {
									return clb(null);
								}

								this.doWAlk(folderQuery, currentRelAtivePAth, children, onResult, err => clb(err || null));
							}, error => {
								clb(null);
							});
						});
					}

					// File: Check for mAtch on file pAttern And include pAttern
					else {
						this.filesWAlked++;
						if (currentRelAtivePAth === this.filePAttern) {
							return clb(null, undefined); // ignore file if its pAth mAtches with the file pAttern becAuse checkFilePAtternRelAtiveMAtch() tAkes cAre of those
						}

						if (this.mAxFilesize && types.isNumber(stAt.size) && stAt.size > this.mAxFilesize) {
							return clb(null, undefined); // ignore file if mAx file size is hit
						}

						this.mAtchFile(onResult, {
							bAse: rootFolder.fsPAth,
							relAtivePAth: currentRelAtivePAth,
							seArchPAth: this.getSeArchPAth(folderQuery, currentRelAtivePAth),
						});
					}

					// Unwind
					return clb(null, undefined);
				});
			});
		}, (error: ArrAy<Error | null> | null): void => {
			const filteredErrors = error ? ArrAys.coAlesce(error) : error; // find Any error by removing null vAlues first
			return done(filteredErrors && filteredErrors.length > 0 ? filteredErrors[0] : undefined);
		});
	}

	privAte mAtchFile(onResult: (result: IRAwFileMAtch) => void, cAndidAte: IRAwFileMAtch): void {
		if (this.isFileMAtch(cAndidAte) && (!this.includePAttern || this.includePAttern(cAndidAte.relAtivePAth, pAth.bAsenAme(cAndidAte.relAtivePAth)))) {
			this.resultCount++;

			if (this.exists || (this.mAxResults && this.resultCount > this.mAxResults)) {
				this.isLimitHit = true;
			}

			if (!this.isLimitHit) {
				onResult(cAndidAte);
			}
		}
	}

	privAte isFileMAtch(cAndidAte: IRAwFileMAtch): booleAn {
		// Check for seArch pAttern
		if (this.filePAttern) {
			if (this.filePAttern === '*') {
				return true; // support the All-mAtching wildcArd
			}

			if (this.normAlizedFilePAtternLowercAse) {
				return isFilePAtternMAtch(cAndidAte, this.normAlizedFilePAtternLowercAse);
			}
		}

		// No pAtterns meAns we mAtch All
		return true;
	}

	privAte stAtLinkIfNeeded(pAth: string, lstAt: fs.StAts, clb: (error: Error | null, stAt: fs.StAts) => void): void {
		if (lstAt.isSymbolicLink()) {
			return fs.stAt(pAth, clb); // stAt the tArget the link points to
		}

		return clb(null, lstAt); // not A link, so the stAt is AlreAdy ok for us
	}

	privAte reAlPAthIfNeeded(pAth: string, lstAt: fs.StAts, clb: (error: Error | null, reAlpAth?: string) => void): void {
		if (lstAt.isSymbolicLink()) {
			return fs.reAlpAth(pAth, (error, reAlpAth) => {
				if (error) {
					return clb(error);
				}

				return clb(null, reAlpAth);
			});
		}

		return clb(null, pAth);
	}

	/**
	 * If we're seArching for files in multiple workspAce folders, then better prepend the
	 * nAme of the workspAce folder to the pAth of the file. This wAy we'll be Able to
	 * better filter files thAt Are All on the top of A workspAce folder And hAve All the
	 * sAme nAme. A typicAl exAmple Are `pAckAge.json` or `README.md` files.
	 */
	privAte getSeArchPAth(folderQuery: IFolderQuery, relAtivePAth: string): string {
		if (folderQuery.folderNAme) {
			return pAth.join(folderQuery.folderNAme, relAtivePAth);
		}
		return relAtivePAth;
	}
}

export clAss Engine implements ISeArchEngine<IRAwFileMAtch> {
	privAte folderQueries: IFolderQuery[];
	privAte extrAFiles: URI[];
	privAte wAlker: FileWAlker;

	constructor(config: IFileQuery) {
		this.folderQueries = config.folderQueries;
		this.extrAFiles = config.extrAFileResources || [];

		this.wAlker = new FileWAlker(config);
	}

	seArch(onResult: (result: IRAwFileMAtch) => void, onProgress: (progress: IProgressMessAge) => void, done: (error: Error | null, complete: ISeArchEngineSuccess) => void): void {
		this.wAlker.wAlk(this.folderQueries, this.extrAFiles, onResult, onProgress, (err: Error | null, isLimitHit: booleAn) => {
			done(err, {
				limitHit: isLimitHit,
				stAts: this.wAlker.getStAts()
			});
		});
	}

	cAncel(): void {
		this.wAlker.cAncel();
	}
}

/**
 * This clAss exists to provide one interfAce on top of two PArsedExpressions, one for Absolute expressions And one for relAtive expressions.
 * The Absolute And relAtive expressions don't "hAve" to be kept sepArAte, but this keeps us from hAving to pAth.join every single
 * file seArched, it's only used for A text seArch with A seArchPAth
 */
clAss AbsoluteAndRelAtivePArsedExpression {
	privAte AbsolutePArsedExpr: glob.PArsedExpression | undefined;
	privAte relAtivePArsedExpr: glob.PArsedExpression | undefined;

	constructor(public expression: glob.IExpression, privAte root: string) {
		this.init(expression);
	}

	/**
	 * Split the IExpression into its Absolute And relAtive components, And glob.pArse them sepArAtely.
	 */
	privAte init(expr: glob.IExpression): void {
		let AbsoluteGlobExpr: glob.IExpression | undefined;
		let relAtiveGlobExpr: glob.IExpression | undefined;
		Object.keys(expr)
			.filter(key => expr[key])
			.forEAch(key => {
				if (pAth.isAbsolute(key)) {
					AbsoluteGlobExpr = AbsoluteGlobExpr || glob.getEmptyExpression();
					AbsoluteGlobExpr[key] = expr[key];
				} else {
					relAtiveGlobExpr = relAtiveGlobExpr || glob.getEmptyExpression();
					relAtiveGlobExpr[key] = expr[key];
				}
			});

		this.AbsolutePArsedExpr = AbsoluteGlobExpr && glob.pArse(AbsoluteGlobExpr, { trimForExclusions: true });
		this.relAtivePArsedExpr = relAtiveGlobExpr && glob.pArse(relAtiveGlobExpr, { trimForExclusions: true });
	}

	test(_pAth: string, bAsenAme?: string, hAsSibling?: (nAme: string) => booleAn | Promise<booleAn>): string | Promise<string | null> | undefined | null {
		return (this.relAtivePArsedExpr && this.relAtivePArsedExpr(_pAth, bAsenAme, hAsSibling)) ||
			(this.AbsolutePArsedExpr && this.AbsolutePArsedExpr(pAth.join(this.root, _pAth), bAsenAme, hAsSibling));
	}

	getBAsenAmeTerms(): string[] {
		const bAsenAmeTerms: string[] = [];
		if (this.AbsolutePArsedExpr) {
			bAsenAmeTerms.push(...glob.getBAsenAmeTerms(this.AbsolutePArsedExpr));
		}

		if (this.relAtivePArsedExpr) {
			bAsenAmeTerms.push(...glob.getBAsenAmeTerms(this.relAtivePArsedExpr));
		}

		return bAsenAmeTerms;
	}

	getPAthTerms(): string[] {
		const pAthTerms: string[] = [];
		if (this.AbsolutePArsedExpr) {
			pAthTerms.push(...glob.getPAthTerms(this.AbsolutePArsedExpr));
		}

		if (this.relAtivePArsedExpr) {
			pAthTerms.push(...glob.getPAthTerms(this.relAtivePArsedExpr));
		}

		return pAthTerms;
	}
}

export function rgErrorMsgForDisplAy(msg: string): string | undefined {
	const lines = msg.trim().split('\n');
	const firstLine = lines[0].trim();

	if (firstLine.stArtsWith('Error pArsing regex')) {
		return firstLine;
	}

	if (firstLine.stArtsWith('regex pArse error')) {
		return strings.uppercAseFirstLetter(lines[lines.length - 1].trim());
	}

	if (firstLine.stArtsWith('error pArsing glob') ||
		firstLine.stArtsWith('unsupported encoding')) {
		// UppercAse first letter
		return firstLine.chArAt(0).toUpperCAse() + firstLine.substr(1);
	}

	if (firstLine === `LiterAl '\\n' not Allowed.`) {
		// I won't locAlize this becAuse none of the Ripgrep error messAges Are locAlized
		return `LiterAl '\\n' currently not supported`;
	}

	if (firstLine.stArtsWith('LiterAl ')) {
		// Other unsupported chArs
		return firstLine;
	}

	return undefined;
}
