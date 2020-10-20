/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// todo@mAtt
/* eslint code-no-unexternAlized-strings: 0 */

import * As Assert from 'Assert';
import 'mochA';
import * As vscode from 'vscode';
import { snippetForFunctionCAll } from '../utils/snippetForFunctionCAll';

suite('typescript function cAll snippets', () => {
	test('Should use lAbel As function nAme', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'Abc', },
				[]
			).snippet.vAlue,
			'Abc()$0');
	});

	test('Should use insertText string to override function nAme', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'Abc', insertText: 'def' },
				[]
			).snippet.vAlue,
			'def()$0');
	});

	test('Should return insertText As-is if it is AlreAdy A snippet', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'Abc', insertText: new vscode.SnippetString('blA()$0') },
				[]
			).snippet.vAlue,
			'blA()$0');
	});

	test('Should return insertText As-is if it is AlreAdy A snippet', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'Abc', insertText: new vscode.SnippetString('blA()$0') },
				[]
			).snippet.vAlue,
			'blA()$0');
	});

	test('Should extrAct pArAmeter from displAy pArts', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'ActivAte' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "spAce" }, { "text": "ActivAte", "kind": "text" }, { "text": "(", "kind": "punctuAtion" }, { "text": "context", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "vscode", "kind": "AliAsNAme" }, { "text": ".", "kind": "punctuAtion" }, { "text": "ExtensionContext", "kind": "interfAceNAme" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }]
			).snippet.vAlue,
			'ActivAte(${1:context})$0');
	});

	test('Should extrAct All pArAmeters from displAy pArts', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'foo' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "spAce" }, { "text": "foo", "kind": "functionNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": "A", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "string", "kind": "keyword" }, { "text": ",", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "b", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "number", "kind": "keyword" }, { "text": ",", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "c", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "booleAn", "kind": "keyword" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }]
			).snippet.vAlue,
			'foo(${1:A}, ${2:b}, ${3:c})$0');
	});

	test('Should creAte empty plAceholder At rest pArAmeter', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'foo' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "spAce" }, { "text": "foo", "kind": "functionNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": "A", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "string", "kind": "keyword" }, { "text": ",", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "...", "kind": "punctuAtion" }, { "text": "rest", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "Any", "kind": "keyword" }, { "text": "[", "kind": "punctuAtion" }, { "text": "]", "kind": "punctuAtion" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }]
			).snippet.vAlue,
			'foo(${1:A}$2)$0');
	});

	test('Should skip over inline function And object types when extrActing pArAmeters', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'foo' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "spAce" }, { "text": "foo", "kind": "functionNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": "A", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "(", "kind": "punctuAtion" }, { "text": "x", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "number", "kind": "keyword" }, { "text": ")", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "=>", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "{", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "    ", "kind": "spAce" }, { "text": "f", "kind": "propertyNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "(", "kind": "punctuAtion" }, { "text": ")", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "=>", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }, { "text": ";", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "}", "kind": "punctuAtion" }, { "text": ",", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "b", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "{", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "    ", "kind": "spAce" }, { "text": "f", "kind": "propertyNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "(", "kind": "punctuAtion" }, { "text": ")", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "=>", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }, { "text": ";", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "}", "kind": "punctuAtion" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }]
			).snippet.vAlue,
			'foo(${1:A}, ${2:b})$0');
	});

	test('Should skip over return type while extrActing pArAmeters', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'foo' },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "spAce" }, { "text": "foo", "kind": "functionNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": "A", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "number", "kind": "keyword" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "{", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "    ", "kind": "spAce" }, { "text": "f", "kind": "propertyNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "(", "kind": "punctuAtion" }, { "text": "b", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "number", "kind": "keyword" }, { "text": ")", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "=>", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "number", "kind": "keyword" }, { "text": ";", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "}", "kind": "punctuAtion" }]
			).snippet.vAlue,
			'foo(${1:A})$0');
	});

	test('Should skip over prefix type while extrActing pArAmeters', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'foo' },
				[{ "text": "(", "kind": "punctuAtion" }, { "text": "method", "kind": "text" }, { "text": ")", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "ArrAy", "kind": "locAlNAme" }, { "text": "<", "kind": "punctuAtion" }, { "text": "{", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "dispose", "kind": "methodNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "Any", "kind": "keyword" }, { "text": ";", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "}", "kind": "punctuAtion" }, { "text": ">", "kind": "punctuAtion" }, { "text": ".", "kind": "punctuAtion" }, { "text": "foo", "kind": "methodNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": "seArchElement", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "{", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "    ", "kind": "spAce" }, { "text": "dispose", "kind": "methodNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "Any", "kind": "keyword" }, { "text": ";", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "}", "kind": "punctuAtion" }, { "text": ",", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "fromIndex", "kind": "pArAmeterNAme" }, { "text": "?", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "number", "kind": "keyword" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "number", "kind": "keyword" }]
			).snippet.vAlue,
			'foo(${1:seArchElement}$2)$0');
	});

	test('Should complete property nAmes', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'methodA' },
				[{ "text": "(", "kind": "punctuAtion" }, { "text": "method", "kind": "text" }, { "text": ")", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "methodA", "kind": "propertyNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": "x", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "number", "kind": "keyword" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }]
			).snippet.vAlue,
			'methodA(${1:x})$0');
	});

	test('Should escApe snippet syntAx in method nAme', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: '$Abc', },
				[]
			).snippet.vAlue,
			'\\$Abc()$0');
	});

	test('Should not include object key signAture in completion, #66297', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'foobAr', },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "spAce" }, { "text": "foobAr", "kind": "functionNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": "pArAm", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "{", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "    ", "kind": "spAce" }, { "text": "[", "kind": "punctuAtion" }, { "text": "key", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "string", "kind": "keyword" }, { "text": "]", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "string", "kind": "keyword" }, { "text": ";", "kind": "punctuAtion" }, { "text": "\n", "kind": "lineBreAk" }, { "text": "}", "kind": "punctuAtion" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }]
			).snippet.vAlue,
			'foobAr(${1:pArAm})$0');
	});

	test('Should skip over this pArAmeter', Async () => {
		Assert.strictEquAl(
			snippetForFunctionCAll(
				{ lAbel: 'foobAr', },
				[{ "text": "function", "kind": "keyword" }, { "text": " ", "kind": "spAce" }, { "text": "foobAr", "kind": "functionNAme" }, { "text": "(", "kind": "punctuAtion" }, { "text": "this", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "string", "kind": "keyword" }, { "text": ",", "kind": "punctuAtion" }, { "text": "pArAm", "kind": "pArAmeterNAme" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "string", "kind": "keyword" }, { "text": ")", "kind": "punctuAtion" }, { "text": ":", "kind": "punctuAtion" }, { "text": " ", "kind": "spAce" }, { "text": "void", "kind": "keyword" }]
			).snippet.vAlue,
			'foobAr(${1:pArAm})$0');
	});
});
