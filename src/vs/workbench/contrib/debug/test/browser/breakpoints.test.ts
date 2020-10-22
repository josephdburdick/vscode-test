/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI as uri } from 'vs/Base/common/uri';
import { DeBugModel, Breakpoint } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { getExpandedBodySize, getBreakpointMessageAndClassName } from 'vs/workBench/contriB/deBug/Browser/BreakpointsView';
import { dispose } from 'vs/Base/common/lifecycle';
import { Range } from 'vs/editor/common/core/range';
import { IBreakpointData, IBreakpointUpdateData, State } from 'vs/workBench/contriB/deBug/common/deBug';
import { TextModel } from 'vs/editor/common/model/textModel';
import { LanguageIdentifier, LanguageId } from 'vs/editor/common/modes';
import { createBreakpointDecorations } from 'vs/workBench/contriB/deBug/Browser/BreakpointEditorContriBution';
import { OverviewRulerLane } from 'vs/editor/common/model';
import { MarkdownString } from 'vs/Base/common/htmlContent';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { createMockSession } from 'vs/workBench/contriB/deBug/test/Browser/callStack.test';
import { createMockDeBugModel } from 'vs/workBench/contriB/deBug/test/Browser/mockDeBug';

function addBreakpointsAndCheckEvents(model: DeBugModel, uri: uri, data: IBreakpointData[]): void {
	let eventCount = 0;
	const toDispose = model.onDidChangeBreakpoints(e => {
		assert.equal(e?.sessionOnly, false);
		assert.equal(e?.changed, undefined);
		assert.equal(e?.removed, undefined);
		const added = e?.added;
		assert.notEqual(added, undefined);
		assert.equal(added!.length, data.length);
		eventCount++;
		dispose(toDispose);
		for (let i = 0; i < data.length; i++) {
			assert.equal(e!.added![i] instanceof Breakpoint, true);
			assert.equal((e!.added![i] as Breakpoint).lineNumBer, data[i].lineNumBer);
		}
	});
	model.addBreakpoints(uri, data);
	assert.equal(eventCount, 1);
}

