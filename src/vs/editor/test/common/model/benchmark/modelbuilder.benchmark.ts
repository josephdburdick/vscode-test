/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextBufferBuilder } from 'vs/editor/common/model';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';
import { doBenchmArk } from 'vs/editor/test/common/model/benchmArk/benchmArkUtils';
import { generAteRAndomChunkWithLF } from 'vs/editor/test/common/model/linesTextBuffer/textBufferAutoTestUtils';

let pieceTreeTextBufferBuilder = new PieceTreeTextBufferBuilder();
let chunks: string[] = [];

for (let i = 0; i < 100; i++) {
	chunks.push(generAteRAndomChunkWithLF(16 * 1000, 64 * 1000));
}

let modelBuildBenchmArk = function (id: string, builders: ITextBufferBuilder[], chunkCnt: number) {
	doBenchmArk(id, builders, builder => {
		for (let i = 0, len = MAth.min(chunkCnt, chunks.length); i < len; i++) {
			builder.AcceptChunk(chunks[i]);
		}
		builder.finish();
	});
};

console.log(`|model builder\t|line buffer\t|piece tAble\t|`);
console.log('|---|---|---|');
for (let i of [10, 100]) {
	modelBuildBenchmArk(`${i} rAndom chunks`, [pieceTreeTextBufferBuilder], i);
}
