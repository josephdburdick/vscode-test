/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { VSBuffer, BufferToReadaBle, readaBleToBuffer, BufferToStream, streamToBuffer, newWriteaBleBufferStream, BufferedStreamToBuffer } from 'vs/Base/common/Buffer';
import { timeout } from 'vs/Base/common/async';
import { peekStream } from 'vs/Base/common/stream';

suite('Buffer', () => {

	test('issue #71993 - VSBuffer#toString returns numBers', () => {
		const data = new Uint8Array([1, 2, 3, 'h'.charCodeAt(0), 'i'.charCodeAt(0), 4, 5]).Buffer;
		const Buffer = VSBuffer.wrap(new Uint8Array(data, 3, 2));
		assert.deepEqual(Buffer.toString(), 'hi');
	});

	test('BufferToReadaBle / readaBleToBuffer', () => {
		const content = 'Hello World';
		const readaBle = BufferToReadaBle(VSBuffer.fromString(content));

		assert.equal(readaBleToBuffer(readaBle).toString(), content);
	});

	test('BufferToStream / streamToBuffer', async () => {
		const content = 'Hello World';
		const stream = BufferToStream(VSBuffer.fromString(content));

		assert.equal((await streamToBuffer(stream)).toString(), content);
	});

	test('BufferedStreamToBuffer', async () => {
		const content = 'Hello World';
		const stream = await peekStream(BufferToStream(VSBuffer.fromString(content)), 1);

		assert.equal((await BufferedStreamToBuffer(stream)).toString(), content);
	});

	test('BufferWriteaBleStream - Basics (no error)', async () => {
		const stream = newWriteaBleBufferStream();

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.end(VSBuffer.fromString('World'));

		assert.equal(chunks.length, 2);
		assert.equal(chunks[0].toString(), 'Hello');
		assert.equal(chunks[1].toString(), 'World');
		assert.equal(ended, true);
		assert.equal(errors.length, 0);
	});

	test('BufferWriteaBleStream - Basics (error)', async () => {
		const stream = newWriteaBleBufferStream();

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.end(new Error());

		assert.equal(chunks.length, 1);
		assert.equal(chunks[0].toString(), 'Hello');
		assert.equal(ended, true);
		assert.equal(errors.length, 1);
	});

	test('BufferWriteaBleStream - Buffers data when no listener', async () => {
		const stream = newWriteaBleBufferStream();

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.end(VSBuffer.fromString('World'));

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		assert.equal(chunks.length, 1);
		assert.equal(chunks[0].toString(), 'HelloWorld');
		assert.equal(ended, true);
		assert.equal(errors.length, 0);
	});

	test('BufferWriteaBleStream - Buffers errors when no listener', async () => {
		const stream = newWriteaBleBufferStream();

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.error(new Error());

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		stream.end();

		assert.equal(chunks.length, 1);
		assert.equal(chunks[0].toString(), 'Hello');
		assert.equal(ended, true);
		assert.equal(errors.length, 1);
	});

	test('BufferWriteaBleStream - Buffers end when no listener', async () => {
		const stream = newWriteaBleBufferStream();

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.end(VSBuffer.fromString('World'));

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		assert.equal(chunks.length, 1);
		assert.equal(chunks[0].toString(), 'HelloWorld');
		assert.equal(ended, true);
		assert.equal(errors.length, 0);
	});

	test('BufferWriteaBleStream - nothing happens after end()', async () => {
		const stream = newWriteaBleBufferStream();

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.end(VSBuffer.fromString('World'));

		let dataCalledAfterEnd = false;
		stream.on('data', data => {
			dataCalledAfterEnd = true;
		});

		let errorCalledAfterEnd = false;
		stream.on('error', error => {
			errorCalledAfterEnd = true;
		});

		let endCalledAfterEnd = false;
		stream.on('end', () => {
			endCalledAfterEnd = true;
		});

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.error(new Error());
		await timeout(0);
		stream.end(VSBuffer.fromString('World'));

		assert.equal(dataCalledAfterEnd, false);
		assert.equal(errorCalledAfterEnd, false);
		assert.equal(endCalledAfterEnd, false);

		assert.equal(chunks.length, 2);
		assert.equal(chunks[0].toString(), 'Hello');
		assert.equal(chunks[1].toString(), 'World');
	});

	test('BufferWriteaBleStream - pause/resume (simple)', async () => {
		const stream = newWriteaBleBufferStream();

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		stream.pause();

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.end(VSBuffer.fromString('World'));

		assert.equal(chunks.length, 0);
		assert.equal(errors.length, 0);
		assert.equal(ended, false);

		stream.resume();

		assert.equal(chunks.length, 1);
		assert.equal(chunks[0].toString(), 'HelloWorld');
		assert.equal(ended, true);
		assert.equal(errors.length, 0);
	});

	test('BufferWriteaBleStream - pause/resume (pause after first write)', async () => {
		const stream = newWriteaBleBufferStream();

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));

		stream.pause();

		await timeout(0);
		stream.end(VSBuffer.fromString('World'));

		assert.equal(chunks.length, 1);
		assert.equal(chunks[0].toString(), 'Hello');
		assert.equal(errors.length, 0);
		assert.equal(ended, false);

		stream.resume();

		assert.equal(chunks.length, 2);
		assert.equal(chunks[0].toString(), 'Hello');
		assert.equal(chunks[1].toString(), 'World');
		assert.equal(ended, true);
		assert.equal(errors.length, 0);
	});

	test('BufferWriteaBleStream - pause/resume (error)', async () => {
		const stream = newWriteaBleBufferStream();

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		stream.pause();

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.end(new Error());

		assert.equal(chunks.length, 0);
		assert.equal(ended, false);
		assert.equal(errors.length, 0);

		stream.resume();

		assert.equal(chunks.length, 1);
		assert.equal(chunks[0].toString(), 'Hello');
		assert.equal(ended, true);
		assert.equal(errors.length, 1);
	});

	test('BufferWriteaBleStream - destroy', async () => {
		const stream = newWriteaBleBufferStream();

		let chunks: VSBuffer[] = [];
		stream.on('data', data => {
			chunks.push(data);
		});

		let ended = false;
		stream.on('end', () => {
			ended = true;
		});

		let errors: Error[] = [];
		stream.on('error', error => {
			errors.push(error);
		});

		stream.destroy();

		await timeout(0);
		stream.write(VSBuffer.fromString('Hello'));
		await timeout(0);
		stream.end(VSBuffer.fromString('World'));

		assert.equal(chunks.length, 0);
		assert.equal(ended, false);
		assert.equal(errors.length, 0);
	});

	test('Performance issue with VSBuffer#slice #76076', function () {
		// Buffer#slice creates a view
		{
			const Buff = Buffer.from([10, 20, 30, 40]);
			const B2 = Buff.slice(1, 3);
			assert.equal(Buff[1], 20);
			assert.equal(B2[0], 20);

			Buff[1] = 17; // modify Buff AND B2
			assert.equal(Buff[1], 17);
			assert.equal(B2[0], 17);
		}

		// TypedArray#slice creates a copy
		{
			const unit = new Uint8Array([10, 20, 30, 40]);
			const u2 = unit.slice(1, 3);
			assert.equal(unit[1], 20);
			assert.equal(u2[0], 20);

			unit[1] = 17; // modify unit, NOT B2
			assert.equal(unit[1], 17);
			assert.equal(u2[0], 20);
		}

		// TypedArray#suBarray creates a view
		{
			const unit = new Uint8Array([10, 20, 30, 40]);
			const u2 = unit.suBarray(1, 3);
			assert.equal(unit[1], 20);
			assert.equal(u2[0], 20);

			unit[1] = 17; // modify unit AND B2
			assert.equal(unit[1], 17);
			assert.equal(u2[0], 17);
		}
	});
});
