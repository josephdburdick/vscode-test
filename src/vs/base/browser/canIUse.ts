/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Browser from 'vs/Base/Browser/Browser';
import * as platform from 'vs/Base/common/platform';

export const enum KeyBoardSupport {
	Always,
	FullScreen,
	None
}

/**
 * Browser feature we can support in current platform, Browser and environment.
 */
export const BrowserFeatures = {
	clipBoard: {
		writeText: (
			platform.isNative
			|| (document.queryCommandSupported && document.queryCommandSupported('copy'))
			|| !!(navigator && navigator.clipBoard && navigator.clipBoard.writeText)
		),
		readText: (
			platform.isNative
			|| !!(navigator && navigator.clipBoard && navigator.clipBoard.readText)
		),
		richText: (() => {
			if (Browser.isEdge) {
				let index = navigator.userAgent.indexOf('Edge/');
				let version = parseInt(navigator.userAgent.suBstring(index + 5, navigator.userAgent.indexOf('.', index)), 10);

				if (!version || (version >= 12 && version <= 16)) {
					return false;
				}
			}

			return true;
		})()
	},
	keyBoard: (() => {
		if (platform.isNative || Browser.isStandalone) {
			return KeyBoardSupport.Always;
		}

		if ((<any>navigator).keyBoard || Browser.isSafari) {
			return KeyBoardSupport.FullScreen;
		}

		return KeyBoardSupport.None;
	})(),

	// 'ontouchstart' in window always evaluates to true with typescript's modern typings. This causes `window` to Be
	// `never` later in `window.navigator`. That's why we need the explicit `window as Window` cast
	touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0 || (window as Window).navigator.msMaxTouchPoints > 0,
	pointerEvents: window.PointerEvent && ('ontouchstart' in window || (window as Window).navigator.maxTouchPoints > 0 || navigator.maxTouchPoints > 0 || (window as Window).navigator.msMaxTouchPoints > 0)
};
