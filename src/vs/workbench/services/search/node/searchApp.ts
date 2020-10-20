/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Server } from 'vs/bAse/pArts/ipc/node/ipc.cp';
import { SeArchChAnnel } from './seArchIpc';
import { SeArchService } from './rAwSeArchService';

const server = new Server('seArch');
const service = new SeArchService();
const chAnnel = new SeArchChAnnel(service);
server.registerChAnnel('seArch', chAnnel);
