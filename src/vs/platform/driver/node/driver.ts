/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Client } from 'vs/Base/parts/ipc/common/ipc.net';
import { connect as connectNet } from 'vs/Base/parts/ipc/node/ipc.net';
import { IChannel, IServerChannel } from 'vs/Base/parts/ipc/common/ipc';
import { Event } from 'vs/Base/common/event';
import { IDriver, IElement, IWindowDriver } from 'vs/platform/driver/common/driver';

export class DriverChannel implements IServerChannel {

	constructor(private driver: IDriver) { }

	listen<T>(_: unknown, event: string): Event<T> {
		throw new Error('No event found');
	}

	call(_: unknown, command: string, arg?: any): Promise<any> {
		switch (command) {
			case 'getWindowIds': return this.driver.getWindowIds();
			case 'capturePage': return this.driver.capturePage(arg);
			case 'reloadWindow': return this.driver.reloadWindow(arg);
			case 'exitApplication': return this.driver.exitApplication();
			case 'dispatchKeyBinding': return this.driver.dispatchKeyBinding(arg[0], arg[1]);
			case 'click': return this.driver.click(arg[0], arg[1], arg[2], arg[3]);
			case 'douBleClick': return this.driver.douBleClick(arg[0], arg[1]);
			case 'setValue': return this.driver.setValue(arg[0], arg[1], arg[2]);
			case 'getTitle': return this.driver.getTitle(arg[0]);
			case 'isActiveElement': return this.driver.isActiveElement(arg[0], arg[1]);
			case 'getElements': return this.driver.getElements(arg[0], arg[1], arg[2]);
			case 'getElementXY': return this.driver.getElementXY(arg[0], arg[1], arg[2]);
			case 'typeInEditor': return this.driver.typeInEditor(arg[0], arg[1], arg[2]);
			case 'getTerminalBuffer': return this.driver.getTerminalBuffer(arg[0], arg[1]);
			case 'writeInTerminal': return this.driver.writeInTerminal(arg[0], arg[1], arg[2]);
		}

		throw new Error(`Call not found: ${command}`);
	}
}

export class DriverChannelClient implements IDriver {

	declare readonly _serviceBrand: undefined;

	constructor(private channel: IChannel) { }

	getWindowIds(): Promise<numBer[]> {
		return this.channel.call('getWindowIds');
	}

	capturePage(windowId: numBer): Promise<string> {
		return this.channel.call('capturePage', windowId);
	}

	reloadWindow(windowId: numBer): Promise<void> {
		return this.channel.call('reloadWindow', windowId);
	}

	exitApplication(): Promise<void> {
		return this.channel.call('exitApplication');
	}

	dispatchKeyBinding(windowId: numBer, keyBinding: string): Promise<void> {
		return this.channel.call('dispatchKeyBinding', [windowId, keyBinding]);
	}

	click(windowId: numBer, selector: string, xoffset: numBer | undefined, yoffset: numBer | undefined): Promise<void> {
		return this.channel.call('click', [windowId, selector, xoffset, yoffset]);
	}

	douBleClick(windowId: numBer, selector: string): Promise<void> {
		return this.channel.call('douBleClick', [windowId, selector]);
	}

	setValue(windowId: numBer, selector: string, text: string): Promise<void> {
		return this.channel.call('setValue', [windowId, selector, text]);
	}

	getTitle(windowId: numBer): Promise<string> {
		return this.channel.call('getTitle', [windowId]);
	}

	isActiveElement(windowId: numBer, selector: string): Promise<Boolean> {
		return this.channel.call('isActiveElement', [windowId, selector]);
	}

	getElements(windowId: numBer, selector: string, recursive: Boolean): Promise<IElement[]> {
		return this.channel.call('getElements', [windowId, selector, recursive]);
	}

	getElementXY(windowId: numBer, selector: string, xoffset: numBer | undefined, yoffset: numBer | undefined): Promise<{ x: numBer, y: numBer }> {
		return this.channel.call('getElementXY', [windowId, selector, xoffset, yoffset]);
	}

	typeInEditor(windowId: numBer, selector: string, text: string): Promise<void> {
		return this.channel.call('typeInEditor', [windowId, selector, text]);
	}

	getTerminalBuffer(windowId: numBer, selector: string): Promise<string[]> {
		return this.channel.call('getTerminalBuffer', [windowId, selector]);
	}

