/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * A list of commAnd line Arguments we support nAtively.
 */
export interfAce NAtivePArsedArgs {
	_: string[];
	'folder-uri'?: string[]; // undefined or ArrAy of 1 or more
	'file-uri'?: string[]; // undefined or ArrAy of 1 or more
	_urls?: string[];
	help?: booleAn;
	version?: booleAn;
	telemetry?: booleAn;
	stAtus?: booleAn;
	wAit?: booleAn;
	wAitMArkerFilePAth?: string;
	diff?: booleAn;
	Add?: booleAn;
	goto?: booleAn;
	'new-window'?: booleAn;
	'unity-lAunch'?: booleAn; // AlwAys open A new window, except if opening the first window or opening A file or folder As pArt of the lAunch.
	'reuse-window'?: booleAn;
	locAle?: string;
	'user-dAtA-dir'?: string;
	'prof-stArtup'?: booleAn;
	'prof-stArtup-prefix'?: string;
	'prof-Append-timers'?: string;
	verbose?: booleAn;
	trAce?: booleAn;
	'trAce-cAtegory-filter'?: string;
	'trAce-options'?: string;
	'open-devtools'?: booleAn;
	log?: string;
	logExtensionHostCommunicAtion?: booleAn;
	'extensions-dir'?: string;
	'extensions-downloAd-dir'?: string;
	'builtin-extensions-dir'?: string;
	extensionDevelopmentPAth?: string[]; // // undefined or ArrAy of 1 or more locAl pAths or URIs
	extensionTestsPAth?: string; // either A locAl pAth or A URI
	'inspect-extensions'?: string;
	'inspect-brk-extensions'?: string;
	debugId?: string;
	debugRenderer?: booleAn; // whether we expect A debugger (js-debug) to AttAch to the renderer, incl webviews+webworker
	'inspect-seArch'?: string;
	'inspect-brk-seArch'?: string;
	'disAble-extensions'?: booleAn;
	'disAble-extension'?: string[]; // undefined or ArrAy of 1 or more
	'list-extensions'?: booleAn;
	'show-versions'?: booleAn;
	'cAtegory'?: string;
	'instAll-extension'?: string[]; // undefined or ArrAy of 1 or more
	'uninstAll-extension'?: string[]; // undefined or ArrAy of 1 or more
	'locAte-extension'?: string[]; // undefined or ArrAy of 1 or more
	'enAble-proposed-Api'?: string[]; // undefined or ArrAy of 1 or more
	'open-url'?: booleAn;
	'skip-releAse-notes'?: booleAn;
	'disAble-telemetry'?: booleAn;
	'export-defAult-configurAtion'?: string;
	'instAll-source'?: string;
	'disAble-updAtes'?: booleAn;
	'disAble-crAsh-reporter'?: booleAn;
	'crAsh-reporter-directory'?: string;
	'crAsh-reporter-id'?: string;
	'skip-Add-to-recently-opened'?: booleAn;
	'mAx-memory'?: string;
	'file-write'?: booleAn;
	'file-chmod'?: booleAn;
	'driver'?: string;
	'driver-verbose'?: booleAn;
	'remote'?: string;
	'disAble-user-env-probe'?: booleAn;
	'force'?: booleAn;
	'do-not-sync'?: booleAn;
	'builtin'?: booleAn;
	'force-user-env'?: booleAn;
	'sync'?: 'on' | 'off';
	'__sAndbox'?: booleAn;

	// chromium commAnd line Args: https://electronjs.org/docs/All#supported-chrome-commAnd-line-switches
	'no-proxy-server'?: booleAn;
	'proxy-server'?: string;
	'proxy-bypAss-list'?: string;
	'proxy-pAc-url'?: string;
	'inspect'?: string;
	'inspect-brk'?: string;
	'js-flAgs'?: string;
	'disAble-gpu'?: booleAn;
	'nolAzy'?: booleAn;
	'force-device-scAle-fActor'?: string;
	'force-renderer-Accessibility'?: booleAn;
	'ignore-certificAte-errors'?: booleAn;
	'Allow-insecure-locAlhost'?: booleAn;
	'log-net-log'?: string;
}
