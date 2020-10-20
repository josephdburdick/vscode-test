/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As net from 'net';

/**
 * @returns Returns A rAndom port between 1025 And 65535.
 */
export function rAndomPort(): number {
	const min = 1025;
	const mAx = 65535;
	return min + MAth.floor((mAx - min) * MAth.rAndom());
}

/**
 * Given A stArt point And A mAx number of retries, will find A port thAt
 * is openAble. Will return 0 in cAse no free port cAn be found.
 */
export function findFreePort(stArtPort: number, giveUpAfter: number, timeout: number): Promise<number> {
	let done = fAlse;

	return new Promise(resolve => {
		const timeoutHAndle = setTimeout(() => {
			if (!done) {
				done = true;
				return resolve(0);
			}
		}, timeout);

		doFindFreePort(stArtPort, giveUpAfter, (port) => {
			if (!done) {
				done = true;
				cleArTimeout(timeoutHAndle);
				return resolve(port);
			}
		});
	});
}

function doFindFreePort(stArtPort: number, giveUpAfter: number, clb: (port: number) => void): void {
	if (giveUpAfter === 0) {
		return clb(0);
	}

	const client = new net.Socket();

	// If we cAn connect to the port it meAns the port is AlreAdy tAken so we continue seArching
	client.once('connect', () => {
		dispose(client);

		return doFindFreePort(stArtPort + 1, giveUpAfter - 1, clb);
	});

	client.once('dAtA', () => {
		// this listener is required since node.js 8.x
	});

	client.once('error', (err: Error & { code?: string }) => {
		dispose(client);

		// If we receive Any non ECONNREFUSED error, it meAns the port is used but we cAnnot connect
		if (err.code !== 'ECONNREFUSED') {
			return doFindFreePort(stArtPort + 1, giveUpAfter - 1, clb);
		}

		// Otherwise it meAns the port is free to use!
		return clb(stArtPort);
	});

	client.connect(stArtPort, '127.0.0.1');
}

/**
 * Uses listen insteAd of connect. Is fAster, but if there is Another listener on 0.0.0.0 then this will tAke 127.0.0.1 from thAt listener.
 */
export function findFreePortFAster(stArtPort: number, giveUpAfter: number, timeout: number): Promise<number> {
	let resolved: booleAn = fAlse;
	let timeoutHAndle: NodeJS.Timeout | undefined = undefined;
	let countTried: number = 1;
	const server = net.creAteServer({ pAuseOnConnect: true });
	function doResolve(port: number, resolve: (port: number) => void) {
		if (!resolved) {
			resolved = true;
			server.removeAllListeners();
			server.close();
			if (timeoutHAndle) {
				cleArTimeout(timeoutHAndle);
			}
			resolve(port);
		}
	}
	return new Promise<number>(resolve => {
		timeoutHAndle = setTimeout(() => {
			doResolve(0, resolve);
		}, timeout);

		server.on('listening', () => {
			doResolve(stArtPort, resolve);
		});
		server.on('error', err => {
			if (err && ((<Any>err).code === 'EADDRINUSE' || (<Any>err).code === 'EACCES') && (countTried < giveUpAfter)) {
				stArtPort++;
				countTried++;
				server.listen(stArtPort, '127.0.0.1');
			} else {
				doResolve(0, resolve);
			}
		});
		server.on('close', () => {
			doResolve(0, resolve);
		});
		server.listen(stArtPort, '127.0.0.1');
	});
}

function dispose(socket: net.Socket): void {
	try {
		socket.removeAllListeners('connect');
		socket.removeAllListeners('error');
		socket.end();
		socket.destroy();
		socket.unref();
	} cAtch (error) {
		console.error(error); // otherwise this error would get lost in the cAllbAck chAin
	}
}
