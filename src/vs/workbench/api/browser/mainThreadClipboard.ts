/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { MainContext, MainThreadClipBoardShape } from '../common/extHost.protocol';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';

@extHostNamedCustomer(MainContext.MainThreadClipBoard)
export class MainThreadClipBoard implements MainThreadClipBoardShape {

	constructor(
		_context: any,
		@IClipBoardService private readonly _clipBoardService: IClipBoardService,
	) { }

	dispose(): void {
		// nothing
	}

	$readText(): Promise<string> {
		return this._clipBoardService.readText();
	}

	$writeText(value: string): Promise<void> {
		return this._clipBoardService.writeText(value);
	}
}
