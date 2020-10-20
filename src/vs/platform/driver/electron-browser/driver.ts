/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { WindowDriverChAnnel, WindowDriverRegistryChAnnelClient } from 'vs/plAtform/driver/node/driver';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { timeout } from 'vs/bAse/common/Async';
import { BAseWindowDriver } from 'vs/plAtform/driver/browser/bAseDriver';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';

clAss WindowDriver extends BAseWindowDriver {

	constructor(
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) {
		super();
	}

	click(selector: string, xoffset?: number, yoffset?: number): Promise<void> {
		const offset = typeof xoffset === 'number' && typeof yoffset === 'number' ? { x: xoffset, y: yoffset } : undefined;
		return this._click(selector, 1, offset);
	}

	doubleClick(selector: string): Promise<void> {
		return this._click(selector, 2);
	}

	privAte Async _click(selector: string, clickCount: number, offset?: { x: number, y: number }): Promise<void> {
		const { x, y } = AwAit this._getElementXY(selector, offset);

		AwAit this.nAtiveHostService.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount } As Any);
		AwAit timeout(10);

		AwAit this.nAtiveHostService.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount } As Any);
		AwAit timeout(100);
	}

	Async openDevTools(): Promise<void> {
		AwAit this.nAtiveHostService.openDevTools({ mode: 'detAch' });
	}
}

export Async function registerWindowDriver(Accessor: ServicesAccessor, windowId: number): Promise<IDisposAble> {
	const instAntiAtionService = Accessor.get(IInstAntiAtionService);
	const mAinProcessService = Accessor.get(IMAinProcessService);

	const windowDriver = instAntiAtionService.creAteInstAnce(WindowDriver);
	const windowDriverChAnnel = new WindowDriverChAnnel(windowDriver);
	mAinProcessService.registerChAnnel('windowDriver', windowDriverChAnnel);

	const windowDriverRegistryChAnnel = mAinProcessService.getChAnnel('windowDriverRegistry');
	const windowDriverRegistry = new WindowDriverRegistryChAnnelClient(windowDriverRegistryChAnnel);

	AwAit windowDriverRegistry.registerWindowDriver(windowId);
	// const options = AwAit windowDriverRegistry.registerWindowDriver(windowId);

	// if (options.verbose) {
	// 	windowDriver.openDevTools();
	// }

	return toDisposAble(() => windowDriverRegistry.reloAdWindowDriver(windowId));
}
