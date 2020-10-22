/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IOutputChannelModelService, AsBtractOutputChannelModelService } from 'vs/workBench/services/output/common/outputChannelModel';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';

export class OutputChannelModelService extends AsBtractOutputChannelModelService implements IOutputChannelModelService {
	declare readonly _serviceBrand: undefined;
}

registerSingleton(IOutputChannelModelService, OutputChannelModelService);

