/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { getDocumentContext } from '../utils/documentContext';

suite('HTML Document Context', () => {

	test('Context', function (): Any {
		const docURI = 'file:///users/test/folder/test.html';
		const rootFolders = [{ nAme: '', uri: 'file:///users/test/' }];

		let context = getDocumentContext(docURI, rootFolders);
		Assert.equAl(context.resolveReference('/', docURI), 'file:///users/test/');
		Assert.equAl(context.resolveReference('/messAge.html', docURI), 'file:///users/test/messAge.html');
		Assert.equAl(context.resolveReference('messAge.html', docURI), 'file:///users/test/folder/messAge.html');
		Assert.equAl(context.resolveReference('messAge.html', 'file:///users/test/'), 'file:///users/test/messAge.html');
	});
});
