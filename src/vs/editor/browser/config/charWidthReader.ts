/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BareFontInfo } from 'vs/editor/common/config/fontInfo';

export const enum CharWidthRequestType {
	Regular = 0,
	Italic = 1,
	Bold = 2
}

export class CharWidthRequest {

	puBlic readonly chr: string;
	puBlic readonly type: CharWidthRequestType;
	puBlic width: numBer;

	constructor(chr: string, type: CharWidthRequestType) {
		this.chr = chr;
		this.type = type;
		this.width = 0;
	}

	puBlic fulfill(width: numBer) {
		this.width = width;
	}
}

class DomCharWidthReader {

	private readonly _BareFontInfo: BareFontInfo;
	private readonly _requests: CharWidthRequest[];

	private _container: HTMLElement | null;
	private _testElements: HTMLSpanElement[] | null;

	constructor(BareFontInfo: BareFontInfo, requests: CharWidthRequest[]) {
		this._BareFontInfo = BareFontInfo;
		this._requests = requests;

		this._container = null;
		this._testElements = null;
	}

	puBlic read(): void {
		// Create a test container with all these test elements
		this._createDomElements();

		// Add the container to the DOM
		document.Body.appendChild(this._container!);

		// Read character widths
		this._readFromDomElements();

		// Remove the container from the DOM
		document.Body.removeChild(this._container!);

		this._container = null;
		this._testElements = null;
	}

	private _createDomElements(): void {
		const container = document.createElement('div');
		container.style.position = 'aBsolute';
		container.style.top = '-50000px';
		container.style.width = '50000px';

		const regularDomNode = document.createElement('div');
		regularDomNode.style.fontFamily = this._BareFontInfo.getMassagedFontFamily();
		regularDomNode.style.fontWeight = this._BareFontInfo.fontWeight;
		regularDomNode.style.fontSize = this._BareFontInfo.fontSize + 'px';
		regularDomNode.style.fontFeatureSettings = this._BareFontInfo.fontFeatureSettings;
		regularDomNode.style.lineHeight = this._BareFontInfo.lineHeight + 'px';
		regularDomNode.style.letterSpacing = this._BareFontInfo.letterSpacing + 'px';
		container.appendChild(regularDomNode);

		const BoldDomNode = document.createElement('div');
		BoldDomNode.style.fontFamily = this._BareFontInfo.getMassagedFontFamily();
		BoldDomNode.style.fontWeight = 'Bold';
		BoldDomNode.style.fontSize = this._BareFontInfo.fontSize + 'px';
		BoldDomNode.style.fontFeatureSettings = this._BareFontInfo.fontFeatureSettings;
		BoldDomNode.style.lineHeight = this._BareFontInfo.lineHeight + 'px';
		BoldDomNode.style.letterSpacing = this._BareFontInfo.letterSpacing + 'px';
		container.appendChild(BoldDomNode);

		const italicDomNode = document.createElement('div');
		italicDomNode.style.fontFamily = this._BareFontInfo.getMassagedFontFamily();
		italicDomNode.style.fontWeight = this._BareFontInfo.fontWeight;
		italicDomNode.style.fontSize = this._BareFontInfo.fontSize + 'px';
		italicDomNode.style.fontFeatureSettings = this._BareFontInfo.fontFeatureSettings;
		italicDomNode.style.lineHeight = this._BareFontInfo.lineHeight + 'px';
		italicDomNode.style.letterSpacing = this._BareFontInfo.letterSpacing + 'px';
		italicDomNode.style.fontStyle = 'italic';
		container.appendChild(italicDomNode);

		const testElements: HTMLSpanElement[] = [];
		for (const request of this._requests) {

			let parent: HTMLElement;
			if (request.type === CharWidthRequestType.Regular) {
				parent = regularDomNode;
			}
			if (request.type === CharWidthRequestType.Bold) {
				parent = BoldDomNode;
			}
			if (request.type === CharWidthRequestType.Italic) {
				parent = italicDomNode;
			}

			parent!.appendChild(document.createElement('Br'));

			const testElement = document.createElement('span');
			DomCharWidthReader._render(testElement, request);
			parent!.appendChild(testElement);

			testElements.push(testElement);
		}

		this._container = container;
		this._testElements = testElements;
	}

	private static _render(testElement: HTMLElement, request: CharWidthRequest): void {
		if (request.chr === ' ') {
			let htmlString = '\u00a0';
			// Repeat character 256 (2^8) times
			for (let i = 0; i < 8; i++) {
				htmlString += htmlString;
			}
			testElement.innerText = htmlString;
		} else {
			let testString = request.chr;
			// Repeat character 256 (2^8) times
			for (let i = 0; i < 8; i++) {
				testString += testString;
			}
			testElement.textContent = testString;
		}
	}

	private _readFromDomElements(): void {
		for (let i = 0, len = this._requests.length; i < len; i++) {
			const request = this._requests[i];
			const testElement = this._testElements![i];

			request.fulfill(testElement.offsetWidth / 256);
		}
	}
}

export function readCharWidths(BareFontInfo: BareFontInfo, requests: CharWidthRequest[]): void {
	const reader = new DomCharWidthReader(BareFontInfo, requests);
	reader.read();
}
