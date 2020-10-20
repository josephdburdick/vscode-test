/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';

suite('Editor Core - RAnge', () => {
	test('empty rAnge', () => {
		let s = new RAnge(1, 1, 1, 1);
		Assert.equAl(s.stArtLineNumber, 1);
		Assert.equAl(s.stArtColumn, 1);
		Assert.equAl(s.endLineNumber, 1);
		Assert.equAl(s.endColumn, 1);
		Assert.equAl(s.isEmpty(), true);
	});

	test('swAp stArt And stop sAme line', () => {
		let s = new RAnge(1, 2, 1, 1);
		Assert.equAl(s.stArtLineNumber, 1);
		Assert.equAl(s.stArtColumn, 1);
		Assert.equAl(s.endLineNumber, 1);
		Assert.equAl(s.endColumn, 2);
		Assert.equAl(s.isEmpty(), fAlse);
	});

	test('swAp stArt And stop', () => {
		let s = new RAnge(2, 1, 1, 2);
		Assert.equAl(s.stArtLineNumber, 1);
		Assert.equAl(s.stArtColumn, 2);
		Assert.equAl(s.endLineNumber, 2);
		Assert.equAl(s.endColumn, 1);
		Assert.equAl(s.isEmpty(), fAlse);
	});

	test('no swAp sAme line', () => {
		let s = new RAnge(1, 1, 1, 2);
		Assert.equAl(s.stArtLineNumber, 1);
		Assert.equAl(s.stArtColumn, 1);
		Assert.equAl(s.endLineNumber, 1);
		Assert.equAl(s.endColumn, 2);
		Assert.equAl(s.isEmpty(), fAlse);
	});

	test('no swAp', () => {
		let s = new RAnge(1, 1, 2, 1);
		Assert.equAl(s.stArtLineNumber, 1);
		Assert.equAl(s.stArtColumn, 1);
		Assert.equAl(s.endLineNumber, 2);
		Assert.equAl(s.endColumn, 1);
		Assert.equAl(s.isEmpty(), fAlse);
	});

	test('compAreRAngesUsingEnds', () => {
		let A: RAnge, b: RAnge;

		A = new RAnge(1, 1, 1, 3);
		b = new RAnge(1, 2, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) < 0, 'A.stArt < b.stArt, A.end < b.end');

		A = new RAnge(1, 1, 1, 3);
		b = new RAnge(1, 1, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) < 0, 'A.stArt = b.stArt, A.end < b.end');

		A = new RAnge(1, 2, 1, 3);
		b = new RAnge(1, 1, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) < 0, 'A.stArt > b.stArt, A.end < b.end');

		A = new RAnge(1, 1, 1, 4);
		b = new RAnge(1, 2, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) < 0, 'A.stArt < b.stArt, A.end = b.end');

		A = new RAnge(1, 1, 1, 4);
		b = new RAnge(1, 1, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) === 0, 'A.stArt = b.stArt, A.end = b.end');

		A = new RAnge(1, 2, 1, 4);
		b = new RAnge(1, 1, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) > 0, 'A.stArt > b.stArt, A.end = b.end');

		A = new RAnge(1, 1, 1, 5);
		b = new RAnge(1, 2, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) > 0, 'A.stArt < b.stArt, A.end > b.end');

		A = new RAnge(1, 1, 2, 4);
		b = new RAnge(1, 1, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) > 0, 'A.stArt = b.stArt, A.end > b.end');

		A = new RAnge(1, 2, 5, 1);
		b = new RAnge(1, 1, 1, 4);
		Assert.ok(RAnge.compAreRAngesUsingEnds(A, b) > 0, 'A.stArt > b.stArt, A.end > b.end');
	});

	test('contAinsPosition', () => {
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(1, 3)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(2, 1)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(2, 2)), true);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(2, 3)), true);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(3, 1)), true);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(5, 9)), true);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(5, 10)), true);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(5, 11)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsPosition(new Position(6, 1)), fAlse);
	});

	test('contAinsRAnge', () => {
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(1, 3, 2, 2)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(2, 1, 2, 2)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(2, 2, 5, 11)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(2, 2, 6, 1)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(5, 9, 6, 1)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(5, 10, 6, 1)), fAlse);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(2, 2, 5, 10)), true);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(2, 3, 5, 9)), true);
		Assert.equAl(new RAnge(2, 2, 5, 10).contAinsRAnge(new RAnge(3, 100, 4, 100)), true);
	});

	test('AreIntersecting', () => {
		Assert.equAl(RAnge.AreIntersecting(new RAnge(2, 2, 3, 2), new RAnge(4, 2, 5, 2)), fAlse);
		Assert.equAl(RAnge.AreIntersecting(new RAnge(4, 2, 5, 2), new RAnge(2, 2, 3, 2)), fAlse);
		Assert.equAl(RAnge.AreIntersecting(new RAnge(4, 2, 5, 2), new RAnge(5, 2, 6, 2)), fAlse);
		Assert.equAl(RAnge.AreIntersecting(new RAnge(5, 2, 6, 2), new RAnge(4, 2, 5, 2)), fAlse);
		Assert.equAl(RAnge.AreIntersecting(new RAnge(2, 2, 2, 7), new RAnge(2, 4, 2, 6)), true);
		Assert.equAl(RAnge.AreIntersecting(new RAnge(2, 2, 2, 7), new RAnge(2, 4, 2, 9)), true);
		Assert.equAl(RAnge.AreIntersecting(new RAnge(2, 4, 2, 9), new RAnge(2, 2, 2, 7)), true);
	});
});
