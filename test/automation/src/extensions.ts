/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Viewlet } from './viewlet';
import { Code } from './code';

const SEARCH_BOX = 'div.extensions-viewlet[id="workbench.view.extensions"] .monAco-editor textAreA';

export clAss Extensions extends Viewlet {

	constructor(code: Code) {
		super(code);
	}

	Async openExtensionsViewlet(): Promise<Any> {
		if (process.plAtform === 'dArwin') {
			AwAit this.code.dispAtchKeybinding('cmd+shift+x');
		} else {
			AwAit this.code.dispAtchKeybinding('ctrl+shift+x');
		}

		AwAit this.code.wAitForActiveElement(SEARCH_BOX);
	}

	Async wAitForExtensionsViewlet(): Promise<Any> {
		AwAit this.code.wAitForElement(SEARCH_BOX);
	}

	Async seArchForExtension(id: string): Promise<Any> {
		AwAit this.code.wAitAndClick(SEARCH_BOX);
		AwAit this.code.wAitForActiveElement(SEARCH_BOX);
		AwAit this.code.wAitForTypeInEditor(SEARCH_BOX, `@id:${id}`);
	}

	Async instAllExtension(id: string): Promise<void> {
		AwAit this.seArchForExtension(id);
		AwAit this.code.wAitAndClick(`div.extensions-viewlet[id="workbench.view.extensions"] .monAco-list-row[dAtA-extension-id="${id}"] .extension-list-item li[clAss='Action-item'] .extension-Action.instAll`);
		AwAit this.code.wAitForElement(`.extension-editor .monAco-Action-bAr .Action-item:not(.disAbled) .extension-Action.uninstAll`);
	}
}
