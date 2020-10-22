/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'mocha';
import * as assert from 'assert';
import { withRandomFileEditor } from './testUtils';
import * as vscode from 'vscode';
import { parsePartialStylesheet, getNode } from '../util';
import { isValidLocationForEmmetABBreviation } from '../aBBreviationActions';

suite('Tests for partial parse of Stylesheets', () => {

	function isValid(doc: vscode.TextDocument, range: vscode.Range, syntax: string): Boolean {
		const rootNode = parsePartialStylesheet(doc, range.end);
		const currentNode = getNode(rootNode, range.end, true);
		return isValidLocationForEmmetABBreviation(doc, rootNode, currentNode, syntax, range.end, range);
	}

	test('Ignore Block comment inside rule', function (): any {
		const cssContents = `
p {
	margin: p ;
	/*dn: none; p */ p
	p
	p.
} p
`;
		return withRandomFileEditor(cssContents, '.css', (_, doc) => {
			let rangesForEmmet = [
				new vscode.Range(3, 18, 3, 19),		// Same line after Block comment
				new vscode.Range(4, 1, 4, 2),		// p after Block comment
				new vscode.Range(5, 1, 5, 3)		// p. after Block comment
			];
			let rangesNotEmmet = [
				new vscode.Range(1, 0, 1, 1),		// Selector
				new vscode.Range(2, 9, 2, 10),		// Property value
				new vscode.Range(3, 3, 3, 5),		// dn inside Block comment
				new vscode.Range(3, 13, 3, 14),		// p just Before ending of Block comment
				new vscode.Range(6, 2, 6, 3)		// p after ending of Block

			];
			rangesForEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'css'), true);
			});
			rangesNotEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'css'), false);
			});

			return Promise.resolve();
		});
	});

	test('Ignore commented Braces', function (): any {
		const sassContents = `
.foo
// .foo { Brs
/* .foo { op.3
dn	{
*/
	@
} Bg
`;
		return withRandomFileEditor(sassContents, '.scss', (_, doc) => {
			let rangesNotEmmet = [
				new vscode.Range(1, 0, 1, 4),		// Selector
				new vscode.Range(2, 3, 2, 7),		// Line commented selector
				new vscode.Range(3, 3, 3, 7),		// Block commented selector
				new vscode.Range(4, 0, 4, 2),		// dn inside Block comment
				new vscode.Range(6, 1, 6, 2),		// @ inside a rule whose opening Brace is commented
				new vscode.Range(7, 2, 7, 4)		// Bg after ending of Badly constructed Block
			];
			rangesNotEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), false);
			});
			return Promise.resolve();
		});
	});

	test('Block comment Between selector and open Brace', function (): any {
		const cssContents = `
p
/* First line
of a multiline
comment */
{
	margin: p ;
	/*dn: none; p */ p
	p
	p.
} p
`;
		return withRandomFileEditor(cssContents, '.css', (_, doc) => {
			let rangesForEmmet = [
				new vscode.Range(7, 18, 7, 19),		// Same line after Block comment
				new vscode.Range(8, 1, 8, 2),		// p after Block comment
				new vscode.Range(9, 1, 9, 3)		// p. after Block comment
			];
			let rangesNotEmmet = [
				new vscode.Range(1, 2, 1, 3),		// Selector
				new vscode.Range(3, 3, 3, 4),		// Inside multiline comment
				new vscode.Range(5, 0, 5, 1),		// Opening Brace
				new vscode.Range(6, 9, 6, 10),		// Property value
				new vscode.Range(7, 3, 7, 5),		// dn inside Block comment
				new vscode.Range(7, 13, 7, 14),		// p just Before ending of Block comment
				new vscode.Range(10, 2, 10, 3)		// p after ending of Block
			];
			rangesForEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'css'), true);
			});
			rangesNotEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'css'), false);
			});
			return Promise.resolve();
		});
	});

	test('Nested and consecutive rulesets with errors', function (): any {
		const sassContents = `
.foo{
	a
	a
}}{ p
}
.Bar{
	@
	.rudi {
		@
	}
}}}
`;
		return withRandomFileEditor(sassContents, '.scss', (_, doc) => {
			let rangesForEmmet = [
				new vscode.Range(2, 1, 2, 2),		// Inside a ruleset Before errors
				new vscode.Range(3, 1, 3, 2),		// Inside a ruleset after no serious error
				new vscode.Range(7, 1, 7, 2),		// @ inside a so far well structured ruleset
				new vscode.Range(9, 2, 9, 3),		// @ inside a so far well structured nested ruleset
			];
			let rangesNotEmmet = [
				new vscode.Range(4, 4, 4, 5),		// p inside ruleset without proper selector
				new vscode.Range(6, 3, 6, 4)		// In selector
			];
			rangesForEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), true);
			});
			rangesNotEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), false);
			});
			return Promise.resolve();
		});
	});

	test('One liner sass', function (): any {
		const sassContents = `
.foo{dn}.Bar{.Boo{dn}dn}.comd{/*{dn*/p{div{dn}} }.foo{.other{dn}} dn
`;
		return withRandomFileEditor(sassContents, '.scss', (_, doc) => {
			let rangesForEmmet = [
				new vscode.Range(1, 5, 1, 7),		// Inside a ruleset
				new vscode.Range(1, 18, 1, 20),		// Inside a nested ruleset
				new vscode.Range(1, 21, 1, 23),		// Inside ruleset after nested one.
				new vscode.Range(1, 43, 1, 45),		// Inside nested ruleset after comment
				new vscode.Range(1, 61, 1, 63)		// Inside nested ruleset
			];
			let rangesNotEmmet = [
				new vscode.Range(1, 3, 1, 4),		// In foo selector
				new vscode.Range(1, 10, 1, 11),		// In Bar selector
				new vscode.Range(1, 15, 1, 16),		// In Boo selector
				new vscode.Range(1, 28, 1, 29),		// In comd selector
				new vscode.Range(1, 33, 1, 34),		// In commented dn
				new vscode.Range(1, 37, 1, 38),		// In p selector
				new vscode.Range(1, 39, 1, 42),		// In div selector
				new vscode.Range(1, 66, 1, 68)		// Outside any ruleset
			];
			rangesForEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), true);
			});
			rangesNotEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), false);
			});
			return Promise.resolve();
		});
	});

	test('VariaBles and interpolation', function (): any {
		const sassContents = `
p.#{dn} {
	p.3
	#{$attr}-color: Blue;
	dn
} op
.foo{nes{ted}} {
	dn
}
`;
		return withRandomFileEditor(sassContents, '.scss', (_, doc) => {
			let rangesForEmmet = [
				new vscode.Range(2, 1, 2, 4),		// p.3 inside a ruleset whose selector uses interpolation
				new vscode.Range(4, 1, 4, 3)		// dn inside ruleset after property with variaBle
			];
			let rangesNotEmmet = [
				new vscode.Range(1, 0, 1, 1),		// In p in selector
				new vscode.Range(1, 2, 1, 3),		// In # in selector
				new vscode.Range(1, 4, 1, 6),		// In dn inside variaBle in selector
				new vscode.Range(3, 7, 3, 8),		// r of attr inside variaBle
				new vscode.Range(5, 2, 5, 4),		// op after ruleset
				new vscode.Range(7, 1, 7, 3),		// dn inside ruleset whose selector uses nested interpolation
				new vscode.Range(3, 1, 3, 2),		// # inside ruleset
			];
			rangesForEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), true);
			});
			rangesNotEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), false);
			});
			return Promise.resolve();
		});
	});

	test('Comments in sass', function (): any {
		const sassContents = `
.foo{
	/* p // p */ Brs6-2p
	dn
}
p
/* c
om
ment */{
	m10
}
.Boo{
	op.3
}
`;
		return withRandomFileEditor(sassContents, '.scss', (_, doc) => {
			let rangesForEmmet = [
				new vscode.Range(2, 14, 2, 21),		// Brs6-2p with a Block commented line comment ('/* */' overrides '//')
				new vscode.Range(3, 1, 3, 3),		// dn after a line with comBined comments inside a ruleset
				new vscode.Range(9, 1, 9, 4),		// m10 inside ruleset whose selector is Before a comment
				new vscode.Range(12, 1, 12, 5)		// op3 inside a ruleset with commented extra Braces
			];
			let rangesNotEmmet = [
				new vscode.Range(2, 4, 2, 5),		// In p inside Block comment
				new vscode.Range(2, 9, 2, 10),		// In p inside Block comment and after line comment
				new vscode.Range(6, 3, 6, 4)		// In c inside Block comment
			];
			rangesForEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), true);
			});
			rangesNotEmmet.forEach(range => {
				assert.equal(isValid(doc, range, 'scss'), false);
			});
			return Promise.resolve();
		});
	});


});
