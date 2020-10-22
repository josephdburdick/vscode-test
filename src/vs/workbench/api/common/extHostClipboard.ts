/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMainContext, MainContext, MainThreadClipBoardShape } from 'vs/workBench/api/common/extHost.protocol';
import type * as vscode from 'vscode';

export class ExtHostClipBoard implements vscode.ClipBoard {

	private readonly _proxy: MainThreadClipBoardShape;

	constructor(mainContext: IMainContext) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadClipBoard);
	}

	readText(): Promise<string> {
		return this._proxy.$readText();
	}

	writeText(value: string): Promise<void> {
		return this._proxy.$writeText(value);
	}
}
