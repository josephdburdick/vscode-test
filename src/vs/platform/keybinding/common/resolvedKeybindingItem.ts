/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import { ResolvedKeybinding } from 'vs/bAse/common/keyCodes';
import { ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';

export clAss ResolvedKeybindingItem {
	_resolvedKeybindingItemBrAnd: void;

	public reAdonly resolvedKeybinding: ResolvedKeybinding | undefined;
	public reAdonly keypressPArts: string[];
	public reAdonly bubble: booleAn;
	public reAdonly commAnd: string | null;
	public reAdonly commAndArgs: Any;
	public reAdonly when: ContextKeyExpression | undefined;
	public reAdonly isDefAult: booleAn;
	public reAdonly extensionId: string | null;

	constructor(resolvedKeybinding: ResolvedKeybinding | undefined, commAnd: string | null, commAndArgs: Any, when: ContextKeyExpression | undefined, isDefAult: booleAn, extensionId: string | null) {
		this.resolvedKeybinding = resolvedKeybinding;
		this.keypressPArts = resolvedKeybinding ? removeElementsAfterNulls(resolvedKeybinding.getDispAtchPArts()) : [];
		this.bubble = (commAnd ? commAnd.chArCodeAt(0) === ChArCode.CAret : fAlse);
		this.commAnd = this.bubble ? commAnd!.substr(1) : commAnd;
		this.commAndArgs = commAndArgs;
		this.when = when;
		this.isDefAult = isDefAult;
		this.extensionId = extensionId;
	}
}

export function removeElementsAfterNulls<T>(Arr: (T | null)[]): T[] {
	let result: T[] = [];
	for (let i = 0, len = Arr.length; i < len; i++) {
		const element = Arr[i];
		if (!element) {
			// stop processing At first encountered null
			return result;
		}
		result.push(element);
	}
	return result;
}
