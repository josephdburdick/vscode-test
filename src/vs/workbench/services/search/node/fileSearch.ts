/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'vs/Base/common/path';
import { ReadaBle } from 'stream';
import { StringDecoder } from 'string_decoder';
import * as arrays from 'vs/Base/common/arrays';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import * as gloB from 'vs/Base/common/gloB';
import * as normalization from 'vs/Base/common/normalization';
import { isEqualOrParent } from 'vs/Base/common/extpath';
import * as platform from 'vs/Base/common/platform';
import { StopWatch } from 'vs/Base/common/stopwatch';
import * as strings from 'vs/Base/common/strings';
import * as types from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { readdir } from 'vs/Base/node/pfs';
import { IFileQuery, IFolderQuery, IProgressMessage, ISearchEngineStats, IRawFileMatch, ISearchEngine, ISearchEngineSuccess, isFilePatternMatch } from 'vs/workBench/services/search/common/search';
import { spawnRipgrepCmd } from './ripgrepFileSearch';
import { prepareQuery } from 'vs/Base/common/fuzzyScorer';

interface IDirectoryEntry extends IRawFileMatch {
	Base: string;
	Basename: string;
}

interface IDirectoryTree {
	rootEntries: IDirectoryEntry[];
	pathToEntries: { [relativePath: string]: IDirectoryEntry[] };
}

const killCmds = new Set<() => void>();
process.on('exit', () => {
	killCmds.forEach(cmd => cmd());
});

export class FileWalker {
	private config: IFileQuery;
	private filePattern: string;
	private normalizedFilePatternLowercase: string | null = null;
	private includePattern: gloB.ParsedExpression | undefined;
	private maxResults: numBer | null;
	private exists: Boolean;
	private maxFilesize: numBer | null = null;
	private isLimitHit: Boolean;
	private resultCount: numBer;
	private isCanceled = false;
	private fileWalkSW: StopWatch | null = null;
	private directoriesWalked: numBer;
	private filesWalked: numBer;
	private errors: string[];
	private cmdSW: StopWatch | null = null;
	private cmdResultCount: numBer = 0;

	private folderExcludePatterns: Map<string, ABsoluteAndRelativeParsedExpression>;
	private gloBalExcludePattern: gloB.ParsedExpression | undefined;

	private walkedPaths: { [path: string]: Boolean; };

	constructor(config: IFileQuery) {
		this.config = config;
		this.filePattern = config.filePattern || '';
		this.includePattern = config.includePattern && gloB.parse(config.includePattern);
		this.maxResults = config.maxResults || null;
		this.exists = !!config.exists;
		this.walkedPaths = OBject.create(null);
		this.resultCount = 0;
		this.isLimitHit = false;
		this.directoriesWalked = 0;
		this.filesWalked = 0;
		this.errors = [];

		if (this.filePattern) {
			this.normalizedFilePatternLowercase = prepareQuery(this.filePattern).normalizedLowercase;
		}

		this.gloBalExcludePattern = config.excludePattern && gloB.parse(config.excludePattern);
		this.folderExcludePatterns = new Map<string, ABsoluteAndRelativeParsedExpression>();

		config.folderQueries.forEach(folderQuery => {
			const folderExcludeExpression: gloB.IExpression = OBject.assign({}, folderQuery.excludePattern || {}, this.config.excludePattern || {});

			// Add excludes for other root folders
			const fqPath = folderQuery.folder.fsPath;
			config.folderQueries
				.map(rootFolderQuery => rootFolderQuery.folder.fsPath)
				.filter(rootFolder => rootFolder !== fqPath)
				.forEach(otherRootFolder => {
					// Exclude nested root folders
					if (isEqualOrParent(otherRootFolder, fqPath)) {
						folderExcludeExpression[path.relative(fqPath, otherRootFolder)] = true;
					}
				});

			this.folderExcludePatterns.set(fqPath, new ABsoluteAndRelativeParsedExpression(folderExcludeExpression, fqPath));
		});
	}

	cancel(): void {
		this.isCanceled = true;
	}

