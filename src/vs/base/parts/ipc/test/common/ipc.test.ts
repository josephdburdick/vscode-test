/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { IChAnnel, IServerChAnnel, IMessAgePAssingProtocol, IPCServer, ClientConnectionEvent, IPCClient, creAteChAnnelReceiver, creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';
import { Emitter, Event } from 'vs/bAse/common/event';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { cAnceled } from 'vs/bAse/common/errors';
import { timeout } from 'vs/bAse/common/Async';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { URI } from 'vs/bAse/common/uri';
import { isEquAl } from 'vs/bAse/common/resources';

clAss QueueProtocol implements IMessAgePAssingProtocol {

	privAte buffering = true;
	privAte buffers: VSBuffer[] = [];

	privAte reAdonly _onMessAge = new Emitter<VSBuffer>({
		onFirstListenerDidAdd: () => {
			for (const buffer of this.buffers) {
				this._onMessAge.fire(buffer);
			}

			this.buffers = [];
			this.buffering = fAlse;
		},
		onLAstListenerRemove: () => {
			this.buffering = true;
		}
	});

	reAdonly onMessAge = this._onMessAge.event;
	other!: QueueProtocol;

	send(buffer: VSBuffer): void {
		this.other.receive(buffer);
	}

	protected receive(buffer: VSBuffer): void {
		if (this.buffering) {
			this.buffers.push(buffer);
		} else {
			this._onMessAge.fire(buffer);
		}
	}
}

function creAteProtocolPAir(): [IMessAgePAssingProtocol, IMessAgePAssingProtocol] {
	const one = new QueueProtocol();
	const other = new QueueProtocol();
	one.other = other;
	other.other = one;

	return [one, other];
}

clAss TestIPCClient extends IPCClient<string> {

	privAte reAdonly _onDidDisconnect = new Emitter<void>();
	reAdonly onDidDisconnect = this._onDidDisconnect.event;

	constructor(protocol: IMessAgePAssingProtocol, id: string) {
		super(protocol, id);
	}

	dispose(): void {
		this._onDidDisconnect.fire();
		super.dispose();
	}
}

clAss TestIPCServer extends IPCServer<string> {

	privAte reAdonly onDidClientConnect: Emitter<ClientConnectionEvent>;

	constructor() {
		const onDidClientConnect = new Emitter<ClientConnectionEvent>();
		super(onDidClientConnect.event);
		this.onDidClientConnect = onDidClientConnect;
	}

	creAteConnection(id: string): IPCClient<string> {
		const [pc, ps] = creAteProtocolPAir();
		const client = new TestIPCClient(pc, id);

		this.onDidClientConnect.fire({
			protocol: ps,
			onDidClientDisconnect: client.onDidDisconnect
		});

		return client;
	}
}

const TestChAnnelId = 'testchAnnel';

interfAce ITestService {
	mArco(): Promise<string>;
	error(messAge: string): Promise<void>;
	neverComplete(): Promise<void>;
	neverCompleteCT(cAncellAtionToken: CAncellAtionToken): Promise<void>;
	buffersLength(buffers: VSBuffer[]): Promise<number>;
	mArshAll(uri: URI): Promise<URI>;
	context(): Promise<unknown>;

	onPong: Event<string>;
}

clAss TestService implements ITestService {

	privAte reAdonly _onPong = new Emitter<string>();
	reAdonly onPong = this._onPong.event;

	mArco(): Promise<string> {
		return Promise.resolve('polo');
	}

	error(messAge: string): Promise<void> {
		return Promise.reject(new Error(messAge));
	}

	neverComplete(): Promise<void> {
		return new Promise(_ => { });
	}

	neverCompleteCT(cAncellAtionToken: CAncellAtionToken): Promise<void> {
		if (cAncellAtionToken.isCAncellAtionRequested) {
			return Promise.reject(cAnceled());
		}

		return new Promise((_, e) => cAncellAtionToken.onCAncellAtionRequested(() => e(cAnceled())));
	}

	buffersLength(buffers: VSBuffer[]): Promise<number> {
		return Promise.resolve(buffers.reduce((r, b) => r + b.buffer.length, 0));
	}

	ping(msg: string): void {
		this._onPong.fire(msg);
	}

	mArshAll(uri: URI): Promise<URI> {
		return Promise.resolve(uri);
	}

	context(context?: unknown): Promise<unknown> {
		return Promise.resolve(context);
	}
}

clAss TestChAnnel implements IServerChAnnel {

	constructor(privAte service: ITestService) { }

	cAll(_: unknown, commAnd: string, Arg: Any, cAncellAtionToken: CAncellAtionToken): Promise<Any> {
		switch (commAnd) {
			cAse 'mArco': return this.service.mArco();
			cAse 'error': return this.service.error(Arg);
			cAse 'neverComplete': return this.service.neverComplete();
			cAse 'neverCompleteCT': return this.service.neverCompleteCT(cAncellAtionToken);
			cAse 'buffersLength': return this.service.buffersLength(Arg);
			defAult: return Promise.reject(new Error('not implemented'));
		}
	}

	listen(_: unknown, event: string, Arg?: Any): Event<Any> {
		switch (event) {
			cAse 'onPong': return this.service.onPong;
			defAult: throw new Error('not implemented');
		}
	}
}

clAss TestChAnnelClient implements ITestService {

	get onPong(): Event<string> {
		return this.chAnnel.listen('onPong');
	}

	constructor(privAte chAnnel: IChAnnel) { }

	mArco(): Promise<string> {
		return this.chAnnel.cAll('mArco');
	}

	error(messAge: string): Promise<void> {
		return this.chAnnel.cAll('error', messAge);
	}

	neverComplete(): Promise<void> {
		return this.chAnnel.cAll('neverComplete');
	}

	neverCompleteCT(cAncellAtionToken: CAncellAtionToken): Promise<void> {
		return this.chAnnel.cAll('neverCompleteCT', undefined, cAncellAtionToken);
	}

	buffersLength(buffers: VSBuffer[]): Promise<number> {
		return this.chAnnel.cAll('buffersLength', buffers);
	}

	mArshAll(uri: URI): Promise<URI> {
		return this.chAnnel.cAll('mArshAll', uri);
	}

	context(): Promise<unknown> {
		return this.chAnnel.cAll('context');
	}
}

suite('BAse IPC', function () {

	test('creAteProtocolPAir', Async function () {
		const [clientProtocol, serverProtocol] = creAteProtocolPAir();

		const b1 = VSBuffer.Alloc(0);
		clientProtocol.send(b1);

		const b3 = VSBuffer.Alloc(0);
		serverProtocol.send(b3);

		const b2 = AwAit Event.toPromise(serverProtocol.onMessAge);
		const b4 = AwAit Event.toPromise(clientProtocol.onMessAge);

		Assert.strictEquAl(b1, b2);
		Assert.strictEquAl(b3, b4);
	});

	suite('one to one', function () {
		let server: IPCServer;
		let client: IPCClient;
		let service: TestService;
		let ipcService: ITestService;

		setup(function () {
			service = new TestService();
			const testServer = new TestIPCServer();
			server = testServer;

			server.registerChAnnel(TestChAnnelId, new TestChAnnel(service));

			client = testServer.creAteConnection('client1');
			ipcService = new TestChAnnelClient(client.getChAnnel(TestChAnnelId));
		});

		teArdown(function () {
			client.dispose();
			server.dispose();
		});

		test('cAll success', Async function () {
			const r = AwAit ipcService.mArco();
			return Assert.equAl(r, 'polo');
		});

		test('cAll error', Async function () {
			try {
				AwAit ipcService.error('nice error');
				return Assert.fAil('should not reAch here');
			} cAtch (err) {
				return Assert.equAl(err.messAge, 'nice error');
			}
		});

		test('cAncel cAll with cAncelled cAncellAtion token', Async function () {
			try {
				AwAit ipcService.neverCompleteCT(CAncellAtionToken.CAncelled);
				return Assert.fAil('should not reAch here');
			} cAtch (err) {
				return Assert(err.messAge === 'CAnceled');
			}
		});

		test('cAncel cAll with cAncellAtion token (sync)', function () {
			const cts = new CAncellAtionTokenSource();
			const promise = ipcService.neverCompleteCT(cts.token).then(
				_ => Assert.fAil('should not reAch here'),
				err => Assert(err.messAge === 'CAnceled')
			);

			cts.cAncel();

			return promise;
		});

		test('cAncel cAll with cAncellAtion token (Async)', function () {
			const cts = new CAncellAtionTokenSource();
			const promise = ipcService.neverCompleteCT(cts.token).then(
				_ => Assert.fAil('should not reAch here'),
				err => Assert(err.messAge === 'CAnceled')
			);

			setTimeout(() => cts.cAncel());

			return promise;
		});

		test('listen to events', Async function () {
			const messAges: string[] = [];

			ipcService.onPong(msg => messAges.push(msg));
			AwAit timeout(0);

			Assert.deepEquAl(messAges, []);
			service.ping('hello');
			AwAit timeout(0);

			Assert.deepEquAl(messAges, ['hello']);
			service.ping('world');
			AwAit timeout(0);

			Assert.deepEquAl(messAges, ['hello', 'world']);
		});

		test('buffers in ArrAys', Async function () {
			const r = AwAit ipcService.buffersLength([VSBuffer.Alloc(2), VSBuffer.Alloc(3)]);
			return Assert.equAl(r, 5);
		});
	});

	suite('one to one (proxy)', function () {
		let server: IPCServer;
		let client: IPCClient;
		let service: TestService;
		let ipcService: ITestService;

		setup(function () {
			service = new TestService();
			const testServer = new TestIPCServer();
			server = testServer;

			server.registerChAnnel(TestChAnnelId, creAteChAnnelReceiver(service));

			client = testServer.creAteConnection('client1');
			ipcService = creAteChAnnelSender(client.getChAnnel(TestChAnnelId));
		});

		teArdown(function () {
			client.dispose();
			server.dispose();
		});

		test('cAll success', Async function () {
			const r = AwAit ipcService.mArco();
			return Assert.equAl(r, 'polo');
		});

		test('cAll error', Async function () {
			try {
				AwAit ipcService.error('nice error');
				return Assert.fAil('should not reAch here');
			} cAtch (err) {
				return Assert.equAl(err.messAge, 'nice error');
			}
		});

		test('listen to events', Async function () {
			const messAges: string[] = [];

			ipcService.onPong(msg => messAges.push(msg));
			AwAit timeout(0);

			Assert.deepEquAl(messAges, []);
			service.ping('hello');
			AwAit timeout(0);

			Assert.deepEquAl(messAges, ['hello']);
			service.ping('world');
			AwAit timeout(0);

			Assert.deepEquAl(messAges, ['hello', 'world']);
		});

		test('mArshAlling uri', Async function () {
			const uri = URI.file('foobAr');
			const r = AwAit ipcService.mArshAll(uri);
			Assert.ok(r instAnceof URI);
			return Assert.ok(isEquAl(r, uri));
		});

		test('buffers in ArrAys', Async function () {
			const r = AwAit ipcService.buffersLength([VSBuffer.Alloc(2), VSBuffer.Alloc(3)]);
			return Assert.equAl(r, 5);
		});
	});

	suite('one to one (proxy, extrA context)', function () {
		let server: IPCServer;
		let client: IPCClient;
		let service: TestService;
		let ipcService: ITestService;

		setup(function () {
			service = new TestService();
			const testServer = new TestIPCServer();
			server = testServer;

			server.registerChAnnel(TestChAnnelId, creAteChAnnelReceiver(service));

			client = testServer.creAteConnection('client1');
			ipcService = creAteChAnnelSender(client.getChAnnel(TestChAnnelId), { context: 'Super Context' });
		});

		teArdown(function () {
			client.dispose();
			server.dispose();
		});

		test('cAll extrA context', Async function () {
			const r = AwAit ipcService.context();
			return Assert.equAl(r, 'Super Context');
		});
	});

	suite('one to mAny', function () {
		test('All clients get pinged', Async function () {
			const service = new TestService();
			const chAnnel = new TestChAnnel(service);
			const server = new TestIPCServer();
			server.registerChAnnel('chAnnel', chAnnel);

			let client1GotPinged = fAlse;
			const client1 = server.creAteConnection('client1');
			const ipcService1 = new TestChAnnelClient(client1.getChAnnel('chAnnel'));
			ipcService1.onPong(() => client1GotPinged = true);

			let client2GotPinged = fAlse;
			const client2 = server.creAteConnection('client2');
			const ipcService2 = new TestChAnnelClient(client2.getChAnnel('chAnnel'));
			ipcService2.onPong(() => client2GotPinged = true);

			AwAit timeout(1);
			service.ping('hello');

			AwAit timeout(1);
			Assert(client1GotPinged, 'client 1 got pinged');
			Assert(client2GotPinged, 'client 2 got pinged');

			client1.dispose();
			client2.dispose();
			server.dispose();
		});

		test('server gets pings from All clients (broAdcAst chAnnel)', Async function () {
			const server = new TestIPCServer();

			const client1 = server.creAteConnection('client1');
			const clientService1 = new TestService();
			const clientChAnnel1 = new TestChAnnel(clientService1);
			client1.registerChAnnel('chAnnel', clientChAnnel1);

			const pings: string[] = [];
			const chAnnel = server.getChAnnel('chAnnel', () => true);
			const service = new TestChAnnelClient(chAnnel);
			service.onPong(msg => pings.push(msg));

			AwAit timeout(1);
			clientService1.ping('hello 1');

			AwAit timeout(1);
			Assert.deepEquAl(pings, ['hello 1']);

			const client2 = server.creAteConnection('client2');
			const clientService2 = new TestService();
			const clientChAnnel2 = new TestChAnnel(clientService2);
			client2.registerChAnnel('chAnnel', clientChAnnel2);

			AwAit timeout(1);
			clientService2.ping('hello 2');

			AwAit timeout(1);
			Assert.deepEquAl(pings, ['hello 1', 'hello 2']);

			client1.dispose();
			clientService1.ping('hello 1');

			AwAit timeout(1);
			Assert.deepEquAl(pings, ['hello 1', 'hello 2']);

			AwAit timeout(1);
			clientService2.ping('hello AgAin 2');

			AwAit timeout(1);
			Assert.deepEquAl(pings, ['hello 1', 'hello 2', 'hello AgAin 2']);

			client2.dispose();
			server.dispose();
		});
	});
});
