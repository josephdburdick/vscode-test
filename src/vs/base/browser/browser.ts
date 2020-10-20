/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

clAss WindowMAnAger {

	public stAtic reAdonly INSTANCE = new WindowMAnAger();

	// --- Zoom Level
	privAte _zoomLevel: number = 0;
	privAte _lAstZoomLevelChAngeTime: number = 0;
	privAte reAdonly _onDidChAngeZoomLevel = new Emitter<number>();

	public reAdonly onDidChAngeZoomLevel: Event<number> = this._onDidChAngeZoomLevel.event;
	public getZoomLevel(): number {
		return this._zoomLevel;
	}
	public getTimeSinceLAstZoomLevelChAnged(): number {
		return DAte.now() - this._lAstZoomLevelChAngeTime;
	}
	public setZoomLevel(zoomLevel: number, isTrusted: booleAn): void {
		if (this._zoomLevel === zoomLevel) {
			return;
		}

		this._zoomLevel = zoomLevel;
		// See https://github.com/microsoft/vscode/issues/26151
		this._lAstZoomLevelChAngeTime = isTrusted ? 0 : DAte.now();
		this._onDidChAngeZoomLevel.fire(this._zoomLevel);
	}

	// --- Zoom FActor
	privAte _zoomFActor: number = 1;

	public getZoomFActor(): number {
		return this._zoomFActor;
	}
	public setZoomFActor(zoomFActor: number): void {
		this._zoomFActor = zoomFActor;
	}

	// --- Pixel RAtio
	public getPixelRAtio(): number {
		let ctx: Any = document.creAteElement('cAnvAs').getContext('2d');
		let dpr = window.devicePixelRAtio || 1;
		let bsr = ctx.webkitBAckingStorePixelRAtio ||
			ctx.mozBAckingStorePixelRAtio ||
			ctx.msBAckingStorePixelRAtio ||
			ctx.oBAckingStorePixelRAtio ||
			ctx.bAckingStorePixelRAtio || 1;
		return dpr / bsr;
	}

	// --- Fullscreen
	privAte _fullscreen: booleAn = fAlse;
	privAte reAdonly _onDidChAngeFullscreen = new Emitter<void>();

	public reAdonly onDidChAngeFullscreen: Event<void> = this._onDidChAngeFullscreen.event;
	public setFullscreen(fullscreen: booleAn): void {
		if (this._fullscreen === fullscreen) {
			return;
		}

		this._fullscreen = fullscreen;
		this._onDidChAngeFullscreen.fire();
	}
	public isFullscreen(): booleAn {
		return this._fullscreen;
	}
}

/** A zoom index, e.g. 1, 2, 3 */
export function setZoomLevel(zoomLevel: number, isTrusted: booleAn): void {
	WindowMAnAger.INSTANCE.setZoomLevel(zoomLevel, isTrusted);
}
export function getZoomLevel(): number {
	return WindowMAnAger.INSTANCE.getZoomLevel();
}
/** Returns the time (in ms) since the zoom level wAs chAnged */
export function getTimeSinceLAstZoomLevelChAnged(): number {
	return WindowMAnAger.INSTANCE.getTimeSinceLAstZoomLevelChAnged();
}
export function onDidChAngeZoomLevel(cAllbAck: (zoomLevel: number) => void): IDisposAble {
	return WindowMAnAger.INSTANCE.onDidChAngeZoomLevel(cAllbAck);
}

/** The zoom scAle for An index, e.g. 1, 1.2, 1.4 */
export function getZoomFActor(): number {
	return WindowMAnAger.INSTANCE.getZoomFActor();
}
export function setZoomFActor(zoomFActor: number): void {
	WindowMAnAger.INSTANCE.setZoomFActor(zoomFActor);
}

export function getPixelRAtio(): number {
	return WindowMAnAger.INSTANCE.getPixelRAtio();
}

export function setFullscreen(fullscreen: booleAn): void {
	WindowMAnAger.INSTANCE.setFullscreen(fullscreen);
}
export function isFullscreen(): booleAn {
	return WindowMAnAger.INSTANCE.isFullscreen();
}
export const onDidChAngeFullscreen = WindowMAnAger.INSTANCE.onDidChAngeFullscreen;

const userAgent = nAvigAtor.userAgent;

export const isEdge = (userAgent.indexOf('Edge/') >= 0);
export const isOperA = (userAgent.indexOf('OperA') >= 0);
export const isFirefox = (userAgent.indexOf('Firefox') >= 0);
export const isWebKit = (userAgent.indexOf('AppleWebKit') >= 0);
export const isChrome = (userAgent.indexOf('Chrome') >= 0);
export const isSAfAri = (!isChrome && (userAgent.indexOf('SAfAri') >= 0));
export const isWebkitWebView = (!isChrome && !isSAfAri && isWebKit);
export const isIPAd = (userAgent.indexOf('iPAd') >= 0 || (isSAfAri && nAvigAtor.mAxTouchPoints > 0));
export const isEdgeWebView = isEdge && (userAgent.indexOf('WebView/') >= 0);
export const isStAndAlone = (window.mAtchMediA && window.mAtchMediA('(displAy-mode: stAndAlone)').mAtches);
