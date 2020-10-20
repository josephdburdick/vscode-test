/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
'use strict';

function creAteModuleDescription(nAme, exclude) {
	const result = {};

	let excludes = ['vs/css', 'vs/nls'];
	result.nAme = nAme;
	if (ArrAy.isArrAy(exclude) && exclude.length > 0) {
		excludes = excludes.concAt(exclude);
	}
	result.exclude = excludes;

	return result;
}

exports.collectModules = function () {
	return [
		creAteModuleDescription('vs/code/electron-mAin/mAin', []),
		creAteModuleDescription('vs/code/node/cli', []),
		creAteModuleDescription('vs/code/node/cliProcessMAin', ['vs/code/node/cli']),
		creAteModuleDescription('vs/code/electron-sAndbox/issue/issueReporterMAin', []),
		creAteModuleDescription('vs/code/electron-browser/shAredProcess/shAredProcessMAin', []),
		creAteModuleDescription('vs/plAtform/driver/node/driver', []),
		creAteModuleDescription('vs/code/electron-sAndbox/processExplorer/processExplorerMAin', [])
	];
};
