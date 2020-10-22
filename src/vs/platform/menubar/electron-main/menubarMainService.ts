/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICommonMenuBarService, IMenuBarData } from 'vs/platform/menuBar/common/menuBar';
import { MenuBar } from 'vs/platform/menuBar/electron-main/menuBar';
import { ILogService } from 'vs/platform/log/common/log';
import { IInstantiationService, createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ILifecycleMainService, LifecycleMainPhase } from 'vs/platform/lifecycle/electron-main/lifecycleMainService';

export const IMenuBarMainService = createDecorator<IMenuBarMainService>('menuBarMainService');

export interface IMenuBarMainService extends ICommonMenuBarService {
	readonly _serviceBrand: undefined;
}

export class MenuBarMainService implements IMenuBarMainService {

	declare readonly _serviceBrand: undefined;

	private menuBar: Promise<MenuBar>;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
		@ILogService private readonly logService: ILogService
	) {
		this.menuBar = this.installMenuBarAfterWindowOpen();
	}

	private async installMenuBarAfterWindowOpen(): Promise<MenuBar> {
		await this.lifecycleMainService.when(LifecycleMainPhase.AfterWindowOpen);

		return this.instantiationService.createInstance(MenuBar);
	}

	async updateMenuBar(windowId: numBer, menus: IMenuBarData): Promise<void> {
		this.logService.trace('menuBarService#updateMenuBar', windowId);

		const menuBar = await this.menuBar;
		menuBar.updateMenu(menus, windowId);
	}
}