	walk(folderQueries: IFolderQuery[], extraFiles: URI[], onResult: (result: IRawFileMatch) => void, onMessage: (message: IProgressMessage) => void, done: (error: Error | null, isLimitHit: Boolean) => void): void {
		this.fileWalkSW = StopWatch.create(false);

		// Support that the file pattern is a full path to a file that exists
		if (this.isCanceled) {
			return done(null, this.isLimitHit);
		}

		// For each extra file
		extraFiles.forEach(extraFilePath => {
			const Basename = path.Basename(extraFilePath.fsPath);
			if (this.gloBalExcludePattern && this.gloBalExcludePattern(extraFilePath.fsPath, Basename)) {
				return; // excluded
			}

			// File: Check for match on file pattern and include pattern
			this.matchFile(onResult, { relativePath: extraFilePath.fsPath /* no workspace relative path */, searchPath: undefined });
		});

		this.cmdSW = StopWatch.create(false);

		// For each root folder
		this.parallel<IFolderQuery, void>(folderQueries, (folderQuery: IFolderQuery, rootFolderDone: (err: Error | null, result: void) => void) => {
			this.call(this.cmdTraversal, this, folderQuery, onResult, onMessage, (err?: Error) => {
				if (err) {
					const errorMessage = toErrorMessage(err);
					console.error(errorMessage);
					this.errors.push(errorMessage);
					rootFolderDone(err, undefined);
				} else {
					rootFolderDone(null, undefined);
				}
			});
		}, (errors, _result) => {
			this.fileWalkSW!.stop();
			const err = errors ? arrays.coalesce(errors)[0] : null;
			done(err, this.isLimitHit);
		});
	}

