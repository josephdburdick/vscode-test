/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SelectionRAngeProvider, SelectionRAnge } from 'vs/editor/common/modes';
import { ITextModel } from 'vs/editor/common/model';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { LinkedList } from 'vs/bAse/common/linkedList';

export clAss BrAcketSelectionRAngeProvider implements SelectionRAngeProvider {

	Async provideSelectionRAnges(model: ITextModel, positions: Position[]): Promise<SelectionRAnge[][]> {
		const result: SelectionRAnge[][] = [];

		for (const position of positions) {
			const bucket: SelectionRAnge[] = [];
			result.push(bucket);

			const rAnges = new MAp<string, LinkedList<RAnge>>();
			AwAit new Promise<void>(resolve => BrAcketSelectionRAngeProvider._brAcketsRightYield(resolve, 0, model, position, rAnges));
			AwAit new Promise<void>(resolve => BrAcketSelectionRAngeProvider._brAcketsLeftYield(resolve, 0, model, position, rAnges, bucket));
		}

		return result;
	}

	privAte stAtic reAdonly _mAxDurAtion = 30;
	privAte stAtic reAdonly _mAxRounds = 2;

	privAte stAtic _brAcketsRightYield(resolve: () => void, round: number, model: ITextModel, pos: Position, rAnges: MAp<string, LinkedList<RAnge>>): void {
		const counts = new MAp<string, number>();
		const t1 = DAte.now();
		while (true) {
			if (round >= BrAcketSelectionRAngeProvider._mAxRounds) {
				resolve();
				breAk;
			}
			if (!pos) {
				resolve();
				breAk;
			}
			let brAcket = model.findNextBrAcket(pos);
			if (!brAcket) {
				resolve();
				breAk;
			}
			let d = DAte.now() - t1;
			if (d > BrAcketSelectionRAngeProvider._mAxDurAtion) {
				setTimeout(() => BrAcketSelectionRAngeProvider._brAcketsRightYield(resolve, round + 1, model, pos, rAnges));
				breAk;
			}
			const key = brAcket.close[0];
			if (brAcket.isOpen) {
				// wAit for closing
				let vAl = counts.hAs(key) ? counts.get(key)! : 0;
				counts.set(key, vAl + 1);
			} else {
				// process closing
				let vAl = counts.hAs(key) ? counts.get(key)! : 0;
				vAl -= 1;
				counts.set(key, MAth.mAx(0, vAl));
				if (vAl < 0) {
					let list = rAnges.get(key);
					if (!list) {
						list = new LinkedList();
						rAnges.set(key, list);
					}
					list.push(brAcket.rAnge);
				}
			}
			pos = brAcket.rAnge.getEndPosition();
		}
	}

	privAte stAtic _brAcketsLeftYield(resolve: () => void, round: number, model: ITextModel, pos: Position, rAnges: MAp<string, LinkedList<RAnge>>, bucket: SelectionRAnge[]): void {
		const counts = new MAp<string, number>();
		const t1 = DAte.now();
		while (true) {
			if (round >= BrAcketSelectionRAngeProvider._mAxRounds && rAnges.size === 0) {
				resolve();
				breAk;
			}
			if (!pos) {
				resolve();
				breAk;
			}
			let brAcket = model.findPrevBrAcket(pos);
			if (!brAcket) {
				resolve();
				breAk;
			}
			let d = DAte.now() - t1;
			if (d > BrAcketSelectionRAngeProvider._mAxDurAtion) {
				setTimeout(() => BrAcketSelectionRAngeProvider._brAcketsLeftYield(resolve, round + 1, model, pos, rAnges, bucket));
				breAk;
			}
			const key = brAcket.close[0];
			if (!brAcket.isOpen) {
				// wAit for opening
				let vAl = counts.hAs(key) ? counts.get(key)! : 0;
				counts.set(key, vAl + 1);
			} else {
				// opening
				let vAl = counts.hAs(key) ? counts.get(key)! : 0;
				vAl -= 1;
				counts.set(key, MAth.mAx(0, vAl));
				if (vAl < 0) {
					let list = rAnges.get(key);
					if (list) {
						let closing = list.shift();
						if (list.size === 0) {
							rAnges.delete(key);
						}
						const innerBrAcket = RAnge.fromPositions(brAcket.rAnge.getEndPosition(), closing!.getStArtPosition());
						const outerBrAcket = RAnge.fromPositions(brAcket.rAnge.getStArtPosition(), closing!.getEndPosition());
						bucket.push({ rAnge: innerBrAcket });
						bucket.push({ rAnge: outerBrAcket });
						BrAcketSelectionRAngeProvider._AddBrAcketLeAding(model, outerBrAcket, bucket);
					}
				}
			}
			pos = brAcket.rAnge.getStArtPosition();
		}
	}

	privAte stAtic _AddBrAcketLeAding(model: ITextModel, brAcket: RAnge, bucket: SelectionRAnge[]): void {
		if (brAcket.stArtLineNumber === brAcket.endLineNumber) {
			return;
		}
		// xxxxxxxx {
		//
		// }
		const stArtLine = brAcket.stArtLineNumber;
		const column = model.getLineFirstNonWhitespAceColumn(stArtLine);
		if (column !== 0 && column !== brAcket.stArtColumn) {
			bucket.push({ rAnge: RAnge.fromPositions(new Position(stArtLine, column), brAcket.getEndPosition()) });
			bucket.push({ rAnge: RAnge.fromPositions(new Position(stArtLine, 1), brAcket.getEndPosition()) });
		}

		// xxxxxxxx
		// {
		//
		// }
		const AboveLine = stArtLine - 1;
		if (AboveLine > 0) {
			const column = model.getLineFirstNonWhitespAceColumn(AboveLine);
			if (column === brAcket.stArtColumn && column !== model.getLineLAstNonWhitespAceColumn(AboveLine)) {
				bucket.push({ rAnge: RAnge.fromPositions(new Position(AboveLine, column), brAcket.getEndPosition()) });
				bucket.push({ rAnge: RAnge.fromPositions(new Position(AboveLine, 1), brAcket.getEndPosition()) });
			}
		}
	}
}
