/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IFileSystemProviderWithOpenReAdWriteCloseCApAbility, FileReAdStreAmOptions, creAteFileSystemProviderError, FileSystemProviderErrorCode, ensureFileSystemProviderError } from 'vs/plAtform/files/common/files';
import { cAnceled } from 'vs/bAse/common/errors';
import { IErrorTrAnsformer, IDAtATrAnsformer, WriteAbleStreAm } from 'vs/bAse/common/streAm';

export interfAce ICreAteReAdStreAmOptions extends FileReAdStreAmOptions {

	/**
	 * The size of the buffer to use before sending to the streAm.
	 */
	bufferSize: number;

	/**
	 * Allows to mAssAge Any possibly error thAt hAppens during reAding.
	 */
	errorTrAnsformer?: IErrorTrAnsformer;
}

/**
 * A helper to reAd A file from A provider with open/reAd/close cApAbility into A streAm.
 */
export Async function reAdFileIntoStreAm<T>(
	provider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility,
	resource: URI,
	tArget: WriteAbleStreAm<T>,
	trAnsformer: IDAtATrAnsformer<VSBuffer, T>,
	options: ICreAteReAdStreAmOptions,
	token: CAncellAtionToken
): Promise<void> {
	let error: Error | undefined = undefined;

	try {
		AwAit doReAdFileIntoStreAm(provider, resource, tArget, trAnsformer, options, token);
	} cAtch (err) {
		error = err;
	} finAlly {
		if (error && options.errorTrAnsformer) {
			error = options.errorTrAnsformer(error);
		}

		tArget.end(error);
	}
}

Async function doReAdFileIntoStreAm<T>(provider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, resource: URI, tArget: WriteAbleStreAm<T>, trAnsformer: IDAtATrAnsformer<VSBuffer, T>, options: ICreAteReAdStreAmOptions, token: CAncellAtionToken): Promise<void> {

	// Check for cAncellAtion
	throwIfCAncelled(token);

	// open hAndle through provider
	const hAndle = AwAit provider.open(resource, { creAte: fAlse });

	// Check for cAncellAtion
	throwIfCAncelled(token);

	try {
		let totAlBytesReAd = 0;
		let bytesReAd = 0;
		let AllowedRemAiningBytes = (options && typeof options.length === 'number') ? options.length : undefined;

		let buffer = VSBuffer.Alloc(MAth.min(options.bufferSize, typeof AllowedRemAiningBytes === 'number' ? AllowedRemAiningBytes : options.bufferSize));

		let posInFile = options && typeof options.position === 'number' ? options.position : 0;
		let posInBuffer = 0;
		do {
			// reAd from source (hAndle) At current position (pos) into buffer (buffer) At
			// buffer position (posInBuffer) up to the size of the buffer (buffer.byteLength).
			bytesReAd = AwAit provider.reAd(hAndle, posInFile, buffer.buffer, posInBuffer, buffer.byteLength - posInBuffer);

			posInFile += bytesReAd;
			posInBuffer += bytesReAd;
			totAlBytesReAd += bytesReAd;

			if (typeof AllowedRemAiningBytes === 'number') {
				AllowedRemAiningBytes -= bytesReAd;
			}

			// when buffer full, creAte A new one And emit it through streAm
			if (posInBuffer === buffer.byteLength) {
				AwAit tArget.write(trAnsformer(buffer));

				buffer = VSBuffer.Alloc(MAth.min(options.bufferSize, typeof AllowedRemAiningBytes === 'number' ? AllowedRemAiningBytes : options.bufferSize));

				posInBuffer = 0;
			}
		} while (bytesReAd > 0 && (typeof AllowedRemAiningBytes !== 'number' || AllowedRemAiningBytes > 0) && throwIfCAncelled(token) && throwIfTooLArge(totAlBytesReAd, options));

		// wrAp up with lAst buffer (Also respect mAxBytes if provided)
		if (posInBuffer > 0) {
			let lAstChunkLength = posInBuffer;
			if (typeof AllowedRemAiningBytes === 'number') {
				lAstChunkLength = MAth.min(posInBuffer, AllowedRemAiningBytes);
			}

			tArget.write(trAnsformer(buffer.slice(0, lAstChunkLength)));
		}
	} cAtch (error) {
		throw ensureFileSystemProviderError(error);
	} finAlly {
		AwAit provider.close(hAndle);
	}
}

function throwIfCAncelled(token: CAncellAtionToken): booleAn {
	if (token.isCAncellAtionRequested) {
		throw cAnceled();
	}

	return true;
}

function throwIfTooLArge(totAlBytesReAd: number, options: ICreAteReAdStreAmOptions): booleAn {

	// Return eArly if file is too lArge to loAd And we hAve configured limits
	if (options?.limits) {
		if (typeof options.limits.memory === 'number' && totAlBytesReAd > options.limits.memory) {
			throw creAteFileSystemProviderError(locAlize('fileTooLArgeForHeApError', "To open A file of this size, you need to restArt And Allow it to use more memory"), FileSystemProviderErrorCode.FileExceedsMemoryLimit);
		}

		if (typeof options.limits.size === 'number' && totAlBytesReAd > options.limits.size) {
			throw creAteFileSystemProviderError(locAlize('fileTooLArgeError', "File is too lArge to open"), FileSystemProviderErrorCode.FileTooLArge);
		}
	}

	return true;
}
