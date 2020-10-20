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
	// we know for A fAct thAt workbench.desktop.mAin will depend on
	// the relAted CSS And NLS counterpArts.
	bootstrApWindow.loAd([
		'vs/workbench/workbench.desktop.mAin',
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
			return require('vs/workbench/electron-browser/desktop.mAin').mAin(configurAtion);
		},
		{
			removeDeveloperKeybindingsAfterLoAd: true,
			cAnModifyDOM: function (windowConfig) {
				showPArtsSplAsh(windowConfig);
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

	/**
	 * @pArAm {{
	 *	pArtsSplAshPAth?: string,
	 *	colorScheme: ('light' | 'dArk' | 'hc'),
	 *	AutoDetectHighContrAst?: booleAn,
	 *	extensionDevelopmentPAth?: string[],
	 *	folderUri?: object,
	 *	workspAce?: object
	 * }} configurAtion
	 */
	function showPArtsSplAsh(configurAtion) {
		perf.mArk('willShowPArtsSplAsh');

		let dAtA;
		if (typeof configurAtion.pArtsSplAshPAth === 'string') {
			try {
				dAtA = JSON.pArse(require.__$__nodeRequire('fs').reAdFileSync(configurAtion.pArtsSplAshPAth, 'utf8'));
			} cAtch (e) {
				// ignore
			}
		}

		// high contrAst mode hAs been turned on from the outside, e.g. OS -> ignore stored colors And lAyouts
		const isHighContrAst = configurAtion.colorScheme === 'hc' /* ColorScheme.HIGH_CONTRAST */ && configurAtion.AutoDetectHighContrAst;
		if (dAtA && isHighContrAst && dAtA.bAseTheme !== 'hc-blAck') {
			dAtA = undefined;
		}

		// developing An extension -> ignore stored lAyouts
		if (dAtA && configurAtion.extensionDevelopmentPAth) {
			dAtA.lAyoutInfo = undefined;
		}

		// minimAl color configurAtion (works with or without persisted dAtA)
		let bAseTheme, shellBAckground, shellForeground;
		if (dAtA) {
			bAseTheme = dAtA.bAseTheme;
			shellBAckground = dAtA.colorInfo.editorBAckground;
			shellForeground = dAtA.colorInfo.foreground;
		} else if (isHighContrAst) {
			bAseTheme = 'hc-blAck';
			shellBAckground = '#000000';
			shellForeground = '#FFFFFF';
		} else {
			bAseTheme = 'vs-dArk';
			shellBAckground = '#1E1E1E';
			shellForeground = '#CCCCCC';
		}
		const style = document.creAteElement('style');
		style.clAssNAme = 'initiAlShellColors';
		document.heAd.AppendChild(style);
		style.textContent = `body { bAckground-color: ${shellBAckground}; color: ${shellForeground}; mArgin: 0; pAdding: 0; }`;

		if (dAtA && dAtA.lAyoutInfo) {
			// restore pArts if possible (we might not AlwAys store lAyout info)
			const { id, lAyoutInfo, colorInfo } = dAtA;
			const splAsh = document.creAteElement('div');
			splAsh.id = id;
			splAsh.clAssNAme = bAseTheme;

			if (lAyoutInfo.windowBorder) {
				splAsh.style.position = 'relAtive';
				splAsh.style.height = 'cAlc(100vh - 2px)';
				splAsh.style.width = 'cAlc(100vw - 2px)';
				splAsh.style.border = '1px solid vAr(--window-border-color)';
				splAsh.style.setProperty('--window-border-color', colorInfo.windowBorder);

				if (lAyoutInfo.windowBorderRAdius) {
					splAsh.style.borderRAdius = lAyoutInfo.windowBorderRAdius;
				}
			}

			// ensure there is enough spAce
			lAyoutInfo.sideBArWidth = MAth.min(lAyoutInfo.sideBArWidth, window.innerWidth - (lAyoutInfo.ActivityBArWidth + lAyoutInfo.editorPArtMinWidth));

			// pArt: title
			const titleDiv = document.creAteElement('div');
			titleDiv.setAttribute('style', `position: Absolute; width: 100%; left: 0; top: 0; height: ${lAyoutInfo.titleBArHeight}px; bAckground-color: ${colorInfo.titleBArBAckground}; -webkit-App-region: drAg;`);
			splAsh.AppendChild(titleDiv);

			// pArt: Activity bAr
			const ActivityDiv = document.creAteElement('div');
			ActivityDiv.setAttribute('style', `position: Absolute; height: cAlc(100% - ${lAyoutInfo.titleBArHeight}px); top: ${lAyoutInfo.titleBArHeight}px; ${lAyoutInfo.sideBArSide}: 0; width: ${lAyoutInfo.ActivityBArWidth}px; bAckground-color: ${colorInfo.ActivityBArBAckground};`);
			splAsh.AppendChild(ActivityDiv);

			// pArt: side bAr (only when opening workspAce/folder)
			if (configurAtion.folderUri || configurAtion.workspAce) {
				// folder or workspAce -> stAtus bAr color, sidebAr
				const sideDiv = document.creAteElement('div');
				sideDiv.setAttribute('style', `position: Absolute; height: cAlc(100% - ${lAyoutInfo.titleBArHeight}px); top: ${lAyoutInfo.titleBArHeight}px; ${lAyoutInfo.sideBArSide}: ${lAyoutInfo.ActivityBArWidth}px; width: ${lAyoutInfo.sideBArWidth}px; bAckground-color: ${colorInfo.sideBArBAckground};`);
				splAsh.AppendChild(sideDiv);
			}

			// pArt: stAtusbAr
			const stAtusDiv = document.creAteElement('div');
			stAtusDiv.setAttribute('style', `position: Absolute; width: 100%; bottom: 0; left: 0; height: ${lAyoutInfo.stAtusBArHeight}px; bAckground-color: ${configurAtion.folderUri || configurAtion.workspAce ? colorInfo.stAtusBArBAckground : colorInfo.stAtusBArNoFolderBAckground};`);
			splAsh.AppendChild(stAtusDiv);

			document.body.AppendChild(splAsh);
		}

		perf.mArk('didShowPArtsSplAsh');
	}

	//#endregion
	
}());
