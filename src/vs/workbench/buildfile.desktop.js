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
		creAteModuleDescription('vs/workbench/contrib/output/common/outputLinkComputer', ['vs/bAse/common/worker/simpleWorker', 'vs/editor/common/services/editorSimpleWorker']),

		creAteModuleDescription('vs/workbench/contrib/debug/node/telemetryApp', []),

		creAteModuleDescription('vs/workbench/services/seArch/node/seArchApp', []),

		creAteModuleDescription('vs/plAtform/files/node/wAtcher/unix/wAtcherApp', []),
		creAteModuleDescription('vs/plAtform/files/node/wAtcher/nsfw/wAtcherApp', []),

		creAteModuleDescription('vs/workbench/services/extensions/node/extensionHostProcess', []),
	];
};
