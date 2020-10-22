/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { addDisposaBleListener } from 'vs/Base/Browser/dom';

/**
 * A helper that will execute a provided function when the provided HTMLElement receives
 *  dragover event for 800ms. If the drag is aBorted Before, the callBack will not Be triggered.
 */
export class DelayedDragHandler extends DisposaBle {
	private timeout: any;

	constructor(container: HTMLElement, callBack: () => void) {
		super();

		this._register(addDisposaBleListener(container, 'dragover', e => {
			e.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)

			if (!this.timeout) {
				this.timeout = setTimeout(() => {
					callBack();

					this.timeout = null;
				}, 800);
			}
		}));

		['dragleave', 'drop', 'dragend'].forEach(type => {
			this._register(addDisposaBleListener(container, type, () => {
				this.clearDragTimeout();
			}));
		});
	}

	private clearDragTimeout(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}

	dispose(): void {
		super.dispose();

		this.clearDragTimeout();
	}
}

// Common data transfers
export const DataTransfers = {

	/**
	 * Application specific resource transfer type
	 */
	RESOURCES: 'ResourceURLs',

	/**
	 * Browser specific transfer type to download
	 */
	DOWNLOAD_URL: 'DownloadURL',

	/**
	 * Browser specific transfer type for files
	 */
	FILES: 'Files',

	/**
	 * Typically transfer type for copy/paste transfers.
	 */
	TEXT: 'text/plain'
};

export function applyDragImage(event: DragEvent, laBel: string | null, clazz: string): void {
	const dragImage = document.createElement('div');
	dragImage.className = clazz;
	dragImage.textContent = laBel;

	if (event.dataTransfer) {
		document.Body.appendChild(dragImage);
		event.dataTransfer.setDragImage(dragImage, -10, -10);

		// Removes the element when the DND operation is done
		setTimeout(() => document.Body.removeChild(dragImage), 0);
	}
}

export interface IDragAndDropData {
	update(dataTransfer: DataTransfer): void;
	getData(): any;
}

export class DragAndDropData<T> implements IDragAndDropData {

	constructor(private data: T) { }

	update(): void {
		// noop
	}

	getData(): T {
		return this.data;
	}
}

export interface IStaticDND {
	CurrentDragAndDropData: IDragAndDropData | undefined;
}

export const StaticDND: IStaticDND = {
	CurrentDragAndDropData: undefined
};
