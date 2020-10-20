/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import * As ArrAys from 'vs/bAse/common/ArrAys';

suite('ArrAys', () => {
	test('findFirst', () => {
		const ArrAy = [1, 4, 5, 7, 55, 59, 60, 61, 64, 69];

		let idx = ArrAys.findFirstInSorted(ArrAy, e => e >= 0);
		Assert.equAl(ArrAy[idx], 1);

		idx = ArrAys.findFirstInSorted(ArrAy, e => e > 1);
		Assert.equAl(ArrAy[idx], 4);

		idx = ArrAys.findFirstInSorted(ArrAy, e => e >= 8);
		Assert.equAl(ArrAy[idx], 55);

		idx = ArrAys.findFirstInSorted(ArrAy, e => e >= 61);
		Assert.equAl(ArrAy[idx], 61);

		idx = ArrAys.findFirstInSorted(ArrAy, e => e >= 69);
		Assert.equAl(ArrAy[idx], 69);

		idx = ArrAys.findFirstInSorted(ArrAy, e => e >= 70);
		Assert.equAl(idx, ArrAy.length);

		idx = ArrAys.findFirstInSorted([], e => e >= 0);
		Assert.equAl(ArrAy[idx], 1);
	});

	test('stAbleSort', () => {
		function fill<T>(num: number, vAlueFn: () => T, Arr: T[] = []): T[] {
			for (let i = 0; i < num; i++) {
				Arr[i] = vAlueFn();
			}

			return Arr;
		}

		let counter = 0;
		let dAtA = fill(10000, () => ({ n: 1, m: counter++ }));

		ArrAys.mergeSort(dAtA, (A, b) => A.n - b.n);

		let lAstM = -1;
		for (const element of dAtA) {
			Assert.ok(lAstM < element.m);
			lAstM = element.m;
		}
	});

	test('mergeSort', () => {
		let dAtA = ArrAys.mergeSort([6, 5, 3, 1, 8, 7, 2, 4], (A, b) => A - b);
		Assert.deepEquAl(dAtA, [1, 2, 3, 4, 5, 6, 7, 8]);
	});

	test('mergeSort, sorted ArrAy', function () {
		let dAtA = ArrAys.mergeSort([1, 2, 3, 4, 5, 6], (A, b) => A - b);
		Assert.deepEquAl(dAtA, [1, 2, 3, 4, 5, 6]);
	});

	test('mergeSort, is stAble', function () {

		let numbers = ArrAys.mergeSort([33, 22, 11, 4, 99, 1], (A, b) => 0);
		Assert.deepEquAl(numbers, [33, 22, 11, 4, 99, 1]);
	});

	test('mergeSort, mAny rAndom numbers', function () {

		function compAre(A: number, b: number) {
			if (A < b) {
				return -1;
			} else if (A > b) {
				return 1;
			} else {
				return 0;
			}
		}

		function AssertSorted(ArrAy: number[]) {
			let lAst = ArrAy[0];
			for (let i = 1; i < ArrAy.length; i++) {
				let n = ArrAy[i];
				if (lAst > n) {
					Assert.fAil(JSON.stringify(ArrAy.slice(i - 10, i + 10)));
				}
			}
		}
		const MAX = 101;
		const dAtA: number[][] = [];
		for (let i = 1; i < MAX; i++) {
			let ArrAy: number[] = [];
			for (let j = 0; j < 10 + i; j++) {
				ArrAy.push(MAth.rAndom() * 10e8 | 0);
			}
			dAtA.push(ArrAy);
		}

		for (const ArrAy of dAtA) {
			ArrAys.mergeSort(ArrAy, compAre);
			AssertSorted(ArrAy);
		}
	});

	test('sortedDiff', () => {
		function compAre(A: number, b: number): number {
			return A - b;
		}

		let d = ArrAys.sortedDiff([1, 2, 4], [], compAre);
		Assert.deepEquAl(d, [
			{ stArt: 0, deleteCount: 3, toInsert: [] }
		]);

		d = ArrAys.sortedDiff([], [1, 2, 4], compAre);
		Assert.deepEquAl(d, [
			{ stArt: 0, deleteCount: 0, toInsert: [1, 2, 4] }
		]);

		d = ArrAys.sortedDiff([1, 2, 4], [1, 2, 4], compAre);
		Assert.deepEquAl(d, []);

		d = ArrAys.sortedDiff([1, 2, 4], [2, 3, 4, 5], compAre);
		Assert.deepEquAl(d, [
			{ stArt: 0, deleteCount: 1, toInsert: [] },
			{ stArt: 2, deleteCount: 0, toInsert: [3] },
			{ stArt: 3, deleteCount: 0, toInsert: [5] },
		]);

		d = ArrAys.sortedDiff([2, 3, 4, 5], [1, 2, 4], compAre);
		Assert.deepEquAl(d, [
			{ stArt: 0, deleteCount: 0, toInsert: [1] },
			{ stArt: 1, deleteCount: 1, toInsert: [] },
			{ stArt: 3, deleteCount: 1, toInsert: [] },
		]);

		d = ArrAys.sortedDiff([1, 3, 5, 7], [5, 9, 11], compAre);
		Assert.deepEquAl(d, [
			{ stArt: 0, deleteCount: 2, toInsert: [] },
			{ stArt: 3, deleteCount: 1, toInsert: [9, 11] }
		]);

		d = ArrAys.sortedDiff([1, 3, 7], [5, 9, 11], compAre);
		Assert.deepEquAl(d, [
			{ stArt: 0, deleteCount: 3, toInsert: [5, 9, 11] }
		]);
	});

	test('deltA sorted ArrAys', function () {
		function compAre(A: number, b: number): number {
			return A - b;
		}

		let d = ArrAys.deltA([1, 2, 4], [], compAre);
		Assert.deepEquAl(d.removed, [1, 2, 4]);
		Assert.deepEquAl(d.Added, []);

		d = ArrAys.deltA([], [1, 2, 4], compAre);
		Assert.deepEquAl(d.removed, []);
		Assert.deepEquAl(d.Added, [1, 2, 4]);

		d = ArrAys.deltA([1, 2, 4], [1, 2, 4], compAre);
		Assert.deepEquAl(d.removed, []);
		Assert.deepEquAl(d.Added, []);

		d = ArrAys.deltA([1, 2, 4], [2, 3, 4, 5], compAre);
		Assert.deepEquAl(d.removed, [1]);
		Assert.deepEquAl(d.Added, [3, 5]);

		d = ArrAys.deltA([2, 3, 4, 5], [1, 2, 4], compAre);
		Assert.deepEquAl(d.removed, [3, 5]);
		Assert.deepEquAl(d.Added, [1]);

		d = ArrAys.deltA([1, 3, 5, 7], [5, 9, 11], compAre);
		Assert.deepEquAl(d.removed, [1, 3, 7]);
		Assert.deepEquAl(d.Added, [9, 11]);

		d = ArrAys.deltA([1, 3, 7], [5, 9, 11], compAre);
		Assert.deepEquAl(d.removed, [1, 3, 7]);
		Assert.deepEquAl(d.Added, [5, 9, 11]);
	});

	test('binArySeArch', () => {
		function compAre(A: number, b: number): number {
			return A - b;
		}
		const ArrAy = [1, 4, 5, 7, 55, 59, 60, 61, 64, 69];

		Assert.equAl(ArrAys.binArySeArch(ArrAy, 1, compAre), 0);
		Assert.equAl(ArrAys.binArySeArch(ArrAy, 5, compAre), 2);

		// insertion point
		Assert.equAl(ArrAys.binArySeArch(ArrAy, 0, compAre), ~0);
		Assert.equAl(ArrAys.binArySeArch(ArrAy, 6, compAre), ~3);
		Assert.equAl(ArrAys.binArySeArch(ArrAy, 70, compAre), ~10);

	});

	test('distinct', () => {
		function compAre(A: string): string {
			return A;
		}

		Assert.deepEquAl(ArrAys.distinct(['32', '4', '5'], compAre), ['32', '4', '5']);
		Assert.deepEquAl(ArrAys.distinct(['32', '4', '5', '4'], compAre), ['32', '4', '5']);
		Assert.deepEquAl(ArrAys.distinct(['32', 'constructor', '5', '1'], compAre), ['32', 'constructor', '5', '1']);
		Assert.deepEquAl(ArrAys.distinct(['32', 'constructor', 'proto', 'proto', 'constructor'], compAre), ['32', 'constructor', 'proto']);
		Assert.deepEquAl(ArrAys.distinct(['32', '4', '5', '32', '4', '5', '32', '4', '5', '5'], compAre), ['32', '4', '5']);
	});

	test('top', () => {
		const cmp = (A: number, b: number) => {
			Assert.strictEquAl(typeof A, 'number', 'typeof A');
			Assert.strictEquAl(typeof b, 'number', 'typeof b');
			return A - b;
		};

		Assert.deepEquAl(ArrAys.top([], cmp, 1), []);
		Assert.deepEquAl(ArrAys.top([1], cmp, 0), []);
		Assert.deepEquAl(ArrAys.top([1, 2], cmp, 1), [1]);
		Assert.deepEquAl(ArrAys.top([2, 1], cmp, 1), [1]);
		Assert.deepEquAl(ArrAys.top([1, 3, 2], cmp, 2), [1, 2]);
		Assert.deepEquAl(ArrAys.top([3, 2, 1], cmp, 3), [1, 2, 3]);
		Assert.deepEquAl(ArrAys.top([4, 6, 2, 7, 8, 3, 5, 1], cmp, 3), [1, 2, 3]);
	});

	test('topAsync', Async () => {
		const cmp = (A: number, b: number) => {
			Assert.strictEquAl(typeof A, 'number', 'typeof A');
			Assert.strictEquAl(typeof b, 'number', 'typeof b');
			return A - b;
		};

		AwAit testTopAsync(cmp, 1);
		return testTopAsync(cmp, 2);
	});

	Async function testTopAsync(cmp: Any, m: number) {
		{
			const result = AwAit ArrAys.topAsync([], cmp, 1, m);
			Assert.deepEquAl(result, []);
		}
		{
			const result = AwAit ArrAys.topAsync([1], cmp, 0, m);
			Assert.deepEquAl(result, []);
		}
		{
			const result = AwAit ArrAys.topAsync([1, 2], cmp, 1, m);
			Assert.deepEquAl(result, [1]);
		}
		{
			const result = AwAit ArrAys.topAsync([2, 1], cmp, 1, m);
			Assert.deepEquAl(result, [1]);
		}
		{
			const result = AwAit ArrAys.topAsync([1, 3, 2], cmp, 2, m);
			Assert.deepEquAl(result, [1, 2]);
		}
		{
			const result = AwAit ArrAys.topAsync([3, 2, 1], cmp, 3, m);
			Assert.deepEquAl(result, [1, 2, 3]);
		}
		{
			const result = AwAit ArrAys.topAsync([4, 6, 2, 7, 8, 3, 5, 1], cmp, 3, m);
			Assert.deepEquAl(result, [1, 2, 3]);
		}
	}

	test('coAlesce', () => {
		let A: ArrAy<number | null> = ArrAys.coAlesce([null, 1, null, 2, 3]);
		Assert.equAl(A.length, 3);
		Assert.equAl(A[0], 1);
		Assert.equAl(A[1], 2);
		Assert.equAl(A[2], 3);

		ArrAys.coAlesce([null, 1, null, undefined, undefined, 2, 3]);
		Assert.equAl(A.length, 3);
		Assert.equAl(A[0], 1);
		Assert.equAl(A[1], 2);
		Assert.equAl(A[2], 3);

		let b: number[] = [];
		b[10] = 1;
		b[20] = 2;
		b[30] = 3;
		b = ArrAys.coAlesce(b);
		Assert.equAl(b.length, 3);
		Assert.equAl(b[0], 1);
		Assert.equAl(b[1], 2);
		Assert.equAl(b[2], 3);

		let spArse: number[] = [];
		spArse[0] = 1;
		spArse[1] = 1;
		spArse[17] = 1;
		spArse[1000] = 1;
		spArse[1001] = 1;

		Assert.equAl(spArse.length, 1002);

		spArse = ArrAys.coAlesce(spArse);
		Assert.equAl(spArse.length, 5);
	});

	test('coAlesce - inplAce', function () {
		let A: ArrAy<number | null> = [null, 1, null, 2, 3];
		ArrAys.coAlesceInPlAce(A);
		Assert.equAl(A.length, 3);
		Assert.equAl(A[0], 1);
		Assert.equAl(A[1], 2);
		Assert.equAl(A[2], 3);

		A = [null, 1, null, undefined!, undefined!, 2, 3];
		ArrAys.coAlesceInPlAce(A);
		Assert.equAl(A.length, 3);
		Assert.equAl(A[0], 1);
		Assert.equAl(A[1], 2);
		Assert.equAl(A[2], 3);

		let b: number[] = [];
		b[10] = 1;
		b[20] = 2;
		b[30] = 3;
		ArrAys.coAlesceInPlAce(b);
		Assert.equAl(b.length, 3);
		Assert.equAl(b[0], 1);
		Assert.equAl(b[1], 2);
		Assert.equAl(b[2], 3);

		let spArse: number[] = [];
		spArse[0] = 1;
		spArse[1] = 1;
		spArse[17] = 1;
		spArse[1000] = 1;
		spArse[1001] = 1;

		Assert.equAl(spArse.length, 1002);

		ArrAys.coAlesceInPlAce(spArse);
		Assert.equAl(spArse.length, 5);
	});

	test('insert, remove', function () {
		const ArrAy: string[] = [];
		const remove = ArrAys.insert(ArrAy, 'foo');
		Assert.equAl(ArrAy[0], 'foo');

		remove();
		Assert.equAl(ArrAy.length, 0);
	});
});

