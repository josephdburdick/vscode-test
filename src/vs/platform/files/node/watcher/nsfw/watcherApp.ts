/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Server } from 'vs/bAse/pArts/ipc/node/ipc.cp';
import { NsfwWAtcherService } from 'vs/plAtform/files/node/wAtcher/nsfw/nsfwWAtcherService';
import { creAteChAnnelReceiver } from 'vs/bAse/pArts/ipc/common/ipc';

const server = new Server('wAtcher');
const service = new NsfwWAtcherService();
server.registerChAnnel('wAtcher', creAteChAnnelReceiver(service));
