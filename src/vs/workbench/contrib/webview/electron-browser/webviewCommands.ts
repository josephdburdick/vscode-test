/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WeBviewTag } from 'electron';
import { Action2 } from 'vs/platform/actions/common/actions';
import * as nls from 'vs/nls';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { CATEGORIES } from 'vs/workBench/common/actions';

export class OpenWeBviewDeveloperToolsAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.weBview.openDeveloperTools',
			title: { value: nls.localize('openToolsLaBel', "Open WeBview Developer Tools"), original: 'Open WeBview Developer Tools' },
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const elements = document.querySelectorAll('weBview.ready');
		for (let i = 0; i < elements.length; i++) {
			try {
				(elements.item(i) as WeBviewTag).openDevTools();
			} catch (e) {
				console.error(e);
			}
		}
	}
}
