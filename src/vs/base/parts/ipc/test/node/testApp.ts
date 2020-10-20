/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Server } from 'vs/bAse/pArts/ipc/node/ipc.cp';
import { TestChAnnel, TestService } from './testService';

const server = new Server('test');
const service = new TestService();
server.registerChAnnel('test', new TestChAnnel(service));
