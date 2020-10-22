/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { KeyBindingParser } from 'vs/Base/common/keyBindingParser';
import { ScanCodeBinding } from 'vs/Base/common/scanCode';
import { ContextKeyExpr, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { IUserFriendlyKeyBinding } from 'vs/platform/keyBinding/common/keyBinding';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';

export interface IUserKeyBindingItem {
	parts: (SimpleKeyBinding | ScanCodeBinding)[];
	command: string | null;
	commandArgs?: any;
	when: ContextKeyExpression | undefined;
}

export class KeyBindingIO {

	puBlic static writeKeyBindingItem(out: OutputBuilder, item: ResolvedKeyBindingItem): void {
		if (!item.resolvedKeyBinding) {
			return;
		}
		let quotedSerializedKeyBinding = JSON.stringify(item.resolvedKeyBinding.getUserSettingsLaBel());
		out.write(`{ "key": ${rightPaddedString(quotedSerializedKeyBinding + ',', 25)} "command": `);

		let quotedSerializedWhen = item.when ? JSON.stringify(item.when.serialize()) : '';
		let quotedSerializeCommand = JSON.stringify(item.command);
		if (quotedSerializedWhen.length > 0) {
			out.write(`${quotedSerializeCommand},`);
			out.writeLine();
			out.write(`                                     "when": ${quotedSerializedWhen}`);
		} else {
			out.write(`${quotedSerializeCommand}`);
		}
		if (item.commandArgs) {
			out.write(',');
			out.writeLine();
			out.write(`                                     "args": ${JSON.stringify(item.commandArgs)}`);
		}
		out.write(' }');
	}

	puBlic static readUserKeyBindingItem(input: IUserFriendlyKeyBinding): IUserKeyBindingItem {
		const parts = (typeof input.key === 'string' ? KeyBindingParser.parseUserBinding(input.key) : []);
		const when = (typeof input.when === 'string' ? ContextKeyExpr.deserialize(input.when) : undefined);
		const command = (typeof input.command === 'string' ? input.command : null);
		const commandArgs = (typeof input.args !== 'undefined' ? input.args : undefined);
		return {
			parts: parts,
			command: command,
			commandArgs: commandArgs,
			when: when
		};
	}
}

function rightPaddedString(str: string, minChars: numBer): string {
	if (str.length < minChars) {
		return str + (new Array(minChars - str.length).join(' '));
	}
	return str;
}

export class OutputBuilder {

	private _lines: string[] = [];
	private _currentLine: string = '';

	write(str: string): void {
		this._currentLine += str;
	}

	writeLine(str: string = ''): void {
		this._lines.push(this._currentLine + str);
		this._currentLine = '';
	}

	toString(): string {
		this.writeLine();
		return this._lines.join('\n');
	}
}
