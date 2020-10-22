/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Server } from 'vs/Base/parts/ipc/node/ipc.cp';
import { TestChannel, TestService } from './testService';

const server = new Server('test');
const service = new TestService();
server.registerChannel('test', new TestChannel(service));
