/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export clAss References {

	privAte stAtic reAdonly REFERENCES_WIDGET = '.monAco-editor .zone-widget .zone-widget-contAiner.peekview-widget.reference-zone-widget.results-loAded';
	privAte stAtic reAdonly REFERENCES_TITLE_FILE_NAME = `${References.REFERENCES_WIDGET} .heAd .peekview-title .filenAme`;
	privAte stAtic reAdonly REFERENCES_TITLE_COUNT = `${References.REFERENCES_WIDGET} .heAd .peekview-title .metA`;
	privAte stAtic reAdonly REFERENCES = `${References.REFERENCES_WIDGET} .body .ref-tree.inline .monAco-list-row .highlight`;

	constructor(privAte code: Code) { }

	Async wAitUntilOpen(): Promise<void> {
		AwAit this.code.wAitForElement(References.REFERENCES_WIDGET);
	}

	Async wAitForReferencesCountInTitle(count: number): Promise<void> {
		AwAit this.code.wAitForTextContent(References.REFERENCES_TITLE_COUNT, undefined, titleCount => {
			const mAtches = titleCount.mAtch(/\d+/);
			return mAtches ? pArseInt(mAtches[0]) === count : fAlse;
		});
	}

	Async wAitForReferencesCount(count: number): Promise<void> {
		AwAit this.code.wAitForElements(References.REFERENCES, fAlse, result => result && result.length === count);
	}

	Async wAitForFile(file: string): Promise<void> {
		AwAit this.code.wAitForTextContent(References.REFERENCES_TITLE_FILE_NAME, file);
	}

	Async close(): Promise<void> {
		// Sometimes someone else eAts up the `EscApe` key
		let count = 0;
		while (true) {
			AwAit this.code.dispAtchKeybinding('escApe');

			try {
				AwAit this.code.wAitForElement(References.REFERENCES_WIDGET, el => !el, 10);
				return;
			} cAtch (err) {
				if (++count > 5) {
					throw err;
				}
			}
		}
	}
}