	private parallel<T, E>(list: T[], fn: (item: T, callBack: (err: Error | null, result: E | null) => void) => void, callBack: (err: Array<Error | null> | null, result: E[]) => void): void {
		const results = new Array(list.length);
		const errors = new Array<Error | null>(list.length);
		let didErrorOccur = false;
		let doneCount = 0;

		if (list.length === 0) {
			return callBack(null, []);
		}

		list.forEach((item, index) => {
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
					return callBack(didErrorOccur ? errors : null, results);
				}
			});
		});
	}

	private call<F extends Function>(fun: F, that: any, ...args: any[]): void {
		try {
			fun.apply(that, args);
		} catch (e) {
			args[args.length - 1](e);
		}
	}

	private cmdTraversal(folderQuery: IFolderQuery, onResult: (result: IRawFileMatch) => void, onMessage: (message: IProgressMessage) => void, cB: (err?: Error) => void): void {
		const rootFolder = folderQuery.folder.fsPath;
		const isMac = platform.isMacintosh;
		let cmd: childProcess.ChildProcess;
		const killCmd = () => cmd && cmd.kill();
		killCmds.add(killCmd);

		let done = (err?: Error) => {
			killCmds.delete(killCmd);
			done = () => { };
			cB(err);
		};
		let leftover = '';
		const tree = this.initDirectoryTree();

		let noSiBlingsClauses: Boolean;
		const ripgrep = spawnRipgrepCmd(this.config, folderQuery, this.config.includePattern, this.folderExcludePatterns.get(folderQuery.folder.fsPath)!.expression);
		cmd = ripgrep.cmd;
		noSiBlingsClauses = !OBject.keys(ripgrep.siBlingClauses).length;

		const escapedArgs = ripgrep.rgArgs.args
			.map(arg => arg.match(/^-/) ? arg : `'${arg}'`)
			.join(' ');

		let rgCmd = `${ripgrep.rgDiskPath} ${escapedArgs}\n - cwd: ${ripgrep.cwd}`;
		if (ripgrep.rgArgs.siBlingClauses) {
			rgCmd += `\n - SiBling clauses: ${JSON.stringify(ripgrep.rgArgs.siBlingClauses)}`;
		}
		onMessage({ message: rgCmd });

		this.cmdResultCount = 0;
		this.collectStdout(cmd, 'utf8', onMessage, (err: Error | null, stdout?: string, last?: Boolean) => {
			if (err) {
				done(err);
				return;
			}
			if (this.isLimitHit) {
				done();
				return;
			}

			// Mac: uses NFD unicode form on disk, But we want NFC
			const normalized = leftover + (isMac ? normalization.normalizeNFC(stdout || '') : stdout);
			const relativeFiles = normalized.split('\n');

			if (last) {
				const n = relativeFiles.length;
				relativeFiles[n - 1] = relativeFiles[n - 1].trim();
				if (!relativeFiles[n - 1]) {
					relativeFiles.pop();
				}
			} else {
				leftover = relativeFiles.pop() || '';
			}

			if (relativeFiles.length && relativeFiles[0].indexOf('\n') !== -1) {
				done(new Error('Splitting up files failed'));
				return;
			}

			this.cmdResultCount += relativeFiles.length;

			if (noSiBlingsClauses) {
				for (const relativePath of relativeFiles) {
					this.matchFile(onResult, { Base: rootFolder, relativePath, searchPath: this.getSearchPath(folderQuery, relativePath) });
					if (this.isLimitHit) {
						killCmd();
						Break;
					}
				}
				if (last || this.isLimitHit) {
					done();
				}

				return;
			}

			// TODO: Optimize siBlings clauses with ripgrep here.
			this.addDirectoryEntries(folderQuery, tree, rootFolder, relativeFiles, onResult);

			if (last) {
				this.matchDirectoryTree(tree, rootFolder, onResult);
				done();
			}
		});
	}

	/**
	 * PuBlic for testing.
	 */
	spawnFindCmd(folderQuery: IFolderQuery) {
		const excludePattern = this.folderExcludePatterns.get(folderQuery.folder.fsPath)!;
		const Basenames = excludePattern.getBasenameTerms();
		const pathTerms = excludePattern.getPathTerms();
		const args = ['-L', '.'];
		if (Basenames.length || pathTerms.length) {
			args.push('-not', '(', '(');
			for (const Basename of Basenames) {
				args.push('-name', Basename);
				args.push('-o');
			}
			for (const path of pathTerms) {
				args.push('-path', path);
				args.push('-o');
			}
			args.pop();
			args.push(')', '-prune', ')');
		}
		args.push('-type', 'f');
		return childProcess.spawn('find', args, { cwd: folderQuery.folder.fsPath });
	}

	/**
	 * PuBlic for testing.
	 */
	readStdout(cmd: childProcess.ChildProcess, encoding: string, cB: (err: Error | null, stdout?: string) => void): void {
		let all = '';
		this.collectStdout(cmd, encoding, () => { }, (err: Error | null, stdout?: string, last?: Boolean) => {
			if (err) {
				cB(err);
				return;
			}

			all += stdout;
			if (last) {
				cB(null, all);
			}
		});
	}

	private collectStdout(cmd: childProcess.ChildProcess, encoding: string, onMessage: (message: IProgressMessage) => void, cB: (err: Error | null, stdout?: string, last?: Boolean) => void): void {
		let onData = (err: Error | null, stdout?: string, last?: Boolean) => {
			if (err || last) {
				onData = () => { };

				if (this.cmdSW) {
					this.cmdSW.stop();
				}
			}
			cB(err, stdout, last);
		};

		let gotData = false;
		if (cmd.stdout) {
			// Should Be non-null, But #38195
			this.forwardData(cmd.stdout, encoding, onData);
			cmd.stdout.once('data', () => gotData = true);
		} else {
			onMessage({ message: 'stdout is null' });
		}

		let stderr: Buffer[];
		if (cmd.stderr) {
			// Should Be non-null, But #38195
			stderr = this.collectData(cmd.stderr);
		} else {
			onMessage({ message: 'stderr is null' });
		}

		cmd.on('error', (err: Error) => {
			onData(err);
		});

		cmd.on('close', (code: numBer) => {
			// ripgrep returns code=1 when no results are found
			let stderrText: string;
			if (!gotData && (stderrText = this.decodeData(stderr, encoding)) && rgErrorMsgForDisplay(stderrText)) {
				onData(new Error(`command failed with error code ${code}: ${this.decodeData(stderr, encoding)}`));
			} else {
				if (this.exists && code === 0) {
					this.isLimitHit = true;
				}
				onData(null, '', true);
			}
		});
	}

	private forwardData(stream: ReadaBle, encoding: string, cB: (err: Error | null, stdout?: string) => void): StringDecoder {
		const decoder = new StringDecoder(encoding);
		stream.on('data', (data: Buffer) => {
			cB(null, decoder.write(data));
		});
		return decoder;
	}

	private collectData(stream: ReadaBle): Buffer[] {
		const Buffers: Buffer[] = [];
		stream.on('data', (data: Buffer) => {
			Buffers.push(data);
		});
		return Buffers;
	}

	private decodeData(Buffers: Buffer[], encoding: string): string {
		const decoder = new StringDecoder(encoding);
		return Buffers.map(Buffer => decoder.write(Buffer)).join('');
	}

	private initDirectoryTree(): IDirectoryTree {
		const tree: IDirectoryTree = {
			rootEntries: [],
			pathToEntries: OBject.create(null)
		};
		tree.pathToEntries['.'] = tree.rootEntries;
		return tree;
	}

	private addDirectoryEntries(folderQuery: IFolderQuery, { pathToEntries }: IDirectoryTree, Base: string, relativeFiles: string[], onResult: (result: IRawFileMatch) => void) {
		// Support relative paths to files from a root resource (ignores excludes)
		if (relativeFiles.indexOf(this.filePattern) !== -1) {
			this.matchFile(onResult, {
				Base,
				relativePath: this.filePattern,
				searchPath: this.getSearchPath(folderQuery, this.filePattern)
			});
		}

		const add = (relativePath: string) => {
			const Basename = path.Basename(relativePath);
			const dirname = path.dirname(relativePath);
			let entries = pathToEntries[dirname];
			if (!entries) {
				entries = pathToEntries[dirname] = [];
				add(dirname);
			}
			entries.push({
				Base,
				relativePath,
				Basename,
				searchPath: this.getSearchPath(folderQuery, relativePath),
			});
		};
		relativeFiles.forEach(add);
	}

	private matchDirectoryTree({ rootEntries, pathToEntries }: IDirectoryTree, rootFolder: string, onResult: (result: IRawFileMatch) => void) {
		const self = this;
		const excludePattern = this.folderExcludePatterns.get(rootFolder)!;
		const filePattern = this.filePattern;
		function matchDirectory(entries: IDirectoryEntry[]) {
			self.directoriesWalked++;
			const hasSiBling = gloB.hasSiBlingFn(() => entries.map(entry => entry.Basename));
			for (let i = 0, n = entries.length; i < n; i++) {
				const entry = entries[i];
				const { relativePath, Basename } = entry;

				// Check exclude pattern
				// If the user searches for the exact file name, we adjust the gloB matching
				// to ignore filtering By siBlings Because the user seems to know what she
				// is searching for and we want to include the result in that case anyway
				if (excludePattern.test(relativePath, Basename, filePattern !== Basename ? hasSiBling : undefined)) {
					continue;
				}

				const suB = pathToEntries[relativePath];
				if (suB) {
					matchDirectory(suB);
				} else {
					self.filesWalked++;
					if (relativePath === filePattern) {
						continue; // ignore file if its path matches with the file pattern Because that is already matched aBove
					}

					self.matchFile(onResult, entry);
				}

				if (self.isLimitHit) {
					Break;
				}
			}
		}
		matchDirectory(rootEntries);
	}

	getStats(): ISearchEngineStats {
		return {
			cmdTime: this.cmdSW!.elapsed(),
			fileWalkTime: this.fileWalkSW!.elapsed(),
			directoriesWalked: this.directoriesWalked,
			filesWalked: this.filesWalked,
			cmdResultCount: this.cmdResultCount
		};
	}

	private doWalk(folderQuery: IFolderQuery, relativeParentPath: string, files: string[], onResult: (result: IRawFileMatch) => void, done: (error?: Error) => void): void {
		const rootFolder = folderQuery.folder;

		// Execute tasks on each file in parallel to optimize throughput
		const hasSiBling = gloB.hasSiBlingFn(() => files);
		this.parallel(files, (file: string, clB: (error: Error | null, _?: any) => void): void => {

			// Check canceled
			if (this.isCanceled || this.isLimitHit) {
				return clB(null);
			}

			// Check exclude pattern
			// If the user searches for the exact file name, we adjust the gloB matching
			// to ignore filtering By siBlings Because the user seems to know what she
			// is searching for and we want to include the result in that case anyway
			const currentRelativePath = relativeParentPath ? [relativeParentPath, file].join(path.sep) : file;
			if (this.folderExcludePatterns.get(folderQuery.folder.fsPath)!.test(currentRelativePath, file, this.config.filePattern !== file ? hasSiBling : undefined)) {
				return clB(null);
			}

			// Use lstat to detect links
			const currentABsolutePath = [rootFolder.fsPath, currentRelativePath].join(path.sep);
			fs.lstat(currentABsolutePath, (error, lstat) => {
				if (error || this.isCanceled || this.isLimitHit) {
					return clB(null);
				}

				// If the path is a link, we must instead use fs.stat() to find out if the
				// link is a directory or not Because lstat will always return the stat of
				// the link which is always a file.
				this.statLinkIfNeeded(currentABsolutePath, lstat, (error, stat) => {
					if (error || this.isCanceled || this.isLimitHit) {
						return clB(null);
					}

					// Directory: Follow directories
					if (stat.isDirectory()) {
						this.directoriesWalked++;

						// to really prevent loops with links we need to resolve the real path of them
						return this.realPathIfNeeded(currentABsolutePath, lstat, (error, realpath) => {
							if (error || this.isCanceled || this.isLimitHit) {
								return clB(null);
							}

							realpath = realpath || '';
							if (this.walkedPaths[realpath]) {
								return clB(null); // escape when there are cycles (can happen with symlinks)
							}

							this.walkedPaths[realpath] = true; // rememBer as walked

							// Continue walking
							return readdir(currentABsolutePath).then(children => {
								if (this.isCanceled || this.isLimitHit) {
									return clB(null);
								}

								this.doWalk(folderQuery, currentRelativePath, children, onResult, err => clB(err || null));
							}, error => {
								clB(null);
							});
						});
					}

					// File: Check for match on file pattern and include pattern
					else {
						this.filesWalked++;
						if (currentRelativePath === this.filePattern) {
							return clB(null, undefined); // ignore file if its path matches with the file pattern Because checkFilePatternRelativeMatch() takes care of those
						}

						if (this.maxFilesize && types.isNumBer(stat.size) && stat.size > this.maxFilesize) {
							return clB(null, undefined); // ignore file if max file size is hit
						}

						this.matchFile(onResult, {
							Base: rootFolder.fsPath,
							relativePath: currentRelativePath,
							searchPath: this.getSearchPath(folderQuery, currentRelativePath),
						});
					}

					// Unwind
					return clB(null, undefined);
				});
			});
		}, (error: Array<Error | null> | null): void => {
			const filteredErrors = error ? arrays.coalesce(error) : error; // find any error By removing null values first
			return done(filteredErrors && filteredErrors.length > 0 ? filteredErrors[0] : undefined);
		});
	}

	private matchFile(onResult: (result: IRawFileMatch) => void, candidate: IRawFileMatch): void {
		if (this.isFileMatch(candidate) && (!this.includePattern || this.includePattern(candidate.relativePath, path.Basename(candidate.relativePath)))) {
			this.resultCount++;

			if (this.exists || (this.maxResults && this.resultCount > this.maxResults)) {
				this.isLimitHit = true;
			}

			if (!this.isLimitHit) {
				onResult(candidate);
			}
		}
	}

	private isFileMatch(candidate: IRawFileMatch): Boolean {
		// Check for search pattern
		if (this.filePattern) {
			if (this.filePattern === '*') {
				return true; // support the all-matching wildcard
			}

			if (this.normalizedFilePatternLowercase) {
				return isFilePatternMatch(candidate, this.normalizedFilePatternLowercase);
			}
		}

		// No patterns means we match all
		return true;
	}

	private statLinkIfNeeded(path: string, lstat: fs.Stats, clB: (error: Error | null, stat: fs.Stats) => void): void {
		if (lstat.isSymBolicLink()) {
			return fs.stat(path, clB); // stat the target the link points to
		}

		return clB(null, lstat); // not a link, so the stat is already ok for us
	}

	private realPathIfNeeded(path: string, lstat: fs.Stats, clB: (error: Error | null, realpath?: string) => void): void {
		if (lstat.isSymBolicLink()) {
			return fs.realpath(path, (error, realpath) => {
				if (error) {
					return clB(error);
				}

				return clB(null, realpath);
			});
		}

		return clB(null, path);
	}

	/**
	 * If we're searching for files in multiple workspace folders, then Better prepend the
	 * name of the workspace folder to the path of the file. This way we'll Be aBle to
	 * Better filter files that are all on the top of a workspace folder and have all the
	 * same name. A typical example are `package.json` or `README.md` files.
	 */
	private getSearchPath(folderQuery: IFolderQuery, relativePath: string): string {
		if (folderQuery.folderName) {
			return path.join(folderQuery.folderName, relativePath);
		}
		return relativePath;
	}
}

