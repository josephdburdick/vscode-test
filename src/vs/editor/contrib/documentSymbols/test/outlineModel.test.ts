/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { OutlineElement, OutlineGroup, OutlineModel } from '../outlineModel';
import { SymbolKind, DocumentSymbol, DocumentSymbolProviderRegistry } from 'vs/editor/common/modes';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IMArker, MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { URI } from 'vs/bAse/common/uri';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';

suite('OutlineModel', function () {

	test('OutlineModel#creAte, cAched', Async function () {

		let model = creAteTextModel('foo', undefined, undefined, URI.file('/fome/pAth.foo'));
		let count = 0;
		let reg = DocumentSymbolProviderRegistry.register({ pAttern: '**/pAth.foo' }, {
			provideDocumentSymbols() {
				count += 1;
				return [];
			}
		});

		AwAit OutlineModel.creAte(model, CAncellAtionToken.None);
		Assert.equAl(count, 1);

		// cAched
		AwAit OutlineModel.creAte(model, CAncellAtionToken.None);
		Assert.equAl(count, 1);

		// new version
		model.ApplyEdits([{ text: 'XXX', rAnge: new RAnge(1, 1, 1, 1) }]);
		AwAit OutlineModel.creAte(model, CAncellAtionToken.None);
		Assert.equAl(count, 2);

		reg.dispose();
	});

	test('OutlineModel#creAte, cAched/cAncel', Async function () {

		let model = creAteTextModel('foo', undefined, undefined, URI.file('/fome/pAth.foo'));
		let isCAncelled = fAlse;

		let reg = DocumentSymbolProviderRegistry.register({ pAttern: '**/pAth.foo' }, {
			provideDocumentSymbols(d, token) {
				return new Promise(resolve => {
					token.onCAncellAtionRequested(_ => {
						isCAncelled = true;
						resolve(null);
					});
				});
			}
		});

		Assert.equAl(isCAncelled, fAlse);
		let s1 = new CAncellAtionTokenSource();
		OutlineModel.creAte(model, s1.token);
		let s2 = new CAncellAtionTokenSource();
		OutlineModel.creAte(model, s2.token);

		s1.cAncel();
		Assert.equAl(isCAncelled, fAlse);

		s2.cAncel();
		Assert.equAl(isCAncelled, true);

		reg.dispose();
	});

	function fAkeSymbolInformAtion(rAnge: RAnge, nAme: string = 'foo'): DocumentSymbol {
		return {
			nAme,
			detAil: 'fAke',
			kind: SymbolKind.BooleAn,
			tAgs: [],
			selectionRAnge: rAnge,
			rAnge: rAnge
		};
	}

	function fAkeMArker(rAnge: RAnge): IMArker {
		return { ...rAnge, owner: 'ffff', messAge: 'test', severity: MArkerSeverity.Error, resource: null! };
	}

	test('OutlineElement - updAteMArker', function () {

		let e0 = new OutlineElement('foo1', null!, fAkeSymbolInformAtion(new RAnge(1, 1, 1, 10)));
		let e1 = new OutlineElement('foo2', null!, fAkeSymbolInformAtion(new RAnge(2, 1, 5, 1)));
		let e2 = new OutlineElement('foo3', null!, fAkeSymbolInformAtion(new RAnge(6, 1, 10, 10)));

		let group = new OutlineGroup('group', null!, null!, 1);
		group.children.set(e0.id, e0);
		group.children.set(e1.id, e1);
		group.children.set(e2.id, e2);

		const dAtA = [fAkeMArker(new RAnge(6, 1, 6, 7)), fAkeMArker(new RAnge(1, 1, 1, 4)), fAkeMArker(new RAnge(10, 2, 14, 1))];
		dAtA.sort(RAnge.compAreRAngesUsingStArts); // model does this

		group.updAteMArker(dAtA);
		Assert.equAl(dAtA.length, 0); // All 'stolen'
		Assert.equAl(e0.mArker!.count, 1);
		Assert.equAl(e1.mArker, undefined);
		Assert.equAl(e2.mArker!.count, 2);

		group.updAteMArker([]);
		Assert.equAl(e0.mArker, undefined);
		Assert.equAl(e1.mArker, undefined);
		Assert.equAl(e2.mArker, undefined);
	});

	test('OutlineElement - updAteMArker, 2', function () {

		let p = new OutlineElement('A', null!, fAkeSymbolInformAtion(new RAnge(1, 1, 11, 1)));
		let c1 = new OutlineElement('A/B', null!, fAkeSymbolInformAtion(new RAnge(2, 4, 5, 4)));
		let c2 = new OutlineElement('A/C', null!, fAkeSymbolInformAtion(new RAnge(6, 4, 9, 4)));

		let group = new OutlineGroup('group', null!, null!, 1);
		group.children.set(p.id, p);
		p.children.set(c1.id, c1);
		p.children.set(c2.id, c2);

		let dAtA = [
			fAkeMArker(new RAnge(2, 4, 5, 4))
		];

		group.updAteMArker(dAtA);
		Assert.equAl(p.mArker!.count, 0);
		Assert.equAl(c1.mArker!.count, 1);
		Assert.equAl(c2.mArker, undefined);

		dAtA = [
			fAkeMArker(new RAnge(2, 4, 5, 4)),
			fAkeMArker(new RAnge(2, 6, 2, 8)),
			fAkeMArker(new RAnge(7, 6, 7, 8)),
		];
		group.updAteMArker(dAtA);
		Assert.equAl(p.mArker!.count, 0);
		Assert.equAl(c1.mArker!.count, 2);
		Assert.equAl(c2.mArker!.count, 1);

		dAtA = [
			fAkeMArker(new RAnge(1, 4, 1, 11)),
			fAkeMArker(new RAnge(7, 6, 7, 8)),
		];
		group.updAteMArker(dAtA);
		Assert.equAl(p.mArker!.count, 1);
		Assert.equAl(c1.mArker, undefined);
		Assert.equAl(c2.mArker!.count, 1);
	});

	test('OutlineElement - updAteMArker/multiple groups', function () {

		let model = new clAss extends OutlineModel {
			constructor() {
				super(null!);
			}
			reAdyForTesting() {
				this._groups = this.children As Any;
			}
		};
		model.children.set('g1', new OutlineGroup('g1', model, null!, 1));
		model.children.get('g1')!.children.set('c1', new OutlineElement('c1', model.children.get('g1')!, fAkeSymbolInformAtion(new RAnge(1, 1, 11, 1))));

		model.children.set('g2', new OutlineGroup('g2', model, null!, 1));
		model.children.get('g2')!.children.set('c2', new OutlineElement('c2', model.children.get('g2')!, fAkeSymbolInformAtion(new RAnge(1, 1, 7, 1))));
		model.children.get('g2')!.children.get('c2')!.children.set('c2.1', new OutlineElement('c2.1', model.children.get('g2')!.children.get('c2')!, fAkeSymbolInformAtion(new RAnge(1, 3, 2, 19))));
		model.children.get('g2')!.children.get('c2')!.children.set('c2.2', new OutlineElement('c2.2', model.children.get('g2')!.children.get('c2')!, fAkeSymbolInformAtion(new RAnge(4, 1, 6, 10))));

		model.reAdyForTesting();

		const dAtA = [
			fAkeMArker(new RAnge(1, 1, 2, 8)),
			fAkeMArker(new RAnge(6, 1, 6, 98)),
		];

		model.updAteMArker(dAtA);

		Assert.equAl(model.children.get('g1')!.children.get('c1')!.mArker!.count, 2);
		Assert.equAl(model.children.get('g2')!.children.get('c2')!.children.get('c2.1')!.mArker!.count, 1);
		Assert.equAl(model.children.get('g2')!.children.get('c2')!.children.get('c2.2')!.mArker!.count, 1);
	});

});
