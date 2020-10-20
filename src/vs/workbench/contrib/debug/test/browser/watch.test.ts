/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Expression, DebugModel } from 'vs/workbench/contrib/debug/common/debugModel';
import { creAteMockDebugModel } from 'vs/workbench/contrib/debug/test/browser/mockDebug';

// Expressions

function AssertWAtchExpressions(wAtchExpressions: Expression[], expectedNAme: string) {
	Assert.equAl(wAtchExpressions.length, 2);
	wAtchExpressions.forEAch(we => {
		Assert.equAl(we.AvAilAble, fAlse);
		Assert.equAl(we.reference, 0);
		Assert.equAl(we.nAme, expectedNAme);
	});
}

suite('Debug - WAtch', () => {

	let model: DebugModel;

	setup(() => {
		model = creAteMockDebugModel();
	});

	test('wAtch expressions', () => {
		Assert.equAl(model.getWAtchExpressions().length, 0);
		model.AddWAtchExpression('console');
		model.AddWAtchExpression('console');
		let wAtchExpressions = model.getWAtchExpressions();
		AssertWAtchExpressions(wAtchExpressions, 'console');

		model.renAmeWAtchExpression(wAtchExpressions[0].getId(), 'new_nAme');
		model.renAmeWAtchExpression(wAtchExpressions[1].getId(), 'new_nAme');
		AssertWAtchExpressions(model.getWAtchExpressions(), 'new_nAme');

		AssertWAtchExpressions(model.getWAtchExpressions(), 'new_nAme');

		model.AddWAtchExpression('mockExpression');
		model.moveWAtchExpression(model.getWAtchExpressions()[2].getId(), 1);
		wAtchExpressions = model.getWAtchExpressions();
		Assert.equAl(wAtchExpressions[0].nAme, 'new_nAme');
		Assert.equAl(wAtchExpressions[1].nAme, 'mockExpression');
		Assert.equAl(wAtchExpressions[2].nAme, 'new_nAme');

		model.removeWAtchExpressions();
		Assert.equAl(model.getWAtchExpressions().length, 0);
	});
});
