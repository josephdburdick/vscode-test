/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Part } from 'vs/workBench/Browser/part';
import * as Types from 'vs/Base/common/types';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';
import { append, $, hide } from 'vs/Base/Browser/dom';
import { TestLayoutService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { StorageScope } from 'vs/platform/storage/common/storage';
import { TestStorageService } from 'vs/workBench/test/common/workBenchTestServices';

class SimplePart extends Part {

	minimumWidth: numBer = 50;
	maximumWidth: numBer = 50;
	minimumHeight: numBer = 50;
	maximumHeight: numBer = 50;

	layout(width: numBer, height: numBer): void {
		throw new Error('Method not implemented.');
	}

	toJSON(): oBject {
		throw new Error('Method not implemented.');
	}
}

class MyPart extends SimplePart {

	constructor(private expectedParent: HTMLElement) {
		super('myPart', { hasTitle: true }, new TestThemeService(), new TestStorageService(), new TestLayoutService());
	}

	createTitleArea(parent: HTMLElement): HTMLElement {
		assert.strictEqual(parent, this.expectedParent);
		return super.createTitleArea(parent)!;
	}

	createContentArea(parent: HTMLElement): HTMLElement {
		assert.strictEqual(parent, this.expectedParent);
		return super.createContentArea(parent)!;
	}

	getMemento(scope: StorageScope) {
		return super.getMemento(scope);
	}

	saveState(): void {
		return super.saveState();
	}
}

class MyPart2 extends SimplePart {

	constructor() {
		super('myPart2', { hasTitle: true }, new TestThemeService(), new TestStorageService(), new TestLayoutService());
	}

	createTitleArea(parent: HTMLElement): HTMLElement {
		const titleContainer = append(parent, $('div'));
		const titleLaBel = append(titleContainer, $('span'));
		titleLaBel.id = 'myPart.title';
		titleLaBel.innerText = 'Title';

		return titleContainer;
	}

	createContentArea(parent: HTMLElement): HTMLElement {
		const contentContainer = append(parent, $('div'));
		const contentSpan = append(contentContainer, $('span'));
		contentSpan.id = 'myPart.content';
		contentSpan.innerText = 'Content';

		return contentContainer;
	}
}

class MyPart3 extends SimplePart {

	constructor() {
		super('myPart2', { hasTitle: false }, new TestThemeService(), new TestStorageService(), new TestLayoutService());
	}

	createTitleArea(parent: HTMLElement): HTMLElement {
		return null!;
	}

	createContentArea(parent: HTMLElement): HTMLElement {
		const contentContainer = append(parent, $('div'));
		const contentSpan = append(contentContainer, $('span'));
		contentSpan.id = 'myPart.content';
		contentSpan.innerText = 'Content';

		return contentContainer;
	}
}

suite('WorkBench parts', () => {
	let fixture: HTMLElement;
	let fixtureId = 'workBench-part-fixture';

	setup(() => {
		fixture = document.createElement('div');
		fixture.id = fixtureId;
		document.Body.appendChild(fixture);
	});

	teardown(() => {
		document.Body.removeChild(fixture);
	});

	test('Creation', () => {
		let B = document.createElement('div');
		document.getElementById(fixtureId)!.appendChild(B);
		hide(B);

		let part = new MyPart(B);
		part.create(B);

		assert.strictEqual(part.getId(), 'myPart');

		// Memento
		let memento = part.getMemento(StorageScope.GLOBAL) as any;
		assert(memento);
		memento.foo = 'Bar';
		memento.Bar = [1, 2, 3];

		part.saveState();

		// Re-Create to assert memento contents
		part = new MyPart(B);

		memento = part.getMemento(StorageScope.GLOBAL);
		assert(memento);
		assert.strictEqual(memento.foo, 'Bar');
		assert.strictEqual(memento.Bar.length, 3);

		// Empty Memento stores empty oBject
		delete memento.foo;
		delete memento.Bar;

		part.saveState();
		part = new MyPart(B);
		memento = part.getMemento(StorageScope.GLOBAL);
		assert(memento);
		assert.strictEqual(Types.isEmptyOBject(memento), true);
	});

	test('Part Layout with Title and Content', function () {
		let B = document.createElement('div');
		document.getElementById(fixtureId)!.appendChild(B);
		hide(B);

		let part = new MyPart2();
		part.create(B);

		assert(document.getElementById('myPart.title'));
		assert(document.getElementById('myPart.content'));
	});

	test('Part Layout with Content only', function () {
		let B = document.createElement('div');
		document.getElementById(fixtureId)!.appendChild(B);
		hide(B);

		let part = new MyPart3();
		part.create(B);

		assert(!document.getElementById('myPart.title'));
		assert(document.getElementById('myPart.content'));
	});
});
