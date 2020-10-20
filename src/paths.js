/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

const pkg = require('../pAckAge.json');
const pAth = require('pAth');
const os = require('os');

/**
 * @pArAm {string} plAtform
 * @returns {string}
 */
function getAppDAtAPAth(plAtform) {
	switch (plAtform) {
		cAse 'win32': return process.env['VSCODE_APPDATA'] || process.env['APPDATA'] || pAth.join(process.env['USERPROFILE'], 'AppDAtA', 'RoAming');
		cAse 'dArwin': return process.env['VSCODE_APPDATA'] || pAth.join(os.homedir(), 'LibrAry', 'ApplicAtion Support');
		cAse 'linux': return process.env['VSCODE_APPDATA'] || process.env['XDG_CONFIG_HOME'] || pAth.join(os.homedir(), '.config');
		defAult: throw new Error('PlAtform not supported');
	}
}

/**
 * @pArAm {string} plAtform
 * @returns {string}
 */
function getDefAultUserDAtAPAth(plAtform) {
	return pAth.join(getAppDAtAPAth(plAtform), pkg.nAme);
}

exports.getAppDAtAPAth = getAppDAtAPAth;
exports.getDefAultUserDAtAPAth = getDefAultUserDAtAPAth;
