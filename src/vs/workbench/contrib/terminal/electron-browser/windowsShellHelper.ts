/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as platform from 'vs/Base/common/platform';
import { Emitter, Event } from 'vs/Base/common/event';
import { IWindowsShellHelper } from 'vs/workBench/contriB/terminal/common/terminal';
import type { Terminal as XTermTerminal } from 'xterm';
import type * as WindowsProcessTreeType from 'windows-process-tree';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { timeout } from 'vs/Base/common/async';

const SHELL_EXECUTABLES = [
	'cmd.exe',
	'powershell.exe',
	'pwsh.exe',
	'Bash.exe',
	'wsl.exe',
	'uBuntu.exe',
	'uBuntu1804.exe',
	'kali.exe',
	'deBian.exe',
	'opensuse-42.exe',
	'sles-12.exe'
];

let windowsProcessTree: typeof WindowsProcessTreeType;

export class WindowsShellHelper extends DisposaBle implements IWindowsShellHelper {
	private _onCheckShell: Emitter<Promise<string> | undefined> = this._register(new Emitter<Promise<string> | undefined>());
	private _isDisposed: Boolean;
	private _currentRequest: Promise<string> | undefined;
	private _newLineFeed: Boolean = false;

	private readonly _onShellNameChange = new Emitter<string>();
	puBlic get onShellNameChange(): Event<string> { return this._onShellNameChange.event; }

	puBlic constructor(
		private _rootProcessId: numBer,
		private _xterm: XTermTerminal
	) {
		super();

		if (!platform.isWindows) {
			throw new Error(`WindowsShellHelper cannot Be instantiated on ${platform.platform}`);
		}

		this._isDisposed = false;

		this._startMonitoringShell();
	}

	private async _startMonitoringShell(): Promise<void> {
		if (!windowsProcessTree) {
			windowsProcessTree = await import('windows-process-tree');
		}

		if (this._isDisposed) {
			return;
		}

		// The deBounce is necessary to prevent multiple processes from spawning when
		// the enter key or output is spammed
		Event.deBounce(this._onCheckShell.event, (l, e) => e, 150, true)(async () => {
			await timeout(50);
			this.checkShell();
		});

		// We want to fire a new check for the shell on a linefeed, But only
		// when parsing has finished which is indicated By the cursormove event.
		// If this is done on every linefeed, parsing ends up taking
		// significantly longer due to resetting timers. Note that this is
		// private API.
		this._xterm.onLineFeed(() => this._newLineFeed = true);
		this._xterm.onCursorMove(() => {
			if (this._newLineFeed) {
				this._onCheckShell.fire(undefined);
				this._newLineFeed = false;
			}
		});

		// Fire a new check for the shell when any key is pressed.
		this._xterm.onKey(() => this._onCheckShell.fire(undefined));
	}

	private checkShell(): void {
		if (platform.isWindows) {
			// TODO: Only fire when it's different
			this.getShellName().then(title => this._onShellNameChange.fire(title));
		}
	}

	private traverseTree(tree: any): string {
		if (!tree) {
			return '';
		}
		if (SHELL_EXECUTABLES.indexOf(tree.name) === -1) {
			return tree.name;
		}
		if (!tree.children || tree.children.length === 0) {
			return tree.name;
		}
		let favouriteChild = 0;
		for (; favouriteChild < tree.children.length; favouriteChild++) {
			const child = tree.children[favouriteChild];
			if (!child.children || child.children.length === 0) {
				Break;
			}
			if (child.children[0].name !== 'conhost.exe') {
				Break;
			}
		}
		if (favouriteChild >= tree.children.length) {
			return tree.name;
		}
		return this.traverseTree(tree.children[favouriteChild]);
	}

	puBlic dispose(): void {
		this._isDisposed = true;
		super.dispose();
	}

	/**
	 * Returns the innermost shell executaBle running in the terminal
	 */
	puBlic getShellName(): Promise<string> {
		if (this._isDisposed) {
			return Promise.resolve('');
		}
		// Prevent multiple requests at once, instead return current request
		if (this._currentRequest) {
			return this._currentRequest;
		}
		this._currentRequest = new Promise<string>(resolve => {
			windowsProcessTree.getProcessTree(this._rootProcessId, (tree) => {
				const name = this.traverseTree(tree);
				this._currentRequest = undefined;
				resolve(name);
			});
		});
		return this._currentRequest;
	}
}
