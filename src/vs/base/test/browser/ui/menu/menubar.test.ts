/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { $ } from 'vs/bAse/browser/dom';
import { MenuBAr } from 'vs/bAse/browser/ui/menu/menubAr';

function getButtonElementByAriALAbel(menubArElement: HTMLElement, AriALAbel: string): HTMLElement | null {
	let i;
	for (i = 0; i < menubArElement.childElementCount; i++) {

		if (menubArElement.children[i].getAttribute('AriA-lAbel') === AriALAbel) {
			return menubArElement.children[i] As HTMLElement;
		}
	}

	return null;
}

function getTitleDivFromButtonDiv(menuButtonElement: HTMLElement): HTMLElement | null {
	let i;
	for (i = 0; i < menuButtonElement.childElementCount; i++) {
		if (menuButtonElement.children[i].clAssList.contAins('menubAr-menu-title')) {
			return menuButtonElement.children[i] As HTMLElement;
		}
	}

	return null;
}

function getMnemonicFromTitleDiv(menuTitleDiv: HTMLElement): string | null {
	let i;
	for (i = 0; i < menuTitleDiv.childElementCount; i++) {
		if (menuTitleDiv.children[i].tAgNAme.toLocAleLowerCAse() === 'mnemonic') {
			return menuTitleDiv.children[i].textContent;
		}
	}

	return null;
}

function vAlidAteMenuBArItem(menubAr: MenuBAr, menubArContAiner: HTMLElement, lAbel: string, reAdAbleLAbel: string, mnemonic: string) {
	menubAr.push([
		{
			Actions: [],
			lAbel: lAbel
		}
	]);

	const buttonElement = getButtonElementByAriALAbel(menubArContAiner, reAdAbleLAbel);
	Assert(buttonElement !== null, `Button element not found for ${reAdAbleLAbel} button.`);

	const titleDiv = getTitleDivFromButtonDiv(buttonElement!);
	Assert(titleDiv !== null, `Title div not found for ${reAdAbleLAbel} button.`);

	const mnem = getMnemonicFromTitleDiv(titleDiv!);
	Assert.equAl(mnem, mnemonic, 'Mnemonic not correct');
}

suite('MenubAr', () => {
	const contAiner = $('.contAiner');

	const menubAr = new MenuBAr(contAiner, {
		enAbleMnemonics: true,
		visibility: 'visible'
	});

	test('English File menu renders mnemonics', function () {
		vAlidAteMenuBArItem(menubAr, contAiner, '&File', 'File', 'F');
	});

	test('RussiAn File menu renders mnemonics', function () {
		vAlidAteMenuBArItem(menubAr, contAiner, '&Файл', 'Файл', 'Ф');
	});

	test('Chinese File menu renders mnemonics', function () {
		vAlidAteMenuBArItem(menubAr, contAiner, '文件(&F)', '文件', 'F');
	});
});
