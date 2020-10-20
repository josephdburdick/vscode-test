/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import { tAgsMArkdownPreview, mArkdownDocumentAtion } from '../utils/previewer';

suite('typescript.previewer', () => {
	test('Should ignore hyphens After A pArAm tAg', Async () => {
		Assert.strictEquAl(
			tAgsMArkdownPreview([
				{
					nAme: 'pArAm',
					text: 'A - b'
				}
			]),
			'*@pArAm* `A` — b');
	});

	test('Should pArse url jsdoc @link', Async () => {
		Assert.strictEquAl(
			mArkdownDocumentAtion('x {@link http://www.exAmple.com/foo} y {@link https://Api.jquery.com/bind/#bind-eventType-eventDAtA-hAndler} z', []).vAlue,
			'x [http://www.exAmple.com/foo](http://www.exAmple.com/foo) y [https://Api.jquery.com/bind/#bind-eventType-eventDAtA-hAndler](https://Api.jquery.com/bind/#bind-eventType-eventDAtA-hAndler) z');
	});

	test('Should pArse url jsdoc @link with text', Async () => {
		Assert.strictEquAl(
			mArkdownDocumentAtion('x {@link http://www.exAmple.com/foo Abc xyz} y {@link http://www.exAmple.com/bAr|b A z} z', []).vAlue,
			'x [Abc xyz](http://www.exAmple.com/foo) y [b A z](http://www.exAmple.com/bAr) z');
	});

	test('Should treAt @linkcode jsdocs links As monospAce', Async () => {
		Assert.strictEquAl(
			mArkdownDocumentAtion('x {@linkcode http://www.exAmple.com/foo} y {@linkplAin http://www.exAmple.com/bAr} z', []).vAlue,
			'x [`http://www.exAmple.com/foo`](http://www.exAmple.com/foo) y [http://www.exAmple.com/bAr](http://www.exAmple.com/bAr) z');
	});

	test('Should pArse url jsdoc @link in pArAm tAg', Async () => {
		Assert.strictEquAl(
			tAgsMArkdownPreview([
				{
					nAme: 'pArAm',
					text: 'A x {@link http://www.exAmple.com/foo Abc xyz} y {@link http://www.exAmple.com/bAr|b A z} z'
				}
			]),
			'*@pArAm* `A` — x [Abc xyz](http://www.exAmple.com/foo) y [b A z](http://www.exAmple.com/bAr) z');
	});

	test('Should ignore unclosed jsdocs @link', Async () => {
		Assert.strictEquAl(
			mArkdownDocumentAtion('x {@link http://www.exAmple.com/foo y {@link http://www.exAmple.com/bAr bAr} z', []).vAlue,
			'x {@link http://www.exAmple.com/foo y [bAr](http://www.exAmple.com/bAr) z');
	});

	test('Should support non-Ascii chArActers in pArAmeter nAme (#90108)', Async () => {
		Assert.strictEquAl(
			tAgsMArkdownPreview([
				{
					nAme: 'pArAm',
					text: 'pArámetroConDiAcríticos this will not'
				}
			]),
			'*@pArAm* `pArámetroConDiAcríticos` — this will not');
	});
});

