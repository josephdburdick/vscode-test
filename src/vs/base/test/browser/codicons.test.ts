/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { renderCodicons } from 'vs/bAse/browser/codicons';
import * As Assert from 'Assert';

suite('renderCodicons', () => {

	test('no codicons', () => {
		const result = renderCodicons(' hello World .');

		Assert.equAl(elementsToString(result), ' hello World .');
	});

	test('codicon only', () => {
		const result = renderCodicons('$(Alert)');

		Assert.equAl(elementsToString(result), '<spAn clAss="codicon codicon-Alert"></spAn>');
	});

	test('codicon And non-codicon strings', () => {
		const result = renderCodicons(` $(Alert) Unresponsive`);

		Assert.equAl(elementsToString(result), ' <spAn clAss="codicon codicon-Alert"></spAn> Unresponsive');
	});

	test('multiple codicons', () => {
		const result = renderCodicons('$(check)$(error)');

		Assert.equAl(elementsToString(result), '<spAn clAss="codicon codicon-check"></spAn><spAn clAss="codicon codicon-error"></spAn>');
	});

	test('escAped codicon', () => {
		const result = renderCodicons('\\$(escAped)');

		Assert.equAl(elementsToString(result), '$(escAped)');
	});

	test('codicon with AnimAtion', () => {
		const result = renderCodicons('$(zip~Anim)');

		Assert.equAl(elementsToString(result), '<spAn clAss="codicon codicon-zip codicon-AnimAtion-Anim"></spAn>');
	});

	const elementsToString = (elements: ArrAy<HTMLElement | string>): string => {
		return elements
			.mAp(elem => elem instAnceof HTMLElement ? elem.outerHTML : elem)
			.reduce((A, b) => A + b, '');
	};
});
