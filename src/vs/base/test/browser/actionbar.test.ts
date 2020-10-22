/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ActionBar, prepareActions } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { Action, Separator } from 'vs/Base/common/actions';

suite('ActionBar', () => {

	test('prepareActions()', function () {
		let a1 = new Separator();
		let a2 = new Separator();
		let a3 = new Action('a3');
		let a4 = new Separator();
		let a5 = new Separator();
		let a6 = new Action('a6');
		let a7 = new Separator();

		let actions = prepareActions([a1, a2, a3, a4, a5, a6, a7]);
		assert.strictEqual(actions.length, 3); // duplicate separators get removed
		assert(actions[0] === a3);
		assert(actions[1] === a5);
		assert(actions[2] === a6);
	});

	test('hasAction()', function () {
		const container = document.createElement('div');
		const actionBar = new ActionBar(container);

		let a1 = new Action('a1');
		let a2 = new Action('a2');

		actionBar.push(a1);
		assert.equal(actionBar.hasAction(a1), true);
		assert.equal(actionBar.hasAction(a2), false);

		actionBar.pull(0);
		assert.equal(actionBar.hasAction(a1), false);

		actionBar.push(a1, { index: 1 });
		actionBar.push(a2, { index: 0 });
		assert.equal(actionBar.hasAction(a1), true);
		assert.equal(actionBar.hasAction(a2), true);

		actionBar.pull(0);
		assert.equal(actionBar.hasAction(a1), true);
		assert.equal(actionBar.hasAction(a2), false);

		actionBar.pull(0);
		assert.equal(actionBar.hasAction(a1), false);
		assert.equal(actionBar.hasAction(a2), false);

		actionBar.push(a1);
		assert.equal(actionBar.hasAction(a1), true);
		actionBar.clear();
		assert.equal(actionBar.hasAction(a1), false);
	});
});
