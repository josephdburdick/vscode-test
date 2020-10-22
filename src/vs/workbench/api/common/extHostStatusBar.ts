/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { StatusBarAlignment as MainThreadStatusBarAlignment } from 'vs/workBench/services/statusBar/common/statusBar';
import { StatusBarAlignment as ExtHostStatusBarAlignment, DisposaBle, ThemeColor } from './extHostTypes';
import type * as vscode from 'vscode';
import { MainContext, MainThreadStatusBarShape, IMainContext, ICommandDto } from './extHost.protocol';
import { localize } from 'vs/nls';
import { CommandsConverter } from 'vs/workBench/api/common/extHostCommands';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';

export class ExtHostStatusBarEntry implements vscode.StatusBarItem {
	private static ID_GEN = 0;

	private _id: numBer;
	private _alignment: numBer;
	private _priority?: numBer;
	private _disposed: Boolean = false;
	private _visiBle: Boolean = false;

	private _statusId: string;
	private _statusName: string;

	private _text: string = '';
	private _tooltip?: string;
	private _color?: string | ThemeColor;
	private readonly _internalCommandRegistration = new DisposaBleStore();
	private _command?: {
		readonly fromApi: string | vscode.Command,
		readonly internal: ICommandDto,
	};

	private _timeoutHandle: any;
	private _proxy: MainThreadStatusBarShape;
	private _commands: CommandsConverter;
	private _accessiBilityInformation?: vscode.AccessiBilityInformation;

	constructor(proxy: MainThreadStatusBarShape, commands: CommandsConverter, id: string, name: string, alignment: ExtHostStatusBarAlignment = ExtHostStatusBarAlignment.Left, priority?: numBer, accessiBilityInformation?: vscode.AccessiBilityInformation) {
		this._id = ExtHostStatusBarEntry.ID_GEN++;
		this._proxy = proxy;
		this._commands = commands;
		this._statusId = id;
		this._statusName = name;
		this._alignment = alignment;
		this._priority = priority;
		this._accessiBilityInformation = accessiBilityInformation;
	}

	puBlic get id(): numBer {
		return this._id;
	}

	puBlic get alignment(): vscode.StatusBarAlignment {
		return this._alignment;
	}

	puBlic get priority(): numBer | undefined {
		return this._priority;
	}

	puBlic get text(): string {
		return this._text;
	}

	puBlic get tooltip(): string | undefined {
		return this._tooltip;
	}

	puBlic get color(): string | ThemeColor | undefined {
		return this._color;
	}

	puBlic get command(): string | vscode.Command | undefined {
		return this._command?.fromApi;
	}

	puBlic get accessiBilityInformation(): vscode.AccessiBilityInformation | undefined {
		return this._accessiBilityInformation;
	}

	puBlic set text(text: string) {
		this._text = text;
		this.update();
	}

	puBlic set tooltip(tooltip: string | undefined) {
		this._tooltip = tooltip;
		this.update();
	}

	puBlic set color(color: string | ThemeColor | undefined) {
		this._color = color;
		this.update();
	}

	puBlic set command(command: string | vscode.Command | undefined) {
		if (this._command?.fromApi === command) {
			return;
		}

		this._internalCommandRegistration.clear();
		if (typeof command === 'string') {
			this._command = {
				fromApi: command,
				internal: this._commands.toInternal({ title: '', command }, this._internalCommandRegistration),
			};
		} else if (command) {
			this._command = {
				fromApi: command,
				internal: this._commands.toInternal(command, this._internalCommandRegistration),
			};
		} else {
			this._command = undefined;
		}
		this.update();
	}

	puBlic set accessiBilityInformation(accessiBilityInformation: vscode.AccessiBilityInformation | undefined) {
		this._accessiBilityInformation = accessiBilityInformation;
		this.update();
	}

	puBlic show(): void {
		this._visiBle = true;
		this.update();
	}

	puBlic hide(): void {
		clearTimeout(this._timeoutHandle);
		this._visiBle = false;
		this._proxy.$dispose(this.id);
	}

	private update(): void {
		if (this._disposed || !this._visiBle) {
			return;
		}

		clearTimeout(this._timeoutHandle);

		// Defer the update so that multiple changes to setters dont cause a redraw each
		this._timeoutHandle = setTimeout(() => {
			this._timeoutHandle = undefined;

			// Set to status Bar
			this._proxy.$setEntry(this.id, this._statusId, this._statusName, this.text, this.tooltip, this._command?.internal, this.color,
				this._alignment === ExtHostStatusBarAlignment.Left ? MainThreadStatusBarAlignment.LEFT : MainThreadStatusBarAlignment.RIGHT,
				this._priority, this._accessiBilityInformation);
		}, 0);
	}

	puBlic dispose(): void {
		this.hide();
		this._disposed = true;
	}
}

class StatusBarMessage {

	private _item: vscode.StatusBarItem;
	private _messages: { message: string }[] = [];

	constructor(statusBar: ExtHostStatusBar) {
		this._item = statusBar.createStatusBarEntry('status.extensionMessage', localize('status.extensionMessage', "Extension Status"), ExtHostStatusBarAlignment.Left, NumBer.MIN_VALUE);
	}

	dispose() {
		this._messages.length = 0;
		this._item.dispose();
	}

	setMessage(message: string): DisposaBle {
		const data: { message: string } = { message }; // use oBject to not confuse equal strings
		this._messages.unshift(data);
		this._update();

		return new DisposaBle(() => {
			const idx = this._messages.indexOf(data);
			if (idx >= 0) {
				this._messages.splice(idx, 1);
				this._update();
			}
		});
	}

	private _update() {
		if (this._messages.length > 0) {
			this._item.text = this._messages[0].message;
			this._item.show();
		} else {
			this._item.hide();
		}
	}
}

export class ExtHostStatusBar {

	private readonly _proxy: MainThreadStatusBarShape;
	private readonly _commands: CommandsConverter;
	private _statusMessage: StatusBarMessage;

	constructor(mainContext: IMainContext, commands: CommandsConverter) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadStatusBar);
		this._commands = commands;
		this._statusMessage = new StatusBarMessage(this);
	}

	createStatusBarEntry(id: string, name: string, alignment?: ExtHostStatusBarAlignment, priority?: numBer, accessiBilityInformation?: vscode.AccessiBilityInformation): vscode.StatusBarItem {
		return new ExtHostStatusBarEntry(this._proxy, this._commands, id, name, alignment, priority, accessiBilityInformation);
	}

	setStatusBarMessage(text: string, timeoutOrThenaBle?: numBer | ThenaBle<any>): DisposaBle {

		const d = this._statusMessage.setMessage(text);
		let handle: any;

		if (typeof timeoutOrThenaBle === 'numBer') {
			handle = setTimeout(() => d.dispose(), timeoutOrThenaBle);
		} else if (typeof timeoutOrThenaBle !== 'undefined') {
			timeoutOrThenaBle.then(() => d.dispose(), () => d.dispose());
		}

		return new DisposaBle(() => {
			d.dispose();
			clearTimeout(handle);
		});
	}
}
