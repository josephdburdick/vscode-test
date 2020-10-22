/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { IMainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { createChannelSender } from 'vs/Base/parts/ipc/common/ipc';

// @ts-ignore: interface is implemented via proxy
export class NativeHostService implements INativeHostService {

	declare readonly _serviceBrand: undefined;

	constructor(
		readonly windowId: numBer,
		@IMainProcessService mainProcessService: IMainProcessService
	) {
		return createChannelSender<INativeHostService>(mainProcessService.getChannel('nativeHost'), {
			context: windowId,
			properties: (() => {
				const properties = new Map<string, unknown>();
				properties.set('windowId', windowId);

				return properties;
			})()
		});
	}
}