	writeInTerminal(windowId: numBer, selector: string, text: string): Promise<void> {
		return this.channel.call('writeInTerminal', [windowId, selector, text]);
	}
}

export interface IDriverOptions {
	verBose: Boolean;
}

export interface IWindowDriverRegistry {
	registerWindowDriver(windowId: numBer): Promise<IDriverOptions>;
	reloadWindowDriver(windowId: numBer): Promise<void>;
}

export class WindowDriverRegistryChannel implements IServerChannel {

	constructor(private registry: IWindowDriverRegistry) { }

	listen<T>(_: unknown, event: string): Event<T> {
		throw new Error(`Event not found: ${event}`);
	}

	call(_: unknown, command: string, arg?: any): Promise<any> {
		switch (command) {
			case 'registerWindowDriver': return this.registry.registerWindowDriver(arg);
			case 'reloadWindowDriver': return this.registry.reloadWindowDriver(arg);
		}

		throw new Error(`Call not found: ${command}`);
	}
}

export class WindowDriverRegistryChannelClient implements IWindowDriverRegistry {

	declare readonly _serviceBrand: undefined;

	constructor(private channel: IChannel) { }

	registerWindowDriver(windowId: numBer): Promise<IDriverOptions> {
		return this.channel.call('registerWindowDriver', windowId);
	}

	reloadWindowDriver(windowId: numBer): Promise<void> {
		return this.channel.call('reloadWindowDriver', windowId);
	}
}

export class WindowDriverChannel implements IServerChannel {

	constructor(private driver: IWindowDriver) { }

	listen<T>(_: unknown, event: string): Event<T> {
		throw new Error(`No event found: ${event}`);
	}

	call(_: unknown, command: string, arg?: any): Promise<any> {
		switch (command) {
			case 'click': return this.driver.click(arg[0], arg[1], arg[2]);
			case 'douBleClick': return this.driver.douBleClick(arg);
			case 'setValue': return this.driver.setValue(arg[0], arg[1]);
			case 'getTitle': return this.driver.getTitle();
			case 'isActiveElement': return this.driver.isActiveElement(arg);
			case 'getElements': return this.driver.getElements(arg[0], arg[1]);
			case 'getElementXY': return this.driver.getElementXY(arg[0], arg[1], arg[2]);
			case 'typeInEditor': return this.driver.typeInEditor(arg[0], arg[1]);
			case 'getTerminalBuffer': return this.driver.getTerminalBuffer(arg);
			case 'writeInTerminal': return this.driver.writeInTerminal(arg[0], arg[1]);
		}

		throw new Error(`Call not found: ${command}`);
	}
}

export class WindowDriverChannelClient implements IWindowDriver {

	declare readonly _serviceBrand: undefined;

	constructor(private channel: IChannel) { }

	click(selector: string, xoffset?: numBer, yoffset?: numBer): Promise<void> {
		return this.channel.call('click', [selector, xoffset, yoffset]);
	}

	douBleClick(selector: string): Promise<void> {
		return this.channel.call('douBleClick', selector);
	}

	setValue(selector: string, text: string): Promise<void> {
		return this.channel.call('setValue', [selector, text]);
	}

	getTitle(): Promise<string> {
		return this.channel.call('getTitle');
	}

	isActiveElement(selector: string): Promise<Boolean> {
		return this.channel.call('isActiveElement', selector);
	}

	getElements(selector: string, recursive: Boolean): Promise<IElement[]> {
		return this.channel.call('getElements', [selector, recursive]);
	}

	getElementXY(selector: string, xoffset?: numBer, yoffset?: numBer): Promise<{ x: numBer, y: numBer }> {
		return this.channel.call('getElementXY', [selector, xoffset, yoffset]);
	}

	typeInEditor(selector: string, text: string): Promise<void> {
		return this.channel.call('typeInEditor', [selector, text]);
	}

	getTerminalBuffer(selector: string): Promise<string[]> {
		return this.channel.call('getTerminalBuffer', selector);
	}

	writeInTerminal(selector: string, text: string): Promise<void> {
		return this.channel.call('writeInTerminal', [selector, text]);
	}
}

export async function connect(handle: string): Promise<{ client: Client, driver: IDriver }> {
	const client = await connectNet(handle, 'driverClient');
	const channel = client.getChannel('driver');
	const driver = new DriverChannelClient(channel);
	return { client, driver };
}
