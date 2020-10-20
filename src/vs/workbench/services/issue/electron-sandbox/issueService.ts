/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IIssueService } from 'vs/plAtform/issue/electron-sAndbox/issue';
import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

// @ts-ignore: interfAce is implemented viA proxy
export clAss IssueService implements IIssueService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(@IMAinProcessService mAinProcessService: IMAinProcessService) {
		return creAteChAnnelSender<IIssueService>(mAinProcessService.getChAnnel('issue'));
	}
}

registerSingleton(IIssueService, IssueService, true);
