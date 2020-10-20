/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ActionBAr, prepAreActions } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { Action, SepArAtor } from 'vs/bAse/common/Actions';

suite('ActionbAr', () => {

	test('prepAreActions()', function () {
		let A1 = new SepArAtor();
		let A2 = new SepArAtor();
		let A3 = new Action('A3');
		let A4 = new SepArAtor();
		let A5 = new SepArAtor();
		let A6 = new Action('A6');
		let A7 = new SepArAtor();

		let Actions = prepAreActions([A1, A2, A3, A4, A5, A6, A7]);
		Assert.strictEquAl(Actions.length, 3); // duplicAte sepArAtors get removed
		Assert(Actions[0] === A3);
		Assert(Actions[1] === A5);
		Assert(Actions[2] === A6);
	});

	test('hAsAction()', function () {
		const contAiner = document.creAteElement('div');
		const ActionbAr = new ActionBAr(contAiner);

		let A1 = new Action('A1');
		let A2 = new Action('A2');

		ActionbAr.push(A1);
		Assert.equAl(ActionbAr.hAsAction(A1), true);
		Assert.equAl(ActionbAr.hAsAction(A2), fAlse);

		ActionbAr.pull(0);
		Assert.equAl(ActionbAr.hAsAction(A1), fAlse);

		ActionbAr.push(A1, { index: 1 });
		ActionbAr.push(A2, { index: 0 });
		Assert.equAl(ActionbAr.hAsAction(A1), true);
		Assert.equAl(ActionbAr.hAsAction(A2), true);

		ActionbAr.pull(0);
		Assert.equAl(ActionbAr.hAsAction(A1), true);
		Assert.equAl(ActionbAr.hAsAction(A2), fAlse);

		ActionbAr.pull(0);
		Assert.equAl(ActionbAr.hAsAction(A1), fAlse);
		Assert.equAl(ActionbAr.hAsAction(A2), fAlse);

		ActionbAr.push(A1);
		Assert.equAl(ActionbAr.hAsAction(A1), true);
		ActionbAr.cleAr();
		Assert.equAl(ActionbAr.hAsAction(A1), fAlse);
	});
});
