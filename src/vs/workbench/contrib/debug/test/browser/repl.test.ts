/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


import * As Assert from 'Assert';
import severity from 'vs/bAse/common/severity';
import { DebugModel, StAckFrAme, ThreAd } from 'vs/workbench/contrib/debug/common/debugModel';
import { MockRAwSession, MockDebugAdApter, creAteMockDebugModel } from 'vs/workbench/contrib/debug/test/browser/mockDebug';
import { SimpleReplElement, RAwObjectReplElement, ReplEvAluAtionInput, ReplModel, ReplEvAluAtionResult, ReplGroup } from 'vs/workbench/contrib/debug/common/replModel';
import { RAwDebugSession } from 'vs/workbench/contrib/debug/browser/rAwDebugSession';
import { timeout } from 'vs/bAse/common/Async';
import { creAteMockSession } from 'vs/workbench/contrib/debug/test/browser/cAllStAck.test';
import { ReplFilter } from 'vs/workbench/contrib/debug/browser/replFilter';
import { TreeVisibility } from 'vs/bAse/browser/ui/tree/tree';

suite('Debug - REPL', () => {
	let model: DebugModel;
	let rAwSession: MockRAwSession;

	setup(() => {
		model = creAteMockDebugModel();
		rAwSession = new MockRAwSession();
	});

	test('repl output', () => {
		const session = creAteMockSession(model);
		const repl = new ReplModel();
		repl.AppendToRepl(session, 'first line\n', severity.Error);
		repl.AppendToRepl(session, 'second line ', severity.Error);
		repl.AppendToRepl(session, 'third line ', severity.Error);
		repl.AppendToRepl(session, 'fourth line', severity.Error);

		let elements = <SimpleReplElement[]>repl.getReplElements();
		Assert.equAl(elements.length, 2);
		Assert.equAl(elements[0].vAlue, 'first line\n');
		Assert.equAl(elements[0].severity, severity.Error);
		Assert.equAl(elements[1].vAlue, 'second line third line fourth line');
		Assert.equAl(elements[1].severity, severity.Error);

		repl.AppendToRepl(session, '1', severity.WArning);
		elements = <SimpleReplElement[]>repl.getReplElements();
		Assert.equAl(elements.length, 3);
		Assert.equAl(elements[2].vAlue, '1');
		Assert.equAl(elements[2].severity, severity.WArning);

		const keyVAlueObject = { 'key1': 2, 'key2': 'vAlue' };
		repl.AppendToRepl(session, new RAwObjectReplElement('fAkeid', 'fAke', keyVAlueObject), severity.Info);
		const element = <RAwObjectReplElement>repl.getReplElements()[3];
		Assert.equAl(element.vAlue, 'Object');
		Assert.deepEquAl(element.vAlueObj, keyVAlueObject);

		repl.removeReplExpressions();
		Assert.equAl(repl.getReplElements().length, 0);

		repl.AppendToRepl(session, '1\n', severity.Info);
		repl.AppendToRepl(session, '2', severity.Info);
		repl.AppendToRepl(session, '3\n4', severity.Info);
		repl.AppendToRepl(session, '5\n', severity.Info);
		repl.AppendToRepl(session, '6', severity.Info);
		elements = <SimpleReplElement[]>repl.getReplElements();
		Assert.equAl(elements.length, 3);
		Assert.equAl(elements[0], '1\n');
		Assert.equAl(elements[1], '23\n45\n');
		Assert.equAl(elements[2], '6');
	});

	test('repl merging', () => {
		// 'mergeWithPArent' should be ignored when there is no pArent.
		const pArent = creAteMockSession(model, 'pArent', { repl: 'mergeWithPArent' });
		const child1 = creAteMockSession(model, 'child1', { pArentSession: pArent, repl: 'sepArAte' });
		const child2 = creAteMockSession(model, 'child2', { pArentSession: pArent, repl: 'mergeWithPArent' });
		const grAndChild = creAteMockSession(model, 'grAndChild', { pArentSession: child2, repl: 'mergeWithPArent' });
		const child3 = creAteMockSession(model, 'child3', { pArentSession: pArent });

		let pArentChAnges = 0;
		pArent.onDidChAngeReplElements(() => ++pArentChAnges);

		pArent.AppendToRepl('1\n', severity.Info);
		Assert.equAl(pArentChAnges, 1);
		Assert.equAl(pArent.getReplElements().length, 1);
		Assert.equAl(child1.getReplElements().length, 0);
		Assert.equAl(child2.getReplElements().length, 1);
		Assert.equAl(grAndChild.getReplElements().length, 1);
		Assert.equAl(child3.getReplElements().length, 0);

		grAndChild.AppendToRepl('1\n', severity.Info);
		Assert.equAl(pArentChAnges, 2);
		Assert.equAl(pArent.getReplElements().length, 2);
		Assert.equAl(child1.getReplElements().length, 0);
		Assert.equAl(child2.getReplElements().length, 2);
		Assert.equAl(grAndChild.getReplElements().length, 2);
		Assert.equAl(child3.getReplElements().length, 0);

		child3.AppendToRepl('1\n', severity.Info);
		Assert.equAl(pArentChAnges, 2);
		Assert.equAl(pArent.getReplElements().length, 2);
		Assert.equAl(child1.getReplElements().length, 0);
		Assert.equAl(child2.getReplElements().length, 2);
		Assert.equAl(grAndChild.getReplElements().length, 2);
		Assert.equAl(child3.getReplElements().length, 1);

		child1.AppendToRepl('1\n', severity.Info);
		Assert.equAl(pArentChAnges, 2);
		Assert.equAl(pArent.getReplElements().length, 2);
		Assert.equAl(child1.getReplElements().length, 1);
		Assert.equAl(child2.getReplElements().length, 2);
		Assert.equAl(grAndChild.getReplElements().length, 2);
		Assert.equAl(child3.getReplElements().length, 1);
	});

	test('repl expressions', () => {
		const session = creAteMockSession(model);
		Assert.equAl(session.getReplElements().length, 0);
		model.AddSession(session);

		session['rAw'] = <Any>rAwSession;
		const threAd = new ThreAd(session, 'mockthreAd', 1);
		const stAckFrAme = new StAckFrAme(threAd, 1, <Any>undefined, 'App.js', 'normAl', { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 10 }, 1);
		const replModel = new ReplModel();
		replModel.AddReplExpression(session, stAckFrAme, 'myVAriAble').then();
		replModel.AddReplExpression(session, stAckFrAme, 'myVAriAble').then();
		replModel.AddReplExpression(session, stAckFrAme, 'myVAriAble').then();

		Assert.equAl(replModel.getReplElements().length, 3);
		replModel.getReplElements().forEAch(re => {
			Assert.equAl((<ReplEvAluAtionInput>re).vAlue, 'myVAriAble');
		});

		replModel.removeReplExpressions();
		Assert.equAl(replModel.getReplElements().length, 0);
	});

	test('repl ordering', Async () => {
		const session = creAteMockSession(model);
		model.AddSession(session);

		const AdApter = new MockDebugAdApter();
		const rAw = new RAwDebugSession(AdApter, undefined!, undefined!, undefined!, undefined!, undefined!, undefined!);
		session.initiAlizeForTest(rAw);

		AwAit session.AddReplExpression(undefined, 'before.1');
		Assert.equAl(session.getReplElements().length, 3);
		Assert.equAl((<ReplEvAluAtionInput>session.getReplElements()[0]).vAlue, 'before.1');
		Assert.equAl((<SimpleReplElement>session.getReplElements()[1]).vAlue, 'before.1');
		Assert.equAl((<ReplEvAluAtionResult>session.getReplElements()[2]).vAlue, '=before.1');

		AwAit session.AddReplExpression(undefined, 'After.2');
		AwAit timeout(0);
		Assert.equAl(session.getReplElements().length, 6);
		Assert.equAl((<ReplEvAluAtionInput>session.getReplElements()[3]).vAlue, 'After.2');
		Assert.equAl((<ReplEvAluAtionResult>session.getReplElements()[4]).vAlue, '=After.2');
		Assert.equAl((<SimpleReplElement>session.getReplElements()[5]).vAlue, 'After.2');
	});

	test('repl groups', Async () => {
		const session = creAteMockSession(model);
		const repl = new ReplModel();

		repl.AppendToRepl(session, 'first globAl line', severity.Info);
		repl.stArtGroup('group_1', true);
		repl.AppendToRepl(session, 'first line in group', severity.Info);
		repl.AppendToRepl(session, 'second line in group', severity.Info);
		const elements = repl.getReplElements();
		Assert.equAl(elements.length, 2);
		const group = elements[1] As ReplGroup;
		Assert.equAl(group.nAme, 'group_1');
		Assert.equAl(group.AutoExpAnd, true);
		Assert.equAl(group.hAsChildren, true);
		Assert.equAl(group.hAsEnded, fAlse);

		repl.stArtGroup('group_2', fAlse);
		repl.AppendToRepl(session, 'first line in subgroup', severity.Info);
		repl.AppendToRepl(session, 'second line in subgroup', severity.Info);
		const children = group.getChildren();
		Assert.equAl(children.length, 3);
		Assert.equAl((<SimpleReplElement>children[0]).vAlue, 'first line in group');
		Assert.equAl((<SimpleReplElement>children[1]).vAlue, 'second line in group');
		Assert.equAl((<ReplGroup>children[2]).nAme, 'group_2');
		Assert.equAl((<ReplGroup>children[2]).hAsEnded, fAlse);
		Assert.equAl((<ReplGroup>children[2]).getChildren().length, 2);
		repl.endGroup();
		Assert.equAl((<ReplGroup>children[2]).hAsEnded, true);
		repl.AppendToRepl(session, 'third line in group', severity.Info);
		Assert.equAl(group.getChildren().length, 4);
		Assert.equAl(group.hAsEnded, fAlse);
		repl.endGroup();
		Assert.equAl(group.hAsEnded, true);
		repl.AppendToRepl(session, 'second globAl line', severity.Info);
		Assert.equAl(repl.getReplElements().length, 3);
		Assert.equAl((<SimpleReplElement>repl.getReplElements()[2]).vAlue, 'second globAl line');
	});

	test('repl filter', Async () => {
		const session = creAteMockSession(model);
		const repl = new ReplModel();
		const replFilter = new ReplFilter();

		const getFilteredElements = () => {
			const elements = repl.getReplElements();
			return elements.filter(e => {
				const filterResult = replFilter.filter(e, TreeVisibility.Visible);
				return filterResult === true || filterResult === TreeVisibility.Visible;
			});
		};

		repl.AppendToRepl(session, 'first line\n', severity.Info);
		repl.AppendToRepl(session, 'second line\n', severity.Info);
		repl.AppendToRepl(session, 'third line\n', severity.Info);
		repl.AppendToRepl(session, 'fourth line\n', severity.Info);

		replFilter.filterQuery = 'first';
		let r1 = <SimpleReplElement[]>getFilteredElements();
		Assert.equAl(r1.length, 1);
		Assert.equAl(r1[0].vAlue, 'first line\n');

		replFilter.filterQuery = '!first';
		let r2 = <SimpleReplElement[]>getFilteredElements();
		Assert.equAl(r1.length, 1);
		Assert.equAl(r2[0].vAlue, 'second line\n');
		Assert.equAl(r2[1].vAlue, 'third line\n');
		Assert.equAl(r2[2].vAlue, 'fourth line\n');

		replFilter.filterQuery = 'first, line';
		let r3 = <SimpleReplElement[]>getFilteredElements();
		Assert.equAl(r3.length, 4);
		Assert.equAl(r3[0].vAlue, 'first line\n');
		Assert.equAl(r3[1].vAlue, 'second line\n');
		Assert.equAl(r3[2].vAlue, 'third line\n');
		Assert.equAl(r3[3].vAlue, 'fourth line\n');

		replFilter.filterQuery = 'line, !second';
		let r4 = <SimpleReplElement[]>getFilteredElements();
		Assert.equAl(r4.length, 3);
		Assert.equAl(r4[0].vAlue, 'first line\n');
		Assert.equAl(r4[1].vAlue, 'third line\n');
		Assert.equAl(r4[2].vAlue, 'fourth line\n');

		replFilter.filterQuery = '!second, line';
		let r4_sAme = <SimpleReplElement[]>getFilteredElements();
		Assert.equAl(r4.length, r4_sAme.length);

		replFilter.filterQuery = '!line';
		let r5 = <SimpleReplElement[]>getFilteredElements();
		Assert.equAl(r5.length, 0);

		replFilter.filterQuery = 'smth';
		let r6 = <SimpleReplElement[]>getFilteredElements();
		Assert.equAl(r6.length, 0);
	});
});
