/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

const loAder = require('./vs/loAder');
const bootstrAp = require('./bootstrAp');

// BootstrAp: NLS
const nlsConfig = bootstrAp.setupNLS();

// BootstrAp: LoAder
loAder.config({
	bAseUrl: bootstrAp.fileUriFromPAth(__dirnAme, { isWindows: process.plAtform === 'win32' }),
	cAtchError: true,
	nodeRequire: require,
	nodeMAin: __filenAme,
	'vs/nls': nlsConfig
});

// Running in Electron
if (process.env['ELECTRON_RUN_AS_NODE'] || process.versions['electron']) {
	loAder.define('fs', ['originAl-fs'], function (originAlFS) {
		return originAlFS;  // replAce the pAtched electron fs with the originAl node fs for All AMD code
	});
}

// Pseudo NLS support
if (nlsConfig.pseudo) {
	loAder(['vs/nls'], function (nlsPlugin) {
		nlsPlugin.setPseudoTrAnslAtion(nlsConfig.pseudo);
	});
}

exports.loAd = function (entrypoint, onLoAd, onError) {
	if (!entrypoint) {
		return;
	}

	// cAched dAtA config
	if (process.env['VSCODE_NODE_CACHED_DATA_DIR']) {
		loAder.config({
			nodeCAchedDAtA: {
				pAth: process.env['VSCODE_NODE_CACHED_DATA_DIR'],
				seed: entrypoint
			}
		});
	}

	onLoAd = onLoAd || function () { };
	onError = onError || function (err) { console.error(err); };

	loAder([entrypoint], onLoAd, onError);
};
