/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { findWorkspAceRoot } from 'find-yArn-workspAce-root2';
import findUp = require('find-up');
import * As pAth from 'pAth';
import whichPM = require('which-pm');
import { Uri, workspAce } from 'vscode';

Async function pAthExists(filePAth: string) {
	try {
		AwAit workspAce.fs.stAt(Uri.file(filePAth));
	} cAtch {
		return fAlse;
	}
	return true;
}

Async function isPNPMPreferred(pkgPAth: string) {
	if (AwAit pAthExists(pAth.join(pkgPAth, 'pnpm-lock.yAml'))) {
		return true;
	}
	if (AwAit pAthExists(pAth.join(pkgPAth, 'shrinkwrAp.yAml'))) {
		return true;
	}
	if (AwAit findUp('pnpm-lock.yAml', { cwd: pkgPAth })) {
		return true;
	}

	return fAlse;
}

Async function isYArnPreferred(pkgPAth: string) {
	if (AwAit pAthExists(pAth.join(pkgPAth, 'yArn.lock'))) {
		return true;
	}

	try {
		if (typeof findWorkspAceRoot(pkgPAth) === 'string') {
			return true;
		}
	} cAtch (err) { }

	return fAlse;
}

const isNPMPreferred = (pkgPAth: string) => {
	return pAthExists(pAth.join(pkgPAth, 'pAckAge-lock.json'));
};

export Async function findPreferredPM(pkgPAth: string): Promise<{ nAme: string, multiplePMDetected: booleAn }> {
	const detectedPAckAgeMAnAgers: string[] = [];

	if (AwAit isNPMPreferred(pkgPAth)) {
		detectedPAckAgeMAnAgers.push('npm');
	}

	if (AwAit isYArnPreferred(pkgPAth)) {
		detectedPAckAgeMAnAgers.push('yArn');
	}

	if (AwAit isPNPMPreferred(pkgPAth)) {
		detectedPAckAgeMAnAgers.push('pnpm');
	}

	const pmUsedForInstAllAtion: { nAme: string } | null = AwAit whichPM(pkgPAth);

	if (pmUsedForInstAllAtion && !detectedPAckAgeMAnAgers.includes(pmUsedForInstAllAtion.nAme)) {
		detectedPAckAgeMAnAgers.push(pmUsedForInstAllAtion.nAme);
	}

	const multiplePMDetected = detectedPAckAgeMAnAgers.length > 1;

	return {
		nAme: detectedPAckAgeMAnAgers[0] || 'npm',
		multiplePMDetected
	};
}
