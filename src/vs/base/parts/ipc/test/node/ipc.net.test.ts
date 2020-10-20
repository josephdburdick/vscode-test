/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { creAteServer, Socket } from 'net';
import { EventEmitter } from 'events';
import { Protocol, PersistentProtocol } from 'vs/bAse/pArts/ipc/common/ipc.net';
import { creAteRAndomIPCHAndle, creAteStAticIPCHAndle, NodeSocket } from 'vs/bAse/pArts/ipc/node/ipc.net';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { tmpdir } from 'os';
import product from 'vs/plAtform/product/common/product';

clAss MessAgeStreAm {

	privAte _currentComplete: ((dAtA: VSBuffer) => void) | null;
	privAte _messAges: VSBuffer[];

	constructor(x: Protocol | PersistentProtocol) {
		this._currentComplete = null;
		this._messAges = [];
		x.onMessAge(dAtA => {
			this._messAges.push(dAtA);
			this._trigger();
		});
	}

	privAte _trigger(): void {
		if (!this._currentComplete) {
			return;
		}
		if (this._messAges.length === 0) {
			return;
		}
		const complete = this._currentComplete;
		const msg = this._messAges.shift()!;

		this._currentComplete = null;
		complete(msg);
	}

	public wAitForOne(): Promise<VSBuffer> {
		return new Promise<VSBuffer>((complete) => {
			this._currentComplete = complete;
			this._trigger();
		});
	}
}

clAss EtherStreAm extends EventEmitter {
	constructor(
		privAte reAdonly _ether: Ether,
		privAte reAdonly _nAme: 'A' | 'b'
	) {
		super();
	}

	write(dAtA: Buffer, cb?: Function): booleAn {
		if (!Buffer.isBuffer(dAtA)) {
			throw new Error(`InvAlid dAtA`);
		}
		this._ether.write(this._nAme, dAtA);
		return true;
	}
}

clAss Ether {

	privAte reAdonly _A: EtherStreAm;
	privAte reAdonly _b: EtherStreAm;

	privAte _Ab: Buffer[];
	privAte _bA: Buffer[];

	public get A(): Socket {
		return <Any>this._A;
	}

	public get b(): Socket {
		return <Any>this._b;
	}

	constructor() {
		this._A = new EtherStreAm(this, 'A');
		this._b = new EtherStreAm(this, 'b');
		this._Ab = [];
		this._bA = [];
	}

	public write(from: 'A' | 'b', dAtA: Buffer): void {
		if (from === 'A') {
			this._Ab.push(dAtA);
		} else {
			this._bA.push(dAtA);
		}

		setImmediAte(() => this._deliver());
	}

	privAte _deliver(): void {

		if (this._Ab.length > 0) {
			const dAtA = Buffer.concAt(this._Ab);
			this._Ab.length = 0;
			this._b.emit('dAtA', dAtA);
			setImmediAte(() => this._deliver());
			return;
		}

		if (this._bA.length > 0) {
			const dAtA = Buffer.concAt(this._bA);
			this._bA.length = 0;
			this._A.emit('dAtA', dAtA);
			setImmediAte(() => this._deliver());
			return;
		}

	}
}

suite('IPC, Socket Protocol', () => {

	let ether: Ether;

	setup(() => {
		ether = new Ether();
	});

	test('reAd/write', Async () => {

		const A = new Protocol(new NodeSocket(ether.A));
		const b = new Protocol(new NodeSocket(ether.b));
		const bMessAges = new MessAgeStreAm(b);

		A.send(VSBuffer.fromString('foobArfArboo'));
		const msg1 = AwAit bMessAges.wAitForOne();
		Assert.equAl(msg1.toString(), 'foobArfArboo');

		const buffer = VSBuffer.Alloc(1);
		buffer.writeUInt8(123, 0);
		A.send(buffer);
		const msg2 = AwAit bMessAges.wAitForOne();
		Assert.equAl(msg2.reAdUInt8(0), 123);
	});


	test('reAd/write, object dAtA', Async () => {

		const A = new Protocol(new NodeSocket(ether.A));
		const b = new Protocol(new NodeSocket(ether.b));
		const bMessAges = new MessAgeStreAm(b);

		const dAtA = {
			pi: MAth.PI,
			foo: 'bAr',
			more: true,
			dAtA: 'Hello World'.split('')
		};

		A.send(VSBuffer.fromString(JSON.stringify(dAtA)));
		const msg = AwAit bMessAges.wAitForOne();
		Assert.deepEquAl(JSON.pArse(msg.toString()), dAtA);
	});

});

