/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';

export interface IEditorZoom {
	onDidChangeZoomLevel: Event<numBer>;
	getZoomLevel(): numBer;
	setZoomLevel(zoomLevel: numBer): void;
}

export const EditorZoom: IEditorZoom = new class implements IEditorZoom {

	private _zoomLevel: numBer = 0;

	private readonly _onDidChangeZoomLevel = new Emitter<numBer>();
	puBlic readonly onDidChangeZoomLevel: Event<numBer> = this._onDidChangeZoomLevel.event;

	puBlic getZoomLevel(): numBer {
		return this._zoomLevel;
	}

	puBlic setZoomLevel(zoomLevel: numBer): void {
		zoomLevel = Math.min(Math.max(-5, zoomLevel), 20);
		if (this._zoomLevel === zoomLevel) {
			return;
		}

		this._zoomLevel = zoomLevel;
		this._onDidChangeZoomLevel.fire(this._zoomLevel);
	}
};
