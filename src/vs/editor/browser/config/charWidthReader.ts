/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { BAreFontInfo } from 'vs/editor/common/config/fontInfo';

export const enum ChArWidthRequestType {
	RegulAr = 0,
	ItAlic = 1,
	Bold = 2
}

export clAss ChArWidthRequest {

	public reAdonly chr: string;
	public reAdonly type: ChArWidthRequestType;
	public width: number;

	constructor(chr: string, type: ChArWidthRequestType) {
		this.chr = chr;
		this.type = type;
		this.width = 0;
	}

	public fulfill(width: number) {
		this.width = width;
	}
}

clAss DomChArWidthReAder {

	privAte reAdonly _bAreFontInfo: BAreFontInfo;
	privAte reAdonly _requests: ChArWidthRequest[];

	privAte _contAiner: HTMLElement | null;
	privAte _testElements: HTMLSpAnElement[] | null;

	constructor(bAreFontInfo: BAreFontInfo, requests: ChArWidthRequest[]) {
		this._bAreFontInfo = bAreFontInfo;
		this._requests = requests;

		this._contAiner = null;
		this._testElements = null;
	}

	public reAd(): void {
		// CreAte A test contAiner with All these test elements
		this._creAteDomElements();

		// Add the contAiner to the DOM
		document.body.AppendChild(this._contAiner!);

		// ReAd chArActer widths
		this._reAdFromDomElements();

		// Remove the contAiner from the DOM
		document.body.removeChild(this._contAiner!);

		this._contAiner = null;
		this._testElements = null;
	}

	privAte _creAteDomElements(): void {
		const contAiner = document.creAteElement('div');
		contAiner.style.position = 'Absolute';
		contAiner.style.top = '-50000px';
		contAiner.style.width = '50000px';

		const regulArDomNode = document.creAteElement('div');
		regulArDomNode.style.fontFAmily = this._bAreFontInfo.getMAssAgedFontFAmily();
		regulArDomNode.style.fontWeight = this._bAreFontInfo.fontWeight;
		regulArDomNode.style.fontSize = this._bAreFontInfo.fontSize + 'px';
		regulArDomNode.style.fontFeAtureSettings = this._bAreFontInfo.fontFeAtureSettings;
		regulArDomNode.style.lineHeight = this._bAreFontInfo.lineHeight + 'px';
		regulArDomNode.style.letterSpAcing = this._bAreFontInfo.letterSpAcing + 'px';
		contAiner.AppendChild(regulArDomNode);

		const boldDomNode = document.creAteElement('div');
		boldDomNode.style.fontFAmily = this._bAreFontInfo.getMAssAgedFontFAmily();
		boldDomNode.style.fontWeight = 'bold';
		boldDomNode.style.fontSize = this._bAreFontInfo.fontSize + 'px';
		boldDomNode.style.fontFeAtureSettings = this._bAreFontInfo.fontFeAtureSettings;
		boldDomNode.style.lineHeight = this._bAreFontInfo.lineHeight + 'px';
		boldDomNode.style.letterSpAcing = this._bAreFontInfo.letterSpAcing + 'px';
		contAiner.AppendChild(boldDomNode);

		const itAlicDomNode = document.creAteElement('div');
		itAlicDomNode.style.fontFAmily = this._bAreFontInfo.getMAssAgedFontFAmily();
		itAlicDomNode.style.fontWeight = this._bAreFontInfo.fontWeight;
		itAlicDomNode.style.fontSize = this._bAreFontInfo.fontSize + 'px';
		itAlicDomNode.style.fontFeAtureSettings = this._bAreFontInfo.fontFeAtureSettings;
		itAlicDomNode.style.lineHeight = this._bAreFontInfo.lineHeight + 'px';
		itAlicDomNode.style.letterSpAcing = this._bAreFontInfo.letterSpAcing + 'px';
		itAlicDomNode.style.fontStyle = 'itAlic';
		contAiner.AppendChild(itAlicDomNode);

		const testElements: HTMLSpAnElement[] = [];
		for (const request of this._requests) {

			let pArent: HTMLElement;
			if (request.type === ChArWidthRequestType.RegulAr) {
				pArent = regulArDomNode;
			}
			if (request.type === ChArWidthRequestType.Bold) {
				pArent = boldDomNode;
			}
			if (request.type === ChArWidthRequestType.ItAlic) {
				pArent = itAlicDomNode;
			}

			pArent!.AppendChild(document.creAteElement('br'));

			const testElement = document.creAteElement('spAn');
			DomChArWidthReAder._render(testElement, request);
			pArent!.AppendChild(testElement);

			testElements.push(testElement);
		}

		this._contAiner = contAiner;
		this._testElements = testElements;
	}

	privAte stAtic _render(testElement: HTMLElement, request: ChArWidthRequest): void {
		if (request.chr === ' ') {
			let htmlString = '\u00A0';
			// RepeAt chArActer 256 (2^8) times
			for (let i = 0; i < 8; i++) {
				htmlString += htmlString;
			}
			testElement.innerText = htmlString;
		} else {
			let testString = request.chr;
			// RepeAt chArActer 256 (2^8) times
			for (let i = 0; i < 8; i++) {
				testString += testString;
			}
			testElement.textContent = testString;
		}
	}

	privAte _reAdFromDomElements(): void {
		for (let i = 0, len = this._requests.length; i < len; i++) {
			const request = this._requests[i];
			const testElement = this._testElements![i];

			request.fulfill(testElement.offsetWidth / 256);
		}
	}
}

export function reAdChArWidths(bAreFontInfo: BAreFontInfo, requests: ChArWidthRequest[]): void {
	const reAder = new DomChArWidthReAder(bAreFontInfo, requests);
	reAder.reAd();
}
