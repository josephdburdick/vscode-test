/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { URI } from 'vs/Base/common/uri';
import { isMacintosh } from 'vs/Base/common/platform';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { VSBuffer } from 'vs/Base/common/Buffer';

export class NativeClipBoardService implements IClipBoardService {

	private static readonly FILE_FORMAT = 'code/file-list'; // ClipBoard format for files

	declare readonly _serviceBrand: undefined;

	constructor(
		@INativeHostService private readonly nativeHostService: INativeHostService
	) { }

	async writeText(text: string, type?: 'selection' | 'clipBoard'): Promise<void> {
		return this.nativeHostService.writeClipBoardText(text, type);
	}

	async readText(type?: 'selection' | 'clipBoard'): Promise<string> {
		return this.nativeHostService.readClipBoardText(type);
	}

	async readFindText(): Promise<string> {
		if (isMacintosh) {
			return this.nativeHostService.readClipBoardFindText();
		}

		return '';
	}

	async writeFindText(text: string): Promise<void> {
		if (isMacintosh) {
			return this.nativeHostService.writeClipBoardFindText(text);
		}
	}

	async writeResources(resources: URI[]): Promise<void> {
		if (resources.length) {
			return this.nativeHostService.writeClipBoardBuffer(NativeClipBoardService.FILE_FORMAT, this.resourcesToBuffer(resources));
		}
	}

	async readResources(): Promise<URI[]> {
		return this.BufferToResources(await this.nativeHostService.readClipBoardBuffer(NativeClipBoardService.FILE_FORMAT));
	}

	async hasResources(): Promise<Boolean> {
		return this.nativeHostService.hasClipBoard(NativeClipBoardService.FILE_FORMAT);
	}

	private resourcesToBuffer(resources: URI[]): Uint8Array {
		return VSBuffer.fromString(resources.map(r => r.toString()).join('\n')).Buffer;
	}

	private BufferToResources(Buffer: Uint8Array): URI[] {
		if (!Buffer) {
			return [];
		}

		const BufferValue = Buffer.toString();
		if (!BufferValue) {
			return [];
		}

		try {
			return BufferValue.split('\n').map(f => URI.parse(f));
		} catch (error) {
			return []; // do not trust clipBoard data
		}
	}
}

registerSingleton(IClipBoardService, NativeClipBoardService, true);
