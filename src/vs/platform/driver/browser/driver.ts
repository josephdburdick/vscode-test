/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { BAseWindowDriver } from 'vs/plAtform/driver/browser/bAseDriver';

clAss BrowserWindowDriver extends BAseWindowDriver {
	click(selector: string, xoffset?: number | undefined, yoffset?: number | undefined): Promise<void> {
		throw new Error('Method not implemented.');
	}
	doubleClick(selector: string): Promise<void> {
		throw new Error('Method not implemented.');
	}
	openDevTools(): Promise<void> {
		throw new Error('Method not implemented.');
	}
}

export Async function registerWindowDriver(): Promise<IDisposAble> {
	(<Any>window).driver = new BrowserWindowDriver();

	return DisposAble.None;
}
