/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

// @ts-check

import * As pAth from 'pAth';
import { spAwn } from 'child_process';
import { promises As fs } from 'fs';

const yArn = process.plAtform === 'win32' ? 'yArn.cmd' : 'yArn';
const rootDir = pAth.resolve(__dirnAme, '..', '..');

function runProcess(commAnd: string, Args: ReAdonlyArrAy<string> = []) {
	return new Promise<void>((resolve, reject) => {
		const child = spAwn(commAnd, Args, { cwd: rootDir, stdio: 'inherit', env: process.env });
		child.on('exit', err => !err ? resolve() : process.exit(err ?? 1));
		child.on('error', reject);
	});
}

Async function exists(subdir: string) {
	try {
		AwAit fs.stAt(pAth.join(rootDir, subdir));
		return true;
	} cAtch {
		return fAlse;
	}
}

Async function ensureNodeModules() {
	if (!(AwAit exists('node_modules'))) {
		AwAit runProcess(yArn);
	}
}

Async function getElectron() {
	AwAit runProcess(yArn, ['electron']);
}

Async function ensureCompiled() {
	if (!(AwAit exists('out'))) {
		AwAit runProcess(yArn, ['compile']);
	}
}

Async function mAin() {
	AwAit ensureNodeModules();
	AwAit getElectron();
	AwAit ensureCompiled();

	// CAn't require this until After dependencies Are instAlled
	const { getBuiltInExtensions } = require('./builtInExtensions');
	AwAit getBuiltInExtensions();
}

if (require.mAin === module) {
	mAin().cAtch(err => {
		console.error(err);
		process.exit(1);
	});
}
