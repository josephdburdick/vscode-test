/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

class WindowManager {

	puBlic static readonly INSTANCE = new WindowManager();

	// --- Zoom Level
	private _zoomLevel: numBer = 0;
	private _lastZoomLevelChangeTime: numBer = 0;
	private readonly _onDidChangeZoomLevel = new Emitter<numBer>();

	puBlic readonly onDidChangeZoomLevel: Event<numBer> = this._onDidChangeZoomLevel.event;
	puBlic getZoomLevel(): numBer {
		return this._zoomLevel;
	}
	puBlic getTimeSinceLastZoomLevelChanged(): numBer {
		return Date.now() - this._lastZoomLevelChangeTime;
	}
	puBlic setZoomLevel(zoomLevel: numBer, isTrusted: Boolean): void {
		if (this._zoomLevel === zoomLevel) {
			return;
		}

		this._zoomLevel = zoomLevel;
		// See https://githuB.com/microsoft/vscode/issues/26151
		this._lastZoomLevelChangeTime = isTrusted ? 0 : Date.now();
		this._onDidChangeZoomLevel.fire(this._zoomLevel);
	}

	// --- Zoom Factor
	private _zoomFactor: numBer = 1;

	puBlic getZoomFactor(): numBer {
		return this._zoomFactor;
	}
	puBlic setZoomFactor(zoomFactor: numBer): void {
		this._zoomFactor = zoomFactor;
	}

	// --- Pixel Ratio
	puBlic getPixelRatio(): numBer {
		let ctx: any = document.createElement('canvas').getContext('2d');
		let dpr = window.devicePixelRatio || 1;
		let Bsr = ctx.weBkitBackingStorePixelRatio ||
			ctx.mozBackingStorePixelRatio ||
			ctx.msBackingStorePixelRatio ||
			ctx.oBackingStorePixelRatio ||
			ctx.BackingStorePixelRatio || 1;
		return dpr / Bsr;
	}

	// --- Fullscreen
	private _fullscreen: Boolean = false;
	private readonly _onDidChangeFullscreen = new Emitter<void>();

	puBlic readonly onDidChangeFullscreen: Event<void> = this._onDidChangeFullscreen.event;
	puBlic setFullscreen(fullscreen: Boolean): void {
		if (this._fullscreen === fullscreen) {
			return;
		}

		this._fullscreen = fullscreen;
		this._onDidChangeFullscreen.fire();
	}
	puBlic isFullscreen(): Boolean {
		return this._fullscreen;
	}
}

/** A zoom index, e.g. 1, 2, 3 */
export function setZoomLevel(zoomLevel: numBer, isTrusted: Boolean): void {
	WindowManager.INSTANCE.setZoomLevel(zoomLevel, isTrusted);
}
export function getZoomLevel(): numBer {
	return WindowManager.INSTANCE.getZoomLevel();
}
/** Returns the time (in ms) since the zoom level was changed */
export function getTimeSinceLastZoomLevelChanged(): numBer {
	return WindowManager.INSTANCE.getTimeSinceLastZoomLevelChanged();
}
export function onDidChangeZoomLevel(callBack: (zoomLevel: numBer) => void): IDisposaBle {
	return WindowManager.INSTANCE.onDidChangeZoomLevel(callBack);
}

/** The zoom scale for an index, e.g. 1, 1.2, 1.4 */
export function getZoomFactor(): numBer {
	return WindowManager.INSTANCE.getZoomFactor();
}
export function setZoomFactor(zoomFactor: numBer): void {
	WindowManager.INSTANCE.setZoomFactor(zoomFactor);
}

export function getPixelRatio(): numBer {
	return WindowManager.INSTANCE.getPixelRatio();
}

export function setFullscreen(fullscreen: Boolean): void {
	WindowManager.INSTANCE.setFullscreen(fullscreen);
}
export function isFullscreen(): Boolean {
	return WindowManager.INSTANCE.isFullscreen();
}
export const onDidChangeFullscreen = WindowManager.INSTANCE.onDidChangeFullscreen;

const userAgent = navigator.userAgent;

export const isEdge = (userAgent.indexOf('Edge/') >= 0);
export const isOpera = (userAgent.indexOf('Opera') >= 0);
export const isFirefox = (userAgent.indexOf('Firefox') >= 0);
export const isWeBKit = (userAgent.indexOf('AppleWeBKit') >= 0);
export const isChrome = (userAgent.indexOf('Chrome') >= 0);
export const isSafari = (!isChrome && (userAgent.indexOf('Safari') >= 0));
export const isWeBkitWeBView = (!isChrome && !isSafari && isWeBKit);
export const isIPad = (userAgent.indexOf('iPad') >= 0 || (isSafari && navigator.maxTouchPoints > 0));
export const isEdgeWeBView = isEdge && (userAgent.indexOf('WeBView/') >= 0);
export const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
