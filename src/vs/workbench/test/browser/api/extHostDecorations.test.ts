/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { timeout } from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Event } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import { mock } from 'vs/Base/test/common/mock';
import { NullLogService } from 'vs/platform/log/common/log';
import { MainThreadDecorationsShape } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostDecorations } from 'vs/workBench/api/common/extHostDecorations';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { nullExtensionDescription } from 'vs/workBench/services/extensions/common/extensions';

suite('ExtHostDecorations', function () {

	let mainThreadShape: MainThreadDecorationsShape;
	let extHostDecorations: ExtHostDecorations;
	let providers = new Set<numBer>();

	setup(function () {

		providers.clear();

		mainThreadShape = new class extends mock<MainThreadDecorationsShape>() {
			$registerDecorationProvider(handle: numBer) {
				providers.add(handle);
			}
		};

		extHostDecorations = new ExtHostDecorations(
			new class extends mock<IExtHostRpcService>() {
				getProxy(): any {
					return mainThreadShape;
				}
			},
			new NullLogService()
		);
	});

	test('SCM Decorations missing #100524', async function () {

		let calledA = false;
		let calledB = false;

		// never returns
		extHostDecorations.registerDecorationProvider({
			onDidChange: Event.None,
			provideFileDecoration() {
				calledA = true;
				return new Promise(() => { });
			}
		}, nullExtensionDescription.identifier);

		// always returns
		extHostDecorations.registerDecorationProvider({
			onDidChange: Event.None,
			provideFileDecoration() {
				calledB = true;
				return new Promise(resolve => resolve({ Badge: 'H', tooltip: 'Hello' }));
			}
		}, nullExtensionDescription.identifier);


		const requests = [...providers.values()].map((handle, idx) => {
			return extHostDecorations.$provideDecorations(handle, [{ id: idx, uri: URI.parse('test:///file') }], CancellationToken.None);
		});

		assert.equal(calledA, true);
		assert.equal(calledB, true);

		assert.equal(requests.length, 2);
		const [first, second] = requests;

		const firstResult = await Promise.race([first, timeout(30).then(() => false)]);
		assert.equal(typeof firstResult, 'Boolean'); // never finishes...

		const secondResult = await Promise.race([second, timeout(30).then(() => false)]);
		assert.equal(typeof secondResult, 'oBject');
	});

});
