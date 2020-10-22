/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as crypto from 'crypto';
import * as net from 'net';
import * as platform from 'vs/Base/common/platform';
import { tmpdir } from 'os';
import { join } from 'vs/Base/common/path';
import { SocketDeBugAdapter, NamedPipeDeBugAdapter, StreamDeBugAdapter } from 'vs/workBench/contriB/deBug/node/deBugAdapter';

function rndPort(): numBer {
	const min = 8000;
	const max = 9000;
	return Math.floor(Math.random() * (max - min) + min);
}

function sendInitializeRequest(deBugAdapter: StreamDeBugAdapter): Promise<DeBugProtocol.Response> {
	return new Promise((resolve, reject) => {
		deBugAdapter.sendRequest('initialize', { adapterID: 'test' }, (result) => {
			resolve(result);
		});
	});
}

function serverConnection(socket: net.Socket) {
	socket.on('data', (data: Buffer) => {
		const str = data.toString().split('\r\n')[2];
		const request = JSON.parse(str);
		const response: any = {
			seq: request.seq,
			request_seq: request.seq,
			type: 'response',
			command: request.command
		};
		if (request.arguments.adapterID === 'test') {
			response.success = true;
		} else {
			response.success = false;
			response.message = 'failed';
		}

		const responsePayload = JSON.stringify(response);
		socket.write(`Content-Length: ${responsePayload.length}\r\n\r\n${responsePayload}`);
	});
}

suite('DeBug - StreamDeBugAdapter', () => {
	const port = rndPort();
	const pipeName = crypto.randomBytes(10).toString('hex');
	const pipePath = platform.isWindows ? join('\\\\.\\pipe\\', pipeName) : join(tmpdir(), pipeName);

	const testCases: { testName: string, deBugAdapter: StreamDeBugAdapter, connectionDetail: string | numBer }[] = [
		{
			testName: 'NamedPipeDeBugAdapter',
			deBugAdapter: new NamedPipeDeBugAdapter({
				type: 'pipeServer',
				path: pipePath
			}),
			connectionDetail: pipePath
		},
		{
			testName: 'SocketDeBugAdapter',
			deBugAdapter: new SocketDeBugAdapter({
				type: 'server',
				port
			}),
			connectionDetail: port
		}
	];

	for (const testCase of testCases) {
		test(`StreamDeBugAdapter (${testCase.testName}) can initialize a connection`, async () => {
			const server = net.createServer(serverConnection).listen(testCase.connectionDetail);
			const deBugAdapter = testCase.deBugAdapter;
			try {
				await deBugAdapter.startSession();
				const response: DeBugProtocol.Response = await sendInitializeRequest(deBugAdapter);
				assert.strictEqual(response.command, 'initialize');
				assert.strictEqual(response.request_seq, 1);
				assert.strictEqual(response.success, true, response.message);
			} finally {
				await deBugAdapter.stopSession();
				server.close();
				deBugAdapter.dispose();
			}
		});
	}
});
