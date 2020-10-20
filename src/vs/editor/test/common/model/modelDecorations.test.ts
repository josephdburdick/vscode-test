/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { EndOfLineSequence, IModelDeltADecorAtion, TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

// --------- utils

interfAce ILightWeightDecorAtion2 {
	rAnge: RAnge;
	clAssNAme: string | null | undefined;
}

function modelHAsDecorAtions(model: TextModel, decorAtions: ILightWeightDecorAtion2[]) {
	let modelDecorAtions: ILightWeightDecorAtion2[] = [];
	let ActuAlDecorAtions = model.getAllDecorAtions();
	for (let i = 0, len = ActuAlDecorAtions.length; i < len; i++) {
		modelDecorAtions.push({
			rAnge: ActuAlDecorAtions[i].rAnge,
			clAssNAme: ActuAlDecorAtions[i].options.clAssNAme
		});
	}
	modelDecorAtions.sort((A, b) => RAnge.compAreRAngesUsingStArts(A.rAnge, b.rAnge));
	Assert.deepEquAl(modelDecorAtions, decorAtions);
}

function modelHAsDecorAtion(model: TextModel, stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColumn: number, clAssNAme: string) {
	modelHAsDecorAtions(model, [{
		rAnge: new RAnge(stArtLineNumber, stArtColumn, endLineNumber, endColumn),
		clAssNAme: clAssNAme
	}]);
}

function modelHAsNoDecorAtions(model: TextModel) {
	Assert.equAl(model.getAllDecorAtions().length, 0, 'Model hAs no decorAtion');
}

function AddDecorAtion(model: TextModel, stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColumn: number, clAssNAme: string): string {
	return model.chAngeDecorAtions((chAngeAccessor) => {
		return chAngeAccessor.AddDecorAtion(new RAnge(stArtLineNumber, stArtColumn, endLineNumber, endColumn), {
			clAssNAme: clAssNAme
		});
	})!;
}

function lineHAsDecorAtions(model: TextModel, lineNumber: number, decorAtions: { stArt: number; end: number; clAssNAme: string; }[]) {
	let lineDecorAtions: ArrAy<{ stArt: number; end: number; clAssNAme: string | null | undefined; }> = [];
	let decs = model.getLineDecorAtions(lineNumber);
	for (let i = 0, len = decs.length; i < len; i++) {
		lineDecorAtions.push({
			stArt: decs[i].rAnge.stArtColumn,
			end: decs[i].rAnge.endColumn,
			clAssNAme: decs[i].options.clAssNAme
		});
	}
	Assert.deepEquAl(lineDecorAtions, decorAtions, 'Line decorAtions');
}

function lineHAsNoDecorAtions(model: TextModel, lineNumber: number) {
	lineHAsDecorAtions(model, lineNumber, []);
}

function lineHAsDecorAtion(model: TextModel, lineNumber: number, stArt: number, end: number, clAssNAme: string) {
	lineHAsDecorAtions(model, lineNumber, [{
		stArt: stArt,
		end: end,
		clAssNAme: clAssNAme
	}]);
}

suite('Editor Model - Model DecorAtions', () => {
	const LINE1 = 'My First Line';
	const LINE2 = '\t\tMy Second Line';
	const LINE3 = '    Third Line';
	const LINE4 = '';
	const LINE5 = '1';

	// --------- Model DecorAtions

	let thisModel: TextModel;

	setup(() => {
		const text =
			LINE1 + '\r\n' +
			LINE2 + '\n' +
			LINE3 + '\n' +
			LINE4 + '\r\n' +
			LINE5;
		thisModel = creAteTextModel(text);
	});

	teArdown(() => {
		thisModel.dispose();
	});

	test('single chArActer decorAtion', () => {
		AddDecorAtion(thisModel, 1, 1, 1, 2, 'myType');
		lineHAsDecorAtion(thisModel, 1, 1, 2, 'myType');
		lineHAsNoDecorAtions(thisModel, 2);
		lineHAsNoDecorAtions(thisModel, 3);
		lineHAsNoDecorAtions(thisModel, 4);
		lineHAsNoDecorAtions(thisModel, 5);
	});

	test('line decorAtion', () => {
		AddDecorAtion(thisModel, 1, 1, 1, 14, 'myType');
		lineHAsDecorAtion(thisModel, 1, 1, 14, 'myType');
		lineHAsNoDecorAtions(thisModel, 2);
		lineHAsNoDecorAtions(thisModel, 3);
		lineHAsNoDecorAtions(thisModel, 4);
		lineHAsNoDecorAtions(thisModel, 5);
	});

	test('full line decorAtion', () => {
		AddDecorAtion(thisModel, 1, 1, 2, 1, 'myType');

		let line1DecorAtions = thisModel.getLineDecorAtions(1);
		Assert.equAl(line1DecorAtions.length, 1);
		Assert.equAl(line1DecorAtions[0].options.clAssNAme, 'myType');

		let line2DecorAtions = thisModel.getLineDecorAtions(1);
		Assert.equAl(line2DecorAtions.length, 1);
		Assert.equAl(line2DecorAtions[0].options.clAssNAme, 'myType');

		lineHAsNoDecorAtions(thisModel, 3);
		lineHAsNoDecorAtions(thisModel, 4);
		lineHAsNoDecorAtions(thisModel, 5);
	});

	test('multiple line decorAtion', () => {
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');

		let line1DecorAtions = thisModel.getLineDecorAtions(1);
		Assert.equAl(line1DecorAtions.length, 1);
		Assert.equAl(line1DecorAtions[0].options.clAssNAme, 'myType');

		let line2DecorAtions = thisModel.getLineDecorAtions(1);
		Assert.equAl(line2DecorAtions.length, 1);
		Assert.equAl(line2DecorAtions[0].options.clAssNAme, 'myType');

		let line3DecorAtions = thisModel.getLineDecorAtions(1);
		Assert.equAl(line3DecorAtions.length, 1);
		Assert.equAl(line3DecorAtions[0].options.clAssNAme, 'myType');

		lineHAsNoDecorAtions(thisModel, 4);
		lineHAsNoDecorAtions(thisModel, 5);
	});

	// --------- removing, chAnging decorAtions

	test('decorAtion gets removed', () => {
		let decId = AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.chAngeDecorAtions((chAngeAccessor) => {
			chAngeAccessor.removeDecorAtion(decId);
		});
		modelHAsNoDecorAtions(thisModel);
	});

	test('decorAtions get removed', () => {
		let decId1 = AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType1');
		let decId2 = AddDecorAtion(thisModel, 1, 2, 3, 1, 'myType2');
		modelHAsDecorAtions(thisModel, [
			{
				rAnge: new RAnge(1, 2, 3, 1),
				clAssNAme: 'myType2'
			},
			{
				rAnge: new RAnge(1, 2, 3, 2),
				clAssNAme: 'myType1'
			}
		]);
		thisModel.chAngeDecorAtions((chAngeAccessor) => {
			chAngeAccessor.removeDecorAtion(decId1);
		});
		modelHAsDecorAtions(thisModel, [
			{
				rAnge: new RAnge(1, 2, 3, 1),
				clAssNAme: 'myType2'
			}
		]);
		thisModel.chAngeDecorAtions((chAngeAccessor) => {
			chAngeAccessor.removeDecorAtion(decId2);
		});
		modelHAsNoDecorAtions(thisModel);
	});

	test('decorAtion rAnge cAn be chAnged', () => {
		let decId = AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.chAngeDecorAtions((chAngeAccessor) => {
			chAngeAccessor.chAngeDecorAtion(decId, new RAnge(1, 1, 1, 2));
		});
		modelHAsDecorAtion(thisModel, 1, 1, 1, 2, 'myType');
	});

	// --------- eventing

	test('decorAtions emit event on Add', () => {
		let listenerCAlled = 0;
		thisModel.onDidChAngeDecorAtions((e) => {
			listenerCAlled++;
		});
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		Assert.equAl(listenerCAlled, 1, 'listener cAlled');
	});

	test('decorAtions emit event on chAnge', () => {
		let listenerCAlled = 0;
		let decId = AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.onDidChAngeDecorAtions((e) => {
			listenerCAlled++;
		});
		thisModel.chAngeDecorAtions((chAngeAccessor) => {
			chAngeAccessor.chAngeDecorAtion(decId, new RAnge(1, 1, 1, 2));
		});
		Assert.equAl(listenerCAlled, 1, 'listener cAlled');
	});

	test('decorAtions emit event on remove', () => {
		let listenerCAlled = 0;
		let decId = AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.onDidChAngeDecorAtions((e) => {
			listenerCAlled++;
		});
		thisModel.chAngeDecorAtions((chAngeAccessor) => {
			chAngeAccessor.removeDecorAtion(decId);
		});
		Assert.equAl(listenerCAlled, 1, 'listener cAlled');
	});

	test('decorAtions emit event when inserting one line text before it', () => {
		let listenerCAlled = 0;
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');

		thisModel.onDidChAngeDecorAtions((e) => {
			listenerCAlled++;
		});

		thisModel.ApplyEdits([EditOperAtion.insert(new Position(1, 1), 'HAllo ')]);
		Assert.equAl(listenerCAlled, 1, 'listener cAlled');
	});

	test('decorAtions do not emit event on no-op deltADecorAtions', () => {
		let listenerCAlled = 0;

		thisModel.onDidChAngeDecorAtions((e) => {
			listenerCAlled++;
		});

		thisModel.deltADecorAtions([], []);
		thisModel.chAngeDecorAtions((Accessor) => {
			Accessor.deltADecorAtions([], []);
		});

		Assert.equAl(listenerCAlled, 0, 'listener not cAlled');
	});

	// --------- editing text & effects on decorAtions

	test('decorAtions Are updAted when inserting one line text before it', () => {
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(1, 1), 'HAllo ')]);
		modelHAsDecorAtion(thisModel, 1, 8, 3, 2, 'myType');
	});

	test('decorAtions Are updAted when inserting one line text before it 2', () => {
		AddDecorAtion(thisModel, 1, 1, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 1, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.replAce(new RAnge(1, 1, 1, 1), 'HAllo ')]);
		modelHAsDecorAtion(thisModel, 1, 1, 3, 2, 'myType');
	});

	test('decorAtions Are updAted when inserting multiple lines text before it', () => {
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(1, 1), 'HAllo\nI\'m inserting multiple\nlines')]);
		modelHAsDecorAtion(thisModel, 3, 7, 5, 2, 'myType');
	});

	test('decorAtions chAnge when inserting text After them', () => {
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(3, 2), 'HAllo')]);
		modelHAsDecorAtion(thisModel, 1, 2, 3, 7, 'myType');
	});

	test('decorAtions Are updAted when inserting text inside', () => {
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(1, 3), 'HAllo ')]);
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
	});

	test('decorAtions Are updAted when inserting text inside 2', () => {
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(3, 1), 'HAllo ')]);
		modelHAsDecorAtion(thisModel, 1, 2, 3, 8, 'myType');
	});

	test('decorAtions Are updAted when inserting text inside 3', () => {
		AddDecorAtion(thisModel, 1, 1, 2, 16, 'myType');
		modelHAsDecorAtion(thisModel, 1, 1, 2, 16, 'myType');
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(2, 2), '\n')]);
		modelHAsDecorAtion(thisModel, 1, 1, 3, 15, 'myType');
	});

	test('decorAtions Are updAted when inserting multiple lines text inside', () => {
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(1, 3), 'HAllo\nI\'m inserting multiple\nlines')]);
		modelHAsDecorAtion(thisModel, 1, 2, 5, 2, 'myType');
	});

	test('decorAtions Are updAted when deleting one line text before it', () => {
		AddDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.delete(new RAnge(1, 1, 1, 2))]);
		modelHAsDecorAtion(thisModel, 1, 1, 3, 2, 'myType');
	});

	test('decorAtions Are updAted when deleting multiple lines text before it', () => {
		AddDecorAtion(thisModel, 2, 2, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 2, 2, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.delete(new RAnge(1, 1, 2, 1))]);
		modelHAsDecorAtion(thisModel, 1, 2, 2, 2, 'myType');
	});

	test('decorAtions Are updAted when deleting multiple lines text before it 2', () => {
		AddDecorAtion(thisModel, 2, 3, 3, 2, 'myType');
		modelHAsDecorAtion(thisModel, 2, 3, 3, 2, 'myType');
		thisModel.ApplyEdits([EditOperAtion.delete(new RAnge(1, 1, 2, 2))]);
		modelHAsDecorAtion(thisModel, 1, 2, 2, 2, 'myType');
	});

	test('decorAtions Are updAted when deleting text inside', () => {
		AddDecorAtion(thisModel, 1, 2, 4, 1, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 4, 1, 'myType');
		thisModel.ApplyEdits([EditOperAtion.delete(new RAnge(1, 3, 2, 1))]);
		modelHAsDecorAtion(thisModel, 1, 2, 3, 1, 'myType');
	});

	test('decorAtions Are updAted when deleting text inside 2', () => {
		AddDecorAtion(thisModel, 1, 2, 4, 1, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 4, 1, 'myType');
		thisModel.ApplyEdits([
			EditOperAtion.delete(new RAnge(1, 1, 1, 2)),
			EditOperAtion.delete(new RAnge(4, 1, 4, 1))
		]);
		modelHAsDecorAtion(thisModel, 1, 1, 4, 1, 'myType');
	});

	test('decorAtions Are updAted when deleting multiple lines text', () => {
		AddDecorAtion(thisModel, 1, 2, 4, 1, 'myType');
		modelHAsDecorAtion(thisModel, 1, 2, 4, 1, 'myType');
		thisModel.ApplyEdits([EditOperAtion.delete(new RAnge(1, 1, 3, 1))]);
		modelHAsDecorAtion(thisModel, 1, 1, 2, 1, 'myType');
	});

	test('decorAtions Are updAted when chAnging EOL', () => {
		AddDecorAtion(thisModel, 1, 2, 4, 1, 'myType1');
		AddDecorAtion(thisModel, 1, 3, 4, 1, 'myType2');
		AddDecorAtion(thisModel, 1, 4, 4, 1, 'myType3');
		AddDecorAtion(thisModel, 1, 5, 4, 1, 'myType4');
		AddDecorAtion(thisModel, 1, 6, 4, 1, 'myType5');
		AddDecorAtion(thisModel, 1, 7, 4, 1, 'myType6');
		AddDecorAtion(thisModel, 1, 8, 4, 1, 'myType7');
		AddDecorAtion(thisModel, 1, 9, 4, 1, 'myType8');
		AddDecorAtion(thisModel, 1, 10, 4, 1, 'myType9');
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(1, 1), 'x')]);
		thisModel.setEOL(EndOfLineSequence.CRLF);
		thisModel.ApplyEdits([EditOperAtion.insert(new Position(1, 1), 'x')]);
		modelHAsDecorAtions(thisModel, [
			{ rAnge: new RAnge(1, 4, 4, 1), clAssNAme: 'myType1' },
			{ rAnge: new RAnge(1, 5, 4, 1), clAssNAme: 'myType2' },
			{ rAnge: new RAnge(1, 6, 4, 1), clAssNAme: 'myType3' },
			{ rAnge: new RAnge(1, 7, 4, 1), clAssNAme: 'myType4' },
			{ rAnge: new RAnge(1, 8, 4, 1), clAssNAme: 'myType5' },
			{ rAnge: new RAnge(1, 9, 4, 1), clAssNAme: 'myType6' },
			{ rAnge: new RAnge(1, 10, 4, 1), clAssNAme: 'myType7' },
			{ rAnge: new RAnge(1, 11, 4, 1), clAssNAme: 'myType8' },
			{ rAnge: new RAnge(1, 12, 4, 1), clAssNAme: 'myType9' },
		]);
	});

	test('An AppArently simple edit', () => {
		AddDecorAtion(thisModel, 1, 2, 4, 1, 'myType1');
		thisModel.ApplyEdits([EditOperAtion.replAce(new RAnge(1, 14, 2, 1), 'x')]);
		modelHAsDecorAtions(thisModel, [
			{ rAnge: new RAnge(1, 2, 3, 1), clAssNAme: 'myType1' },
		]);
	});

	test('removeAllDecorAtionsWithOwnerId cAn be cAlled After model dispose', () => {
		let model = creAteTextModel('Asd');
		model.dispose();
		model.removeAllDecorAtionsWithOwnerId(1);
	});

	test('removeAllDecorAtionsWithOwnerId works', () => {
		thisModel.deltADecorAtions([], [{ rAnge: new RAnge(1, 2, 4, 1), options: { clAssNAme: 'myType1' } }], 1);
		thisModel.removeAllDecorAtionsWithOwnerId(1);
		modelHAsNoDecorAtions(thisModel);
	});
});

