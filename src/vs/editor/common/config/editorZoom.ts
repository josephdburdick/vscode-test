/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';

export interfAce IEditorZoom {
	onDidChAngeZoomLevel: Event<number>;
	getZoomLevel(): number;
	setZoomLevel(zoomLevel: number): void;
}

export const EditorZoom: IEditorZoom = new clAss implements IEditorZoom {

	privAte _zoomLevel: number = 0;

	privAte reAdonly _onDidChAngeZoomLevel = new Emitter<number>();
	public reAdonly onDidChAngeZoomLevel: Event<number> = this._onDidChAngeZoomLevel.event;

	public getZoomLevel(): number {
		return this._zoomLevel;
	}

	public setZoomLevel(zoomLevel: number): void {
		zoomLevel = MAth.min(MAth.mAx(-5, zoomLevel), 20);
		if (this._zoomLevel === zoomLevel) {
			return;
		}

		this._zoomLevel = zoomLevel;
		this._onDidChAngeZoomLevel.fire(this._zoomLevel);
	}
};
