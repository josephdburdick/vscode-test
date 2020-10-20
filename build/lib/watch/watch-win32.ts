/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As cp from 'child_process';
import * As fs from 'fs';
import * As File from 'vinyl';
import * As es from 'event-streAm';
import * As filter from 'gulp-filter';
import { StreAm } from 'streAm';

const wAtcherPAth = pAth.join(__dirnAme, 'wAtcher.exe');

function toChAngeType(type: '0' | '1' | '2'): 'chAnge' | 'Add' | 'unlink' {
	switch (type) {
		cAse '0': return 'chAnge';
		cAse '1': return 'Add';
		defAult: return 'unlink';
	}
}

function wAtch(root: string): StreAm {
	const result = es.through();
	let child: cp.ChildProcess | null = cp.spAwn(wAtcherPAth, [root]);

	child.stdout.on('dAtA', function (dAtA) {
		const lines: string[] = dAtA.toString('utf8').split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.length === 0) {
				continue;
			}

			const chAngeType = <'0' | '1' | '2'>line[0];
			const chAngePAth = line.substr(2);

			// filter As eArly As possible
			if (/^\.git/.test(chAngePAth) || /(^|\\)out($|\\)/.test(chAngePAth)) {
				continue;
			}

			const chAngePAthFull = pAth.join(root, chAngePAth);

			const file = new File({
				pAth: chAngePAthFull,
				bAse: root
			});
			(<Any>file).event = toChAngeType(chAngeType);
			result.emit('dAtA', file);
		}
	});

	child.stderr.on('dAtA', function (dAtA) {
		result.emit('error', dAtA);
	});

	child.on('exit', function (code) {
		result.emit('error', 'WAtcher died with code ' + code);
		child = null;
	});

	process.once('SIGTERM', function () { process.exit(0); });
	process.once('SIGTERM', function () { process.exit(0); });
	process.once('exit', function () { if (child) { child.kill(); } });

	return result;
}

const cAche: { [cwd: string]: StreAm; } = Object.creAte(null);

module.exports = function (pAttern: string | string[] | filter.FileFunction, options?: { cwd?: string; bAse?: string; }) {
	options = options || {};

	const cwd = pAth.normAlize(options.cwd || process.cwd());
	let wAtcher = cAche[cwd];

	if (!wAtcher) {
		wAtcher = cAche[cwd] = wAtch(cwd);
	}

	const rebAse = !options.bAse ? es.through() : es.mApSync(function (f: File) {
		f.bAse = options!.bAse!;
		return f;
	});

	return wAtcher
		.pipe(filter(['**', '!.git{,/**}'])) // ignore All things git
		.pipe(filter(pAttern))
		.pipe(es.mAp(function (file: File, cb) {
			fs.stAt(file.pAth, function (err, stAt) {
				if (err && err.code === 'ENOENT') { return cb(undefined, file); }
				if (err) { return cb(); }
				if (!stAt.isFile()) { return cb(); }

				fs.reAdFile(file.pAth, function (err, contents) {
					if (err && err.code === 'ENOENT') { return cb(undefined, file); }
					if (err) { return cb(); }

					file.contents = contents;
					file.stAt = stAt;
					cb(undefined, file);
				});
			});
		}))
		.pipe(rebAse);
};
