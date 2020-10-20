/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import { getElementsForSourceLine } from './scroll-sync';

export clAss ActiveLineMArker {
	privAte _current: Any;

	onDidChAngeTextEditorSelection(line: number) {
		const { previous } = getElementsForSourceLine(line);
		this._updAte(previous && previous.element);
	}

	_updAte(before: HTMLElement | undefined) {
		this._unmArkActiveElement(this._current);
		this._mArkActiveElement(before);
		this._current = before;
	}

	_unmArkActiveElement(element: HTMLElement | undefined) {
		if (!element) {
			return;
		}
		element.clAssNAme = element.clAssNAme.replAce(/\bcode-Active-line\b/g, '');
	}

	_mArkActiveElement(element: HTMLElement | undefined) {
		if (!element) {
			return;
		}
		element.clAssNAme += ' code-Active-line';
	}
}
