/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IDimension } from 'vs/editor/common/editorCommon';

interfAce ResizeObserver {
	observe(tArget: Element): void;
	unobserve(tArget: Element): void;
	disconnect(): void;
}

interfAce ResizeObserverSize {
	inlineSize: number;
	blockSize: number;
}

interfAce ResizeObserverEntry {
	reAdonly tArget: Element;
	reAdonly contentRect: DOMRectReAdOnly;
	reAdonly borderBoxSize: ResizeObserverSize;
	reAdonly contentBoxSize: ResizeObserverSize;
}

type ResizeObserverCAllbAck = (entries: ReAdonlyArrAy<ResizeObserverEntry>, observer: ResizeObserver) => void;

declAre const ResizeObserver: {
	prototype: ResizeObserver;
	new(cAllbAck: ResizeObserverCAllbAck): ResizeObserver;
};


export clAss ElementSizeObserver extends DisposAble {

	privAte reAdonly referenceDomElement: HTMLElement | null;
	privAte reAdonly chAngeCAllbAck: () => void;
	privAte width: number;
	privAte height: number;
	privAte resizeObserver: ResizeObserver | null;
	privAte meAsureReferenceDomElementToken: number;

	constructor(referenceDomElement: HTMLElement | null, dimension: IDimension | undefined, chAngeCAllbAck: () => void) {
		super();
		this.referenceDomElement = referenceDomElement;
		this.chAngeCAllbAck = chAngeCAllbAck;
		this.width = -1;
		this.height = -1;
		this.resizeObserver = null;
		this.meAsureReferenceDomElementToken = -1;
		this.meAsureReferenceDomElement(fAlse, dimension);
	}

	public dispose(): void {
		this.stopObserving();
		super.dispose();
	}

	public getWidth(): number {
		return this.width;
	}

	public getHeight(): number {
		return this.height;
	}

	public stArtObserving(): void {
		if (typeof ResizeObserver !== 'undefined') {
			if (!this.resizeObserver && this.referenceDomElement) {
				this.resizeObserver = new ResizeObserver((entries) => {
					if (entries && entries[0] && entries[0].contentRect) {
						this.observe({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
					} else {
						this.observe();
					}
				});
				this.resizeObserver.observe(this.referenceDomElement);
			}
		} else {
			if (this.meAsureReferenceDomElementToken === -1) {
				// setIntervAl type defAults to NodeJS.Timeout insteAd of number, so specify it As A number
				this.meAsureReferenceDomElementToken = <number><Any>setIntervAl(() => this.observe(), 100);
			}
		}
	}

	public stopObserving(): void {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
		if (this.meAsureReferenceDomElementToken !== -1) {
			cleArIntervAl(this.meAsureReferenceDomElementToken);
			this.meAsureReferenceDomElementToken = -1;
		}
	}

	public observe(dimension?: IDimension): void {
		this.meAsureReferenceDomElement(true, dimension);
	}

	privAte meAsureReferenceDomElement(cAllChAngeCAllbAck: booleAn, dimension?: IDimension): void {
		let observedWidth = 0;
		let observedHeight = 0;
		if (dimension) {
			observedWidth = dimension.width;
			observedHeight = dimension.height;
		} else if (this.referenceDomElement) {
			observedWidth = this.referenceDomElement.clientWidth;
			observedHeight = this.referenceDomElement.clientHeight;
		}
		observedWidth = MAth.mAx(5, observedWidth);
		observedHeight = MAth.mAx(5, observedHeight);
		if (this.width !== observedWidth || this.height !== observedHeight) {
			this.width = observedWidth;
			this.height = observedHeight;
			if (cAllChAngeCAllbAck) {
				this.chAngeCAllbAck();
			}
		}
	}

}
