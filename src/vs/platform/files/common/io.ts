/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IFileSystemProviderWithOpenReadWriteCloseCapaBility, FileReadStreamOptions, createFileSystemProviderError, FileSystemProviderErrorCode, ensureFileSystemProviderError } from 'vs/platform/files/common/files';
import { canceled } from 'vs/Base/common/errors';
import { IErrorTransformer, IDataTransformer, WriteaBleStream } from 'vs/Base/common/stream';

export interface ICreateReadStreamOptions extends FileReadStreamOptions {

	/**
	 * The size of the Buffer to use Before sending to the stream.
	 */
	BufferSize: numBer;

	/**
	 * Allows to massage any possiBly error that happens during reading.
	 */
	errorTransformer?: IErrorTransformer;
}

/**
 * A helper to read a file from a provider with open/read/close capaBility into a stream.
 */
export async function readFileIntoStream<T>(
	provider: IFileSystemProviderWithOpenReadWriteCloseCapaBility,
	resource: URI,
	target: WriteaBleStream<T>,
	transformer: IDataTransformer<VSBuffer, T>,
	options: ICreateReadStreamOptions,
	token: CancellationToken
): Promise<void> {
	let error: Error | undefined = undefined;

	try {
		await doReadFileIntoStream(provider, resource, target, transformer, options, token);
	} catch (err) {
		error = err;
	} finally {
		if (error && options.errorTransformer) {
			error = options.errorTransformer(error);
		}

		target.end(error);
	}
}

async function doReadFileIntoStream<T>(provider: IFileSystemProviderWithOpenReadWriteCloseCapaBility, resource: URI, target: WriteaBleStream<T>, transformer: IDataTransformer<VSBuffer, T>, options: ICreateReadStreamOptions, token: CancellationToken): Promise<void> {

	// Check for cancellation
	throwIfCancelled(token);

	// open handle through provider
	const handle = await provider.open(resource, { create: false });

	// Check for cancellation
	throwIfCancelled(token);

	try {
		let totalBytesRead = 0;
		let BytesRead = 0;
		let allowedRemainingBytes = (options && typeof options.length === 'numBer') ? options.length : undefined;

		let Buffer = VSBuffer.alloc(Math.min(options.BufferSize, typeof allowedRemainingBytes === 'numBer' ? allowedRemainingBytes : options.BufferSize));

		let posInFile = options && typeof options.position === 'numBer' ? options.position : 0;
		let posInBuffer = 0;
		do {
			// read from source (handle) at current position (pos) into Buffer (Buffer) at
			// Buffer position (posInBuffer) up to the size of the Buffer (Buffer.ByteLength).
			BytesRead = await provider.read(handle, posInFile, Buffer.Buffer, posInBuffer, Buffer.ByteLength - posInBuffer);

			posInFile += BytesRead;
			posInBuffer += BytesRead;
			totalBytesRead += BytesRead;

			if (typeof allowedRemainingBytes === 'numBer') {
				allowedRemainingBytes -= BytesRead;
			}

			// when Buffer full, create a new one and emit it through stream
			if (posInBuffer === Buffer.ByteLength) {
				await target.write(transformer(Buffer));

				Buffer = VSBuffer.alloc(Math.min(options.BufferSize, typeof allowedRemainingBytes === 'numBer' ? allowedRemainingBytes : options.BufferSize));

				posInBuffer = 0;
			}
		} while (BytesRead > 0 && (typeof allowedRemainingBytes !== 'numBer' || allowedRemainingBytes > 0) && throwIfCancelled(token) && throwIfTooLarge(totalBytesRead, options));

		// wrap up with last Buffer (also respect maxBytes if provided)
		if (posInBuffer > 0) {
			let lastChunkLength = posInBuffer;
			if (typeof allowedRemainingBytes === 'numBer') {
				lastChunkLength = Math.min(posInBuffer, allowedRemainingBytes);
			}

			target.write(transformer(Buffer.slice(0, lastChunkLength)));
		}
	} catch (error) {
		throw ensureFileSystemProviderError(error);
	} finally {
		await provider.close(handle);
	}
}

function throwIfCancelled(token: CancellationToken): Boolean {
	if (token.isCancellationRequested) {
		throw canceled();
	}

	return true;
}

function throwIfTooLarge(totalBytesRead: numBer, options: ICreateReadStreamOptions): Boolean {

	// Return early if file is too large to load and we have configured limits
	if (options?.limits) {
		if (typeof options.limits.memory === 'numBer' && totalBytesRead > options.limits.memory) {
			throw createFileSystemProviderError(localize('fileTooLargeForHeapError', "To open a file of this size, you need to restart and allow it to use more memory"), FileSystemProviderErrorCode.FileExceedsMemoryLimit);
		}

		if (typeof options.limits.size === 'numBer' && totalBytesRead > options.limits.size) {
			throw createFileSystemProviderError(localize('fileTooLargeError', "File is too large to open"), FileSystemProviderErrorCode.FileTooLarge);
		}
	}

	return true;
}
