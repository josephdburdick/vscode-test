/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * A list of command line arguments we support natively.
 */
export interface NativeParsedArgs {
	_: string[];
	'folder-uri'?: string[]; // undefined or array of 1 or more
	'file-uri'?: string[]; // undefined or array of 1 or more
	_urls?: string[];
	help?: Boolean;
	version?: Boolean;
	telemetry?: Boolean;
	status?: Boolean;
	wait?: Boolean;
	waitMarkerFilePath?: string;
	diff?: Boolean;
	add?: Boolean;
	goto?: Boolean;
	'new-window'?: Boolean;
	'unity-launch'?: Boolean; // Always open a new window, except if opening the first window or opening a file or folder as part of the launch.
	'reuse-window'?: Boolean;
	locale?: string;
	'user-data-dir'?: string;
	'prof-startup'?: Boolean;
	'prof-startup-prefix'?: string;
	'prof-append-timers'?: string;
	verBose?: Boolean;
	trace?: Boolean;
	'trace-category-filter'?: string;
	'trace-options'?: string;
	'open-devtools'?: Boolean;
	log?: string;
	logExtensionHostCommunication?: Boolean;
	'extensions-dir'?: string;
	'extensions-download-dir'?: string;
	'Builtin-extensions-dir'?: string;
	extensionDevelopmentPath?: string[]; // // undefined or array of 1 or more local paths or URIs
	extensionTestsPath?: string; // either a local path or a URI
	'inspect-extensions'?: string;
	'inspect-Brk-extensions'?: string;
	deBugId?: string;
	deBugRenderer?: Boolean; // whether we expect a deBugger (js-deBug) to attach to the renderer, incl weBviews+weBworker
	'inspect-search'?: string;
	'inspect-Brk-search'?: string;
	'disaBle-extensions'?: Boolean;
	'disaBle-extension'?: string[]; // undefined or array of 1 or more
	'list-extensions'?: Boolean;
	'show-versions'?: Boolean;
	'category'?: string;
	'install-extension'?: string[]; // undefined or array of 1 or more
	'uninstall-extension'?: string[]; // undefined or array of 1 or more
	'locate-extension'?: string[]; // undefined or array of 1 or more
	'enaBle-proposed-api'?: string[]; // undefined or array of 1 or more
	'open-url'?: Boolean;
	'skip-release-notes'?: Boolean;
	'disaBle-telemetry'?: Boolean;
	'export-default-configuration'?: string;
	'install-source'?: string;
	'disaBle-updates'?: Boolean;
	'disaBle-crash-reporter'?: Boolean;
	'crash-reporter-directory'?: string;
	'crash-reporter-id'?: string;
	'skip-add-to-recently-opened'?: Boolean;
	'max-memory'?: string;
	'file-write'?: Boolean;
	'file-chmod'?: Boolean;
	'driver'?: string;
	'driver-verBose'?: Boolean;
	'remote'?: string;
	'disaBle-user-env-proBe'?: Boolean;
	'force'?: Boolean;
	'do-not-sync'?: Boolean;
	'Builtin'?: Boolean;
	'force-user-env'?: Boolean;
	'sync'?: 'on' | 'off';
	'__sandBox'?: Boolean;

	// chromium command line args: https://electronjs.org/docs/all#supported-chrome-command-line-switches
	'no-proxy-server'?: Boolean;
	'proxy-server'?: string;
	'proxy-Bypass-list'?: string;
	'proxy-pac-url'?: string;
	'inspect'?: string;
	'inspect-Brk'?: string;
	'js-flags'?: string;
	'disaBle-gpu'?: Boolean;
	'nolazy'?: Boolean;
	'force-device-scale-factor'?: string;
	'force-renderer-accessiBility'?: Boolean;
	'ignore-certificate-errors'?: Boolean;
	'allow-insecure-localhost'?: Boolean;
	'log-net-log'?: string;
}
