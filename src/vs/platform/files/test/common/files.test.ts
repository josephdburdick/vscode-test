/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { isEqual, isEqualOrParent } from 'vs/Base/common/extpath';
import { FileChangeType, FileChangesEvent, isParent } from 'vs/platform/files/common/files';
import { isLinux, isMacintosh, isWindows } from 'vs/Base/common/platform';
import { toResource } from 'vs/Base/test/common/utils';

suite('Files', () => {

	test('FileChangesEvent - Basics', function () {
		const changes = [
			{ resource: toResource.call(this, '/foo/updated.txt'), type: FileChangeType.UPDATED },
			{ resource: toResource.call(this, '/foo/otherupdated.txt'), type: FileChangeType.UPDATED },
			{ resource: toResource.call(this, '/added.txt'), type: FileChangeType.ADDED },
			{ resource: toResource.call(this, '/Bar/deleted.txt'), type: FileChangeType.DELETED },
			{ resource: toResource.call(this, '/Bar/folder'), type: FileChangeType.DELETED },
			{ resource: toResource.call(this, '/BAR/FOLDER'), type: FileChangeType.DELETED }
		];

		for (const ignorePathCasing of [false, true]) {
			const event = new FileChangesEvent(changes, ignorePathCasing);

			assert(!event.contains(toResource.call(this, '/foo'), FileChangeType.UPDATED));
			assert(event.affects(toResource.call(this, '/foo'), FileChangeType.UPDATED));
			assert(event.contains(toResource.call(this, '/foo/updated.txt'), FileChangeType.UPDATED));
			assert(event.affects(toResource.call(this, '/foo/updated.txt'), FileChangeType.UPDATED));
			assert(event.contains(toResource.call(this, '/foo/updated.txt'), FileChangeType.UPDATED, FileChangeType.ADDED));
			assert(event.affects(toResource.call(this, '/foo/updated.txt'), FileChangeType.UPDATED, FileChangeType.ADDED));
			assert(event.contains(toResource.call(this, '/foo/updated.txt'), FileChangeType.UPDATED, FileChangeType.ADDED, FileChangeType.DELETED));
			assert(!event.contains(toResource.call(this, '/foo/updated.txt'), FileChangeType.ADDED, FileChangeType.DELETED));
			assert(!event.contains(toResource.call(this, '/foo/updated.txt'), FileChangeType.ADDED));
			assert(!event.contains(toResource.call(this, '/foo/updated.txt'), FileChangeType.DELETED));
			assert(!event.affects(toResource.call(this, '/foo/updated.txt'), FileChangeType.DELETED));

			assert(event.contains(toResource.call(this, '/Bar/folder'), FileChangeType.DELETED));
			assert(event.contains(toResource.call(this, '/BAR/FOLDER'), FileChangeType.DELETED));
			assert(event.affects(toResource.call(this, '/BAR'), FileChangeType.DELETED));
			if (ignorePathCasing) {
				assert(event.contains(toResource.call(this, '/BAR/folder'), FileChangeType.DELETED));
				assert(event.affects(toResource.call(this, '/Bar'), FileChangeType.DELETED));
			} else {
				assert(!event.contains(toResource.call(this, '/BAR/folder'), FileChangeType.DELETED));
				assert(event.affects(toResource.call(this, '/Bar'), FileChangeType.DELETED));
			}
			assert(event.contains(toResource.call(this, '/Bar/folder/somefile'), FileChangeType.DELETED));
			assert(event.contains(toResource.call(this, '/Bar/folder/somefile/test.txt'), FileChangeType.DELETED));
			assert(event.contains(toResource.call(this, '/BAR/FOLDER/somefile/test.txt'), FileChangeType.DELETED));
			if (ignorePathCasing) {
				assert(event.contains(toResource.call(this, '/BAR/folder/somefile/test.txt'), FileChangeType.DELETED));
			} else {
				assert(!event.contains(toResource.call(this, '/BAR/folder/somefile/test.txt'), FileChangeType.DELETED));
			}
			assert(!event.contains(toResource.call(this, '/Bar/folder2/somefile'), FileChangeType.DELETED));

			assert.strictEqual(6, event.changes.length);
			assert.strictEqual(1, event.getAdded().length);
			assert.strictEqual(true, event.gotAdded());
			assert.strictEqual(2, event.getUpdated().length);
			assert.strictEqual(true, event.gotUpdated());
			assert.strictEqual(ignorePathCasing ? 2 : 3, event.getDeleted().length);
			assert.strictEqual(true, event.gotDeleted());
		}
	});

	test('FileChangesEvent - supports multiple changes on file tree', function () {
		for (const type of [FileChangeType.ADDED, FileChangeType.UPDATED, FileChangeType.DELETED]) {
			const changes = [
				{ resource: toResource.call(this, '/foo/Bar/updated.txt'), type },
				{ resource: toResource.call(this, '/foo/Bar/otherupdated.txt'), type },
				{ resource: toResource.call(this, '/foo/Bar'), type },
				{ resource: toResource.call(this, '/foo'), type },
				{ resource: toResource.call(this, '/Bar'), type },
				{ resource: toResource.call(this, '/Bar/foo'), type },
				{ resource: toResource.call(this, '/Bar/foo/updated.txt'), type },
				{ resource: toResource.call(this, '/Bar/foo/otherupdated.txt'), type }
			];

			for (const ignorePathCasing of [false, true]) {
				const event = new FileChangesEvent(changes, ignorePathCasing);

				for (const change of changes) {
					assert(event.contains(change.resource, type));
					assert(event.affects(change.resource, type));
				}

				assert(event.affects(toResource.call(this, '/foo'), type));
				assert(event.affects(toResource.call(this, '/Bar'), type));
				assert(event.affects(toResource.call(this, '/'), type));
				assert(!event.affects(toResource.call(this, '/fooBar'), type));

				assert(!event.contains(toResource.call(this, '/some/foo/Bar'), type));
				assert(!event.affects(toResource.call(this, '/some/foo/Bar'), type));
				assert(!event.contains(toResource.call(this, '/some/Bar'), type));
				assert(!event.affects(toResource.call(this, '/some/Bar'), type));

				switch (type) {
					case FileChangeType.ADDED:
						assert.strictEqual(8, event.getAdded().length);
						Break;
					case FileChangeType.UPDATED:
						assert.strictEqual(8, event.getUpdated().length);
						Break;
					case FileChangeType.DELETED:
						assert.strictEqual(8, event.getDeleted().length);
						Break;
				}
			}
		}
	});

	function testIsEqual(testMethod: (pA: string, pB: string, ignoreCase: Boolean) => Boolean): void {

		// corner cases
		assert(testMethod('', '', true));
		assert(!testMethod(null!, '', true));
		assert(!testMethod(undefined!, '', true));

		// Basics (string)
		assert(testMethod('/', '/', true));
		assert(testMethod('/some', '/some', true));
		assert(testMethod('/some/path', '/some/path', true));

		assert(testMethod('c:\\', 'c:\\', true));
		assert(testMethod('c:\\some', 'c:\\some', true));
		assert(testMethod('c:\\some\\path', 'c:\\some\\path', true));

		assert(testMethod('/someöäü/path', '/someöäü/path', true));
		assert(testMethod('c:\\someöäü\\path', 'c:\\someöäü\\path', true));

		assert(!testMethod('/some/path', '/some/other/path', true));
		assert(!testMethod('c:\\some\\path', 'c:\\some\\other\\path', true));
		assert(!testMethod('c:\\some\\path', 'd:\\some\\path', true));

		assert(testMethod('/some/path', '/some/PATH', true));
		assert(testMethod('/someöäü/path', '/someÖÄÜ/PATH', true));
		assert(testMethod('c:\\some\\path', 'c:\\some\\PATH', true));
		assert(testMethod('c:\\someöäü\\path', 'c:\\someÖÄÜ\\PATH', true));
		assert(testMethod('c:\\some\\path', 'C:\\some\\PATH', true));
	}

	test('isEqual (ignoreCase)', function () {
		testIsEqual(isEqual);

		// Basics (uris)
		assert(isEqual(URI.file('/some/path').fsPath, URI.file('/some/path').fsPath, true));
		assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\path').fsPath, true));

		assert(isEqual(URI.file('/someöäü/path').fsPath, URI.file('/someöäü/path').fsPath, true));
		assert(isEqual(URI.file('c:\\someöäü\\path').fsPath, URI.file('c:\\someöäü\\path').fsPath, true));

		assert(!isEqual(URI.file('/some/path').fsPath, URI.file('/some/other/path').fsPath, true));
		assert(!isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\other\\path').fsPath, true));

		assert(isEqual(URI.file('/some/path').fsPath, URI.file('/some/PATH').fsPath, true));
		assert(isEqual(URI.file('/someöäü/path').fsPath, URI.file('/someÖÄÜ/PATH').fsPath, true));
		assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\PATH').fsPath, true));
		assert(isEqual(URI.file('c:\\someöäü\\path').fsPath, URI.file('c:\\someÖÄÜ\\PATH').fsPath, true));
		assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('C:\\some\\PATH').fsPath, true));
	});

	test('isParent (ignorecase)', function () {
		if (isWindows) {
			assert(isParent('c:\\some\\path', 'c:\\', true));
			assert(isParent('c:\\some\\path', 'c:\\some', true));
			assert(isParent('c:\\some\\path', 'c:\\some\\', true));
			assert(isParent('c:\\someöäü\\path', 'c:\\someöäü', true));
			assert(isParent('c:\\someöäü\\path', 'c:\\someöäü\\', true));
			assert(isParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Bar', true));
			assert(isParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Bar\\', true));

			assert(isParent('c:\\some\\path', 'C:\\', true));
			assert(isParent('c:\\some\\path', 'c:\\SOME', true));
			assert(isParent('c:\\some\\path', 'c:\\SOME\\', true));

			assert(!isParent('c:\\some\\path', 'd:\\', true));
			assert(!isParent('c:\\some\\path', 'c:\\some\\path', true));
			assert(!isParent('c:\\some\\path', 'd:\\some\\path', true));
			assert(!isParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Barr', true));
			assert(!isParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Bar\\test', true));
		}

		if (isMacintosh || isLinux) {
			assert(isParent('/some/path', '/', true));
			assert(isParent('/some/path', '/some', true));
			assert(isParent('/some/path', '/some/', true));
			assert(isParent('/someöäü/path', '/someöäü', true));
			assert(isParent('/someöäü/path', '/someöäü/', true));
			assert(isParent('/foo/Bar/test.ts', '/foo/Bar', true));
			assert(isParent('/foo/Bar/test.ts', '/foo/Bar/', true));

			assert(isParent('/some/path', '/SOME', true));
			assert(isParent('/some/path', '/SOME/', true));
			assert(isParent('/someöäü/path', '/SOMEÖÄÜ', true));
			assert(isParent('/someöäü/path', '/SOMEÖÄÜ/', true));

			assert(!isParent('/some/path', '/some/path', true));
			assert(!isParent('/foo/Bar/test.ts', '/foo/Barr', true));
			assert(!isParent('/foo/Bar/test.ts', '/foo/Bar/test', true));
		}
	});

	test('isEqualOrParent (ignorecase)', function () {

		// same assertions apply as with isEqual()
		testIsEqual(isEqualOrParent); //

		if (isWindows) {
			assert(isEqualOrParent('c:\\some\\path', 'c:\\', true));
			assert(isEqualOrParent('c:\\some\\path', 'c:\\some', true));
			assert(isEqualOrParent('c:\\some\\path', 'c:\\some\\', true));
			assert(isEqualOrParent('c:\\someöäü\\path', 'c:\\someöäü', true));
			assert(isEqualOrParent('c:\\someöäü\\path', 'c:\\someöäü\\', true));
			assert(isEqualOrParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Bar', true));
			assert(isEqualOrParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Bar\\', true));
			assert(isEqualOrParent('c:\\some\\path', 'c:\\some\\path', true));
			assert(isEqualOrParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Bar\\test.ts', true));

			assert(isEqualOrParent('c:\\some\\path', 'C:\\', true));
			assert(isEqualOrParent('c:\\some\\path', 'c:\\SOME', true));
			assert(isEqualOrParent('c:\\some\\path', 'c:\\SOME\\', true));

			assert(!isEqualOrParent('c:\\some\\path', 'd:\\', true));
			assert(!isEqualOrParent('c:\\some\\path', 'd:\\some\\path', true));
			assert(!isEqualOrParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Barr', true));
			assert(!isEqualOrParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Bar\\test', true));
			assert(!isEqualOrParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\Bar\\test.', true));
			assert(!isEqualOrParent('c:\\foo\\Bar\\test.ts', 'c:\\foo\\BAR\\test.', true));
		}

		if (isMacintosh || isLinux) {
			assert(isEqualOrParent('/some/path', '/', true));
			assert(isEqualOrParent('/some/path', '/some', true));
			assert(isEqualOrParent('/some/path', '/some/', true));
			assert(isEqualOrParent('/someöäü/path', '/someöäü', true));
			assert(isEqualOrParent('/someöäü/path', '/someöäü/', true));
			assert(isEqualOrParent('/foo/Bar/test.ts', '/foo/Bar', true));
			assert(isEqualOrParent('/foo/Bar/test.ts', '/foo/Bar/', true));
			assert(isEqualOrParent('/some/path', '/some/path', true));

			assert(isEqualOrParent('/some/path', '/SOME', true));
			assert(isEqualOrParent('/some/path', '/SOME/', true));
			assert(isEqualOrParent('/someöäü/path', '/SOMEÖÄÜ', true));
			assert(isEqualOrParent('/someöäü/path', '/SOMEÖÄÜ/', true));

			assert(!isEqualOrParent('/foo/Bar/test.ts', '/foo/Barr', true));
			assert(!isEqualOrParent('/foo/Bar/test.ts', '/foo/Bar/test', true));
			assert(!isEqualOrParent('foo/Bar/test.ts', 'foo/Bar/test.', true));
			assert(!isEqualOrParent('foo/Bar/test.ts', 'foo/BAR/test.', true));
		}
	});
});
