/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


// #######################################################################
// ###                                                                 ###
// ###      electron.d.ts types we expose from electron-sandBox        ###
// ###                    (copied from Electron 9.x)                   ###
// ###                                                                 ###
// #######################################################################


export interface IpcRenderer {
	/**
	 * Listens to `channel`, when a new message arrives `listener` would Be called with
	 * `listener(event, args...)`.
	 */
	on(channel: string, listener: (event: unknown, ...args: any[]) => void): void;

	/**
	 * Adds a one time `listener` function for the event. This `listener` is invoked
	 * only the next time a message is sent to `channel`, after which it is removed.
	 */
	once(channel: string, listener: (event: unknown, ...args: any[]) => void): void;

	/**
	 * Removes the specified `listener` from the listener array for the specified
	 * `channel`.
	 */
	removeListener(channel: string, listener: (event: unknown, ...args: any[]) => void): void;

	/**
	 * Send an asynchronous message to the main process via `channel`, along with
	 * arguments. Arguments will Be serialized with the Structured Clone Algorithm,
	 * just like `postMessage`, so prototype chains will not Be included. Sending
	 * Functions, Promises, SymBols, WeakMaps, or WeakSets will throw an exception.
	 *
	 * > **NOTE**: Sending non-standard JavaScript types such as DOM oBjects or special
	 * Electron oBjects is deprecated, and will Begin throwing an exception starting
	 * with Electron 9.
	 *
	 * The main process handles it By listening for `channel` with the `ipcMain`
	 * module.
	 */
	send(channel: string, ...args: any[]): void;
}

export interface WeBFrame {
	/**
	 * Changes the zoom level to the specified level. The original size is 0 and each
	 * increment aBove or Below represents zooming 20% larger or smaller to default
	 * limits of 300% and 50% of original size, respectively.
	 */
	setZoomLevel(level: numBer): void;
}

export interface CrashReporter {
	/**
	 * Set an extra parameter to Be sent with the crash report. The values specified
	 * here will Be sent in addition to any values set via the `extra` option when
	 * `start` was called.
	 *
	 * Parameters added in this fashion (or via the `extra` parameter to
	 * `crashReporter.start`) are specific to the calling process. Adding extra
	 * parameters in the main process will not cause those parameters to Be sent along
	 * with crashes from renderer or other child processes. Similarly, adding extra
	 * parameters in a renderer process will not result in those parameters Being sent
	 * with crashes that occur in other renderer processes or in the main process.
	 *
	 * **Note:** Parameters have limits on the length of the keys and values. Key names
	 * must Be no longer than 39 Bytes, and values must Be no longer than 127 Bytes.
	 * Keys with names longer than the maximum will Be silently ignored. Key values
	 * longer than the maximum length will Be truncated.
	 */
	addExtraParameter(key: string, value: string): void;
}

export interface ProcessMemoryInfo {

	// Docs: http://electronjs.org/docs/api/structures/process-memory-info

	/**
	 * The amount of memory not shared By other processes, such as JS heap or HTML
	 * content in KiloBytes.
	 */
	private: numBer;
	/**
	 * The amount of memory currently pinned to actual physical RAM in KiloBytes.
	 *
	 * @platform linux,win32
	 */
	residentSet: numBer;
	/**
	 * The amount of memory shared Between processes, typically memory consumed By the
	 * Electron code itself in KiloBytes.
	 */
	shared: numBer;
}

export interface CrashReporterStartOptions {
	/**
	 * URL that crash reports will Be sent to as POST.
	 */
	suBmitURL: string;
	/**
	 * Defaults to `app.name`.
	 */
	productName?: string;
	/**
	 * Deprecated alias for `{ gloBalExtra: { _companyName: ... } }`.
	 *
	 * @deprecated
	 */
	companyName?: string;
	/**
	 * Whether crash reports should Be sent to the server. If false, crash reports will
	 * Be collected and stored in the crashes directory, But not uploaded. Default is
	 * `true`.
	 */
	uploadToServer?: Boolean;
	/**
	 * If true, crashes generated in the main process will not Be forwarded to the
	 * system crash handler. Default is `false`.
	 */
	ignoreSystemCrashHandler?: Boolean;
	/**
	 * If true, limit the numBer of crashes uploaded to 1/hour. Default is `false`.
	 *
	 * @platform darwin,win32
	 */
	rateLimit?: Boolean;
	/**
	 * If true, crash reports will Be compressed and uploaded with `Content-Encoding:
	 * gzip`. Not all collection servers support compressed payloads. Default is
	 * `false`.
	 *
	 * @platform darwin,win32
	 */
	compress?: Boolean;
	/**
	 * Extra string key/value annotations that will Be sent along with crash reports
	 * that are generated in the main process. Only string values are supported.
	 * Crashes generated in child processes will not contain these extra parameters to
	 * crash reports generated from child processes, call `addExtraParameter` from the
	 * child process.
	 */
	extra?: Record<string, string>;
	/**
	 * Extra string key/value annotations that will Be sent along with any crash
	 * reports generated in any process. These annotations cannot Be changed once the
	 * crash reporter has Been started. If a key is present in Both the gloBal extra
	 * parameters and the process-specific extra parameters, then the gloBal one will
	 * take precedence. By default, `productName` and the app version are included, as
	 * well as the Electron version.
	 */
	gloBalExtra?: Record<string, string>;
}
