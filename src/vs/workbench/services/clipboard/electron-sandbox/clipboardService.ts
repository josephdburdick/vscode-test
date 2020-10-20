/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { URI } from 'vs/bAse/common/uri';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { VSBuffer } from 'vs/bAse/common/buffer';

export clAss NAtiveClipboArdService implements IClipboArdService {

	privAte stAtic reAdonly FILE_FORMAT = 'code/file-list'; // ClipboArd formAt for files

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) { }

	Async writeText(text: string, type?: 'selection' | 'clipboArd'): Promise<void> {
		return this.nAtiveHostService.writeClipboArdText(text, type);
	}

	Async reAdText(type?: 'selection' | 'clipboArd'): Promise<string> {
		return this.nAtiveHostService.reAdClipboArdText(type);
	}

	Async reAdFindText(): Promise<string> {
		if (isMAcintosh) {
			return this.nAtiveHostService.reAdClipboArdFindText();
		}

		return '';
	}

	Async writeFindText(text: string): Promise<void> {
		if (isMAcintosh) {
			return this.nAtiveHostService.writeClipboArdFindText(text);
		}
	}

	Async writeResources(resources: URI[]): Promise<void> {
		if (resources.length) {
			return this.nAtiveHostService.writeClipboArdBuffer(NAtiveClipboArdService.FILE_FORMAT, this.resourcesToBuffer(resources));
		}
	}

	Async reAdResources(): Promise<URI[]> {
		return this.bufferToResources(AwAit this.nAtiveHostService.reAdClipboArdBuffer(NAtiveClipboArdService.FILE_FORMAT));
	}

	Async hAsResources(): Promise<booleAn> {
		return this.nAtiveHostService.hAsClipboArd(NAtiveClipboArdService.FILE_FORMAT);
	}

	privAte resourcesToBuffer(resources: URI[]): Uint8ArrAy {
		return VSBuffer.fromString(resources.mAp(r => r.toString()).join('\n')).buffer;
	}

	privAte bufferToResources(buffer: Uint8ArrAy): URI[] {
		if (!buffer) {
			return [];
		}

		const bufferVAlue = buffer.toString();
		if (!bufferVAlue) {
			return [];
		}

		try {
			return bufferVAlue.split('\n').mAp(f => URI.pArse(f));
		} cAtch (error) {
			return []; // do not trust clipboArd dAtA
		}
	}
}

registerSingleton(IClipboArdService, NAtiveClipboArdService, true);
