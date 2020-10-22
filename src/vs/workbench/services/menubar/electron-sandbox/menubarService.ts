/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMenuBarService } from 'vs/platform/menuBar/electron-sandBox/menuBar';
import { IMainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { createChannelSender } from 'vs/Base/parts/ipc/common/ipc';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';

// @ts-ignore: interface is implemented via proxy
export class MenuBarService implements IMenuBarService {

	declare readonly _serviceBrand: undefined;

	constructor(@IMainProcessService mainProcessService: IMainProcessService) {
		return createChannelSender<IMenuBarService>(mainProcessService.getChannel('menuBar'));
	}
}

registerSingleton(IMenuBarService, MenuBarService, true);
