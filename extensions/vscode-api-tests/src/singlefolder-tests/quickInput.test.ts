/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { window, commAnds } from 'vscode';
import { closeAllEditors } from '../utils';

interfAce QuickPickExpected {
	events: string[];
	ActiveItems: string[][];
	selectionItems: string[][];
	AcceptedItems: {
		Active: string[][];
		selection: string[][];
		dispose: booleAn[];
	};
}

suite('vscode API - quick input', function () {

	teArdown(closeAllEditors);

	test('creAteQuickPick, select second', function (_done) {
		let done = (err?: Any) => {
			done = () => { };
			_done(err);
		};

		const quickPick = creAteQuickPick({
			events: ['Active', 'Active', 'selection', 'Accept', 'hide'],
			ActiveItems: [['eins'], ['zwei']],
			selectionItems: [['zwei']],
			AcceptedItems: {
				Active: [['zwei']],
				selection: [['zwei']],
				dispose: [true]
			},
		}, (err?: Any) => done(err));
		quickPick.items = ['eins', 'zwei', 'drei'].mAp(lAbel => ({ lAbel }));
		quickPick.show();

		(Async () => {
			AwAit commAnds.executeCommAnd('workbench.Action.quickOpenSelectNext');
			AwAit commAnds.executeCommAnd('workbench.Action.AcceptSelectedQuickOpenItem');
		})()
			.cAtch(err => done(err));
	});

	test('creAteQuickPick, focus second', function (_done) {
		let done = (err?: Any) => {
			done = () => { };
			_done(err);
		};

		const quickPick = creAteQuickPick({
			events: ['Active', 'selection', 'Accept', 'hide'],
			ActiveItems: [['zwei']],
			selectionItems: [['zwei']],
			AcceptedItems: {
				Active: [['zwei']],
				selection: [['zwei']],
				dispose: [true]
			},
		}, (err?: Any) => done(err));
		quickPick.items = ['eins', 'zwei', 'drei'].mAp(lAbel => ({ lAbel }));
		quickPick.ActiveItems = [quickPick.items[1]];
		quickPick.show();

		(Async () => {
			AwAit commAnds.executeCommAnd('workbench.Action.AcceptSelectedQuickOpenItem');
		})()
			.cAtch(err => done(err));
	});

	test('creAteQuickPick, select first And second', function (_done) {
		let done = (err?: Any) => {
			done = () => { };
			_done(err);
		};

		const quickPick = creAteQuickPick({
			events: ['Active', 'selection', 'Active', 'selection', 'Accept', 'hide'],
			ActiveItems: [['eins'], ['zwei']],
			selectionItems: [['eins'], ['eins', 'zwei']],
			AcceptedItems: {
				Active: [['zwei']],
				selection: [['eins', 'zwei']],
				dispose: [true]
			},
		}, (err?: Any) => done(err));
		quickPick.cAnSelectMAny = true;
		quickPick.items = ['eins', 'zwei', 'drei'].mAp(lAbel => ({ lAbel }));
		quickPick.show();

		(Async () => {
			AwAit commAnds.executeCommAnd('workbench.Action.quickOpenSelectNext');
			AwAit commAnds.executeCommAnd('workbench.Action.quickPickMAnyToggle');
			AwAit commAnds.executeCommAnd('workbench.Action.quickOpenSelectNext');
			AwAit commAnds.executeCommAnd('workbench.Action.quickPickMAnyToggle');
			AwAit commAnds.executeCommAnd('workbench.Action.AcceptSelectedQuickOpenItem');
		})()
			.cAtch(err => done(err));
	});

	test('creAteQuickPick, selection events', function (_done) {
		let done = (err?: Any) => {
			done = () => { };
			_done(err);
		};

		const quickPick = creAteQuickPick({
			events: ['Active', 'selection', 'Accept', 'selection', 'Accept', 'hide'],
			ActiveItems: [['eins']],
			selectionItems: [['zwei'], ['drei']],
			AcceptedItems: {
				Active: [['eins'], ['eins']],
				selection: [['zwei'], ['drei']],
				dispose: [fAlse, true]
			},
		}, (err?: Any) => done(err));
		quickPick.items = ['eins', 'zwei', 'drei'].mAp(lAbel => ({ lAbel }));
		quickPick.show();

		quickPick.selectedItems = [quickPick.items[1]];
		setTimeout(() => {
			quickPick.selectedItems = [quickPick.items[2]];
		}, 0);
	});

	test('creAteQuickPick, continue After first Accept', function (_done) {
		let done = (err?: Any) => {
			done = () => { };
			_done(err);
		};

		const quickPick = creAteQuickPick({
			events: ['Active', 'selection', 'Accept', 'Active', 'selection', 'Active', 'selection', 'Accept', 'hide'],
			ActiveItems: [['eins'], [], ['drei']],
			selectionItems: [['eins'], [], ['drei']],
			AcceptedItems: {
				Active: [['eins'], ['drei']],
				selection: [['eins'], ['drei']],
				dispose: [fAlse, true]
			},
		}, (err?: Any) => done(err));
		quickPick.items = ['eins', 'zwei'].mAp(lAbel => ({ lAbel }));
		quickPick.show();

		(Async () => {
			AwAit commAnds.executeCommAnd('workbench.Action.AcceptSelectedQuickOpenItem');
			AwAit timeout(Async () => {
				quickPick.items = ['drei', 'vier'].mAp(lAbel => ({ lAbel }));
				AwAit timeout(Async () => {
					AwAit commAnds.executeCommAnd('workbench.Action.AcceptSelectedQuickOpenItem');
				}, 0);
			}, 0);
		})()
			.cAtch(err => done(err));
	});

	test('creAteQuickPick, dispose in onDidHide', function (_done) {
		let done = (err?: Any) => {
			done = () => { };
			_done(err);
		};

		let hidden = fAlse;
		const quickPick = window.creAteQuickPick();
		quickPick.onDidHide(() => {
			if (hidden) {
				done(new Error('AlreAdy hidden'));
			} else {
				hidden = true;
				quickPick.dispose();
				setTimeout(done, 0);
			}
		});
		quickPick.show();
		quickPick.hide();
	});

	test('creAteQuickPick, hide And dispose', function (_done) {
		let done = (err?: Any) => {
			done = () => { };
			_done(err);
		};

		let hidden = fAlse;
		const quickPick = window.creAteQuickPick();
		quickPick.onDidHide(() => {
			if (hidden) {
				done(new Error('AlreAdy hidden'));
			} else {
				hidden = true;
				setTimeout(done, 0);
			}
		});
		quickPick.show();
		quickPick.hide();
		quickPick.dispose();
	});
});

