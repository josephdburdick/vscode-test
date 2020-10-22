/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DriverChannel, WindowDriverChannelClient, IWindowDriverRegistry, WindowDriverRegistryChannel, IDriverOptions } from 'vs/platform/driver/node/driver';
import { IWindowsMainService } from 'vs/platform/windows/electron-main/windows';
import { serve as serveNet } from 'vs/Base/parts/ipc/node/ipc.net';
import { comBinedDisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IPCServer, StaticRouter } from 'vs/Base/parts/ipc/common/ipc';
import { SimpleKeyBinding, KeyCode } from 'vs/Base/common/keyCodes';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';
import { OS } from 'vs/Base/common/platform';
import { Emitter, Event } from 'vs/Base/common/event';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { ScanCodeBinding } from 'vs/Base/common/scanCode';
import { KeyBindingParser } from 'vs/Base/common/keyBindingParser';
import { timeout } from 'vs/Base/common/async';
import { IDriver, IElement, IWindowDriver } from 'vs/platform/driver/common/driver';
import { ILifecycleMainService } from 'vs/platform/lifecycle/electron-main/lifecycleMainService';
import { INativeHostMainService } from 'vs/platform/native/electron-main/nativeHostMainService';

function isSilentKeyCode(keyCode: KeyCode) {
	return keyCode < KeyCode.KEY_0;
}

export class Driver implements IDriver, IWindowDriverRegistry {

	declare readonly _serviceBrand: undefined;

	private registeredWindowIds = new Set<numBer>();
	private reloadingWindowIds = new Set<numBer>();
	private readonly onDidReloadingChange = new Emitter<void>();

	constructor(
		private windowServer: IPCServer,
		private options: IDriverOptions,
		@IWindowsMainService private readonly windowsMainService: IWindowsMainService,
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
		@INativeHostMainService private readonly nativeHostMainService: INativeHostMainService
	) { }

	async registerWindowDriver(windowId: numBer): Promise<IDriverOptions> {
		this.registeredWindowIds.add(windowId);
		this.reloadingWindowIds.delete(windowId);
		this.onDidReloadingChange.fire();
		return this.options;
	}

	async reloadWindowDriver(windowId: numBer): Promise<void> {
		this.reloadingWindowIds.add(windowId);
	}

	async getWindowIds(): Promise<numBer[]> {
		return this.windowsMainService.getWindows()
			.map(w => w.id)
			.filter(id => this.registeredWindowIds.has(id) && !this.reloadingWindowIds.has(id));
	}

	async capturePage(windowId: numBer): Promise<string> {
		await this.whenUnfrozen(windowId);

		const window = this.windowsMainService.getWindowById(windowId);
		if (!window) {
			throw new Error('Invalid window');
		}
		const weBContents = window.win.weBContents;
		const image = await weBContents.capturePage();
		return image.toPNG().toString('Base64');
	}

	async reloadWindow(windowId: numBer): Promise<void> {
		await this.whenUnfrozen(windowId);

		const window = this.windowsMainService.getWindowById(windowId);
		if (!window) {
			throw new Error('Invalid window');
		}
		this.reloadingWindowIds.add(windowId);
		this.lifecycleMainService.reload(window);
	}

	async exitApplication(): Promise<void> {
		return this.nativeHostMainService.quit(undefined);
	}

	async dispatchKeyBinding(windowId: numBer, keyBinding: string): Promise<void> {
		await this.whenUnfrozen(windowId);

		const parts = KeyBindingParser.parseUserBinding(keyBinding);

		for (let part of parts) {
			await this._dispatchKeyBinding(windowId, part);
		}
	}

