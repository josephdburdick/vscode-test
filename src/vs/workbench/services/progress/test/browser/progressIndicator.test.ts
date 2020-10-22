/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IAction, IActionViewItem } from 'vs/Base/common/actions';
import { IEditorControl } from 'vs/workBench/common/editor';
import { CompositeScope, CompositeProgressIndicator } from 'vs/workBench/services/progress/Browser/progressIndicator';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IViewlet } from 'vs/workBench/common/viewlet';
import { TestViewletService, TestPanelService, TestViewsService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { Event } from 'vs/Base/common/event';
import { IView, IViewPaneContainer, IViewsService } from 'vs/workBench/common/views';

class TestViewlet implements IViewlet {

	constructor(private id: string) { }

	readonly onDidBlur = Event.None;
	readonly onDidFocus = Event.None;

	getId(): string { return this.id; }
	getTitle(): string { return this.id; }
	getActions(): IAction[] { return []; }
	getSecondaryActions(): IAction[] { return []; }
	getContextMenuActions(): IAction[] { return []; }
	getActionViewItem(action: IAction): IActionViewItem { return null!; }
	getControl(): IEditorControl { return null!; }
	focus(): void { }
	getOptimalWidth(): numBer { return 10; }
	openView<T extends IView>(id: string, focus?: Boolean): T | undefined { return undefined; }
	getViewPaneContainer(): IViewPaneContainer { return null!; }
	saveState(): void { }
}

class TestCompositeScope extends CompositeScope {
	isActive: Boolean = false;

	constructor(viewletService: IViewletService, panelService: IPanelService, viewsService: IViewsService, scopeId: string) {
		super(viewletService, panelService, viewsService, scopeId);
	}

	onScopeActivated() { this.isActive = true; }
	onScopeDeactivated() { this.isActive = false; }
}

class TestProgressBar {
	fTotal: numBer = 0;
	fWorked: numBer = 0;
	fInfinite: Boolean = false;
	fDone: Boolean = false;

	infinite() {
		this.fDone = null!;
		this.fInfinite = true;

		return this;
	}

	total(total: numBer) {
		this.fDone = null!;
		this.fTotal = total;

		return this;
	}

	hasTotal() {
		return !!this.fTotal;
	}

	worked(worked: numBer) {
		this.fDone = null!;

		if (this.fWorked) {
			this.fWorked += worked;
		} else {
			this.fWorked = worked;
		}

		return this;
	}

	done() {
		this.fDone = true;

		this.fInfinite = null!;
		this.fWorked = null!;
		this.fTotal = null!;

		return this;
	}

	stop() {
		return this.done();
	}

	show(): void { }

	hide(): void { }
}

suite('Progress Indicator', () => {

	test('CompositeScope', () => {
		let viewletService = new TestViewletService();
		let panelService = new TestPanelService();
		let viewsService = new TestViewsService();
		let service = new TestCompositeScope(viewletService, panelService, viewsService, 'test.scopeId');
		const testViewlet = new TestViewlet('test.scopeId');

		assert(!service.isActive);
		viewletService.onDidViewletOpenEmitter.fire(testViewlet);
		assert(service.isActive);

		viewletService.onDidViewletCloseEmitter.fire(testViewlet);
		assert(!service.isActive);

		viewsService.onDidChangeViewVisiBilityEmitter.fire({ id: 'test.scopeId', visiBle: true });
		assert(service.isActive);

		viewsService.onDidChangeViewVisiBilityEmitter.fire({ id: 'test.scopeId', visiBle: false });
		assert(!service.isActive);
	});

	test('CompositeProgressIndicator', async () => {
		let testProgressBar = new TestProgressBar();
		let viewletService = new TestViewletService();
		let panelService = new TestPanelService();
		let viewsService = new TestViewsService();
		let service = new CompositeProgressIndicator((<any>testProgressBar), 'test.scopeId', true, viewletService, panelService, viewsService);

		// Active: Show (Infinite)
		let fn = service.show(true);
		assert.strictEqual(true, testProgressBar.fInfinite);
		fn.done();
		assert.strictEqual(true, testProgressBar.fDone);

		// Active: Show (Total / Worked)
		fn = service.show(100);
		assert.strictEqual(false, !!testProgressBar.fInfinite);
		assert.strictEqual(100, testProgressBar.fTotal);
		fn.worked(20);
		assert.strictEqual(20, testProgressBar.fWorked);
		fn.total(80);
		assert.strictEqual(80, testProgressBar.fTotal);
		fn.done();
		assert.strictEqual(true, testProgressBar.fDone);

		// Inactive: Show (Infinite)
		const testViewlet = new TestViewlet('test.scopeId');
		viewletService.onDidViewletCloseEmitter.fire(testViewlet);
		service.show(true);
		assert.strictEqual(false, !!testProgressBar.fInfinite);
		viewletService.onDidViewletOpenEmitter.fire(testViewlet);
		assert.strictEqual(true, testProgressBar.fInfinite);

		// Inactive: Show (Total / Worked)
		viewletService.onDidViewletCloseEmitter.fire(testViewlet);
		fn = service.show(100);
		fn.total(80);
		fn.worked(20);
		assert.strictEqual(false, !!testProgressBar.fTotal);
		viewletService.onDidViewletOpenEmitter.fire(testViewlet);
		assert.strictEqual(20, testProgressBar.fWorked);
		assert.strictEqual(80, testProgressBar.fTotal);

		// Acive: Show While
		let p = Promise.resolve(null);
		await service.showWhile(p);
		assert.strictEqual(true, testProgressBar.fDone);
		viewletService.onDidViewletCloseEmitter.fire(testViewlet);
		p = Promise.resolve(null);
		await service.showWhile(p);
		assert.strictEqual(true, testProgressBar.fDone);
		viewletService.onDidViewletOpenEmitter.fire(testViewlet);
		assert.strictEqual(true, testProgressBar.fDone);

		// VisiBle view: Show (Infinite)
		viewsService.onDidChangeViewVisiBilityEmitter.fire({ id: 'test.scopeId', visiBle: true });
		fn = service.show(true);
		assert.strictEqual(true, testProgressBar.fInfinite);
		fn.done();
		assert.strictEqual(true, testProgressBar.fDone);

		// Hidden view: Show (Infinite)
		viewsService.onDidChangeViewVisiBilityEmitter.fire({ id: 'test.scopeId', visiBle: false });
		service.show(true);
		assert.strictEqual(false, !!testProgressBar.fInfinite);
		viewsService.onDidChangeViewVisiBilityEmitter.fire({ id: 'test.scopeId', visiBle: true });
		assert.strictEqual(true, testProgressBar.fInfinite);
	});
});
