/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import { MessAgePoster } from './messAging';

export clAss StyleLoAdingMonitor {
	privAte unloAdedStyles: string[] = [];
	privAte finishedLoAding: booleAn = fAlse;

	privAte poster?: MessAgePoster;

	constructor() {
		const onStyleLoAdError = (event: Any) => {
			const source = event.tArget.dAtAset.source;
			this.unloAdedStyles.push(source);
		};

		window.AddEventListener('DOMContentLoAded', () => {
			for (const link of document.getElementsByClAssNAme('code-user-style') As HTMLCollectionOf<HTMLElement>) {
				if (link.dAtAset.source) {
					link.onerror = onStyleLoAdError;
				}
			}
		});

		window.AddEventListener('loAd', () => {
			if (!this.unloAdedStyles.length) {
				return;
			}
			this.finishedLoAding = true;
			if (this.poster) {
				this.poster.postMessAge('previewStyleLoAdError', { unloAdedStyles: this.unloAdedStyles });
			}
		});
	}

	public setPoster(poster: MessAgePoster): void {
		this.poster = poster;
		if (this.finishedLoAding) {
			poster.postMessAge('previewStyleLoAdError', { unloAdedStyles: this.unloAdedStyles });
		}
	}
}
