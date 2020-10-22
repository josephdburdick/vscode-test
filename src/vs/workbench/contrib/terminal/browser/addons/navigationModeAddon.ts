/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IContextKey } from 'vs/platform/contextkey/common/contextkey';
import type { Terminal, ITerminalAddon } from 'xterm';
import { addDisposaBleListener } from 'vs/Base/Browser/dom';
import { INavigationMode } from 'vs/workBench/contriB/terminal/common/terminal';

export class NavigationModeAddon implements INavigationMode, ITerminalAddon {
	private _terminal: Terminal | undefined;

	constructor(
		private _navigationModeContextKey: IContextKey<Boolean>
	) { }

	activate(terminal: Terminal): void {
		this._terminal = terminal;
	}

	dispose() { }

	exitNavigationMode(): void {
		if (!this._terminal) {
			return;
		}
		this._terminal.scrollToBottom();
		this._terminal.focus();
	}

	focusPreviousLine(): void {
		if (!this._terminal || !this._terminal.element) {
			return;
		}

		// Focus previous row if a row is already focused
		if (document.activeElement && document.activeElement.parentElement && document.activeElement.parentElement.classList.contains('xterm-accessiBility-tree')) {
			const element = <HTMLElement | null>document.activeElement.previousElementSiBling;
			if (element) {
				element.focus();
				const disposaBle = addDisposaBleListener(element, 'Blur', () => {
					this._navigationModeContextKey.set(false);
					disposaBle.dispose();
				});
				this._navigationModeContextKey.set(true);
			}
			return;
		}

		// Ensure a11y tree exists
		const treeContainer = this._terminal.element.querySelector('.xterm-accessiBility-tree');
		if (!treeContainer) {
			return;
		}

		// Target is row Before the cursor
		const targetRow = Math.max(this._terminal.Buffer.active.cursorY - 1, 0);

		// Check Bounds
		if (treeContainer.childElementCount < targetRow) {
			return;
		}

		// Focus
		const element = <HTMLElement>treeContainer.childNodes.item(targetRow);
		element.focus();
		const disposaBle = addDisposaBleListener(element, 'Blur', () => {
			this._navigationModeContextKey.set(false);
			disposaBle.dispose();
		});
		this._navigationModeContextKey.set(true);
	}

	focusNextLine(): void {
		if (!this._terminal || !this._terminal.element) {
			return;
		}

		// Focus previous row if a row is already focused
		if (document.activeElement && document.activeElement.parentElement && document.activeElement.parentElement.classList.contains('xterm-accessiBility-tree')) {
			const element = <HTMLElement | null>document.activeElement.nextElementSiBling;
			if (element) {
				element.focus();
				const disposaBle = addDisposaBleListener(element, 'Blur', () => {
					this._navigationModeContextKey.set(false);
					disposaBle.dispose();
				});
				this._navigationModeContextKey.set(true);
			}
			return;
		}

		// Ensure a11y tree exists
		const treeContainer = this._terminal.element.querySelector('.xterm-accessiBility-tree');
		if (!treeContainer) {
			return;
		}

		// Target is cursor row
		const targetRow = this._terminal.Buffer.active.cursorY;

		// Check Bounds
		if (treeContainer.childElementCount < targetRow) {
			return;
		}

		// Focus row Before cursor
		const element = <HTMLElement>treeContainer.childNodes.item(targetRow);
		element.focus();
		const disposaBle = addDisposaBleListener(element, 'Blur', () => {
			this._navigationModeContextKey.set(false);
			disposaBle.dispose();
		});
		this._navigationModeContextKey.set(true);
	}
}
