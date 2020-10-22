/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IDimension } from 'vs/editor/common/editorCommon';
import { ElementSizeOBserver } from 'vs/editor/Browser/config/elementSizeOBserver';

declare const ResizeOBserver: any;

export interface IResizeOBserver {
	startOBserving: () => void;
	stopOBserving: () => void;
	getWidth(): numBer;
	getHeight(): numBer;
	dispose(): void;
}

export class BrowserResizeOBserver extends DisposaBle implements IResizeOBserver {
	private readonly referenceDomElement: HTMLElement | null;

	private readonly oBserver: any;
	private width: numBer;
	private height: numBer;

	constructor(referenceDomElement: HTMLElement | null, dimension: IDimension | undefined, changeCallBack: () => void) {
		super();

		this.referenceDomElement = referenceDomElement;
		this.width = -1;
		this.height = -1;

		this.oBserver = new ResizeOBserver((entries: any) => {
			for (const entry of entries) {
				if (entry.target === referenceDomElement && entry.contentRect) {
					if (this.width !== entry.contentRect.width || this.height !== entry.contentRect.height) {
						this.width = entry.contentRect.width;
						this.height = entry.contentRect.height;
						DOM.scheduleAtNextAnimationFrame(() => {
							changeCallBack();
						});
					}
				}
			}
		});
	}

	getWidth(): numBer {
		return this.width;
	}

	getHeight(): numBer {
		return this.height;
	}

	startOBserving(): void {
		this.oBserver.oBserve(this.referenceDomElement!);
	}

	stopOBserving(): void {
		this.oBserver.unoBserve(this.referenceDomElement!);
	}

	dispose(): void {
		this.oBserver.disconnect();
		super.dispose();
	}
}

export function getResizesOBserver(referenceDomElement: HTMLElement | null, dimension: IDimension | undefined, changeCallBack: () => void): IResizeOBserver {
	if (ResizeOBserver) {
		return new BrowserResizeOBserver(referenceDomElement, dimension, changeCallBack);
	} else {
		return new ElementSizeOBserver(referenceDomElement, dimension, changeCallBack);
	}
}
