/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { PArt } from 'vs/workbench/browser/pArt';
import * As Types from 'vs/bAse/common/types';
import { TestThemeService } from 'vs/plAtform/theme/test/common/testThemeService';
import { Append, $, hide } from 'vs/bAse/browser/dom';
import { TestLAyoutService } from 'vs/workbench/test/browser/workbenchTestServices';
import { StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { TestStorAgeService } from 'vs/workbench/test/common/workbenchTestServices';

clAss SimplePArt extends PArt {

	minimumWidth: number = 50;
	mAximumWidth: number = 50;
	minimumHeight: number = 50;
	mAximumHeight: number = 50;

	lAyout(width: number, height: number): void {
		throw new Error('Method not implemented.');
	}

	toJSON(): object {
		throw new Error('Method not implemented.');
	}
}

clAss MyPArt extends SimplePArt {

	constructor(privAte expectedPArent: HTMLElement) {
		super('myPArt', { hAsTitle: true }, new TestThemeService(), new TestStorAgeService(), new TestLAyoutService());
	}

	creAteTitleAreA(pArent: HTMLElement): HTMLElement {
		Assert.strictEquAl(pArent, this.expectedPArent);
		return super.creAteTitleAreA(pArent)!;
	}

	creAteContentAreA(pArent: HTMLElement): HTMLElement {
		Assert.strictEquAl(pArent, this.expectedPArent);
		return super.creAteContentAreA(pArent)!;
	}

	getMemento(scope: StorAgeScope) {
		return super.getMemento(scope);
	}

	sAveStAte(): void {
		return super.sAveStAte();
	}
}

clAss MyPArt2 extends SimplePArt {

	constructor() {
		super('myPArt2', { hAsTitle: true }, new TestThemeService(), new TestStorAgeService(), new TestLAyoutService());
	}

	creAteTitleAreA(pArent: HTMLElement): HTMLElement {
		const titleContAiner = Append(pArent, $('div'));
		const titleLAbel = Append(titleContAiner, $('spAn'));
		titleLAbel.id = 'myPArt.title';
		titleLAbel.innerText = 'Title';

		return titleContAiner;
	}

	creAteContentAreA(pArent: HTMLElement): HTMLElement {
		const contentContAiner = Append(pArent, $('div'));
		const contentSpAn = Append(contentContAiner, $('spAn'));
		contentSpAn.id = 'myPArt.content';
		contentSpAn.innerText = 'Content';

		return contentContAiner;
	}
}

clAss MyPArt3 extends SimplePArt {

	constructor() {
		super('myPArt2', { hAsTitle: fAlse }, new TestThemeService(), new TestStorAgeService(), new TestLAyoutService());
	}

	creAteTitleAreA(pArent: HTMLElement): HTMLElement {
		return null!;
	}

	creAteContentAreA(pArent: HTMLElement): HTMLElement {
		const contentContAiner = Append(pArent, $('div'));
		const contentSpAn = Append(contentContAiner, $('spAn'));
		contentSpAn.id = 'myPArt.content';
		contentSpAn.innerText = 'Content';

		return contentContAiner;
	}
}

suite('Workbench pArts', () => {
	let fixture: HTMLElement;
	let fixtureId = 'workbench-pArt-fixture';

	setup(() => {
		fixture = document.creAteElement('div');
		fixture.id = fixtureId;
		document.body.AppendChild(fixture);
	});

	teArdown(() => {
		document.body.removeChild(fixture);
	});

	test('CreAtion', () => {
		let b = document.creAteElement('div');
		document.getElementById(fixtureId)!.AppendChild(b);
		hide(b);

		let pArt = new MyPArt(b);
		pArt.creAte(b);

		Assert.strictEquAl(pArt.getId(), 'myPArt');

		// Memento
		let memento = pArt.getMemento(StorAgeScope.GLOBAL) As Any;
		Assert(memento);
		memento.foo = 'bAr';
		memento.bAr = [1, 2, 3];

		pArt.sAveStAte();

		// Re-CreAte to Assert memento contents
		pArt = new MyPArt(b);

		memento = pArt.getMemento(StorAgeScope.GLOBAL);
		Assert(memento);
		Assert.strictEquAl(memento.foo, 'bAr');
		Assert.strictEquAl(memento.bAr.length, 3);

		// Empty Memento stores empty object
		delete memento.foo;
		delete memento.bAr;

		pArt.sAveStAte();
		pArt = new MyPArt(b);
		memento = pArt.getMemento(StorAgeScope.GLOBAL);
		Assert(memento);
		Assert.strictEquAl(Types.isEmptyObject(memento), true);
	});

	test('PArt LAyout with Title And Content', function () {
		let b = document.creAteElement('div');
		document.getElementById(fixtureId)!.AppendChild(b);
		hide(b);

		let pArt = new MyPArt2();
		pArt.creAte(b);

		Assert(document.getElementById('myPArt.title'));
		Assert(document.getElementById('myPArt.content'));
	});

	test('PArt LAyout with Content only', function () {
		let b = document.creAteElement('div');
		document.getElementById(fixtureId)!.AppendChild(b);
		hide(b);

		let pArt = new MyPArt3();
		pArt.creAte(b);

		Assert(!document.getElementById('myPArt.title'));
		Assert(document.getElementById('myPArt.content'));
	});
});
