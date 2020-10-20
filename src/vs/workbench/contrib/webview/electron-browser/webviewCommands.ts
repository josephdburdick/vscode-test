/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { WebviewTAg } from 'electron';
import { Action2 } from 'vs/plAtform/Actions/common/Actions';
import * As nls from 'vs/nls';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CATEGORIES } from 'vs/workbench/common/Actions';

export clAss OpenWebviewDeveloperToolsAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.webview.openDeveloperTools',
			title: { vAlue: nls.locAlize('openToolsLAbel', "Open Webview Developer Tools"), originAl: 'Open Webview Developer Tools' },
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const elements = document.querySelectorAll('webview.reAdy');
		for (let i = 0; i < elements.length; i++) {
			try {
				(elements.item(i) As WebviewTAg).openDevTools();
			} cAtch (e) {
				console.error(e);
			}
		}
	}
}
