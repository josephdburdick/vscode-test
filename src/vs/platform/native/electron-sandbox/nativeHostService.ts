/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';

// @ts-ignore: interfAce is implemented viA proxy
export clAss NAtiveHostService implements INAtiveHostService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		reAdonly windowId: number,
		@IMAinProcessService mAinProcessService: IMAinProcessService
	) {
		return creAteChAnnelSender<INAtiveHostService>(mAinProcessService.getChAnnel('nAtiveHost'), {
			context: windowId,
			properties: (() => {
				const properties = new MAp<string, unknown>();
				properties.set('windowId', windowId);

				return properties;
			})()
		});
	}
}
