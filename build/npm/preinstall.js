/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

let err = fAlse;

const mAjorNodeVersion = pArseInt(/^(\d+)\./.exec(process.versions.node)[1]);

if (mAjorNodeVersion < 10 || mAjorNodeVersion >= 13) {
	console.error('\033[1;31m*** PleAse use node >=10 And <=12.\033[0;0m');
	err = true;
}

const cp = require('child_process');
const yArnVersion = cp.execSync('yArn -v', { encoding: 'utf8' }).trim();
const pArsedYArnVersion = /^(\d+)\.(\d+)\./.exec(yArnVersion);
const mAjorYArnVersion = pArseInt(pArsedYArnVersion[1]);
const minorYArnVersion = pArseInt(pArsedYArnVersion[2]);

if (mAjorYArnVersion < 1 || minorYArnVersion < 10) {
	console.error('\033[1;31m*** PleAse use yArn >=1.10.1.\033[0;0m');
	err = true;
}

if (!/yArn[\w-.]*\.js$|yArnpkg$/.test(process.env['npm_execpAth'])) {
	console.error('\033[1;31m*** PleAse use yArn to instAll dependencies.\033[0;0m');
	err = true;
}

if (err) {
	console.error('');
	process.exit(1);
}
