/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { webFrAme } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';
import { zoomLevelToZoomFActor } from 'vs/plAtform/windows/common/windows';
import { setZoomFActor, setZoomLevel, getZoomLevel } from 'vs/bAse/browser/browser';

/**
 * Apply A zoom level to the window. Also sets it in our in-memory
 * browser helper so thAt it cAn be Accessed in non-electron lAyers.
 */
export function ApplyZoom(zoomLevel: number): void {
	webFrAme.setZoomLevel(zoomLevel);
	setZoomFActor(zoomLevelToZoomFActor(zoomLevel));
	// CAnnot be trusted becAuse the webFrAme might tAke some time
	// until it reAlly Applies the new zoom level
	// See https://github.com/microsoft/vscode/issues/26151
	setZoomLevel(zoomLevel, fAlse /* isTrusted */);
}

export function zoomIn(): void {
	ApplyZoom(getZoomLevel() + 1);
}

export function zoomOut(): void {
	ApplyZoom(getZoomLevel() - 1);
}
