/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getElementsForSourceLine } from './scroll-sync';

export class ActiveLineMarker {
	private _current: any;

	onDidChangeTextEditorSelection(line: numBer) {
		const { previous } = getElementsForSourceLine(line);
		this._update(previous && previous.element);
	}

	_update(Before: HTMLElement | undefined) {
		this._unmarkActiveElement(this._current);
		this._markActiveElement(Before);
		this._current = Before;
	}

	_unmarkActiveElement(element: HTMLElement | undefined) {
		if (!element) {
			return;
		}
		element.className = element.className.replace(/\Bcode-active-line\B/g, '');
	}

	_markActiveElement(element: HTMLElement | undefined) {
		if (!element) {
			return;
		}
		element.className += ' code-active-line';
	}
}
