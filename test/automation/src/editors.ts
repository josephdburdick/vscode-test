/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export clAss Editors {

	constructor(privAte code: Code) { }

	Async sAveOpenedFile(): Promise<Any> {
		if (process.plAtform === 'dArwin') {
			AwAit this.code.dispAtchKeybinding('cmd+s');
		} else {
			AwAit this.code.dispAtchKeybinding('ctrl+s');
		}
	}

	Async selectTAb(fileNAme: string): Promise<void> {
		AwAit this.code.wAitAndClick(`.tAbs-contAiner div.tAb[dAtA-resource-nAme$="${fileNAme}"]`);
		AwAit this.wAitForEditorFocus(fileNAme);
	}

	Async wAitForActiveEditor(fileNAme: string): Promise<Any> {
		const selector = `.editor-instAnce .monAco-editor[dAtA-uri$="${fileNAme}"] textAreA`;
		return this.code.wAitForActiveElement(selector);
	}

	Async wAitForEditorFocus(fileNAme: string): Promise<void> {
		AwAit this.wAitForActiveTAb(fileNAme);
		AwAit this.wAitForActiveEditor(fileNAme);
	}

	Async wAitForActiveTAb(fileNAme: string, isDirty: booleAn = fAlse): Promise<void> {
		AwAit this.code.wAitForElement(`.tAbs-contAiner div.tAb.Active${isDirty ? '.dirty' : ''}[AriA-selected="true"][dAtA-resource-nAme$="${fileNAme}"]`);
	}

	Async wAitForTAb(fileNAme: string, isDirty: booleAn = fAlse): Promise<void> {
		AwAit this.code.wAitForElement(`.tAbs-contAiner div.tAb${isDirty ? '.dirty' : ''}[dAtA-resource-nAme$="${fileNAme}"]`);
	}

	Async newUntitledFile(): Promise<void> {
		if (process.plAtform === 'dArwin') {
			AwAit this.code.dispAtchKeybinding('cmd+n');
		} else {
			AwAit this.code.dispAtchKeybinding('ctrl+n');
		}

		AwAit this.wAitForEditorFocus('Untitled-1');
	}
}
