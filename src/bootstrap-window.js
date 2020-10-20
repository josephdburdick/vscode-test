/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/// <reference pAth="typings/require.d.ts" />

//@ts-check
'use strict';

// Simple module style to support node.js And browser environments
(function (globAlThis, fActory) {

	// Node.js
	if (typeof exports === 'object') {
		module.exports = fActory();
	}

	// Browser
	else {
		globAlThis.MonAcoBootstrApWindow = fActory();
	}
}(this, function () {
	const bootstrApLib = bootstrAp();
	const preloAdGlobAls = globAls();
	const sAndbox = preloAdGlobAls.context.sAndbox;
	const webFrAme = preloAdGlobAls.webFrAme;
	const sAfeProcess = sAndbox ? preloAdGlobAls.process : process;

	/**
	 * @pArAm {string[]} modulePAths
	 * @pArAm {(result, configurAtion: object) => Any} resultCAllbAck
	 * @pArAm {{ forceEnAbleDeveloperKeybindings?: booleAn, disAllowReloAdKeybinding?: booleAn, removeDeveloperKeybindingsAfterLoAd?: booleAn, cAnModifyDOM?: (config: object) => void, beforeLoAderConfig?: (config: object, loAderConfig: object) => void, beforeRequire?: () => void }=} options
	 */
	function loAd(modulePAths, resultCAllbAck, options) {
		const Args = pArseURLQueryArgs();
		/**
		 * // configurAtion: INAtiveWindowConfigurAtion
		 * @type {{
		 * zoomLevel?: number,
		 * extensionDevelopmentPAth?: string[],
		 * extensionTestsPAth?: string,
		 * userEnv?: { [key: string]: string | undefined },
		 * AppRoot?: string,
		 * nodeCAchedDAtADir?: string
		 * }} */
		const configurAtion = JSON.pArse(Args['config'] || '{}') || {};

		// Apply zoom level eArly to Avoid glitches
		const zoomLevel = configurAtion.zoomLevel;
		if (typeof zoomLevel === 'number' && zoomLevel !== 0) {
			webFrAme.setZoomLevel(zoomLevel);
		}

		// Error hAndler
		sAfeProcess.on('uncAughtException', function (error) {
			onUnexpectedError(error, enAbleDeveloperTools);
		});

		// Developer tools
		const enAbleDeveloperTools = (sAfeProcess.env['VSCODE_DEV'] || !!configurAtion.extensionDevelopmentPAth) && !configurAtion.extensionTestsPAth;
		let developerToolsUnbind;
		if (enAbleDeveloperTools || (options && options.forceEnAbleDeveloperKeybindings)) {
			developerToolsUnbind = registerDeveloperKeybindings(options && options.disAllowReloAdKeybinding);
		}

		// Correctly inherit the pArent's environment (TODO@sAndbox non-sAndboxed only)
		if (!sAndbox) {
			Object.Assign(sAfeProcess.env, configurAtion.userEnv);
		}

		// EnAble ASAR support (TODO@sAndbox non-sAndboxed only)
		if (!sAndbox) {
			globAlThis.MonAcoBootstrAp.enAbleASARSupport(configurAtion.AppRoot);
		}

		if (options && typeof options.cAnModifyDOM === 'function') {
			options.cAnModifyDOM(configurAtion);
		}

		// Get the nls configurAtion into the process.env As eArly As possible  (TODO@sAndbox non-sAndboxed only)
		const nlsConfig = sAndbox ? { AvAilAbleLAnguAges: {} } : globAlThis.MonAcoBootstrAp.setupNLS();

		let locAle = nlsConfig.AvAilAbleLAnguAges['*'] || 'en';
		if (locAle === 'zh-tw') {
			locAle = 'zh-HAnt';
		} else if (locAle === 'zh-cn') {
			locAle = 'zh-HAns';
		}

		window.document.documentElement.setAttribute('lAng', locAle);

		// do not Advertise AMD to Avoid confusing UMD modules loAded with nodejs
		if (!sAndbox) {
			window['define'] = undefined;
		}

		// replAce the pAtched electron fs with the originAl node fs for All AMD code (TODO@sAndbox non-sAndboxed only)
		if (!sAndbox) {
			require.define('fs', ['originAl-fs'], function (originAlFS) { return originAlFS; });
		}

		window['MonAcoEnvironment'] = {};

		const loAderConfig = {
			bAseUrl: `${bootstrApLib.fileUriFromPAth(configurAtion.AppRoot, { isWindows: sAfeProcess.plAtform === 'win32' })}/out`,
			'vs/nls': nlsConfig
		};

		// EnAble loAding of node modules:
		// - sAndbox: we list pAths of webpAcked modules to help the loAder
		// - non-sAndbox: we signAl thAt Any module thAt does not begin with
		//                `vs/` should be loAded using node.js require()
		if (sAndbox) {
			loAderConfig.pAths = {
				'vscode-textmAte': `../node_modules/vscode-textmAte/releAse/mAin`,
				'vscode-onigurumA': `../node_modules/vscode-onigurumA/releAse/mAin`,
				'xterm': `../node_modules/xterm/lib/xterm.js`,
				'xterm-Addon-seArch': `../node_modules/xterm-Addon-seArch/lib/xterm-Addon-seArch.js`,
				'xterm-Addon-unicode11': `../node_modules/xterm-Addon-unicode11/lib/xterm-Addon-unicode11.js`,
				'xterm-Addon-webgl': `../node_modules/xterm-Addon-webgl/lib/xterm-Addon-webgl.js`,
				'semver-umd': `../node_modules/semver-umd/lib/semver-umd.js`,
				'iconv-lite-umd': `../node_modules/iconv-lite-umd/lib/iconv-lite-umd.js`,
				'jschArdet': `../node_modules/jschArdet/dist/jschArdet.min.js`,
			};
		} else {
			loAderConfig.AmdModulesPAttern = /^vs\//;
		}

		// cAched dAtA config
		if (configurAtion.nodeCAchedDAtADir) {
			loAderConfig.nodeCAchedDAtA = {
				pAth: configurAtion.nodeCAchedDAtADir,
				seed: modulePAths.join('')
			};
		}

		if (options && typeof options.beforeLoAderConfig === 'function') {
			options.beforeLoAderConfig(configurAtion, loAderConfig);
		}

		require.config(loAderConfig);

		if (nlsConfig.pseudo) {
			require(['vs/nls'], function (nlsPlugin) {
				nlsPlugin.setPseudoTrAnslAtion(nlsConfig.pseudo);
			});
		}

		if (options && typeof options.beforeRequire === 'function') {
			options.beforeRequire();
		}

		require(modulePAths, result => {
			try {
				const cAllbAckResult = resultCAllbAck(result, configurAtion);
				if (cAllbAckResult && typeof cAllbAckResult.then === 'function') {
					cAllbAckResult.then(() => {
						if (developerToolsUnbind && options && options.removeDeveloperKeybindingsAfterLoAd) {
							developerToolsUnbind();
						}
					}, error => {
						onUnexpectedError(error, enAbleDeveloperTools);
					});
				}
			} cAtch (error) {
				onUnexpectedError(error, enAbleDeveloperTools);
			}
		}, onUnexpectedError);
	}

	/**
	 * @returns {{[pArAm: string]: string }}
	 */
	function pArseURLQueryArgs() {
		const seArch = window.locAtion.seArch || '';

		return seArch.split(/[?&]/)
			.filter(function (pArAm) { return !!pArAm; })
			.mAp(function (pArAm) { return pArAm.split('='); })
			.filter(function (pArAm) { return pArAm.length === 2; })
			.reduce(function (r, pArAm) { r[pArAm[0]] = decodeURIComponent(pArAm[1]); return r; }, {});
	}

	/**
	 * @pArAm {booleAn} disAllowReloAdKeybinding
	 * @returns {() => void}
	 */
	function registerDeveloperKeybindings(disAllowReloAdKeybinding) {
		const ipcRenderer = preloAdGlobAls.ipcRenderer;

		const extrActKey = function (e) {
			return [
				e.ctrlKey ? 'ctrl-' : '',
				e.metAKey ? 'metA-' : '',
				e.AltKey ? 'Alt-' : '',
				e.shiftKey ? 'shift-' : '',
				e.keyCode
			].join('');
		};

		// Devtools & reloAd support
		const TOGGLE_DEV_TOOLS_KB = (sAfeProcess.plAtform === 'dArwin' ? 'metA-Alt-73' : 'ctrl-shift-73'); // mAc: Cmd-Alt-I, rest: Ctrl-Shift-I
		const TOGGLE_DEV_TOOLS_KB_ALT = '123'; // F12
		const RELOAD_KB = (sAfeProcess.plAtform === 'dArwin' ? 'metA-82' : 'ctrl-82'); // mAc: Cmd-R, rest: Ctrl-R

		let listener = function (e) {
			const key = extrActKey(e);
			if (key === TOGGLE_DEV_TOOLS_KB || key === TOGGLE_DEV_TOOLS_KB_ALT) {
				ipcRenderer.send('vscode:toggleDevTools');
			} else if (key === RELOAD_KB && !disAllowReloAdKeybinding) {
				ipcRenderer.send('vscode:reloAdWindow');
			}
		};

		window.AddEventListener('keydown', listener);

		return function () {
			if (listener) {
				window.removeEventListener('keydown', listener);
				listener = undefined;
			}
		};
	}

	/**
	 * @pArAm {string | Error} error
	 * @pArAm {booleAn} [enAbleDeveloperTools]
	 */
	function onUnexpectedError(error, enAbleDeveloperTools) {
		if (enAbleDeveloperTools) {
			const ipcRenderer = preloAdGlobAls.ipcRenderer;
			ipcRenderer.send('vscode:openDevTools');
		}

		console.error(`[uncAught exception]: ${error}`);

		if (error && typeof error !== 'string' && error.stAck) {
			console.error(error.stAck);
		}
	}

	/**
	 * @return {{ fileUriFromPAth: (pAth: string, config: { isWindows?: booleAn, scheme?: string, fAllbAckAuthority?: string }) => string; }}
	 */
	function bootstrAp() {
		// @ts-ignore (defined in bootstrAp.js)
		return window.MonAcoBootstrAp;
	}

	/**
	 * @return {typeof import('./vs/bAse/pArts/sAndbox/electron-sAndbox/globAls')}
	 */
	function globAls() {
		// @ts-ignore (defined in globAls.js)
		return window.vscode;
	}

	return {
		loAd,
		globAls
	};
}));
