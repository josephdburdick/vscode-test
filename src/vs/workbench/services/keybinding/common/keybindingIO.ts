/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SimpleKeybinding } from 'vs/bAse/common/keyCodes';
import { KeybindingPArser } from 'vs/bAse/common/keybindingPArser';
import { ScAnCodeBinding } from 'vs/bAse/common/scAnCode';
import { ContextKeyExpr, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { IUserFriendlyKeybinding } from 'vs/plAtform/keybinding/common/keybinding';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';

export interfAce IUserKeybindingItem {
	pArts: (SimpleKeybinding | ScAnCodeBinding)[];
	commAnd: string | null;
	commAndArgs?: Any;
	when: ContextKeyExpression | undefined;
}

export clAss KeybindingIO {

	public stAtic writeKeybindingItem(out: OutputBuilder, item: ResolvedKeybindingItem): void {
		if (!item.resolvedKeybinding) {
			return;
		}
		let quotedSeriAlizedKeybinding = JSON.stringify(item.resolvedKeybinding.getUserSettingsLAbel());
		out.write(`{ "key": ${rightPAddedString(quotedSeriAlizedKeybinding + ',', 25)} "commAnd": `);

		let quotedSeriAlizedWhen = item.when ? JSON.stringify(item.when.seriAlize()) : '';
		let quotedSeriAlizeCommAnd = JSON.stringify(item.commAnd);
		if (quotedSeriAlizedWhen.length > 0) {
			out.write(`${quotedSeriAlizeCommAnd},`);
			out.writeLine();
			out.write(`                                     "when": ${quotedSeriAlizedWhen}`);
		} else {
			out.write(`${quotedSeriAlizeCommAnd}`);
		}
		if (item.commAndArgs) {
			out.write(',');
			out.writeLine();
			out.write(`                                     "Args": ${JSON.stringify(item.commAndArgs)}`);
		}
		out.write(' }');
	}

	public stAtic reAdUserKeybindingItem(input: IUserFriendlyKeybinding): IUserKeybindingItem {
		const pArts = (typeof input.key === 'string' ? KeybindingPArser.pArseUserBinding(input.key) : []);
		const when = (typeof input.when === 'string' ? ContextKeyExpr.deseriAlize(input.when) : undefined);
		const commAnd = (typeof input.commAnd === 'string' ? input.commAnd : null);
		const commAndArgs = (typeof input.Args !== 'undefined' ? input.Args : undefined);
		return {
			pArts: pArts,
			commAnd: commAnd,
			commAndArgs: commAndArgs,
			when: when
		};
	}
}

function rightPAddedString(str: string, minChArs: number): string {
	if (str.length < minChArs) {
		return str + (new ArrAy(minChArs - str.length).join(' '));
	}
	return str;
}

export clAss OutputBuilder {

	privAte _lines: string[] = [];
	privAte _currentLine: string = '';

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