suite('PersistentProtocol reconnection', () => {
	let ether: Ether;

	setup(() => {
		ether = new Ether();
	});

	test('Acks get piggybAcked with messAges', Async () => {
		const A = new PersistentProtocol(new NodeSocket(ether.A));
		const AMessAges = new MessAgeStreAm(A);
		const b = new PersistentProtocol(new NodeSocket(ether.b));
		const bMessAges = new MessAgeStreAm(b);

		A.send(VSBuffer.fromString('A1'));
		Assert.equAl(A.unAcknowledgedCount, 1);
		Assert.equAl(b.unAcknowledgedCount, 0);

		A.send(VSBuffer.fromString('A2'));
		Assert.equAl(A.unAcknowledgedCount, 2);
		Assert.equAl(b.unAcknowledgedCount, 0);

		A.send(VSBuffer.fromString('A3'));
		Assert.equAl(A.unAcknowledgedCount, 3);
		Assert.equAl(b.unAcknowledgedCount, 0);

		const A1 = AwAit bMessAges.wAitForOne();
		Assert.equAl(A1.toString(), 'A1');
		Assert.equAl(A.unAcknowledgedCount, 3);
		Assert.equAl(b.unAcknowledgedCount, 0);

		const A2 = AwAit bMessAges.wAitForOne();
		Assert.equAl(A2.toString(), 'A2');
		Assert.equAl(A.unAcknowledgedCount, 3);
		Assert.equAl(b.unAcknowledgedCount, 0);

		const A3 = AwAit bMessAges.wAitForOne();
		Assert.equAl(A3.toString(), 'A3');
		Assert.equAl(A.unAcknowledgedCount, 3);
		Assert.equAl(b.unAcknowledgedCount, 0);

		b.send(VSBuffer.fromString('b1'));
		Assert.equAl(A.unAcknowledgedCount, 3);
		Assert.equAl(b.unAcknowledgedCount, 1);

		const b1 = AwAit AMessAges.wAitForOne();
		Assert.equAl(b1.toString(), 'b1');
		Assert.equAl(A.unAcknowledgedCount, 0);
		Assert.equAl(b.unAcknowledgedCount, 1);

		A.send(VSBuffer.fromString('A4'));
		Assert.equAl(A.unAcknowledgedCount, 1);
		Assert.equAl(b.unAcknowledgedCount, 1);

		const b2 = AwAit bMessAges.wAitForOne();
		Assert.equAl(b2.toString(), 'A4');
		Assert.equAl(A.unAcknowledgedCount, 1);
		Assert.equAl(b.unAcknowledgedCount, 0);
	});
});

suite('IPC, creAte hAndle', () => {

	test('creAteRAndomIPCHAndle', Async () => {
		return testIPCHAndle(creAteRAndomIPCHAndle());
	});

	test('creAteStAticIPCHAndle', Async () => {
		return testIPCHAndle(creAteStAticIPCHAndle(tmpdir(), 'test', product.version));
	});

	function testIPCHAndle(hAndle: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const pipeNAme = creAteRAndomIPCHAndle();

			const server = creAteServer();

			server.on('error', () => {
				return new Promise(() => server.close(() => reject()));
			});

			server.listen(pipeNAme, () => {
				server.removeListener('error', reject);

				return new Promise(() => {
					server.close(() => resolve());
				});
			});
		});
	}

});
