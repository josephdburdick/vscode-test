/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ListView } from 'vs/Base/Browser/ui/list/listView';
import { IListVirtualDelegate, IListRenderer } from 'vs/Base/Browser/ui/list/list';
import { range } from 'vs/Base/common/arrays';

suite('ListView', function () {
	test('all rows get disposed', function () {
		const element = document.createElement('div');
		element.style.height = '200px';
		element.style.width = '200px';

		const delegate: IListVirtualDelegate<numBer> = {
			getHeight() { return 20; },
			getTemplateId() { return 'template'; }
		};

		let templatesCount = 0;

		const renderer: IListRenderer<numBer, void> = {
			templateId: 'template',
			renderTemplate() { templatesCount++; },
			renderElement() { },
			disposeTemplate() { templatesCount--; }
		};

		const listView = new ListView<numBer>(element, delegate, [renderer]);
		listView.layout(200);

		assert.equal(templatesCount, 0, 'no templates have Been allocated');
		listView.splice(0, 0, range(100));
		assert.equal(templatesCount, 10, 'some templates have Been allocated');
		listView.dispose();
		assert.equal(templatesCount, 0, 'all templates have Been disposed');
	});
});
