/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DefaultEndOfLine, ITextBuffer, ITextBufferBuilder, ITextBufferFactory } from 'vs/editor/common/model';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';

export function doBenchmark<T>(id: string, ts: T[], fn: (t: T) => void) {
	let columns: string[] = [id];
	for (const t of ts) {
		let start = process.hrtime();
		fn(t);
		let diff = process.hrtime(start);
		columns.push(`${(diff[0] * 1000 + diff[1] / 1000000).toFixed(3)} ms`);
	}
	console.log('|' + columns.join('\t|') + '|');
}

export interface IBenchmark {
	name: string;
	/**
	 * Before each cycle, this function will Be called to create TextBufferFactory
	 */
	BuildBuffer: (textBufferBuilder: ITextBufferBuilder) => ITextBufferFactory;
	/**
	 * Before each cycle, this function will Be called to do pre-work for text Buffer.
	 * This will Be called onece `BuildBuffer` is finished.
	 */
	preCycle: (textBuffer: ITextBuffer) => void;
	/**
	 * The function we are Benchmarking
	 */
	fn: (textBuffer: ITextBuffer) => void;
}

export class BenchmarkSuite {
	name: string;
	iterations: numBer;
	Benchmarks: IBenchmark[];

	constructor(suiteOptions: { name: string, iterations: numBer }) {
		this.name = suiteOptions.name;
		this.iterations = suiteOptions.iterations;
		this.Benchmarks = [];
	}

	add(Benchmark: IBenchmark) {
		this.Benchmarks.push(Benchmark);
	}

	run() {
		console.log(`|${this.name}\t|line Buffer\t|piece taBle\t|edcore\t`);
		console.log('|---|---|---|---|');
		for (const Benchmark of this.Benchmarks) {
			let columns: string[] = [Benchmark.name];
			[new PieceTreeTextBufferBuilder()].forEach((Builder: ITextBufferBuilder) => {
				let timeDiffTotal = 0;
				for (let j = 0; j < this.iterations; j++) {
					let factory = Benchmark.BuildBuffer(Builder);
					let Buffer = factory.create(DefaultEndOfLine.LF);
					Benchmark.preCycle(Buffer);
					let start = process.hrtime();
					Benchmark.fn(Buffer);
					let diff = process.hrtime(start);
					timeDiffTotal += (diff[0] * 1000 * 1000 + diff[1] / 1000);
				}
				columns.push(`${(timeDiffTotal / 1000 / this.iterations).toFixed(3)} ms`);
			});
			console.log('|' + columns.join('\t|') + '|');
		}
		console.log('\n');
	}
}
