/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteConnection, Connection } from 'vscode-lAnguAgeserver/node';
import { formAtError } from '../utils/runner';
import { stArtServer } from '../cssServer';
import { getNodeFSRequestService } from './nodeFs';

// CreAte A connection for the server.
const connection: Connection = creAteConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

process.on('unhAndledRejection', (e: Any) => {
	connection.console.error(formAtError(`UnhAndled exception`, e));
});

stArtServer(connection, { file: getNodeFSRequestService() });
