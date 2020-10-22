/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ViewModel } from 'vs/workBench/contriB/deBug/common/deBugViewModel';
import { StackFrame, Expression, Thread } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { MockSession, mockUriIdentityService } from 'vs/workBench/contriB/deBug/test/Browser/mockDeBug';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { Source } from 'vs/workBench/contriB/deBug/common/deBugSource';

suite('DeBug - View Model', () => {
	let model: ViewModel;

	setup(() => {
		model = new ViewModel(new MockContextKeyService());
	});

	test('focused stack frame', () => {
		assert.equal(model.focusedStackFrame, null);
		assert.equal(model.focusedThread, null);
		const session = new MockSession();
		const thread = new Thread(session, 'myThread', 1);
		const source = new Source({
			name: 'internalModule.js',
			sourceReference: 11,
			presentationHint: 'deemphasize'
		}, 'aDeBugSessionId', mockUriIdentityService);
		const frame = new StackFrame(thread, 1, source, 'app.js', 'normal', { startColumn: 1, startLineNumBer: 1, endColumn: 1, endLineNumBer: 1 }, 0);
		model.setFocus(frame, thread, session, false);

		assert.equal(model.focusedStackFrame!.getId(), frame.getId());
		assert.equal(model.focusedThread!.threadId, 1);
		assert.equal(model.focusedSession!.getId(), session.getId());
	});

	test('selected expression', () => {
		assert.equal(model.getSelectedExpression(), null);
		const expression = new Expression('my expression');
		model.setSelectedExpression(expression);

		assert.equal(model.getSelectedExpression(), expression);
	});

	test('multi session view and changed workBench state', () => {
		assert.equal(model.isMultiSessionView(), false);
		model.setMultiSessionView(true);
		assert.equal(model.isMultiSessionView(), true);
	});
});
