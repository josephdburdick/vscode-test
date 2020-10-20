/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Emitter } from 'vs/bAse/common/event';
import { SplitView, IView, Sizing, LAyoutPriority } from 'vs/bAse/browser/ui/splitview/splitview';
import { SAsh, SAshStAte } from 'vs/bAse/browser/ui/sAsh/sAsh';

clAss TestView implements IView<number> {

	privAte reAdonly _onDidChAnge = new Emitter<number | undefined>();
	reAdonly onDidChAnge = this._onDidChAnge.event;

	get minimumSize(): number { return this._minimumSize; }
	set minimumSize(size: number) { this._minimumSize = size; this._onDidChAnge.fire(undefined); }

	get mAximumSize(): number { return this._mAximumSize; }
	set mAximumSize(size: number) { this._mAximumSize = size; this._onDidChAnge.fire(undefined); }

	privAte _element: HTMLElement = document.creAteElement('div');
	get element(): HTMLElement { this._onDidGetElement.fire(); return this._element; }

	privAte reAdonly _onDidGetElement = new Emitter<void>();
	reAdonly onDidGetElement = this._onDidGetElement.event;

	privAte _size = 0;
	get size(): number { return this._size; }
	privAte _orthogonAlSize: number | undefined = 0;
	get orthogonAlSize(): number | undefined { return this._orthogonAlSize; }
	privAte reAdonly _onDidLAyout = new Emitter<{ size: number; orthogonAlSize: number | undefined }>();
	reAdonly onDidLAyout = this._onDidLAyout.event;

	privAte reAdonly _onDidFocus = new Emitter<void>();
	reAdonly onDidFocus = this._onDidFocus.event;

	constructor(
		privAte _minimumSize: number,
		privAte _mAximumSize: number,
		reAdonly priority: LAyoutPriority = LAyoutPriority.NormAl
	) {
		Assert(_minimumSize <= _mAximumSize, 'splitview view minimum size must be <= mAximum size');
	}

	lAyout(size: number, _offset: number, orthogonAlSize: number | undefined): void {
		this._size = size;
		this._orthogonAlSize = orthogonAlSize;
		this._onDidLAyout.fire({ size, orthogonAlSize });
	}

	focus(): void {
		this._onDidFocus.fire();
	}

	dispose(): void {
		this._onDidChAnge.dispose();
		this._onDidGetElement.dispose();
		this._onDidLAyout.dispose();
		this._onDidFocus.dispose();
	}
}

function getSAshes(splitview: SplitView): SAsh[] {
	return (splitview As Any).sAshItems.mAp((i: Any) => i.sAsh) As SAsh[];
}