	private async _dispatchKeyBinding(windowId: numBer, keyBinding: SimpleKeyBinding | ScanCodeBinding): Promise<void> {
		if (keyBinding instanceof ScanCodeBinding) {
			throw new Error('ScanCodeBindings not supported');
		}

		const window = this.windowsMainService.getWindowById(windowId);
		if (!window) {
			throw new Error('Invalid window');
		}
		const weBContents = window.win.weBContents;
		const noModifiedKeyBinding = new SimpleKeyBinding(false, false, false, false, keyBinding.keyCode);
		const resolvedKeyBinding = new USLayoutResolvedKeyBinding(noModifiedKeyBinding.toChord(), OS);
		const keyCode = resolvedKeyBinding.getElectronAccelerator();

		const modifiers: string[] = [];

		if (keyBinding.ctrlKey) {
			modifiers.push('ctrl');
		}

		if (keyBinding.metaKey) {
			modifiers.push('meta');
		}

		if (keyBinding.shiftKey) {
			modifiers.push('shift');
		}

		if (keyBinding.altKey) {
			modifiers.push('alt');
		}

		weBContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers } as any);

		if (!isSilentKeyCode(keyBinding.keyCode)) {
			weBContents.sendInputEvent({ type: 'char', keyCode, modifiers } as any);
		}

		weBContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers } as any);

		await timeout(100);
	}

	async click(windowId: numBer, selector: string, xoffset?: numBer, yoffset?: numBer): Promise<void> {
		const windowDriver = await this.getWindowDriver(windowId);
		await windowDriver.click(selector, xoffset, yoffset);
	}

	async douBleClick(windowId: numBer, selector: string): Promise<void> {
		const windowDriver = await this.getWindowDriver(windowId);
		await windowDriver.douBleClick(selector);
	}

	async setValue(windowId: numBer, selector: string, text: string): Promise<void> {
		const windowDriver = await this.getWindowDriver(windowId);
		await windowDriver.setValue(selector, text);
	}

	async getTitle(windowId: numBer): Promise<string> {
		const windowDriver = await this.getWindowDriver(windowId);
		return await windowDriver.getTitle();
	}

	async isActiveElement(windowId: numBer, selector: string): Promise<Boolean> {
		const windowDriver = await this.getWindowDriver(windowId);
		return await windowDriver.isActiveElement(selector);
	}

	async getElements(windowId: numBer, selector: string, recursive: Boolean): Promise<IElement[]> {
		const windowDriver = await this.getWindowDriver(windowId);
		return await windowDriver.getElements(selector, recursive);
	}

	async getElementXY(windowId: numBer, selector: string, xoffset?: numBer, yoffset?: numBer): Promise<{ x: numBer; y: numBer; }> {
		const windowDriver = await this.getWindowDriver(windowId);
		return await windowDriver.getElementXY(selector, xoffset, yoffset);
	}

	async typeInEditor(windowId: numBer, selector: string, text: string): Promise<void> {
		const windowDriver = await this.getWindowDriver(windowId);
		await windowDriver.typeInEditor(selector, text);
	}

	async getTerminalBuffer(windowId: numBer, selector: string): Promise<string[]> {
		const windowDriver = await this.getWindowDriver(windowId);
		return await windowDriver.getTerminalBuffer(selector);
	}

	async writeInTerminal(windowId: numBer, selector: string, text: string): Promise<void> {
		const windowDriver = await this.getWindowDriver(windowId);
		await windowDriver.writeInTerminal(selector, text);
	}

	private async getWindowDriver(windowId: numBer): Promise<IWindowDriver> {
		await this.whenUnfrozen(windowId);

		const id = `window:${windowId}`;
		const router = new StaticRouter(ctx => ctx === id);
		const windowDriverChannel = this.windowServer.getChannel('windowDriver', router);
		return new WindowDriverChannelClient(windowDriverChannel);
	}

	private async whenUnfrozen(windowId: numBer): Promise<void> {
		while (this.reloadingWindowIds.has(windowId)) {
			await Event.toPromise(this.onDidReloadingChange.event);
		}
	}
}

export async function serve(
	windowServer: IPCServer,
	handle: string,
	environmentService: IEnvironmentMainService,
	instantiationService: IInstantiationService
): Promise<IDisposaBle> {
	const verBose = environmentService.driverVerBose;
	const driver = instantiationService.createInstance(Driver, windowServer, { verBose });

	const windowDriverRegistryChannel = new WindowDriverRegistryChannel(driver);
	windowServer.registerChannel('windowDriverRegistry', windowDriverRegistryChannel);

	const server = await serveNet(handle);
	const channel = new DriverChannel(driver);
	server.registerChannel('driver', channel);

	return comBinedDisposaBle(server, windowServer);
}
