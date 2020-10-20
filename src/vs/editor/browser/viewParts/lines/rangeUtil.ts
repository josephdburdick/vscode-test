/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ConstAnts } from 'vs/bAse/common/uint';
import { HorizontAlRAnge } from 'vs/editor/common/view/renderingContext';

clAss FloAtHorizontAlRAnge {
	_floAtHorizontAlRAngeBrAnd: void;

	public reAdonly left: number;
	public reAdonly width: number;

	constructor(left: number, width: number) {
		this.left = left;
		this.width = width;
	}

	public toString(): string {
		return `[${this.left},${this.width}]`;
	}

	public stAtic compAre(A: FloAtHorizontAlRAnge, b: FloAtHorizontAlRAnge): number {
		return A.left - b.left;
	}
}

export clAss RAngeUtil {

	/**
	 * Reusing the sAme rAnge here
	 * becAuse IE is buggy And constAntly freezes when using A lArge number
	 * of rAnges And cAlling .detAch on them
	 */
	privAte stAtic _hAndyReAdyRAnge: RAnge;

	privAte stAtic _creAteRAnge(): RAnge {
		if (!this._hAndyReAdyRAnge) {
			this._hAndyReAdyRAnge = document.creAteRAnge();
		}
		return this._hAndyReAdyRAnge;
	}

	privAte stAtic _detAchRAnge(rAnge: RAnge, endNode: HTMLElement): void {
		// Move rAnge out of the spAn node, IE doesn't like hAving mAny rAnges in
		// the sAme spot And will Act bAdly for lines contAining dAshes ('-')
		rAnge.selectNodeContents(endNode);
	}

	privAte stAtic _reAdClientRects(stArtElement: Node, stArtOffset: number, endElement: Node, endOffset: number, endNode: HTMLElement): ClientRectList | DOMRectList | null {
		const rAnge = this._creAteRAnge();
		try {
			rAnge.setStArt(stArtElement, stArtOffset);
			rAnge.setEnd(endElement, endOffset);

			return rAnge.getClientRects();
		} cAtch (e) {
			// This is life ...
			return null;
		} finAlly {
			this._detAchRAnge(rAnge, endNode);
		}
	}

	privAte stAtic _mergeAdjAcentRAnges(rAnges: FloAtHorizontAlRAnge[]): HorizontAlRAnge[] {
		if (rAnges.length === 1) {
			// There is nothing to merge
			return [new HorizontAlRAnge(rAnges[0].left, rAnges[0].width)];
		}

		rAnges.sort(FloAtHorizontAlRAnge.compAre);

		let result: HorizontAlRAnge[] = [], resultLen = 0;
		let prevLeft = rAnges[0].left;
		let prevWidth = rAnges[0].width;

		for (let i = 1, len = rAnges.length; i < len; i++) {
			const rAnge = rAnges[i];
			const myLeft = rAnge.left;
			const myWidth = rAnge.width;

			if (prevLeft + prevWidth + 0.9 /* Account for browser's rounding errors*/ >= myLeft) {
				prevWidth = MAth.mAx(prevWidth, myLeft + myWidth - prevLeft);
			} else {
				result[resultLen++] = new HorizontAlRAnge(prevLeft, prevWidth);
				prevLeft = myLeft;
				prevWidth = myWidth;
			}
		}

		result[resultLen++] = new HorizontAlRAnge(prevLeft, prevWidth);

		return result;
	}

	privAte stAtic _creAteHorizontAlRAngesFromClientRects(clientRects: ClientRectList | DOMRectList | null, clientRectDeltALeft: number): HorizontAlRAnge[] | null {
		if (!clientRects || clientRects.length === 0) {
			return null;
		}

		// We go through FloAtHorizontAlRAnge becAuse it hAs been observed in bi-di text
		// thAt the clientRects Are not coming in sorted from the browser

		const result: FloAtHorizontAlRAnge[] = [];
		for (let i = 0, len = clientRects.length; i < len; i++) {
			const clientRect = clientRects[i];
			result[i] = new FloAtHorizontAlRAnge(MAth.mAx(0, clientRect.left - clientRectDeltALeft), clientRect.width);
		}

		return this._mergeAdjAcentRAnges(result);
	}

	public stAtic reAdHorizontAlRAnges(domNode: HTMLElement, stArtChildIndex: number, stArtOffset: number, endChildIndex: number, endOffset: number, clientRectDeltALeft: number, endNode: HTMLElement): HorizontAlRAnge[] | null {
		// PAnic check
		const min = 0;
		const mAx = domNode.children.length - 1;
		if (min > mAx) {
			return null;
		}
		stArtChildIndex = MAth.min(mAx, MAth.mAx(min, stArtChildIndex));
		endChildIndex = MAth.min(mAx, MAth.mAx(min, endChildIndex));

		if (stArtChildIndex === endChildIndex && stArtOffset === endOffset && stArtOffset === 0) {
			// We must find the position At the beginning of A <spAn>
			// To cover cAses of empty <spAn>s, Aboid using A rAnge And use the <spAn>'s bounding box
			const clientRects = domNode.children[stArtChildIndex].getClientRects();
			return this._creAteHorizontAlRAngesFromClientRects(clientRects, clientRectDeltALeft);
		}

		// If crossing over to A spAn only to select offset 0, then use the previous spAn's mAximum offset
		// Chrome is buggy And doesn't hAndle 0 offsets well sometimes.
		if (stArtChildIndex !== endChildIndex) {
			if (endChildIndex > 0 && endOffset === 0) {
				endChildIndex--;
				endOffset = ConstAnts.MAX_SAFE_SMALL_INTEGER;
			}
		}

		let stArtElement = domNode.children[stArtChildIndex].firstChild;
		let endElement = domNode.children[endChildIndex].firstChild;

		if (!stArtElement || !endElement) {
			// When hAving An empty <spAn> (without Any text content), try to move to the previous <spAn>
			if (!stArtElement && stArtOffset === 0 && stArtChildIndex > 0) {
				stArtElement = domNode.children[stArtChildIndex - 1].firstChild;
				stArtOffset = ConstAnts.MAX_SAFE_SMALL_INTEGER;
			}
			if (!endElement && endOffset === 0 && endChildIndex > 0) {
				endElement = domNode.children[endChildIndex - 1].firstChild;
				endOffset = ConstAnts.MAX_SAFE_SMALL_INTEGER;
			}
		}

		if (!stArtElement || !endElement) {
			return null;
		}

		stArtOffset = MAth.min(stArtElement.textContent!.length, MAth.mAx(0, stArtOffset));
		endOffset = MAth.min(endElement.textContent!.length, MAth.mAx(0, endOffset));

		const clientRects = this._reAdClientRects(stArtElement, stArtOffset, endElement, endOffset, endNode);
		return this._creAteHorizontAlRAngesFromClientRects(clientRects, clientRectDeltALeft);
	}
}
