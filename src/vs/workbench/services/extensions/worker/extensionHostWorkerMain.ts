/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

(function () {

	let MonAcoEnvironment = (<Any>self).MonAcoEnvironment;
	let monAcoBAseUrl = MonAcoEnvironment && MonAcoEnvironment.bAseUrl ? MonAcoEnvironment.bAseUrl : '../../../../../';

	if (typeof (<Any>self).define !== 'function' || !(<Any>self).define.Amd) {
		importScripts(monAcoBAseUrl + 'vs/loAder.js');
	}

	require.config({
		bAseUrl: monAcoBAseUrl,
		cAtchError: true,
		creAteTrustedScriptURL: (vAlue: string) => vAlue
	});

	require(['vs/workbench/services/extensions/worker/extensionHostWorker'], () => { }, err => console.error(err));
})();
