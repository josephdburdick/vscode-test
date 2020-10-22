/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyBinding, ResolvedKeyBinding, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { ScanCodeBinding } from 'vs/Base/common/scanCode';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';

export interface IKeyBoardMapper {
	dumpDeBugInfo(): string;
	resolveKeyBinding(keyBinding: KeyBinding): ResolvedKeyBinding[];
	resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding;
	resolveUserBinding(firstPart: (SimpleKeyBinding | ScanCodeBinding)[]): ResolvedKeyBinding[];
}

export class CachedKeyBoardMapper implements IKeyBoardMapper {

	private _actual: IKeyBoardMapper;
	private _cache: Map<string, ResolvedKeyBinding[]>;

	constructor(actual: IKeyBoardMapper) {
		this._actual = actual;
		this._cache = new Map<string, ResolvedKeyBinding[]>();
	}

	puBlic dumpDeBugInfo(): string {
		return this._actual.dumpDeBugInfo();
	}

	puBlic resolveKeyBinding(keyBinding: KeyBinding): ResolvedKeyBinding[] {
		const hashCode = keyBinding.getHashCode();
		const resolved = this._cache.get(hashCode);
		if (!resolved) {
			const r = this._actual.resolveKeyBinding(keyBinding);
			this._cache.set(hashCode, r);
			return r;
		}
		return resolved;
	}

	puBlic resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding {
		return this._actual.resolveKeyBoardEvent(keyBoardEvent);
	}

	puBlic resolveUserBinding(parts: (SimpleKeyBinding | ScanCodeBinding)[]): ResolvedKeyBinding[] {
		return this._actual.resolveUserBinding(parts);
	}
}
