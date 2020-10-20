/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DriverChAnnel, WindowDriverChAnnelClient, IWindowDriverRegistry, WindowDriverRegistryChAnnel, IDriverOptions } from 'vs/plAtform/driver/node/driver';
import { IWindowsMAinService } from 'vs/plAtform/windows/electron-mAin/windows';
import { serve As serveNet } from 'vs/bAse/pArts/ipc/node/ipc.net';
import { combinedDisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IPCServer, StAticRouter } from 'vs/bAse/pArts/ipc/common/ipc';
import { SimpleKeybinding, KeyCode } from 'vs/bAse/common/keyCodes';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';
import { OS } from 'vs/bAse/common/plAtform';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { ScAnCodeBinding } from 'vs/bAse/common/scAnCode';
import { KeybindingPArser } from 'vs/bAse/common/keybindingPArser';
import { timeout } from 'vs/bAse/common/Async';
import { IDriver, IElement, IWindowDriver } from 'vs/plAtform/driver/common/driver';
import { ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { INAtiveHostMAinService } from 'vs/plAtform/nAtive/electron-mAin/nAtiveHostMAinService';

function isSilentKeyCode(keyCode: KeyCode) {
	return keyCode < KeyCode.KEY_0;
}

export clAss Driver implements IDriver, IWindowDriverRegistry {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte registeredWindowIds = new Set<number>();
	privAte reloAdingWindowIds = new Set<number>();
	privAte reAdonly onDidReloAdingChAnge = new Emitter<void>();

	constructor(
		privAte windowServer: IPCServer,
		privAte options: IDriverOptions,
		@IWindowsMAinService privAte reAdonly windowsMAinService: IWindowsMAinService,
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService,
		@INAtiveHostMAinService privAte reAdonly nAtiveHostMAinService: INAtiveHostMAinService
	) { }

	Async registerWindowDriver(windowId: number): Promise<IDriverOptions> {
		this.registeredWindowIds.Add(windowId);
		this.reloAdingWindowIds.delete(windowId);
		this.onDidReloAdingChAnge.fire();
		return this.options;
	}

	Async reloAdWindowDriver(windowId: number): Promise<void> {
		this.reloAdingWindowIds.Add(windowId);
	}

	Async getWindowIds(): Promise<number[]> {
		return this.windowsMAinService.getWindows()
			.mAp(w => w.id)
			.filter(id => this.registeredWindowIds.hAs(id) && !this.reloAdingWindowIds.hAs(id));
	}

	Async cApturePAge(windowId: number): Promise<string> {
		AwAit this.whenUnfrozen(windowId);

		const window = this.windowsMAinService.getWindowById(windowId);
		if (!window) {
			throw new Error('InvAlid window');
		}
		const webContents = window.win.webContents;
		const imAge = AwAit webContents.cApturePAge();
		return imAge.toPNG().toString('bAse64');
	}

	Async reloAdWindow(windowId: number): Promise<void> {
		AwAit this.whenUnfrozen(windowId);

		const window = this.windowsMAinService.getWindowById(windowId);
		if (!window) {
			throw new Error('InvAlid window');
		}
		this.reloAdingWindowIds.Add(windowId);
		this.lifecycleMAinService.reloAd(window);
	}

	Async exitApplicAtion(): Promise<void> {
		return this.nAtiveHostMAinService.quit(undefined);
	}

	Async dispAtchKeybinding(windowId: number, keybinding: string): Promise<void> {
		AwAit this.whenUnfrozen(windowId);

		const pArts = KeybindingPArser.pArseUserBinding(keybinding);

		for (let pArt of pArts) {
			AwAit this._dispAtchKeybinding(windowId, pArt);
		}
	}

	privAte Async _dispAtchKeybinding(windowId: number, keybinding: SimpleKeybinding | ScAnCodeBinding): Promise<void> {
		if (keybinding instAnceof ScAnCodeBinding) {
			throw new Error('ScAnCodeBindings not supported');
		}

		const window = this.windowsMAinService.getWindowById(windowId);
		if (!window) {
			throw new Error('InvAlid window');
		}
		const webContents = window.win.webContents;
		const noModifiedKeybinding = new SimpleKeybinding(fAlse, fAlse, fAlse, fAlse, keybinding.keyCode);
		const resolvedKeybinding = new USLAyoutResolvedKeybinding(noModifiedKeybinding.toChord(), OS);
		const keyCode = resolvedKeybinding.getElectronAccelerAtor();

		const modifiers: string[] = [];

		if (keybinding.ctrlKey) {
			modifiers.push('ctrl');
		}

		if (keybinding.metAKey) {
			modifiers.push('metA');
		}

		if (keybinding.shiftKey) {
			modifiers.push('shift');
		}

		if (keybinding.AltKey) {
			modifiers.push('Alt');
		}

		webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers } As Any);

		if (!isSilentKeyCode(keybinding.keyCode)) {
			webContents.sendInputEvent({ type: 'chAr', keyCode, modifiers } As Any);
		}

		webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers } As Any);

		AwAit timeout(100);
	}

	Async click(windowId: number, selector: string, xoffset?: number, yoffset?: number): Promise<void> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		AwAit windowDriver.click(selector, xoffset, yoffset);
	}

	Async doubleClick(windowId: number, selector: string): Promise<void> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		AwAit windowDriver.doubleClick(selector);
	}

	Async setVAlue(windowId: number, selector: string, text: string): Promise<void> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		AwAit windowDriver.setVAlue(selector, text);
	}

	Async getTitle(windowId: number): Promise<string> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		return AwAit windowDriver.getTitle();
	}

	Async isActiveElement(windowId: number, selector: string): Promise<booleAn> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		return AwAit windowDriver.isActiveElement(selector);
	}

	Async getElements(windowId: number, selector: string, recursive: booleAn): Promise<IElement[]> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		return AwAit windowDriver.getElements(selector, recursive);
	}

	Async getElementXY(windowId: number, selector: string, xoffset?: number, yoffset?: number): Promise<{ x: number; y: number; }> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		return AwAit windowDriver.getElementXY(selector, xoffset, yoffset);
	}

	Async typeInEditor(windowId: number, selector: string, text: string): Promise<void> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		AwAit windowDriver.typeInEditor(selector, text);
	}

	Async getTerminAlBuffer(windowId: number, selector: string): Promise<string[]> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		return AwAit windowDriver.getTerminAlBuffer(selector);
	}

	Async writeInTerminAl(windowId: number, selector: string, text: string): Promise<void> {
		const windowDriver = AwAit this.getWindowDriver(windowId);
		AwAit windowDriver.writeInTerminAl(selector, text);
	}

	privAte Async getWindowDriver(windowId: number): Promise<IWindowDriver> {
		AwAit this.whenUnfrozen(windowId);

		const id = `window:${windowId}`;
		const router = new StAticRouter(ctx => ctx === id);
		const windowDriverChAnnel = this.windowServer.getChAnnel('windowDriver', router);
		return new WindowDriverChAnnelClient(windowDriverChAnnel);
	}

	privAte Async whenUnfrozen(windowId: number): Promise<void> {
		while (this.reloAdingWindowIds.hAs(windowId)) {
			AwAit Event.toPromise(this.onDidReloAdingChAnge.event);
		}
	}
}

export Async function serve(
	windowServer: IPCServer,
	hAndle: string,
	environmentService: IEnvironmentMAinService,
	instAntiAtionService: IInstAntiAtionService
): Promise<IDisposAble> {
	const verbose = environmentService.driverVerbose;
	const driver = instAntiAtionService.creAteInstAnce(Driver, windowServer, { verbose });

	const windowDriverRegistryChAnnel = new WindowDriverRegistryChAnnel(driver);
	windowServer.registerChAnnel('windowDriverRegistry', windowDriverRegistryChAnnel);

	const server = AwAit serveNet(hAndle);
	const chAnnel = new DriverChAnnel(driver);
	server.registerChAnnel('driver', chAnnel);

	return combinedDisposAble(server, windowServer);
}
