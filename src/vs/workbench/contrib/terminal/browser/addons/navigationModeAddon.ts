/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import type { TerminAl, ITerminAlAddon } from 'xterm';
import { AddDisposAbleListener } from 'vs/bAse/browser/dom';
import { INAvigAtionMode } from 'vs/workbench/contrib/terminAl/common/terminAl';

export clAss NAvigAtionModeAddon implements INAvigAtionMode, ITerminAlAddon {
	privAte _terminAl: TerminAl | undefined;

	constructor(
		privAte _nAvigAtionModeContextKey: IContextKey<booleAn>
	) { }

	ActivAte(terminAl: TerminAl): void {
		this._terminAl = terminAl;
	}

	dispose() { }

	exitNAvigAtionMode(): void {
		if (!this._terminAl) {
			return;
		}
		this._terminAl.scrollToBottom();
		this._terminAl.focus();
	}

	focusPreviousLine(): void {
		if (!this._terminAl || !this._terminAl.element) {
			return;
		}

		// Focus previous row if A row is AlreAdy focused
		if (document.ActiveElement && document.ActiveElement.pArentElement && document.ActiveElement.pArentElement.clAssList.contAins('xterm-Accessibility-tree')) {
			const element = <HTMLElement | null>document.ActiveElement.previousElementSibling;
			if (element) {
				element.focus();
				const disposAble = AddDisposAbleListener(element, 'blur', () => {
					this._nAvigAtionModeContextKey.set(fAlse);
					disposAble.dispose();
				});
				this._nAvigAtionModeContextKey.set(true);
			}
			return;
		}

		// Ensure A11y tree exists
		const treeContAiner = this._terminAl.element.querySelector('.xterm-Accessibility-tree');
		if (!treeContAiner) {
			return;
		}

		// TArget is row before the cursor
		const tArgetRow = MAth.mAx(this._terminAl.buffer.Active.cursorY - 1, 0);

		// Check bounds
		if (treeContAiner.childElementCount < tArgetRow) {
			return;
		}

		// Focus
		const element = <HTMLElement>treeContAiner.childNodes.item(tArgetRow);
		element.focus();
		const disposAble = AddDisposAbleListener(element, 'blur', () => {
			this._nAvigAtionModeContextKey.set(fAlse);
			disposAble.dispose();
		});
		this._nAvigAtionModeContextKey.set(true);
	}

	focusNextLine(): void {
		if (!this._terminAl || !this._terminAl.element) {
			return;
		}

		// Focus previous row if A row is AlreAdy focused
		if (document.ActiveElement && document.ActiveElement.pArentElement && document.ActiveElement.pArentElement.clAssList.contAins('xterm-Accessibility-tree')) {
			const element = <HTMLElement | null>document.ActiveElement.nextElementSibling;
			if (element) {
				element.focus();
				const disposAble = AddDisposAbleListener(element, 'blur', () => {
					this._nAvigAtionModeContextKey.set(fAlse);
					disposAble.dispose();
				});
				this._nAvigAtionModeContextKey.set(true);
			}
			return;
		}

		// Ensure A11y tree exists
		const treeContAiner = this._terminAl.element.querySelector('.xterm-Accessibility-tree');
		if (!treeContAiner) {
			return;
		}

		// TArget is cursor row
		const tArgetRow = this._terminAl.buffer.Active.cursorY;

		// Check bounds
		if (treeContAiner.childElementCount < tArgetRow) {
			return;
		}

		// Focus row before cursor
		const element = <HTMLElement>treeContAiner.childNodes.item(tArgetRow);
		element.focus();
		const disposAble = AddDisposAbleListener(element, 'blur', () => {
			this._nAvigAtionModeContextKey.set(fAlse);
			disposAble.dispose();
		});
		this._nAvigAtionModeContextKey.set(true);
	}
}
