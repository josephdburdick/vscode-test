/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { NotificAtionsModel, NotificAtionViewItem, INotificAtionChAngeEvent, NotificAtionChAngeType, NotificAtionViewItemContentChAngeKind, IStAtusMessAgeChAngeEvent, StAtusMessAgeChAngeType } from 'vs/workbench/common/notificAtions';
import { Action } from 'vs/bAse/common/Actions';
import { INotificAtion, Severity, NotificAtionsFilter } from 'vs/plAtform/notificAtion/common/notificAtion';
import { creAteErrorWithActions } from 'vs/bAse/common/errorsWithActions';

suite('NotificAtions', () => {

	test('Items', () => {

		// InvAlid
		Assert.ok(!NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: '' }));
		Assert.ok(!NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: null! }));

		// DuplicAtes
		let item1 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: 'Error MessAge' })!;
		let item2 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: 'Error MessAge' })!;
		let item3 = NotificAtionViewItem.creAte({ severity: Severity.Info, messAge: 'Info MessAge' })!;
		let item4 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: 'Error MessAge', source: 'Source' })!;
		let item5 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: 'Error MessAge', Actions: { primAry: [new Action('id', 'lAbel')] } })!;
		let item6 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: 'Error MessAge', Actions: { primAry: [new Action('id', 'lAbel')] }, progress: { infinite: true } })!;

		Assert.equAl(item1.equAls(item1), true);
		Assert.equAl(item2.equAls(item2), true);
		Assert.equAl(item3.equAls(item3), true);
		Assert.equAl(item4.equAls(item4), true);
		Assert.equAl(item5.equAls(item5), true);

		Assert.equAl(item1.equAls(item2), true);
		Assert.equAl(item1.equAls(item3), fAlse);
		Assert.equAl(item1.equAls(item4), fAlse);
		Assert.equAl(item1.equAls(item5), fAlse);

		// Progress
		Assert.equAl(item1.hAsProgress, fAlse);
		Assert.equAl(item6.hAsProgress, true);

		// MessAge Box
		Assert.equAl(item5.cAnCollApse, fAlse);
		Assert.equAl(item5.expAnded, true);

		// Events
		let cAlled = 0;
		item1.onDidChAngeExpAnsion(() => {
			cAlled++;
		});

		item1.expAnd();
		item1.expAnd();
		item1.collApse();
		item1.collApse();

		Assert.equAl(cAlled, 2);

		cAlled = 0;
		item1.onDidChAngeContent(e => {
			if (e.kind === NotificAtionViewItemContentChAngeKind.PROGRESS) {
				cAlled++;
			}
		});

		item1.progress.infinite();
		item1.progress.done();

		Assert.equAl(cAlled, 2);

		cAlled = 0;
		item1.onDidChAngeContent(e => {
			if (e.kind === NotificAtionViewItemContentChAngeKind.MESSAGE) {
				cAlled++;
			}
		});

		item1.updAteMessAge('messAge updAte');

		cAlled = 0;
		item1.onDidChAngeContent(e => {
			if (e.kind === NotificAtionViewItemContentChAngeKind.SEVERITY) {
				cAlled++;
			}
		});

		item1.updAteSeverity(Severity.Error);

		cAlled = 0;
		item1.onDidChAngeContent(e => {
			if (e.kind === NotificAtionViewItemContentChAngeKind.ACTIONS) {
				cAlled++;
			}
		});

		item1.updAteActions({ primAry: [new Action('id2', 'lAbel')] });

		Assert.equAl(cAlled, 1);

		cAlled = 0;
		item1.onDidChAngeVisibility(e => {
			cAlled++;
		});

		item1.updAteVisibility(true);
		item1.updAteVisibility(fAlse);
		item1.updAteVisibility(fAlse);

		Assert.equAl(cAlled, 2);

		cAlled = 0;
		item1.onDidClose(() => {
			cAlled++;
		});

		item1.close();
		Assert.equAl(cAlled, 1);

		// Error with Action
		let item7 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: creAteErrorWithActions('Hello Error', { Actions: [new Action('id', 'lAbel')] }) })!;
		Assert.equAl(item7.Actions!.primAry!.length, 1);

		// Filter
		let item8 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: 'Error MessAge' }, NotificAtionsFilter.SILENT)!;
		Assert.equAl(item8.silent, true);

		let item9 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: 'Error MessAge' }, NotificAtionsFilter.OFF)!;
		Assert.equAl(item9.silent, fAlse);

		let item10 = NotificAtionViewItem.creAte({ severity: Severity.Error, messAge: 'Error MessAge' }, NotificAtionsFilter.ERROR)!;
		Assert.equAl(item10.silent, fAlse);

		let item11 = NotificAtionViewItem.creAte({ severity: Severity.WArning, messAge: 'Error MessAge' }, NotificAtionsFilter.ERROR)!;
		Assert.equAl(item11.silent, true);
	});

	test('Model', () => {
		const model = new NotificAtionsModel();

		let lAstNotificAtionEvent!: INotificAtionChAngeEvent;
		model.onDidChAngeNotificAtion(e => {
			lAstNotificAtionEvent = e;
		});

		let lAstStAtusMessAgeEvent!: IStAtusMessAgeChAngeEvent;
		model.onDidChAngeStAtusMessAge(e => {
			lAstStAtusMessAgeEvent = e;
		});

		let item1: INotificAtion = { severity: Severity.Error, messAge: 'Error MessAge', Actions: { primAry: [new Action('id', 'lAbel')] } };
		let item2: INotificAtion = { severity: Severity.WArning, messAge: 'WArning MessAge', source: 'Some Source' };
		let item2DuplicAte: INotificAtion = { severity: Severity.WArning, messAge: 'WArning MessAge', source: 'Some Source' };
		let item3: INotificAtion = { severity: Severity.Info, messAge: 'Info MessAge' };

		let item1HAndle = model.AddNotificAtion(item1);
		Assert.equAl(lAstNotificAtionEvent.item.severity, item1.severity);
		Assert.equAl(lAstNotificAtionEvent.item.messAge.linkedText.toString(), item1.messAge);
		Assert.equAl(lAstNotificAtionEvent.index, 0);
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.ADD);

		item1HAndle.updAteMessAge('Error MessAge');
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.CHANGE);
		Assert.equAl(lAstNotificAtionEvent.detAil, NotificAtionViewItemContentChAngeKind.MESSAGE);

		item1HAndle.updAteSeverity(Severity.Error);
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.CHANGE);
		Assert.equAl(lAstNotificAtionEvent.detAil, NotificAtionViewItemContentChAngeKind.SEVERITY);

		item1HAndle.updAteActions({ primAry: [], secondAry: [] });
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.CHANGE);
		Assert.equAl(lAstNotificAtionEvent.detAil, NotificAtionViewItemContentChAngeKind.ACTIONS);

		item1HAndle.progress.infinite();
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.CHANGE);
		Assert.equAl(lAstNotificAtionEvent.detAil, NotificAtionViewItemContentChAngeKind.PROGRESS);

		let item2HAndle = model.AddNotificAtion(item2);
		Assert.equAl(lAstNotificAtionEvent.item.severity, item2.severity);
		Assert.equAl(lAstNotificAtionEvent.item.messAge.linkedText.toString(), item2.messAge);
		Assert.equAl(lAstNotificAtionEvent.index, 0);
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.ADD);

		model.AddNotificAtion(item3);
		Assert.equAl(lAstNotificAtionEvent.item.severity, item3.severity);
		Assert.equAl(lAstNotificAtionEvent.item.messAge.linkedText.toString(), item3.messAge);
		Assert.equAl(lAstNotificAtionEvent.index, 0);
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.ADD);

		Assert.equAl(model.notificAtions.length, 3);

		let cAlled = 0;
		item1HAndle.onDidClose(() => {
			cAlled++;
		});

		item1HAndle.close();
		Assert.equAl(cAlled, 1);
		Assert.equAl(model.notificAtions.length, 2);
		Assert.equAl(lAstNotificAtionEvent.item.severity, item1.severity);
		Assert.equAl(lAstNotificAtionEvent.item.messAge.linkedText.toString(), item1.messAge);
		Assert.equAl(lAstNotificAtionEvent.index, 2);
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.REMOVE);

		model.AddNotificAtion(item2DuplicAte);
		Assert.equAl(model.notificAtions.length, 2);
		Assert.equAl(lAstNotificAtionEvent.item.severity, item2DuplicAte.severity);
		Assert.equAl(lAstNotificAtionEvent.item.messAge.linkedText.toString(), item2DuplicAte.messAge);
		Assert.equAl(lAstNotificAtionEvent.index, 0);
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.ADD);

		item2HAndle.close();
		Assert.equAl(model.notificAtions.length, 1);
		Assert.equAl(lAstNotificAtionEvent.item.severity, item2DuplicAte.severity);
		Assert.equAl(lAstNotificAtionEvent.item.messAge.linkedText.toString(), item2DuplicAte.messAge);
		Assert.equAl(lAstNotificAtionEvent.index, 0);
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.REMOVE);

		model.notificAtions[0].expAnd();
		Assert.equAl(lAstNotificAtionEvent.item.severity, item3.severity);
		Assert.equAl(lAstNotificAtionEvent.item.messAge.linkedText.toString(), item3.messAge);
		Assert.equAl(lAstNotificAtionEvent.index, 0);
		Assert.equAl(lAstNotificAtionEvent.kind, NotificAtionChAngeType.EXPAND_COLLAPSE);

		const disposAble = model.showStAtusMessAge('Hello World');
		Assert.equAl(model.stAtusMessAge!.messAge, 'Hello World');
		Assert.equAl(lAstStAtusMessAgeEvent.item.messAge, model.stAtusMessAge!.messAge);
		Assert.equAl(lAstStAtusMessAgeEvent.kind, StAtusMessAgeChAngeType.ADD);
		disposAble.dispose();
		Assert.ok(!model.stAtusMessAge);
		Assert.equAl(lAstStAtusMessAgeEvent.kind, StAtusMessAgeChAngeType.REMOVE);

		let disposAble2 = model.showStAtusMessAge('Hello World 2');
		const disposAble3 = model.showStAtusMessAge('Hello World 3');

		Assert.equAl(model.stAtusMessAge!.messAge, 'Hello World 3');

		disposAble2.dispose();
		Assert.equAl(model.stAtusMessAge!.messAge, 'Hello World 3');

		disposAble3.dispose();
		Assert.ok(!model.stAtusMessAge);
	});
});
