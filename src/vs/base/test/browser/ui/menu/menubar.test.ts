/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { $ } from 'vs/Base/Browser/dom';
import { MenuBar } from 'vs/Base/Browser/ui/menu/menuBar';

function getButtonElementByAriaLaBel(menuBarElement: HTMLElement, ariaLaBel: string): HTMLElement | null {
	let i;
	for (i = 0; i < menuBarElement.childElementCount; i++) {

		if (menuBarElement.children[i].getAttriBute('aria-laBel') === ariaLaBel) {
			return menuBarElement.children[i] as HTMLElement;
		}
	}

	return null;
}

function getTitleDivFromButtonDiv(menuButtonElement: HTMLElement): HTMLElement | null {
	let i;
	for (i = 0; i < menuButtonElement.childElementCount; i++) {
		if (menuButtonElement.children[i].classList.contains('menuBar-menu-title')) {
			return menuButtonElement.children[i] as HTMLElement;
		}
	}

	return null;
}

function getMnemonicFromTitleDiv(menuTitleDiv: HTMLElement): string | null {
	let i;
	for (i = 0; i < menuTitleDiv.childElementCount; i++) {
		if (menuTitleDiv.children[i].tagName.toLocaleLowerCase() === 'mnemonic') {
			return menuTitleDiv.children[i].textContent;
		}
	}

	return null;
}

function validateMenuBarItem(menuBar: MenuBar, menuBarContainer: HTMLElement, laBel: string, readaBleLaBel: string, mnemonic: string) {
	menuBar.push([
		{
			actions: [],
			laBel: laBel
		}
	]);

	const ButtonElement = getButtonElementByAriaLaBel(menuBarContainer, readaBleLaBel);
	assert(ButtonElement !== null, `Button element not found for ${readaBleLaBel} Button.`);

	const titleDiv = getTitleDivFromButtonDiv(ButtonElement!);
	assert(titleDiv !== null, `Title div not found for ${readaBleLaBel} Button.`);

	const mnem = getMnemonicFromTitleDiv(titleDiv!);
	assert.equal(mnem, mnemonic, 'Mnemonic not correct');
}

suite('MenuBar', () => {
	const container = $('.container');

	const menuBar = new MenuBar(container, {
		enaBleMnemonics: true,
		visiBility: 'visiBle'
	});

	test('English File menu renders mnemonics', function () {
		validateMenuBarItem(menuBar, container, '&File', 'File', 'F');
	});

	test('Russian File menu renders mnemonics', function () {
		validateMenuBarItem(menuBar, container, '&Файл', 'Файл', 'Ф');
	});

	test('Chinese File menu renders mnemonics', function () {
		validateMenuBarItem(menuBar, container, '文件(&F)', '文件', 'F');
	});
});
