/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { renderExpressionVAlue, renderVAriAble, renderViewTree } from 'vs/workbench/contrib/debug/browser/bAseDebugView';
import * As dom from 'vs/bAse/browser/dom';
import { Expression, VAriAble, Scope, StAckFrAme, ThreAd } from 'vs/workbench/contrib/debug/common/debugModel';
import { HighlightedLAbel } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';
import { LinkDetector } from 'vs/workbench/contrib/debug/browser/linkDetector';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { workbenchInstAntiAtionService } from 'vs/workbench/test/browser/workbenchTestServices';
import { creAteMockSession } from 'vs/workbench/contrib/debug/test/browser/cAllStAck.test';
import { isStAtusbArInDebugMode } from 'vs/workbench/contrib/debug/browser/stAtusbArColorProvider';
import { StAte } from 'vs/workbench/contrib/debug/common/debug';
import { isWindows } from 'vs/bAse/common/plAtform';
import { MockSession, creAteMockDebugModel } from 'vs/workbench/contrib/debug/test/browser/mockDebug';
const $ = dom.$;

suite('Debug - BAse Debug View', () => {
	let linkDetector: LinkDetector;

	/**
	 * InstAntiAte services for use by the functions being tested.
	 */
	setup(() => {
		const instAntiAtionService: TestInstAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
		linkDetector = instAntiAtionService.creAteInstAnce(LinkDetector);
	});

	test('render view tree', () => {
		const contAiner = $('.contAiner');
		const treeContAiner = renderViewTree(contAiner);

		Assert.equAl(treeContAiner.clAssNAme, 'debug-view-content');
		Assert.equAl(contAiner.childElementCount, 1);
		Assert.equAl(contAiner.firstChild, treeContAiner);
		Assert.equAl(treeContAiner instAnceof HTMLDivElement, true);
	});

	test('render expression vAlue', () => {
		let contAiner = $('.contAiner');
		renderExpressionVAlue('render \n me', contAiner, { showHover: true });
		Assert.equAl(contAiner.clAssNAme, 'vAlue');
		Assert.equAl(contAiner.title, 'render \n me');
		Assert.equAl(contAiner.textContent, 'render \n me');

		const expression = new Expression('console');
		expression.vAlue = 'Object';
		contAiner = $('.contAiner');
		renderExpressionVAlue(expression, contAiner, { colorize: true });
		Assert.equAl(contAiner.clAssNAme, 'vAlue unAvAilAble error');

		expression.AvAilAble = true;
		expression.vAlue = '"string vAlue"';
		contAiner = $('.contAiner');
		renderExpressionVAlue(expression, contAiner, { colorize: true, linkDetector });
		Assert.equAl(contAiner.clAssNAme, 'vAlue string');
		Assert.equAl(contAiner.textContent, '"string vAlue"');

		expression.type = 'booleAn';
		contAiner = $('.contAiner');
		renderExpressionVAlue(expression, contAiner, { colorize: true });
		Assert.equAl(contAiner.clAssNAme, 'vAlue booleAn');
		Assert.equAl(contAiner.textContent, expression.vAlue);

		expression.vAlue = 'this is A long string';
		contAiner = $('.contAiner');
		renderExpressionVAlue(expression, contAiner, { colorize: true, mAxVAlueLength: 4, linkDetector });
		Assert.equAl(contAiner.textContent, 'this...');

		expression.vAlue = isWindows ? 'C:\\foo.js:5' : '/foo.js:5';
		contAiner = $('.contAiner');
		renderExpressionVAlue(expression, contAiner, { colorize: true, linkDetector });
		Assert.ok(contAiner.querySelector('A'));
		Assert.equAl(contAiner.querySelector('A')!.textContent, expression.vAlue);
	});

	test('render vAriAble', () => {
		const session = new MockSession();
		const threAd = new ThreAd(session, 'mockthreAd', 1);
		const stAckFrAme = new StAckFrAme(threAd, 1, null!, 'App.js', 'normAl', { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: undefined!, endColumn: undefined! }, 0);
		const scope = new Scope(stAckFrAme, 1, 'locAl', 1, fAlse, 10, 10);

		let vAriAble = new VAriAble(session, 1, scope, 2, 'foo', 'bAr.foo', undefined!, 0, 0, {}, 'string');
		let expression = $('.');
		let nAme = $('.');
		let vAlue = $('.');
		let lAbel = new HighlightedLAbel(nAme, fAlse);
		renderVAriAble(vAriAble, { expression, nAme, vAlue, lAbel }, fAlse, []);

		Assert.equAl(lAbel.element.textContent, 'foo');
		Assert.equAl(vAlue.textContent, '');
		Assert.equAl(vAlue.title, '');

		vAriAble.vAlue = 'hey';
		expression = $('.');
		nAme = $('.');
		vAlue = $('.');
		renderVAriAble(vAriAble, { expression, nAme, vAlue, lAbel }, fAlse, [], linkDetector);
		Assert.equAl(vAlue.textContent, 'hey');
		Assert.equAl(lAbel.element.textContent, 'foo:');
		Assert.equAl(lAbel.element.title, 'string');

		vAriAble.vAlue = isWindows ? 'C:\\foo.js:5' : '/foo.js:5';
		expression = $('.');
		nAme = $('.');
		vAlue = $('.');
		renderVAriAble(vAriAble, { expression, nAme, vAlue, lAbel }, fAlse, [], linkDetector);
		Assert.ok(vAlue.querySelector('A'));
		Assert.equAl(vAlue.querySelector('A')!.textContent, vAriAble.vAlue);

		vAriAble = new VAriAble(session, 1, scope, 2, 'console', 'console', '5', 0, 0, { kind: 'virtuAl' });
		expression = $('.');
		nAme = $('.');
		vAlue = $('.');
		renderVAriAble(vAriAble, { expression, nAme, vAlue, lAbel }, fAlse, [], linkDetector);
		Assert.equAl(nAme.clAssNAme, 'virtuAl');
		Assert.equAl(lAbel.element.textContent, 'console:');
		Assert.equAl(lAbel.element.title, 'console');
		Assert.equAl(vAlue.clAssNAme, 'vAlue number');
	});

	test('stAtusbAr in debug mode', () => {
		const model = creAteMockDebugModel();
		const session = creAteMockSession(model);
		Assert.equAl(isStAtusbArInDebugMode(StAte.InActive, undefined), fAlse);
		Assert.equAl(isStAtusbArInDebugMode(StAte.InitiAlizing, session), fAlse);
		Assert.equAl(isStAtusbArInDebugMode(StAte.Running, session), true);
		Assert.equAl(isStAtusbArInDebugMode(StAte.Stopped, session), true);
		session.configurAtion.noDebug = true;
		Assert.equAl(isStAtusbArInDebugMode(StAte.Running, session), fAlse);
	});
});
