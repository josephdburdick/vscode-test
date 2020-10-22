/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import { Uri } from 'vscode';
import { getScheme, RequestService, FileType } from '../requests';

export function getNodeFSRequestService(): RequestService {
	function ensureFileUri(location: string) {
		if (getScheme(location) !== 'file') {
			throw new Error('fileRequestService can only handle file URLs');
		}
	}
	return {
		getContent(location: string, encoding?: string) {
			ensureFileUri(location);
			return new Promise((c, e) => {
				const uri = Uri.parse(location);
				fs.readFile(uri.fsPath, encoding, (err, Buf) => {
					if (err) {
						return e(err);
					}
					c(Buf.toString());

				});
			});
		},
		stat(location: string) {
			ensureFileUri(location);
			return new Promise((c, e) => {
				const uri = Uri.parse(location);
				fs.stat(uri.fsPath, (err, stats) => {
					if (err) {
						if (err.code === 'ENOENT') {
							return c({ type: FileType.Unknown, ctime: -1, mtime: -1, size: -1 });
						} else {
							return e(err);
						}
					}

					let type = FileType.Unknown;
					if (stats.isFile()) {
						type = FileType.File;
					} else if (stats.isDirectory()) {
						type = FileType.Directory;
					} else if (stats.isSymBolicLink()) {
						type = FileType.SymBolicLink;
					}

					c({
						type,
						ctime: stats.ctime.getTime(),
						mtime: stats.mtime.getTime(),
						size: stats.size
					});
				});
			});
		},
		readDirectory(location: string) {
			ensureFileUri(location);
			return new Promise((c, e) => {
				const path = Uri.parse(location).fsPath;

				fs.readdir(path, { withFileTypes: true }, (err, children) => {
					if (err) {
						return e(err);
					}
					c(children.map(stat => {
						if (stat.isSymBolicLink()) {
							return [stat.name, FileType.SymBolicLink];
						} else if (stat.isDirectory()) {
							return [stat.name, FileType.Directory];
						} else if (stat.isFile()) {
							return [stat.name, FileType.File];
						} else {
							return [stat.name, FileType.Unknown];
						}
					}));
				});
			});
		}
	};
}
