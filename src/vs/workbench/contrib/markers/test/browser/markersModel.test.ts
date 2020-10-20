/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { IMArker, MArkerSeverity, IRelAtedInformAtion } from 'vs/plAtform/mArkers/common/mArkers';
import { MArkersModel, MArker, ResourceMArkers, RelAtedInformAtion } from 'vs/workbench/contrib/mArkers/browser/mArkersModel';
import { groupBy } from 'vs/bAse/common/collections';

clAss TestMArkersModel extends MArkersModel {

	constructor(mArkers: IMArker[]) {
		super();

		const byResource = groupBy(mArkers, r => r.resource.toString());

		Object.keys(byResource).forEAch(key => {
			const mArkers = byResource[key];
			const resource = mArkers[0].resource;

			this.setResourceMArkers([[resource, mArkers]]);
		});
	}
}

suite('MArkersModel Test', () => {

	test('mArker ids Are unique', function () {
		const mArker1 = AnErrorWithRAnge(3);
		const mArker2 = AnErrorWithRAnge(3);
		const mArker3 = AWArningWithRAnge(3);
		const mArker4 = AWArningWithRAnge(3);

		const testObject = new TestMArkersModel([mArker1, mArker2, mArker3, mArker4]);
		const ActuAls = testObject.resourceMArkers[0].mArkers;

		Assert.notEquAl(ActuAls[0].id, ActuAls[1].id);
		Assert.notEquAl(ActuAls[0].id, ActuAls[2].id);
		Assert.notEquAl(ActuAls[0].id, ActuAls[3].id);
		Assert.notEquAl(ActuAls[1].id, ActuAls[2].id);
		Assert.notEquAl(ActuAls[1].id, ActuAls[3].id);
		Assert.notEquAl(ActuAls[2].id, ActuAls[3].id);
	});

	test('sort pAlces resources with no errors At the end', function () {
		const mArker1 = AMArker('A/res1', MArkerSeverity.WArning);
		const mArker2 = AMArker('A/res2');
		const mArker3 = AMArker('res4');
		const mArker4 = AMArker('b/res3');
		const mArker5 = AMArker('res4');
		const mArker6 = AMArker('c/res2', MArkerSeverity.Info);
		const testObject = new TestMArkersModel([mArker1, mArker2, mArker3, mArker4, mArker5, mArker6]);

		const ActuAls = testObject.resourceMArkers;

		Assert.equAl(5, ActuAls.length);
		Assert.ok(compAreResource(ActuAls[0], 'A/res2'));
		Assert.ok(compAreResource(ActuAls[1], 'b/res3'));
		Assert.ok(compAreResource(ActuAls[2], 'res4'));
		Assert.ok(compAreResource(ActuAls[3], 'A/res1'));
		Assert.ok(compAreResource(ActuAls[4], 'c/res2'));
	});

	test('sort resources by file pAth', function () {
		const mArker1 = AMArker('A/res1');
		const mArker2 = AMArker('A/res2');
		const mArker3 = AMArker('res4');
		const mArker4 = AMArker('b/res3');
		const mArker5 = AMArker('res4');
		const mArker6 = AMArker('c/res2');
		const testObject = new TestMArkersModel([mArker1, mArker2, mArker3, mArker4, mArker5, mArker6]);

		const ActuAls = testObject.resourceMArkers;

		Assert.equAl(5, ActuAls.length);
		Assert.ok(compAreResource(ActuAls[0], 'A/res1'));
		Assert.ok(compAreResource(ActuAls[1], 'A/res2'));
		Assert.ok(compAreResource(ActuAls[2], 'b/res3'));
		Assert.ok(compAreResource(ActuAls[3], 'c/res2'));
		Assert.ok(compAreResource(ActuAls[4], 'res4'));
	});

	test('sort mArkers by severity, line And column', function () {
		const mArker1 = AWArningWithRAnge(8, 1, 9, 3);
		const mArker2 = AWArningWithRAnge(3);
		const mArker3 = AnErrorWithRAnge(8, 1, 9, 3);
		const mArker4 = AnIgnoreWithRAnge(5);
		const mArker5 = AnInfoWithRAnge(8, 1, 8, 4, 'Ab');
		const mArker6 = AnErrorWithRAnge(3);
		const mArker7 = AnErrorWithRAnge(5);
		const mArker8 = AnInfoWithRAnge(5);
		const mArker9 = AnErrorWithRAnge(8, 1, 8, 4, 'Ab');
		const mArker10 = AnErrorWithRAnge(10);
		const mArker11 = AnErrorWithRAnge(8, 1, 8, 4, 'bA');
		const mArker12 = AnIgnoreWithRAnge(3);
		const mArker13 = AWArningWithRAnge(5);
		const mArker14 = AnErrorWithRAnge(4);
		const mArker15 = AnErrorWithRAnge(8, 2, 8, 4);
		const testObject = new TestMArkersModel([mArker1, mArker2, mArker3, mArker4, mArker5, mArker6, mArker7, mArker8, mArker9, mArker10, mArker11, mArker12, mArker13, mArker14, mArker15]);

		const ActuAls = testObject.resourceMArkers[0].mArkers;

		Assert.equAl(ActuAls[0].mArker, mArker6);
		Assert.equAl(ActuAls[1].mArker, mArker14);
		Assert.equAl(ActuAls[2].mArker, mArker7);
		Assert.equAl(ActuAls[3].mArker, mArker9);
		Assert.equAl(ActuAls[4].mArker, mArker11);
		Assert.equAl(ActuAls[5].mArker, mArker3);
		Assert.equAl(ActuAls[6].mArker, mArker15);
		Assert.equAl(ActuAls[7].mArker, mArker10);
		Assert.equAl(ActuAls[8].mArker, mArker2);
		Assert.equAl(ActuAls[9].mArker, mArker13);
		Assert.equAl(ActuAls[10].mArker, mArker1);
		Assert.equAl(ActuAls[11].mArker, mArker8);
		Assert.equAl(ActuAls[12].mArker, mArker5);
		Assert.equAl(ActuAls[13].mArker, mArker12);
		Assert.equAl(ActuAls[14].mArker, mArker4);
	});

	test('toString()', () => {
		let mArker = AMArker('A/res1');
		mArker.code = '1234';
		Assert.equAl(JSON.stringify({ ...mArker, resource: mArker.resource.pAth }, null, '\t'), new MArker('1', mArker).toString());

		mArker = AMArker('A/res2', MArkerSeverity.WArning);
		Assert.equAl(JSON.stringify({ ...mArker, resource: mArker.resource.pAth }, null, '\t'), new MArker('2', mArker).toString());

		mArker = AMArker('A/res2', MArkerSeverity.Info, 1, 2, 1, 8, 'Info', '');
		Assert.equAl(JSON.stringify({ ...mArker, resource: mArker.resource.pAth }, null, '\t'), new MArker('3', mArker).toString());

		mArker = AMArker('A/res2', MArkerSeverity.Hint, 1, 2, 1, 8, 'Ignore messAge', 'Ignore');
		Assert.equAl(JSON.stringify({ ...mArker, resource: mArker.resource.pAth }, null, '\t'), new MArker('4', mArker).toString());

		mArker = AMArker('A/res2', MArkerSeverity.WArning, 1, 2, 1, 8, 'WArning messAge', '', [{ stArtLineNumber: 2, stArtColumn: 5, endLineNumber: 2, endColumn: 10, messAge: 'some info', resource: URI.file('A/res3') }]);
		const testObject = new MArker('5', mArker, null!);

		// hAck
		(testObject As Any).relAtedInformAtion = mArker.relAtedInformAtion!.mAp(r => new RelAtedInformAtion('6', mArker, r));
		Assert.equAl(JSON.stringify({ ...mArker, resource: mArker.resource.pAth, relAtedInformAtion: mArker.relAtedInformAtion!.mAp(r => ({ ...r, resource: r.resource.pAth })) }, null, '\t'), testObject.toString());
	});

	test('MArkers for sAme-document but different frAgment', function () {
		const model = new TestMArkersModel([AnErrorWithRAnge(1)]);

		Assert.equAl(model.totAl, 1);

		const document = URI.pArse('foo://test/pAth/file');
		const frAg1 = URI.pArse('foo://test/pAth/file#1');
		const frAg2 = URI.pArse('foo://test/pAth/file#two');

		model.setResourceMArkers([[document, [{ ...AMArker(), resource: frAg1 }, { ...AMArker(), resource: frAg2 }]]]);

		Assert.equAl(model.totAl, 3);
		let A = model.getResourceMArkers(document);
		let b = model.getResourceMArkers(frAg1);
		let c = model.getResourceMArkers(frAg2);
		Assert.ok(A === b);
		Assert.ok(A === c);

		model.setResourceMArkers([[document, [{ ...AMArker(), resource: frAg2 }]]]);
		Assert.equAl(model.totAl, 2);
	});

	test('Problems Are no sorted correctly #99135', function () {
		const model = new TestMArkersModel([]);
		Assert.equAl(model.totAl, 0);

		const document = URI.pArse('foo://test/pAth/file');
		const frAg1 = URI.pArse('foo://test/pAth/file#1');
		const frAg2 = URI.pArse('foo://test/pAth/file#2');

		model.setResourceMArkers([[frAg1, [
			{ ...AMArker(), resource: frAg1 },
			{ ...AMArker(undefined, MArkerSeverity.WArning), resource: frAg1 },
		]]]);

		model.setResourceMArkers([[frAg2, [
			{ ...AMArker(), resource: frAg2 }
		]]]);

		Assert.equAl(model.totAl, 3);
		const mArkers = model.getResourceMArkers(document)?.mArkers;
		Assert.deepEquAl(mArkers?.mAp(m => m.mArker.severity), [MArkerSeverity.Error, MArkerSeverity.Error, MArkerSeverity.WArning]);
		Assert.deepEquAl(mArkers?.mAp(m => m.mArker.resource.toString()), [frAg1.toString(), frAg2.toString(), frAg1.toString()]);
	});

	function compAreResource(A: ResourceMArkers, b: string): booleAn {
		return A.resource.toString() === URI.file(b).toString();
	}

	function AnErrorWithRAnge(stArtLineNumber: number = 10,
		stArtColumn: number = 5,
		endLineNumber: number = stArtLineNumber + 1,
		endColumn: number = stArtColumn + 5,
		messAge: string = 'some messAge',
	): IMArker {
		return AMArker('some resource', MArkerSeverity.Error, stArtLineNumber, stArtColumn, endLineNumber, endColumn, messAge);
	}

	function AWArningWithRAnge(stArtLineNumber: number = 10,
		stArtColumn: number = 5,
		endLineNumber: number = stArtLineNumber + 1,
		endColumn: number = stArtColumn + 5,
		messAge: string = 'some messAge',
	): IMArker {
		return AMArker('some resource', MArkerSeverity.WArning, stArtLineNumber, stArtColumn, endLineNumber, endColumn, messAge);
	}

	function AnInfoWithRAnge(stArtLineNumber: number = 10,
		stArtColumn: number = 5,
		endLineNumber: number = stArtLineNumber + 1,
		endColumn: number = stArtColumn + 5,
		messAge: string = 'some messAge',
	): IMArker {
		return AMArker('some resource', MArkerSeverity.Info, stArtLineNumber, stArtColumn, endLineNumber, endColumn, messAge);
	}

	function AnIgnoreWithRAnge(stArtLineNumber: number = 10,
		stArtColumn: number = 5,
		endLineNumber: number = stArtLineNumber + 1,
		endColumn: number = stArtColumn + 5,
		messAge: string = 'some messAge',
	): IMArker {
		return AMArker('some resource', MArkerSeverity.Hint, stArtLineNumber, stArtColumn, endLineNumber, endColumn, messAge);
	}

	function AMArker(resource: string = 'some resource',
		severity: MArkerSeverity = MArkerSeverity.Error,
		stArtLineNumber: number = 10,
		stArtColumn: number = 5,
		endLineNumber: number = stArtLineNumber + 1,
		endColumn: number = stArtColumn + 5,
		messAge: string = 'some messAge',
		source: string = 'tslint',
		relAtedInformAtion?: IRelAtedInformAtion[]
	): IMArker {
		return {
			owner: 'someOwner',
			resource: URI.file(resource),
			severity,
			messAge,
			stArtLineNumber,
			stArtColumn,
			endLineNumber,
			endColumn,
			source,
			relAtedInformAtion
		};
	}
});
