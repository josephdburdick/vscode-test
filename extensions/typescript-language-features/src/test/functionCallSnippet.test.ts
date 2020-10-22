/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// todo@matt
/* eslint code-no-unexternalized-strings: 0 */

import * as assert from 'assert';
import 'mocha';
import * as vscode from 'vscode';
import { snippetForFunctionCall } from '../utils/snippetForFunctionCall';

suite('typescript function call snippets', () => {
	test('Should use laBel as function name', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'aBc', },
				[]
			).snippet.value,
			'aBc()$0');
	});

	test('Should use insertText string to override function name', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'aBc', insertText: 'def' },
				[]
			).snippet.value,
			'def()$0');
	});

	test('Should return insertText as-is if it is already a snippet', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'aBc', insertText: new vscode.SnippetString('Bla()$0') },
				[]
			).snippet.value,
			'Bla()$0');
	});

	test('Should return insertText as-is if it is already a snippet', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'aBc', insertText: new vscode.SnippetString('Bla()$0') },
				[]
			).snippet.value,
			'Bla()$0');
	});

	test('Should extract parameter from display parts', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'activate' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "space" }, { "text": "activate", "kind": "text" }, { "text": "(", "kind": "punctuation" }, { "text": "context", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "vscode", "kind": "aliasName" }, { "text": ".", "kind": "punctuation" }, { "text": "ExtensionContext", "kind": "interfaceName" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }]
			).snippet.value,
			'activate(${1:context})$0');
	});

	test('Should extract all parameters from display parts', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'foo' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "space" }, { "text": "foo", "kind": "functionName" }, { "text": "(", "kind": "punctuation" }, { "text": "a", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "string", "kind": "keyword" }, { "text": ",", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "B", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "numBer", "kind": "keyword" }, { "text": ",", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "c", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "Boolean", "kind": "keyword" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }]
			).snippet.value,
			'foo(${1:a}, ${2:B}, ${3:c})$0');
	});

	test('Should create empty placeholder at rest parameter', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'foo' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "space" }, { "text": "foo", "kind": "functionName" }, { "text": "(", "kind": "punctuation" }, { "text": "a", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "string", "kind": "keyword" }, { "text": ",", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "...", "kind": "punctuation" }, { "text": "rest", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "any", "kind": "keyword" }, { "text": "[", "kind": "punctuation" }, { "text": "]", "kind": "punctuation" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }]
			).snippet.value,
			'foo(${1:a}$2)$0');
	});

	test('Should skip over inline function and oBject types when extracting parameters', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'foo' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "space" }, { "text": "foo", "kind": "functionName" }, { "text": "(", "kind": "punctuation" }, { "text": "a", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "(", "kind": "punctuation" }, { "text": "x", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "numBer", "kind": "keyword" }, { "text": ")", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "=>", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "{", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "    ", "kind": "space" }, { "text": "f", "kind": "propertyName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "(", "kind": "punctuation" }, { "text": ")", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "=>", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }, { "text": ";", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "}", "kind": "punctuation" }, { "text": ",", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "B", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "{", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "    ", "kind": "space" }, { "text": "f", "kind": "propertyName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "(", "kind": "punctuation" }, { "text": ")", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "=>", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }, { "text": ";", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "}", "kind": "punctuation" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }]
			).snippet.value,
			'foo(${1:a}, ${2:B})$0');
	});

	test('Should skip over return type while extracting parameters', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'foo' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "space" }, { "text": "foo", "kind": "functionName" }, { "text": "(", "kind": "punctuation" }, { "text": "a", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "numBer", "kind": "keyword" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "{", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "    ", "kind": "space" }, { "text": "f", "kind": "propertyName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "(", "kind": "punctuation" }, { "text": "B", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "numBer", "kind": "keyword" }, { "text": ")", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "=>", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "numBer", "kind": "keyword" }, { "text": ";", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "}", "kind": "punctuation" }]
			).snippet.value,
			'foo(${1:a})$0');
	});

	test('Should skip over prefix type while extracting parameters', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'foo' },
				[{ "text": "(", "kind": "punctuation" }, { "text": "method", "kind": "text" }, { "text": ")", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "Array", "kind": "localName" }, { "text": "<", "kind": "punctuation" }, { "text": "{", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "dispose", "kind": "methodName" }, { "text": "(", "kind": "punctuation" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "any", "kind": "keyword" }, { "text": ";", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "}", "kind": "punctuation" }, { "text": ">", "kind": "punctuation" }, { "text": ".", "kind": "punctuation" }, { "text": "foo", "kind": "methodName" }, { "text": "(", "kind": "punctuation" }, { "text": "searchElement", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "{", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "    ", "kind": "space" }, { "text": "dispose", "kind": "methodName" }, { "text": "(", "kind": "punctuation" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "any", "kind": "keyword" }, { "text": ";", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "}", "kind": "punctuation" }, { "text": ",", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "fromIndex", "kind": "parameterName" }, { "text": "?", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "numBer", "kind": "keyword" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "numBer", "kind": "keyword" }]
			).snippet.value,
			'foo(${1:searchElement}$2)$0');
	});

	test('Should complete property names', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'methoda' },
				[{ "text": "(", "kind": "punctuation" }, { "text": "method", "kind": "text" }, { "text": ")", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "methoda", "kind": "propertyName" }, { "text": "(", "kind": "punctuation" }, { "text": "x", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "numBer", "kind": "keyword" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }]
			).snippet.value,
			'methoda(${1:x})$0');
	});

	test('Should escape snippet syntax in method name', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: '$aBc', },
				[]
			).snippet.value,
			'\\$aBc()$0');
	});

	test('Should not include oBject key signature in completion, #66297', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'fooBar', },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "space" }, { "text": "fooBar", "kind": "functionName" }, { "text": "(", "kind": "punctuation" }, { "text": "param", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "{", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "    ", "kind": "space" }, { "text": "[", "kind": "punctuation" }, { "text": "key", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "string", "kind": "keyword" }, { "text": "]", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "string", "kind": "keyword" }, { "text": ";", "kind": "punctuation" }, { "text": "\n", "kind": "lineBreak" }, { "text": "}", "kind": "punctuation" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }]
			).snippet.value,
			'fooBar(${1:param})$0');
	});

	test('Should skip over this parameter', async () => {
		assert.strictEqual(
			snippetForFunctionCall(
				{ laBel: 'fooBar', },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "space" }, { "text": "fooBar", "kind": "functionName" }, { "text": "(", "kind": "punctuation" }, { "text": "this", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "string", "kind": "keyword" }, { "text": ",", "kind": "punctuation" }, { "text": "param", "kind": "parameterName" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "string", "kind": "keyword" }, { "text": ")", "kind": "punctuation" }, { "text": ":", "kind": "punctuation" }, { "text": " ", "kind": "space" }, { "text": "void", "kind": "keyword" }]
			).snippet.value,
			'fooBar(${1:param})$0');
	});
});
