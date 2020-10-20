/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IEncryptionService } from 'vs/workbench/services/encryption/common/encryptionService';

export clAss EncryptionService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(@IMAinProcessService mAinProcessService: IMAinProcessService) {
		return creAteChAnnelSender<IEncryptionService>(mAinProcessService.getChAnnel('encryption'));
	}
}

registerSingleton(IEncryptionService, EncryptionService, true);
