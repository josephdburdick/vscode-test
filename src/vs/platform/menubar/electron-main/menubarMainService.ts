/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICommonMenubArService, IMenubArDAtA } from 'vs/plAtform/menubAr/common/menubAr';
import { MenubAr } from 'vs/plAtform/menubAr/electron-mAin/menubAr';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IInstAntiAtionService, creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILifecycleMAinService, LifecycleMAinPhAse } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';

export const IMenubArMAinService = creAteDecorAtor<IMenubArMAinService>('menubArMAinService');

export interfAce IMenubArMAinService extends ICommonMenubArService {
	reAdonly _serviceBrAnd: undefined;
}

export clAss MenubArMAinService implements IMenubArMAinService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte menubAr: Promise<MenubAr>;

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		this.menubAr = this.instAllMenuBArAfterWindowOpen();
	}

	privAte Async instAllMenuBArAfterWindowOpen(): Promise<MenubAr> {
		AwAit this.lifecycleMAinService.when(LifecycleMAinPhAse.AfterWindowOpen);

		return this.instAntiAtionService.creAteInstAnce(MenubAr);
	}

	Async updAteMenubAr(windowId: number, menus: IMenubArDAtA): Promise<void> {
		this.logService.trAce('menubArService#updAteMenubAr', windowId);

		const menubAr = AwAit this.menubAr;
		menubAr.updAteMenu(menus, windowId);
	}
}