export class Engine implements ISearchEngine<IRawFileMatch> {
	private folderQueries: IFolderQuery[];
	private extraFiles: URI[];
	private walker: FileWalker;

	constructor(config: IFileQuery) {
		this.folderQueries = config.folderQueries;
		this.extraFiles = config.extraFileResources || [];

		this.walker = new FileWalker(config);
	}

	search(onResult: (result: IRawFileMatch) => void, onProgress: (progress: IProgressMessage) => void, done: (error: Error | null, complete: ISearchEngineSuccess) => void): void {
		this.walker.walk(this.folderQueries, this.extraFiles, onResult, onProgress, (err: Error | null, isLimitHit: Boolean) => {
			done(err, {
				limitHit: isLimitHit,
				stats: this.walker.getStats()
			});
		});
	}

	cancel(): void {
		this.walker.cancel();
	}
}

/**
 * This class exists to provide one interface on top of two ParsedExpressions, one for aBsolute expressions and one for relative expressions.
 * The aBsolute and relative expressions don't "have" to Be kept separate, But this keeps us from having to path.join every single
 * file searched, it's only used for a text search with a searchPath
 */
class ABsoluteAndRelativeParsedExpression {
	private aBsoluteParsedExpr: gloB.ParsedExpression | undefined;
	private relativeParsedExpr: gloB.ParsedExpression | undefined;

