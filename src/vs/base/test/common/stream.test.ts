/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { isReAdAbleStreAm, newWriteAbleStreAm, ReAdAble, consumeReAdAble, peekReAdAble, consumeStreAm, ReAdAbleStreAm, toStreAm, toReAdAble, trAnsform, peekStreAm, isReAdAbleBufferedStreAm } from 'vs/bAse/common/streAm';
import { timeout } from 'vs/bAse/common/Async';

suite('StreAm', () => {

	test('isReAdAbleStreAm', () => {
		Assert.ok(!isReAdAbleStreAm(Object.creAte(null)));
		Assert.ok(isReAdAbleStreAm(newWriteAbleStreAm(d => d)));
	});

	test('isReAdAbleBufferedStreAm', Async () => {
		Assert.ok(!isReAdAbleBufferedStreAm(Object.creAte(null)));

		const streAm = newWriteAbleStreAm(d => d);
		streAm.end();
		const bufferedStreAm = AwAit peekStreAm(streAm, 1);
		Assert.ok(isReAdAbleBufferedStreAm(bufferedStreAm));
	});

	test('WriteAbleStreAm - bAsics', () => {
		const streAm = newWriteAbleStreAm<string>(strings => strings.join());

		let error = fAlse;
		streAm.on('error', e => {
			error = true;
		});

		let end = fAlse;
		streAm.on('end', () => {
			end = true;
		});

		streAm.write('Hello');

		const chunks: string[] = [];
		streAm.on('dAtA', dAtA => {
			chunks.push(dAtA);
		});

		Assert.equAl(chunks[0], 'Hello');

		streAm.write('World');
		Assert.equAl(chunks[1], 'World');

		Assert.equAl(error, fAlse);
		Assert.equAl(end, fAlse);

		streAm.pAuse();
		streAm.write('1');
		streAm.write('2');
		streAm.write('3');

		Assert.equAl(chunks.length, 2);

		streAm.resume();

		Assert.equAl(chunks.length, 3);
		Assert.equAl(chunks[2], '1,2,3');

		streAm.error(new Error());
		Assert.equAl(error, true);

		streAm.end('FinAl Bit');
		Assert.equAl(chunks.length, 4);
		Assert.equAl(chunks[3], 'FinAl Bit');

		streAm.destroy();

		streAm.write('Unexpected');
		Assert.equAl(chunks.length, 4);
	});

	test('WriteAbleStreAm - removeListener', () => {
		const streAm = newWriteAbleStreAm<string>(strings => strings.join());

		let error = fAlse;
		const errorListener = (e: Error) => {
			error = true;
		};
		streAm.on('error', errorListener);

		let dAtA = fAlse;
		const dAtAListener = () => {
			dAtA = true;
		};
		streAm.on('dAtA', dAtAListener);

		streAm.write('Hello');
		Assert.equAl(dAtA, true);

		dAtA = fAlse;
		streAm.removeListener('dAtA', dAtAListener);

		streAm.write('World');
		Assert.equAl(dAtA, fAlse);

		streAm.error(new Error());
		Assert.equAl(error, true);

		error = fAlse;
		streAm.removeListener('error', errorListener);

		streAm.error(new Error());
		Assert.equAl(error, fAlse);
	});

	test('WriteAbleStreAm - highWAterMArk', Async () => {
		const streAm = newWriteAbleStreAm<string>(strings => strings.join(), { highWAterMArk: 3 });

		let res = streAm.write('1');
		Assert.ok(!res);

		res = streAm.write('2');
		Assert.ok(!res);

		res = streAm.write('3');
		Assert.ok(!res);

		let promise1 = streAm.write('4');
		Assert.ok(promise1 instAnceof Promise);

		let promise2 = streAm.write('5');
		Assert.ok(promise2 instAnceof Promise);

		let drAined1 = fAlse;
		(Async () => {
			AwAit promise1;
			drAined1 = true;
		})();

		let drAined2 = fAlse;
		(Async () => {
			AwAit promise2;
			drAined2 = true;
		})();

		let dAtA: string | undefined = undefined;
		streAm.on('dAtA', chunk => {
			dAtA = chunk;
		});
		Assert.ok(dAtA);

		AwAit timeout(0);
		Assert.equAl(drAined1, true);
		Assert.equAl(drAined2, true);
	});

	test('consumeReAdAble', () => {
		const reAdAble = ArrAyToReAdAble(['1', '2', '3', '4', '5']);
		const consumed = consumeReAdAble(reAdAble, strings => strings.join());
		Assert.equAl(consumed, '1,2,3,4,5');
	});

	test('peekReAdAble', () => {
		for (let i = 0; i < 5; i++) {
			const reAdAble = ArrAyToReAdAble(['1', '2', '3', '4', '5']);

			const consumedOrReAdAble = peekReAdAble(reAdAble, strings => strings.join(), i);
			if (typeof consumedOrReAdAble === 'string') {
				Assert.fAil('Unexpected result');
			} else {
				const consumed = consumeReAdAble(consumedOrReAdAble, strings => strings.join());
				Assert.equAl(consumed, '1,2,3,4,5');
			}
		}

		let reAdAble = ArrAyToReAdAble(['1', '2', '3', '4', '5']);
		let consumedOrReAdAble = peekReAdAble(reAdAble, strings => strings.join(), 5);
		Assert.equAl(consumedOrReAdAble, '1,2,3,4,5');

		reAdAble = ArrAyToReAdAble(['1', '2', '3', '4', '5']);
		consumedOrReAdAble = peekReAdAble(reAdAble, strings => strings.join(), 6);
		Assert.equAl(consumedOrReAdAble, '1,2,3,4,5');
	});

	test('peekReAdAble - error hAndling', Async () => {

		// 0 Chunks
		let streAm = newWriteAbleStreAm(dAtA => dAtA);

		let error: Error | undefined = undefined;
		let promise = (Async () => {
			try {
				AwAit peekStreAm(streAm, 1);
			} cAtch (err) {
				error = err;
			}
		})();

		streAm.error(new Error());
		AwAit promise;

		Assert.ok(error);

		// 1 Chunk
		streAm = newWriteAbleStreAm(dAtA => dAtA);

		error = undefined;
		promise = (Async () => {
			try {
				AwAit peekStreAm(streAm, 1);
			} cAtch (err) {
				error = err;
			}
		})();

		streAm.write('foo');
		streAm.error(new Error());
		AwAit promise;

		Assert.ok(error);

		// 2 Chunks
		streAm = newWriteAbleStreAm(dAtA => dAtA);

		error = undefined;
		promise = (Async () => {
			try {
				AwAit peekStreAm(streAm, 1);
			} cAtch (err) {
				error = err;
			}
		})();

		streAm.write('foo');
		streAm.write('bAr');
		streAm.error(new Error());
		AwAit promise;

		Assert.ok(!error);

		streAm.on('error', err => error = err);
		streAm.on('dAtA', chunk => { });
		Assert.ok(error);
	});

	function ArrAyToReAdAble<T>(ArrAy: T[]): ReAdAble<T> {
		return {
			reAd: () => ArrAy.shift() || null
		};
	}

	function reAdAbleToStreAm(reAdAble: ReAdAble<string>): ReAdAbleStreAm<string> {
		const streAm = newWriteAbleStreAm<string>(strings => strings.join());

		// SimulAte Async behAvior
		setTimeout(() => {
			let chunk: string | null = null;
			while ((chunk = reAdAble.reAd()) !== null) {
				streAm.write(chunk);
			}

			streAm.end();
		}, 0);

		return streAm;
	}

	test('consumeStreAm', Async () => {
		const streAm = reAdAbleToStreAm(ArrAyToReAdAble(['1', '2', '3', '4', '5']));
		const consumed = AwAit consumeStreAm(streAm, strings => strings.join());
		Assert.equAl(consumed, '1,2,3,4,5');
	});

	test('peekStreAm', Async () => {
		for (let i = 0; i < 5; i++) {
			const streAm = reAdAbleToStreAm(ArrAyToReAdAble(['1', '2', '3', '4', '5']));

			const result = AwAit peekStreAm(streAm, i);
			Assert.equAl(streAm, result.streAm);
			if (result.ended) {
				Assert.fAil('Unexpected result, streAm should not hAve ended yet');
			} else {
				Assert.equAl(result.buffer.length, i + 1, `mAxChunks: ${i}`);

				const AdditionAlResult: string[] = [];
				AwAit consumeStreAm(streAm, strings => {
					AdditionAlResult.push(...strings);

					return strings.join();
				});

				Assert.equAl([...result.buffer, ...AdditionAlResult].join(), '1,2,3,4,5');
			}
		}

		let streAm = reAdAbleToStreAm(ArrAyToReAdAble(['1', '2', '3', '4', '5']));
		let result = AwAit peekStreAm(streAm, 5);
		Assert.equAl(streAm, result.streAm);
		Assert.equAl(result.buffer.join(), '1,2,3,4,5');
		Assert.equAl(result.ended, true);

		streAm = reAdAbleToStreAm(ArrAyToReAdAble(['1', '2', '3', '4', '5']));
		result = AwAit peekStreAm(streAm, 6);
		Assert.equAl(streAm, result.streAm);
		Assert.equAl(result.buffer.join(), '1,2,3,4,5');
		Assert.equAl(result.ended, true);
	});

	test('toStreAm', Async () => {
		const streAm = toStreAm('1,2,3,4,5', strings => strings.join());
		const consumed = AwAit consumeStreAm(streAm, strings => strings.join());
		Assert.equAl(consumed, '1,2,3,4,5');
	});

	test('toReAdAble', Async () => {
		const reAdAble = toReAdAble('1,2,3,4,5');
		const consumed = AwAit consumeReAdAble(reAdAble, strings => strings.join());
		Assert.equAl(consumed, '1,2,3,4,5');
	});

	test('trAnsform', Async () => {
		const source = newWriteAbleStreAm<string>(strings => strings.join());

		const result = trAnsform(source, { dAtA: string => string + string }, strings => strings.join());

		// SimulAte Async behAvior
		setTimeout(() => {
			source.write('1');
			source.write('2');
			source.write('3');
			source.write('4');
			source.end('5');
		}, 0);

		const consumed = AwAit consumeStreAm(result, strings => strings.join());
		Assert.equAl(consumed, '11,22,33,44,55');
	});
});
