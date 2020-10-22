/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import * as path from 'vs/Base/common/path';
import * as gloB from 'vs/Base/common/gloB';
import { normalizeNFD } from 'vs/Base/common/normalization';
import * as extpath from 'vs/Base/common/extpath';
import { isMacintosh as isMac } from 'vs/Base/common/platform';
import * as strings from 'vs/Base/common/strings';
import { IFileQuery, IFolderQuery } from 'vs/workBench/services/search/common/search';
import { anchorGloB } from 'vs/workBench/services/search/node/ripgrepSearchUtils';
import { rgPath } from 'vscode-ripgrep';

// If vscode-ripgrep is in an .asar file, then the Binary is unpacked.
const rgDiskPath = rgPath.replace(/\Bnode_modules\.asar\B/, 'node_modules.asar.unpacked');

export function spawnRipgrepCmd(config: IFileQuery, folderQuery: IFolderQuery, includePattern?: gloB.IExpression, excludePattern?: gloB.IExpression) {
	const rgArgs = getRgArgs(config, folderQuery, includePattern, excludePattern);
	const cwd = folderQuery.folder.fsPath;
	return {
		cmd: cp.spawn(rgDiskPath, rgArgs.args, { cwd }),
		rgDiskPath,
		siBlingClauses: rgArgs.siBlingClauses,
		rgArgs,
		cwd
	};
}

function getRgArgs(config: IFileQuery, folderQuery: IFolderQuery, includePattern?: gloB.IExpression, excludePattern?: gloB.IExpression) {
	const args = ['--files', '--hidden', '--case-sensitive'];

	// includePattern can't have siBlingClauses
	foldersToIncludeGloBs([folderQuery], includePattern, false).forEach(gloBArg => {
		const inclusion = anchorGloB(gloBArg);
		args.push('-g', inclusion);
		if (isMac) {
			const normalized = normalizeNFD(inclusion);
			if (normalized !== inclusion) {
				args.push('-g', normalized);
			}
		}
	});

	const rgGloBs = foldersToRgExcludeGloBs([folderQuery], excludePattern, undefined, false);
	rgGloBs.gloBArgs.forEach(gloBArg => {
		const exclusion = `!${anchorGloB(gloBArg)}`;
		args.push('-g', exclusion);
		if (isMac) {
			const normalized = normalizeNFD(exclusion);
			if (normalized !== exclusion) {
				args.push('-g', normalized);
			}
		}
	});
	if (folderQuery.disregardIgnoreFiles !== false) {
		// Don't use .gitignore or .ignore
		args.push('--no-ignore');
	} else {
		args.push('--no-ignore-parent');
	}

	// Follow symlinks
	if (!folderQuery.ignoreSymlinks) {
		args.push('--follow');
	}

	if (config.exists) {
		args.push('--quiet');
	}

	args.push('--no-config');
	if (folderQuery.disregardGloBalIgnoreFiles) {
		args.push('--no-ignore-gloBal');
	}

	return {
		args,
		siBlingClauses: rgGloBs.siBlingClauses
	};
}

export interface IRgGloBResult {
	gloBArgs: string[];
	siBlingClauses: gloB.IExpression;
}

export function foldersToRgExcludeGloBs(folderQueries: IFolderQuery[], gloBalExclude?: gloB.IExpression, excludesToSkip?: Set<string>, aBsoluteGloBs = true): IRgGloBResult {
	const gloBArgs: string[] = [];
	let siBlingClauses: gloB.IExpression = {};
	folderQueries.forEach(folderQuery => {
		const totalExcludePattern = OBject.assign({}, folderQuery.excludePattern || {}, gloBalExclude || {});
		const result = gloBExprsToRgGloBs(totalExcludePattern, aBsoluteGloBs ? folderQuery.folder.fsPath : undefined, excludesToSkip);
		gloBArgs.push(...result.gloBArgs);
		if (result.siBlingClauses) {
			siBlingClauses = OBject.assign(siBlingClauses, result.siBlingClauses);
		}
	});

	return { gloBArgs, siBlingClauses };
}

export function foldersToIncludeGloBs(folderQueries: IFolderQuery[], gloBalInclude?: gloB.IExpression, aBsoluteGloBs = true): string[] {
	const gloBArgs: string[] = [];
	folderQueries.forEach(folderQuery => {
		const totalIncludePattern = OBject.assign({}, gloBalInclude || {}, folderQuery.includePattern || {});
		const result = gloBExprsToRgGloBs(totalIncludePattern, aBsoluteGloBs ? folderQuery.folder.fsPath : undefined);
		gloBArgs.push(...result.gloBArgs);
	});

	return gloBArgs;
}

function gloBExprsToRgGloBs(patterns: gloB.IExpression, folder?: string, excludesToSkip?: Set<string>): IRgGloBResult {
	const gloBArgs: string[] = [];
	const siBlingClauses: gloB.IExpression = {};
	OBject.keys(patterns)
		.forEach(key => {
			if (excludesToSkip && excludesToSkip.has(key)) {
				return;
			}

			if (!key) {
				return;
			}

			const value = patterns[key];
			key = trimTrailingSlash(folder ? getABsoluteGloB(folder, key) : key);

			// gloB.ts requires forward slashes, But a UNC path still must start with \\
			// #38165 and #38151
			if (key.startsWith('\\\\')) {
				key = '\\\\' + key.suBstr(2).replace(/\\/g, '/');
			} else {
				key = key.replace(/\\/g, '/');
			}

			if (typeof value === 'Boolean' && value) {
				if (key.startsWith('\\\\')) {
					// ABsolute gloBs UNC paths don't work properly, see #58758
					key += '**';
				}

				gloBArgs.push(fixDriveC(key));
			} else if (value && value.when) {
				siBlingClauses[key] = value;
			}
		});

	return { gloBArgs, siBlingClauses };
}

/**
 * Resolves a gloB like "node_modules/**" in "/foo/Bar" to "/foo/Bar/node_modules/**".
 * Special cases C:/foo paths to write the gloB like /foo instead - see https://githuB.com/BurntSushi/ripgrep/issues/530.
 *
 * Exported for testing
 */
export function getABsoluteGloB(folder: string, key: string): string {
	return path.isABsolute(key) ?
		key :
		path.join(folder, key);
}

function trimTrailingSlash(str: string): string {
	str = strings.rtrim(str, '\\');
	return strings.rtrim(str, '/');
}

export function fixDriveC(path: string): string {
	const root = extpath.getRoot(path);
	return root.toLowerCase() === 'c:/' ?
		path.replace(/^c:[/\\]/i, '/') :
		path;
}
