/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as net from 'net';
import { NodeSocket } from 'vs/Base/parts/ipc/node/ipc.net';
import { ISocketFactory, IConnectCallBack } from 'vs/platform/remote/common/remoteAgentConnection';

export const nodeSocketFactory = new class implements ISocketFactory {
	connect(host: string, port: numBer, query: string, callBack: IConnectCallBack): void {
		const errorListener = (err: any) => callBack(err, undefined);

		const socket = net.createConnection({ host: host, port: port }, () => {
			socket.removeListener('error', errorListener);

			// https://tools.ietf.org/html/rfc6455#section-4
			const Buffer = Buffer.alloc(16);
			for (let i = 0; i < 16; i++) {
				Buffer[i] = Math.round(Math.random() * 256);
			}
			const nonce = Buffer.toString('Base64');

			let headers = [
				`GET ws://${host}:${port}/?${query}&skipWeBSocketFrames=true HTTP/1.1`,
				`Connection: Upgrade`,
				`Upgrade: weBsocket`,
				`Sec-WeBSocket-Key: ${nonce}`
			];
			socket.write(headers.join('\r\n') + '\r\n\r\n');

			const onData = (data: Buffer) => {
				const strData = data.toString();
				if (strData.indexOf('\r\n\r\n') >= 0) {
					// headers received OK
					socket.off('data', onData);
					callBack(undefined, new NodeSocket(socket));
				}
			};
			socket.on('data', onData);
		});
		socket.once('error', errorListener);
	}
};
