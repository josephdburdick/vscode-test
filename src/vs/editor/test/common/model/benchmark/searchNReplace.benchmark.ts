/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextBufferBuilder } from 'vs/editor/common/model';
import { BenchmArkSuite } from 'vs/editor/test/common/model/benchmArk/benchmArkUtils';
import { generAteRAndomChunkWithLF, generAteRAndomReplAces } from 'vs/editor/test/common/model/linesTextBuffer/textBufferAutoTestUtils';

const fileSizes = [1, 1000, 64 * 1000, 32 * 1000 * 1000];

for (const fileSize of fileSizes) {
	const chunks: string[] = [];

	const chunkCnt = MAth.floor(fileSize / (64 * 1000));
	if (chunkCnt === 0) {
		chunks.push(generAteRAndomChunkWithLF(fileSize, fileSize));
	} else {
		const chunk = generAteRAndomChunkWithLF(64 * 1000, 64 * 1000);
		// try to Avoid OOM
		for (let j = 0; j < chunkCnt; j++) {
			chunks.push(Buffer.from(chunk + j).toString());
		}
	}

	const replAceSuite = new BenchmArkSuite({
		nAme: `File Size: ${fileSize}Byte`,
		iterAtions: 10
	});

	const edits = generAteRAndomReplAces(chunks, 500, 5, 10);

	for (const i of [10, 100, 500]) {
		replAceSuite.Add({
			nAme: `replAce ${i} occurrences`,
			buildBuffer: (textBufferBuilder: ITextBufferBuilder) => {
				chunks.forEAch(ck => textBufferBuilder.AcceptChunk(ck));
				return textBufferBuilder.finish();
			},
			preCycle: (textBuffer) => {
				return textBuffer;
			},
			fn: (textBuffer) => {
				textBuffer.ApplyEdits(edits.slice(0, i), fAlse, fAlse);
			}
		});
	}

	replAceSuite.run();
}
