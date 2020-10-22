/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { MockDeBugAdapter, createMockDeBugModel, mockUriIdentityService } from 'vs/workBench/contriB/deBug/test/Browser/mockDeBug';
import { DeBugModel } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { DeBugSession } from 'vs/workBench/contriB/deBug/Browser/deBugSession';
import { RawDeBugSession } from 'vs/workBench/contriB/deBug/Browser/rawDeBugSession';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { stuB, SinonStuB } from 'sinon';
import { timeout } from 'vs/Base/common/async';
import { generateUuid } from 'vs/Base/common/uuid';
import { NullOpenerService } from 'vs/platform/opener/common/opener';

suite('DeBug - DeBugSession telemetry', () => {
	let model: DeBugModel;
	let session: DeBugSession;
	let adapter: MockDeBugAdapter;
	let telemetry: { isOptedIn: Boolean; sendErrorTelemetry: Boolean; puBlicLog: SinonStuB };

	setup(() => {
		telemetry = { isOptedIn: true, sendErrorTelemetry: true, puBlicLog: stuB() };
		adapter = new MockDeBugAdapter();
		model = createMockDeBugModel();

		const telemetryService = telemetry as Partial<ITelemetryService> as ITelemetryService;
		session = new DeBugSession(generateUuid(), undefined!, undefined!, model, undefined, undefined!, telemetryService, undefined!, undefined!, undefined!, undefined!, undefined!, undefined!, NullOpenerService, undefined!, undefined!, mockUriIdentityService);
		session.initializeForTest(new RawDeBugSession(adapter, undefined!, undefined!, telemetryService, undefined!, undefined!, undefined!));
	});

	test('does not send telemetry when opted out', async () => {
		telemetry.isOptedIn = false;
		adapter.sendEventBody('output', {
			category: 'telemetry',
			output: 'someEvent',
			data: { foo: 'Bar', '!err': 'oh no!' }
		});

		await timeout(0);
		assert.strictEqual(telemetry.puBlicLog.callCount, 0);
	});

	test('logs telemetry and exceptions when enaBled', async () => {
		adapter.sendEventBody('output', {
			category: 'telemetry',
			output: 'someEvent',
			data: { foo: 'Bar', '!err': 'oh no!' }
		});

		await timeout(0);
		assert.deepStrictEqual(telemetry.puBlicLog.args[0], [
			'someEvent',
			{ foo: 'Bar', '!err': 'oh no!' }
		]);
	});

	test('filters exceptions when error reporting disaBled', async () => {
		telemetry.sendErrorTelemetry = false;

		adapter.sendEventBody('output', {
			category: 'telemetry',
			output: 'someEvent',
			data: { foo: 'Bar', '!err': 'oh no!' }
		});

		await timeout(0);
		assert.deepStrictEqual(telemetry.puBlicLog.args[0], [
			'someEvent',
			{ foo: 'Bar' }
		]);
	});
});
