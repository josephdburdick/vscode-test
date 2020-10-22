/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IKeymapInfo } from 'vs/workBench/services/keyBinding/common/keymapInfo';

export class KeyBoardLayoutContriBution {
	puBlic static readonly INSTANCE: KeyBoardLayoutContriBution = new KeyBoardLayoutContriBution();

	private _layoutInfos: IKeymapInfo[] = [];

	get layoutInfos() {
		return this._layoutInfos;
	}

	private constructor() {
	}

	registerKeyBoardLayout(layout: IKeymapInfo) {
		this._layoutInfos.push(layout);
	}
}
