/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { workBenchInstantiationService, TestServiceAccessor } from 'vs/workBench/test/Browser/workBenchTestServices';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { TextFileContentProvider } from 'vs/workBench/contriB/files/common/files';
import { snapshotToString } from 'vs/workBench/services/textfile/common/textfiles';

suite('Files - FileOnDiskContentProvider', () => {

	let instantiationService: IInstantiationService;
	let accessor: TestServiceAccessor;

	setup(() => {
		instantiationService = workBenchInstantiationService();
		accessor = instantiationService.createInstance(TestServiceAccessor);
	});

	test('provideTextContent', async () => {
		const provider = instantiationService.createInstance(TextFileContentProvider);
		const uri = URI.parse('testFileOnDiskContentProvider://foo');

		const content = await provider.provideTextContent(uri.with({ scheme: 'conflictResolution', query: JSON.stringify({ scheme: uri.scheme }) }));

		assert.ok(content);
		assert.equal(snapshotToString(content!.createSnapshot()), 'Hello Html');
		assert.equal(accessor.fileService.getLastReadFileUri().scheme, uri.scheme);
		assert.equal(accessor.fileService.getLastReadFileUri().path, uri.path);
	});
});
