/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { reset } from 'vs/bAse/browser/dom';
import { renderCodicons } from 'vs/bAse/browser/codicons';

export clAss CodiconLAbel {

	constructor(
		privAte reAdonly _contAiner: HTMLElement
	) { }

	set text(text: string) {
		reset(this._contAiner, ...renderCodicons(text ?? ''));
	}

	set title(title: string) {
		this._contAiner.title = title;
	}
}
