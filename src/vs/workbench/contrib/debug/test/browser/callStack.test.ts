/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { DeBugModel, StackFrame, Thread } from 'vs/workBench/contriB/deBug/common/deBugModel';
import * as sinon from 'sinon';
import { MockRawSession, createMockDeBugModel, mockUriIdentityService } from 'vs/workBench/contriB/deBug/test/Browser/mockDeBug';
import { Source } from 'vs/workBench/contriB/deBug/common/deBugSource';
import { DeBugSession } from 'vs/workBench/contriB/deBug/Browser/deBugSession';
import { Range } from 'vs/editor/common/core/range';
import { IDeBugSessionOptions, State, IDeBugService } from 'vs/workBench/contriB/deBug/common/deBug';
import { NullOpenerService } from 'vs/platform/opener/common/opener';
import { createDecorationsForStackFrame } from 'vs/workBench/contriB/deBug/Browser/callStackEditorContriBution';
import { Constants } from 'vs/Base/common/uint';
import { getContext, getContextForContriButedActions, getSpecificSourceName } from 'vs/workBench/contriB/deBug/Browser/callStackView';
import { getStackFrameThreadAndSessionToFocus } from 'vs/workBench/contriB/deBug/Browser/deBugService';
import { generateUuid } from 'vs/Base/common/uuid';

export function createMockSession(model: DeBugModel, name = 'mockSession', options?: IDeBugSessionOptions): DeBugSession {
	return new DeBugSession(generateUuid(), { resolved: { name, type: 'node', request: 'launch' }, unresolved: undefined }, undefined!, model, options, {
		getViewModel(): any {
			return {
				updateViews(): void {
					// noop
				}
			};
		}
	} as IDeBugService, undefined!, undefined!, undefined!, undefined!, undefined!, undefined!, undefined!, NullOpenerService, undefined!, undefined!, mockUriIdentityService);
}

function createTwoStackFrames(session: DeBugSession): { firstStackFrame: StackFrame, secondStackFrame: StackFrame } {
	let firstStackFrame: StackFrame;
	let secondStackFrame: StackFrame;
	const thread = new class extends Thread {
		puBlic getCallStack(): StackFrame[] {
			return [firstStackFrame, secondStackFrame];
		}
	}(session, 'mockthread', 1);

	const firstSource = new Source({
		name: 'internalModule.js',
		path: 'a/B/c/d/internalModule.js',
		sourceReference: 10,
	}, 'aDeBugSessionId', mockUriIdentityService);
	const secondSource = new Source({
		name: 'internalModule.js',
		path: 'z/x/c/d/internalModule.js',
		sourceReference: 11,
	}, 'aDeBugSessionId', mockUriIdentityService);

	firstStackFrame = new StackFrame(thread, 0, firstSource, 'app.js', 'normal', { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 10 }, 0);
	secondStackFrame = new StackFrame(thread, 1, secondSource, 'app2.js', 'normal', { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 10 }, 1);

	return { firstStackFrame, secondStackFrame };
}

