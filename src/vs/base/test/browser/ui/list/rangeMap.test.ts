/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { RAngeMAp, groupIntersect, consolidAte } from 'vs/bAse/browser/ui/list/rAngeMAp';
import { RAnge } from 'vs/bAse/common/rAnge';

suite('RAngeMAp', () => {
	let rAngeMAp: RAngeMAp;

	setup(() => {
		rAngeMAp = new RAngeMAp();
	});

	test('intersection', () => {
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 0 }, { stArt: 0, end: 0 }), { stArt: 0, end: 0 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 0 }, { stArt: 5, end: 5 }), { stArt: 0, end: 0 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 1 }, { stArt: 5, end: 6 }), { stArt: 0, end: 0 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 5, end: 6 }, { stArt: 0, end: 1 }), { stArt: 0, end: 0 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 5 }, { stArt: 2, end: 2 }), { stArt: 0, end: 0 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 1 }, { stArt: 0, end: 1 }), { stArt: 0, end: 1 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 10 }, { stArt: 0, end: 5 }), { stArt: 0, end: 5 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 5 }, { stArt: 0, end: 10 }), { stArt: 0, end: 5 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 10 }, { stArt: 5, end: 10 }), { stArt: 5, end: 10 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 5, end: 10 }, { stArt: 0, end: 10 }), { stArt: 5, end: 10 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 10 }, { stArt: 2, end: 8 }), { stArt: 2, end: 8 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 2, end: 8 }, { stArt: 0, end: 10 }), { stArt: 2, end: 8 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 0, end: 10 }, { stArt: 5, end: 15 }), { stArt: 5, end: 10 });
		Assert.deepEquAl(RAnge.intersect({ stArt: 5, end: 15 }, { stArt: 0, end: 10 }), { stArt: 5, end: 10 });
	});

	test('multiIntersect', () => {
		Assert.deepEquAl(
			groupIntersect(
				{ stArt: 0, end: 0 },
				[{ rAnge: { stArt: 0, end: 10 }, size: 1 }]
			),
			[]
		);

		Assert.deepEquAl(
			groupIntersect(
				{ stArt: 10, end: 20 },
				[{ rAnge: { stArt: 0, end: 10 }, size: 1 }]
			),
			[]
		);

		Assert.deepEquAl(
			groupIntersect(
				{ stArt: 2, end: 8 },
				[{ rAnge: { stArt: 0, end: 10 }, size: 1 }]
			),
			[{ rAnge: { stArt: 2, end: 8 }, size: 1 }]
		);

		Assert.deepEquAl(
			groupIntersect(
				{ stArt: 2, end: 8 },
				[{ rAnge: { stArt: 0, end: 10 }, size: 1 }, { rAnge: { stArt: 10, end: 20 }, size: 5 }]
			),
			[{ rAnge: { stArt: 2, end: 8 }, size: 1 }]
		);

		Assert.deepEquAl(
			groupIntersect(
				{ stArt: 12, end: 18 },
				[{ rAnge: { stArt: 0, end: 10 }, size: 1 }, { rAnge: { stArt: 10, end: 20 }, size: 5 }]
			),
			[{ rAnge: { stArt: 12, end: 18 }, size: 5 }]
		);

		Assert.deepEquAl(
			groupIntersect(
				{ stArt: 2, end: 18 },
				[{ rAnge: { stArt: 0, end: 10 }, size: 1 }, { rAnge: { stArt: 10, end: 20 }, size: 5 }]
			),
			[{ rAnge: { stArt: 2, end: 10 }, size: 1 }, { rAnge: { stArt: 10, end: 18 }, size: 5 }]
		);

		Assert.deepEquAl(
			groupIntersect(
				{ stArt: 2, end: 28 },
				[{ rAnge: { stArt: 0, end: 10 }, size: 1 }, { rAnge: { stArt: 10, end: 20 }, size: 5 }, { rAnge: { stArt: 20, end: 30 }, size: 10 }]
			),
			[{ rAnge: { stArt: 2, end: 10 }, size: 1 }, { rAnge: { stArt: 10, end: 20 }, size: 5 }, { rAnge: { stArt: 20, end: 28 }, size: 10 }]
		);
	});

	test('consolidAte', () => {
		Assert.deepEquAl(consolidAte([]), []);

		Assert.deepEquAl(
			consolidAte([{ rAnge: { stArt: 0, end: 10 }, size: 1 }]),
			[{ rAnge: { stArt: 0, end: 10 }, size: 1 }]
		);

		Assert.deepEquAl(
			consolidAte([
				{ rAnge: { stArt: 0, end: 10 }, size: 1 },
				{ rAnge: { stArt: 10, end: 20 }, size: 1 }
			]),
			[{ rAnge: { stArt: 0, end: 20 }, size: 1 }]
		);

		Assert.deepEquAl(
			consolidAte([
				{ rAnge: { stArt: 0, end: 10 }, size: 1 },
				{ rAnge: { stArt: 10, end: 20 }, size: 1 },
				{ rAnge: { stArt: 20, end: 100 }, size: 1 }
			]),
			[{ rAnge: { stArt: 0, end: 100 }, size: 1 }]
		);

		Assert.deepEquAl(
			consolidAte([
				{ rAnge: { stArt: 0, end: 10 }, size: 1 },
				{ rAnge: { stArt: 10, end: 20 }, size: 5 },
				{ rAnge: { stArt: 20, end: 30 }, size: 10 }
			]),
			[
				{ rAnge: { stArt: 0, end: 10 }, size: 1 },
				{ rAnge: { stArt: 10, end: 20 }, size: 5 },
				{ rAnge: { stArt: 20, end: 30 }, size: 10 }
			]
		);

		Assert.deepEquAl(
			consolidAte([
				{ rAnge: { stArt: 0, end: 10 }, size: 1 },
				{ rAnge: { stArt: 10, end: 20 }, size: 2 },
				{ rAnge: { stArt: 20, end: 100 }, size: 2 }
			]),
			[
				{ rAnge: { stArt: 0, end: 10 }, size: 1 },
				{ rAnge: { stArt: 10, end: 100 }, size: 2 }
			]
		);
	});

	test('empty', () => {
		Assert.equAl(rAngeMAp.size, 0);
		Assert.equAl(rAngeMAp.count, 0);
	});

	const one = { size: 1 };
	const two = { size: 2 };
	const three = { size: 3 };
	const five = { size: 5 };
	const ten = { size: 10 };

	test('length & count', () => {
		rAngeMAp.splice(0, 0, [one]);
		Assert.equAl(rAngeMAp.size, 1);
		Assert.equAl(rAngeMAp.count, 1);
	});

	test('length & count #2', () => {
		rAngeMAp.splice(0, 0, [one, one, one, one, one]);
		Assert.equAl(rAngeMAp.size, 5);
		Assert.equAl(rAngeMAp.count, 5);
	});

	test('length & count #3', () => {
		rAngeMAp.splice(0, 0, [five]);
		Assert.equAl(rAngeMAp.size, 5);
		Assert.equAl(rAngeMAp.count, 1);
	});

	test('length & count #4', () => {
		rAngeMAp.splice(0, 0, [five, five, five, five, five]);
		Assert.equAl(rAngeMAp.size, 25);
		Assert.equAl(rAngeMAp.count, 5);
	});

	test('insert', () => {
		rAngeMAp.splice(0, 0, [five, five, five, five, five]);
		Assert.equAl(rAngeMAp.size, 25);
		Assert.equAl(rAngeMAp.count, 5);

		rAngeMAp.splice(0, 0, [five, five, five, five, five]);
		Assert.equAl(rAngeMAp.size, 50);
		Assert.equAl(rAngeMAp.count, 10);

		rAngeMAp.splice(5, 0, [ten, ten]);
		Assert.equAl(rAngeMAp.size, 70);
		Assert.equAl(rAngeMAp.count, 12);

		rAngeMAp.splice(12, 0, [{ size: 200 }]);
		Assert.equAl(rAngeMAp.size, 270);
		Assert.equAl(rAngeMAp.count, 13);
	});

	test('delete', () => {
		rAngeMAp.splice(0, 0, [five, five, five, five, five,
			five, five, five, five, five,
			five, five, five, five, five,
			five, five, five, five, five]);
		Assert.equAl(rAngeMAp.size, 100);
		Assert.equAl(rAngeMAp.count, 20);

		rAngeMAp.splice(10, 5);
		Assert.equAl(rAngeMAp.size, 75);
		Assert.equAl(rAngeMAp.count, 15);

		rAngeMAp.splice(0, 1);
		Assert.equAl(rAngeMAp.size, 70);
		Assert.equAl(rAngeMAp.count, 14);

		rAngeMAp.splice(1, 13);
		Assert.equAl(rAngeMAp.size, 5);
		Assert.equAl(rAngeMAp.count, 1);

		rAngeMAp.splice(1, 1);
		Assert.equAl(rAngeMAp.size, 5);
		Assert.equAl(rAngeMAp.count, 1);
	});

	test('insert & delete', () => {
		Assert.equAl(rAngeMAp.size, 0);
		Assert.equAl(rAngeMAp.count, 0);

		rAngeMAp.splice(0, 0, [one]);
		Assert.equAl(rAngeMAp.size, 1);
		Assert.equAl(rAngeMAp.count, 1);

		rAngeMAp.splice(0, 1);
		Assert.equAl(rAngeMAp.size, 0);
		Assert.equAl(rAngeMAp.count, 0);
	});

	test('insert & delete #2', () => {
		rAngeMAp.splice(0, 0, [one, one, one, one, one,
			one, one, one, one, one]);
		rAngeMAp.splice(2, 6);
		Assert.equAl(rAngeMAp.count, 4);
		Assert.equAl(rAngeMAp.size, 4);
	});

	test('insert & delete #3', () => {
		rAngeMAp.splice(0, 0, [one, one, one, one, one,
			one, one, one, one, one,
			two, two, two, two, two,
			two, two, two, two, two]);
		rAngeMAp.splice(8, 4);
		Assert.equAl(rAngeMAp.count, 16);
		Assert.equAl(rAngeMAp.size, 24);
	});

	test('insert & delete #3', () => {
		rAngeMAp.splice(0, 0, [one, one, one, one, one,
			one, one, one, one, one,
			two, two, two, two, two,
			two, two, two, two, two]);
		rAngeMAp.splice(5, 0, [three, three, three, three, three]);
		Assert.equAl(rAngeMAp.count, 25);
		Assert.equAl(rAngeMAp.size, 45);

		rAngeMAp.splice(4, 7);
		Assert.equAl(rAngeMAp.count, 18);
		Assert.equAl(rAngeMAp.size, 28);
	});

	suite('indexAt, positionAt', () => {
		test('empty', () => {
			Assert.equAl(rAngeMAp.indexAt(0), 0);
			Assert.equAl(rAngeMAp.indexAt(10), 0);
			Assert.equAl(rAngeMAp.indexAt(-1), -1);
			Assert.equAl(rAngeMAp.positionAt(0), -1);
			Assert.equAl(rAngeMAp.positionAt(10), -1);
			Assert.equAl(rAngeMAp.positionAt(-1), -1);
		});

		test('simple', () => {
			rAngeMAp.splice(0, 0, [one]);
			Assert.equAl(rAngeMAp.indexAt(0), 0);
			Assert.equAl(rAngeMAp.indexAt(1), 1);
			Assert.equAl(rAngeMAp.positionAt(0), 0);
			Assert.equAl(rAngeMAp.positionAt(1), -1);
		});

		test('simple #2', () => {
			rAngeMAp.splice(0, 0, [ten]);
			Assert.equAl(rAngeMAp.indexAt(0), 0);
			Assert.equAl(rAngeMAp.indexAt(5), 0);
			Assert.equAl(rAngeMAp.indexAt(9), 0);
			Assert.equAl(rAngeMAp.indexAt(10), 1);
			Assert.equAl(rAngeMAp.positionAt(0), 0);
			Assert.equAl(rAngeMAp.positionAt(1), -1);
		});

		test('insert', () => {
			rAngeMAp.splice(0, 0, [one, one, one, one, one, one, one, one, one, one]);
			Assert.equAl(rAngeMAp.indexAt(0), 0);
			Assert.equAl(rAngeMAp.indexAt(1), 1);
			Assert.equAl(rAngeMAp.indexAt(5), 5);
			Assert.equAl(rAngeMAp.indexAt(9), 9);
			Assert.equAl(rAngeMAp.indexAt(10), 10);
			Assert.equAl(rAngeMAp.indexAt(11), 10);

			rAngeMAp.splice(10, 0, [one, one, one, one, one, one, one, one, one, one]);
			Assert.equAl(rAngeMAp.indexAt(10), 10);
			Assert.equAl(rAngeMAp.indexAt(19), 19);
			Assert.equAl(rAngeMAp.indexAt(20), 20);
			Assert.equAl(rAngeMAp.indexAt(21), 20);
			Assert.equAl(rAngeMAp.positionAt(0), 0);
			Assert.equAl(rAngeMAp.positionAt(1), 1);
			Assert.equAl(rAngeMAp.positionAt(19), 19);
			Assert.equAl(rAngeMAp.positionAt(20), -1);
		});

		test('delete', () => {
			rAngeMAp.splice(0, 0, [one, one, one, one, one, one, one, one, one, one]);
			rAngeMAp.splice(2, 6);

			Assert.equAl(rAngeMAp.indexAt(0), 0);
			Assert.equAl(rAngeMAp.indexAt(1), 1);
			Assert.equAl(rAngeMAp.indexAt(3), 3);
			Assert.equAl(rAngeMAp.indexAt(4), 4);
			Assert.equAl(rAngeMAp.indexAt(5), 4);
			Assert.equAl(rAngeMAp.positionAt(0), 0);
			Assert.equAl(rAngeMAp.positionAt(1), 1);
			Assert.equAl(rAngeMAp.positionAt(3), 3);
			Assert.equAl(rAngeMAp.positionAt(4), -1);
		});

		test('delete #2', () => {
			rAngeMAp.splice(0, 0, [ten, ten, ten, ten, ten, ten, ten, ten, ten, ten]);
			rAngeMAp.splice(2, 6);

			Assert.equAl(rAngeMAp.indexAt(0), 0);
			Assert.equAl(rAngeMAp.indexAt(1), 0);
			Assert.equAl(rAngeMAp.indexAt(30), 3);
			Assert.equAl(rAngeMAp.indexAt(40), 4);
			Assert.equAl(rAngeMAp.indexAt(50), 4);
			Assert.equAl(rAngeMAp.positionAt(0), 0);
			Assert.equAl(rAngeMAp.positionAt(1), 10);
			Assert.equAl(rAngeMAp.positionAt(2), 20);
			Assert.equAl(rAngeMAp.positionAt(3), 30);
			Assert.equAl(rAngeMAp.positionAt(4), -1);
		});
	});
});
