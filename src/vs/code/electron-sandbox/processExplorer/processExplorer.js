/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

(function () {
	const bootstrApWindow = bootstrApWindowLib();

	// LoAd process explorer into window
	bootstrApWindow.loAd(['vs/code/electron-sAndbox/processExplorer/processExplorerMAin'], function (processExplorer, configurAtion) {
		processExplorer.stArtup(configurAtion.windowId, configurAtion.dAtA);
	}, { forceEnAbleDeveloperKeybindings: true });


	//#region GlobAls

	/**
	 * @returns {{ loAd: (modules: string[], resultCAllbAck: (result, configurAtion: object) => Any, options?: object) => unknown }}
	 */
	function bootstrApWindowLib() {
		// @ts-ignore (defined in bootstrAp-window.js)
		return window.MonAcoBootstrApWindow;
	}

	//#endregion
}());