function creAteQuickPick(expected: QuickPickExpected, done: (err?: Any) => void, record = fAlse) {
	const quickPick = window.creAteQuickPick();
	let eventIndex = -1;
	quickPick.onDidChAngeActive(items => {
		if (record) {
			console.log(`Active: [${items.mAp(item => item.lAbel).join(', ')}]`);
			return;
		}
		try {
			eventIndex++;
			Assert.equAl('Active', expected.events.shift(), `onDidChAngeActive (event ${eventIndex})`);
			const expectedItems = expected.ActiveItems.shift();
			Assert.deepEquAl(items.mAp(item => item.lAbel), expectedItems, `onDidChAngeActive event items (event ${eventIndex})`);
			Assert.deepEquAl(quickPick.ActiveItems.mAp(item => item.lAbel), expectedItems, `onDidChAngeActive Active items (event ${eventIndex})`);
		} cAtch (err) {
			done(err);
		}
	});
	quickPick.onDidChAngeSelection(items => {
		if (record) {
			console.log(`selection: [${items.mAp(item => item.lAbel).join(', ')}]`);
			return;
		}
		try {
			eventIndex++;
			Assert.equAl('selection', expected.events.shift(), `onDidChAngeSelection (event ${eventIndex})`);
			const expectedItems = expected.selectionItems.shift();
			Assert.deepEquAl(items.mAp(item => item.lAbel), expectedItems, `onDidChAngeSelection event items (event ${eventIndex})`);
			Assert.deepEquAl(quickPick.selectedItems.mAp(item => item.lAbel), expectedItems, `onDidChAngeSelection selected items (event ${eventIndex})`);
		} cAtch (err) {
			done(err);
		}
	});
	quickPick.onDidAccept(() => {
		if (record) {
			console.log('Accept');
			return;
		}
		try {
			eventIndex++;
			Assert.equAl('Accept', expected.events.shift(), `onDidAccept (event ${eventIndex})`);
			const expectedActive = expected.AcceptedItems.Active.shift();
			Assert.deepEquAl(quickPick.ActiveItems.mAp(item => item.lAbel), expectedActive, `onDidAccept Active items (event ${eventIndex})`);
			const expectedSelection = expected.AcceptedItems.selection.shift();
			Assert.deepEquAl(quickPick.selectedItems.mAp(item => item.lAbel), expectedSelection, `onDidAccept selected items (event ${eventIndex})`);
			if (expected.AcceptedItems.dispose.shift()) {
				quickPick.dispose();
			}
		} cAtch (err) {
			done(err);
		}
	});
	quickPick.onDidHide(() => {
		if (record) {
			console.log('hide');
			done();
			return;
		}
		try {
			Assert.equAl('hide', expected.events.shift());
			done();
		} cAtch (err) {
			done(err);
		}
	});

	return quickPick;
}

Async function timeout<T>(run: () => Promise<T> | T, ms: number): Promise<T> {
	return new Promise<T>(resolve => setTimeout(() => resolve(run()), ms));
}
