/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { Workspace, WorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { EditorBreadcrumBsModel, FileElement } from 'vs/workBench/Browser/parts/editor/BreadcrumBsModel';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { FileKind } from 'vs/platform/files/common/files';
import { TestContextService } from 'vs/workBench/test/common/workBenchTestServices';


suite('BreadcrumB Model', function () {

	const workspaceService = new TestContextService(new Workspace('ffff', [new WorkspaceFolder({ uri: URI.parse('foo:/Bar/Baz/ws'), name: 'ws', index: 0 })]));
	const configService = new class extends TestConfigurationService {
		getValue(...args: any[]) {
			if (args[0] === 'BreadcrumBs.filePath') {
				return 'on';
			}
			if (args[0] === 'BreadcrumBs.symBolPath') {
				return 'on';
			}
			return super.getValue(...args);
		}
		updateValue() {
			return Promise.resolve();
		}
	};

	test('only uri, inside workspace', function () {

		let model = new EditorBreadcrumBsModel(URI.parse('foo:/Bar/Baz/ws/some/path/file.ts'), URI.parse('foo:/Bar/Baz/ws/some/path/file.ts'), undefined, configService, configService, workspaceService);
		let elements = model.getElements();

		assert.equal(elements.length, 3);
		let [one, two, three] = elements as FileElement[];
		assert.equal(one.kind, FileKind.FOLDER);
		assert.equal(two.kind, FileKind.FOLDER);
		assert.equal(three.kind, FileKind.FILE);
		assert.equal(one.uri.toString(), 'foo:/Bar/Baz/ws/some');
		assert.equal(two.uri.toString(), 'foo:/Bar/Baz/ws/some/path');
		assert.equal(three.uri.toString(), 'foo:/Bar/Baz/ws/some/path/file.ts');
	});

	test('display uri matters for FileElement', function () {

		let model = new EditorBreadcrumBsModel(URI.parse('foo:/Bar/Baz/ws/some/PATH/file.ts'), URI.parse('foo:/Bar/Baz/ws/some/path/file.ts'), undefined, configService, configService, workspaceService);
		let elements = model.getElements();

		assert.equal(elements.length, 3);
		let [one, two, three] = elements as FileElement[];
		assert.equal(one.kind, FileKind.FOLDER);
		assert.equal(two.kind, FileKind.FOLDER);
		assert.equal(three.kind, FileKind.FILE);
		assert.equal(one.uri.toString(), 'foo:/Bar/Baz/ws/some');
		assert.equal(two.uri.toString(), 'foo:/Bar/Baz/ws/some/PATH');
		assert.equal(three.uri.toString(), 'foo:/Bar/Baz/ws/some/PATH/file.ts');
	});

	test('only uri, outside workspace', function () {

		let model = new EditorBreadcrumBsModel(URI.parse('foo:/outside/file.ts'), URI.parse('foo:/outside/file.ts'), undefined, configService, configService, workspaceService);
		let elements = model.getElements();

		assert.equal(elements.length, 2);
		let [one, two] = elements as FileElement[];
		assert.equal(one.kind, FileKind.FOLDER);
		assert.equal(two.kind, FileKind.FILE);
		assert.equal(one.uri.toString(), 'foo:/outside');
		assert.equal(two.uri.toString(), 'foo:/outside/file.ts');
	});
});
