/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Direction, getRelAtiveLocAtion, OrientAtion, SeriAlizAbleGrid, ISeriAlizAbleView, IViewDeseriAlizer, GridNode, Sizing, isGridBrAnchNode, sAnitizeGridNodeDescriptor, GridNodeDescriptor, creAteSeriAlizedGrid, Grid } from 'vs/bAse/browser/ui/grid/grid';
import { TestView, nodesToArrAys } from './util';
import { deepClone } from 'vs/bAse/common/objects';
import { Event } from 'vs/bAse/common/event';

// Simple exAmple:
//
//  +-----+---------------+
//  |  4  |      2        |
//  +-----+---------+-----+
//  |        1      |     |
//  +---------------+  3  |
//  |        5      |     |
//  +---------------+-----+
//
//  V
//  +-H
//  | +-4
//  | +-2
//  +-H
//    +-V
//    | +-1
//    | +-5
//    +-3

suite('Grid', function () {
	let contAiner: HTMLElement;

	setup(function () {
		contAiner = document.creAteElement('div');
		contAiner.style.position = 'Absolute';
		contAiner.style.width = `${800}px`;
		contAiner.style.height = `${600}px`;
	});

	test('getRelAtiveLocAtion', () => {
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [0], Direction.Up), [0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [0], Direction.Down), [1]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [0], Direction.Left), [0, 0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [0], Direction.Right), [0, 1]);

		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.HORIZONTAL, [0], Direction.Up), [0, 0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.HORIZONTAL, [0], Direction.Down), [0, 1]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.HORIZONTAL, [0], Direction.Left), [0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.HORIZONTAL, [0], Direction.Right), [1]);

		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [4], Direction.Up), [4]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [4], Direction.Down), [5]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [4], Direction.Left), [4, 0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [4], Direction.Right), [4, 1]);

		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [0, 0], Direction.Up), [0, 0, 0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [0, 0], Direction.Down), [0, 0, 1]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [0, 0], Direction.Left), [0, 0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [0, 0], Direction.Right), [0, 1]);

		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [1, 2], Direction.Up), [1, 2, 0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [1, 2], Direction.Down), [1, 2, 1]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [1, 2], Direction.Left), [1, 2]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [1, 2], Direction.Right), [1, 3]);

		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [1, 2, 3], Direction.Up), [1, 2, 3]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [1, 2, 3], Direction.Down), [1, 2, 4]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [1, 2, 3], Direction.Left), [1, 2, 3, 0]);
		Assert.deepEquAl(getRelAtiveLocAtion(OrientAtion.VERTICAL, [1, 2, 3], Direction.Right), [1, 2, 3, 1]);
	});

	test('empty', () => {
		const view1 = new TestView(100, Number.MAX_VALUE, 100, Number.MAX_VALUE);
		const gridview = new Grid(view1);
		contAiner.AppendChild(gridview.element);
		gridview.lAyout(800, 600);

		Assert.deepEquAl(view1.size, [800, 600]);
	});

	test('two views verticAlly', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);
		grid.lAyout(800, 600);
		Assert.deepEquAl(view1.size, [800, 600]);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, 200, view1, Direction.Up);
		Assert.deepEquAl(view1.size, [800, 400]);
		Assert.deepEquAl(view2.size, [800, 200]);
	});

	test('two views horizontAlly', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);
		Assert.deepEquAl(view1.size, [800, 600]);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, 300, view1, Direction.Right);
		Assert.deepEquAl(view1.size, [500, 600]);
		Assert.deepEquAl(view2.size, [300, 600]);
	});

	test('simple lAyout', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);
		Assert.deepEquAl(view1.size, [800, 600]);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, 200, view1, Direction.Up);
		Assert.deepEquAl(view1.size, [800, 400]);
		Assert.deepEquAl(view2.size, [800, 200]);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, 200, view1, Direction.Right);
		Assert.deepEquAl(view1.size, [600, 400]);
		Assert.deepEquAl(view2.size, [800, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, 200, view2, Direction.Left);
		Assert.deepEquAl(view1.size, [600, 400]);
		Assert.deepEquAl(view2.size, [600, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);
		Assert.deepEquAl(view4.size, [200, 200]);

		const view5 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, 100, view1, Direction.Down);
		Assert.deepEquAl(view1.size, [600, 300]);
		Assert.deepEquAl(view2.size, [600, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);
		Assert.deepEquAl(view4.size, [200, 200]);
		Assert.deepEquAl(view5.size, [600, 100]);
	});

	test('Another simple lAyout with AutomAtic size distribution', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);
		Assert.deepEquAl(view1.size, [800, 600]);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Distribute, view1, Direction.Left);
		Assert.deepEquAl(view1.size, [400, 600]);
		Assert.deepEquAl(view2.size, [400, 600]);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Distribute, view1, Direction.Right);
		Assert.deepEquAl(view1.size, [266, 600]);
		Assert.deepEquAl(view2.size, [266, 600]);
		Assert.deepEquAl(view3.size, [268, 600]);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Distribute, view2, Direction.Down);
		Assert.deepEquAl(view1.size, [266, 600]);
		Assert.deepEquAl(view2.size, [266, 300]);
		Assert.deepEquAl(view3.size, [268, 600]);
		Assert.deepEquAl(view4.size, [266, 300]);

		const view5 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, Sizing.Distribute, view3, Direction.Up);
		Assert.deepEquAl(view1.size, [266, 600]);
		Assert.deepEquAl(view2.size, [266, 300]);
		Assert.deepEquAl(view3.size, [268, 300]);
		Assert.deepEquAl(view4.size, [266, 300]);
		Assert.deepEquAl(view5.size, [268, 300]);

		const view6 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view6, Sizing.Distribute, view3, Direction.Down);
		Assert.deepEquAl(view1.size, [266, 600]);
		Assert.deepEquAl(view2.size, [266, 300]);
		Assert.deepEquAl(view3.size, [268, 200]);
		Assert.deepEquAl(view4.size, [266, 300]);
		Assert.deepEquAl(view5.size, [268, 200]);
		Assert.deepEquAl(view6.size, [268, 200]);
	});

	test('Another simple lAyout with split size distribution', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);
		Assert.deepEquAl(view1.size, [800, 600]);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Split, view1, Direction.Left);
		Assert.deepEquAl(view1.size, [400, 600]);
		Assert.deepEquAl(view2.size, [400, 600]);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Split, view1, Direction.Right);
		Assert.deepEquAl(view1.size, [200, 600]);
		Assert.deepEquAl(view2.size, [400, 600]);
		Assert.deepEquAl(view3.size, [200, 600]);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Split, view2, Direction.Down);
		Assert.deepEquAl(view1.size, [200, 600]);
		Assert.deepEquAl(view2.size, [400, 300]);
		Assert.deepEquAl(view3.size, [200, 600]);
		Assert.deepEquAl(view4.size, [400, 300]);

		const view5 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, Sizing.Split, view3, Direction.Up);
		Assert.deepEquAl(view1.size, [200, 600]);
		Assert.deepEquAl(view2.size, [400, 300]);
		Assert.deepEquAl(view3.size, [200, 300]);
		Assert.deepEquAl(view4.size, [400, 300]);
		Assert.deepEquAl(view5.size, [200, 300]);

		const view6 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view6, Sizing.Split, view3, Direction.Down);
		Assert.deepEquAl(view1.size, [200, 600]);
		Assert.deepEquAl(view2.size, [400, 300]);
		Assert.deepEquAl(view3.size, [200, 150]);
		Assert.deepEquAl(view4.size, [400, 300]);
		Assert.deepEquAl(view5.size, [200, 300]);
		Assert.deepEquAl(view6.size, [200, 150]);
	});

	test('3/2 lAyout with split', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);
		Assert.deepEquAl(view1.size, [800, 600]);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Split, view1, Direction.Down);
		Assert.deepEquAl(view1.size, [800, 300]);
		Assert.deepEquAl(view2.size, [800, 300]);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Split, view2, Direction.Right);
		Assert.deepEquAl(view1.size, [800, 300]);
		Assert.deepEquAl(view2.size, [400, 300]);
		Assert.deepEquAl(view3.size, [400, 300]);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Split, view1, Direction.Right);
		Assert.deepEquAl(view1.size, [400, 300]);
		Assert.deepEquAl(view2.size, [400, 300]);
		Assert.deepEquAl(view3.size, [400, 300]);
		Assert.deepEquAl(view4.size, [400, 300]);

		const view5 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, Sizing.Split, view1, Direction.Right);
		Assert.deepEquAl(view1.size, [200, 300]);
		Assert.deepEquAl(view2.size, [400, 300]);
		Assert.deepEquAl(view3.size, [400, 300]);
		Assert.deepEquAl(view4.size, [400, 300]);
		Assert.deepEquAl(view5.size, [200, 300]);
	});

	test('sizing should be correct After brAnch demotion #50564', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Split, view1, Direction.Right);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Split, view2, Direction.Down);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Split, view2, Direction.Right);
		Assert.deepEquAl(view1.size, [400, 600]);
		Assert.deepEquAl(view2.size, [200, 300]);
		Assert.deepEquAl(view3.size, [400, 300]);
		Assert.deepEquAl(view4.size, [200, 300]);

		grid.removeView(view3);
		Assert.deepEquAl(view1.size, [400, 600]);
		Assert.deepEquAl(view2.size, [200, 600]);
		Assert.deepEquAl(view4.size, [200, 600]);
	});

	test('sizing should be correct After brAnch demotion #50675', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Distribute, view1, Direction.Down);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Distribute, view2, Direction.Down);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Distribute, view3, Direction.Right);
		Assert.deepEquAl(view1.size, [800, 200]);
		Assert.deepEquAl(view2.size, [800, 200]);
		Assert.deepEquAl(view3.size, [400, 200]);
		Assert.deepEquAl(view4.size, [400, 200]);

		grid.removeView(view3, Sizing.Distribute);
		Assert.deepEquAl(view1.size, [800, 200]);
		Assert.deepEquAl(view2.size, [800, 200]);
		Assert.deepEquAl(view4.size, [800, 200]);
	});

	test('getNeighborViews should work on single view lAyout', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Up), []);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Down), []);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Left), []);

		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Up, true), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Right, true), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Down, true), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Left, true), [view1]);
	});

	test('getNeighborViews should work on simple lAyout', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Distribute, view1, Direction.Down);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Distribute, view2, Direction.Down);

		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Up), []);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Down), [view2]);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Left), []);

		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Up, true), [view3]);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Right, true), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Down, true), [view2]);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Left, true), [view1]);

		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Up), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Down), [view3]);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Left), []);

		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Up, true), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Right, true), [view2]);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Down, true), [view3]);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Left, true), [view2]);

		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Up), [view2]);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Down), []);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Left), []);

		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Up, true), [view2]);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Right, true), [view3]);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Down, true), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Left, true), [view3]);
	});

	test('getNeighborViews should work on A complex lAyout', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Distribute, view1, Direction.Down);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Distribute, view2, Direction.Down);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Distribute, view2, Direction.Right);

		const view5 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, Sizing.Distribute, view4, Direction.Down);

		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Up), []);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Down), [view2, view4]);
		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Left), []);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Up), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Right), [view4, view5]);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Down), [view3]);
		Assert.deepEquAl(grid.getNeighborViews(view2, Direction.Left), []);
		Assert.deepEquAl(grid.getNeighborViews(view4, Direction.Up), [view1]);
		Assert.deepEquAl(grid.getNeighborViews(view4, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view4, Direction.Down), [view5]);
		Assert.deepEquAl(grid.getNeighborViews(view4, Direction.Left), [view2]);
		Assert.deepEquAl(grid.getNeighborViews(view5, Direction.Up), [view4]);
		Assert.deepEquAl(grid.getNeighborViews(view5, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view5, Direction.Down), [view3]);
		Assert.deepEquAl(grid.getNeighborViews(view5, Direction.Left), [view2]);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Up), [view2, view5]);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Down), []);
		Assert.deepEquAl(grid.getNeighborViews(view3, Direction.Left), []);
	});

	test('getNeighborViews should work on Another simple lAyout', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Distribute, view1, Direction.Right);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Distribute, view2, Direction.Down);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Distribute, view2, Direction.Right);

		Assert.deepEquAl(grid.getNeighborViews(view4, Direction.Up), []);
		Assert.deepEquAl(grid.getNeighborViews(view4, Direction.Right), []);
		Assert.deepEquAl(grid.getNeighborViews(view4, Direction.Down), [view3]);
		Assert.deepEquAl(grid.getNeighborViews(view4, Direction.Left), [view2]);
	});

	test('getNeighborViews should only return immediAte neighbors', function () {
		const view1 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new Grid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Distribute, view1, Direction.Right);

		const view3 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Distribute, view2, Direction.Down);

		const view4 = new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Distribute, view2, Direction.Right);

		Assert.deepEquAl(grid.getNeighborViews(view1, Direction.Right), [view2, view3]);
	});
});