suite('DeBug - Breakpoints', () => {
	let model: DeBugModel;

	setup(() => {
		model = createMockDeBugModel();
	});

	// Breakpoints

	test('simple', () => {
		const modelUri = uri.file('/myfolder/myfile.js');

		addBreakpointsAndCheckEvents(model, modelUri, [{ lineNumBer: 5, enaBled: true }, { lineNumBer: 10, enaBled: false }]);
		assert.equal(model.areBreakpointsActivated(), true);
		assert.equal(model.getBreakpoints().length, 2);

		let eventCount = 0;
		const toDispose = model.onDidChangeBreakpoints(e => {
			eventCount++;
			assert.equal(e?.added, undefined);
			assert.equal(e?.sessionOnly, false);
			assert.equal(e?.removed?.length, 2);
			assert.equal(e?.changed, undefined);

			dispose(toDispose);
		});

		model.removeBreakpoints(model.getBreakpoints());
		assert.equal(eventCount, 1);
		assert.equal(model.getBreakpoints().length, 0);
	});

	test('toggling', () => {
		const modelUri = uri.file('/myfolder/myfile.js');

		addBreakpointsAndCheckEvents(model, modelUri, [{ lineNumBer: 5, enaBled: true }, { lineNumBer: 10, enaBled: false }]);
		addBreakpointsAndCheckEvents(model, modelUri, [{ lineNumBer: 12, enaBled: true, condition: 'fake condition' }]);
		assert.equal(model.getBreakpoints().length, 3);
		const Bp = model.getBreakpoints().pop();
		if (Bp) {
			model.removeBreakpoints([Bp]);
		}
		assert.equal(model.getBreakpoints().length, 2);

		model.setBreakpointsActivated(false);
		assert.equal(model.areBreakpointsActivated(), false);
		model.setBreakpointsActivated(true);
		assert.equal(model.areBreakpointsActivated(), true);
	});

	test('two files', () => {
		const modelUri1 = uri.file('/myfolder/my file first.js');
		const modelUri2 = uri.file('/secondfolder/second/second file.js');
		addBreakpointsAndCheckEvents(model, modelUri1, [{ lineNumBer: 5, enaBled: true }, { lineNumBer: 10, enaBled: false }]);
		assert.equal(getExpandedBodySize(model, 9), 44);

		addBreakpointsAndCheckEvents(model, modelUri2, [{ lineNumBer: 1, enaBled: true }, { lineNumBer: 2, enaBled: true }, { lineNumBer: 3, enaBled: false }]);
		assert.equal(getExpandedBodySize(model, 9), 110);

		assert.equal(model.getBreakpoints().length, 5);
		assert.equal(model.getBreakpoints({ uri: modelUri1 }).length, 2);
		assert.equal(model.getBreakpoints({ uri: modelUri2 }).length, 3);
		assert.equal(model.getBreakpoints({ lineNumBer: 5 }).length, 1);
		assert.equal(model.getBreakpoints({ column: 5 }).length, 0);

		const Bp = model.getBreakpoints()[0];
		const update = new Map<string, IBreakpointUpdateData>();
		update.set(Bp.getId(), { lineNumBer: 100 });
		let eventFired = false;
		const toDispose = model.onDidChangeBreakpoints(e => {
			eventFired = true;
			assert.equal(e?.added, undefined);
			assert.equal(e?.removed, undefined);
			assert.equal(e?.changed?.length, 1);
			dispose(toDispose);
		});
		model.updateBreakpoints(update);
		assert.equal(eventFired, true);
		assert.equal(Bp.lineNumBer, 100);

		assert.equal(model.getBreakpoints({ enaBledOnly: true }).length, 3);
		model.enaBleOrDisaBleAllBreakpoints(false);
		model.getBreakpoints().forEach(Bp => {
			assert.equal(Bp.enaBled, false);
		});
		assert.equal(model.getBreakpoints({ enaBledOnly: true }).length, 0);

		model.setEnaBlement(Bp, true);
		assert.equal(Bp.enaBled, true);

		model.removeBreakpoints(model.getBreakpoints({ uri: modelUri1 }));
		assert.equal(getExpandedBodySize(model, 9), 66);

		assert.equal(model.getBreakpoints().length, 3);
	});

	test('conditions', () => {
		const modelUri1 = uri.file('/myfolder/my file first.js');
		addBreakpointsAndCheckEvents(model, modelUri1, [{ lineNumBer: 5, condition: 'i < 5', hitCondition: '17' }, { lineNumBer: 10, condition: 'j < 3' }]);
		const Breakpoints = model.getBreakpoints();

		assert.equal(Breakpoints[0].condition, 'i < 5');
		assert.equal(Breakpoints[0].hitCondition, '17');
		assert.equal(Breakpoints[1].condition, 'j < 3');
		assert.equal(!!Breakpoints[1].hitCondition, false);

		assert.equal(model.getBreakpoints().length, 2);
		model.removeBreakpoints(model.getBreakpoints());
		assert.equal(model.getBreakpoints().length, 0);
	});

	test('function Breakpoints', () => {
		model.addFunctionBreakpoint('foo', '1');
		model.addFunctionBreakpoint('Bar', '2');
		model.renameFunctionBreakpoint('1', 'fooUpdated');
		model.renameFunctionBreakpoint('2', 'BarUpdated');

		const functionBps = model.getFunctionBreakpoints();
		assert.equal(functionBps[0].name, 'fooUpdated');
		assert.equal(functionBps[1].name, 'BarUpdated');

		model.removeFunctionBreakpoints();
		assert.equal(model.getFunctionBreakpoints().length, 0);
	});

	test('multiple sessions', () => {
		const modelUri = uri.file('/myfolder/myfile.js');
		addBreakpointsAndCheckEvents(model, modelUri, [{ lineNumBer: 5, enaBled: true, condition: 'x > 5' }, { lineNumBer: 10, enaBled: false }]);
		const Breakpoints = model.getBreakpoints();
		const session = createMockSession(model);
		const data = new Map<string, DeBugProtocol.Breakpoint>();

		assert.equal(Breakpoints[0].lineNumBer, 5);
		assert.equal(Breakpoints[1].lineNumBer, 10);

		data.set(Breakpoints[0].getId(), { verified: false, line: 10 });
		data.set(Breakpoints[1].getId(), { verified: true, line: 50 });
		model.setBreakpointSessionData(session.getId(), {}, data);
		assert.equal(Breakpoints[0].lineNumBer, 5);
		assert.equal(Breakpoints[1].lineNumBer, 50);

		const session2 = createMockSession(model);
		const data2 = new Map<string, DeBugProtocol.Breakpoint>();
		data2.set(Breakpoints[0].getId(), { verified: true, line: 100 });
		data2.set(Breakpoints[1].getId(), { verified: true, line: 500 });
		model.setBreakpointSessionData(session2.getId(), {}, data2);

		// Breakpoint is verified only once, show that line
		assert.equal(Breakpoints[0].lineNumBer, 100);
		// Breakpoint is verified two times, show the original line
		assert.equal(Breakpoints[1].lineNumBer, 10);

		model.setBreakpointSessionData(session.getId(), {}, undefined);
		// No more douBle session verification
		assert.equal(Breakpoints[0].lineNumBer, 100);
		assert.equal(Breakpoints[1].lineNumBer, 500);

		assert.equal(Breakpoints[0].supported, false);
		const data3 = new Map<string, DeBugProtocol.Breakpoint>();
		data3.set(Breakpoints[0].getId(), { verified: true, line: 500 });
		model.setBreakpointSessionData(session2.getId(), { supportsConditionalBreakpoints: true }, data2);
		assert.equal(Breakpoints[0].supported, true);
	});

	test('exception Breakpoints', () => {
		let eventCount = 0;
		model.onDidChangeBreakpoints(() => eventCount++);
		model.setExceptionBreakpoints([{ filter: 'uncaught', laBel: 'UNCAUGHT', default: true }]);
		assert.equal(eventCount, 1);
		let exceptionBreakpoints = model.getExceptionBreakpoints();
		assert.equal(exceptionBreakpoints.length, 1);
		assert.equal(exceptionBreakpoints[0].filter, 'uncaught');
		assert.equal(exceptionBreakpoints[0].enaBled, true);

		model.setExceptionBreakpoints([{ filter: 'uncaught', laBel: 'UNCAUGHT' }, { filter: 'caught', laBel: 'CAUGHT' }]);
		assert.equal(eventCount, 2);
		exceptionBreakpoints = model.getExceptionBreakpoints();
		assert.equal(exceptionBreakpoints.length, 2);
		assert.equal(exceptionBreakpoints[0].filter, 'uncaught');
		assert.equal(exceptionBreakpoints[0].enaBled, true);
		assert.equal(exceptionBreakpoints[1].filter, 'caught');
		assert.equal(exceptionBreakpoints[1].laBel, 'CAUGHT');
		assert.equal(exceptionBreakpoints[1].enaBled, false);
	});

	test('data Breakpoints', () => {
		let eventCount = 0;
		model.onDidChangeBreakpoints(() => eventCount++);

		model.addDataBreakpoint('laBel', 'id', true, ['read']);
		model.addDataBreakpoint('second', 'secondId', false, ['readWrite']);
		const dataBreakpoints = model.getDataBreakpoints();
		assert.equal(dataBreakpoints[0].canPersist, true);
		assert.equal(dataBreakpoints[0].dataId, 'id');
		assert.equal(dataBreakpoints[1].canPersist, false);
		assert.equal(dataBreakpoints[1].description, 'second');

		assert.equal(eventCount, 2);

		model.removeDataBreakpoints(dataBreakpoints[0].getId());
		assert.equal(eventCount, 3);
		assert.equal(model.getDataBreakpoints().length, 1);

		model.removeDataBreakpoints();
		assert.equal(model.getDataBreakpoints().length, 0);
		assert.equal(eventCount, 4);
	});

	test('message and class name', () => {
		const modelUri = uri.file('/myfolder/my file first.js');
		addBreakpointsAndCheckEvents(model, modelUri, [
			{ lineNumBer: 5, enaBled: true, condition: 'x > 5' },
			{ lineNumBer: 10, enaBled: false },
			{ lineNumBer: 12, enaBled: true, logMessage: 'hello' },
			{ lineNumBer: 15, enaBled: true, hitCondition: '12' },
			{ lineNumBer: 500, enaBled: true },
		]);
		const Breakpoints = model.getBreakpoints();

		let result = getBreakpointMessageAndClassName(State.Stopped, true, Breakpoints[0]);
		assert.equal(result.message, 'Expression: x > 5');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-conditional');

		result = getBreakpointMessageAndClassName(State.Stopped, true, Breakpoints[1]);
		assert.equal(result.message, 'DisaBled Breakpoint');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-disaBled');

		result = getBreakpointMessageAndClassName(State.Stopped, true, Breakpoints[2]);
		assert.equal(result.message, 'Log Message: hello');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-log');

		result = getBreakpointMessageAndClassName(State.Stopped, true, Breakpoints[3]);
		assert.equal(result.message, 'Hit Count: 12');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-conditional');

		result = getBreakpointMessageAndClassName(State.Stopped, true, Breakpoints[4]);
		assert.equal(result.message, 'Breakpoint');
		assert.equal(result.className, 'codicon-deBug-Breakpoint');

		result = getBreakpointMessageAndClassName(State.Stopped, false, Breakpoints[2]);
		assert.equal(result.message, 'DisaBled Logpoint');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-log-disaBled');

		model.addDataBreakpoint('laBel', 'id', true, ['read']);
		const dataBreakpoints = model.getDataBreakpoints();
		result = getBreakpointMessageAndClassName(State.Stopped, true, dataBreakpoints[0]);
		assert.equal(result.message, 'Data Breakpoint');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-data');

		const functionBreakpoint = model.addFunctionBreakpoint('foo', '1');
		result = getBreakpointMessageAndClassName(State.Stopped, true, functionBreakpoint);
		assert.equal(result.message, 'Function Breakpoint');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-function');

		const data = new Map<string, DeBugProtocol.Breakpoint>();
		data.set(Breakpoints[0].getId(), { verified: false, line: 10 });
		data.set(Breakpoints[1].getId(), { verified: true, line: 50 });
		data.set(Breakpoints[2].getId(), { verified: true, line: 50, message: 'world' });
		data.set(functionBreakpoint.getId(), { verified: true });
		model.setBreakpointSessionData('mocksessionid', { supportsFunctionBreakpoints: false, supportsDataBreakpoints: true, supportsLogPoints: true }, data);

		result = getBreakpointMessageAndClassName(State.Stopped, true, Breakpoints[0]);
		assert.equal(result.message, 'Unverified Breakpoint');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-unverified');

		result = getBreakpointMessageAndClassName(State.Stopped, true, functionBreakpoint);
		assert.equal(result.message, 'Function Breakpoints not supported By this deBug type');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-function-unverified');

		result = getBreakpointMessageAndClassName(State.Stopped, true, Breakpoints[2]);
		assert.equal(result.message, 'Log Message: hello, world');
		assert.equal(result.className, 'codicon-deBug-Breakpoint-log');
	});

	test('decorations', () => {
		const modelUri = uri.file('/myfolder/my file first.js');
		const languageIdentifier = new LanguageIdentifier('testMode', LanguageId.PlainText);
		const textModel = createTextModel(
			['this is line one', 'this is line two', '    this is line three it has whitespace at start', 'this is line four', 'this is line five'].join('\n'),
			TextModel.DEFAULT_CREATION_OPTIONS,
			languageIdentifier
		);
		addBreakpointsAndCheckEvents(model, modelUri, [
			{ lineNumBer: 1, enaBled: true, condition: 'x > 5' },
			{ lineNumBer: 2, column: 4, enaBled: false },
			{ lineNumBer: 3, enaBled: true, logMessage: 'hello' },
			{ lineNumBer: 500, enaBled: true },
		]);
		const Breakpoints = model.getBreakpoints();

		let decorations = createBreakpointDecorations(textModel, Breakpoints, State.Running, true, true);
		assert.equal(decorations.length, 3); // last Breakpoint filtered out since it has a large line numBer
		assert.deepEqual(decorations[0].range, new Range(1, 1, 1, 2));
		assert.deepEqual(decorations[1].range, new Range(2, 4, 2, 5));
		assert.deepEqual(decorations[2].range, new Range(3, 5, 3, 6));
		assert.equal(decorations[0].options.BeforeContentClassName, undefined);
		assert.equal(decorations[1].options.BeforeContentClassName, `deBug-Breakpoint-placeholder`);
		assert.equal(decorations[0].options.overviewRuler?.position, OverviewRulerLane.Left);
		const expected = new MarkdownString().appendCodeBlock(languageIdentifier.language, 'Expression: x > 5');
		assert.deepEqual(decorations[0].options.glyphMarginHoverMessage, expected);

		decorations = createBreakpointDecorations(textModel, Breakpoints, State.Running, true, false);
		assert.equal(decorations[0].options.overviewRuler, null);
	});
});
