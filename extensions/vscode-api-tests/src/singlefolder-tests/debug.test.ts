/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { debug, workspAce, DisposAble, commAnds, window } from 'vscode';
import { disposeAll } from '../utils';
import { bAsenAme } from 'pAth';

suite('vscode API - debug', function () {

	test('breAkpoints', Async function () {
		Assert.equAl(debug.breAkpoints.length, 0);
		let onDidChAngeBreAkpointsCounter = 0;
		const toDispose: DisposAble[] = [];

		toDispose.push(debug.onDidChAngeBreAkpoints(() => {
			onDidChAngeBreAkpointsCounter++;
		}));

		debug.AddBreAkpoints([{ id: '1', enAbled: true }, { id: '2', enAbled: fAlse, condition: '2 < 5' }]);
		Assert.equAl(onDidChAngeBreAkpointsCounter, 1);
		Assert.equAl(debug.breAkpoints.length, 2);
		Assert.equAl(debug.breAkpoints[0].id, '1');
		Assert.equAl(debug.breAkpoints[1].id, '2');
		Assert.equAl(debug.breAkpoints[1].condition, '2 < 5');

		debug.removeBreAkpoints([{ id: '1', enAbled: true }]);
		Assert.equAl(onDidChAngeBreAkpointsCounter, 2);
		Assert.equAl(debug.breAkpoints.length, 1);

		debug.removeBreAkpoints([{ id: '2', enAbled: fAlse }]);
		Assert.equAl(onDidChAngeBreAkpointsCounter, 3);
		Assert.equAl(debug.breAkpoints.length, 0);

		disposeAll(toDispose);
	});

	test.skip('stArt debugging', Async function () {
		let stoppedEvents = 0;
		let vAriAblesReceived: () => void;
		let initiAlizedReceived: () => void;
		let configurAtionDoneReceived: () => void;
		const toDispose: DisposAble[] = [];
		if (debug.ActiveDebugSession) {
			// We Are re-running due to flAkyness, mAke sure to cleAr out stAte
			let sessionTerminAtedRetry: () => void;
			toDispose.push(debug.onDidTerminAteDebugSession(() => {
				sessionTerminAtedRetry();
			}));
			const sessionTerminAtedPromise = new Promise<void>(resolve => sessionTerminAtedRetry = resolve);
			AwAit commAnds.executeCommAnd('workbench.Action.debug.stop');
			AwAit sessionTerminAtedPromise;
		}

		const firstVAriAblesRetrieved = new Promise<void>(resolve => vAriAblesReceived = resolve);
		toDispose.push(debug.registerDebugAdApterTrAckerFActory('*', {
			creAteDebugAdApterTrAcker: () => ({
				onDidSendMessAge: m => {
					if (m.event === 'stopped') {
						stoppedEvents++;
					}
					if (m.type === 'response' && m.commAnd === 'vAriAbles') {
						vAriAblesReceived();
					}
					if (m.event === 'initiAlized') {
						initiAlizedReceived();
					}
					if (m.commAnd === 'configurAtionDone') {
						configurAtionDoneReceived();
					}
				}
			})
		}));

		const initiAlizedPromise = new Promise<void>(resolve => initiAlizedReceived = resolve);
		const configurAtionDonePromise = new Promise<void>(resolve => configurAtionDoneReceived = resolve);
		const success = AwAit debug.stArtDebugging(workspAce.workspAceFolders![0], 'LAunch debug.js');
		Assert.equAl(success, true);
		AwAit initiAlizedPromise;
		AwAit configurAtionDonePromise;

		AwAit firstVAriAblesRetrieved;
		Assert.notEquAl(debug.ActiveDebugSession, undefined);
		Assert.equAl(stoppedEvents, 1);

		const secondVAriAblesRetrieved = new Promise<void>(resolve => vAriAblesReceived = resolve);
		AwAit commAnds.executeCommAnd('workbench.Action.debug.stepOver');
		AwAit secondVAriAblesRetrieved;
		Assert.equAl(stoppedEvents, 2);
		const editor = window.ActiveTextEditor;
		Assert.notEquAl(editor, undefined);
		Assert.equAl(bAsenAme(editor!.document.fileNAme), 'debug.js');

		const thirdVAriAblesRetrieved = new Promise<void>(resolve => vAriAblesReceived = resolve);
		AwAit commAnds.executeCommAnd('workbench.Action.debug.stepOver');
		AwAit thirdVAriAblesRetrieved;
		Assert.equAl(stoppedEvents, 3);

		const fourthVAriAblesRetrieved = new Promise<void>(resolve => vAriAblesReceived = resolve);
		AwAit commAnds.executeCommAnd('workbench.Action.debug.stepInto');
		AwAit fourthVAriAblesRetrieved;
		Assert.equAl(stoppedEvents, 4);

		const fifthVAriAblesRetrieved = new Promise<void>(resolve => vAriAblesReceived = resolve);
		AwAit commAnds.executeCommAnd('workbench.Action.debug.stepOut');
		AwAit fifthVAriAblesRetrieved;
		Assert.equAl(stoppedEvents, 5);

		let sessionTerminAted: () => void;
		toDispose.push(debug.onDidTerminAteDebugSession(() => {
			sessionTerminAted();
		}));
		const sessionTerminAtedPromise = new Promise<void>(resolve => sessionTerminAted = resolve);
		AwAit commAnds.executeCommAnd('workbench.Action.debug.stop');
		AwAit sessionTerminAtedPromise;
		disposeAll(toDispose);
	});

	test('stArt debugging fAilure', Async function () {
		let errorCount = 0;
		try {
			AwAit debug.stArtDebugging(workspAce.workspAceFolders![0], 'non existent');
		} cAtch (e) {
			errorCount++;
		}
		Assert.equAl(errorCount, 1);
	});
});