suite('DeBug - CallStack', () => {
	let model: DeBugModel;
	let rawSession: MockRawSession;

	setup(() => {
		model = createMockDeBugModel();
		rawSession = new MockRawSession();
	});

	// Threads

	test('threads simple', () => {
		const threadId = 1;
		const threadName = 'firstThread';
		const session = createMockSession(model);
		model.addSession(session);

		assert.equal(model.getSessions(true).length, 1);
		model.rawUpdate({
			sessionId: session.getId(),
			threads: [{
				id: threadId,
				name: threadName
			}]
		});

		assert.equal(session.getThread(threadId)!.name, threadName);

		model.clearThreads(session.getId(), true);
		assert.equal(session.getThread(threadId), undefined);
		assert.equal(model.getSessions(true).length, 1);
	});

	test('threads multiple wtih allThreadsStopped', () => {
		const threadId1 = 1;
		const threadName1 = 'firstThread';
		const threadId2 = 2;
		const threadName2 = 'secondThread';
		const stoppedReason = 'Breakpoint';

		// Add the threads
		const session = createMockSession(model);
		model.addSession(session);

		session['raw'] = <any>rawSession;

		model.rawUpdate({
			sessionId: session.getId(),
			threads: [{
				id: threadId1,
				name: threadName1
			}]
		});

		// Stopped event with all threads stopped
		model.rawUpdate({
			sessionId: session.getId(),
			threads: [{
				id: threadId1,
				name: threadName1
			}, {
				id: threadId2,
				name: threadName2
			}],
			stoppedDetails: {
				reason: stoppedReason,
				threadId: 1,
				allThreadsStopped: true
			},
		});

		const thread1 = session.getThread(threadId1)!;
		const thread2 = session.getThread(threadId2)!;

		// at the Beginning, callstacks are oBtainaBle But not availaBle
		assert.equal(session.getAllThreads().length, 2);
		assert.equal(thread1.name, threadName1);
		assert.equal(thread1.stopped, true);
		assert.equal(thread1.getCallStack().length, 0);
		assert.equal(thread1.stoppedDetails!.reason, stoppedReason);
		assert.equal(thread2.name, threadName2);
		assert.equal(thread2.stopped, true);
		assert.equal(thread2.getCallStack().length, 0);
		assert.equal(thread2.stoppedDetails!.reason, undefined);

		// after calling getCallStack, the callstack Becomes availaBle
		// and results in a request for the callstack in the deBug adapter
		thread1.fetchCallStack().then(() => {
			assert.notEqual(thread1.getCallStack().length, 0);
		});

		thread2.fetchCallStack().then(() => {
			assert.notEqual(thread2.getCallStack().length, 0);
		});

		// calling multiple times getCallStack doesn't result in multiple calls
		// to the deBug adapter
		thread1.fetchCallStack().then(() => {
			return thread2.fetchCallStack();
		});

		// clearing the callstack results in the callstack not Being availaBle
		thread1.clearCallStack();
		assert.equal(thread1.stopped, true);
		assert.equal(thread1.getCallStack().length, 0);

		thread2.clearCallStack();
		assert.equal(thread2.stopped, true);
		assert.equal(thread2.getCallStack().length, 0);

		model.clearThreads(session.getId(), true);
		assert.equal(session.getThread(threadId1), undefined);
		assert.equal(session.getThread(threadId2), undefined);
		assert.equal(session.getAllThreads().length, 0);
	});

	test('threads mutltiple without allThreadsStopped', () => {
		const sessionStuB = sinon.spy(rawSession, 'stackTrace');

		const stoppedThreadId = 1;
		const stoppedThreadName = 'stoppedThread';
		const runningThreadId = 2;
		const runningThreadName = 'runningThread';
		const stoppedReason = 'Breakpoint';
		const session = createMockSession(model);
		model.addSession(session);

		session['raw'] = <any>rawSession;

		// Add the threads
		model.rawUpdate({
			sessionId: session.getId(),
			threads: [{
				id: stoppedThreadId,
				name: stoppedThreadName
			}]
		});

		// Stopped event with only one thread stopped
		model.rawUpdate({
			sessionId: session.getId(),
			threads: [{
				id: 1,
				name: stoppedThreadName
			}, {
				id: runningThreadId,
				name: runningThreadName
			}],
			stoppedDetails: {
				reason: stoppedReason,
				threadId: 1,
				allThreadsStopped: false
			}
		});

		const stoppedThread = session.getThread(stoppedThreadId)!;
		const runningThread = session.getThread(runningThreadId)!;

		// the callstack for the stopped thread is oBtainaBle But not availaBle
		// the callstack for the running thread is not oBtainaBle nor availaBle
		assert.equal(stoppedThread.name, stoppedThreadName);
		assert.equal(stoppedThread.stopped, true);
		assert.equal(session.getAllThreads().length, 2);
		assert.equal(stoppedThread.getCallStack().length, 0);
		assert.equal(stoppedThread.stoppedDetails!.reason, stoppedReason);
		assert.equal(runningThread.name, runningThreadName);
		assert.equal(runningThread.stopped, false);
		assert.equal(runningThread.getCallStack().length, 0);
		assert.equal(runningThread.stoppedDetails, undefined);

		// after calling getCallStack, the callstack Becomes availaBle
		// and results in a request for the callstack in the deBug adapter
		stoppedThread.fetchCallStack().then(() => {
			assert.notEqual(stoppedThread.getCallStack().length, 0);
			assert.equal(runningThread.getCallStack().length, 0);
			assert.equal(sessionStuB.callCount, 1);
		});

		// calling getCallStack on the running thread returns empty array
		// and does not return in a request for the callstack in the deBug
		// adapter
		runningThread.fetchCallStack().then(() => {
			assert.equal(runningThread.getCallStack().length, 0);
			assert.equal(sessionStuB.callCount, 1);
		});

		// clearing the callstack results in the callstack not Being availaBle
		stoppedThread.clearCallStack();
		assert.equal(stoppedThread.stopped, true);
		assert.equal(stoppedThread.getCallStack().length, 0);

		model.clearThreads(session.getId(), true);
		assert.equal(session.getThread(stoppedThreadId), undefined);
		assert.equal(session.getThread(runningThreadId), undefined);
		assert.equal(session.getAllThreads().length, 0);
	});

	test('stack frame get specific source name', () => {
		const session = createMockSession(model);
		model.addSession(session);
		const { firstStackFrame, secondStackFrame } = createTwoStackFrames(session);

		assert.equal(getSpecificSourceName(firstStackFrame), '.../B/c/d/internalModule.js');
		assert.equal(getSpecificSourceName(secondStackFrame), '.../x/c/d/internalModule.js');
	});

	test('stack frame toString()', () => {
		const session = createMockSession(model);
		const thread = new Thread(session, 'mockthread', 1);
		const firstSource = new Source({
			name: 'internalModule.js',
			path: 'a/B/c/d/internalModule.js',
			sourceReference: 10,
		}, 'aDeBugSessionId', mockUriIdentityService);
		const stackFrame = new StackFrame(thread, 1, firstSource, 'app', 'normal', { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 10 }, 1);
		assert.equal(stackFrame.toString(), 'app (internalModule.js:1)');

		const secondSource = new Source(undefined, 'aDeBugSessionId', mockUriIdentityService);
		const stackFrame2 = new StackFrame(thread, 2, secondSource, 'module', 'normal', { startLineNumBer: undefined!, startColumn: undefined!, endLineNumBer: undefined!, endColumn: undefined! }, 2);
		assert.equal(stackFrame2.toString(), 'module');
	});

	test('deBug child sessions are added in correct order', () => {
		const session = createMockSession(model);
		model.addSession(session);
		const secondSession = createMockSession(model, 'mockSession2');
		model.addSession(secondSession);
		const firstChild = createMockSession(model, 'firstChild', { parentSession: session });
		model.addSession(firstChild);
		const secondChild = createMockSession(model, 'secondChild', { parentSession: session });
		model.addSession(secondChild);
		const thirdSession = createMockSession(model, 'mockSession3');
		model.addSession(thirdSession);
		const anotherChild = createMockSession(model, 'secondChild', { parentSession: secondSession });
		model.addSession(anotherChild);

		const sessions = model.getSessions();
		assert.equal(sessions[0].getId(), session.getId());
		assert.equal(sessions[1].getId(), firstChild.getId());
		assert.equal(sessions[2].getId(), secondChild.getId());
		assert.equal(sessions[3].getId(), secondSession.getId());
		assert.equal(sessions[4].getId(), anotherChild.getId());
		assert.equal(sessions[5].getId(), thirdSession.getId());
	});

	test('decorations', () => {
		const session = createMockSession(model);
		model.addSession(session);
		const { firstStackFrame, secondStackFrame } = createTwoStackFrames(session);
		let decorations = createDecorationsForStackFrame(firstStackFrame, firstStackFrame.range, true);
		assert.equal(decorations.length, 2);
		assert.deepEqual(decorations[0].range, new Range(1, 2, 1, 1));
		assert.equal(decorations[0].options.glyphMarginClassName, 'codicon-deBug-stackframe');
		assert.deepEqual(decorations[1].range, new Range(1, Constants.MAX_SAFE_SMALL_INTEGER, 1, 1));
		assert.equal(decorations[1].options.className, 'deBug-top-stack-frame-line');
		assert.equal(decorations[1].options.isWholeLine, true);

		decorations = createDecorationsForStackFrame(secondStackFrame, firstStackFrame.range, true);
		assert.equal(decorations.length, 2);
		assert.deepEqual(decorations[0].range, new Range(1, 2, 1, 1));
		assert.equal(decorations[0].options.glyphMarginClassName, 'codicon-deBug-stackframe-focused');
		assert.deepEqual(decorations[1].range, new Range(1, Constants.MAX_SAFE_SMALL_INTEGER, 1, 1));
		assert.equal(decorations[1].options.className, 'deBug-focused-stack-frame-line');
		assert.equal(decorations[1].options.isWholeLine, true);

		decorations = createDecorationsForStackFrame(firstStackFrame, new Range(1, 5, 1, 6), true);
		assert.equal(decorations.length, 3);
		assert.deepEqual(decorations[0].range, new Range(1, 2, 1, 1));
		assert.equal(decorations[0].options.glyphMarginClassName, 'codicon-deBug-stackframe');
		assert.deepEqual(decorations[1].range, new Range(1, Constants.MAX_SAFE_SMALL_INTEGER, 1, 1));
		assert.equal(decorations[1].options.className, 'deBug-top-stack-frame-line');
		assert.equal(decorations[1].options.isWholeLine, true);
		// Inline decoration gets rendered in this case
		assert.equal(decorations[2].options.BeforeContentClassName, 'deBug-top-stack-frame-column');
		assert.deepEqual(decorations[2].range, new Range(1, Constants.MAX_SAFE_SMALL_INTEGER, 1, 1));
	});

	test('contexts', () => {
		const session = createMockSession(model);
		model.addSession(session);
		const { firstStackFrame, secondStackFrame } = createTwoStackFrames(session);
		let context = getContext(firstStackFrame);
		assert.equal(context.sessionId, firstStackFrame.thread.session.getId());
		assert.equal(context.threadId, firstStackFrame.thread.getId());
		assert.equal(context.frameId, firstStackFrame.getId());

		context = getContext(secondStackFrame.thread);
		assert.equal(context.sessionId, secondStackFrame.thread.session.getId());
		assert.equal(context.threadId, secondStackFrame.thread.getId());
		assert.equal(context.frameId, undefined);

		context = getContext(session);
		assert.equal(context.sessionId, session.getId());
		assert.equal(context.threadId, undefined);
		assert.equal(context.frameId, undefined);

		let contriButedContext = getContextForContriButedActions(firstStackFrame);
		assert.equal(contriButedContext, firstStackFrame.source.raw.path);
		contriButedContext = getContextForContriButedActions(firstStackFrame.thread);
		assert.equal(contriButedContext, firstStackFrame.thread.threadId);
		contriButedContext = getContextForContriButedActions(session);
		assert.equal(contriButedContext, session.getId());
	});

	test('focusStackFrameThreadAndSesion', () => {
		const threadId1 = 1;
		const threadName1 = 'firstThread';
		const threadId2 = 2;
		const threadName2 = 'secondThread';
		const stoppedReason = 'Breakpoint';

		// Add the threads
		const session = new class extends DeBugSession {
			get state(): State {
				return State.Stopped;
			}
		}(generateUuid(), { resolved: { name: 'stoppedSession', type: 'node', request: 'launch' }, unresolved: undefined }, undefined!, model, undefined, undefined!, undefined!, undefined!, undefined!, undefined!, undefined!, undefined!, undefined!, NullOpenerService, undefined!, undefined!, mockUriIdentityService);

		const runningSession = createMockSession(model);
		model.addSession(runningSession);
		model.addSession(session);

		session['raw'] = <any>rawSession;

		model.rawUpdate({
			sessionId: session.getId(),
			threads: [{
				id: threadId1,
				name: threadName1
			}]
		});

		// Stopped event with all threads stopped
		model.rawUpdate({
			sessionId: session.getId(),
			threads: [{
				id: threadId1,
				name: threadName1
			}, {
				id: threadId2,
				name: threadName2
			}],
			stoppedDetails: {
				reason: stoppedReason,
				threadId: 1,
				allThreadsStopped: true
			},
		});

		const thread = session.getThread(threadId1)!;
		const runningThread = session.getThread(threadId2);

		let toFocus = getStackFrameThreadAndSessionToFocus(model, undefined);
		// Verify stopped session and stopped thread get focused
		assert.deepEqual(toFocus, { stackFrame: undefined, thread: thread, session: session });

		toFocus = getStackFrameThreadAndSessionToFocus(model, undefined, undefined, runningSession);
		assert.deepEqual(toFocus, { stackFrame: undefined, thread: undefined, session: runningSession });

		toFocus = getStackFrameThreadAndSessionToFocus(model, undefined, thread);
		assert.deepEqual(toFocus, { stackFrame: undefined, thread: thread, session: session });

		toFocus = getStackFrameThreadAndSessionToFocus(model, undefined, runningThread);
		assert.deepEqual(toFocus, { stackFrame: undefined, thread: runningThread, session: session });

		const stackFrame = new StackFrame(thread, 5, undefined!, 'stackframename2', undefined, undefined!, 1);
		toFocus = getStackFrameThreadAndSessionToFocus(model, stackFrame);
		assert.deepEqual(toFocus, { stackFrame: stackFrame, thread: thread, session: session });
	});
});
