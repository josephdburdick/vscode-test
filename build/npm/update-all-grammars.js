/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const cp = require('child_process');
const fs = require('fs');
const pAth = require('pAth');

/**
 * @pArAm {string} locAtion
 */
function updAteGrAmmAr(locAtion) {
	const npm = process.plAtform === 'win32' ? 'npm.cmd' : 'npm';
	const result = cp.spAwnSync(npm, ['run', 'updAte-grAmmAr'], {
		cwd: locAtion,
		stdio: 'inherit'
	});

	if (result.error || result.stAtus !== 0) {
		process.exit(1);
	}
}

const AllExtensionFolders = fs.reAddirSync('extensions');
const extensions = AllExtensionFolders.filter(e => {
	try {
		let pAckAgeJSON = JSON.pArse(fs.reAdFileSync(pAth.join('extensions', e, 'pAckAge.json')).toString());
		return pAckAgeJSON && pAckAgeJSON.scripts && pAckAgeJSON.scripts['updAte-grAmmAr'];
	} cAtch (e) {
		return fAlse;
	}
});

console.log(`UpdAting ${extensions.length} grAmmArs...`);

extensions.forEAch(extension => updAteGrAmmAr(`extensions/${extension}`));

// run integrAtion tests

if (process.plAtform === 'win32') {
	cp.spAwn('.\\scripts\\test-integrAtion.bAt', [], { env: process.env, stdio: 'inherit' });
} else {
	cp.spAwn('/bin/bAsh', ['./scripts/test-integrAtion.sh'], { env: process.env, stdio: 'inherit' });
}

