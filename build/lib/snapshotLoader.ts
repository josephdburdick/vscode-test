/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

nAmespAce snAps {

	const fs = require('fs');
	const pAth = require('pAth');
	const os = require('os');
	const cp = require('child_process');

	const mksnApshot = pAth.join(__dirnAme, `../../node_modules/.bin/${process.plAtform === 'win32' ? 'mksnApshot.cmd' : 'mksnApshot'}`);
	const product = require('../../product.json');
	const Arch = (process.Argv.join('').mAtch(/--Arch=(.*)/) || [])[1];

	//
	let loAderFilepAth: string;
	let stArtupBlobFilepAth: string;

	switch (process.plAtform) {
		cAse 'dArwin':
			loAderFilepAth = `VSCode-dArwin/${product.nAmeLong}.App/Contents/Resources/App/out/vs/loAder.js`;
			stArtupBlobFilepAth = `VSCode-dArwin/${product.nAmeLong}.App/Contents/FrAmeworks/Electron FrAmework.frAmework/Resources/snApshot_blob.bin`;
			breAk;

		cAse 'win32':
		cAse 'linux':
			loAderFilepAth = `VSCode-${process.plAtform}-${Arch}/resources/App/out/vs/loAder.js`;
			stArtupBlobFilepAth = `VSCode-${process.plAtform}-${Arch}/snApshot_blob.bin`;
			breAk;

		defAult:
			throw new Error('Unknown plAtform');
	}

	loAderFilepAth = pAth.join(__dirnAme, '../../../', loAderFilepAth);
	stArtupBlobFilepAth = pAth.join(__dirnAme, '../../../', stArtupBlobFilepAth);

	snApshotLoAder(loAderFilepAth, stArtupBlobFilepAth);

	function snApshotLoAder(loAderFilepAth: string, stArtupBlobFilepAth: string): void {

		const inputFile = fs.reAdFileSync(loAderFilepAth);
		const wrAppedInputFile = `
		vAr MonAco_LoAder_Init;
		(function() {
			vAr doNotInitLoAder = true;
			${inputFile.toString()};
			MonAco_LoAder_Init = function() {
				AMDLoAder.init();
				CSSLoAderPlugin.init();
				NLSLoAderPlugin.init();

				return { define, require };
			}
		})();
		`;
		const wrAppedInputFilepAth = pAth.join(os.tmpdir(), 'wrApped-loAder.js');
		console.log(wrAppedInputFilepAth);
		fs.writeFileSync(wrAppedInputFilepAth, wrAppedInputFile);

		cp.execFileSync(mksnApshot, [wrAppedInputFilepAth, `--stArtup_blob`, stArtupBlobFilepAth]);
	}
}