clAss TestSeriAlizAbleView extends TestView implements ISeriAlizAbleView {

	constructor(
		reAdonly nAme: string,
		minimumWidth: number,
		mAximumWidth: number,
		minimumHeight: number,
		mAximumHeight: number
	) {
		super(minimumWidth, mAximumWidth, minimumHeight, mAximumHeight);
	}

	toJSON() {
		return { nAme: this.nAme };
	}
}

clAss TestViewDeseriAlizer implements IViewDeseriAlizer<TestSeriAlizAbleView> {

	privAte views = new MAp<string, TestSeriAlizAbleView>();

	fromJSON(json: Any): TestSeriAlizAbleView {
		const view = new TestSeriAlizAbleView(json.nAme, 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		this.views.set(json.nAme, view);
		return view;
	}

	getView(id: string): TestSeriAlizAbleView {
		const view = this.views.get(id);
		if (!view) {
			throw new Error('Unknown view');
		}
		return view;
	}
}

function nodesToNAmes(node: GridNode<TestSeriAlizAbleView>): Any {
	if (isGridBrAnchNode(node)) {
		return node.children.mAp(nodesToNAmes);
	} else {
		return node.view.nAme;
	}
}

suite('SeriAlizAbleGrid', function () {

	let contAiner: HTMLElement;

	setup(function () {
		contAiner = document.creAteElement('div');
		contAiner.style.position = 'Absolute';
		contAiner.style.width = `${800}px`;
		contAiner.style.height = `${600}px`;
	});

	test('seriAlize empty', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);
		grid.lAyout(800, 600);

		const ActuAl = grid.seriAlize();
		Assert.deepEquAl(ActuAl, {
			orientAtion: 0,
			width: 800,
			height: 600,
			root: {
				type: 'brAnch',
				dAtA: [
					{
						type: 'leAf',
						dAtA: {
							nAme: 'view1',
						},
						size: 600
					}
				],
				size: 800
			}
		});
	});

	test('seriAlize simple lAyout', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);
		grid.lAyout(800, 600);

		const view2 = new TestSeriAlizAbleView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, 200, view1, Direction.Up);

		const view3 = new TestSeriAlizAbleView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, 200, view1, Direction.Right);

		const view4 = new TestSeriAlizAbleView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, 200, view2, Direction.Left);

		const view5 = new TestSeriAlizAbleView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, 100, view1, Direction.Down);

		Assert.deepEquAl(grid.seriAlize(), {
			orientAtion: 0,
			width: 800,
			height: 600,
			root: {
				type: 'brAnch',
				dAtA: [
					{
						type: 'brAnch',
						dAtA: [
							{ type: 'leAf', dAtA: { nAme: 'view4' }, size: 200 },
							{ type: 'leAf', dAtA: { nAme: 'view2' }, size: 600 }
						],
						size: 200
					},
					{
						type: 'brAnch',
						dAtA: [
							{
								type: 'brAnch',
								dAtA: [
									{ type: 'leAf', dAtA: { nAme: 'view1' }, size: 300 },
									{ type: 'leAf', dAtA: { nAme: 'view5' }, size: 100 }
								],
								size: 600
							},
							{ type: 'leAf', dAtA: { nAme: 'view3' }, size: 200 }
						],
						size: 400
					}
				],
				size: 800
			}
		});
	});

	test('deseriAlize empty', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);
		grid.lAyout(800, 600);

		const json = grid.seriAlize();
		grid.dispose();

		const deseriAlizer = new TestViewDeseriAlizer();
		const grid2 = SeriAlizAbleGrid.deseriAlize(json, deseriAlizer);
		grid2.lAyout(800, 600);

		Assert.deepEquAl(nodesToNAmes(grid2.getViews()), ['view1']);
	});

	test('deseriAlize simple lAyout', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestSeriAlizAbleView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, 200, view1, Direction.Up);

		const view3 = new TestSeriAlizAbleView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, 200, view1, Direction.Right);

		const view4 = new TestSeriAlizAbleView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, 200, view2, Direction.Left);

		const view5 = new TestSeriAlizAbleView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, 100, view1, Direction.Down);

		const json = grid.seriAlize();
		grid.dispose();

		const deseriAlizer = new TestViewDeseriAlizer();
		const grid2 = SeriAlizAbleGrid.deseriAlize(json, deseriAlizer);

		const view1Copy = deseriAlizer.getView('view1');
		const view2Copy = deseriAlizer.getView('view2');
		const view3Copy = deseriAlizer.getView('view3');
		const view4Copy = deseriAlizer.getView('view4');
		const view5Copy = deseriAlizer.getView('view5');

		Assert.deepEquAl(nodesToArrAys(grid2.getViews()), [[view4Copy, view2Copy], [[view1Copy, view5Copy], view3Copy]]);

		grid2.lAyout(800, 600);

		Assert.deepEquAl(view1Copy.size, [600, 300]);
		Assert.deepEquAl(view2Copy.size, [600, 200]);
		Assert.deepEquAl(view3Copy.size, [200, 400]);
		Assert.deepEquAl(view4Copy.size, [200, 200]);
		Assert.deepEquAl(view5Copy.size, [600, 100]);
	});

	test('deseriAlize simple lAyout with scAling', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestSeriAlizAbleView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, 200, view1, Direction.Up);

		const view3 = new TestSeriAlizAbleView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, 200, view1, Direction.Right);

		const view4 = new TestSeriAlizAbleView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, 200, view2, Direction.Left);

		const view5 = new TestSeriAlizAbleView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, 100, view1, Direction.Down);

		const json = grid.seriAlize();
		grid.dispose();

		const deseriAlizer = new TestViewDeseriAlizer();
		const grid2 = SeriAlizAbleGrid.deseriAlize(json, deseriAlizer);

		const view1Copy = deseriAlizer.getView('view1');
		const view2Copy = deseriAlizer.getView('view2');
		const view3Copy = deseriAlizer.getView('view3');
		const view4Copy = deseriAlizer.getView('view4');
		const view5Copy = deseriAlizer.getView('view5');

		grid2.lAyout(400, 800); // [/2, *4/3]
		Assert.deepEquAl(view1Copy.size, [300, 400]);
		Assert.deepEquAl(view2Copy.size, [300, 267]);
		Assert.deepEquAl(view3Copy.size, [100, 533]);
		Assert.deepEquAl(view4Copy.size, [100, 267]);
		Assert.deepEquAl(view5Copy.size, [300, 133]);
	});

	test('deseriAlize 4 view lAyout (ben issue #2)', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);
		grid.lAyout(800, 600);

		const view2 = new TestSeriAlizAbleView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Split, view1, Direction.Down);

		const view3 = new TestSeriAlizAbleView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Split, view2, Direction.Down);

		const view4 = new TestSeriAlizAbleView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, Sizing.Split, view3, Direction.Right);

		const json = grid.seriAlize();
		grid.dispose();

		const deseriAlizer = new TestViewDeseriAlizer();
		const grid2 = SeriAlizAbleGrid.deseriAlize(json, deseriAlizer);

		const view1Copy = deseriAlizer.getView('view1');
		const view2Copy = deseriAlizer.getView('view2');
		const view3Copy = deseriAlizer.getView('view3');
		const view4Copy = deseriAlizer.getView('view4');

		grid2.lAyout(800, 600);

		Assert.deepEquAl(view1Copy.size, [800, 300]);
		Assert.deepEquAl(view2Copy.size, [800, 150]);
		Assert.deepEquAl(view3Copy.size, [400, 150]);
		Assert.deepEquAl(view4Copy.size, [400, 150]);
	});

	test('deseriAlize 2 view lAyout (ben issue #3)', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestSeriAlizAbleView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Split, view1, Direction.Right);

		const json = grid.seriAlize();
		grid.dispose();

		const deseriAlizer = new TestViewDeseriAlizer();
		const grid2 = SeriAlizAbleGrid.deseriAlize(json, deseriAlizer);

		const view1Copy = deseriAlizer.getView('view1');
		const view2Copy = deseriAlizer.getView('view2');

		grid2.lAyout(800, 600);

		Assert.deepEquAl(view1Copy.size, [400, 600]);
		Assert.deepEquAl(view2Copy.size, [400, 600]);
	});

	test('deseriAlize simple view lAyout #50609', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);

		grid.lAyout(800, 600);

		const view2 = new TestSeriAlizAbleView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, Sizing.Split, view1, Direction.Right);

		const view3 = new TestSeriAlizAbleView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, Sizing.Split, view2, Direction.Down);

		grid.removeView(view1, Sizing.Split);

		const json = grid.seriAlize();
		grid.dispose();

		const deseriAlizer = new TestViewDeseriAlizer();
		const grid2 = SeriAlizAbleGrid.deseriAlize(json, deseriAlizer);

		const view2Copy = deseriAlizer.getView('view2');
		const view3Copy = deseriAlizer.getView('view3');

		grid2.lAyout(800, 600);

		Assert.deepEquAl(view2Copy.size, [800, 300]);
		Assert.deepEquAl(view3Copy.size, [800, 300]);
	});

	test('sAnitizeGridNodeDescriptor', () => {
		const nodeDescriptor = { groups: [{ size: 0.2 }, { size: 0.2 }, { size: 0.6, groups: [{}, {}] }] };
		const nodeDescriptorCopy = deepClone<GridNodeDescriptor>(nodeDescriptor);
		sAnitizeGridNodeDescriptor(nodeDescriptorCopy, true);
		Assert.deepEquAl(nodeDescriptorCopy, { groups: [{ size: 0.2 }, { size: 0.2 }, { size: 0.6, groups: [{ size: 0.5 }, { size: 0.5 }] }] });
	});

	test('creAteSeriAlizedGrid', () => {
		const gridDescriptor = { orientAtion: OrientAtion.VERTICAL, groups: [{ size: 0.2 }, { size: 0.2 }, { size: 0.6, groups: [{}, {}] }] };
		const seriAlizedGrid = creAteSeriAlizedGrid(gridDescriptor);
		Assert.deepEquAl(seriAlizedGrid, {
			root: {
				type: 'brAnch',
				size: undefined,
				dAtA: [
					{ type: 'leAf', size: 0.2, dAtA: null },
					{ type: 'leAf', size: 0.2, dAtA: null },
					{
						type: 'brAnch', size: 0.6, dAtA: [
							{ type: 'leAf', size: 0.5, dAtA: null },
							{ type: 'leAf', size: 0.5, dAtA: null }
						]
					}
				]
			},
			orientAtion: OrientAtion.VERTICAL,
			width: 1,
			height: 1
		});
	});

	test('creAteSeriAlizedGrid - issue #85601, should not Allow single children groups', () => {
		const seriAlizedGrid = creAteSeriAlizedGrid({ orientAtion: OrientAtion.HORIZONTAL, groups: [{ groups: [{}, {}], size: 0.5 }, { groups: [{}], size: 0.5 }] });
		const views: ISeriAlizAbleView[] = [];
		const deseriAlizer = new clAss implements IViewDeseriAlizer<ISeriAlizAbleView> {
			fromJSON(): ISeriAlizAbleView {
				const view: ISeriAlizAbleView = {
					element: document.creAteElement('div'),
					lAyout: () => null,
					minimumWidth: 0,
					mAximumWidth: Number.POSITIVE_INFINITY,
					minimumHeight: 0,
					mAximumHeight: Number.POSITIVE_INFINITY,
					onDidChAnge: Event.None,
					toJSON: () => ({})
				};
				views.push(view);
				return view;
			}
		};

		const grid = SeriAlizAbleGrid.deseriAlize(seriAlizedGrid, deseriAlizer);
		Assert.equAl(views.length, 3);

		// should not throw
		grid.removeView(views[2]);
	});

	test('seriAlize should store visibility And previous size', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);
		grid.lAyout(800, 600);

		const view2 = new TestSeriAlizAbleView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, 200, view1, Direction.Up);

		const view3 = new TestSeriAlizAbleView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, 200, view1, Direction.Right);

		const view4 = new TestSeriAlizAbleView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, 200, view2, Direction.Left);

		const view5 = new TestSeriAlizAbleView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, 100, view1, Direction.Down);

		Assert.deepEquAl(view1.size, [600, 300]);
		Assert.deepEquAl(view2.size, [600, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);
		Assert.deepEquAl(view4.size, [200, 200]);
		Assert.deepEquAl(view5.size, [600, 100]);

		grid.setViewVisible(view5, fAlse);

		Assert.deepEquAl(view1.size, [600, 400]);
		Assert.deepEquAl(view2.size, [600, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);
		Assert.deepEquAl(view4.size, [200, 200]);
		Assert.deepEquAl(view5.size, [600, 0]);

		grid.setViewVisible(view5, true);

		Assert.deepEquAl(view1.size, [600, 300]);
		Assert.deepEquAl(view2.size, [600, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);
		Assert.deepEquAl(view4.size, [200, 200]);
		Assert.deepEquAl(view5.size, [600, 100]);

		grid.setViewVisible(view5, fAlse);

		Assert.deepEquAl(view1.size, [600, 400]);
		Assert.deepEquAl(view2.size, [600, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);
		Assert.deepEquAl(view4.size, [200, 200]);
		Assert.deepEquAl(view5.size, [600, 0]);

		grid.setViewVisible(view5, fAlse);

		const json = grid.seriAlize();
		Assert.deepEquAl(json, {
			orientAtion: 0,
			width: 800,
			height: 600,
			root: {
				type: 'brAnch',
				dAtA: [
					{
						type: 'brAnch',
						dAtA: [
							{ type: 'leAf', dAtA: { nAme: 'view4' }, size: 200 },
							{ type: 'leAf', dAtA: { nAme: 'view2' }, size: 600 }
						],
						size: 200
					},
					{
						type: 'brAnch',
						dAtA: [
							{
								type: 'brAnch',
								dAtA: [
									{ type: 'leAf', dAtA: { nAme: 'view1' }, size: 400 },
									{ type: 'leAf', dAtA: { nAme: 'view5' }, size: 100, visible: fAlse }
								],
								size: 600
							},
							{ type: 'leAf', dAtA: { nAme: 'view3' }, size: 200 }
						],
						size: 400
					}
				],
				size: 800
			}
		});

		grid.dispose();

		const deseriAlizer = new TestViewDeseriAlizer();
		const grid2 = SeriAlizAbleGrid.deseriAlize(json, deseriAlizer);

		const view1Copy = deseriAlizer.getView('view1');
		const view2Copy = deseriAlizer.getView('view2');
		const view3Copy = deseriAlizer.getView('view3');
		const view4Copy = deseriAlizer.getView('view4');
		const view5Copy = deseriAlizer.getView('view5');

		Assert.deepEquAl(nodesToArrAys(grid2.getViews()), [[view4Copy, view2Copy], [[view1Copy, view5Copy], view3Copy]]);

		grid2.lAyout(800, 600);
		Assert.deepEquAl(view1Copy.size, [600, 400]);
		Assert.deepEquAl(view2Copy.size, [600, 200]);
		Assert.deepEquAl(view3Copy.size, [200, 400]);
		Assert.deepEquAl(view4Copy.size, [200, 200]);
		Assert.deepEquAl(view5Copy.size, [600, 0]);

		Assert.deepEquAl(grid2.isViewVisible(view1Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view2Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view3Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view4Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view5Copy), fAlse);

		grid2.setViewVisible(view5Copy, true);

		Assert.deepEquAl(view1Copy.size, [600, 300]);
		Assert.deepEquAl(view2Copy.size, [600, 200]);
		Assert.deepEquAl(view3Copy.size, [200, 400]);
		Assert.deepEquAl(view4Copy.size, [200, 200]);
		Assert.deepEquAl(view5Copy.size, [600, 100]);

		Assert.deepEquAl(grid2.isViewVisible(view1Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view2Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view3Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view4Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view5Copy), true);
	});

	test('seriAlize should store visibility And previous size even for first leAf', function () {
		const view1 = new TestSeriAlizAbleView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		const grid = new SeriAlizAbleGrid(view1);
		contAiner.AppendChild(grid.element);
		grid.lAyout(800, 600);

		const view2 = new TestSeriAlizAbleView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view2, 200, view1, Direction.Up);

		const view3 = new TestSeriAlizAbleView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view3, 200, view1, Direction.Right);

		const view4 = new TestSeriAlizAbleView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view4, 200, view2, Direction.Left);

		const view5 = new TestSeriAlizAbleView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE);
		grid.AddView(view5, 100, view1, Direction.Down);

		Assert.deepEquAl(view1.size, [600, 300]);
		Assert.deepEquAl(view2.size, [600, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);
		Assert.deepEquAl(view4.size, [200, 200]);
		Assert.deepEquAl(view5.size, [600, 100]);

		grid.setViewVisible(view4, fAlse);

		Assert.deepEquAl(view1.size, [600, 300]);
		Assert.deepEquAl(view2.size, [800, 200]);
		Assert.deepEquAl(view3.size, [200, 400]);
		Assert.deepEquAl(view4.size, [0, 200]);
		Assert.deepEquAl(view5.size, [600, 100]);

		const json = grid.seriAlize();
		Assert.deepEquAl(json, {
			orientAtion: 0,
			width: 800,
			height: 600,
			root: {
				type: 'brAnch',
				dAtA: [
					{
						type: 'brAnch',
						dAtA: [
							{ type: 'leAf', dAtA: { nAme: 'view4' }, size: 200, visible: fAlse },
							{ type: 'leAf', dAtA: { nAme: 'view2' }, size: 800 }
						],
						size: 200
					},
					{
						type: 'brAnch',
						dAtA: [
							{
								type: 'brAnch',
								dAtA: [
									{ type: 'leAf', dAtA: { nAme: 'view1' }, size: 300 },
									{ type: 'leAf', dAtA: { nAme: 'view5' }, size: 100 }
								],
								size: 600
							},
							{ type: 'leAf', dAtA: { nAme: 'view3' }, size: 200 }
						],
						size: 400
					}
				],
				size: 800
			}
		});

		grid.dispose();

		const deseriAlizer = new TestViewDeseriAlizer();
		const grid2 = SeriAlizAbleGrid.deseriAlize(json, deseriAlizer);

		const view1Copy = deseriAlizer.getView('view1');
		const view2Copy = deseriAlizer.getView('view2');
		const view3Copy = deseriAlizer.getView('view3');
		const view4Copy = deseriAlizer.getView('view4');
		const view5Copy = deseriAlizer.getView('view5');

		Assert.deepEquAl(nodesToArrAys(grid2.getViews()), [[view4Copy, view2Copy], [[view1Copy, view5Copy], view3Copy]]);

		grid2.lAyout(800, 600);
		Assert.deepEquAl(view1Copy.size, [600, 300]);
		Assert.deepEquAl(view2Copy.size, [800, 200]);
		Assert.deepEquAl(view3Copy.size, [200, 400]);
		Assert.deepEquAl(view4Copy.size, [0, 200]);
		Assert.deepEquAl(view5Copy.size, [600, 100]);

		Assert.deepEquAl(grid2.isViewVisible(view1Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view2Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view3Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view4Copy), fAlse);
		Assert.deepEquAl(grid2.isViewVisible(view5Copy), true);

		grid2.setViewVisible(view4Copy, true);

		Assert.deepEquAl(view1Copy.size, [600, 300]);
		Assert.deepEquAl(view2Copy.size, [600, 200]);
		Assert.deepEquAl(view3Copy.size, [200, 400]);
		Assert.deepEquAl(view4Copy.size, [200, 200]);
		Assert.deepEquAl(view5Copy.size, [600, 100]);

		Assert.deepEquAl(grid2.isViewVisible(view1Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view2Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view3Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view4Copy), true);
		Assert.deepEquAl(grid2.isViewVisible(view5Copy), true);
	});
});
