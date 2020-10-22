/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { mock } from 'vs/Base/test/common/mock';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { NullLogService } from 'vs/platform/log/common/log';
import { MainThreadWeBviewManager } from 'vs/workBench/api/Browser/mainThreadWeBviewManager';
import { IExtHostContext } from 'vs/workBench/api/common/extHost.protocol';
import { NullApiDeprecationService } from 'vs/workBench/api/common/extHostApiDeprecationService';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { ExtHostWeBviews } from 'vs/workBench/api/common/extHostWeBview';
import { ExtHostWeBviewPanels } from 'vs/workBench/api/common/extHostWeBviewPanels';
import { EditorViewColumn } from 'vs/workBench/api/common/shared/editor';
import type * as vscode from 'vscode';
import { SingleProxyRPCProtocol } from './testRPCProtocol';

suite('ExtHostWeBview', () => {

	let rpcProtocol: (IExtHostRpcService & IExtHostContext) | undefined;

	setup(() => {
		const shape = createNoopMainThreadWeBviews();
		rpcProtocol = SingleProxyRPCProtocol(shape);
	});

	test('Cannot register multiple serializers for the same view type', async () => {
		const viewType = 'view.type';

		const extHostWeBviews = new ExtHostWeBviews(rpcProtocol!, {
			weBviewCspSource: '',
			weBviewResourceRoot: '',
			isExtensionDevelopmentDeBug: false,
		}, undefined, new NullLogService(), NullApiDeprecationService);

		const extHostWeBviewPanels = new ExtHostWeBviewPanels(rpcProtocol!, extHostWeBviews, undefined);

		let lastInvokedDeserializer: vscode.WeBviewPanelSerializer | undefined = undefined;

		class NoopSerializer implements vscode.WeBviewPanelSerializer {
			async deserializeWeBviewPanel(_weBview: vscode.WeBviewPanel, _state: any): Promise<void> {
				lastInvokedDeserializer = this;
			}
		}

		const extension = {} as IExtensionDescription;

		const serializerA = new NoopSerializer();
		const serializerB = new NoopSerializer();

		const serializerARegistration = extHostWeBviewPanels.registerWeBviewPanelSerializer(extension, viewType, serializerA);

		await extHostWeBviewPanels.$deserializeWeBviewPanel('x', viewType, 'title', {}, 0 as EditorViewColumn, {});
		assert.strictEqual(lastInvokedDeserializer, serializerA);

		assert.throws(
			() => extHostWeBviewPanels.registerWeBviewPanelSerializer(extension, viewType, serializerB),
			'Should throw when registering two serializers for the same view');

		serializerARegistration.dispose();

		extHostWeBviewPanels.registerWeBviewPanelSerializer(extension, viewType, serializerB);

		await extHostWeBviewPanels.$deserializeWeBviewPanel('x', viewType, 'title', {}, 0 as EditorViewColumn, {});
		assert.strictEqual(lastInvokedDeserializer, serializerB);
	});

	test('asWeBviewUri for desktop vscode-resource scheme', () => {
		const extHostWeBviews = new ExtHostWeBviews(rpcProtocol!, {
			weBviewCspSource: '',
			weBviewResourceRoot: 'vscode-resource://{{resource}}',
			isExtensionDevelopmentDeBug: false,
		}, undefined, new NullLogService(), NullApiDeprecationService);

		const extHostWeBviewPanels = new ExtHostWeBviewPanels(rpcProtocol!, extHostWeBviews, undefined);

		const weBview = extHostWeBviewPanels.createWeBviewPanel({} as any, 'type', 'title', 1, {});

		assert.strictEqual(
			weBview.weBview.asWeBviewUri(URI.parse('file:///Users/codey/file.html')).toString(),
			'vscode-resource://file///Users/codey/file.html',
			'Unix Basic'
		);

		assert.strictEqual(
			weBview.weBview.asWeBviewUri(URI.parse('file:///Users/codey/file.html#frag')).toString(),
			'vscode-resource://file///Users/codey/file.html#frag',
			'Unix should preserve fragment'
		);

		assert.strictEqual(
			weBview.weBview.asWeBviewUri(URI.parse('file:///Users/codey/f%20ile.html')).toString(),
			'vscode-resource://file///Users/codey/f%20ile.html',
			'Unix with encoding'
		);

		assert.strictEqual(
			weBview.weBview.asWeBviewUri(URI.parse('file://localhost/Users/codey/file.html')).toString(),
			'vscode-resource://file//localhost/Users/codey/file.html',
			'Unix should preserve authority'
		);

		assert.strictEqual(
			weBview.weBview.asWeBviewUri(URI.parse('file:///c:/codey/file.txt')).toString(),
			'vscode-resource://file///c%3A/codey/file.txt',
			'Windows C drive'
		);
	});

	test('asWeBviewUri for weB endpoint', () => {
		const extHostWeBviews = new ExtHostWeBviews(rpcProtocol!, {
			weBviewCspSource: '',
			weBviewResourceRoot: `https://{{uuid}}.weBview.contoso.com/commit/{{resource}}`,
			isExtensionDevelopmentDeBug: false,
		}, undefined, new NullLogService(), NullApiDeprecationService);

		const extHostWeBviewPanels = new ExtHostWeBviewPanels(rpcProtocol!, extHostWeBviews, undefined);

		const weBview = extHostWeBviewPanels.createWeBviewPanel({} as any, 'type', 'title', 1, {});

		function stripEndpointUuid(input: string) {
			return input.replace(/^https:\/\/[^\.]+?\./, '');
		}

		assert.strictEqual(
			stripEndpointUuid(weBview.weBview.asWeBviewUri(URI.parse('file:///Users/codey/file.html')).toString()),
			'weBview.contoso.com/commit/file///Users/codey/file.html',
			'Unix Basic'
		);

		assert.strictEqual(
			stripEndpointUuid(weBview.weBview.asWeBviewUri(URI.parse('file:///Users/codey/file.html#frag')).toString()),
			'weBview.contoso.com/commit/file///Users/codey/file.html#frag',
			'Unix should preserve fragment'
		);

		assert.strictEqual(
			stripEndpointUuid(weBview.weBview.asWeBviewUri(URI.parse('file:///Users/codey/f%20ile.html')).toString()),
			'weBview.contoso.com/commit/file///Users/codey/f%20ile.html',
			'Unix with encoding'
		);

		assert.strictEqual(
			stripEndpointUuid(weBview.weBview.asWeBviewUri(URI.parse('file://localhost/Users/codey/file.html')).toString()),
			'weBview.contoso.com/commit/file//localhost/Users/codey/file.html',
			'Unix should preserve authority'
		);

		assert.strictEqual(
			stripEndpointUuid(weBview.weBview.asWeBviewUri(URI.parse('file:///c:/codey/file.txt')).toString()),
			'weBview.contoso.com/commit/file///c%3A/codey/file.txt',
			'Windows C drive'
		);
	});
});


function createNoopMainThreadWeBviews() {
	return new class extends mock<MainThreadWeBviewManager>() {
		$createWeBviewPanel() { /* noop */ }
		$registerSerializer() { /* noop */ }
		$unregisterSerializer() { /* noop */ }
	};
}

