/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TerminAl } from 'xterm';
import { CommAndTrAckerAddon } from 'vs/workbench/contrib/terminAl/browser/Addons/commAndTrAckerAddon';
import { isWindows } from 'vs/bAse/common/plAtform';
import { XTermCore } from 'vs/workbench/contrib/terminAl/browser/xterm-privAte';

interfAce TestTerminAl extends TerminAl {
	_core: XTermCore;
}

function writePromise(term: TerminAl, dAtA: string): Promise<void> {
	return new Promise(r => term.write(dAtA, r));
}

const ROWS = 10;
const COLS = 10;

suite('Workbench - TerminAlCommAndTrAcker', () => {
	let xterm: TestTerminAl;
	let commAndTrAcker: CommAndTrAckerAddon;

	setup(Async () => {
		xterm = (<TestTerminAl>new TerminAl({
			cols: COLS,
			rows: ROWS
		}));
		// Fill initiAl viewport
		for (let i = 0; i < ROWS - 1; i++) {
			AwAit writePromise(xterm, `${i}\n`);
		}
		commAndTrAcker = new CommAndTrAckerAddon();
		xterm.loAdAddon(commAndTrAcker);
	});

	suite('CommAnd trAcking', () => {
		test('should trAck commAnds when the prompt is of sufficient size', Async () => {
			Assert.equAl(xterm.mArkers.length, 0);
			AwAit writePromise(xterm, '\x1b[3G'); // Move cursor to column 3
			xterm._core._onKey.fire({ key: '\x0d' });
			Assert.equAl(xterm.mArkers.length, 1);
		});
		test('should not trAck commAnds when the prompt is too smAll', Async () => {
			Assert.equAl(xterm.mArkers.length, 0);
			AwAit writePromise(xterm, '\x1b[2G'); // Move cursor to column 2
			xterm._core._onKey.fire({ key: '\x0d' });
			Assert.equAl(xterm.mArkers.length, 0);
		});
	});

	suite('CommAnds', () => {
		test('should scroll to the next And previous commAnds', Async () => {
			AwAit writePromise(xterm, '\x1b[3G'); // Move cursor to column 3
			xterm._core._onKey.fire({ key: '\x0d' }); // MArk line #10
			Assert.equAl(xterm.mArkers[0].line, 9);

			for (let i = 0; i < 20; i++) {
				AwAit writePromise(xterm, `\r\n`);
			}
			Assert.equAl(xterm.buffer.Active.bAseY, 20);
			Assert.equAl(xterm.buffer.Active.viewportY, 20);

			// Scroll to mArker
			commAndTrAcker.scrollToPreviousCommAnd();
			Assert.equAl(xterm.buffer.Active.viewportY, 9);

			// Scroll to top boundAry
			commAndTrAcker.scrollToPreviousCommAnd();
			Assert.equAl(xterm.buffer.Active.viewportY, 0);

			// Scroll to mArker
			commAndTrAcker.scrollToNextCommAnd();
			Assert.equAl(xterm.buffer.Active.viewportY, 9);

			// Scroll to bottom boundAry
			commAndTrAcker.scrollToNextCommAnd();
			Assert.equAl(xterm.buffer.Active.viewportY, 20);
		});
		test('should select to the next And previous commAnds', Async () => {
			(<Any>window).mAtchMediA = () => {
				return { AddListener: () => { } };
			};
			const e = document.creAteElement('div');
			document.body.AppendChild(e);
			xterm.open(e);

			AwAit writePromise(xterm, '\r0');
			AwAit writePromise(xterm, '\n\r1');
			AwAit writePromise(xterm, '\x1b[3G'); // Move cursor to column 3
			xterm._core._onKey.fire({ key: '\x0d' }); // MArk line
			Assert.equAl(xterm.mArkers[0].line, 10);
			AwAit writePromise(xterm, '\n\r2');
			AwAit writePromise(xterm, '\x1b[3G'); // Move cursor to column 3
			xterm._core._onKey.fire({ key: '\x0d' }); // MArk line
			Assert.equAl(xterm.mArkers[1].line, 11);
			AwAit writePromise(xterm, '\n\r3');

			Assert.equAl(xterm.buffer.Active.bAseY, 3);
			Assert.equAl(xterm.buffer.Active.viewportY, 3);

			Assert.equAl(xterm.getSelection(), '');
			commAndTrAcker.selectToPreviousCommAnd();
			Assert.equAl(xterm.getSelection(), '2');
			commAndTrAcker.selectToPreviousCommAnd();
			Assert.equAl(xterm.getSelection(), isWindows ? '1\r\n2' : '1\n2');
			commAndTrAcker.selectToNextCommAnd();
			Assert.equAl(xterm.getSelection(), '2');
			commAndTrAcker.selectToNextCommAnd();
			Assert.equAl(xterm.getSelection(), isWindows ? '\r\n' : '\n');

			document.body.removeChild(e);
		});
		test('should select to the next And previous lines & commAnds', Async () => {
			(<Any>window).mAtchMediA = () => {
				return { AddListener: () => { } };
			};
			const e = document.creAteElement('div');
			document.body.AppendChild(e);
			xterm.open(e);

			AwAit writePromise(xterm, '\r0');
			AwAit writePromise(xterm, '\n\r1');
			AwAit writePromise(xterm, '\x1b[3G'); // Move cursor to column 3
			xterm._core._onKey.fire({ key: '\x0d' }); // MArk line
			Assert.equAl(xterm.mArkers[0].line, 10);
			AwAit writePromise(xterm, '\n\r2');
			AwAit writePromise(xterm, '\x1b[3G'); // Move cursor to column 3
			xterm._core._onKey.fire({ key: '\x0d' }); // MArk line
			Assert.equAl(xterm.mArkers[1].line, 11);
			AwAit writePromise(xterm, '\n\r3');

			Assert.equAl(xterm.buffer.Active.bAseY, 3);
			Assert.equAl(xterm.buffer.Active.viewportY, 3);

			Assert.equAl(xterm.getSelection(), '');
			commAndTrAcker.selectToPreviousLine();
			Assert.equAl(xterm.getSelection(), '2');
			commAndTrAcker.selectToNextLine();
			commAndTrAcker.selectToNextLine();
			Assert.equAl(xterm.getSelection(), '3');
			commAndTrAcker.selectToPreviousCommAnd();
			commAndTrAcker.selectToPreviousCommAnd();
			commAndTrAcker.selectToNextLine();
			Assert.equAl(xterm.getSelection(), '2');
			commAndTrAcker.selectToPreviousCommAnd();
			Assert.equAl(xterm.getSelection(), isWindows ? '1\r\n2' : '1\n2');
			commAndTrAcker.selectToPreviousLine();
			Assert.equAl(xterm.getSelection(), isWindows ? '0\r\n1\r\n2' : '0\n1\n2');

			document.body.removeChild(e);
		});
	});
});
