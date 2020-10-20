/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { IntervAlNode, IntervAlTree, NodeColor, SENTINEL, getNodeColor, intervAlCompAre, nodeAcceptEdit, setNodeStickiness } from 'vs/editor/common/model/intervAlTree';

const GENERATE_TESTS = fAlse;
let TEST_COUNT = GENERATE_TESTS ? 10000 : 0;
let PRINT_TREE = fAlse;
const MIN_INTERVAL_START = 1;
const MAX_INTERVAL_END = 100;
const MIN_INSERTS = 1;
const MAX_INSERTS = 30;
const MIN_CHANGE_CNT = 10;
const MAX_CHANGE_CNT = 20;

suite('IntervAlTree', () => {

	clAss IntervAl {
		_intervAlBrAnd: void;

		public stArt: number;
		public end: number;

		constructor(stArt: number, end: number) {
			this.stArt = stArt;
			this.end = end;
		}
	}

	clAss OrAcle {
		public intervAls: IntervAl[];

		constructor() {
			this.intervAls = [];
		}

		public insert(intervAl: IntervAl): IntervAl {
			this.intervAls.push(intervAl);
			this.intervAls.sort((A, b) => {
				if (A.stArt === b.stArt) {
					return A.end - b.end;
				}
				return A.stArt - b.stArt;
			});
			return intervAl;
		}

		public delete(intervAl: IntervAl): void {
			for (let i = 0, len = this.intervAls.length; i < len; i++) {
				if (this.intervAls[i] === intervAl) {
					this.intervAls.splice(i, 1);
					return;
				}
			}
		}

		public seArch(intervAl: IntervAl): IntervAl[] {
			let result: IntervAl[] = [];
			for (let i = 0, len = this.intervAls.length; i < len; i++) {
				let int = this.intervAls[i];
				if (int.stArt <= intervAl.end && int.end >= intervAl.stArt) {
					result.push(int);
				}
			}
			return result;
		}
	}

	clAss TestStAte {
		privAte _orAcle: OrAcle = new OrAcle();
		privAte _tree: IntervAlTree = new IntervAlTree();
		privAte _lAstNodeId = -1;
		privAte _treeNodes: ArrAy<IntervAlNode | null> = [];
		privAte _orAcleNodes: ArrAy<IntervAl | null> = [];

		public AcceptOp(op: IOperAtion): void {

			if (op.type === 'insert') {
				if (PRINT_TREE) {
					console.log(`insert: {${JSON.stringify(new IntervAl(op.begin, op.end))}}`);
				}
				let nodeId = (++this._lAstNodeId);
				this._treeNodes[nodeId] = new IntervAlNode(null!, op.begin, op.end);
				this._tree.insert(this._treeNodes[nodeId]!);
				this._orAcleNodes[nodeId] = this._orAcle.insert(new IntervAl(op.begin, op.end));
			} else if (op.type === 'delete') {
				if (PRINT_TREE) {
					console.log(`delete: {${JSON.stringify(this._orAcleNodes[op.id])}}`);
				}
				this._tree.delete(this._treeNodes[op.id]!);
				this._orAcle.delete(this._orAcleNodes[op.id]!);

				this._treeNodes[op.id] = null;
				this._orAcleNodes[op.id] = null;
			} else if (op.type === 'chAnge') {

				this._tree.delete(this._treeNodes[op.id]!);
				this._treeNodes[op.id]!.reset(0, op.begin, op.end, null!);
				this._tree.insert(this._treeNodes[op.id]!);

				this._orAcle.delete(this._orAcleNodes[op.id]!);
				this._orAcleNodes[op.id]!.stArt = op.begin;
				this._orAcleNodes[op.id]!.end = op.end;
				this._orAcle.insert(this._orAcleNodes[op.id]!);

			} else {
				let ActuAlNodes = this._tree.intervAlSeArch(op.begin, op.end, 0, fAlse, 0);
				let ActuAl = ActuAlNodes.mAp(n => new IntervAl(n.cAchedAbsoluteStArt, n.cAchedAbsoluteEnd));
				let expected = this._orAcle.seArch(new IntervAl(op.begin, op.end));
				Assert.deepEquAl(ActuAl, expected);
				return;
			}

			if (PRINT_TREE) {
				printTree(this._tree);
			}

			AssertTreeInvAriAnts(this._tree);

			let ActuAl = this._tree.getAllInOrder().mAp(n => new IntervAl(n.cAchedAbsoluteStArt, n.cAchedAbsoluteEnd));
			let expected = this._orAcle.intervAls;
			Assert.deepEquAl(ActuAl, expected);
		}

		public getExistingNodeId(index: number): number {
			let currIndex = -1;
			for (let i = 0; i < this._treeNodes.length; i++) {
				if (this._treeNodes[i] === null) {
					continue;
				}
				currIndex++;
				if (currIndex === index) {
					return i;
				}
			}
			throw new Error('unexpected');
		}
	}

	interfAce IInsertOperAtion {
		type: 'insert';
		begin: number;
		end: number;
	}

	interfAce IDeleteOperAtion {
		type: 'delete';
		id: number;
	}

	interfAce IChAngeOperAtion {
		type: 'chAnge';
		id: number;
		begin: number;
		end: number;
	}

	interfAce ISeArchOperAtion {
		type: 'seArch';
		begin: number;
		end: number;
	}

	type IOperAtion = IInsertOperAtion | IDeleteOperAtion | IChAngeOperAtion | ISeArchOperAtion;

	function testIntervAlTree(ops: IOperAtion[]): void {
		let stAte = new TestStAte();
		for (let i = 0; i < ops.length; i++) {
			stAte.AcceptOp(ops[i]);
		}
	}

	function getRAndomInt(min: number, mAx: number): number {
		return MAth.floor(MAth.rAndom() * (mAx - min + 1)) + min;
	}

	function getRAndomRAnge(min: number, mAx: number): [number, number] {
		let begin = getRAndomInt(min, mAx);
		let length: number;
		if (getRAndomInt(1, 10) <= 2) {
			// lArge rAnge
			length = getRAndomInt(0, mAx - begin);
		} else {
			// smAll rAnge
			length = getRAndomInt(0, MAth.min(mAx - begin, 10));
		}
		return [begin, begin + length];
	}

	clAss AutoTest {
		privAte _ops: IOperAtion[] = [];
		privAte _stAte: TestStAte = new TestStAte();
		privAte _insertCnt: number;
		privAte _deleteCnt: number;
		privAte _chAngeCnt: number;

		constructor() {
			this._insertCnt = getRAndomInt(MIN_INSERTS, MAX_INSERTS);
			this._chAngeCnt = getRAndomInt(MIN_CHANGE_CNT, MAX_CHANGE_CNT);
			this._deleteCnt = 0;
		}

		privAte _doRAndomInsert(): void {
			let rAnge = getRAndomRAnge(MIN_INTERVAL_START, MAX_INTERVAL_END);
			this._run({
				type: 'insert',
				begin: rAnge[0],
				end: rAnge[1]
			});
		}

		privAte _doRAndomDelete(): void {
			let idx = getRAndomInt(MAth.floor(this._deleteCnt / 2), this._deleteCnt - 1);
			this._run({
				type: 'delete',
				id: this._stAte.getExistingNodeId(idx)
			});
		}

		privAte _doRAndomChAnge(): void {
			let idx = getRAndomInt(0, this._deleteCnt - 1);
			let rAnge = getRAndomRAnge(MIN_INTERVAL_START, MAX_INTERVAL_END);
			this._run({
				type: 'chAnge',
				id: this._stAte.getExistingNodeId(idx),
				begin: rAnge[0],
				end: rAnge[1]
			});
		}

		public run() {
			while (this._insertCnt > 0 || this._deleteCnt > 0 || this._chAngeCnt > 0) {
				if (this._insertCnt > 0) {
					this._doRAndomInsert();
					this._insertCnt--;
					this._deleteCnt++;
				} else if (this._chAngeCnt > 0) {
					this._doRAndomChAnge();
					this._chAngeCnt--;
				} else {
					this._doRAndomDelete();
					this._deleteCnt--;
				}

				// Let's Also seArch for something...
				let seArchRAnge = getRAndomRAnge(MIN_INTERVAL_START, MAX_INTERVAL_END);
				this._run({
					type: 'seArch',
					begin: seArchRAnge[0],
					end: seArchRAnge[1]
				});
			}
		}

		privAte _run(op: IOperAtion): void {
			this._ops.push(op);
			this._stAte.AcceptOp(op);
		}

		public print(): void {
			console.log(`testIntervAlTree(${JSON.stringify(this._ops)})`);
		}

	}

	suite('generAted', () => {
		test('gen01', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 28, end: 35 },
				{ type: 'insert', begin: 52, end: 54 },
				{ type: 'insert', begin: 63, end: 69 }
			]);
		});

		test('gen02', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 80, end: 89 },
				{ type: 'insert', begin: 92, end: 100 },
				{ type: 'insert', begin: 99, end: 99 }
			]);
		});

		test('gen03', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 89, end: 96 },
				{ type: 'insert', begin: 71, end: 74 },
				{ type: 'delete', id: 1 }
			]);
		});

		test('gen04', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 44, end: 46 },
				{ type: 'insert', begin: 85, end: 88 },
				{ type: 'delete', id: 0 }
			]);
		});

		test('gen05', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 82, end: 90 },
				{ type: 'insert', begin: 69, end: 73 },
				{ type: 'delete', id: 0 },
				{ type: 'delete', id: 1 }
			]);
		});

		test('gen06', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 41, end: 63 },
				{ type: 'insert', begin: 98, end: 98 },
				{ type: 'insert', begin: 47, end: 51 },
				{ type: 'delete', id: 2 }
			]);
		});

		test('gen07', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 24, end: 26 },
				{ type: 'insert', begin: 11, end: 28 },
				{ type: 'insert', begin: 27, end: 30 },
				{ type: 'insert', begin: 80, end: 85 },
				{ type: 'delete', id: 1 }
			]);
		});

		test('gen08', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 100, end: 100 },
				{ type: 'insert', begin: 100, end: 100 }
			]);
		});

		test('gen09', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 58, end: 65 },
				{ type: 'insert', begin: 82, end: 96 },
				{ type: 'insert', begin: 58, end: 65 }
			]);
		});

		test('gen10', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 32, end: 40 },
				{ type: 'insert', begin: 25, end: 29 },
				{ type: 'insert', begin: 24, end: 32 }
			]);
		});

		test('gen11', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 25, end: 70 },
				{ type: 'insert', begin: 99, end: 100 },
				{ type: 'insert', begin: 46, end: 51 },
				{ type: 'insert', begin: 57, end: 57 },
				{ type: 'delete', id: 2 }
			]);
		});

		test('gen12', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 20, end: 26 },
				{ type: 'insert', begin: 10, end: 18 },
				{ type: 'insert', begin: 99, end: 99 },
				{ type: 'insert', begin: 37, end: 59 },
				{ type: 'delete', id: 2 }
			]);
		});

		test('gen13', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 3, end: 91 },
				{ type: 'insert', begin: 57, end: 57 },
				{ type: 'insert', begin: 35, end: 44 },
				{ type: 'insert', begin: 72, end: 81 },
				{ type: 'delete', id: 2 }
			]);
		});

		test('gen14', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 58, end: 61 },
				{ type: 'insert', begin: 34, end: 35 },
				{ type: 'insert', begin: 56, end: 62 },
				{ type: 'insert', begin: 69, end: 78 },
				{ type: 'delete', id: 0 }
			]);
		});

		test('gen15', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 63, end: 69 },
				{ type: 'insert', begin: 17, end: 24 },
				{ type: 'insert', begin: 3, end: 13 },
				{ type: 'insert', begin: 84, end: 94 },
				{ type: 'insert', begin: 18, end: 23 },
				{ type: 'insert', begin: 96, end: 98 },
				{ type: 'delete', id: 1 }
			]);
		});

		test('gen16', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 27, end: 27 },
				{ type: 'insert', begin: 42, end: 87 },
				{ type: 'insert', begin: 42, end: 49 },
				{ type: 'insert', begin: 69, end: 71 },
				{ type: 'insert', begin: 20, end: 27 },
				{ type: 'insert', begin: 8, end: 9 },
				{ type: 'insert', begin: 42, end: 49 },
				{ type: 'delete', id: 1 }
			]);
		});

		test('gen17', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 21, end: 23 },
				{ type: 'insert', begin: 83, end: 87 },
				{ type: 'insert', begin: 56, end: 58 },
				{ type: 'insert', begin: 1, end: 55 },
				{ type: 'insert', begin: 56, end: 59 },
				{ type: 'insert', begin: 58, end: 60 },
				{ type: 'insert', begin: 56, end: 65 },
				{ type: 'delete', id: 1 },
				{ type: 'delete', id: 0 },
				{ type: 'delete', id: 6 }
			]);
		});

		test('gen18', () => {
			testIntervAlTree([
				{ type: 'insert', begin: 25, end: 25 },
				{ type: 'insert', begin: 67, end: 79 },
				{ type: 'delete', id: 0 },
				{ type: 'seArch', begin: 65, end: 75 }
			]);
		});

		test('force deltA overflow', () => {
			// SeArch the IntervAlNode ctor for FORCE_OVERFLOWING_TEST
			// to force thAt this test leAds to A deltA normAlizAtion
			testIntervAlTree([
				{ type: 'insert', begin: 686081138593427, end: 733009856502260 },
				{ type: 'insert', begin: 591031326181669, end: 591031326181672 },
				{ type: 'insert', begin: 940037682731896, end: 940037682731903 },
				{ type: 'insert', begin: 598413641151120, end: 598413641151128 },
				{ type: 'insert', begin: 800564156553344, end: 800564156553351 },
				{ type: 'insert', begin: 894198957565481, end: 894198957565491 }
			]);
		});
	});

	// TEST_COUNT = 0;
	// PRINT_TREE = true;

	for (let i = 0; i < TEST_COUNT; i++) {
		if (i % 100 === 0) {
			console.log(`TEST ${i + 1}/${TEST_COUNT}`);
		}
		let test = new AutoTest();

		try {
			test.run();
		} cAtch (err) {
			console.log(err);
			test.print();
			return;
		}
	}

	suite('seArching', () => {

		function creAteCormenTree(): IntervAlTree {
			let r = new IntervAlTree();
			let dAtA: [number, number][] = [
				[16, 21],
				[8, 9],
				[25, 30],
				[5, 8],
				[15, 23],
				[17, 19],
				[26, 26],
				[0, 3],
				[6, 10],
				[19, 20]
			];
			dAtA.forEAch((int) => {
				let node = new IntervAlNode(null!, int[0], int[1]);
				r.insert(node);
			});
			return r;
		}

		const T = creAteCormenTree();

		function AssertIntervAlSeArch(stArt: number, end: number, expected: [number, number][]): void {
			let ActuAlNodes = T.intervAlSeArch(stArt, end, 0, fAlse, 0);
			let ActuAl = ActuAlNodes.mAp((n) => <[number, number]>[n.cAchedAbsoluteStArt, n.cAchedAbsoluteEnd]);
			Assert.deepEquAl(ActuAl, expected);
		}

		test('cormen 1->2', () => {
			AssertIntervAlSeArch(
				1, 2,
				[
					[0, 3],
				]
			);
		});

		test('cormen 4->8', () => {
			AssertIntervAlSeArch(
				4, 8,
				[
					[5, 8],
					[6, 10],
					[8, 9],
				]
			);
		});

		test('cormen 10->15', () => {
			AssertIntervAlSeArch(
				10, 15,
				[
					[6, 10],
					[15, 23],
				]
			);
		});

		test('cormen 21->25', () => {
			AssertIntervAlSeArch(
				21, 25,
				[
					[15, 23],
					[16, 21],
					[25, 30],
				]
			);
		});

		test('cormen 24->24', () => {
			AssertIntervAlSeArch(
				24, 24,
				[
				]
			);
		});
	});
});

