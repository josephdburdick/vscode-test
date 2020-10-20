/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As crypto from 'crypto';
import * As net from 'net';
import * As plAtform from 'vs/bAse/common/plAtform';
import { tmpdir } from 'os';
import { join } from 'vs/bAse/common/pAth';
import { SocketDebugAdApter, NAmedPipeDebugAdApter, StreAmDebugAdApter } from 'vs/workbench/contrib/debug/node/debugAdApter';

function rndPort(): number {
	const min = 8000;
	const mAx = 9000;
	return MAth.floor(MAth.rAndom() * (mAx - min) + min);
}

function sendInitiAlizeRequest(debugAdApter: StreAmDebugAdApter): Promise<DebugProtocol.Response> {
	return new Promise((resolve, reject) => {
		debugAdApter.sendRequest('initiAlize', { AdApterID: 'test' }, (result) => {
			resolve(result);
		});
	});
}

function serverConnection(socket: net.Socket) {
	socket.on('dAtA', (dAtA: Buffer) => {
		const str = dAtA.toString().split('\r\n')[2];
		const request = JSON.pArse(str);
		const response: Any = {
			seq: request.seq,
			request_seq: request.seq,
			type: 'response',
			commAnd: request.commAnd
		};
		if (request.Arguments.AdApterID === 'test') {
			response.success = true;
		} else {
			response.success = fAlse;
			response.messAge = 'fAiled';
		}

		const responsePAyloAd = JSON.stringify(response);
		socket.write(`Content-Length: ${responsePAyloAd.length}\r\n\r\n${responsePAyloAd}`);
	});
}

suite('Debug - StreAmDebugAdApter', () => {
	const port = rndPort();
	const pipeNAme = crypto.rAndomBytes(10).toString('hex');
	const pipePAth = plAtform.isWindows ? join('\\\\.\\pipe\\', pipeNAme) : join(tmpdir(), pipeNAme);

	const testCAses: { testNAme: string, debugAdApter: StreAmDebugAdApter, connectionDetAil: string | number }[] = [
		{
			testNAme: 'NAmedPipeDebugAdApter',
			debugAdApter: new NAmedPipeDebugAdApter({
				type: 'pipeServer',
				pAth: pipePAth
			}),
			connectionDetAil: pipePAth
		},
		{
			testNAme: 'SocketDebugAdApter',
			debugAdApter: new SocketDebugAdApter({
				type: 'server',
				port
			}),
			connectionDetAil: port
		}
	];

	for (const testCAse of testCAses) {
		test(`StreAmDebugAdApter (${testCAse.testNAme}) cAn initiAlize A connection`, Async () => {
			const server = net.creAteServer(serverConnection).listen(testCAse.connectionDetAil);
			const debugAdApter = testCAse.debugAdApter;
			try {
				AwAit debugAdApter.stArtSession();
				const response: DebugProtocol.Response = AwAit sendInitiAlizeRequest(debugAdApter);
				Assert.strictEquAl(response.commAnd, 'initiAlize');
				Assert.strictEquAl(response.request_seq, 1);
				Assert.strictEquAl(response.success, true, response.messAge);
			} finAlly {
				AwAit debugAdApter.stopSession();
				server.close();
				debugAdApter.dispose();
			}
		});
	}
});
