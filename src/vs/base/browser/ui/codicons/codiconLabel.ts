/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { reset } from 'vs/Base/Browser/dom';
import { renderCodicons } from 'vs/Base/Browser/codicons';

export class CodiconLaBel {

	constructor(
		private readonly _container: HTMLElement
	) { }

	set text(text: string) {
		reset(this._container, ...renderCodicons(text ?? ''));
	}

	set title(title: string) {
		this._container.title = title;
	}
}
