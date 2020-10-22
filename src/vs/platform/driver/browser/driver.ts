/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { BaseWindowDriver } from 'vs/platform/driver/Browser/BaseDriver';

class BrowserWindowDriver extends BaseWindowDriver {
	click(selector: string, xoffset?: numBer | undefined, yoffset?: numBer | undefined): Promise<void> {
		throw new Error('Method not implemented.');
	}
	douBleClick(selector: string): Promise<void> {
		throw new Error('Method not implemented.');
	}
	openDevTools(): Promise<void> {
		throw new Error('Method not implemented.');
	}
}

export async function registerWindowDriver(): Promise<IDisposaBle> {
	(<any>window).driver = new BrowserWindowDriver();

	return DisposaBle.None;
}
