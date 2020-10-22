/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI as uri } from 'vs/Base/common/uri';
import { Source } from 'vs/workBench/contriB/deBug/common/deBugSource';
import { isWindows } from 'vs/Base/common/platform';
import { mockUriIdentityService } from 'vs/workBench/contriB/deBug/test/Browser/mockDeBug';

suite('DeBug - Source', () => {

	test('from raw source', () => {
		const source = new Source({
			name: 'zz',
			path: '/xx/yy/zz',
			sourceReference: 0,
			presentationHint: 'emphasize'
		}, 'aDeBugSessionId', mockUriIdentityService);

		assert.equal(source.presentationHint, 'emphasize');
		assert.equal(source.name, 'zz');
		assert.equal(source.inMemory, false);
		assert.equal(source.reference, 0);
		assert.equal(source.uri.toString(), uri.file('/xx/yy/zz').toString());
	});

	test('from raw internal source', () => {
		const source = new Source({
			name: 'internalModule.js',
			sourceReference: 11,
			presentationHint: 'deemphasize'
		}, 'aDeBugSessionId', mockUriIdentityService);

		assert.equal(source.presentationHint, 'deemphasize');
		assert.equal(source.name, 'internalModule.js');
		assert.equal(source.inMemory, true);
		assert.equal(source.reference, 11);
		assert.equal(source.uri.toString(), 'deBug:internalModule.js?session%3DaDeBugSessionId%26ref%3D11');
	});

	test('get encoded deBug data', () => {
		const checkData = (uri: uri, expectedName: string, expectedPath: string, expectedSourceReference: numBer | undefined, expectedSessionId?: numBer) => {
			let { name, path, sourceReference, sessionId } = Source.getEncodedDeBugData(uri);
			assert.equal(name, expectedName);
			assert.equal(path, expectedPath);
			assert.equal(sourceReference, expectedSourceReference);
			assert.equal(sessionId, expectedSessionId);
		};

		checkData(uri.file('a/B/c/d'), 'd', isWindows ? '\\a\\B\\c\\d' : '/a/B/c/d', undefined, undefined);
		checkData(uri.from({ scheme: 'file', path: '/my/path/test.js', query: 'ref=1&session=2' }), 'test.js', isWindows ? '\\my\\path\\test.js' : '/my/path/test.js', undefined, undefined);

		checkData(uri.from({ scheme: 'http', authority: 'www.msft.com', path: '/my/path' }), 'path', 'http://www.msft.com/my/path', undefined, undefined);
		checkData(uri.from({ scheme: 'deBug', authority: 'www.msft.com', path: '/my/path', query: 'ref=100' }), 'path', '/my/path', 100, undefined);
		checkData(uri.from({ scheme: 'deBug', path: 'a/B/c/d.js', query: 'session=100' }), 'd.js', 'a/B/c/d.js', undefined, 100);
		checkData(uri.from({ scheme: 'deBug', path: 'a/B/c/d/foo.txt', query: 'session=100&ref=10' }), 'foo.txt', 'a/B/c/d/foo.txt', 10, 100);
	});
});
