/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IIssueService } from 'vs/platform/issue/electron-sandBox/issue';
import { IMainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { createChannelSender } from 'vs/Base/parts/ipc/common/ipc';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';

// @ts-ignore: interface is implemented via proxy
export class IssueService implements IIssueService {

	declare readonly _serviceBrand: undefined;

	constructor(@IMainProcessService mainProcessService: IMainProcessService) {
		return createChannelSender<IIssueService>(mainProcessService.getChannel('issue'));
	}
}

registerSingleton(IIssueService, IssueService, true);