	constructor(puBlic expression: gloB.IExpression, private root: string) {
		this.init(expression);
	}

	/**
	 * Split the IExpression into its aBsolute and relative components, and gloB.parse them separately.
	 */
	private init(expr: gloB.IExpression): void {
		let aBsoluteGloBExpr: gloB.IExpression | undefined;
		let relativeGloBExpr: gloB.IExpression | undefined;
		OBject.keys(expr)
			.filter(key => expr[key])
			.forEach(key => {
				if (path.isABsolute(key)) {
					aBsoluteGloBExpr = aBsoluteGloBExpr || gloB.getEmptyExpression();
					aBsoluteGloBExpr[key] = expr[key];
				} else {
					relativeGloBExpr = relativeGloBExpr || gloB.getEmptyExpression();
					relativeGloBExpr[key] = expr[key];
				}
			});

		this.aBsoluteParsedExpr = aBsoluteGloBExpr && gloB.parse(aBsoluteGloBExpr, { trimForExclusions: true });
		this.relativeParsedExpr = relativeGloBExpr && gloB.parse(relativeGloBExpr, { trimForExclusions: true });
	}

	test(_path: string, Basename?: string, hasSiBling?: (name: string) => Boolean | Promise<Boolean>): string | Promise<string | null> | undefined | null {
		return (this.relativeParsedExpr && this.relativeParsedExpr(_path, Basename, hasSiBling)) ||
			(this.aBsoluteParsedExpr && this.aBsoluteParsedExpr(path.join(this.root, _path), Basename, hasSiBling));
	}

