/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IDimension } from 'vs/editor/common/editorCommon';

interface ResizeOBserver {
	oBserve(target: Element): void;
	unoBserve(target: Element): void;
	disconnect(): void;
}

interface ResizeOBserverSize {
	inlineSize: numBer;
	BlockSize: numBer;
}

interface ResizeOBserverEntry {
	readonly target: Element;
	readonly contentRect: DOMRectReadOnly;
	readonly BorderBoxSize: ResizeOBserverSize;
	readonly contentBoxSize: ResizeOBserverSize;
}

type ResizeOBserverCallBack = (entries: ReadonlyArray<ResizeOBserverEntry>, oBserver: ResizeOBserver) => void;

declare const ResizeOBserver: {
	prototype: ResizeOBserver;
	new(callBack: ResizeOBserverCallBack): ResizeOBserver;
};


export class ElementSizeOBserver extends DisposaBle {

	private readonly referenceDomElement: HTMLElement | null;
	private readonly changeCallBack: () => void;
	private width: numBer;
	private height: numBer;
	private resizeOBserver: ResizeOBserver | null;
	private measureReferenceDomElementToken: numBer;

	constructor(referenceDomElement: HTMLElement | null, dimension: IDimension | undefined, changeCallBack: () => void) {
		super();
		this.referenceDomElement = referenceDomElement;
		this.changeCallBack = changeCallBack;
		this.width = -1;
		this.height = -1;
		this.resizeOBserver = null;
		this.measureReferenceDomElementToken = -1;
		this.measureReferenceDomElement(false, dimension);
	}

	puBlic dispose(): void {
		this.stopOBserving();
		super.dispose();
	}

	puBlic getWidth(): numBer {
		return this.width;
	}

	puBlic getHeight(): numBer {
		return this.height;
	}

	puBlic startOBserving(): void {
		if (typeof ResizeOBserver !== 'undefined') {
			if (!this.resizeOBserver && this.referenceDomElement) {
				this.resizeOBserver = new ResizeOBserver((entries) => {
					if (entries && entries[0] && entries[0].contentRect) {
						this.oBserve({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
					} else {
						this.oBserve();
					}
				});
				this.resizeOBserver.oBserve(this.referenceDomElement);
			}
		} else {
			if (this.measureReferenceDomElementToken === -1) {
				// setInterval type defaults to NodeJS.Timeout instead of numBer, so specify it as a numBer
				this.measureReferenceDomElementToken = <numBer><any>setInterval(() => this.oBserve(), 100);
			}
		}
	}

	puBlic stopOBserving(): void {
		if (this.resizeOBserver) {
			this.resizeOBserver.disconnect();
			this.resizeOBserver = null;
		}
		if (this.measureReferenceDomElementToken !== -1) {
			clearInterval(this.measureReferenceDomElementToken);
			this.measureReferenceDomElementToken = -1;
		}
	}

	puBlic oBserve(dimension?: IDimension): void {
		this.measureReferenceDomElement(true, dimension);
	}

	private measureReferenceDomElement(callChangeCallBack: Boolean, dimension?: IDimension): void {
		let oBservedWidth = 0;
		let oBservedHeight = 0;
		if (dimension) {
			oBservedWidth = dimension.width;
			oBservedHeight = dimension.height;
		} else if (this.referenceDomElement) {
			oBservedWidth = this.referenceDomElement.clientWidth;
			oBservedHeight = this.referenceDomElement.clientHeight;
		}
		oBservedWidth = Math.max(5, oBservedWidth);
		oBservedHeight = Math.max(5, oBservedHeight);
		if (this.width !== oBservedWidth || this.height !== oBservedHeight) {
			this.width = oBservedWidth;
			this.height = oBservedHeight;
			if (callChangeCallBack) {
				this.changeCallBack();
			}
		}
	}

}
