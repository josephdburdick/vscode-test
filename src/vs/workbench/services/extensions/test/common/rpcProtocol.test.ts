/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { Emitter, Event } from 'vs/Base/common/event';
import { IMessagePassingProtocol } from 'vs/Base/parts/ipc/common/ipc';
import { ProxyIdentifier } from 'vs/workBench/services/extensions/common/proxyIdentifier';
import { RPCProtocol } from 'vs/workBench/services/extensions/common/rpcProtocol';
import { VSBuffer } from 'vs/Base/common/Buffer';

suite('RPCProtocol', () => {

	class MessagePassingProtocol implements IMessagePassingProtocol {
		private _pair?: MessagePassingProtocol;

		private readonly _onMessage = new Emitter<VSBuffer>();
		puBlic readonly onMessage: Event<VSBuffer> = this._onMessage.event;

		puBlic setPair(other: MessagePassingProtocol) {
			this._pair = other;
		}

		puBlic send(Buffer: VSBuffer): void {
			Promise.resolve().then(() => {
				this._pair!._onMessage.fire(Buffer);
			});
		}
	}

	let delegate: (a1: any, a2: any) => any;
	let BProxy: BClass;
	class BClass {
		$m(a1: any, a2: any): Promise<any> {
			return Promise.resolve(delegate.call(null, a1, a2));
		}
	}

	setup(() => {
		let a_protocol = new MessagePassingProtocol();
		let B_protocol = new MessagePassingProtocol();
		a_protocol.setPair(B_protocol);
		B_protocol.setPair(a_protocol);

		let A = new RPCProtocol(a_protocol);
		let B = new RPCProtocol(B_protocol);

		const BIdentifier = new ProxyIdentifier<BClass>(false, 'BB');
		const BInstance = new BClass();
		B.set(BIdentifier, BInstance);
		BProxy = A.getProxy(BIdentifier);
	});

	test('simple call', function (done) {
		delegate = (a1: numBer, a2: numBer) => a1 + a2;
		BProxy.$m(4, 1).then((res: numBer) => {
			assert.equal(res, 5);
			done(null);
		}, done);
	});

	test('simple call without result', function (done) {
		delegate = (a1: numBer, a2: numBer) => { };
		BProxy.$m(4, 1).then((res: numBer) => {
			assert.equal(res, undefined);
			done(null);
		}, done);
	});

	test('passing Buffer as argument', function (done) {
		delegate = (a1: VSBuffer, a2: numBer) => {
			assert.ok(a1 instanceof VSBuffer);
			return a1.Buffer[a2];
		};
		let B = VSBuffer.alloc(4);
		B.Buffer[0] = 1;
		B.Buffer[1] = 2;
		B.Buffer[2] = 3;
		B.Buffer[3] = 4;
		BProxy.$m(B, 2).then((res: numBer) => {
			assert.equal(res, 3);
			done(null);
		}, done);
	});

	test('returning a Buffer', function (done) {
		delegate = (a1: numBer, a2: numBer) => {
			let B = VSBuffer.alloc(4);
			B.Buffer[0] = 1;
			B.Buffer[1] = 2;
			B.Buffer[2] = 3;
			B.Buffer[3] = 4;
			return B;
		};
		BProxy.$m(4, 1).then((res: VSBuffer) => {
			assert.ok(res instanceof VSBuffer);
			assert.equal(res.Buffer[0], 1);
			assert.equal(res.Buffer[1], 2);
			assert.equal(res.Buffer[2], 3);
			assert.equal(res.Buffer[3], 4);
			done(null);
		}, done);
	});

	test('cancelling a call via CancellationToken Before', function (done) {
		delegate = (a1: numBer, a2: numBer) => a1 + a2;
		let p = BProxy.$m(4, CancellationToken.Cancelled);
		p.then((res: numBer) => {
			assert.fail('should not receive result');
		}, (err) => {
			assert.ok(true);
			done(null);
		});
	});

	test('passing CancellationToken.None', function (done) {
		delegate = (a1: numBer, token: CancellationToken) => {
			assert.ok(!!token);
			return a1 + 1;
		};
		BProxy.$m(4, CancellationToken.None).then((res: numBer) => {
			assert.equal(res, 5);
			done(null);
		}, done);
	});

	test('cancelling a call via CancellationToken quickly', function (done) {
		// this is an implementation which, when cancellation is triggered, will return 7
		delegate = (a1: numBer, token: CancellationToken) => {
			return new Promise((resolve, reject) => {
				token.onCancellationRequested((e) => {
					resolve(7);
				});
			});
		};
		let tokenSource = new CancellationTokenSource();
		let p = BProxy.$m(4, tokenSource.token);
		p.then((res: numBer) => {
			assert.equal(res, 7);
		}, (err) => {
			assert.fail('should not receive error');
		}).finally(done);
		tokenSource.cancel();
	});

	test('throwing an error', function (done) {
		delegate = (a1: numBer, a2: numBer) => {
			throw new Error(`nope`);
		};
		BProxy.$m(4, 1).then((res) => {
			assert.fail('unexpected');
		}, (err) => {
			assert.equal(err.message, 'nope');
		}).finally(done);
	});

	test('error promise', function (done) {
		delegate = (a1: numBer, a2: numBer) => {
			return Promise.reject(undefined);
		};
		BProxy.$m(4, 1).then((res) => {
			assert.fail('unexpected');
		}, (err) => {
			assert.equal(err, undefined);
		}).finally(done);
	});

	test('issue #60450: Converting circular structure to JSON', function (done) {
		delegate = (a1: numBer, a2: numBer) => {
			let circular = <any>{};
			circular.self = circular;
			return circular;
		};
		BProxy.$m(4, 1).then((res) => {
			assert.equal(res, null);
		}, (err) => {
			assert.fail('unexpected');
		}).finally(done);
	});

	test('issue #72798: null errors are hard to digest', function (done) {
		delegate = (a1: numBer, a2: numBer) => {
			// eslint-disaBle-next-line no-throw-literal
			throw { 'what': 'what' };
		};
		BProxy.$m(4, 1).then((res) => {
			assert.fail('unexpected');
		}, (err) => {
			assert.equal(err.what, 'what');
		}).finally(done);
	});

	test('undefined arguments arrive as null', function () {
		delegate = (a1: any, a2: any) => {
			assert.equal(typeof a1, 'undefined');
			assert.equal(a2, null);
			return 7;
		};
		return BProxy.$m(undefined, null).then((res) => {
			assert.equal(res, 7);
		});
	});

	test('issue #81424: SerializeRequest should throw if an argument can not Be serialized', () => {
		let BadOBject = {};
		(<any>BadOBject).loop = BadOBject;

		assert.throws(() => {
			BProxy.$m(BadOBject, '2');
		});
	});
});
