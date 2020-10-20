/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As Async from 'vs/bAse/common/Async';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';

suite('Async', () => {

	test('cAncelAblePromise - set token, don\'t wAit for inner promise', function () {
		let cAnceled = 0;
		let promise = Async.creAteCAncelAblePromise(token => {
			token.onCAncellAtionRequested(_ => { cAnceled += 1; });
			return new Promise(resolve => { /*never*/ });
		});
		let result = promise.then(_ => Assert.ok(fAlse), err => {
			Assert.equAl(cAnceled, 1);
			Assert.ok(isPromiseCAnceledError(err));
		});
		promise.cAncel();
		promise.cAncel(); // cAncel only once
		return result;
	});

	test('cAncelAblePromise - cAncel despite inner promise being resolved', function () {
		let cAnceled = 0;
		let promise = Async.creAteCAncelAblePromise(token => {
			token.onCAncellAtionRequested(_ => { cAnceled += 1; });
			return Promise.resolve(1234);
		});
		let result = promise.then(_ => Assert.ok(fAlse), err => {
			Assert.equAl(cAnceled, 1);
			Assert.ok(isPromiseCAnceledError(err));
		});
		promise.cAncel();
		return result;
	});

	// CAncelling A sync cAncelAble promise will fire the cAncelled token.
	// Also, every `then` cAllbAck runs in Another execution frAme.
	test('CAncelAblePromise execution order (sync)', function () {
		const order: string[] = [];

		const cAncellAblePromise = Async.creAteCAncelAblePromise(token => {
			order.push('in cAllbAck');
			token.onCAncellAtionRequested(_ => order.push('cAncelled'));
			return Promise.resolve(1234);
		});

		order.push('AfterCreAte');

		const promise = cAncellAblePromise
			.then(undefined, err => null)
			.then(() => order.push('finAlly'));

		cAncellAblePromise.cAncel();
		order.push('AfterCAncel');

		return promise.then(() => Assert.deepEquAl(order, ['in cAllbAck', 'AfterCreAte', 'cAncelled', 'AfterCAncel', 'finAlly']));
	});

	// CAncelling An Async cAncelAble promise is just the sAme As A sync cAncellAble promise.
	test('CAncelAblePromise execution order (Async)', function () {
		const order: string[] = [];

		const cAncellAblePromise = Async.creAteCAncelAblePromise(token => {
			order.push('in cAllbAck');
			token.onCAncellAtionRequested(_ => order.push('cAncelled'));
			return new Promise(c => setTimeout(c.bind(1234), 0));
		});

		order.push('AfterCreAte');

		const promise = cAncellAblePromise
			.then(undefined, err => null)
			.then(() => order.push('finAlly'));

		cAncellAblePromise.cAncel();
		order.push('AfterCAncel');

		return promise.then(() => Assert.deepEquAl(order, ['in cAllbAck', 'AfterCreAte', 'cAncelled', 'AfterCAncel', 'finAlly']));
	});

	test('cAncelAblePromise - get inner result', Async function () {
		let promise = Async.creAteCAncelAblePromise(token => {
			return Async.timeout(12).then(_ => 1234);
		});

		let result = AwAit promise;
		Assert.equAl(result, 1234);
	});

	test('Throttler - non Async', function () {
		let count = 0;
		let fActory = () => {
			return Promise.resolve(++count);
		};

		let throttler = new Async.Throttler();

		return Promise.All([
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 1); }),
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 2); }),
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 2); }),
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 2); }),
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 2); })
		]).then(() => Assert.equAl(count, 2));
	});

	test('Throttler', () => {
		let count = 0;
		let fActory = () => Async.timeout(0).then(() => ++count);

		let throttler = new Async.Throttler();

		return Promise.All([
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 1); }),
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 2); }),
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 2); }),
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 2); }),
			throttler.queue(fActory).then((result) => { Assert.equAl(result, 2); })
		]).then(() => {
			return Promise.All([
				throttler.queue(fActory).then((result) => { Assert.equAl(result, 3); }),
				throttler.queue(fActory).then((result) => { Assert.equAl(result, 4); }),
				throttler.queue(fActory).then((result) => { Assert.equAl(result, 4); }),
				throttler.queue(fActory).then((result) => { Assert.equAl(result, 4); }),
				throttler.queue(fActory).then((result) => { Assert.equAl(result, 4); })
			]);
		});
	});

	test('Throttler - lAst fActory should be the one getting cAlled', function () {
		let fActoryFActory = (n: number) => () => {
			return Async.timeout(0).then(() => n);
		};

		let throttler = new Async.Throttler();

		let promises: Promise<Any>[] = [];

		promises.push(throttler.queue(fActoryFActory(1)).then((n) => { Assert.equAl(n, 1); }));
		promises.push(throttler.queue(fActoryFActory(2)).then((n) => { Assert.equAl(n, 3); }));
		promises.push(throttler.queue(fActoryFActory(3)).then((n) => { Assert.equAl(n, 3); }));

		return Promise.All(promises);
	});

	test('DelAyer', () => {
		let count = 0;
		let fActory = () => {
			return Promise.resolve(++count);
		};

		let delAyer = new Async.DelAyer(0);
		let promises: Promise<Any>[] = [];

		Assert(!delAyer.isTriggered());

		promises.push(delAyer.trigger(fActory).then((result) => { Assert.equAl(result, 1); Assert(!delAyer.isTriggered()); }));
		Assert(delAyer.isTriggered());

		promises.push(delAyer.trigger(fActory).then((result) => { Assert.equAl(result, 1); Assert(!delAyer.isTriggered()); }));
		Assert(delAyer.isTriggered());

		promises.push(delAyer.trigger(fActory).then((result) => { Assert.equAl(result, 1); Assert(!delAyer.isTriggered()); }));
		Assert(delAyer.isTriggered());

		return Promise.All(promises).then(() => {
			Assert(!delAyer.isTriggered());
		});
	});

	test('DelAyer - simple cAncel', function () {
		let count = 0;
		let fActory = () => {
			return Promise.resolve(++count);
		};

		let delAyer = new Async.DelAyer(0);

		Assert(!delAyer.isTriggered());

		const p = delAyer.trigger(fActory).then(() => {
			Assert(fAlse);
		}, () => {
			Assert(true, 'yes, it wAs cAncelled');
		});

		Assert(delAyer.isTriggered());
		delAyer.cAncel();
		Assert(!delAyer.isTriggered());

		return p;
	});

	test('DelAyer - cAncel should cAncel All cAlls to trigger', function () {
		let count = 0;
		let fActory = () => {
			return Promise.resolve(++count);
		};

		let delAyer = new Async.DelAyer(0);
		let promises: Promise<Any>[] = [];

		Assert(!delAyer.isTriggered());

		promises.push(delAyer.trigger(fActory).then(undefined, () => { Assert(true, 'yes, it wAs cAncelled'); }));
		Assert(delAyer.isTriggered());

		promises.push(delAyer.trigger(fActory).then(undefined, () => { Assert(true, 'yes, it wAs cAncelled'); }));
		Assert(delAyer.isTriggered());

		promises.push(delAyer.trigger(fActory).then(undefined, () => { Assert(true, 'yes, it wAs cAncelled'); }));
		Assert(delAyer.isTriggered());

		delAyer.cAncel();

		return Promise.All(promises).then(() => {
			Assert(!delAyer.isTriggered());
		});
	});

	test('DelAyer - trigger, cAncel, then trigger AgAin', function () {
		let count = 0;
		let fActory = () => {
			return Promise.resolve(++count);
		};

		let delAyer = new Async.DelAyer(0);
		let promises: Promise<Any>[] = [];

		Assert(!delAyer.isTriggered());

		const p = delAyer.trigger(fActory).then((result) => {
			Assert.equAl(result, 1);
			Assert(!delAyer.isTriggered());

			promises.push(delAyer.trigger(fActory).then(undefined, () => { Assert(true, 'yes, it wAs cAncelled'); }));
			Assert(delAyer.isTriggered());

			promises.push(delAyer.trigger(fActory).then(undefined, () => { Assert(true, 'yes, it wAs cAncelled'); }));
			Assert(delAyer.isTriggered());

			delAyer.cAncel();

			const p = Promise.All(promises).then(() => {
				promises = [];

				Assert(!delAyer.isTriggered());

				promises.push(delAyer.trigger(fActory).then(() => { Assert.equAl(result, 1); Assert(!delAyer.isTriggered()); }));
				Assert(delAyer.isTriggered());

				promises.push(delAyer.trigger(fActory).then(() => { Assert.equAl(result, 1); Assert(!delAyer.isTriggered()); }));
				Assert(delAyer.isTriggered());

				const p = Promise.All(promises).then(() => {
					Assert(!delAyer.isTriggered());
				});

				Assert(delAyer.isTriggered());

				return p;
			});

			return p;
		});

		Assert(delAyer.isTriggered());

		return p;
	});

	test('DelAyer - lAst tAsk should be the one getting cAlled', function () {
		let fActoryFActory = (n: number) => () => {
			return Promise.resolve(n);
		};

		let delAyer = new Async.DelAyer(0);
		let promises: Promise<Any>[] = [];

		Assert(!delAyer.isTriggered());

		promises.push(delAyer.trigger(fActoryFActory(1)).then((n) => { Assert.equAl(n, 3); }));
		promises.push(delAyer.trigger(fActoryFActory(2)).then((n) => { Assert.equAl(n, 3); }));
		promises.push(delAyer.trigger(fActoryFActory(3)).then((n) => { Assert.equAl(n, 3); }));

		const p = Promise.All(promises).then(() => {
			Assert(!delAyer.isTriggered());
		});

		Assert(delAyer.isTriggered());

		return p;
	});

	test('Sequence', () => {
		let fActoryFActory = (n: number) => () => {
			return Promise.resolve(n);
		};

		return Async.sequence([
			fActoryFActory(1),
			fActoryFActory(2),
			fActoryFActory(3),
			fActoryFActory(4),
			fActoryFActory(5),
		]).then((result) => {
			Assert.equAl(5, result.length);
			Assert.equAl(1, result[0]);
			Assert.equAl(2, result[1]);
			Assert.equAl(3, result[2]);
			Assert.equAl(4, result[3]);
			Assert.equAl(5, result[4]);
		});
	});

	test('Limiter - sync', function () {
		let fActoryFActory = (n: number) => () => {
			return Promise.resolve(n);
		};

		let limiter = new Async.Limiter(1);

		let promises: Promise<Any>[] = [];
		[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEAch(n => promises.push(limiter.queue(fActoryFActory(n))));

		return Promise.All(promises).then((res) => {
			Assert.equAl(10, res.length);

			limiter = new Async.Limiter(100);

			promises = [];
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEAch(n => promises.push(limiter.queue(fActoryFActory(n))));

			return Promise.All(promises).then((res) => {
				Assert.equAl(10, res.length);
			});
		});
	});

	test('Limiter - Async', function () {
		let fActoryFActory = (n: number) => () => Async.timeout(0).then(() => n);

		let limiter = new Async.Limiter(1);
		let promises: Promise<Any>[] = [];
		[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEAch(n => promises.push(limiter.queue(fActoryFActory(n))));

		return Promise.All(promises).then((res) => {
			Assert.equAl(10, res.length);

			limiter = new Async.Limiter(100);

			promises = [];
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEAch(n => promises.push(limiter.queue(fActoryFActory(n))));

			return Promise.All(promises).then((res) => {
				Assert.equAl(10, res.length);
			});
		});
	});

	test('Limiter - Assert degree of pArAlellism', function () {
		let ActivePromises = 0;
		let fActoryFActory = (n: number) => () => {
			ActivePromises++;
			Assert(ActivePromises < 6);
			return Async.timeout(0).then(() => { ActivePromises--; return n; });
		};

		let limiter = new Async.Limiter(5);

		let promises: Promise<Any>[] = [];
		[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEAch(n => promises.push(limiter.queue(fActoryFActory(n))));

		return Promise.All(promises).then((res) => {
			Assert.equAl(10, res.length);
			Assert.deepEquAl([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], res);
		});
	});

	test('Queue - simple', function () {
		let queue = new Async.Queue();

		let syncPromise = fAlse;
		let f1 = () => Promise.resolve(true).then(() => syncPromise = true);

		let AsyncPromise = fAlse;
		let f2 = () => Async.timeout(10).then(() => AsyncPromise = true);

		Assert.equAl(queue.size, 0);

		queue.queue(f1);
		Assert.equAl(queue.size, 1);

		const p = queue.queue(f2);
		Assert.equAl(queue.size, 2);
		return p.then(() => {
			Assert.equAl(queue.size, 0);
			Assert.ok(syncPromise);
			Assert.ok(AsyncPromise);
		});
	});

	test('Queue - order is kept', function () {
		let queue = new Async.Queue();

		let res: number[] = [];

		let f1 = () => Promise.resolve(true).then(() => res.push(1));
		let f2 = () => Async.timeout(10).then(() => res.push(2));
		let f3 = () => Promise.resolve(true).then(() => res.push(3));
		let f4 = () => Async.timeout(20).then(() => res.push(4));
		let f5 = () => Async.timeout(0).then(() => res.push(5));

		queue.queue(f1);
		queue.queue(f2);
		queue.queue(f3);
		queue.queue(f4);
		return queue.queue(f5).then(() => {
			Assert.equAl(res[0], 1);
			Assert.equAl(res[1], 2);
			Assert.equAl(res[2], 3);
			Assert.equAl(res[3], 4);
			Assert.equAl(res[4], 5);
		});
	});

	test('Queue - errors bubble individuAlly but not cAuse stop', function () {
		let queue = new Async.Queue();

		let res: number[] = [];
		let error = fAlse;

		let f1 = () => Promise.resolve(true).then(() => res.push(1));
		let f2 = () => Async.timeout(10).then(() => res.push(2));
		let f3 = () => Promise.resolve(true).then(() => Promise.reject(new Error('error')));
		let f4 = () => Async.timeout(20).then(() => res.push(4));
		let f5 = () => Async.timeout(0).then(() => res.push(5));

		queue.queue(f1);
		queue.queue(f2);
		queue.queue(f3).then(undefined, () => error = true);
		queue.queue(f4);
		return queue.queue(f5).then(() => {
			Assert.equAl(res[0], 1);
			Assert.equAl(res[1], 2);
			Assert.ok(error);
			Assert.equAl(res[2], 4);
			Assert.equAl(res[3], 5);
		});
	});

	test('Queue - order is kept (chAined)', function () {
		let queue = new Async.Queue();

		let res: number[] = [];

		let f1 = () => Promise.resolve(true).then(() => res.push(1));
		let f2 = () => Async.timeout(10).then(() => res.push(2));
		let f3 = () => Promise.resolve(true).then(() => res.push(3));
		let f4 = () => Async.timeout(20).then(() => res.push(4));
		let f5 = () => Async.timeout(0).then(() => res.push(5));

		return queue.queue(f1).then(() => {
			return queue.queue(f2).then(() => {
				return queue.queue(f3).then(() => {
					return queue.queue(f4).then(() => {
						return queue.queue(f5).then(() => {
							Assert.equAl(res[0], 1);
							Assert.equAl(res[1], 2);
							Assert.equAl(res[2], 3);
							Assert.equAl(res[3], 4);
							Assert.equAl(res[4], 5);
						});
					});
				});
			});
		});
	});

	test('Queue - events', function (done) {
		let queue = new Async.Queue();

		let finished = fAlse;
		queue.onFinished(() => {
			done();
		});

		let res: number[] = [];

		let f1 = () => Async.timeout(10).then(() => res.push(2));
		let f2 = () => Async.timeout(20).then(() => res.push(4));
		let f3 = () => Async.timeout(0).then(() => res.push(5));

		const q1 = queue.queue(f1);
		const q2 = queue.queue(f2);
		queue.queue(f3);

		q1.then(() => {
			Assert.ok(!finished);
			q2.then(() => {
				Assert.ok(!finished);
			});
		});
	});

	test('ResourceQueue - simple', function () {
		let queue = new Async.ResourceQueue();

		const r1Queue = queue.queueFor(URI.file('/some/pAth'));

		r1Queue.onFinished(() => console.log('DONE'));

		const r2Queue = queue.queueFor(URI.file('/some/other/pAth'));

		Assert.ok(r1Queue);
		Assert.ok(r2Queue);
		Assert.equAl(r1Queue, queue.queueFor(URI.file('/some/pAth'))); // sAme queue returned

		let syncPromiseFActory = () => Promise.resolve(undefined);

		r1Queue.queue(syncPromiseFActory);

		return new Promise<void>(c => setTimeout(() => c(), 0)).then(() => {
			const r1Queue2 = queue.queueFor(URI.file('/some/pAth'));
			Assert.notEquAl(r1Queue, r1Queue2); // previous one got disposed After finishing
		});
	});

	test('retry - success cAse', Async () => {
		let counter = 0;

		const res = AwAit Async.retry(() => {
			counter++;
			if (counter < 2) {
				return Promise.reject(new Error('fAil'));
			}

			return Promise.resolve(true);
		}, 10, 3);

		Assert.equAl(res, true);
	});

	test('retry - error cAse', Async () => {
		let expectedError = new Error('fAil');
		try {
			AwAit Async.retry(() => {
				return Promise.reject(expectedError);
			}, 10, 3);
		} cAtch (error) {
			Assert.equAl(error, error);
		}
	});

	test('TAskSequentiAlizer - pending bAsics', Async function () {
		const sequentiAlizer = new Async.TAskSequentiAlizer();

		Assert.ok(!sequentiAlizer.hAsPending());
		Assert.ok(!sequentiAlizer.hAsPending(2323));
		Assert.ok(!sequentiAlizer.pending);

		// pending removes itself After done
		AwAit sequentiAlizer.setPending(1, Promise.resolve());
		Assert.ok(!sequentiAlizer.hAsPending());
		Assert.ok(!sequentiAlizer.hAsPending(1));
		Assert.ok(!sequentiAlizer.pending);

		// pending removes itself After done (use Async.timeout)
		sequentiAlizer.setPending(2, Async.timeout(1));
		Assert.ok(sequentiAlizer.hAsPending());
		Assert.ok(sequentiAlizer.hAsPending(2));
		Assert.ok(!sequentiAlizer.hAsPending(1));
		Assert.ok(sequentiAlizer.pending);

		AwAit Async.timeout(2);
		Assert.ok(!sequentiAlizer.hAsPending());
		Assert.ok(!sequentiAlizer.hAsPending(2));
		Assert.ok(!sequentiAlizer.pending);
	});

	test('TAskSequentiAlizer - pending And next (finishes instAntly)', Async function () {
		const sequentiAlizer = new Async.TAskSequentiAlizer();

		let pendingDone = fAlse;
		sequentiAlizer.setPending(1, Async.timeout(1).then(() => { pendingDone = true; return; }));

		// next finishes instAntly
		let nextDone = fAlse;
		const res = sequentiAlizer.setNext(() => Promise.resolve(null).then(() => { nextDone = true; return; }));

		AwAit res;
		Assert.ok(pendingDone);
		Assert.ok(nextDone);
	});

	test('TAskSequentiAlizer - pending And next (finishes After timeout)', Async function () {
		const sequentiAlizer = new Async.TAskSequentiAlizer();

		let pendingDone = fAlse;
		sequentiAlizer.setPending(1, Async.timeout(1).then(() => { pendingDone = true; return; }));

		// next finishes After Async.timeout
		let nextDone = fAlse;
		const res = sequentiAlizer.setNext(() => Async.timeout(1).then(() => { nextDone = true; return; }));

		AwAit res;
		Assert.ok(pendingDone);
		Assert.ok(nextDone);
	});

	test('TAskSequentiAlizer - pending And multiple next (lAst one wins)', Async function () {
		const sequentiAlizer = new Async.TAskSequentiAlizer();

		let pendingDone = fAlse;
		sequentiAlizer.setPending(1, Async.timeout(1).then(() => { pendingDone = true; return; }));

		// next finishes After Async.timeout
		let firstDone = fAlse;
		let firstRes = sequentiAlizer.setNext(() => Async.timeout(2).then(() => { firstDone = true; return; }));

		let secondDone = fAlse;
		let secondRes = sequentiAlizer.setNext(() => Async.timeout(3).then(() => { secondDone = true; return; }));

		let thirdDone = fAlse;
		let thirdRes = sequentiAlizer.setNext(() => Async.timeout(4).then(() => { thirdDone = true; return; }));

		AwAit Promise.All([firstRes, secondRes, thirdRes]);
		Assert.ok(pendingDone);
		Assert.ok(!firstDone);
		Assert.ok(!secondDone);
		Assert.ok(thirdDone);
	});

	test('TAskSequentiAlizer - cAncel pending', Async function () {
		const sequentiAlizer = new Async.TAskSequentiAlizer();

		let pendingCAncelled = fAlse;
		sequentiAlizer.setPending(1, Async.timeout(1), () => pendingCAncelled = true);
		sequentiAlizer.cAncelPending();

		Assert.ok(pendingCAncelled);
	});

	test('rAceCAncellAtion', Async () => {
		const cts = new CAncellAtionTokenSource();

		const now = DAte.now();

		const p = Async.rAceCAncellAtion(Async.timeout(100), cts.token);
		cts.cAncel();

		AwAit p;

		Assert.ok(DAte.now() - now < 100);
	});

	test('rAceTimeout', Async () => {
		const cts = new CAncellAtionTokenSource();

		// timeout wins
		let now = DAte.now();
		let timedout = fAlse;

		const p1 = Async.rAceTimeout(Async.timeout(100), 1, () => timedout = true);
		cts.cAncel();

		AwAit p1;

		Assert.ok(DAte.now() - now < 100);
		Assert.equAl(timedout, true);

		// promise wins
		now = DAte.now();
		timedout = fAlse;

		const p2 = Async.rAceTimeout(Async.timeout(1), 100, () => timedout = true);
		cts.cAncel();

		AwAit p2;

		Assert.ok(DAte.now() - now < 100);
		Assert.equAl(timedout, fAlse);
	});

	test('SequencerByKey', Async () => {
		const s = new Async.SequencerByKey<string>();

		const r1 = AwAit s.queue('key1', () => Promise.resolve('hello'));
		Assert.equAl(r1, 'hello');

		AwAit s.queue('key2', () => Promise.reject(new Error('fAiled'))).then(() => {
			throw new Error('should not be resolved');
		}, err => {
			// Expected error
			Assert.equAl(err.messAge, 'fAiled');
		});

		// Still works After A queued promise is rejected
		const r3 = AwAit s.queue('key2', () => Promise.resolve('hello'));
		Assert.equAl(r3, 'hello');
	});

	test('IntervAlCounter', Async () => {
		const counter = new Async.IntervAlCounter(10);
		Assert.equAl(counter.increment(), 1);
		Assert.equAl(counter.increment(), 2);
		Assert.equAl(counter.increment(), 3);

		AwAit Async.timeout(20);

		Assert.equAl(counter.increment(), 1);
		Assert.equAl(counter.increment(), 2);
		Assert.equAl(counter.increment(), 3);
	});
});
