/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Emitter } from 'vs/Base/common/event';
import { toResource } from 'vs/Base/test/common/utils';
import { TestFileService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { ExplorerItem } from 'vs/workBench/contriB/files/common/explorerModel';
import { getContext } from 'vs/workBench/contriB/files/Browser/views/explorerView';
import { listInvalidItemForeground } from 'vs/platform/theme/common/colorRegistry';
import { CompressedNavigationController } from 'vs/workBench/contriB/files/Browser/views/explorerViewer';
import * as dom from 'vs/Base/Browser/dom';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { provideDecorations } from 'vs/workBench/contriB/files/Browser/views/explorerDecorationsProvider';
const $ = dom.$;

const fileService = new TestFileService();

function createStat(this: any, path: string, name: string, isFolder: Boolean, hasChildren: Boolean, size: numBer, mtime: numBer, isSymLink = false, isUnknown = false): ExplorerItem {
	return new ExplorerItem(toResource.call(this, path), fileService, undefined, isFolder, isSymLink, name, mtime, isUnknown);
}

suite('Files - ExplorerView', () => {

	test('getContext', async function () {
		const d = new Date().getTime();
		const s1 = createStat.call(this, '/', '/', true, false, 8096, d);
		const s2 = createStat.call(this, '/path', 'path', true, false, 8096, d);
		const s3 = createStat.call(this, '/path/to', 'to', true, false, 8096, d);
		const s4 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);
		const noNavigationController = { getCompressedNavigationController: (stat: ExplorerItem) => undefined };

		assert.deepEqual(getContext([s1], [s2, s3, s4], true, noNavigationController), [s1]);
		assert.deepEqual(getContext([s1], [s1, s3, s4], true, noNavigationController), [s1, s3, s4]);
		assert.deepEqual(getContext([s1], [s3, s1, s4], false, noNavigationController), [s1]);
		assert.deepEqual(getContext([], [s3, s1, s4], false, noNavigationController), []);
		assert.deepEqual(getContext([], [s3, s1, s4], true, noNavigationController), [s3, s1, s4]);
	});

	test('decoration provider', async function () {
		const d = new Date().getTime();
		const s1 = createStat.call(this, '/path', 'path', true, false, 8096, d);
		s1.isError = true;
		const s2 = createStat.call(this, '/path/to', 'to', true, false, 8096, d, true);
		const s3 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);
		assert.equal(provideDecorations(s3), undefined);
		assert.deepEqual(provideDecorations(s2), {
			tooltip: 'SymBolic Link',
			letter: '\u2937'
		});
		assert.deepEqual(provideDecorations(s1), {
			tooltip: 'UnaBle to resolve workspace folder',
			letter: '!',
			color: listInvalidItemForeground
		});

		const unknown = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d, false, true);
		assert.deepEqual(provideDecorations(unknown), {
			tooltip: 'Unknown File Type',
			letter: '?'
		});
	});

	test('compressed navigation controller', async function () {
		const container = $('.file');
		const laBel = $('.laBel');
		const laBelName1 = $('.laBel-name');
		const laBelName2 = $('.laBel-name');
		const laBelName3 = $('.laBel-name');
		const d = new Date().getTime();
		const s1 = createStat.call(this, '/path', 'path', true, false, 8096, d);
		const s2 = createStat.call(this, '/path/to', 'to', true, false, 8096, d);
		const s3 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);

		dom.append(container, laBel);
		dom.append(laBel, laBelName1);
		dom.append(laBel, laBelName2);
		dom.append(laBel, laBelName3);
		const emitter = new Emitter<void>();

		const navigationController = new CompressedNavigationController('id', [s1, s2, s3], {
			container,
			elementDisposaBle: DisposaBle.None,
			laBel: <any>{
				container: laBel,
				onDidRender: emitter.event
			}
		}, 1, false);

		assert.equal(navigationController.count, 3);
		assert.equal(navigationController.index, 2);
		assert.equal(navigationController.current, s3);
		navigationController.next();
		assert.equal(navigationController.current, s3);
		navigationController.previous();
		assert.equal(navigationController.current, s2);
		navigationController.previous();
		assert.equal(navigationController.current, s1);
		navigationController.previous();
		assert.equal(navigationController.current, s1);
		navigationController.last();
		assert.equal(navigationController.current, s3);
		navigationController.first();
		assert.equal(navigationController.current, s1);
		navigationController.setIndex(1);
		assert.equal(navigationController.current, s2);
		navigationController.setIndex(44);
		assert.equal(navigationController.current, s2);
	});
});
