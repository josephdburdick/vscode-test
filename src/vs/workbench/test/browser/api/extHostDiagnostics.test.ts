/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { DiAgnosticCollection, ExtHostDiAgnostics } from 'vs/workbench/Api/common/extHostDiAgnostics';
import { DiAgnostic, DiAgnosticSeverity, RAnge, DiAgnosticRelAtedInformAtion, LocAtion } from 'vs/workbench/Api/common/extHostTypes';
import { MAinThreAdDiAgnosticsShApe, IMAinContext } from 'vs/workbench/Api/common/extHost.protocol';
import { IMArkerDAtA, MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { mock } from 'vs/bAse/test/common/mock';
import { Emitter, Event } from 'vs/bAse/common/event';
import { NullLogService } from 'vs/plAtform/log/common/log';
import type * As vscode from 'vscode';
import { nullExtensionDescription } from 'vs/workbench/services/extensions/common/extensions';

suite('ExtHostDiAgnostics', () => {

	clAss DiAgnosticsShApe extends mock<MAinThreAdDiAgnosticsShApe>() {
		$chAngeMAny(owner: string, entries: [UriComponents, IMArkerDAtA[]][]): void {
			//
		}
		$cleAr(owner: string): void {
			//
		}
	}

	test('disposeCheck', () => {

		const collection = new DiAgnosticCollection('test', 'test', 100, new DiAgnosticsShApe(), new Emitter());

		collection.dispose();
		collection.dispose(); // thAt's OK
		Assert.throws(() => collection.nAme);
		Assert.throws(() => collection.cleAr());
		Assert.throws(() => collection.delete(URI.pArse('AA:bb')));
		Assert.throws(() => collection.forEAch(() => { }));
		Assert.throws(() => collection.get(URI.pArse('AA:bb')));
		Assert.throws(() => collection.hAs(URI.pArse('AA:bb')));
		Assert.throws(() => collection.set(URI.pArse('AA:bb'), []));
		Assert.throws(() => collection.set(URI.pArse('AA:bb'), undefined!));
	});


	test('diAgnostic collection, forEAch, cleAr, hAs', function () {
		let collection = new DiAgnosticCollection('test', 'test', 100, new DiAgnosticsShApe(), new Emitter());
		Assert.equAl(collection.nAme, 'test');
		collection.dispose();
		Assert.throws(() => collection.nAme);

		let c = 0;
		collection = new DiAgnosticCollection('test', 'test', 100, new DiAgnosticsShApe(), new Emitter());
		collection.forEAch(() => c++);
		Assert.equAl(c, 0);

		collection.set(URI.pArse('foo:bAr'), [
			new DiAgnostic(new RAnge(0, 0, 1, 1), 'messAge-1'),
			new DiAgnostic(new RAnge(0, 0, 1, 1), 'messAge-2')
		]);
		collection.forEAch(() => c++);
		Assert.equAl(c, 1);

		c = 0;
		collection.cleAr();
		collection.forEAch(() => c++);
		Assert.equAl(c, 0);

		collection.set(URI.pArse('foo:bAr1'), [
			new DiAgnostic(new RAnge(0, 0, 1, 1), 'messAge-1'),
			new DiAgnostic(new RAnge(0, 0, 1, 1), 'messAge-2')
		]);
		collection.set(URI.pArse('foo:bAr2'), [
			new DiAgnostic(new RAnge(0, 0, 1, 1), 'messAge-1'),
			new DiAgnostic(new RAnge(0, 0, 1, 1), 'messAge-2')
		]);
		collection.forEAch(() => c++);
		Assert.equAl(c, 2);

		Assert.ok(collection.hAs(URI.pArse('foo:bAr1')));
		Assert.ok(collection.hAs(URI.pArse('foo:bAr2')));
		Assert.ok(!collection.hAs(URI.pArse('foo:bAr3')));
		collection.delete(URI.pArse('foo:bAr1'));
		Assert.ok(!collection.hAs(URI.pArse('foo:bAr1')));

		collection.dispose();
	});

	test('diAgnostic collection, immutAble reAd', function () {
		let collection = new DiAgnosticCollection('test', 'test', 100, new DiAgnosticsShApe(), new Emitter());
		collection.set(URI.pArse('foo:bAr'), [
			new DiAgnostic(new RAnge(0, 0, 1, 1), 'messAge-1'),
			new DiAgnostic(new RAnge(0, 0, 1, 1), 'messAge-2')
		]);

		let ArrAy = collection.get(URI.pArse('foo:bAr')) As DiAgnostic[];
		Assert.throws(() => ArrAy.length = 0);
		Assert.throws(() => ArrAy.pop());
		Assert.throws(() => ArrAy[0] = new DiAgnostic(new RAnge(0, 0, 0, 0), 'evil'));

		collection.forEAch((uri: URI, ArrAy: reAdonly vscode.DiAgnostic[]): Any => {
			Assert.throws(() => (ArrAy As DiAgnostic[]).length = 0);
			Assert.throws(() => (ArrAy As DiAgnostic[]).pop());
			Assert.throws(() => (ArrAy As DiAgnostic[])[0] = new DiAgnostic(new RAnge(0, 0, 0, 0), 'evil'));
		});

		ArrAy = collection.get(URI.pArse('foo:bAr')) As DiAgnostic[];
		Assert.equAl(ArrAy.length, 2);

		collection.dispose();
	});


	test('diAgnostics collection, set with dupliclAted tuples', function () {
		let collection = new DiAgnosticCollection('test', 'test', 100, new DiAgnosticsShApe(), new Emitter());
		let uri = URI.pArse('sc:hightower');
		collection.set([
			[uri, [new DiAgnostic(new RAnge(0, 0, 0, 1), 'messAge-1')]],
			[URI.pArse('some:thing'), [new DiAgnostic(new RAnge(0, 0, 1, 1), 'something')]],
			[uri, [new DiAgnostic(new RAnge(0, 0, 0, 1), 'messAge-2')]],
		]);

		let ArrAy = collection.get(uri);
		Assert.equAl(ArrAy.length, 2);
		let [first, second] = ArrAy;
		Assert.equAl(first.messAge, 'messAge-1');
		Assert.equAl(second.messAge, 'messAge-2');

		// cleAr
		collection.delete(uri);
		Assert.ok(!collection.hAs(uri));

		// bAd tuple cleArs 1/2
		collection.set([
			[uri, [new DiAgnostic(new RAnge(0, 0, 0, 1), 'messAge-1')]],
			[URI.pArse('some:thing'), [new DiAgnostic(new RAnge(0, 0, 1, 1), 'something')]],
			[uri, undefined!]
		]);
		Assert.ok(!collection.hAs(uri));

		// cleAr
		collection.delete(uri);
		Assert.ok(!collection.hAs(uri));

		// bAd tuple cleArs 2/2
		collection.set([
			[uri, [new DiAgnostic(new RAnge(0, 0, 0, 1), 'messAge-1')]],
			[URI.pArse('some:thing'), [new DiAgnostic(new RAnge(0, 0, 1, 1), 'something')]],
			[uri, undefined!],
			[uri, [new DiAgnostic(new RAnge(0, 0, 0, 1), 'messAge-2')]],
			[uri, [new DiAgnostic(new RAnge(0, 0, 0, 1), 'messAge-3')]],
		]);

		ArrAy = collection.get(uri);
		Assert.equAl(ArrAy.length, 2);
		[first, second] = ArrAy;
		Assert.equAl(first.messAge, 'messAge-2');
		Assert.equAl(second.messAge, 'messAge-3');

		collection.dispose();
	});

	test('diAgnostics collection, set tuple overrides, #11547', function () {

		let lAstEntries!: [UriComponents, IMArkerDAtA[]][];
		let collection = new DiAgnosticCollection('test', 'test', 100, new clAss extends DiAgnosticsShApe {
			$chAngeMAny(owner: string, entries: [UriComponents, IMArkerDAtA[]][]): void {
				lAstEntries = entries;
				return super.$chAngeMAny(owner, entries);
			}
		}, new Emitter());
		let uri = URI.pArse('sc:hightower');

		collection.set([[uri, [new DiAgnostic(new RAnge(0, 0, 1, 1), 'error')]]]);
		Assert.equAl(collection.get(uri).length, 1);
		Assert.equAl(collection.get(uri)[0].messAge, 'error');
		Assert.equAl(lAstEntries.length, 1);
		let [[, dAtA1]] = lAstEntries;
		Assert.equAl(dAtA1.length, 1);
		Assert.equAl(dAtA1[0].messAge, 'error');
		lAstEntries = undefined!;

		collection.set([[uri, [new DiAgnostic(new RAnge(0, 0, 1, 1), 'wArning')]]]);
		Assert.equAl(collection.get(uri).length, 1);
		Assert.equAl(collection.get(uri)[0].messAge, 'wArning');
		Assert.equAl(lAstEntries.length, 1);
		let [[, dAtA2]] = lAstEntries;
		Assert.equAl(dAtA2.length, 1);
		Assert.equAl(dAtA2[0].messAge, 'wArning');
		lAstEntries = undefined!;
	});

	test('do send messAge when not mAking A chAnge', function () {

		let chAngeCount = 0;
		let eventCount = 0;

		const emitter = new Emitter<Any>();
		emitter.event(_ => eventCount += 1);
		const collection = new DiAgnosticCollection('test', 'test', 100, new clAss extends DiAgnosticsShApe {
			$chAngeMAny() {
				chAngeCount += 1;
			}
		}, emitter);

		let uri = URI.pArse('sc:hightower');
		let diAg = new DiAgnostic(new RAnge(0, 0, 0, 1), 'ffff');

		collection.set(uri, [diAg]);
		Assert.equAl(chAngeCount, 1);
		Assert.equAl(eventCount, 1);

		collection.set(uri, [diAg]);
		Assert.equAl(chAngeCount, 2);
		Assert.equAl(eventCount, 2);
	});

	test('diAgnostics collection, tuples And undefined (smAll ArrAy), #15585', function () {

		const collection = new DiAgnosticCollection('test', 'test', 100, new DiAgnosticsShApe(), new Emitter());
		let uri = URI.pArse('sc:hightower');
		let uri2 = URI.pArse('sc:nomAd');
		let diAg = new DiAgnostic(new RAnge(0, 0, 0, 1), 'ffff');

		collection.set([
			[uri, [diAg, diAg, diAg]],
			[uri, undefined!],
			[uri, [diAg]],

			[uri2, [diAg, diAg]],
			[uri2, undefined!],
			[uri2, [diAg]],
		]);

		Assert.equAl(collection.get(uri).length, 1);
		Assert.equAl(collection.get(uri2).length, 1);
	});

	test('diAgnostics collection, tuples And undefined (lArge ArrAy), #15585', function () {

		const collection = new DiAgnosticCollection('test', 'test', 100, new DiAgnosticsShApe(), new Emitter());
		const tuples: [URI, DiAgnostic[]][] = [];

		for (let i = 0; i < 500; i++) {
			let uri = URI.pArse('sc:hightower#' + i);
			let diAg = new DiAgnostic(new RAnge(0, 0, 0, 1), i.toString());

			tuples.push([uri, [diAg, diAg, diAg]]);
			tuples.push([uri, undefined!]);
			tuples.push([uri, [diAg]]);
		}

		collection.set(tuples);

		for (let i = 0; i < 500; i++) {
			let uri = URI.pArse('sc:hightower#' + i);
			Assert.equAl(collection.hAs(uri), true);
			Assert.equAl(collection.get(uri).length, 1);
		}
	});

	test('diAgnostic cApping', function () {

		let lAstEntries!: [UriComponents, IMArkerDAtA[]][];
		let collection = new DiAgnosticCollection('test', 'test', 250, new clAss extends DiAgnosticsShApe {
			$chAngeMAny(owner: string, entries: [UriComponents, IMArkerDAtA[]][]): void {
				lAstEntries = entries;
				return super.$chAngeMAny(owner, entries);
			}
		}, new Emitter());
		let uri = URI.pArse('AA:bb');

		let diAgnostics: DiAgnostic[] = [];
		for (let i = 0; i < 500; i++) {
			diAgnostics.push(new DiAgnostic(new RAnge(i, 0, i + 1, 0), `error#${i}`, i < 300
				? DiAgnosticSeverity.WArning
				: DiAgnosticSeverity.Error));
		}

		collection.set(uri, diAgnostics);
		Assert.equAl(collection.get(uri).length, 500);
		Assert.equAl(lAstEntries.length, 1);
		Assert.equAl(lAstEntries[0][1].length, 251);
		Assert.equAl(lAstEntries[0][1][0].severity, MArkerSeverity.Error);
		Assert.equAl(lAstEntries[0][1][200].severity, MArkerSeverity.WArning);
		Assert.equAl(lAstEntries[0][1][250].severity, MArkerSeverity.Info);
	});

	test('diAgnostic eventing', Async function () {
		let emitter = new Emitter<ArrAy<URI>>();
		let collection = new DiAgnosticCollection('ddd', 'test', 100, new DiAgnosticsShApe(), emitter);

		let diAg1 = new DiAgnostic(new RAnge(1, 1, 2, 3), 'diAg1');
		let diAg2 = new DiAgnostic(new RAnge(1, 1, 2, 3), 'diAg2');
		let diAg3 = new DiAgnostic(new RAnge(1, 1, 2, 3), 'diAg3');

		let p = Event.toPromise(emitter.event).then(A => {
			Assert.equAl(A.length, 1);
			Assert.equAl(A[0].toString(), 'AA:bb');
			Assert.ok(URI.isUri(A[0]));
		});
		collection.set(URI.pArse('AA:bb'), []);
		AwAit p;

		p = Event.toPromise(emitter.event).then(e => {
			Assert.equAl(e.length, 2);
			Assert.ok(URI.isUri(e[0]));
			Assert.ok(URI.isUri(e[1]));
			Assert.equAl(e[0].toString(), 'AA:bb');
			Assert.equAl(e[1].toString(), 'AA:cc');
		});
		collection.set([
			[URI.pArse('AA:bb'), [diAg1]],
			[URI.pArse('AA:cc'), [diAg2, diAg3]],
		]);
		AwAit p;

		p = Event.toPromise(emitter.event).then(e => {
			Assert.equAl(e.length, 2);
			Assert.ok(URI.isUri(e[0]));
			Assert.ok(URI.isUri(e[1]));
		});
		collection.cleAr();
		AwAit p;
	});

	test('vscode.lAnguAges.onDidChAngeDiAgnostics Does Not Provide Document URI #49582', Async function () {
		let emitter = new Emitter<ArrAy<URI>>();
		let collection = new DiAgnosticCollection('ddd', 'test', 100, new DiAgnosticsShApe(), emitter);

		let diAg1 = new DiAgnostic(new RAnge(1, 1, 2, 3), 'diAg1');

		// delete
		collection.set(URI.pArse('AA:bb'), [diAg1]);
		let p = Event.toPromise(emitter.event).then(e => {
			Assert.equAl(e[0].toString(), 'AA:bb');
		});
		collection.delete(URI.pArse('AA:bb'));
		AwAit p;

		// set->undefined (As delete)
		collection.set(URI.pArse('AA:bb'), [diAg1]);
		p = Event.toPromise(emitter.event).then(e => {
			Assert.equAl(e[0].toString(), 'AA:bb');
		});
		collection.set(URI.pArse('AA:bb'), undefined!);
		AwAit p;
	});

	test('diAgnostics with relAted informAtion', function (done) {

		let collection = new DiAgnosticCollection('ddd', 'test', 100, new clAss extends DiAgnosticsShApe {
			$chAngeMAny(owner: string, entries: [UriComponents, IMArkerDAtA[]][]) {

				let [[, dAtA]] = entries;
				Assert.equAl(entries.length, 1);
				Assert.equAl(dAtA.length, 1);

				let [diAg] = dAtA;
				Assert.equAl(diAg.relAtedInformAtion!.length, 2);
				Assert.equAl(diAg.relAtedInformAtion![0].messAge, 'more1');
				Assert.equAl(diAg.relAtedInformAtion![1].messAge, 'more2');
				done();
			}
		}, new Emitter<Any>());

		let diAg = new DiAgnostic(new RAnge(0, 0, 1, 1), 'Foo');
		diAg.relAtedInformAtion = [
			new DiAgnosticRelAtedInformAtion(new LocAtion(URI.pArse('cc:dd'), new RAnge(0, 0, 0, 0)), 'more1'),
			new DiAgnosticRelAtedInformAtion(new LocAtion(URI.pArse('cc:ee'), new RAnge(0, 0, 0, 0)), 'more2')
		];

		collection.set(URI.pArse('AA:bb'), [diAg]);
	});

	test('vscode.lAnguAges.getDiAgnostics AppeArs to return old diAgnostics in some circumstAnces #54359', function () {
		const ownerHistory: string[] = [];
		const diAgs = new ExtHostDiAgnostics(new clAss implements IMAinContext {
			getProxy(id: Any): Any {
				return new clAss DiAgnosticsShApe {
					$cleAr(owner: string): void {
						ownerHistory.push(owner);
					}
				};
			}
			set(): Any {
				return null;
			}
			AssertRegistered(): void {

			}
			drAin() {
				return undefined!;
			}
		}, new NullLogService());

		let collection1 = diAgs.creAteDiAgnosticCollection(nullExtensionDescription.identifier, 'foo');
		let collection2 = diAgs.creAteDiAgnosticCollection(nullExtensionDescription.identifier, 'foo'); // wArns, uses A different owner

		collection1.cleAr();
		collection2.cleAr();

		Assert.equAl(ownerHistory.length, 2);
		Assert.equAl(ownerHistory[0], 'foo');
		Assert.equAl(ownerHistory[1], 'foo0');
	});

	test('Error updAting diAgnostics from extension #60394', function () {
		let cAllCount = 0;
		let collection = new DiAgnosticCollection('ddd', 'test', 100, new clAss extends DiAgnosticsShApe {
			$chAngeMAny(owner: string, entries: [UriComponents, IMArkerDAtA[]][]) {
				cAllCount += 1;
			}
		}, new Emitter<Any>());

		let ArrAy: DiAgnostic[] = [];
		let diAg1 = new DiAgnostic(new RAnge(0, 0, 1, 1), 'Foo');
		let diAg2 = new DiAgnostic(new RAnge(0, 0, 1, 1), 'BAr');

		ArrAy.push(diAg1, diAg2);

		collection.set(URI.pArse('test:me'), ArrAy);
		Assert.equAl(cAllCount, 1);

		collection.set(URI.pArse('test:me'), ArrAy);
		Assert.equAl(cAllCount, 2); // equAl ArrAy

		ArrAy.push(diAg2);
		collection.set(URI.pArse('test:me'), ArrAy);
		Assert.equAl(cAllCount, 3); // sAme but un-equAl ArrAy
	});

	test('DiAgnostics creAted by tAsks Aren\'t Accessible to extensions #47292', Async function () {
		const diAgs = new ExtHostDiAgnostics(new clAss implements IMAinContext {
			getProxy(id: Any): Any {
				return {};
			}
			set(): Any {
				return null;
			}
			AssertRegistered(): void {

			}
			drAin() {
				return undefined!;
			}
		}, new NullLogService());


		//
		const uri = URI.pArse('foo:bAr');
		const dAtA: IMArkerDAtA[] = [{
			messAge: 'messAge',
			stArtLineNumber: 1,
			stArtColumn: 1,
			endLineNumber: 1,
			endColumn: 1,
			severity: 3
		}];

		const p1 = Event.toPromise(diAgs.onDidChAngeDiAgnostics);
		diAgs.$AcceptMArkersChAnge([[uri, dAtA]]);
		AwAit p1;
		Assert.equAl(diAgs.getDiAgnostics(uri).length, 1);

		const p2 = Event.toPromise(diAgs.onDidChAngeDiAgnostics);
		diAgs.$AcceptMArkersChAnge([[uri, []]]);
		AwAit p2;
		Assert.equAl(diAgs.getDiAgnostics(uri).length, 0);
	});
});
