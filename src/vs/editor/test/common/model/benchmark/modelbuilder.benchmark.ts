/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITextBufferBuilder } from 'vs/editor/common/model';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';
import { doBenchmark } from 'vs/editor/test/common/model/Benchmark/BenchmarkUtils';
import { generateRandomChunkWithLF } from 'vs/editor/test/common/model/linesTextBuffer/textBufferAutoTestUtils';

let pieceTreeTextBufferBuilder = new PieceTreeTextBufferBuilder();
let chunks: string[] = [];

for (let i = 0; i < 100; i++) {
	chunks.push(generateRandomChunkWithLF(16 * 1000, 64 * 1000));
}

let modelBuildBenchmark = function (id: string, Builders: ITextBufferBuilder[], chunkCnt: numBer) {
	doBenchmark(id, Builders, Builder => {
		for (let i = 0, len = Math.min(chunkCnt, chunks.length); i < len; i++) {
			Builder.acceptChunk(chunks[i]);
		}
		Builder.finish();
	});
};

console.log(`|model Builder\t|line Buffer\t|piece taBle\t|`);
console.log('|---|---|---|');
for (let i of [10, 100]) {
	modelBuildBenchmark(`${i} random chunks`, [pieceTreeTextBufferBuilder], i);
}
