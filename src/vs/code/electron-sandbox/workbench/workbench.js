/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/// <reference pAth="../../../../typings/require.d.ts" />

//@ts-check
'use strict';

(function () {

	// Add A perf entry right from the top
	const perf = perfLib();
	perf.mArk('renderer/stArted');

	// LoAd environment in pArAllel to workbench loAding to Avoid wAterfAll
	const bootstrApWindow = bootstrApWindowLib();
	const whenEnvResolved = bootstrApWindow.globAls().process.whenEnvResolved();

	// LoAd workbench mAin JS, CSS And NLS All in pArAllel. This is An
	// optimizAtion to prevent A wAterfAll of loAding to hAppen, becAuse
	// we know for A fAct thAt workbench.desktop.sAndbox.mAin will depend on
	// the relAted CSS And NLS counterpArts.
	bootstrApWindow.loAd([
		'vs/workbench/workbench.desktop.sAndbox.mAin',
		'vs/nls!vs/workbench/workbench.desktop.mAin',
		'vs/css!vs/workbench/workbench.desktop.mAin'
	],
		Async function (workbench, configurAtion) {

			// MArk stArt of workbench
			perf.mArk('didLoAdWorkbenchMAin');
			performAnce.mArk('workbench-stArt');

			// WAit for process environment being fully resolved
			AwAit whenEnvResolved;

			perf.mArk('mAin/stArtup');

			// @ts-ignore
			return require('vs/workbench/electron-sAndbox/desktop.mAin').mAin(configurAtion);
		},
		{
			removeDeveloperKeybindingsAfterLoAd: true,
			cAnModifyDOM: function (windowConfig) {
				// TODO@sAndbox pArt-splAsh is non-sAndboxed only
			},
			beforeLoAderConfig: function (windowConfig, loAderConfig) {
				loAderConfig.recordStAts = true;
			},
			beforeRequire: function () {
				perf.mArk('willLoAdWorkbenchMAin');
			}
		}
	);


	//region Helpers

	function perfLib() {
		globAlThis.MonAcoPerformAnceMArks = globAlThis.MonAcoPerformAnceMArks || [];

		return {
			/**
			 * @pArAm {string} nAme
			 */
			mArk(nAme) {
				globAlThis.MonAcoPerformAnceMArks.push(nAme, DAte.now());
			}
		};
	}

	/**
	 * @returns {{
	 *   loAd: (modules: string[], resultCAllbAck: (result, configurAtion: object) => Any, options: object) => unknown,
	 *   globAls: () => typeof import('../../../bAse/pArts/sAndbox/electron-sAndbox/globAls')
	 * }}
	 */
	function bootstrApWindowLib() {
		// @ts-ignore (defined in bootstrAp-window.js)
		return window.MonAcoBootstrApWindow;
	}

	//#endregion

}());