suite('DecorAtions And editing', () => {

	function _runTest(decRAnge: RAnge, stickiness: TrAckedRAngeStickiness, editRAnge: RAnge, editText: string, editForceMoveMArkers: booleAn, expectedDecRAnge: RAnge, msg: string): void {
		let model = creAteTextModel([
			'My First Line',
			'My Second Line',
			'Third Line'
		].join('\n'));

		const id = model.deltADecorAtions([], [{ rAnge: decRAnge, options: { stickiness: stickiness } }])[0];
		model.ApplyEdits([{
			rAnge: editRAnge,
			text: editText,
			forceMoveMArkers: editForceMoveMArkers
		}]);
		const ActuAl = model.getDecorAtionRAnge(id);
		Assert.deepEquAl(ActuAl, expectedDecRAnge, msg);

		model.dispose();
	}

	function runTest(decRAnge: RAnge, editRAnge: RAnge, editText: string, expectedDecRAnge: RAnge[][]): void {
		_runTest(decRAnge, 0, editRAnge, editText, fAlse, expectedDecRAnge[0][0], 'no-0-AlwAysGrowsWhenTypingAtEdges');
		_runTest(decRAnge, 1, editRAnge, editText, fAlse, expectedDecRAnge[0][1], 'no-1-NeverGrowsWhenTypingAtEdges');
		_runTest(decRAnge, 2, editRAnge, editText, fAlse, expectedDecRAnge[0][2], 'no-2-GrowsOnlyWhenTypingBefore');
		_runTest(decRAnge, 3, editRAnge, editText, fAlse, expectedDecRAnge[0][3], 'no-3-GrowsOnlyWhenTypingAfter');

		_runTest(decRAnge, 0, editRAnge, editText, true, expectedDecRAnge[1][0], 'force-0-AlwAysGrowsWhenTypingAtEdges');
		_runTest(decRAnge, 1, editRAnge, editText, true, expectedDecRAnge[1][1], 'force-1-NeverGrowsWhenTypingAtEdges');
		_runTest(decRAnge, 2, editRAnge, editText, true, expectedDecRAnge[1][2], 'force-2-GrowsOnlyWhenTypingBefore');
		_runTest(decRAnge, 3, editRAnge, editText, true, expectedDecRAnge[1][3], 'force-3-GrowsOnlyWhenTypingAfter');
	}

	suite('insert', () => {
		suite('collApsed dec', () => {
			test('before', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 3, 1, 3), 'xx',
					[
						[new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6)],
						[new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6)],
					]
				);
			});
			test('equAl', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 4, 1, 4), 'xx',
					[
						[new RAnge(1, 4, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 4, 1, 4), new RAnge(1, 6, 1, 6)],
						[new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6)],
					]
				);
			});
			test('After', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 5, 1, 5), 'xx',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});
		});
		suite('non-collApsed dec', () => {
			test('before', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 3), 'xx',
					[
						[new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11)],
						[new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11)],
					]
				);
			});
			test('stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 4), 'xx',
					[
						[new RAnge(1, 4, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 6, 1, 11)],
						[new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11)],
					]
				);
			});
			test('inside', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 5), 'xx',
					[
						[new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11)],
						[new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11)],
					]
				);
			});
			test('end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 9, 1, 9), 'xx',
					[
						[new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 11)],
						[new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11)],
					]
				);
			});
			test('After', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 10, 1, 10), 'xx',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
					]
				);
			});
		});
	});

	suite('delete', () => {
		suite('collApsed dec', () => {
			test('edit.end < rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 1, 1, 3), '',
					[
						[new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2)],
						[new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2)],
					]
				);
			});
			test('edit.end <= rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 2, 1, 4), '',
					[
						[new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2)],
						[new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2), new RAnge(1, 2, 1, 2)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 3, 1, 5), '',
					[
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
					]
				);
			});
			test('edit.stArt >= rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 4, 1, 6), '',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});
			test('edit.stArt > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 5, 1, 7), '',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});
		});
		suite('non-collApsed dec', () => {
			test('edit.end < rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 1, 1, 3), '',
					[
						[new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7)],
						[new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7)],
					]
				);
			});
			test('edit.end <= rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 2, 1, 4), '',
					[
						[new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7)],
						[new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7), new RAnge(1, 2, 1, 7)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 5), '',
					[
						[new RAnge(1, 3, 1, 7), new RAnge(1, 3, 1, 7), new RAnge(1, 3, 1, 7), new RAnge(1, 3, 1, 7)],
						[new RAnge(1, 3, 1, 7), new RAnge(1, 3, 1, 7), new RAnge(1, 3, 1, 7), new RAnge(1, 3, 1, 7)],
					]
				);
			});

			test('edit.stArt < rAnge.stArt && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 9), '',
					[
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
					]
				);
			});

			test('edit.stArt < rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 10), '',
					[
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
					]
				);
			});

			test('edit.stArt == rAnge.stArt && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 6), '',
					[
						[new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7)],
						[new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7)],
					]
				);
			});

			test('edit.stArt == rAnge.stArt && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 9), '',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});

			test('edit.stArt == rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 10), '',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});

			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 7), '',
					[
						[new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7)],
						[new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7)],
					]
				);
			});

			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 9), '',
					[
						[new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5)],
						[new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5)],
					]
				);
			});

			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 10), '',
					[
						[new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5)],
						[new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5)],
					]
				);
			});

			test('edit.stArt == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 9, 1, 11), '',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
					]
				);
			});

			test('edit.stArt > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 10, 1, 11), '',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
					]
				);
			});
		});
	});

	suite('replAce short', () => {
		suite('collApsed dec', () => {
			test('edit.end < rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 1, 1, 3), 'c',
					[
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
					]
				);
			});
			test('edit.end <= rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 2, 1, 4), 'c',
					[
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
						[new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3), new RAnge(1, 3, 1, 3)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 3, 1, 5), 'c',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});
			test('edit.stArt >= rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 4, 1, 6), 'c',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5)],
					]
				);
			});
			test('edit.stArt > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 5, 1, 7), 'c',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});
		});
		suite('non-collApsed dec', () => {
			test('edit.end < rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 1, 1, 3), 'c',
					[
						[new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8)],
						[new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8)],
					]
				);
			});
			test('edit.end <= rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 2, 1, 4), 'c',
					[
						[new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8)],
						[new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8), new RAnge(1, 3, 1, 8)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 5), 'c',
					[
						[new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8)],
						[new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 9), 'c',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 10), 'c',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});
			test('edit.stArt == rAnge.stArt && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 6), 'c',
					[
						[new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8)],
						[new RAnge(1, 5, 1, 8), new RAnge(1, 5, 1, 8), new RAnge(1, 5, 1, 8), new RAnge(1, 5, 1, 8)],
					]
				);
			});
			test('edit.stArt == rAnge.stArt && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 9), 'c',
					[
						[new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5)],
						[new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5)],
					]
				);
			});
			test('edit.stArt == rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 10), 'c',
					[
						[new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5), new RAnge(1, 4, 1, 5)],
						[new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5), new RAnge(1, 5, 1, 5)],
					]
				);
			});
			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 7), 'c',
					[
						[new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8)],
						[new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8)],
					]
				);
			});
			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 9), 'c',
					[
						[new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6)],
						[new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6)],
					]
				);
			});
			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 10), 'c',
					[
						[new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6)],
						[new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6), new RAnge(1, 4, 1, 6)],
					]
				);
			});
			test('edit.stArt == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 9, 1, 11), 'c',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 10), new RAnge(1, 4, 1, 10), new RAnge(1, 4, 1, 10), new RAnge(1, 4, 1, 10)],
					]
				);
			});
			test('edit.stArt > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 10, 1, 11), 'c',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
					]
				);
			});
		});
	});

	suite('replAce long', () => {
		suite('collApsed dec', () => {
			test('edit.end < rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 1, 1, 3), 'cccc',
					[
						[new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6)],
						[new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6)],
					]
				);
			});
			test('edit.end <= rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 2, 1, 4), 'cccc',
					[
						[new RAnge(1, 4, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 4, 1, 4), new RAnge(1, 6, 1, 6)],
						[new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6), new RAnge(1, 6, 1, 6)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 3, 1, 5), 'cccc',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7)],
					]
				);
			});
			test('edit.stArt >= rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 4, 1, 6), 'cccc',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8)],
					]
				);
			});
			test('edit.stArt > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 4),
					new RAnge(1, 5, 1, 7), 'cccc',
					[
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
						[new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4), new RAnge(1, 4, 1, 4)],
					]
				);
			});
		});
		suite('non-collApsed dec', () => {
			test('edit.end < rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 1, 1, 3), 'cccc',
					[
						[new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11)],
						[new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11)],
					]
				);
			});
			test('edit.end <= rAnge.stArt', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 2, 1, 4), 'cccc',
					[
						[new RAnge(1, 4, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 6, 1, 11)],
						[new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11), new RAnge(1, 6, 1, 11)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 5), 'cccc',
					[
						[new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11)],
						[new RAnge(1, 7, 1, 11), new RAnge(1, 7, 1, 11), new RAnge(1, 7, 1, 11), new RAnge(1, 7, 1, 11)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 9), 'cccc',
					[
						[new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7)],
						[new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7)],
					]
				);
			});
			test('edit.stArt < rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 3, 1, 10), 'cccc',
					[
						[new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7), new RAnge(1, 4, 1, 7)],
						[new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7), new RAnge(1, 7, 1, 7)],
					]
				);
			});
			test('edit.stArt == rAnge.stArt && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 6), 'cccc',
					[
						[new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11)],
						[new RAnge(1, 8, 1, 11), new RAnge(1, 8, 1, 11), new RAnge(1, 8, 1, 11), new RAnge(1, 8, 1, 11)],
					]
				);
			});
			test('edit.stArt == rAnge.stArt && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 9), 'cccc',
					[
						[new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8)],
						[new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8)],
					]
				);
			});
			test('edit.stArt == rAnge.stArt && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 4, 1, 10), 'cccc',
					[
						[new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8), new RAnge(1, 4, 1, 8)],
						[new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8), new RAnge(1, 8, 1, 8)],
					]
				);
			});
			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end < rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 7), 'cccc',
					[
						[new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11)],
						[new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11), new RAnge(1, 4, 1, 11)],
					]
				);
			});
			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 9), 'cccc',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
					]
				);
			});
			test('edit.stArt > rAnge.stArt && edit.stArt < rAnge.end && edit.end > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 5, 1, 10), 'cccc',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
					]
				);
			});
			test('edit.stArt == rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 9, 1, 11), 'cccc',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 13), new RAnge(1, 4, 1, 13), new RAnge(1, 4, 1, 13), new RAnge(1, 4, 1, 13)],
					]
				);
			});
			test('edit.stArt > rAnge.end', () => {
				runTest(
					new RAnge(1, 4, 1, 9),
					new RAnge(1, 10, 1, 11), 'cccc',
					[
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
						[new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9), new RAnge(1, 4, 1, 9)],
					]
				);
			});
		});
	});
});

