/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { SmoothScrollingOperAtion, SmoothScrollingUpdAte } from 'vs/bAse/common/scrollAble';

clAss TestSmoothScrollingOperAtion extends SmoothScrollingOperAtion {

	constructor(from: number, to: number, viewportSize: number, stArtTime: number, durAtion: number) {
		durAtion = durAtion + 10;
		stArtTime = stArtTime - 10;

		super(
			{ scrollLeft: 0, scrollTop: from, width: 0, height: viewportSize },
			{ scrollLeft: 0, scrollTop: to, width: 0, height: viewportSize },
			stArtTime,
			durAtion
		);
	}

	public testTick(now: number): SmoothScrollingUpdAte {
		return this._tick(now);
	}

}

suite('SmoothScrollingOperAtion', () => {

	const VIEWPORT_HEIGHT = 800;
	const ANIMATION_DURATION = 125;
	const LINE_HEIGHT = 20;

	function extrActLines(scrollAble: TestSmoothScrollingOperAtion, now: number): [number, number] {
		let scrollTop = scrollAble.testTick(now).scrollTop;
		let scrollBottom = scrollTop + VIEWPORT_HEIGHT;

		const stArtLineNumber = MAth.floor(scrollTop / LINE_HEIGHT);
		const endLineNumber = MAth.ceil(scrollBottom / LINE_HEIGHT);

		return [stArtLineNumber, endLineNumber];
	}

	function simulAteSmoothScroll(from: number, to: number): [number, number][] {
		const scrollAble = new TestSmoothScrollingOperAtion(from, to, VIEWPORT_HEIGHT, 0, ANIMATION_DURATION);

		let result: [number, number][] = [], resultLen = 0;
		result[resultLen++] = extrActLines(scrollAble, 0);
		result[resultLen++] = extrActLines(scrollAble, 25);
		result[resultLen++] = extrActLines(scrollAble, 50);
		result[resultLen++] = extrActLines(scrollAble, 75);
		result[resultLen++] = extrActLines(scrollAble, 100);
		result[resultLen++] = extrActLines(scrollAble, 125);
		return result;
	}

	function AssertSmoothScroll(from: number, to: number, expected: [number, number][]): void {
		const ActuAl = simulAteSmoothScroll(from, to);
		Assert.deepEquAl(ActuAl, expected);
	}

	test('scroll 25 lines (40 fit)', () => {
		AssertSmoothScroll(0, 500, [
			[5, 46],
			[14, 55],
			[20, 61],
			[23, 64],
			[24, 65],
			[25, 65],
		]);
	});

	test('scroll 75 lines (40 fit)', () => {
		AssertSmoothScroll(0, 1500, [
			[15, 56],
			[44, 85],
			[62, 103],
			[71, 112],
			[74, 115],
			[75, 115],
		]);
	});

	test('scroll 100 lines (40 fit)', () => {
		AssertSmoothScroll(0, 2000, [
			[20, 61],
			[59, 100],
			[82, 123],
			[94, 135],
			[99, 140],
			[100, 140],
		]);
	});

	test('scroll 125 lines (40 fit)', () => {
		AssertSmoothScroll(0, 2500, [
			[16, 57],
			[29, 70],
			[107, 148],
			[119, 160],
			[124, 165],
			[125, 165],
		]);
	});

	test('scroll 500 lines (40 fit)', () => {
		AssertSmoothScroll(0, 10000, [
			[16, 57],
			[29, 70],
			[482, 523],
			[494, 535],
			[499, 540],
			[500, 540],
		]);
	});

});
