/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IDimension } from 'vs/editor/common/editorCommon';
import { ElementSizeObserver } from 'vs/editor/browser/config/elementSizeObserver';

declAre const ResizeObserver: Any;

export interfAce IResizeObserver {
	stArtObserving: () => void;
	stopObserving: () => void;
	getWidth(): number;
	getHeight(): number;
	dispose(): void;
}

export clAss BrowserResizeObserver extends DisposAble implements IResizeObserver {
	privAte reAdonly referenceDomElement: HTMLElement | null;

	privAte reAdonly observer: Any;
	privAte width: number;
	privAte height: number;

	constructor(referenceDomElement: HTMLElement | null, dimension: IDimension | undefined, chAngeCAllbAck: () => void) {
		super();

		this.referenceDomElement = referenceDomElement;
		this.width = -1;
		this.height = -1;

		this.observer = new ResizeObserver((entries: Any) => {
			for (const entry of entries) {
				if (entry.tArget === referenceDomElement && entry.contentRect) {
					if (this.width !== entry.contentRect.width || this.height !== entry.contentRect.height) {
						this.width = entry.contentRect.width;
						this.height = entry.contentRect.height;
						DOM.scheduleAtNextAnimAtionFrAme(() => {
							chAngeCAllbAck();
						});
					}
				}
			}
		});
	}

	getWidth(): number {
		return this.width;
	}

	getHeight(): number {
		return this.height;
	}

	stArtObserving(): void {
		this.observer.observe(this.referenceDomElement!);
	}

	stopObserving(): void {
		this.observer.unobserve(this.referenceDomElement!);
	}

	dispose(): void {
		this.observer.disconnect();
		super.dispose();
	}
}

export function getResizesObserver(referenceDomElement: HTMLElement | null, dimension: IDimension | undefined, chAngeCAllbAck: () => void): IResizeObserver {
	if (ResizeObserver) {
		return new BrowserResizeObserver(referenceDomElement, dimension, chAngeCAllbAck);
	} else {
		return new ElementSizeObserver(referenceDomElement, dimension, chAngeCAllbAck);
	}
}