interfAce ILightWeightDecorAtion {
	id: string;
	rAnge: RAnge;
}

suite('deltADecorAtions', () => {

	function decorAtion(id: string, stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColum: number): ILightWeightDecorAtion {
		return {
			id: id,
			rAnge: new RAnge(stArtLineNumber, stArtColumn, endLineNumber, endColum)
		};
	}

	function toModelDeltADecorAtion(dec: ILightWeightDecorAtion): IModelDeltADecorAtion {
		return {
			rAnge: dec.rAnge,
			options: {
				clAssNAme: dec.id
			}
		};
	}

	function strcmp(A: string, b: string): number {
		if (A === b) {
			return 0;
		}
		if (A < b) {
			return -1;
		}
		return 1;
	}

	function reAdModelDecorAtions(model: TextModel, ids: string[]): ILightWeightDecorAtion[] {
		return ids.mAp((id) => {
			return {
				rAnge: model.getDecorAtionRAnge(id)!,
				id: model.getDecorAtionOptions(id)!.clAssNAme!
			};
		});
	}

	function testDeltADecorAtions(text: string[], decorAtions: ILightWeightDecorAtion[], newDecorAtions: ILightWeightDecorAtion[]): void {

		let model = creAteTextModel(text.join('\n'));

		// Add initiAl decorAtions & Assert they Are Added
		let initiAlIds = model.deltADecorAtions([], decorAtions.mAp(toModelDeltADecorAtion));
		let ActuAlDecorAtions = reAdModelDecorAtions(model, initiAlIds);

		Assert.equAl(initiAlIds.length, decorAtions.length, 'returns expected cnt of ids');
		Assert.equAl(initiAlIds.length, model.getAllDecorAtions().length, 'does not leAk decorAtions');
		ActuAlDecorAtions.sort((A, b) => strcmp(A.id, b.id));
		decorAtions.sort((A, b) => strcmp(A.id, b.id));
		Assert.deepEquAl(ActuAlDecorAtions, decorAtions);

		let newIds = model.deltADecorAtions(initiAlIds, newDecorAtions.mAp(toModelDeltADecorAtion));
		let ActuAlNewDecorAtions = reAdModelDecorAtions(model, newIds);

		Assert.equAl(newIds.length, newDecorAtions.length, 'returns expected cnt of ids');
		Assert.equAl(newIds.length, model.getAllDecorAtions().length, 'does not leAk decorAtions');
		ActuAlNewDecorAtions.sort((A, b) => strcmp(A.id, b.id));
		newDecorAtions.sort((A, b) => strcmp(A.id, b.id));
		Assert.deepEquAl(ActuAlDecorAtions, decorAtions);

		model.dispose();
	}

	function rAnge(stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColumn: number): RAnge {
		return new RAnge(stArtLineNumber, stArtColumn, endLineNumber, endColumn);
	}

	test('result respects input', () => {
		let model = creAteTextModel([
			'Hello world,',
			'How Are you?'
		].join('\n'));

		let ids = model.deltADecorAtions([], [
			toModelDeltADecorAtion(decorAtion('A', 1, 1, 1, 12)),
			toModelDeltADecorAtion(decorAtion('b', 2, 1, 2, 13))
		]);

		Assert.deepEquAl(model.getDecorAtionRAnge(ids[0]), rAnge(1, 1, 1, 12));
		Assert.deepEquAl(model.getDecorAtionRAnge(ids[1]), rAnge(2, 1, 2, 13));

		model.dispose();
	});

	test('deltADecorAtions 1', () => {
		testDeltADecorAtions(
			[
				'This is A text',
				'ThAt hAs multiple lines',
				'And is very friendly',
				'TowArds testing'
			],
			[
				decorAtion('A', 1, 1, 1, 2),
				decorAtion('b', 1, 1, 1, 15),
				decorAtion('c', 1, 1, 2, 1),
				decorAtion('d', 1, 1, 2, 24),
				decorAtion('e', 2, 1, 2, 24),
				decorAtion('f', 2, 1, 4, 16)
			],
			[
				decorAtion('x', 1, 1, 1, 2),
				decorAtion('b', 1, 1, 1, 15),
				decorAtion('c', 1, 1, 2, 1),
				decorAtion('d', 1, 1, 2, 24),
				decorAtion('e', 2, 1, 2, 21),
				decorAtion('f', 2, 17, 4, 16)
			]
		);
	});

	test('deltADecorAtions 2', () => {
		testDeltADecorAtions(
			[
				'This is A text',
				'ThAt hAs multiple lines',
				'And is very friendly',
				'TowArds testing'
			],
			[
				decorAtion('A', 1, 1, 1, 2),
				decorAtion('b', 1, 2, 1, 3),
				decorAtion('c', 1, 3, 1, 4),
				decorAtion('d', 1, 4, 1, 5),
				decorAtion('e', 1, 5, 1, 6)
			],
			[
				decorAtion('A', 1, 2, 1, 3),
				decorAtion('b', 1, 3, 1, 4),
				decorAtion('c', 1, 4, 1, 5),
				decorAtion('d', 1, 5, 1, 6)
			]
		);
	});

	test('deltADecorAtions 3', () => {
		testDeltADecorAtions(
			[
				'This is A text',
				'ThAt hAs multiple lines',
				'And is very friendly',
				'TowArds testing'
			],
			[
				decorAtion('A', 1, 1, 1, 2),
				decorAtion('b', 1, 2, 1, 3),
				decorAtion('c', 1, 3, 1, 4),
				decorAtion('d', 1, 4, 1, 5),
				decorAtion('e', 1, 5, 1, 6)
			],
			[]
		);
	});

	test('issue #4317: editor.setDecorAtions doesn\'t updAte the hover messAge', () => {

		let model = creAteTextModel('Hello world!');

		let ids = model.deltADecorAtions([], [{
			rAnge: {
				stArtLineNumber: 1,
				stArtColumn: 1,
				endLineNumber: 100,
				endColumn: 1
			},
			options: {
				hoverMessAge: { vAlue: 'hello1' }
			}
		}]);

		ids = model.deltADecorAtions(ids, [{
			rAnge: {
				stArtLineNumber: 1,
				stArtColumn: 1,
				endLineNumber: 100,
				endColumn: 1
			},
			options: {
				hoverMessAge: { vAlue: 'hello2' }
			}
		}]);

		let ActuAlDecorAtion = model.getDecorAtionOptions(ids[0]);

		Assert.deepEquAl(ActuAlDecorAtion!.hoverMessAge, { vAlue: 'hello2' });

		model.dispose();
	});

	test('model doesn\'t get confused with individuAl trAcked rAnges', () => {
		let model = creAteTextModel([
			'Hello world,',
			'How Are you?'
		].join('\n'));

		let trAckedRAngeId = model.chAngeDecorAtions((chAngeAcessor) => {
			return chAngeAcessor.AddDecorAtion(
				{
					stArtLineNumber: 1,
					stArtColumn: 1,
					endLineNumber: 1,
					endColumn: 1
				}, {
				stickiness: TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges
			}
			);
		});
		model.chAngeDecorAtions((chAngeAccessor) => {
			chAngeAccessor.removeDecorAtion(trAckedRAngeId!);
		});

		let ids = model.deltADecorAtions([], [
			toModelDeltADecorAtion(decorAtion('A', 1, 1, 1, 12)),
			toModelDeltADecorAtion(decorAtion('b', 2, 1, 2, 13))
		]);

		Assert.deepEquAl(model.getDecorAtionRAnge(ids[0]), rAnge(1, 1, 1, 12));
		Assert.deepEquAl(model.getDecorAtionRAnge(ids[1]), rAnge(2, 1, 2, 13));

		ids = model.deltADecorAtions(ids, [
			toModelDeltADecorAtion(decorAtion('A', 1, 1, 1, 12)),
			toModelDeltADecorAtion(decorAtion('b', 2, 1, 2, 13))
		]);

		Assert.deepEquAl(model.getDecorAtionRAnge(ids[0]), rAnge(1, 1, 1, 12));
		Assert.deepEquAl(model.getDecorAtionRAnge(ids[1]), rAnge(2, 1, 2, 13));

		model.dispose();
	});

	test('issue #16922: Clicking on link doesn\'t seem to do Anything', () => {
		let model = creAteTextModel([
			'Hello world,',
			'How Are you?',
			'Fine.',
			'Good.',
		].join('\n'));

		model.deltADecorAtions([], [
			{ rAnge: new RAnge(1, 1, 1, 1), options: { clAssNAme: '1' } },
			{ rAnge: new RAnge(1, 13, 1, 13), options: { clAssNAme: '2' } },
			{ rAnge: new RAnge(2, 1, 2, 1), options: { clAssNAme: '3' } },
			{ rAnge: new RAnge(2, 1, 2, 4), options: { clAssNAme: '4' } },
			{ rAnge: new RAnge(2, 8, 2, 13), options: { clAssNAme: '5' } },
			{ rAnge: new RAnge(3, 1, 4, 6), options: { clAssNAme: '6' } },
			{ rAnge: new RAnge(1, 1, 3, 6), options: { clAssNAme: 'x1' } },
			{ rAnge: new RAnge(2, 5, 2, 8), options: { clAssNAme: 'x2' } },
			{ rAnge: new RAnge(1, 1, 2, 8), options: { clAssNAme: 'x3' } },
			{ rAnge: new RAnge(2, 5, 3, 1), options: { clAssNAme: 'x4' } },
		]);

		let inRAnge = model.getDecorAtionsInRAnge(new RAnge(2, 6, 2, 6));

		let inRAngeClAssNAmes = inRAnge.mAp(d => d.options.clAssNAme);
		inRAngeClAssNAmes.sort();
		Assert.deepEquAl(inRAngeClAssNAmes, ['x1', 'x2', 'x3', 'x4']);

		model.dispose();
	});

	test('issue #41492: URL highlighting persists After pAsting over url', () => {

		let model = creAteTextModel([
			'My First Line'
		].join('\n'));

		const id = model.deltADecorAtions([], [{ rAnge: new RAnge(1, 2, 1, 14), options: { stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, collApseOnReplAceEdit: true } }])[0];
		model.ApplyEdits([{
			rAnge: new RAnge(1, 1, 1, 14),
			text: 'Some new text thAt is longer thAn the previous one',
			forceMoveMArkers: fAlse
		}]);
		const ActuAl = model.getDecorAtionRAnge(id);
		Assert.deepEquAl(ActuAl, new RAnge(1, 1, 1, 1));

		model.dispose();
	});
});
