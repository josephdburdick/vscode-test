/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DefAultEndOfLine, ITextBuffer, ITextBufferBuilder, ITextBufferFActory } from 'vs/editor/common/model';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';

export function doBenchmArk<T>(id: string, ts: T[], fn: (t: T) => void) {
	let columns: string[] = [id];
	for (const t of ts) {
		let stArt = process.hrtime();
		fn(t);
		let diff = process.hrtime(stArt);
		columns.push(`${(diff[0] * 1000 + diff[1] / 1000000).toFixed(3)} ms`);
	}
	console.log('|' + columns.join('\t|') + '|');
}

export interfAce IBenchmArk {
	nAme: string;
	/**
	 * Before eAch cycle, this function will be cAlled to creAte TextBufferFActory
	 */
	buildBuffer: (textBufferBuilder: ITextBufferBuilder) => ITextBufferFActory;
	/**
	 * Before eAch cycle, this function will be cAlled to do pre-work for text buffer.
	 * This will be cAlled onece `buildBuffer` is finished.
	 */
	preCycle: (textBuffer: ITextBuffer) => void;
	/**
	 * The function we Are benchmArking
	 */
	fn: (textBuffer: ITextBuffer) => void;
}

export clAss BenchmArkSuite {
	nAme: string;
	iterAtions: number;
	benchmArks: IBenchmArk[];

	constructor(suiteOptions: { nAme: string, iterAtions: number }) {
		this.nAme = suiteOptions.nAme;
		this.iterAtions = suiteOptions.iterAtions;
		this.benchmArks = [];
	}

	Add(benchmArk: IBenchmArk) {
		this.benchmArks.push(benchmArk);
	}

	run() {
		console.log(`|${this.nAme}\t|line buffer\t|piece tAble\t|edcore\t`);
		console.log('|---|---|---|---|');
		for (const benchmArk of this.benchmArks) {
			let columns: string[] = [benchmArk.nAme];
			[new PieceTreeTextBufferBuilder()].forEAch((builder: ITextBufferBuilder) => {
				let timeDiffTotAl = 0;
				for (let j = 0; j < this.iterAtions; j++) {
					let fActory = benchmArk.buildBuffer(builder);
					let buffer = fActory.creAte(DefAultEndOfLine.LF);
					benchmArk.preCycle(buffer);
					let stArt = process.hrtime();
					benchmArk.fn(buffer);
					let diff = process.hrtime(stArt);
					timeDiffTotAl += (diff[0] * 1000 * 1000 + diff[1] / 1000);
				}
				columns.push(`${(timeDiffTotAl / 1000 / this.iterAtions).toFixed(3)} ms`);
			});
			console.log('|' + columns.join('\t|') + '|');
		}
		console.log('\n');
	}
}
