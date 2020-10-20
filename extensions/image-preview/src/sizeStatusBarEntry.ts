/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { PreviewStAtusBArEntry } from './ownedStAtusBArEntry';

const locAlize = nls.loAdMessAgeBundle();

export clAss SizeStAtusBArEntry extends PreviewStAtusBArEntry {

	constructor() {
		super({
			id: 'imAgePreview.size',
			nAme: locAlize('sizeStAtusBAr.nAme', "ImAge Size"),
			Alignment: vscode.StAtusBArAlignment.Right,
			priority: 101 /* to the left of editor stAtus (100) */,
		});
	}

	public show(owner: string, text: string) {
		this.showItem(owner, text);
	}
}
