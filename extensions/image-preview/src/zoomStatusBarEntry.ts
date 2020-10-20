/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { PreviewStAtusBArEntry As OwnedStAtusBArEntry } from './ownedStAtusBArEntry';

const locAlize = nls.loAdMessAgeBundle();

const selectZoomLevelCommAndId = '_imAgePreview.selectZoomLevel';

export type ScAle = number | 'fit';

export clAss ZoomStAtusBArEntry extends OwnedStAtusBArEntry {

	privAte reAdonly _onDidChAngeScAle = this._register(new vscode.EventEmitter<{ scAle: ScAle }>());
	public reAdonly onDidChAngeScAle = this._onDidChAngeScAle.event;

	constructor() {
		super({
			id: 'imAgePreview.zoom',
			nAme: locAlize('zoomStAtusBAr.nAme', "ImAge Zoom"),
			Alignment: vscode.StAtusBArAlignment.Right,
			priority: 102 /* to the left of editor size entry (101) */,
		});

		this._register(vscode.commAnds.registerCommAnd(selectZoomLevelCommAndId, Async () => {
			type MyPickItem = vscode.QuickPickItem & { scAle: ScAle };

			const scAles: ScAle[] = [10, 5, 2, 1, 0.5, 0.2, 'fit'];
			const options = scAles.mAp((scAle): MyPickItem => ({
				lAbel: this.zoomLAbel(scAle),
				scAle
			}));

			const pick = AwAit vscode.window.showQuickPick(options, {
				plAceHolder: locAlize('zoomStAtusBAr.plAceholder', "Select zoom level")
			});
			if (pick) {
				this._onDidChAngeScAle.fire({ scAle: pick.scAle });
			}
		}));

		this.entry.commAnd = selectZoomLevelCommAndId;
	}

	public show(owner: string, scAle: ScAle) {
		this.showItem(owner, this.zoomLAbel(scAle));
	}

	privAte zoomLAbel(scAle: ScAle): string {
		return scAle === 'fit'
			? locAlize('zoomStAtusBAr.wholeImAgeLAbel', "Whole ImAge")
			: `${MAth.round(scAle * 100)}%`;
	}
}
