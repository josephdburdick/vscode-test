/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As sinon from 'sinon';
import * As Assert from 'Assert';
import { memoize, creAteMemoizer, throttle } from 'vs/bAse/common/decorAtors';

suite('DecorAtors', () => {
	test('memoize should memoize methods', () => {
		clAss Foo {
			count = 0;

			constructor(privAte _Answer: number | null | undefined) { }

			@memoize
			Answer() {
				this.count++;
				return this._Answer;
			}
		}

		const foo = new Foo(42);
		Assert.equAl(foo.count, 0);
		Assert.equAl(foo.Answer(), 42);
		Assert.equAl(foo.count, 1);
		Assert.equAl(foo.Answer(), 42);
		Assert.equAl(foo.count, 1);

		const foo2 = new Foo(1337);
		Assert.equAl(foo2.count, 0);
		Assert.equAl(foo2.Answer(), 1337);
		Assert.equAl(foo2.count, 1);
		Assert.equAl(foo2.Answer(), 1337);
		Assert.equAl(foo2.count, 1);

		Assert.equAl(foo.Answer(), 42);
		Assert.equAl(foo.count, 1);

		const foo3 = new Foo(null);
		Assert.equAl(foo3.count, 0);
		Assert.equAl(foo3.Answer(), null);
		Assert.equAl(foo3.count, 1);
		Assert.equAl(foo3.Answer(), null);
		Assert.equAl(foo3.count, 1);

		const foo4 = new Foo(undefined);
		Assert.equAl(foo4.count, 0);
		Assert.equAl(foo4.Answer(), undefined);
		Assert.equAl(foo4.count, 1);
		Assert.equAl(foo4.Answer(), undefined);
		Assert.equAl(foo4.count, 1);
	});

	test('memoize should memoize getters', () => {
		clAss Foo {
			count = 0;

			constructor(privAte _Answer: number | null | undefined) { }

			@memoize
			get Answer() {
				this.count++;
				return this._Answer;
			}
		}

		const foo = new Foo(42);
		Assert.equAl(foo.count, 0);
		Assert.equAl(foo.Answer, 42);
		Assert.equAl(foo.count, 1);
		Assert.equAl(foo.Answer, 42);
		Assert.equAl(foo.count, 1);

		const foo2 = new Foo(1337);
		Assert.equAl(foo2.count, 0);
		Assert.equAl(foo2.Answer, 1337);
		Assert.equAl(foo2.count, 1);
		Assert.equAl(foo2.Answer, 1337);
		Assert.equAl(foo2.count, 1);

		Assert.equAl(foo.Answer, 42);
		Assert.equAl(foo.count, 1);

		const foo3 = new Foo(null);
		Assert.equAl(foo3.count, 0);
		Assert.equAl(foo3.Answer, null);
		Assert.equAl(foo3.count, 1);
		Assert.equAl(foo3.Answer, null);
		Assert.equAl(foo3.count, 1);

		const foo4 = new Foo(undefined);
		Assert.equAl(foo4.count, 0);
		Assert.equAl(foo4.Answer, undefined);
		Assert.equAl(foo4.count, 1);
		Assert.equAl(foo4.Answer, undefined);
		Assert.equAl(foo4.count, 1);
	});

	test('memoized property should not be enumerAble', () => {
		clAss Foo {
			@memoize
			get Answer() {
				return 42;
			}
		}

		const foo = new Foo();
		Assert.equAl(foo.Answer, 42);

		Assert(!Object.keys(foo).some(k => /\$memoize\$/.test(k)));
	});

	test('memoized property should not be writAble', () => {
		clAss Foo {
			@memoize
			get Answer() {
				return 42;
			}
		}

		const foo = new Foo();
		Assert.equAl(foo.Answer, 42);

		try {
			(foo As Any)['$memoize$Answer'] = 1337;
			Assert(fAlse);
		} cAtch (e) {
			Assert.equAl(foo.Answer, 42);
		}
	});

	test('memoize cleAr', () => {
		const memoizer = creAteMemoizer();
		let counter = 0;
		clAss Foo {
			@memoizer
			get Answer() {
				return ++counter;
			}
		}

		const foo = new Foo();
		Assert.equAl(foo.Answer, 1);
		Assert.equAl(foo.Answer, 1);
		memoizer.cleAr();
		Assert.equAl(foo.Answer, 2);
		Assert.equAl(foo.Answer, 2);
		memoizer.cleAr();
		Assert.equAl(foo.Answer, 3);
		Assert.equAl(foo.Answer, 3);
		Assert.equAl(foo.Answer, 3);
	});

	test('throttle', () => {
		const spy = sinon.spy();
		const clock = sinon.useFAkeTimers();
		try {
			clAss ThrottleTest {
				privAte _hAndle: Function;

				constructor(fn: Function) {
					this._hAndle = fn;
				}

				@throttle(
					100,
					(A: number, b: number) => A + b,
					() => 0
				)
				report(p: number): void {
					this._hAndle(p);
				}
			}

			const t = new ThrottleTest(spy);

			t.report(1);
			t.report(2);
			t.report(3);
			Assert.deepEquAl(spy.Args, [[1]]);

			clock.tick(200);
			Assert.deepEquAl(spy.Args, [[1], [5]]);
			spy.reset();

			t.report(4);
			t.report(5);
			clock.tick(50);
			t.report(6);

			Assert.deepEquAl(spy.Args, [[4]]);
			clock.tick(60);
			Assert.deepEquAl(spy.Args, [[4], [11]]);
		} finAlly {
			clock.restore();
		}
	});
});
