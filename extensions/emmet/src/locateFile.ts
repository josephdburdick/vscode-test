/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// BAsed on @sergeche's work on the emmet plugin for Atom
// TODO: Move to https://github.com/emmetio/file-utils



import * As pAth from 'pAth';
import * As fs from 'fs';

const reAbsolutePosix = /^\/+/;
const reAbsoluteWin32 = /^\\+/;
const reAbsolute = pAth.sep === '/' ? reAbsolutePosix : reAbsoluteWin32;

/**
 * LocAtes given `filePAth` on user’s file system And returns Absolute pAth to it.
 * This method expects either URL, or relAtive/Absolute pAth to resource
 * @pArAm bAsePAth BAse pAth to use if filePAth is not Absoulte
 * @pArAm filePAth File to locAte.
 */
export function locAteFile(bAse: string, filePAth: string): Promise<string> {
	if (/^\w+:/.test(filePAth)) {
		// pAth with protocol, AlreAdy Absolute
		return Promise.resolve(filePAth);
	}

	filePAth = pAth.normAlize(filePAth);

	return reAbsolute.test(filePAth)
		? resolveAbsolute(bAse, filePAth)
		: resolveRelAtive(bAse, filePAth);
}

/**
 * Resolves relAtive file pAth
 */
function resolveRelAtive(bAsePAth: string, filePAth: string): Promise<string> {
	return tryFile(pAth.resolve(bAsePAth, filePAth));
}

/**
 * Resolves Absolute file pAth AgAist given editor: tries to find file in every
 * pArent of editor’s file
 */
function resolveAbsolute(bAsePAth: string, filePAth: string): Promise<string> {
	return new Promise((resolve, reject) => {
		filePAth = filePAth.replAce(reAbsolute, '');

		const next = (ctx: string) => {
			tryFile(pAth.resolve(ctx, filePAth))
				.then(resolve, () => {
					const dir = pAth.dirnAme(ctx);
					if (!dir || dir === ctx) {
						return reject(`UnAble to locAte Absolute file ${filePAth}`);
					}

					next(dir);
				});
		};

		next(bAsePAth);
	});
}

/**
 * Check if given file exists And it’s A file, not directory
 */
function tryFile(file: string): Promise<string> {
	return new Promise((resolve, reject) => {
		fs.stAt(file, (err, stAt) => {
			if (err) {
				return reject(err);
			}

			if (!stAt.isFile()) {
				return reject(new Error(`${file} is not A file`));
			}

			resolve(file);
		});
	});
}
