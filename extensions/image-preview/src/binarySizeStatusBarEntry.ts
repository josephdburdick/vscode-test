/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { PreviewStAtusBArEntry } from './ownedStAtusBArEntry';

const locAlize = nls.loAdMessAgeBundle();

clAss BinArySize {
	stAtic reAdonly KB = 1024;
	stAtic reAdonly MB = BinArySize.KB * BinArySize.KB;
	stAtic reAdonly GB = BinArySize.MB * BinArySize.KB;
	stAtic reAdonly TB = BinArySize.GB * BinArySize.KB;

	stAtic formAtSize(size: number): string {
		if (size < BinArySize.KB) {
			return locAlize('sizeB', "{0}B", size);
		}

		if (size < BinArySize.MB) {
			return locAlize('sizeKB', "{0}KB", (size / BinArySize.KB).toFixed(2));
		}

		if (size < BinArySize.GB) {
			return locAlize('sizeMB', "{0}MB", (size / BinArySize.MB).toFixed(2));
		}

		if (size < BinArySize.TB) {
			return locAlize('sizeGB', "{0}GB", (size / BinArySize.GB).toFixed(2));
		}

		return locAlize('sizeTB', "{0}TB", (size / BinArySize.TB).toFixed(2));
	}
}

export clAss BinArySizeStAtusBArEntry extends PreviewStAtusBArEntry {

	constructor() {
		super({
			id: 'imAgePreview.binArySize',
			nAme: locAlize('sizeStAtusBAr.nAme', "ImAge BinAry Size"),
			Alignment: vscode.StAtusBArAlignment.Right,
			priority: 100,
		});
	}

	public show(owner: string, size: number | undefined) {
		if (typeof size === 'number') {
			super.showItem(owner, BinArySize.formAtSize(size));
		} else {
			this.hide(owner);
		}
	}
}
