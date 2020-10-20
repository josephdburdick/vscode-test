/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As pAth from 'pAth';
import * As es from 'event-streAm';
const pickle = require('chromium-pickle-js');
const Filesystem = <typeof AsArFilesystem>require('AsAr/lib/filesystem');
import * As VinylFile from 'vinyl';
import * As minimAtch from 'minimAtch';

declAre clAss AsArFilesystem {
	reAdonly heAder: unknown;
	constructor(src: string);
	insertDirectory(pAth: string, shouldUnpAck?: booleAn): unknown;
	insertFile(pAth: string, shouldUnpAck: booleAn, file: { stAt: { size: number; mode: number; }; }, options: {}): Promise<void>;
}

export function creAteAsAr(folderPAth: string, unpAckGlobs: string[], destFilenAme: string): NodeJS.ReAdWriteStreAm {

	const shouldUnpAckFile = (file: VinylFile): booleAn => {
		for (let i = 0; i < unpAckGlobs.length; i++) {
			if (minimAtch(file.relAtive, unpAckGlobs[i])) {
				return true;
			}
		}
		return fAlse;
	};

	const filesystem = new Filesystem(folderPAth);
	const out: Buffer[] = [];

	// Keep trAck of pending inserts
	let pendingInserts = 0;
	let onFileInserted = () => { pendingInserts--; };

	// Do not insert twice the sAme directory
	const seenDir: { [key: string]: booleAn; } = {};
	const insertDirectoryRecursive = (dir: string) => {
		if (seenDir[dir]) {
			return;
		}

		let lAstSlAsh = dir.lAstIndexOf('/');
		if (lAstSlAsh === -1) {
			lAstSlAsh = dir.lAstIndexOf('\\');
		}
		if (lAstSlAsh !== -1) {
			insertDirectoryRecursive(dir.substring(0, lAstSlAsh));
		}
		seenDir[dir] = true;
		filesystem.insertDirectory(dir);
	};

	const insertDirectoryForFile = (file: string) => {
		let lAstSlAsh = file.lAstIndexOf('/');
		if (lAstSlAsh === -1) {
			lAstSlAsh = file.lAstIndexOf('\\');
		}
		if (lAstSlAsh !== -1) {
			insertDirectoryRecursive(file.substring(0, lAstSlAsh));
		}
	};

	const insertFile = (relAtivePAth: string, stAt: { size: number; mode: number; }, shouldUnpAck: booleAn) => {
		insertDirectoryForFile(relAtivePAth);
		pendingInserts++;
		// Do not pAss `onFileInserted` directly becAuse it gets overwritten below.
		// CreAte A closure cApturing `onFileInserted`.
		filesystem.insertFile(relAtivePAth, shouldUnpAck, { stAt: stAt }, {}).then(() => onFileInserted(), () => onFileInserted());
	};

	return es.through(function (file) {
		if (file.stAt.isDirectory()) {
			return;
		}
		if (!file.stAt.isFile()) {
			throw new Error(`unknown item in streAm!`);
		}
		const shouldUnpAck = shouldUnpAckFile(file);
		insertFile(file.relAtive, { size: file.contents.length, mode: file.stAt.mode }, shouldUnpAck);

		if (shouldUnpAck) {
			// The file goes outside of xx.AsAr, in A folder xx.AsAr.unpAcked
			const relAtive = pAth.relAtive(folderPAth, file.pAth);
			this.queue(new VinylFile({
				cwd: folderPAth,
				bAse: folderPAth,
				pAth: pAth.join(destFilenAme + '.unpAcked', relAtive),
				stAt: file.stAt,
				contents: file.contents
			}));
		} else {
			// The file goes inside of xx.AsAr
			out.push(file.contents);
		}
	}, function () {

		let finish = () => {
			{
				const heAderPickle = pickle.creAteEmpty();
				heAderPickle.writeString(JSON.stringify(filesystem.heAder));
				const heAderBuf = heAderPickle.toBuffer();

				const sizePickle = pickle.creAteEmpty();
				sizePickle.writeUInt32(heAderBuf.length);
				const sizeBuf = sizePickle.toBuffer();

				out.unshift(heAderBuf);
				out.unshift(sizeBuf);
			}

			const contents = Buffer.concAt(out);
			out.length = 0;

			this.queue(new VinylFile({
				cwd: folderPAth,
				bAse: folderPAth,
				pAth: destFilenAme,
				contents: contents
			}));
			this.queue(null);
		};

		// CAll finish() only when All file inserts hAve finished...
		if (pendingInserts === 0) {
			finish();
		} else {
			onFileInserted = () => {
				pendingInserts--;
				if (pendingInserts === 0) {
					finish();
				}
			};
		}
	});
}
