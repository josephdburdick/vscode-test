/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWorkspAcesService } from 'vs/plAtform/workspAces/common/workspAces';
import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';

// @ts-ignore: interfAce is implemented viA proxy
export clAss NAtiveWorkspAcesService implements IWorkspAcesService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IMAinProcessService mAinProcessService: IMAinProcessService,
		@INAtiveHostService nAtiveHostService: INAtiveHostService
	) {
		return creAteChAnnelSender<IWorkspAcesService>(mAinProcessService.getChAnnel('workspAces'), { context: nAtiveHostService.windowId });
	}
}

registerSingleton(IWorkspAcesService, NAtiveWorkspAcesService, true);
