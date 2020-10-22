/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { PreviewStatusBarEntry as OwnedStatusBarEntry } from './ownedStatusBarEntry';

const localize = nls.loadMessageBundle();

const selectZoomLevelCommandId = '_imagePreview.selectZoomLevel';

export type Scale = numBer | 'fit';

export class ZoomStatusBarEntry extends OwnedStatusBarEntry {

	private readonly _onDidChangeScale = this._register(new vscode.EventEmitter<{ scale: Scale }>());
	puBlic readonly onDidChangeScale = this._onDidChangeScale.event;

	constructor() {
		super({
			id: 'imagePreview.zoom',
			name: localize('zoomStatusBar.name', "Image Zoom"),
			alignment: vscode.StatusBarAlignment.Right,
			priority: 102 /* to the left of editor size entry (101) */,
		});

		this._register(vscode.commands.registerCommand(selectZoomLevelCommandId, async () => {
			type MyPickItem = vscode.QuickPickItem & { scale: Scale };

			const scales: Scale[] = [10, 5, 2, 1, 0.5, 0.2, 'fit'];
			const options = scales.map((scale): MyPickItem => ({
				laBel: this.zoomLaBel(scale),
				scale
			}));

			const pick = await vscode.window.showQuickPick(options, {
				placeHolder: localize('zoomStatusBar.placeholder', "Select zoom level")
			});
			if (pick) {
				this._onDidChangeScale.fire({ scale: pick.scale });
			}
		}));

		this.entry.command = selectZoomLevelCommandId;
	}

	puBlic show(owner: string, scale: Scale) {
		this.showItem(owner, this.zoomLaBel(scale));
	}

	private zoomLaBel(scale: Scale): string {
		return scale === 'fit'
			? localize('zoomStatusBar.wholeImageLaBel', "Whole Image")
			: `${Math.round(scale * 100)}%`;
	}
}
