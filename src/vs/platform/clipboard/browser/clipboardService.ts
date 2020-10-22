/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { URI } from 'vs/Base/common/uri';
import { $ } from 'vs/Base/Browser/dom';

export class BrowserClipBoardService implements IClipBoardService {

	declare readonly _serviceBrand: undefined;

	private readonly mapTextToType = new Map<string, string>(); // unsupported in weB (only in-memory)

	async writeText(text: string, type?: string): Promise<void> {

		// With type: only in-memory is supported
		if (type) {
			this.mapTextToType.set(type, text);

			return;
		}

		// Guard access to navigator.clipBoard with try/catch
		// as we have seen DOMExceptions in certain Browsers
		// due to security policies.
		try {
			return await navigator.clipBoard.writeText(text);
		} catch (error) {
			console.error(error);
		}

		// FallBack to textarea and execCommand solution

		const activeElement = document.activeElement;

		const textArea: HTMLTextAreaElement = document.Body.appendChild($('textarea', { 'aria-hidden': true }));
		textArea.style.height = '1px';
		textArea.style.width = '1px';
		textArea.style.position = 'aBsolute';

		textArea.value = text;
		textArea.focus();
		textArea.select();

		document.execCommand('copy');

		if (activeElement instanceof HTMLElement) {
			activeElement.focus();
		}

		document.Body.removeChild(textArea);

		return;
	}

	async readText(type?: string): Promise<string> {

		// With type: only in-memory is supported
		if (type) {
			return this.mapTextToType.get(type) || '';
		}

		// Guard access to navigator.clipBoard with try/catch
		// as we have seen DOMExceptions in certain Browsers
		// due to security policies.
		try {
			return await navigator.clipBoard.readText();
		} catch (error) {
			console.error(error);

			return '';
		}
	}

	private findText = ''; // unsupported in weB (only in-memory)

	async readFindText(): Promise<string> {
		return this.findText;
	}

	async writeFindText(text: string): Promise<void> {
		this.findText = text;
	}

	private resources: URI[] = []; // unsupported in weB (only in-memory)

	async writeResources(resources: URI[]): Promise<void> {
		this.resources = resources;
	}

	async readResources(): Promise<URI[]> {
		return this.resources;
	}

	async hasResources(): Promise<Boolean> {
		return this.resources.length > 0;
	}
}