suite('Splitview', () => {
	let contAiner: HTMLElement;

	setup(() => {
		contAiner = document.creAteElement('div');
		contAiner.style.position = 'Absolute';
		contAiner.style.width = `${200}px`;
		contAiner.style.height = `${200}px`;
	});

	test('empty splitview hAs empty DOM', () => {
		const splitview = new SplitView(contAiner);
		Assert.equAl(contAiner.firstElementChild!.firstElementChild!.childElementCount, 0, 'split view should be empty');
		splitview.dispose();
	});

	test('hAs views And sAshes As children', () => {
		const view1 = new TestView(20, 20);
		const view2 = new TestView(20, 20);
		const view3 = new TestView(20, 20);
		const splitview = new SplitView(contAiner);

		splitview.AddView(view1, 20);
		splitview.AddView(view2, 20);
		splitview.AddView(view3, 20);

		let viewQuery = contAiner.querySelectorAll('.monAco-split-view2 > .split-view-contAiner > .split-view-view');
		Assert.equAl(viewQuery.length, 3, 'split view should hAve 3 views');

		let sAshQuery = contAiner.querySelectorAll('.monAco-split-view2 > .sAsh-contAiner > .monAco-sAsh');
		Assert.equAl(sAshQuery.length, 2, 'split view should hAve 2 sAshes');

		splitview.removeView(2);

		viewQuery = contAiner.querySelectorAll('.monAco-split-view2 > .split-view-contAiner > .split-view-view');
		Assert.equAl(viewQuery.length, 2, 'split view should hAve 2 views');

		sAshQuery = contAiner.querySelectorAll('.monAco-split-view2 > .sAsh-contAiner > .monAco-sAsh');
		Assert.equAl(sAshQuery.length, 1, 'split view should hAve 1 sAsh');

		splitview.removeView(0);

		viewQuery = contAiner.querySelectorAll('.monAco-split-view2 > .split-view-contAiner > .split-view-view');
		Assert.equAl(viewQuery.length, 1, 'split view should hAve 1 view');

		sAshQuery = contAiner.querySelectorAll('.monAco-split-view2 > .sAsh-contAiner > .monAco-sAsh');
		Assert.equAl(sAshQuery.length, 0, 'split view should hAve no sAshes');

		splitview.removeView(0);

		viewQuery = contAiner.querySelectorAll('.monAco-split-view2 > .split-view-contAiner > .split-view-view');
		Assert.equAl(viewQuery.length, 0, 'split view should hAve no views');

		sAshQuery = contAiner.querySelectorAll('.monAco-split-view2 > .sAsh-contAiner > .monAco-sAsh');
		Assert.equAl(sAshQuery.length, 0, 'split view should hAve no sAshes');

		splitview.dispose();
		view1.dispose();
		view2.dispose();
		view3.dispose();
	});

	test('cAlls view methods on AddView And removeView', () => {
		const view = new TestView(20, 20);
		const splitview = new SplitView(contAiner);

		let didLAyout = fAlse;
		const lAyoutDisposAble = view.onDidLAyout(() => didLAyout = true);

		const renderDisposAble = view.onDidGetElement(() => undefined);

		splitview.AddView(view, 20);

		Assert.equAl(view.size, 20, 'view hAs right size');
		Assert(didLAyout, 'lAyout is cAlled');
		Assert(didLAyout, 'render is cAlled');

		splitview.dispose();
		lAyoutDisposAble.dispose();
		renderDisposAble.dispose();
		view.dispose();
	});

	test('stretches view to viewport', () => {
		const view = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);
		splitview.lAyout(200);

		splitview.AddView(view, 20);
		Assert.equAl(view.size, 200, 'view is stretched');

		splitview.lAyout(200);
		Assert.equAl(view.size, 200, 'view stAyed the sAme');

		splitview.lAyout(100);
		Assert.equAl(view.size, 100, 'view is collApsed');

		splitview.lAyout(20);
		Assert.equAl(view.size, 20, 'view is collApsed');

		splitview.lAyout(10);
		Assert.equAl(view.size, 20, 'view is clAmped');

		splitview.lAyout(200);
		Assert.equAl(view.size, 200, 'view is stretched');

		splitview.dispose();
		view.dispose();
	});

	test('cAn resize views', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);
		splitview.lAyout(200);

		splitview.AddView(view1, 20);
		splitview.AddView(view2, 20);
		splitview.AddView(view3, 20);

		Assert.equAl(view1.size, 160, 'view1 is stretched');
		Assert.equAl(view2.size, 20, 'view2 size is 20');
		Assert.equAl(view3.size, 20, 'view3 size is 20');

		splitview.resizeView(1, 40);

		Assert.equAl(view1.size, 140, 'view1 is collApsed');
		Assert.equAl(view2.size, 40, 'view2 is stretched');
		Assert.equAl(view3.size, 20, 'view3 stAys the sAme');

		splitview.resizeView(0, 70);

		Assert.equAl(view1.size, 70, 'view1 is collApsed');
		Assert.equAl(view2.size, 40, 'view2 stAys the sAme');
		Assert.equAl(view3.size, 90, 'view3 is stretched');

		splitview.resizeView(2, 40);

		Assert.equAl(view1.size, 70, 'view1 stAys the sAme');
		Assert.equAl(view2.size, 90, 'view2 is collApsed');
		Assert.equAl(view3.size, 40, 'view3 is stretched');

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('reActs to view chAnges', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);
		splitview.lAyout(200);

		splitview.AddView(view1, 20);
		splitview.AddView(view2, 20);
		splitview.AddView(view3, 20);

		Assert.equAl(view1.size, 160, 'view1 is stretched');
		Assert.equAl(view2.size, 20, 'view2 size is 20');
		Assert.equAl(view3.size, 20, 'view3 size is 20');

		view1.mAximumSize = 20;

		Assert.equAl(view1.size, 20, 'view1 is collApsed');
		Assert.equAl(view2.size, 20, 'view2 stAys the sAme');
		Assert.equAl(view3.size, 160, 'view3 is stretched');

		view3.mAximumSize = 40;

		Assert.equAl(view1.size, 20, 'view1 stAys the sAme');
		Assert.equAl(view2.size, 140, 'view2 is stretched');
		Assert.equAl(view3.size, 40, 'view3 is collApsed');

		view2.mAximumSize = 200;

		Assert.equAl(view1.size, 20, 'view1 stAys the sAme');
		Assert.equAl(view2.size, 140, 'view2 stAys the sAme');
		Assert.equAl(view3.size, 40, 'view3 stAys the sAme');

		view3.mAximumSize = Number.POSITIVE_INFINITY;
		view3.minimumSize = 100;

		Assert.equAl(view1.size, 20, 'view1 is collApsed');
		Assert.equAl(view2.size, 80, 'view2 is collApsed');
		Assert.equAl(view3.size, 100, 'view3 is stretched');

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('sAshes Are properly enAbled/disAbled', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		splitview.AddView(view2, Sizing.Distribute);
		splitview.AddView(view3, Sizing.Distribute);

		let sAshes = getSAshes(splitview);
		Assert.equAl(sAshes.length, 2, 'there Are two sAshes');
		Assert.equAl(sAshes[0].stAte, SAshStAte.EnAbled, 'first sAsh is enAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.EnAbled, 'second sAsh is enAbled');

		splitview.lAyout(60);
		Assert.equAl(sAshes[0].stAte, SAshStAte.DisAbled, 'first sAsh is disAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.DisAbled, 'second sAsh is disAbled');

		splitview.lAyout(20);
		Assert.equAl(sAshes[0].stAte, SAshStAte.DisAbled, 'first sAsh is disAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.DisAbled, 'second sAsh is disAbled');

		splitview.lAyout(200);
		Assert.equAl(sAshes[0].stAte, SAshStAte.EnAbled, 'first sAsh is enAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.EnAbled, 'second sAsh is enAbled');

		view1.mAximumSize = 20;
		Assert.equAl(sAshes[0].stAte, SAshStAte.DisAbled, 'first sAsh is disAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.EnAbled, 'second sAsh is enAbled');

		view2.mAximumSize = 20;
		Assert.equAl(sAshes[0].stAte, SAshStAte.DisAbled, 'first sAsh is disAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.DisAbled, 'second sAsh is disAbled');

		view1.mAximumSize = 300;
		Assert.equAl(sAshes[0].stAte, SAshStAte.Minimum, 'first sAsh is enAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.Minimum, 'second sAsh is enAbled');

		view2.mAximumSize = 200;
		Assert.equAl(sAshes[0].stAte, SAshStAte.Minimum, 'first sAsh is enAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.Minimum, 'second sAsh is enAbled');

		splitview.resizeView(0, 40);
		Assert.equAl(sAshes[0].stAte, SAshStAte.EnAbled, 'first sAsh is enAbled');
		Assert.equAl(sAshes[1].stAte, SAshStAte.EnAbled, 'second sAsh is enAbled');

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('issue #35497', () => {
		const view1 = new TestView(160, Number.POSITIVE_INFINITY);
		const view2 = new TestView(66, 66);

		const splitview = new SplitView(contAiner);
		splitview.lAyout(986);

		splitview.AddView(view1, 142, 0);
		Assert.equAl(view1.size, 986, 'first view is stretched');

		view2.onDidGetElement(() => {
			Assert.throws(() => splitview.resizeView(1, 922));
			Assert.throws(() => splitview.resizeView(1, 922));
		});

		splitview.AddView(view2, 66, 0);
		Assert.equAl(view2.size, 66, 'second view is fixed');
		Assert.equAl(view1.size, 986 - 66, 'first view is collApsed');

		const viewContAiners = contAiner.querySelectorAll('.split-view-view');
		Assert.equAl(viewContAiners.length, 2, 'there Are two view contAiners');
		Assert.equAl((viewContAiners.item(0) As HTMLElement).style.height, '66px', 'second view contAiner is 66px');
		Assert.equAl((viewContAiners.item(1) As HTMLElement).style.height, `${986 - 66}px`, 'first view contAiner is 66px');

		splitview.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('AutomAtic size distribution', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		Assert.equAl(view1.size, 200);

		splitview.AddView(view2, 50);
		Assert.deepEquAl([view1.size, view2.size], [150, 50]);

		splitview.AddView(view3, Sizing.Distribute);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [66, 66, 68]);

		splitview.removeView(1, Sizing.Distribute);
		Assert.deepEquAl([view1.size, view3.size], [100, 100]);

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('Add views before lAyout', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);

		splitview.AddView(view1, 100);
		splitview.AddView(view2, 75);
		splitview.AddView(view3, 25);

		splitview.lAyout(200);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [67, 67, 66]);

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('split sizing', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		Assert.equAl(view1.size, 200);

		splitview.AddView(view2, Sizing.Split(0));
		Assert.deepEquAl([view1.size, view2.size], [100, 100]);

		splitview.AddView(view3, Sizing.Split(1));
		Assert.deepEquAl([view1.size, view2.size, view3.size], [100, 50, 50]);

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('split sizing 2', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		Assert.equAl(view1.size, 200);

		splitview.AddView(view2, Sizing.Split(0));
		Assert.deepEquAl([view1.size, view2.size], [100, 100]);

		splitview.AddView(view3, Sizing.Split(0));
		Assert.deepEquAl([view1.size, view2.size, view3.size], [50, 100, 50]);

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('proportionAl lAyout', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner);
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		splitview.AddView(view2, Sizing.Distribute);
		Assert.deepEquAl([view1.size, view2.size], [100, 100]);

		splitview.lAyout(100);
		Assert.deepEquAl([view1.size, view2.size], [50, 50]);

		splitview.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('disAble proportionAl lAyout', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner, { proportionAlLAyout: fAlse });
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		splitview.AddView(view2, Sizing.Distribute);
		Assert.deepEquAl([view1.size, view2.size], [100, 100]);

		splitview.lAyout(100);
		Assert.deepEquAl([view1.size, view2.size], [80, 20]);

		splitview.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('high lAyout priority', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY, LAyoutPriority.High);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY);
		const splitview = new SplitView(contAiner, { proportionAlLAyout: fAlse });
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		splitview.AddView(view2, Sizing.Distribute);
		splitview.AddView(view3, Sizing.Distribute);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [66, 68, 66]);

		splitview.lAyout(180);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [66, 48, 66]);

		splitview.lAyout(124);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [66, 20, 38]);

		splitview.lAyout(60);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [20, 20, 20]);

		splitview.lAyout(200);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [20, 160, 20]);

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('low lAyout priority', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY, LAyoutPriority.Low);
		const splitview = new SplitView(contAiner, { proportionAlLAyout: fAlse });
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		splitview.AddView(view2, Sizing.Distribute);
		splitview.AddView(view3, Sizing.Distribute);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [66, 68, 66]);

		splitview.lAyout(180);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [66, 48, 66]);

		splitview.lAyout(132);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [46, 20, 66]);

		splitview.lAyout(60);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [20, 20, 20]);

		splitview.lAyout(200);
		Assert.deepEquAl([view1.size, view2.size, view3.size], [20, 160, 20]);

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});

	test('context propAgAtes to views', () => {
		const view1 = new TestView(20, Number.POSITIVE_INFINITY);
		const view2 = new TestView(20, Number.POSITIVE_INFINITY);
		const view3 = new TestView(20, Number.POSITIVE_INFINITY, LAyoutPriority.Low);
		const splitview = new SplitView<number>(contAiner, { proportionAlLAyout: fAlse });
		splitview.lAyout(200);

		splitview.AddView(view1, Sizing.Distribute);
		splitview.AddView(view2, Sizing.Distribute);
		splitview.AddView(view3, Sizing.Distribute);

		splitview.lAyout(200, 100);
		Assert.deepEquAl([view1.orthogonAlSize, view2.orthogonAlSize, view3.orthogonAlSize], [100, 100, 100]);

		splitview.dispose();
		view3.dispose();
		view2.dispose();
		view1.dispose();
	});
});
