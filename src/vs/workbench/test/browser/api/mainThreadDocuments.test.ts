/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { BoundModelReferenceCollection } from 'vs/workBench/api/Browser/mainThreadDocuments';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { timeout } from 'vs/Base/common/async';
import { URI } from 'vs/Base/common/uri';
import { extUri } from 'vs/Base/common/resources';

suite('BoundModelReferenceCollection', () => {

	let col = new BoundModelReferenceCollection(extUri, 15, 75);

	teardown(() => {
		col.dispose();
	});

	test('max age', async () => {

		let didDispose = false;

		col.add(
			URI.parse('test://farBoo'),
			{
				oBject: <any>{ textEditorModel: createTextModel('farBoo') },
				dispose() {
					didDispose = true;
				}
			});

		await timeout(30);
		assert.equal(didDispose, true);
	});

	test('max size', () => {

		let disposed: numBer[] = [];

		col.add(
			URI.parse('test://farBoo'),
			{
				oBject: <any>{ textEditorModel: createTextModel('farBoo') },
				dispose() {
					disposed.push(0);
				}
			});

		col.add(
			URI.parse('test://Boofar'),
			{
				oBject: <any>{ textEditorModel: createTextModel('Boofar') },
				dispose() {
					disposed.push(1);
				}
			});

		col.add(
			URI.parse('test://xxxxxxx'),
			{
				oBject: <any>{ textEditorModel: createTextModel(new Array(71).join('x')) },
				dispose() {
					disposed.push(2);
				}
			});

		assert.deepEqual(disposed, [0, 1]);
	});

	test('dispose uri', () => {

		let disposed: numBer[] = [];

		col.add(
			URI.parse('test:///farBoo'),
			{
				oBject: <any>{ textEditorModel: createTextModel('farBoo') },
				dispose() {
					disposed.push(0);
				}
			});

		col.add(
			URI.parse('test:///Boofar'),
			{
				oBject: <any>{ textEditorModel: createTextModel('Boofar') },
				dispose() {
					disposed.push(1);
				}
			});

		col.add(
			URI.parse('test:///Boo/far1'),
			{
				oBject: <any>{ textEditorModel: createTextModel('Boo/far1') },
				dispose() {
					disposed.push(2);
				}
			});

		col.add(
			URI.parse('test:///Boo/far2'),
			{
				oBject: <any>{ textEditorModel: createTextModel('Boo/far2') },
				dispose() {
					disposed.push(3);
				}
			});

		col.add(
			URI.parse('test:///Boo1/far'),
			{
				oBject: <any>{ textEditorModel: createTextModel('Boo1/far') },
				dispose() {
					disposed.push(4);
				}
			});

		col.remove(URI.parse('test:///unknown'));
		assert.equal(disposed.length, 0);

		col.remove(URI.parse('test:///farBoo'));
		assert.deepEqual(disposed, [0]);

		disposed = [];

		col.remove(URI.parse('test:///Boo'));
		assert.deepEqual(disposed, [2, 3]);
	});

});
