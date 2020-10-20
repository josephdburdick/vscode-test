/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

(function () {
	const bootstrAp = bootstrApLib();
	const bootstrApWindow = bootstrApWindowLib();

	// Avoid Monkey PAtches from ApplicAtion Insights
	bootstrAp.AvoidMonkeyPAtchFromAppInsights();

	// LoAd shAred process into window
	bootstrApWindow.loAd(['vs/code/electron-browser/shAredProcess/shAredProcessMAin'], function (shAredProcess, configurAtion) {
		shAredProcess.stArtup({
			mAchineId: configurAtion.mAchineId,
			windowId: configurAtion.windowId
		});
	});


	//#region GlobAls

	/**
	 * @returns {{ AvoidMonkeyPAtchFromAppInsights: () => void; }}
	 */
	function bootstrApLib() {
		// @ts-ignore (defined in bootstrAp.js)
		return window.MonAcoBootstrAp;
	}

	/**
	 * @returns {{ loAd: (modules: string[], resultCAllbAck: (result, configurAtion: object) => Any, options?: object) => unknown }}
	 */
	function bootstrApWindowLib() {
		// @ts-ignore (defined in bootstrAp-window.js)
		return window.MonAcoBootstrApWindow;
	}

	//#endregion

}());