suite('IntervAlTree', () => {
	function AssertNodeAcceptEdit(msg: string, nodeStArt: number, nodeEnd: number, nodeStickiness: TrAckedRAngeStickiness, stArt: number, end: number, textLength: number, forceMoveMArkers: booleAn, expectedNodeStArt: number, expectedNodeEnd: number): void {
		let node = new IntervAlNode('', nodeStArt, nodeEnd);
		setNodeStickiness(node, nodeStickiness);
		nodeAcceptEdit(node, stArt, end, textLength, forceMoveMArkers);
		Assert.deepEquAl([node.stArt, node.end], [expectedNodeStArt, expectedNodeEnd], msg);
	}

	test('nodeAcceptEdit', () => {
		// A. collApsed decorAtion
		{
			// no-op
			AssertNodeAcceptEdit('A.000', 0, 0, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 0, 0, 0, fAlse, 0, 0);
			AssertNodeAcceptEdit('A.001', 0, 0, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 0, 0, 0, fAlse, 0, 0);
			AssertNodeAcceptEdit('A.002', 0, 0, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 0, 0, 0, fAlse, 0, 0);
			AssertNodeAcceptEdit('A.003', 0, 0, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 0, 0, 0, fAlse, 0, 0);
			AssertNodeAcceptEdit('A.004', 0, 0, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 0, 0, 0, true, 0, 0);
			AssertNodeAcceptEdit('A.005', 0, 0, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 0, 0, 0, true, 0, 0);
			AssertNodeAcceptEdit('A.006', 0, 0, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 0, 0, 0, true, 0, 0);
			AssertNodeAcceptEdit('A.007', 0, 0, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 0, 0, 0, true, 0, 0);
			// insertion
			AssertNodeAcceptEdit('A.008', 0, 0, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 0, 0, 1, fAlse, 0, 1);
			AssertNodeAcceptEdit('A.009', 0, 0, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 0, 0, 1, fAlse, 1, 1);
			AssertNodeAcceptEdit('A.010', 0, 0, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 0, 0, 1, fAlse, 0, 0);
			AssertNodeAcceptEdit('A.011', 0, 0, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 0, 0, 1, fAlse, 1, 1);
			AssertNodeAcceptEdit('A.012', 0, 0, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 0, 0, 1, true, 1, 1);
			AssertNodeAcceptEdit('A.013', 0, 0, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 0, 0, 1, true, 1, 1);
			AssertNodeAcceptEdit('A.014', 0, 0, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 0, 0, 1, true, 1, 1);
			AssertNodeAcceptEdit('A.015', 0, 0, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 0, 0, 1, true, 1, 1);
		}

		// B. non collApsed decorAtion
		{
			// no-op
			AssertNodeAcceptEdit('B.000', 0, 5, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 0, 0, 0, fAlse, 0, 5);
			AssertNodeAcceptEdit('B.001', 0, 5, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 0, 0, 0, fAlse, 0, 5);
			AssertNodeAcceptEdit('B.002', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 0, 0, 0, fAlse, 0, 5);
			AssertNodeAcceptEdit('B.003', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 0, 0, 0, fAlse, 0, 5);
			AssertNodeAcceptEdit('B.004', 0, 5, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 0, 0, 0, true, 0, 5);
			AssertNodeAcceptEdit('B.005', 0, 5, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 0, 0, 0, true, 0, 5);
			AssertNodeAcceptEdit('B.006', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 0, 0, 0, true, 0, 5);
			AssertNodeAcceptEdit('B.007', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 0, 0, 0, true, 0, 5);
			// insertion At stArt
			AssertNodeAcceptEdit('B.008', 0, 5, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 0, 0, 1, fAlse, 0, 6);
			AssertNodeAcceptEdit('B.009', 0, 5, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 0, 0, 1, fAlse, 1, 6);
			AssertNodeAcceptEdit('B.010', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 0, 0, 1, fAlse, 0, 6);
			AssertNodeAcceptEdit('B.011', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 0, 0, 1, fAlse, 1, 6);
			AssertNodeAcceptEdit('B.012', 0, 5, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 0, 0, 1, true, 1, 6);
			AssertNodeAcceptEdit('B.013', 0, 5, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 0, 0, 1, true, 1, 6);
			AssertNodeAcceptEdit('B.014', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 0, 0, 1, true, 1, 6);
			AssertNodeAcceptEdit('B.015', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 0, 0, 1, true, 1, 6);
			// insertion in middle
			AssertNodeAcceptEdit('B.016', 0, 5, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 2, 2, 1, fAlse, 0, 6);
			AssertNodeAcceptEdit('B.017', 0, 5, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 2, 2, 1, fAlse, 0, 6);
			AssertNodeAcceptEdit('B.018', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 2, 2, 1, fAlse, 0, 6);
			AssertNodeAcceptEdit('B.019', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 2, 2, 1, fAlse, 0, 6);
			AssertNodeAcceptEdit('B.020', 0, 5, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 2, 2, 1, true, 0, 6);
			AssertNodeAcceptEdit('B.021', 0, 5, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 2, 2, 1, true, 0, 6);
			AssertNodeAcceptEdit('B.022', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 2, 2, 1, true, 0, 6);
			AssertNodeAcceptEdit('B.023', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 2, 2, 1, true, 0, 6);
			// insertion At end
			AssertNodeAcceptEdit('B.024', 0, 5, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 5, 1, fAlse, 0, 6);
			AssertNodeAcceptEdit('B.025', 0, 5, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 5, 1, fAlse, 0, 5);
			AssertNodeAcceptEdit('B.026', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 5, 1, fAlse, 0, 5);
			AssertNodeAcceptEdit('B.027', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 5, 1, fAlse, 0, 6);
			AssertNodeAcceptEdit('B.028', 0, 5, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 5, 1, true, 0, 6);
			AssertNodeAcceptEdit('B.029', 0, 5, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 5, 1, true, 0, 6);
			AssertNodeAcceptEdit('B.030', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 5, 1, true, 0, 6);
			AssertNodeAcceptEdit('B.031', 0, 5, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 5, 1, true, 0, 6);

			// replAce with lArger text until stArt
			AssertNodeAcceptEdit('B.032', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 5, 2, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.033', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 5, 2, fAlse, 6, 11);
			AssertNodeAcceptEdit('B.034', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 5, 2, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.035', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 5, 2, fAlse, 6, 11);
			AssertNodeAcceptEdit('B.036', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 5, 2, true, 6, 11);
			AssertNodeAcceptEdit('B.037', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 5, 2, true, 6, 11);
			AssertNodeAcceptEdit('B.038', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 5, 2, true, 6, 11);
			AssertNodeAcceptEdit('B.039', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 5, 2, true, 6, 11);
			// replAce with smAller text until stArt
			AssertNodeAcceptEdit('B.040', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 3, 5, 1, fAlse, 4, 9);
			AssertNodeAcceptEdit('B.041', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 3, 5, 1, fAlse, 4, 9);
			AssertNodeAcceptEdit('B.042', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 3, 5, 1, fAlse, 4, 9);
			AssertNodeAcceptEdit('B.043', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 3, 5, 1, fAlse, 4, 9);
			AssertNodeAcceptEdit('B.044', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 3, 5, 1, true, 4, 9);
			AssertNodeAcceptEdit('B.045', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 3, 5, 1, true, 4, 9);
			AssertNodeAcceptEdit('B.046', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 3, 5, 1, true, 4, 9);
			AssertNodeAcceptEdit('B.047', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 3, 5, 1, true, 4, 9);

			// replAce with lArger text select stArt
			AssertNodeAcceptEdit('B.048', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 6, 3, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.049', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 6, 3, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.050', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 6, 3, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.051', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 6, 3, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.052', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 6, 3, true, 7, 11);
			AssertNodeAcceptEdit('B.053', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 6, 3, true, 7, 11);
			AssertNodeAcceptEdit('B.054', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 6, 3, true, 7, 11);
			AssertNodeAcceptEdit('B.055', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 6, 3, true, 7, 11);
			// replAce with smAller text select stArt
			AssertNodeAcceptEdit('B.056', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 6, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.057', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 6, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.058', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 6, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.059', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 6, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.060', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 6, 1, true, 5, 9);
			AssertNodeAcceptEdit('B.061', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 6, 1, true, 5, 9);
			AssertNodeAcceptEdit('B.062', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 6, 1, true, 5, 9);
			AssertNodeAcceptEdit('B.063', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 6, 1, true, 5, 9);

			// replAce with lArger text from stArt
			AssertNodeAcceptEdit('B.064', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 6, 2, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.065', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 6, 2, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.066', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 6, 2, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.067', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 6, 2, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.068', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 6, 2, true, 7, 11);
			AssertNodeAcceptEdit('B.069', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 6, 2, true, 7, 11);
			AssertNodeAcceptEdit('B.070', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 6, 2, true, 7, 11);
			AssertNodeAcceptEdit('B.071', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 6, 2, true, 7, 11);
			// replAce with smAller text from stArt
			AssertNodeAcceptEdit('B.072', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 7, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.073', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 7, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.074', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 7, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.075', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 7, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.076', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 7, 1, true, 6, 9);
			AssertNodeAcceptEdit('B.077', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 7, 1, true, 6, 9);
			AssertNodeAcceptEdit('B.078', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 7, 1, true, 6, 9);
			AssertNodeAcceptEdit('B.079', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 7, 1, true, 6, 9);

			// replAce with lArger text to end
			AssertNodeAcceptEdit('B.080', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 10, 2, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.081', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 10, 2, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.082', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 10, 2, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.083', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 10, 2, fAlse, 5, 11);
			AssertNodeAcceptEdit('B.084', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 10, 2, true, 5, 11);
			AssertNodeAcceptEdit('B.085', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 10, 2, true, 5, 11);
			AssertNodeAcceptEdit('B.086', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 10, 2, true, 5, 11);
			AssertNodeAcceptEdit('B.087', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 10, 2, true, 5, 11);
			// replAce with smAller text to end
			AssertNodeAcceptEdit('B.088', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 8, 10, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.089', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 8, 10, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.090', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 8, 10, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.091', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 8, 10, 1, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.092', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 8, 10, 1, true, 5, 9);
			AssertNodeAcceptEdit('B.093', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 8, 10, 1, true, 5, 9);
			AssertNodeAcceptEdit('B.094', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 8, 10, 1, true, 5, 9);
			AssertNodeAcceptEdit('B.095', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 8, 10, 1, true, 5, 9);

			// replAce with lArger text select end
			AssertNodeAcceptEdit('B.096', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 11, 3, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.097', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 11, 3, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.098', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 11, 3, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.099', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 11, 3, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.100', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 11, 3, true, 5, 12);
			AssertNodeAcceptEdit('B.101', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 11, 3, true, 5, 12);
			AssertNodeAcceptEdit('B.102', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 11, 3, true, 5, 12);
			AssertNodeAcceptEdit('B.103', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 11, 3, true, 5, 12);
			// replAce with smAller text select end
			AssertNodeAcceptEdit('B.104', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 11, 1, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.105', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 11, 1, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.106', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 11, 1, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.107', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 11, 1, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.108', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 11, 1, true, 5, 10);
			AssertNodeAcceptEdit('B.109', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 11, 1, true, 5, 10);
			AssertNodeAcceptEdit('B.110', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 11, 1, true, 5, 10);
			AssertNodeAcceptEdit('B.111', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 11, 1, true, 5, 10);

			// replAce with lArger text from end
			AssertNodeAcceptEdit('B.112', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 10, 11, 3, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.113', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 10, 11, 3, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.114', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 10, 11, 3, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.115', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 10, 11, 3, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.116', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 10, 11, 3, true, 5, 13);
			AssertNodeAcceptEdit('B.117', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 10, 11, 3, true, 5, 13);
			AssertNodeAcceptEdit('B.118', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 10, 11, 3, true, 5, 13);
			AssertNodeAcceptEdit('B.119', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 10, 11, 3, true, 5, 13);
			// replAce with smAller text from end
			AssertNodeAcceptEdit('B.120', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 10, 12, 1, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.121', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 10, 12, 1, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.122', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 10, 12, 1, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.123', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 10, 12, 1, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.124', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 10, 12, 1, true, 5, 11);
			AssertNodeAcceptEdit('B.125', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 10, 12, 1, true, 5, 11);
			AssertNodeAcceptEdit('B.126', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 10, 12, 1, true, 5, 11);
			AssertNodeAcceptEdit('B.127', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 10, 12, 1, true, 5, 11);

			// delete until stArt
			AssertNodeAcceptEdit('B.128', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 5, 0, fAlse, 4, 9);
			AssertNodeAcceptEdit('B.129', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 5, 0, fAlse, 4, 9);
			AssertNodeAcceptEdit('B.130', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 5, 0, fAlse, 4, 9);
			AssertNodeAcceptEdit('B.131', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 5, 0, fAlse, 4, 9);
			AssertNodeAcceptEdit('B.132', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 5, 0, true, 4, 9);
			AssertNodeAcceptEdit('B.133', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 5, 0, true, 4, 9);
			AssertNodeAcceptEdit('B.134', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 5, 0, true, 4, 9);
			AssertNodeAcceptEdit('B.135', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 5, 0, true, 4, 9);

			// delete select stArt
			AssertNodeAcceptEdit('B.136', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 6, 0, fAlse, 4, 8);
			AssertNodeAcceptEdit('B.137', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 6, 0, fAlse, 4, 8);
			AssertNodeAcceptEdit('B.138', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 6, 0, fAlse, 4, 8);
			AssertNodeAcceptEdit('B.139', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 6, 0, fAlse, 4, 8);
			AssertNodeAcceptEdit('B.140', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 4, 6, 0, true, 4, 8);
			AssertNodeAcceptEdit('B.141', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 4, 6, 0, true, 4, 8);
			AssertNodeAcceptEdit('B.142', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 4, 6, 0, true, 4, 8);
			AssertNodeAcceptEdit('B.143', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 4, 6, 0, true, 4, 8);

			// delete from stArt
			AssertNodeAcceptEdit('B.144', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 6, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.145', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 6, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.146', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 6, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.147', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 6, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.148', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 6, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.149', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 6, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.150', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 6, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.151', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 6, 0, true, 5, 9);

			// delete to end
			AssertNodeAcceptEdit('B.152', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 10, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.153', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 10, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.154', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 10, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.155', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 10, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.156', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 10, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.157', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 10, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.158', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 10, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.159', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 10, 0, true, 5, 9);

			// delete select end
			AssertNodeAcceptEdit('B.160', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 11, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.161', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 11, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.162', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 11, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.163', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 11, 0, fAlse, 5, 9);
			AssertNodeAcceptEdit('B.164', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 9, 11, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.165', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 9, 11, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.166', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 9, 11, 0, true, 5, 9);
			AssertNodeAcceptEdit('B.167', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 9, 11, 0, true, 5, 9);

			// delete from end
			AssertNodeAcceptEdit('B.168', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 10, 11, 0, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.169', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 10, 11, 0, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.170', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 10, 11, 0, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.171', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 10, 11, 0, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.172', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 10, 11, 0, true, 5, 10);
			AssertNodeAcceptEdit('B.173', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 10, 11, 0, true, 5, 10);
			AssertNodeAcceptEdit('B.174', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 10, 11, 0, true, 5, 10);
			AssertNodeAcceptEdit('B.175', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 10, 11, 0, true, 5, 10);

			// replAce with lArger text entire
			AssertNodeAcceptEdit('B.176', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 10, 3, fAlse, 5, 8);
			AssertNodeAcceptEdit('B.177', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 10, 3, fAlse, 5, 8);
			AssertNodeAcceptEdit('B.178', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 10, 3, fAlse, 5, 8);
			AssertNodeAcceptEdit('B.179', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 10, 3, fAlse, 5, 8);
			AssertNodeAcceptEdit('B.180', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 10, 3, true, 8, 8);
			AssertNodeAcceptEdit('B.181', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 10, 3, true, 8, 8);
			AssertNodeAcceptEdit('B.182', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 10, 3, true, 8, 8);
			AssertNodeAcceptEdit('B.183', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 10, 3, true, 8, 8);
			// replAce with smAller text entire
			AssertNodeAcceptEdit('B.184', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 10, 7, fAlse, 5, 12);
			AssertNodeAcceptEdit('B.185', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 10, 7, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.186', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 10, 7, fAlse, 5, 10);
			AssertNodeAcceptEdit('B.187', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 10, 7, fAlse, 5, 12);
			AssertNodeAcceptEdit('B.188', 5, 10, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, 5, 10, 7, true, 12, 12);
			AssertNodeAcceptEdit('B.189', 5, 10, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, 5, 10, 7, true, 12, 12);
			AssertNodeAcceptEdit('B.190', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore, 5, 10, 7, true, 12, 12);
			AssertNodeAcceptEdit('B.191', 5, 10, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter, 5, 10, 7, true, 12, 12);

		}
	});
});

function printTree(T: IntervAlTree): void {
	if (T.root === SENTINEL) {
		console.log(`~~ empty`);
		return;
	}
	let out: string[] = [];
	_printTree(T, T.root, '', 0, out);
	console.log(out.join(''));
}

function _printTree(T: IntervAlTree, n: IntervAlNode, indent: string, deltA: number, out: string[]): void {
	out.push(`${indent}[${getNodeColor(n) === NodeColor.Red ? 'R' : 'B'},${n.deltA}, ${n.stArt}->${n.end}, ${n.mAxEnd}] : {${deltA + n.stArt}->${deltA + n.end}}, mAxEnd: ${n.mAxEnd + deltA}\n`);
	if (n.left !== SENTINEL) {
		_printTree(T, n.left, indent + '    ', deltA, out);
	} else {
		out.push(`${indent}    NIL\n`);
	}
	if (n.right !== SENTINEL) {
		_printTree(T, n.right, indent + '    ', deltA + n.deltA, out);
	} else {
		out.push(`${indent}    NIL\n`);
	}
}

//#region Assertion

function AssertTreeInvAriAnts(T: IntervAlTree): void {
	Assert(getNodeColor(SENTINEL) === NodeColor.BlAck);
	Assert(SENTINEL.pArent === SENTINEL);
	Assert(SENTINEL.left === SENTINEL);
	Assert(SENTINEL.right === SENTINEL);
	Assert(SENTINEL.stArt === 0);
	Assert(SENTINEL.end === 0);
	Assert(SENTINEL.deltA === 0);
	Assert(T.root.pArent === SENTINEL);
	AssertVAlidTree(T);
}

function depth(n: IntervAlNode): number {
	if (n === SENTINEL) {
		// The leAfs Are blAck
		return 1;
	}
	Assert(depth(n.left) === depth(n.right));
	return (getNodeColor(n) === NodeColor.BlAck ? 1 : 0) + depth(n.left);
}

function AssertVAlidNode(n: IntervAlNode, deltA: number): void {
	if (n === SENTINEL) {
		return;
	}

	let l = n.left;
	let r = n.right;

	if (getNodeColor(n) === NodeColor.Red) {
		Assert(getNodeColor(l) === NodeColor.BlAck);
		Assert(getNodeColor(r) === NodeColor.BlAck);
	}

	let expectedMAxEnd = n.end;
	if (l !== SENTINEL) {
		Assert(intervAlCompAre(l.stArt + deltA, l.end + deltA, n.stArt + deltA, n.end + deltA) <= 0);
		expectedMAxEnd = MAth.mAx(expectedMAxEnd, l.mAxEnd);
	}
	if (r !== SENTINEL) {
		Assert(intervAlCompAre(n.stArt + deltA, n.end + deltA, r.stArt + deltA + n.deltA, r.end + deltA + n.deltA) <= 0);
		expectedMAxEnd = MAth.mAx(expectedMAxEnd, r.mAxEnd + n.deltA);
	}
	Assert(n.mAxEnd === expectedMAxEnd);

	AssertVAlidNode(l, deltA);
	AssertVAlidNode(r, deltA + n.deltA);
}

function AssertVAlidTree(T: IntervAlTree): void {
	if (T.root === SENTINEL) {
		return;
	}
	Assert(getNodeColor(T.root) === NodeColor.BlAck);
	Assert(depth(T.root.left) === depth(T.root.right));
	AssertVAlidNode(T.root, 0);
}

//#endregion

