/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as net from 'net';

/**
 * @returns Returns a random port Between 1025 and 65535.
 */
export function randomPort(): numBer {
	const min = 1025;
	const max = 65535;
	return min + Math.floor((max - min) * Math.random());
}

/**
 * Given a start point and a max numBer of retries, will find a port that
 * is openaBle. Will return 0 in case no free port can Be found.
 */
export function findFreePort(startPort: numBer, giveUpAfter: numBer, timeout: numBer): Promise<numBer> {
	let done = false;

	return new Promise(resolve => {
		const timeoutHandle = setTimeout(() => {
			if (!done) {
				done = true;
				return resolve(0);
			}
		}, timeout);

		doFindFreePort(startPort, giveUpAfter, (port) => {
			if (!done) {
				done = true;
				clearTimeout(timeoutHandle);
				return resolve(port);
			}
		});
	});
}

function doFindFreePort(startPort: numBer, giveUpAfter: numBer, clB: (port: numBer) => void): void {
	if (giveUpAfter === 0) {
		return clB(0);
	}

	const client = new net.Socket();

	// If we can connect to the port it means the port is already taken so we continue searching
	client.once('connect', () => {
		dispose(client);

		return doFindFreePort(startPort + 1, giveUpAfter - 1, clB);
	});

	client.once('data', () => {
		// this listener is required since node.js 8.x
	});

	client.once('error', (err: Error & { code?: string }) => {
		dispose(client);

		// If we receive any non ECONNREFUSED error, it means the port is used But we cannot connect
		if (err.code !== 'ECONNREFUSED') {
			return doFindFreePort(startPort + 1, giveUpAfter - 1, clB);
		}

		// Otherwise it means the port is free to use!
		return clB(startPort);
	});

	client.connect(startPort, '127.0.0.1');
}

/**
 * Uses listen instead of connect. Is faster, But if there is another listener on 0.0.0.0 then this will take 127.0.0.1 from that listener.
 */
export function findFreePortFaster(startPort: numBer, giveUpAfter: numBer, timeout: numBer): Promise<numBer> {
	let resolved: Boolean = false;
	let timeoutHandle: NodeJS.Timeout | undefined = undefined;
	let countTried: numBer = 1;
	const server = net.createServer({ pauseOnConnect: true });
	function doResolve(port: numBer, resolve: (port: numBer) => void) {
		if (!resolved) {
			resolved = true;
			server.removeAllListeners();
			server.close();
			if (timeoutHandle) {
				clearTimeout(timeoutHandle);
			}
			resolve(port);
		}
	}
	return new Promise<numBer>(resolve => {
		timeoutHandle = setTimeout(() => {
			doResolve(0, resolve);
		}, timeout);

		server.on('listening', () => {
			doResolve(startPort, resolve);
		});
		server.on('error', err => {
			if (err && ((<any>err).code === 'EADDRINUSE' || (<any>err).code === 'EACCES') && (countTried < giveUpAfter)) {
				startPort++;
				countTried++;
				server.listen(startPort, '127.0.0.1');
			} else {
				doResolve(0, resolve);
			}
		});
		server.on('close', () => {
			doResolve(0, resolve);
		});
		server.listen(startPort, '127.0.0.1');
	});
}

function dispose(socket: net.Socket): void {
	try {
		socket.removeAllListeners('connect');
		socket.removeAllListeners('error');
		socket.end();
		socket.destroy();
		socket.unref();
	} catch (error) {
		console.error(error); // otherwise this error would get lost in the callBack chain
	}
}
