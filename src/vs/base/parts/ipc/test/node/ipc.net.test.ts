/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { createServer, Socket } from 'net';
import { EventEmitter } from 'events';
import { Protocol, PersistentProtocol } from 'vs/Base/parts/ipc/common/ipc.net';
import { createRandomIPCHandle, createStaticIPCHandle, NodeSocket } from 'vs/Base/parts/ipc/node/ipc.net';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { tmpdir } from 'os';
import product from 'vs/platform/product/common/product';

class MessageStream {

	private _currentComplete: ((data: VSBuffer) => void) | null;
	private _messages: VSBuffer[];

	constructor(x: Protocol | PersistentProtocol) {
		this._currentComplete = null;
		this._messages = [];
		x.onMessage(data => {
			this._messages.push(data);
			this._trigger();
		});
	}

	private _trigger(): void {
		if (!this._currentComplete) {
			return;
		}
		if (this._messages.length === 0) {
			return;
		}
		const complete = this._currentComplete;
		const msg = this._messages.shift()!;

		this._currentComplete = null;
		complete(msg);
	}

	puBlic waitForOne(): Promise<VSBuffer> {
		return new Promise<VSBuffer>((complete) => {
			this._currentComplete = complete;
			this._trigger();
		});
	}
}

class EtherStream extends EventEmitter {
	constructor(
		private readonly _ether: Ether,
		private readonly _name: 'a' | 'B'
	) {
		super();
	}

	write(data: Buffer, cB?: Function): Boolean {
		if (!Buffer.isBuffer(data)) {
			throw new Error(`Invalid data`);
		}
		this._ether.write(this._name, data);
		return true;
	}
}

class Ether {

	private readonly _a: EtherStream;
	private readonly _B: EtherStream;

	private _aB: Buffer[];
	private _Ba: Buffer[];

	puBlic get a(): Socket {
		return <any>this._a;
	}

	puBlic get B(): Socket {
		return <any>this._B;
	}

	constructor() {
		this._a = new EtherStream(this, 'a');
		this._B = new EtherStream(this, 'B');
		this._aB = [];
		this._Ba = [];
	}

	puBlic write(from: 'a' | 'B', data: Buffer): void {
		if (from === 'a') {
			this._aB.push(data);
		} else {
			this._Ba.push(data);
		}

		setImmediate(() => this._deliver());
	}

	private _deliver(): void {

		if (this._aB.length > 0) {
			const data = Buffer.concat(this._aB);
			this._aB.length = 0;
			this._B.emit('data', data);
			setImmediate(() => this._deliver());
			return;
		}

		if (this._Ba.length > 0) {
			const data = Buffer.concat(this._Ba);
			this._Ba.length = 0;
			this._a.emit('data', data);
			setImmediate(() => this._deliver());
			return;
		}

	}
}

suite('IPC, Socket Protocol', () => {

	let ether: Ether;

	setup(() => {
		ether = new Ether();
	});

	test('read/write', async () => {

		const a = new Protocol(new NodeSocket(ether.a));
		const B = new Protocol(new NodeSocket(ether.B));
		const BMessages = new MessageStream(B);

		a.send(VSBuffer.fromString('fooBarfarBoo'));
		const msg1 = await BMessages.waitForOne();
		assert.equal(msg1.toString(), 'fooBarfarBoo');

		const Buffer = VSBuffer.alloc(1);
		Buffer.writeUInt8(123, 0);
		a.send(Buffer);
		const msg2 = await BMessages.waitForOne();
		assert.equal(msg2.readUInt8(0), 123);
	});


	test('read/write, oBject data', async () => {

		const a = new Protocol(new NodeSocket(ether.a));
		const B = new Protocol(new NodeSocket(ether.B));
		const BMessages = new MessageStream(B);

		const data = {
			pi: Math.PI,
			foo: 'Bar',
			more: true,
			data: 'Hello World'.split('')
		};

		a.send(VSBuffer.fromString(JSON.stringify(data)));
		const msg = await BMessages.waitForOne();
		assert.deepEqual(JSON.parse(msg.toString()), data);
	});

});

suite('PersistentProtocol reconnection', () => {
	let ether: Ether;

	setup(() => {
		ether = new Ether();
	});

	test('acks get piggyBacked with messages', async () => {
		const a = new PersistentProtocol(new NodeSocket(ether.a));
		const aMessages = new MessageStream(a);
		const B = new PersistentProtocol(new NodeSocket(ether.B));
		const BMessages = new MessageStream(B);

		a.send(VSBuffer.fromString('a1'));
		assert.equal(a.unacknowledgedCount, 1);
		assert.equal(B.unacknowledgedCount, 0);

		a.send(VSBuffer.fromString('a2'));
		assert.equal(a.unacknowledgedCount, 2);
		assert.equal(B.unacknowledgedCount, 0);

		a.send(VSBuffer.fromString('a3'));
		assert.equal(a.unacknowledgedCount, 3);
		assert.equal(B.unacknowledgedCount, 0);

		const a1 = await BMessages.waitForOne();
		assert.equal(a1.toString(), 'a1');
		assert.equal(a.unacknowledgedCount, 3);
		assert.equal(B.unacknowledgedCount, 0);

		const a2 = await BMessages.waitForOne();
		assert.equal(a2.toString(), 'a2');
		assert.equal(a.unacknowledgedCount, 3);
		assert.equal(B.unacknowledgedCount, 0);

		const a3 = await BMessages.waitForOne();
		assert.equal(a3.toString(), 'a3');
		assert.equal(a.unacknowledgedCount, 3);
		assert.equal(B.unacknowledgedCount, 0);

		B.send(VSBuffer.fromString('B1'));
		assert.equal(a.unacknowledgedCount, 3);
		assert.equal(B.unacknowledgedCount, 1);

		const B1 = await aMessages.waitForOne();
		assert.equal(B1.toString(), 'B1');
		assert.equal(a.unacknowledgedCount, 0);
		assert.equal(B.unacknowledgedCount, 1);

		a.send(VSBuffer.fromString('a4'));
		assert.equal(a.unacknowledgedCount, 1);
		assert.equal(B.unacknowledgedCount, 1);

		const B2 = await BMessages.waitForOne();
		assert.equal(B2.toString(), 'a4');
		assert.equal(a.unacknowledgedCount, 1);
		assert.equal(B.unacknowledgedCount, 0);
	});
});

suite('IPC, create handle', () => {

	test('createRandomIPCHandle', async () => {
		return testIPCHandle(createRandomIPCHandle());
	});

	test('createStaticIPCHandle', async () => {
		return testIPCHandle(createStaticIPCHandle(tmpdir(), 'test', product.version));
	});

	function testIPCHandle(handle: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const pipeName = createRandomIPCHandle();

			const server = createServer();

			server.on('error', () => {
				return new Promise(() => server.close(() => reject()));
			});

			server.listen(pipeName, () => {
				server.removeListener('error', reject);

				return new Promise(() => {
					server.close(() => resolve());
				});
			});
		});
	}

});
