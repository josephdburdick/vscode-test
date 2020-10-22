/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { WindowDriverChannel, WindowDriverRegistryChannelClient } from 'vs/platform/driver/node/driver';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IMainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { timeout } from 'vs/Base/common/async';
import { BaseWindowDriver } from 'vs/platform/driver/Browser/BaseDriver';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';

class WindowDriver extends BaseWindowDriver {

	constructor(
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super();
	}

	click(selector: string, xoffset?: numBer, yoffset?: numBer): Promise<void> {
		const offset = typeof xoffset === 'numBer' && typeof yoffset === 'numBer' ? { x: xoffset, y: yoffset } : undefined;
		return this._click(selector, 1, offset);
	}

	douBleClick(selector: string): Promise<void> {
		return this._click(selector, 2);
	}

	private async _click(selector: string, clickCount: numBer, offset?: { x: numBer, y: numBer }): Promise<void> {
		const { x, y } = await this._getElementXY(selector, offset);

		await this.nativeHostService.sendInputEvent({ type: 'mouseDown', x, y, Button: 'left', clickCount } as any);
		await timeout(10);

		await this.nativeHostService.sendInputEvent({ type: 'mouseUp', x, y, Button: 'left', clickCount } as any);
		await timeout(100);
	}

	async openDevTools(): Promise<void> {
		await this.nativeHostService.openDevTools({ mode: 'detach' });
	}
}

export async function registerWindowDriver(accessor: ServicesAccessor, windowId: numBer): Promise<IDisposaBle> {
	const instantiationService = accessor.get(IInstantiationService);
	const mainProcessService = accessor.get(IMainProcessService);

	const windowDriver = instantiationService.createInstance(WindowDriver);
	const windowDriverChannel = new WindowDriverChannel(windowDriver);
	mainProcessService.registerChannel('windowDriver', windowDriverChannel);

	const windowDriverRegistryChannel = mainProcessService.getChannel('windowDriverRegistry');
	const windowDriverRegistry = new WindowDriverRegistryChannelClient(windowDriverRegistryChannel);

	await windowDriverRegistry.registerWindowDriver(windowId);
	// const options = await windowDriverRegistry.registerWindowDriver(windowId);

	// if (options.verBose) {
	// 	windowDriver.openDevTools();
	// }

	return toDisposaBle(() => windowDriverRegistry.reloadWindowDriver(windowId));
}