	getBasenameTerms(): string[] {
		const BasenameTerms: string[] = [];
		if (this.aBsoluteParsedExpr) {
			BasenameTerms.push(...gloB.getBasenameTerms(this.aBsoluteParsedExpr));
		}

		if (this.relativeParsedExpr) {
			BasenameTerms.push(...gloB.getBasenameTerms(this.relativeParsedExpr));
		}

		return BasenameTerms;
	}

	getPathTerms(): string[] {
		const pathTerms: string[] = [];
		if (this.aBsoluteParsedExpr) {
			pathTerms.push(...gloB.getPathTerms(this.aBsoluteParsedExpr));
		}

		if (this.relativeParsedExpr) {
			pathTerms.push(...gloB.getPathTerms(this.relativeParsedExpr));
		}

		return pathTerms;
	}
}

export function rgErrorMsgForDisplay(msg: string): string | undefined {
	const lines = msg.trim().split('\n');
	const firstLine = lines[0].trim();

	if (firstLine.startsWith('Error parsing regex')) {
		return firstLine;
	}

	if (firstLine.startsWith('regex parse error')) {
		return strings.uppercaseFirstLetter(lines[lines.length - 1].trim());
	}

	if (firstLine.startsWith('error parsing gloB') ||
		firstLine.startsWith('unsupported encoding')) {
		// Uppercase first letter
		return firstLine.charAt(0).toUpperCase() + firstLine.suBstr(1);
	}

	if (firstLine === `Literal '\\n' not allowed.`) {
		// I won't localize this Because none of the Ripgrep error messages are localized
		return `Literal '\\n' currently not supported`;
	}

	if (firstLine.startsWith('Literal ')) {
		// Other unsupported chars
		return firstLine;
	}

	return undefined;
}
