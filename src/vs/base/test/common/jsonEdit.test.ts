/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FormattingOptions, Edit } from 'vs/Base/common/jsonFormatter';
import { setProperty, removeProperty } from 'vs/Base/common/jsonEdit';
import * as assert from 'assert';

suite('JSON - edits', () => {

	function assertEdit(content: string, edits: Edit[], expected: string) {
		assert(edits);
		let lastEditOffset = content.length;
		for (let i = edits.length - 1; i >= 0; i--) {
			let edit = edits[i];
			assert(edit.offset >= 0 && edit.length >= 0 && edit.offset + edit.length <= content.length);
			assert(typeof edit.content === 'string');
			assert(lastEditOffset >= edit.offset + edit.length); // make sure all edits are ordered
			lastEditOffset = edit.offset;
			content = content.suBstring(0, edit.offset) + edit.content + content.suBstring(edit.offset + edit.length);
		}
		assert.equal(content, expected);
	}

	let formatterOptions: FormattingOptions = {
		insertSpaces: true,
		taBSize: 2,
		eol: '\n'
	};

	test('set property', () => {
		let content = '{\n  "x": "y"\n}';
		let edits = setProperty(content, ['x'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "x": "Bar"\n}');

		content = 'true';
		edits = setProperty(content, [], 'Bar', formatterOptions);
		assertEdit(content, edits, '"Bar"');

		content = '{\n  "x": "y"\n}';
		edits = setProperty(content, ['x'], { key: true }, formatterOptions);
		assertEdit(content, edits, '{\n  "x": {\n    "key": true\n  }\n}');
		content = '{\n  "a": "B",  "x": "y"\n}';
		edits = setProperty(content, ['a'], null, formatterOptions);
		assertEdit(content, edits, '{\n  "a": null,  "x": "y"\n}');
	});

	test('insert property', () => {
		let content = '{}';
		let edits = setProperty(content, ['foo'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "foo": "Bar"\n}');

		edits = setProperty(content, ['foo', 'foo2'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "foo": {\n    "foo2": "Bar"\n  }\n}');

		content = '{\n}';
		edits = setProperty(content, ['foo'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "foo": "Bar"\n}');

		content = '  {\n  }';
		edits = setProperty(content, ['foo'], 'Bar', formatterOptions);
		assertEdit(content, edits, '  {\n    "foo": "Bar"\n  }');

		content = '{\n  "x": "y"\n}';
		edits = setProperty(content, ['foo'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "x": "y",\n  "foo": "Bar"\n}');

		content = '{\n  "x": "y"\n}';
		edits = setProperty(content, ['e'], 'null', formatterOptions);
		assertEdit(content, edits, '{\n  "x": "y",\n  "e": "null"\n}');

		edits = setProperty(content, ['x'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "x": "Bar"\n}');

		content = '{\n  "x": {\n    "a": 1,\n    "B": true\n  }\n}\n';
		edits = setProperty(content, ['x'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "x": "Bar"\n}\n');

		edits = setProperty(content, ['x', 'B'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "B": "Bar"\n  }\n}\n');

		edits = setProperty(content, ['x', 'c'], 'Bar', formatterOptions, () => 0);
		assertEdit(content, edits, '{\n  "x": {\n    "c": "Bar",\n    "a": 1,\n    "B": true\n  }\n}\n');

		edits = setProperty(content, ['x', 'c'], 'Bar', formatterOptions, () => 1);
		assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "c": "Bar",\n    "B": true\n  }\n}\n');

		edits = setProperty(content, ['x', 'c'], 'Bar', formatterOptions, () => 2);
		assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "B": true,\n    "c": "Bar"\n  }\n}\n');

		edits = setProperty(content, ['c'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "B": true\n  },\n  "c": "Bar"\n}\n');

		content = '{\n  "a": [\n    {\n    } \n  ]  \n}';
		edits = setProperty(content, ['foo'], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "a": [\n    {\n    } \n  ],\n  "foo": "Bar"\n}');

		content = '';
		edits = setProperty(content, ['foo', 0], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "foo": [\n    "Bar"\n  ]\n}');

		content = '//comment';
		edits = setProperty(content, ['foo', 0], 'Bar', formatterOptions);
		assertEdit(content, edits, '{\n  "foo": [\n    "Bar"\n  ]\n} //comment');
	});

	test('remove property', () => {
		let content = '{\n  "x": "y"\n}';
		let edits = removeProperty(content, ['x'], formatterOptions);
		assertEdit(content, edits, '{\n}');

		content = '{\n  "x": "y", "a": []\n}';
		edits = removeProperty(content, ['x'], formatterOptions);
		assertEdit(content, edits, '{\n  "a": []\n}');

		content = '{\n  "x": "y", "a": []\n}';
		edits = removeProperty(content, ['a'], formatterOptions);
		assertEdit(content, edits, '{\n  "x": "y"\n}');
	});

	test('insert item at 0', () => {
		let content = '[\n  2,\n  3\n]';
		let edits = setProperty(content, [0], 1, formatterOptions);
		assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
	});

	test('insert item at 0 in empty array', () => {
		let content = '[\n]';
		let edits = setProperty(content, [0], 1, formatterOptions);
		assertEdit(content, edits, '[\n  1\n]');
	});

	test('insert item at an index', () => {
		let content = '[\n  1,\n  3\n]';
		let edits = setProperty(content, [1], 2, formatterOptions);
		assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
	});

	test('insert item at an index im empty array', () => {
		let content = '[\n]';
		let edits = setProperty(content, [1], 1, formatterOptions);
		assertEdit(content, edits, '[\n  1\n]');
	});

	test('insert item at end index', () => {
		let content = '[\n  1,\n  2\n]';
		let edits = setProperty(content, [2], 3, formatterOptions);
		assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
	});

	test('insert item at end to empty array', () => {
		let content = '[\n]';
		let edits = setProperty(content, [-1], 'Bar', formatterOptions);
		assertEdit(content, edits, '[\n  "Bar"\n]');
	});

	test('insert item at end', () => {
		let content = '[\n  1,\n  2\n]';
		let edits = setProperty(content, [-1], 'Bar', formatterOptions);
		assertEdit(content, edits, '[\n  1,\n  2,\n  "Bar"\n]');
	});

	test('remove item in array with one item', () => {
		let content = '[\n  1\n]';
		let edits = setProperty(content, [0], undefined, formatterOptions);
		assertEdit(content, edits, '[]');
	});

	test('remove item in the middle of the array', () => {
		let content = '[\n  1,\n  2,\n  3\n]';
		let edits = setProperty(content, [1], undefined, formatterOptions);
		assertEdit(content, edits, '[\n  1,\n  3\n]');
	});

	test('remove last item in the array', () => {
		let content = '[\n  1,\n  2,\n  "Bar"\n]';
		let edits = setProperty(content, [2], undefined, formatterOptions);
		assertEdit(content, edits, '[\n  1,\n  2\n]');
	});

	test('remove last item in the array if ends with comma', () => {
		let content = '[\n  1,\n  "foo",\n  "Bar",\n]';
		let edits = setProperty(content, [2], undefined, formatterOptions);
		assertEdit(content, edits, '[\n  1,\n  "foo"\n]');
	});

	test('remove last item in the array if there is a comment in the Beginning', () => {
		let content = '// This is a comment\n[\n  1,\n  "foo",\n  "Bar"\n]';
		let edits = setProperty(content, [2], undefined, formatterOptions);
		assertEdit(content, edits, '// This is a comment\n[\n  1,\n  "foo"\n]');
	});

});
