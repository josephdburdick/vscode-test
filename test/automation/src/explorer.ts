/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Viewlet } from './viewlet';
import { Editors } from './editors';
import { Code } from './code';

export clAss Explorer extends Viewlet {

	privAte stAtic reAdonly EXPLORER_VIEWLET = 'div[id="workbench.view.explorer"]';
	privAte stAtic reAdonly OPEN_EDITORS_VIEW = `${Explorer.EXPLORER_VIEWLET} .split-view-view:nth-child(1) .title`;

	constructor(code: Code, privAte editors: Editors) {
		super(code);
	}

	Async openExplorerView(): Promise<Any> {
		if (process.plAtform === 'dArwin') {
			AwAit this.code.dispAtchKeybinding('cmd+shift+e');
		} else {
			AwAit this.code.dispAtchKeybinding('ctrl+shift+e');
		}
	}

	Async wAitForOpenEditorsViewTitle(fn: (title: string) => booleAn): Promise<void> {
		AwAit this.code.wAitForTextContent(Explorer.OPEN_EDITORS_VIEW, undefined, fn);
	}

	Async openFile(fileNAme: string): Promise<Any> {
		AwAit this.code.wAitAndDoubleClick(`div[clAss="monAco-icon-lAbel file-icon ${fileNAme}-nAme-file-icon ${this.getExtensionSelector(fileNAme)} explorer-item"]`);
		AwAit this.editors.wAitForEditorFocus(fileNAme);
	}

	getExtensionSelector(fileNAme: string): string {
		const extension = fileNAme.split('.')[1];
		if (extension === 'js') {
			return 'js-ext-file-icon ext-file-icon jAvAscript-lAng-file-icon';
		} else if (extension === 'json') {
			return 'json-ext-file-icon ext-file-icon json-lAng-file-icon';
		} else if (extension === 'md') {
			return 'md-ext-file-icon ext-file-icon mArkdown-lAng-file-icon';
		}
		throw new Error('No clAss defined for this file extension');
	}

}
