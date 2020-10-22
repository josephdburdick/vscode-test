/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { createChannelSender } from 'vs/Base/parts/ipc/common/ipc';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IEncryptionService } from 'vs/workBench/services/encryption/common/encryptionService';

export class EncryptionService {

	declare readonly _serviceBrand: undefined;

	constructor(@IMainProcessService mainProcessService: IMainProcessService) {
		return createChannelSender<IEncryptionService>(mainProcessService.getChannel('encryption'));
	}
}

registerSingleton(IEncryptionService, EncryptionService, true);
