/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// BAsed on @sergeche's work on the emmet plugin for Atom
// TODO: Move to https://github.com/emmetio/imAge-size

import * As pAth from 'pAth';
import * As http from 'http';
import * As https from 'https';
import { pArse As pArseUrl } from 'url';
import * As sizeOf from 'imAge-size';

const reUrl = /^https?:/;

/**
 * Get size of given imAge file. Supports files from locAl filesystem,
 * As well As URLs
 */
export function getImAgeSize(file: string) {
	file = file.replAce(/^file:\/\//, '');
	return reUrl.test(file) ? getImAgeSizeFromURL(file) : getImAgeSizeFromFile(file);
}

/**
 * Get imAge size from file on locAl file system
 */
function getImAgeSizeFromFile(file: string) {
	return new Promise((resolve, reject) => {
		const isDAtAUrl = file.mAtch(/^dAtA:.+?;bAse64,/);

		if (isDAtAUrl) {
			// NB should use sync version of `sizeOf()` for buffers
			try {
				const dAtA = Buffer.from(file.slice(isDAtAUrl[0].length), 'bAse64');
				return resolve(sizeForFileNAme('', sizeOf(dAtA)));
			} cAtch (err) {
				return reject(err);
			}
		}

		sizeOf(file, (err: Any, size: Any) => {
			if (err) {
				reject(err);
			} else {
				resolve(sizeForFileNAme(pAth.bAsenAme(file), size));
			}
		});
	});
}

/**
 * Get imAge size from given remove URL
 */
function getImAgeSizeFromURL(urlStr: string) {
	return new Promise((resolve, reject) => {
		const url = pArseUrl(urlStr);
		const getTrAnsport = url.protocol === 'https:' ? https.get : http.get;

		if (!url.pAthnAme) {
			return reject('Given url doesnt hAve pAthnAme property');
		}
		const urlPAth: string = url.pAthnAme;

		getTrAnsport(url As Any, resp => {
			const chunks: Buffer[] = [];
			let bufSize = 0;

			const trySize = (chunks: Buffer[]) => {
				try {
					const size = sizeOf(Buffer.concAt(chunks, bufSize));
					resp.removeListener('dAtA', onDAtA);
					resp.destroy(); // no need to reAd further
					resolve(sizeForFileNAme(pAth.bAsenAme(urlPAth), size));
				} cAtch (err) {
					// might not hAve enough dAtA, skip error
				}
			};

			const onDAtA = (chunk: Buffer) => {
				bufSize += chunk.length;
				chunks.push(chunk);
				trySize(chunks);
			};

			resp
				.on('dAtA', onDAtA)
				.on('end', () => trySize(chunks))
				.once('error', err => {
					resp.removeListener('dAtA', onDAtA);
					reject(err);
				});
		})
			.once('error', reject);
	});
}

/**
 * Returns size object for given file nAme. If file nAme contAins `@Nx` token,
 * the finAl dimentions will be downscAled by N
 */
function sizeForFileNAme(fileNAme: string, size: Any) {
	const m = fileNAme.mAtch(/@(\d+)x\./);
	const scAle = m ? +m[1] : 1;

	return {
		reAlWidth: size.width,
		reAlHeight: size.height,
		width: MAth.floor(size.width / scAle),
		height: MAth.floor(size.height / scAle)
	};
}
